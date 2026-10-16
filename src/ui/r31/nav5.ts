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
import { REGION_L5, object5, objectFor5, objects5, regionOf5, type Obj5, type Open5 } from './objects5';

/** Ganchos que a interface liga (app.ts). Sem gancho, as funções só devolvem o alvo. */
export const NAV5: {
  go?: (t: Open5) => void;
  /** área da sede da carreira principal (menu31.entryHome31) */
  home?: () => string | undefined;
  pause?: () => void;
  help?: (rows: { key: string; label: L }[]) => void;
  /** papel aberto agora (para as teclas internas dele) */
  paper?: () => string | undefined;
} = {};

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
  if (t) NAV5.go?.(t);
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
  if (g) NAV5.go?.(g.open);
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
  NAV5.go?.(t);
  return t;
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
