# footnotes

Custom **footnotes** block. Purpose: legal-footnotes.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per footnote: cell1 = marker (*, 1..32) | cell2 = rich text. Alternative: authored as an ordered list with the block adding ids.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Authoring, either form:
  - one row per footnote: marker cell (`*`, `1`, `[2]` ...) | text cell, or
  - one cell holding an ordered list (numbered from the list's `start`, honouring `value`).
  A single-cell row may also begin with its marker, e.g. `[3] Battery life ...`.
- Each item gets `id="footnote-N"`; the `*` note gets `id="footnote-star"`. Reference links
  elsewhere must use `#footnote-N` / `#footnote-star` (the source's `#footnote-*` must be
  rewritten to `#footnote-star` on import). If an id already exists on the page it is not
  duplicated.
- The `[N]` marker is a back link: it returns to `#ref-N` if such an element exists, otherwise
  to the first link on the page pointing at that footnote.
- The block lives in the lazily loaded `/fragments/surface-laptop-ultra/legal` fragment.
  `scripts/lazy-fragments.js` intercepts `#footnote-N` clicks while fragments are still pending
  and loads up to the target before scrolling, so links resolve before the legal fragment loads.
- The "Screens simulated..." disclaimer is default content above the block.
