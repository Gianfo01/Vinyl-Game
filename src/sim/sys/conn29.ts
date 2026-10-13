// R29 (CONECTAR TUDO): arestas entre sistemas que a sonda de 13 sistemas (src/sim/probe29all.ts) mediu como ausentes e
// que o jogo deveria ter. Cada uma é pequena, aditiva, entra por um registro que já existe (modificador, ajuste do
// Gramofone, chance de crime, proposta, gancho mensal, ouvinte de fato) e aparece no "por quê". Um botão de equilíbrio
// (CONN29.k) escala tudo; bônus de apelo passam pela família de causa (caps18).
//
//  dinheiro  → vida       selo sem caixa livre: o elenco teme o cachê atrasado (pressão de curto prazo)
//  contratos → vida       confiança baixa no selo estressa; alta alivia
//  contratos → projetos   confiança alta rende um pouco mais em estúdio; baixa rende menos (songQ)
//  contratos → ao vivo    confiança alta/baixa no palco (showRevenue)
//  reputação → imprensa   reputação institucional amortece o escândalo
//  sede      → imprensa   assessor de imprensa (publicist) amortece o escândalo
//  submundo  → imprensa   polícia de olho: o escândalo pega mais
//  submundo  → vida       calor policial e laço com organização: medo no elenco
//  submundo  → contratos  artistas evitam selo na mira da polícia (proposta)
//  submundo  → reputação / dinheiro   calor alto: reputação institucional cai e o jurídico cobra (mensal)
//  reputação → prêmios    júri do Gramofone pesa a reputação do selo
//  imprensa  → prêmios    escândalo recente afasta o júri do Gramofone
//  prêmios   → prêmios    júri tem favoritos (prêmios recentes do ato)
//  prêmios   → projetos / dinheiro    prêmio recente vende: apelo de lançamento e catálogo (vendas semanais)
//  prêmios   → fama / reputação       cada prêmio novo dá fama ao ato e reputação artística ao selo (uma vez)
//  imprensa  → reputação  escândalo de ato seu mancha o selo
//  reputação → fama       selo de prestígio puxa a fama dos seus atos (mensal, pequeno)
//  fama      → submundo   alvo famoso: crime contra o ato chama mais atenção (exposição)
//  mundo     → ao vivo    guerra/crise esvazia as casas (demanda na cidade)
//  ao vivo   → imprensa   série de shows de ato seu vira notícia (fato 'show')
//  reputação → sede       selo de prestígio atrai gente melhor: a equipe rende mais (habilidade efetiva ±4)
//  vida      → dinheiro   elenco muito estressado custa terapia/médico (mensal)
//  projetos  → fama       disco muito bom estreia com aclamação: um pouco de fama na estreia
import { l } from '../../data/world';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { freeCash20 } from '../oblig20';
import { lastScandal, REACT29 } from '../scandal17';
import { PRESSURE29, stressOf } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, playerActs, post, rememberListeners, staffAdjusters, staffSkill } from '../util';
import { monthlyCosts } from '../economy';
import { a3Of, crime17, ODDS17 } from './crime17';
import { GRAMO_ADJ } from './ceremonies8';

/** Botão de equilíbrio: fração do efeito (1 = o valor de desenho). */
export const CONN29 = { k: 1, off: new Set<string>(((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.CONN29_OFF ?? '').split(',').filter(Boolean)) };
const K = () => CONN29.k;
/** aresta ligada? (CONN29_OFF=a,b no ambiente desliga — só para medir equilíbrio) */
const on = (id: string) => !CONN29.off.has(id);

interface C29 { aw: number }
declare module '../ext4' { interface Ext4 { conn29: C29 } }
registerExt4('conn29', () => ({ aw: -1 }));
const st29 = (s: GameState): C29 => { const x = (s as unknown as { x4: { conn29?: C29 } }).x4; return (x.conn29 ??= { aw: -1 }); };

const mine = (a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const actOfP = (s: GameState, pid: string): Act | undefined => playerActs(s).map((id) => s.acts[id]).find((a) => a?.members.includes(pid));
const heatHome = (s: GameState) => crime17(s).heat[a3Of(s, s.config.homeCity)] ?? 0;
const recentAwards = (s: GameState, actId: string, years = 3) => (s.awards ?? []).filter((x) => x.actId === actId && s.year - x.year < years).length;

// ---------------------------------------------------------------- vida (pressões de curto prazo)
PRESSURE29.push((s: GameState, p: Person) => {
  const a = actOfP(s, p.id);
  if (!a || !on('caixa_vida')) return null;
  const fc = freeCash20(s);
  if (fc >= 0) {
    const m = monthlyCosts(s); const month = m.rent + m.salaries + m.outsourcing + m.loans + m.equipment;
    if (fc < month * 0.5) return { v: 3 * K(), why: l('selo no aperto (cachê pode atrasar)', 'label squeezed (fees may be late)') };
    return null;
  }
  return { v: 6 * K(), why: l('selo sem caixa: cachê atrasado', 'label out of cash: late fees') };
});
PRESSURE29.push((s, p) => {
  const a = actOfP(s, p.id);
  if (!a || !on('confianca')) return null;
  if (a.trust < 35) return { v: 5 * K(), why: l('desconfiança do selo', 'distrust of the label') };
  if (a.trust > 75) return { v: -3 * K(), why: l('confiança no selo', 'trust in the label') };
  return null;
});
PRESSURE29.push((s, p) => {
  const a = actOfP(s, p.id);
  if (!a || !on('submundo')) return null;
  const h = heatHome(s), tie = crime17(s).ties?.[a.id];
  const v = Math.min(8, h >= 25 ? h / 12 : 0) + (tie ? 3 : 0);
  return v ? { v: v * K(), why: l('polícia e gente perigosa por perto', 'police and dangerous people around') } : null;
});

// ---------------------------------------------------------------- imprensa (reação a escândalo)
REACT29.push((s, act) => {
  if (!mine(act) || !on('rep_imprensa')) return null;
  const k = 1 - Math.max(-0.12, Math.min(0.15, (s.player.reputation.institutional - 50) / 330)) * K();
  return { k, why: l('reputação institucional do selo: {x}', 'label\'s institutional reputation: {x}') };
});
REACT29.push((s, act) => {
  if (!mine(act) || !on('sede_imprensa')) return null;
  const sk = staffSkill(s, 'publicist');
  return sk > 0 ? { k: 1 - (sk / 600) * K(), why: l('assessoria de imprensa contorna: {x}', 'press office spins it: {x}') } : null;
});
REACT29.push((s) => {
  const h = heatHome(s);
  return h >= 20 && on('submundo') ? { k: 1 + Math.min(0.2, h / 500) * K(), why: l('polícia de olho: a manchete pega mais ({x})', 'police watching: the headline sticks ({x})') } : null;
});

// ---------------------------------------------------------------- contratos (confiança → estúdio e palco)
registerMod('songQ', 'trust29', (s, v, { act }) => {
  if (!mine(act) || !on('confianca')) return null;
  if (act.trust > 70) return { value: v * (1 + 0.02 * K()), label: l('Confiança no selo: entrega mais em estúdio', 'Trust in the label: gives more in the studio') };
  if (act.trust < 35) return { value: v * (1 - 0.04 * K()), label: l('Desconfiança do selo: grava no automático', 'Distrust of the label: records on autopilot') };
  return null;
});
registerMod('showRevenue', 'trust29', (s, v, { act }) => {
  if (!mine(act) || !on('confianca')) return null;
  if (act.trust > 70) return { value: v * (1 + 0.02 * K()), label: l('Confiança no selo: banda vende o show', 'Trust in the label: the band sells the show') };
  if (act.trust < 35) return { value: v * (1 - 0.04 * K()), label: l('Desconfiança do selo: show sem vontade', 'Distrust of the label: a half-hearted show') };
  return null;
});

// ---------------------------------------------------------------- submundo → contratos (proposta)
registerOfferMod('heat29', (s) => {
  const h = heatHome(s);
  if (h < 30 || !on('submundo')) return null;
  return { delta: -Math.min(0.08, h / 700) * K(), reason: l('Selo na mira da polícia: o artista hesita', 'Label under police scrutiny: the act hesitates') };
});

// ---------------------------------------------------------------- prêmios (júri do Gramofone)
GRAMO_ADJ.push((s, relId) => {
  const rel = s.releases[relId];
  const a = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !a || !on('premios')) return 0;
  let v = 0;
  if (rel.owner === 'player') { const r = s.player.reputation; v += ((r.institutional - 50) / 10 + (r.artistic - 50) / 15); } // reputação → prêmios
  const sc = lastScandal(s, a.id);
  if (sc && !sc.rebel && sc.eff >= 40 && s.week - sc.w < 52) v -= sc.eff / 8; // imprensa → prêmios
  v += Math.min(6, recentAwards(s, a.id) * 2); // favoritos do júri
  return v * K();
});

// ---------------------------------------------------------------- prêmios → projetos / dinheiro
registerMod('appeal', 'awards29a', (s, v, { release, act }) => {
  if (!on('premios')) return null;
  const id = release?.actId ?? act?.id;
  const n = id ? recentAwards(s, id) : 0;
  return n ? { value: v * (1 + Math.min(0.08, n * 0.02) * K()), label: l('Prêmio recente: mais gente quer ouvir', 'Recent award: more people want to listen') } : null;
});
registerMod('chartUnits', 'awards29c', (s, v, { release }) => {
  if (!release || !on('premios') || s.week - release.week < 26) return null; // catálogo (não o lançamento novo, que já ganhou no apelo)
  const n = recentAwards(s, release.actId, 2);
  return n ? { value: v * (1 + Math.min(0.15, n * 0.04) * K()), label: l('Catálogo puxado pelo prêmio', 'Catalog lifted by the award') } : null;
});

// ---------------------------------------------------------------- fama → submundo (exposição)
ODDS17.push((s, c, _cid, x) => {
  const a = s.acts[c.target];
  if (!a || a.fame < 25 || !on('fama_crime')) return;
  const d = Math.min(0.12, (a.fame - 25) / 500) * K();
  x.q += d;
  x.why.push(fmtL(l('Alvo famoso: mais olhos ({x})', 'Famous target: more eyes on it ({x})'), { x: `+${Math.round(d * 100)}%` }));
});

// ---------------------------------------------------------------- mundo → ao vivo
registerMod('cityDemand', 'geo29', (s, v) => {
  const g = s.flags.geoDemand ?? 1;
  if (g >= 0.98 || !on('crise')) return null;
  return { value: v * Math.max(0.6, 1 - (1 - g) * 0.45 * K()), label: l('Tempos de crise: menos gente sai de casa', 'Hard times: fewer people go out') };
});

// ---------------------------------------------------------------- ao vivo → imprensa
rememberListeners().push((s, e) => {
  if (e.kind !== 'gigs' || !e.actId || !mine(s.acts[e.actId]) || !on('shows_imprensa')) return;
  const a = s.acts[e.actId];
  emitFact(s, { kind: 'show', actors: [a.id], place: a.city, severity: Math.min(40, 10 + a.fame / 3), visibility: 'public', tags: ['live', 'conn29'], text: e.text, src: 'conn29' });
});

// ---------------------------------------------------------------- reputação → sede
staffAdjusters().push((s) => { if (!on('rep_sede')) return 0; const r = s.player.reputation; return Math.max(-4, Math.min(4, ((r.artistic + r.commercial + r.institutional) / 3 - 45) / 8)) * K(); });

// ---------------------------------------------------------------- projetos → fama (aclamação na estreia)
registerSimHook('launch', 'conn29', (s, _r, arg) => {
  const rel = arg.release, a = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !a || rel.reissueOf || rel.q < 55 || !on('aclamacao')) return;
  a.fame = Math.min(100, a.fame + Math.min(1.2, (rel.q - 55) / 20) * (1 - a.fame / 100) * K());
});

// ---------------------------------------------------------------- imprensa → reputação
onFact('scandal', (s, f) => {
  const a = f.actors.map((id) => s.acts[id]).find(Boolean);
  if (!mine(a) || f.severity < 20 || !on('escandalo_rep')) return;
  const r = s.player.reputation;
  r.institutional = Math.max(0, r.institutional - Math.min(4, f.severity / 30) * K());
  r.commercial = Math.max(0, r.commercial - Math.min(2, f.severity / 60) * K());
}, 'conn29:scandal-rep');

// ---------------------------------------------------------------- mensal: prêmios, reputação, submundo, vida
registerSimHook('newgame', 'conn29', (s) => { st29(s).aw = (s.awards ?? []).length; });
registerSimHook('month', 'conn29', (s: GameState) => {
  const st = st29(s), aw = s.awards ?? [];
  if (st.aw < 0) st.aw = aw.length; // saves antigos / início: só os prêmios daqui para frente
  if (on('premios')) for (let i = st.aw; i < aw.length; i++) {
    const x = aw[i], a = x.actId ? s.acts[x.actId] : undefined;
    if (a) a.fame = Math.min(100, a.fame + 0.8 * (1 - a.fame / 100) * K()); // prêmios → fama
    if (x.byPlayer) s.player.reputation.artistic = Math.min(100, s.player.reputation.artistic + 0.5 * K()); // prêmios → reputação
  }
  st.aw = aw.length;
  const r = s.player.reputation;
  if (on('rep_fama')) for (const id of playerActs(s)) { // reputação → fama
    const a = s.acts[id];
    if (a) a.fame = Math.max(0, Math.min(100, a.fame + Math.max(-0.15, Math.min(0.3, ((r.artistic + r.commercial) / 2 - 40) / 100)) * (1 - a.fame / 100) * K()));
  }
  const h = heatHome(s);
  if (h >= 30 && on('submundo')) { // submundo → reputação / dinheiro
    r.institutional = Math.max(0, r.institutional - Math.min(1.5, h / 60) * K());
    post(s, `conn29law:${s.year}:${s.month}`, -Math.round(money(s, h * 40) * K()), 'legal', 'Advogados (investigação policial)');
  }
  let n = 0; // vida → dinheiro
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) if (s.persons[pid]?.alive && stressOf(s, pid).short >= 22) n++;
  if (n && on('terapia')) post(s, `conn29med:${s.year}:${s.month}`, -Math.round(money(s, 700 * n) * K()), 'artist_dev', `Terapia e médico (${n} do elenco)`);
});
