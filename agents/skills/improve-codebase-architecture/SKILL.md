---
name: improve-codebase-architecture
description: >
  Propose refactors that reduce concrete architecture costs or improve testability, using project vocabulary and ADRs. Does not authorize implementation. Use adversarial-review for a technical readiness verdict.
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

## Glossary

Use the project's established terms. The following vocabulary is an analysis aid,
not a replacement for domain names. Full definitions are in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, class, package, slice).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place. (Keep "boundary" when that is the established project term.)
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles (see [LANGUAGE.md](LANGUAGE.md) for the full list):

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

This skill is _informed_ by the project's domain model. The domain language gives names to good seams; ADRs record decisions the skill should not re-litigate.

## Process

### 1. Explore

Read the project's domain glossary and any ADRs in the area you're touching first.

Explore with the host's available read/search tools, or delegate to a read-only
exploration subagent when supported and permitted by the host's protocol.
Don't follow rigid heuristics — explore organically and note where you
experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

### 2. Present candidates

Present a numbered list of deepening opportunities. For each candidate:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and also in how tests would improve

**Use CONTEXT.md vocabulary and established source names.** Use
[LANGUAGE.md](LANGUAGE.md) terms to explain a concept only when they do not
replace an established domain or architecture term.

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly (e.g. _"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

If the user requested candidate discovery, present the candidates and identify
any decision needed to continue. If the user requested a complete proposal for
a chosen scope, develop it now; do not force a separate selection interview.

### 3. Grilling loop

When the user requests an interview or a material decision is missing, use a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Update project documents only for agreed decisions within existing edit
authority. Keep proposed terms in the proposal until agreement. Then:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md` — same discipline as `/grill-with-docs` (see [CONTEXT-FORMAT.md](../grill-with-docs/CONTEXT-FORMAT.md)). Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer to avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it right now") and self-evident ones. See [ADR-FORMAT.md](../grill-with-docs/ADR-FORMAT.md).
- **Want to explore alternative interfaces for the deepened module?** See [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before analysis, confirmed the requested architecture outcome, investigation boundary, and need for the analysis; recorded domain terms that still needed investigation.
- [ ] Read relevant glossary terms, ADRs, and source, then tied each candidate to observed friction, locality, leverage, and testability.
- [ ] Applied the deletion test and checked existing seams, adapters, and ADR constraints before proposing a new abstraction.
- [ ] Presented actionable candidates or a complete requested proposal without implementing code or treating proposed terms as accepted.
- [ ] Recorded unresolved design decisions, ADR conflicts, and evidence limits that affect the recommendation.
