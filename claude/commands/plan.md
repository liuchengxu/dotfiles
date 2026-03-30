# Feature Plan: $ARGUMENTS

You are planning a feature. Do NOT write any implementation code. Planning and implementation are separate phases.

## Step 1: Explore

Use subagents to investigate the codebase in parallel:
- Identify relevant files, modules, and dependencies
- Understand existing patterns and conventions
- Find related tests and CI configuration

## Step 2: Create Plan

Derive a short kebab-case slug from the feature (e.g., "multi-vk", "prover-router").
Create `notes/plan-YYYY-MM-DD-<slug>.md` (using today's date) with this structure:

```markdown
# Feature Plan: [Name]

## 1. Problem Description
- **Context**: [Business/technical background]
- **Problem Statement**: [What's wrong or missing]
- **Target Outcome**: [What success looks like]

## 2. Implementation Options

### Option A: [Name]
- **Approach**: [Brief description]
- **Pros**: ...
- **Cons**: ...
- **Complexity**: [Low/Medium/High]

### Option B: [Name]
- **Approach**: [Brief description]
- **Pros**: ...
- **Cons**: ...
- **Complexity**: [Low/Medium/High]

### Option C: [Name] (if applicable)
- **Approach**: [Brief description]
- **Pros**: ...
- **Cons**: ...
- **Complexity**: [Low/Medium/High]

## 3. Recommendation
[Selected approach + justification]

## 4. Files to Modify
- `path/to/file.rs` — [what changes]
- `path/to/other.rs` — [what changes]

## 5. Milestones
- [ ] Milestone 1: [description]
  - [ ] subtask
  - [ ] subtask
- [ ] Milestone 2: [description]
  - [ ] subtask
  - [ ] subtask

## 6. Testing Strategy
- [How to verify each milestone]
- [New tests needed]
- [Existing tests affected]

## 7. Risks & Open Questions
- [What could go wrong]
- [Decisions that need user input]

## 8. Future Enhancements
- [Ideas for follow-up work, out of scope for now]
```

## Step 3: Present

- Present the plan summary to the user.
- Highlight any decisions that need their input.
- Wait for approval before any implementation begins.

## Rules
- Do NOT write implementation code. Planning only.
- Prefer the simplest possible solution.
- Do NOT introduce traits, generics, or architectural patterns unless clearly justified.
- If multiple approaches are close, present them and ask the user to choose.
- Scope each milestone to ~30 minutes of implementation work.
- Always re-read exploration notes before finalizing the plan.
