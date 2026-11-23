import { createAcoClient, readData, sendInBatches } from './utils.js';

const client = createAcoClient();

// Order matters: metadata before products, price books before prices.
const steps = [
  ['Metadata', 'metadata.json', (b) => client.createProductMetadata(b)],
  ['Categories', 'categories.json', (b) => client.createCategories(b)],
  ['Products', 'products.json', (b) => client.createProducts(b)],
  ['Price books', 'pricebooks.json', (b) => client.createPriceBooks(b)],
  ['Prices', 'prices.json', (b) => client.createPrices(b)],
];

// Run steps sequentially; keep going after a failure but exit non-zero.
const ok = await steps.reduce(async (prev, [label, file, send]) => {
  const prevOk = await prev;
  return (await sendInBatches(label, readData(file), send)) && prevOk;
}, Promise.resolve(true));
process.exitCode = ok ? 0 : 1;
