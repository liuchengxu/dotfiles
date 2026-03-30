Review the plan file at `$ARGUMENTS` using the Codex MCP tool in an iterative loop. Fix findings after each cycle and resubmit until Codex returns "No findings."

## Process

1. Read the plan file to understand its content.
2. Build an exclusion list (initially empty) from items the plan explicitly acknowledges as out-of-scope, pre-existing, or already mitigated.
3. Submit the plan to `mcp__codex-cli__codex` with the review prompt below, using `model: gpt-5.4`, `reasoningEffort: high`, `sandbox: read-only`, and `resetSession: true`. Set `workingDirectory` to the current git repo root.
4. Parse the response:
   - If "No findings." — stop and report success with the total number of cycles.
   - If findings are returned — for each finding:
     - If it's a repeat of something already acknowledged in the plan or exclusion list, add it to the exclusion list for next cycle.
     - If it's actionable, fix the plan file directly.
   - Log a summary of the cycle: which findings were fixed, which were added to exclusions.
5. Repeat from step 3 with the updated exclusion list appended to the "Do NOT flag" section.
6. If Codex returns a rate limit error, inform the user and stop.

## Review prompt template

```
Review the implementation plan at {file_path} for internal contradictions, logical errors, or gaps.

Focus on:
1. Are there any internal contradictions between different sections?
2. Are there TOCTOU or race condition issues in the locking/ordering?
3. Does the crash-safety analysis hold up?
4. Are the validation steps complete and correctly ordered?
5. Do the test cases cover the described behavior?

Do NOT flag:
{exclusion_list}

Output format: If you find issues, list them as "Finding N (severity): description". If no issues found, output exactly "No findings."
```

## Rules

- Maximum 30 cycles to prevent infinite loops. If not converged by then, stop and report remaining findings.
- After fixing a finding, do NOT add it to the exclusion list — only add items that the plan already documents as acknowledged/out-of-scope.
- When a finding is a repeat of something fixed in a prior cycle (Codex didn't see the fix), that's a sign the fix didn't fully address it — re-examine before dismissing.
- Keep a running count of cycles and findings fixed for the final summary.
