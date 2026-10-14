// Rodada 19 (Frente 9.8, onda 3 — T4) — SHOWS E DISCOS BENEFICENTES (`charity19`). Estende a filantropia do society18
// (startCharity18: causas, formatos, convites, taxa administrativa) com o que faltava:
//  • CRISE MUNDIAL como gatilho (fato `world_crisis`): as reais documentadas (Bangladesh 1971, Etiópia 1984, Live Aid e Farm
//    Aid 1985, 2001, tsunami 2005, Live 8, Haiti 2010, pandemia 2020) e, fora do modo exato, crises sorteadas.
//  • Carta ao jogador: liderar com auditoria independente (custa, dinheiro protegido), liderar no improviso (sem custo,
//    risco de o dinheiro sumir), mandar um ato seu para o megashow de outro selo, ou ficar de fora.
//  • Sem você na liderança, um selo rival monta o megashow com estrelas de vários selos.
//  • RIVAIS NO MESMO PALCO: pares de atos de selos diferentes (rixa aberta pesa) → pacto (holds17: favores nos dois sentidos)
//    ou briga (feud18); cena com todos no palco (cine18); imagem e prestígio dos que tocaram.
//  • DINHEIRO QUE SOME (`charity_scandal`): escândalo de dinheiro (scandal17) + investigação (crime17 feedCase) + manchete.
// Cadeia 4 do plano19: crise → beneficente → rivais no palco → pacto ou briga → dinheiro some → investigação.

import { Rng, clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import { exactHist } from '../history15';
import { grantHold } from '../holds17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { logShot18 } from './cine18';
import { feedCase } from './crime17';
import { headline19 } from './factlink19';
import { feudOf18, startFeud18, temper18, leadOf18 } from './feud18';
import { CAUSES18, soc18, startCharity18, type Camp18 } from './society18';
import { cashWhy20, freeCash20 } from '../oblig20';

export interface Cr19 { id: string; y: number; m: number; w: number; cause: string; fmt: Camp18['fmt']; t: L; real?: boolean; mine?: boolean; aud?: boolean; join?: string; done?: boolean; org?: string; v?: number; gone?: boolean }
export interface Stage19 { y: number; a: string; b: string; k: 'pact' | 'feud' | 'cold'; t: L }
export interface Ch19 { cr: Cr19[]; st: Stage19[]; seq: number; log: [number, number, L][]; n: Record<string, number>; done: Record<string, 1>; camp?: { w: number; aud: boolean; cr?: string } }
declare module '../ext4' { interface Ext4 { charity19: Ch19 } }
const fresh = (): Ch19 => ({ cr: [], st: [], seq: 0, log: [], n: {}, done: {} });
registerExt4('charity19', fresh);
export function ch19(s: GameState): Ch19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.charity19 ??= fresh()) as Ch19;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
const cnt = (s: GameState, k: string) => { const n = ch19(s).n; n[k] = (n[k] ?? 0) + 1; };
const logC = (s: GameState, t: L) => { const st = ch19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const rng = (s: GameState) => rng19(s, 'charity19', () => Rng.fromSeed(`${s.config.seed}|ch19|${s.week}`));
const mine = (s: GameState, a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const npc = (a: Act): boolean => a.owner !== 'player' && !a.playerBand;
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const W = 4.35;

/** Crises reais documentadas (mês 0–11) que puxaram shows/singles beneficentes. */
export const REAL_CR19: { y: number; m: number; cause: string; fmt: Camp18['fmt']; t: L }[] = [
  { y: 1971, m: 6, cause: 'disaster', fmt: 'concert', t: l('Guerra e refugiados em Bangladesh: músicos organizam um concerto beneficente em Nova York.', 'War and refugees in Bangladesh: musicians stage a benefit concert in New York.') },
  { y: 1984, m: 10, cause: 'famine', fmt: 'single', t: l('Fome na Etiópia: uma reportagem choca o mundo e artistas britânicos gravam um single coletivo.', 'Famine in Ethiopia: a TV report shocks the world and British artists record a group single.') },
  { y: 1985, m: 5, cause: 'famine', fmt: 'concert', t: l('Live Aid: concertos simultâneos em Londres e na Filadélfia, transmitidos para o mundo.', 'Live Aid: simultaneous concerts in London and Philadelphia, broadcast worldwide.') },
  { y: 1985, m: 8, cause: 'farm', fmt: 'concert', t: l('Crise dos agricultores nos EUA: nasce o Farm Aid.', 'US farm crisis: Farm Aid is born.') },
  { y: 2001, m: 9, cause: 'disaster', fmt: 'concert', t: l('Depois dos atentados de 11 de setembro, concertos beneficentes em Nova York.', 'After the September 11 attacks, benefit concerts in New York.') },
  { y: 2005, m: 0, cause: 'disaster', fmt: 'concert', t: l('Tsunami no Oceano Índico: concertos e singles beneficentes pelo mundo.', 'Indian Ocean tsunami: benefit concerts and singles around the world.') },
  { y: 2005, m: 6, cause: 'famine', fmt: 'concert', t: l('Live 8: shows em vários países pelo perdão da dívida dos países pobres.', 'Live 8: shows in many countries for poor-country debt relief.') },
  { y: 2010, m: 0, cause: 'disaster', fmt: 'single', t: l('Terremoto no Haiti: regravação coletiva de um hino beneficente.', 'Haiti earthquake: a group re-recording of a charity anthem.') },
  { y: 2020, m: 3, cause: 'disaster', fmt: 'concert', t: l('Pandemia: concerto beneficente transmitido da casa dos artistas.', 'Pandemic: a benefit concert streamed from the artists\' homes.') },
];
const RAND_T19: Record<string, L> = {
  disaster: l('Terremoto devasta uma região (história alternativa): pedidos de ajuda chegam à indústria da música.', 'An earthquake devastates a region (alternate history): calls for help reach the music industry.'),
  famine: l('Seca e fome numa região pobre (história alternativa): a TV mostra as imagens toda noite.', 'Drought and famine in a poor region (alternate history): TV shows the images every night.'),
  refugees: l('Guerra civil expulsa milhões de casa (história alternativa).', 'Civil war drives millions from home (alternate history).'),
  children: l('Epidemia lota os hospitais infantis (história alternativa).', 'An epidemic fills children\'s hospitals (alternate history).'),
  climate: l('Enchentes recordes (história alternativa): artistas cobram ação.', 'Record floods (alternate history): artists demand action.'),
};

/** Abre uma crise mundial (fato `world_crisis`). */
export function crisis19(s: GameState, o: { cause: string; fmt: Camp18['fmt']; t?: L; real?: boolean }): Cr19 {
  const st = ch19(s);
  const c: Cr19 = { id: `cr${++st.seq}`, y: s.year, m: s.month, w: s.week, cause: o.cause, fmt: s.year < 1950 && o.fmt === 'concert' ? 'single' : o.fmt, t: o.t ?? RAND_T19[o.cause] ?? RAND_T19.disaster, real: o.real };
  st.cr.push(c); if (st.cr.length > 30) st.cr.shift();
  emitFact(s, { kind: 'world_crisis', actors: [], severity: 50, visibility: 'public', tags: ['charity19', c.cause, o.real ? 'real' : 'alt'], text: c.t, src: 'charity19', data: { cr: c.id } });
  logC(s, c.t); cnt(s, 'crisis');
  return c;
}
const crOf = (s: GameState, id: string) => ch19(s).cr.find((x) => x.id === id);
export const auditCost19 = (s: GameState) => money(s, 5000);
/** Chance de o dinheiro sumir (tesoureiro, auditoria, época) e o porquê. */
export function vanishOdds19(s: GameState, aud: boolean, mineLead: boolean): { p: number; why: WhyPart[] } {
  const why: WhyPart[] = [];
  let p = mineLead ? 0.15 : 0.12; why.push({ label: mineLead ? l('Campanha no improviso: tesoureiro de confiança', 'Improvised campaign: a trusted treasurer') : l('Megashow de outro selo: contas opacas', 'Another label\'s mega-show: opaque books'), value: p, fmt: 'pct' });
  if (aud) { p = 0.02; why.push({ label: l('Auditoria independente', 'Independent audit'), value: 0.02, fmt: 'pct', tone: 'good' }); }
  if (s.year >= 2005) { p *= 0.7; why.push({ label: l('Doações rastreáveis (2005+)', 'Traceable donations (2005+)'), value: 0.7, fmt: 'mult', tone: 'good' }); }
  return { p: clamp(p, 0, 0.3), why };
}

// ---------------------------------------------------------------- carta ao jogador
function offer(s: GameState, c: Cr19): void {
  if (!playerActs(s).length) return;
  const cause = CAUSES18.find((x) => x.id === c.cause)?.name ?? l(c.cause, c.cause);
  const busy = !!soc18(s).camp && soc18(s).camp!.stage !== 'done';
  pushInbox18(s, 'ch19_crisis', { from: l('Rede de ajuda humanitária', 'Humanitarian network').pt, subject: fmtL(l('Crise: {c} — a música vai ajudar?', 'Crisis: {c} — will music help?'), { c: cause }), tone: 'info', ref: { cr: c.id, act: playerActs(s)[0] },
    body: fmtL(l('{t} Liderar com auditoria custa {a} a mais e protege o dinheiro; no improviso, o risco de desvio é real. Ou mande um ato seu ao megashow de outro selo.', '{t} Leading with an audit costs {a} more and protects the money; improvised, the risk of embezzlement is real. Or send one of your acts to another label\'s mega-show.'), { t: c.t, a: usd(auditCost19(s)) }),
    actions: [...(busy ? [] : [{ id: 'lead_audit', label: l('Liderar com auditoria', 'Lead with an audit') }, { id: 'lead_fast', label: l('Liderar já, sem auditoria', 'Lead now, no audit') }]), { id: 'join', label: l('Mandar um ato ao megashow', 'Send an act to the mega-show') }, { id: 'skip', label: l('Ficar de fora', 'Stay out') }], weeks: 4 });
}
export function answerCrisis19(s: GameState, crId: string, a: 'lead_audit' | 'lead_fast' | 'join' | 'skip'): L {
  const c = crOf(s, crId);
  if (!c || c.done) return l('Já passou.', 'Already over.');
  if (a === 'skip') return l('Você fica de fora desta vez.', 'You stay out this time.');
  if (a === 'join') {
    const top = playerActs(s).map((id) => s.acts[id]).filter((x): x is Act => !!x && x.status !== 'retired').sort((x, y) => y.fame - x.fame)[0];
    if (!top) return l('Sem ato disponível.', 'No act available.');
    c.join = top.id;
    return fmtL(l('{a} vai tocar no megashow.', '{a} will play the mega-show.'), { a: top.name });
  }
  const aud = a === 'lead_audit';
  if (aud && freeCash20(s) < auditCost19(s)) return cashWhy20(s, auditCost19(s), l('Caixa insuficiente para a auditoria.', 'Not enough cash for the audit.'));
  const err = startCharity18(s, c.cause, c.fmt, 0);
  if (err) return err;
  if (aud) post(s, `ch19aud:${c.id}`, -auditCost19(s), 'legal', 'Auditoria independente da campanha beneficente');
  c.mine = true; c.aud = aud;
  ch19(s).camp = { w: soc18(s).camp?.w ?? s.week, aud, cr: c.id };
  return aud ? l('Campanha aberta, com auditoria: convide estrelas em Mundo › Sociedade.', 'Campaign open, audited: invite stars in World › Society.') : l('Campanha aberta no improviso: convide estrelas em Mundo › Sociedade.', 'Improvised campaign open: invite stars in World › Society.');
}
registerInboxKind('ch19_crisis', { label: l('Beneficente', 'Charity'), cat: 'decision', icon: 'star', prio: 2, goto: () => ({ area: 'live19', tab: ['live19', 'charity'] }),
  handle: (s, m, a) => answerCrisis19(s, String(m.ref?.cr), a as 'lead_audit' | 'lead_fast' | 'join' | 'skip') });

// ---------------------------------------------------------------- megashow de outro selo
/** Um selo rival monta o megashow (ou single) com estrelas de vários selos. `force` (testes) controla o desvio. */
export function npcShow19(s: GameState, crId: string, force?: { vanish?: boolean; stars?: string[] }): Fact | null {
  const c = crOf(s, crId), r = rng(s);
  if (!c || c.done) return null;
  c.done = true;
  const lbs = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash);
  const org = lbs[0];
  if (!org) return null;
  c.org = org.id;
  const pool = Object.values(s.acts).filter((a) => npc(a) && a.status === 'active' && a.fame >= 45 && !a.deceased);
  const stars: string[] = force?.stars ? [...force.stars] : [];
  const used = new Set<string>();
  for (const a of r.shuffle([...pool])) { if (stars.length >= 6) break; const k = a.owner || a.id; if (used.has(k) || stars.includes(a.id)) continue; used.add(k); stars.push(a.id); }
  if (c.join && !stars.includes(c.join)) stars.push(c.join);
  const tot = money(s, stars.reduce((t, id) => t + (s.acts[id]?.fame ?? 0), 0) * 700 * (c.fmt === 'concert' ? (s.year >= 1985 ? 3 : 1.8) : 1));
  c.v = tot;
  const t = fmtL(c.fmt === 'single' ? l('{o} reúne {n} estrelas num single coletivo pela crise ({v} arrecadados).', '{o} gathers {n} stars on a group single for the crisis ({v} raised).') : l('{o} monta um megashow beneficente com {n} atrações ({v} arrecadados).', '{o} stages a benefit mega-show with {n} acts ({v} raised).'), { o: org.name, n: stars.length, v: usd(tot) });
  const f = c.fmt === 'single'
    ? emitFact(s, { kind: 'charity_single', actors: [org.id, ...stars], severity: 50, visibility: 'public', tags: ['charity19', 'npc', c.cause, 'good'], text: t, src: 'charity19', data: { cr: c.id } })
    : emitFact(s, { kind: 'charity_show', actors: [org.id, ...stars], severity: 55, visibility: 'public', tags: ['charity19', 'npc', c.cause, 'good'], text: t, src: 'charity19', data: { cr: c.id } });
  logC(s, t); cnt(s, 'npc_show');
  const vp = exactHist(s) ? 0 : vanishOdds19(s, false, false).p;
  if (force?.vanish ?? r.chance(vp)) vanish(s, c, org.id, tot);
  return f;
}
function vanish(s: GameState, c: Cr19, who: string, tot: number): void {
  c.gone = true;
  const lost = Math.round(tot * 0.35);
  const name = who === 'player' ? s.config.companyName : s.labels[who]?.name ?? who;
  const t = fmtL(l('Auditoria: {v} do dinheiro da campanha de {o} nunca chegou à causa. A polícia abre inquérito.', 'Audit: {v} of {o}\'s campaign money never reached the cause. Police open an inquiry.'), { v: usd(lost), o: name });
  emitFact(s, { kind: 'charity_scandal', actors: [who], severity: 60, visibility: 'public', tags: ['charity19', 'fraud', 'bad'], text: t, src: 'charity19', data: { cr: c.id, lost } });
  logC(s, t); cnt(s, 'vanish');
}

// ---------------------------------------------------------------- rivais no mesmo palco
/** Pares de atos de selos diferentes no mesmo palco: pacto (favores) ou briga (feud18). `force` para testes. */
export function stage19(s: GameState, actIds: string[], force?: 'pact' | 'feud'): Stage19[] {
  const r = rng(s), acts = actIds.map((id) => s.acts[id]).filter((a): a is Act => !!a);
  const pairs: [Act, Act, number][] = [];
  for (let i = 0; i < acts.length; i++) for (let j = i + 1; j < acts.length; j++) {
    const a = acts[i], b = acts[j];
    if ((a.owner || a.id) === (b.owner || b.id)) continue;
    pairs.push([a, b, (feudOf18(s, a.id, b.id) ? 3 : 1) * (a.genre === b.genre ? 1.5 : 1)]);
  }
  const out: Stage19[] = [];
  for (let k = 0; k < 2 && pairs.length; k++) {
    const pk = r.weighted(pairs, (x) => x[2]);
    if (!pk) break;
    pairs.splice(pairs.indexOf(pk), 1);
    const [a, b] = pk;
    const pf = 0.3 + (feudOf18(s, a.id, b.id) ? 0.3 : 0) + (temper18(s, leadOf18(s, a)) + temper18(s, leadOf18(s, b))) / 400;
    let kind: Stage19['k'] = force ?? (r.chance(clamp(pf, 0.1, 0.85)) ? 'feud' : 'pact');
    let t: L;
    if (kind === 'feud') {
      const fd = startFeud18(s, a.id, b.id, fmtL(l('Briga pelo refrão no palco beneficente', 'Fight over the chorus on the benefit stage'), {}), 18);
      if (!fd) kind = 'cold';
      t = fd ? fmtL(l('{a} e {b} discutem ao vivo no palco beneficente: começa uma rixa.', '{a} and {b} argue live on the benefit stage: a feud begins.'), { a: a.name, b: b.name })
        : fmtL(l('{a} e {b} mal se olham no palco beneficente.', '{a} and {b} barely look at each other on the benefit stage.'), { a: a.name, b: b.name });
    } else {
      const tx = fmtL(l('Abraço de {a} e {b} no palco beneficente', '{a} and {b} embrace on the benefit stage'), { a: a.name, b: b.name });
      grantHold(s, { holder: a.id, target: b.id, kind: 'favor', strength: 40, text: tx, months: 24, src: 'charity19' });
      grantHold(s, { holder: b.id, target: a.id, kind: 'favor', strength: 40, text: tx, months: 24, src: 'charity19' });
      t = fmtL(l('{a} e {b} — rivais de selos diferentes — dividem o microfone e selam um pacto.', '{a} and {b} — rivals from different labels — share the mic and seal a pact.'), { a: a.name, b: b.name });
    }
    const x: Stage19 = { y: s.year, a: a.id, b: b.id, k: kind, t };
    ch19(s).st.unshift(x); if (ch19(s).st.length > 30) ch19(s).st.length = 30;
    out.push(x); logC(s, t); cnt(s, `stage_${kind}`);
    if (kind !== 'cold') headline19(s, t, 2);
  }
  return out;
}

// ---------------------------------------------------------------- mês
export function charityMonth19(s: GameState): void {
  const st = ch19(s), r = rng(s);
  for (const c of REAL_CR19) { const k = `${c.y}:${c.m}`; if (c.y === s.year && c.m === s.month && !st.done[k]) { st.done[k] = 1; crisis19(s, { ...c, real: true }); } }
  if (!exactHist(s) && s.year >= 1950 && r.chance(0.01)) {
    const cs = Object.keys(RAND_T19).filter((k) => CAUSES18.some((x) => x.id === k && s.year >= x.from && (!x.to || s.year <= x.to)));
    if (cs.length) { const cause = r.pick(cs); crisis19(s, { cause, fmt: r.chance(0.5) ? 'concert' : 'single' }); }
  }
  // sem você na liderança: o megashow de outro selo sai ~2 meses depois
  for (const c of st.cr) if (!c.done && !c.mine && s.week - c.w >= Math.round(2 * W)) npcShow19(s, c.id);
}
registerSimHook('month', 'charity19', (s) => charityMonth19(s));

// ---------------------------------------------------------------- ouvintes
// crise → carta ao jogador
onFact('world_crisis', (s, f) => { const c = crOf(s, String(f.data?.cr ?? '')); if (c) offer(s, c); headline19(s, f.text, 2); }, 'charity19:crisis');
// a campanha do society18 terminou (fato `show` charity) → vira charity_show/charity_single e rola o desvio
onFact('show', (s, f) => {
  if (f.src !== 'soc18' || !f.tags.includes('charity')) return;
  const st = ch19(s), cp = soc18(s).camp, aud = !!st.camp?.aud, crId = st.camp?.cr;
  const c = crId ? crOf(s, crId) : undefined;
  if (c) c.done = true;
  st.camp = undefined;
  const fmt = cp?.fmt ?? 'concert', stars = f.actors.filter((x) => x !== 'player');
  const t = fmtL(fmt === 'single' ? l('Single beneficente de {o} chega às rádios com {n} vozes.', '{o}\'s charity single hits radio with {n} voices.') : l('Megashow beneficente de {o}: {n} atrações no mesmo palco.', '{o}\'s benefit mega-show: {n} acts on one stage.'), { o: s.config.companyName, n: stars.length });
  if (fmt === 'single') emitFact(s, { kind: 'charity_single', actors: ['player', ...stars], severity: 45, visibility: 'public', tags: ['charity19', 'mine', 'good'], text: t, src: 'charity19', data: { cr: crId ?? '' } });
  else emitFact(s, { kind: 'charity_show', actors: ['player', ...stars], severity: 55, visibility: 'public', tags: ['charity19', 'mine', 'good'], text: t, src: 'charity19', data: { cr: crId ?? '' } });
  const tot = cp ? money(s, stars.reduce((x, id) => x + (s.acts[id]?.fame ?? 0), 0) * 900) : 0;
  if (c) c.v = tot;
  if (rng(s).chance(vanishOdds19(s, aud, true).p)) vanish(s, c ?? { id: 'soc18', y: s.year, m: s.month, w: s.week, cause: cp?.cause ?? 'disaster', fmt, t }, 'player', tot);
}, 'charity19:soc18');
const stageOf = (s: GameState, f: Fact) => f.actors.filter((x) => !!s.acts[x]);
// megashow → rivais no mesmo palco (holds17/feud18), cena (cine18), imagem dos que tocaram
onFact('charity_show', (s, f) => {
  const acts = stageOf(s, f);
  stage19(s, acts);
  for (const id of acts) { const a = s.acts[id]; a.fame = clamp(a.fame + 1.5, 0, 100); a.fans.casual += 3000; }
  const m = acts.find((id) => mine(s, s.acts[id]));
  logShot18(s, { k: 'festival', act: m ?? acts[0], text: f.text, fact: f.id, d: { charity: 1, n: acts.length } });
  if (f.actors.includes('player') || m) s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100);
}, 'charity19:stage');
// single coletivo → rádio e lojas (impulso no lançamento mais recente de cada voz) + manchete
onFact('charity_single', (s, f) => {
  const acts = stageOf(s, f);
  stage19(s, acts.slice(0, 4));
  for (const id of acts) {
    const a = s.acts[id]; a.fans.casual += 2000;
    const rel = (a.releases ?? []).map((x) => s.releases[x]).filter(Boolean).sort((x, y) => y.week - x.week)[0];
    if (rel) rel.hypeBoost = Math.min(0.5, (rel.hypeBoost ?? 0) + 0.08);
  }
  headline19(s, f.text, 2);
}, 'charity19:single');
// dinheiro sumiu → escândalo (scandal17) + inquérito (crime17) + manchete; a filantropia do selo despenca
onFact('charity_scandal', (s, f) => {
  const who = f.actors[0] ?? 'player';
  scandal(s, who, 'money', 55, f.text, { tags: ['charity19', 'fraud'], quiet: true });
  feedCase(s, who, countryOfCity(s.config.homeCity) ?? 'USA', 30, 50, false);
  if (who === 'player') { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100); soc18(s).phil = Math.max(0, soc18(s).phil - 10); }
  else { const lb = s.labels[who]; if (lb) lb.cash -= money(s, 20000); }
  headline19(s, f.text, 3);
}, 'charity19:case');

// ---------------------------------------------------------------- ecos, calendário, porquê
const T = (pt: string, en: string) => l(pt, en);
registerConseq18('ib:ch19_crisis:lead_audit', { now: T('Auditoria: dinheiro protegido.', 'Audit: money protected.'), later: [{ in: [4, 12], p: 0.4, tone: 'good', hint: T('Contas limpas viram reputação.', 'Clean books become reputation.'), fx: (f) => { f.rep('institutional', 2); return T('A ONG publica o balanço e cita o selo como exemplo.', 'The NGO publishes its accounts and cites the label as an example.'); } }] });
registerConseq18('ib:ch19_crisis:lead_fast', { later: [{ in: [3, 10], p: 0.3, tone: 'bad', hint: T('Dinheiro sem controle chama perguntas.', 'Uncontrolled money invites questions.'), fx: (f) => { f.rep('institutional', -2); return T('Um jornalista pede as notas fiscais da campanha.', 'A journalist asks for the campaign\'s receipts.'); } }] });
registerConseq18('ib:ch19_crisis:join', { later: [{ in: [2, 6], p: 0.45, tone: 'mixed', hint: T('Palco dividido, egos divididos.', 'Shared stage, shared egos.'), fx: (f) => { f.fame(2).mood('stress', 3); return T('Seu ato brilha no megashow — e volta exausto da maratona.', 'Your act shines at the mega-show — and comes back exhausted.'); } }] });
registerConseq18('ib:ch19_crisis:skip', { later: [{ in: [1, 4], p: 0.25, tone: 'bad', hint: T('A imprensa nota quem não apareceu.', 'The press notes who did not show up.'), fx: (f) => { f.rep('artists', -1); return T('Colunista lista os selos que "lavaram as mãos".', 'A columnist lists the labels that "washed their hands".'); } }] });
registerDeadline('charity19', (s, from, to) => ch19(s).cr.filter((c) => !c.done && !c.mine).map((c) => ({ id: `charity19-${c.id}`, w: c.w + Math.round(2 * W), w0: c.w + 4, kind: 'other' as const, t: l('Megashow beneficente de outro selo', 'Another label\'s benefit mega-show'), tone: 'info' as const, goto: { area: 'live19', tab: ['live19', 'charity'] as [string, string] } })).filter((d) => d.w >= from && d.w <= to));
registerExplain('ch19.vanish', (s, c) => {
  const o = vanishOdds19(s, !!c.aud, !!c.mine);
  return { title: l('Risco de o dinheiro sumir', 'Risk of the money vanishing'), value: o.p, fmt: 'pct', parts: o.why, note: l('Se sumir: escândalo de dinheiro, inquérito policial e manchete.', 'If it vanishes: money scandal, police inquiry and a headline.') };
});
