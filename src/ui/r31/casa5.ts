// R31 · onda 5 (CASA) — A CASA COMO "VOCÊ" (EXP-6) e A SEDE QUE CRESCE (EXP-5), em cena. Só com `exp5.nav` ligado:
//   · área 'casa31' → a casa da moradia de verdade (aluguel, apartamento, casa, mansão) e da época, com os objetos da
//     vida pessoal (espelho, cama, sofá, escrivaninha, calendário, porta-retratos, telefone, estante, instrumento,
//     cofre, garagem, janela, porta, quarto das crianças). Clicar abre a página de hoje; objeto com mais de um
//     destino abre um bilhete com os marcadores (2º clique). Janela = casas à venda e imóveis; garagem = veículos.
//   · área 'sede25' → a sede em corte no degrau de agora (garagem → escritório → andar → prédio); cada sala aberta
//     mostra os objetos que existem nela (os de funções que ainda não existem não aparecem).
//   · área 'hq' (tecla 2) → a maquete do prédio por cima da página de obras: degraus, próximo passo, custo e salas.
//   · Tab (chaveiro) troca entre as suas casas e sedes.
// Mesmos dados e ações de hoje (upgradeHq, buyRoom27, buyHouse…); explorar não muda o mundo (montar a cena só lê).

import './casa5.css';
import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { upgradeHq } from '../../sim/economy';
import { nav5On } from '../../sim/r31/exp5';
import { buyRoom27, type Unit27 } from '../../sim/sys/hqrooms27';
import { goodById } from '../../sim/sys/goods8';
import { playerPerson } from '../../sim/sys/life';
import type { GameState } from '../../sim/types';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { obj5Canvas, type Obj5 as Art5 } from '../pixel/exp5px';
import { paint27, plan27 } from '../ps/hqpx27';
import { store } from '../store';
import { ic, setTab } from '../vis';
import { houseList31 } from './city31ui';
import {
  DWELL5_L, ROOM5_L, SEDE_ART5, STAGE5, STAGE5_L, casaObjs5, houses5, mainHome5, maquete5, nextKey5, sedeObjs5, units5, vehicles5,
  type CasaObj5, type Go5, type Home5, type SedeRoom5,
} from './casa5model';
import { paintCasa5, type CasaSpot5 } from './casa5px';
import { key5 } from './keys5';
import { badge5, registerPaper5, registerRegion5 } from './nav5';
import { lockBtn31 } from './lock31';
import { goDest31 } from './quick31';
import { blitPx31 } from './scene31';
import { placeLabels31, type Spot31 } from './scene31model';

/** Casa mostrada agora (chave do chaveiro; só interface, não vai para o save). */
const UI5 = { key: 'home' };

// ---------------------------------------------------------------- abrir

/** Abre a página de hoje (com as abas do marcador). */
export function go5(g: Go5): void {
  for (const [k, v] of g.tabs ?? []) setTab(k, v);
  goDest31({ area: g.area });
}
/** Tecla do objeto, no formato do mock ("V", "⇧V"). */
export function chord5(id?: string): string {
  const c = id ? key5(`obj:${id}`)?.chord : undefined;
  if (!c) return '';
  return c.startsWith('shift+') ? `⇧${c.slice(6).toUpperCase()}` : c.toUpperCase();
}
const keyChip = (k: string) => (k ? h('kbd', { class: 'k5' }, k) : null);

/** Põe um bilhete/cartão fixo na tela ao lado do objeto clicado (fora da moldura da cena, nunca cortado). */
function pin5(el: HTMLElement, at: DOMRect | undefined): void {
  document.querySelectorAll('.slip5').forEach((x) => x.remove());
  el.style.position = 'fixed';
  document.body.append(el);
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const a = at ?? new DOMRect(vw / 2, vh / 3, 0, 0);
  const left = a.right + 8 + r.width <= vw - 8 ? a.right + 8 : Math.max(8, a.left - 8 - r.width);
  const top = Math.max(8, Math.min(vh - r.height - 8, a.top + a.height / 2 - r.height / 2));
  el.style.left = `${Math.round(left)}px`; el.style.top = `${Math.round(top)}px`;
  const off = (e: Event) => { if (!el.contains(e.target as Node)) { el.remove(); document.removeEventListener('pointerdown', off, true); } };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  el.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape') { e.stopPropagation(); el.remove(); } });
}

/** Bilhete com os marcadores de um objeto (2º clique), ao lado do objeto. */
function slip5(at: DOMRect | undefined, title: L, tip: L, gos: Go5[]): void {
  const el = h('div', { class: 'slip5', role: 'dialog', 'aria-label': t(title) },
    h('div', { class: 'slip5-h' }, h('b', null, t(title)), h('button', { type: 'button', class: 'slip5-x', 'aria-label': t(l('Fechar', 'Close')), onclick: () => el.remove() }, '×')),
    h('p', { class: 'slip5-t' }, t(tip)),
    h('div', { class: 'slip5-l' }, gos.map((g, i) => h('button', { type: 'button', class: `slip5-b${i === 0 ? ' main' : ''}`, onclick: () => { el.remove(); go5(g); } }, t(g.label)))));
  pin5(el, at);
  (el.querySelector('.slip5-b') as HTMLElement | null)?.focus();
}

// ---------------------------------------------------------------- casa

function curHome5(s: GameState): Home5 {
  const k = houses5(s).find((x) => x.key === UI5.key && x.home);
  return k?.home ?? mainHome5(s);
}

function janela5(s: GameState): void { modal(t(l('Janela: casas à venda e imóveis', 'Window: houses for sale and property')), houseList31(s), { wide: true }); }
function garagem5(s: GameState): void {
  const cars = vehicles5(s);
  modal(t(l('Garagem', 'Garage')), h('div', null,
    cars.length ? h('ul', { class: 'attr-list' }, cars.map((c) => h('li', null, h('b', null, t(goodById[c.id].name)), ` · ${$(c.value)}`)))
      : h('p', { class: 'muted' }, t(l('Nenhum veículo ainda. Carros e motos ficam na loja e em "Seus bens".', 'No vehicle yet. Cars and bikes are at the shop and in "Your belongings".'))),
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn small', onclick: () => go5({ area: 'wealth', tabs: [['life-wealth', 'goods8'], ['goods8', 'mine']], label: l('', '') }) }, t(l('Seus bens', 'Your belongings'))),
      h('button', { type: 'button', class: 'btn small', onclick: () => goDest31({ area: 'loja31' }) }, t(l('Loja (garagem)', 'Shop (garage)'))))));
}
function chaveiro5(s: GameState): void {
  const close = modal(t(l('Chaveiro: suas casas e sedes', 'Key rack: your homes and HQs')), h('div', { class: 'keys5' }, houses5(s).map((k) =>
    h('button', { type: 'button', class: `btn small${k.key === UI5.key ? ' primary' : ''}`, onclick: () => { close(); useKey5(s, k.key); } }, t(k.label)))));
}
function useKey5(s: GameState, key: string): void {
  const k = houses5(s).find((x) => x.key === key);
  if (!k) return;
  if (k.home) { UI5.key = k.key; if (store.area === 'casa31') rerender(); else goDest31({ area: 'casa31' }); return; }
  if (k.area) goDest31({ area: k.area });
}

/** Rótulo do lugar no topo: "SUA CASA · apartamento · 1975". */
function casaHead5(s: GameState, hm: Home5): HTMLElement {
  const where = hm.main ? '' : ` · ${t(cityById[hm.city]?.name ?? l(hm.city, hm.city))}`;
  const nm = t(hm.name), dw = t(DWELL5_L[hm.dwell]);
  return h('div', { class: 'r5-head' },
    h('span', { class: 'r5-place' }, t(l('Sua casa', 'Your home'))),
    h('span', { class: 'r5-sub' }, ` · ${nm}${nm.toLowerCase().includes(dw.toLowerCase()) ? '' : ` (${dw})`}${where} · ${s.year}`),
    houses5(s).length > 1 ? h('span', { class: 'r5-tab' }, keyChip('Tab'), ' ', t(l('troca de casa', 'switch house'))) : null);
}

/** A casa em cena (pura leitura). */
export function casaView5(s: GameState): HTMLElement {
  const hm = curHome5(s);
  const os = casaObjs5(s, hm);
  const by = new Map(os.map((o) => [o.id, o]));
  const bang = new Set(os.filter((o) => o.obj && badge5(s, o.obj) > 0).map((o) => o.id));
  const cars = hm.main ? vehicles5(s) : [];
  const d = paintCasa5({ year: s.year, month: s.month, city: hm.city, dwell: hm.dwell, seed: 41 + hm.house * 7, items: os.map((o) => ({ id: o.id, art: o.art, room: o.room })), bang,
    cars: cars.length, carYears: cars.map((c) => Math.min(s.year, goodById[c.id].from ?? s.year)), gold: Math.min(3, s.player.stats.gold) });
  const youP = playerPerson(s);
  const youSpot: CasaSpot5 = { id: 'voce', x: d.you.x - 8, y: d.you.y - 33, w: 16, h: 33 };
  const spots = [...d.spots.filter((x) => by.has(x.id)), ...(youP ? [youSpot] : [])];
  const root = h('section', { class: 'r5 casa5-root', 'aria-label': t(l('Sua casa', 'Your home')) }, casaHead5(s, hm));
  root.append(stage5(d.W, d.H, (cv) => {
    const ctx = blitPx31(cv, d.px.d, d.W, d.H);
    if (!ctx || !youP) return;
    const sp = avatarSprite(lookOf(youP), { year: s.year, pose: 'stand', dir: 'SE', frame: 0 });
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(d.you.x - 6, d.you.y, 12, 1);
    ctx.drawImage(sp.c, d.you.x - sp.ax, d.you.y - sp.ay + 1);
  }, spots.map((sp) => {
    const o = by.get(sp.id)!;
    return { sp, label: o.label, tip: o.tip, key: chord5(o.obj), bang: bang.has(o.id), act: (at) => act5(s, at, o) };
  }), [0, d.H - 12])); // POL5: mostra o céu e o horizonte da cena (antes: só a faixa do cômodo e a sobra lisa)
  const sc = root.lastElementChild as HTMLElement;
  // POL5: a sobra da tela em volta da casa continua o céu (em cima) e o chão (embaixo), sem faixa preta
  try {
    const cx = sc.querySelector<HTMLCanvasElement>('canvas.r5-cv')?.getContext('2d');
    const px = (y: number) => { const v = cx!.getImageData(1, y, 1, 1).data; return `rgb(${v[0]},${v[1]},${v[2]})`; };
    if (cx) { root.style.setProperty('--r5-sky', px(0)); root.style.setProperty('--r5-ground', px(Math.max(0, d.H - 13))); }
  } catch { /* sem canvas (testes) */ }
  sc.querySelector('.r5-view')!.append(roomsBar5(d.rooms.map((r) => ({ label: ROOM5_L[r.id], x: r.x, w: r.w })), d.W));
  // cômodos: um botão por cômodo rola a cena até ele (casa larga não cabe inteira na tela)
  if (d.rooms.length > 1) root.querySelector('.r5-head')!.append(h('span', { class: 'r5-roomsnav' }, d.rooms.map((r) => h('button', { type: 'button', class: 'r5-rbtn',
    onclick: () => { const v = sc.querySelector('.r5-view') as HTMLElement; sc.scrollTo({ left: Math.max(0, (r.x / d.W) * v.offsetWidth - 24), behavior: 'smooth' }); } }, t(ROOM5_L[r.id])))));
  return root;
}

function act5(s: GameState, at: DOMRect | undefined, o: CasaObj5): void {
  if (o.panel === 'janela') return janela5(s);
  if (o.panel === 'garagem') return garagem5(s);
  if (o.panel === 'chaveiro') return chaveiro5(s);
  if (o.go.length === 1) return go5(o.go[0]);
  slip5(at, o.label, o.tip, o.go);
}

// ---------------------------------------------------------------- palco comum (canvas + pontos + rótulos)

interface Pt5 { sp: CasaSpot5; label: L; tip: L; key: string; bang: boolean; act: (at: DOMRect | undefined) => void; /** rótulo dentro do ponto, no alto (salas da sede) */ inside?: boolean }
const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

/** Palco: canvas + pontos + rótulos. `crop` = faixa vertical mostrada [y0, y1) (corta céu e rua para a casa ter
 *  proporção de cômodo); a cena ganha altura fixa e rola de lado quando a casa é larga. */
function stage5(W: number, H: number, paint: (cv: HTMLCanvasElement) => void, pts: Pt5[], crop: [number, number] = [0, H]): HTMLElement {
  const cv = h('canvas', { class: 'r5-cv', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  try { paint(cv); } catch (e) { console.error('casa5', e); }
  const ch = crop[1] - crop[0];
  const st = h('div', { class: 'r5-stage', style: `top:${pct(-crop[0], ch)};height:${pct(H, ch)}` }, cv);
  // altura: cômodos (casa, garagem) ~50vh; prédio alto cresce com os andares (até 82vh) para as salas não ficarem miúdas
  const hv = ch > 190 ? `min(70vh, ${Math.round(ch * 2.2)}px)` : 'var(--r5-h)';
  const view = h('div', { class: 'r5-view', style: `--hv:${hv};--ar:${(W / ch).toFixed(4)};height:var(--hv);width:calc(var(--hv) * var(--ar))` }, st);
  const layer = h('div', { class: 'r5-layer' });
  for (const p of pts) {
    const b = h('button', { type: 'button', class: `r5-spot${p.bang ? ' bang' : ''}`, title: `${t(p.label)}: ${t(p.tip)}${p.key ? ` (${p.key})` : ''}`, 'aria-label': `${t(p.label)}: ${t(p.tip)}`,
      style: `left:${pct(p.sp.x, W)};top:${pct(p.sp.y, H)};width:${pct(p.sp.w, W)};height:${pct(p.sp.h, H)}`, onclick: (e: Event) => p.act((e.currentTarget as HTMLElement | null)?.getBoundingClientRect()) });
    layer.append(b);
  }
  // rótulos no padrão do mock ("Espelho [V]"), sem sobrepor (placeLabels31, na escala da tela)
  const labs = placeLabels31(pts.map((p) => ({ id: p.sp.id, x: p.sp.x, y: p.sp.y + (p.inside ? 1 : 0), w: p.sp.w, h: p.inside ? 0 : p.sp.h, label: p.label, tip: p.tip, go: {} } as unknown as Spot31)), W, H, 3.6,
    (sp) => { const p = pts.find((x) => x.sp.id === sp.id)!; return `${t(p.label)}${p.key ? `  ${p.key}` : ''}`; });
  const lab = h('div', { class: 'r5-labels', 'aria-hidden': 'true' }, labs.map((b) => {
    const p = pts.find((x) => x.sp.id === b.id)!;
    return h('span', { class: `r5-lab${p.bang ? ' bang' : ''}`, style: `left:${pct(b.x + b.w / 2, W)};top:${pct(b.y, H)}` }, t(p.label), p.key ? keyChip(p.key) : null);
  }));
  st.append(layer, lab);
  return h('div', { class: 'r5-scroll' }, view);
}
function roomsBar5(rs: { label: L; x: number; w: number }[], W: number): HTMLElement {
  return h('div', { class: 'r5-rooms', 'aria-hidden': 'true' }, rs.map((r) => h('span', { style: `left:${pct(r.x, W)};width:${pct(r.w, W)}` }, t(r.label))));
}

// ---------------------------------------------------------------- sede que cresce

function sedeHead5(s: GameState): HTMLElement {
  const m = maquete5(s);
  const cur = m.steps.find((x) => x.now)!;
  return h('div', { class: 'r5-head' },
    h('span', { class: 'r5-place' }, t(l('Sua sede', 'Your HQ'))),
    h('span', { class: 'r5-sub' }, ` · ${t(STAGE5_L[m.stage])}${t(cur.name) === t(STAGE5_L[m.stage]) ? '' : ` (${t(cur.name)})`} · ${s.year}`),
    h('span', { class: 'r5-ladder' }, STAGE5.map((st) => h('span', { class: `r5-step${st === m.stage ? ' now' : STAGE5.indexOf(st) < STAGE5.indexOf(m.stage) ? ' done' : ''}` }, t(STAGE5_L[st])))),
    h('button', { type: 'button', class: 'r5-maq', onclick: () => goDest31({ area: 'hq' }) }, t(l('Maquete', 'Model')), keyChip('2')));
}

/** A sede em corte: cada sala aberta tem os objetos das funções que existem; sala fechada leva à maquete. */
export function sedeView5(s: GameState, has?: (area: string) => boolean): HTMLElement {
  const pl = plan27({ hq: s.player.hq, year: s.year, city: s.config.homeCity, brand: s.config.companyName?.slice(0, 10).toUpperCase(), seedKey: s.config.seed, units: units5(s) });
  const rooms = sedeObjs5(s, has);
  const px = paint27(pl);
  const pts: Pt5[] = [];
  pl.cells.forEach((c, i) => {
    const r = rooms[i];
    const n = r.objs.length;
    pts.push({ sp: { id: `room:${i}`, x: c.x, y: c.y, w: c.w, h: c.h }, label: r.name, tip: r.open ? (n ? l(`${n} objeto(s)`, `${n} object(s)`) : l('sala', 'room')) : r.lock === 'building' ? l('em obra', 'under construction') : l('fechada: veja a maquete', 'closed: see the model'),
      key: '', inside: true, bang: r.objs.some((o) => badge5(s, o.id) > 0), act: (at) => (r.open ? roomCard5(s, at, r) : goDest31({ area: 'hq' })) });
  });
  const root = h('section', { class: 'r5 sede5-root', 'aria-label': t(l('Sua sede', 'Your HQ')) }, sedeHead5(s));
  root.append(stage5(pl.W, pl.H, (cv) => { blitPx31(cv, px.d, pl.W, pl.H); }, pts, [Math.max(0, pl.top - 34), pl.H]));
  return root;
}

/** Cartão de uma sala: os objetos que existem nela (desenho ART5, nome e tecla); clicar abre. */
function roomCard5(s: GameState, at: DOMRect | undefined, r: SedeRoom5): void {
  const el = h('div', { class: 'slip5 room5', role: 'dialog', 'aria-label': t(r.name) },
    h('div', { class: 'slip5-h' }, h('b', null, t(r.name)), h('button', { type: 'button', class: 'slip5-x', 'aria-label': t(l('Fechar', 'Close')), onclick: () => el.remove() }, '×')),
    h('div', { class: 'room5-g' }, r.objs.map((o) => {
      const art = SEDE_ART5[o.id] as Art5 | undefined;
      const n = badge5(s, o.id);
      const tgt = o.opens[0] ?? o.links?.[0];
      return h('button', { type: 'button', class: 'room5-o', onclick: () => { el.remove(); if (tgt) go5({ area: tgt.area, tabs: tgt.tab ? [tgt.tab] : undefined, label: o.label }); } },
        h('span', { class: 'room5-a' }, art ? obj5Canvas(art, s.year, n > 0 ? 'new' : 'idle', 2) : ic(ICON5[o.id] ?? 'star', 2)),
        h('span', { class: 'room5-n' }, t(o.label)), keyChip(chord5(o.id)));
    })));
  pin5(el, at);
  (el.querySelector('.room5-o') as HTMLElement | null)?.focus();
}

/** Ícone (icons.ts) dos objetos que são gente ou a própria sala (sem desenho ART5). */
const ICON5: Record<string, string> = {
  chefe: 'handshake', contador: 'money', quadrofunc: 'contract', graficos: 'chart-up', prateleiras: 'gold-disc', lounge: 'guitar', mesasom: 'mic',
  piano: 'note', salagravacao: 'cassette', palco: 'drums', secretaria: 'clock',
};

// ---------------------------------------------------------------- maquete (tecla 2)

const unitLine5 = (s: GameState, u: Unit27): HTMLElement => h('li', { class: `maq5-u ${u.status}` },
  h('b', null, t(u.name)), ' ', h('small', null, t(u.effect)), ' ',
  u.status === 'open' ? h('span', { class: 'pill good' }, t(l('aberta', 'open')))
    : u.status === 'building' ? h('span', { class: 'pill warn' }, t(l('em obra · {n} mês(es)', 'building · {n} month(s)'), { n: u.eta }))
      : lockBtn31(h('span', null, t(u.kind === 'floor' ? l('Montar', 'Fit out') : u.owned ? l('Já é sua', 'Already yours') : l('Comprar', 'Buy')), ' ', h('small', null, $(u.cost))), u.blocked,
        () => { const e = buyRoom27(s, u.id); toast(t(e ?? l('Obra contratada.', 'Works contracted.')), e ? 'bad' : 'good'); rerender(); }));

/** A maquete: o prédio de agora e o próximo lado a lado, os degraus, o custo e as salas/andares (ações de hoje). */
export function maqueteView5(s: GameState): HTMLElement {
  const m = maquete5(s);
  const mini = (hq: number) => {
    const pl = plan27({ hq, year: s.year, city: s.config.homeCity, seedKey: s.config.seed });
    const cv = h('canvas', { class: 'maq5-cv' }) as HTMLCanvasElement;
    blitPx31(cv, paint27(pl).d, pl.W, pl.H);
    return cv;
  };
  const nx = m.next;
  return h('section', { class: 'maq5', 'aria-label': t(l('Maquete do prédio', 'Building model')) },
    h('div', { class: 'maq5-h' }, h('b', null, t(l('Maquete do prédio', 'Building model'))), ' ', keyChip('2')),
    h('div', { class: 'maq5-row' },
      h('figure', null, mini(s.player.hq), h('figcaption', null, t(l('Agora', 'Now')), ': ', t(m.steps[s.player.hq].name))),
      nx ? h('div', { class: 'maq5-arrow', 'aria-hidden': 'true' }, '→') : null,
      nx ? h('figure', { class: 'maq5-next' }, mini(nx.lv), h('figcaption', null, t(l('Próximo passo', 'Next step')), ': ', t(nx.name), ` (${t(STAGE5_L[nx.stage])})`)) : null),
    h('ol', { class: 'maq5-steps' }, m.steps.map((st) => h('li', { class: st.now ? 'now' : st.done ? 'done' : '' },
      h('b', null, t(st.name)), ' ', h('small', null, `${t(STAGE5_L[st.stage])} · ${t(l('{c} carreiras · {e} equipe · {x} sessões', '{c} careers · {e} staff · {x} sessions'), { c: st.caps.careers, e: st.caps.staff, x: st.caps.sessions })}`)))),
    nx ? h('div', { class: 'maq5-next-act' },
      h('span', null, t(l('Ampliar para {n}: {c}', 'Expand to {n}: {c}'), { n: t(nx.name), c: $(nx.cost) })), ' ',
      lockBtn31(t(l('Ampliar a sede', 'Expand the HQ')), nx.blocked, () => { const e = upgradeHq(s); toast(t(e ?? l('Sede ampliada!', 'HQ expanded!')), e ? 'bad' : 'good'); rerender(); }, { cls: 'btn small primary' }))
      : h('p', { class: 'small muted' }, t(l('A sede já está no último degrau.', 'The HQ is already at the top step.'))),
    m.units.length ? h('div', null, h('h4', null, t(l('Salas e andares deste prédio', 'Rooms and floors of this building'))), h('ul', { class: 'maq5-units' }, m.units.map((u) => unitLine5(s, u)))) : null);
}

// ---------------------------------------------------------------- registro e chaveiro

// API da casca (NAV, nav5.ts): a região 'casa' e o papel da maquete.
registerRegion5('casa', (c) => casaView5(c.s));
registerPaper5('maquete', (c) => h('div', null, maqueteView5(c.s), c.old()));

/** Tab troca de casa/sede (chaveiro) quando a casa ou a sede nova está na tela. */
if (typeof document !== 'undefined') document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
  const s = store.game;
  if (!s || !nav5On(s) || !document.querySelector('.casa5-root, .sede5-root')) return;
  const tg = e.target as HTMLElement | null;
  if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
  const list = houses5(s);
  if (list.length < 2) return;
  e.preventDefault();
  const cur = store.area === 'casa31' ? UI5.key : list.find((k) => k.area === store.area)?.key ?? 'sede';
  useKey5(s, nextKey5(list, cur).key);
});
