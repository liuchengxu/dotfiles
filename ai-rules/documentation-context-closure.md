## Documentation Context Closure

Apply this on every documentation create or update, not only before publishing. A live agent session hides state — prior findings, local files, renames, tentative terms — that a published doc does not carry. The gate promotes that hidden state into the artifact so every non-scratch doc stands alone for a cold reader: no dangling references, no session-only shorthand, and enough state to understand why the doc exists.

**Tier 1 — every non-scratch doc, as you write.** Keep the changed text closed and intelligible: no undefined finding IDs, no bare code references, no session-coined shorthand or codenames left undefined at first use, no unexplained renamed terms, no "link later" placeholders. Compression never deletes anchors or definitions a cold reader needs. On an update, fix closure in the touched section and any directly dependent references — don't turn a narrow edit into a whole-document pass unless asked.

**Tier 2 — any doc that references code or may leave the session** (shared HTML, GitHub issue/PR, review notes, runbooks, colleague hand-offs). A cold reader must understand and resolve every identifier, term, finding, and code reference from the artifact plus immutable links or declared source pins:

- Put the reviewed commit SHA or source version near the top.
- Grep-close finding IDs, issue-like refs, and bare commit SHAs (`AR-\d+`, `#\d+`, hex SHAs): each defined, linked, or removed.
- Replace bare `path:line` refs with immutable permalinks (`/blob/<sha>/path#Ln`). For long or multi-repo docs, a `Source pins` section (repo remote, branch, pushed commit SHA, dirty status, named default pin) may instead be the resolution target for bare refs — but keep inline permalinks for line-sensitive findings and excerpts likely to be copied without the pins section.
- Never rely on unpushed or dirty SHAs as immutable evidence: record the pushed SHA and whether local state was dirty.
- Tag introduced or renamed terminology as `existing`, `renamed from <old>`, `proposed`, or `review terminology`.
- Treat chat/session links as provenance only; never make them required context.
- When forking a shareable doc from a canonical one, re-audience it: translate internal shorthand, regenerate derived siblings from the source, and don't hand-edit generated copies.

Private scratch notes are exempt from Tier 2 only while they stay private — keep them in a scratch/local location or label them `Private scratch`. Before sharing, publishing, or copying scratch material into a code-referencing doc, upgrade it to Tier 2.

**Tier 3 — any doc that is the record of authority for a concrete operation** (run, release, migration, ceremony, benchmark, deployment, on-chain step). A cold reader must verify what happened, not only resolve references:

- Include source pins for every repo involved.
- Link captured, redacted command output as artifacts; never capture secrets.
- Preserve the actual produced artifacts instead of summarizing them.
- For built or irreversible outputs, include a provenance manifest: source pins, dependency lockfile hashes when present, toolchain versions, build mode, output hashes, and domain-specific anchors for irreversible external state.
- Plan evidence before the operation and capture it during the run — a doc cannot be closed retroactively if the outputs were not kept.
