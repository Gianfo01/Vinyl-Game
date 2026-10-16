// R31 · onda 5 (TEC) — mapa final de teclas (src/ui/r31/keys5.ts), objetos (objects5.ts), navegação em esqueleto
// (nav5.ts, atrás de exp5.nav DESLIGADO) e a especificação gerada (docs/r31/onda5-telas.md, onda5-teclas.md).
// UPDATE5=1 regrava os documentos gerados.
import { readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { ensureExt4 } from '../src/sim/ext4';
import { setSw, sw, switchDef } from '../src/sim/r31/switches';
import { editableById } from '../src/sim/r31/editor';
import { SW_NAV5, POCKET_MAX5, pocketIds5, pocketMove5 } from '../src/sim/r31/exp5';
import { pendingList } from '../src/sim/r31/pending';
import { rngSnapshot19 } from '../src/sim/rng19';
import { KEY17 } from '../src/ui/nav17';
import { ENTRIES31 } from '../src/ui/ps/menu31';
import { ALL_AREAS29 } from '../src/ui/ps/route29model';
import { TABS_REG27 } from '../src/ui/ps/tabsreg27';
import { BASE_KEYS5, KEY_CHANGES5, applyCustom5, bindOf5, checkRebind5, chordOf5, conflicts5, key5, keys5, validChord5 } from '../src/ui/r31/keys5';
import { MOVES5, MOVE_SPECIAL5, PAUSE5, objectFor5, objects5, object5, ownerOf5, type Open5 } from '../src/ui/r31/objects5';
import { NAV5, badge5, bangs5, goto5, keyNav5, open5, pin5, pocketView5, resolveGoto5, travel5 } from '../src/ui/r31/nav5';
import { keysTable5, telasDoc5, type Page5 } from '../src/ui/r31/spec5';

const game = (seed = 'w5tec', y = 1962): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));

/** Páginas base de app.ts (AREAS) com o rótulo de hoje. */
const BASE: Record<string, string> = {
  desk: 'Mesa do mês', plan: 'Central', hq: 'Sede', charts: 'Paradas', artists: 'Artistas', market: 'Talentos', media: 'Mídia', catalog: 'Catálogo',
  creation: 'Composição', studio: 'Estúdio', releases: 'Lançamentos', shows: 'Shows', world: 'Mundo', business: 'Negócios', finance: 'Finanças',
  company: 'Empresa', diary: 'Diário da run', sede25: 'Sede em corte', lists30: 'Listas',
};

/** Todas as páginas registradas hoje: base + registerArea (carregando a interface inteira com DOM mínimo) + catálogo r29. */
let PAGES: Page5[] = [];
beforeAll(async () => {
  const g = globalThis as Record<string, unknown>;
  const el = () => ({ style: {}, dataset: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } });
  g.window ??= { setInterval: () => 0, setTimeout: () => 0, clearInterval() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  g.document ??= { addEventListener() {}, createElement: el, querySelector: () => null, querySelectorAll: () => [], documentElement: el(), body: el(), getElementById: () => null };
  g.MutationObserver ??= class { observe() {} disconnect() {} };
  g.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
  g.navigator ??= { language: 'pt' };
  await import('../src/ui/app');
  const { EXTRA_AREAS } = await import('../src/ui/registry');
  const m = new Map<string, string>(Object.entries(BASE));
  for (const a of EXTRA_AREAS) if (!m.has(a.id)) m.set(a.id, a.label.pt);
  for (const a of ALL_AREAS29) if (!m.has(a)) m.set(a, a);
  PAGES = [...m.entries()].map(([id, label]) => ({ id, label }));
}, 120000);

describe('W5 TEC · toda página tem objeto e tecla (ou fica na pausa)', () => {
  it('inventário: ~95+ páginas e ~300+ abas', () => {
    expect(PAGES.length).toBeGreaterThan(90);
    expect(TABS_REG27.length).toBeGreaterThan(300);
  });
  it('cada página registrada tem UM objeto dono com tecla, ou está no menu de pausa', () => {
    for (const p of PAGES) {
      if (PAUSE5[p.id]) { expect(ownerOf5(p.id), `${p.id} na pausa e com dono`).toBeUndefined(); continue; }
      const owners = objects5().filter((o) => o.opens.some((x) => x.area === p.id));
      expect(owners.map((o) => o.id), `${p.id} (${p.label})`).toHaveLength(1);
      const o = owners[0];
      const k = key5(`obj:${o.id}`) ?? (o.keyRef ? key5(o.keyRef) : undefined);
      expect(k, `${p.id} → ${o.id} sem tecla`).toBeTruthy();
    }
  });
  it('objeto dono de marcador vindo de outra página também tem tecla; atalhos só levam a páginas com dono', () => {
    for (const m of MOVES5) {
      if (MOVE_SPECIAL5[m.to]) continue;
      const o = object5(m.to);
      expect(o, `${m.area}/${m.tab} → ${m.to}`).toBeTruthy();
      expect(key5(`obj:${o!.id}`) ?? key5(o!.keyRef ?? '-'), `${o!.id} sem tecla`).toBeTruthy();
    }
    for (const o of objects5()) for (const x of o.links ?? []) expect(ownerOf5(x.area), `${o.id} → ${x.area}`).toBeTruthy();
  });
  it('toda aba de hoje vai para um marcador (dono da página, outro objeto, topo ou pausa)', () => {
    for (const t of TABS_REG27) expect(ownerOf5(t[0]) ?? PAUSE5[t[0]], `${t[0]}/${t[2]}`).toBeTruthy();
    // as MOVES5 citam abas que existem (no registro gerado ou registradas por registerTab)
    const runtimeTabs = new Set(['business-business/learn31', 'business-business/results31', 'worldHub/fossati31', 'worldHub/extras31']);
    for (const m of MOVES5) if (m.tab) expect(TABS_REG27.some((t) => t[0] === m.area && t[1] === m.key && t[2] === m.tab) || runtimeTabs.has(`${m.key}/${m.tab}`), `${m.area} ${m.key}/${m.tab}`).toBe(true);
  });
});

describe('W5 TEC · teclas sem conflito e configuráveis', () => {
  it('nenhuma tecla em conflito; todas no formato aceito', () => {
    expect(conflicts5()).toEqual([]);
    for (const b of keys5()) expect(validChord5(b.chord), `${b.id}: ${b.chord}`).toBe(true);
  });
  it('as decisões do pedido: C quadro, G agenda, E caixa, H sede, Shift+1…4 viagem, Esc pausa, Alt nomes', () => {
    const g = (c: string) => bindOf5(c);
    expect(g('c')!.act).toEqual({ kind: 'object', id: 'quadroplan' });
    expect(g('g')!.act).toEqual({ kind: 'object', id: 'agenda' });
    expect(g('e')!.act).toEqual({ kind: 'object', id: 'correspondencia' });
    expect(g('h')!.act).toEqual({ kind: 'travel', id: 'sede' });
    expect(['shift+1', 'shift+2', 'shift+3', 'shift+4'].map((c) => g(c)!.act)).toEqual(['sede', 'casa', 'cidade', 'mundo'].map((id) => ({ kind: 'travel', id })));
    expect(g('escape')!.act).toEqual({ kind: 'sys', id: 'pause' });
    expect(g('alt')!.act).toEqual({ kind: 'sys', id: 'names' });
    expect(g('ctrl+k')!.act).toEqual({ kind: 'sys', id: 'search' });
    expect(g('ctrl+enter')!.act).toEqual({ kind: 'sys', id: 'advance' });
    expect(g('{')!.act).toEqual({ kind: 'sys', id: 'prevTab' });
  });
  it('mantém as teclas de hoje: cada tecla de KEY17 abre a mesma página (objeto dono ou marcador) ou está em "o que mudou"', () => {
    const changed = new Set(KEY_CHANGES5.map((c) => c.chord));
    for (const [area, k] of Object.entries(KEY17)) {
      const b = bindOf5(k)!;
      expect(b, `${k}`).toBeTruthy();
      const opensSame = (b.act.kind === 'object' && objectFor5(area)?.id === b.act.id) || (b.act.kind === 'marker' && b.act.area === area);
      expect(opensSame || changed.has(k), `${k}: ${area} → ${b.id}`).toBe(true);
    }
    // as que mudaram são só as do pedido (mais Shift+1…6 do menu)
    expect([...changed].filter((c) => /^[a-z]$/.test(c)).sort()).toEqual(['c', 'e', 'g', 'h']);
  });
  it('a página que perdeu a tecla continua a 2 cliques (é marcador do objeto novo)', () => {
    expect(ownerOf5('careers')!.id).toBe('escritoriocasa');
    expect(ownerOf5('lendas')!.id).toBe('cultura');
    expect(key5('obj:car:manager')!.chord).toBe('shift+g');
    expect(key5('obj:telefone')!.chord).toBe('shift+t');
  });
  it('lê o teclado do navegador (letras pelo key, Shift+dígito pelo code, símbolos)', () => {
    expect(chordOf5({ key: 'e' })).toBe('e');
    expect(chordOf5({ key: 'E', shiftKey: true })).toBe('shift+e');
    expect(chordOf5({ key: '!', code: 'Digit1', shiftKey: true })).toBe('shift+1');
    expect(chordOf5({ key: '3', code: 'Digit3' })).toBe('3');
    expect(chordOf5({ key: '{', code: 'BracketLeft', shiftKey: true })).toBe('{');
    expect(chordOf5({ key: 'k', ctrlKey: true })).toBe('ctrl+k');
    expect(chordOf5({ key: 'Enter', metaKey: true })).toBe('ctrl+enter');
    expect(chordOf5({ key: 'Escape' })).toBe('escape');
    expect(chordOf5({ key: 'Alt', altKey: true })).toBe('alt');
    expect(chordOf5({ key: 'a', altKey: true })).toBe('');
  });
  it('troca de tecla: recusa conflito, reservada e do sistema; aceita tecla livre', () => {
    expect(checkRebind5('obj:telefone', 'a')!.pt).toMatch(/Fichário/);
    expect(checkRebind5('obj:telefone', 'ctrl+k')).toBeTruthy();
    expect(checkRebind5('obj:telefone', '?')).toBeTruthy();
    expect(checkRebind5('sys:search', 'shift+6')).toBeTruthy();
    expect(checkRebind5('obj:telefone', 'shift+6')).toBeUndefined();
    const r = applyCustom5({ 'obj:telefone': 'shift+6', 'obj:jornal': 'shift+6', 'obj:quadroplan': 'ç' });
    expect(r.binds.find((b) => b.id === 'obj:telefone')!.chord).toBe('shift+6');
    expect(r.rejected.map((x) => x.id)).toEqual(['obj:jornal', 'obj:quadroplan']);
    expect(conflicts5(r.binds)).toEqual([]);
    // tecla interna do papel não briga com a global (a do papel ganha enquanto ele está aberto)
    expect(bindOf5('e', 'correspondencia')!.id).toBe('correspondencia:archive');
    expect(bindOf5('e')!.id).toBe('obj:correspondencia');
    expect(bindOf5('a', 'correspondencia')!.id).toBe('obj:fichario');
    expect(BASE_KEYS5.every((b) => key5(b.id)?.chord === b.chord)).toBe(true);
  });
});

describe('W5 TEC · open5 e "ir até lá"', () => {
  let s: GameState;
  const seen: Open5[] = [];
  beforeAll(() => { s = game(); NAV5.go = (t) => { seen.push(t); }; NAV5.home = undefined; });
  it('open5 abre a página antiga dona do objeto', () => {
    for (const o of objects5()) {
      seen.length = 0;
      const t = open5(o.id);
      const want = o.opens[0] ?? o.links?.[0];
      expect(t, o.id).toEqual(want);
      if (want) expect(seen, o.id).toEqual([want]);
    }
    expect(open5('mesames')).toEqual({ area: 'cockpit', tab: ['ck20', 'desk'] });
    expect(open5('correspondencia')).toEqual({ area: 'inbox' });
    expect(open5('mural')).toEqual({ area: 'artists' });
    expect(open5('nao-existe')).toBeUndefined();
  });
  it('marcador: abre o objeto já na aba (inclusive a que veio de outra página)', () => {
    expect(open5('mural', { area: 'people' })).toEqual({ area: 'people' });
    expect(open5('cofre', { area: 'finance', tab: ['business-finance', 'capital'] })).toEqual({ area: 'finance', tab: ['business-finance', 'capital'] });
    // marcador que não é do objeto: cai na página principal
    expect(open5('mural', { area: 'finance' })).toEqual({ area: 'artists' });
  });
  it('ir até lá: de pendência, destino, prazo, recado (Goto18) e fato', () => {
    expect(resolveGoto5(s, { area: 'inbox', intent: 'answer' })!.obj).toBe('correspondencia');
    expect(resolveGoto5(s, { area: 'business', tab: 'business-business/soc31' })!.obj).toBe('contador');
    expect(resolveGoto5(s, { area: 'finance', tab: 'business-finance/capital' })!.obj).toBe('cofre');
    expect(resolveGoto5(s, { area: 'cockpit', tab: ['ck20', 'inbox'] })!.obj).toBe('correspondencia');
    expect(resolveGoto5(s, { id: 'x', w: s.week + 2, kind: 'release', t: { pt: 'a', en: 'a' }, goto: { area: 'releases' } })!.obj).toBe('quadrobranco');
    expect(resolveGoto5(s, { id: 'x', w: s.week + 2, kind: 'other', t: { pt: 'a', en: 'a' } })!.obj).toBe('agenda');
    const act = Object.keys(s.acts)[0];
    const f = { id: 'f1', y: s.year, m: 1, w: s.week, kind: 'hit', actors: [act], severity: 50, visibility: 'public' as const, tags: [], text: { pt: 'x', en: 'x' } };
    expect(resolveGoto5(s, f)).toMatchObject({ obj: 'mural', actId: act });
    const city = { ...f, actors: ['zz'], place: 'kingston' };
    expect(resolveGoto5(s, city)!.obj).toBe('mapa');
    for (const p of pendingList(s)) expect(resolveGoto5(s, p)?.open.area, p.id).toBeTruthy();
    expect(resolveGoto5(s, 'agenda')).toEqual({ obj: 'agenda', open: { area: 'agenda17' } });
    seen.length = 0;
    goto5(s, { area: 'market', intent: 'counter' });
    expect(seen).toEqual([{ area: 'market', tab: undefined }]);
  });
  it('viagem: 4 botões com tecla, nome da sede pela carreira, aceso no lugar atual', () => {
    const tv = travel5(s, { area: 'artists' });
    expect(tv.map((x) => [x.id, x.key])).toEqual([['sede', 'shift+1'], ['casa', 'shift+2'], ['cidade', 'shift+3'], ['mundo', 'shift+4']]);
    expect(tv.find((x) => x.active)!.id).toBe('sede');
    expect(travel5(s, { area: 'crime' }).find((x) => x.active)!.id).toBe('cidade');
    expect(travel5(s, { area: 'you' }).find((x) => x.active)!.id).toBe('casa');
    expect(travel5(s, { area: 'world', tab: ['worldHub', 'map27'] }).find((x) => x.active)!.id).toBe('mundo');
    expect(tv.find((x) => x.id === 'cidade')!.open).toEqual({ area: 'campus18' });
  });
  it('"!": cada pendência única acende um objeto só', () => {
    const b = bangs5(s);
    const total = Object.values(b).reduce((a, n) => a + n, 0);
    expect(total).toBeLessThanOrEqual(pendingList(s).length);
    for (const id of Object.keys(b)) expect(object5(id), id).toBeTruthy();
    expect(badge5(s, 'nao-existe')).toBe(0);
  });
});

describe('W5 TEC · bolso', () => {
  it('fixa até 8 objetos, sem repetir, e o save guarda e devolve', () => {
    const s = game('w5pocket');
    expect(pocketIds5(s)).toEqual([]);
    const ids = ['livrocaixa', 'olheiro', 'quadrobranco', 'revista', 'correspondencia', 'fichario', 'mural', 'agenda'];
    for (const id of ids) expect(pin5(s, id)).toBeUndefined();
    expect(pin5(s, 'telefone')!.pt).toMatch(/cheio/);
    expect(pin5(s, 'nao-existe')!.pt).toMatch(/desconhecido/);
    expect(pocketIds5(s)).toHaveLength(POCKET_MAX5);
    pin5(s, 'agenda'); // tira
    expect(pocketIds5(s)).not.toContain('agenda');
    pocketMove5(s, 'revista', 0);
    const back = JSON.parse(JSON.stringify(s)) as GameState;
    ensureExt4(back);
    expect(pocketIds5(back)).toEqual(['revista', 'livrocaixa', 'olheiro', 'quadrobranco', 'correspondencia', 'fichario', 'mural']);
    expect(pocketView5(back).map((x) => [x.id, x.key])).toEqual([['revista', '3'], ['livrocaixa', 'z'], ['olheiro', '5'], ['quadrobranco', 'u'], ['correspondencia', 'e'], ['fichario', 'a'], ['mural', '4']]);
  });
});

describe('W5 TEC · interruptor desligado não muda nada', () => {
  it('exp5.nav existe, está desligado por padrão e aparece no editor', () => {
    const s = game('w5off');
    expect(switchDef(SW_NAV5)!.def).toBe(false);
    expect(sw(s, SW_NAV5)).toBe(false);
    expect(editableById(`sw.${SW_NAV5}`)).toBeTruthy();
  });
  it('desligado: nenhuma tecla é tratada pela camada nova e nada é aberto', () => {
    const s = game('w5off2');
    const calls: Open5[] = [];
    NAV5.go = (t) => { calls.push(t); };
    for (const b of keys5()) {
      const [mod, k] = b.chord.includes('+') ? b.chord.split('+') : ['', b.chord];
      const ev = { key: k === 'escape' ? 'Escape' : k === 'alt' ? 'Alt' : k === 'enter' ? 'Enter' : k === 'tab' ? 'Tab' : k, code: /^\d$/.test(k) ? `Digit${k}` : undefined, shiftKey: mod === 'shift', ctrlKey: mod === 'ctrl' };
      expect(keyNav5(s, ev), b.id).toBe(false);
    }
    expect(keyNav5(undefined, { key: 'e' })).toBe(false);
    expect(calls).toEqual([]);
    // ligado: as teclas novas abrem os objetos
    setSw(s, SW_NAV5, true);
    expect(keyNav5(s, { key: 'e' })).toBe(true);
    expect(keyNav5(s, { key: 'g' })).toBe(true);
    expect(keyNav5(s, { key: '!', code: 'Digit3', shiftKey: true })).toBe(true);
    expect(keyNav5(s, { key: 'p' })).toBe(true);
    expect(keyNav5(s, { key: 'k', ctrlKey: true })).toBe(false); // busca continua com o código de hoje
    expect(calls.map((c) => c.area)).toEqual(['inbox', 'agenda17', 'campus18', 'people']);
  });
  it('o menu e os atalhos de hoje ficam iguais (KEY17 e Shift+1…6)', () => {
    expect(ENTRIES31.filter((e) => e.key).map((e) => `${e.id}:${e.key}`)).toEqual(['hoje:1', 'sede:2', 'cidade:3', 'mundo:4', 'voce:5', 'listas:6']);
    expect(KEY17.careers).toBe('e');
    expect(KEY17.lendas).toBe('h');
    expect(KEY17['cp17-manager']).toBe('g');
    expect(KEY17.plan).toBe('c');
  });
  it('explorar não muda o mundo: viagem, "!", ir até lá e bolso não tocam sorteio nem estado do jogo', () => {
    const s = game('w5pure');
    const rng0 = JSON.stringify(rngSnapshot19(s));
    const strip = (g: GameState) => { const c = JSON.parse(JSON.stringify(g)); delete c.x4.pocket5; return JSON.stringify(c); };
    const st0 = strip(s);
    bangs5(s); travel5(s, { area: 'hq' }); resolveGoto5(s, { area: 'market' }); for (const p of pendingList(s)) resolveGoto5(s, p);
    pin5(s, 'mural');
    expect(JSON.stringify(rngSnapshot19(s))).toBe(rng0);
    expect(strip(s)).toBe(st0);
  });
});

describe('W5 TEC · documentos gerados em dia', () => {
  it('docs/r31/onda5-telas.md e o bloco gerado de onda5-teclas.md batem com o código', () => {
    const mapa = readFileSync('docs/r31/onda5-mapa.md', 'utf8');
    const telas = telasDoc5(PAGES, TABS_REG27, mapa);
    expect(telas).not.toMatch(/sem dono/);
    const kp = 'docs/r31/onda5-teclas.md';
    const kdoc = readFileSync(kp, 'utf8');
    const A = '<!-- gerado:keys5 -->', B = '<!-- /gerado:keys5 -->';
    const i = kdoc.indexOf(A), j = kdoc.indexOf(B);
    expect(i >= 0 && j > i).toBe(true);
    const kNew = `${kdoc.slice(0, i + A.length)}\n${keysTable5()}${kdoc.slice(j)}`;
    if (process.env.UPDATE5) { writeFileSync('docs/r31/onda5-telas.md', telas); writeFileSync(kp, kNew); }
    expect(readFileSync('docs/r31/onda5-telas.md', 'utf8')).toBe(telas);
    expect(readFileSync(kp, 'utf8')).toBe(kNew);
  });
});
