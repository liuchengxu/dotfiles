---
name: doc-closure
description: >
  Close a document against the session that produced it — no dangling finding
  IDs, no session-only shorthand, and code references a cold reader can actually
  resolve.
  TRIGGER when writing or updating any document that references code or may
  leave the session: review notes, GitHub issues and PRs, runbooks, shared HTML,
  colleague hand-offs, design docs quoting code.
  DO NOT TRIGGER for private scratch notes that stay private, or for source code
  itself.
---

# Documentation Context Closure

A live session hides state — prior findings, local files, renames, tentative
terms — that a published doc does not carry. Closing a doc promotes that hidden
state into the artifact, so it stands alone for a cold reader who has the
document and its links but was never in the session.

Apply this on every create or update, not only before publishing.

## Every non-scratch doc, as you write

Keep the changed text closed and intelligible: no undefined finding IDs, no bare
code references, no session-coined shorthand or codenames left undefined at
first use, no unexplained renamed terms, no "link later" placeholders.
Compression never deletes an anchor or definition a cold reader needs.

On an update, fix closure in the touched section and any directly dependent
references — don't turn a narrow edit into a whole-document pass unless asked.

## Docs that reference code or may leave the session

Shared HTML, GitHub issues and PRs, review notes, runbooks, colleague
hand-offs. A cold reader must resolve every identifier, term, finding, and code
reference from the artifact plus immutable links or declared source pins.

- Reviews, audits, runbooks, and evidence docs carry the reviewed commit SHA or
  source version near the top.
- Grep-close finding IDs, issue-like refs, and bare commit SHAs (`AR-\d+`,
  `#\d+`, hex SHAs): each one defined, linked, or removed.
- Replace bare `path:line` refs with immutable permalinks
  (`/blob/<sha>/path#Ln`). A long or multi-repo doc may resolve them through a
  `Source pins` section instead (repo remote, branch, pushed commit SHA, dirty
  status, named default pin) — but keep inline permalinks for line-sensitive
  findings and for excerpts likely to be copied without that section.
- Never treat an unpushed or dirty SHA as immutable evidence: record the pushed
  SHA and whether local state was dirty.
- Tag introduced or renamed terminology — `existing`, `renamed from <old>`,
  `proposed`, `review terminology` — wherever a reader could mistake it for the
  codebase's current vocabulary.
- Chat and session links are provenance only; never make them required context.
- When forking a shareable doc from a canonical one, re-audience it: translate
  internal shorthand and regenerate derived siblings from the source rather than
  hand-editing the copy.

Private scratch notes are exempt only while they stay private — keep them in a
scratch or local location, or label them `Private scratch`. Upgrade before
sharing, publishing, or copying the material into a doc that references code.

## Records of a real operation

A doc recording a run, release, migration, ceremony, benchmark, deployment, or
on-chain step must also let the reader verify what happened, not only resolve
references. Those rules stay in the working rules rather than here, because the
evidence has to be planned before the operation runs.
