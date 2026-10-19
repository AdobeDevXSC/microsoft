# Surface Laptop Ultra in EDS: Main Page Plus Scroll-Loaded Fragments

## Goal
Rebuild the Surface Laptop Ultra product page in Edge Delivery Services. The page is split into one main page plus several fragment pages. Each fragment loads only when the visitor scrolls near it, using IntersectionObserver.

> Doing the work requires switching to Execute mode. This document is the plan only.

---

## What the source page contains
The page is about 16,000px tall, with 14 main sections, 9 videos and 23 images. It also has two scroll-pinned sections, an in-page section nav, and a floating "Pre-order" bar.

| # | Section | Pattern | Media | Notes |
|---|---|---|---|---|
| 1 | Hero: promo strip, H1 "Surface Laptop Ultra", "The new shape of power", $2,599.99, Pre-order | Product hero | 1 video + poster | This is the LCP element |
| 2 | "Inner craft. Outer beauty." / "Built around the breakthrough" | Pinned scrolling slides | 3 videos | Uses `position: sticky` |
| 3 | Magnetic USB-C, haptic touchpad, ports | Feature media cards | 3 images, 1 video | |
| 4 | "Shines in any setting" | Tabbed media (Morning / Afternoon / Evening) | 1 video, 1 image | |
| 5 | Brightest HDR, 15" touchscreen, RTX gaming | Feature list with footnote links | none | Footnotes [1], [2] |
| 6 | "Run local. Run free." | Heading and intro | none | |
| 7 | Build / Create / Analyze | Pinned video storytelling | 3 videos | Uses `position: sticky` |
| 8 | "Yours for the long haul" plus image | Text and media | 1 image | Footnote [4] |
| 9 | "Security that means business" | 3 columns (Secured-core, Windows Hello, Encryption) and a CTA | 3 images | |
| 10 | "Explore every level of Surface" | 4 product cards (Learn more / Buy) | 4 images | Can be reused on other Surface pages |
| 11 | "See full specs" | CTA strip | none | |
| 12 | FAQ (22 questions, Expand all / Collapse all) | Accordion | none | Important for SEO |
| 13 | Legal footnotes and terms | Disclaimer list | none | Earlier footnote links jump here |
| — | Section nav (Performance · Display · Local AI · Security · Tech specs) | Sticky anchor nav | — | Jumps to sections that may not be loaded yet |
| — | Floating "Surface Laptop Ultra $2,599.99 Pre-order" bar | Fixed buy bar | — | |

**What's in the project today:** blocks `cards`, `columns`, `fragment`, `header`, `footer`, `hero`, `widget`. The current fragment auto-block loads every `/fragments/` link **immediately** while the page is being built, so lazy loading needs new code.

---

## Proposed page structure (split by section-nav chapter)

```
/surface/devices/surface-laptop-ultra              ← main page (indexed)
  ├─ Hero, section nav, buy bar                    (always in main page)
  ├─ [lazy] fragments/surface-laptop-ultra/performance   (sections 2–3)
  ├─ [lazy] fragments/surface-laptop-ultra/display       (sections 4–5)
  ├─ [lazy] fragments/surface-laptop-ultra/local-ai      (sections 6–8)
  ├─ [lazy] fragments/surface-laptop-ultra/security      (section 9)
  ├─ [lazy] fragments/surface/explore-surface            (section 10, shared)
  ├─ Specs CTA and FAQ                             (main page, for SEO)
  └─ [lazy] fragments/surface-laptop-ultra/legal         (section 13)
```

- **Split by section-nav chapter rather than one fragment per section.** That gives 6 requests instead of 13, and each section-nav item maps to exactly one fragment.
- **The hero and FAQ stay in the main page.** Search engines don't scroll, so content that only loads on scroll may not be indexed. The H1, price, and FAQ (a candidate for FAQ rich results) need to be in the page HTML.
- The Explore Surface cards become a **shared fragment** that other Surface product pages can reuse.

---

## How lazy loading will work

**Authoring:** in the main page, each lazy section is a small `Lazy Fragment` block containing the fragment link. Section metadata provides an `id` (such as `performance`) and an optional reserved height.

**Behavior:**
1. **Placeholder:** each lazy section reserves space with a minimum height (a CSS variable per section) so the page doesn't jump when content arrives.
2. **Observer:** one shared IntersectionObserver with `rootMargin: '800px 0px'` starts each fetch before the section scrolls into view. When a fragment is in range, the loader reuses the existing `loadFragment()`, swaps the placeholder for the content, and stops watching that placeholder.
3. **Avoiding eager loading:** the current fragment auto-block must skip links inside `.lazy-fragment`. Otherwise it loads them all immediately.
4. **Jump links and deep links:** a small helper in `/scripts/lazy-fragments.js`, `loadUntil(id)`, loads every fragment up to the target, then scrolls to it. It handles:
   - section-nav clicks
   - links that open with a section in the URL, like `#security`
   - footnote links like `[1]`, which first load the legal fragment
5. **Event:** a `fragment-loaded` event fires after each load, so the section nav can highlight the current chapter and analytics can track it.
6. **Videos:** a second observer plays videos only while they're on screen and pauses them off screen. It respects the user's reduced-motion setting. Only the hero poster image loads early.
7. **Fallback:** if a fetch fails, the placeholder becomes a plain link to the fragment instead of empty space.

**Trade-offs to accept:**
- Browser find (Ctrl+F) and printing only cover sections that have loaded.
- Fragments must be kept out of the sitemap and search index (`robots: noindex` plus an index-config exclusion).
- EDS already loads blocks section by section. The real gains here are a smaller first page, less decoration work up front, and content authors can edit separately.

---

## Blocks needed

| Block | Source sections | Status |
|---|---|---|
| `hero` (product variant with video poster, price, CTA, promo strip) | 1 | Extend existing |
| `section-nav` (sticky, highlights current chapter, lazy-aware) | nav | New |
| `buy-bar` (floating price and CTA) | bar | New |
| `lazy-fragment` | all fragments | New, reuses `fragment.js` |
| `scrolling-slides` (pinned media slides, with a variant for Build/Create/Analyze) | 2, 7 | New |
| `cards` (feature-media and product variants) | 3, 10 | Extend existing |
| `tabs` (media tabs) | 4 | New |
| `columns` (feature and security variants) | 5, 9 | Extend existing |
| `video` (autoplay on view, loop, poster) | many | New |
| `accordion` (with Expand all / Collapse all and FAQ structured data) | 12 | New |
| `footnotes` (anchored list with return links) | 13 | New |

---

## Checklist

### 1. Set up
- [ ] Create a feature branch, e.g. `surface-laptop-ultra` (not `main`)
- [ ] Confirm the project type and block library for the Document Authoring content source `adobedevxsc/microsoft`
- [ ] Settle the open decisions below

### 2. Analyze the page
- [ ] Run page analysis on the source URL (screenshots, cleaned HTML, block variants)
- [ ] Record what each section does on scroll (sticky offsets, slide triggers, tab behavior)
- [ ] Extract design tokens (colors such as dune-light-2 and grey-1, type scale, spacing, the mono display font)

### 3. Build lazy-loading core
- [ ] Add `/scripts/lazy-fragments.js` (shared observer, `loadUntil(id)`, `fragment-loaded` event)
- [ ] Create the `lazy-fragment` block (placeholder, reserved height, error fallback)
- [ ] Change the fragment auto-block in `scripts.js` to skip `.lazy-fragment` links
- [ ] Handle a section in the URL on page load (replaces the plain `scrollIntoView` in `loadLazy`)

### 4. Build blocks
- [ ] `hero` product variant (video poster as LCP)
- [ ] `section-nav` (sticky, smooth scroll through `loadUntil`, current-chapter state)
- [ ] `buy-bar`
- [ ] `video` (play/pause on view, reduced motion)
- [ ] `scrolling-slides` and its storytelling variant
- [ ] `tabs` media variant
- [ ] `cards` feature-media and product variants
- [ ] `columns` feature and security variants
- [ ] `accordion` with Expand/Collapse all and FAQ structured data
- [ ] `footnotes`
- [ ] Style each block to match the source, scoping CSS to `.blockname`

### 5. Import the content
- [ ] Build the import script with a transformer that splits one source page into the main page plus 6 fragment pages, adding `Lazy Fragment` blocks and section `id`s
- [ ] Generate parsers for each block variant
- [ ] Run the bulk import to produce all 7 pages
- [ ] Add `robots: noindex` metadata to fragment pages and leave them out of the index config
- [ ] Upload pages to Document Authoring and preview them

### 6. Verify
- [ ] Visually compare each section against the original (desktop and mobile)
- [ ] Network check: only the main page loads first; each fragment loads about 800px before it's reached
- [ ] Section-nav jumps, URL section links (`#security`), and footnote links all land correctly before their fragments load
- [ ] Layout shift under 0.1 with placeholders; Lighthouse performance 90 or higher on mobile
- [ ] Keyboard and screen-reader check (focus stays put after fragments load; accordion and tabs have correct accessibility attributes)
- [ ] Lint passes (`npm run lint`)

### 7. Ship
- [ ] Open a PR with the preview link `surface-laptop-ultra--microsoft--AdobeDevXSC.aem.page/surface/devices/surface-laptop-ultra`
- [ ] After merge, publish the main page and fragment content separately

---

## Open decisions (recommended defaults in **bold**)
1. **Split size:** **one fragment per section-nav chapter** (6 fragments), or one per section (about 12).
2. **SEO-critical content:** **keep the hero and FAQ in the main page**, or lazy-load everything below the hero.
3. **Video hosting:** **link the existing MP4 files**, or move them to a video service or Document Authoring media. Linking means depending on Microsoft's hosting.
4. **Header and footer:** **out of scope for now** (handled later as a separate navigation and footer migration), or include them.
5. **Fonts:** the source uses Microsoft-licensed fonts (Segoe and a mono display font). Either **use the licensed files if available** or pick close fallbacks.
6. **Optional add-on:** a Commerce add-on is available but not turned on. It handles product and listing pages and could help with the price and Pre-order pieces. I can turn it on if you'd like; otherwise the plan treats these as static content and links.
