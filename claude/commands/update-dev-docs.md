---
description: Update dev docs before context reset - capture session progress and decisions
argument-hint: "[task-name]"
allowed-tools: Read, Write, Glob, Bash
model: sonnet
---

# Workflow: Update Development Documentation

Before context reset or at end of session, update development documentation to preserve:
- Current implementation state
- Key decisions made
- Next steps
- Uncommitted changes

## Input

Task name from `$ARGUMENTS`: `$ARGUMENTS`

If no argument provided, auto-detect from `~/dev/active/` directory.

## Step 1: Find Active Task

If `$ARGUMENTS` is empty:

```bash
# List directories in ~/dev/active/
ls -t ~/dev/active/ | head -1
```

Use the most recently modified directory as the task name.

## Step 2: Read Current Files

Read all three dev doc files:
- `~/dev/active/$TASK/TASK-plan.md`
- `~/dev/active/$TASK/$TASK-context.md`
- `~/dev/active/$TASK/$TASK-tasks.md`

## Step 3: Gather Current State

Collect information about:

### Git Status
```bash
cd ~/dev/active/$TASK
git status --short
git diff --stat
```

### Recent Files Modified
```bash
git log --oneline -5
ls -lt | head -10
```

### Build Status
```bash
cargo check --message-format short 2>&1 | tail -20
```

## Step 4: Update Context File

Append new section to `$TASK-context.md`:

```markdown

---

## Session Update: [current date and time]

### Changes Made This Session

#### Files Modified
- `path/to/file.rs`: [What was changed and why]
- `path/to/another.rs`: [What was changed and why]

#### Key Decisions Made

**Decision**: [What was decided]
- **Rationale**: [Why]
- **Alternatives**: [What else was considered]
- **Impact**: [What this affects]

**Decision**: [Another decision]
[Same structure]

### Implementation Notes

#### What Works
- [Feature or component that's working]
- [Another working component]

#### What's In Progress
- [Current work item]
  - Status: [How far along]
  - Blockers: [Any blockers]
  - Next steps: [Immediate next steps]

#### What's Blocked
- [Blocked item]
  - Reason: [Why it's blocked]
  - Unblock strategy: [How to unblock]

### Technical Discoveries

#### Insights Gained
- [Something learned about the codebase]
- [Performance characteristic discovered]
- [Edge case identified]

#### Problems Encountered
- **Problem**: [Description]
  - **Attempted**: [What was tried]
  - **Result**: [Outcome]
  - **Solution**: [How it was solved, or still investigating]

### Uncommitted Changes

```
[Output of git status --short]
```

**Reason not committed**: [Why - WIP, needs tests, etc.]

### Next Session TODO

1. [Specific next step with file/line reference]
2. [Another specific next step]
3. [Follow-up task]

### Questions to Resolve

- [ ] [Open question 1]
- [ ] [Open question 2]
```

## Step 5: Update Tasks File

Update `$TASK-tasks.md`:

1. **Mark completed tasks**: Change `- [ ]` to `- [x]` for completed items
2. **Update status fields**: Change "Not Started" to "In Progress" or "Completed"
3. **Update progress tracking**:
   ```markdown
   - **Last Updated**: [current date]
   - **Completion**: [X]% (Y/Z tasks)
   - **Current Phase**: Phase [N]
   ```
4. **Add new tasks discovered**: If new subtasks were identified, add them

Example update:

```markdown
### Task 1.2: Implement consensus state machine
- [x] Define state enum
- [x] Implement state transitions
- [ ] Add validation logic  ← IN PROGRESS
- [ ] Write unit tests

**Status**: In Progress (75% complete)
**Blockers**: Waiting for validator key implementation
**Notes**: Transition logic working, validation needs finishing
```

## Step 6: Update Plan File (if needed)

If there were significant changes to the approach:

1. Add a "Plan Updates" section:

```markdown

---

## Plan Updates

### Update: [date]

**Changed**: [What changed in the plan]
**Reason**: [Why the change was necessary]
**Impact**: [How this affects timeline/scope]

Original approach: [What was planned]
New approach: [What we're doing instead]
```

2. Update risk assessment if new risks emerged
3. Adjust timeline estimates based on actual progress

## Step 7: Create Handoff Summary

Create or update `~/dev/active/$TASK/$TASK-handoff.md`:

```markdown
# Quick Handoff: $TASK

**Last Updated**: [current date and time]
**Status**: [In Progress / Blocked / Nearly Complete]

## Current State in 3 Bullets

- [Most important thing to know]
- [Second most important thing]
- [Third most important thing]

## Immediate Next Steps

1. **[Task]** - [Why it's next] - File: `path/to/file.rs:123`
2. **[Task]** - [Why it's next] - File: `path/to/file.rs:456`
3. **[Task]** - [Why it's next]

## How to Resume

```bash
# 1. Review latest changes
git diff HEAD~3

# 2. Run tests to see current state
cargo test [specific-test-name]

# 3. Continue editing
# Open: path/to/file.rs:123
# The change needed: [specific description]
```

## Context Needed to Continue

- **Working on**: [Current file and function]
- **Goal**: [What this specific piece should do]
- **Approach**: [How you're implementing it]
- **Stuck on**: [If blocked, what's the issue]

## Commands to Run

```bash
# To test current work
[command]

# To run the feature
[command]

# To verify correctness
[command]
```

## Uncommitted Work

```
[git status output]
```

**Why uncommitted**: [Reason - tests failing, WIP, etc.]

## Memory Joggers

- Remember: [Important thing that's easy to forget]
- Watch out for: [Potential pitfall]
- Don't forget to: [Task that's easily overlooked]
```

## Step 8: Output Summary

```markdown
✅ Development documentation updated for: $TASK

📝 Updates made:
- Context file: Added session update with [X] changes documented
- Tasks file: Marked [Y] tasks complete, [Z] in progress
- Handoff file: Created/updated quick resume guide

📊 Progress:
- Completion: [X]%
- Phase: [Current phase]
- Status: [Overall status]

🎯 Next session:
1. [First immediate step]
2. [Second immediate step]
3. [Third immediate step]

💡 You can safely compact context now. All progress is preserved in:
  ~/dev/active/$TASK/

To resume: Read the handoff file first, then context file for details.
```

## Notes

- Focus on capturing **decisions** not just changes
- Document **why** things were done certain ways
- Note **blockers** and strategies to unblock
- Record **insights** that would be hard to rediscover
- Keep **handoff.md** concise - it's the quick-start guide
- Update **frequently** (every 30-60 minutes of work)
