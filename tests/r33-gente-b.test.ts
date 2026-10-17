// R33 · GENTE33 parte B — poucos casos, sem jogo longo: tudo desligado por padrão; ligado, as camadas descem e sobem a
// mesma pessoa, o talento escondido aparece (e escapa para um rival), ex-artistas voltam e o romance no elenco vira
// decisão na Caixa.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen';
import { defaultConfig } from '../src/sim/bot';
import { setSw } from '../src/sim/r31/switches';
import { rngSnapshot19 } from '../src/sim/rng19';
import { life } from '../src/sim/sys/life';
import { gente31, peekGente31 } from '../src/sim/sys/gente31';
import { inboxKind18 } from '../src/sim/inbox18';
import { Rng } from '../src/core/rng';
import type { GameState } from '../src/sim/types';
import { advanceMonth } from '../src/sim/tick';
import {
  GB33, SWB33, comeback33, gente33bMonth, hidden33, lightCard33, listen33, peekB33, romanceMonth33, talentMonth33, tier33, tiersMonth33,
} from '../src/sim/r33/gente33b';

const mk = (seed: string, year = 1975): GameState => createGame(defaultConfig(seed, { startYear: year }));
const townPid = (s: GameState): string => Object.values(gente31(s).j).find((j) => !j.bico && !s.persons[j.p]?.real27 && !j.p.startsWith('fam:') && !Object.values(s.acts).some((a) => a.status !== 'retired' && a.status !== 'split' && a.members.includes(j.p)))!.p;

describe('R33 GENTE33 parte B', () => {
  it('desligado por padrão: nada muda', () => {
    const s = mk('g33b-off');
    const snap = rngSnapshot19(s), n = Object.keys(s.acts).length;
    gente33bMonth(s);
    expect(peekB33(s)).toBeUndefined();
    expect(rngSnapshot19(s)).toBe(snap);
    expect(Object.keys(s.acts).length).toBe(n);
    expect(tier33(s, townPid(s))).toBe('full');
    expect(hidden33(s, townPid(s))).toBe(0);
  });

  it('três camadas: quem não tem papel desce (resumo + relações fortes) e sobe ao ganhar papel, sempre a mesma pessoa', () => {
    const s = mk('g33b-tier');
    setSw(s, SWB33.camadas, true);
    const pid = townPid(s), p = s.persons[pid];
    p.rel = { a: 10, b: -55, c: 80 };
    const r = tiersMonth33(s);
    expect(r.down).toBeGreaterThan(0);
    expect(tier33(s, pid)).toBe('light');
    expect(p.rel).toEqual({ b: -55, c: 80 });
    expect(peekB33(s)!.sum[pid]).toBeTruthy();
    const card = lightCard33(s, pid)!;
    expect(card.n).toBe(p.name);
    expect(card.traits.length).toBeGreaterThan(0);
    expect(card.prof.pt.length).toBeGreaterThan(0);
    // ganha papel: entra numa banda viva → sobe
    const a = Object.values(s.acts).find((x) => x.status !== 'retired' && x.status !== 'split' && !x.deceased)!;
    a.members.push(pid);
    expect(tiersMonth33(s).up).toBeGreaterThan(0);
    expect(tier33(s, pid)).toBe('full');
    expect(s.persons[pid]).toBe(p);
    expect(peekB33(s)!.sum[pid]).toBeTruthy(); // o resumo do passado fica
  });

  it('talento escondido: ouvir revela e vira artista fazendo bico; sem contrato, um rival leva e vira estrela', () => {
    const s = mk('g33b-tal');
    setSw(s, SWB33.talento, true);
    GB33.hidden = 1; GB33.k = 50;
    try {
      const pid = townPid(s);
      expect(hidden33(s, pid)).toBeGreaterThan(54);
      expect(listen33(s, pid)).toBeNull();
      const [, actId, by] = peekB33(s)!.rev[pid];
      expect(by).toBe('player');
      const a = s.acts[actId];
      expect(a.members).toEqual([pid]);
      expect(s.knowledge[actId]?.source).toBe('hidden33');
      expect(Object.values(peekGente31(s)!.j).find((j) => j.p === pid)?.bico).toBe(1);
      expect(listen33(s, pid)).not.toBeNull(); // não repete
      // meio ano sem contrato: rival leva
      s.week += 30;
      talentMonth33(s);
      expect(a.owner && a.owner !== 'player').toBeTruthy();
      // vira estrela: aviso "a que escapou"
      a.fame = 60;
      talentMonth33(s);
      expect(peekB33(s)!.told[actId]).toBe(1);
      expect(inboxKind18('g33_missed')).toBeTruthy();
    } finally { GB33.hidden = 0.12; GB33.k = 1; }
  });

  it('volta por cima: ex-artista volta (banda ou solo) sem contrato e no radar', () => {
    const s = mk('g33b-back');
    setSw(s, SWB33.volta, true);
    const a = Object.values(s.acts).find((x) => (x.status === 'retired' || x.status === 'split') && !x.catalogNo && x.members.some((m) => s.persons[m]?.alive && s.year - s.persons[m].born < 70))
      ?? (() => { const x = Object.values(s.acts).find((y) => !y.catalogNo && y.status !== 'split' && y.members.every((m) => s.persons[m]?.alive))!; x.status = 'retired'; return x; })();
    a.hits = Math.max(1, a.hits);
    const back = comeback33(s, a.id, 'scout')!;
    expect(back).toBeTruthy();
    expect(back.status === 'active').toBe(true);
    expect(back.owner).toBeNull();
    expect(s.knowledge[back.id]).toBeTruthy();
    expect(comeback33(s, a.id, 'scout')).toBeNull(); // uma volta por década
  });

  it('romance com quem vira artista do seu selo: decisão na Caixa e segredo que pode vazar', () => {
    const s = mk('g33b-rom');
    setSw(s, SWB33.romance, true);
    const a = Object.values(s.acts).find((x) => x.status !== 'retired' && x.status !== 'split' && !x.catalogNo)!;
    a.owner = 'player';
    const pid = a.members[0], p = s.persons[pid];
    life(s).partner = { name: p.name, born: p.born, job: { pt: 'Música', en: 'Music' }, trait: 'kind', affinity: 60, since: s.week, stage: 'dating', personId: pid, lastDate: s.week } as never;
    romanceMonth33(s);
    expect(peekB33(s)!.rom[pid][1]).toBe('ask');
    const h = inboxKind18('g33_rom')!.handle!;
    h(s, { ref: { pid, act: a.id, w: 'partner' } } as never, 'secret', Rng.fromSeed('x'));
    expect(peekB33(s)!.rom[pid][1]).toBe('secret');
    GB33.k = 50;
    try { s.week += 4; romanceMonth33(s); } finally { GB33.k = 1; }
    expect(peekB33(s)!.rom[pid][1]).toBe('public'); // vazou
  });

  it('ligado no jogo de verdade: 6 meses sem erro nem NaN, e as camadas andam', () => {
    const s = mk('g33b-run', 1985);
    for (const k of Object.values(SWB33)) setSw(s, k, true);
    for (let i = 0; i < 6; i++) advanceMonth(s);
    expect(JSON.stringify(s.x4.gente33b, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NaN!' : v))).not.toContain('NaN!');
    expect(Object.keys(peekB33(s)!.t).length).toBeGreaterThan(0);
    expect(Number.isFinite(s.player.cash)).toBe(true);
  });
});
