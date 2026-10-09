// Rodada 14 — empresários reais (e equivalentes ficcionais). Cada um é uma pessoa completa na ficha
// unificada (chave 'e:<id>'), aparece só nos anos em que atuou, representa artistas (os clientes históricos
// quando o ato existe no mundo e o ano bate; depois, quem ele mesmo contrata), negocia por eles nas suas
// propostas (exigências do estilo, negociação contra a sua), indica clientes a quem confia, rouba ou
// envenena artistas de quem é desafeto, faz exigências em renovações (eventos) e compete com a sua
// carreira de empresário (ventures9/manager11) pelos mesmos clientes. Gerador próprio (semente + mês).

import { Rng, clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { MGR_STYLE, REAL_MGRS, mgrById, type MgrStyle, type RealMgr } from '../../data/managers14';
import { cityById, familyOf, l, type L } from '../../data/world';
import { expectedAdvance } from '../contracts';
import { watchAct } from '../scouting';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { langForCity, personName } from '../people';
import type { Act, GameState, Offer } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { poachName11 } from './manager11';
import { labelNeg, opine, opinionOf, registerPer13 } from './persona13';
import { ownerOf } from './people/owner';
import { realDataOf } from './realworld';
import { activeAct } from './ventures12';
import { mgAdj9, ventures } from './ventures9';

// ---------------------------------------------------------------- estado

export interface Rep14 { m: string; y: number; h?: 1 }
export interface M14 {
  /** ato → empresário NPC que o representa */
  rep: Record<string, Rep14>;
  /** empresário → ano em que a rixa acaba */
  feud: Record<string, number>;
  /** ato indicado ao seu selo → [empresário, semana limite] */
  brought: Record<string, [string, number]>;
  /** ato → empresário que está tentando tirá-lo da sua carteira (manager11) */
  poach: Record<string, string>;
  cd: Record<string, number>;
  seen: Record<string, 1>;
  log: [number, number, string, L][];
}
declare module '../ext4' { interface Ext4 { managers14: M14 } }
const fresh = (): M14 => ({ rep: {}, feud: {}, brought: {}, poach: {}, cd: {}, seen: {}, log: [] });
registerExt4('managers14', fresh);
export function m14(s: GameState): M14 {
  const x = s.x4 as unknown as { managers14?: M14 };
  const st = (x.managers14 ??= fresh());
  st.rep ??= {}; st.feud ??= {}; st.brought ??= {}; st.poach ??= {}; st.cd ??= {}; st.seen ??= {}; st.log ??= [];
  return st;
}

// ---------------------------------------------------------------- quem é quem

export const mgrKey = (id: string): string => `e:${id}`;
export const mgrActive = (s: GameState, m: RealMgr): boolean => s.year >= m.from && s.year <= Math.min(m.to, m.died ?? 9999);
export const activeMgrs = (s: GameState): RealMgr[] => REAL_MGRS.filter((m) => mgrActive(s, m));
/** Já existiu (ativo agora ou no passado) — nunca mostra quem ainda não começou. */
export const knownMgr = (s: GameState, m: RealMgr): boolean => s.year >= m.from;

const NAMES = new Map<string, string>();
/** Nome real (modo nomes reais) ou um equivalente gerado, estável pela semente. */
export function mgrName(s: GameState, m: RealMgr): string {
  if (s.config.realNames) return m.name;
  const k = `${s.config.seed}|${m.id}`;
  let n = NAMES.get(k);
  if (!n) { const r = Rng.fromSeed(`${s.config.seed}|m14name|${m.id}`); n = personName(r, langForCity(m.city, r)); NAMES.set(k, n); }
  return n;
}
export const styleOf = (m: RealMgr): MgrStyle => m.style;

registerPer13('e', (s, id) => {
  const m = mgrById[id];
  if (!m) return null;
  const [ear, neg, cha, mgmt, img] = m.a;
  return {
    kind: 'manager', name: mgrName(s, m), born: m.born, city: m.city, job: 'manager',
    attrs: { ear, neg, cha, mgmt, img }, facets: m.f, sex: m.sex ?? 'm', skin: m.skin ?? 0,
    native: [MGR_STYLE[m.style][0]],
    prof: { manager: 55 + (neg + cha + mgmt) / 7.5, booking: 30 + cha * 0.4 + mgmt * 0.2, legal: neg * 0.7, anr: ear * 0.8, publicist: img * 0.5 + cha * 0.3, exec: mgmt * 0.75 },
  };
});

// ---------------------------------------------------------------- ligações com atos

function realIndex(s: GameState): Map<string, Act> {
  const out = new Map<string, Act>();
  for (const a of Object.values(s.acts)) { const n = realDataOf(a)?.n; if (n && !out.has(n)) out.set(n, a); }
  return out;
}
const isMyClient = (s: GameState, actId: string): boolean => ventures(s).mg.clients.some((c) => c.actId === actId);

/** Empresário NPC que representa o ato agora (ou nada). */
export function repOf(s: GameState, actId: string): RealMgr | null {
  const r = m14(s).rep[actId];
  const m = r && mgrById[r.m];
  return m && mgrActive(s, m) ? m : null;
}
export const rosterOf = (s: GameState, id: string): Act[] => Object.entries(m14(s).rep).filter(([, r]) => r.m === id).map(([a]) => s.acts[a]).filter(activeAct);
export const mgrCap = (m: RealMgr): number => 2 + Math.floor(m.a[3] / 30);
export const inFeud = (s: GameState, id: string): boolean => (m14(s).feud[id] ?? 0) >= s.year;
/** Clientes históricos já passados ou em curso (nunca o futuro). */
export const pastClients = (s: GameState, m: RealMgr): [string, number, number][] => m.cl.filter(([, a]) => a <= s.year).map(([n, a, b]) => [n, a, Math.min(b, s.year)]);

const log = (s: GameState, id: string, t: L) => { const st = m14(s); st.log.push([s.year, s.month, id, t]); if (st.log.length > 60) st.log.shift(); };

// ---------------------------------------------------------------- exigências (pesam nas propostas)

export interface Demand14 { ok: boolean; text: L }
/** O que o empresário exige numa proposta pelo cliente, e se a proposta atende. */
export function demandOf(s: GameState, m: RealMgr, act: Act, o: Omit<Offer, 'id' | 'week' | 'status'>): Demand14 {
  const st = m.style;
  if (st === 'shark') {
    const need = 1.15 + (m.a[1] - 60) / 120;
    const adv = toReal(o.advance, s.year) / Math.max(1, expectedAdvance(s, act));
    return { ok: adv >= need, text: fmtL(l('adiantamento de pelo menos {p}% do valor de mercado', 'an advance of at least {p}% of market value'), { p: Math.round(need * 100) }) };
  }
  if (st === 'muscle') {
    const need = Math.round((0.14 + act.fame / 600 + 0.03) * 100) / 100;
    const roy = o.model === 'distribution' ? 1 : o.royalty;
    return { ok: roy >= need, text: fmtL(l('royalty de pelo menos {p}%', 'a royalty of at least {p}%'), { p: Math.round(need * 100) }) };
  }
  if (st === 'svengali') return { ok: o.promises.length > 0, text: l('ao menos uma promessa por escrito (divulgação, turnê, single)', 'at least one written promise (promotion, tour, single)') };
  if (st === 'guardian') return { ok: o.creativeControl || o.model === 'distribution' || o.model === 'licensing', text: l('controle criativo para o artista', 'creative control for the artist') };
  return { ok: o.termMonths <= 36, text: l('contrato de no máximo 3 anos', 'a deal of 3 years at most') };
}

registerOfferMod('managers14', (s, act, o) => {
  const m = repOf(s, act.id);
  const br = m14(s).brought[act.id];
  if (!m) return br && br[1] >= s.week ? { delta: 0.08, reason: fmtL(l('Indicação: {n} trouxe este artista a você.', 'Referral: {n} brought this act to you.'), { n: mgrName(s, mgrById[br[0]]) }) } : null;
  const n = mgrName(s, m);
  const neg = m.a[1];
  const me = labelNeg(s);
  const dm = demandOf(s, m, act, o);
  const op = opinionOf(s, mgrKey(m.id));
  let d = clamp((me - neg) / 450, -0.1, 0.04) + (dm.ok ? 0.04 : -0.08 - (neg - 50) / 500) + clamp(op / 350, -0.08, 0.08);
  const parts: L[] = [fmtL(l('{n} negocia por {a} (negociação {v} contra a sua {m})', '{n} negotiates for {a} (negotiation {v} vs your {m})'), { n, a: act.name, v: neg, m: me }),
    fmtL(dm.ok ? l('exigência atendida: {d}', 'demand met: {d}') : l('exige {d}', 'demands {d}'), { d: dm.text })];
  if (Math.abs(op) >= 10) parts.push(fmtL(op > 0 ? l('gosta de você ({v})', 'likes you ({v})') : l('não gosta de você ({v})', 'dislikes you ({v})'), { v: Math.round(op) }));
  if (inFeud(s, m.id)) { d -= 0.2; parts.push(l('em rixa com você: segura o cliente', 'feuding with you: holds the client back')); }
  if (br && br[0] === m.id && br[1] >= s.week) { d += 0.08; parts.push(l('foi ele quem indicou', 'they made the referral')); }
  return { delta: d, reason: { pt: parts.map((x) => x.pt).join(' · ') + '.', en: parts.map((x) => x.en).join(' · ') + '.' } };
});

/** Concorrência na sua carreira de empresário: tirar um cliente de quem já o representa é mais difícil. */
export function rivalAdj14(s: GameState, a: Act): number {
  const m = repOf(s, a.id);
  if (!m) return 0;
  return clamp(-0.06 - (m.a[1] + m.a[2] - 100) / 500, -0.3, -0.02) - (inFeud(s, m.id) ? 0.1 : 0) + clamp(opinionOf(s, mgrKey(m.id)) / 800, -0.05, 0.08);
}
mgAdj9.push(rivalAdj14);

/** manager11: o empresário rival que corteja seu cliente é um dos reais/ativos da praça, se houver. */
poachName11.push((s, a) => {
  const mk = cityById[a.city]?.market;
  const cands = activeMgrs(s).filter((m) => cityById[m.city]?.market === mk && m.fam.includes(familyOf(a.genre)));
  if (!cands.length) return null;
  const feud = cands.filter((m) => inFeud(s, m.id));
  const pool = feud.length ? feud : cands;
  const m = pool[(a.id.length + s.week) % pool.length];
  m14(s).poach[a.id] = m.id;
  return mgrName(s, m);
});

// ---------------------------------------------------------------- ações do jogador

export interface Res14 { ok: boolean; text: L }
const ok = (t: L): Res14 => ({ ok: true, text: t });
const bad = (t: L): Res14 => ({ ok: false, text: t });
export const LUNCH_COST = 400;
export const peaceCost = (s: GameState, m: RealMgr): number => money(s, 1500 + m.a[1] * 40);
const cdOk = (s: GameState, k: string) => (m14(s).cd[k] ?? -1) <= s.week;

export function lunchBlock(s: GameState, id: string): L | null {
  const m = mgrById[id];
  if (!m || !mgrActive(s, m)) return l('Fora do ramo.', 'Out of the business.');
  if (!cdOk(s, `lunch|${id}`)) return l('Vocês almoçaram há pouco (a cada 6 meses).', 'You had lunch recently (every 6 months).');
  if (s.player.cash < money(s, LUNCH_COST)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
/** Almoço de negócios: aproxima mais quem é sociável; seu carisma conta. */
export function lunch(s: GameState, id: string): Res14 {
  const e = lunchBlock(s, id);
  if (e) return bad(e);
  const m = mgrById[id];
  post(s, `m14lunch:${id}`, -money(s, LUNCH_COST), 'marketing', 'Almoço de negócios');
  m14(s).cd[`lunch|${id}`] = s.week + 26;
  const cha = (ownerOf(s).attrs.charisma - 50) / 10;
  const v = opine(s, mgrKey(id), 5 + cha + (m.a[2] > 75 ? 2 : 0) + (inFeud(s, id) ? -3 : 0), l('almoçamos e falamos de negócios.', 'we had a business lunch.'));
  return ok(fmtL(l('Almoço com {n}: opinião {v}.', 'Lunch with {n}: opinion {v}.'), { n: mgrName(s, m), v: `${v >= 0 ? '+' : ''}${v}` }));
}

export function peaceBlock(s: GameState, id: string): L | null {
  if (!inFeud(s, id)) return l('Não há rixa.', 'No feud.');
  if (s.player.cash < peaceCost(s, mgrById[id])) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
/** Encerrar a rixa: pagar um acordo (sobe a opinião ao neutro). */
export function makePeace(s: GameState, id: string): Res14 {
  const e = peaceBlock(s, id);
  if (e) return bad(e);
  const m = mgrById[id];
  post(s, `m14peace:${id}`, -peaceCost(s, m), 'business', 'Acordo com empresário');
  delete m14(s).feud[id];
  const op = opinionOf(s, mgrKey(id));
  opine(s, mgrKey(id), Math.max(10, -op), l('fechamos um acordo e enterramos a rixa.', 'we settled and buried the feud.'));
  log(s, id, fmtL(l('Rixa encerrada com acordo pago.', 'Feud ended with a paid settlement.'), {}));
  return ok(fmtL(l('{n} aceitou o acordo: a rixa acabou.', '{n} took the settlement: the feud is over.'), { n: mgrName(s, m) }));
}

export function referralBlock(s: GameState, id: string): L | null {
  if (!cdOk(s, `ref|${id}`)) return l('Já pediu uma indicação este ano.', 'Already asked for a referral this year.');
  if (opinionOf(s, mgrKey(id)) < 20) return l('Precisa de opinião +20: ele só indica clientes a quem confia.', 'Needs opinion +20: they only refer clients to people they trust.');
  if (!freeClients(s, id).length) return l('Nenhum cliente dele está sem selo agora.', 'None of their clients is unsigned right now.');
  return null;
}
const freeClients = (s: GameState, id: string): Act[] => rosterOf(s, id).filter((a) => !a.owner && !a.playerBand);
/** Pedir uma indicação: gasta boa vontade; o cliente chega com bônus nas propostas por 3 meses. */
export function askReferral(s: GameState, id: string): Res14 {
  const e = referralBlock(s, id);
  if (e) return bad(e);
  const a = freeClients(s, id).sort((x, y) => y.fame - x.fame)[0];
  m14(s).cd[`ref|${id}`] = s.week + 52;
  opine(s, mgrKey(id), -6, l('pediu que indicasse um cliente.', 'asked them to refer a client.'));
  bring(s, mgrById[id], a);
  return ok(fmtL(l('{n} indicou {a}: propostas a ele valem mais por 3 meses.', '{n} referred {a}: offers to them count for more for 3 months.'), { n: mgrName(s, mgrById[id]), a: a.name }));
}
function bring(s: GameState, m: RealMgr, a: Act): void {
  m14(s).brought[a.id] = [m.id, s.week + 13];
  watchAct(s, a.id);
  log(s, m.id, fmtL(l('Indicou {a} ao seu selo.', 'Referred {a} to your label.'), { a: a.name }));
}

// ---------------------------------------------------------------- mês a mês

function startFeud(s: GameState, m: RealMgr, why: L): void {
  const st = m14(s);
  if (inFeud(s, m.id)) return;
  st.feud[m.id] = s.year + 4;
  notify(s, fmtL(l('Rixa: {n} agora é seu desafeto ({w}). Propostas aos clientes dele ficam mais difíceis e ele vai atrás dos seus artistas.', 'Feud: {n} is now your enemy ({w}). Offers to their clients get harder and they will go after your acts.'), { n: mgrName(s, m), w: why }), 'bad');
  log(s, m.id, fmtL(l('Rixa começou: {w}', 'Feud started: {w}'), { w: why }));
}

export function managersMonth(s: GameState, r: Rng): void {
  const st = m14(s);
  const idx = realIndex(s);
  const act = (m: RealMgr) => mgrActive(s, m);
  // chegadas e saídas do ramo (só o que já aconteceu)
  if (s.month === 0) for (const m of REAL_MGRS) {
    const n = mgrName(s, m);
    if (m.from === s.year && !st.seen[`in|${m.id}`] && s.year > s.config.startYear) { st.seen[`in|${m.id}`] = 1; notify(s, fmtL(l('Novo empresário na praça: {n} ({c}), estilo {t}.', 'New manager in town: {n} ({c}), {t} style.'), { n, c: cityById[m.city]?.name ?? m.city, t: MGR_STYLE[m.style][0] }), 'event'); }
    if (s.year === Math.min(m.to, m.died ?? 9999) + 1 && !st.seen[`out|${m.id}`]) {
      st.seen[`out|${m.id}`] = 1;
      notify(s, fmtL(m.died !== undefined && m.died <= m.to ? l('{n} morreu ({y}); os clientes dele ficam sem empresário.', '{n} died ({y}); their clients are left without a manager.') : l('{n} deixou a gestão de artistas.', '{n} left artist management.'), { n, y: m.died ?? m.to }), 'event');
    }
  }
  // clientes históricos (ato existe, ano bate, não é seu cliente)
  for (const m of REAL_MGRS) {
    if (!act(m)) continue;
    for (const [name, a, b] of m.cl) {
      const x = idx.get(name);
      if (!x || !activeAct(x) || s.year < a || s.year > b || isMyClient(s, x.id)) continue;
      const cur = st.rep[x.id];
      if (cur?.m === m.id) continue;
      st.rep[x.id] = { m: m.id, y: s.year, h: 1 };
      if (x.owner === 'player') notify(s, fmtL(l('{n} passou a empresariar {a}, do seu selo: renovações vão exigir {d}.', '{n} now manages {a}, on your label: renewals will demand {d}.'), { n: mgrName(s, m), a: x.name, d: MGR_STYLE[m.style][1] }), 'event');
    }
  }
  // limpeza: empresário fora do ramo, ato encerrado, contrato histórico vencido, cliente que virou seu
  for (const [aid, rp] of Object.entries(st.rep)) {
    const m = mgrById[rp.m];
    const x = s.acts[aid];
    if (!m || !x || !activeAct(x) || !act(m)) { delete st.rep[aid]; continue; }
    if (rp.h) { const c = m.cl.find(([n]) => n === realDataOf(x)?.n); if (!c || s.year > c[2]) { delete st.rep[aid]; continue; } }
    if (isMyClient(s, aid)) {
      delete st.rep[aid];
      const t = fmtL(l('você tirou {a} da carteira dele.', 'you took {a} from their roster.'), { a: x.name });
      opine(s, mgrKey(m.id), -22, t);
      log(s, m.id, t);
      if (m.style === 'muscle' || m.style === 'shark' || opinionOf(s, mgrKey(m.id)) <= -30) startFeud(s, m, t);
    }
  }
  // clientes que você perdeu para um empresário rival (manager11) vão para a carteira dele
  for (const [aid, mid] of Object.entries(st.poach)) {
    if (isMyClient(s, aid)) { if (s.month === 0) delete st.poach[aid]; continue; }
    delete st.poach[aid];
    const m = mgrById[mid];
    if (m && act(m) && s.acts[aid] && activeAct(s.acts[aid])) { st.rep[aid] = { m: mid, y: s.year }; log(s, mid, fmtL(l('Tirou {a} da sua carteira.', 'Took {a} from your roster.'), { a: s.acts[aid].name })); }
  }
  for (const [aid, b] of Object.entries(st.brought)) if (b[1] < s.week) delete st.brought[aid];
  // cada empresário ativo: contrata, indica, conspira
  const taken = new Set(Object.keys(st.rep));
  for (const m of REAL_MGRS) {
    if (!act(m)) continue;
    const key = mgrKey(m.id);
    const op = opinionOf(s, key);
    const feud = inFeud(s, m.id);
    if (!feud && op <= -45) startFeud(s, m, l('a opinião dele sobre você chegou ao fundo do poço', 'their opinion of you hit rock bottom'));
    const roster = rosterOf(s, m.id);
    const mk = cityById[m.city]?.market;
    if (roster.length < mgrCap(m) && r.chance(0.08)) {
      const cands = Object.values(s.acts).filter((a) => activeAct(a) && !a.playerBand && !taken.has(a.id) && a.fame >= 12 && a.debutYear <= s.year && !isMyClient(s, a.id) && !realDataOf(a)
        && cityById[a.city]?.market === mk && m.fam.includes(familyOf(a.genre)) && (a.owner !== 'player' || a.trust < 55 || feud));
      cands.sort((a, b) => b.fame - a.fame);
      const pick = cands.length ? cands[Math.min(cands.length - 1, r.int(0, 3))] : undefined;
      if (pick) {
        st.rep[pick.id] = { m: m.id, y: s.year };
        taken.add(pick.id);
        log(s, m.id, fmtL(l('Passou a empresariar {a}.', 'Started managing {a}.'), { a: pick.name }));
        if (pick.owner === 'player') {
          pick.trust = clamp(pick.trust - (feud ? 6 : 2), 0, 100);
          notify(s, fmtL(feud ? l('{n}, seu desafeto, assumiu a carreira de {a} e já fala mal de você: confiança caiu. Renovações vão exigir {d}.', '{n}, your enemy, took over {a}\'s career and is already badmouthing you: trust fell. Renewals will demand {d}.')
            : l('{a} contratou {n} como empresário: renovações vão exigir {d}.', '{a} hired {n} as manager: renewals will demand {d}.'), { n: mgrName(s, m), a: pick.name, d: MGR_STYLE[m.style][1] }), 'bad');
        }
      }
    }
    // indicações a quem ele confia
    if (!feud && op >= 25 && r.chance(0.05)) {
      const a = roster.filter((x) => !x.owner && !x.playerBand && !st.brought[x.id]).sort((x, y) => y.fame - x.fame)[0];
      if (a) { bring(s, m, a); notify(s, fmtL(l('{n} confia em você e indicou {a} (sem selo). Propostas a ele valem mais por 3 meses — veja em Empresários.', '{n} trusts you and referred {a} (unsigned). Offers to them count for more for 3 months — see Managers.'), { n: mgrName(s, m), a: a.name }), 'good'); }
    }
    // desafeto envenena artistas seus que ele representa
    if (feud) for (const a of roster) if (a.owner === 'player' && r.chance(0.12)) {
      a.trust = clamp(a.trust - 5, 0, 100);
      notify(s, fmtL(l('{n} anda dizendo a {a} que seu selo os explora (confiança −5). Faça as pazes em Empresários.', '{n} keeps telling {a} your label exploits them (trust −5). Make peace in Managers.'), { n: mgrName(s, m), a: a.name }), 'bad');
    }
    // exigências em nome de clientes do seu selo
    for (const a of roster) if (a.owner === 'player' && r.chance(0.025)) {
      emitEvent(s, r, 'm14_demand', { act: a.id, mk: key, mgrName: mgrName(s, m), fee: Math.round(expectedAdvance(s, a) * 0.3), style: m.style });
      break;
    }
  }
}
registerSimHook('month', 'managers14', (s) => managersMonth(s, Rng.fromSeed(`${s.config.seed}:managers14:${s.year}:${s.month}`)));

// ---------------------------------------------------------------- evento: exigência em nome do cliente

function bumpRoyalty(s: GameState, actId: string): void {
  const c = Object.values(s.contracts).filter((x) => x.actId === actId && x.party === 'player' && x.endWeek > s.week).sort((a, b) => b.startWeek - a.startWeek)[0];
  if (c) c.royalty = Math.min(0.5, Math.round((c.royalty + 0.03) * 100) / 100);
}
deferEvents<EventDef>([
  {
    id: 'm14_demand', cat: 'contract', tone: 'neutral', tags: [], cooldown: 6, forcedOnly: true,
    title: l('{mgrName} quer mais para {act}', '{mgrName} wants more for {act}'),
    text: l('{mgrName}, empresário de {act}, chegou ao escritório sem marcar hora: o contrato "não reflete o tamanho" do cliente. Quer {feeTxt} de bônus ou royalties maiores — e deixa claro que conversa com outros selos.', '{mgrName}, {act}\'s manager, walked into the office unannounced: the deal "does not reflect" the client\'s size. Wants a {feeTxt} bonus or higher royalties — and makes clear they talk to other labels.'),
    options: [
      { id: 'pay', label: l('Pagar o bônus', 'Pay the bonus'), hint: l('Sai caro agora; artista e empresário ficam satisfeitos.', 'Costly now; act and manager are pleased.'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; post(s, `m14bonus:${c.act}`, -money(s, Number(c.fee)), 'business', 'Bônus exigido pelo empresário'); if (a) { a.cash += money(s, Number(c.fee)); a.trust = clamp(a.trust + 6, 0, 100); } opine(s, String(c.mk), 7, l('pagou o bônus que pedi pelo meu cliente.', 'paid the bonus I asked for my client.')); } },
      { id: 'roy', label: l('Subir os royalties (+3 pontos)', 'Raise royalties (+3 points)'), hint: l('Sem custo agora; você ganha menos em cada venda até o fim do contrato.', 'No cost now; you earn less on every sale until the deal ends.'),
        apply: (s, _r, c) => { bumpRoyalty(s, String(c.act)); const a = s.acts[String(c.act)]; if (a) a.trust = clamp(a.trust + 4, 0, 100); opine(s, String(c.mk), 4, l('aceitou rever os royalties do meu cliente.', 'agreed to revisit my client\'s royalties.')); } },
      { id: 'no', label: l('Recusar: contrato é contrato', 'Refuse: a deal is a deal'), hint: l('Artista se ressente; linhas-duras e tubarões podem virar desafetos.', 'The act resents it; enforcers and sharks may become enemies.'),
        apply: (s, r, c) => {
          const a = s.acts[String(c.act)];
          if (a) a.trust = clamp(a.trust - 8, 0, 100);
          opine(s, String(c.mk), -12, l('recusou o que pedi pelo meu cliente.', 'refused what I asked for my client.'));
          const m = mgrById[String(c.mk).slice(2)];
          if (m && (c.style === 'muscle' || c.style === 'shark') && r.chance(0.35)) startFeud(s, m, l('recusou a exigência dele', 'you refused their demand'));
          remember(s, 'managers14', fmtL(l('Você recusou a exigência de {n} por {a}.', 'You refused {n}\'s demand for {a}.'), { n: String(c.mgrName), a: a?.name ?? '?' }), { actId: a?.id });
        } },
    ],
  },
]);

// ---------------------------------------------------------------- ranking (você contra eles)

export interface Rank14 { id: string; name: string; you?: boolean; clients: number; fame: number }
export function mgrRanking(s: GameState): Rank14[] {
  const out: Rank14[] = activeMgrs(s).map((m) => { const ro = rosterOf(s, m.id); return { id: m.id, name: mgrName(s, m), clients: ro.length, fame: Math.round(ro.reduce((t, a) => t + a.fame, 0)) }; });
  const mine = ventures(s).mg.clients.map((c) => s.acts[c.actId]).filter(activeAct);
  if (mine.length) out.push({ id: 'you', name: s.config.companyName, you: true, clients: mine.length, fame: Math.round(mine.reduce((t, a) => t + a.fame, 0)) });
  return out.sort((a, b) => b.fame - a.fame || b.clients - a.clients);
}
export const mgrLog = (s: GameState, id: string): [number, number, string, L][] => m14(s).log.filter((x) => x[2] === id);
