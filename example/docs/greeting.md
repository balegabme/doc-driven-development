# Greeting

Files:
- src/greeter.ts — builds the greeting string
- src/clock.ts — maps an hour to a part of the day

The greeting is one sentence and ends in a full stop. It never guesses at a
title for the person, because a wrong title reads worse than a plain name.

## Time of day

`partOfDay` splits the day at noon and at 18:00. The boundaries are local
hours, so callers convert before calling.
