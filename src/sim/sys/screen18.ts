// Rodada 18 (society18, frente G — T1) — CARREIRA DE COMPOSITOR PARA TELAS E PALCO: cinema (falado, 1927+), TV
// (1950+), musicais da Broadway (1900+; Tony 1947+) e jogos (1985+). Encomendas chegam pela Caixa com DIRETOR (autoral,
// intrometido viciado em trilha provisória, ou confiante), cachê, prazo e prestígio. Você escolhe QUEM compõe (você ou
// alguém do elenco), a ABORDAGEM (imitar a trilha provisória: rápido e o diretor ama, mas a crítica torce o nariz e há
// risco de plágio; orquestra: cara e sólida; ousada: arte, mas o diretor pode jogar fora — trilhas rejeitadas são
// história real, ex. 2001 de Kubrick). Prazo estourado = correria (estresse) ou entrega pior. Na estreia: bilheteria,
// ÁLBUM DA TRILHA (lançar pelo seu selo, licenciar ou nada), musical com crítica de estreia e temporada que paga semana a
// semana, e temporada de prêmios (Oscar 1935+, Emmy 1949+, Tony 1947+, prêmios de jogos 2003+) com campanha de awards18.
// Extras: parceria com diretor que volta (dupla de longa data), royalties de reprises (cue sheets) e co-produção do
// musical (investimento → dividendos).

import { clamp, Rng } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { langForCity, personName } from '../people';
import { addStress } from '../stress17';
import type { GameState, Person } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { careers, registerCareer } from './careers12';
import { playerPerson } from './life';
import { noto, registerNoto14 } from './notoriety14';

export type Med18 = 'film' | 'tv' | 'musical' | 'game';
export type Style18 = 'auteur' | 'meddler' | 'trusting';
export type Ap18 = 'temp' | 'orch' | 'bold';
export const MED18: Record<Med18, { name: L; from: number; fee: number; mo: [number, number]; award: L; awFrom: number; awMonth: number }> = {
  film: { name: l('Cinema', 'Film'), from: 1927, fee: 30000, mo: [3, 6], award: l('Oscar de trilha', 'Score Oscar'), awFrom: 1935, awMonth: 2 },
  tv: { name: l('Série de TV', 'TV series'), from: 1950, fee: 14000, mo: [2, 4], award: l('Emmy de música', 'Music Emmy'), awFrom: 1949, awMonth: 8 },
  musical: { name: l('Musical (Broadway/West End)', 'Stage musical (Broadway/West End)'), from: 1900, fee: 22000, mo: [6, 11], award: l('Tony de partitura', 'Tony for Best Score'), awFrom: 1947, awMonth: 5 },
  game: { name: l('Videogame', 'Video game'), from: 1985, fee: 16000, mo: [3, 7], award: l('Prêmio de trilha de jogo', 'Game score award'), awFrom: 2003, awMonth: 11 },
};
export const STYLE18: Record<Style18, { name: L; desc: L }> = {
  auteur: { name: l('Autoral', 'Auteur'), desc: l('Quer uma voz própria; despreza imitação de trilha provisória.', 'Wants a distinct voice; despises temp-track imitation.') },
  meddler: { name: l('Intrometido', 'Meddler'), desc: l('Apaixonado pela trilha provisória; pede refações; pode jogar fora o que for ousado.', 'In love with the temp track; demands rewrites; may toss anything bold.') },
  trusting: { name: l('Confiante', 'Trusting'), desc: l('Deixa o compositor trabalhar; prazo é o que importa.', 'Lets the composer work; the deadline is what matters.') },
};
export const AP18: Record<Ap18, { name: L; desc: L; speed: number; q: number; cost: number }> = {
  temp: { name: l('Seguir a trilha provisória', 'Follow the temp track'), desc: l('Rápido; o diretor intrometido ama; crítica fria; risco de processo por plágio.', 'Fast; the meddler loves it; critics cold; plagiarism-suit risk.'), speed: 1.35, q: -6, cost: 0 },
  orch: { name: l('Orquestra completa', 'Full orchestra'), desc: l('Sessões caras (custo agora); qualidade sólida, ninguém reclama.', 'Expensive sessions (cost now); solid quality, nobody complains.'), speed: 1, q: 8, cost: 0.45 },
  bold: { name: l('Ousada e original', 'Bold and original'), desc: l('Mais chance de prêmio; o autoral adora, o intrometido pode rejeitar.', 'Better award odds; the auteur loves it, the meddler may reject it.'), speed: 0.85, q: 4, cost: 0.1 },
};

export interface Comm18 {
  id: string; med: Med18; title: string; dir: string; style: Style18; pres: number; fee: number; mo: number; y: number;
  st: 'offer' | 'work' | 'late' | 'done' | 'rejected' | 'declined';
  ap?: Ap18; who?: string; prog: number; due: number; q?: number; prem?: number; box?: number; ost?: 'label' | 'license' | 'none';
  nom?: 1; won?: 1; fyc?: number; cop?: number; run?: number; crit?: number; sued?: 1; why?: L[];
}
export interface Screen18 { rep: number; list: Comm18[]; seq: number; dirs: Record<string, number>; earned: number; wins: number; noms: number; ost: { id: string; until: number; v: number }[]; log: { y: number; t: L }[] }
declare module '../ext4' { interface Ext4 { screen18: Screen18 } }
registerExt4('screen18', () => ({ rep: 0, list: [], seq: 0, dirs: {}, earned: 0, wins: 0, noms: 0, ost: [], log: [] }));
export function sc18(s: GameState): Screen18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.screen18 ??= { rep: 0, list: [], seq: 0, dirs: {}, earned: 0, wins: 0, noms: 0, ost: [], log: [] }) as Screen18;
  st.ost ??= []; st.log ??= []; st.dirs ??= {};
  return st;
}
const logS = (s: GameState, t: L) => { const st = sc18(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 30) st.log.length = 30; };
export const medsNow18 = (s: GameState): Med18[] => (Object.keys(MED18) as Med18[]).filter((m) => s.year >= MED18[m].from);
const TITLES: Record<Med18, [string[], string[]]> = {
  film: [['A Última', 'Noite em', 'O Silêncio de', 'Fronteira', 'Sombras sobre', 'O Voo de', 'Coração de'], ['Cidade', 'Marte', 'Lisboa', 'Inverno', 'Ferro', 'Vidro', 'Ninguém']],
  tv: [['Plantão', 'Família', 'Detetives de', 'Hospital', 'Os Herdeiros de', 'Crimes em'], ['Central', 'Oeste', 'Copacabana', 'Midtown', 'Vila Nova', 'Harbor']],
  musical: [['Luzes de', 'A Canção de', 'Rua', 'Baile em', 'Os Sonhos de', 'Valsa para'], ['Broadway', 'Maria', 'Harlem', 'Paris', 'Ana', 'Ninguém']],
  game: [['Lendas de', 'Código', 'Reino de', 'Fuga de', 'Planeta', 'Guardião de'], ['Neon', 'Ômega', 'Cristal', 'Pixel', 'Aurora', 'Ferro']],
};

// ---------------------------------------------------------------- compositor

/** Quem pode compor: você e integrantes do elenco com composição ≥ 30. */
export function composers18(s: GameState): Person[] {
  const out: Person[] = [];
  const me = playerPerson(s);
  if (me?.alive) out.push(me);
  for (const id of playerActs(s)) for (const m of s.acts[id]?.members ?? []) { const p = s.persons[m]; if (p?.alive && !out.includes(p) && (p.skills?.comp ?? 0) >= 30) out.push(p); }
  return out.slice(0, 12);
}
export const skill18 = (p?: Person): number => (p ? clamp((p.skills?.comp ?? 0) * 0.6 + (p.skills?.prod ?? 0) * 0.2 + (p.skills?.instr ?? 0) * 0.2, 0, 100) : 25);
const busy = (s: GameState, pid: string) => sc18(s).list.filter((c) => (c.st === 'work' || c.st === 'late') && c.who === pid).length;

// ---------------------------------------------------------------- encomendas

function makeOffer(s: GameState, r: Rng): Comm18 | null {
  const st = sc18(s);
  const meds = medsNow18(s);
  if (!meds.length) return null;
  const med = r.pick(meds);
  // diretor que volta: dupla de longa data (Spielberg–Williams) tem preferência
  const fav = Object.entries(st.dirs).filter(([, v]) => v >= 30).sort((a, b) => b[1] - a[1])[0];
  const city = s.config.homeCity in cityById ? s.config.homeCity : Object.keys(cityById)[0];
  const dir = fav && r.chance(0.45) ? fav[0] : personName(r, langForCity(city, r));
  const style = (r.pick(['auteur', 'meddler', 'trusting', 'meddler']) as Style18);
  const pres = clamp(r.normal(0.35 + st.rep / 250, 0.18), 0.05, 1);
  const t = TITLES[med];
  const M = MED18[med];
  const mo = r.int(M.mo[0], M.mo[1]);
  const fee = money(s, M.fee * (0.6 + pres * 1.2) * (1 + st.rep / 120) * (fav && dir === fav[0] ? 1.25 : 1));
  return { id: `sc${++st.seq}`, med, title: `${r.pick(t[0])} ${r.pick(t[1])}`, dir, style, pres: Math.round(pres * 100) / 100, fee, mo, y: s.year, st: 'offer', prog: 0, due: 0 };
}

export function acceptComm18(s: GameState, id: string, who: string, ap: Ap18): L | null {
  const c = sc18(s).list.find((x) => x.id === id);
  if (!c || c.st !== 'offer') return l('Encomenda indisponível.', 'Commission unavailable.');
  const p = s.persons[who];
  if (!p?.alive || !composers18(s).includes(p)) return l('Escolha um compositor seu.', 'Pick one of your composers.');
  if (busy(s, who) >= 2) return l('Esse compositor já tem duas encomendas.', 'That composer already has two commissions.');
  const cost = Math.round(c.fee * AP18[ap].cost);
  if (cost > 0 && s.player.cash < cost) return l('Caixa insuficiente para as sessões.', 'Not enough cash for the sessions.');
  c.st = 'work'; c.who = who; c.ap = ap; c.due = s.week + c.mo * 4 + 2;
  post(s, `sc18adv:${c.id}`, Math.round(c.fee * 0.5), 'sync', `Trilha (adiantamento): ${c.title}`);
  if (cost > 0) post(s, `sc18orch:${c.id}`, -cost, 'recording', `Sessões de orquestra: ${c.title}`);
  logS(s, fmtL(l('{p} aceita compor {t} ({m}) para {d}.', '{p} takes on scoring {t} ({m}) for {d}.'), { p: p.name, t: c.title, m: MED18[c.med].name, d: c.dir }));
  return null;
}
export function declineComm18(s: GameState, id: string): void { const c = sc18(s).list.find((x) => x.id === id); if (c && c.st === 'offer') c.st = 'declined'; }
/** Co-produzir o musical: investe agora (atividade de investimento), recebe dividendos se a temporada pagar. */
export const copCost18 = (s: GameState, c: Comm18) => Math.round(c.fee * 3);
export function coproduce18(s: GameState, id: string): L | null {
  const c = sc18(s).list.find((x) => x.id === id);
  if (!c || c.med !== 'musical' || c.cop || (c.st !== 'work' && c.st !== 'late' && c.st !== 'offer')) return l('Só musicais antes da estreia.', 'Only musicals before opening.');
  const v = copCost18(s, c);
  if (s.player.cash < v) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `sc18cop:${c.id}`, -v, 'investments', `Co-produção: ${c.title}`);
  c.cop = v;
  return null;
}

/** Nota da entrega e a reação do diretor (pura; o sorteio entra como ruído r). */
export function deliveryScore18(s: GameState, c: Comm18, noise = 0): { q: number; dir: number; why: [L, number][] } {
  const p = c.who ? s.persons[c.who] : undefined;
  const sk = skill18(p);
  const why: [L, number][] = [[l('Habilidade do compositor', 'Composer skill'), Math.round(sk * 0.55)], [l('Base', 'Base'), 22], [l('Abordagem', 'Approach'), AP18[c.ap ?? 'orch'].q]];
  const late = Math.max(0, 1 - c.prog);
  if (late > 0) why.push([l('Entregue incompleta (correria)', 'Delivered unfinished (crunch)'), -Math.round(late * 30)]);
  const str = p ? Math.max(0, (p.stress ?? 0) - 60) * 0.25 : 0;
  if (str) why.push([l('Estresse do compositor', 'Composer stress'), -Math.round(str)]);
  if (noise) why.push([l('Inspiração (sorte)', 'Inspiration (luck)'), Math.round(noise)]);
  const q = clamp(why.reduce((t, x) => t + x[1], 0), 5, 100);
  const dirAdj = c.style === 'auteur' ? (c.ap === 'bold' ? 14 : c.ap === 'temp' ? -14 : 0) : c.style === 'meddler' ? (c.ap === 'temp' ? 16 : c.ap === 'bold' ? -18 : 0) : 4;
  return { q, dir: clamp(q + dirAdj + (sc18(s).dirs[c.dir] ?? 0) * 0.2 - late * 15, 0, 100), why };
}

function deliver(s: GameState, r: Rng, c: Comm18): void {
  const st = sc18(s);
  const d = deliveryScore18(s, c, r.normal(0, 8));
  c.q = Math.round(d.q);
  c.why = d.why.map(([k, v]) => fmtL(l('{k}: {v}', '{k}: {v}'), { k, v: v > 0 ? `+${v}` : String(v) }));
  const who = c.who ? s.persons[c.who] : undefined;
  if (d.dir < 42) {
    c.st = 'rejected';
    post(s, `sc18kill:${c.id}`, Math.round(c.fee * 0.15), 'sync', `Trilha rejeitada (multa de rescisão): ${c.title}`);
    st.rep = clamp(st.rep - 5, 0, 100);
    st.dirs[c.dir] = (st.dirs[c.dir] ?? 0) - 25;
    if (who) addStress(s, who.id, 8, l('Trilha rejeitada pelo diretor', 'Score rejected by the director'));
    const t = fmtL(l('{d} joga fora a trilha de {p} para {t} e chama outro compositor.', '{d} throws out {p}\'s score for {t} and calls another composer.'), { d: c.dir, p: who?.name ?? '?', t: c.title });
    logS(s, t);
    emitFact(s, { kind: 'statement', actors: ['player', ...(who ? [who.id] : [])], severity: 30 + c.pres * 30, visibility: 'public', tags: ['bad', 'screen18', 'rejected_score'], src: 'screen18', place: s.config.homeCity, text: t });
    return;
  }
  c.st = 'done';
  c.prem = s.week + r.int(6, 16);
  post(s, `sc18bal:${c.id}`, c.fee - Math.round(c.fee * 0.5), 'sync', `Trilha (saldo): ${c.title}`);
  st.earned += c.fee;
  st.rep = clamp(st.rep + 2 + c.pres * 4 + (c.q - 55) / 10, 0, 100);
  st.dirs[c.dir] = clamp((st.dirs[c.dir] ?? 0) + (d.dir >= 70 ? 20 : 6), -100, 100);
  logS(s, fmtL(l('Trilha de {t} entregue (nota {q}); o diretor {d}.', 'Score for {t} delivered (grade {q}); the director {d}.'), { t: c.title, q: c.q, d: d.dir >= 70 ? l('quer repetir a parceria', 'wants to work together again') : l('aprova', 'approves') }));
}

function premiere(s: GameState, r: Rng, c: Comm18): void {
  const st = sc18(s);
  const q = c.q ?? 50;
  c.box = Math.round(clamp(r.normal(0.3 + c.pres * 0.5 + (q - 50) / 200, 0.2), 0.02, 1.5) * 100) / 100;
  c.prem = undefined;
  if (c.med === 'musical') {
    c.crit = Math.round(clamp(q + r.normal(0, 14), 5, 100));
    c.run = c.crit >= 75 ? r.int(60, 200) : c.crit >= 55 ? r.int(16, 60) : r.int(1, 10);
  }
  const who = c.who ? s.persons[c.who] : undefined;
  const act = who && playerActs(s).map((id) => s.acts[id]).find((a) => a?.members.includes(who.id));
  if (act && c.box > 0.7) act.fame = clamp(act.fame + c.box * 2, 0, 100);
  if (c.ap === 'temp' && r.chance(0.12)) {
    c.sued = 1;
    const v = Math.round(c.fee * 0.4);
    post(s, `sc18suit:${c.id}`, -v, 'legal', `Acordo de plágio: ${c.title}`);
    st.rep = clamp(st.rep - 4, 0, 100);
    emitFact(s, { kind: 'case_ruling', actors: ['player', ...(who ? [who.id] : [])], severity: 45, visibility: 'public', tags: ['bad', 'screen18', 'plagiarism', 'rights'], src: 'screen18', place: s.config.homeCity,
      text: fmtL(l('A trilha de {t} copiou demais a trilha provisória: acordo de plágio custa {v}.', 'The {t} score copied the temp track too closely: a plagiarism settlement costs {v}.'), { t: c.title, v: `$${Math.round(v / 100).toLocaleString('en-US')}` }) });
  }
  const tx = c.med === 'musical'
    ? fmtL(l('{t} estreia: crítica {c}/100, temporada prevista de {w} semanas.', '{t} opens: reviews {c}/100, expected run of {w} weeks.'), { t: c.title, c: c.crit ?? 0, w: c.run ?? 0 })
    : fmtL(l('{t} estreia com bilheteria {b} e trilha de {p}.', '{t} premieres with box office {b} and a score by {p}.'), { t: c.title, b: c.box >= 1 ? l('enorme', 'huge') : c.box >= 0.6 ? l('boa', 'good') : l('fraca', 'weak'), p: who?.name ?? '?' });
  logS(s, tx);
  emitFact(s, { kind: 'release', actors: ['player', ...(who ? [who.id] : [])], severity: 25 + c.pres * 30 + c.box * 10, visibility: 'public', tags: [c.box >= 0.6 ? 'good' : '', 'screen18', c.med], src: 'screen18', place: s.config.homeCity, text: tx });
  pushInbox18(s, 'screen18_ost', { from: c.title, subject: fmtL(l('Álbum da trilha de {t}', 'Soundtrack album for {t}'), { t: c.title }),
    body: fmtL(l('Lançar pelo seu selo rende por 12 meses conforme a bilheteria (estimativa {e}/mês) e pode entrar nas paradas; licenciar a outro selo paga {v} agora.', 'Releasing on your label earns for 12 months with the box office (estimate {e}/month) and may chart; licensing to another label pays {v} now.'), { e: `$${Math.round(ostMonth18(s, c) / 100).toLocaleString('en-US')}`, v: `$${Math.round(ostLic18(s, c) / 100).toLocaleString('en-US')}` }),
    ref: { c: c.id }, actions: [{ id: 'label', label: l('Lançar pelo meu selo', 'Release on my label') }, { id: 'license', label: l('Licenciar', 'License it') }, { id: 'none', label: l('Sem álbum', 'No album') }], weeks: 6 });
}
export const ostMonth18 = (s: GameState, c: Comm18) => money(s, 1800 * (c.box ?? 0.3) * (0.5 + (c.q ?? 50) / 100) * (c.med === 'musical' ? 1.4 : c.med === 'game' ? 0.7 : 1));
export const ostLic18 = (s: GameState, c: Comm18) => Math.round(ostMonth18(s, c) * 5);
export function ost18(s: GameState, id: string, how: 'label' | 'license' | 'none'): L {
  const st = sc18(s), c = st.list.find((x) => x.id === id);
  if (!c || c.ost) return l('Já decidido.', 'Already decided.');
  c.ost = how;
  if (how === 'license') { post(s, `sc18lic:${c.id}`, ostLic18(s, c), 'licensing', `Licença do álbum da trilha: ${c.title}`); return l('Licenciado: dinheiro agora.', 'Licensed: cash now.'); }
  if (how === 'label') {
    st.ost.push({ id: c.id, until: s.week + 52, v: ostMonth18(s, c) });
    if ((c.box ?? 0) >= 0.9) emitFact(s, { kind: 'chart', actors: ['player'], severity: 40, visibility: 'public', tags: ['good', 'screen18', 'soundtrack'], src: 'screen18', place: s.config.homeCity, text: fmtL(l('O álbum da trilha de {t} entra nas paradas.', 'The {t} soundtrack album enters the charts.'), { t: c.title }) });
    return l('Álbum da trilha no seu selo.', 'Soundtrack album on your label.');
  }
  return l('Sem álbum.', 'No album.');
}
registerInboxKind('screen18_offer', { label: l('Trilhas', 'Scoring'), cat: 'deals', icon: 'film', prio: 1, goto: () => ({ area: 'cp17-screen' }),
  handle: (s, m, a) => { if (a === 'no') { declineComm18(s, String(m.ref?.c)); return l('Recusada.', 'Declined.'); } return l('Escolha compositor e abordagem na página Trilhas e palco.', 'Pick composer and approach on the Screen & stage page.'); } });
registerInboxKind('screen18_ost', { label: l('Trilhas', 'Scoring'), cat: 'deals', icon: 'disc', prio: 1, goto: () => ({ area: 'cp17-screen' }), handle: (s, m, a) => ost18(s, String(m.ref?.c), a as 'label' | 'license' | 'none') });

// ---------------------------------------------------------------- prêmios

/** Força na temporada de prêmios: qualidade, prestígio, bilheteria, campanha e o corpo de votantes (awards18). */
export const AWARD_ADJ18: { f?: (s: GameState, c: Comm18) => [L, number][] } = {};
export function awardScore18(s: GameState, c: Comm18): { v: number; why: [L, number][] } {
  const why: [L, number][] = [[l('Qualidade da trilha', 'Score quality'), Math.round((c.q ?? 0) * 0.6)], [l('Prestígio do projeto', 'Project prestige'), Math.round(c.pres * 30)], [l('Bilheteria/sucesso', 'Box office/success'), Math.round(Math.min(1.2, c.box ?? 0) * 10)]];
  if (c.ap === 'bold') why.push([l('Ousadia (votantes notam)', 'Boldness (voters notice)'), 6]);
  if (c.ap === 'temp') why.push([l('Soa derivativa', 'Sounds derivative'), -8]);
  if (c.med === 'musical' && c.crit) why.push([l('Crítica da estreia', 'Opening reviews'), Math.round((c.crit - 50) / 4)]);
  for (const x of AWARD_ADJ18.f?.(s, c) ?? []) why.push(x);
  return { v: Math.round(why.reduce((t, x) => t + x[1], 0)), why };
}
function season(s: GameState, r: Rng, med: Med18): void {
  const st = sc18(s);
  const M = MED18[med];
  if (s.year < M.awFrom) return;
  const pool = st.list.filter((c) => c.med === med && c.st === 'done' && !c.prem && !c.nom && c.y >= s.year - 2 && c.y <= s.year);
  for (const c of pool) {
    const sc = awardScore18(s, c).v;
    if (sc + r.normal(0, 6) < 62) continue;
    c.nom = 1; st.noms++;
    const win = r.chance(clamp((sc - 55) / 45, 0.08, 0.6));
    const who = c.who ? s.persons[c.who] : undefined;
    if (win) {
      c.won = 1; st.wins++;
      st.rep = clamp(st.rep + 12, 0, 100);
      s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100);
      s.player.stats.awards = (s.player.stats.awards ?? 0) + 1;
      const act = who && playerActs(s).map((id) => s.acts[id]).find((a) => a?.members.includes(who.id));
      if (act) act.fame = clamp(act.fame + 4, 0, 100);
    } else st.rep = clamp(st.rep + 3, 0, 100);
    const t = fmtL(win ? l('{p} vence o {a} por {t}!', '{p} wins the {a} for {t}!') : l('{p} é indicado ao {a} por {t}.', '{p} is nominated for the {a} for {t}.'), { p: who?.name ?? '?', a: M.award, t: c.title });
    logS(s, t);
    emitFact(s, { kind: 'award', actors: ['player', ...(who ? [who.id] : [])], severity: win ? 60 : 35, visibility: 'public', tags: ['good', 'screen18', med, win ? 'win' : 'nomination'], src: 'screen18', place: s.config.homeCity, text: t });
  }
}

// ---------------------------------------------------------------- tick

registerCareer({ id: 'screen', name: l('Compositor de trilhas e palco', 'Screen & stage composer'), desc: l('Encomendas de cinema, TV, musicais e jogos: diretores, trilha provisória, prazos, álbuns de trilha, Oscar e Tony.', 'Film, TV, musical and game commissions: directors, temp tracks, deadlines, soundtrack albums, Oscars and Tonys.'), from: 1900, icon: 'film', area: 'cp17-screen', load: 0.3,
  status: (s) => { const st = sc18(s); return fmtL(l('reputação {r} · {n} em andamento · {w} prêmio(s)', 'reputation {r} · {n} in progress · {w} award(s)'), { r: Math.round(st.rep), n: st.list.filter((c) => c.st === 'work' || c.st === 'late').length, w: st.wins }); } });
registerNoto14('screen', (s) => { const st = sc18(s); return st.earned / Math.max(1, money(s, 10000)) + st.wins * 8 + st.noms * 3; }, l('trilhas entregues, indicações e prêmios', 'delivered scores, nominations and awards'), l('Trilhas', 'Scoring'));

registerSimHook('month', 'screen18', (s) => {
  const st = sc18(s);
  const on = careers(s).active.includes('screen');
  const r = Rng.fromSeed(`${s.config.seed}|screen18|${s.week}`);
  // propostas: carreira ativa, ou fama de um astro seu (o roqueiro que vira compositor de cinema)
  const star = playerActs(s).some((id) => (s.acts[id]?.fame ?? 0) >= 55);
  const pOffer = on ? 0.3 + st.rep / 250 : star ? 0.04 : st.rep > 15 ? 0.05 : 0;
  if (pOffer && st.list.filter((c) => c.st === 'offer').length < 3 && r.chance(pOffer)) {
    const c = makeOffer(s, r);
    if (c) {
      st.list.push(c);
      pushInbox18(s, 'screen18_offer', { from: c.dir, subject: fmtL(l('Encomenda: trilha de {t} ({m})', 'Commission: score for {t} ({m})'), { t: c.title, m: MED18[c.med].name }),
        body: fmtL(l('Diretor {s}: {d} Cachê {f}, prazo {mo} meses, prestígio {p}%.', 'Director is {s}: {d} Fee {f}, {mo}-month deadline, {p}% prestige.'), { s: STYLE18[c.style].name, d: STYLE18[c.style].desc, f: `$${Math.round(c.fee / 100).toLocaleString('en-US')}`, mo: c.mo, p: Math.round(c.pres * 100) }),
        ref: { c: c.id }, actions: [{ id: 'go', label: l('Ver na página', 'See on the page') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 8 });
    }
  }
  for (const c of st.list) {
    if (c.st === 'offer' && c.y < s.year - 1) c.st = 'declined';
    if (c.st === 'work' || c.st === 'late') {
      const p = c.who ? s.persons[c.who] : undefined;
      if (!p?.alive) { c.st = 'rejected'; continue; }
      const load = busy(s, p.id);
      c.prog = clamp(c.prog + ((0.75 + skill18(p) / 250) * AP18[c.ap ?? 'orch'].speed) / c.mo / (load > 1 ? 1.35 : 1), 0, 1);
      addStress(s, p.id, 1.5 + (load > 1 ? 2 : 0) + (s.week > c.due - 5 && c.prog < 0.85 ? 4 : 0), l('Prazo de trilha', 'Scoring deadline'));
      if (c.prog >= 1 || s.week >= c.due) {
        if (c.prog < 0.8 && c.st === 'work') {
          c.st = 'late';
          pushInbox18(s, 'screen18_late', { from: c.dir, subject: fmtL(l('{t}: a trilha não vai ficar pronta', '{t}: the score will not be ready'), { t: c.title }),
            body: fmtL(l('Faltam {p}%. Pedir mais 1 mês custa confiança do diretor; entregar assim cai a nota; virar noites termina com +12 de estresse.', '{p}% left. Asking for 1 more month costs the director\'s trust; delivering as is lowers the grade; pulling all-nighters ends with +12 stress.'), { p: Math.round((1 - c.prog) * 100) }),
            ref: { c: c.id }, actions: [{ id: 'crunch', label: l('Virar noites', 'Pull all-nighters') }, { id: 'extend', label: l('Pedir 1 mês', 'Ask for 1 month') }, { id: 'ship', label: l('Entregar assim', 'Deliver as is') }], weeks: 3 });
        } else if (c.st === 'work' || c.prog >= 1) deliver(s, r, c);
      }
    }
    if (c.st === 'done' && c.prem && s.week >= c.prem) premiere(s, r, c);
    // musical em cartaz: semana a semana (resumido por mês), dividendos da co-produção
    if (c.st === 'done' && c.med === 'musical' && c.run && c.run > 0 && !c.prem) {
      const wk = Math.min(4, c.run);
      c.run -= wk;
      const roy = money(s, 900 * wk * (0.5 + (c.crit ?? 50) / 100));
      post(s, `sc18roy:${c.id}`, roy, 'publishing', `Direitos de autor do musical: ${c.title}`);
      if (c.cop) post(s, `sc18div:${c.id}`, Math.round(c.cop * 0.035 * wk * ((c.crit ?? 50) >= 70 ? 1.5 : (c.crit ?? 50) >= 50 ? 0.8 : 0.2)), 'dividends', `Dividendos da co-produção: ${c.title}`);
    }
  }
  // álbuns de trilha pelo selo
  st.ost = st.ost.filter((o) => o.until > s.week);
  for (const o of st.ost) { post(s, `sc18ost:${o.id}`, o.v, 'sales', 'Álbum de trilha sonora'); o.v = Math.round(o.v * 0.9); }
  for (const m of Object.keys(MED18) as Med18[]) if (s.month === MED18[m].awMonth) season(s, r, m);
  if (st.list.length > 60) st.list = st.list.filter((c, i) => i >= st.list.length - 60 || c.st === 'work' || c.st === 'late');
  if (on) noto(s).v.screen ??= 0;
});
registerInboxKind('screen18_late', { label: l('Trilhas', 'Scoring'), cat: 'decision', icon: 'clock', prio: 2, goto: () => ({ area: 'cp17-screen' }),
  handle: (s, m, a, r) => {
    const c = sc18(s).list.find((x) => x.id === String(m.ref?.c));
    if (!c || c.st !== 'late') return l('Já resolvido.', 'Already resolved.');
    if (a === 'crunch') { c.prog = Math.max(c.prog, 0.95); if (c.who) addStress(s, c.who, 12, l('Noites em claro pela trilha', 'All-nighters on the score')); deliver(s, r, c); return l('Entregue depois de noites sem dormir.', 'Delivered after sleepless nights.'); }
    if (a === 'extend') { c.st = 'work'; c.due = s.week + 4; sc18(s).dirs[c.dir] = (sc18(s).dirs[c.dir] ?? 0) - 12; return l('O diretor concede um mês, de cara feia.', 'The director grants a month, scowling.'); }
    deliver(s, r, c); return l('Entregue como estava.', 'Delivered as it was.');
  } });
// royalties de reprises (cue sheets): TV e cinema seguem pagando
registerSimHook('year', 'screen18', (s) => {
  const st = sc18(s);
  let v = 0;
  for (const c of st.list) if (c.st === 'done' && (c.med === 'tv' || c.med === 'film') && !c.prem) v += c.fee * 0.06 * Math.pow(0.85, Math.max(0, s.year - c.y)) * (0.5 + (c.box ?? 0.3));
  if (v > 0) post(s, 'sc18cue', Math.round(v), 'publishing', 'Royalties de execução de trilhas (reprises)');
  st.rep = clamp(st.rep * 0.97, 0, 100);
});

registerExplain('screen18.deliv', (s, ctx) => {
  const c = sc18(s).list.find((x) => x.id === ctx.c);
  if (!c || !c.who) return null;
  const d = deliveryScore18(s, c);
  return { title: l('Nota prevista da trilha', 'Expected score grade'), value: Math.round(d.q), fmt: 'num', parts: d.why.map(([label, value]) => ({ label, value, fmt: 'signed' as const })),
    note: fmtL(l('Reação do diretor ({s}): {d}/100 — abaixo de 42 ele joga fora a trilha.', 'Director reaction ({s}): {d}/100 — below 42 the score is thrown out.'), { s: STYLE18[c.style].name, d: Math.round(d.dir) }) };
});
registerExplain('screen18.award', (s, ctx) => {
  const c = sc18(s).list.find((x) => x.id === ctx.c);
  if (!c) return null;
  const a = awardScore18(s, c);
  return { title: MED18[c.med].award, value: a.v, fmt: 'num', parts: a.why.map(([label, value]) => ({ label, value, fmt: 'signed' as const })), note: l('Indicação a partir de ~62 (com ruído); vitória mais provável quanto maior.', 'Nomination from ~62 (with noise); higher means likelier to win.') };
});
registerAdvisorTip('screen18', (s) => {
  const st = sc18(s);
  const off = st.list.filter((c) => c.st === 'offer');
  const late = st.list.filter((c) => c.st === 'work' && c.prog < 0.5 && s.week > c.due - 6);
  const out = [] as ReturnType<Parameters<typeof registerAdvisorTip>[1]>;
  if (off.length) out.push({ id: 'screen18-offer', level: 'info', cat: 'opportunity', score: 40, text: fmtL(l('{n} encomenda(s) de trilha esperando resposta.', '{n} scoring commission(s) waiting for an answer.'), { n: off.length }), goto: { area: 'cp17-screen' } });
  for (const c of late.slice(0, 1)) out.push({ id: `screen18-late-${c.id}`, level: 'warn', cat: 'career', score: 60, text: fmtL(l('A trilha de {t} está atrasada ({p}% pronta).', 'The {t} score is behind ({p}% done).'), { t: c.title, p: Math.round(c.prog * 100) }), why: [l('Prazo em menos de 6 semanas.', 'Deadline in under 6 weeks.')], goto: { area: 'cp17-screen' } });
  return out;
});
