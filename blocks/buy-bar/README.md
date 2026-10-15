# buy-bar

Custom **buy-bar** block. Purpose: floating-buy-cta.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: single row: product name | price | Pre-order link.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Content: one row with product name | price | CTA link (e.g. Pre-order). Cells or paragraphs
  in any order: the first link is the CTA, the first text containing a currency amount is the
  price, the remaining text is the product name. Any piece may be omitted.
- Place it on the main page (e.g. at the end, in its own section). The bar is `position: fixed`;
  a section holding only the bar collapses to no height.
- Visibility: hidden while the page's first section (the hero, which has its own buy box) is in
  view, shown once it scrolls away, and hidden again while the site footer is in view so it
  never permanently covers the footer. Driven by IntersectionObserver (no layout reads during
  decoration).
- Accessibility: a labelled region (`Buy <product name>`); the CTA's accessible name includes
  the product. While hidden the block is `inert`, so it is never tabbable when invisible.
  Reduced motion removes the slide-in.
