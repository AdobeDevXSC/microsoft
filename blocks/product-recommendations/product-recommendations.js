import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import ProductList from '@dropins/storefront-recommendations/containers/ProductList.js';
import { render as provider } from '@dropins/storefront-recommendations/render.js';
import { readBlockConfig } from '../../scripts/aem.js';
import { getProductLink, getProductSku } from '../../scripts/commerce.js';
import '../../scripts/initializers/recommendations.js';

async function renderRecommendations(block, { recid, currentsku, currentprice }) {
  const $list = document.createElement('div');
  $list.className = 'product-recommendations__list';
  block.replaceChildren($list);

  const sku = currentsku || getProductSku();
  const isACO = String(getConfigValue('adobe-commerce-optimizer')) === 'true';
  const price = isACO && currentprice ? Number(currentprice) : undefined;

  try {
    await provider.render(ProductList, {
      recId: recid,
      routeProduct: (item) => getProductLink(item.urlKey, item.sku),
      currentProduct: sku ? { sku, ...(price !== undefined && { price }) } : undefined,
    })($list);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Unable to load recommendations', e);
    block.hidden = true;
  }
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  [...block.children].forEach((row) => { row.hidden = true; });

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      renderRecommendations(block, config);
    }
  }, { rootMargin: '200px' });
  observer.observe(block);
}
