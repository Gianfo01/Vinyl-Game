// Modo livre (rodada 9): subgêneros gerados proceduralmente. Nascem numa cena forte (cidade × gênero),
// com nome, instrumentação (timbres), cidade de origem e regras sobre os eixos do som; depois se espalham
// pelos atos da mesma família, que aprendem uns com os outros (o perfil do subgênero deriva um pouco
// a cada adoção). É uma camada leve: etiqueta atos e lançamentos e puxa o som de quem adota.

import type { Rng } from '../../../core/rng';
import { cityById, familyOf, genreById, l, type FamilyId, type L } from '../../../data/world';
import type { Act, GameState } from '../../types';
import type { AxisPull } from './moments';
import { TIMBRES } from './timbre';

export interface SubGenre {
  id: string;
  name: L;
  base: string;
  fam: FamilyId;
  city: string;
  born: number;
  inst: string[];
  pull: AxisPull;
  /** 0–100: quanto da família já adotou */
  spread: number;
  acts: string[];
  /** lançamentos etiquetados */
  rels: number;
  /** quantas vezes o perfil mudou por aprendizado */
  gen: number;
}
export interface SubStore { list: SubGenre[]; adopt: Record<string, string> }

const AX: (keyof AxisPull)[] = ['en', 'de', 'el', 'vo', 'po', 'ex', 'me', 'gl', 'tr'];
const AX_LABEL: Record<string, [L, L]> = {
  en: [l('calma', 'calm'), l('explosiva', 'explosive')], de: [l('espaçosa', 'sparse'), l('em camadas', 'layered')],
  el: [l('acústica', 'acoustic'), l('eletrônica', 'electronic')], vo: [l('instrumental', 'instrumental'), l('vocal', 'vocal-led')],
  po: [l('crua', 'raw'), l('polida', 'polished')], ex: [l('clássica', 'classic'), l('experimental', 'experimental')],
  me: [l('melancólica', 'melancholic'), l('eufórica', 'euphoric')], gl: [l('local', 'local'), l('global', 'global')],
  tr: [l('tradicional', 'traditional'), l('de ruptura', 'rupturist')],
};
const PRE: [string, string][] = [['Neo', 'Neo'], ['Pós', 'Post'], ['Nova Onda de', 'New Wave'], ['Contra', 'Counter']];
const SUF: [string, string][] = [['de Garagem', 'Garage'], ['Noturno', 'Night'], ['de Rua', 'Street'], ['Lunar', 'Lunar'], ['Cru', 'Raw'], ['Tropical', 'Tropical'], ['de Quintal', 'Backyard'], ['Elétrico', 'Electric']];

export const subStore = (raw: Partial<SubStore> | undefined): SubStore => {
  const st = (raw ?? {}) as SubStore;
  st.list ??= [];
  st.adopt ??= {};
  return st;
};

const free = (a: Act) => (a.status === 'active' || a.status === 'emerging') && !a.deceased;

/** Descrição das regras do subgênero (eixos mais fortes + instrumentação). */
export function subRules(sub: SubGenre): L {
  const ax = (Object.entries(sub.pull) as [string, number][]).filter(([, v]) => Math.abs(v) >= 8).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
  const rules = ax.map(([k, v]) => AX_LABEL[k][v > 0 ? 1 : 0]);
  const inst = sub.inst.map((id) => TIMBRES.find((t) => t.id === id)?.name).filter((x): x is L => !!x);
  const j = (xs: L[], k: 'pt' | 'en') => xs.map((x) => x[k]).join(', ');
  return l(`${j(rules, 'pt')}; com ${j(inst, 'pt')}`, `${j(rules, 'en')}; with ${j(inst, 'en')}`);
}

function spawn(s: GameState, r: Rng, st: SubStore, key: string): SubGenre | null {
  const [city, genre] = key.split(':');
  const g = genreById[genre];
  if (!g || !cityById[city] || st.list.some((x) => x.city === city && x.base === genre)) return null;
  const fam = familyOf(genre);
  const pre = r.chance(0.5);
  const d = r.pick(pre ? PRE : SUF);
  const name = pre ? l(`${d[0]} ${g.name.pt}`, `${d[1]} ${g.name.en}`) : l(`${g.name.pt} ${d[0]}`, `${g.name.en} ${d[1]}`);
  const opts = TIMBRES.filter((t) => (t.from ?? 0) <= s.year && (t.fam?.includes(fam) ?? false));
  const inst = r.shuffle([...opts]).slice(0, 2).map((t) => t.id);
  const pull: AxisPull = {};
  for (const k of r.shuffle([...AX]).slice(0, 3)) pull[k] = (r.chance(0.5) ? 1 : -1) * r.int(9, 20);
  const sub: SubGenre = { id: `sub${st.list.length + 1}_${s.year}`, name, base: genre, fam, city, born: s.year, inst, pull, spread: 0, acts: [], rels: 0, gen: 0 };
  st.list.push(sub);
  return sub;
}

function adopt(st: SubStore, sub: SubGenre, a: Act, r: Rng): void {
  if (st.adopt[a.id]) return;
  st.adopt[a.id] = sub.id;
  sub.acts.push(a.id);
  // aprendizado: o perfil do subgênero deriva um pouco a cada nova adoção
  const k = r.pick(AX);
  if (sub.acts.length > 1) { sub.pull[k] = (sub.pull[k] ?? 0) + r.int(-3, 3); sub.gen += 1; }
}

/** Passo mensal: nascimento numa cena forte e difusão entre os atos da família. Devolve subgêneros novos. */
export function subMonth(s: GameState, r: Rng, st: SubStore): SubGenre[] {
  const born: SubGenre[] = [];
  const scenes = Object.entries(s.scenes).filter(([, v]) => v >= 2.5).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (st.list.length < 40) {
    for (const [key] of scenes) {
      if (!r.chance(0.04)) continue;
      const sub = spawn(s, r, st, key);
      if (!sub) continue;
      const seeds = Object.values(s.acts).filter((a) => free(a) && a.city === sub.city && familyOf(a.genre) === sub.fam).sort((a, b) => b.momentum - a.momentum).slice(0, 2);
      for (const a of seeds) adopt(st, sub, a, r);
      if (sub.acts.length) born.push(sub);
      else st.list.pop();
    }
  }
  for (const sub of st.list) {
    sub.acts = sub.acts.filter((id) => s.acts[id] && free(s.acts[id]));
    const pool = Object.values(s.acts).filter((a) => free(a) && familyOf(a.genre) === sub.fam);
    // quem já adotou ensina: vizinhos de cidade adotam mais fácil; os de fora, raramente
    for (let i = 0; i < sub.acts.length && i < 4; i++) {
      if (!r.chance(0.12)) continue;
      const teacher = s.acts[sub.acts[i]];
      const cand = pool.filter((a) => !st.adopt[a.id]);
      const near = cand.filter((a) => a.city === teacher.city);
      const pick = near.length && r.chance(0.8) ? r.pick(near) : cand.length && r.chance(0.25) ? r.pick(cand) : undefined;
      if (pick) adopt(st, sub, pick, r);
    }
    sub.spread = Math.min(100, Math.round((sub.acts.length / Math.max(8, pool.length)) * 300));
  }
  for (const [id, sid] of Object.entries(st.adopt)) if (!s.acts[id] || !st.list.some((x) => x.id === sid)) delete st.adopt[id];
  return born;
}

export function subOf(st: SubStore, actId: string): SubGenre | undefined {
  const id = st.adopt[actId];
  return id ? st.list.find((x) => x.id === id) : undefined;
}
