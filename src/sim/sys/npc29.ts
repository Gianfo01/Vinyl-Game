// R29 (contratos+, NPC) — o mundo também usa os três modelos (docs/contratos29.md):
//
//  • EMPRESARIAMENTO NPC: quem empresaria quem (managers14 → m14.rep) vira contrato de verdade em s.contracts
//    (party 'e:<id>', model 'management', comissão pelo estilo do empresário). A comissão sai do caixa do ato todo mês
//    (mesma estimativa de ganhos da carreira, ventures9.mgGross). Trocar de empresário encerra um e abre outro.
//    A contratação de clientes pelos empresários NPC segue a curva de época (mgrEra29: forte na era do rock).
//  • PRODUÇÃO NPC: produtores reais ativos (producers15) e estúdios NPC (ventures9 npc) assinam atos sem selo
//    (party 'pd:<id>' / 'vs:<selo>:<cidade>'), gravam e entregam masters: licença ou venda a selos rivais — ou ao SEU
//    selo pela Caixa de entrada ("{produtora} oferece as masters de {ato}": licenciar / comprar / recusar), pela mesma
//    liquidação de entregas (contracts29 / market.ts). Selo que contrata o ato compra o contrato de produção.
//    Curva prodEra29: forte nos anos 1960–80.
//  • JOINT VENTURE NPC: um selo NPC que assina uma estrela (fama ≥ 40) às vezes dá a ela um selo-vaidade (JV) — mais
//    royalty e o +4% de apelo do selo-vaidade (deals18). A disputa (rivalsense28) também rouba estrelas com JV. Estrelas
//    sem selo propõem JV ao seu selo pela Caixa de entrada (a partir dos anos 1970).
// Sorte só por Rng.fromSeed('…|npc29…'); nada no x4 (marcas de intervalo em s.flags).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { mgrById } from '../../data/managers14';
import type { FormatId } from '../../data/rules';
import { acceptOffer, defaultOffer, expectedAdvance, offerEligible29, special29 } from '../contracts';
import { launchNpcRelease } from '../market';
import { composeSongs, recordSongs, unreleasedRecorded } from '../production';
import { deferEvents, registerSimHook } from '../ext4';
import { emitEvent, type EventDef } from '../events';
import { defaultRights } from '../rights';
import { scoutBlock29, scoutEligible20 } from '../scout20';
import { cashWhy20, freeCash20 } from '../oblig20';
import type { Act, Contract, GameState, Label, Release } from '../types';
import { fmtL, hasTech, money, nextId, notify, post, remember } from '../util';
import { PROD_PTS29, applyModel29, jvEra29, npcParty29, prodEra29, type Delivery29, type End29 } from '../terms29';
import { bumpDeliveries29, npcProdPaid29 } from './contracts29';
import { m14, mgrName } from './managers14';
import { activeProds, prodKey, prodName } from './producers15';
import { activeAct } from './ventures12';
import { histLocked } from '../history15';
import { mgGross, ventures } from './ventures9';

const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const rng = (s: GameState, ...k: (string | number)[]) => Rng.fromSeed(`${s.config.seed}|npc29|${k.join('|')}`);

function endNpc(s: GameState, c: Contract, why: End29): void {
  const x = (c.x29 ??= {});
  if (x.ended) return;
  x.ended = why;
  x.endWeek29 = s.week;
  c.endWeek = Math.min(c.endWeek, s.week);
  pver29++;
}
const liveNpc = (c: Contract, model: Contract['model']): boolean => c.model === model && npcParty29(c.party) && !c.x29?.ended;

// ---------------------------------------------------------------- empresariamento NPC

/** Comissão pelo estilo do empresário (o Coronel cobra mais; o guardião, menos). */
export const MGR_COMM29: Record<string, number> = { shark: 0.2, muscle: 0.2, svengali: 0.25, guardian: 0.12, impresario: 0.15 };

/** Quem empresaria quem (m14.rep) ↔ contratos 'management' em s.contracts: cria, renova, encerra. */
export function syncMgmt29(s: GameState): void {
  const rep = m14(s).rep;
  const live = new Map<string, Contract>();
  for (const id in s.contracts) { const c = s.contracts[id]; if (liveNpc(c, 'management') && c.party.startsWith('e:')) live.set(c.actId, c); }
  for (const aid of Object.keys(rep).sort()) {
    const m = mgrById[rep[aid].m];
    const act = s.acts[aid];
    if (!m || !act) continue;
    const key = `e:${m.id}`;
    const cur = live.get(aid);
    live.delete(aid);
    if (cur && cur.party === key && cur.endWeek > s.week) continue;
    if (cur) endNpc(s, cur, cur.party === key ? 'expired' : 'replaced');
    const r = rng(s, 'mgr', aid, m.id, s.week);
    const months = 36 + r.int(0, 4) * 6;
    const id = nextId(s, 'k');
    s.contracts[id] = {
      id, actId: aid, party: key, model: 'management', advance: 0, royalty: 0, termMonths: months, startWeek: s.week,
      endWeek: s.week + Math.round(months * 4.35), releasesOwed: 0, releasesDone: 0, creativeControl: true, publishing: false,
      share360: 0, recoupBalance: 0, promises: [], fameAtSign: Math.round(act.fame * 10) / 10,
      x29: { commission: MGR_COMM29[m.style] ?? 0.15, co: mgrName(s, m), paid: 0 },
    };
  }
  const mine = new Set(ventures(s).mg.clients.map((x) => x.actId));
  for (const c of live.values()) endNpc(s, c, mine.has(c.actId) ? 'replaced' : activeAct(s.acts[c.actId]) ? 'quit' : 'gone');
}

/** A comissão do empresário NPC sai do caixa do ato (o que houver). */
function mgmtFees29(s: GameState): void {
  for (const id in s.contracts) {
    const c = s.contracts[id];
    if (!liveNpc(c, 'management')) continue;
    const act = s.acts[c.actId];
    if (!activeAct(act)) continue;
    const fee = Math.round(mgGross(s, act) * (c.x29?.commission ?? 0.15));
    const take = Math.min(Math.max(0, act.cash), fee);
    if (take <= 0) continue;
    act.cash -= take;
    c.x29!.paid = (c.x29!.paid ?? 0) + take;
  }
}

// ---------------------------------------------------------------- produção NPC

export interface ProdCo29 { key: string; name: string }
/** Produtoras NPC desta época: produtores reais ativos e estúdios dos selos rivais. */
export function prodCos29(s: GameState): ProdCo29[] {
  const out: ProdCo29[] = activeProds(s).map((p) => ({ key: prodKey(p.id), name: prodName(s, p) }));
  for (const n of ventures(s).npc) if (n.kind === 'studio') out.push({ key: `vs:${n.labelId}:${n.city}`, name: n.name });
  return out;
}
/** Contrato de produção NPC vigente do ato (ou undefined). Índice por estado (scoutEligible20 consulta muito). */
let pver29 = 0;
const PIDX = new WeakMap<GameState, { k: string; map: Map<string, Contract> }>();
export function npcProdOf29(s: GameState, actId: string): Contract | undefined {
  const k = String(pver29);
  let ix = PIDX.get(s);
  if (!ix || ix.k !== k) {
    const map = new Map<string, Contract>();
    for (const id in s.contracts) { const c = s.contracts[id]; if (liveNpc(c, 'production')) map.set(c.actId, c); }
    ix = { k, map };
    PIDX.set(s, ix);
  }
  const c = ix.map.get(actId);
  return c && liveNpc(c, 'production') ? c : undefined;
}
// quem está com produtora NPC não assina direto: espera as masters ou o fim do contrato (a mesma regra do radar e da proposta)
scoutBlock29().f = (s, act) => {
  const c = npcProdOf29(s, act.id);
  return c ? fmtL(l('Contrato de produção com {p}: o selo que quiser o ato negocia as masters com a produtora (ou espera o fim do contrato).', 'Production deal with {p}: a label that wants the act deals for the masters with the company (or waits for the deal to end).'), { p: c.x29?.co ?? '?' }) : null;
};

const MAX_PROD29 = 8;
function npcProdSign29(s: GameState): void {
  const r = rng(s, 'psign', s.year, s.month);
  if (!r.chance(prodEra29(s.year))) return;
  let active = 0;
  const busy = new Map<string, number>();
  for (const id in s.contracts) { const c = s.contracts[id]; if (liveNpc(c, 'production')) { active++; busy.set(c.party, (busy.get(c.party) ?? 0) + 1); } }
  if (active >= MAX_PROD29) return;
  const cos = prodCos29(s).filter((x) => (busy.get(x.key) ?? 0) < 2);
  if (!cos.length) return;
  const pending = new Set(s.offers.filter((o) => o.status === 'pending' || o.status === 'counter').map((o) => o.actId));
  const cands = Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && activeAct(a) && a.status !== 'hiatus' && a.fame >= 2 && a.fame <= 30
    && !pending.has(a.id) && !histLocked(s, a) && scoutEligible20(s, a).ok).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 12);
  if (!cands.length) return;
  const co = cos[r.int(0, cos.length - 1)];
  const act = cands[r.int(0, cands.length - 1)];
  signNpcProd29(s, act, co, r);
}

/** Uma produtora NPC assina o ato (contrato de produção; adiantamento ao artista, recuperável pela parte dele). */
export function signNpcProd29(s: GameState, act: Act, co: ProdCo29, r: Rng = rng(s, 'psign1', act.id, s.week)): Contract {
  const months = 24 + r.int(0, 2) * 6;
  const adv = Math.round(money(s, 300 + act.fame * 30) / 100) * 100;
  const id = nextId(s, 'k');
  s.contracts[id] = {
    id, actId: act.id, party: co.key, model: 'production', advance: adv, royalty: Math.round(r.float(0.35, 0.5) * 100) / 100, termMonths: months,
    startWeek: s.week, endWeek: s.week + Math.round(months * 4.35), releasesOwed: 2, releasesDone: 0, creativeControl: false, publishing: false,
    share360: 0, recoupBalance: adv, promises: [], fameAtSign: Math.round(act.fame * 10) / 10, x29: { co: co.name, deliveries: [], paid: 0, artistPaid: 0 },
  };
  act.cash += adv;
  pver29++;
  if (s.knowledge[act.id]) notify(s, fmtL(l('{a} assinou um contrato de produção com {p}.', '{a} signed a production deal with {p}.'), { a: act.name, p: co.name }), 'info');
  return s.contracts[id];
}

/** Formato físico da época (o mesmo critério da liquidação do mercado). */
const physFmt29 = (s: GameState): FormatId => (s.year < (s.techDates.disc ?? 0) ? 'cylinder' : s.year < 1955 ? 'shellac' : hasTech(s, 'cd') ? 'cd' : 'lp');

/** Proposta pelas masters gravadas e não lançadas do ato (receptor com reputação `rep` 0–100). */
export function masterQuote29(s: GameState, act: Act, rep: number, kind: Delivery29['kind']): { n: number; adv: number; pts: number; type: Release['type'] } | null {
  const songs = unreleasedRecorded(s, act).slice(0, 10);
  if (!songs.length) return null;
  const q = songs.reduce((t, x) => t + (x.q ?? 50), 0) / songs.length;
  const adv = Math.round(money(s, 250 + act.fame * 45 + q * 8) * (0.7 + rep / 200) * songs.length / 100) * 100;
  const type: Release['type'] = songs.length >= 8 ? 'lp' : songs.length >= 3 ? 'ep' : 'single';
  return kind === 'sale' ? { n: songs.length, adv: Math.round(adv * 2.2 / 100) * 100, pts: 0, type } : { n: songs.length, adv, pts: PROD_PTS29 + (act.fame > 30 ? 0.02 : 0), type };
}

/** A produtora NPC entrega as masters a um selo ('player' = o seu): o disco sai pelo selo, que paga a produtora. */
export function deliverNpc29(s: GameState, cid: string, to: string, kind: Delivery29['kind']): L | null {
  const c = s.contracts[cid];
  const act = c ? s.acts[c.actId] : undefined;
  if (!c || !act || !liveNpc(c, 'production')) return l('A produtora não tem mais esse contrato.', 'The company no longer holds that deal.');
  if (act.owner) return l('O ato já assinou com um selo.', 'The act already signed with a label.');
  const lb: Label | undefined = to === 'player' ? undefined : s.labels[to];
  if (to !== 'player' && !lb?.active) return l('Selo inválido.', 'Invalid label.');
  const qt = masterQuote29(s, act, to === 'player' ? s.player.reputation.commercial : lb!.reputation, kind);
  if (!qt) return l('Nada gravado esperando: as masters já saíram.', 'Nothing recorded waiting: the masters are gone.');
  if (to === 'player' && freeCash20(s) < qt.adv) return cashWhy20(s, qt.adv, l('Caixa livre insuficiente para as masters.', 'Not enough free cash for the masters.'));
  if (lb && lb.cash < qt.adv) return l('O selo não tem caixa.', 'The label lacks the cash.');
  const x = (c.x29 ??= {});
  const list = (x.deliveries ??= []);
  const songs = unreleasedRecorded(s, act).slice(0, 10).map((so) => so.id);
  const rel = launchNpcRelease(s, rng(s, 'pdel', c.id, list.length), act, to, songs, qt.type, to === 'player' ? 0 : 1200 + lb!.reputation * 25);
  if (to === 'player') { rel.formats = [physFmt29(s)]; post(s, `prod29buy:${rel.id}`, -qt.adv, 'production', `Masters de ${act.name} (${x.co ?? '?'})`); }
  else lb!.cash -= qt.adv;
  c.releasesDone += 1;
  list.push({ relId: rel.id, lb: to, kind, adv: qt.adv, pts: qt.pts, earned: 0, paid: 0, week: s.week });
  bumpDeliveries29();
  npcProdPaid29(c, act, qt.adv);
  if (to === 'player') {
    notify(s, fmtL(kind === 'sale' ? l('Você comprou as masters de "{t}" ({a}) de {p} por {v}: o disco é do seu selo.', 'You bought the masters of "{t}" ({a}) from {p} for {v}: the record is your label\'s.') : l('Você licenciou "{t}" ({a}) de {p}: {v} de adiantamento e {q}% de pontos para a produtora.', 'You licensed "{t}" ({a}) from {p}: {v} advance and {q}% points to the company.'), { t: rel.title, a: act.name, p: x.co ?? '?', v: usd(qt.adv), q: Math.round(qt.pts * 100) }), 'good');
    remember(s, 'signed', fmtL(l('{c} lança "{t}" de {a}, masters da produtora {p}.', '{c} releases "{t}" by {a}, masters from {p}.'), { c: s.config.companyName, t: rel.title, a: act.name, p: x.co ?? '?' }), { actId: act.id });
  }
  return null;
}

/** Selo rival que fica com as masters (o de mais caixa que paga; determinístico). */
function npcBuyer29(s: GameState, act: Act): Label | undefined {
  const qt = masterQuote29(s, act, 50, 'license');
  if (!qt) return undefined;
  return Object.values(s.labels).filter((lb) => lb.active && lb.cash >= qt.adv * 3).sort((a, b) => b.reputation - a.reputation || (a.id < b.id ? -1 : 1))[0];
}

const pendingDec29 = (s: GameState, ev: string): boolean => s.decisions.some((d) => d.eventId === ev);

function npcProdMonth29(s: GameState): void {
  for (const id of Object.keys(s.contracts)) {
    const c = s.contracts[id];
    if (!liveNpc(c, 'production')) continue;
    const act = s.acts[c.actId];
    if (!activeAct(act)) { endNpc(s, c, 'gone'); continue; }
    if (act.owner) { endNpc(s, c, 'sold'); continue; }
    if (histLocked(s, act)) continue; // r31: vida real exata — produtora não grava nem entrega disco inventado
    if (c.endWeek <= s.week) { endNpc(s, c, 'expired'); continue; }
    const last = Math.max(c.startWeek, ...(c.x29?.deliveries ?? []).map((d) => d.week));
    const r = rng(s, 'pmonth', c.id, s.week);
    if (s.week - last < 17 || !r.chance(0.35)) continue;
    // a produtora grava (por conta dela) e oferece as masters
    if (!unreleasedRecorded(s, act).length) {
      const songs = composeSongs(s, r, act, 3);
      recordSongs(s, r, act, songs.map((x) => x.id), 2, 'balanced', c.party);
    }
    if (!unreleasedRecorded(s, act).length) continue;
    const toPlayer = s.config.role !== 'artist' && act.fame >= 4 && !pendingDec29(s, 'c29_masters') && (s.flags.c29m ?? -999) + 13 <= s.week && r.chance(0.4);
    if (toPlayer) { offerMasters29(s, c.id, r); continue; }
    const lb = npcBuyer29(s, act);
    if (lb) deliverNpc29(s, c.id, lb.id, r.chance(0.25) ? 'sale' : 'license');
  }
}

/** A produtora oferece as masters gravadas ao seu selo (cartão na Caixa de entrada). */
export function offerMasters29(s: GameState, cid: string, r: Rng = rng(s, 'moffer', cid, s.week)): boolean {
  const c = s.contracts[cid];
  const act = c ? s.acts[c.actId] : undefined;
  if (!c || !act) return false;
  const lic = masterQuote29(s, act, s.player.reputation.commercial, 'license');
  const sale = masterQuote29(s, act, s.player.reputation.commercial, 'sale');
  if (!lic || !sale) return false;
  s.flags.c29m = s.week;
  emitEvent(s, r, 'c29_masters', { act: act.id, cid: c.id, prod: c.x29?.co ?? '?', n: lic.n, advTxt: usd(lic.adv), pts: Math.round(lic.pts * 100), saleTxt: usd(sale.adv) });
  return true;
}

/** A resposta da Caixa: licenciar ou comprar (o mesmo deliverNpc29); recusar = a produtora vai a um selo rival. */
export function answerMasters29(s: GameState, cid: string, how: 'license' | 'sale' | 'decline'): L | null {
  const c = s.contracts[cid];
  if (how !== 'decline') {
    const err = deliverNpc29(s, cid, 'player', how);
    if (err) notify(s, err, 'bad');
    return err;
  }
  const act = c ? s.acts[c.actId] : undefined;
  const lb = act && c && liveNpc(c, 'production') && !act.owner ? npcBuyer29(s, act) : undefined;
  if (lb && c) deliverNpc29(s, c.id, lb.id, 'license');
  return null;
}

// ---------------------------------------------------------------- JV NPC (selo-vaidade da estrela) e proposta de JV

special29().npcSigned = (s, act, lb, c, model) => {
  // selo que contrata o ato compra o contrato de produção NPC (a produtora recebe uma fração do adiantamento)
  const pc = npcProdOf29(s, act.id);
  if (pc) { npcProdPaid29(pc, act, Math.round(c.advance * 0.3)); endNpc(s, pc, 'sold'); }
  const jv = model === 'jv' || (!model && act.fame >= 40 && rng(s, 'jvsign', act.id, lb.id, s.week).chance(jvEra29(s.year)));
  if (!jv) return;
  const r = rng(s, 'jvterms', act.id, lb.id, s.week);
  const share = Math.round(r.float(0.3, 0.45) * 100) / 100;
  c.model = 'jv';
  c.royalty = Math.max(c.royalty, Math.round((0.18 + share * 0.2) * 100) / 100);
  c.x29 = { artistShare: share, target: 4, imprint: `${act.name} Records`, co: lb.name };
  if (s.knowledge[act.id] || act.fame >= 50) notify(s, fmtL(l('{l} dá a {a} um selo próprio (joint venture): {n}.', '{l} gives {a} an own imprint (joint venture): {n}.'), { l: lb.name, a: act.name, n: c.x29.imprint! }), 'event');
};

/** Estrela sem selo propõe uma JV ao seu selo (Caixa de entrada). */
function jvProposal29(s: GameState): void {
  if (s.year < 1970 || s.config.role === 'artist' || pendingDec29(s, 'c29_jv') || (s.flags.c29j ?? -999) + 52 > s.week) return;
  const r = rng(s, 'jvprop', s.year, s.month);
  if (!r.chance(s.year >= 1990 ? 0.06 : 0.04)) return;
  const cands = Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && a.fame >= 30 && activeAct(a) && offerEligible29(s, a, 'jv').ok)
    .sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 5);
  if (!cands.length) return;
  proposeJV29(s, cands[r.int(0, cands.length - 1)], r);
}

/** A estrela propõe a JV (cartão na Caixa de entrada). */
export function proposeJV29(s: GameState, act: Act, r: Rng = rng(s, 'jvprop1', act.id, s.week)): void {
  const share = Math.round(r.float(0.35, 0.5) * 100) / 100;
  const cap = Math.round(money(s, expectedAdvance(s, act)) * 0.7 / 100) * 100;
  s.flags.c29j = s.week;
  emitEvent(s, r, 'c29_jv', { act: act.id, share: Math.round(share * 100), target: 3, cap, capTxt: usd(cap) });
}

/** Aceitar a JV proposta pela estrela: o contrato normal (acceptOffer) com os termos dela. */
export function acceptJVProposal29(s: GameState, actId: string, share: number, target: number, cap: number): L | null {
  const act = s.acts[actId];
  const el = offerEligible29(s, act, 'jv');
  if (!act || !el.ok) return el.why ?? l('A estrela não está mais livre.', 'The star is no longer free.');
  if (freeCash20(s) < cap) return cashWhy20(s, cap, l('Caixa livre insuficiente para o capital da JV.', 'Not enough free cash for the JV capital.'));
  const o = defaultOffer(s, act);
  applyModel29(o, 'jv');
  o.rights = defaultRights('jv');
  o.advance = cap;
  o.x29 = { artistShare: share, target };
  acceptOffer(s, act, { ...o, id: nextId(s, 'o'), week: s.week, status: 'pending' });
  return null;
}

deferEvents<EventDef>([
  {
    id: 'c29_masters', cat: 'contract', tone: 'neutral', tags: [], cooldown: 3, forcedOnly: true,
    title: l('{prod} oferece as masters de {act}', '{prod} offers the masters of {act}'),
    text: l('A produtora {prod} gravou {n} faixa(s) de {act} e oferece as masters ao seu selo: licença por {advTxt} de adiantamento + {pts}% de pontos (que recuperam o adiantamento antes de pagar), ou compra definitiva por {saleTxt}. Se você recusar, o disco vai para um selo rival.',
      '{prod} recorded {n} track(s) by {act} and offers the masters to your label: a license for a {advTxt} advance + {pts}% points (which recoup the advance before paying), or an outright buy for {saleTxt}. If you decline, the record goes to a rival label.'),
    options: [
      { id: 'license', label: l('Licenciar', 'License'), hint: l('Paga o adiantamento; o disco sai pelo seu selo e a produtora recebe pontos.', 'Pay the advance; the record comes out on your label and the company earns points.'),
        apply: (s, _r, c) => { answerMasters29(s, String(c.cid), 'license'); } },
      { id: 'buy', label: l('Comprar as masters', 'Buy the masters'), hint: l('Mais caro agora; sem pontos depois.', 'Pricier now; no points later.'),
        apply: (s, _r, c) => { answerMasters29(s, String(c.cid), 'sale'); } },
      { id: 'decline', label: l('Recusar', 'Decline'), hint: l('As masters vão para um selo rival.', 'The masters go to a rival label.'),
        apply: (s, _r, c) => { answerMasters29(s, String(c.cid), 'decline'); } },
    ],
  },
  {
    id: 'c29_jv', cat: 'contract', tone: 'good', tags: [], cooldown: 12, forcedOnly: true,
    title: l('{act} propõe uma joint venture', '{act} proposes a joint venture'),
    text: l('{act} quer um selo próprio dentro da sua casa: {share}% para o artista, meta de {target} lançamentos em 36 meses e {capTxt} de capital seu. O lucro é dividido todo ano; dá para comprar a parte do artista ou dissolver depois.',
      '{act} wants an own label inside your house: {share}% to the act, a target of {target} releases in 36 months and {capTxt} of your capital. Profit is split every year; you can buy out the act or dissolve later.'),
    options: [
      { id: 'accept', label: l('Fechar a joint venture', 'Close the joint venture'), hint: l('Contrato assinado e o subselo nasce (Mercado de contratos › Acordos especiais).', 'Contract signed and the sub-label is born (Contract market › Special deals).'),
        apply: (s, _r, c) => { const e = acceptJVProposal29(s, String(c.act), Number(c.share) / 100, Number(c.target), Number(c.cap)); if (e) notify(s, e, 'bad'); } },
      { id: 'decline', label: l('Agradecer e recusar', 'Thank them and decline'), hint: l('A estrela fica um pouco magoada.', 'The star is a little hurt.'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (a) a.trust = clamp(a.trust - 3, 0, 100); } },
    ],
  },
]);

// ---------------------------------------------------------------- mês

registerSimHook('month', 'npc29', (s) => {
  syncMgmt29(s);
  mgmtFees29(s);
  npcProdSign29(s);
  npcProdMonth29(s);
  jvProposal29(s);
});
