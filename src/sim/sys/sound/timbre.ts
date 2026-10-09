// Assinaturas de timbre (rodada 9): falsete, metais, sampler, viola caipira, fuzz, autotune, coro gospel…
// Cada faixa nasce com 0–2 timbres (instrumentos de quem toca, família do gênero, receita de arranjo e o
// que o ato já costuma usar). Quando um ato repete o mesmo timbre em 3+ lançamentos ele vira marca
// registrada; quem usa o timbre de um ato mais famoso sem ter o seu próprio é visto como cópia e a
// crítica percebe. Tudo em tabela: o estado é só o mapa timbre → dono.

import type { Rng } from '../../../core/rng';
import { l, type FamilyId, type L } from '../../../data/world';
import type { AxisPull } from './moments';

export interface TimbreDef {
  id: string;
  name: L;
  phrase: L;
  pull: AxisPull;
  /** instrumentos de quem toca que favorecem o timbre */
  inst?: string[];
  fam?: FamilyId[];
  /** ingrediente de arranjo que o traz de fato */
  ing?: string;
  from?: number;
}

export const TIMBRES: TimbreDef[] = [
  { id: 'falsetto', name: l('falsete', 'falsetto'), phrase: l('falsete no refrão', 'falsetto on the chorus'), pull: { vo: 8, me: 4, po: 3 }, inst: ['voice'], fam: ['rnb', 'pop', 'rock'] },
  { id: 'brass', name: l('metais', 'brass section'), phrase: l('metais em coro', 'a brass section'), pull: { en: 5, de: 6, el: -3 }, inst: ['trumpet', 'sax'], fam: ['blues_jazz', 'latin', 'caribbean', 'africa', 'rnb'], ing: 'horns' },
  { id: 'sampler', name: l('sampler', 'sampler'), phrase: l('colagens de sampler', 'sampler collage'), pull: { el: 8, ex: 6, tr: 6 }, inst: ['turntables', 'daw'], fam: ['hiphop', 'electronic'], ing: 'sample', from: 1983 },
  { id: 'viola', name: l('viola caipira', 'viola caipira'), phrase: l('viola caipira dobrada', 'twin viola caipira'), pull: { el: -12, gl: -14, tr: -10 }, inst: ['acoustic'], fam: ['brazil', 'country_folk'] },
  { id: 'analog_synth', name: l('sintetizador analógico', 'analog synth'), phrase: l('sintetizador analógico gordo', 'fat analog synth'), pull: { el: 10, de: 3, ex: 3 }, inst: ['synth'], fam: ['electronic', 'pop', 'rock'], ing: 'synth', from: 1965 },
  { id: 'fuzz', name: l('guitarra fuzz', 'fuzz guitar'), phrase: l('guitarra suja de fuzz', 'fuzz-soaked guitar'), pull: { en: 8, po: -8, de: 2 }, inst: ['guitar'], fam: ['rock', 'blues_jazz'], ing: 'distortion', from: 1962 },
  { id: 'autotune', name: l('autotune', 'autotune'), phrase: l('voz de autotune', 'autotuned vocals'), pull: { el: 8, po: 8, vo: 4, tr: 6 }, inst: ['voice'], fam: ['pop', 'hiphop', 'rnb', 'latin'], ing: 'autotune', from: 1998 },
  { id: 'gospel_choir', name: l('coro gospel', 'gospel choir'), phrase: l('coro gospel ao fundo', 'a gospel choir behind'), pull: { de: 8, vo: 4, me: 8, gl: -4 }, inst: ['voice'], fam: ['sacred', 'rnb', 'blues_jazz'], ing: 'choir' },
  { id: 'cuica', name: l('cuíca e percussão', 'cuíca and hand percussion'), phrase: l('cuíca e percussão de mão', 'cuíca and hand percussion'), pull: { en: 5, el: -5, gl: -8, me: 6 }, inst: ['percussion'], fam: ['brazil', 'africa', 'latin', 'caribbean'], ing: 'percussion' },
  { id: 'strings', name: l('cordas', 'string section'), phrase: l('cordas de orquestra', 'orchestral strings'), pull: { de: 7, po: 6, el: -5 }, inst: ['violin', 'cello'], fam: ['europe', 'pop', 'asia_me'], ing: 'strings' },
  { id: 'e808', name: l('808', '808'), phrase: l('graves de 808', '808 low end'), pull: { el: 10, en: 5, de: -4 }, inst: ['daw', 'drums'], fam: ['hiphop', 'electronic', 'pop'], ing: 'drum_machine', from: 1982 },
  { id: 'organ', name: l('órgão', 'organ'), phrase: l('órgão de igreja e de bar', 'church-and-barroom organ'), pull: { de: 4, el: 2, me: 2 }, inst: ['organ'], fam: ['blues_jazz', 'sacred', 'rock'] },
  { id: 'accordion', name: l('acordeão', 'accordion'), phrase: l('acordeão na frente', 'accordion up front'), pull: { el: -6, gl: -6, tr: -6, me: 4 }, inst: ['accordion'], fam: ['country_folk', 'latin', 'brazil', 'europe'] },
  { id: 'sitar', name: l('cordas orientais', 'eastern strings'), phrase: l('cordas orientais', 'eastern strings'), pull: { ex: 6, gl: 6, tr: 4 }, inst: ['sitar'], fam: ['asia_me'] },
  { id: 'vocoder', name: l('vocoder', 'vocoder'), phrase: l('voz de vocoder', 'vocoder voice'), pull: { el: 12, ex: 6, vo: -3 }, inst: ['synth'], fam: ['electronic', 'pop'], from: 1975 },
];
export const timbreById = Object.fromEntries(TIMBRES.map((t) => [t.id, t])) as Record<string, TimbreDef>;
const byIng = Object.fromEntries(TIMBRES.filter((t) => t.ing).map((t) => [t.ing!, t.id])) as Record<string, string>;

/** Timbres que a receita de arranjo traz (ingrediente → timbre). */
export function timbresFromRecipe(recipe: string[], year: number): string[] {
  return recipe.map((i) => byIng[i]).filter((id): id is string => !!id && (timbreById[id].from ?? 0) <= year);
}

/** Sorteia 0–2 timbres de uma faixa nova: instrumentos, família e o que o ato já repete. */
export function pickTimbres(r: Rng, year: number, fam: FamilyId, insts: string[], own: string[]): string[] {
  const w = TIMBRES.filter((t) => (t.from ?? 0) <= year).map((t) => {
    let x = 0;
    if (t.inst?.some((i) => insts.includes(i))) x += 3;
    if (t.fam?.includes(fam)) x += 1.5;
    if (!x) return { t, x: 0 };
    if (own.includes(t.id)) x += 4;
    return { t, x };
  }).filter((e) => e.x > 0);
  const out: string[] = [];
  for (let n = 0; n < 2 && w.length; n++) {
    if (!r.chance(n === 0 ? 0.6 : 0.2)) break;
    const tot = w.reduce((a, e) => a + e.x, 0);
    let roll = r.next() * tot;
    const i = w.findIndex((e) => (roll -= e.x) <= 0);
    out.push(w.splice(i < 0 ? 0 : i, 1)[0].t.id);
  }
  return out;
}

export interface TimbreStore { tm: Record<string, { actId: string; year: number }>; copies: Record<string, number> }

/** Quantas vezes o ato usou cada timbre nos últimos lançamentos (lista de listas de timbres). */
export function tally(history: string[][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ts of history) for (const t of new Set(ts)) out[t] = (out[t] ?? 0) + 1;
  return out;
}

/** O ato fecha 3+ usos de um timbre sem dono (ou de dono aposentado): vira marca registrada dele. */
export function claimTimbres(st: TimbreStore, actId: string, year: number, counts: Record<string, number>, alive: (id: string) => boolean): string[] {
  const got: string[] = [];
  for (const [t, n] of Object.entries(counts)) {
    if (n < 3) continue;
    const cur = st.tm[t];
    if (cur && cur.actId !== actId && alive(cur.actId)) continue;
    if (!cur || cur.actId !== actId) { st.tm[t] = { actId, year }; got.push(t); }
  }
  return got;
}

/** Timbres de uma faixa que pertencem a outro ato (cópia). */
export function copiedTimbres(st: TimbreStore, actId: string, timbres: string[], own: Record<string, number>): { t: string; holder: string }[] {
  const out: { t: string; holder: string }[] = [];
  for (const t of timbres) {
    const h = st.tm[t];
    if (h && h.actId !== actId && (own[t] ?? 0) < 3) out.push({ t, holder: h.actId });
  }
  return out;
}
