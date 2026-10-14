// Rodada 29 (menus e dados crus) — pedidos do autor:
// (1) os dropdowns (seções) do menu de clique direito começam TODOS recolhidos; digitar filtra e abre as seções com
//     resultado; (2) clique direito onde faltava (novos tipos: festival, premiação, relíquia, movimento; rede de
//     segurança pelo nome exato); (3) sem ações → botão "Ações…" desabilitado e clique direito sem menu vazio;
// (4) nada de dado cru na tela ("Mais dados · person", "real27 · prov", "roles27: rhythm, piano, harmonica",
//     "ability18.p", ids 'p:…', chaves snake_case, undefined/NaN…). A parte de tela fica em scripts/r29/rawscan.mjs
//     (Playwright); aqui vai a parte pura: o MESMO detector (ps/raw29.rawHits29), os nomes traduzidos e os modelos.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { FESTIVALS } from '../src/data/catalog';
import { gfName } from '../src/data/world';
import { relics } from '../src/sim/sys/relics9';
import type { GameState } from '../src/sim/types';
import { NO_ACTIONS29, ctxMenu27, liveCount29, menuSections27, nameHit29, nameIndex29, type CtxEnv27, type CtxMenu27 } from '../src/ui/ps/ctx27model';
import { ENTS27, isEnt27 } from '../src/ui/ps/ent27';
import { awardTxt29, keyEnt29, keyName29, rawHits29, roleName29, rolesTxt29 } from '../src/ui/ps/raw29';

const ENV: CtxEnv27 = { has: (f) => f !== 'songmarket' };
const pt = (x: { pt: string } | string | null | undefined) => (typeof x === 'string' ? x : x?.pt ?? '');
const ids = (m: CtxMenu27 | null) => (m ? m.items.map((x) => x.id) : []);
const kinds = (txt: string) => rawHits29(txt).map((x) => x.kind);
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
}
const SRC = (f: string) => readFileSync(join(__dirname, '../src', f), 'utf8');

// ================================================================ (4) detector de dado cru

describe('r29 (4) — detector de dado cru (o mesmo da varredura de tela)', () => {
  it('pega o que o autor viu na ficha da pessoa', () => {
    expect(kinds('Mais dados · person')).toContain('despejo');
    expect(kinds('Mais dados · ability18.p')).toEqual(expect.arrayContaining(['despejo', 'modulo']));
    expect(kinds('real27 · prov: c')).toContain('modulo');
    expect(kinds('roles27: rhythm, piano, harmonica')).toEqual(expect.arrayContaining(['modulo', 'enum']));
    expect(kinds('rhythm')).toContain('enum');
  });
  it('pega lixo, ids com prefixo, chaves internas', () => {
    for (const x of ['undefined', 'Fama: NaN', '[object Object]', 'valor: null']) expect(kinds(x), x).toContain('lixo');
    expect(kinds('Paul McCartney → p:p5y: elogiou')).toContain('id');
    expect(kinds('other_income')).toContain('snake_case');
    expect(kinds('Convite: residência na cena pop_rock de Liverpool')).toContain('snake_case');
    expect(kinds('lowMoraleMonths: 3')).toContain('camelCase');
  });
  it('não acusa texto normal (jargão, marcas, verbos)', () => {
    for (const x of ['Guitarra base, Piano, Gaita', 'split assinado', 'Autores (split)', 'estresse, vício e burnout travam', 'Tributos nascem quando um artista famoso some',
      'Vendas no iPod e no iTunes', 'MP3 e CD', 'R$ 1.000', 'Paul McCartney → John Lennon: elogiou', 'Pop rock', 'Rock\'n\'roll', 'A&R e elenco']) expect(rawHits29(x), x).toEqual([]);
  });
});

describe('r29 (4) — nomes traduzidos no lugar das chaves', () => {
  let s: GameState;
  beforeAll(() => { s = createGame(defaultConfig('r29-raw', { startYear: 1975, scenario: 'established', realNames: true })); });

  it('funções de integrante, gêneros e famílias', () => {
    expect(rolesTxt29(['rhythm', 'piano', 'harmonica'])).not.toMatch(/rhythm|harmonica/);
    expect(rawHits29(rolesTxt29(['rhythm', 'piano', 'harmonica']))).toEqual([]);
    expect(pt(roleName29('drums'))).not.toBe('drums');
    expect(pt(gfName('pop_rock'))).toBe('Pop rock');
    expect(pt(gfName('blues_jazz'))).toMatch(/Blues e jazz/);
    expect(pt(gfName('foo_bar'))).toBe('foo bar'); // desconhecido: legível, sem sublinhado
  });
  it('chaves de pessoa nunca aparecem cruas; marcam o clique direito certo', () => {
    const a = Object.values(s.acts).find((x) => x.members.length)!;
    const pid = a.members[0];
    expect(keyName29(s, `p:${pid}`)).toBe(s.persons[pid].name);
    expect(keyName29(s, 'p:naoexiste')).not.toMatch(/p:/);
    expect(keyEnt29(s, a.id)).toEqual({ 'data-ent': 'act', 'data-id': a.id });
    expect(keyEnt29(s, `p:${pid}`)).toEqual({ 'data-ent': 'person', 'data-id': `p:${pid}` });
  });
  it('prêmio do livro único: só a língua da tela, sem o id da categoria', () => {
    expect(awardTxt29({ name: 'Prêmios Palco Europeu / European Stage Awards: Sofia Rotaru — Hold On' })).toBe('Prêmios Palco Europeu: Sofia Rotaru — Hold On');
    expect(awardTxt29({ name: 'Disco de Ouro' })).toBe('Disco de Ouro');
  });
  it('o despejo genérico "Mais dados" saiu da ficha (dossiê da pessoa)', () => {
    const src = SRC('ui/sys/dossier13.ts');
    expect(src).not.toMatch(/l\('Mais dados'/); // o comentário pode citar; o texto da tela não existe mais
    expect(src).not.toMatch(/personExtraFacts\(/);
  });
  it('nenhum texto do jogo cita o nome interno de um módulo (ex.: "(bonds9)", "love17:", "real27")', () => {
    const lit = /\bl\(\s*'((?:[^'\\]|\\.)*)'(?:\s*,\s*'((?:[^'\\]|\\.)*)')?\s*\)/g;
    const bad: string[] = [];
    for (const f of walk(join(__dirname, '../src'))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(lit)) for (const g of [m[1], m[2]]) {
        if (!g) continue;
        if (rawHits29(g).some((x) => x.kind === 'modulo') || /\((?!mp3\))[a-z]{3,}\d{1,2}[a-z]?\)/.test(g)) bad.push(`${f.split('/src/')[1]}: ${g.slice(0, 80)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

// ================================================================ (1)(3) menu: recolhido, filtro, sem ações → desabilitado

describe('r29 (1)(3) — menu de clique direito', () => {
  it('as seções começam recolhidas em toda abertura (nada lembrado) e o filtro abre as seções com resultado', () => {
    const src = SRC('ui/ps/ctx27.ts');
    expect(src).not.toMatch(/folded29/); // nada de memória de seções abertas entre aberturas
    expect(src).toMatch(/class: 'cx27-sbody', id: `\$\{mid\}-\$\{x\.sec\}`, hidden: true/);
    expect(src).toMatch(/'aria-expanded': 'false', 'aria-controls'/);
    expect(src).toMatch(/function applyFilter\(\)/);
    expect(src).toMatch(/setOpen\(hd, n > 0\)/); // filtrando: seção com resultado abre, sem resultado some
    expect(src).toMatch(/setOpen\(hd, before\?\.get\(hd\) \?\? false\)/); // limpar o filtro volta como estava (recolhido)
  });
  it('liveCount29: "Copiar nome" não conta; tudo bloqueado = zero (botão desabilitado, sem menu)', () => {
    const blocked = { pt: 'não dá', en: 'no' };
    const m: CtxMenu27 = { ent: 'act', id: 'x', name: 'X', kind: { pt: 'a', en: 'a' }, items: [
      { id: 'act.open', label: { pt: 'Abrir', en: 'Open' }, grp: 'open', block: blocked },
      { id: 'act.offer', label: { pt: 'Proposta', en: 'Offer' }, grp: 'do', block: blocked },
      { id: 'copy', label: { pt: 'Copiar', en: 'Copy' }, grp: 'info', block: null },
    ] };
    expect(liveCount29(m)).toBe(0);
    m.items[0].block = null;
    expect(liveCount29(m)).toBe(1);
    expect(liveCount29(m, (x) => x.id === 'act.open')).toBe(0); // a ficha não conta "Abrir ficha" (já está nela)
    expect(liveCount29(null)).toBe(0);
    expect(pt(NO_ACTIONS29)).toMatch(/Nenhuma ação disponível/);
  });
  it('o clique direito não abre menu vazio; os botões "Ações…" ficam desabilitados com o motivo', () => {
    expect(SRC('ui/ps/ctx27.ts')).toMatch(/if \(!m \|\| !m\.items\.length \|\| !liveCount29\(m\)\) return false;/);
    const pa = SRC('ui/sys/personact18.ts');
    expect(pa).toMatch(/if \(!hasActions29\(s, key\)\) return offBtn29\(/);
    expect(pa).toMatch(/disabled: true, 'aria-disabled': 'true', title: t\(why\)/);
    expect(SRC('ui/ps/insp29.ts')).toMatch(/liveCount29\(menu, /);
    expect(SRC('ui/sys/actmenu20.ts')).toMatch(/if \(!live20\(s, actId\)\) \{ b\.setAttribute\('disabled'/);
  });
});

// ================================================================ (2) mais entidades com clique direito

describe('r29 (2) — novos tipos e a rede de segurança pelo nome', () => {
  let s: GameState;
  beforeAll(() => { s = createGame(defaultConfig('r29-raw2', { startYear: 1985, scenario: 'established', realNames: true })); });

  it('tipos novos: premiação, relíquia, movimento (e o festival pelo índice)', () => {
    for (const k of ['award', 'relic', 'movement', 'festival']) expect(isEnt27(k)).toBe(true);
    expect(ENTS27).toEqual(expect.arrayContaining(['award', 'relic', 'movement']));
    const fi = FESTIVALS.findIndex((f) => f.start <= s.year);
    const fm = ctxMenu27(s, 'festival', String(fi), ENV)!;
    expect(fm.name).toBe(FESTIVALS[fi].name);
    expect(ids(fm)).toEqual(expect.arrayContaining(['festival.page', 'festival.pitch', 'festival.open', 'copy']));
    expect(fm.items.find((x) => x.id === 'festival.page')?.block).toBeNull();
    const future = FESTIVALS.findIndex((f) => f.start > s.year);
    if (future >= 0) expect(pt(ctxMenu27(s, 'festival', String(future), ENV)!.items.find((x) => x.id === 'festival.page')?.block)).toMatch(/Ainda não existe/);
    expect(ids(ctxMenu27(s, 'award', 'gramo', ENV, 'Gramofones'))).toEqual(['award.page', 'award.open', 'copy']);
    const rl = relics(s).list[0];
    if (rl) expect(ids(ctxMenu27(s, 'relic', rl.id, ENV))).toContain('relic.page');
    expect(ctxMenu27(s, 'relic', 'nao-existe', ENV)).toBeNull();
    const mv = s.movements[0];
    if (mv) expect(ids(ctxMenu27(s, 'movement', mv.id, ENV))).toEqual(expect.arrayContaining(['movement.page', 'movement.open']));
  });
  it('cada item novo tem handler em ps/ctx27.ts (um caminho só: as páginas de sempre)', () => {
    const src = SRC('ui/ps/ctx27.ts');
    for (const id of ['festival.page', 'festival.pitch', 'festival.city', 'award.page', 'award.open', 'relic.page', 'relic.act', 'relic.person', 'relic.open', 'movement.page', 'movement.open']) expect(src, id).toContain(`case '${id}'`);
    expect(src).toMatch(/openFestivalPage\(Number\(id\)\)/);
    expect(src).toMatch(/openCeremonyPage\(id\)/);
    expect(src).toMatch(/openRelic\(s, id\)/);
    expect(src).toMatch(/openMovementPage\(s, id\)/);
  });
  it('nome exato → entidade única; nome repetido no mesmo tipo é ambíguo (sem menu: melhor o nativo do que errar)', () => {
    const a = Object.values(s.acts).find((x) => Object.values(s.acts).filter((y) => y.name === x.name).length === 1)!;
    expect(nameHit29(s, a.name)).toEqual({ ent: 'act', id: a.id });
    expect(nameHit29(s, ` ${a.name} `)).toEqual({ ent: 'act', id: a.id });
    const lb = Object.values(s.labels).find((x) => !Object.values(s.acts).some((y) => y.name === x.name) && Object.values(s.labels).filter((y) => y.name === x.name).length === 1)!;
    expect(nameHit29(s, lb.name)).toEqual({ ent: 'label', id: lb.id });
    // artista solo: o nome é do ato e da pessoa — vale o ato
    const solo = Object.values(s.acts).find((x) => x.members.length === 1 && s.persons[x.members[0]]?.name === x.name && Object.values(s.acts).filter((y) => y.name === x.name).length === 1);
    if (solo) expect(nameHit29(s, solo.name)?.ent).toBe('act');
    // duas pessoas com o mesmo nome → ambíguo
    const seen = new Map<string, number>();
    for (const p of Object.values(s.persons)) seen.set(p.name, (seen.get(p.name) ?? 0) + 1);
    const dup = [...seen].find(([n, c]) => c > 1 && !Object.values(s.acts).some((y) => y.name === n) && !Object.values(s.labels).some((y) => y.name === n));
    if (dup) expect(nameHit29(s, dup[0])).toBeNull();
    expect(nameHit29(s, 'zz')).toBeNull();
    expect(nameHit29(s, 'Isto não é nome de ninguém 123')).toBeNull();
    // cache: o mesmo índice enquanto nada muda
    expect(nameIndex29(s)).toBe(nameIndex29(s));
  });
  it('com quem já morreu só vale a homenagem (presente e o resto: desabilitados com o motivo)', () => {
    const dead = Object.values(s.persons).find((p) => !p.alive && !p.isPlayer)!;
    const m = ctxMenu27(s, 'person', `p:${dead.id}`, ENV)!;
    expect(pt(m.items.find((x) => x.id === 'person.gift')?.block)).toMatch(/morreu/);
    for (const x of m.items) if (x.id.startsWith('pa:') && x.id !== 'pa:funeral') expect(x.block, x.id).not.toBeNull();
  });
  it('as seções do menu continuam a fonte única (clique direito, ficha e inspetor)', () => {
    const a = Object.values(s.acts).find((x) => x.owner && x.owner !== 'player')!;
    const m = ctxMenu27(s, 'act', a.id, ENV)!;
    expect(menuSections27(m).flatMap((x) => x.items).length).toBe(m.items.length);
    expect(liveCount29(m)).toBeGreaterThan(0);
  });
});
