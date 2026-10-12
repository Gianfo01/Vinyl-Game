// Rodada 19 (Onda 5, A.1) — CADA CARREIRA SUSTENTA UMA PARTIDA DESDE O MÊS 1.
//  • Pacote inicial por carreira principal no Novo Jogo (festival "edição 0" em terreno alugado, editora com 5 obras,
//    sala de estúdio alugada, fanzine, agência de uma pessoa, app beta, clube arrendado). Pago do caixa; o que faltar
//    vira "crédito de fundação" (empréstimo de verdade, 36 parcelas) — nada sai do nada.
//  • Sede de selo só cobra aluguel quando a carreira de selo (ou músico) está ativa (economy.rentOn19).
//  • Festival: teto de público do terreno (alugado → parque → próprio, passo explícito), procura que cai abaixo da
//    capacidade em edições fracas (qualidade do line-up, gênero, época, concorrência), aviso de edição pulada e
//    decisões do ramo nos meses mortos entre edições (olheiro, patrocinador, alvará, vizinhos, tiqueteira).
//  • Empresário: patrocínio com marca, mercado e chance; renovação de mandato como cartão; crises e decisões
//    do ofício que chegam ao jogador.
// Gerador próprio (semente + chave + mês): nada desloca o fluxo principal.

import { Rng, clamp } from '../../core/rng';
import { MARKETS, cityById, familyOf, l, type L } from '../../data/world';
import { deferEvents, registerSimHook } from '../ext4';
import { emitEvent, type EventDef } from '../events';
import { emitFact, onFact } from '../facts17';
import { grantHold } from '../holds17';
import { registerExplain } from '../explain18';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { BRANDS } from '../brands';
import { rentOn19 } from '../slots19';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { monthIndex } from '../capacity';
import { careers, isActive } from './careers12';
import { buyVenue } from './live/venue';
import { festCap19, festModel } from './live/festival';
import { liveOf, type OwnFestival } from './live/state';
import { f12, festDem19, festOf, festPay12, muOf, sync12 } from './fest12';
import { c12, endorse19, mgRenew12 } from './manager12';
import { standingOf } from './standing9';
import { VKINDS, dropClient, grossShows, kindsAvailable, maxGear, mediaAvailable, upkeepAdj9, ventures, vpay, type Venture, type VKind } from './ventures9';
import { songTitle } from '../people';
import { ownerOf } from './people/owner';

// ---------------------------------------------------------------- estado

export interface Car19State {
  init: boolean;
  /** negócios nascidos do pacote inicial (custos fixos reduzidos enquanto no nível 1) */
  starter: Record<string, VKind>;
  /** terreno de cada festival: 0 alugado, 1 parque, 2 próprio */
  ground: Record<string, number>;
  /** aviso de edição pulada já dado (festival → ano da edição) */
  skipW: Record<string, number>;
  /** último mês com decisão do ramo por festival */
  fcard: Record<string, number>;
  /** cartões do ramo já usados no ciclo (festival → ids) */
  fused: Record<string, string[]>;
  /** último mês com decisão do empresário */
  mcard: number;
  /** renovação pendente (ato → semana) */
  renew: Record<string, number>;
  /** dívida do crédito de fundação (texto para o Novo Jogo/cockpit) */
  credit: number;
  pkg: { k: string; t: L }[];
}
declare module '../ext4' { interface Ext4 { careers19: Car19State } }
const fresh = (): Car19State => ({ init: false, starter: {}, ground: {}, skipW: {}, fcard: {}, fused: {}, mcard: -99, renew: {}, credit: 0, pkg: [] });
export function car19(s: GameState): Car19State {
  const x = s.x4 as unknown as { careers19?: Car19State };
  const st = (x.careers19 ??= fresh());
  st.starter ??= {}; st.ground ??= {}; st.skipW ??= {}; st.fcard ??= {}; st.fused ??= {}; st.renew ??= {}; st.pkg ??= [];
  return st;
}
const rngOf = (s: GameState, k: string) => Rng.fromSeed(`${s.config.seed}:car19:${k}:${monthIndex(s)}`);

// ---------------------------------------------------------------- 1) sede de selo só com selo

rentOn19.f = (s) => !s.config.careers || isActive(s, 'label') || isActive(s, 'musician');

// ---------------------------------------------------------------- 2) pacotes iniciais

export interface Starter19 { kind?: VKind; cost: number; name: L; desc: L; upkeep: number }
/** Custos em dólares de 2020 (convertidos para o ano com money()). */
export const STARTER19: Record<string, Starter19> = {
  festival: { kind: 'festival', cost: 15000, upkeep: 0.25, name: l('Edição 0 em terreno alugado', 'Edition 0 on rented ground'), desc: l('Um terreno alugado para até 1.500 pessoas, um palco e a primeira data daqui a 7 meses. Cresce por passo explícito (parque, terreno próprio).', 'Rented ground for up to 1,500 people, one stage and the first date 7 months out. Grows by explicit steps (park, own ground).') },
  publisher: { kind: 'publisher', cost: 8000, upkeep: 0.4, name: l('Editora de fundo de quintal: 5 obras', 'Back-room publisher: 5 works'), desc: l('Cinco canções de compositores locais já gravadas por artistas pequenos: royalties modestos desde o mês 1.', 'Five songs by local writers already cut by small acts: modest royalties from month 1.') },
  studio: { kind: 'studio', cost: 12000, upkeep: 0.45, name: l('Sala de estúdio alugada', 'Rented studio room'), desc: l('Equipamento de segunda mão (uma geração atrás) e o "som da casa" ainda cru. Sessões de selos pequenos.', 'Second-hand gear (one generation behind) and a raw "house sound". Sessions from small labels.') },
  media: { kind: 'media', cost: 6000, upkeep: 0.35, name: l('Fanzine local', 'Local fanzine'), desc: l('Uma revista pequena (ou blog, depois de 1998) com alcance de bairro: anúncios baratos e a primeira cena para empurrar.', 'A small magazine (or blog after 1998) with neighbourhood reach: cheap ads and a first scene to push.') },
  booking: { kind: 'booking', cost: 5000, upkeep: 0.5, name: l('Agência de uma pessoa só', 'One-person agency'), desc: l('Uma mesa, um telefone e contatos de estrada: assine os primeiros clientes pequenos.', 'A desk, a phone and road contacts: sign your first small clients.') },
  platform: { kind: 'platform', cost: 60000, upkeep: 0.08, name: l('Startup com app beta', 'Startup with a beta app'), desc: l('Um app em teste com 5 mil assinantes e servidores alugados: catálogo e repasse decidem se cresce.', 'A beta app with 5k subscribers and rented servers: catalog and payouts decide if it grows.') },
  venue: { cost: 18000, upkeep: 1, name: l('Clube arrendado', 'Leased club'), desc: l('Um clube de 400 lugares: 30% de entrada, o resto num crédito de fundação de 48 meses.', 'A 400-seat club: 30% down, the rest as a 48-month founding credit.') },
  manager: { cost: 0, upkeep: 1, name: l('Agenda de contatos', 'Contact book'), desc: l('Não precisa fundar nada: comece por talentos desconhecidos (chance alta) e suba a faixa de fama com a reputação.', 'Nothing to found: start with unknown talents (high odds) and climb the fame band as your reputation grows.') },
};
/** Custo do pacote no ano (centavos). */
export const starterCost19 = (s: GameState, id: string): number => money(s, STARTER19[id]?.cost ?? 0);
/** Custo de fundação "do zero" (sem pacote), para o Novo Jogo e os botões. */
export const fullCost19 = (s: GameState, id: string): number => (VKINDS[id as VKind] ? money(s, VKINDS[id as VKind].cost) : id === 'venue' ? money(s, 60000) : 0);

// r25: festival fora de temporada (até 6 meses depois da edição) roda com equipe mínima — metade dos custos fixos
const offSeason25 = (s: GameState, v: Venture): number => { if (v.kind !== 'festival' || !v.fx) return 1; const f = festOf(s, v.fx); return f && muOf(s, f) > 6 ? 0.5 : 1; };
upkeepAdj9.f = (s, v) => (car19(s).starter[v.id] && v.level <= 1 ? STARTER19[v.kind]?.upkeep ?? 1 : 1) * offSeason25(s, v);

/** Empréstimo de fundação (crédito honesto: entra no caixa e sai em parcelas). */
function creditLoan(s: GameState, amount: number, months: number, why: string): void {
  if (amount <= 0) return;
  const rate = 0.09;
  const monthly = Math.round((amount * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -months)));
  s.player.loans.push({ id: nextId(s, 'ln'), principal: amount, balance: amount, rate, monthly, startWeek: s.week });
  post(s, `loan_in19:${s.player.loans.length}`, amount, 'financing', why); // financiamento: não é receita (ledger18)
  car19(s).credit += amount;
}

function mkVenture(s: GameState, kind: VKind, cost: number, extra: Partial<Venture>): Venture {
  const md = kind === 'media' ? (s.year >= 1998 && mediaAvailable(s).includes('blog') ? 'blog' : 'magazine') : undefined;
  const nm = kind === 'media' ? (md === 'blog' ? 'Blog' : 'Fanzine') : kind === 'festival' ? 'Fest' : kind === 'studio' ? l('Sala', 'Room').pt : VKINDS[kind].name.pt;
  const v: Venture = { id: nextId(s, 'vn'), kind, owner: 'label', city: s.config.homeCity, level: 1, rep: 20, staff: kind === 'platform' ? 2 : 1, founded: s.year, cost, pl: [], total: 0, name: `${s.config.companyName} ${nm}` };
  if (kind === 'publisher') Object.assign(v, { writers: [], cat: [], cool: 0 });
  if (kind === 'studio') Object.assign(v, { gear: Math.max(0, maxGear(s) - 1), sound: 15, booked: [] });
  if (kind === 'booking') v.clients = [];
  if (md) Object.assign(v, { media: md, reach: 6, heat: 0 });
  if (kind === 'platform') Object.assign(v, { subs: 5000, payout: 0.65, deals: [] });
  if (kind === 'festival') Object.assign(v, { month: (s.month + 7) % 12, price: money(s, 20), lineup: [], editions: [] });
  Object.assign(v, extra);
  ventures(s).list.push(v);
  return v;
}

/** Aplica o pacote de uma carreira (uma vez). Devolve o texto do que foi feito. */
export function applyStarter19(s: GameState, id: string): L | null {
  const st = car19(s);
  const p = STARTER19[id];
  if (!p || st.pkg.some((x) => x.k === id)) return null;
  const cost = starterCost19(s, id);
  let t: L | null = null;
  if (p.kind) {
    if (!kindsAvailable(s).includes(p.kind)) return null;
    const pay = Math.min(cost, Math.max(0, s.player.cash));
    if (pay < cost) creditLoan(s, cost - pay, 36, `Crédito de fundação: ${p.name.pt}`);
    const v = mkVenture(s, p.kind, cost, {});
    vpay(s, 'label', -cost, `found:${v.id}`, `Pacote inicial: ${p.name.pt}`, v);
    st.starter[v.id] = p.kind;
    if (p.kind === 'publisher') seedCatalog(s, v);
    if (p.kind === 'festival') {
      sync12(s);
      const f = festOf(s, v.fx!)!;
      if (muOf(s, f) < 6) f.nextYear += 1;
      const x = f12(s, f);
      x.ident = 'discovery';
      x.cyc.year = f.nextYear;
      st.ground[f.id] = 0;
    }
    t = fmtL(l('Pacote inicial: {n} ({c}).', 'Starter package: {n} ({c}).'), { n: p.name, c: `$${Math.round(cost / 100).toLocaleString()}` });
  } else if (id === 'venue') {
    if (liveOf(s).venue || s.year < 1920) return null;
    const full = money(s, 60000);
    const down = Math.min(Math.round(full * 0.3), Math.max(0, s.player.cash));
    creditLoan(s, full - down, 48, 'Crédito de fundação: clube arrendado');
    const r = buyVenue(s, 'club', s.config.homeCity, '');
    if ('pt' in r) return null;
    t = fmtL(l('Pacote inicial: clube arrendado ({d} de entrada, o resto em 48 parcelas).', 'Starter package: leased club ({d} down, the rest in 48 instalments).'), { d: `$${Math.round(down / 100).toLocaleString()}` });
  } else if (id === 'manager') t = l('Empresário: comece pelos talentos desconhecidos (aba Talentos) — a chance é alta e a confiança vem junto.', 'Manager: start with unknown talents (Talents tab) — high odds and the trust comes with it.');
  if (t) { st.pkg.push({ k: id, t }); remember(s, 'careers19', t, { important: true }); }
  return t;
}
function seedCatalog(s: GameState, v: Venture): void {
  const r = rngOf(s, `cat:${v.id}`);
  const mk = cityById[s.config.homeCity]?.market;
  const acts = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.fame < 30 && a.owner !== 'player' && !a.playerBand)
    .sort((a, b) => (cityById[b.city]?.market === mk ? 1 : 0) - (cityById[a.city]?.market === mk ? 1 : 0) || b.fame - a.fame).slice(0, 20);
  for (let i = 0; i < 5 && acts.length; i++) {
    const a = acts.splice(r.int(0, acts.length - 1), 1)[0];
    v.cat!.push({ title: songTitle(r, 'en'), actId: a.id, y: s.year - r.int(0, 4), v: money(s, 20 + a.fame * 40 * 0.08) * (0.7 + r.next() * 0.6) });
  }
}

registerSimHook('newgame', 'careers19', (s) => {
  const st = car19(s);
  if (st.init) return;
  st.init = true;
  if (!s.config.careers?.main?.length) return;
  careers(s);
  for (const id of s.config.careers.main) applyStarter19(s, id);
});

// ---------------------------------------------------------------- 3) festival: terreno, procura, avisos, meses mortos

export const GROUND19: { name: L; cap: number; cost: number; need: L; ok: (s: GameState, f: OwnFestival) => boolean }[] = [
  { name: l('Terreno alugado', 'Rented ground'), cap: 1500, cost: 0, need: l('—', '—'), ok: () => true },
  { name: l('Parque municipal (alugado por edição)', 'Municipal park (rented per edition)'), cap: 4000, cost: 12000, need: l('1 edição feita', '1 edition held'), ok: (s, f) => f12(s, f).hist.length >= 1 },
  { name: l('Terreno próprio', 'Own grounds'), cap: Infinity, cost: 40000, need: l('2 edições e reputação 35+', '2 editions and reputation 35+'), ok: (s, f) => f12(s, f).hist.length >= 2 && f.rep >= 35 },
];
export const groundOf19 = (s: GameState, fid: string): number => car19(s).ground[fid] ?? 2;
festCap19.f = (s, f) => GROUND19[groundOf19(s, f.id)]?.cap ?? Infinity;

/** Passo explícito de crescimento do terreno. */
export function growGround19(s: GameState, fid: string): L | null {
  const f = festOf(s, fid);
  if (!f) return l('Inválido.', 'Invalid.');
  const g = groundOf19(s, fid);
  const nx = GROUND19[g + 1];
  if (!nx) return l('O terreno já é seu: cresça com portões e palcos no editor.', 'The grounds are yours: grow with gates and stages in the editor.');
  if (!nx.ok(s, f)) return fmtL(l('Ainda não: precisa de {n}.', 'Not yet: needs {n}.'), { n: nx.need });
  const c = money(s, nx.cost);
  const v = ventures(s).list.find((y) => y.fx === fid);
  const h = v?.owner ?? 'label';
  if ((h === 'label' ? s.player.cash : ownerOf(s).wealth) < c) return l('Sem dinheiro para o passo.', 'Not enough money for this step.');
  festPay12(s, f, -c, `ground19:${g + 1}`, `${f.name}: ${nx.name.pt}`);
  car19(s).ground[fid] = g + 1;
  const t = fmtL(l('{f} muda para {g}: cabe mais gente (até {c}).', '{f} moves to {g}: room for more people (up to {c}).'), { f: f.name, g: nx.name, c: Number.isFinite(nx.cap) ? nx.cap.toLocaleString() : l('o que os portões permitirem', 'whatever the gates allow') });
  emitFact(s, { kind: 'fest_ground', actors: ['player'], place: f.cityId, severity: 20, text: t, src: 'careers19', data: { fx: fid, g: g + 1 } });
  remember(s, 'careers19', t);
  return null;
}

export interface Dem19 { k: number; top: number; avg: number; coh: number; hot: number; comp: number; raw: number; eff: number; sat: number }
/** Qualidade da edição para o público: headliner, média, coerência de gênero, gênero em alta e concorrência. */
export function festQ19(s: GameState, f: OwnFestival, acts: Act[]): Dem19 {
  if (!acts.length) return { k: 1, top: 0, avg: 0, coh: 0, hot: 0, comp: 0, raw: 0, eff: 0, sat: 1 };
  const top = acts.reduce((t, a) => Math.max(t, a.fame), 0);
  const avg = acts.reduce((t, a) => t + a.fame, 0) / acts.length;
  const fam: Record<string, number> = {};
  for (const a of acts) fam[familyOf(a.genre)] = (fam[familyOf(a.genre)] ?? 0) + 1;
  const coh = Math.max(...Object.values(fam)) / acts.length;
  const hot = acts.reduce((t, a) => t + clamp((s.genrePop?.[a.genre] ?? 1) / 2, 0, 1), 0) / acts.length;
  const mk = cityById[f.cityId]?.market;
  // canibalização: outro festival SEU no mesmo mês e mercado (festivais rivais de NPC: regra própria em fest12/ventures16)
  const comp = liveOf(s).fests.filter((y) => y !== f && y.month === f.month && cityById[y.cityId]?.market === mk).length;
  const k = clamp(0.15 + top * 0.008 + avg * 0.005 + coh * 0.12 + hot * 0.12 - comp * 0.07, 0.15, 1.25);
  // público potencial satura: quem se interessa pelas atrações (fãs em todo o país) não vira comprador sem limite —
  // o mercado da cidade, a reputação do festival e os fiéis definem até onde a procura chega
  const raw = Math.max(1, festModel(s, f).demand);
  const K = 5000 + f.rep * 120 + f12(s, f).loyal * 1.5;
  const eff = K * (1 - Math.exp(-raw / K));
  return { k, top, avg, coh, hot, comp, raw, eff, sat: eff / raw };
}
festDem19.f = (s, f, acts, why) => {
  if (!acts.length) return 1;
  const q = festQ19(s, f, acts);
  why.push(fmtL(l('Qualidade do line-up ×{k}: headliner fama {t}, média {a}, {c}% do mesmo gênero, gêneros {h}% em alta{x}.', 'Line-up quality ×{k}: headliner fame {t}, average {a}, {c}% same genre, genres {h}% hot{x}.'),
    { k: q.k.toFixed(2), t: Math.round(q.top), a: Math.round(q.avg), c: Math.round(q.coh * 100), h: Math.round(q.hot * 100), x: q.comp ? fmtL(l(', {n} outro(s) festival(is) seu(s) no mesmo mês', ', {n} other festival(s) of yours the same month'), { n: q.comp }) : '' }));
  if (q.sat < 0.9) why.push(fmtL(l('Público potencial satura: {r} interessados viram no máximo ~{e} compradores (cidade, reputação {p} e fiéis).', 'Potential crowd saturates: {r} interested people become at most ~{e} buyers (city, reputation {p} and loyalists).'), { r: Math.round(q.raw).toLocaleString(), e: Math.round(q.eff).toLocaleString(), p: Math.round(f.rep) }));
  return q.k * q.sat;
};

// decisões do ramo nos meses mortos (entre uma edição e o planejamento da próxima)
type FK = 'f19_scout' | 'f19_sponsor' | 'f19_permit' | 'f19_neigh' | 'f19_ticket';
const FKS: FK[] = ['f19_scout', 'f19_sponsor', 'f19_permit', 'f19_neigh', 'f19_ticket'];
const fx = (s: GameState, c: Record<string, string | number>) => { const f = festOf(s, String(c.fx)); return f ? { f, x: f12(s, f) } : null; };
const mon = (s: GameState, real: number) => money(s, real);
const FEST_CARDS: EventDef[] = [
  { id: 'f19_scout', cat: 'business', tone: 'neutral', tags: ['festival'], cooldown: 0, forcedOnly: true,
    title: l('{fest}: viagem de olheiro', '{fest}: scouting trip'),
    text: l('Faltam {mu} meses para a próxima edição. Um produtor amigo topa rodar casas pequenas com você atrás de nomes novos — custa estrada e hotel. Dá também para ouvir só as demos que chegam.', '{mu} months to the next edition. A promoter friend will tour small rooms with you hunting new names — road and hotel costs. Or you can just listen to the demos that arrive.'),
    options: [
      { id: 'trip', label: l('Viajar ($2 mil): +4 de empolgação e +4% de procura', 'Travel ($2k): +4 excitement and +4% demand'), hint: l('Descobertas no line-up são o que o público fiel comenta.', 'Discoveries on the bill are what loyal fans talk about.'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; festPay12(s, z.f, -mon(s, 2000), 'f19scout', `${z.f.name}: viagem de olheiro`); z.x.cyc.mods.ex += 4; z.x.cyc.mods.dem *= 1.04; } },
      { id: 'demos', label: l('Ouvir as demos (grátis): +1 de empolgação', 'Listen to demos (free): +1 excitement'), apply: (s, _r, c) => { const z = fx(s, c); if (z) z.x.cyc.mods.ex += 1; } },
    ] },
  { id: 'f19_sponsor', cat: 'business', tone: 'neutral', tags: ['festival'], cooldown: 0, forcedOnly: true,
    title: l('{fest}: patrocinador quer conversar cedo', '{fest}: a sponsor wants an early talk'),
    text: l('Uma marca local oferece {amt} agora, sem meta de público, em troca de tendas com o logo espalhadas pelo terreno. Esperar pode render proposta maior perto da data — ou nenhuma.', 'A local brand offers {amt} now, no crowd target, in exchange for logo tents across the grounds. Waiting may bring a bigger offer near the date — or none.'),
    options: [
      { id: 'take', label: l('Fechar agora ({amt}, conforto −2)', 'Close now ({amt}, comfort −2)'), hint: l('Dinheiro certo no mês morto.', 'Sure money in a dead month.'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; festPay12(s, z.f, Number(c.amtV), 'f19spon', `${z.f.name}: patrocínio antecipado`); z.x.cyc.mods.co -= 2; } },
      { id: 'wait', label: l('Esperar propostas maiores', 'Wait for bigger offers'), apply: (s, _r, c) => { const z = fx(s, c); if (z) z.x.cyc.hype *= 1.01; } },
    ] },
  { id: 'f19_permit', cat: 'business', tone: 'neutral', tags: ['festival'], cooldown: 0, forcedOnly: true,
    title: l('{fest}: alvará da prefeitura', '{fest}: city permit'),
    text: l('A prefeitura abriu o prazo de alvarás para eventos ao ar livre. O despachante garante tudo rápido; o guichê é barato e lento; dá para arriscar com o alvará do ano passado.', 'City hall opened the window for open-air event permits. A fixer gets it all done fast; the counter is cheap and slow; or risk it with last year\'s permit.'),
    options: [
      { id: 'fixer', label: l('Despachante ($3 mil): risco −8, +3% de procura (datas confirmadas cedo)', 'Fixer ($3k): risk −8, +3% demand (dates confirmed early)'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; festPay12(s, z.f, -mon(s, 3000), 'f19perm', `${z.f.name}: alvará (despachante)`); z.x.cyc.mods.risk -= 0.08; z.x.cyc.mods.dem *= 1.03; } },
      { id: 'counter', label: l('Guichê ($1 mil): risco −4', 'Counter ($1k): risk −4'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; festPay12(s, z.f, -mon(s, 1000), 'f19perm', `${z.f.name}: alvará`); z.x.cyc.mods.risk -= 0.04; } },
      { id: 'risk', label: l('Arriscar com o antigo: risco +10', 'Risk it with the old one: risk +10'), hint: l('Fiscal no dia pode virar multa e desastre.', 'An inspector on the day can mean fines and disaster.'), apply: (s, _r, c) => { const z = fx(s, c); if (z) z.x.cyc.mods.risk += 0.1; } },
    ] },
  { id: 'f19_neigh', cat: 'business', tone: 'bad', tags: ['festival'], cooldown: 0, forcedOnly: true,
    title: l('{fest}: os vizinhos reclamam', '{fest}: the neighbours complain'),
    text: l('A associação de moradores junta assinaturas contra o barulho da última edição e ameaça ir à câmara.', 'The residents\' association is collecting signatures against the noise of the last edition and threatens to go to the council.'),
    options: [
      { id: 'fund', label: l('Fundo do bairro ($2 mil): reputação +2, fiéis +3%', 'Neighbourhood fund ($2k): reputation +2, loyalists +3%'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; festPay12(s, z.f, -mon(s, 2000), 'f19nb', `${z.f.name}: fundo do bairro`); z.f.rep = clamp(z.f.rep + 2, 0, 100); z.x.cyc.mods.loyal *= 1.03; } },
      { id: 'curfew', label: l('Antecipar o toque de recolher: empolgação −3, risco −3', 'Earlier curfew: excitement −3, risk −3'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; z.x.cyc.mods.ex -= 3; z.x.cyc.mods.risk -= 0.03; } },
      { id: 'ignore', label: l('Ignorar: reputação −3, risco +5', 'Ignore: reputation −3, risk +5'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; z.f.rep = clamp(z.f.rep - 3, 0, 100); z.x.cyc.mods.risk += 0.05; } },
    ] },
  { id: 'f19_ticket', cat: 'business', tone: 'neutral', tags: ['festival'], cooldown: 0, forcedOnly: true,
    title: l('{fest}: tiqueteira quer exclusividade', '{fest}: ticketing firm wants exclusivity'),
    text: l('Uma tiqueteira adianta {amt} já, em troca de exclusividade e 8% sobre o adiantamento na data do festival. Vender por conta própria é mais barato, mas alcança menos gente.', 'A ticketing firm advances {amt} now, for exclusivity and 8% on the advance at the festival date. Selling yourself is cheaper but reaches fewer people.'),
    options: [
      { id: 'adv', label: l('Aceitar o adiantamento ({amt}; devolve +8% na data)', 'Take the advance ({amt}; repay +8% on the date)'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; const a = Number(c.amtV); festPay12(s, z.f, a, 'f19tk', `${z.f.name}: adiantamento da tiqueteira`); z.x.commits.push({ id: nextId(s, 'cm'), due: z.f.nextYear * 12 + z.f.month, amt: -Math.round(a * 1.08), what: l('Devolução do adiantamento exclusivo (+8%)', 'Exclusive advance repayment (+8%)'), kind: 'loan' }); } },
      { id: 'self', label: l('Vender por conta própria: procura −3%, conforto +2', 'Sell it yourself: demand −3%, comfort +2'), apply: (s, _r, c) => { const z = fx(s, c); if (!z) return; z.x.cyc.mods.dem *= 0.97; z.x.cyc.mods.co += 2; } },
      { id: 'std', label: l('Seguir com a tiqueteira de sempre', 'Stay with the usual ticketing'), apply: () => {} },
    ] },
];

function festBranchMonth(s: GameState, f: OwnFestival): void {
  const st = car19(s);
  const x = f12(s, f);
  const mu = muOf(s, f);
  const now = monthIndex(s);
  // aviso: edição vai ser pulada (sem line-up a 3 meses)
  if (mu <= 3 && mu > 0 && !f.lineup.length && st.skipW[f.id] !== f.nextYear) {
    st.skipW[f.id] = f.nextYear;
    const t = fmtL(l('{f}: faltam {m} meses e o line-up está vazio. Sem atração confirmada a edição {y} será cancelada (reputação −5, fiéis −30%).', '{f}: {m} months left and the bill is empty. With no act confirmed the {y} edition will be cancelled (reputation −5, loyalists −30%).'), { f: f.name, m: mu, y: f.nextYear });
    notify(s, t, 'bad');
    pushInbox18(s, 'c19_fest_skip', { from: f.name, subject: l('Edição em risco', 'Edition at risk'), body: t, ref: { fx: f.id } });
  }
  // meses mortos (e o começo do planejamento): uma decisão do ramo, no máximo a cada 2 meses (garantida após 3)
  if (mu >= 11) st.fused[f.id] = []; // ciclo novo logo depois da edição
  if (mu < 3) return;
  const last = st.fcard[f.id] ?? -99;
  if (now - last < 2) return;
  if (s.decisions.some((d) => d.eventId.startsWith('f19_') && d.ctx.fx === f.id)) return;
  const r = rngOf(s, `fc:${f.id}`);
  if (now - last < 3 && !r.chance(0.55)) return;
  const used = (st.fused[f.id] ??= []);
  const left = FKS.filter((k) => !used.includes(k));
  const k = left.length ? r.pick(left) : r.pick(FKS);
  used.push(k);
  st.fcard[f.id] = now;
  const amtV = k === 'f19_sponsor' ? mon(s, 2500 + f.rep * 80) : k === 'f19_ticket' ? Math.max(mon(s, 3000), Math.round(x.loyal * mon(s, f.price) * 0.25)) : 0;
  emitEvent(s, r, k, { fx: f.id, fest: f.name, mu, amtV, amt: `$${Math.round(amtV / 100).toLocaleString()}` });
}

// ---------------------------------------------------------------- 4) empresário: patrocínio, renovação, decisões

/** Marca e chance de um patrocínio (mesmo número na tela e no sorteio). */
export function endorseOdds19(s: GameState, a: Act): { brand: string; chance: number; mult: number; why: L[] } {
  const pool = BRANDS.filter((b) => (b.kind === 'sponsor' || b.kind === 'sync_ad') && s.year >= b.from && s.year <= b.to);
  const r = Rng.fromSeed(`${s.config.seed}:end19:${a.id}:${Math.floor(s.week / 8)}`);
  const b = pool.length ? r.pick(pool) : undefined;
  const why: L[] = [];
  const mk = MARKETS.find((m) => m.id === cityById[a.city]?.market);
  const big = mk ? clamp(0.6 + mk.size(s.year) * 0.5, 0.6, 1.1) : 1; // mercado grande = verba maior e mais marcas
  const fam = familyOf(a.genre);
  const fit = !b ? 0 : b.image === 'family' ? (['pop', 'country', 'gospel'].includes(fam) ? 0.1 : fam === 'rock' || fam === 'hiphop' ? -0.08 : 0)
    : b.image === 'edgy' ? (['rock', 'hiphop', 'electronic'].includes(fam) ? 0.1 : -0.05) : b.image === 'youth' ? (a.fame >= 30 && a.momentum >= 50 ? 0.08 : -0.03) : b.image === 'luxury' ? (a.fame >= 55 ? 0.08 : -0.1) : 0.02;
  if (b) why.push(fmtL(l('{b} (imagem {i}): encaixe {f}.', '{b} ({i} image): fit {f}.'), { b: b.name, i: b.image, f: fit >= 0 ? `+${Math.round(fit * 100)}%` : `${Math.round(fit * 100)}%` }));
  if (mk) why.push(fmtL(l('Mercado {m}: verba ×{k}.', '{m} market: budget ×{k}.'), { m: mk.name, k: big.toFixed(2) }));
  why.push(fmtL(l('Fama {f} e embalo {m}.', 'Fame {f} and momentum {m}.'), { f: Math.round(a.fame), m: Math.round(a.momentum) }));
  const mgRep = ventures(s).mg.rep;
  const chance = clamp(0.2 + a.fame / 140 + (a.momentum - 50) / 250 + fit + mgRep / 500 + (big - 1) * 0.1, 0.06, 0.85);
  const mult = clamp(Math.sqrt((b?.budget ?? 15000) / 18000) * big, 0.5, 1.6);
  return { brand: b?.name ?? l('uma marca local', 'a local brand').pt, chance, mult, why };
}
endorse19.f = (s, a, base) => {
  const o = endorseOdds19(s, a);
  const r = Rng.fromSeed(`${s.config.seed}:end19roll:${a.id}:${s.week}`);
  const ok = r.chance(o.chance);
  return { ok, value: Math.round(base * o.mult), brand: o.brand, why: o.why };
};

// renovação do mandato: cartão de decisão
mgRenew12.f = (s, id, p) => {
  const st = car19(s);
  const a = s.acts[id];
  if (!a) return false;
  if (st.renew[id] !== undefined) return true;
  st.renew[id] = s.week;
  const r = rngOf(s, `ren:${id}`);
  emitEvent(s, r, 'c19_mg_renew', { act: id, p: Math.round(p * 100), pc: Math.round(clamp(p + 0.2, 0.05, 0.98) * 100), pp: Math.round(clamp(p + 0.12, 0.05, 0.98) * 100), rate: Math.round(c12(s, id).mandate.rate * 100) });
  if (!s.decisions.some((d) => d.eventId === 'c19_mg_renew' && d.ctx.act === id)) delete st.renew[id]; // filtrado: já resolvido
  return true;
};
function renewRoll(s: GameState, id: string, p: number, how: string): void {
  const st = car19(s);
  delete st.renew[id];
  const a = s.acts[id];
  const mg = ventures(s).mg;
  if (!a || !mg.clients.some((c) => c.actId === id)) return;
  const x = c12(s, id);
  const ok = Rng.fromSeed(`${s.config.seed}:ren19:${id}:${s.week}`).chance(p);
  let t: L;
  if (ok) {
    x.mandate = { ...x.mandate, until: s.week + 104, legacy: false };
    t = fmtL(how === 'cut' ? l('{a} renova por dois anos — com comissão menor.', '{a} renews for two years — at a lower commission.') : how === 'promise' ? l('{a} renova por dois anos, com a sua promessa de mais atenção registrada.', '{a} renews for two years, with your promise of more attention on record.') : l('{a} renova o mandato por mais dois anos.', '{a} renews the mandate for two more years.'), { a: a.name });
    x.book.push(t); if (x.book.length > 8) x.book.shift();
  } else {
    dropClient(s, id);
    mg.fired.push({ actId: id, y: s.year });
    t = fmtL(l('{a} não renova o mandato com você ({p}% de chance).', '{a} does not renew the mandate with you ({p}% chance).'), { a: a.name, p: Math.round(p * 100) });
    remember(s, 'manager12', t);
  }
  notify(s, t, ok ? 'good' : 'bad');
  emitFact(s, { kind: 'mandate', actors: ['player', id], severity: ok ? 15 : 35, text: t, src: 'careers19', data: { ok: ok ? 1 : 0 } });
}
const RENEW: EventDef = {
  id: 'c19_mg_renew', cat: 'business', tone: 'neutral', tags: ['manager'], cooldown: 0, forcedOnly: true,
  title: l('Mandato de {act} vence', '{act}\'s mandate is up'),
  text: l('O mandato de {act} terminou. Nas condições atuais ({rate}% de comissão) a chance de renovar é {p}%. Dá para ceder na comissão, prometer mais tempo — ou abrir mão em bons termos.', '{act}\'s mandate has ended. On current terms ({rate}% commission) the renewal odds are {p}%. You can give on commission, promise more time — or let go on good terms.'),
  options: [
    { id: 'cut', label: l('Baixar a comissão 3 pontos ({pc}%)', 'Cut commission 3 points ({pc}%)'), hint: l('Menos dinheiro por dois anos, mais chance.', 'Less money for two years, better odds.'), apply: (s, _r, c) => { const id = String(c.act); const x = c12(s, id); x.mandate.rate = Math.max(0.1, Math.round((x.mandate.rate - 0.03) * 100) / 100); const cl = ventures(s).mg.clients.find((y) => y.actId === id); if (cl) cl.rate = x.mandate.rate; renewRoll(s, id, Number(c.pc) / 100, 'cut'); } },
    { id: 'promise', label: l('Prometer mais atenção ({pp}%)', 'Promise more attention ({pp}%)'), hint: l('A promessa fica registrada: quebrar custa caro na próxima.', 'The promise is on record: breaking it costs dearly next time.'), apply: (s, _r, c) => { const id = String(c.act); const x = c12(s, id); x.promises.push({ k: 'recognition', t: l('Mais atenção pessoal do empresário', 'More personal attention from the manager'), w: s.week }); x.trust = clamp(x.trust + 3, 0, 100); grantHold(s, { holder: id, target: 'player', kind: 'promise', strength: 35, months: 24, text: l('Prometeu mais atenção para renovar o mandato.', 'Promised more attention to renew the mandate.'), src: 'careers19', quiet: true }); renewRoll(s, id, Number(c.pp) / 100, 'promise'); } },
    { id: 'free', label: l('Liberar em bons termos', 'Let go on good terms'), hint: l('Sai com um favor devido e a sua reputação intacta.', 'Leaves owing you a favor, your reputation intact.'), apply: (s, _r, c) => { const id = String(c.act); const a = s.acts[id]; delete car19(s).renew[id]; dropClient(s, id); const mg = ventures(s).mg; mg.rep = clamp(mg.rep + 1, 0, 100); grantHold(s, { holder: 'player', target: id, kind: 'favor', strength: 30, months: 36, text: l('Liberou o artista do mandato sem briga.', 'Released the act from the mandate without a fight.'), src: 'careers19', quiet: true }); if (a) remember(s, 'manager12', fmtL(l('Você libera {a} do mandato em bons termos.', 'You release {a} from the mandate on good terms.'), { a: a.name })); emitFact(s, { kind: 'mandate', actors: ['player', id], severity: 15, text: l('Mandato encerrado em bons termos.', 'Mandate ended on good terms.'), src: 'careers19', data: { ok: 1 } }); } },
    { id: 'same', label: l('Renovar nas mesmas condições ({p}%)', 'Renew on the same terms ({p}%)'), apply: (s, _r, c) => renewRoll(s, String(c.act), Number(c.p) / 100, 'same') },
  ],
};

// decisões e crises do ofício
type MK = 'c19_mg_advance' | 'c19_mg_risky' | 'c19_mg_label' | 'c19_mg_poach' | 'c19_mg_press';
const MKS: MK[] = ['c19_mg_advance', 'c19_mg_risky', 'c19_mg_label', 'c19_mg_poach', 'c19_mg_press'];
const tr = (s: GameState, id: string, d: number) => { const x = c12(s, id); x.trust = clamp(x.trust + d, 0, 100); };
const mpay = (s: GameState, amt: number, key: string, memo: string) => vpay(s, ventures(s).mg.owner, amt, `m19:${key}:${s.week}`, memo);
const MG_CARDS: EventDef[] = [
  { id: 'c19_mg_advance', cat: 'business', tone: 'neutral', tags: ['manager'], cooldown: 0, forcedOnly: true,
    title: l('{act} pede um adiantamento pessoal', '{act} asks for a personal advance'),
    text: l('{act} está apertado e pede {amt} adiantados das próximas comissões. Emprestar cria um laço — e um risco.', '{act} is short and asks for {amt} against future commissions. Lending builds a bond — and a risk.'),
    options: [
      { id: 'lend', label: l('Emprestar {amt} (confiança +6)', 'Lend {amt} (trust +6)'), hint: l('Fica uma dívida do artista com você.', 'The act owes you a debt.'), apply: (s, _r, c) => { const id = String(c.act); mpay(s, -Number(c.amtV), `adv:${id}`, 'Adiantamento a cliente'); const a = s.acts[id]; if (a) a.cash += Number(c.amtV); tr(s, id, 6); grantHold(s, { holder: 'player', target: id, kind: 'debt', strength: 30, months: 24, text: l('Adiantamento pessoal do empresário.', 'Personal advance from the manager.'), src: 'careers19', quiet: true }); } },
      { id: 'half', label: l('Metade (confiança +2)', 'Half (trust +2)'), apply: (s, _r, c) => { const id = String(c.act); mpay(s, -Math.round(Number(c.amtV) / 2), `adv:${id}`, 'Adiantamento a cliente'); const a = s.acts[id]; if (a) a.cash += Math.round(Number(c.amtV) / 2); tr(s, id, 2); } },
      { id: 'no', label: l('Recusar (confiança −4)', 'Refuse (trust −4)'), apply: (s, _r, c) => tr(s, String(c.act), -4) },
    ] },
  { id: 'c19_mg_risky', cat: 'business', tone: 'neutral', tags: ['manager'], cooldown: 0, forcedOnly: true,
    title: l('Datas arriscadas para {act}', 'Risky dates for {act}'),
    text: l('Um promotor novo oferece três datas para {act} numa praça que paga bem e cobra caro: comissão de {amt}, mas fala-se em calote e público violento.', 'A new promoter offers {act} three dates in a market that pays well and costs dearly: {amt} commission, but there is talk of stiffed fees and rough crowds.'),
    options: [
      { id: 'take', label: l('Fechar ({amt}; 30% de dar errado)', 'Book it ({amt}; 30% chance it goes wrong)'), apply: (s, r, c) => { const id = String(c.act); if (r.chance(0.3)) { tr(s, id, -8); const cl = ventures(s).mg.clients.find((y) => y.actId === id); if (cl && !cl.crisis) cl.crisis = { k: 'feud', w: s.week }; notify(s, fmtL(l('As datas de {a} deram errado: calote e briga na estrada.', '{a}\'s dates went wrong: stiffed fees and a fight on the road.'), { a: s.acts[id]?.name ?? '?' }), 'bad'); } else { mpay(s, Number(c.amtV), `risky:${id}`, 'Comissão de datas arriscadas'); tr(s, id, 2); } } },
      { id: 'guar', label: l('Exigir garantia (60% da comissão, sem risco)', 'Demand a guarantee (60% of the commission, no risk)'), apply: (s, _r, c) => { mpay(s, Math.round(Number(c.amtV) * 0.6), `risky:${c.act}`, 'Comissão com garantia'); } },
      { id: 'pass', label: l('Recusar (confiança +1)', 'Decline (trust +1)'), apply: (s, _r, c) => tr(s, String(c.act), 1) },
    ] },
  { id: 'c19_mg_label', cat: 'business', tone: 'neutral', tags: ['manager'], cooldown: 0, forcedOnly: true,
    title: l('A gravadora quer mudar {act}', 'The label wants to change {act}'),
    text: l('{lab} pressiona {act} a mudar de imagem e de produtor para o próximo disco. O artista olha para você.', '{lab} is pushing {act} to change image and producer for the next record. The act looks to you.'),
    options: [
      { id: 'back', label: l('Defender o artista (confiança +6, relação com o selo −3)', 'Back the act (trust +6, label relationship −3)'), apply: (s, _r, c) => { tr(s, String(c.act), 6); if (c.lab_id) { const sd = standingOf(s, String(c.lab_id)); sd.trust = clamp(sd.trust - 3, 0, 100); } } },
      { id: 'broker', label: l('Negociar um meio-termo (confiança +2, embalo +3)', 'Broker a middle ground (trust +2, momentum +3)'), apply: (s, _r, c) => { tr(s, String(c.act), 2); const a = s.acts[String(c.act)]; if (a) a.momentum = clamp(a.momentum + 3, 0, 100); } },
      { id: 'push', label: l('Ficar com a gravadora (embalo +6, confiança −6)', 'Side with the label (momentum +6, trust −6)'), apply: (s, _r, c) => { tr(s, String(c.act), -6); const a = s.acts[String(c.act)]; if (a) a.momentum = clamp(a.momentum + 6, 0, 100); } },
    ] },
  { id: 'c19_mg_poach', cat: 'business', tone: 'bad', tags: ['manager'], cooldown: 0, forcedOnly: true,
    title: l('Um empresário rival corteja {act}', 'A rival manager is courting {act}'),
    text: l('Viram {act} jantando com {rival}, que promete comissão menor e contatos internacionais.', '{act} was seen dining with {rival}, who promises a lower commission and international contacts.'),
    options: [
      { id: 'rate', label: l('Baixar 2 pontos de comissão (confiança +5)', 'Cut 2 commission points (trust +5)'), apply: (s, _r, c) => { const id = String(c.act); const x = c12(s, id); x.mandate.rate = Math.max(0.1, Math.round((x.mandate.rate - 0.02) * 100) / 100); const cl = ventures(s).mg.clients.find((y) => y.actId === id); if (cl) cl.rate = x.mandate.rate; tr(s, id, 5); } },
      { id: 'meet', label: l('Passar uma semana com o artista (confiança +3, seu estresse +3)', 'Spend a week with the act (trust +3, your stress +3)'), apply: (s, _r, c) => { tr(s, String(c.act), 3); const o = ownerOf(s); o.stress = clamp(o.stress + 3, 0, 100); } },
      { id: 'ignore', label: l('Ignorar (chance de perder: {lose}%)', 'Ignore (chance to lose them: {lose}%)'), apply: (s, r, c) => { const id = String(c.act); if (r.chance(Number(c.lose) / 100)) { dropClient(s, id); ventures(s).mg.fired.push({ actId: id, y: s.year }); notify(s, fmtL(l('{a} trocou você por {b}.', '{a} left you for {b}.'), { a: s.acts[id]?.name ?? '?', b: String(c.rival) }), 'bad'); } } },
    ] },
  { id: 'c19_mg_press', cat: 'business', tone: 'bad', tags: ['manager'], cooldown: 0, forcedOnly: true,
    title: l('Uma história ruim sobre {act}', 'A bad story about {act}'),
    text: l('Um jornalista tem uma história comprometedora sobre {act} e liga para ouvir o seu lado antes de publicar.', 'A journalist has a damaging story about {act} and calls for your side before publishing.'),
    options: [
      { id: 'pr', label: l('Assessoria de crise ($3 mil): a história morre', 'Crisis PR ($3k): the story dies'), apply: (s, _r, c) => { mpay(s, -money(s, 3000), `pr:${c.act}`, 'Assessoria de crise'); tr(s, String(c.act), 2); } },
      { id: 'spin', label: l('Dar a sua versão (confiança −2, metade do estrago)', 'Give your version (trust −2, half the damage)'), apply: (s, _r, c) => { tr(s, String(c.act), -2); scandal(s, String(c.act), 'conduct', 12); } },
      { id: 'none', label: l('Não comentar (40% vira escândalo)', 'No comment (40% it becomes a scandal)'), apply: (s, r, c) => { if (r.chance(0.4)) scandal(s, String(c.act), 'conduct', 25); } },
    ] },
];

function mgBranchMonth(s: GameState): void {
  const st = car19(s);
  const mg = ventures(s).mg;
  if (!isActive(s, 'manager') || !mg.clients.length) return;
  const now = monthIndex(s);
  if (now - st.mcard < 2 || s.decisions.some((d) => d.eventId.startsWith('c19_mg_') && d.eventId !== 'c19_mg_renew')) return;
  const r = rngOf(s, 'mg');
  // no máximo a cada 2 meses; depois de 3 meses sem nada do ofício, a decisão chega
  if (now - st.mcard < 3 && !r.chance(Math.min(0.45, 0.15 + mg.clients.length * 0.05))) return;
  const c = r.pick(mg.clients);
  const a = s.acts[c.actId];
  if (!a) return;
  const k = r.pick(MKS);
  const lab = a.owner && a.owner !== 'player' ? s.labels[a.owner] : undefined;
  if (k === 'c19_mg_label' && !lab) return;
  st.mcard = now;
  const amtV = k === 'c19_mg_advance' ? money(s, 1500 + a.fame * 60) : k === 'c19_mg_risky' ? Math.round(grossShows(s, a) * 3 * c.rate * 1.4) : 0;
  const lose = Math.round(clamp(0.5 - c12(s, a.id).trust / 200, 0.1, 0.45) * 100);
  emitEvent(s, r, k, { act: a.id, amtV, amt: `$${Math.round(amtV / 100).toLocaleString()}`, lab: lab?.name ?? '—', lab_id: lab?.id ?? '', rival: r.pick(['Sam Castell', 'Dora Vence', 'Lew Marlowe', 'Iris Kade']), lose });
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'careers19', (s) => {
  for (const f of liveOf(s).fests.slice()) festBranchMonth(s, f);
  mgBranchMonth(s);
  // renovações pendentes que perderam o sentido (cliente saiu)
  const st = car19(s);
  for (const id of Object.keys(st.renew)) if (!ventures(s).mg.clients.some((c) => c.actId === id) || s.week - st.renew[id] > 26) delete st.renew[id];
});

deferEvents([...FEST_CARDS, RENEW, ...MG_CARDS]);

registerInboxKind('c19_fest_skip', { label: l('Festival', 'Festival'), cat: 'deals', icon: 'star', prio: 3, goto: () => ({ area: 'festivals' }) });

// fatos → efeitos reais
onFact('mandate', (s, f) => {
  // boca a boca entre os clientes: quem perde (ou libera bem) um artista é comentado pelos outros
  const ok = Number(f.data?.ok ?? 0) === 1;
  for (const c of ventures(s).mg.clients) if (c.actId !== f.actors[1]) tr(s, c.actId, ok ? 0.5 : -1);
}, 'careers19:mandate');
onFact('fest_ground', (s, f) => {
  const fid = String(f.data?.fx ?? '');
  const fe = festOf(s, fid);
  if (!fe) return;
  const x = f12(s, fe);
  x.cyc.hype *= 1.05; // terreno maior vira notícia: mais gente fica sabendo
  const key = `${fe.cityId}:${Object.keys(s.scenes).find((k) => k.startsWith(`${fe.cityId}:`))?.split(':')[1] ?? ''}`;
  if (s.scenes[key] !== undefined) s.scenes[key] = Math.min(100, s.scenes[key] + 2);
}, 'careers19:ground');

// por quê
registerExplain('fest19.demand', (s, c) => {
  const f = festOf(s, String(c.fx ?? ''));
  if (!f) return null;
  const acts = f.lineup.map((y) => s.acts[y.actId]).filter((a): a is Act => !!a);
  const q = festQ19(s, f, acts);
  return { title: l('Qualidade da edição para o público', 'Edition quality for the crowd'), value: +(q.k * q.sat).toFixed(2), fmt: 'mult', parts: [
    { label: l('Base', 'Base'), value: 0.15, fmt: 'num' },
    { label: fmtL(l('Headliner (fama {t})', 'Headliner (fame {t})'), { t: Math.round(q.top) }), value: +(q.top * 0.008).toFixed(2), fmt: 'signed', tone: 'good' },
    { label: fmtL(l('Média do line-up (fama {a})', 'Bill average (fame {a})'), { a: Math.round(q.avg) }), value: +(q.avg * 0.005).toFixed(2), fmt: 'signed', tone: 'good' },
    { label: fmtL(l('Coerência de gênero ({c}%)', 'Genre coherence ({c}%)'), { c: Math.round(q.coh * 100) }), value: +(q.coh * 0.12).toFixed(2), fmt: 'signed' },
    { label: fmtL(l('Gêneros em alta ({h}%)', 'Hot genres ({h}%)'), { h: Math.round(q.hot * 100) }), value: +(q.hot * 0.12).toFixed(2), fmt: 'signed' },
    { label: fmtL(l('Saturação do público potencial ({r} → {e})', 'Potential crowd saturation ({r} → {e})'), { r: Math.round(q.raw).toLocaleString(), e: Math.round(q.eff).toLocaleString() }), value: +q.sat.toFixed(2), fmt: 'mult', tone: q.sat < 0.9 ? 'bad' : '' },
    { label: fmtL(l('Seus festivais no mesmo mês e mercado ({n})', 'Your festivals in the same month and market ({n})'), { n: q.comp }), value: -(q.comp * 0.07), fmt: 'signed', tone: q.comp ? 'bad' : '' },
    { label: fmtL(l('Teto do terreno: {g}', 'Ground ceiling: {g}'), { g: GROUND19[groundOf19(s, f.id)]?.name ?? '—' }), value: Number.isFinite(festCap19.f(s, f)) ? festCap19.f(s, f) : '∞' },
  ], note: l('Qualidade (0,15 a 1,25) × saturação multiplicam a procura. Line-up fraco não lota mais o terreno: cada escolha aparece no público.', 'Quality (0.15 to 1.25) × saturation multiply demand. A weak bill no longer fills the grounds: every pick shows in the crowd.') };
});
registerExplain('mg19.endorse', (s, c) => {
  const a = s.acts[String(c.act ?? '')];
  if (!a) return null;
  const o = endorseOdds19(s, a);
  return { title: fmtL(l('Patrocínio: {b}', 'Endorsement: {b}'), { b: o.brand }), value: o.chance, fmt: 'pct', parts: o.why.map((w) => ({ label: w })), note: fmtL(l('Valor ×{m} (verba da marca e tamanho do mercado). Recusa: tente outra marca em 2 meses.', 'Value ×{m} (brand budget and market size). Refusal: try another brand in 2 months.'), { m: o.mult.toFixed(2) }) };
});
registerExplain('careers19.rent', (s) => ({ title: l('Aluguel da sede', 'HQ rent'), value: rentOn19.f(s) ? l('cobrado', 'charged').pt : l('isento', 'waived').pt, parts: [
  { label: l('Carreira de selo ativa', 'Label career active'), value: isActive(s, 'label') ? '✓' : '—' },
  { label: l('Carreira de músico ativa', 'Musician career active'), value: isActive(s, 'musician') ? '✓' : '—' },
], note: l('Sem selo (nem banda), você trabalha de casa: o negócio paga os próprios custos fixos.', 'Without a label (or band) you work from home: each business pays its own fixed costs.') }));

registerAdvisorTip('careers19', (s) => {
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  for (const f of liveOf(s).fests) {
    const mu = muOf(s, f);
    if (mu > 0 && mu <= 4 && !f.lineup.length) out.push({ id: `c19-skip-${f.id}`, level: 'warn', cat: 'career', score: 80, text: fmtL(l('{f}: {m} meses para a edição e nenhuma atração.', '{f}: {m} months to the edition and no acts.'), { f: f.name, m: mu }), why: [l('Sem line-up a edição é cancelada (reputação −5, fiéis −30%).', 'With no bill the edition is cancelled (reputation −5, loyalists −30%).')], goto: { area: 'festivals' } });
    const g = groundOf19(s, f.id), nx = GROUND19[g + 1];
    if (nx && nx.ok(s, f)) { const x = f12(s, f); const last = x.hist.at(-1); if (last && last.crowd >= last.cap * 0.95) out.push({ id: `c19-ground-${f.id}`, level: 'info', cat: 'opportunity', text: fmtL(l('{f} lotou o terreno: dá para mudar para {g}.', '{f} filled the grounds: you can move to {g}.'), { f: f.name, g: nx.name }), goto: { area: 'festivals' } }); }
  }
  return out;
});

