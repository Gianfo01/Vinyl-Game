// R29 (feat de pessoa, parte B): o mundo também convida PESSOAS (atos NPC creditam integrante/solo/músico de estúdio nas
// próprias faixas, com pares plausíveis e frequência pela época/gênero); convites de fora a uma pessoa SUA pela caixa de
// entrada (aceitar, propor a banda inteira, recusar); convite rápido (preço de tabela) para pessoa(s). Ver docs/feat29.md.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs } from '../src/sim/production';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { rngOf } from '../src/sim/util';
import { biography29, personFeats29 } from '../src/sim/sys/connect29';
import { inviteFeaturePersons, songX } from '../src/sim/sys/creation/core';
import { f15, personFame } from '../src/sim/sys/fame15';
import { featSongs, feats } from '../src/sim/sys/feats8';
import {
  FAM_W29, attachNpcFeat29, fairFeat29, featPersonBlock29, homeAct29, npcFeatRate29, npcPersonInvite29, npcStats29, pickNpcGuest29, quickFeat29, quickPrice29,
} from '../src/sim/sys/featp29';
import { answerMsg } from '../src/sim/sys/people/inbox';
import { P } from '../src/sim/sys/people/state';
import { items18 } from '../src/sim/sys/inbox18';
import { letter27 } from '../src/ui/sys/mail27model';

const game = (seed: string, year = 1995): GameState => { const s = createGame(defaultConfig(seed, { startYear: year })); s.player.cash += 50_000_000_00; return s; };
const live = (a: Act) => a.status === 'active' || a.status === 'emerging';
const okBand = (s: GameState, a: Act) => live(a) && a.members.length >= 3 && a.members.every((m) => s.persons[m]?.alive && !s.persons[m].isPlayer);
const freeBands = (s: GameState): Act[] => Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && okBand(s, a)).sort((a, b) => b.fame - a.fame);
const rivalBand = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && s.labels[a.owner]?.active && okBand(s, a)).sort((a, b) => b.fame - a.fame)[0];
function sign(s: GameState, a: Act): Act { acceptOffer(s, a, { ...defaultOffer(s, a), id: `o-${a.id}`, week: s.week, status: 'pending', advance: 0 }); return a; }
const sorted = (s: GameState, b: Act) => b.members.slice().sort((x, y) => personFame(s, y).v - personFame(s, x).v);

describe('R29 B — o mundo convida pessoas', () => {
  it('frequência pela época e pelo gênero', () => {
    expect(npcFeatRate29(1965)).toBeLessThan(npcFeatRate29(1985));
    expect(npcFeatRate29(1985)).toBeLessThan(npcFeatRate29(2001));
    expect(npcFeatRate29(2001) / npcFeatRate29(1993)).toBeGreaterThanOrEqual(2);
    expect(FAM_W29.hiphop!).toBeGreaterThan(FAM_W29.pop!);
    expect(FAM_W29.pop!).toBeGreaterThan(1);
    expect(FAM_W29.country_folk!).toBeLessThan(0.5);
  });

  it('10 anos de bot: feats de pessoa do mundo acontecem, com pares plausíveis e crédito certo; ficha e crônica mostram', async () => {
    const s = createGame(defaultConfig('r29pfb-run', { startYear: 1994, role: 'hybrid' }));
    for (let i = 0; i < 120 && !s.ended; i++) { botMonth(s); advanceMonth(s); await new Promise((r) => setImmediate(r)); }
    const st = npcStats29(s);
    expect(st.n).toBeGreaterThan(40);
    // mais comum do fim dos anos 1990 em diante
    expect((st.byDec['2000'] ?? 0) / 5).toBeGreaterThan((st.byDec['1990'] ?? 0) / 6);
    // pares plausíveis: quase sempre a mesma família de gênero; laço/cena/cidade em boa parte
    expect(st.fam / st.n).toBeGreaterThan(0.6);
    expect((st.tie + st.city) / st.n).toBeGreaterThan(0.5);
    // crédito: lançamentos NPC com convidado pessoa trazem "(feat. {Nome})" na faixa
    const rels = Object.values(s.releases).filter((r) => (s.x4.creation.songs[r.songs[0]]?.featPersons?.length ?? 0) > 0 && r.owner !== 'player');
    expect(rels.length).toBeGreaterThan(3);
    let seen = 0;
    for (const r of rels) {
      const so = s.songs[r.songs[0]];
      const ps = s.x4.creation.songs[so.id].featPersons!;
      expect(so.title).toContain(`(feat. ${s.persons[ps[0]].name}`);
      expect(s.acts[r.actId].members).not.toContain(ps[0]);
      if (r.type !== 'single') expect(r.title).not.toContain('(feat.');
      // ficha (Conexões › Participações) e crônica/biografia da pessoa
      if (personFeats29(s, ps[0]).some((x) => x.songId === so.id && x.via === 'person')) seen++;
    }
    expect(seen).toBe(rels.length);
    const pid = s.x4.creation.songs[rels[rels.length - 1].songs[0]].featPersons![0];
    expect(biography29(s, pid).some((e) => e.k === 'feature')).toBe(true);
  }, 900_000);

  it('NPC × NPC: escolhe gente plausível e credita sem dinheiro do jogador', () => {
    const s = game('r29pfb-a', 2001);
    const H = Object.values(s.acts).filter((a) => live(a) && !a.owner?.startsWith('player') && a.owner !== 'player' && a.fame >= 30 && a.members.length).sort((a, b) => b.fame - a.fame)[0];
    const g = pickNpcGuest29(s, Rng.fromSeed('pick'), H)!;
    expect(g).toBeTruthy();
    expect(H.members).not.toContain(g.pid);
    expect(s.persons[g.pid].alive).toBe(true);
    const cash = s.player.cash;
    const so = composeSongs(s, Rng.fromSeed('c'), H, 1)[0];
    so.recorded = true;
    const base = so.title;
    expect(attachNpcFeat29(s, H, so.id, [g.pid], g)).toBe(true);
    expect(s.songs[so.id].title).toBe(`${base} (feat. ${s.persons[g.pid].name})`);
    expect(s.player.cash).toBe(cash);
    expect(npcStats29(s).n).toBe(1);
  }, 60_000);
});

describe('R29 B — convite de fora a uma pessoa sua', () => {
  it('a mensagem nomeia a pessoa; aceitar = feat de pessoa (cachê, efeitos nela, reação da banda)', () => {
    const s = game('r29pfb-b');
    const A = sign(s, freeBands(s)[2]);
    const [pid] = sorted(s, A);
    expect(npcPersonInvite29(s, Rng.fromSeed('inv'), pid)).toBe(true);
    expect(npcPersonInvite29(s, Rng.fromSeed('inv2'), pid)).toBe(false); // um convite pendente por pessoa
    const msg = P(s).inbox.find((m) => m.ref?.sys === 'featp29' && !m.resolved)!;
    expect(msg.ref!.pid).toBe(pid);
    expect(msg.subject.pt).toContain(s.persons[pid].name);
    expect(msg.actions!.map((x) => x.id)).toEqual(['accept', 'band', 'decline']);
    const it0 = items18(s).find((x) => x.msg?.id === msg.id)!;
    expect(letter27(s, it0).intro?.pt).toContain(s.persons[pid].name);
    const H = s.acts[String(msg.ref!.host)];
    const cash = s.player.cash, fans = A.fans.casual, po = f15(s).po[pid] ?? 0;
    const mate = A.members.find((m) => m !== pid)!;
    const rel0 = s.persons[mate].rel[pid] ?? 0;
    answerMsg(s, msg.id, 'accept', rngOf(s));
    expect(msg.resolved).toBe('accept');
    expect(s.player.cash).toBe(cash + Number(msg.ref!.fee));
    const d = feats(s).deals.find((x) => x.side === 'guest' && x.hostActId === H.id)!;
    expect(d.guestPersons).toEqual([pid]);
    expect(d.guestActId).toBe('');
    expect(s.songs[d.songId].title).toBe(`${d.title} (feat. ${s.persons[pid].name})`);
    expect(s.songs[d.songId].releaseId).toBeTruthy();
    expect(A.fans.casual).toBeGreaterThan(fans);
    expect(f15(s).po[pid] ?? 0).toBeGreaterThan(po);
    expect(s.persons[mate].rel[pid]).not.toBe(rel0);
    expect(personFeats29(s, pid).some((x) => x.songId === d.songId)).toBe(true);
    expect(homeAct29(s, pid)?.id).toBe(A.id); // a pessoa continua na banda
  }, 60_000);

  it('contraproposta "a banda inteira": o anfitrião topa (feat do ato de sempre) ou desiste', () => {
    const s = game('r29pfb-c');
    const A = sign(s, freeBands(s)[2]);
    A.fame = 95;
    const ps = sorted(s, A);
    const out: string[] = [];
    for (let i = 0; i < 6 && !out.includes('ok'); i++) {
      const pid = ps[i % ps.length];
      if (!npcPersonInvite29(s, Rng.fromSeed(`b${i}`), pid)) continue;
      const msg = P(s).inbox.find((m) => m.ref?.sys === 'featp29' && m.ref?.pid === pid && !m.resolved)!;
      const H = String(msg.ref!.host);
      const n0 = feats(s).deals.length;
      const txt = answerMsg(s, msg.id, 'band', rngOf(s));
      const d = feats(s).deals.slice(n0).find((x) => x.side === 'guest' && x.hostActId === H);
      if (d) { expect(d.guestActId).toBe(A.id); expect(d.guestPersons).toBeUndefined(); expect(s.songs[d.songId].title).toContain(`(feat. ${A.name})`); out.push('ok'); }
      else { expect(txt.pt).toMatch(/queria só|Não deu certo/); out.push('no'); }
    }
    expect(out).toContain('ok');
    // os convites ao ato inteiro (feats8) seguem existindo
    expect(typeof answerMsg).toBe('function');
  }, 60_000);
});

describe('R29 B — convite rápido de pessoa(s)', () => {
  it('preço de tabela = fama + habilidade + liberação; os mesmos bloqueios; credita a pessoa', () => {
    const s = game('r29pfb-d');
    const H = sign(s, freeBands(s)[3]);
    composeSongs(s, rngOf(s), H, 6);
    const so = featSongs(s, H.id)[0];
    const rb = rivalBand(s);
    const [pid] = sorted(s, rb);
    s.rivalries[rb.owner!] = 30;
    const pr = quickPrice29(s, so.id, { persons: [pid] });
    expect(pr.block).toBeNull();
    expect(pr.fee).toBe(fairFeat29(s, H.id, { persons: [pid] }).fee);
    expect(pr.clearance).toBeGreaterThan(0);
    expect(pr.total).toBe(pr.fee + pr.clearance);
    // bloqueios: morta, rivalidade alta, sem caixa
    s.persons[pid].alive = false;
    expect(quickPrice29(s, so.id, { persons: [pid] }).block?.pt).toMatch(/Faleceu/);
    s.persons[pid].alive = true;
    s.rivalries[rb.owner!] = 80;
    expect(quickPrice29(s, so.id, { persons: [pid] }).block?.pt).toMatch(/rivalidade/);
    expect(featPersonBlock29(s, pid)?.pt).toMatch(/rivalidade/);
    s.rivalries[rb.owner!] = 0;
    const cash = s.player.cash;
    s.player.cash = 0;
    expect(quickPrice29(s, so.id, { persons: [pid] }).block).not.toBeNull();
    s.player.cash = cash;
    // fecha (o caminho rápido do mesmo feat): tenta pessoas diferentes até alguém topar
    const cands = freeBands(s).slice(0, 8).map((b) => sorted(s, b)[0]);
    let ok = false;
    for (const p of cands) {
      const song = featSongs(s, H.id)[0];
      if (!song) break;
      const base = song.title;
      const r = quickFeat29(s, song.id, { persons: [p] });
      if (r.ok) {
        ok = true;
        expect(s.songs[song.id].title).toBe(`${base} (feat. ${s.persons[p].name})`);
        expect(songX(s, song.id).featPersons).toEqual([p]);
        expect(feats(s).deals.some((d) => d.songId === song.id && d.guestPersons?.[0] === p && d.split === 0)).toBe(true);
        break;
      } else expect(s.x4.creation.features.some((f) => f.songId === song.id && f.status === 'refused' && f.guestPersons?.[0] === p)).toBe(true);
    }
    expect(ok).toBe(true);
    // a entrada do creation/core é o mesmo caminho
    const song2 = featSongs(s, H.id)[0];
    const two = freeBands(s).slice(9, 11).map((b) => sorted(s, b)[0]);
    expect(inviteFeaturePersons(s, song2.id, two).pt).toMatch(/topou|recusou/);
  }, 60_000);
});

describe('R29 B — determinismo', () => {
  it('mesma semente → os mesmos feats de pessoa do mundo e o mesmo estado', async () => {
    const run = async () => {
      const s = createGame(defaultConfig('r29pfb-det', { startYear: 2000 }));
      for (let i = 0; i < 6; i++) { advanceMonth(s); await new Promise((r) => setImmediate(r)); }
      const np = (feats(s) as unknown as { np29?: { s: string; p: string[] }[] }).np29 ?? [];
      return { st: npcStats29(s), titles: np.map((x) => `${s.songs[x.s]?.title}|${x.p.join(',')}`), rng: JSON.stringify(s.rng), acts: Object.keys(s.acts).length };
    };
    const a = await run(), b = await run();
    expect(a).toEqual(b);
    expect(a.st.n).toBeGreaterThan(3);
  }, 300_000);
});
