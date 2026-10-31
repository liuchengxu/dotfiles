---
name: ask-models
description: >
  Ask one or more named models (for example Astra, Kimi, GLM) for an opinion or a review through Pi, then adjudicate their answers. Use for "ask astra", "consult kimi and glm", "let the models review this", or a blind review of a pinned commit. Not for a review you do yourself (use adversarial-review).
---

# Ask models

Other models find what you miss, but their answers are advice, not authority.
Send each the same question, read what comes back against the source, and give
your own verdict.

## Models

| Name | Pi model id |
|---|---|
| astra | `openai-codex/gpt-6-astra` |
| kimi | `kimi-coding/k3.1-pro` |
| glm | `zai/glm-5.3` |

Use the table. For a name it does not list, find the id with
`pi --list-models | grep -i <name>`. Add `:<thinking>` only when the user names
a level. If a name does not resolve, or a run's log says the id was not
recognized, say so; never substitute another model.

## Prepare

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
  "$(cat <prompt.md>)" < /dev/null > <name>.md 2> <name>.log
```

- `< /dev/null` is required: without it, Pi waits on stdin and never answers.
- No `--tools` flag: the model gets all of Pi's tools, including the shell.
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

Lead with your verdict. Then, for each model, its exact id, a one-line
summary, and the points that matter, attributed to it. Say which points you
adopt, which you reject and why, and which remain open. Give the folder path so
the user can read the full answers.
