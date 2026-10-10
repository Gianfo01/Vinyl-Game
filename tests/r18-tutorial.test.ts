// Rodada 18 (tutorial18) — toda página do menu tem ajuda; abas conhecidas também; glossário, trilhas e dicas
// existem para tudo e só LEEM o estado (nada muda a simulação).
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { CAREER_PAGE17, NAV17, ORDER17 } from '../src/ui/nav17';
import { help18, helpFor18, helpIds18, tabHelp18 } from '../src/ui/help18';
import '../src/ui/help18data';
import '../src/ui/help18tabs';
import { GLOSS18, gloss18, searchGloss18 } from '../src/ui/gloss18';
import { COMMON18, TIPS18, TRACKS18, dueTips18, trackState18 } from '../src/ui/tracks18';

const files: string[] = [];
const walk = (d: string): void => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
walk(join(__dirname, '../src/ui'));
const regs = (re: RegExp): [string, string][] => files.flatMap((f) => { const src = readFileSync(f, 'utf8'); return [...src.matchAll(re)].map((m) => [m[1] ?? '', /id: '([^']+)'/.exec(src.slice(m.index!, m.index! + 400))?.[1] ?? ''] as [string, string]); });

const TREE = NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas));
const PAGES = ORDER17.flatMap((id) => [CAREER_PAGE17[id].area, ...CAREER_PAGE17[id].absorbs]);
const REG_AREAS = regs(/registerArea\(\s*\{/g).map((x) => x[1]).filter(Boolean);
/** abas vistas no Chromium (partida de 2005): chave do data-tabs : id */
const CRAWLED = ['lv-goals:run', 'lv-goals:ach', 'lv-goals:museum', 'business-finance:dre18', 'business-finance:capital', 'business-finance:loans7', 'business-finance:stakes8', 'business-finance:overview', 'business-finance:stock', 'business-business:era8', 'business-business:org12', 'business-business:subs', 'business-business:companies', 'business-business:catalog', 'business-business:legal', 'business-business:brands', 'business-business:dispute15', 'business-business:why12', 'business-business:rights8', 'business-business:eras18', 'people:roster', 'people:health', 'people:relations', 'people:secrets', 'people:staff', 'people:feed', 'marketHub:classic', 'marketHub:discovery', 'marketHub:auctions', 'marketHub:w4fairs', 'marketHub:dossier8', 'catalogHub:list', 'catalogHub:sync15', 'catalogHub:story12', 'catalogHub:retro', 'mediaHub:press', 'mediaHub:channels', 'mediaHub:st18', 'mediaHub:mk18', 'mediaHub:radio18', 'mediaHub:clips18', 'mediaHub:w4radio', 'mediaHub:w4method', 'worldHub:map', 'worldHub:history', 'worldHub:countries', 'worldHub:scene12', 'chartsHub:global', 'chartsHub:more', 'chartsHub:countries', 'chartsHub:hype12', 'labels9:rank', 'labels9:list', 'labels9:leaders', 'industry:supply', 'industry:retail', 'industry:dist', 'industry:research', 'industry:corp', 'industry:board', 'industry:fx', 'lendas9:pan', 'lendas9:tl', 'lendas9:bio', 'lendas9:relics', 'lendas9:relics18', 'lendas9:city', 'lendas9:eras17', 'lendas9:press', 'lendas9:book', 'festivals16:circuit', 'festivals16:map', 'crime17:orgs', 'crime17:plans', 'crime17:spy', 'crime17:market', 'crime17:police', 'crime17:log', 'life-you:me', 'life-you:persona', 'life-you:skills', 'life-you:decisions', 'life-you:looks17', 'life-you:music', 'life-you:diary', 'life-personal:love', 'life-personal:heart17', 'life-personal:kids17', 'life-personal:care17', 'life-personal:leisure', 'life-personal:agenda8', 'life-personal:vices', 'life-personal:routines12', 'life-wealth:wealth', 'life-wealth:goods8', 'agenda17:agenda', 'agenda17:you', 'agenda17:hire', 'agenda17:free', 'agenda17:session', 'cp17-label:identity', 'cp17-label:biz17', 'cp17-label:trade', 'cp17-label:image', 'cp17-label:circuit', 'cp17-label:venues', 'management9:roster', 'management9:prospect', 'management9:reports', 'management9:poach', 'management9:agency12', 'management9:services12', 'studio12:studio', 'studio12:producer', 'long18:paths', 'long18:laws', 'long18:policy', 'long18:pm', 'long18:year', 'long18:bio', 'long18:house', 'long18:diff', 'regions18:ov', 'regions18:sub', 'regions18:circ', 'regions18:kpop', 'regions18:jp', 'regions18:log', 'rights18:sum', 'rights18:works', 'rights18:rec', 'rights18:clr', 'rights18:disp', 'rights18:soc', 'rights18:stm', 'rights18:cat', 'rights18:pub', 'rights18:prec', 'society18:awards', 'society18:charts', 'society18:ai', 'society18:censor', 'society18:charity', 'society18:city', 'supply18:press', 'supply18:dist', 'supply18:stock', 'supply18:deals', 'supply18:rep', 'talent18:disc', 'talent18:camps', 'talent18:band', 'talent18:school', 'talent18:tv'];

const full = (x: { title: { pt: string; en: string }; what: { pt: string; en: string }; how: { pt: string; en: string } }): boolean =>
  [x.title, x.what, x.how].every((y) => y.pt.length > 1 && y.en.length > 1);

describe('tutorial18: ajuda', () => {
  it('toda área do menu (árvore nav17, páginas de carreira, telas absorvidas e áreas registradas) tem ajuda bilíngue', () => {
    const all = [...new Set([...TREE, ...PAGES, ...REG_AREAS])];
    expect(all.length).toBeGreaterThan(70);
    const miss = all.filter((a) => !help18(a) || !full(help18(a)!));
    expect(miss).toEqual([]);
    // "como usar" traz exemplo concreto
    expect(all.filter((a) => !/Ex\.|E\.g\./.test(help18(a)!.how.pt + help18(a)!.how.en))).toEqual([]);
  });
  it('toda aba registrada (registerTab/registerPageTab/abas de carreira) e toda aba vista no navegador tem ajuda', () => {
    const tabIds = [...regs(/registerTab\(\s*'([a-zA-Z]+)'\s*,\s*\{/g), ...regs(/registerPageTab\(\s*'([a-z]+)'\s*,\s*\{/g)].map(([host, id]) => [host === 'act' || host === 'label' ? host : '*', id] as [string, string]).filter((x) => x[1]);
    expect(tabIds.length).toBeGreaterThan(50);
    const missReg = tabIds.filter(([k, id]) => !tabHelp18(k, id) && !tabHelp18('*', id) && !tabHelp18('act', id));
    // abas de ficha antigas sem rótulo próprio ficam cobertas pela ajuda do artista
    expect(missReg.filter(([, id]) => !['facts17', 'world17', 'hist15', 'arc12', 'identity8', 'lendas9', 'leader10', 'cap14', 'playbook8', 'rivals12', 'standing9', 'succ16'].includes(id))).toEqual([]);
    const missCrawl = CRAWLED.filter((x) => { const [k, id] = x.split(':'); return !tabHelp18(k, id); });
    expect(missCrawl).toEqual([]);
    for (const c of ['festival', 'venue', 'musician', 'screen', 'critic']) expect(helpIds18().some((id) => id.startsWith(`tab:${CAREER_PAGE17[c].area}:`))).toBe(true);
    for (const id of ['ability18', 'traj18', 'feud18', 'fans18', 'dyn18']) expect(tabHelp18('act', id)).toBeTruthy();
  });
  it('helpFor18 junta página e abas abertas sem repetir', () => {
    const r = helpFor18('finance', [['business-finance', 'dre18'], ['business-finance', 'dre18'], ['x', 'nada']]);
    expect(r.area?.title.pt).toBe('Finanças');
    expect(r.tabs.length).toBe(1);
    expect(r.tabs[0].title.en).toBe('P&L and cash');
  });
  it('ligações e termos citados existem', () => {
    for (const id of helpIds18()) {
      const x = help18(id)!;
      for (const a of x.links ?? []) expect(help18(a), `${id} → ${a}`).toBeTruthy();
      for (const g of x.gloss ?? []) expect(gloss18(g), `${id} → ${g}`).toBeTruthy();
    }
  });
});

describe('tutorial18: glossário', () => {
  it('cobre os termos pedidos e busca sem acento e por apelido', () => {
    for (const id of ['deal360', 'masters', 'recoup', 'crosscoll', 'mechanical', 'performance', 'neighbouring', 'pro', 'ecad', 'sync', 'pd', 'aggregator', 'pitch', 'payola', 'capa']) expect(gloss18(id), id).toBeTruthy();
    expect(GLOSS18.length).toBeGreaterThanOrEqual(60);
    expect(new Set(GLOSS18.map((x) => x.id)).size).toBe(GLOSS18.length);
    expect(searchGloss18('ecad')[0].id).toBe('ecad');
    expect(searchGloss18('execucao').some((x) => x.id === 'performance')).toBe(true);
    expect(searchGloss18('360')[0].id).toBe('deal360');
    expect(searchGloss18('jaba')[0].id).toBe('payola');
  });
});

describe('tutorial18: trilhas e dicas', () => {
  it('toda carreira tem trilha; todo destino tem ajuda; leitura não muda o estado', () => {
    const s = createGame(defaultConfig('tut18'));
    const before = JSON.stringify(s);
    for (const id of ORDER17) {
      const rows = trackState18(s, id, {}, {});
      expect(rows.length, id).toBeGreaterThanOrEqual(COMMON18.length + 3);
      for (const r of rows) expect(help18(r.obj.area), `${id}:${r.obj.area}`).toBeTruthy();
    }
    expect(TRACKS18.map((x) => x.id).sort()).toEqual([...ORDER17].sort());
    // visita conta; feito antes é pegajoso
    expect(trackState18(s, 'label', { market: 1 }, {}).find((x) => x.obj.id === 'market')?.ok).toBe(true);
    expect(trackState18(s, 'label', {}, { 'label:gold': 1 }).find((x) => x.obj.id === 'gold')?.ok).toBe(true);
    const tips = dueTips18(s, {}, 5);
    expect(Array.isArray(tips)).toBe(true);
    expect(JSON.stringify(s)).toBe(before);
    for (const tp of TIPS18) if (tp.area) expect(help18(tp.area), tp.id).toBeTruthy();
    for (const tp of TIPS18) if (tp.gloss) expect(gloss18(tp.gloss), tp.id).toBeTruthy();
  });
  it('dica dispara quando o fato aparece e some depois de vista', () => {
    const s = createGame(defaultConfig('tut18b'));
    const x4 = s.x4 as unknown as { facts17?: { f: unknown[]; seq: number } };
    x4.facts17 = { f: [{ id: 'f1', y: s.year, m: 0, w: s.week, kind: 'scandal', actors: ['player'], severity: 50, visibility: 'public', tags: [], text: { pt: 'x', en: 'x' } }], seq: 1 };
    expect(dueTips18(s, {}, 9).some((t) => t.id === 'scandal')).toBe(true);
    expect(dueTips18(s, { scandal: 1 }, 9).some((t) => t.id === 'scandal')).toBe(false);
  });
});
