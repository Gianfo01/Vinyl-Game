// Rodada 19 (Frente 5, onda 3 — T4) — página "Palco e temporada" (grupo Música): boicote ao monopólio de ingressos,
// festival gratuito, vinil e Record Store Day, calendário sazonal (curva por era), beneficentes e concursos.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { CAUSES18, soc18 } from '../../sim/sys/society18';
import { ch19, vanishOdds19 } from '../../sim/sys/charity19';
import { CT19, ct19, ctName19, ctNow19, ctPick19, entryFee19, entryOdds19, openMonth19, prodCost19, produce19, sponsFee19 } from '../../sim/sys/contests19';
import { giant18 } from '../../sim/sys/live18';
import {
  RSD_FROM19, SEC19, SITE19, activeBoy19, boyCost19, boyGate19, endBoy19, ffAtt19, ffCost19, ffGate19, freeFest19, hearOdds19, lv19, monthName19, rsdCost19, rsdRel19,
  rsdUnits19, season19, startBoy19, vinylIdx19, xmasCost19, xmasMult19, xmasPush19, xmasRels19, type Site19,
} from '../../sim/sys/live19';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fm = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const logList = (xs: [number, number, L][], n = 12) => (xs.length ? h('ul', { class: 'small' }, ...xs.slice(0, n).map(([y, m, x]) => h('li', null, `${y}/${m + 1} — ${t(x)}`))) : muted(l('Nada ainda.', 'Nothing yet.')));
const F = { act: '', site: 'park' as Site19, sec: 1, spons: false, rel: '' };

function ticketsTab(s: GameState): HTMLElement {
  const g = giant18(s), acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  if (!F.act || !acts.some((a) => a.id === F.act)) F.act = acts[0]?.id ?? '';
  const cut = lv19(s).cut;
  return h('div', null,
    section(t(l('O gigante dos ingressos', 'The ticketing giant')),
      g ? row(pill(g.name), pill(fm(l('taxa {p}%', 'fee {p}%'), { p: Math.round(g.fee * 1000) / 10 })), cut && s.year < cut.until ? pill(fm(l('taxa cortada pela Justiça até {y}', 'fee cut by court until {y}'), { y: cut.until }), 'good') : null)
        : muted(l('Ainda não há um gigante nacional de bilhetagem (surge em 1976).', 'No national ticketing giant yet (it appears in 1976).')),
      muted(l('Boicotar (Pearl Jam × Ticketmaster, 1994): o ato só toca em casas alternativas — turnê mais cara e procura −12%, mas fãs (+lealdade, +mobilização) e imprensa aplaudem. Seis meses depois, a audiência antitruste: vitória corta a taxa do gigante por 10 anos para todo mundo.', 'Boycott (Pearl Jam × Ticketmaster, 1994): the act only plays alternative venues — pricier tours and −12% demand, but fans (+loyalty, +mobilisation) and press cheer. Six months later, the antitrust hearing: a win cuts the giant\'s fee for 10 years for everyone.')),
      acts.length ? row(select(F.act, acts.map((a) => ({ value: a.id, label: a.name })), (v) => { F.act = v; rerender(); }),
        btn(l('Boicotar o gigante', 'Boycott the giant'), () => say(startBoy19(s, F.act), l('Boicote anunciado.', 'Boycott announced.')), !!boyGate19(s, F.act)),
        boyGate19(s, F.act) ? h('span', { class: 'muted small' }, T(boyGate19(s, F.act)!)) : null) : null),
    section(t(l('Boicotes', 'Boycotts')),
      lv19(s).boy.length ? h('table', { class: 'table small' }, h('tr', null, ...[l('Ato', 'Act'), l('Desde', 'Since'), l('Custo', 'Cost'), l('Audiência', 'Hearing'), ''].map((x) => h('th', null, T(x)))),
        ...lv19(s).boy.slice().reverse().map((b) => h('tr', null, h('td', null, actLink(s, b.act)), h('td', null, String(b.y)), h('td', null, $(b.cost)),
          h('td', null, b.res ? pill(b.res === 'win' ? t(l('vitória', 'won')) : t(l('arquivado', 'dropped')), b.res === 'win' ? 'good' : 'bad') : why18(s, 'lv19.hear', { boy: b.id }, pill(fm(l('{p}% de chance', '{p}% odds'), { p: Math.round(hearOdds19(s, b).p * 100) })))),
          h('td', null, b.end ? t(l('encerrado', 'ended')) : btn(l('Encerrar', 'End'), () => say(endBoy19(s, b.id)))))))
        : muted(l('Nenhum boicote.', 'No boycotts.')),
      activeBoy19(s).length ? muted(fm(l('Custo mensal em turnê: {c} por ato.', 'Monthly cost on tour: {c} per act.'), { c: $(boyCost19(s, s.acts[activeBoy19(s)[0].act])) })) : null));
}

function freeTab(s: GameState): HTMLElement {
  const gate = ffGate19(s, F.site), cap = SITE19[F.site].cap, att = ffAtt19(s);
  return h('div', null,
    section(t(l('Festival gratuito', 'Free festival')),
      muted(l('Sem ingresso: público enorme, fãs novos, um ato local descoberto no palco aberto e prestígio. Mas multidão acima da capacidade do terreno com pouca segurança pode virar tragédia (processo, lei de segurança). Nada disso no modo exato.', 'No tickets: a huge crowd, new fans, a local act discovered on the open stage and prestige. But a crowd above the site\'s capacity with little security can become a tragedy (lawsuit, safety law). None of that in exact mode.')),
      row(select(F.site, (Object.keys(SITE19) as Site19[]).map((k) => ({ value: k, label: `${t(SITE19[k].name)} (${SITE19[k].cap.toLocaleString('en-US')})` })), (v) => { F.site = v as Site19; rerender(); }),
        select(String(F.sec), SEC19.map((x, i) => ({ value: String(i), label: t(x) })), (v) => { F.sec = Number(v); rerender(); }),
        s.year >= 1980 ? h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.spons, onchange: () => { F.spons = !F.spons; rerender(); } }), ' ', t(l('patrocínio (−40% custo, −1 crédito artístico)', 'sponsor (−40% cost, −1 artistic credibility)'))) : null),
      row(pill(fm(l('público esperado ~{n}', 'expected crowd ~{n}'), { n: att.toLocaleString('en-US') }), att > cap ? 'bad' : ''), pill(fm(l('capacidade {n}', 'capacity {n}'), { n: cap.toLocaleString('en-US') })), pill(fm(l('custo {c}', 'cost {c}'), { c: $(ffCost19(s, F.site, F.sec)) })),
        why18(s, 'lv19.ff', { site: F.site, sec: F.sec }, pill(t(l('risco (por quê)', 'risk (why)')))),
        btn(l('Montar o festival', 'Stage the festival'), () => say(freeFest19(s, F.site, F.sec, F.spons), l('Festival realizado.', 'Festival held.')), !!gate)),
      gate ? muted(gate) : null),
    section(t(l('Edições', 'Editions')), lv19(s).ff.length ? h('ul', { class: 'small' }, ...lv19(s).ff.slice().reverse().map((x) => h('li', null, `${x.y} — ${t(SITE19[x.site].name)}: ${x.att.toLocaleString('en-US')} / ${x.cap.toLocaleString('en-US')} · ${t(SEC19[x.sec])}${x.inc ? ` · ⚠ ${x.inc === 3 ? t(l('tragédia', 'tragedy')) : t(l('feridos', 'injuries'))}` : ''}`))) : muted(l('Nenhuma ainda.', 'None yet.'))));
}

function vinylTab(s: GameState): HTMLElement {
  const ys = [1960, 1975, 1985, 1995, 2005, 2008, 2012, 2016, 2020, 2024].filter((y) => y <= s.year);
  const c = rsdRel19(s, 'cat'), n = rsdRel19(s, 'new');
  return h('div', null,
    section(t(l('Curva do vinil', 'Vinyl curve')),
      row(...ys.map((y) => pill(`${y}: ${Math.round(vinylIdx19(y) * 100)}%`, y === s.year ? 'good' : ''))),
      muted(l('100% = auge dos anos 70. O CD e o digital derrubam o vinil até 2007; o renascimento (2008+) é de colecionadores: tiragens pequenas, caras, numeradas — e fábricas entupidas.', '100% = 1970s peak. CD and digital crush vinyl until 2007; the revival (2008+) is for collectors: small, pricey, numbered runs — and clogged plants.'))),
    section(t(l('Record Store Day', 'Record Store Day')),
      s.year < RSD_FROM19 ? muted(l('O Record Store Day começa em 2008 (abril).', 'Record Store Day starts in 2008 (April).')) : h('div', null,
        muted(l('Em fevereiro chega a carta: reedição colorida de um clássico do catálogo ou exclusivo do disco novo. Em abril, as lojas independentes vendem; se a fila da fábrica passar de 8 semanas, chega atrasado e metade da fila vai embora. Colecionadores viram superfãs.', 'In February the letter arrives: a coloured reissue of a catalogue classic or an exclusive of the new record. In April, indie stores sell; if the plant queue exceeds 8 weeks it arrives late and half the line leaves. Collectors become superfans.')),
        row(c ? pill(fm(l('catálogo: "{t}" ~{u} cópias, {c}', 'catalogue: "{t}" ~{u} copies, {c}'), { t: c.title, u: rsdUnits19(s, c, 'cat'), c: $(rsdCost19(s, 'cat')) })) : null, n ? pill(fm(l('novo: "{t}" ~{u} cópias, {c}', 'new: "{t}" ~{u} copies, {c}'), { t: n.title, u: rsdUnits19(s, n, 'new'), c: $(rsdCost19(s, 'new')) })) : null),
        lv19(s).rsd.length ? h('ul', { class: 'small' }, ...lv19(s).rsd.slice().reverse().map((x) => h('li', null, `${x.y} — "${s.releases[x.rel]?.title ?? '?'}" · ${x.done ? `${Math.round(x.units * (x.late ? 0.55 : 1)).toLocaleString('en-US')} ${t(l('cópias', 'copies'))}` : t(l('a caminho', 'on its way'))}${x.late ? ` · ${t(l('atrasado', 'late'))}` : ''}`))) : null)));
}

function seasonTab(s: GameState): HTMLElement {
  const rels = xmasRels19(s);
  if (!F.rel || !rels.some((r) => r.id === F.rel)) F.rel = rels[0]?.id ?? '';
  const st = lv19(s);
  return h('div', null,
    section(fm(l('Temporada de {y}', '{y} season'), { y: s.year }),
      h('table', { class: 'table small' }, h('tr', null, h('th', null, ''), ...Array.from({ length: 12 }, (_, m) => h('th', null, t(monthName19(m))))),
        h('tr', null, h('td', null, t(l('Vendas', 'Sales'))), ...Array.from({ length: 12 }, (_, m) => { const x = season19(s.year, m); return h('td', { style: m === s.month ? 'font-weight:bold' : '' }, why18(s, 'lv19.season', { m }, `×${x.units.toFixed(2)}`)); })),
        h('tr', null, h('td', null, t(l('Shows', 'Shows'))), ...Array.from({ length: 12 }, (_, m) => h('td', null, `×${season19(s.year, m).live.toFixed(2)}`)))),
      muted(l('Natal pesa mais no varejo físico (1950–2007) e menos no streaming; verão favorece singles (1960+) e shows (temporada de festivais, 1969+); janeiro é a calmaria. As datas aparecem no Calendário.', 'Christmas weighs most in physical retail (1950–2007) and least in streaming; summer favours singles (1960+) and shows (festival season, 1969+); January is the lull. Dates appear in the Calendar.'))),
    section(t(l('Campanha de Natal', 'Christmas campaign')),
      muted(fm(l('De setembro a novembro, para um disco lançado há até 10 semanas: vendas de nov–dez ×{k} (cai 3% por astro lançando agora — os rivais também guardam discos para o Natal). Custo {c}.', 'September to November, for a record released within 10 weeks: Nov–Dec sales ×{k} (3% less per star releasing now — rivals also hold records for Christmas). Cost {c}.'), { k: xmasMult19(s).toFixed(2), c: $(xmasCost19(s)) })),
      rels.length ? row(select(F.rel, rels.map((r) => ({ value: r.id, label: `${r.title}${st.xmas[r.id] === s.year ? ' ✓' : ''}` })), (v) => { F.rel = v; rerender(); }), btn(l('Lançar campanha', 'Launch campaign'), () => say(xmasPush19(s, F.rel), l('Campanha no ar.', 'Campaign live.')), s.month < 8 || s.month > 10 || st.xmas[F.rel] === s.year))
        : muted(l('Nenhum disco recente elegível.', 'No eligible recent record.'))),
    section(t(l('Registro', 'Log')), logList(st.log)));
}

function charityTab(s: GameState): HTMLElement {
  const st = ch19(s), camp = soc18(s).camp;
  return h('div', null,
    section(t(l('Crises e beneficentes', 'Crises and benefits')),
      muted(l('Uma crise mundial abre a carta: liderar com auditoria (dinheiro protegido), liderar no improviso (risco de desvio → escândalo e inquérito), mandar um ato ao megashow de outro selo ou ficar de fora. No palco, rivais de selos diferentes fazem pacto (favores) ou brigam (rixa).', 'A world crisis opens the card: lead with an audit (money protected), lead improvised (embezzlement risk → scandal and inquiry), send an act to another label\'s mega-show, or stay out. On stage, rivals from different labels make a pact (favours) or fight (feud).')),
      row(why18(s, 'ch19.vanish', { aud: 1, mine: 1 }, pill(fm(l('com auditoria: {p}%', 'audited: {p}%'), { p: Math.round(vanishOdds19(s, true, true).p * 100) }), 'good')), why18(s, 'ch19.vanish', { aud: 0, mine: 1 }, pill(fm(l('improviso: {p}%', 'improvised: {p}%'), { p: Math.round(vanishOdds19(s, false, true).p * 100) }), 'bad')),
        camp && camp.stage !== 'done' ? pill(fm(l('sua campanha: {c} ({n} estrelas)', 'your campaign: {c} ({n} stars)'), { c: t(CAUSES18.find((x) => x.id === camp.cause)?.name ?? l(camp.cause, camp.cause)), n: camp.stars.length })) : null)),
    section(t(l('Crises', 'Crises')), st.cr.length ? h('ul', { class: 'small' }, ...st.cr.slice().reverse().slice(0, 10).map((c) => h('li', null, `${c.y} — ${t(c.t)}${c.org ? ` · ${s.labels[c.org]?.name ?? ''}` : c.mine ? ` · ${s.config.companyName}` : ''}${c.gone ? ` · ⚠ ${t(l('dinheiro sumiu', 'money vanished'))}` : ''}`))) : muted(l('Nenhuma ainda.', 'None yet.'))),
    section(t(l('Rivais no mesmo palco', 'Rivals on the same stage')), st.st.length ? h('ul', { class: 'small' }, ...st.st.slice(0, 10).map((x) => h('li', null, `${x.y} — ${x.k === 'pact' ? '🤝' : x.k === 'feud' ? '⚔' : '…'} ${t(x.t)}`))) : muted(l('Ninguém dividiu palco ainda.', 'Nobody has shared a stage yet.'))),
    section(t(l('Registro', 'Log')), logList(st.log)));
}

function contestsTab(s: GameState): HTMLElement {
  const st = ct19(s), now = ctNow19(s), acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  if (!F.act || !acts.some((a) => a.id === F.act)) F.act = acts[0]?.id ?? '';
  return h('div', null,
    section(t(l('Concursos desta temporada', 'This season\'s contests')),
      muted(l('Rádio (1925+), festivais da canção na TV (1951+) e, desde 2000, os programas de talentos (aba TV em Artistas). Inscreva um ato, patrocine (direito de contratar o vencedor), empreste uma estrela ao júri ou produza o seu próprio concurso.', 'Radio (1925+), TV song festivals (1951+) and, since 2000, talent shows (TV tab under Artists). Enter an act, sponsor (right to sign the winner), lend a star to the panel or produce your own contest.')),
      ...now.map((c) => {
        const e = st.ed.find((x) => x.ct === c.id && x.y === s.year), a = s.acts[F.act];
        return h('div', { class: 'card', style: 'margin:6px 0;padding:6px' }, row(h('b', null, t(ctName19(s, c))), pill(fm(l('final em {m}', 'final in {m}'), { m: t(monthName19(c.m)) })), pill(fm(l('força {p}', 'power {p}'), { p: c.power }))), muted(c.desc),
          e?.done ? muted(fm(l('Vencedor: {w}{b}', 'Winner: {w}{b}'), { w: s.acts[e.win ?? '']?.name ?? '?', b: e.booed ? t(l(' (vaiado)', ' (booed)')) : '' }))
            : row(acts.length ? select(F.act, acts.map((x) => ({ value: x.id, label: x.name })), (v) => { F.act = v; rerender(); }) : null,
              a ? why18(s, 'ct19.odds', { ct: c.id, act: a.id, judge: e?.judge ? 1 : 0 }, pill(fm(l('{p}% de chance', '{p}% odds'), { p: Math.round(entryOdds19(s, c, a, !!e?.judge).p * 100) }))) : null,
              btn(fm(l('Inscrever ({c})', 'Enter ({c})'), { c: $(entryFee19(s, c)) }), () => say(ctPick19(s, c.id, 'enter', F.act)), !!e?.entry || s.month > c.m || s.month < openMonth19(c) - 1),
              btn(fm(l('Patrocinar ({c})', 'Sponsor ({c})'), { c: $(sponsFee19(s, c)) }), () => say(ctPick19(s, c.id, 'sponsor')), !!e?.spons),
              btn(l('Estrela no júri', 'Star on the panel'), () => say(ctPick19(s, c.id, 'judge')), !!e?.judge)));
      }),
      now.length ? null : muted(l('Nenhum concurso de rádio ou festival da canção no seu mercado neste ano.', 'No radio contest or song festival in your market this year.'))),
    section(t(l('Seu concurso', 'Your contest')),
      st.prod ? row(pill(st.prod.name, 'good'), btn(l('Encerrar', 'Close'), () => say(produce19(s, false))))
        : row(btn(fm(l('Produzir ({c}/ano; direitos de transmissão de volta)', 'Produce ({c}/yr; broadcast rights back)'), { c: $(prodCost19(s)) }), () => say(produce19(s, true), l('Concurso no ar.', 'Contest on air.'))))),
    section(t(l('Todos os formatos', 'All formats')), h('ul', { class: 'small' }, ...CT19.filter((c) => c.from <= s.year).map((c) => h('li', null, `${t(ctName19(s, c))} (${c.from}${c.to < 9999 ? `–${c.to}` : '+'})`)))),
    section(t(l('Registro', 'Log')), logList(st.log)));
}

function page(s: GameState): HTMLElement {
  return h('div', null,
    h('h2', null, t(l('Palco e temporada', 'Stage and season'))),
    tabs('live19', [
      { id: 'tickets', label: t(l('Ingressos', 'Ticketing')), badge: activeBoy19(s).length || undefined, render: () => ticketsTab(s) },
      { id: 'free', label: t(l('Festival grátis', 'Free festival')), render: () => freeTab(s) },
      { id: 'vinyl', label: t(l('Vinil e RSD', 'Vinyl and RSD')), render: () => vinylTab(s) },
      { id: 'season', label: t(l('Temporada', 'Season')), render: () => seasonTab(s) },
      { id: 'charity', label: t(l('Beneficentes', 'Benefits')), render: () => charityTab(s) },
      { id: 'contests', label: t(l('Concursos', 'Contests')), render: () => contestsTab(s) },
    ], rerender));
}
registerArea({ id: 'live19', label: l('Palco e temporada', 'Stage and season'), icon: 'star', key: '', render: page,
  badge: (s) => activeBoy19(s).filter((b) => !b.res).length || undefined });
