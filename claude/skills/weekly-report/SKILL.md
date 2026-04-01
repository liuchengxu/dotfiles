---
name: weekly-report
description: Use when the user asks for a weekly report, activity summary, or wants to review what was done in a GitHub org over a time period — searches issues and PRs, filters by author, groups by repo, and formats for Slack
---

# Weekly Report

Generate a weekly activity summary from a GitHub org, formatted for Slack.

## Flow

1. **Query org activity** — use `gh search issues` and `gh search prs` with `--owner <org>` and `--created ">=$(date -v-7d +%Y-%m-%d)"` (adjust range as needed). Use `--limit 200` to catch high-volume orgs. Default org: `babylonlabs-io`.
2. **Filter by author** — default to `@liuchengxu` unless the user specifies otherwise.
3. **Exclude closed PRs** — only include open and merged PRs. Closed (unmerged) PRs are abandoned work and should not appear in the report.
4. **Group by repo** — organize items by repository, not chronologically.
4. **Format for Slack** — output as flat bullet points, one line per work item:

```
- <repo>: <description of work item>
```

## Formatting Rules

- No links (GitHub links don't render well in Slack unless full URLs, and those are noisy)
- No PR/issue numbers
- No state indicators (merged/open/closed)
- No dates
- Each bullet = one work item, concise single sentence
- Prefix with repo name (short name, not full path)
- Use lowercase for prefixes: `vaultd:`, `provers:`, etc. Match whatever short names the user prefers

## Example Output

```
- vaultd: Consolidated duplicated daemon startup infrastructure into a shared DaemonContext.
- vaultd: Cleaned up unnecessary trait bounds from struct definitions.
- provers: Introduced Groth16Proof wrapper type.
- provers: Added CI to detect unintended VK/ELF changes on PRs.
```

## Notes

- If `gh search` hits the 100-result cap, paginate by splitting the date range
- Generate repo-level stats (issue/PR counts by repo, by author) first if the user wants an overview before drilling into individual contributions
- Let the user iterate on format — they may want to adjust grouping, wording, or add/remove items before posting
