# hero-product

Custom **hero** block. Purpose: product-hero.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: row1: poster image + desktop MP4 link + mobile MP4 link | row2: promo link | row3: H1, display line (p strong or H2), description, product name, price, Pre-order link.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Rows are recognised by content, not position: the row with an image or MP4 links is the media,
  a row with a single link is the promo strip, and the row with the H1 is the content.
- Media: the poster image stays the LCP element (`loading="eager"`, `fetchpriority="high"`); MP4 links
  (desktop first, mobile second) are turned into a background video by `/scripts/video.js`
  (`buildVideo`), which plays only while in view and respects reduced motion.
- Content: the element after the H1 gets `.hero-product-display`. The paragraph with a price
  (e.g. `$2,599.99`), the short paragraph right before it (product name) and the last link-only
  paragraph after it (CTA, e.g. **Pre-order**) move into `.hero-product-buy`.
- Keep this block in the first section of the page so its poster is the first image.
