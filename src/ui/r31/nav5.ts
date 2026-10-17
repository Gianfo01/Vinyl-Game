// R31 · onda 5 (TEC) — CAMADA DE NAVEGAÇÃO em esqueleto, atrás de `exp5.nav` (DESLIGADO).
// Sem tela nova: `open5` abre a página antiga dona do objeto; `goto5` ("ir até lá") leva de um fato, recado, pendência
// ou prazo da agenda ao objeto certo; `travel5` é o modelo dos 4 botões de viagem; `pocketView5` é o modelo do bolso.
// A interface liga os ganchos (`NAV5`) uma vez no boot; com o interruptor desligado `keyNav5` devolve false na primeira
// linha e nada muda. Explorar não muda o mundo: tudo aqui só lê, menos o bolso (escolha do jogador, guardada no save).

import { l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import type { Goto18 } from '../../sim/inbox18';
import type { Deadline19 } from '../../sim/calendar19';
import type { Fact } from '../../sim/facts17';
import type { GameState } from '../../sim/types';
import type { Dest } from '../../sim/r31/dest';
import { pendingList, type Pending } from '../../sim/r31/pending';
import { nav5On, pocketIds5, pocketToggle5, POCKET_MAX5 } from '../../sim/r31/exp5';
import { CAREER_PAGE17 } from '../nav17';
import { MAP_TAB31, SEDE_LABEL31 } from '../ps/menu31';
import { bindOf5, chordOf5, key5, keys5, type Bind5, type KeyEv5, type Region5 } from './keys5';
import { PAUSE5, REGION_L5, object5, objectFor5, objects5, regionOf5, type Obj5, type Open5 } from './objects5';

/** Ganchos que a interface liga (app.ts). Sem gancho, as funções só devolvem o alvo. */
export const NAV5: {
  go?: (t: Open5) => void;
  /** área da sede da carreira principal (menu31.entryHome31) */
  home?: () => string | undefined;
  pause?: () => void;
  help?: (rows: { key: string; label: L }[]) => void;
  /** papel aberto agora (para as teclas internas dele) */
  paper?: () => string | undefined;
  /** casca (NAV): viagem desenhada (cena da região) em vez de abrir a página da região */
  travel?: (r: Region5) => void;
  /** casca (NAV): abre o papel do objeto `id` no marcador `t` (sem o gancho: `go(t)`) */
  open?: (id: string, t: Open5) => void;
} = {};

// ---------------------------------------------------------------- registro das frentes (PAPEL, ELENCO, CASA, MAPA, TRN)
// Contrato (DECISOES, "31.5 NAV · API"): quem desenha o conteúdo de um objeto ou de uma região só registra uma função;
// a casca (shell5.ts) chama a função quando o papel/região abre. Devolver null = "ainda não tenho": a casca mostra a
// página antiga dentro da moldura (nunca tela vazia). Nada aqui pode mudar o mundo; ações usam os caminhos de sempre.

/** O que a casca entrega a quem desenha o PAPEL de um objeto. */
export interface PaperCtx5 {
  s: GameState;
  /** objeto aberto (objects5) */
  obj: Obj5;
  /** marcador aberto agora (página antiga + aba) */
  marker: Open5;
  /** todos os marcadores do papel (páginas donas + abas que vieram para ele) */
  markers: Open5[];
  /** troca de marcador sem fechar o papel */
  mark: (m: Open5) => void;
  /** abre outro objeto / "ir até lá" a partir do papel */
  open: (objId: string, marker?: Open5) => void;
  goto: (x: GotoIn5) => void;
  close: () => void;
  rerender: () => void;
  /** a página antiga do marcador aberto (o que a casca mostraria sem registro) */
  old: () => HTMLElement;
  /** tamanho do miolo na tela (px lógicos da moldura, 1 = 2 px de tela) e as páginas dele (livro/agenda: duas), relativas ao miolo */
  box?: { w: number; h: number; pages: { x: number; y: number; w: number; h: number }[] };
}
export type PaperRender5 = (c: PaperCtx5) => HTMLElement | null;

/** O que a casca entrega a quem desenha uma REGIÃO (cidade e mundo: MAPA; casa: CASA; sede: NAV). */
export interface RegionCtx5 {
  s: GameState;
  region: Region5;
  open: (objId: string, marker?: Open5) => void;
  goto: (x: GotoIn5) => void;
  travel: (r: Region5) => void;
  rerender: () => void;
  /** "!" por objeto (nav5.bangs5) */
  bangs: Record<string, number>;
  /** a página antiga da região (travelTarget5) */
  old: () => HTMLElement;
}
export type RegionRender5 = (c: RegionCtx5) => HTMLElement | null;

const PAPERS5 = new Map<string, PaperRender5>();
const REGIONS_R5 = new Map<Region5, RegionRender5>();
/** PAPEL/ELENCO/CASA: conteúdo próprio do papel de um objeto (id de objects5). Registrar de novo substitui. */
export function registerPaper5(objectId: string, render: PaperRender5): void { PAPERS5.set(objectId, render); }
/** MAPA (cidade, mundo) e CASA (casa): a cena da região. Registrar de novo substitui. */
export function registerRegion5(region: Region5, render: RegionRender5): void { REGIONS_R5.set(region, render); }
export const paperOf5 = (objectId: string): PaperRender5 | undefined => PAPERS5.get(objectId);
export const regionOfR5 = (region: Region5): RegionRender5 | undefined => REGIONS_R5.get(region);
export const papers5 = (): string[] => [...PAPERS5.keys()];

/** Transições (frente TRN): um gancho só. `swap` troca a tela; a transição chama `swap` no meio (cortina fechada) e
 *  nunca bloqueia: sem TRN, `swap()` direto. `kind`: viagem, abrir papel (zoom no objeto), fechar papel. */
export type Trans5 = 'travel' | 'open' | 'close';
export interface TransIn5 { kind: Trans5; from?: Region5; to?: Region5; obj?: string; year: number; /** retângulo do objeto na tela (zoom) */ rect?: { x: number; y: number; w: number; h: number } }
export const TRANS5: { run: (t: TransIn5, swap: () => void) => void } = { run: (_t, swap) => swap() };

// ---------------------------------------------------------------- abrir um objeto

/** Página (+ aba) que o objeto abre. `marker` escolhe um marcador do objeto (página dona ou aba que veio para ele). */
export function target5(id: string, marker?: Open5): Open5 | undefined {
  const o = object5(id);
  if (!o) return undefined;
  if (marker && objectFor5(marker.area, marker.tab)?.id === id) return marker;
  return o.opens[0] ?? o.links?.[0];
}

/** Abre o objeto. Hoje: a página antiga correspondente (pelo gancho `NAV5.go`). Devolve o alvo (ou undefined). */
export function open5(id: string, marker?: Open5): Open5 | undefined {
  const t = target5(id, marker);
  if (t) { if (NAV5.open) NAV5.open(id, t); else NAV5.go?.(t); }
  return t;
}

// ---------------------------------------------------------------- "ir até lá"

/** Tudo que pode ter "ir até lá": destino, pendência, fato, prazo da agenda, recado (Goto18) ou id de objeto/página. */
export type GotoIn5 = string | Dest | Pending | Fact | Deadline19 | Goto18;
export interface Goto5 { obj?: string; open: Open5; actId?: string; personId?: string; country?: string }

const splitTab = (area: string, tab?: string): [string, string] | undefined => {
  if (!tab) return undefined;
  const i = tab.indexOf('/');
  return i > 0 ? [tab.slice(0, i), tab.slice(i + 1)] : undefined;
};
const fromDest = (d: Dest): Goto5 => ({ open: { area: d.area, tab: splitTab(d.area, d.tab) }, actId: d.actId, personId: d.personId, country: d.country });

/** Resolve o alvo de "ir até lá" sem abrir nada. */
export function resolveGoto5(s: GameState, x: GotoIn5): Goto5 | undefined {
  let g: Goto5 | undefined;
  if (typeof x === 'string') {
    if (object5(x)) { const t = target5(x); return t ? { obj: x, open: t } : undefined; }
    g = { open: { area: x } };
  } else if ('owner' in x && 'shortcuts' in x) g = { ...fromDest(x.owner), actId: x.owner.actId ?? x.actId, personId: x.owner.personId ?? x.personId };
  else if ('kind' in x && 'actors' in x && 'severity' in x) {
    const f = x as Fact;
    const who = f.actors.find((a) => s.acts[a]);
    if (who) g = { open: { area: 'artists' }, actId: who };
    else if (f.place) g = { open: { area: 'world', tab: MAP_TAB31 }, country: countryOfCity(f.place) ?? undefined };
    else if (f.actors[0] && s.persons[f.actors[0]]) g = { open: { area: 'people' }, personId: f.actors[0] };
    else g = { open: { area: 'news17' } };
  } else if ('w' in x && 'kind' in x && 't' in x) {
    const d = x as Deadline19;
    g = d.goto ? { open: { area: d.goto.area ?? 'calendar19', tab: d.goto.tab }, actId: d.goto.act, personId: d.goto.person } : { open: { area: 'calendar19' } };
  } else if (!Array.isArray((x as Goto18).tab) && !('act' in x) && !('person' in x) && !('label' in x) && typeof (x as Dest).area === 'string') g = fromDest(x as Dest);
  else {
    const gt = x as Goto18;
    g = { open: { area: gt.area ?? 'cockpit', tab: gt.tab }, actId: gt.act, personId: gt.person };
  }
  if (!g) return undefined;
  g.obj = objectFor5(g.open.area, g.open.tab)?.id;
  return g;
}

/** "Ir até lá": abre o objeto certo (hoje, a página antiga dona) e devolve o alvo. */
export function goto5(s: GameState, x: GotoIn5): Goto5 | undefined {
  const g = resolveGoto5(s, x);
  if (g) { if (g.obj && NAV5.open) NAV5.open(g.obj, g.open); else NAV5.go?.(g.open); }
  return g;
}

// ---------------------------------------------------------------- "!" (novidade)

/** Objeto dono de cada pendência única (pelo destino dono). */
function pendObj5(p: Pending): string | undefined {
  return objectFor5(p.owner.area, splitTab(p.owner.area, p.owner.tab))?.id ?? (p.owner.area === 'desk' ? 'mesames' : undefined);
}
/** Quantas pendências moram em cada objeto (cada pendência conta uma vez, no dono). */
export function bangs5(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of pendingList(s)) { const o = pendObj5(p); if (o) out[o] = (out[o] ?? 0) + 1; }
  for (const o of objects5()) if (o.badge) { const n = o.badge(s); if (n > 0) out[o.id] = (out[o.id] ?? 0) + n; }
  return out;
}
export const badge5 = (s: GameState, id: string): number => bangs5(s)[id] ?? 0;

// ---------------------------------------------------------------- viagem (Sede, Casa, Cidade, Mundo)

export const REGIONS5: Region5[] = ['sede', 'casa', 'cidade', 'mundo'];
const mainCareer5 = (s: GameState): string => ((s as unknown as { x4?: { careers12?: { active?: string[] } } }).x4?.careers12?.active ?? [])[0] ?? 'label';

/** Para onde leva cada botão de viagem. */
export function travelTarget5(s: GameState, r: Region5): Open5 {
  if (r === 'sede') {
    const h = NAV5.home?.();
    if (h) return { area: h };
    const m = mainCareer5(s);
    return { area: m === 'label' ? 'sede25' : CAREER_PAGE17[m]?.area ?? 'sede25' };
  }
  if (r === 'casa') return { area: 'casa31' };
  if (r === 'cidade') return { area: 'campus18' };
  return { area: 'world', tab: MAP_TAB31 };
}

/** Região do mundo onde uma página mora (para acender o botão do lugar atual). Páginas de carreira: a principal é a sede. */
export function regionOfArea5(s: GameState, area: string, tab?: [string, string]): Region5 | undefined {
  const o = objectFor5(area, tab);
  if (!o) return undefined;
  if (o.career) return o.career === mainCareer5(s) ? 'sede' : 'cidade';
  return regionOf5(o.place);
}

export interface Travel5 { id: Region5; label: L; key: string; active: boolean; bang: number; open: Open5 }
/** Os 4 botões: rótulo (a Sede troca de nome pela carreira principal), tecla, aceso no lugar atual, "!" do lugar. */
export function travel5(s: GameState, current?: Open5): Travel5[] {
  const bang = bangs5(s);
  const cur = current ? regionOfArea5(s, current.area, current.tab) : undefined;
  return REGIONS5.map((r) => {
    let n = 0;
    for (const o of objects5()) if ((o.career ? (o.career === mainCareer5(s) ? 'sede' : 'cidade') : regionOf5(o.place)) === r) n += bang[o.id] ?? 0;
    const label = r === 'sede' ? SEDE_LABEL31[mainCareer5(s)] ?? REGION_L5.sede : REGION_L5[r];
    return { id: r, label, key: key5(`travel:${r}`)?.chord ?? '', active: cur === r, bang: n, open: travelTarget5(s, r) };
  });
}
export function travelGo5(s: GameState, r: Region5): Open5 {
  const t = travelTarget5(s, r);
  if (NAV5.travel) NAV5.travel(r); else NAV5.go?.(t);
  return t;
}

// ---------------------------------------------------------------- índice (menu de pausa) e alcance

export interface Index5 { region: Region5 | 'pausa'; obj?: string; label: L; open: Open5 }
/** Índice completo do menu de pausa: toda página dona de um objeto (no objeto dono) e as páginas fora do mundo. */
export function index5(): Index5[] {
  const out: Index5[] = [];
  const seen = new Set<string>();
  for (const r of REGIONS5) for (const o of objects5()) {
    if ((o.career ? 'cidade' : regionOf5(o.place)) !== r) continue;
    for (const x of o.opens) { if (seen.has(x.area)) continue; seen.add(x.area); out.push({ region: r, obj: o.id, label: o.label, open: x }); }
  }
  for (const [area, label] of Object.entries(PAUSE5)) if (!seen.has(area)) { seen.add(area); out.push({ region: 'pausa', label, open: { area } }); }
  return out;
}
/** Como chegar a uma página antiga: 'key' = uma tecla (objeto ou marcador que abre nela), 'clicks' = cliques (botão de
 *  pausa + linha do índice = 2). undefined = inalcançável. */
export function reach5(area: string, list: readonly Bind5[] = keys5()): { key?: string; clicks?: number } | undefined {
  for (const b of list) {
    if (b.scope !== 'global') continue;
    const a = b.act;
    if (a.kind === 'object' && target5(a.id)?.area === area) return { key: b.chord };
    if (a.kind === 'marker' && a.area === area) return { key: b.chord };
  }
  return index5().some((x) => x.open.area === area) ? { clicks: 2 } : undefined;
}

// ---------------------------------------------------------------- bolso

export interface PocketItem5 { id: string; label: L; key: string; bang: number }
/** O que o bolso mostra (ids que não são objetos conhecidos ficam de fora, sem apagar do save). */
export function pocketView5(s: GameState): PocketItem5[] {
  const bang = bangs5(s);
  return pocketIds5(s).map((id) => object5(id)).filter((o): o is Obj5 => !!o).slice(0, POCKET_MAX5)
    .map((o) => ({ id: o.id, label: o.label, key: key5(`obj:${o.id}`)?.chord ?? (o.keyRef ? key5(o.keyRef)?.chord ?? '' : ''), bang: bang[o.id] ?? 0 }));
}
/** "+ fixar" / "tirar do bolso". Só aceita objetos registrados. */
export function pin5(s: GameState, id: string): L | undefined {
  if (!object5(id)) return l('Objeto desconhecido.', 'Unknown object.');
  return pocketToggle5(s, id);
}

// ---------------------------------------------------------------- teclado

/** Lista de teclas para o "?" (sem as internas de papéis). */
export function keyRows5(list: readonly Bind5[] = keys5()): { key: string; label: L }[] {
  return list.filter((b) => b.scope === 'global').map((b) => ({ key: b.chord, label: b.label }));
}

/** Trata a tecla com a navegação nova. Devolve true quando tratou (quem chama para). Interruptor desligado: false sempre. */
export function keyNav5(s: GameState | undefined, e: KeyEv5): boolean {
  if (!s || !nav5On(s)) return false;
  const b = bindOf5(chordOf5(e), NAV5.paper?.());
  if (!b) return false;
  const a = b.act;
  if (a.kind === 'object') return !!open5(a.id);
  if (a.kind === 'marker') return !!open5(a.obj, { area: a.area, tab: a.tab });
  if (a.kind === 'travel') { travelGo5(s, a.id); return true; }
  if (a.kind === 'sys' && a.id === 'pause' && NAV5.pause) { NAV5.pause(); return true; }
  if (a.kind === 'sys' && a.id === 'keys' && NAV5.help) { NAV5.help(keyRows5()); return true; }
  return false; // busca, avançar, marcadores { }: continuam com o código de hoje
}
