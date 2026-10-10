// Rodada 18 (item 9) — O MESTRE (diretor criativo como Mestre de D&D). Em cima do diretor (director17), das
// situações (situations17/sitsworld17) e dos Fatos (facts17), o Mestre:
//  • LÊ o mundo: traços (persona13), ambição do jogador (careers12), mágoas/trunfos (holds17), rixas (feud18),
//    estresse (stress17), fama e caixa;
//  • PLANTA GANCHOS: fatos notáveis (sobretudo os seus e os secretos) viram ganchos que voltam meses depois
//    ("Lembra quando…?") — consequência que retorna;
//  • ABRE FIOS DE CAMPANHA (threads) com estágios: prenúncio → complicação → clímax → desfecho; cada estágio espera
//    meses e o clímax espera a fase de clímax da CURVA DE TENSÃO;
//  • CONDUZ A CURVA: calmaria → tensão crescente → clímax → resolução (duração e altura pelo narrador), que mexe no
//    orçamento de situações, na escalada das rixas e na iniciativa dos NPCs;
//  • ARCOS PESSOAIS: a sua jornada (pela sua ambição) e arcos dos NPCs principais (ascensão, queda, redenção,
//    vingança) — cada partida combina fios diferentes;
//  • ADAPTA-SE às suas escolhas: cada resposta fica guardada no fio e muda os estágios seguintes.
// O "Diário do Mestre" (ui/sys/dm18.ts) mostra só o que você sabe.

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { dir17 } from '../director17';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, factById, onFact, recentFacts, type Fact } from '../facts17';
import { grantHold, holdsOf, useHold, voidHolds } from '../holds17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { scandal } from '../scandal17';
import { addStress, relieveLong, stressOf } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { act18, choose18, nameOfKey18, playerSide18, setAgencyPhase18, VERBS18 } from './agency18';
import { careers } from './careers12';
import { activeFeuds18, feud18, leadOf18, setFeudPhase18, shield18, STAGE18, temper18, type Feud18 } from './feud18';
import { addHype } from './hype12';
import { leaders } from './leaders10';
import { opine, opinionOf, per13 } from './persona13';
import { sit17 } from './situations17';

// ---------------------------------------------------------------- curva de tensão

export type Phase18 = 'calm' | 'rising' | 'climax' | 'resolution';
export const PHASE18: Record<Phase18, { name: L; desc: L; target: number; len: [number, number]; sit: number; feud: number; ag: number }> = {
  calm: { name: l('Calmaria', 'Calm'), desc: l('O Mestre deixa respirar: poucas situações, ganchos sendo plantados.', 'The DM lets you breathe: few situations, hooks being planted.'), target: 20, len: [4, 8], sit: -0.4, feud: 0.7, ag: 0.7 },
  rising: { name: l('Tensão crescente', 'Rising tension'), desc: l('Os fios se complicam; rivais se mexem; a pressão sobe.', 'Threads tangle; rivals move; pressure builds.'), target: 55, len: [5, 9], sit: 0.2, feud: 1, ag: 1 },
  climax: { name: l('Clímax', 'Climax'), desc: l('Os fios chegam ao ponto de virada: desfechos, confrontos, revelações.', 'Threads reach their turning point: payoffs, showdowns, revelations.'), target: 85, len: [2, 4], sit: 0.8, feud: 1.35, ag: 1.4 },
  resolution: { name: l('Resolução', 'Resolution'), desc: l('Poeira baixando: consequências, reconciliações, luto, novos começos.', 'Dust settling: consequences, reconciliations, mourning, new beginnings.'), target: 30, len: [2, 4], sit: -0.2, feud: 0.6, ag: 0.8 },
};
const NEXT: Record<Phase18, Phase18> = { calm: 'rising', rising: 'climax', climax: 'resolution', resolution: 'calm' };

// ---------------------------------------------------------------- estado

export interface Hook18 { id: string; f: string; y: number; m: number; t: L; who: string[]; k: string; sec?: 1; used?: number }
export interface Beat18 { w: number; y: number; m: number; t: L; known: boolean; st: number }
export interface Thread18 {
  id: string;
  k: string;
  hero: string;
  cast: Record<string, string>;
  /** estágio atual (próximo a disparar) */
  st: number;
  /** semana mínima do próximo estágio */
  nx: number;
  w: number;
  /** o jogador sabe deste fio */
  known: boolean;
  /** envolve o jogador (fio de campanha) ou é arco de NPC */
  mine: boolean;
  beats: Beat18[];
  hook?: string;
  /** escolhas do jogador neste fio (estágio → ação) */
  ch: Record<string, string>;
  data: Record<string, number | string>;
  done?: L;
  /** mensagem pendente (estágio aguardando resposta) */
  wait?: number;
}
export interface Dm18State { t: number; ph: Phase18; phW: number; phEnd: number; arc: number; hooks: Hook18[]; th: Thread18[]; seq: number; curve: [number, number, Phase18][]; log: { w: number; y: number; m: number; t: L }[] }
declare module '../ext4' { interface Ext4 { dm18: Dm18State } }
const fresh = (): Dm18State => ({ t: 20, ph: 'calm', phW: 0, phEnd: 0, arc: 1, hooks: [], th: [], seq: 0, curve: [], log: [] });
registerExt4('dm18', fresh);
export function dm18(s: GameState): Dm18State {
  const x = s.x4 as unknown as { dm18?: Dm18State };
  const st = (x.dm18 ??= fresh());
  st.hooks ??= []; st.th ??= []; st.curve ??= []; st.log ??= [];
  return st;
}
const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const myActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter(live).sort((a, b) => b.fame - a.fame);
const fac = (s: GameState, k: string, f: string): number => ((per13(s, k)?.facets as Record<string, number> | undefined)?.[f] ?? 50);
const nm = nameOfKey18;
const pkey = (p?: Person): string => (p ? (p.isPlayer ? 'player' : `p:${p.id}`) : 'player');
const yr = (s: GameState, w: number): number => s.config.startYear + Math.floor(w / 52);

/** "Lembra quando…" — o gancho do fio volta como lembrança. */
export function callback18(s: GameState, th: Thread18): L {
  const h = dm18(s).hooks.find((x) => x.id === th.hook);
  if (!h) return l('', '');
  return fmtL(l(' Lembra? "{t}" ({y}).', ' Remember? "{t}" ({y}).'), { t: h.t, y: h.y });
}
const choiceTxt = (th: Thread18, st: number): string | undefined => th.ch[String(st)];

// ---------------------------------------------------------------- ganchos (fatos → lembranças)

const HOOK_KINDS = new Set(['crime', 'scandal', 'affair', 'arrest', 'death', 'betrayal', 'poach', 'feud', 'statement', 'secret_exposed', 'hold_used', 'situation', 'split', 'exit', 'award', 'chart', 'law', 'shooting', 'fan_war', 'deal']);
function mineFact(s: GameState, f: Fact): boolean {
  const mine = new Set(playerActs(s));
  return f.actors.some((id) => id === 'player' || mine.has(id) || !!s.persons[id]?.isPlayer || [...mine].some((a) => s.acts[a]?.members.includes(id)));
}
onFact('*', (s, f) => {
  if (f.src === 'dm18' || !HOOK_KINDS.has(f.kind)) return;
  const mine = mineFact(s, f);
  if (!(mine ? f.severity >= 28 : f.severity >= 70 && f.visibility !== 'secret')) return;
  const st = dm18(s);
  st.hooks.push({ id: `h${++st.seq}`, f: f.id, y: f.y, m: f.m, t: f.text, who: f.actors.slice(0, 4), k: f.kind, ...(f.visibility === 'secret' ? { sec: 1 as const } : {}) });
  if (st.hooks.length > 60) st.hooks.splice(0, st.hooks.length - 60);
}, 'dm18:hooks');

// ---------------------------------------------------------------- fios (templates)

export interface BeatOut { t: L; ask?: { id: string; label: L }[]; tone?: 'good' | 'bad' | 'info'; end?: L }
export interface ThreadDef18 {
  k: string;
  name: L;
  /** resumo para o Diário (com o elenco) */
  sum: (s: GameState, th: Thread18) => L;
  /** fio de campanha (envolve você) ou arco de NPC */
  mine: boolean;
  /** tenta abrir: devolve o elenco */
  open: (s: GameState, r: Rng) => Pick<Thread18, 'hero' | 'cast' | 'data'> & { hook?: string } | null;
  /** estágios: espera em meses, se precisa do clímax, e o que acontece */
  beats: { gap: [number, number]; climax?: boolean; run: (s: GameState, th: Thread18, r: Rng) => BeatOut | null }[];
  /** resposta do jogador a um estágio com pergunta */
  reply?: (s: GameState, th: Thread18, st: number, action: string, r: Rng) => L;
}
export const THREADS18: ThreadDef18[] = [];
export const registerThread18 = (d: ThreadDef18): void => { const i = THREADS18.findIndex((x) => x.k === d.k); if (i >= 0) THREADS18[i] = d; else THREADS18.push(d); };
const defOf = (k: string): ThreadDef18 | undefined => THREADS18.find((d) => d.k === k);
const openThreads = (s: GameState) => dm18(s).th.filter((t) => !t.done);
const busy = (s: GameState, id: string) => openThreads(s).some((t) => t.hero === id || Object.values(t.cast).includes(id));
const freeHook = (s: GameState, pred: (h: Hook18) => boolean): Hook18 | undefined => dm18(s).hooks.find((h) => !h.used && pred(h));
const ok = (s: GameState, k: string): boolean => !shield18(s, k) && !shield18(s, k.startsWith('p:') ? k.slice(2) : k);

// 1. O segredo vai vazar
registerThread18({
  k: 'secret', name: l('O segredo', 'The secret'), mine: true,
  sum: (s, th) => fmtL(l('Alguém sabe de algo seu: "{t}".', 'Someone knows something of yours: "{t}".'), { t: String(th.data.t ?? '?') }),
  open: (s) => {
    const h = holdsOf(s, 'player').owes.find((x) => x.kind === 'secret' && x.status === 'open' && x.holder !== 'player' && !busy(s, x.holder) && ok(s, x.holder))
      ?? openSecretOnMine(s);
    if (!h) return null;
    return { hero: h.holder, cast: {}, data: { hold: h.id, t: h.text.pt.slice(0, 80), te: h.text.en.slice(0, 80) } };
  },
  beats: [
    { gap: [1, 3], run: (s, th) => ({ t: fmtL(l('Um repórter anda fazendo perguntas sobre você — perguntas certas demais.', 'A reporter is asking questions about you — too accurate.'), {}), tone: 'info' }) },
    { gap: [2, 5], run: (s, th) => ({ t: fmtL(l('{a} pede um encontro: "sei de \'{t}\'. Vamos conversar como adultos."', '{a} asks for a meeting: "I know about \'{t}\'. Let\'s talk like adults."'), { a: nm(s, th.hero), t: String(th.data.t) }), tone: 'bad', ask: [
      { id: 'pay', label: fmtL(l('Pagar pelo silêncio (−${v})', 'Pay for silence (−${v})'), { v: Math.round(money(s, 15000) / 100).toLocaleString() }) },
      { id: 'confess', label: l('Confessar antes (escândalo menor agora)', 'Come clean first (smaller scandal now)') },
      { id: 'deny', label: l('Negar e pagar para ver', 'Deny and call the bluff') }] }) },
    { gap: [2, 6], climax: true, run: (s, th) => {
      const c = choiceTxt(th, 1);
      if (c === 'pay' || c === 'confess') return { t: c === 'pay' ? l('O segredo continua enterrado. Por enquanto — quem foi pago uma vez sabe o caminho.', 'The secret stays buried. For now — whoever was paid once knows the way.') : l('A confissão envelheceu bem: o público já esqueceu.', 'The confession aged well: the public has already forgotten.'), end: l('segredo resolvido', 'secret settled') };
      const h = holdsOf(s, th.hero).has.find((x) => x.id === th.data.hold);
      const u = h ? useHold(s, h.id, 'expose') : null;
      const a = myActs(s)[0];
      if (a) scandal(s, a.id, 'conduct', 45, u?.text ?? l('Segredo exposto', 'Secret exposed'), { tags: ['dm18'] });
      return { t: fmtL(l('{a} cumpriu a ameaça: o segredo saiu na imprensa.{c}', '{a} followed through: the secret hit the press.{c}'), { a: nm(s, th.hero), c: callback18(s, th) }), tone: 'bad', end: l('segredo exposto', 'secret exposed') };
    } },
  ],
  reply: (s, th, _st, a, r) => {
    if (a === 'pay') { post(s, `dm18pay:${th.id}`, -money(s, 15000), 'legal', 'Silêncio'); grantHold(s, { holder: th.hero, target: 'player', kind: 'blackmail', strength: 45, months: 48, src: 'dm18', text: l('Já pagou uma vez', 'Paid once'), quiet: true }); return l('Pago. Ele some — por ora.', 'Paid. They vanish — for now.'); }
    if (a === 'confess') { const x = myActs(s)[0]; if (x) scandal(s, x.id, 'conduct', 22, l('Você mesmo contou: escândalo pequeno.', 'You told it yourself: a small scandal.'), { tags: ['dm18'] }); voidHolds(s, (h) => h.id === th.data.hold); return l('Você contou primeiro: dói menos (escândalo 22 em vez de 45).', 'You told it first: hurts less (scandal 22 instead of 45).'); }
    return r.chance(0.3) ? l('Ele hesita: talvez seja blefe.', 'They hesitate: maybe it is a bluff.') : l('Ele sorri: "você vai se arrepender".', 'They smile: "you will regret this".');
  },
});
function openSecretOnMine(s: GameState) {
  const mine = new Set(myActs(s).flatMap((a) => a.members));
  for (const id of mine) { const h = holdsOf(s, id).owes.find((x) => x.kind === 'secret' && x.status === 'open' && !playerSide18(s, s.persons[x.holder] ? `p:${x.holder}` : x.holder) && !busy(s, x.holder) && ok(s, x.holder)); if (h) return h; }
  return undefined;
}

// 2. Mágoa antiga
registerThread18({
  k: 'grudge', name: l('Mágoa antiga', 'Old grudge'), mine: true,
  sum: (s, th) => fmtL(l('{a} não esqueceu o que você fez.', '{a} hasn\'t forgotten what you did.'), { a: nm(s, th.hero) }),
  open: (s) => {
    const h = holdsOf(s, 'player').owes.find((x) => x.kind === 'grievance' && x.status === 'open' && !busy(s, x.holder) && ok(s, x.holder));
    if (!h) return null;
    const key = s.persons[h.holder] ? `p:${h.holder}` : h.holder;
    const hk = freeHook(s, (x) => x.who.includes(h.holder));
    return { hero: key, cast: {}, data: { why: h.text.pt.slice(0, 60) }, hook: hk?.id };
  },
  beats: [
    { gap: [1, 3], run: (s, th) => ({ t: fmtL(l('{a} fala mal de você em jantares da indústria.{c}', '{a} badmouths you at industry dinners.{c}'), { a: nm(s, th.hero), c: callback18(s, th) }) }) },
    { gap: [2, 4], run: (s, th, r) => { forceVerb(s, th.hero, 'player', ['rumor', 'diss', 'sue', 'poach'], r); return { t: fmtL(l('{a} passa das palavras aos atos.', '{a} moves from words to deeds.'), { a: nm(s, th.hero) }), tone: 'bad' }; } },
    { gap: [2, 5], climax: true, run: (s, th) => ({ t: fmtL(l('Encontro inesperado com {a} numa festa. Todos olham. O que você faz?', 'Unexpected run-in with {a} at a party. Everyone watches. What do you do?'), { a: nm(s, th.hero) }), ask: [
      { id: 'apologize', label: l('Pedir desculpas em público', 'Apologize in public') },
      { id: 'buy', label: fmtL(l('Oferecer um negócio (−${v})', 'Offer a deal (−${v})'), { v: Math.round(money(s, 10000) / 100).toLocaleString() }) },
      { id: 'cold', label: l('Virar as costas', 'Turn your back') }] }) },
    { gap: [2, 6], run: (s, th, r) => {
      const c = choiceTxt(th, 2);
      if (c === 'cold') { forceVerb(s, th.hero, 'player', ['expose', 'sabotage', 'intimidate', 'sue', 'diss'], r); return { t: fmtL(l('{a} jura vingança eterna — e cumpre um pouco dela.{c}', '{a} swears eternal revenge — and delivers some of it.{c}'), { a: nm(s, th.hero), c: callback18(s, th) }), tone: 'bad', end: l('inimigo para a vida', 'an enemy for life') }; }
      return { t: fmtL(l('{a} manda uma garrafa e um bilhete: "estamos quites".', '{a} sends a bottle and a note: "we\'re even".'), { a: nm(s, th.hero) }), tone: 'good', end: l('mágoa encerrada', 'grudge settled') };
    } },
  ],
  reply: (s, th, _st, a, r) => {
    const p = clamp(0.4 + (fac(s, th.hero, 'empatia') - 50) / 120, 0.1, 0.85);
    if (a === 'apologize') { if (r.chance(p)) { voidHolds(s, (h) => h.kind === 'grievance' && h.target === 'player' && (h.holder === th.hero || `p:${h.holder}` === th.hero)); opine(s, th.hero, 25, l('Desculpas públicas', 'Public apology')); return fmtL(l('{a} aceita ({p}%).', '{a} accepts ({p}%).'), { a: nm(s, th.hero), p: Math.round(p * 100) }); } th.ch['2'] = 'cold'; return fmtL(l('{a} ri na sua cara ({p}%).', '{a} laughs in your face ({p}%).'), { a: nm(s, th.hero), p: Math.round(p * 100) }); }
    if (a === 'buy') { post(s, `dm18buy:${th.id}`, -money(s, 10000), 'legal', 'Acordo de paz'); opine(s, th.hero, 15, l('Negócio', 'Deal')); return l('Negócio fechado: dinheiro cala muita mágoa.', 'Deal done: money quiets many grudges.'); }
    opine(s, th.hero, -10, l('Desprezo', 'Contempt'));
    return l('Você vira as costas. A sala inteira viu.', 'You turn your back. The whole room saw.');
  },
});

// 3. O rival em ascensão
registerThread18({
  k: 'rival_rise', name: l('O rival em ascensão', 'The rising rival'), mine: true,
  sum: (s, th) => fmtL(l('{r} cresce na mesma cena de {m}.', '{r} is rising in the same scene as {m}.'), { r: s.acts[th.cast.rival]?.name ?? '?', m: s.acts[th.cast.mine]?.name ?? '?' }),
  open: (s, r) => {
    const m = myActs(s)[0];
    if (!m) return null;
    const c = Object.values(s.acts).filter((a) => live(a) && a.owner !== 'player' && !a.playerBand && familyOf(a.genre) === familyOf(m.genre) && a.fame < m.fame + 15 && a.fame > m.fame - 25 && a.momentum > 50 && ok(s, a.id) && !busy(s, a.id));
    if (!c.length) return null;
    const a = r.pick(c);
    return { hero: a.id, cast: { rival: a.id, mine: m.id }, data: {} };
  },
  beats: [
    { gap: [1, 2], run: (s, th) => ({ t: fmtL(l('Seu A&R avisa: "fiquem de olho em {r}. Estão falando deles em toda parte."', 'Your A&R warns: "keep an eye on {r}. They\'re being talked about everywhere."'), { r: s.acts[th.cast.rival]?.name ?? '?' }), tone: 'info' }) },
    { gap: [2, 4], run: (s, th) => { const a = s.acts[th.cast.rival]; if (!live(a)) return null; a.momentum = clamp(a.momentum + 8, 0, 100); addHype(s, `a:${a.id}`, 'dm18rise', l('Em ascensão', 'Rising'), 10); return { t: fmtL(l('{r} esgota uma turnê e roubou a capa da revista que era de {m}.', '{r} sells out a tour and took the magazine cover meant for {m}.'), { r: a.name, m: s.acts[th.cast.mine]?.name ?? '?' }), tone: 'bad' }; } },
    { gap: [2, 5], climax: true, run: (s, th) => ({ t: fmtL(l('{r} e {m} vão lançar no mesmo mês. A imprensa quer um duelo.', '{r} and {m} are releasing in the same month. The press wants a duel.'), { r: s.acts[th.cast.rival]?.name ?? '?', m: s.acts[th.cast.mine]?.name ?? '?' }), ask: [
      { id: 'push', label: fmtL(l('Campanha pesada (−${v}, hype +15)', 'Heavy campaign (−${v}, hype +15)'), { v: Math.round(money(s, 12000) / 100).toLocaleString() }) },
      { id: 'collab', label: l('Propor um feat (os dois ganham)', 'Propose a feat (both win)') },
      { id: 'dodge', label: l('Adiar o seu lançamento', 'Delay your release') }] }) },
    { gap: [2, 4], run: (s, th) => {
      const a = s.acts[th.cast.rival], m = s.acts[th.cast.mine];
      if (!a || !m) return { t: l('O duelo perdeu o sentido.', 'The duel lost its meaning.'), end: l('sem duelo', 'no duel') };
      const won = m.fame + m.momentum / 4 >= a.fame + a.momentum / 4;
      const c = choiceTxt(th, 2);
      return { t: c === 'collab' ? fmtL(l('O feat de {m} com {r} virou hino da cena. Rivais viraram parceiros.', 'The {m} × {r} feat became the scene\'s anthem. Rivals became partners.'), { m: m.name, r: a.name }) : won ? fmtL(l('{m} venceu o duelo: o trono da cena é seu.', '{m} won the duel: the scene\'s throne is yours.'), { m: m.name }) : fmtL(l('{r} venceu o duelo. A cena tem um novo rei.', '{r} won the duel. The scene has a new king.'), { r: a.name }), tone: won || c === 'collab' ? 'good' : 'bad', end: won ? l('você venceu', 'you won') : l('o rival venceu', 'the rival won') };
    } },
  ],
  reply: (s, th, _st, a) => {
    const m = s.acts[th.cast.mine], rv = s.acts[th.cast.rival];
    if (a === 'push' && m) { post(s, `dm18push:${th.id}`, -money(s, 12000), 'marketing', 'Campanha do duelo'); addHype(s, `a:${m.id}`, 'dm18duel', l('Duelo de lançamentos', 'Release duel'), 15); return l('Campanha na rua: hype +15.', 'Campaign out: hype +15.'); }
    if (a === 'collab' && m && rv) { for (const x of [m, rv]) { x.momentum = clamp(x.momentum + 8, 0, 100); addHype(s, `a:${x.id}`, 'dm18feat', l('Feat dos rivais', 'Rivals\' feat'), 10); } return l('Feat marcado: embalo +8 para os dois.', 'Feat booked: momentum +8 for both.'); }
    if (m) m.momentum = clamp(m.momentum - 4, 0, 100);
    return l('Você saiu da frente. Prudente — ou medroso?', 'You stepped aside. Prudent — or scared?');
  },
});

// 4. Ascensão e queda (sua estrela)
registerThread18({
  k: 'fall', name: l('Ascensão e queda', 'Rise and fall'), mine: true,
  sum: (s, th) => fmtL(l('{p}, sua estrela, voa alto demais.', '{p}, your star, flies too high.'), { p: nm(s, th.hero) }),
  open: (s) => {
    for (const a of myActs(s).slice(0, 3)) {
      const p = leadOf18(s, a);
      if (!p || p.isPlayer || busy(s, `p:${p.id}`)) continue;
      const k = `p:${p.id}`;
      if ((fac(s, k, 'ego') + fac(s, k, 'vaidade') + fac(s, k, 'impulsividade')) / 3 > 58 || stressOf(s, p.id).short > 45) return { hero: k, cast: { act: a.id }, data: {} };
    }
    return null;
  },
  beats: [
    { gap: [1, 3], run: (s, th) => { const a = s.acts[th.cast.act]; if (a) a.momentum = clamp(a.momentum + 5, 0, 100); return { t: fmtL(l('{p} está em todas: festas, capas, entourage. Tudo dá certo — por enquanto.', '{p} is everywhere: parties, covers, entourage. Everything works — for now.'), { p: nm(s, th.hero) }), tone: 'good' }; } },
    { gap: [2, 4], run: (s, th) => ({ t: fmtL(l('O empresário de turnê liga: "{p} chegou duas horas atrasado(a) e brigou com a equipe. Isso vai piorar."', 'The tour manager calls: "{p} showed up two hours late and fought with the crew. This will get worse."'), { p: nm(s, th.hero) }), tone: 'bad', ask: [
      { id: 'rest', label: l('Pausa forçada de 1 mês (estresse −, embalo −)', 'Forced 1-month break (stress −, momentum −)') },
      { id: 'ride', label: l('Deixar voar (hype +, estresse +)', 'Let them fly (hype +, stress +)') }] }) },
    { gap: [2, 5], climax: true, run: (s, th, r) => {
      const pid = th.hero.slice(2); const p = s.persons[pid]; const a = s.acts[th.cast.act];
      if (!p?.alive || !a) return { t: l('A história terminou antes do clímax.', 'The story ended before its climax.'), end: l('interrompida', 'cut short') };
      const sr = stressOf(s, pid);
      const crash = choiceTxt(th, 1) === 'ride' ? r.chance(0.55 + sr.short / 300) : r.chance(0.15 + sr.short / 400);
      if (crash) { scandal(s, a.id, 'meltdown', 50, fmtL(l('{p} desmorona em público.', '{p} melts down in public.'), { p: p.name }), { person: pid, tags: ['dm18'] }); addStress(s, pid, 15, l('Queda pública', 'Public fall')); th.data.fell = 1; return { t: fmtL(l('A queda: {p} desmorona no palco. As manchetes não perdoam.{c}', 'The fall: {p} collapses on stage. The headlines show no mercy.{c}'), { p: p.name, c: choiceTxt(th, 1) === 'ride' ? l(' Você deixou voar.', ' You let them fly.') : '' }), tone: 'bad' }; }
      addHype(s, `a:${a.id}`, 'dm18peak', l('Auge', 'Peak'), 15);
      return { t: fmtL(l('O auge: {p} faz a noite da vida e sai maior do que entrou.', 'The peak: {p} plays the night of their life and comes out bigger.'), { p: p.name }), tone: 'good' };
    } },
    { gap: [3, 6], run: (s, th) => {
      const pid = th.hero.slice(2);
      if (th.data.fell) { relieveLong(s, pid, 15); return { t: fmtL(l('Redenção: {p} volta mais humilde. O público adora uma segunda chance.', 'Redemption: {p} returns humbler. The public loves a second chance.'), { p: nm(s, th.hero) }), tone: 'good', end: l('queda e redenção', 'fall and redemption') }; }
      return { t: fmtL(l('{p} aprendeu a lidar com a fama — por enquanto.', '{p} has learned to handle fame — for now.'), { p: nm(s, th.hero) }), end: l('sobreviveu ao auge', 'survived the peak') };
    } },
  ],
  reply: (s, th, _st, a) => {
    const pid = th.hero.slice(2); const x = s.acts[th.cast.act];
    if (a === 'rest') { addStress(s, pid, -15, l('Pausa forçada', 'Forced break')); if (x) { x.momentum = clamp(x.momentum - 6, 0, 100); x.hiatusUntil = Math.max(x.hiatusUntil ?? 0, s.week + 4); } return l('Pausa: estresse −15, embalo −6.', 'Break: stress −15, momentum −6.'); }
    if (x) addHype(s, `a:${x.id}`, 'dm18ride', l('Sem freio', 'No brakes'), 8);
    addStress(s, pid, 10, l('Sem freio', 'No brakes'));
    return l('Sem freio: hype +8, estresse +10.', 'No brakes: hype +8, stress +10.');
  },
});

// 5. A conta chega (favor/dívida)
registerThread18({
  k: 'debt', name: l('A conta chega', 'The bill comes due'), mine: true,
  sum: (s, th) => fmtL(l('Você deve um favor a {a}.', 'You owe {a} a favor.'), { a: nm(s, th.hero) }),
  open: (s) => {
    const h = holdsOf(s, 'player').owes.find((x) => (x.kind === 'favor' || x.kind === 'debt') && x.status === 'open' && !busy(s, x.holder) && ok(s, x.holder));
    if (!h) return null;
    return { hero: s.persons[h.holder] ? `p:${h.holder}` : h.holder, cast: {}, data: { hold: h.id, t: h.text.pt.slice(0, 60) } };
  },
  beats: [
    { gap: [2, 5], run: (s, th) => ({ t: fmtL(l('{a} manda lembranças. Só isso. Por enquanto.', '{a} sends regards. That\'s all. For now.'), { a: nm(s, th.hero) }) }) },
    { gap: [2, 6], climax: true, run: (s, th) => ({ t: fmtL(l('{a} cobra o favor: quer que um artista seu abra os shows do protegido dele(a) de graça — ou dinheiro.', '{a} calls in the favor: wants one of your acts to open for their protégé for free — or cash.'), { a: nm(s, th.hero) }), ask: [
      { id: 'comply', label: l('Cumprir (embalo −5 no seu maior ato)', 'Comply (momentum −5 on your top act)') },
      { id: 'cash', label: fmtL(l('Pagar (−${v})', 'Pay (−${v})'), { v: Math.round(money(s, 8000) / 100).toLocaleString() }) },
      { id: 'refuse', label: l('Recusar (vira mágoa)', 'Refuse (becomes a grudge)') }] }) },
    { gap: [1, 3], run: (s, th) => ({ t: choiceTxt(th, 1) === 'refuse' ? fmtL(l('{a} conta a todos que você não honra a palavra.', '{a} tells everyone you don\'t keep your word.'), { a: nm(s, th.hero) }) : fmtL(l('{a}: "Estamos quites. Foi bom fazer negócio."', '{a}: "We\'re even. Pleasure doing business."'), { a: nm(s, th.hero) }), end: choiceTxt(th, 1) === 'refuse' ? l('dívida virou mágoa', 'debt became a grudge') : l('dívida paga', 'debt paid') }) },
  ],
  reply: (s, th, _st, a) => {
    voidHolds(s, (h) => h.id === th.data.hold);
    if (a === 'comply') { const m = myActs(s)[0]; if (m) m.momentum = clamp(m.momentum - 5, 0, 100); opine(s, th.hero, 10, l('Honrou o favor', 'Honored the favor')); return l('Favor pago com suor.', 'Favor paid in sweat.'); }
    if (a === 'cash') { post(s, `dm18debt:${th.id}`, -money(s, 8000), 'legal', 'Favor pago'); return l('Favor pago em dinheiro.', 'Favor paid in cash.'); }
    grantHold(s, { holder: th.hero.startsWith('p:') ? th.hero.slice(2) : th.hero, target: 'player', kind: 'grievance', strength: 50, months: 60, src: 'dm18', text: l('Não honrou um favor', 'Did not honor a favor') });
    opine(s, th.hero, -20, l('Calote', 'Welshed'));
    return l('Você recusou. Isso vai voltar.', 'You refused. This will come back.');
  },
});

// 6. O nêmesis (chefe de selo rival)
registerThread18({
  k: 'nemesis', name: l('O nêmesis', 'The nemesis'), mine: true,
  sum: (s, th) => fmtL(l('{a} decidiu que você é o inimigo.', '{a} has decided you are the enemy.'), { a: nm(s, th.hero) }),
  open: (s) => {
    const best = Object.entries(s.rivalries).filter(([id, v]) => v > 25 && s.labels[id]?.active && s.labels[id].leaderId).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    const k = `l:${s.labels[best[0]].leaderId}`;
    if (busy(s, k) || !ok(s, k) || !ok(s, best[0])) return null;
    return { hero: k, cast: { label: best[0] }, data: {} };
  },
  beats: [
    { gap: [1, 3], run: (s, th, r) => { forceVerb(s, th.hero, 'player', ['diss', 'rumor'], r); return { t: fmtL(l('{a} dá uma entrevista inteira sobre o "amadorismo" do seu selo.', '{a} gives a whole interview about your label\'s "amateurism".'), { a: nm(s, th.hero) }), tone: 'bad' }; } },
    { gap: [2, 4], run: (s, th, r) => { forceVerb(s, th.hero, myActs(s)[0] && leadOf18(s, myActs(s)[0]) ? pkey(leadOf18(s, myActs(s)[0])) : 'player', ['poach', 'favor'], r); return { t: fmtL(l('{a} janta com seu maior artista. Duas vezes.', '{a} dines with your biggest artist. Twice.'), { a: nm(s, th.hero) }), tone: 'bad' }; } },
    { gap: [2, 5], climax: true, run: (s, th) => ({ t: fmtL(l('{a} propõe guerra aberta: leilões, preços, imprensa. Ou um armistício.', '{a} offers open war: bidding, prices, press. Or an armistice.'), { a: nm(s, th.hero) }), ask: [
      { id: 'war', label: l('Guerra (rivalidade +25, imprensa a favor do mais forte)', 'War (rivalry +25, press sides with the stronger)') },
      { id: 'pact', label: l('Armistício (rivalidade −30)', 'Armistice (rivalry −30)') }] }) },
    { gap: [3, 6], run: (s, th) => ({ t: choiceTxt(th, 2) === 'pact' ? fmtL(l('{a} cumpre o armistício — e passa a mandar cartões de Natal.', '{a} keeps the armistice — and starts sending Christmas cards.'), { a: nm(s, th.hero) }) : fmtL(l('A guerra com {a} define uma era. Os dois selos saem marcados.{c}', 'The war with {a} defines an era. Both labels come out scarred.{c}'), { a: nm(s, th.hero), c: callback18(s, th) }), end: choiceTxt(th, 2) === 'pact' ? l('armistício', 'armistice') : l('guerra de selos', 'label war') }) },
  ],
  reply: (s, th, _st, a) => {
    const lb = th.cast.label;
    if (a === 'war') { s.rivalries[lb] = (s.rivalries[lb] ?? 0) + 25; const m = myActs(s)[0]; if (m) addHype(s, `a:${m.id}`, 'dm18war', l('Guerra de selos', 'Label war'), 8); return l('Guerra declarada. A imprensa adora.', 'War declared. The press loves it.'); }
    s.rivalries[lb] = Math.max(0, (s.rivalries[lb] ?? 0) - 30);
    opine(s, th.hero, 20, l('Armistício', 'Armistice'));
    return l('Armistício assinado num restaurante discreto.', 'Armistice signed in a discreet restaurant.');
  },
});

// 7. A rixa (sua)
registerThread18({
  k: 'feud', name: l('A rixa', 'The feud'), mine: true,
  sum: (s, th) => { const f = feud18(s).f.find((x) => x.id === th.data.feud); return f ? fmtL(l('{a} × {b} — degrau: {st}.', '{a} × {b} — stage: {st}.'), { a: s.acts[f.a]?.name ?? '?', b: s.acts[f.b]?.name ?? '?', st: STAGE18[f.st].name }) : l('Rixa encerrada.', 'Feud over.'); },
  open: (s) => {
    const mine = new Set(playerActs(s));
    const f = activeFeuds18(s).find((x) => (mine.has(x.a) || mine.has(x.b)) && !openThreads(s).some((t) => t.data.feud === x.id));
    if (!f) return null;
    return { hero: mine.has(f.a) ? f.b : f.a, cast: { mine: mine.has(f.a) ? f.a : f.b }, data: { feud: f.id } };
  },
  beats: [
    { gap: [0, 1], run: (s, th) => ({ t: fmtL(l('Uma rixa começou com {a}. Toda escada começa com uma farpa.', 'A feud began with {a}. Every ladder starts with a jab.'), { a: s.acts[th.hero]?.name ?? '?' }) }) },
    { gap: [3, 8], climax: true, run: (s, th) => {
      const f = feud18(s).f.find((x) => x.id === th.data.feud);
      if (!f) return null;
      if (f.end) return { t: fmtL(l('A rixa terminou: {e}', 'The feud ended: {e}'), { e: f.end }), end: f.end };
      return { t: fmtL(l('A rixa chegou a "{st}". Todo mundo espera o próximo passo.', 'The feud reached "{st}". Everyone awaits the next move.'), { st: STAGE18[f.st].name }), tone: f.st >= 3 ? 'bad' : 'info' };
    } },
    { gap: [3, 8], run: (s, th) => {
      const f = feud18(s).f.find((x) => x.id === th.data.feud);
      if (f && !f.end && s.week - f.since < 52 * 3) { th.st--; return null; } // espera o fim (até 3 anos)
      return { t: f?.end ? fmtL(l('Fim da rixa: {e}{d}', 'End of the feud: {e}{d}'), { e: f.end, d: f.dead?.length ? l(' Houve sangue.', ' There was blood.') : '' }) : l('A rixa vira lenda e esfria.', 'The feud becomes legend and cools.'), end: l('rixa encerrada', 'feud over') };
    } },
  ],
});

// 8. O legado (morte de um artista seu ou que marcou sua história)
registerThread18({
  k: 'legacy', name: l('O legado', 'The legacy'), mine: true,
  sum: (s, th) => fmtL(l('A memória de {p} ainda pesa.', '{p}\'s memory still weighs.'), { p: s.persons[th.hero]?.name ?? '?' }),
  open: (s) => {
    const h = freeHook(s, (x) => x.k === 'death' && x.who.some((id) => !!s.persons[id] && !s.persons[id].alive));
    if (!h) return null;
    const pid = h.who.find((id) => !!s.persons[id] && !s.persons[id].alive)!;
    return { hero: pid, cast: {}, data: {}, hook: h.id };
  },
  beats: [
    { gap: [2, 4], run: (s, th) => ({ t: fmtL(l('A família de {p} procura você: querem decidir o que sai do cofre.{c}', '{p}\'s family reaches out: they want a say in what leaves the vault.{c}'), { p: s.persons[th.hero]?.name ?? '?', c: callback18(s, th) }), ask: [
      { id: 'share', label: l('Dividir os lucros com a família', 'Share profits with the family') },
      { id: 'tribute', label: fmtL(l('Bancar um disco-tributo (−${v})', 'Fund a tribute album (−${v})'), { v: Math.round(money(s, 10000) / 100).toLocaleString() }) },
      { id: 'fight', label: l('Brigar pelos direitos', 'Fight for the rights') }] }) },
    { gap: [3, 8], climax: true, run: (s, th) => ({ t: choiceTxt(th, 0) === 'fight' ? fmtL(l('A família de {p} vai à imprensa contra você.', '{p}\'s family goes to the press against you.'), { p: s.persons[th.hero]?.name ?? '?' }) : fmtL(l('O tributo a {p} reúne a cena; a lenda cresce.', 'The tribute to {p} unites the scene; the legend grows.'), { p: s.persons[th.hero]?.name ?? '?' }), tone: choiceTxt(th, 0) === 'fight' ? 'bad' : 'good', end: l('legado decidido', 'legacy settled') }) },
  ],
  reply: (s, th, _st, a) => {
    const m = myActs(s)[0];
    if (a === 'share') { post(s, `dm18share:${th.id}`, -money(s, 4000), 'royalties', 'Família do artista'); return l('A família agradece; a imprensa elogia.', 'The family is grateful; the press praises you.'); }
    if (a === 'tribute') { post(s, `dm18trib:${th.id}`, -money(s, 10000), 'recording', 'Disco-tributo'); if (m) addHype(s, `a:${m.id}`, 'dm18trib', l('Tributo', 'Tribute'), 12); return l('Tributo gravado: hype +12.', 'Tribute recorded: hype +12.'); }
    if (m) scandal(s, m.id, 'money', 30, l('Briga com a família de um artista morto.', 'A fight with a dead artist\'s family.'), { tags: ['dm18'] });
    return l('Você foi à justiça. Os advogados agradecem.', 'You went to court. The lawyers are grateful.');
  },
});

// 9. Sua jornada (arco do jogador, pela ambição)
const ARC: Record<string, { name: L; tempt: L; crown: L }> = {
  money: { name: l('O império', 'The empire'), tempt: l('Um investidor de passado nebuloso oferece dinheiro fácil.', 'An investor with a murky past offers easy money.'), crown: l('Seu nome vira sinônimo de dinheiro no meio.', 'Your name becomes a byword for money in the business.') },
  legacy: { name: l('O legado', 'The legacy'), tempt: l('Uma rádio oferece tocar seu disco… por um envelope.', 'A radio station offers to spin your record… for an envelope.'), crown: l('Críticos começam a falar do "som do seu selo".', 'Critics start talking about "your label\'s sound".') },
  power: { name: l('O poder', 'Power'), tempt: l('Um político quer seus artistas num comício — e oferece favores.', 'A politician wants your acts at a rally — and offers favors.'), crown: l('Quando você liga, todo mundo atende.', 'When you call, everyone picks up.') },
  art: { name: l('A obra', 'The work'), tempt: l('Uma marca paga uma fortuna para seu artista mudar a música para um jingle.', 'A brand pays a fortune for your artist to turn the song into a jingle.'), crown: l('Um disco seu entra nas listas de "melhores de todos os tempos".', 'A record of yours enters "greatest of all time" lists.') },
  family: { name: l('A família', 'Family'), tempt: l('Uma turnê de um ano pagaria tudo — e te tiraria de casa.', 'A year-long tour would pay for everything — and take you from home.'), crown: l('Você chega em casa a tempo do jantar. Sempre.', 'You get home in time for dinner. Always.') },
  fame: { name: l('A fama', 'Fame'), tempt: l('Um tabloide oferece capa se você contar um podre de um rival.', 'A tabloid offers a cover if you dish dirt on a rival.'), crown: l('Seu rosto vira estampa de camiseta.', 'Your face ends up on T-shirts.') },
};
registerThread18({
  k: 'journey', name: l('Sua jornada', 'Your journey'), mine: true,
  sum: (s, th) => fmtL(l('Arco: {a}.', 'Arc: {a}.'), { a: (ARC[String(th.data.amb)] ?? ARC.money).name }),
  open: (s) => (openThreads(s).some((t) => t.k === 'journey') || dm18(s).th.filter((t) => t.k === 'journey').length >= 3 ? null : { hero: 'player', cast: {}, data: { amb: careers(s).ambition ?? 'money' } }),
  beats: [
    { gap: [2, 4], run: (s, th) => ({ t: fmtL(l('Capítulo {n} da sua jornada ({a}). Às vezes, de madrugada, você se pergunta o que está construindo.', 'Chapter {n} of your journey ({a}). Sometimes, late at night, you wonder what you are building.'), { n: dm18(s).th.filter((t) => t.k === 'journey').length, a: (ARC[String(th.data.amb)] ?? ARC.money).name }) }) },
    { gap: [2, 5], run: (s, th) => ({ t: fmtL(l('Tentação: {t}', 'Temptation: {t}'), { t: (ARC[String(th.data.amb)] ?? ARC.money).tempt }), ask: [
      { id: 'take', label: fmtL(l('Aceitar (+${v}, mas alguém vai saber)', 'Accept (+${v}, but someone will know)'), { v: Math.round(money(s, 20000) / 100).toLocaleString() }) },
      { id: 'refuse', label: l('Recusar (integridade)', 'Refuse (integrity)') }] }) },
    { gap: [3, 8], climax: true, run: (s, th) => {
      const took = choiceTxt(th, 1) === 'take';
      if (took) { const m = myActs(s)[0]; if (m) scandal(s, m.id, 'money', 35, l('O dinheiro fácil tinha dono: a história vaza.', 'The easy money had an owner: the story leaks.'), { tags: ['dm18'] }); return { t: fmtL(l('A conta da tentação chega: o que você aceitou há meses vira manchete.{c}', 'The temptation\'s bill arrives: what you accepted months ago becomes a headline.{c}'), { c: l(' Você escolheu o atalho.', ' You chose the shortcut.') }), tone: 'bad' }; }
      const m = myActs(s)[0]; if (m) addHype(s, `a:${m.id}`, 'dm18crown', l('Reputação limpa', 'Clean reputation'), 8);
      return { t: fmtL(l('A recusa virou lenda nos bastidores: {c}', 'The refusal became backstage legend: {c}'), { c: (ARC[String(th.data.amb)] ?? ARC.money).crown }), tone: 'good' };
    } },
    { gap: [2, 4], run: (s, th) => ({ t: l('Fim de capítulo. Outro começa quando a poeira baixar.', 'End of a chapter. Another begins when the dust settles.'), end: choiceTxt(th, 1) === 'take' ? l('o atalho cobrou seu preço', 'the shortcut took its toll') : l('integridade recompensada', 'integrity rewarded') }) },
  ],
  reply: (s, th, _st, a) => {
    if (a === 'take') {
      post(s, `dm18take:${th.id}`, money(s, 20000), 'other', 'Dinheiro fácil');
      const L0 = Object.values(leaders(s).L).find((x) => x.st === 'active' && !x.real);
      grantHold(s, { holder: L0 ? `l:${L0.id}` : 'o:x', target: 'player', kind: 'secret', strength: 55, proof: 1, months: 120, src: 'dm18', text: l('Sabe do dinheiro fácil que você aceitou', 'Knows about the easy money you took') });
      return l('Dinheiro no caixa. E um segredo no bolso de alguém.', 'Cash in the bank. And a secret in someone\'s pocket.');
    }
    return l('Você recusa. Ninguém aplaude agora — mas alguém anotou.', 'You refuse. Nobody applauds now — but someone took note.');
  },
});

// 10–13. Arcos dos NPCs principais (o mundo vivo, visível quando a pessoa é pública)
const NPC_ARCS: { k: string; name: L; fit: (s: GameState, a: Act, k: string) => boolean; beats: [L, L, L]; fx: (s: GameState, a: Act, pid: string, i: number) => void }[] = [
  { k: 'arc_rise', name: l('Ascensão', 'Rise'), fit: (s, a, k) => a.fame < 50 && fac(s, k, 'ambicao') > 55, beats: [l('{p} ({a}) muda de som e de cabelo: algo está acontecendo.', '{p} ({a}) changes sound and hair: something is happening.'), l('{a} explode nas paradas; {p} vira capa.', '{a} explodes on the charts; {p} makes the cover.'), l('{p} ({a}) chega ao topo da cena.', '{p} ({a}) reaches the top of the scene.')], fx: (s, a, _p, i) => { a.momentum = clamp(a.momentum + 6 + i * 3, 0, 100); addHype(s, `a:${a.id}`, 'dm18arc', l('Arco: ascensão', 'Arc: rise'), 6 + i * 3); } },
  { k: 'arc_fall', name: l('Queda', 'Fall'), fit: (s, a, k) => a.fame >= 40 && (fac(s, k, 'impulsividade') + fac(s, k, 'vaidade')) / 2 > 55, beats: [l('{p} ({a}) some das entrevistas; boatos de excessos.', '{p} ({a}) vanishes from interviews; rumors of excess.'), l('{a} cancela datas; {p} briga com a banda.', '{a} cancels dates; {p} fights with the band.'), l('{p} ({a}) atinge o fundo do poço — e a imprensa assiste.', '{p} ({a}) hits rock bottom — and the press watches.')], fx: (s, a, pid, i) => { a.momentum = clamp(a.momentum - 5 - i * 3, 0, 100); addStress(s, pid, 8 + i * 4, l('Arco: queda', 'Arc: fall')); if (i === 2) scandal(s, a.id, 'meltdown', 40, l('Fundo do poço', 'Rock bottom'), { person: pid, tags: ['dm18'] }); } },
  { k: 'arc_redemption', name: l('Redenção', 'Redemption'), fit: (s, a) => a.fame >= 30 && a.momentum < 35, beats: [l('{p} ({a}) aparece sóbrio(a) num show pequeno.', '{p} ({a}) shows up sober at a small gig.'), l('{a} grava às escondidas; quem ouviu fala em obra-prima.', '{a} records in secret; those who heard it speak of a masterpiece.'), l('A volta de {a}: {p} é aplaudido(a) de pé.', '{a}\'s comeback: {p} gets a standing ovation.')], fx: (s, a, pid, i) => { relieveLong(s, pid, 6); a.momentum = clamp(a.momentum + 4 + i * 5, 0, 100); if (i === 2) addHype(s, `a:${a.id}`, 'dm18back', l('A volta', 'The comeback'), 14); } },
  { k: 'arc_revenge', name: l('Vingança', 'Revenge'), fit: (s, _a, k) => holdsOf(s, k.slice(2)).has.some((h) => h.kind === 'grievance' && h.status === 'open'), beats: [l('{p} ({a}) diz numa entrevista que "não esquece".', '{p} ({a}) says in an interview they "don\'t forget".'), l('{p} prepara o troco em silêncio.', '{p} prepares the payback in silence.'), l('{p} ({a}) acerta as contas.', '{p} ({a}) settles the score.')], fx: (s, _a, pid, i) => { if (i === 2) { const h = holdsOf(s, pid).has.find((x) => x.kind === 'grievance' && x.status === 'open'); if (h) forceVerb(s, `p:${pid}`, h.target === 'player' ? 'player' : s.persons[h.target] ? `p:${h.target}` : h.target, ['expose', 'diss', 'sabotage', 'intimidate', 'sue', 'rumor'], Rng.fromSeed(`${s.config.seed}:dm18rev:${s.week}`)); } } },
];
for (const A of NPC_ARCS) {
  registerThread18({
    k: A.k, name: A.name, mine: false,
    sum: (s, th) => { const an = s.acts[th.cast.act]?.name ?? '?'; const pn = nm(s, th.hero); return fmtL(an === pn ? l('{p}: {n}.', '{p}: {n}.') : l('{p} ({a}): {n}.', '{p} ({a}): {n}.'), { p: pn, a: an, n: A.name }); },
    open: (s, r) => {
      const pool = Object.values(s.acts).filter((a) => live(a) && a.fame >= 20 && a.owner !== 'player' && !a.playerBand).sort((a, b) => b.fame - a.fame).slice(0, 30);
      const c = pool.map((a) => [a, leadOf18(s, a)] as const).filter(([a, p]) => p && !p.isPlayer && ok(s, `p:${p.id}`) && ok(s, a.id) && !busy(s, `p:${p.id}`) && A.fit(s, a, `p:${p.id}`));
      if (!c.length) return null;
      const [a, p] = r.pick(c);
      return { hero: `p:${p!.id}`, cast: { act: a.id }, data: {} };
    },
    beats: A.beats.map((b, i) => ({ gap: [i ? 2 : 1, i ? 5 : 3] as [number, number], climax: i === 2, run: (s: GameState, th: Thread18) => {
      const a = s.acts[th.cast.act]; const pid = th.hero.slice(2);
      if (!live(a) || !s.persons[pid]?.alive) return { t: l('O arco terminou antes do fim.', 'The arc ended before its end.'), end: l('interrompido', 'cut short') };
      A.fx(s, a, pid, i);
      const t0 = fmtL(b, { p: s.persons[pid].name, a: a.name });
      const dup = ` (${a.name})`;
      const t = a.name === s.persons[pid].name ? l(t0.pt.replace(dup, ''), t0.en.replace(dup, '')) : t0;
      emitFact(s, { kind: 'arc', actors: [pid, a.id], place: a.city, severity: 30 + i * 12, visibility: a.fame >= 35 ? 'public' : 'rumor', tags: ['dm18', A.k], text: t, src: 'dm18' });
      return { t, ...(i === 2 ? { end: A.name } : {}) };
    } })),
  });
}

/** Força um verbo (o primeiro que couber) de agency18 — usado pelos estágios dos fios. */
export function forceVerb(s: GameState, A: string, T: string, ids: string[], r: Rng): boolean {
  if (shield18(s, A) || shield18(s, T)) return false;
  for (const id of ids) {
    const v = VERBS18.find((x) => x.id === id);
    if (!v || (v.ok && !v.ok(s, A, T))) continue;
    return !!act18(s, { A, T, v, g: 1, aff: 0 }, r);
  }
  const p = choose18(s, A, T, r);
  return !!(p && act18(s, p, r));
}

// ---------------------------------------------------------------- motor

const knownOf = (s: GameState, th: Thread18): boolean => {
  if (th.mine) return true;
  const a = s.acts[th.cast.act];
  return !!a && a.fame >= 35;
};
function beat(s: GameState, th: Thread18, r: Rng): void {
  const def = defOf(th.k);
  if (!def) { th.done = l('—', '—'); return; }
  const b = def.beats[th.st];
  if (!b) { th.done ??= l('fim', 'end'); return; }
  const st = dm18(s);
  if (b.climax && st.ph !== 'climax' && s.week - th.nx < 52) return; // espera o clímax (até 1 ano)
  const out = b.run(s, th, r);
  if (!out) { th.nx = s.week + 4; return; }
  const known = knownOf(s, th);
  th.beats.push({ w: s.week, y: s.year, m: s.month, t: out.t, known, st: th.st });
  th.known ||= known;
  if (out.ask?.length && th.mine) {
    th.wait = th.st;
    pushInbox18(s, 'dm18', { from: th.hero === 'player' ? s.config.companyName : nm(s, th.hero), subject: def.name, body: out.t, tone: out.tone ?? 'info', ref: { th: th.id, st: th.st }, actions: out.ask, weeks: 8 });
  } else if (th.mine) notify(s, fmtL(l('{n}: {t}', '{n}: {t}'), { n: def.name, t: out.t }), out.tone === 'bad' ? 'bad' : out.tone === 'good' ? 'good' : 'event');
  st.log.unshift({ w: s.week, y: s.year, m: s.month, t: fmtL(l('{n}: {t}', '{n}: {t}'), { n: def.name, t: out.t }) });
  if (st.log.length > 60) st.log.length = 60;
  if (out.end) { th.done = out.end; return; }
  th.st++;
  const nb = def.beats[th.st];
  if (!nb) { th.done = l('fim', 'end'); return; }
  th.nx = s.week + Math.round(r.int(nb.gap[0], nb.gap[1]) * 4.35);
}

function phaseStep(s: GameState, r: Rng): void {
  const st = dm18(s);
  const D = dir17(s);
  if (!st.phEnd) st.phEnd = s.week + Math.round(r.int(...PHASE18.calm.len) * 4.35);
  if (s.week >= st.phEnd) {
    st.ph = NEXT[st.ph];
    if (st.ph === 'calm') st.arc++;
    st.phW = s.week;
    const [a, b] = PHASE18[st.ph].len;
    const k = st.ph === 'calm' ? 1 / Math.max(0.6, D.drama) : st.ph === 'climax' ? D.drama : 1;
    st.phEnd = s.week + Math.max(4, Math.round(r.int(a, b) * 4.35 * k));
    st.log.unshift({ w: s.week, y: s.year, m: s.month, t: fmtL(l('Ato {n}: {p} — {d}', 'Act {n}: {p} — {d}'), { n: st.arc, p: PHASE18[st.ph].name, d: PHASE18[st.ph].desc }) });
  }
  // tensão medida: rixas, fios maduros, caixa, fatos ruins seus
  const mine = new Set(playerActs(s));
  const feuds = activeFeuds18(s).reduce((t, f) => t + f.st * (mine.has(f.a) || mine.has(f.b) ? 6 : 1.5), 0);
  const threads = openThreads(s).filter((t) => t.mine).reduce((t, x) => t + x.st * 5, 0);
  const bad = recentFacts(s, { months: 3, minSev: 40, notSecret: true }).filter((f) => f.tags.includes('bad') && f.actors.some((id) => id === 'player' || mine.has(id))).length * 6;
  const cash = s.player.cash < 0 ? 20 : 0;
  const measured = clamp(feuds + threads + bad + cash, 0, 100);
  const target = PHASE18[st.ph].target * (0.8 + D.drama * 0.2);
  st.t = clamp(st.t + (target * 0.65 + measured * 0.35 - st.t) * 0.45, 0, 100);
  st.curve.push([s.week, Math.round(st.t), st.ph]);
  if (st.curve.length > 120) st.curve.splice(0, st.curve.length - 120);
}

function opener(s: GameState, r: Rng): void {
  const st = dm18(s);
  const mine = openThreads(s).filter((t) => t.mine).length, npc = openThreads(s).filter((t) => !t.mine).length;
  const phaseOk = st.ph === 'calm' || st.ph === 'rising' || (st.ph === 'resolution' && r.chance(0.3));
  if (!phaseOk || !r.chance(0.55)) return;
  const pool = THREADS18.filter((d) => (d.mine ? mine < 4 : npc < 4) && !openThreads(s).some((t) => t.k === d.k && d.mine));
  const order = pool.map((d) => [d, r.float() * (d.k === 'journey' ? 0.6 : 1) * (THREADS_W[d.k] ?? 1)] as [ThreadDef18, number]).sort((a, b) => b[1] - a[1]);
  for (const [d] of order) {
    const o = d.open(s, r);
    if (!o) continue;
    const th: Thread18 = { id: `t${++st.seq}`, k: d.k, hero: o.hero, cast: o.cast, data: o.data, st: 0, nx: s.week + Math.round(r.int(d.beats[0].gap[0], d.beats[0].gap[1]) * 4.35), w: s.week, known: false, mine: d.mine, beats: [], ch: {}, ...(o.hook ? { hook: o.hook } : {}) };
    if (o.hook) { const h = st.hooks.find((x) => x.id === o.hook); if (h) h.used = s.week; }
    st.th.push(th);
    if (st.th.length > 80) st.th = st.th.filter((t) => !t.done || s.week - t.w < 520).slice(-80);
    return;
  }
}
const THREADS_W: Record<string, number> = { secret: 1.4, grudge: 1.3, feud: 1.6, debt: 1.1, nemesis: 1, rival_rise: 0.9, fall: 0.9, legacy: 1.2 };

export function dmMonth18(s: GameState): void {
  const r = Rng.fromSeed(`${s.config.seed}:dm18:${s.week}`);
  phaseStep(s, r);
  opener(s, r);
  for (const th of openThreads(s)) if (th.wait === undefined && s.week >= th.nx) beat(s, th, r);
  // a curva mexe no orçamento de situações do mês seguinte
  const sb = sit17(s);
  sb.b = clamp(sb.b + PHASE18[dm18(s).ph].sit, 0, 9);
}
registerSimHook('month', 'dm18', (s) => dmMonth18(s));
setFeudPhase18((s) => PHASE18[dm18(s).ph]?.feud ?? 1);
setAgencyPhase18((s) => PHASE18[dm18(s).ph]?.ag ?? 1, (s) => dm18(s).ph);

registerInboxKind('dm18', {
  label: l('Mestre', 'DM'), cat: 'decision', icon: 'pen', prio: 2,
  goto: () => ({ area: 'dm18' }),
  handle: (s, m, action, r) => {
    const th = dm18(s).th.find((x) => x.id === m.ref?.th);
    if (!th) return l('Fio encerrado.', 'Thread closed.');
    const st = Number(m.ref?.st ?? th.wait ?? 0);
    th.ch[String(st)] = action;
    th.wait = undefined;
    const out = defOf(th.k)?.reply?.(s, th, st, action, r) ?? l('Anotado.', 'Noted.');
    th.beats.push({ w: s.week, y: s.year, m: s.month, t: fmtL(l('Sua escolha: {t}', 'Your choice: {t}'), { t: out }), known: true, st });
    return out;
  },
});

/** Fios que o jogador conhece (para o Diário). */
export const knownThreads18 = (s: GameState): Thread18[] => dm18(s).th.filter((t) => t.known || t.mine && t.beats.length > 0);
export const _dm18 = { yr, temper18, opinionOf, factById, familyOf };
export type { Feud18 };
