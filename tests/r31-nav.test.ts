// R31 · onda 1 (A) — menu "mundo primeiro" (src/ui/ps/menu31.ts), Hoje (src/ui/ps/hoje31model.ts) e contadores por
// pendência única. Contratos: ≤ 10 entradas; toda área antiga resolve para algum destino (com casa no menu novo e a
// página antiga continuando a abrir); contadores = pendências únicas; um percurso mínimo por carreira com o menu novo.
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import type { GameState, Offer } from '../src/sim/types';
import { addMsg } from '../src/sim/sys/people/state';
import { pendingCount, pendingList } from '../src/sim/r31/pending';
import { pendingCount as attnPendingCount, pushAttn, resolveAttn } from '../src/sim/attention';
import { rngSnapshot19 } from '../src/sim/rng19';
import { ALIAS17, CAREER_PAGE17, ORDER17 } from '../src/ui/nav17';
import { ALL_AREAS29, REDIRECT29, resolve29 } from '../src/ui/ps/route29model';
import {
  ENTRIES31, LISTS31, LIST_TABS31, MENU_MAX31, PLACES31, SEDE_LABEL31, TABS_MAX31, badges31, entryHome31, entryOf31, find31,
  menu31, pathTo31, placeOf31, placesOf31, shownTabs31, type MenuCtx31,
} from '../src/ui/ps/menu31';
import { TL_FILTERS31, TL_WEEKS31, filterTl31, hoje31 } from '../src/ui/ps/hoje31model';

const game = (seed = 'r31n', y = 1975): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const ctx = (active: string[], o: Partial<MenuCtx31> = {}): MenuCtx31 => ({ active, pages: active, sede: true, ...o });
const WORLD = new Set(['hoje', 'sede', 'cidade', 'mundo', 'voce', 'listas', 'opcoes']);
const OLD = [...new Set([...ALL_AREAS29, ...Object.keys(REDIRECT29), ...Object.keys(ALIAS17), ...ORDER17.map((id) => CAREER_PAGE17[id].area)])];

describe('R31 A · menu ≤ 10 entradas', () => {
  it('8 entradas fixas na ordem do plano; Fixados e Suas casas só quando fazem sentido', () => {
    expect(ENTRIES31.map((e) => e.id)).toEqual(['hoje', 'sede', 'cidade', 'mundo', 'voce', 'listas', 'buscar', 'opcoes']);
    expect(menu31(ctx(['label'])).map((e) => e.id)).toEqual(['hoje', 'sede', 'cidade', 'mundo', 'voce', 'listas', 'buscar', 'opcoes']);
    expect(menu31(ctx(['label'], { pins: 2 })).map((e) => e.id)).toContain('fixados');
    expect(menu31(ctx(['label', 'musician'])).map((e) => e.id)).toContain('casas');
    expect(menu31(ctx(['label'])).map((e) => e.id)).not.toContain('casas');
  });
  it('nenhuma combinação passa de 10 (todas as carreiras, com fixados)', () => {
    for (const c of ORDER17) expect(menu31(ctx([c], { pins: 3 })).length).toBeLessThanOrEqual(MENU_MAX31);
    expect(menu31(ctx([...ORDER17], { pins: 9 })).length).toBeLessThanOrEqual(MENU_MAX31);
    expect(MENU_MAX31).toBe(10);
  });
  it('teclas Shift+1…6 únicas para Hoje, Sede, Cidade, Mundo, Você e Listas', () => {
    const keys = ENTRIES31.filter((e) => e.key).map((e) => `${e.id}:${e.key}`);
    expect(keys).toEqual(['hoje:1', 'sede:2', 'cidade:3', 'mundo:4', 'voce:5', 'listas:6']);
  });
  it('Sede muda de nome e de casa com a carreira principal', () => {
    expect(entryHome31('sede', ctx(['label']))).toBe('sede25');
    expect(entryHome31('sede', ctx(['label'], { sede: false }))).toBe('cp17-label');
    for (const c of ORDER17.filter((x) => x !== 'label')) {
      expect(entryHome31('sede', ctx([c])), c).toBe(CAREER_PAGE17[c].area);
      expect(menu31(ctx([c])).find((e) => e.id === 'sede')!.label, c).toEqual(SEDE_LABEL31[c]);
    }
  });
});

describe('R31 A · toda página antiga resolve', () => {
  it('cada id antigo (páginas, aliases, carreiras, redirecionamentos) tem casa no menu novo e continua abrindo', () => {
    for (const c of [['label'], ['musician'], ['manager', 'label']]) {
      for (const a of OLD) {
        const p = placeOf31(a, ctx(c));
        expect(WORLD.has(p.entry), `${a} → ${p.entry}`).toBe(true);
        expect(p.id, `${a} sem casa (caiu em Outras páginas)`).not.toBe('list:other');
        expect(p.areas.length, a).toBeGreaterThan(0);
        // a página antiga continua abrindo pelo catálogo único (ids, aliases e redirecionamentos)
        expect(resolve29(a)?.area, a).toBeTruthy();
      }
    }
  });
  it('Listas é uma área virtual: entra por si e cai numa lista', () => {
    expect(entryOf31(LISTS31, ctx(['label']))).toBe('listas');
    expect(menu31(ctx(['label'])).find((e) => e.id === 'listas')!.home).toBe(LISTS31);
  });
  it('a tabela de lugares só cita páginas que existem (sem erro de digitação) e cada página tem UM lugar dono', () => {
    const known = new Set(OLD);
    const owner = new Map<string, string>();
    for (const p of PLACES31) for (const a of p.areas) {
      expect(known.has(a), `${p.id}: ${a}`).toBe(true);
      expect(owner.has(a), `${a} em ${owner.get(a)} e ${p.id}`).toBe(false);
      owner.set(a, p.id);
    }
    for (const x of LIST_TABS31) for (const a of x.areas) expect(known.has(a), `${x.id}: ${a}`).toBe(true);
  });
  it('página desconhecida (nova frente) cai em Listas › Outras páginas — nada some', () => {
    const p = placeOf31('frente-nova-99', ctx(['label']));
    expect(p.entry).toBe('listas');
    expect(p.id).toBe('list:other');
  });
  it('Listas: ≤ 6 abas + "Mais"', () => {
    expect(LIST_TABS31.filter((x) => !x.more).length).toBeLessThanOrEqual(TABS_MAX31);
    expect(LIST_TABS31.filter((x) => x.more).length).toBeGreaterThan(0);
  });
  it('abas: ≤ 6 à mostra (5 + a aberta), o resto no "Mais"', () => {
    expect(shownTabs31(4, 0)).toEqual([0, 1, 2, 3]);
    expect(shownTabs31(6, 5)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(shownTabs31(12, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(shownTabs31(12, 9)).toEqual([0, 1, 2, 3, 4, 9]);
    for (let n = 1; n < 30; n++) for (let c = 0; c < n; c++) {
      const xs = shownTabs31(n, c);
      expect(xs.length).toBeLessThanOrEqual(TABS_MAX31);
      expect(xs).toContain(c);
    }
  });
  it('busca acha entradas, lugares e listas pelo nome', () => {
    const f = find31(ctx(['label']));
    const has = (pt: string) => f.some((x) => x.label.pt === pt);
    for (const x of ['Hoje', 'Sede', 'Cidade', 'Mundo', 'Você', 'Bandeja de entrada', 'Cofre (patrimônio)', 'Troféus e Hall da Fama', 'Calendário completo']) expect(has(x), x).toBe(true);
    expect(f.find((x) => x.terms.includes('submundo'))?.area).toBe('crime');
  });
});

describe('R31 A · contadores = pendências únicas', () => {
  let g: GameState;
  beforeAll(() => {
    g = game('r31nb');
    const act = Object.values(g.acts).find((a) => a.owner !== 'player')!;
    g.decisions.push({ id: 'dN1', eventId: 'x', cat: 'x', title: l('Decidir', 'Decide'), text: l('', ''), options: [], ctx: { act: act.id }, week: g.week, defaultOption: 'a', tags: [] });
    addMsg(g, { from: 'X', subject: l('Responder', 'Answer'), body: l('', ''), kind: 'deal', actions: [{ id: 'ok', label: l('Ok', 'Ok') }], expires: g.week + 3 });
    g.offers.push({ id: 'oN1', actId: act.id, status: 'counter', week: g.week } as Offer);
    // a mesma pendência vinda pela fila de avisos (mesmo id) não conta de novo; outra nova conta uma vez
    pushAttn(g, { cat: 'decision', prio: 2, title: l('Decidir', 'Decide'), pendId: 'dec:dN1', dest: { area: 'desk' } });
    pushAttn(g, { cat: 'money', prio: 3, title: l('Caixa negativo', 'Negative cash'), pendId: 'cash<0', dest: { area: 'finance' } });
    pushAttn(g, { cat: 'money', prio: 3, title: l('Caixa negativo', 'Negative cash'), pendId: 'cash<0', dest: { area: 'finance' } });
  });
  it('soma das entradas = soma dos lugares = pendingCount; cada pendência uma vez', () => {
    for (const c of [['label'], ['musician'], ['booking', 'label']]) {
      const b = badges31(pendingList(g), ctx(c));
      const sumE = Object.values(b.entry).reduce((a, x) => a + (x ?? 0), 0);
      const sumP = Object.values(b.place).reduce((a, x) => a + x, 0);
      expect(b.total).toBe(pendingCount(g));
      expect(sumE).toBe(pendingCount(g));
      expect(sumP).toBe(pendingCount(g));
    }
    const ids = pendingList(g).map((p) => p.id);
    expect(ids.filter((i) => i === 'dec:dN1')).toHaveLength(1);
    expect(ids.filter((i) => i === 'cash<0')).toHaveLength(1);
  });
  it('dono decide o lugar: decisões e caixa de entrada no Hoje, contraproposta no A&R da Sede, caixa em Listas › Finanças', () => {
    const b = badges31(pendingList(g), ctx(['label']));
    expect(b.entry.hoje).toBeGreaterThanOrEqual(2);
    expect(b.place.anr).toBeGreaterThanOrEqual(1);
    expect(b.entry.sede).toBeGreaterThanOrEqual(1);
    expect(b.entry.listas).toBeGreaterThanOrEqual(1);
    expect(b.entry.buscar).toBeUndefined();
  });
  it('a fila de avisos entra na pendência única; resolvida, sai do número', () => {
    expect(attnPendingCount(g)).toBe(2);
    const n = pendingCount(g);
    resolveAttn(g, 'cash<0');
    expect(pendingCount(g)).toBe(n - 1);
  });
});

describe('R31 A · Hoje responde 3 perguntas e tem uma linha do tempo', () => {
  it('decidir agora = pendências únicas; o modelo só lê (nem estado nem sorteio mudam)', () => {
    const g = game('r31nh');
    g.decisions.push({ id: 'dH1', eventId: 'x', cat: 'x', title: l('Decidir', 'Decide'), text: l('', ''), options: [], ctx: {}, week: g.week, defaultOption: 'a', tags: [] });
    // a 1ª leitura pode criar o registro vazio da edição do ano em contests19 (edOf19 cria ao ler; já acontecia com o
    // painel r27 via hqModel25 — anotado no relatório); daí em diante, abrir o Hoje não muda nada
    hoje31(g);
    const before = JSON.stringify(g);
    const r0 = JSON.stringify(rngSnapshot19(g));
    const m = hoje31(g);
    expect(JSON.stringify(g)).toBe(before);
    expect(JSON.stringify(rngSnapshot19(g))).toBe(r0);
    expect(m.decide.map((x) => x.id)).toEqual(pendingList(g).map((p) => p.id));
    expect(m.decide.length).toBe(pendingCount(g));
    expect(m.suggest.every((x) => !x.id.startsWith('dec:'))).toBe(true);
    // linha do tempo única: só a janela de 12 semanas, ordenada, e os filtros não inventam itens
    for (const x of m.timeline) expect(x.w).toBeLessThanOrEqual(g.week + TL_WEEKS31);
    const ws = m.timeline.map((x) => x.w);
    expect([...ws].sort((a, b) => a - b)).toEqual(ws);
    for (const f of TL_FILTERS31) expect(filterTl31(m.timeline, f.id).every((x) => m.timeline.includes(x))).toBe(true);
    expect(filterTl31(m.timeline, 'all')).toHaveLength(m.timeline.length);
  });
});

/** Tarefas-chave de cada carreira (as telas mais usadas): todas a ≤ 2 cliques a partir do menu novo. */
const TASKS31: Record<string, string[]> = {
  label: ['cockpit', 'market', 'studio', 'project', 'releases', 'artists', 'finance', 'cp17-label', 'identity'],
  musician: ['cp17-musician', 'artist18', 'shows', 'project', 'studio', 'cockpit'],
  manager: ['cp17-manager', 'management', 'managers14', 'contracts19'],
  booking: ['cp17-booking', 'tour12', 'shows', 'festivals'],
  festival: ['cp17-festival', 'festivals', 'shows'],
  venue: ['cp17-venue', 'shows', 'live19'],
  studio: ['cp17-studio', 'studio12', 'producers15', 'studio'],
  publisher: ['cp17-publisher', 'publishing16', 'rights18', 'songmkt27'],
  media: ['cp17-media', 'outlets16', 'media', 'news17'],
  platform: ['cp17-platform', 'platform16', 'charts', 'market19a'],
  screen: ['cp17-screen', 'media19', 'catalog'],
  critic: ['cp17-critic', 'critics', 'zines19', 'news17'],
};

describe('R31 A · percurso mínimo por carreira (menu novo)', () => {
  it('cada carreira: a Sede abre a casa dela e as tarefas-chave estão a ≤ 2 cliques', () => {
    expect(Object.keys(TASKS31).sort()).toEqual([...ORDER17].sort());
    for (const c of ORDER17) {
      const cx = ctx([c]);
      const sede = menu31(cx).find((e) => e.id === 'sede')!;
      expect(sede.home, c).toBe(c === 'label' ? 'sede25' : CAREER_PAGE17[c].area);
      for (const a of TASKS31[c]) {
        const p = pathTo31(a, cx);
        expect(p.clicks, `${c}: ${a}`).toBeLessThanOrEqual(2);
        // o 1º clique é uma entrada do menu e o 2º um cartão da faixa de Lugares (ou aba das Listas) que abre a página
        expect(menu31(cx).some((e) => e.id === p.entry), `${c}: ${a} → ${p.entry}`).toBe(true);
        if (p.clicks === 2 && p.entry !== 'listas') expect(placesOf31(p.entry, cx).some((x) => x.areas.includes(a) || (ALIAS17[a] && x.areas.includes(ALIAS17[a][0]))), `${c}: ${a} sem cartão em ${p.entry}`).toBe(true);
        if (p.entry === 'listas') expect(LIST_TABS31.some((x) => x.areas.includes(a)), `${c}: ${a}`).toBe(true);
      }
    }
  });
  it('carreira secundária vira prédio seu (★) na Cidade ou no Mundo, e aparece em "Suas casas"', () => {
    const cx = ctx(['label', 'booking', 'venue']);
    expect(placesOf31('mundo', cx).some((p) => p.career === 'booking')).toBe(true);
    expect(placesOf31('cidade', cx).some((p) => p.career === 'venue')).toBe(true);
    expect(placeOf31('tour12', cx).entry).toBe('mundo');
    expect(menu31(cx).some((e) => e.id === 'casas')).toBe(true);
  });
});
