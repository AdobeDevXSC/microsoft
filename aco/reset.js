import { createAcoClient, readData, sendInBatches } from './utils.js';

const client = createAcoClient();

// Deletes only the entities defined in ./data, in reverse dependency order.
const steps = [
  ['Prices', readData('prices.json').map(({ sku, priceBookId }) => ({ sku, priceBookId })), (b) => client.deletePrices(b)],
  ['Price books', readData('pricebooks.json').map(({ priceBookId }) => ({ priceBookId })), (b) => client.deletePriceBooks(b)],
  ['Products', readData('products.json').map(({ sku, source }) => ({ sku, source })), (b) => client.deleteProducts(b)],
  ['Categories', readData('categories.json').map(({ slug, source }) => ({ slug, source })), (b) => client.deleteCategories(b)],
  ['Metadata', readData('metadata.json').map(({ code, source }) => ({ code, source })), (b) => client.deleteProductMetadata(b)],
];

const ok = await steps.reduce(async (prev, [label, items, send]) => {
  const prevOk = await prev;
  return (await sendInBatches(label, items, send)) && prevOk;
}, Promise.resolve(true));
process.exitCode = ok ? 0 : 1;
