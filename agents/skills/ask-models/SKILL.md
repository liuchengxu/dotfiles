---
name: ask-models
description: >
  Ask one or more named models (for example Astra, Kimi, GLM, Opus) for an opinion or a review through Pi or the Claude Code CLI, then adjudicate their answers. Use for "ask astra", "consult kimi and glm", "let the models review this", or a blind review of a pinned commit. Not for a review you do yourself (use adversarial-review).
---

# Ask models

Other models find what you miss, but their answers are advice, not authority.
Send each the same question, read what comes back against the source, and give
your own verdict.

## Models

| Name | Runner | Model |
|---|---|---|
| astra | Pi | `openai-codex/gpt-6-astra` |
| kimi | Pi | `kimi-coding/k3.1-pro` |
| glm | Pi | `zai/glm-5.3` |
| opus, sonnet, fable, haiku | Claude Code CLI | the same alias, for example `opus` |

Run Claude models through the Claude Code CLI, not Pi. For a name the table
does not list, find the Pi id with `pi --list-models | grep -i <name>`. When the
user names a thinking level, add `:<thinking>` to a Pi id, or pass
`--effort <level>` to Claude. If a name does not resolve, or a run's log says
the id was not recognized, say so; never substitute another model.

## Prepare

- Make one session folder by the "Session files" rule for the prompt, the
  answers, and the logs. The copies of the material are throwaway; they may go
  in the temp directory.
- Give each model its own disposable copy of the material: a fresh clone or a
  copied folder, never the working checkout. Reviewers get full tools, so they
  can build, run tests, and read dependencies; a copy keeps their edits and
  build output away from your work.
- For a blind review, make a fresh repository that holds only the reviewed base
  and head commits, and supply the PR text as it was at review time, so no
  later fix or comment leaks in.
- Write one self-contained prompt file: the context, where the material is, the
  exact questions, a length cap, and "mark claims you did not verify". Give
  every model the same prompt.

## Run

Run each model as its own background command, so one slow model does not hold
up the others:

```bash
cd <copy> && pi -p --no-session --model <provider>/<id> \
  "$(cat <folder>/prompt.md)" < /dev/null > <folder>/<name>.md 2> <folder>/<name>.log
```

For a Claude model:

```bash
cd <copy> && claude -p --no-session-persistence --model <alias> \
  --allowedTools "Read Grep Glob Bash WebFetch WebSearch" \
  < <folder>/prompt.md > <folder>/<name>.md 2> <folder>/<name>.log
```

`--allowedTools` takes a list, so the prompt goes on stdin; as an argument
after it, the prompt is read as a tool name.

- `< /dev/null` is required: without it, Pi waits on stdin and never answers.
- Reviewers get full tools: Pi has no `--tools` flag, and Claude's allowed
  tools include the shell.
- An empty output file means the model failed. Check its log, and rerun it or
  report it as failed.

## Adjudicate

- Read the code or text each claim cites before you accept it. A model can cite
  a line that does not say what it claims.
- Keep a point that only one model raised if the source supports it. Agreement
  between models is not proof; they can share a blind spot.
- Report a failed model as failed. Never fill in its answer.
- Where you disagree with a model, say so and give the reason.

## Report

Use this shape, so answers from several models line up:

```
Verdict: <your conclusion and its main reason>

<name> (<exact id>): <one-line summary>
  - <point>: adopted | rejected (<why>) | open
<next model, the same way>

Full answers: <folder>
```

A failed model gets one line: `<name> (<exact id>): failed, <reason>`.
