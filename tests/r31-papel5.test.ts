// R31 · onda 5 (PAPEL, EXP-4) — páginas dentro dos papéis (src/ui/r31/papers5.ts), atrás de exp5.nav.
// Prova: cada papel mostra a mesma página (as mesmas abas, nenhuma perdida) e os mesmos números; desligado = igual a hoje;
// explorar (abrir, trocar marcador, fixar e tirar do bolso) não muda o mundo; a caixa de entrada é a mesma em toda época.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { SW_NAV5, pocketIds5 } from '../src/sim/r31/exp5';
import { fin18, mIdx18, netProfit18 } from '../src/sim/ledger18';
import { position20 } from '../src/sim/oblig20';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import { rngSnapshot19 } from '../src/sim/rng19';
import { ALL_AREAS29 } from '../src/ui/ps/route29model';
import { TABS_REG27 } from '../src/ui/ps/tabsreg27';
import { getTab, setTab } from '../src/ui/vis';
import { MOVES5, object5 } from '../src/ui/r31/objects5';
import { key5 } from '../src/ui/r31/keys5';
import { paperOf5, pin5 } from '../src/ui/r31/nav5';
import { INBOX5, inbox5Look, PAPER5 } from '../src/ui/pixel/exp5paper';
import { INBOX_LOOK5, PAPER_FRAMES5, PAPER_OBJS5, ledgerData5, paperGo5, paperPageIds5, paperKey5Ev, paperObjOf5, paperPageOf5, paperTabs5, wrapPaper5 } from '../src/ui/r31/papers5';

const game = (y = 1962, months = 0): GameState => {
  const g = createGame(defaultConfig(`papel5-${y}`, { startYear: y, scenario: 'established' }));
  for (let i = 0; i < months; i++) { playMonth(g, 'balanced'); advanceMonth(g); }
  return g;
};
const snap = (g: GameState): string => JSON.stringify(g) + JSON.stringify(rngSnapshot19(g));
const fakePage = {} as HTMLElement; // desligado, o papel nem olha a página

/** Abas de hoje de uma página (registro gerado das abas). */
const tabsOf = (area: string): Map<string, string[]> => {
  const m = new Map<string, string[]>();
  for (const [a, key, tab] of TABS_REG27) if (a === area) m.set(key, [...(m.get(key) ?? []), tab]);
  return m;
};

describe('R31 onda 5 PAPEL — registro', () => {
  it('os 16 objetos da frente têm papel, tecla e moldura aprovada', () => {
    expect(PAPER_OBJS5.sort()).toEqual(['arquivoaco', 'caderno', 'cofre', 'contador', 'correspondencia', 'diario', 'graficos', 'jornal', 'livrocaixa', 'olheiro', 'quadrobranco', 'quadrometas', 'radiotv', 'revista', 'secretaria', 'telefone']);
    for (const id of PAPER_OBJS5) {
      expect(object5(id), id).toBeTruthy();
      expect(paperPageOf5(id), id).toBeTruthy();
      expect(paperOf5(id), `${id} na API da casca`).toBeTruthy();
      expect(key5(`obj:${id}`)?.chord, id).toBeTruthy();
    }
    for (const g of Object.values(PAPER_FRAMES5)) {
      if (g.frame.k === 'paper') expect(PAPER5).toContain(g.frame.p);
      else for (const y of [1900, 1955, 1980, 1995, 2005, 2030]) expect(INBOX5).toContain(g.frame.look(y));
    }
    expect(paperPageIds5()).toEqual(expect.arrayContaining(PAPER_OBJS5));
  });

  it('cada página dona abre no papel do seu objeto; abas que mudaram de objeto abrem no papel novo', () => {
    for (const id of PAPER_OBJS5) for (const o of object5(id)!.opens) {
      for (const m of MOVES5) if (m.area === o.area && m.tab) setTab(m.key, '');
      expect(paperObjOf5(o.area), `${id} ${o.area}`).toBe(id);
    }
    setTab('business-finance', 'capital'); expect(paperObjOf5('finance')).toBe('cofre');
    setTab('business-finance', 'stakes8'); expect(paperObjOf5('finance')).toBe('cofre');
    setTab('business-finance', 'pos20'); expect(paperObjOf5('finance')).toBe('livrocaixa');
    setTab('business-business', 'learn31'); expect(paperObjOf5('business')).toBe('caderno');
    setTab('business-business', 'legal'); expect(paperObjOf5('business')).toBe('contador');
    setTab('ck20', 'inbox'); expect(paperObjOf5('cockpit')).toBe('correspondencia');
    setTab('ck20', 'panel'); expect(paperObjOf5('cockpit')).toBe('secretaria');
    setTab('ck20', 'desk'); expect(paperObjOf5('cockpit')).toBeUndefined(); // a mesa do mês é cena (outra frente)
  });

  it('nenhuma aba de hoje se perde: cada aba das páginas dos papéis aparece em exatamente um papel (ou foi para outro objeto)', () => {
    const areas = new Set(PAPER_OBJS5.flatMap((id) => object5(id)!.opens.map((o) => o.area)).concat(['finance', 'business']));
    for (const area of areas) for (const [key, tabs] of tabsOf(area)) for (const tab of tabs) {
      const papers = PAPER_OBJS5.filter((id) => paperTabs5(id, area, key, [tab]).length);
      const mv = MOVES5.find((m) => m.area === area && m.key === key && (m.tab === undefined || m.tab === tab));
      const owner = PAPER_OBJS5.find((id) => object5(id)!.opens.some((o) => o.area === area));
      if (mv && !PAPER_OBJS5.includes(mv.to)) { expect(papers.filter((p) => p === owner), `${area}/${key}/${tab}`).toEqual([]); continue; }
      const here = papers.filter((p) => p === owner || p === mv?.to);
      expect(here.length, `${area}/${key}/${tab}`).toBe(1);
    }
  });
});

describe('R31 onda 5 PAPEL — mesmos números', () => {
  it('o livro-caixa lê as mesmas contas da DRE e da Posição', () => {
    const g = game(1962, 4);
    const D = ledgerData5(g);
    const F = fin18(g);
    const mi = mIdx18(g);
    const M = F.m[mi - 1] ?? F.m[mi];
    expect(D.net).toBe(netProfit18(M));
    expect(D.cash).toBe(position20(g).cash);
    expect(D.debt).toBe(position20(g).debt);
    expect(D.year.net).toBe(netProfit18(F.y[g.year]));
    expect(D.last).toHaveLength(12);
    expect(D.last[11].v).toBe(netProfit18(M));
    // as linhas somam o resultado do mês (o que entrou menos o que saiu)
    expect(Math.round(D.rows.reduce((a, [, v]) => a + v, 0))).toBe(Math.round(D.net));
  });
});

describe('R31 onda 5 PAPEL — desligado e explorar', () => {
  it('desligado: nenhuma página vira papel, abrir não mexe nas abas e as teclas do papel não fazem nada', () => {
    const g = game();
    setSw(g, SW_NAV5, false);
    for (const a of ALL_AREAS29) expect(wrapPaper5(g, a, fakePage), a).toBeNull();
    setTab('business-finance', 'capital');
    paperGo5(g, { area: 'finance' });
    expect(getTab('business-finance')).toBe('capital');
    expect(paperKey5Ev({ key: 'a' }, g)).toBe(false);
    expect(paperKey5Ev({ key: 'Escape' }, g)).toBe(false);
  });

  it('ligado: Z abre o livro-caixa mesmo depois do cofre (a aba emprestada volta), e marcador com aba é respeitado', () => {
    const g = game();
    setSw(g, SW_NAV5, true);
    setTab('business-finance', 'capital');
    paperGo5(g, { area: 'finance' });
    expect(paperObjOf5('finance')).toBe('livrocaixa');
    setTab('business-finance', 'capital');
    paperGo5(g, { area: 'finance', tab: ['business-finance', 'capital'] });
    expect(paperObjOf5('finance')).toBe('cofre');
  });

  it('explorar não muda o mundo: resolver papéis, ler o livro-caixa e fixar/tirar do bolso deixam o estado igual', () => {
    const g = game(1985, 2);
    setSw(g, SW_NAV5, true);
    const before = snap(g);
    for (const a of ALL_AREAS29) { paperObjOf5(a); paperGo5(g, { area: a }); }
    ledgerData5(g);
    for (const id of PAPER_OBJS5) { pin5(g, id); }
    expect(pocketIds5(g).length).toBeGreaterThan(0);
    for (const id of PAPER_OBJS5) { if (pocketIds5(g).includes(id)) pin5(g, id); }
    expect(pocketIds5(g)).toEqual([]);
    expect(snap(g)).toBe(before);
  });
});

describe('R31 onda 5 PAPEL — caixa de entrada igual em toda época', () => {
  it('um papel só (mesma função, mesmas peças e teclas); a época troca só a aparência, nas 6 formas', () => {
    const looks = [1889, 1919, 1920, 1969, 1970, 1989, 1990, 1999, 2000, 2009, 2010, 2040].map(inbox5Look);
    expect(new Set(looks)).toEqual(new Set(INBOX5));
    for (const lk of INBOX5) expect(INBOX_LOOK5[lk].pt.length).toBeGreaterThan(0);
    // o mesmo desenho para qualquer ano (não há um papel por época)
    expect(paperPageOf5('correspondencia')).toBe(paperPageOf5('correspondencia'));
    expect(PAPER_OBJS5.filter((id) => id.startsWith('correspondencia'))).toEqual(['correspondencia']);
  });
});
