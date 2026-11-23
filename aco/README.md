# ACO catalog ingestion

Loads Microsoft Store product data from `data/` into Adobe Commerce Optimizer (ACO) using the
[Commerce Optimizer SDK](https://github.com/adobe-commerce/aco-ts-sdk). Based on
[aco-sample-catalog-data-ingestion](https://github.com/adobe-commerce/aco-sample-catalog-data-ingestion).

This folder is excluded from the EDS site via `.hlxignore`.

## Data

| File | Contents |
|---|---|
| `data/metadata.json` | Product attribute definitions (must exist before products reference them) |
| `data/categories.json` | Category tree (`xbox` > `xbox/accessories` > `xbox/accessories/controllers`) |
| `data/products.json` | Products |
| `data/pricebooks.json` | Price books (`main`, USD) |
| `data/prices.json` | Prices per SKU per price book |

## Credentials

| Variable | Where to get it |
|---|---|
| `TENANT_ID`, `REGION`, `ENVIRONMENT` | [Experience Cloud](https://experience.adobe.com/) > Commerce > Commerce Cloud Manager > info icon next to the instance. The catalog endpoint is `https://{REGION}-{ENVIRONMENT}.api.commerce.adobe.com/{TENANT_ID}/v1/catalog`. |
| `CLIENT_ID`, `CLIENT_SECRET` | [Adobe Developer Console](https://developer.adobe.com/console) > create a project > add the **Adobe Commerce Optimizer Ingestion** API with the **Default - Cloud Manager** profile > **OAuth Server-to-Server** credential. Requires developer or system admin access to the ACO project. |

```shell
cp .env.dist .env   # then fill in the values; .env is git-ignored
```

## Run

Requires Node.js 20.14+.

```shell
cd aco
npm install
npm run ingest   # create metadata, categories, products, price books, prices
npm run reset    # delete only the entities defined in data/
```

Ingestion is asynchronous: a `200` response with `acceptedCount` means the items were queued.
Verify in the ACO UI or via the Merchandising GraphQL API. Next step after ingesting is to create a
catalog view and policies in ACO that use the `main` price book.
