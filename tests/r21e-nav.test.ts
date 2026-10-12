// Rodada 21e (interface, §2.3 itens 7, 8 e 17): toda área/aba registrada é alcançável pelo menu, pelo Ctrl+K ou pela ajuda;
// barras longas agrupadas (≤ 6 na fileira) sem perder nenhum id antigo; ids de ajuda que não são páginas viram tópicos.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALIAS14 } from '../src/ui/careernav14';
import '../src/ui/help18data';
import '../src/ui/help18tabs';
import { helpAreaIds18, helpIds18, helpTopicIds18, isTopic18 } from '../src/ui/help18';
import { ALIAS17, CAREER_PAGE17, ORDER17, groupOf17, navGroups17, resolve17 } from '../src/ui/nav17';
import { GROUPS21, HUB_TABS21, arrange21, groupOfTab21, tabIndex21 } from '../src/ui/tabgroups21';

// ---- varredura estática do código da interface (sem DOM): áreas registradas e ids de aba escritos no código
const UI = join(__dirname, '..', 'src', 'ui');
function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) files(p, out); else if (p.endsWith('.ts')) out.push(p); }
  return out;
}
const SRC = files(UI).map((p) => readFileSync(p, 'utf8')).join('\n');
const REGISTERED = [...SRC.matchAll(/registerArea\(\{\s*id: '([^']+)'/g)].map((m) => m[1]);
const appSrc = readFileSync(join(UI, 'app.ts'), 'utf8');
const BASE = [...appSrc.slice(appSrc.indexOf('const AREAS'), appSrc.indexOf('];', appSrc.indexOf('const AREAS'))).matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
const ALL_AREAS = [...new Set([...BASE, ...REGISTERED])];
const TAB_IDS = new Set([...SRC.matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]));

const menu = () => navGroups17({ active: ORDER17, pages: ORDER17, has: () => true, all: ALL_AREAS });
const reachable = (id: string, flat: string[]) => flat.includes(id) || flat.includes(ALIAS14[id] ?? '') || (!!ALIAS17[id] && flat.includes(ALIAS17[id][0]));

describe('r21e: nada fica fora do menu, do Ctrl+K ou da ajuda', () => {
  it('toda área registrada aparece no menu (ou redireciona para uma que aparece)', () => {
    expect(ALL_AREAS.length).toBeGreaterThan(60);
    const flat = menu().flatMap((g) => g.areas);
    for (const id of ALL_AREAS) expect(reachable(id, flat), id).toBe(true);
    // telas absorvidas (identity, biz17…) chegam à aba certa da página da carreira
    for (const [old, [page, tab]] of Object.entries(ALIAS17)) { const r = resolve17(old, menu()); expect(r.area).toBe(page); expect(r.tab?.[1]).toBe(tab); }
  });

  it('Gravadora mora no grupo Empresa (renomeado "Gravadora" com o selo ativo) e mantém o atalho em Você', () => {
    const gs = menu();
    expect(groupOf17(gs, 'cp17-label').id).toBe('company');
    expect(gs.find((g) => g.id === 'company')!.label.pt).toBe('Gravadora');
    expect(gs.find((g) => g.id === 'you')!.areas).toContain('cp17-label');
    // selo só como negócio (carreira principal de músico): o grupo volta a se chamar Empresa, a página continua lá
    const g2 = navGroups17({ active: ['musician'], pages: ['musician', 'label'], has: () => true, all: ALL_AREAS });
    expect(groupOf17(g2, 'cp17-label').id).toBe('company');
    expect(g2.find((g) => g.id === 'company')!.label.pt).toBe('Empresa');
    // sem a página do selo, Empresa fica como antes
    const g3 = navGroups17({ active: ['manager'], pages: ['manager'], has: () => true, all: ALL_AREAS });
    expect(g3.flatMap((g) => g.areas)).not.toContain('cp17-label');
  });

  it('barras agrupadas: ≤ 6 na fileira, ids internos únicos, todo id antigo continua existindo no código', () => {
    const OLD: Record<string, string[]> = {
      'cp17-label': ['identity', 'lead', 'biz17', 'trade', 'image', 'circuit', 'venues'],
      'business-finance': ['pos20', 'dre18', 'overview', 'stock', 'capital', 'loans7', 'stakes8', 'debt19'],
      'business-business': ['subs', 'companies', 'catalog', 'legal', 'brands', 'era8', 'org12', 'grupo19', 'why12', 'dispute15', 'rights8', 'eras18', 'ai8'],
      mediaHub: ['press', 'channels', 'st18', 'mk18', 'radio18', 'clips18', 'w4radio', 'w4method'],
      rights18: ['sum', 'works', 'rec', 'clr', 'disp', 'soc', 'stm', 'cat', 'pub', 'prec'],
      lendas9: ['pan', 'tl', 'bio', 'relics', 'relics18', 'post18', 'city', 'eras17', 'press', 'book', 'estate19'],
    };
    for (const [key, d] of Object.entries(GROUPS21)) {
      expect(d.groups.length, key).toBeLessThanOrEqual(6);
      const ids = d.groups.flatMap((g) => g.tabs.map((x) => x.id));
      expect(new Set(ids).size, key).toBe(ids.length);
      for (const id of ids) expect(TAB_IDS.has(id), `${key}:${id}`).toBe(true);
      for (const id of OLD[key] ?? []) expect(ids, `${key} perdeu ${id}`).toContain(id);
      expect(ALL_AREAS.concat(Object.values(CAREER_PAGE17).map((p) => p.area))).toContain(d.area);
    }
    // arranjo: grupo acha a aba antiga; aba desconhecida vai para "Mais" (ou fica solta se for só uma)
    expect(groupOfTab21('business-finance', 'loans7')?.id).toBe('capital');
    expect(groupOfTab21('business-finance', 'capital')?.id).toBe('capital');
    const items = [{ id: 'pos20' }, { id: 'loans7' }, { id: 'x1' }, { id: 'x2' }];
    const ar = arrange21('business-finance', items);
    expect(ar.map((g) => g.id)).toEqual(['pos20', 'capital', 'more21']);
    expect(ar[2].items.map((i) => i.id)).toEqual(['x1', 'x2']);
    expect(arrange21('business-finance', [{ id: 'pos20' }, { id: 'x1' }]).map((g) => g.id)).toEqual(['pos20', 'x1']);
    expect(arrange21('semgrupo', [{ id: 'a' }]).map((g) => g.id)).toEqual(['a']);
  });

  it('índice do Ctrl+K cobre os hubs r20 e as barras agrupadas; toda entrada leva a uma área do menu e a um id real', () => {
    const idx = tabIndex21();
    const flat = menu().flatMap((g) => g.areas);
    for (const x of idx) { expect(reachable(x.area, flat), x.area).toBe(true); expect(TAB_IDS.has(x.id), `${x.key}:${x.id}`).toBe(true); }
    for (const k of ['showsHub', 'hqHub', 'companyTabs', 'people', 'creation-write', 'creation-studio', 'creation-release']) expect(HUB_TABS21[k]).toBeTruthy();
    const keys = new Set(idx.map((x) => `${x.key}:${x.id}`));
    expect(keys.size).toBe(idx.length);
  });

  it('ajuda: ids de página são páginas, tópicos são tópicos, ajuda por aba com host conhecido aponta para aba indexada', () => {
    const flat = menu().flatMap((g) => g.areas);
    for (const id of helpAreaIds18()) expect(reachable(id, flat), `ajuda ${id} não é uma página`).toBe(true);
    const topics = helpTopicIds18();
    expect(topics.length).toBeGreaterThanOrEqual(16);
    for (const id of topics) { expect(isTopic18(id)).toBe(true); expect(reachable(id.slice('topic:'.length), flat), id).toBe(false); }
    const idx = new Set(tabIndex21().map((x) => `${x.key}:${x.id}`));
    const known = new Set([...Object.keys(GROUPS21), ...Object.keys(HUB_TABS21)]);
    for (const id of helpIds18().filter((x) => x.startsWith('tab:'))) {
      const [, host, tab] = id.split(':');
      if (known.has(host)) expect(idx.has(`${host}:${tab}`), id).toBe(true);
    }
  });
});
