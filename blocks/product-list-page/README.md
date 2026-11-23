# Product List Page

Search results or a category listing from Adobe Commerce Optimizer (`@dropins/storefront-product-discovery`).

## Authoring
| Product List Page |  |
|---|---|
| urlpath | `xbox/accessories` (optional; category mode) |
| pagesize | `12` (optional) |

Without `urlpath` it acts as a search page and reads `?q=`, `?page=`, `?sort=` and `?filter=` from the URL.

Each product card links to its PDP (`/products/{urlKey}/{sku}`). There's no add-to-cart.
