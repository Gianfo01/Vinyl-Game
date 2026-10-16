// R31 onda 4 (EMO) — fonte única emoji → ícone em pixel art.
// Pedido do dono: "troque os emojis por emojis em pixel art para manter a consistência do jogo".
// O código (interface e motor) continua escrevendo o emoji como marcador semântico; na hora de mostrar,
// pxNodes/pxText trocam cada um por <img class="px pxi pxe"> com alt bilíngue (o que o emoji significava).
// Pontos de troca: dom.ts h() (todo texto e title/aria-label), installEmo31() (rede de segurança para
// textContent/innerHTML) e o gancho de canvas (texto pintado nas cenas). O teste r31-emo garante que todo
// pictograma usado está no mapa e que todo nome do mapa tem desenho.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { ICON_NAMES, iconPx, type IconName } from './icons';
import { ICON17_NAMES, icon17Px } from './icons17';
import { ICON31_NAMES, icon31Px } from './icons31';
import { upscale, type Px } from './px';

// [emojis que significam a mesma coisa, ícone, rótulo pt, rótulo en]
const TABLE: [string, string, string, string][] = [
  // marcas de interface
  ['★⭐🌟', 'fame', 'estrela', 'star'],
  ['☆', 'star-empty', 'estrela vazia', 'empty star'],
  ['✓✔☑✅', 'check', 'feito', 'done'],
  ['✕✗✖❌', 'cross', 'não', 'no'],
  ['⚠', 'warning', 'atenção', 'warning'],
  ['ⓘℹ', 'info', 'informação', 'info'],
  ['✦✨', 'sparkle', 'destaque', 'highlight'],
  ['⏱⌚🕘⏰', 'clock', 'prazo', 'deadline'],
  ['⏳⌛', 'hourglass', 'aguardando', 'waiting'],
  ['🔒', 'lock', 'bloqueado', 'locked'],
  ['🔓', 'unlock', 'liberado', 'unlocked'],
  ['🔑', 'key', 'chave', 'key'],
  ['⚡', 'bolt', 'rápido', 'quick'],
  ['⏭⏩', 'skip', 'pular', 'skip'],
  ['⏸', 'pause', 'pausa', 'pause'],
  ['💾', 'floppy', 'salvar', 'save'],
  ['☁', 'cloud', 'nuvem', 'cloud'],
  ['🗑', 'trash', 'apagar', 'delete'],
  ['⚙🛠', 'gear', 'ajustes', 'settings'],
  ['🔎🔍', 'magnifier', 'buscar', 'search'],
  ['⛔', 'no-entry', 'proibido', 'not allowed'],
  ['📌📍', 'pin', 'fixado', 'pinned'],
  ['🎯', 'target', 'meta', 'goal'],
  ['⚑🚩🏁', 'flag', 'marco', 'milestone'],
  ['🔕', 'bell-off', 'silenciado', 'muted'],
  ['🎲', 'dice', 'sorteio', 'random'],
  ['🎮', 'gamepad', 'jogável', 'playable'],
  ['✎✍🖊', 'pen', 'escrever', 'write'],
  ['📋🗒', 'clipboard', 'lista', 'list'],
  ['📁📂', 'folder', 'pasta', 'folder'],
  ['🗄', 'vault', 'arquivo', 'archive'],
  ['📜', 'contract', 'contrato', 'contract'],
  ['🧾', 'receipt', 'recibo', 'receipt'],
  ['📅🗓', 'calendar', 'agenda', 'calendar'],
  ['✉', 'letter', 'carta', 'letter'],
  ['☎📞', 'phone', 'telefone', 'phone'],
  ['💬🗣', 'speech', 'conversa', 'talk'],
  ['📣', 'megaphone', 'anúncio', 'announcement'],
  ['📰', 'newspaper', 'imprensa', 'press'],
  ['🔥', 'fire', 'em alta', 'hot'],
  ['💡', 'bulb', 'ideia', 'idea'],
  ['🧠', 'brain', 'mente', 'mind'],
  // prêmios
  ['🏆', 'trophy', 'troféu', 'trophy'],
  ['🥇', 'medal-gold', 'ouro', 'gold'],
  ['🥈', 'medal-silver', 'prata', 'silver'],
  ['🥉', 'medal-bronze', 'bronze', 'bronze'],
  ['🏅🎖', 'medal', 'medalha', 'medal'],
  // dinheiro e negócios
  ['💰', 'money', 'dinheiro', 'money'],
  ['💸', 'money-out', 'gasto', 'spending'],
  ['💼', 'briefcase', 'negócios', 'business'],
  ['🤝', 'handshake', 'acordo', 'deal'],
  ['⚖', 'gavel', 'justiça', 'law'],
  ['🏦', 'bank', 'banco', 'bank'],
  ['🏢', 'building', 'empresa', 'company'],
  ['🏛', 'columns', 'instituição', 'institution'],
  ['🏭', 'factory', 'fábrica', 'factory'],
  ['🏗', 'crane', 'obra', 'construction'],
  ['📈', 'chart-up', 'subindo', 'rising'],
  ['📉', 'chart-down', 'caindo', 'falling'],
  ['📦', 'box', 'pacote', 'package'],
  ['🎁', 'gift', 'presente', 'gift'],
  ['🃏', 'card', 'trunfo', 'trump card'],
  ['⚔', 'swords', 'rivalidade', 'rivalry'],
  ['⛓', 'chains', 'preso', 'bound'],
  ['☠💀', 'skull', 'perigo', 'danger'],
  // música
  ['♪♫🎵🎶🎼', 'note', 'música', 'music'],
  ['🎤🎙', 'mic', 'microfone', 'microphone'],
  ['🎸', 'guitar', 'guitarra', 'guitar'],
  ['🥁', 'drums', 'bateria', 'drums'],
  ['🎺', 'trumpet', 'trompete', 'trumpet'],
  ['🎻', 'violin', 'violino', 'violin'],
  ['🎹', 'keyboard', 'teclado', 'keyboard'],
  ['🎧', 'headphones', 'fones', 'headphones'],
  ['🎛🎚', 'mixer', 'mesa de som', 'mixing desk'],
  ['🔊', 'speaker', 'som', 'sound'],
  ['💿📀', 'cd', 'disco', 'record'],
  ['📼', 'cassette', 'fita', 'tape'],
  ['📶📡', 'stream', 'streaming', 'streaming'],
  ['📺', 'tv', 'TV', 'TV'],
  ['📻', 'radio', 'rádio', 'radio'],
  ['📷', 'camera', 'foto', 'photo'],
  ['🎬', 'clapper', 'filmagem', 'filming'],
  ['🎟', 'ticket', 'ingresso', 'ticket'],
  ['🎪', 'star', 'festival', 'festival'],
  ['⛺', 'tent', 'acampamento', 'camp'],
  ['🎨', 'palette', 'arte', 'art'],
  ['👕', 'shirt', 'roupa', 'clothes'],
  ['💠', 'diamond', 'diamante', 'diamond'],
  ['👻', 'hologram', 'holograma', 'hologram'],
  // pessoas e humor
  ['👤🧑', 'person', 'pessoa', 'person'],
  ['👥', 'people', 'pessoas', 'people'],
  ['👀', 'eye', 'de olho', 'watching'],
  ['😊😄😆☺', 'face-happy', 'feliz', 'happy'],
  ['🙂', 'face-smile', 'atento', 'attentive'],
  ['😐', 'face-neutral', 'neutro', 'neutral'],
  ['😒😏🤨', 'face-wry', 'desconfiado', 'skeptical'],
  ['🤔🧐', 'face-think', 'pensativo', 'thinking'],
  ['😢😟', 'face-sad', 'triste', 'sad'],
  ['😠', 'face-angry', 'bravo', 'angry'],
  ['😰😣😫', 'face-stress', 'tenso', 'tense'],
  ['🙅', 'face-no', 'braços cruzados', 'arms crossed'],
  ['🤑', 'face-money', 'interesseiro', 'money-minded'],
  ['🤫', 'shush', 'segredo', 'secret'],
  ['😴', 'sleep', 'cansado', 'tired'],
  ['✋🫲👋', 'hand', 'mão', 'hand'],
  ['👍', 'thumbs-up', 'aprovado', 'approved'],
  ['💪', 'flex', 'força', 'strength'],
  ['❤♥', 'heart', 'afeto', 'affection'],
  ['💔', 'broken-heart', 'separação', 'breakup'],
  ['✝🕯', 'candle', 'luto', 'mourning'],
  ['🩺', 'health', 'saúde', 'health'],
  // lugares e coisas
  ['🏠⌂', 'house', 'casa', 'home'],
  ['🚪', 'door', 'porta', 'door'],
  ['⛲', 'fountain', 'praça', 'square'],
  ['🌍🌏🌐', 'globe', 'mundo', 'world'],
  ['🗺', 'map', 'mapa', 'map'],
  ['✈', 'plane', 'viagem', 'trip'],
  ['🚌🚐', 'tour-bus', 'turnê', 'tour'],
  ['🚢', 'ship', 'navio', 'ship'],
  ['⚓', 'anchor', 'porto', 'port'],
  ['🚆', 'train', 'trem', 'train'],
  ['🚀', 'rocket', 'decolando', 'taking off'],
  ['☕', 'coffee', 'café', 'coffee'],
  ['🍷🍺', 'drink', 'bebida', 'drink'],
  ['🧽', 'sponge', 'limpeza', 'clean-up'],
  ['🦈', 'shark', 'tubarão', 'shark'],
  ['☀', 'sun', 'sol', 'sun'],
  ['☾', 'moon', 'noite', 'night'],
  ['⛈🌧', 'rain', 'chuva', 'rain'],
];

export interface Emo31 { icon: string; label: L }
/** Mapa emoji (caractere base) → ícone e rótulo. */
export const EMO31: ReadonlyMap<string, Emo31> = (() => {
  const m = new Map<string, Emo31>();
  for (const [chars, icon, pt, en] of TABLE) for (const ch of chars) m.set(ch, { icon, label: l(pt, en) });
  return m;
})();

/** Todos os nomes de ícone usados pelo mapa (cada um precisa de desenho). */
export const EMO31_ICONS: readonly string[] = [...new Set(TABLE.map((r) => r[1]))];

const ALL_ICON = new Set<string>([...ICON_NAMES, ...ICON17_NAMES, ...ICON31_NAMES]);
export const hasPxIcon31 = (name: string): boolean => ALL_ICON.has(name);

/** Pixels 16×16 de qualquer ícone do jogo (icons, icons17, icons31). */
export function pxIconPx31(name: string): Px | null {
  if ((ICON_NAMES as readonly string[]).includes(name)) return iconPx(name as IconName);
  return icon17Px(name) ?? icon31Px(name);
}

const cvCache = new Map<string, HTMLCanvasElement>();
const urlCache = new Map<string, string>();
/** Canvas ampliado (escala inteira) — para desenhar ícone dentro de outro canvas. */
export function pxIconCanvas31(name: string, scale = 1): HTMLCanvasElement | null {
  const sc = Math.max(1, Math.round(scale));
  const key = `${name}:${sc}`;
  let cv = cvCache.get(key);
  if (!cv) {
    const p = pxIconPx31(name);
    if (!p) return null;
    cv = upscale(p.canvas(), 16 * sc);
    cvCache.set(key, cv);
  }
  return cv;
}
export function pxIconUrl31(name: string, scale = 2): string {
  const key = `${name}:${scale}`;
  let u = urlCache.get(key);
  if (!u) {
    u = pxIconCanvas31(name, scale)?.toDataURL() ?? '';
    urlCache.set(key, u);
  }
  return u;
}

// Um emoji "visual": caractere base + seletor de variação + sequências ZWJ + tom de pele.
const PICTO = '\\p{Extended_Pictographic}|[☆✓✕✗✦ⓘ⌂]';
const RE_SRC = `(?:${PICTO})[\\uFE0E\\uFE0F]?(?:\\u200D(?:${PICTO})[\\uFE0E\\uFE0F]?)*[\\u{1F3FB}-\\u{1F3FF}]?`;
const reAll = () => new RegExp(RE_SRC, 'gu');
const RE_TEST = new RegExp(`(?:${PICTO})`, 'u');
/** Símbolos que continuam texto (setas, triângulos de marcador, marcas legais) mesmo sendo "pictográficos". */
export const EMO31_KEEP: ReadonlySet<string> = new Set([...'▶◀↩↪↔↕↗↘↙↖⤴⤵⬅⬆⬇➡©®™‼⁉〰〽♀♂⚲☰▪▫◻◼◽◾']);
const KEEP = EMO31_KEEP;

/** O emoji (cluster) → entrada do mapa, ou null se fica como texto. */
export function emoOf31(cluster: string): Emo31 | null {
  const base = [...cluster][0];
  if (KEEP.has(base)) return null;
  return EMO31.get(base) ?? null;
}

/** Tem algo a trocar? (teste barato antes de qualquer trabalho) */
export function hasEmo31(s: string): boolean {
  if (!RE_TEST.test(s)) return false;
  for (const m of s.matchAll(reAll())) if (emoOf31(m[0])) return true;
  return false;
}

export interface EmoPart31 { text?: string; emo?: Emo31; raw?: string }
/** Quebra o texto em pedaços de texto e emojis mapeados. */
export function emoSplit31(s: string): EmoPart31[] {
  const out: EmoPart31[] = [];
  let last = 0;
  for (const m of s.matchAll(reAll())) {
    const e = emoOf31(m[0]);
    if (!e) continue;
    if (m.index! > last) out.push({ text: s.slice(last, m.index) });
    out.push({ emo: e, raw: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** <img> nítido do ícone, com alt/aria-label bilíngue. `scale` 1 = 16 px (a altura final se ajusta à fonte em installEmo31). */
export function pxEmoImg31(icon: string, label?: L | string, scale = 1): HTMLImageElement {
  const img = document.createElement('img');
  img.src = pxIconUrl31(icon, 2);
  img.width = img.height = Math.round(16 * scale);
  img.className = 'px pxi pxe';
  const lbl = label === undefined ? '' : typeof label === 'string' ? label : t(label);
  img.alt = lbl;
  if (lbl) { img.setAttribute('role', 'img'); img.setAttribute('aria-label', lbl); }
  img.setAttribute('data-emo', icon);
  img.draggable = false;
  return img;
}

/** Ícone de um emoji avulso (ex.: humor de uma pessoa na cena). Se não estiver no mapa, devolve o texto. */
export function pxEmo31(emoji: string, scale = 1, label?: L | string): Node {
  const e = emoOf31(emoji);
  if (!e) return document.createTextNode(emoji);
  return pxEmoImg31(e.icon, label ?? e.label, scale);
}

/** Texto → nós (texto + ícones). Use onde se montaria um nó de texto. */
export function pxNodes31(s: string, closeLabel = false): Node[] {
  if (!hasEmo31(s)) return [document.createTextNode(s)];
  const parts = emoSplit31(s);
  const lone = closeLabel && parts.length === 1;
  return parts.map((p) => (p.emo ? pxEmoImg31(p.emo.icon, lone && p.emo.icon === 'cross' ? l('Fechar', 'Close') : p.emo.label) : document.createTextNode(p.text!)));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** Texto puro → HTML com os emojis trocados por <img> (o resto é escapado). */
export function pxText(s: string): string {
  if (!hasEmo31(s)) return esc(s);
  return emoSplit31(s).map((p) => {
    if (!p.emo) return esc(p.text!);
    const lbl = esc(t(p.emo.label));
    return `<img class="px pxi pxe" src="${pxIconUrl31(p.emo.icon, 2)}" width="16" height="16" alt="${lbl}" role="img" aria-label="${lbl}" data-emo="${p.emo.icon}" draggable="false">`;
  }).join('');
}

/** Texto para lugares que não aceitam imagem (title, aria-label, <option>, canvas sem gancho): o emoji vira palavra ou some. */
export function emoPlain31(s: string): string {
  if (!hasEmo31(s)) return s;
  const parts = emoSplit31(s);
  const words = parts.some((p) => p.text && p.text.trim());
  // marcas tipográficas monocromáticas (★ ✓ ✕ ♪ …) continuam como texto onde não cabe imagem; emoji colorido nunca
  return parts.map((p) => (p.emo ? (TYPO_OK.has(p.raw!) ? p.raw : words ? '' : t(p.emo.label)) : p.text)).join('').replace(/ {2,}/g, ' ').trim() || s;
}
const TYPO_OK = new Set([...'★☆✓✕✗✦♪♫♥']);

// ---------------------------------------------------------------- rede de segurança no DOM

const NO_IMG = new Set(['OPTION', 'TEXTAREA', 'TITLE', 'SCRIPT', 'STYLE', 'INPUT']);
/** Onde o texto não pode ganhar <img>: troca por palavra. */
const plainHost = (el: Element | null): boolean => !!el && (NO_IMG.has(el.tagName) || el instanceof SVGElement || !!el.closest('[contenteditable="true"],select'));

function fixText(n: Text): void {
  const s = n.data;
  if (!hasEmo31(s)) return;
  const par = n.parentElement;
  if (!par) return;
  // só escreve se mudar: marca monocromática (★ ✓) fica no texto, e reescrever o mesmo valor reabriria o observador em laço
  if (plainHost(par)) { const v = emoPlain31(s); if (v !== s) n.data = v; return; }
  const lone = (par.tagName === 'BUTTON' || par.getAttribute('role') === 'button') && par.childNodes.length === 1;
  const frag = document.createDocumentFragment();
  for (const x of pxNodes31(s, lone)) frag.appendChild(x);
  par.replaceChild(frag, n);
}

const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
function fixAttrs(el: Element): void {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && hasEmo31(v)) { const w = emoPlain31(v); if (w !== v) el.setAttribute(a, w); }
  }
}

/** Tamanho em escala inteira conforme a fonte em volta (16, 32, 48 px…). */
function sizeImg(img: HTMLImageElement): void {
  if (img.dataset.sz) return;
  const par = img.parentElement;
  const fs = par ? parseFloat(getComputedStyle(par).fontSize) || 14 : 14;
  const k = Math.max(1, Math.round((fs * 1.1) / 16));
  img.width = img.height = 16 * k;
  if (k > 1 && img.src.includes('data:') && img.dataset.emo) img.src = pxIconUrl31(img.dataset.emo, Math.max(2, k));
  img.dataset.sz = String(k);
}

function sweep(root: Node): void {
  if (root.nodeType === 3) { fixText(root as Text); return; }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  const el = root as Element;
  if (root.nodeType === 1) fixAttrs(el);
  const texts: Text[] = [];
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === 3) { if (RE_TEST.test((n as Text).data)) texts.push(n as Text); }
    else {
      fixAttrs(n as Element);
      if ((n as Element).tagName === 'IMG' && (n as HTMLImageElement).classList.contains('pxe')) pendingSize.add(n as HTMLImageElement);
    }
  }
  for (const x of texts) fixText(x);
  if (root.nodeType === 1 && el.tagName === 'IMG' && el.classList.contains('pxe')) pendingSize.add(el as HTMLImageElement);
}

const pendingSize = new Set<HTMLImageElement>();
let sizeQueued = false;
function flushSizes(): void {
  sizeQueued = false;
  for (const img of pendingSize) if (img.isConnected) sizeImg(img);
  pendingSize.clear();
}

let installed = false;
/** Instala a troca no documento inteiro (uma vez): todo texto que entrar na tela passa pelo mapa. */
export function installEmo31(root: HTMLElement = document.body): void {
  if (installed || typeof MutationObserver === 'undefined') return;
  installed = true;
  sweep(root);
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      if (r.type === 'childList') r.addedNodes.forEach((n) => { if (n.isConnected) sweep(n); });
      else if (r.type === 'characterData') fixText(r.target as Text);
      else if (r.type === 'attributes') fixAttrs(r.target as Element);
    }
    // novos ícones: tamanho conforme a fonte, num lote só
    root.querySelectorAll<HTMLImageElement>('img.pxe:not([data-sz])').forEach((i) => pendingSize.add(i));
    if (pendingSize.size && !sizeQueued) { sizeQueued = true; requestAnimationFrame(flushSizes); }
  });
  mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  if (emoPlain31(document.title) !== document.title) document.title = emoPlain31(document.title);
  // ícones usados no CSS (::before/::after): variáveis --pxi-<nome>
  for (const n of ['fame', 'check', 'cross', 'lock']) document.documentElement.style.setProperty(`--pxi-${n}`, `url(${pxIconUrl31(n, 2)})`);
  installCanvasEmo31();
}

// ---------------------------------------------------------------- canvas

type Ctx = CanvasRenderingContext2D;
/** Texto pintado em canvas com os emojis desenhados como ícones (mesmo alinhamento/linha de base do texto). */
export function fillTextPx31(ctx: Ctx, s: string, x: number, y: number, fill: (t: string, x: number, y: number) => void): void {
  const parts = emoSplit31(s);
  const fs = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? '12');
  const sz = fs >= 12 ? 16 * Math.max(1, Math.round(fs / 14)) : Math.max(6, Math.round(fs * 1.1));
  const wOf = (p: EmoPart31) => (p.emo ? sz : ctx.measureText(p.text!).width);
  const total = parts.reduce((a, p) => a + wOf(p), 0);
  const al = ctx.textAlign;
  let cx = al === 'center' ? x - total / 2 : al === 'right' || al === 'end' ? x - total : x;
  const bl = ctx.textBaseline;
  const top = bl === 'top' || bl === 'hanging' ? y : bl === 'middle' ? y - sz / 2 : y - sz * 0.85;
  ctx.save();
  ctx.textAlign = 'left';
  const smooth = ctx.imageSmoothingEnabled;
  for (const p of parts) {
    if (p.emo) {
      const cv = pxIconCanvas31(p.emo.icon, Math.max(1, Math.round(sz / 16)));
      if (cv) { ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, Math.round(cx), Math.round(top), sz, sz); ctx.imageSmoothingEnabled = smooth; }
    } else fill(p.text!, cx, y);
    cx += wOf(p);
  }
  ctx.restore();
}

let canvasHooked = false;
/** Gancho no canvas: fillText/strokeText com emoji desenham o ícone em pixel art no lugar. */
export function installCanvasEmo31(): void {
  if (canvasHooked || typeof CanvasRenderingContext2D === 'undefined') return;
  canvasHooked = true;
  const P = CanvasRenderingContext2D.prototype;
  const fill = P.fillText, stroke = P.strokeText;
  P.fillText = function (this: Ctx, text: string, x: number, y: number, w?: number) {
    const s = String(text);
    if (!hasEmo31(s)) return w === undefined ? fill.call(this, s, x, y) : fill.call(this, s, x, y, w);
    fillTextPx31(this, s, x, y, (a, b, c) => fill.call(this, a, b, c));
  };
  P.strokeText = function (this: Ctx, text: string, x: number, y: number, w?: number) {
    const s = String(text);
    if (!hasEmo31(s)) return w === undefined ? stroke.call(this, s, x, y) : stroke.call(this, s, x, y, w);
    // o contorno só vale para o texto; os ícones já têm contorno próprio e são desenhados no fillText
    const parts = emoSplit31(s);
    stroke.call(this, parts.map((p) => (p.emo ? '\u2003' : p.text)).join(''), x, y);
  };
}
