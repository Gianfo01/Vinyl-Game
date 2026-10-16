// R31 · onda 1 (EDT) — editores: editar dinheiro/pessoa/opinião muda o estado e marca a partida; desligado não faz nada;
import { notes } from '../src/sim/attention';
// exportar → importar base dá a mesma base; base inválida é recusada com mensagem; disparar evento pelo editor funciona.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { CATALOG_ACTS } from '../src/data/catalog';
import { EVENTS } from '../src/sim/events';
import { opinionOf } from '../src/sim/opinion';
import { ownerOf } from '../src/sim/sys/people/owner';
import { applyEdit, cheat31, editables, editorOn31, EDITOR_PREF31, isEdited31, registerEditable, registerRunnable, runEdit, runnables, setEditorOn, syncEditor31, edit31, myPersonId31 } from '../src/sim/r31/editor';
import { applyBase31, baseCode31, baseJson31, cleanBase31, emptyBase31, importBase31, mergeBases31, sameBase31, validateBase31, type BaseData31 } from '../src/sim/r31/base31';
import { CATALOG_LABELS } from '../src/data/catalog';
import { cityById } from '../src/data/world';
import { decodeSave20, encodeSave20 } from '../src/core/save20';
import { migrate } from '../src/ui/store';
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
    const before = s.decisions.length + notes(s).length;
    let fired = false;
    for (const e of EVENTS) {
      if (e.id.startsWith('sit17:')) continue;
      const r = runEdit(s, 'scene.event', undefined, e.id);
      if (r.ok) { fired = true; break; }
    }
    expect(fired).toBe(true);
    expect(s.decisions.length + notes(s).length).toBeGreaterThan(before);
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

  // ------------------------------------------------------------------ W1-REV2
  it('payload malicioso: __proto__/constructor/toString recusados, campos fora da lista não entram, Object.prototype intacto', () => {
    const evil = `{"v":1,"game":"31.1","name":"Mal","acts":{"__proto__":{"polluted":1},"5001":{"name":"Banda","genre":"rock","debut":1970,"city":"constructor","members":3,"__proto__":{"polluted":2},"extra":"x"}},`
      + `"labels":{"constructor":{"name":"Z"}},"cities":{"toString":{"w":1},"rio":{"name":{"pt":"Rio","en":"Rio"},"__proto__":{"polluted":3}}},"relics":{"x1":{"name":{"pt":"R","en":"R"},"year":1970,"kind":"toString","value":1}}}`;
    const r = importBase31(evil);
    expect(r.ok).toBe(false);
    const all = r.errors.map((e) => e.pt).join(' | ');
    expect(all).toMatch(/proibido ou inválido: "__proto__"/);
    expect(all).toMatch(/proibido ou inválido: "constructor"/);
    expect(all).toMatch(/cidade "constructor" não existe/);
    expect(all).toMatch(/tipo "toString" não existe/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // aplicar o mesmo payload (ex.: vindo de um save) não polui nada nem copia campos fora da lista
    applyBase31(JSON.parse(evil) as BaseData31);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(cityById.rio)).toBe(Object.prototype);
    expect('extra' in (CATALOG_ACTS.find((a) => a.no === 5001) ?? {})).toBe(false);
    const ok = JSON.parse(`{"v":1,"game":"31.1","name":"Ok","acts":{"5001":{"name":"Banda","genre":"rock","debut":1970,"city":"london","members":3,"extra":"x","__proto__":{"polluted":4}}},"labels":{},"cities":{},"relics":{}}`);
    const c = cleanBase31(ok);
    expect(c.base!.acts['5001']).toEqual({ city: 'london', debut: 1970, genre: 'rock', members: 3, name: 'Banda' });
    applyBase31(ok);
    const a = CATALOG_ACTS.find((x) => x.no === 5001)!;
    expect(Object.getPrototypeOf(a)).toBe(Object.prototype);
    expect('extra' in a).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    applyBase31(undefined);
    expect(CATALOG_ACTS.some((x) => x.no === 5001)).toBe(false);
  });

  it('entrada torta não lança: cidades com null, cenas que não são lista; código grande demais recusado', () => {
    const b = emptyBase31('Torta') as unknown as Record<string, Record<string, unknown>>;
    b.cities.rio = null;
    expect(() => validateBase31(b)).not.toThrow();
    expect(validateBase31(b).ok).toBe(false);
    const b2 = emptyBase31('Torta 2') as unknown as Record<string, Record<string, unknown>>;
    b2.cities.rio = { scenes: 'samba' };
    expect(validateBase31(b2).ok).toBe(false);
    expect(importBase31(JSON.stringify(b2)).ok).toBe(false);
    expect(validateBase31(null).ok).toBe(false);
    expect(validateBase31([]).ok).toBe(false);
    // bomba de LZW: poucos bytes que expandem para mais de 5 MB
    const codes: number[] = [];
    for (let i = 0; i < 6000; i++) codes.push(i === 0 ? 65 : 256 + i - 1); // cada código repete o anterior + 1 letra
    const bytes = new Uint8Array(codes.length * 2);
    codes.forEach((c, i) => { bytes[2 * i] = c >> 8; bytes[2 * i + 1] = c & 255; });
    let bin = ''; for (const x of bytes) bin += String.fromCharCode(x);
    const r = importBase31('M31B1:' + btoa(bin));
    expect(r.ok).toBe(false);
    expect(r.errors[0].pt).toMatch(/5 MB/);
  });

  it('mesma base com chaves em ordens diferentes: mesma forma canônica e mesmo mundo', () => {
    const mkA = (): BaseData31 => { const b = emptyBase31('Ordem'); b.labels.zz_nova = { name: 'Zeta Discos', city: 'london', founded: 1960, family: 'B', focus: [] }; b.labels.aa_nova = { name: 'Alfa Discos', city: 'rio', founded: 1961, family: 'A', focus: [] }; b.acts['5002'] = { name: 'Dois', genre: 'rock_br', debut: 1982, city: 'london', members: 2 }; b.acts['5001'] = { name: 'Um', genre: 'rock_br', debut: 1981, city: 'london', members: 1 }; return b; };
    const mkB = (): BaseData31 => { const b = emptyBase31('Ordem'); b.acts['5001'] = { members: 1, city: 'london', debut: 1981, genre: 'rock_br', name: 'Um' }; b.acts['5002'] = { name: 'Dois', genre: 'rock_br', debut: 1982, city: 'london', members: 2 }; b.labels.aa_nova = { focus: [], family: 'A', founded: 1961, city: 'rio', name: 'Alfa Discos' }; b.labels.zz_nova = { name: 'Zeta Discos', city: 'london', founded: 1960, family: 'B', focus: [] }; return b; };
    expect(validateBase31(mkA()).errors.map((e) => e.pt)).toEqual([]);
    const cfg = (b: BaseData31) => ({ ...defaultConfig('r31ord', { startYear: 1975 }), base31: { name: b.name, data: b } });
    const ga = createGame(cfg(mkA()));
    const la = CATALOG_LABELS.map((x) => x.id).join(',');
    const gb = createGame(cfg(mkB()));
    expect(CATALOG_LABELS.map((x) => x.id).join(',')).toBe(la);
    expect(JSON.stringify(gb.config.base31)).toBe(JSON.stringify(ga.config.base31));
    expect(Object.values(gb.labels).map((x) => x.name)).toEqual(Object.values(ga.labels).map((x) => x.name));
    expect(gb.upcoming.map((u) => u.name)).toEqual(ga.upcoming.map((u) => u.name));
    applyBase31(undefined);
  });

  it('a base não vaza entre partidas: carregar save sem base volta à original; save com base reaplica', () => {
    const b = sample();
    const withBase = createGame({ ...defaultConfig('r31leak', { startYear: 1990 }), base31: { name: b.name, data: b } });
    expect(CATALOG_ACTS[0].name).toBe('Ida Cipreste');
    expect(cityById.rio.name.pt).toBe('Rio de Janeiro (editado)');
    const txtWith = encodeSave20(withBase);
    const plain = createGame(defaultConfig('r31leak2', { startYear: 1990 }));
    const txtPlain = encodeSave20(plain);
    // volta a aplicar a base (como se a partida com base estivesse aberta) e carrega um save SEM base
    decodeSave20(txtWith, migrate);
    expect(CATALOG_ACTS[0].name).toBe('Ida Cipreste');
    decodeSave20(txtPlain, migrate);
    expect(CATALOG_ACTS[0].name).toBe('Ida Cypress');
    expect(cityById.rio.name.pt).not.toBe('Rio de Janeiro (editado)');
    expect(CATALOG_ACTS.some((a) => a.no === 5001)).toBe(false);
    // carregar o save COM base reaplica
    const g = decodeSave20(txtWith, migrate);
    expect(g.config.base31!.name).toBe('Brasil anos 80 turbinado');
    expect(CATALOG_ACTS[0].name).toBe('Ida Cipreste');
    expect(CATALOG_ACTS.some((a) => a.no === 5001)).toBe(true);
    applyBase31(undefined);
  });
});

describe('R31 EDT · modo editor (W1-REV2)', () => {
  it('trapaça exige o editor ligado; modo desligado vale para qualquer partida; carregar sincroniza', () => {
    const s = game('r31cheat');
    edit31(s).cheats.noExhaust = true;
    expect(cheat31(s, 'noExhaust')).toBe(false); // editor desligado: trapaça gravada fica inerte
    setEditorOn(s, true);
    expect(cheat31(s, 'noExhaust')).toBe(true);
    try {
      EDITOR_PREF31.on = false; // interface com o modo desligado
      expect(editorOn31(s)).toBe(false);
      expect(cheat31(s, 'noExhaust')).toBe(false);
      expect(applyEdit(s, 'money.company', 1).ok).toBe(false);
      syncEditor31(s);
      expect(edit31(s).on).toBe(false);
      EDITOR_PREF31.on = true;
      const t = game('r31cheat2'); // partida nova segue o modo
      expect(edit31(t).on).toBe(true);
    } finally { delete EDITOR_PREF31.on; }
  });
});
