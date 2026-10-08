// Atributos de uma composição em linguagem clara (rodada 7): cada nota de 0 a 100 com barra, conceito
// (A–E) e o que ela influencia; substitui as mini-barras sem rótulo e o antigo botão de ouvir.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import { songProfile } from '../sim/repertoire';
import type { Song } from '../sim/types';
import { h } from './dom';

export const grade = (v: number): string => (v >= 80 ? 'A' : v >= 65 ? 'B' : v >= 50 ? 'C' : v >= 35 ? 'D' : 'E');

const ATTRS: { key: keyof Song; name: L; what: L; recorded?: boolean }[] = [
  { key: 'melody', name: l('Melodia', 'Melody'), what: l('refrão, gancho e acessibilidade', 'chorus, hook and accessibility') },
  { key: 'lyrics', name: l('Letra', 'Lyrics'), what: l('crítica e durabilidade no catálogo', 'critics and catalog durability') },
  { key: 'originality', name: l('Originalidade', 'Originality'), what: l('crítica e prestígio; demais afasta o rádio', 'critics and prestige; too much scares radio') },
  { key: 'performance', name: l('Interpretação', 'Performance'), what: l('gravação: voz e instrumentos', 'recording: vocals and instruments'), recorded: true },
  { key: 'production', name: l('Produção', 'Production'), what: l('gravação: som e mixagem', 'recording: sound and mix'), recorded: true },
];

export function songAttrs(so: Song, opts: { compact?: boolean; fuzzy?: boolean } = {}): HTMLElement {
  const show = (v: number) => (opts.fuzzy ? `~${Math.round(v / 10) * 10}` : String(Math.round(v)));
  const p = songProfile(so);
  const row = (name: L, v: number, what: L | null, cls = '') => h('div', { class: `sa-row ${cls}` },
    h('span', { class: 'sa-name' }, t(name)),
    h('span', { class: 'sa-bar' }, h('span', { style: `width:${Math.max(2, Math.min(100, v))}%` })),
    h('b', { class: `sa-val g${grade(v)}` }, show(v), ' ', h('small', null, grade(v))),
    !opts.compact && what ? h('small', { class: 'muted sa-what' }, t(what)) : null);
  return h('div', { class: `song-attrs ${opts.compact ? 'compact' : ''}` },
    row(l('Qualidade geral (Q)', 'Overall quality (Q)'), so.q, l('média ponderada; decide vendas e críticas', 'weighted average; drives sales and reviews'), 'sa-q'),
    ...ATTRS.filter((a) => !a.recorded || so.recorded).map((a) => row(a.name, Number(so[a.key]) || 0, a.what)),
    !so.recorded ? h('small', { class: 'muted' }, t(l('Interpretação e produção aparecem depois da gravação.', 'Performance and production appear after recording.'))) : null,
    row(l('Gancho', 'Hook'), p.hook, l('força como single', 'strength as a single'), 'sa-derived'),
    row(l('Acessibilidade', 'Accessibility'), p.access, l('chance no rádio e playlists', 'radio and playlist chance'), 'sa-derived'),
    row(l('Durabilidade', 'Durability'), p.durability, l('vendas de catálogo por anos', 'catalog sales for years'), 'sa-derived'),
  );
}
