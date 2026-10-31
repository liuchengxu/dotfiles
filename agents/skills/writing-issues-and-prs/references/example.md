## One example

**Before (robotic, verbose):**

> ## Summary
> This pull request introduces a number of changes in order to improve
> the prover worker. It should be noted that the worker previously did
> not handle the case where the cursor was missing. Various refactors
> were also performed.
>
> ## Changes
> - Modified prover.rs
> - Modified db.rs
> - Added a test

**After (tiny single-purpose PR — short-prose exception):**

One startup failure, one causal fix, and one regression check make this a
single review unit whose intent and evidence fit in a short body.

> The prover worker crashed on startup when no cursor existed yet,
> blocking the first proving run on a fresh DB. It now resolves the
> cursor from genesis instead of unwrapping.
>
> `ProverWorker::resolve_cursor` now handles the empty-cursor case; the
> DB accessor only exposes the genesis fallback that path needs. Covered
> by a new `fresh_db_starts_from_genesis` test.

**What section (several independent review units):**

> This PR closes three independently reviewable gaps in how the upload
> endpoint authenticates callers.
>
> - Tokens are now bound to the issuing tenant, so a token minted for one
>   tenant can't be replayed against another.
> - Expired tokens are rejected before the body is parsed, not after, so
>   a large payload can't tie up a worker on an already-dead token.
> - The signing key is read from the sealed config at boot instead of the
>   mutable runtime store, matching the endpoint's trust boundary.

Each bullet protects a different invariant, reads alone, and could be its
own PR — that earns the bullet form. A single unit uses prose within its
section; the template still applies unless the short-PR exception fits.

**Content example (trust-boundary refactor; organize under the PR template):**

> The deployment tool currently fetches a release manifest and validates it in
> one operation. A later audit path must apply the same rules to a supplied
> manifest; implementing a second validator would let the two paths drift.
>
> - Before this PR, decoding, evidence acquisition, and validation are one
>   operation.
> - This PR separates those stages while preserving the connected entry point
>   and acceptance behavior.
> - The downstream PR can supply a manifest to the same validator without
>   importing the network client.
>
> This does not prove that a supplied manifest is the latest published version;
> connected deployment still owns that check. `supplied_manifest_matches_live`
> covers validation equivalence, while `stale_manifest_is_not_current` pins the
> residual boundary.

