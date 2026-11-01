---
name: review-output-format
description: "Reviews must use the adversarial-review skill — labeled findings, evidence gate, verdict-first format"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 79e460a0-b3f5-49ef-a75c-62c50e3bb161
---

When the user asks for any code, PR, design, or repo review, invoke the `adversarial-review` skill (user-level, `~/.claude/skills/adversarial-review/`). It is the canonical home of the methodology and output format the user co-designed with Codex on 2026-06-12 (labeled findings: severity · impact class · action · evidence-based confidence; binary evidence gate instead of numeric scores; verdict-first rendering; adversarial + architectural registers).

**Why:** the user explicitly rejected unlabeled free-form reviews — "blocking" must be justified by an explicit severity/class/action mapping.

**How to apply:** invoke the skill; don't reproduce the format from memory (the skill files evolve). Never post review content to GitHub without explicit approval.
