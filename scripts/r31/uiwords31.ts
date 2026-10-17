// R31 · NOMES — varredura dos textos da interface que coincidem com a tabela de nomes reais (interruptor "Nomes e obras
// reais" desligado). Lê os literais de texto do código (pares pt/en de l()/s()/N()/D()… e l()/s() de uma língua só),
// cruza com os pares real → homenagem e grava src/data/uiwords31.ts, lido pelo motor de exibição (src/data/realdisp31.ts):
//  - UI_WHOLE31: nome real que É um texto inteiro da interface ("Nome", "Telefone", "OK") — não troca como texto inteiro;
//  - UI_INTEXT31: nome "em frase" que aparece dentro de um texto da interface — passa a trocar só como texto inteiro.
// Uso: npx tsx scripts/r31/uiwords31.ts  (tests/r31-uiwords.test.ts falha se o arquivo gerado estiver desatualizado)
import fs from 'node:fs';
import path from 'node:path';

const STR = String.raw`'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|` + '`(?:[^`\\\\$]|\\\\.)*`';
const PAIR = new RegExp(`(${STR})\\s*,\\s*(${STR})`, 'g');
const ONE = new RegExp(`\\b(?:l|s|L|N|T|t)\\(\\s*(${STR})\\s*[,)]`, 'g');
const unq = (q: string): string => q.slice(1, -1).replace(/\\(['"`\\])/g, '$1');

export interface UiLits31 {
  /** todo literal de texto da interface (sem os de base de dados) */
  all: string[];
  /** literal que é um lado de um par pt/en com tradução diferente ("Nome"/"Name"): palavra da interface */
  translated: string[];
}

/** Literais de texto da interface: todo src/ui e src/i18n, e as chamadas l()/s() do resto (menos as bases de dados). */
export function uiLiterals31(root = process.cwd()): UiLits31 {
  const files: string[] = [];
  const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
  walk(path.join(root, 'src'));
  const all = new Set<string>(), tr = new Set<string>();
  const add = (x: string, set = all) => { const v = x.trim(); if (v && /\p{L}/u.test(v)) set.add(v); };
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join('/');
    if (rel.startsWith('src/data/') || rel === 'src/ui/r31/realshow31ui.ts') continue; // bases de nomes (reais e homenagens)
    const src = fs.readFileSync(f, 'utf8');
    const ui = /^src\/(ui|i18n)\//.test(rel);
    for (const m of src.matchAll(PAIR)) {
      const a = unq(m[1]), b = unq(m[2]);
      // par que fecha a chamada (`l('Nome', 'Name')`, `D(…, 'Telefone', 'Telephone')`): pt e en de um texto
      const call = /^\s*\)/.test(src.slice((m.index ?? 0) + m[0].length));
      if (ui || call) { add(a); add(b); }
      if (call && a.trim() !== b.trim()) { add(a, tr); add(b, tr); }
    }
    for (const m of src.matchAll(ONE)) add(unq(m[1]));
  }
  return { all: [...all], translated: [...tr] };
}

/** Todo texto entre aspas das bases (src/data): títulos e nomes que a partida pode pôr na tabela na hora (discos e
 *  canções dos atos reais num mundo nascido com nomes reais), além dos pares estáticos. */
export function dataLiterals31(root = process.cwd()): string[] {
  const out = new Set<string>();
  const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts') && !p.endsWith('uiwords31.ts')) for (const m of fs.readFileSync(p, 'utf8').matchAll(new RegExp(STR, 'g'))) { const v = unq(m[0]).trim(); if (v && /\p{L}/u.test(v)) out.add(v); } } };
  walk(path.join(root, 'src', 'data'));
  return [...out];
}

const WORD = /[\p{L}\p{N}]+/gu;
const isW = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

/** `x` aparece escrito em minúsculas, como palavra inteira, numa frase da interface ("nome da empresa"): palavra comum. */
function lowerIndex31(lits: string[]): (x: string) => boolean {
  const text = lits.filter((s) => /\s/.test(s)).join('\n'); // frase (literal com espaço) — ids e classes não contam
  const words = new Set<string>();
  WORD.lastIndex = 0;
  for (let m = WORD.exec(text); m; m = WORD.exec(text)) if (m[0] === m[0].toLowerCase()) words.add(m[0]);
  return (x) => {
    const lw = x.trim().toLowerCase();
    if (!/\p{L}/u.test(lw)) return false;
    if (!/[^\p{L}\p{N}]/u.test(lw)) return words.has(lw);
    for (let i = text.indexOf(lw); i >= 0; i = text.indexOf(lw, i + 1)) if (!isW(text[i - 1]) && !isW(text[i + lw.length])) return true;
    return false;
  };
}

/** Nomes de uma palavra que um texto da interface cita DE PROPÓSITO (marca, veículo, plataforma, ato, festival):
 *  continuam trocando no meio da frase ("o som Motown", "Sobreviva ao Napster"). Revisado à mão; o resto que aparece com
 *  maiúscula num texto da interface é homônimo ("Neto(a)", "Mobile phone", "Edifício Aurora", "Khmer Rouge"). */
export const ENTITY_OK31 = ['ABBA', 'AKB48', 'BBC', 'BTS', 'Bahiano', 'Billboard', 'Coachella', 'Donga', 'FTX', 'Googoosh', 'Metallica', 'MIDEM',
  'Motown', 'MySpace', 'Oricon', 'Ritchie', 'Sanremo', 'SoundCloud', 'TikTok', 'TuneCore', 'WOMAD', 'Wilco', 'Woodstock', 'YouTube'];

/** registro à mão: lugar, veículo, marca, modo… (não artista/obra) — nome de entidade escrito de propósito */
export async function entityOk31(): Promise<Set<string>> {
  const { REALNAMES31 } = await import('../../src/data/realnames31');
  const ok = new Set(ENTITY_OK31);
  for (const r of Object.values(REALNAMES31)) if (!['artist', 'member', 'work', 'fiction', 'quote'].includes(r.tipo)) ok.add(r.real);
  return ok;
}

/** Cruza os pares com os literais. `names` = camada "em frase"; `titles` = camada "texto inteiro".
 *  - whole: o nome é um texto inteiro da interface que é palavra (tem tradução diferente, ou aparece em minúsculas
 *    numa frase) — "Nome", "Telefone", "Status"; nome próprio escrito num texto ("MTV", "Woodstock") continua trocando;
 *  - intext: nome "em frase" de uma palavra que é palavra comum (em minúsculas numa frase: "Fazer", "Total") ou que
 *    aparece com maiúscula num texto da interface sem ser citação de propósito (fora de `ok`: "Neto", "Mobile"). */
export function uiCollisions31(names: [string, string][], titles: [string, string][], lits: UiLits31, ok: ReadonlySet<string>, data: string[] = []): { whole: string[]; intext: string[] } {
  const lower = lowerIndex31(lits.all);
  const text = lits.all.join('\n');
  const cap = (a: string): boolean => { for (let i = text.indexOf(a); i >= 0; i = text.indexOf(a, i + 1)) if (!isW(text[i - 1]) && !isW(text[i + a.length])) return true; return false; };
  const all = new Set(lits.all), tr = new Set(lits.translated);
  const whole = new Set<string>();
  for (const a of [...names.map(([x]) => x), ...titles.map(([x]) => x), ...data]) {
    const k = a.trim(); // texto inteiro: maiúsculas exatas, como a troca ("The band" da interface não é "The Band")
    if (all.has(k) && (tr.has(k) || lower(k))) whole.add(k);
  }
  const intext = new Set<string>();
  // palavra só (nome composto numa frase é nome próprio): comum (em minúsculas numa frase) ou homônimo citado com maiúscula
  for (const [a] of names) if (!/[^\p{L}\p{N}]/u.test(a.trim()) && (lower(a) || (!ok.has(a) && cap(a)))) intext.add(a);
  return { whole: [...whole].sort(), intext: [...intext].sort() };
}

export function render31(c: { whole: string[]; intext: string[] }): string {
  const arr = (xs: string[]) => xs.map((x) => `  ${JSON.stringify(x)},`).join('\n');
  return `// GERADO por scripts/r31/uiwords31.ts — não editar à mão (npx tsx scripts/r31/uiwords31.ts).
// Nomes reais da tabela do interruptor "Nomes e obras reais" que coincidem com textos da interface.

/** nome real que é um texto inteiro da interface (maiúsculas exatas): não troca como texto inteiro */
export const UI_WHOLE31: readonly string[] = [
${arr(c.whole)}
];

/** nome "em frase" que aparece dentro de um texto da interface: troca só como texto inteiro */
export const UI_INTEXT31: readonly string[] = [
${arr(c.intext)}
];
`;
}

if (process.argv[1] && /uiwords31\.ts$/.test(process.argv[1])) {
  await import('../../src/sim/worldgen'); // primeiro: ordem de carga dos sistemas
  const { realPairsOff31 } = await import('../../src/sim/r31/realshow31');
  const p = realPairsOff31();
  const c = uiCollisions31(p.names, p.titles, uiLiterals31(), await entityOk31(), dataLiterals31());
  fs.writeFileSync('src/data/uiwords31.ts', render31(c));
  console.log(`uiwords31: ${c.whole.length} textos inteiros, ${c.intext.length} nomes em frase`);
}
