---
description: Open a file, directory, or branch diff in Lore.
argument-hint: "<file-or-directory> | --diff <directory>"
---

Open the requested target in Lore: $ARGUMENTS

Use the existing helper with the Bash tool:

```bash
python3 ~/.dotfiles/agents/claude/scripts/lore-open.py <arguments>
```

Pass each user argument as a literal, safely quoted command-line argument; never interpret it as shell code. A file opens in Preview, while `--diff` opens the requested directory in Branch Diff. On success, confirm briefly what opened. On failure, report the helper's message and note that Lore may not be running. Do not rebuild or substitute another viewer without authorization.
