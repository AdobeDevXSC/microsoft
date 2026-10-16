# scrolling-slides-media

Custom **scrolling-slides** block. Purpose: pinned-feature-slides.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per slide: cell1 = poster image + desktop MP4 link + mobile MP4 link | cell2 = H2 + paragraph.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Desktop (900px+): the stage is `position: sticky` and the block is one viewport tall per slide.
  An invisible trigger per slide is watched by an IntersectionObserver; the trigger crossing the
  middle of the viewport makes its slide active (`.is-active`). The dash buttons jump to a slide.
- Only the active slide's video plays; inactive slides are paused (`pauseVideos`) and flagged
  `data-autoplay="false"` so the shared helper (`/scripts/video.js`) does not restart them.
- Mobile: slides stack, every video plays only while in view, no pinning.
- No layout measurement happens in `decorate()`, so the block works inside lazy-loaded fragments.
- The media cell may hold just an image; the MP4 links are optional.
