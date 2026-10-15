# table-specs

Custom **table** block. Purpose: tech-specs.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: 2 columns per row: category label | values (paragraphs / list with <sup> footnote links).

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Lives in its own fragment, `/fragments/surface-laptop-ultra/specs` (heading "Explore what's
  inside" and the intro paragraph are default content above the block).
- One row per spec category: label cell | values cell (paragraphs or a list; `<sup>` links to
  `#footnote-N` allowed). Rendered as a `<table>` with `<th scope="row">` labels.
- A row with a single cell renders as a full-width group row; extra cells become extra value
  columns; empty rows are dropped.
- Mobile: label stacked above values. 900px+: label column (30%) | values column.
- **The dialog opener is handled separately.** On the source, the "Get details" button in the
  #specs section opens this sheet in a modal dialog. This block is only the plain renderer; it
  does not create a button, dialog or any open/close behaviour. Wire the opener (e.g. a link to
  the specs fragment intercepted by a modal helper) outside this block.
