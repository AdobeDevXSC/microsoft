/*
 * Columns (features)
 * Side-by-side text columns: each cell = heading (H3) + paragraph(s), optionally with
 * footnote <sup> links. Authors may use one row with N cells or one row per column;
 * every non-empty cell becomes a column, in reading order.
 */

export default function decorate(block) {
  const cells = [...block.children]
    .flatMap((row) => [...row.children])
    .filter((cell) => cell.textContent.trim() || cell.querySelector('picture, img'));

  const list = document.createElement('ul');
  list.className = 'columns-features-list';
  cells.forEach((cell) => {
    const item = document.createElement('li');
    item.className = 'columns-features-item';
    item.append(...cell.childNodes);
    item.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('columns-features-title');
    list.append(item);
  });

  block.dataset.count = cells.length;
  block.style.setProperty('--columns-features-count', Math.min(cells.length, 4) || 1);
  block.replaceChildren(list);
}
