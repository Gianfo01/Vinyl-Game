// Rodada 29 (REORG) — aplicação da Bíblia de UI/UX (docs/biblia-ui-ux.md; mapa e decisões em docs/reorg29.md).
// Contrato de preservação: todo id de área antigo continua resolvendo; aliases (Submundo/Crime/Fraudes…) chegam ao mesmo
// destino; o índice cobre todas as páginas; as 17 telas têm casa nos 8 grupos; os modelos das telas são funções puras.
import { describe, expect, it } from 'vitest';
import { ALIAS17, CAREER_PAGE17, NAV17, ORDER17 } from '../src/ui/nav17';
import { KNOWN25, SECTIONS25, navGroups25 } from '../src/ui/ps/nav25';
import { HUBS27 } from '../src/ui/ps/hub27model';
import { ALL_AREAS29, AVAIL_L29, DESTS29, GROUPS29, INTENTS29, REDIRECT29, SCREENS29, avail29, intentTarget29, norm29, resolve29, terms29 } from '../src/ui/ps/route29model';

const TREE17 = NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas));
const ABS = ORDER17.flatMap((id) => CAREER_PAGE17[id].absorbs);
const PAGES = ORDER17.map((id) => CAREER_PAGE17[id].area);
/** Inventário "antes" (r17 + r25 + r27 + carreiras + absorvidas + telas antigas fora da árvore) — o mesmo de r27-ux. */
const OLD = ['identity', 'biz17', 'management', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16', 'shared18', 'artist18', 'tut18', 'agenda17'];
const BEFORE = [...new Set([...TREE17, ...ABS, ...PAGES, ...OLD, ...KNOWN25])];

describe('r29 M01: catálogo único de destinos', () => {
  it('inventário antes ⊆ depois: toda página que já existiu está no catálogo, com grupo entre os 8', () => {
    for (const a of BEFORE) expect(ALL_AREAS29, a).toContain(a);
    for (const d of DESTS29) expect(GROUPS29, d.id).toContain(d.group);
    expect(new Set(DESTS29.map((d) => d.id)).size).toBe(DESTS29.length);
  });
  it('todo id antigo resolve (página, redirecionamento ou aba de carreira) — nenhum vira "não encontrado"', () => {
    for (const a of [...BEFORE, ...Object.keys(REDIRECT29)]) {
      const x = resolve29(a);
      expect(x, a).toBeTruthy();
      expect(x!.area, a).toBeTruthy();
    }
    expect(resolve29('inbox')).toEqual({ area: 'cockpit', tab: ['ck20', 'inbox'] });
    expect(resolve29('desk')!.area).toBe('cockpit');
    for (const a of Object.keys(ALIAS17)) expect(DESTS29.find((d) => d.id === a)!.absorbedBy, a).toEqual(ALIAS17[a]);
  });
  it('ids de hub continuam abrindo', () => {
    for (const x of HUBS27) expect(resolve29(`hub:${x.id}`), x.id).toEqual({ area: `hub:${x.id}` });
  });
  it('aliases de nome chegam ao mesmo destino (Submundo = Crime; Fraudes → S15; artista/ato; disco/lançamento)', () => {
    const crime = resolve29('Submundo');
    expect(crime).toEqual({ area: 'crime' });
    expect(resolve29('crime')).toEqual(crime);
    expect(resolve29('CRIMES')).toEqual(crime);
    expect(resolve29('fraudes')).toEqual(crime);
    expect(resolve29('Underworld')).toEqual(crime);
    expect(terms29('fakes19')).toContain('fraudes'); // a busca acha a página de fraudes pelo nome comum
    expect(resolve29('caixa de entrada')).toEqual(resolve29('inbox'));
    expect(resolve29('contrato')).toEqual({ area: 'contracts19' });
    expect(resolve29('lançamento')).toEqual({ area: 'releases' });
    expect(resolve29('formação')!.area).toBe('artists');
    expect(resolve29('s07')).toEqual(resolve29('S07'));
    expect(resolve29('')).toBeUndefined();
    expect(resolve29('xyzzy-nao-existe')).toBeUndefined();
  });
  it('norm29 ignora acento, caixa e espaços', () => {
    expect(norm29('  Lançámento  Já ')).toBe('lancamento ja');
  });
});

describe('r29 Parte VIII: 17 telas canônicas nos 8 grupos (sem macromenu novo)', () => {
  it('S01–S17 únicas, cada uma num dos 8 grupos, casa existente', () => {
    expect(SCREENS29.map((s) => s.id)).toEqual(Array.from({ length: 17 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`));
    for (const s of SCREENS29) {
      expect(GROUPS29, s.id).toContain(s.group);
      expect(s.label.pt && s.label.en, s.id).toBeTruthy();
      expect(s.terms.length, s.id).toBeGreaterThan(2);
      if (s.home.area) expect(ALL_AREAS29, s.id).toContain(s.home.area);
      for (const a of s.areas) expect(ALL_AREAS29, `${s.id}/${a}`).toContain(a);
    }
    // os 8 grupos são exatamente as seções r27 (nenhum macromenu foi criado)
    expect([...GROUPS29].sort()).toEqual(SECTIONS25.map((x) => x.id).sort());
  });
  it('alocação da Parte VIII: S02 no Cockpit, S03/S07/S13 em Gestão, S15 em Mundo, S17 utilidade global', () => {
    const g = (id: string) => SCREENS29.find((s) => s.id === id)!.group;
    expect(g('S02')).toBe('cockpit');
    expect([g('S03'), g('S07'), g('S13')]).toEqual(['admin', 'admin', 'admin']);
    expect(g('S15')).toBe('world');
    expect(SCREENS29.find((s) => s.id === 'S17')!.home.util).toBe('campaign');
    // S07 mantém o endereço em Pessoas por compatibilidade: a decisão é DECLARADA (nota), não omitida
    expect(SCREENS29.find((s) => s.id === 'S07')!.note).toBeTruthy();
  });
  it('Submundo e Fraudes continuam destinos próprios (não fundidos) e ambos na tela S15', () => {
    const s15 = SCREENS29.find((s) => s.id === 'S15')!;
    expect(s15.areas).toEqual(['crime', 'fakes19']);
  });
});

describe('r29 M02: intenções levam a etapas existentes, conforme o contexto', () => {
  it('cada intenção resolve para um destino do catálogo', () => {
    const ctx = { roster: 2, songsReady: 0, openProjects: 0, label: true };
    for (const it of INTENTS29) {
      const x = intentTarget29(it.id, ctx);
      expect(x.area ?? x.util, it.id).toBeTruthy();
      if (x.area) expect(ALL_AREAS29, it.id).toContain(x.area);
      expect(resolve29(`quero:${it.id}`, ctx), it.id).toEqual(x);
    }
  });
  it('lançar: selo sem elenco começa no recrutamento; com projeto e faixas prontas vai ao estúdio', () => {
    expect(intentTarget29('release', { roster: 0, songsReady: 0, openProjects: 0, label: true })).toEqual({ area: 'market' });
    expect(intentTarget29('release', { roster: 1, songsReady: 3, openProjects: 1, label: true })).toEqual({ area: 'studio' });
    expect(intentTarget29('release', { roster: 1, songsReady: 0, openProjects: 0, label: true })).toEqual({ area: 'project' });
    // músico sem selo: não manda para o mercado de contratos
    expect(intentTarget29('release', { roster: 0, songsReady: 0, openProjects: 0, label: false })).toEqual({ area: 'project' });
  });
});

describe('r29 M01: disponibilidade explicada (o índice mostra tudo, com o motivo)', () => {
  it('menu, aba de carreira, era e nome antigo são estados distintos, todos com texto', () => {
    const all = [...BEFORE];
    const gs = navGroups25({ active: ['label'], pages: ['label'], has: (a) => all.includes(a) && a !== 'platform16', all, sede: true });
    const inMenu = (a: string) => gs.some((g) => g.areas.includes(a));
    const c = { inMenu, registered: (a: string) => all.includes(a) };
    expect(avail29('cockpit', c)).toBe('menu');
    expect(avail29('identity', c)).toBe('tab'); // absorvida pela página da Gravadora
    expect(avail29('platform16', c)).toBe('era');
    expect(avail29('inbox', c)).toBe('redirect');
    for (const k of Object.keys(AVAIL_L29) as (keyof typeof AVAIL_L29)[]) expect(AVAIL_L29[k].pt && AVAIL_L29[k].en).toBeTruthy();
    // todo destino do inventário tem um estado conhecido quando registrado
    for (const a of BEFORE) expect(avail29(a, c), a).not.toBe('unknown');
  });
});

// ---------------------------------------------------------------- modelos das telas do ciclo (puros)
import { botMonth, defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { follow29, indicators29, money29, resume29, review29, trail29 } from '../src/ui/ps/screens29model';
import { show29, val29, KNOWN_L29, month29, usd29 } from '../src/ui/ps/state29model';
import { passport29 } from '../src/ui/ps/campaign29model';
import { cockpit27 } from '../src/ui/sys/cockpit27model';

const fresh = (seed: string): GameState => createGame(defaultConfig(seed, { dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
const played = (seed: string, months: number): GameState => { const s = fresh(seed); for (let i = 0; i < months; i++) { botMonth(s); advanceMonth(s); } return s; };

describe('r29 M06/M45: estados de dado distintos (desconhecido ≠ zero ≠ estimado)', () => {
  it('val29/show29 nunca transformam desconhecido em zero', () => {
    const f = (n: number) => `$${n}`;
    expect(show29(val29(null), f)).toBe('desconhecido');
    expect(show29(val29(undefined), f, 'en')).toBe('unknown');
    expect(show29(val29(0), f)).toBe('$0');
    expect(show29(val29(5, { estimated: true }), f)).toBe('≈ $5');
    expect(show29({ kind: 'na' }, f)).toBe('não se aplica');
    expect(show29({ kind: 'stale', n: 3, asOf: 'mar/1962' }, f)).toContain('mar/1962');
    for (const k of Object.keys(KNOWN_L29) as (keyof typeof KNOWN_L29)[]) expect(new Set([KNOWN_L29[k].pt]).size).toBe(1);
    expect(new Set(Object.values(KNOWN_L29).map((x) => x.pt)).size).toBe(Object.keys(KNOWN_L29).length);
  });
  it('dinheiro com sinal e data completa', () => {
    expect(usd29(-12345)).toBe('−$123');
    expect(usd29(12345, true)).toBe('+$123');
    expect(month29(1962, 0)).toEqual({ pt: 'jan/1962', en: 'Jan 1962' });
  });
});

describe('r29 S01/S03/S13/S16/M04/M17: modelos do ciclo', () => {
  it('jogo novo: fôlego desconhecido (sem mês fechado) e fama "não se aplica" sem elenco — nunca zero', () => {
    const s = fresh('r29-new');
    const ind = indicators29(s);
    expect(ind.map((x) => x.id)).toEqual(['month', 'cash', 'runway', 'fame']);
    expect(ind.find((x) => x.id === 'runway')!.v.kind).toBe('unknown');
    expect(ind.find((x) => x.id === 'fame')!.v.kind).toBe('na');
    for (const x of ind) if (x.v.kind === 'value') expect(x.v.source ?? x.v.unit, x.id).toBeTruthy();
    const r = review29(s);
    expect(r.checks.find((c) => c.id === 'cash')!.state).toBe('unknown');
    expect(trail29(s).continuity.pt).toMatch(/dez\/|Sandbox/);
  });
  it('depois de jogar: revisão usa as decisões reais (com o padrão escrito) e não altera o estado', () => {
    const s = played('r29-cycle', 8);
    const before = JSON.stringify(s);
    const r = review29(s);
    const m = money29(s);
    const f = follow29(s, ['finance', 'crime']);
    const res = resume29(s);
    indicators29(s); trail29(s); passport29(s);
    expect(JSON.stringify(s)).toBe(before); // consulta pura: nada muda, nem o RNG
    for (const d of s.decisions) {
      const c = r.checks.find((x) => x.id === `dec:${d.id}`)!;
      expect(c.state).toBe('pending');
      expect(c.detail!.pt).toMatch(/padrão|Sem padrão/);
    }
    expect(r.counts.met + r.counts.pending + r.counts.blocked + r.counts.unknown).toBe(r.checks.length);
    expect(r.summary.pt.length).toBeGreaterThan(10);
    // S13: três naturezas, nada somado entre elas; caixa realizado = saldo do estado
    expect(new Set(m.map((x) => x.kind))).toEqual(new Set(['realized', 'committed', 'estimated']));
    expect(m.find((x) => x.id === 'cash')!.v.n ?? 0).toBe(s.player.cash);
    // M04: páginas fixadas e artistas acompanhados são listas separadas
    expect(f.pages).toEqual(['finance', 'crime']);
    expect(Array.isArray(f.acts)).toBe(true);
    // M17: data do checkpoint, sem inventar passagem de tempo
    expect(res.date).toEqual(month29(s.year, s.month));
    expect(res.choices.length).toBeLessThanOrEqual(3);
  });
  it('o Cockpit r27 continua o mesmo (o acompanhamento é acrescentado na vista, não no modelo)', () => {
    const s = played('r29-ck', 3);
    const m = cockpit27(s, 'pt-BR', 'x');
    expect(m.strip.map((k) => k.label.pt)).toEqual(['Mês', 'Caixa', 'Fôlego', 'Fama']);
  });
  it('M30: passaporte corresponde ao estado (semente, início/fim, versão) e separa regras de apresentação', () => {
    const s = fresh('r29-pass');
    const rows = passport29(s, { menuView: 'full', textScale: 120 });
    const get = (id: string) => rows.find((r) => r.id === id)!;
    expect(get('seed').value).toBe(s.config.seed);
    expect(get('seed').kind).toBe('rules');
    expect(get('menuView').kind).toBe('view');
    expect(get('text').value).toBe('120%');
    const sv = get('saveVersion').value;
    expect(typeof sv === 'string' ? sv : sv.pt).toContain(`v${s.version}`);
    const span = get('span').value as { pt: string };
    expect(span.pt).toContain(String(s.config.startYear));
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});

import { clearDraft29, loadDraft29, saveDraft29 } from '../src/ui/ps/draft29';
describe('r29 M42: rascunho persistente (preferência de interface, expira, por partida)', () => {
  it('grava, recupera, expira e apaga — sem tocar no estado do jogo', () => {
    const mem = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    saveDraft29('runA', 'nego', 'act1', { advance: 5000 }, 10);
    expect(loadDraft29<{ advance: number }>('runA', 'nego', 'act1', 12)!.v.advance).toBe(5000);
    expect(loadDraft29('runB', 'nego', 'act1', 12)).toBeNull(); // outra partida não vê
    expect(loadDraft29('runA', 'nego', 'act1', 30)).toBeNull(); // expirou (mundo mudou)
    expect(mem.size).toBe(0);
    saveDraft29('runA', 'nego', 'act1', { advance: 1 }, 10);
    clearDraft29('runA', 'nego', 'act1');
    expect(loadDraft29('runA', 'nego', 'act1', 10)).toBeNull();
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});

// ---------------------------------------------------------------- R29b item 1 — S03: grade semana/mês com capacidade
import { cols29, grid29, colItems29, monthOfWeek29 } from '../src/ui/ps/grid29model';
import { monthIndex } from '../src/sim/capacity';
describe('r29 S03: grade semana/mês com capacidade por recurso (consulta)', () => {
  it('semana e mês: 6 colunas, a 1ª é o período atual; recursos pessoas/estúdio/dinheiro/tempo/prazos', () => {
    const s = played('r29-grid', 6);
    const before = JSON.stringify(s);
    for (const mode of ['week', 'month'] as const) {
      const G = grid29(s, mode);
      expect(G.cols.length).toBe(6);
      expect(G.cols[0].now).toBe(true);
      expect(G.cols[0].month).toBe(monthIndex(s)); // a coluna atual é o mês do relógio do jogo
      const kinds = new Set(G.rows.map((r) => r.kind));
      for (const k of ['studio', 'money', 'time', 'deadlines'] as const) expect(kinds.has(k), k).toBe(true);
      for (const r of G.rows) expect(r.cells.length).toBe(6);
      // tempo pessoal: só o mês em curso é calculado; os outros meses ficam "desconhecido", nunca zero
      const time = G.rows.find((r) => r.kind === 'time')!;
      G.cols.forEach((c, i) => { if (c.month !== monthIndex(s)) expect(time.cells[i].v.kind).toBe('unknown'); else expect(time.cells[i].v.kind).not.toBe('unknown'); });
      for (const c of G.cols) colItems29(s, c);
    }
    expect(JSON.stringify(s)).toBe(before); // selecionar/consultar não muda o estado nem o RNG
  });
  it('meses em ordem e semanas contíguas', () => {
    const s = played('r29-grid2', 2);
    const M = cols29(s, 'month');
    for (let i = 1; i < M.length; i++) { expect(M[i].month).toBe(M[i - 1].month + 1); expect(M[i].w0).toBe(M[i - 1].w1); }
    const W = cols29(s, 'week');
    for (let i = 1; i < W.length; i++) expect(W[i].w0).toBe(W[i - 1].w1);
    expect(monthOfWeek29(s, s.week)).toBe(monthIndex(s));
  });
});

// ---------------------------------------------------------------- R29b item 2/3 — S04/S05 inspetor e M41 lote
import { insp29, INSP_TABS29 } from '../src/ui/ps/insp29model';
import { UNDO29, undo29 } from '../src/ui/ps/batch29model';
const estab = (seed: string): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: 1975, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
describe('r29 S04/S05: inspetor lateral do ato (5 abas, só leitura)', () => {
  it('abas Formação/Projetos/Contratos/Agenda/Saúde lidas das fontes; nada muda no estado', () => {
    const s = estab('r29-insp');
    for (let i = 0; i < 3; i++) { botMonth(s); advanceMonth(s); }
    expect(INSP_TABS29.map((x) => x.id)).toEqual(['lineup', 'projects', 'contracts', 'agenda', 'health']);
    const ids = Object.values(s.acts).filter((a) => a.owner === 'player').map((a) => a.id);
    expect(ids.length).toBeGreaterThan(0);
    const before = JSON.stringify(s);
    for (const id of ids) {
      const m = insp29(s, id)!;
      expect(m.name).toBe(s.acts[id].name);
      // formação = integrantes vivos, na mesma ordem do ato
      expect(m.tabs.lineup.map((r) => r.person)).toEqual(s.acts[id].members.filter((p) => s.persons[p]?.alive));
      // contratos: só os vigentes do jogador com este ato
      const live = Object.values(s.contracts).filter((c) => c.actId === id && c.party === 'player' && c.endWeek >= s.week).length;
      expect(m.tabs.contracts.filter((r) => typeof r.title !== 'string' && r.title.pt.startsWith('Contrato')).length).toBe(live);
      expect(m.tabs.health.length).toBeGreaterThanOrEqual(4);
      for (const k of Object.keys(m.empty) as (keyof typeof m.empty)[]) expect(m.empty[k].pt.length).toBeGreaterThan(5);
    }
    expect(insp29(s, 'nao-existe')).toBeNull();
    expect(JSON.stringify(s)).toBe(before);
  });
});
describe('r29 M41: lote com prévia e reversibilidade declarada', () => {
  it('toda ação em lote do registro tem texto de reversibilidade; nunca promete desfazer o que não desfaz', () => {
    expect(undo29('agenda.manual').pt).toMatch(/Reversível/);
    expect(undo29('leader.praise').pt).toMatch(/Não reversível/);
    expect(undo29('qualquer.coisa').pt).toMatch(/Não se desfaz/);
    for (const k of Object.keys(UNDO29)) expect(UNDO29[k].en.length).toBeGreaterThan(5);
  });
});
