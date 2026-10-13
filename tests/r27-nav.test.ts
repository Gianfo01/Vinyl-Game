// Rodada 27 — menu em árvore (Seção › Página › Aba): toda página e toda aba interna alcançáveis pela árvore,
// a busca acha abas nunca abertas (registro gerado, não histórico), a partida abre no Cockpit (r27 COCK) e
// só uma janela por vez (metas de abertura → tutorial → dicas; tour só a pedido).
import { describe, expect, it } from 'vitest';
import { CAREER_PAGE17, NAV17, ORDER17 } from '../src/ui/nav17';
import { SEDE25, landing27, navGroups25 } from '../src/ui/ps/nav25';
import { REG27, allTabs27, inYear27, tabIndex27, tabPath27, tabTree27, type TabNode27 } from '../src/ui/ps/subtabs27';
import { OV_ORDER27, mayShowPure27, nextOverlay27 } from '../src/ui/ps/queue27';
import { tutorialIntro14 } from '../src/ui/tutorial14';
import { rank15 } from '../src/ui/navcore15';

const TREE17 = NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas));
const ABS = ORDER17.flatMap((id) => CAREER_PAGE17[id].absorbs);
const PAGES = ORDER17.map((id) => CAREER_PAGE17[id].area);
const OLD = ['identity', 'biz17', 'management', 'tour12', 'studio12', 'publishing16', 'outlets16', 'platform16', 'shared18', 'artist18', 'tut18', 'agenda17'];
const ALL = [...new Set([...TREE17, ...ABS, ...PAGES, ...OLD])];
const menu = (active: string[]) => navGroups25({ active, pages: active, has: (a) => ALL.includes(a), all: ALL, sede: true });
const flat = (ns: TabNode27[]): TabNode27[] => ns.flatMap((n) => [n, ...flat(n.kids)]);

describe('r27: menu em árvore', () => {
  it('o registro cobre as páginas com abas (inclusive as de carreira) e nada vem de chave dinâmica', () => {
    const areas = new Set(REG27.map((d) => d.area));
    expect(areas.size).toBeGreaterThan(40);
    for (const a of ['world', 'charts', 'hq', 'cockpit', 'finance', 'business', 'cp17-label', 'wealth']) expect(areas.has(a)).toBe(true);
    for (const d of REG27) { expect(d.label.pt.length).toBeGreaterThan(0); expect(d.label.en.length).toBeGreaterThan(0); expect(d.key).not.toMatch(/:/); }
  });
  it('toda página e toda aba do registro são alcançáveis pela árvore (todas as carreiras e só o selo)', () => {
    for (const act of [ORDER17, ['label']]) {
      const gs = menu(act);
      // a árvore mostra os temas (sections) da seção: juntos, cobrem todas as páginas, sem repetir
      const shown = gs.flatMap((g) => g.sections!.flatMap((s) => s.areas));
      expect(shown.length).toBe(new Set(shown).size);
      expect(shown.sort()).toEqual(gs.flatMap((g) => g.areas).sort());
      expect(shown).toContain(SEDE25);
      const tabs = allTabs27();
      for (const area of new Set(REG27.map((d) => d.area))) {
        const absorbed = act.some((id) => CAREER_PAGE17[id].absorbs.includes(area));
        if (absorbed || (PAGES.includes(area) && !act.some((id) => CAREER_PAGE17[id].area === area))) continue; // vira aba da página da carreira
        expect(shown, area).toContain(area);
        // toda aba da página aparece na árvore dela (abas internas sob a aba-mãe)
        const tree = flat(tabTree27(area, tabs));
        expect(tree.length).toBe(REG27.filter((d) => d.area === area).length);
        for (const n of tree) for (const k of n.kids) expect(k.trail[k.trail.length - 1]).toEqual([n.key, n.id]);
      }
    }
  });
  it('abas internas ficam sob a aba-mãe (Patrimônio › Bens e investimentos › Investimentos › Renda fixa)', () => {
    const roots = tabTree27('wealth', allTabs27());
    const goods = roots.find((n) => n.id === 'goods8')!;
    const inv = goods.kids.find((n) => n.id === 'invest')!;
    expect(inv.kids.map((n) => n.id)).toContain('fixed');
    expect(tabPath27(inv.kids.find((n) => n.id === 'fixed')!)).toEqual([['life-wealth', 'goods8'], ['goods8', 'invest'], ['invest10', 'fixed']]);
  });
  it('sem teto de 5: páginas com muitas abas listam todas', () => {
    const hq = tabTree27('hq', allTabs27());
    expect(hq.length).toBeGreaterThan(5);
  });
  it('abas de época: só aparecem nos anos em que existem', () => {
    const video = REG27.find((d) => d.area === 'charts' && d.id === 'video')!;
    expect(inYear27(video, 1962)).toBe(false);
    expect(inYear27(video, 2012)).toBe(true);
    expect(allTabs27(1962).some((d) => d.id === 'video' && d.area === 'charts')).toBe(false);
  });
  it('abas vistas que o registro não conhece entram; chaves dinâmicas (festival/artista) não', () => {
    const seen = [
      { area: 'charts', key: 'nova27', id: 'x', label: { pt: 'Aba nova', en: 'New tab' }, trail: [] as [string, string][] },
      { area: 'festivals', key: 'fest12:f9', id: 'y', label: { pt: 'Palco', en: 'Stage' }, trail: [] as [string, string][] },
    ];
    const xs = allTabs27(undefined, seen);
    expect(xs.some((d) => d.key === 'nova27')).toBe(true);
    expect(xs.some((d) => d.key === 'fest12:f9')).toBe(false);
  });
});

describe('r27: busca acha abas nunca abertas', () => {
  it('Ctrl+K: índice vem do registro (histórico vazio), em pt e en', () => {
    const pt = tabIndex27('pt', 2000, []);
    const r = rank15(pt.map((x) => ({ ...x, kind: 'tab' })), 'renda fixa');
    expect(r[0]?.label).toBe('Renda fixa');
    expect(r[0]?.area).toBe('wealth');
    const en = rank15(tabIndex27('en', 2000, []).map((x) => ({ ...x, kind: 'tab' })), 'fixed income');
    expect(en[0]?.label).toBe('Fixed income');
    // o nome no outro idioma também acha (pt na interface, busca em inglês)
    expect(rank15(pt.map((x) => ({ ...x, kind: 'tab' })), 'balance').some((x) => x.label === 'Balanço')).toBe(true);
  });
});

describe('r27 (COCK): a partida abre no Cockpit', () => {
  it('nova ou carregada, com ou sem a tela da sede: Cockpit, a 1ª seção do menu', () => {
    expect(landing27(true)).toBe('cockpit');
    expect(landing27(false)).toBe('cockpit');
    expect(menu(ORDER17)[0].id).toBe('cockpit');
    expect(menu(['label'])[0].areas).toEqual([landing27(true)]);
  });
  it('o 1º passo do tutorial aponta para o Cockpit em toda carreira', () => {
    for (const id of [...ORDER17, '']) expect(tutorialIntro14(id ? [id] : []).area).toBe('cockpit');
    expect(tutorialIntro14(['label']).title.pt).toContain('Cockpit');
    expect(tutorialIntro14(['manager']).title.pt).toContain('gestão'); // o texto continua sendo do ofício
  });
});

describe('r27: uma janela por vez', () => {
  it('prioridade: metas de abertura → tutorial → dica de 1ª vez → tour', () => {
    expect(OV_ORDER27).toEqual(['opening', 'tutorial', 'tip', 'tour']);
    expect(nextOverlay27(['tip', 'tutorial', 'opening'], false)).toBe('opening');
    expect(nextOverlay27(['tip', 'tutorial'], false)).toBe('tutorial');
    expect(nextOverlay27(['tip'], false)).toBe('tip');
    expect(nextOverlay27(['opening'], true)).toBeNull(); // algo já na tela: espera
  });
  it('quem tem prioridade menor espera; nada aparece por cima de outra janela', () => {
    expect(mayShowPure27('tutorial', ['opening', 'tutorial'], false)).toBe(false);
    expect(mayShowPure27('opening', ['opening', 'tutorial'], false)).toBe(true);
    expect(mayShowPure27('tip', ['tutorial'], false)).toBe(false);
    expect(mayShowPure27('tip', [], false)).toBe(true);
    expect(mayShowPure27('tip', [], true)).toBe(false);
    expect(mayShowPure27('tour', ['tip'], false)).toBe(false);
  });
});

describe('r27 FLOW2: contador das seções do menu', () => {
  it('cada seção soma só as próprias páginas; decisões contam só no Cockpit', async () => {
    const { secBadge27, DECISION_PAGES27 } = await import('../src/ui/ps/tree27');
    const it = (id: string, badge?: number) => ({ id, label: id, icon: 'x', badge });
    expect(secBadge27('cockpit', [it('cockpit', 5)])).toBe(5);
    // uma página de decisões perdida na Sede (mesa/caixa antigas) não infla o contador da Sede
    expect(secBadge27('sede', [it(SEDE25), it('campus18', 2), it('desk', 5), it('inbox', 3), it('cockpit', 4)])).toBe(2);
    expect(secBadge27('people', [it('artists', 1), it('managers14', 2)])).toBe(3);
    expect(secBadge27('sede', [it('hq'), it('plan')])).toBe(0);
    // e no menu real nenhuma página de decisões fica fora do Cockpit
    for (const g of menu(['label', 'musician'])) if (g.id !== 'cockpit') for (const a of g.areas) expect(DECISION_PAGES27.has(a)).toBe(false);
    expect(menu(['label']).find((g) => g.id === 'cockpit')?.areas).toEqual(['cockpit']);
  });
});
