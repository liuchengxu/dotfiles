## HTML Views of Markdown Docs

Markdown is canonical; HTML is a regenerable view. Never author an `.html` as the only record of a decision or finding, and never hand-edit a rendered one — edit the `.md` and rebuild.

- Convert on request ("html view", "make this readable", "render as a page"), or offer it in one sentence when a deliverable is long — never generate HTML views by default.
- Write the page for the document at hand: read it, then build markup that fits its shape. No shared renderer or stylesheet carries the design for you.
- Output is a same-slug `.html` beside the source, opening with the notes header comment (`~/notes/CLAUDE.md`, "HTML artifacts"): `<!-- canonical-md: <slug>.md | kind: snapshot|tool | commit: <sha> -->`. Use `kind: snapshot` unless the page is a live tool.
- Single file, no runtime fetches: inline every style and script, embed images as data URIs, no CDN or remote fonts. The ban is on resources the page loads to render — outbound citation links (permalinks, specs, issues) are expected and wanted. No secrets, no unredacted command output.
- Surface the structure the markdown already carries (`type:` frontmatter, `VERDICT:` line, ``### [F-01] `label` `` findings, `- [ ]` task lists) and invent no HTML-only formats — someone reading only the `.md` must not be missing anything.
- Only render local, curated docs you have read. Never paste untrusted markdown (pasted issues, third-party files) into a page without stripping raw HTML first.
