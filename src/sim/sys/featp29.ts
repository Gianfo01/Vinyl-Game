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
import { composeSongs, songQ, unreleasedRecorded } from '../production';
import { launchNpcRelease } from '../market';
import type { Act, GameState, Person, Song } from '../types';
import { fmtL, nextId, playerActs, post, remember } from '../util';
import { actsNow27 } from '../tickcache27';
import { actsOfPerson17 } from '../actidx17';
import { cashWhy20, freeCash20 } from '../oblig20';
import { FEATP29_CORE, featureFee, songX } from './creation/core';
import { f15, personFame } from './fame15';
import { admiration, bondsOfPerson } from './bonds9';
import { MSG_HANDLERS } from './people/inbox';
import { addMsg, P } from './people/state';
import { FEAT29, acceptNpcInvite, clearance, fairFeat, featChance, feats, hasFeat29, linkActs, pushDeal, type FeatDeal, type FeatResult, type FeatTerms } from './feats8';
import { l16 } from './lineup16';
import { ownerBonus } from './people/owner';
import { actBond, bump, tieOf } from './social8';
import { hasSinger, settleVocals, sings } from './vocals10';

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

/** Músico(a) de estúdio (session19) com pessoa no banco: está em atividade mesmo sem banda. Só lê. */
const aceOf29 = (s: GameState, pid: string): boolean => !!(s.x4 as unknown as { ses19?: { aces: { pid?: string }[] } }).ses19?.aces.some((a) => a.pid === pid);

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
  if (!A && !l16(s).free[pid] && !aceOf29(s, pid)) return l('Fora de atividade agora (sem banda nem carreira em andamento).', 'Not active right now (no band or ongoing career).');
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
export function crossPerson29(s: GameState, host: Act, pid: string, w = 1, toGuest = false): void {
  const pf = personFame(s, pid).v;
  const k = clamp(0.25 + pf / 250, 0.25, 0.6) * w;
  const A = homeAct29(s, pid);
  if (A && A.id !== host.id) {
    // toGuest (convite de fora a uma pessoa sua): quem ganha mais é a banda da pessoa convidada
    const fromB = Math.round((A.fans.casual * 0.03 + A.fans.active * 0.01) * k * (toGuest ? 0.5 : 1));
    const fromA = Math.round((host.fans.casual * 0.03 + host.fans.active * 0.01) * k * (toGuest ? 1 : 0.5));
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

// ================================================================ R29 (feat de pessoa, parte B)
// 1) O mundo também convida PESSOAS: atos NPC creditam um convidado pessoa (integrante de outra banda, solo, músico de
//    estúdio, produtor que toca) numa faixa gravada que vai sair — mesmos dados (featPersons), crédito e efeitos.
//    Frequência pela época (mais comum do fim dos anos 1990 em diante) e pelo gênero (hip-hop e pop mais, folk menos);
//    pares plausíveis: mesma cena/cidade, mesma família de gênero, laços e admiração (social8/bonds9), mesmo selo, fama
//    parecida (famoso chama famoso). Gente SUA não é escalada à revelia: vira convite na caixa de entrada (2).
// 2) Convite de fora a uma pessoa sua ("X quer a voz de {vocalista}"): aceitar = o feat de pessoa (cachê e royalties
//    para você, efeitos na pessoa e reação da banda); "propor a banda inteira" = o convite de ato de sempre (feats8);
//    recusar. Os convites ao ato inteiro (feats8) continuam.
// 3) Convite rápido de pessoa(s): o caminho sem negociação do mesmo feat — preço de tabela (fama + habilidade do papel)
//    + liberação; os mesmos bloqueios.
// Sorteio próprio em tudo (feats8p29|npc…, |ib…, |q…).

export const FEATP29_NPC_RNG = 'feats8p29npc';
/** Feats de pessoa por mês no mundo (esperado), pela época. */
export const npcFeatRate29 = (year: number): number => (year < 1960 ? 0.15 : year < 1975 ? 0.3 : year < 1990 ? 0.55 : year < 1998 ? 0.9 : 2);
/** Afinidade do gênero do anfitrião com feats de pessoa (hip-hop e pop chamam mais; folk e sacro, menos). */
export const FAM_W29: Partial<Record<FamilyId, number>> = { hiphop: 2.6, pop: 1.8, rnb: 1.5, electronic: 1.3, latin: 1.3, caribbean: 1.2, brazil: 1.1, rock: 0.8, blues_jazz: 0.8, country_folk: 0.4, sacred: 0.3 };
const famW29 = (a: Act): number => FAM_W29[familyOf(a.genre)] ?? 1;

export interface NpcPf29 { s: string; h: string; p: string[]; y: number; w: number; d?: 1; city?: 1; fam?: 1; tie?: 1; lb?: 1 }
const npcLog29 = (s: GameState): NpcPf29[] => ((feats(s) as { np29?: NpcPf29[] }).np29 ??= []);
/** Totais dos feats de pessoa do mundo (o registro detalhado guarda só os 120 últimos): pares plausíveis em números. */
export interface NpcPfStats29 { n: number; city: number; fam: number; tie: number; lb: number; multi: number; mine: number; byDec: Record<string, number> }
export function npcStats29(s: GameState): NpcPfStats29 {
  const x = feats(s) as { ns29?: NpcPfStats29 };
  return (x.ns29 ??= { n: 0, city: 0, fam: 0, tie: 0, lb: 0, multi: 0, mine: 0, byDec: {} });
}

function wpick29<T>(r: Rng, xs: T[], w: (x: T) => number): T | undefined {
  const ws = xs.map((x) => Math.max(0, w(x)));
  const tot = ws.reduce((t, x) => t + x, 0);
  if (!(tot > 0)) return undefined;
  let u = r.next() * tot;
  for (let i = 0; i < xs.length; i++) { u -= ws[i]; if (u <= 0) return xs[i]; }
  return xs[xs.length - 1];
}

/** Faixas gravadas e inéditas do ato que podem levar convidado (single à vista: nada de álbum em montagem). */
function npcReady29(s: GameState, a: Act): Song[] {
  const xs = unreleasedRecorded(s, a);
  return xs.length >= 1 && xs.length <= 7 ? xs.filter((so) => !s.x4.creation.songs[so.id]?.featuring && !s.x4.creation.songs[so.id]?.featPersons?.length) : [];
}

export interface PairWhy29 { pid: string; v: number; city: boolean; fam: boolean; tie: boolean; lb: boolean; mineP: boolean }
/** Plausibilidade de `pid` como convidado do anfitrião NPC (maior = mais provável). */
export function pairScore29(s: GameState, H: Act, pid: string, deep = true): PairWhy29 | null {
  const p = s.persons[pid];
  if (!p || !p.alive || p.isPlayer || H.members.includes(pid) || s.year - p.born < 16) return null;
  if (p.role === 'producer' && !sings(s, p) && p.skills.instr < 45) return null;
  const A = homeAct29(s, pid);
  const pf = personFame(s, pid).v;
  const hl = leadOf(H);
  const city = !!A && A.city === H.city;
  const fam = !!A && familyOf(A.genre) === familyOf(H.genre);
  const lb = !!A && !!A.owner && A.owner === H.owner;
  const tv = hl ? tieOf(s, hl, pid)?.v ?? 0 : 0;
  // `deep` = laços de projeto (bonds9) e admiração pelo anfitrião — mais caros: só para os finalistas
  const bond = deep && !!hl && bondsOfPerson(s, pid).some((b) => !b.end && b.p.includes(hl));
  const adm = deep ? admiration(s, pid, H.id) : 0;
  const tie = tv >= 20 || bond || adm >= 40;
  let v = pf / 30 - Math.abs(pf - H.fame) / 35;
  v += (fam ? 1.2 : 0) + (city ? 0.8 : 0) + (lb ? 0.5 : 0) + clamp(tv, -60, 80) / 40 + (bond ? 1 : 0) + clamp(adm, -50, 80) / 60;
  v += sings(s, p) ? (hasSinger(s, H) ? 0.3 : 1.5) : featSkill29(s, p) >= 60 ? 0.2 : -0.5;
  if (A && A.status === 'hiatus') v -= 0.3;
  return { pid, v, city, fam, tie, lb, mineP: !!A && mine(A) };
}

/** Candidatos a convidado de H: integrantes de atos vivos, avulsos (lineup16) e músicos de estúdio (session19). */
function guestPool29(s: GameState, H: Act): string[] {
  const out = new Set<string>();
  for (const a of actsNow27(s)) {
    if (a === H || !LIVE(a) || a.fame < 8 || !a.members.length) continue;
    for (const m of a.members.slice(0, 6)) out.add(m);
  }
  for (const pid of Object.keys(l16(s).free)) out.add(pid);
  for (const x of (s.x4 as unknown as { ses19?: { aces: { pid?: string }[] } }).ses19?.aces ?? []) if (x.pid) out.add(x.pid);
  return [...out];
}

/** Escolhe o(s) convidado(s) de H: sorteio ponderado (exp do escore) entre os 10 mais plausíveis. */
export function pickNpcGuest29(s: GameState, r: Rng, H: Act): PairWhy29 | undefined {
  const pre = guestPool29(s, H).map((pid) => pairScore29(s, H, pid, false)).filter((x): x is PairWhy29 => !!x && !blockedNpc29(s, x.pid));
  pre.sort((a, b) => b.v - a.v || (a.pid < b.pid ? -1 : 1));
  const xs = pre.slice(0, 40).map((x) => pairScore29(s, H, x.pid)!).filter(Boolean);
  xs.sort((a, b) => b.v - a.v || (a.pid < b.pid ? -1 : 1));
  const top = xs.slice(0, 10);
  const m = top[0]?.v ?? 0;
  return wpick29(r, top, (x) => Math.exp(x.v - m));
}
/** Bloqueio para o mundo (sem as regras do jogador): só quem está em atividade. */
function blockedNpc29(s: GameState, pid: string): boolean {
  const A = homeAct29(s, pid);
  return !A && !l16(s).free[pid] && !aceOf29(s, pid);
}

/** Credita a pessoa numa faixa de um ato NPC (cachê sai do anfitrião; sem dinheiro do jogador). */
export function attachNpcFeat29(s: GameState, H: Act, songId: string, pids: string[], why?: PairWhy29): boolean {
  const song = s.songs[songId];
  if (!song || song.releaseId || mine(H) || hasFeat29(s, songId) || !pids.length || pids.some((p) => !s.persons[p]?.alive)) return false;
  const g: FeatGuest29 = { persons: [...new Set(pids)].slice(0, FEAT_MAX_P29) };
  const names = guestNames29(s, g);
  const base = song.title;
  songX(s, songId).featPersons = [...g.persons];
  song.title = `${base} (feat. ${names})`;
  let gain = 0;
  g.persons.forEach((pid, i) => { gain += (W29[i] ?? 0.3) * (2 + personFame(s, pid).v / 30 + clamp((featSkill29(s, s.persons[pid]) - 50) / 12, -2, 4)); });
  song.performance = clamp(song.performance + Math.min(12, gain), 0, 100);
  settleVocals(s, song);
  song.q = songQ(song);
  const hl = leadOf(H);
  for (const pid of g.persons) {
    const fee = featureFee(s, { fame: personFame(s, pid).v } as Act);
    H.cash -= fee;
    const A = homeAct29(s, pid);
    if (A) A.cash += fee;
    if (hl) bump(s, hl, pid, 18, 'feat', 'collab');
    bandReact29(s, pid, H);
  }
  H.feats += 1;
  const log = npcLog29(s);
  log.push({ s: songId, h: H.id, p: [...g.persons], y: s.year, w: s.week, ...(why?.city ? { city: 1 as const } : {}), ...(why?.fam ? { fam: 1 as const } : {}), ...(why?.tie ? { tie: 1 as const } : {}), ...(why?.lb ? { lb: 1 as const } : {}) });
  if (log.length > 120) log.splice(0, log.length - 120);
  const st = npcStats29(s);
  st.n += 1; st.city += why?.city ? 1 : 0; st.fam += why?.fam ? 1 : 0; st.tie += why?.tie ? 1 : 0; st.lb += why?.lb ? 1 : 0; st.multi += g.persons.length > 1 ? 1 : 0;
  const dec = `${Math.floor(s.year / 10) * 10}`;
  st.byDec[dec] = (st.byDec[dec] ?? 0) + 1;
  const fs = feats(s);
  fs.npc.push({ y: s.year, a: H.name, b: names });
  if (fs.npc.length > 30) fs.npc.shift();
  const top = Math.max(...g.persons.map((x) => personFame(s, x).v));
  remember(s, 'feature', T('{g} grava participação em "{t}", de {h}.', '{g} records a feature on "{t}" by {h}.', { g: names, t: base, h: H.name }), { actId: H.id, pid: g.persons[0], important: top > 60 && H.fame > 50 });
  return true;
}

/** O mês do mundo: feats de pessoa em faixas NPC (e convites a gente sua na caixa de entrada). */
export function npcPersonFeatsMonth29(s: GameState): void {
  const r = Rng.fromSeed(`${s.config.seed}|${FEATP29_NPC_RNG}|${s.year}|${s.month}`);
  // 1) lançadas desde o mês passado: os públicos se cruzam pela pessoa
  const log = npcLog29(s);
  for (const x of log) {
    if (x.d) continue;
    const so = s.songs[x.s];
    const H = s.acts[x.h];
    if (!so || !H) { x.d = 1; continue; }
    if (!so.releaseId) continue;
    x.d = 1;
    // LP: o título do álbum é o da 1ª faixa — o crédito fica na faixa, não no nome do disco
    const rel = s.releases[so.releaseId];
    if (rel && rel.type !== 'single') rel.title = rel.title.replace(/ \(feat\. [^)]*\)/, '');
    const sx = s.x4.creation.songs[x.s] as { ftp?: 1 } | undefined;
    if (sx?.ftp) continue;
    if (sx) sx.ftp = 1;
    x.p.forEach((pid, i) => { if (s.persons[pid]) crossPerson29(s, H, pid, W29[i] ?? 0.3); });
  }
  // 2) novos feats
  const rate = npcFeatRate29(s.year);
  const n = Math.floor(rate) + (r.chance(rate - Math.floor(rate)) ? 1 : 0);
  if (!n) return;
  const hosts = actsNow27(s).filter((a) => (a.status === 'active' || a.status === 'emerging') && !mine(a) && a.fame >= 15 && a.members.length > 0 && npcReady29(s, a).length > 0);
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const H = wpick29(r, hosts.filter((a) => !used.has(a.id)), (a) => Math.pow(a.fame / 40, 1.3) * famW29(a));
    if (!H) break;
    used.add(H.id);
    const g = pickNpcGuest29(s, r, H);
    if (!g) continue;
    if (g.mineP) { if (npcPersonInvite29(s, r, g.pid, H.id)) npcStats29(s).mine += 1; continue; } // gente sua: convite, nunca escalada à revelia
    const pids = [g.pid];
    // de vez em quando (era digital, hip-hop/pop) mais uma voz
    if (s.year >= 1998 && famW29(H) >= 1.5 && r.chance(0.12)) { const g2 = pickNpcGuest29(s, r, H); if (g2 && !g2.mineP && g2.pid !== g.pid) pids.push(g2.pid); }
    const song = npcReady29(s, H)[0]; // a 1ª da fila: abre o LP (as outras faixas de LP NPC não ficam guardadas) e, reforçada, puxa o single
    if (song) attachNpcFeat29(s, H, song.id, pids, g);
  }
}

registerSimHook('month', 'featp29', (s) => npcPersonFeatsMonth29(s));

// ---------------------------------------------------------------- 2) convite de fora a uma pessoa sua

/** Um artista de fora convida uma PESSOA do seu elenco (não o ato inteiro). */
export function npcPersonInvite29(s: GameState, r: Rng, pid: string, hostId?: string): boolean {
  const p = s.persons[pid];
  const A = homeAct29(s, pid);
  if (!p?.alive || p.isPlayer || !A || !mine(A)) return false;
  const inbox = P(s).inbox;
  if (inbox.some((m) => m.ref?.sys === 'featp29' && m.ref?.pid === pid && !m.resolved)) return false;
  let H = hostId ? s.acts[hostId] : undefined;
  const pf = personFame(s, pid).v;
  if (!H) {
    const cands = actsNow27(s).filter((a) => (a.status === 'active' || a.status === 'emerging') && !mine(a) && a.members.length && a.fame >= Math.max(10, pf - 20))
      .map((a) => ({ a, v: (pairScore29(s, a, pid)?.v ?? -9) + a.fame / 60 })).sort((x, y) => y.v - x.v || (x.a.id < y.a.id ? -1 : 1)).slice(0, 8);
    H = cands.length ? r.pick(cands).a : undefined;
  }
  if (!H || mine(H)) return false;
  const fair = fairFeat29(s, H.id, { persons: [pid] });
  const fee = Math.round(fair.fee * (0.7 + r.next() * 0.5));
  const split = round2(fair.split * (0.8 + r.next() * 0.4));
  const usd = `$${Math.round(fee / 100).toLocaleString('en-US')}`;
  const what = sings(s, p) ? T('a voz de {p}', '{p}\'s voice', { p: p.name }) : T('{p} na faixa', '{p} on the track', { p: p.name });
  addMsg(s, {
    from: H.name, kind: 'deal', tone: 'good', expires: s.week + 6,
    subject: T('Convite para feat: {h} quer {w}', 'Feature invite: {h} wants {w}', { h: H.name, w: what }),
    body: T('{h} quer {w} (de {a}) numa faixa nova — só a pessoa, sem o resto da banda. Cachê {f} e {pc}% dos royalties da faixa. Os colegas de {a} vão reparar.',
      '{h} wants {w} (from {a}) on a new track — just the person, not the rest of the band. Fee {f} and {pc}% of the track royalties. {a}\'s bandmates will notice.',
      { h: H.name, w: what, a: A.name, f: usd, pc: Math.round(split * 100) }),
    ref: { sys: 'featp29', host: H.id, guest: A.id, pid, fee, split },
    actions: [
      { id: 'accept', label: T('Aceitar (só {p})', 'Accept (just {p})', { p: p.name }) },
      { id: 'band', label: T('Propor a banda inteira ({a})', 'Offer the whole band ({a})', { a: A.name }) },
      { id: 'decline', label: l('Recusar', 'Decline') },
    ],
  });
  return true;
}

/** Fecha o convite de fora a uma pessoa sua: o anfitrião grava e lança; você recebe o cachê e a parte combinada. */
export function acceptPersonInvite29(s: GameState, r: Rng, hostId: string, pid: string, fee: number, split: number): FeatDeal | null {
  const H = s.acts[hostId];
  const p = s.persons[pid];
  const A = homeAct29(s, pid);
  if (!H || mine(H) || !p?.alive || !A || !mine(A) || H.status === 'retired' || H.status === 'split') return null;
  const song = composeSongs(s, r, H, 1)[0];
  if (!song) return null;
  const base = song.title;
  const pf = personFame(s, pid).v;
  song.recorded = true;
  song.performance = clamp(45 + H.fame / 2 + pf / 8 + clamp((featSkill29(s, p) - 50) / 6, -4, 8) + r.normal(0, 6), 5, 100);
  song.production = clamp(55 + r.normal(0, 8), 5, 100);
  const sx = songX(s, song.id) as { featPersons?: string[]; ftp?: 1 };
  sx.featPersons = [pid];
  sx.ftp = 1; // o público cruza aqui embaixo (lançamento NPC não passa pelo gancho de lançamento)
  settleVocals(s, song);
  song.q = songQ(song);
  song.title = `${base} (feat. ${p.name})`;
  if (fee > 0) post(s, `featpin:${song.id}`, fee, 'royalties', `Cachê de participação: ${p.name} com ${H.name}`);
  H.cash -= fee;
  const rel = launchNpcRelease(s, r, H, H.owner ?? 'indie', [song.id], 'single', 2500 + H.fame * 60);
  const deal: FeatDeal = { id: nextId(s, 'fd'), songId: song.id, title: base, hostActId: H.id, guestActId: '', guestPersons: [pid], fee, split, clearance: 0, side: 'guest', status: 'done', lastRev: rel.revenue, paid: 0, week: s.week, migrated: 1 };
  pushDeal(s, deal);
  H.feats += 1;
  crossPerson29(s, H, pid, 1, true);
  // a pessoa aparece: saldo pessoal de fama (fame15) pela fama de quem chamou
  const po = f15(s).po;
  po[pid] = clamp((po[pid] ?? 0) + Math.min(3, H.fame / 25), -40, 40);
  const hl = leadOf(H);
  if (hl) bump(s, hl, pid, 20, 'feat', 'collab');
  bandReact29(s, pid, H);
  remember(s, 'feature', T('{p} (de {a}) participa de "{t}", single de {h}.', '{p} (from {a}) features on "{t}", a single by {h}.', { p: p.name, a: A.name, t: base, h: H.name }), { actId: A.id, pid, important: H.fame > 50 });
  return deal;
}

MSG_HANDLERS.featp29 = (s, m, action) => {
  const ref = m.ref ?? {};
  const H = s.acts[String(ref.host)];
  const pid = String(ref.pid);
  const p = s.persons[pid];
  const A = homeAct29(s, pid);
  if (!H || !p) return l('O convite perdeu a validade.', 'The invite is no longer valid.');
  const r = rngFeat29(s, `ib:${m.id}:${action}`);
  if (action === 'accept') {
    const d = acceptPersonInvite29(s, r, H.id, pid, Number(ref.fee), Number(ref.split));
    return d ? T('Fechado: {p} grava com {h}. O single sai já.', 'Deal: {p} records with {h}. The single is out now.', { p: p.name, h: H.name }) : l('Não deu certo desta vez (a pessoa não está mais disponível).', 'It did not work out this time (the person is no longer available).');
  }
  if (action === 'band') {
    if (!A || !mine(A)) return l('A banda não está mais no seu elenco.', 'The band is no longer on your roster.');
    // o anfitrião queria a pessoa: topa a banda inteira se ela for maior que a pessoa (ou se forem amigos)
    const want = clamp(0.35 + (A.fame - personFame(s, pid).v) / 60 + actBond(s, H, A).v / 100, 0.1, 0.85);
    if (r.chance(want)) {
      const fee = Math.max(Number(ref.fee), Math.round(fairFeat(s, H.id, A.id).fee * 0.9));
      const d = acceptNpcInvite(s, r, H.id, A.id, fee, Number(ref.split));
      return d ? T('{h} topou a banda inteira: {a} grava o feat por {f}.', '{h} agreed to the whole band: {a} records the feature for {f}.', { h: H.name, a: A.name, f: `$${Math.round(fee / 100).toLocaleString('en-US')}` }) : l('Não deu certo desta vez.', 'It did not work out this time.');
    }
    linkActs(s, H, A, -2);
    return T('{h} queria só {p} e desistiu.', '{h} only wanted {p} and backed out.', { h: H.name, p: p.name });
  }
  const hl = leadOf(H);
  if (hl) bump(s, hl, pid, -3, 'feat');
  return T('Você recusou o convite de {h} para {p}.', 'You declined {h}\'s invite for {p}.', { h: H.name, p: p.name });
};

/** Convites de fora a pessoas suas: chance mensal por ato seu (a voz primeiro). Sorteio próprio. */
function personInvitesMonth29(s: GameState): void {
  const r = Rng.fromSeed(`${s.config.seed}|${FEATP29_RNG}|ibm|${s.year}|${s.month}`);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split' || a.members.length < 2) continue;
    if (!r.chance(0.015 + a.fame / 1500 + (s.year >= 1998 ? 0.01 : 0))) continue;
    const ps = a.members.filter((m) => s.persons[m]?.alive && !s.persons[m].isPlayer)
      .sort((x, y) => Number(sings(s, s.persons[y])) - Number(sings(s, s.persons[x])) || personFame(s, y).v - personFame(s, x).v);
    if (ps[0]) npcPersonInvite29(s, r, ps[0]);
  }
}
registerSimHook('month', 'featp29-inbox', (s) => personInvitesMonth29(s));

// ---------------------------------------------------------------- 3) convite rápido de pessoa(s): preço de tabela

/** Preço de tabela do convite rápido: o cachê justo (fama + habilidade do papel) + a liberação dos selos. */
export function quickPrice29(s: GameState, songId: string, g0: FeatGuest29): { fee: number; clearance: number; total: number; block: L | null } {
  const g = normGuest29(g0);
  const song = s.songs[songId];
  const block = invalid29(s, songId, g);
  if (!song) return { fee: 0, clearance: 0, total: 0, block: block ?? l('Música inexistente.', 'Unknown song.') };
  const fee = fairFeat29(s, song.actId, g).fee;
  const cl = clearance29(s, song.actId, g, fee);
  const total = fee + cl.cost;
  return { fee, clearance: cl.cost, total, block: block ?? (cl.blocked ? cl.text : freeCash20(s) < total ? cashWhy20(s, total, l('Caixa insuficiente.', 'Not enough cash.')) : null) };
}

/** Chance do convite rápido (a fórmula do convite rápido do ato, com a fama de cada pessoa; decide o mais difícil). */
export function quickChance29(s: GameState, songId: string, g0: FeatGuest29): number {
  const g = normGuest29(g0);
  const song = s.songs[songId];
  const host = song ? s.acts[song.actId] : undefined;
  if (!song || !host) return 0;
  const one = (fame: number, A?: Act) => {
    const lb = A?.owner && A.owner !== 'player' ? s.labels[A.owner] : undefined;
    const rv = lb ? s.rivalries[lb.id] ?? 0 : 0;
    return clamp(0.35 + host.fame / 150 - fame / 250 - rv / 200 + (song.q - 50) / 150, 0.05, 0.9);
  };
  let p = 1;
  if (g.act && s.acts[g.act]) p = Math.min(p, one(s.acts[g.act].fame, s.acts[g.act]));
  for (const pid of g.persons) p = Math.min(p, one(personFame(s, pid).v, homeAct29(s, pid)));
  return clamp(p * (1 - 0.04 * (g.persons.length + (g.act ? 1 : 0) - 1)), 0.05, 0.9);
}

/** Convite rápido de pessoa(s): sem negociação, preço de tabela, resposta na hora (sorteio próprio). */
export function quickFeat29(s: GameState, songId: string, g0: FeatGuest29): { ok: boolean; text: L } {
  const g = normGuest29(g0);
  const pr = quickPrice29(s, songId, g);
  if (pr.block) return { ok: false, text: pr.block };
  const song = s.songs[songId];
  const names = guestNames29(s, g);
  const p = quickChance29(s, songId, g);
  const r = rngFeat29(s, `q:${songId}`);
  if (!r.chance(p)) {
    s.x4.creation.features.push({ id: nextId(s, 'ft'), songId, guestActId: g.act ?? '', guestPersons: [...g.persons], fee: pr.fee, share: 0, status: 'refused', week: s.week });
    if (s.x4.creation.features.length > 40) s.x4.creation.features.splice(0, s.x4.creation.features.length - 40);
    for (const pid of g.persons) feats(s).asked[`p:${pid}`] = s.week;
    return { ok: false, text: T('{g} (ou o selo) recusou o convite.', '{g} (or their label) turned the invite down.', { g: names }) };
  }
  const d = closeFeat29(s, songId, g, { fee: pr.fee, split: 0 }, pr.clearance);
  if (!d) return { ok: false, text: l('A música não está mais disponível.', 'The song is no longer available.') };
  return { ok: true, text: T('{g} topou! Participação gravada em "{t}".', '{g} said yes! Feature recorded on "{t}".', { g: names, t: d.title || song.title }) };
}
FEATP29_CORE.quick = (s, songId, persons, act) => quickFeat29(s, songId, act ? { act, persons } : { persons }).text;
