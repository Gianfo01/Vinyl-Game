// r27 (K) — ILUSTRAÇÕES DE PÁGINA ("hero art") em pixel art procedural: uma faixa por página grande (Submundo,
// Talentos, Estúdio, Lançamentos, Shows, Turnês, Festivais, Paradas, Imprensa, Finanças, Equipe, Direitos, Prêmios,
// Você, Família, Noite, Mundo, Elenco), com variantes por GERAÇÃO dos objetos (4 faixas: até 1954, 1955–79,
// 1980–99, 2000+), cores pela paleta da ERA (9 eras) e, onde faz sentido, pelo ESTADO (vazio × movimentado,
// riqueza, caixa no vermelho, escândalo recente, calor da polícia, troféus, equipe...).
//
// Três camadas (como hqpx27):
//   artKindOf27(area) / artModel27(area, s) — PURAS: qual cena, qual variante, quem aparece (testável).
//   paintArt27(model, t)                     — PURA (só Px): pinta o quadro no instante t (0 = estático).
//   pageArt27(area, s, opts)                 — DOM: canvas com os bonecos (avatarSprite) e escala inteira.
//
// Gancho para o cabeçalho de página (ui27, agente J) — UMA linha:
//   const art = artSlots27.get(area)?.(s);  if (art) header.prepend(art);
// ou diretamente:  pageArt27(area, s)  (devolve null quando a página não tem arte).

import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { avatarSprite, crowdLook27, lookOf, randomLook } from '../pixel/avatar';
import { drawText } from '../pixel/font';
import { eraOf, type EraId } from '../pixel/palette';
import { C, Px, mix, noise, shade, withAlpha } from '../pixel/px';
import {
  R, amp, bandOf27, ink27, blink, bricks, candle, chair, computer, cone, console27, crowd, desk, dim, disc, drums, floor, grad, guitar,
  halo, jukebox, kit27, lampDesk, micStand, neon, phone, piano, planks, policeCar, poster, press, pressCam, radio, recLight, shelf,
  skyline, speaker, stackDiscs, stars, text, tourVehicle, trophy, tvSet, typewriter, wall, wave, windowPane, tw, type Band27, type K27,
} from './art27kit';

// ---------------------------------------------------------------- catálogo

export type ArtKind27 = 'crime' | 'anr' | 'studio' | 'releases' | 'shows' | 'tour' | 'festival' | 'charts' | 'press' | 'finance'
  | 'team' | 'rights' | 'awards' | 'you' | 'family' | 'night' | 'world' | 'roster';
/** Cenas só das cutscenes (não têm página). */
export type SceneKind27 = ArtKind27 | 'signing' | 'door' | 'memorial' | 'leave' | 'era';

export const ART_KINDS27: ArtKind27[] = ['crime', 'anr', 'studio', 'releases', 'shows', 'tour', 'festival', 'charts', 'press', 'finance', 'team', 'rights', 'awards', 'you', 'family', 'night', 'world', 'roster'];

/** Página → cena (ids de nav25 e das páginas antigas). */
export const AREA_ART27: Record<string, ArtKind27> = {
  crime: 'crime',
  market: 'anr', talent18: 'anr', knownacts27: 'anr', directory: 'anr',
  studio: 'studio', studio12: 'studio', project: 'studio', creation: 'studio', songmkt27: 'studio',
  releases: 'releases', catalog: 'releases', media19: 'releases', tribute19: 'releases', supply18: 'releases',
  shows: 'shows', cal17: 'shows', live19: 'shows',
  tour12: 'tour',
  festivals: 'festival',
  charts: 'charts', platform16: 'charts', market19a: 'charts', regions18: 'charts',
  news17: 'press', media: 'press', critics: 'press', zines19: 'press', fakes19: 'press', outlets16: 'press',
  finance: 'finance', business: 'finance', biz17: 'finance', firm19: 'finance', company: 'finance',
  team: 'team', management: 'team', managers14: 'team', producers15: 'team', agenda17: 'team',
  publishing16: 'rights', rights18: 'rights',
  awards: 'awards', rockhall: 'awards', lendas: 'awards',
  you: 'you', personal: 'you', wealth: 'you',
  dyn18: 'family', family: 'family', kin15: 'family',
  night14: 'night', scenes17: 'night', society18: 'night',
  world: 'world', world17: 'world', regions19: 'world', after18: 'world', labels: 'world', industry: 'world',
  artists: 'roster', people: 'roster', artist18: 'roster', contracts19: 'roster',
};
export const artKindOf27 = (area: string): ArtKind27 | null => AREA_ART27[area] ?? null;

export const KIND_NAME27: Record<SceneKind27, L> = {
  crime: l('Submundo', 'Underworld'), anr: l('Talentos e A&R', 'Talent and A&R'), studio: l('Estúdio', 'Studio'), releases: l('Lançamentos', 'Releases'),
  shows: l('Shows', 'Shows'), tour: l('Turnês', 'Tours'), festival: l('Festivais', 'Festivals'), charts: l('Paradas', 'Charts'), press: l('Imprensa', 'Press'),
  finance: l('Finanças', 'Finance'), team: l('Equipe', 'Team'), rights: l('Direitos e editora', 'Rights and publishing'), awards: l('Prêmios e Hall da Fama', 'Awards and Hall of Fame'),
  you: l('Você', 'You'), family: l('Família', 'Family'), night: l('Noite', 'Night out'), world: l('Mundo', 'World'), roster: l('Elenco', 'Roster'),
  signing: l('Assinatura', 'Signing'), door: l('Imprensa na porta', 'Press at the door'), memorial: l('Memorial', 'Memorial'), leave: l('Despedida', 'Farewell'), era: l('Nova era', 'New era'),
};

// ---------------------------------------------------------------- modelo (puro)

export interface Fig27 {
  /** posição horizontal (0..1 da largura) */
  fx: number;
  /** deslocamento vertical a partir do chão (negativo = mais alto: palco, cadeira) */
  dy?: number;
  pose?: 'stand' | 'walk' | 'sit' | 'play' | 'sitplay';
  dir?: 'SE' | 'SW' | 'NE' | 'NW';
  pid?: string; seed: string;
  role?: string | null;
  /** caminha até fx2 durante a cena (cutscene) */
  walkTo?: number;
  /** escurece (silhueta na contraluz) */
  dark?: boolean;
  /** r29: holograma (translúcido, ciano, com brilho e tremido) */
  holo?: boolean;
}
export interface ArtModel27 {
  area: string; kind: SceneKind27; year: number; band: Band27; era: EraId;
  /** estado discreto da variante (ex.: 'busy', 'empty', 'w2', 'red') */
  state: string;
  /** chave da variante (kind/faixa/estado) — o que os testes e o cache usam */
  variant: string;
  W: number; H: number; fy: number; seed: number;
  /** números do estado que a pintura usa (lotação, troféus, mesas ocupadas...) */
  n: Record<string, number>;
  /** nomes curtos para letreiros (selo, ato, manchete) */
  sign: Record<string, string>;
  figs: Fig27[];
  caption: L;
}

export const ART_W27 = 288, ART_H27 = 80;

type St = { state: string; n: Record<string, number>; sign: Record<string, string>; figs: Fig27[]; caption?: L };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const short = (s: string | undefined, n = 14): string => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().slice(0, n);

/** Atos do jogador (sem importar util do sim, que tem cache — leitura simples). */
function mine(s: GameState) { return Object.values(s.acts ?? {}).filter((a) => a && a.owner === 'player' && a.status !== 'retired' && a.status !== 'split'); }
function topAct(s: GameState) { return mine(s).sort((a, b) => b.fame - a.fame)[0]; }
function membersOf(s: GameState, n: number): string[] { const a = topAct(s); return (a?.members ?? []).filter((id) => s.persons[id]?.alive !== false).slice(0, n); }
const x4 = (s: GameState): Record<string, unknown> => ((s as unknown as { x4?: Record<string, unknown> }).x4 ?? {});

/** Leitura do estado → variante. Cada cena olha só o que muda o desenho. */
function stateOf(kind: SceneKind27, s: GameState): St {
  const me = topAct(s);
  const brand = short(s.config?.companyName, 16);
  const base: St = { state: 'base', n: {}, sign: { brand, act: short(me?.name, 12) }, figs: [] };
  const mem = membersOf(s, 4);
  switch (kind) {
    case 'crime': {
      const c = x4(s).crime17 as { heat?: Record<string, number>; log?: unknown[]; jail?: Record<string, unknown> } | undefined;
      const heat = Math.max(0, ...Object.values(c?.heat ?? {}));
      const busy = (c?.log?.length ?? 0) > 0;
      const hot = heat >= 40;
      base.state = `${busy ? 'busy' : 'empty'}${hot ? '-hot' : ''}`;
      base.n = { heat, busy: busy ? 1 : 0 };
      if (busy) base.figs.push({ fx: 0.64, dy: -1, pose: 'sit', dir: 'SE', seed: 'crime-a' }, { fx: 0.78, dy: -1, pose: 'sit', dir: 'SW', seed: 'crime-b' }, { fx: 0.71, dy: 2, pose: 'sit', dir: 'NE', seed: 'crime-c', dark: true });
      base.figs.push({ fx: 0.2, pose: 'stand', dir: 'SE', seed: 'crime-look', dark: true });
      return base;
    }
    case 'anr': {
      const scouts = (s.player?.staff ?? []).filter((x) => /scout|anr|a&r/i.test(x.role)).length;
      base.n = { scouts: Math.max(1, Math.min(3, scouts || 1)) };
      base.state = `s${base.n.scouts}`;
      ['band-a', 'band-b', 'band-c'].forEach((sd, i) => base.figs.push({ fx: 0.7 + i * 0.08, dy: -10, pose: 'play', dir: 'SW', seed: sd }));
      for (let i = 0; i < base.n.scouts; i++) base.figs.push({ fx: 0.16 + i * 0.09, dy: 0, pose: 'sit', dir: 'NE', seed: `scout-${i}`, role: null });
      return base;
    }
    case 'studio': {
      const busy = mine(s).length > 0;
      base.state = busy ? 'busy' : 'empty';
      base.n = { busy: busy ? 1 : 0, gear: (s.player?.equipment ?? []).length };
      if (busy) { base.figs.push({ fx: 0.72, dy: -22, pose: 'play', dir: 'SW', pid: mem[0], seed: 'st-mus' }); base.figs.push({ fx: 0.36, pose: 'sit', dir: 'NE', seed: 'st-prod' }); }
      return base;
    }
    case 'releases': {
      const lastW = Math.max(0, ...mine(s).map((a) => a.lastRelease ?? 0));
      const fresh = lastW > 0 && s.week - lastW <= 8;
      base.state = fresh ? 'new' : 'idle';
      base.n = { fresh: fresh ? 1 : 0 };
      base.figs.push({ fx: 0.55, pose: 'stand', dir: 'SW', seed: 'rel-worker' });
      return base;
    }
    case 'shows': case 'tour': case 'festival': {
      const fame = me?.fame ?? 0;
      const fill = clamp01(0.15 + fame / 90);
      base.n = { fill, hop: fame > 50 ? 1 : fame > 20 ? 0.6 : 0.2 };
      base.state = fill > 0.8 ? 'packed' : fill > 0.4 ? 'half' : 'thin';
      if (kind === 'tour') {
        const t = (s.tours ?? []).find((x) => x.status === 'running' && s.acts[x.actId]?.owner === 'player');
        base.state = t ? 'on-road' : 'parked';
        base.sign.tour = short(t?.name ?? me?.name, 12);
        base.figs.push({ fx: 0.4, pose: t ? 'walk' : 'stand', dir: 'SE', pid: mem[0], seed: 'tour-a' }, { fx: 0.46, pose: 'stand', dir: 'SE', pid: mem[1], seed: 'tour-b' });
      } else if (kind === 'shows') {
        mem.slice(0, 3).forEach((pid, i) => base.figs.push({ fx: 0.4 + i * 0.1, dy: -16, pose: 'play', dir: 'SE', pid, seed: `show-${i}` }));
        if (!mem.length) base.figs.push({ fx: 0.5, dy: -16, pose: 'play', dir: 'SE', seed: 'show-x' });
      } else {
        const own = Object.values((x4(s).festivals as { f?: Record<string, { land?: unknown }> } | undefined)?.f ?? {}).some((x) => !!x.land); // UNI-4: registro único de festivais
        base.state += own ? '-own' : '';
        base.n.own = own ? 1 : 0;
      }
      return base;
    }
    case 'charts': {
      const top = [...(s.charts?.singles ?? [])].slice(0, 10);
      const pos = top.findIndex((e) => s.releases[e.releaseId] && s.acts[s.releases[e.releaseId].actId]?.owner === 'player');
      base.state = pos === 0 ? 'no1' : pos > 0 ? 'top10' : 'out';
      base.n = { pos };
      base.sign.hit = pos >= 0 ? short(s.releases[top[pos].releaseId]?.title, 12) : '';
      return base;
    }
    case 'press': {
      const sc = x4(s).scandal17 as { last?: Record<string, { w: number }> } | undefined;
      const recent = mine(s).some((a) => { const m = sc?.last?.[a.id]; return !!m && s.week - m.w <= 8; });
      base.state = recent ? 'scandal' : 'calm';
      base.n = { scandal: recent ? 1 : 0 };
      base.figs.push({ fx: 0.3, pose: 'sit', dir: 'NE', seed: 'press-a' }, { fx: 0.55, pose: 'sit', dir: 'NE', seed: 'press-b' });
      return base;
    }
    case 'finance': {
      const cash = s.player?.cash ?? 0;
      const st = cash < 0 ? 'red' : cash > (s.player?.initialCash ?? 0) * 4 ? 'rich' : 'ok';
      base.state = st;
      base.n = { red: st === 'red' ? 1 : 0, rich: st === 'rich' ? 1 : 0 };
      base.figs.push({ fx: 0.42, pose: 'sit', dir: 'SE', seed: 'fin-acc' });
      return base;
    }
    case 'team': {
      const n = Math.min(5, (s.player?.staff ?? []).length);
      base.state = `d${n}`;
      base.n = { staff: n };
      for (let i = 0; i < n; i++) base.figs.push({ fx: 0.12 + i * 0.18, pose: 'sit', dir: i % 2 ? 'SW' : 'SE', seed: `staff-${i}` });
      return base;
    }
    case 'rights': {
      const n = Math.min(5, Object.values(s.songs ?? {}).filter((x) => x && s.acts[(x as { actId?: string }).actId ?? '']?.owner === 'player').length);
      base.state = n > 0 ? 'catalog' : 'blank';
      base.n = { songs: n };
      base.figs.push({ fx: 0.24, pose: 'sitplay', dir: 'SE', seed: 'tin-pan' });
      return base;
    }
    case 'awards': {
      const n = Math.min(12, (s.player?.stats?.awards ?? 0) + (s.player?.stats?.gold ?? 0));
      base.state = n === 0 ? 'bare' : n < 5 ? 'some' : 'full';
      base.n = { trophies: n };
      base.figs.push({ fx: 0.5, dy: -10, pose: 'stand', dir: 'SE', pid: mem[0], seed: 'aw-star' });
      return base;
    }
    case 'you': {
      let nw = s.player?.cash ?? 0;
      try { const g = x4(s).goods8 as { owned?: { value: number }[] } | undefined; nw += (g?.owned ?? []).reduce((a, o) => a + (o.value ?? 0), 0); } catch { /* sem bens */ }
      const k = (s.player?.initialCash ?? 1) || 1;
      const tier = nw < k * 0.5 ? 0 : nw < k * 3 ? 1 : nw < k * 15 ? 2 : 3;
      base.state = `w${tier}`;
      base.n = { tier };
      const me2 = Object.values(s.persons ?? {}).find((p) => p?.isPlayer);
      base.figs.push({ fx: tier >= 2 ? 0.42 : 0.5, pose: tier === 0 ? 'sit' : 'stand', dir: 'SE', pid: me2?.id, seed: 'you' });
      return base;
    }
    case 'family': {
      const me2 = Object.values(s.persons ?? {}).find((p) => p?.isPlayer);
      const kin = (x4(s).kin15 as { links?: Record<string, { rel: string; id: string }[]> } | undefined)?.links?.[me2?.id ?? ''] ?? [];
      const fam = kin.filter((x) => x.rel === 'spouse' || x.rel === 'child').slice(0, 4);
      base.state = fam.length === 0 ? 'alone' : fam.length < 3 ? 'small' : 'big';
      base.n = { fam: fam.length };
      base.figs.push({ fx: 0.3, pose: 'sit', dir: 'SE', pid: me2?.id, seed: 'fam-me' });
      fam.forEach((x, i) => base.figs.push({ fx: 0.42 + i * 0.1, pose: 'sit', dir: i % 2 ? 'SW' : 'SE', pid: s.persons[x.id] ? x.id : undefined, seed: `fam-${i}` }));
      return base;
    }
    case 'night': {
      const fame = me?.fame ?? 0;
      base.state = fame > 50 ? 'vip' : 'regular';
      base.n = { fill: 0.5 + fame / 200 };
      base.figs.push({ fx: 0.3, pose: 'stand', dir: 'SE', seed: 'night-a' }, { fx: 0.36, pose: 'stand', dir: 'SW', seed: 'night-b' });
      return base;
    }
    case 'world': {
      const terr = (s.player?.territories ?? []).length;
      base.state = terr > 3 ? 'global' : terr > 1 ? 'regional' : 'local';
      base.n = { terr };
      return base;
    }
    case 'roster': {
      const n = mine(s).length;
      base.state = n === 0 ? 'empty' : n < 3 ? 'small' : 'busy';
      base.n = { acts: n };
      mem.forEach((pid, i) => base.figs.push({ fx: 0.34 + i * 0.12, pose: i === 2 ? 'sitplay' : 'play', dir: i % 2 ? 'SW' : 'SE', pid, seed: `ros-${i}` }));
      return base;
    }
    default:
      return base;
  }
}

/** Modelo puro da ilustração de uma página (null se a página não tem arte). */
export function artModel27(area: string, s: GameState, o: { year?: number; w?: number; h?: number; kind?: SceneKind27; state?: Partial<St> } = {}): ArtModel27 | null {
  const kind = o.kind ?? artKindOf27(area);
  if (!kind) return null;
  const year = o.year ?? s.year ?? 1960;
  const W = o.w ?? ART_W27, H = o.h ?? ART_H27;
  const st = { ...stateOf(kind, s), ...(o.state ?? {}) };
  const band = bandOf27(year);
  return {
    area, kind, year, band, era: eraOf(year), state: st.state, variant: `${kind}/${band}/${st.state}`,
    W, H, fy: H - (H >= 100 ? 12 : 8), seed: hashStr(`${kind}:${s.signature ?? 'x'}`) % 997,
    n: st.n, sign: st.sign, figs: st.figs, caption: st.caption ?? KIND_NAME27[kind],
  };
}

// ---------------------------------------------------------------- pintura (pura)

type Painter = (k: K27, m: ArtModel27) => void;

/** Fundo de rua à noite (céu, estrelas, horizonte). */
function nightStreet(k: K27, m: ArtModel27, sky0 = '#0c0a24', sky1 = '#2a1c48'): void {
  grad(k, 0, 0, k.W, k.fy, k.c(sky0), k.c(sky1));
  stars(k, 18 + k.W / 10, k.fy * 0.5);
  skyline(k, k.fy - 4, k.c('#141024'), k.c('#ffd889', 200), { seed: m.seed });
}

const P: Record<SceneKind27, Painter> = {
  crime: (k, m) => paintCrime(k, m),
  anr(k, m) {
    const W = k.W, fy = k.fy;
    const b = k.band;
    const wallC = b === 0 ? k.c('#2a1c24') : b === 1 ? k.c('#2a2018') : b === 2 ? k.c('#18141e') : k.c('#141820');
    if (b === 2) bricks(k, 0, 0, W, fy, k.c('#3a2a2a')); else R(k, 0, 0, W, fy, wallC);
    dim(k, 90);
    floor(k, fy, k.c('#2a2220'), k.c('#221a18'));
    // palco à direita
    const sx = Math.round(W * 0.6);
    ink27(k, () => { R(k, sx, fy - 10, W - sx, 10, k.pal.woodDark); R(k, sx, fy - 10, W - sx, 1, shade(k.pal.wood, 0.2)); });
    cone(k, Math.round(W * 0.78), 0, 6, fy - 10, 60, k.pal.lamp, 40);
    amp(k, W - 16, fy - 10); speaker(k, sx + 2, fy - 10, 9, 14);
    if (b === 0) { // art déco: arco dourado
      for (let i = 0; i < 3; i++) k.p.ring(Math.round(W * 0.8), fy - 10, 30 + i * 4, shade(k.pal.gold, -i * 0.2));
      piano(k, sx + 14, fy - 10, true);
    } else drums(k, Math.round(W * 0.8) - 6, fy - 10);
    // letreiro do clube
    const name = b === 0 ? 'COTTON CLUB' : b === 1 ? 'THE CAVERN' : b === 2 ? 'CBGB' : 'INDIE NIGHT';
    neon(k, name, Math.round(W * 0.8), 4, b === 0 ? k.pal.gold : b === 1 ? k.c('#ff8a3a') : b === 2 ? k.c('#ff4a8a') : k.c('#4ad0ff'));
    if (b === 2) for (let i = 0; i < 5; i++) poster(k, 6 + i * 22, 8 + (i % 2) * 6, 16, 20, [k.pal.accent, k.pal.accent2, k.c('#e8e0d0'), k.c('#ff4a8a'), k.pal.fabric2][i]);
    // mesa dos olheiros com caderno
    for (let i = 0; i < m.n.scouts; i++) {
      const tx = Math.round(W * (0.16 + i * 0.09)) + 5;
      ink27(k, () => { R(k, tx - 2, fy - 12, 16, 3, k.pal.wood); k.p.vline(tx + 5, fy - 9, fy - 1, k.pal.woodDark);
      R(k, tx + 6, fy - 14, 5, 2, b === 3 ? k.c('#16161a') : k.pal.paper); // caderno / celular
      if (b === 3) k.p.set(tx + 8, fy - 14, k.c('#3aa0ff'));
      R(k, tx, fy - 14, 2, 2, k.c('#c8a050', 200)); // copo
    });
    }
    crowd(k, Math.round(W * 0.38), sx - 2, fy - 2, 0.85, 0.4, 2, b === 3 ? k.c('#9ad0ff') : undefined);
  },
  studio(k, m) {
    const W = k.W, fy = k.fy;
    wall(k, 0, fy, k.pal.wall);
    // vidro da sala de gravação
    const gx = Math.round(W * 0.52), gw = Math.round(W * 0.42), gy = Math.max(4, fy - 52), gh = fy - 22 - gy;
    R(k, gx - 2, gy - 2, gw + 4, gh + 4, k.pal.trim);
    grad(k, gx, gy, gw, gy + gh, shade(k.pal.floors.studio.a, -0.4), shade(k.pal.floors.studio.b, -0.2));
    for (let i = 0; i < gw; i += 7) R(k, gx + i, gy + 2, 4, 6, shade(k.pal.fabric, -0.3)); // espuma/painéis
    micStand(k, gx + Math.round(gw * 0.45), gy + gh - 1, 14);
    if (k.band <= 1) piano(k, gx + gw - 26, gy + gh, false); else amp(k, gx + gw - 16, gy + gh);
    R(k, gx, gy, gw, gh, withAlpha(C('#c8e0ff'), 26));
    k.p.line(gx + 4, gy + 2, gx + 14, gy + 12, withAlpha(C('#ffffff'), 60));
    recLight(k, gx + Math.round(gw / 2) - 8, gy - 10, m.n.busy === 1 && blink(k, 0.8));
    // mesa de som e caixas
    floor(k, fy, k.pal.floors.control.a, k.pal.floors.control.b);
    console27(k, Math.round(W * 0.2), fy, 52, m.n.busy === 1);
    shelf(k, 8, fy, 22, 34, 0.7);
    if (k.band >= 2) poster(k, Math.round(W * 0.42), 6, 14, 18, k.pal.gold);
    lampDesk(k, Math.round(W * 0.16), fy - 0, m.n.busy === 1);
  },
  releases(k, m) {
    const W = k.W, fy = k.fy;
    if (k.band <= 1) {
      // fábrica de prensagem
      wall(k, 0, fy, shade(k.pal.metalDark, 0.3));
      for (let x = 10; x < W; x += 46) { R(k, x, 4, 26, 10, k.c('#9ac0d8', 120)); k.p.vline(x + 13, 4, 13, k.pal.trim); }
      floor(k, fy, k.pal.floors.garage.a, k.pal.floors.garage.b);
      const beat = k.t * 5;
      press(k, Math.round(W * 0.1), fy, k.pal.accent2, beat); press(k, Math.round(W * 0.3), fy, k.pal.accent, beat + 1.5);
      // esteira com discos andando
      ink27(k, () => { R(k, Math.round(W * 0.42), fy - 10, Math.round(W * 0.4), 3, k.c('#3a3a40')); });
      for (let i = 0; i < 6; i++) { const x = Math.round(W * 0.42) + ((i * 18 + Math.floor(k.t * 14)) % Math.round(W * 0.4)); disc(k, x, fy - 13, 3, [k.pal.accent, k.pal.accent2, k.pal.paper][i % 3]); }
      stackDiscs(k, Math.round(W * 0.86), fy, 9, k.pal.accent); stackDiscs(k, Math.round(W * 0.86) + 14, fy, 6, k.pal.accent2);
      if (m.n.fresh) poster(k, Math.round(W * 0.6), 18, 34, 22, k.pal.accent2, m.sign.act || 'NOVO');
    } else if (k.band === 2) {
      // loja de discos
      wall(k, 0, fy, k.pal.wall);
      shelf(k, 4, fy, 60, 44, 0.9); shelf(k, W - 64, fy, 60, 44, 0.9);
      floor(k, fy, k.pal.floors.lounge.a, k.pal.floors.lounge.b);
      neon(k, k.year >= 1990 ? 'CDS & TAPES' : 'RECORDS', W / 2, 6, k.c('#ff4a8a'));
      ink27(k, () => { for (let i = 0; i < 4; i++) { const bx = Math.round(W * 0.3) + i * 30; R(k, bx, fy - 14, 24, 14, k.pal.woodDark); for (let j = 0; j < 5; j++) R(k, bx + 2 + j * 4, fy - 18 - (j % 2), 3, 5, [k.pal.accent, k.pal.paper, k.pal.accent2, k.pal.fabric2, k.c('#2a2a30')][(i + j) % 5]); } });
      if (m.n.fresh) poster(k, Math.round(W * 0.42), 16, 40, 24, k.pal.accent2, m.sign.act || 'NEW');
      tvSet(k, W - 90, fy - 20);
    } else {
      // streaming: tela gigante de celular, ondas e nuvem de servidores
      grad(k, 0, 0, W, k.H, k.c('#0c1024'), k.c('#1c1440'));
      for (let i = 0; i < 40; i++) k.p.set(Math.floor(noise(i, 1, m.seed) * W), Math.floor(noise(i, 2, m.seed) * fy), k.c('#3a4a8a'));
      const px = Math.round(W * 0.5) - 18, py = Math.max(2, fy - 66);
      ink27(k, () => { R(k, px, py, 36, Math.min(66, fy - py + 6), k.c('#0a0a0e')); R(k, px + 2, py + 3, 32, Math.min(58, fy - py - 2), k.c('#1c2440')); });
      R(k, px + 6, py + 7, 24, 18, k.pal.accent2); disc(k, px + 18, py + 16, 6, k.pal.gold, k.t * 3);
      text(k, (m.sign.act || 'PLAY').slice(0, 7), px + 4, py + 28, k.c('#ffffff'));
      R(k, px + 4, py + 36, 28, 1, k.c('#3a4a6a')); R(k, px + 4, py + 36, 6 + Math.floor((k.t * 4) % 22), 1, k.c('#4ade80'));
      for (let i = 0; i < 24; i++) { const hh = 2 + Math.floor(Math.abs(Math.sin(i * 0.7 + k.t * 5)) * 10); k.p.vline(Math.round(W * 0.1) + i * 3, fy - hh, fy, k.c(i % 2 ? '#4ab0ff' : '#ff7ad0')); k.p.vline(Math.round(W * 0.68) + i * 3, fy - hh, fy, k.c(i % 2 ? '#ff7ad0' : '#4ab0ff')); }
      for (let i = 0; i < 3; i++) { const cx = 20 + i * 40, cy = 12 + (i % 2) * 6; k.p.ellipse(cx, cy, 14, 5, k.c('#2a3a6a')); }
      R(k, 0, fy, W, k.H - fy, k.c('#0a0c18'));
    }
  },
  shows(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    grad(k, 0, 0, W, fy, k.c('#08061a'), k.c('#20143a'));
    const sy = fy - 16, sx0 = Math.round(W * 0.22), sx1 = Math.round(W * 0.78);
    // treliça / cortina
    if (b === 0) { R(k, sx0 - 6, 0, sx1 - sx0 + 12, sy, k.c('#5a1018')); for (let x = sx0 - 6; x < sx1 + 6; x += 4) k.p.vline(x, 0, sy, k.c('#3a0810')); R(k, sx0 - 6, 0, sx1 - sx0 + 12, 6, k.pal.gold); }
    else { k.p.hline(sx0 - 8, sx1 + 8, 4, k.c('#5a5a62')); for (let x = sx0 - 8; x <= sx1 + 8; x += 6) k.p.line(x, 4, x + 3, 7, k.c('#5a5a62')); }
    if (b >= 3) { R(k, Math.round(W * 0.38), 10, Math.round(W * 0.24), 20, k.c('#101018')); R(k, Math.round(W * 0.38) + 1, 11, Math.round(W * 0.24) - 2, 18, withAlpha(k.pal.accent2, 200)); text(k, m.sign.act.slice(0, 10), Math.round(W * 0.4), 17, k.c('#ffffff')); }
    // luzes
    const cols = b === 0 ? [k.pal.lamp] : [k.c('#ff4a8a'), k.c('#4ab0ff'), k.c('#ffd040')];
    for (let i = 0; i < 4; i++) { const x = sx0 + 10 + i * Math.round((sx1 - sx0 - 20) / 3); const sw = Math.round(wave(k, 0.3, i * 0.25) * 18); cone(k, x, 6, 3, sy, 40, cols[i % cols.length], b === 0 ? 30 : 38); void sw; }
    ink27(k, () => { R(k, sx0, sy, sx1 - sx0, 4, k.pal.woodDark); R(k, sx0, sy, sx1 - sx0, 1, shade(k.pal.wood, 0.3));
    R(k, sx0, sy + 4, sx1 - sx0, fy - sy - 4, k.c('#141018')); });
    speaker(k, sx0 - 12, sy + 4, 12, b >= 2 ? 26 : 16); speaker(k, sx1, sy + 4, 12, b >= 2 ? 26 : 16);
    if (b >= 2) { speaker(k, sx0 - 12, sy - 22, 12, 22); speaker(k, sx1, sy - 22, 12, 22); }
    drums(k, Math.round(W * 0.5) - 10, sy); amp(k, sx1 - 18, sy);
    micStand(k, Math.round(W * 0.42), sy, 16);
    R(k, 0, fy, W, k.H - fy, k.c('#0c0a12'));
    crowd(k, 0, W, fy + 4, m.n.fill ?? 0.5, m.n.hop ?? 0.4, k.H - fy > 20 ? 4 : 2, b >= 3 ? k.c('#9ad0ff') : b === 2 ? k.c('#ffd27a') : undefined);
  },
  tour(k, m) {
    const W = k.W, fy = k.fy;
    // estrada no entardecer
    grad(k, 0, 0, W, fy - 10, k.c('#2a1c48'), k.c('#e8784a'));
    k.p.disc(Math.round(W * 0.78), fy - 14, 10, k.c('#ffd27a'));
    for (let i = 0; i < 4; i++) { const x0 = i * 80 - 10; k.p.poly([[x0, fy - 8], [x0 + 40, fy - 30 - (i % 2) * 8], [x0 + 90, fy - 8]], k.c('#3a2a4a')); }
    skyline(k, fy - 8, k.c('#2a1c38'), k.c('#ffd889', 160), { seed: m.seed + 4, tall: 14 });
    R(k, 0, fy - 8, W, k.H - fy + 8, k.c('#2a2a30'));
    for (let x = (-Math.floor(k.t * 30)) % 16; x < W; x += 16) R(k, x, fy - 1, 8, 1, k.c('#e8d870'));
    // marquise do teatro
    const tx = Math.round(W * 0.62);
    ink27(k, () => { R(k, tx, fy - 40, 70, 32, k.pal.wall); R(k, tx - 4, fy - 46, 78, 8, k.c('#1a1418')); R(k, tx + 28, fy - 26, 14, 18, k.c('#2a1814')); });
    for (let i = 0; i < 18; i++) k.p.set(tx - 2 + i * 4, fy - 47, blink(k, 2, i * 0.3) ? k.c('#ffd040') : k.c('#5a4020'));
    text(k, (m.sign.tour || 'TOUR').slice(0, 14), tx, fy - 44, k.c('#ffd040'));
    R(k, tx + 28, fy - 26, 14, 18, k.c('#2a1814'));
    tourVehicle(k, Math.round(W * 0.08) + (k.t ? Math.round(Math.min(1, k.t / 6) * 30) : 0), fy - 2, m.sign.act);
  },
  festival(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    grad(k, 0, 0, W, fy - 14, k.c('#3a2a6a'), k.c('#ff9a5a'));
    k.p.disc(Math.round(W * 0.15), fy - 26, 8, k.c('#ffe0a0'));
    for (let i = 0; i < 3; i++) k.p.ellipse(40 + i * 90, 10 + (i % 2) * 6, 22, 4, k.c('#ffd0b0', 120));
    // gramado e tendas
    grad(k, 0, fy - 14, W, k.H, k.c('#4a7a3a'), k.c('#2a4a24'));
    ink27(k, () => { for (let i = 0; i < 4; i++) { const x = 8 + i * 22; k.p.poly([[x, fy - 12], [x + 9, fy - 22], [x + 18, fy - 12]], [k.pal.accent, k.pal.paper, k.pal.accent2, k.c('#e8e0d0')][i]); } });
    // palco grande
    const sx = Math.round(W * 0.42), sw = Math.round(W * 0.4), top = Math.max(2, fy - 54);
    if (b <= 1) { ink27(k, () => { R(k, sx, fy - 30, sw, 6, k.pal.wood); k.p.poly([[sx - 4, fy - 30], [sx + sw / 2, fy - 50], [sx + sw + 4, fy - 30]], k.c('#e8e0d0')); }); }
    else {
      ink27(k, () => { R(k, sx, top, sw, 4, k.c('#3a3a42')); k.p.vline(sx, top, fy - 14, k.c('#3a3a42')); k.p.vline(sx + sw, top, fy - 14, k.c('#3a3a42'));
      for (let y = top + 4; y < fy - 18; y += 6) { k.p.line(sx, y, sx + 4, y + 6, k.c('#3a3a42')); k.p.line(sx + sw, y, sx + sw - 4, y + 6, k.c('#3a3a42')); } });
      if (b === 3) { ink27(k, () => { R(k, sx + 8, top + 8, sw - 16, 16, k.c('#101018')); R(k, sx + 9, top + 9, sw - 18, 14, withAlpha(k.pal.accent2, 210)); }); text(k, m.sign.brand.slice(0, 10), sx + 12, top + 13, k.c('#ffffff')); }
      for (let i = 0; i < 3; i++) cone(k, sx + 12 + i * (sw - 24) / 2, top + 4, 3, fy - 22, 30, [k.c('#ff4a8a'), k.c('#4ab0ff'), k.c('#ffd040')][i], 34);
    }
    ink27(k, () => { R(k, sx, fy - 22, sw, 8, k.c('#1a1418')); }); speaker(k, sx - 12, fy - 14, 10, 22); speaker(k, sx + sw + 2, fy - 14, 10, 22);
    // bandeirolas
    for (let x = 0; x < W; x += 6) k.p.set(x, 6 + Math.round(Math.sin(x / 9) * 2), [k.pal.accent, k.pal.accent2, k.c('#4ab0ff')][(x / 6) % 3]);
    if (b === 3) for (let i = 0; i < 3; i++) { const dx = Math.round(W * 0.3 + i * 40 + wave(k, 0.2, i) * 10); R(k, dx, 20 + i * 4, 4, 1, k.c('#2a2a30')); k.p.set(dx + 1, 21 + i * 4, blink(k, 2, i) ? k.c('#ff3030') : k.c('#3a3a3a')); }
    ink27(k, () => { if (m.n.own) { R(k, 4, fy - 34, 50, 10, k.pal.accent2); text(k, (m.sign.brand || 'FEST').slice(0, 11), 6, fy - 32, k.c('#fffaf0')); k.p.vline(4, fy - 34, fy - 12, k.pal.woodDark); } });
    crowd(k, 0, W, fy + 2, m.n.fill ?? 0.6, m.n.hop ?? 0.5, k.H - fy > 20 ? 4 : 2, b >= 3 ? k.c('#9ad0ff') : undefined);
  },
  charts(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    wall(k, 0, fy, b >= 3 ? k.c('#1a1e2a') : k.pal.wall);
    floor(k, fy, k.pal.floors.lounge.a, k.pal.floors.lounge.b);
    // quadro das paradas
    const bx = Math.round(W * 0.55), bw = Math.round(W * 0.4), by = 4, bh = fy - 10;
    ink27(k, () => { R(k, bx - 2, by - 2, bw + 4, bh + 4, b === 0 ? k.pal.woodDark : k.c('#101014'));
    R(k, bx, by, bw, bh, b === 0 ? k.c('#22302a') : b === 1 ? k.c('#1a1a40') : b === 2 ? k.c('#101820') : k.c('#0c1020')); });
    const rows = Math.min(6, Math.floor((bh - 4) / 9));
    for (let i = 0; i < rows; i++) {
      const mineRow = m.n.pos === i;
      const yy = by + 3 + i * 9;
      const col = mineRow ? k.pal.gold : b === 0 ? k.c('#e8e4d8') : b === 3 ? k.c('#7ac0ff') : k.c('#c8c8f0');
      text(k, String(i + 1), bx + 3, yy, col);
      if (mineRow && m.sign.hit) text(k, m.sign.hit.slice(0, Math.floor((bw - 16) / 4)), bx + 12, yy, col);
      else R(k, bx + 12, yy + 1, Math.max(8, bw - 18 - ((i * 13 + m.seed) % 24)), 3, withAlpha(col, 140));
      if (mineRow) halo(k, bx + bw / 2, yy + 2, 16, k.pal.gold, 50);
      if (b === 3) { const up = (i + m.seed) % 3; k.p.set(bx + bw - 4, yy + 1, up === 0 ? k.c('#4ade80') : up === 1 ? k.c('#ff5a5a') : k.c('#8a8aa0')); }
    }
    // aparelho da geração
    if (b === 0) { desk(k, 20, fy, 40); radio(k, 32, fy - 12); halo(k, 40, fy - 22, 14, k.pal.lamp, 40); }
    else if (b === 1) { jukebox(k, 24, fy); tvSet(k, 60, fy, k.c('#c8d8ff')); }
    else if (b === 2) { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) tvSet(k, 10 + i * 20, fy - j * 15, [k.c('#ff7ad0'), k.c('#7ac0ff'), k.c('#ffd040')][(i + j) % 3]); radio(k, 80, fy); }
    else { desk(k, 14, fy, 54); computer(k, 20, fy - 12, true); radio(k, 44, fy - 12); radio(k, 58, fy - 12); }
    if (m.state === 'no1') for (let i = 0; i < 12; i++) k.p.set(bx + Math.floor(noise(i, Math.floor(k.t * 4), 3) * bw), by + Math.floor(noise(i, 4, Math.floor(k.t * 4)) * bh), k.pal.gold);
  },
  press(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    wall(k, 0, fy, k.pal.wall);
    floor(k, fy, k.pal.floors.office.a, k.pal.floors.office.b);
    if (b <= 1) {
      // rotativa e jornal saindo
      const px = Math.round(W * 0.68);
      ink27(k, () => { R(k, px, fy - 30, 60, 30, k.pal.metalDark); for (let i = 0; i < 3; i++) k.p.disc(px + 12 + i * 18, fy - 16, 6, k.pal.metal); });
      for (let i = 0; i < 3; i++) { const a = k.t * 6 + i; k.p.set(Math.round(px + 12 + i * 18 + Math.cos(a) * 5), Math.round(fy - 16 + Math.sin(a) * 5), k.c('#2a2a2e')); }
      ink27(k, () => { R(k, px - 30, fy - 18, 32, 2, k.pal.paper); });
      for (let i = 0; i < 3; i++) R(k, px - 26 + i * 8 - ((k.t * 10) % 8), fy - 22, 6, 4, k.pal.paper);
    } else if (b === 2) ink27(k, () => { R(k, W - 40, fy - 14, 24, 14, k.c('#d8d0c0')); R(k, W - 36, fy - 18, 16, 4, k.c('#f4f0e8')); }); // fax
    else { ink27(k, () => { R(k, W - 70, 4, 60, 34, k.c('#101014')); R(k, W - 69, 5, 58, 32, k.c('#1d2a3a')); }); for (let i = 0; i < 5; i++) { R(k, W - 66, 8 + i * 6, 4, 4, k.c(['#ff7ad0', '#7ac0ff', '#ffd040', '#4ade80', '#ffffff'][i])); R(k, W - 60, 9 + i * 6, 30 + ((i * 7) % 16), 2, k.c('#a8c0e0')); } }
    // manchete na parede
    const red = m.n.scandal === 1;
    const hx = 8, hy = 4, hw = Math.round(W * 0.34);
    ink27(k, () => { R(k, hx, hy, hw, 26, k.pal.paper); R(k, hx, hy, hw, 2, shade(k.pal.paper, -0.2)); });
    text(k, red ? (b <= 1 ? 'EXTRA! ESCANDALO' : 'URGENTE: ESCANDALO') : (b <= 1 ? 'GAZETA MUSICAL' : 'MUSIC NEWS'), hx + 3, hy + 4, red ? k.c('#c02020') : k.c('#202030'));
    for (let i = 0; i < 3; i++) R(k, hx + 3, hy + 12 + i * 4, hw - 6 - i * 10, 2, k.c('#8a8478'));
    // mesas da redação
    desk(k, Math.round(W * 0.22), fy, 34); desk(k, Math.round(W * 0.47), fy, 34);
    if (b <= 1) { typewriter(k, Math.round(W * 0.22) + 10, fy - 12); typewriter(k, Math.round(W * 0.47) + 10, fy - 12); }
    else { computer(k, Math.round(W * 0.22) + 10, fy - 12); computer(k, Math.round(W * 0.47) + 10, fy - 12); }
    phone(k, Math.round(W * 0.47) + 26, fy - 12);
    if (red) { halo(k, hx + hw / 2, hy + 8, 22, k.c('#ff3030'), 50); }
  },
  finance(k, m) {
    const W = k.W, fy = k.fy, b = k.band, red = m.n.red === 1;
    wall(k, 0, fy, red ? shade(k.pal.wall, -0.3) : k.pal.wall);
    windowPane(k, Math.round(W * 0.72), 6, 40, Math.min(34, fy - 20), red ? k.c('#2a3040') : k.c('#3a5a8a'));
    if (red) for (let i = 0; i < 26; i++) { const x = Math.round(W * 0.72) + Math.floor(noise(i, 1) * 40), y = 6 + ((i * 7 + Math.floor(k.t * 40)) % Math.min(34, fy - 20)); k.p.set(x, y, k.c('#9ab0d0')); }
    floor(k, fy, k.pal.floors.office.a, k.pal.floors.office.b);
    desk(k, Math.round(W * 0.3), fy, 70);
    const dx = Math.round(W * 0.3);
    if (b === 0) { R(k, dx + 6, fy - 16, 22, 4, k.pal.paper); R(k, dx + 6, fy - 16, 11, 4, k.c('#7a2a1a')); for (let i = 0; i < 4; i++) k.p.hline(dx + 18, dx + 26, fy - 15 + i, red ? k.c('#c02020') : k.c('#202030')); R(k, dx + 34, fy - 18, 10, 6, k.c('#3a3a3e')); for (let i = 0; i < 4; i++) k.p.set(dx + 35 + i * 2, fy - 17, k.c('#e8e0c8')); }
    else if (b === 1) { R(k, dx + 6, fy - 15, 18, 3, k.pal.paper); R(k, dx + 30, fy - 18, 12, 6, k.c('#2a2a2e')); R(k, dx + 32, fy - 17, 8, 2, k.c('#ff5040')); }
    else computer(k, dx + 8, fy - 12, true);
    if (b >= 2) { R(k, dx + 34, fy - 26, 26, 14, k.c('#121216')); R(k, dx + 35, fy - 25, 24, 12, red ? k.c('#3a1018') : k.c('#102a1a')); for (let i = 0; i < 8; i++) k.p.vline(dx + 37 + i * 3, fy - 15 - (red ? 8 - i : i), fy - 14, red ? k.c('#ff5050') : k.c('#4ade80')); }
    // cofre e moedas
    ink27(k, () => { R(k, 12, fy - 22, 22, 22, k.c('#3a3a40')); k.p.disc(23, fy - 11, 5, k.c('#5a5a62')); k.p.set(23, fy - 11, k.pal.gold); });
    if (m.n.rich) for (let i = 0; i < 5; i++) stackDiscs(k, 40 + i * 6, fy, 3 + (i % 3), k.pal.gold);
    ink27(k, () => { R(k, Math.round(W * 0.5) - 3, 5, 36, 11, k.c('#101418')); }); text(k, red ? 'SALDO -' : 'SALDO +', Math.round(W * 0.5), 8, red ? k.c('#ff5050') : k.c('#4ade80'));
    // arquivo e calendário
    ink27(k, () => { R(k, W - 30, fy - 26, 18, 26, k.band >= 2 ? k.c('#8a8a92') : k.pal.woodDark); for (let i = 0; i < 3; i++) { R(k, W - 29, fy - 25 + i * 8, 16, 7, shade(k.band >= 2 ? k.c('#8a8a92') : k.pal.woodDark, 0.1)); R(k, W - 23, fy - 22 + i * 8, 4, 1, k.pal.metal); } });
    ink27(k, () => { R(k, Math.round(W * 0.14), 8, 16, 14, k.pal.paper); R(k, Math.round(W * 0.14), 8, 16, 3, k.c('#c03030')); for (let i = 0; i < 6; i++) k.p.set(Math.round(W * 0.14) + 2 + (i % 3) * 5, 13 + Math.floor(i / 3) * 4, k.c('#3a3a3a')); });
  },
  team(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    wall(k, 0, fy, k.pal.wall);
    floor(k, fy, k.pal.floors.office.a, k.pal.floors.office.b);
    for (let i = 0; i < 5; i++) {
      const x = Math.round(W * (0.12 + i * 0.18)) - 14;
      desk(k, x, fy, 28);
      if (i < (m.n.staff ?? 0)) { if (b <= 1) typewriter(k, x + 9, fy - 12); else computer(k, x + 6, fy - 12); }
      else R(k, x + 8, fy - 13, 10, 1, k.pal.paper);
      lampDesk(k, x + 22, fy - 12, i < (m.n.staff ?? 0));
    }
    // quadro de avisos / organograma
    ink27(k, () => { R(k, Math.round(W * 0.4), 4, 60, 18, b >= 3 ? k.c('#f0f0f4') : k.c('#8a6a3a'));
    for (let i = 0; i < 6; i++) R(k, Math.round(W * 0.4) + 4 + i * 9, 7 + (i % 2) * 6, 6, 5, [k.pal.paper, k.c('#ffe070'), k.c('#9ad0ff')][i % 3]); });
    text(k, m.sign.brand.slice(0, 14), 6, 6, k.pal.paper, k.pal.trim);
  },
  rights(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    if (b <= 1) {
      // Tin Pan Alley: fachadas com pianos nas janelas
      grad(k, 0, 0, W, fy, k.c('#c8b088'), k.c('#e8d8b0'));
      for (let y = fy; y < k.H; y++) k.p.hline(0, W - 1, y, y === fy ? k.c('#8a8478') : (y % 3 ? k.c('#a8a090') : k.c('#9a9282'))); // calçada
      for (let i = 0; i < 5; i++) {
        const x = i * 60 - 4, h = fy - 6 - (i % 2) * 8;
        ink27(k, () => { bricks(k, x, fy - h, 56, h, i % 2 ? k.c('#8a4a34') : k.c('#7a5a44'));
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const wx = x + 6 + c * 16, wy = fy - h + 6 + r * 16; if (wy + 10 > fy - 4) continue; R(k, wx, wy, 10, 10, k.c('#ffe0a0', 220)); if ((r + c + i) % 3 === 0) piano(k, wx + 1, wy + 10, false); }
        R(k, x + 18, fy - 14, 12, 14, k.pal.woodDark);
        R(k, x + 4, fy - h - 4, 30, 5, k.pal.paper); }); text(k, ['WITMARK', 'FEIST', 'REMICK', 'HARMS', 'SHAPIRO'][i], x + 5, fy - h - 4, k.c('#3a2a1a'));
      }
    } else {
      wall(k, 0, fy, k.pal.wall);
      floor(k, fy, k.pal.floors.office.a, k.pal.floors.office.b);
      piano(k, 16, fy, b <= 2);
      desk(k, Math.round(W * 0.42), fy, 60);
      for (let i = 0; i < 4; i++) R(k, Math.round(W * 0.42) + 6 + i * 6, fy - 14 - i, 10, 2, k.pal.paper);
      computer(k, Math.round(W * 0.42) + 38, fy - 12, true);
      ink27(k, () => { R(k, W - 60, 6, 50, 30, k.pal.trim); R(k, W - 58, 8, 46, 26, k.pal.paper); });
      text(k, b === 2 ? 'ROYALTIES' : 'SPLITS %', W - 55, 11, k.c('#202030'));
      for (let i = 0; i < 3; i++) R(k, W - 55, 19 + i * 4, 30 - i * 6, 2, [k.pal.accent, k.pal.accent2, k.pal.fabric2][i]);
    }
    // partituras voando
    for (let i = 0; i < 5; i++) {
      const x = Math.round(((i * 61 + k.t * 12) % (W + 20)) - 10), y = 14 + ((i * 17) % Math.max(10, fy - 30)) + Math.round(wave(k, 0.5, i * 0.2) * 3);
      ink27(k, () => { R(k, x, y, 8, 10, k.c('#f8f4e8')); for (let j = 0; j < 4; j++) k.p.hline(x + 1, x + 6, y + 2 + j * 2, k.c('#8a8478')); });
      k.p.set(x + 3, y + 3 + (i % 3) * 2, k.c('#202020'));
    }
  },
  awards(k, m) {
    const W = k.W, fy = k.fy;
    grad(k, 0, 0, W, fy, k.c('#1a0c18'), k.c('#3a1428'));
    for (let x = 0; x < W; x += 5) k.p.vline(x, 0, fy - 14, k.c('#4a1020')); // cortina
    floor(k, fy, k.c('#3a1a24'), k.c('#321620'));
    R(k, 0, 0, W, 5, k.pal.gold);
    // palco e púlpito
    ink27(k, () => { R(k, Math.round(W * 0.3), fy - 10, Math.round(W * 0.4), 10, k.pal.woodDark); R(k, Math.round(W * 0.3), fy - 10, Math.round(W * 0.4), 1, k.pal.gold); });
    cone(k, Math.round(W * 0.5), 0, 6, fy - 10, 40, k.pal.lamp, 50);
    // estantes de troféus nas laterais (enchem com os prêmios)
    for (const side of [0, 1]) {
      const x0 = side ? W - 62 : 6;
      ink27(k, () => { for (let r = 0; r < 2; r++) { R(k, x0, fy - 14 - r * 18, 56, 2, k.pal.wood); } });
      for (let i = 0; i < 6; i++) { const idx = side * 6 + i; if (idx >= (m.n.trophies ?? 0)) continue; trophy(k, x0 + 4 + (i % 3) * 18, fy - 14 - Math.floor(i / 3) * 18, (idx % 3) as 0 | 1 | 2); }
    }
    if (!m.n.trophies) for (const x of [10, W - 58]) text(k, '?', x + 24, fy - 26, k.c('#6a4a5a'));
    trophy(k, Math.round(W * 0.5) + 14, fy - 10, 2);
    if (m.state === 'full') for (let i = 0; i < 16; i++) k.p.set(Math.floor(noise(i, Math.floor(k.t * 5), 2) * W), Math.floor(noise(i, 9, Math.floor(k.t * 5)) * fy), k.pal.gold);
  },
  you(k, m) {
    const W = k.W, fy = k.fy, tier = m.n.tier ?? 1;
    if (tier === 0) {
      R(k, 0, 0, W, fy, shade(k.pal.wall, -0.35));
      for (let i = 0; i < 6; i++) k.p.ellipse(20 + i * 50, 10 + (i % 3) * 8, 6, 3, shade(k.pal.wall, -0.5)); // mofo
      windowPane(k, Math.round(W * 0.7), 8, 28, Math.min(26, fy - 24), k.c('#2a3040'));
      floor(k, fy, shade(k.pal.floors.garage.a, -0.2), shade(k.pal.floors.garage.b, -0.2));
      ink27(k, () => { R(k, Math.round(W * 0.2), fy - 6, 50, 6, k.c('#8a8478')); R(k, Math.round(W * 0.2), fy - 8, 14, 3, k.c('#e8e0d0')); // colchão no chão
    });
      guitar(k, Math.round(W * 0.6), fy);
      R(k, Math.round(W * 0.42), fy - 26, 1, 14, k.c('#2a2a2a')); halo(k, Math.round(W * 0.42), fy - 12, 10, k.pal.lamp, 70); R(k, Math.round(W * 0.42) - 1, fy - 12, 3, 3, k.pal.lamp);
      radio(k, Math.round(W * 0.82), fy);
    } else if (tier === 1) {
      wall(k, 0, fy, k.pal.wall);
      windowPane(k, Math.round(W * 0.66), 6, 40, Math.min(30, fy - 20), k.c('#1a2040'));
      floor(k, fy, k.pal.floors.lounge.a, k.pal.floors.lounge.b);
      ink27(k, () => { R(k, Math.round(W * 0.18), fy - 12, 50, 8, k.pal.fabric); R(k, Math.round(W * 0.18), fy - 18, 50, 6, shade(k.pal.fabric, -0.15)); R(k, Math.round(W * 0.18) - 3, fy - 14, 4, 14, shade(k.pal.fabric, -0.2)); R(k, Math.round(W * 0.18) + 49, fy - 14, 4, 14, shade(k.pal.fabric, -0.2)); });
      tvSet(k, Math.round(W * 0.5), fy);
      shelf(k, W - 34, fy, 26, 30, 0.8); radio(k, 10, fy);
    } else {
      // cobertura ou mansão: janelão com a cidade, lustre, piscina
      grad(k, 0, 0, W, fy, k.c('#0c0a24'), k.c('#2a1c48'));
      stars(k, 20, fy / 3);
      skyline(k, fy - 6, k.c('#181430'), k.c('#ffd889', 220), { seed: m.seed + 2, tall: 30, dens: 0.5 });
      for (let x = 0; x < W; x += 36) R(k, x, 0, 3, fy, k.c('#c8c8d0', 200));
      R(k, 0, 0, W, 3, k.c('#c8c8d0'));
      floor(k, fy, tier === 3 ? k.c('#e8e0d0') : k.pal.floors.hall.a, tier === 3 ? k.c('#d0c4b0') : k.pal.floors.hall.b);
      ink27(k, () => { R(k, Math.round(W * 0.6), fy - 12, 60, 8, k.c('#f0ece4')); R(k, Math.round(W * 0.6), fy - 16, 60, 4, k.c('#d8d0c4')); });
      piano(k, Math.round(W * 0.1), fy, true);
      if (tier === 3) {
        const cx = Math.round(W * 0.5); k.p.vline(cx, 0, 8, k.pal.gold); for (let i = -2; i <= 2; i++) { k.p.vline(cx + i * 4, 8, 12 + Math.abs(i), k.pal.gold); k.p.set(cx + i * 4, 13 + Math.abs(i), k.c('#fff4c0')); }
        halo(k, cx, 12, 22, k.c('#fff4c0'), 60);
        R(k, Math.round(W * 0.82), fy + 1, 40, 4, k.c('#3aa0d0')); // piscina
        trophy(k, Math.round(W * 0.92), fy - 12, 1);
      }
    }
  },
  family(k, m) {
    const W = k.W, fy = k.fy;
    wall(k, 0, fy, k.pal.wall);
    floor(k, fy, k.pal.floors.lounge.a, k.pal.floors.lounge.b);
    // porta-retratos
    ink27(k, () => { for (let i = 0; i < 5; i++) { const x = 20 + i * 26, y = 6 + (i % 2) * 4; R(k, x, y, 14, 12, k.pal.gold); R(k, x + 1, y + 1, 12, 10, i < (m.n.fam ?? 0) + 1 ? k.c('#c8b8a0') : shade(k.pal.wall, -0.2)); if (i < (m.n.fam ?? 0) + 1) { k.p.disc(x + 7, y + 5, 2, k.c('#8a6a4a')); R(k, x + 4, y + 8, 6, 3, k.pal.accent2); } } });
    // mesa de jantar
    const tx = Math.round(W * 0.28);
    ink27(k, () => { R(k, tx, fy - 12, Math.round(W * 0.5), 3, k.pal.wood); k.p.vline(tx + 3, fy - 9, fy - 1, k.pal.woodDark); k.p.vline(tx + Math.round(W * 0.5) - 4, fy - 9, fy - 1, k.pal.woodDark); });
    for (let i = 0; i < 4; i++) { candle(k, tx + 20 + i * 30, fy - 12); }
    for (let i = 0; i < 5; i++) chair(k, Math.round(W * (0.3 + i * 0.1)) - 3, fy);
    ink27(k, () => { R(k, 8, fy - 14, 40, 10, k.pal.fabric); R(k, 8, fy - 20, 40, 6, shade(k.pal.fabric, -0.15)); // sofá
    });
    halo(k, Math.round(W * 0.53), 4, 30, k.pal.lamp, 50); k.p.vline(Math.round(W * 0.53), 0, 4, k.pal.metalDark);
    if ((m.n.fam ?? 0) === 0) { radio(k, W - 30, fy); }
    else ink27(k, () => { R(k, W - 40, fy - 6, 10, 6, k.c('#e05a4e')); }); // brinquedo
  },
  night(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    const back = [k.c('#1a0e14'), k.c('#20140c'), k.c('#100a20'), k.c('#06060e')][b];
    R(k, 0, 0, W, fy, back);
    floor(k, fy, b === 2 ? k.c('#ff4a8a') : k.c('#2a1a18'), b === 2 ? k.c('#4ab0ff') : k.c('#221410'));
    if (b === 2) { for (let x = 0; x < W; x += 8) for (let y = fy; y < k.H; y += 3) if (blink(k, 2, (x + y) * 0.07)) R(k, x, y, 8, 3, [k.c('#ff4a8a', 180), k.c('#4ab0ff', 180), k.c('#ffd040', 180)][((x + y) / 8 | 0) % 3]); }
    // balcão do bar à esquerda
    const bw = Math.round(W * 0.34);
    ink27(k, () => { R(k, 0, fy - 14, bw, 14, k.pal.woodDark); R(k, 0, fy - 15, bw, 2, k.pal.wood); });
    ink27(k, () => { for (let i = 0; i < 9; i++) { const x = 6 + i * 9; R(k, x, fy - 36, 3, 8, [k.c('#3a7a3a'), k.c('#7a3a2a'), k.c('#c8a050'), k.c('#5a5aa0')][i % 4]); R(k, x + 1, fy - 39, 1, 3, k.c('#3a3a3a')); }
    R(k, 2, fy - 28, bw - 4, 1, k.pal.wood); });
    // pista / palco por época
    if (b === 0) { neon(k, 'SPEAKEASY', W * 0.66, 6, k.pal.gold); piano(k, Math.round(W * 0.7), fy, true); halo(k, Math.round(W * 0.74), fy - 20, 20, k.pal.lamp, 40); }
    else if (b === 1) { neon(k, 'GO-GO', W * 0.66, 6, k.c('#ff8a3a')); jukebox(k, Math.round(W * 0.88), fy); }
    else if (b === 2) {
      const cx = Math.round(W * 0.66); ink27(k, () => { k.p.vline(cx, 0, 8, k.c('#8a8a92')); k.p.disc(cx, 12, 5, k.c('#c8c8d8')); });
      for (let i = 0; i < 10; i++) { const a = k.t * 2 + i * 0.63; const x = Math.round(cx + Math.cos(a) * (20 + i * 8)), y = Math.round(20 + Math.abs(Math.sin(a)) * (fy - 24)); k.p.set(x, y, k.c('#ffffff')); }
      neon(k, 'DISCO', W * 0.88, 6, k.c('#ff4a8a'));
    } else {
      for (let i = 0; i < 6; i++) { const a = -0.5 + wave(k, 0.25, i * 0.17) * 0.6 + i * 0.12; k.p.line(Math.round(W * 0.8), 4, Math.round(W * 0.8 + Math.cos(a + 1.6) * W), Math.round(4 + Math.sin(a + 1.6) * W), k.c(i % 2 ? '#4aff8a' : '#ff4ad0', 160)); }
      ink27(k, () => { R(k, Math.round(W * 0.72), fy - 14, 30, 8, k.c('#1a1a22')); R(k, Math.round(W * 0.72) + 3, fy - 13, 8, 2, k.c('#3aa0ff')); // mesa do DJ
    });
      neon(k, 'CLUB', W * 0.55, 6, k.c('#4ad0ff'));
    }
    crowd(k, bw + 10, W, fy + 2, m.n.fill ?? 0.6, b >= 2 ? 0.9 : 0.4, k.H - fy > 20 ? 3 : 2, b === 3 ? k.c('#9ad0ff') : undefined);
  },
  world(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    grad(k, 0, 0, W, k.H, k.c('#0a1028'), k.c('#1a2a4a'));
    stars(k, 30, k.H);
    // globo
    const cx = Math.round(W * 0.5), cy = Math.round(fy * 0.55), r = Math.min(Math.round(fy * 0.42), 34);
    k.p.disc(cx, cy, r, k.c('#1e4a8a'));
    const rot = k.t * 0.15 + m.seed;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      const lon = Math.asin(Math.max(-1, Math.min(1, x / Math.sqrt(Math.max(1, r * r - y * y))))) + rot, lat = y / r;
      if (noise(Math.floor(lon * 6), Math.floor(lat * 6), 77) > 0.6) k.p.set(cx + x, cy + y, shade(k.c('#3a8a4a'), -Math.abs(x) / r * 0.4));
    }
    k.p.ring(cx, cy, r, k.c('#8ac0ff'));
    // territórios acesos
    for (let i = 0; i < Math.min(8, m.n.terr ?? 0); i++) { const a = i * 1.7 + rot, x = Math.round(cx + Math.cos(a) * r * 0.6), y = Math.round(cy + Math.sin(a * 1.3) * r * 0.5); k.p.set(x, y, k.pal.gold); halo(k, x, y, 4, k.pal.gold, 90); }
    // tecnologia da época que liga o mundo
    if (b === 0) { for (const x of [W * 0.12, W * 0.88]) { const tx = Math.round(x); k.p.line(tx - 8, fy, tx, fy - 40, k.c('#8a8a92')); k.p.line(tx + 8, fy, tx, fy - 40, k.c('#8a8a92')); for (let i = 0; i < 3; i++) k.p.ring(tx, fy - 40, 4 + i * 5 + Math.floor((k.t * 6) % 5), k.c('#ffd040', 120 - i * 30)); } }
    else if (b === 1) { R(k, Math.round(W * 0.82), 10, 14, 4, k.c('#c0c0c8')); R(k, Math.round(W * 0.79), 11, 3, 2, k.c('#3a6ad0')); R(k, Math.round(W * 0.82) + 15, 11, 3, 2, k.c('#3a6ad0')); k.p.line(Math.round(W * 0.82), 14, cx + r, cy, k.c('#ffd040', 100)); }
    else if (b === 2) { for (let i = 0; i < 2; i++) { const x = Math.round(W * (0.15 + i * 0.7)); k.p.disc(x, fy - 10, 10, k.c('#c8c8d0')); k.p.disc(x, fy - 10, 8, k.c('#9a9aa8')); k.p.vline(x, fy - 10, fy, k.c('#5a5a62')); } }
    else { for (let i = 0; i < 12; i++) { const a = i * 0.52 + k.t * 0.4; k.p.line(cx, cy, Math.round(cx + Math.cos(a) * (r + 30)), Math.round(cy + Math.sin(a) * (r + 18)), k.c('#4ad0ff', 50)); k.p.set(Math.round(cx + Math.cos(a) * (r + 30)), Math.round(cy + Math.sin(a) * (r + 18)), k.c('#4ad0ff')); } }
    R(k, 0, fy, W, k.H - fy, k.c('#0a0e1a'));
    text(k, String(k.year), 6, fy - 8, k.pal.gold);
  },
  roster(k, m) {
    const W = k.W, fy = k.fy, b = k.band;
    if (b >= 1) planks(k, 0, 0, W, fy, b === 1 ? k.c('#6a4a2a') : k.c('#4a4a52'), true); else wall(k, 0, fy, k.pal.wall);
    for (let x = 140; x < W - 10; x += 22) for (let y = 6; y < Math.min(fy - 30, 30); y += 14) { R(k, x, y, 16, 11, shade(k.pal.fabric, -0.35)); for (let j = 0; j < 4; j++) k.p.hline(x + 1, x + 14, y + 2 + j * 3, shade(k.pal.fabric, -0.5)); } // espuma
    floor(k, fy, k.pal.floors.studio.a, k.pal.floors.studio.b);
    R(k, Math.round(W * 0.25), fy - 2, Math.round(W * 0.5), 2, k.c('#7a2a2a', 200)); // tapete
    amp(k, Math.round(W * 0.2), fy); amp(k, Math.round(W * 0.78), fy); drums(k, Math.round(W * 0.6), fy);
    micStand(k, Math.round(W * 0.45), fy, 18);
    for (let i = 0; i < 4; i++) poster(k, 10 + i * 30, 6, 20, 16, [k.pal.accent, k.pal.accent2, k.pal.fabric2, k.c('#e8e0d0')][i]);
    if (!m.n.acts) text(k, 'VAGO', Math.round(W * 0.45), Math.round(fy / 2), k.c('#8a8a8a'));
    halo(k, Math.round(W * 0.5), 2, 30, k.pal.lamp, 60);
  },
  signing(k, m) {
    const W = k.W, fy = k.fy;
    wall(k, 0, fy, k.pal.wall);
    windowPane(k, Math.round(W * 0.08), 8, 50, Math.min(40, fy - 30), k.c('#3a5a8a'), false);
    floor(k, fy, k.pal.floors.office.a, k.pal.floors.office.b);
    shelf(k, W - 40, fy, 32, 44, 0.8);
    trophy(k, W - 30, fy - 44, 1); trophy(k, W - 16, fy - 44, 0);
    const dx = Math.round(W * 0.34), dw = Math.round(W * 0.32);
    desk(k, dx, fy, dw);
    ink27(k, () => { R(k, dx + dw / 2 - 8, fy - 15, 16, 3, k.c('#fffaf0')); for (let i = 0; i < 3; i++) k.p.hline(dx + dw / 2 - 6, dx + dw / 2 + 4 - i * 2, fy - 15 + i, k.c('#8a8478')); });
    const pen = k.t > 2 ? Math.min(6, Math.floor((k.t - 2) * 4)) : 0;
    R(k, dx + dw / 2 - 4 + pen, fy - 18, 1, 4, k.c('#18181c')); if (pen) k.p.hline(dx + dw / 2 - 6, dx + dw / 2 - 6 + pen, fy - 14, k.c('#1a2a8a'));
    lampDesk(k, dx + 4, fy - 12);
    if ((m.n.big ?? 0) > 0) for (let i = 0; i < 3; i++) pressCam(k, Math.round(W * (0.12 + i * 0.3)), fy + 6, blink(k, 1.7, i * 0.33) && k.t > 0 && Math.sin(k.t * 9 + i * 2) > 0.85);
    poster(k, Math.round(W * 0.42), 6, 34, 20, k.pal.accent2, m.sign.brand);
  },
  door(k, m) {
    const W = k.W, fy = k.fy;
    nightStreet(k, m);
    // fachada com a porta acesa
    const fx = Math.round(W * 0.36), fw = Math.round(W * 0.28);
    ink27(k, () => { bricks(k, fx, Math.max(4, fy - 70), fw, fy - Math.max(4, fy - 70), k.c('#6a3a2a'));
    R(k, fx + fw / 2 - 9, fy - 30, 18, 30, k.c('#ffe0a0')); R(k, fx + fw / 2 - 11, fy - 32, 22, 2, k.pal.trim); });
    cone(k, fx + fw / 2, fy - 1, 18, k.H, 50, k.c('#ffd889'), 40);
    R(k, fx + fw / 2 - 12, fy - 2, 24, 2, k.c('#5a5a62'));
    // imprensa amontoada
    R(k, 0, fy, W, k.H - fy, k.c('#1a1a22'));
    for (let i = 0; i < 9; i++) {
      const x = Math.round((i < 5 ? W * 0.04 : W * 0.66) + (i % 5) * 16), flash = k.t > 0 && Math.sin(k.t * (7 + i) + i * 3) > 0.9;
      ink27(k, () => { R(k, x, fy - 14 + (i % 2) * 2, 6, 14, k.c('#2a2a34')); R(k, x + 1, fy - 18 + (i % 2) * 2, 4, 4, k.c('#3a2a24')); });
      pressCam(k, x + (i < 5 ? 5 : -5), fy - 10 + (i % 2) * 2, flash);
      if (k.band >= 1 && i % 3 === 0) { k.p.line(x + 3, fy - 12, x + (i < 5 ? 14 : -8), fy - 22, k.c('#2a2a2e')); R(k, x + (i < 5 ? 13 : -10), fy - 24, 3, 3, k.c('#3a3a42')); } // microfone de vara
    }
    ink27(k, () => { if (k.band >= 2) { R(k, W - 46, fy - 26, 40, 16, k.c('#e8e8f0')); text(k, 'TV', W - 30, fy - 22, k.c('#c02020')); R(k, W - 30, fy - 34, 1, 8, k.c('#8a8a92')); k.p.disc(W - 30, fy - 36, 3, k.c('#c8c8d0')); } });
  },
  memorial(k, m) {
    const W = k.W, fy = k.fy;
    grad(k, 0, 0, W, fy, k.c('#0a0a12'), k.c('#1c1a28'));
    for (let x = 0; x < W; x += 6) k.p.vline(x, 0, fy - 1, k.c('#141420'));
    floor(k, fy, k.c('#2a2228'), k.c('#221c22'));
    // moldura do retrato (o rosto é desenhado por cima na camada do DOM)
    const cx = Math.round(W / 2);
    ink27(k, () => { R(k, cx - 18, Math.max(4, fy - 66), 36, 42, k.pal.gold); R(k, cx - 16, Math.max(6, fy - 64), 32, 38, k.c('#1a1418')); });
    R(k, cx - 4, Math.max(4, fy - 66) + 42, 8, 2, k.c('#18181c')); // fita
    // flores e velas
    for (let i = 0; i < 24; i++) R(k, cx - 40 + ((i * 37) % 80), fy - 6 + ((i * 13) % 5), 2, 2, k.c(['#e05a4e', '#ffffff', '#f0c840', '#e070a8'][i % 4]));
    for (let i = 0; i < 12; i++) candle(k, 12 + i * Math.round((W - 24) / 11), fy + 4 - (i % 3) * 2);
    cone(k, cx, 0, 4, fy, 60, k.c('#fff0d0'), 30);
  },
  leave(k, m) {
    const W = k.W, fy = k.fy;
    P.roster(k, m);
    // porta aberta para a rua (luz do dia entrando)
    const dx = W - 30;
    ink27(k, () => { R(k, dx, fy - 40, 22, 40, k.c('#ffe8c0')); R(k, dx - 2, fy - 42, 26, 2, k.pal.trim); });
    cone(k, dx + 11, fy - 1, 22, k.H, 40, k.c('#ffe8c0'), 40);
    ink27(k, () => { k.p.poly([[dx, fy - 40], [dx - 10, fy - 36], [dx - 10, fy - 2], [dx, fy]], k.pal.woodDark); });
    dim(k, 50);
  },
  era(k, m) {
    const W = k.W, fy = k.fy;
    // velho (à esquerda, desbotando) → novo (à direita, acendendo)
    const old: K27 = { ...k, band: Math.max(0, k.band - 1) as Band27, year: k.year - 20 };
    const f = k.t === 0 ? 1 : Math.min(1, k.t / 4);
    grad(k, 0, 0, W, k.H, k.c('#100c20'), k.c('#2a2048'));
    R(k, 0, fy, W, k.H - fy, k.c('#14101e'));
    const ox = Math.round(W * 0.26), nx = Math.round(W * 0.66);
    desk(old, ox - 16, fy, 44); radio(old, ox - 6, fy - 12); tvSet(old, ox + 8, fy - 12);
    dim(k, Math.round(40 + 80 * f));
    desk(k, nx - 16, fy, 50); radio(k, nx - 6, fy - 12); computer(k, nx + 12, fy - 12, true);
    halo(k, nx + 8, fy - 20, Math.round(10 + 20 * f), k.pal.gold, Math.round(60 * f));
    for (let i = 0; i < 3; i++) { const x = Math.round(W * 0.44) + i * 6; k.p.line(x, fy - 30, x + 4, fy - 26, k.pal.gold); k.p.line(x + 4, fy - 26, x, fy - 22, k.pal.gold); }
    const yr = String(k.year);
    drawText(k.p, yr, Math.round(W / 2 - tw(yr)) + 1, 9, k.c('#101010'), 2);
    drawText(k.p, yr, Math.round(W / 2 - tw(yr)), 8, k.pal.gold, 2);
  },
};

/** Submundo: beco à esquerda + sala dos fundos (mesa de jogo, máquina de pirataria da época) à direita. */
function paintCrime(k: K27, m: ArtModel27): void {
  const W = k.W, fy = k.fy, split = Math.round(W * 0.46), b = k.band;
  // sala dos fundos (direita)
  R(k, split, 0, W - split, fy, mix(shade(k.pal.wall, -0.6), k.c('#120a0e'), 0.62));
  if (k.pal.wallKind === 'wainscot') R(k, split, fy - 16, W - split, 16, shade(k.pal.wall2, -0.3));
  for (let y = fy; y < k.H; y++) for (let x = split; x < W; x++) k.p.put(x, y, (x + y) % 4 ? k.c('#2a201c') : k.c('#241a16'));
  const tx = Math.round(W * 0.71);
  const busy = m.n.busy === 1;
  cone(k, tx, 2, 4, fy - 10, 46, k.pal.lamp, busy ? 50 : 22); R(k, tx - 3, 0, 7, 3, k.c('#2a4a2a')); k.p.vline(tx, 0, 0, k.c('#3a3a3a'));
  // mesa de jogo (feltro verde, fichas, cartas)
  ink27(k, () => { k.p.ellipse(tx, fy - 12, 22, 4, k.c('#1f5a32')); k.p.ellipse(tx, fy - 12, 22, 4, k.c('#1f5a32')); R(k, tx - 22, fy - 12, 44, 2, k.c('#3a2a1a'));
  k.p.vline(tx - 16, fy - 10, fy - 1, k.c('#2a1a10')); k.p.vline(tx + 16, fy - 10, fy - 1, k.c('#2a1a10')); });
  if (busy) { for (let i = 0; i < 5; i++) { R(k, tx - 14 + i * 7, fy - 14, 2, 2 + (i % 3), [k.c('#e05a4e'), k.c('#f4f0e0'), k.c('#3a6ad0')][i % 3]); } R(k, tx - 3, fy - 14, 4, 2, k.c('#f4f0e0')); R(k, tx + 4, fy - 14, 3, 2, k.c('#f4f0e0')); stackDiscs(k, tx + 10, fy - 12, 2, k.c('#4ade80')); }
  else { chair(k, tx - 26, fy); chair(k, tx + 20, fy); }
  // máquina de pirataria da época, ao fundo
  const mx = W - 40;
  if (b === 0) { press(k, mx, fy, k.c('#5a3a24'), k.t * 4); }
  else if (b === 1) { R(k, mx, fy - 18, 32, 18, k.c('#3a3a40')); disc(k, mx + 8, fy - 22, 5, k.pal.accent2, k.t * 5); disc(k, mx + 22, fy - 22, 5, k.pal.accent, k.t * 5); }
  else if (b === 2) { for (let r = 0; r < 3; r++) { R(k, mx, fy - 8 - r * 8, 32, 7, k.c('#26262c')); for (let j = 0; j < 3; j++) { R(k, mx + 2 + j * 10, fy - 7 - r * 8, 8, 4, k.c('#3a3a42')); k.p.set(mx + 4 + j * 10, fy - 6 - r * 8, blink(k, 2, r + j) ? k.c('#ff3030') : k.c('#4a2020')); } } }
  else { R(k, mx + 4, fy - 34, 24, 34, k.c('#16161c')); for (let r = 0; r < 8; r++) for (let j = 0; j < 4; j++) k.p.set(mx + 7 + j * 5, fy - 31 + r * 4, blink(k, 3, r * 0.3 + j) ? k.c('#4ade80') : k.c('#1a3a1a')); }
  // beco (esquerda)
  grad(k, 0, 0, split, fy, k.c('#07060f'), k.c('#1a1424'));
  bricks(k, 0, Math.round(fy * 0.25), split, fy - Math.round(fy * 0.25), k.c('#3a2420'), k.c('#24140f'));
  R(k, 0, Math.round(fy * 0.25), split, fy - Math.round(fy * 0.25), k.c('#06040c', 120));
  for (let i = 0; i < 10; i++) k.p.set(Math.floor(noise(i, 1, k.seed) * (split - 4)), Math.floor(noise(i, 2, k.seed) * fy * 0.22), k.c('#e8e4ff'));
  for (let y = fy; y < k.H; y++) k.p.hline(0, split - 1, y, k.c('#18181e'));
  k.p.ellipse(Math.round(split * 0.5), fy + 3, 14, 2, k.c('#2a3a5a', 200));
  const lx = Math.round(split * 0.28);
  R(k, lx, fy - 44, 2, 44, k.c('#2a2a30')); R(k, lx - 3, fy - 46, 8, 3, k.c('#3a3a40'));
  cone(k, lx + 1, fy - 43, 4, fy, 34, k.c('#ffd889'), 38); halo(k, lx + 1, fy - 44, 6, k.c('#ffe8b0'), 120);
  R(k, 6, fy - 10, 9, 10, k.c('#3a4038')); R(k, 5, fy - 11, 11, 2, k.c('#4a5048'));
  R(k, split - 24, fy - 8, 12, 8, k.c('#5a4026')); R(k, split - 20, fy - 14, 10, 6, k.c('#6a4c2e'));
  // parede divisória com a porta entreaberta
  R(k, split - 2, 0, 4, fy, k.c('#1a1210')); R(k, split - 2, fy - 26, 4, 26, k.c('#ffb050', busy ? 200 : 90));
  if (m.n.heat >= 40) { const ph = k.t === 0 ? 0 : Math.floor(k.t * 3) % 2; halo(k, 0, fy - 14, 34, k.c(ph ? '#ff3030' : '#3060ff'), 70); }
  if (m.n.raid) policeCar(k, 4, fy + 4);
  text(k, b === 0 ? 'SOBRE A LEI SECA' : b === 3 ? 'PRIVADO' : 'SO SOCIOS', split + 4, 4, k.c('#8a6a4a'));
}

/** Pinta o quadro (puro). `t` em segundos (0 = estático, o que as páginas usam). */
export function paintArt27(m: ArtModel27, t = 0, into?: Px): Px {
  const p = into ?? new Px(m.W, m.H);
  if (into) p.d.fill(0);
  const k = kit27(p, m.year, t, m.seed, m.fy);
  P[m.kind](k, m);
  return p;
}

/** Hash curto (testes de determinismo). */
export function artHash27(p: Px): string {
  let h = 2166136261;
  for (let i = 0; i < p.d.length; i += 3) { h ^= p.d[i]; h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

// ---------------------------------------------------------------- DOM

export interface ArtOpts27 { year?: number; w?: number; h?: number; maxScale?: number; kind?: SceneKind27; caption?: boolean }

/** Desenha os bonecos do modelo num contexto 2D (t para caminhar/pular). */
export function drawFigs27(ctx: CanvasRenderingContext2D, s: GameState, m: ArtModel27, t = 0, still = true): void {
  const figs = [...m.figs].sort((a, b) => (a.dy ?? 0) - (b.dy ?? 0));
  for (const f of figs) {
    const p = f.pid ? s.persons?.[f.pid] : undefined;
    const look = p ? lookOf(p) : f.seed.startsWith('c-') || f.seed.startsWith('c29') ? crowdLook27(f.seed, m.year) : randomLook(f.seed); // r29: figurantes das cenas com a roupa da época
    const k = f.walkTo !== undefined && !still ? Math.min(1, t / 5) : 1;
    const fx = f.walkTo !== undefined ? f.fx + (f.walkTo - f.fx) * k : f.fx;
    const walking = f.walkTo !== undefined && k < 1 && !still;
    const sp = avatarSprite(look, { year: m.year, pose: walking ? 'walk' : f.pose ?? 'stand', dir: f.dir ?? 'SE', frame: still ? 0 : Math.floor(t * 4) % 4, role: (f.role ?? null) as never });
    const bob = !still && f.pose === 'play' ? Math.round(Math.max(0, Math.sin(t * 5 + fx * 9))) : 0;
    const x = Math.round(fx * m.W - sp.ax), y = Math.round(m.fy + (f.dy ?? 0) - sp.ay - bob);
    if (f.dark) { ctx.globalAlpha = 0.85; ctx.filter = 'brightness(0.35)'; }
    if (f.holo) { // r29 (F8): holograma — duas passadas translúcidas em ciano, com tremido de varredura
      const jit = still ? 0 : Math.round(Math.sin(t * 13) * 0.6);
      ctx.globalAlpha = 0.35; ctx.filter = 'brightness(1.6) sepia(1) hue-rotate(150deg) saturate(3) blur(1px)'; ctx.drawImage(sp.c, x - 1, y);
      ctx.globalAlpha = still ? 0.6 : 0.45 + 0.15 * Math.abs(Math.sin(t * 3)); ctx.filter = 'brightness(1.4) sepia(1) hue-rotate(150deg) saturate(2.4)'; ctx.drawImage(sp.c, x + jit, y);
      ctx.globalAlpha = 1; ctx.filter = 'none';
      continue;
    }
    ctx.drawImage(sp.c, x, y);
    ctx.globalAlpha = 1; ctx.filter = 'none';
  }
}

function toCanvas(p: Px, c: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(p.w, p.h);
  new Uint32Array(img.data.buffer).set(p.d);
  ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Escala inteira: a largura exibida é W × n (n = quanto cabe no pai, até maxScale). */
export function fitInt27(c: HTMLCanvasElement, W: number, maxScale = 3): void {
  const apply = (avail: number) => { const n = Math.max(1, Math.min(maxScale, Math.floor(avail / W))); c.style.width = `${W * n}px`; c.style.height = 'auto'; };
  apply(Math.min(typeof window !== 'undefined' ? window.innerWidth - 32 : W * 2, W * maxScale));
  if (typeof ResizeObserver === 'undefined') return;
  const ro = new ResizeObserver(() => { const par = c.parentElement; if (!c.isConnected) { ro.disconnect(); return; } if (par) apply(par.clientWidth); });
  queueMicrotask(() => { if (c.parentElement) ro.observe(c.parentElement); });
}

/**
 * Ilustração da página: <canvas> pixelado (escala inteira), com bonecos e rótulo acessível.
 * Devolve null quando a página não tem arte. `opts.year` força a época (contato/galeria).
 */
export function pageArt27(area: string, s: GameState, opts: ArtOpts27 = {}): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const m = artModel27(area, s, { year: opts.year, w: opts.w, h: opts.h, kind: opts.kind });
  if (!m) return null;
  const c = document.createElement('canvas');
  c.width = m.W; c.height = m.H;
  c.className = 'px art27';
  c.dataset.variant = m.variant;
  c.setAttribute('role', 'img');
  const lang = (document.documentElement.lang || 'pt').startsWith('en') ? 'en' : 'pt';
  c.setAttribute('aria-label', `${m.caption[lang]} — ${m.year}`);
  const ctx = toCanvas(paintArt27(m, 0), c);
  if (ctx) drawFigs27(ctx, s, m, 0, true);
  fitInt27(c, m.W, opts.maxScale ?? 3);
  return c;
}

/** Quadro emoldurado (fundo da moldura = cor das bordas da arte; funciona nos dois temas). */
export function pageArtFrame27(area: string, s: GameState, opts: ArtOpts27 = {}): HTMLElement | null {
  const c = pageArt27(area, s, opts);
  if (!c) return null;
  const fig = document.createElement('figure');
  fig.className = `art27-frame art27-${c.dataset.variant?.split('/')[0] ?? ''}`;
  try { const d = c.getContext('2d')?.getImageData(0, Math.floor(c.height / 2), 1, 1).data; if (d) fig.style.setProperty('--art27-edge', `rgb(${d[0]},${d[1]},${d[2]})`); } catch { /* canvas sem leitura */ }
  fig.appendChild(c);
  return fig;
}

/** Registro lido pelo cabeçalho de página (ui27): área → fábrica da arte emoldurada. */
export const artSlots27 = new Map<string, (s: GameState, opts?: ArtOpts27) => HTMLElement | null>();
for (const area of Object.keys(AREA_ART27)) artSlots27.set(area, (s, o) => pageArtFrame27(area, s, o));


// r27: liga a ilustração ao cabeçalho padrão das páginas (ui27.pageHeader27)
import { artHook27 } from './ui27';
artHook27.f = (area, s) => pageArtFrame27(area, s);
