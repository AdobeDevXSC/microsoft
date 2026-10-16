# cards-feature-media

Custom **cards** block. Purpose: feature-bento.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row per card: cell1 = image (or poster + MP4 link) | cell2 = paragraph; bento layout via CSS (1st card spans 2 rows, 3rd card horizontal).

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Behaviour notes

- Cell order does not matter: the cell holding only an image and/or MP4 links is the media, the
  other cell is the text. Text always renders above the media.
- A media cell with MP4 links (desktop first, mobile second) becomes a video via `/scripts/video.js`;
  the image is its poster. Without MP4 links the image is rendered as an optimized picture.
- Bento layout (900px+): card 1 spans two rows, card 3 is horizontal (text | media). Extra cards
  flow into the two-column grid.
