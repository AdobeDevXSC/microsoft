/*
 * Accordion (FAQ)
 * Collapsible questions and answers with Expand all / Collapse all controls.
 * One row per item: question cell | answer cell (rich text).
 * A single-cell row uses its first element as the question and the rest as the answer.
 * A heading in the question cell becomes the question itself (summary > h3), so it stays
 * in the document outline; plain text is wrapped in a span instead.
 * Also publishes the Q&A as schema.org FAQPage JSON-LD in <head> (one script per page).
 */

const JSON_LD_ID = 'accordion-faq-jsonld';
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Builds the question element shown inside <summary>.
 * Uses an authored heading as-is; any other content beside it moves to the answer,
 * since a heading must not be nested in phrasing content.
 * @param {{question: Node[], answer: Node[]}} item
 * @returns {Element}
 */
function buildQuestion(item) {
  const nodes = item.question.filter((node) => node.nodeType === Node.ELEMENT_NODE
    || node.textContent.trim());
  const heading = nodes.find((node) => node.nodeType === Node.ELEMENT_NODE
    && node.matches(HEADINGS));
  if (heading) {
    heading.classList.add('accordion-faq-item-question');
    item.answer.unshift(...nodes.filter((node) => node !== heading));
    return heading;
  }
  const label = document.createElement('span');
  label.className = 'accordion-faq-item-question';
  label.append(...nodes);
  return label;
}

/**
 * Splits a row into question and answer content.
 * @param {Element} row Authored row
 * @returns {{question: Node[], answer: Node[]}|null}
 */
function readItem(row) {
  const cells = [...row.children].filter((cell) => cell.textContent.trim()
    || cell.querySelector('picture, img'));
  if (!cells.length) return null;
  if (cells.length > 1) {
    const [q, ...rest] = cells;
    return { question: [...q.childNodes], answer: rest.flatMap((cell) => [...cell.childNodes]) };
  }
  const [cell] = cells;
  const first = cell.firstElementChild;
  if (!first) return { question: [...cell.childNodes], answer: [] };
  return { question: [first], answer: [...cell.childNodes].filter((node) => node !== first) };
}

/**
 * Adds the items to the page's FAQPage JSON-LD (created once, extended by later blocks).
 * @param {{question: string, answer: string}[]} items
 */
function publishJsonLd(items) {
  if (!items.length) return;
  let script = document.getElementById(JSON_LD_ID);
  let data;
  try {
    data = script ? JSON.parse(script.textContent) : null;
  } catch {
    data = null;
  }
  if (!data) {
    data = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] };
  }
  const known = new Set(data.mainEntity.map((entity) => entity.name));
  items.forEach(({ question, answer }) => {
    if (known.has(question)) return;
    known.add(question);
    data.mainEntity.push({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    });
  });
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSON_LD_ID;
    document.head.append(script);
  }
  script.textContent = JSON.stringify(data);
}

function buildControls(items) {
  const controls = document.createElement('div');
  controls.className = 'accordion-faq-controls';
  const make = (label, open) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `accordion-faq-${open ? 'expand' : 'collapse'}-all`;
    button.textContent = label;
    button.addEventListener('click', () => {
      items.forEach((details) => { details.open = open; });
    });
    return button;
  };
  const expand = make('Expand all', true);
  const collapse = make('Collapse all', false);
  controls.append(expand, collapse);

  const update = () => {
    const openCount = items.filter((details) => details.open).length;
    expand.disabled = openCount === items.length;
    collapse.disabled = openCount === 0;
  };
  items.forEach((details) => details.addEventListener('toggle', update));
  update();
  return controls;
}

export default function decorate(block) {
  const items = [];
  const schema = [];

  [...block.children].forEach((row) => {
    const item = readItem(row);
    if (!item) return;
    const details = document.createElement('details');
    details.className = 'accordion-faq-item';
    const summary = document.createElement('summary');
    summary.className = 'accordion-faq-item-label';
    const label = buildQuestion(item);
    summary.append(label);
    const body = document.createElement('div');
    body.className = 'accordion-faq-item-body';
    body.append(...item.answer);
    details.append(summary, body);
    items.push(details);

    const question = normalize(label.textContent);
    const answer = normalize(body.textContent);
    if (question && answer) schema.push({ question, answer });
  });

  const list = document.createElement('div');
  list.className = 'accordion-faq-items';
  list.append(...items);
  block.replaceChildren(...(items.length > 1 ? [buildControls(items)] : []), list);
  publishJsonLd(schema);
}
