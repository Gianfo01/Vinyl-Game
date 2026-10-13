// Rodada 29 — aplica o NÍVEL DOS RIVAIS escolhido na Nova run (dados em src/sim/rivals29data.ts) no gancho 'newgame',
// depois que o worldgen montou o mercado de sempre (a "mistura realista") e antes da situação inicial do jogador (start29,
// que escolhe os maiores rivais para guardar mágoa — já com o mercado no porte escolhido). Para cada selo rival ativo:
//  • caixa: multiplicador sobre o que a era e o porte já deram (escala relativa à economia da época — 1889 não ganha
//    cofres de 1990); os gigantes das eras antigas crescem menos e são menos (até 2 antes de 1920, 3 antes de 1950);
//  • reputação artística × comercial (guardada em x4.rivals29; a reputação única do selo vira a média — o hipster tem
//    prestígio alto e alcance baixo), porte (família A–D) e mercados (só a casa → região → mundo, até onde a era deixa);
//  • elenco e fama: corte do elenco (os famosos vão para o mercado livre) ou assinaturas extras dos nomes livres mais
//    famosos (o líder dominante absorve as estrelas que os pequenos soltaram);
//  • agressividade e perfil (arquétipo do rivals2 → temperamento do rivals27; estratégia de A&R; rivalmind18 lê a
//    agressividade);
//  • negócios rivais da sua carreira (ventures9.npc: estúdios, festivais, agências, editoras, mídia, plataformas), com a
//    reputação do nível — só os tipos que existem no ano de início.
// Selos não têm sede nem equipe próprias no modelo: o "porte" deles é a família e os mercados (escritórios por praça).
// RNG próprio (`rivals29:` + semente + nível): não mexe no sorteio da partida. Sem `config.rivals29` (ou "mistura
// realista") nada muda — valores-ouro intactos. Cenário histórico, "assumir gravadora" e um "Como começam" explícito das
// gravadoras (gigantes/novatas/aleatório/virado/todos iguais) têm precedência, como no start29.

import { Rng, clamp } from '../../core/rng';
import { MARKETS, cityById, familyOf, l, type MarketId } from '../../data/world';
import { registerSimHook } from '../ext4';
import { riv29ById, rivOf29, type RivDef29, type RivProf29, type Riv29 } from '../rivals29data';
import type { Act, GameState, Label } from '../types';
import { fmtL, nextId, remember } from '../util';
import { VKINDS, ventures, type VKind } from './ventures9';

export { RIVS29, riv29ById, rivOf29, setRivals29, statusLine29, statusLineOf29 } from '../rivals29data';

export interface Rivals29State {
  lv: Riv29;
  /** selo → [reputação artística, comercial] */
  rep: Record<string, [number, number]>;
  /** os grandes (gigantes / líder dominante) */
  big: string[];
  /** atos soltos no mercado e atos assinados a mais no começo; negócios rivais criados */
  out: number; in: number; ven: number;
}
/** Estado (só existe quando um nível foi escolhido; não é registrado no x4 para não mudar o mundo padrão). */
export const rivals29St = (s: GameState): Rivals29State | undefined => (s.x4 as unknown as { rivals29?: Rivals29State }).rivals29;

/** Reputação artística × comercial de um selo rival: a escolhida no começo ou, sem nível, derivada da reputação única e do
 *  perfil (indies de cena/boutique puxam para o artístico; majors e fábricas de hit, para o comercial). */
export function rivalRep29(s: GameState, lbId: string): { art: number; com: number } {
  const x = rivals29St(s)?.rep[lbId];
  if (x) return { art: x[0], com: x[1] };
  const lb = s.labels[lbId];
  if (!lb) return { art: 0, com: 0 };
  const a = lb.archetype ?? (lb.family === 'A' ? 'empire' : lb.family === 'B' ? 'scene_hunter' : lb.family === 'C' ? 'hitmaker' : 'catalog');
  const d = a === 'boutique' || a === 'scene_hunter' ? 8 : a === 'empire' || a === 'hitmaker' ? -8 : 0;
  return { art: clamp(lb.reputation + d, 0, 100), com: clamp(lb.reputation - d, 0, 100) };
}

/** Quantos "grandes" a era comporta (a indústria do disco de 1889 não tem cinco majors globais). */
export const eraBig29 = (year: number, n: number): number => Math.min(n, year < 1920 ? 2 : year < 1950 ? 3 : 5);
/** Quanto um multiplicador de crescimento vale na era (acima de 1 cresce menos nas eras antigas). */
export const eraGrow29 = (year: number, m: number): number => (m <= 1 ? m : 1 + (m - 1) * (year < 1920 ? 0.5 : year < 1950 ? 0.75 : 1));
/** Mercados que um selo "mundial" alcança na era. */
export function eraWorld29(year: number, home: MarketId): MarketId[] {
  const ids = year < 1920 ? ['na', 'eu'] : year < 1950 ? ['na', 'eu', 'latam', 'br'] : MARKETS.map((m) => m.id);
  return [...new Set([home, ...ids])] as MarketId[];
}
/** Carreira → negócio rival que disputa com ela (ventures9). */
const VKIND_OF: Record<string, VKind> = { festival: 'festival', publisher: 'publisher', studio: 'studio', booking: 'booking', media: 'media', platform: 'platform' };

const live29 = (a: Act | undefined): a is Act => !!a && (a.status === 'active' || a.status === 'emerging');
const strength = (lb: Label): number => lb.cash * (lb.reputation + 10);

function release(s: GameState, lb: Label, id: string): void {
  const a = s.acts[id];
  if (a?.contractId && s.contracts[a.contractId]?.party === lb.id) delete s.contracts[a.contractId]; // retcon do mundo: nunca assinou
  if (a && a.owner === lb.id) { a.owner = null; a.contractId = undefined; }
  lb.roster = lb.roster.filter((x) => x !== id);
}

function sign(s: GameState, r: Rng, lb: Label, a: Act): void {
  const id = nextId(s, 'k');
  s.contracts[id] = {
    id, actId: a.id, party: lb.id, model: 'classic', advance: 0, royalty: r.float(0.12, 0.2), termMonths: r.int(36, 84),
    startWeek: s.week - r.int(0, 100), endWeek: s.week + r.int(20, 300), releasesOwed: 4, releasesDone: 0, creativeControl: false,
    publishing: lb.family === 'D', share360: 0, recoupBalance: 0, promises: [],
  };
  a.owner = lb.id;
  a.contractId = id;
  lb.roster.push(a.id);
  if (a.status === 'emerging') a.status = 'active';
}

/** Alcance do elenco: fama × m (teto 95) e fãs na mesma curva do worldgen (10^(2 + fama/25)). */
function reach(s: GameState, lb: Label, m: number | undefined): void {
  if (!m || m === 1) return;
  for (const id of lb.roster) {
    const a = s.acts[id];
    if (!a) continue;
    const f0 = a.fame, f1 = clamp(f0 * m, 0, Math.max(95, f0));
    const k = Math.pow(10, (f1 - f0) / 25);
    a.fame = f1;
    a.fans = { casual: Math.round(a.fans.casual * k), active: Math.round(a.fans.active * k), core: Math.round(a.fans.core * k) };
  }
}

/** Aplica um perfil a um selo (sem o elenco extra, que vem depois, quando todo mundo já soltou o que ia soltar). */
function shape(s: GameState, r: Rng, lb: Label, p: RivProf29, st: Rivals29State): number {
  const y = Math.max(s.year, lb.founded);
  lb.cash = Math.max(0, Math.round(lb.cash * eraGrow29(y, p.cash)));
  const art = r.int(p.art[0], p.art[1]), com = r.int(p.com[0], p.com[1]);
  st.rep[lb.id] = [art, com];
  lb.reputation = Math.round((art + com) / 2);
  if (p.fam === 'down') { if (lb.family === 'A') lb.family = 'C'; } else if (p.fam) lb.family = p.fam;
  const home = (cityById[lb.city]?.market ?? 'na') as MarketId;
  if (p.terr === 'home') lb.territories = [home];
  else if (p.terr === 'region') lb.territories = [...new Set([home, 'na', 'eu'])] as MarketId[];
  else if (p.terr === 'grow') lb.territories = [...new Set([...lb.territories, home, 'na', 'eu'])] as MarketId[];
  else if (p.terr === 'world') lb.territories = eraWorld29(s.year, home);
  lb.aggression = clamp(lb.aggression * p.agg, 0.05, 0.98);
  if (p.arch) lb.archetype = r.pick(p.arch);
  if (p.strat) lb.strategy = r.pick(p.strat);
  // corte do elenco: os famosos (no hipster, quem já tem mais alcance do que talento) voltam ao mercado
  let out = 0;
  if (p.cap !== undefined && lb.roster.length > p.cap) {
    const acts = lb.roster.map((id) => s.acts[id]).filter((a): a is Act => !!a);
    const order = p.keep === 'pot' ? [...acts].sort((a, b) => b.potential - b.fame - (a.potential - a.fame) || a.id.localeCompare(b.id))
      : p.keep === 'rand' ? r.shuffle([...acts])
        : [...acts].sort((a, b) => a.fame - b.fame || a.id.localeCompare(b.id));
    for (const a of order.slice(p.cap)) { release(s, lb, a.id); out++; }
    lb.roster = lb.roster.filter((id) => s.acts[id]); // ids órfãos (sem ato) não contam
  }
  return out;
}

/** Assinaturas extras: os nomes livres mais famosos, com preferência pelo foco e pelo mercado do selo. */
function signExtra(s: GameState, r: Rng, lb: Label, n: number, pool: Act[]): number {
  if (n <= 0) return 0;
  const fams = new Set(lb.focus); // foco do selo = famílias de gênero (como no signToBestRival do worldgen)
  const mk = cityById[lb.city]?.market;
  const score = (a: Act) => a.fame * (fams.has(familyOf(a.genre)) ? 1.3 : 1) * (cityById[a.city]?.market === mk ? 1.2 : 1);
  let got = 0;
  for (let k = 0; k < n && pool.length; k++) {
    let bi = 0;
    for (let i = 1; i < pool.length; i++) if (score(pool[i]) > score(pool[bi])) bi = i;
    const a = pool.splice(bi, 1)[0];
    if (a.owner) continue;
    sign(s, r, lb, a);
    got++;
  }
  return got;
}

/** Aplica o nível ao estado novo (só no gancho 'newgame'). Devolve o resumo (testes e documentação). */
export function applyRivals29(s: GameState, d: RivDef29): Rivals29State {
  const cfg = s.config;
  const r = Rng.fromSeed(`rivals29:${cfg.seed}:${d.id}`);
  const st: Rivals29State = { lv: d.id, rep: {}, big: [], out: 0, in: 0, ven: 0 };
  (s.x4 as unknown as { rivals29?: Rivals29State }).rivals29 = st;
  const act = Object.values(s.labels).filter((x) => x.active).sort((a, b) => strength(b) - strength(a) || a.id.localeCompare(b.id));
  const nBig = d.big ? Math.min(act.length, eraBig29(s.year, d.big.n)) : 0;
  const big = act.slice(0, nBig), rest = act.slice(nBig);
  st.big = big.map((x) => x.id);
  // 1) porte, caixa, reputação, mercados, perfil — e o corte dos elencos (os pequenos soltam primeiro)
  for (const lb of rest) if (d.all) st.out += shape(s, r, lb, d.all, st);
  for (const lb of big) st.out += shape(s, r, lb, d.big!.p, st);
  // 2) assinaturas extras: os grandes escolhem primeiro (o líder absorve as estrelas soltas), depois os demais
  const pool = Object.values(s.acts).filter((a) => !a.owner && live29(a) && !a.playerBand && !s.knowledge[a.id]);
  for (const lb of big) st.in += signExtra(s, r, lb, d.big!.p.extra, pool);
  if (d.all?.extra) for (const lb of rest) st.in += signExtra(s, r, lb, d.all.extra, pool);
  // alcance de quem ficou (garagem encolhe, a máquina da major estica)
  for (const lb of rest) reach(s, lb, d.all?.fame);
  for (const lb of big) reach(s, lb, d.big!.p.fame);
  // 3) negócios rivais da sua carreira (os que já existem mudam de porte; novos abrem na sua praça)
  const vs = ventures(s);
  const repMul = d.all ? (d.all.art[0] + d.all.art[1] + d.all.com[0] + d.all.com[1]) / 4 / 52 : 1;
  for (const n of vs.npc) n.rep = clamp(Math.round(n.rep * (st.big.includes(n.labelId) ? 1.4 : repMul)), 0, 100);
  const kinds = [...new Set((cfg.careers?.main ?? []).map((c) => VKIND_OF[c]).filter((k): k is VKind => !!k && s.year >= VKINDS[k].from))];
  for (const kind of kinds) {
    const owners: [Label, number, number][] = [];
    if (d.ven.top && big[0]) for (let i = 0; i < d.ven.top[0]; i++) owners.push([big[0], d.ven.top[1], d.ven.top[1]]);
    const cands = [...big, ...rest];
    const pick = d.id === 'giants' || d.id === 'established' ? cands : r.shuffle([...rest.length ? rest : cands]);
    for (let i = 0; i < d.ven.n && pick.length; i++) owners.push([pick[i % pick.length], d.ven.rep[0], d.ven.rep[1]]);
    owners.forEach(([lb, lo, hi], i) => {
      if (vs.npc.some((n) => n.labelId === lb.id && n.kind === kind)) return;
      const city = i === 0 ? cfg.homeCity : cityById[lb.city] ? lb.city : cfg.homeCity;
      vs.npc.push({ kind, labelId: lb.id, name: `${lb.name} ${VKINDS[kind].name.pt}`, city, rep: r.int(lo, hi), y: s.year });
      st.ven++;
    });
  }
  remember(s, 'rivals29', fmtL(l('Nível dos rivais: {n}. {t}', 'Rival level: {n}. {t}'), { n: d.name, t: d.fx }), { important: true });
  return st;
}

registerSimHook('newgame', 'rivals29', (s) => {
  const cfg = s.config;
  const d = riv29ById(rivOf29(cfg));
  if (!d || d.id === 'mix' || cfg.scenario17 || cfg.takeover) return; // cenário histórico e "assumir gravadora" têm o próprio mundo
  if (cfg.labels?.start && cfg.labels.start !== 'history') return; // "Como começam" explícito das gravadoras manda
  applyRivals29(s, d);
});
