---
name: md2html
description: >
  Render a markdown doc as a self-contained HTML view, written by hand for that
  document. TRIGGER when the user asks for an "html view", "make this
  readable", "render as html/page", "open as a page", or wants a shareable page
  of a markdown deliverable (review report, plan, ADR, research/design note).
  DO NOT TRIGGER to author new content (write the markdown first), for the todo
  board (use /todo), or to build interactive dashboards and tools (author those
  directly).
---

# md2html

Markdown is canonical; the page is a view of it. Write the HTML for the
document in front of you — no converter, no shared stylesheet — so the layout
follows that document's actual shape instead of a template's.

Never author an `.html` as the only record of a decision or finding, and never
hand-edit a rendered one — edit the `.md` and rebuild.

## When to render

Convert on request ("html view", "make this readable", "render as a page"), or
offer it in one sentence when a deliverable is long. Never generate an HTML
view by default.

Only render local, curated docs you have read. Never paste untrusted markdown
(pasted issues, third-party files) into a page without stripping raw HTML
first.

## Read the doc before designing

Know its genre, its length, what the reader looks for first, and what structure
the markdown already carries. A three-paragraph note and a forty-finding audit
are not the same page.

## Structure the markdown already carries

Surface these; never invent HTML-only formats. The authoring skills own these
shapes — for review, severity, impact class, action mapping and the finding
template are defined in `../adversarial-review/taxonomy.md`. Read the ladders
there rather than inferring them from the words on the page.

| In the markdown | Means |
|---|---|
| `type:` frontmatter | genre: review, adr, plan, design, ideas, note |
| `branch` / `commit` / `session` frontmatter | provenance to stamp on the page |
| `VERDICT:` line | the headline conclusion |
| ``### [F-01] `label` `` | one finding |
| critical / high / medium / low | finding severity |
| `- [ ]`, `- [x]` | plan tasks, open vs done |
| `<details>` | evidence; keep it collapsed |

A doc without them renders as prose. Do not fabricate structure it lacks.

## What each genre must surface

Goals, not implementations — pick the form yourself.

- **review** — verdict legible before any scrolling; findings individually
  linkable and scannable by severity; evidence collapsed by default.
- **plan** — done versus remaining, visible at a glance.
- **adr** — status (proposed / accepted / superseded) beside the title.
- **design, ideas, note** — prose; long docs earn a way to navigate.

## Navigating a long page

Once a page carries more structure than a reader holds in view — roughly 2,000
words, 7 sections, or 8 findings — its full structure belongs near the top and
its destinations stay reachable from anywhere in it. Assume no find-in-page:
Lore is a Tauri webview and macOS `WKWebView` ships no find bar, so the page's
own navigation is often the only tool the reader has.

Every decision-bearing item stays in the linear flow — searchable, printable,
and reachable by its own link. Collapse only what the source marked secondary,
and give each finding and section a stable id that reads as the target once the
reader lands on it.

Navigation does not get its own column. Prose already sets the measure, and a
persistent rail spends width on a second copy of an index the page states
better in flow. Reach for these in order, and stop as soon as the page is
navigable:

1. An exhaustive table under the verdict — every finding, not a sample. Carry
   severity and action as separate columns; they are separate ladders. This is
   the index; anything later only has to make it reachable again.
2. An overlay that opens on demand for reach from deep in the page — a fixed
   `<details>` costs nothing until the reader asks for it.
3. A pinned header on a card that runs past a screen.

Tracking the reader's position needs script and only earns it around 30
destinations. Splitting into sibling pages waits for roughly 15,000 words, and
never replaces a single-file edition for search and print.

No tabs. Inactive panels are `display:none`, which the HTML standard excludes
from find-in-page in every engine, and a document has one `:target`, so tab
fragments and `#F-01` links cannot both drive it. CSS alone also cannot supply
the selected state and arrow-key focus a tab widget owes a screen reader.

## Links out

Code locations, issue and PR numbers, revisions and branches are the reader's
exits from the page. Resolve them all, which the context-closure rule already
requires of any doc that leaves the session.

Code references:

- Pin each ref to the commit its finding was reviewed against, not to a single
  repo HEAD. A stacked-PR review pins a different SHA per PR; read them off the
  doc's own source pins.
- Verify the target exists at that SHA (`git cat-file -e <sha>:<path>`) before
  emitting a link. An unverified permalink is worse than plain text.
- Leave ambiguous bare filenames and third-party paths as plain code. Guessing
  which `main.rs` was meant produces a confidently wrong link.

Issue and PR references:

- `#NNN` resolves to the repo's `/pull/` or `/issues/` path. Confirm which it is
  (`gh pr view` / `gh issue view`) — the two are not interchangeable.
- Rewrite only bare refs in prose. Attribute syntax (`#[ignore]`), anchor
  fragments, and colour literals also start with `#` and must survive untouched.

Revisions and branches:

- A commit SHA links to `/commit/<sha>` and is the durable anchor — it survives
  deletion of every branch that once contained it.
- A branch links to `/tree/<branch>` only once `git ls-remote --heads` resolves
  it. Merged feature branches are routinely deleted, so the link dies while the
  commit it pointed at still loads.
- A metadata field that defers elsewhere ("heads pinned below") links to that
  section, never to a fabricated commit.

## Page requirements

- Single file, no runtime fetches: inline every style and script, embed images
  as data URIs, no CDN or remote fonts. The ban covers resources the page loads
  to render — outbound citation links (permalinks, specs, issues) are expected
  and wanted.
- No secrets, no unredacted command output.
- Light and dark both defined explicitly; the page picks up the viewer's theme.
- Wide content (tables, code, diagrams) scrolls inside its own container. The
  body never scrolls sideways.
- Readable line length for prose; the content sets the measure, not the window.

## Output

Same-slug `.html` beside the `.md`, opening with the notes header comment
(`~/notes/CLAUDE.md`, "HTML artifacts"):

```html
<!-- canonical-md: <slug>.md | kind: snapshot|tool | commit: <sha> -->
```

Use `kind: snapshot` unless the page is a live tool. Scratch renders go to
`notes/` or a temp path so they never sit beside a durable note. Preview with
`~/.claude/scripts/lore-open.py <file.html>`.

Never hand-edit a rendered page — change the `.md` and rebuild.

A page that will be shared carries the same closure duty as any doc leaving the
session — see the `doc-closure` skill.
