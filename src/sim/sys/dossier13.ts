// Rodada 13: dados dos dossiês completos — selo (participação por ano, elenco antigo, discos, prêmios,
// marcos) e artista (marcos de carreira, fracassos, "definiu uma época", selos por onde passou,
// contratos, relíquias) e fatos pessoais genéricos de qualquer pessoa (campos novos aparecem sozinhos).
// Funções puras: só leem o estado e nunca olham o futuro (tudo filtrado por s.year).

import { l, type L } from '../../data/world';
import type { Act, GameState, Person, Release } from '../types';
import { ch7 } from './charts7';
import { definingFigures } from './chron9';
import { eraYear, erasSoFar } from './eras8';
import { relics, type Relic } from './relics9';
import { P } from './people/state';

export const isPlayerLabel = (id: string): boolean => id === 'player';
export const labelName13 = (s: GameState, id: string): string => (isPlayerLabel(id) ? s.config.companyName : s.labels[id]?.name ?? '?');

/** Releases já lançados (nada do futuro). */
const past = (s: GameState): Release[] => Object.values(s.releases).filter((r) => r.year <= s.year);

/** Participação do selo nas vendas dos lançamentos de cada ano (0..1). */
export function labelShareHistory(s: GameState, id: string, years = 30): { y: number; share: number; units: number }[] {
  const tot: Record<number, number> = {};
  const mine: Record<number, number> = {};
  for (const r of past(s)) {
    if (r.year < s.year - years) continue;
    tot[r.year] = (tot[r.year] ?? 0) + r.totalUnits;
    if (r.owner === id) mine[r.year] = (mine[r.year] ?? 0) + r.totalUnits;
  }
  return Object.keys(tot).map(Number).sort((a, b) => a - b).map((y) => ({ y, units: mine[y] ?? 0, share: tot[y] > 0 ? (mine[y] ?? 0) / tot[y] : 0 }));
}

export function labelRoster13(s: GameState, id: string): Act[] {
  const ids = isPlayerLabel(id) ? Object.values(s.acts).filter((a) => a.owner === 'player').map((a) => a.id) : s.labels[id]?.roster ?? [];
  return ids.map((x) => s.acts[x]).filter((a): a is Act => !!a).sort((a, b) => b.fame - a.fame);
}

/** Ex-artistas: lançaram pelo selo e hoje não estão nele. */
export function labelAlumni(s: GameState, id: string): { act: Act; n: number; last: number }[] {
  const cur = new Set(labelRoster13(s, id).map((a) => a.id));
  const by: Record<string, { n: number; last: number }> = {};
  for (const r of past(s)) if (r.owner === id && !cur.has(r.actId) && s.acts[r.actId]) {
    const x = (by[r.actId] ??= { n: 0, last: 0 });
    x.n++; x.last = Math.max(x.last, r.year);
  }
  return Object.entries(by).map(([a, x]) => ({ act: s.acts[a], ...x })).sort((a, b) => b.last - a.last || b.n - a.n);
}

export function labelTopReleases(s: GameState, id: string, n = 12): Release[] {
  return past(s).filter((r) => r.owner === id).sort((a, b) => b.totalUnits - a.totalUnits).slice(0, n);
}

export interface Award13 { y: number; name: L; who: string; actId?: string; relId?: string; national?: boolean }

/** Separa "pt / en: vencedor" do registro de prêmios. */
export function splitAwardName(name: string): { name: L; who: string } {
  const i = name.indexOf(': ');
  const head = i >= 0 ? name.slice(0, i) : name;
  const [pt, en] = head.split(' / ');
  return { name: l(pt, en ?? pt), who: i >= 0 ? name.slice(i + 2) : '' };
}

function allAwards(s: GameState): Award13[] {
  const out: Award13[] = [];
  for (const a of s.awards) if (a.year <= s.year) { const x = splitAwardName(a.name); out.push({ y: a.year, name: x.name, who: x.who, actId: a.actId ?? (a.releaseId ? s.releases[a.releaseId]?.actId : undefined), relId: a.releaseId }); }
  for (const a of ch7(s)?.awards ?? []) if (a.year <= s.year) out.push({ y: a.year, name: l(`Prêmio nacional (${a.a3}) — ${a.cat}`, `National award (${a.a3}) — ${a.cat}`), who: a.winner, actId: a.actId ?? (a.relId ? s.releases[a.relId]?.actId : undefined), relId: a.relId, national: true });
  return out.sort((a, b) => b.y - a.y);
}

export function labelAwards(s: GameState, id: string): Award13[] {
  return allAwards(s).filter((a) => (a.relId && s.releases[a.relId]?.owner === id) || (!a.relId && a.actId && (s.acts[a.actId]?.owner === id)));
}

export function labelStats13(s: GameState, id: string): { releases: number; no1: number; top10: number; gold: number; plat: number; units: number } {
  const rs = past(s).filter((r) => r.owner === id);
  return {
    releases: rs.length, no1: rs.filter((r) => r.peak === 1).length, top10: rs.filter((r) => r.peak <= 10).length,
    gold: rs.filter((r) => r.certified === 'gold').length, plat: rs.filter((r) => r.certified === 'platinum' || r.certified === 'diamond').length,
    units: rs.reduce((t, r) => t + r.totalUnits, 0),
  };
}

/** Cenas onde o elenco atua ("cidade:gênero") com força. */
export function labelScenes(s: GameState, id: string): { key: string; v: number; acts: number }[] {
  const by: Record<string, number> = {};
  for (const a of labelRoster13(s, id)) { const k = `${a.city}:${a.genre}`; by[k] = (by[k] ?? 0) + 1; }
  return Object.entries(by).map(([key, acts]) => ({ key, acts, v: s.scenes[key] ?? 0 })).sort((a, b) => b.acts - a.acts || b.v - a.v);
}

// ---------------------------------------------------------------- artista

export interface Milestones13 {
  no1: number; top10: number; peak: number; certs: Release[]; awards: Award13[]; best: Release[]; flops: Release[];
  defined: { what: L; y0: number; y1: number; rank: number }[];
}

/** Lançamento que não aconteceu: fora do top 40, já com um ano de estrada e vendas fracas. */
export const isFlop = (s: GameState, r: Release): boolean => !r.hist && r.year < s.year && r.peak > 40 && r.totalUnits < 20000;

export function actMilestones(s: GameState, a: Act): Milestones13 {
  const rs = past(s).filter((r) => r.actId === a.id);
  const defined: Milestones13['defined'] = [];
  const eras = erasSoFar(s);
  eras.forEach((e, i) => {
    const y0 = Math.max(1900, eraYear(s, e.id) ?? 1900), y1 = Math.min(s.year, (i + 1 < eras.length ? (eraYear(s, eras[i + 1].id) ?? s.year) - 1 : s.year));
    if (y1 < y0 || y1 - y0 < 2) return;
    const rank = definingFigures(s, 3, y0, y1).findIndex((x) => x.id === a.id);
    if (rank >= 0) defined.push({ what: e.name, y0, y1, rank: rank + 1 });
  });
  for (let d = Math.floor(a.formed / 10) * 10; d <= s.year; d += 10) {
    const rank = definingFigures(s, 3, d, Math.min(s.year, d + 9)).findIndex((x) => x.id === a.id);
    if (rank >= 0) defined.push({ what: l(`Década de ${d}`, `The ${d}s`), y0: d, y1: Math.min(s.year, d + 9), rank: rank + 1 });
  }
  return {
    no1: Math.max(a.number1s, rs.filter((r) => r.peak === 1).length), top10: Math.max(a.hits, rs.filter((r) => r.peak <= 10).length),
    peak: Math.min(a.peakChart || 999, ...rs.map((r) => r.peak)),
    certs: rs.filter((r) => r.certified), awards: allAwards(s).filter((x) => x.actId === a.id),
    best: rs.slice().sort((x, y) => x.peak - y.peak || y.totalUnits - x.totalUnits).slice(0, 6),
    flops: rs.filter((r) => isFlop(s, r)), defined,
  };
}

/** Selos por onde o artista passou (pelos lançamentos). */
export function actLabelHistory(s: GameState, a: Act): { owner: string; from: number; to: number; n: number }[] {
  const out: { owner: string; from: number; to: number; n: number }[] = [];
  for (const r of past(s).filter((x) => x.actId === a.id).sort((x, y) => x.year - y.year || x.week - y.week)) {
    const last = out[out.length - 1];
    if (last && last.owner === r.owner) { last.to = r.year; last.n++; }
    else out.push({ owner: r.owner, from: r.year, to: r.year, n: 1 });
  }
  if (a.owner && (!out.length || out[out.length - 1].owner !== a.owner)) out.push({ owner: a.owner, from: s.year, to: s.year, n: 0 });
  return out;
}

export const actContracts = (s: GameState, a: Act) => Object.values(s.contracts).filter((c) => c.actId === a.id).sort((x, y) => x.startWeek - y.startWeek);

export function actRelics(s: GameState, a: Act): Relic[] {
  const ms = new Set(a.members);
  return (relics(s)?.list ?? []).filter((r) => r.y <= s.year && (r.a === a.id || (r.p && ms.has(r.p))));
}

// ---------------------------------------------------------------- pessoa: fatos genéricos

export interface Fact13 { k: string; label: L; v: string | L; group: string }

const KEY_NAMES: Record<string, L> = {
  married: l('Casado(a)', 'Married'), spouse: l('Cônjuge', 'Spouse'), partner: l('Parceiro(a)', 'Partner'), single: l('Solteiro(a)', 'Single'),
  marital: l('Estado civil', 'Marital status'), maritalStatus: l('Estado civil', 'Marital status'), status: l('Situação', 'Status'),
  children: l('Filhos', 'Children'), kids: l('Filhos', 'Children'), divorced: l('Divorciado(a)', 'Divorced'), widowed: l('Viúvo(a)', 'Widowed'),
  health: l('Saúde', 'Health'), vices: l('Vícios', 'Vices'), vice: l('Vício', 'Vice'), addiction: l('Dependência', 'Addiction'), dependency: l('Dependência', 'Dependency'),
  fame: l('Fama', 'Fame'), hype: l('Hype', 'Hype'), wealth: l('Patrimônio', 'Wealth'), religion: l('Religião', 'Religion'), politics: l('Política', 'Politics'),
  hometown: l('Cidade natal', 'Hometown'), city: l('Cidade', 'City'), gender: l('Gênero', 'Gender'), nickname: l('Apelido', 'Nickname'), reputation: l('Reputação', 'Reputation'),
  charisma: l('Carisma', 'Charisma'), looks: l('Aparência', 'Looks'), temper: l('Temperamento', 'Temper'), scandals: l('Escândalos', 'Scandals'), rehab: l('Reabilitação', 'Rehab'),
  smoke: l('Cigarro', 'Smoking'), drink: l('Bebida', 'Drinking'), drugs: l('Drogas', 'Drugs'), died: l('Morte', 'Death'), retireAge: l('Pensa em parar aos', 'Plans to stop at'),
};

const PERSON_KNOWN = new Set(['id', 'name', 'born', 'role', 'skills', 'potential', 'traits', 'ambition', 'origin', 'morale', 'inspiration', 'fatigue', 'stress', 'resentment', 'health', 'alive', 'died', 'rel', 'lowMoraleMonths', 'look', 'persona', 'goal', 'parentId', 'retireAge', 'isPlayer']);
/** módulos com dados por pessoa já mostrados em outras abas (ou grandes demais) */
const SKIP_MODULES = new Set(['people', 'hype12', 'chron9', 'tal', 'talent', 'bolsa10', 'charts7', 'ch7']);

const isL = (x: unknown): x is L => !!x && typeof x === 'object' && 'pt' in (x as object) && 'en' in (x as object);
const humanize = (k: string): L => KEY_NAMES[k] ?? l(k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '), k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '));

function fmtVal(s: GameState, v: unknown): string | L | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? l('sim', 'yes') : l('não', 'no');
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
  if (typeof v === 'string') return s.persons[v]?.name ?? s.acts[v]?.name ?? s.labels[v]?.name ?? v;
  if (isL(v)) return v;
  if (Array.isArray(v)) {
    if (!v.length) return '—';
    if (v.every((x) => typeof x !== 'object' || isL(x))) return v.slice(0, 8).map((x) => { const f = fmtVal(s, x); return typeof f === 'string' ? f : f ? f.pt : ''; }).join(', ');
    // lista de objetos: nome/n quando houver, senão a contagem
    const names = v.slice(0, 6).map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>).name ?? (x as Record<string, unknown>).n : null)).filter((x): x is string => typeof x === 'string');
    return names.length ? `${v.length}: ${names.join(', ')}` : String(v.length);
  }
  return null;
}

function flatten(s: GameState, obj: unknown, group: string, out: Fact13[], prefix = ''): void {
  if (out.length > 60) return;
  if (!obj || typeof obj !== 'object' || isL(obj) || Array.isArray(obj)) {
    const v = fmtVal(s, obj);
    if (v !== null) out.push({ k: prefix || group, label: humanize(prefix || group), v, group });
    return;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (out.length > 60) return;
    if (v && typeof v === 'object' && !Array.isArray(v) && !isL(v)) {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>).slice(0, 12)) {
        const f = fmtVal(s, v2);
        if (f !== null) out.push({ k: `${k}.${k2}`, label: l(`${humanize(k).pt} · ${humanize(k2).pt}`, `${humanize(k).en} · ${humanize(k2).en}`), v: f, group });
      }
    } else {
      const f = fmtVal(s, v);
      if (f !== null) out.push({ k, label: humanize(k), v: f, group });
    }
  }
}

/** Campos da pessoa que nenhuma aba conhece (atributos novos de outros sistemas) e dados por pessoa
 *  guardados em módulos s.x4.<mod>[id] ou s.x4.<mod>.<mapa>[id]. */
export function personExtraFacts(s: GameState, p: Person): Fact13[] {
  const out: Fact13[] = [];
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) if (!PERSON_KNOWN.has(k)) extra[k] = v;
  if (Object.keys(extra).length) flatten(s, extra, 'person', out);
  const x4 = ((s as unknown as { x4?: Record<string, unknown> }).x4 ?? {});
  for (const [mod, st] of Object.entries(x4)) {
    if (SKIP_MODULES.has(mod) || !st || typeof st !== 'object' || Array.isArray(st)) continue;
    const rec = st as Record<string, unknown>;
    if (rec[p.id] !== undefined) { flatten(s, rec[p.id], mod, out); continue; }
    for (const [k2, sub] of Object.entries(rec)) {
      if (!sub || typeof sub !== 'object' || Array.isArray(sub)) continue;
      const v = (sub as Record<string, unknown>)[p.id];
      if (v !== undefined) flatten(s, v, `${mod}.${k2}`, out, typeof v === 'object' ? '' : k2);
    }
  }
  return out;
}

/** Vida pessoal resumida: estado civil, parceiro(a), filhos, saúde, dependência. */
export function personLife(s: GameState, p: Person): { partner?: string; together: boolean; exes: string[]; kids: { name: string; born: number }[]; health: string; dependency?: number; voice?: number; hearing?: number; separated?: boolean } {
  const rom = (P(s)?.romances ?? []).filter((r) => r.a === p.id || r.b === p.id);
  const other = (r: { a: string; b: string }) => s.persons[r.a === p.id ? r.b : r.a]?.name ?? '?';
  const fam = (s as unknown as { families?: Record<string, { partner?: { name: string }; kids: { name: string; born: number }[]; separated?: boolean }> }).families?.[p.id];
  const cur = rom.find((r) => r.status === 'together');
  const hs = P(s)?.health?.[p.id];
  return {
    partner: fam?.partner && !fam.separated ? fam.partner.name : cur ? other(cur) : undefined,
    together: !!(fam?.partner && !fam.separated) || !!cur,
    exes: rom.filter((r) => r.status === 'over').map(other),
    kids: (fam?.kids ?? []).filter((k) => k.born <= s.year).map((k) => ({ name: k.name, born: k.born })),
    health: p.health, dependency: hs?.dependency, voice: hs?.voice, hearing: hs?.hearing, separated: fam?.separated,
  };
}
