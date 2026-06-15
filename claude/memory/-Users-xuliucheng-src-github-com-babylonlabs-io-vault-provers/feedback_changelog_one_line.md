---
name: feedback_changelog_one_line
description: vault-provers CHANGELOG entries must be one terse line; corrected twice on multi-line drafts
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d96d901d-2a43-458d-baaf-de1aa8971a1b
---

CHANGELOG.md entries follow a one-line format: `* [#N](url) Verb-phrase summary; fixes Sherlock #M.` Don't draft multi-sentence entries with separate rationale clauses, parenthetical breakdowns of the design, or "previously / now" comparisons.

**Why:** the repo's existing entries (e.g. #415, #360, #430 after correction) all read as a single grep-friendly line. Long entries get flagged and require a redo pass. The user has corrected this twice — once on #430 ("make it concise"), once here on #174 ("make changelog concise") — and both times the fix collapsed an ~80-word block into a ~20-word line.

**How to apply:** when adding an entry, write the verb-phrase first, then optionally a semicolon + Sherlock/issue tag. Match the shortest neighbouring entry in style. If the underlying change is genuinely complex, link to the PR description for the detail — never inline it in CHANGELOG.
