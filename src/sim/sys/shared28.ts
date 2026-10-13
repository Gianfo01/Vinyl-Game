// Rodada 28 (Fase 8) — SOCIEDADE DE BANDA COM NPC LIGADA AO RESTO DO JOGO. As sociedades do shared18 (selo, festival,
// estúdio ou imprint com um sócio NPC) só eram lidas pelo artist18 e pelo afterlife19 (Top 30 nº 11). Agora:
//  • Festival: no mês do festival da sociedade (julho), a SUA banda (ou o seu principal artista, sem banda) toca no
//    palco do sócio — cachê no livro-razão (na proporção da sua participação), fãs casuais, humor do sócio, fato `show`.
//    Festival em ano ruim (caixa da sociedade negativo) cancela o show e o sócio reclama.
//  • Campus: cada sociedade ativa aparece como prédio (no campus se for na cidade-sede; senão na faixa de fora), com
//    sócio, participação e resultado do ano.
//  • Venda: participações em selo/imprint entram na avaliação da empresa (valor × sua fatia × 0,9, desconto de
//    controle compartilhado). Vendida a empresa, essas sociedades vão junto para o comprador e o sócio é avisado.
//    Festival e estúdio são pessoais: ficam com você.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { band18 } from './artist18';
import { CAMPUS_EXTRA28 } from './campus18';
import { SALE_DONE28, VAL_EXTRA28 } from './sale17';
import { STYLE18, VKIND18, sh18, value18v, type Ven18 } from './shared18';

export const FEST_MONTH28 = 6; // julho (meses 0..11)
export const OFF_SH28: { on?: boolean } = {};
const on = (s: GameState): Ven18[] => sh18(s).v.filter((v) => v.st === 'on');
const say = (s: GameState, t: L) => { const st = sh18(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const $ = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

/** Quem toca no festival da sociedade: a sua banda, ou o seu artista mais famoso. */
export function festAct28(s: GameState): Act | undefined {
  const b = band18(s);
  if (b) return b;
  return playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'split' && a.status !== 'retired').sort((a, b2) => b2.fame - a.fame || (a.id < b2.id ? -1 : 1))[0];
}
/** Cachê do show no festival da sociedade (pela fama do ato e reputação do festival, na sua fatia). */
export const festFee28 = (s: GameState, v: Ven18, a: Act): number => Math.round(money(s, 400 + a.fame * 70 + v.rep * 40) * clamp(v.eq + 0.25, 0.4, 1));

export function festMonth28(s: GameState): number {
  if (OFF_SH28.on || s.month !== FEST_MONTH28) return 0;
  let n = 0;
  for (const v of on(s).filter((x) => x.kind === 'festival')) {
    const a = festAct28(s);
    if (!a) continue;
    if (v.cash < 0) {
      v.mood = clamp(v.mood - 5, -100, 100);
      say(s, fmtL(l('{f}: ano ruim, sem dinheiro para palco — o show de {a} cai e {p} reclama.', '{f}: a bad year, no money for the stage — {a}\'s show is off and {p} complains.'), { f: v.name, a: a.name, p: v.pn }));
      continue;
    }
    const fee = festFee28(s, v, a);
    if (!post(s, `sh28:fest:${v.id}:${s.year}`, fee, 'live', `Show no festival da sociedade: ${v.name}`)) continue;
    a.fans.casual = Math.round(a.fans.casual * 1.02) + Math.round(v.rep * 20);
    a.momentum = clamp(a.momentum + 2, 0, 100);
    v.mood = clamp(v.mood + 3, -100, 100);
    v.rep = clamp(v.rep + 1, 0, 100);
    const t = fmtL(l('{a} toca no {f}, o festival que você divide com {p} ({v}).', '{a} plays {f}, the festival you share with {p} ({v}).'), { a: a.name, f: v.name, p: v.pn, v: $(fee) });
    say(s, t);
    emitFact(s, { kind: 'show', actors: [a.id, 'player'], severity: 25 + Math.round(a.fame / 5), visibility: 'public', tags: ['shared28', 'festival', 'partner'], text: t, src: 'shared28', data: { ven: v.id } });
    n++;
  }
  return n;
}
registerSimHook('month', 'sh28', (s) => { festMonth28(s); });

// ---------------------------------------------------------------- campus

const KIND_B: Record<Ven18['kind'], 'imprint' | 'fest' | 'studio' | 'office'> = { label: 'office', festival: 'fest', studio: 'studio', imprint: 'imprint' };
CAMPUS_EXTRA28.push((s) => on(s).map((v) => {
  const y = v.prof.slice(-12).reduce((t, x) => t + x, 0);
  return { id: `sh:${v.id}`, kind: KIND_B[v.kind], name: v.name, city: s.config.homeCity, lvl: clamp(1 + Math.floor(v.rep / 25), 1, 5), since: v.since, staff: v.staff, goto: { area: 'artist18' },
    kpi: [[l('Sociedade', 'Partnership'), VKIND18[v.kind].name], [l('Sócio', 'Partner'), `${v.pn} (${STYLE18[v.style].name.pt})`], [l('Sua parte', 'Your stake'), `${Math.round(v.eq * 100)}%`], [l('Resultado 12 m', '12-month result'), $(y)]] as [L, L | string][],
    now: v.kind === 'festival' && s.month === FEST_MONTH28 ? l('Festival da sociedade: palco montado!', 'Partnership festival: the stage is up!') : undefined };
}));

// ---------------------------------------------------------------- venda da empresa

/** Valor das participações do selo (selo e imprint) que vão junto numa venda. */
export function stakeValue28(s: GameState): number {
  return on(s).filter((v) => v.kind === 'label' || v.kind === 'imprint').reduce((t, v) => t + Math.round(value18v(s, v) * v.eq * 0.9), 0);
}
VAL_EXTRA28.push((s) => {
  if (OFF_SH28.on) return null;
  const v = stakeValue28(s);
  return v ? [l('Participações em sociedades (selo/imprint com sócio NPC; vão junto, com desconto de controle compartilhado)', 'Stakes in partnerships (label/imprint with an NPC partner; they go with the sale, with a shared-control discount)'), v] : null;
});
SALE_DONE28.push((s, buyer) => {
  if (OFF_SH28.on) return;
  const bn = s.labels[buyer]?.name ?? '?';
  for (const v of on(s).filter((x) => x.kind === 'label' || x.kind === 'imprint')) {
    v.st = 'sold';
    const t = fmtL(l('{f} muda de dono com a venda: a sua parte vai para {b}. {p} terá um novo sócio.', '{f} changes hands with the sale: your stake goes to {b}. {p} gets a new partner.'), { f: v.name, b: bn, p: v.pn });
    say(s, t);
    notify(s, t, 'info');
  }
});
