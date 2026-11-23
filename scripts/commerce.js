/* eslint-disable no-console */
import {
  getHeaders,
  getConfigValue,
  getRootPath,
  initializeConfig,
} from '@dropins/tools/lib/aem/configs.js';
import { events } from '@dropins/tools/event-bus.js';
import { initializers } from '@dropins/tools/initializer.js';
import { FetchGraphQL } from '@dropins/tools/fetch-graphql.js';
import { getMetadata } from './aem.js';

// Catalog Service (Adobe Commerce Optimizer) Fetch GraphQL instance
export const CS_FETCH_GRAPHQL = new FetchGraphQL();

const MS_STORE_PRODUCT_ID_ORIGIN = 'microsoft-store-product-id';

function sanitizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Preloads a file with the given type.
 * @param {string} href The URL to preload
 * @param {string} as The type of resource being preloaded
 */
export function preloadFile(href, as) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Notifies drop-ins about the current loading state (e.g. `aem/lcp`).
 * @param {string} event The loading state
 */
function notifyUI(event) {
  if (events.lastPayload(`aem/${event}`) === event) return;
  const handleEmit = () => events.emit(`aem/${event}`);
  document.addEventListener('prerenderingchange', handleEmit, { once: true });
  handleEmit();
}

function detectPageType() {
  if (document.body.querySelector('main .product-details')) return 'Product';
  if (document.body.querySelector('main .product-list-page')) return 'Category';
  return 'CMS';
}

function initializeAdobeDataLayer(pageType) {
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push({
    pageContext: { pageType, pageName: document.title },
  });
}

/**
 * Fetches the site config and caches it in session storage for two hours.
 * @returns {Promise<Object>} The config JSON
 */
export async function getConfigFromSession() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem('config'));
    if (parsed?.[':expiry'] > Math.round(Date.now() / 1000)) return parsed;
  } catch { /* fetch below */ }

  const resp = await fetch(`${window.location.origin}/config.json`);
  if (!resp.ok) throw new Error('Failed to fetch config');
  const config = await resp.json();
  config[':expiry'] = Math.round(Date.now() / 1000) + 7200;
  window.sessionStorage.setItem('config', JSON.stringify(config));
  return config;
}

/**
 * Initializes the commerce config, the GraphQL client and the global placeholders.
 */
export async function initializeCommerce() {
  initializeConfig(await getConfigFromSession());
  CS_FETCH_GRAPHQL.setEndpoint(getConfigValue('commerce-endpoint'));
  CS_FETCH_GRAPHQL.setFetchGraphQlHeaders((prev) => ({ ...prev, ...getHeaders('cs') }));
  events.enableLogger(false);
  // product images are on Microsoft's Scene7 CDN, which rejects the default `fit`/`crop` params
  initializers.setImageParamKeys({
    width: (v) => ['wid', v ? Math.round(v) : undefined],
    height: (v) => ['hei', v ? Math.round(v) : undefined],
    quality: (v) => ['qlt', v ?? 80],
    auto: () => ['fmt', 'webp'],
  });
  // eslint-disable-next-line no-use-before-define
  await fetchPlaceholders('placeholders/global.json');
}

/**
 * Sets up the data layer and tells the drop-ins the page reached LCP.
 * On product pages, scripts.js loads `initializers/pdp.js` first.
 */
export async function loadCommerceEager() {
  initializeAdobeDataLayer(detectPageType());
  notifyUI('lcp');
}

/**
 * Loads non-critical commerce resources.
 */
export async function loadCommerceLazy() {
  await import('./acdl/adobe-client-data-layer.min.js');
}

/**
 * Prefixes a link with the current root path (for multi-store setups).
 * @param {string} link The link
 * @returns {string} The localized link
 */
export function rootLink(link) {
  const root = (getRootPath() || '/').replace(/\/$/, '');
  if (link.startsWith(root)) return link;
  return `${root}${link}`;
}

/**
 * Fetches an optional `placeholders/*.json` sheet and merges it into the global labels.
 * Missing sheets resolve to the drop-ins' built-in English labels.
 * @param {string} [path] Placeholder sheet path, e.g. `placeholders/pdp.json`
 * @returns {Promise<Object>} The merged placeholders
 */
export async function fetchPlaceholders(path) {
  window.placeholders = window.placeholders || { merged: {}, pending: {} };
  const { placeholders } = window;
  if (!path) return placeholders.merged;
  if (!placeholders.pending[path]) {
    placeholders.pending[path] = fetch(`/${path}?sheet=data`)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .catch(() => ({ data: [] }))
      .then(({ data = [] }) => {
        data.forEach(({ Key, Value }) => {
          if (!Key || Value === undefined) return;
          const keys = Key.split('.');
          const last = keys.pop();
          const target = keys.reduce((obj, k) => {
            obj[k] = obj[k] || {};
            return obj[k];
          }, placeholders.merged);
          target[last] = Value;
        });
        return placeholders.merged;
      });
  }
  return placeholders.pending[path];
}

/**
 * Builds the storefront PDP link for a product.
 * @param {string} urlKey The product URL key
 * @param {string} sku The product SKU
 * @returns {string} `/products/{urlKey}/{sku}`
 */
export function getProductLink(urlKey, sku) {
  const key = urlKey ? sanitizeName(urlKey) : '';
  const s = sku ? sanitizeName(sku) : '';
  return rootLink(`/products/${key}/${s}`);
}

/**
 * Gets the product SKU from a `sku` row in the Product Details block, then page metadata,
 * falling back to `/products/{urlKey}/{sku}`.
 * @returns {string|undefined} The SKU
 */
export function getProductSku() {
  const row = [...document.querySelectorAll('.product-details > div')]
    .find((r) => r.children[0]?.textContent.trim().toLowerCase() === 'sku');
  const blockSku = row?.children[1]?.textContent.trim();
  if (blockSku) return blockSku;
  if (getMetadata('sku')) return getMetadata('sku');
  return window.location.pathname.match(/\/products\/[\w-]+\/([\w-]+)$/)?.[1];
}

/**
 * Extracts option UIDs from the `optionsUIDs` URL search parameter.
 * @returns {string[]|undefined} The option UIDs
 */
export function getOptionsUIDsFromUrl() {
  return new URLSearchParams(window.location.search).get('optionsUIDs')?.split(',');
}

/**
 * Builds the Microsoft Store product URL from the product's external IDs.
 * @param {string} sku The product SKU
 * @returns {Promise<string|undefined>} e.g. `https://www.microsoft.com/en-us/d/{urlKey}/{productId}`
 */
export async function getMicrosoftStoreUrl(sku) {
  try {
    const { data } = await CS_FETCH_GRAPHQL.fetchGraphQl(`
      query GET_EXTERNAL_IDS($skus: [String]) {
        products(skus: $skus) { urlKey externalIds { id origin } }
      }
    `, { method: 'GET', variables: { skus: [sku] } });
    const product = data?.products?.[0];
    const id = product?.externalIds?.find((e) => e.origin === MS_STORE_PRODUCT_ID_ORIGIN)?.id;
    if (!id || !product.urlKey) return undefined;
    const locale = (getHeaders('cs')['ac-source-locale'] || 'en-US').toLowerCase();
    return `https://www.microsoft.com/${locale}/d/${product.urlKey}/${id.toLowerCase()}`;
  } catch (e) {
    console.warn('Unable to resolve Microsoft Store URL', e);
    return undefined;
  }
}

/**
 * Sets JSON-LD structured data in the document head.
 * @param {Object} data The JSON-LD object
 * @param {string} name Identifier for the script element
 */
export function setJsonLd(data, name) {
  let script = document.head.querySelector(`script[data-name="${name}"]`);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.name = name;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/**
 * Sends the visitor to the 404 page.
 */
export function loadErrorPage() {
  window.location.replace('/notfound');
}
