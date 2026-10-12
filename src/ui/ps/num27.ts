// Rodada 27 (J) — números alinhados à direita em TODA tabela, sem mexer nas telas (a auditoria achou 2.391
// células numéricas alinhadas à esquerda). Uma coluna vira numérica quando a maioria das células preenchidas é
// número, dinheiro, porcentagem, posição ou variação; travessão/vazio não contam. A marcação é só uma classe
// (num27c) — ordenação (sort22) e cartões do celular (cards23) continuam iguais.

/** A célula é um número? ($1.491, −$7 mil, 54%, +20, #3, 1.234,5, 12k, 2,3 mi, 4.9, ~175, "$1.125 $$$$", "1956–"; 50–300 não). */
export function isNumCell27(raw: string): boolean {
  const x = raw.replace(/\s+/g, ' ').trim();
  if (!x || x.length > 24) return false;
  return /^[~≈+\-−±#№]?\s?[−-]?\s?(?:[$€£¥]|R\$|US\$)?\s?\d[\d.,  ]*(?:\s?(?:%|pp|k|K|M|B|mi|mil|bi|x|×|º|ª|°))?(?:\s?[▲▼↑↓])?(?:\s?\$+|[–-])?$/.test(x);
}
/** Célula que não decide (vazia, travessão, "n/d"). */
export const isBlankCell27 = (raw: string): boolean => /^(?:|[—–\-·…?]|n\/d|N\/A)$/.test(raw.trim());

/** Índices das colunas numéricas de uma tabela (linhas de texto já extraídas). Mínimo 60% e 2 células decisivas (1 em tabelas de 1 linha). */
export function numColumns27(rows: string[][], min = 0.6): number[] {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const out: number[] = [];
  for (let c = 0; c < width; c++) {
    let n = 0, yes = 0;
    for (const r of rows) {
      const v = r[c];
      if (v === undefined || isBlankCell27(v)) continue;
      n++;
      if (isNumCell27(v)) yes++;
    }
    if (n >= Math.min(2, rows.length) && n > 0 && yes / n >= min) out.push(c);
  }
  return out;
}

// ---------------------------------------------------------------- instalação (DOM)
function mark(t: HTMLTableElement): void {
  t.classList.add('num27t');
  const body = [...t.querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr, :scope > tr')];
  if (!body.length) return;
  // só linhas sem colspan (as de grupo/rodapé distorcem a contagem)
  const plain = body.filter((r) => ![...r.cells].some((c) => c.colSpan > 1));
  const cols = numColumns27(plain.map((r) => [...r.cells].map((c) => c.textContent ?? '')));
  if (!cols.length) return;
  for (const r of plain) for (const c of cols) r.cells[c]?.classList.add('num27c');
  const head = t.tHead?.rows[t.tHead.rows.length - 1];
  if (head && ![...head.cells].some((c) => c.colSpan > 1)) for (const c of cols) head.cells[c]?.classList.add('num27c');
}
let on = false;
/** Observa a página e marca as tabelas novas (mesmo padrão do sort22/cards23). */
export function installNum27(root: Document = document): void {
  if (on || typeof MutationObserver === 'undefined') return;
  on = true;
  let pending = false;
  const scan = () => { pending = false; root.querySelectorAll<HTMLTableElement>('main table:not(.num27t)').forEach(mark); };
  new MutationObserver(() => { if (!pending) { pending = true; requestAnimationFrame(scan); } }).observe(root.body, { childList: true, subtree: true });
  scan();
}
