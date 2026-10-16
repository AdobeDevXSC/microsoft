# columns-features

Custom **columns** block. Purpose: feature-list.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, 3 cells: H3 + paragraph with <sup> footnote link.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- One row with one cell per column (as on the source), or one row per column - both work.
  Empty cells are dropped.
- Layout: 1 column on mobile, 2 at 600px, and at 900px one column per cell (up to 4).
- Author the column titles as H3. Footnote markers are `<sup>` links to `#footnote-N`
  (resolved by the `footnotes` block, loaded via lazy fragments if needed).
