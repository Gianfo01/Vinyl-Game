// R31 · onda 5 (CASA) — a casa como "Você" (EXP-6) e a sede que cresce (EXP-5), atrás de exp5.nav (DESLIGADO).
// Garante: tudo o que a entrada "Você" alcança hoje é alcançável por um objeto da casa (em toda moradia e época);
// a sede só mostra objetos de funções que existem; desligado = menu igual a hoje; explorar não muda o estado;
// a pintura da casa é determinística e cada objeto tem lugar próprio (sem sobrepor outro).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { nav5On } from '../src/sim/r31/exp5';
import { HOUSES, ownerOf } from '../src/sim/sys/people/owner';
import { grantRoom27 } from '../src/sim/sys/hqrooms27';
import { ENTRIES31, PLACES31, entryHome31, entryLabel31, type MenuCtx31 } from '../src/ui/ps/menu31';
import { TABS_REG27 } from '../src/ui/ps/tabsreg27';
import { plan27 } from '../src/ui/ps/hqpx27';
import {
  DWELL5, casaAreas5, casaObjs5, dwellOfHouse5, houses5, mainHome5, maquete5, nextKey5, sedeObjs5, sedeStage5, stageOfHq5, units5, type Dwell5,
} from '../src/ui/r31/casa5model';
import { paintCasa5 } from '../src/ui/r31/casa5px';

const game = (y = 1962, seed = 'casa5'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const HOUSE_OF: Record<Dwell5, string | null> = { aluguel: null, apartamento: 'apartment', casa: 'suburb', mansao: 'modernist' };
const live = (s: GameState, d: Dwell5) => { ownerOf(s).house = HOUSE_OF[d] ? HOUSES.findIndex((x) => x.id === HOUSE_OF[d]) : -1; };

describe('casa como "Você"', () => {
  const voce = new Set(PLACES31.filter((p) => p.entry === 'voce').flatMap((p) => p.areas));
  it('tudo da entrada Você é alcançável por um objeto da casa, em toda moradia e época', () => {
    expect(voce.size).toBeGreaterThan(5);
    for (const y of [1905, 1962, 1975, 2025]) {
      const s = game(y);
      for (const d of DWELL5) {
        live(s, d);
        expect(mainHome5(s).dwell).toBe(d);
        const got = casaAreas5(casaObjs5(s));
        for (const a of voce) expect(got.has(a), `${a} em ${d}/${y}`).toBe(true);
      }
    }
  });
  it('a ficha (espelho) leva a todas as abas da página Você (o Diário mudou para a gaveta da sede)', () => {
    const s = game();
    const esp = casaObjs5(s).find((o) => o.id === 'espelho')!;
    const tabs = new Set(esp.go.flatMap((g) => g.tabs ?? []).map(([, v]) => v));
    for (const r of TABS_REG27.filter((x) => x[0] === 'you' && x[2] !== 'diary')) expect(tabs.has(r[2]), r[2]).toBe(true);
  });
  it('a casa muda com a moradia: garagem e cofre só em casa/mansão; escritório em casa só na mansão; quarto das crianças só com filhos', () => {
    const s = game(1975);
    const ids = (d: Dwell5) => { live(s, d); return new Set(casaObjs5(s).map((o) => o.id)); };
    expect(ids('aluguel').has('garagem')).toBe(false);
    expect(ids('aluguel').has('sofa')).toBe(false);
    expect(ids('casa').has('garagem')).toBe(true);
    expect(ids('mansao').has('escritoriocasa')).toBe(true);
    expect(ids('apartamento').has('escritoriocasa')).toBe(false);
    const kids = ownerOf(s).kids;
    kids.length = 0;
    expect(ids('casa').has('criancas')).toBe(false);
    kids.push({ name: 'Bia', born: 1970 } as (typeof kids)[number]);
    expect(ids('casa').has('criancas')).toBe(true);
    kids.length = 0;
  });
  it('moradia do catálogo: todas as casas têm tipo; sem casa = aluguel', () => {
    expect(dwellOfHouse5(-1)).toBe('aluguel');
    for (let i = 0; i < HOUSES.length; i++) expect(DWELL5).toContain(dwellOfHouse5(i));
  });
  it('chaveiro: casa, imóveis fora, sede e casas de carreira; Tab dá a volta', () => {
    const s = game();
    const ks = houses5(s);
    expect(ks[0].kind).toBe('home');
    expect(ks.some((k) => k.kind === 'sede')).toBe(true);
    expect(nextKey5(ks, ks[ks.length - 1].key).key).toBe(ks[0].key);
  });
  it('pintura determinística, com cada objeto num lugar próprio (pontos sem sobrepor) e cena no chão', () => {
    for (const [y, d] of [[1905, 'aluguel'], [1975, 'apartamento'], [1962, 'casa'], [2025, 'mansao']] as [number, Dwell5][]) {
      const s = game(y);
      live(s, d);
      const os = casaObjs5(s);
      const a = { year: y, month: 6, city: s.config.homeCity, dwell: d, seed: 41, items: os.map((o) => ({ id: o.id, art: o.art, room: o.room })), cars: 1, carYears: [y], gold: 2 };
      const p1 = paintCasa5(a), p2 = paintCasa5(a);
      expect([...p1.px.d]).toEqual([...p2.px.d]);
      const sp = p1.spots.filter((x) => x.id !== 'janela');
      for (const o of os.filter((x) => !['voce', 'chaveiro', 'discos', 'sofa', 'garagem'].includes(x.id))) expect(p1.spots.some((x) => x.id === o.id), `${o.id} em ${d}`).toBe(true);
      for (const x of sp) for (const z of sp) if (x !== z) {
        const ov = Math.max(0, Math.min(x.x + x.w, z.x + z.w) - Math.max(x.x, z.x)) * Math.max(0, Math.min(x.y + x.h, z.y + z.h) - Math.max(x.y, z.y));
        expect(ov, `${x.id}×${z.id} em ${d}`).toBeLessThanOrEqual(Math.min(x.w * x.h, z.w * z.h) * 0.15);
      }
      for (const x of p1.spots) { expect(x.x).toBeGreaterThanOrEqual(0); expect(x.x + x.w).toBeLessThanOrEqual(p1.W); expect(x.y + x.h).toBeLessThanOrEqual(p1.fy + 2); }
    }
  });
});

describe('sede que cresce', () => {
  it('degraus: garagem → escritório → andar → prédio pelo nível da sede', () => {
    expect([0, 1, 2, 3, 4, 5].map(stageOfHq5)).toEqual(['garagem', 'escritorio', 'andar', 'predio', 'predio', 'predio']);
    const s = game(1975);
    s.player.hq = 0;
    expect(sedeStage5(s)).toBe('garagem');
  });
  it('só mostra objetos de funções que existem (sala aberta na planta; sem palco não há palco de ensaio)', () => {
    const s = game(1975);
    for (const hq of [0, 1, 2, 3, 4]) {
      s.player.hq = hq;
      const rooms = sedeObjs5(s);
      const kinds = new Set(plan27({ hq, year: s.year, units: units5(s) }).cells.filter((c) => !c.lock).map((c) => c.kind));
      for (const r of rooms) { if (!r.open) expect(r.objs).toEqual([]); else expect(kinds.has(r.kind)).toBe(true); }
      const all = rooms.flatMap((r) => r.objs.map((o) => o.id));
      expect(new Set(all).size).toBe(all.length); // cada objeto uma vez
      expect(all.includes('palco')).toBe(kinds.has('stage') || kinds.has('rehearsal'));
      expect(all.includes('mesasom')).toBe(kinds.has('studio'));
      expect(all).toContain('livrocaixa');
    }
    s.player.hq = 0;
    expect(sedeObjs5(s).flatMap((r) => r.objs).some((o) => o.id === 'palco')).toBe(false);
  });
  it('sala comprada aparece com os objetos dela; página que não existe some', () => {
    const s = game(1975);
    s.player.hq = 3;
    const before = sedeObjs5(s).find((r) => r.kind === 'meeting')!;
    expect(before.open).toBe(false);
    grantRoom27(s, 'meeting');
    const after = sedeObjs5(s).find((r) => r.kind === 'meeting')!;
    expect(after.open).toBe(true);
    expect(after.objs.map((o) => o.id)).toContain('maquete');
    const sem = sedeObjs5(s, (a) => a !== 'finance').flatMap((r) => r.objs.map((o) => o.id));
    expect(sem).not.toContain('livrocaixa');
  });
  it('maquete: próximo passo com o custo da ampliação de hoje e o motivo do bloqueio', () => {
    const s = game(1962);
    s.player.hq = 1;
    const m = maquete5(s);
    expect(m.steps.find((x) => x.now)!.lv).toBe(1);
    expect(m.next!.lv).toBe(2);
    expect(m.next!.cost).toBeGreaterThan(0);
    s.player.hq = 3; // torre exige 1968 + reputação
    expect(maquete5(s).next!.blocked).not.toBeNull();
  });
});

describe('desligado = igual a hoje; explorar não muda o mundo', () => {
  it('exp5.nav começa desligado e o menu é o de hoje (Você → página Você)', () => {
    const s = game();
    expect(nav5On(s)).toBe(false);
    const ctx: MenuCtx31 = { active: ['label'] };
    expect(entryHome31('voce', ctx)).toBe('you');
    expect(ENTRIES31.find((e) => e.id === 'voce')!.home).toBe('you');
    // POL5: o desvio temporário do menu (Você → Casa) saiu; com exp5.nav a casa é o botão de viagem da casca
    expect(entryLabel31('voce', ctx).pt).not.toBe('Casa');
  });
  it('montar a casa, a sede e a maquete não muda o estado', () => {
    const s = game(1975);
    const run = () => {
      for (const k of houses5(s)) if (k.home) casaObjs5(s, k.home);
      sedeObjs5(s); maquete5(s); units5(s); houses5(s);
    };
    run(); // aquece os estados preguiçosos (ext4) como o jogo faz ao abrir qualquer página
    const before = JSON.stringify(s);
    run(); run();
    expect(JSON.stringify(s)).toBe(before);
  });
});
