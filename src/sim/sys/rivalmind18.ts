// Rodada 18 (world18, feedback 13) — RIVAIS QUE APRENDEM. Cada selo rival guarda memória estratégica e muda de
// comportamento pelo que viveu — e deixa SINAIS que o jogador pode ler antes do golpe (boatos no noticiário, linhas no
// relatório de mercado, aba "Estratégia observada" na página do selo e dicas do conselheiro):
//  • percebe a sua dependência (um artista com ≥45% da receita ou um gênero com ≥60%) e mira nela: corteja o artista
//    (confiança cai, tentativa de aliciamento perto do fim do contrato) ou inunda o gênero de contratações;
//    renovar cedo, subir a confiança ou diversificar faz o rival desistir;
//  • perdeu 3 leilões para você em 2 anos → muda para "desenvolver talento": corteja estreantes de potencial alto;
//  • abandona gêneros que só dão prejuízo (2+ lançamentos sem paradas) e libera artistas — oportunidade sua;
//  • mantém parcerias de negócio com você mesmo depois de disputas ("negócios são negócios"), até a 4ª briga;
//  • erra: expansão exagerada (escritórios caros), contratação ruim (paga caro por quem está caindo) e quebra.
// A intenção nunca aparece pronta: o jogador vê indícios (com atraso e ruído) e antecipa.
// Gerador próprio por mês (semente), sem tocar no RNG do jogo.

import { Rng, clamp } from '../../core/rng';
import { FAMILIES, familyOf, l, type L } from '../../data/world';
import { endContract, expectedAdvance, signWithRival } from '../contracts';
import { emitEvent } from '../events';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type AdvTip18 } from '../inbox18';
import type { Act, GameState, Label } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { leaders } from './leaders10';
import { playbookOf } from './rivals8';
import { rivals12 } from './rivals12';
import { courtNewcomer18 } from './world18';

export type Sign18K = 'target' | 'court' | 'flood' | 'giveup' | 'develop' | 'abandon' | 'pact' | 'dispute' | 'overexp' | 'badsign' | 'trouble' | 'bankrupt' | 'bid';
export interface Sign18 { w: number; k: Sign18K; t: L }
export interface Mind18 {
  lost: number[]; won: number[];
  target?: { k: 'fam' | 'act'; id: string; since: number; until: number; why: L };
  dev?: number;
  drop: Record<string, number>;
  pact?: { since: number; until: number; disputes: number; riv: number };
  over?: number;
  signs: Sign18[];
}
export interface RM18 { m: Record<string, Mind18>; bids: Record<string, string>; au: Record<string, 1>; offered?: number }
declare module '../ext4' { interface Ext4 { rivalmind18: RM18 } }
const fresh = (): RM18 => ({ m: {}, bids: {}, au: {} });
registerExt4('rivalmind18', fresh);
export function rm18(s: GameState): RM18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.rivalmind18 ??= fresh()) as RM18;
  st.m ??= {}; st.bids ??= {}; st.au ??= {};
  return st;
}
export function mind18(s: GameState, lbId: string): Mind18 {
  const st = rm18(s);
  const m = (st.m[lbId] ??= { lost: [], won: [], drop: {}, signs: [] });
  m.lost ??= []; m.won ??= []; m.drop ??= {}; m.signs ??= [];
  return m;
}

const famName = (f: string): L => FAMILIES.find((x) => x.id === f)?.name ?? l(f, f);
const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging');
const riskOf = (s: GameState, lb: Label): number => (lb.leaderId ? leaders(s)?.L[lb.leaderId]?.risk ?? 50 : 50) / 50;
const HUNTERS = new Set(['vulture', 'copycat', 'agitator', 'conglomerate', 'viral', 'idol', 'scene']);

/** Registra um sinal observável (relatório de mercado, boato no noticiário quando relevante). */
function sign(s: GameState, lb: Label, k: Sign18K, t: L, o: { rumor?: boolean; public?: boolean; actors?: string[]; sev?: number } = {}): void {
  const m = mind18(s, lb.id);
  m.signs.unshift({ w: s.week, k, t });
  if (m.signs.length > 14) m.signs.length = 14;
  if (s.rivalReport) {
    s.rivalReport.items.push({ labelId: lb.id, text: t });
    if (s.rivalReport.items.length > 20) s.rivalReport.items.splice(0, s.rivalReport.items.length - 20);
  }
  if (o.rumor || o.public) emitFact(s, { kind: o.public ? 'rival_move' : 'rumor', actors: [lb.id, ...(o.actors ?? [])], place: lb.city, severity: o.sev ?? 30, visibility: o.public ? 'public' : 'rumor', tags: ['rival', 'rivalmind18', k], text: fmtL(l('{b}: {t}', '{b}: {t}'), { b: lb.name, t }), src: 'rivalmind18' });
}

// ---------------------------------------------------------------- dependência do jogador

export interface Dep18 { act?: { id: string; share: number }; fam?: { id: string; share: number }; total: number }
/** Concentração da sua receita de discos (lançamentos dos últimos 2 anos). */
export function dependence18(s: GameState): Dep18 {
  const byAct = new Map<string, number>();
  const byFam = new Map<string, number>();
  let total = 0;
  const mine = new Set(playerActs(s));
  for (const id of mine) {
    const a = s.acts[id];
    if (!a) continue;
    for (const rid of a.releases) {
      const r = s.releases[rid];
      if (!r || r.hist || s.week - r.week > 104 || r.revenue <= 0) continue;
      total += r.revenue;
      byAct.set(a.id, (byAct.get(a.id) ?? 0) + r.revenue);
      const f = familyOf(a.genre);
      byFam.set(f, (byFam.get(f) ?? 0) + r.revenue);
    }
  }
  if (!total) return { total: 0 };
  const ta = [...byAct].sort((x, y) => y[1] - x[1])[0];
  const tf = [...byFam].sort((x, y) => y[1] - x[1])[0];
  return { total, act: ta && { id: ta[0], share: ta[1] / total }, fam: tf && { id: tf[0], share: tf[1] / total } };
}

function hunt(s: GameState, r: Rng): void {
  if (s.config.role === 'artist' || s.month % 3 !== 1) return;
  const labels = Object.values(s.labels).filter((x) => x.active);
  const hunting = labels.filter((x) => (mind18(s, x.id).target?.until ?? 0) > s.week);
  const dep = dependence18(s);
  // desistências: a dependência caiu ou você blindou o artista
  for (const lb of hunting) {
    const m = mind18(s, lb.id);
    const t = m.target!;
    let stop: L | null = null;
    if (t.k === 'act') {
      const a = s.acts[t.id];
      const c = a?.contractId ? s.contracts[a.contractId] : undefined;
      if (!a || a.owner !== 'player') stop = l('o alvo saiu do seu selo', 'the target left your label');
      else if (c && c.endWeek - s.week > 150 && a.trust >= 70) stop = fmtL(l('{a} está blindado(a): contrato longo e confiança alta', '{a} is shielded: long contract and high trust'), { a: a.name });
      else if ((dep.act?.id !== t.id || dep.act.share < 0.3)) stop = l('você deixou de depender de um só artista', 'you no longer depend on one act');
    } else if (dep.fam?.id !== t.id || dep.fam.share < 0.45) stop = fmtL(l('você diversificou além de {f}', 'you diversified beyond {f}'), { f: famName(t.id) });
    if (stop) { m.target = undefined; sign(s, lb, 'giveup', fmtL(l('parou de mirar no seu ponto fraco: {w}.', 'stopped going after your weak spot: {w}.'), { w: stop })); }
  }
  if (hunting.length >= 1 || dep.total < money(s, 150000) || s.year - s.config.startYear < 2) return; // carência: selo novo ainda não chama atenção
  let tg: { k: 'fam' | 'act'; id: string; why: L } | null = null;
  if (dep.act && dep.act.share >= 0.45 && s.acts[dep.act.id] && !s.acts[dep.act.id].playerBand) tg = { k: 'act', id: dep.act.id, why: fmtL(l('{a} responde por {p}% da sua receita de discos', '{a} is {p}% of your record revenue'), { a: s.acts[dep.act.id].name, p: Math.round(dep.act.share * 100) }) };
  else if (dep.fam && dep.fam.share >= 0.6) tg = { k: 'fam', id: dep.fam.id, why: fmtL(l('{f} responde por {p}% da sua receita de discos', '{f} is {p}% of your record revenue'), { f: famName(dep.fam.id), p: Math.round(dep.fam.share * 100) }) };
  if (!tg || hunting.some((x) => mind18(s, x.id).target?.id === tg!.id)) return;
  const pool = labels.filter((x) => x.cash > money(s, 300000) && !(mind18(s, x.id).target) && !mind18(s, x.id).pact);
  const sc = (x: Label) => x.aggression + (HUNTERS.has(playbookOf(x)) ? 0.35 : 0) + (s.rivalries[x.id] ?? 0) / 100 + (tg!.k === 'fam' && x.focus.includes(tg!.id as never) ? 0.3 : 0);
  const lb = pool.sort((x, y) => sc(y) - sc(x))[0];
  if (!lb || !r.chance(clamp(sc(lb) * 0.5, 0.1, 0.7))) return;
  const m = mind18(s, lb.id);
  m.target = { ...tg, since: s.week, until: s.week + r.int(70, 130) };
  if (tg.k === 'fam' && !lb.focus.includes(tg.id as never)) lb.focus.push(tg.id as never);
  // o sinal sai com ruído: boato, não confissão
  const t = tg.k === 'act' ? fmtL(l('executivos foram vistos em shows de {a} e perguntando quando vence o contrato.', 'executives were seen at {a} shows asking when the contract ends.'), { a: s.acts[tg.id].name })
    : fmtL(l('anda contratando A&Rs de {f} e marcando reuniões com artistas do gênero.', 'is hiring {f} A&Rs and meeting artists in the genre.'), { f: famName(tg.id) });
  sign(s, lb, 'target', t, { rumor: true, actors: tg.k === 'act' ? [tg.id] : [], sev: 35 });
}

function pressTargets(s: GameState, r: Rng): void {
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    const m = mind18(s, lb.id);
    const t = m.target;
    if (!t || t.until <= s.week) continue;
    if (t.k === 'act') {
      const a = s.acts[t.id];
      if (!a || a.owner !== 'player') continue;
      const c = a.contractId ? s.contracts[a.contractId] : undefined;
      const near = !!c && c.endWeek - s.week < 52;
      if ((near || a.trust < 50) && r.chance(0.18) && !s.decisions.some((d) => d.eventId === 'poach_attempt')) {
        emitEvent(s, r, 'poach_attempt', { act: a.id, label: lb.id });
        sign(s, lb, 'court', fmtL(l('fez proposta direta a {a}.', 'made a direct offer to {a}.'), { a: a.name }), { public: true, actors: [a.id], sev: 40 });
      } else if (r.chance(0.2) && a.trust > 40) {
        a.trust = Math.max(40, a.trust - 1);
        if (r.chance(0.4)) sign(s, lb, 'court', fmtL(l('jantou com gente próxima de {a} (confiança dele(a) em você −1).', 'had dinner with people close to {a} (their trust in you −1).'), { a: a.name }));
      }
    } else if (r.chance(0.22)) {
      const free = Object.values(s.acts).filter((a) => live(a) && !a.owner && familyOf(a.genre) === t.id && a.fame >= 3).sort((x, y) => y.fame - x.fame)[0];
      if (free) { courtNewcomer18(s, free, lb.id); sign(s, lb, 'flood', fmtL(l('cortejou mais um artista de {f}: {a}.', 'courted yet another {f} act: {a}.'), { f: famName(t.id), a: free.name })); }
    }
  }
}

// ---------------------------------------------------------------- leilões: quem perde muda de jogo

function bids(s: GameState): void {
  const st = rm18(s);
  const cur = rivals12(s).bids;
  for (const [aid, lbId] of Object.entries(st.bids)) {
    if (cur[aid]) continue;
    const a = s.acts[aid];
    const lb = s.labels[lbId];
    if (!a || !lb) continue;
    if (a.owner === 'player') { mind18(s, lbId).lost.push(s.week); sign(s, lb, 'bid', fmtL(l('perdeu {a} para você num leilão.', 'lost {a} to you in a bidding war.'), { a: a.name })); }
    else if (a.owner === lbId) mind18(s, lbId).won.push(s.week);
  }
  st.bids = Object.fromEntries(Object.entries(cur).map(([k, b]) => [k, b.lb]));
  for (const au of s.auctions ?? []) {
    if (au.status !== 'won' || st.au[au.id]) continue;
    st.au[au.id] = 1;
    for (const p of new Set(au.bids.map((b) => b.party))) if (p !== 'player' && s.labels[p]) { mind18(s, p).lost.push(s.week); sign(s, s.labels[p], 'bid', fmtL(l('perdeu {a} para você num leilão.', 'lost {a} to you in a bidding war.'), { a: s.acts[au.actId]?.name ?? '?' })); }
  }
}

function develop(s: GameState, r: Rng): void {
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    const m = mind18(s, lb.id);
    m.lost = m.lost.filter((w) => s.week - w <= 104);
    m.won = m.won.filter((w) => s.week - w <= 104);
    if (!m.dev && m.lost.length >= 3) {
      m.dev = s.week + 104;
      lb.strategy = 'develop';
      lb.lastDecision = l('cansou de perder leilões: vai formar talento próprio', 'tired of losing bidding wars: will develop its own talent');
      sign(s, lb, 'develop', fmtL(l('perdeu {n} leilões para você em 2 anos e mudou de jogo: agora garimpa estreantes de potencial e os desenvolve.', 'lost {n} bidding wars to you in 2 years and changed tack: now digs up high-potential newcomers to develop.'), { n: m.lost.length }), { rumor: true, sev: 30 });
    }
    if (m.dev && m.dev <= s.week) { m.dev = undefined; m.lost = []; }
    if (m.dev && r.chance(0.12)) {
      const a = Object.values(s.acts).filter((x) => live(x) && !x.owner && x.fame < 12 && x.potential >= 66 && s.year - x.debutYear <= 2 && !rm18(s).bids[x.id]).sort((x, y) => y.potential - x.potential)[r.int(0, 2)];
      if (a) { courtNewcomer18(s, a, lb.id); if (r.chance(0.5)) sign(s, lb, 'develop', fmtL(l('levou o estreante {a} para a sala de ensaio do selo.', 'took newcomer {a} into the label\'s rehearsal room.'), { a: a.name })); }
    }
  }
}

// ---------------------------------------------------------------- abandona mercados ruins (anual)

function abandon(s: GameState): void {
  if (s.month !== 1) return;
  const by = new Map<string, GameState['releases'][string][]>();
  for (const x of Object.values(s.releases)) if (!x.hist && x.owner !== 'player' && s.week - x.week <= 104 && s.week - x.week > 8) { const a = by.get(x.owner) ?? []; a.push(x); by.set(x.owner, a); }
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || lb.focus.length < 2) continue;
    const m = mind18(s, lb.id);
    const rel = by.get(lb.id) ?? [];
    for (const f of [...lb.focus]) {
      if (lb.focus.length < 2) break;
      const mine = rel.filter((x) => s.acts[x.actId] && familyOf(s.acts[x.actId].genre) === f);
      if (mine.length < 2 || mine.some((x) => x.weeksOnChart > 0 && x.peak > 0 && x.peak <= 40)) continue;
      lb.focus = lb.focus.filter((x) => x !== f);
      m.drop[f] = s.year;
      const freed: string[] = [];
      for (const id of [...lb.roster]) {
        const a = s.acts[id];
        if (!a || familyOf(a.genre) !== f || a.fame >= 30 || freed.length >= 2) continue;
        endContract(s, a, 'terminated');
        freed.push(a.name);
      }
      sign(s, lb, 'abandon', fmtL(l('desistiu de {f}: {n} lançamentos sem chegar ao top 40 em 2 anos{x}.', 'gave up on {f}: {n} releases without reaching the top 40 in 2 years{x}.'), { f: famName(f), n: mine.length, x: freed.length ? fmtL(l(' — dispensou {a}, agora livres', ' — dropped {a}, now free agents'), { a: freed.join(', ') }) : '' }), { public: true, sev: 30 });
    }
  }
}

// ---------------------------------------------------------------- parceria apesar das disputas

function pacts(s: GameState, r: Rng): void {
  if (s.config.role === 'artist') return;
  const st = rm18(s);
  for (const lb of Object.values(s.labels)) {
    const m = mind18(s, lb.id);
    const p = m.pact;
    if (!p) continue;
    if (!lb.active || p.until <= s.week) { m.pact = undefined; sign(s, lb, 'pact', l('a parceria de distribuição com você chegou ao fim.', 'the distribution pact with you came to an end.')); continue; }
    const riv = s.rivalries[lb.id] ?? 0;
    if (riv >= p.riv + 8) {
      p.disputes += 1;
      p.riv = riv;
      if (p.disputes >= 4) { m.pact = undefined; sign(s, lb, 'dispute', l('rompeu a parceria depois da quarta briga com você.', 'broke off the pact after the fourth fight with you.'), { public: true, sev: 35 }); continue; }
      sign(s, lb, 'dispute', fmtL(l('brigou com você de novo ({n}ª disputa), mas manteve a parceria: negócios são negócios.', 'fought with you again (dispute #{n}) but kept the pact: business is business.'), { n: p.disputes }));
    } else p.riv = Math.min(p.riv, riv);
    post(s, `rm18pact:${lb.id}:${s.year}:${s.month}`, -money(s, 1800), 'distribution', `Parceria de distribuição (${lb.name})`);
  }
  // proposta: selo com quem você já brigou, mas que tem interesse comum (mercados que você não cobre)
  if ((st.offered ?? -999) > s.week - 52 || !r.chance(0.08)) return;
  const myT = new Set(s.player.territories);
  const cand = Object.values(s.labels).filter((x) => x.active && !mind18(s, x.id).pact && !mind18(s, x.id).target && (s.rivalries[x.id] ?? 0) >= 10 && x.territories.some((t) => !myT.has(t)))
    .sort((x, y) => (s.rivalries[x.id] ?? 0) - (s.rivalries[y.id] ?? 0))[0];
  if (!cand || !playerActs(s).length) return;
  st.offered = s.week;
  const ts = cand.territories.filter((t) => !myT.has(t));
  pushInbox18(s, 'rivalmind18_pact', { from: cand.name, ref: { lb: cand.id }, tone: 'info',
    subject: fmtL(l('{b} propõe uma parceria de distribuição', '{b} proposes a distribution pact'), { b: cand.name }),
    body: fmtL(l('"Já brigamos, e vamos brigar de novo. Mas nos mercados onde você não está ({t}) a nossa rede trabalha seus discos." Por 3 anos: +5% de apelo nos seus lançamentos que chegam lá, por uma taxa mensal pequena. Eles continuam rivais em contratações.', '"We have fought and we will fight again. But in the markets where you are not ({t}) our network can work your records." For 3 years: +5% appeal on your releases that reach there, for a small monthly fee. They remain rivals for signings.'), { t: ts.join(', ').toUpperCase() }),
    actions: [{ id: 'yes', label: l('Fechar a parceria', 'Sign the pact') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 8 });
}
registerInboxKind('rivalmind18_pact', {
  label: l('Parceria', 'Partnership'), cat: 'deals', icon: 'handshake', prio: 1,
  goto: () => ({ area: 'labels', label: l('Ver selos', 'See labels') }),
  handle: (s, m, action) => {
    const lb = s.labels[String(m.ref?.lb ?? '')];
    if (action !== 'yes' || !lb?.active) return l('Você recusou a parceria.', 'You declined the pact.');
    mind18(s, lb.id).pact = { since: s.week, until: s.week + 156, disputes: 0, riv: s.rivalries[lb.id] ?? 0 };
    sign(s, lb, 'pact', l('fechou parceria de distribuição com você (apesar das brigas).', 'signed a distribution pact with you (despite the fights).'), { public: true, sev: 25 });
    return fmtL(l('Parceria com {b} por 3 anos.', 'Pact with {b} for 3 years.'), { b: lb.name });
  },
});
registerMod('appeal', 'rivalmind18:pact', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel || rel.owner !== 'player') return null;
  const st = rm18(s);
  for (const [id, m] of Object.entries(st.m)) {
    const lb = s.labels[id];
    if (!m.pact || m.pact.until <= s.week || !lb?.active) continue;
    if (!rel.territories.some((t) => lb.territories.includes(t) && !s.player.territories.includes(t))) continue;
    return { value: value * 1.05, label: fmtL(l('Parceria de distribuição com {b}', 'Distribution pact with {b}'), { b: lb.name }) };
  }
  return null;
});

// ---------------------------------------------------------------- erros financeiros

function mistakes(s: GameState, r: Rng): void {
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    const m = mind18(s, lb.id);
    const risk = riskOf(s, lb);
    if (m.over && m.over > s.week) lb.cash -= money(s, (lb.family === 'A' ? 40000 : 15000));
    else if (m.over) m.over = undefined;
    if (!m.over && lb.cash > money(s, 2_500_000) && lb.territories.length < 6 && r.chance(0.004 * risk)) {
      const add = (['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'] as const).filter((t) => !lb.territories.includes(t)).slice(0, 2);
      lb.territories.push(...add);
      m.over = s.week + 78;
      sign(s, lb, 'overexp', fmtL(l('abriu escritórios em {t} de uma vez — folha e aluguel pesados.', 'opened offices in {t} all at once — heavy payroll and rent.'), { t: add.join(', ').toUpperCase() }), { public: true, sev: 25 });
    }
    if (lb.cash > money(s, 800000) && r.chance(0.004 * risk)) {
      const a = Object.values(s.acts).filter((x) => live(x) && !x.owner && x.fame >= 30 && x.momentum < 30).sort((x, y) => y.fame - x.fame)[0];
      if (a) {
        signWithRival(s, a, lb.id, r, true);
        lb.cash -= money(s, expectedAdvance(s, a) * 1.5);
        sign(s, lb, 'badsign', fmtL(l('pagou caro por {a}, que está em queda.', 'paid top dollar for {a}, who is in decline.'), { a: a.name }), { public: true, actors: [a.id], sev: 25 });
      }
    }
    if (lb.cash < 0 && (m.over || m.signs.some((x) => x.k === 'badsign' && s.week - x.w < 104)) && !m.signs.some((x) => x.k === 'trouble' && s.week - x.w < 26)) {
      sign(s, lb, 'trouble', l('atrasa pagamentos a fornecedores e artistas — pode quebrar.', 'is late paying suppliers and artists — may go under.'), { rumor: true, sev: 35 });
    }
  }
}
// quebrou depois dos sinais: vira fato com o porquê
function bankruptcies(s: GameState): void {
  for (const [id, m] of Object.entries(rm18(s).m)) {
    const lb = s.labels[id];
    if (!lb || lb.active || !lb.closedYear || m.signs.some((x) => x.k === 'bankrupt')) continue;
    const why = m.signs.find((x) => x.k === 'overexp' || x.k === 'badsign');
    if (!why) { m.signs.unshift({ w: s.week, k: 'bankrupt', t: l('fechou as portas.', 'closed its doors.') }); continue; }
    sign(s, lb, 'bankrupt', fmtL(l('quebrou — a conta da aposta chegou: {w}', 'went bust — the bet came due: {w}'), { w: why.t }), { public: true, sev: 45 });
  }
}

// ---------------------------------------------------------------- leitura para a interface e o conselheiro

/** O que o jogador consegue observar de um selo (sinais recentes + leitura do analista). */
export function observed18(s: GameState, lbId: string): { signs: Sign18[]; read: L[] } {
  const m = mind18(s, lbId);
  const read: L[] = [];
  const recentK = (k: Sign18K, w = 52) => m.signs.filter((x) => x.k === k && s.week - x.w <= w).length;
  if (m.target && m.target.until > s.week && (recentK('target', 78) || recentK('court') || recentK('flood'))) read.push(m.target.k === 'act' ? fmtL(l('Parece mirar em {a}, seu artista mais importante.', 'Seems to be going after {a}, your most important act.'), { a: s.acts[m.target.id]?.name ?? '?' }) : fmtL(l('Parece querer tomar o seu espaço em {f}.', 'Seems to want your space in {f}.'), { f: famName(m.target.id) }));
  if (m.dev && m.dev > s.week) read.push(l('Mudou para desenvolver talento: deve disputar menos leilões e mais estreantes.', 'Switched to developing talent: expect fewer bidding wars and more newcomer hunting.'));
  const dr = Object.entries(m.drop).filter(([, y]) => s.year - y <= 3).map(([f]) => famName(f));
  if (dr.length) read.push(fmtL(l('Saiu de {f}: menos concorrência ali.', 'Left {f}: less competition there.'), { f: dr.map((x) => x.pt).join(', ') }));
  if (m.pact && m.pact.until > s.week) read.push(fmtL(l('Parceiro de distribuição ({n} disputas até agora).', 'Distribution partner ({n} disputes so far).'), { n: m.pact.disputes }));
  if (recentK('trouble', 26)) read.push(l('Sinais de aperto financeiro: artistas e catálogo podem ficar livres em breve.', 'Signs of financial strain: acts and catalogue may soon be up for grabs.'));
  else if (m.over && m.over > s.week) read.push(l('Expandiu rápido demais: caixa sob pressão.', 'Expanded too fast: cash under pressure.'));
  return { signs: m.signs.slice(0, 10), read };
}

registerAdvisorTip('rivalmind18', (s) => {
  if (s.config.role === 'artist') return [];
  const out: AdvTip18[] = [];
  for (const [id, m] of Object.entries(rm18(s).m)) {
    const lb = s.labels[id];
    if (!lb?.active) continue;
    const t = m.target;
    if (t && t.until > s.week && m.signs.some((x) => (x.k === 'target' || x.k === 'court' || x.k === 'flood') && s.week - x.w <= 52)) {
      const a = t.k === 'act' ? s.acts[t.id] : undefined;
      out.push({ id: `rm18t:${id}`, level: 'warn', cat: 'rival', score: 70,
        text: a ? fmtL(l('Sinais de que {b} quer levar {a}.', 'Signs that {b} wants to take {a}.'), { b: lb.name, a: a.name }) : fmtL(l('Sinais de que {b} quer o seu espaço em {f}.', 'Signs that {b} wants your space in {f}.'), { b: lb.name, f: famName(t.id) }),
        why: [t.why, ...m.signs.filter((x) => s.week - x.w <= 52).slice(0, 2).map((x) => x.t)],
        effect: a ? l('Renovar cedo (contrato longo) e subir a confiança acima de 70 faz o rival desistir.', 'Renewing early (long deal) and raising trust above 70 makes the rival give up.') : l('Diversificar gêneros (nenhum acima de 45% da receita) tira o alvo das suas costas.', 'Diversifying genres (none above 45% of revenue) takes the target off your back.'),
        goto: a ? { act: a.id } : { area: 'labels' } });
    }
    if (m.signs.some((x) => x.k === 'trouble' && s.week - x.w <= 26)) out.push({ id: `rm18f:${id}`, level: 'info', cat: 'opportunity', score: 45, text: fmtL(l('{b} está em apuros financeiros.', '{b} is in financial trouble.'), { b: lb.name }), why: [l('Atraso de pagamentos e aposta cara recente.', 'Late payments and a recent expensive bet.')], effect: l('Se quebrar, o elenco fica livre e o catálogo vai a quem tiver caixa.', 'If it goes under, its roster goes free and its catalogue goes to whoever has cash.'), goto: { area: 'labels' } });
  }
  return out;
});

// ---------------------------------------------------------------- mês

registerSimHook('month', 'rivalmind18', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:rivalmind18:${s.year}:${s.month}`);
  bids(s);
  develop(s, r);
  hunt(s, r);
  pressTargets(s, r);
  abandon(s);
  pacts(s, r);
  mistakes(s, r);
  bankruptcies(s);
  if (s.month === 0) for (const lb of Object.values(s.labels)) if (lb.active && mind18(s, lb.id).signs.length) { const m = mind18(s, lb.id); m.signs = m.signs.filter((x) => s.week - x.w <= 156); }
});
