## Adjudicating externally-filed findings

For items that arrive with their own identity and thread — an audit
tracker, a filed issue, a scanner report. Three IDs, three scopes:

- **T-NN** — a pre-existing external record you are adjudicating.
- **F-NN** — a finding this review originates, including panel-lane
  survivors and anything discovered while triaging.
- **Q-NN** — a review-originated candidate that failed the evidence gate.

An external item never becomes a `Q`: being unable to adjudicate it is
itself a validity outcome, recorded on its `T` item.

Judge three axes independently; none of them determines another.

**Validity** — whether the report is accurate at the revision it was
filed against. The *core claim* is the mechanism its title and impact
assert; true observations elsewhere in the write-up do not rescue an
absent core claim.

- **Valid** — the core claim is real and works as described.
- **Partially correct** — the core claim holds but one or more supporting
  claims are false. Name which.
- **False** — the core claim's mechanism does not exist as described.
  Note any true observations, and raise an `F` item for a genuine
  adjacent gap.
- **Not a bug** — the behaviour is real but violates no requirement or
  invariant.
- **Unproven** — not adjudicable from the available evidence. State what
  would settle it.

An owner having accepted a risk does not make a finding invalid. A real
issue under a documented accepted risk stays Valid or Partially correct
and closes through its disposition.

**Rating accuracy** — record the filed and adjudicated severities, then
label the gap **over-rated / correct / under-rated**, or **unrated** when
the source filed no severity. Never silently replace the filed severity;
the gap is evidence about the source.

**Disposition** — **Fix** (stays open, work needed) · **Downrate** (stays
open, severity corrected) · **Investigate** (`Unproven` only: evidence
insufficient to adjudicate; still rendered as a `T` item, never moved to
Open Questions) · **Refile** (the core claim is False but a real
adjacent issue exists: close this as misfiled and raise that issue as an
`F` item, so one problem is counted once) · **Close**, qualified: already
fixed, duplicate, not a bug, or accepted risk.

Closing under an accepted risk carries the same burden as waiving a
Blocking finding: cite the durable record, and state that the item's
premise does not meet that record's stated reopen condition. If the
premise *is* the reopen condition, the item cannot close — it reopens the
record.

**Verdict interaction.** Items disposed **Close** or **Investigate** do
not contribute defect-based actions. An **Investigate** item withholds
sign-off only when its missing evidence meets the review-completeness rule;
neither the item's existence nor its filed severity establishes that need.
An unadjudicated item is not resolved, and missing evidence is not a clean
bill. Every other open item enters the verdict under its adjudicated action.

### Pre-analysis gate

Answer all four before assigning any axis, each **yes / no / n-a** with
its own evidence reference, and carry the answers into the report. They
are cheap, and they decide the disposition more often than the technical
analysis does.

- **Pinned?** Read the revision the finding was filed against, not HEAD.
- **Already fixed?** Distinguish three cases. Present at the filed pin →
  the filed mechanism is False. Landed after the pin in the lineage this
  review gates → valid then, Close now. Present only on some other or
  abandoned branch → the item stays open for this target.
- **Already accepted?** A documented accepted risk, stated requirement, or
  known deviation in the repo's own security model. Cite it, and check
  whether the finding's own premise is that record's stated reopen
  condition.
- **Already tracked?** An existing issue covering the same root cause.

The source's base rate of over-rating sets how much scrutiny to spend, and
nothing else. Prior dispositions of similar findings are a consistency
check applied *after* source-grounded adjudication — precedent never
establishes an axis, and never launders an earlier misclassification.

### Triage item template

Render every submitted item, including closed and false ones. Silence
about an item reads as agreement with it.

```markdown
### [T-01] <source ref> — short failure statement
`<Validity> · filed <Severity> → adjudicated <Severity> (<rating accuracy>) · <impact class> · <Disposition> · <Action, or — when closed or Investigate> · <Confirmed|Code-traced|Open question>`
**Gate:** pinned <revision> · fixed <y/n/n-a + commit/branch> ·
  accepted <y/n/n-a + security-model ref> · tracked <y/n/n-a + issue>
**Status:** <resolution state> — resolution evidence. (Only when the item
  is re-examined after remediation.)
**Assessment:** what holds, and which supporting claims do not.
**Evidence:** path:line at the filed revision.
**Suggestion:** smallest recommended change and target location. (Established
  open findings only; for Investigate, name the evidence needed instead.)
**Verification:** regression/acceptance check and expected result.
  (When recommending a fix; distinguish proposed from executed checks.)
**Reply draft:** (only when this item has its own external thread)
```

Impact class and evidence confidence carry their usual meaning, so
`Action` derives by the same mapping as for an `F` finding. `pinned` and
`**Evidence:**` cite the filed revision; `fixed`, `accepted` and `tracked`
cite current state.

