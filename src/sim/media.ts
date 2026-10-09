// Mídia (GDD §14, §18): críticos com viés próprio, TV, capas de revista, assessoria de imprensa,
// crises de relações públicas com prazo em dias, cancelamento e censura por país e era.

import { clamp, type Rng } from '../core/rng';
import { cityById, familyOf, l, type L, type MarketId } from '../data/world';
import { registerEvents, type EventDef } from './events';
import type { Act, GameState, Release } from './types';
import type { Crisis, Review } from './xtypes';
import { buildReviews } from './reviews';
import { coverCriticBonus } from './covers';
import { REGIONAL_CRITICS } from '../data/critics8';
import { criticRelBonus } from './criticrel';
import { fmtL, hasTech, money, nextId, notify, playerActs, post, remember } from './util';

export interface CriticDef {
  name: string;
  outlet: string;
  from: number;
  to: number;
  favors: string[]; // famílias
  dislikes: string[];
  mainstream: number; // −1 underground … +1 mainstream
  harsh: number; // 0..1
  prestige: number;
  realRef?: string;
  /** rodada 8: identificador e região do veículo ('global' = internacional) */
  id?: string;
  region?: MarketId | 'global';
}

const C = (name: string, outlet: string, from: number, to: number, favors: string[], dislikes: string[], mainstream: number, harsh: number, prestige: number, realRef?: string): CriticDef =>
  ({ name, outlet, from, to, favors, dislikes, mainstream, harsh, prestige, realRef });

export let CRITICS: CriticDef[] = [
  C('Ambrose Tull', 'Gazeta do Fonógrafo', 1920, 1955, ['blues_jazz', 'pop'], ['rock'], 0.4, 0.5, 60),
  C('Lídia Monforte', 'Revista do Rádio', 1925, 1965, ['brazil', 'latin', 'pop'], [], 0.6, 0.3, 55, 'Revista do Rádio'),
  C('Harold Finch', 'Melody Weekly', 1950, 1995, ['rock', 'pop'], ['country'], 0.3, 0.6, 70, 'Melody Maker'),
  C('Dora Kessler', 'Rolling Sound', 1967, 2040, ['rock', 'folk', 'soul'], ['electronic'], 0.2, 0.55, 85, 'Rolling Stone'),
  C('Lester Vance', 'Creem & Static', 1969, 1990, ['rock'], ['pop'], -0.6, 0.85, 72, 'Creem'),
  C('Marisa Okafor', 'Pulse Africa', 1970, 2040, ['african', 'caribbean'], [], -0.1, 0.4, 60),
  C('Jun Takeda', 'Oto Magazine', 1975, 2040, ['asian', 'electronic'], ['country'], 0, 0.5, 62),
  C('Beto Salgado', 'Bizz Nacional', 1985, 2005, ['brazil', 'rock'], ['pop'], -0.2, 0.65, 68, 'Bizz'),
  C('Nina Ward', 'Spin Cycle', 1985, 2015, ['rock', 'hiphop'], ['country'], -0.3, 0.6, 70, 'Spin'),
  C('Quentin Aldo', 'The Sourcebook', 1988, 2040, ['hiphop'], ['rock'], 0.1, 0.55, 75, 'The Source'),
  C('Ivy Marchetti', 'Pitchfolk', 1996, 2040, ['rock', 'electronic', 'folk'], ['pop', 'country'], -0.8, 0.8, 82, 'Pitchfork'),
  C('Tomás Reyes', 'Ritmo Latino', 1990, 2040, ['latin', 'caribbean'], [], 0.5, 0.35, 58),
  C('Adele Fontaine', 'Les Écoutes', 1955, 2040, ['pop', 'electronic'], [], 0.2, 0.5, 66, 'Les Inrockuptibles'),
  C('Sam Okoye', 'Stream Report', 2010, 2040, ['pop', 'hiphop', 'african'], [], 0.8, 0.3, 64),
  C('Ana Kurosawa', 'Neural Notes', 2030, 2040, ['electronic', 'pop'], [], 0.2, 0.5, 70),
];

export function setCritics(list: CriticDef[]): void {
  if (list.length) CRITICS = list;
}

const REGIONAL: CriticDef[] = REGIONAL_CRITICS.map((c) => ({ name: c.name, outlet: c.outlet, from: c.from, to: c.to, favors: c.favors, dislikes: c.dislikes, mainstream: c.mainstream, harsh: c.harsh, prestige: c.prestige, realRef: c.realRef, id: c.id, region: c.region }));

/** Todos os críticos: globais (content.ts) e regionais (rodada 8). */
export function allCritics(): CriticDef[] {
  return [...CRITICS, ...REGIONAL];
}

export function activeCritics(s: GameState): CriticDef[] {
  return allCritics().filter((c) => s.year >= c.from && s.year <= c.to);
}

export function criticByName(name: string): CriticDef | undefined {
  return allCritics().find((c) => c.name === name);
}

/** Quem resenha: críticos da região de origem e dos mercados onde o disco saiu pesam mais. */
function pickCritics(s: GameState, r: Rng, rel: Release, act: Act, n: number): CriticDef[] {
  const home = cityById[act.city]?.market;
  const markets = new Set<string>([...(home ? [home] : []), ...rel.territories]);
  const pool = activeCritics(s).map((c) => ({ c, w: (c.region === home ? 3 : c.region && markets.has(c.region) ? 1.6 : !c.region || c.region === 'global' ? 1.2 : 0.25) * (0.6 + c.prestige / 100) * (0.5 + r.next()) }));
  return pool.sort((a, b) => b.w - a.w).slice(0, n).map((x) => x.c);
}

/** Resenhas de um lançamento (cada crítico com viés próprio; texto completo em reviews.ts). */
export function reviewRelease(s: GameState, r: Rng, rel: Release): Review[] {
  const act = s.acts[rel.actId];
  if (!act) return [];
  const crit = activeCritics(s);
  const n = Math.min(crit.length, rel.owner === 'player' ? 4 : 2);
  const picks = pickCritics(s, r, rel, act, n);
  // críticas completas: nota por aspecto, texto montado na hora (rodada 5); rivais ficam só com números
  const out: Review[] = buildReviews(s, r, rel, picks);
  const cb = coverCriticBonus(rel);
  const mineRel = rel.owner === 'player' || !!act.playerBand;
  for (const x of out) {
    const bonus = cb + (mineRel ? criticRelBonus(s, x.critic) : 0);
    if (bonus) x.score = clamp(Math.round((x.score + bonus) * 10) / 10, 0, 10);
  }
  if (rel.owner !== 'player' && !act.playerBand) for (const x of out) { delete x.ctx; delete x.best; delete x.worst; }
  s.reviews[rel.id] = out;
  const avg = out.reduce((t, x) => t + x.score, 0) / Math.max(1, out.length);
  if (out.length) { rel.critic = Math.round(avg * 10); rel.criticN = out.length; }
  // crítica afeta prestígio e um pouco o apelo (não compra hit)
  rel.appeal *= 0.92 + avg / 60;
  if (act.image) act.image.artistic = clamp(act.image.artistic + (avg - 6) * 1.2, 0, 100);
  if (rel.owner === 'player') s.player.reputation.artistic = clamp(s.player.reputation.artistic + (avg - 6) * 0.4, 0, 100);
  return out;
}

export function avgReview(s: GameState, relId: string): number | undefined {
  const rv = s.reviews[relId];
  if (!rv?.length) return undefined;
  return rv.reduce((t, x) => t + x.score, 0) / rv.length;
}

// ---------- TV, capas e assessoria ----------

export function tvAppearance(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (!hasTech(s, 'tv_music')) return l('Ainda não existe TV musical.', 'Music TV does not exist yet.');
  if (act.fame < 15) return l('A TV só chama quem tem algum reconhecimento (fama 15+).', 'TV only books acts with some recognition (fame 15+).');
  const key = `tv:${actId}`;
  if (s.flags[key] && s.week - s.flags[key] < 12) return l('Uma aparição por trimestre.', 'One appearance per quarter.');
  const cost = money(s, 1500 + act.fame * 40);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, key, -cost, 'marketing', `TV: ${act.name}`);
  s.flags[key] = s.week;
  act.fame = clamp(act.fame + 1.5, 0, 100);
  act.fans.casual += Math.round(2000 + act.fame * 300);
  act.momentum = clamp(act.momentum + 12, 0, 100);
  if (act.image) act.image.popularity = clamp(act.image.popularity + 3, 0, 100);
  remember(s, 'tv', fmtL(l('{a} se apresenta na TV.', '{a} performs on TV.'), { a: act.name }), { actId });
  return null;
}

export function magazineCover(s: GameState, r: Rng, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  const key = `cover:${actId}`;
  if (s.flags[key] && s.week - s.flags[key] < 26) return l('Uma capa por semestre.', 'One cover per half-year.');
  const cost = money(s, 800);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, key, -cost, 'marketing', `Assessoria para capa: ${act.name}`);
  s.flags[key] = s.week;
  const pr = s.prAgency?.tier ?? 0;
  const chance = clamp(0.15 + act.fame / 120 + pr * 0.12 + (act.image?.publicImage ?? 50) / 400, 0.05, 0.9);
  if (!r.chance(chance)) return l('A revista preferiu outro artista este mês.', 'The magazine went with another artist this month.');
  const c = r.pick(activeCritics(s));
  act.fame = clamp(act.fame + 2, 0, 100);
  act.fans.casual += Math.round(1500 + act.fame * 200);
  if (act.image) act.image.publicImage = clamp(act.image.publicImage + 4, 0, 100);
  remember(s, 'magazine_cover', fmtL(l('{a} é capa da {m}.', '{a} lands the cover of {m}.'), { a: act.name, m: c?.outlet ?? 'Rolling Sound' }), { actId, important: true });
  return null;
}

export const PR_AGENCIES = [
  { name: 'Eco & Associados', tier: 1, monthly: 1200 },
  { name: 'Prisma Comunicação', tier: 2, monthly: 3500 },
  { name: 'Halo Global PR', tier: 3, monthly: 9000 },
];

export function hirePrAgency(s: GameState, tier: number): L | null {
  const a = PR_AGENCIES.find((x) => x.tier === tier);
  if (!a) {
    s.prAgency = undefined;
    return null;
  }
  s.prAgency = { name: a.name, tier: a.tier, monthly: money(s, a.monthly) };
  return null;
}

// ---------- Crises ----------

export function openCrisis(s: GameState, act: Act, kind: Crisis['kind'], severity: number, text: L): Crisis {
  const day = s.day + s.clock.dayInMonth;
  const c: Crisis = { id: nextId(s, 'cr'), actId: act.id, kind, severity, startDay: day, deadlineDay: day + 5, text };
  s.crises.push(c);
  act.scandals += 1;
  notify(s, fmtL(l('CRISE ({a}): {t} Responda em até 5 dias.', 'CRISIS ({a}): {t} Respond within 5 days.'), { a: act.name, t: text }), 'bad');
  return c;
}

export function respondCrisis(s: GameState, r: Rng, crisisId: string, resp: NonNullable<Crisis['response']>): L {
  const c = s.crises.find((x) => x.id === crisisId);
  if (!c || c.resolved) return l('Crise encerrada.', 'Crisis closed.');
  const act = s.acts[c.actId];
  c.response = resp;
  c.resolved = true;
  const pr = (s.prAgency?.tier ?? 0) * 8 + (s.player.staff.some((x) => x.role === 'publicist') ? 8 : 0);
  // a mesma resposta funciona diferente conforme gravidade e assessoria
  const score = { apologize: 55, deny: 30, silence: 40, counter: 35, charity: 50 }[resp] + pr - c.severity / 2 + r.normal(0, 12);
  const img = act?.image;
  if (score > 45) {
    if (img) img.publicImage = clamp(img.publicImage - c.severity / 12, 0, 100);
    if (resp === 'charity') post(s, `charity:${c.id}`, -money(s, 3000), 'marketing', 'Doação pública');
    s.player.stats.scandalsSurvived += 1;
    return l('A resposta funcionou: o caso esfriou em poucos dias.', 'The response worked: the story cooled in a few days.');
  }
  if (img) img.publicImage = clamp(img.publicImage - c.severity / 5, 0, 100);
  if (act) {
    act.momentum = clamp(act.momentum - c.severity / 4, 0, 100);
    const f = s.fandoms[act.id];
    if (f) f.haters += Math.round(c.severity * 60);
    if (c.severity > 70 && resp === 'deny') act.cancelledUntil = s.week + 12;
  }
  return l('A resposta piorou as coisas: o assunto cresceu.', 'The response backfired: the story grew.');
}

/** Dia a dia das crises: quem não responde no prazo sofre o efeito pleno. */
export function crisisDay(s: GameState, r: Rng, day: number): void {
  for (const c of s.crises) {
    if (c.resolved || day < c.deadlineDay) continue;
    const act = s.acts[c.actId];
    c.resolved = true;
    c.response = 'silence';
    if (act) {
      if (act.image) act.image.publicImage = clamp(act.image.publicImage - c.severity / 4, 0, 100);
      act.momentum = clamp(act.momentum - c.severity / 3, 0, 100);
      if (c.severity > 65 && r.chance(0.5)) {
        act.cancelledUntil = s.week + 16;
        remember(s, 'cancelled', fmtL(l('{a} é "cancelado": parceiros se afastam por meses.', '{a} gets "cancelled": partners step away for months.'), { a: act.name }), { actId: act.id, important: true });
      }
    }
    s.daily.push({ day, kind: 'crisis', actId: c.actId, tone: 'bad', text: fmtL(l('Sem resposta, a crise de {a} chegou ao auge.', 'With no response, {a}\'s crisis peaked.'), { a: act?.name ?? '' }) });
  }
  s.crises = s.crises.filter((c) => !c.resolved || day - c.startDay < 60).slice(-20);
}

// ---------- Censura por país e era ----------

export interface CensorRule {
  id: string;
  name: L;
  markets: MarketId[];
  from: number;
  to: number;
  level: number;
  banned: string[]; // famílias ou temas
}

export let CENSOR_RULES: CensorRule[] = [
  { id: 'br_dict', name: l('Censura do regime militar (Brasil)', 'Military regime censorship (Brazil)'), markets: ['br'], from: 1968, to: 1985, level: 0.6, banned: ['rock', 'political'] },
  { id: 'latam_dict', name: l('Ditaduras no Cone Sul', 'Southern Cone dictatorships'), markets: ['latam'], from: 1973, to: 1989, level: 0.5, banned: ['political', 'folk'] },
  { id: 'eastbloc', name: l('Cortina de Ferro', 'Iron Curtain'), markets: ['eu'], from: 1949, to: 1989, level: 0.25, banned: ['rock'] },
  { id: 'iran', name: l('Restrições no Oriente Médio', 'Middle East restrictions'), markets: ['asia'], from: 1979, to: 2040, level: 0.2, banned: ['rock', 'electronic'] },
  { id: 'hays', name: l('Código de decência do rádio', 'Radio decency code'), markets: ['na'], from: 1934, to: 1960, level: 0.3, banned: ['blues_jazz'] },
  { id: 'pmrc', name: l('Selo de advertência parental', 'Parental advisory crusade'), markets: ['na'], from: 1985, to: 1995, level: 0.15, banned: ['hiphop', 'rock'] },
];

export function setCensorRules(list: CensorRule[]): void {
  if (list.length) CENSOR_RULES = list;
}

export function activeCensorship(s: GameState): CensorRule[] {
  return CENSOR_RULES.filter((c) => s.year >= c.from && s.year <= c.to);
}

/** Lançamento novo pode ser barrado em mercados com censura ativa; o selo pode recorrer. */
export function censorCheck(s: GameState, r: Rng, rel: Release): void {
  const act = s.acts[rel.actId];
  if (!act) return;
  const fam = familyOf(act.genre);
  const political = act.members.some((id) => s.persons[id]?.traits.includes('engaged'));
  for (const rule of activeCensorship(s)) {
    const hit = rule.banned.includes(fam) || (political && rule.banned.includes('political'));
    if (!hit) continue;
    for (const m of rule.markets) {
      if (!rel.territories.includes(m)) continue;
      if (!r.chance(rule.level)) continue;
      rel.territories = rel.territories.filter((x) => x !== m);
      s.bans.push({ releaseId: rel.id, market: m, reason: rule.name, week: s.week });
      if (rel.owner === 'player' || act.playerBand) {
        notify(s, fmtL(l('"{t}" foi censurado: {r}.', '"{t}" was censored: {r}.'), { t: rel.title, r: rule.name }), 'bad');
        remember(s, 'censored', fmtL(l('"{t}" ({a}) é proibido — {r}.', '"{t}" ({a}) is banned — {r}.'), { t: rel.title, a: act.name, r: rule.name }), { actId: act.id, important: true });
        // proibição também gera curiosidade no underground
        act.fans.core += Math.round(act.fans.core * 0.05);
        if (act.image) act.image.artistic = clamp(act.image.artistic + 3, 0, 100);
      }
    }
  }
  if (s.bans.length > 60) s.bans = s.bans.slice(-60);
}

export function appealBan(s: GameState, r: Rng, releaseId: string, market: MarketId): L {
  const b = s.bans.find((x) => x.releaseId === releaseId && x.market === market);
  if (!b) return l('Nada a recorrer.', 'Nothing to appeal.');
  const cost = money(s, 4000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `appeal:${releaseId}:${market}`, -cost, 'legal', 'Recurso contra censura');
  const legal = s.player.staff.some((x) => x.role === 'legal') ? 0.2 : 0;
  if (r.chance(0.3 + legal)) {
    s.bans = s.bans.filter((x) => x !== b);
    s.releases[releaseId]?.territories.push(market);
    return l('Recurso aceito: o disco volta às lojas.', 'Appeal granted: the record is back in stores.');
  }
  return l('Recurso negado.', 'Appeal denied.');
}

// ---------- Eventos de mídia ----------
const MEDIA_EVENTS: EventDef[] = [
  {
    id: 'pr_scandal_crisis', cat: 'scandal', tone: 'bad', tags: ['controversy'], cooldown: 10,
    find: (s, r) => {
      const list = playerActs(s).map((id) => s.acts[id]).filter((a) => a.fame > 20 && !a.rs);
      if (!list.length || !r.chance(0.3)) return null;
      return { act: r.pick(list).id };
    },
    title: l('Manchete negativa sobre {act}', 'Negative headline about {act}'),
    text: l('Um tabloide publicou uma história constrangedora sobre {act}. A crise começa agora.', 'A tabloid ran an embarrassing story about {act}. The crisis starts now.'),
    options: [
      { id: 'open', label: l('Abrir sala de crise (5 dias)', 'Open a crisis room (5 days)'), apply: (s, r, c) => { const a = s.acts[String(c.act)]; openCrisis(s, a, 'scandal', r.int(30, 80), l('Tabloide publica história constrangedora.', 'Tabloid runs an embarrassing story.')); } },
    ],
  },
];
registerEvents(MEDIA_EVENTS);

export function mediaMonth(s: GameState, r: Rng): void {
  if (s.prAgency) post(s, 'pr_agency', -s.prAgency.monthly, 'marketing', `Assessoria ${s.prAgency.name}`);
  // resenhas dos lançamentos do mês (jogador e principais rivais)
  for (const rel of Object.values(s.releases)) {
    if (s.reviews[rel.id] || s.week - rel.week > 5) continue;
    const act = s.acts[rel.actId];
    if (rel.owner === 'player' || act?.playerBand || (act && act.fame > 40)) reviewRelease(s, r, rel);
    if (rel.owner === 'player' || act?.playerBand) censorCheck(s, r, rel);
  }
  // limpa resenhas antigas de terceiros
  const keys = Object.keys(s.reviews);
  if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete s.reviews[k];
  for (const a of Object.values(s.acts)) if (a.cancelledUntil && a.cancelledUntil < s.week) a.cancelledUntil = undefined;
}
