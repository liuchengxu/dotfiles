---
name: eli5
description: >
  Explain an unfamiliar concept simply and visually at the reader's level, including /eli5 and requests for a visual walkthrough. Excludes rendering existing Markdown, plotting data, and reference documentation.
---

# ELI5

Make the reasoning easy to follow. Choose the mode from the user's stated
knowledge and the conversation before choosing an analogy.

## Choose the mode

| Mode | When to use it |
|---|---|
| Familiar context | The user knows the problem or domain but wants clearer reasoning. This is the default for follow-up explanations. |
| New concept | The user says the topic is new, or the conversation shows that its basic concepts need introduction. |

"ELI5" alone does not mean the user knows nothing. A pasted technical prompt
alone does not prove familiarity either. If knowledge is unclear, keep the
original terms and briefly explain what the reader needs. For mixed knowledge,
explain the unfamiliar part locally; keep the rest in its original context.

## Familiar context

Use the original entities, terms, and identifiers. Simplify sentences and causal
steps. Do not replace familiar concepts with a second vocabulary of everyday
objects unless the user asks for an analogy.

Show the actual relationships in the picture. For a decision, explain the goal,
what each option changes, and why the tradeoff matters. For example, a release
tag question should keep "tag", "release", and "compatibility" and explain how
they relate.

Check that the reader can apply the explanation to the original problem
without translating an analogy back into domain terms.

## New concept

Start with the basic idea and introduce only the terms needed to understand it.
Use one everyday analogy when it reduces the learning effort. Keep it consistent,
map it to the real terms, and state where it stops working.

Let pictures carry the unfamiliar relationship. For an analogy-based page,
cover the words: if the picture no longer explains that relationship, redraw it.

## Find the one idea first

Write the single sentence the reader should be able to repeat afterwards.
Everything on the page serves that sentence; anything that does not is cut,
however true it is. If you cannot write the sentence, you do not understand the
topic well enough yet — read the source before drawing.

## Shape

One idea per screen: a picture plus a caption's worth of words. Show the problem,
the relevant mechanism or options, and the consequence.

Start with the common case and name it. Keep conditions and risks that change
the reader's decision; leave unrelated edge cases out.

## Pictures

Boxes, arrows, and one highlighted thing, drawn in inline SVG or CSS. No image
files, no CDNs, no diagram libraries. Label every box with a noun and every
arrow with a verb. Draw big — this is display type, not the theme's UI type.

Charts only when the numbers themselves are the point. Use `dataviz` if
installed; otherwise use the available plotting tools directly.

## Words

Use simple words around the domain terms. Define an unfamiliar term once,
beside the picture that uses it. Keep familiar terms and identifiers exact.
Compare unfamiliar quantities when useful ("2 MB ≈ one photo"); identifiers
are names, not quantities. Expand unfamiliar acronyms.

## Output

A local file, never a claude.ai Artifact.

Build through the shared renderer so the page is self-contained and CSP-clean:

```python
import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/artifacts"))
import artifact
html = artifact.render(title=..., body=..., css=...)
```

`render()` inlines `theme.css`. Use its colour tokens and its light/dark so the
page matches every other artifact, and set your own type scale on top.

Scratch by default: `notes/eli5-<slug>.html` at the repo or worktree root, or
`$TMPDIR/eli5-<slug>.html` outside a repo. Make it durable only when asked —
then it follows `~/notes/CLAUDE.md`, canonical md and all.

Open it with `open -a Firefox <path>`, and give the path in your reply.

## Common failures

| Failure | Fix |
|---|---|
| A familiar problem becomes a story about unrelated objects | Use the original terms and show the actual relationships |
| One unfamiliar term resets the whole explanation to beginner level | Explain that term locally |
| Prose with a decorative diagram | Invert — the diagram carries it |
| A second analogy halfway down | One anchor, held to the end |
| Jargon defined at the bottom | Define it beside the picture that uses it |
| Correct but hard to follow | Simplify the causal steps while keeping decision-relevant conditions |
| Hedging into "it depends" | State the recommendation and the conditions that would change it |

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before explaining, confirmed the concept, explanation purpose, and scope; used the stated reader level or the [unclear-knowledge default](#choose-the-mode).
- [ ] Stated one core idea and used original terms or one mapped analogy that the reader can apply to the real problem.
- [ ] Made the visual carry the important relationship, with clear noun labels, verb arrows, and nearby term definitions.
- [ ] Kept decision-changing conditions and removed unrelated detail, extra analogies, and decorative structure.
- [ ] Rendered and opened the self-contained local page, then reported its path and any source or rendering limit.
