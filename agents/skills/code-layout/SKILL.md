---
name: code-layout
description: >
  Where things go inside a function body: define each binding next to its first
  use, and inline single-use values unless naming one earns its keep.
  TRIGGER when writing or restructuring the body of a function, in any language.
  DO NOT TRIGGER for module/file organisation, import ordering, or naming
  conventions.
---

# Code Layout

## Variable locality

Define variables as close as possible to their first use. A binding whose value
is not consumed until many lines later belongs on the line above its consumer,
not at the top of the function.

Group related setup so several bindings feeding the same downstream call sit
adjacent and just above it.

## Inline single-use values

Inline a single-use value unless naming it earns its keep:

- the value is used twice or more,
- naming it makes a long line fit the width, or
- the expression is complex enough that a name aids comprehension.
