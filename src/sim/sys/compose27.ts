// r27 (M1) — COMPOR JOGÁVEL: a sessão de composição vira um mini-jogo de cartas de 3–4 rodadas.
// Cada parceiro de composição traz cartas (Gancho, Letra, Harmonia, Ritmo) com a força da sua habilidade; traços,
// era, gênero e momentos de vida (término, viagem, luto…) trazem cartas especiais. A química entre os parceiros
// muda a mão (mais cartas, combos em dobro) ou a encolhe (discussão). Eventos dentro da sessão: bloqueio,
// inspiração, "ideia emprestada" (risco de processo de plágio depois, pelo writers19) e briga.
//
// Tudo puro e determinístico: cada rodada sorteia de Rng.fromSeed(seed:m1c:ato:semana:rodada) — nunca dos fluxos
// compartilhados. O resultado cai nos atributos que já existem (melodia, letra, originalidade, Q, tema, timbre,
// créditos de autoria) pelo próprio composeSongs; o modo rápido ("Compor" na agenda) não muda em nada.

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { actHasTrait } from '../people';
import { composeSongs, songQ } from '../production';
import type { Act, GameState, Person, Song } from '../types';
import { fmtL } from '../util';
import { setSongTheme20, themeById } from './creation/core';
import { lifeMoments, MOMENTS } from './sound';
import { timbreById } from './sound/timbre';
import { openPlagSuit19 } from './writers19';

// ---------------------------------------------------------------- tipos

export type CardKind27 = 'hook' | 'lyric' | 'harmony' | 'rhythm' | 'special';
/** Efeito de uma carta: melodia, letra, originalidade (pontos de atributo), custo de energia e risco de plágio (0–1). */
export interface Fx27 { me?: number; ly?: number; or?: number; cost?: number; risk?: number }
export interface Card27 {
  id: string; kind: CardKind27; by: string; src: 'writer' | 'trait' | 'era' | 'genre' | 'life' | 'borrowed' | 'cliche';
  name: L; desc: L; fx: Fx27; theme?: string; timbre?: string;
}
export interface Writer27 { id: string; name: string; comp: number; lyr: number; insp: number; fatigue: number }
export type Ev27Code = 'block' | 'inspired' | 'borrow' | 'argue' | 'flow';
export interface Round27 { n: number; hand: Card27[]; ev?: Ev27Code; picked: string[]; combo?: L; rest?: boolean }
export interface Comp27 {
  v: 1; actId: string; week: number; year: number; seed: string;
  writers: Writer27[];
  /** química −1..1 (relação média entre quem escreve, traços) */
  chem: number;
  rounds: number; round: number;
  energy: number; energyMax: number;
  log: Round27[];
  picked: Card27[];
  deck: Card27[];
  /** combos já somados (pontos de melodia/letra/originalidade) */
  bonus: { me: number; ly: number; or: number };
  usedLife: string[]; borrowed: boolean; argued: number; spent: number;
  done: boolean;
}
export interface Totals27 { me: number; ly: number; or: number; risk: number; theme?: string; timbre?: string }
export interface CompResult27 { songs: Song[]; main?: Song; q0: number; q1: number; totals: Totals27; why: L[]; credits: string[]; risk: number }

export const KIND27: Record<CardKind27, { name: L; icon: string }> = {
  hook: { name: l('Gancho', 'Hook'), icon: 'sparkle' },
  lyric: { name: l('Letra', 'Lyric'), icon: 'note' },
  harmony: { name: l('Harmonia', 'Harmony'), icon: 'disc' },
  rhythm: { name: l('Ritmo', 'Rhythm'), icon: 'fire' },
  special: { name: l('Especial', 'Special'), icon: 'star' },
};
export const EV27: Record<Ev27Code, { name: L; text: L; tone: 'good' | 'bad' | 'warn' }> = {
  block: { name: l('Bloqueio criativo', 'Writer\'s block'), text: l('Ninguém consegue sair do lugar: só duas cartas nesta rodada.', 'Nobody can get unstuck: only two cards this round.'), tone: 'bad' },
  inspired: { name: l('Inspiração', 'Inspiration'), text: l('Algo que aconteceu na vida de alguém da mesa vira canção: carta especial na mão.', 'Something from someone\'s life turns into a song: a special card in hand.'), tone: 'good' },
  borrow: { name: l('Ideia emprestada', 'Borrowed idea'), text: l('"Isso lembra aquele sucesso…" — a carta é forte, mas pode virar processo de plágio se a faixa estourar.', '"That sounds like that hit…" — a strong card, but it may become a plagiarism suit if the track blows up.'), tone: 'warn' },
  argue: { name: l('Discussão', 'Argument'), text: l('A mesa discute quem manda na faixa: uma carta a menos e a química cai.', 'The table argues over who owns the track: one card fewer and chemistry drops.'), tone: 'bad' },
  flow: { name: l('Química em alta', 'In the zone'), text: l('Todo mundo na mesma sintonia: combos valem o dobro nesta rodada.', 'Everyone on the same wavelength: combos are worth double this round.'), tone: 'good' },
};

/** Combos: duas cartas de pessoas diferentes que se completam. */
const COMBOS: { a: CardKind27; b: CardKind27; name: L; fx: Fx27 }[] = [
  { a: 'hook', b: 'lyric', name: l('Refrão que gruda', 'A chorus that sticks'), fx: { me: 2, ly: 2 } },
  { a: 'harmony', b: 'rhythm', name: l('Groove', 'Groove'), fx: { me: 3, or: 1 } },
  { a: 'lyric', b: 'harmony', name: l('Balada', 'Ballad'), fx: { ly: 3, me: 1 } },
  { a: 'hook', b: 'rhythm', name: l('Batida grudenta', 'Earworm beat'), fx: { me: 3 } },
];

// ---------------------------------------------------------------- estado (salvo): ideias emprestadas e última sessão

export interface M1State27 { last: Record<string, number>; borrowed: Record<string, number>; chk: Record<string, 1> }
declare module '../ext4' { interface Ext4 { m1c27: M1State27 } }
registerExt4('m1c27', () => ({ last: {}, borrowed: {}, chk: {} }));
const st27 = (s: GameState): M1State27 => {
  const x = s.x4 as unknown as { m1c27?: M1State27 };
  return (x.m1c27 ??= { last: {}, borrowed: {}, chk: {} });
};

const rngAt = (c: Pick<Comp27, 'seed' | 'actId' | 'week'>, tag: string | number) => Rng.fromSeed(`${c.seed}:m1c:${c.actId}:${c.week}:${tag}`);

// ---------------------------------------------------------------- elegibilidade

/** Pode jogar uma sessão de composição agora? (ato seu, alguém que escreva, uma por mês). */
export function composeBlock27(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (a.hiatusUntil && a.hiatusUntil > s.week) return l('O ato está afastado.', 'The act is on a break.');
  if (!writersOf27(s, a).length) return l('Ninguém no ato para escrever.', 'Nobody in the act to write.');
  const last = st27(s).last[actId];
  if (last !== undefined && s.week - last < 4) return l('Já houve uma sessão de composição jogada neste mês.', 'There was already a played writing session this month.');
  if ((s.agenda[actId] ?? []).some((x) => x.action === 'compose' && x.params?.played27)) return l('A composição deste mês já foi jogada.', 'This month\'s writing was already played.');
  return null;
}

function writersOf27(s: GameState, a: Act): Person[] {
  return a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive)
    .sort((x, y) => y.skills.comp + y.skills.lyr - (x.skills.comp + x.skills.lyr)).slice(0, 3);
}

/** Química −1..1 entre quem escreve: relação média, traços sociais. Solo: autoconfiança (moral). */
export function chemistry27(s: GameState, ws: Person[]): number {
  if (ws.length < 2) return clamp((ws[0]?.morale ?? 50) / 100 - 0.4, -0.5, 0.5);
  let t = 0, n = 0;
  for (const a of ws) for (const b of ws) if (a !== b) { t += a.rel[b.id] ?? 0; n++; }
  let c = (n ? t / n : 0) / 60;
  for (const p of ws) {
    if (p.traits.includes('diplomatic')) c += 0.1;
    if (p.traits.includes('quarrelsome')) c -= 0.15;
    if (p.traits.includes('big_ego')) c -= 0.08;
  }
  return Math.round(clamp(c, -1, 1) * 100) / 100;
}

// ---------------------------------------------------------------- baralho

// a habilidade já entra na base do composeSongs: aqui ela só desloca a carta (fraco ainda tira carta boa, às vezes)
const val = (r: Rng, skill: number) => Math.round(clamp(0.5 + (skill - 50) / 18 + r.normal(0, 3), -5, 10));

const TRAIT_CARDS: Record<string, { name: L; desc: L; fx: Fx27; kind?: CardKind27; theme?: string }> = {
  experimental: { name: l('Acorde estranho', 'A strange chord'), desc: l('Ninguém faria assim. Por isso mesmo.', 'Nobody would do it like this. That\'s the point.'), fx: { or: 7, me: -2 } },
  perfectionist: { name: l('Lapidar o refrão', 'Polish the chorus'), desc: l('Mais uma passada, palavra por palavra. Cansa.', 'One more pass, word by word. Tiring.'), fx: { me: 4, ly: 4, cost: 1 } },
  intuitive: { name: l('Primeira ideia', 'First idea'), desc: l('Saiu de primeira e ninguém mexe.', 'Came out in one go and nobody touches it.'), fx: { me: 3, or: 3 } },
  melancholic: { name: l('Tom menor', 'Minor key'), desc: l('Tudo fica mais triste — e mais verdadeiro.', 'Everything gets sadder — and truer.'), fx: { ly: 5, me: 1 }, theme: 'longing' },
  romantic: { name: l('Carta de amor', 'Love letter'), desc: l('Escrita para alguém de verdade.', 'Written for someone real.'), fx: { ly: 5, me: 1 }, theme: 'love' },
  rebel: { name: l('Verso proibido', 'Forbidden verse'), desc: l('A rádio pode não tocar. A rua vai cantar.', 'Radio may not play it. The street will sing it.'), fx: { or: 5, ly: 2 }, theme: 'rebellion' },
  intellectual: { name: l('Referência literária', 'Literary reference'), desc: l('Citação escondida no segundo verso.', 'A quote hidden in the second verse.'), fx: { ly: 6, me: -1 } },
  street: { name: l('Gíria da rua', 'Street slang'), desc: l('Do jeito que se fala na esquina.', 'Just like the corner talks.'), fx: { or: 4, ly: 3 }, theme: 'city' },
  rooted: { name: l('Moda de raiz', 'Roots tune'), desc: l('A melodia que a avó cantava.', 'The melody grandma used to sing.'), fx: { me: 4, or: -1 }, theme: 'nostalgia' },
  purist: { name: l('Pela tradição', 'By the book'), desc: l('Forma clássica, sem invenção.', 'Classic form, no invention.'), fx: { me: 4, or: -2 } },
  impulsive: { name: l('Improviso', 'Improvisation'), desc: l('Tudo ou nada, gravado no celular às 3h.', 'All or nothing, taped at 3 a.m.'), fx: { me: 2, or: 4 } },
  spiritual: { name: l('Hino', 'Hymn'), desc: l('Uma melodia que pede coro.', 'A melody that begs for a choir.'), fx: { me: 4, ly: 1 }, theme: 'faith' },
  party: { name: l('Hino de festa', 'Party anthem'), desc: l('Feita para a pista às 2h.', 'Made for the floor at 2 a.m.'), fx: { me: 4, ly: -1 }, theme: 'party' },
  engaged: { name: l('Palavra de ordem', 'Rallying cry'), desc: l('Uma frase que cabe numa faixa de protesto.', 'A line that fits on a protest banner.'), fx: { ly: 4, or: 2 }, theme: 'protest' },
  blocked: { name: l('Página em branco', 'Blank page'), desc: l('Ficou olhando o caderno a tarde inteira.', 'Stared at the notebook all afternoon.'), fx: { me: -2, ly: -2 } },
};

const ERA_CARDS: { from: number; to: number; name: L; desc: L; fx: Fx27; timbre?: string; kind: CardKind27 }[] = [
  { from: 1880, to: 1955, name: l('Arranjo de big band', 'Big band chart'), desc: l('Metais respondendo à voz.', 'Horns answering the voice.'), fx: { me: 4, or: 1 }, timbre: 'brass', kind: 'harmony' },
  { from: 1955, to: 1975, name: l('Riff elétrico', 'Electric riff'), desc: l('Três notas que todo mundo assobia.', 'Three notes everybody whistles.'), fx: { me: 5 }, timbre: 'fuzz', kind: 'hook' },
  { from: 1968, to: 1990, name: l('Sintetizador novo', 'Brand-new synth'), desc: l('Um som que ainda não tem nome.', 'A sound that has no name yet.'), fx: { or: 5, me: 2 }, timbre: 'analog_synth', kind: 'harmony' },
  { from: 1983, to: 2010, name: l('Colagem de sampler', 'Sampler collage'), desc: l('Um pedaço de disco velho vira base.', 'A slice of an old record becomes the beat.'), fx: { or: 4, me: 3, risk: 0.15 }, timbre: 'sampler', kind: 'rhythm' },
  { from: 1998, to: 2040, name: l('Autotune no refrão', 'Autotuned chorus'), desc: l('Voz de robô, emoção de gente.', 'Robot voice, human feeling.'), fx: { me: 4, or: 1 }, timbre: 'autotune', kind: 'hook' },
  { from: 2012, to: 2040, name: l('Gancho de 15 segundos', '15-second hook'), desc: l('Feito para viralizar num vídeo curto.', 'Built to go viral in a short video.'), fx: { me: 6, or: -3 }, kind: 'hook' },
];

const GENRE_CARDS: Record<string, { name: L; desc: L; fx: Fx27; kind: CardKind27; timbre?: string; theme?: string }> = {
  brazil: { name: l('Síncope de samba', 'Samba syncopation'), desc: l('O tamborim puxa a frase.', 'The tamborim leads the phrase.'), fx: { me: 3, or: 2 }, kind: 'rhythm', timbre: 'cuica' },
  rock: { name: l('Riff de guitarra', 'Guitar riff'), desc: l('Volume no talo.', 'Turned all the way up.'), fx: { me: 4, or: 1 }, kind: 'hook' },
  hiphop: { name: l('Rima afiada', 'Sharp rhyme'), desc: l('Rima interna, sem respirar.', 'Internal rhyme, no breath.'), fx: { ly: 6 }, kind: 'lyric' },
  electronic: { name: l('O drop', 'The drop'), desc: l('Tudo some e volta mais forte.', 'Everything drops out and returns harder.'), fx: { me: 4, or: 1 }, kind: 'rhythm' },
  pop: { name: l('Refrão chiclete', 'Bubblegum chorus'), desc: l('Impossível tirar da cabeça.', 'Impossible to get out of your head.'), fx: { me: 6, or: -2 }, kind: 'hook' },
  blues_jazz: { name: l('Blue note', 'Blue note'), desc: l('A nota que dói no lugar certo.', 'The note that hurts in the right place.'), fx: { me: 2, or: 3 }, kind: 'harmony' },
  country_folk: { name: l('Causo de estrada', 'Road story'), desc: l('Uma história com começo, meio e poeira.', 'A story with a beginning, middle and dust.'), fx: { ly: 5 }, kind: 'lyric', theme: 'road' },
  latin: { name: l('Clave', 'Clave'), desc: l('O padrão que segura tudo.', 'The pattern that holds it all.'), fx: { me: 3, or: 2 }, kind: 'rhythm' },
  rnb: { name: l('Melisma', 'Melisma'), desc: l('A voz passeia pela nota.', 'The voice wanders around the note.'), fx: { me: 4, ly: 1 }, kind: 'hook', timbre: 'falsetto' },
  caribbean: { name: l('Contratempo', 'Offbeat skank'), desc: l('A guitarra no tempo fraco.', 'Guitar on the offbeat.'), fx: { me: 3, or: 2 }, kind: 'rhythm' },
  sacred: { name: l('Coro de igreja', 'Church choir'), desc: l('Vozes em resposta.', 'Call and response voices.'), fx: { me: 4 }, kind: 'harmony', timbre: 'gospel_choir' },
};

const MOMENT_FX: Record<string, Fx27> = { br: { ly: 8, or: 2 }, gr: { ly: 7, me: 2 }, vg: { or: 6, ly: 3 }, lv: { ly: 6, me: 2 }, dv: { ly: 8, or: 1 }, pd: { ly: 8, me: 2 }, in: { me: 5, or: 4 } };

function card(c: Pick<Comp27, 'actId' | 'week'>, n: number, x: Omit<Card27, 'id'>): Card27 { return { id: `${c.actId}:${c.week}:${n}`, ...x }; }

function buildDeck(s: GameState, a: Act, c: Comp27, ws: Person[]): Card27[] {
  const r = rngAt(c, 'deck');
  const out: Card27[] = [];
  let n = 0;
  const add = (x: Omit<Card27, 'id'>) => out.push(card(c, n++, x));
  for (const p of ws) {
    const first = p.name.split(' ')[0];
    for (let k = 0; k < 2; k++) {
      const hv = val(r, p.skills.comp), lv = val(r, p.skills.lyr), mv = val(r, p.skills.comp), rv = val(r, (p.skills.comp + p.skills.instr) / 2);
      add({ kind: 'hook', by: p.id, src: 'writer', name: fmtL(l('Gancho de {p}', '{p}\'s hook'), { p: first }), desc: l('Uma frase melódica para o refrão.', 'A melodic line for the chorus.'), fx: { me: hv } });
      add({ kind: 'lyric', by: p.id, src: 'writer', name: fmtL(l('Verso de {p}', '{p}\'s verse'), { p: first }), desc: l('Palavras para a primeira estrofe.', 'Words for the first verse.'), fx: { ly: lv } });
      add({ kind: 'harmony', by: p.id, src: 'writer', name: fmtL(l('Harmonia de {p}', '{p}\'s chords'), { p: first }), desc: l('Uma sequência de acordes com uma virada.', 'A chord progression with a twist.'), fx: { me: Math.round(mv * 0.5), or: Math.round(mv * 0.6) } });
      add({ kind: 'rhythm', by: p.id, src: 'writer', name: fmtL(l('Levada de {p}', '{p}\'s groove'), { p: first }), desc: l('O balanço que segura a faixa.', 'The groove that carries the track.'), fx: { me: Math.round(rv * 0.8), or: Math.round(rv * 0.2) } });
    }
    for (const tr of p.traits) {
      const d = TRAIT_CARDS[tr];
      if (d) add({ kind: d.kind ?? 'special', by: p.id, src: 'trait', name: d.name, desc: d.desc, fx: d.fx, theme: d.theme });
    }
  }
  for (const e of ERA_CARDS) if (c.year >= e.from && c.year < e.to && (!e.timbre || (timbreById[e.timbre]?.from ?? 0) <= c.year)) add({ kind: e.kind, by: '', src: 'era', name: e.name, desc: e.desc, fx: e.fx, timbre: e.timbre });
  const g = GENRE_CARDS[familyOf(a.genre)];
  if (g) add({ kind: g.kind, by: '', src: 'genre', name: g.name, desc: g.desc, fx: g.fx, timbre: g.timbre, theme: g.theme });
  const sat = clamp((s.scenes[`${a.city}:${a.genre}`] ?? 0) / 40, 0, 0.5);
  add({ kind: 'hook', by: '', src: 'cliche', name: l('Fórmula da moda', 'Trendy formula'), desc: sat > 0.2 ? l('O que todo mundo da cena está fazendo — funciona, mas soa igual.', 'What everyone in the scene is doing — it works, but sounds the same.') : l('O truque que já deu certo mil vezes.', 'The trick that has worked a thousand times.'), fx: { me: 5, or: -6 - Math.round(sat * 8) } });
  return r.shuffle(out);
}

function lifeCard(s: GameState, a: Act, c: Comp27): Card27 | null {
  let ms: { code: string; k: number }[] = [];
  try { ms = lifeMoments(s, a); } catch { ms = []; }
  const m = ms.find((x) => MOMENTS[x.code] && !c.usedLife.includes(x.code) && !['ti', 'st', 'yo', 'ol'].includes(x.code));
  if (!m) return null;
  const d = MOMENTS[m.code];
  const fx = MOMENT_FX[m.code] ?? { ly: 6, or: 3 };
  const k = 0.7 + m.k * 0.5;
  const theme = d.themes?.find((x) => themeById[x]);
  return card(c, 900 + c.usedLife.length, { kind: 'special', by: '', src: 'life', name: fmtL(l('Vivido: {m}', 'Lived: {m}'), { m: d.name }), desc: fmtL(l('Uma canção {p}.', 'A song {p}.'), { p: d.phrase }), fx: { me: Math.round((fx.me ?? 0) * k), ly: Math.round((fx.ly ?? 0) * k), or: Math.round((fx.or ?? 0) * k) }, theme });
}

const borrowedCard = (c: Comp27): Card27 => card(c, 950, { kind: 'special', by: '', src: 'borrowed', name: l('"Isso lembra aquele sucesso…"', '"That sounds like that hit…"'), desc: l('Melodia irresistível — de outra pessoa. Se a faixa estourar, pode virar processo de plágio.', 'An irresistible melody — someone else\'s. If the track blows up, it may become a plagiarism suit.'), fx: { me: 9, ly: 1, or: -4, risk: 0.6 } });

// ---------------------------------------------------------------- rodadas

function deal(s: GameState, c: Comp27): void {
  const a = s.acts[c.actId];
  const r = rngAt(c, `r${c.round}`);
  const avgFat = c.writers.reduce((t, w) => t + w.fatigue, 0) / Math.max(1, c.writers.length);
  const avgInsp = c.writers.reduce((t, w) => t + w.insp, 0) / Math.max(1, c.writers.length);
  let size = c.chem > 0.35 ? 5 : 4;
  let ev: Ev27Code | undefined;
  const blocked = a ? actHasTrait(s, a, 'blocked') : false;
  const pBlock = 0.1 + (avgFat > 60 ? 0.1 : 0) + (blocked ? 0.15 : 0) + (c.energy <= 0 ? 0.12 : 0) - (avgInsp > 70 ? 0.06 : 0);
  const life = a ? lifeCard(s, a, c) : null;
  if (r.chance(pBlock)) ev = 'block';
  else if (life && r.chance(c.round === 0 ? 0.55 : 0.4)) ev = 'inspired';
  else if (!c.borrowed && c.round > 0 && r.chance(0.22)) ev = 'borrow';
  else if (c.writers.length > 1 && c.chem < 0 && r.chance(0.2 - c.chem * 0.3)) ev = 'argue';
  else if (c.writers.length > 1 && c.chem > 0.3 && r.chance(0.3)) ev = 'flow';
  if (ev === 'block') size = 2;
  if (ev === 'argue') size -= 1;
  const hand = c.deck.splice(0, Math.min(size, c.deck.length));
  if (ev === 'inspired' && life) { hand.unshift(life); c.usedLife.push(life.id); }
  if (ev === 'borrow') { hand.push(borrowedCard(c)); c.borrowed = true; }
  if (ev === 'argue') { c.chem = Math.round(clamp(c.chem - 0.1, -1, 1) * 100) / 100; c.argued += 1; }
  c.log.push({ n: c.round + 1, hand, ev, picked: [] });
}

/** Começa a sessão: parceiros, química, energia, baralho e a primeira mão. */
export function startCompose27(s: GameState, actId: string): Comp27 | L {
  const why = composeBlock27(s, actId);
  if (why) return why;
  const a = s.acts[actId];
  const ws = writersOf27(s, a);
  const insp = ws.reduce((t, p) => t + p.inspiration, 0) / ws.length;
  const fat = ws.reduce((t, p) => t + p.fatigue, 0) / ws.length;
  const energyMax = clamp(1 + Math.round(insp / 40) - (fat > 60 ? 1 : 0), 1, 4);
  const c: Comp27 = {
    v: 1, actId, week: s.week, year: s.year, seed: String(s.config.seed),
    writers: ws.map((p) => ({ id: p.id, name: p.name, comp: p.skills.comp, lyr: p.skills.lyr, insp: Math.round(p.inspiration), fatigue: Math.round(p.fatigue) })),
    chem: chemistry27(s, ws), rounds: 3, round: 0, energy: energyMax, energyMax, log: [], picked: [], deck: [],
    bonus: { me: 0, ly: 0, or: 0 }, usedLife: [], borrowed: false, argued: 0, spent: 0, done: false,
  };
  c.rounds = c.chem > 0.2 || ws.length >= 3 ? 4 : 3;
  c.deck = buildDeck(s, a, c, ws);
  deal(s, c);
  return c;
}

/** Joga a rodada: 0 cartas (descansa, +1 energia), 1 carta (grátis) ou 2 (a segunda custa 1 energia; combos). */
export function playRound27(s: GameState, c: Comp27, ids: string[]): L | null {
  if (c.done) return l('Sessão encerrada.', 'Session over.');
  const rd = c.log[c.log.length - 1];
  const pick = ids.map((id) => rd.hand.find((x) => x.id === id)).filter((x): x is Card27 => !!x).slice(0, 2);
  const cost = pick.reduce((t, x) => t + (x.fx.cost ?? 0), 0) + (pick.length > 1 ? 1 : 0);
  if (cost > c.energy) return l('Sem energia para isso: escolha uma carta só ou descanse.', 'Not enough energy: pick a single card or rest.');
  c.energy -= cost;
  c.spent += cost;
  if (!pick.length) { c.energy = Math.min(c.energyMax, c.energy + 1); rd.rest = true; }
  rd.picked = pick.map((x) => x.id);
  c.picked.push(...pick);
  const cb = comboOf27(pick, rd.ev);
  if (cb) {
    c.bonus.me += cb.fx.me ?? 0; c.bonus.ly += cb.fx.ly ?? 0; c.bonus.or += cb.fx.or ?? 0;
    rd.combo = cb.name;
    c.chem = Math.round(clamp(c.chem + 0.05, -1, 1) * 100) / 100;
  }
  // cartas não usadas voltam para o fundo do baralho
  c.deck.push(...rd.hand.filter((x) => !pick.includes(x) && x.src !== 'borrowed' && x.src !== 'life'));
  c.round += 1;
  if (c.round >= c.rounds) c.done = true;
  else deal(s, c);
  return null;
}

/** Combo de duas cartas (pessoas diferentes, tipos que se completam); em "química em alta" vale o dobro. */
export function comboOf27(pick: Card27[], ev?: Ev27Code): { name: L; fx: Fx27 } | null {
  if (pick.length !== 2 || !pick[0].by || !pick[1].by || pick[0].by === pick[1].by) return null;
  const cb = COMBOS.find((x) => (x.a === pick[0].kind && x.b === pick[1].kind) || (x.b === pick[0].kind && x.a === pick[1].kind));
  if (!cb) return null;
  const k = ev === 'flow' ? 2 : 1;
  return { name: cb.name, fx: { me: (cb.fx.me ?? 0) * k, ly: (cb.fx.ly ?? 0) * k, or: (cb.fx.or ?? 0) * k } };
}

/** Prévia: como ficariam os totais se estas cartas fossem jogadas agora. */
export function previewTotals27(c: Comp27, ids: string[]): Totals27 {
  const rd = c.log[c.log.length - 1];
  const sel = ids.map((id) => rd?.hand.find((x) => x.id === id)).filter((x): x is Card27 => !!x);
  const cb = comboOf27(sel, rd?.ev);
  return totals27({ ...c, picked: [...c.picked, ...sel], bonus: { me: c.bonus.me + (cb?.fx.me ?? 0), ly: c.bonus.ly + (cb?.fx.ly ?? 0), or: c.bonus.or + (cb?.fx.or ?? 0) } });
}

/** Soma do que já foi escolhido (antes do teto): o que a música vai ganhar. */
export function totals27(c: Comp27): Totals27 {
  const t: Totals27 = { me: c.bonus.me, ly: c.bonus.ly, or: c.bonus.or, risk: 0 };
  for (const x of c.picked) {
    t.me += x.fx.me ?? 0; t.ly += x.fx.ly ?? 0; t.or += x.fx.or ?? 0; t.risk = Math.max(t.risk, x.fx.risk ?? 0);
    if (x.theme && !t.theme) t.theme = x.theme;
    if (x.timbre && !t.timbre) t.timbre = x.timbre;
  }
  // 0,7: quem joga bem fica ~+10–20% acima do modo rápido (tests/r27-m1); o teto evita sessões absurdas
  const cap = (v: number) => Math.round(clamp(v * 0.7, -16, 18));
  return { ...t, me: cap(t.me), ly: cap(t.ly), or: cap(t.or) };
}

// ---------------------------------------------------------------- resultado

/** Escreve as músicas (mesmo composeSongs do modo rápido, com fluxo próprio) e aplica as cartas. */
export function finishCompose27(s: GameState, c: Comp27): CompResult27 | L {
  const a = s.acts[c.actId];
  if (!a) return l('Ato não encontrado.', 'Act not found.');
  const r = rngAt(c, 'write');
  const prolific = actHasTrait(s, a, 'prolific') ? 1 : 0;
  const n = Math.max(1, Math.round((1 + (r.chance(0.5) ? 1 : 0) + prolific) * (actHasTrait(s, a, 'blocked') ? 0.5 : 1)));
  const songs = composeSongs(s, r, a, n);
  const t = totals27(c);
  const main = songs[0];
  const q0 = main ? main.q : 0;
  songs.forEach((so, i) => {
    const k = i === 0 ? 1 : 0.4;
    so.melody = clamp(so.melody + t.me * k, 5, 100);
    if (!so.instrumental) so.lyrics = clamp(so.lyrics + t.ly * k, 5, 100);
    so.originality = clamp(so.originality + t.or * k, 5, 100);
    so.q = songQ({ ...so, performance: so.melody * 0.6, production: 30 }); // mesma estimativa do composeSongs
  });
  // créditos: quem trouxe cartas usadas, por contribuição
  const contrib: Record<string, number> = {};
  for (const x of c.picked) if (x.by) contrib[x.by] = (contrib[x.by] ?? 0) + Math.abs(x.fx.me ?? 0) + Math.abs(x.fx.ly ?? 0) + Math.abs(x.fx.or ?? 0) + 1;
  const credits = Object.keys(contrib).sort((x, y) => contrib[y] - contrib[x]);
  if (main && credits.length) main.writers = credits;
  if (main && t.theme) setSongTheme20(s, main.id, t.theme);
  if (main?.sound && t.timbre && timbreById[t.timbre] && !(main.sound.t ?? []).includes(t.timbre)) main.sound.t = [...(main.sound.t ?? []), t.timbre].slice(-3);
  // pessoas: energia gasta cansa; discussão estremece; combos aproximam
  const ws = c.writers.map((w) => s.persons[w.id]).filter((p): p is Person => !!p);
  for (const p of ws) {
    p.fatigue = clamp(p.fatigue + c.spent * 2.5, 0, 100);
    if (c.argued) p.stress = clamp(p.stress + 4 * c.argued, 0, 100);
  }
  const combos = c.log.filter((x) => x.combo).length;
  for (const p of ws) for (const q of ws) if (p !== q) p.rel[q.id] = clamp((p.rel[q.id] ?? 0) + combos * 2 - c.argued * 3, -100, 100);
  const st = st27(s);
  st.last[c.actId] = s.week;
  if (main && t.risk > 0) st.borrowed[main.id] = t.risk;
  return { songs, main, q0, q1: main ? main.q : 0, totals: t, why: explain27(c, t), credits, risk: t.risk };
}

/** "Saiu forte/fraca porque…": as maiores contribuições, os eventos e o risco. */
export function explain27(c: Comp27, t = totals27(c)): L[] {
  const out: L[] = [];
  const score = (x: Card27) => (x.fx.me ?? 0) * 0.25 + (x.fx.ly ?? 0) * 0.2 + (x.fx.or ?? 0) * 0.1;
  const sorted = [...c.picked].sort((a, b) => score(b) - score(a));
  const fx = (x: Card27) => [x.fx.me ? `${x.fx.me > 0 ? '+' : ''}${x.fx.me} mel` : '', x.fx.ly ? `${x.fx.ly > 0 ? '+' : ''}${x.fx.ly} let` : '', x.fx.or ? `${x.fx.or > 0 ? '+' : ''}${x.fx.or} ori` : ''].filter(Boolean).join(', ');
  const total = t.me * 0.25 + t.ly * 0.2 + t.or * 0.1;
  out.push(total >= 3 ? l('Saiu forte porque…', 'It came out strong because…') : total <= -1 ? l('Saiu fraca porque…', 'It came out weak because…') : l('Saiu na média porque…', 'It came out average because…'));
  for (const x of sorted.filter((y) => score(y) > 0.4).slice(0, 2)) out.push(fmtL(l('{c} ({f})', '{c} ({f})'), { c: x.name, f: fx(x) }));
  for (const x of sorted.filter((y) => score(y) < 0).slice(-2)) out.push(fmtL(l('{c} pesou contra ({f})', '{c} counted against it ({f})'), { c: x.name, f: fx(x) }));
  const combos = c.log.filter((x) => x.combo).map((x) => x.combo!);
  if (combos.length) out.push(fmtL(l('Combos: {c}', 'Combos: {c}'), { c: combos.map((x) => x.pt).join(', ') }));
  if (c.log.some((x) => x.ev === 'block')) out.push(l('O bloqueio criativo travou uma rodada.', 'Writer\'s block stalled a round.'));
  if (c.argued) out.push(l('A discussão na mesa custou química (e estresse).', 'The argument at the table cost chemistry (and stress).'));
  if (c.log.every((x) => !x.picked.length || x.picked.length === 1) && c.energyMax > 1 && c.energy === c.energyMax) out.push(l('Sobrou energia: dava para ter combinado cartas.', 'Energy left over: you could have combined cards.'));
  if (t.risk > 0) out.push(l('Há uma ideia emprestada na faixa: se ela estourar, o dono pode processar.', 'There is a borrowed idea in the track: if it blows up, the owner may sue.'));
  return out;
}

// ---------------------------------------------------------------- risco de plágio (mês a mês, fluxo próprio)

registerSimHook('month', 'm1c27', (s) => {
  const st = (s.x4 as unknown as { m1c27?: M1State27 }).m1c27;
  if (!st) return;
  for (const [sid, risk] of Object.entries(st.borrowed)) {
    const so = s.songs[sid];
    if (!so) { delete st.borrowed[sid]; continue; }
    const rel = so.releaseId ? s.releases[so.releaseId] : undefined;
    if (!rel || st.chk[sid] || s.week - rel.week < 6) continue;
    st.chk[sid] = 1;
    delete st.borrowed[sid];
    const hit = rel.peak > 0 && rel.peak <= 40 ? 1 : 0.35;
    const r = Rng.fromSeed(`${s.config.seed}:m1plag:${sid}`);
    if (r.chance(clamp(risk * 0.55 * hit * (s.year >= 2015 ? 1.5 : 1), 0, 0.8))) openPlagSuit19(s, r, so);
  }
});

/** Para testes e para a ficha: a faixa carrega uma ideia emprestada? */
export const borrowedRisk27 = (s: GameState, songId: string): number => st27(s).borrowed[songId] ?? 0;
