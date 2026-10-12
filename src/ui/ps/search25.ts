// Rodada 25 — Pixel Studio: busca global (Buscar / Ctrl+K) acha qualquer tela ou aba pelo nome, em pt e en.
// As telas vêm do menu (rótulo nos dois idiomas). r27: as abas internas vêm do registro gerado (ps/tabsreg27.ts,
// todas as abas de todas as páginas — inclusive as nunca abertas) somado às abas vistas neste navegador
// (gancho em vis.ts: tabs(), com a trilha de abas-mãe; conveniência, nunca estado do jogo).
// O nome da aba vista no outro idioma vem da ajuda das abas (help18tabs).

import { getLang } from '../../i18n/strings';
import { tabHelp18 } from '../help18';
import { store } from '../store';
import { tabHook25 } from '../vis';
import { tabIndex27, type TabDef27 } from './subtabs27';

export interface SeenTab25 { area: string; key: string; id: string; label: string; alt?: string; trail: [string, string][] }

const KEY = 'vtn25.tabs';
const MAX = 800;
const seen = new Map<string, SeenTab25>();
try { for (const x of JSON.parse(localStorage.getItem(KEY) ?? '[]') as SeenTab25[]) if (x && x.area && x.key && x.id) seen.set(`${x.area}|${x.key}|${x.id}`, x); } catch { /* sem armazenamento */ }
let timer = 0;
const persist = () => { clearTimeout(timer); timer = window.setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify([...seen.values()].slice(-MAX))); } catch { /* ignora */ } }, 400); };

/** Rótulo no outro idioma (se a ajuda da aba existir). */
function altOf(key: string, id: string, label: string): string | undefined {
  const h = tabHelp18(key, id);
  if (!h) return undefined;
  const lang = getLang();
  const other = lang === 'pt' ? h.title.en : h.title.pt;
  return other && other !== label ? other : undefined;
}

/** Registra as abas vistas na tela atual (chamado por vis.ts a cada desenho de abas). */
export function noteTabs25(key: string, items: { id: string; label: string }[], trail: [string, string][]): void {
  const area = store.area;
  if (!area || !store.game) return;
  let changed = false;
  for (const it of items) {
    const k = `${area}|${key}|${it.id}`;
    const lbl = (it.label ?? '').trim();
    if (!lbl) continue;
    const old = seen.get(k);
    if (old && old.label === lbl && old.trail.length === trail.length) continue;
    seen.set(k, { area, key, id: it.id, label: lbl, alt: altOf(key, it.id, lbl), trail: trail.map((x) => [x[0], x[1]]) });
    changed = true;
  }
  if (changed) persist();
}
tabHook25.f = noteTabs25;

/** Abas conhecidas (vistas nesta sessão ou antes, neste navegador). */
export const seenTabs25 = (): SeenTab25[] => [...seen.values()];

/** r27: abas vistas no formato do registro (rótulo nos dois idiomas quando a ajuda da aba sabe o outro). */
export function seenDefs27(): TabDef27[] {
  const pt = getLang() === 'pt';
  return seenTabs25().map((x) => ({ area: x.area, key: x.key, id: x.id, trail: x.trail, label: pt ? { pt: x.label, en: x.alt ?? x.label } : { pt: x.alt ?? x.label, en: x.label } }));
}
/** r27: todas as abas para a busca — registro (nunca abertas também) + vistas, só as que existem no ano. */
export const searchTabs25 = (year?: number): SeenTab25[] => tabIndex27(getLang() === 'en' ? 'en' : 'pt', year, seenDefs27());

/** Abre a busca global (a paleta Ctrl+K do app). */
export function openSearch25(): void {
  document.dispatchEvent(new CustomEvent('vtn15-palette'));
}
