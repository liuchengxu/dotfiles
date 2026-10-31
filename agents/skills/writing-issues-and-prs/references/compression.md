## Compression pass

Check section ownership before shortening: Why states the current problem,
value, and any real timing trigger; What states the resulting behavior,
structure, or mechanism; How states what the reader must do about it. Move
implementation explanations out of Why, and delete
them there when What already covers them. A brief approach reference
may be needed to explain its value, but do not repeat the solution inventory.
Read Why, What, and How together to catch duplication across the boundaries:
an outcome belongs in What, and the step that adopts it belongs in How.

Before posting, delete any sentence that only restates the title,
repeats the diff, or says the work is straightforward. Keep details
that change a review, implementation, or release decision.

Prefer essence over mechanical inventory: omit file lists and implementation
details that do not change a review decision. Do not hide the semantic
inventory a maintainer must assess. New or changed schema fields, limits,
digest inputs, validation order, role ownership, trust assumptions, public
boundaries, and deliberately duplicated or shared helpers belong in the body
when they define the contract under review.

After a material edit, re-read the whole body for shape, not just the
sentence you touched — incremental edits erode structure, and a change
that adds a second review unit can turn a prose paragraph into bullets.
After a semantic force-push or a change to a stacked design, rebuild the body
from the current base-to-head diff and re-read every affected stack body rather
than patching one stale sentence.

