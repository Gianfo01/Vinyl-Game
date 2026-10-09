// Visão política e religião (rodada 10): toda pessoa (artistas, equipe, executivos e o jogador) tem uma
// inclinação política (com engajamento 0–100) e uma religião (com devoção 0–100). Para os NPCs nada é
// guardado no save: tudo é derivado de seed + id + mercado + época (determinístico). O jogador escolhe
// na criação do personagem (CharacterSpec) e pode mudar ao longo da vida (override em x4).
// Este módulo é puro (sem registros) para poder ser importado de qualquer lugar sem ciclo.

import { Rng, clamp } from '../core/rng';
import { CITIES, familyOf, l, type L, type MarketId } from '../data/world';
import type { Act, GameState } from './types';

export type PolId = 'left' | 'cleft' | 'center' | 'cright' | 'right' | 'apolitical';
export type RelId = 'catholic' | 'evangelical' | 'jewish' | 'muslim' | 'umbanda' | 'spiritist' | 'buddhist' | 'hindu' | 'atheist' | 'none';
export interface Views { pol: PolId; eng: number; rel: RelId; dev: number }

export const POLS: { id: PolId; name: L; axis: number }[] = [
  { id: 'left', name: l('Esquerda', 'Left'), axis: -2 },
  { id: 'cleft', name: l('Centro-esquerda', 'Centre-left'), axis: -1 },
  { id: 'center', name: l('Centro', 'Centre'), axis: 0 },
  { id: 'cright', name: l('Centro-direita', 'Centre-right'), axis: 1 },
  { id: 'right', name: l('Direita', 'Right'), axis: 2 },
  { id: 'apolitical', name: l('Apolítico', 'Apolitical'), axis: 0 },
];
export const RELS: { id: RelId; name: L; hint: L }[] = [
  { id: 'catholic', name: l('Católica', 'Catholic'), hint: l('Missas, batizados e festas de santo; igreja pede apoio.', 'Mass, baptisms and saints\' days; the parish asks for help.') },
  { id: 'evangelical', name: l('Evangélica / protestante', 'Evangelical / Protestant'), hint: l('Comunidade forte; gospel e conservadorismo nos costumes.', 'Strong community; gospel and conservative values.') },
  { id: 'jewish', name: l('Judaica', 'Jewish'), hint: l('Tradição, família e redes na indústria.', 'Tradition, family and industry networks.') },
  { id: 'muslim', name: l('Muçulmana', 'Muslim'), hint: l('Disciplina e comunidade; cuidado com bebida e letras.', 'Discipline and community; care with drink and lyrics.') },
  { id: 'umbanda', name: l('Umbanda / candomblé', 'Umbanda / Candomblé'), hint: l('Religiões afro-brasileiras; ritmo e ancestralidade.', 'Afro-Brazilian faiths; rhythm and ancestry.') },
  { id: 'spiritist', name: l('Espírita', 'Spiritist'), hint: l('Caridade e serenidade; menos estresse.', 'Charity and serenity; less stress.') },
  { id: 'buddhist', name: l('Budista', 'Buddhist'), hint: l('Meditação e desapego.', 'Meditation and detachment.') },
  { id: 'hindu', name: l('Hindu', 'Hindu'), hint: l('Devoção, música sagrada e família.', 'Devotion, sacred music and family.') },
  { id: 'atheist', name: l('Ateu / agnóstico', 'Atheist / agnostic'), hint: l('Cético; afinidade com crítica e ciência.', 'Sceptical; affinity with critics and science.') },
  { id: 'none', name: l('Sem religião', 'No religion'), hint: l('Espiritualidade vaga ou nenhuma.', 'Vague spirituality or none.') },
];
export const polById = Object.fromEntries(POLS.map((x) => [x.id, x])) as Record<PolId, (typeof POLS)[number]>;
export const relById = Object.fromEntries(RELS.map((x) => [x.id, x])) as Record<RelId, (typeof RELS)[number]>;
/** Dica de efeitos mostrada na criação do personagem. */
export const POL_HINT: Record<PolId, L> = {
  left: l('Artistas engajados te adoram; censura e establishment, nem tanto.', 'Engaged artists love you; censors and the establishment less so.'),
  cleft: l('Boa convivência com cena alternativa e crítica.', 'Gets along with the alternative scene and critics.'),
  center: l('Sem inimigos de bandeira; sem aliados fervorosos.', 'No flag enemies; no fervent allies.'),
  cright: l('Bancos e rádios tradicionais confortáveis com você.', 'Banks and traditional radio are comfortable with you.'),
  right: l('Convites de empresários e do poder; atrito com artistas engajados.', 'Invitations from business and power; friction with engaged artists.'),
  apolitical: l('Fora da briga: nada de convites ou atritos políticos.', 'Out of the fight: no political invitations or friction.'),
};

const MARKET_REL: Record<MarketId, [RelId, number][]> = {
  br: [['catholic', 60], ['evangelical', 14], ['spiritist', 4], ['umbanda', 4], ['none', 6], ['atheist', 2], ['jewish', 1]],
  na: [['evangelical', 42], ['catholic', 22], ['jewish', 3], ['muslim', 1.5], ['buddhist', 1], ['none', 12], ['atheist', 3]],
  latam: [['catholic', 72], ['evangelical', 10], ['none', 5], ['atheist', 2], ['umbanda', 2], ['jewish', 1]],
  eu: [['catholic', 38], ['evangelical', 24], ['muslim', 4], ['jewish', 1.5], ['none', 14], ['atheist', 8]],
  asia: [['buddhist', 26], ['hindu', 22], ['muslim', 22], ['none', 14], ['atheist', 6], ['catholic', 4], ['evangelical', 3]],
  africa: [['muslim', 36], ['evangelical', 28], ['catholic', 14], ['umbanda', 12], ['none', 3], ['atheist', 1]],
  oceania: [['evangelical', 32], ['catholic', 22], ['none', 20], ['atheist', 8], ['buddhist', 2], ['hindu', 1], ['muslim', 1]],
};

const marketOfCity = (city: string | undefined): MarketId => CITIES.find((c) => c.id === city)?.market ?? 'na';

/** Peso da religião por época: secularização crescente e avanço evangélico no Brasil/América Latina. */
function relWeights(market: MarketId, year: number): [RelId, number][] {
  const t = clamp((year - 1950) / 75, 0, 1);
  return MARKET_REL[market].map(([id, w]) => {
    let x = w;
    if (id === 'none' || id === 'atheist') x *= 0.4 + 2.4 * t;
    if (id === 'evangelical' && (market === 'br' || market === 'latam' || market === 'africa')) x *= 0.25 + 2.2 * t;
    if (id === 'catholic' && (market === 'br' || market === 'latam')) x *= 1.15 - 0.45 * t;
    return [id, x];
  });
}

export function deriveViews(seed: string, id: string, o: { born?: number; year?: number; city?: string; genre?: string; engaged?: boolean }): Views {
  const r = Rng.fromSeed(`bel10:${seed}:${id}`);
  const year = o.year ?? 2000;
  const born = o.born ?? year - 35;
  const market = marketOfCity(o.city);
  const fam = o.genre ? familyOf(o.genre) : '';
  // religião
  const ws = relWeights(market, born + 20);
  if (fam === 'sacred') for (const w of ws) if (w[0] !== 'none' && w[0] !== 'atheist') w[1] *= 1.8;
  if (fam === 'hiphop' || fam === 'electronic') for (const w of ws) if (w[0] === 'none' || w[0] === 'atheist') w[1] *= 1.6;
  const tot = ws.reduce((a, [, w]) => a + w, 0);
  let x = r.next() * tot;
  let rel: RelId = ws[0][0];
  for (const [rid, w] of ws) { x -= w; if (x <= 0) { rel = rid; break; } }
  let dev = Math.round(clamp(r.normal(rel === 'none' ? 18 : rel === 'atheist' ? 55 : 50, 24), 0, 100));
  if (fam === 'sacred') dev = Math.round(clamp(dev + 22, 0, 100));
  // política
  const age = year - born;
  let ax = r.normal(0, 1.15) + clamp((age - 40) / 45, -0.4, 0.8);
  if (fam === 'hiphop' || fam === 'rock' || fam === 'country_folk') ax -= 0.35;
  if (fam === 'sacred' || fam === 'country_folk') ax += 0.3;
  if (rel === 'evangelical' && dev > 55) ax += 0.5;
  if (rel === 'atheist') ax -= 0.4;
  const pol: PolId = ax < -1.35 ? 'left' : ax < -0.5 ? 'cleft' : ax < 0.5 ? 'center' : ax < 1.35 ? 'cright' : 'right';
  let eng = Math.round(clamp(r.normal(32, 24) + (o.engaged ? 38 : 0) + (fam === 'hiphop' || fam === 'country_folk' ? 8 : 0), 0, 100));
  const apol = eng < 14 && r.chance(0.7);
  if (apol) eng = Math.min(eng, 12);
  return { pol: apol ? 'apolitical' : pol, eng, rel, dev };
}

interface BelState { player?: Views; stamp?: Record<string, number> }
const bs = (s: GameState): BelState => {
  const x = s.x4 as unknown as { beliefs10?: BelState };
  return (x.beliefs10 ??= {});
};

/** Visão do jogador: ficha de criação (ou derivada) com ajustes ao longo da vida. */
export function playerViews(s: GameState): Views {
  const b = bs(s);
  if (b.player) return b.player;
  const spec = s.config.character;
  const d = deriveViews(s.config.seed, 'player', { born: s.config.startYear - (spec?.age ?? 35), year: s.config.startYear, city: spec?.hometown ?? s.config.homeCity });
  const pol = (spec?.politics && polById[spec.politics as PolId] ? spec.politics : d.pol) as PolId;
  const rel = (spec?.religion && relById[spec.religion as RelId] ? spec.religion : d.rel) as RelId;
  b.player = { pol, eng: spec?.politics ? (pol === 'apolitical' ? 8 : Math.max(d.eng, 35)) : d.eng, rel, dev: spec?.religion ? Math.max(d.dev, 30) : d.dev };
  return b.player;
}

const cache = new Map<string, Views>();
function actOfPersonLite(s: GameState, pid: string): Act | undefined {
  for (const a of Object.values(s.acts)) if (a.members.includes(pid)) return a;
  return undefined;
}

/** Visão de qualquer pessoa (id de s.persons, equipe, executivo; 'player' = o jogador). */
export function viewsOf(s: GameState, id: string): Views {
  const p = s.persons[id];
  if (p?.isPlayer || id === 'player') return playerViews(s);
  const key = `${s.config.seed}|${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let v: Views;
  if (p) {
    const a = actOfPersonLite(s, id);
    v = deriveViews(s.config.seed, id, { born: p.born, year: s.year, city: a?.city, genre: a?.genre, engaged: p.traits.includes('engaged') });
  } else {
    v = deriveViews(s.config.seed, id, { year: s.year, city: s.config.homeCity });
  }
  if (cache.size > 30000) cache.clear(); // r15: teto maior (base grande esvaziava o cache todo mês)
  cache.set(key, v);
  return v;
}

/** Atualiza a visão do jogador (eventos pessoais, conversão, radicalização). */
export function shiftPlayerViews(s: GameState, d: { pol?: PolId; eng?: number; rel?: RelId; dev?: number }): void {
  const v = playerViews(s);
  if (d.pol) v.pol = d.pol;
  if (d.rel) v.rel = d.rel;
  if (d.eng) v.eng = clamp(v.eng + d.eng, 0, 100);
  if (d.dev) v.dev = clamp(v.dev + d.dev, 0, 100);
}

const religious = (v: Views): boolean => v.rel !== 'none' && v.rel !== 'atheist';

/** Afinidade entre duas visões: −1 (atrito) a +1 (afinidade). Pesa pelo engajamento e pela devoção. */
export function compatOf(a: Views, b: Views): number {
  let pol = 0;
  if (a.pol !== 'apolitical' && b.pol !== 'apolitical') {
    const d = Math.abs(polById[a.pol].axis - polById[b.pol].axis);
    const base = [1, 0.35, -0.3, -0.75, -1][d];
    pol = base * (Math.min(a.eng, b.eng) / 100) * 1.4;
  }
  let rel = 0;
  const wd = Math.min(a.dev, b.dev) / 100;
  if (a.rel === b.rel && religious(a)) rel = 0.9 * (0.4 + wd);
  else if (religious(a) && religious(b)) rel = -0.25 * wd - 0.05;
  else if (religious(a) !== religious(b)) rel = -0.7 * (Math.max(a.dev, b.dev) / 100) * (a.rel === 'atheist' || b.rel === 'atheist' ? 1 : 0.5);
  else if (a.rel === b.rel) rel = 0.3;
  return clamp(pol * 0.6 + rel * 0.5, -1, 1);
}

export function compat(s: GameState, a: string, b: string): number {
  return compatOf(viewsOf(s, a), viewsOf(s, b));
}

/** Rótulo curto "Centro-direita (62) · Católica (70)". */
export function viewsLabel(v: Views): L {
  const P = polById[v.pol];
  const R = relById[v.rel];
  return l(`${P.name.pt}${v.pol === 'apolitical' ? '' : ` (${v.eng})`} · ${R.name.pt}${v.rel === 'none' || v.rel === 'atheist' ? '' : ` (${v.dev})`}`, `${P.name.en}${v.pol === 'apolitical' ? '' : ` (${v.eng})`} · ${R.name.en}${v.rel === 'none' || v.rel === 'atheist' ? '' : ` (${v.dev})`}`);
}

export const isDevout = (v: Views, min = 60): boolean => religious(v) && v.dev >= min;
export const isPolitical = (v: Views, min = 65): boolean => v.pol !== 'apolitical' && v.eng >= min;
/** Religiões que desaprovam letras/capas provocativas. */
export const isStrict = (v: Views): boolean => isDevout(v, 55) && (v.rel === 'evangelical' || v.rel === 'catholic' || v.rel === 'muslim' || v.rel === 'hindu' || v.rel === 'jewish');
