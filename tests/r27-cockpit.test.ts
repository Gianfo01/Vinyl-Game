// r27 (COCK): Cockpit é a 1ª seção do menu e a página inicial; o painel é enxuto (cockpit27model.ts):
// "Agora" (≤3 ações), faixa do mês (data, caixa, fôlego, fama), ≤4 cartões, um único contador de decisões e nenhum "(0)".
import { describe, expect, it } from 'vitest';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { AGORA_MAX27, CARDS_MAX27, ROWS_MAX27, cockpit27, texts27 } from '../src/ui/sys/cockpit27model';
import { SECTIONS25, landing27, navGroups25 } from '../src/ui/ps/nav25';
import { hqModel25 } from '../src/ui/ps/hq25model';

const fresh = (seed: string): GameState => createGame(defaultConfig(seed, { dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
const established = (seed: string): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: 1975, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));

/** Textos que contam decisões ("Decisões (2)", "Mais 3 decisões…", "2 decisões"). */
const DEC = /decis\w*\s*\(\d+\)|\d+\s+(?:\w+\s+)?decis/i;

function check(s: GameState): void {
  const m = cockpit27(s, 'pt-BR', 'Janeiro');
  const xs = texts27(m);
  expect(m.agora.length).toBeLessThanOrEqual(AGORA_MAX27);
  expect(m.cards.length).toBeLessThanOrEqual(CARDS_MAX27);
  for (const c of m.cards) { expect(c.rows.length).toBeGreaterThan(0); expect(c.rows.length).toBeLessThanOrEqual(ROWS_MAX27); }
  // nenhum contador zerado e no máximo um contador de decisões na tela
  expect(xs.filter((x) => /\(0\)/.test(x))).toEqual([]);
  expect(xs.filter((x) => DEC.test(x)).length).toBeLessThanOrEqual(1);
  // sem cartão repetido; "Agora" é o mesmo "Precisa de você" da sede
  expect(new Set(m.cards.map((c) => c.id)).size).toBe(m.cards.length);
  expect(m.agora.map((n) => n.id)).toEqual(hqModel25(s).needs.slice(0, AGORA_MAX27).map((n) => n.id));
  // faixa do mês: data, caixa, fôlego e fama
  expect(m.strip.map((k) => k.label.pt)).toEqual(['Mês', 'Caixa', 'Fôlego', 'Fama']);
  // o painel é curto (a análise mediu ~1.200 palavras no fim do ano 1)
  expect(xs.join(' ').split(/\s+/).length).toBeLessThan(400);
}

describe('r27 (COCK) — Cockpit como página inicial e menu de topo', () => {
  it('é a 1ª seção do menu, sozinho, e a página de entrada (nova ou carregada)', () => {
    expect(SECTIONS25[0].id).toBe('cockpit');
    expect(SECTIONS25[0].themes.flatMap((t) => t.areas)).toEqual(['cockpit']);
    expect(SECTIONS25.filter((x) => x.themes.some((t) => t.areas.includes('cockpit'))).length).toBe(1);
    const gs = navGroups25({ active: ['label'], pages: ['label'], has: () => true, all: [], sede: true });
    expect(gs[0].id).toBe('cockpit');
    expect(landing27(true)).toBe('cockpit');
    expect(landing27(false)).toBe('cockpit');
  });
  it('Você é seção de topo (a última), com a vida do jogador', () => {
    const you = SECTIONS25[SECTIONS25.length - 1];
    expect(you.id).toBe('you');
    expect(you.themes.flatMap((t) => t.areas)).toEqual(expect.arrayContaining(['you', 'personal', 'wealth']));
    expect(SECTIONS25.find((x) => x.id === 'admin')!.themes.flatMap((t) => t.areas)).not.toContain('you');
  });
  it('início do jogo: enxuto, primeiro passo no Agora, cartões vazios viram uma linha', () => {
    const s = fresh('ck27-a');
    check(s);
    const m = cockpit27(s);
    expect(m.agora.some((n) => n.id === 'step:artist')).toBe(true);
    expect(m.cards.length + m.empty.length).toBe(4);
  });
  it('com decisões pendentes: um único contador de decisões, nenhum "(0)"', () => {
    const s = established('ck27-b');
    for (let i = 0; i < 18 && s.decisions.length < 3; i++) advanceMonth(s);
    check(s);
    const m = cockpit27(s);
    const shown = m.agora.filter((n) => n.id.startsWith('dec:') && n.id !== 'dec:more').length;
    // toda decisão aparece no Agora ou no único contador ("Mais N…" / "+N decisões…")
    if (s.decisions.length > shown) expect(texts27(m).filter((x) => DEC.test(x)).length).toBe(1);
  });
  it('fim do ano 1 (bot jogando): continua enxuto', () => {
    const s = fresh('ck27-c');
    for (let i = 0; i < 12; i++) { botMonth(s); advanceMonth(s); }
    check(s);
  });
});
