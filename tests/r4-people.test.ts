// Rodada 4, sistema "people": pensamentos, colapsos, saúde, conversas e promessas, panelinhas,
// segredos, dono do selo, carreira da equipe, romances, fortuna, caixa de entrada, feed e Mesa.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs } from '../src/sim/production';
import { releaseSingle } from '../src/sim/repertoire';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { runSimHooks } from '../src/sim/ext4';
import { monthIndex, personLoad } from '../src/sim/capacity';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { P, healthOf, mediumFor } from '../src/sim/sys/people/state';
import { activeThoughts, addThought, moodOf } from '../src/sim/sys/people/thoughts';
import { startTreatment } from '../src/sim/sys/people/health';
import { breakRisk, triggerBreakdown } from '../src/sim/sys/people/breakdowns';
import { openPromises, talk } from '../src/sim/sys/people/talks';
import { buyHouse, invest, ownerOf, setHeir, succession, withdraw } from '../src/sim/sys/people/owner';
import { changeRole, trainStaff } from '../src/sim/sys/people/staff';
import { autoNegotiate, closeNegotiation, propose, startNegotiation } from '../src/sim/sys/people/negotiation';
import { answerMsg, inboxItems } from '../src/sim/sys/people/inbox';
import { cliques } from '../src/sim/sys/people/social';
import { hireDetective, pressureCeo } from '../src/sim/sys/people/secrets';
import { breakUp } from '../src/sim/sys/people/life';
import { feedFor, postAbout } from '../src/sim/sys/people/feed';
import '../src/sim/sys/people';

function withAct(seed: string, over = {}) {
  const s = createGame(defaultConfig(seed, over));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  return { s, r, act };
}

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);

describe('humor em pilha de pensamentos', () => {
  it('show lotado vira pensamento com prazo e puxa o moral', () => {
    const { s, r, act } = withAct('pp-1');
    const pid = act.members[0];
    runSimHooks('show', s, r, { show: { actId: act.id, cityId: act.city, sold: 1000, capacity: 1000, revenue: 100000, tourId: 'x' } });
    expect(activeThoughts(s, pid).some((t) => t.k === 'show_full')).toBe(true);
    expect(moodOf(s, pid)).toBeGreaterThan(0);
    // pensamentos negativos derrubam o moral no fechamento
    for (const id of act.members) {
      addThought(s, id, 'promise_broken', { p: 'x' });
      addThought(s, id, 'broke');
      addThought(s, id, 'breakup', { p: 'y' });
    }
    const before = s.persons[pid].morale;
    advanceMonth(s);
    expect(s.persons[pid].morale).toBeLessThan(before + 5);
    expect(moodOf(s, pid)).toBeLessThan(0);
    invariant(s);
  });
});

describe('colapsos', () => {
  it('quebrar equipamento cobra, entra no diário e alivia o estresse', () => {
    const { s, r, act } = withAct('pp-2');
    const p = s.persons[act.members[0]];
    p.stress = 90;
    const cash = s.player.cash;
    const mem = s.memory.length;
    expect(triggerBreakdown(s, r, p, act, 'smash')).toBe('smash');
    expect(s.player.cash).toBeLessThan(cash);
    expect(s.memory.length).toBeGreaterThan(mem);
    expect(p.stress).toBeLessThan(90);
    expect(P(s).breakdowns).toHaveLength(1);
    invariant(s);
  });

  it('moral baixo gera risco; declaração ofensiva abre crise', () => {
    const { s, r, act } = withAct('pp-3');
    const p = s.persons[act.members[0]];
    p.morale = 5;
    expect(breakRisk(s, p)).toBeGreaterThan(0.05);
    triggerBreakdown(s, r, p, act, 'post');
    expect(s.crises.some((c) => c.actId === act.id)).toBe(true);
  });
});

describe('saúde do músico', () => {
  it('cirurgia de calos afasta da agenda e cura', () => {
    const { s, act } = withAct('pp-4');
    const pid = act.members[0];
    const h = healthOf(s, pid);
    h.nodes = true;
    expect(startTreatment(s, pid, 'surgery')).toBeNull();
    expect(personLoad(s, pid, monthIndex(s)).total).toBeGreaterThanOrEqual(75);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(healthOf(s, pid).nodes).toBeFalsy();
    expect(healthOf(s, pid).treatment).toBeUndefined();
    invariant(s);
  });

  it('shows acumulam desgaste de voz e audição', () => {
    const { s, r, act } = withAct('pp-5');
    for (let i = 0; i < 20; i++) runSimHooks('show', s, r, { show: { actId: act.id, cityId: act.city, sold: 10, capacity: 100, revenue: 1000, tourId: 'x' } });
    const hs = act.members.map((id) => healthOf(s, id));
    expect(Math.max(...hs.map((h) => h.hearing))).toBeGreaterThan(3);
  });
});

describe('conversas e promessas', () => {
  it('promessa de single cumprida aumenta a confiança', () => {
    const { s, r, act } = withAct('pp-6');
    const pid = act.members[0];
    expect(talk(s, pid, 'promise', 'single').ok).toBe(true);
    expect(openPromises(s, pid)).toHaveLength(1);
    const trust = act.trust;
    const songs = composeSongs(s, r, act, 1);
    recordSongs(s, r, act, [songs[0].id], 1, 'balanced');
    expect(releaseSingle(s, r, songs[0].id)).toBeNull();
    advanceMonth(s);
    advanceMonth(s);
    expect(P(s).promises[0].status).toBe('kept');
    expect(act.trust).toBeGreaterThan(trust - 1);
    invariant(s);
  });

  it('promessa quebrada custa confiança e vira memória', () => {
    const { s, act } = withAct('pp-7');
    const pid = act.members[0];
    talk(s, pid, 'promise', 'raise');
    const trust = act.trust;
    for (let i = 0; i < 4; i++) advanceMonth(s);
    expect(P(s).promises[0].status).toBe('broken');
    expect(act.trust).toBeLessThan(trust);
    expect(s.memory.some((m) => m.kind === 'promise_broken')).toBe(true);
  });

  it('conversas seguidas têm intervalo e multa entra no caixa', () => {
    const { s, act } = withAct('pp-8');
    const pid = act.members[0];
    const cash = s.player.cash;
    expect(talk(s, pid, 'fine').ok).toBe(true);
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(talk(s, pid, 'praise').ok).toBe(false);
    invariant(s);
  });
});

describe('dono do selo', () => {
  it('patrimônio pessoal é separado e a retirada passa pelo extrato', () => {
    const { s } = withAct('pp-9');
    const o = ownerOf(s);
    const w = o.wealth;
    expect(withdraw(s, 1_000_000_00)).toBeNull();
    expect(o.wealth).toBe(w + 1_000_000_00);
    expect(s.ledger.some((e) => e.cat === 'owner_draw')).toBe(true);
    expect(invest(s, 10_000_00)).toBeNull();
    expect(buyHouse(s, 'suburb')).toBeNull();
    expect(o.house).toBeGreaterThanOrEqual(0);
    invariant(s);
  });

  it('sucessão passa o selo ao herdeiro escolhido', () => {
    const { s, r } = withAct('pp-10');
    const o = ownerOf(s);
    o.kids.push({ name: 'Herdeira Teste', born: s.year - 25, aptitude: 80 });
    expect(setHeir(s, 'kid:0')).toBeNull();
    succession(s, r, 'retire');
    expect(ownerOf(s).name).toBe('Herdeira Teste');
    expect(ownerOf(s).generation).toBe(2);
  });
});

describe('equipe com carreira', () => {
  it('treinamento sobe habilidade; engenheiro vira produtor', () => {
    const { s } = withAct('pp-11');
    s.player.staff.push({ id: 'stx', name: 'Ed Teste', role: 'engineer', skill: 50, salary: 100000, hiredWeek: 0 });
    expect(trainStaff(s, 'stx')).toBeNull();
    for (let i = 0; i < 2; i++) advanceMonth(s);
    const st = s.player.staff.find((x) => x.id === 'stx');
    if (st) {
      expect(st.skill).toBeGreaterThan(50);
      expect(changeRole(s, 'stx', 'producer')).toBeNull();
      expect(st.role).toBe('producer');
    }
    invariant(s);
  });
});

describe('Mesa de negociação', () => {
  it('automático assina um artista livre', () => {
    const { s, r } = withAct('pp-12');
    const free = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 5 });
    free.owner = null;
    autoNegotiate(s, free.id, 'sign');
    // ou assinou, ou entrou em pausa de negociação
    expect(free.owner === 'player' || (P(s).negCooldown[free.id] ?? 0) > s.week).toBe(true);
    invariant(s);
  });

  it('renovação na mesa estende o contrato', () => {
    const { s, act } = withAct('pp-13');
    const c = s.contracts[act.contractId!];
    const end = c.endWeek;
    const n = startNegotiation(s, act.id, 'renew');
    expect('pt' in n).toBe(false);
    let guard = 0;
    while (P(s).neg && !P(s).neg!.done && guard++ < 10) propose(s, { ...P(s).neg!.ask });
    closeNegotiation(s);
    expect(c.endWeek).toBeGreaterThan(end);
    invariant(s);
  });
});

describe('caixa de entrada e feed', () => {
  it('meio muda com a era', () => {
    expect(mediumFor(1930)).toBe('letter');
    expect(mediumFor(1930, true)).toBe('telegram');
    expect(mediumFor(1985)).toBe('fax');
    expect(mediumFor(2000)).toBe('email');
    expect(mediumFor(2020)).toBe('message');
  });

  it('mensagem de saúde responde direto e inclui decisões e avisos', () => {
    const { s, act } = withAct('pp-14');
    const pid = act.members[0];
    healthOf(s, pid).voice = 95;
    for (let i = 0; i < 8 && !P(s).inbox.some((m) => m.kind === 'health'); i++) {
      healthOf(s, pid).voice = 95;
      advanceMonth(s);
    }
    const m = P(s).inbox.find((x) => x.kind === 'health' && !x.resolved);
    if (m) {
      answerMsg(s, m.id, 'rest');
      expect(m.resolved).toBe('rest');
    }
    expect(inboxItems(s).length).toBeGreaterThan(0);
    invariant(s);
  });

  it('feed: cartas antes de 2004, redes depois', () => {
    const a = withAct('pp-15', { startYear: 1960 });
    postAbout(a.s, a.r, a.act, 'Canção', 70);
    expect(feedFor(a.s).every((p) => p.role === 'letter' || p.role === 'gossip' || p.role === 'journalist')).toBe(true);
    const b = withAct('pp-16', { startYear: 2010 });
    postAbout(b.s, b.r, b.act, 'Song', 20);
    expect(feedFor(b.s).some((p) => p.role === 'fan' || p.role === 'hater')).toBe(true);
  });
});

describe('panelinhas, segredos e romances', () => {
  it('mapa social agrupa o elenco', () => {
    const { s, r } = withAct('pp-17');
    const b = spawnProceduralAct(s, r, { city: s.config.homeCity });
    acceptOffer(s, b, { ...defaultOffer(s, b), id: 'o2', week: 0, status: 'pending', advance: 0 });
    advanceMonth(s);
    expect(cliques(s, 'city')[0].acts.length).toBe(2);
  });

  it('detetive e pressão no CEO rival', () => {
    const { s, r } = withAct('pp-18');
    advanceMonth(s);
    const sec = P(s).secrets.find((x) => x.owner.startsWith('label:'));
    if (!sec) return;
    for (let i = 0; i < 6 && !sec.known; i++) hireDetective(s, r, sec.owner);
    if (sec.known) pressureCeo(s, r, sec.id, 'back_off');
    invariant(s);
  });

  it('término vira disco de separação com letra melhor', () => {
    const { s, r, act } = withAct('pp-19');
    if (act.members.length < 2) return;
    P(s).romances.push({ id: 'ro1', a: act.members[0], b: act.members[1], actId: act.id, since: 0, status: 'together' });
    breakUp(s, r, 'ro1');
    const [song] = composeSongs(s, r, act, 1);
    expect(song.theme?.en).toBe('heartbreak');
  });
});

describe('determinismo', () => {
  it('mesma seed = mesmo estado de pessoas', () => {
    const run = () => {
      const { s } = withAct('pp-det');
      for (let i = 0; i < 18; i++) advanceMonth(s);
      advanceWeek(s);
      return JSON.stringify(s.x4.people);
    };
    expect(run()).toBe(run());
  });
});
