// Rodada 15 — núcleo puro da navegação (sem DOM): rota no hash, busca da paleta, migalhas, rolagem por área.

/** Rota: área + aba principal do hub (ex.: #/market/marketHub=auctions). */
export interface Route15 { area: string; tab?: [string, string] }

const enc = (x: string) => encodeURIComponent(x);
export function buildHash(r: Route15): string {
  return `#/${enc(r.area)}${r.tab ? `/${enc(r.tab[0])}=${enc(r.tab[1])}` : ''}`;
}
export function parseHash(hash: string): Route15 | null {
  const m = /^#\/([^/?#=]+)(?:\/([^/=]+)=([^/]+))?\/?$/.exec(hash.trim());
  if (!m) return null;
  try {
    const area = decodeURIComponent(m[1]);
    return m[2] ? { area, tab: [decodeURIComponent(m[2]), decodeURIComponent(m[3])] } : { area };
  } catch { return null; }
}

/** Sem acentos, minúsculo: "Gravação" ≈ "gravacao". */
export const fold = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Pontua o quanto `label` casa com a busca (0 = não casa). Prefixo > início de palavra > trecho > iniciais/subsequência. */
export function score15(q: string, label: string): number {
  const a = fold(q).trim();
  if (!a) return 1;
  const b = fold(label);
  if (b.startsWith(a)) return 100 - Math.min(40, b.length - a.length) * 0.5;
  const at = b.indexOf(a);
  if (at >= 0) return (/[\s\-·›(/]/.test(b[at - 1] ?? ' ') ? 70 : 45) - Math.min(20, at * 0.3);
  // todas as palavras da busca aparecem (em qualquer ordem)
  const words = a.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => b.includes(w))) return 35;
  // subsequência a partir do início de uma palavra (ex.: "lm" → "Leilões de masters"; "leil" não casa "Glenn Miller")
  const start = b.split(/[\s\-·›(/]+/).findIndex((w) => w.startsWith(a[0]));
  if (start < 0) return 0;
  let i = 0;
  for (const ch of b.split(/[\s\-·›(/]+/).slice(start).join(' ')) if (ch === a[i]) i++;
  return i === a.length ? 10 + Math.max(0, 10 - (b.length - a.length) * 0.2) : 0;
}

export interface Cmd15 { label: string; kind: string; hint?: string; weight?: number }
/** Ordena e limita os comandos da paleta pela busca (estável: empate mantém a ordem original). */
export function rank15<T extends Cmd15>(cmds: T[], q: string, limit = 14): T[] {
  return cmds.map((c, i) => ({ c, i, m: score15(q, c.label) })).filter((x) => x.m > 0)
    .map((x) => ({ ...x, s: x.m + (q.trim() ? x.c.weight ?? 0 : 0) }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, limit).map((x) => x.c);
}

/** Migalhas: Grupo › Área › Aba, sem repetir rótulos iguais. */
export function crumbs15(parts: (string | undefined | null)[]): string[] {
  const out: string[] = [];
  for (const p of parts) if (p && fold(p) !== fold(out[out.length - 1] ?? '')) out.push(p);
  return out;
}

/** Título da aba do navegador = rótulo do menu. */
export const pageTitle15 = (area: string, company?: string): string => `${area}${company ? ` · ${company}` : ''} — Masters`;

/** Rolagem lembrada por área (volta onde estava; área nova abre no topo). */
export class ScrollMemo15 {
  private m = new Map<string, number>();
  constructor(private max = 40) {}
  save(key: string, y: number): void { this.m.delete(key); this.m.set(key, Math.max(0, Math.round(y))); if (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string); }
  get(key: string): number { return this.m.get(key) ?? 0; }
}

/** Atalhos para o painel "?" (área e tecla, agrupados por tecla, sem duplicar). */
export function shortcutRows15(areas: { key: string; label: string }[]): { key: string; label: string }[] {
  const seen = new Set<string>();
  return areas.filter((a) => a.key && a.key.length === 1 && !seen.has(a.key) && seen.add(a.key))
    .map((a) => ({ key: a.key.toUpperCase(), label: a.label }))
    .sort((a, b) => (/\d/.test(a.key) ? 0 : 1) - (/\d/.test(b.key) ? 0 : 1) || a.key.localeCompare(b.key));
}

/** Memo por "versão": recalcula só quando a chave muda (ex.: semana + ação). */
export function memo15<K, V>(fn: (k: K) => V): (k: K, ver: unknown) => V {
  let last: { ver: unknown; k: K; v: V } | null = null;
  return (k, ver) => {
    if (last && last.ver === ver && last.k === k) return last.v;
    const v = fn(k);
    last = { ver, k, v };
    return v;
  };
}
