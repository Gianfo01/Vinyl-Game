// R31 · onda 1 (EDT) — editores: editar dinheiro/pessoa/opinião muda o estado e marca a partida; desligado não faz nada;
// exportar → importar base dá a mesma base; base inválida é recusada com mensagem; disparar evento pelo editor funciona.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { CATALOG_ACTS } from '../src/data/catalog';
import { EVENTS } from '../src/sim/events';
import { opinionOf } from '../src/sim/opinion';
import { ownerOf } from '../src/sim/sys/people/owner';
import { applyEdit, editables, isEdited31, registerEditable, registerRunnable, runEdit, runnables, setEditorOn, edit31, myPersonId31 } from '../src/sim/r31/editor';
import { applyBase31, baseCode31, baseJson31, emptyBase31, importBase31, mergeBases31, sameBase31, validateBase31, type BaseData31 } from '../src/sim/r31/base31';
import { l } from '../src/data/world';
import type { GameState } from '../src/sim/types';

const game = (seed = 'r31edit'): GameState => createGame(defaultConfig(seed, { startYear: 1975 }));
const someone = (s: GameState): string => Object.values(s.persons).find((p) => p.alive && !p.isPlayer && p.id !== myPersonId31(s))!.id;

describe('R31 EDT · editor dentro da partida', () => {
  it('desligado não faz nada', () => {
    const s = game();
    const cash = s.player.cash;
    const r = applyEdit(s, 'money.company', cash + 500000);
    expect(r.ok).toBe(false);
    expect(s.player.cash).toBe(cash);
    expect(isEdited31(s)).toBe(false);
    expect(runEdit(s, 'careers.all').ok).toBe(false);
  });

  it('dinheiro da empresa (pelo livro-caixa) e pessoal mudam o estado, marcam a partida e entram no diário', () => {
    const s = game();
    setEditorOn(s, true);
    expect(isEdited31(s)).toBe(false); // ligar não marca
    const cash = s.player.cash;
    expect(applyEdit(s, 'money.company', cash + 1_000_000).ok).toBe(true);
    expect(s.player.cash).toBe(cash + 1_000_000);
    expect(s.ledger.some((x) => x.cat === 'owner_capital' && x.amount === 1_000_000)).toBe(true);
    expect(applyEdit(s, 'money.personal', 77_700).ok).toBe(true);
    expect(ownerOf(s).wealth).toBe(77_700);
    expect(isEdited31(s)).toBe(true);
    expect(edit31(s).log.length).toBe(2);
    expect(s.memory.filter((m) => m.text.pt.startsWith('Editado pelo editor')).length).toBe(2);
  });

  it('pessoa: humor e opinião (pela fonte única) mudam e marcam', () => {
    const s = game();
    setEditorOn(s, true);
    const pid = someone(s);
    expect(applyEdit(s, 'person.morale', 13, pid).ok).toBe(true);
    expect(s.persons[pid].morale).toBe(13);
    expect(applyEdit(s, 'person.opinion', 64, pid).ok).toBe(true);
    expect(opinionOf(s, `p:${pid}`)).toBe(64);
    expect(applyEdit(s, 'person.morale', 13).ok).toBe(false); // sem alvo
    expect(isEdited31(s)).toBe(true);
    expect(edit31(s).log.map((x) => x.id)).toEqual(['person.morale', 'person.opinion']);
  });

  it('assumir uma gravadora rival e liberar todas as carreiras', () => {
    const s = game();
    setEditorOn(s, true);
    const lb = Object.values(s.labels).find((x) => x.active && x.roster.length > 0)!;
    const roster = [...lb.roster];
    expect(runEdit(s, 'label.takeover', lb.id).ok).toBe(true);
    expect(lb.active).toBe(false);
    for (const id of roster) if (s.acts[id].contractId) expect(s.acts[id].owner).toBe('player');
    expect(runEdit(s, 'careers.all').ok).toBe(true);
  });

  it('disparar evento pelo editor funciona', () => {
    const s = game();
    setEditorOn(s, true);
    const before = s.decisions.length + s.notifications.length;
    let fired = false;
    for (const e of EVENTS) {
      if (e.id.startsWith('sit17:')) continue;
      const r = runEdit(s, 'scene.event', undefined, e.id);
      if (r.ok) { fired = true; break; }
    }
    expect(fired).toBe(true);
    expect(s.decisions.length + s.notifications.length).toBeGreaterThan(before);
  });

  it('registro aberto: sistemas novos registram editáveis e executáveis', () => {
    let n = 0;
    registerEditable({ id: 'test.x', area: 'tools', label: l('X', 'X'), kind: 'number', get: () => n, set: (_s, v) => { n = Number(v); } });
    registerRunnable({ id: 'test.run', label: l('Rodar', 'Run'), run: () => { n = 99; } });
    expect(editables('tools').some((e) => e.id === 'test.x')).toBe(true);
    expect(runnables().some((r) => r.id === 'test.run')).toBe(true);
    const s = game();
    setEditorOn(s, true);
    expect(applyEdit(s, 'test.x', 5).ok).toBe(true);
    expect(n).toBe(5);
    expect(runEdit(s, 'test.run').ok).toBe(true);
    expect(n).toBe(99);
    // os sistemas principais já estão registrados
    for (const a of ['money', 'people', 'companies', 'careers', 'items', 'scenes', 'world', 'tools']) expect(editables(a).length + runnables(a).length).toBeGreaterThan(0);
  });
});

describe('R31 EDT · editor de base', () => {
  const sample = (): BaseData31 => {
    const b = emptyBase31('Brasil anos 80 turbinado');
    b.acts[String(CATALOG_ACTS[0].no)] = { name: 'Ida Cipreste', city: 'rio' };
    b.acts['5001'] = { name: 'Banda do Editor', genre: 'rock_br', debut: 1982, city: 'sao_paulo', members: 4 };
    b.acts[String(CATALOG_ACTS[1].no)] = null;
    b.labels.imperial = { name: 'Imperial Discos' };
    b.cities.rio = { name: l('Rio de Janeiro (editado)', 'Rio (edited)') };
    b.relics.lucille = { value: 9999 };
    return b;
  };

  it('base válida passa; exportar → importar (arquivo e código) dá a mesma base', () => {
    const b = sample();
    expect(validateBase31(b)).toEqual({ ok: true, errors: [] });
    const viaJson = importBase31(baseJson31(b));
    expect(viaJson.ok).toBe(true);
    expect(sameBase31(viaJson.base!, b)).toBe(true);
    const code = baseCode31(b);
    expect(code.startsWith('M31B1:')).toBe(true);
    const viaCode = importBase31(code);
    expect(viaCode.ok).toBe(true);
    expect(sameBase31(viaCode.base!, b)).toBe(true);
    expect(viaCode.summary!.pt).toMatch(/Artistas: 1 mudados, 1 novos, 1 removidos/);
  });

  it('base inválida é recusada com mensagem', () => {
    const b = emptyBase31('Ruim');
    b.acts['5002'] = { name: 'Banda Fantasma', genre: 'genero_inexistente', debut: 3020, city: 'atlantida', members: 0 };
    b.acts['5003'] = { name: 'Banda Fantasma', genre: 'rock_br', debut: 1990, city: 'rio', members: 3 };
    const r = importBase31(JSON.stringify(b));
    expect(r.ok).toBe(false);
    const all = r.errors.map((e) => e.pt).join(' | ');
    expect(all).toMatch(/gênero "genero_inexistente" não existe/);
    expect(all).toMatch(/cidade "atlantida" não existe/);
    expect(all).toMatch(/3020 é impossível/);
    expect(all).toMatch(/Nome repetido/);
    expect(importBase31('lixo').ok).toBe(false);
    expect(importBase31('M31B1:@@@').ok).toBe(false);
  });

  it('juntar bases: a última ganha', () => {
    const a = emptyBase31('A'); a.acts['5001'] = { name: 'X', genre: 'rock', debut: 1970, city: 'london', members: 3 };
    const b = emptyBase31('B'); b.acts['5001'] = { name: 'Y' }; b.labels.nova = null;
    const m = mergeBases31('A+B', a, b);
    expect(m.acts['5001']).toEqual({ name: 'Y', genre: 'rock', debut: 1970, city: 'london', members: 3 });
    expect(m.labels.nova).toBeNull();
  });

  it('nova partida com a base: marcada, nomes aplicados e determinística; sem base volta à original', () => {
    const b = sample();
    const mk = () => createGame({ ...defaultConfig('r31base', { startYear: 1990 }), base31: { name: b.name, data: b } });
    const s1 = mk();
    expect(isEdited31(s1)).toBe(true);
    expect(s1.config.base31!.name).toBe('Brasil anos 80 turbinado');
    const s2 = mk();
    expect(Object.values(s2.acts).map((a) => a.name)).toEqual(Object.values(s1.acts).map((a) => a.name));
    expect(Object.values(s1.acts).some((a) => a.name === 'Banda do Editor') || s1.upcoming.some((u) => u.name === 'Banda do Editor')).toBe(true);
    const s3 = game();
    expect(CATALOG_ACTS[0].name).toBe('Ida Cypress');
    expect(isEdited31(s3)).toBe(false);
    applyBase31(undefined);
  });
});
