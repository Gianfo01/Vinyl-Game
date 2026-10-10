// Rodada 18 (decide18, item 4) — AUDITORIA DE INTEGRAÇÃO: 17 pares de sistemas que ainda não conversavam, agora
// ligados. Cada ligação tem um porquê (explain18 'link18.<id>') e, quando acontece, entra no registro do mês
// ("Ligações do mês" no Cockpit). Sem estado de módulo; Rng próprio e semeado onde há sorteio.
//
//  campus  campus18 (prédios, danos)        → opinião da equipe e estresse do elenco
//  sync    rights18 (one-stop, equipe)      → encaixe nos pedidos de sync15
//  office  regions18 (escritório próprio)   → pistas de talento no discover18
//  fanwar  fans18 (facção irritada)         → notícia pública (news17/facts17) e ganchos do dm18
//  hire    ability18 (potencial)            → salário pedido pelos profissionais do mercado
//  doc     paths18 (doutrinas)              → opinião de chefes de selo e críticos (agency18/persona13)
//  merch   supply18 (atraso) + fans18 (colecionadores) → demanda de merch17
//  radio   society18 (proibição/corte)      → rotação nas rádios (radio18)
//  scene   dm18 (fio no clímax)             → coletiva de imprensa (scene17)
//  feud    feud18 (rixa acesa)              → vendas nas paradas (atenção)
//  heart   love17/people16 (separação)      → qualidade das canções (disco de fossa)
//  tension dyn18 (mágoa na banda)           → receita de shows
//  award   prêmios (Fato award)             → chance das propostas
//  grudge  holds17 (mágoa guardada)         → chance das propostas
//  recess  economia (recessão)              → demanda de merch
//  photo   scene17 (foto icônica)           → demanda de merch
//  relics  relics18 (ala-museu)             → reputação institucional

import { Rng, clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { subById18 } from '../../data/regions18';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact, recentFacts } from '../facts17';
import { holdsBetween } from '../holds17';
import type { Act, GameState } from '../types';
import { fmtL, playerActs, staffSkill } from '../util';
import { abilityStaff18 } from './ability18';
import { actOfKey18 } from './agency18';
import { buildings18 } from './campus18';
import { addLead18 } from './discover18';
import { dm18 } from './dm18';
import { activeFeuds18 } from './feud18';
import { fan18, fans18, factions18 } from './fans18';
import { m17 } from './merch17';
import { hasDoc18 } from './paths18';
import { opine } from './persona13';
import { radio18 } from './radio18';
import { reg18 } from './regions18';
import { rel18 } from './relics18';
import { ctx17, queue17, s17 } from './scene17';
import { soc18 } from './society18';
import { shareOf, SYNC_FIT18 } from './sync15';
import { leaders } from './leaders10';

export interface Link18Def { id: string; a: L; b: L; how: L }
export const LINKS18: Link18Def[] = [
  { id: 'campus', a: l('Sede e prédios', 'HQ and buildings'), b: l('Equipe e elenco', 'Staff and roster'), how: l('Prédio danificado irrita a equipe e estressa o elenco; sede ampla e casa dos artistas aliviam.', 'Damaged buildings upset staff and stress the roster; a big HQ and artists\' house relieve.') },
  { id: 'sync', a: l('Direitos', 'Rights'), b: l('Sync', 'Sync'), how: l('Dono de master e edição libera tudo numa ligação ("one-stop"): supervisores preferem.', 'Owning master and publishing clears it in one call ("one-stop"): supervisors prefer it.') },
  { id: 'office', a: l('Escritórios regionais', 'Regional offices'), b: l('Descoberta de talentos', 'Talent discovery'), how: l('Escritório próprio num submercado traz pistas de artistas locais.', 'An owned office in a submarket brings leads on local acts.') },
  { id: 'fanwar', a: l('Facções de fãs', 'Fan factions'), b: l('Notícias', 'News'), how: l('Facção muito irritada vira guerra de fãs pública.', 'A very angry faction becomes a public fan war.') },
  { id: 'hire', a: l('Potencial (CA/PA)', 'Potential (CA/PA)'), b: l('Contratação', 'Hiring'), how: l('Profissional com margem de crescimento pede salário maior.', 'Professionals with growth headroom ask for more.') },
  { id: 'doc', a: l('Doutrinas do selo', 'Label doctrines'), b: l('Opinião dos NPCs', 'NPC opinions'), how: l('Chefes de selo e críticos reagem às suas doutrinas a cada trimestre.', 'Label bosses and critics react to your doctrines every quarter.') },
  { id: 'merch', a: l('Cadeia física e fãs', 'Supply chain and fans'), b: l('Merch', 'Merch'), how: l('Disco atrasado frustra a banca; fã colecionador compra mais.', 'A late record cools the stand; collector fans buy more.') },
  { id: 'radio', a: l('Censura', 'Censorship'), b: l('Rádio', 'Radio'), how: l('Faixa proibida sai das rádios; versão cortada perde rotação.', 'A banned track leaves radio; a cut version loses rotation.') },
  { id: 'scene', a: l('Fios do Mestre', 'Master\'s threads'), b: l('Cenas', 'Scenes'), how: l('Quando um fio seu chega ao clímax, a imprensa convoca uma coletiva.', 'When one of your threads climaxes, the press calls a conference.') },
  { id: 'feud', a: l('Rixas', 'Feuds'), b: l('Paradas', 'Charts'), how: l('Rixa acesa vende: os dois lados ganham atenção.', 'A heated feud sells: both sides get attention.') },
  { id: 'heart', a: l('Amor e separações', 'Love and breakups'), b: l('Composição', 'Songwriting'), how: l('Separação recente de um integrante rende canções melhores (disco de fossa).', 'A member\'s recent breakup yields better songs (heartbreak record).') },
  { id: 'tension', a: l('Dinâmica da banda', 'Band dynamics'), b: l('Shows', 'Shows'), how: l('Banda com muita mágoa toca pior: receita de show cai.', 'A band full of resentment plays worse: show revenue drops.') },
  { id: 'award', a: l('Prêmios', 'Awards'), b: l('Propostas', 'Offers'), how: l('Selo premiado no último ano atrai artistas.', 'A label awarded in the last year attracts artists.') },
  { id: 'grudge', a: l('Mágoas guardadas', 'Held grudges'), b: l('Propostas', 'Offers'), how: l('Quem guarda mágoa de você resiste a assinar.', 'Those holding a grudge against you resist signing.') },
  { id: 'recess', a: l('Economia', 'Economy'), b: l('Merch', 'Merch'), how: l('Na recessão, camiseta é a primeira coisa cortada.', 'In a recession, the t-shirt is the first thing cut.') },
  { id: 'photo', a: l('Fotos icônicas', 'Iconic photos'), b: l('Merch', 'Merch'), how: l('Foto icônica vira estampa: merch vende mais por um tempo.', 'An iconic photo becomes a print: merch sells more for a while.') },
  { id: 'relics', a: l('Ala-museu', 'Museum wing'), b: l('Reputação', 'Reputation'), how: l('Museu aberto ao público dá reputação institucional devagar.', 'A public museum slowly builds institutional reputation.') },
];

export interface Links18State { log: [number, string, L][]; hp: Record<string, 1>; th: Record<string, number>; fw: Record<string, number> }
declare module '../ext4' { interface Ext4 { links18: Links18State } }
const fresh = (): Links18State => ({ log: [], hp: {}, th: {}, fw: {} });
registerExt4('links18', fresh);
export function lk18(s: GameState): Links18State {
  const x = s.x4 as unknown as { links18?: Links18State };
  const st = (x.links18 ??= fresh());
  st.log ??= []; st.hp ??= {}; st.th ??= {}; st.fw ??= {};
  return st;
}
const log = (s: GameState, id: string, t: L): void => { const st = lk18(s); st.log.unshift([s.week, id, t]); if (st.log.length > 40) st.log.length = 40; };
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
const isMine = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const safe = (fn: () => void): void => { try { fn(); } catch { /* uma ligação com erro não derruba o mês */ } };
const pc = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`;

// ---------------------------------------------------------------- 1. campus → equipe/elenco
export function campusEff18(s: GameState): { staff: number; stress: number; why: L[] } {
  const B = buildings18(s).filter((b) => b.zone === 'campus');
  const dmg = B.filter((b) => b.st === 'damaged').length;
  const house = B.some((b) => b.kind === 'dorm' && b.st === 'open');
  const hq = B.find((b) => b.kind === 'hq' && b.st === 'open')?.lvl ?? 1;
  const why: L[] = [];
  let staff = 0, stress = 0;
  if (dmg) { staff -= 2 * dmg; stress += 2 * dmg; why.push(fmtL(l('{n} prédio(s) danificado(s)', '{n} damaged building(s)'), { n: dmg })); }
  if (hq >= 4) { staff += 1; why.push(l('Sede ampla', 'Big HQ')); }
  if (house) { stress -= 2; why.push(l('Casa dos artistas', 'Artists\' house')); }
  return { staff, stress, why };
}
function campusMonth(s: GameState): void {
  const e = campusEff18(s);
  if (!e.staff && !e.stress) return;
  for (const st of s.player.staff.slice(0, 20)) if (e.staff) opine(s, `s:${st.id}`, e.staff, e.staff < 0 ? l('trabalha num prédio danificado', 'works in a damaged building') : l('gosta da sede nova', 'likes the new HQ'));
  if (e.stress) for (const a of mine(s)) for (const id of a.members) { const p = s.persons[id]; if (p?.alive) p.stress = clamp(p.stress + e.stress, 0, 100); }
  if (s.month % 3 === 0) log(s, 'campus', fmtL(l('Sede: equipe {a}, estresse do elenco {b}/mês ({w}).', 'HQ: staff {a}, roster stress {b}/mo ({w}).'), { a: e.staff, b: e.stress, w: { pt: e.why.map((x) => x.pt).join(', '), en: e.why.map((x) => x.en).join(', ') } }));
}

// ---------------------------------------------------------------- 2. direitos → sync
SYNC_FIT18.push((s, _b, song) => {
  const sh = shareOf(s, song);
  const one = sh.master >= 0.99 && sh.pub >= 0.99 ? 0.08 : sh.master + sh.pub >= 1.5 ? 0.04 : 0;
  const rt = staffSkill(s, 'rights') / 100 * 0.04;
  const v = one + rt;
  return v > 0.005 ? [one ? l('Liberação "one-stop" (master + edição com você)', '"One-stop" clearance (you hold master + publishing)') : l('Equipe de direitos ágil', 'Fast rights team'), Math.round(v * 100) / 100] : null;
});

// ---------------------------------------------------------------- 3. escritórios → pistas
function officeMonth(s: GameState): void {
  const own = Object.entries(reg18(s).loc).filter(([, x]) => x.mode === 'own');
  if (!own.length) return;
  const r = Rng.fromSeed(`${s.config.seed}:links18:office:${s.week}`);
  for (const [sub] of own.slice(0, 4)) {
    if (!r.chance(0.35)) continue;
    const a3 = new Set(subById18[sub]?.a3 ?? []);
    const pool = Object.values(s.acts).filter((a) => !a.owner && a.status !== 'retired' && a.status !== 'split' && a.members.length && a3.has(countryOfCity(a.city) ?? '') && (s.knowledge[a.id]?.degree ?? 0) < 3);
    if (!pool.length) continue;
    const a = r.pick(pool.sort((x, y) => y.momentum - x.momentum).slice(0, 6));
    addLead18(s, r, a, 'office18', 3, 8, fmtL(l('Indicação do escritório em {s}.', 'Tip from the {s} office.'), { s: subById18[sub]?.name ?? l(sub, sub) }));
    log(s, 'office', fmtL(l('Escritório em {s} indicou {a}.', 'The {s} office flagged {a}.'), { s: subById18[sub]?.name ?? l(sub, sub), a: a.name }));
  }
}

// ---------------------------------------------------------------- 4. facção irritada → notícia
function fanwarMonth(s: GameState): void {
  const st = lk18(s);
  for (const a of mine(s)) {
    const f = fans18(s).a[a.id];
    if (!f || (st.fw[a.id] ?? 0) > s.week) continue;
    const i = f.fac.findIndex((v) => v <= -30);
    if (i < 0) continue;
    const share = Object.values(factions18(s, a, f))[i] ?? 0;
    if (share < 0.15) continue;
    st.fw[a.id] = s.week + 26;
    const NAME = [l('puristas', 'purists'), l('fãs de primeira hora', 'mainstream fans'), l('colecionadores', 'collectors'), l('fãs da cena', 'scene fans')];
    const t = fmtL(l('Guerra de fãs: os {f} de {a} atacam o selo nas redes e nas cartas aos jornais.', 'Fan war: {a}\'s {f} attack the label online and in letters to the papers.'), { f: NAME[i], a: a.name });
    emitFact(s, { kind: 'fan_war', actors: [a.id, 'player'], place: a.city, severity: 35, visibility: 'public', tags: ['fans18', 'bad'], text: t, src: 'links18' });
    log(s, 'fanwar', t);
  }
}

// ---------------------------------------------------------------- 5. potencial → salário pedido
export function hireAsk18(s: GameState, pro: GameState['professionals'][number]): number {
  const { ca, pa } = abilityStaff18(s, pro);
  return clamp(1 + (pa - ca) / 400, 1, 1.25);
}
function hireMonth(s: GameState): void {
  const st = lk18(s);
  for (const p of s.professionals) {
    if (st.hp[p.id]) continue;
    st.hp[p.id] = 1;
    const m = hireAsk18(s, p);
    if (m > 1.01) p.salary = Math.round(p.salary * m);
  }
  const ks = Object.keys(st.hp);
  if (ks.length > 300) { const live = new Set(s.professionals.map((x) => x.id)); for (const k of ks) if (!live.has(k)) delete st.hp[k]; }
}

// ---------------------------------------------------------------- 6. doutrinas → opinião de NPCs
export function docOpinion18(s: GameState): { boss: number; critic: number; why: L[] } {
  let boss = 0, critic = 0;
  const why: L[] = [];
  if (hasDoc18(s, 'fair_deal')) { boss -= 1; why.push(l('Contrato justo: rivais acham que você encarece o mercado', 'Fair deal: rivals think you raise market prices')); }
  if (hasDoc18(s, 'iron_contract')) { boss += 1; critic -= 1; why.push(l('Contrato de ferro: chefes respeitam, críticos não', 'Iron contract: bosses respect it, critics don\'t')); }
  if (hasDoc18(s, 'craft')) { critic += 2; why.push(l('Arte primeiro: a crítica aprova', 'Art first: critics approve')); }
  if (hasDoc18(s, 'hits')) { critic -= 1; boss += 1; why.push(l('Fábrica de hits: o mercado respeita, a crítica torce o nariz', 'Hit factory: the market respects it, critics sneer')); }
  if (hasDoc18(s, 'clean')) { critic += 1; why.push(l('Código de ética', 'Code of ethics')); }
  if (hasDoc18(s, 'anything')) { boss -= 1; critic -= 1; why.push(l('Vale-tudo: ninguém confia', 'Anything goes: nobody trusts you')); }
  return { boss, critic, why };
}
function docMonth(s: GameState): void {
  if (s.month % 3 !== 0) return;
  const d = docOpinion18(s);
  if (!d.boss && !d.critic) return;
  const why = l('reage às doutrinas do seu selo', 'reacts to your label\'s doctrines');
  if (d.boss) for (const id of Object.keys(leaders(s)?.L ?? {}).slice(0, 30)) opine(s, `l:${id}`, d.boss, why);
  if (d.critic) for (const k of Object.keys((s.x4 as unknown as { critrel?: { rel: Record<string, number> } }).critrel?.rel ?? {}).slice(0, 30)) opine(s, `c:${k}`, d.critic, why);
  log(s, 'doc', fmtL(l('Doutrinas: chefes de selo {b}, críticos {c} neste trimestre.', 'Doctrines: label bosses {b}, critics {c} this quarter.'), { b: d.boss, c: d.critic }));
}

// ---------------------------------------------------------------- 7/15/16. merch: atraso, colecionadores, recessão, foto
function boost(s: GameState, actId: string, k: number, weeks: number, why: L): boolean {
  const M = m17(s);
  M.boost ??= {};
  const cur = M.boost[actId];
  if (cur && cur.until >= s.week) return false;
  M.boost[actId] = { k, until: s.week + weeks, why };
  return true;
}
function merchMonth(s: GameState): void {
  const ids = new Set(mine(s).map((a) => a.id));
  for (const f of recentFacts(s, { kind: 'release', months: 1, tag: 'late' })) {
    const a = f.actors.find((x) => ids.has(x));
    if (a && boost(s, a, 0.8, 8, l('Disco atrasado na fábrica: fãs frustrados', 'Record late at the plant: frustrated fans'))) log(s, 'merch', fmtL(l('{a}: disco atrasado esfria a banca de merch (−20%).', '{a}: late record cools the merch stand (−20%).'), { a: s.acts[a].name }));
  }
  for (const ph of s17(s).photos.filter((p) => p.act && ids.has(p.act) && p.y === s.year).slice(-3)) {
    if (boost(s, ph.act!, 1.25, 12, fmtL(l('Foto icônica virou estampa: "{t}"', 'Iconic photo became a print: "{t}"'), { t: ph.title }))) log(s, 'photo', fmtL(l('A foto "{t}" virou estampa: merch +25%.', 'The photo "{t}" became a print: merch +25%.'), { t: ph.title }));
  }
  for (const a of mine(s)) {
    if (s.economy.recession) { if (boost(s, a.id, 0.85, 5, l('Recessão: camiseta é corte fácil', 'Recession: tees are an easy cut'))) log(s, 'recess', fmtL(l('Recessão: merch de {a} −15%.', 'Recession: {a} merch −15%.'), { a: a.name })); continue; }
    const f = fan18(s, a.id, false);
    if (!f) continue;
    const coll = factions18(s, a, f).coll;
    if (coll >= 0.18 && boost(s, a.id, 1 + Math.min(0.3, coll), 5, l('Fãs colecionadores', 'Collector fans'))) log(s, 'merch', fmtL(l('Colecionadores de {a} puxam o merch ({p}).', '{a}\'s collectors lift merch ({p}).'), { a: a.name, p: pc(Math.min(0.3, coll)) }));
  }
}

// ---------------------------------------------------------------- 8. censura → rádio
function radioMonth(s: GameState): void {
  const so = soc18(s), R = radio18(s);
  for (const rid of Object.keys(R.rot)) {
    if (so.banned[rid]) { delete R.rot[rid]; log(s, 'radio', fmtL(l('"{t}" proibida: as rádios tiraram da programação.', '"{t}" banned: radio pulled it.'), { t: s.releases[rid]?.title ?? rid })); continue; }
    if (so.cut[rid] !== undefined && so.cut[rid] >= 0) for (const x of R.rot[rid]) if (x.lvl > 1 && x.w < s.week - 4) { x.lvl -= 1; x.w = s.week; }
  }
}

// ---------------------------------------------------------------- 9. fio do Mestre no clímax → coletiva
function sceneMonth(s: GameState): void {
  const st = lk18(s);
  for (const th of dm18(s).th) {
    if (!th.mine) continue;
    const prev = st.th[th.id] ?? 0;
    st.th[th.id] = th.st;
    if (th.st >= 2 && prev < 2) {
      const a = actOfKey18(s, th.hero) ?? (th.cast.act ? s.acts[th.cast.act] : undefined);
      if (!a || !isMine(s, a)) continue;
      const id = queue17(s, 'presser', ctx17(s, { act: a.id, medium: th.k === 'feud' || th.k === 'nemesis' || th.k === 'rival_rise' ? 'feud' : 'scandal' }));
      if (id) log(s, 'scene', fmtL(l('O fio "{k}" chegou ao clímax: coletiva de imprensa com {a}.', 'The "{k}" thread climaxed: press conference with {a}.'), { k: th.k, a: a.name }));
    }
  }
  const ks = Object.keys(st.th);
  if (ks.length > 120) { const live = new Set(dm18(s).th.map((t) => t.id)); for (const k of ks) if (!live.has(k)) delete st.th[k]; }
}

// ---------------------------------------------------------------- 10. rixa → paradas
export function feudBoost18(s: GameState, actId: string): number {
  let best = 0;
  for (const f of activeFeuds18(s)) if ((f.a === actId || f.b === actId) && f.st >= 1 && f.st <= 3) best = Math.max(best, 0.02 + f.h / 2500);
  return Math.min(0.06, best);
}
registerMod('chartUnits', 'links18-feud', (s, v, c) => {
  const a = c.release ? s.acts[c.release.actId] : c.act;
  if (!a) return null;
  const b = feudBoost18(s, a.id);
  return b ? { value: v * (1 + b), label: l('Rixa acesa (atenção)', 'Heated feud (attention)') } : null;
});

// ---------------------------------------------------------------- 11. separação → canções
export function heartBoost18(s: GameState, a: Act): number {
  const ids = new Set([a.id, ...a.members, ...a.members.map((m) => `p:${m}`)]);
  return recentFacts(s, { kind: 'breakup', months: 9, limit: 40 }).some((f) => f.actors.some((x) => ids.has(x))) ? 0.04 : 0;
}
registerMod('songQ', 'links18-heart', (s, v, c) => {
  if (!c.act) return null;
  const b = heartBoost18(s, c.act);
  return b ? { value: v * (1 + b), label: l('Disco de fossa (separação recente)', 'Heartbreak record (recent breakup)') } : null;
});

// ---------------------------------------------------------------- 12. mágoa na banda → shows
export function tensionPen18(a: Act, s: GameState): number {
  const ms = a.members.map((id) => s.persons[id]).filter((p) => p?.alive);
  if (ms.length < 2) return 0;
  const res = ms.reduce((t, p) => t + p.resentment, 0) / ms.length;
  return res >= 40 ? Math.min(0.1, (res - 30) / 300) : 0;
}
registerMod('showRevenue', 'links18-tension', (s, v, c) => {
  if (!c.act) return null;
  const p = tensionPen18(c.act, s);
  return p ? { value: v * (1 - p), label: l('Banda magoada no palco', 'A resentful band on stage') } : null;
});

// ---------------------------------------------------------------- 13/14. prêmios e mágoas → propostas
export function awardPull18(s: GameState): number {
  return recentFacts(s, { kind: 'award', months: 12, limit: 30 }).some((f) => f.actors.includes('player') || f.actors.some((x) => s.acts[x]?.owner === 'player')) ? 0.04 : 0;
}
registerOfferMod('links18-award', (s) => {
  const d = awardPull18(s);
  return d ? { delta: d, reason: l('Selo premiado no último ano', 'Label awarded in the last year') } : null;
});
registerOfferMod('links18-grudge', (s, act) => {
  const g = act.members.some((id) => holdsBetween(s, id, 'player').some((h) => h.kind === 'grievance' && h.status === 'open'));
  return g ? { delta: -0.06, reason: l('Alguém do ato guarda mágoa de você', 'Someone in the act holds a grudge against you') } : null;
});

// ---------------------------------------------------------------- 17. ala-museu → reputação
function relicsMonth(s: GameState): void {
  const w = rel18(s).wing ?? 0;
  if (w <= 0 || s.month % 2) return;
  const R = s.player.reputation;
  if (R.institutional < 70) { R.institutional = clamp(R.institutional + 0.5 * w, 0, 100); if (s.month === 0) log(s, 'relics', l('A ala-museu rendeu reputação institucional este ano.', 'The museum wing built institutional reputation this year.')); }
}

registerSimHook('month', 'links18', (s) => {
  safe(() => campusMonth(s)); safe(() => officeMonth(s)); safe(() => fanwarMonth(s)); safe(() => hireMonth(s)); safe(() => docMonth(s));
  safe(() => merchMonth(s)); safe(() => radioMonth(s)); safe(() => sceneMonth(s)); safe(() => relicsMonth(s));
});

// ---------------------------------------------------------------- porquês
registerExplain('link18', (s, c) => {
  const d = LINKS18.find((x) => x.id === c.id);
  if (!d) return null;
  const parts: { label: L; value?: number; fmt?: 'num' | 'signed' | 'pct'; tone?: 'good' | 'bad' }[] = [];
  const act = c.act ? s.acts[String(c.act)] : undefined;
  if (d.id === 'campus') { const e = campusEff18(s); parts.push({ label: l('Opinião da equipe/mês', 'Staff opinion/mo'), value: e.staff, fmt: 'signed' }, { label: l('Estresse do elenco/mês', 'Roster stress/mo'), value: e.stress, fmt: 'signed' }, ...e.why.map((w) => ({ label: w }))); }
  if (d.id === 'doc') { const e = docOpinion18(s); parts.push({ label: l('Chefes de selo/trimestre', 'Label bosses/quarter'), value: e.boss, fmt: 'signed' }, { label: l('Críticos/trimestre', 'Critics/quarter'), value: e.critic, fmt: 'signed' }, ...e.why.map((w) => ({ label: w }))); }
  if (d.id === 'feud' && act) parts.push({ label: l('Vendas', 'Sales'), value: Math.round(feudBoost18(s, act.id) * 100), fmt: 'pct', tone: 'good' });
  if (d.id === 'heart' && act) parts.push({ label: l('Qualidade das canções', 'Song quality'), value: Math.round(heartBoost18(s, act) * 100), fmt: 'pct', tone: 'good' });
  if (d.id === 'tension' && act) parts.push({ label: l('Receita de show', 'Show revenue'), value: -Math.round(tensionPen18(act, s) * 100), fmt: 'pct', tone: 'bad' });
  if (d.id === 'award') parts.push({ label: l('Chance das propostas', 'Offer chance'), value: Math.round(awardPull18(s) * 100), fmt: 'pct', tone: 'good' });
  const recent = lk18(s).log.filter((x) => x[1] === d.id).slice(0, 3);
  for (const [, , t] of recent) parts.push({ label: t });
  return { title: fmtL(l('{a} → {b}', '{a} → {b}'), { a: d.a, b: d.b }), value: recent.length, fmt: 'num', parts, note: d.how };
});
export const links18Log = (s: GameState): [number, string, L][] => lk18(s).log;
