// Masters 31 (onda 0, W0-KN) — conhecimento em fonte única (src/sim/know.ts).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame, talentScore } from '../src/sim/worldgen';
import { KNOW_WIDTHS, band, know, know3 } from '../src/sim/know';
import { estimate } from '../src/sim/scouting';
import { fameText, knownLevel } from '../src/sim/sys/fame15';
import { INSIDE31, fameHere31, guessPot31, see, seen, shownFame31 } from '../src/sim/know';
import { knownActIds31 } from '../src/sim/sys/knownacts27';
import { meNode31, meet31, tie31 } from '../src/sim/social31';
import { knowsMe31 } from '../src/sim/sys/social31sys';
import { watchAct } from '../src/sim/scouting';
import { emitFact } from '../src/sim/facts17';
import { l } from '../src/data/world';
import { explain18 } from '../src/sim/explain18';
import { insight27, patienceKnown27 } from '../src/sim/sys/nego27';
import { setOpinion } from '../src/sim/opinion';
import { INSIGHT_AT, insider31, insight } from '../src/sim/sys/bolsa10';
import { setSw } from '../src/sim/r31/switches';

const ROOT = join(__dirname, '..');

describe('r31 know — o que se sabe vem de um lugar só', () => {
  it('o meio da faixa nunca é o valor real (desvio determinístico e estável)', () => {
    const s = createGame(defaultConfig('r31-know', { startYear: 1980 }));
    const others = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand).slice(0, 40);
    expect(others.length).toBeGreaterThan(10);
    let ranges = 0;
    for (const a of others) {
      s.knowledge[a.id] = { actId: a.id, degree: 3, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'watch' };
      const pot = estimate(s, a.id, 'potential')!;
      const tal = estimate(s, a.id, 'talent')!;
      expect(pot).not.toBeNull();
      expect(tal).not.toBeNull();
      expect(pot.mid).not.toBe(Math.round(a.potential));
      expect((pot.lo + pot.hi) / 2).not.toBe(a.potential);
      expect(tal.mid).not.toBe(Math.round(talentScore(s, a)));
      // estável: a mesma pergunta dá a mesma faixa
      expect(estimate(s, a.id, 'potential')).toEqual(pot);
      ranges++;
    }
    expect(ranges).toBeGreaterThan(10);
    // valores nas bordas também saem do centro
    for (const v of [0, 1, 50, 99, 100]) for (const w of [3, 10, 30]) {
      const b = band(s, 'x', `edge.${v}.${w}`, v, w)!;
      expect(b.mid).not.toBe(v);
      expect(b.lo).toBeLessThanOrEqual(b.hi);
    }
    // perto das bordas e com v ≈ w/2, em várias larguras: nem o centro nem o palpite caem no valor real
    for (const w of [3, 6, 8, 10, 15, 18, 20, 24, 26, 30]) for (const v of [0, 0.5, 1, 2, w / 2 - 1, w / 2 - 0.5, w / 2, w / 2 + 0.5, w / 2 + 1, 50, 100 - w / 2, 98, 99, 100]) for (const id of ['a', 'b', 'c', 'd']) {
      const b = band(s, id, `edge2.${v}`, v, w)!;
      expect(b.mid).not.toBe(Math.round(v));
      expect(Math.abs((b.lo + b.hi) / 2 - v)).toBeGreaterThanOrEqual(0.5);
      expect(b.lo).toBeGreaterThanOrEqual(0);
      expect(b.hi).toBeLessThanOrEqual(100);
    }
    // combinar duas leituras de larguras diferentes (extrapolação linear v = (c1·w2 − c2·w1)/(w2 − w1)) não devolve
    // mais o valor real: com a fração fixa por alvo (W0) o erro era ~0 em 100% dos casos. Limite matemático: com sinal
    // estável e |desvio| em 20–45% de w, a faixa mais estreita sozinha já prende o valor em 0,45·w — por isso a medida
    // é feita com larguras ≥ 10 (a faixa estreita de grau alto é de propósito quase exata).
    let hit3 = 0, hit1 = 0, n = 0, err = 0;
    const pairs: [number, number][] = [[26, 15], [30, 18], [18, 10], [20, 11], [24, 13]];
    for (let i = 0; i < 200; i++) for (const [w1, w2] of pairs) {
      const v = 20 + (i * 37) % 60;
      const b1 = band(s, `t${i}`, 'talent', v, w1)!, b2 = band(s, `t${i}`, 'talent', v, w2)!;
      for (const [c1, c2] of [[(b1.lo + b1.hi) / 2, (b2.lo + b2.hi) / 2], [b1.mid, b2.mid]]) {
        const e = Math.abs((c1 * w2 - c2 * w1) / (w2 - w1) - v);
        n++; err += e;
        if (e < 3) hit3++;
        if (e < 1) hit1++;
      }
    }
    expect(hit1 / n).toBeLessThan(0.35);
    expect(hit3 / n).toBeLessThan(0.75);
    expect(err / n).toBeGreaterThanOrEqual(2);
    // oculto e exato
    expect(band(s, 'x', 'f', 40, 99)).toBeNull();
    expect(band(s, 'x', 'f', 40, 0)).toEqual({ lo: 40, hi: 40, mid: 40, exact: true });
  });

  it('a mesma pessoa mostra o mesmo grau em estimate e fameText (regra do país do jogador, sem atalho de fama ≥ 30)', () => {
    const s = createGame(defaultConfig('r31-know2', { startYear: 1990 }));
    const acts = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand);
    let exact = 0, range = 0, hidden = 0;
    for (const a of acts.slice(0, 300)) {
      const e = estimate(s, a.id, 'fame');
      const ft = fameText(s, a.id);
      if (!e) { expect(ft).toBe('?'); hidden++; continue; }
      if (e.lo === e.hi) { expect(ft).toBe(String(e.lo)); exact++; } else { expect(ft).toBe(`${e.lo}–${e.hi}`); range++; }
      // exato ⇔ público no país do jogador (pub ≥ 2), não a fama global
      expect(e.lo === e.hi).toBe(knownLevel(s, a.id).pub >= 2);
    }
    expect(exact + range + hidden).toBeGreaterThan(50);
    // fama global alta não basta: sem exposição no país do jogador, nada de número exato
    const far = acts.find((a) => knownLevel(s, a.id).pub < 2);
    if (far) { far.fame = Math.max(far.fame, 35); if (knownLevel(s, far.id).pub < 2) expect(estimate(s, far.id, 'fame')?.lo === estimate(s, far.id, 'fame')?.hi).toBe(false); }
  });

  it('larguras vêm de uma tabela só (sim), e a UI não guarda a sua', () => {
    const s = createGame(defaultConfig('r31-know3', { startYear: 1980 }));
    const a = Object.values(s.acts).find((x) => x.owner !== 'player' && !x.playerBand)!;
    for (let d = 0; d <= 5; d++) {
      s.knowledge[a.id] = { actId: a.id, degree: d, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'watch' };
      const k = know(s, a.id);
      expect(k.width('attrs')).toBe(KNOW_WIDTHS.attrs.byDeg[k.priv]);
      expect(know3(k)).toBe(know3(know(s, a.id))); // mesma conta para a página de conhecidos
      const e = estimate(s, a.id, 'potential');
      expect(e === null).toBe(k.width('potential') >= 99);
    }
    // as tabelas antigas saíram dos consumidores
    const ui = readFileSync(join(ROOT, 'src/ui/sys/persona13.ts'), 'utf8');
    expect(ui).not.toMatch(/\[99,\s*30,\s*18,\s*10,\s*4,\s*0\]/);
    const sc = readFileSync(join(ROOT, 'src/sim/scouting.ts'), 'utf8');
    expect(sc).not.toMatch(/\[40,\s*26,\s*15,\s*8,\s*3\]|\[16,\s*10,\s*6,\s*4,\s*2\]/);
    const f15 = readFileSync(join(ROOT, 'src/sim/sys/fame15.ts'), 'utf8');
    expect(f15).not.toMatch(/k\.deg >= 3 \? 6 : 12/);
  });
});

// ---------------------------------------------------------------- 31.3 (F): as 25 incoerências de docs/r31/conhecimento.md

const src = (p: string): string => readFileSync(join(ROOT, p), 'utf8');
function world(seed: string, startYear = 1985) {
  const s = createGame(defaultConfig(seed, { startYear }));
  const others = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && a.members.length);
  // obscuro, sem olheiro, sem laço e sem exposição no seu país
  const obscure = others.find((a) => know(s, a.id).pub === 0 && !s.knowledge[a.id] && a.members.every((m) => !tie31(s, meNode31(s), m)))!;
  const famous = others.slice().sort((a, b) => b.fame - a.fame)[0];
  return { s, others, obscure, famous };
}
const scout = (s: ReturnType<typeof createGame>, id: string, degree: number) => { s.knowledge[id] = { actId: id, degree, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'watch' }; };

describe('r31 know (31.3 · F) — as 25 incoerências corrigidas, uma asserção cada', () => {
  it('#1 diretório não é onisciente: obscuro sem laço fica fora; o radar entra', () => {
    const { s, others } = world('r31-kn-1');
    const kn = knownActIds31(s);
    const obscure = others.find((a) => !kn.has(a.id) && know(s, a.id).pub === 0)!;
    expect(obscure).toBeTruthy(); // há gente no mundo que a sua empresa não conhece — e ela não aparece
    expect(others.filter((a) => !kn.has(a.id)).length).toBeGreaterThan(others.length / 3);
    watchAct(s, obscure.id);
    expect(knownActIds31(s).has(obscure.id)).toBe(true);
  });
  it('#2 integrantes de ato desconhecido não aparecem por nome (busca e diretório de pessoas)', () => {
    const { s, obscure } = world('r31-kn-2');
    expect(seen(s, obscure.id, 'members')).toBe(false);
    expect(src('src/ui/sys/knownacts27.ts')).toMatch(/seen\(s, a\.id, 'members'\) && a\.members\.some/);
    expect(src('src/ui/sys/directory.ts')).toMatch(/seen\(s, a\.id, 'members'\)/);
  });
  it('#3 idade e formação seguem a mesma regra no cabeçalho e no Perfil (bio)', () => {
    const p = src('src/ui/pages.ts');
    expect(p).toMatch(/stat\('calendar', !seen\(s, p\.id, 'bio'\) \? '\?'/);
    expect(p).toMatch(/stat\('globe', seen\(s, p\.id, 'bio'\)/);
  });
  it('#4 a fama mostrada é a do seu país (a mesma no texto e na estimativa)', () => {
    const { s, famous } = world('r31-kn-4');
    const e = estimate(s, famous.id, 'fame');
    if (e && e.lo === e.hi) expect(e.lo).toBe(Math.round(fameHere31(s, famous.id)));
    expect(fameText(s, famous.id)).toBe(e ? (e.lo === e.hi ? String(e.lo) : `${e.lo}–${e.hi}`) : '?');
  });
  it('#5 listas ordenam pelo valor MOSTRADO (fama oculta = −1), nunca pela fama/momento reais', () => {
    const { s, obscure } = world('r31-kn-5');
    expect(shownFame31(s, obscure.id)).toBe(-1);
    const d = src('src/ui/sys/directory.ts');
    expect(d).not.toMatch(/: b\.fame - a\.fame\)/);
    expect(d).not.toMatch(/\(b\.momentum \?\? 0\) - \(a\.momentum \?\? 0\)/);
    expect(src('src/ui/sys/mapinfo17.ts')).not.toMatch(/\.sort\(\(a, b\) => b\.fame - a\.fame\)\.slice\(0, 8\)/);
  });
  it('#6 hype exato só quando é público', () => {
    const { s, obscure } = world('r31-kn-6');
    expect(seen(s, obscure.id, 'hype')).toBe(false);
    expect(src('src/ui/sys/dossier13.ts')).toMatch(/seen\(s, a\.id, 'hype'\) \? Math\.round\(actHype/);
  });
  it('#7 faixas nunca centradas no valor real (talento e potencial com olheiro)', () => {
    const { s, obscure } = world('r31-kn-7');
    scout(s, obscure.id, 3);
    const e = estimate(s, obscure.id, 'potential')!;
    expect((e.lo + e.hi) / 2).not.toBe(obscure.potential);
  });
  it('#8 amizade conta igual na ficha e no diretório/comparador (estimate usa intimidade)', () => {
    const { s, obscure } = world('r31-kn-8');
    expect(estimate(s, obscure.id, 'talent')).toBeNull();
    meet31(s, meNode31(s), obscure.members[0], 'visit', { i: 50 });
    expect(estimate(s, obscure.id, 'talent')).not.toBeNull();
    expect(knownLevel(s, obscure.id).priv).toBe(know(s, obscure.id).priv);
  });
  it('#9 teto da equipe sem faixa centrada (pa ± 15 saiu)', () => {
    expect(src('src/ui/ab18stars.ts')).not.toMatch(/v\.pa - 15/);
  });
  it('#10 potencial de terceiros só a partir do grau 3', () => {
    const { s, obscure } = world('r31-kn-10');
    scout(s, obscure.id, 2);
    expect(see(s, obscure.id, 'potential')).toBe('hidden');
    expect(estimate(s, obscure.id, 'potential')).toBeNull();
  });
  it('#11 valor de mercado só com conhecimento profissional (grau 3), em faixa', () => {
    const { s, obscure } = world('r31-kn-11');
    scout(s, obscure.id, 2);
    expect(seen(s, obscure.members[0], 'value')).toBe(false);
    scout(s, obscure.id, 3);
    expect(seen(s, obscure.members[0], 'value')).toBe(true);
    expect(src('src/ui/pages.ts')).toMatch(/function valueShown/);
  });
  it('#12 traços na negociação pela tabela única (grau 4 ou convivência)', () => {
    const { s, obscure } = world('r31-kn-12');
    scout(s, obscure.id, 2);
    expect(see(s, obscure.id, 'traits')).toBe('hidden');
    expect(src('src/sim/sys/nego27.ts')).toMatch(/see\(s, n\.actId, 'traits'\) === 'exact'/);
  });
  it('#13 política e religião: uma regra só (beliefs) no Perfil, nos integrantes, na ficha e na aba Crenças', () => {
    expect(src('src/ui/pages.ts').match(/seen\(s, p\.id, 'beliefs'\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src('src/ui/sys/persona13.ts')).toMatch(/seen\(s, pid, 'beliefs'\)/);
    expect(src('src/ui/sys/people16.ts')).toMatch(/seen\(s, p\.id, 'beliefs'\)/);
  });
  it('#14 estresse de qualquer pessoa não aparece; com convivência próxima, sim', () => {
    const { s, obscure } = world('r31-kn-14');
    const pid = obscure.members[0];
    expect(see(s, pid, 'stress')).toBe('hidden');
    meet31(s, meNode31(s), pid, 'visit', { i: 80 });
    expect(see(s, pid, 'stress')).toBe('exact');
  });
  it('#15 vício que virou manchete aparece (em rótulo)', () => {
    const { s, obscure } = world('r31-kn-15');
    const pid = obscure.members[0];
    expect(see(s, pid, 'health')).toBe('hidden');
    emitFact(s, { kind: 'addiction', actors: [pid], severity: 50, visibility: 'public', text: l('vício nas manchetes', 'addiction in the headlines') });
    expect(see(s, pid, 'health')).toBe('label');
  });
  it('#16 "royalty que considera justo" não aparece só por fama', () => {
    const { s, famous } = world('r31-kn-16');
    expect(know(s, famous.id).deg).toBe(0);
    expect(seen(s, famous.id, 'wantRoyalty')).toBe(false);
  });
  it('#17 o porquê da chance de aceitar não mostra placar nem parcelas exatas', () => {
    const { s, obscure } = world('r31-kn-17');
    const w = explain18(s, 'offer.chance', { act: obscure.id })!;
    expect(w).toBeTruthy();
    expect(typeof w.note === 'string' ? w.note : w.note?.pt ?? '').not.toMatch(/\d/);
    for (const p of w.parts) expect(typeof p.value === 'number').toBe(false);
  });
  it('#18 a leitura da mesa usa a intimidade com a banda (não só o olheiro)', () => {
    const { s, obscure } = world('r31-kn-18');
    const a0 = insight27(s, obscure);
    for (const m of obscure.members) meet31(s, meNode31(s), m, 'visit', { i: 80 });
    expect(insight27(s, obscure)).toBeGreaterThan(a0);
    expect(patienceKnown27(s, obscure.id)).toBe(true);
  });
  it('#19 relações de famoso: só rótulos (números só com convivência ou olheiro a fundo)', () => {
    const p = src('src/ui/pages.ts');
    expect(p).toMatch(/const exact = see\(s, p\.id, 'rels'\) === 'exact'/);
    expect(p).toMatch(/exact \|\| Math\.abs\(v\) >= 40/);
  });
  it('#20 família: escondida de quem é obscuro; casamento público aparece em rótulo', () => {
    const { s, obscure } = world('r31-kn-20');
    const pid = obscure.members[0];
    expect(see(s, pid, 'family')).toBe('hidden');
    emitFact(s, { kind: 'marriage', actors: [pid], severity: 30, visibility: 'public', text: l('casou', 'married') });
    expect(see(s, pid, 'family')).toBe('label');
    expect(src('src/ui/sys/family29.ts')).toMatch(/see\(s, p\.id, 'family'\) === 'hidden'\) return null/);
  });
  it('#21 obrigações entre NPCs: só com intimidade alta, e segredos/chantagens de terceiros nunca', () => {
    const f = src('src/ui/sys/found17.ts');
    expect(f).toMatch(/see\(s, id, 'holds'\) === 'exact'/);
    expect(f).toMatch(/x\.kind !== 'secret' && x\.kind !== 'blackmail'/);
  });
  it('#22 submundo de terceiros só pelo que é público (prisão, crime, processo)', () => {
    const { s, obscure } = world('r31-kn-22');
    const pid = obscure.members[0];
    expect(see(s, pid, 'crime')).toBe('hidden');
    emitFact(s, { kind: 'arrest', actors: [pid], severity: 60, visibility: 'public', text: l('preso', 'arrested') });
    expect(see(s, pid, 'crime')).toBe('label');
  });
  it('#23 boato de crime não mostra posto, função nem número de crimes', () => {
    expect(src('src/ui/sys/crimemem23.ts')).toMatch(/m\.k === 2 \? `\$\{o \? t\(o\.name\) : m\.o\} · \$\{t\(RANK23/);
  });
  it('#24 quem nunca te viu "não te conhece" (sem número), e inimizade não é intimidade', () => {
    const { s, obscure } = world('r31-kn-24');
    const pid = obscure.members[0];
    expect(knowsMe31(s, `p:${pid}`)).toBe('none');
    // inimigo mortal sem convivência: nenhuma intimidade (antes |opinião| contava)
    setOpinion(s, `p:${pid}`, -90, l('teste', 'test'));
    expect(knowsMe31(s, `p:${pid}`)).toBe('name');
    expect(know(s, pid).rel).toBe(0);
  });
  it('#25 finanças de rival: limiar único de informação interna (bolsa e compra direta) e sem participação nada interno', () => {
    const { s } = world('r31-kn-25');
    const lb = Object.values(s.labels).find((x) => x.active)!;
    expect(INSIGHT_AT).toBe(INSIDE31);
    expect(insider31(s, lb.id)).toBe(false);
    expect(insight(s, `lb:${lb.id}`)).toBeNull();
    expect(src('src/ui/sys/round8.ts')).toMatch(/insider31\(s, labelId\) \?/);
  });
  it('rivais e bolsa decidem pelo que sabem: palpite do rival ≠ potencial real; mercado só vê o público; desligado volta ao real', () => {
    const { s, others } = world('r31-kn-r');
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const far = others.filter((a) => a.city !== lb.city && a.owner !== lb.id).slice(0, 30);
    expect(far.some((a) => guessPot31(s, a.id, lb.id) !== a.potential)).toBe(true);
    for (const a of far.slice(0, 10)) expect(know(s, a.id, 'market').priv).toBe(0);
    setSw(s, 'know31.rivals', false);
    for (const a of far.slice(0, 5)) expect(guessPot31(s, a.id, lb.id)).toBe(a.potential);
    expect(src('src/sim/sys/rivals8.ts')).not.toMatch(/y\.potential - x\.potential/);
  });
});
