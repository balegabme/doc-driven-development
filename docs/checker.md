# The checker

Files:
- bin/doc-check.mjs — scans sources and docs, reports broken links, sets the exit code

A Node script with no dependencies, so a repository can adopt the convention
without adding anything to its dependency tree. Node 18 or newer.

## What it reads

A source file's header is the first line, within the first five, that matches
`doc: <path>.md`, with an optional `#anchor`. The comment marker in front of it
does not matter, so the same rule works for `//`, `#`, and `--` languages. The
tag ends the line, apart from a block-comment closer, so `/* doc: x.md */` and
`<!-- doc: x.md -->` are read too.

A doc's file list is the run of `- path — summary` bullets after a line that
reads exactly `Files:`. The run ends at the first blank line, and prose after
that is ignored.

The doc directory is scanned recursively, so `docs/api/tools.md` is a page like
any other and a header may point at it.

## What it reports

- A source file with no header.
- A header pointing at a doc that does not exist.
- A file its owner doc does not list back.
- A doc listing a file that no longer exists.
- A second doc listing a file another doc already owns. Docs are read in sorted
  order, so the first page to list a file is its owner.
- A doc with no `Files:` section, unless it was passed as an exemption.

A missing `--src` or `--docs` directory is itself an error. Reporting "no
problems" for a wrong path would turn a CI gate green on an empty scan.

## Flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `--root` | `.` | Repository root |
| `--src` | `src` | Directory scanned for source files |
| `--docs` | `docs` | Directory holding the doc pages, scanned recursively |
| `--ext` | `ts,tsx,js,jsx,mjs,py,go,rs` | Extensions treated as source |
| `--ignore` | `\.(test\|spec)\.` | Regexes for source files to skip |
| `--exempt` | none | Docs allowed to have no `Files:` section |

An exemption may be written as the bare file name, the path from the doc
directory, or the path from the root: `index.md`, `api/index.md`, and
`docs/api/index.md` all name the same page.

A value may be attached with `=` or passed as the next argument, and only the
first `=` splits, so `--ignore='\.gen\.'` keeps its own characters. A flag with
no value, or one the script does not know, prints the reason and the usage and
exits 1.

The exit code is 0 when the map is clean and 1 when it is not, so the script
runs in CI without a wrapper.
