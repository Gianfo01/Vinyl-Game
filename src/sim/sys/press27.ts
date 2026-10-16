// r27 (P2A) — ENTREVISTAS E COLETIVAS JOGÁVEIS. Uma cena de diálogo: o repórter pergunta, você (o dono) ou o
// artista responde com uma postura — POLÊMICA, CHARMOSA, MISTERIOSA ou ESQUIVA. Cada resposta "cola" ou não
// (desenvoltura de quem fala: atributo de mídia do líder / carisma do dono); o humor do repórter muda as próximas
// perguntas (esquivar demais traz a pergunta quente: o segredo, o escândalo, o boato).
// Saída nos sistemas de sempre, aplicada uma vez no fim:
//   • expectativa (hype12), imagem/popularidade/ímpeto do ato, fãs casuais, superfãs e haters (fandom);
//   • BOATOS: mistério que cola semeia um fato 'rumor' (facts17); a pergunta íntima pode subir a visibilidade de um
//     fato secreto (secret → rumor → public), que os outros sistemas (imprensa, npc17, segredos) já escutam;
//   • RELAÇÕES: rival citado (opinião dos integrantes, hype do rival), crítico citado (criticrel via persona13),
//     veículo da matéria (media17);
//   • RISCO DE ESCÂNDALO: polêmica acumula "calor"; no fim, chance calor/120 de virar escândalo (scandal17);
//   • coletiva sobre uma matéria (media17): a postura dominante vira a resposta oficial (negar/assumir/silêncio);
//   • entrevista da campanha (camp27): o hype volta para a campanha.
// Modo rápido = a entrevista de sempre (scenes/interview.ts) e as respostas de sempre do media17.
// Determinístico: Rng.fromSeed(semente|press27v1|entrevista|pergunta|parte); estado preguiçoso em s.x4.press27.

import { Rng, clamp } from '../../core/rng';
import { LOOKH31 } from '../r31/lookhook31'; // R31 · AP: imagem nas entrevistas
import { familyOf, l, type L } from '../../data/world';
import { CRITICS } from '../../data/content';
import { emitFact, facts17, raiseVisibility, type Fact } from '../facts17';
import { fandomOf } from '../fandom';
import { scandal, scandal17 } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, playerActs, remember } from '../util';
import { campOf27, liveCamps27, pressResult27, type Camp27 } from './camp27';
import { addHype } from './hype12';
import { m17, outletById17, respond, type Resp } from './media17';
import { opine } from './persona13';
import { ownerOf } from './people/owner';
import { cooled, setCool } from './scenes/state';
import { attrById } from './talent/attrs';

export const PRESS27_RNG = 'press27v1';
export type Stance27 = 'controversial' | 'charming' | 'mysterious' | 'deflect';
export const STANCES27: Stance27[] = ['controversial', 'charming', 'mysterious', 'deflect'];
export const STANCE_NAME27: Record<Stance27, L> = {
  controversial: l('Polêmico', 'Controversial'), charming: l('Charmoso', 'Charming'), mysterious: l('Misterioso', 'Mysterious'), deflect: l('Esquivo', 'Deflect'),
};
export const STANCE_HINT27: Record<Stance27, L> = {
  controversial: l('Manchete garantida: muito hype, haters e calor de escândalo. Se não colar, a imagem sofre.', 'Guaranteed headline: lots of hype, haters and scandal heat. If it misfires, image suffers.'),
  charming: l('Seguro e simpático: imagem e relações sobem; rende pouco hype.', 'Safe and likeable: image and relationships rise; little hype.'),
  mysterious: l('Deixa no ar: planta um boato e atiça os fãs fiéis. Repetir irrita o repórter.', 'Leaves it hanging: plants a rumor and stirs core fans. Repeating it annoys the reporter.'),
  deflect: l('Não responde: esfria o calor de escândalo, mas o repórter se irrita e volta mais duro.', 'Does not answer: cools scandal heat, but the reporter gets annoyed and comes back harder.'),
};
export type IvCtx27 = 'press' | 'story' | 'scandal' | 'camp';
export type Topic27 = 'release' | 'rival' | 'critic' | 'rumor' | 'scandal' | 'private' | 'politics' | 'future';
export interface Q27 { topic: Topic27; text: L; ref?: string; refName?: string; hot: boolean }
export interface Fx27 { hype: number; fame: number; img: number; pop: number; core: number; haters: number; heat: number; outlet: number; critic: number; rival: number; trust: number; rumor?: 1; reveal?: 'rumor' | 'public' }
export interface Ans27 { st: Stance27; land: boolean; line: L; react: L; fx: Fx27 }
export interface IvRes27 { hype: number; img: number; pop: number; fame: number; heat: number; scandal: boolean; rumor: boolean; reveal: boolean; resp?: Resp; grade: number; lines: L[] }
export interface Iv27 {
  id: string; ctx: IvCtx27; who: 'act' | 'player'; actId?: string; storyId?: string; campId?: string;
  outlet: L; week: number; nq: number; qs: Q27[]; ans: Ans27[];
  /** humor do repórter (0–100), calor de escândalo (0–100) */
  mood: number; heat: number;
  skill: number;
  status: 'open' | 'done'; res?: IvRes27;
}
interface Press27State { seq: number; done: Record<string, number> }
const st27 = (s: GameState): Press27State => ((s.x4 as unknown as { press27?: Press27State }).press27 ??= { seq: 0, done: {} });
const rng27 = (s: GameState, iv: Iv27, i: number, part: string) => Rng.fromSeed(`${s.config.seed}|${PRESS27_RNG}|${iv.id}|${i}|${part}`);
const Z = (): Fx27 => ({ hype: 0, fame: 0, img: 0, pop: 0, core: 0, haters: 0, heat: 0, outlet: 0, critic: 0, rival: 0, trust: 0 });

// ---------------------------------------------------------------- oportunidades

export interface Opp27 { ctx: IvCtx27; who: 'act' | 'player'; actId?: string; storyId?: string; campId?: string; title: L; why: L; hot?: boolean }
const mineAct = (s: GameState, a: Act | undefined): a is Act => !!a && (a.owner === 'player' || !!a.playerBand) && a.status !== 'retired' && a.status !== 'split';

/** Onde há microfone esperando: matérias abertas, escândalos recentes, convites (artista com fama ≥ 5) e o dono. */
export function opps27(s: GameState): Opp27[] {
  const out: Opp27[] = [];
  const done = (s.x4 as unknown as { press27?: Press27State }).press27?.done ?? {}; // consulta pura (não cria estado)
  for (const sto of m17(s).st) {
    if (sto.st !== 'open' || sto.resp || !sto.a || !playerActs(s).includes(sto.a)) continue;
    if (done[`story:${sto.id}`]) continue;
    out.push({ ctx: 'story', who: 'act', actId: sto.a, storyId: sto.id, hot: sto.tone < 0, title: fmtL(l('Coletiva: "{t}"', 'Press conference: "{t}"'), { t: sto.t }), why: fmtL(l('Matéria em {o}', 'Story in {o}'), { o: outletById17(s, sto.out)?.name ?? '?' }) });
  }
  for (const [actId, m] of Object.entries(scandal17(s).last)) {
    const a = s.acts[actId];
    if (!mineAct(s, a) || s.week - m.w > 8 || done[`scandal:${actId}:${m.w}`]) continue;
    out.push({ ctx: 'scandal', who: 'act', actId, hot: true, title: fmtL(l('Coletiva de crise: {a}', 'Crisis press conference: {a}'), { a: a.name }), why: m.why[0] ?? l('Escândalo recente', 'Recent scandal') });
  }
  for (const c of liveCamps27(s)) if (c.ev.some((e) => e.k === 'press' && e.pick === 'play') && !done[`camp:${c.id}`]) {
    const a = s.acts[c.actId];
    if (a) out.push({ ctx: 'camp', who: 'act', actId: a.id, campId: c.id, title: fmtL(l('Entrevista da campanha de "{t}"', 'Campaign interview for "{t}"'), { t: c.title }), why: l('Convite aceito na campanha', 'Invitation accepted in the campaign') });
  }
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!mineAct(s, a) || a.fame < 5 || !cooled(s, `iv:${id}`, 6)) continue;
    out.push({ ctx: 'press', who: 'act', actId: id, title: fmtL(l('Entrevista: {a}', 'Interview: {a}'), { a: a.name }), why: l('Pedido de imprensa', 'Press request') });
  }
  if (cooled(s, 'iv27:player', 6)) out.push({ ctx: 'press', who: 'player', title: fmtL(l('Entrevista do dono de {c}', '{c} owner interview'), { c: s.config.companyName }), why: l('Perfil de negócios', 'Business profile') });
  return out;
}

export function ivGate27(s: GameState, o: Opp27): L | null {
  if (o.who === 'act') {
    const a = o.actId ? s.acts[o.actId] : undefined;
    if (!mineAct(s, a)) return l('Ato não é seu ou está inativo.', 'Not your act or inactive.');
    if (o.ctx === 'press' && (a.fame < 5 || !cooled(s, `iv:${a.id}`, 6))) return l('Uma entrevista a cada 6 semanas por ato (fama 5+).', 'One interview every 6 weeks per act (fame 5+).');
  } else if (o.ctx === 'press' && !cooled(s, 'iv27:player', 6)) return l('Você deu entrevista há pouco.', 'You gave an interview recently.');
  return null;
}

// ---------------------------------------------------------------- abrir

function speakerSkill(s: GameState, iv: Pick<Iv27, 'who' | 'actId'>): number {
  if (iv.who === 'player') return ownerOf(s).attrs.charisma ?? 50;
  const a = iv.actId ? s.acts[iv.actId] : undefined;
  const p = a ? s.persons[a.leaderId ?? a.members[0]] : undefined;
  return p ? attrById(s, p, 'media') ?? p.persona?.sociability ?? 50 : 50;
}
const outletName = (s: GameState, ctx: IvCtx27): L => s.year >= 2008 ? l('Podcast em vídeo', 'Video podcast') : s.year >= 1981 ? (ctx === 'press' ? l('Canal de clipes', 'Music video channel') : l('Telejornal', 'TV news')) : s.year >= 1950 ? l('Revista de música e TV', 'Music magazine and TV') : l('Rádio e jornal', 'Radio and newspaper');

export function startIv27(s: GameState, o: Opp27): Iv27 | L {
  const g = ivGate27(s, o);
  if (g) return g;
  const st = st27(s);
  const sto = o.storyId ? m17(s).st.find((x) => x.id === o.storyId) : undefined;
  const iv: Iv27 = {
    id: `iv${++st.seq}`, ctx: o.ctx, who: o.who, ...(o.actId ? { actId: o.actId } : {}), ...(o.storyId ? { storyId: o.storyId } : {}), ...(o.campId ? { campId: o.campId } : {}),
    outlet: sto ? l(outletById17(s, sto.out)?.name ?? '?', outletById17(s, sto.out)?.name ?? '?') : outletName(s, o.ctx), week: s.week,
    nq: o.ctx === 'press' ? 4 : 3, qs: [], ans: [], mood: o.ctx === 'press' || o.ctx === 'camp' ? 55 : 40, heat: o.ctx === 'scandal' ? 20 : 0, skill: 50, status: 'open',
  };
  iv.skill = speakerSkill(s, iv);
  // custo de agenda: a mídia cansa os músicos (como a entrevista de sempre) e conta a mesma recarga
  if (o.who === 'act' && o.actId) {
    const a = s.acts[o.actId];
    for (const id of a.members) { const p = s.persons[id]; if (p && !p.isPlayer) p.fatigue = clamp(p.fatigue + 5, 0, 100); }
    if (o.ctx === 'press') setCool(s, `iv:${o.actId}`);
  } else setCool(s, 'iv27:player');
  if (o.ctx === 'story' && o.storyId) st.done[`story:${o.storyId}`] = s.week;
  if (o.ctx === 'scandal' && o.actId) { const m = scandal17(s).last[o.actId]; if (m) st.done[`scandal:${o.actId}:${m.w}`] = s.week; }
  if (o.ctx === 'camp' && o.campId) st.done[`camp:${o.campId}`] = s.week;
  iv.qs.push(nextQ27(s, iv));
  return iv;
}

// ---------------------------------------------------------------- perguntas

const rivalOf = (s: GameState, a: Act): Act | undefined => Object.values(s.acts)
  .filter((b) => b.id !== a.id && b.owner !== 'player' && !b.playerBand && !b.deceased && b.status !== 'retired' && b.status !== 'split' && b.fame >= 20 && familyOf(b.genre) === familyOf(a.genre))
  .sort((x, y) => Math.abs(x.fame - a.fame) - Math.abs(y.fame - a.fame) || (x.id < y.id ? -1 : 1))[0];
const criticsNow = (s: GameState): string[] => (CRITICS as unknown as { name: string; start?: number; end?: number; from?: number; to?: number }[])
  .filter((c) => (c.start ?? c.from ?? 0) <= s.year && s.year <= (c.end ?? c.to ?? 9999)).map((c) => c.name);
/** Fato não público envolvendo o ato ou seus integrantes (a pergunta íntima). */
function privateFact(s: GameState, a: Act | undefined): Fact | undefined {
  if (!a) return undefined;
  const ids = new Set([a.id, ...a.members]);
  return facts17(s).f.filter((f) => f.visibility !== 'public' && s.week - f.w < 104 && f.actors.some((x) => ids.has(x)) && f.kind !== 'hold' && f.kind !== 'hold_used' && f.kind !== 'favor')
    .sort((x, y) => y.severity - x.severity || y.w - x.w)[0];
}

function pool27(s: GameState, iv: Iv27): Q27[] {
  const a = iv.actId ? s.acts[iv.actId] : undefined;
  const who = a?.name ?? s.config.companyName;
  const out: Q27[] = [];
  const pr = a ? s.pendingReleases.find((p) => p.actId === a.id) : undefined;
  const last = a ? a.releases.map((id) => s.releases[id]).filter(Boolean).sort((x, y) => y.week - x.week)[0] : undefined;
  if (pr || last) out.push({ topic: 'release', hot: false, text: pr ? fmtL(l('"{t}" sai em breve. O que o público vai ouvir?', '"{t}" is out soon. What will people hear?'), { t: pr.title }) : fmtL(l('Como foi a recepção de "{t}"?', 'How was "{t}" received?'), { t: last!.title }) });
  const rv = a ? rivalOf(s, a) : undefined;
  if (rv) out.push({ topic: 'rival', hot: false, ref: rv.id, refName: rv.name, text: fmtL(l('Dizem que {r} está fazendo o mesmo som que {a}, só que melhor. Comenta?', 'People say {r} make the same sound as {a}, only better. Comment?'), { r: rv.name, a: who }) });
  const cs = criticsNow(s);
  if (cs.length) { const c = cs[rng27(s, iv, iv.qs.length, 'crit').int(0, cs.length - 1)]; out.push({ topic: 'critic', hot: false, ref: c, refName: c, text: fmtL(l('{c} escreveu que {a} "não tem nada a dizer". Resposta?', '{c} wrote that {a} "have nothing to say". Your answer?'), { c, a: who }) }); }
  if (s.year >= 1960) out.push({ topic: 'politics', hot: false, text: l('Você toma partido nas questões do momento?', 'Do you take sides on the issues of the day?') });
  out.push({ topic: 'future', hot: false, text: fmtL(l('E o futuro de {a}? Algum plano secreto?', 'And the future of {a}? Any secret plans?'), { a: who }) });
  const pf = iv.who === 'act' ? privateFact(s, a) : undefined;
  if (pf) out.push({ topic: 'private', hot: true, ref: pf.id, text: fmtL(l('Uma fonte nos contou: "{t}" É verdade?', 'A source told us: "{t}" Is it true?'), { t: pf.text }) });
  const sto = iv.storyId ? m17(s).st.find((x) => x.id === iv.storyId) : undefined;
  if (sto) out.push({ topic: 'rumor', hot: true, ref: sto.id, text: fmtL(l('Sobre a matéria "{t}": confirma ou nega?', 'About the story "{t}": confirm or deny?'), { t: sto.t }) });
  const sc = a ? scandal17(s).last[a.id] : undefined;
  if (sc && s.week - sc.w <= 12) out.push({ topic: 'scandal', hot: true, text: fmtL(l('{a} vai pedir desculpas pelo que aconteceu?', 'Will {a} apologize for what happened?'), { a: who }) });
  return out;
}
/** A próxima pergunta: abre pelo assunto da ocasião; repórter irritado (humor < 35) vai direto na quente. */
export function nextQ27(s: GameState, iv: Iv27): Q27 {
  const used = new Set(iv.qs.map((q) => q.topic));
  const pool = pool27(s, iv).filter((q) => !used.has(q.topic));
  const want: Topic27 | undefined = iv.qs.length === 0 ? ({ story: 'rumor', scandal: 'scandal', camp: 'release', press: 'release' } as const)[iv.ctx] : undefined;
  const r = rng27(s, iv, iv.qs.length, 'q');
  const hot = pool.filter((q) => q.hot);
  const first = want ? pool.find((q) => q.topic === want) : undefined;
  if (first) return first;
  if (iv.mood < 35 && hot.length) return hot[0];
  const cool = pool.filter((q) => !q.hot);
  const from = cool.length ? cool : pool;
  return from.length ? from[r.int(0, from.length - 1)] : { topic: 'future', hot: false, text: l('Mais alguma coisa para os fãs?', 'Anything else for the fans?') };
}
export const curQ27 = (iv: Iv27): Q27 | undefined => (iv.status === 'open' ? iv.qs[iv.ans.length] : undefined);

// ---------------------------------------------------------------- responder

/** Chance de a resposta colar (sem sorte): desenvoltura de quem fala, humor do repórter e repetição. */
export function land27(iv: Iv27, st: Stance27): number {
  const sk = (iv.skill - 50) / 100;
  const rep = iv.ans.filter((a) => a.st === st).length;
  const base = { charming: 0.75 + sk * 0.5, controversial: 0.55 + sk * 0.4, mysterious: 0.65 + sk * 0.3 - rep * 0.2, deflect: 0.9 }[st];
  return clamp(base + (iv.mood - 50) / 400 - (st === 'charming' ? rep * 0.08 : 0), 0.1, 0.95);
}

const LINES: Record<Stance27, L[]> = {
  controversial: [l('"Sejamos francos: ninguém mais tem coragem de dizer isso."', '"Let\'s be honest: nobody else has the guts to say it."'), l('"Pode escrever: daqui a dez anos vão nos dar razão."', '"Write it down: in ten years they\'ll say we were right."')],
  charming: [l('"Olha, a gente só quer fazer música que abrace as pessoas."', '"Look, we just want to make music that hugs people."'), l('"Que pergunta boa! Deixa eu te contar uma história…"', '"Great question! Let me tell you a story…"')],
  mysterious: [l('"Digamos que… vocês vão descobrir na hora certa."', '"Let\'s say… you\'ll find out at the right time."'), l('"Algumas coisas a gente só fala com a música."', '"Some things we only say through the music."')],
  deflect: [l('"Próxima pergunta."', '"Next question."'), l('"Hoje eu só falo do disco."', '"Today I only talk about the record."')],
};

function fx27(s: GameState, iv: Iv27, q: Q27, st: Stance27, land: boolean): { fx: Fx27; react: L } {
  const f = Z();
  let react: L;
  if (st === 'controversial') {
    if (land) { Object.assign(f, { hype: 8, pop: 3, core: 2, haters: 2, img: -1, heat: 12 }); react = l('O repórter sorri: a manchete está pronta.', 'The reporter grins: the headline writes itself.'); }
    else { Object.assign(f, { hype: 2, img: -5, haters: 4, heat: 25 }); react = l('Pegou mal. O trecho já circula fora de contexto.', 'It landed badly. The clip is already circulating out of context.'); }
  } else if (st === 'charming') {
    if (land) { Object.assign(f, { hype: 3, img: 3, pop: 2, outlet: 3 }); react = l('Risos na sala. Simpatia geral.', 'Laughter in the room. General warmth.'); }
    else { Object.assign(f, { img: -1 }); react = l('Soou ensaiado demais.', 'It sounded too rehearsed.'); }
  } else if (st === 'mysterious') {
    if (land) { Object.assign(f, { hype: 5, core: 2, img: 1, rumor: 1 as const }); react = l('Os fãs vão passar a semana teorizando.', 'Fans will spend the week theorizing.'); }
    else { Object.assign(f, { img: -1 }); react = l('"Isso não é resposta." O repórter fecha a cara.', '"That\'s not an answer." The reporter frowns.'); }
  } else { Object.assign(f, { hype: -1, outlet: -2, heat: -10 }); react = l('Silêncio constrangido. O repórter anota.', 'Awkward silence. The reporter takes a note.'); }
  // o assunto muda o peso
  if (q.topic === 'rival') { if (st === 'controversial') { f.rival = -8; f.hype += 3; f.heat += 4; } else if (st === 'charming' && land) f.rival = 5; }
  if (q.topic === 'critic') { if (st === 'controversial') { f.critic = -12; f.core += 1; } else if (st === 'charming' && land) f.critic = 6; }
  if (q.topic === 'release' && st === 'controversial' && land) f.hype += 4; // "o melhor disco da década": sobe a expectativa (e a régua)
  if (q.topic === 'scandal') {
    if (st === 'charming') { f.heat -= 15; f.img += land ? 4 : 1; f.trust = 2; react = land ? l('O pedido de desculpas soou sincero.', 'The apology sounded sincere.') : l('Desculpas protocolares. Ninguém se convenceu.', 'Boilerplate apology. Nobody bought it.'); }
    else if (st === 'controversial') { f.heat += 20; f.hype += 4; }
    else if (st === 'deflect') f.img -= 2;
  }
  if (q.topic === 'private') {
    if (st === 'controversial') { f.reveal = 'public'; f.hype += 10; f.heat += 15; react = l('Você confirmou ao vivo. Amanhã está em todas as capas.', 'You confirmed it live. Tomorrow it is on every cover.'); }
    else if (st === 'mysterious' && land) { f.reveal = 'rumor'; f.hype += 2; }
    else if (st === 'charming' && land) f.img += 1;
  }
  if (q.topic === 'politics') { if (st === 'controversial') { f.heat += 8; f.core += 1; } else if (st === 'charming' && land) f.img += 1; }
  if (q.topic === 'rumor') { if (st === 'controversial') f.outlet -= 8; }
  return { fx: f, react };
}

/** Responde à pergunta atual com uma postura. Na última, encerra e aplica o resultado. */
export function answer27(s: GameState, iv: Iv27, st: Stance27): Ans27 | L {
  const q = curQ27(iv);
  if (!q) return l('A entrevista acabou.', 'The interview is over.');
  const i = iv.ans.length;
  const r = rng27(s, iv, i, `a:${st}`);
  const land = r.chance(land27(iv, st));
  const { fx, react } = fx27(s, iv, q, st, land);
  const line = LINES[st][r.int(0, LINES[st].length - 1)];
  const a: Ans27 = { st, land, line, react, fx };
  iv.ans.push(a);
  iv.heat = clamp(iv.heat + fx.heat, 0, 100);
  iv.mood = clamp(iv.mood + ({ controversial: land ? 6 : 2, charming: land ? 6 : -2, mysterious: land ? 0 : -10, deflect: -12 }[st]), 0, 100);
  if (iv.ans.length >= iv.nq) finish27(s, iv);
  else iv.qs.push(nextQ27(s, iv));
  return a;
}

/** Postura automática (para "deixar a assessoria responder"): a que mais rende sem risco para quem fala. */
export function autoStance27(iv: Iv27): Stance27 {
  const q = curQ27(iv);
  if (q?.topic === 'scandal' || q?.topic === 'private') return iv.skill >= 55 ? 'charming' : 'deflect';
  return 'charming';
}

// ---------------------------------------------------------------- fim

function finish27(s: GameState, iv: Iv27): void {
  iv.status = 'done';
  const T = Z();
  for (const a of iv.ans) for (const k of Object.keys(T) as (keyof Fx27)[]) if (typeof a.fx[k] === 'number') (T[k] as number) += a.fx[k] as number;
  const act = iv.actId ? s.acts[iv.actId] : undefined;
  const lk31 = act && iv.who === 'act' ? LOOKH31.act?.(s, act, 'press') : null; // R31 · AP: presença diante das câmeras
  if (lk31) T.pop += Math.round((lk31.k - 1) * 20);
  const hype = clamp(T.hype, -10, 20), img = clamp(T.img, -12, 10), pop = clamp(T.pop, -8, 10);
  const lines: L[] = [];
  if (lk31?.why) lines.push(lk31.why);
  const r = rng27(s, iv, 99, 'end');
  const res: IvRes27 = { hype, img, pop, fame: 0, heat: iv.heat, scandal: false, rumor: false, reveal: false, grade: 0, lines };
  if (act && iv.who === 'act') {
    act.image ??= { artistic: 40, popularity: Math.round(act.fame), professionalism: 50, publicImage: 50 };
    act.image.publicImage = clamp(act.image.publicImage + img, 0, 100);
    act.image.popularity = clamp(act.image.popularity + pop, 0, 100);
    act.momentum = clamp(act.momentum + clamp((img + pop + hype / 2) / 3, -6, 6), 0, 100);
    if (pop > 0) act.fans.casual += Math.round(pop * (300 + act.fame * 60));
    const fd = fandomOf(s, act.id);
    if (T.core > 0) fd.superfans += Math.round(T.core * (20 + act.fame * 2));
    if (T.haters > 0) fd.haters += Math.round(T.haters * (40 + act.fame * 8));
    if (T.trust) act.trust = clamp(act.trust + T.trust, 0, 100);
    const camp: Camp27 | undefined = iv.campId ? liveCamps27(s).find((c) => c.id === iv.campId) : undefined;
    if (camp) pressResult27(s, camp, hype);
    else if (hype) addHype(s, s.pendingReleases.some((p) => p.actId === act.id) ? `n:${act.id}` : `a:${act.id}`, `press27:${iv.ctx}`, fmtL(l('Entrevista em {o}', 'Interview on {o}'), { o: iv.outlet }), hype);
    lines.push(fmtL(l('Expectativa {h}, imagem pública {i}, popularidade {p}.', 'Anticipation {h}, public image {i}, popularity {p}.'), { h: sg(hype), i: sg(img), p: sg(pop) }));
  } else {
    const R = s.player.reputation;
    R.artistic = clamp(R.artistic + clamp(Math.round(img / 4), -2, 2), 0, 100);
    R.institutional = clamp(R.institutional + clamp(Math.round((img - T.heat / 10) / 4), -3, 2), 0, 100);
    R.artists = clamp(R.artists + (T.core > 0 ? 1 : 0), 0, 100);
    lines.push(fmtL(l('Reputação: artística {a}, institucional {i}.', 'Reputation: artistic {a}, institutional {i}.'), { a: sg(clamp(Math.round(img / 4), -2, 2)), i: sg(clamp(Math.round((img - T.heat / 10) / 4), -3, 2)) }));
  }
  // relações citadas
  iv.ans.forEach((a, i) => {
    const q = iv.qs[i];
    if (q.topic === 'rival' && a.fx.rival && q.ref) {
      const b = s.acts[q.ref];
      if (b) {
        for (const m of b.members) opine(s, `p:${m}`, a.fx.rival, a.fx.rival < 0 ? l('nos provocou numa entrevista.', 'taunted us in an interview.') : l('falou bem de nós numa entrevista.', 'spoke well of us in an interview.'));
        if (a.fx.rival < 0) addHype(s, `a:${b.id}`, 'press27rival', fmtL(l('Provocado por {a}', 'Taunted by {a}'), { a: act?.name ?? s.config.companyName }), 4);
        lines.push(fmtL(l('{b}: {v} na relação.', '{b}: {v} relationship.'), { b: b.name, v: sg(a.fx.rival) }));
      }
    }
    if (q.topic === 'critic' && a.fx.critic && q.ref) { opine(s, `c:${q.ref}`, a.fx.critic, a.fx.critic < 0 ? l('me atacou numa entrevista.', 'attacked me in an interview.') : l('respondeu com elegância à minha crítica.', 'answered my review gracefully.')); lines.push(fmtL(l('Crítico {c}: {v}.', 'Critic {c}: {v}.'), { c: q.ref, v: sg(a.fx.critic) })); }
    if (q.topic === 'private' && a.fx.reveal && q.ref) {
      const f = facts17(s).f.find((x) => x.id === q.ref);
      if (f && raiseVisibility(f, a.fx.reveal)) { res.reveal = true; lines.push(a.fx.reveal === 'public' ? l('O segredo virou notícia pública.', 'The secret became public news.') : l('O segredo virou boato.', 'The secret became a rumor.')); }
    }
  });
  // boato plantado pelo mistério
  if (iv.ans.some((a) => a.st === 'mysterious' && a.land && a.fx.rumor)) {
    res.rumor = true;
    emitFact(s, { kind: 'statement', actors: [act?.id ?? 'player'], severity: 15, visibility: 'rumor', tags: ['rumor', 'press27', 'mystery'], src: 'press27',
      text: fmtL(l('{a} deixou no ar, numa entrevista, que algo grande vem aí.', '{a} hinted in an interview that something big is coming.'), { a: act?.name ?? s.config.companyName }) });
    lines.push(l('Um boato começou a circular (os fãs teorizam).', 'A rumor started circulating (fans are theorizing).'));
  }
  // veículo da matéria: relação e resposta oficial
  const sto = iv.storyId ? m17(s).st.find((x) => x.id === iv.storyId) : undefined;
  if (sto) {
    m17(s).rel[sto.out] = clamp((m17(s).rel[sto.out] ?? 0) + clamp(T.outlet, -15, 10), -100, 100);
    const a = iv.ans[iv.qs.findIndex((q) => q.topic === 'rumor')] ?? iv.ans[0];
    const resp: Resp = a.st === 'controversial' ? 'deny' : a.st === 'charming' ? (sto.truth ? 'confirm' : 'deny') : 'silent';
    const out = respond(s, sto.id, resp);
    if (out.ok) { res.resp = resp; lines.push(out.text); }
  }
  // calor de escândalo
  if (iv.heat >= 15 && r.chance(iv.heat / 120)) {
    const pol = iv.ans.some((a, i) => iv.qs[i].topic === 'politics' && a.st === 'controversial');
    const who = act?.id ?? 'player';
    scandal(s, who, pol ? 'politics' : 'offense', Math.round(15 + iv.heat / 4), fmtL(l('Declarações de {a} numa entrevista viram escândalo.', '{a}\'s remarks in an interview become a scandal.'), { a: act?.name ?? s.config.companyName }), { tags: ['press27'] });
    res.scandal = true;
    lines.push(l('O calor passou do ponto: a fala virou escândalo.', 'The heat boiled over: the remarks became a scandal.'));
  }
  const good = iv.ans.filter((a) => a.land).length;
  res.grade = clamp(Math.round((good / Math.max(1, iv.ans.length)) * 60 + hype * 1.2 + img * 1.5 - (res.scandal ? 25 : 0)), 0, 100);
  const tx = fmtL(l('{a} em "{o}": expectativa {h}, imagem {i}.', '{a} on "{o}": anticipation {h}, image {i}.'), { a: act?.name ?? s.config.companyName, o: iv.outlet, h: sg(hype), i: sg(img) });
  if (act) remember(s, 'interview', tx, { actId: act.id });
  emitFact(s, { kind: 'statement', actors: [act?.id ?? 'player'], severity: 10 + Math.abs(hype), visibility: 'public', tags: ['media', 'interview', 'press27'], text: tx, src: 'press27' });
  iv.res = res;
}
const sg = (n: number) => (n > 0 ? `+${Math.round(n)}` : String(Math.round(n)));

/** A campanha da entrevista (para a interface mostrar o vínculo). */
export const ivCamp27 = (s: GameState, iv: Iv27): Camp27 | undefined => (iv.campId ? liveCamps27(s).find((c) => c.id === iv.campId) : iv.actId ? campOf27(s, { prId: s.pendingReleases.find((p) => p.actId === iv.actId)?.id }) : undefined);
