// Rodada 17 (J) — cenas interativas: escolha com consequência (fama regional, escândalo, afinidade), encontro em
// duas etapas, reação ao perder prêmio, gatilho por fato (prisão), resolução automática e fotos colecionáveis.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { emitFact, recentFacts } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { f16 } from '../src/sim/sys/fame16';
import { life } from '../src/sim/sys/life';
import { awardScene17, momentDef17 } from '../src/sim/sys/scenedefs17';
import { choose17, ctx17, options17, photoAct17, queue17, s17, startDate17 } from '../src/sim/sys/scene17';
import type { Act, GameState } from '../src/sim/types';

const myAct = (s: GameState): Act => {
  const a = Object.values(s.acts).filter((x) => x.status !== 'retired' && x.members.length >= 2).sort((x, y) => y.fame - x.fame)[0];
  a.owner = 'player';
  return a;
};

describe('r17 cenas interativas', () => {
  it('show: opções com variação e efeito explicado (fama regional)', () => {
    const s = createGame(defaultConfig('r17-scenes-a', { startYear: 1975 }));
    const a = myAct(s);
    const key = queue17(s, 'show_night', ctx17(s, { act: a.id, tier: 1 }), { force: true })!;
    expect(key).toBeTruthy();
    const o = options17(s, key)!;
    expect(o.opts.map((x) => x.id)).toContain('dive'); // 1975, casa pequena
    const r = choose17(s, key, 'singalong');
    expect(r.res?.lines.length).toBeGreaterThan(0);
    expect(s17(s).book.some((b) => b.key === key)).toBe(true);
    // opções por época: em 1955 não há guitarra quebrada
    const s2 = createGame(defaultConfig('r17-scenes-b', { startYear: 1955 }));
    const k2 = queue17(s2, 'show_night', ctx17(s2, { act: myAct(s2).id, tier: 1 }), { force: true })!;
    expect(options17(s2, k2)!.opts.map((x) => x.id)).not.toContain('smash');
    expect(momentDef17({ k: 'press', medium: 'tv', year: 1960 })).toBe('tv_spot');
  });

  it('prêmio perdido: invadir o palco vira escândalo; Deus/família no discurso', () => {
    const s = createGame(defaultConfig('r17-scenes-c', { startYear: 1990 }));
    const a = myAct(s);
    const before = a.scandals;
    const cs = { id: 'csX', data: { won: 0, cats: [{ nominees: [{ name: 'Outro', mine: false }, { name: a.name, mine: true, actId: a.id }], winner: 0 }] } };
    const key = awardScene17(s, cs)!;
    expect(options17(s, key)!.opts.map((x) => x.id)).toEqual(expect.arrayContaining(['applaud', 'stage', 'still', 'walkout']));
    choose17(s, key, 'stage');
    expect(a.scandals).toBe(before + 1);
    const win = awardScene17(s, { id: 'csY', data: { won: 1, actId: a.id, cats: [] } })!;
    expect(options17(s, win)!.opts.map((x) => x.id)).toEqual(expect.arrayContaining(['team', 'family', 'god', 'political', 'rival', 'humble']));
    const res = choose17(s, win, 'family').res!;
    expect(Object.keys(f16(s).d[a.id] ?? {}).length).toBeGreaterThan(0);
    expect(res.out.pt.length).toBeGreaterThan(5);
  });

  it('encontro em duas etapas muda a afinidade; prisão dispara cena; sem resposta resolve sozinha', () => {
    const s = createGame(defaultConfig('r17-scenes-d', { startYear: 2000 }));
    const a = myAct(s);
    life(s).partner = { name: 'Alex', born: 1975, job: { pt: 'x', en: 'x' }, trait: 'homebody', affinity: 40, since: 0, stage: 'dating', lastDate: -20 };
    const key = startDate17(s);
    expect(typeof key).toBe('string');
    expect(choose17(s, key as string, 'diner').next).toBe(true);
    const r = choose17(s, key as string, 'dreams');
    expect(r.res).toBeTruthy();
    expect(life(s).partner!.affinity).not.toBe(40);
    emitFact(s, { kind: 'arrest', actors: [a.members[0], a.id], place: a.city, severity: 60, text: { pt: 'preso', en: 'arrested' } });
    const pend = Object.entries(s17(s).pend).find(([, p]) => p.def === 'arrest17');
    expect(pend).toBeTruthy();
    for (let i = 0; i < 2; i++) advanceMonth(s);
    expect(s17(s).book.some((b) => b.key === pend![0])).toBe(true);
    expect(recentFacts(s, { months: 3 }).length).toBeGreaterThan(0);
  });

  it('foto icônica: guardar ou licenciar uma vez só', () => {
    const s = createGame(defaultConfig('r17-scenes-e', { startYear: 1985 }));
    const a = myAct(s);
    a.fame = 85;
    s17(s).photos.push({ id: 'phT', y: 1985, title: { pt: 'teste', en: 'test' }, by: { pt: 'x', en: 'x' }, act: a.id, val: 5000, kept: 0, key: 'k' });
    const cash = s.player.cash;
    expect(photoAct17(s, 'phT', 'license')).toBeTruthy();
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(photoAct17(s, 'phT', 'keep')!.en).toContain('already');
  });
});
