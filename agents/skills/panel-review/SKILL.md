---
name: panel-review
description: Use when asked to review code with more than one model — "review this with the panel", "panel review", "get a second model on this", "what do the other models think", "cross-model review", "review this with deepseek". Runs the same diff past several vendors' models in parallel, then adjudicates their findings against the source. DO NOT use for a single-model review (use adversarial-review) or for prose (use doc-review).
---

# Panel Review

## Overview

Several models review the same diff independently, then their findings are
adjudicated — not tallied. Each lane is a full agentic reviewer with read access
to the repository, so it can follow a changed function to callers that did not
change.

The value is independence. A finding that only one model saw is the reason to
run a panel at all; a majority vote would delete exactly that. Agreement between
lanes is provenance, not proof — three models can share a training corpus and a
blind spot.

## Provider selection

Honor the current user-selected review provider. A request for one provider
must not launch the default multi-provider set. Add vendor lanes only when requested or already authorized. A one-model
run is not a cross-model panel. Provider selection does not expand source-egress
or publication authority.

## Running it

    panel-review [--uncommitted | --base <branch> | --commit <sha>] \
                 [--lanes gpt,deepseek,kimi] [--allow-egress] [repo-dir]

Defaults to `--uncommitted` and `--lanes gpt,deepseek`. It prints a markdown
report on stdout and writes `panel.json` plus per-lane logs to `--out`.

**The `deepseek` and `kimi` lanes send the code to third-party providers**
(DeepSeek, Moonshot). They refuse to run without `--allow-egress`. This explicit
consent requirement applies to every repository. The `gpt` lane needs no flag: Codex is already the default
reviewer here, so that is not a new disclosure.

Foreign lanes reach their vendor directly over the OpenAI Responses API, so
nothing has to be running first. Each needs its key in the environment —
`DEEPSEEK_API_KEY`, `KIMI_API_KEY` — and the script refuses up front if one is
missing.

## Adjudicating the output

The script's findings are **unverified**. It says so at the top of every report,
and that wording should survive into whatever you tell the user. Your job is the
adjudication the script cannot do:

1. **Read the cited code.** Open each finding's file and line. A lane that
   fabricates a line reference or misreads control flow produces confident,
   well-formatted prose; only the source settles it.
2. **Apply the evidence gate from `adversarial-review`.** Severity is what
   happens if it is real; blocking is whether it must stop the decision. Neither
   is inflated by how many lanes agreed.
3. **Kill what does not survive.** Report the count you dropped, so the user can
   tell a quiet panel from a lazy adjudication.
4. **Keep single-lane findings.** Report which lane found each one. Do not
   promote a finding because several lanes agreed, or bury one because only one
   did — say which, and let the evidence carry it.
5. **Never synthesize a failed lane.** A lane that timed out or returned garbage
   reviewed nothing. The report marks it; keep that mark. Three lanes configured
   and one succeeding is a one-model review, and the user must hear it that way.
6. **Render under the shared contract.** The deliverable contract in
   `../adversarial-review/taxonomy.md` governs the output, including reply
   drafts when there is an external thread to answer. Where a lane's
   rating differs from your adjudicated one, record both and say what
   settled it.

## When a lane disagrees with another

Disagreement is not itself a finding. Go to the source and settle it. If it
cannot be settled from the source, report it as an open question with both
positions and what evidence would decide it — not as a defect.

## Cost

Each lane is a full agentic review: minutes of wall clock and real API spend per
run, and lanes run in parallel so the wall clock is the slowest lane while the
cost is the sum of all of them. Do not fan out on a one-line diff.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before dispatch, confirmed the diff, review decision, provider set, egress authority, and need for each lane were clear and proportionate.
- [ ] Sent the same pinned review target to each authorized lane and preserved lane identity, failures, and raw candidates.
- [ ] Adjudicated every surviving candidate against cited source and the adversarial-review evidence gate without voting by model count.
- [ ] Kept valid single-lane findings, removed unsupported findings, and reported failed lanes without synthesizing their work.
- [ ] Delivered the shared review contract with the effective lane count, coverage limits, and unresolved evidence visible.
