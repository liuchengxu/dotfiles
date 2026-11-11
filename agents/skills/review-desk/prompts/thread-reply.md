# Draft one reply to one review thread

Input: the thread JSON (root comment, replies, path and line, the pinned commit)
and read access to the repository at that commit.

## Read first

Open the code the thread is about, at the pinned commit, and the files the
comment names. If the reviewer quoted a line, read that line. Do not reply from
the comment text alone: it is often stale relative to the code.

## Write

- Answer what was asked. If the reviewer asked a question, the first sentence is
  the answer, not a preamble.
- State the change as it is now, or the reason it will not change. Give the
  path and line for anything the reviewer would want to check.
- One reply, at most four short paragraphs. No headings, no bullet soup, no
  restating the comment.
- Keep the reviewer's terms and file names. Do not rename their concepts.
- If you cannot establish the answer from the code, say what you checked and
  what remains open. Never assert a fix that is not on the pinned commit.

## Claims

Every factual assertion in the reply becomes a claim:

```json
{"text": "<the assertion>", "evidence": "<path>:<line> or <command>"}
```

The desk starts every claim unchecked and ignores any status you add. A claim
with no evidence is a claim the human must not approve. Prefer fewer,
checkable claims over several vague ones.

## Decision

Set a proposed decision, but expect the human to change it:
`fixed` (the code now does what was asked), `wont-fix` (with the reason),
`explain` (no change; the answer is the code), `needs-discussion`,
`no-reply` (the thread needs no response; the draft is one line saying why,
for the human, who closes the thread instead of sending it).

## Output

One `raw/replies.json` entry, keyed by the root comment id:

```json
{"<id>": {"ask": "<the question, in a few words>", "kind": "code|doc",
          "decision": "explain", "draft": "<reply>", "claims": [...]}}
```

Only the reply text, the decision, and the claims. No summary of your work, no
apology, no offer to do more.
