Review the changes in this repository.

## Scope

Run `git diff` (and `git status`) to see what changed. The changed lines are the
subject of review — but a defect is often only visible from code that did NOT
change. Before judging any changed function, find its callers:

    grep -rn "<function name>" .

and read them. A changed function that looks safe in isolation is frequently
unsafe because of what an unchanged caller passes into it.

## Discipline

- A finding earns "blocking" through evidence and a labeled impact, not
  suspicion. State the concrete input or state that produces the wrong result.
- Trace what an attacker, a remote peer, or untrusted input controls.
- If something looks like a defect but is safe because of an invariant enforced
  elsewhere, put it in `dismissed` and name that invariant. Do not pad
  `findings` with things you do not believe.
- Report every file you actually read in `files_examined`, including files
  outside the diff. This is how your coverage is judged.

## Output

Return **only** a JSON object. No prose before or after it. Do not wrap it in a
markdown code fence.

Use exactly these field names — this output is merged with other reviewers'
output, and renamed fields are dropped:

    {
      "files_examined": ["src/a.rs", "src/b.rs"],
      "findings": [
        {
          "title": "one line, what is wrong",
          "file": "src/a.rs",
          "line": 42,
          "severity": "critical",
          "blocking": true,
          "failure_scenario": "concrete inputs or state that produce the wrong result",
          "evidence": "the specific code, in which files, that establishes this",
          "fix": "what to change"
        }
      ],
      "dismissed": [
        {
          "title": "what looked wrong",
          "file": "src/b.rs",
          "why_not_a_defect": "the invariant that makes it safe, and where it is enforced"
        }
      ]
    }

`severity` must be one of: `critical`, `high`, `medium`, `low`.
`blocking` is a boolean and is separate from severity: it answers whether this
must block the decision under review, not how bad it would be.

If you found nothing, return the object with empty `findings`. An empty result
is a legitimate answer; an invented one is not.
