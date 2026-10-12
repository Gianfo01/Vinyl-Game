// Rodada 23 — no celular (≤760px) tabelas densas viram cartões empilhados (CSS em mobile23.css): cada <td>
// ganha data-label com o texto do <th> da mesma coluna. Genérico, depois do render (como sort22): um
// MutationObserver marca tabelas novas e rotula linhas acrescentadas depois.

const MARK = 'data-c23';

function headRow(tb: HTMLTableElement): HTMLTableRowElement | null {
  const th = tb.tHead?.rows[0];
  if (th) return th;
  const first = tb.rows[0];
  return first && first.querySelector('th') && !first.querySelector('td') ? first : null;
}

/** textos do cabeçalho por coluna (respeita colspan) */
function heads(hr: HTMLTableRowElement): string[] {
  const out: string[] = [];
  for (const c of hr.cells) {
    const txt = (c.textContent ?? '').replace(/\s+/g, ' ').trim();
    for (let i = 0; i < Math.max(1, c.colSpan); i++) out.push(txt);
  }
  return out;
}

function label(tb: HTMLTableElement, hs: string[]): void {
  for (const r of tb.rows) {
    if (r.parentElement?.tagName === 'THEAD') continue;
    let col = 0;
    for (const c of r.cells) {
      if (c.tagName === 'TD' && !c.hasAttribute('data-label') && hs[col]) c.setAttribute('data-label', hs[col]);
      col += Math.max(1, c.colSpan);
    }
  }
}

/** Prepara uma tabela: só as densas (cabeçalho com 3+ colunas nomeadas) viram cartões. */
export function prepareCards23(tb: HTMLTableElement): void {
  if (tb.closest('[data-nocards]')) { tb.setAttribute(MARK, '0'); return; }
  const hr = headRow(tb);
  const hs = hr ? heads(hr) : [];
  const named = hs.filter(Boolean).length;
  if (!hr || hs.length < 3 || named < 2) { tb.setAttribute(MARK, '0'); return; }
  tb.setAttribute(MARK, '1');
  tb.classList.add('m23-cards');
  (tb as HTMLTableElement & { _h23?: string[] })._h23 = hs;
  label(tb, hs);
}

let on = false;
/** Liga a rotulagem em todas as tabelas (atuais e futuras). */
export function installCards23(root: Document = document): void {
  if (on || typeof MutationObserver === 'undefined') return;
  on = true;
  let pending = false;
  const scan = () => {
    pending = false;
    root.querySelectorAll<HTMLTableElement>(`table:not([${MARK}])`).forEach(prepareCards23);
    // linhas acrescentadas depois (listas que crescem sem redesenhar a tabela)
    root.querySelectorAll<HTMLTableElement>(`table[${MARK}="1"]`).forEach((tb) => {
      const hs = (tb as HTMLTableElement & { _h23?: string[] })._h23;
      if (hs && tb.querySelector('td:not([data-label])')) label(tb, hs);
    });
  };
  new MutationObserver(() => { if (!pending) { pending = true; requestAnimationFrame(scan); } }).observe(root.body, { childList: true, subtree: true });
  scan();
}
