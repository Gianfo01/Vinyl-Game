// R31 · onda 5 (NAV) — a casca do jogo explorável (src/ui/r31/shell5.ts, sede5.ts, nav5.ts, keys5.ts) atrás de exp5.nav:
//  - desligado = igual a hoje (nenhuma tecla é tomada, nenhum gancho é chamado, a casca não desenha);
//  - toda tecla do mapa abre o objeto certo (objeto, marcador, viagem, sistema);
//  - toda página antiga é alcançável em ≤ 2 cliques ou 1 tecla; todo objeto da sede está na cena ou na lista da sala;
//  - explorar não muda o estado (abrir, viajar, "!", índice, ir até lá, cena da sede).
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { SW_NAV5, nav5On, pocketAdd5 } from '../src/sim/r31/exp5';
import { pendingList } from '../src/sim/r31/pending';
import { rngSnapshot19 } from '../src/sim/rng19';
import { ALL_AREAS29 } from '../src/ui/ps/route29model';
import { chordOf5, keys5, type Bind5, type KeyEv5, type Region5 } from '../src/ui/r31/keys5';
import { PAUSE5, objects5, object5, ownerOf5, type Open5 } from '../src/ui/r31/objects5';
import { NAV5, REGIONS5, bangs5, index5, keyNav5, pocketView5, reach5, resolveGoto5, target5, travel5, travelTarget5 } from '../src/ui/r31/nav5';
import { SEDE_OBJS5, sedeHas5, sedeLay5 } from '../src/ui/r31/sede5';
import { plan27 } from '../src/ui/ps/hqpx27';

const game = (y = 1962, seed = 'nav5'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));

/** Tecla no formato de keys5 → evento de teclado como o navegador entrega. */
function evOf(chord: string): KeyEv5 {
  if (chord === 'escape') return { key: 'Escape' };
  if (chord === 'tab') return { key: 'Tab' };
  if (chord === 'enter') return { key: 'Enter' };
  if (chord === 'alt') return { key: 'Alt', altKey: true };
  if (chord.startsWith('ctrl+')) { const k = chord.slice(5); return { key: k === 'enter' ? 'Enter' : k, ctrlKey: true }; }
  if (chord.startsWith('shift+')) {
    const k = chord.slice(6);
    return /\d/.test(k) ? { key: '!@#$%^&*()'[(Number(k) + 9) % 10], code: `Digit${k}`, shiftKey: true } : { key: k.toUpperCase(), shiftKey: true };
  }
  if (/^\d$/.test(chord)) return { key: chord, code: `Digit${chord}` };
  return { key: chord };
}

type Call = { kind: 'open'; id: string; t: Open5 } | { kind: 'go'; t: Open5 } | { kind: 'travel'; r: Region5 } | { kind: 'pause' } | { kind: 'help' };
let calls: Call[] = [];
const hook = (): void => {
  calls = [];
  NAV5.open = (id, t) => { calls.push({ kind: 'open', id, t }); };
  NAV5.go = (t) => { calls.push({ kind: 'go', t }); };
  NAV5.travel = (r) => { calls.push({ kind: 'travel', r }); };
  NAV5.pause = () => { calls.push({ kind: 'pause' }); };
  NAV5.help = () => { calls.push({ kind: 'help' }); };
  NAV5.paper = () => undefined;
};
afterEach(() => { for (const k of Object.keys(NAV5)) delete (NAV5 as Record<string, unknown>)[k]; });

const snap = (s: GameState): string => JSON.stringify({ s, rng: rngSnapshot19(s) });

describe('NAV · exp5.nav desligado = igual a hoje', () => {
  it('interruptor nasce desligado e nenhuma tecla do mapa é tomada', () => {
    const s = game();
    expect(nav5On(s)).toBe(false);
    hook();
    const before = snap(s);
    for (const b of keys5()) expect(keyNav5(s, evOf(b.chord)), b.id).toBe(false);
    for (const k of ['a', 'z', 'Escape', '?', 'h', 'Tab', '1', '{']) expect(keyNav5(s, { key: k })).toBe(false);
    expect(calls).toEqual([]);
    expect(snap(s)).toBe(before);
  });
});

describe('NAV · teclas (exp5.nav ligado)', () => {
  let s: GameState;
  beforeAll(() => { s = game(); setSw(s, SW_NAV5, true); });

  it('o evento de cada tecla do mapa volta a ser a mesma tecla', () => {
    for (const b of keys5()) if (b.chord !== 'alt') expect(chordOf5(evOf(b.chord)), b.id).toBe(b.chord);
  });

  it('toda tecla de objeto abre o próprio objeto no marcador certo', () => {
    const objs = keys5().filter((b): b is Bind5 & { act: { kind: 'object'; id: string } } => b.scope === 'global' && b.act.kind === 'object');
    expect(objs.length).toBeGreaterThan(60);
    for (const b of objs) {
      hook();
      expect(keyNav5(s, evOf(b.chord)), b.id).toBe(true);
      expect(calls, b.id).toEqual([{ kind: 'open', id: b.act.id, t: target5(b.act.id) }]);
    }
  });

  it('teclas de marcador abrem o objeto dono já no marcador; viagem e H viajam; Esc pausa; ? ajuda', () => {
    for (const b of keys5().filter((x) => x.scope === 'global')) {
      hook();
      const a = b.act;
      const ok = keyNav5(s, evOf(b.chord));
      if (a.kind === 'marker') { expect(ok).toBe(true); expect(calls[0]).toMatchObject({ kind: 'open', id: a.obj, t: { area: a.area } }); }
      if (a.kind === 'travel') { expect(ok).toBe(true); expect(calls).toEqual([{ kind: 'travel', r: a.id }]); }
      if (a.kind === 'sys' && a.id === 'pause') expect(calls).toEqual([{ kind: 'pause' }]);
      if (a.kind === 'sys' && a.id === 'keys') expect(calls).toEqual([{ kind: 'help' }]);
    }
  });

  it('com a caixa de entrada aberta, as teclas dela ganham das globais (não abrem outro objeto)', () => {
    hook();
    NAV5.paper = () => 'correspondencia';
    for (const k of ['j', 'k', 'e', 's']) expect(keyNav5(s, { key: k }), k).toBe(false);
    expect(calls).toEqual([]);
  });

  it('a viagem leva à região certa (Sede = sede da carreira principal)', () => {
    expect(travel5(s).map((x) => x.id)).toEqual(REGIONS5);
    expect(travelTarget5(s, 'casa').area).toBe('casa31');
    expect(travelTarget5(s, 'cidade').area).toBe('campus18');
  });
});

describe('NAV · alcance', () => {
  it('toda página antiga é alcançável em ≤ 2 cliques (pausa › índice) ou 1 tecla', () => {
    const pages = new Set<string>([...objects5().flatMap((o) => o.opens.map((x) => x.area)), ...Object.keys(PAUSE5)]);
    for (const a of ALL_AREAS29) if (ownerOf5(a) || PAUSE5[a]) pages.add(a);
    let keys = 0;
    for (const a of pages) {
      const r = reach5(a);
      expect(r, a).toBeDefined();
      if (r!.key) keys++; else expect(r!.clicks, a).toBeLessThanOrEqual(2);
    }
    expect(keys).toBeGreaterThan(60);
    // o índice da pausa tem toda página (uma vez só)
    const ix = index5().map((x) => x.open.area);
    expect(new Set(ix).size).toBe(ix.length);
    for (const a of pages) expect(ix, a).toContain(a);
  });

  it('todo objeto da sede está desenhado na cena ou na lista da sala (2 cliques), em todos os tamanhos de sede', () => {
    const s = game(1985);
    for (const hq of [1, 2, 3, 4, 5]) for (const y of [1905, 1962, 1985, 2025]) {
      const lay = sedeLay5(plan27({ hq, year: y }), sedeHas5(s));
      const listed = new Set(lay.rooms.flatMap((r) => r.objs));
      for (const [id] of SEDE_OBJS5) if (id !== 'chaveiro') expect(listed.has(id), `${hq}/${y}/${id}`).toBe(true);
      // desenhados não se sobrepõem (fora os pontos sobre a mobília da sala) e ficam dentro da sala
      const art = lay.items.filter((x) => x.art);
      for (const it of art) {
        const c = lay.rooms.find((r) => r.kind === it.room)!.cell;
        expect(it.x >= c.x && it.x + it.w <= c.x + c.w && it.y >= c.y && it.y + it.h <= c.y + c.h, `${hq}/${y}/${it.id} dentro`).toBe(true);
        for (const o of art) if (o !== it && o.room === it.room && it.mount !== 'desk' && o.mount !== 'desk') {
          const sep = it.x + it.w <= o.x || o.x + o.w <= it.x || it.y + it.h <= o.y || o.y + o.h <= it.y;
          expect(sep, `${hq}/${y}: ${it.id} × ${o.id}`).toBe(true);
        }
      }
      for (const it of lay.items) expect(object5(it.id), it.id).toBeDefined();
    }
  });
});

describe('NAV · explorar não muda o estado', () => {
  it('abrir, viajar, "!", índice, bolso (só leitura), ir até lá e a cena da sede não mexem no jogo', () => {
    const s = game(1962, 'nav5x');
    setSw(s, SW_NAV5, true);
    pocketAdd5(s, 'livrocaixa');
    const before = snap(s);
    hook();
    bangs5(s); travel5(s); pocketView5(s); index5();
    for (const r of REGIONS5) travelTarget5(s, r);
    for (const p of pendingList(s)) resolveGoto5(s, p);
    for (const b of keys5()) keyNav5(s, evOf(b.chord));
    for (const hq of [1, 3, 5]) sedeLay5(plan27({ hq, year: s.year }), sedeHas5(s));
    expect(snap(s)).toBe(before);
  });
});
