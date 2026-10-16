// r27 (M1) — tela da composição jogável: mesa em pixel art, mão de cartas, energia, química e prévia do que a
// música ganha; eventos da rodada (bloqueio, inspiração, ideia emprestada, discussão, química em alta) e, no fim,
// "saiu forte/fraca porque…". A sessão ocupa a "Compor" da agenda do mês (a mesma capacidade do modo rápido).
// Motor puro em src/sim/sys/compose27.ts. Teclado: 1–5 marcam cartas, Enter joga, D descansa, Esc sai.

import './act27.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { composeBlock27, EV27, finishCompose27, KIND27, playRound27, previewTotals27, startCompose27, totals27, type Card27, type Comp27, type CompResult27 } from '../../sim/sys/compose27';
import type { AgendaSlot, GameState } from '../../sim/types';
import { planAgenda20, commitAgenda20, agName20 } from '../actions20';
import { modal, rerender, toast } from '../common';
import { h } from '../dom';
import { ic } from '../vis';
import { kindColor27 } from './scene27';
import { paintCompose5 } from '../r31/salas5px'; // R31 onda 5 (SALAS): a mesa no corte da sede
import { drawSala5 } from '../r31/salas5ui';
import { withCast31 } from '../r31/cast31'; // R31 onda 4 (W): pessoas reais com humor e "Pular cena"

const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`;

interface Book27 { slots: AgendaSlot[]; existing: boolean; dropped: string[] }

/** Reserva na agenda: usa a "Compor" já marcada ou acrescenta uma (o que sairia da agenda aparece antes).
 *  Agenda delegada é refeita todo mês — por isso a reserva sempre grava uma cópia (commitAgenda20, como o "Compor"). */
function booking(s: GameState, actId: string): Book27 | L {
  const a = s.acts[actId];
  const cur = (s.agenda[actId] ?? []).map((x) => ({ ...x, params: { ...(x.params ?? {}) } }));
  if (cur.some((x) => x.action === 'compose' && !x.params.played27)) return { slots: cur, existing: true, dropped: [] };
  const pl = planAgenda20(s, a, [{ action: 'compose', params: { week: 1 } }]);
  if (pl.block) return pl.block;
  return { slots: pl.slots, existing: false, dropped: pl.dropped.map((d) => t(agName20(d.action))) };
}

function commitBooking(s: GameState, actId: string, b: Book27): void {
  const slots = b.slots.map((x) => ({ ...x, params: { ...(x.params ?? {}) } }));
  const mine = (b.existing ? slots : [...slots].reverse()).find((x) => x.action === 'compose' && !x.params.played27);
  if (mine) mine.params.played27 = 1;
  commitAgenda20(s, s.acts[actId], slots);
}

/** Abre a sessão de composição. Entrada única: a "Compor" da agenda, oferecida na virada do mês (flow27.ts);
 *  `onEnd(jogou)` avisa quem abriu quando a janela fecha (também quando nem chega a abrir). */
export function openCompose27(s: GameState, actId: string, onEnd?: (played: boolean) => void): void {
  const why = composeBlock27(s, actId);
  if (why) { toast(t(why), 'bad'); onEnd?.(false); return; }
  const book = booking(s, actId);
  if ('pt' in book) { toast(`${t(book)} ${t(l('Abra a agenda do artista e tire alguma ação.', 'Open the act\'s agenda and remove an action.'))}`, 'bad'); onEnd?.(false); return; }
  const c0 = startCompose27(s, actId);
  if ('pt' in c0) { toast(t(c0), 'bad'); onEnd?.(false); return; }
  const c: Comp27 = c0;
  const a = s.acts[actId];
  let sel: string[] = [];
  let phase: 'intro' | 'round' | 'result' = 'intro';
  let result: CompResult27 | null = null;
  let err: L | null = null;
  const root = h('div', { class: 'a27 a27-compose' });
  const put = (...xs: (Node | null)[]) => root.replaceChildren(...xs.filter((x): x is Node => !!x));
  const close = modal(t(l('Sessão de composição', 'Writing session')) + ` — ${a.name}`, withCast31(s, c.writers.map((w) => w.id), root, () => close()), { wide: true, onClose: () => { document.removeEventListener('keydown', onKey); onEnd?.(!!result); if (result) rerender(); } });

  const scene = (): HTMLElement => {
    const cv = h('canvas', { class: 'a27-scene', role: 'img', 'aria-label': t(l('Mesa de composição', 'Writing table')) }) as HTMLCanvasElement;
    const played = c.picked.map((x) => x.kind);
    try { drawSala5(cv, paintCompose5(s.year, played, c.writers.length, { city: s.config.homeCity, month: s.month }), s.year, c.writers.map((w) => s.persons[w.id] ?? { id: w.id, role: 'vocal', born: s.year - 25 })); } catch { /* sem canvas */ }
    return cv;
  };

  const meter = (label: L, v: number, max = 18, cls = '') => h('div', { class: `a27-meter ${cls}` },
    h('span', { class: 'a27-meter-l' }, t(label)),
    h('span', { class: 'a27-meter-bar', role: 'meter', 'aria-valuemin': -max, 'aria-valuemax': max, 'aria-valuenow': v, 'aria-label': t(label) },
      h('i', { class: v >= 0 ? 'pos' : 'neg', style: `--w:${Math.min(50, (Math.abs(v) / max) * 50)}%` })),
    h('b', null, sign(v)));

  const pips = (n: number, max: number, label: L) => h('span', { class: 'a27-pips', 'aria-label': `${t(label)} ${n}/${max}` }, ...Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));

  const chemTxt = () => c.chem > 0.3 ? l('afinados', 'in tune') : c.chem < -0.1 ? l('tensos', 'tense') : l('cordiais', 'cordial');

  const head = () => h('div', { class: 'a27-head' },
    h('span', { class: 'a27-chip' }, ic('calendar'), ' ', t(l('Rodada', 'Round')), ` ${Math.min(c.round + 1, c.rounds)}/${c.rounds}`),
    h('span', { class: 'a27-chip' }, '⚡ ', t(l('Energia', 'Energy')), ' ', pips(c.energy, c.energyMax, l('Energia', 'Energy'))),
    h('span', { class: `a27-chip ${c.chem > 0.3 ? 'good' : c.chem < -0.1 ? 'bad' : ''}` }, ic('heart'), ' ', t(l('Química', 'Chemistry')), `: ${t(chemTxt())} (${sign(Math.round(c.chem * 100))})`),
    h('span', { class: 'a27-writers small muted' }, c.writers.map((w) => `${w.name} · ${t(l('comp', 'comp'))} ${Math.round(w.comp)} · ${t(l('letra', 'lyr'))} ${Math.round(w.lyr)}`).join('  |  ')));

  const fxChips = (x: Card27) => h('span', { class: 'a27-fx' },
    x.fx.me ? h('em', { class: x.fx.me > 0 ? 'pos' : 'neg' }, `${sign(x.fx.me)} ${t(l('mel', 'mel'))}`) : null,
    x.fx.ly ? h('em', { class: x.fx.ly > 0 ? 'pos' : 'neg' }, `${sign(x.fx.ly)} ${t(l('letra', 'lyr'))}`) : null,
    x.fx.or ? h('em', { class: x.fx.or > 0 ? 'pos' : 'neg' }, `${sign(x.fx.or)} ${t(l('orig', 'orig'))}`) : null,
    x.fx.cost ? h('em', { class: 'neg' }, `−${x.fx.cost} ⚡`) : null,
    x.fx.risk ? h('em', { class: 'warn' }, t(l('risco de plágio', 'plagiarism risk'))) : null,
    !x.fx.me && !x.fx.ly && !x.fx.or ? h('em', null, t(l('±0 (sem efeito)', '±0 (no effect)'))) : null);

  const cardEl = (x: Card27, i: number) => {
    const on = sel.includes(x.id);
    const by = x.by ? c.writers.find((w) => w.id === x.by)?.name.split(' ')[0] : null;
    return h('button', { class: `a27-card k-${x.kind} src-${x.src} ${on ? 'on' : ''}`, 'aria-pressed': on ? 'true' : 'false', style: `--kc:${kindColor27(x.kind)}`,
      onclick: () => { sel = on ? sel.filter((y) => y !== x.id) : [...sel, x.id].slice(-2); err = null; draw(); } },
      h('span', { class: 'a27-card-k' }, `${i + 1} · ${t(KIND27[x.kind].name)}`),
      h('b', { class: 'a27-card-n' }, t(x.name)),
      by ? h('span', { class: 'a27-card-by small' }, by) : h('span', { class: 'a27-card-by small muted' }, t(x.src === 'life' ? l('da vida', 'from life') : x.src === 'era' ? l('da época', 'of the era') : x.src === 'genre' ? l('do gênero', 'of the genre') : x.src === 'borrowed' ? l('de outra pessoa', 'someone else\'s') : l('da cena', 'from the scene'))),
      fxChips(x),
      h('span', { class: 'a27-card-d small' }, t(x.desc)));
  };

  const intro = () => {
    const b = book;
    put(
      head(), scene(),
      h('div', { class: 'a27-intro' },
        h('p', null, t(l('Cada rodada a mesa mostra uma mão de cartas trazidas pelos parceiros (e pela vida, pela época e pelo gênero). Escolha uma carta — ou duas, gastando energia; duas de pessoas diferentes que se completam fazem combo. Sem pressa: descansar devolve energia.', 'Each round the table shows a hand of cards brought by your co-writers (and by life, the era and the genre). Pick one card — or two, spending energy; two from different people that fit together make a combo. No rush: resting restores energy.'))),
        h('ul', { class: 'small' },
          h('li', null, t(l('Gancho e Harmonia puxam a melodia; Letra puxa a letra; Harmonia e cartas estranhas puxam a originalidade.', 'Hook and Harmony lift melody; Lyric lifts lyrics; Harmony and odd cards lift originality.'))),
          h('li', null, t(l('Cuidado: "Fórmula da moda" e "Isso lembra aquele sucesso…" parecem ótimas — uma derruba a originalidade, a outra pode virar processo.', 'Careful: "Trendy formula" and "That sounds like that hit…" look great — one sinks originality, the other may become a lawsuit.')))),
        h('p', { class: 'small muted' }, b.existing ? t(l('Esta sessão usa a "Compor" já marcada na agenda (nada a mais sai da agenda).', 'This session uses the "Write" already on the agenda (nothing else leaves the agenda).'))
          : b.dropped.length ? h('span', { class: 'bad' }, t(l('Para caber, sai da agenda: ', 'To fit, this leaves the agenda: ')), b.dropped.join(', ')) : t(l('Ocupa um "Compor" na agenda do mês — o mesmo espaço do modo rápido.', 'Takes one "Write" slot on this month\'s agenda — the same room as quick mode.'))),
      ),
      h('div', { class: 'a27-actions' },
        h('button', { class: 'btn primary', onclick: () => { phase = 'round'; draw(); } }, ic('sparkle'), ' ', t(l('Sentar à mesa', 'Sit at the table'))),
        h('button', { class: 'btn ghost', onclick: () => close() }, t(onEnd ? l('Resolver rápido', 'Resolve quickly') : l('Agora não', 'Not now')))));
  };

  const round = () => {
    const rd = c.log[c.log.length - 1];
    const pv = previewTotals27(c, sel);
    const cost = sel.reduce((tt, id) => tt + (rd.hand.find((x) => x.id === id)?.fx.cost ?? 0), 0) + (sel.length > 1 ? 1 : 0);
    const ev = rd.ev ? EV27[rd.ev] : null;
    put(
      head(), scene(),
      ev ? h('div', { class: `a27-event ${ev.tone}`, role: 'status' }, h('b', null, t(ev.name)), ' — ', t(ev.text)) : null,
      h('div', { class: 'a27-hand', role: 'group', 'aria-label': t(l('Mão de cartas', 'Hand of cards')) }, rd.hand.map(cardEl)),
      h('div', { class: 'a27-preview' },
        h('h4', null, t(l('O que a música ganha até agora', 'What the song gains so far'))),
        meter(l('Melodia', 'Melody'), pv.me), meter(l('Letra', 'Lyrics'), pv.ly), meter(l('Originalidade', 'Originality'), pv.or),
        pv.risk ? h('p', { class: 'warn small' }, '⚠ ', t(l('Ideia emprestada na faixa: risco de processo se ela estourar.', 'Borrowed idea in the track: lawsuit risk if it blows up.'))) : null),
      err ? h('p', { class: 'bad small', role: 'alert' }, t(err)) : null,
      h('div', { class: 'a27-actions' },
        h('button', { class: 'btn primary', disabled: !sel.length || cost > c.energy, onclick: play },
          ic('note'), ' ', t(sel.length > 1 ? l('Jogar as duas', 'Play both') : l('Jogar a carta', 'Play the card')), cost ? ` (−${cost} ⚡)` : ''),
        h('button', { class: 'btn', onclick: () => { sel = []; play(); } }, t(l('Descansar (+1 ⚡)', 'Rest (+1 ⚡)'))),
        h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Largar a sessão', 'Leave the session'))),
        h('span', { class: 'small muted' }, t(l('Teclas: 1–5 cartas · Enter joga · D descansa', 'Keys: 1–5 cards · Enter plays · D rests')))));
  };

  const play = () => {
    const res = playRound27(s, c, sel);
    if (res) { err = res; draw(); return; }
    sel = [];
    if (c.done) {
      commitBooking(s, actId, book);
      const r = finishCompose27(s, c);
      if ('pt' in r) { toast(t(r), 'bad'); close(); return; }
      result = r;
      phase = 'result';
    }
    draw();
  };

  const resultView = () => {
    const r = result!;
    const tt = totals27(c);
    const name = (id: string) => s.persons[id]?.name ?? id;
    put(
      scene(),
      h('div', { class: 'a27-result' },
        h('h3', null, r.main ? `"${r.main.title}"` : t(l('Sessão encerrada', 'Session over'))),
        r.main ? h('p', { class: 'a27-q' }, t(l('Qualidade estimada', 'Estimated quality')), ': ', h('s', null, `Q ${Math.round(r.q0)}`), ' → ', h('b', { class: r.q1 >= r.q0 ? 'good' : 'bad' }, `Q ${Math.round(r.q1)}`),
          h('span', { class: 'small muted' }, ` (${t(l('o modo rápido daria', 'quick mode would give'))} Q ${Math.round(r.q0)})`)) : null,
        h('div', { class: 'a27-preview' }, meter(l('Melodia', 'Melody'), tt.me), meter(l('Letra', 'Lyrics'), tt.ly), meter(l('Originalidade', 'Originality'), tt.or)),
        h('ul', { class: 'a27-why' }, r.why.map((x, i) => h('li', { class: i === 0 ? 'lead' : '' }, t(x)))),
        r.credits.length ? h('p', { class: 'small' }, ic('pen'), ' ', t(l('Créditos de autoria', 'Writing credits')), ': ', r.credits.map(name).join(', ')) : null,
        r.songs.length > 1 ? h('p', { class: 'small muted' }, t(l('Também saíram desta sessão', 'Also from this session')), ': ', r.songs.slice(1).map((x) => `"${x.title}" (Q ${Math.round(x.q)})`).join(', '), ' — ', t(l('com 40% do efeito das cartas.', 'with 40% of the cards\' effect.'))) : null,
        r.risk ? h('p', { class: 'warn small' }, '⚠ ', t(l('A faixa carrega uma ideia emprestada. Se fizer sucesso, o dono pode processar (a ação chega pela Caixa de entrada).', 'The track carries a borrowed idea. If it becomes a hit, the owner may sue (the claim arrives in the Inbox).'))) : null),
      h('div', { class: 'a27-actions' }, h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close')))));
  };

  function draw(): void {
    if (phase === 'intro') intro();
    else if (phase === 'round') round();
    else resultView();
    if (phase !== 'result') (root.querySelector('.a27-card, .btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  function onKey(e: KeyboardEvent): void {
    if (phase !== 'round' || !root.isConnected) return;
    const rd = c.log[c.log.length - 1];
    const k = Number(e.key);
    if (k >= 1 && k <= rd.hand.length) { const id = rd.hand[k - 1].id; sel = sel.includes(id) ? sel.filter((y) => y !== id) : [...sel, id].slice(-2); err = null; draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && sel.length && (e.target as HTMLElement)?.tagName !== 'BUTTON') { play(); e.preventDefault(); }
    else if (e.key === 'd' || e.key === 'D') { sel = []; play(); e.preventDefault(); }
  }
  document.addEventListener('keydown', onKey);
  draw();
}
