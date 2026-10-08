// Museu do selo: sala em pixel art com discos de ouro e troféus, capas icônicas, certificações,
// instrumentos de lendas, Hall dos Ecos e a linha do tempo da run.

import { l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import type { GameState, Person } from '../../../sim/types';
import { N, actLink, cover, section } from '../../common';
import { h } from '../../dom';
import { C, Px } from '../../pixel/px';
import { chips, stat } from '../../vis';

const INSTRUMENT: Record<Person['role'], { icon: string; name: { pt: string; en: string } }> = {
  vocal: { icon: '🎤', name: l('microfone', 'microphone') },
  guitar: { icon: '🎸', name: l('guitarra', 'guitar') },
  bass: { icon: '🎸', name: l('baixo', 'bass') },
  drums: { icon: '🥁', name: l('bateria', 'drum kit') },
  keys: { icon: '🎹', name: l('teclado', 'keyboard') },
  horns: { icon: '🎺', name: l('trompete', 'trumpet') },
  dj: { icon: '🎚', name: l('toca-discos', 'turntables') },
  producer: { icon: '🎛', name: l('mesa de som', 'mixing desk') },
  mc: { icon: '🎙', name: l('microfone de MC', 'MC mic') },
  strings: { icon: '🎻', name: l('violino', 'violin') },
  synthetic: { icon: '💠', name: l('núcleo neural', 'neural core') },
};

function hallCanvas(gold: number, platinum: number, awards: number): HTMLCanvasElement {
  const W = 192;
  const H = 64;
  const p = new Px(W, H);
  p.rect(0, 0, W, 44, C('#5a3a4a'));
  for (let x = 0; x < W; x += 12) p.vline(x, 0, 43, C('#4e3240'));
  p.rect(0, 44, W, 20, C('#8a6034'));
  for (let x = 0; x < W; x += 8) p.vline(x, 44, 63, C('#7a5228'));
  p.rect(0, 42, W, 2, C('#3a2430'));
  const discs = Math.min(14, gold + platinum);
  for (let i = 0; i < discs; i++) {
    const x = 10 + i * 13;
    p.rect(x - 5, 8, 11, 14, C('#2a1a20'));
    p.disc(x, 15, 4, i < platinum ? C('#d8dce8') : C('#f0c040'));
    p.put(x, 15, C('#2a1a20'));
  }
  const tro = Math.min(10, awards);
  for (let i = 0; i < tro; i++) {
    const x = 14 + i * 17;
    p.rect(x - 6, 34, 13, 4, C('#3a2430'));
    p.rect(x - 1, 28, 3, 6, C('#f0c040'));
    p.rect(x - 3, 25, 7, 3, C('#f0c040'));
  }
  if (!discs && !tro) for (let i = 0; i < 5; i++) p.rect(16 + i * 36, 10, 16, 18, C('#3a2430'));
  return p.canvas();
}

export function museumView(s: GameState): HTMLElement {
  const st = s.player.stats;
  const mine = Object.values(s.releases).filter((r) => r.owner === 'player' || s.acts[r.actId]?.playerBand);
  const iconic = mine.slice().sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 8).filter((r) => r.totalUnits > 0);
  const certified = mine.filter((r) => r.certified).sort((a, b) => b.year - a.year).slice(0, 20);
  const legends = Object.values(s.acts).filter((a) => (a.owner === 'player' || a.playerBand) && (a.legend || s.hallOfFame.some((x) => x.actId === a.id) || a.number1s > 0)).slice(0, 8);
  const hall = s.hallOfFame.filter((x) => s.acts[x.actId]?.owner === 'player' || s.acts[x.actId]?.playerBand);
  const timeline = s.memory.filter((m) => m.important).slice(-40);
  const byYear: Record<number, typeof timeline> = {};
  for (const m of timeline) (byYear[m.year] ??= []).push(m);
  const canvas = hallCanvas(st.gold, st.platinum, st.awards);
  canvas.classList.add('px', 'lv-museum-hall');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', t(l('Sala do museu com {g} discos na parede e {a} troféus', 'Museum hall with {g} records on the wall and {a} trophies'), { g: st.gold + st.platinum, a: st.awards }));
  return h('div', { class: 'lv-museum' },
    canvas,
    chips(stat('disc', st.releases, l('Lançamentos', 'Releases')), stat('star', st.number1s, l('Números 1', 'Number 1s')), stat('chart-up', st.top10s, l('Top 10', 'Top 10s')),
      stat('gold-disc', st.gold, l('Ouro', 'Gold')), stat('platinum-disc', st.platinum, l('Platina', 'Platinum')), stat('trophy', st.awards, l('Prêmios', 'Awards')), stat('flag', st.festivals, l('Festivais', 'Festivals'))),
    section(t(l('Capas icônicas', 'Iconic covers')), iconic.length ? h('div', { class: 'lv-covers' }, iconic.map((r) => h('figure', null, cover(s, r, 96), h('figcaption', null, h('b', null, r.title), h('small', null, ` ${r.year} · ${N(r.totalUnits)}`), actLink(s, r.actId)))))
      : h('p', { class: 'muted small' }, t(l('As capas dos seus discos mais vendidos aparecem aqui.', 'Covers of your best-selling records appear here.')))),
    section(t(l('Discos de ouro e platina', 'Gold and platinum records')), certified.length ? h('ul', { class: 'lv-certs' }, certified.map((r) => h('li', null, r.certified === 'gold' ? '🟡' : '⚪', ' ', h('b', null, r.title), ` · ${r.year} · `, actLink(s, r.actId), ` · ${t(r.certified === 'gold' ? l('ouro', 'gold') : r.certified === 'platinum' ? l('platina', 'platinum') : l('diamante', 'diamond'))}`)))
      : h('p', { class: 'muted small' }, t(l('Nenhuma certificação ainda.', 'No certifications yet.')))),
    section(t(l('Instrumentos de lendas', 'Legends\' instruments')), legends.length ? h('div', { class: 'cards' }, legends.map((a) => h('div', { class: 'tile' }, h('div', { class: 'tile-body' }, actLink(s, a.id),
      h('small', null, a.members.map((id) => s.persons[id]).filter(Boolean).map((p) => `${INSTRUMENT[p.role]?.icon ?? '🎵'} ${t(l('{i} de {p}', '{p}\'s {i}'), { i: INSTRUMENT[p.role]?.name ?? l('instrumento', 'instrument'), p: p.name })}`).join(' · '))))))
      : h('p', { class: 'muted small' }, t(l('Quando seus artistas virarem lendas, os instrumentos deles vêm para cá.', 'When your acts become legends, their instruments come here.')))),
    hall.length ? section(t(l('Hall dos Ecos', 'Hall of Echoes')), h('ul', null, hall.map((x) => h('li', null, `🏛 ${x.year} · `, actLink(s, x.actId))))) : null,
    section(t(l('Linha do tempo', 'Timeline')), Object.keys(byYear).length ? h('ol', { class: 'lv-timeline' }, Object.entries(byYear).map(([y, list]) => h('li', null, h('b', null, y), h('ul', null, list.map((m) => h('li', { class: 'small' }, t(m.text)))))))
      : h('p', { class: 'muted small' }, t(l('A história da run aparece aqui.', 'The run\'s story appears here.')))),
  );
}
