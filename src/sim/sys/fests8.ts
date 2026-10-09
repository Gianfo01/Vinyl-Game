// Festivais com line-up (rodada 8). Cada festival ativo no ano ganha uma edição com data (mês), line-up
// em três faixas (headliners, tarde, abertura) montado com os artistas do mundo que combinam com o
// foco do festival, e histórico das edições passadas. O jogador pode oferecer seus artistas (negociação
// na hora: aceita, contraproposta de faixa/cachê ou recusa) e os festivais também convidam por conta
// própria. Na data, quem toca ganha cachê, fama e fãs — os artistas de outros selos também.

import { clamp, hashString, type Rng } from '../../core/rng';
import { FESTIVALS, type Festival } from '../../data/catalog';
import { cityById, familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember, staffSkill } from '../util';

export type FestTier = 'headline' | 'afternoon' | 'opening';
export const TIER_ORDER: FestTier[] = ['headline', 'afternoon', 'opening'];
export const TIER_NAME: Record<FestTier, L> = { headline: l('Headliner', 'Headliner'), afternoon: l('Palco da tarde', 'Afternoon slot'), opening: l('Abertura', 'Opening slot') };

export interface FestSlot { actId: string; tier: FestTier; fee: number }
export interface FestEdition8 { fi: number; year: number; month: number; lineup: FestSlot[]; done: boolean; crowd?: number }
export interface FestPast { year: number; head: string[]; crowd: number; mine: string[] }
export interface FestInvite8 { id: string; fi: number; actId: string; tier: FestTier; fee: number; expires: number }
export interface Fest8State {
  year: number;
  editions: FestEdition8[];
  past: Record<number, FestPast[]>;
  invites: FestInvite8[];
  /** recusas recentes: "fi:actId" -> semana em que pode tentar de novo */
  cooldown: Record<string, number>;
}

declare module '../ext4' { interface Ext4 { fest8: Fest8State } }
registerExt4('fest8', () => ({ year: 0, editions: [], past: {}, invites: [], cooldown: {} }));
export const fest8 = (s: GameState): Fest8State => (s as unknown as { x4: { fest8: Fest8State } }).x4.fest8;

export function festActive(f: Festival, year: number): boolean {
  return f.start <= year && (f.end === undefined || f.end >= year);
}

/** Mês da edição (0 = janeiro): o do festival ou um verão determinístico. */
export function festMonth(f: Festival, fi: number): number {
  if (f.month !== undefined) return f.month;
  if (f.vibe === 'carnival') return 1;
  return 4 + (hashString(`fm:${fi}`) % 4);
}

export function festCapacity(f: Festival): number {
  return f.capacity ?? Math.round(4000 + f.prestige * f.prestige * 9);
}

const slotsFor = (f: Festival): Record<FestTier, number> =>
  f.scouting ? { headline: 1, afternoon: 3, opening: 6 } : f.prestige >= 85 ? { headline: 3, afternoon: 6, opening: 6 } : f.prestige >= 65 ? { headline: 2, afternoon: 5, opening: 5 } : { headline: 1, afternoon: 4, opening: 4 };

const fits = (f: Festival, act: Act) => !f.focus.length || f.focus.includes(familyOf(act.genre));

/** Cachê justo (centavos) por faixa, prestígio do festival e fama do ato. */
export function festFee(s: GameState, f: Festival, act: Act, tier: FestTier): number {
  const mult = tier === 'headline' ? 1 : tier === 'afternoon' ? 0.33 : 0.12;
  return money(s, Math.round((250 + act.fame * act.fame * 14) * mult * (0.5 + f.prestige / 100)));
}

/** Faixa que o festival oferece a este ato (ou null): fama, rede, booking e histórico com o festival. */
export function festTierFor(s: GameState, f: Festival, fi: number, act: Act): FestTier | null {
  if (!fits(f, act)) return null;
  const st = fest8(s);
  const returning = (st.past[fi] ?? []).some((p) => p.mine.includes(act.name)) ? 6 : 0;
  const score = act.fame + act.networking * 0.4 + (act.owner === 'player' || act.playerBand ? staffSkill(s, 'booking') / 8 : 0) + returning + (f.scouting && act.fame < 30 ? 25 : 0);
  if (score >= f.prestige + 5) return 'headline';
  if (score >= f.prestige - 25) return 'afternoon';
  if (score >= f.prestige - 50) return 'opening';
  return null;
}

// ---------------------------------------------------------------- line-up do ano

function buildYear(s: GameState, r: Rng): void {
  const st = fest8(s);
  st.year = s.year;
  st.editions = [];
  st.invites = st.invites.filter((x) => x.expires > s.week);
  const mine = new Set(playerActs(s));
  const pool = Object.values(s.acts)
    .filter((a) => (a.status === 'active' || a.status === 'emerging') && !a.deceased && !mine.has(a.id) && a.members.length && a.fame > 2)
    .sort((a, b) => b.fame - a.fame);
  FESTIVALS.forEach((f, fi) => {
    if (!festActive(f, s.year)) return;
    const month = festMonth(f, fi);
    const home = cityById[f.city]?.market;
    const cands = pool.filter((a) => fits(f, a)).slice(0, 160);
    const used = new Set<string>();
    const lineup: FestSlot[] = [];
    const want = slotsFor(f);
    for (const tier of TIER_ORDER) {
      const lo = tier === 'headline' ? f.prestige - 15 : tier === 'afternoon' ? f.prestige - 45 : 0;
      const hi = tier === 'headline' ? 101 : tier === 'afternoon' ? f.prestige + 10 : f.prestige - 20;
      let list = cands.filter((a) => !used.has(a.id) && a.fame >= lo && a.fame <= hi);
      if (list.length < want[tier]) list = cands.filter((a) => !used.has(a.id));
      // atos da casa entram com mais facilidade
      const ranked = list.map((a) => ({ a, k: a.fame * (cityById[a.city]?.market === home ? 1.35 : 1) * (0.7 + r.next() * 0.6) })).sort((x, y) => y.k - x.k);
      for (const { a } of ranked.slice(0, want[tier])) {
        used.add(a.id);
        lineup.push({ actId: a.id, tier, fee: festFee(s, f, a, tier) });
      }
    }
    st.editions.push({ fi, year: s.year, month, lineup, done: month < s.month });
  });
}

/** Edição deste ano de um festival (se houver). */
export function editionOf(s: GameState, fi: number): FestEdition8 | undefined {
  return fest8(s).editions.find((e) => e.fi === fi);
}

// ---------------------------------------------------------------- negociação

export type PitchResult = { result: 'accepted' | 'counter' | 'rejected'; tier?: FestTier; fee?: number; text: L };

/** Oferece um artista seu para a edição deste ano. Resposta imediata. */
export function pitchAct(s: GameState, r: Rng, fi: number, actId: string, tier: FestTier, fee: number): PitchResult {
  const f = FESTIVALS[fi];
  const ed = editionOf(s, fi);
  const act = s.acts[actId];
  const st = fest8(s);
  if (!f || !ed || !act) return { result: 'rejected', text: l('Festival ou artista indisponível.', 'Festival or act unavailable.') };
  if (ed.done || ed.month <= s.month) return { result: 'rejected', text: l('O line-up desta edição já está fechado.', 'This edition\'s line-up is closed.') };
  if (ed.lineup.some((x) => x.actId === actId)) return { result: 'rejected', text: l('Já está no line-up.', 'Already on the line-up.') };
  const key = `${fi}:${actId}`;
  if ((st.cooldown[key] ?? 0) > s.week) return { result: 'rejected', text: l('A produção pediu para não insistir agora.', 'The producers asked you not to insist right now.') };
  if (!fits(f, act)) {
    st.cooldown[key] = s.week + 8;
    return { result: 'rejected', text: fmtL(l('{f} não combina com o som de {a}.', '{f} does not fit {a}\'s sound.'), { f: f.name, a: act.name }) };
  }
  const can = festTierFor(s, f, fi, act);
  const fair = (t0: FestTier) => festFee(s, f, act, t0);
  if (!can) {
    st.cooldown[key] = s.week + 8;
    return { result: 'rejected', text: fmtL(l('{a} ainda é pequeno demais para {f}.', '{a} is still too small for {f}.'), { a: act.name, f: f.name }) };
  }
  const want = TIER_ORDER.indexOf(tier);
  const got = TIER_ORDER.indexOf(can);
  if (want < got) {
    // pediu uma faixa acima: contraproposta com a faixa possível
    return { result: 'counter', tier: can, fee: fair(can), text: fmtL(l('{f} topa {a} como "{t}" por {v}.', '{f} would take {a} as "{t}" for {v}.'), { f: f.name, a: act.name, t: TIER_NAME[can], v: `$${Math.round(fair(can) / 100).toLocaleString('pt-BR')}` }) };
  }
  const ratio = fee / Math.max(1, fair(tier));
  const booking = staffSkill(s, 'booking') / 400;
  if (ratio <= 1.05 + booking || (ratio <= 1.3 + booking && r.chance(0.5))) {
    addToLineup(s, ed, actId, tier, fee);
    return { result: 'accepted', text: fmtL(l('Fechado: {a} toca no {f} ({t}).', 'Deal: {a} plays {f} ({t}).'), { a: act.name, f: f.name, t: TIER_NAME[tier] }) };
  }
  if (ratio <= 2) return { result: 'counter', tier, fee: Math.round((fee + fair(tier)) / 2 * 0.9), text: fmtL(l('{f} acha o cachê alto e propõe outro valor.', '{f} finds the fee high and proposes another amount.'), { f: f.name }) };
  st.cooldown[key] = s.week + 6;
  return { result: 'rejected', text: fmtL(l('{f} recusou: cachê fora da realidade.', '{f} declined: the fee is unrealistic.'), { f: f.name }) };
}

function addToLineup(s: GameState, ed: FestEdition8, actId: string, tier: FestTier, fee: number): void {
  // o festival abre espaço tirando o último nome de terceiros daquela faixa
  const mine = new Set(playerActs(s));
  const same = ed.lineup.filter((x) => x.tier === tier && !mine.has(x.actId));
  const cap = slotsFor(FESTIVALS[ed.fi])[tier];
  if (ed.lineup.filter((x) => x.tier === tier).length >= cap && same.length) ed.lineup.splice(ed.lineup.indexOf(same[same.length - 1]), 1);
  ed.lineup.push({ actId, tier, fee });
  ed.lineup.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
}

export function acceptInvite(s: GameState, id: string): L | null {
  const st = fest8(s);
  const inv = st.invites.find((x) => x.id === id);
  if (!inv) return l('Convite expirado.', 'Invitation expired.');
  const ed = editionOf(s, inv.fi);
  st.invites = st.invites.filter((x) => x.id !== id);
  if (!ed || ed.done) return l('A edição já aconteceu.', 'The edition already happened.');
  if (!ed.lineup.some((x) => x.actId === inv.actId)) addToLineup(s, ed, inv.actId, inv.tier, inv.fee);
  return null;
}

export function declineInvite(s: GameState, id: string): void {
  const st = fest8(s);
  st.invites = st.invites.filter((x) => x.id !== id);
}

/** Retira um artista seu do line-up (multa de 25% do cachê e arranhão na relação). */
export function withdraw(s: GameState, fi: number, actId: string): void {
  const ed = editionOf(s, fi);
  if (!ed || ed.done) return;
  const slot = ed.lineup.find((x) => x.actId === actId);
  if (!slot) return;
  ed.lineup = ed.lineup.filter((x) => x !== slot);
  post(s, `festwd:${fi}:${actId}`, -Math.round(slot.fee * 0.25), 'live', `Multa por cancelar no ${FESTIVALS[fi].name}`);
  fest8(s).cooldown[`${fi}:${actId}`] = s.week + 52;
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
}

// ---------------------------------------------------------------- convites orgânicos e edições

function invites(s: GameState, r: Rng): void {
  const st = fest8(s);
  st.invites = st.invites.filter((x) => x.expires > s.week);
  if (st.invites.length >= 6) return;
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
  for (const ed of st.editions) {
    if (ed.done || ed.month - s.month < 1 || ed.month - s.month > 4) continue;
    const f = FESTIVALS[ed.fi];
    for (const a of mine) {
      if (ed.lineup.some((x) => x.actId === a.id) || st.invites.some((x) => x.actId === a.id && x.fi === ed.fi)) continue;
      const tier = festTierFor(s, f, ed.fi, a);
      if (!tier || !r.chance(0.12 + a.fame / 400)) continue;
      st.invites.push({ id: nextId(s, 'fi'), fi: ed.fi, actId: a.id, tier, fee: festFee(s, f, a, tier), expires: s.week + 4 });
      notify(s, fmtL(l('Convite: {f} quer {a} ({t}).', 'Invitation: {f} wants {a} ({t}).'), { f: f.name, a: a.name, t: TIER_NAME[tier] }), 'event');
      if (st.invites.length >= 6) return;
    }
  }
}

function runEditions(s: GameState, r: Rng): void {
  const st = fest8(s);
  const mine = new Set(playerActs(s));
  for (const ed of st.editions) {
    if (ed.done || ed.month !== s.month) continue;
    ed.done = true;
    const f = FESTIVALS[ed.fi];
    const heads = ed.lineup.filter((x) => x.tier === 'headline').map((x) => s.acts[x.actId]).filter(Boolean);
    const pull = heads.reduce((t, a) => t + a.fame, 0) / Math.max(1, heads.length);
    const crowd = Math.round(festCapacity(f) * clamp(0.45 + pull / 180 + r.normal(0, 0.06), 0.2, 1));
    ed.crowd = crowd;
    const playedMine: string[] = [];
    for (const slot of ed.lineup) {
      const act = s.acts[slot.actId];
      if (!act || act.status === 'retired' || act.status === 'split') continue;
      const w = slot.tier === 'headline' ? 1 : slot.tier === 'afternoon' ? 0.55 : 0.3;
      act.fame = clamp(act.fame + w * (f.prestige / 100) * 1.2 * (1 - act.fame / 120), 0, 100);
      act.fans.casual += Math.round(crowd * 0.05 * w);
      act.fans.active += Math.round(crowd * 0.008 * w);
      act.momentum = clamp(act.momentum + 4 * w, 0, 100);
      if (mine.has(act.id)) {
        playedMine.push(act.name);
        post(s, `fest8:${ed.fi}:${act.id}:${s.year}`, slot.fee, 'live', `Cachê no ${f.name}`);
        s.player.stats.festivals += 1;
        if (slot.tier === 'headline') s.player.stats.headlines += 1;
        for (const id of act.members) { const p = s.persons[id]; if (p?.alive) p.morale = clamp(p.morale + 3 * w, 0, 100); }
      } else act.cash += slot.fee;
    }
    const past = (st.past[ed.fi] ??= []);
    past.unshift({ year: s.year, head: heads.map((a) => a.name).slice(0, 3), crowd, mine: playedMine });
    if (past.length > 8) past.length = 8;
    if (playedMine.length) {
      remember(s, 'festival8', fmtL(l('{f} {y}: {a} no palco para {c} pessoas.', '{f} {y}: {a} on stage for {c} people.'), { f: f.name, y: s.year, a: playedMine.join(', '), c: crowd.toLocaleString('pt-BR') }), { important: f.prestige >= 80 });
      notify(s, fmtL(l('{f}: {a} tocou para {c} pessoas.', '{f}: {a} played for {c} people.'), { f: f.name, a: playedMine.join(', '), c: crowd.toLocaleString('pt-BR') }), 'good');
    }
  }
}

registerSimHook('newgame', 'fest8', (s, r) => buildYear(s, r));
registerSimHook('month', 'fest8', (s, r) => {
  if (fest8(s).year !== s.year) buildYear(s, r);
  runEditions(s, r);
  invites(s, r);
});
