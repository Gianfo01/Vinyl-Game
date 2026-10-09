// Rodada 9 — alma das pessoas (inspirado em Dwarf Fortress): ~20 facetas de personalidade e 12 valores
// gerados de forma determinística (seed + id; nada guardado), memórias boas e ruins que se apagam com o
// tempo (traumas duram anos), estresse que leva a crises, sonhos de vida que movem ações autônomas
// (fundar selo, formar banda do zero, carreira solo, virar produtor, voltar para casa), surtos criativos
// e canções sobre o próprio mundo (tributos, diss tracks, crises).

import { clamp, hashString, type Rng } from '../../core/rng';
import { CITIES, cityById, familyOf, l, type L } from '../../data/world';
import { deferEvents, registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { bandName, langForCity, makeAct } from '../people';
import { composeSongs } from '../production';
import type { Act, Decision, GameState, Person } from '../types';
import { fmtL, money, nextId, notify, post } from '../util';
import { genStaff } from '../worldgen';
import { chron, chronListeners, chronState, cityL, nameOf, type ChronEv } from './chron9';
import { spendDrama, worldDramaOk, worldPace } from './pace9';
import { tiesOf } from './social8';

// ---------------------------------------------------------------- facetas e valores

export const FACETS = ['ego', 'lealdade', 'ambicao', 'impulsividade', 'disciplina', 'empatia', 'vaidade', 'coragem', 'ansiedade', 'humor',
  'teimosia', 'generosidade', 'curiosidade', 'sociabilidade', 'paciencia', 'rebeldia', 'perfeccionismo', 'confianca', 'melancolia', 'romantismo'] as const;
export const VALUES = ['fama', 'arte', 'dinheiro', 'familia', 'politica', 'fe', 'liberdade', 'tradicao', 'amizade', 'prazer', 'poder', 'comunidade'] as const;
export type Facet = (typeof FACETS)[number];
export type Value = (typeof VALUES)[number];

export const FACET_TXT: Record<Facet, [L, L, L]> = {
  ego: [l('Ego', 'Ego'), l('Dispensa ser o centro das atenções.', 'Has no need to be the center of attention.'), l('Acredita que o palco lhe pertence.', 'Believes the stage belongs to them.')],
  lealdade: [l('Lealdade', 'Loyalty'), l('Troca de lado sem remorso.', 'Switches sides without remorse.'), l('Fiel até o fim a quem esteve junto.', 'Loyal to the end to those who stood by them.')],
  ambicao: [l('Ambição', 'Ambition'), l('Contenta-se com pouco.', 'Content with little.'), l('Quer tudo, e quer agora.', 'Wants everything, and wants it now.')],
  impulsividade: [l('Impulsividade', 'Impulsiveness'), l('Pensa três vezes antes de agir.', 'Thinks three times before acting.'), l('Age antes de pensar.', 'Acts before thinking.')],
  disciplina: [l('Disciplina', 'Discipline'), l('Odeia rotina e horários.', 'Hates routine and schedules.'), l('Ensaio é sagrado.', 'Rehearsal is sacred.')],
  empatia: [l('Empatia', 'Empathy'), l('Pouco se importa com o que os outros sentem.', 'Cares little for what others feel.'), l('Sente a dor dos outros como sua.', 'Feels the pain of others as their own.')],
  vaidade: [l('Vaidade', 'Vanity'), l('Não liga para a aparência.', 'Does not care about looks.'), l('Vive para a imagem e o espelho.', 'Lives for image and the mirror.')],
  coragem: [l('Coragem', 'Courage'), l('Evita qualquer confronto.', 'Avoids any confrontation.'), l('Não foge de briga nem de risco.', 'Never runs from a fight or a risk.')],
  ansiedade: [l('Ansiedade', 'Anxiety'), l('Calma inabalável.', 'Unshakable calm.'), l('Vive à beira de um ataque de nervos.', 'Lives on the edge of a nervous breakdown.')],
  humor: [l('Humor', 'Humor'), l('Sério, quase sombrio.', 'Serious, almost grim.'), l('Faz piada até em velório.', 'Cracks jokes even at funerals.')],
  teimosia: [l('Teimosia', 'Stubbornness'), l('Cede fácil a um bom argumento.', 'Yields easily to a good argument.'), l('Ninguém o faz mudar de ideia.', 'Nobody can change their mind.')],
  generosidade: [l('Generosidade', 'Generosity'), l('Conta cada centavo.', 'Counts every penny.'), l('Divide tudo o que tem.', 'Shares everything they have.')],
  curiosidade: [l('Curiosidade', 'Curiosity'), l('Prefere o que já conhece.', 'Prefers what they already know.'), l('Sempre atrás de sons novos.', 'Always chasing new sounds.')],
  sociabilidade: [l('Sociabilidade', 'Sociability'), l('Prefere a própria companhia.', 'Prefers their own company.'), l('A alma de qualquer festa.', 'The soul of every party.')],
  paciencia: [l('Paciência', 'Patience'), l('Não suporta esperar.', 'Cannot stand waiting.'), l('Sabe esperar o momento certo.', 'Knows how to wait for the right moment.')],
  rebeldia: [l('Rebeldia', 'Rebelliousness'), l('Respeita hierarquias.', 'Respects hierarchy.'), l('Desafia toda autoridade.', 'Defies every authority.')],
  perfeccionismo: [l('Perfeccionismo', 'Perfectionism'), l('Feito é melhor que perfeito.', 'Done beats perfect.'), l('Refaz a mesma tomada cem vezes.', 'Redoes the same take a hundred times.')],
  confianca: [l('Autoconfiança', 'Confidence'), l('Duvida do próprio talento.', 'Doubts their own talent.'), l('Confiança de quem nasceu estrela.', 'The confidence of a born star.')],
  melancolia: [l('Melancolia', 'Melancholy'), l('Otimismo contagiante.', 'Contagious optimism.'), l('Carrega uma tristeza antiga.', 'Carries an old sadness.')],
  romantismo: [l('Romantismo', 'Romanticism'), l('Desconfia do amor.', 'Distrusts love.'), l('Apaixona-se a cada turnê.', 'Falls in love on every tour.')],
};
export const VALUE_TXT: Record<Value, [L, L, L]> = {
  fama: [l('Fama', 'Fame'), l('Despreza a fama.', 'Despises fame.'), l('Quer ser lembrado para sempre.', 'Wants to be remembered forever.')],
  arte: [l('Arte', 'Art'), l('Vê a música como ofício, não arte.', 'Sees music as a trade, not art.'), l('A arte vem antes de tudo.', 'Art comes before everything.')],
  dinheiro: [l('Dinheiro', 'Money'), l('Dinheiro não o move.', 'Money does not move them.'), l('Cada contrato é medido em cifras.', 'Every deal is measured in figures.')],
  familia: [l('Família', 'Family'), l('A estrada é sua única casa.', 'The road is their only home.'), l('A família vem primeiro.', 'Family comes first.')],
  politica: [l('Política', 'Politics'), l('Foge de qualquer causa.', 'Avoids any cause.'), l('Toda canção é um manifesto.', 'Every song is a manifesto.')],
  fe: [l('Fé', 'Faith'), l('Cético até o osso.', 'Skeptical to the bone.'), l('Tem uma fé profunda.', 'Has a deep faith.')],
  liberdade: [l('Liberdade', 'Freedom'), l('Gosta de estrutura e de regras.', 'Likes structure and rules.'), l('Não aceita amarras.', 'Accepts no shackles.')],
  tradicao: [l('Tradição', 'Tradition'), l('Quer romper com o passado.', 'Wants to break with the past.'), l('Honra as raízes e a terra natal.', 'Honors roots and hometown.')],
  amizade: [l('Amizade', 'Friendship'), l('Amigos são passageiros.', 'Friends come and go.'), l('Os amigos são sua verdadeira banda.', 'Friends are their true band.')],
  prazer: [l('Prazer', 'Pleasure'), l('Vida regrada, quase monástica.', 'An orderly, almost monastic life.'), l('Vive para a próxima festa.', 'Lives for the next party.')],
  poder: [l('Poder', 'Power'), l('Não quer mandar em ninguém.', 'Has no wish to rule anyone.'), l('Quer estar no comando.', 'Wants to be in charge.')],
  comunidade: [l('Comunidade', 'Community'), l('Cada um por si.', 'Every one for themselves.'), l('Toca para o bairro e pela cena.', 'Plays for the neighborhood and the scene.')],
};

const TRAIT_F: Record<string, [Facet | Value, number][]> = {
  loyal: [['lealdade', 28]], competitive: [['ambicao', 18], ['ego', 10]], diplomatic: [['empatia', 20], ['paciencia', 10]], manipulative: [['empatia', -25], ['poder', 15]],
  loner: [['sociabilidade', -28]], quarrelsome: [['paciencia', -22], ['coragem', 12]], generous: [['generosidade', 28]], disciplined: [['disciplina', 25]],
  punctual: [['disciplina', 15]], workaholic: [['disciplina', 18], ['ambicao', 10]], lazy: [['disciplina', -25]], opportunist: [['lealdade', -25], ['dinheiro', 15]],
  ambitious: [['ambicao', 25], ['fama', 12]], frugal: [['generosidade', -18]], spendthrift: [['impulsividade', 15], ['prazer', 12]], insecure: [['confianca', -25], ['ansiedade', 12]],
  big_ego: [['ego', 30], ['vaidade', 12]], resilient: [['ansiedade', -22]], anxious: [['ansiedade', 28]], impulsive: [['impulsividade', 28]], melancholic: [['melancolia', 28]],
  optimist: [['melancolia', -22], ['humor', 10]], resentful: [['paciencia', -18], ['lealdade', -8]], shy: [['sociabilidade', -20], ['confianca', -10]],
  controversial: [['rebeldia', 20], ['vaidade', 8]], engaged: [['politica', 28], ['comunidade', 12]], rebel: [['rebeldia', 28], ['liberdade', 15]], romantic: [['romantismo', 28]],
  spiritual: [['fe', 30]], party: [['prazer', 28], ['sociabilidade', 12]], intellectual: [['curiosidade', 20], ['arte', 10]], street: [['comunidade', 18]], rooted: [['tradicao', 28]],
  dreamer: [['curiosidade', 15], ['arte', 12]], perfectionist: [['perfeccionismo', 28]], experimental: [['curiosidade', 25]], purist: [['teimosia', 18], ['tradicao', 12]],
  charismatic: [['confianca', 18], ['sociabilidade', 10]], media_savvy: [['vaidade', 12], ['fama', 10]], virtuoso: [['perfeccionismo', 12], ['arte', 10]],
};
const AMB_V: Record<string, Value> = { art: 'arte', fame: 'fama', money: 'dinheiro', freedom: 'liberdade', critics: 'arte', security: 'familia', status: 'poder', legacy: 'fama' };

export interface Soul { f: Record<Facet, number>; v: Record<Value, number> }
const CACHE = new WeakMap<Person, { k: string; so: Soul }>();
const sigOf = (p: Person) => `${p.traits?.join(',')}|${p.ambition}|${p.goal}|${p.persona ? Object.values(p.persona).join(',') : ''}`;

function u(seed: string, id: string, k: string): number {
  return hashString(`${seed}|${id}|${k}`) / 4294967296;
}
function roll(seed: string, id: string, k: string): number {
  const base = 50 + ((u(seed, id, k + '1') + u(seed, id, k + '2') + u(seed, id, k + '3')) / 3 - 0.5) * 64;
  const x = u(seed, id, k + 'x');
  if (x < 0.045) return u(seed, id, k + 'y') < 0.5 ? 3 + x * 260 : 86 + x * 260;
  return base;
}

/** Personalidade e valores de uma pessoa (determinísticos; mesclam traços, persona e ambição já existentes). */
export function soul(s: GameState, p: Person): Soul {
  const sig = sigOf(p);
  const hit = CACHE.get(p);
  if (hit && hit.k === sig) return hit.so;
  const seed = s.config.seed;
  const f = {} as Record<Facet, number>;
  const v = {} as Record<Value, number>;
  for (const k of FACETS) f[k] = roll(seed, p.id, k);
  for (const k of VALUES) v[k] = roll(seed, p.id, 'v' + k);
  const add = (k: Facet | Value, d: number) => { if (k in f) f[k as Facet] += d; else v[k as Value] += d; };
  for (const t of p.traits ?? []) for (const [k, d] of TRAIT_F[t] ?? []) add(k, d);
  const pe = p.persona;
  if (pe) {
    f.curiosidade = (f.curiosidade + pe.openness) / 2; f.perfeccionismo = (f.perfeccionismo + pe.perfectionism) / 2; f.ambicao = (f.ambicao + pe.ambition) / 2;
    f.sociabilidade = (f.sociabilidade + pe.sociability) / 2; f.disciplina = (f.disciplina + pe.discipline) / 2; f.ansiedade = (f.ansiedade + 100 - pe.resilience) / 2;
  }
  if (AMB_V[p.ambition]) v[AMB_V[p.ambition]] += 22;
  const G: Record<string, Value> = { security: 'familia', credit: 'arte', family: 'familia', leadership: 'poder', solo: 'liberdade' };
  if (p.goal && G[p.goal]) v[G[p.goal]] += 15;
  for (const k of FACETS) f[k] = Math.round(clamp(f[k], 0, 100));
  for (const k of VALUES) v[k] = Math.round(clamp(v[k], 0, 100));
  const out = { f, v };
  CACHE.set(p, { k: sig, so: out });
  return out;
}

/** Frases descritivas (estilo DF): facetas mais marcantes, o que mais valoriza e o que despreza. */
export function describeSoul(s: GameState, p: Person): L[] {
  const so = soul(s, p);
  const out: L[] = [];
  const fs = FACETS.map((k) => ({ k, d: so.f[k] - 50 })).filter((x) => Math.abs(x.d) >= 16).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5);
  for (const x of fs) out.push(FACET_TXT[x.k][x.d > 0 ? 2 : 1]);
  const vs = VALUES.map((k) => ({ k, v: so.v[k] })).sort((a, b) => b.v - a.v);
  for (const x of vs.slice(0, 2)) if (x.v >= 60) out.push(VALUE_TXT[x.k][2]);
  const low = vs[vs.length - 1];
  if (low.v <= 35) out.push(VALUE_TXT[low.k][1]);
  if (!out.length) out.push(l('Equilibrado, difícil de decifrar.', 'Balanced, hard to read.'));
  return out;
}

// ---------------------------------------------------------------- sonhos

export type DreamId = 'grammy' | 'critics' | 'label' | 'family' | 'home' | 'producer' | 'supergroup' | 'solo' | 'legend' | 'band';
export const DREAM_TXT: Record<DreamId, L> = {
  grammy: l('Ganhar um Gramófono de Ouro', 'Win a Golden Gramophone'), critics: l('Ser respeitado pela crítica', 'Earn the critics\' respect'),
  label: l('Fundar o próprio selo', 'Found their own label'), family: l('Construir uma família longe dos palcos', 'Build a family away from the stage'),
  home: l('Voltar para a terra natal', 'Return to their hometown'), producer: l('Virar produtor', 'Become a producer'),
  supergroup: l('Formar um supergrupo', 'Form a supergroup'), solo: l('Brilhar em carreira solo', 'Shine in a solo career'),
  legend: l('Virar lenda', 'Become a legend'), band: l('Ter a própria banda', 'Have a band of their own'),
};
export function dreamOf(s: GameState, p: Person): DreamId {
  const { f, v } = soul(s, p);
  const sc: Record<DreamId, number> = {
    grammy: v.fama, critics: v.arte, label: v.poder * 0.6 + v.dinheiro * 0.6, family: v.familia, home: v.tradicao + v.comunidade * 0.4 - 20,
    producer: f.curiosidade * 0.6 + v.arte * 0.4, supergroup: v.amizade * 0.7 + f.sociabilidade * 0.4, solo: v.liberdade * 0.55 + f.ego * 0.6,
    legend: v.fama * 0.5 + f.ambicao * 0.6, band: v.amizade * 0.5 + v.comunidade * 0.5 - 10,
  };
  let best: DreamId = 'legend';
  let bv = -1;
  for (const k of Object.keys(sc) as DreamId[]) {
    const x = sc[k] + u(s.config.seed, p.id, 'dream' + k) * 25;
    if (x > bv) { bv = x; best = k; }
  }
  return best;
}
/** Terra natal: uma cidade do mesmo mercado da primeira banda (determinística). */
export function hometownOf(s: GameState, p: Person, fallbackCity: string): string {
  const m = cityById[fallbackCity]?.market;
  const list = CITIES.filter((c) => c.market === m);
  return list.length ? list[Math.floor(u(s.config.seed, p.id, 'home') * list.length)].id : fallbackCity;
}

// ---------------------------------------------------------------- estado guardado (só pessoas notáveis)

/** memória: [tipo, valor −100..100, ano, duração em anos] */
export type Mem = [string, number, number, number];
export interface PSoul { m: Mem[]; dd?: number; bd?: number; tr?: number }
export interface Soul9State { p: Record<string, PSoul> }
declare module '../ext4' { interface Ext4 { soul9: Soul9State } }
registerExt4('soul9', () => ({ p: {} }));
export function soulState(s: GameState): Soul9State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.soul9 ??= { p: {} }) as Soul9State;
  st.p ??= {};
  return st;
}
export const MEM_TXT: Record<string, L> = {
  number1: l('chegou ao #1', 'hit #1'), award: l('ganhou um prêmio', 'won an award'), hall_of_fame: l('entrou para o Hall', 'was inducted into the Hall'),
  legend: l('virou lenda', 'became a legend'), masterwork: l('fez uma obra-prima', 'made a masterpiece'), masterpiece: l('viveu um surto criativo', 'had a creative fit'),
  split: l('viu a banda acabar', 'saw the band end'), death: l('perdeu alguém da banda', 'lost a bandmate'), breakdown: l('teve uma crise', 'had a breakdown'),
  member_quits: l('viu alguém sair', 'saw someone leave'), lineup: l('mudou de formação', 'went through a lineup change'), record: l('bateu um recorde', 'broke a record'),
  rise: l('estourou', 'broke through'), tour_accident: l('sofreu um acidente na estrada', 'had a road accident'), scandal: l('viveu um escândalo', 'went through a scandal'),
  reunion: l('voltou com a banda', 'reunited with the band'), comeback: l('voltou aos palcos', 'came back to the stage'), trance_denied: l('teve um surto criativo negado', 'had a creative fit denied'),
  feud: l('brigou feio com um colega', 'had a bitter fight with a bandmate'), dream: l('realizou um sonho', 'fulfilled a dream'), label_closed: l('viu o selo fechar', 'saw the label close'),
};
const MEM_MAP: Record<string, [number, number]> = {
  number1: [25, 3], award: [25, 4], hall_of_fame: [40, 10], legend: [30, 8], masterwork: [30, 6], record: [20, 4], rise: [15, 3], reunion: [20, 4], comeback: [20, 4],
  split: [-30, 5], death: [-45, 10], breakdown: [-20, 3], member_quits: [-15, 2], lineup: [-8, 2], tour_accident: [-35, 6], scandal: [-20, 3], label_closed: [-12, 2],
};

const isNotableAct = (a?: Act) => !!a && (a.fame >= 25 || a.owner === 'player' || !!a.playerBand || a.legend);

export function addMem(s: GameState, pid: string, kind: string, v: number, ttl: number): void {
  const st = soulState(s);
  const ps = (st.p[pid] ??= { m: [] });
  ps.m.push([kind, Math.round(v), s.year, ttl]);
  if (ps.m.length > 8) {
    ps.m.sort((a, b) => Math.abs(b[1]) * Math.max(0, 1 - (s.year - b[2]) / b[3]) - Math.abs(a[1]) * Math.max(0, 1 - (s.year - a[2]) / a[3]));
    ps.m.length = 8;
  }
}
export function moodOf(s: GameState, pid: string): number {
  let t = 0;
  for (const [, v, y, ttl] of soulState(s).p[pid]?.m ?? []) t += v * Math.max(0, 1 - (s.year - y) / ttl);
  return t;
}

chronListeners().push((s: GameState, e: ChronEv) => {
  const mm = MEM_MAP[e.k];
  if (!mm || !e.a) return;
  for (const id of e.a) {
    const a = s.acts[id];
    if (!isNotableAct(a)) continue;
    for (const pid of a!.members) {
      const p = s.persons[pid];
      if (!p?.alive) continue;
      addMem(s, pid, e.k, mm[0], mm[1]);
    }
    break; // só o ato principal
  }
  worldSongs(s, e);
});

// ---------------------------------------------------------------- formar atos a partir de pessoas reais

/** Cria um ato com pessoas já existentes (solo, banda nova, supergrupo). */
export function formAct(s: GameState, r: Rng, pids: string[], genre: string, city: string, fame = 2, name?: string): Act {
  const ps = pids.map((id) => s.persons[id]).filter(Boolean);
  const pot = ps.reduce((t, p) => t + p.potential, 0) / Math.max(1, ps.length);
  const a = makeAct(s, r, { genre, city, members: ps.length, potential: pot, formed: s.year, debutYear: s.year, fame });
  for (const id of a.members) delete s.persons[id];
  a.members = ps.map((p) => p.id);
  a.name = name ?? (ps.length === 1 ? ps[0].name : bandName(r, langForCity(city, r), familyOf(genre), ps.length));
  a.leaderId = ps.slice().sort((x, y) => soul(s, y).f.ego - soul(s, x).f.ego)[0]?.id;
  for (const x of ps) for (const y of ps) if (x !== y) x.rel[y.id] = clamp(x.rel[y.id] ?? 20, -100, 100);
  return a;
}

const actOfP = (s: GameState, pid: string): Act | undefined => {
  for (const a of Object.values(s.acts)) if (a.members.includes(pid) && (a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus')) return a;
  return undefined;
};

// ---------------------------------------------------------------- mês: humor, estresse, crises, vícios, surtos

function breakdown(s: GameState, r: Rng, a: Act, p: Person): void {
  const { f, v } = soul(s, p);
  const ps = soulState(s).p[p.id] ?? (soulState(s).p[p.id] = { m: [] });
  ps.bd = s.year;
  let t: L;
  if (f.impulsividade > 60 || f.ego > 66) {
    const other = a.members.find((x) => x !== p.id && s.persons[x]?.alive);
    if (other) { p.rel[other] = clamp((p.rel[other] ?? 0) - 35, -100, 100); const o = s.persons[other]; o.rel[p.id] = clamp((o.rel[p.id] ?? 0) - 35, -100, 100); addMem(s, other, 'feud', -25, 3); }
    a.scandals++;
    a.fame = clamp(a.fame + 1, 0, 100);
    t = fmtL(l('{p} ({a}) briga em pleno palco{o}; o show acaba no meio.', '{p} ({a}) brawls onstage{o}; the show stops halfway.'), { p: p.name, a: a.name, o: other ? fmtL(l(' com {x}', ' with {x}'), { x: s.persons[other].name }) : '' });
  } else if (v.prazer > 62) {
    p.health = 'recovering';
    a.hiatusUntil = s.week + 10;
    t = fmtL(l('{p} ({a}) é internado numa clínica de reabilitação.', '{p} ({a}) checks into rehab.'), { p: p.name, a: a.name });
  } else if (f.melancolia > 58) {
    a.hiatusUntil = s.week + 26;
    t = fmtL(l('{p} ({a}) some sem avisar. Ninguém sabe onde está.', '{p} ({a}) vanishes without a word. Nobody knows where.'), { p: p.name, a: a.name });
  } else {
    a.hiatusUntil = s.week + 12;
    a.momentum = clamp(a.momentum - 15, 0, 100);
    t = fmtL(l('Esgotado, {p} cancela a turnê de {a}.', 'Exhausted, {p} cancels {a}\'s tour.'), { p: p.name, a: a.name });
  }
  p.stress = clamp(p.stress - 35, 0, 100);
  addMem(s, p.id, 'breakdown', -20, 3);
  spendDrama(s, 2);
  chron(s, { k: 'breakdown', i: a.fame > 40 ? 4 : 3, a: [a.id, p.id], t });
}

/** Surto criativo: exige recursos. Atendido → obra-prima; negado → abalado. */
export function trance(s: GameState, r: Rng, a: Act, p: Person, force?: boolean): void {
  const ps = soulState(s).p[p.id] ?? (soulState(s).p[p.id] = { m: [] });
  ps.tr = s.week;
  const cost = money(s, 3000 + a.fame * 150);
  if (a.owner === 'player') {
    if (s.decisions.some((d) => d.eventId === 'trance9')) return;
    const d: Decision = {
      id: nextId(s, 'd'), eventId: 'trance9', cat: 'people',
      title: fmtL(l('Surto criativo: {p}', 'Creative fit: {p}'), { p: p.name }),
      text: fmtL(l('{p} ({a}) entrou em transe: não dorme, enche cadernos e exige estúdio, músicos e silêncio agora. Atender custa {c}.', '{p} ({a}) is in a trance: not sleeping, filling notebooks, demanding a studio, players and silence right now. It costs {c}.'), { p: p.name, a: a.name, c: `$${Math.round(cost / 100).toLocaleString('en-US')}` }),
      options: [{ id: 'fund', label: l('Dar tudo o que pede', 'Give them everything'), hint: l('Chance de obra-prima.', 'Shot at a masterpiece.') }, { id: 'deny', label: l('Negar', 'Deny'), hint: l('Fica abalado.', 'Leaves them shaken.') }],
      ctx: { act: a.id, person: p.id, cost }, week: s.week, defaultOption: 'deny', tags: [],
    };
    s.decisions.push(d);
    return;
  }
  const lb = a.owner ? s.labels[a.owner] : undefined;
  const purse = lb ? lb.cash : a.cash;
  if (force || (purse >= cost && r.chance(0.75))) {
    if (lb) lb.cash -= cost; else a.cash -= cost;
    masterpiece(s, r, a, p);
  } else denied(s, a, p);
}

function masterpiece(s: GameState, r: Rng, a: Act, p: Person): void {
  for (const id of a.members) { const m = s.persons[id]; if (m) m.inspiration = 100; }
  a.momentum = clamp(a.momentum + 15, 0, 100);
  a.fame = clamp(a.fame + 2, 0, 100);
  const [so] = composeSongs(s, r, a, 1);
  if (so) { so.q = clamp(so.q + 25, 0, 100); so.originality = clamp(so.originality + 20, 0, 100); }
  addMem(s, p.id, 'masterpiece', 30, 6);
  spendDrama(s, 1);
  chron(s, { k: 'masterpiece', i: a.fame > 50 ? 4 : 3, a: [a.id, p.id], t: fmtL(l('Em transe criativo, {p} ({a}) tranca-se no estúdio e sai com "{t}" — já tratada como clássico.', 'In a creative trance, {p} ({a}) locks into the studio and emerges with "{t}" — already hailed a classic.'), { p: p.name, a: a.name, t: so?.title ?? '?' }) });
}
function denied(s: GameState, a: Act, p: Person): void {
  p.stress = clamp(p.stress + 30, 0, 100);
  addMem(s, p.id, 'trance_denied', -25, 3);
  chron(s, { k: 'trance_denied', i: 2, a: [a.id, p.id], t: fmtL(l('Sem estúdio nem apoio, o surto criativo de {p} ({a}) vira frustração.', 'With no studio or support, {p}\'s ({a}) creative fit turns into frustration.'), { p: p.name, a: a.name }) });
}

deferEvents([{
  id: 'trance9', cat: 'people', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
  title: l('Surto criativo', 'Creative fit'), text: l('Alguém do elenco entrou em transe criativo.', 'Someone on the roster is in a creative trance.'),
  options: [
    { id: 'fund', label: l('Dar tudo o que pede', 'Give them everything'), apply: (s: GameState, r: Rng, c: Record<string, string | number>) => {
      const a = s.acts[String(c.act)]; const p = s.persons[String(c.person)]; if (!a || !p) return;
      post(s, `trance:${p.id}`, -Number(c.cost), 'recording', `Surto criativo ${p.name}`);
      masterpiece(s, r, a, p);
    } },
    { id: 'deny', label: l('Negar', 'Deny'), apply: (s: GameState, _r: Rng, c: Record<string, string | number>) => { const a = s.acts[String(c.act)]; const p = s.persons[String(c.person)]; if (a && p) denied(s, a, p); } },
  ],
}]);

registerSimHook('month', 'soul9', (s, r) => {
  const pace = worldPace(s);
  for (const a of Object.values(s.acts)) {
    if (!isNotableAct(a) || (a.status !== 'active' && a.status !== 'emerging')) continue;
    const npc = a.owner !== 'player' && !a.playerBand;
    let egoClash = 0;
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p?.alive || p.isPlayer) continue;
      const { f, v } = soul(s, p);
      const mood = moodOf(s, pid);
      if (npc) {
        const target = clamp(30 + (f.ansiedade - 50) * 0.6 - mood * 0.5 + (a.momentum < 20 ? 8 : 0), 0, 100);
        p.stress = clamp(p.stress + (target - p.stress) * 0.15, 0, 100);
        const ps = soulState(s).p[pid];
        if (p.stress > 72 && ps?.bd !== s.year && r.chance(0.05 * pace * (0.5 + f.ansiedade / 100)) && worldDramaOk(s, r, 2)) { breakdown(s, r, a, p); continue; }
        if (p.health === 'ok' && v.prazer > 70 && f.impulsividade > 62 && r.chance(0.004)) {
          p.health = 'addiction';
          chron(s, { k: 'addiction', i: a.fame > 40 ? 3 : 2, a: [a.id, pid], t: fmtL(l('{p} ({a}) mergulha nos excessos.', '{p} ({a}) dives into excess.'), { p: p.name, a: a.name }) });
        }
      } else {
        p.morale = clamp(p.morale + clamp(mood / 40, -1.5, 1.5), 0, 100);
      }
      if (f.ego > 68 && f.empatia < 45) egoClash++;
      const tr = soulState(s).p[pid]?.tr ?? -999;
      if (s.week - tr > 104 && s.week - (s.flags.trance9w ?? -99) > 8 && r.chance(0.0004 * ((f.curiosidade + v.arte) / 100) * pace) && worldDramaOk(s, r, 1)) { s.flags.trance9w = s.week; trance(s, r, a, p); }
    }
    // egos em choque: a banda azeda e pode acabar
    if (egoClash >= 2 && npc && a.members.length >= 2) {
      let sum = 0; let n = 0;
      for (const x of a.members) for (const y of a.members) if (x !== y && s.persons[x]) { s.persons[x].rel[y] = clamp((s.persons[x].rel[y] ?? 0) - 2, -100, 100); sum += s.persons[x].rel[y]; n++; }
      if (n && sum / n < -40 && a.fame > 15 && r.chance(0.03 * pace) && worldDramaOk(s, r, 3)) {
        a.status = 'split';
        a.careerEnd = s.year;
        a.legend = a.legend || a.fame > 45;
        spendDrama(s, 3);
        chron(s, { k: 'split', i: a.fame > 40 ? 4 : 3, a: [a.id], t: fmtL(l('Egos inconciliáveis: {a} acaba entre acusações mútuas.', 'Irreconcilable egos: {a} ends amid mutual accusations.'), { a: a.name }) });
      }
    }
  }
});

// ---------------------------------------------------------------- ano: sonhos e ações autônomas

function dreamDone(s: GameState, p: Person, a: Act | undefined, t: L): void {
  const ps = soulState(s).p[p.id] ?? (soulState(s).p[p.id] = { m: [] });
  ps.dd = s.year;
  addMem(s, p.id, 'dream', 35, 8);
  chron(s, { k: 'dream', i: 2, a: a ? [a.id, p.id] : [p.id], t });
}

function pursueDream(s: GameState, r: Rng, a: Act, p: Person): boolean {
  const d = dreamOf(s, p);
  const age = s.year - p.born;
  const band = a.members.length >= 2;
  const leave = () => { a.members = a.members.filter((x) => x !== p.id); if (a.leaderId === p.id) a.leaderId = a.members[0]; };
  switch (d) {
    case 'grammy': if (a.awards > 0) { dreamDone(s, p, a, fmtL(l('{p} realiza o sonho de ganhar um Gramófono de Ouro.', '{p} fulfils the dream of winning a Golden Gramophone.'), { p: p.name })); return true; } return false;
    case 'legend': if (a.legend) { dreamDone(s, p, a, fmtL(l('{p} vê {a} virar lenda — o sonho de uma vida.', '{p} sees {a} become a legend — a lifelong dream.'), { p: p.name, a: a.name })); return true; } return false;
    case 'critics': if (a.releases.some((id) => (s.releases[id]?.critic ?? 0) >= 85)) { dreamDone(s, p, a, fmtL(l('{p} finalmente conquista o respeito da crítica.', '{p} finally wins the critics\' respect.'), { p: p.name })); return true; } return false;
    case 'label': {
      if (age < 30 || a.fame < 35 || Object.values(s.labels).filter((x) => x.active).length >= 16) return false;
      const id = nextId(s, 'lb');
      const surname = p.name.split(' ').slice(-1)[0];
      s.labels[id] = { id, name: `${surname} Records`, family: 'B', city: a.city, founded: s.year, focus: [a.genre], cash: money(s, 80000 + a.fame * 3000), reputation: 25 + a.fame / 4,
        roster: [], active: true, aggression: 0.4, strategy: 'niche', territories: [cityById[a.city]?.market ?? 'na'], revenueYear: 0, revenueLastYear: 0, procedural: true, ceo: p.name };
      if (!a.owner) { a.owner = id; s.labels[id].roster.push(a.id); }
      dreamDone(s, p, a, fmtL(l('{p} ({a}) funda o próprio selo: {n}.', '{p} ({a}) founds their own label: {n}.'), { p: p.name, a: a.name, n: s.labels[id].name }));
      return true;
    }
    case 'family': {
      if (age < 30) return false;
      if (band && a.members.length >= 3) leave(); else { a.status = 'retired'; a.careerEnd = s.year; }
      dreamDone(s, p, a, fmtL(l('{p} deixa os palcos de {a} para cuidar da família.', '{p} leaves {a}\'s stage to raise a family.'), { p: p.name, a: a.name }));
      return true;
    }
    case 'home': {
      const home = hometownOf(s, p, a.city);
      if (home === a.city) return false;
      if (!band) a.city = home; else leave();
      dreamDone(s, p, a, fmtL(l('{p} volta para {c}, a terra natal.', '{p} goes back home to {c}.'), { p: p.name, c: cityL(home) }));
      return true;
    }
    case 'producer': {
      if (age < 32 || !band) return false;
      leave();
      const st = genStaff(s, r, 'producer', clamp(Math.round((p.skills.prod ?? 40) + 15), 30, 95));
      st.name = p.name;
      s.professionals.push(st);
      dreamDone(s, p, a, fmtL(l('{p} sai de {a} para virar produtor — já está no mercado.', '{p} leaves {a} to become a producer — now available for hire.'), { p: p.name, a: a.name }));
      return true;
    }
    case 'solo': {
      if (!band || a.fame < 25) return false;
      leave();
      const solo = formAct(s, r, [p.id], a.genre, a.city, a.fame * 0.4);
      dreamDone(s, p, solo, fmtL(l('{p} deixa {a} e parte para a carreira solo.', '{p} leaves {a} and goes solo.'), { p: p.name, a: a.name }));
      return true;
    }
    case 'supergroup': {
      if (a.fame < 40) return false;
      const fam = familyOf(a.genre);
      const others = Object.values(s.acts).filter((b) => b !== a && b.fame >= 40 && (b.status === 'active' || b.status === 'emerging') && familyOf(b.genre) === fam);
      if (!others.length) return false;
      const picks = r.shuffle(others).slice(0, r.int(1, 2)).map((b) => r.pick(b.members)).filter((x) => s.persons[x]?.alive && !s.persons[x].isPlayer);
      if (!picks.length) return false;
      const sg = formAct(s, r, [p.id, ...picks], a.genre, a.city, (a.fame + 20) / 2);
      dreamDone(s, p, sg, fmtL(l('Supergrupo: {p} ({a}) junta-se a {o} e nasce {n}.', 'Supergroup: {p} ({a}) teams up with {o} and {n} is born.'), { p: p.name, a: a.name, o: picks.map((x) => s.persons[x].name).join(', '), n: sg.name }));
      return true;
    }
    default: return false;
  }
}

/** Músicos livres (sem ato ativo) que já passaram por bandas notáveis. */
export function freeMusicians(s: GameState): Person[] {
  const busy = new Set<string>();
  for (const a of Object.values(s.acts)) if (a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus') for (const m of a.members) busy.add(m);
  const out: Person[] = [];
  for (const id of Object.keys(chronState(s).mem)) {
    const p = s.persons[id];
    if (p?.alive && !p.isPlayer && !busy.has(id) && s.year - p.born >= 18 && s.year - p.born <= 55) out.push(p);
  }
  return out;
}

/** Bandas novas formadas do zero por músicos livres (genealogia viva). */
function newBands(s: GameState, r: Rng): void {
  const c = chronState(s);
  const byCity: Record<string, Person[]> = {};
  for (const p of freeMusicians(s)) {
    const last = c.mem[p.id]?.slice(-1)[0]?.split(':')[0];
    const city = (last && s.acts[last]?.city) || undefined;
    if (city) (byCity[city] ??= []).push(p);
  }
  let made = 0;
  for (const [city, list] of Object.entries(byCity)) {
    if (made >= 3 || list.length < 2 || !r.chance(0.4 * worldPace(s)) || !worldDramaOk(s, r, 1)) continue;
    const grp = r.shuffle(list).slice(0, Math.min(list.length, r.int(2, 4)));
    const prevs = grp.map((p) => c.mem[p.id].slice(-1)[0].split(':')[0]);
    const g = s.acts[prevs[0]]?.genre ?? 'rnr';
    const a = formAct(s, r, grp.map((p) => p.id), g, city, 3 + grp.length * 2);
    spendDrama(s, 1);
    made++;
    chron(s, { k: 'band_formed', i: 3, a: [a.id, ...grp.map((p) => p.id), ...new Set(prevs)], t: fmtL(l('Ex-integrantes de {b} formam {a} em {c}.', 'Former members of {b} form {a} in {c}.'), { b: [...new Set(prevs)].map((x) => nameOf(s, x)).join(' e '), a: a.name, c: cityL(city) }) });
  }
}

registerSimHook('year', 'soul9', (s, r) => {
  const st = soulState(s);
  // limpa quem saiu do mundo
  for (const id of Object.keys(st.p)) { const p = s.persons[id]; if (!p || (!p.alive && s.year - (p.died ?? s.year) > 2)) delete st.p[id]; }
  const pace = worldPace(s);
  let acted = 0;
  for (const a of Object.values(s.acts)) {
    if (a.owner === 'player' || a.playerBand || a.status !== 'active' || a.fame < 25) continue;
    // troca de empresário
    if (!a.owner && a.fame > 30 && r.chance(0.04)) {
      a.momentum = clamp(a.momentum + 8, 0, 100);
      chron(s, { k: 'management', i: 1, a: [a.id], t: fmtL(l('{a} troca de empresário.', '{a} changes management.'), { a: a.name }) });
    }
    for (const pid of [...a.members]) {
      const p = s.persons[pid];
      if (!p?.alive || p.isPlayer || st.p[pid]?.dd || acted >= 6) continue;
      const amb = soul(s, p).f.ambicao;
      if (r.chance(0.06 * (0.5 + amb / 100) * pace) && worldDramaOk(s, r, 1) && pursueDream(s, r, a, p)) { acted++; spendDrama(s, 1); break; }
    }
  }
  newBands(s, r);
});

// ---------------------------------------------------------------- canções sobre o mundo

const TRIB = [l('Balada para {p}', 'Ballad for {p}'), l('Adeus, {p}', 'Goodbye, {p}'), l('{p} (In Memoriam)', '{p} (In Memoriam)'), l('Canção para {p}', 'Song for {p}')];
const DISS = [l('Carta para {p}', 'Letter to {p}'), l('{p}, o Falso', '{p}, the Fake'), l('Sem Você na Banda', 'Without You in the Band')];
const CRISIS = [l('Tempos Difíceis', 'Hard Times'), l('Fila do Desemprego', 'Unemployment Line'), l('O Preço do Pão', 'The Price of Bread')];
const REQ = [l('Réquiem para {c}', 'Requiem for {c}'), l('Últimos Dias de {c}', 'Last Days of {c}')];

function worldSongs(s: GameState, e: ChronEv): void {
  if (s.week - (s.flags.song9w ?? -99) < 4) return;
  const pick = <T>(arr: T[]) => arr[(e.y * 7 + e.m + (e.a?.[0]?.length ?? 0)) % arr.length];
  const singer = (exclude: string[], genre?: string): Act | undefined => {
    let best: Act | undefined;
    for (const b of Object.values(s.acts)) if (!exclude.includes(b.id) && b.status === 'active' && b.fame >= 20 && (!genre || b.genre === genre) && (!best || b.fame > best.fame)) best = b;
    return best;
  };
  let a: Act | undefined;
  let title: L | undefined;
  let k = '';
  if (e.k === 'death' && e.i >= 4) {
    const dead = e.a?.find((id) => s.persons[id] && !s.persons[id].alive);
    if (!dead) return;
    const friend = tiesOf(s, dead).filter((t) => t.v > 30).map((t) => (t.a === dead ? t.b : t.a)).map((pid) => actOfP(s, pid)).find(Boolean);
    a = friend ?? singer(e.a ?? [], e.g);
    title = fmtL(pick(TRIB), { p: s.persons[dead].name });
    k = 'song_tribute';
  } else if (e.k === 'split' && e.i >= 4 || e.k === 'breakdown' && e.t.pt.includes('briga')) {
    const src = s.acts[e.a?.[0] ?? ''];
    const ex = src?.members.find((x) => s.persons[x]?.alive);
    if (!src || !ex) return;
    a = actOfP(s, ex) ?? src;
    title = fmtL(pick(DISS), { p: src.name });
    k = 'song_diss';
  } else if (e.k === 'recession' || e.k === 'strike') {
    for (const b of Object.values(s.acts)) {
      if (b.status !== 'active' || b.fame < 20) continue;
      const lead = s.persons[b.leaderId ?? b.members[0]];
      if (lead && soul(s, lead).v.politica > 62) { a = b; break; }
    }
    title = pick(CRISIS);
    k = 'song_crisis';
  } else if (e.k === 'scene_died') {
    a = singer([], e.g);
    title = fmtL(pick(REQ), { c: cityL(e.c) });
    k = 'song_scene';
  }
  if (!a || !title) return;
  s.flags.song9w = s.week;
  chron(s, { k, i: 2, a: [a.id, ...(e.a ?? [])], t: fmtL(l('{a} grava "{t}" — {w}', '{a} records "{t}" — {w}'), { a: a.name, t: title, w: k === 'song_tribute' ? l('um tributo.', 'a tribute.') : k === 'song_diss' ? l('uma indireta que ninguém deixa de entender.', 'a dig nobody misses.') : k === 'song_crisis' ? l('o hino da crise.', 'the anthem of the crisis.') : l('uma despedida da cena.', 'a farewell to the scene.') }) }, true);
  if (a.owner === 'player') notify(s, fmtL(l('{a} quer gravar "{t}".', '{a} wants to record "{t}".'), { a: a.name, t: title }), 'info');
}

// ---------------------------------------------------------------- contratos: valores pesam na proposta

registerOfferMod('soul9', (s, act, o) => {
  const lead = s.persons[act.leaderId && act.members.includes(act.leaderId) ? act.leaderId : act.members[0]];
  if (!lead || lead.isPlayer) return null;
  const { f, v } = soul(s, lead);
  const opts: { d: number; r: L }[] = [];
  if (v.dinheiro >= 70) opts.push(o.advance > 0 ? { d: 3, r: l('valoriza dinheiro: gostou do adiantamento', 'values money: liked the advance') } : { d: -4, r: l('valoriza dinheiro: quer adiantamento', 'values money: wants an advance') });
  if (v.arte >= 70) opts.push(o.creativeControl ? { d: 4, r: l('a arte vem antes: controle criativo pesa', 'art first: creative control matters') } : { d: -3, r: l('a arte vem antes: quer controle criativo', 'art first: wants creative control') });
  if (v.liberdade >= 70 && o.termMonths > 36) opts.push({ d: -4, r: l('não aceita amarras longas', 'refuses long shackles') });
  if (f.lealdade >= 72 && act.trust > 55) opts.push({ d: 3, r: l('leal a quem confia', 'loyal to those they trust') });
  if (f.teimosia >= 75) opts.push({ d: -2, r: l('teimoso: difícil de convencer', 'stubborn: hard to convince') });
  if (!opts.length) return null;
  const best = opts.sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  // d em pontos percentuais; o placar da proposta vai de ~0 a ~1
  return { delta: opts.reduce((t, x) => t + x.d, 0) / 100, reason: fmtL(l('{p}: {r}', '{p}: {r}'), { p: lead.name, r: best.r }) };
});

