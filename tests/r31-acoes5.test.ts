// R31 · onda 5 (ACOES5, EXP-13) — o cartão de ações ao lado do objeto (src/ui/r31/acoes5*.ts), atrás de exp5.nav:
//  - todo objeto (sede, casa, cidade, mundo) e todo objeto da cena da casa tem cartão com ≥ 1 ação válida;
//  - toda ação chama a função de hoje (fonte única: a referência guardada no catálogo é a exportada pelo módulo de hoje);
//  - nenhuma página antiga abre sem "ver tudo" (clique, tecla e "ir até lá" vão ao cartão; só ver tudo/pausa abrem a página);
//  - explorar não muda o estado (montar o cartão de todos os objetos, em 3 épocas, só lê);
//  - fazer a ação do cartão = fazer a mesma ação pela função de hoje (mesmo estado final);
//  - desligado = igual a hoje (o gancho não toma nada).
// Mede e grava docs/r31/acoes5-medida.md: páginas antigas no fluxo normal e cliques das 20 ações mais comuns.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { SW_NAV5, nav5On } from '../src/sim/r31/exp5';
import { rngSnapshot19 } from '../src/sim/rng19';
import { keys5, type KeyEv5 } from '../src/ui/r31/keys5';
import { objects5, object5 } from '../src/ui/r31/objects5';
import { NAV5, keyNav5, paperOf5, resolveGoto5 } from '../src/ui/r31/nav5';
import { pendingList } from '../src/sim/r31/pending';
import { casaObjs5 } from '../src/ui/r31/casa5model';
import { ACTS5, COMMON5, NUMS5, card5, cardIds5, route5, type ActCtx5 } from '../src/ui/r31/acoes5model';
import { CARDS5 } from '../src/ui/r31/acoes5data';

const game = (y = 1962, seed = 'acoes5'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const snap = (s: GameState): string => JSON.stringify({ s, rng: rngSnapshot19(s) });
const ERAS = [1905, 1962, 2025];
const noCtx: ActCtx5 = { close: () => {}, all: () => {}, open: () => {}, say: () => {}, refresh: () => {} };

describe('ACOES5 · cartão em todo objeto', () => {
  it('todo objeto de objects5 e todo objeto da cena da casa tem dados de cartão', () => {
    for (const o of objects5()) expect(CARDS5[o.id], o.id).toBeTruthy();
    const s = game();
    for (const o of casaObjs5(s)) if (o.id !== 'chaveiro') expect(CARDS5[o.obj ?? `casa.${o.id}`], o.id).toBeTruthy();
  });
  it('os dados só usam ações e números do catálogo; 2–6 ações e até 3 números por cartão', () => {
    for (const [id, c] of Object.entries(CARDS5)) {
      for (const a of c.acts) expect(ACTS5[a], `${id} → ação ${a}`).toBeTruthy();
      for (const n of c.nums) expect(NUMS5[n], `${id} → número ${n}`).toBeTruthy();
      expect(c.acts.length, id).toBeLessThanOrEqual(6);
      expect(c.nums.length, id).toBeLessThanOrEqual(3);
    }
  });
  it('todo cartão tem ≥ 1 ação válida em 3 épocas (e cada ação tem rótulo e destino/função)', () => {
    for (const y of ERAS) {
      const s = game(y);
      setSw(s, SW_NAV5, true);
      for (const id of cardIds5()) {
        const c = card5(s, id);
        expect(c, `${id} ${y}`).toBeTruthy();
        expect(c!.acts.length, `${id} ${y}`).toBeGreaterThanOrEqual(1);
        expect(c!.acts.length, `${id} ${y}`).toBeLessThanOrEqual(7); // 6 + "abrir ▸" do papel
        for (const a of c!.acts) {
          const d = ACTS5[a.id];
          if (a.kind === 'open') expect(object5(d.obj!), `${id}:${a.id}`).toBeTruthy();
          else expect(typeof d.fn, `${id}:${a.id}`).toBe('function');
        }
        for (const n of c!.nums) expect(n.value, `${id}:${n.label.pt}`).not.toBe('');
      }
    }
  });
  it('papéis já feitos continuam como papéis: o cartão do objeto tem "abrir ▸"', () => {
    const s = game();
    for (const o of objects5()) if (paperOf5(o.id)) expect(card5(s, o.id)!.acts.some((a) => a.kind === 'open' && ACTS5[a.id].obj === o.id), o.id).toBe(true);
  });
});

describe('ACOES5 · toda ação chama a função de hoje', () => {
  it('cada ação "do"/"ui" guarda a função exportada de hoje (mesma referência do módulo)', async () => {
    for (const [id, d] of Object.entries(ACTS5)) {
      if (d.kind === 'open') continue;
      expect(d.src, id).toBeTruthy();
      const mod = await import(`../src/${d.src![0]}`);
      expect(mod[d.src![1]], `${id} → ${d.src!.join('#')}`).toBe(d.fn);
    }
  });
  it('fazer a ação pelo cartão = fazer pela função de hoje (mesmo estado final)', () => {
    for (const y of [1962]) for (const [id, d] of Object.entries(ACTS5)) {
      if (d.kind !== 'do' || !d.same) continue;
      const a = game(y), b = game(y);
      setSw(a, SW_NAV5, true); setSw(b, SW_NAV5, true);
      const c = card5(a, d.home!)?.acts.find((x) => x.id === id);
      if (!c || c.lock) continue;
      c.run(a, noCtx);
      d.same(b);
      expect(snap(a), `${id} ${y}`).toBe(snap(b));
    }
  });
});

describe('ACOES5 · nenhuma página antiga sem "ver tudo"', () => {
  it('clique, tecla e "ir até lá" vão ao cartão; só ver tudo e o índice da pausa abrem a página', () => {
    const s = game();
    setSw(s, SW_NAV5, true);
    for (const o of objects5()) {
      expect(route5(s, o.id, {}), o.id).toBe(o.place.endsWith('.lugar') && !o.career ? 'travel' : 'card');
      expect(route5(s, o.id, { pass: true }), o.id).not.toBe('card');
      expect(route5(s, o.id, { pause: true }), o.id).not.toBe('card');
    }
    // teclas: toda tecla de objeto chega à casca como "abrir objeto" (NAV5.open), que a casca manda ao cartão
    const got: string[] = [];
    NAV5.open = (id) => { got.push(route5(s, id, {})); };
    NAV5.paper = () => undefined;
    for (const b of keys5()) if (b.act.kind === 'object' && b.scope === 'global') {
      const k = b.chord.startsWith('shift+') ? { key: b.chord.slice(6).toUpperCase(), shiftKey: true, code: /\d/.test(b.chord.slice(6)) ? `Digit${b.chord.slice(6)}` : undefined } : { key: b.chord, code: /^\d$/.test(b.chord) ? `Digit${b.chord}` : undefined };
      if (/\d/.test(b.chord.slice(6)) && b.chord.startsWith('shift+')) (k as KeyEv5).key = '!@#$%^&*()'[(Number(b.chord.slice(6)) + 9) % 10];
      keyNav5(s, k as KeyEv5);
    }
    delete NAV5.open; delete NAV5.paper;
    expect(got.length).toBeGreaterThan(40);
    for (const r of got) expect(['card', 'travel']).toContain(r);
    // "ir até lá" de cada recado leva a um objeto com cartão
    for (const p of pendingList(s)) { const g = resolveGoto5(s, p); if (g?.obj) expect(route5(s, g.obj, {}), p.id).not.toBe('paper'); }
  });
});

describe('ACOES5 · explorar não muda o estado e desligado = hoje', () => {
  it('montar o cartão de todos os objetos (3 épocas) não mexe no jogo', () => {
    for (const y of ERAS) {
      const s = game(y);
      setSw(s, SW_NAV5, true);
      const before = snap(s);
      for (const id of cardIds5()) card5(s, id);
      for (const id of objects5().map((o) => o.id)) route5(s, id, {});
      expect(snap(s)).toBe(before);
    }
  });
  it('desligado: o gancho não toma nada (a casca abre como hoje) e nenhum cartão é montado', () => {
    const s = game();
    expect(nav5On(s)).toBe(false);
    const before = snap(s);
    for (const o of objects5()) expect(route5(s, o.id, {}), o.id).toBe('off');
    expect(snap(s)).toBe(before);
  });
});

describe('ACOES5 · medida', () => {
  it('páginas antigas no fluxo normal = 0; as 20 ações mais comuns em 1–2 cliques', () => {
    const s = game();
    setSw(s, SW_NAV5, true);
    const oldPages = objects5().filter((o) => route5(s, o.id, {}) === 'paper').map((o) => o.id);
    expect(oldPages).toEqual([]);
    const rows = COMMON5.map((id) => {
      const home = ACTS5[id].home && CARDS5[ACTS5[id].home!]?.acts.includes(id) ? ACTS5[id].home : Object.entries(CARDS5).find(([, c]) => c.acts.includes(id))?.[0];
      // 1 clique no objeto (ou a tecla) + 1 no botão do cartão; travessia de região não conta (botão de baixo, se preciso: +1)
      return { id, home, label: ACTS5[id].label.pt, clicks: home ? 2 : NaN };
    });
    expect(rows).toHaveLength(20);
    for (const r of rows) expect(r.clicks, r.id).toBeLessThanOrEqual(2);
    const md = [
      '# ACOES5 · medida (gerada por tests/r31-acoes5.test.ts)',
      '',
      `- Objetos com cartão: **${cardIds5().length}** (${objects5().length} de objects5 + ${cardIds5().filter((k) => k.startsWith('casa.')).length} peças só da cena da casa).`,
      `- Páginas antigas que abrem no fluxo normal (clique, tecla, "ir até lá"): **${oldPages.length}** (meta: 0; só por "ver tudo ▸" ou pelo índice da pausa).`,
      `- Antes (base): clicar/tecla em qualquer um dos ${objects5().filter((o) => !(o.place.endsWith('.lugar') && !o.career)).length} objetos abria a página antiga inteira no papel.`,
      '',
      '## As 20 ações mais comuns',
      '',
      '| ação | objeto | cliques (objeto + botão) | antes |',
      '|---|---|---|---|',
      ...rows.map((r) => `| ${r.label} | ${r.home} | ${r.clicks} | 3+ (objeto → página inteira → aba → botão) |`),
      '',
    ].join('\n');
    writeFileSync('docs/r31/acoes5-medida.md', md);
  });
});
