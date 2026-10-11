// Rodada 19 (Frente 5, onda 3 — T4) — AO VIVO E TEMPORADA (`live19`).
//  • N9 boicote ao monopólio de ingressos (Pearl Jam × Ticketmaster, 1994): seu ato recusa o gigante da época (live18
//    giant18) — casas alternativas custam caro e a procura cai, mas fãs e imprensa aplaudem; em 6 meses sai a audiência
//    antitruste (calendário, kind court): vitória corta a taxa do gigante por 10 anos para todos; derrota esfria os promotores.
//  • N26 + I15/I16 festival gratuito: parque ou fazenda, nível de segurança, patrocínio (1980+); público enorme, fãs e
//    descoberta (discover18); multidão acima da capacidade → tragedyOdds19 (links19a) → crowd_incident → processo e lei.
//  • N22 vinil: curva de demanda por era (queda 1990–2007, renascimento 2008+) e Record Store Day (abril, 2008+):
//    prensagem exclusiva limitada (supply18: fila da fábrica decide se chega a tempo; o RSD entope as prensas),
//    colecionadores viram superfãs (fandom19).
//  • M6 calendário sazonal: Natal (4º tri), músicas de verão, temporada de festivais, calmaria de janeiro — curva por era
//    (`season19`) aplicada nas vendas (chartUnits) e na procura de shows (cityDemand), marcada no calendar19; o
//    "guardar para o Natal" do npc17 vira decisão do jogador (campanha de fim de ano, diluída pelos astros que seguraram discos).

import { Rng, clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact, recentFacts } from '../facts17';
import { fan18, fandomRec19, mobilization19 } from '../fandom19';
import { exactHist } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type AdvTip18 } from '../inbox18';
import { rng19 } from '../rng19';
import { POOL19 } from '../market';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { schedule18 } from './decide18';
import { addLead18 } from './discover18';
import { headline19 } from './factlink19';
import { GIANT19, giant18 } from './live18';
import { tragedyOdds19 } from './links19a';
import { bestPlant18, queueOf18, sup18 } from './supply18';
import { c12 } from './tour12';

// ---------------------------------------------------------------- estado
export interface Boy19 { id: string; act: string; w: number; y: number; hear: number; cost: number; res?: 'win' | 'lose'; end?: number }
export interface FF19 { y: number; city: string; site: Site19; sec: number; att: number; cap: number; cost: number; inc: number; spons: boolean }
export interface Rsd19 { y: number; rel: string; k: 'cat' | 'new'; units: number; late: number; done?: boolean; v?: number }
export interface Live19 { boy: Boy19[]; cut?: { y: number; until: number; k: number }; ff: FF19[]; rsd: Rsd19[]; xmas: Record<string, number>; npcBoy: number; seq: number; log: [number, number, L][]; n: Record<string, number>; chron: Record<string, 1> }
declare module '../ext4' { interface Ext4 { live19: Live19 } }
const fresh = (): Live19 => ({ boy: [], ff: [], rsd: [], xmas: {}, npcBoy: 0, seq: 0, log: [], n: {}, chron: {} });
registerExt4('live19', fresh);
export function lv19(s: GameState): Live19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.live19 ??= fresh()) as Live19;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
const cnt = (s: GameState, k: string) => { const n = lv19(s).n; n[k] = (n[k] ?? 0) + 1; };
export const logL19 = (s: GameState, t: L) => { const st = lv19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const rng = (s: GameState) => rng19(s, 'live19', () => Rng.fromSeed(`${s.config.seed}|live19|${s.week}`));
const mine = (s: GameState, a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const npc = (a: Act): boolean => a.owner !== 'player' && !a.playerBand;
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const W = 4.35;

// ================================================================ N9 boicote ao monopólio de ingressos
export const activeBoy19 = (s: GameState, actId?: string): Boy19[] => lv19(s).boy.filter((b) => !b.end && (!actId || b.act === actId));
/** Motivo para não poder boicotar (ou null). */
export function boyGate19(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!mine(s, a)) return l('Escolha um ato seu.', 'Pick one of your acts.');
  if (!giant18(s)) return l('Ainda não existe um gigante de ingressos para boicotar (1976+).', 'There is no ticketing giant to boycott yet (1976+).');
  if (a.fame < 35) return l('Fama abaixo de 35: ninguém notaria o boicote.', 'Fame below 35: nobody would notice the boycott.');
  if (activeBoy19(s, actId).length) return l('Esse ato já está em boicote.', 'That act is already boycotting.');
  return null;
}
/** Custo mensal de turnê fora do circuito do gigante (casas alternativas, ingressos próprios). */
export const boyCost19 = (s: GameState, a: Act) => money(s, 1200 + a.fame * 45);
export function startBoy19(s: GameState, actId: string): L | null {
  const g = boyGate19(s, actId);
  if (g) return g;
  const st = lv19(s), a = s.acts[actId], gi = giant18(s)!;
  const b: Boy19 = { id: `by${++st.seq}`, act: actId, w: s.week, y: s.year, hear: s.week + Math.round(6 * W), cost: 0 };
  st.boy.push(b); if (st.boy.length > 20) st.boy.shift();
  const f = fan18(s, actId); if (f) { f.loy = clamp(f.loy + 6, 0, 100); f.mob = clamp((f.mob ?? 0) + 10, 0, 100); }
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
  const t = fmtL(l('{a} boicota a {g}: "taxa de {p}% em cima do ingresso é abuso". Só toca onde o preço for justo.', '{a} boycotts {g}: "a {p}% fee on top of the ticket is abuse". They only play where the price is fair.'), { a: a.name, g: gi.name, p: Math.round(gi.fee * 100 + 8) });
  emitFact(s, { kind: 'boycott', actors: [actId, 'player'], severity: 45, visibility: 'public', tags: ['tickets', 'live19', 'antitrust', 'good'], text: t, src: 'live19', place: a.city, data: { boy: b.id } });
  logL19(s, t); cnt(s, 'boy');
  schedule18(s, 'lv19:boy:start', { act: actId }, l('Boicote ao monopólio de ingressos', 'Ticketing-monopoly boycott'), l('Boicotar', 'Boycott'));
  return null;
}
export function endBoy19(s: GameState, id: string, why: L = l('fim do boicote', 'boycott ends')): L | null {
  const b = lv19(s).boy.find((x) => x.id === id && !x.end);
  if (!b) return l('Boicote não encontrado.', 'Boycott not found.');
  b.end = s.week;
  const a = s.acts[b.act];
  if (a && !b.res) { const f = fan18(s, b.act, false); if (f) f.loy = clamp(f.loy - 4, 0, 100); } // desistiu antes da audiência
  logL19(s, fmtL(l('{a}: {w}.', '{a}: {w}.'), { a: a?.name ?? '?', w: why }));
  schedule18(s, 'lv19:boy:end', { act: b.act }, l('Boicote ao monopólio de ingressos', 'Ticketing-monopoly boycott'), l('Encerrar', 'End'));
  return null;
}
/** Chance de vitória na audiência antitruste e o porquê. */
export function hearOdds19(s: GameState, b: Boy19): { p: number; why: WhyPart[] } {
  const a = s.acts[b.act], why: WhyPart[] = [];
  let p = 0.15; why.push({ label: l('Base: o gigante tem advogados e lobby', 'Base: the giant has lawyers and lobbyists'), value: 0.15, fmt: 'pct' });
  const fm = (a?.fame ?? 0) / 250; p += fm; why.push({ label: l('Fama do ato', 'Act fame'), value: fm, fmt: 'pct', tone: 'good' });
  const mo = mobilization19(s, b.act) / 300; p += mo; why.push({ label: l('Mobilização dos fãs (fans18)', 'Fan mobilization (fans18)'), value: mo, fmt: 'pct', tone: 'good' });
  const others = lv19(s).npcBoy * 0.06 + (activeBoy19(s).length - 1) * 0.05; if (others > 0) { p += others; why.push({ label: l('Outros artistas também boicotam', 'Other artists boycott too'), value: others, fmt: 'pct', tone: 'good' }); }
  if (s.year >= 2010) { p += 0.1; why.push({ label: l('Era das "taxas-surpresa": reguladores atentos (2010+)', '"Junk fee" era: regulators watching (2010+)'), value: 0.1, fmt: 'pct', tone: 'good' }); }
  return { p: clamp(p, 0.05, 0.8), why };
}
/** Audiência antitruste: decide (ou força) e publica a decisão. */
export function hearing19(s: GameState, id: string, force?: 'win' | 'lose'): L {
  const st = lv19(s), b = st.boy.find((x) => x.id === id);
  if (!b || b.res) return l('Sem audiência pendente.', 'No pending hearing.');
  const a = s.acts[b.act], g = giant18(s);
  // modo exato: o caso real (1994–95) terminou sem ação do governo — documentado
  const win = force ? force === 'win' : exactHist(s) ? false : rng(s).chance(hearOdds19(s, b).p);
  b.res = win ? 'win' : 'lose';
  if (win) st.cut = { y: s.year, until: s.year + 10, k: 0.6 };
  const t = win
    ? fmtL(l('Audiência antitruste: o governo obriga a {g} a cortar taxas e abrir contratos com as casas. O boicote de {a} fez escola.', 'Antitrust hearing: the government forces {g} to cut fees and open venue contracts. {a}\'s boycott set a precedent.'), { g: g?.name ?? '?', a: a?.name ?? '?' })
    : fmtL(l('Audiência antitruste: o caso contra a {g} é arquivado. {a} segue tocando fora do circuito — mais caro, mais longe.', 'Antitrust hearing: the case against {g} is dropped. {a} keeps playing outside the circuit — pricier, farther.'), { g: g?.name ?? '?', a: a?.name ?? '?' });
  emitFact(s, { kind: 'antitrust_ruling', actors: [b.act, 'player'], severity: win ? 60 : 45, visibility: 'public', tags: ['tickets', 'live19', win ? 'win' : 'lose', win ? 'good' : 'bad'], text: t, src: 'live19', data: { boy: b.id } });
  logL19(s, t); cnt(s, win ? 'hear_win' : 'hear_lose');
  if (!win && mine(s, a)) pushInbox18(s, 'lv19_hear', { from: g?.name ?? '?', subject: l('Caso arquivado — e o boicote?', 'Case dropped — and the boycott?'), tone: 'bad', ref: { boy: b.id, act: b.act },
    body: fmtL(l('Sem decisão do governo. Manter o boicote custa {c}/mês de turnê em casas alternativas, mas os fãs sabem de que lado você está.', 'No ruling. Keeping the boycott costs {c}/month on tour in alternative venues, but fans know which side you are on.'), { c: usd(boyCost19(s, a)) }),
    actions: [{ id: 'keep', label: l('Manter o boicote', 'Keep boycotting') }, { id: 'end', label: l('Voltar ao circuito', 'Return to the circuit') }], weeks: 6 });
  return t;
}
registerInboxKind('lv19_hear', { label: l('Ingressos', 'Ticketing'), cat: 'decision', icon: 'tour-bus', prio: 2, goto: () => ({ area: 'live19' }),
  handle: (s, m, act) => { if (act === 'end') { endBoy19(s, String(m.ref?.boy), l('volta ao circuito do gigante', 'returns to the giant\'s circuit')); return l('De volta ao circuito.', 'Back in the circuit.'); } return l('O boicote continua.', 'The boycott goes on.'); } });

// o gigante: corte de taxa por 10 anos depois da vitória; quem boicota não usa o gigante
GIANT19.f = (s, g) => { const c = lv19(s).cut; return c && s.year < c.until ? { ...g, fee: Math.round(g.fee * c.k * 1000) / 1000 } : g; };
GIANT19.ok = (s, a) => !activeBoy19(s, a.id).length;
// procura de shows: fora do circuito, menos casas (−12%)
registerMod('cityDemand', 'live19:boy', (s, v, c) => (c.act && activeBoy19(s, c.act.id).length ? { value: v * 0.88, label: l('Boicote ao gigante: só casas alternativas', 'Giant boycott: alternative venues only') } : null));

// NPC: em história alternativa, um astro também pode boicotar (soma força na audiência)
function npcBoy(s: GameState, r: Rng): void {
  if (exactHist(s) || s.year < 1985 || !giant18(s) || !r.chance(0.02)) return;
  const a = r.pick(Object.values(s.acts).filter((x) => npc(x) && x.status === 'active' && x.fame >= 65));
  if (!a) return;
  lv19(s).npcBoy++;
  const t = fmtL(l('{a} também boicota a {g} e só toca em casas independentes (história alternativa).', '{a} also boycotts {g} and only plays independent venues (alternate history).'), { a: a.name, g: giant18(s)!.name });
  emitFact(s, { kind: 'boycott', actors: [a.id], severity: 35, visibility: 'public', tags: ['tickets', 'live19', 'npc'], text: t, src: 'live19', place: a.city });
  logL19(s, t);
}
// crônica real (modo exato), documentada
const CHRON19: { y: number; m: number; t: L }[] = [
  { y: 1994, m: 5, t: l('Pearl Jam depõe no Congresso dos EUA contra as taxas da Ticketmaster e cancela a turnê de verão.', 'Pearl Jam testifies before the US Congress against Ticketmaster\'s fees and cancels its summer tour.') },
  { y: 1995, m: 6, t: l('O Departamento de Justiça dos EUA encerra a investigação sobre a Ticketmaster sem abrir processo.', 'The US Justice Department closes its Ticketmaster investigation without filing a case.') },
  { y: 2008, m: 3, t: l('Primeiro Record Store Day: lojas independentes dos EUA lançam discos exclusivos num sábado de abril.', 'First Record Store Day: US independent stores release exclusive records on an April Saturday.') },
];

// ================================================================ N26 festival gratuito
export type Site19 = 'park' | 'farm';
export const SITE19: Record<Site19, { name: L; cap: number; cost: number; from: number }> = {
  park: { name: l('Parque da cidade', 'City park'), cap: 60000, cost: 8000, from: 1967 },
  farm: { name: l('Fazenda alugada', 'Rented farm'), cap: 220000, cost: 30000, from: 1969 },
};
export const SEC19: L[] = [l('Voluntários', 'Volunteers'), l('Segurança contratada', 'Hired security'), l('Segurança reforçada + socorristas', 'Reinforced security + medics')];
const secCost = (s: GameState, sec: number) => money(s, [0, 12000, 30000][sec] ?? 0);
export const ffCost19 = (s: GameState, site: Site19, sec: number) => money(s, SITE19[site].cost) + secCost(s, sec);
/** Público esperado: fama do elenco (o grátis multiplica) e cidade. */
export function ffAtt19(s: GameState): number {
  const top = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired').sort((a, b) => b.fame - a.fame).slice(0, 4);
  return Math.round(8000 + top.reduce((t, a) => t + a.fame ** 1.6 * 55, 0));
}
export function ffGate19(s: GameState, site: Site19): L | null {
  if (s.year < SITE19[site].from) return l('Festival gratuito em fazenda só a partir de 1969.', 'Free farm festivals only from 1969.');
  if (lv19(s).ff.some((x) => x.y === s.year)) return l('Um festival gratuito por ano.', 'One free festival a year.');
  if (!playerActs(s).length) return l('Sem elenco para subir ao palco.', 'No roster to take the stage.');
  return null;
}
/** Monta o festival gratuito no mês. `force` (testes): 0 = sem incidente, 2/3 = incidente daquela gravidade. */
export function freeFest19(s: GameState, site: Site19, sec: number, spons: boolean, force?: 0 | 2 | 3): L | null {
  const g = ffGate19(s, site); if (g) return g;
  const cost = ffCost19(s, site, sec);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  const st = lv19(s), r = rng(s), city = s.config.homeCity;
  const att = Math.round(ffAtt19(s) * r.float(0.85, 1.25)), cap = SITE19[site].cap;
  post(s, `lv19ff:${s.year}`, -cost, 'live', `Festival gratuito (${SITE19[site].name.pt})`);
  const sp = spons && s.year >= 1980;
  if (sp) { post(s, `lv19ffsp:${s.year}`, Math.round(cost * 0.4), 'other_income', 'Patrocínio do festival gratuito'); s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100); }
  const odds = tragedyOdds19(s, Math.min(att, cap * 1.3), cap, cap, [15, 45, 75][sec] ?? 15);
  const x = r.next();
  const inc = force ?? (x < odds.p * 0.3 ? 3 : x < odds.p ? 2 : 0);
  const ff: FF19 = { y: s.year, city, site, sec, att: Math.min(att, Math.round(cap * 1.3)), cap, cost, inc, spons: sp };
  st.ff.push(ff); if (st.ff.length > 30) st.ff.shift();
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired').sort((a, b) => b.fame - a.fame).slice(0, 4);
  const t = fmtL(l('Festival gratuito em {c} ({w}): {n} pessoas, {a} no palco.', 'Free festival in {c} ({w}): {n} people, {a} on stage.'), { c: cityById[city]?.name ?? city, w: SITE19[site].name, n: ff.att.toLocaleString('en-US'), a: acts.map((a) => a.name).join(', ') || '?' });
  emitFact(s, { kind: 'free_fest', actors: ['player', ...acts.map((a) => a.id)], severity: 40 + Math.min(30, ff.att / 10000), visibility: 'public', tags: ['live19', 'festival', 'free', inc ? 'bad' : 'good'], text: t, src: 'live19', place: city, data: { att: ff.att, cap } });
  logL19(s, t); cnt(s, 'ff');
  if (inc) {
    const ti = inc === 3 ? fmtL(l('Tragédia no festival gratuito em {c}: a multidão passou da capacidade do terreno (história alternativa; vítimas anônimas).', 'Tragedy at the free festival in {c}: the crowd overran the site (alternate history; anonymous victims).'), { c: cityById[city]?.name ?? city })
      : fmtL(l('Festival gratuito em {c}: empurra-empurra na grade, dezenas de feridos.', 'Free festival in {c}: crush at the barrier, dozens injured.'), { c: cityById[city]?.name ?? city });
    emitFact(s, { kind: 'crowd_incident', actors: ['player', ...acts.slice(0, 1).map((a) => a.id)], place: city, severity: inc === 3 ? 80 : 55, visibility: 'public', tags: ['festival', 'safety', 'live19', 'free'], text: ti, src: 'live19', data: { sev: inc, att: ff.att } });
    logL19(s, ti); cnt(s, `inc${inc}`);
  }
  schedule18(s, `lv19:ff:sec${sec}`, { act: acts[0]?.id ?? '' }, l('Festival gratuito', 'Free festival'), SEC19[sec] ?? SEC19[0]);
  return null;
}

// ================================================================ N22 vinil e Record Store Day
/** Demanda relativa de vinil por ano (1 = auge dos anos 70): queda 1990–2007, renascimento 2008+. */
export function vinylIdx19(y: number): number {
  if (y < 1950) return 0.3;
  if (y < 1990) return y < 1960 ? 0.6 : 1;
  if (y < 2008) return Math.max(0.04, 1 - (y - 1989) * 0.06);
  return Math.min(0.45, 0.06 + (y - 2007) * 0.025);
}
export const RSD_FROM19 = 2008;
export const RSD_MONTH19 = 3;
const rsdPool = (s: GameState): Release[] => Object.values(s.releases).filter((x) => x.owner === 'player' || !!s.acts[x.actId]?.playerBand);
export function rsdRel19(s: GameState, k: 'cat' | 'new'): Release | undefined {
  const xs = rsdPool(s);
  return k === 'new' ? xs.filter((x) => s.year - x.year <= 1).sort((a, b) => b.week - a.week)[0] : xs.filter((x) => s.year - x.year >= 5).sort((a, b) => b.q + b.totalUnits / 1e5 - (a.q + a.totalUnits / 1e5))[0];
}
export const rsdCost19 = (s: GameState, k: 'cat' | 'new') => money(s, k === 'new' ? 6000 : 4000);
/** Unidades previstas (limitado): fama, qualidade e a curva do vinil. */
export function rsdUnits19(s: GameState, rel: Release, k: 'cat' | 'new'): number {
  const a = s.acts[rel.actId];
  return Math.round((1200 + (a?.fame ?? 20) * 90 + rel.q * 20) * (vinylIdx19(s.year) / 0.2) * (k === 'new' ? 1.2 : 1));
}
/** Escolha do RSD (fevereiro). A fila de vinil decide se chega a tempo (8 semanas até o sábado de abril). */
export function rsdPick19(s: GameState, k: 'cat' | 'new' | 'skip'): L {
  if (k === 'skip') return l('Este ano sem exclusivo de RSD.', 'No RSD exclusive this year.');
  const st = lv19(s), rel = rsdRel19(s, k);
  if (!rel) return l('Nenhum disco elegível.', 'No eligible record.');
  if (st.rsd.some((x) => x.y === s.year)) return l('Já há um exclusivo neste ano.', 'There is already an exclusive this year.');
  post(s, `lv19rsd:${s.year}`, -rsdCost19(s, k), 'manufacturing', `Record Store Day: ${rel.title}`);
  const p = bestPlant18(s, 'vinyl');
  const q = p ? queueOf18(s, p, 'vinyl') : 12;
  if (p) { const ld = sup18(s).load; ld[p.id] = (ld[p.id] ?? 1) + 0.15; } // o RSD entope as prensas
  st.rsd.push({ y: s.year, rel: rel.id, k, units: rsdUnits19(s, rel, k), late: Math.max(0, q - 8) });
  if (st.rsd.length > 20) st.rsd.shift();
  return q > 8 ? fmtL(l('Encomendado — mas a fila de vinil está em {q} semanas: pode chegar depois do sábado.', 'Ordered — but the vinyl queue is {q} weeks: it may arrive after the Saturday.'), { q }) : l('Encomendado: chega a tempo.', 'Ordered: it will arrive in time.');
}
registerInboxKind('lv19_rsd', { label: l('Record Store Day', 'Record Store Day'), cat: 'decision', icon: 'disc', prio: 1, goto: () => ({ area: 'live19', tab: ['live19', 'vinyl'] }),
  handle: (s, _m, a) => rsdPick19(s, a as 'cat' | 'new' | 'skip') });
function rsdDay(s: GameState): void {
  for (const x of lv19(s).rsd) {
    if (x.done || x.y !== s.year) continue;
    x.done = true;
    const rel = s.releases[x.rel], a = rel && s.acts[rel.actId];
    if (!rel) continue;
    const u = Math.round(x.units * (x.late ? 0.55 : 1)), v = Math.round(u * money(s, 22));
    x.v = v; rel.totalUnits += u; rel.revenue += v;
    post(s, `lv19rsdv:${s.year}`, v, 'sales', `Record Store Day: ${rel.title}`);
    const t = fmtL(l('Record Store Day: "{t}" de {a} esgota {u} cópias numeradas{x}.', 'Record Store Day: "{t}" by {a} sells out {u} numbered copies{x}.'), { t: rel.title, a: a?.name ?? '?', u: u.toLocaleString('en-US'), x: x.late ? l(' (chegou atrasado: metade da fila foi embora)', ' (arrived late: half the line went home)') : '' });
    emitFact(s, { kind: 'rsd_exclusive', actors: [rel.actId, 'player'], severity: 25 + Math.min(20, u / 500), visibility: 'public', tags: ['live19', 'vinyl', 'rsd', x.k, x.late ? 'late' : 'good'], text: t, src: 'live19', data: { rel: rel.id, u } });
    logL19(s, t); cnt(s, 'rsd');
  }
}

// ================================================================ M6 calendário sazonal
export interface Season19 { units: number; live: number; why: L[] }
const MN: L[] = [l('jan', 'Jan'), l('fev', 'Feb'), l('mar', 'Mar'), l('abr', 'Apr'), l('mai', 'May'), l('jun', 'Jun'), l('jul', 'Jul'), l('ago', 'Aug'), l('set', 'Sep'), l('out', 'Oct'), l('nov', 'Nov'), l('dez', 'Dec')];
export const monthName19 = (m: number): L => MN[m] ?? MN[0];
/** Amplitude do 4º trimestre por era: forte no varejo físico (1950–2007), menor antes e no streaming. */
export const xmasAmp19 = (y: number): number => (y < 1950 ? 0.5 : y < 2008 ? 1 : y < 2015 ? 0.75 : 0.45);
/** Curva sazonal do mês (vendas e procura de shows) com o porquê. Média do ano ≈ 1. */
export function season19(y: number, m: number): Season19 {
  const A = xmasAmp19(y), why: L[] = [];
  let u = 1, lv = 1;
  if (m === 10) { u = 1 + 0.2 * A; why.push(l('Compras de Natal começam', 'Christmas shopping starts')); }
  if (m === 11) { u = 1 + 0.35 * A; why.push(l('Natal: o mês que mais vende disco', 'Christmas: the biggest record month')); }
  if (m === 0) { u = 1 - 0.2 * A; lv = 0.95; why.push(l('Calmaria de janeiro: bolsos vazios', 'January lull: empty pockets')); }
  if (m === 1) { u = 1 - 0.12 * A; why.push(l('Fevereiro ainda fraco', 'February still slow')); }
  if (y >= 1960 && m >= 5 && m <= 7) { u *= 1.03; why.push(l('Música de verão: singles tocam na praia', 'Summer songs: singles play on the beach')); }
  if (y >= 1969 && m >= 5 && m <= 7) { lv *= 1.05; why.push(l('Temporada de festivais', 'Festival season')); }
  return { units: Math.round(u * 1000) / 1000, live: Math.round(lv * 1000) / 1000, why };
}
export const xmasCost19 = (s: GameState) => money(s, 3000);
/** Disco do jogador elegível para a campanha de Natal (set–nov; lançado há ≤ 10 semanas). */
export const xmasRels19 = (s: GameState): Release[] => rsdPool(s).filter((x) => s.week - x.week <= 10 && s.week >= x.week);
/** Astros NPC que lançaram nas últimas 8 semanas (concorrência da temporada; o npc17 guarda discos para o Natal). */
export const xmasRivals19 = (s: GameState): number => Object.values(s.releases).filter((x) => x.owner !== 'player' && s.week - x.week <= 8 && s.week >= x.week && (s.acts[x.actId]?.fame ?? 0) >= 60).length;
export const xmasMult19 = (s: GameState): number => Math.max(1.05, 1.25 - 0.03 * xmasRivals19(s));
export function xmasPush19(s: GameState, relId: string): L | null {
  const rel = s.releases[relId];
  if (s.month < 8 || s.month > 10) return l('Campanha de Natal: de setembro a novembro.', 'Christmas campaign: September to November.');
  if (!rel || !xmasRels19(s).some((x) => x.id === relId)) return l('Disco não elegível (lançado há mais de 10 semanas).', 'Record not eligible (released more than 10 weeks ago).');
  const st = lv19(s);
  if (st.xmas[relId]) return l('Já em campanha.', 'Already in a campaign.');
  if (s.player.cash < xmasCost19(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `lv19x:${relId}`, -xmasCost19(s), 'marketing', `Campanha de Natal: ${rel.title}`);
  st.xmas[relId] = s.year;
  logL19(s, fmtL(l('Campanha de Natal para "{t}" (vitrines, TV, cesta de presentes).', 'Christmas campaign for "{t}" (windows, TV, gift bundles).'), { t: rel.title }));
  schedule18(s, 'lv19:xmas', { act: rel.actId, rel: rel.id }, l('Campanha de Natal', 'Christmas campaign'), l('Campanha', 'Campaign'));
  return null;
}
// curva sazonal no TAMANHO do mercado (market.weeklyPool): simétrica, fora dos tetos de mods (média do ano ≈ 1)
POOL19.f = (s) => season19(s.year, s.month).units;
// campanha de Natal: só o disco escolhido, em nov–dez
registerMod('chartUnits', 'live19:xmas', (s, v, c) => {
  const rel = c.release;
  return rel && (s.month === 10 || s.month === 11) && lv19(s).xmas[rel.id] === s.year ? { value: v * xmasMult19(s), label: l('Campanha de Natal', 'Christmas campaign') } : null;
});
registerMod('cityDemand', 'live19:season', (s, v) => {
  const k = season19(s.year, s.month).live;
  return Math.abs(k - 1) > 0.004 ? { value: v * k, label: k > 1 ? l('Temporada de festivais', 'Festival season') : l('Fim/início de ano: pouca gente sai', 'Year end/start: few go out') } : null;
});

// ================================================================ mês
export function liveMonth19(s: GameState): void {
  const st = lv19(s), r = rng(s);
  // boicotes: custo de casas alternativas quando há turnê; audiência; cansaço depois de 2 anos
  for (const b of activeBoy19(s)) {
    const a = s.acts[b.act];
    if (!a) { b.end = s.week; continue; }
    if (s.tours.some((t) => t.actId === a.id && t.status === 'running') && mine(s, a)) {
      const c = boyCost19(s, a); b.cost += c;
      post(s, `lv19boy:${b.id}:${s.year}-${s.month}`, -c, 'live', `Boicote: casas alternativas (${a.name})`);
      const f = fan18(s, a.id, false); if (f) f.loy = clamp(f.loy + 0.5, 0, 100);
    }
    if (!b.res && s.week >= b.hear) hearing19(s, b.id);
    if (s.week - b.w > 104) endBoy19(s, b.id, l('dois anos depois, o boicote perde fôlego', 'two years on, the boycott runs out of steam'));
  }
  npcBoy(s, r);
  // RSD: oferta em fevereiro, dia em abril
  if (s.year >= RSD_FROM19 && s.month === 1 && rsdPool(s).length && !st.rsd.some((x) => x.y === s.year)) {
    const c = rsdRel19(s, 'cat'), n = rsdRel19(s, 'new');
    if (c || n) pushInbox18(s, 'lv19_rsd', { from: l('Lojas independentes', 'Independent stores').pt, subject: l('Record Store Day em abril: exclusivo?', 'Record Store Day in April: an exclusive?'), tone: 'info',
      body: fmtL(l('Prensagem limitada e numerada só para as lojas independentes. Curva do vinil hoje: {v}× do piso de 2007. Fila de vinil: {q} semanas.', 'A limited, numbered pressing only for independent stores. Vinyl curve today: {v}× the 2007 floor. Vinyl queue: {q} weeks.'), { v: Math.round(vinylIdx19(s.year) / 0.04 * 10) / 10, q: (() => { const p = bestPlant18(s, 'vinyl'); return p ? queueOf18(s, p, 'vinyl') : '?'; })() }),
      actions: [...(c ? [{ id: 'cat', label: fmtL(l('Reedição colorida de "{t}"', 'Coloured reissue of "{t}"'), { t: c.title }) }] : []), ...(n ? [{ id: 'new', label: fmtL(l('Exclusivo de "{t}"', '"{t}" exclusive'), { t: n.title }) }] : []), { id: 'skip', label: l('Passar este ano', 'Skip this year') }], weeks: 6 });
  }
  if (s.month === RSD_MONTH19) rsdDay(s);
  // crônica real (modo exato)
  if (exactHist(s)) for (const c of CHRON19) { const k = `${c.y}:${c.m}`; if (c.y === s.year && c.m === s.month && !st.chron[k]) { st.chron[k] = 1; logL19(s, c.t); headline19(s, c.t, 2); } }
}
registerSimHook('month', 'live19', (s) => liveMonth19(s));

// ================================================================ ouvintes
// boicote (seu ou de NPC): promotores locais esfriam com quem boicota; fãs da cena aplaudem (manchete)
onFact('boycott', (s, f) => {
  if (!f.tags.includes('tickets')) return;
  headline19(s, f.text, 2);
  const a = s.acts[f.actors[0]];
  if (mine(s, a)) { const rel = c12(s).rel; const k = a.city; rel[k] = clamp((rel[k] ?? 30) - 4, 0, 100); }
}, 'live19:boycott');
// decisão antitruste: vitória → lealdade de todos os seus atos e reputação institucional; derrota → promotores esfriam
onFact('antitrust_ruling', (s, f) => {
  headline19(s, f.text, 3);
  const win = f.tags.includes('win');
  if (win) { s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100); for (const id of playerActs(s)) { const x = fan18(s, id, false); if (x) x.loy = clamp(x.loy + 3, 0, 100); } }
  else { const rel = c12(s).rel; for (const k of Object.keys(rel)) rel[k] = clamp(rel[k] - 2, 0, 100); }
}, 'live19:ruling');
// festival gratuito: fãs (mobilização), embalo, descoberta de um ato local no palco aberto, manchete
onFact('free_fest', (s, f) => {
  const att = Number(f.data?.att ?? 0), acts = f.actors.filter((x) => mine(s, s.acts[x]));
  for (const id of acts) { const a = s.acts[id]; a.fans.casual += Math.round(att * 0.15 / Math.max(1, acts.length)); a.fans.active += Math.round(att * 0.02 / Math.max(1, acts.length)); a.fame = clamp(a.fame + 2, 0, 100); a.momentum = clamp(a.momentum + 5, 0, 100); const x = fan18(s, id, false); if (x) x.mob = clamp((x.mob ?? 0) + 5, 0, 100); }
  if (!f.tags.includes('bad')) s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
  const r = rng(s), loc = Object.values(s.acts).filter((a) => !a.owner && a.status === 'emerging' && !a.deceased && a.city === f.place);
  const d = loc.length ? r.pick(loc) : undefined;
  if (d) addLead18(s, r, d, 'festival', 2, 9, l('Tocou no palco aberto do seu festival gratuito.', 'Played the open stage at your free festival.'));
  headline19(s, f.text, 2);
}, 'live19:freefest');
// RSD: colecionadores viram superfãs (fandom19); lojas independentes passam a gostar do selo
onFact('rsd_exclusive', (s, f) => {
  const a = s.acts[f.actors[0]], u = Number(f.data?.u ?? 0);
  if (a) { const fd = fandomRec19(s, a.id); fd.superfans += Math.round(u * 0.05); a.fans.core += Math.round(u * 0.02); }
  s.player.reputation.artists = clamp(s.player.reputation.artists + 0.5, 0, 100);
  headline19(s, f.text, 1);
}, 'live19:rsd');

// ================================================================ ecos das decisões
const T = (pt: string, en: string) => l(pt, en);
registerConseq18('lv19:boy:start', { now: T('Fãs +6 de lealdade; turnê fora do circuito custa mais.', 'Fans +6 loyalty; touring outside the circuit costs more.'), later: [
  { in: [2, 6], p: 0.5, tone: 'good', hint: T('Outros artistas podem aderir.', 'Other artists may join.'), fx: (f) => { f.fans(3).rep('artistic', 1); return T('Músicos da cena assinam uma carta apoiando o boicote.', 'Scene musicians sign a letter backing the boycott.'); } },
  { in: [3, 9], p: 0.35, tone: 'bad', hint: T('O gigante tem memória longa.', 'The giant has a long memory.'), fx: (f) => { f.momentum(-4); return T('Casas grandes "sem data" para o seu ato por um tempo.', 'Big venues are "fully booked" for your act for a while.'); } }] });
registerConseq18('lv19:boy:end', { later: [{ in: [1, 4], p: 0.4, tone: 'bad', hint: T('Fãs lembram de quem desistiu.', 'Fans remember who gave in.'), fx: (f) => { f.fans(-2); return T('Fanzines chamam o fim do boicote de rendição.', 'Fanzines call the end of the boycott a surrender.'); } }] });
registerConseq18('ib:lv19_hear:keep', { later: [{ in: [3, 10], p: 0.45, tone: 'good', hint: T('Teimosia vira lenda.', 'Stubbornness becomes legend.'), fx: (f) => { f.fans(4).fame(1); return T('O boicote vira parte da identidade do ato.', 'The boycott becomes part of the act\'s identity.'); } }] });
registerConseq18('ib:lv19_hear:end', { later: [{ in: [1, 4], p: 0.3, tone: 'mixed', hint: T('O circuito volta, a mística vai.', 'The circuit returns, the mystique goes.'), fx: (f) => { f.fans(-1).momentum(3); return T('De volta às arenas: caixa melhora, credibilidade cai um pouco.', 'Back in arenas: cash improves, credibility dips.'); } }] });
for (const [k, p, tone, pt, en, hp, he] of [
  [0, 0.45, 'bad', 'Moradores processam pelo lixo e pelo barulho.', 'Residents sue over litter and noise.', 'Voluntário não segura multidão.', 'Volunteers cannot hold a crowd.'],
  [1, 0.3, 'good', 'A prefeitura elogia a organização.', 'City hall praises the organisation.', 'Organização boa abre portas.', 'Good organisation opens doors.'],
  [2, 0.5, 'good', 'A cidade convida o festival a voltar — com licença facilitada.', 'The city invites the festival back — with an easier permit.', 'Cuidado vira reputação.', 'Care becomes reputation.'],
] as const) registerConseq18(`lv19:ff:sec${k}`, { later: [{ in: [1, 5], p, tone, hint: l(hp, he), fx: (f) => { if (tone === 'bad') f.cash(-money(f.s, 6000), 'Limpeza e indenizações do festival gratuito', 'legal'); else f.rep('institutional', k === 2 ? 3 : 1); return l(pt, en); } }] });
registerConseq18('ib:lv19_rsd:cat', { later: [{ in: [3, 9], p: 0.35, tone: 'good', hint: T('Colecionadores revendem caro.', 'Collectors resell high.'), fx: (f) => { f.fans(2); return T('A edição do RSD vale o triplo na revenda: o catálogo ganha aura.', 'The RSD edition resells for triple: the catalogue gains an aura.'); } }] });
registerConseq18('ib:lv19_rsd:new', { later: [{ in: [2, 6], p: 0.35, tone: 'mixed', hint: T('Cambistas também gostam de vinil.', 'Scalpers like vinyl too.'), fx: (f) => { f.fans(-1).fame(1); return T('Cambistas compram metade da tiragem; fãs reclamam, a imprensa nota.', 'Scalpers buy half the run; fans complain, the press notices.'); } }] });
registerConseq18('ib:lv19_rsd:skip', { later: [{ in: [2, 6], p: 0.2, tone: 'bad', hint: T('Lojas independentes reparam em quem some.', 'Indie stores notice who is missing.'), fx: (f) => { f.rep('artists', -1); return T('Lojas independentes dão a vitrine a outro selo.', 'Indie stores give the window to another label.'); } }] });
registerConseq18('lv19:xmas', { later: [{ in: [2, 4], p: (s) => (xmasRivals19(s) >= 3 ? 0.5 : 0.2), tone: 'bad', hint: T('Dezembro é disputado pelos astros.', 'December is fought over by the stars.'), fx: (f) => { f.momentum(-2); return T('Um megastar lançou na mesma semana: a vitrine de Natal ficou com ele.', 'A megastar dropped the same week: the Christmas window went to them.'); } }] });

// ================================================================ calendário, porquê e conselheiro
registerDeadline('live19', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const b of activeBoy19(s)) if (!b.res && b.hear >= from && b.hear <= to) out.push({ id: `live19-hear-${b.id}`, w: b.hear, kind: 'court', t: fmtL(l('Audiência antitruste ({a})', 'Antitrust hearing ({a})'), { a: s.acts[b.act]?.name ?? '?' }), tone: 'info', goto: { area: 'live19' } });
  // marcos da temporada (sem ação): Natal, janeiro, festivais, RSD
  for (let y = s.year; y <= s.year + 1; y++) for (const [m, k, t] of [[10, 'release', l('Começa a temporada de Natal (vendas ↑)', 'Christmas season starts (sales ↑)')], [0, 'other', l('Calmaria de janeiro (vendas ↓)', 'January lull (sales ↓)')], [5, 'festival', l('Temporada de festivais e músicas de verão', 'Festival season and summer songs')], [RSD_MONTH19, 'release', l('Record Store Day', 'Record Store Day')]] as [number, 'release' | 'other' | 'festival', L][]) {
    if ((m === 5 && y < 1960) || (m === RSD_MONTH19 && y < RSD_FROM19)) continue;
    const w = s.week + Math.round(((y - s.year) * 12 + m - s.month) * W);
    if (w >= from && w <= to) out.push({ id: `live19-${m}-${y}`, w, kind: k, t, tone: 'info', goto: { area: 'live19', tab: ['live19', 'season'] } });
  }
  return out;
});
registerExplain('lv19.hear', (s, c) => {
  const b = lv19(s).boy.find((x) => x.id === String(c.boy ?? ''));
  if (!b) return null;
  const o = hearOdds19(s, b);
  return { title: l('Chance de vencer a audiência antitruste', 'Odds of winning the antitrust hearing'), value: o.p, fmt: 'pct', parts: o.why, note: exactHist(s) ? l('Modo exato: o caso real de 1994–95 foi arquivado.', 'Exact mode: the real 1994–95 case was dropped.') : l('Vitória: a taxa do gigante cai 40% por 10 anos para todo mundo.', 'Win: the giant\'s fee drops 40% for 10 years for everyone.') };
});
registerExplain('lv19.season', (s, c) => {
  const m = Number(c.m ?? s.month), x = season19(s.year, m);
  const parts: WhyPart[] = [{ label: fmtL(l('Amplitude do Natal na época ({y})', 'Christmas amplitude in this era ({y})'), { y: s.year }), value: xmasAmp19(s.year), fmt: 'mult' }, ...x.why.map((w) => ({ label: w, value: x.units, fmt: 'mult' as const }))];
  if (lv19(s).xmas && Object.values(lv19(s).xmas).includes(s.year)) parts.push({ label: fmtL(l('Campanha de Natal (−3% por astro lançando: {n})', 'Christmas campaign (−3% per star releasing: {n})'), { n: xmasRivals19(s) }), value: xmasMult19(s), fmt: 'mult', tone: 'good' });
  return { title: fmtL(l('Temporada: {m}', 'Season: {m}'), { m: monthName19(m) }), value: x.units, fmt: 'mult', parts, note: fmtL(l('Shows: ×{v}. Varejo físico (1950–2007) sente mais o Natal; streaming quase nada.', 'Shows: ×{v}. Physical retail (1950–2007) feels Christmas most; streaming barely.'), { v: x.live }) };
});
registerExplain('lv19.ff', (s, c) => {
  const site = (c.site === 'farm' ? 'farm' : 'park') as Site19, sec = Number(c.sec ?? 1), cap = SITE19[site].cap, att = ffAtt19(s);
  const o = tragedyOdds19(s, Math.min(att, cap * 1.3), cap, cap, [15, 45, 75][sec] ?? 15);
  return { title: l('Risco de incidente no festival gratuito', 'Free festival incident risk'), value: o.p, fmt: 'pct', parts: [{ label: l('Público esperado', 'Expected crowd'), value: att, fmt: 'num' }, { label: l('Capacidade do terreno', 'Site capacity'), value: cap, fmt: 'num' }, ...o.why.map((w) => ({ label: w, value: 0, fmt: 'num' as const }))], note: l('Um terço do risco é tragédia (processo e lei de segurança); o resto, feridos.', 'A third of the risk is tragedy (lawsuit and safety law); the rest, injuries.') };
});
registerAdvisorTip('live19', (s) => {
  const out: AdvTip18[] = [];
  if (s.month >= 8 && s.month <= 10 && xmasRels19(s).some((x) => !lv19(s).xmas[x.id])) out.push({ id: 'live19-xmas', level: 'info', text: l('Disco novo no 4º trimestre: uma campanha de Natal multiplica as vendas de nov–dez.', 'New record in Q4: a Christmas campaign multiplies Nov–Dec sales.'), goto: { area: 'live19', tab: ['live19', 'season'] } });
  const g = giant18(s);
  if (g && g.fee >= 0.045 && !activeBoy19(s).length && playerActs(s).some((id) => (s.acts[id]?.fame ?? 0) >= 60)) out.push({ id: 'live19-boy', level: 'info', text: fmtL(l('A {g} cobra {p}% de taxa. Um ato grande seu pode boicotar — custa caro, mas fãs e imprensa apoiam.', '{g} charges a {p}% fee. A big act of yours can boycott — costly, but fans and press back it.'), { g: g.name, p: Math.round(g.fee * 100) }), goto: { area: 'live19' } });
  return out;
});

export const countryOf19 = (s: GameState): string => countryOfCity(s.config.homeCity) ?? 'USA';
export const factsLive19 = (s: GameState) => recentFacts(s, { kinds: ['boycott', 'antitrust_ruling', 'free_fest', 'rsd_exclusive'], months: 60, limit: 20 });
