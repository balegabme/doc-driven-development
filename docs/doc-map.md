# The doc map

This repository uses the convention it ships. Every source file names the doc
that explains it, every doc lists the files it explains, and `bin/doc-check.mjs`
verifies both directions.

This page is the index. It describes the convention rather than code, so it is
passed to the checker as an exemption and carries no `Files:` section.

## Index

- `checker.md` — the doc-map checker: flags, rules, exit codes
- `doc-map.md` — this page

## Checking this repository

```bash
node bin/doc-check.mjs --src bin --docs docs --ext .mjs --exempt doc-map.md
```
