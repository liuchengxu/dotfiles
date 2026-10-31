---
description: Read or update the existing shared TODO list on request.
argument-hint: "<list, prioritize, add, update, or remove request>"
---

Handle this TODO request using the existing `~/.claude/TODO.md`: $ARGUMENTS

Read it only when tasks or priorities are requested; do not inject it at session startup. For edits, change only the explicitly requested scope, preserve unrelated and concurrent changes, and deduplicate equivalent items. Use absolute dates when recording or clarifying dates. Do not create a new or parallel TODO list. Report the requested result concisely.
