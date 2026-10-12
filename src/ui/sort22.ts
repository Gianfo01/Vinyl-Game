// Rodada 22 — toda tabela do jogo ordena pelo cabeçalho: clique no nome da coluna (de novo inverte; a terceira vez
// volta à ordem original). A escolha vale para a tabela com os mesmos cabeçalhos até sair da página e é reaplicada
// quando a tela redesenha. Números entendem moeda, milhar, decimal, %, k/mil/mi/bi; o resto ordena como texto.

type Sort22 = { col: number; dir: 1 | -1 };
const memo = new Map<string, Sort22>();
const ORIG = 'data-sort22-i';

function headRow(tb: HTMLTableElement): HTMLTableRowElement | null {
  const th = tb.tHead?.rows[0];
  if (th) return th;
  const first = tb.rows[0];
  return first && first.querySelector('th') && !first.querySelector('td') ? first : null;
}
const bodyRows = (tb: HTMLTableElement, hr: HTMLTableRowElement): HTMLTableRowElement[] => [...tb.rows].filter((r) => r !== hr && r.parentElement?.tagName !== 'THEAD' && r.parentElement?.tagName !== 'TFOOT' && !!r.querySelector('td'));
const keyOf = (hr: HTMLTableRowElement): string => [...hr.cells].map((c) => (c.textContent ?? '').trim()).join('|');

/** Número de um texto de célula, ou null. */
export function num22(raw: string): number | null {
  const s = raw.replace(/−/g, '-').trim();
  const m = s.match(/^([-+]?)\s*(?:[A-Z]{0,3}\$|€|£|¥|R\$)?\s*([-+]?)\s*(\d[\d.,\s]*)\s*(%|k|mil|mi|M|bi|B)?/i);
  if (!m) return null;
  let d = m[3].replace(/\s/g, '');
  const lastDot = d.lastIndexOf('.'), lastCom = d.lastIndexOf(',');
  if (lastDot >= 0 && lastCom >= 0) d = lastCom > lastDot ? d.replace(/\./g, '').replace(',', '.') : d.replace(/,/g, '');
  else if (lastCom >= 0) d = /,\d{3}$/.test(d) && (d.match(/,/g)?.length ?? 0) >= 1 && !/^\d{1,3},\d{1,2}$/.test(d) ? d.replace(/,/g, '') : d.replace(',', '.');
  else if (lastDot >= 0 && /\.\d{3}$/.test(d) && (d.match(/\./g)?.length ?? 0) >= 1 && d.split('.')[0].length <= 3 && d.length > 4) d = d.replace(/\./g, '');
  let v = Number(d);
  if (!Number.isFinite(v)) return null;
  const suf = (m[4] ?? '').toLowerCase();
  v *= suf === 'k' || suf === 'mil' ? 1e3 : suf === 'mi' || suf === 'm' ? 1e6 : suf === 'bi' || suf === 'b' ? 1e9 : 1;
  return (m[1] === '-' || m[2] === '-') ? -v : v;
}

function apply(tb: HTMLTableElement, hr: HTMLTableRowElement, st: Sort22 | undefined): void {
  const rows = bodyRows(tb, hr);
  rows.forEach((r, i) => { if (!r.hasAttribute(ORIG)) r.setAttribute(ORIG, String(i)); });
  [...hr.cells].forEach((c, i) => c.setAttribute('aria-sort', st && st.col === i ? (st.dir === 1 ? 'ascending' : 'descending') : 'none'));
  const cell = (r: HTMLTableRowElement) => (st ? (r.cells[st.col]?.textContent ?? '').trim() : '');
  const sorted = [...rows].sort((a, b) => {
    if (!st) return Number(a.getAttribute(ORIG)) - Number(b.getAttribute(ORIG));
    const x = cell(a), y = cell(b);
    if (!x && y) return 1; if (x && !y) return -1;
    const nx = num22(x), ny = num22(y);
    const c = nx !== null && ny !== null ? nx - ny : x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
    return c * st.dir || Number(a.getAttribute(ORIG)) - Number(b.getAttribute(ORIG));
  });
  const parent = rows[0]?.parentElement;
  if (!parent || rows.some((r) => r.parentElement !== parent)) return;
  for (const r of sorted) parent.appendChild(r);
}

function sortable(tb: HTMLTableElement): HTMLTableRowElement | null {
  const hr = headRow(tb);
  if (!hr || tb.closest('[data-nosort]')) return null;
  const n = hr.cells.length;
  const rows = bodyRows(tb, hr);
  if (rows.length < 2 || rows.some((r) => r.cells.length !== n)) return null;
  return hr;
}

function prepare(tb: HTMLTableElement): void {
  const hr = sortable(tb);
  if (!hr) return;
  tb.classList.add('sort22');
  for (const c of hr.cells) if ((c.textContent ?? '').trim()) { c.tabIndex = 0; c.setAttribute('role', 'columnheader'); c.title ||= 'Clique para ordenar / Click to sort'; }
  const st = memo.get(keyOf(hr));
  if (st) apply(tb, hr, st);
}

function onClick(e: Event): void {
  const th = (e.target as HTMLElement).closest?.('th') as HTMLTableCellElement | null;
  if (!th || (e.target as HTMLElement).closest('button, a, input, select')) return;
  const tb = th.closest('table') as HTMLTableElement | null;
  if (!tb) return;
  const hr = sortable(tb);
  if (!hr || th.parentElement !== hr || !(th.textContent ?? '').trim()) return;
  const col = [...hr.cells].indexOf(th);
  const k = keyOf(hr);
  const cur = memo.get(k);
  // 1º clique: números do maior para o menor, textos de A a Z; 2º inverte; 3º volta à ordem original
  const firstNum = bodyRows(tb, hr).some((r) => num22((r.cells[col]?.textContent ?? '').trim()) !== null);
  const first: 1 | -1 = firstNum ? -1 : 1;
  const next: Sort22 | undefined = !cur || cur.col !== col ? { col, dir: first } : cur.dir === first ? { col, dir: (-first) as 1 | -1 } : undefined;
  if (next) memo.set(k, next); else memo.delete(k);
  apply(tb, hr, next);
}

let on = false;
/** Liga a ordenação em todas as tabelas (atuais e futuras). */
export function installSort22(root: Document = document): void {
  if (on || typeof MutationObserver === 'undefined') return;
  on = true;
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' && (e.target as HTMLElement).tagName === 'TH') onClick(e); });
  let pending = false;
  const scan = () => { pending = false; root.querySelectorAll<HTMLTableElement>('table:not(.sort22)').forEach(prepare); };
  new MutationObserver(() => { if (!pending) { pending = true; requestAnimationFrame(scan); } }).observe(root.body, { childList: true, subtree: true });
  scan();
}
