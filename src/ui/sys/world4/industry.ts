// Abas e seções de indústria: jabá e rádio, paradas e metodologia (manipulação), mais paradas,
// feiras e hype, fã-clubes oficiais, leis e sindicatos (com selo de aviso) e pirataria.

import { FAMILIES, l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { EXTRA_CHARTS, MANIP, METHOD_INFO, PAYOLA_ERA_INFO, PAYOLA_TIERS, chartMethod, manipulate, payDJs, payolaCost, payolaEra, pitchLegit, type ChartMethod } from '../../../sim/sys/world4/charts';
import { CLUB_TIERS, FAIRS, bookFair, closeFanClub, clubMedium, clubMeetup, createFanClub, fairCost, fairOpen, setClubTier, toggleMagazine } from '../../../sim/sys/world4/fairs';
import {
  LAWS, SOCIETIES, STANCES, advisoryOn, assocDues, castVote, choosePiracy, cleanEdit, influence, joinAssoc, lawChance, lobby, piracyLevel, setSociety, setUnion, societyAvailable, stickerRelease, unionMonthlyCost,
} from '../../../sim/sys/world4/laws';
import { liveMine, liveMineReleases, strikeActive } from '../../../sim/sys/world4/common';
import { w4, type Society } from '../../../sim/sys/world4/state';
import type { GameState } from '../../../sim/types';
import { fmtL, hasTech, money } from '../../../sim/util';
import { $, N, actLink, monthName, pill, releaseLink, rerender, section } from '../../common';
import { h, select } from '../../dom';
import { ic, meter, tabs } from '../../vis';
import { act, btn, note, pct } from './util';

// ======================================================================= jabá e rádio

export function radioTab(s: GameState): HTMLElement {
  const w = w4(s);
  const era = payolaEra(s);
  const info = PAYOLA_ERA_INFO[era];
  const curator = era === 'curator';
  const p = w.payola;
  const radio = hasTech(s, 'radio');
  return h('div', null,
    section(t(curator ? l('Curadores de playlist', 'Playlist curators') : l('Jabá e rádio', 'Payola and radio')),
      h('div', { class: 'row' }, pill(t(info.name), era === 'legal' ? '' : era === 'indie' ? 'warn' : 'bad'), h('span', { class: 'small' }, t(info.desc))),
      meter(curator ? 'stream' : 'radio', curator ? l('Relação com curadores', 'Curator relationship') : l('Relação com DJs e programadores', 'DJ and programmer relationship'), curator ? p.curator : p.dj),
      meter('chart-up', l('Empurrão atual nas paradas', 'Current chart push'), p.level * 100, 45),
      meter('warning', l('Risco de investigação', 'Investigation risk'), p.heat, 100, true),
      note(l('A relação aumenta o apelo de estreia dos seus discos (mais ainda com divulgação em rádio/playlists). O empurrão vale para lançamentos das últimas 16 semanas e cai a cada mês. O risco acumula; uma investigação traz multa e perda de reputação.', 'The relationship raises your records\' debut appeal (more with radio/playlist promotion). The push applies to releases from the last 16 weeks and fades monthly. Risk builds up; an investigation brings fines and lost reputation.')),
      !radio ? note(l('Ainda não há rádio comercial.', 'No commercial radio yet.')) : h('div', { class: 'row' },
        btn(`${t(curator ? l('Apresentar repertório aos curadores', 'Pitch curators') : l('Visitar rádios (legítimo)', 'Visit stations (legit)'))} · ${$(money(s, 500))}`, () => act(() => pitchLegit(s)), { disabled: p.pitchWeek === s.week }),
        PAYOLA_TIERS.map((tier, i) => btn(`${t(tier.name)} · ${$(payolaCost(s, i))}`, () => act(() => payDJs(s, i), l('Pagamento feito. As rádios vão tocar…', 'Payment made. The stations will play…')), { cls: i === 2 ? 'primary' : '', disabled: p.lastWeek === s.week, title: t(fmtL(l('Empurrão +{a}%, risco +{b}', 'Push +{a}%, risk +{b}'), { a: Math.round(tier.level * 100), b: Math.round(tier.heat * info.heat) })) }))),
      h('div', { class: 'row small muted' }, `${t(l('Gasto total', 'Total spent'))}: ${$(p.spent)}`, ' · ', `${t(l('Investigações', 'Investigations'))}: ${p.caught}`),
    ),
  );
}

// ======================================================================= paradas e metodologia

export function methodTab(s: GameState): HTMLElement {
  const w = w4(s);
  const cur = chartMethod(s);
  const methods: ChartMethod[] = ['shops', 'scan', 'stream', 'video'];
  const fams = ['pop', 'rock', 'hiphop', 'country_folk', 'rnb', 'latin', 'electronic', 'africa'];
  const famName = (id: string) => t(FAMILIES.find((f) => f.id === id)?.name ?? l(id));
  const rels = liveMineReleases(s, 30);
  const avail = Object.entries(MANIP).filter(([, m]) => m.methods.includes(cur));
  return h('div', null,
    section(t(l('Metodologia das paradas', 'Chart methodology')),
      h('div', { class: 'row' }, pill(t(METHOD_INFO[cur].name), 'gold'), h('span', { class: 'small' }, t(METHOD_INFO[cur].desc))),
      h('div', { class: 'w4-table-wrap' }, h('table', { class: 'w4-table' },
        h('thead', null, h('tr', null, h('th', null, t(l('Era', 'Era'))), fams.map((f) => h('th', null, famName(f))))),
        h('tbody', null, methods.map((m) => h('tr', { class: m === cur ? 'on' : '' }, h('th', null, t(METHOD_INFO[m].name)), fams.map((f) => {
          const k = METHOD_INFO[m].w[f] ?? 1;
          return h('td', { class: k > 1 ? 'good' : k < 1 ? 'bad' : '' }, k === 1 ? '—' : pct(k));
        })))))),
      note(l('Cada troca de metodologia reembaralha o topo: o que é medido muda quem vende.', 'Each methodology change reshuffles the top: what gets measured changes who sells.')),
    ),
    section(t(l('Manipulação de paradas', 'Chart rigging')),
      meter('warning', l('Risco de ser pego', 'Risk of getting caught'), w.manip.heat, 100, true),
      note(l('As unidades infladas não viram receita (são estornadas), mas sobem a posição, a fama e o momento. Funciona até ser pego.', 'Inflated units do not become revenue (they are reversed), but they lift position, fame and momentum. It works until you get caught.')),
      rels.length ? h('ul', { class: 'w4-list' }, rels.map((rel) => {
        const b = w.manip.boosts[rel.id];
        return h('li', { class: 'row between' },
          h('span', null, releaseLink(s, rel.id), ' ', rel.lastPos ? pill(`#${rel.lastPos}`, rel.lastPos <= 10 ? 'gold' : '') : pill(t(l('fora', 'out')), '')),
          b && b.until >= s.week ? pill(t(MANIP[b.kind].name), 'warn') : h('span', { class: 'row' }, avail.map(([id, m]) => btn(`${t(m.name)} · ${$(money(s, m.real))}`, () => act(() => manipulate(s, rel.id, id)), { title: t(m.desc) }))));
      })) : note(l('Nenhum lançamento seu em circulação.', 'None of your releases are in circulation.')),
      h('small', { class: 'muted' }, `${t(l('Vezes que foi pego', 'Times caught'))}: ${w.manip.caught}`),
    ),
  );
}

// ======================================================================= mais paradas

export function moreChartsSection(s: GameState): HTMLElement {
  const w = w4(s);
  const items = EXTRA_CHARTS.filter((c) => !c.from || hasTech(s, c.from)).map((c) => ({
    id: c.id, label: t(c.name), render: () => {
      const rows = c.rows(s);
      return h('div', null, note(c.desc), rows.length ? h('ol', { class: 'w4-chart' }, rows.map((r) => {
        const rel = s.releases[r.relId];
        return h('li', { class: rel && (rel.owner === 'player' || s.acts[rel.actId]?.playerBand) ? 'mine' : '' }, releaseLink(s, r.relId), h('small', null, ' — ', actLink(s, rel?.actId)), h('span', { class: 'w4-score' }, N(Math.round(r.score))));
      })) : note(l('Ninguém nesta parada ainda.', 'Nobody on this chart yet.')));
    },
  }));
  items.push({
    id: 'yearend', label: t(l('Fim de ano', 'Year-end')), render: () => w.yearEnd.length ? h('div', null, w.yearEnd.slice(-6).reverse().map((y) => h('details', { open: y === w.yearEnd[w.yearEnd.length - 1] ? true : undefined },
      h('summary', null, String(y.year), ' — ', h('b', null, y.top[0]?.title ?? '—'), ` (${y.top[0]?.act ?? ''})`),
      h('ol', { class: 'w4-chart' }, y.top.map((x) => h('li', null, s.releases[x.id] ? releaseLink(s, x.id) : h('span', null, x.title), h('small', null, ` — ${x.act}`), h('span', { class: 'w4-score' }, N(x.units)))))))) : note(l('A primeira parada de fim de ano sai em dezembro.', 'The first year-end chart comes out in December.')),
  });
  items.push({
    id: 'alltime', label: t(l('Todos os tempos', 'All-time')), render: () => w.allTime.length ? h('ol', { class: 'w4-chart' }, w.allTime.map((x) => h('li', null, s.releases[x.id] ? releaseLink(s, x.id) : h('span', null, x.title), h('small', null, ` — ${x.act} (${x.year})`), h('span', { class: 'w4-score' }, N(x.units))))) : note(l('A parada das paradas é atualizada todo fim de ano.', 'The chart of charts is updated every year-end.')),
  });
  return section(t(l('Mais paradas', 'More charts')), tabs('w4charts', items, rerender));
}

// ======================================================================= feiras e hype

export function fairsTab(s: GameState): HTMLElement {
  const w = w4(s);
  const open = FAIRS.filter((f) => fairOpen(s, f));
  return h('div', null,
    section(t(l('Feiras do setor e hype', 'Trade fairs and hype')),
      meter('fire', l('Hype do selo', 'Label hype'), w.hype),
      note(l('O hype sobe com feiras e números 1 e cai todo mês. Ele aumenta o apelo de estreia dos seus discos (até +25%).', 'Hype rises with fairs and number ones and falls every month. It raises your records\' debut appeal (up to +25%).')),
      !open.length ? note(l('A primeira grande feira internacional surge em 1967.', 'The first big international fair appears in 1967.')) : h('div', { class: 'cards' }, open.map((f) => {
        const booked = w.fairs.booked[f.id] === s.year;
        const passed = s.month > f.month;
        return h('div', { class: `tile ${booked ? 'on' : ''}` }, h('div', { class: 'tile-ic' }, ic('handshake', 2)), h('div', { class: 'tile-body' },
          h('b', null, t(f.name)), h('small', { class: 'muted' }, `${f.city} · ${monthName(f.month)} · ${f.realRef}`),
          h('small', null, t(f.desc)),
          booked ? pill(t(l('estande reservado', 'booth booked')), 'good') : passed ? pill(t(l('já passou este ano', 'over for this year')), '') : btn(`${t(l('Reservar estande', 'Book a booth'))} · ${$(fairCost(s, f))}`, () => act(() => bookFair(s, f.id)), { cls: 'primary' })));
      })),
      w.fairs.log.length ? h('div', null, h('h4', null, t(l('Resultados', 'Results'))), h('ul', { class: 'w4-list' }, w.fairs.log.slice(-6).reverse().map((x) => {
        const f = FAIRS.find((y) => y.id === x.fair);
        return h('li', null, `${x.year} · ${f ? t(f.name) : x.fair}: ${x.deals} ${t(l('acordos', 'deals'))}, ${$(x.income)}, ${t(l('hype', 'hype'))} +${x.hype}`);
      }))) : null,
    ),
  );
}

// ======================================================================= fã-clubes

export function fanClubsSection(s: GameState): HTMLElement | null {
  const acts = liveMine(s);
  if (!acts.length) return null;
  const w = w4(s);
  return section(t(l('Fã-clubes oficiais', 'Official fan clubs')),
    note(fmtL(l('Mensalidade, {m} e encontros. O clube converte fãs ativos em núcleo e organiza os superfãs.', 'Dues, {m} and meetups. The club turns active fans into core fans and organizes superfans.'), { m: clubMedium(s) })),
    h('div', { class: 'cards' }, acts.map((a) => {
      const c = w.clubs[a.id];
      if (!c) return h('div', { class: 'tile' }, h('div', { class: 'tile-body' }, h('b', null, a.name), h('small', { class: 'muted' }, `${N(a.fans.active)} ${t(l('fãs ativos', 'active fans'))}`),
        h('div', { class: 'row' }, CLUB_TIERS.map((tier, i) => btn(t(tier.name), () => act(() => createFanClub(s, a.id, i as 0 | 1 | 2)), { disabled: a.fans.active < 300, title: t(fmtL(l('Abrir (custo {c}); mensalidade {f}', 'Open (cost {c}); dues {f}'), { c: $(money(s, 800)), f: $(money(s, tier.fee)) })) })))));
      return h('div', { class: 'tile on' }, h('div', { class: 'tile-body' },
        h('div', { class: 'row between' }, h('b', null, a.name), pill(`${N(c.members)} ${t(l('sócios', 'members'))}`, 'good')),
        h('small', null, `${t(l('Saldo do mês', 'Monthly net'))}: ${$(c.income)}`),
        h('div', { class: 'row' },
          select(c.tier, CLUB_TIERS.map((tier, i) => ({ value: i as 0 | 1 | 2, label: t(tier.name) })), (v) => { setClubTier(s, Number(v) as 0 | 1 | 2); rerender(); }, { 'aria-label': t(l('Mensalidade', 'Dues')) }),
          btn(c.magazine ? t(l('Revista: sim', 'Magazine: on')) : t(l('Revista: não', 'Magazine: off')), () => { toggleMagazine(s, a.id); rerender(); }, { pressed: c.magazine }),
          btn(t(l('Encontro', 'Meetup')), () => act(() => clubMeetup(s, a.id), l('Encontro realizado: núcleo e superfãs crescem.', 'Meetup held: core fans and superfans grow.'))),
          btn(t(l('Fechar', 'Close')), () => { closeFanClub(s, a.id); rerender(); }, { cls: 'ghost' })),
      ));
    })),
  );
}

// ======================================================================= leis e sindicatos

export function lawsSection(s: GameState): HTMLElement {
  const w = w4(s);
  const strike = strikeActive(s);
  const inf = influence(s);
  const laws = LAWS.filter((d) => w.laws[d.id]);
  const socOpts: { value: string; label: string }[] = [{ value: '', label: t(l('Nenhuma', 'None')) }, ...(['scae', 'rmr'] as Society[]).filter((x) => societyAvailable(s, x)).map((x) => ({ value: x, label: t(SOCIETIES[x].name) }))];
  const last = w.societyLog[w.societyLog.length - 1];
  return section(t(l('Leis e sindicatos', 'Laws and unions')),
    h('div', { class: 'cards' },
      h('div', { class: `tile ${strike ? 'bad' : ''}` }, h('div', { class: 'tile-ic' }, ic('handshake', 2)), h('div', { class: 'tile-body' },
        h('b', null, t(l('Sindicato dos músicos', 'Musicians\' union'))),
        strike ? pill(t(fmtL(l('GREVE: até a semana {w}', 'STRIKE: until week {w}'), { w: strike.to })), 'bad') : pill(t(l('sem greve', 'no strike')), ''),
        h('small', null, t(l('Com acordo: paga o piso e o fundo sindical, grava normalmente em greves e os artistas confiam mais. Sem acordo: em greve, as gravações saem 30% piores.', 'With a deal: pay scale and the union fund, record normally during strikes and artists trust you more. Without: during strikes recordings come out 30% worse.'))),
        h('div', { class: 'row' }, btn(w.union ? t(l('Acordo assinado', 'Deal signed')) : `${t(l('Assinar acordo', 'Sign deal'))} · ${$(unionMonthlyCost(s))}/${t(l('mês', 'mo'))}`, () => act(() => setUnion(s, !w.union)), { cls: w.union ? 'primary' : '', pressed: w.union })),
        w.scabSongs ? h('small', { class: 'muted' }, `${t(l('Faixas gravadas durante greves', 'Tracks recorded during strikes'))}: ${w.scabSongs}`) : null)),
      h('div', { class: 'tile' }, h('div', { class: 'tile-ic' }, ic('bank', 2)), h('div', { class: 'tile-body' },
        h('b', null, t(l('Sociedade de direitos', 'Rights society'))),
        select(w.society ?? '', socOpts, (v) => act(() => setSociety(s, (v || undefined) as Society | undefined)), { 'aria-label': t(l('Sociedade de direitos', 'Rights society')) }),
        w.society ? h('small', null, t(SOCIETIES[w.society].desc), ' ', h('span', { class: 'muted' }, `(${SOCIETIES[w.society].realRef})`)) : h('small', null, t(l('Sem filiação, as execuções do seu catálogo não são arrecadadas.', 'Without a society, your catalog\'s plays go uncollected.'))),
        last ? h('small', null, `${t(l('Arrecadado em', 'Collected in'))} ${last.year}: ${$(last.amount)}`) : null)),
      h('div', { class: 'tile' }, h('div', { class: 'tile-ic' }, ic('gavel', 2)), h('div', { class: 'tile-body' },
        h('b', null, t(l('Associação de gravadoras', 'Record industry association'))),
        h('small', null, t(fmtL(l('Membros votam leis do setor. Sua influência: {p}%.', 'Members vote on industry laws. Your influence: {p}%.'), { p: Math.round(inf * 100) }))),
        btn(w.assoc ? t(l('Membro (sair)', 'Member (leave)')) : `${t(l('Filiar-se', 'Join'))} · ${$(assocDues(s))}/${t(l('ano', 'yr'))}`, () => act(() => joinAssoc(s, !w.assoc)), { pressed: w.assoc }))),
    ),
    h('h4', null, t(l('Leis em pauta', 'Laws on the table'))),
    laws.length ? h('ul', { class: 'w4-list' }, laws.map((d) => {
      const st = w.laws[d.id];
      return h('li', null,
        h('div', { class: 'row between' }, h('b', null, t(d.name)), pill(st.status === 'pending' ? t(l('em votação', 'voting')) : st.status === 'passed' ? `${t(l('aprovada', 'passed'))} ${st.year}` : `${t(l('rejeitada', 'rejected'))} ${st.year}`, st.status === 'passed' ? 'good' : st.status === 'failed' ? 'bad' : 'warn')),
        h('small', null, t(d.desc), ' ', h('i', null, t(l('Se aprovada:', 'If passed:')), ' ', t(d.yes))), h('br'), h('small', { class: 'muted' }, d.realRef),
        st.status === 'pending' && w.assoc ? h('div', { class: 'row' },
          btn(t(l('Votar a favor', 'Vote yes')), () => { castVote(s, d.id, 'yes'); rerender(); }, { pressed: st.vote === 'yes' }),
          btn(t(l('Votar contra', 'Vote no')), () => { castVote(s, d.id, 'no'); rerender(); }, { pressed: st.vote === 'no' }),
          btn(`${t(l('Lobby', 'Lobby'))} · ${$(money(s, 3000))}`, () => act(() => lobby(s, d.id))),
          h('small', null, t(fmtL(l('Chance de aprovar: {p}%', 'Chance to pass: {p}%'), { p: Math.round(lawChance(s, d.id) * 100) })))) : null);
    })) : note(l('Nenhuma lei do setor em pauta ainda (a primeira vem em 1971).', 'No industry law on the table yet (the first comes in 1971).')),
    advisoryOn(s) ? advisoryBlock(s) : null,
  );
}

function advisoryBlock(s: GameState): HTMLElement {
  const w = w4(s);
  const rels = liveMineReleases(s, 26);
  return h('div', null,
    h('h4', null, t(l('Selo de conteúdo explícito', 'Explicit content sticker'))),
    note(l('Com o selo, o disco sai das grandes redes (−15%), mas em rap e rock ganha credibilidade (+4%). A versão limpa para o rádio custa e ajuda (+6%). Discos de rap e rock sem selo podem ser denunciados.', 'With the sticker, the record leaves big chains (−15%), but in rap and rock it gains credibility (+4%). A clean radio edit costs money and helps (+6%). Unstickered rap and rock records can be denounced.')),
    rels.length ? h('ul', { class: 'w4-list' }, rels.map((rel) => {
      const a = w.advisory[rel.id];
      return h('li', { class: 'row between' }, releaseLink(s, rel.id),
        h('span', { class: 'row' },
          a === 'sticker' || a === 'both' ? pill('PARENTAL ADVISORY', 'bad') : btn(t(l('Aplicar selo', 'Apply sticker')), () => act(() => stickerRelease(s, rel.id))),
          a === 'clean' || a === 'both' ? pill(t(l('versão limpa', 'clean edit')), 'good') : btn(`${t(l('Versão limpa', 'Clean edit'))} · ${$(money(s, 1200))}`, () => act(() => cleanEdit(s, rel.id)))));
    })) : note(l('Nenhum lançamento recente.', 'No recent releases.')),
  );
}

// ======================================================================= pirataria

export function piracySection(s: GameState): HTMLElement {
  const w = w4(s);
  const pv = piracyLevel(s);
  return section(t(l('Pirataria', 'Piracy')),
    h('div', { class: 'row' }, pill(t(pv.name), pv.level > 0.2 ? 'bad' : pv.level > 0.06 ? 'warn' : '')),
    meter('lock', l('Vendas perdidas para a pirataria', 'Sales lost to piracy'), pv.level * 100, 60, true),
    h('div', { class: 'row', role: 'group', 'aria-label': t(l('Resposta', 'Response')) }, STANCES.map((st) => btn(t(st.name), () => act(() => choosePiracy(s, st.id)), { cls: w.piracy.stance === st.id ? 'primary' : 'ghost', pressed: w.piracy.stance === st.id, disabled: !!st.needs && !hasTech(s, st.needs), title: t(st.desc) }))),
    note(STANCES.find((x) => x.id === w.piracy.stance)?.desc ?? l('', '')),
    h('div', { class: 'row small' }, `${t(l('Perda estimada acumulada', 'Estimated losses to date'))}: ${$(w.piracy.lost)}`, ' · ', `${t(l('Recuperado', 'Recovered'))}: ${$(w.piracy.recovered)}`, w.piracy.scandals ? ` · ${t(l('Escândalos', 'Scandals'))}: ${w.piracy.scandals}` : ''),
  );
}
