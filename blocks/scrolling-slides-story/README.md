# scrolling-slides-story

Custom **scrolling-slides** block. Purpose: pinned-storytelling.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per story: cell1 = desktop MP4 link + mobile MP4 link | cell2 = H2 + paragraph.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Cell order does not matter: the cell without a heading that holds an image and/or MP4 links
  is the media; the other cell is the story text (H2 + paragraph, `<sup>` footnote links allowed).
- Media: optional poster image + desktop MP4 link, then mobile MP4 link. Videos are built with
  `/scripts/video.js` (play only in view, reduced-motion aware, play/pause toggle). The source has
  no posters; adding one is recommended (it is shown until the video plays). An image without MP4
  links renders as a still.
- Desktop (900px+): a full-bleed sticky stage, one viewport of scroll per story. As each story's
  scroll segment crosses the middle of the viewport its panel opens and its video crossfades in;
  inactive videos are paused. Clicking a collapsed panel heading scrolls to that story.
- Mobile (below 900px): one full-bleed 100svh stage (videos stacked in place) with the panels as
  a single-open accordion at its bottom (60px/20px inset). Tapping a collapsed heading opens it,
  collapses the others (`aria-expanded`) and crossfades/plays its video. Nothing is pinned.
- Safe inside lazy fragments: nothing is measured during decoration; activation is driven by
  IntersectionObserver.
- Not reproduced: the source's video-length auto-advance and progress bar (activation is scroll-driven
  on desktop and tap-driven on mobile).
