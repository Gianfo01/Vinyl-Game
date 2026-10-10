// Rodada 18 (media18, feedback #3 + M2) — POR QUE AS PESSOAS CONTINUAM OUVINDO. Cada lançamento do jogador tem
// uma mistura de FONTES DE DESCOBERTA (playlist, algoritmo, busca, vídeo, indicação, rádio, loja) que vem da época,
// da campanha (mkt18), dos canais de venda (outlets17), da estratégia do artista e de playlists editoriais. Cada
// fonte converte diferente: playlist traz muitos plays de quem nem sabe o nome do artista; busca e indicação trazem
// gente que volta. Ouvintes de uma vez × ouvintes que voltam × seguidores (fãs). A conversão é o que vende
// ingresso e sustenta a carreira (tours/live usam os fãs ativos e núcleo).
//   • Estratégia por artista: PICO (playlists, alcance, menos retorno) × BASE (indicação, retorno, catálogo vivo).
//   • Royalties PRÓ-RATA: cada território tem seu bolo (receita por usuário × assinantes pagantes); o seu repasse é
//     a sua fatia dos streams naquele bolo — fã que assina paga mais por play que ouvinte gratuito de vídeo.
//   • Dependência de uma playlist/plataforma: quem vive de uma fonte só pode cair de uma vez.
//   • Reativação: disco novo leva quem volta ao catálogo antigo.
//   • M2: pitch editorial com antecedência, impulso algorítmico por taxa de "salvar", comissão de alcance
//     (estilo Discovery Mode: −30% do royalty), fazendas de streams (crime: derrubada, multa, escândalo) e denúncia
//     de rivais.

import { Rng, clamp, seedState } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, l, marketById, type L, type MarketId } from '../../data/world';
import { registerExplain } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { STREAM_PAYOUT17 } from '../market';
import { MEDIA18 } from '../media18hook';
import { scandal } from '../scandal17';
import type { Act, GameState, Release } from '../types';
import { fmtL, hasTech, money, notify, playerActs, post, remember } from '../util';
import { addHeat, crime17 } from './crime17';
import { SRC18, type Src18 } from './mkt18';
import { out17 } from './outlets17';
import { w4 } from './world4/state';

export type Strat18 = 'peak' | 'bal' | 'base';
export const STRAT18: Record<Strat18, { name: L; desc: L }> = {
  peak: { name: l('Pico (alcance)', 'Peak (reach)'), desc: l('Playlists e algoritmo: +10% de unidades nas primeiras 10 semanas, mas quem chega por playlist volta pouco (conversão ×0,8). Mais risco de depender de uma fonte.', 'Playlists and algorithm: +10% units in the first 10 weeks, but playlist listeners rarely return (conversion ×0.8). More risk of depending on one source.') },
  bal: { name: l('Equilíbrio', 'Balanced'), desc: l('Mistura natural da época.', 'The era\'s natural mix.') },
  base: { name: l('Base duradoura', 'Lasting base'), desc: l('Indicação, busca e contato direto: −7% na estreia, conversão ×1,3, catálogo +12% (quem volta ouve os discos antigos) e mais assinantes pagantes (royalty por play maior).', 'Word of mouth, search and direct contact: −7% at debut, conversion ×1.3, catalog +12% (returning listeners play old records) and more paying subscribers (higher per-play royalty).') },
};

export interface StRel18 { src: Partial<Record<Src18, number>>; ret: number; L: number; R: number; F: number }
declare module '../types' { interface Release { st18?: StRel18 } }
export interface A18 { L: number; R: number; F: number; mL: number; mR: number; strat: Strat18; dm?: number; drop?: number; dropAt?: number; dep: number; depSrc?: Src18; hist: [number, number, number, number][]; src: Partial<Record<Src18, number>> }
export interface St18State {
  a: Record<string, A18>;
  farm: Record<string, { w: number; until: number; k: number }>;
  down: Record<string, number>;
  pitch: Record<string, { w: number; ok: boolean; p: number }>;
  edit: Record<string, number>;
  algo: Record<string, number>;
  black: Record<string, number>;
  n: { pitch: number; edit: number; algo: number; drop: number; farm: number; caught: number; report: number };
}
declare module '../ext4' { interface Ext4 { st18: St18State } }
const fresh = (): St18State => ({ a: {}, farm: {}, down: {}, pitch: {}, edit: {}, algo: {}, black: {}, n: { pitch: 0, edit: 0, algo: 0, drop: 0, farm: 0, caught: 0, report: 0 } });
registerExt4('st18', fresh);
export function st18(s: GameState): St18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.st18 ??= fresh()) as St18State;
  const o = st as unknown as Record<string, unknown>;
  if (!o.ok18) { const f = fresh(); for (const k of Object.keys(f) as (keyof St18State)[]) o[k] ??= f[k]; o.ok18 = 1; }
  return st;
}
export function a18(s: GameState, actId: string): A18 {
  const st = st18(s);
  return (st.a[actId] ??= { L: 0, R: 0, F: 0, mL: 0, mR: 0, strat: 'bal', dep: 0, hist: [], src: {} });
}
const mineRel = (s: GameState, rel: Release): boolean => rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand;
const streamingEra = (s: GameState): boolean => hasTech(s, 'streaming');

// ---------------------------------------------------------------- fontes de descoberta

/** quantos "ouvem" de cada fonte voltam (taxa de retorno) e quanto viram fã casual */
export const RET18: Record<Src18, number> = { pl: 0.1, alg: 0.18, srch: 0.4, vid: 0.12, wom: 0.35, radio: 0.15, store: 0.3 };
const CAS18: Record<Src18, number> = { pl: 1.15, alg: 1, srch: 0.7, vid: 1.3, wom: 0.9, radio: 1.1, store: 0.8 };
/** ouvintes por unidade-equivalente (para leitura) */
const LPU = 25;
const RET_NORM = 0.17;

export function baseMix18(s: GameState): Partial<Record<Src18, number>> {
  if (hasTech(s, 'short_video')) return { pl: 0.24, alg: 0.24, vid: 0.2, srch: 0.1, wom: 0.12, radio: 0.1 };
  if (hasTech(s, 'streaming')) return { pl: 0.28, alg: 0.2, srch: 0.14, wom: 0.14, vid: 0.12, radio: 0.12 };
  if (hasTech(s, 'internet')) return { radio: 0.3, store: 0.2, vid: 0.15, wom: 0.2, srch: 0.15 };
  if (hasTech(s, 'tv_music')) return { radio: 0.45, store: 0.25, vid: 0.15, wom: 0.15 };
  if (hasTech(s, 'radio')) return { radio: 0.55, store: 0.3, wom: 0.15 };
  return { store: 0.6, wom: 0.4 };
}

/** mistura de fontes de um lançamento (época + campanha + canais de venda + estratégia + playlists) */
export function mixOf18(s: GameState, rel: Release): Partial<Record<Src18, number>> {
  const m: Partial<Record<Src18, number>> = { ...baseMix18(s) };
  const add = (k: Src18, v: number) => { m[k] = (m[k] ?? 0) + v; };
  const E = rel.marketingE;
  for (const [k, v] of Object.entries(rel.mk18?.src ?? {})) add(k as Src18, 1.2 * E * (v ?? 0));
  const outs = out17(s).rel[rel.id] ?? [];
  if (outs.includes('video')) add('vid', 0.3);
  if (outs.includes('direct')) { add('srch', 0.15); add('wom', 0.1); }
  if (outs.includes('short_video')) { add('vid', 0.15); add('alg', 0.1); }
  if (outs.includes('window') || outs.includes('vinyl_special')) add('store', 0.2);
  const a = st18(s).a[rel.actId];
  if (streamingEra(s)) {
    if (a?.strat === 'peak') { add('pl', 0.25); add('alg', 0.1); }
    if (a?.strat === 'base') { add('wom', 0.2); add('srch', 0.1); }
    if (a?.dm) add('alg', 0.25);
    if ((st18(s).edit[rel.id] ?? 0) > s.week) add('pl', 0.35);
  } else if (a?.strat === 'base') add('wom', 0.15);
  const tot = Object.values(m).reduce((t, v) => t + (v ?? 0), 0) || 1;
  for (const k of Object.keys(m) as Src18[]) m[k] = (m[k] ?? 0) / tot;
  return m;
}

const qf18 = (q: number): number => clamp((q - 25) / 45, 0.3, 1.5);
const stratK = (a?: A18): number => (a?.strat === 'base' ? 1.3 : a?.strat === 'peak' ? 0.8 : 1);
/** taxa de retorno (quantos dos que ouviram voltam) */
export function retOf18(s: GameState, rel: Release): number {
  const m = rel.st18?.src ?? mixOf18(s, rel);
  const raw = (Object.keys(m) as Src18[]).reduce((t, k) => t + (m[k] ?? 0) * RET18[k], 0);
  return raw * qf18(rel.q) * stratK(st18(s).a[rel.actId]);
}

// conversão semanal: ouvintes → que voltam → fãs
MEDIA18.fans = (s, rel, act, units) => {
  if (!mineRel(s, rel) || units <= 0) return false;
  const st = st18(s);
  rel.st18 ??= { src: mixOf18(s, rel), ret: 0, L: 0, R: 0, F: 0 };
  const farm = st.farm[rel.id];
  const real = farm && farm.until > s.week ? units / farm.k : units; // streams de fazenda não viram fã
  const m = rel.st18.src;
  const ret = retOf18(s, rel);
  const cas = (Object.keys(m) as Src18[]).reduce((t, k) => t + (m[k] ?? 0) * CAS18[k], 0);
  const newActive = real * 0.006 * (ret / RET_NORM);
  act.fans.casual += Math.round(real * 0.1 * cas);
  act.fans.active += Math.round(newActive);
  rel.st18.ret = ret; rel.st18.L += real * LPU; rel.st18.R += real * LPU * ret; rel.st18.F += newActive;
  const a = a18(s, act.id);
  a.mL += real * LPU; a.mR += real * LPU * ret; a.F += newActive;
  return true;
};

// ---------------------------------------------------------------- royalties pró-rata

/** receita por usuário (relativa) e ajuste de assinantes pagantes por mercado */
export const ARPU18: Record<MarketId, number> = { na: 1, eu: 0.8, oceania: 0.85, asia: 0.42, latam: 0.28, br: 0.3, africa: 0.12 };
const PREM_ADJ: Record<MarketId, number> = { na: 0.1, eu: 0.08, oceania: 0.08, asia: -0.02, latam: -0.08, br: -0.08, africa: -0.12 };
/** fatia de assinantes pagantes (o resto ouve grátis com anúncio, que paga ~22% de um play pago) */
export const premOf18 = (y: number, m: MarketId): number => clamp(0.15 + (y - 2008) * 0.022, 0.15, 0.5) + PREM_ADJ[m];
const tierVal = (y: number, m: MarketId, skew: number): number => { const p = clamp(premOf18(y, m) + skew, 0.04, 0.92); return ARPU18[m] * (p + (1 - p) * 0.22); };
const homeMkt = (s: GameState): MarketId => cityById[s.config.homeCity]?.market ?? 'na';

export interface Payout18 { k: number; terr: { m: MarketId; w: number; v: number }[]; skew: number; ref: number; dil: number; dm: number; farm: number }
export function payout18(s: GameState, rel: Release): Payout18 {
  const y = s.year, home = homeMkt(s);
  const m = rel.st18?.src ?? mixOf18(s, rel);
  const ret = rel.st18?.ret || retOf18(s, rel);
  // fã que volta tende a assinar; quem chega por vídeo/playlist tende a ouvir grátis
  const skew = clamp((ret - RET_NORM) * 0.8 - (m.vid ?? 0) * 0.25 - (m.pl ?? 0) * 0.08, -0.2, 0.2);
  const terrs = (rel.territories.length ? rel.territories : [home]).filter((t) => marketById[t]);
  let num = 0, den = 0;
  const terr: Payout18['terr'] = [];
  for (const t of terrs) { const w = marketById[t].size(y); const v = tierVal(y, t, skew); num += w * v; den += w; terr.push({ m: t, w, v }); }
  const ref = tierVal(y, home, 0);
  const dil = 1 - clamp((y - 2015) * 0.008, 0, 0.12); // o bolo cresce menos que o número de streams
  const a = st18(s).a[rel.actId];
  const dm = a?.dm ? 0.7 : 1;
  const f = st18(s).farm[rel.id];
  const farm = f && f.until > s.week ? 1 / f.k : 1;
  // expandir para mercados baratos traz mais plays, cada um valendo menos (efeito suavizado: ^0,6)
  return { k: STREAM_PAYOUT17 * Math.pow(clamp((den ? num / den : ref) / ref, 0.3, 1.8), 0.6) * dil * dm * farm, terr, skew, ref, dil, dm, farm };
}
MEDIA18.payout = (s, rel, digital) => (digital.includes('streaming') && mineRel(s, rel) ? payout18(s, rel).k : null);

// ---------------------------------------------------------------- unidades: estratégia, playlists, fraude, catálogo

registerMod('chartUnits', 'st18', (s, v, c) => {
  const rel = c.release;
  if (!rel || !mineRel(s, rel)) return null;
  const st = st18(s), a = st.a[rel.actId], age = s.week - rel.week;
  let k = 1;
  let lab: L | undefined;
  const set = (x: number, t: L) => { k *= x; if (!lab || Math.abs(x - 1) > 0.05) lab = t; };
  if ((st.down[rel.id] ?? 0) > s.week) return { value: v * 0.1, label: l('Faixa derrubada por fraude de streams', 'Track taken down for stream fraud') };
  const f = st.farm[rel.id];
  if (f && f.until > s.week) set(f.k, l('Streams comprados (fazenda)', 'Bought streams (farm)'));
  if (streamingEra(s)) {
    if (a?.strat === 'peak' && age < 10) set(1.1, l('Estratégia de pico', 'Peak strategy'));
    if (a?.strat === 'base') set(age < 10 ? 0.93 : age > 26 ? 1.12 : 1, l('Estratégia de base', 'Base strategy'));
    if (a?.dm && age < 26) set(1.12, l('Comissão de alcance (algoritmo)', 'Reach commission (algorithm)'));
    if ((st.edit[rel.id] ?? 0) > s.week) set(1.3, l('Playlist editorial', 'Editorial playlist'));
    if ((st.algo[rel.id] ?? 0) > s.week) set(1.12, l('O algoritmo gostou (muita gente salvou)', 'The algorithm liked it (many saves)'));
    if (a?.drop && a.drop > s.week) set(1 - 0.35 * a.dep, l('Saiu da playlist da qual dependia', 'Dropped from the playlist it depended on'));
  }
  // reativação: disco novo leva quem volta ao catálogo
  const act = s.acts[rel.actId];
  if (act && age > 26 && s.week - act.lastRelease < 10 && act.lastRelease !== rel.week) {
    const r = a && a.L > 0 ? a.R / (a.L + a.R) : 0.1;
    set(1 + Math.min(0.5, 0.1 + r), l('Disco novo reativa o catálogo', 'New record revives the catalog'));
  }
  return k !== 1 ? { value: v * k, label: lab } : null;
});

// ---------------------------------------------------------------- ações do jogador

export function setStrat18(s: GameState, actId: string, k: Strat18): void { a18(s, actId).strat = k; }
export const dmOpen18 = (s: GameState): boolean => streamingEra(s) && s.year >= 2019;
export function setDm18(s: GameState, actId: string, on: boolean): L | null {
  if (!dmOpen18(s)) return l('A comissão de alcance só existe nas plataformas a partir de 2019.', 'Reach commissions only exist on platforms from 2019.');
  a18(s, actId).dm = on ? 1 : 0;
  return null;
}

/** chance (com porquê) de uma playlist editorial aceitar o single */
export function pitchOdds18(s: GameState, rel: Release): { p: number; why: L[] } {
  const why: L[] = [];
  const act = s.acts[rel.actId];
  const age = s.week - rel.week;
  let p = 0.12;
  why.push(l('Base: 12% (centenas de envios por semana)', 'Base: 12% (hundreds of pitches a week)'));
  const qk = (rel.q - 50) / 150; p += qk; why.push(fmtL(l('Qualidade {q}: {v}', 'Quality {q}: {v}'), { q: Math.round(rel.q), v: sg(qk) }));
  const so = rel.songs.map((x) => s.songs[x]).find(Boolean);
  if (so) { const hk = (so.melody - 55) / 250; p += hk; why.push(fmtL(l('Refrão: {v}', 'Hook: {v}'), { v: sg(hk) })); }
  const cur = (w4(s).payola.curator - 15) / 200; p += cur; why.push(fmtL(l('Relação com curadores: {v}', 'Curator relationship: {v}'), { v: sg(cur) }));
  if (act) { const fk = act.fame / 250; p += fk; why.push(fmtL(l('Fama: {v}', 'Fame: {v}'), { v: sg(fk) })); const gk = ((s.genrePop[act.genre] ?? 0.6) - 0.6) * 0.3; p += gk; why.push(fmtL(l('Gênero em alta: {v}', 'Genre trend: {v}'), { v: sg(gk) })); }
  if (age > 0) { const lk = -0.04 * age; p += lk; why.push(fmtL(l('Pitch atrasado ({w} sem. depois): {v}', 'Late pitch ({w} wk after): {v}'), { w: age, v: sg(lk) })); }
  if ((st18(s).black[rel.actId] ?? 0) > s.week) { p -= 0.25; why.push(l('Lista negra dos curadores (fraude): −25%', 'Curator blacklist (fraud): −25%')); }
  return { p: clamp(p, 0.02, 0.8), why };
}
const sg = (x: number) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}%`;

export function pitchPlaylist18(s: GameState, relId: string): L {
  const rel = s.releases[relId];
  if (!rel || !mineRel(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (!streamingEra(s)) return l('Ainda não existem playlists editoriais.', 'There are no editorial playlists yet.');
  const st = st18(s);
  if (st.pitch[relId]) return l('Este lançamento já foi apresentado aos curadores.', 'This release was already pitched.');
  if (s.week - rel.week > 4) return l('Tarde demais: curadores olham as novidades das últimas semanas.', 'Too late: curators look at the last few weeks\' releases.');
  const cost = money(s, 400);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `st18pitch:${relId}`, -cost, 'promo', `Pitch para playlists: ${rel.title}`);
  const o = pitchOdds18(s, rel);
  const ok = new Rng(seedState(`st18pitch|${s.config.seed}|${relId}`)).chance(o.p);
  st.pitch[relId] = { w: s.week, ok, p: o.p };
  st.n.pitch++;
  if (!ok) return fmtL(l('Os curadores passaram ({p}% de chance).', 'Curators passed ({p}% chance).'), { p: Math.round(o.p * 100) });
  st.edit[relId] = s.week + 8;
  st.n.edit++;
  if (rel.st18) rel.st18.src = mixOf18(s, rel);
  emitFact(s, { kind: 'playlist', actors: [rel.actId, 'player'], severity: 25, visibility: 'public', tags: ['media', 'streaming'], text: fmtL(l('"{t}" entra numa playlist editorial.', '"{t}" lands on an editorial playlist.'), { t: rel.title }), src: 'st18' });
  return fmtL(l('Entrou numa playlist editorial! +30% de unidades por 8 semanas (mas quem chega por playlist volta pouco).', 'Landed on an editorial playlist! +30% units for 8 weeks (but playlist listeners rarely return).'), {});
}

export const FARM18 = [{ real: 3000, k: 1.35, name: l('Pacote pequeno (bots)', 'Small package (bots)') }, { real: 12000, k: 1.8, name: l('Fazenda de celulares', 'Phone farm') }];
/** chance mensal de a plataforma detectar a fazenda (melhora com os anos) */
export const farmRisk18 = (s: GameState, tier: number): number => clamp(0.08 + (s.year - 2015) * 0.025, 0.06, 0.45) * (tier ? 1.4 : 1);
export function buyStreams18(s: GameState, relId: string, tier: number): L {
  const rel = s.releases[relId], d = FARM18[tier];
  if (!rel || !d || !mineRel(s, rel)) return l('Inválido.', 'Invalid.');
  if (!streamingEra(s)) return l('Sem streaming, não há o que fraudar.', 'No streaming, nothing to fake.');
  const st = st18(s);
  if ((st.farm[relId]?.until ?? 0) > s.week) return l('Já há streams comprados neste lançamento.', 'This release already has bought streams.');
  const cost = money(s, d.real);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `st18farm:${relId}`, -cost, 'w4_payola', 'Divulgação digital (?)');
  st.farm[relId] = { w: s.week, until: s.week + 6, k: d.k };
  st.n.farm++;
  emitFact(s, { kind: 'stream_fraud', actors: ['player', rel.actId], severity: 30 + tier * 15, visibility: 'secret', tags: ['crime', 'fraud', 'streaming'], text: fmtL(l('O selo comprou streams falsos para "{t}".', 'The label bought fake streams for "{t}".'), { t: rel.title }), src: 'st18' });
  return fmtL(l('Contratado. Unidades ×{k} por 6 semanas; os falsos não viram fã nem royalty, e a plataforma procura ({r}%/mês).', 'Done. Units ×{k} for 6 weeks; fakes become neither fans nor royalties, and the platform is looking ({r}%/month).'), { k: d.k, r: Math.round(farmRisk18(s, tier) * 100) });
}

function caught(s: GameState, rel: Release, tier: number): void {
  const st = st18(s), act = s.acts[rel.actId];
  st.down[rel.id] = s.week + 10;
  st.black[rel.actId] = s.week + 52;
  delete st.farm[rel.id];
  st.n.caught++;
  const fine = money(s, 4000 + tier * 8000);
  post(s, `st18fine:${rel.id}`, -fine, 'legal', 'Multa da plataforma (fraude de streams)');
  const text = fmtL(l('Plataformas derrubam "{t}" de {a}: streams falsos detectados. Multa e lista negra dos curadores.', 'Platforms take down "{t}" by {a}: fake streams detected. Fine and curator blacklist.'), { t: rel.title, a: act?.name ?? '' });
  emitFact(s, { kind: 'stream_fraud', actors: ['player', rel.actId], severity: 55, visibility: 'public', tags: ['crime', 'fraud', 'streaming', 'scandal'], text, src: 'st18' });
  if (act) { scandal(s, act.id, 'money', 35 + tier * 10, text); if (!act.playerBand) act.trust = clamp(act.trust - 10, 0, 100); }
  addHeat(s, 'player', countryOfCity(s.config.homeCity) ?? 'USA', 6 + tier * 6);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
  remember(s, 'stream_fraud', text, { actId: rel.actId, important: true });
  pushInbox18(s, 'st18_down', { from: 'StreamGuard', subject: l('Faixa derrubada', 'Track taken down'), body: fmtL(l('{t}\nPor quê: picos de plays de contas sem histórico, cidades improváveis, nenhuma playlist salva. A faixa volta em 10 semanas; curadores evitam o artista por 1 ano.', '{t}\nWhy: play spikes from accounts with no history, unlikely cities, no saved playlists. The track returns in 10 weeks; curators avoid the act for a year.'), { t: text }), tone: 'bad', ref: { act: rel.actId } });
  notify(s, text, 'bad');
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'st18', (s) => {
  const st = st18(s);
  const r = new Rng(seedState(`st18|${s.config.seed}|${s.year * 12 + s.month}`));
  const mine = playerActs(s);
  for (const id of mine) {
    const a = a18(s, id), act = s.acts[id];
    if (!act) continue;
    a.L = a.mL; a.R = a.R * 0.88 + a.mR; a.F *= 0.99; a.mL = 0; a.mR = 0;
    a.hist.push([s.year, s.month, Math.round(a.L), Math.round(a.R)]);
    if (a.hist.length > 36) a.hist.shift();
    // dependência: maior fonte entre playlist/algoritmo/vídeo nos lançamentos vivos (ponderada pelas unidades recentes)
    const src: Partial<Record<Src18, number>> = {};
    let U = 0;
    for (const rid of act.releases.slice(-8)) {
      const rel = s.releases[rid];
      if (!rel?.st18 || !rel.live) continue;
      const u = rel.weekly.slice(-4).reduce((t, x) => t + x, 0);
      U += u;
      for (const [k, v] of Object.entries(rel.st18.src)) src[k as Src18] = (src[k as Src18] ?? 0) + u * (v ?? 0);
    }
    if (U > 0) for (const k of Object.keys(src) as Src18[]) src[k] = (src[k] ?? 0) / U;
    a.src = src;
    const top = (['pl', 'alg', 'vid'] as Src18[]).sort((x, y) => (src[y] ?? 0) - (src[x] ?? 0))[0];
    a.dep = src[top] ?? 0; a.depSrc = top;
    if (streamingEra(s) && a.dep > 0.42 && U > 0 && !(a.drop && a.drop > s.week) && s.week - (a.dropAt ?? -999) > 26 && r.chance((a.dep - 0.42) * 0.2)) {
      a.drop = s.week + 8; a.dropAt = s.week; st.n.drop++;
      pushInbox18(s, 'st18_drop', { from: t18(SRC18[top]), subject: fmtL(l('{a} perdeu a vaga', '{a} lost its slot'), { a: act.name }), body: fmtL(l('A principal fonte de plays de {a} ({s}, {p}% dos ouvintes) tirou o artista da rotação. Unidades −{d}% por 8 semanas.\nPor quê: quem depende de uma só playlist/plataforma cai junto com ela. Estratégia de base e busca/indicação diluem o risco.', '{a}\'s main source of plays ({s}, {p}% of listeners) dropped the act from rotation. Units −{d}% for 8 weeks.\nWhy: depending on one playlist/platform means falling with it. A base strategy and search/word of mouth spread the risk.'), { a: act.name, s: SRC18[top], p: Math.round(a.dep * 100), d: Math.round(a.dep * 35) }), tone: 'bad', ref: { act: id } });
    }
    // impulso algorítmico: muita gente salvou (taxa de retorno alta) nas primeiras semanas
    if (streamingEra(s)) for (const rid of act.releases.slice(-4)) {
      const rel = s.releases[rid];
      if (!rel?.st18 || !rel.live || (st.algo[rid] ?? 0) > 0) continue;
      const age = s.week - rel.week;
      if (age < 2 || age > 20) continue;
      if (rel.st18.ret > 0.22 && r.chance(Math.min(0.6, (rel.st18.ret - 0.2) * 3))) {
        st.algo[rid] = s.week + 8; st.n.algo++;
        notify(s, fmtL(l('O algoritmo abraçou "{t}": quem ouve salva, e a plataforma recomenda mais.', 'The algorithm embraced "{t}": listeners save it, so the platform recommends it more.'), { t: rel.title }), 'good');
      }
    }
  }
  // fazendas: a plataforma procura
  for (const [rid, f] of Object.entries(st.farm)) {
    const rel = s.releases[rid];
    if (!rel) { delete st.farm[rid]; continue; }
    const tier = f.k > 1.5 ? 1 : 0;
    if (r.chance(farmRisk18(s, tier) * (f.until > s.week ? 1 : 0.35))) caught(s, rel, tier);
    else if (s.week - f.w > 30) delete st.farm[rid];
  }
  for (const m of ['edit', 'algo', 'down', 'black'] as const) for (const [k, w] of Object.entries(st[m])) if (w < s.week - 52) delete st[m][k];
  for (const k of Object.keys(st.pitch)) if (st.pitch[k].w < s.week - 104) delete st.pitch[k];
  // rival suspeito de fraude (boato que você pode denunciar)
  if (streamingEra(s) && s.year >= 2015 && r.chance(0.035)) {
    const rivals = (s.charts.singles ?? []).slice(0, 40).map((e) => s.releases[e.releaseId]).filter((x): x is Release => !!x && x.owner !== 'player' && !!s.labels[x.owner] && !s.acts[x.actId]?.playerBand);
    if (rivals.length) {
      const rel = r.pick(rivals);
      pushInbox18(s, 'st18_rival', { from: l('Analista de dados', 'Data analyst').pt, subject: fmtL(l('Streams estranhos em "{t}"', 'Odd streams on "{t}"'), { t: rel.title }), body: fmtL(l('"{t}" ({a}, {lb}) tem picos de plays de madrugada vindos de contas novas. Pode ser fazenda de streams. Denunciar às plataformas? Se for verdade, o rival perde posições; se não, você fica mal com o mercado e com o selo.', '"{t}" ({a}, {lb}) has overnight play spikes from new accounts. It may be a stream farm. Report it to the platforms? If true, the rival loses positions; if not, you look bad to the market and to that label.'), { t: rel.title, a: s.acts[rel.actId]?.name ?? '', lb: s.labels[rel.owner]?.name ?? '' }), actions: [{ id: 'report', label: l('Denunciar', 'Report') }, { id: 'no', label: l('Deixar quieto', 'Let it be') }], ref: { rel: rel.id, act: rel.actId, lb: rel.owner, truth: r.chance(0.6) ? 1 : 0 } });
    }
  }
});
const t18 = (x: L): string => x.pt;

// ---------------------------------------------------------------- caixa de entrada, conselheiro, explicações

registerInboxKind('st18_drop', { label: l('Streaming', 'Streaming'), cat: 'analyst', icon: 'stream', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : { area: 'media' }) });
registerInboxKind('st18_down', { label: l('Fraude de streams', 'Stream fraud'), cat: 'press', icon: 'warning', prio: 3, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null) });
registerInboxKind('st18_rival', {
  label: l('Fraude de rival?', 'Rival fraud?'), cat: 'world', icon: 'search', prio: 1,
  handle: (s, m, action) => {
    if (action !== 'report') return l('Você deixou quieto.', 'You let it be.');
    const st = st18(s); st.n.report++;
    const actId = String(m.ref?.act ?? ''), lb = s.labels[String(m.ref?.lb ?? '')];
    if (Number(m.ref?.truth)) {
      crime17(s).rigBad[actId] = s.week + 26;
      if (lb) lb.reputation = clamp(lb.reputation - 6, 0, 100);
      s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
      emitFact(s, { kind: 'stream_fraud', actors: [actId, String(m.ref?.lb ?? '')], severity: 50, visibility: 'public', tags: ['crime', 'fraud', 'streaming'], text: fmtL(l('Plataformas confirmam streams falsos de {a} ({lb}) após denúncia.', 'Platforms confirm fake streams by {a} ({lb}) after a report.'), { a: s.acts[actId]?.name ?? '', lb: lb?.name ?? '' }), src: 'st18' });
      return l('Era fazenda. O rival perde posições por 6 meses e reputação; você ganha crédito com o mercado.', 'It was a farm. The rival loses positions for 6 months and reputation; you gain credit with the market.');
    }
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    if (lb) lb.reputation = clamp(lb.reputation + 1, 0, 100);
    return l('Investigaram e não acharam nada. O rival reclama publicamente da "denúncia caluniosa".', 'They investigated and found nothing. The rival publicly complains about a "slanderous report".');
  },
});

registerAdvisorTip('st18', (s) => {
  if (!streamingEra(s)) return [];
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  for (const id of playerActs(s)) {
    const a = st18(s).a[id], act = s.acts[id];
    if (!a || !act || a.L < 20000) continue;
    const r = a.R / (a.L + a.R);
    if (r < 0.1) out.push({ id: `st18-fans-${id}`, level: 'warn', cat: 'career', score: 55, text: fmtL(l('{a}: muitos plays, poucos fãs.', '{a}: lots of plays, few fans.'), { a: act.name }), why: [fmtL(l('{L} ouvintes no mês, só {r}% voltam.', '{L} listeners this month, only {r}% come back.'), { L: Math.round(a.L).toLocaleString('en-US'), r: Math.round(r * 100) }), l('Quem chega por playlist raramente compra ingresso.', 'Playlist listeners rarely buy tickets.')], effect: l('Estratégia de base: conversão ×1,3, catálogo +12%, estreia −7%.', 'Base strategy: conversion ×1.3, catalog +12%, debut −7%.'), goto: { act: id }, run: a.strat !== 'base' ? { label: l('Mudar para base', 'Switch to base'), fn: (s2) => { setStrat18(s2, id, 'base'); return l('Estratégia de base.', 'Base strategy.'); } } : undefined });
    if (a.dep > 0.5) out.push({ id: `st18-dep-${id}`, level: 'info', cat: 'release', score: 45, text: fmtL(l('{a} depende de {s} ({p}%).', '{a} depends on {s} ({p}%).'), { a: act.name, s: SRC18[a.depSrc ?? 'pl'], p: Math.round(a.dep * 100) }), why: [l('Se a fonte cortar o artista, as unidades caem de uma vez.', 'If that source drops the act, units fall at once.')], goto: { area: 'media' } });
  }
  const st = st18(s);
  for (const id of playerActs(s)) for (const rid of (s.acts[id]?.releases ?? []).slice(-2)) {
    const rel = s.releases[rid];
    if (rel && rel.type === 'single' && s.week - rel.week <= 3 && !st.pitch[rid]) out.push({ id: `st18-pitch-${rid}`, level: 'info', cat: 'opportunity', score: 50, text: fmtL(l('Apresente "{t}" aos curadores de playlist.', 'Pitch "{t}" to playlist curators.'), { t: rel.title }), why: [fmtL(l('Chance {p}%, custa pouco; depois de 4 semanas não dá mais.', 'Chance {p}%, cheap; impossible after 4 weeks.'), { p: Math.round(pitchOdds18(s, rel).p * 100) })], run: { label: l('Fazer pitch', 'Pitch'), fn: (s2) => pitchPlaylist18(s2, rid) } });
  }
  return out;
});

registerExplain('stream.payout', (s, c) => {
  const rel = s.releases[String(c.rel ?? '')];
  if (!rel || !mineRel(s, rel) || !streamingEra(s)) return null;
  const p = payout18(s, rel);
  return {
    title: fmtL(l('Repasse do streaming: "{t}"', 'Streaming payout: "{t}"'), { t: rel.title }), value: Math.round(p.k * 100) / 100, fmt: 'mult',
    parts: [
      { label: l('Base do selo independente (pró-rata, distribuidora)', 'Indie label base (pro-rata, distributor)'), value: STREAM_PAYOUT17, fmt: 'mult' },
      ...p.terr.map((t) => ({ label: fmtL(l('{m}: bolo por play (receita/usuário × pagantes)', '{m}: pool per play (revenue/user × paying)'), { m: marketById[t.m].name }), value: Math.round(t.v / p.ref * 100) / 100, fmt: 'mult' as const, tone: t.v < p.ref * 0.8 ? 'bad' as const : undefined })),
      { label: l('Perfil dos ouvintes (fã assina; vídeo/playlist ouve grátis)', 'Listener profile (fans subscribe; video/playlist listen free)'), value: Math.round(p.skew * 100), fmt: 'signed', tone: p.skew >= 0 ? 'good' : 'bad' },
      { label: l('Diluição do bolo (mais streams por assinante)', 'Pool dilution (more streams per subscriber)'), value: Math.round(p.dil * 100) / 100, fmt: 'mult' },
      ...(p.dm < 1 ? [{ label: l('Comissão de alcance', 'Reach commission'), value: p.dm, fmt: 'mult' as const, tone: 'bad' as const }] : []),
      ...(p.farm < 1 ? [{ label: l('Streams falsos não pagam', 'Fake streams do not pay'), value: Math.round(p.farm * 100) / 100, fmt: 'mult' as const, tone: 'bad' as const }] : []),
    ],
    note: l('Não há tarifa fixa por play: cada território junta assinaturas e anúncios num bolo e divide pela fatia de streams de cada dono. Mercado barato rende menos por play; fã pagante rende mais.', 'There is no fixed per-play rate: each territory pools subscriptions and ads and splits it by each owner\'s share of streams. Cheap markets pay less per play; paying fans pay more.'),
  };
});

registerExplain('stream.funnel', (s, c) => {
  const act = s.acts[String(c.act ?? '')];
  const a = act && st18(s).a[act.id];
  if (!act || !a) return null;
  const src = Object.keys(a.src).length ? a.src : baseMix18(s);
  return {
    title: fmtL(l('Por que ouvem {a}', 'Why people listen to {a}'), { a: act.name }), value: Math.round(a.L), fmt: 'num',
    parts: (Object.keys(src) as Src18[]).filter((k) => (src[k] ?? 0) > 0.01).sort((x, y) => (src[y] ?? 0) - (src[x] ?? 0)).map((k) => ({ label: fmtL(l('{s} (volta {r}%)', '{s} (returns {r}%)'), { s: SRC18[k], r: Math.round(RET18[k] * 100) }), value: Math.round((src[k] ?? 0) * 100), fmt: 'pct' as const })),
    note: fmtL(l('Ouvintes no mês: {L}. Que voltam: {R}. Seguidores convertidos: {F}. Estratégia: {st}.', 'Monthly listeners: {L}. Returning: {R}. Converted followers: {F}. Strategy: {st}.'), { L: Math.round(a.L).toLocaleString('en-US'), R: Math.round(a.R).toLocaleString('en-US'), F: Math.round(a.F).toLocaleString('en-US'), st: STRAT18[a.strat].name }),
  };
});

/** resumo de um ato (interface) */
export function funnel18(s: GameState, act: Act): { L: number; R: number; F: number; ret: number; dep: number; src: Partial<Record<Src18, number>> } {
  const a = st18(s).a[act.id];
  if (!a) return { L: 0, R: 0, F: 0, ret: 0, dep: 0, src: {} };
  return { L: a.L, R: a.R, F: a.F, ret: a.L + a.R > 0 ? a.R / (a.L + a.R) : 0, dep: a.dep, src: a.src };
}
