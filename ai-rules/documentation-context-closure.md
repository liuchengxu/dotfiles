## Documentation Context Closure

Apply this on every documentation create or update, not only before publishing. A live agent session hides state — prior findings, local files, renames, tentative terms — that a published doc does not carry. The gate promotes that hidden state into the artifact so a cold reader never hits a dangling reference.

**Tier 1 — every non-scratch doc, as you write.** Keep the changed text closed: no undefined finding IDs, no bare code references, no unexplained renamed terms, no "link later" placeholders. On an update, fix closure in the touched section and any directly dependent references — don't turn a narrow edit into a whole-document pass unless asked.

**Tier 2 — any doc that references code or may leave the session** (shared HTML, GitHub issue/PR, review notes, runbooks, colleague hand-offs). A cold reader must resolve every identifier, term, finding, and code reference from the artifact plus immutable links alone:

- Put the reviewed commit SHA or source version near the top.
- Grep-close finding IDs and issue-like refs (`AR-\d+`, `#\d+`): each defined, linked, or removed.
- Replace bare `path:line` refs with immutable permalinks (`/blob/<sha>/path#Ln`).
- Tag introduced or renamed terminology as `existing`, `renamed from <old>`, `proposed`, or `review terminology`.
- When forking a shareable doc from a canonical one, re-audience it: translate internal shorthand, regenerate derived siblings from the source, and don't hand-edit generated copies.

Private scratch notes are exempt from Tier 2 only while they stay private — keep them in a scratch/local location or label them `Private scratch`. Before sharing, publishing, or copying scratch material into a code-referencing doc, upgrade it to Tier 2.
