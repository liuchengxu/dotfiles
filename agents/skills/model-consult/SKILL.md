---
name: model-consult
description: Use when asked to consult one or more named models for an opinion on a decision, design, or question — "consult astra and kimi", "ask glm what it thinks", "get a second opinion from X". Sends one self-contained question to each model via `pi --print` in parallel, with no repository access, and reports every answer with exact model id and thinking level. DO NOT use when the model is asked to review an artifact (code, diff, design doc) — single-model review is adversarial-review, multi-model diff review is panel-review; also not supervisor-mediated debate (council-mode).
---

# Model Consult

## Scope

One question, one or more named models, opinions returned verbatim with
attribution. The parent adjudicates the answers against the source before
acting; a consult is advice, not authority, and authorizes no implementation,
delegation beyond the consult itself, commits, or publication.

## Mechanics

1. Verify each requested model id against `pi models` before sending. If the
   requested id does not resolve (stderr prints `Using custom model id`),
   stop and report the mismatch; never present a fallback model as the
   requested one.
2. Send the same self-contained question to every model in parallel:
   `pi --print --model <provider>/<id>[:<thinking>] "$(cat <prompt-file>)" > <out-file>`.
   The question must stand alone: context, the proposal under review, and the
   exact questions. Cap answers (e.g. "under 250 words").
3. Thinking level: pass it as the `:suffix` when the user named one, else use
   the model's default and record `default`.

## Standard output format

Every consult reply carries the attribution block first, then the answers.
Copy model text verbatim, no paraphrase.

```
## Model consult — 2026-02-06

- openai-codex/gpt-6-astra:medium (thinking medium) — <one-line verdict>
  <full answer, verbatim>

- kimi-coding/kimi-k2 (thinking default) — <one-line verdict>
  <full answer, verbatim>

## Verdict
<adopted / rejected / unresolved, one line each, with the deciding reason and which model it follows or overrides>
```

Copy model text verbatim, no paraphrase. The verdict is the parent's own
judgement, not a vote: agreement between models is provenance, not proof.
Note any unverified claims the models made.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before consultation, confirmed the exact question, named models, expected opinion scope, and need for each model lane were clear.
- [ ] Verified every requested model ID and sent the same self-contained question with the intended thinking level.
- [ ] Returned every answer verbatim with exact attribution and did not substitute, omit, or synthesize failed lanes.
- [ ] Gave an independent verdict that identifies adopted, rejected, or unresolved advice and marks unverified model claims.
