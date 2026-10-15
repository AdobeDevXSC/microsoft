# accordion-faq

Custom **accordion** block. Purpose: faq.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per item: cell1 = question | cell2 = answer rich text.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- One row per question: question cell | answer cell (paragraphs, lists, bold, links). A
  single-cell row uses its first paragraph/heading as the question and the rest as the answer.
  Empty rows are dropped.
- Built on native `<details>`/`<summary>`, so items are keyboard operable and work without JS
  styling. All items start collapsed.
- With two or more items the block adds **Expand all** / **Collapse all** buttons above the
  list; each is disabled when it would do nothing. The "Frequently asked questions" heading is
  default content above the block.
- SEO: the block writes schema.org `FAQPage` JSON-LD
  (`<script type="application/ld+json" id="accordion-faq-jsonld">`) into `<head>` from the
  question text and plain-text answers. Only one script is created per page; a second
  accordion-faq block adds its questions to it (duplicates by question text are skipped).
