// Rodada 19 (Frente 9.7) — TRILHAS, CANÇÕES-TEMA E NEEDLE DROPS (`score19`). Complementa o screen18 (o compositor
// de trilha sob encomenda) com o lado do ARTISTA e do CATÁLOGO:
//  • Canção-tema: estúdio de cinema (1934+, quando nasce o prêmio de canção original), série (1955+), novela (1965+)
//    ou game (2000+) quer o seu ato. Original (compor; concorre a prêmio) ou existente (licença; mais barato). Estreia
//    com cena (cine18 'premiere'), bilheteria sorteada, vendas da trilha por 3 meses e, no mês da cerimônia, indicação/
//    vitória → `theme_award` (livro de prêmios via awards19, reputação artística = prestígio do paths18, cena).
//  • Needle drop: uma série/filme/trailer quer uma faixa do seu catálogo → `needle_drop` (streaming/lojas sobem; faixa
//    com 10+ anos esquenta no sucesso tardio do revival19). NPCs também.
//  • Encomenda do screen18 que começa (e cada canção-tema fechada) → `score_hired`: o compositor cresce (skills.comp)
//    e o nome do selo no cinema (screen18.rep) sobe.

import { Rng, clamp } from '../../core/rng';
import { BRANDS as CBRANDS, type BrandDef } from '../../data/content';
import { l, type L } from '../../data/world';
import { recordAward19 } from '../awards19';
import { registerDeadline } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { homeMarket } from '../economy';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { logShot18 } from './cine18';
import { headline19 } from './factlink19';
import { cnt19, link19, log19, mineA19, mineR19, usd19, xs19, type Log19 , off19 } from './mkb19';
import { sc18 } from './screen18';
import { cashWhy20, freeCash20 } from '../oblig20';

export type ThMed19 = 'film' | 'tv' | 'novela' | 'game';
export const THMED19: Record<ThMed19, { name: L; from: number; sync: string; fee: number; aw: L; awFrom: number; awMonth: number }> = {
  film: { name: l('Filme', 'Film'), from: 1934, sync: 'film', fee: 9000, aw: l('Oscar de canção original', 'Best Original Song Oscar'), awFrom: 1934, awMonth: 2 },
  tv: { name: l('Série de TV', 'TV series'), from: 1955, sync: 'tv', fee: 5000, aw: l('Emmy de música-tema', 'Main Title Theme Emmy'), awFrom: 1955, awMonth: 8 },
  novela: { name: l('Novela', 'Soap opera'), from: 1965, sync: 'novela', fee: 6000, aw: l('Troféu da novela (voto popular)', 'Soap trophy (popular vote)'), awFrom: 1965, awMonth: 11 },
  game: { name: l('Videogame', 'Video game'), from: 2000, sync: 'game', fee: 5000, aw: l('Prêmio de canção de game', 'Game song award'), awFrom: 2003, awMonth: 11 },
};
const W1 = ['Noite', 'Estrada', 'Coração', 'Cidade', 'Verão', 'Segredo', 'Destino', 'Tempestade', 'Sombra', 'Amanhã'];
const W2 = ['Perdida', 'Sem Fim', 'de Fogo', 'Proibida', 'Selvagem', 'de Ouro', 'Silenciosa', 'Eterna', 'do Sul', 'Final'];
const E1 = ['Night', 'Road', 'Heart', 'City', 'Summer', 'Secret', 'Fate', 'Storm', 'Shadow', 'Tomorrow'];
const E2 = ['Lost', 'Without End', 'of Fire', 'Forbidden', 'Wild', 'of Gold', 'Silent', 'Eternal', 'of the South', 'Final'];
export interface Th19 { id: string; act: string; med: ThMed19; studio: string; t: L; k: 'orig' | 'existing'; rel?: string; fee: number; w: number; prem: number; box?: number; base?: number; mo?: number; u?: number; nom?: 1; won?: 1; aw?: number }
export interface Nd19 { id: string; rel: string; who: string; y: number; fee: number }
export interface Score19 extends Log19 { th: Th19[]; nd: Nd19[]; seen: Record<string, 1>; seq: number; last: number }
declare module '../ext4' { interface Ext4 { score19: Score19 } }
const fresh = (): Score19 => ({ th: [], nd: [], seen: {}, seq: 0, last: -99, log: [], n: {} });
registerExt4('score19', fresh);
export const scr19 = (s: GameState): Score19 => xs19(s, 'score19', fresh);
const rng = (s: GameState) => rng19(s, 'score19');
export const medsNow19 = (s: GameState): ThMed19[] => (Object.keys(THMED19) as ThMed19[]).filter((m) => s.year >= THMED19[m].from && (m !== 'novela' || ['br', 'latam'].includes(homeMarket(s))));
const studios = (s: GameState, m: ThMed19): BrandDef[] => CBRANDS.filter((b) => s.year >= b.start && (!b.end || s.year <= b.end) && b.sync.includes(THMED19[m].sync as never));
const bestRel = (s: GameState, a: Act): Release | undefined => a.releases.map((id) => s.releases[id]).filter((x): x is Release => !!x && x.type === 'single').sort((p, q) => q.q - p.q)[0];
export const themeFee19 = (s: GameState, a: Act, m: ThMed19, b?: BrandDef) => money(s, THMED19[m].fee * ((b?.budget ?? 3) / 3) * (0.5 + a.fame / 100));
export const themeCost19 = (s: GameState) => money(s, 1800);

function offerTheme(s: GameState, a: Act, r: Rng): boolean {
  const meds = medsNow19(s).filter((m) => studios(s, m).length);
  const m = meds.length ? r.pick(meds) : undefined, b = m && r.pick(studios(s, m));
  if (!m || !b) return false;
  const i = r.int(0, W1.length - 1), j = r.int(0, W2.length - 1);
  const t = l(`${W1[i]} ${W2[j]}`, `${E1[i]} ${E2[j]}`);
  const fee = Math.round(themeFee19(s, a, m, b) * r.float(0.85, 1.2));
  pushInbox18(s, 'sc19_theme', { from: b.name, tone: 'good',
    subject: fmtL(l('{b} quer {a} na canção-tema de "{t}"', '{b} wants {a} for the theme song of "{t}"'), { b: b.name, a: a.name, t }),
    body: fmtL(l('{m}: {d} Canção original (compor; {c} de gravação) concorre ao {aw}; licenciar uma faixa existente sai mais barato, mas não concorre. Cachê {f}.', '{m}: {d} An original song (write it; {c} to record) competes for the {aw}; licensing an existing track is cheaper but cannot compete. Fee {f}.'),
      { m: THMED19[m].name, d: b.desc, c: usd19(themeCost19(s)), aw: THMED19[m].aw, f: usd19(fee) }),
    ref: { act: a.id, m, b: b.id, t: t.pt, te: t.en, fee }, actions: [{ id: 'orig', label: l('Compor a canção original', 'Write the original song') }, { id: 'existing', label: l('Licenciar uma faixa existente', 'License an existing track') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 6 });
  return true;
}
/** Fecha a canção-tema (Caixa ou teste). */
export function takeTheme19(s: GameState, actId: string, m: ThMed19, bid: string, t: L, fee: number, k: 'orig' | 'existing'): Th19 | L {
  const a = s.acts[actId], b = CBRANDS.find((x) => x.id === bid), st = scr19(s);
  if (!a || !b) return l('Oferta inválida.', 'Invalid offer.');
  const rel = k === 'existing' ? bestRel(s, a) : undefined;
  if (k === 'existing' && !rel) return l('O ato não tem faixa lançada para licenciar.', 'The act has no released track to license.');
  if (k === 'orig') { if (freeCash20(s) < themeCost19(s)) return cashWhy20(s, themeCost19(s), l('Caixa insuficiente para gravar.', 'Not enough cash to record.')); post(s, `sc19rec:${actId}:${s.week}`, -themeCost19(s), 'recording', `Canção-tema: ${t.pt}`); }
  const pay = k === 'existing' ? Math.round(fee * 0.6) : fee;
  post(s, `sc19:${actId}:${s.week}`, pay, 'sync', `${b.name} — tema de ${t.pt}`);
  const x: Th19 = { id: `th${++st.seq}`, act: actId, med: m, studio: b.name, t, k, ...(rel ? { rel: rel.id } : {}), fee: pay, w: s.week, prem: s.week + rng(s).int(13, 26) };
  st.th.push(x); if (st.th.length > 30) st.th.splice(0, st.th.length - 30);
  cnt19(st, 'theme');
  const tx = fmtL(l('{a} assina a canção-tema de "{t}" ({b}).', '{a} signs on for the theme song of "{t}" ({b}).'), { a: a.name, t, b: b.name });
  log19(s, st, tx);
  emitFact(s, { kind: 'score_hired', actors: [actId, 'player'], severity: 25 + b.budget * 4, visibility: 'public', tags: ['score19', 'theme', m], text: tx, src: 'score19', data: { th: x.id } });
  return x;
}
registerInboxKind('sc19_theme', { label: l('Canção-tema', 'Theme song'), cat: 'deals', icon: 'film', prio: 1, goto: () => ({ area: 'media19' }),
  handle: (s, m, act) => {
    const R = m.ref ?? {};
    if (act === 'no') return l('Recusado: o estúdio chama outro artista.', 'Declined: the studio calls another artist.');
    const x = takeTheme19(s, String(R.act), String(R.m) as ThMed19, String(R.b), l(String(R.t), String(R.te)), Number(R.fee), act === 'orig' ? 'orig' : 'existing');
    return 'id' in x ? fmtL(l('Fechado: estreia em {w} semanas.', 'Signed: premiere in {w} weeks.'), { w: x.prem - s.week }) : x;
  } });
registerConseq18('ib:sc19_theme:orig', { now: l('Cachê + custo de gravação; concorre a prêmio.', 'Fee + recording cost; can compete for awards.'), later: [{ in: [4, 9], p: 0.3, tone: 'mixed', hint: l('O diretor pode mexer na sua canção.', 'The director may meddle with your song.'),
  fx: (f) => (f.r.chance(0.5) ? (f.mood('inspiration', 8).fame(1), l('O diretor amou a demo: a canção abre e fecha o filme.', 'The director loved the demo: the song opens and closes the film.')) : (f.mood('resentment', 6).trust(-2), l('O estúdio pediu três refações e cortou a ponte da canção.', 'The studio asked for three rewrites and cut the song\'s bridge.'))) }] });
registerConseq18('ib:sc19_theme:existing', { now: l('60% do cachê; sem prêmio.', '60% of the fee; no award.'), later: [{ in: [3, 8], p: 0.25, tone: 'good', hint: l('Uma faixa velha num filme pode renascer.', 'An old track in a film can be reborn.'),
  fx: (f) => (f.fans(3), l('A cena do filme com a sua faixa vira meme: a música volta a tocar.', 'The film scene with your track becomes a meme: the song plays again.')) }] });
registerConseq18('ib:sc19_theme:no', { later: [{ in: [6, 14], p: 0.2, tone: 'bad', hint: l('A canção-tema pode virar o hit de outro.', 'The theme song may become someone else\'s hit.'),
  fx: (f) => (f.momentum(-4), l('O artista que aceitou no seu lugar fez o hit do ano com a canção-tema.', 'The artist who took it instead had the hit of the year with the theme.')) }] });

// needle drop no seu catálogo
function offerNeedle(s: GameState, r: Rng): boolean {
  const pool = playerActs(s).flatMap((id) => s.acts[id]?.releases ?? []).map((id) => s.releases[id]).filter((x): x is Release => !!x && s.year - x.year >= 1 && x.q >= 40);
  const rel = r.weighted(pool, (x) => (x.q / 50) ** 2 * (s.year - x.year >= 10 ? 1.5 : 1));
  const meds = medsNow19(s);
  const m = rel && meds.length ? r.pick(meds) : undefined, b = m && r.pick(studios(s, m));
  if (!rel || !m || !b) return false;
  const a = s.acts[rel.actId];
  const fee = Math.round(money(s, 2500 * (b.budget / 3) * (0.5 + (a?.fame ?? 20) / 100)) * r.float(0.8, 1.2));
  pushInbox18(s, 'sc19_needle', { from: b.name, tone: 'good', subject: fmtL(l('{b} quer "{t}" ({y}) numa cena', '{b} wants "{t}" ({y}) in a scene'), { b: b.name, t: rel.title, y: rel.year }),
    body: fmtL(l('{m}: o supervisor musical quer a faixa numa cena-chave. Cachê {f}. Faixa com 10+ anos pode esquentar e voltar às paradas (sucesso tardio).', '{m}: the music supervisor wants the track in a key scene. Fee {f}. A track 10+ years old may heat up and return to the charts (late hit).'), { m: THMED19[m].name, f: usd19(fee) }),
    ref: { rel: rel.id, act: rel.actId, b: b.id, fee }, actions: [{ id: 'clear', label: l('Liberar', 'Clear it') }, { id: 'haggle', label: l('Pedir +40%', 'Ask +40%') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 4 });
  return true;
}
export function needle19(s: GameState, relId: string, who: string, fee: number): L | null {
  const rel = s.releases[relId], st = scr19(s);
  if (!rel) return l('Faixa inválida.', 'Invalid track.');
  const mine = mineR19(s, rel);
  if (mine) post(s, `nd19:${relId}:${s.week}`, fee, 'sync', `Needle drop: ${rel.title} (${who})`);
  st.nd.push({ id: `nd${++st.seq}`, rel: relId, who, y: s.year, fee }); if (st.nd.length > 40) st.nd.splice(0, st.nd.length - 40);
  cnt19(st, 'needle');
  const tx = fmtL(l('"{t}" ({y}) de {a} toca numa cena de {w}.', '"{t}" ({y}) by {a} plays in a {w} scene.'), { t: rel.title, y: rel.year, a: s.acts[rel.actId]?.name ?? '?', w: who });
  log19(s, st, tx);
  emitFact(s, { kind: 'needle_drop', actors: [rel.actId, ...(mine ? ['player'] : [])], severity: 20 + Math.round((s.acts[rel.actId]?.fame ?? 0) / 5), visibility: 'public', tags: ['score19', s.year - rel.year >= 10 ? 'old' : 'new'], text: tx, src: 'score19', data: { rel: rel.id } });
  return null;
}
registerInboxKind('sc19_needle', { label: l('Needle drop', 'Needle drop'), cat: 'deals', icon: 'film', prio: 1, goto: () => ({ area: 'media19' }),
  handle: (s, m, act) => {
    const R = m.ref ?? {}, b = CBRANDS.find((x) => x.id === String(R.b));
    if (act === 'no') return l('Recusado: o supervisor usa outra faixa.', 'Declined: the supervisor uses another track.');
    let fee = Number(R.fee);
    if (act === 'haggle') { if (!rng(s).chance(0.6)) return l('O supervisor trocou de faixa.', 'The supervisor swapped the track.'); fee = Math.round(fee * 1.4); }
    return needle19(s, String(R.rel), b?.name ?? '?', fee) ?? fmtL(l('Liberado: {f}.', 'Cleared: {f}.'), { f: usd19(fee) });
  } });
registerConseq18('ib:sc19_needle:clear', { now: l('Cachê de sync; a faixa volta a tocar.', 'Sync fee; the track plays again.'), later: [{ in: [2, 6], p: 0.3, tone: 'good', hint: l('A cena pode virar o momento da temporada.', 'The scene may become the moment of the season.'),
  fx: (f) => (f.fans(5).fame(1), l('A cena com a sua faixa viraliza: uma geração nova descobre a música.', 'The scene with your track goes viral: a new generation finds the song.')) }] });
registerConseq18('ib:sc19_needle:haggle', { now: l('40% de chance de perder a vaga.', '40% chance to lose the slot.'), later: [{ in: [6, 12], p: 0.15, tone: 'bad', hint: l('Supervisores conversam entre si.', 'Supervisors talk to each other.'),
  fx: (f) => (f.rep('commercial', -1), l('Supervisores musicais comentam que o selo complica toda liberação.', 'Music supervisors say the label makes every clearance hard.')) }] });
registerConseq18('ib:sc19_needle:no', { later: [{ in: [6, 12], p: 0.15, tone: 'mixed', hint: l('A recusa pode virar postura.', 'The refusal may become a stance.'),
  fx: (f) => (f.rep('artistic', 1), l('O artista agradece: "nossa música não é trilha de qualquer coisa".', 'The artist thanks you: "our music is not a soundtrack for anything".')) }] });

// ---------------------------------------------------------------- estreia, vendas e prêmios
/** Chance de indicação da canção-tema, com o porquê. */
export function awardOdds19(s: GameState, x: Th19): { p: number; why: WhyPart[] } {
  const a = s.acts[x.act];
  const why: WhyPart[] = [
    { label: l('Base', 'Base'), value: 0.08, fmt: 'pct' },
    { label: fmtL(l('Bilheteria/audiência ({b})', 'Box office/ratings ({b})'), { b: Math.round((x.box ?? 0) * 100) }), value: (x.box ?? 0) * 0.35, fmt: 'pct' },
    { label: fmtL(l('Fama do ato ({f})', 'Act fame ({f})'), { f: Math.round(a?.fame ?? 0) }), value: (a?.fame ?? 0) / 400, fmt: 'pct' },
    { label: fmtL(l('Nome do selo no cinema ({r})', 'Label\'s name in film ({r})'), { r: Math.round(sc18(s).rep) }), value: sc18(s).rep / 500, fmt: 'pct' },
  ];
  if (x.k !== 'orig') why.push({ label: l('Faixa existente não concorre', 'An existing track cannot compete'), value: -1, fmt: 'pct', tone: 'bad' });
  return { p: clamp(why.reduce((t, w) => t + Number(w.value ?? 0), 0), 0, 0.8), why };
}
export function scoreMonth19(s: GameState): void {
  const st = scr19(s), r = rng(s);
  for (const x of st.th) {
    const a = s.acts[x.act];
    if (x.box === undefined && x.prem <= s.week) {
      x.box = clamp(r.normal(0.45, 0.2) + (a?.fame ?? 0) / 400, 0.05, 1);
      x.base = Math.round(8000 * x.box * (x.k === 'orig' ? 1.3 : 0.8) * (0.6 + (a?.fame ?? 30) / 100)); x.mo = 0; x.u = 0;
      if (a) a.fame = clamp(a.fame + x.box * 3, 0, 100);
      if (x.rel) { const rel = s.releases[x.rel]; if (rel) rel.hypeBoost = Math.min(0.5, (rel.hypeBoost ?? 0) + 0.1); }
      const tx = fmtL(l('Estreia de "{t}" ({m}): {b} — canção-tema de {a}.', '"{t}" premieres ({m}): {b} — theme song by {a}.'), { t: x.t, m: THMED19[x.med].name, b: x.box >= 0.6 ? l('sucesso', 'a hit') : x.box >= 0.35 ? l('público médio', 'average crowds') : l('fracasso', 'a flop'), a: a?.name ?? '?' });
      log19(s, st, tx);
      if (mineA19(a)) { logShot18(s, { k: 'premiere', act: x.act, text: tx, d: { box: Math.round(x.box * 100) / 100 } }); headline19(s, tx, x.box >= 0.6 ? 2 : 1); }
    }
    if (x.box !== undefined && (x.mo ?? 0) < 3) {
      const u = Math.round((x.base ?? 0) * 0.6 ** (x.mo ?? 0));
      x.mo = (x.mo ?? 0) + 1; x.u = (x.u ?? 0) + u;
      if (mineA19(a)) post(s, `sc19s:${x.id}:${x.mo}`, Math.round(u * money(s, s.year >= 2008 ? 0.4 : 0.9)), 'sales', `Trilha: ${x.t.pt}`);
    }
    // cerimônia: no mês da categoria, para estreias dos últimos 12 meses
    const M = THMED19[x.med];
    if (x.box !== undefined && x.aw === undefined && s.month === M.awMonth && s.year >= M.awFrom && s.week - x.prem <= 52) {
      x.aw = s.year;
      const { p } = awardOdds19(s, x);
      if (!r.chance(p)) continue;
      x.nom = 1;
      const win = r.chance(0.3 + (x.box ?? 0) * 0.2);
      if (win) x.won = 1;
      const tx = fmtL(win ? l('{a} vence o {aw} com o tema de "{t}".', '{a} wins the {aw} for the "{t}" theme.') : l('{a} é indicado ao {aw} pelo tema de "{t}".', '{a} is nominated for the {aw} for the "{t}" theme.'), { a: a?.name ?? '?', aw: M.aw, t: x.t });
      log19(s, st, tx);
      if (win) recordAward19(s, { year: s.year, category: M.aw.pt, actId: x.act, name: x.t.pt, byPlayer: mineA19(a) });
      emitFact(s, { kind: 'theme_award', actors: [x.act, ...(mineA19(a) ? ['player'] : [])], severity: win ? 60 : 38, visibility: 'public', tags: ['score19', x.med, win ? 'win' : 'nom', 'good'], text: tx, src: 'score19', data: { th: x.id } });
    }
  }
  // ofertas (no máximo uma por trimestre) e needle drops (seus e de NPCs)
  if (st.last < s.week - 12) {
    for (const id of playerActs(s)) {
      const a = s.acts[id];
      if (!a || a.fame < 30 || a.status === 'split' || (a.cancelledUntil ?? 0) > s.week || !medsNow19(s).length) continue;
      if (r.chance(0.025 + a.fame / 2000) && offerTheme(s, a, r)) { st.last = s.week; break; }
    }
  }
  if (s.year >= 1930 && r.chance(0.03)) offerNeedle(s, r);
  if (s.year >= 1955 && r.chance(0.02)) {
    const pool = Object.values(s.releases).filter((x) => !mineR19(s, x) && s.year - x.year >= 10 && x.q >= 45 && x.type === 'single');
    const rel = r.weighted(pool, (x) => (x.q / 50) ** 2), m = r.pick(medsNow19(s)), b = m && r.pick(studios(s, m));
    if (rel && b) needle19(s, rel.id, b.name, 0);
  }
  // encomendas do screen18 que começam → score_hired
  for (const c of sc18(s).list) {
    if (st.seen[c.id] || (c.st !== 'work' && c.st !== 'late')) continue;
    st.seen[c.id] = 1;
    emitFact(s, { kind: 'score_hired', actors: ['player', ...(c.who ? [c.who] : [])], severity: 25 + Math.round(c.pres * 25), visibility: 'public', tags: ['score19', 'commission', c.med, c.ap ?? 'orch'], text: fmtL(l('Trilha de "{t}" em produção ({m}).', 'Score for "{t}" in production ({m}).'), { t: c.title, m: c.med }), src: 'score19', data: { comm: c.id } });
  }
}
registerSimHook('month', 'score19', (s) => off19('score19') || scoreMonth19(s));

// ---------------------------------------------------------------- ouvintes
// needle drop: streaming/lojas (mais forte na era do streaming), fãs casuais
onFact('needle_drop', (s, f) => {
  const rel = s.releases[String(f.data?.rel ?? '')], a = s.acts[f.actors[0]];
  if (!rel || !a) return;
  const k = s.year >= 2016 ? 0.25 : 0.1;
  rel.hypeBoost = Math.min(0.5, (rel.hypeBoost ?? 0) + k);
  a.fans.casual += Math.round(800 * (1 + k * 4));
  if (mineA19(a)) link19(s, 'score', fmtL(l('Needle drop de "{t}" → streaming/lojas ×{k} e fãs casuais.', '"{t}" needle drop → streaming/stores ×{k} and casual fans.'), { t: rel.title, k: Math.round((1 + k) * 100) / 100 }));
}, 'score19:stream');
// contratado: o compositor cresce, o selo ganha nome no cinema; tema → embalo do ato
onFact('score_hired', (s, f) => {
  const st = sc18(s);
  st.rep = clamp(st.rep + 1, 0, 100);
  for (const id of f.actors) { const p = s.persons[id]; if (p?.alive && p.skills) p.skills.comp = clamp((p.skills.comp ?? 0) + 1, 0, 100); }
  const a = s.acts[f.actors[0]];
  if (a && f.tags.includes('theme')) a.momentum = clamp(a.momentum + 3, 0, 100);
}, 'score19:hire');
// prêmio: prestígio (reputação artística; o caminho "prestígio" do paths18 lê), fama, cena e manchete
onFact('theme_award', (s, f) => {
  const win = f.tags.includes('win'), a = s.acts[f.actors[0]];
  if (f.actors.includes('player')) s.player.reputation.artistic = clamp(s.player.reputation.artistic + (win ? 3 : 1), 0, 100);
  if (a) a.fame = clamp(a.fame + (win ? 3 : 1), 0, 100);
  sc18(s).rep = clamp(sc18(s).rep + (win ? 5 : 2), 0, 100);
  headline19(s, f.text, win ? 3 : 2);
  if (mineA19(a)) { logShot18(s, { k: 'premiere', act: a.id, text: f.text, d: { box: win ? 1 : 0.6 } }); link19(s, 'score', fmtL(l('Canção-tema {w}: reputação artística +{r}, nome no cinema +{c}.', 'Theme song {w}: artistic reputation +{r}, film name +{c}.'), { w: win ? l('premiada', 'wins') : l('indicada', 'nominated'), r: win ? 3 : 1, c: win ? 5 : 2 })); }
}, 'score19:prestige');

// ---------------------------------------------------------------- calendário e porquê
registerDeadline('score19', (s, from, to) => scr19(s).th.filter((x) => x.box === undefined && x.prem >= from && x.prem <= to && mineA19(s.acts[x.act])).map((x) => ({
  id: `score19-${x.id}`, w: x.prem, kind: 'release' as const, t: fmtL(l('Estreia de "{t}" (tema de {a})', '"{t}" premieres ({a} theme)'), { t: x.t, a: s.acts[x.act]?.name ?? '?' }), tone: 'info' as const, goto: { area: 'media19' } })));
registerExplain('sc19.award', (s, c) => {
  const x = scr19(s).th.find((y) => y.id === String(c.th ?? ''));
  if (!x) return null;
  const { p, why } = awardOdds19(s, x);
  return { title: fmtL(l('Chance de indicação: "{t}"', 'Nomination odds: "{t}"'), { t: x.t }), value: p, fmt: 'pct', parts: why, note: fmtL(l('{aw}, em {m}/{y}+. Indicada, vence ~30–50% das vezes.', '{aw}, month {m}, {y}+. Once nominated it wins ~30–50% of the time.'), { aw: THMED19[x.med].aw, m: THMED19[x.med].awMonth + 1, y: THMED19[x.med].awFrom }) };
});
