// Feats negociados (rodada 8): o jogador convida qualquer artista do jogo para participar de uma música
// inédita de um ato seu — cachê, divisão dos royalties da faixa e liberação do selo do convidado — com
// resposta na hora (aceita, contraproposta, recusa ou "preciso pensar"). Relações entre os artistas e a
// diferença de fama pesam. Artistas de fora também convidam os seus atos (caixa de entrada: aceitar,
// pedir mais ou recusar). Feats cruzam públicos (fãs migram), ajudam nas paradas e aproximam as pessoas.
// Reaproveita o sistema de participações da criação (songX().featuring, lista de features, apelo).

import { clamp, type Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { launchNpcRelease } from '../market';
import { composeSongs, songQ } from '../production';
import { settleVocals } from './vocals10';
import { songStatus } from '../repertoire';
import type { Act, GameState, Song } from '../types';
import { fmtL, nextId, notify, playerActs, post, remember } from '../util';
import { featureFee, songX } from './creation/core';
import { MSG_HANDLERS } from './people/inbox';
import { addMsg, P } from './people/state';
import { ownerBonus } from './people/owner';
import { actBond, actOfPerson, bump } from './social8';
import { stakeOf } from './stakes8';

export interface FeatTerms { fee: number; split: number }
export interface FeatDeal {
  id: string;
  songId: string;
  title: string;
  hostActId: string;
  guestActId: string;
  fee: number;
  /** parte dos royalties da faixa que vai para o convidado (0..0,5) */
  split: number;
  clearance: number;
  /** lado do jogador */
  side: 'host' | 'guest';
  status: 'done' | 'thinking' | 'counter';
  thinkUntil?: number;
  counter?: FeatTerms;
  lastRev: number;
  paid: number;
  week: number;
  migrated?: 1;
}
export interface FeatState { deals: FeatDeal[]; npc: { y: number; a: string; b: string }[]; asked: Record<string, number> }

declare module '../ext4' { interface Ext4 { feats8: FeatState } }
registerExt4('feats8', () => ({ deals: [], npc: [], asked: {} }));
export const feats = (s: GameState): FeatState => {
  const x = s.x4 as unknown as { feats8?: FeatState };
  x.feats8 ??= { deals: [], npc: [], asked: {} };
  return x.feats8;
};

const isMine = (s: GameState, a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);

/** Músicas inéditas de um ato do jogador que podem receber convidado. */
export function featSongs(s: GameState, actId: string): Song[] {
  const act = s.acts[actId];
  if (!act) return [];
  return act.songs.map((id) => s.songs[id]).filter((so): so is Song => !!so && !so.releaseId && !songX(s, so.id).featuring && ['written', 'recorded', 'vault'].includes(songStatus(s, so)));
}

/** Convidados possíveis: qualquer ato vivo e em atividade fora do seu selo (amigos primeiro). */
export function featTargets(s: GameState, hostId: string, limit = 40): Act[] {
  const host = s.acts[hostId];
  if (!host) return [];
  return Object.values(s.acts)
    .filter((a) => a.id !== hostId && !isMine(s, a) && (a.status === 'active' || a.status === 'emerging') && !a.deceased && a.members.length && a.fame > 3)
    .map((a) => ({ a, v: a.fame + actBond(s, host, a).v * 0.5 + (familyOf(a.genre) === familyOf(host.genre) ? 6 : 0) }))
    .sort((x, y) => y.v - x.v)
    .slice(0, limit)
    .map((x) => x.a);
}

/** Termos "justos" para o convidado. */
export function fairFeat(s: GameState, hostId: string, guestId: string): FeatTerms {
  const host = s.acts[hostId];
  const guest = s.acts[guestId];
  const gf = guest?.fame ?? 10;
  const hf = host?.fame ?? 10;
  return { fee: featureFee(s, guest ?? ({ fame: 10 } as Act)), split: Math.round(clamp(0.08 + gf / 300 - hf / 900, 0.05, 0.4) * 100) / 100 };
}

/** Liberação do selo do convidado: taxa (centavos) ou bloqueio. */
export function clearance(s: GameState, guestId: string, fee: number): { cost: number; blocked: boolean; text: L } {
  const g = s.acts[guestId];
  const lb = g?.owner && g.owner !== 'player' ? s.labels[g.owner] : undefined;
  if (!lb) return { cost: 0, blocked: false, text: l('Independente: não precisa de liberação.', 'Independent: no clearance needed.') };
  const st = stakeOf(s, lb.id);
  if (st >= 0.25) return { cost: 0, blocked: false, text: fmtL(l('Você tem {p}% de {lb}: liberação automática.', 'You own {p}% of {lb}: automatic clearance.'), { p: Math.round(st * 100), lb: lb.name }) };
  const rv = s.rivalries[lb.id] ?? 0;
  if (rv > 60) return { cost: 0, blocked: true, text: fmtL(l('{lb} não libera artistas para você (rivalidade).', '{lb} will not clear artists for you (rivalry).'), { lb: lb.name }) };
  return { cost: Math.round(fee * (0.15 + rv / 300)), blocked: false, text: fmtL(l('{lb} cobra uma taxa de liberação.', '{lb} charges a clearance fee.'), { lb: lb.name }) };
}

/** Quanto o convidado gosta da proposta (>0 tende a aceitar). */
function guestScore(s: GameState, songId: string, guestId: string, t0: FeatTerms): number {
  const song = s.songs[songId];
  const host = song ? s.acts[song.actId] : undefined;
  const guest = s.acts[guestId];
  if (!song || !host || !guest) return -9;
  const fair = fairFeat(s, host.id, guestId);
  const bond = actBond(s, host, guest).v;
  let want = (host.fame - guest.fame) / 55 + (song.q - 55) / 45 + bond / 70 + (familyOf(host.genre) === familyOf(guest.genre) ? 0.15 : -0.05);
  want += (s.player.reputation.artists - 50) / 200 + ownerBonus(s, 'negotiation') * 0.15;
  want -= (feats(s).asked[guestId] ?? 0) > s.week - 8 ? 0.25 : 0;
  const price = t0.fee / Math.max(1, fair.fee) - 1;
  const roy = t0.split / Math.max(0.01, fair.split) - 1;
  return want + clamp(price, -1, 2) * 0.7 + clamp(roy, -1, 2) * 0.5;
}

export function featChance(s: GameState, songId: string, guestId: string, t0: FeatTerms): number {
  return clamp(1 / (1 + Math.exp(-guestScore(s, songId, guestId, t0) * 2.6)), 0.02, 0.96);
}

export type FeatResult = 'accepted' | 'counter' | 'rejected' | 'thinking' | 'invalid';

/** Convite com resposta na hora. */
export function proposeFeat(s: GameState, r: Rng, songId: string, guestId: string, t0: FeatTerms): { result: FeatResult; deal?: FeatDeal; counter?: FeatTerms; text: L } {
  const song = s.songs[songId];
  const guest = s.acts[guestId];
  const host = song ? s.acts[song.actId] : undefined;
  if (!song || !guest || !host || !isMine(s, host) || isMine(s, guest)) return { result: 'invalid', text: l('Convite inválido.', 'Invalid invite.') };
  if (song.releaseId || songX(s, songId).featuring) return { result: 'invalid', text: l('Esta música já foi lançada ou já tem participação.', 'This song is already out or already has a feature.') };
  if (feats(s).deals.some((d) => d.songId === songId && d.status !== 'done')) return { result: 'invalid', text: l('Já há uma negociação aberta para esta música.', 'There is already an open negotiation for this song.') };
  t0 = { fee: Math.max(0, Math.round(t0.fee)), split: clamp(t0.split, 0, 0.5) };
  const cl = clearance(s, guestId, t0.fee);
  if (cl.blocked) return { result: 'rejected', text: cl.text };
  if (s.player.cash < t0.fee + cl.cost) return { result: 'invalid', text: l('Caixa insuficiente para cachê e liberação.', 'Not enough cash for fee and clearance.') };
  const p = featChance(s, songId, guestId, t0);
  feats(s).asked[guestId] = s.week;
  trimAsked(s);
  const roll = r.next();
  if (roll < p * 0.85) {
    const base = song.title;
    const deal = closeFeat(s, songId, guestId, t0, cl.cost) ?? undefined;
    return { result: 'accepted', deal, text: fmtL(l('{g} topou! Participação gravada em "{t}".', '{g} said yes! Feature recorded on "{t}".'), { g: guest.name, t: base }) };
  }
  if (roll < p) {
    const deal: FeatDeal = { id: nextId(s, 'fd'), songId, title: song.title, hostActId: host.id, guestActId: guestId, fee: t0.fee, split: t0.split, clearance: cl.cost, side: 'host', status: 'thinking', thinkUntil: s.week + r.int(1, 2), lastRev: 0, paid: 0, week: s.week };
    feats(s).deals.push(deal);
    return { result: 'thinking', deal, text: fmtL(l('{g} gostou, mas quer ouvir a faixa com calma. Resposta em até 2 semanas.', '{g} liked it but wants to listen properly. Answer within 2 weeks.'), { g: guest.name }) };
  }
  if (p > 0.18) {
    const fair = fairFeat(s, host.id, guestId);
    const counter: FeatTerms = { fee: Math.round(Math.max(t0.fee, (t0.fee + fair.fee * 1.25) / 2)), split: Math.round(Math.max(t0.split, (t0.split + fair.split * 1.2) / 2) * 100) / 100 };
    const deal: FeatDeal = { id: nextId(s, 'fd'), songId, title: song.title, hostActId: host.id, guestActId: guestId, fee: t0.fee, split: t0.split, clearance: cl.cost, side: 'host', status: 'counter', counter, lastRev: 0, paid: 0, week: s.week };
    feats(s).deals.push(deal);
    return { result: 'counter', deal, counter, text: fmtL(l('{g} topa por {f} e {p}% dos royalties da faixa.', '{g} is in for {f} and {p}% of the track royalties.'), { g: guest.name, f: `$${Math.round(counter.fee / 100).toLocaleString('en-US')}`, p: Math.round(counter.split * 100) }) };
  }
  // recusa pesa um pouco na relação
  const gp = guest.members[0];
  const hp = host.members[0];
  if (gp && hp && r.chance(0.3)) bump(s, hp, gp, -4, 'feat');
  const why = guest.fame > host.fame + 25 ? l('o seu artista ainda é pequeno para eles', 'your act is still too small for them') : song.q < 50 ? l('a música não convenceu', 'the song did not convince them') : l('os termos não agradaram', 'the terms did not appeal');
  return { result: 'rejected', text: fmtL(l('{g} recusou: {w}.', '{g} declined: {w}.'), { g: guest.name, w: why }) };
}

function trimAsked(s: GameState): void {
  const a = feats(s).asked;
  for (const k of Object.keys(a)) if (s.week - a[k] > 12) delete a[k];
}

export function acceptFeatCounter(s: GameState, dealId: string): L | null {
  const st = feats(s);
  const d = st.deals.find((x) => x.id === dealId && x.status === 'counter');
  if (!d?.counter) return l('Contraproposta expirada.', 'Counter-offer expired.');
  const cl = clearance(s, d.guestActId, d.counter.fee);
  if (s.player.cash < d.counter.fee + cl.cost) return l('Caixa insuficiente.', 'Not enough cash.');
  st.deals = st.deals.filter((x) => x !== d);
  if (!closeFeat(s, d.songId, d.guestActId, d.counter, cl.cost)) return l('A música não está mais disponível.', 'The song is no longer available.');
  return null;
}

export function dropFeatDeal(s: GameState, dealId: string): void {
  const st = feats(s);
  st.deals = st.deals.filter((x) => !(x.id === dealId && x.status !== 'done'));
}

/** Pressionar quem pediu tempo: responde já (com menos boa vontade). */
export function pressFeat(s: GameState, r: Rng, dealId: string): { result: FeatResult; text: L } {
  const st = feats(s);
  const d = st.deals.find((x) => x.id === dealId && x.status === 'thinking');
  if (!d) return { result: 'invalid', text: l('Nada pendente.', 'Nothing pending.') };
  return resolveThinkingFeat(s, r, d, -0.12);
}

function resolveThinkingFeat(s: GameState, r: Rng, d: FeatDeal, malus = 0): { result: FeatResult; text: L } {
  const st = feats(s);
  st.deals = st.deals.filter((x) => x !== d);
  const guest = s.acts[d.guestActId];
  const p = featChance(s, d.songId, d.guestActId, { fee: d.fee, split: d.split }) + 0.1 + malus;
  if (guest && r.chance(p) && s.player.cash >= d.fee + d.clearance && closeFeat(s, d.songId, d.guestActId, { fee: d.fee, split: d.split }, d.clearance)) {
    return { result: 'accepted', text: fmtL(l('{g} pensou e topou o feat em "{t}"!', '{g} thought it over and agreed to feature on "{t}"!'), { g: guest.name, t: d.title }) };
  }
  return { result: 'rejected', text: fmtL(l('{g} pensou e preferiu não participar de "{t}".', '{g} thought it over and passed on "{t}".'), { g: guest?.name ?? '?', t: d.title }) };
}

/** Fecha a participação: paga, grava o convidado, cria laço e registra. */
export function closeFeat(s: GameState, songId: string, guestId: string, t0: FeatTerms, clearanceCost: number): FeatDeal | null {
  const song = s.songs[songId];
  const guest = s.acts[guestId];
  const host = song ? s.acts[song.actId] : undefined;
  if (!song || !guest || !host || song.releaseId || songX(s, songId).featuring) return null;
  if (t0.fee > 0) post(s, `feat8:${songId}`, -t0.fee, 'recording', `Participação de ${guest.name}`);
  if (clearanceCost > 0) post(s, `featclr:${songId}`, -clearanceCost, 'legal', `Liberação de ${guest.name}`);
  guest.cash += t0.fee + clearanceCost;
  const lb = guest.owner && s.labels[guest.owner];
  if (lb && clearanceCost > 0) { lb.cash += clearanceCost; guest.cash -= clearanceCost; }
  const base = song.title;
  songX(s, songId).featuring = guestId;
  song.title = `${song.title} (feat. ${guest.name})`;
  song.performance = clamp(song.performance + 4 + guest.fame / 25, 0, 100);
  settleVocals(s, song); // rodada 10: o convidado que canta dá voz à faixa instrumental
  song.q = songQ(song);
  s.x4.creation.features.push({ id: nextId(s, 'ft'), songId, guestActId: guestId, fee: t0.fee, share: t0.split, status: 'done', week: s.week });
  if (s.x4.creation.features.length > 40) s.x4.creation.features.splice(0, s.x4.creation.features.length - 40);
  const deal: FeatDeal = { id: nextId(s, 'fd'), songId, title: base, hostActId: host.id, guestActId: guestId, fee: t0.fee, split: t0.split, clearance: clearanceCost, side: 'host', status: 'done', lastRev: 0, paid: 0, week: s.week };
  pushDeal(s, deal);
  host.feats += 1;
  guest.feats += 1;
  linkActs(s, host, guest, 22);
  remember(s, 'feature', fmtL(l('{g} grava participação em "{t}", de {h}.', '{g} records a feature on "{t}" by {h}.'), { g: guest.name, t: base, h: host.name }), { actId: host.id, important: guest.fame > 50 });
  return deal;
}

function pushDeal(s: GameState, d: FeatDeal): void {
  const st = feats(s);
  st.deals.push(d);
  // guarda as negociações abertas e as 40 parcerias mais recentes
  const done = st.deals.filter((x) => x.status === 'done');
  if (done.length > 40) {
    const drop = new Set(done.slice(0, done.length - 40));
    st.deals = st.deals.filter((x) => !drop.has(x));
  }
}

function linkActs(s: GameState, A: Act, B: Act, v: number): void {
  const a = A.leaderId && A.members.includes(A.leaderId) ? A.leaderId : A.members[0];
  const b = B.leaderId && B.members.includes(B.leaderId) ? B.leaderId : B.members[0];
  if (a && b) bump(s, a, b, v, 'feat', 'collab');
}

/** Público cruzado: parte dos fãs de cada lado conhece o outro. */
export function crossAudience(s: GameState, A: Act, B: Act, k = 1): void {
  const fromB = Math.round((B.fans.casual * 0.03 + B.fans.active * 0.01) * k);
  const fromA = Math.round((A.fans.casual * 0.03 + A.fans.active * 0.01) * k);
  A.fans.casual += fromB;
  B.fans.casual += fromA;
  A.momentum = clamp(A.momentum + 4 * k, 0, 100);
  B.momentum = clamp(B.momentum + 3 * k, 0, 100);
  if (B.fame > A.fame) A.fame = clamp(A.fame + Math.min(3, (B.fame - A.fame) / 20) * k, 0, 100);
}

// ---------------------------------------------------------------- convites de fora (caixa de entrada)

/** Um artista de fora convida um ato do jogador. */
export function npcInvite(s: GameState, r: Rng, guestId: string, hostId?: string): boolean {
  const guest = s.acts[guestId];
  if (!guest || !isMine(s, guest)) return false;
  let host = hostId ? s.acts[hostId] : undefined;
  if (!host) {
    const cands = featTargets(s, guest.id, 25).filter((a) => a.fame >= guest.fame - 20 && a.cash > 0);
    if (!cands.length) return false;
    host = r.pick(cands.slice(0, 10));
  }
  if (!host || isMine(s, host)) return false;
  if (P(s).inbox.some((m) => m.ref?.sys === 'feat8' && m.ref?.guest === guestId && !m.resolved)) return false;
  const fair = fairFeat(s, host.id, guest.id);
  const fee = Math.round(fair.fee * (0.7 + r.next() * 0.5));
  const split = Math.round(fair.split * (0.8 + r.next() * 0.4) * 100) / 100;
  const bond = actBond(s, host, guest).v;
  addMsg(s, {
    from: host.name, kind: 'deal', tone: 'good', expires: s.week + 6,
    subject: fmtL(l('Convite para feat: {h}', 'Feature invite: {h}'), { h: host.name }),
    body: fmtL(l('{h} quer {g} numa faixa nova. Cachê {f} e {p}% dos royalties da faixa.{b}', '{h} wants {g} on a new track. Fee {f} and {p}% of the track royalties.{b}'), {
      h: host.name, g: guest.name, f: `$${Math.round(fee / 100).toLocaleString('en-US')}`, p: Math.round(split * 100),
      b: bond > 30 ? l(' (são amigos)', ' (they are friends)') : bond < -20 ? l(' (o clima entre eles não é dos melhores)', ' (things between them are tense)') : '',
    }),
    ref: { sys: 'feat8', host: host.id, guest: guest.id, fee, split, asked: 0 },
    actions: [{ id: 'accept', label: l('Aceitar', 'Accept') }, { id: 'counter', label: l('Pedir mais (cachê +50%)', 'Ask for more (fee +50%)') }, { id: 'decline', label: l('Recusar', 'Decline') }],
  });
  return true;
}

/** Fecha um convite de fora: o anfitrião grava e lança; o seu ato recebe o cachê e a parte combinada. */
export function acceptNpcInvite(s: GameState, r: Rng, hostId: string, guestId: string, fee: number, split: number): FeatDeal | null {
  const host = s.acts[hostId];
  const guest = s.acts[guestId];
  if (!host || !guest || host.status === 'retired' || host.status === 'split') return null;
  const song = composeSongs(s, r, host, 1)[0];
  if (!song) return null;
  const base = song.title;
  song.recorded = true;
  song.performance = clamp(45 + host.fame / 2 + guest.fame / 6 + r.normal(0, 6), 5, 100);
  song.production = clamp(55 + r.normal(0, 8), 5, 100);
  songX(s, song.id).featuring = guestId;
  settleVocals(s, song);
  song.q = songQ(song);
  song.title = `${base} (feat. ${guest.name})`;
  if (fee > 0) post(s, `featin:${song.id}`, fee, 'royalties', `Cachê de participação: ${host.name}`);
  host.cash -= fee;
  const rel = launchNpcRelease(s, r, host, host.owner ?? 'indie', [song.id], 'single', 2500 + host.fame * 60);
  const deal: FeatDeal = { id: nextId(s, 'fd'), songId: song.id, title: base, hostActId: hostId, guestActId: guestId, fee, split, clearance: 0, side: 'guest', status: 'done', lastRev: rel.revenue, paid: 0, week: s.week, migrated: 1 };
  pushDeal(s, deal);
  host.feats += 1;
  guest.feats += 1;
  crossAudience(s, guest, host);
  linkActs(s, host, guest, 20);
  remember(s, 'feature', fmtL(l('{g} participa de "{t}", single de {h}.', '{g} features on "{t}", a single by {h}.'), { g: guest.name, t: base, h: host.name }), { actId: guest.id, important: host.fame > 50 });
  return deal;
}

MSG_HANDLERS.feat8 = (s, m, action, r) => {
  const ref = m.ref ?? {};
  const host = s.acts[String(ref.host)];
  const guest = s.acts[String(ref.guest)];
  if (!host || !guest) return l('O convite perdeu a validade.', 'The invite is no longer valid.');
  if (action === 'accept') {
    const d = acceptNpcInvite(s, r, host.id, guest.id, Number(ref.fee), Number(ref.split));
    return d ? fmtL(l('Fechado: {g} grava com {h}. O single sai já.', 'Deal: {g} records with {h}. The single is out now.'), { g: guest.name, h: host.name }) : l('Não deu certo desta vez.', 'It did not work out this time.');
  }
  if (action === 'counter') {
    // o anfitrião decide na hora se paga mais
    const want = (guest.fame - host.fame) / 40 + actBond(s, host, guest).v / 80 + 0.25;
    if (r.chance(clamp(0.5 + want * 0.4, 0.1, 0.9))) {
      const fee = Math.round(Number(ref.fee) * 1.5);
      const d = acceptNpcInvite(s, r, host.id, guest.id, fee, Number(ref.split));
      return d ? fmtL(l('{h} aceitou pagar {f}. Participação gravada.', '{h} agreed to pay {f}. Feature recorded.'), { h: host.name, f: `$${Math.round(fee / 100).toLocaleString('en-US')}` }) : l('Não deu certo desta vez.', 'It did not work out this time.');
    }
    linkActs(s, host, guest, -6);
    return fmtL(l('{h} achou caro e desistiu.', '{h} found it too expensive and backed out.'), { h: host.name });
  }
  linkActs(s, host, guest, -3);
  return fmtL(l('Você recusou o convite de {h}.', 'You declined {h}\'s invite.'), { h: host.name });
};

// ---------------------------------------------------------------- mês e semana

function royaltiesMonth(s: GameState): void {
  for (const d of feats(s).deals) {
    if (d.status !== 'done') continue;
    const song = s.songs[d.songId];
    const rel = song?.releaseId ? s.releases[song.releaseId] : undefined;
    if (!rel) continue;
    const delta = rel.revenue - d.lastRev;
    if (delta <= 0) continue;
    d.lastRev = rel.revenue;
    const amount = Math.round((delta * d.split) / Math.max(1, rel.songs.length));
    if (amount <= 0) continue;
    const guest = s.acts[d.guestActId];
    if (d.side === 'host') {
      post(s, `featroy:${d.id}:${s.year}:${s.month}`, -amount, 'royalties', `Royalties de feat: ${guest?.name ?? ''}`);
      if (guest) guest.cash += amount;
    } else {
      post(s, `featroyin:${d.id}:${s.year}:${s.month}`, amount, 'royalties', `Royalties de feat em "${d.title}"`);
      const host = s.acts[d.hostActId];
      if (host) host.cash -= amount;
    }
    d.paid += amount;
  }
}

/** Convites de fora: atos com fama e amigos recebem mais. */
function invitesMonth(s: GameState, r: Rng): void {
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.status === 'retired' || a.status === 'split' || !a.members.length) continue;
    const p = 0.025 + a.fame / 900 + (a.momentum > 60 ? 0.02 : 0);
    if (r.chance(p)) npcInvite(s, r, a.id);
  }
}

/** O mundo também grava junto: amigos de selos diferentes fazem feats. */
function npcFeats(s: GameState, r: Rng): void {
  const st = (s.x4 as unknown as { social8?: { ties: { a: string; b: string; k: string; v: number }[] } }).social8;
  if (!st?.ties.length || !r.chance(0.6)) return;
  for (let i = 0; i < 2; i++) {
    const t = r.pick(st.ties);
    if (t.v < 25 || t.k === 'rival' || t.k === 'feud') continue;
    const A = actOfPerson(s, t.a);
    const B = actOfPerson(s, t.b);
    if (!A || !B || A.status !== 'active' || B.status !== 'active' || A === B || isMine(s, A) || isMine(s, B)) continue;
    A.feats += 1;
    B.feats += 1;
    crossAudience(s, A, B, 0.5);
    bump(s, t.a, t.b, 10, 'feat', 'collab');
    const fs = feats(s);
    fs.npc.push({ y: s.year, a: A.name, b: B.name });
    if (fs.npc.length > 30) fs.npc.shift();
    if (A.fame > 45 || B.fame > 45) remember(s, 'npc_feat', fmtL(l('{a} e {b} lançam um feat juntos.', '{a} and {b} release a feature together.'), { a: A.name, b: B.name }), { actId: A.id });
  }
}

registerSimHook('month', 'feats8', (s, r) => {
  royaltiesMonth(s);
  invitesMonth(s, r);
  npcFeats(s, r);
  // contrapropostas esquecidas expiram
  const st = feats(s);
  st.deals = st.deals.filter((d) => d.status === 'done' || s.week - d.week < 8);
});

registerSimHook('week', 'feats8', (s, r) => {
  const st = feats(s);
  for (const d of [...st.deals]) {
    if (d.status !== 'thinking' || (d.thinkUntil ?? 0) > s.week) continue;
    const res = resolveThinkingFeat(s, r, d);
    notify(s, res.text, res.result === 'accepted' ? 'good' : 'bad');
  }
});

// lançamento com convidado: os públicos se cruzam
registerSimHook('launch', 'feats8', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel) return;
  for (const id of rel.songs) {
    const g = songX(s, id).featuring;
    if (!g) continue;
    const d = feats(s).deals.find((x) => x.songId === id && x.status === 'done');
    const sx = songX(s, id) as { ftm?: 1 };
    if (d?.migrated || sx.ftm) continue;
    sx.ftm = 1;
    const host = s.acts[rel.actId];
    const guest = s.acts[g];
    if (!host || !guest) continue;
    crossAudience(s, host, guest);
    linkActs(s, host, guest, 8);
    if (d) {
      d.migrated = 1;
      d.lastRev = rel.revenue;
    }
  }
});
