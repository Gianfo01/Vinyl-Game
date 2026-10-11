// Rodada 19 (Frente 9.9, T5) — ESCOLAS, CONSERVATÓRIOS E IGREJAS COMO CELEIROS (`schools19`). Estende o school18 (que já
// tem conservatório, Berklee, El Sistema, BRIT, LIPA, academias de trainees e a escola própria): entram o CORO DE IGREJA
// (gospel → soul, 1900+) e a ESCOLA PÚBLICA DE ARTES CÊNICAS ("Fama", 1948+) nas bolsas; um canal de descoberta "culto de
// domingo" (discover18, potencial revelado maior); o PROGRAMA DE CORAL do selo (prédio no campus18, um formando por ano);
// e os fatos reservados: `choir_alumni` (coros das cidades do gospel formam cantores todo ano — insumo da cadeia 3:
// coral → concurso → camp de composição/ghostwriter), `prodigy_found` (formando com potencial alto: PA revelado +) e
// `school_founded` (escola própria do school18 ou programa de coral).

import { clamp, Rng } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { registerConseq18 } from '../decide18';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { rng19 } from '../rng19';
import type { Act, GameState } from '../types';
import { fmtL, money, post } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { BLD19 } from './campus18';
import { schedule18 } from './decide18';
import { CH18, addLead18 } from './discover18';
import { headline19 } from './factlink19';
import { actSub18, addAff18 } from './regions18';
import { SCHOOLS18, school18 } from './school18';

// bolsas novas no school18 (aparecem sozinhas na aba de escolas)
if (!SCHOOLS18.some((x) => x.id === 'church')) SCHOOLS18.push(
  { id: 'church', real: 'Coros batistas e pentecostais', alt: l('Coro de igreja', 'Church choir'), from: 1900, to: 9999, city: 'detroit', fams: ['sacred', 'rnb'], usd: 400, q: 6, desc: l('Voz treinada desde criança, todo domingo; o gospel vira soul quando o cantor atravessa para o profano.', 'A voice trained since childhood, every Sunday; gospel becomes soul when the singer crosses over to the secular.') },
  { id: 'fame', real: 'High School of Performing Arts (NY, 1948)', alt: l('Escola pública de artes cênicas', 'Public performing-arts high school'), from: 1948, to: 9999, city: 'new_york', fams: ['pop', 'rnb', 'rock'], usd: 1200, q: 6, desc: l('A escola da "Fama": dança, teatro e música para adolescentes; formandos sabem estar no palco.', 'The "Fame" school: dance, drama and music for teenagers; graduates know how to own a stage.') },
);
if (!CH18.some((c) => c.id === 'church')) CH18.push({ id: 'church', name: l('Culto de domingo', 'Sunday service'), desc: l('Coros de igreja das cidades do gospel: vozes enormes que nunca pisaram num estúdio.', 'Church choirs in gospel cities: huge voices that never set foot in a studio.'), from: 1900, to: 9999, usd: 150, balls: 1, deg: 2, noise: 9, vis: 0.2, n: [1, 2], fams: ['sacred', 'rnb'], potUp: 6, sees: l('voz e afinação; carisma de púlpito', 'voice and pitch; pulpit charisma') });

/** Cidades com tradição de coro (ano a partir do qual formam cantores para o mercado). */
export const CHOIR19: [string, number][] = [['detroit', 1920], ['memphis', 1920], ['new_orleans', 1920], ['chicago', 1930], ['atlanta', 1930], ['salvador', 1950], ['kingston', 1950], ['lagos', 1950], ['london', 1965], ['seoul', 1985]];
export interface Sch19 { prog?: { city: string; since: number; lv: number }; alumni: Record<string, number>; seen: Record<string, 1>; log: [number, L][]; n: Record<string, number> }
declare module '../ext4' { interface Ext4 { sch19: Sch19 } }
const fresh = (): Sch19 => ({ alumni: {}, seen: {}, log: [], n: {} });
registerExt4('sch19', fresh);
export function sch19(s: GameState): Sch19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.sch19 ??= fresh()) as Sch19;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
const logS = (s: GameState, t: L) => { const st = sch19(s); st.log.unshift([s.year, t]); if (st.log.length > 30) st.log.length = 30; };
const cnt = (s: GameState, k: string) => { const n = sch19(s).n; n[k] = (n[k] ?? 0) + 1; };
export const choirsNow19 = (s: GameState) => CHOIR19.filter(([c, y]) => s.year >= y && cityById[c]);
const choirGenre = (s: GameState, r: Rng, city: string): string => {
  const g = s.year < 1955 ? 'gospel' : r.chance(0.5) ? 'gospel' : 'soul';
  return ['kingston'].includes(city) && s.year >= 1960 ? 'reggae' : city === 'lagos' && s.year >= 1970 ? (r.chance(0.5) ? 'gospel' : 'afrobeat') : city === 'salvador' && s.year >= 1960 ? (r.chance(0.5) ? 'gospel' : 'axe') : city === 'seoul' ? 'gospel' : g;
};
export const progCost19 = (s: GameState) => money(s, 8000);
/** Programa de coral do selo (prédio no campus): forma 1 cantor por ano já conhecido (grau 4). */
export function foundChoir19(s: GameState, city = s.config.homeCity): L | null {
  const st = sch19(s);
  if (st.prog) return l('O programa já existe.', 'The program already exists.');
  if (s.year < 1900) return l('Ainda não.', 'Not yet.');
  const c = progCost19(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'sch19prog', -c, 'capex', 'Programa de coral do selo');
  st.prog = { city, since: s.year, lv: 1 };
  cnt(s, 'prog');
  schedule18(s, 'ib:sch19_prog:found', {}, l('Programa de coral', 'Choir program'), l('Fundar', 'Found'));
  emitFact(s, { kind: 'school_founded', actors: ['player'], place: city, severity: 25, visibility: 'public', tags: ['schools19', 'choir', 'good'], src: 'schools19', text: fmtL(l('{c} abre um programa de coral em {p}.', '{c} opens a choir program in {p}.'), { c: s.config.companyName, p: cityById[city]?.name ?? city }) });
  return null;
}
function alumnus(s: GameState, r: Rng, city: string, mine: boolean): Act {
  const g = choirGenre(s, r, city);
  const a = spawnProceduralAct(s, r, { city, genre: g, formedYear: s.year, potential: clamp(r.normal(mine ? 66 : 58, 12), 30, 97) });
  addLead18(s, r, a, 'church', mine ? 4 : 2, mine ? 4 : 9, mine ? l('Cantor(a) do seu programa de coral: primeira opção é sua.', 'Singer from your choir program: first option is yours.') : fmtL(l('Voz do coro de {c}.', 'A voice from the {c} choir.'), { c: cityById[city]?.name ?? city }));
  sch19(s).alumni[a.id] = s.year;
  const t = fmtL(l('{a}, voz do coro de {c}, começa a cantar fora da igreja.', '{a}, a voice from the {c} choir, starts singing outside church.'), { a: a.name, c: cityById[city]?.name ?? city });
  logS(s, t); cnt(s, 'choir');
  emitFact(s, { kind: 'choir_alumni', actors: [...a.members.slice(0, 1), a.id, ...(mine ? ['player'] : [])], place: city, severity: mine ? 25 : 15, visibility: 'public', tags: ['schools19', 'choir', g], src: 'schools19', text: t, data: { city, pid: a.members[0] ?? '' } });
  return a;
}
export function schoolsYear19(s: GameState): void {
  const st = sch19(s), r = rng19(s, 'sch19', () => Rng.fromSeed(`${s.config.seed}|sch19|${s.year}`));
  // coros das cidades do gospel
  for (const [c] of choirsNow19(s)) if (r.chance(0.18)) alumnus(s, r, c, false);
  if (st.prog) { alumnus(s, r, st.prog.city, true); post(s, 'sch19up', -money(s, 1500), 'artist_dev', 'Programa de coral: regente e bolsas'); }
  // gospel → soul: quem saiu do coro atravessa para o profano (1955+)
  if (s.year >= 1955) for (const [id, y] of Object.entries(st.alumni)) {
    const a = s.acts[id];
    if (!a || a.genre !== 'gospel' || s.year - y < 2 || !r.chance(0.25)) continue;
    a.genre = 'soul'; a.momentum = clamp(a.momentum + 5, -100, 100);
    logS(s, fmtL(l('{a} troca o gospel pelo soul: a igreja reclama, o rádio adora.', '{a} swaps gospel for soul: the church complains, radio loves it.'), { a: a.name }));
    cnt(s, 'cross');
  }
  // prodígios entre os formandos do school18 e dos coros
  for (const id of [...Object.keys(school18(s).alumni), ...Object.keys(st.alumni)]) {
    const a = s.acts[id];
    if (!a || st.seen[id] || a.potential < 80) continue;
    st.seen[id] = 1;
    const t = fmtL(l('Prodígio: {a} chama atenção dos professores — potencial raro.', 'Prodigy: {a} stuns the teachers — rare potential.'), { a: a.name });
    logS(s, t); cnt(s, 'prodigy');
    emitFact(s, { kind: 'prodigy_found', actors: [...a.members.slice(0, 1), a.id], place: a.city, severity: 30, visibility: 'public', tags: ['schools19', 'prodigy', 'good'], src: 'schools19', text: t });
  }
}
registerSimHook('year', 'schools19', (s) => { if (!(globalThis as { __reg19Off?: boolean }).__reg19Off) schoolsYear19(s); });

// ---------------------------------------------------------------- ouvintes
// escola própria do school18 (fato 'deal' #school) → school_founded
onFact('deal', (s, f) => {
  if (f.src !== 'school18' || !f.tags.includes('school')) return;
  emitFact(s, { kind: 'school_founded', actors: ['player'], place: f.place, severity: f.severity, visibility: 'public', tags: ['schools19', 'school', 'good'], src: 'schools19', text: f.text, cause: [f.id] });
}, 'schools19:school18');
// escola nova: reputação institucional e gosto local pelo gênero da casa (regions18)
onFact('school_founded', (s, f) => {
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100);
  const sub = actSub18({ city: f.place ?? s.config.homeCity } as Act);
  if (sub) addAff18(s, sub, f.tags.includes('choir') ? 'gospel' : 'pop', 0.02, true, l('Escola nova forma público', 'A new school grows an audience'));
  headline19(s, f.text, 1);
}, 'schools19:campus');
// formando de coro: a cidade ganha gosto pelo gênero (regions18); o boca a boca marca o nome para os olheiros
const actIn = (s: GameState, xs: string[]): Act | undefined => s.acts[xs.find((x) => !!s.acts[x]) ?? ''];
onFact('choir_alumni', (s, f) => {
  const a = actIn(s, f.actors), sub = a && actSub18(a);
  if (a && sub) addAff18(s, sub, a.genre, 0.01, true, l('Vozes do coro', 'Choir voices'));
}, 'schools19:region');
// prodígio: o relatório da escola revela o teto (discover18/ability18: potencial +3, grau de scouting ≥ 3)
onFact('prodigy_found', (s, f) => {
  const a = actIn(s, f.actors); if (!a) return;
  a.potential = clamp(a.potential + 3, 0, 99);
  const k = s.knowledge[a.id]; if (k && k.degree < 3) { k.degree = 3; k.updatedWeek = s.week; }
  if (countryOfCity(a.city) === countryOfCity(s.config.homeCity)) headline19(s, f.text, 1);
}, 'schools19:prodigy');

registerConseq18('ib:sch19_prog:found', { later: [{ in: [12, 30], p: 0.45, tone: 'good', hint: l('Coro bom vira vitrine da cidade.', 'A good choir becomes the city\'s showcase.'),
  fx: (f) => { f.rep('institutional', 2).cash(1500, 'Coro do selo: apresentações e doações', 'other_income'); return l('O coro do selo canta no feriado da cidade: doações e prestígio.', 'The label choir sings on the city holiday: donations and prestige.'); } }] });
registerExplain('sch19.choir', (s) => {
  const xs = choirsNow19(s);
  return { title: l('Coros que formam cantores', 'Choirs that grow singers'), value: xs.length, fmt: 'num', parts: [
    ...xs.map(([c]) => ({ label: cityById[c]?.name ?? l(c, c), value: 18, fmt: 'pct' as const })),
    ...(sch19(s).prog ? [{ label: l('Seu programa de coral (garantido, grau 4)', 'Your choir program (guaranteed, degree 4)'), value: 100, fmt: 'pct' as const, tone: 'good' as const }] : []),
  ], note: l('Por ano, cada coro tem 18% de chance de lançar uma voz. Gospel vira soul depois de 1955.', 'Each year every choir has an 18% chance to launch a voice. Gospel turns soul after 1955.') };
});
BLD19.f.push((s) => {
  const p = sch19(s).prog;
  return p ? [{ id: 'sch19', kind: 'school', name: l('Programa de coral', 'Choir program').pt, city: p.city, lvl: p.lv, since: p.since, goto: { area: 'regions19' },
    kpi: [[l('Formandos', 'Alumni'), String(Object.values(sch19(s).alumni).filter((y) => y >= p.since).length)]] }] : [];
});
