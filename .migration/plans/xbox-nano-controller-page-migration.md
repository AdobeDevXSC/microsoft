# Xbox Nano Controller Product Page Migration Plan (Commerce Connector)

## Is the commerce add-on already on?
No, I can't see it turned on for this project yet:
- **No project setting turns it on.** I checked the project's settings and none of them switch on the commerce add-on.
- **Its tools aren't available to me in this session.** If the add-on were on, its product page and listing page tools would be in my toolset, and they aren't.
- **The site code has no commerce connector setup.** The main site script only loads the standard page, header, footer, fragments and widgets. Nothing in it loads commerce blocks, connects to a store or initializes product data.

If you turned it on somewhere else, such as Settings in the app, it may take effect from your next message. I'll check again when execution starts and skip the "turn on" step if it's already active.

## Goal
Add the Microsoft Store product page for the **Xbox Nano Controller** (https://www.microsoft.com/en-us/d/xbox-nano-controller/8wg5vqp0x4g3) to the site as a new page. The page is built for the **commerce connector**. Product data comes from the commerce backend at runtime and isn't copied in as static content:
- title
- price
- images
- color options
- stock
- add to cart

The marketing content around it is migrated as normal page content. Layout and styling should match the original. The Surface Laptop Ultra page, header and footer stay as they are.

## Decisions so far
- **Migrate the Xbox page as a new page.** Your choice; the Surface page isn't restyled.
- **It uses the commerce connector.** You confirmed this.
- **Use the commerce add-on.** You approved it. It's not active yet (see above), so it's the first step unless it's already on by then.
- **Remember the commerce connector for later.** I'll save it as a project note when execution starts, because plan mode blocks saving.

## What the source page contains (expected, to be confirmed during analysis)
| Area | Expected content | Handling |
|---|---|---|
| Product hero / buy box | Gallery, title, rating, price, color swatches, quantity, Add to cart / Buy now | **Commerce:** product details block fed by the commerce connector |
| Product overview / highlights | Short description and key features | Commerce data or authored content, depending on what the add-on finds |
| Feature and marketing sections | Media plus text rows, cards | Authored content: reuse existing blocks where they fit at least 80% |
| Tech specs | Specs table or list | Commerce attributes or the `table-specs` block, decided during classification |
| Reviews and related products | Ratings summary, recommendations | Commerce or recommendations blocks if the connector supports them; otherwise left out and reported |
| Legal and footnotes | Disclaimers | `footnotes` block |

## Approach
1. **Check the add-on and save the project note.** If the add-on is already active, go straight on. If not, turn it on and continue on your next message, once its tools are available.
2. **Classify the page.** The add-on confirms it is a product page and separates the parts that come from the commerce connector from the authored marketing content.
3. **Check the commerce connector setup.** None of it is in the site code yet, so confirm where the connector is configured: the site configuration or something the add-on sets up. Also confirm the store endpoint and the product identifier (`8wg5vqp0x4g3`). The product details block needs to load in the preview. If anything is missing, I'll ask you before going further.
4. **Analyze and map the authored sections.** Reuse existing blocks where they fit: `cards-product`, `table-specs`, `accordion-faq`, `footnotes`, `columns-features`. Create new blocks or variants only where nothing fits.
5. **Build the import and import the page.** This means a new `xbox-product-page` template, its parsers and transformers, and an import script. The product area is imported as a commerce block reference (product ID only), not as copied product data. The Surface template stays unchanged.
6. **Style it.** Extract the source design tokens (fonts, colors, spacing, buttons, swatches, price styling). Style the commerce product details block and the authored blocks to match. Existing blocks get variant styles so the Surface page doesn't change.
7. **Run a visual check.** Compare the preview with the original on desktop and mobile, section by section, and fix any differences.

## Constraints
- **Changes stay local.** Work happens in the local workspace and preview only. Nothing is uploaded to Document Authoring, previewed or published unless you ask for it.
- **The existing uncommitted code change stays as it is.** It is in the site's main script and won't be overwritten or reverted.
- **The Surface page shouldn't change.** It will be rechecked after the shared styles are updated.
- **The vendored core library isn't edited.** Commerce blocks follow the project's existing block conventions.

## Checklist
- [ ] Check whether the commerce add-on is active, and turn it on only if it isn't (approved)
- [ ] Save a project note that this site uses the commerce connector
- [ ] Classify the Xbox Nano Controller page as a product page with the commerce add-on
- [ ] Confirm where the commerce connector is configured, plus the store endpoint and product identifier
- [ ] Analyze the page: screenshots, sections, and which parts are commerce data and which are authored content
- [ ] Set up the commerce product details block (gallery, title, price, swatches, quantity, add to cart)
- [ ] Choose block variants for the authored sections, reusing existing blocks where they are at least 80% similar
- [ ] Add the `xbox-product-page` template and block/section mappings to the importer
- [ ] Generate parsers and transformers, mapping the product area to the commerce block by product ID
- [ ] Create the import script and import the page
- [ ] Check the imported content, and confirm the product data loads through the connector in the preview
- [ ] Extract the source design tokens and style the commerce and authored blocks to match the original
- [ ] Compare the preview with the original on desktop and mobile, and fix any differences
- [ ] Recheck the Surface Laptop Ultra page, header and footer for unintended changes
- [ ] Summarize what changed (local workspace only) and any commerce features that aren't available

> Execution requires switching to Execute mode.
