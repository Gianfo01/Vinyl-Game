// Retrospectiva (rodada 8): aba no Catálogo que conta a história da run — discos por era com capas,
// marcos, hits e certificados, prêmios, maiores apostas, artistas que passaram pelo selo, rompimentos e
// reencontros, e a influência nas cenas e nos gêneros.

import './project8.css';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { retrospective, type RetroEra } from '../../sim/sys/retro8';
import type { GameState, Release } from '../../sim/types';
import { $, N, actLink, cityName, cover, genreName, logo, pill, section, statusName } from '../common';
import { bar, h } from '../dom';
import { openRelease } from '../ficha';
import { registerTab } from '../registry';
import { chips, stat } from '../vis';

const CERT: Record<string, ReturnType<typeof l>> = { gold: l('Ouro', 'Gold'), platinum: l('Platina', 'Platinum'), diamond: l('Diamante', 'Diamond') };

function coverTile(s: GameState, r: Release): HTMLElement {
  return h('button', { class: 'rt-cover', title: `${r.title} (${r.year})`, onclick: () => openRelease(r.id) },
    cover(s, r, 96),
    h('b', null, r.title),
    h('small', { class: 'muted' }, `${s.acts[r.actId]?.name ?? '—'} · ${r.year}`),
    h('span', null, r.certified ? pill(t(CERT[r.certified]), 'gold') : null, r.peak <= 10 ? pill(`#${r.peak}`, 'good') : null, r.hist ? pill(t(l('antes da run', 'pre-run'))) : null));
}

function eraBlock(s: GameState, e: RetroEra): HTMLElement {
  const list = e.releases.slice().sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 36).sort((a, b) => a.week - b.week);
  return h('div', { class: 'rt-era' },
    h('h3', null, t(e.name)),
    h('div', { class: 'muted small' }, t(l('{n} lançamentos · {u} unidades · {r} · {c} certificados · {a} prêmios', '{n} releases · {u} units · {r} · {c} certifications · {a} awards'), { n: e.releases.length, u: N(e.units), r: $(e.revenue), c: e.certs, a: e.awards }),
      e.best ? h('span', null, ' · ', t(l('maior sucesso: ', 'biggest hit: ')), h('b', null, e.best.title)) : null),
    h('div', { class: 'rt-covers' }, list.map((r) => coverTile(s, r))),
    e.releases.length > list.length ? h('p', { class: 'muted small' }, t(l('…e mais {n}.', '…and {n} more.'), { n: e.releases.length - list.length })) : null);
}

function retroTab(s: GameState): HTMLElement {
  const rt = retrospective(s);
  if (!rt.eras.length) return section(t(l('Retrospectiva', 'Retrospective')), h('p', { class: 'muted' }, t(l('A história começa no primeiro lançamento. Volte aqui depois dos primeiros discos.', 'The story starts with the first release. Come back after the first records.'))));
  const T = rt.totals;
  return h('div', { class: 'panel retro' },
    section(t(l('Retrospectiva {a}–{b}', 'Retrospective {a}–{b}'), { a: rt.years[0], b: rt.years[1] }),
      h('div', { class: 'rt-head' }, chips(
        stat('disc', T.releases, l('Lançamentos', 'Releases')), stat('chart-up', N(T.units), l('Unidades', 'Units')), stat('bank', $(T.revenue), l('Receita', 'Revenue')),
        stat('trophy', T.no1, l('Números 1', 'Number ones')), stat('star', T.top10, l('Top 10', 'Top 10')), stat('disc', T.certs, l('Certificados', 'Certifications')),
        stat('trophy', T.awards, l('Prêmios', 'Awards')), stat('fans', T.acts, l('Artistas', 'Acts')))),
      rt.milestones.length ? h('ol', { class: 'rt-timeline' }, rt.milestones.map((m) => h('li', null, h('b', null, `${m.year} · ${t(m.label)}`), ' — ',
        m.releaseId && s.releases[m.releaseId] ? h('a', { href: '#', onclick: (e: Event) => { e.preventDefault(); openRelease(m.releaseId!); } }, s.releases[m.releaseId].title) : null,
        m.actId ? h('span', null, ' · ', actLink(s, m.actId)) : null))) : null,
    ),
    section(t(l('Discos por era', 'Records by era')), ...rt.eras.slice().reverse().map((e) => eraBlock(s, e))),
    rt.hits.length || rt.awards.length ? section(t(l('Hits, certificados e prêmios', 'Hits, certifications and awards')),
      rt.hits.length ? h('div', { class: 'rt-covers' }, rt.hits.map((r) => coverTile(s, r))) : null,
      rt.awards.length ? h('ul', { class: 'rt-stories' }, rt.awards.slice(0, 30).map((a) => h('li', { class: 'reunion' }, `${a.year} · ${a.name}`, a.actId ? h('span', null, ' · ', actLink(s, a.actId)) : null, a.releaseId && s.releases[a.releaseId] ? ` · "${s.releases[a.releaseId].title}"` : ''))) : null,
    ) : null,
    rt.bets.length ? section(t(l('Maiores apostas', 'Biggest bets')),
      h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, t(l('Disco', 'Record'))), h('th', null, t(l('Ano', 'Year'))), h('th', null, t(l('Divulgação', 'Promotion'))), h('th', null, t(l('Receita', 'Revenue'))), h('th', null, t(l('Retorno', 'Return'))), h('th', null, ''))),
        h('tbody', null, rt.bets.map((b) => h('tr', { class: 'clickable', onclick: () => openRelease(b.rel.id) },
          h('td', null, cover(s, b.rel, 32)), h('td', null, b.rel.title, ' · ', actLink(s, b.rel.actId)), h('td', null, b.rel.year), h('td', null, $(b.spend)), h('td', null, $(b.rel.revenue)),
          h('td', null, `×${b.roi.toFixed(1)}`), h('td', null, b.hit ? pill(t(l('acertou', 'paid off')), 'good') : pill(t(l('não pagou', 'missed')), 'bad'))))))) : null,
    section(t(l('Artistas que passaram pelo selo', 'Acts who passed through the label')),
      h('div', { class: 'rt-alumni' }, rt.alumni.map((a) => {
        const act = s.acts[a.actId];
        return h('div', { class: 'rt-alum' }, act ? logo(act, 44) : h('span'),
          h('div', null, actLink(s, a.actId), ' ', a.current ? pill(t(l('no elenco', 'on roster')), 'good') : pill(a.status === 'deceased' ? t(l('falecido', 'deceased')) : statusName(a.status)),
            h('div', { class: 'muted small' }, `${a.from}–${a.to ?? t(l('hoje', 'now'))} · ${a.releases} ${t(l('discos', 'records'))} · ${N(a.units)} ${t(l('unid.', 'units'))}`),
            a.best ? h('div', { class: 'small' }, t(l('Destaque: ', 'Highlight: ')), h('a', { href: '#', onclick: (e: Event) => { e.preventDefault(); openRelease(a.best!.id); } }, a.best.title)) : null));
      }))),
    rt.stories.length ? section(t(l('Rompimentos e reencontros', 'Breakups and reunions')),
      h('ul', { class: 'rt-stories' }, rt.stories.map((x) => h('li', { class: x.kind }, h('b', null, `${x.year} `), x.kind === 'broken' ? '💔 ' : '🤝 ', t(x.text))))) : null,
    rt.genres.length ? section(t(l('Influência nas cenas e nos gêneros', 'Influence on scenes and genres')),
      h('p', { class: 'muted small' }, t(l('Participação de cada gênero nas vendas do selo e a popularidade atual dele no mercado.', 'Each genre\'s share of the label\'s sales and its current market popularity.'))),
      ...rt.genres.slice(0, 8).map((g) => h('div', { class: 'rt-genre' }, h('span', null, genreName(g.genre)), bar(g.share * 100, 100, 'good'), h('small', null, `${Math.round(g.share * 100)}% · ×${(s.genrePop[g.genre] ?? 0.6).toFixed(2)}`))),
      rt.scenes.length ? h('div', null, h('h4', null, t(l('Cenas onde o selo tem raízes', 'Scenes where the label has roots'))),
        ...rt.scenes.map((x) => h('div', { class: 'rt-genre' }, h('span', null, `${cityName(x.city)} · ${genreName(x.genre)}`), bar(Math.min(100, x.strength * 5)), h('small', null, x.strength.toFixed(1))))) : null,
    ) : null,
  );
}

registerTab('catalogHub', { id: 'retro', label: l('Retrospectiva', 'Retrospective'), icon: 'trophy', order: 55, render: retroTab });
