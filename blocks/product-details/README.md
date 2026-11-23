# Product Details

Renders a product detail page from Adobe Commerce Optimizer with the `@dropins/storefront-pdp` drop-in.

## Authoring
Add an empty `Product Details` block to `/products/default`. In the site config, map the folder `/products/` to `/products/default`. Product URLs then follow `/products/{urlKey}/{sku}`, for example `/products/xbox-nano-controller/xbox-nano-controller`.

You can also set a `sku` page-metadata value to pin a page to one product.

## Behaviour
- Shows the gallery, title, price, short description, options, overview and specifications.
- No cart. **Buy on Microsoft Store** links to `https://www.microsoft.com/en-us/d/{urlKey}/{microsoft-store-product-id}`, built from the product's `externalIds`. The button is hidden if there's no store id.
- Writes JSON-LD and the OG/product meta tags.
- Unknown SKUs redirect to `/notfound`.
