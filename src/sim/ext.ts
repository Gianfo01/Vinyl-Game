// Inicializa (ou migra) o estado da expansão. Idempotente: chamado por createGame
// e pela migração de saves antigos; nunca apaga dados existentes.

import { hashString } from '../core/rng';
import type { GameState, Person } from './types';
import type { ExtState } from './xtypes';

export function emptyExt(): ExtState {
  return {
    clock: { dayInMonth: 0, opened: false, monthStartWeek: 0 },
    daily: [],
    plans: [],
    loadNow: {},
    location: {},
    assets: [],
    creditors: [],
    personalCash: {},
    arcs: [],
    subLabels: [],
    scouts: [],
    contests: [],
    demos: [],
    auctions: [],
    sessions: [],
    samples: [],
    producerBusy: {},
    rollouts: [],
    reviews: {},
    crises: [],
    bans: [],
    tours: [],
    deals: [],
    merch: {},
    companies: [],
    lawsuits: [],
    listing: { listed: false, shares: 1_000_000, floatShare: 0, price: 0, history: [] },
    securitizations: [],
    catalogAuctions: [],
    ownPublishing: false,
    holograms: [],
    imageRights: {},
    vault: {},
    families: {},
    factions: {},
    mentors: {},
    lineage: {},
    soloOf: {},
    documentaries: [],
    hallOfFame: [],
    movements: [],
    clubs: [],
    geo: { active: [], censorship: {} },
    rivalReport: { month: -1, items: [] },
    rivalries: {},
    genreCharts: {},
    regionCharts: {},
    records: {},
    fandoms: {},
    tutorial: { step: 0, done: false, seen: [] },
    votes: [],
  };
}

/** Personalidade determinística por identidade (GDD §45.2). */
export function personaOf(p: Person): NonNullable<Person['persona']> {
  if (p.persona) return p.persona;
  let h = hashString(p.id + p.name);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    h >>>= 0;
    return 15 + (h % 71);
  };
  p.persona = { openness: next(), perfectionism: next(), ambition: next(), sociability: next(), discipline: next(), resilience: next() };
  return p.persona;
}

export function ensureExt(s: GameState): GameState {
  const base = emptyExt() as unknown as Record<string, unknown>;
  const st = s as unknown as Record<string, unknown>;
  for (const k of Object.keys(base)) if (st[k] === undefined) st[k] = base[k];
  if (!s.clock.monthStartWeek) s.clock.monthStartWeek = s.week;
  for (const p of Object.values(s.persons)) {
    personaOf(p);
    if (!p.goal) {
      const goals = ['security', 'credit', 'family', 'leadership', 'solo'] as const;
      p.goal = goals[hashString(p.id) % goals.length];
    }
    if (!p.retireAge) p.retireAge = 62 + (hashString(p.id + 'r') % 14);
  }
  for (const a of Object.values(s.acts)) {
    if (!a.image) a.image = { artistic: 40, popularity: Math.round(a.fame), professionalism: 50, publicImage: 50 };
    if (!a.leaderId && a.members.length > 1) a.leaderId = a.members[0];
    if (!s.location[a.id]) s.location[a.id] = a.city;
  }
  return s;
}
