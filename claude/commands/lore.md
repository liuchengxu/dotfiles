Open a file or directory in the Lore desktop app via its Unix domain socket RPC, then raise the Lore window.

- **File preview**: `$ARGUMENTS` is a file path → opens in the Preview tab
- **Branch diff**: `$ARGUMENTS` starts with `--diff` → opens the directory in the Branch Diff tab

Use the Bash tool to run:

```bash
python3 ~/.claude/scripts/lore-open.py $ARGUMENTS
```

If it succeeds, briefly confirm the file was opened. If it fails (e.g. socket not found), tell the user Lore may not be running.
