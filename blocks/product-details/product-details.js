import { events } from '@dropins/tools/event-bus.js';
import { render as pdpRendered } from '@dropins/storefront-pdp/render.js';
import ProductHeader from '@dropins/storefront-pdp/containers/ProductHeader.js';
import ProductPrice from '@dropins/storefront-pdp/containers/ProductPrice.js';
import ProductShortDescription from '@dropins/storefront-pdp/containers/ProductShortDescription.js';
import ProductOptions from '@dropins/storefront-pdp/containers/ProductOptions.js';
import ProductDescription from '@dropins/storefront-pdp/containers/ProductDescription.js';
import ProductAttributes from '@dropins/storefront-pdp/containers/ProductAttributes.js';
import ProductGallery from '@dropins/storefront-pdp/containers/ProductGallery.js';

import {
  fetchPlaceholders,
  getMicrosoftStoreUrl,
  getProductLink,
  setJsonLd,
} from '../../scripts/commerce.js';
import { IMAGES_SIZES } from '../../scripts/initializers/pdp.js';

function formatNumericAttributeValue(value) {
  const trimmed = String(value).trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return value;
  return new Intl.NumberFormat(document.documentElement.lang).format(Number(trimmed));
}

function setMetaTag(attr, key, content) {
  if (!content) return;
  let meta = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function setProductSeo(product, storeUrl) {
  const {
    name, sku, urlKey, description, images, attributes, inStock,
  } = product;
  const amount = product.prices?.final?.minimumAmount ?? product.prices?.final?.amount
    ?? product.price?.final?.amount ?? product.priceRange?.minimum?.final?.amount;
  const brand = attributes?.find((attr) => attr.name === 'brand')?.value;
  const url = new URL(getProductLink(urlKey, sku), window.location).toString();
  // the drop-in strips the protocol from image URLs; crawlers need absolute ones
  const image = images?.[0]?.url && new URL(images[0].url, 'https://x').toString();

  setJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    url,
    name,
    sku,
    productID: sku,
    description,
    image,
    ...(brand && { brand: { '@type': 'Brand', name: brand } }),
    offers: [{
      '@type': 'Offer',
      price: amount?.value,
      priceCurrency: amount?.currency,
      availability: inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      ...(storeUrl && { url: storeUrl }),
    }],
  }, 'product');

  document.title = product.metaTitle || name;
  setMetaTag('name', 'description', product.metaDescription);
  setMetaTag('property', 'og:type', 'product');
  setMetaTag('property', 'og:title', product.metaTitle || name);
  setMetaTag('property', 'og:description', product.metaDescription || product.shortDescription);
  setMetaTag('property', 'og:url', window.location.href);
  setMetaTag('property', 'og:image', image);
}

export default async function decorate(block) {
  const eventProduct = events.lastPayload('pdp/data');
  const product = eventProduct?.sku ? eventProduct : null;
  const labels = await fetchPlaceholders();

  const fragment = document.createRange().createContextualFragment(`
    <div class="product-details__wrapper">
      <div class="product-details__gallery"></div>
      <div class="product-details__summary">
        <div class="product-details__header"></div>
        <div class="product-details__price"></div>
        <div class="product-details__short-description"></div>
        <div class="product-details__options"></div>
        <div class="product-details__buttons"></div>
      </div>
    </div>
    <div class="product-details__overview">
      <div class="product-details__description"></div>
      <div class="product-details__attributes"></div>
    </div>
  `);

  const $gallery = fragment.querySelector('.product-details__gallery');
  const $header = fragment.querySelector('.product-details__header');
  const $price = fragment.querySelector('.product-details__price');
  const $shortDescription = fragment.querySelector('.product-details__short-description');
  const $options = fragment.querySelector('.product-details__options');
  const $buttons = fragment.querySelector('.product-details__buttons');
  const $description = fragment.querySelector('.product-details__description');
  const $attributes = fragment.querySelector('.product-details__attributes');

  block.replaceChildren(fragment);

  if (!product) return;

  await Promise.all([
    pdpRendered.render(ProductGallery, {
      controls: 'thumbnailsColumn',
      arrows: true,
      peak: false,
      gap: 'small',
      loop: false,
      imageParams: { ...IMAGES_SIZES },
    })($gallery),
    pdpRendered.render(ProductHeader, {})($header),
    pdpRendered.render(ProductPrice, {})($price),
    pdpRendered.render(ProductShortDescription, {})($shortDescription),
    pdpRendered.render(ProductOptions, { hideSelectedValue: false })($options),
    pdpRendered.render(ProductDescription, {})($description),
    pdpRendered.render(ProductAttributes, {
      formatValue: formatNumericAttributeValue,
    })($attributes),
  ]);

  const storeUrl = await getMicrosoftStoreUrl(product.sku);
  if (storeUrl) {
    const buy = document.createElement('a');
    buy.className = 'button primary product-details__buy';
    buy.href = storeUrl;
    buy.target = '_blank';
    buy.rel = 'noopener';
    buy.textContent = labels.Custom?.BuyOnMicrosoftStore || 'Buy on Microsoft Store';
    $buttons.append(buy);
  }

  events.on('aem/lcp', () => setProductSeo(product, storeUrl), { eager: true });
}
