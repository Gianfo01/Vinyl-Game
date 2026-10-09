// Rodada 15: retratos coerentes. Artistas reais (modo nomes reais) usam o visual da fase atual mesmo antes
// do gancho mensal gravar; os demais seguem procedurais, mas com pele e sexo iguais aos da ficha (persona13).

import { realLook15 } from '../../data/looks15';
import { per13 } from '../../sim/sys/persona13';
import type { Appearance } from '../../sim/types';
import { randomLook, setLookResolver } from '../pixel/avatar';
import { fitLookToSex } from '../pixel/editor';
import { store } from '../store';

const CACHE = new Map<string, Appearance>();
let seedK = '';

setLookResolver((x) => {
  const s = store.game;
  const p = s?.persons[x.id];
  if (!s || !p || p.isPlayer) return undefined;
  if (s.config.realNames) { const r = realLook15(p.name, s.year); if (r) return r; }
  if (seedK !== String(s.config.seed)) { CACHE.clear(); seedK = String(s.config.seed); }
  let a = CACHE.get(x.id);
  if (a) return a;
  const P = per13(s, `p:${x.id}`);
  if (!P) return undefined;
  a = fitLookToSex({ ...randomLook(x.id), skin: P.skin }, P.sex);
  if (CACHE.size > 4000) CACHE.clear();
  CACHE.set(x.id, a);
  return a;
});
