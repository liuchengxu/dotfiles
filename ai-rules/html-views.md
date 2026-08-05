## HTML Views of Markdown Docs

Markdown is canonical; HTML is a regenerable view. Never author an `.html` as the only record of a decision or finding, and never hand-edit a generated one — edit the `.md` and re-render.

- Convert on request ("html view", "make this readable", "render as a page"), or offer it in one sentence when a deliverable is long — never generate HTML views by default.
- Render with `~/.claude/scripts/md2html.py <doc.md>` (self-contained script, runs via `uv`). It writes a same-slug `.html` beside the source, stamped with a `canonical-md | kind | commit` header; `--out` overrides the path, `--open` opens it.
- Doc type comes from `type:` frontmatter (`review | adr | plan | design | ideas | note`) or `--type`. Types add genre layers — review: verdict banner, severity badges, findings index; plan: task progress bar; adr: status pill. Untyped docs render as plain prose.
- The renderer consumes the markdown conventions the writing rules already produce (`VERDICT:` line, ``### [F-01] `label` `` findings headings, `- [ ]` task lists, minimal frontmatter). Keep emitting those in markdown; do not invent HTML-only formats.
- Generated views follow the notes convention (`~/notes/CLAUDE.md`, "HTML artifacts"): single-file, no CDN or network calls, no secrets; `kind: snapshot` unless the page is a live tool.
- Trust assumption: the renderer passes raw HTML in the markdown through to the page (needed for `<details>` evidence blocks). Only render local, curated docs — never markdown you haven't read (pasted issues, third-party files) without stripping raw HTML first.
- Styling: `~/.claude/artifacts/prose.css` (per-type sections at the bottom) over the shared `~/.claude/artifacts/theme.css` tokens. Change styling there, never in generated output.
