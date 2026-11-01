---
name: eli5
description: >
  Explain a concept simply and visually at the reader's level, as a local HTML page, including /eli5 and requests for a visual walkthrough. Not for rendering existing Markdown, plotting data, or reference documentation.
---

# ELI5

Make the reasoning easy to follow. Choose the mode from what the reader already
knows before choosing an analogy.

## Choose the mode

| Mode | When to use it |
|---|---|
| Familiar context | The reader knows the problem or domain but wants clearer reasoning. Default for follow-up explanations. |
| New concept | The reader says the topic is new, or the conversation shows its basics need introduction. |

"ELI5" alone does not mean the reader knows nothing, and a pasted technical
prompt alone does not prove familiarity. When unsure, keep the original terms
and briefly explain what the reader needs. For mixed knowledge, explain only
the unfamiliar part.

**Familiar context.** Keep the original entities, terms, and identifiers.
Simplify the sentences and the causal steps. Do not swap familiar concepts for
everyday objects unless asked. For a decision, show the goal, what each option
changes, and why the tradeoff matters. The reader must be able to apply the
explanation without translating an analogy back.

**New concept.** Start with the basic idea and introduce only the terms it
needs. Use one everyday analogy when it reduces effort; hold it to the end, map
it to the real terms, and say where it stops working.

## Find the one idea first

Write the one sentence the reader should be able to repeat afterwards.
Everything on the page serves it; cut what does not, however true. If you
cannot write the sentence, read the source before drawing.

## Shape and pictures

- One idea per screen: a picture and a caption's worth of words. Show the
  problem, the mechanism or options, and the consequence.
- Start with the common case and name it. Keep conditions that change the
  reader's decision; leave other edge cases out.
- The picture carries the relationship: boxes, arrows, and one highlighted
  thing. Label every box with a noun and every arrow with a verb. Cover the
  words; if the picture no longer explains, redraw it.
- Define an unfamiliar term once, beside the picture that uses it. Expand
  unfamiliar acronyms. Compare unfamiliar quantities when useful ("2 MB ≈ one photo").
- When explaining a decision, state the recommendation and the conditions
  that would change it, not "it depends".

## Output

One self-contained HTML file: inline SVG and CSS, no external scripts, fonts,
or images. Define colors as CSS variables with light and dark values through
`prefers-color-scheme`. Draw large; this is display type.

Save it as `eli5-<slug>.html` in the place the "Session files" rule gives,
unless the user names a place. Open it with `open -a Firefox <path>`, and give the full path in the reply.
Say so if you could not check how the page renders. Do not
publish it as a claude.ai Artifact.
