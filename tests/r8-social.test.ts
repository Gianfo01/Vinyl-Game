// Rodada 8 — herdeiros, participações em selos rivais, relações entre artistas de atos diferentes e
// feats negociados (inclusive convites de fora).

import { describe, expect, it } from 'vitest';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { resolveDecision } from '../src/sim/events';
import { ownerOf } from '../src/sim/sys/people/owner';
import { P } from '../src/sim/sys/people/state';
import { answerMsg } from '../src/sim/sys/people/inbox';
import { life } from '../src/sim/sys/life';
import { beginSuccession, heirCandidates, heirs, retireOwner } from '../src/sim/sys/heirs8';
import { absorbLabel, acceptStakeCounter, fairStakePrice, makeSubLabel, proposeStake, stakeOf, stakes, founderShare } from '../src/sim/sys/stakes8';
import { actBond, actTies, bump, social, tieOf } from '../src/sim/sys/social8';
import { acceptFeatCounter, fairFeat, featSongs, feats, npcInvite, proposeFeat } from '../src/sim/sys/feats8';
import { composeSongs } from '../src/sim/production';
import { perk } from '../src/sim/perks';
import { rngOf, playerActs, post } from '../src/sim/util';
import type { GameState, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));

describe('herdeiros', () => {
  it('morte com filho adulto: a escolha vai para a mesa e o herdeiro assume com patrimônio taxado', () => {
    const s = mk('r8-heir', { startYear: 1975 });
    const r = rngOf(s);
    const o = ownerOf(s);
    o.kids.push({ name: 'Herdeira Um', born: s.year - 30, aptitude: 70 }, { name: 'Herdeiro Dois', born: s.year - 24, aptitude: 40 });
    o.wealth = 1_000_000_00;
    const oldName = o.name;
    const oldPerson = o.personId;
    expect(heirCandidates(s).map((c) => c.key)).toContain('kid:0');
    expect(beginSuccession(s, r, 'death')).toBe(true);
    const d = s.decisions.find((x) => x.eventId === 'heir_choice8')!;
    expect(d).toBeTruthy();
    expect(d.options.length).toBe(2);
    // escolhe o segundo filho
    const opt = d.options.find((x) => d.ctx[`k${x.id.slice(1)}`] === 'kid:1')!;
    expect(resolveDecision(s, d.id, opt.id)).toBe(true);
    const n = ownerOf(s);
    expect(n.name).toBe('Herdeiro Dois');
    expect(n.generation).toBe(2);
    expect(n.wealth).toBeLessThan(1_000_000_00);
    expect(n.wealth).toBeGreaterThan(500_000_00);
    expect(s.persons[oldPerson!].alive).toBe(false);
    expect(heirs(s).relatives.some((x) => x.name === 'Herdeira Um' && x.rel === 'sibling')).toBe(true);
    expect(heirs(s).lineage.at(-1)?.name).toBe(oldName);
    expect(s.ended).toBeFalsy();
    // a run continua normalmente
    advanceMonth(s);
    expect(ownerOf(s).personId).toBeTruthy();
    expect(s.persons[ownerOf(s).personId!].isPlayer).toBe(true);
    invariant(s);
  });

  it('aposentadoria passa o selo ao cônjuge; sem herdeiros, aposentar ou morrer encerra a run', () => {
    const s = mk('r8-retire', { startYear: 1990 });
    const r = rngOf(s);
    life(s).partner = { name: 'Par Teste', born: s.year - 40, job: { pt: 'x', en: 'x' }, trait: 'kind', affinity: 70, since: s.year - 10, stage: 'married', lastDate: s.week };
    expect(retireOwner(s, r, 'spouse')).toBeNull();
    expect(ownerOf(s).name).toBe('Par Teste');
    expect(life(s).partner).toBeNull();
    // agora sem família: aposentar exige confirmação e termina a run
    const s2 = mk('r8-noheir', { startYear: 1990 });
    const o2 = ownerOf(s2);
    o2.kids = [];
    o2.spouse = undefined;
    life(s2).partner = null;
    expect(heirCandidates(s2).length).toBe(0);
    expect(retireOwner(s2, rngOf(s2))).not.toBeNull();
    expect(s2.ended).toBeFalsy();
    expect(retireOwner(s2, rngOf(s2), 'none')).toBeNull();
    expect(s2.ended?.ending).toBe('quiet_retirement');
    const s3 = mk('r8-death', { startYear: 1990 });
    ownerOf(s3).kids = [];
    life(s3).partner = null;
    ownerOf(s3).spouse = undefined;
    beginSuccession(s3, rngOf(s3), 'death');
    expect(s3.ended?.ending).toBe('end_of_line');
  });

  it('decisão de sucessão sem resposta vale o melhor herdeiro no começo do mês seguinte', () => {
    const s = mk('r8-auto', { startYear: 1980 });
    const o = ownerOf(s);
    o.kids.push({ name: 'Filha Apta', born: s.year - 35, aptitude: 90 });
    beginSuccession(s, rngOf(s), 'health');
    expect(heirs(s).pending).toBeTruthy();
    advanceWeek(s); // abre o mês: decisões vencidas seguem o padrão
    advanceMonth(s);
    expect(ownerOf(s).name).toBe('Filha Apta');
    expect(heirs(s).pending).toBeFalsy();
  });
});

describe('participações em selos rivais', () => {
  const setup = (seed: string) => {
    const s = mk(seed, { startYear: 1985 });
    post(s, 'teste:aporte', 500_000_000_00, 'financing', 'Aporte de teste'); // caixa sempre pelo extrato
    const lb = Object.values(s.labels).filter((x) => x.active && x.roster.length > 0).sort((a, b) => a.cash - b.cash)[0];
    return { s, lb, r: rngOf(s) };
  };

  it('negociação com resposta: preço generoso fecha, a fatia entra e o caixa respeita o extrato', () => {
    const { s, lb, r } = setup('r8-stake');
    const fair = fairStakePrice(s, lb.id, 0.2);
    expect(fair).toBeGreaterThan(0);
    let res = proposeStake(s, r, lb.id, 0.2, fair * 3);
    let tries = 0;
    while (res.result !== 'accepted' && tries++ < 10) {
      if (res.result === 'counter' && res.talk) { expect(acceptStakeCounter(s, r, res.talk.id)).toBeNull(); break; }
      stakes(s).talks = [];
      stakes(s).refused = {};
      res = proposeStake(s, r, lb.id, 0.2, fair * 3);
    }
    expect(stakeOf(s, lb.id)).toBeGreaterThan(0);
    expect(founderShare(s, lb.id)).toBeLessThan(1);
    expect(s.ledger.some((e) => e.cat === 'acquisitions')).toBe(true);
    invariant(s);
    // proposta ridícula é recusada (ou vira contraproposta), nunca aceita de graça
    stakes(s).talks = [];
    const low = proposeStake(s, r, lb.id, 0.05, 1);
    expect(low.result).not.toBe('accepted');
    invariant(s);
  });

  it('controle: absorver elenco e catálogo ou virar subselo', () => {
    const { s, lb, r } = setup('r8-control');
    // fatia de controle comprada direto (sem negociação) para testar as saídas
    stakes(s).recs[lb.id] = [{ holder: 'player', share: 0.6, since: s.year, cost: 0 }];
    const roster = [...lb.roster];
    const subs = s.subLabels.length;
    expect(makeSubLabel(s, lb.id)).toBeNull();
    expect(s.subLabels.length).toBe(subs + 1);
    expect(lb.active).toBe(false);
    for (const id of roster) if (s.acts[id]?.contractId) expect(s.acts[id].owner).toBe('player');
    invariant(s);
    const other = Object.values(s.labels).find((x) => x.active && x.roster.length > 0 && x.id !== lb.id)!;
    stakes(s).recs[other.id] = [{ holder: 'player', share: 0.55, since: s.year, cost: 0 }];
    const err = absorbLabel(s, r, other.id);
    if (err === null) {
      expect(other.active).toBe(false);
      expect(Object.values(s.releases).some((x) => x.owner === other.id)).toBe(false);
    }
    invariant(s);
  });

  it('rivais compram fatias entre si ao longo dos anos', () => {
    const s = mk('r8-npcstakes', { startYear: 1990 });
    for (let i = 0; i < 24; i++) { botMonth(s); advanceMonth(s); }
    const recs = stakes(s).recs;
    const npcHold = Object.values(recs).flat().filter((h) => h.holder !== 'player').length + stakes(s).news.length;
    expect(npcHold).toBeGreaterThan(0);
    invariant(s);
  });
});

describe('relações entre artistas', () => {
  it('laços nascem na cena, ficam esparsos e aparecem por ato', () => {
    const s = mk('r8-ties', { startYear: 1978 });
    for (let i = 0; i < 12; i++) { botMonth(s); advanceMonth(s); }
    const st = social(s);
    expect(st.ties.length).toBeGreaterThan(10);
    expect(st.ties.length).toBeLessThanOrEqual(1500);
    // laços são sempre entre atos diferentes
    const t = st.ties[0];
    const A = Object.values(s.acts).find((a) => a.members.includes(t.a));
    expect(A && A.members.includes(t.b)).toBeFalsy();
    if (A) expect(actTies(s, A).length).toBeGreaterThan(0);
    invariant(s);
  });

  it('amigo no elenco ajuda a contratar; rixa pública dá apelo', () => {
    const s = mk('r8-friend', { startYear: 1990, role: 'artist' });
    const mine = playerActs(s).map((id) => s.acts[id]).find((a) => a.members.length)!;
    const free = Object.values(s.acts).find((a) => !a.owner && a.members.length && a.status !== 'retired' && a.status !== 'split')!;
    const base = perk(s, 'offer', free);
    bump(s, mine.members[0], free.members[0], 60, 'scene');
    expect(tieOf(s, mine.members[0], free.members[0])?.k).toBe('friend');
    expect(actBond(s, mine, free).v).toBeGreaterThan(50);
    s.week += 1; // perks recalculam por semana
    expect(perk(s, 'offer', free)).toBeGreaterThan(base);
  });
});

describe('feats negociados', () => {
  it('convite com resposta na hora: aceita, contraproposta ou recusa; o caixa fica certo', () => {
    const s = mk('r8-feat', { startYear: 1995, role: 'artist' });
    post(s, 'teste:aporte', 50_000_000_00, 'financing', 'Aporte de teste');
    const r = rngOf(s);
    const host = playerActs(s).map((id) => s.acts[id]).find((a) => a.members.length)!;
    composeSongs(s, r, host, 3);
    const songs = featSongs(s, host.id);
    expect(songs.length).toBeGreaterThan(0);
    const guest = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status === 'active' && a.members.length && a.fame > 5 && a.fame < 40)[0];
    // amigos de longa data
    bump(s, host.members[0], guest.members[0], 80, 'scene');
    const fair = fairFeat(s, host.id, guest.id);
    let done = false;
    for (const so of songs) {
      const res = proposeFeat(s, r, so.id, guest.id, { fee: fair.fee * 2, split: fair.split * 1.5 });
      expect(['accepted', 'counter', 'rejected', 'thinking', 'invalid']).toContain(res.result);
      if (res.result === 'counter' && res.deal) expect(acceptFeatCounter(s, res.deal.id)).toBeNull();
      if (res.result === 'accepted' || res.result === 'counter') { done = true; break; }
    }
    if (done) {
      expect(feats(s).deals.some((d) => d.status === 'done' && d.guestActId === guest.id)).toBe(true);
      expect(s.x4.creation.features.some((f) => f.guestActId === guest.id && f.status === 'done')).toBe(true);
      expect(tieOf(s, host.members[0], guest.members[0])?.v).toBeGreaterThan(60);
    }
    invariant(s);
    // as respostas "pensando" chegam sozinhas
    for (let i = 0; i < 3; i++) advanceWeek(s);
    expect(feats(s).deals.every((d) => d.status !== 'thinking' || (d.thinkUntil ?? 0) > s.week)).toBe(true);
    invariant(s);
  });

  it('convites de fora chegam na caixa de entrada e podem ser aceitos', () => {
    const s = mk('r8-invite', { startYear: 2000, role: 'artist' });
    const r = rngOf(s);
    const guest = playerActs(s).map((id) => s.acts[id]).find((a) => a.members.length)!;
    expect(npcInvite(s, r, guest.id)).toBe(true);
    const msg = P(s).inbox.find((m) => m.ref?.sys === 'feat8' && !m.resolved)!;
    expect(msg).toBeTruthy();
    const host = s.acts[String(msg.ref!.host)];
    const fansBefore = guest.fans.casual;
    const feeIn = Number(msg.ref!.fee);
    const cash = s.player.cash;
    answerMsg(s, msg.id, 'accept', r);
    expect(msg.resolved).toBe('accept');
    expect(s.player.cash).toBe(cash + feeIn);
    expect(guest.fans.casual).toBeGreaterThanOrEqual(fansBefore);
    expect(feats(s).deals.some((d) => d.side === 'guest' && d.hostActId === host.id)).toBe(true);
    invariant(s);
    // royalties da faixa alheia entram pelo extrato
    for (let i = 0; i < 3; i++) advanceMonth(s);
    invariant(s);
  });

  it('em uma run longa, convites de fora surgem sozinhos e o mundo grava feats', () => {
    const s = mk('r8-long', { startYear: 2005, role: 'hybrid' });
    for (let i = 0; i < 24; i++) { botMonth(s); advanceMonth(s); }
    const invites = P(s).inbox.filter((m) => m.ref?.sys === 'feat8').length + feats(s).deals.filter((d) => d.side === 'guest').length;
    expect(invites + feats(s).npc.length).toBeGreaterThan(0);
    invariant(s);
  });
});
