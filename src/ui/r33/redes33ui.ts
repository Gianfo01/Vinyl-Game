// R33 · REDES — telas do app Redes e do Jornal, na mesma arte do resto do jogo (papéis da sede e cartão de ações).
//  • `openJornal33()`  o Jornal reformulado (folha, revista de rádio, fofoca, paradas, TV e fanzines, jornal e portal).
//  • `openRedes33()`   o feed de redes (2004 perfil · 2006 post curto · 2010 foto · 2018 vídeo curto · 2030 avatar).
//  • `redesApp33`      o registro do app para a casca do celular/PC (APARELHOS33 pluga no gancho; esta frente não edita a casca).
// Toda matéria ou post clicável abre o cartão de ações (ACOES5) por `showAdhoc5`; os classificados apontam para ações
// que já existem (garimpar, chamar para sair, loja de decoração, leilão…). Pontos de entrada provisórios: o cartão do
// objeto "Jornal na mesa" (e o Jornal da cidade) ganha "Ler o jornal" e, de 2004 em diante, "Abrir as redes".

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { sw } from '../../sim/r31/switches';
import {
  FORMS33, boatos33, congrats33, delegate33, feed33, form33, formName33, goLive33, hackChance33, hireSecurity33, LIVE_FROM33, ownPost33, plantNote33, letRun33,
  react33, recoverAccount33, redes33, redes33On, SEC_COST33, viralClip33, viralRollout33, VIRAL_FROM33, type FeedItem33, type Form33, type Res33,
} from '../../sim/r33/redes33';
import { CLASSIFIED33, JSEC33, answerLetter33, jornal33, papers33, type JItem33, type JSec33 } from '../../sim/r33/jornal33';
import { bribe18 } from '../../sim/sys/press18';
import { pr18 } from '../../sim/sys/press18';
import { dirOn33 } from '../../sim/r33/dir33';
import { tone33 } from '../../sim/r33/redes33';
import { factById } from '../../sim/facts17';
import type { Act, GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { cover, inspect, monthName, rerender, toast } from '../common';
import { portraitCanvas } from '../pixel/avatar';
import { cityById } from '../../data/world';
import { causeChain } from '../../sim/facts17';
import { leadOf18 } from '../../sim/sys/feud18';
import { h } from '../dom';
import { store } from '../store';
import { ACTS_CAT5 } from '../r31/acoes5cat';
import { CARDS5 } from '../r31/acoes5data';
import { showAdhoc5 } from '../r31/acoes5';
import type { ActCtx5, ActDef5, Card5, CardAct5 } from '../r31/acoes5model';
import { openDecoShop31 } from '../r31/decoshop31ui';
import { goDest31 } from '../r31/quick31';
import { ep5Of } from '../pixel/exp5px';
import { masthead33, px33canvas, redesIcon33, thumb33, ICON33 } from './redes33px';
import './redes33.css';

// ================================================================ casca avulsa (papel por cima da cena)

interface Sheet { el: HTMLElement; body: HTMLElement; close: () => void; redraw: () => void }
let OPEN: Sheet | null = null;
function sheet(build: (s: GameState, sh: Sheet) => HTMLElement, title: () => string, sub: () => string): Sheet | null {
  const s = store.game;
  if (!s || typeof document === 'undefined') return null;
  OPEN?.close();
  const ov = h('div', { class: 'r33-ov' });
  const box = h('section', { class: `r33-sheet ep${ep5Of(s.year)}`, role: 'dialog', 'aria-modal': 'true' });
  const body = h('div', null);
  const sh: Sheet = { el: ov, body, close: () => { ov.remove(); document.removeEventListener('keydown', onKey); if (OPEN === sh) OPEN = null; }, redraw: () => {
    const g = store.game;
    if (!g) return;
    const y = ov.scrollTop;
    box.setAttribute('aria-label', title());
    body.replaceChildren(build(g, sh));
    head.querySelector('h2')!.textContent = title();
    head.querySelector('small')!.textContent = sub();
    ov.scrollTop = y;
  } };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape' && !document.querySelector('.ac5')) { e.preventDefault(); sh.close(); } };
  const head = h('header', { class: 'r33-head' }, h('h2', null, ''), h('small', null, ''), h('button', { type: 'button', class: 'r33-x', 'aria-label': t(l('Fechar (Esc)', 'Close (Esc)')), onclick: sh.close }, '×'));
  box.append(head, body);
  ov.append(box);
  ov.addEventListener('pointerdown', (e) => { if (e.target === ov) sh.close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(ov);
  OPEN = sh;
  sh.redraw();
  (box.querySelector<HTMLElement>('.r33-tab, .r33-it, .r33-btn') ?? box.querySelector<HTMLElement>('.r33-x'))?.focus();
  return sh;
}

// ================================================================ cartões avulsos (ACOES5)

type Run = (s: GameState, c: ActCtx5) => Res33 | void;
function A(id: string, label: L, run: Run, lock?: L | null): CardAct5 {
  return { id, label, kind: 'do', lock: lock ?? null, run: (s, c) => { const r = run(s, c); return r ? { text: r.text, bad: !r.ok } : undefined; } };
}
/** Ação existente do catálogo ACOES5 (ex.: 'garimpar'), montada para este cartão. */
function fromCatalog(s: GameState, id: string): CardAct5 | null {
  const d: ActDef5 | undefined = ACTS_CAT5[id];
  if (!d || (d.when && !d.when(s))) return null;
  let lock: ReturnType<NonNullable<ActDef5['lock']>> = null;
  try { lock = d.lock?.(s) ?? null; } catch { lock = null; }
  return { id, label: d.label, kind: d.kind, lock, run: d.kind === 'open' ? (_s, c) => c.open(d.obj!, d.mark) : (g, c) => d.run?.(g, c) };
}
const rectOf = (e: Event): DOMRect | undefined => (e.currentTarget as HTMLElement | null)?.getBoundingClientRect();
const mineActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a);
const actFor = (s: GameState, id?: string): string | undefined => (id && mineActs(s).some((a) => a.id === id) ? id : undefined);

function toneName(x: string): L {
  const m: Record<string, L> = { humilde: l('humilde', 'humble'), arrogante: l('arrogante', 'arrogant'), engracado: l('engraçado', 'funny'), misterioso: l('misterioso', 'mysterious'), politico: l('político', 'political'), romantico: l('romântico', 'romantic') };
  return m[x] ?? l(x, x);
}

/** Cartão de um post do feed. */
export function cardPost33(s: GameState, p: FeedItem33): Card5 {
  const acts: CardAct5[] = [];
  const hacked = !!redes33(s).hacked[p.who];
  if (p.mine) {
    if (hacked && p.bad) acts.push(A('r33.recover', l('Recuperar a conta', 'Recover the account'), (g) => recoverAccount33(g, p.who)));
    else {
      acts.push(A('r33.post', l('Postar sobre isso', 'Post about it'), (g) => ownPost33(g, p.who, 'post', p.fid)));
      acts.push(A('r33.deny', l('Desmentir', 'Deny'), (g) => ownPost33(g, p.who, 'deny', p.fid ?? undefined), p.fid ? null : l('Só sobre um fato.', 'Only about a fact.')));
      acts.push(A('r33.sorry', l('Pedir desculpa', 'Apologise'), (g) => ownPost33(g, p.who, 'apologize', p.fid)));
      acts.push(A('r33.quiet', l('Ficar quieto', 'Stay quiet'), (g) => ownPost33(g, p.who, 'quiet', p.fid)));
      acts.push(A('r33.delegate', l('Delegar à assessoria', 'Hand it to the press office'), (g) => delegate33(g, p.id), dirOn33(s) ? null : l('Ligue os diretores (exp33.dir).', 'Turn the directors on (exp33.dir).')));
    }
  } else if (!p.world) {
    const me = actFor(s, store.selectedAct ?? undefined) ?? mineActs(s)[0]?.id;
    const done = p.done ? l('Você já reagiu a esse post.', 'You already reacted to this post.') : null;
    const none = me ? null : l('Você ainda não tem artista no elenco.', 'You have no act on the roster yet.');
    acts.push(A('r33.like', l('Curtir', 'Like'), (g) => react33(g, p.id, 'like', me), done ?? none));
    acts.push(A('r33.repost', l('Repostar (aproxima)', 'Repost (grows closer)'), (g) => react33(g, p.id, 'repost', me), done ?? none));
    acts.push(A('r33.reply', l(p.jab ? 'Responder à indireta' : 'Responder (pode virar briga)', p.jab ? 'Answer the jab' : 'Reply (may turn into a feud)'), (g) => react33(g, p.id, 'reply', me), done ?? none));
    acts.push(A('r33.ignore', l('Ignorar', 'Ignore'), (g) => react33(g, p.id, 'ignore', me), done ?? none));
  } else {
    acts.push(A('r33.world', l('Acompanhar no Jornal', 'Follow it in the paper'), (_g, c) => { c.close(); openJornal33(); }));
  }
  const a = p.act;
  return {
    id: 'r33.post', title: l(`Post de ${p.voice.pt}`, `Post by ${p.voice.en}`),
    nums: a ? [{ label: l('Fama', 'Fame'), value: String(Math.round(a.fame)), bar: a.fame / 100 }, { label: l('Tom', 'Tone'), value: t(toneName(p.tone)) }] : [],
    lines: [p.text], acts,
  };
}

/** Cartão de um boato sobre artista seu (Coluna social e painel de boatos). */
export function cardBoato33(s: GameState, fid: string, actId: string): Card5 {
  const f = factById(s, fid);
  const pub = f?.visibility === 'public';
  const acts: CardAct5[] = [
    A('r33.b.post', l('Postar (vira público)', 'Post it (goes public)'), (g) => ownPost33(g, actId, 'post', fid)),
    A('r33.b.deny', l('Desmentir', 'Deny'), (g) => ownPost33(g, actId, 'deny', fid)),
    A('r33.b.plant', l('Plantar outra nota (paga)', 'Plant another note (paid)'), (g) => plantNote33(g, fid), pub ? l('Já é público.', 'Already public.') : null),
    A('r33.b.run', l('Deixar correr', 'Let it run'), (g) => letRun33(g, fid), pub ? l('Já é público.', 'Already public.') : null),
    A('r33.b.delegate', l('Delegar à assessoria', 'Hand it to the press office'), (g) => delegate33(g, fid), dirOn33(s) ? null : l('Ligue os diretores (exp33.dir).', 'Turn the directors on (exp33.dir).')),
  ];
  return { id: 'r33.boato', title: l('Boato', 'Rumour'), nums: f ? [{ label: l('Gravidade', 'Severity'), value: String(f.severity), bar: f.severity / 100, tone: f.severity >= 60 ? 'bad' : undefined }] : [], lines: f ? [f.text] : [], acts };
}

/** Cartão de uma matéria do Jornal. */
export function cardItem33(s: GameState, it: JItem33): Card5 {
  const acts: CardAct5[] = [];
  const mine = !!actFor(s, it.actId);
  const lines: L[] = [it.head, ...(it.body ? [it.body] : [])];
  const title = JSEC33[it.sec];
  switch (it.kind) {
    case 'boato': return cardBoato33(s, it.fid!, it.actId!);
    case 'oferta':
      acts.push(A('r33.o.take', l('Aceitar', 'Take it'), (g) => ({ ok: true, text: bribe18(g, 'take') })), A('r33.o.refuse', l('Recusar', 'Refuse'), (g) => ({ ok: true, text: bribe18(g, 'refuse') })), A('r33.o.expose', l('Denunciar', 'Expose it'), (g) => ({ ok: true, text: bribe18(g, 'expose') })));
      break;
    case 'carta': {
      acts.push(A('r33.c.answer', l('Responder', 'Reply'), (g) => answerLetter33(g, it.letter!, 'answer')), A('r33.c.file', l('Arquivar', 'File it away'), (g) => answerLetter33(g, it.letter!, 'ignore')));
      break;
    }
    case 'nasc': acts.push(A('r33.n.congrats', l('Mandar parabéns', 'Send congratulations'), (g) => congrats33(g, it.fid!)));
      break;
    case 'anuncio': {
      const c = CLASSIFIED33.find((x) => x.id === it.ad);
      for (const id of c?.acts ?? []) { const a = fromCatalog(s, id); if (a) acts.push(a); }
      break;
    }
    default:
      if (mine && it.fid) acts.push(A('r33.j.note', l('Mandar uma nota sobre isso', 'Send a note about it'), (g) => ownPost33(g, it.actId!, 'post', it.fid)));
  }
  if (it.actId && it.kind !== 'anuncio' && it.kind !== 'oferta') acts.push({ id: 'r33.j.act', label: l('Ver o artista', 'See the act'), kind: 'ui', run: (_g, c) => { c.close(); OPEN?.close(); inspect.act(it.actId!); } });
  if (!acts.length) acts.push({ id: 'r33.j.ok', label: l('Ok', 'OK'), kind: 'ui', run: (_g, c) => c.close() });
  return { id: 'r33.item', title, nums: [], lines, acts };
}

function openCard(e: Event, build: (s: GameState) => Card5): void {
  const s = store.game;
  if (!s) return;
  showAdhoc5(s, build(s), rectOf(e), () => { const g = store.game; if (!g) return undefined; OPEN?.redraw(); return build(g); });
}

// ================================================================ o Jornal

// ---------------------------------------------------------------- imagens e links (o que já existe no jogo)

const goto = (fn: () => void) => (e?: Event): void => { e?.stopPropagation(); OPEN?.close(); fn(); };
/** Retrato do líder do ato (o mesmo sprite das fichas e da sede) — abre a ficha da pessoa. */
function faceOf(s: GameState, a: Act | undefined, px = 2): HTMLElement | null {
  const p = a ? leadOf18(s, a) : undefined;
  if (!a || !p) return null;
  const c = portraitCanvas(p, s, px);
  c.className = 'r33-face';
  return h('button', { type: 'button', class: 'r33-img', title: p.name, 'aria-label': p.name, onclick: goto(() => inspect.person(p.id)) }, c);
}
/** Capa real do disco (a mesma das fichas e das paradas) — abre a ficha do disco. */
function coverOf(s: GameState, relId: string | undefined, size: number): HTMLElement | null {
  const r = relId ? s.releases[relId] : undefined;
  if (!r) return null;
  return h('button', { type: 'button', class: 'r33-img cov', title: r.title, 'aria-label': r.title, onclick: goto(() => inspect.release(r.id)) }, cover(s, r, size));
}
const latestRel = (s: GameState, a: Act | undefined): string | undefined => (a ? [...a.releases].reverse().find((id) => s.releases[id]) : undefined);

interface Ent { name: string; go: () => void }
let ENT: { s: GameState; re: RegExp | null; by: Map<string, Ent> } | null = null;
/** Índice de nomes que viram link: artistas, cidades e discos (o jogo já tem a ficha de cada um). */
function entIndex(s: GameState, extra: Act | undefined): { re: RegExp | null; by: Map<string, Ent> } {
  if (ENT && ENT.s === s && !extra) return ENT;
  const by = new Map<string, Ent>();
  const add = (name: string, go: () => void): void => { if (name.length >= 4 && !by.has(name.toLowerCase())) by.set(name.toLowerCase(), { name, go }); };
  for (const a of Object.values(s.acts)) if (a.status !== 'retired' || a.fame >= 40) add(a.name, () => inspect.act(a.id));
  for (const c of Object.values(cityById)) add(t(c.name), () => inspect.city(c.id));
  for (const a of [extra, ...mineActs(s)]) if (a) for (const id of a.releases.slice(-6)) { const r = s.releases[id]; if (r) add(r.title, () => inspect.release(r.id)); }
  const names = [...by.keys()].sort((x, y) => y.length - x.length).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = names.length ? new RegExp(`(${names.join('|')})`, 'gi') : null;
  const out = { s, re, by };
  if (!extra) ENT = out;
  return out;
}
/** Texto com os nomes de artistas, cidades e discos como links para as fichas que já existem. */
function linked(s: GameState, text: string, act?: Act): Node[] {
  const { re, by } = entIndex(s, act);
  if (!re) return [document.createTextNode(text)];
  const out: Node[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const e = by.get(m[0].toLowerCase());
    if (!e || m.index === undefined) continue;
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    out.push(h('button', { type: 'button', class: 'r33-lk', onclick: goto(e.go) }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out.length ? out : [document.createTextNode(text)];
}
const MEDIA_COVER = new Set(['release', 'chart', 'playlist', 'remix_hit', 'revival_hit', 'merch_drop', 'viral', 'review', 'award', 'milestone', 'charity_single', 'video_banned', 'contest_winner']);

// ================================================================ o Jornal

const SECTION_BIG = new Set<JSec33>(['manchete']);
/** Imagem da matéria: capa (paradas, lançamentos) ou retrato do artista. */
function itemMedia(s: GameState, it: JItem33, big: boolean): HTMLElement | null {
  const a = it.actId ? s.acts[it.actId] : undefined;
  const f = it.fid ? factById(s, it.fid) : undefined;
  if (it.releaseId) return coverOf(s, it.releaseId, big ? 96 : 44);
  if (a && (it.sec === 'musica' || it.sec === 'paradas') && MEDIA_COVER.has(f?.kind ?? 'chart')) { const c = coverOf(s, latestRel(s, a), big ? 96 : 44); if (c) return c; }
  return faceOf(s, a, big ? 3 : 1);
}
function itemBtn(s: GameState, it: JItem33, build: (s: GameState) => Card5): HTMLElement {
  const big = it.sec === 'manchete';
  const media = itemMedia(s, it, big);
  const f = it.fid ? factById(s, it.fid) : undefined;
  const why = big && f ? causeChain(s, f, 1)[0] : undefined;
  const a = it.actId ? s.acts[it.actId] : undefined;
  return h('div', { class: `r33-it${media ? ' has-img' : ''}`, role: 'button', tabindex: '0',
    onclick: (e: Event) => { if ((e.target as HTMLElement).closest('.r33-lk,.r33-img')) return; openCard(e, build); },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(e, build); } } },
    media,
    h('div', { class: 'r33-tx' },
      h('b', null, ...linked(s, t(it.head), a)),
      it.body ? h('span', null, ...linked(s, t(it.body), a)) : null,
      why ? h('span', { class: 'r33-why2' }, t(l('Antes: ', 'Earlier: ')), ...linked(s, t(why.text), a)) : null,
      it.tag ? h('em', { class: 'r33-tag' }, t(it.tag)) : null));
}
const EDITION = (s: GameState): string => `${t(l('Edição', 'Edition'))} ${((s.year - 1889) * 12 + s.month + 1).toLocaleString('pt-BR')} · ${monthName(s.month)} ${s.year}`;
function jornalView(s: GameState, sh: Sheet, st: { paper: string }): HTMLElement {
  const j = jornal33(s);
  const ps = papers33(s.year);
  const cur = ps.find((p) => p.id === st.paper) ?? ps[0];
  st.paper = cur.id;
  const mast = px33canvas(masthead33(cur.id, t(cur.name), s.year), 1);
  mast.className = 'r33-mast';
  mast.style.width = '100%'; mast.style.height = 'auto';
  const city = cityById[s.config.homeCity]?.name;
  const sec = (k: JSec33): HTMLElement => {
    const items = j.byPaper[cur.id]?.[k] ?? [];
    return h('section', { class: `r33-sec${SECTION_BIG.has(k) ? ' big' : ''} k-${k}` },
      h('h3', null, t(JSEC33[k])),
      items.length ? items.map((it) => itemBtn(s, it, (g) => cardItem33(g, jornal33(g).byPaper[cur.id]?.[it.sec]?.find((x) => x.id === it.id) ?? it))) : h('p', { class: 'r33-empty' }, t(l('Nada por hoje.', 'Nothing today.'))));
  };
  return h('div', null,
    mast,
    h('div', { class: 'r33-dateline' }, h('span', null, EDITION(s)), h('span', null, city ? t(city) : ''), h('span', null, t(j.voice))),
    ps.length > 1 ? h('div', { class: 'r33-tabs', role: 'tablist' }, ps.map((p) => h('button', { type: 'button', role: 'tab', 'aria-selected': p.id === cur.id ? 'true' : 'false', class: `r33-tab${p.id === cur.id ? ' on' : ''}`, onclick: () => { st.paper = p.id; sh.redraw(); } }, t(p.name)))) : null,
    h('div', { class: 'r33-cols' }, cur.secs.map(sec)));
}
export function openJornal33(): void {
  const st = { paper: '' };
  sheet((s, sh) => jornalView(s, sh, st), () => t(l('Jornal na mesa', 'Newspaper on the desk')), () => { const s = store.game; return s ? `${t(jornal33(s).voice)} · ${s.year}` : ''; });
}

// ================================================================ as Redes

const ui = { act: '' as string };
function pickAct(s: GameState): Act | undefined {
  const ms = mineActs(s);
  return ms.find((a) => a.id === ui.act) ?? ms.find((a) => a.id === store.selectedAct) ?? ms[0];
}
function btn(label: string, run: () => Res33 | void, why?: L | null, title?: string): HTMLElement {
  return h('span', null,
    h('button', { type: 'button', class: 'r33-btn', disabled: !!why, title, onclick: () => { const r = run(); if (r) toast(t(r.text), r.ok ? 'good' : 'bad'); OPEN?.redraw(); rerender(); } }, label),
    why ? h('div', { class: 'r33-why' }, t(why)) : null);
}
function postRow(s: GameState, p: FeedItem33, form: Form33): HTMLElement {
  const act = p.act;
  const who = p.world ? t(p.voice) : (act?.name ?? t(p.voice));
  const f = p.fid ? factById(s, p.fid) : undefined;
  const wantCover = !p.world && act && (MEDIA_COVER.has(p.kind) || form === 'foto' || form === 'video');
  const txt = form === 'micro' ? shorten(t(p.text), 140) : t(p.text);
  const relInText = act ? [...act.releases].reverse().find((id) => s.releases[id] && txt.toLowerCase().includes(s.releases[id].title.toLowerCase())) : undefined;
  const face = p.world ? px33canvas(thumb33('world', p.id, p.y, 'foto'), 2) : faceOf(s, act, form === 'micro' ? 1 : form === 'perfil' || form === 'avatar' ? 3 : 2);
  const cov = wantCover ? coverOf(s, relInText ?? latestRel(s, act), form === 'foto' || form === 'video' ? 84 : 56) : null;
  if (cov && form === 'video') cov.append(h('i', { class: 'r33-play', 'aria-hidden': 'true' }));
  const tag = p.bad ? l('conta invadida', 'hacked') : p.mine ? l('seu elenco', 'your roster') : p.known ? l('você conhece', 'you know them') : p.world ? l('mundo', 'world') : p.jab ? l('indireta', 'jab') : l('rival', 'rival');
  const open = (e: Event): void => openCard(e, (g) => { const x = feed33(g, { limit: 80 }).find((y) => y.id === p.id); return x ? cardPost33(g, x) : cardPost33(g, p); });
  return h('div', { class: `r33-post ${form}${p.mine ? ' mine' : ''}${p.bad ? ' bad' : ''}`, role: 'button', tabindex: '0',
    onclick: (e: Event) => { if ((e.target as HTMLElement).closest('.r33-lk,.r33-img')) return; open(e); },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } } },
    face,
    h('div', { class: 'r33-body' },
      h('div', { class: 'who' }, act ? h('button', { type: 'button', class: 'r33-lk', onclick: goto(() => inspect.act(act.id)) }, who) : who, h('i', null, t(tag)),
        f?.place && cityById[f.place] ? h('button', { type: 'button', class: 'r33-lk place', onclick: goto(() => inspect.city(f.place!)) }, t(cityById[f.place].name)) : null),
      form === 'perfil' && act ? h('div', { class: 'bio' }, `${act.genre.replace(/_/g, ' ')} · ${t(l('desde', 'since'))} ${act.debutYear}`) : null,
      h('p', { class: 'txt' }, ...linked(s, txt, act)),
      h('div', { class: 'meta' }, `${monthName(p.m)} ${p.y}${p.done ? ` · ${t(l('feito', 'done'))}` : ''}`)),
    cov);
}
const shorten = (x: string, n: number): string => (x.length <= n ? x : `${x.slice(0, n - 1).trimEnd()}…`);

function redesView(s: GameState, sh: Sheet): HTMLElement {
  const form = form33(s.year);
  const st = redes33(s);
  const me = pickAct(s), ms = mineActs(s);
  const bar: Node[] = [];
  if (ms.length > 1) bar.push(h('select', { 'aria-label': t(l('Artista', 'Act')), onchange: (e: Event) => { ui.act = (e.target as HTMLSelectElement).value; sh.redraw(); } }, ms.map((a) => h('option', { value: a.id, selected: a.id === me?.id }, a.name))));
  else if (me) bar.push(h('b', null, me.name));
  if (me) {
    const hacked = !!st.hacked[me.id];
    bar.push(btn(t(l('Postar', 'Post')), () => ownPost33(s, me.id, 'post'), hacked ? l('Conta hackeada.', 'Hacked account.') : null));
    if (s.year >= LIVE_FROM33) bar.push(btn(t(l('Live (1 bolinha)', 'Live (1 ball)')), () => goLive33(s, me.id), hacked ? l('Conta hackeada.', 'Hacked account.') : null));
    if (s.year >= VIRAL_FROM33) bar.push(btn(t(l('Viralizar um trecho', 'Push a snippet')), () => viralClip33(s, me.id), viralRollout33(s, me.id) ? (hacked ? l('Conta hackeada.', 'Hacked account.') : null) : l('Precisa de um lançamento planejado.', 'Needs a planned release.')));
    if (hacked) bar.push(btn(t(l('Recuperar a conta', 'Recover the account')), () => recoverAccount33(s, me.id)));
  }
  if (s.year >= 2010) bar.push(btn(`${t(l('Segurança digital', 'Digital security'))} ${st.sec}/2`, () => hireSecurity33(s), st.sec >= 2 ? l('No máximo.', 'Maxed out.') : null, st.sec < 2 ? `US$ ${SEC_COST33[st.sec + 1]}` : undefined));
  const boatos = boatos33(s);
  const alerts = ms.filter((a) => st.hacked[a.id]).map((a) => h('div', { class: 'r33-alert', role: 'alert' }, t(l(`A conta de ${a.name} foi invadida: o post ruim já está no ar e a imagem cai a cada mês.`, `${a.name}'s account was hacked: the bad post is live and the image slips every month.`))));
  const feed = feed33(s, { limit: 40 });
  return h('div', null,
    h('div', { class: 'r33-head' }, px33canvas(redesIcon33(form, s.year), 3), h('small', null, `${t(formName33(s.year))} · ${t(l('as redes mostram seus artistas primeiro, depois quem você conhece e os rivais', 'the feed shows your acts first, then people you know, then rivals'))}`)),
    ...alerts,
    me ? h('div', { class: 'r33-bar' }, ...bar) : h('p', { class: 'r33-empty' }, t(l('Você ainda não tem artista no elenco: dá para acompanhar o feed e reagir aos posts dos outros.', 'You have no act on the roster yet: you can follow the feed and react to other people\'s posts.'))),
    boatos.length ? h('div', null, h('h4', { class: 'r33-h4' }, t(l('Boatos sobre o seu elenco', 'Rumours about your roster'))),
      h('div', { class: 'r33-feed' }, boatos.slice(0, 5).map(({ f, act }) => h('button', { type: 'button', class: 'r33-post mine', onclick: (e: Event) => openCard(e, (g) => cardBoato33(g, f.id, act.id)) },
        h('div', null, h('div', { class: 'who' }, act.name, h('i', null, t(l('boato', 'rumour')))), h('p', { class: 'txt' }, t(f.text))))))) : null,
    h('h4', { class: 'r33-h4' }, t(l('Feed', 'Feed'))),
    feed.length ? h('div', { class: 'r33-feed' }, feed.map((p) => postRow(s, p, form))) : h('p', { class: 'r33-empty' }, t(l('Nada postado ainda. O feed enche conforme as coisas acontecem.', 'Nothing posted yet. The feed fills as things happen.'))));
}
export function openRedes33(): void {
  sheet((s, sh) => redesView(s, sh), () => t(l('Redes', 'Social')), () => { const s = store.game; return s ? `${t(formName33(s.year))} · ${s.year}` : ''; });
}

// ================================================================ registro do app para a casca do celular/PC

export interface RedesApp33 {
  id: 'redes';
  name: L;
  /** primeiro ano em que o app existe (a rede antes disso é o Jornal) */
  from: number;
  /** a forma por época: 2004 perfil, 2006 post curto, 2010 foto, 2018 vídeo curto, 2030 avatar */
  forms: { y: number; id: Form33; name: L }[];
  /** ícone em Px (canvas pronto) por ano e escala */
  icon: (year: number, scale: number) => HTMLCanvasElement;
  /** o app aparece no aparelho? (sistema ligado e ano certo) */
  when: (s: GameState) => boolean;
  /** abre a tela do feed por cima da cena */
  open: () => void;
  /** o "!" do app: contas hackeadas + boatos abertos sobre o seu elenco */
  badge: (s: GameState) => number;
}
export const redesApp33: RedesApp33 = {
  id: 'redes', name: l('Redes', 'Social'), from: 2004, forms: FORMS33.filter((f) => f.y >= 2004),
  icon: (year, scale) => px33canvas(redesIcon33(form33(year), year), scale),
  when: (s) => redes33On(s) && s.year >= 2004,
  open: openRedes33,
  badge: (s) => (redes33On(s) ? Object.keys(redes33(s).hacked).length + boatos33(s).length : 0),
};
/** Gancho para o coordenador: `registerRedesApp33(app => APPS.register(app))` na junção com a casca (APARELHOS33). */
export function registerRedesApp33(register: (app: RedesApp33) => void): void { register(redesApp33); }
void ICON33; void hackChance33; void sw; void pr18; void tone33;

// ================================================================ ações e entradas nos cartões de hoje

const R33SRC = 'ui/r33/redes33ui';
const REG: Record<string, ActDef5> = {
  'r33.jornal': { label: l('Ler o jornal', 'Read the newspaper'), kind: 'ui', src: [R33SRC, 'openJornal33'], fn: openJornal33, when: redes33On, run: (_s, c) => { c.close(); openJornal33(); } },
  'r33.redes': { label: l('Abrir as redes', 'Open social'), kind: 'ui', src: [R33SRC, 'openRedes33'], fn: openRedes33, when: (s) => redes33On(s) && s.year >= 2004, run: (_s, c) => { c.close(); openRedes33(); } },
  'r33.cl.compras': { label: l('Pedir o catálogo pelo correio', 'Order from the mail catalogue'), kind: 'ui', src: ['ui/r31/decoshop31ui', 'openDecoShop31'], fn: openDecoShop31, run: (_s, c) => { c.close(); OPEN?.close(); openDecoShop31('mail'); } },
  'r33.cl.leilao': { label: l('Ir ao leilão', 'Go to the auction'), kind: 'ui', src: ['ui/r31/quick31', 'goDest31'], fn: goDest31, run: (_s, c) => { c.close(); OPEN?.close(); goDest31({ area: 'auction31' }); } },
};
Object.assign(ACTS_CAT5, REG);
for (const card of ['jornal', 'jornalpredio']) {
  const c = CARDS5[card];
  if (!c) continue;
  for (const a of ['r33.jornal', 'r33.redes']) if (!c.acts.includes(a)) c.acts.push(a);
}
