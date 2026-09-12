# Example

A two-file codebase with a working doc map. Run the checker over it:

```bash
node ../bin/doc-check.mjs --root . --src src --docs docs --exempt index.md
```

It reports a clean map. To see it fail, delete the `- src/clock.ts` line from
`docs/greeting.md`, or drop the header from `src/greeter.ts`.
