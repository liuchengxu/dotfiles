## Part A — General rules (every doc)

### 0. Identify reader, purpose, and next action

Before reviewing prose, name the intended reader and the intended use
or next action they should be able to take after reading. A doc that is clear for auditors
may be too slow for operators; a doc that is concise for maintainers
may be underspecified for new contributors.

Choose the smallest artifact that supports that use: an update to its existing
home, a short message, or a document when needed. Do not generate a new guide,
companion summary, or catalog merely because the model can. Put the actionable
core first; keep necessary reference depth separately without duplicating it.
For a scope/handoff note, prefer one short description per change plus source
links. A linked commit is navigation, not a limit on the whole change to review.
Operational guides still keep prerequisites, failure handling, and evidence.

Apply the cold-reader test before compression: the reader has the doc
and linked sources, not the session. Expand session shorthand, define
unfamiliar terms near first use, and state the current source/state the
prose depends on.

### 1. One source of truth per fact

If a fact appears in the preamble, §1, and §2 intro — cut two. Keep
the fact in the narrowest authoritative section that owns it;
elsewhere, delete it or replace it with a cross-reference when readers
need navigation. Each restatement erodes signal and creates drift risk
when facts change.

### 2. No re-explanation of self-explanatory output

If a code block prints three labelled fields, do not follow with a
bullet list saying "field1 means X, field2 means Y". The reader can
read.

### 3. No filler meta-references

Drop "as stated above", "i.e. the goal from the top", and local
cross-references that only compensate for scattered structure. Inside
one doc, the reader usually has the context. Filler meta-refs read like
footnotes from an academic paper.

Keep only cross-references that prevent duplication or send the reader
to a different artifact that is genuinely authoritative.

### 4. Section intros are one sentence

A multi-paragraph intro almost always splits into three different
ideas. Move them into the section body or cut the redundant ones.

### 5. Consistency: terminology, casing, naming

- Before drafting or reviewing project docs, locate the glossary and the
  authoritative specifications through the documentation index or contribution
  guide. Read the definitions relevant to the changed text. If no glossary
  exists, use the owning specs and established usage; do not invent one.
- Check meaning, not just spelling. Use the defined term for each concept and
  preserve distinctions between related concepts. Do not replace precise terms
  with broad synonyms or force terms from different domains to mean the same thing.
- Use `rg` to search the document's key terms, aliases, and proposed names across
  repository docs. Inspect matches in the glossary, owning specs, and related
  documents for conflicting meanings or requirements. A matching word alone
  does not establish consistency. Follow explicit links into other repositories
  only when the document depends on their contracts.
- Distinguish current behavior, proposed changes, and historical descriptions.
  A proposed term or changed meaning needs an explicit definition and an
  identified owner. Do not silently change a glossary to make a draft agree.
- Fix in-scope conflicts when edits are authorized. Report conflicting source
  definitions and out-of-scope inconsistencies with both locations; do not
  rename terms across the repository without authorization. State the coverage
  checked rather than claiming global consistency from a partial search.
- Keep one name per concept and consistent casing within the document. Preserve
  literal code identifiers and quoted or historical names where accuracy requires them.

### 6. Compression preserves semantic force

Clarity, simplification, compression, and synthesis must not silently
change a claim or requirement.

- **Calibrated qualifiers**: preserve language that encodes
  uncertainty, scope, conditions, attribution, causality, or
  verification status ("I have not verified X", "probably, because
  Y"). Delete a hedge only when its removal changes neither the
  proposition nor the reader's warranted confidence.
- **Requirement force**: preserve distinctions among optional,
  recommended, required, and prohibited behavior. When a document
  adopts BCP 14 (RFC 2119/8174), never add, remove, recase, or
  substitute a normative keyword as an editorial change; flag an
  intended requirement change for substantive review.
- **Deletion candidates**: empty hedges ("you may want to", "if
  useful"), self-referential commentary ("this section discusses X"
  before discussing X), and a goal restated in the section that
  fulfills it. Do not assume discretion language is empty merely
  because it is indirect.

### 7. Simpler language

Prefer the common word: "use" over "utilize", "before" over "prior
to", "now" over "at this point in time". Jargon only when it's the
*precise* term the audience already uses — never as a status signal.

Write prose in the ASD-STE100 (Simplified Technical English) register
(the user may call it "AED-1000"):

- Short sentences, ~20-25 words at most; one idea per sentence.
- Active voice with a named actor.
- Split chains joined by colons, semicolons, or dashes into separate
  sentences.
- Unpack noun clusters and nominalizations ("the retirement of the
  VK" → "the VK is retired").
- Keep precise domain terms and full requirement force; the register
  never overrides rule 6.

#### State the direct effect

In change summaries and explanations, state what changes and what it directly
affects. Keep intermediate steps when they help the reader understand the
cause, make a decision, or perform an action. Do not make a required action
sound automatic or remove a condition the reader still needs. Apply section 6.

Example in a dependency overview:

- Before: “To use the new child VK, rebuild `eth-aggregation` with that key.
  The rebuilt circuit then has a different Circuit VK.”
- After: “Rebuilding `eth-aggregation` with the new child VK changes its
  Circuit VK.”

In a runbook, keep the rebuild command and verification steps. Shorter text
is useful only when the reader can still understand or perform the same task.

### 8. Avoid low-value scaffolding

- Don't write "Note:" prefixes for asides that aren't surprising.
- Don't repeat what well-named identifiers already say
  (`fn parse_vk_hash`'s docstring doesn't need to say "parses a VK
  hash").
- Don't add "Background", "Overview", or "Introduction" sections
  whose content the preamble already covered.

### 9. Final pass (do this last)

- Can a new reader identify the change, its direct effect, and any conditions
  or required actions?
- Re-read the preamble alongside §1's first paragraph. Same idea
  twice? Cut one.
- Recheck changed terms against the glossary and related docs as in §5.
  Old terms should remain only where explicitly needed for aliases, migration,
  quotations, or history.
- Verify command names, flags, config keys, file paths, and linked
  docs against the repo when the source is available. Mark anything
  unverified instead of smoothing over it.
- Count "as stated" / "described above" / "i.e." occurrences. Most
  are deletable.
- Read every command block / example as if the reader has never seen
  it. If the reader would want context, add one sentence; if it's
  obvious, leave it bare.

