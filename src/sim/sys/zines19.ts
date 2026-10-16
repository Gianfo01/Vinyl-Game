// Rodada 19 (Frente 9.10, onda 3 — T9) — JORNALISMO MUSICAL E FANZINES (`zines19`).
//  • Fanzines nascem (1966+; blogs 2000+) onde um gênero cresce numa cidade: `zine_founded`. Cada fanzine esquenta a
//    dupla cidade×gênero; com 25 de calor nasce uma CENA LOCAL (`zine_scene`): gênero em alta, hype da cena (hype12),
//    apelo para os atos de lá — e a corrida do ouro (scene_boom da Frente 7) atrai bandas-fantasma (fakes19): cadeia 6.
//  • Você pode fundar um fanzine (escolhe cidade e gênero: dá para "inventar" uma cena em casa), COMPRAR uma revista
//    existente (preço por alcance × credibilidade; no modo exato os veículos reais não estão à venda) e escolher a linha
//    editorial: independente (credibilidade) ou "da casa" (empurra seus discos, mas acumula CONFLITO DE INTERESSE →
//    `conflict_interest`: escândalo, credibilidade do press18 e alcance despencam).
//  • Críticos viram editores (`critic_editor`): o veículo passa a favorecer os gêneros do crítico; você pode contratar um
//    crítico como editor da sua revista (alcance e credibilidade, salário).
// Lê: press18 (credibilidade/alcance), heritage17 (cenas reais ativas), media17 (veículos, críticos), genrePop, atos.
// Escreve: hype12 (cena), genrePop, apelo, press18, escândalo, ledger (capex/serviços), Caixa, calendário.

import { Rng, clamp } from '../../core/rng';
import { CRITICS17, OUTLETS17, type Outlet17 } from '../../data/media17';
import { cityById, familyOf, genreById, l, type L } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerConseq18 } from '../decide18';
import type { EventDef } from '../events';
import { registerExplain } from '../explain18';
import { deferEvents, registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post, remember } from '../util';
import { headline19 } from './factlink19';
import { activeScenes17 } from './heritage17';
import { addHype } from './hype12';
import { LINKS18, lk18 } from './links18';
import { pr18 } from './press18';
import { cashWhy20, freeCash20 } from '../oblig20';
import { actsNow27, releasesNow27 } from '../tickcache27';

export type ZK19 = 'zine' | 'blog';
export interface Zine19 { id: string; name: string; city: string; g: string; y: number; k: ZK19; by: 'npc' | 'player'; reach: number; end?: number }
export interface ZScene19 { id: string; city: string; g: string; y: number; to: number; zine: string }
export interface Own19 { oid: string; y: number; line: 'indep' | 'house'; ed?: string; paid: number }
export interface Zn19 {
  z: Zine19[]; heat: Record<string, number>; sc: ZScene19[]; own?: Own19; coi: number; coiW: number;
  /** veículo → crítico editor (e os gêneros que ele favorece) */
  ed: Record<string, { c: string; fav: string[]; y: number }>;
  log: [number, number, L][]; n: Record<string, number>; seq: number;
}
declare module '../ext4' { interface Ext4 { zn19: Zn19 } }
const fresh = (): Zn19 => ({ z: [], heat: {}, sc: [], coi: 0, coiW: 0, ed: {}, log: [], n: {}, seq: 0 });
registerExt4('zn19', fresh);
export function zn19(s: GameState): Zn19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.zn19 ??= fresh()) as Zn19;
  const f = fresh();
  for (const k of Object.keys(f) as (keyof Zn19)[]) if (k !== 'own') (st as unknown as Record<string, unknown>)[k] ??= f[k];
  return st;
}
const N = (pt: string, en: string): L => l(pt, en);
const logZ = (s: GameState, t: L) => { const st = zn19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const cnt = (s: GameState, k: string) => { const n = zn19(s).n; n[k] = (n[k] ?? 0) + 1; };
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
const exact = (s: GameState) => histMode(s) === 'strict';
export const SCENE_HEAT19 = 25;
const hk = (city: string, g: string) => `${city}|${g}`;
export const zinesLive19 = (s: GameState): Zine19[] => zn19(s).z.filter((z) => !z.end);
export const zScenesLive19 = (s: GameState): ZScene19[] => zn19(s).sc.filter((x) => s.year <= x.to);
const sceneAt = (s: GameState, city: string, g: string) => activeScenes17(s).some((x) => x[1] === city && (x[2] === g || familyOf(x[2]) === familyOf(g))) || zScenesLive19(s).some((x) => x.city === city && x.g === g);
export const zineKind19 = (s: GameState): ZK19 => (s.year >= 2000 ? 'blog' : 'zine');

const PT = ['Ruído', 'Barulho', 'Faísca', 'Grito', 'Subsolo', 'Agulha', 'Xerox', 'Volume', 'Microfonia', 'Porão', 'Grampo', 'Fita Crepe'];
const EN = ['Noise', 'Racket', 'Spark', 'Scream', 'Underground', 'Needle', 'Xerox', 'Volume', 'Feedback', 'Basement', 'Staple', 'Gaffer Tape'];
const zName = (s: GameState, r: Rng, city: string): string => { const i = r.int(0, PT.length - 1); const c = cityById[city]?.name.pt ?? city; return cityById[city]?.market === 'br' ? `${PT[i]} ${c}` : `${EN[i]} ${c}`; };

// ================================================================ fanzines e cenas
function birth(s: GameState, city: string, g: string, by: 'npc' | 'player', name: string, reach: number): Zine19 {
  const st = zn19(s);
  const z: Zine19 = { id: `zn${++st.seq}`, name, city, g, y: s.year, k: zineKind19(s), by, reach };
  st.z.push(z); if (st.z.length > 80) st.z.splice(0, st.z.length - 80);
  cnt(s, 'zine');
  emitFact(s, { kind: 'zine_founded', actors: by === 'player' ? ['player'] : [], place: city, severity: by === 'player' ? 30 : 20, visibility: 'public', tags: ['zines19', 'press', g], src: 'zines19', data: { z: z.id, g },
    text: fmtL(N('Nasce o {k} "{n}" em {c}, dedicado a {g}.', 'The {k} "{n}" launches in {c}, devoted to {g}.'), { k: z.k === 'blog' ? N('blog', 'blog') : N('fanzine', 'fanzine'), n: name, c: cityById[city]?.name ?? city, g: genreById[g]?.name ?? g }) });
  return z;
}
/** Funda um fanzine/blog seu (escolhe cidade e gênero). */
export const zineCost19 = (s: GameState) => money(s, s.year >= 2000 ? 1000 : 1500);
export function foundZine19(s: GameState, city: string, g: string, name: string): L | null {
  if (s.year < 1966) return N('Fanzines de música ainda não existem (1966+).', 'Music fanzines do not exist yet (1966+).');
  if (!cityById[city] || !genreById[g] || genreById[g].born > s.year) return N('Cidade ou gênero inválido.', 'Invalid city or genre.');
  if (zinesLive19(s).filter((z) => z.by === 'player').length >= 2) return N('Dois veículos próprios já tomam seu tempo.', 'Two outlets of your own already take your time.');
  const c = zineCost19(s);
  if (freeCash20(s) < c) return cashWhy20(s, c, N('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `zn19found:${s.week}`, -c, 'capex', `Fundação: ${name}`);
  const z = birth(s, city, g, 'player', name.trim() || 'Ruído', 12 + Math.round(pr18(s).reach / 5));
  logZ(s, fmtL(N('Você funda "{n}" em {c}.', 'You launch "{n}" in {c}.'), { n: z.name, c: cityById[city]?.name ?? city }));
  return null;
}
export function closeZine19(s: GameState, id: string): L {
  const z = zn19(s).z.find((x) => x.id === id && x.by === 'player' && !x.end);
  if (!z) return N('Nada a fechar.', 'Nothing to close.');
  z.end = s.week; return N('Último número impresso.', 'Last issue printed.');
}
function zineScene(s: GameState, city: string, g: string, z?: Zine19): ZScene19 {
  const st = zn19(s);
  const x: ZScene19 = { id: `zs${++st.seq}`, city, g, y: s.year, to: s.year + 5, zine: z?.id ?? '' };
  st.sc.push(x); if (st.sc.length > 40) st.sc.shift();
  st.heat[hk(city, g)] = 0;
  s.genrePop[g] = clamp((s.genrePop[g] ?? 0.6) + 0.1, 0.15, 2.2);
  addHype(s, `s:${city}:${g}`, 'zines19', N('Cena puxada pelos fanzines', 'Scene driven by fanzines'), 10);
  cnt(s, 'scene');
  emitFact(s, { kind: 'zine_scene', actors: z?.by === 'player' ? ['player'] : [], place: city, severity: 40, visibility: 'public', tags: ['zines19', 'scene', g], src: 'zines19', data: { g, sc: x.id, ...(z ? { z: z.id } : {}) },
    text: fmtL(N('Os fanzines criaram uma cena: {g} em {c} lota clubes e chama a atenção das gravadoras.', 'The fanzines built a scene: {g} in {c} packs clubs and draws the labels\' attention.'), { g: genreById[g]?.name ?? g, c: cityById[city]?.name ?? city }) });
  return x;
}
onFact('zine_founded', (s, f) => {
  // a imprensa grande repara; quem é crítico (press18) na mesma cidade ganha leitores da cena
  if (f.place === s.config.homeCity) { const p = pr18(s); p.reach = clamp(p.reach + 0.5, 0, 100); }
  logZ(s, f.text);
}, 'zines19:press');
onFact('zine_scene', (s, f) => {
  const g = String(f.data?.g ?? '');
  for (const a of actsNow27(s)) if (a.city === f.place && (a.genre === g || familyOf(a.genre) === familyOf(g)) && a.status !== 'retired') { a.momentum = clamp(a.momentum + 4, -100, 100); if (a.owner === 'player') addHype(s, `a:${a.id}`, 'zines19', N('Cena dos fanzines', 'Fanzine scene'), 4); }
  headline19(s, f.text, 2);
  remember(s, 'zines19', f.text, { important: f.actors.includes('player') });
  lk18(s).log.unshift([s.week, 'zines19', f.text]);
}, 'zines19:scene');
// corrida do ouro (Frente 7): fanzines da cidade ganham leitores; a ressaca (bust) fecha fanzines
onFact('scene_boom', (s, f) => { for (const z of zinesLive19(s)) if (z.city === f.place) z.reach = clamp(z.reach + 5, 0, 60); }, 'zines19:boom');
onFact('scene_bust', (s, f) => {
  for (const z of zinesLive19(s)) if (z.city === f.place && z.by === 'npc') z.end = s.week;
  for (const k of Object.keys(zn19(s).heat)) if (k.startsWith(`${f.place}|`)) zn19(s).heat[k] = 0;
}, 'zines19:bust');

// ================================================================ revista comprada, linha editorial, conflito de interesse
export const ownOutlet19 = (s: GameState): Outlet17 | undefined => { const o = zn19(s).own; return o ? OUTLETS17.find((x) => x.id === o.oid) : undefined; };
export const buyable19 = (s: GameState): Outlet17[] => OUTLETS17.filter((o) => s.year >= o.from && s.year <= o.to && ['magazine', 'fanzine', 'blog', 'newspaper'].includes(o.kind) && o.line !== 'tabloid');
export const outletPrice19 = (s: GameState, o: Outlet17): number => money(s, 4000 + o.reach * o.cred * 25);
export function buyOutlet19(s: GameState, oid: string): L | null {
  const st = zn19(s), o = OUTLETS17.find((x) => x.id === oid);
  if (!o || !buyable19(s).includes(o)) return N('Esse veículo não está à venda.', 'That outlet is not for sale.');
  if (st.own) return N('Você já tem uma revista.', 'You already own a magazine.');
  if (exact(s) && o.real) return N('Em "Vida real exata", os veículos reais seguem a história: funde o seu próprio.', 'In "Exact real life", real outlets follow history: found your own.');
  const v = outletPrice19(s, o);
  if (freeCash20(s) < v) return cashWhy20(s, v, N('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `zn19buy:${oid}`, -v, 'acquisitions', `Compra da revista ${o.name}`);
  st.own = { oid, y: s.year, line: 'indep', paid: v };
  cnt(s, 'buy');
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 40, visibility: 'public', tags: ['zines19', 'press', 'acquisition'], src: 'zines19', text: fmtL(N('O selo compra a revista {o}.', 'The label buys the magazine {o}.'), { o: o.name }) });
  return null;
}
export function sellOutlet19(s: GameState): L {
  const st = zn19(s), o = ownOutlet19(s);
  if (!st.own || !o) return N('Nada a vender.', 'Nothing to sell.');
  const v = Math.round(outletPrice19(s, o) * (st.coi > 30 ? 0.5 : 0.8));
  post(s, `zn19sell:${o.id}:${s.week}`, v, 'asset_sales', `Venda da revista ${o.name}`);
  st.own = undefined; st.coi = 0;
  return N('Revista vendida.', 'Magazine sold.');
}
export function setLine19(s: GameState, line: 'indep' | 'house'): L | null { const o = zn19(s).own; if (!o) return N('Você não tem revista.', 'You own no magazine.'); o.line = line; return null; }
/** Críticos disponíveis para editar sua revista (do mercado da revista ou globais, na ativa). */
export const editorsFor19 = (s: GameState): typeof CRITICS17 => { const o = ownOutlet19(s); return o ? CRITICS17.filter((c) => s.year >= c.from && s.year <= c.to && (c.region === 'global' || o.market === 'global' || c.region === o.market) && !(exact(s) && c.real)) : []; };
export const editorPay19 = (s: GameState, prestige: number) => money(s, 200 + prestige * 6);
export function hireEditor19(s: GameState, name: string): L | null {
  const st = zn19(s), o = ownOutlet19(s), c = CRITICS17.find((x) => x.name === name);
  if (!st.own || !o || !c) return N('Sem revista ou sem crítico.', 'No magazine or no critic.');
  st.own.ed = c.name;
  st.ed[o.id] = { c: c.name, fav: c.favors, y: s.year };
  emitFact(s, { kind: 'critic_editor', actors: ['player'], severity: 30, visibility: 'public', tags: ['zines19', 'press', 'player'], src: 'zines19', data: { c: c.name, o: o.id }, text: fmtL(N('O crítico {c} vira editor da {o}.', 'Critic {c} becomes editor of {o}.'), { c: c.name, o: o.name }) });
  return null;
}
onFact('critic_editor', (s, f) => {
  const oid = String(f.data?.o ?? ''), o = OUTLETS17.find((x) => x.id === oid);
  const c = CRITICS17.find((x) => x.name === String(f.data?.c ?? ''));
  if (o && c) zn19(s).ed[oid] = { c: c.name, fav: c.favors, y: s.year };
  if (f.actors.includes('player')) { const p = pr18(s); p.cred = clamp(p.cred + 3, 0, 100); }
  logZ(s, f.text);
}, 'zines19:editor');
onFact('conflict_interest', (s, f) => {
  const st = zn19(s), p = pr18(s);
  p.cred = clamp(p.cred - 12, 0, 100);
  const top = mine(s).sort((a, b) => b.fame - a.fame)[0];
  if (top) scandal(s, top.id, 'conduct', 30, [f.id], { tags: ['zines19', 'press'] });
  s.player.reputation.artistic = clamp(s.player.reputation.artistic - 3, 0, 100);
  st.coi = 0;
  for (const z of zinesLive19(s)) if (z.by === 'player') z.reach = clamp(z.reach - 6, 0, 60);
  headline19(s, f.text, 2);
  logZ(s, f.text);
}, 'zines19:coi');
export function coi19(s: GameState, how: 'disclose' | 'double' | 'sell'): L {
  const st = zn19(s);
  if (how === 'disclose') { st.coi = Math.round(st.coi * 0.3); if (st.own) st.own.line = 'indep'; const p = pr18(s); p.cred = clamp(p.cred + 2, 0, 100); return N('Nota da redação: "esta revista pertence a um selo". Leitores agradecem a franqueza.', 'Editor\'s note: "this magazine belongs to a label". Readers appreciate the candour.'); }
  if (how === 'sell') return sellOutlet19(s);
  st.coi += 10; return N('Você dobra a aposta: a revista segue elogiando a casa.', 'You double down: the magazine keeps praising the house.');
}
registerInboxKind('zn19_coi', { label: N('Redação', 'Newsroom'), cat: 'press', icon: 'newspaper', prio: 2, goto: () => ({ area: 'zines19' }), handle: (s, _m, a) => coi19(s, a as 'disclose' | 'double' | 'sell') });
registerConseq18('ib:zn19_coi:disclose', { later: [{ in: [3, 9], p: 0.5, tone: 'good', hint: N('Transparência rende crédito.', 'Transparency earns credit.'), fx: (f) => { f.rep('artistic', 1); return N('A nota de transparência virou exemplo citado em outras redações.', 'The disclosure note became an example quoted in other newsrooms.'); } }] });
registerConseq18('ib:zn19_coi:double', { later: [{ in: [2, 8], p: 0.5, tone: 'bad', hint: N('Leitores contam elogios.', 'Readers count the praise.'), fx: (f) => { zn19(f.s).coi += 15; return N('Um blog rival contou: 9 de 10 capas da sua revista são do seu selo.', 'A rival blog counted: 9 of your magazine\'s 10 covers are your own label\'s acts.'); } }] });
registerConseq18('ib:zn19_coi:sell', { later: [{ in: [3, 12], p: 0.4, tone: 'mixed', hint: N('Sem revista, sem voz própria.', 'No magazine, no voice of your own.'), fx: (f) => { f.momentum(-2); return N('Sem a revista, os lançamentos do selo perderam a vitrine da casa.', 'Without the magazine, the label\'s releases lost their house showcase.'); } }] });

// apelo: cena dos fanzines (atos da cidade/gênero), revista "da casa" e o gosto do editor de um veículo grande
registerMod('appeal', 'zines19', (s, v, c) => {
  const a = c.release ? s.acts[c.release.actId] : c.act;
  if (!a) return null;
  let m = 1; const why: string[] = [];
  if (zScenesLive19(s).some((x) => x.city === a.city && (x.g === a.genre || familyOf(x.g) === familyOf(a.genre)))) { m *= 1.05; why.push('scene'); }
  const st = zn19(s);
  if (st.own && st.own.line === 'house' && c.release && (c.release.owner === 'player' || a.playerBand)) { m *= 1.04; why.push('house'); }
  const fam = familyOf(a.genre);
  if (Object.entries(st.ed).some(([oid, e]) => e.fav.includes(fam) && (OUTLETS17.find((o) => o.id === oid)?.reach ?? 0) >= 60)) { m *= 1.02; why.push('editor'); }
  return m !== 1 ? { value: v * m, label: N('Fanzines, revista e editores', 'Fanzines, magazine and editors') } : null;
});

// ================================================================ cartão: fanzine pede apoio / entrevista
const zineCard: EventDef = {
  id: 'zn19_interview', cat: 'market', tone: 'neutral', tags: ['zines19'], cooldown: 12, weight: 0.4,
  find: (s, r) => {
    const z = zinesLive19(s).filter((x) => x.by === 'npc'); if (!z.length || !r.chance(0.08)) return null;
    const zz = r.pick(z);
    const a = mine(s).filter((x) => x.city === zz.city || familyOf(x.genre) === familyOf(zz.g)).sort((x, y) => y.fame - x.fame)[0];
    return a ? { act: a.id, x: zz.name, z: zz.id } : null;
  },
  title: N('O fanzine "{x}" quer {act}', 'The fanzine "{x}" wants {act}'),
  text: N('Três pessoas, uma copiadora e quinhentos leitores que mandam na cena: "{x}" quer entrevistar {act} — e pergunta se o selo compra um anúncio para ajudar a imprimir.', 'Three people, a photocopier and five hundred readers who rule the scene: "{x}" wants to interview {act} — and asks if the label will buy an ad to help print it.'),
  options: [
    { id: 'both', label: N('Entrevista e anúncio', 'Interview and ad'), hint: N('Barato; a cena gosta, a imprensa grande pode chamar de "comprado".', 'Cheap; the scene likes it, the big press may call it "bought".'), apply: (s, _r, c) => { post(s, `zn19ad:${s.week}`, -money(s, 300), 'marketing', 'Anúncio em fanzine'); const z = zn19(s).z.find((x) => x.id === String(c.z)); if (z) z.reach = clamp(z.reach + 3, 0, 60); } },
    { id: 'talk', label: N('Só a entrevista', 'Interview only'), hint: N('Grátis; credibilidade de cena.', 'Free; scene credibility.'), apply: () => {} },
    { id: 'no', label: N('Não temos tempo para fanzine', 'No time for fanzines'), hint: N('Nada agora.', 'Nothing now.'), apply: () => {} },
  ],
};
registerConseq18('ev:zn19_interview:both', { later: [{ in: [1, 4], p: 0.6, tone: 'mixed', hint: N('A cena lembra quem ajudou a imprimir.', 'The scene remembers who helped print.'), fx: (f) => { f.fans(4).momentum(3); return N('A entrevista no fanzine circulou de mão em mão; o anúncio ajudou a imprimir o dobro.', 'The fanzine interview passed from hand to hand; the ad helped print twice as many.'); }, miss: (f) => { f.rep('artistic', -1); return N('Um jornalista de revista grande ironizou o "fanzine patrocinado".', 'A big-magazine journalist mocked the "sponsored fanzine".'); } }] });
registerConseq18('ev:zn19_interview:talk', { later: [{ in: [1, 4], p: 0.55, tone: 'good', hint: N('Credibilidade de cena não se compra.', 'Scene credibility cannot be bought.'), fx: (f) => { f.fans(3).rep('artistic', 1); return N('A entrevista sem anúncio deu à banda fama de "gente da cena".', 'The ad-free interview gave the band a "one of us" reputation.'); } }] });
registerConseq18('ev:zn19_interview:no', { later: [{ in: [2, 6], p: 0.35, tone: 'mixed', hint: N('Fanzine tem memória.', 'Fanzines have memories.'), fx: (f) => { f.momentum(-2); return N('O fanzine escreveu que o selo "esqueceu de onde veio".', 'The fanzine wrote that the label "forgot where it came from".'); } }] });
deferEvents<EventDef>([zineCard]);
export const ZINES19_EVENTS = ['zn19_interview'];

// ================================================================ mês
registerSimHook('month', 'zines19', (s) => {
  const r = rng19(s, 'zn19');
  const st = zn19(s);
  // 1) nascimentos (NPC): onde um gênero cresce numa cidade e ainda não há cena
  if (s.year >= 1966 && zinesLive19(s).filter((z) => z.by === 'npc').length < 14 && r.chance(s.year >= 1976 && s.year <= 1998 ? 0.3 : 0.15)) {
    const pool: [string, string, number][] = [];
    for (const a of actsNow27(s)) {
      if (a.fame < 8 || a.fame > 60 || a.status === 'retired' || a.status === 'split' || (s.genrePop[a.genre] ?? 0.6) < 0.8) continue;
      if (!sceneAt(s, a.city, a.genre) && !zinesLive19(s).some((z) => z.city === a.city && z.g === a.genre)) pool.push([a.city, a.genre, 1 + (s.genrePop[a.genre] ?? 0.6)]);
      if (pool.length > 60) break;
    }
    if (pool.length) { const [city, g] = r.weighted(pool, (x) => x[2])!; birth(s, city, g, 'npc', zName(s, r, city), r.int(4, 14)); }
  }
  // 2) calor e cenas; fim natural dos fanzines (NPC)
  for (const k of Object.keys(st.heat)) { st.heat[k] *= 0.95; if (st.heat[k] < 0.5) delete st.heat[k]; }
  for (const z of zinesLive19(s)) {
    const k = hk(z.city, z.g);
    st.heat[k] = (st.heat[k] ?? 0) + z.reach / (z.by === 'player' ? 6 : 8);
    if (st.heat[k] >= SCENE_HEAT19 && !sceneAt(s, z.city, z.g)) zineScene(s, z.city, z.g, z);
    if (z.by === 'player') post(s, `zn19run:${z.id}:${s.year}-${s.month}`, -money(s, 60 + z.reach * 4), 'marketing', `Impressão: ${z.name}`);
    else if (s.year - z.y >= 2 && r.chance(0.02)) z.end = s.week;
  }
  // 3) revista própria: receita, custo, editor e conflito de interesse
  const o = ownOutlet19(s);
  if (st.own && o) {
    if (s.year > o.to) { st.own = undefined; logZ(s, N('Sua revista fechou com o fim da época dela.', 'Your magazine closed as its era ended.')); }
    else {
      const ed = st.own.ed ? CRITICS17.find((c) => c.name === st.own!.ed) : undefined;
      post(s, `zn19rev:${o.id}:${s.year}-${s.month}`, money(s, o.reach * 45 * (st.own.line === 'house' ? 0.9 : 1) * (ed ? 1.15 : 1)), 'services', `Vendas e anúncios: ${o.name}`);
      post(s, `zn19cost:${o.id}:${s.year}-${s.month}`, -money(s, o.reach * 32 + (ed ? 200 + ed.prestige * 6 : 0)), 'admin', `Redação e gráfica: ${o.name}`);
    }
  }
  const house = (st.own?.line === 'house') || zinesLive19(s).some((z) => z.by === 'player' && mine(s).some((a) => a.city === z.city && a.genre === z.g));
  const recent = releasesNow27(s).some((x) => x.owner === 'player' && s.week - x.week <= 8 && s.week >= x.week);
  st.coi = house && recent ? st.coi + (st.own?.line === 'house' ? 6 : 3) : st.coi * 0.9;
  if (st.coi >= 30 && s.week - st.coiW > 26) {
    st.coiW = s.week;
    pushInbox18(s, 'zn19_coi', { from: N('Cartas dos leitores', 'Letters page').pt, subject: N('Leitores perguntam: quem manda na redação?', 'Readers ask: who runs the newsroom?'),
      body: N('Cartas apontam que seus veículos elogiam demais os discos do selo. Abrir o jogo (nota de transparência, linha independente), dobrar a aposta ou vender a revista.', 'Letters point out that your outlets praise the label\'s records too much. Come clean (disclosure note, independent line), double down or sell the magazine.'),
      actions: [{ id: 'disclose', label: N('Abrir o jogo', 'Come clean') }, { id: 'sell', label: N('Vender a revista', 'Sell the magazine') }, { id: 'double', label: N('Dobrar a aposta', 'Double down') }], weeks: 4 });
  }
  if (st.coi > 0 && r.chance(clamp((st.coi - 20) / 250, 0, 0.2))) {
    emitFact(s, { kind: 'conflict_interest', actors: ['player'], severity: 45, visibility: 'public', tags: ['zines19', 'press', 'conflict'], src: 'zines19',
      text: N('Exposto: os veículos do selo elogiavam os próprios discos sem avisar os leitores.', 'Exposed: the label\'s outlets praised its own records without telling readers.') });
  }
  // 4) críticos viram editores (uma vez por ano, só críticos fictícios no modo exato)
  if (s.month === 0 && r.chance(0.5)) {
    const cs = CRITICS17.filter((c) => s.year >= c.from && s.year <= c.to && c.prestige >= 60 && !(exact(s) && c.real));
    const os = OUTLETS17.filter((x) => s.year >= x.from && s.year <= x.to && (x.kind === 'magazine' || x.kind === 'blog') && x.id !== st.own?.oid && !st.ed[x.id]);
    if (cs.length && os.length) {
      const c = r.pick(cs); const pickO = os.filter((x) => x.market === c.region || x.market === 'global' || c.region === 'global');
      const ox = pickO.length ? r.pick(pickO) : undefined;
      if (ox && !Object.values(st.ed).some((e) => e.c === c.name)) emitFact(s, { kind: 'critic_editor', actors: [], severity: 25, visibility: 'public', tags: ['zines19', 'press'], src: 'zines19', data: { c: c.name, o: ox.id },
        text: fmtL(N('O crítico {c} assume a redação da {o}: a revista passa a puxar para {f}.', 'Critic {c} takes over {o}: the magazine now leans towards {f}.'), { c: c.name, o: ox.name, f: c.favors.join(', ') }) });
    }
  }
});

// ================================================================ calendário, porquê, conselheiro, ligação
registerDeadline('zines19', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const z of zinesLive19(s)) if (z.by === 'player') { const h = zn19(s).heat[hk(z.city, z.g)] ?? 0; if (h >= SCENE_HEAT19 * 0.7 && !sceneAt(s, z.city, z.g)) out.push({ id: `zines19-scene-${z.id}`, w: Math.min(to, from + 8), w0: from, kind: 'other', tone: 'good', t: fmtL(N('"{n}" pode acender uma cena ({h}/{t})', '"{n}" may ignite a scene ({h}/{t})'), { n: z.name, h: Math.round(h), t: SCENE_HEAT19 }), goto: { area: 'zines19' } }); }
  return out;
});
registerExplain('zn19.heat', (s, c) => {
  const city = String(c.c ?? ''), g = String(c.g ?? '');
  const zs = zinesLive19(s).filter((z) => z.city === city && z.g === g);
  const h = zn19(s).heat[hk(city, g)] ?? 0;
  return { title: fmtL(N('Calor da cena: {g} em {c}', 'Scene heat: {g} in {c}'), { g: genreById[g]?.name ?? g, c: cityById[city]?.name ?? city }), value: Math.round(h), fmt: 'num',
    parts: [...zs.map((z) => ({ label: fmtL(N('"{n}" (alcance {r})', '"{n}" (reach {r})'), { n: z.name, r: z.reach }), value: Math.round((z.reach / (z.by === 'player' ? 6 : 8)) * 10) / 10, fmt: 'signed' as const })),
      { label: N('Esfria 5% ao mês', 'Cools 5% a month'), value: -Math.round(h * 0.05 * 10) / 10, fmt: 'signed', tone: 'bad' },
      ...(sceneAt(s, city, g) ? [{ label: N('Já existe uma cena aqui', 'A scene already exists here'), value: '—', fmt: 'text' as const }] : [])],
    note: fmtL(N('Com {t} nasce uma cena: gênero em alta, hype e +5% de apelo para os atos de lá por 5 anos.', 'At {t} a scene is born: the genre rises, hype and +5% appeal for local acts for 5 years.'), { t: SCENE_HEAT19 }) };
});
registerExplain('zn19.coi', (s) => {
  const st = zn19(s);
  return { title: N('Conflito de interesse', 'Conflict of interest'), value: Math.round(st.coi), fmt: 'num', parts: [
    { label: N('Revista na linha "da casa"', 'Magazine on the "house" line'), value: st.own?.line === 'house' ? 6 : 0, fmt: 'signed' },
    { label: N('Fanzine seu cobrindo a cena dos seus atos', 'Your fanzine covering your acts\' scene'), value: zinesLive19(s).some((z) => z.by === 'player') ? 3 : 0, fmt: 'signed' },
    { label: N('Chance de exposição por mês', 'Exposure chance per month'), value: clamp((st.coi - 20) / 250, 0, 0.2), fmt: 'pct' }],
    note: N('Sobe nos meses com lançamento seu e veículo "da casa"; cai 10% ao mês na linha independente.', 'Rises in months with your releases and a "house" outlet; falls 10% a month on the independent line.') };
});
registerAdvisorTip('zines19', (s) => {
  const out = [];
  const st = zn19(s);
  if (st.coi >= 25) out.push({ id: 'zn19-coi', level: 'warn' as const, score: 50, text: N('Seus veículos estão elogiando demais a casa.', 'Your outlets are praising the house too much.'), why: [fmtL(N('Conflito de interesse {v}.', 'Conflict of interest {v}.'), { v: Math.round(st.coi) })], goto: { area: 'zines19' },
    run: { label: N('Linha independente', 'Independent line'), fn: (s2: GameState) => setLine19(s2, 'indep') ?? N('Linha independente.', 'Independent line.') } });
  if (s.year >= 1966 && !zinesLive19(s).some((z) => z.by === 'player') && mine(s).length >= 2 && !sceneAt(s, s.config.homeCity, mine(s)[0].genre)) out.push({ id: 'zn19-found', level: 'info' as const, score: 25, text: N('Um fanzine na sua cidade pode acender uma cena para os seus atos.', 'A fanzine in your city could ignite a scene for your acts.'), goto: { area: 'zines19' } });
  return out;
});
if (!LINKS18.some((x) => x.id === 'zines19')) LINKS18.push({ id: 'zines19', a: N('Fanzines', 'Fanzines'), b: N('Cenas locais', 'Local scenes'), how: N('Fanzines esquentam uma cidade×gênero; com 25 de calor nasce uma cena (hype, gênero em alta, apelo local) que atrai gravadoras — e bandas-fantasma.', 'Fanzines heat a city×genre; at 25 heat a scene is born (hype, the genre rises, local appeal) that draws labels — and ghost bands.') });
