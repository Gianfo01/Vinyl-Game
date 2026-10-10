// Rodada 18 (media18, feedback #4) — MARKETING com limites legíveis. Antes, cada canal era um multiplicador de
// vendas (o maior sempre ganhava). Agora cada canal tem:
//   • PÚBLICO próprio (rádio = amplo; imprensa = formadores de opinião, compram álbum; cena local = poucos, fiéis);
//   • CONVERSÃO: parte da atenção vira consumo, parte só vira nome conhecido (atenção sem consumo → fama);
//   • INGRESSOS: campanhas que lotam shows e quase não vendem disco (cena local lota 3 casas da cidade);
//   • ATRASO: imprensa e fóruns rendem semanas depois; playlist e vídeo curto, na hora;
//   • GANCHO: vídeo curto revela um refrão forte, mas não sustenta um álbum fraco (efeito some em 3 semanas);
//   • SATURAÇÃO: repetir o mesmo canal para o mesmo artista rende menos (e o público do selo também cansa);
//   • APRENDIZADO: a equipe fica melhor nos canais que usa (até +30%).
// Também guarda o pós-morte de cada lançamento (previsto × realizado por canal), lido por long18 e pela interface.

import { clamp } from '../../core/rng';
import { CHANNELS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { registerExplain } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { marketingE } from '../market';
import { MEDIA18 } from '../media18hook';
import type { GameState, Release } from '../types';
import { fmtL, hasTech } from '../util';

export type Src18 = 'pl' | 'alg' | 'srch' | 'vid' | 'wom' | 'radio' | 'store';
export const SRC18: Record<Src18, L> = {
  pl: l('Playlists', 'Playlists'), alg: l('Recomendação/algoritmo', 'Recommendation/algorithm'), srch: l('Busca (procurou o nome)', 'Search (looked it up)'),
  vid: l('Vídeo', 'Video'), wom: l('Indicação/boca a boca', 'Word of mouth'), radio: l('Rádio', 'Radio'), store: l('Loja/vitrine', 'Store/shelf'),
};

export interface ChProf18 { conv: number; tix: number; lag: number; src: Partial<Record<Src18, number>>; aud: L; alb?: number; local?: number; sv?: number }
/** perfil de cada canal: conversão em consumo, efeito em ingressos, atraso (semanas), fontes de descoberta, público */
export const CH18: Record<string, ChProf18> = {
  radio_plug: { conv: 1, tix: 0.5, lag: 0, src: { radio: 1 }, alb: 0.9, aud: l('Ouvintes de rádio: amplo, todas as idades; vende o single.', 'Radio listeners: broad, all ages; sells the single.') },
  press: { conv: 0.55, tix: 0.5, lag: 3, src: { srch: 0.6, wom: 0.4 }, alb: 1.5, aud: l('Leitores e críticos: formadores de opinião; ajuda o álbum, demora a render.', 'Readers and critics: opinion makers; helps albums, slow to pay off.') },
  sheet_music: { conv: 1, tix: 0.2, lag: 2, src: { store: 1 }, aud: l('Lojas e partituras: quem toca em casa.', 'Shops and sheet music: people who play at home.') },
  tv_show: { conv: 0.7, tix: 0.7, lag: 0, src: { vid: 0.7, wom: 0.3 }, aud: l('Telespectadores: todo mundo vê, nem todos compram (atenção vira fama).', 'TV viewers: everyone watches, not all buy (attention becomes fame).') },
  jukebox: { conv: 1.1, tix: 0.4, lag: 0, src: { store: 0.5, wom: 0.5 }, alb: 0.6, local: 0.4, aud: l('Bares e bailes: jovens, single, cidade.', 'Bars and dances: the young, singles, local.') },
  music_video: { conv: 0.9, tix: 0.5, lag: 0, src: { vid: 1 }, aud: l('Quem vê clipes: jovens; imagem conta tanto quanto a música.', 'Video watchers: the young; image counts as much as the music.') },
  street_team: { conv: 0.45, tix: 2.2, lag: 0, src: { wom: 1 }, local: 1, aud: l('Cena local: alcança pouca gente, mas lota os shows da cidade.', 'Local scene: reaches few people but sells out hometown shows.') },
  web_forums: { conv: 0.75, tix: 0.7, lag: 2, src: { wom: 0.6, srch: 0.4 }, alb: 1.2, aud: l('Fóruns e blogs: nichos fiéis, boca a boca lento.', 'Forums and blogs: loyal niches, slow word of mouth.') },
  playlists: { conv: 1.2, tix: 0.15, lag: 0, src: { pl: 1 }, alb: 0.85, aud: l('Ouvintes de playlist: muitos plays, pouca gente sabe quem é o artista.', 'Playlist listeners: lots of plays, few know who the artist is.') },
  social: { conv: 0.65, tix: 0.9, lag: 0, src: { wom: 0.6, alg: 0.4 }, aud: l('Redes sociais: conversa e identidade; vende ingresso mais que disco.', 'Social media: conversation and identity; sells tickets more than records.') },
  short_clips: { conv: 1, tix: 0.3, lag: 0, src: { vid: 0.7, alg: 0.3 }, sv: 1, aud: l('Vídeo curto: revela um refrão forte; não sustenta um álbum fraco.', 'Short video: reveals a strong hook; cannot carry a weak album.') },
  neural_feed: { conv: 1.1, tix: 0.2, lag: 0, src: { alg: 1 }, aud: l('Feeds personalizados: o algoritmo decide quem ouve.', 'Personalized feeds: the algorithm decides who listens.') },
};
const prof = (id: string): ChProf18 => CH18[id] ?? { conv: 1, tix: 0.5, lag: 0, src: { wom: 1 }, aud: l('', '') };

export interface MkRel18 { c: number; lag: number; sv: number; hook: number; tix: number; loc: number; att: number; src: Partial<Record<Src18, number>>; w: Record<string, number>; e: Record<string, number>; en: Record<string, number> }
declare module '../types' { interface Release { mk18?: MkRel18 } }

export interface Pm18 {
  rel: string; act: string; w: number; done?: boolean; fc: number; u10?: number;
  ch: { id: string; en: number; e: number; conv: number; exp: number; act?: number }[];
  att: number; tix: number; L?: number; R?: number; fans?: number; notes?: L[];
}
export interface Mk18State { use: Record<string, number>; xp: Record<string, number>; camp: Record<string, { w: number; tix: number; loc: number }>; pm: Record<string, Pm18>; n: number }
declare module '../ext4' { interface Ext4 { mk18: Mk18State } }
const fresh = (): Mk18State => ({ use: {}, xp: {}, camp: {}, pm: {}, n: 0 });
registerExt4('mk18', fresh);
export function mk18(s: GameState): Mk18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.mk18 ??= fresh()) as Mk18State;
  st.use ??= {}; st.xp ??= {}; st.camp ??= {}; st.pm ??= {}; st.n ??= 0;
  return st;
}

// ---------------------------------------------------------------- saturação e aprendizado

export function satOf18(s: GameState, actId: string, ch: string): { k: number; sat: number; learn: number; useA: number; useL: number } {
  const st = mk18(s);
  const useA = st.use[`${actId}|${ch}`] ?? 0, useL = st.use[`*|${ch}`] ?? 0;
  const sat = 1 / (1 + 0.2 * useA + 0.02 * useL);
  const learn = 1 + 0.3 * (1 - Math.exp(-(st.xp[ch] ?? 0) / 8));
  return { k: sat * learn, sat, learn, useA, useL };
}
MEDIA18.eff = (s, actId, ch) => satOf18(s, actId, ch).k;

// ---------------------------------------------------------------- perfil da campanha de um lançamento

const hookOf = (s: GameState, rel: Pick<Release, 'songs' | 'type'>): number => {
  const so = rel.songs.map((id) => s.songs[id]).filter(Boolean);
  if (!so.length) return 1;
  const best = Math.max(...so.map((x) => x.melody * 0.6 + (x.recorded ? x.performance : x.melody * 0.6) * 0.2 + x.originality * 0.2));
  return clamp(best / 60, 0.5, 1.5);
};

/** Divide o investimento por canal e calcula conversão, atraso, ingressos e fontes de descoberta. */
export function profile18(s: GameState, marketing: { channel: string; budget: number }[], actId: string | undefined, type: Release['type'], hook = 1): MkRel18 {
  const w: Record<string, number> = {}, e: Record<string, number> = {}, en: Record<string, number> = {};
  let X = 0;
  for (const m of marketing) {
    if (!m.budget || !CHANNELS.some((c) => c.id === m.channel)) continue;
    const Ee = marketingE(s, [m], 'player', actId), En = marketingE(s, [m], 'player');
    const x = -Math.log(1 - Math.min(0.999, Ee));
    w[m.channel] = (w[m.channel] ?? 0) + x; e[m.channel] = Ee; en[m.channel] = En; X += x;
  }
  let c = 0, lag = 0, sv = 0, tix = 0, loc = 0;
  const src: Partial<Record<Src18, number>> = {};
  for (const id of Object.keys(w)) {
    w[id] = X > 0 ? w[id] / X : 0;
    const p = prof(id);
    const albK = type === 'lp' ? p.alb ?? 1 : type === 'single' && p.alb && p.alb > 1 ? 0.9 : 1;
    c += w[id] * p.conv * albK; lag += w[id] * p.lag; tix += w[id] * p.tix; loc += w[id] * (p.local ?? 0); sv += w[id] * (p.sv ?? 0);
    for (const [k, v] of Object.entries(p.src)) src[k as Src18] = (src[k as Src18] ?? 0) + w[id] * (v ?? 0);
  }
  if (!X) c = 1;
  const att = Object.keys(w).reduce((t, id) => t + w[id] * Math.max(0, 1 - prof(id).conv), 0);
  return { c, lag: Math.round(lag), sv, hook, tix, loc, att, src, w, e, en };
}

/** Termo de marketing do calor semanal (com atraso, conversão e o limite do vídeo curto). */
export function term18(m: MkRel18, E: number, age: number, type: Release['type'], q: number): number {
  const ramp = m.lag > 0 && age < m.lag ? 0.35 + 0.65 * (age / m.lag) : 1;
  const a = Math.max(0, age - m.lag);
  const Ec = E * m.c;
  // vídeo curto: o refrão forte multiplica a parte do vídeo; num álbum fraco ela some em ~3 semanas
  const svE = Ec * m.sv, rest = Ec - svE;
  const hookK = type === 'single' ? 0.6 + 0.6 * m.hook : q >= 65 ? 1 : 0.8;
  const tauSv = type !== 'single' && q < 65 ? 3 : 9;
  return 1 + 2.5 * ramp * (rest * Math.exp(-a / 9) + svE * hookK * Math.exp(-a / tauSv)) + 0.3 * (rest + svE * (type !== 'single' && q < 65 ? 0.3 : hookK));
}
MEDIA18.term = (s, rel, age) => (rel.mk18 && rel.owner === 'player' ? term18(rel.mk18, rel.marketingE, age, rel.type, rel.q) : null);
MEDIA18.fterm = (s, marketing, E, age, type, q) => (marketing.length ? term18(profile18(s, marketing, undefined, type), E, age, type, q) : null);

/** Acrescenta um canal a um lançamento já na rua (clipe do rollout, clipe avulso, jabá): soma o alcance com saturação. */
export function addChannel18(s: GameState, rel: Release, channel: string, budget: number): number {
  rel.marketing.push({ channel, budget });
  const before = rel.marketingE;
  rel.marketingE = Math.min(0.95, marketingE(s, rel.marketing, 'player', rel.actId) + (rel.owner !== 'player' ? 0.25 : 0));
  if (rel.owner === 'player') rel.mk18 = profile18(s, rel.marketing, rel.actId, rel.type, hookOf(s, rel));
  useChannel18(s, rel.actId, { [channel]: 1 });
  return rel.marketingE - before;
}

function useChannel18(s: GameState, actId: string, w: Record<string, number>): void {
  const st = mk18(s);
  for (const [ch, v] of Object.entries(w)) {
    if (v <= 0) continue;
    st.use[`${actId}|${ch}`] = (st.use[`${actId}|${ch}`] ?? 0) + v;
    st.use[`*|${ch}`] = (st.use[`*|${ch}`] ?? 0) + v;
    st.xp[ch] = (st.xp[ch] ?? 0) + v;
  }
  st.n++;
}

// ---------------------------------------------------------------- lançamento: perfil, atenção sem consumo, ingressos

registerSimHook('launch', 'mk18', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || rel.owner !== 'player') return;
  const act = s.acts[rel.actId];
  if (!act) return;
  const m = profile18(s, rel.marketing, rel.actId, rel.type, hookOf(s, rel));
  rel.mk18 = m;
  // atenção sem consumo: gente que passa a conhecer o nome (fama, fãs casuais), sem comprar
  const att = rel.marketingE * m.att;
  if (att > 0.02) {
    act.fame = clamp(act.fame + att * 1.6 * (1 - act.fame / 110), 0, 100);
    act.fans.casual += Math.round(att * 2500 * (1 + act.fame / 30));
  }
  const tix = rel.marketingE * m.tix;
  if (tix > 0.02) mk18(s).camp[act.id] = { w: s.week, tix, loc: rel.marketingE * m.loc };
  // pós-morte: o que a campanha prometia, canal a canal
  const fc = rel.fc ?? 0;
  const tot = Object.values(m.w).reduce((t, x) => t + x, 0) || 1;
  const lift = rel.marketingE * m.c * 2.5 * 0.6; // fração média do calor que vem do marketing em 10 semanas
  mk18(s).pm[rel.id] = {
    rel: rel.id, act: act.id, w: s.week, fc, att: Math.round(att * 100) / 100, tix: Math.round(tix * 100) / 100,
    ch: Object.keys(m.w).map((id) => ({ id, en: r2(m.en[id] ?? 0), e: r2(m.e[id] ?? 0), conv: prof(id).conv, exp: Math.round(fc * (lift / (1 + lift)) * (m.w[id] / tot) * ((m.en[id] ?? 0) / Math.max(0.01, m.e[id] ?? 0.01))) })),
  };
  useChannel18(s, act.id, m.w);
});
const r2 = (x: number) => Math.round(x * 100) / 100;

// campanhas com efeito em ingresso: shows da cidade (cena local) e da região
registerMod('cityDemand', 'mk18', (s, v, c) => {
  if (!c.act || !c.cityId) return null;
  const cp = mk18(s).camp[c.act.id];
  if (!cp) return null;
  const age = s.week - cp.w;
  if (age > 20) return null;
  const fade = Math.exp(-age / 10);
  const home = c.cityId === c.act.city;
  const k = 1 + 0.35 * cp.tix * fade + (home ? 1.2 * cp.loc * fade : 0);
  return k > 1.005 ? { value: v * k, label: home && cp.loc > 0.05 ? l('Campanha local (lota a cidade)', 'Local campaign (fills hometown)') : l('Campanha que vende ingresso', 'Ticket-selling campaign') } : null;
});

// ---------------------------------------------------------------- mês: decaimento da saturação e pós-mortes

registerSimHook('month', 'mk18', (s) => {
  const st = mk18(s);
  for (const k of Object.keys(st.use)) { st.use[k] *= k.startsWith('*|') ? 0.85 : 0.8; if (st.use[k] < 0.03) delete st.use[k]; }
  for (const [a, cp] of Object.entries(st.camp)) if (s.week - cp.w > 24) delete st.camp[a];
  for (const pm of Object.values(st.pm)) {
    if (pm.done) { if (s.week - pm.w > 520) delete st.pm[pm.rel]; continue; }
    const rel = s.releases[pm.rel];
    if (!rel) { delete st.pm[pm.rel]; continue; }
    if (s.week - rel.week < 10) continue;
    closePm18(s, pm, rel);
  }
  const ks = Object.keys(st.pm);
  if (ks.length > 120) for (const k of ks.slice(0, ks.length - 120)) delete st.pm[k];
});

/** Fecha o pós-morte: realizado por canal, ouvintes, retorno, conversão; frases de leitura. */
export function closePm18(s: GameState, pm: Pm18, rel: Release): void {
  const u10 = rel.weekly.slice(0, 10).reduce((t, x) => t + x, 0);
  pm.u10 = u10;
  const m = rel.mk18;
  if (m) {
    let avg = 0, lift = 0;
    for (let a = 0; a < 10; a++) { const t = term18(m, rel.marketingE, a, rel.type, rel.q); avg += t; lift += t - 1; }
    const share = avg > 0 ? lift / avg : 0;
    const tot = Object.values(m.w).reduce((t, x) => t + x, 0) || 1;
    for (const c of pm.ch) c.act = Math.round(u10 * share * ((m.w[c.id] ?? 0) / tot) * c.conv / Math.max(0.3, m.c));
  }
  const st18 = (rel as Release & { st18?: { L: number; R: number; F: number } }).st18;
  if (st18) { pm.L = Math.round(st18.L); pm.R = Math.round(st18.R); pm.fans = Math.round(st18.F); }
  const notes: L[] = [];
  const ratio = pm.fc > 0 ? u10 / pm.fc : 1;
  notes.push(ratio > 1.25 ? l('Alcançou mais que o previsto.', 'Reached more than forecast.') : ratio < 0.75 ? l('Ficou abaixo do previsto.', 'Fell short of the forecast.') : l('Dentro do previsto.', 'In line with the forecast.'));
  if (pm.L && pm.R !== undefined) {
    const ret = pm.R / Math.max(1, pm.L);
    notes.push(ret < 0.12 ? l('Muitos ouviram uma vez; poucos voltaram.', 'Many listened once; few came back.') : ret > 0.3 ? l('Boa parte de quem ouviu voltou (base fiel).', 'A good share of listeners came back (loyal base).') : l('Retorno de ouvintes médio.', 'Average listener return.'));
  }
  const best = pm.ch.slice().sort((a, b) => (b.act ?? 0) - (a.act ?? 0))[0];
  const sat = pm.ch.find((c) => c.e < c.en * 0.75);
  if (best && (best.act ?? 0) > 0) notes.push(fmtL(l('Canal que mais rendeu: {c}.', 'Best-performing channel: {c}.'), { c: CHANNELS.find((x) => x.id === best.id)?.name ?? best.id }));
  if (sat) notes.push(fmtL(l('{c} saturado: o público já tinha visto essa campanha.', '{c} saturated: the audience had already seen this campaign.'), { c: CHANNELS.find((x) => x.id === sat.id)?.name ?? sat.id }));
  if (pm.att > 0.15) notes.push(l('Muita atenção que não virou consumo (virou fama).', 'Lots of attention that did not turn into sales (it became fame).'));
  if (pm.tix > 0.3) notes.push(l('Campanha que vende ingresso: confira os shows.', 'A ticket-selling campaign: check the shows.'));
  if (pm.fans !== undefined && pm.L && pm.fans / Math.max(1, pm.L) < 0.01) notes.push(l('Conversão em fãs baixa.', 'Low conversion into fans.'));
  pm.notes = notes;
  pm.done = true;
}

/** Pós-morte de um lançamento (para a interface e para o long18): previsto × realizado por canal. */
export const postMortem18 = (s: GameState, relId: string): Pm18 | undefined => mk18(s).pm[relId];

/** Ordena canais disponíveis pelo rendimento esperado para o ato (venda × conversão × saturação ÷ custo). */
export function rankChannels18(s: GameState, actId: string, type: Release['type'], goal: 'sales' | 'tix' = 'sales'): { id: string; v: number }[] {
  return CHANNELS.filter((c) => (!c.from || hasTech(s, c.from)) && (!c.untilYear || s.year <= c.untilYear))
    .map((c) => {
      const p = prof(c.id);
      const alb = type === 'lp' ? p.alb ?? 1 : 1;
      const base = goal === 'tix' ? p.tix : c.sales * p.conv * alb;
      return { id: c.id, v: (base * satOf18(s, actId, c.id).k) / c.reachCost * 10000 };
    })
    .sort((a, b) => b.v - a.v);
}

// ---------------------------------------------------------------- explicações

registerExplain('mkt.channel', (s, c) => {
  const ch = String(c.ch ?? ''), actId = String(c.act ?? '');
  const def = CHANNELS.find((x) => x.id === ch);
  if (!def) return null;
  const p = prof(ch), sa = satOf18(s, actId, ch);
  return {
    title: fmtL(l('Rendimento de {c}', '{c} effectiveness'), { c: def.name }), value: Math.round(sa.k * 100) / 100, fmt: 'mult',
    parts: [
      { label: l('Saturação (este artista)', 'Saturation (this act)'), value: Math.round(1 / (1 + 0.2 * sa.useA) * 100) / 100, fmt: 'mult', tone: sa.useA > 0.3 ? 'bad' : undefined },
      { label: l('Público do selo cansado', 'Label audience fatigue'), value: Math.round(1 / (1 + 0.02 * sa.useL) * 100) / 100, fmt: 'mult', tone: sa.useL > 2 ? 'bad' : undefined },
      { label: l('Aprendizado da equipe', 'Team learning'), value: Math.round(sa.learn * 100) / 100, fmt: 'mult', tone: 'good' },
      { label: l('Conversão em consumo', 'Conversion into sales'), value: p.conv, fmt: 'mult' },
      { label: l('Efeito em ingressos', 'Ticket effect'), value: p.tix, fmt: 'num' },
      { label: l('Atraso (semanas)', 'Delay (weeks)'), value: p.lag, fmt: 'num' },
    ],
    note: p.aud,
  };
});

/** Teaser de rollout: o mesmo artista anunciando de novo rende menos (registra o uso). */
export function teaserK18(s: GameState, actId: string): number {
  const k = satOf18(s, actId, 'teaser').sat;
  useChannel18(s, actId, { teaser: 1 });
  return k;
}
