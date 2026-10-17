// R33 · CATÁLOGO — CATÁLOGO QUE REAPARECE (`exp33.resurface`, desligado).
// Uma faixa antiga do seu catálogo (10+ anos, mesma regra do sucesso tardio) toca num filme (1930+), numa novela (1965+,
// só no Brasil e na América Latina; fora deles, série de TV 1955+), num comercial de TV (1950+) ou num vídeo curto
// (TikTok e afins, 2019+). Efeito:
//  • cachê de sincronização (só quando o master é seu);
//  • calor no motor de sucesso tardio (sys/revival19 · stage19): a faixa pode explodir de novo e o resto é com ele;
//  • notícia pública e uma linha na vitrine (`resurfaced33` = o gancho que a vitrine lê).
// LIGAÇÃO COM pop31 (dividido com a MUNDO, funções separadas): o veículo usa o nome de um filme/série/novela de
// `POP31` ativo no ano, quando houver (só leitura; os memes e bolhas com efeito econômico são da MUNDO).

import { clamp } from '../../core/rng';
import { POP31, type PopKind31 } from '../../data/pop31';
import { cityById, l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { oldRel19, stage19, type RK19 } from '../sys/revival19';
import { releasesNow27 } from '../tickcache27';
import type { GameState, Release } from '../types';
import { fmtL, money, post } from '../util';
import { cat33, log33, on33, peek33, rng33, type Resurf33 } from './cat33';

const ON = 'exp33.resurface' as const;
export const RESURF_P33 = 0.05;
/** calor a mais (além do calor do tipo de uso no revival19) */
export const RESURF_HEAT33 = 12;

type K33 = Exclude<Resurf33['k'], 'tribute'>;
export const RESURF_K33: Record<K33, { name: L; from: number; rk: RK19; fee: number; pop: PopKind31[] }> = {
  film: { name: l('filme', 'film'), from: 1930, rk: 'film', fee: 3000, pop: ['filme'] },
  novela: { name: l('novela', 'soap opera'), from: 1965, rk: 'series', fee: 2000, pop: ['brasil'] },
  series: { name: l('série de TV', 'TV series'), from: 1955, rk: 'series', fee: 2500, pop: ['serie'] },
  tv_ad: { name: l('comercial de TV', 'TV ad'), from: 1950, rk: 'tv_ad', fee: 4000, pop: [] },
  short: { name: l('vídeo curto viral', 'viral short video'), from: 2019, rk: 'short', fee: 600, pop: [] },
};

const homeMk = (s: GameState): string => cityById[s.config.homeCity]?.market ?? 'na';

/** Veículos possíveis neste ano e mercado. */
export function vehicles33(s: GameState): K33[] {
  const lat = homeMk(s) === 'br' || homeMk(s) === 'latam';
  return (Object.keys(RESURF_K33) as K33[]).filter((k) => s.year >= RESURF_K33[k].from && (k === 'novela' ? lat : k === 'series' ? !lat || s.year < 1965 : true));
}

/** Nome do veículo: um título de pop31 ativo no ano (nome real; a troca por homenagem é da exibição) ou o genérico. */
export function vehicleName33(s: GameState, k: K33, pick: number): L {
  const kinds = RESURF_K33[k].pop;
  const pool = POP31.filter((p) => kinds.includes(p.kind) && s.year >= p.y0 && s.year <= p.y1 && p.refs.length);
  if (!pool.length) return RESURF_K33[k].name;
  const p = pool[Math.floor(pick * pool.length) % pool.length];
  const n = p.refs[0][0];
  return fmtL(l('{k} "{n}"', '{k} "{n}"'), { k: RESURF_K33[k].name, n });
}

/** Usos recentes (a vitrine mostra "tocou em…"). */
export const resurfaced33 = (s: GameState, weeks = 26): Resurf33[] => (peek33(s)?.rs ?? []).filter((x) => s.week - x.w <= weeks);

/** Faz uma faixa reaparecer (também serve de gancho: agência de publicidade / estúdio de TV da INT-2 podem chamar). */
export function resurface33(s: GameState, rel: Release, k: K33, pick = 0): Resurf33 | null {
  if (!on33(s, ON) || !oldRel19(s, rel)) return null;
  const st = cat33(s);
  const name = vehicleName33(s, k, pick);
  const fee = rel.owner === 'player' ? money(s, Math.round(RESURF_K33[k].fee * clamp(0.5 + rel.q / 100, 0.6, 1.5))) : 0;
  if (fee) post(s, `rs33:${rel.id}:${k}`, fee, 'sync', `Sincronização: ${rel.title}`);
  const x: Resurf33 = { rel: rel.id, k, name, w: s.week, fee };
  st.rs.push(x);
  if (st.rs.length > 24) st.rs.splice(0, st.rs.length - 24);
  const tx = fmtL(l('"{t}" ({y}), de {a}, toca em {v} e volta a ser procurada.', '"{t}" ({y}) by {a} plays in {v} and is sought again.'), { t: rel.title, y: rel.year, a: s.acts[rel.actId]?.name ?? '?', v: name });
  emitFact(s, { kind: 'culture33', actors: [rel.actId, 'player'], severity: 25, visibility: 'public', tags: ['resurf33', k, 'good'], src: 'resurf33', data: { rel: rel.id }, text: tx, notify: 'good' });
  log33(s, tx);
  stage19(s, rel.id, RESURF_K33[k].rk, RESURF_HEAT33);
  return x;
}

registerSimHook('month', 'resurf33', (s) => {
  if (!on33(s, ON)) return;
  const r = rng33(s, 'rs');
  if (!r.chance(RESURF_P33)) return;
  const rels = releasesNow27(s).filter((x) => x.owner === 'player' && oldRel19(s, x));
  const ks = vehicles33(s);
  if (!rels.length || !ks.length) return;
  // mais vendido e melhor = mais chance (a música que as pessoas lembram)
  const w = rels.map((x) => Math.sqrt(Math.max(1, x.totalUnits)) * (0.5 + x.q / 100));
  let k = r.next() * w.reduce((a, b) => a + b, 0), i = 0;
  for (; i < rels.length - 1; i++) { k -= w[i]; if (k <= 0) break; }
  resurface33(s, rels[i], r.pick(ks), r.next());
});

/** QA33 · homenagem póstuma (PESSOAS, exp33.life) → catálogo que reaparece: a melhor faixa antiga do ato volta à vitrine
 *  (documentário de homenagem, sem cachê), com notícia e calor no sucesso tardio. Só com `exp33.resurface`. O disparo de
 *  vendas do catálogo continua o da PESSOAS (devolve false): aqui é a vitrine e o revival19. */
export function tribute33(s: GameState, actId: string): boolean {
  if (!on33(s, ON)) return false;
  const rels = releasesNow27(s).filter((x) => x.actId === actId && oldRel19(s, x)).sort((a, b) => b.totalUnits - a.totalUnits || (a.id < b.id ? -1 : 1));
  const rel = rels[0];
  if (!rel) return false;
  const st = cat33(s);
  if (st.rs.some((x) => x.rel === rel.id && x.k === 'tribute')) return false;
  const name = l('homenagem póstuma', 'posthumous tribute');
  st.rs.push({ rel: rel.id, k: 'tribute', name, w: s.week, fee: 0 });
  if (st.rs.length > 24) st.rs.splice(0, st.rs.length - 24);
  const tx = fmtL(l('Homenagem: "{t}" ({y}), de {a}, volta a tocar em toda parte.', 'Tribute: "{t}" ({y}) by {a} is playing everywhere again.'), { t: rel.title, y: rel.year, a: s.acts[rel.actId]?.name ?? '?' });
  emitFact(s, { kind: 'culture33', actors: [rel.actId], severity: 25, visibility: 'public', tags: ['resurf33', 'tribute'], src: 'resurf33', data: { rel: rel.id }, text: tx });
  log33(s, tx);
  stage19(s, rel.id, 'doc', RESURF_HEAT33);
  return false;
}
