// R29 (feat de pessoa) — pedido do autor: "permita a participação/feat de só integrantes/personagens específicos, sem ser a
// banda toda também". O feat negociado de sempre (feats8: cachê, royalties da faixa, liberação do selo, resposta na hora /
// "preciso pensar" / contraproposta) passa a aceitar como convidado uma PESSOA — integrante de banda, artista solo, músico
// avulso, produtor(a) que canta ou toca — ou várias, e também um ato + pessoas (feat misto). Um caminho só (docs/act27.md):
// é a mesma tela (round8.openFeatModal), a mesma negociação e o mesmo registro (feats8.deals, creation.features).
//  • Crédito: "Música (feat. Freddie Mercury)" — o nome da pessoa, não o da banda.
//  • Efeitos pela PESSOA: fama própria (fame15.personFame), habilidade do papel (voz de quem canta — vocals10.sings —,
//    instrumento de quem toca) → performance/Q da faixa; apelo do lançamento (FEATP29_CORE.appeal); cachê; público
//    cruzado vindo dos fãs da banda dela, em escala menor que o feat da banda inteira.
//  • Liberação: pessoa de banda com contrato (selo rival/NPC) passa pela liberação de sempre (feats8.clearance) do ato dela;
//    a banda reage um pouco (ciúme ou orgulho: Person.rel dos colegas). Morta, jovem demais, parada ou do seu elenco: não.
// Determinístico: Rng.fromSeed(semente|feats8p29|…) próprio, nunca o fluxo compartilhado. Este módulo é importado no fim
// (sys/index) e por member29: não muda a ordem dos ganchos que já existiam (os mundos padrão ficam iguais).

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { songQ } from '../production';
import type { Act, GameState, Person } from '../types';
import { fmtL, nextId, post, remember } from '../util';
import { actsOfPerson17 } from '../actidx17';
import { cashWhy20, freeCash20 } from '../oblig20';
import { FEATP29_CORE, featureFee, songX } from './creation/core';
import { personFame } from './fame15';
import { FEAT29, clearance, fairFeat, featChance, feats, hasFeat29, linkActs, pushDeal, type FeatDeal, type FeatResult, type FeatTerms } from './feats8';
import { l16 } from './lineup16';
import { ownerBonus } from './people/owner';
import { bump, tieOf } from './social8';
import { settleVocals, sings } from './vocals10';

export const FEATP29_RNG = 'feats8p29';
/** No máximo 4 pessoas convidadas numa faixa. */
export const FEAT_MAX_P29 = 4;
/** Peso de cada convidado-pessoa a mais (o primeiro conta inteiro). */
const W29 = [1, 0.6, 0.4, 0.3];
/** Convidados de um feat: um ato (opcional) e pessoas. */
export interface FeatGuest29 { act?: string; persons: string[] }

const T = (pt: string, en: string, p: Record<string, string | number | L> = {}): L => fmtL(l(pt, en), p);
const LIVE = (a: Act): boolean => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const round2 = (x: number): number => Math.round(x * 100) / 100;
const leadOf = (a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]);

/** Sorteio próprio (semente|feats8p29|parte|semana|n) — nunca mexe no fluxo compartilhado. */
export function rngFeat29(s: GameState, part: string): Rng {
  const st = feats(s);
  st.n29 = (st.n29 ?? 0) + 1;
  return Rng.fromSeed(`${s.config.seed}|${FEATP29_RNG}|${part}|${s.week}|${st.n29}`);
}

/** Pessoas convidadas de uma faixa (vazio = nenhuma). */
export const featPersons29 = (s: GameState, songId: string): string[] => s.x4.creation.songs[songId]?.featPersons ?? [];

/** O ato "de casa" da pessoa: a banda/carreira viva de maior fama (ou nada: avulso/parado). */
export function homeAct29(s: GameState, pid: string): Act | undefined {
  let best: Act | undefined;
  for (const a of actsOfPerson17(s, pid)) if (LIVE(a) && (!best || a.fame > best.fame)) best = a;
  return best;
}

/** Habilidade que a pessoa leva para a faixa: a voz de quem canta, o instrumento de quem toca. */
export function featSkill29(s: GameState, p: Person): number {
  return sings(s, p) ? p.skills.voice : p.skills.instr;
}

/** Normaliza: sem repetidos, sem vazios, no máximo FEAT_MAX_P29 pessoas; ato vazio = sem ato. */
export function normGuest29(g: FeatGuest29): FeatGuest29 {
  const persons = [...new Set((g.persons ?? []).filter(Boolean))].slice(0, FEAT_MAX_P29);
  return g.act ? { act: g.act, persons } : { persons };
}

/** Nome do convite para o crédito: "A", "A & B", "A, B & C" (o ato, se houver, vem primeiro). */
export function guestNames29(s: GameState, g: FeatGuest29): string {
  const xs = [...(g.act && s.acts[g.act] ? [s.acts[g.act].name] : []), ...g.persons.map((p) => s.persons[p]?.name ?? '?')];
  return xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} & ${xs[xs.length - 1]}`;
}

/** Por que esta pessoa não pode ser convidada agora (null = pode). */
export function featPersonBlock29(s: GameState, pid: string, hostId?: string): L | null {
  const p = s.persons[pid];
  if (!p) return l('Pessoa desconhecida.', 'Unknown person.');
  if (p.isPlayer) return l('É você.', 'That\'s you.');
  if (!p.alive) return l('Faleceu.', 'Has passed away.');
  if (s.year - p.born < 14) return l('Jovem demais: ainda não está em atividade nesta época.', 'Too young: not active in this era yet.');
  if (p.role === 'producer' && !sings(s, p) && p.skills.instr < 45) return l('Produtor(a) que não canta nem toca: não grava participação.', 'A producer who neither sings nor plays: no feature to record.');
  const A = homeAct29(s, pid);
  if (hostId && s.acts[hostId]?.members.includes(pid)) return l('Já está neste artista.', 'Already in this act.');
  if (A && mine(A)) return l('Já está no seu elenco.', 'Already on your roster.');
  if (!A && !l16(s).free[pid]) return l('Fora de atividade agora (sem banda nem carreira em andamento).', 'Not active right now (no band or ongoing career).');
  if (A) { const cl = clearance(s, A.id, 1); if (cl.blocked) return cl.text; }
  return null;
}

interface Share29 { id: string; kind: 'act' | 'person'; fair: FeatTerms; fame: number; act?: Act }

/** Termos justos de cada convidado (ato pelo fairFeat de sempre; pessoa pela fama e habilidade dela). */
function shares29(s: GameState, hostId: string, g: FeatGuest29): Share29[] {
  const hf = s.acts[hostId]?.fame ?? 10;
  const out: Share29[] = [];
  if (g.act && s.acts[g.act]) out.push({ id: g.act, kind: 'act', fair: fairFeat(s, hostId, g.act), fame: s.acts[g.act].fame, act: s.acts[g.act] });
  for (const pid of g.persons) {
    const p = s.persons[pid];
    if (!p) continue;
    const pf = personFame(s, pid).v;
    const fee = Math.round(featureFee(s, { fame: pf } as Act) * (0.85 + featSkill29(s, p) / 400));
    out.push({ id: pid, kind: 'person', fair: { fee, split: round2(clamp(0.06 + pf / 320 - hf / 900, 0.04, 0.35)) }, fame: pf, act: homeAct29(s, pid) });
  }
  return out;
}

/** Termos "justos" do convite inteiro: soma dos cachês; a maior parte de royalties (+2 pontos por convidado a mais). */
export function fairFeat29(s: GameState, hostId: string, g0: FeatGuest29): FeatTerms {
  const xs = shares29(s, hostId, normGuest29(g0));
  if (!xs.length) return { fee: 0, split: 0 };
  return { fee: xs.reduce((t, x) => t + x.fair.fee, 0), split: round2(Math.min(0.5, Math.max(...xs.map((x) => x.fair.split)) + 0.02 * (xs.length - 1))) };
}

/** Liberação dos selos: uma por ato envolvido (o convidado e as bandas das pessoas), proporcional ao cachê. */
export function clearance29(s: GameState, hostId: string, g0: FeatGuest29, fee: number): { cost: number; blocked: boolean; text: L; parts: { actId: string; cost: number }[] } {
  const xs = shares29(s, hostId, normGuest29(g0));
  const tot = Math.max(1, xs.reduce((t, x) => t + x.fair.fee, 0));
  const byAct = new Map<string, number>();
  for (const x of xs) if (x.act) byAct.set(x.act.id, (byAct.get(x.act.id) ?? 0) + fee * (x.fair.fee / tot));
  const parts: { actId: string; cost: number }[] = [];
  const texts: L[] = [];
  for (const [actId, f] of byAct) {
    const c = clearance(s, actId, f);
    if (c.blocked) return { cost: 0, blocked: true, text: c.text, parts: [] };
    if (c.cost > 0 || !texts.length) texts.push(c.text);
    parts.push({ actId, cost: c.cost });
  }
  const cost = parts.reduce((t, x) => t + x.cost, 0);
  const text = !byAct.size ? l('Sem selo por trás: não precisa de liberação.', 'No label behind them: no clearance needed.')
    : texts.length === 1 ? texts[0] : { pt: [...new Set(texts.map((x) => x.pt))].join(' '), en: [...new Set(texts.map((x) => x.en))].join(' ') };
  return { cost, blocked: false, text, parts };
}

/** Quanto a pessoa gosta da proposta (>0 tende a aceitar): como o feats8 do ato, com a fama e os laços DELA. */
function personScore29(s: GameState, songId: string, pid: string, priceRel: number, royRel: number): number {
  const song = s.songs[songId];
  const host = song ? s.acts[song.actId] : undefined;
  const p = s.persons[pid];
  if (!song || !host || !p) return -9;
  const pf = personFame(s, pid).v;
  const A = homeAct29(s, pid);
  const hl = leadOf(host);
  const bond = hl ? tieOf(s, hl, pid)?.v ?? p.rel[hl] ?? 0 : 0;
  let want = (host.fame - pf) / 55 + (song.q - 55) / 45 + bond / 70 + (A ? (familyOf(A.genre) === familyOf(host.genre) ? 0.15 : -0.05) : 0.1);
  want += (s.player.reputation.artists - 50) / 200 + ownerBonus(s, 'negotiation') * 0.15;
  want -= (feats(s).asked[`p:${pid}`] ?? -99) > s.week - 8 ? 0.25 : 0;
  if (!A || A.status === 'hiatus') want += 0.15; // avulso ou banda parada: topa mais fácil
  return want + clamp(priceRel, -1, 2) * 0.7 + clamp(royRel, -1, 2) * 0.5;
}

/** Chance de o convite inteiro dar certo: quem for mais difícil decide (e cada convidado a mais pesa um pouco). */
export function featChance29(s: GameState, songId: string, g0: FeatGuest29, t0: FeatTerms): number {
  const song = s.songs[songId];
  const g = normGuest29(g0);
  if (!song) return 0;
  const xs = shares29(s, song.actId, g);
  if (!xs.length) return 0;
  const fair = fairFeat29(s, song.actId, g);
  const priceRel = t0.fee / Math.max(1, fair.fee) - 1;
  const royRel = t0.split / Math.max(0.01, fair.split) - 1;
  let p = 1;
  for (const x of xs) {
    const pi = x.kind === 'act'
      ? featChance(s, songId, x.id, { fee: x.fair.fee * (1 + priceRel), split: x.fair.split * (1 + royRel) })
      : clamp(1 / (1 + Math.exp(-personScore29(s, songId, x.id, priceRel, royRel) * 2.6)), 0.02, 0.96);
    p = Math.min(p, pi);
  }
  return clamp(p * (1 - 0.04 * (xs.length - 1)), 0.02, 0.96);
}

/** Validação comum (convidados, faixa, negociação aberta). */
function invalid29(s: GameState, songId: string, g: FeatGuest29): L | null {
  const song = s.songs[songId];
  const host = song ? s.acts[song.actId] : undefined;
  if (!song || !host || !mine(host)) return l('Convite inválido.', 'Invalid invite.');
  if (!g.persons.length) return l('Escolha ao menos uma pessoa.', 'Pick at least one person.');
  if (g.act) {
    const A = s.acts[g.act];
    if (!A || mine(A) || !LIVE(A) || !A.members.length) return l('O ato convidado não está disponível.', 'The guest act is not available.');
    const dup = g.persons.find((p) => A.members.includes(p));
    if (dup) return T('{n} já vem com {a}: convide só a pessoa ou só o ato.', '{n} already comes with {a}: invite the person or the act.', { n: s.persons[dup]?.name ?? '?', a: A.name });
  }
  for (const pid of g.persons) {
    const b = featPersonBlock29(s, pid, host.id);
    if (b) return { pt: `${s.persons[pid]?.name ?? '?'}: ${b.pt}`, en: `${s.persons[pid]?.name ?? '?'}: ${b.en}` };
  }
  if (song.releaseId || hasFeat29(s, songId)) return l('Esta música já foi lançada ou já tem participação.', 'This song is already out or already has a feature.');
  if (feats(s).deals.some((d) => d.songId === songId && d.status !== 'done')) return l('Já há uma negociação aberta para esta música.', 'There is already an open negotiation for this song.');
  return null;
}

/** Convite a pessoa(s) com resposta na hora — a mesma negociação do feats8.proposeFeat (aceita, pensa, contraproposta, recusa). */
export function proposeFeat29(s: GameState, songId: string, g0: FeatGuest29, t0: FeatTerms): { result: FeatResult; deal?: FeatDeal; counter?: FeatTerms; text: L } {
  const g = normGuest29(g0);
  const bad = invalid29(s, songId, g);
  if (bad) return { result: 'invalid', text: bad };
  const song = s.songs[songId];
  const host = s.acts[song.actId];
  const names = guestNames29(s, g);
  t0 = { fee: Math.max(0, Math.round(t0.fee)), split: clamp(t0.split, 0, 0.5) };
  const cl = clearance29(s, host.id, g, t0.fee);
  if (cl.blocked) return { result: 'rejected', text: cl.text };
  if (s.player.cash < t0.fee + cl.cost) return { result: 'invalid', text: l('Caixa insuficiente para cachê e liberação.', 'Not enough cash for fee and clearance.') };
  const p = featChance29(s, songId, g, t0);
  const st = feats(s);
  for (const pid of g.persons) st.asked[`p:${pid}`] = s.week;
  if (g.act) st.asked[g.act] = s.week;
  const r = rngFeat29(s, `p:${songId}`);
  const roll = r.next();
  const base = { id: '', songId, title: song.title, hostActId: host.id, guestActId: g.act ?? '', guestPersons: [...g.persons], fee: t0.fee, split: t0.split, clearance: cl.cost, side: 'host' as const, lastRev: 0, paid: 0, week: s.week };
  if (roll < p * 0.85) {
    const t = song.title;
    const deal = closeFeat29(s, songId, g, t0, cl.cost) ?? undefined;
    return { result: 'accepted', deal, text: T('{g} topou! Participação gravada em "{t}".', '{g} said yes! Feature recorded on "{t}".', { g: names, t }) };
  }
  if (roll < p) {
    const deal: FeatDeal = { ...base, id: nextId(s, 'fd'), status: 'thinking', thinkUntil: s.week + r.int(1, 2) };
    st.deals.push(deal);
    return { result: 'thinking', deal, text: T('{g} gostou, mas quer ouvir a faixa com calma. Resposta em até 2 semanas.', '{g} liked it but wants to listen properly. Answer within 2 weeks.', { g: names }) };
  }
  if (p > 0.18) {
    const fair = fairFeat29(s, host.id, g);
    const counter: FeatTerms = { fee: Math.round(Math.max(t0.fee, (t0.fee + fair.fee * 1.25) / 2)), split: round2(Math.max(t0.split, (t0.split + fair.split * 1.2) / 2)) };
    const deal: FeatDeal = { ...base, id: nextId(s, 'fd'), status: 'counter', counter };
    st.deals.push(deal);
    return { result: 'counter', deal, counter, text: T('{g} topa por {f} e {p}% dos royalties da faixa.', '{g} is in for {f} and {p}% of the track royalties.', { g: names, f: `$${Math.round(counter.fee / 100).toLocaleString('en-US')}`, p: Math.round(counter.split * 100) }) };
  }
  // recusa pesa um pouco na relação
  const hl = leadOf(host);
  if (hl && r.chance(0.3)) bump(s, hl, g.persons[0], -4, 'feat');
  const top = Math.max(...g.persons.map((x) => personFame(s, x).v));
  const why = top > host.fame + 25 ? l('o seu artista ainda é pequeno para eles', 'your act is still too small for them') : song.q < 50 ? l('a música não convenceu', 'the song did not convince them') : l('os termos não agradaram', 'the terms did not appeal');
  return { result: 'rejected', text: T('{g} recusou: {w}.', '{g} declined: {w}.', { g: names, w: why }) };
}

/** A banda da pessoa reage (sem sorteio): ciúme dos colegas (−2) — ou orgulho (+1) quando o anfitrião é bem maior. */
export function bandReact29(s: GameState, pid: string, host: Act): number {
  const A = homeAct29(s, pid);
  if (!A || A.members.length < 2) return 0;
  const d = host.fame >= A.fame + 10 ? 1 : -2;
  for (const m of A.members) {
    const q = s.persons[m];
    if (!q || m === pid || !q.alive) continue;
    q.rel[pid] = clamp((q.rel[pid] ?? 0) + d, -100, 100);
  }
  return d;
}

/** Fecha a participação de pessoa(s): paga, grava, credita "feat. {Nome}", cria laço e registra. */
export function closeFeat29(s: GameState, songId: string, g0: FeatGuest29, t0: FeatTerms, clearanceCost: number): FeatDeal | null {
  const g = normGuest29(g0);
  const song = s.songs[songId];
  const host = song ? s.acts[song.actId] : undefined;
  if (!song || !host || song.releaseId || hasFeat29(s, songId) || !g.persons.length) return null;
  if (g.persons.some((p) => !s.persons[p]?.alive) || (g.act && !s.acts[g.act])) return null;
  const names = guestNames29(s, g);
  const xs = shares29(s, host.id, g);
  const tot = Math.max(1, xs.reduce((t, x) => t + x.fair.fee, 0));
  if (t0.fee > 0) post(s, `feat8:${songId}`, -t0.fee, 'recording', `Participação de ${names}`);
  if (clearanceCost > 0) post(s, `featclr:${songId}`, -clearanceCost, 'legal', `Liberação de ${names}`);
  // o cachê vai para quem grava (a banda/carreira da pessoa); a liberação, para os selos (proporcional)
  for (const x of xs) if (x.act) x.act.cash += Math.round(t0.fee * (x.fair.fee / tot));
  if (clearanceCost > 0) {
    const parts = clearance29(s, host.id, g, t0.fee).parts.filter((p) => p.cost > 0);
    const sum = Math.max(1, parts.reduce((t, p) => t + p.cost, 0));
    for (const p of parts) { const lb = s.acts[p.actId]?.owner ? s.labels[s.acts[p.actId].owner!] : undefined; if (lb) lb.cash += Math.round(clearanceCost * (p.cost / sum)); }
  }
  const base = song.title;
  const sx = songX(s, songId);
  if (g.act) sx.featuring = g.act;
  sx.featPersons = [...g.persons];
  song.title = `${base} (feat. ${names})`;
  // performance: o ato como sempre (4 + fama/25); cada pessoa pela fama e pela habilidade do papel (voz/instrumento)
  let gain = 0;
  if (g.act) gain += 4 + s.acts[g.act].fame / 25;
  g.persons.forEach((pid, i) => {
    const p = s.persons[pid];
    gain += (W29[i] ?? 0.3) * (2 + personFame(s, pid).v / 30 + clamp((featSkill29(s, p) - 50) / 12, -2, 4));
  });
  song.performance = clamp(song.performance + Math.min(12, gain), 0, 100);
  settleVocals(s, song); // quem canta dá voz à faixa instrumental (vocals10)
  song.q = songQ(song);
  s.x4.creation.features.push({ id: nextId(s, 'ft'), songId, guestActId: g.act ?? '', guestPersons: [...g.persons], fee: t0.fee, share: t0.split, status: 'done', week: s.week });
  if (s.x4.creation.features.length > 40) s.x4.creation.features.splice(0, s.x4.creation.features.length - 40);
  const deal: FeatDeal = { id: nextId(s, 'fd'), songId, title: base, hostActId: host.id, guestActId: g.act ?? '', guestPersons: [...g.persons], fee: t0.fee, split: t0.split, clearance: clearanceCost, side: 'host', status: 'done', lastRev: 0, paid: 0, week: s.week };
  pushDeal(s, deal);
  host.feats += 1;
  if (g.act) { s.acts[g.act].feats += 1; linkActs(s, host, s.acts[g.act], 22); }
  const hl = leadOf(host);
  for (const pid of g.persons) {
    if (hl) bump(s, hl, pid, 22, 'feat', 'collab');
    bandReact29(s, pid, host);
  }
  const top = Math.max(...g.persons.map((x) => personFame(s, x).v), g.act ? s.acts[g.act].fame : 0);
  remember(s, 'feature', T('{g} grava participação em "{t}", de {h}.', '{g} records a feature on "{t}" by {h}.', { g: names, t: base, h: host.name }), { actId: host.id, pid: g.persons[0], important: top > 50 });
  return deal;
}

const dealGuest29 = (d: FeatDeal): FeatGuest29 => (d.guestActId ? { act: d.guestActId, persons: d.guestPersons ?? [] } : { persons: d.guestPersons ?? [] });

// ganchos do feats8: aceitar contraproposta, resposta de quem pediu tempo, quem recebe os royalties
FEAT29.accept = (s, d) => {
  const st = feats(s);
  const g = dealGuest29(d);
  const cl = clearance29(s, d.hostActId, g, d.counter!.fee);
  if (cl.blocked) return cl.text;
  if (freeCash20(s) < d.counter!.fee + cl.cost) return cashWhy20(s, d.counter!.fee + cl.cost, l('Caixa insuficiente.', 'Not enough cash.'));
  st.deals = st.deals.filter((x) => x !== d);
  if (!closeFeat29(s, d.songId, g, d.counter!, cl.cost)) return l('A música não está mais disponível.', 'The song is no longer available.');
  return null;
};
FEAT29.resolve = (s, d, malus) => {
  const st = feats(s);
  st.deals = st.deals.filter((x) => x !== d);
  const g = dealGuest29(d);
  const names = guestNames29(s, g);
  const p = featChance29(s, d.songId, g, { fee: d.fee, split: d.split }) + 0.1 + malus;
  const r = rngFeat29(s, `t:${d.songId}`);
  if (r.chance(p) && s.player.cash >= d.fee + d.clearance && closeFeat29(s, d.songId, g, { fee: d.fee, split: d.split }, d.clearance)) {
    return { result: 'accepted', text: T('{g} pensou e topou o feat em "{t}"!', '{g} thought it over and agreed to feature on "{t}"!', { g: names, t: d.title }) };
  }
  return { result: 'rejected', text: T('{g} pensou e preferiu não participar de "{t}".', '{g} thought it over and passed on "{t}".', { g: names, t: d.title }) };
};
FEAT29.payee = (s, d) => homeAct29(s, d.guestPersons?.[0] ?? '');

// apelo do lançamento (creation/core): fama própria, peso decrescente, crossover se a banda é de outra família
FEATP29_CORE.appeal = (s: GameState, pids: string[], fam: FamilyId): number => {
  let sum = 0;
  let cross = 0;
  pids.slice(0, FEAT_MAX_P29).forEach((pid, i) => {
    sum += personFame(s, pid).v * (W29[i] ?? 0.3);
    const A = homeAct29(s, pid);
    if (A && familyOf(A.genre) !== fam) cross = 0.04;
  });
  return 1 + Math.min(0.2, sum / 330) + cross;
};

/** Público cruzado de uma pessoa: os fãs da banda DELA (em escala menor que o feat da banda inteira). */
export function crossPerson29(s: GameState, host: Act, pid: string, w = 1): void {
  const pf = personFame(s, pid).v;
  const k = clamp(0.25 + pf / 250, 0.25, 0.6) * w;
  const A = homeAct29(s, pid);
  if (A && A.id !== host.id) {
    const fromB = Math.round((A.fans.casual * 0.03 + A.fans.active * 0.01) * k);
    const fromA = Math.round((host.fans.casual * 0.03 + host.fans.active * 0.01) * k * 0.5);
    host.fans.casual += fromB;
    A.fans.casual += fromA;
    A.momentum = clamp(A.momentum + 1.5 * k, 0, 100);
  }
  host.momentum = clamp(host.momentum + 3 * k, 0, 100);
  if (pf > host.fame) host.fame = clamp(host.fame + Math.min(2, (pf - host.fame) / 25) * k, 0, 100);
  const hl = leadOf(host);
  if (hl) bump(s, hl, pid, 8, 'feat', 'collab');
}

// lançamento com pessoa(s) convidada(s): os públicos se cruzam pela pessoa (o ato misto já cruzou no gancho do feats8)
registerSimHook('launch', 'featp29', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel) return;
  for (const id of rel.songs) {
    const sx = s.x4.creation.songs[id] as { featPersons?: string[]; ftp?: 1 } | undefined; // só lê: não cria registro
    const ps = sx?.featPersons;
    if (!sx || !ps?.length) continue;
    if (sx.ftp) continue;
    sx.ftp = 1;
    const host = s.acts[rel.actId];
    if (!host) continue;
    ps.slice(0, FEAT_MAX_P29).forEach((pid, i) => { if (s.persons[pid]) crossPerson29(s, host, pid, W29[i] ?? 0.3); });
  }
});

// ---------------------------------------------------------------- busca (o seletor "pessoa específica")

export interface FeatPick29 { pid: string; name: string; role: Person['role']; fame: number; block: L | null }
/** actId '' = sem banda agora; 'solo' = artistas solo (o ato tem uma pessoa só) */
export interface FeatPickGroup29 { actId: string; name: string; rows: FeatPick29[] }
const norm29 = (x: string): string => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Busca enquanto digita: pessoas com papel musical, pelo nome dela ou da banda. Resultado limitado (`limit`), agrupado
 * pelo ato de casa (avulsos num grupo próprio); quem não pode aparece com o motivo, depois dos disponíveis.
 * Sem texto: as pessoas disponíveis mais famosas.
 */
export function searchFeatPersons29(s: GameState, hostId: string, q: string, limit = 24): FeatPickGroup29[] {
  const nq = norm29(q.trim());
  const rows: (FeatPick29 & { act?: Act; pre: number })[] = [];
  for (const p of Object.values(s.persons)) {
    if (p.isPlayer) continue;
    const acts = actsOfPerson17(s, p.id);
    let pre = 0;
    if (nq) {
      const n = norm29(p.name);
      if (n.startsWith(nq) || n.includes(` ${nq}`)) pre = 2;
      else if (n.includes(nq)) pre = 1;
      else if (acts.some((a) => norm29(a.name).includes(nq))) pre = 1;
      else continue;
    } else if (!p.alive || !acts.some((a) => LIVE(a) && a.fame >= 15 && !mine(a))) continue;
    const block = featPersonBlock29(s, p.id, hostId);
    if (!nq && block) continue;
    rows.push({ pid: p.id, name: p.name, role: p.role, fame: personFame(s, p.id).v, block, act: homeAct29(s, p.id) ?? acts[acts.length - 1], pre });
  }
  rows.sort((a, b) => (a.block ? 1 : 0) - (b.block ? 1 : 0) || b.pre - a.pre || b.fame - a.fame || (a.pid < b.pid ? -1 : 1));
  const groups: FeatPickGroup29[] = [];
  for (const x of rows.slice(0, limit)) {
    const solo = !!x.act && x.act.members.length <= 1;
    const key = solo ? 'solo' : x.act?.id ?? '';
    let gr = groups.find((y) => y.actId === key);
    if (!gr) groups.push((gr = { actId: key, name: solo ? '' : x.act?.name ?? '', rows: [] }));
    gr.rows.push({ pid: x.pid, name: x.name, role: x.role, fame: x.fame, block: x.block });
  }
  return groups;
}
