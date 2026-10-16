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
//  vida      → dinheiro   elenco muito estressado custa terapia/médico (mensal, só com caixa livre, até 3 pessoas)
//  projetos  → fama       disco muito bom estreia com aclamação: um pouco de fama na estreia
import { l } from '../../data/world';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { registerContractHook } from '../contracts';
import { emitFact, onFact } from '../facts17';
import { freeCash20 } from '../oblig20';
import { lastScandal, REACT29 } from '../scandal17';
import { PRESSURE29, stressOf, type Px29 } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { inPlayerAct17 } from '../actidx17';
import { fmtL, money, playerActs, post, rememberListeners, staffAdjusters, staffSkill } from '../util';
import { monthlyCosts } from '../economy';
import { a3Of, crime17, ODDS17 } from './crime17';
import { GRAMO_ADJ } from './ceremonies8';

/** Botão de equilíbrio: fração do efeito (1 = o valor de desenho). */
export const CONN29 = { k: 1, off: new Set<string>(((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.CONN29_OFF ?? '').split(',').filter(Boolean)) };
const K = () => CONN29.k;
/** aresta ligada? (CONN29_OFF=a,b no ambiente desliga — só para medir equilíbrio) */
const on = (id: string) => !CONN29.off.has(id);

interface C29 { aw: number; /** contratos → imprensa: última semana em que a briga com o selo virou nota, por ato */ dp?: Record<string, number> }
declare module '../ext4' { interface Ext4 { conn29: C29 } }
registerExt4('conn29', () => ({ aw: -1 }));
const st29 = (s: GameState): C29 => { const x = (s as unknown as { x4: { conn29?: C29 } }).x4; return (x.conn29 ??= { aw: -1 }); };

const mine = (a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const actOfP = (s: GameState, pid: string): Act | undefined => { if (!inPlayerAct17(s, pid)) return undefined; for (const id of playerActs(s)) { const a = s.acts[id]; if (a?.members.includes(pid)) return a; } return undefined; };
/** R29b (desempenho): o mesmo, guardado no rascunho da leitura de shortOf (as quatro pressões leem o mesmo ato). */
const actOfC = (s: GameState, p: Person, cx: Px29): Act | undefined => (cx.a !== undefined ? cx.a ?? undefined : (cx.a = actOfP(s, p.id) ?? null) ?? undefined);
const heatHome = (s: GameState) => crime17(s).heat[a3Of(s, s.config.homeCity)] ?? 0;
const recentAwards = (s: GameState, actId: string, years = 3) => (s.awards ?? []).filter((x) => x.actId === actId && s.year - x.year < years).length;

// ---------------------------------------------------------------- vida (pressões de curto prazo)
PRESSURE29.push((s: GameState, p: Person, cx: Px29) => {
  const a = actOfC(s, p, cx);
  if (!a || !on('caixa_vida')) return null;
  const fc = freeCash20(s);
  if (fc >= 0) {
    const m = monthlyCosts(s); const month = m.rent + m.salaries + m.outsourcing + m.loans + m.equipment;
    if (fc < month * 0.5) return { v: 3 * K(), why: l('selo no aperto (cachê pode atrasar)', 'label squeezed (fees may be late)') };
    return null;
  }
  return { v: 6 * K(), why: l('selo sem caixa: cachê atrasado', 'label out of cash: late fees') };
});
PRESSURE29.push((s, p, cx) => {
  const a = actOfC(s, p, cx);
  if (!a || !on('confianca')) return null;
  if (a.trust < 35) return { v: 5 * K(), why: l('desconfiança do selo', 'distrust of the label') };
  if (a.trust > 75) return { v: -3 * K(), why: l('confiança no selo', 'trust in the label') };
  return null;
});
PRESSURE29.push((s, p, cx) => {
  const a = actOfC(s, p, cx);
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
  if (!release || !on('premios') || s.week - release.week < 2) return null; // discos já na rua (o lançamento novo ganha no apelo)
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
  // imprensa → dinheiro: gestão de crise (assessoria extra, advogado, cancelamentos)
  if (on('escandalo_custo') && f.severity >= 30) post(s, `conn29crise:${f.id}`, -Math.round(money(s, f.severity * 30) * K()), 'marketing', 'Gestão de crise (escândalo)');
}, 'conn29:scandal-rep');

// ---------------------------------------------------------------- mensal: prêmios, reputação, submundo, vida
registerSimHook('newgame', 'conn29', (s) => { st29(s).aw = (s.awards ?? []).length; });
registerSimHook('month', 'conn29', (s: GameState) => {
  const st = st29(s), aw = s.awards ?? [];
  if (st.aw < 0) st.aw = aw.length; // saves antigos / início: só os prêmios daqui para frente
  let nRep = 0, nNews = 0;
  if (on('premios')) for (let i = st.aw; i < aw.length; i++) {
    const x = aw[i], a = x.actId ? s.acts[x.actId] : undefined;
    if (a) a.fame = Math.min(100, a.fame + 0.8 * (1 - a.fame / 100) * K()); // prêmios → fama
    // prêmios → imprensa: o prêmio do seu ato vira nota (uma por mês; o barramento junta com a nota da cerimônia da mesma semana)
    if (a && mine(a) && on('premios_imprensa') && nNews++ < 1) emitFact(s, { kind: 'award', actors: [a.id], severity: 30, visibility: 'public', tags: ['good', 'conn29'], src: 'conn29', place: a.city,
      text: fmtL(l('{a} leva {n} — e a imprensa repercute', '{a} wins {n} — and the press picks it up'), { a: a.name, n: x.name }) });
    if (x.byPlayer && nRep++ < 3) s.player.reputation.artistic = Math.min(100, s.player.reputation.artistic + 1 * K()); // prêmios → reputação (até 3 por mês)
  }
  st.aw = aw.length;
  const r = s.player.reputation;
  if (on('rep_fama')) for (const id of playerActs(s)) { // reputação → fama
    const a = s.acts[id];
    if (a) a.fame = Math.max(0, Math.min(100, a.fame + Math.max(-0.15, Math.min(0.3, ((r.artistic + r.commercial) / 2 - 40) / 100)) * (1 - a.fame / 100) * K()));
  }
  const h = heatHome(s);
  if (h >= 30 && on('submundo')) { // submundo → reputação / dinheiro
    r.institutional = Math.max(0, r.institutional - Math.min(1.5, h / 60) * K()); // sem piso: o calor não depende da reputação (não há ciclo)
    post(s, `conn29law:${s.year}:${s.month}`, -Math.round(money(s, h * 20) * K()), 'legal', 'Advogados (investigação policial)');
  }
  // vida → dinheiro: terapia/médico para quem está muito estressado. Sem ciclo: só com caixa livre (selo quebrado não
  // paga — senão "sem caixa → estresse → terapia → menos caixa" virava espiral), no máximo 3 pessoas, US$ 300 cada.
  let n = 0;
  if (on('terapia') && freeCash20(s) > 0) for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) if (s.persons[pid]?.alive && stressOf(s, pid).short >= 26) n++;
  n = Math.min(3, n);
  if (n) post(s, `conn29med:${s.year}:${s.month}`, -Math.round(money(s, 300 * n) * K()), 'artist_dev', `Terapia e médico (${n} do elenco)`);
});

// ================================================================ grupo 2 (o resto que deve existir)
//  dinheiro  → reputação   cachê atrasado (selo sem caixa livre) mancha a reputação comercial e com artistas (mensal)
//  imprensa  → submundo    escândalo de drogas/crime/violência de ato seu atrai a polícia (calor)
//  imprensa  → contratos   escândalo recente de ato seu afasta artistas que você quer contratar (proposta)
//  projetos  → ao vivo     disco bom recente puxa ingresso (demanda na cidade)
//  projetos  → contratos   disco bom lançado pelo selo: o ato confia mais (na estreia)
//  projetos  → vida        crítica ruim estressa, disco muito bom alivia (na estreia)
//  ao vivo   → contratos / reputação   série de shows de ato seu: confiança do ato e reputação comercial do selo
//  ao vivo   → submundo    ato na estrada é presa fácil de pirataria e sabotagem (chance)
//  sede      → fama        assessor de imprensa puxa a fama dos seus atos (mensal)
//  sede      → prêmios     assessor monta a campanha do Gramofone (pontos do júri)
//  sede      → submundo    jurídico reduz a exposição de um crime
//  vida      → contratos   elenco muito estressado perde a confiança no selo (mensal)
//  vida      → prêmios     banda em crise rende menos na noite do Gramofone
//  vida      → submundo    gente nervosa fala demais: exposição maior nos crimes com o ato
//  contratos → reputação   ato que desconfia do selo fala mal: reputação com artistas cai (mensal)
//  prêmios   → ao vivo     prêmio recente enche casa (demanda na cidade)
/** piso das quedas mensais de reputação vindas destas arestas */
const PISO29 = 35;
const avgStress = (s: GameState, a: Act) => { const ms = a.members.filter((id) => s.persons[id]?.alive); return ms.length ? ms.reduce((t, id) => t + stressOf(s, id).short, 0) / ms.length : 0; };
const recentGood = (s: GameState, a: Act) => a.releases.map((id) => s.releases[id]).filter((r) => r && s.week - r.week <= 12 && !r.reissueOf).reduce((m, r) => Math.max(m, r!.q), 0);

onFact('scandal', (s, f) => {
  const a = f.actors.map((id) => s.acts[id]).find(Boolean);
  if (!mine(a) || !on('escandalo_policia') || f.severity < 30) return;
  if (!f.tags.some((t) => t === 'drugs' || t === 'crime' || t === 'violence')) return;
  const k = a3Of(s, a.city);
  crime17(s).heat[k] = Math.min(100, (crime17(s).heat[k] ?? 0) + Math.min(12, f.severity / 8) * K());
}, 'conn29:scandal-heat');

registerOfferMod('scandal29', (s) => {
  if (!on('escandalo_contratos')) return null;
  const worst = playerActs(s).map((id) => lastScandal(s, id)).filter((x) => x && s.week - x.w <= 26).reduce((m, x) => Math.max(m, x!.rebel ? x!.eff / 2 : x!.eff), 0);
  return worst >= 30 ? { delta: -Math.min(0.06, worst / 1500) * K(), reason: l('Escândalo recente no seu elenco: o artista hesita', 'Recent scandal in your roster: the act hesitates') } : null;
});

registerMod('cityDemand', 'proj29', (s, v, { act }) => {
  if (!act || !on('disco_shows')) return null;
  const q = recentGood(s, act);
  return q >= 60 ? { value: v * (1 + Math.min(0.15, (q - 60) / 200) * K()), label: l('Disco novo elogiado puxa ingresso', 'Acclaimed new record sells tickets') } : null;
});
registerMod('cityDemand', 'awards29', (s, v, { act }) => {
  const n = act && on('premios') ? recentAwards(s, act.id, 2) : 0;
  return n ? { value: v * (1 + Math.min(0.12, n * 0.03) * K()), label: l('Prêmio recente enche a casa', 'Recent award fills the venue') } : null;
});

registerSimHook('launch', 'conn29b', (s, _r, arg) => {
  const rel = arg.release, a = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !mine(a) || rel.reissueOf) return;
  if (on('disco_confianca') && rel.q >= 60) a.trust = Math.min(100, a.trust + Math.min(4, (rel.q - 55) / 5) * K());
  if (on('disco_vida')) for (const pid of a.members) {
    const p = s.persons[pid];
    if (!p?.alive) continue;
    if (rel.q < 45) p.stress = Math.min(100, p.stress + 4 * K());
    else if (rel.q >= 65) p.stress = Math.max(0, p.stress - 4 * K());
  }
});

rememberListeners().push((s, e) => {
  if (e.kind !== 'gigs' || !e.actId || !mine(s.acts[e.actId]) || !on('shows_contratos')) return;
  const a = s.acts[e.actId];
  a.trust = Math.min(100, a.trust + 1 * K());
  s.player.reputation.commercial = Math.min(100, s.player.reputation.commercial + 0.6 * K());
});

ODDS17.push((s, c, cid, x) => {
  const a = s.acts[c.target];
  if (!a) return;
  if (on('shows_crime') && (cid === 'bootleg' || cid === 'sabotage') && (a.gigSat ?? 0) >= 4) { const d = Math.min(0.1, (a.gigSat ?? 0) / 60) * K(); x.p += d; x.why.push(fmtL(l('Ato na estrada: alvo fácil ({x})', 'Act on the road: easy target ({x})'), { x: `+${Math.round(d * 100)}%` })); }
  if (on('disco_crime') && cid === 'bootleg' && recentGood(s, a) >= 60) { const d = Math.min(0.08, (recentGood(s, a) - 55) / 250) * K(); x.p += d; x.why.push(fmtL(l('Disco de sucesso: pirataria vende fácil ({x})', 'Hit record: bootlegs sell easily ({x})'), { x: `+${Math.round(d * 100)}%` })); }
  if (on('sede_crime') && c.actor === 'player') { const lg = staffSkill(s, 'legal'); if (lg > 0) { const d = (lg / 1000) * K(); x.q -= d; x.why.push(fmtL(l('Jurídico do selo prepara a defesa ({x})', 'Label lawyers prepare the defence ({x})'), { x: `−${Math.round(d * 100)}%` })); } }
  if (on('vida_crime') && mine(a)) { const st = avgStress(s, a); if (st >= 15) { const d = Math.min(0.08, st / 400) * K(); x.q += d; x.why.push(fmtL(l('Elenco nervoso fala demais ({x})', 'A nervous band talks too much ({x})'), { x: `+${Math.round(d * 100)}%` })); } }
});

GRAMO_ADJ.push((s, relId) => {
  const rel = s.releases[relId], a = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !a) return 0;
  let v = 0;
  if (rel.owner === 'player' && on('sede_premios')) v += staffSkill(s, 'publicist') / 20;
  if (mine(a) && on('vida_premios')) { const st = avgStress(s, a); if (st >= 22) v -= Math.min(5, (st - 20) / 3); }
  return v * K();
});

registerSimHook('month', 'conn29b', (s: GameState) => {
  const r = s.player.reputation;
  // sem espiral: essas quedas mensais nunca levam a reputação abaixo de PISO29 (reputação com artistas pesa nas propostas)
  const down = (v: number, d: number) => (v > PISO29 ? Math.max(PISO29, v - d * K()) : v);
  if (on('caixa_rep') && freeCash20(s) < 0) r.commercial = down(r.commercial, 0.5);
  const pub = staffSkill(s, 'publicist');
  if (on('sede_rep') && pub > 0) r.commercial = Math.min(100, r.commercial + (pub / 300) * K()); // sede → reputação
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a) continue;
    if (on('sede_fama') && pub > 0) a.fame = Math.min(100, a.fame + (pub / 150) * (1 - a.fame / 100) * K());
    if (on('vida_fama') && avgStress(s, a) >= 22) a.momentum = Math.max(0, a.momentum - 3 * K()); // vida → fama: banda esgotada perde embalo
    if (on('vida_rep') && avgStress(s, a) >= 26) r.artists = down(r.artists, 0.3); // vida → reputação: "selo que esgota artistas"
    if (on('vida_contratos') && avgStress(s, a) >= 22) a.trust = Math.max(0, a.trust - 1.5 * K());
    if (on('contratos_rep') && a.trust < 30) r.artists = down(r.artists, 0.4);
    // contratos → imprensa: briga com o selo vaza (uma nota a cada 3 meses, no máximo, por ato)
    if (on('contratos_imprensa') && a.trust < 30 && a.fame >= 10) {
      const dp = (st29(s).dp ??= {});
      if (s.week - (dp[a.id] ?? -99) >= 12) {
        dp[a.id] = s.week;
        emitFact(s, { kind: 'statement', actors: [a.id], severity: Math.round(Math.min(40, 10 + (30 - a.trust)) * K()), visibility: 'public', tags: ['contract', 'conn29'], src: 'conn29',
          text: fmtL(l('{a} reclama do selo em entrevista: "ninguém nos ouve"', '{a} complains about the label in an interview: "nobody listens to us"'), { a: a.name }) });
      }
    }
  }
});

// ================================================================ grupo 3
//  vida → contratos       banda esgotada quer pausa: renova menos (gancho de renovação — a previsão usa o mesmo)
//  projetos → contratos   disco bom recente lançado pelo selo: renova mais
//  reputação → ao vivo    promotores e casas preferem selo de nome (demanda na cidade)
//  reputação → vida       artista em selo respeitado fica tranquilo; em selo mal falado, preocupado
registerContractHook('conn29', { renew: (s, act) => {
  let v = 0;
  if (on('vida_contratos') && avgStress(s, act) >= 22) v -= 0.06 * K();
  if (on('disco_confianca') && recentGood(s, act) >= 60) v += 0.04 * K();
  return v;
} });
registerMod('cityDemand', 'rep29', (s, v, { act }) => {
  if (!mine(act) || !on('rep_shows')) return null;
  const k = Math.max(-0.06, Math.min(0.1, (s.player.reputation.commercial - 40) / 400)) * K();
  return Math.abs(k) > 0.005 ? { value: v * (1 + k), label: l('Nome do selo pesa com promotores', 'The label\'s name carries weight with promoters') } : null;
});
PRESSURE29.push((s, p, cx) => {
  if (!actOfC(s, p, cx) || !on('rep_vida')) return null;
  const r = s.player.reputation.artists;
  return r > 60 ? { v: -2 * K(), why: l('selo respeitado pelos artistas', 'label respected by artists') } : r < 25 ? { v: 2 * K(), why: l('selo mal falado entre artistas', 'label badly spoken of by artists') } : null;
});
