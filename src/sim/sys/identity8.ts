// Identidade e memória dos artistas (rodada 8): personalidade e ambição viram preferências artísticas
// (arte × vendas, liberdade, lealdade, inquietação) que mexem em propostas, recusas e satisfação; a
// relação com o selo vira memória (apoio, abandono, promessas cumpridas ou quebradas, favoritismo);
// moral e confiança mudam a reação ao mesmo resultado comercial; troca de formação e de gênero muda
// som, público e clima interno; e a carreira passa por fases reconhecíveis — descoberta, afirmação,
// auge, desgaste e reinvenção.
//
// Estado esparso: só atos que já foram do jogador ganham ficha de memória (o mundo tem 1000+ atos).
// Para os demais, fase e preferências são calculadas na hora a partir do que é público.

import { clamp } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { songProfile } from '../repertoire';
import type { Act, GameState, Person, Release } from '../types';
import { fmtL, money, notify, playerActs, remember } from '../util';

// ---------------------------------------------------------------- tipos e estado

export type PhaseId = 'discovery' | 'affirmation' | 'peak' | 'wear' | 'reinvention';
export type BondKind = 'support' | 'abandon' | 'kept' | 'broken' | 'favor' | 'blame' | 'pride';

export interface ActMem {
  /** pico de fama observado e semana do pico */
  pk: number;
  pw: number;
  /** semana da última reinvenção (troca de voz, de formação ou de gênero) */
  rv?: number;
  /** gênero e formação vistos por último */
  g: string;
  m: string;
  /** memória da relação com o selo (pesos que desbotam devagar) */
  sup: number;
  ab: number;
  kept: number;
  broke: number;
  fav: number;
  /** promessas de contrato já contabilizadas (cumpridas / quebradas) */
  pk1: number;
  pk0: number;
  log: { w: number; k: BondKind; t?: string }[];
  /** fases da carreira vividas com o selo */
  eras: { y: number; ph: PhaseId; g: string; n: number }[];
  ph?: PhaseId;
  /** última reação a um resultado */
  re?: { w: number; k: string; rel: string };
}

export interface IdentityState {
  acts: Record<string, ActMem>;
  /** último id de memória já lido (para apoio/abandono vindos de outros sistemas) */
  memSeq: number;
}

declare module '../ext4' { interface Ext4 { identity8: IdentityState } }
registerExt4('identity8', () => ({ acts: {}, memSeq: 0 }));
export const identity = (s: GameState): IdentityState => (s as unknown as { x4: { identity8: IdentityState } }).x4.identity8;

const lineupKey = (a: Act) => [...a.members].sort().join(',');

export function memOf(s: GameState, a: Act): ActMem {
  const st = identity(s);
  return (st.acts[a.id] ??= { pk: a.fame, pw: s.week, g: a.genre, m: lineupKey(a), sup: 0, ab: 0, kept: 0, broke: 0, fav: 0, pk1: 0, pk0: 0, log: [], eras: [] });
}

export const PHASES: Record<PhaseId, { name: L; desc: L; tone: string }> = {
  discovery: { name: l('Descoberta', 'Discovery'), tone: '', desc: l('Começo de carreira: fome de palco, aceita menos para ter uma chance e converte fãs com facilidade.', 'Early career: hungry, accepts less for a chance and converts fans easily.') },
  affirmation: { name: l('Afirmação', 'Affirmation'), tone: 'good', desc: l('Já tem público e quer prioridade: cobra lançamentos e divulgação.', 'Has an audience and wants priority: expects releases and promotion.') },
  peak: { name: l('Auge', 'Peak'), tone: 'gold', desc: l('No topo: cobra mais, aceita menos ordens e pode recusar repetir a fórmula.', 'On top: costs more, takes fewer orders and may refuse to repeat the formula.') },
  wear: { name: l('Desgaste', 'Wear'), tone: 'warn', desc: l('O público envelhece e a moral cai: aceita discos comerciais ou pede para se reinventar.', 'The audience ages and morale sags: open to commercial records or asks to reinvent.') },
  reinvention: { name: l('Reinvenção', 'Reinvention'), tone: 'neural', desc: l('Som, formação ou estilo novos: perde parte dos fãs antigos, ganha curiosos e inspiração.', 'New sound, line-up or style: loses some old fans, gains the curious and inspiration.') },
};

// ---------------------------------------------------------------- preferências

export interface Prefs {
  /** 0 = puramente comercial, 100 = puramente artístico */
  art: number;
  /** quanto valoriza controle criativo */
  freedom: number;
  /** apego ao selo e às pessoas */
  loyalty: number;
  /** vontade de mudar de som e experimentar */
  restless: number;
}

const AMB_ART: Record<string, number> = { art: 18, critics: 14, legacy: 8, freedom: 8, fame: -14, money: -18, status: -10, security: -4 };
const TR_ART: Record<string, number> = { experimental: 10, purist: 6, intellectual: 6, dreamer: 4, perfectionist: 4, virtuoso: 3, opportunist: -8, media_savvy: -5, charismatic: -3, party: -3, ambitious: -3 };
const TR_FREE: Record<string, number> = { rebel: 10, big_ego: 6, experimental: 5, loner: 4, loyal: -8, diplomatic: -5, disciplined: -3 };
const TR_LOYAL: Record<string, number> = { loyal: 20, rooted: 6, generous: 5, diplomatic: 3, opportunist: -20, resentful: -10, manipulative: -8, big_ego: -4 };
const TR_REST: Record<string, number> = { experimental: 15, chameleon: 15, impulsive: 8, dreamer: 6, purist: -15, rooted: -10, disciplined: -3 };

const sumT = (p: Person, tab: Record<string, number>) => p.traits.reduce((t0, x) => t0 + (tab[x] ?? 0), 0);

/** Preferências do ato (média dos integrantes; quem lidera pesa o dobro). */
export function prefsOf(s: GameState, a: Act): Prefs {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  if (!ms.length) return { art: 50, freedom: 40, loyalty: 50, restless: 40 };
  let w = 0;
  const acc = { art: 0, freedom: 0, loyalty: 0, restless: 0 };
  for (const p of ms) {
    const k = p.id === a.leaderId ? 2 : 1;
    const pe = p.persona;
    acc.art += k * (50 + (AMB_ART[p.ambition] ?? 0) + sumT(p, TR_ART) + (pe ? (pe.openness - 50) / 5 : 0));
    acc.freedom += k * (40 + (p.ambition === 'freedom' ? 25 : p.ambition === 'art' ? 10 : p.ambition === 'security' ? -8 : 0) + sumT(p, TR_FREE));
    acc.loyalty += k * (50 + sumT(p, TR_LOYAL) + (pe ? (pe.sociability - 50) / 6 : 0) - p.resentment / 5);
    acc.restless += k * (40 + sumT(p, TR_REST) + (pe ? (pe.openness - 50) / 4 : 0));
    w += k;
  }
  const ph = careerPhase(s, a);
  const mine = a.owner === 'player' && !a.playerBand;
  return {
    art: clamp(Math.round(acc.art / w), 0, 100),
    freedom: clamp(Math.round(acc.freedom / w), 0, 100),
    loyalty: clamp(Math.round(acc.loyalty / w + (mine ? (a.trust - 50) / 3 : 0)), 0, 100),
    restless: clamp(Math.round(acc.restless / w + (ph === 'wear' ? 15 : ph === 'peak' ? 5 : 0)), 0, 100),
  };
}

/** Frases curtas que resumem o gosto (para a ficha e para as recusas). */
export function prefsLines(p: Prefs): L[] {
  const out: L[] = [];
  if (p.art >= 62) out.push(l('Põe a arte acima das vendas', 'Puts art above sales'));
  else if (p.art <= 38) out.push(l('Quer sucesso comercial', 'Wants commercial success'));
  else out.push(l('Equilibra arte e mercado', 'Balances art and market'));
  if (p.freedom >= 60) out.push(l('Exige liberdade criativa', 'Demands creative freedom'));
  if (p.loyalty >= 65) out.push(l('Leal a quem apoia', 'Loyal to those who back them'));
  else if (p.loyalty <= 35) out.push(l('Escuta propostas de rivais', 'Listens to rival offers'));
  if (p.restless >= 60) out.push(l('Inquieto(a): quer mudar de som', 'Restless: wants to change sound'));
  else if (p.restless <= 25) out.push(l('Fiel ao próprio som', 'Faithful to their sound'));
  return out;
}

// ---------------------------------------------------------------- fases da carreira

/** Fase atual: com ficha de memória usa o pico real; sem ela, estima pelo histórico público. */
export function careerPhase(s: GameState, a: Act): PhaseId {
  const m = identity(s).acts[a.id];
  const years = s.year - (a.debutYear || a.formed);
  const peak = Math.max(a.fame, m?.pk ?? 0, a.number1s ? 60 : a.peakChart <= 10 ? 50 : a.peakChart <= 40 ? 32 : 0);
  if (m?.rv !== undefined && s.week - m.rv < 104) return 'reinvention';
  if ((a.releases.length <= 1 && years <= 2) || (a.fame < 14 && years <= 4 && peak < 25)) return 'discovery';
  if (a.fame >= 42 && a.fame >= peak * 0.86) return 'peak';
  if ((peak - a.fame > 14 && years >= 4) || (years >= 14 && a.momentum < 22 && a.fame < peak * 0.92)) return 'wear';
  return 'affirmation';
}

// ---------------------------------------------------------------- memória da relação

const BOND_TXT: Record<BondKind, L> = {
  support: l('apoio do selo', 'label support'),
  abandon: l('sentiu-se abandonado(a)', 'felt abandoned'),
  kept: l('promessa cumprida', 'promise kept'),
  broken: l('promessa quebrada', 'promise broken'),
  favor: l('sentiu-se preterido(a)', 'felt passed over'),
  blame: l('culpou o selo pelo fracasso', 'blamed the label for a flop'),
  pride: l('orgulho do trabalho com o selo', 'proud of the work with the label'),
};
export const bondText = (k: BondKind): L => BOND_TXT[k];

/** Registra um fato na memória da relação ato × selo. */
export function bondNote(s: GameState, a: Act, k: BondKind, detail?: string): void {
  const m = memOf(s, a);
  if (k === 'support' || k === 'pride') m.sup += 1;
  else if (k === 'abandon' || k === 'blame') m.ab += 1;
  else if (k === 'kept') m.kept += 1;
  else if (k === 'broken') m.broke += 1;
  else if (k === 'favor') m.fav += 1;
  m.log.push({ w: s.week, k, t: detail });
  if (m.log.length > 8) m.log.splice(0, m.log.length - 8);
}

/** Saldo da relação (−∞..+∞; >0 = boa lembrança). */
export function bondBalance(m: ActMem | undefined): number {
  if (!m) return 0;
  return m.sup + m.kept * 1.5 - m.ab - m.broke * 2 - m.fav * 0.8;
}

// ---------------------------------------------------------------- reações a resultados

export type ResultKind = 'hit_acclaim' | 'hit_panned' | 'flop_acclaim' | 'flop_panned' | 'middle';

export function resultKind(rel: Release): ResultKind {
  const crit = rel.critic ?? 55;
  const comm = rel.peak <= 10 ? 2 : rel.peak <= 40 ? 1 : 0;
  if (comm === 2) return crit >= 70 ? 'hit_acclaim' : crit < 52 ? 'hit_panned' : 'middle';
  if (comm === 0) return crit >= 70 ? 'flop_acclaim' : crit < 52 ? 'flop_panned' : 'middle';
  return 'middle';
}

const REACT: Record<string, L> = {
  hit_acclaim: l('{a} comemora: sucesso de público e de crítica com "{t}".', '{a} celebrates: "{t}" is a hit with fans and critics.'),
  hit_panned_art: l('{a} vendeu com "{t}", mas a crítica feriu o orgulho: moral em baixa.', '{a} sold with "{t}", but the reviews hurt their pride: morale down.'),
  hit_panned_com: l('{a} não liga para a crítica: "{t}" vendeu, e isso basta.', '{a} shrugs off the critics: "{t}" sold, and that is enough.'),
  flop_acclaim_art: l('{a} vendeu pouco com "{t}", mas a crítica aclamou: dizem que valeu a pena.', '{a} sold little with "{t}", but critics raved: they say it was worth it.'),
  flop_acclaim_com: l('{a} lê os elogios a "{t}" e pergunta: cadê as vendas?', '{a} reads the praise for "{t}" and asks: where are the sales?'),
  flop_blame: l('{a} culpa o selo pelo fracasso de "{t}": "faltou divulgação".', '{a} blames the label for the flop of "{t}": "there was no promotion".'),
  flop_together: l('{a} encara o fracasso de "{t}" com o selo: "o próximo vai ser melhor".', '{a} faces the flop of "{t}" alongside the label: "the next one will be better".'),
};

function moodAll(s: GameState, a: Act, k: 'morale' | 'inspiration' | 'resentment', v: number): void {
  for (const id of a.members) {
    const p = s.persons[id];
    if (p?.alive && !p.isPlayer) p[k] = clamp(p[k] + v, 0, 100);
  }
}

/** Mesma venda, reações diferentes: depende do gosto, da moral e da confiança no selo. */
export function reactToResult(s: GameState, a: Act, rel: Release): string {
  const kind = resultKind(rel);
  if (kind === 'middle') return 'middle';
  const pr = prefsOf(s, a);
  const artsy = pr.art >= 58;
  const morale = a.members.reduce((t0, id) => t0 + (s.persons[id]?.morale ?? 50), 0) / Math.max(1, a.members.length);
  let key: string = kind;
  if (kind === 'hit_acclaim') {
    moodAll(s, a, 'morale', 6);
    a.trust = clamp(a.trust + 3, 0, 100);
    bondNote(s, a, 'pride', rel.title);
  } else if (kind === 'hit_panned') {
    key = artsy ? 'hit_panned_art' : 'hit_panned_com';
    moodAll(s, a, 'morale', artsy ? -4 : 5);
  } else if (kind === 'flop_acclaim') {
    key = artsy ? 'flop_acclaim_art' : 'flop_acclaim_com';
    moodAll(s, a, 'morale', artsy ? 5 : -4);
    if (artsy) { moodAll(s, a, 'inspiration', 6); a.trust = clamp(a.trust + 2, 0, 100); }
  } else {
    // fracasso duplo: quem confia segura a barra junto; quem não confia aponta o dedo
    if (a.trust >= 58 && morale >= 45) { key = 'flop_together'; moodAll(s, a, 'morale', -2); }
    else { key = 'flop_blame'; moodAll(s, a, 'morale', -5); a.trust = clamp(a.trust - 6, 0, 100); bondNote(s, a, 'blame', rel.title); }
  }
  memOf(s, a).re = { w: s.week, k: key, rel: rel.id };
  notify(s, fmtL(REACT[key], { a: a.name, t: rel.title }), key === 'flop_blame' || key === 'hit_panned_art' || key === 'flop_acclaim_com' ? 'bad' : 'info');
  return key;
}

export const reactionText = (k: string): L | undefined => REACT[k];

// ---------------------------------------------------------------- mudanças de formação e de estilo

function lineupChanged(s: GameState, a: Act, m: ActMem): void {
  const before = m.m ? m.m.split(',') : [];
  const now = lineupKey(a).split(',').filter(Boolean);
  const gone = before.filter((x) => !now.includes(x));
  const added = now.filter((x) => !before.includes(x));
  m.m = now.join(',');
  if (!gone.length && !added.length) return;
  const voice = gone.some((id) => { const p = s.persons[id]; return !!p && (p.role === 'vocal' || p.role === 'mc' || id === a.leaderId); });
  const big = voice || gone.length + added.length >= 3;
  // som e público: a voz é a identidade; troca grande = fase nova
  if (voice) {
    a.fans.core = Math.round(a.fans.core * 0.95);
    a.fans.active = Math.round(a.fans.active * 0.97);
    a.fans.casual = Math.round(a.fans.casual * 1.03);
    a.momentum = clamp(a.momentum + 6, 0, 100);
  }
  // clima interno: quem é leal sente falta; quem é inquieto gosta de sangue novo
  for (const id of now) {
    const p = s.persons[id];
    if (!p?.alive || p.isPlayer || added.includes(id)) continue;
    const d = (p.traits.includes('loyal') ? -4 : 0) + (p.traits.includes('experimental') || p.traits.includes('chameleon') ? 3 : 0) + (gone.some((g) => (p.rel[g] ?? 0) > 40) ? -3 : 0);
    if (d) p.morale = clamp(p.morale + d, 0, 100);
    for (const n of added) p.rel[n] ??= 10;
  }
  if (big) {
    m.rv = s.week;
    remember(s, 'lineup8', fmtL(voice ? l('{a} muda de voz: o som e o público entram numa fase nova.', '{a} changes voice: sound and audience enter a new phase.') : l('{a} renova a formação: começa uma fase nova.', '{a} overhauls the line-up: a new phase begins.'), { a: a.name }), { actId: a.id, important: true });
  }
}

function genreChanged(s: GameState, a: Act, m: ActMem): void {
  if (m.g === a.genre) return;
  const sameFam = familyOf(m.g) === familyOf(a.genre);
  const pr = prefsOf(s, a);
  // fãs antigos estranham; curiosos chegam; quem é inquieto se anima
  a.fans.core = Math.round(a.fans.core * (sameFam ? 0.96 : 0.88));
  a.fans.active = Math.round(a.fans.active * (sameFam ? 0.98 : 0.93));
  a.fans.casual = Math.round(a.fans.casual * (sameFam ? 1.02 : 1.06));
  moodAll(s, a, 'morale', pr.restless >= 55 ? 6 : -3);
  moodAll(s, a, 'inspiration', 8);
  if (!sameFam) m.rv = s.week;
  remember(s, 'style8', fmtL(sameFam ? l('{a} ajusta o som: parte dos fãs antigos estranha.', '{a} tweaks the sound: some old fans balk.') : l('{a} muda de estilo: fãs antigos se dividem, curiosos chegam.', '{a} changes style: old fans split, newcomers arrive.'), { a: a.name }), { actId: a.id, important: !sameFam });
  m.g = a.genre;
}

// ---------------------------------------------------------------- mês

const SUPPORT_KINDS: Record<string, BondKind> = { treatment: 'support', meetup: 'support', renegotiation: 'support', rehab7: 'support' };

function scanMemory(s: GameState): void {
  const st = identity(s);
  let maxSeq = st.memSeq;
  for (let i = s.memory.length - 1; i >= 0; i--) {
    const e = s.memory[i];
    const seq = parseInt(e.id.slice(1), 36);
    if (!Number.isFinite(seq) || seq <= st.memSeq) break;
    if (seq > maxSeq) maxSeq = seq;
    const k = SUPPORT_KINDS[e.kind];
    const a = e.actId ? s.acts[e.actId] : undefined;
    if (k && a && a.owner === 'player') bondNote(s, a, k);
  }
  st.memSeq = maxSeq;
}

function marketingSpend(s: GameState, a: Act): number {
  let v = 0;
  for (const id of a.releases) {
    const r = s.releases[id];
    if (r && s.week - r.week < 52) for (const m of r.marketing) v += m.budget;
  }
  return v;
}

function monthIdentity(s: GameState): void {
  scanMemory(s);
  const ids = playerActs(s);
  const roster = ids.map((id) => s.acts[id]).filter((a) => a && !a.playerBand && a.status !== 'retired' && a.status !== 'split');
  // favoritismo: verba de divulgação do ano comparada entre artistas do elenco
  const spend = new Map(roster.map((a) => [a.id, marketingSpend(s, a)]));
  const top = roster.slice().sort((x, y) => (spend.get(y.id) ?? 0) - (spend.get(x.id) ?? 0))[0];
  const topSpend = top ? spend.get(top.id) ?? 0 : 0;
  for (const id of ids) {
    const a = s.acts[id];
    if (!a) continue;
    const m = memOf(s, a);
    if (a.fame > m.pk) { m.pk = a.fame; m.pw = s.week; }
    // desbota a memória devagar (anos, não meses)
    for (const k of ['sup', 'ab', 'kept', 'broke', 'fav'] as const) m[k] = Math.round(m[k] * 0.985 * 1000) / 1000;
    if (a.members.length) lineupChanged(s, a, m);
    genreChanged(s, a, m);
    // fase da carreira: mudanças viram capítulos ("eras")
    const ph = careerPhase(s, a);
    if (ph !== m.ph) {
      if (m.ph) {
        m.eras.push({ y: s.year, ph, g: a.genre, n: a.members.length });
        if (m.eras.length > 8) m.eras.splice(0, m.eras.length - 8);
        if (ph === 'peak' || ph === 'wear' || ph === 'reinvention') remember(s, 'phase8', fmtL(l('{a} entra na fase de {p}.', '{a} enters a phase of {p}.'), { a: a.name, p: PHASES[ph].name }), { actId: a.id, important: ph === 'peak' });
      } else m.eras.push({ y: s.year, ph, g: a.genre, n: a.members.length });
      m.ph = ph;
    }
    if (a.playerBand || a.status === 'retired' || a.status === 'split') continue;
    // promessas de contrato viram memória (cumpridas e quebradas)
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (c && c.party === 'player') {
      const kept = c.promises.filter((p) => p.kept === true).length;
      const broke = c.promises.filter((p) => p.kept === false).length;
      if (kept > m.pk1) { bondNote(s, a, 'kept'); m.pk1 = kept; }
      if (broke > m.pk0) { bondNote(s, a, 'broken'); m.pk0 = broke; }
      // abandono: um ano sem lançar nada, sem pausa combinada
      if (a.status === 'active' && s.week - a.lastRelease > 56 && s.week - c.startWeek > 56 && s.month % 6 === 0) bondNote(s, a, 'abandon');
    }
    // favoritismo: quem recebe quase nada enquanto outro leva a verba toda
    if (roster.length >= 2 && top && top.id !== a.id && topSpend > money(s, 3000) && (spend.get(a.id) ?? 0) < topSpend * 0.2 && s.month % 4 === 0) bondNote(s, a, 'favor', top.name);
    // efeitos da fase e da memória
    if (ph === 'discovery') { a.fans.core += Math.round(a.fans.active * 0.002); moodAll(s, a, 'inspiration', 1); }
    else if (ph === 'affirmation' && s.week - a.lastRelease > 40) moodAll(s, a, 'morale', -1);
    else if (ph === 'wear') moodAll(s, a, 'morale', -0.5);
    else if (ph === 'reinvention') { a.fans.core = Math.round(a.fans.core * 0.996); a.fans.casual += Math.round(a.fans.core * 0.01); moodAll(s, a, 'inspiration', 2); }
    const bal = bondBalance(m);
    if (bal) a.trust = clamp(a.trust + clamp(bal * 0.05, -0.5, 0.4), 0, 100);
  }
}

registerSimHook('month', 'identity8', (s) => monthIdentity(s));

// reação ao resultado, oito semanas depois do lançamento (quando a crítica já saiu e a parada assentou)
registerSimHook('week', 'identity8', (s) => {
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.playerBand) continue;
    for (let i = a.releases.length - 1; i >= 0; i--) {
      const rel = s.releases[a.releases[i]];
      if (!rel) continue;
      const age = s.week - rel.week;
      if (age > 8) break;
      if (age === 8 && !rel.reissueOf && !rel.hist) reactToResult(s, a, rel);
    }
  }
});

// ---------------------------------------------------------------- propostas e recusas

/** Identidade do selo do jogador: −1 (comercial) .. +1 (artístico). */
export function labelLean(s: GameState): number {
  const r = s.player.reputation;
  return clamp((r.artistic - r.commercial) / 60, -1, 1);
}

registerOfferMod('identity8', (s, a, o) => {
  const pr = prefsOf(s, a);
  const ph = careerPhase(s, a);
  let d = 0;
  let reason: L | undefined;
  // afinidade com a cara do selo
  const fit = ((pr.art - 50) / 50) * labelLean(s);
  d += fit * 0.08;
  if (fit > 0.2) reason = l('O selo tem a cara que procuram.', 'The label has the profile they want.');
  else if (fit < -0.2) reason = pr.art > 50 ? l('Acham o selo comercial demais.', 'They find the label too commercial.') : l('Acham o selo pouco comercial.', 'They find the label not commercial enough.');
  // liberdade
  if (pr.freedom >= 62 && !o.creativeControl) { d -= 0.06; reason ??= l('Não abrem mão de liberdade criativa.', 'They will not give up creative freedom.'); }
  // fase da carreira
  if (ph === 'discovery') d += 0.04;
  else if (ph === 'peak') { d -= 0.05; reason ??= l('Estão no auge e sabem disso.', 'They are at their peak and know it.'); }
  else if (ph === 'wear' && pr.art < 55) d += 0.03;
  // lembrança de quem já foi do selo
  const m = identity(s).acts[a.id];
  const bal = bondBalance(m);
  if (m && bal < -1) { d -= clamp(-bal * 0.04, 0, 0.16); reason = m.broke > 0.5 ? l('Lembram da promessa que você quebrou.', 'They remember the promise you broke.') : l('Guardam mágoa do tempo no selo.', 'They hold a grudge from their time at the label.'); }
  else if (m && bal > 1) { d += clamp(bal * 0.03, 0, 0.1); reason = l('Guardam boas lembranças do selo.', 'They have fond memories of the label.'); }
  return { delta: d, reason };
});

// ---------------------------------------------------------------- fórmula: o lançamento repete o hit?

/** Hit recente do ato (top 10 nos últimos dois anos). */
export function recentHit(s: GameState, a: Act, exceptId?: string): Release | undefined {
  return a.releases.map((id) => s.releases[id]).filter((r) => r && r.id !== exceptId && r.peak <= 10 && s.week - r.week < 104 && !r.hist).sort((x, y) => x.peak - y.peak)[0];
}

/** Um lançamento "repete a fórmula" quando é do mesmo gênero do hit e tem faixa principal acessível. */
export function repeatsFormula(s: GameState, a: Act, rel: Release): Release | undefined {
  const hit = recentHit(s, a, rel.id);
  if (!hit) return undefined;
  const lead = s.songs[rel.songs[0]];
  const access = lead ? songProfile(lead).access : 50;
  const leadHit = s.songs[hit.songs[0]];
  const sameGenre = !leadHit || !lead || leadHit.genre === lead.genre;
  return sameGenre && access >= 55 ? hit : undefined;
}

/** O lançamento soa experimental (originalidade alta ou posicionamento mais alternativo). */
export function soundsExperimental(s: GameState, rel: Release): boolean {
  const songs = rel.songs.map((id) => s.songs[id]).filter(Boolean);
  if (!songs.length) return false;
  const orig = songs.reduce((t0, x) => t0 + x.originality, 0) / songs.length;
  return orig >= 60;
}

/** O lançamento soa comercial (faixa principal acessível). */
export function soundsCommercial(s: GameState, rel: Release): boolean {
  const lead = s.songs[rel.songs[0]];
  return !!lead && songProfile(lead).access >= 58;
}
