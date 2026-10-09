// Empreendimentos e gestão de artistas (rodada 9). Dentro do jogo normal, o dono pode abrir negócios
// paralelos — festival próprio, editora musical, estúdio, agência de shows, veículo de mídia e (a partir
// de 2005) plataforma de streaming — em nome do selo (caixa da empresa) ou no nome próprio (patrimônio
// pessoal), e transferir entre os dois. Cada negócio tem custo de fundação da época, P&L mensal, nível,
// equipe, reputação e ações próprias. A gestão de artistas (empresariar atos de qualquer selo, com
// comissão de 10–20%) mora aqui também. Rivais ricos abrem os próprios negócios e disputam espaço.

import { Rng, clamp } from '../../core/rng';
import { CITIES, cityById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { ownerOf } from './people/owner';
import { standingOf } from './standing9';

export type VKind = 'festival' | 'publisher' | 'studio' | 'booking' | 'media' | 'platform';
export type MediaKind = 'magazine' | 'radio' | 'tv' | 'blog' | 'playlist';
export type Holder = 'label' | 'personal';
export type Verdict = 'legend' | 'ok' | 'flop' | 'disaster';
export type CrisisK = 'scandal' | 'burnout' | 'feud' | 'legal';

export interface Venture {
  id: string; kind: VKind; name: string; owner: Holder; city: string; level: number; rep: number; staff: number; founded: number; cost: number;
  pl: { y: number; m: number; rev: number; cost: number }[];
  total: number;
  // festival
  month?: number; price?: number; lineup?: { actId: string; fee: number }[]; editions?: { y: number; crowd: number; profit: number; verdict: Verdict; head: string }[];
  // editora
  writers?: { pid: string; name: string; skill: number; until: number }[]; cat?: { title: string; actId: string; y: number; v: number }[]; cool?: number;
  // estúdio
  gear?: number; sound?: number; booked?: { lab: string; n: number }[];
  // agência
  clients?: { actId: string; rate: number; since: number; cool?: number }[];
  // mídia
  media?: MediaKind; reach?: number; favored?: string; heat?: number; scene?: string;
  // plataforma
  subs?: number; payout?: number; deals?: string[];
}
export interface Client { actId: string; rate: number; since: number; sat: number; earned: number; lastNeg?: number; crisis?: { k: CrisisK; w: number } }
export interface NpcVenture { kind: VKind; labelId: string; name: string; city: string; rep: number; y: number }
export interface VenturesState {
  list: Venture[];
  mg: { clients: Client[]; rep: number; owner: Holder; fired: { actId: string; y: number }[]; total: number };
  npc: NpcVenture[];
  log: { w: number; t: L }[];
}

declare module '../ext4' { interface Ext4 { ventures9: VenturesState } }
const fresh = (): VenturesState => ({ list: [], mg: { clients: [], rep: 20, owner: 'personal', fired: [], total: 0 }, npc: [], log: [] });
registerExt4('ventures9', fresh);
export const ventures = (s: GameState): VenturesState => {
  const x = s.x4 as unknown as { ventures9?: VenturesState };
  x.ventures9 ??= fresh();
  return x.ventures9;
};

// ---------------------------------------------------------------- dados

export const VKINDS: Record<VKind, { name: L; desc: L; from: number; cost: number; upkeep: number; icon: string }> = {
  festival: { name: l('Festival próprio', 'Own festival'), desc: l('Data, cidade, line-up (inclusive artistas de rivais) e preço do ingresso. Pode virar lenda ou desastre.', 'Date, city, line-up (rivals\' acts too) and ticket price. Can become a legend or a disaster.'), from: 1950, cost: 120000, upkeep: 2500, icon: 'star' },
  publisher: { name: l('Editora musical', 'Music publisher'), desc: l('Contrate compositores, coloque músicas com artistas de qualquer selo, licencie para trilhas. Royalties por décadas.', 'Sign songwriters, place songs with any label\'s artists, license to sync. Royalties for decades.'), from: 1900, cost: 40000, upkeep: 1200, icon: 'note' },
  studio: { name: l('Estúdio e produção', 'Studio & production'), desc: l('Equipamento da época, sessões de outros selos e um "som da casa" que melhora os discos gravados ali.', 'Era gear, sessions booked by other labels and a "house sound" that lifts records cut there.'), from: 1920, cost: 90000, upkeep: 2200, icon: 'cd' },
  booking: { name: l('Agência de shows', 'Booking agency'), desc: l('Agende turnês de outros artistas por comissão.', 'Route other acts\' tours for a commission.'), from: 1930, cost: 30000, upkeep: 1000, icon: 'tour-bus' },
  media: { name: l('Mídia', 'Media'), desc: l('Revista, rádio, TV, blog ou playlist: poder de execução, risco de jabá e força para lançar uma cena. Três veículos viram conglomerado.', 'Magazine, radio, TV, blog or playlist: airplay power, payola risk and the clout to launch a scene. Three outlets make a conglomerate.'), from: 1900, cost: 60000, upkeep: 1800, icon: 'bulb' },
  platform: { name: l('Plataforma de streaming', 'Streaming platform'), desc: l('Assinantes, acordos de catálogo e conflito com as gravadoras pelo repasse.', 'Subscribers, catalog deals and conflict with the labels over payouts.'), from: 2005, cost: 1500000, upkeep: 40000, icon: 'globe' },
};
export const MEDIA: Record<MediaKind, { name: L; from: number; mult: number; ad: number }> = {
  magazine: { name: l('Revista', 'Magazine'), from: 1900, mult: 1, ad: 2500 },
  radio: { name: l('Rádio', 'Radio'), from: 1922, mult: 2, ad: 6000 },
  tv: { name: l('TV', 'TV'), from: 1950, mult: 6, ad: 18000 },
  blog: { name: l('Blog', 'Blog'), from: 1998, mult: 0.4, ad: 1500 },
  playlist: { name: l('Playlist', 'Playlist'), from: 2008, mult: 0.8, ad: 3500 },
};
export const GEAR: { name: L; from: number }[] = [
  { name: l('Gravação direta em disco', 'Direct-to-disc'), from: 1900 },
  { name: l('Fita magnética', 'Magnetic tape'), from: 1948 },
  { name: l('Multipista de 8 canais', '8-track multitrack'), from: 1966 },
  { name: l('Console de 24 canais', '24-track console'), from: 1975 },
  { name: l('Digital (DASH/ADAT)', 'Digital (DASH/ADAT)'), from: 1985 },
  { name: l('Estação DAW', 'DAW workstation'), from: 1998 },
  { name: l('Híbrido analógico + DAW', 'Hybrid analog + DAW'), from: 2010 },
];
export const VERDICT_NAME: Record<Verdict, L> = { legend: l('Lendário', 'Legendary'), ok: l('Bom', 'Solid'), flop: l('Fracasso', 'Flop'), disaster: l('Desastre', 'Disaster') };
export const CRISIS_NAME: Record<CrisisK, L> = { scandal: l('Escândalo na imprensa', 'Press scandal'), burnout: l('Esgotamento', 'Burnout'), feud: l('Briga interna', 'Internal feud'), legal: l('Processo judicial', 'Lawsuit') };
export const MAX_LEVEL = 5;
const STAFF_COST = 1500;

export function kindsAvailable(s: GameState): VKind[] {
  return (Object.keys(VKINDS) as VKind[]).filter((k) => s.year >= VKINDS[k].from);
}
export function mediaAvailable(s: GameState): MediaKind[] {
  return (Object.keys(MEDIA) as MediaKind[]).filter((k) => s.year >= MEDIA[k].from);
}
export function maxGear(s: GameState): number {
  let g = 0;
  GEAR.forEach((x, i) => { if (s.year >= x.from) g = i; });
  return g;
}

// ---------------------------------------------------------------- dinheiro

export function funds(s: GameState, h: Holder): number {
  return h === 'label' ? s.player.cash : ownerOf(s).wealth;
}

/** Movimenta dinheiro de um negócio: caixa do selo (livro-caixa) ou patrimônio pessoal. */
function vpay(s: GameState, h: Holder, amount: number, key: string, memo: string, v?: Venture): void {
  amount = Math.round(amount);
  if (!amount) return;
  if (h === 'label') post(s, `v9:${key}`, amount, 'business', memo);
  else ownerOf(s).wealth += amount;
  if (!v) return;
  let e = v.pl.at(-1);
  if (!e || e.y !== s.year || e.m !== s.month) { e = { y: s.year, m: s.month, rev: 0, cost: 0 }; v.pl.push(e); if (v.pl.length > 12) v.pl.shift(); }
  if (amount > 0) e.rev += amount; else e.cost -= amount;
  v.total += amount;
}

const holderName = (h: Holder): L => (h === 'label' ? l('caixa do selo', 'label cash') : l('patrimônio pessoal', 'personal wealth'));

function log(s: GameState, t: L): void {
  const st = ventures(s);
  st.log.push({ w: s.week, t });
  if (st.log.length > 40) st.log.shift();
}

export function foundCost(s: GameState, kind: VKind, media?: MediaKind): number {
  return money(s, VKINDS[kind].cost * (kind === 'media' ? MEDIA[media ?? 'magazine'].mult : 1));
}
export function upgradeCost(s: GameState, v: Venture): number {
  return Math.round(v.cost * 0.6 * v.level);
}
export function valuation(s: GameState, v: Venture): number {
  const yearly = v.pl.reduce((t, e) => t + e.rev - e.cost, 0);
  return Math.max(Math.round(v.cost * 0.4), Math.round(v.cost * (0.5 + v.level * 0.25) * (0.5 + v.rep / 100) + Math.max(0, yearly) * 3));
}
export function upkeep(s: GameState, v: Venture): number {
  return money(s, VKINDS[v.kind].upkeep * (v.kind === 'media' ? MEDIA[v.media ?? 'magazine'].mult : 1) * (0.6 + v.level * 0.4) + v.staff * STAFF_COST);
}

// ---------------------------------------------------------------- fundação e gestão

export function foundVenture(s: GameState, kind: VKind, owner: Holder, opts: { name?: string; city?: string; media?: MediaKind } = {}): L | null {
  if (!kindsAvailable(s).includes(kind)) return fmtL(l('Ainda não existe nesta época (a partir de {y}).', 'Not available in this era yet (from {y}).'), { y: VKINDS[kind].from });
  if (kind === 'media' && opts.media && !mediaAvailable(s).includes(opts.media)) return l('Esse veículo ainda não existe.', 'That outlet does not exist yet.');
  const cost = foundCost(s, kind, opts.media);
  if (funds(s, owner) < cost) return fmtL(l('Sem dinheiro no {h}.', 'Not enough {h}.'), { h: holderName(owner) });
  const city = opts.city && cityById[opts.city] ? opts.city : s.config.homeCity;
  const md = kind === 'media' ? opts.media ?? 'magazine' : undefined;
  const v: Venture = {
    id: nextId(s, 'vn'), kind, owner, city, level: 1, rep: 30, staff: 1, founded: s.year, cost, pl: [], total: 0,
    name: opts.name?.trim() || `${s.config.companyName} ${(md ? MEDIA[md].name : VKINDS[kind].name).pt}`,
  };
  if (kind === 'festival') Object.assign(v, { month: 6, price: money(s, 25), lineup: [], editions: [] });
  if (kind === 'publisher') Object.assign(v, { writers: [], cat: [], cool: 0 });
  if (kind === 'studio') Object.assign(v, { gear: Math.max(0, maxGear(s) - 1), sound: 25, booked: [] });
  if (kind === 'booking') v.clients = [];
  if (md) Object.assign(v, { media: md, reach: 15, heat: 0 });
  if (kind === 'platform') Object.assign(v, { subs: 5000, payout: 0.65, deals: [] });
  ventures(s).list.push(v);
  vpay(s, owner, -cost, `found:${v.id}`, `Fundação: ${v.name}`, v);
  remember(s, 'venture', fmtL(l('Nasce {n} ({k}), no {h}.', '{n} ({k}) is founded, under {h}.'), { n: v.name, k: VKINDS[kind].name, h: holderName(owner) }), { important: kind === 'platform' });
  return null;
}

const byId = (s: GameState, id: string) => ventures(s).list.find((x) => x.id === id);

export function upgradeVenture(s: GameState, id: string): L | null {
  const v = byId(s, id);
  if (!v) return l('Inválido.', 'Invalid.');
  if (v.level >= MAX_LEVEL) return l('Já está no nível máximo.', 'Already at max level.');
  const c = upgradeCost(s, v);
  if (funds(s, v.owner) < c) return l('Sem dinheiro.', 'Not enough money.');
  vpay(s, v.owner, -c, `up:${v.id}`, `Expansão: ${v.name}`, v);
  v.level += 1;
  v.rep = clamp(v.rep + 3, 0, 100);
  return null;
}

export function setStaff(s: GameState, id: string, n: number): void {
  const v = byId(s, id);
  if (v) v.staff = clamp(Math.round(n), 0, 4 + v.level * 3);
}

/** Muda o dono: quem recebe paga o valor de mercado a quem entrega. */
export function transferVenture(s: GameState, id: string): L | null {
  const v = byId(s, id);
  if (!v) return l('Inválido.', 'Invalid.');
  const to: Holder = v.owner === 'label' ? 'personal' : 'label';
  const val = valuation(s, v);
  if (funds(s, to) < val) return fmtL(l('O {h} não cobre o valor ({v}).', 'The {h} does not cover the value ({v}).'), { h: holderName(to), v: Math.round(val / 100) });
  vpay(s, to, -val, `xfer-out:${v.id}`, `Compra de ${v.name}`);
  vpay(s, v.owner, val, `xfer-in:${v.id}`, `Venda de ${v.name}`);
  v.owner = to;
  log(s, fmtL(l('{n} passou para o {h}.', '{n} moved to {h}.'), { n: v.name, h: holderName(to) }));
  return null;
}

export function sellVenture(s: GameState, id: string): L | null {
  const st = ventures(s);
  const v = byId(s, id);
  if (!v) return l('Inválido.', 'Invalid.');
  vpay(s, v.owner, Math.round(valuation(s, v) * 0.8), `sell:${v.id}`, `Venda de ${v.name}`);
  st.list = st.list.filter((x) => x !== v);
  remember(s, 'venture', fmtL(l('{n} foi vendido.', '{n} was sold.'), { n: v.name }));
  return null;
}

const activeAct = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && a.members.length > 0;
const ownerLabel = (s: GameState, a: Act) => (a.owner === 'player' ? s.config.companyName : a.owner ? s.labels[a.owner]?.name ?? '—' : null);

// ---------------------------------------------------------------- festival

export function festCapacity(v: Venture): number { return Math.round(4000 * Math.pow(v.level, 1.6)); }
export function lineupMax(v: Venture): number { return 3 + v.level * 2; }
export function actFee(s: GameState, a: Act): number { return money(s, 400 + Math.pow(a.fame, 2) * 12); }

export function setFestival(s: GameState, id: string, o: { month?: number; price?: number; city?: string }): void {
  const v = byId(s, id);
  if (!v || v.kind !== 'festival') return;
  if (o.month !== undefined) v.month = clamp(Math.round(o.month), 0, 11);
  if (o.price !== undefined) v.price = clamp(Math.round(o.price), money(s, 3), money(s, 400));
  if (o.city && cityById[o.city]) v.city = o.city;
}

export function festCandidates(s: GameState, id: string): Act[] {
  const v = byId(s, id);
  const taken = new Set(v?.lineup?.map((x) => x.actId));
  return Object.values(s.acts).filter((a) => activeAct(a) && !taken.has(a.id) && a.fame >= 5).sort((a, b) => b.fame - a.fame).slice(0, 40);
}

export function inviteChance(s: GameState, v: Venture, a: Act): number {
  const rivalFests = ventures(s).npc.filter((n) => n.kind === 'festival' && n.labelId === a.owner).length;
  return clamp(0.4 + v.rep / 200 + v.level * 0.05 - Math.max(0, a.fame - v.rep) / 120 - (a.owner && a.owner !== 'player' ? 0.08 : 0) - rivalFests * 0.15 + (a.owner === 'player' ? 0.3 : 0), 0.03, 0.97);
}

export function inviteAct(s: GameState, r: Rng, id: string, actId: string): { ok: boolean; text: L } {
  const v = byId(s, id);
  const a = s.acts[actId];
  if (!v || v.kind !== 'festival' || !activeAct(a)) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (v.lineup!.length >= lineupMax(v)) return { ok: false, text: l('Line-up cheio para o tamanho do festival.', 'Line-up full for this festival size.') };
  if (v.lineup!.some((x) => x.actId === actId)) return { ok: false, text: l('Já está no line-up.', 'Already on the bill.') };
  if (!r.chance(inviteChance(s, v, a))) return { ok: false, text: fmtL(l('{a} recusou o convite.', '{a} turned the invite down.'), { a: a.name }) };
  v.lineup!.push({ actId, fee: actFee(s, a) });
  return { ok: true, text: fmtL(l('{a} confirmado no {n}.', '{a} confirmed for {n}.'), { a: a.name, n: v.name }) };
}

export function dropFromLineup(s: GameState, id: string, actId: string): void {
  const v = byId(s, id);
  if (v?.lineup) v.lineup = v.lineup.filter((x) => x.actId !== actId);
}

export function autoLineup(s: GameState, r: Rng, id: string): number {
  const v = byId(s, id);
  if (!v || v.kind !== 'festival') return 0;
  let n = 0;
  const pool = festCandidates(s, id).filter((a) => a.fame <= v.rep + 35);
  for (const a of pool) { if (v.lineup!.length >= lineupMax(v)) break; if (inviteAct(s, r, id, a.id).ok) n++; }
  return n;
}

function festivalEdition(s: GameState, r: Rng, v: Venture): void {
  const ups = v.lineup!.map((x) => ({ x, a: s.acts[x.actId] })).filter((y) => activeAct(y.a)).sort((a, b) => b.a!.fame - a.a!.fame);
  const cap = festCapacity(v);
  const head = ups[0]?.a;
  const draw = clamp(0.1 + (head?.fame ?? 0) / 130 + ups.length * 0.03 + v.rep / 250 + standingOf(s, 'player').pop / 600, 0, 1.4);
  const ratio = (v.price ?? money(s, 25)) / money(s, 25);
  const competition = ventures(s).npc.filter((n) => n.kind === 'festival' && n.city === v.city).length;
  const rain = r.chance([0, 1, 2, 10, 11].includes(v.month!) ? 0.18 : 0.08);
  let crowd = Math.round(Math.min(cap, cap * draw * Math.pow(ratio, -0.8) * Math.pow(0.88, competition) * (rain ? 0.6 : 1)));
  const disaster = r.chance(clamp(0.035 - v.level * 0.003 - v.staff * 0.003 + (crowd > cap * 0.95 ? 0.02 : 0), 0.004, 0.08));
  if (disaster) crowd = Math.round(crowd * 0.7);
  const fees = ups.reduce((t, y) => t + y.x.fee, 0);
  const rev = crowd * (v.price ?? 0) + money(s, 1500 * v.level * (0.5 + v.rep / 60));
  const cost = fees + money(s, 6000 * v.level) + (rain ? money(s, 3000 * v.level) : 0) + (disaster ? money(s, 15000 * v.level) : 0);
  const key = `fest:${v.id}:${s.year}`;
  vpay(s, v.owner, rev, `${key}:rev`, `Bilheteria ${v.name}`, v);
  vpay(s, v.owner, -cost, `${key}:cost`, `Produção e cachês ${v.name}`, v);
  const fill = crowd / cap;
  const verdict: Verdict = disaster ? 'disaster' : fill > 0.9 && (head?.fame ?? 0) > 60 && r.chance(0.3 + v.rep / 250) ? 'legend' : fill < 0.4 ? 'flop' : 'ok';
  v.rep = clamp(v.rep + { legend: 14, ok: 3, flop: -6, disaster: -20 }[verdict], 0, 100);
  for (const y of ups) {
    const a = y.a!;
    a.fame = clamp(a.fame + (verdict === 'legend' ? 3 : verdict === 'disaster' ? 0 : 1), 0, 100);
    a.momentum = clamp(a.momentum + (verdict === 'legend' ? 10 : 4), 0, 100);
    a.cash += Math.round(y.x.fee * 0.7);
  }
  v.editions!.push({ y: s.year, crowd, profit: rev - cost, verdict, head: head?.name ?? '—' });
  if (v.editions!.length > 30) v.editions!.shift();
  v.lineup = [];
  const text = verdict === 'legend'
    ? fmtL(l('{n} {y} entra para a história: {c} pessoas, {h} no palco principal.', '{n} {y} goes down in history: {c} people, {h} headlining.'), { n: v.name, y: s.year, c: crowd, h: head?.name ?? '—' })
    : verdict === 'disaster'
      ? fmtL(l('{n} {y} vira desastre: {w}, feridos e manchetes. Público de {c}.', '{n} {y} turns into a disaster: {w}, injuries and headlines. Crowd of {c}.'), { n: v.name, y: s.year, c: crowd, w: rain ? l('tempestade', 'storm') : l('falha de estrutura', 'structural failure') })
      : fmtL(l('{n} {y}: {c} pessoas ({v}){w}.', '{n} {y}: {c} people ({v}){w}.'), { n: v.name, y: s.year, c: crowd, v: VERDICT_NAME[verdict], w: rain ? l(', debaixo de chuva', ', in the rain') : '' });
  if (verdict === 'disaster') s.player.reputation.institutional = clamp(s.player.reputation.institutional - (v.owner === 'label' ? 5 : 2), 0, 100);
  if (verdict === 'legend') s.player.legacy.cultural = (s.player.legacy.cultural ?? 0) + 2;
  remember(s, 'festival9', text, { important: verdict === 'legend' || verdict === 'disaster' });
  notify(s, text, verdict === 'disaster' || verdict === 'flop' ? 'bad' : 'good');
  log(s, text);
}

// ---------------------------------------------------------------- editora

export function writerCandidates(s: GameState, id: string): { pid: string; name: string; skill: number; act?: string }[] {
  const v = byId(s, id);
  const taken = new Set(ventures(s).list.flatMap((x) => x.writers?.map((w) => w.pid) ?? []));
  const out: { pid: string; name: string; skill: number; act?: string }[] = [];
  for (const a of Object.values(s.acts)) {
    if (!activeAct(a)) continue;
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p?.alive || taken.has(pid) || p.isPlayer) continue;
      const skill = Math.round(((p.skills.comp ?? 0) + (p.skills.lyr ?? 0)) / 2);
      if (skill >= 40) out.push({ pid, name: p.name, skill, act: a.name });
    }
  }
  return v ? out.sort((a, b) => b.skill - a.skill).slice(0, 12) : [];
}
export function writerAdvance(s: GameState, skill: number): number { return money(s, 300 + skill * skill * 2); }

export function signWriter(s: GameState, r: Rng, id: string, pid: string): { ok: boolean; text: L } {
  const v = byId(s, id);
  const c = writerCandidates(s, id).find((x) => x.pid === pid);
  if (!v || !c) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (v.writers!.length >= 2 + v.level * 2) return { ok: false, text: l('A editora não comporta mais compositores neste nível.', 'The publisher cannot hold more writers at this level.') };
  const adv = writerAdvance(s, c.skill);
  if (funds(s, v.owner) < adv) return { ok: false, text: l('Sem dinheiro para o adiantamento.', 'Not enough for the advance.') };
  if (!r.chance(clamp(0.45 + v.rep / 200 - (c.skill - 60) / 150, 0.1, 0.95))) return { ok: false, text: fmtL(l('{n} preferiu outra editora.', '{n} chose another publisher.'), { n: c.name }) };
  vpay(s, v.owner, -adv, `wr:${v.id}:${pid}`, `Adiantamento ${c.name}`, v);
  v.writers!.push({ pid, name: c.name, skill: c.skill, until: s.year + 5 });
  return { ok: true, text: fmtL(l('{n} assina com {v} por 5 anos.', '{n} signs with {v} for 5 years.'), { n: c.name, v: v.name }) };
}

const W1 = ['Noite', 'Estrada', 'Coração', 'Cidade', 'Fogo', 'Mar', 'Saudade', 'Asfalto', 'Lua', 'Rádio', 'Vento', 'Ouro'];
const W2 = ['Azul', 'Sem Fim', 'de Neon', 'Perdida', 'Elétrica', 'do Sul', 'em Chamas', 'Calada', 'Selvagem', 'de Vidro'];

function placeOne(s: GameState, r: Rng, v: Venture, w: { name: string; skill: number }, a: Act): void {
  const title = `${r.pick(W1)} ${r.pick(W2)}`;
  v.cat!.push({ title, actId: a.id, y: s.year, v: money(s, 20 + a.fame * w.skill * 0.08) * (0.7 + r.next() * 0.6) });
  if (v.cat!.length > 80) { v.cat!.sort((x, y) => y.v - x.v); v.cat!.length = 80; }
  v.rep = clamp(v.rep + a.fame / 60, 0, 100);
  log(s, fmtL(l('{w} emplaca "{t}" com {a} ({b}).', '{w} places "{t}" with {a} ({b}).'), { w: w.name, t: title, a: a.name, b: ownerLabel(s, a) ?? l('independente', 'independent') }));
}

export function placeSong(s: GameState, r: Rng, id: string, pid: string, actId: string): { ok: boolean; text: L } {
  const v = byId(s, id);
  const w = v?.writers?.find((x) => x.pid === pid);
  const a = s.acts[actId];
  if (!v || !w || !activeAct(a)) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if ((v.cool ?? 0) > s.week) return { ok: false, text: l('A equipe ainda está trabalhando na última oferta.', 'The team is still working the last pitch.') };
  v.cool = s.week + 4;
  if (!r.chance(clamp(0.3 + w.skill / 200 + v.rep / 300 - a.fame / 250, 0.05, 0.9))) return { ok: false, text: fmtL(l('{a} passou a música.', '{a} passed on the song.'), { a: a.name }) };
  placeOne(s, r, v, w, a);
  return { ok: true, text: fmtL(l('Música colocada com {a}.', 'Song placed with {a}.'), { a: a.name }) };
}

export function pitchSync(s: GameState, r: Rng, id: string): { ok: boolean; text: L } {
  const v = byId(s, id);
  if (!v || v.kind !== 'publisher' || !v.cat!.length) return { ok: false, text: l('A editora precisa de catálogo.', 'The publisher needs a catalog.') };
  if ((v.cool ?? 0) > s.week) return { ok: false, text: l('A equipe ainda está ocupada.', 'The team is still busy.') };
  v.cool = s.week + 8;
  const where = s.year < 1950 ? l('um filme', 'a film') : s.year < 1980 ? l('uma novela', 'a soap opera') : s.year < 2000 ? l('um comercial', 'an ad') : l('uma série', 'a series');
  if (!r.chance(clamp(0.25 + v.rep / 200 + v.cat!.length / 200, 0.1, 0.8))) return { ok: false, text: fmtL(l('Nenhuma música entrou em {w} desta vez.', 'No song landed in {w} this time.'), { w: where }) };
  const fee = money(s, r.int(2000, 12000) * v.level);
  vpay(s, v.owner, fee, `sync:${v.id}`, `Sincronização ${v.name}`, v);
  v.rep = clamp(v.rep + 2, 0, 100);
  return { ok: true, text: fmtL(l('"{t}" entra em {w}.', '"{t}" lands in {w}.'), { t: r.pick(v.cat!).title, w: where }) };
}

function publisherMonth(s: GameState, r: Rng, v: Venture): void {
  v.writers = v.writers!.filter((w) => w.until > s.year && s.persons[w.pid]?.alive !== false);
  for (const w of v.writers) {
    if (!r.chance(w.skill / 450 + v.staff * 0.01)) continue;
    const pool = Object.values(s.acts).filter((a) => activeAct(a) && a.fame >= 10);
    if (pool.length) placeOne(s, r, v, w, r.pick(pool));
  }
  let inc = 0;
  for (const c of v.cat!) inc += c.v * Math.pow(0.97, s.year - c.y);
  vpay(s, v.owner, inc * (1 + v.level * 0.08), `roy:${v.id}`, `Royalties ${v.name}`, v);
  if (v.cat!.length && r.chance(Math.min(0.05, v.cat!.length * 0.0015))) {
    const c = r.pick(v.cat!);
    if (r.chance(0.5 + v.rep / 300)) {
      v.rep = clamp(v.rep + 2, 0, 100);
      log(s, fmtL(l('Acusação de plágio contra "{t}" é derrubada na justiça.', 'Plagiarism claim against "{t}" is thrown out.'), { t: c.title }));
    } else {
      vpay(s, v.owner, -money(s, 4000 * v.level), `plag:${v.id}`, `Acordo de plágio "${c.title}"`, v);
      v.rep = clamp(v.rep - 5, 0, 100);
      c.v *= 0.5;
      const t = fmtL(l('{n} perde disputa de plágio por "{t}" e paga acordo.', '{n} loses a plagiarism dispute over "{t}" and settles.'), { n: v.name, t: c.title });
      notify(s, t, 'bad');
      log(s, t);
    }
  }
}

// ---------------------------------------------------------------- estúdio

export function upgradeGear(s: GameState, id: string): L | null {
  const v = byId(s, id);
  if (!v || v.kind !== 'studio') return l('Inválido.', 'Invalid.');
  if (v.gear! >= maxGear(s)) return l('O melhor equipamento da época já está instalado.', 'The best gear of the era is already installed.');
  const c = money(s, 15000 * (v.gear! + 1));
  if (funds(s, v.owner) < c) return l('Sem dinheiro.', 'Not enough money.');
  vpay(s, v.owner, -c, `gear:${v.id}`, `Equipamento ${v.name}`, v);
  v.gear! += 1;
  return null;
}

function studioMonth(s: GameState, r: Rng, v: Venture): void {
  const gap = maxGear(s) - v.gear!;
  const comp = ventures(s).npc.filter((n) => n.kind === 'studio' && n.city === v.city).length;
  const demand = v.level * 3 * (0.4 + v.sound! / 100) * Math.pow(0.6, gap) * Math.pow(0.85, comp);
  const n = Math.max(0, Math.round(demand + r.normal(0, 1)));
  const labs = Object.values(s.labels).filter((x) => x.active);
  v.booked = [];
  for (let i = 0; i < n && labs.length; i++) {
    const lb = r.pick(labs);
    const b = v.booked.find((x) => x.lab === lb.id);
    if (b) b.n++; else v.booked.push({ lab: lb.id, n: 1 });
  }
  vpay(s, v.owner, n * money(s, 700 * (1 + v.gear! * 0.3)), `sess:${v.id}`, `Sessões ${v.name}`, v);
  v.sound = clamp(v.sound! + n * 0.12 + v.staff * 0.1 - 0.3 - gap * 0.3, 0, 100);
  v.rep = clamp(v.rep + (v.sound! - v.rep) * 0.05, 0, 100);
}

/** Som da casa: o melhor estúdio do dono levanta a produção dos discos dos artistas do selo. */
export function houseSound(s: GameState): number {
  return Math.max(0, ...ventures(s).list.filter((v) => v.kind === 'studio').map((v) => v.sound! * (0.6 + v.level * 0.08)));
}

// ---------------------------------------------------------------- agência de shows

export function bookingCandidates(s: GameState, id: string): Act[] {
  const v = byId(s, id);
  const taken = new Set(ventures(s).list.flatMap((x) => x.clients?.map((c) => c.actId) ?? []));
  return v ? Object.values(s.acts).filter((a) => activeAct(a) && a.fame >= 10 && !taken.has(a.id)).sort((a, b) => b.fame - a.fame).slice(0, 30) : [];
}
export function grossShows(s: GameState, a: Act): number { return money(s, 250 * Math.pow(1 + a.fame / 10, 1.6)); }

export function signBooking(s: GameState, r: Rng, id: string, actId: string, rate: number): { ok: boolean; text: L } {
  const v = byId(s, id);
  const a = s.acts[actId];
  if (!v || v.kind !== 'booking' || !activeAct(a)) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (v.clients!.length >= 3 + v.level * 2) return { ok: false, text: l('A agência está no limite de clientes.', 'The agency is at client capacity.') };
  rate = clamp(rate, 0.08, 0.2);
  if (!r.chance(clamp(0.5 + v.rep / 200 - (rate - 0.1) * 3 - a.fame / 300 + v.level * 0.04, 0.05, 0.95))) return { ok: false, text: fmtL(l('{a} ficou com a agência atual.', '{a} stayed with their current agency.'), { a: a.name }) };
  v.clients!.push({ actId, rate, since: s.week });
  return { ok: true, text: fmtL(l('{a} agora é agenciado por {n}.', '{a} is now booked by {n}.'), { a: a.name, n: v.name }) };
}

export function routeTour(s: GameState, r: Rng, id: string, actId: string): { ok: boolean; text: L } {
  const v = byId(s, id);
  const c = v?.clients?.find((x) => x.actId === actId);
  const a = s.acts[actId];
  if (!v || !c || !a) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if ((c.cool ?? 0) > s.week) return { ok: false, text: l('Esse artista ainda está na estrada.', 'That act is still on the road.') };
  c.cool = s.week + 26;
  if (r.chance(0.12 - v.staff * 0.01)) {
    vpay(s, v.owner, -money(s, 2000 * v.level), `tourloss:${v.id}:${actId}`, `Turnê cancelada ${a.name}`, v);
    v.rep = clamp(v.rep - 4, 0, 100);
    return { ok: false, text: fmtL(l('A turnê de {a} foi cancelada no meio do caminho.', '{a}\'s tour was cancelled halfway.'), { a: a.name }) };
  }
  const gross = grossShows(s, a) * 4 * (0.7 + r.next() * 0.6) * (1 + v.level * 0.1);
  vpay(s, v.owner, gross * c.rate, `tour:${v.id}:${actId}`, `Comissão de turnê ${a.name}`, v);
  a.fame = clamp(a.fame + 2, 0, 100);
  a.cash += Math.round(gross * (1 - c.rate) * 0.3);
  v.rep = clamp(v.rep + 2, 0, 100);
  return { ok: true, text: fmtL(l('Turnê de {a} roteirizada: casas cheias e comissão no bolso.', '{a}\'s tour routed: full rooms and the commission in the bank.'), { a: a.name }) };
}

function bookingMonth(s: GameState, r: Rng, v: Venture): void {
  v.clients = v.clients!.filter((c) => activeAct(s.acts[c.actId]) && !(v.rep < 25 && r.chance(0.1)));
  const inc = v.clients.reduce((t, c) => t + grossShows(s, s.acts[c.actId]) * c.rate * (0.8 + v.level * 0.1), 0);
  vpay(s, v.owner, inc, `book:${v.id}`, `Comissões ${v.name}`, v);
  v.rep = clamp(v.rep + v.clients.length * 0.1 - 0.2, 0, 100);
}

// ---------------------------------------------------------------- mídia

export function favorAct(s: GameState, id: string, actId?: string): void {
  const v = byId(s, id);
  if (v?.kind === 'media') v.favored = actId && s.acts[actId] ? actId : undefined;
}

/** Jabá: um rival paga para empurrar o artista dele. Dinheiro fácil, risco de escândalo. */
export function takePayola(s: GameState, r: Rng, id: string): { ok: boolean; text: L } {
  const v = byId(s, id);
  if (!v || v.kind !== 'media') return { ok: false, text: l('Inválido.', 'Invalid.') };
  const labs = Object.values(s.labels).filter((x) => x.active && x.roster.length);
  if (!labs.length) return { ok: false, text: l('Ninguém oferece nada agora.', 'Nobody is offering anything right now.') };
  const lb = r.pick(labs);
  const act = lb.roster.map((x) => s.acts[x]).filter(activeAct).sort((a, b) => b.momentum - a.momentum)[0];
  if (!act) return { ok: false, text: l('Ninguém oferece nada agora.', 'Nobody is offering anything right now.') };
  const pay = money(s, 1500 * v.level * MEDIA[v.media!].mult * (v.reach! / 50 + 0.3));
  vpay(s, v.owner, pay, `payola:${v.id}`, `"Apoio cultural" de ${lb.name}`, v);
  v.favored = act.id;
  v.heat = clamp((v.heat ?? 0) + 0.3, 0, 1.5);
  return { ok: true, text: fmtL(l('{b} paga para {a} tocar sem parar. Melhor ninguém descobrir.', '{b} pays for {a} to be played nonstop. Better nobody finds out.'), { b: lb.name, a: act.name }) };
}

export function pushScene(s: GameState, id: string, genre?: string): void {
  const v = byId(s, id);
  if (v?.kind === 'media') v.scene = genre || undefined;
}

export function mediaReach(s: GameState, v: Venture): number {
  const k = v.media!;
  const decline = (k === 'radio' || k === 'tv' || k === 'magazine') && s.year > 2000 ? Math.min(30, (s.year - 2000) * 1.5) : k === 'blog' && s.year > 2012 ? Math.min(30, (s.year - 2012) * 3) : 0;
  const rise = k === 'playlist' ? Math.min(20, (s.year - 2008) * 2) : 0;
  return clamp(10 + v.level * 12 + v.rep * 0.3 + v.staff * 1.5 - decline + rise, 2, 100);
}

export function isConglomerate(s: GameState): boolean {
  return new Set(ventures(s).list.filter((v) => v.kind === 'media').map((v) => v.media)).size >= 3;
}

function mediaMonth(s: GameState, r: Rng, v: Venture): void {
  v.reach = Math.round((v.reach! + (mediaReach(s, v) - v.reach!) * 0.15) * 10) / 10;
  const conglo = isConglomerate(s) ? 1.25 : 1;
  vpay(s, v.owner, money(s, MEDIA[v.media!].ad) * (v.reach / 50) * (0.6 + v.level * 0.4) * conglo, `ads:${v.id}`, `Publicidade ${v.name}`, v);
  const fav = v.favored ? s.acts[v.favored] : undefined;
  if (fav) {
    fav.momentum = clamp(fav.momentum + v.reach / 20, 0, 100);
    if (r.chance(v.reach / 200)) fav.fame = clamp(fav.fame + 1, 0, 100);
    if (fav.owner === 'player') v.rep = clamp(v.rep - 0.4, 0, 100); // jabá caseiro: público percebe
  }
  if (v.scene) {
    const key = `${v.city}:${v.scene}`;
    s.scenes[key] = clamp((s.scenes[key] ?? 0) + v.reach / 25, 0, 100);
    for (const a of Object.values(s.acts)) if (a.genre === v.scene && a.city === v.city && activeAct(a)) a.momentum = clamp(a.momentum + 0.5, 0, 100);
  }
  v.heat = Math.max(0, (v.heat ?? 0) - 0.04);
  if (v.heat > 0.1 && r.chance(v.heat * 0.07)) {
    v.rep = clamp(v.rep - 25, 0, 100);
    v.heat = 0;
    v.favored = undefined;
    vpay(s, v.owner, -money(s, 5000 * v.level * MEDIA[v.media!].mult), `payfine:${v.id}`, `Multa por jabá ${v.name}`, v);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100);
    const t = fmtL(l('Escândalo do jabá: {n} é pego cobrando para tocar músicas.', 'Payola scandal: {n} is caught taking money to play songs.'), { n: v.name });
    remember(s, 'payola9', t, { important: true });
    notify(s, t, 'bad');
    log(s, t);
  } else v.rep = clamp(v.rep + 0.3, 0, 100);
}

// mídia própria: cobertura extra para os lançamentos do selo e do artista favorecido
registerMod('appeal', 'ventures9:media', (s, val, c) => {
  const rel = c.release;
  if (!rel) return null;
  const media = ventures(s).list.filter((v) => v.kind === 'media');
  if (!media.length) return null;
  let m = 1;
  for (const v of media) {
    if (v.favored === rel.actId) m += (v.reach ?? 0) / 400;
    else if (rel.owner === 'player') m += (v.reach ?? 0) / 1500;
  }
  if (rel.owner === 'player' && isConglomerate(s)) m += 0.04;
  return m > 1.001 ? { value: val * Math.min(1.4, m), label: l('Seus veículos de mídia', 'Your media outlets') } : null;
});

// som da casa: produção melhor nos discos dos artistas do selo
registerMod('songQ', 'ventures9:studio', (s, value, ctx) => {
  const song = ctx.song;
  const act = ctx.act;
  if (!song || !act || (act.owner !== 'player' && !act.playerBand)) return null;
  const hs = houseSound(s);
  if (hs < 5) return null;
  const add = Math.min(5, hs / 20);
  const before = song.production;
  song.production = clamp(song.production + add, 5, 100);
  return { value: value + (song.production - before) * 0.4, label: l('Som do estúdio da casa', 'House studio sound') };
});

// ---------------------------------------------------------------- plataforma

export function dealLabel(s: GameState, r: Rng, id: string, labelId: string): { ok: boolean; text: L } {
  const v = byId(s, id);
  const lb = s.labels[labelId];
  if (!v || v.kind !== 'platform' || !lb?.active) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (v.deals!.includes(labelId)) return { ok: false, text: l('Já tem acordo.', 'Deal already in place.') };
  const adv = money(s, 20000 + lb.roster.length * 3000);
  if (funds(s, v.owner) < adv) return { ok: false, text: l('Sem dinheiro para o adiantamento.', 'Not enough for the advance.') };
  if (!r.chance(clamp(0.2 + (v.payout! - 0.5) * 2 + v.rep / 300, 0.05, 0.95))) return { ok: false, text: fmtL(l('{b} acha o repasse baixo e recusa.', '{b} finds the payout too low and refuses.'), { b: lb.name }) };
  vpay(s, v.owner, -adv, `deal:${v.id}:${labelId}`, `Licença de catálogo ${lb.name}`, v);
  v.deals!.push(labelId);
  return { ok: true, text: fmtL(l('Catálogo de {b} entra na {n}.', '{b}\'s catalog joins {n}.'), { b: lb.name, n: v.name }) };
}

export function setPayout(s: GameState, id: string, p: number): void {
  const v = byId(s, id);
  if (v?.kind === 'platform') v.payout = clamp(Math.round(p * 100) / 100, 0.4, 0.85);
}

function platformMonth(s: GameState, r: Rng, v: Venture): void {
  v.deals = v.deals!.filter((id) => s.labels[id]?.active);
  const own = Object.values(s.releases).filter((x) => x.owner === 'player').length;
  const catalog = own + v.deals.reduce((t, id) => t + (s.labels[id]?.roster.length ?? 0) * 8, 0);
  const rivals = ventures(s).npc.filter((n) => n.kind === 'platform').length;
  const target = (catalog * 400 + v.level * 15000 + v.rep * 500) * Math.pow(0.8, rivals);
  v.subs = Math.max(0, Math.round(v.subs! + (target - v.subs!) * 0.06 + r.normal(0, v.subs! * 0.01)));
  const gross = v.subs * money(s, 8) * 0.25;
  vpay(s, v.owner, gross, `subs:${v.id}`, `Assinaturas ${v.name}`, v);
  vpay(s, v.owner, -gross * v.payout! * (v.deals.length ? 1 : 0.4), `payout:${v.id}`, `Repasse às gravadoras ${v.name}`, v);
  v.rep = clamp(v.rep + (v.subs > 100000 ? 0.5 : 0.1), 0, 100);
  // conflito: repasse baixo faz gravadoras tirarem o catálogo
  if (v.deals.length && v.payout! < 0.6 && r.chance((0.6 - v.payout!) * 0.6)) {
    const gone = v.deals.splice(r.int(0, v.deals.length - 1), 1)[0];
    const t = fmtL(l('{b} retira o catálogo da {n} em protesto contra o repasse.', '{b} pulls its catalog from {n} protesting the payouts.'), { b: s.labels[gone]?.name ?? '?', n: v.name });
    notify(s, t, 'bad');
    log(s, t);
  }
}

// ---------------------------------------------------------------- gestão de artistas

export function mgCandidates(s: GameState): Act[] {
  const mg = ventures(s).mg;
  const taken = new Set(mg.clients.map((c) => c.actId));
  return Object.values(s.acts).filter((a) => activeAct(a) && !a.playerBand && a.fame >= 8 && !taken.has(a.id)).sort((a, b) => b.fame - a.fame).slice(0, 30);
}
export function mgCap(s: GameState): number { return 2 + Math.floor(ventures(s).mg.rep / 20); }
export function mgGross(s: GameState, a: Act): number { return money(s, 200 * Math.pow(1 + a.fame / 10, 1.6)) + Math.round(a.momentum * money(s, 15)); }

export function mgChance(s: GameState, a: Act, rate: number): number {
  const mg = ventures(s).mg;
  const o = ownerOf(s);
  const fired = mg.fired.some((f) => f.actId === a.id && s.year - f.y < 5);
  return clamp(0.35 + mg.rep / 200 + (o.attrs.charisma - 50) / 250 + (standingOf(s, 'player').trust - 50) / 400 - (rate - 0.1) * 2.5 - Math.max(0, a.fame - mg.rep) / 150 - (fired ? 0.3 : 0) + (a.owner === 'player' ? 0.1 : 0), 0.03, 0.95);
}

export function pitchClient(s: GameState, r: Rng, actId: string, rate: number): { ok: boolean; text: L } {
  const mg = ventures(s).mg;
  const a = s.acts[actId];
  if (!activeAct(a) || mg.clients.some((c) => c.actId === actId)) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (mg.clients.length >= mgCap(s)) return { ok: false, text: l('Você não dá conta de mais artistas (a reputação de empresário aumenta o limite).', 'You cannot handle more acts (manager reputation raises the cap).') };
  rate = clamp(rate, 0.1, 0.2);
  if (!r.chance(mgChance(s, a, rate))) return { ok: false, text: fmtL(l('{a} agradece, mas não quer você como empresário.', '{a} thanks you but does not want you as manager.'), { a: a.name }) };
  mg.clients.push({ actId, rate, since: s.week, sat: 60, earned: 0 });
  remember(s, 'manager9', fmtL(l('Você passa a empresariar {a} ({p}% de comissão).', 'You start managing {a} ({p}% commission).'), { a: a.name, p: Math.round(rate * 100) }));
  return { ok: true, text: fmtL(l('{a} topou: você é o novo empresário.', '{a} agreed: you are the new manager.'), { a: a.name }) };
}

export function dropClient(s: GameState, actId: string): void {
  const mg = ventures(s).mg;
  mg.clients = mg.clients.filter((c) => c.actId !== actId);
}

export function setMgOwner(s: GameState, h: Holder): void { ventures(s).mg.owner = h; }

/** Renegocia o contrato do agenciado com a gravadora dele. */
export function negotiateFor(s: GameState, r: Rng, actId: string): { ok: boolean; text: L } {
  const mg = ventures(s).mg;
  const c = mg.clients.find((x) => x.actId === actId);
  const a = s.acts[actId];
  const k = a?.contractId ? s.contracts[a.contractId] : undefined;
  if (!c || !a) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (!k || k.endWeek <= s.week) return { ok: false, text: l('Sem contrato com gravadora para renegociar.', 'No label contract to renegotiate.') };
  if (k.party === 'player') return { ok: false, text: l('Conflito de interesse: o contrato é com o seu próprio selo.', 'Conflict of interest: the contract is with your own label.') };
  if (c.lastNeg && s.week - c.lastNeg < 26) return { ok: false, text: l('Renegociou há pouco; a gravadora não vai ouvir agora.', 'You renegotiated recently; the label will not listen now.') };
  c.lastNeg = s.week;
  const lb = s.labels[k.party];
  const p = clamp(0.3 + (ownerOf(s).attrs.negotiation - 50) / 200 + a.fame / 300 + mg.rep / 300 - (lb ? (standingOf(s, lb.id).rec - 50) / 400 : 0), 0.05, 0.9);
  if (!r.chance(p)) {
    c.sat = clamp(c.sat - 6, 0, 100);
    return { ok: false, text: fmtL(l('{b} não cedeu nada a {a}.', '{b} gave {a} nothing.'), { b: lb?.name ?? '?', a: a.name }) };
  }
  k.royalty = Math.min(0.5, Math.round((k.royalty + 0.03) * 100) / 100);
  const bonus = money(s, 1000 + a.fame * 80);
  a.cash += bonus;
  c.sat = clamp(c.sat + 15, 0, 100);
  mg.rep = clamp(mg.rep + 3, 0, 100);
  if (lb) standingOf(s, lb.id).trust = clamp(standingOf(s, lb.id).trust - 1, 0, 100);
  return { ok: true, text: fmtL(l('Você arranca de {b} +3 pontos de royalty e um bônus para {a}.', 'You squeeze +3 royalty points and a bonus for {a} out of {b}.'), { b: lb?.name ?? '?', a: a.name }) };
}

export type CrisisMove = 'pr' | 'rest' | 'lawyer';
export function crisisCost(s: GameState, m: CrisisMove): number { return money(s, m === 'lawyer' ? 6000 : m === 'pr' ? 3000 : 1000); }

export function handleCrisis(s: GameState, r: Rng, actId: string, m: CrisisMove): { ok: boolean; text: L } {
  const mg = ventures(s).mg;
  const c = mg.clients.find((x) => x.actId === actId);
  const a = s.acts[actId];
  if (!c?.crisis || !a) return { ok: false, text: l('Nenhuma crise.', 'No crisis.') };
  const cost = crisisCost(s, m);
  if (funds(s, mg.owner) < cost) return { ok: false, text: l('Sem dinheiro.', 'Not enough money.') };
  vpay(s, mg.owner, -cost, `crisis:${actId}`, `Gestão de crise ${a.name}`);
  const fit = (c.crisis.k === 'legal' && m === 'lawyer') || (c.crisis.k === 'scandal' && m === 'pr') || ((c.crisis.k === 'burnout' || c.crisis.k === 'feud') && m === 'rest');
  const ok = r.chance(clamp((fit ? 0.7 : 0.3) + (ownerOf(s).attrs.charisma - 50) / 250 + mg.rep / 400, 0.1, 0.95));
  c.crisis = undefined;
  if (ok) {
    c.sat = clamp(c.sat + 10, 0, 100);
    mg.rep = clamp(mg.rep + 2, 0, 100);
    return { ok, text: fmtL(l('Crise de {a} contornada.', '{a}\'s crisis handled.'), { a: a.name }) };
  }
  c.sat = clamp(c.sat - 8, 0, 100);
  a.fame = clamp(a.fame - 2, 0, 100);
  return { ok, text: fmtL(l('A crise de {a} deixou marcas.', '{a}\'s crisis left scars.'), { a: a.name }) };
}

function managementMonth(s: GameState, r: Rng): void {
  const mg = ventures(s).mg;
  for (const c of mg.clients.slice()) {
    const a = s.acts[c.actId];
    if (!activeAct(a)) { dropClient(s, c.actId); continue; }
    const fee = mgGross(s, a) * c.rate;
    vpay(s, mg.owner, fee, `mg:${a.id}`, `Comissão de empresário ${a.name}`);
    c.earned += Math.round(fee);
    mg.total += Math.round(fee);
    c.sat = clamp(c.sat + (a.momentum - 50) / 25 - (c.rate - 0.15) * 15 + (mg.rep - 40) / 100 - (c.crisis ? 4 : 0), 0, 100);
    if (c.crisis && s.week - c.crisis.w > 8) {
      a.fame = clamp(a.fame - 3, 0, 100);
      if (c.crisis.k === 'scandal') a.scandals += 1;
      c.sat = clamp(c.sat - 20, 0, 100);
      notify(s, fmtL(l('Você deixou a crise de {a} sem resposta. O estrago está feito.', 'You left {a}\'s crisis unanswered. The damage is done.'), { a: a.name }), 'bad');
      c.crisis = undefined;
    } else if (!c.crisis && r.chance(0.03)) {
      c.crisis = { k: r.pick(['scandal', 'burnout', 'feud', 'legal'] as CrisisK[]), w: s.week };
      notify(s, fmtL(l('Crise com {a}: {k}. Resolva na Gestão de artistas.', 'Crisis with {a}: {k}. Handle it in Artist management.'), { a: a.name, k: CRISIS_NAME[c.crisis.k] }), 'bad');
    }
    if (c.sat < 25 && r.chance(0.15)) {
      dropClient(s, c.actId);
      mg.fired.push({ actId: a.id, y: s.year });
      if (mg.fired.length > 20) mg.fired.shift();
      mg.rep = clamp(mg.rep - 5, 0, 100);
      const t = fmtL(l('{a} demite você como empresário.', '{a} fires you as manager.'), { a: a.name });
      remember(s, 'manager9', t);
      notify(s, t, 'bad');
      continue;
    }
    if (c.sat > 60) mg.rep = clamp(mg.rep + 0.3, 0, 100);
  }
}

// ---------------------------------------------------------------- rivais com negócios

function npcYear(s: GameState, r: Rng): void {
  const st = ventures(s);
  st.npc = st.npc.filter((n) => s.labels[n.labelId]?.active);
  if (st.npc.length >= 14) return;
  const rich = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 300000));
  for (const lb of rich) {
    if (!r.chance(0.08)) continue;
    const kinds = kindsAvailable(s).filter((k) => k !== 'platform' || lb.cash > money(s, 3000000));
    const kind = r.pick(kinds);
    if (st.npc.some((n) => n.labelId === lb.id && n.kind === kind)) continue;
    const city = cityById[lb.city] ? lb.city : r.pick(CITIES).id;
    st.npc.push({ kind, labelId: lb.id, name: `${lb.name} ${VKINDS[kind].name.pt}`, city, rep: r.int(25, 60), y: s.year });
    log(s, fmtL(l('{b} abre um negócio: {k}.', '{b} opens a business: {k}.'), { b: lb.name, k: VKINDS[kind].name }));
  }
  for (const n of st.npc) n.rep = clamp(n.rep + r.int(-4, 5), 0, 100);
}

// ---------------------------------------------------------------- tick

registerSimHook('month', 'ventures9', (s, r) => {
  const st = ventures(s);
  for (const v of st.list) {
    vpay(s, v.owner, -upkeep(s, v), `upk:${v.id}`, `Custos fixos ${v.name}`, v);
    if (v.kind === 'festival') {
      if (s.month === v.month && !v.editions!.some((e) => e.y === s.year)) {
        if (v.lineup!.length) festivalEdition(s, r, v);
        else if (s.year > v.founded) { v.rep = clamp(v.rep - 4, 0, 100); log(s, fmtL(l('{n} não teve edição este ano (line-up vazio).', '{n} skipped this year (empty line-up).'), { n: v.name })); }
      }
    } else if (v.kind === 'publisher') publisherMonth(s, r, v);
    else if (v.kind === 'studio') studioMonth(s, r, v);
    else if (v.kind === 'booking') bookingMonth(s, r, v);
    else if (v.kind === 'media') mediaMonth(s, r, v);
    else if (v.kind === 'platform') platformMonth(s, r, v);
  }
  managementMonth(s, r);
  // gerador próprio (semente + ano): os negócios dos rivais não deslocam o fluxo principal da simulação
  if (s.month === 0) npcYear(s, Rng.fromSeed(`${s.config.seed}:ventures9:${s.year}`));
});
