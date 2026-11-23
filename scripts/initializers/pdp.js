import { initializers } from '@dropins/tools/initializer.js';
import { initialize, setEndpoint, fetchProductData } from '@dropins/storefront-pdp/api.js';
import initializeDropin from './index.js';
import {
  CS_FETCH_GRAPHQL,
  fetchPlaceholders,
  getOptionsUIDsFromUrl,
  getProductSku,
  loadErrorPage,
  preloadFile,
} from '../commerce.js';

// eslint-disable-next-line import/prefer-default-export
export const IMAGES_SIZES = {
  width: 960,
  height: 960,
};

await initializeDropin(async () => {
  setEndpoint(CS_FETCH_GRAPHQL);

  ['api', 'render', 'containers/ProductHeader', 'containers/ProductPrice', 'containers/ProductGallery']
    .forEach((file) => preloadFile(`/scripts/__dropins__/storefront-pdp/${file}.js`, 'script'));

  const sku = getProductSku();
  const optionsUIDs = getOptionsUIDsFromUrl();
  if (!sku) {
    loadErrorPage();
    return undefined;
  }

  const [product, labels] = await Promise.all([
    fetchProductData(sku, { optionsUIDs, skipTransform: true }),
    fetchPlaceholders('placeholders/pdp.json'),
  ]);

  if (!product?.sku) {
    loadErrorPage();
    return undefined;
  }

  return initializers.mountImmediately(initialize, {
    sku,
    optionsUIDs,
    langDefinitions: { default: { ...labels } },
    models: { ProductDetails: { initialData: { ...product } } },
    acdl: true,
    persistURLParams: true,
  });
})();
