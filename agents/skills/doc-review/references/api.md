### B.4 Code / API reference

The genre: documents a unit of code so a caller can use it correctly.

- **Signature → contract → example → edge cases.** In that order.
- **Document invariants, not implementations.** "Returns sorted in
  ascending order" beats "uses quicksort internally".
- **Edge cases are part of the contract.** Null inputs, empty
  collections, error returns — name them.
- **Examples should be copy-pastable.** No `...` placeholders, no
  pseudo-code where real code fits.

