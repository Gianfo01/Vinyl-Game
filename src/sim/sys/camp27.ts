// r27 (P2A) — CAMPANHA DE LANÇAMENTO JOGÁVEL. Um quadro de semanas para um lançamento (programado ou recém-saído):
//   • VERBA POR CANAL E POR SEMANA, só nos canais da época (rádio/jabá, TV, imprensa, apoio de turnê/cena, clipe/MTV,
//     internet/playlists/redes). Cada semana a verba vira marketing NORMAL: antes da estreia entra no `marketing` do
//     lançamento programado (o mesmo E = 1 − exp(−x) de sempre, com saturação de mkt18); depois da estreia, por
//     addChannel18. A expectativa (hype12, chave n:/a:) sobe junto — e expectativa acima da qualidade dá a reação
//     de sempre (backlash). Jabá na era do jabá rende mais alcance e acumula EXPOSIÇÃO.
//   • EVENTOS DA SEMANA com escolhas: rival lança no mesmo dia, resenha ruim, momento viral, rádio proíbe a faixa,
//     vazamento, investigação de jabá, convite para entrevista (abre a coletiva jogável), convite para TV.
//     Sem resposta até a semana seguinte, vale a opção prudente (a primeira).
//   • JOGADAS AVULSAS: as ações rápidas de sempre (alavancas de hype12, rádio de radio18, playlist e streams comprados
//     de stream18, voto na TV de tv18) aparecem no quadro como cartas — chamam exatamente a mesma função.
//   • PÓS-MORTE explicado ("saiu fraca porque…") a partir do que o próprio jogo mediu (hype12, mkt18, paradas).
// Modo rápido = sem campanha (marketing na programação + botões de sempre); bots e testes não passam por aqui.
// Determinístico: sorte de Rng.fromSeed(semente|camp27v1|campanha|semana|parte); nunca s.rng. Estado preguiçoso em
// s.x4.camp27 (só existe depois da 1ª campanha — partidas sem campanha ficam byte a byte iguais).

import { Rng, clamp } from '../../core/rng';
import { CHANNELS } from '../../data/rules';
import { familyOf, l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { fandomOf } from '../fandom';
import { availableChannels } from '../market';
import { cashWhy20, freeCash20 } from '../oblig20';
import { scandal } from '../scandal17';
import type { Act, GameState, PendingRelease, Release } from '../types';
import { fmtL, hasTech, money, notify, post } from '../util';
import { addHype, hy, hypeOf, levers, needQ, useLever, type Lever } from './hype12';
import { addChannel18 } from './mkt18';
import { opine } from './persona13';
import { FMT18, fmtsNow18, pitchRadio18, radio18, HOW18, type How18 } from './radio18';
import { FARM18, buyStreams18, pitchPlaylist18, st18 } from './stream18';
import { pushCost18, pushVotes18, tv18 } from './tv18';
import { w4 } from './world4/state';
import { CRITICS } from '../../data/content';

export const CAMP27_RNG = 'camp27v1';
export type Lvl27 = 0 | 1 | 2 | 3;
export type EvK27 = 'rival' | 'review' | 'viral' | 'ban' | 'leak' | 'probe' | 'press' | 'tv';
export interface Opt27 { id: string; t: L; hint: L; cost?: number }
export interface Ev27 { k: EvK27; w: number; t: L; tone: 'good' | 'bad' | 'warn'; opts: Opt27[]; ref?: string; refName?: string; pick?: string; res?: L }
export interface Line27c { w: number; t: L; tone?: 'good' | 'bad' | 'warn' }
export interface Camp27 {
  id: string; actId: string; prId?: string; relId?: string; title: string; type: Release['type'];
  /** semana de início, da estreia e do fim; última semana processada */
  w0: number; launchW: number; wEnd: number; tick: number;
  /** nível semanal por canal (0–3) e jabá ligado no rádio */
  plan: Record<string, Lvl27>; payola: boolean;
  /** semanas de uso por canal (rendimento decrescente da expectativa) */
  used: Record<string, number>;
  spent: number; hype: number; addE: number;
  /** exposição a escândalo (jabá, streams comprados, rixas armadas): 0–100 */
  exp: number;
  ev: Ev27[]; log: Line27c[];
  status: 'live' | 'done' | 'off';
  /** pós-morte (no fim) */
  sum?: L[];
}
export interface Camp27State { c: Record<string, Camp27>; seq: number }

/** Estado preguiçoso (não registrado no ext4: só aparece quando alguém abre uma campanha). */
export function camps27(s: GameState): Camp27State {
  const x = s.x4 as unknown as { camp27?: Camp27State };
  return (x.camp27 ??= { c: {}, seq: 0 });
}
const peek27 = (s: GameState): Camp27State | undefined => (s.x4 as unknown as { camp27?: Camp27State }).camp27;
const rng27 = (s: GameState, c: Camp27, w: number, part: string) => Rng.fromSeed(`${s.config.seed}|${CAMP27_RNG}|${c.id}|${w}|${part}`);
const pendOf = (s: GameState, c: Camp27): PendingRelease | undefined => (c.prId ? s.pendingReleases.find((p) => p.id === c.prId) : undefined);
const relOf = (s: GameState, c: Camp27): Release | undefined => (c.relId ? s.releases[c.relId] : undefined);
const hypeKey = (s: GameState, c: Camp27) => (pendOf(s, c) ? `n:${c.actId}` : `a:${c.actId}`);
const say = (c: Camp27, w: number, t: L, tone?: Line27c['tone']) => { c.log.push({ w, t, ...(tone ? { tone } : {}) }); if (c.log.length > 60) c.log.shift(); };

// ---------------------------------------------------------------- canais da época

export interface ChInfo27 { id: string; name: L; group: L; unit: number; fameW: number; payola?: boolean }
const GROUP: Record<string, L> = {
  radio_plug: l('Rádio', 'Radio'), jukebox: l('Rádio', 'Radio'), sheet_music: l('Lojas', 'Shops'), tv_show: l('TV', 'TV'), music_video: l('Clipe/MTV', 'Video/MTV'),
  press: l('Imprensa', 'Press'), street_team: l('Apoio de turnê', 'Tour support'), web_forums: l('Internet', 'Internet'), playlists: l('Streaming', 'Streaming'),
  social: l('Redes', 'Social'), short_clips: l('Redes', 'Social'), neural_feed: l('Algoritmo', 'Algorithm'),
};
/** Era do jabá no rádio (1950–2005): pagar por execução rende mais alcance, mas fica registrado. */
export const payolaEra27 = (s: GameState): boolean => hasTech(s, 'radio') && s.year >= 1950 && s.year < 2006;
/** Custo semanal de um nível num canal (10% do custo de alcance por nível). */
export const unit27 = (s: GameState, id: string): number => money(s, (CHANNELS.find((c) => c.id === id)?.reachCost ?? 5000) * 0.1);
export function channels27(s: GameState): ChInfo27[] {
  return availableChannels(s).map((c) => ({ id: c.id, name: c.id === 'street_team' ? l('Apoio de turnê e cena local', 'Tour support & local scene') : c.name, group: GROUP[c.id] ?? c.name, unit: unit27(s, c.id), fameW: c.fame, ...(c.id === 'radio_plug' && payolaEra27(s) ? { payola: true } : {}) }));
}
/** Custo da próxima semana com o plano atual. */
export const weekCost27 = (s: GameState, c: Camp27): number => Object.entries(c.plan).reduce((t, [id, lv]) => t + lv * unit27(s, id), 0);

// ---------------------------------------------------------------- abrir

export interface Target27 { actId: string; prId?: string; relId?: string; title: string; launchW: number; type: Release['type'] }
/** Lançamentos seus que aceitam campanha: programados (≥1 semana) ou na rua há no máx. 2 semanas. */
export function targets27(s: GameState): Target27[] {
  const out: Target27[] = [];
  for (const p of s.pendingReleases) { const a = s.acts[p.actId]; if (a && (a.owner === 'player' || a.playerBand) && p.week > s.week) out.push({ actId: p.actId, prId: p.id, title: p.title, launchW: p.week, type: p.type }); }
  for (const r of Object.values(s.releases)) if (r.owner === 'player' && !r.reissueOf && s.week - r.week <= 2 && s.week >= r.week) out.push({ actId: r.actId, relId: r.id, title: r.title, launchW: r.week, type: r.type });
  return out.sort((a, b) => a.launchW - b.launchW || (a.title < b.title ? -1 : 1));
}
export function campOf27(s: GameState, key: { prId?: string; relId?: string }): Camp27 | undefined {
  const st = peek27(s);
  if (!st) return undefined;
  return Object.values(st.c).find((c) => c.status === 'live' && ((key.prId && c.prId === key.prId) || (key.relId && c.relId === key.relId)));
}
export const liveCamps27 = (s: GameState): Camp27[] => Object.values(peek27(s)?.c ?? {}).filter((c) => c.status === 'live');

export function campGate27(s: GameState, t: Target27): L | null {
  const a = s.acts[t.actId];
  if (!a) return l('Artista inválido.', 'Invalid act.');
  if (campOf27(s, t)) return l('Já há uma campanha para este lançamento.', 'There is already a campaign for this release.');
  if (!targets27(s).some((x) => (t.prId && x.prId === t.prId) || (t.relId && x.relId === t.relId))) return l('Só lançamentos programados ou com até 2 semanas na rua.', 'Only scheduled releases or ones out for at most 2 weeks.');
  return null;
}

/** Abre a campanha: dura até 3 semanas depois da estreia (mín. 3, máx. 8 semanas). */
export function startCamp27(s: GameState, t: Target27): Camp27 | L {
  const g = campGate27(s, t);
  if (g) return g;
  const st = camps27(s);
  const wEnd = clamp(t.launchW + 3, s.week + 3, s.week + 8);
  const c: Camp27 = {
    id: `cp${++st.seq}`, actId: t.actId, ...(t.prId ? { prId: t.prId } : {}), ...(t.relId ? { relId: t.relId } : {}), title: t.title, type: t.type,
    w0: s.week, launchW: t.launchW, wEnd, tick: s.week, plan: {}, payola: false, used: {}, spent: 0, hype: 0, addE: 0, exp: 0, ev: [], log: [], status: 'live',
  };
  st.c[c.id] = c;
  say(c, s.week, fmtL(l('Campanha de "{t}" aberta: {n} semanas no quadro.', 'Campaign for "{t}" opened: {n} weeks on the board.'), { t: c.title, n: wEnd - s.week }));
  rollEvent27(s, c, s.week); // a primeira semana já pode trazer um imprevisto
  return c;
}

export function setPlan27(s: GameState, c: Camp27, ch: string, lv: Lvl27): void {
  if (c.status !== 'live' || !channels27(s).some((x) => x.id === ch)) return;
  if (lv <= 0) delete c.plan[ch]; else c.plan[ch] = lv;
}
export function setPayola27(s: GameState, c: Camp27, on: boolean): void { c.payola = on && payolaEra27(s); }
export function endCamp27(s: GameState, c: Camp27): void { if (c.status === 'live') finish27(s, c, true); }

// ---------------------------------------------------------------- a semana da campanha

/** Processa as semanas que passaram desde o último tique (chamado pelo gancho semanal; idempotente). */
export function tickCamps27(s: GameState): void {
  const st = peek27(s);
  if (!st) return;
  for (const c of Object.values(st.c)) if (c.status === 'live') tick27(s, c);
}
registerSimHook('week', 'camp27', (s) => tickCamps27(s));

export function tick27(s: GameState, c: Camp27): void {
  if (c.status !== 'live' || s.week <= c.tick) return;
  // a escolha da semana passada que ficou sem resposta vale a prudente
  for (const e of c.ev) if (!e.pick) choose27(s, c, e.w, e.opts[0].id, true);
  // achou o disco? (a programação virou lançamento)
  if (c.prId && !pendOf(s, c) && !c.relId) {
    const r = Object.values(s.releases).filter((x) => x.actId === c.actId && x.title === c.title && x.week >= c.w0).sort((a, b) => b.week - a.week)[0];
    if (r) { c.relId = r.id; c.launchW = r.week; say(c, s.week, fmtL(l('Estreia: "{t}" está nas lojas.', 'Launch: "{t}" is in stores.'), { t: c.title }), 'good'); }
    else { c.status = 'off'; say(c, s.week, l('O lançamento foi cancelado: campanha encerrada.', 'The release was cancelled: campaign closed.'), 'bad'); return; }
  }
  spend27(s, c);
  c.tick = s.week;
  if (s.week >= c.wEnd) { finish27(s, c); return; }
  rollEvent27(s, c, s.week);
}

function spend27(s: GameState, c: Camp27): void {
  const pr = pendOf(s, c), rel = relOf(s, c), act = s.acts[c.actId];
  if (!act || (!pr && !rel)) return;
  let hype = 0, spent = 0;
  for (const ch of channels27(s)) {
    const lv = c.plan[ch.id] ?? 0;
    if (!lv) continue;
    const cost = lv * ch.unit;
    if (freeCash20(s) < cost) { say(c, s.week, fmtL(l('{c}: sem caixa nesta semana.', '{c}: no cash this week.'), { c: ch.name }), 'bad'); continue; }
    const jaba = ch.payola && c.payola;
    if (!post(s, `camp27:${c.id}:${ch.id}`, -cost, jaba ? 'w4_payola' : 'marketing', jaba ? 'Consultoria de rádio (?)' : `Campanha: ${c.title}`)) continue;
    spent += cost;
    // jabá: o dinheiro rende 40% mais alcance (e fica registrado)
    const budget = Math.round(cost * (jaba ? 1.4 : 1));
    if (pr) pr.marketing.push({ channel: ch.id, budget });
    else if (rel) c.addE += addChannel18(s, rel, ch.id, budget);
    const n = (c.used[ch.id] = (c.used[ch.id] ?? 0) + 1);
    hype += lv * ch.fameW * 2.2 / (1 + 0.18 * (n - 1));
    if (jaba) {
      c.exp = clamp(c.exp + 5 * lv, 0, 100);
      const p = w4(s).payola; p.heat = clamp(p.heat + lv * 2, 0, 100); p.spent += cost;
    }
  }
  if (!spent) return;
  c.spent += spent;
  const v = Math.round(Math.min(18, hype));
  if (v > 0) { addHype(s, hypeKey(s, c), 'camp27', fmtL(l('Campanha de "{t}"', 'Campaign for "{t}"'), { t: c.title }), v); c.hype += v; }
  say(c, s.week, fmtL(l('Semana investida: {d} nos canais, +{h} de expectativa.', 'Week invested: {d} across channels, +{h} anticipation.'), { d: `$${Math.round(spent / 100)}`, h: v }));
}

// ---------------------------------------------------------------- eventos da semana

const rivalOf = (s: GameState, a: Act): Act | undefined => Object.values(s.acts)
  .filter((b) => b.id !== a.id && b.owner && b.owner !== 'player' && !b.playerBand && !b.deceased && b.status !== 'retired' && b.status !== 'split' && b.fame >= a.fame - 15)
  .sort((x, y) => (familyOf(y.genre) === familyOf(a.genre) ? 30 : 0) - Math.abs(y.fame - a.fame) - ((familyOf(x.genre) === familyOf(a.genre) ? 30 : 0) - Math.abs(x.fame - a.fame)) || (x.id < y.id ? -1 : 1))[0];
const criticNow = (s: GameState, r: Rng): string | undefined => {
  const cs = (CRITICS as unknown as { name: string; start?: number; end?: number; from?: number; to?: number }[]).filter((c) => (c.start ?? c.from ?? 0) <= s.year && s.year <= (c.end ?? c.to ?? 9999));
  return cs.length ? r.pick(cs).name : undefined;
};

function eligible27(s: GameState, c: Camp27): EvK27[] {
  const pr = pendOf(s, c), act = s.acts[c.actId];
  const out: EvK27[] = ['review', 'viral', 'press'];
  if (act && rivalOf(s, act) && Math.abs(c.launchW - s.week) <= 3) out.push('rival');
  if (hasTech(s, 'radio') && s.year >= 1950 && (c.plan.radio_plug || relOf(s, c))) out.push('ban');
  if (pr && s.year >= 1965) out.push('leak');
  if (c.exp >= 25) out.push('probe', 'probe');
  if (hasTech(s, 'tv_music')) out.push('tv');
  return out;
}
function rollEvent27(s: GameState, c: Camp27, w: number): void {
  if (c.ev.some((e) => e.w === w)) return;
  const r = rng27(s, c, w, 'ev');
  if (!r.chance(c.exp >= 25 ? 0.65 : 0.5)) return;
  const ks = eligible27(s, c);
  const k = ks[r.int(0, ks.length - 1)];
  const e = makeEv27(s, c, k, w);
  if (e && w > c.w0) notify(s, fmtL(l('Campanha de "{t}": {e} Responda no quadro até a semana que vem.', '"{t}" campaign: {e} Answer on the board by next week.'), { t: c.title, e: e.t }), e.tone === 'good' ? 'good' : 'event');
}
/** Monta um evento (exportado para testes e para o quadro forçar uma situação de tutorial). */
export function makeEv27(s: GameState, c: Camp27, k: EvK27, w = s.week): Ev27 | null {
  const act = s.acts[c.actId];
  if (!act) return null;
  const r = rng27(s, c, w, `mk:${k}`);
  const pr = pendOf(s, c);
  const net = s.year >= 2006;
  let e: Ev27;
  if (k === 'rival') {
    const b = rivalOf(s, act);
    if (!b) return null;
    e = { k, w, ref: b.id, refName: b.name, tone: 'warn', t: fmtL(l('{b} vai lançar disco na mesma semana de "{t}".', '{b} is releasing a record the same week as "{t}".'), { b: b.name, t: c.title }), opts: [
      { id: 'ignore', t: l('Manter a data', 'Keep the date'), hint: l('Dividem a atenção: −6 de expectativa.', 'Attention is split: −6 anticipation.') },
      ...(pr ? [{ id: 'delay', t: l('Adiar duas semanas', 'Delay two weeks'), hint: l('Sai do caminho; o hype esfria um pouco (−2).', 'Gets out of the way; hype cools a little (−2).') }] : []),
      { id: 'clash', t: l('Bater de frente (campanha extra)', 'Go head to head (extra push)'), hint: l('+10 se vencer a guerra de atenção; se o rival for bem maior, −8.', '+10 if you win the attention war; if the rival is much bigger, −8.'), cost: money(s, 1500 + act.fame * 30) },
    ] };
  } else if (k === 'review') {
    const cr = criticNow(s, r);
    e = { k, w, ref: cr, refName: cr, tone: 'bad', t: fmtL(l('{c} detonou "{t}" numa prévia: "barulho sem ideia".', '{c} trashed "{t}" in an early review: "noise without ideas".'), { c: cr ?? l('Um crítico', 'A critic'), t: c.title }), opts: [
      { id: 'ignore', t: l('Ignorar', 'Ignore it'), hint: l('−5 de expectativa; a resenha morre sozinha.', '−5 anticipation; the review dies on its own.') },
      { id: 'invite', t: l('Convidar para uma audição', 'Invite to a listening'), hint: l('Relação com o crítico +, expectativa +2.', 'Better relationship with the critic, +2 anticipation.'), cost: money(s, 800) },
      { id: 'rebut', t: l('Rebater em público', 'Rebut publicly'), hint: l('+6 de expectativa (polêmica), o crítico vira desafeto e a reputação artística cai 1.', '+6 anticipation (controversy); the critic becomes a foe and artistic reputation −1.') },
    ] };
  } else if (k === 'viral') {
    e = { k, w, tone: 'good', t: net ? fmtL(l('Um trecho de "{t}" viralizou nas redes.', 'A clip of "{t}" went viral online.'), { t: c.title }) : s.year >= 1955 ? fmtL(l('Os DJs não param de tocar "{t}": virou febre.', 'DJs keep spinning "{t}": it is all the rage.'), { t: c.title }) : fmtL(l('"{t}" é o assunto da cidade.', '"{t}" is the talk of the town.'), { t: c.title }), opts: [
      { id: 'organic', t: l('Deixar crescer sozinho', 'Let it grow on its own'), hint: l('+8 de expectativa, sem custo.', '+8 anticipation, free.') },
      { id: 'ride', t: l('Surfar a onda (impulsionar)', 'Ride the wave (boost it)'), hint: l('+16 e mais alcance; se o público sentir que é armação, menos.', '+16 and more reach; if it feels manufactured, less.'), cost: money(s, 2000) },
      { id: 'merch', t: l('Faturar: produtos do momento', 'Cash in: merch of the moment'), hint: l('Entra dinheiro já; +3 de expectativa; artista "de arte" torce o nariz.', 'Money now; +3 anticipation; an "art" artist frowns.') },
    ] };
  } else if (k === 'ban') {
    e = { k, w, tone: 'bad', t: fmtL(l('Rádios proíbem "{t}": letra "imprópria para o horário".', 'Radio bans "{t}": lyrics "unfit for airplay".'), { t: c.title }), opts: [
      { id: 'edit', t: l('Mandar versão editada', 'Send a clean edit'), hint: l('−3 de expectativa; artista purista perde confiança.', '−3 anticipation; a purist artist loses trust.') },
      { id: 'lobby', t: l('Pressionar nos bastidores', 'Lobby behind the scenes'), hint: l('60% de derrubar a proibição; senão −6.', '60% chance to lift the ban; otherwise −6.'), cost: money(s, 2500) },
      { id: 'fight', t: l('Fazer barulho: "censura!"', 'Make noise: "censorship!"'), hint: l('+12 de expectativa, reputação institucional −2 e 30% de virar escândalo.', '+12 anticipation, institutional reputation −2 and a 30% chance of scandal.') },
    ] };
  } else if (k === 'leak') {
    e = { k, w, tone: 'warn', t: s.year >= 1999 ? fmtL(l('"{t}" vazou na internet antes da hora.', '"{t}" leaked online early.'), { t: c.title }) : fmtL(l('Uma fita de "{t}" circula antes da estreia.', 'A tape of "{t}" circulates before release.'), { t: c.title }), opts: [
      { id: 'crack', t: l('Caçar o vazamento', 'Crack down on the leak'), hint: l('−4 de expectativa; o artista agradece (+2 de confiança).', '−4 anticipation; the artist is grateful (+2 trust).'), cost: money(s, 1800) },
      { id: 'embrace', t: l('Abraçar o vazamento', 'Embrace the leak'), hint: l('Disco bom: +14; fraco: +4. A pirataria tira vendas da estreia.', 'Good record: +14; weak: +4. Piracy cuts debut sales.') },
      { id: 'rush', t: l('Antecipar a estreia', 'Rush the release'), hint: l('Sai na semana que vem; +5 de expectativa; pirataria menor.', 'Comes out next week; +5 anticipation; less piracy.') },
    ] };
  } else if (k === 'probe') {
    e = { k, w, tone: 'bad', t: l('Um repórter investiga pagamentos a rádios e quer saber da sua campanha.', 'A reporter is digging into payments to radio and asks about your campaign.'), opts: [
      { id: 'scapegoat', t: l('Culpar o promotor', 'Blame the promoter'), hint: l('Exposição −30; reputação institucional −2; vira boato.', 'Exposure −30; institutional reputation −2; becomes a rumor.') },
      { id: 'cover', t: l('Abafar', 'Cover it up'), hint: l('Funciona quase sempre; se falhar, escândalo de dinheiro.', 'Usually works; if it fails, a money scandal.'), cost: money(s, 3000) },
      { id: 'confess', t: l('Assumir antes', 'Own it first'), hint: l('Escândalo menor agora, exposição zerada.', 'Smaller scandal now, exposure reset.') },
    ] };
  } else if (k === 'press') {
    e = { k, w, tone: 'good', t: fmtL(l('{o} quer {a} para uma entrevista sobre "{t}".', '{o} wants {a} for an interview about "{t}".'), { o: s.year >= 2008 ? l('Um podcast de vídeo', 'A video podcast') : s.year >= 1981 ? l('Um canal de clipes', 'A music video channel') : s.year >= 1950 ? l('Uma revista de música', 'A music magazine') : l('Um programa de rádio', 'A radio show'), a: act.name, t: c.title }), opts: [
      { id: 'quick', t: l('Aceitar (resposta pronta da assessoria)', 'Accept (PR-prepared answers)'), hint: l('+5 de expectativa, sem risco.', '+5 anticipation, no risk.') },
      { id: 'play', t: l('Dar a entrevista (jogar)', 'Do the interview (play)'), hint: l('Você escolhe o tom de cada resposta: mais alto e mais arriscado.', 'You pick the tone of each answer: higher upside, more risk.') },
      { id: 'skip', t: l('Recusar', 'Decline'), hint: l('Nada acontece.', 'Nothing happens.') },
    ] };
  } else {
    e = { k: 'tv', w, tone: 'good', t: fmtL(l('Um programa de TV chama {a} para tocar "{t}".', 'A TV show invites {a} to play "{t}".'), { a: act.name, t: c.title }), opts: [
      { id: 'skip', t: l('Recusar (agenda cheia)', 'Decline (busy schedule)'), hint: l('Nada acontece.', 'Nothing happens.') },
      { id: 'go', t: l('Ir ao programa', 'Do the show'), hint: l('+10 de expectativa e alcance de TV; a banda cansa.', '+10 anticipation and TV reach; the band gets tired.') },
    ] };
  }
  c.ev = c.ev.filter((x) => x.w !== w);
  c.ev.push(e);
  if (c.ev.length > 12) c.ev.shift();
  return e;
}

export const openEv27 = (c: Camp27): Ev27 | undefined => c.ev.find((e) => !e.pick);

/** Responde ao evento da semana `w`. `auto` = ninguém respondeu (vale a prudente). */
export function choose27(s: GameState, c: Camp27, w: number, optId: string, auto = false): L {
  const e = c.ev.find((x) => x.w === w);
  if (!e || e.pick) return l('Nada a decidir.', 'Nothing to decide.');
  const o = e.opts.find((x) => x.id === optId);
  if (!o) return l('Opção inválida.', 'Invalid option.');
  const act = s.acts[c.actId];
  if (!act) return l('Artista inválido.', 'Invalid act.');
  if (o.cost && freeCash20(s) < o.cost) return cashWhy20(s, o.cost, l('Caixa insuficiente.', 'Not enough cash.'));
  if (o.cost && !post(s, `camp27ev:${c.id}:${e.k}:${o.id}`, -o.cost, 'marketing', `Campanha: ${c.title}`)) return l('Já feito nesta semana.', 'Already done this week.');
  if (o.cost) c.spent += o.cost;
  const r = rng27(s, c, w, `pick:${e.k}:${o.id}`);
  const key = hypeKey(s, c);
  const hype = (v: number, t: L) => { addHype(s, key, `camp27:${e.k}`, t, v); c.hype += v; };
  const pr = pendOf(s, c), rel = relOf(s, c);
  let res: L;
  switch (`${e.k}:${o.id}`) {
    case 'rival:ignore': hype(-6, l('Rival lançou junto', 'Rival released alongside')); res = l('A atenção se dividiu: −6.', 'Attention split: −6.'); break;
    case 'rival:delay':
      if (pr) { pr.week += 2; c.launchW = pr.week; c.wEnd = Math.max(c.wEnd, pr.week + 3); }
      hype(-2, l('Estreia adiada', 'Release delayed')); res = l('Data nova, caminho livre. O hype esfriou um pouco (−2).', 'New date, clear road. Hype cooled a little (−2).'); break;
    case 'rival:clash': {
      const b = e.ref ? s.acts[e.ref] : undefined;
      const lose = !!b && b.fame > act.fame + 10 && r.chance(0.35 + (b.fame - act.fame) / 200);
      if (b) addHype(s, `a:${b.id}`, 'camp27clash', fmtL(l('Duelo de lançamentos com {a}', 'Release duel with {a}'), { a: act.name }), 6);
      if (lose) { hype(-8, l('Perdeu a guerra de atenção', 'Lost the attention war')); res = fmtL(l('{b} engoliu a semana: −8.', '{b} owned the week: −8.'), { b: e.refName ?? '?' }); }
      else { hype(10, l('Venceu o duelo de lançamentos', 'Won the release duel')); res = l('O duelo virou assunto e vocês saíram na frente: +10.', 'The duel became news and you came out ahead: +10.'); }
      break;
    }
    case 'review:ignore': hype(-5, l('Prévia negativa', 'Negative early review')); res = l('A resenha pesou: −5.', 'The review hurt: −5.'); break;
    case 'review:invite':
      if (e.ref) opine(s, `c:${e.ref}`, 10, l('nos convidou para ouvir o disco com calma.', 'invited us to listen to the record properly.'));
      hype(2, l('Audição com a crítica', 'Listening session with critics')); res = l('O crítico ouviu de novo e amaciou o tom (+2).', 'The critic listened again and softened (+2).'); break;
    case 'review:rebut':
      if (e.ref) opine(s, `c:${e.ref}`, -14, l('rebateu minha resenha em público.', 'rebutted my review in public.'));
      s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100);
      fandomOf(s, act.id).superfans += Math.round(20 + act.fame * 2);
      hype(6, l('Bate-boca com a crítica', 'Spat with the critics')); res = l('A briga vendeu jornal: +6, fãs fiéis do seu lado, crítico inimigo.', 'The spat sold papers: +6, core fans on your side, a critic for an enemy.'); break;
    case 'viral:organic': hype(8, l('Momento viral', 'Viral moment')); res = l('Cresceu sozinho: +8.', 'It grew on its own: +8.'); break;
    case 'viral:ride': {
      const fake = r.chance(0.2);
      hype(fake ? 6 : 16, fake ? l('Viral "fabricado"', '"Manufactured" viral') : l('Viral impulsionado', 'Boosted viral'));
      const ch = s.year >= 2016 && hasTech(s, 'short_video') ? 'short_clips' : s.year >= 2006 ? 'social' : hasTech(s, 'tv_music') ? 'tv_show' : 'press';
      if (rel && channels27(s).some((x) => x.id === ch)) c.addE += addChannel18(s, rel, ch, o.cost ?? 0);
      else if (pr && channels27(s).some((x) => x.id === ch)) pr.marketing.push({ channel: ch, budget: o.cost ?? 0 });
      res = fake ? l('O público farejou o impulso pago: só +6.', 'People smelled the paid push: only +6.') : l('A onda cresceu: +16 e mais alcance.', 'The wave grew: +16 and more reach.');
      break;
    }
    case 'viral:merch': {
      const v = money(s, 1500 + act.fame * 40);
      post(s, `camp27merch:${c.id}`, v, 'merch', `Produtos: ${c.title}`);
      if (!act.playerBand && act.members.some((id) => s.persons[id]?.ambition === 'art')) act.trust = clamp(act.trust - 2, 0, 100);
      hype(3, l('Produtos do momento', 'Merch of the moment')); res = fmtL(l('Entraram {v}; +3.', '{v} came in; +3.'), { v: `$${Math.round(v / 100)}` }); break;
    }
    case 'ban:edit':
      if (!act.playerBand && act.members.some((id) => s.persons[id]?.ambition === 'art')) act.trust = clamp(act.trust - 3, 0, 100);
      hype(-3, l('Versão editada para o rádio', 'Radio edit')); res = l('Tocou a versão limpa: −3.', 'The clean version played: −3.'); break;
    case 'ban:lobby':
      if (r.chance(0.6)) { hype(2, l('Proibição derrubada', 'Ban lifted')); res = l('A proibição caiu sem barulho (+2).', 'The ban was lifted quietly (+2).'); }
      else { hype(-6, l('Proibida nas rádios', 'Banned from radio')); res = l('Não colou: proibida (−6).', 'It did not work: banned (−6).'); }
      break;
    case 'ban:fight': {
      hype(12, l('"Proibida nas rádios!"', '"Banned from radio!"'));
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
      if (r.chance(0.3)) { scandal(s, act.id, 'offense', 20, fmtL(l('A briga de {a} com as rádios vira escândalo.', '{a}\'s fight with radio turns into a scandal.'), { a: act.name }), { tags: ['camp27'] }); res = l('Fruto proibido vende (+12)… e virou escândalo.', 'Forbidden fruit sells (+12)… and it became a scandal.'); }
      else res = l('Fruto proibido vende: +12.', 'Forbidden fruit sells: +12.');
      break;
    }
    case 'leak:crack': act.trust = clamp(act.trust + 2, 0, 100); hype(-4, l('Vazamento contido', 'Leak contained')); res = l('Vazamento contido; o artista gostou (+2 de confiança).', 'Leak contained; the artist appreciated it (+2 trust).'); break;
    case 'leak:embrace': case 'leak:rush': {
      const p = (hy(s).pend[c.actId] ??= {});
      const q = pr ? Math.max(0, ...pr.songs.map((id) => s.songs[id]?.q ?? 0)) : 50;
      if (o.id === 'rush' && pr) { pr.week = s.week + 1; c.launchW = pr.week; c.wEnd = Math.min(c.wEnd, pr.week + 3); hype(5, l('Estreia antecipada', 'Rushed release')); res = l('Sai semana que vem: +5, menos tempo para piratear.', 'Out next week: +5, less time to pirate.'); }
      else { p.leak = 1; hype(q >= 60 ? 14 : 4, l('Vazamento abraçado', 'Embraced leak')); res = q >= 60 ? l('O vazamento pegou fogo: +14 (a pirataria tira um pouco da estreia).', 'The leak caught fire: +14 (piracy takes a bit of the debut).') : l('Vazou e acharam "ok": +4.', 'It leaked and people found it "fine": +4.'); }
      break;
    }
    case 'probe:scapegoat':
      c.exp = clamp(c.exp - 30, 0, 100); s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
      emitFact(s, { kind: 'payola', actors: ['player', act.id], severity: 25, visibility: 'rumor', tags: ['payola', 'radio', 'camp27'], text: fmtL(l('Corre o boato de que a campanha de "{t}" pagou rádios; o selo culpa um promotor.', 'Rumor has it the "{t}" campaign paid radio; the label blames a promoter.'), { t: c.title }), src: 'camp27' });
      res = l('O promotor levou a culpa. Ficou um boato.', 'The promoter took the blame. A rumor remains.'); break;
    case 'probe:cover':
      if (r.chance(clamp(0.8 - c.exp / 250, 0.4, 0.8))) { c.exp = clamp(c.exp - 20, 0, 100); res = l('Abafado.', 'Covered up.'); }
      else {
        scandal(s, act.id, 'money', 30, fmtL(l('Jabá: a campanha de "{t}" pagou rádios — e tentou abafar.', 'Payola: the "{t}" campaign paid radio — and tried to cover it up.'), { t: c.title }), { tags: ['payola', 'camp27'] });
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100); hype(-10, l('Escândalo de jabá', 'Payola scandal')); c.exp = 0;
        res = l('Não deu: escândalo de jabá, −10 e reputação −4.', 'It failed: payola scandal, −10 and reputation −4.');
      }
      break;
    case 'probe:confess':
      scandal(s, act.id, 'money', 16, fmtL(l('O selo admite ter pago rádios na campanha de "{t}".', 'The label admits paying radio in the "{t}" campaign.'), { t: c.title }), { tags: ['payola', 'camp27'] });
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100); c.exp = 0; w4(s).payola.heat = clamp(w4(s).payola.heat - 10, 0, 100);
      res = l('Escândalo pequeno, conta zerada.', 'Small scandal, slate wiped clean.'); break;
    case 'press:quick': hype(5, l('Entrevista', 'Interview')); act.momentum = clamp(act.momentum + 2, 0, 100); res = l('Entrevista correta: +5.', 'A solid interview: +5.'); break;
    case 'press:play': res = l('Entrevista marcada: as respostas são suas.', 'Interview booked: the answers are yours.'); break;
    case 'press:skip': case 'tv:skip': res = l('Recusado.', 'Declined.'); break;
    case 'tv:go': {
      hype(10, l('Na TV', 'On TV'));
      for (const id of act.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.fatigue = clamp(p.fatigue + 6, 0, 100); }
      if (rel && channels27(s).some((x) => x.id === 'tv_show')) c.addE += addChannel18(s, rel, 'tv_show', money(s, 1500));
      res = l('Tocaram na TV: +10 e alcance de TV.', 'They played on TV: +10 and TV reach.'); break;
    }
    default: res = l('Feito.', 'Done.');
  }
  e.pick = o.id; e.res = res;
  say(c, s.week, fmtL(l('{e} → {o}{a}: {r}', '{e} → {o}{a}: {r}'), { e: e.t, o: o.t, a: auto ? l(' (sem resposta)', ' (no answer)') : '', r: res }), e.tone);
  return res;
}

/** Resultado da entrevista jogável disparada pelo evento "press:play" (vem do press27). */
export function pressResult27(s: GameState, c: Camp27, hypeDelta: number): void {
  const v = Math.round(clamp(hypeDelta, -15, 20));
  if (!v) return;
  addHype(s, hypeKey(s, c), 'camp27:press', l('Entrevista da campanha', 'Campaign interview'), v);
  c.hype += v;
  say(c, s.week, fmtL(l('Entrevista: {v} de expectativa.', 'Interview: {v} anticipation.'), { v: v > 0 ? `+${v}` : v }), v >= 0 ? 'good' : 'bad');
}

// ---------------------------------------------------------------- jogadas avulsas (as ações rápidas de sempre)

export interface Move27 { id: string; name: L; fx: L; cost: number; ok: boolean; why?: L; risk?: boolean }
export function moves27(s: GameState, c: Camp27): Move27[] {
  const act = s.acts[c.actId], rel = relOf(s, c), pr = pendOf(s, c);
  if (!act || c.status !== 'live') return [];
  const out: Move27[] = [];
  if (pr || !rel) for (const x of levers(s, c.actId)) out.push({ id: `lever:${x.id}`, name: x.name, fx: x.fx, cost: x.cost, ok: x.ok, why: x.why, risk: x.id === 'feud' || x.id === 'leak' });
  if (rel && hasTech(s, 'radio')) {
    const fam = familyOf(act.genre);
    const f = fmtsNow18(s).find((k) => FMT18[k].fam.includes(fam)) ?? fmtsNow18(s)[0];
    if (f) for (const how of ['plug', 'indie'] as How18[]) {
      const tried = !!radio18(s).tried[`${rel.id}|${f}`];
      const old = s.week - rel.week > 16;
      out.push({ id: `radio:${f}:${how}`, name: fmtL(l('Rádio ({f}): {h}', 'Radio ({f}): {h}'), { f: FMT18[f].name, h: HOW18[how].name }), fx: HOW18[how].desc, cost: money(s, HOW18[how].real), ok: !tried && !old, why: tried ? l('Já apresentada a esse formato.', 'Already pitched to this format.') : old ? l('Faixa velha demais.', 'Too old.') : undefined, risk: how === 'indie' });
    }
  }
  if (rel && hasTech(s, 'streaming')) {
    const done = !!st18(s).pitch[rel.id];
    out.push({ id: 'playlist', name: l('Pitch para playlists editoriais', 'Pitch to editorial playlists'), fx: l('Chance de entrar numa playlist: +30% de unidades por 8 semanas.', 'Chance to land on a playlist: +30% units for 8 weeks.'), cost: money(s, 400), ok: !done && s.week - rel.week <= 4, why: done ? l('Já apresentado.', 'Already pitched.') : undefined });
    FARM18.forEach((d, i) => out.push({ id: `farm:${i}`, name: d.name, fx: l('Streams comprados: unidades sobem, a plataforma procura fraude.', 'Bought streams: units go up, the platform hunts for fraud.'), cost: money(s, d.real), ok: (st18(s).farm[rel.id]?.until ?? 0) <= s.week, risk: true }));
  }
  const se = tv18(s).cur;
  if (se?.stage === 'live' && se.cont.some((x) => x.a === c.actId && x.out === undefined)) out.push({ id: 'tv:push', name: l('Campanha de voto na TV', 'TV vote campaign'), fx: l('+8 votos para o seu participante.', '+8 votes for your contestant.'), cost: pushCost18(s), ok: true });
  return out;
}
export function doMove27(s: GameState, c: Camp27, id: string): L {
  const m = moves27(s, c).find((x) => x.id === id);
  if (!m) return l('Indisponível.', 'Unavailable.');
  if (!m.ok) return m.why ?? l('Indisponível.', 'Unavailable.');
  const rel = relOf(s, c);
  const [k, a, b] = id.split(':');
  const h0 = hypeOf(s, hypeKey(s, c)).v;
  let out: L;
  if (k === 'lever') out = useLever(s, c.actId, a as Lever);
  else if (k === 'radio' && rel) out = pitchRadio18(s, rel.id, a as never, b as How18);
  else if (k === 'playlist' && rel) out = pitchPlaylist18(s, rel.id);
  else if (k === 'farm' && rel) out = buyStreams18(s, rel.id, Number(a));
  else if (k === 'tv') out = pushVotes18(s, c.actId, false) ?? l('Campanha de voto no ar.', 'Vote campaign live.');
  else return l('Indisponível.', 'Unavailable.');
  if (m.risk) c.exp = clamp(c.exp + (k === 'radio' ? 22 : k === 'farm' ? 18 : 10), 0, 100);
  const dh = hypeOf(s, hypeKey(s, c)).v - h0;
  if (dh) c.hype += Math.round(dh);
  say(c, s.week, fmtL(l('Jogada: {n} — {r}', 'Move: {n} — {r}'), { n: m.name, r: out }), m.risk ? 'warn' : undefined);
  return out;
}

// ---------------------------------------------------------------- fim e pós-morte

function finish27(s: GameState, c: Camp27, early = false): void {
  c.status = 'done';
  const rel = relOf(s, c);
  const lines: L[] = [];
  lines.push(fmtL(l('Gasto na campanha: {d}; expectativa somada: {h}; exposição a escândalo: {x}/100.', 'Campaign spend: {d}; anticipation added: {h}; scandal exposure: {x}/100.'), { d: `$${Math.round(c.spent / 100)}`, h: c.hype, x: Math.round(c.exp) }));
  if (rel) {
    const rh = hy(s).rel[rel.id];
    const units = rel.weekly.reduce((t, x) => t + x, 0);
    lines.push(fmtL(l('"{t}": {u} unidades até agora, melhor posição {p}, alcance do marketing {e}%.', '"{t}": {u} units so far, best position {p}, marketing reach {e}%.'), { t: rel.title, u: units, p: rel.peak < 999 ? `#${rel.peak}` : '—', e: Math.round(rel.marketingE * 100) }));
    if (rh?.bl) lines.push(fmtL(l('Saiu fraca porque a expectativa ({x}) pedia um disco nota {n} e veio {q}: o público reagiu mal.', 'It came out weak because anticipation ({x}) called for a {n} record and it was a {q}: the public turned on it.'), { x: rh.exp, n: rh.need, q: rh.q }));
    else if (rh?.sl) lines.push(l('Pouca expectativa para um disco tão bom: deve crescer no boca a boca (sucesso tardio).', 'Little anticipation for such a good record: it should grow by word of mouth (sleeper hit).'));
    else if (rh && rh.exp >= 30) lines.push(fmtL(l('Expectativa {x} e disco à altura (precisava {n}, veio {q}): a estreia aproveitou o hype.', 'Anticipation {x} and a record to match (needed {n}, got {q}): the debut rode the hype.'), { x: rh.exp, n: rh.need, q: rh.q }));
    else if (rh) lines.push(fmtL(l('Saiu morna porque a expectativa ficou em {x}: pouca gente esperava o disco.', 'It came out lukewarm because anticipation stayed at {x}: few people were waiting for it.'), { x: rh.exp }));
    if (c.addE > 0.01) lines.push(fmtL(l('Depois da estreia a campanha somou {e} pontos de alcance.', 'After launch the campaign added {e} reach points.'), { e: Math.round(c.addE * 100) }));
  } else if (early) lines.push(l('Campanha encerrada antes da estreia; a verba já investida continua valendo no lançamento.', 'Campaign closed before launch; money already invested still counts at launch.'));
  const picks = c.ev.filter((e) => e.pick).length;
  if (picks) lines.push(fmtL(l('{n} imprevisto(s) respondido(s).', '{n} surprise(s) handled.'), { n: picks }));
  c.sum = lines;
  say(c, s.week, l('Campanha encerrada.', 'Campaign closed.'), 'good');
}

/** Expectativa atual do alvo (para o quadro): valor e quanto o disco precisa ter para não haver reação. */
export function campMeter27(s: GameState, c: Camp27): { hype: number; need: number; q: number | null } {
  const pr = pendOf(s, c), rel = relOf(s, c);
  const v = Math.round(hypeOf(s, hypeKey(s, c)).v);
  const q = pr ? Math.round(Math.max(0, ...pr.songs.map((id) => s.songs[id]?.q ?? 0))) : rel ? Math.round(rel.q) : null;
  return { hype: v, need: needQ(v), q };
}
