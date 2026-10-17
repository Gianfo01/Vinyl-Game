// R33 · REDES — MOTOR DE FRASES. Monta o post de um fato a partir de partes que se combinam, em PT e EN ao mesmo tempo:
//   [gíria da época] [abertura do tom] NÚCLEO(tipo de fato; encaixes cidade/música/rival/número/lugar) [fã] [fecho do tom] [bordão do rival]
// 60 tipos de fato × 10 núcleos + 4 grupos × 10 (tipos raros) = 640 núcleos; 6 tons × 14 aberturas e 14 fechos; 6 faixas de gíria.
// Cada artista guarda os últimos 50 núcleos e não os repete: escolhe-se entre os que NÃO estão na memória; se o tipo tem
// menos de 51 núcleos e todos foram usados, repete o MAIS ANTIGO (espaçamento máximo). Puro: sem estado, sem GameState.

import type { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { CORE_KINDS33, CORE_TEXT33, NUM33, groupOf33 } from './frases33data';
import { CLOSE33, OPEN33, SLANG33, TONES33, type Tone33 } from './frases33tone';

export { TONES33, type Tone33 } from './frases33tone';
export const MEM33 = 50;

/** Faixas de época (as mesmas 6 de ep5Of: 1889–1919, 1920–49, 1950–69, 1970–89, 1990–2009, 2010–2040). */
export const era33 = (year: number): number => (year < 1920 ? 0 : year < 1950 ? 1 : year < 1970 ? 2 : year < 1990 ? 3 : year < 2010 ? 4 : 5);

export interface Slots33 { c?: string; s?: string; r?: string; n?: number; p?: L; f?: string }

const pair = (raw: string): L => { const i = raw.indexOf('|'); return l(raw.slice(0, i), raw.slice(i + 1)); };
const FALLBACK: Record<string, L> = {
  c: l('a cidade', 'town'), s: l('a música nova', 'the new song'), r: l('um colega', 'a colleague'), p: l('o teatro', 'the theatre'), f: l('vocês', 'you all'),
};
function fill(t: L, sl: Slots33): L {
  const sub = (txt: string, lang: 'pt' | 'en'): string => txt.replace(/\{([csrpnf])\}/g, (_, k: string) => {
    if (k === 'n') return String(sl.n ?? 3);
    if (k === 'p') return sl.p?.[lang] ?? FALLBACK.p[lang];
    const v = (sl as Record<string, string | undefined>)[k];
    return v ?? FALLBACK[k][lang];
  });
  return l(sub(t.pt, 'pt'), sub(t.en, 'en'));
}

/** Quantos núcleos existem (e quais ids). Id = `${tipo}#${i}` ou `g:${grupo}#${i}` para o genérico. */
export const coreTotal33 = (): number => Object.values(CORE_TEXT33).reduce((t, v) => t + v.length, 0);
export const hasCores33 = (kind: string): boolean => CORE_KINDS33.includes(kind);
export function coreIds33(kind: string): string[] {
  const key = hasCores33(kind) ? kind : `g:${groupOf33(kind)}`;
  return (CORE_TEXT33[key] ?? []).map((_, i) => `${key}#${i}`);
}
export function coreText33(id: string): L | undefined {
  const [key, i] = id.split('#');
  const raw = CORE_TEXT33[key]?.[Number(i)];
  return raw ? pair(raw) : undefined;
}
/** Combinações possíveis de um núcleo (tons × aberturas × fechos × gírias), sem contar os encaixes. */
export const variants33 = (): number => TONES33.length * (OPEN33.humilde.length + 1) * (CLOSE33.humilde.length + 1) * (SLANG33[0].length + 1);

/** Escolhe o núcleo: fora da memória; senão o mais antigo da memória (nunca o mesmo duas vezes seguidas). */
export function pickCore33(kind: string, mem: readonly string[], rng: Rng): string {
  const ids = coreIds33(kind);
  const fresh = ids.filter((x) => !mem.includes(x));
  if (fresh.length) return fresh[rng.int(0, fresh.length - 1)];
  let best = ids[0], at = Infinity;
  for (const id of ids) { const a = mem.lastIndexOf(id); if (a < at) { at = a; best = id; } }
  return best;
}

/** Recorda o núcleo usado (máximo MEM33). */
export function remember33(mem: string[], core: string): string[] {
  mem.push(core);
  if (mem.length > MEM33) mem.splice(0, mem.length - MEM33);
  return mem;
}

export const FANS33: string[] = ['Marta', 'Rui', 'Dona Cida', 'o Zeca', 'a Bia', 'o Teo', 'Lia', 'Seu Álvaro', 'a Nina', 'o Caio', 'Ana', 'o Beto'];
export const FANS33_EN: string[] = ['Marta', 'Rui', 'Miss Cida', 'Zeke', 'Bea', 'Teo', 'Lia', 'Mr Alvaro', 'Nina', 'Caio', 'Anna', 'Bert'];

const tonify = (t: L, tone: Tone33): L => {
  if (tone === 'misterioso') return l(t.pt.toLowerCase().replace(/\.(\s*)$/, '…$1').replace(/!/g, '.'), t.en.toLowerCase().replace(/\.(\s*)$/, '…$1').replace(/!/g, '.'));
  if (tone === 'arrogante') return l(t.pt.replace(/!/g, '.'), t.en.replace(/!/g, '.'));
  return t;
};

export interface Compose33 {
  kind: string;
  tone: Tone33;
  year: number;
  slots: Slots33;
  mem: readonly string[];
  rng: Rng;
  /** bordão do rival, quando houver (aparece às vezes) */
  catch?: L;
  /** força um núcleo (teste) */
  core?: string;
}
export interface Out33 { core: string; text: L }

export function compose33(c: Compose33): Out33 {
  const { rng, tone, slots } = c;
  const core = c.core ?? pickCore33(c.kind, c.mem, rng);
  const base = coreText33(core) ?? l('...', '...');
  const sl: Slots33 = { ...slots };
  if (sl.n === undefined) { const [a, b] = NUM33[c.kind] ?? [3, 12]; sl.n = rng.int(a, b); }
  const parts: L[] = [];
  const open = rng.chance(0.65);
  if (!open && rng.chance(0.4)) { const s = SLANG33[era33(c.year)]; parts.push(pair(s[rng.int(0, s.length - 1)])); }
  if (open) { const o = OPEN33[tone]; parts.push(pair(o[rng.int(0, o.length - 1)])); }
  parts.push(base);
  if (rng.chance(0.15)) {
    const i = rng.int(0, FANS33.length - 1);
    parts.push(l(`Salve, ${FANS33[i]}!`, `Shout-out to ${FANS33_EN[i]}!`));
  }
  if (rng.chance(0.65)) { const o = CLOSE33[tone]; parts.push(pair(o[rng.int(0, o.length - 1)])); }
  if (c.catch && rng.chance(0.3)) parts.push(c.catch);
  const joined = l(parts.map((x) => x.pt).join(' '), parts.map((x) => x.en).join(' '));
  return { core, text: tonify(fill(joined, sl), tone) };
}

/** Bordões dos rivais (um por rival, por hash do id; aparecem às vezes). */
const CATCH33: string[] = [
  'Isso é só o começo.|This is only the beginning.', 'Quem me conhece, me segue.|Whoever knows me, follows me.', 'Sem frescura.|No fuss.', 'Fiquem ligados.|Stay tuned.',
  'Tamo junto até o fim.|Together to the end.', 'Quem avisa amigo é.|A warning is a friendship.', 'Cada um no seu quadrado.|Each in their own lane.', 'Nunca desisto.|I never quit.',
  'A noite é nossa.|The night is ours.', 'Respeito é bom e eu gosto.|Respect is nice and I like it.', 'Mais um dia, mais uma canção.|One more day, one more song.', 'O resto é ruído.|The rest is noise.',
  'Deus ajuda quem cedo madruga.|The early bird gets the worm.', 'Não é sorte, é suor.|It is not luck, it is sweat.', 'Quem viver verá.|Whoever lives will see.', 'Sempre na pista.|Always on the floor.',
  'O melhor está por vir.|The best is yet to come.', 'Diga não ao tédio.|Say no to boredom.', 'Faça barulho.|Make some noise.', 'Aqui é raiz.|Roots all the way.',
  'Meu som, minhas regras.|My sound, my rules.', 'Vem comigo.|Come with me.', 'Palco é casa.|The stage is home.', 'Vamos que vamos.|Onward we go.',
];
export function catchOf33(actId: string): L {
  let h = 2166136261;
  for (let i = 0; i < actId.length; i++) { h ^= actId.charCodeAt(i); h = Math.imul(h, 16777619); }
  return pair(CATCH33[(h >>> 0) % CATCH33.length]);
}
export const CATCH_COUNT33 = CATCH33.length;
