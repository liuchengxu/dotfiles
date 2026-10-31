---
name: weekly-report
description: >
  Summarize GitHub organization activity over a requested interval, with author filtering, repository grouping, and Slack-ready output.
---

# Weekly Report

Generate a weekly activity summary from a GitHub org, formatted for Slack.

## Flow

1. **Set the interval** — use the requested dates, or the last seven calendar days including today. Use an inclusive `START..END` date range, not an unbounded lower limit.
2. **Query by org and author** — pass `--owner <org> --author <author> --limit 200` on every query. Defaults: `babylonlabs-io` and `liuchengxu`.
   - Issues: `gh search issues --created "START..END"`.
   - PRs created in the interval: `gh search prs --created "START..END"`, once with `--state open` and once with `--merged`.
   - PRs merged in the interval, regardless of creation date: `gh search prs --merged-at "START..END" --merged`.
   - Include `--updated "START..END"` queries only when the requested report includes other ongoing activity; an update alone does not prove substantive work.
3. **Deduplicate and filter** — union results by canonical URL. Keep only open or merged PRs; omit closed-unmerged PRs. Keep URLs internally even though the Slack output omits them.
4. **Group by repo** — organize items by repository, not chronologically.
5. **Format for Slack** — output as flat bullet points, one line per work item:

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

- If a query reaches the selected result limit or reports incomplete results, split its date range (or partition by repo), then deduplicate again. Do not present truncated results as complete.
- Generate repo-level stats (issue/PR counts by repo, by author) first if the user wants an overview before drilling into individual contributions
- Let the user iterate on format — they may want to adjust grouping, wording, or add/remove items before posting

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before querying, confirmed the organization, author, inclusive interval, activity types, and need for each query were clear.
- [ ] Queried created and merged work with bounded dates, split any truncated result set, and deduplicated by canonical URL.
- [ ] Kept only supported issue and open or merged PR activity, and did not infer substantive work from an update alone.
- [ ] Grouped Slack-ready items by repository with the requested short names and omitted links, numbers, states, and dates.
- [ ] Reported any incomplete query, author ambiguity, or wording uncertainty that limits the report.
