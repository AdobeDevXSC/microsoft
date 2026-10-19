# section-nav

Custom **section-nav** block. Purpose: sticky-chapter-nav.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per link: [Performance](#performance) ... [Tech specs](#specs) (or a single cell with a list of links).

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Put the block in its own section directly after the hero. Content: links to in-page ids,
  one per row or as a list, e.g. Performance (#performance), Display (#display),
  Local AI (#localai), Security (#security), Tech specs (#specs). Links to other pages are
  ignored; full URLs pointing at the current page are accepted.
- Sticky: the block's section (`.section-nav-container`) sticks to the top of the page across
  all following sections (below the fixed header on mobile, at 0 on desktop).
- Lazy fragments: clicking a link calls `loadUntil(id, { behavior: 'smooth' })` from
  `/scripts/lazy-fragments.js`, so fragments above and including the target load first; the
  URL hash is updated and focus moves to the target. Reduced motion uses an instant jump.
- Scroll-spy: an IntersectionObserver watches every top-level section of `<main>`. A section
  belongs to the chapter whose id is at or above it, so multi-section chapters (e.g. display =
  two sections) stay highlighted throughout. Sections above the first chapter (hero, intro)
  make the first link active, so a link is always active. The active link gets
  `aria-current="true"`. The section list is re-scanned on every `fragment-loaded` event.
- Targets get `scroll-margin-top: var(--section-nav-offset)`; the block publishes that variable
  on `:root` (sticky top + bar height) from a ResizeObserver.
- Narrow screens: links scroll horizontally. When the active link changes, only the list
  smooth-scrolls (never the page) so the link is centred, clamped to the list's scroll range;
  this is the source behaviour. Back at the top it returns to `scrollLeft` 0.
