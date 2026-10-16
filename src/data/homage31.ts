// R31 · onda 4 (X) — GERADOR DE HOMENAGENS para as bases reais grandes (milhares de artistas, integrantes, músicas e
// discos), onde escrever uma homenagem à mão por nome não é viável. Puro e determinístico: o mesmo nome real vira sempre
// a mesma homenagem (função só do texto). Mantém artigos e palavras de formação ("The", "Os", "Orchestra", "&"), troca o
// fim das demais palavras por uma terminação parecida e preserva maiúsculas — "homenagem parecida", nunca o nome real.
// Os nomes com homenagem escrita à mão (src/data/realnames31.ts) têm prioridade sobre este gerador.

const KEEP31 = new Set([
  'the', 'and', 'of', 'a', 'an', 'in', 'on', 'to', 'de', 'da', 'do', 'das', 'dos', 'du', 'des', 'e', 'y', 'el', 'la', 'le', 'les', 'los', 'las',
  'os', 'as', 'o', 'i', 'il', 'lo', 'di', 'del', 'della', 'van', 'von', 'der', 'den', 'mc', 'dj', 'mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr',
  'band', 'banda', 'grupo', 'group', 'trio', 'quartet', 'quarteto', 'quintet', 'quinteto', 'orchestra', 'orquestra', 'orquesta', 'brothers',
  'irmãos', 'sisters', 'family', 'boys', 'girls', 'experience', 'project', 'club', 'company', 'crew', 'singers', 'all', 'stars', 'his', 'her',
  'their', 'with', 'com', 'feat', 'vs',
]);
const ENDS31 = ['ano', 'ella', 'ton', 'ley', 'ard', 'ino', 'ford', 'son', 'aro', 'ine', 'by', 'ent', 'ola', 'ers', 'wick', 'ondo', 'iel', 'ix', 'mann', 'ita'];

function hash31(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const bump31 = (c: string): string => {
  const base = c.normalize('NFD')[0]; // R31 (BASE-IT): letra acentuada ("Al di là") avança pela letra-base — antes saía igual ao real
  if (base !== c && /[a-z]/i.test(base)) return bump31(base);
  const z = c === c.toUpperCase() ? 'Z' : 'z', a = c === c.toUpperCase() ? 'A' : 'a';
  return c === z ? a : /\p{L}/u.test(c) && /[a-z]/i.test(c) ? String.fromCharCode(c.charCodeAt(0) + 1) : /\d/.test(c) ? String((Number(c) + 1) % 10) : c;
};

function word31(w: string, seed: number, force = false): string {
  if (!force && KEEP31.has(w.toLowerCase())) return w;
  if (force && [...w].length <= 3) { const arr = [...w]; arr[arr.length - 1] = bump31(arr[arr.length - 1]); return arr.join(''); }
  if (/^\d+$/.test(w)) return String(Number(w) + 1 + (seed % 7));
  const letters = [...w];
  if (letters.length <= 2) return /\d/.test(w) ? w.replace(/\d/, (d) => String((Number(d) + 1 + (seed % 7)) % 10)) : w;
  const upper = w === w.toUpperCase() && /\p{Lu}/u.test(w);
  const keep = Math.max(2, Math.ceil(letters.length * 0.5));
  const stem = letters.slice(0, keep).join('');
  for (let k = 0; k < ENDS31.length; k++) {
    const end = ENDS31[(seed + k) % ENDS31.length];
    const cut = stem.replace(/[aeiouáéíóúãõâêôàAEIOU]+$/u, '');
    let out = (cut.length >= 2 ? cut : stem) + end;
    if (upper) out = out.toUpperCase();
    if (out.toLowerCase() !== w.toLowerCase()) return out;
  }
  return w + 'o';
}

/** Homenagem determinística de um nome real (artista, integrante, título). Nunca devolve o próprio nome. */
export function homage31(real: string): string {
  const h = hash31(real);
  let i = 0;
  let changed = false;
  const out = real.replace(/[\p{L}\p{N}]+/gu, (w) => {
    const r = word31(w, (h >>> (i++ % 3) * 3) + i);
    if (r !== w) changed = true;
    return r;
  });
  if (changed) return out;
  // nada mudou (siglas, só palavras de formação): força a troca na última palavra
  const ws = [...real.matchAll(/[\p{L}\p{N}]+/gu)];
  const last = ws[ws.length - 1];
  if (!last || last.index === undefined) return `${real}'`;
  const r = word31(last[0], h, true);
  return real.slice(0, last.index) + r + real.slice(last.index + last[0].length);
}
