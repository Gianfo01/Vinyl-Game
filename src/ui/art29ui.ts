// Rodada 29 (ARTE) — atalhos de UI para pôr as artes novas ao lado do texto que já existe (só imagem: nenhum botão
// ou fluxo novo). Cada função devolve um <img class="px …"> memorizado (pxImg28) alinhado ao texto.

import { festivalPinImg28, mastheadImg28 } from './pixel/extras28';
import { placeImg29, signImg29, venueKind29, appIconImg29, type Place29 } from './pixel/places29';
import { staffPortraitImg29, staffRoleOf29 } from './pixel/people29';

/** Alinha a imagem ao meio da linha de texto, com um respiro à direita. */
export function a29<T extends HTMLElement>(img: T, gap = 4): T {
  img.style.verticalAlign = 'middle';
  if (gap) img.style.marginRight = `${gap}px`;
  img.setAttribute('aria-hidden', 'true');
  return img;
}

/** Fachada da casa de shows pelo tamanho (bar → estádio), cidade e época. */
export const venueArt29 = (id: string, name: string, cap: number, year: number, city = '', size = 24): HTMLImageElement =>
  a29(placeImg29(venueKind29(cap, name), id, name, year, city, size));

/** Fachada de um lugar de tipo conhecido. */
export const placeArt29 = (k: Place29, id: string, name: string, year: number, city = '', size = 24): HTMLImageElement => a29(placeImg29(k, id, name, year, city, size));

/** Placa da casa (para a página da casa). */
export const signArt29 = (id: string, name: string, year: number, w = 160): HTMLImageElement => { const i = signImg29(name, year, id, w); i.style.display = 'block'; i.style.margin = '0 0 6px'; return i; };

/** Veículo de mídia: rádio e TV ganham a fachada da emissora; streaming o ícone; o resto o mastro (R28). */
export function outletArt29(id: string, name: string, kind: string, year: number, city = ''): HTMLElement {
  if (kind === 'tv' || kind === 'radio') return placeArt29(kind, id, name, year, city, 22);
  if (/stream|platform|digital/.test(kind)) return a29(appIconImg29(name, year, 20));
  const mk = kind === 'fanzine' ? 'zine' : kind === 'blog' || kind === 'social' ? 'online' : kind;
  return a29(mastheadImg28(name, mk, 48));
}

/** Rosto de bastidor (produtor, empresário, crítico, técnico…) com o adereço da função. */
export const staffFace29 = (id: string, role: string, year: number, born?: number, size = 24): HTMLImageElement =>
  a29(staffPortraitImg29({ id, born }, staffRoleOf29(role), year, size));

/** Negócio próprio (Empreendimentos): estúdio, mídia, plataforma, festival, editora ou agência. */
export function ventureArt29(v: { id: string; kind: string; name: string; city: string; founded: number }, year: number, size = 28): HTMLImageElement {
  if (v.kind === 'platform') return a29(appIconImg29(v.name, Math.max(year, v.founded), size));
  if (v.kind === 'festival') return a29(festivalPinImg28(v.name, v.founded, size));
  const k: Place29 = v.kind === 'studio' ? 'studio' : v.kind === 'media' ? 'radio' : 'office';
  return placeArt29(k, v.id, v.name, year, v.city, size);
}
