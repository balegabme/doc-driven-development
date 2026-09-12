# Contributing

The skill is one file. Keep it that way unless a change needs more.

- The convention has to stay language-agnostic. Anything specific to one
  toolchain belongs in a repository that uses the skill, not here.
- The checker has no dependencies and should keep none.
- Prose is read by people: simple verbs, no sales language, no invented detail.
- Before opening a pull request, run what CI runs:

```bash
node bin/doc-check.mjs --src bin --docs docs --ext .mjs --exempt doc-map.md
node bin/doc-check.mjs --root example --src src --docs docs --exempt index.md
node bin/doc-check.mjs --root fixtures/clean --src src --docs docs --ext ts,py,svelte --exempt index.md
node bin/doc-check.mjs --root fixtures/broken --src src --docs docs   # must fail with 5 problems
```

`fixtures/` is how a change to the checker is tested: `clean` holds every
header style and layout that must pass, `broken` holds one example of each
problem the checker reports. A new rule needs a case in one of them.

Commits follow Conventional Commits (https://www.conventionalcommits.org/).
