# Review desk: maintainer notes

`SKILL.md` is what an agent follows. This file is for changing the desk.

## Templates

```
templates/core.js              escaping, Markdown, clipboard, digest
templates/shared.js            thread desk: state, gate, lifecycle, export
templates/shared.css           styles for both pages
templates/option-1-inbox.html  thread desk page
templates/findings.html        finding desk page (verdict, checks, comment)
templates/build.py             raw/{meta,comments,replies}.json -> data.js
templates/build-findings.py    raw/{meta,issues,prs,checks}.json -> data-findings.js
templates/raw/, avatars/       the synthetic example (example/widget, PR #42)
templates/*.mjs                page tests: smoke, findings-smoke, regressions
```

`data.js` and `data-findings.js` beside the templates are built from the
example; rebuild them after changing it.

## Layout

The thread desk keeps the queue on the left and the reply editor below the
selected conversation, in one shared scroll area. On narrow screens, the queue
moves above the conversation.

## Kinds

`thread` and `finding` share `core.js` and the lifecycle vocabulary, and each
has its own gate: two implementations, not one. Adding a third kind means a
schema, a builder, a page, a prompt, and its own gate. Unify the lifecycle when
a third exists; until then, a shared abstraction would be a guess.

## Tests

The tests load the real pages in jsdom 31; jsdom 25 lacks `Blob.text()` and
fails them. Node resolves `jsdom` beside the script, so run copies:

```bash
S=$(mktemp -d) && cd "$S" && npm i jsdom@31.0.0
cp ~/.dotfiles/agents/skills/review-desk/templates/*.mjs .
for f in smoke findings-smoke regressions; do
  REVIEW_DIR=~/.dotfiles/agents/skills/review-desk/templates/ node $f.mjs | tail -1
done
```

The tests name items of the synthetic example by id. Change the example and
the tests together.
