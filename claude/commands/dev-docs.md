---
description: Create comprehensive strategic plan with task breakdown for Rust/blockchain development
argument-hint: "[task-name]"
allowed-tools: Read, Write, Glob, Grep, Bash
model: sonnet
---

# Workflow: Create Development Documentation

Create a comprehensive strategic plan with three supporting files for tracking implementation progress. This workflow helps prevent context loss and maintains focus during large features.

## Input

Task name from `$ARGUMENTS`: `$ARGUMENTS`

## Step 1: Understand the Task

Gather context by:
- Reading existing documentation (if any)
- Scanning relevant code files
- Understanding the current architecture
- Identifying affected components

## Step 2: Create Directory

```bash
mkdir -p ~/dev/active/$ARGUMENTS
```

## Step 3: Create Plan File

Create `~/dev/active/$ARGUMENTS/$ARGUMENTS-plan.md` with this structure:

```markdown
# $ARGUMENTS Strategic Plan

Last Updated: [current date]

## Executive Summary

[2-3 sentences: what you're building, why it's needed, expected impact]

## Current State Analysis

### Existing Implementation
- What exists today?
- How does it work currently?
- What are the limitations?

### Technical Debt
- Known issues to address
- Areas needing refactoring
- Performance bottlenecks

### Dependencies
- Required external crates
- Internal modules this depends on
- Infrastructure requirements

## Proposed Future State

### Target Architecture
- High-level design
- Component interactions
- Data flow

### Key Changes
- What will be different?
- New components to build
- Existing components to modify

### Success Criteria
- How will we know it's working?
- Performance targets
- Functional requirements

## Implementation Phases

### Phase 0: Preparation
**Goal**: Set up foundation and gather requirements

**Tasks**:
1. Review existing code and documentation
2. Identify all affected components
3. Set up dev environment
4. Create test data generators (if needed)

**Estimated Effort**: S (< 1 day)

### Phase 1: [Core Component Name]
**Goal**: [Specific objective]

**Tasks**:
1. [Specific task with file paths if known]
2. [Specific task]
3. [Specific task]

**Dependencies**: Phase 0
**Estimated Effort**: M (1-3 days)

### Phase 2: [Next Component]
**Goal**: [Specific objective]

**Tasks**:
[Same structure as Phase 1]

**Dependencies**: Phase 1
**Estimated Effort**: L (3-5 days)

[Continue with more phases as needed]

### Phase N: Testing & Integration
**Goal**: Verify correctness and performance

**Tasks**:
1. Unit tests for new functionality
2. Integration tests for component interaction
3. Benchmark critical paths
4. Security review (if applicable)
5. Documentation updates

**Dependencies**: All previous phases
**Estimated Effort**: M (1-3 days)

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to prevent/handle] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How to prevent/handle] |

## Success Metrics

- **Functionality**: [Specific functional goals]
- **Performance**: [Specific performance targets]
- **Code Quality**: [Coverage, clippy compliance, etc.]
- **Documentation**: [What needs documenting]

## Resources and Dependencies

### External Crates Needed
- `crate-name = "version"` - [Purpose]

### Team Coordination
- [Any team dependencies]

### Infrastructure Changes
- [Database migrations, config changes, etc.]

## Timeline Estimates

- **Phase 0**: [X days]
- **Phase 1**: [Y days]
- **Phase 2**: [Z days]
- ...
- **Total**: [N days]

*Note: These are estimates and may change as implementation progresses*

## Notes

[Any additional context, assumptions, or open questions]
```

## Step 4: Create Context File

Create `~/dev/active/$ARGUMENTS/$ARGUMENTS-context.md` with this structure:

```markdown
# $ARGUMENTS Context Reference

Last Updated: [current date]

## Key Files

### Core Implementation
- `path/to/file1.rs` - [What it does and why it's relevant]
- `path/to/file2.rs` - [What it does and why it's relevant]

### Tests
- `path/to/test.rs` - [What's being tested]

### Configuration
- `path/to/config.toml` - [Relevant config sections]

## Architectural Decisions

### Decision 1: [Choice Made]
**Date**: [When decided]
**Rationale**: [Why this approach]
**Alternatives Considered**: [What else was evaluated]
**Trade-offs**: [Pros and cons]

### Decision 2: [Choice Made]
[Same structure]

## Technical Constraints

- **Constraint 1**: [Description and reason]
- **Constraint 2**: [Description and reason]

## Dependencies

### Internal Dependencies
- Module X: [What we depend on and why]
- Module Y: [What we depend on and why]

### External Dependencies
- Crate A: [Purpose and version]
- Crate B: [Purpose and version]

## Data Structures

### [StructName]
```rust
pub struct StructName {
    field1: Type,  // [Purpose]
    field2: Type,  // [Purpose]
}
```
**Invariants**: [What must always be true]
**Used in**: [Which components use this]

## State Transitions

[If applicable, document state machine transitions]

```
State A --[event]--> State B
State B --[event]--> State C
```

## API Contracts

### Function: `function_name`
- **Inputs**: [Parameter descriptions]
- **Outputs**: [Return value description]
- **Errors**: [Possible error conditions]
- **Preconditions**: [What must be true before calling]
- **Postconditions**: [What will be true after calling]

## Performance Considerations

- **Hot paths**: [Functions called frequently]
- **Bottlenecks**: [Known or potential performance issues]
- **Optimization opportunities**: [Areas for future optimization]

## Security Considerations

[For blockchain/security-critical code]

- **Attack vectors**: [Potential attack vectors]
- **Mitigations**: [How we prevent attacks]
- **Assumptions**: [Security assumptions being made]

## Related Documentation

- [Link to spec or RFC]
- [Link to related docs]
- [Link to examples]

## Glossary

- **Term 1**: [Definition]
- **Term 2**: [Definition]
```

## Step 5: Create Tasks File

Create `~/dev/active/$ARGUMENTS/$ARGUMENTS-tasks.md` with this structure:

```markdown
# $ARGUMENTS Execution Checklist

## Progress Tracking

- **Started**: [date]
- **Last Updated**: [date]
- **Completion**: 0% (0/X tasks)
- **Current Phase**: Phase 0

## Phase 0: Preparation

### Task 0.1: Review existing code
- [ ] Read current implementation
- [ ] Identify affected modules
- [ ] Document current behavior

**Acceptance Criteria**:
- [ ] All relevant files identified
- [ ] Current behavior understood
- [ ] Limitations documented

**Status**: Not Started
**Assigned**: [name]
**Estimated**: 2 hours

### Task 0.2: Set up development environment
- [ ] Clone or update repository
- [ ] Install dependencies
- [ ] Verify builds successfully
- [ ] Run existing tests

**Acceptance Criteria**:
- [ ] `cargo build` succeeds
- [ ] `cargo test` passes
- [ ] `cargo clippy` passes

**Status**: Not Started
**Estimated**: 1 hour

## Phase 1: [Phase Name]

### Task 1.1: [Specific task]
- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Dependencies**: Task 0.2
**Effort**: S (< 4 hours)
**Status**: Not Started

### Task 1.2: [Specific task]
[Same structure]

## Phase 2: [Phase Name]

[Continue with all phases from the plan]

## Testing Tasks

### Task N.1: Unit tests
- [ ] Test happy path
- [ ] Test error conditions
- [ ] Test edge cases

**Acceptance Criteria**:
- [ ] Coverage > 80% for new code
- [ ] All tests pass

**Status**: Not Started

### Task N.2: Integration tests
- [ ] Test component integration
- [ ] Test end-to-end flows

**Acceptance Criteria**:
- [ ] Integration tests pass
- [ ] No regressions in existing tests

**Status**: Not Started

### Task N.3: Benchmarks
- [ ] Benchmark critical paths
- [ ] Compare against baseline
- [ ] Document results

**Acceptance Criteria**:
- [ ] Performance targets met
- [ ] No regressions

**Status**: Not Started

## Documentation Tasks

### Task D.1: Code documentation
- [ ] Add doc comments to public APIs
- [ ] Update module-level docs
- [ ] Add examples

**Acceptance Criteria**:
- [ ] All `pub` items have doc comments
- [ ] Examples compile and run

**Status**: Not Started

### Task D.2: Update README
- [ ] Document new features
- [ ] Update usage examples
- [ ] Update configuration docs

**Status**: Not Started

## Review & Cleanup

### Task R.1: Code review
- [ ] Self-review changes
- [ ] Run architecture reviewer agent
- [ ] Address feedback

**Status**: Not Started

### Task R.2: Final validation
- [ ] `cargo +nightly fmt --all`
- [ ] `cargo clippy -- -D warnings`
- [ ] `cargo test --workspace`
- [ ] `cargo build --release`

**Status**: Not Started

## Completion Checklist

- [ ] All planned tasks completed
- [ ] Tests passing
- [ ] Clippy warnings resolved
- [ ] Code formatted
- [ ] Documentation updated
- [ ] Performance targets met
- [ ] Architecture review approved
```

## Step 6: Output Summary

After creating all three files, present:

```markdown
✅ Development documentation created for: $ARGUMENTS

📁 Files created:
- ~/dev/active/$ARGUMENTS/$ARGUMENTS-plan.md
- ~/dev/active/$ARGUMENTS/$ARGUMENTS-context.md
- ~/dev/active/$ARGUMENTS/$ARGUMENTS-tasks.md

Next steps:
1. Review and refine the strategic plan
2. Fill in any missing technical details in the context document
3. Begin with Phase 0 tasks
4. Update tasks.md as you make progress
5. Run /update-dev-docs before context resets

💡 Tip: Keep these files updated as you work. They'll survive context
compaction and help you resume exactly where you left off.
```

## Notes

- Adapt phase structure to task complexity
- Be specific about file paths and modules
- Include Rust-specific considerations (unsafe blocks, async, etc.)
- For blockchain tasks, add security and economic model sections
- Estimate conservatively - it's better to finish early
