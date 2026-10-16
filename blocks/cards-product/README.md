# cards-product

Custom **cards** block. Purpose: product-cross-sell.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per product: cell1 = product image | cell2 = H3 title, tagline, Learn more + Buy links.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- One row per product. Cell order does not matter: an image-only cell is the product image;
  the other cell holds the H3 name, tagline paragraph and links.
- All links in the text cell (except one inside the heading) are collected into one links row,
  in authored order, whether written in one paragraph or one per paragraph. Button styling that
  `decorateButtons` adds to lone links is removed so every card's links match. The first link
  gets `cards-product-link-primary`, the rest `cards-product-link-secondary`.
- Text renders on top, the product cut-out below. A card without an image renders text only.
- Layout: 1 column on mobile, 2 x 2 grid from 600px.
- Shared content: the block lives in `/fragments/surface/explore-surface`, which is reused
  across Surface pages. Keep page-specific copy out of it.
