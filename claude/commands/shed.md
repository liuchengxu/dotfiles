Open a Markdown file or a folder in Shed's Preview, or a worktree's changes in Shed's Changes. Each call starts a new Shed window, which comes to the front.

- **Preview**: `$ARGUMENTS` is a Markdown file or a folder.
- **Changes**: `$ARGUMENTS` starts with `--diff`, then a worktree or repository folder (the current folder when none is given). The base is the remote's default branch (`origin/HEAD`), else `origin/main`, `origin/master`, `main` or `master`. Add `--base <ref>` to choose another. The review includes uncommitted work; add `--scope committed` or `--scope uncommitted` to change that.

Shed is a GUI app, so run the command with the Bash sandbox disabled:

```bash
python3 ~/.claude/scripts/shed-open.py $ARGUMENTS
```

If it succeeds, confirm in one line what opened. If it fails, show its message. For an HTML or PDF file, use `/lore`: Shed previews only Markdown.
