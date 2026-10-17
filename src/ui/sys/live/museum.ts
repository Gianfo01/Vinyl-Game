// Museu do selo: sala em pixel art com discos de ouro e troféus, capas icônicas, certificações,
// instrumentos de lendas, Hall dos Ecos e a linha do tempo da run.

import { l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import type { GameState, Person } from '../../../sim/types';
import { N, actLink, cover, section } from '../../common';
import { h } from '../../dom';
import { C, Px, discV, inked, lv, rectV, volume } from '../../pixel/px';
import { chips, stat } from '../../vis';
import { relicImg28, roleImg28 } from '../../pixel/relic28'; // r28 (arte): discos emoldurados e instrumentos desenhados
import { relics } from '../../../sim/sys/relics9';
import { relic29Pills, relicBrowser29 } from '../relics29';

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

/** Parede do museu no estilo das salas da onda 5: papel de parede em rampa, rodapé e piso de tábuas, quadros dos discos
 *  de ouro/platina e troféus em volume (luz de cima à esquerda, contorno escuro quente). */
function hallCanvas(gold: number, platinum: number, awards: number): HTMLCanvasElement {
  const W = 192;
  const H = 64;
  const p = new Px(W, H);
  const wall = C('#5a3a4a');
  for (let y = 0; y < 42; y++) for (let x = 0; x < W; x++) p.set(x, y, (x >> 3) % 2 ? lv(wall, 3) : lv(wall, 2.6));
  rectV(p, 0, 40, W, 4, C('#6a3a22'));
  for (let y = 44; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, (x + (y % 2 ? 0 : 5)) % 12 === 0 ? C('#5e3a1e') : y === 44 ? C('#a8743e') : C('#8a6034'));
  const discs = Math.min(14, gold + platinum);
  for (let i = 0; i < discs; i++) {
    const x = 10 + i * 13;
    inked(p, (q) => { rectV(q, x - 5, 7, 11, 15, C('#3a2430')); discV(q, x, 14, 4, i < platinum ? C('#d8dce8') : C('#f0c040'), { spec: true }); });
    p.put(x, 14, C('#2a1a20'));
  }
  const tro = Math.min(10, awards);
  for (let i = 0; i < tro; i++) {
    const x = 14 + i * 17;
    inked(p, (q) => {
      rectV(q, x - 6, 34, 13, 5, C('#3a2430'));
      rectV(q, x - 1, 28, 3, 6, C('#f0c040'), { spec: true });
      volume(q, x - 4, 22, 9, 7, (xx, yy) => (xx + 0.5 - x) ** 2 / 16 + (yy + 0.5 - 22) ** 2 / 36 <= 1, C('#f0c040'), { spec: true, r: 2 });
    });
  }
  if (!discs && !tro) for (let i = 0; i < 5; i++) inked(p, (q) => rectV(q, 16 + i * 36, 10, 16, 18, C('#3a2430'), { bias: -1 }));
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
  const vault = relics(s).list.filter((x) => x.st === 'player' || x.brw).sort((a, b) => b.v - a.v);
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
    section(t(l('Discos de ouro e platina', 'Gold and platinum records')), certified.length ? h('ul', { class: 'lv-certs' }, certified.map((r) => h('li', null, relicImg28('goldrec', r.certified === 'gold' ? 'gold record' : 'platinum record', r.year, r.id, 24), ' ', h('b', null, r.title), ` · ${r.year} · `, actLink(s, r.actId), ` · ${t(r.certified === 'gold' ? l('ouro', 'gold') : r.certified === 'platinum' ? l('platina', 'platinum') : l('diamante', 'diamond'))}`)))
      : h('p', { class: 'muted small' }, t(l('Nenhuma certificação ainda.', 'No certifications yet.')))),
    section(t(l('Instrumentos de lendas', 'Legends\' instruments')), legends.length ? h('div', { class: 'cards' }, legends.map((a) => h('div', { class: 'tile' }, h('div', { class: 'tile-body' }, actLink(s, a.id),
      h('small', null, ...a.members.map((id) => s.persons[id]).filter(Boolean).flatMap((p, i) => [i ? ' · ' : '', roleImg28(p.role, a.formed, p.id, 24), ` ${t(l('{i} de {p}', '{p}\'s {i}'), { i: INSTRUMENT[p.role]?.name ?? l('instrumento', 'instrument'), p: p.name })}`]))))))
      : h('p', { class: 'muted small' }, t(l('Quando seus artistas virarem lendas, os instrumentos deles vêm para cá.', 'When your acts become legends, their instruments come here.')))),
    // R29: as relíquias do acervo (as procedurais com arquétipo, estado e procedência); expor rende prestígio e visitantes
    vault.length ? section(t(l('Relíquias do acervo', 'Relics in the collection')), relicBrowser29(s, 'museu:vault', vault, (rl) => h('li', null, relicImg28(rl.k, rl.n.en, rl.y, rl.rr ?? rl.id, 24), ' ', h('b', null, t(rl.n)),
      ` · ${rl.y}${rl.ex ? ` · ${t(l('exposta', 'on show'))}` : ''} `, relic29Pills(s, rl)), { size: 12, owners: false, wrap: (kids) => h('ul', { class: 'lv-certs' }, ...kids) })) : null,
    hall.length ? section(t(l('Hall dos Ecos', 'Hall of Echoes')), h('ul', null, hall.map((x) => h('li', null, `🏛 ${x.year} · `, actLink(s, x.actId))))) : null,
    section(t(l('Linha do tempo', 'Timeline')), Object.keys(byYear).length ? h('ol', { class: 'lv-timeline' }, Object.entries(byYear).map(([y, list]) => h('li', null, h('b', null, y), h('ul', null, list.map((m) => h('li', { class: 'small' }, t(m.text)))))))
      : h('p', { class: 'muted small' }, t(l('A história da run aparece aqui.', 'The run\'s story appears here.')))),
  );
}
