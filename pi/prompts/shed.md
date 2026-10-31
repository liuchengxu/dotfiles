---
description: Open Markdown in Shed Preview or repository changes in Shed Changes.
argument-hint: "<file-or-folder> | --diff [repository] [--base ref] [--scope committed|with-uncommitted|uncommitted]"
---

Open the requested Markdown file or folder in Shed Preview, or repository changes in Shed Changes: $ARGUMENTS

Use the existing shared helper with the Bash tool:

```bash
python3 ~/.dotfiles/claude/scripts/shed-open.py <arguments>
```

Pass the user's arguments as literal command-line arguments, quoting paths safely. Do not interpret argument text as shell code. For Preview, a Markdown file or folder is required. For Changes, use `--diff`; the repository defaults to the current directory. Optional `--base <ref>` selects the comparison base. Optional `--scope committed|with-uncommitted|uncommitted` selects the changes; the default includes uncommitted work. The helper resolves the default base from `origin/HEAD`, then `origin/main`, `origin/master`, `main`, or `master`.

A running Shed receives the request and comes to the front; otherwise the helper starts it. On success, confirm what opened in one line. On failure, report the helper's message. Do not rebuild or substitute another viewer without authorization. Shed previews Markdown, not HTML or PDF.
