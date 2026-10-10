// Rodada 18 (media18) — CLIPES E COREOGRAFIA (M4), VIRAL E RESSURGIMENTO DE CATÁLOGO (M3), DJ/CLUBE/REMIX (C1).
//   M4: o clipe é um projeto (orçamento, diretor com estilo — autoral, de estúdio, estreante —, coreógrafo, versão
//       censurada). Entra como canal de marketing (mkt18, com saturação), pode entrar em rotação pesada na rede de
//       clipes (1981+), ser banido (autoral sem versão censurada: perde a rotação, ganha notoriedade) e lançar dança.
//       Diretores têm carreira: clipe que estoura vira currículo (e cachê mais alto).
//   M3: faixas antigas voltam (vídeo curto 2018+, séries/filmes antes): o jogador decide — impulsionar com criadores,
//       remix oficial (se o contrato permitir), surfar ou derrubar usos. Viral traz ouvintes de uma vez (vídeo).
//   C1: DJs com estilo e carreira (disco, hip-hop, house, techno, baile funk, reggaeton, EDM), remix encomendado,
//       parada de clubes, record pool (1975+) e concurso de remix (fã pode virar DJ).

import { Rng, clamp, seedState } from '../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { registerExplain } from '../explain18';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { exploitBlock } from '../rights';
import type { GameState, Release } from '../types';
import { fmtL, hasTech, money, notify, playerActs, post, remember } from '../util';
import { addRecoup18 } from './contracts18';
import { addChannel18 } from './mkt18';

// ================================================================ estado

export type DirStyle18 = 'auteur' | 'studio' | 'rookie';
export interface Dir18 { id: string; name: string; style: DirStyle18; fame: number; hits: number; y: number }
export interface Vid18 { rel: string; w: number; dir: string; tier: number; v: number; choreo?: number; censor?: number; heavy?: number; banned?: number }
export interface Dj18 { id: string; name: string; style: string; fame: number; hits: number; y: number; fan?: string }
export interface Remix18 { rel: string; dj: string; w: number; until: number; k: number }
export interface Viral18 { rel: string; w: number; until: number; k: number; how?: string }
export interface Media18State {
  dirs: Dir18[]; vids: Record<string, Vid18>; djs: Dj18[]; rmx: Record<string, Remix18>; viral: Record<string, Viral18>;
  pool: number; club: { rel: string; sc: number; mine: number }[]; clubTop: Record<string, number>; seq: number; lastViral: number;
  n: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { media18: Media18State } }
const fresh = (): Media18State => ({ dirs: [], vids: {}, djs: [], rmx: {}, viral: {}, pool: 0, club: [], clubTop: {}, seq: 0, lastViral: -999, n: {} });
registerExt4('media18', fresh);
export function media18(s: GameState): Media18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.media18 ??= fresh()) as Media18State;
  const o = st as unknown as Record<string, unknown>;
  if (!o.ok18) { const f = fresh(); for (const k of Object.keys(f) as (keyof Media18State)[]) o[k] ??= f[k]; o.ok18 = 1; }
  return st;
}
const cnt = (s: GameState, k: string) => { const n = media18(s).n; n[k] = (n[k] ?? 0) + 1; };
const mine = (s: GameState, rel: Release | undefined): rel is Release => !!rel && (rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand);

// ================================================================ M4 — clipes

export const videoOpen18 = (s: GameState): boolean => hasTech(s, 'tv_music');
/** era dos clipes na TV a cabo (rotação pesada decide carreiras) */
export const mtvEra18 = (s: GameState): boolean => hasTech(s, 'clipnet') && s.year <= 2008;
export const VTIER18 = [
  { name: l('Baixo orçamento', 'Low budget'), real: 8000, q: 40 },
  { name: l('Padrão de gravadora', 'Label standard'), real: 40000, q: 58 },
  { name: l('Superprodução', 'Blockbuster'), real: 200000, q: 74 },
];
export const DSTYLE18: Record<DirStyle18, { name: L; fee: number; sd: number; desc: L }> = {
  auteur: { name: l('Autoral', 'Auteur'), fee: 1.5, sd: 15, desc: l('Visão própria: pode virar clássico ou ser banido. Caro.', 'Own vision: may become a classic or get banned. Pricey.') },
  studio: { name: l('De estúdio', 'Studio'), fee: 1, sd: 6, desc: l('Confiável: entrega o que foi pedido.', 'Reliable: delivers what was asked.') },
  rookie: { name: l('Estreante', 'Rookie'), fee: 0.6, sd: 18, desc: l('Barato e imprevisível; se acertar, vira estrela (e você descobriu).', 'Cheap and unpredictable; if it lands, they become a star (and you found them).') },
};
const DN1 = ['Spike', 'Mara', 'Hype', 'Dave', 'Sofie', 'Anton', 'Kahlil', 'Paula', 'Jonas', 'Lia', 'Rex', 'Tomas', 'Iris', 'Bruno', 'Kenji'];
const DN2 = ['Vega', 'Lindqvist', 'Moreau', 'Okoye', 'Ruiz', 'Hale', 'Corbin', 'Mattos', 'Sato', 'Weller', 'Kane', 'Duarte', 'Ilić', 'Faro'];
export function ensureDirs18(s: GameState): Dir18[] {
  const st = media18(s);
  if (!videoOpen18(s)) return [];
  const r = new Rng(seedState(`dirs18|${s.config.seed}|${Math.floor(s.year / 8)}`));
  while (st.dirs.filter((d) => s.year - d.y < 25).length < 6) {
    const style = (['auteur', 'studio', 'studio', 'rookie'] as DirStyle18[])[r.int(0, 3)];
    st.dirs.push({ id: `vd${++st.seq}`, name: `${r.pick(DN1)} ${r.pick(DN2)}`, style, fame: style === 'rookie' ? r.int(5, 20) : r.int(30, 70), hits: 0, y: s.year });
  }
  return st.dirs.filter((d) => s.year - d.y < 25);
}
export const dirFee18 = (s: GameState, d: Dir18, tier: number): number => money(s, VTIER18[tier].real * DSTYLE18[d.style].fee * (1 + d.fame / 150) * (mtvEra18(s) || hasTech(s, 'streaming') ? 1 : 0.4));
export const choreoFee18 = (s: GameState): number => money(s, mtvEra18(s) || hasTech(s, 'streaming') ? 6000 : 2500);
const danceFam = (f: FamilyId): number => (['pop', 'rnb', 'latin', 'electronic', 'caribbean', 'asia_me', 'hiphop', 'brazil', 'africa'].includes(f) ? 1 : 0.5);

export function makeVideo18(s: GameState, relId: string, o: { tier: number; dir: string; choreo?: boolean; censor?: boolean }): L {
  const rel = s.releases[relId];
  const st = media18(s);
  if (!mine(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (!videoOpen18(s)) return l('Ainda não há TV musical.', 'There is no music TV yet.');
  if (st.vids[relId]) return l('Este lançamento já tem clipe.', 'This release already has a video.');
  if (s.week - rel.week > 20) return l('Tarde demais: clipe é para faixa nova.', 'Too late: videos are for new tracks.');
  const d = ensureDirs18(s).find((x) => x.id === o.dir);
  const tier = clamp(Math.round(o.tier), 0, 2);
  if (!d) return l('Escolha um diretor.', 'Pick a director.');
  const cost = dirFee18(s, d, tier) + (o.choreo ? choreoFee18(s) : 0);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `v18:${relId}`, -cost, 'marketing', `Clipe: ${rel.title}`);
  const act = s.acts[rel.actId];
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  if (c && c.party === 'player' && !act.playerBand) addRecoup18(s, c, 'video', cost);
  const r = new Rng(seedState(`v18|${s.config.seed}|${relId}`));
  const looks = act?.image ? act.image.popularity / 10 : 3;
  let v = VTIER18[tier].q + d.fame / 8 + looks + r.normal(d.style === 'auteur' ? 8 : 0, DSTYLE18[d.style].sd);
  if (o.censor && d.style === 'auteur') v -= 8;
  v = clamp(v, 5, 100);
  const vid: Vid18 = { rel: relId, w: s.week, dir: d.id, tier, v: Math.round(v), choreo: o.choreo ? 1 : 0, censor: o.censor ? 1 : 0 };
  st.vids[relId] = vid;
  cnt(s, 'video');
  // o clipe entra como canal (rede de clipes ou programa de TV), com a força da qualidade
  const ch = hasTech(s, 'clipnet') ? 'music_video' : 'tv_show';
  addChannel18(s, rel, ch, Math.round(cost * (0.4 + v / 100)));
  const out: L[] = [fmtL(l('Clipe de "{t}" pronto (qualidade {v}).', 'Video for "{t}" done (quality {v}).'), { t: rel.title, v: vid.v })];
  // banido: autoral sem versão censurada
  if (d.style === 'auteur' && !o.censor && r.chance(0.22 + (v > 70 ? 0.1 : 0))) {
    vid.banned = 1;
    if (act) { act.fame = clamp(act.fame + 1.5, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic + 3, 0, 100); }
    emitFact(s, { kind: 'video_banned', actors: [rel.actId, 'player'], severity: 45, visibility: 'public', tags: ['media', 'controversy'], text: fmtL(l('O clipe de "{t}" ({d}) é banido da TV. A polêmica corre.', 'The "{t}" video ({d}) is banned from TV. Controversy spreads.'), { t: rel.title, d: d.name }), src: 'media18' });
    out.push(l('Banido da TV! Sem rotação, mas todo mundo comenta (fama e prestígio sobem).', 'Banned from TV! No rotation, but everyone talks (fame and prestige rise).'));
  } else if (mtvEra18(s) && r.chance(clamp((v - 45) / 70 + (act?.fame ?? 0) / 250, 0.03, 0.8))) {
    vid.heavy = s.week + 10;
    cnt(s, 'heavy');
    if (act) { act.fame = clamp(act.fame + 2, 0, 100); if (act.image) act.image.popularity = clamp(act.image.popularity + 3, 0, 100); }
    d.fame = clamp(d.fame + 8, 0, 100); d.hits++;
    out.push(l('Rotação pesada na rede de clipes por 10 semanas!', 'Heavy rotation on the video network for 10 weeks!'));
  }
  // coreografia: dança vira moda (vídeo curto → desafio viral; TV → febre da dança)
  if (o.choreo && act) {
    const fit = danceFam(familyOf(act.genre));
    if (hasTech(s, 'short_video') && r.chance(0.2 + 0.25 * fit + v / 400)) {
      startViral(s, rel, 3.2, 10, 'dance');
      out.push(l('A coreografia virou desafio nas redes!', 'The choreography became an online challenge!'));
    } else { act.fans.casual += Math.round(3000 * fit * (1 + act.fame / 30)); out.push(l('A dança pega nas festas: fãs casuais novos.', 'The dance catches on at parties: new casual fans.')); }
  }
  if (d.style === 'rookie' && v > 70) { d.fame = clamp(d.fame + 20, 0, 100); out.push(fmtL(l('{d} acertou em cheio: estreante virou nome disputado.', '{d} nailed it: the rookie is now in demand.'), { d: d.name })); }
  if (d.fame > 70 && d.hits >= 2) emitFact(s, { kind: 'career', actors: [rel.actId], severity: 20, visibility: 'public', tags: ['media'], text: fmtL(l('{d} vira o diretor de clipes mais disputado.', '{d} becomes the most sought-after video director.'), { d: d.name }), src: 'media18' });
  return joinL(out);
}

// ================================================================ M3 — viral e catálogo

function startViral(s: GameState, rel: Release, k: number, weeks: number, how: string): void {
  const st = media18(s);
  st.viral[rel.id] = { rel: rel.id, w: s.week, until: s.week + weeks, k, how };
  rel.live = true;
  // viral traz ouvintes de uma vez (vídeo/algoritmo): muitos plays, pouca conversão
  if (rel.st18) { rel.st18.src.vid = (rel.st18.src.vid ?? 0) + 0.35; rel.st18.src.alg = (rel.st18.src.alg ?? 0) + 0.15; const t = Object.values(rel.st18.src).reduce((a, b) => a + (b ?? 0), 0); for (const kk of Object.keys(rel.st18.src)) rel.st18.src[kk as keyof typeof rel.st18.src]! /= t; }
  cnt(s, 'viral');
  emitFact(s, { kind: 'viral', actors: [rel.actId, 'player'], severity: 35, visibility: 'public', tags: ['media', 'viral'], text: fmtL(l('"{t}" viraliza.', '"{t}" goes viral.'), { t: rel.title }), src: 'media18' });
}

export const VIRAL_OPT18: Record<string, { name: L; desc: L; real: number; k: number; weeks: number }> = {
  push: { name: l('Impulsionar com criadores', 'Boost with creators'), desc: l('Paga influenciadores para usar o trecho.', 'Pay influencers to use the clip.'), real: 3000, k: 3, weeks: 10 },
  remix: { name: l('Remix oficial (versão acelerada)', 'Official remix (sped-up)'), desc: l('Lança a versão que o público já usa. Precisa do direito no contrato.', 'Release the version people already use. Needs the right in the contract.'), real: 2000, k: 2.6, weeks: 14 },
  block: { name: l('Derrubar usos não autorizados', 'Take down unauthorized uses'), desc: l('Protege a obra e o artista; o viral morre.', 'Protects the work and the artist; the viral dies.'), real: 500, k: 1.1, weeks: 4 },
  ride: { name: l('Deixar acontecer', 'Let it ride'), desc: l('De graça: sobe e passa.', 'Free: it rises and passes.'), real: 0, k: 1.8, weeks: 6 },
};

registerInboxKind('media18_viral', {
  label: l('Viral', 'Viral'), cat: 'decision', icon: 'sparkle', prio: 2,
  goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const rel = s.releases[String(m.ref?.rel ?? '')];
    const o = VIRAL_OPT18[action];
    if (!rel || !o) return l('Passou.', 'It passed.');
    if (action === 'remix') { const b = exploitBlock(s, rel, 'remaster'); if (b && rel.owner === 'player' && !s.acts[rel.actId]?.playerBand) return b; }
    const cost = money(s, o.real);
    if (cost && s.player.cash < cost) return l('Caixa insuficiente: você deixou acontecer.', 'Not enough cash: you let it ride.');
    if (cost) post(s, `m18v:${rel.id}:${action}`, -cost, action === 'remix' ? 'recording' : 'promo', `${o.name.pt}: ${rel.title}`);
    startViral(s, rel, o.k, o.weeks, action);
    const act = s.acts[rel.actId];
    if (action === 'block' && act) { if (!act.playerBand) act.trust = clamp(act.trust + 4, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100); }
    if (action === 'push' && act && !act.playerBand && act.members.some((id) => s.persons[id]?.ambition === 'art')) act.trust = clamp(act.trust - 2, 0, 100);
    return fmtL(l('{o}: unidades ×{k} caindo ao longo de {w} semanas.', '{o}: units ×{k} fading over {w} weeks.'), { o: o.name, k: o.k, w: o.weeks });
  },
});

function viralMonth(s: GameState, r: Rng): void {
  const st = media18(s);
  for (const [k, v] of Object.entries(st.viral)) if (v.until < s.week - 26) delete st.viral[k];
  if (s.week - st.lastViral < 26) return;
  const base = hasTech(s, 'short_video') ? 0.07 : hasTech(s, 'streaming') ? 0.035 : hasTech(s, 'tv_music') ? 0.015 : 0;
  if (!base) return;
  const cands: { rel: Release; w: number }[] = [];
  for (const id of playerActs(s)) for (const rid of s.acts[id]?.releases ?? []) {
    const rel = s.releases[rid];
    if (!mine(s, rel) || s.week - rel.week < 52 || st.viral[rid]) continue;
    const so = rel.songs.map((x) => s.songs[x]).filter(Boolean);
    const hook = so.length ? Math.max(...so.map((x) => x.melody)) : 50;
    cands.push({ rel, w: Math.pow(hook / 60, 3) * (rel.type === 'single' ? 1.3 : 1) });
  }
  if (!cands.length || !r.chance(Math.min(0.15, base * Math.sqrt(cands.length) / 2))) return;
  const tot = cands.reduce((t, c) => t + c.w, 0);
  let x = r.next() * tot;
  const pick = cands.find((c) => (x -= c.w) <= 0) ?? cands[0];
  st.lastViral = s.week;
  const rel = pick.rel, act = s.acts[rel.actId];
  const why = hasTech(s, 'short_video') ? l('Um trecho de 15 segundos virou trilha de vídeos curtos', 'A 15-second clip became the soundtrack of short videos') : hasTech(s, 'streaming') ? l('A faixa tocou numa série de streaming e o público foi atrás', 'The track played in a streaming series and audiences went looking') : l('A música voltou num filme e as rádios de nostalgia pegaram', 'The song came back in a film and oldies radio picked it up');
  const block = exploitBlock(s, rel, 'remaster');
  pushInbox18(s, 'media18_viral', {
    from: 'Analytics', subject: fmtL(l('"{t}" está voltando!', '"{t}" is coming back!'), { t: rel.title }),
    body: fmtL(l('{w}: "{t}" ({a}, {y}) sobe sem nenhuma campanha. O que fazer?\nImpulsionar rende mais; remix oficial dura mais{b}; derrubar protege a obra; deixar passar é de graça. Viral traz muita gente que ouve uma vez: poucos viram fãs.', '{w}: "{t}" ({a}, {y}) is climbing with no campaign. What now?\nBoosting pays most; an official remix lasts longer{b}; taking it down protects the work; letting it ride is free. Virals bring many one-time listeners: few become fans.'), { w: why, t: rel.title, a: act?.name ?? '', y: rel.year, b: block ? l(' (o contrato não permite: peça ao artista)', ' (the contract forbids it: ask the artist)') : '' }),
    actions: [{ id: 'push', label: VIRAL_OPT18.push.name }, { id: 'remix', label: VIRAL_OPT18.remix.name }, { id: 'block', label: VIRAL_OPT18.block.name }, { id: 'ride', label: VIRAL_OPT18.ride.name }],
    ref: { rel: rel.id, act: rel.actId }, tone: 'good', weeks: 3,
  });
}

// ================================================================ C1 — DJs, remix, clubes

export const remixOpen18 = (s: GameState): boolean => s.year >= 1974;
const DJSTY: { id: string; name: L; from: number; to: number; fam: FamilyId[]; mk?: string[] }[] = [
  { id: 'disco', name: l('Disco', 'Disco'), from: 1974, to: 1984, fam: ['pop', 'rnb', 'electronic'] },
  { id: 'hiphop', name: l('Hip-hop', 'Hip-hop'), from: 1979, to: 2100, fam: ['hiphop', 'rnb'] },
  { id: 'house', name: l('House', 'House'), from: 1985, to: 2100, fam: ['electronic', 'pop', 'rnb'] },
  { id: 'techno', name: l('Techno', 'Techno'), from: 1988, to: 2100, fam: ['electronic'] },
  { id: 'funk', name: l('Baile funk', 'Baile funk'), from: 1990, to: 2100, fam: ['brazil', 'hiphop', 'pop'] },
  { id: 'reggaeton', name: l('Reggaeton', 'Reggaeton'), from: 2000, to: 2100, fam: ['latin', 'caribbean', 'pop'] },
  { id: 'edm', name: l('EDM', 'EDM'), from: 2008, to: 2100, fam: ['electronic', 'pop'] },
];
export const djStyle18 = (id: string) => DJSTY.find((x) => x.id === id);
const NICK = ['Larry', 'Shep', 'Kool', 'Frankie', 'Marky', 'Tiko', 'Nina', 'Grand', 'Malu', 'Ivo', 'Zeca', 'Rocco', 'Yara', 'Sasha', 'Dex', 'Luz'];
const NICK2 = ['Levan', 'Pettibone', 'Mix', 'Knuckles', 'Slick', 'Fresh', 'Boom', 'Nova', 'Groove', 'Mendes', 'Volt', 'Sol', 'Ritmo', 'Flash'];
export function ensureDjs18(s: GameState): Dj18[] {
  const st = media18(s);
  if (!remixOpen18(s)) return [];
  const r = new Rng(seedState(`djs18|${s.config.seed}|${Math.floor(s.year / 6)}`));
  for (const sty of DJSTY.filter((x) => s.year >= x.from && s.year <= x.to)) {
    while (st.djs.filter((d) => d.style === sty.id && s.year - d.y < 20).length < 2) st.djs.push({ id: `dj${++st.seq}`, name: `DJ ${r.pick(NICK)} ${r.pick(NICK2)}`, style: sty.id, fame: r.int(15, 65), hits: 0, y: s.year });
  }
  return st.djs.filter((d) => s.year - d.y < 20 && (djStyle18(d.style)?.to ?? 0) >= s.year);
}
export const djFee18 = (s: GameState, d: Dj18): number => money(s, 1500 * (1 + d.fame / 25));
/** encaixe do estilo do DJ com o gênero do ato (0–1) */
export const djFit18 = (s: GameState, d: Dj18, rel: Release): number => { const f = familyOf(s.acts[rel.actId]?.genre ?? 'pop'); return djStyle18(d.style)?.fam.includes(f) ? 1 : danceFam(f) * 0.4; };

export function commissionRemix18(s: GameState, relId: string, djId: string): L {
  const rel = s.releases[relId], st = media18(s);
  if (!mine(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (!remixOpen18(s)) return l('A cultura do remix ainda não existe.', 'Remix culture does not exist yet.');
  if (st.rmx[relId]) return l('Já existe remix deste lançamento.', 'This release already has a remix.');
  if (s.week - rel.week > 26) return l('Remix é para lançamento recente (até 26 semanas).', 'Remixes are for recent releases (up to 26 weeks).');
  const d = ensureDjs18(s).find((x) => x.id === djId);
  if (!d) return l('Escolha um DJ.', 'Pick a DJ.');
  const cost = djFee18(s, d);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `m18r:${relId}`, -cost, 'recording', `Remix ${d.name}: ${rel.title}`);
  const fit = djFit18(s, d, rel);
  st.rmx[relId] = { rel: relId, dj: d.id, w: s.week, until: s.week + 16, k: 1 + 0.06 + fit * 0.14 + d.fame / 500 };
  rel.live = true;
  cnt(s, 'remix');
  const act = s.acts[rel.actId];
  if (act) act.fans.casual += Math.round(1500 * fit * (1 + d.fame / 40));
  return fmtL(l('{d} entrega o remix de "{t}" em 12": pistas por 16 semanas (unidades ×{k}).', '{d} delivers the "{t}" 12" remix: clubs for 16 weeks (units ×{k}).'), { d: d.name, t: rel.title, k: Math.round(st.rmx[relId].k * 100) / 100 });
}

export function togglePool18(s: GameState): L {
  const st = media18(s);
  if (s.year < 1975) return l('Os record pools surgem em 1975.', 'Record pools appear in 1975.');
  st.pool = st.pool ? 0 : 1;
  return st.pool ? l('Assinado: DJs recebem seus discos de graça (+15% de execução nos clubes).', 'Subscribed: DJs get your records free (+15% club play).') : l('Assinatura cancelada.', 'Subscription cancelled.');
}

export function remixContest18(s: GameState, relId: string): L {
  const rel = s.releases[relId], st = media18(s);
  if (!mine(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (!hasTech(s, 'internet')) return l('Concurso de remix precisa de internet (para mandar as trilhas separadas).', 'A remix contest needs the internet (to share the stems).');
  if ((st.n[`cont:${relId}`] ?? 0) > 0) return l('Já houve concurso deste lançamento.', 'This release already had a contest.');
  const cost = money(s, 600);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `m18c:${relId}`, -cost, 'promo', `Concurso de remix: ${rel.title}`);
  st.n[`cont:${relId}`] = 1;
  cnt(s, 'contest');
  const act = s.acts[rel.actId];
  const r = new Rng(seedState(`m18c|${s.config.seed}|${relId}`));
  if (act) { act.fans.active += Math.round(120 + act.fans.core * 0.04); act.fans.core += Math.round(20 + act.fans.core * 0.01); }
  const sty = DJSTY.filter((x) => s.year >= x.from && s.year <= x.to);
  const dj: Dj18 = { id: `dj${++st.seq}`, name: `DJ ${r.pick(NICK)} ${r.pick(NICK2)}`, style: r.pick(sty).id, fame: r.int(3, 12), hits: 0, y: s.year, fan: rel.actId };
  st.djs.push(dj);
  emitFact(s, { kind: 'remix_contest', actors: [rel.actId, 'player'], severity: 15, visibility: 'public', tags: ['media', 'fans'], text: fmtL(l('{d}, fã de {a}, vence o concurso de remix de "{t}".', '{d}, a fan of {a}, wins the "{t}" remix contest.'), { d: dj.name, a: act?.name ?? '', t: rel.title }), src: 'media18' });
  return fmtL(l('Centenas de remixes de fãs: fãs ativos e núcleo sobem. {d} venceu e entrou na sua lista de DJs.', 'Hundreds of fan remixes: active and core fans rise. {d} won and joined your DJ list.'), { d: dj.name });
}

/** parada de clubes do mês: lançamentos com remix/gêneros de pista (seus e as paradas) */
function clubMonth(s: GameState): void {
  const st = media18(s);
  if (!remixOpen18(s)) return;
  const sc: { rel: string; sc: number; mine: number }[] = [];
  const seen = new Set<string>();
  const add = (rel: Release, m: number) => {
    if (seen.has(rel.id) || s.week - rel.week > 20) return;
    seen.add(rel.id);
    const f = familyOf(s.acts[rel.actId]?.genre ?? 'pop');
    const rx = st.rmx[rel.id] && st.rmx[rel.id].until > s.week;
    const u = rel.weekly.slice(-4).reduce((t, x) => t + x, 0);
    const v = u * (f === 'electronic' ? 1.6 : danceFam(f)) * (rx ? 1.6 : 1) * (m && st.pool ? 1.15 : 1);
    if (v > 0) sc.push({ rel: rel.id, sc: Math.round(v), mine: m });
  };
  for (const e of (s.charts.singles ?? []).slice(0, 60)) { const rel = s.releases[e.releaseId]; if (rel) add(rel, mine(s, rel) ? 1 : 0); }
  for (const id of playerActs(s)) for (const rid of (s.acts[id]?.releases ?? []).slice(-3)) { const rel = s.releases[rid]; if (mine(s, rel)) add(rel, 1); }
  st.club = sc.sort((a, b) => b.sc - a.sc).slice(0, 10);
  const top = st.club[0];
  if (top?.mine && !st.clubTop[top.rel]) {
    st.clubTop[top.rel] = s.week;
    const rel = s.releases[top.rel], act = s.acts[rel.actId];
    if (act) act.fame = clamp(act.fame + 1.2, 0, 100);
    const rx = st.rmx[top.rel];
    const d = rx ? st.djs.find((x) => x.id === rx.dj) : undefined;
    if (d) { d.fame = clamp(d.fame + 10, 0, 100); d.hits++; }
    emitFact(s, { kind: 'club_chart', actors: [rel.actId, 'player'], severity: 25, visibility: 'public', tags: ['media', 'club'], text: fmtL(l('"{t}"{d} chega ao #1 da parada de clubes.', '"{t}"{d} hits #1 on the club chart.'), { t: rel.title, d: d ? fmtL(l(' (remix de {n})', ' ({n} remix)'), { n: d.name }) : '' }), src: 'media18' });
    notify(s, fmtL(l('"{t}" é #1 nas pistas!', '"{t}" is #1 in the clubs!'), { t: rel.title }), 'good');
  }
  // carreiras de DJ: os que acertam sobem; os famosos viram atração
  for (const d of st.djs) {
    d.fame = clamp(d.fame - 0.4, 0, 100);
    if (d.fame >= 80 && d.hits >= 2 && !st.n[`star:${d.id}`]) {
      st.n[`star:${d.id}`] = 1;
      emitFact(s, { kind: 'career', actors: d.fan ? [d.fan] : ['player'], severity: 30, visibility: 'public', tags: ['media', 'club', 'dj'], text: fmtL(l('{d} vira atração principal: de remixador a headliner{f}.', '{d} becomes a headliner: from remixer to star{f}.'), { d: d.name, f: d.fan ? fmtL(l(' (começou num concurso de {a})', ' (started in a {a} contest)'), { a: s.acts[d.fan]?.name ?? '' }) : '' }), src: 'media18' });
      remember(s, 'dj', fmtL(l('{d} vira estrela das pistas.', '{d} becomes a club star.'), { d: d.name }));
    }
  }
  st.djs = st.djs.filter((d) => s.year - d.y < 30).slice(-60);
}

// ================================================================ efeitos e mês

registerMod('chartUnits', 'media18', (s, v, c) => {
  const rel = c.release;
  if (!rel || !mine(s, rel)) return null;
  const st = media18(s);
  let k = 1, lab: L | undefined;
  const vi = st.viral[rel.id];
  if (vi && vi.until > s.week) { const kk = 1 + (vi.k - 1) * Math.exp(-(s.week - vi.w) / 5); k *= kk; lab = vi.how === 'dance' ? l('Desafio de dança viral', 'Viral dance challenge') : l('Viral/ressurgimento', 'Viral/resurgence'); }
  const vd = st.vids[rel.id];
  if (vd?.heavy && vd.heavy > s.week) { k *= 1.3; lab ??= l('Rotação pesada de clipe', 'Heavy video rotation'); }
  const rx = st.rmx[rel.id];
  if (rx && rx.until > s.week) { k *= rx.k * (st.pool ? 1.04 : 1); lab ??= l('Remix nas pistas', 'Remix in the clubs'); }
  return k !== 1 ? { value: v * k, label: lab } : null;
});

registerSimHook('month', 'media18', (s) => {
  const r = new Rng(seedState(`media18|${s.config.seed}|${s.year * 12 + s.month}`));
  const st = media18(s);
  if (st.pool && s.year >= 1975) post(s, 'm18pool', -money(s, 150), 'promo', 'Record pool');
  ensureDirs18(s);
  ensureDjs18(s);
  viralMonth(s, r);
  clubMonth(s);
  for (const k of Object.keys(st.vids)) if (st.vids[k].w < s.week - 260) delete st.vids[k];
  for (const k of Object.keys(st.rmx)) if (st.rmx[k].until < s.week - 104) delete st.rmx[k];
  for (const d of st.dirs) d.fame = clamp(d.fame - 0.3, 0, 100);
});

registerExplain('media.video', (s, c) => {
  const vid = media18(s).vids[String(c.rel ?? '')];
  if (!vid) return null;
  const d = media18(s).dirs.find((x) => x.id === vid.dir);
  return {
    title: l('Clipe', 'Music video'), value: vid.v, fmt: 'num',
    parts: [
      { label: VTIER18[vid.tier].name, value: VTIER18[vid.tier].q, fmt: 'num' },
      { label: fmtL(l('Diretor {d} ({s})', 'Director {d} ({s})'), { d: d?.name ?? '?', s: d ? DSTYLE18[d.style].name : '' }), value: d ? Math.round(d.fame / 8) : 0, fmt: 'signed' },
      ...(vid.censor ? [{ label: l('Versão censurada', 'Censored cut'), value: -8, fmt: 'signed' as const, tone: 'bad' as const }] : []),
      ...(vid.heavy ? [{ label: l('Rotação pesada', 'Heavy rotation'), value: 1.3, fmt: 'mult' as const, tone: 'good' as const }] : []),
      ...(vid.banned ? [{ label: l('Banido (notoriedade)', 'Banned (notoriety)'), value: 'TV', fmt: 'text' as const, tone: 'bad' as const }] : []),
    ],
    note: l('Qualidade = orçamento + fama do diretor + imagem do artista + acaso (autoral e estreante variam mais).', 'Quality = budget + director fame + artist image + chance (auteurs and rookies vary more).'),
  };
});

const joinL = (xs: L[]): L => ({ pt: xs.map((x) => x.pt).join(' '), en: xs.map((x) => x.en).join(' ') });
