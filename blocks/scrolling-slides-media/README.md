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

- All widths pin: the stage is `position: sticky` and the track is one viewport tall per slide
  (`lvh` below 900px, `svh` above). An invisible trigger per slide is watched by an
  IntersectionObserver; the trigger crossing the middle of the viewport makes its slide active
  (`.is-active`). The dash buttons jump to a slide.
- Below 900px (source mobile): 374:724 frame (2:3 from 768px), pinned at
  `max(section-nav + 16px, centred)` (60px at 375x812); dashes 64px (50px from 768px) below the
  frame top, copy 12px under them. Triggers split the pinned range evenly, with the outer half
  viewports going to the first/last slide, so slides switch at about y+541 / y+1083 like the source.
- 900px+: 16:9 frame centred in the viewport; dashes and copy bottom-left; one viewport per trigger.
- Only the active slide's video plays; inactive slides are paused (`pauseVideos`) and flagged
  `data-autoplay="false"` so the shared helper (`/scripts/video.js`) does not restart them.
- `prefers-reduced-motion`: still pinned, cross-fades and dash transitions are disabled, and videos
  do not autoplay.
- No layout measurement happens in `decorate()`, so the block works inside lazy-loaded fragments.
- The media cell may hold just an image; the MP4 links are optional.
