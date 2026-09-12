---
name: doc-driven-development
description: |
  Write the doc before the code, and keep the two linked in both directions:
  every source file names the doc that explains it, every doc lists the files
  it explains. Use when adding a source file, splitting or moving code,
  starting a feature area, reviewing a change for documentation drift, or when
  a doc-map check reports a problem.
license: MIT
metadata:
  version: "1.1.0"
---

# Documentation-driven development

Test-driven development writes the test before the code. Documentation-driven
development writes the doc before the code, then links the two so a checker can
tell when they no longer match.

Two rules:

1. Every source file names the doc that explains it.
2. Every doc lists the files it explains.

The checker verifies both directions, so a broken link fails the build. Nothing
here depends on a particular language or framework.

## The loop

Work in this order. Writing the doc is the design step, so that is where most
of the thinking happens.

1. Find the feature area the change belongs to in the doc index. If nothing
   fits, the change is a new area and needs a new page.
2. Write the doc before the code. Describe what the code will do and why, in
   prose. If the explanation is hard to write, the design is wrong, and fixing
   it costs nothing yet.
3. Add the file to that doc's `Files:` list, one line: the path plus a short
   summary of what the file is for.
4. Write the code, with the `doc:` header on its first lines.
5. Run the checker before handing the work over. It lives in the repository at
   `bin/doc-check.mjs`; if it is not there, see "Setting it up in a repo".

```bash
node bin/doc-check.mjs
```

## The header

The first lines of every source file carry the link, with an optional anchor:

```ts
// doc: docs/tools.md
// doc: docs/ui.md#design-tokens
```

Use the comment syntax of the language: `#` in Python, shell, and YAML, `--` in
SQL and Lua. A block comment works as long as the closer follows the tag, as in
`/* doc: docs/tools.md */` or `<!-- doc: docs/tools.md -->`. The header must
appear within the first five lines, after a shebang if there is one. That
window is all the checker reads.

## The `Files:` list

Each doc opens with the files it owns. The heading is the bare word `Files:` on
its own line. The list is `- path — one-line summary` bullets and ends at the
first blank line, so everything after that blank line is prose the checker
ignores.

```markdown
# Tools

Files:
- src/tools/bash.ts — shell command, cwd-scoped, capped output
- src/tools/read.ts — offset/limit read with caps

A tool wraps a JSON schema plus a `run` function.
```

## One doc owns a file

A file appears in exactly one `Files:` list. Other docs may discuss it in prose
and link to it, but only the owner lists it. Otherwise the question "which page
explains this?" has two answers and the reader has to check both.

When a file grows past its owner's subject, split the file rather than listing
it in two places. The checker reads docs in sorted order and rejects the second
listing, so a shared file is a build failure, not a style question.

## Read the index first

The doc index, one line per page, is the entry point. Read the index, pick the
pages the task needs, read those, then edit code. Do not read the whole doc
tree, and do not read source to work out what an area does when its page says
so in a paragraph.

This is the token-efficiency half of the convention, and it is why the links go
both ways: finding the right page becomes a lookup instead of a search. It pays
off most in long agent sessions, where whole-tree reads are what fill the
context window.

## What the checker rejects

- A source file with no `doc:` header.
- A header pointing at a doc that does not exist.
- A file its owner doc does not list back.
- A doc listing a file that no longer exists.
- A file listed by two docs.
- A doc with no `Files:` section at all.

Test files are skipped and need no header. Pages that describe a convention or
hold a running ledger rather than describing code are exempt from the last
rule; list them as exemptions in the checker call.

## When code moves

A rename or a move breaks both directions at once, so fix both in the same
change:

- File renamed: update the path in the owner's `Files:` list.
- File moved to another area: remove the line from the old doc, add it to the
  new one, change the header.
- File deleted: delete its line from the owner doc.
- File split in two: both halves get headers and `Files:` lines, and the prose
  says why there are now two.

## Reviewing for drift

A change passes doc review when the doc reads correctly to someone who has not
seen the diff. The checker proves the links exist. It cannot tell whether the
prose is still true, so check by hand that:

- New behavior is described, not only listed.
- Prose describing the old behavior is gone rather than left standing beside
  the new.
- The one-line summaries still match what the files do.

## Setting it up in a repo

For a codebase that has none of this yet:

0. Put the checker in the repository. It is one dependency-free Node file,
   copied to `bin/doc-check.mjs`. If it is not there, the command in step 5 of
   the loop has nothing to run, and the convention has no gate.
1. Create the doc directory with one page per feature area, each with a
   `Files:` section.
2. Add an index page: path plus one line per doc.
3. Add headers to source files, one area at a time. Partial adoption works if
   the checker runs only over the directories already converted.
4. Wire the checker into CI and into whatever you run before handing work over.

Doc pages are read by people. Keep the prose plain: simple verbs, no sales
language, no invented detail.
