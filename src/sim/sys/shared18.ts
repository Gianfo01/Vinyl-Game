// Rodada 18 (artist18, "carreiras compartilhadas") — o que você faz JUNTO com NPCs:
//  • Sociedades: fundar um selo, festival ou estúdio com um sócio NPC (artista famoso, empresário real) ou um
//    selo-imprint com um selo NPC (joint venture). Participação, aporte, votos ponderados pela participação
//    (50/50 = impasse), estilo do sócio (cauteloso, ganancioso, visionário, leal, esquentado — tirado das facetas
//    persona13), propostas dele e suas, dividendos, chamadas de capital, compra/venda de participação, briga e
//    dissolução na Justiça. Opinião do sócio sobre você usa agency18 (relOf18/adjRel18).
//  • Banda como sociedade: a divisão do dinheiro entre os integrantes (igual / quem compõe / você como líder)
//    mexe com moral e ressentimento (lineup16 cuida das saídas). Os votos sobre propostas de selo ficam em artist18.
//  • Híbrido (você tem selo E banda): assinar a si mesmo é conflito de interesse — política de royalties da banda
//    no seu selo (justa / padrão / em causa própria) pesa na confiança dos outros artistas e na banda.

import { clamp, hashString, Rng, seedState } from '../../core/rng';
import { l, type L } from '../../data/world';
import { REAL_MGRS } from '../../data/managers14';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, post } from '../util';
import { adjRel18, nameOfKey18, relOf18 } from './agency18';
import { band18 } from './artist18';
import { mgrActive } from './managers14';
import { realKey18 } from './personact18';
import { per13 } from './persona13';

export type VKind18 = 'label' | 'festival' | 'studio' | 'imprint';
export type Style18 = 'cautious' | 'greedy' | 'visionary' | 'loyal' | 'hothead';
export type Prop18 = 'expand' | 'dividend' | 'sell' | 'hire' | 'cut';
export interface Vote18v { w: number; y: number; k: Prop18; by: 'you' | 'partner'; you: boolean; them: boolean; pass: boolean; t: L }
export interface Ven18 {
  id: string; kind: VKind18; name: string; pk: string; pn: string; eq: number; cash: number; rep: number; since: number; mood: number; style: Style18;
  votes: Vote18v[]; prof: number[]; st: 'on' | 'sold' | 'gone'; dead: number; staff: number; offer?: number;
}
export interface Shared18 { v: Ven18[]; split: 'equal' | 'writers' | 'leader'; self: 'fair' | 'standard' | 'self'; cd: Record<string, number>; log: [number, number, L][] }
declare module '../ext4' { interface Ext4 { shared18: Shared18 } }
const fresh = (): Shared18 => ({ v: [], split: 'equal', self: 'standard', cd: {}, log: [] });
registerExt4('shared18', fresh);
export function sh18(s: GameState): Shared18 {
  const x = s as unknown as { x4: Record<string, unknown> };
  x.x4 ??= {};
  const st = (x.x4.shared18 ??= fresh()) as Shared18;
  st.v ??= []; st.cd ??= {}; st.log ??= []; st.split ??= 'equal'; st.self ??= 'standard';
  return st;
}
const say = (s: GameState, t: L) => { const st = sh18(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };

export const VKIND18: Record<VKind18, { name: L; cap: number; desc: L }> = {
  label: { name: l('Selo', 'Label'), cap: 40000, desc: l('Um selo pequeno: receita cresce com a reputação; o sócio traz contatos.', 'A small label: revenue grows with reputation; the partner brings contacts.') },
  festival: { name: l('Festival', 'Festival'), cap: 60000, desc: l('Dinheiro concentrado no verão; ano ruim dói.', 'Money concentrated in summer; a bad year hurts.') },
  studio: { name: l('Estúdio', 'Studio'), cap: 50000, desc: l('Receita estável de horas de estúdio.', 'Steady revenue from studio hours.') },
  imprint: { name: l('Imprint com selo NPC', 'Imprint with an NPC label'), cap: 0, desc: l('Joint venture: o selo entra com o dinheiro; você, com o nome. 50/50.', 'Joint venture: the label brings the money; you, the name. 50/50.') },
};
export const STYLE18: Record<Style18, { name: L; desc: L }> = {
  cautious: { name: l('Cauteloso', 'Cautious'), desc: l('Gosta de dividendos e cortes; odeia expandir no escuro.', 'Likes dividends and cuts; hates expanding blindly.') },
  greedy: { name: l('Ganancioso', 'Greedy'), desc: l('Quer dividendo e vender caro.', 'Wants dividends and a pricey sale.') },
  visionary: { name: l('Visionário', 'Visionary'), desc: l('Quer crescer: expandir e contratar; dividendo é desperdício.', 'Wants growth: expand and hire; dividends are a waste.') },
  loyal: { name: l('Leal', 'Loyal'), desc: l('Costuma acompanhar o seu voto.', 'Usually follows your vote.') },
  hothead: { name: l('Esquentado', 'Hothead'), desc: l('Imprevisível; o humor oscila o dobro.', 'Unpredictable; mood swings twice as hard.') },
};
export const PROP18: Record<Prop18, L> = {
  expand: l('Expandir (chamada de capital)', 'Expand (capital call)'), dividend: l('Distribuir dividendos', 'Pay dividends'),
  sell: l('Vender a empresa', 'Sell the company'), hire: l('Contratar equipe', 'Hire staff'), cut: l('Cortar custos', 'Cut costs'),
};

/** estilo do sócio a partir das facetas persona13 (ou do hash, para selos) */
export function styleOf18(s: GameState, pk: string): Style18 {
  const f = pk.startsWith('lb:') ? undefined : per13(s, pk)?.facets;
  if (!f) return (['cautious', 'greedy', 'visionary', 'loyal', 'hothead'] as Style18[])[hashString(`${s.config.seed}|${pk}`) % 5];
  const sc: [Style18, number][] = [['greedy', f.ambicao - f.generosidade], ['cautious', f.paciencia + f.disciplina - 100], ['visionary', f.curiosidade + f.ambicao - 100], ['loyal', f.lealdade - 50], ['hothead', f.impulsividade - 45]];
  return sc.sort((a, b) => b[1] - a[1])[0][0];
}

/** quem topa ser seu sócio: artistas famosos, empresários reais e selos (imprint) */
export function partners18(s: GameState, kind: VKind18): { pk: string; name: string; why: L }[] {
  if (kind === 'imprint') return Object.values(s.labels).filter((x) => x.active && x.founded <= s.year && x.cash > money(s, 300000)).sort((a, b) => b.reputation - a.reputation).slice(0, 5).map((x) => ({ pk: `lb:${x.id}`, name: x.name, why: fmtL(l('reputação {r}', 'reputation {r}'), { r: Math.round(x.reputation) }) }));
  const mine = band18(s)?.id;
  // modo "vida real exata": gente real só vive fatos documentados — sócios só fictícios
  const strict = s.config.history === 'strict';
  const ok = (k: string) => !strict || !realKey18(s, k);
  const acts = Object.values(s.acts).filter((a) => a.id !== mine && !a.playerBand && !a.deceased && a.status === 'active' && a.fame > 30).sort((a, b) => b.fame - a.fame).slice(0, 12);
  const out = acts.map((a) => { const p = a.members.map((id) => s.persons[id]).find((x) => x?.alive); return p && ok(`p:${p.id}`) ? { pk: `p:${p.id}`, name: p.name, why: fmtL(p.name === a.name ? l('fama {f}', 'fame {f}') : l('de {a} (fama {f})', 'of {a} (fame {f})'), { a: a.name, f: Math.round(a.fame) }) } : null; }).filter((x): x is { pk: string; name: string; why: L } => !!x).slice(0, 4);
  for (const m of REAL_MGRS.filter((m) => mgrActive(s, m) && ok(`e:${m.id}`)).slice(0, 3)) out.push({ pk: `e:${m.id}`, name: nameOfKey18(s, `e:${m.id}`), why: l('empresário', 'manager') });
  return out;
}
const pName = (s: GameState, pk: string) => (pk.startsWith('lb:') ? s.labels[pk.slice(3)]?.name ?? pk : nameOfKey18(s, pk));
const rel = (s: GameState, pk: string) => (pk.startsWith('lb:') ? 0 : relOf18(s, pk, 'player'));
const fameYou = (s: GameState) => Math.max(band18(s)?.fame ?? 0, s.player.reputation.institutional * 0.6);

/** chance de o NPC topar a sociedade (com porquê) */
export function foundOdds18(s: GameState, kind: VKind18, pk: string, eq: number): { p: number; why: L[] } {
  const why: L[] = [];
  let p = 0.35;
  const r = rel(s, pk); p += r / 200; if (Math.abs(r) > 10) why.push(fmtL(l('Opinião sobre você: {r}', 'Opinion of you: {r}'), { r: Math.round(r) }));
  const f = fameYou(s); p += f / 150; why.push(fmtL(l('Seu nome pesa ({f})', 'Your name carries weight ({f})'), { f: Math.round(f) }));
  const pf = pk.startsWith('p:') ? Math.max(0, ...Object.values(s.acts).filter((a) => a.members.includes(pk.slice(2))).map((a) => a.fame)) : 0;
  if (pf > f + 10) { p -= (pf - f) / 150; why.push(fmtL(l('Ele é bem mais famoso ({p}): acha que você precisa mais dele', 'They are far more famous ({p}): they think you need them more'), { p: Math.round(pf) })); }
  if (eq > 0.5) { p -= (eq - 0.5) * 0.8; why.push(l('Você quer o controle: ele hesita', 'You want control: they hesitate')); }
  if (kind === 'imprint' && (band18(s)?.fame ?? 0) < 35) { p -= 0.3; why.push(l('Selo só faz imprint com artista famoso (fama 35+)', 'Labels only do imprints with famous artists (fame 35+)')); }
  return { p: clamp(p, 0.03, 0.92), why };
}
export const capOf18 = (s: GameState, kind: VKind18): number => money(s, VKIND18[kind].cap);

export function found18(s: GameState, kind: VKind18, pk: string, eq: number, name?: string): { ok: boolean; text: L } {
  const st = sh18(s);
  if (st.v.filter((v) => v.st === 'on').length >= 4) return { ok: false, text: l('Sociedades demais ao mesmo tempo (máx. 4).', 'Too many partnerships at once (max 4).') };
  if ((st.cd[`ask:${pk}`] ?? 0) > s.week) return { ok: false, text: l('Você já perguntou há pouco.', 'You asked recently.') };
  if (kind === 'imprint') eq = 0.5;
  const mine = Math.round(capOf18(s, kind) * eq);
  if (s.player.cash < mine) return { ok: false, text: l('Caixa insuficiente para a sua parte do aporte.', 'Not enough cash for your share of the capital.') };
  st.cd[`ask:${pk}`] = s.week + 26;
  const r = new Rng(seedState(`sh18|${s.config.seed}|${pk}|${s.week}`));
  const { p } = foundOdds18(s, kind, pk, eq);
  const who = pName(s, pk);
  if (!r.chance(p)) { if (!pk.startsWith('lb:')) adjRel18(s, pk, 'player', -2, l('recusou uma sociedade', 'turned down a partnership')); return { ok: false, text: fmtL(l('{n} recusou a sociedade ({p}% de chance).', '{n} turned down the partnership ({p}% chance).'), { n: who, p: Math.round(p * 100) }) }; }
  const id = nextId(s, 'sv');
  const cap = kind === 'imprint' ? money(s, 80000) : capOf18(s, kind);
  if (mine) post(s, `venture:a18:${id}`, -mine, 'investments', `Aporte na sociedade com ${who}`);
  if (pk.startsWith('lb:')) { const lb = s.labels[pk.slice(3)]; if (lb) lb.cash -= cap; }
  const v: Ven18 = { id, kind, name: name?.trim() || fmtL(l('{a} & {b}', '{a} & {b}'), { a: s.config.companyName.split(' ')[0], b: who.split(' ').slice(-1)[0] }).pt, pk, pn: who, eq, cash: cap, rep: kind === 'imprint' ? 35 : 20, since: s.week, mood: 60, style: styleOf18(s, pk), votes: [], prof: [], st: 'on', dead: 0, staff: 0 };
  st.v.unshift(v);
  say(s, fmtL(l('Fundou "{v}" com {n} ({e}% seu).', 'Founded "{v}" with {n} ({e}% yours).'), { v: v.name, n: who, e: Math.round(eq * 100) }));
  emitFact(s, { kind: 'deal', actors: ['player', pk.replace(/^lb:/, '')], severity: 35, visibility: 'public', tags: ['venture', 'shared18'], text: fmtL(l('{a} e {b} fundam {k} "{v}".', '{a} and {b} found a {k}, "{v}".'), { a: s.config.companyName, b: who, k: VKIND18[kind].name, v: v.name }), src: 'shared18' });
  return { ok: true, text: fmtL(l('{n} topou! "{v}" nasce com {c} em caixa.', '{n} is in! "{v}" starts with {c} in cash.'), { n: who, v: v.name, c: `$${Math.round(cap / 100).toLocaleString('en')}` }) };
}

/** o sócio vota (estilo + humor + o seu voto, se for leal) */
export function partnerVote18(s: GameState, v: Ven18, k: Prop18, you: boolean): boolean {
  const h = hashString(`${v.id}|${k}|${s.week}`) % 100 / 100;
  const base: Record<Style18, Partial<Record<Prop18, number>>> = {
    cautious: { dividend: 0.8, cut: 0.75, expand: 0.25, sell: 0.3, hire: 0.3 }, greedy: { dividend: 0.9, sell: 0.75, cut: 0.6, expand: 0.2, hire: 0.25 },
    visionary: { expand: 0.85, hire: 0.8, dividend: 0.2, sell: 0.15, cut: 0.2 }, loyal: {}, hothead: {},
  };
  let p = v.style === 'loyal' ? (you ? 0.85 : 0.2) : v.style === 'hothead' ? 0.5 : base[v.style][k] ?? 0.5;
  p += (v.mood - 50) / 250;
  if (k === 'sell' && v.offer) p += 0.15;
  return h < clamp(p, 0.05, 0.95);
}
function apply(s: GameState, v: Ven18, k: Prop18): L {
  const share = (x: number) => Math.round(x * v.eq);
  switch (k) {
    case 'dividend': {
      const x = Math.round(Math.max(0, v.cash) * 0.6);
      if (x <= 0) return l('Sem caixa para dividendos.', 'No cash for dividends.');
      v.cash -= x;
      post(s, `a18div:${v.id}:${s.week}`, share(x), 'dividends', `Dividendos de ${v.name}`);
      return fmtL(l('Dividendos: {y} para você.', 'Dividends: {y} to you.'), { y: `$${Math.round(share(x) / 100).toLocaleString('en')}` });
    }
    case 'expand': {
      const x = money(s, VKIND18[v.kind].cap * 0.5 || 30000);
      const you = share(x);
      if (s.player.cash < you) { v.mood -= 6; return l('Você não tinha caixa para a chamada de capital: o sócio se irrita.', 'You had no cash for the capital call: the partner is annoyed.'); }
      post(s, `venture:a18:${v.id}:cap:${s.week}`, -you, 'investments', `Chamada de capital ${v.name}`);
      if (v.pk.startsWith('lb:')) { const lb = s.labels[v.pk.slice(3)]; if (lb) lb.cash -= x - you; }
      v.cash += x; v.rep = clamp(v.rep + 12, 0, 100);
      return fmtL(l('Expansão: +12 de reputação; sua parte do aporte foi {y}.', 'Expansion: +12 reputation; your share of the capital was {y}.'), { y: `$${Math.round(you / 100).toLocaleString('en')}` });
    }
    case 'hire': v.staff++; v.rep = clamp(v.rep + 5, 0, 100); return l('Equipe maior: custo mensal sobe, reputação também.', 'Bigger team: monthly cost rises, so does reputation.');
    case 'cut': v.staff = Math.max(0, v.staff - 1); v.rep = clamp(v.rep - 4, 0, 100); v.cash += money(s, 3000); return l('Cortes: sobra caixa, a reputação cai um pouco.', 'Cuts: cash saved, reputation dips.');
    case 'sell': {
      const price = v.offer ?? Math.round(value18v(s, v) * 1.1);
      const you = share(price);
      post(s, `a18vsell:${v.id}`, you, 'asset_sales', `Venda de ${v.name}`);
      v.st = 'sold';
      emitFact(s, { kind: 'deal', actors: ['player', v.pk.replace(/^lb:/, '')], severity: 35, visibility: 'public', tags: ['venture', 'sale'], text: fmtL(l('"{v}" é vendida.', '"{v}" is sold.'), { v: v.name }), src: 'shared18' });
      return fmtL(l('Vendida! Sua parte: {y}.', 'Sold! Your share: {y}.'), { y: `$${Math.round(you / 100).toLocaleString('en')}` });
    }
  }
}
/** votação (você propõe ou responde ao sócio): ponderada pela participação; 50/50 com votos diferentes = impasse */
export function vote18(s: GameState, id: string, k: Prop18, you: boolean, by: 'you' | 'partner' = 'you'): { ok: boolean; text: L } {
  const v = sh18(s).v.find((x) => x.id === id && x.st === 'on');
  if (!v) return { ok: false, text: l('Sociedade inexistente.', 'No such partnership.') };
  const them = by === 'partner' ? true : partnerVote18(s, v, k, you);
  const pass = you === them ? you : v.eq > 0.5 ? you : v.eq < 0.5 ? them : false;
  const tie = you !== them && v.eq === 0.5;
  const sw = v.style === 'hothead' ? 2 : 1;
  v.mood = clamp(v.mood + (you === them ? 3 : tie ? -8 : pass === them ? 1 : -6) * sw, 0, 100);
  if (tie) v.dead++;
  if (!v.pk.startsWith('lb:')) adjRel18(s, v.pk, 'player', you === them ? 1 : -2, l('votação na sociedade', 'partnership vote'));
  const t = pass ? apply(s, v, k) : tie ? l('Impasse 50/50: nada acontece e o clima piora.', '50/50 deadlock: nothing happens and the mood sours.') : l('Proposta derrubada.', 'Motion defeated.');
  v.votes.unshift({ w: s.week, y: s.year, k, by, you, them, pass, t });
  if (v.votes.length > 20) v.votes.length = 20;
  return { ok: pass, text: fmtL(l('{k}: você {y}, {n} {t2} → {r}', '{k}: you {y}, {n} {t2} → {r}'), { k: PROP18[k], y: you ? l('sim', 'yes') : l('não', 'no'), n: v.pn, t2: them ? l('sim', 'yes') : l('não', 'no'), r: t }) };
}
/** avaliação: lucro anual × 4 + caixa */
export function value18v(s: GameState, v: Ven18): number {
  const y = v.prof.slice(-12).reduce((t, x) => t + x, 0);
  return Math.max(0, Math.round(y * 4 + v.cash + money(s, v.rep * 400)));
}
export function buyOut18(s: GameState, id: string): { ok: boolean; text: L } {
  const v = sh18(s).v.find((x) => x.id === id && x.st === 'on');
  if (!v) return { ok: false, text: l('Sociedade inexistente.', 'No such partnership.') };
  const price = Math.round(value18v(s, v) * (1 - v.eq) * (v.style === 'greedy' ? 1.35 : 1.15));
  if (s.player.cash < price) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.') };
  post(s, `venture:a18:${v.id}:buy`, -price, 'acquisitions', `Compra da parte de ${v.pn}`);
  if (v.pk.startsWith('lb:')) { const lb = s.labels[v.pk.slice(3)]; if (lb) lb.cash += price; }
  v.eq = 1; v.mood = 100;
  say(s, fmtL(l('Você comprou a parte de {n} em "{v}".', 'You bought {n}\'s stake in "{v}".'), { n: v.pn, v: v.name }));
  return { ok: true, text: fmtL(l('"{v}" agora é 100% sua.', '"{v}" is now 100% yours.'), { v: v.name }) };
}
export const buyOutPrice18 = (s: GameState, v: Ven18) => Math.round(value18v(s, v) * (1 - v.eq) * (v.style === 'greedy' ? 1.35 : 1.15));
export function sellStake18(s: GameState, id: string): { ok: boolean; text: L } {
  const v = sh18(s).v.find((x) => x.id === id && x.st === 'on');
  if (!v) return { ok: false, text: l('Sociedade inexistente.', 'No such partnership.') };
  const price = Math.round(value18v(s, v) * v.eq * 0.85);
  post(s, `a18vstake:${v.id}`, price, 'asset_sales', `Venda da sua parte em ${v.name}`);
  v.st = 'sold';
  say(s, fmtL(l('Você vendeu sua parte em "{v}" para {n}.', 'You sold your stake in "{v}" to {n}.'), { v: v.name, n: v.pn }));
  return { ok: true, text: fmtL(l('Parte vendida a {n} por {p} (15% de desconto: quem sai primeiro paga).', 'Stake sold to {n} for {p} (15% discount: whoever leaves first pays).'), { n: v.pn, p: `$${Math.round(price / 100).toLocaleString('en')}` }) };
}

function ventureMonth(s: GameState, r: Rng, v: Ven18): void {
  const m = 0.75 + r.next() * 0.5;
  const bandF = band18(s)?.fame ?? 0;
  let rev = 0, cost = 0;
  switch (v.kind) {
    case 'label': rev = (1500 + Math.pow(v.rep, 1.5) * 22) * m; cost = 2200 + v.rep * 18; break;
    case 'festival': rev = s.month >= 5 && s.month <= 7 ? (14000 + v.rep * 700) * m : 0; cost = 1600 + v.rep * 14; break;
    case 'studio': rev = (2800 + v.rep * 55) * m; cost = 2100 + v.rep * 20; break;
    case 'imprint': rev = (2000 + v.rep * 45 + bandF * 60) * m; cost = 1500 + v.rep * 10; break;
  }
  cost += v.staff * 1800;
  const p = money(s, rev - cost);
  v.cash += p;
  v.prof.push(p); if (v.prof.length > 24) v.prof.shift();
  v.rep = clamp(v.rep + (p > 0 ? 0.4 : -0.3) + v.staff * 0.15, 0, 100);
  // humor do sócio: lucro alegra, prejuízo azeda
  v.mood = clamp(v.mood + (p > 0 ? 0.5 : -1) * (v.style === 'hothead' ? 2 : 1) - (v.style === 'greedy' && v.cash > money(s, 60000) ? 1 : 0), 0, 100);
  // caixa negativo: chamada de emergência automática
  if (v.cash < 0) { const you = Math.round(-v.cash * v.eq); post(s, `venture:a18:${v.id}:em:${s.week}`, -you, 'investments', `Cobrir prejuízo de ${v.name}`); v.cash = 0; v.mood = clamp(v.mood - 4, 0, 100); }
  // o sócio propõe algo
  if (r.chance(0.12)) {
    const pref: Record<Style18, Prop18[]> = { cautious: ['dividend', 'cut'], greedy: ['dividend', 'sell'], visionary: ['expand', 'hire'], loyal: ['dividend', 'expand'], hothead: ['expand', 'sell', 'cut', 'dividend'] };
    const k = r.pick(pref[v.style]);
    if (k === 'sell') v.offer = Math.round(value18v(s, v) * (1.1 + r.next() * 0.4));
    if (k === 'dividend' && v.cash < money(s, 10000)) return;
    pushInbox18(s, 'sh18_prop', { from: v.pn, subject: fmtL(l('{n} propõe: {k}', '{n} proposes: {k}'), { n: v.pn, k: PROP18[k] }), ref: { v: v.id, k },
      body: fmtL(l('Na sociedade "{v}" (você tem {e}%), {n} ({st}) quer: {k}{o}. Seu voto pesa {e}%; em 50/50, votos diferentes travam tudo.', 'In "{v}" (you own {e}%), {n} ({st}) wants to: {k}{o}. Your vote weighs {e}%; at 50/50, split votes deadlock.'),
        { v: v.name, e: Math.round(v.eq * 100), n: v.pn, st: STYLE18[v.style].name, k: PROP18[k], o: k === 'sell' && v.offer ? fmtL(l(' (comprador oferece ${p})', ' (buyer offers ${p})'), { p: Math.round(v.offer / 100).toLocaleString('en') }) : '' }),
      actions: [{ id: 'yes', label: l('Votar sim', 'Vote yes') }, { id: 'no', label: l('Votar não', 'Vote no') }] });
  }
  // briga: impasses ou humor no chão
  if ((v.mood < 18 || v.dead >= 3) && (sh18(s).cd[`fall:${v.id}`] ?? 0) <= s.week) {
    sh18(s).cd[`fall:${v.id}`] = s.week + 52;
    pushInbox18(s, 'sh18_fall', { from: v.pn, subject: fmtL(l('Briga na sociedade "{v}"', 'Fallout at "{v}"'), { v: v.name }), tone: 'bad', ref: { v: v.id },
      body: fmtL(l('{n} quer sair: ou você compra a parte dele (avaliação + prêmio), ou vende a sua com desconto, ou vão à Justiça dissolver a empresa (custas e perda de valor).', '{n} wants out: either you buy their stake (valuation + premium), sell yours at a discount, or go to court to dissolve the company (fees and lost value).'), { n: v.pn }),
      actions: [{ id: 'buy', label: l('Comprar a parte dele', 'Buy their stake') }, { id: 'sell', label: l('Vender a minha', 'Sell mine') }, { id: 'court', label: l('Dissolver na Justiça', 'Dissolve in court') }] });
    emitFact(s, { kind: 'statement', actors: ['player', v.pk.replace(/^lb:/, '')], severity: 30, visibility: 'rumor', tags: ['venture', 'bad'], text: fmtL(l('Sócios de "{v}" brigam.', 'Partners at "{v}" fall out.'), { v: v.name }), src: 'shared18' });
  }
}
export function dissolve18(s: GameState, id: string): L {
  const v = sh18(s).v.find((x) => x.id === id && x.st === 'on');
  if (!v) return l('Sociedade inexistente.', 'No such partnership.');
  const fee = money(s, 6000);
  post(s, `a18vcourt:${v.id}`, -fee, 'legal', `Dissolução de ${v.name}`);
  const back = Math.round(Math.max(0, v.cash) * v.eq * 0.8);
  if (back) post(s, `a18vliq:${v.id}`, back, 'asset_sales', `Liquidação de ${v.name}`);
  v.st = 'gone';
  if (!v.pk.startsWith('lb:')) adjRel18(s, v.pk, 'player', -15, l('dissolução na Justiça', 'court dissolution'));
  say(s, fmtL(l('"{v}" dissolvida na Justiça.', '"{v}" dissolved in court.'), { v: v.name }));
  return fmtL(l('Dissolvida: você recebe {b} (80% da sua parte do caixa), menos {f} de custas.', 'Dissolved: you get {b} (80% of your share of cash), minus {f} in fees.'), { b: `$${Math.round(back / 100).toLocaleString('en')}`, f: `$${Math.round(fee / 100).toLocaleString('en')}` });
}

registerInboxKind('sh18_prop', {
  label: l('Sociedade', 'Partnership'), cat: 'decision', icon: 'handshake', prio: 1,
  goto: () => ({ area: 'shared18' }),
  handle: (s, m, action) => vote18(s, String(m.ref?.v), String(m.ref?.k) as Prop18, action === 'yes', 'partner').text,
});
registerInboxKind('sh18_fall', {
  label: l('Briga de sócios', 'Partner fallout'), cat: 'decision', icon: 'warning', prio: 2,
  goto: () => ({ area: 'shared18' }),
  handle: (s, m, action) => { const id = String(m.ref?.v); return action === 'buy' ? buyOut18(s, id).text : action === 'sell' ? sellStake18(s, id).text : dissolve18(s, id); },
});

// ---------------------------------------------------------------- banda como sociedade e conflito de interesse

export const SPLIT18: Record<Shared18['split'], { name: L; desc: L }> = {
  equal: { name: l('Partes iguais', 'Equal shares'), desc: l('Todos ganham igual: paz na banda.', 'Everyone earns the same: peace in the band.') },
  writers: { name: l('Quem compõe ganha mais', 'Songwriters earn more'), desc: l('Compositores felizes; os outros, menos.', 'Writers happy; the rest, less so.') },
  leader: { name: l('Você como líder', 'You as leader'), desc: l('Você fica com +8% dos shows; a banda acumula mágoa.', 'You keep +8% of live money; the band builds resentment.') },
};
export const SELF18: Record<Shared18['self'], { name: L; desc: L }> = {
  fair: { name: l('Justa (royalty alto para a banda)', 'Fair (high royalty for the band)'), desc: l('Custa 3% da receita da banda; a banda e os outros artistas confiam mais.', 'Costs 3% of band revenue; the band and other acts trust you more.') },
  standard: { name: l('Padrão', 'Standard'), desc: l('Como qualquer artista do selo.', 'Like any other act on the label.') },
  self: { name: l('Em causa própria', 'Self-dealing'), desc: l('Sua banda tem prioridade (+8% nas paradas); os outros artistas desconfiam, a banda se ressente e a imprensa fala.', 'Your band gets priority (+8% on the charts); other acts grow suspicious, the band resents it and the press talks.') },
};
export const setSplit18 = (s: GameState, v: Shared18['split']): void => { sh18(s).split = v; };
export const setSelf18 = (s: GameState, v: Shared18['self']): void => { sh18(s).self = v; };
export const hybrid18 = (s: GameState): boolean => s.config.role === 'hybrid' && !!band18(s);

function bandMonth(s: GameState, a: Act): void {
  const st = sh18(s);
  const writers = new Set(a.releases.flatMap((id) => s.releases[id]?.songs ?? []).flatMap((sid) => s.songs[sid]?.writers ?? []));
  for (const id of a.members) {
    const p = s.persons[id];
    if (!p || p.isPlayer || !p.alive) continue;
    if (st.split === 'writers') p.morale = clamp(p.morale + (writers.has(id) ? 0.4 : -0.4), 0, 100);
    if (st.split === 'leader') { p.resentment = clamp(p.resentment + 0.8, 0, 100); p.morale = clamp(p.morale - 0.3, 0, 100); }
    if (st.split === 'equal') p.morale = clamp(p.morale + 0.15, 0, 100);
    if (hybrid18(s)) {
      if (st.self === 'fair') p.morale = clamp(p.morale + 0.3, 0, 100);
      if (st.self === 'self') p.resentment = clamp(p.resentment + 0.4, 0, 100);
    }
  }
  if (hybrid18(s)) {
    const others = Object.values(s.acts).filter((x) => x.owner === 'player' && !x.playerBand);
    for (const o of others) o.trust = clamp(o.trust + (st.self === 'fair' ? 0.15 : st.self === 'self' ? -0.35 : 0), 0, 100);
    if (st.self === 'self' && (st.cd.press ?? 0) <= s.week && others.length) {
      st.cd.press = s.week + 52;
      emitFact(s, { kind: 'scandal', actors: ['player', a.id], severity: 30, visibility: 'rumor', tags: ['conflict', 'label'], text: fmtL(l('Artistas de {l} reclamam: a banda do dono leva toda a verba.', '{l}\'s artists complain: the owner\'s band gets all the budget.'), { l: s.config.companyName }), src: 'shared18' });
      notify(s, l('Conflito de interesse: seus artistas reclamam que a sua banda leva tudo.', 'Conflict of interest: your acts complain your band gets everything.'), 'bad');
    }
  }
}

registerMod('chartUnits', 'shared18', (s, v, ctx) => {
  const st = (s.x4 as unknown as { shared18?: Shared18 }).shared18;
  if (!st || st.self !== 'self' || s.config.role !== 'hybrid') return null;
  return ctx.release && s.acts[ctx.release.actId]?.playerBand ? { value: v * 1.08, label: l('Prioridade do dono (conflito de interesse)', 'Owner\'s priority (conflict of interest)') } : null;
});
registerMod('showRevenue', 'shared18', (s, v, ctx) => {
  const st = (s.x4 as unknown as { shared18?: Shared18 }).shared18;
  return st?.split === 'leader' && ctx.act?.playerBand ? { value: v * 1.08, label: l('Você fica com a parte do líder', 'You take the leader\'s cut') } : null;
});

registerSimHook('month', 'shared18', (s) => {
  const st = sh18(s);
  const a = band18(s);
  if (a) bandMonth(s, a);
  if (hybrid18(s) && st.self === 'fair' && a) {
    const rev = a.releases.map((id) => s.releases[id]).filter((r) => r && s.week - r.week < 26).reduce((t, r) => t + r.revenue, 0);
    const x = Math.round(rev / 26 * 4.33 * 0.03);
    if (x > 0) post(s, `sh18fair:${s.year}:${s.month}`, -x, 'royalties', 'Royalty justo para a banda (sócios)');
  }
  const live = st.v.filter((v) => v.st === 'on');
  if (!live.length) return;
  const r = new Rng(seedState(`sh18m|${s.config.seed}|${s.year}|${s.month}`));
  for (const v of live) ventureMonth(s, r, v);
});
