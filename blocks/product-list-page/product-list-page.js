import SearchResults from '@dropins/storefront-product-discovery/containers/SearchResults.js';
import Facets from '@dropins/storefront-product-discovery/containers/Facets.js';
import SortBy from '@dropins/storefront-product-discovery/containers/SortBy.js';
import Pagination from '@dropins/storefront-product-discovery/containers/Pagination.js';
import { render as provider } from '@dropins/storefront-product-discovery/render.js';
import { search } from '@dropins/storefront-product-discovery/api.js';
import { Button, Icon, provider as UI } from '@dropins/tools/components.js';
import { events } from '@dropins/tools/event-bus.js';
import { readBlockConfig } from '../../scripts/aem.js';
import { fetchPlaceholders, getProductLink } from '../../scripts/commerce.js';
import { getSearchStateFromUrl, applySearchStateToUrl } from './search-url.js';
import '../../scripts/initializers/search.js';

const VISIBILITY_FILTER = { attribute: 'visibility', in: ['Search', 'Catalog, Search'] };

export default async function decorate(block) {
  const labels = await fetchPlaceholders();
  const config = readBlockConfig(block);
  const pageSize = parseInt(config.pagesize, 10) || 12;

  const fragment = document.createRange().createContextualFragment(`
    <div class="search__wrapper">
      <div class="search__result-info" role="status" aria-live="polite"></div>
      <div class="search__view-facets"></div>
      <div class="search__facets"></div>
      <div class="search__product-sort"></div>
      <div class="search__product-list"></div>
      <div class="search__pagination"></div>
    </div>
  `);

  const $resultInfo = fragment.querySelector('.search__result-info');
  const $viewFacets = fragment.querySelector('.search__view-facets');
  const $facets = fragment.querySelector('.search__facets');
  const $productSort = fragment.querySelector('.search__product-sort');
  const $productList = fragment.querySelector('.search__product-list');
  const $pagination = fragment.querySelector('.search__pagination');

  block.replaceChildren(fragment);
  if (config.urlpath) block.dataset.urlpath = config.urlpath;

  const searchState = getSearchStateFromUrl(new URL(window.location.href));
  const userFilters = searchState.filter.filter((f) => f.attribute !== 'visibility');

  const normalizedUrl = new URL(window.location.href);
  applySearchStateToUrl(normalizedUrl, searchState);
  window.history.replaceState({}, '', normalizedUrl.toString());

  // category pages list everything in `urlpath`; search pages use the `q` phrase
  const request = config.urlpath
    ? {
      phrase: '',
      sort: searchState.sort?.length ? searchState.sort : [{ attribute: 'position', direction: 'DESC' }],
      filter: [{ attribute: 'categoryPath', eq: config.urlpath }, VISIBILITY_FILTER, ...userFilters],
    }
    : {
      phrase: searchState.phrase,
      sort: searchState.sort,
      filter: [VISIBILITY_FILTER, ...userFilters],
    };

  await search({ ...request, currentPage: searchState.currentPage, pageSize })
    // eslint-disable-next-line no-console
    .catch((e) => console.error('Error searching for products', e));

  await Promise.all([
    provider.render(SortBy, {})($productSort),
    provider.render(Pagination, {
      onPageChange: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    })($pagination),
    UI.render(Button, {
      children: labels.Global?.Filters || 'Filters',
      icon: Icon({ source: 'Burger' }),
      variant: 'secondary',
      onClick: () => $facets.classList.toggle('search__facets--visible'),
    })($viewFacets),
    provider.render(Facets, {})($facets),
    provider.render(SearchResults, {
      routeProduct: (product) => getProductLink(product.urlKey, product.sku),
      slots: {
        ProductActions: (ctx) => {
          const link = document.createElement('a');
          link.className = 'product-list-page__details';
          link.href = getProductLink(ctx.product.urlKey, ctx.product.sku);
          link.textContent = labels.Custom?.ViewDetails || 'View details';
          link.setAttribute('aria-label', `${link.textContent}: ${ctx.product.name || ctx.product.sku}`);
          ctx.replaceWith(link);
        },
      },
    })($productList),
  ]);

  events.on('search/result', (payload) => {
    const totalCount = payload.result?.totalCount || 0;
    block.classList.toggle('product-list-page--empty', totalCount === 0);

    const strong = document.createElement('strong');
    strong.textContent = `"${payload.request?.phrase}"`;
    $resultInfo.replaceChildren(
      `${totalCount} result${totalCount === 1 ? '' : 's'}`,
      ...(payload.request?.phrase ? [' for ', strong] : []),
    );

    const button = $viewFacets.querySelector('button');
    const filterCount = payload.request?.filter?.length || 0;
    if (filterCount) button?.setAttribute('data-count', filterCount);
    else button?.removeAttribute('data-count');
  }, { eager: true });

  events.on('search/result', (payload) => {
    const url = new URL(window.location.href);
    applySearchStateToUrl(url, payload.request);
    window.history.pushState({}, '', url.toString());
  }, { eager: false });
}
