// R31 · onda 2 (V) — MECÂNICAS EM CENA (interface). Negociar, renovar, rescindir, contratar, demitir, punir e montar
// formação abrem uma cena em pixel art com você e a outra parte na sala; cada pessoa é um balão clicável com o gesto
// (humor pela opinião sobre você, ambíguo se você a conhece pouco). Embaixo, os números-chave (os mesmos do
// formulário) e as escolhas — travadas com o motivo antes do clique.
//
// Sempre disponíveis: "Pular cena" (o modo de 2 cliques: painel curto com números e escolhas), "Ver detalhes" (o
// formulário completo de sempre) e as teclas 1–9 para escolher. A preferência de atividades (flow27: "Todas",
// "Só as importantes", "Sempre rápido") decide se abre a cena ou o painel curto.
//
// Abrir, olhar e fechar não muda nada: a decisão chama a função do jogo (scene31core.decideScene31).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { askConfirm } from '../ask31';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { openOffer, openPerson } from '../ficha';
import { actMode27 } from '../act27/prefs27';
import { openNego27 } from '../act27/negotiate27';
import { savePrefs, store } from '../store';
import { basisTag31, lockBtn31 } from './lock31';
import { goDest31 } from './quick31';
import {
  decideScene31, sceneKeyOk31, sceneMode31, sceneModel31,
  type Cast31, type Choice31, type Mood31, type SceneKind31, type SceneModel31, type SceneOut31,
} from './scene31core';
import { sceneHook31 } from './scene31reg';
import { openProjects } from '../../sim/sys/project8';
import { socio31, targets31 } from '../../sim/sys/socio31';
import { goToProjects } from '../sys/project8';
import { radioTab } from '../sys/world4/industry';
import { openBiz31, openCitySoc31 } from './socio31ui';
import { hot31, labels31, stage31 } from './scene31stage';
import { nav5On } from '../../sim/r31/exp5';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const fmtL0 = (x: L, c: L, e?: L): L => ({ pt: x.pt.replace('{c}', c.pt).replace('{e}', e?.pt ?? ''), en: x.en.replace('{c}', c.en).replace('{e}', e?.en ?? '') });

/** "Ver detalhes": o formulário completo de sempre de cada mecânica. */
function details31(s: GameState, kind: SceneKind31, id: string): void {
  switch (kind) {
    case 'nego': openOffer(id, true); return;
    case 'renew': case 'rescind': store.selectedAct = id; goDest31({ area: 'artists', tab: 'artists20/career', actId: id }); return;
    case 'lineup': store.selectedAct = id; goDest31({ area: 'artists', tab: 'artists20/members', actId: id }); return;
    case 'hire': goDest31({ area: 'market' }); return;
    case 'fire': store.companyTab = 'staff'; goDest31({ area: 'company' }); return;
    case 'punish': openPerson(id); return;
    // W (onda 4): o formulário de sempre de cada mecânica do lote 2
    case 'release': { const p = openProjects(s).find((x) => x.id === id); if (p) goToProjects(p.actId, p.id); return; }
    case 'bank': store.companyTab = 'finances'; goDest31({ area: 'company' }); return;
    case 'buy': { if (id.startsWith('lb:')) { goDest31({ area: 'company' }); return; } const tg = targets31(s, true).find((x) => x.id === id); if (socio31(s).b[id]) openBiz31(s, id); else if (tg) openCitySoc31(s, tg.city); return; }
    case 'jaba': modal(t(l('Jabá e rádio', 'Payola and radio')), radioTab(s), { wide: true }); return;
    case 'jabain': goDest31({ area: 'business' }); return;
  }
  void s;
}

function numsView(m: SceneModel31, compact = false): HTMLElement {
  const nums = compact ? m.nums.slice(0, 4) : m.nums;
  return h('dl', { class: 'mc31-nums' }, nums.map((n) => h('div', { title: n.hint ? t(n.hint) : undefined },
    h('dt', null, h('span', null, t(n.label)), n.basis ? basisTag31(n.basis, n.basis === 'guess') : null),
    h('dd', null, T(n.value)))));
}

const FIRST_TIP: L = l('Primeira vez aqui: cada balão é uma pessoa — passe o mouse, toque ou use Tab para ver o gesto e o que ele quer dizer. Os números embaixo são os mesmos do formulário (passe o mouse para a explicação). As teclas 1–9 escolhem; "Pular cena" decide em dois cliques.',
  'First time here: each bubble is a person — hover, tap or Tab to see the gesture and what it means. The numbers below are the same as the form\'s (hover for the explanation). Keys 1–9 choose; "Skip scene" decides in two clicks.');

/** Abre a cena (ou o painel de 2 cliques). `force` ignora a preferência. */
export function openScene31(kind: SceneKind31, id: string, force?: 'scene' | 'quick'): void {
  const s = store.game;
  if (!s) return;
  const m0 = sceneModel31(s, kind, { id });
  if (!m0) { toast(t(l('Não está mais disponível.', 'No longer available.')), 'bad'); return; }
  let mode: 'scene' | 'quick' = force ?? sceneMode31(s, kind, { id }, actMode27());
  let m: SceneModel31 = m0;
  let out: SceneOut31 | null = null;
  let react: Record<string, Mood31> = {};
  let picked: Cast31 | null = null;
  let helpOn = false; // R31 onda 5 (CENAS5): ajuda da cena aberta pelo "?" (sem a caixa da primeira visita)
  const seen = store.prefs.sceneSeen31 ?? [];
  const firstVisit = !seen.includes(kind);
  if (firstVisit) { store.prefs.sceneSeen31 = [...seen, kind]; savePrefs(); }
  const root = h('div', { class: 'mc31', 'data-scene31': kind });
  let close = () => {};

  let asking = false;
  const choose = async (c: Choice31): Promise<void> => {
    if (out || c.lock || asking) return;
    if (c.opens === 'nego-table') { close(); openNego27(id); return; }
    // W2-REV: escolha perigosa (rescindir, demitir, multar) pede confirmação no painel do jogo
    if (c.danger) {
      asking = true;
      const ok = await askConfirm(fmtL0(l('{c}? {e}', '{c}? {e}'), c.label, c.effect), { title: m.title, ok: c.label, danger: true });
      asking = false;
      if (!ok || out || !root.isConnected) return;
    }
    const res = decideScene31(s, kind, { id }, c.id);
    const them = m.cast.find((x) => x.side === 'them');
    if (them && res.react) react = { [them.id]: res.react };
    toast(t(res.text), res.tone === 'good' ? 'good' : res.tone === 'warn' ? 'info' : 'bad');
    // W: ajuste que não encerra a cena (cartão no quadro): a sala continua, com os números já atualizados
    if (c.stay && res.ok) { draw(); return; }
    out = res;
    draw();
    (root.querySelector('.mc31-out button') as HTMLElement | null)?.focus();
  };

  const choicesView = (): HTMLElement => h('div', { class: 'mc31-choices', role: 'group', 'aria-label': t(l('Escolhas', 'Choices')) },
    m.choices.length ? m.choices.map((c, i) => h('div', { class: 'mc31-choice' },
      lockBtn31(h('span', null, i < 9 ? h('span', { class: 'mc31-key', 'aria-hidden': 'true' }, String(i + 1)) : null, t(c.label)), out ? null : c.lock,
        () => { void choose(c); }, { cls: `btn${c.primary ? ' primary' : ''}${c.danger ? ' danger' : ''}`, attrs: { disabled: !!out, 'data-choice31': c.id } }),
      c.cost ? h('small', null, '≈ ', $(c.cost)) : null,
      c.effect ? h('small', null, t(c.effect)) : null))
      : h('p', { class: 'muted small' }, t(l('Nada a decidir aqui agora.', 'Nothing to decide here right now.'))));

  const outView = (): HTMLElement | null => (out ? h('div', { class: `mc31-out ${out.tone}`, role: 'status' },
    h('p', null, out.react ? `${out.react.icon} ` : '', t(out.text)),
    h('button', { type: 'button', class: 'btn primary small', onclick: () => close() }, t(l('Fechar', 'Close')))) : null);

  const whoView = (): HTMLElement => h('p', { class: 'mc31-who', 'aria-live': 'polite' }, picked ? [
    h('b', null, picked.name), ' · ', t(picked.part ?? l('', '')), ' · ', `${(react[picked.id] ?? picked.mood).icon} ${t((react[picked.id] ?? picked.mood).label)}`,
    (react[picked.id] ?? picked.mood).clear ? '' : h('small', { class: 'muted' }, ' ', t(l('(leitura ambígua: você conhece pouco esta pessoa)', '(ambiguous read: you know this person little)'))),
    s.persons[picked.id] ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => openPerson(picked!.id) }, t(l('Ficha', 'Profile'))) : null,
  ] : h('span', { class: 'muted small' }, t(l('Clique numa pessoa (ou use Tab) para ver como ela está reagindo.', 'Click a person (or use Tab) to see how they are reacting.'))));

  const foot = (): HTMLElement => h('div', { class: 'mc31-foot' },
    h('div', { class: 'row wrap' },
      mode === 'scene'
        ? h('button', { type: 'button', class: 'btn small ghost', 'data-skip31': '', title: t(l('Decidir sem a cena: números e escolhas num painel curto.', 'Decide without the scene: numbers and choices in a short panel.')), onclick: () => { mode = 'quick'; draw(); } }, '⏭ ', t(l('Pular cena', 'Skip scene')))
        : h('button', { type: 'button', class: 'btn small ghost', 'data-show31': '', onclick: () => { mode = 'scene'; draw(); } }, '🎬 ', t(l('Ver a cena', 'Show the scene'))),
      h('button', { type: 'button', class: 'btn small ghost', title: t(l('O formulário completo de sempre, com todos os campos.', 'The usual full form, with every field.')), onclick: () => { close(); details31(s, kind, id); } }, '📋 ', t(l('Ver detalhes', 'See details')))),
    // R31 onda 5 (CENAS5): no jogo explorável, "mostrar clicáveis" e os rótulos são o Alt; a ajuda da cena fica no "?"
    mode === 'scene' && nav5On(s) ? h('div', { class: 'row wrap' }, h('button', { type: 'button', class: 'kb5 mc5-help', title: t(FIRST_TIP), 'aria-label': t(FIRST_TIP), 'aria-expanded': helpOn ? 'true' : 'false', onclick: () => { helpOn = !helpOn; draw(); } }, '?'))
      : mode === 'scene' ? h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn small ghost', 'aria-pressed': hot31() ? 'true' : 'false', onclick: () => { store.prefs.sceneHot31 = !hot31(); savePrefs(); draw(); } }, t(l('Mostrar tudo que é clicável', 'Show everything clickable'))),
      h('button', { type: 'button', class: 'btn small ghost', 'aria-pressed': labels31(s) ? 'true' : 'false', onclick: () => { store.prefs.sceneLabels31 = labels31(s) ? 'off' : 'on'; savePrefs(); draw(); } }, t(l('Rótulos nos balões', 'Labels on bubbles')))) : null);

  const put = (...xs: (Node | null)[]): void => root.replaceChildren(...xs.filter((x): x is Node => !!x));
  function draw(): void {
    const fresh = !out ? sceneModel31(s!, kind, { id }) : null;
    if (fresh) m = fresh;
    const lockNote = m.lock ? h('p', { class: 'lk31-why', role: 'note' }, '🔒 ', t(m.lock.why), h('span', { class: 'lk31-cond' }, ` → ${t(m.lock.unlock)}`)) : null;
    if (mode === 'quick') {
      put(
        h('p', { class: 'small muted' }, t(l('Modo rápido: escolha e pronto — o resultado é o mesmo da cena.', 'Quick mode: choose and you are done — the result is the same as the scene\'s.'))),
        numsView(m, true), m.note ? h('p', { class: 'small muted' }, t(m.note)) : null, lockNote,
        m.lock ? null : choicesView(), outView(), foot());
    } else {
      put(
        (nav5On(s!) ? helpOn : firstVisit && !out) ? h('p', { class: nav5On(s!) ? 'mc5-tip' : 'mc31-tip' }, t(FIRST_TIP)) : null,
        stage31(s!, m, { react, onPick: (c) => { picked = c; draw(); (root.querySelector(`[data-mc31="${c.id}"]`) as HTMLElement | null)?.focus(); } }),
        whoView(), numsView(m), m.note ? h('p', { class: 'small muted' }, t(m.note)) : null, lockNote,
        m.lock ? null : choicesView(), outView(), foot());
    }
  }

  const onKey = (e: KeyboardEvent): void => {
    if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tg = e.target as HTMLElement | null;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA')) return;
    if (!sceneKeyOk31(root.closest('.overlay'), [...document.querySelectorAll('.overlay')], tg)) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 9 && m.choices[n - 1] && !m.lock) { e.preventDefault(); void choose(m.choices[n - 1]); }
  };
  document.addEventListener('keydown', onKey);
  draw();
  close = modal(t(m0.title), root, { wide: true, onClose: () => { document.removeEventListener('keydown', onKey); if (out) rerender(); } });
}

/** Botão de ação de sempre que passa pela cena quando a preferência pede; senão faz o caminho direto (`direct`) ou o painel de 2 cliques. */
export function sceneOr31(kind: SceneKind31, id: string, direct?: () => void): void {
  const s = store.game;
  if (!s) return;
  const mode = sceneMode31(s, kind, { id }, actMode27());
  if (mode === 'quick' && direct) { direct(); return; }
  openScene31(kind, id, mode);
}

sceneHook31.open = (kind, id, force) => openScene31(kind, id, force);
sceneHook31.or = sceneOr31;
