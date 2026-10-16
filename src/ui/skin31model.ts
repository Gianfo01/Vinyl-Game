// R31 (C) — base dos estilos da interface por era: a parte SEM DOM (testável).
// Mapa ano → estilo, resolução da preferência ("automático pela era" ou fixo), quando avisar a troca e a lista dos
// pares de tokens texto/fundo que precisam passar AA (tests/r31-contrast.test.ts). Só apresentação: nada do jogo muda.
// Onda 4 (M): os 9 estilos por época estão prontos (ui/skins31.css); 'estudio' é o visual de hoje.

import { l, type L } from '../data/world';

export type SkinId31 = 'gazeta' | 'deco' | 'jukebox' | 'hifi' | 'fosforo' | 'janelas' | 'portal' | 'plano' | 'vidro' | 'estudio';
/** 'auto' = muda sozinho com a época (padrão); um id = fixo. */
export type SkinPref31 = 'auto' | SkinId31;

/** `sw`: amostra nas Opções [faixa de cima, metade esquerda, metade direita] — as cores-marca do estilo (só enfeite). */
export interface Skin31 { id: SkinId31; name: L; from: number; to: number; ready: boolean; sw: [string, string, string] }

/** Os 9 estilos por época (anos inclusivos) + o de hoje. Ordem = ordem nas Opções. */
export const SKINS31: Skin31[] = [
  { id: 'gazeta', name: l('Gazeta', 'Gazette'), from: 1889, to: 1919, ready: true, sw: ['#1e1912', '#efe7d4', '#7d2214'] },
  { id: 'deco', name: l('Déco Rádio', 'Deco Radio'), from: 1920, to: 1945, ready: true, sw: ['#0e0c08', '#dcb664', '#221d13'] },
  { id: 'jukebox', name: l('Jukebox', 'Jukebox'), from: 1946, to: 1964, ready: true, sw: ['#b80f2a', '#0f6f68', '#ffd84a'] },
  { id: 'hifi', name: l('Hi-Fi', 'Hi-Fi'), from: 1965, to: 1979, ready: true, sw: ['#cfcac0', '#33200f', '#f2a33c'] },
  { id: 'fosforo', name: l('Fósforo', 'Phosphor'), from: 1980, to: 1989, ready: true, sw: ['#1d6b2b', '#020b04', '#5cff76'] },
  { id: 'janelas', name: l('Janelas 95', 'Windows 95'), from: 1990, to: 1999, ready: true, sw: ['#000080', '#c0c0c0', '#008080'] },
  { id: 'portal', name: l('Portal 2000', 'Portal 2000'), from: 2000, to: 2007, ready: true, sw: ['#1f56b8', '#ffffff', '#e86a00'] },
  { id: 'plano', name: l('Plano', 'Flat'), from: 2008, to: 2019, ready: true, sw: ['#00796b', '#f5f5f5', '#c63c10'] },
  { id: 'vidro', name: l('Vidro', 'Glass'), from: 2020, to: 2040, ready: true, sw: ['#2a2450', '#0c0a18', '#8ef0ff'] },
  { id: 'estudio', name: l('Estúdio (o de hoje)', 'Studio (today\'s look)'), from: 0, to: 0, ready: true, sw: ['#0f1d2a', '#edbc65', '#172b3c'] },
];
const BY_ID = new Map(SKINS31.map((s) => [s.id, s]));
export const skin31 = (id: SkinId31): Skin31 => BY_ID.get(id) ?? BY_ID.get('estudio')!;

/** Estilo da época de um ano (antes de 1889 = Gazeta; depois de 2040 = Vidro). Ano inválido = Estúdio. */
export function skinOfYear31(year: number): SkinId31 {
  if (!Number.isFinite(year)) return 'estudio';
  const eras = SKINS31.filter((s) => s.id !== 'estudio');
  if (year < eras[0].from) return eras[0].id;
  return (eras.find((s) => year >= s.from && year <= s.to) ?? eras[eras.length - 1]).id;
}

/** Lê a preferência guardada (quem tinha desligado o visual da época fica no Estúdio fixo). */
export function skinPref31(p: { skin31?: SkinPref31; eraSkin?: boolean }): SkinPref31 {
  if (p.skin31 === 'auto' || (p.skin31 && BY_ID.has(p.skin31))) return p.skin31;
  return p.eraSkin === false ? 'estudio' : 'auto';
}

/** Estilo efetivo: o da época (automático) ou o fixo; um estilo ainda não pronto cai no Estúdio. */
export function resolveSkin31(pref: SkinPref31, year: number): SkinId31 {
  const id = pref === 'auto' ? skinOfYear31(year) : pref;
  return skin31(id).ready ? id : 'estudio';
}

/** Avisar a troca? Só no automático, com o aviso ligado e quando o estilo efetivo realmente mudou durante a partida. */
export function skinNotice31(prev: SkinId31 | null, next: SkinId31, pref: SkinPref31, notify: boolean): boolean {
  return pref === 'auto' && notify && prev !== null && prev !== next;
}

/** Texto do aviso discreto de troca. */
export function skinNoticeText31(next: SkinId31): L {
  const s = skin31(next);
  const yrs = s.id === 'estudio' ? '' : ` (${s.from}–${s.to})`;
  return l(`Nova época: a interface passou ao estilo ${s.name.pt}${yrs}. Dá para fixar um estilo nas Opções.`,
    `New era: the interface switched to the ${s.name.en} style${yrs}. You can lock a style in Options.`);
}

/** Ação do aviso: voltar ao estilo anterior (fica fixo). */
export function skinBack31(prev: SkinId31): L {
  const s = skin31(prev);
  return l(`Voltar ao ${s.name.pt}`, `Back to ${s.name.en}`);
}

// ---------------------------------------------------------------- contraste: pares que precisam passar AA
/** Cor de um par: um token (`--ink`) ou uma mistura como o color-mix do CSS (p = 0..1 do primeiro). */
export type Ink31 = string | { mix: [string, number, string] };
/** `only`: o par só existe no Estúdio ('estudio') ou só nos estilos por época ('skins'); sem ele vale para todos. */
export interface Pair31 { fg: Ink31; bg: Ink31; what: string; min?: number; only?: 'estudio' | 'skins' }

/** Pares texto/fundo dos componentes principais (todos os temas e modos; min padrão 4,5). */
export const PAIRS31: Pair31[] = [
  { fg: '--ink', bg: '--bg', what: 'texto na página' },
  { fg: '--ink', bg: '--panel', what: 'texto no painel' },
  { fg: '--ink', bg: '--panel-2', what: 'texto em botão / painel-2' },
  { fg: '--ink', bg: '--input-bg', what: 'campos de formulário' },
  { fg: '--muted', bg: '--bg', what: 'texto de apoio na página' },
  { fg: '--muted', bg: '--panel', what: 'texto de apoio no painel' },
  { fg: '--muted', bg: '--panel-2', what: 'texto de apoio em painel-2' },
  { fg: '--accent', bg: '--panel', what: 'link / destaque no painel' },
  { fg: '--accent', bg: '--bg', what: 'link na página' },
  { fg: '--accent', bg: '--panel-2', what: 'destaque em painel-2' },
  { fg: '--accent-ink', bg: '--accent', what: 'botão primário / aba aberta' },
  { fg: '--gold', bg: '--panel', what: 'ouro (pioneiro, relíquia)' },
  { fg: '--good', bg: '--panel', what: 'bom no painel' },
  { fg: '--bad', bg: '--panel', what: 'ruim no painel' },
  { fg: '--warn', bg: '--panel', what: 'alerta no painel' },
  { fg: '--good', bg: '--panel-2', what: 'bom em painel-2' },
  { fg: '--bad', bg: '--panel-2', what: 'ruim em painel-2' },
  { fg: '--warn', bg: '--panel-2', what: 'alerta em painel-2' },
  { fg: '--good', bg: { mix: ['--good', 0.12, '--panel'] }, what: 'selo bom antigo' },
  { fg: '--bad', bg: { mix: ['--bad', 0.12, '--panel'] }, what: 'selo ruim antigo' },
  { fg: '--warn', bg: { mix: ['--warn', 0.12, '--panel'] }, what: 'selo alerta antigo' },
  { fg: '--t-good-fg', bg: '--t-good-bg', what: 'chip bom' },
  { fg: '--t-bad-fg', bg: '--t-bad-bg', what: 'chip ruim' },
  { fg: '--t-warn-fg', bg: '--t-warn-bg', what: 'chip alerta' },
  { fg: '--t-info-fg', bg: '--t-info-bg', what: 'chip informação' },
  { fg: '--t-accent-fg', bg: '--t-accent-bg', what: 'chip destaque' },
  { fg: '--t-neutral-fg', bg: '--t-neutral-bg', what: 'chip neutro' },
  { fg: '--t-good-fg', bg: '--panel', what: 'tom bom no painel' },
  { fg: '--t-bad-fg', bg: '--panel', what: 'tom ruim no painel' },
  { fg: '--t-warn-fg', bg: '--panel', what: 'tom alerta no painel' },
  { fg: '--on-tone', bg: '--good', what: 'texto sobre preenchimento bom' },
  { fg: '--on-tone', bg: '--bad', what: 'texto sobre preenchimento ruim' },
  { fg: '--on-tone', bg: '--warn', what: 'texto sobre preenchimento alerta' },
  { fg: '--nav-ink', bg: '--nav-bg', what: 'menu lateral' },
  { fg: '--nav-muted', bg: '--nav-bg', what: 'menu: utilitários' },
  { fg: '--nav-ink', bg: '--nav-hover', what: 'menu: item sob o mouse' },
  { fg: '--nav-on-ink', bg: '--nav-on', what: 'menu: item aberto preenchido' },
  { fg: '--nav-on', bg: { mix: ['--nav-on', 0.16, '--nav-bg'] }, what: 'menu: seção aberta', only: 'estudio' },
  { fg: '--nav-sel-ink', bg: '--nav-sel-bg', what: 'menu: seção aberta (estilo da época)', only: 'skins' },
  { fg: '--top-ink', bg: '--top-bg', what: 'barra do topo', only: 'skins' },
  { fg: '--top-muted', bg: '--top-bg', what: 'barra do topo: apoio', only: 'skins' },
  { fg: '--sk-pri-ink', bg: '--sk-pri-bg', what: 'botão principal (estilo da época)', only: 'skins' },
  { fg: '--muted', bg: '--panel-2', what: 'botão desabilitado (cinza sobre painel-2)', only: 'skins' },
  { fg: '--warn', bg: '--bg', what: 'motivo do bloqueio na página' },
  { fg: '--focus', bg: '--bg', what: 'anel de foco na página', min: 3, only: 'skins' },
  { fg: '--focus', bg: '--panel', what: 'anel de foco no painel', min: 3, only: 'skins' },
  { fg: '--ink', bg: { mix: ['--panel-2', 0.8, '--accent'] }, what: 'botão sob o mouse' },
  { fg: '--brand-cream', bg: '--brand-night', what: 'tela inicial: título' },
  { fg: '--brand-mist', bg: '--brand-night', what: 'tela inicial: descrição' },
  { fg: '--brand-ink', bg: '--brand-gold', what: 'tela inicial: botão principal' },
];
