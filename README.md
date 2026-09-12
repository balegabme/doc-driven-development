# doc-driven-development

[![ci](https://github.com/balegabme/doc-driven-development/actions/workflows/ci.yml/badge.svg)](https://github.com/balegabme/doc-driven-development/actions/workflows/ci.yml)

A skill that makes coding agents write the doc before the code, and keep the
two linked in both directions. Every source file names the doc that explains
it; every doc lists the files it explains. A checker verifies both directions,
so a broken link fails the build.

Test-driven development writes the test first. This writes the doc first.

## Why this exists

Documentation rots because nothing fails when it does. A comment can lie for a
year, a wiki page can describe a module that was deleted, and the build stays
green. The fix is a link the build can check:

```ts
// doc: docs/tools.md
```

```markdown
# Tools

Files:
- src/tools/bash.ts — shell command, cwd-scoped, capped output
```

Break either side and the checker fails. Rename a file and it points at the doc
that still names the old path.

There is a second payoff, and for agents it is the bigger one. The doc index,
one line per page, becomes the entry point to the codebase. An agent reads the
index, picks the two pages the task needs, and edits code. It does not read the
whole tree to work out where something lives, which is what fills a context
window. Because the links go both ways, finding the right page is a lookup
instead of a search.

## Install

Three steps: the skill, the checker, the rule that makes the agent reach for
them.

**1. The skill.** Copy the folder into whichever agent you use:

```bash
cp -r skills/doc-driven-development ~/.claude/skills/doc-driven-development
cp -r skills/doc-driven-development ~/.config/opencode/skills/doc-driven-development
```

Per project instead of per user: copy it into `<project>/.claude/skills/`.

Codex has no skill folder to copy into. Paste the body of
[`SKILL.md`](skills/doc-driven-development/SKILL.md) into your `AGENTS.md`
instead; the convention is the same, only the delivery differs.

**2. The checker.** The skill tells the agent to run `node bin/doc-check.mjs`,
so the script has to be in the repository the agent is working on:

```bash
mkdir -p <project>/bin
cp bin/doc-check.mjs <project>/bin/doc-check.mjs
```

One file, no dependencies, nothing to add to `package.json`. Copying it is the
whole install — there is no package to depend on, deliberately, so the script
you run is the script you can read.

**3. The rule.** A skill loads when the agent decides the task matches its
description, which means an ordinary edit can skip it. Put the convention in
the file the agent always reads — `CLAUDE.md`, `AGENTS.md`, or your agent's
equivalent:

```markdown
Documentation-driven development is mandatory in this repository. Before
writing code, read `docs/index.md` and then only the pages the task needs.
Every source file carries a `doc:` header naming the page that explains it,
and is listed in exactly one page's `Files:` section. Run
`node bin/doc-check.mjs` before handing work over.
```

The skill carries the detail: the writing loop, what to do when files move, how
to review for drift. The memory file is what makes the agent open it. CI is
what catches the times it does not.

To uninstall, delete the skill folder, the script, and those lines. The
convention lives in the repo's own files, so nothing else needs cleaning up.

## The checker

`bin/doc-check.mjs` is a Node script (18 or newer) with no dependencies. Copy it
into a repository, or run it from here:

```bash
node bin/doc-check.mjs --src src --docs docs
```

It exits 0 on a clean map and 1 otherwise, with one line per problem. Flags for
other languages and layouts are in [docs/checker.md](docs/checker.md).

Run it in CI and in whatever check you run before handing work over. A gate
that only runs sometimes catches problems only sometimes.

## Try it

[`example/`](example/) is a two-file codebase with a working map:

```bash
node bin/doc-check.mjs --root example --src src --docs docs --exempt index.md
```

Delete a line from `example/docs/greeting.md` and run it again to watch it
fail.

## The rules

1. A source file's header carries `doc: <path>.md`, optionally with an
   `#anchor`, within the first five lines.
2. The doc it points at lists that file under a `Files:` heading, as
   `- path — one-line summary`. The list ends at the first blank line.
3. One doc owns a file. Others may discuss it in prose; only the owner lists
   it. A second `Files:` entry for the same file fails the check.
4. Read the index first, then the pages the task needs, then the code.
5. Pages that describe a convention or hold a ledger are exempt from rule 2.
   Pass them to the checker as exemptions.

The skill covers the rest: the writing loop, what to do when files move or
split, and how to review a change for drift.

## Prior art

The convention comes out of [nanoharness](https://github.com/balegabme/nanoharness),
where `nh doc-check` runs on every pull request. This repository is the
language-agnostic version.

## License

MIT.
