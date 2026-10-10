// Público com comportamento próprio (rodada 8): popularidade momentânea não é vínculo duradouro.
// - Ouvintes casuais, fãs ativos e colecionadores (parte do núcleo que compra edições especiais).
// - Hit viral: muita escuta, poucos ingressos — o público de passagem esfria rápido e não lota casa.
// - Banda pequena com público fiel sustenta turnê e vende edição especial sem frequentar a parada.
// - Saturação: lançar demais cansa os fãs ativos (colecionadores, ao contrário, gostam).
// - Migração: quando um artista para, some ou some do radar, parte do público vai para os parecidos.
// - Redescoberta: canções antigas do catálogo voltam com uma geração nova (streaming e vídeo curto
//   aceleram). Vários caminhos para o sucesso: parada, palco, nicho fiel ou catálogo.

import { clamp, type Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import type { Act, GameState, Release } from '../types';
import { fmtL, hasTech, notify, playerActs, remember } from '../util';

export interface AudMem {
  /** últimos 6 meses: [casual, ativo, núcleo] */
  h: number[][];
  /** semana em que viralizou */
  vw?: number;
  /** saturação de lançamentos (sobe a cada lançamento, desce todo mês) */
  sat: number;
}

export interface Revival { rel: string; w: number; until: number; power: number; why: 'generation' | 'story' }

export interface AudienceState {
  a: Record<string, AudMem>;
  /** migrações que envolvem atos do jogador (recentes) */
  mig: { w: number; f: string; t: string; n: number }[];
  /** redescobertas em curso */
  rev: Revival[];
  /** histórico de redescobertas (relId → ano) */
  revived: Record<string, number>;
}

declare module '../ext4' { interface Ext4 { audience8: AudienceState } }
registerExt4('audience8', () => ({ a: {}, mig: [], rev: [], revived: {} }));
export const audience = (s: GameState): AudienceState => (s as unknown as { x4: { audience8: AudienceState } }).x4.audience8;

const audOf = (s: GameState, id: string): AudMem => (audience(s).a[id] ??= { h: [], sat: 0 });

// ---------------------------------------------------------------- leitura

const COLLECT_FAM: Record<string, number> = { rock: 0.08, blues_jazz: 0.1, electronic: 0.06, hiphop: 0.04, europe: 0.04, sacred: 0.02, pop: -0.04 };

/** Fração do núcleo que coleciona (edições especiais, vinil, box). */
export function collectorShare(s: GameState, a: Act): number {
  const f = s.fandoms[a.id];
  const superF = f ? f.superfans / Math.max(1, a.fans.core) : 0;
  const vinylRevival = s.year >= 2008 ? 0.05 : 0;
  return clamp(0.12 + (COLLECT_FAM[familyOf(a.genre)] ?? 0) + superF * 0.5 + vinylRevival, 0.05, 0.45);
}

export function collectorsOf(s: GameState, a: Act): number {
  return Math.round(a.fans.core * collectorShare(s, a));
}

/** Vínculo 0..100: quanto do público é fiel (ativo e núcleo) e não só de passagem. */
export function bondOf(a: Act): number {
  const loyal = a.fans.active + a.fans.core * 3;
  return Math.round((100 * loyal) / (loyal + a.fans.casual * 0.3 + 1));
}

export function isViral(s: GameState, a: Act): boolean {
  const v = audience(s).a[a.id]?.vw;
  return v !== undefined && s.week - v < 26;
}

export interface AudienceRead {
  casual: number;
  active: number;
  core: number;
  collectors: number;
  bond: number;
  viral: boolean;
  saturation: number;
  /** variação em 3 meses (fração) por segmento, se houver histórico */
  trend?: { casual: number; active: number; core: number };
  /** rótulo do perfil de público */
  profile: L;
}

export function readAudience(s: GameState, a: Act): AudienceRead {
  const m = audience(s).a[a.id];
  const bond = bondOf(a);
  const viral = isViral(s, a);
  let trend: AudienceRead['trend'];
  if (m && m.h.length >= 3) {
    const old = m.h[m.h.length - 3];
    const g = (now: number, was: number) => (was > 0 ? now / was - 1 : 0);
    trend = { casual: g(a.fans.casual, old[0]), active: g(a.fans.active, old[1]), core: g(a.fans.core, old[2]) };
  }
  const profile = viral ? l('Viral: muita escuta, pouca fidelidade', 'Viral: many plays, little loyalty')
    : bond >= 70 ? l('Público fiel: lota casas e compra edições especiais', 'Loyal crowd: fills venues and buys special editions')
      : bond >= 45 ? l('Público equilibrado', 'Balanced audience')
        : l('Público de passagem: ouve, mas pouco compra ingresso', 'Passing crowd: listens but rarely buys tickets');
  return { casual: a.fans.casual, active: a.fans.active, core: a.fans.core, collectors: collectorsOf(s, a), bond, viral, saturation: m?.sat ?? 0, trend, profile };
}

// ---------------------------------------------------------------- modificadores

// palco: público fiel compra ingresso; viral, nem tanto
registerMod('cityDemand', 'audience8', (s, v, c) => {
  const a = c.act;
  if (!a) return null;
  let f = 0.9 + (bondOf(a) / 100) * 0.3;
  if (isViral(s, a)) f *= 0.8;
  return { value: v * f, label: isViral(s, a) ? l('Público viral de passagem', 'Passing viral crowd') : l('Vínculo do público', 'Audience bond') };
});

// merch e edições especiais vendidas no show
registerMod('showRevenue', 'audience8', (s, v, c) => {
  const a = c.act;
  if (!a) return null;
  return { value: v * (1 + collectorShare(s, a) * 0.3), label: l('Colecionadores na banca', 'Collectors at the merch stand') };
});

// edições especiais vivem dos colecionadores (sem depender da parada)
const SPECIAL = new Set(['limited', 'deluxe', 'anniversary', 'live']);
registerMod('appeal', 'audience8', (s, v, c) => {
  const rel = c.release;
  const a = c.act;
  if (!rel || !a || !SPECIAL.has(rel.kind ?? '')) return null;
  const col = collectorsOf(s, a);
  const boost = clamp(col / (a.fans.casual * 0.02 + 2000), 0, 0.6);
  return boost > 0.01 ? { value: v * (1 + boost), label: l('Colecionadores', 'Collectors') } : null;
});

// redescoberta: o catálogo antigo volta a tocar
registerMod('chartUnits', 'audience8', (s, v, c) => {
  const rel = c.release;
  if (!rel) return null;
  const st = audience(s);
  if (!st.rev.length) return null;
  const rv = st.rev.find((x) => x.rel === rel.id);
  if (!rv || s.week > rv.until) return null;
  const age = s.week - rv.w;
  const fade = Math.exp(-age / 10);
  const bonus = s.stats.weeklyPool * 0.0005 * rv.power * Math.pow(Math.max(30, rel.q) / 60, 2) * fade;
  return { value: v * (1 + rv.power * fade) + bonus, label: l('Redescoberta', 'Rediscovery') };
});

// ---------------------------------------------------------------- redescoberta

/** Começa uma redescoberta (também usada pelas histórias). Devolve false se já está em curso. */
export function startRevival(s: GameState, rel: Release, power: number, why: Revival['why']): boolean {
  const st = audience(s);
  if (st.rev.some((x) => x.rel === rel.id && s.week <= x.until)) return false;
  st.rev.push({ rel: rel.id, w: s.week, until: s.week + 30, power, why });
  if (st.rev.length > 6) st.rev.splice(0, st.rev.length - 6);
  st.revived[rel.id] = s.year;
  rel.live = true;
  const a = s.acts[rel.actId];
  if (a) {
    a.momentum = clamp(a.momentum + 8, 0, 100);
    remember(s, 'rediscovery', fmtL(l('Uma nova geração redescobre "{t}" ({a}, {y}).', 'A new generation rediscovers "{t}" ({a}, {y}).'), { t: rel.title, a: a.name, y: rel.year }), { actId: a.id, important: true });
    if (a.owner === 'player' || rel.owner === 'player' || a.playerBand) notify(s, fmtL(l('"{t}" ({y}) voltou a tocar: uma geração nova descobriu a música.', '"{t}" ({y}) is playing again: a new generation found it.'), { t: rel.title, y: rel.year }), 'good');
  }
  return true;
}

function yearlyRediscovery(s: GameState, r: Rng): void {
  const st = audience(s);
  const techBoost = (hasTech(s, 'streaming') ? 0.01 : 0) + (hasTech(s, 'short_video') ? 0.02 : 0);
  const cands: { rel: Release; w: number }[] = [];
  for (const rel of Object.values(s.releases)) {
    if (rel.reissueOf || rel.kind === 'compilation') continue;
    const a = s.acts[rel.actId];
    if (!a) continue;
    const mine = rel.owner === 'player' || !!a.playerBand;
    if (!mine) continue;
    const age = s.year - rel.year;
    if (age < 10) continue;
    if (st.revived[rel.id] !== undefined && s.year - st.revived[rel.id] < 15) continue;
    const crit = rel.critic ?? 55;
    const cult = s.flags[`cult8:${rel.id}`] ? 0.04 : 0;
    const w = 0.008 + (crit >= 70 ? 0.025 : 0) + (rel.q >= 65 ? 0.01 : 0) + cult + techBoost;
    cands.push({ rel, w });
  }
  // no máximo uma por ano: a mais provável ganha a vez se o dado deixar
  for (const c of r.shuffle(cands)) {
    if (r.chance(c.w)) {
      startRevival(s, c.rel, r.float(2.5, 5) * (s.flags[`cult8:${c.rel.id}`] ? 1.4 : 1), 'generation');
      break;
    }
  }
}

// ---------------------------------------------------------------- migração entre artistas parecidos

function monthlyMigration(s: GameState): void {
  const st = audience(s);
  const mine = new Set(playerActs(s));
  // destinos: os artistas ativos mais quentes por gênero e por família (uma passada)
  const byGenre = new Map<string, Act[]>();
  const byFam = new Map<string, Act[]>();
  const push = (m: Map<string, Act[]>, k: string, a: Act) => {
    const list = m.get(k) ?? [];
    list.push(a);
    if (list.length > 3) { list.sort((x, y) => y.momentum + y.fame - (x.momentum + x.fame)); list.length = 3; }
    m.set(k, list);
  };
  const sources: Act[] = [];
  for (const a of Object.values(s.acts)) {
    const live = a.status === 'active' || a.status === 'emerging';
    if (live && a.fame > 5 && s.week - a.lastRelease < 52) {
      push(byGenre, a.genre, a);
      push(byFam, familyOf(a.genre), a);
    }
    const dormant = live && a.lastRelease > 0 && s.week - a.lastRelease > 104 && !a.playerBand;
    if ((a.status === 'split' || a.status === 'retired' || a.status === 'hiatus' || dormant) && a.fans.casual + a.fans.active > 3000) sources.push(a);
  }
  for (const src of sources) {
    const targets = (byGenre.get(src.genre) ?? byFam.get(familyOf(src.genre)) ?? []).filter((x) => x.id !== src.id);
    if (!targets.length) continue;
    const rate = src.status === 'hiatus' ? 0.01 : 0.02;
    const mc = Math.round(src.fans.casual * rate);
    const ma = Math.round(src.fans.active * rate * 0.75);
    src.fans.casual -= mc;
    src.fans.active -= ma;
    // parte chega aos parecidos; o resto simplesmente para de ouvir
    const each = targets.length;
    for (const t0 of targets) {
      const gc = Math.round((mc * 0.6) / each);
      const ga = Math.round((ma * 0.6) / each);
      t0.fans.casual += gc;
      t0.fans.active += ga;
      if ((mine.has(t0.id) || mine.has(src.id)) && gc + ga > 300) {
        const last = st.mig.find((x) => x.f === src.id && x.t === t0.id);
        if (last) { last.n += gc + ga; last.w = s.week; } else st.mig.push({ w: s.week, f: src.id, t: t0.id, n: gc + ga });
      }
    }
  }
  st.mig = st.mig.filter((x) => s.week - x.w < 52).sort((x, y) => y.w - x.w).slice(0, 12);
}

// ---------------------------------------------------------------- semana e mês

// viral: a primeira semana grande de um single muito acima da base fiel
registerSimHook('week', 'audience8', (s) => {
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a) continue;
    for (let i = a.releases.length - 1; i >= 0; i--) {
      const rel = s.releases[a.releases[i]];
      if (!rel) continue;
      if (s.week - rel.week > 8) break;
      if (rel.type !== 'single' || rel.reissueOf) continue;
      const u = rel.weekly[rel.weekly.length - 1] ?? 0;
      const loyal = a.fans.active + a.fans.core * 2;
      if (u > 5000 && u > loyal * 2.5 + 2000) {
        const m = audOf(s, a.id);
        if (m.vw === undefined || s.week - m.vw >= 26) {
          m.vw = s.week;
          remember(s, 'viral8', fmtL(l('"{t}" viraliza: {a} ganha uma multidão de ouvintes de passagem.', '"{t}" goes viral: {a} gains a crowd of passing listeners.'), { t: rel.title, a: a.name }), { actId: a.id, important: true });
          notify(s, fmtL(l('{a} viralizou com "{t}": muita escuta, mas pouca gente compra ingresso. Converta os curiosos em fãs.', '{a} went viral with "{t}": many plays, few ticket buyers. Turn the curious into fans.'), { a: a.name, t: rel.title }), 'event');
        }
      }
    }
  }
});

registerSimHook('launch', 'audience8', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel) return;
  const a = s.acts[rel.actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return;
  const m = audOf(s, a.id);
  m.sat = Math.min(8, m.sat + (rel.type === 'lp' ? 1.5 : rel.type === 'ep' ? 1.2 : 1) * (SPECIAL.has(rel.kind ?? '') ? 0.5 : 1));
});

registerSimHook('month', 'audience8', (s) => {
  const st = audience(s);
  const mine = playerActs(s);
  for (const id of mine) {
    const a = s.acts[id];
    if (!a) continue;
    const m = audOf(s, id);
    m.h.push([a.fans.casual, a.fans.active, a.fans.core]);
    if (m.h.length > 6) m.h.splice(0, m.h.length - 6);
    // viral esfria rápido e converte pouco
    if (isViral(s, a)) {
      a.fans.casual = Math.round(a.fans.casual * 0.97);
      a.fans.active = Math.max(0, a.fans.active - Math.round(a.fans.casual * 0.002));
    }
    // saturação: fãs ativos cansam; colecionadores (núcleo) não
    if (m.sat > 2.5) {
      const leak = Math.round(a.fans.active * 0.015 * (m.sat - 2.5));
      a.fans.active -= leak;
      a.fans.casual += Math.round(leak * 0.5);
    }
    m.sat = Math.round(m.sat * 0.85 * 100) / 100;
  }
  // atos que deixaram de ser do jogador saem do histórico de público (save leve)
  for (const id of Object.keys(st.a)) if (!mine.includes(id)) delete st.a[id];
  st.rev = st.rev.filter((x) => s.week <= x.until);
  monthlyMigration(s);
});

registerSimHook('year', 'audience8', (s, r) => yearlyRediscovery(s, r));
