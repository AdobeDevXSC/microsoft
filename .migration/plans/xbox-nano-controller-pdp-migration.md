# Xbox Nano Controller Product Page Migration Plan (Commerce Connector)

## Status
- **The commerce add-on is on.** Its tools are now available in this session.
- **The commerce connector note is saved.** Future work on this site will assume product pages get their data from the commerce backend.
- **Next:** run the commerce page migration for the Xbox Nano Controller page.

## Goal
Add the Microsoft Store product page for the **Xbox Nano Controller** (https://www.microsoft.com/en-us/d/xbox-nano-controller/8wg5vqp0x4g3) to the site as a new page that uses the commerce connector. The product data loads at runtime from the Adobe Commerce catalog and isn't copied in as static content:
- title
- price
- gallery
- color options
- stock
- add to cart

The page document itself only holds block settings (for example, which product to show). The surrounding layout and styling should match the original. The Surface Laptop Ultra page, header and footer stay as they are.

## How the commerce workflow runs
1. **Start the commerce migration.** It scrapes the Xbox page, which is likely bot-protected, so it may use the fallback fetch. Then it classifies the page.
2. **Classify the page type.** The page should come out as a **PDP** (product detail page). If it's classified differently, I'll stop and check with you.
3. **Run the product page migration.**
   - Detect the page's blocks in two passes: commerce blocks such as product details, gallery, price, options, add to cart and recommendations, then content blocks.
   - Map each one to its Edge Delivery commerce equivalent.
   - Generate the commerce template settings and import script.
4. **Import the content.** This creates a thin product page document that references the product. It doesn't copy product data.
5. **Check the commerce connection.** Confirm the product page can reach the Adobe Commerce catalog and find this product. If the store endpoint, environment or product SKU isn't set up yet, I'll ask you for it instead of guessing.
6. **Style it.**
   - Extract the source design tokens: fonts, colors, spacing, buttons, swatches, price and rating styling.
   - Style the commerce blocks to match.
   - Scope any shared-style changes so the Surface page isn't affected.
7. **Run a visual check.** Compare the preview with the original on desktop and mobile, section by section, and fix any differences.

## Expected page areas (to be confirmed by block detection)
| Area | Handling |
|---|---|
| Gallery, title, rating, price, color swatches, quantity, Add to cart | Commerce product details (runtime data) |
| Description and highlights | Commerce product attributes, or authored content if they're not in the catalog |
| Tech specs | Commerce attributes or the existing `table-specs` block |
| Related or recommended products | Commerce recommendations if the connector supports them, otherwise reported as left out |
| Marketing sections and footnotes | Existing content blocks (`cards-product`, `columns-features`, `footnotes`) where they fit |

## Constraints
- **Changes stay local.** Work happens in the local workspace and preview only. Nothing is uploaded to Document Authoring, previewed or published unless you ask for it.
- **The existing uncommitted code change stays as it is.** It is in the site's main script and won't be overwritten or reverted. Any commerce setup will be added next to it.
- **The Surface page shouldn't change.** It and its import setup stay unchanged, and it will be rechecked at the end.
- **The vendored core library isn't edited.**

## Checklist
- [x] Turn on the commerce add-on for this project
- [x] Save a project note that this site uses the commerce connector
- [ ] Start the commerce migration for the Xbox Nano Controller URL: scrape and classify
- [ ] Confirm the page is classified as a product detail page (PDP)
- [ ] Run the product page migration: two-pass block detection, then map blocks to commerce equivalents
- [ ] Generate the commerce template settings and import script
- [ ] Import the page as a thin product page document that references the product
- [ ] Confirm the commerce catalog connection (store endpoint, environment, product SKU), asking you if anything is missing
- [ ] Check that the product data (gallery, title, price, options, add to cart) loads in the preview
- [ ] Extract the source design tokens and style the commerce blocks and any content blocks to match the original
- [ ] Compare the preview with the original on desktop and mobile, and fix any differences
- [ ] Recheck the Surface Laptop Ultra page, header and footer for unintended changes
- [ ] Summarize what changed (local workspace only) and any commerce features that aren't available

> Execution requires Execute mode.
