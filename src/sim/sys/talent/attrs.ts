// Atributos detalhados de cada pessoa (rodada 5), no espírito de Football Manager / FIFA:
// técnica do instrumento (afinação, alcance, groove, solos...), criação, palco e mídia, mental e físico.
// O valor é derivado das habilidades, da personalidade e dos traços, com uma variação fixa por pessoa
// (hash do id), mais a evolução guardada em s.x4.talent (treino, shows, gravações, idade). Assim os
// saves antigos ganham atributos sem crescer, e só quem evolui ocupa espaço.

import { clamp, hashString } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import type { SkillId } from '../../../data/people';
import { registerExt4 } from '../../ext4';
import type { GameState, Person } from '../../types';

export type AttrGroup = 'tech' | 'create' | 'stage' | 'mind' | 'body';
export type Role = Person['role'];

export interface AttrDef {
  id: string;
  group: AttrGroup;
  name: L;
  desc: L;
  /** valor base (0..100) antes da variação individual e da evolução */
  base: (p: Person, s: GameState) => number;
}

export const GROUP_NAMES: Record<AttrGroup, L> = {
  tech: l('Técnica', 'Technique'),
  create: l('Criação', 'Creativity'),
  stage: l('Palco e mídia', 'Stage and media'),
  mind: l('Mental', 'Mental'),
  body: l('Físico', 'Physical'),
};

export const ROLE_NAMES: Record<Role, L> = {
  vocal: l('Vocal', 'Vocals'), guitar: l('Guitarra', 'Guitar'), bass: l('Baixo', 'Bass'), drums: l('Bateria', 'Drums'), keys: l('Teclados', 'Keys'),
  horns: l('Sopros', 'Horns'), dj: l('DJ', 'DJ'), producer: l('Produção', 'Producer'), mc: l('MC', 'MC'), strings: l('Cordas', 'Strings'), synthetic: l('Voz sintética', 'Synthetic voice'),
};

const persona = (p: Person, k: keyof NonNullable<Person['persona']>): number => p.persona?.[k] ?? 40 + (hashString(`${p.id}:${k}`) % 21);
const has = (p: Person, ...ids: string[]): number => ids.filter((x) => p.traits.includes(x)).length;
const sk = (k: SkillId) => (p: Person) => p.skills[k];
const mix = (a: SkillId, wa: number, b: SkillId) => (p: Person) => p.skills[a] * wa + p.skills[b] * (1 - wa);

const T = (id: string, name: L, desc: L, base: AttrDef['base']): AttrDef => ({ id, group: 'tech', name, desc, base });

/** Técnica específica de cada função. */
export const TECH: Record<Role, AttrDef[]> = {
  vocal: [
    T('pitch', l('Afinação', 'Pitch'), l('Acerta as notas sem correção.', 'Hits the notes without correction.'), sk('voice')),
    T('range', l('Extensão vocal', 'Vocal range'), l('Do grave ao agudo sem perder a cor.', 'From low to high without losing colour.'), sk('voice')),
    T('timbre', l('Timbre', 'Timbre'), l('A voz que se reconhece em dois segundos.', 'A voice recognised in two seconds.'), (p) => p.skills.voice * 0.7 + p.skills.stage * 0.3),
    T('breath', l('Fôlego', 'Breath control'), l('Segura frases longas e shows inteiros.', 'Holds long phrases and whole shows.'), (p) => p.skills.voice * 0.8 + 10),
    T('diction', l('Interpretação', 'Delivery'), l('Faz a letra chegar ao ouvinte.', 'Makes the lyric land.'), mix('voice', 0.6, 'lyr')),
  ],
  guitar: [
    T('technique', l('Técnica', 'Technique'), l('Velocidade e limpeza nas duas mãos.', 'Speed and cleanliness in both hands.'), sk('instr')),
    T('rhythm', l('Base rítmica', 'Rhythm playing'), l('Segura a levada da banda.', 'Holds the band\'s groove.'), sk('instr')),
    T('solo', l('Solos e improviso', 'Solos and improv'), l('Frases que o público assobia.', 'Phrases the crowd whistles.'), mix('instr', 0.75, 'comp')),
    T('tone', l('Timbre e pedais', 'Tone and pedals'), l('Encontra o som certo para cada faixa.', 'Finds the right sound for each track.'), mix('instr', 0.6, 'prod')),
    T('reading', l('Leitura e teoria', 'Reading and theory'), l('Grava rápido, entende arranjos.', 'Records fast, understands charts.'), mix('instr', 0.5, 'comp')),
  ],
  bass: [
    T('groove', l('Groove', 'Groove'), l('O balanço que faz a pista andar.', 'The swing that moves the floor.'), sk('instr')),
    T('technique', l('Técnica', 'Technique'), l('Slap, palheta, dedos, walking.', 'Slap, pick, fingers, walking.'), sk('instr')),
    T('lock', l('Pegada com a bateria', 'Lock with drums'), l('Bumbo e baixo como um só.', 'Kick and bass as one.'), (p) => p.skills.instr * 0.7 + persona(p, 'sociability') * 0.3),
    T('reading', l('Leitura e teoria', 'Reading and theory'), l('Entende harmonia e arranjos.', 'Understands harmony and charts.'), mix('instr', 0.5, 'comp')),
  ],
  drums: [
    T('timing', l('Precisão de tempo', 'Timing'), l('Metrônomo humano.', 'A human metronome.'), sk('instr')),
    T('groove', l('Groove', 'Groove'), l('Sabe onde deixar espaço.', 'Knows where to leave space.'), sk('instr')),
    T('power', l('Potência', 'Power'), l('Pegada de estádio.', 'Stadium-sized hits.'), (p) => p.skills.instr * 0.6 + 25),
    T('dynamics', l('Dinâmica', 'Dynamics'), l('Do sussurro ao trovão.', 'From whisper to thunder.'), mix('instr', 0.8, 'prod')),
    T('rudiments', l('Rudimentos', 'Rudiments'), l('Viradas limpas e criativas.', 'Clean, creative fills.'), sk('instr')),
  ],
  keys: [
    T('technique', l('Técnica', 'Technique'), l('Mãos independentes e rápidas.', 'Fast, independent hands.'), sk('instr')),
    T('voicings', l('Harmonia e voicings', 'Harmony and voicings'), l('Acordes que dão cor à música.', 'Chords that colour the song.'), mix('instr', 0.5, 'comp')),
    T('sounds', l('Timbres e síntese', 'Sounds and synthesis'), l('Programa o som certo.', 'Programs the right sound.'), mix('instr', 0.5, 'prod')),
    T('reading', l('Leitura', 'Reading'), l('Partitura à primeira vista.', 'Sight-reading.'), sk('instr')),
  ],
  horns: [
    T('technique', l('Técnica', 'Technique'), l('Agilidade e articulação.', 'Agility and articulation.'), sk('instr')),
    T('pitch', l('Afinação', 'Intonation'), l('Naipe afinado.', 'In-tune section.'), sk('instr')),
    T('breath', l('Fôlego', 'Breath'), l('Notas longas e potentes.', 'Long, powerful notes.'), (p) => p.skills.instr * 0.7 + 15),
    T('improv', l('Improviso', 'Improvisation'), l('Solos que contam história.', 'Solos that tell a story.'), mix('instr', 0.7, 'comp')),
  ],
  strings: [
    T('technique', l('Técnica', 'Technique'), l('Arco e dedilhado precisos.', 'Precise bowing and fingering.'), sk('instr')),
    T('pitch', l('Afinação', 'Intonation'), l('Sem trastes, sem perdão.', 'No frets, no mercy.'), sk('instr')),
    T('reading', l('Leitura', 'Reading'), l('Toca qualquer arranjo.', 'Plays any arrangement.'), mix('instr', 0.6, 'comp')),
    T('expression', l('Expressão', 'Expression'), l('Faz chorar a plateia.', 'Moves the audience to tears.'), mix('instr', 0.6, 'stage')),
  ],
  dj: [
    T('selection', l('Seleção', 'Selection'), l('O disco certo na hora certa.', 'The right record at the right time.'), mix('prod', 0.5, 'comp')),
    T('mixing', l('Mixagem ao vivo', 'Live mixing'), l('Transições invisíveis.', 'Invisible transitions.'), sk('prod')),
    T('floor', l('Leitura de pista', 'Reading the floor'), l('Sente o público.', 'Feels the crowd.'), mix('stage', 0.6, 'prod')),
    T('scratch', l('Scratch e técnica', 'Scratch and technique'), l('Toca o toca-discos como instrumento.', 'Plays the turntable as an instrument.'), sk('instr')),
  ],
  producer: [
    T('beats', l('Beatmaking', 'Beatmaking'), l('Batidas com assinatura.', 'Signature beats.'), sk('prod')),
    T('design', l('Sound design', 'Sound design'), l('Inventa sons novos.', 'Invents new sounds.'), mix('prod', 0.7, 'comp')),
    T('mixing', l('Mixagem', 'Mixing'), l('Cada instrumento no lugar.', 'Every instrument in its place.'), sk('prod')),
    T('ear', l('Ouvido', 'Ear'), l('Ouve o que falta numa faixa.', 'Hears what a track is missing.'), mix('prod', 0.6, 'comp')),
  ],
  mc: [
    T('flow', l('Flow', 'Flow'), l('Ritmo e cadência das palavras.', 'Rhythm and cadence of words.'), mix('voice', 0.6, 'lyr')),
    T('rhyme', l('Rimas', 'Rhymes'), l('Rimas internas e multissilábicas.', 'Internal and multisyllabic rhymes.'), sk('lyr')),
    T('punch', l('Punchlines', 'Punchlines'), l('Versos que viram citação.', 'Bars that get quoted.'), mix('lyr', 0.7, 'comp')),
    T('freestyle', l('Freestyle', 'Freestyle'), l('Improvisa na batalha.', 'Improvises in battles.'), mix('lyr', 0.5, 'stage')),
    T('diction', l('Dicção', 'Diction'), l('Cada sílaba clara na velocidade.', 'Every syllable clear at speed.'), sk('voice')),
  ],
  synthetic: [
    T('model', l('Modelo de voz', 'Voice model'), l('Realismo da síntese.', 'Realism of the synthesis.'), sk('voice')),
    T('variety', l('Variedade', 'Variety'), l('Muda de estilo sem soar artificial.', 'Switches style without sounding fake.'), mix('voice', 0.5, 'prod')),
    T('stability', l('Estabilidade', 'Stability'), l('Sem artefatos nem alucinações.', 'No artefacts or glitches.'), sk('prod')),
  ],
};

export const COMMON: AttrDef[] = [
  { id: 'melody', group: 'create', name: l('Melodia', 'Melody'), desc: l('Refrões que grudam.', 'Choruses that stick.'), base: sk('comp') },
  { id: 'harmony', group: 'create', name: l('Harmonia', 'Harmony'), desc: l('Progressões além do óbvio.', 'Progressions beyond the obvious.'), base: mix('comp', 0.6, 'instr') },
  { id: 'lyrics', group: 'create', name: l('Letra', 'Lyrics'), desc: l('Imagens, rimas, verdade.', 'Imagery, rhyme, truth.'), base: sk('lyr') },
  { id: 'arrangement', group: 'create', name: l('Arranjo', 'Arrangement'), desc: l('Sabe o que cada instrumento faz.', 'Knows what each instrument does.'), base: mix('comp', 0.5, 'prod') },
  { id: 'creativity', group: 'create', name: l('Criatividade', 'Creativity'), desc: l('Ideias que ninguém teve.', 'Ideas nobody had.'), base: (p) => p.skills.comp * 0.5 + persona(p, 'openness') * 0.5 + has(p, 'experimental', 'intuitive') * 8 - has(p, 'purist', 'blocked') * 8 },
  { id: 'versatility', group: 'create', name: l('Versatilidade', 'Versatility'), desc: l('Transita entre gêneros.', 'Moves between genres.'), base: (p) => (p.skills.comp + p.skills.instr) / 2 * 0.7 + persona(p, 'openness') * 0.3 + has(p, 'chameleon') * 12 - has(p, 'purist') * 10 },
  { id: 'presence', group: 'stage', name: l('Presença de palco', 'Stage presence'), desc: l('Ninguém tira os olhos.', 'Nobody looks away.'), base: sk('stage') },
  { id: 'charisma', group: 'stage', name: l('Carisma', 'Charisma'), desc: l('Conquista pessoas fora do palco.', 'Wins people over off stage.'), base: (p) => p.skills.stage * 0.5 + persona(p, 'sociability') * 0.5 + has(p, 'charismatic') * 14 - has(p, 'loner') * 8 },
  { id: 'crowd', group: 'stage', name: l('Interação com o público', 'Crowd work'), desc: l('Faz o estádio cantar junto.', 'Gets the stadium singing.'), base: (p) => p.skills.stage * 0.7 + persona(p, 'sociability') * 0.3 },
  { id: 'media', group: 'stage', name: l('Desenvoltura na mídia', 'Media savvy'), desc: l('Entrevistas, TV e redes.', 'Interviews, TV and social media.'), base: (p) => p.skills.stage * 0.4 + persona(p, 'sociability') * 0.6 + has(p, 'charismatic', 'big_ego') * 6 - has(p, 'anxious', 'loner') * 8 },
  { id: 'style', group: 'stage', name: l('Visual e estilo', 'Look and style'), desc: l('Imagem que vira tendência.', 'An image that sets trends.'), base: (p) => p.skills.stage * 0.5 + 25 },
  { id: 'professionalism', group: 'mind', name: l('Profissionalismo', 'Professionalism'), desc: l('Chega na hora, entrega o combinado.', 'On time, delivers as agreed.'), base: (p) => persona(p, 'discipline') + has(p, 'disciplined', 'punctual') * 10 - has(p, 'lazy', 'impulsive') * 10 },
  { id: 'consistency', group: 'mind', name: l('Regularidade', 'Consistency'), desc: l('Rende igual em noite boa ou ruim.', 'Same level on good and bad nights.'), base: (p) => persona(p, 'discipline') * 0.5 + persona(p, 'resilience') * 0.5 },
  { id: 'composure', group: 'mind', name: l('Sangue-frio', 'Composure'), desc: l('Não trava sob pressão.', 'Does not freeze under pressure.'), base: (p) => persona(p, 'resilience') + has(p, 'resilient') * 10 - has(p, 'anxious', 'insecure') * 12 },
  { id: 'teamwork', group: 'mind', name: l('Trabalho em equipe', 'Teamwork'), desc: l('Divide o crédito e o palco.', 'Shares credit and stage.'), base: (p) => persona(p, 'sociability') * 0.6 + 20 + has(p, 'loyal', 'diplomatic', 'generous') * 8 - has(p, 'quarrelsome', 'big_ego', 'manipulative') * 10 },
  { id: 'leadership', group: 'mind', name: l('Liderança', 'Leadership'), desc: l('A banda segue quando ele(a) fala.', 'The band follows their lead.'), base: (p) => persona(p, 'ambition') * 0.5 + persona(p, 'sociability') * 0.3 + p.skills.biz * 0.2 + has(p, 'charismatic', 'ambitious') * 6 },
  { id: 'workrate', group: 'mind', name: l('Dedicação', 'Work rate'), desc: l('Ensaia mais que todo mundo.', 'Rehearses more than anyone.'), base: (p) => persona(p, 'discipline') * 0.6 + persona(p, 'ambition') * 0.4 + has(p, 'workaholic', 'perfectionist') * 10 - has(p, 'lazy') * 15 },
  { id: 'stamina', group: 'body', name: l('Resistência', 'Stamina'), desc: l('Aguenta turnê longa.', 'Survives long tours.'), base: (p, s) => 78 - Math.max(0, s.year - p.born - 30) * 0.9 - (p.health === 'addiction' ? 15 : 0) },
  { id: 'fitness', group: 'body', name: l('Condição física', 'Fitness'), desc: l('Energia para coreografia e palco.', 'Energy for choreography and stage.'), base: (p, s) => 72 - Math.max(0, s.year - p.born - 28) * 1.0 + has(p, 'disciplined') * 6 },
];

export const VOCAL_HEALTH: AttrDef = { id: 'vocalhealth', group: 'body', name: l('Saúde vocal', 'Vocal health'), desc: l('Cordas vocais que aguentam a agenda.', 'Vocal cords that survive the schedule.'), base: (p, s) => 80 - Math.max(0, s.year - p.born - 35) * 0.8 - (p.health === 'voice_strain' ? 25 : 0) };

export function attrDefs(p: Person): AttrDef[] {
  const tech = TECH[p.role] ?? TECH.guitar;
  const out = [...tech, ...COMMON];
  if (p.role === 'vocal' || p.role === 'mc') out.push(VOCAL_HEALTH);
  return out;
}

export interface TalentState {
  /** evolução por pessoa e atributo (pode ser negativa) */
  g: Record<string, Record<string, number>>;
  /** aulas em andamento */
  lessons: { personId: string; group: AttrGroup; until: number; cost: number }[];
  /** instrumentos aprendidos depois (pessoa → função → nível extra) */
  extra: Record<string, Record<string, number>>;
}

declare module '../../ext4' {
  interface Ext4 {
    talent: TalentState;
  }
}

registerExt4('talent', () => ({ g: {}, lessons: [], extra: {} }));

export function tal(s: GameState): TalentState {
  const x = s.x4 as unknown as { talent?: TalentState };
  x.talent ??= { g: {}, lessons: [], extra: {} };
  x.talent.extra ??= {};
  return x.talent;
}

/** Variação individual fixa (−12..+12), igual para sempre para a mesma pessoa. */
export function quirk(personId: string, attr: string): number {
  return (hashString(`${personId}|${attr}`) % 25) - 12;
}

export function attrValue(s: GameState, p: Person, def: AttrDef): number {
  const g = tal(s).g[p.id]?.[def.id] ?? 0;
  const ceil = def.group === 'body' ? 99 : Math.max(20, p.potential + 12);
  return Math.round(clamp(def.base(p, s) + quirk(p.id, def.id) + g, 1, Math.min(99, ceil + g)));
}

export function attrsOf(s: GameState, p: Person): { def: AttrDef; value: number }[] {
  return attrDefs(p).map((def) => ({ def, value: attrValue(s, p, def) }));
}

export function attrById(s: GameState, p: Person, id: string): number | undefined {
  const def = attrDefs(p).find((d) => d.id === id);
  return def ? attrValue(s, p, def) : undefined;
}

export function groupAvg(s: GameState, p: Person, group: AttrGroup): number {
  const xs = attrsOf(s, p).filter((x) => x.def.group === group);
  return xs.length ? xs.reduce((t, x) => t + x.value, 0) / xs.length : 50;
}

const WEIGHTS: Record<AttrGroup, number> = { tech: 0.42, create: 0.2, stage: 0.2, mind: 0.12, body: 0.06 };

/** Nota geral (estilo FIFA) para a função da pessoa. */
export function overall(s: GameState, p: Person): number {
  let t = 0;
  let w = 0;
  for (const g of Object.keys(WEIGHTS) as AttrGroup[]) {
    const wt = p.role === 'producer' && g === 'stage' ? 0.08 : p.role === 'producer' && g === 'create' ? 0.32 : WEIGHTS[g];
    t += groupAvg(s, p, g) * wt;
    w += wt;
  }
  return Math.round(t / w);
}

/** Forma recente de −2 (péssima) a +2 (excelente), pelo humor, cansaço, estresse e inspiração. */
export function form(p: Person): number {
  const v = (p.morale - 50) / 25 + (p.inspiration - 50) / 40 - p.fatigue / 45 - p.stress / 60;
  return Math.round(clamp(v, -2, 2));
}

/** Instrumentos secundários: dois papéis extras com nível derivado (e o que foi aprendido). */
export function otherInstruments(s: GameState, p: Person): { role: Role; level: number }[] {
  if (p.role === 'synthetic') return [];
  const roles: Role[] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings', 'producer'];
  const h = hashString(`${p.id}#inst`);
  const opts = roles.filter((r) => r !== p.role);
  const a = opts[h % opts.length];
  const b = opts[(h >> 4) % opts.length];
  const out: { role: Role; level: number }[] = [];
  for (const [i, r] of [a, b].entries()) {
    if (out.some((x) => x.role === r)) continue;
    const base = r === 'vocal' ? p.skills.voice : r === 'producer' ? p.skills.prod : p.skills.instr;
    const lv = Math.round(clamp(base * (0.55 - i * 0.12) + ((h >> (8 + i * 5)) % 20), 5, 90));
    if (lv >= 20) out.push({ role: r, level: lv });
  }
  for (const [r, add] of Object.entries(tal(s).extra[p.id] ?? {})) {
    const cur = out.find((x) => x.role === r);
    if (cur) cur.level = Math.min(95, cur.level + add);
    else if (r !== p.role) out.push({ role: r as Role, level: Math.round(Math.min(95, 15 + add)) });
  }
  return out.sort((x, y) => y.level - x.level);
}

/** Soma evolução a todos os atributos de um grupo (ou a um atributo). */
export function grow(s: GameState, p: Person, groupOrAttr: AttrGroup | string, amount: number): void {
  const g = (tal(s).g[p.id] ??= {});
  const defs = attrDefs(p).filter((d) => d.group === groupOrAttr || d.id === groupOrAttr);
  for (const d of defs) {
    const cur = attrValue(s, p, d);
    // perto do teto o ganho cai (rendimentos decrescentes)
    const room = amount > 0 ? clamp((99 - cur) / 40, 0.15, 1) : 1;
    g[d.id] = Math.round(((g[d.id] ?? 0) + amount * room) * 100) / 100;
  }
}

/** Média de um atributo entre os membros ativos de um ato (para efeitos). */
export function actAttr(s: GameState, memberIds: string[], pick: (p: Person) => number | undefined): number | undefined {
  const xs = memberIds.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive).map(pick).filter((x): x is number => x !== undefined);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

/** Técnica média de uma pessoa (atributos do grupo técnica). */
export function techAvg(s: GameState, p: Person): number {
  return groupAvg(s, p, 'tech');
}

/** Valor estimado de passe/cachê (centavos reais em dólares de hoje, sem inflação). */
export function marketValue(s: GameState, p: Person, fame: number): number {
  const ovr = overall(s, p);
  const age = s.year - p.born;
  const youth = age < 24 ? 1.25 : age > 40 ? 0.6 : 1;
  return Math.round((Math.pow(Math.max(1, ovr - 30), 2) * 12 + fame * fame * 40) * youth);
}
