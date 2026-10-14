// R29 (CONECTAR TUDO, rodada 11 — docs/connect29.md §11): as ligações que faziam sentido e ainda não existiam, medidas
// pela sonda de 13 sistemas (src/sim/probe29all.ts). Mesmas regras do conn29: pequenas, aditivas, por registros que já
// existem, com teto, sem espiral, interruptor por aresta (CONN29_OFF) e o botão CONN29.k.
//
//  projetos  → público    o tipo do disco puxa a faixa etária (single → jovem; LP/ao vivo → maduro) — na estreia
//  imprensa  → público    escândalo afasta o público maduro e às vezes atrai o jovem
//  vida      → público    banda esgotada some das redes e das turnês jovens; ficam os fiéis (mais velhos)
//  sede      → público    departamento digital puxa público jovem
//  contratos → público    ato que confia no selo topa a promoção internacional: fãs no maior país de fora
//  submundo  → público    calor policial numa cena de rua puxa o jovem da periferia
//  público   → imprensa   público jovem atrai a mídia jovem (nota a cada 3 meses)
//  público   → fama       fã jovem engaja e espalha (embalo e um pouco de fama)
//  público   → reputação  público fiel e maduro dá respeito artístico ao selo
//  público   → submundo   público jovem = mais pirataria do ato
//  público   → sede       público jovem pede o digital: sem o departamento a assessoria rende menos; com ele, mais
//  fama      → sede       ato famoso atrai gente melhor (habilidade efetiva)
//  prêmios   → sede       prêmios recentes do selo: moral e currículo da equipe
//  submundo  → sede       calor alto: medo na equipe; muito alto: arrombamento na sede (custo, nota)
//  contratos → sede       JV/produção/empresariamento sem o departamento certo sobrecarregam a equipe
//  submundo  → fama       notoriedade: sobe em gênero de rua, cai nos outros
//  prêmios   → vida       prêmio recente dá confiança ao elenco (menos pressão)
//  prêmios   → submundo   prêmio recente atrai chantagem (chance maior contra o ato)
//  fama      → mundo      seus sucessos criam onda do gênero (gosto do mundo; teto acumulado)
//  mundo     → prêmios    o júri acompanha a época: gênero em alta pontua mais no Gramofone
//  vida (família) → fama/público    casal célebre: fama para os dois atos e público adulto
//  vida (estrela mirim) → contratos / imprensa / vida / dinheiro   responsável negocia duro (renova menos), a imprensa
//      acompanha, escola + fama pesam e o alvará/tutor custa ao selo. Submundo: NÃO há ligação automática (pedido do
//      autor: nem toda estrela mirim está no submundo) — o risco só vem pelos caminhos que já existem.
//  dinheiro  → fama       gasto de divulgação direto (campanha camp27): a sonda passou a enxergar (empurrão 'divulgacao')
import { familyOf, genreById, l } from '../../data/world';
import { registerContractHook } from '../contracts';
import { registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { PRESSURE29, stressOf } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, hasTech, money, playerActs, post, staffAdjusters } from '../util';
import { CONN29 } from './conn29';
import { a3Of, ODDS17 } from './crime17';
import { GRAMO_ADJ } from './ceremonies8';
import { demo29, FMT_AGE29, older29, regionMix29, seed29, youth29, type D29Act } from './demo29';
import { countryOfCity } from '../../data/geo';

const K = () => CONN29.k;
const on = (id: string) => !CONN29.off.has(id);
const mine = (a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const fans = (a: Act) => Math.max(0, a.fans.casual) + Math.max(0, a.fans.active) + Math.max(0, a.fans.core);
const alive = (s: GameState, a: Act) => a.members.filter((id) => s.persons[id]?.alive);
const avgStress = (s: GameState, a: Act) => { const m = alive(s, a); return m.reduce((t, id) => t + stressOf(s, id).short, 0) / Math.max(1, m.length); };
// leituras sem criar estado (estes ajustes rodam dentro de funções só de leitura: equipe, chance de crime, júri)
type X4p = { hq6?: { depts?: Record<string, number> }; demo29?: { a?: Record<string, D29Act> }; crime17?: { heat?: Record<string, number> }; family29?: { min?: Record<string, unknown> } };
const x4p = (s: GameState): X4p => ((s as unknown as { x4?: X4p }).x4 ?? {});
const dept = (s: GameState, id: string) => x4p(s).hq6?.depts?.[id] ?? 0;
const isMinor = (s: GameState, pid: string) => !!x4p(s).family29?.min?.[pid] && ageOf(s, s.persons[pid]) < 18;
const heatOf = (s: GameState, city: string) => { const k = a3Of(s, city); return k ? x4p(s).crime17?.heat?.[k] ?? 0 : 0; };
const ageOf = (s: GameState, p?: Person) => (p ? s.year - p.born : 99);
const actOf = (s: GameState, pid: string) => playerActs(s).map((id) => s.acts[id]).find((a) => a?.members.includes(pid));
const STREET = new Set(['hiphop', 'caribbean', 'latin', 'brazil']);
const street = (a: Act) => STREET.has(genreById[a.genre]?.family ?? familyOf(a.genre)) || /punk|grime|drill|funk|trap/.test(a.genre);

interface R29 { gw: Record<string, number>; nt: Record<string, number>; bi: number; cp: string[] }
declare module '../ext4' { interface Ext4 { conn29r: R29 } }
const st = (s: GameState): R29 => {
  const x = (s as unknown as { x4: { conn29r?: R29 } }).x4;
  const r = (x.conn29r ??= { gw: {}, nt: {}, bi: -99, cp: [] });
  r.gw ??= {}; r.nt ??= {}; r.cp ??= [];
  return r;
};
/** nota no máximo uma vez a cada 12 semanas por chave */
const every12 = (s: GameState, key: string): boolean => { const n = st(s).nt; if (s.week - (n[key] ?? -99) < 12) return false; n[key] = s.week; return true; };

/** Inclina a mistura de idades do ato na direção de um perfil (w por faixa), fração f (0..1). Só atos guardados. */
function tilt(s: GameState, a: Act, w: number[], f: number): void {
  if (f <= 0) return;
  // mistura ainda não guardada (antes do 1º fechamento de mês): nasce como o demo29 faria (semente da carreira)
  const d: D29Act = demo29(s).a[a.id] ??= { b: perm(seed29(s, a)), n: Math.round(fans(a)) };
  const b = d.b.map((x) => x / 1000), t = b.map((x, i) => x * w[i]), sum = t.reduce((p, q) => p + q, 0) || 1;
  const nb = b.map((x, i) => x * (1 - f) + (t[i] / sum) * f);
  d.b = perm(nb);
}
/** frações → milésimos que somam 1000 (restos maiores) */
function perm(v: number[]): number[] {
  const t = v.reduce((p, q) => p + Math.max(0, q), 0) || 1, f = v.map((x) => (Math.max(0, x) / t) * 1000), out = f.map(Math.floor);
  const ord = f.map((x, j) => [x - out[j], j] as [number, number]).sort((p, q) => q[0] - p[0] || p[1] - q[1]);
  for (let i = 0, rest = 1000 - out.reduce((p, q) => p + q, 0); rest > 0; i = (i + 1) % ord.length, rest--) out[ord[i][1]]++;
  return out;
}
const YOUNG = [1.25, 1.2, 1.0, 0.8, 0.7], OLDER = [0.8, 0.85, 1.0, 1.15, 1.15], ADULT = [0.85, 1.0, 1.15, 1.15, 1.0];
const mixOf = (s: GameState, a: Act) => { const d = x4p(s).demo29?.a?.[a.id]; return d ? d.b.map((x) => x / 1000) : undefined; };

// ---------------------------------------------------------------- → público
registerSimHook('launch', 'conn29r', (s, _r, arg) => {
  const rel = arg.release, a = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !mine(a) || rel.reissueOf || !on('disco_publico')) return;
  const w = FMT_AGE29[rel.type];
  if (w) tilt(s, a, w, 0.2 * K()); // projetos → público
});
onFact('scandal', (s, f) => { // imprensa → público
  if (!on('escandalo_publico')) return;
  const a = f.actors.map((x) => s.acts[x]).find(mine) ?? (f.actors[0] ? actOf(s, f.actors[0]) : undefined);
  if (a && f.visibility !== 'secret') tilt(s, a, YOUNG, Math.min(0.25, f.severity / 300) * K());
}, 'conn29r:scandal');
onFact('marriage', (s, f) => { // vida (casal célebre) → fama / público
  if (!on('casal') || !f.tags.includes('couple')) return;
  const acts = [...new Set(f.actors.map((x) => s.acts[x]).filter((x): x is Act => !!x))];
  if (acts.length < 2) return;
  const top = Math.max(...acts.map((a) => a.fame));
  for (const a of acts) if (mine(a)) { a.fame = Math.min(100, a.fame + Math.min(3, top / 25) * (1 - a.fame / 100) * K()); tilt(s, a, ADULT, 0.1 * K()); }
}, 'conn29r:couple');

// ---------------------------------------------------------------- mensal
registerSimHook('month', 'conn29r', (s: GameState) => {
  const r = s.player.reputation, x = st(s);
  let olderW = 0, fansW = 0;
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a) continue;
    const heat = heatOf(s, a.city), sv = avgStress(s, a);
    if (on('vida_publico') && sv >= 26) tilt(s, a, OLDER, 0.08 * K()); // vida → público
    const dig = dept(s, 'digital');
    if (on('sede_publico') && dig > 0) tilt(s, a, YOUNG, Math.min(0.12, 0.05 * dig) * K()); // sede → público
    if (on('submundo_publico') && heat >= 30 && street(a)) tilt(s, a, YOUNG, Math.min(0.1, heat / 600) * K()); // submundo → público
    if (on('contratos_publico') && a.trust >= 75) { // contratos → público: promoção internacional
      const home = countryOfCity(a.city);
      const fx = regionMix29(s, a).top.filter((y) => y.a3 !== home).sort((p, q) => q.v - p.v || (p.a3 < q.a3 ? -1 : 1))[0]?.a3;
      const d = demo29(s).a[a.id];
      if (fx && d?.c) { // o demo29 já fechou os países deste mês: +1% do público vai para o país da promoção
        const e = d.c.find((y) => y[0] === fx), add = Math.round(10 * K());
        if (e) e[1] = Math.min(1000, e[1] + add); else d.c.push([fx, add]);
      } else if (fx) { const pc = (demo29(s).pc[a.id] ??= {}); pc[fx] = (pc[fx] ?? 0) + Math.round(fans(a) * 0.01 * K()); }
    }
    const mix = mixOf(s, a);
    if (mix) {
      const yo = youth29(mix), ol = older29(mix);
      if (on('publico_fama')) { // público → fama. Centro em 60% até 24 anos (o típico de um ato do jogador: neutro no
        // equilíbrio; centrar em 50% dava embalo de graça a todo ato e quadruplicava o caixa do golden)
        // equilíbrio (6 sementes): ±1,5 de embalo + fama direta empurrava partidas no limite para a quebra; fica só o embalo, ±0,5
        a.momentum = clamp(a.momentum + clamp((yo - 0.6) * 4, -0.5, 0.5) * K(), 0, 100);
      }
      if (on('publico_imprensa') && yo >= 0.55 && a.fame >= 15 && every12(s, `young:${a.id}`)) // público → imprensa
        emitFact(s, { kind: 'statement', actors: [a.id], severity: Math.round(clamp(10 + a.fame / 3, 10, 40)), visibility: 'public', tags: ['good', 'media', 'youth', 'conn29'], src: 'conn29',
          text: fmtL(l('Revistas e programas jovens disputam {a}: o público dele(a) tem menos de 25 anos', 'Youth magazines and shows fight over {a}: their audience is under 25'), { a: a.name }) });
      olderW += ol * fans(a); fansW += fans(a);
    }
    // submundo → fama: notoriedade
    if (on('submundo_fama') && heat >= 30) a.fame = clamp(a.fame + (street(a) ? heat / 150 : -heat / 200) * (1 - a.fame / 100) * K(), 0, 100);
    // fama → mundo: onda do gênero (teto acumulado de +0,12 por gênero; a contribuição antiga decai)
    if (on('fama_mundo') && a.fame >= 45) {
      const g = a.genre, inc = Math.min(0.12 - (x.gw[g] ?? 0), ((a.fame - 45) / 1000) * K());
      if (inc > 0 && s.genrePop[g] !== undefined) { s.genrePop[g] += inc; x.gw[g] = (x.gw[g] ?? 0) + inc; }
    }
    // estrela mirim (família) → imprensa / dinheiro
    const kids = alive(s, a).filter((pid) => isMinor(s, pid));
    if (kids.length) {
      if (on('mirim_imprensa') && every12(s, `minor:${a.id}`))
        emitFact(s, { kind: 'statement', actors: [a.id, ...kids], severity: Math.round(clamp(15 + a.fame / 4, 15, 45)), visibility: 'public', tags: ['family29', 'child_star', 'conn29'], src: 'conn29',
          text: fmtL(l('A imprensa acompanha cada passo de {p}, estrela mirim de {a}', 'The press follows every step of {p}, the child star of {a}'), { p: s.persons[kids[0]]?.name ?? '?', a: a.name }) });
      if (on('mirim_dinheiro')) post(s, `conn29mirim:${a.id}:${s.year}:${s.month}`, -Math.round(money(s, 400 * kids.length) * K()), 'legal', 'Alvará e tutor de menor');
    }
  }
  for (const g of Object.keys(x.gw)) { x.gw[g] *= 0.92; if (x.gw[g] < 1e-4) delete x.gw[g]; }
  // público → reputação: público maduro e fiel dá respeito
  if (on('publico_rep') && fansW > 0) { const ol = olderW / fansW; if (ol >= 0.45) r.artistic = Math.min(100, r.artistic + Math.min(1.5, (ol - 0.45) * 6) * K()); }
  // submundo → sede: arrombamento (calor muito alto em casa; no máximo uma vez a cada 26 semanas)
  const hh = heatOf(s, s.config.homeCity);
  if (on('submundo_sede') && hh >= 60 && s.week - x.bi >= 26) {
    x.bi = s.week;
    post(s, `conn29bi:${s.week}`, -Math.round(money(s, 5000 + hh * 60) * K()), 'other', 'Arrombamento na sede (conserto e segurança)');
    emitFact(s, { kind: 'statement', actors: ['player'], severity: 30, visibility: 'public', tags: ['bad', 'crime', 'conn29'], src: 'conn29', place: s.config.homeCity,
      text: l('Sede do selo arrombada de madrugada: a polícia fala em recado do submundo', 'The label\'s offices broken into overnight: police talk of a message from the underworld') });
  }
});

// ---------------------------------------------------------------- → sede (habilidade efetiva da equipe)
const AWD_W = 104;
const recentAwards = (s: GameState, pred: (x: { year: number; byPlayer?: boolean; actId?: string }) => boolean) => (s.awards ?? []).filter((x) => s.year - x.year <= AWD_W / 52 && pred(x)).length;
staffAdjusters().push((s, sf) => {
  let v = 0;
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a);
  if (on('fama_sede') && acts.length) v += clamp((Math.max(...acts.map((a) => a.fame)) - 40) / 15, 0, 2); // fama → sede (só bônus: selo novo com ato pequeno não é punido)
  if (on('premios_sede')) v += Math.min(2, recentAwards(s, (x) => !!x.byPlayer) * 0.5); // prêmios → sede
  const hh = heatOf(s, s.config.homeCity);
  if (on('submundo_sede') && hh >= 30) v -= Math.min(2, (hh - 30) / 20); // submundo → sede: medo
  if (on('publico_sede') && (sf.role === 'publicist' || sf.role === 'booking')) { // público → sede
    let yw = 0, fw = 0;
    for (const a of acts) { const m = mixOf(s, a); if (m) { yw += youth29(m) * fans(a); fw += fans(a); } }
    // sem internet não há departamento digital: nada a cobrar (antes da internet o público jovem só soma onde há o depto)
    if (fw > 0 && yw / fw > 0.55) v += dept(s, 'digital') > 0 ? 1.5 : hasTech(s, 'internet') ? -1.5 : 0;
  }
  if (on('contratos_sede')) { // contratos → sede: serviço sem o departamento certo
    const need: Record<string, string> = { jv: 'finance', production: 'studio', management: 'booking' };
    let n = 0, ok = 0;
    for (const c of Object.values(s.contracts)) if (c.party === 'player' && c.endWeek > s.week && s.acts[c.actId]?.contractId === c.id && need[c.model]) { if (dept(s, need[c.model]) > 0) ok++; else n++; }
    v += Math.min(1, ok * 0.5) - Math.min(3, n);
  }
  return v * K();
});

// ---------------------------------------------------------------- → vida / contratos (prêmios, estrela mirim)
PRESSURE29.push((s, p) => {
  const a = actOf(s, p.id);
  if (!a) return null;
  let v = 0;
  if (on('premios_vida') && recentAwards(s, (x) => x.actId === a.id && s.year - x.year <= 1) > 0) v -= 2.5; // prêmios → vida
  if (on('mirim_vida') && isMinor(s, p.id)) v += 3; // estrela mirim → vida: escola + fama
  return v ? { v: v * K(), why: v < 0 ? l('prêmio recente: elenco confiante', 'recent award: confident cast') : l('estrela mirim: escola e fama ao mesmo tempo', 'child star: school and fame at once') } : null;
});
registerContractHook('conn29r', { renew: (s, act) => { // estrela mirim → contratos: o responsável negocia duro
  if (!on('mirim_contratos')) return 0;
  return act.members.some((pid) => isMinor(s, pid)) ? -0.05 * K() : 0;
} });

// ---------------------------------------------------------------- → submundo (chance de crime) e → prêmios (Gramofone)
ODDS17.push((s, c, cid, x) => {
  const a = s.acts[c.target];
  if (!a) return;
  if (cid === 'bootleg' && on('publico_crime')) { // público → submundo: público jovem compra pirata
    const m = mixOf(s, a);
    if (m) { const d = clamp((youth29(m) - 0.5) * 0.4, -0.08, 0.12) * K(); if (Math.abs(d) > 0.005) { x.p = clamp(x.p * (1 + d), 0, 1); x.why.push(fmtL(l('Público jovem compra pirata ({x})', 'Young audience buys bootlegs ({x})'), { x: `${d > 0 ? '+' : ''}${Math.round(d * 100)}%` })); } }
  }
  if (cid === 'blackmail' && on('premios_crime') && recentAwards(s, (y) => y.actId === a.id && s.year - y.year <= 1) > 0) { // prêmios → submundo
    const d = 0.1 * K();
    x.p = clamp(x.p * (1 + d), 0, 1);
    x.why.push(fmtL(l('Prêmio recente: há o que perder ({x})', 'Recent award: there is something to lose ({x})'), { x: `+${Math.round(d * 100)}%` }));
  }
});
GRAMO_ADJ.push((s, relId) => { // mundo → prêmios: o júri acompanha a época
  if (!on('mundo_premios')) return 0;
  const rel = s.releases[relId], a = rel ? s.acts[rel.actId] : undefined;
  if (!a) return 0;
  return clamp(((s.genrePop[a.genre] ?? 0.8) - 0.8) * 4, -3, 3) * K();
});
