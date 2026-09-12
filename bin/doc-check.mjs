#!/usr/bin/env node
// doc: docs/checker.md
// Verifies the doc map in both directions: every source file names a doc,
// every doc lists the files it explains. Zero dependencies, Node 18+.
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const HEADER_LINES = 5
// The tag ends the line, apart from a block-comment closer, so `/* doc: x.md */`
// and `<!-- doc: x.md -->` work as well as a line comment.
const DOC_TAG = /(?:^|\s)doc:\s*(\S+?\.md)(?:#\S+)?\s*(?:\*\/|-->|\*\))?\s*$/

function parseArgs(argv) {
  const opts = {
    root: '.',
    src: 'src',
    docs: 'docs',
    ext: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.rs'],
    ignore: [/\.(test|spec)\./],
    exempt: new Set(),
  }
  for (let i = 0; i < argv.length; i++) {
    // Split on the first `=` only, so a regex passed to --ignore keeps its own.
    const arg = argv[i]
    const eq = arg.indexOf('=')
    const flag = eq === -1 ? arg : arg.slice(0, eq)
    if (flag === '--help' || flag === '-h') {
      usage()
      process.exit(0)
    }
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1)
    if (value === undefined) throw new Error(`${flag}: missing value`)
    switch (flag) {
      case '--root': opts.root = trimTrailingSlash(value); break
      case '--src': opts.src = trimTrailingSlash(value); break
      case '--docs': opts.docs = trimTrailingSlash(value); break
      case '--ext': opts.ext = value.split(',').map(e => (e.startsWith('.') ? e : `.${e}`)); break
      case '--ignore': opts.ignore = value.split(',').map(p => new RegExp(p)); break
      case '--exempt': value.split(',').forEach(name => opts.exempt.add(name)); break
      default: throw new Error(`unknown flag: ${flag}`)
    }
  }
  return opts
}

function usage() {
  console.log(`doc-check — verify a documentation-driven doc map

  node bin/doc-check.mjs [options]

  --root DIR        repository root (default: .)
  --src DIR         source directory to scan (default: src)
  --docs DIR        documentation directory, scanned recursively (default: docs)
  --ext .ts,.py     source extensions (default: ts,tsx,js,jsx,mjs,py,go,rs)
  --ignore RE,RE    regexes for source files to skip (default: \\.(test|spec)\\.)
  --exempt a.md,b.md  docs allowed to have no "Files:" section

Exit code 0 when the map is clean, 1 when it is not.`)
}

export async function docCheck(opts) {
  const { root, src, docs: docDir } = opts
  // A missing directory is an error, not an empty scan: a wrong path would
  // otherwise report "no problems" and turn a CI gate green.
  for (const dir of [src, docDir]) {
    const info = await stat(join(root, dir)).catch(() => null)
    if (!info?.isDirectory()) return { errors: [`${dir}: not a directory under ${root}`], sourceFiles: 0, docFiles: 0 }
  }

  const sources = await walkSources(join(root, src), root, opts)
  const sourceSet = new Set(sources)
  const docs = await listDocs(join(root, docDir), root)
  const docSet = new Set(docs)
  const errors = []
  const docLists = new Map()
  // One doc owns a file. Docs are sorted, so the first to list it is the owner
  // and every later claim is the error.
  const owners = new Map()

  for (const doc of docs) {
    const listed = filesSection(await readFile(join(root, doc), 'utf8'))
    if (listed === null) {
      if (!isExempt(doc, docDir, opts.exempt)) errors.push(`${doc}: no "Files:" section`)
      continue
    }
    docLists.set(doc, listed)
    for (const file of listed) {
      if (!sourceSet.has(file)) errors.push(`${doc}: lists ${file}, which does not exist`)
      const owner = owners.get(file)
      if (owner) errors.push(`${doc}: also lists ${file}, which ${owner} already owns`)
      else owners.set(file, doc)
    }
  }

  for (const file of sources) {
    const doc = docTag(await readFile(join(root, file), 'utf8'))
    if (doc === null) {
      errors.push(`${file}: missing "doc: ${docDir}/<file>.md" header`)
      continue
    }
    if (!docSet.has(doc)) {
      errors.push(`${file}: doc link points at ${doc}, which does not exist`)
      continue
    }
    if (!docLists.get(doc)?.has(file)) errors.push(`${doc}: does not list ${file} under "Files:"`)
  }

  return { errors: errors.sort(), sourceFiles: sources.length, docFiles: docs.length }
}

function docTag(text) {
  for (const line of text.split('\n').slice(0, HEADER_LINES)) {
    const match = DOC_TAG.exec(line.trim())
    if (match?.[1]) return match[1]
  }
  return null
}

// A `Files:` section is the run of `- path — summary` bullets that follows the
// heading, ending at the first blank line.
function filesSection(text) {
  const lines = text.split('\n')
  const start = lines.findIndex(l => l.trim() === 'Files:')
  if (start === -1) return null
  const files = new Set()
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim()
    if (trimmed === '') break
    const match = /^-\s+(\S+)/.exec(trimmed)
    if (match?.[1]) files.add(match[1])
  }
  return files
}

// An exemption may be written as the path from the root, the path from the doc
// directory, or the bare file name.
function isExempt(doc, docDir, exempt) {
  const fromDocs = doc.startsWith(`${docDir}/`) ? doc.slice(docDir.length + 1) : doc
  const name = doc.slice(doc.lastIndexOf('/') + 1)
  return exempt.has(doc) || exempt.has(fromDocs) || exempt.has(name)
}

async function walkSources(dir, root, opts) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      out.push(...(await walkSources(full, root, opts)))
    } else if (opts.ext.some(e => entry.name.endsWith(e)) && !opts.ignore.some(re => re.test(entry.name))) {
      out.push(toPosix(relative(root, full)))
    }
  }
  return out.sort()
}

async function listDocs(dir, root) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      out.push(...(await listDocs(full, root)))
    } else if (entry.name.endsWith('.md')) {
      out.push(toPosix(relative(root, full)))
    }
  }
  return out.sort()
}

function toPosix(path) {
  return path.split(sep).join('/')
}

function trimTrailingSlash(value) {
  const trimmed = value.replace(/[\\/]+$/, '')
  return trimmed === '' ? value : trimmed
}

let opts
try {
  opts = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(error.message)
  usage()
  process.exit(1)
}
const result = await docCheck(opts)
for (const error of result.errors) console.error(error)
console.log(
  result.errors.length === 0
    ? `doc map clean: ${result.sourceFiles} source files, ${result.docFiles} docs`
    : `${result.errors.length} problem(s) across ${result.sourceFiles} source files and ${result.docFiles} docs`,
)
process.exit(result.errors.length === 0 ? 0 : 1)
