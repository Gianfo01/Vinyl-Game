// Rodada 19 (T3) — Lendas › "Espólio": herdeiros com opinião, testamenteiro, masters (11.8), processos e propostas do espólio,
// e a arena digital (residências de avatares de vivos ou mortos). Projetos póstumos continuam em "Legado póstumo" (post18).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { ARENA_FROM19, af19, answerSuit19, arenaBlock19, arenaCost19, arenaRun19, buildArena19, estates19, holder19, licCost19, licMasters19, occ19, opAvg19, resCost19, residency19, sellArena19, type Est19 } from '../../sim/sys/afterlife19';
import { STANCE18, mediate18, mediateCost18, post18 } from '../../sim/sys/post18';
import { isEstate } from '../../sim/sys/image17';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { LENDAS_X19 } from './lendas9';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const card = (...k: (Node | string | null)[]) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fmtS = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const HOW: Record<string, L> = { reverted: l('masters com o espólio', 'masters with the estate'), shared: l('masters compartilhados (50%)', 'shared masters (50%)'), kept: l('masters com o selo', 'masters with the label') };

function estCard(s: GameState, x: Est19): HTMLElement {
  const a = s.acts[x.act], p = s.persons[x.pid], e = post18(s).est[x.pid];
  if (!a || !p || !e) return h('div');
  const hd = holder19(s, a);
  return card(
    row(h('b', null, `${p.name} †${p.died ?? ''}`), actLink(s, a.id), x.how ? pill(T(HOW[x.how]), x.how === 'reverted' ? 'warn' : 'good') : null, e.dispute > s.week ? pill(t(l('herdeiros na justiça', 'heirs in court')), 'bad') : null, x.suit ? pill(t(l('processo aberto', 'open lawsuit')), 'bad') : null),
    row(why18(s, 'af19.estate', { pid: x.pid }, fmtS(l('Opinião dos herdeiros sobre você: {o}/100', 'Heirs\' opinion of you: {o}/100'), { o: Math.round(opAvg19(x)) })), ' · ', fmtS(l('Testamenteiro: {n}', 'Executor: {n}'), { n: x.exN }), ' · ', fmtS(l('união {u} · legado {g}', 'unity {u} · legacy {g}'), { u: Math.round(e.unity), g: Math.round(e.legacy) })),
    h('div', { class: 'small' }, ...e.heirs.map((hr, i) => h('span', { style: 'margin-right:10px' }, `${hr.name} (${T(hr.rel)}, ${T(STANCE18[hr.st])}) ${Math.round(x.op[i] ?? 50)}`))),
    x.suit ? muted(fmtS(l('Processo ({k}): pedem {v}; sentença por volta da semana {w}; chance de vencer {o}%.', 'Lawsuit ({k}): they ask {v}; ruling around week {w}; odds to win {o}%.'), { k: x.suit.k, v: $(x.suit.amt), w: x.suit.w, o: Math.round(x.suit.odds * 100) })) : null,
    row(
      x.suit?.k === 'masters' && !x.suit.fight ? btn(l('Devolver os masters', 'Return the masters'), () => say(answerSuit19(s, x.pid, 'give'))) : null,
      x.suit?.k === 'masters' && !x.suit.fight ? btn(l('Brigar na justiça', 'Fight in court'), () => say(answerSuit19(s, x.pid, 'fight'))) : null,
      x.suit?.k === 'masters' && !x.suit.fight ? btn(fmtS(l('Acordo ({v})', 'Settle ({v})'), { v: $(x.suit.amt) }), () => say(answerSuit19(s, x.pid, 'settle'))) : null,
      e.dispute > s.week ? btn(fmtS(l('Mediar herdeiros ({c})', 'Mediate heirs ({c})'), { c: $(mediateCost18(s)) }), () => say(mediate18(s, x.pid))) : null,
      hd !== 'player' && hd !== 'estate' && hd !== 'indie' && (af19(s).lic[a.id] ?? 0) < s.year ? btn(fmtS(l('Licenciar catálogo de {h} ({c})', 'License catalog from {h} ({c})'), { h: s.labels[hd]?.name ?? hd, c: $(licCost19(s, a)) }), () => say(licMasters19(s, a.id))) : null));
}
function arenaBlock(s: GameState): HTMLElement {
  const ar = af19(s).ar;
  if (s.year < ARENA_FROM19) return muted(fmtS(l('Arenas de avatares digitais chegam em {y} (ABBA Voyage, 2022).', 'Digital avatar arenas arrive in {y} (ABBA Voyage, 2022).'), { y: ARENA_FROM19 }));
  if (!ar || ar.st === 'sold') {
    const b = arenaBlock19(s);
    return h('div', null, muted(fmtS(l('Obra de {m} meses, {c} (30% na entrada, o resto mês a mês, como investimento). Depois: {r}/mês de operação; cada residência custa {p} em captura de movimento e avatares.', '{m}-month build, {c} (30% up front, the rest monthly as capex). Then {r}/month to run; each residency costs {p} in motion capture and avatars.'), { m: 18, c: $(arenaCost19(s)), r: $(arenaRun19(s)), p: $(resCost19(s)) })),
      row(btn(l('Construir arena digital', 'Build a digital arena'), () => say(buildArena19(s)), !!b), b ? muted(b) : null));
  }
  if (ar.st === 'build') return muted(fmtS(l('Em obra: faltam {m} meses (qualidade prevista {q}%).', 'Under construction: {m} months left (expected quality {q}%).'), { m: ar.left, q: Math.round(ar.q * 100) }));
  const cands = [...new Set([...playerActs(s), ...Object.values(s.acts).filter((a) => isEstate(s, a) && a.fame >= 40).map((a) => a.id)])].map((id) => s.acts[id]).filter((a) => a && a.members.length).slice(0, 12);
  return h('div', null,
    row(pill(fmtS(l('qualidade {q}%', 'quality {q}%'), { q: Math.round(ar.q * 100) })), pill(fmtS(l('{n} residências', '{n} residencies'), { n: ar.n })), pill(fmtS(l('lucro {v}', 'profit {v}'), { v: $(ar.earned) }), 'good'), btn(l('Vender a arena', 'Sell the arena'), () => say(sellArena19(s)))),
    ar.res ? card(row(h('b', null, t(l('Em cartaz:', 'Now showing:'))), actLink(s, ar.res.act), why18(s, 'af19.arena', { act: ar.res.act }, fmtS(l('ocupação {o}%', 'occupancy {o}%'), { o: Math.round(occ19(s, ar.res.act, ar.res.pid).v * 100) })), fmtS(l('bruto {g} · até a semana {w}', 'gross {g} · until week {w}'), { g: $(ar.res.gross), w: ar.res.until })))
      : section(t(l('Escolher a próxima residência', 'Choose the next residency')), h('div', null, ...cands.map((a) => row(actLink(s, a.id), isEstate(s, a) ? pill(t(l('espólio', 'estate')), 'warn') : pill(t(l('vivo — consentimento', 'living — consent'))),
        why18(s, 'af19.arena', { act: a.id }, fmtS(l('ocupação prevista {o}%', 'expected occupancy {o}%'), { o: Math.round(occ19(s, a.id).v * 100) })),
        btn(fmtS(l('Residência 24 meses ({c})', '24-month residency ({c})'), { c: $(resCost19(s)) }), () => say(residency19(s, a.id, 24))))))));
}
function estateTab(s: GameState): HTMLElement {
  const xs = estates19(s);
  const st = af19(s);
  return h('div', null,
    muted(l('Quando um artista morre, o contrato acaba e os masters seguem a ficha de direitos: do artista → voltam aos herdeiros; compartilhado → o espólio fica com 50% do lucro; do selo → ficam, com royalties ao espólio. Os herdeiros têm opinião sobre você, um testamenteiro decide por eles, brigam entre si, processam e também propõem projetos. Sociedades com quem morreu passam ao herdeiro.', 'When an artist dies, the deal ends and the masters follow the rights sheet: artist-owned → back to the heirs; shared → the estate keeps 50% of the profit; label-owned → they stay, with royalties to the estate. Heirs have an opinion of you, an executor decides for them, they fight each other, sue and also pitch projects. Partnerships with the deceased pass to the heir.')),
    section(t(l('Arena digital (avatares)', 'Digital arena (avatars)')), arenaBlock(s)),
    section(t(l('Espólios', 'Estates')), xs.length ? h('div', null, ...xs.slice(0, 25).map((x) => estCard(s, x))) : muted(l('Nenhum espólio relevante ainda.', 'No relevant estates yet.'))),
    st.log.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, ...st.log.slice(0, 15).map(([y, m, tx]) => h('li', null, `${y}/${m + 1} — `, T(tx))))) : null);
}
LENDAS_X19.push({ id: 'estate19', label: l('Espólio', 'Estate'), icon: 'vault', render: estateTab });
