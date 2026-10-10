// Rodada 15 — FAMA como mecânica de verdade (estende Act.fame, não cria outro medidor).
// • Fama do ATO = Act.fame (0–100, já existente: cresce com fãs/paradas/imprensa, cai devagar).
// • Fama da PESSOA = parte da fama dos atos dela (líder/vocal leva mais) + carisma de palco + um saldo pessoal
//   (escândalos, morte, ego, carreira solo). Um integrante pode ser mais famoso que a banda; a carreira solo herda.
// • Degraus: desconhecido → local → nacional → internacional → superstar → ícone, com efeitos: atenção da imprensa,
//   paparazzi (estresse), cachês, poder de negociação, ego, escândalos amplificados, tumultos de fãs, custo de
//   segurança (escolha do jogador), queda por inatividade, potencial de retorno e fama póstuma.
// • Visibilidade: knownLevel() junta conhecimento (olheiros/relacionamento) com exposição pública (fama).
//   Famosos têm quase tudo de público à vista; dados privados (atributos, potencial, humor, contrato) exigem olheiros.

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { fameAt } from '../famehook16';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, post } from '../util';
import { addHype } from './hype12';
import { pressLine17 } from '../outlets17';

export const FTIERS: { min: number; name: L; desc: L }[] = [
  { min: 0, name: l('Desconhecido', 'Unknown'), desc: l('Só amigos e a cena mais próxima sabem quem é.', 'Only friends and the nearest scene know them.') },
  { min: 10, name: l('Local', 'Local'), desc: l('A cidade conhece; jornais locais e rádios comunitárias falam.', 'The city knows them; local papers and community radio talk.') },
  { min: 30, name: l('Nacional', 'National'), desc: l('Conhecido no país: imprensa nacional cobre, cachês sobem, a vida vira pauta.', 'Known nationwide: national press covers them, fees rise, life becomes news.') },
  { min: 52, name: l('Internacional', 'International'), desc: l('Nome fora do país: paparazzi, segurança e escândalos ampliados.', 'Known abroad: paparazzi, security and amplified scandals.') },
  { min: 72, name: l('Superstar', 'Superstar'), desc: l('Todo mundo sabe quem é: tumultos de fãs, negociação dura, nenhuma privacidade.', 'Everyone knows them: fan mobs, hard bargaining, no privacy.') },
  { min: 88, name: l('Ícone', 'Icon'), desc: l('Parte da cultura: a fama quase não cai e sobrevive à morte.', 'Part of the culture: fame barely fades and outlives death.') },
];
export const fameTier = (v: number): number => FTIERS.reduce((t, x, i) => (v >= x.min ? i : t), 0);

// ---------------------------------------------------------------- estado

export interface Fame15 {
  /** saldo pessoal de fama (−30..+40) */
  po: Record<string, number>;
  /** histórico trimestral: id → [índice do 1º trimestre (ano*4+tri), valores...] */
  h: Record<string, number[]>;
  /** pico de fama por ato */
  pk: Record<string, number>;
  /** último lançamento visto (para detectar retornos) */
  lr: Record<string, number>;
  /** escândalos já vistos por ato */
  sc: Record<string, number>;
  /** mortos já processados */
  dd: Record<string, 1>;
  /** segurança por ato do jogador: 0 nenhuma, 1 básica, 2 completa */
  sec: Record<string, number>;
  /** linha do tempo de fatos de fama (ato/pessoa) */
  log: [number, number, string, L, number][];
}
declare module '../ext4' { interface Ext4 { fame15: Fame15 } }
const empty = (): Fame15 => ({ po: {}, h: {}, pk: {}, lr: {}, sc: {}, dd: {}, sec: {}, log: [] });
registerExt4('fame15', empty);
export function f15(s: GameState): Fame15 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.fame15 ??= empty()) as Fame15;
  st.po ??= {}; st.h ??= {}; st.pk ??= {}; st.lr ??= {}; st.sc ??= {}; st.dd ??= {}; st.sec ??= {}; st.log ??= [];
  return st;
}
const flog = (s: GameState, id: string, t: L, d: number) => { const st = f15(s); st.log.push([s.year, s.month, id, t, Math.round(d * 10) / 10]); if (st.log.length > 80) st.log.shift(); };
export const fameLog = (s: GameState, ids: string[]) => f15(s).log.filter((x) => ids.includes(x[2]));

// ---------------------------------------------------------------- fama da pessoa

const IDX = new WeakMap<GameState, { k: string; m: Map<string, Act[]> }>();
/** Atos (atuais) de cada pessoa — índice barato, refeito quando a semana ou o nº de atos muda. */
function actsOfP(s: GameState, pid: string): Act[] {
  const k = `${s.week}|${Object.keys(s.acts).length}`;
  let c = IDX.get(s);
  if (!c || c.k !== k) {
    const m = new Map<string, Act[]>();
    for (const a of Object.values(s.acts)) for (const id of a.members) { const xs = m.get(id) ?? []; xs.push(a); m.set(id, xs); }
    c = { k, m }; IDX.set(s, c);
  }
  return c.m.get(pid) ?? [];
}
export const mainActOf = (s: GameState, pid: string): Act | undefined => actsOfP(s, pid).slice().sort((a, b) => b.fame - a.fame)[0];

const front = (a: Act, p: Person) => a.members.length === 1 || a.leaderId === p.id || p.role === 'vocal' || p.role === 'mc';

/** Fama da pessoa (0–100) e de onde vem. */
export function personFame(s: GameState, pid: string): { v: number; parts: { t: L; v: number }[] } {
  const p = s.persons[pid];
  if (!p) return { v: 0, parts: [] };
  const parts: { t: L; v: number }[] = [];
  let base = 0;
  let src: Act | undefined;
  for (const a of actsOfP(s, pid)) {
    const share = a.members.length === 1 ? 1 : front(a, p) ? 0.88 : 0.62;
    if (a.fame * share > base) { base = a.fame * share; src = a; }
  }
  if (src) parts.push({ t: fmtL(src.members.length === 1 ? l('Carreira em {a}', 'Career as {a}') : front(src, p) ? l('Rosto de {a} (líder/voz)', 'Face of {a} (leader/voice)') : l('Integrante de {a}', 'Member of {a}'), { a: src.name }), v: Math.round(base) });
  const stage = src && front(src, p) && base > 8 ? clamp(((p.skills as Record<string, number>).stage ?? 50) - 50, -20, 40) / 6 : 0;
  if (Math.abs(stage) >= 0.5) parts.push({ t: l('Carisma de palco', 'Stage charisma'), v: Math.round(stage) });
  const po = f15(s).po[pid] ?? 0;
  if (Math.abs(po) >= 0.5) parts.push({ t: l('Saldo pessoal (escândalos, solo, ego, morte)', 'Personal balance (scandals, solo, ego, death)'), v: Math.round(po) });
  return { v: Math.round(clamp(base + stage + po, 0, 100) * 10) / 10, parts };
}
const pf = (s: GameState, pid: string) => personFame(s, pid).v;

/** Fama de qualquer id (ato ou pessoa). */
export const fameOf = (s: GameState, id: string): number => (s.acts[id] ? s.acts[id].fame : pf(s, id));
const mineAct = (a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);

// ---------------------------------------------------------------- visibilidade

export type Field15 = 'public' | 'bio' | 'fame' | 'fans' | 'image' | 'life' | 'health' | 'attrs' | 'potential' | 'traits' | 'mood' | 'contract' | 'songs' | 'rels';
export interface Known15 { mine: boolean; deg: number; rel: number; exp: number; priv: number; pub: number; tier: number }

/** Exposição pública (0–5) pela fama: quanto mais famoso, mais da vida e da carreira está nas revistas. */
export const exposure = (fame: number): number => fameTier(fame);

/** Laço do jogador com a pessoa (opinião/relação) convertido em grau de conhecimento 0–4. */
const ME = new WeakMap<GameState, { w: number; p?: Person }>();
function relDeg(s: GameState, pid: string): number {
  let c = ME.get(s);
  if (!c || c.w !== s.week) { c = { w: s.week, p: Object.values(s.persons).find((x) => x.isPlayer && x.alive) }; ME.set(s, c); }
  const me = c.p;
  const p = s.persons[pid];
  const v = Math.max(Math.abs(me && p ? p.rel[me.id] ?? 0 : 0), Math.abs(me ? me.rel[pid] ?? 0 : 0));
  return v >= 60 ? 4 : v >= 35 ? 3 : v >= 15 ? 2 : 0;
}

/**
 * Quanto o jogador sabe de um ato ou pessoa. Combina o grau de scouting (s.knowledge), o relacionamento e a
 * exposição pública da fama. `priv` = dados privados (só olheiros/relação); `pub` = dados públicos (fama ajuda).
 * Seu elenco: tudo (5). Paradas, discos lançados, prêmios e selo são sempre públicos.
 */
export function knownLevel(s: GameState, id: string): Known15 {
  const full = (tier: number): Known15 => ({ mine: true, deg: 5, rel: 5, exp: 5, priv: 5, pub: 5, tier });
  const a = s.acts[id];
  if (a) {
    const tier = fameTier(a.fame);
    if (mineAct(a)) return full(tier);
    const deg = s.knowledge[id]?.degree ?? 0;
    const rel = a.members.reduce((m, pid) => Math.max(m, relDeg(s, pid)), 0);
    const exp = exposure(fameAt(s, a, '@me')); // r16: exposição vista do país do jogador
    return { mine: false, deg, rel, exp, priv: Math.max(deg, rel), pub: Math.max(deg, rel, exp), tier };
  }
  const p = s.persons[id];
  if (!p) return { mine: false, deg: 0, rel: 0, exp: 0, priv: 0, pub: 0, tier: 0 };
  const acts = actsOfP(s, id);
  const tier = fameTier(pf(s, id));
  if (p.isPlayer || acts.some(mineAct)) return full(tier);
  const deg = acts.reduce((m, x) => Math.max(m, s.knowledge[x.id]?.degree ?? 0), 0);
  const rel = relDeg(s, id);
  const ma = acts.slice().sort((x, y) => y.fame - x.fame)[0];
  const exp = exposure(ma && ma.fame > 0 ? pf(s, id) * Math.min(1.25, fameAt(s, ma, '@me') / ma.fame) : pf(s, id));
  return { mine: false, deg, rel, exp, priv: Math.max(deg, rel), pub: Math.max(deg, rel, exp), tier };
}

const NEED: Record<Field15, [number, 'pub' | 'priv']> = {
  public: [0, 'pub'], bio: [1, 'pub'], fame: [2, 'pub'], fans: [2, 'pub'], image: [2, 'pub'], life: [3, 'pub'], rels: [4, 'pub'],
  health: [4, 'priv'], attrs: [2, 'priv'], potential: [3, 'priv'], traits: [4, 'priv'], mood: [4, 'priv'], contract: [3, 'priv'], songs: [5, 'priv'],
};
/** Pode ver este tipo de dado? (ver tabela NEED: públicos melhoram com fama; privados só com olheiros/relação) */
export function canSee(s: GameState, id: string, f: Field15): boolean {
  const k = knownLevel(s, id);
  const [n, w] = NEED[f];
  return k.mine || k[w] >= n;
}
export const HINT15 = l('? — descubra com olheiros / relacionamento', '? — find out with scouts / relationships');
export const HINT15S = l('descubra com olheiros / relacionamento', 'find out with scouts / relationships');
/** Texto curto do que falta para ver um campo. */
export function whyHidden(f: Field15): L {
  const [n, w] = NEED[f];
  return w === 'priv'
    ? fmtL(l('Dado privado: precisa de conhecimento grau {n} (olheiros, reuniões) ou de relação próxima.', 'Private data: needs knowledge degree {n} (scouts, meetings) or a close relationship.'), { n })
    : fmtL(l('Dado público: aparece com fama (degrau {t}) ou conhecimento grau {n}.', 'Public data: shows with fame (tier {t}) or knowledge degree {n}.'), { n, t: FTIERS[Math.min(5, n)].name });
}

/** Fama mostrada: exata quando pública, faixa quando estimada, degrau quando só se ouve falar. */
export function fameText(s: GameState, id: string): string {
  const k = knownLevel(s, id);
  const v = fameOf(s, id);
  if (k.mine || k.pub >= 2) return String(Math.round(v));
  if (k.pub >= 1) { const w = k.deg >= 3 ? 6 : 12; return `${Math.max(0, Math.round(v - w))}–${Math.min(100, Math.round(v + w))}`; }
  return '?';
}

// ---------------------------------------------------------------- histórico

const qi = (s: GameState) => s.year * 4 + Math.floor(s.month / 3);
function rec(s: GameState, id: string, v: number): void {
  const st = f15(s);
  const q = qi(s);
  const hh = st.h[id];
  if (!hh) { st.h[id] = [q, Math.round(v)]; return; }
  const last = hh[0] + hh.length - 2;
  if (q <= last) { hh[hh.length - 1] = Math.round(v); return; }
  for (let i = last + 1; i < q; i++) hh.push(hh[hh.length - 1]);
  hh.push(Math.round(v));
  if (hh.length > 201) { const cut = hh.length - 201; hh.splice(1, cut); hh[0] += cut; }
}
/** Série (ano fracionário, valor) para o gráfico. */
export function fameHistory(s: GameState, id: string): { x: number; v: number }[] {
  const hh = f15(s).h[id];
  if (!hh) return [];
  return hh.slice(1).map((v, i) => ({ x: (hh[0] + i) / 4, v }));
}

// ---------------------------------------------------------------- efeitos

export const SEC15: { name: L; cost: number; desc: L }[] = [
  { name: l('Sem segurança', 'No security'), cost: 0, desc: l('Grátis, mas a partir de Internacional fãs e paparazzi chegam perto: estresse, tumultos e risco nas turnês.', 'Free, but from International fans and paparazzi get close: stress, mobs and tour risk.') },
  { name: l('Segurança básica', 'Basic security'), cost: 900, desc: l('Um segurança e motorista: corta pela metade o estresse dos paparazzi e os tumultos.', 'A bodyguard and driver: halves paparazzi stress and mobs.') },
  { name: l('Equipe completa', 'Full detail'), cost: 2600, desc: l('Equipe, rotas e hotéis fechados: quase sem tumultos, mas sai caro e afasta um pouco dos fãs.', 'A team, routes and closed hotels: almost no mobs, but costly and a bit distant from fans.') },
];
/** Custo mensal da segurança do ato (escala com o degrau; nada abaixo de Nacional). */
export const secCost = (s: GameState, a: Act, lv = f15(s).sec[a.id] ?? 0): number => (fameTier(a.fame) < 2 || !lv ? 0 : money(s, SEC15[lv].cost * (fameTier(a.fame) - 1)));
export function setSecurity(s: GameState, actId: string, lv: number): void { f15(s).sec[actId] = clamp(Math.round(lv), 0, 2); }

/** Pressão de paparazzi por mês (estresse) para integrantes do ato. */
export const papStress = (s: GameState, a: Act): number => { const t = fameTier(fameAt(s, a)); const lv = f15(s).sec[a.id] ?? 0; return t < 3 ? 0 : (t - 2) * [1.2, 0.6, 0.25][lv]; };
/** Chance mensal de tumulto de fãs. */
export const mobChance = (s: GameState, a: Act): number => { const t = fameTier(fameAt(s, a)); const lv = f15(s).sec[a.id] ?? 0; return t < 3 ? 0 : (t - 2) * [0.05, 0.022, 0.006][lv]; };
/** Multiplicador de cachê de shows pela fama. */
export const feeMult = (a: Act): number => [1, 1, 1.05, 1.12, 1.22, 1.3][fameTier(a.fame)];
/** Royalty que um ato famoso considera justo. */
export const wantRoyalty = (a: Act): number => 0.12 + a.fame / 450;
/** Potencial de retorno: quanto da fama de pico ainda pode voltar. */
export const comebackPot = (s: GameState, a: Act): number => Math.max(0, Math.round((f15(s).pk[a.id] ?? a.fame) - a.fame));
/** Multiplicador do impacto de um escândalo. */
export const scandalAmp = (a: Act): number => [0.6, 0.8, 1, 1.4, 1.8, 2.2][fameTier(a.fame)];

const live = (a: Act) => a.status !== 'retired' && a.status !== 'split';

export function fameMonth(s: GameState): void {
  const st = f15(s);
  const r = Rng.fromSeed(`${s.config.seed}:fame15:${s.year}:${s.month}`);
  const rec0 = s.month % 3 === 0;
  for (const a of Object.values(s.acts)) {
    const mine = mineAct(a);
    const t = fameTier(a.fame);
    const pk0 = st.pk[a.id] ?? a.fame;
    // morte: fama póstuma
    const dead = a.members.map((id) => s.persons[id]).filter((p) => p && !p.alive && !st.dd[p.id]) as Person[];
    for (const p of dead) {
      st.dd[p.id] = 1;
      if (s.year - (p.died ?? s.year) > 1) continue;
      const g = Math.min(12, (100 - a.fame) * 0.15) * (a.fame >= 20 ? 1 : 0.4);
      a.fame = clamp(a.fame + g, 0, 100);
      a.momentum = clamp(a.momentum + 15, 0, 100);
      st.po[p.id] = clamp((st.po[p.id] ?? 0) + 8, -30, 40);
      const tx = fmtL(l('Morte de {p}: o público redescobre {a} (+{g} de fama póstuma).', 'Death of {p}: the public rediscovers {a} (+{g} posthumous fame).'), { p: p.name, a: a.name, g: Math.round(g) });
      flog(s, a.id, tx, g); flog(s, p.id, tx, 8);
      if (a.fame >= 25) addHype(s, `a:${a.id}`, 'fame15:dead', l('Comoção pela morte', 'Grief after a death'), 12);
      if (mine) notify(s, tx, 'info');
    }
    // fama póstuma não some: o catálogo segura o nome
    if (a.deceased || (a.members.length && a.members.every((id) => s.persons[id] && !s.persons[id].alive))) a.fame = Math.max(a.fame, pk0 * (t >= 4 ? 0.85 : 0.6));
    // inatividade: sem lançar há 3+ anos a fama esfria mais rápido (ícones quase não caem)
    const idle = s.week - a.lastRelease > 156 && live(a) && !a.deceased;
    if (idle && a.fame > 5) a.fame = clamp(a.fame - a.fame * (t >= 5 ? 0.0015 : 0.005), 0, 100);
    // retorno: lançar depois de muito tempo traz de volta parte do pico
    const lr0 = st.lr[a.id];
    if (lr0 !== undefined && a.lastRelease !== lr0 && a.lastRelease - lr0 >= 156 && pk0 - a.fame >= 8) {
      const g = (pk0 - a.fame) * 0.3;
      a.fame = clamp(a.fame + g, 0, 100);
      a.momentum = clamp(a.momentum + 12, 0, 100);
      const tx = fmtL(l('Retorno de {a} depois de {y} anos: a nostalgia devolve +{g} de fama (pico {p}).', '{a} returns after {y} years: nostalgia gives back +{g} fame (peak {p}).'), { a: a.name, y: Math.round((a.lastRelease - lr0) / 52), g: Math.round(g), p: Math.round(pk0) });
      flog(s, a.id, tx, g);
      addHype(s, `a:${a.id}`, 'fame15:comeback', l('Retorno aguardado', 'Long-awaited comeback'), 10);
      if (mine || a.fame >= 40) notify(s, tx, mine ? 'good' : 'info');
    }
    st.lr[a.id] = a.lastRelease;
    // escândalo amplificado
    const sc0 = st.sc[a.id];
    if (sc0 !== undefined && a.scandals > sc0) {
      const k = scandalAmp(a);
      a.momentum = clamp(a.momentum - 4 * k, 0, 100);
      if (a.image) a.image.publicImage = clamp(a.image.publicImage - 3 * k, 0, 100);
      a.fame = clamp(a.fame + 0.4 * k, 0, 100);
      const lead = a.members.map((id) => s.persons[id]).filter(Boolean).sort((x, y) => pf(s, y.id) - pf(s, x.id))[0];
      if (lead) st.po[lead.id] = clamp((st.po[lead.id] ?? 0) + 0.8 * k, -30, 40);
      if (k > 1) {
        const tx = fmtL(l('Escândalo de {a} ampliado pela fama ({t}, ×{k}): momento −{m}, imagem pública −{i}; mas todo mundo fala do nome.', '{a}\'s scandal amplified by fame ({t}, ×{k}): momentum −{m}, public image −{i}; but everyone talks about them.'), { a: a.name, t: FTIERS[t].name, k: k.toFixed(1), m: Math.round(4 * k), i: Math.round(3 * k) });
        flog(s, a.id, tx, 0.4 * k);
        if (mine) notify(s, tx, 'bad');
      }
    }
    st.sc[a.id] = a.scandals;
    if (!live(a)) { if (rec0 && st.h[a.id]) rec(s, a.id, a.fame); continue; }
    // carreira solo herda a fama do integrante que já era famoso
    if (a.members.length === 1) {
      const p = s.persons[a.members[0]];
      const other = p ? actsOfP(s, p.id).filter((x) => x.id !== a.id).reduce((m, x) => Math.max(m, x.fame * (front(x, p) ? 0.88 : 0.62)), 0) : 0;
      const floor = other * 0.6;
      if (a.fame < floor) a.fame = clamp(a.fame + (floor - a.fame) * 0.2, 0, 100);
    }
    // imprensa: quem é famoso vira pauta
    if (t >= 2 && r.chance(0.03 * t)) {
      a.momentum = clamp(a.momentum + 2 + t, 0, 100);
      addHype(s, `a:${a.id}`, 'fame15:press', pressLine17(s, a.name, cityById[a.city]?.market, `${a.id}:${s.year}:${s.month}`), 2 + t);
      if (mine && r.chance(0.5)) { const tx = fmtL(l('{a} vira pauta na imprensa ({t}): +{m} de momento.', '{a} makes the news ({t}): +{m} momentum.'), { a: a.name, t: FTIERS[t].name, m: 2 + t }); flog(s, a.id, tx, 0); notify(s, tx, 'info'); }
    }
    if (mine && a.status !== 'hiatus') {
      // segurança: custo mensal
      const c = secCost(s, a);
      if (c > 0) post(s, `sec15:${a.id}`, -c, 'artist_dev', `Segurança ${a.name}`);
      // paparazzi e privacidade
      const ps = papStress(s, a);
      if (ps > 0) for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.stress = clamp(p.stress + ps, 0, 100); }
      // tumulto de fãs
      if (r.chance(mobChance(s, a))) {
        const bad = r.chance(0.55);
        const p = s.persons[r.pick(a.members)];
        if (p) {
          if (bad) { p.stress = clamp(p.stress + 12, 0, 100); p.morale = clamp(p.morale - 6, 0, 100); }
          a.momentum = clamp(a.momentum + (bad ? 1 : 4), 0, 100);
          a.fans.core += Math.round(a.fans.core * 0.01);
          const tx = bad
            ? fmtL(l('Tumulto de fãs cerca {p} ({a}): susto, estresse +12 e moral −6. Mais segurança reduz o risco.', 'Fan mob surrounds {p} ({a}): a scare, stress +12 and morale −6. More security lowers the risk.'), { p: p.name, a: a.name })
            : fmtL(l('Multidão espera {p} ({a}) na porta do hotel: foto viral, +4 de momento.', 'A crowd waits for {p} ({a}) outside the hotel: viral photo, +4 momentum.'), { p: p.name, a: a.name });
          flog(s, a.id, tx, 0); notify(s, tx, bad ? 'bad' : 'good');
        }
      }
      // ego: integrante muito mais famoso que a banda
      if (a.members.length > 1) for (const id of a.members) {
        const p = s.persons[id];
        if (!p?.alive) continue;
        const gap = pf(s, id) - a.fame;
        if (gap >= 8 && r.chance(0.12)) {
          for (const o of a.members) if (o !== id && s.persons[o]) { const q = s.persons[o]; q.rel[id] = clamp((q.rel[id] ?? 0) - 3, -100, 100); q.resentment = clamp(q.resentment + 2, 0, 100); }
          if (p.ambition === 'fame' || p.goal === 'solo') p.morale = clamp(p.morale - 3, 0, 100);
          const tx = fmtL(l('Ego: {p} é mais famoso(a) que {a} (fama {v} × {b}); os colegas se ressentem e a ideia de carreira solo cresce.', 'Ego: {p} is more famous than {a} (fame {v} × {b}); bandmates resent it and the solo idea grows.'), { p: p.name, a: a.name, v: Math.round(pf(s, id)), b: Math.round(a.fame) });
          flog(s, a.id, tx, 0); flog(s, id, tx, 0); notify(s, tx, 'bad');
        }
      }
      // fama sobe a cabeça de quem quer fama (moral) — e pesa em quem quer sossego
      if (t >= 3) for (const id of a.members) { const p = s.persons[id]; if (!p?.alive) continue; if (p.ambition === 'fame' || p.ambition === 'status') p.morale = clamp(p.morale + 0.6, 0, 100); else if (p.ambition === 'freedom' || p.ambition === 'security') p.morale = clamp(p.morale - 0.4 * (t - 2), 0, 100); }
    }
    // degraus
    const t1 = fameTier(a.fame);
    if (t1 > fameTier(pk0) && t1 >= 2) { const tx = fmtL(l('{a} chega a {t} pela primeira vez. {d}', '{a} reaches {t} for the first time. {d}'), { a: a.name, t: FTIERS[t1].name, d: FTIERS[t1].desc }); flog(s, a.id, tx, 0); if (mine) notify(s, tx, 'good'); }
    st.pk[a.id] = Math.max(pk0, a.fame);
    if (rec0 && (mine || a.fame >= 15 || st.h[a.id] || s.knowledge[a.id] || a.legend)) rec(s, a.id, a.fame);
  }
  // saldo pessoal decai devagar; história trimestral das pessoas conhecidas
  for (const [id, v] of Object.entries(st.po)) { const nv = s.persons[id]?.alive === false ? v : v * 0.985; if (Math.abs(nv) < 0.3) delete st.po[id]; else st.po[id] = nv; }
  if (rec0) for (const a of Object.values(s.acts)) {
    if (!(mineAct(a) || a.fame >= 25 || st.h[a.id])) continue;
    for (const id of a.members) { const v = pf(s, id); if (v >= 12 || mineAct(a) || st.h[id]) rec(s, id, v); }
  }
}
registerSimHook('month', 'fame15', (s) => fameMonth(s));

// cachês sobem com a fama
registerMod('showRevenue', 'fame15', (_s, v, c) => {
  if (!c.act) return null;
  const m = feeMult(c.act);
  return m > 1 ? { value: v * m, label: fmtL(l('cachê de {t}', '{t} fee'), { t: FTIERS[fameTier(c.act.fame)].name }) } : null;
});
// turnês: tumulto e assédio sem segurança
registerMod('tourRisk', 'fame15', (s, v, c) => {
  if (!c.act || !mineAct(c.act)) return null;
  const t = fameTier(fameAt(s, c.act, c.cityId));
  if (t < 3) return null;
  return { value: v + (t - 2) * [0.004, 0.0015, 0][f15(s).sec[c.act.id] ?? 0], label: l('assédio de fãs (fama)', 'fan harassment (fame)') };
});
// negociação: famosos sabem o quanto valem
registerOfferMod('fame15', (_s, a, o) => {
  const t = fameTier(a.fame);
  if (t < 2) return null;
  const want = wantRoyalty(a);
  const gap = o.royalty - want;
  const d = gap >= 0 ? 0.02 : clamp(gap * 2.2 * (t - 1) / 2, -0.18, 0);
  return { delta: d, reason: fmtL(gap >= 0 ? l('Fama {t}: royalty à altura ({r}% ≥ {w}%).', 'Fame {t}: royalty that matches ({r}% ≥ {w}%).') : l('Fama {t}: sabe o quanto vale e quer pelo menos {w}% de royalty (você ofereceu {r}%).', 'Fame {t}: knows their worth and wants at least {w}% royalty (you offered {r}%).'), { t: FTIERS[t].name, r: Math.round(o.royalty * 100), w: Math.round(want * 100) }) };
});
