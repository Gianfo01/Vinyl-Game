// Rodada 18 (art18) — interface da trajetória artística (aba "Trajetória artística" no artista: assinatura sonora,
// temas, eras, parcerias com produtores, expectativa, experimentar × repetir, palco × estúdio, discografia como
// causa e efeito) e da qualidade em dimensões (bloco no disco; sequência e produtor certo no projeto).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Act, GameState, Release } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { canSee } from '../../sim/sys/fame15';
import { DIRS, proj12 } from '../../sim/sys/project12';
import { setProjectSongs, type MusicProject } from '../../sim/sys/project8';
import { DIM18, DIMS18, bestOrder18, bestProducer18, dims18, prodDef18, prodFit18, profileLine18, sequence18, type Dim18 } from '../../sim/sys/quality18';
import { ERA18, OUT18, REACT18, themeName18, trajView18, suggestDir18, traj18 } from '../../sim/sys/traj18';
import { timbreById } from '../../sim/sys/sound/timbre';
import { pill, releaseLink, rerender, section, toast } from '../common';
import { bar, h } from '../dom';
import { why18, whyIcon } from '../explain18';
import { RELEASE_EXTRAS } from '../ficha';
import { ACT_TABS } from '../pages';
import { ic } from '../vis';
import { PROJ_TRACK_EXTRAS18 } from './project8';
import './art18.css';

const L2 = (x: L) => t(x);
const row = (label: L | string, ...v: (Node | string | null)[]) => h('div', { class: 'art18-row' }, h('span', { class: 'art18-k' }, typeof label === 'string' ? label : L2(label)), h('span', { class: 'art18-v' }, ...v));
const meter = (s: GameState, label: L, v: number | null, key: string, ctx: Record<string, unknown>, cls = '') =>
  row(label, v === null ? h('span', { class: 'muted' }, '—') : why18(s, key, ctx, bar(v, 100, cls), ' ', String(v)));

function profilePhrase(v: Record<Dim18, number>): string {
  const p = profileLine18(v);
  return t(fmtL(l('forte em {a} e {b}; fraco em {c}', 'strong on {a} and {b}; weak on {c}'), { a: DIM18[p.hi[0]].name, b: DIM18[p.hi[1]].name, c: DIM18[p.lo].name }));
}

// ------------------------------------------------------------------ aba do artista

function trajTab(s: GameState, a: Act): HTMLElement {
  const v = trajView18(s, a);
  const priv = v.mine || canSee(s, a.id, 'traits');
  const top: HTMLElement[] = [];
  top.push(row(l('Assinatura sonora', 'Sound signature'), v.sig ? h('span', null, ...v.sig.tags.map((x) => pill(L2(x))), ' ', why18(s, 'traj.sig', {}, t(l('consolidação', 'consolidation')), ' ', bar(v.sig.cons, 100), ` ${v.sig.cons}%`), v.sig.tm.length ? h('small', { class: 'muted' }, ` · ${t(l('timbres de marca', 'trademark timbres'))}: ${v.sig.tm.map((x) => t(timbreById[x]?.name ?? l(x))).join(', ')}`) : null) : h('span', { class: 'muted' }, t(l('ainda sem discos', 'no records yet')))));
  top.push(row(l('Temas recorrentes', 'Recurring themes'), v.themes.length ? h('span', null, ...v.themes.map((x) => pill(`${t(themeName18(x.id))}${x.n ? ` ×${x.n}` : ''}${x.lived ? ` · ${t(l('vivido', 'lived'))}` : ''}`, x.lived ? 'gold' : ''))) : h('span', { class: 'muted' }, '—')));
  top.push(row(l('Parcerias com produtores', 'Producer partnerships'), v.prods.length ? h('span', { class: 'art18-prods' }, ...v.prods.slice(0, 4).map((p) => h('span', { class: 'art18-prod' }, why18(s, 'q18.prod', { act: a.id, pr: p.id }, `${p.name} (${p.n}× · ${t(l('química', 'chemistry'))} `, bar(p.chem, 100, p.chem >= 60 ? 'good' : ''), ` ${p.chem})`)))) : h('span', { class: 'muted' }, t(l('autoproduzido', 'self-produced')))));
  const meters = h('div', { class: 'art18-meters' },
    meter(s, l('Expectativa', 'Expectations'), v.expect, 'traj.expect', { act: a.id }, v.expect >= 70 ? 'bad' : ''),
    priv ? meter(s, l('Desejo de experimentar', 'Urge to experiment'), v.exp, 'traj.exp', { act: a.id }) : null,
    v.pres !== null ? meter(s, l('Pressão para repetir o hit', 'Pressure to repeat the hit'), v.pres, 'traj.exp', { act: a.id }, v.pres >= 60 ? 'bad' : '') : null,
    priv && v.conf !== null ? meter(s, l('Confiança', 'Confidence'), v.conf, 'traj.exp', { act: a.id }, v.conf < 35 ? 'bad' : '') : null,
    meter(s, l('Reputação de palco', 'Live reputation'), v.stage, 'traj.rep', { act: a.id }),
    meter(s, l('Reputação de estúdio (crítica)', 'Studio reputation (critics)'), v.studio, 'traj.rep', { act: a.id }),
  );
  const now: HTMLElement[] = [];
  if (v.react) now.push(h('p', null, pill(t(REACT18[v.react].name), v.react === 'shaken' ? 'bad' : v.react === 'reinvent' ? 'gold' : ''), ' ', h('small', null, t(REACT18[v.react].fx))));
  if (v.mine && priv) now.push(h('p', { class: 'small' }, t(fmtL(l('Direção sugerida para o próximo disco: {d}.', 'Suggested direction for the next record: {d}.'), { d: DIRS[suggestDir18(s, a)].name })), ' ', whyIcon(s, 'traj.exp', { act: a.id })));
  if (v.cult) now.push(h('p', { class: 'small' }, pill(t(l('história de disco cult em andamento', 'cult-record story in progress')), 'gold')));
  const eras = v.eras.length ? h('ol', { class: 'art18-tl' }, ...v.eras.map((e) => h('li', { class: `art18-era k-${e.k}` }, h('b', null, `${e.y} · ${t(ERA18[e.k])}`), h('span', null, ' ', t(e.t)), e.rel && s.releases[e.rel] ? h('span', null, ' ', releaseLink(s, e.rel)) : null))) : h('p', { class: 'muted' }, t(l('A carreira ainda não tem viradas.', 'The career has no turning points yet.')));
  const rels = a.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r && !r.reissueOf && !r.hist && r.kind !== 'compilation').sort((x, y) => x.week - y.week).slice(-10);
  const outOf = new Map(v.outs.map((x) => [x.rel.id, x.o]));
  const disco = rels.length ? h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, h('th', null, t(l('Ano', 'Year'))), h('th', null, t(l('Disco', 'Record'))), h('th', null, 'Q'), h('th', null, t(l('Crítica', 'Critics'))), h('th', null, t(l('Perfil', 'Profile'))), h('th', null, t(l('Resultado', 'Outcome'))))),
    h('tbody', null, ...rels.map((r) => {
      const d = r.songs.length && s.songs[r.songs[0]] ? dims18(s, r) : null;
      const o = outOf.get(r.id);
      return h('tr', null, h('td', null, String(r.year)), h('td', null, releaseLink(s, r.id)), h('td', null, d ? why18(s, 'q18.rel', { rel: r.id }, String(Math.round(r.q))) : String(Math.round(r.q))), h('td', null, r.critic !== undefined ? String(r.critic) : '—'),
        h('td', null, d ? h('small', null, profilePhrase(d)) : '—'), h('td', null, o ? pill(t(OUT18[o]), o === 'hit' || o === 'cult' ? 'good' : o === 'flop' ? 'bad' : '') : '—'));
    }))) : null;
  return h('div', { class: 'art18' },
    h('p', { class: 'muted small' }, t(l('Cada disco muda o próximo: o resultado (contra a previsão e a crítica) vira expectativa, pressão ou reação — decidida pelo jeito do líder.', 'Each record changes the next: the result (against forecast and critics) becomes expectations, pressure or a reaction — decided by the leader\'s temperament.'))),
    section(t(l('Identidade', 'Identity')), ...top),
    section(t(l('Momento da carreira', 'Career moment')), meters, ...now),
    section(t(l('Eras', 'Eras')), eras),
    disco ? section(t(l('Discografia: causa e efeito', 'Discography: cause and effect')), disco) : null,
  );
}

ACT_TABS.push((s, a) => {
  const mine = a.owner === 'player' || !!a.playerBand;
  if (!a.releases.length && !mine) return null;
  if (!mine && !canSee(s, a.id, 'bio')) return null;
  return { id: 'traj18', label: l('Trajetória artística', 'Artistic trajectory'), icon: 'disc', render: () => trajTab(s, a) };
});

// ------------------------------------------------------------------ disco: qualidade em dimensões

RELEASE_EXTRAS.push((s, r) => {
  if (r.reissueOf || r.hist || !r.songs.length || !s.songs[r.songs[0]]) return null;
  const v = dims18(s, r);
  if (!v) return null;
  return section(t(l('Qualidade em dimensões', 'Quality by dimension')),
    h('p', { class: 'small' }, why18(s, 'q18.rel', { rel: r.id }, t(fmtL(l('Q geral {q} (resumo) — {p}.', 'Overall Q {q} (summary) — {p}.'), { q: Math.round(r.q), p: profilePhrase(v) }))), ' ', why18(s, 'q18.use', { rel: r.id }, ic('bulb'), ' ', t(l('o que isso fez', 'what it did')))),
    h('div', { class: 'art18-dims' }, ...DIMS18.filter((d) => v[d] >= 0).map((d) => h('div', { class: 'art18-dim' }, h('span', { class: 'art18-k' }, t(DIM18[d].name)), why18(s, 'q18.dim', { rel: r.id, d }, bar(v[d], 100, v[d] >= 70 ? 'good' : v[d] < 40 ? 'bad' : ''), ` ${v[d]}`)))),
  );
});

// ------------------------------------------------------------------ projeto: sequência, produtor, direção

PROJ_TRACK_EXTRAS18.push((s: GameState, p: MusicProject, locked: boolean) => {
  const act = s.acts[p.actId];
  if (!act || !p.songIds.length) return null;
  const sq = sequence18(s, p.songIds);
  const best = bestOrder18(s, p.songIds);
  const same = best.join() === p.songIds.join();
  const pr = prodDef18(p.producerId);
  const fit = pr ? prodFit18(s, act, pr) : null;
  const pl = proj12(s).meta[p.id];
  const tr = traj18(s, act.id);
  const sug = suggestDir18(s, act);
  return h('fieldset', { class: 'art18-proj' }, h('legend', null, t(l('Repertório, sequência e produtor', 'Repertoire, sequencing and producer'))),
    p.songIds.length >= 3 ? h('div', { class: 'row wrap' }, why18(s, 'q18.seq', { ids: p.songIds.join(',') }, t(l('Sequência', 'Sequencing')), ' ', bar(sq.v, 100, sq.v >= 70 ? 'good' : sq.v < 45 ? 'bad' : ''), ` ${sq.v}`),
      !locked && !same ? h('button', { class: 'btn small', onclick: () => { setProjectSongs(s, p, best); toast(t(l('Faixas reordenadas: abertura, melhor faixa cedo, fecho que fica.', 'Tracks reordered: opener, best song early, a closer that lingers.')), 'info'); rerender(); } }, t(fmtL(l('Ordenar faixas (sequência {v})', 'Reorder tracks (sequencing {v})'), { v: sequence18(s, best).v }))) : null) : null,
    h('div', { class: 'row wrap' },
      fit && pr ? why18(s, 'q18.prod', { act: act.id, pr: pr.id }, t(fmtL(l('{p} para este projeto: {v}', '{p} for this project: {v}'), { p: pr.name, v: fit.score > 0 ? `+${fit.score}` : String(fit.score) }))) : h('span', { class: 'muted small' }, t(l('Sem produtor de fora: a equipe da casa produz.', 'No outside producer: the in-house team produces.'))),
      !locked ? h('button', { class: 'btn small', onclick: () => { const b = bestProducer18(s, act, Math.max(1, p.songIds.length), s.player.cash * 0.15); p.producerId = b; toast(t(b ? fmtL(l('Sugerido: {p}.', 'Suggested: {p}.'), { p: prodDef18(b)?.name ?? b }) : l('Nenhum produtor de fora vale o custo aqui.', 'No outside producer is worth the cost here.')), 'info'); rerender(); } }, t(l('Sugerir produtor para o projeto', 'Suggest a producer for the project'))) : null),
    h('p', { class: 'muted small' }, t(l('Produtor famoso: mais técnica e polimento (caro; tira a crueza de gêneros crus). Produtor da cena: entende o som local. A química cresce a cada disco juntos.', 'Star producer: more technique and polish (expensive; strips the rawness from raw genres). Scene producer: gets the local sound. Chemistry grows with each record together.'))),
    tr && pl ? h('p', { class: 'small' }, t(fmtL(l('Desejo de experimentar {e} · pressão do hit {p} → direção que o artista quer: {d}{x}.', 'Urge to experiment {e} · hit pressure {p} → direction the act wants: {d}{x}.'), { e: Math.round(tr.exp), p: Math.round(tr.pres), d: DIRS[sug].name, x: pl.dir === sug ? l(' (igual à escolhida)', ' (matches your choice)') : l(' (diferente da escolhida: pode custar emoção)', ' (differs from yours: may cost emotion)') })), ' ', whyIcon(s, 'traj.exp', { act: act.id })) : null,
  );
});
