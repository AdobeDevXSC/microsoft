/*
 * Table (specs)
 * Plain spec sheet renderer: one row per category, label cell | values cell
 * (paragraphs or lists, <sup> footnote links allowed).
 * Rows with a single cell become a full-width group row; rows with more than two cells keep
 * the extra cells as additional value columns. Empty rows are dropped.
 * Opening the sheet in a dialog ("Get details") is not handled here.
 */

export default function decorate(block) {
  const table = document.createElement('table');
  table.className = 'table-specs-table';
  const tbody = document.createElement('tbody');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.some((cell) => cell.textContent.trim() || cell.querySelector('picture, img'))) return;
    const tr = document.createElement('tr');

    if (cells.length === 1) {
      tr.className = 'table-specs-group';
      const th = document.createElement('th');
      th.scope = 'colgroup';
      th.colSpan = 2;
      th.append(...cells[0].childNodes);
      tr.append(th);
    } else {
      const [label, ...values] = cells;
      const th = document.createElement('th');
      th.scope = 'row';
      th.className = 'table-specs-label';
      th.append(...label.childNodes);
      tr.append(th);
      values.forEach((cell) => {
        const td = document.createElement('td');
        td.className = 'table-specs-value';
        td.append(...cell.childNodes);
        tr.append(td);
      });
    }
    tbody.append(tr);
  });

  table.append(tbody);
  block.replaceChildren(table);
}
