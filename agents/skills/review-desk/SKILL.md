---
name: review-desk
description: >
  Build and operate an offline review desk for GitHub PR review threads or
  audit-finding issues: the agent fetches, analyses and drafts, the page
  renders, the human edits, checks and approves, and the approved set is posted
  only when the human asks. Use when asked to "prepare the review replies",
  "work through the PR comments", "close the audit findings", or to render such
  a desk again after comments change.
---

# Review desk

A desk is a folder of files plus one HTML page. There is no daemon and no CLI:
each step is a command you run, and the output is a file. Design notes and the
test layout are in [README.md](README.md).

```
desk/
  raw/meta.json      run inputs: repo, kind, identity, pins
  raw/*.json         fetched items, as gh returns them
  raw/replies.json   thread analysis   (prompts/thread-reply.md)
  raw/checks.json    finding analysis  (prompts/finding-verdict.md)
  data.js | data-findings.js   built from raw/
  option-1-inbox.html | findings.html   the page, copied unchanged
  state.json         the human's work, moved by Export/Import in the page only
```

`raw/` and the data file are regenerable. `state.json` is not: losing it loses
the review. The page reads it only through Import, so a rebuild cannot
overwrite it.

## Steps

1. **Resolve and print the target.** Repo, kind (`thread` or `finding`),
   identity (PR number, or milestone), and the pin: the reviewed commit and
   the branch head for threads, each candidate PR's head for findings. If two
   of these are ambiguous, ask one question and stop. Write `raw/meta.json`
   before fetching anything.
2. **Fetch** with the commands in *Start a run*. Reconcile the count against
   what GitHub reports; list anything unreachable instead of dropping it.
3. **Analyse.** For each item, read what is asked and what the code does at
   the pin.
   - Threads: draft by `prompts/thread-reply.md` into `raw/replies.json`.
   - Findings: judge each finding first by `adversarial-review`'s "Findings
     filed by others", then the fix by `prompts/finding-verdict.md`, into
     `raw/checks.json`.
4. **Build** with `build.py` (threads) or `build-findings.py` (findings), then
   open the page.
5. **Review.** The human edits the body, sets the decision or verdict, marks
   each check, and approves. Approval is a transition out of *drafted*, never a
   flag set in advance.
6. **Export.** *Export state* writes a revisioned file; *Import state* refuses
   another desk, another repository, another pin or candidate set, a missing
   revision, and an older revision. This is the only way state crosses a run.
7. **Publish, when asked.** The page produces no command and holds no
   credential. Post exactly the approved set, one item at a time, with
   `--repo` on every command; thread replies use the command in
   `writing-issues-and-prs` "Review replies". Verify each result, append a
   receipt (item id, body digest, posted url or id, timestamp) to
   `receipts.jsonl` in the run folder, and report what happened. Before
   retrying a post that may have succeeded, look for the comment on GitHub
   first: a duplicate reply is worse than a late one.

## Check status

The analysis cannot set a status: the page starts every check unchecked.

| Stored | Page label | Passes the gate |
|---|---|---|
| `verified` | Checked | yes |
| `open` | Unverified | no |
| `wrong` | Contradicted | no |
| anything else | — | no |

## Finding verdicts

| Verdict | Closes the issue | Meaning |
|---|---|---|
| `fixed` | yes | the defect cannot occur at a non-draft candidate's head |
| `partial` | no | narrowed, still reachable |
| `not-fixed` | no | the change does not address the cause |
| `deferred` | yes | not fixed here; the comment names the issue that keeps tracking it |
| `not-applicable` | yes | the finding misreads the code |

Closing a `deferred` issue does not resolve the finding; the tracking issue
keeps it open.

## The gate

An item may leave *drafted* only when all of these hold:

- Every check is `verified`. A finding also needs at least one check; one
  with none is *not analysed*.
- For a finding, the verdict closes the issue and the closing comment is
  written. For a thread, the reply is non-empty and not a duplicate of another
  reply.
- `fixed` has a non-draft candidate.
- The pin still holds. A thread drafted before the branch moved is stale;
  re-read it, then approve again.

Approval records `{body, evidence, pin}` digests. Any later change to those
makes the approval stale, and a stale approval shows as *drafted*, including
after an import. It is drift detection, not a signature: it proves nothing
about who approved.

## Limits

- State lives in the browser between exports. A crash before *Export state*
  loses the edits since the last export. One writer at a time.
- The desk knows only the conversation it was built from. A new reply or a
  resolved thread is a changed source: re-fetch into a new run, export, import,
  and the refusal on a moved pin tells you what to re-read.
- Nothing verifies the meaning of a check; the human does.

## Start a run

```bash
T=~/.dotfiles/agents/skills/review-desk/templates
D=~/notes/<owner>/<repo>/<YYYY-MM-DD>-<slug>
mkdir -p "$D/raw"
```

Threads:

```bash
cp "$T"/{core.js,shared.js,shared.css,option-1-inbox.html} "$D/"
cat > "$D/raw/meta.json" <<'JSON'
{"repo": "owner/name", "kind": "thread", "pr": 42, "pinnedSha": "<reviewed commit>",
 "branchHeadSha": "<current head>", "generated": "YYYY-MM-DD"}
JSON
gh api --paginate --slurp repos/owner/name/pulls/42/comments > "$D/raw/comments.json"
# Analyse into "$D/raw/replies.json"; optional avatars go in "$D/avatars/<login>.png".
python3 "$T/build.py" --desk "$D" && open "$D/option-1-inbox.html"
```

Findings:

```bash
cp "$T"/{core.js,shared.css,findings.html} "$D/"
cat > "$D/raw/meta.json" <<'JSON'
{"repo": "owner/name", "kind": "finding", "milestone": "milestone title",
 "generated": "YYYY-MM-DD"}
JSON
gh issue list --repo owner/name --milestone "milestone title" --state open \
  --json number,title,state,url,labels,body --limit 200 > "$D/raw/issues.json"
gh pr list --repo owner/name --state open --limit 200 \
  --json number,title,isDraft,state,headRefOid,url,body,files > "$D/raw/prs.json"
# Analyse into "$D/raw/checks.json".
python3 "$T/build-findings.py" --desk "$D" && open "$D/findings.html"
```

A PR is a candidate for every issue its body closes (`closes #n`). `--out`
writes the data file elsewhere; it defaults to the desk. `templates/raw/` is a
complete synthetic run of both kinds.
