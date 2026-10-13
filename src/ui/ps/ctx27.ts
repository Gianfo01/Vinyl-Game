// Rodada 27 (CTX) — menu de ações das entidades: clique direito (desktop), toque longo ~500 ms (celular) ou
// Shift+F10 / tecla de menu num nome com `data-ent` + `data-id` (ent27.ts). Um ouvinte delegado no documento serve o
// jogo inteiro; os link helpers (actLink, personLink16, labelLink, releaseLink, cityLink…) já carimbam a marca.
//
// Regras: um menu por vez; dentro da tela (ou folha inferior no celular); setas/Home/End/letra navegam, Enter/Espaço
// executam, Esc fecha e devolve o foco, Tab/clique fora/rolagem fecham. Item indisponível aparece com o motivo
// (aria-disabled) e não executa. Sem marca → menu nativo do navegador; Ctrl+clique direito → sempre o nativo.
// Cada ação chama o MESMO fluxo da tela de sempre (docs/act27.md: um caminho só) — nada de telas paralelas.

import { buildSongSpec } from '../../audio/spec';
import { audioAvailable, nowPlaying, play, stopAll } from '../../audio/engine';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { hireStaff } from '../../sim/economy';
import { lunch } from '../../sim/sys/managers14';
import { sendGift } from '../../sim/sys/persona13';
import { dinner } from '../../sim/sys/producers15';
import { toggleWatch } from '../../sim/sys/scout11';
import { startStep23 } from '../../sim/sys/scout23';
import { VENUES17 } from '../../sim/sys/venues17';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { favorAct27 } from '../act27/flow27p2';
import { $, inspect, rerender, toast } from '../common';
import { compareActs } from '../compare';
import { h } from '../dom';
import { openOffer } from '../ficha';
import { openActPage } from '../pages';
import { EXTRA_AREAS } from '../registry';
import { savePrefs, store } from '../store';
import { openActionMenu20, chooseAction20 } from '../sys/actmenu20';
import { openLabelDossier } from '../sys/dossier13';
import { openMapInfo17, openVenue17 } from '../sys/mapinfo17';
import { openCity27 } from '../sys/mundo27';
import { openPerson16 } from '../sys/people16';
import { presetCity23 } from '../sys/talentos23';
import { TIPS18 } from '../tracks18';
import { ic, setTab } from '../vis';
import { ctxMenu27, type CtxEnv27, type CtxItem27, type CtxMenu27, type Grp27 } from './ctx27model';
import { isEnt27, type Ent27 } from './ent27';
import './ctx27.css';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const g = (): GameState | null => store.game ?? null;

// ---------------------------------------------------------------- ambiente (o que existe nesta sessão)

const areaOn = (s: GameState, id: string): boolean => EXTRA_AREAS.some((a) => a.id === id && (!a.visible || a.visible(s)));
const songMarketArea = (s: GameState): string | undefined => EXTRA_AREAS.find((a) => /songmarket|songmkt/i.test(a.id) && (!a.visible || a.visible(s)))?.id;
export function env27(s: GameState): CtxEnv27 {
  return {
    has: (f) => {
      if (f === 'audio') return audioAvailable();
      if (f === 'songmarket') return !!songMarketArea(s);
      if (f.startsWith('area:')) return areaOn(s, f.slice(5));
      return false;
    },
  };
}

// ---------------------------------------------------------------- navegação e fluxos de sempre

/** Vai a uma área (fecha janelas abertas por cima, como a navegação normal). */
function goArea(s: GameState, area: string, tab?: [string, string], actId?: string): void {
  document.querySelectorAll('.overlay, .scene-overlay').forEach((x) => x.remove());
  if (tab) setTab(tab[0], tab[1]);
  if (actId && playerActs(s).includes(actId)) store.selectedAct = actId;
  (store as { area: string }).area = area;
  rerender();
}
const say = (x: L | null, ok: L) => { toast(T(x ?? ok), x ? 'bad' : 'good'); rerender(); };
const res = (r: { ok: boolean; text: L }) => { toast(T(r.text), r.ok ? 'good' : 'bad'); rerender(); };

function listen(s: GameState, songId: string | undefined): void {
  if (nowPlaying()) { stopAll(); toast(T(l('Prévia parada.', 'Preview stopped.'))); return; }
  const so = songId ? s.songs[songId] : undefined;
  if (!so) return;
  const hd = play(buildSongSpec(s, so));
  toast(hd ? `♪ ${so.title} — ${T(l('clique direito de novo para parar', 'right-click again to stop'))}` : T(l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.')), hd ? 'info' : 'bad');
}

async function copyText(txt: string): Promise<void> {
  let ok = false;
  try { await navigator.clipboard.writeText(txt); ok = true; } catch {
    try {
      const ta = h('textarea', { style: 'position:fixed;left:-9999px;top:0', 'aria-hidden': 'true' }, txt);
      document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
    } catch { ok = false; }
  }
  toast(ok ? `${T(l('Copiado', 'Copied'))}: ${txt}` : T(l('Não deu para copiar neste navegador.', 'Could not copy in this browser.')), ok ? 'good' : 'bad');
}

/** Liga cada id do modelo ao fluxo de sempre. */
function run(s: GameState, m: CtxMenu27, item: CtxItem27, anchor: HTMLElement): void {
  const id = m.id;
  const key = id;
  const name = T(m.name);
  switch (item.id) {
    case 'copy': void copyText(name); return;
    // artista
    case 'act.open': inspect.act(id); return;
    case 'act.agenda': case 'act.compose': chooseAction20(s, 'agenda.edit', id, anchor); return;
    case 'act.record': chooseAction20(s, 'record.prepare', id, anchor); return;
    case 'act.release': goArea(s, 'releases', undefined, id); return;
    case 'act.tour': chooseAction20(s, 'shows.view', id, anchor); return;
    case 'act.more': openActionMenu20(s, id, anchor); return;
    case 'act.offer': openOffer(id); return;
    case 'act.watch': { const on = toggleWatch(s, id); toast(T(on ? l('Observando: alertas todo mês.', 'Watching: monthly alerts.') : l('Saiu da observação.', 'Removed from watchlist.')), 'info'); rerender(); return; }
    case 'act.scout': say(startStep23(s, id), l('Pedido feito: o relatório chega em breve.', 'Done: the report arrives soon.')); return;
    case 'act.compare': compareActs(s, [id]); return;
    case 'act.charts': goArea(s, 'charts'); return;
    case 'act.known': openActPage(id, 'secrets23'); return;
    // pessoa
    case 'person.open': openPerson16(key); return;
    case 'person.hire': say(hireStaff(s, key.slice(2)), l('Contratado(a) para a equipe.', 'Hired for the staff.')); return;
    case 'person.lunch': favorAct27(s, key, 'lunch', () => res(lunch(s, key.slice(2)))); return;
    case 'person.dinner': favorAct27(s, key, 'dinner', () => res(dinner(s, key.slice(3)))); return;
    case 'person.gift': favorAct27(s, key, 'gift', () => { toast(T(sendGift(s, key)), 'info'); rerender(); }); return;
    case 'person.rel': openPerson16(key, 'rel'); return;
    case 'person.known': openPerson16(key, 'secrets23'); return;
    // gravadora
    case 'label.open': openLabelDossier(id); return;
    case 'label.rival': openLabelDossier(id, 'you'); return;
    case 'label.roster': openLabelDossier(id, 'roster'); return;
    case 'label.money': openLabelDossier(id, 'money'); return;
    // cidade
    case 'city.open': document.querySelectorAll('.overlay, .scene-overlay').forEach((x) => x.remove()); openCity27(id); return;
    case 'city.scene': openMapInfo17(s, 'city', id); return;
    case 'city.home': goArea(s, 'campus18'); return;
    case 'city.show': goArea(s, 'shows'); return;
    case 'city.scout': presetCity23(id); goArea(s, 'market', ['marketHub', 'search']); return;
    // lançamento e música
    case 'release.open': inspect.release(id); return;
    case 'release.act': inspect.act(s.releases[id]?.actId ?? ''); return;
    case 'release.listen': listen(s, s.releases[id]?.songs.find((x) => s.songs[x])); return;
    case 'release.charts': goArea(s, 'charts'); return;
    case 'release.campaign': goArea(s, 'releases', undefined, s.releases[id]?.actId); return;
    case 'song.open': case 'song.credits': {
      const so = s.songs[id];
      if (so?.releaseId && s.releases[so.releaseId]) inspect.release(so.releaseId);
      else goArea(s, 'creation', ['creation-write', 'repertoire'], so?.actId);
      return;
    }
    case 'song.listen': listen(s, id); return;
    case 'song.market': { const a = songMarketArea(s); if (a) goArea(s, a); return; }
    case 'song.sync': goArea(s, 'media19'); return;
    // lugares
    case 'venue.open': openVenue17(s, id); return;
    case 'venue.show': goArea(s, 'shows'); return;
    case 'venue.city': { const v = VENUES17.find((x) => x.id === id); if (v) openCity27(v.city); return; }
    case 'festival.open': goArea(s, 'festivals'); return;
    case 'place.open': goArea(s, 'campus18'); return;
    case 'org.open': goArea(s, 'crime'); return;
    default: return;
  }
}

// ---------------------------------------------------------------- o menu

const GRP: Record<Grp27, L> = { open: l('Abrir', 'Open'), do: l('Ações', 'Actions'), info: l('Saber mais', 'Learn more') };
let closeOpen: ((refocus: boolean) => void) | null = null;
let seq = 0;

/** Fecha o menu aberto (se houver). */
export function closeCtx27(): void { closeOpen?.(false); }

/** Abre o menu da entidade ancorado no elemento (ou no ponto do clique / do toque). */
export function openCtx27(s: GameState, ent: Ent27, id: string, anchor: HTMLElement, at?: { x: number; y: number }, sheet = false): boolean {
  const m = ctxMenu27(s, ent, id, env27(s), (anchor.textContent ?? '').trim());
  if (!m || !m.items.length) return false;
  closeOpen?.(false);
  const mid = `cx27-${++seq}`;
  const mobile = sheet || window.innerWidth <= 600;
  const items: HTMLElement[] = [];
  const status = h('div', { class: 'cx27-status small', role: 'status', 'aria-live': 'polite' });
  const playing = !!nowPlaying();
  const pick = (it: CtxItem27) => {
    if (it.block) { status.textContent = `${T(it.label)}: ${T(it.block)}`; return; }
    close(false);
    try { run(s, m, it, anchor); } catch (e) { console.warn('ctx27', e); toast(T(l('Não deu para abrir agora.', 'Could not open right now.')), 'bad'); }
  };
  const row = (it: CtxItem27) => {
    const label = it.id.endsWith('.listen') && playing ? l('Parar a prévia', 'Stop the preview') : it.label;
    const el = h('div', { role: 'menuitem', tabindex: '-1', class: `cx27-item${it.block ? ' off' : ''}`, 'aria-disabled': it.block ? 'true' : null, 'data-act': it.id,
      onclick: (e: Event) => { e.stopPropagation(); pick({ ...it, label }); } },
      h('span', { class: 'cx27-l' }, it.icon ? ic(it.icon) : null, h('span', null, T(label))),
      it.cost ? h('span', { class: 'cx27-c num' }, $(it.cost)) : null,
      it.block ? h('small', { class: 'cx27-why' }, T(it.block)) : it.note ? h('small', { class: 'muted' }, T(it.note)) : null);
    items.push(el);
    return el;
  };
  const groups = (['open', 'do', 'info'] as Grp27[]).map((gr) => ({ gr, xs: m.items.filter((x) => x.grp === gr) })).filter((x) => x.xs.length);
  const menu = h('div', { role: 'menu', id: mid, class: 'cx27-menu', 'aria-label': `${T(l('Ações', 'Actions'))}: ${T(m.name)}` },
    groups.map((x, i) => [i ? h('div', { role: 'separator', class: 'cx27-sep' }) : null,
      h('div', { role: 'group', 'aria-label': T(GRP[x.gr]) }, x.xs.map(row))]));
  const box = h('div', { class: `cx27${mobile ? ' sheet' : ''}`, 'data-ctx27': '' },
    h('div', { class: 'cx27-head' }, h('b', null, T(m.name)), h('small', { class: 'muted' }, T(m.kind))),
    menu, status);
  const scrim = mobile ? h('div', { class: 'cx27-scrim', onclick: () => close(true) }) : null;
  const focusAt = (i: number) => { const n = items.length; if (!n) return; items[((i % n) + n) % n].focus(); };
  const cur = () => items.indexOf(document.activeElement as HTMLElement);
  const onKey = (e: KeyboardEvent) => {
    const i = cur();
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(i < 0 ? -1 : i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(items.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') { e.preventDefault(); close(true); }
    else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) { e.preventDefault(); items[i].click(); }
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase(), n = items.length;
      for (let j = 1; j <= n; j++) { const el = items[(Math.max(i, 0) + j) % n]; if ((el.textContent ?? '').trim().toLowerCase().startsWith(k)) { el.focus(); break; } }
    }
    e.stopPropagation(); // o Esc não fecha a janela de baixo; atalhos globais não disparam com o menu aberto
  };
  const onDown = (e: Event) => { if (!box.contains(e.target as Node)) close(false); };
  const onScroll = (e: Event) => { if (!box.contains(e.target as Node)) close(false); };
  const onResize = () => close(false);
  function close(refocus: boolean): void {
    if (!box.isConnected) return;
    box.remove(); scrim?.remove();
    document.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onResize);
    closeOpen = null;
    if (refocus && anchor.isConnected) anchor.focus();
  }
  if (scrim) document.body.appendChild(scrim);
  document.body.appendChild(box);
  box.addEventListener('keydown', onKey);
  // ouvintes de fechar só depois do gesto que abriu (o próprio pointerdown/scroll do toque longo não fecha)
  setTimeout(() => {
    if (!box.isConnected) return;
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
  }, 0);
  closeOpen = close;
  if (!mobile) {
    const r = at ? { left: at.x, right: at.x, top: at.y, bottom: at.y } : anchor.getBoundingClientRect();
    const w = box.offsetWidth || 300, hh = box.offsetHeight || 280;
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.max(8, Math.min(vw - w - 8, r.left));
    const below = vh - r.bottom - 8 >= hh || r.top < vh / 2;
    const top = below ? Math.min(r.bottom + 4, vh - Math.min(hh, vh - 16) - 8) : Math.max(8, r.top - hh - 4);
    box.style.left = `${left}px`;
    box.style.top = `${Math.max(8, top)}px`;
    box.style.maxHeight = `${vh - Math.max(8, top) - 8}px`;
  }
  focusAt(0);
  return true;
}

// ---------------------------------------------------------------- ouvintes delegados

const SKIP = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
function entOf(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('[data-ctx27]') || target.closest(SKIP)) return null;
  const el = target.closest<HTMLElement>('[data-ent][data-id]');
  return el && isEnt27(el.dataset.ent) && el.dataset.id ? el : null;
}
function openFor(el: HTMLElement, at?: { x: number; y: number }, sheet = false): boolean {
  const s = g();
  if (!s) return false;
  const ok = openCtx27(s, el.dataset.ent as Ent27, el.dataset.id!, el, at, sheet);
  if (ok) markSeen();
  return ok;
}
function markSeen(): void {
  try { const p = (store.prefs.tut18 ??= { tours: {}, tips: {}, visits: {}, done: {} }); p.tips ??= {}; if (!p.tips.ctx27) { p.tips.ctx27 = 1; savePrefs(); } } catch { /* sem preferências */ }
}

let lastOpen = 0;
let swallowClickUntil = 0;
let held = false; // dedo ainda no vidro depois do toque longo: o clique da soltura é engolido
let lp: { timer: number; x: number; y: number } | null = null;
const cancelLp = () => { if (lp) { clearTimeout(lp.timer); lp = null; } };

export function installCtx27(doc: Document = document): void {
  const w = doc.defaultView ?? window;
  doc.addEventListener('contextmenu', (e) => {
    if (e.ctrlKey) return; // saída de emergência: Ctrl+clique direito = menu nativo
    const el = entOf(e.target);
    if (!el || !g()) return;
    if (Date.now() - lastOpen < 900) { e.preventDefault(); return; } // já abriu pelo toque longo / teclado
    const touch = !!lp; // Android dispara contextmenu no toque longo: vira a mesma folha do toque
    cancelLp();
    const kb = e.clientX === 0 && e.clientY === 0; // tecla de menu: sem ponteiro
    if (openFor(el, kb ? undefined : { x: e.clientX, y: e.clientY }, touch)) {
      e.preventDefault(); e.stopPropagation();
      if (touch) { lastOpen = Date.now(); swallowClickUntil = Date.now() + 10000; held = true; }
    }
  }, true);
  doc.addEventListener('keydown', (e) => {
    if (!((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu')) return;
    const el = entOf(doc.activeElement);
    if (!el) return;
    if (openFor(el)) { e.preventDefault(); e.stopPropagation(); lastOpen = Date.now(); }
  }, true);
  // toque longo (~500 ms) — sem mexer o dedo; o clique que viria depois é engolido
  doc.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const el = entOf(e.target);
    if (!el || !g()) return;
    cancelLp();
    const x = e.clientX, y = e.clientY;
    lp = { x, y, timer: w.setTimeout(() => {
      lp = null;
      if (!el.isConnected) return;
      if (openFor(el, { x, y }, true)) { lastOpen = Date.now(); swallowClickUntil = Date.now() + 10000; held = true; try { navigator.vibrate?.(12); } catch { /* sem vibração */ } }
    }, 500) };
  }, { capture: true, passive: true });
  doc.addEventListener('pointermove', (e) => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) cancelLp(); }, { capture: true, passive: true });
  for (const ev of ['pointerup', 'pointercancel']) doc.addEventListener(ev, () => { cancelLp(); if (held) { held = false; swallowClickUntil = Date.now() + 400; } }, { capture: true, passive: true });
  w.addEventListener('scroll', cancelLp, { capture: true, passive: true });
  doc.addEventListener('click', (e) => {
    // o clique sintético do fim do toque longo (no nome ou num item da folha que surgiu sob o dedo) não vale
    if (Date.now() < swallowClickUntil) { e.preventDefault(); e.stopPropagation(); swallowClickUntil = 0; }
  }, true);
}

// clique esquerdo num nome de cidade (cityLink) abre a ficha da cidade no mapa
inspect.city = (id: string) => { document.querySelectorAll('.overlay, .scene-overlay').forEach((x) => x.remove()); openCity27(id); };

// ---------------------------------------------------------------- dica de 1ª vez (sistema de dicas do tutorial18)

TIPS18.push({
  id: 'ctx27',
  title: l('Ações nos nomes', 'Actions on names'),
  text: l('Clique com o botão direito (ou toque longo) em nomes — artistas, pessoas, gravadoras, cidades, músicas — para ver ações: abrir a ficha, propor contrato, marcar show, observar, comparar… Shift+F10 faz o mesmo pelo teclado.',
    'Right-click (or long-press) names — artists, people, labels, cities, songs — to see actions: open the page, make an offer, book a gig, watch, compare… Shift+F10 does the same from the keyboard.'),
  seen: (s) => playerActs(s).length > 0 || Object.keys(s.knowledge).length > 0,
});

if (typeof document !== 'undefined' && typeof window !== 'undefined') installCtx27(document);
