// Matéria-prima por formato (rodada 13): cada material tem curva própria por época (o CD nasce caro e
// barateia; a fita encarece quando as fábricas fecham; o PVC sofre com o petróleo), serve a formatos
// específicos e o jogador escolhe o fornecedor/qualidade — barato (mais defeitos, devoluções, menos
// apelo), padrão ou premium (menos defeitos, apelo físico e valor de colecionador).

import { FORMATS } from '../../../data/rules';
import { l, type L } from '../../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../../ext4';
import type { GameState, Release } from '../../types';
import { fmtL, hasTech, money, notify, post, yearOfWeek } from '../../util';
import type { Material } from './state';

export type Grade = 'budget' | 'standard' | 'premium';
export const GRADES: Grade[] = ['budget', 'standard', 'premium'];
export const GRADE_FX: Record<Grade, { cost: number; defect: number; appeal: number; coll: number; name: L }> = {
  budget: { cost: 0.72, defect: 0.03, appeal: 0.97, coll: -1, name: l('Barato', 'Cheap') },
  standard: { cost: 1, defect: 0, appeal: 1, coll: 0, name: l('Padrão', 'Standard') },
  premium: { cost: 1.5, defect: -0.015, appeal: 1.03, coll: 1, name: l('Premium', 'Premium') },
};

/** Formatos que cada material atende. */
export const MAT_FORMATS: Record<Material, string[]> = { shellac: ['shellac'], vinyl: ['single45', 'lp'], tape: ['cassette'], polycarbonate: ['cd'], paper: ['shellac', 'single45', 'lp', 'cassette', 'cd'] };
const MAT_TECH: Partial<Record<Material, string[]>> = { vinyl: ['single45', 'lp'], tape: ['cassette'], polycarbonate: ['cd'] };
export const MAT_INFO: Record<Material, L> = {
  shellac: l('Discos de 78 rpm: pesados, quebradiços, dominantes até os anos 50.', '78 rpm records: heavy, brittle, dominant until the 1950s.'),
  vinyl: l('Compactos de 45 rpm e LPs. Derivado do petróleo: sofre com crises do óleo.', '45 rpm singles and LPs. Oil-based: hit by oil crises.'),
  tape: l('Fitas cassete: baratas no auge, caras quando as fábricas fecham.', 'Cassette tapes: cheap at their peak, pricey once factories close.'),
  polycarbonate: l('CDs: caros no lançamento, baratíssimos na escala dos anos 90.', 'CDs: expensive at launch, dirt cheap at 1990s scale.'),
  paper: l('Capas, encartes e envelopes de todos os formatos físicos.', 'Sleeves, inserts and jackets for every physical format.'),
};

/** Nome do fornecedor por material, grau e época (o que existia naquele ano). */
export function gradeName(m: Material, g: Grade, year: number): L {
  const N: Record<Material, Record<Grade, L>> = {
    shellac: { budget: l('Goma-laca com carga de pedra', 'Stone-filled shellac'), standard: l('Goma-laca comum', 'Regular shellac'), premium: l('Goma-laca laminada', 'Laminated shellac') },
    vinyl: { budget: year >= 1973 && year <= 1982 ? l('Vinil reciclado fino (pós-crise)', 'Thin recycled vinyl (post-crisis)') : l('Vinil reciclado', 'Recycled vinyl'), standard: l('Vinil comum', 'Regular vinyl'), premium: year >= 1990 ? l('Vinil virgem 180 g', '180 g virgin vinyl') : l('Vinil virgem', 'Virgin vinyl') },
    tape: { budget: l('Fita de ferro genérica', 'Generic ferric tape'), standard: l('Fita de ferro de marca', 'Branded ferric tape'), premium: year >= 1972 ? l('Fita de cromo (Tipo II)', 'Chrome tape (Type II)') : l('Fita de baixo ruído', 'Low-noise tape') },
    polycarbonate: { budget: l('Prensagem econômica', 'Budget pressing'), standard: l('Prensagem padrão', 'Standard pressing'), premium: year >= 1988 ? l('CD de ouro audiófilo', 'Audiophile gold CD') : l('Matriz de vidro premium', 'Premium glass master') },
    paper: { budget: l('Envelope simples', 'Plain sleeve'), standard: l('Capa impressa', 'Printed jacket'), premium: year >= 1955 ? l('Capa dupla com encarte', 'Gatefold with insert') : l('Álbum encadernado', 'Bound album') },
  };
  return N[m][g];
}

/** Material disponível no ano (nada do futuro aparece). */
export function matAvailable(s: GameState, m: Material): boolean {
  if (m === 'shellac') return s.year < 1962;
  const t = MAT_TECH[m];
  return !t || t.some((id) => hasTech(s, id));
}

/** Curva de preço por época (multiplicador alvo) + choques históricos. */
export function matTarget(m: Material, y: number): number {
  let v = 1;
  if (m === 'shellac') v = y < 1941 ? 1 : y <= 1946 ? 2.6 : 1 + Math.max(0, y - 1950) * 0.05;
  if (m === 'vinyl') {
    v = y < 1955 ? 1.2 : y < 1970 ? 1 : y < 1990 ? 0.92 : y < 2007 ? 1.2 : 1.1;
    if (y >= 1973 && y <= 1975) v *= 1.7; // choque do petróleo
    if (y >= 1979 && y <= 1981) v *= 1.35;
    if (y >= 2008 && y <= 2008) v *= 1.15;
    if (y >= 2018 && y <= 2022) v *= 1.4; // fila do renascimento do vinil
  }
  if (m === 'tape') v = y < 1972 ? 1.35 : y < 1990 ? 0.85 : y < 2000 ? 1 : 1.6;
  if (m === 'polycarbonate') {
    v = y < 1986 ? 2.1 : y < 1990 ? 1.4 : y < 2005 ? 0.75 : 0.9;
    if (y >= 1979 && y <= 1981) v *= 1.1;
    if (y >= 2005 && y <= 2008) v *= 1.25;
  }
  if (m === 'paper') v = y >= 1941 && y <= 1946 ? 1.5 : y >= 2021 && y <= 2022 ? 1.3 : 1;
  return v;
}

/** Por que o preço está assim neste ano (para a tela). */
export function matWhy(m: Material, y: number): L | null {
  if (m === 'shellac' && y >= 1941 && y <= 1946) return l('Guerra: goma-laca racionada.', 'War: shellac rationed.');
  if (m === 'shellac' && y > 1950) return l('Indústria migrando para o vinil: fornecedores somem.', 'Industry moving to vinyl: suppliers vanish.');
  if (m === 'vinyl' && y >= 1973 && y <= 1975) return l('Choque do petróleo: PVC disparou.', 'Oil shock: PVC soared.');
  if (m === 'vinyl' && y >= 1979 && y <= 1981) return l('Segundo choque do petróleo.', 'Second oil shock.');
  if (m === 'vinyl' && y >= 2018 && y <= 2022) return l('Renascimento do vinil: fila mundial nas prensas.', 'Vinyl revival: worldwide queues at the presses.');
  if (m === 'vinyl' && y >= 1990 && y < 2007) return l('Poucas prensas sobrando: vinil virou nicho.', 'Few presses left: vinyl went niche.');
  if (m === 'tape' && y >= 2000) return l('Fábricas de fita fechando.', 'Tape factories closing.');
  if (m === 'tape' && y < 1972) return l('Formato novo, escala pequena.', 'New format, small scale.');
  if (m === 'polycarbonate' && y < 1990) return l('Tecnologia nova: poucas fábricas de CD.', 'New technology: few CD plants.');
  if (m === 'polycarbonate' && y >= 1990 && y < 2005) return l('Escala gigante: CD baratíssimo de fabricar.', 'Huge scale: CDs dirt cheap to make.');
  if (m === 'polycarbonate' && y >= 2005 && y <= 2008) return l('Petróleo em alta encarece o policarbonato.', 'Pricey oil lifts polycarbonate.');
  if (m === 'paper' && y >= 2021) return l('Falta de papel pós-pandemia.', 'Post-pandemic paper shortage.');
  return null;
}

export interface Supply13 { grade: Partial<Record<Material, Grade>>; rel: Record<string, { c: number; a: number }>; collYear: number }
declare module '../../ext4' { interface Ext4 { supply13: Supply13 } }
registerExt4('supply13', () => ({ grade: {}, rel: {}, collYear: 0 }));
export function sup13(s: GameState): Supply13 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.supply13 ??= { grade: {}, rel: {}, collYear: 0 }) as Supply13;
  st.grade ??= {}; st.rel ??= {}; st.collYear ??= 0;
  return st;
}
export const gradeOf = (s: GameState, m: Material): Grade => sup13(s).grade[m] ?? 'standard';
export function setGrade(s: GameState, m: Material, g: Grade): L | null {
  if (!matAvailable(s, m)) return l('Material indisponível nesta época.', 'Material unavailable in this era.');
  sup13(s).grade[m] = g;
  return null;
}

/** Materiais usados por uma lista de formatos (papel entra em todo físico). */
export function matsOf(formats: string[]): Material[] {
  const phys = formats.filter((f) => FORMATS.find((x) => x.id === f)?.physical);
  if (!phys.length) return [];
  const out = new Set<Material>(['paper']);
  for (const f of phys) for (const m of Object.keys(MAT_FORMATS) as Material[]) if (m !== 'paper' && MAT_FORMATS[m].includes(f)) out.add(m);
  return [...out];
}

/** Multiplicador de custo de fabricação: preço de cada material dos formatos × grau escolhido. Papel pesa 15%. */
export function costFactor(s: GameState, formats: string[]): number {
  const mats = matsOf(formats);
  const core = mats.filter((m) => m !== 'paper');
  if (!core.length) return 1;
  const price = s.x4.industry.matPrice;
  const coreF = core.reduce((t, m) => t + price[m] * GRADE_FX[gradeOf(s, m)].cost, 0) / core.length;
  const paperF = price.paper * GRADE_FX[gradeOf(s, 'paper')].cost;
  return coreF * 0.85 + paperF * 0.15;
}

/** Variação da taxa de defeito pelos graus dos materiais do lançamento. */
export function gradeDefect(s: GameState, formats: string[]): number {
  const mats = matsOf(formats).filter((m) => m !== 'paper');
  return mats.length ? mats.reduce((t, m) => t + GRADE_FX[gradeOf(s, m)].defect, 0) / mats.length : 0;
}

/** Custo real por unidade (dólares do ano) de um formato com o grau atual. */
export function unitCostNow(s: GameState, formatId: string): number {
  const f = FORMATS.find((x) => x.id === formatId);
  if (!f?.physical) return 0;
  return money(s, f.unitCost * costFactor(s, [formatId])) / 100;
}

/** No lançamento: congela grau (apelo/colecionador) e cobra devoluções do lote barato. */
export function onGradeLaunch(s: GameState, rel: Release, defects: number): void {
  const mats = matsOf(rel.formats);
  if (!mats.length) return;
  const phys = rel.formats.filter((f) => FORMATS.find((x) => x.id === f)?.physical).length / Math.max(1, rel.formats.length);
  const a = mats.reduce((t, m) => t * Math.pow(GRADE_FX[gradeOf(s, m)].appeal, m === 'paper' ? 0.5 : 1), 1);
  const c = mats.reduce((t, m) => t + GRADE_FX[gradeOf(s, m)].coll, 0);
  sup13(s).rel[rel.id] = { c, a: 1 + (a - 1) * Math.max(0.4, phys) };
  const cheap = mats.filter((m) => gradeOf(s, m) === 'budget').length;
  if (cheap && defects > 0) {
    const cost = Math.round(defects * money(s, 0.6) * cheap);
    post(s, `ret13:${rel.id}`, -cost, 'release', `Devoluções ${rel.title}`);
    if (defects > 500) notify(s, fmtL(l('Lote barato de "{t}": {n} devoluções nas lojas.', 'Cheap batch of "{t}": {n} returns from stores.'), { t: rel.title, n: defects }), 'bad');
  }
}

registerMod('appeal', 'supply13:grade', (s, v, c) => {
  const x = c.release ? sup13(s).rel[c.release.id] : undefined;
  if (!x || Math.abs(x.a - 1) < 0.003) return null;
  return { value: v * x.a, label: x.a > 1 ? l('prensagem premium (o disco impressiona na mão)', 'premium pressing (the record impresses in hand)') : l('prensagem barata (chiado, capa frágil)', 'cheap pressing (crackle, flimsy sleeve)') };
});

/** Colecionadores: discos de prensagem premium ganham mercado de segunda mão anos depois. */
registerSimHook('year', 'supply13:collectors', (s) => {
  const st = sup13(s);
  let tot = 0;
  for (const [id, x] of Object.entries(st.rel)) {
    const rel = s.releases[id];
    if (!rel) { delete st.rel[id]; continue; }
    const age = s.year - yearOfWeek(s, rel.week);
    if (x.c <= 0 || age < 5) continue;
    tot += Math.round(money(s, 40) * x.c * Math.min(3, age / 10) * (rel.peak > 0 && rel.peak <= 20 ? 2 : 1));
  }
  st.collYear = tot;
  if (tot > 0) post(s, `coll13:${s.year}`, tot, 'asset_sales', 'Mercado de colecionadores');
});
