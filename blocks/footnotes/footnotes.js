/*
 * Footnotes
 * Anchored legal footnotes so `#footnote-N` links anywhere on the page resolve.
 * Authoring (either form):
 *   - one row per footnote: marker cell (*, 1, [2] ...) | text cell
 *   - one cell holding an ordered list (items are numbered from the list's start)
 * A single-cell row may also start with its marker, e.g. "[3] Battery life ...".
 * Each item gets id `footnote-N` (`footnote-star` for *) and a marker link that returns to
 * the first reference on the page.
 */

// "[3]", "[*]", or a bare "3." / "3)" / "*" followed by whitespace
const MARKER = /^\s*(?:\[\s*(\*|\d+)\s*\]|(\*|\d+)[.):]?(?=\s|$))\s*/;

function parseMarker(text) {
  const match = text?.match(MARKER);
  return match ? { marker: match[1] || match[2], length: match[0].length } : null;
}

function markerKey(marker) {
  return marker === '*' ? 'star' : String(Number(marker));
}

/**
 * Reads authored rows into footnotes.
 * @param {Element} block The block
 * @returns {{marker: string, content: Node[]}[]}
 */
function readFootnotes(block) {
  const notes = [];
  // unmarked notes continue from the last numeric marker
  const next = () => {
    const last = [...notes].reverse().find(({ marker }) => marker !== '*');
    return String(last ? Number(last.marker) + 1 : 1);
  };
  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((cell) => cell.textContent.trim());
    if (!cells.length) return;

    if (cells.length > 1) {
      const parsed = parseMarker(cells[0].textContent);
      const marker = parsed ? parsed.marker : next();
      notes.push({ marker, content: cells.slice(1).flatMap((cell) => [...cell.childNodes]) });
      return;
    }

    const [cell] = cells;
    const list = cell.querySelector(':scope > ol, :scope > ul');
    if (list) {
      let n = Number(list.getAttribute('start')) || 1;
      [...list.children].forEach((li) => {
        const value = Number(li.getAttribute('value')) || n;
        notes.push({ marker: String(value), content: [...li.childNodes] });
        n = value + 1;
      });
      return;
    }

    // marker typed at the start of the text
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let first = walker.nextNode();
    while (first && !first.textContent.trim()) first = walker.nextNode();
    const parsed = parseMarker(first?.textContent);
    const markerText = parsed ? first.textContent.slice(0, parsed.length) : '';
    // only treat it as a marker when real text follows it
    if (parsed && cell.textContent.trim().length > markerText.trim().length) {
      first.textContent = first.textContent.slice(parsed.length);
      notes.push({ marker: parsed.marker, content: [...cell.childNodes] });
    } else {
      notes.push({ marker: next(), content: [...cell.childNodes] });
    }
  });
  return notes;
}

function findReference(id, list) {
  return [...document.querySelectorAll(`a[href$="#${id}"]`)].find((a) => !list.contains(a));
}

export default function decorate(block) {
  const notes = readFootnotes(block);
  const list = document.createElement('ol');
  list.className = 'footnotes-list';

  notes.forEach(({ marker, content }) => {
    const key = markerKey(marker);
    const id = `footnote-${key}`;
    const item = document.createElement('li');
    item.className = 'footnotes-item';
    // ids must stay unique if the same note appears twice
    if (!document.getElementById(id) && !list.querySelector(`#${id}`)) item.id = id;
    item.tabIndex = -1;

    const back = document.createElement('a');
    back.className = 'footnotes-marker';
    back.href = `#ref-${key}`;
    back.textContent = `[${marker}]`;
    back.setAttribute('aria-label', `Back to reference ${marker}`);
    back.addEventListener('click', (e) => {
      const target = document.getElementById(`ref-${key}`) || findReference(id, list);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ block: 'center' });
      target.focus({ preventScroll: true });
    });

    const text = document.createElement('div');
    text.className = 'footnotes-text';
    text.append(...content);
    item.append(back, text);
    list.append(item);
  });

  block.replaceChildren(list);
}
