# tabs-media

Custom **tabs** block. Purpose: media-switcher.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per tab: cell1 = label (Morning/Afternoon/Evening) | cell2 = poster image + MP4 link.

To choose the tab selected on load, make its label **bold** (e.g. `<strong>Afternoon</strong>`).
Only the first bold label counts; with no bold label the first tab is selected. The bold is only a
marker: the rendered tab label is plain text and looks like the others.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- First cell of each row is the tab label (plain text); the rest of the row is the panel. A panel
  with a poster image + MP4 links (desktop first, mobile second) becomes a video via
  `/scripts/video.js`; otherwise its image is rendered as an optimized picture.
- ARIA tabs pattern: `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`,
  roving `tabindex`; Left/Right arrows (wrapping), Home and End move between tabs.
- Unselected panels are `hidden` and their videos are paused; the shared helper restarts the
  selected panel's video when it comes into view. The tab with a bold label is selected by
  default (first bold label wins); with no bold label, the first tab is selected.
- Ids are prefixed per block instance, so several tabs-media blocks can share a page.
