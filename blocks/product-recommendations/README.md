# Product Recommendations

Shows an Adobe Commerce Optimizer recommendation unit (`@dropins/storefront-recommendations`).

## Authoring
| Product Recommendations |  |
|---|---|
| recid | the recommendation unit ID from the ACO admin (required) |
| currentsku | optional; on a PDP the SKU is detected automatically |
| currentprice | optional |

Rendering waits until the block scrolls into view. If the unit can't load, the block hides itself.

**Note:** create the recommendation unit in ACO first. With a small catalog it can return no results.
