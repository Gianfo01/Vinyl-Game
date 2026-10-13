// Rodada 15: retratos coerentes. Artistas reais (modo nomes reais) usam o visual da fase atual mesmo antes
// do gancho mensal gravar; os demais seguem procedurais, mas com pele e sexo iguais aos da ficha (persona13).

import { realLook15 } from '../../data/looks15';
import { per13 } from '../../sim/sys/persona13';
import type { Appearance } from '../../sim/types';
import { randomLook, setLookResolver } from '../pixel/avatar';
import { fitLookToSex } from '../pixel/editor';
import { flavor27 } from '../pixel/looks27';
import { familyOf } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { store } from '../store';
import type { Act, GameState } from '../../sim/types';

// rodada 27: índice pessoa → ato (gênero/cidade pesam no visual procedural), refeito a cada semana
let IDX_K = '';
let IDX = new Map<string, Act>();
function actOf27(s: GameState, id: string): Act | undefined {
  const k = `${s.config.seed}|${s.week}|${Object.keys(s.acts).length}`;
  if (k !== IDX_K) {
    IDX = new Map();
    for (const a of Object.values(s.acts)) for (const m of a.members) if (!IDX.has(m) || a.owner === 'player') IDX.set(m, a);
    IDX_K = k;
  }
  return IDX.get(id);
}

const CACHE = new Map<string, Appearance>();
let seedK = '';

setLookResolver((x) => {
  const s = store.game;
  const p = s?.persons[x.id];
  if (!s || !p || p.isPlayer) return undefined;
  if (s.config.realNames) { const r = realLook15(p.name, s.year); if (r) return r; }
  if (seedK !== String(s.config.seed)) { CACHE.clear(); seedK = String(s.config.seed); }
  const ck = `${x.id}|${Math.floor(s.year / 10)}`; // rodada 27: a moda muda por década
  let a = CACHE.get(ck);
  if (a) return a;
  const P = per13(s, `p:${x.id}`);
  if (!P) return undefined;
  a = fitLookToSex({ ...randomLook(x.id), skin: P.skin }, P.sex);
  // rodada 27: tempero por época, gênero e região (cabelo, roupa, chapéu, colar, instrumento…)
  const act = actOf27(s, x.id);
  a = flavor27(a, x.id, { year: s.year, family: act ? familyOf(act.genre) : undefined, genre: act?.genre, country: act ? countryOfCity(act.city) : null, sex: P.sex, role: p.role });
  if (CACHE.size > 4000) CACHE.clear();
  CACHE.set(ck, a);
  return a;
});
