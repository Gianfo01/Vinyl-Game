// Projeto musical mais fundo (rodada 13): mistura de dois conceitos (sinergia/choque explicados),
// local de gravação, estratégia de singles, edição (deluxe/limitada/box), direção de arte da capa,
// divisão da verba (gravação/divulgação/embalagem) e polimento contra prazo. Tudo por época e tudo
// entra nos canais que já existem: atributos das faixas (gravação), apelo do lançamento, hype do
// próximo disco, momento do artista, custo do projeto e valor de colecionador da prensagem.

import { Rng, clamp, seedState } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { forecastUnits } from '../market';
import type { GameState, Release, Song } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { addHype } from './hype12';
import { sup13 } from './industry/supply13';
import { capDeltas, songRec, syncSong, type Deltas } from './music/state';
import { CONCEPTS, conceptById, openProjects, proj8, projectQ, projectStage, type MusicProject } from './project8';
import { INTENTS, planOf12 } from './project12';

export type Loc = 'label' | 'live' | 'legendary' | 'retreat' | 'abroad' | 'home';
export type Single = 'none' | 'focus' | 'lead' | 'two' | 'surprise';
export type Edition = 'standard' | 'deluxe' | 'limited' | 'box';
export type Art = 'photo' | 'illustrated' | 'minimal' | 'provocative' | 'famous';

interface Opt { name: L; fx: L; from: number; cost: number }
export const LOCS: Record<Loc, Opt & { d: Deltas; weeks: number; hype: number }> = {
  label: { name: l('Estúdio de sempre', 'The usual studio'), fx: l('Sem custo extra nem surpresa.', 'No extra cost, no surprises.'), from: 0, cost: 0, d: {}, weeks: 0, hype: 0 },
  live: { name: l('Ao vivo no estúdio', 'Live in the studio'), fx: l('Banda tocando junta: performance +4, produção −2.', 'Band playing together: performance +4, production −2.'), from: 1950, cost: 0, d: { performance: 4, production: -2 }, weeks: 0, hype: 0 },
  legendary: { name: l('Estúdio lendário da capital', 'The capital\'s legendary studio'), fx: l('Produção +3, performance +1; a imprensa comenta (hype +5); +1 semana de agenda.', 'Production +3, performance +1; the press talks (hype +5); +1 week of booking.'), from: 1960, cost: 6000, d: { production: 3, performance: 1 }, weeks: 1, hype: 5 },
  retreat: { name: l('Retiro no campo', 'Countryside retreat'), fx: l('Originalidade +3, letra +2; inspiração +15 e estresse −15 na banda; +3 semanas.', 'Originality +3, lyrics +2; inspiration +15 and stress −15 for the band; +3 weeks.'), from: 1968, cost: 9000, d: { originality: 3, lyrics: 2 }, weeks: 3, hype: 0 },
  abroad: { name: l('Gravar no exterior', 'Record abroad'), fx: l('Produção +2, originalidade +2; história para a imprensa (hype +6); +2 semanas.', 'Production +2, originality +2; a story for the press (hype +6); +2 weeks.'), from: 1975, cost: 14000, d: { production: 2, originality: 2 }, weeks: 2, hype: 6 },
  home: { name: l('Em casa (gravador multipista)', 'At home (multitrack recorder)'), fx: l('Barato e livre: originalidade +3, produção −3; −1 semana.', 'Cheap and free: originality +3, production −3; −1 week.'), from: 1980, cost: 0, d: { originality: 3, production: -3 }, weeks: -1, hype: 0 },
};
export const SINGLES: Record<Single, Opt & { appeal: number; hype: number }> = {
  none: { name: l('Sem single antes', 'No single first'), fx: l('Ninguém ouviu nada antes: apelo ×0,96.', 'Nobody heard anything first: appeal ×0.96.'), from: 0, cost: 0, appeal: 0.96, hype: 0 },
  focus: { name: l('Faixas de trabalho no rádio', 'Focus tracks to radio'), fx: l('O padrão do mercado: sem custo nem bônus.', 'The market default: no cost, no bonus.'), from: 0, cost: 0, appeal: 1, hype: 0 },
  lead: { name: l('Single de trabalho antes', 'Lead single first'), fx: l('Apelo ×1,06, hype +7.', 'Appeal ×1.06, hype +7.'), from: 1955, cost: 1500, appeal: 1.06, hype: 7 },
  two: { name: l('Dois singles antes', 'Two singles first'), fx: l('Apelo ×1,08, hype +9 — se o artista tem alcance 30+; senão o segundo passa batido (×1,04).', 'Appeal ×1.08, hype +9 — if the act has 30+ reach; otherwise the second goes unnoticed (×1.04).'), from: 1965, cost: 3000, appeal: 1.08, hype: 9 },
  surprise: { name: l('Lançamento surpresa', 'Surprise drop'), fx: l('Sem aviso (hype −10). Com alcance 55+, vira evento (apelo ×1,12); sem isso, some (×0,88).', 'No warning (hype −10). With 55+ reach it becomes an event (appeal ×1.12); without it, it vanishes (×0.88).'), from: 2013, cost: 0, appeal: 1, hype: -10 },
};
export const EDITIONS: Record<Edition, Opt & { appeal: number; coll: number; hype: number }> = {
  standard: { name: l('Edição normal', 'Standard edition'), fx: l('Só o disco.', 'Just the record.'), from: 0, cost: 0, appeal: 1, coll: 0, hype: 0 },
  deluxe: { name: l('Deluxe (capa dupla, encarte)', 'Deluxe (gatefold, booklet)'), fx: l('Apelo ×1,03; colecionador +1.', 'Appeal ×1.03; collector +1.'), from: 1960, cost: 3000, appeal: 1.03, coll: 1, hype: 0 },
  limited: { name: l('Tiragem limitada numerada', 'Numbered limited run'), fx: l('Apelo ×1,02; hype +5 (corrida às lojas); colecionador +2.', 'Appeal ×1.02; hype +5 (store rush); collector +2.'), from: 1975, cost: 2500, appeal: 1.02, coll: 2, hype: 5 },
  box: { name: l('Box de colecionador', 'Collector box set'), fx: l('Só álbum. Apelo ×1,02; colecionador +3 (rende por décadas).', 'Albums only. Appeal ×1.02; collector +3 (pays for decades).'), from: 1988, cost: 8000, appeal: 1.02, coll: 3, hype: 0 },
};
export const ARTS: Record<Art, Opt & { appeal: number; coll: number; hype: number }> = {
  photo: { name: l('Retrato do artista', 'Portrait of the act'), fx: l('Seguro; ×1,03 se o conceito é cartão de visitas.', 'Safe; ×1.03 if the concept is a calling card.'), from: 0, cost: 0, appeal: 1, coll: 0, hype: 0 },
  illustrated: { name: l('Ilustração', 'Illustration'), fx: l('Apelo ×1,01; colecionador +1.', 'Appeal ×1.01; collector +1.'), from: 0, cost: 800, appeal: 1.01, coll: 1, hype: 0 },
  minimal: { name: l('Minimalista', 'Minimalist'), fx: l('Crítica gosta (×1,03 com público crítico); para o resto, ×0,99.', 'Critics like it (×1.03 with a critics audience); for others, ×0.99.'), from: 1965, cost: 300, appeal: 1, coll: 0, hype: 0 },
  provocative: { name: l('Provocativa', 'Provocative'), fx: l('Hype +8 e apelo ×1,05 — mas lojas podem recusar a capa (×0,88). Risco maior antes de 1995.', 'Hype +8 and appeal ×1.05 — but stores may refuse the cover (×0.88). Higher risk before 1995.'), from: 1967, cost: 600, appeal: 1.05, coll: 1, hype: 8 },
  famous: { name: l('Artista plástico famoso', 'Famous visual artist'), fx: l('Apelo ×1,04, hype +4, colecionador +2.', 'Appeal ×1.04, hype +4, collector +2.'), from: 1966, cost: 5000, appeal: 1.04, coll: 2, hype: 4 },
};

interface Blend { k: 'syn' | 'clash' | 'neutral'; name: L; why: L; appeal: number; d: Deltas; hype: number }
const B = (k: Blend['k'], name: L, why: L, appeal: number, d: Deltas = {}, hype = 0): Blend => ({ k, name, why, appeal, d, hype });
const BLENDS: Record<string, Blend> = {
  'debut+radio': B('syn', l('Estreia com cara de hit', 'A debut that sounds like a hit'), l('Apresentar o artista com refrões fortes: o rádio adora rosto novo.', 'Introducing the act with big choruses: radio loves a new face.'), 1.06, { melody: 1 }, 4),
  'art+reinvent': B('syn', l('Ruptura total', 'Total rupture'), l('Mudar de pele com ambição artística: a imprensa fica curiosa.', 'Changing skin with artistic ambition: the press gets curious.'), 1, { originality: 4 }, 3),
  'art+roots': B('syn', l('Raiz autoral', 'Rooted statement'), l('A cidade vira tema de obra: letra e identidade se reforçam.', 'The city becomes the subject of a statement: lyrics and identity reinforce each other.'), 1.03, { lyrics: 2, originality: 1 }),
  'budget+roots': B('syn', l('Lo-fi honesto', 'Honest lo-fi'), l('Gravação crua combina com disco de cena: soa verdadeiro.', 'Raw recording suits a scene record: it sounds true.'), 1.03, { performance: 2 }),
  'debut+roots': B('syn', l('Filho da cena', 'Child of the scene'), l('Apresentar o artista pela cidade dele cria base fiel.', 'Introducing the act through its city builds a loyal base.'), 1.04, { performance: 1 }),
  'art+radio': B('clash', l('Arte ou rádio?', 'Art or radio?'), l('O rádio acha estranho e a crítica acha comercial: ninguém compra a proposta inteira.', 'Radio finds it odd and critics find it commercial: nobody buys the whole pitch.'), 0.93, { originality: -1, melody: -1 }),
  'budget+radio': B('clash', l('Hit sem verba', 'A hit on a shoestring'), l('Rádio exige brilho de produção que o orçamento enxuto não paga.', 'Radio demands production gloss a lean budget cannot buy.'), 0.94, { production: -2 }),
  'budget+reinvent': B('clash', l('Reinvenção de bolso', 'Pocket reinvention'), l('Som novo pede tempo de estúdio; pressa barata soa inacabada.', 'A new sound needs studio time; cheap haste sounds unfinished.'), 0.95, { production: -3 }),
  'debut+reinvent': B('clash', l('Reinventar o quê?', 'Reinvent what?'), l('Ninguém conhece a pele antiga: a mudança não tem contraste.', 'Nobody knows the old skin: the change has no contrast.'), 0.92),
  'art+budget': B('clash', l('Obra-prima apressada', 'A rushed masterpiece'), l('Ambição grande, estúdio pequeno: ideias boas, acabamento fraco.', 'Big ambition, small studio: good ideas, weak finish.'), 0.96, { production: -2, originality: 1 }),
};
export function blendOf(c1: string, c2?: string): Blend | null {
  if (!c2 || c2 === c1 || !conceptById[c2]) return null;
  const key = [c1, c2].sort().join('+');
  return BLENDS[key] ?? B('neutral', l('Mistura sem química forte', 'A blend without strong chemistry'), l('Os dois conceitos convivem, mas o foco se dilui um pouco.', 'The two concepts coexist, but focus thins a little.'), 0.99);
}
/** Sinergias e choques de um conceito (para explicar antes de escolher). */
export function blendHints(c1: string): { c2: string; b: Blend }[] {
  return CONCEPTS.filter((c) => c.id !== c1).map((c) => ({ c2: c.id, b: blendOf(c1, c.id)! })).filter((x) => x.b.k !== 'neutral');
}

export interface Plan13 { c2?: string; loc: Loc; single: Single; ed: Edition; art: Art; split: [number, number, number]; polish: number; paid: number; dw: number; dl?: number; locFx?: Loc; hyped?: 1; fx?: 1; ban?: 0 | 1 }
export type Choice13 = Omit<Plan13, 'paid' | 'dw' | 'dl' | 'locFx' | 'hyped' | 'fx' | 'ban'>;
export interface Proj13State { meta: Record<string, Plan13> }
declare module '../ext4' { interface Ext4 { proj13: Proj13State } }
registerExt4('proj13', () => ({ meta: {} }));
export function proj13(s: GameState): Proj13State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.proj13 ??= { meta: {} }) as Proj13State;
  st.meta ??= {};
  return st;
}
export const DEFAULT13: Choice13 = { loc: 'label', single: 'focus', ed: 'standard', art: 'photo', split: [50, 35, 15], polish: 50 };
export const planOf13 = (s: GameState, p: MusicProject): Plan13 | undefined => proj13(s).meta[p.id];

const typeMult = (p: MusicProject) => (p.type === 'lp' ? 1 : p.type === 'ep' ? 0.7 : 0.4);
export const isOpen = <T extends Opt>(s: GameState, o: T) => s.year >= o.from;
export const normSplit = (x: [number, number, number]): [number, number, number] => { const t = x.reduce((a, b) => a + Math.max(0, b), 0) || 1; return x.map((v) => Math.round((Math.max(0, v) / t) * 100)) as [number, number, number]; };

/** Custo extra (centavos) das escolhas. */
export function cost13(s: GameState, p: MusicProject, c: Choice13): number {
  const sgl = p.type === 'single' ? 0 : SINGLES[c.single].cost;
  return money(s, (LOCS[c.loc].cost + EDITIONS[c.ed].cost + ARTS[c.art].cost + sgl) * typeMult(p));
}

export function block13(s: GameState, p: MusicProject, c: Choice13): L | null {
  if (c.c2 && !conceptById[c.c2]) return l('Conceito inválido.', 'Invalid concept.');
  const opts: [Opt, L][] = [[LOCS[c.loc], l('local', 'location')], [SINGLES[c.single], l('estratégia de singles', 'single strategy')], [EDITIONS[c.ed], l('edição', 'edition')], [ARTS[c.art], l('capa', 'cover')]];
  for (const [o, n] of opts) if (!o || !isOpen(s, o)) return fmtL(l('Opção de {n} ainda não existe nesta época.', 'That {n} option does not exist yet in this era.'), { n });
  if (c.ed === 'box' && p.type !== 'lp') return l('Box é só para álbuns.', 'Box sets are for albums only.');
  if (p.type === 'single' && c.single !== 'none' && c.single !== 'focus' && c.single !== 'surprise') return l('Um single não tem single antes.', 'A single has no single before it.');
  return null;
}

/** Assume as escolhas: cobra a diferença de custo, ajusta o prazo do projeto (rodada 12) e o retiro. */
export function commit13(s: GameState, p: MusicProject, c: Choice13): L | null {
  if (projectStage(s, p) === 'scheduled' || p.releaseId || p.pendingId || p.rolloutId) return l('O lançamento já está programado.', 'The release is already scheduled.');
  const err = block13(s, p, c);
  if (err) return err;
  const prev = planOf13(s, p);
  const cost = cost13(s, p, c);
  const delta = cost - (prev?.paid ?? 0);
  if (delta > 0 && s.player.cash < delta) return l('Caixa insuficiente.', 'Not enough cash.');
  if (delta) { post(s, `p13:${p.id}:${s.week}:${cost}`, -delta, 'recording', `Projeto ${p.title || p.type}`); p.spent += delta; }
  const dw = LOCS[c.loc].weeks + Math.round((c.polish - 50) / 10);
  const pl12 = planOf12(s, p);
  // se o prazo da rodada 12 foi refeito desde a última vez, o ajuste anterior já não está nele
  if (pl12) pl12.deadline += dw - (prev && prev.dl === pl12.deadline ? prev.dw : 0);
  const pl: Plan13 = { ...(prev ?? { paid: 0, dw: 0 }), ...c, split: normSplit(c.split), paid: cost, dw, dl: pl12?.deadline };
  if (c.loc === 'retreat' && pl.locFx !== 'retreat') {
    const act = s.acts[p.actId];
    for (const id of act?.members ?? []) { const m = s.persons[id]; if (m) { m.inspiration = clamp(m.inspiration + 15, 0, 100); m.stress = clamp(m.stress - 15, 0, 100); } }
    pl.locFx = 'retreat';
  }
  proj13(s).meta[p.id] = pl;
  return null;
}

/** Deltas de atributo que as escolhas dão às faixas (com o porquê). */
export function songDeltas13(s: GameState, p: MusicProject, c: Choice13): { d: Deltas; why: { t: L; d: Deltas }[] } {
  const why: { t: L; d: Deltas }[] = [];
  const b = blendOf(p.concept, c.c2);
  if (b && Object.keys(b.d).length) why.push({ t: b.name, d: b.d });
  if (Object.keys(LOCS[c.loc].d).length) why.push({ t: LOCS[c.loc].name, d: LOCS[c.loc].d });
  const [r] = normSplit(c.split);
  const rp = Math.round(clamp((r - 50) / 7, -4, 4));
  if (rp) why.push({ t: l('verba de gravação', 'recording share'), d: { production: rp, performance: Math.round(rp / 2) } });
  const pp = Math.round(clamp((c.polish - 50) / 12, -4, 4));
  if (pp) why.push({ t: pp > 0 ? l('polimento extra', 'extra polish') : l('pressa (som cru)', 'haste (raw sound)'), d: pp > 0 ? { production: pp, performance: Math.round(pp / 2) } : { production: pp, originality: c.polish <= 25 ? 2 : 0 } });
  const d: Deltas = {};
  for (const w of why) for (const [k, v] of Object.entries(w.d) as [keyof Deltas, number][]) d[k] = (d[k] ?? 0) + v;
  return { d: capDeltas(d), why };
}

/** Fatores de apelo do lançamento (os mesmos que o mercado aplica), com rótulo. */
export function factors13(s: GameState, p: MusicProject, c: Choice13, pl?: Plan13): { t: L; v: number; risk?: [number, number] }[] {
  const act = s.acts[p.actId];
  const out: { t: L; v: number; risk?: [number, number] }[] = [];
  const add = (t: L, v: number, risk?: [number, number]) => { if (Math.abs(v - 1) > 0.004 || risk) out.push({ t, v, risk }); };
  const b = blendOf(p.concept, c.c2);
  if (b) add(fmtL(l('mistura: {n}', 'blend: {n}'), { n: b.name }), b.appeal);
  if (p.type !== 'single' || c.single === 'surprise') {
    const sg = SINGLES[c.single];
    if (c.single === 'surprise') { const big = (act?.fame ?? 0) >= 55; add(big ? l('lançamento surpresa virou evento', 'surprise drop became an event') : l('lançamento surpresa passou batido', 'surprise drop went unnoticed'), big ? 1.12 : 0.88); }
    else if (c.single === 'two' && (act?.fame ?? 0) < 30) add(l('dois singles (o segundo passou batido)', 'two singles (the second went unnoticed)'), 1.04);
    else add(sg.name, sg.appeal);
  }
  if (c.ed !== 'standard') add(EDITIONS[c.ed].name, EDITIONS[c.ed].appeal);
  if (c.art === 'provocative') {
    if (pl?.ban === 1) add(l('lojas recusaram a capa provocativa', 'stores refused the provocative cover'), 0.88);
    else if (pl?.ban === 0) add(l('capa provocativa deu o que falar', 'provocative cover got people talking'), 1.05);
    else add(ARTS.provocative.name, 1, [0.88, 1.05]);
  } else if (c.art === 'minimal') add(ARTS.minimal.name, planOf12(s, p)?.aud === 'critics' ? 1.03 : 0.99);
  else if (c.art === 'photo') add(ARTS.photo.name, p.concept === 'debut' || c.c2 === 'debut' ? 1.03 : 1);
  else add(ARTS[c.art].name, ARTS[c.art].appeal);
  const [, pr, pk] = normSplit(c.split);
  add(pr >= 35 ? l('verba de divulgação maior', 'bigger promotion share') : l('verba de divulgação menor', 'smaller promotion share'), clamp(1 + (pr - 35) / 300, 0.9, 1.12));
  add(l('embalagem caprichada', 'packaging care'), 1 + (pk - 15) / 500);
  if (c.polish <= 25) add(l('som cru (pressa)', 'raw sound (haste)'), planOf12(s, p)?.intent === 'experiment' ? 1.02 : 0.97);
  return out;
}

export function collector13(c: Choice13): number {
  return EDITIONS[c.ed].coll + ARTS[c.art].coll + (normSplit(c.split)[2] >= 30 ? 1 : 0);
}
export function hype13(s: GameState, p: MusicProject, c: Choice13): number {
  const b = blendOf(p.concept, c.c2);
  const pr = normSplit(c.split)[1];
  return (b?.hype ?? 0) + LOCS[c.loc].hype + (p.type === 'single' && c.single !== 'surprise' ? 0 : SINGLES[c.single].hype) + EDITIONS[c.ed].hype + ARTS[c.art].hype + Math.round((pr - 35) / 5);
}

/** Prévia: faixa de vendas esperada, qualidade, custo, prazo e o porquê. */
export function preview13(s: GameState, p: MusicProject, c: Choice13) {
  const act = s.acts[p.actId];
  const pl12 = planOf12(s, p);
  const sd = songDeltas13(s, p, c);
  const dq = Object.values(sd.d).reduce((t, v) => t + (v ?? 0), 0) / 5;
  const q = (projectQ(s, p) || 45) + dq;
  const base = act ? forecastUnits(s, act, p.type, q, p.marketing, s.player.territories) : { lo: 0, mid: 0, hi: 0 };
  const fx = factors13(s, p, c, planOf13(s, p));
  if (pl12) {
    fx.push({ t: fmtL(l('intenção: {i}', 'intent: {i}'), { i: INTENTS[pl12.intent].name }), v: INTENTS[pl12.intent].appeal });
    if (pl12.dir === 'bold') fx.push({ t: l('direção ousada (aposta)', 'bold direction (gamble)'), v: 1, risk: [0.85, 1.25] });
    if (pl12.dir === 'safe') fx.push({ t: l('direção segura', 'safe direction'), v: 1.04 });
  }
  const m = fx.reduce((t, f) => t * f.v, 1);
  const lo = fx.reduce((t, f) => t * (f.risk ? f.risk[0] : 1), 1), hi = fx.reduce((t, f) => t * (f.risk ? f.risk[1] : 1), 1);
  return {
    units: { lo: Math.round(base.lo * m * lo), mid: Math.round(base.mid * m), hi: Math.round(base.hi * m * hi) },
    appeal: m, fx, q: Math.round(q), dq: Math.round(dq * 10) / 10, deltas: sd, cost: cost13(s, p, c), hype: hype13(s, p, c), coll: collector13(c),
    weeks: LOCS[c.loc].weeks + Math.round((c.polish - 50) / 10),
  };
}

// ------------------------------------------------------------------ efeitos reais

function projectOf13(s: GameState, rel: Release): { p: MusicProject; pl: Plan13 } | null {
  for (const p of proj8(s).list) {
    if (p.actId !== rel.actId) continue;
    const ok = p.releaseId === rel.id || (!p.releaseId && rel.songs[0] && p.songIds.includes(rel.songs[0]) && !rel.reissueOf && rel.kind !== 'deluxe');
    const pl = ok ? proj13(s).meta[p.id] : undefined;
    if (pl) return { p, pl };
  }
  return null;
}

registerMod('appeal', 'proj13', (s, v, c) => {
  const x = c.release ? projectOf13(s, c.release) : null;
  if (!x) return null;
  const fx = factors13(s, x.p, x.pl, x.pl);
  const m = fx.reduce((t, f) => t * f.v, 1);
  if (Math.abs(m - 1) < 0.004) return null;
  const top = [...fx].sort((a, b) => Math.abs(Math.log(b.v)) - Math.abs(Math.log(a.v)))[0];
  return { value: v * m, label: fmtL(l('escolhas do projeto (sobretudo {t})', 'project choices (mainly {t})'), { t: top.t }) };
});

function recBonus13(s: GameState, so: Song): void {
  const p = openProjects(s, so.actId).find((x) => x.songIds.includes(so.id));
  const pl = p ? proj13(s).meta[p.id] : undefined;
  if (!p || !pl) return;
  const rec = songRec(s, so.id);
  if (!rec.recSeen || (rec.b as Record<string, Deltas>).proj13) return;
  (rec.b as Record<string, Deltas>).proj13 = songDeltas13(s, p, pl).d;
  syncSong(s, so.id);
}
registerSimHook('record', 'proj13', (s, _r, a) => { if (a.song) recBonus13(s, a.song); });

registerSimHook('launch', 'proj13', (s, _r, a) => {
  const rel = a.release;
  const x = rel ? projectOf13(s, rel) : null;
  if (!rel || !x || x.p.releaseId !== rel.id || x.pl.fx) return;
  const { p, pl } = x;
  pl.fx = 1;
  const act = s.acts[p.actId];
  if (pl.art === 'provocative') pl.ban = new Rng(seedState(`${s.config.seed}:p13ban:${p.id}`)).chance(s.year < 1995 ? 0.35 : 0.15) ? 1 : 0;
  const coll = collector13(pl);
  if (coll > 0) { const st = sup13(s); const e = (st.rel[rel.id] ??= { c: 0, a: 1 }); e.c += coll; }
  if (act && pl.polish >= 75) act.momentum = clamp(act.momentum - 3, 0, 100);
});

registerSimHook('week', 'proj13', (s) => {
  const mine = new Set(playerActs(s));
  for (const p of proj8(s).list) {
    const pl = proj13(s).meta[p.id];
    if (!pl || p.closed || !mine.has(p.actId)) continue;
    if (!p.releaseId) for (const id of p.songIds) { const so = s.songs[id]; if (so?.recorded) recBonus13(s, so); }
    if (!pl.hyped && (p.pendingId || p.rolloutId)) {
      pl.hyped = 1;
      const v = hype13(s, p, pl);
      if (v) addHype(s, `n:${p.actId}`, 'p13', v > 0 ? l('escolhas do projeto (singles, local, edição, capa)', 'project choices (singles, location, edition, cover)') : l('lançamento sem aviso', 'unannounced release'), v);
    }
  }
  for (const id of Object.keys(proj13(s).meta)) if (!proj8(s).list.some((p) => p.id === id)) delete proj13(s).meta[id];
});
