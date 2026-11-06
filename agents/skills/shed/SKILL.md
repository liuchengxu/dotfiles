---
name: shed
description: Open Markdown files or folders in the local Shed Preview app, or Git repository changes in Shed Changes, when the user asks to view something in Shed. Not for editing Shed source or viewing HTML/PDF.
---

# Open in Shed

Use the installed shared helper through the shell:

```bash
python3 ~/.local/bin/shed-open.py /absolute/path/to/document.md
python3 ~/.local/bin/shed-open.py /absolute/path/to/folder
python3 ~/.local/bin/shed-open.py --diff /absolute/path/to/repository
```

For changes, optional `--base <ref>` selects the comparison base and
`--scope committed|with-uncommitted|uncommitted` selects the changes.
The default includes uncommitted work. Without an explicit base the helper
tries origin/HEAD, origin/main, origin/master, main, then master.

Pass paths and user arguments as literal arguments with safe shell quoting.
The helper focuses a running Shed or starts it. It uses the Studio checkout
binary at `~/src/github.com/liuchengxu/shed/target/release/shed`, or `SHED_BIN`
when explicitly configured. Do not substitute an arbitrary `shed` from PATH;
an unrelated hex editor uses that name.

On failure, report the helper error; do not rebuild or substitute another
viewer without authorization. Opening a diff does not authorize changing,
committing, or pushing the repository.

For verification, the same Shed binary supports `--state --json`. Check the
requested path or repository and loading status before claiming it loaded.
Confirm the opened item briefly. If the user has not identified an item and
context does not resolve it, ask which file, folder, or repository to open.
