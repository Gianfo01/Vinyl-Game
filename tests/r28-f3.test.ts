// Rodada 28 (F3, C5) — a história do jogador em primeiro plano: Diário do jogador num anel próprio (sem descarte), "Só
// marcantes" sem nº 1 alheio, orçamento único de atenção (cenas, dicas, Diário), cooldown por (evento, ator) com peso
// 0,85ⁿ, variantes do eco padrão com ator e objeto, eco na escala da receita, eco forte → cena com intervalo, portões
// de época + vocabulário moderno em 1889/1920, nome da parada pelo ano, mundo inicial pela cena e língua da cidade e
// eco perdido registrado. Determinismo: mesma semente, mesmo estado.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { l } from '../src/data/world';
import { cityById } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import { EV28, EVENTS, eventById } from '../src/sim/events';
import { conseq18, conseqKeys18, Fx18 } from '../src/sim/decide18';
import { dec18, fire18, schedule18, type Echo18 } from '../src/sim/sys/decide18';
import {
  ATTN28, ERA_FIX28, VOCAB28, annualRev28, attnScenes28, attnTip28, diary28, echoSceneMark28, echoSceneOk28, eraFrom28, eraOk28,
  fullDiary28, landmarks28, lost28, pickScenes28, recent28, spendTip28, st28, strongEcho28,
} from '../src/sim/sys/story28';
import { VARIANTS28, echoText28, stake28 } from '../src/sim/sys/echovar28';
import { chartName28, chartNameL28 } from '../src/sim/chartname28';
import { bandName } from '../src/sim/people';
import { cityGenreFit23 } from '../src/sim/genre23';
import { money, playerActs, remember } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys';

const mk = (y = 1962, seed = 'r28f3') => createGame(defaultConfig(seed, { startYear: y, dbSize: 'small', bandGenre: 'rnr', bandName: 'Banda Teste' }));
const mine = (s: GameState) => {
  const id = playerActs(s)[0];
  if (id) return s.acts[id];
  const a = Object.values(s.acts).filter((x) => x.members.length >= 1 && x.status !== 'retired' && x.status !== 'split' && !x.owner).sort((x, y) => x.id.localeCompare(y.id))[0];
  a.owner = 'player';
  return a;
};
const other = (s: GameState) => Object.values(s.acts).filter((a) => !a.owner && !a.playerBand).sort((x, y) => y.id.localeCompare(x.id))[0];

describe('r28 F3 — Diário do jogador', () => {
  it('anel próprio, sem descarte: o começo do selo sobrevive ao corte do Diário geral', () => {
    const s = mk();
    const a = mine(s);
    const first = remember(s, 'decision:teste', l('Primeira decisão do selo', 'First label decision'), { actId: a.id });
    for (let i = 0; i < 1700; i++) remember(s, 'release', l(`rotina ${i}`, `routine ${i}`), { actId: other(s).id });
    expect(s.memory.find((m) => m.id === first.id)).toBeUndefined(); // o geral cortou
    expect(diary28(s).some((m) => m.id === first.id)).toBe(true); // o anel guardou
    expect(fullDiary28(s).some((m) => m.id === first.id)).toBe(true);
    expect(diary28(s).some((m) => m.text.pt.startsWith('rotina'))).toBe(false); // fato do mundo não entra no anel
  });

  it('"Só marcantes": sem nº 1 alheio, com o nº 1 do jogador e no máximo 2 fatos do mundo por mês', () => {
    const s = mk();
    remember(s, 'number1', l('"X" de Fulano chega ao #1', 'x'), { actId: other(s).id, important: true });
    remember(s, 'number1', l('"Meu hit" chega ao #1', 'y'), { actId: mine(s).id, important: true });
    for (let i = 0; i < 5; i++) remember(s, 'law', l(`lei ${i}`, `law ${i}`), { important: true });
    const lm = landmarks28(s);
    expect(lm.some((m) => m.text.pt.includes('Fulano'))).toBe(false);
    expect(lm.some((m) => m.text.pt.includes('Meu hit'))).toBe(true);
    expect(lm.filter((m) => m.kind === 'law').length).toBe(ATTN28.worldMonth);
  });

  it('"Só marcantes": nº 1 por país alheio fica fora; o do selo em 25 países vira uma linha "(+24)"', () => {
    const s = mk();
    remember(s, 'no1_country', l('"Y" de Fulano chega ao #1 em Chile.', 'y'), { actId: other(s).id, important: true });
    for (let i = 0; i < 25; i++) remember(s, 'no1_country', l(`"Meu hit" chega ao #1 em país ${i}.`, `country ${i}`), { actId: mine(s).id, important: true });
    const lm = landmarks28(s).filter((m) => m.kind === 'no1_country');
    expect(lm.length).toBe(1);
    expect(lm[0].text.pt).toContain('+24');
    expect(diary28(s).filter((m) => m.kind === 'no1_country').length).toBe(25); // o anel guarda todas
  });
});

describe('r28 F3 — orçamento de atenção', () => {
  const cs = (id: string, kind: string, data: Record<string, unknown> = {}) => ({ id, kind, data });
  it('cenas: 2 por avanço, 3 por mês; decisão sempre passa; marcos e eco "você escolheu" na frente', () => {
    const list = [cs('a', 'moment16'), cs('b', 'cine18', { echo28: 1 }), cs('c', 'awards'), cs('d', 'court'), cs('e', 'moment16')];
    const ok = pickScenes28(list, 0, 0);
    expect(ok).toContain('d'); // 'always'
    expect(ok).toContain('c'); // marco do selo
    expect(ok).toContain('b'); // eco forte
    expect(ok).not.toContain('a');
    expect(ok.length).toBe(3);
    expect(pickScenes28(list, 0, 2)).toEqual(['c', 'd']); // mês quase cheio: só 1 a mais
  });
  it('com estado: decide uma vez por cena; dica não abre no avanço em que uma cena abriu e no máximo 3 por mês', () => {
    const s = mk();
    const l1 = [cs('x1', 'moment16'), cs('x2', 'moment16'), cs('x3', 'moment16')];
    expect(attnScenes28(s, l1)).toEqual(['x1', 'x2']);
    expect(attnScenes28(s, l1)).toEqual(['x1', 'x2']); // idempotente
    expect(attnTip28(s)).toBe(false);
    s.week += 1; // próximo avanço, mesmo mês
    expect(attnTip28(s)).toBe(true);
    for (let i = 0; i < ATTN28.tipsMonth; i++) spendTip28(s);
    expect(attnTip28(s)).toBe(false);
  });
});

describe('r28 F3 — eventos: cooldown por (evento, ator), 0,85ⁿ e portões de época', () => {
  it('o mesmo ator espera; outro ator não; o peso cai 0,85 por repetição', () => {
    const s = mk();
    const def = eventById.controversial_remark;
    const a = mine(s).id, b = other(s).id;
    expect(EV28.w!(s, def, { act: a })).toBe(1);
    EV28.on!(s, def, { act: a });
    expect(EV28.skip!(s, def, { act: a })).toBe(true);
    expect(EV28.skip!(s, def, { act: b })).toBe(false);
    EV28.on!(s, def, { act: b });
    expect(recent28(s, def.id)).toBe(2);
    expect(EV28.w!(s, def, { act: b })).toBeCloseTo(0.85 ** 2, 6);
    s.week += Math.max(ATTN28.pairMin, def.cooldown * 2) * 4 + 1;
    expect(EV28.skip!(s, def, { act: a })).toBe(false);
  });

  const textOf = (id: string) => { const d = eventById[id]; return [d.title.pt, d.title.en, d.text.pt, d.text.en, ...d.options.flatMap((o) => [o.label.pt, o.label.en, o.hint?.pt ?? '', o.hint?.en ?? ''])].join(' \n '); };
  for (const y of [1889, 1920]) it(`vocabulário moderno: nenhum evento liberado em ${y} fala de tecnologia que ainda não existe`, () => {
    const bad: string[] = [];
    for (const d of EVENTS) {
      if (!eraOk28(d, y, null) || ERA_FIX28[d.id] === null) continue; // exceção revisada (texto já cobre as duas épocas)
      for (const [rx, y0] of VOCAB28) if (y < y0 && rx.test(textOf(d.id))) bad.push(`${d.id}:${rx.source.slice(0, 14)}`);
    }
    expect(bad).toEqual([]);
    expect(Object.values(ERA_FIX28).filter((x) => x === null).length).toBeLessThanOrEqual(3); // exceções são poucas e revisadas
  });
  it('portões: a van só depois de 1950; streaming segue a data da tecnologia nesta história', () => {
    expect(eraOk28(eventById.d18_van, 1893, null)).toBe(false);
    expect(eraOk28(eventById.d18_van, 1960, null)).toBe(true);
    const s = mk(2005);
    s.techDates.streaming = 2012;
    expect(eraOk28(eventById.streaming_party, 2010, s)).toBe(false);
    expect(eraFrom28(eventById.streaming_party, s)).toBe(2012);
  });
  it('1889 jogado: nenhum cartão sorteado com vocabulário fora de época (12 meses, bot)', () => {
    const s = mk(1889, 'r28voc');
    const bad: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      playMonth(s, 'balanced');
      advanceMonth(s);
      for (const d of s.decisions) if (!seen.has(d.id)) {
        seen.add(d.id);
        const def = eventById[d.eventId];
        if (!def || ERA_FIX28[def.id] === null) continue;
        for (const [rx, y0] of VOCAB28) if (s.year < y0 && rx.test(textOf(def.id))) bad.push(`${s.year}:${def.id}`);
      }
    }
    expect(bad).toEqual([]);
  }, 120_000);
});

describe('r28 F3 — ecos', () => {
  it('3 variantes por (grupo × desfecho), com ator e objeto; ids diferentes dão textos diferentes', () => {
    for (const g of Object.values(VARIANTS28)) for (const v of Object.values(g)) {
      expect(v.length).toBeGreaterThanOrEqual(3);
      for (const x of v) expect(x.pt.includes('{o}') && x.en.includes('{o}')).toBe(true);
    }
    const s = mk();
    const a = mine(s);
    const texts = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const f = new Fx18(s, { act: a.id, e18: `t${i}.0` }, Rng.fromSeed('x'));
      f.t = l('Contrato com a TV', 'TV deal');
      const tx = echoText28(f, 'riskWin', 'market', l('no mercado', 'in the market'));
      expect(tx.pt).toContain('Contrato com a TV');
      texts.add(tx.pt);
    }
    expect(texts.size).toBeGreaterThanOrEqual(2);
  });
  it('dinheiro: piso no valor antigo; escala com a receita; teto em 8% da receita', () => {
    const s = mk();
    const a = mine(s);
    const f = new Fx18(s, { act: a.id }, Rng.fromSeed('y'));
    const old = Math.round(650 * (0.7 + a.fame / 80));
    s.player.revenueByYear = {};
    expect(stake28(f, 650)).toBe(old);
    s.player.revenueByYear[s.year - 1] = money(s, 5_000_000);
    const big = stake28(f, 650);
    expect(big).toBeGreaterThan(old);
    expect(money(s, big)).toBeLessThanOrEqual(annualRev28(s) * 0.08 + money(s, 2));
    expect(big).toBeLessThanOrEqual(old * 12 + 1);
  });
  it('eco perdido é registrado: fila cheia e quem saiu do mundo', () => {
    const s = mk();
    const a = mine(s);
    const key = conseqKeys18().find((k) => (conseq18(k)?.later ?? []).some((e) => typeof e.p === 'number' && e.p > 0))!;
    for (let i = 0; i < 90; i++) schedule18(s, key, { act: a.id }, l(`Decisão ${i}`, `Decision ${i}`), l('sim', 'yes'));
    expect(dec18(s).q.length).toBeLessThanOrEqual(80);
    expect(lost28(s).queue).toBeGreaterThan(0);
    const e: Echo18 = { ...dec18(s).q[0], c: { ...dec18(s).q[0].c, act: 'a-nao-existe' } };
    expect(fire18(s, e)).toBeNull();
    expect(lost28(s).gone).toBe(1);
    expect(diary28(s).filter((m) => m.kind === 'echo_lost28').length).toBe(lost28(s).queue + 1);
    expect(st28(s).lost.log.length).toBeGreaterThan(0);
  });
  it('eco forte → cena no máximo a cada 10 semanas; força pelo dinheiro relativo à receita', () => {
    const s = mk();
    expect(echoSceneOk28(s)).toBe(true);
    echoSceneMark28(s);
    s.week += ATTN28.echoGap - 1;
    expect(echoSceneOk28(s)).toBe(false);
    s.week += 1;
    expect(echoSceneOk28(s)).toBe(true);
    s.player.revenueByYear = { [s.year - 1]: money(s, 100_000) };
    expect(strongEcho28(s, { tags: ['good'], data: { n: 1, cs: money(s, 4000) } })).toBe(true);
    expect(strongEcho28(s, { tags: ['good'], data: { n: 1, cs: money(s, 100) } })).toBe(false);
    expect(strongEcho28(s, { tags: ['bad'], data: { n: 1 } })).toBe(true);
  });
});

describe('r28 F3 — nomes e mundo inicial', () => {
  it('nome da parada pelo ano (fictício e real)', () => {
    expect(chartName28('singles', 1889)).toBe('Suplemento dos Fonógrafos');
    expect(chartName28('singles', 1962)).toBe('WorldSound 100');
    expect(chartName28('albums', 1962)).toBe('WorldSound LPs');
    expect(chartName28('albums', 1962, true)).not.toContain('Billboard 200');
    expect(chartName28('albums', 1995, true)).toBe('Billboard 200');
    expect(chartNameL28('singles', 1889).en).toBe('Phonograph Supplement');
  });
  it('nome de banda na língua do país, com os mesmos sorteios do inglês', () => {
    const r1 = Rng.fromSeed('nm'), r2 = Rng.fromSeed('nm');
    bandName(r1, 'en', 'rock', 4);
    const fr = bandName(r2, 'fr', 'rock', 4);
    expect(r1.next()).toBe(r2.next()); // fluxo do Rng intacto
    expect(/^(Les |[A-ZÉ])/.test(fr)).toBe(true);
    expect(fr.startsWith('The ')).toBe(false);
  });
  it('mundo inicial: gêneros dos atos procedurais combinam com a cena da cidade', () => {
    const s = mk(1962, 'r28world');
    const proc = Object.values(s.acts).filter((a) => !a.catalogNo && !a.owner && !a.playerBand && a.formed <= 1962);
    const fit = proc.filter((a) => cityGenreFit23(a.city, a.genre)).length / Math.max(1, proc.length);
    expect(proc.length).toBeGreaterThan(20);
    expect(fit).toBeGreaterThanOrEqual(0.95);
    expect(proc.every((a) => cityById[a.city])).toBe(true);
  });
});

describe('r28 F3 — determinismo', () => {
  it('mesma semente, 6 meses com o bot: estado idêntico (inclui o anel do Diário e o cooldown por ator)', () => {
    const run = () => { const s = mk(1962, 'r28det'); for (let i = 0; i < 6; i++) { playMonth(s, 'balanced'); advanceMonth(s); } return s; };
    const a = run(), b = run();
    expect(JSON.stringify(st28(a))).toBe(JSON.stringify(st28(b)));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(diary28(a).length).toBeGreaterThan(0);
  }, 180_000);
});
