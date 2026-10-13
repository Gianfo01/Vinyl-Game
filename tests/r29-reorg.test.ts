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
