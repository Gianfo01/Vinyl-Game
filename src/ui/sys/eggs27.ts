// Rodada 27 — OVOS DE PÁSCOA (interface). Tudo aqui é aditivo e fica em registros puros que outras telas consomem:
//   eggCmds27(g, q)      → comandos secretos da busca (Ctrl+K): "payola", "hall da fama", "1889", "lado b", "mixtape"…
//   hqClickEggs27        → cliques em objetos da sede (gramofone ×10 → chiado de 78 rpm + selo de colecionador)
//   hqPropEggs27         → objetos extras da sede (calhambeque na garagem, depois do ovo da Jovem Guarda)
//   cityEggs27 / cityShake27 → mapa da cidade (músico das 3 da manhã; chão tremendo depois do axé esgotado)
//   undoEgg27(g)         → mensagem respeitosa ao desfazer fevereiro de 1959
// O código Konami (↑↑↓↓←→←→BA) e a pele temporária (1889/chiptune) funcionam sozinhos (ouvinte de teclado e
// sincronização de classe no <body>). Sons sintetizados com WebAudio, sem arquivos.

import { EGGS27, FEATS27, eggMeta27 } from '../../data/eggs27';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { recentFacts } from '../../sim/facts17';
import { eg27, eggFeat27, fifthTitle27, found27, garage27, markEgg27, setSkin27, shake27, skin27, streetBusker27 } from '../../sim/sys/eggs27';
import type { GameState } from '../../sim/types';
import { modal, pill, rerender, toast } from '../common';
import { PAGE16_HEAD } from './people16';
import { PRODUCERS } from '../../sim/studio';
import { h } from '../dom';
import { store } from '../store';
import './eggs27.css';

const T = (x: L): string => t(x);
const say = (x: L, kind = 'info'): void => { toast(T(x), kind); };

// ================================================================ sons (WebAudio, sem arquivos)

let AC: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    AC ??= new C();
    if (AC.state === 'suspended') void AC.resume();
    return AC;
  } catch { return null; }
}
/** Chiado de 78 rpm: chiado de fundo, estalos esparsos e um "uau" de rotação (78/60 ≈ 1,3 Hz). */
export function crackle78_27(sec = 2.6): void {
  const c = ac(); if (!c) return;
  const n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let seed = 78;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const tt = i / c.sampleRate, env = Math.min(1, tt * 4, (sec - tt) * 3);
    let v = (rnd() - 0.5) * 0.06; // chiado
    if (rnd() < 0.0009) v += (rnd() - 0.5) * 1.6; // estalo
    v += Math.sin(2 * Math.PI * 92 * tt) * 0.03 * (1 + 0.5 * Math.sin(2 * Math.PI * 1.3 * tt)); // ronco do prato
    d[i] = v * env;
  }
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.6;
  const g = c.createGain(); g.gain.value = 0.55;
  src.connect(bp).connect(g).connect(c.destination);
  src.start();
}
/** Scratch de vinil: ruído com filtro varrendo para frente e para trás. */
export function scratch27(): void {
  const c = ac(); if (!c) return;
  const sec = 0.9, n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() - 0.5) * 0.8;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
  const now = c.currentTime;
  f.frequency.setValueAtTime(300, now);
  f.frequency.exponentialRampToValueAtTime(2600, now + 0.18);
  f.frequency.exponentialRampToValueAtTime(400, now + 0.42);
  f.frequency.exponentialRampToValueAtTime(3000, now + 0.62);
  f.frequency.exponentialRampToValueAtTime(250, now + 0.88);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.5, now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + sec);
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}
/** Arpejo de 8 bits (Konami). */
function chip27(): void {
  const c = ac(); if (!c) return;
  [523, 659, 784, 1047, 784, 1047].forEach((hz, i) => {
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + i * 0.08;
    o.type = 'square'; o.frequency.value = hz;
    g.gain.setValueAtTime(0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.075);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + 0.08);
  });
}

// ================================================================ pele temporária (classe no <body>)

const SKINS = ['phono', 'chip'];
export function syncSkin27(g: GameState | null = store.game): void {
  if (typeof document === 'undefined' || !document.body) return;
  const k = g ? skin27(g) : null;
  for (const x of SKINS) document.body.classList.toggle(`egg27-${x}`, k === x);
}
if (typeof window !== 'undefined') window.setInterval(() => syncSkin27(), 1500);

// ================================================================ busca (Ctrl+K)

export interface EggCmd27 { label: string; alt?: string; kind: string; icon?: string; hint?: string; weight?: number; run: () => void }
const norm = (q: string) => q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
type Code = { egg: string; keys: string[]; label: L; run: (g: GameState) => void };
const CODES: Code[] = [
  { egg: 'code_payola', keys: ['payola', 'jaba'], label: l('Todos os boatos do mundo', 'Every rumor in the world'), run: (g) => rumors27(g) },
  { egg: 'code_hall', keys: ['hall da fama', 'hall of fame', 'hall dos ecos'], label: l('Galeria: hall da fama', 'Gallery: hall of fame'), run: (g) => gallery27(g) },
  { egg: 'code_1889', keys: ['1889'], label: l('Voltar a 1889 (visual de fonógrafo por um mês)', 'Back to 1889 (phonograph look for a month)'), run: (g) => { setSkin27(g, 'phono', 4); syncSkin27(g); crackle78_27(1.4); say(l('Agulha no cilindro de cera. Até o mês que vem!', 'Needle on the wax cylinder. Until next month!')); } },
  { egg: 'code_sideb', keys: ['lado b', 'side b'], label: l('Lado B', 'Side B'), run: (g) => say(l(`Lado B: ${found27(g).length} de ${EGGS27.length} ovos achados nesta partida.`, `Side B: ${found27(g).length} of ${EGGS27.length} eggs found in this run.`)) },
  { egg: 'code_mixtape', keys: ['mixtape', 'fita mixada'], label: l('Gravar uma mixtape', 'Make a mixtape'), run: (g) => mixtape27(g) },
  { egg: 'code_fifth', keys: ['quinto beatle', 'fifth beatle', 'quinto integrante'], label: l('Os quintos integrantes', 'The fifth members'), run: (g) => fifths27(g) },
  { egg: 'code_abbey', keys: ['abbey road'], label: l('Atravessar a faixa', 'Cross the road'), run: () => abbey27() },
  { egg: 'code_scratch', keys: ['scratch', 'wikki'], label: l('Scratch!', 'Scratch!'), run: () => scratch27() },
];
/** Comandos secretos para a paleta (só aparecem com o código exato). */
export function eggCmds27(g: GameState, q: string): EggCmd27[] {
  const k = norm(q);
  return CODES.filter((c) => c.keys.includes(k)).map((c) => ({ label: T(c.label), alt: q.trim(), kind: 'action', icon: 'sparkle', hint: '★', weight: 50,
    run: () => { markEgg27(g, c.egg); c.run(g); rerender(); } }));
}
/** Atalho para quem já tem a busca: roda o código direto (devolve se era um código). */
export function runEggCode27(g: GameState, q: string): boolean { const c = eggCmds27(g, q)[0]; if (c) c.run(); return !!c; }

function rumors27(g: GameState): void {
  const rows: HTMLElement[] = [
    ...g.rumors.map((r) => h('li', null, T(r.text), ' ', h('small', { class: 'muted' }, `→ ${r.resolvesYear}`))),
    ...recentFacts(g, { months: 600 }).filter((f) => f.visibility === 'rumor').slice(-60).reverse().map((f) => h('li', null, h('small', { class: 'muted' }, `${f.y} · `), T(f.text))),
  ];
  modal(T(l('Payola: todos os boatos', 'Payola: every rumor')), h('div', { class: 'egg27-list' },
    h('p', { class: 'muted small' }, T(l('1959–60: o Congresso dos EUA investiga o jabá no rádio. Aqui, tudo o que se cochicha no mundo.', '1959–60: the US Congress investigates radio payola. Here, everything whispered in the world.'))),
    rows.length ? h('ul', null, ...rows) : h('p', null, T(l('Nenhum boato. Por enquanto.', 'No rumors. For now.')))));
}
function gallery27(g: GameState): void {
  const st = eg27(g), fd = new Set(found27(g));
  modal(T(l('Hall da fama', 'Hall of fame')), h('div', { class: 'egg27-gallery' },
    h('h4', null, T(l('Hall dos Ecos', 'Hall of Echoes'))),
    (g.hallOfFame ?? []).length ? h('ul', null, ...(g.hallOfFame ?? []).map((x) => h('li', null, `${x.year} · ${x.name}`))) : h('p', { class: 'muted' }, T(l('Ainda vazio.', 'Still empty.'))),
    h('h4', null, T(l('Ovos achados', 'Eggs found')), ` (${fd.size}/${EGGS27.length})`),
    // r27 (ACH): só o que já foi achado; o resto é só contagem (sem nome, época ou pista)
    fd.size ? h('div', { class: 'egg27-grid' }, ...EGGS27.filter((e) => fd.has(e.id)).map((e) => h('div', { class: 'egg27-card on', title: T(e.fx) },
      h('b', null, T(e.title)), h('small', { class: 'muted' }, `${e.era} · ${T(e.place)}`)))) : h('p', { class: 'muted' }, T(l('Nenhum ainda. Eles se escondem bem.', 'None yet. They hide well.'))),
    h('h4', null, T(l('Conquistas secretas', 'Secret feats')), ` (${FEATS27.filter((f) => st.feats[f.id] !== undefined).length}/${FEATS27.length})`),
    FEATS27.some((f) => st.feats[f.id] !== undefined) ? h('ul', null, ...FEATS27.filter((f) => st.feats[f.id] !== undefined).map((f) => h('li', null, `★ ${T(f.name)}`))) : h('p', { class: 'muted' }, T(l('Nenhuma ainda.', 'None yet.')))), { wide: true });
}
function mixtape27(g: GameState): void {
  const songs = Object.values(g.releases).filter((r) => r.owner === 'player').flatMap((r) => r.songs.map((id) => ({ s: g.songs[id], a: g.acts[r.actId] }))).filter((x) => x.s && x.a);
  const seen = new Set<string>();
  const uniq = songs.filter((x) => (seen.has(x.s.id) ? false : (seen.add(x.s.id), true)));
  let seed = g.week + 27;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = uniq.map((x) => ({ x, k: rnd() })).sort((p, q) => p.k - q.k).slice(0, 12).map((p) => p.x);
  modal(T(l('Mixtape', 'Mixtape')), h('div', { class: 'egg27-tape' },
    h('p', { class: 'egg27-hand' }, T(l('Para alguém especial — lado A primeiro, sem pular.', 'For someone special — side A first, no skipping.'))),
    pick.length ? h('ol', null, ...pick.map((x) => h('li', null, `${x.s.title} — ${x.a.name}`))) : h('p', { class: 'muted' }, T(l('Ainda não há músicas lançadas para gravar.', 'No released songs to tape yet.')))));
}
function fifths27(g: GameState): void {
  const xs = Object.values(eg27(g).fifth);
  modal(T(l('Os quintos integrantes', 'The fifth members')), h('div', null,
    xs.length ? h('ul', null, ...xs.map((x) => h('li', null, `${x.name} — ${g.acts[x.act]?.name ?? '?'} (${x.y})`))) : h('p', { class: 'muted' }, T(l('Ninguém ainda. Um produtor fiel e um ato enorme fazem um.', 'Nobody yet. A loyal producer and a huge act make one.')))));
}
function abbey27(): void {
  if (typeof document === 'undefined') return;
  const road = h('div', { class: 'egg27-abbey', 'aria-hidden': 'true' }, ...[0, 1, 2, 3].map((i) => h('span', { class: `egg27-walker w${i}` })));
  document.body.append(road);
  window.setTimeout(() => road.remove(), 9000);
}

// ================================================================ sede

let clicks: number[] = [];
/** Cliques em objetos da sede. hqpx27/hq25 chamam `hqClick27(g, 'gramophone')`. */
export const hqClickEggs27: Record<string, (g: GameState) => L | null> = {
  gramophone: (g) => {
    const now = Date.now();
    clicks = clicks.filter((x) => now - x < 8000);
    clicks.push(now);
    if (clicks.length < 10) return null;
    clicks = [];
    crackle78_27();
    const first = markEgg27(g, 'gramophone_10', l('A agulha desce no 78 rpm da sede: chiado, estalos e uma valsa de 1920 ao fundo.', 'The needle drops on the HQ\'s 78 rpm: hiss, crackles and a 1920s waltz in the background.'));
    eggFeat27(g, 'collector27');
    return first ? l('Selo de colecionador de 78 rotações liberado.', '78 rpm collector badge unlocked.') : l('Chiado de 78 rotações.', '78 rpm crackle.');
  },
};
export function hqClick27(g: GameState, obj: string): void { const r = hqClickEggs27[obj]?.(g); if (r) { say(r, 'good'); rerender(); } }

export interface Prop27 { id: string; slot: string; w: number; h: number; title: L; draw: (c: CanvasRenderingContext2D, x: number, y: number, t: number) => void }
/** Objetos extras da sede (a garagem desenha o que vier daqui). */
export const hqPropEggs27: ((g: GameState) => Prop27 | null)[] = [
  (g) => (garage27(g) ? { id: 'calhambeque', slot: 'garage', w: 26, h: 16, title: l('Calhambeque (presente de um fã, 1965)', 'Old jalopy (a fan\'s gift, 1965)'), draw: drawJalopy } : null),
];
function px(c: CanvasRenderingContext2D, col: string, x: number, y: number, w = 1, hh = 1): void { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, hh); }
/** Calhambeque 26×16 px: carro dos anos 1920 (capota alta, para-lamas soltos, estribo, estepe, rodas raiadas). */
export function drawJalopy(c: CanvasRenderingContext2D, x: number, y: number, t = 0): void {
  const k = Math.round(Math.sin(t * 9)) > 0 ? 1 : 0; // chacoalha de leve
  const Y = y + k * 0;
  px(c, '#1b1b22', x + 7, Y, 11, 1); px(c, '#1b1b22', x + 7, Y + 1, 1, 6); px(c, '#1b1b22', x + 17, Y + 1, 1, 6); px(c, '#1b1b22', x + 12, Y + 1, 1, 5); // capota alta
  px(c, '#bfe3f0', x + 8, Y + 2, 4, 3); px(c, '#bfe3f0', x + 13, Y + 2, 4, 3); // janelas
  px(c, '#b3262e', x + 6, Y + 6, 13, 4); px(c, '#d94b4b', x + 6, Y + 6, 13, 1); // cabine
  px(c, '#b3262e', x + 18, Y + 7, 5, 3); px(c, '#d94b4b', x + 18, Y + 7, 5, 1); // capô baixo
  px(c, '#e9c46a', x + 23, Y + 6, 1, 4); px(c, '#8a6a10', x + 23, Y + 7, 1, 1); // radiador
  px(c, '#f4e3a1', x + 24, Y + 6, 1, 1); px(c, '#555', x + 24, Y + 7, 1, 2); // farol no suporte
  px(c, '#222', x + 2, Y + 5, 3, 5); px(c, '#777', x + 3, Y + 6, 1, 3); // estepe atrás
  px(c, '#1b1b22', x + 4, Y + 10, 8, 1); px(c, '#1b1b22', x + 16, Y + 10, 8, 1); // para-lamas
  px(c, '#1b1b22', x + 11, Y + 11, 6, 1); // estribo
  for (const wx of [5, 17]) { // rodas raiadas
    px(c, '#111', x + wx, y + 11, 5, 5); px(c, '#111', x + wx - 1, y + 12, 7, 3);
    px(c, '#9a9a9a', x + wx + 2, y + 12, 1, 3); px(c, '#9a9a9a', x + wx + 1, y + 13, 3, 1); px(c, '#e9c46a', x + wx + 2, y + 13, 1, 1);
  }
}

// ================================================================ mapa da cidade

/** Hora do jogo no mapa (mesmo ciclo de campus18px.nightOf: fase 0 = meio-dia). */
export const hourOf27 = (t: number): number => (12 + ((t / 48) % 1) * 24) % 24;
export interface CityEgg27 { id: string; w: number; h: number; title: L; draw: (c: CanvasRenderingContext2D, x: number, y: number, t: number) => void; onClick?: (g: GameState) => L | null }
/** Ovos do mapa: cada função devolve um sprite (ou nada) para o instante `t` (mesmo `t` do drawFrame18). */
export const cityEggs27: ((g: GameState, o: { t: number; night: number; city: string }) => CityEgg27 | null)[] = [
  (g, o) => {
    const hr = hourOf27(o.t);
    if (o.night < 0.5 || hr < 2.5 || hr > 3.6 || eg27(g).seen.street_3am !== undefined || o.city !== g.config.homeCity) return null;
    return { id: 'busker', w: 9, h: 13, title: l('Alguém toca na esquina…', 'Someone is playing on the corner…'), draw: drawBusker, onClick: (s) => streetBusker27(s) };
  },
];
/** Deslocamento [dx, dy] do mapa inteiro (chão tremendo depois do axé esgotado em Salvador). */
export function cityShake27(g: GameState, city: string, t: number): [number, number] {
  if (!shake27(g, city)) return [0, 0];
  const k = Math.sin(t * 2.7) * Math.sin(t * 0.37);
  return [Math.round(k * 1.5), Math.round(Math.cos(t * 3.1) * 1)];
}
/** Músico de rua 9×13 px: chapéu, violão e o estojo aberto com moedas. */
export function drawBusker(c: CanvasRenderingContext2D, x: number, y: number, t = 0): void {
  const strum = Math.floor(t * 3) % 2;
  px(c, '#2b2340', x + 2, y, 4, 1); px(c, '#2b2340', x + 1, y + 1, 6, 1); // chapéu
  px(c, '#e0ac69', x + 3, y + 2, 3, 2); // rosto
  px(c, '#3d5a80', x + 2, y + 4, 5, 5); // casaco
  px(c, '#a0522d', x + 1, y + 6, 5, 3); px(c, '#5c3317', x + 3, y + 7, 1, 1); px(c, '#c8a165', x + 6, y + 5 - strum, 3, 1); // violão
  px(c, '#222', x + 3, y + 9, 1, 3); px(c, '#222', x + 5, y + 9, 1, 3); // pernas
  px(c, '#4a2c17', x, y + 12, 5, 1); px(c, '#f4d35e', x + 1, y + 11, 1, 1); px(c, '#f4d35e', x + 3, y + 11, 1, 1); // estojo e moedas
}

// ================================================================ desfazer fevereiro de 1959

let undoWarned = '';
/** "Desfazer mês" logo depois de jogar fevereiro de 1959: mensagem respeitosa no lugar do desfazer (o 2º clique desfaz). */
export function undoEgg27(g: GameState): string | null {
  const played = g.month === 0 ? { y: g.year - 1, m: 11 } : { y: g.year, m: g.month - 1 };
  const key = `${g.config.seed}|${g.week}`;
  if (!((played.y === 1959 && played.m === 1) || (g.year === 1959 && g.month === 1)) || undoWarned === key) return null;
  undoWarned = key;
  markEgg27(g, 'music_died', l('3 de fevereiro de 1959.', '3 February 1959.'));
  return T(l('Não dá para desfazer o dia em que a música morreu. (3 de fevereiro de 1959: Buddy Holly, Ritchie Valens e J. P. "The Big Bopper" Richardson.) Clique de novo para desfazer o mês.',
    'You can\'t undo the day the music died. (3 February 1959: Buddy Holly, Ritchie Valens and J. P. "The Big Bopper" Richardson.) Click again to undo the month.'));
}

// ================================================================ código Konami

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kpos = 0;
/** Alimenta a sequência (exportado para testes); devolve true quando o código fecha. */
export function konamiKey27(key: string): boolean {
  const k = key.length === 1 ? key.toLowerCase() : key;
  kpos = k === KONAMI[kpos] ? kpos + 1 : k === KONAMI[0] ? 1 : 0;
  if (kpos < KONAMI.length) return false;
  kpos = 0;
  return true;
}
export function konami27(g: GameState): void {
  const st = eg27(g);
  const on = st.skin?.k !== 'chip';
  st.skin = on ? { k: 'chip', until: -1 } : undefined;
  markEgg27(g, 'konami', l('↑↑↓↓←→←→BA', '↑↑↓↓←→←→BA'));
  eggFeat27(g, 'konami27');
  syncSkin27(g); chip27();
  say(on ? l('Selo chiptune ligado. 30 vidas!', 'Chiptune label on. 30 lives!') : l('Selo chiptune desligado.', 'Chiptune label off.'), 'good');
}
if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => {
  const el = e.target as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
  const done = konamiKey27(e.key);
  if (done || kpos >= 9) { e.preventDefault(); e.stopImmediatePropagation(); } // o "b" e o "a" do código não viram atalhos
  if (done && store.game) { konami27(store.game); rerender(); }
}, true);

/** Título do ovo (para quem quiser mostrar na galeria de outra tela). */
export const eggTitle27 = (id: string): string => (eggMeta27[id] ? T(eggMeta27[id].title) : id);

// ================================================================ ficha (r27 INT)

/** "O quinto integrante de X (ano)" na ficha do empresário ('e:<id>') ou do produtor ('pd:<real>' → produtores do estúdio com esse real). */
export function fifthFor27(s: GameState, key: string): L | null {
  if (key.startsWith('e:')) return fifthTitle27(s, key);
  if (key.startsWith('pd:')) { const real = key.slice(3); for (const p of PRODUCERS) if (p.id === real || p.real === real) { const x = fifthTitle27(s, p.id); if (x) return x; } }
  return null;
}
PAGE16_HEAD.push((s, key) => { const x = fifthFor27(s, key); return x ? h('div', { class: 'row wrap' }, pill(t(x), 'gold')) : null; });
