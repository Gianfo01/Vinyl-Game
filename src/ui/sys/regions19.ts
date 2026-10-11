// Rodada 19 (Frente 6, T5) — página "Regiões e política" (Mundo): selos regionais (cassete, sound system, rua, salsa),
// comuna e exílio, vistos e rádio (needle time), greves de gravação, campanhas e leis, celeiros (coros e escolas).

import { ERA19 } from '../../sim/era19';
import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { countryOfCity } from '../../data/geo';
import { regimeAt18, soc18 } from '../../sim/sys/society18';
import { STRIKES19, VISA19, applyVisa19, clashOdds19, communeBlock19, communeCost19, electionYear19, foundCommune19, foundInd19, hasVisa19, indAction19, indCost19, indYield19, indsNow19, lawOn19, needle19, radioSession19, reg19, rouanet19, rouanetOk19, sessFee19, strikeAns19, visaOdds19, type IndId, type StrikeHow19 } from '../../sim/sys/regions19';
import { choirsNow19, foundChoir19, progCost19, sch19 } from '../../sim/sys/schools19';
import { MILESTONES } from '../../sim/sys/world4/milestones';
import { strikeActive } from '../../sim/sys/world4/common';
import { w4 } from '../../sim/sys/world4/state';
import type { Act, GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const card = (...k: (Node | string | null)[]) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fmtS = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split');
const cname = (c: string) => (cityById[c] ? T(cityById[c].name) : c);
const list = (xs: [number, number, L][] | [number, L][]) => h('ul', { class: 'small' }, ...xs.slice(0, 15).map((x) => h('li', null, x.length === 3 ? `${x[0]}/${x[1] + 1} — ${T(x[2])}` : `${x[0]} — ${T(x[1])}`)));

function indTab(s: GameState): HTMLElement {
  const st = reg19(s), now = indsNow19(s);
  return h('div', null,
    muted(l('Fatias regionais da indústria: cada uma rende todo mês pelo gosto do submercado e pelos seus atos do gênero, e tem uma jogada própria (uma vez por mês). Nomes reais só com "nomes reais" ligado; acusações aparecem como acusações.', 'Regional industry slices: each earns monthly from submarket taste and your acts in the genre, and has its own move (once a month). Real names only with "real names" on; allegations appear as allegations.')),
    now.length ? h('div', null, ...now.map((d) => {
      const x = st.ind[d.id as IndId], y = indYield19(s, d.id);
      return card(
        row(h('b', null, T(d.name)), pill(cname(d.city)), s.config.realNames ? pill(d.real) : null, x ? pill(fmtS(l('nível {n}', 'level {n}'), { n: x.lv }), 'good') : null),
        muted(d.desc),
        x ? row(why18(s, 'reg19.ind', { id: d.id }, fmtS(l('Renda: {v}/mês', 'Income: {v}/month'), { v: $(y.v) })), ` · ${fmtS(l('sucessos {n}', 'hits {n}'), { n: x.hits })}`, d.id === 'sound' ? ` · ${fmtS(l('dubplates {n}', 'dubplates {n}'), { n: x.dub })}` : '', d.id === 'street' ? ` · ${t(x.fair ? l('royalties justos', 'fair royalties') : l('royalties "de rua"', '"street" royalties'))}` : '') : null,
        row(
          btn(x ? fmtS(l('Ampliar ({c})', 'Expand ({c})'), { c: $(indCost19(s, d.id)) }) : fmtS(l('Abrir ({c})', 'Open ({c})'), { c: $(indCost19(s, d.id)) }), () => say(foundInd19(s, d.id)), (x?.lv ?? 0) >= 3),
          x && d.id === 'sound' ? btn(fmtS(l('Clash ({p}%)', 'Clash ({p}%)'), { p: Math.round(clashOdds19(s) * 100) }), () => say(indAction19(s, 'sound'))) : null,
          x && d.id === 'sound' ? btn(l('Gravar dubplate', 'Cut a dubplate'), () => say(indAction19(s, 'sound', 'dub'))) : null,
          x && d.id === 'street' ? btn(l('Gravar o MC (royalties justos)', 'Record the MC (fair royalties)'), () => say(indAction19(s, 'street', 'fair'))) : null,
          x && d.id === 'street' ? btn(l('Gravar o MC (royalties "de rua")', 'Record the MC ("street" royalties)'), () => say(indAction19(s, 'street', 'cheap'))) : null,
          x && (d.id === 'cassette' || d.id === 'salsa') ? btn(d.act, () => say(indAction19(s, d.id))) : null));
    })) : muted(l('Nenhuma fatia regional existe nesta época (sound systems a partir de 1952).', 'No regional slice exists in this era (sound systems from 1952).')),
    section(t(l('Diário', 'Log')), st.log.length ? list(st.log) : muted(l('Nada ainda.', 'Nothing yet.'))));
}
function comTab(s: GameState): HTMLElement {
  const st = reg19(s), so = soc18(s);
  return h('div', null,
    muted(l('Uma república-comuna (1965+) dá núcleo de fãs, prestígio artístico e paz à banda — e esquenta o regime. Sob ditadura, batidas (o prédio é tomado, as fitas se perdem) podem levar ao exílio; na democracia, só raramente a polícia aparece. Modo exato: artistas reais seguem a própria história.', 'A commune-republic (1965+) grows core fans, artistic prestige and band peace — and heats up the regime. Under a dictatorship, raids (the compound is seized, tapes are lost) can lead to exile; in a democracy the police only rarely show up. Exact mode: real artists follow their own history.')),
    ...mine(s).map((a) => {
      const c = st.com[a.id], reg = regimeAt18(s, countryOfCity(a.city)), b = communeBlock19(s, a);
      return card(row(actLink(s, a.id), pill(cname(a.city)), reg ? pill(T(reg.name), 'bad') : pill(t(l('sem regime', 'no regime')), 'good'), pill(fmtS(l('calor {h}', 'heat {h}'), { h: Math.round(so.heat[a.id] ?? 0) })),
        c ? why18(s, 'reg19.raid', { act: a.id }, pill(fmtS(l('comuna desde {y} · batidas {n}', 'commune since {y} · raids {n}'), { y: c.since, n: c.raids }), 'warn')) : btn(fmtS(l('Declarar comuna ({c})', 'Declare a commune ({c})'), { c: $(communeCost19(s)) }), () => say(foundCommune19(s, a.id)), !!b),
        !c && b ? h('span', { class: 'muted small' }, T(b)) : null));
    }),
    section(t(l('Exilados', 'Exiles')), Object.keys(so.exile).length ? h('ul', { class: 'small' }, ...Object.entries(so.exile).map(([id, x]) => h('li', null, actLink(s, id), fmtS(l(' — em {c} desde {y}', ' — in {c} since {y}'), { c: cname(x.to), y: x.since })))) : muted(l('Ninguém no exílio.', 'Nobody in exile.'))));
}
function visaTab(s: GameState): HTMLElement {
  const vs = VISA19.filter((v) => s.year >= v.from && s.year <= v.to), nd = needle19(s.year);
  return h('div', null,
    muted(l('Tocar fora exige papel: sem visto, as datas caem e a procura de ingressos no país cai (×0,9; proibição ×0,6). Prisões na ficha e ativismo pesam. O visto vale um ano e aparece no Calendário.', 'Playing abroad takes paperwork: without a visa dates fall through and ticket demand there drops (×0.9; ban ×0.6). Arrests and activism weigh. A visa lasts a year and shows on the Calendar.')),
    vs.length ? h('div', null, ...vs.map((v) => card(row(h('b', null, T(v.name)), v.ban ? pill(t(l('proibição', 'ban')), 'bad') : null, s.config.realNames ? pill(v.real) : null), muted(v.desc),
      row(...mine(s).filter((a) => { const a3 = countryOfCity(a.city); return !!a3 && !v.host.includes(a3) && (!v.who || v.who.includes(a3)); }).slice(0, 8).map((a) => hasVisa19(s, a.id, v.id) ? pill(`${a.name} ✓`, 'good')
        : why18(s, 'reg19.visa', { act: a.id, v: v.id }, btn(fmtS(l('{a}: pedir ({c}, {p}%)', '{a}: apply ({c}, {p}%)'), { a: a.name, c: $(money(s, v.cost)), p: Math.round(visaOdds19(s, a, v).p * 100) }), () => say(applyVisa19(s, a.id, v.id))))))))) : muted(l('Sem barreiras de visto nesta época.', 'No visa barriers in this era.')),
    section(t(l('Needle time e sessões de rádio', 'Needle time and radio sessions')),
      muted(nd === 2 ? l('Reino Unido: a rádio pública só pode tocar poucas horas de discos por dia (acordo com os fonogramas). Sessões ao vivo gravadas para a rádio substituem o disco: −4% de apelo lá sem sessão recente, +6% com.', 'UK: public radio may only play a few hours of records a day (agreement with record makers). Live sessions recorded for radio replace the record: −4% appeal there without a recent session, +6% with one.')
        : nd === 1 ? l('Reino Unido (1967–1988): a rádio jovem nasce, mas o limite de discos continua; sessões ainda valem (+6%; sem sessão −2%).', 'UK (1967–1988): youth radio is born, but the record limit stays; sessions still pay (+6%; without one −2%).')
          : l('Sem limite de discos na rádio; sessões ao vivo ainda rendem um empurrão pequeno (+2%).', 'No record limit on radio; live sessions still give a small push (+2%).')),
      row(...mine(s).slice(0, 10).map((a) => btn(fmtS(l('Sessão: {a} (+{f})', 'Session: {a} (+{f})'), { a: a.name, f: $(sessFee19(s)) }), () => say(radioSession19(s, a.id)), s.year < 1935 || (reg19(s).sess[a.id] ?? -99) > s.week - 13)))));
}
function strikeTab(s: GameState): HTMLElement {
  const st = reg19(s).stk, sa = strikeActive(s), w = w4(s), f = reg19(s).mptf;
  const opts: [StrikeHow19, L][] = [['acappella', l('A capella', 'A cappella')], ['abroad', l('Gravar no exterior', 'Record abroad')], ['settle', l('Assinar o fundo', 'Sign the fund')], ['hold', l('Segurar', 'Hold out')]];
  return h('div', null,
    muted(l('Greves de gravação do sindicato dos músicos (1942–44 e 1948). Antes: maratona de estúdio enche o cofre (+8% de apelo durante a greve). Durante: a capella salva cantores e coros, gravar no exterior mantém o som (o sindicato multa depois), o acordo do fundo encerra a greve para o selo (1% por disco paga shows gratuitos que formam plateia).', 'Musicians\' union recording strikes (1942–44 and 1948). Before: a studio marathon fills the vault (+8% appeal during the strike). During: a cappella saves singers and choirs, recording abroad keeps the sound (the union fines you later), the fund deal ends the strike for the label (1% per record pays free concerts that grow audiences).')),
    row(pill(sa ? fmtS(l('greve em curso ({n})', 'strike on ({n})'), { n: w.strike?.name ?? '' }) : t(l('sem greve', 'no strike')), sa ? 'bad' : 'good'), w.union ? pill(t(l('acordo assinado', 'deal signed')), 'good') : null, st.mode ? pill(fmtS(l('estratégia: {m}', 'strategy: {m}'), { m: st.mode })) : null, (st.stock ?? 0) > s.week ? pill(t(l('cofre cheio', 'vault full')), 'good') : null),
    sa && !w.union ? row(...opts.map(([k, lb]) => btn(lb, () => say(strikeAns19(s, k)), st.mode === k))) : null,
    f ? muted(fmtS(l('Fundo dos músicos desde {y}: pago {v}, {n} rodadas de shows gratuitos.', 'Musicians\' fund since {y}: paid {v}, {n} rounds of free concerts.'), { y: f.since, v: $(f.paid), n: f.gigs })) : null,
    section(t(l('Greves da história', 'Strikes in history')), h('ul', { class: 'small' }, ...STRIKES19.filter((x) => s.year >= x.warn[0]).map((x) => h('li', null, T(x.name))))));
}
function polTab(s: GameState): HTMLElement {
  const st = reg19(s), laws = MILESTONES.filter((m) => m.id.startsWith('law_') && (s.year > m.year || (s.year === m.year && (m.month ?? 0) <= s.month)));
  return h('div', null,
    muted(l('Em ano de eleição (sem regime no seu país), um candidato fictício pode usar um hit seu: licenciar paga e divide os fãs pela política; protestar agrada ao artista; ignorar deixa rolar. Leis e cotas mudam o rádio por país.', 'In an election year (no regime at home), a fictional candidate may use one of your hits: licensing pays and splits fans by politics; protesting pleases the artist; ignoring lets it roll. Laws and quotas change radio by country.')),
    row(pill(electionYear19(s) ? t(l('ano de eleição', 'election year')) : t(l('sem eleição este ano', 'no election this year')), electionYear19(s) ? 'warn' : '')),
    rouanetOk19(s) ? row(btn(l('Captar pela Lei Rouanet', 'Raise via the Rouanet law'), () => say(rouanet19(s))), muted(l('Patrocínio dedutível para projetos dos seus atos brasileiros (1 por ano); a prestação de contas pode voltar.', 'Tax-deductible sponsorship for your Brazilian acts\' projects (once a year); the accounting may come back.'))) : null,
    section(t(l('Leis em vigor', 'Laws in force')), laws.length ? h('ul', { class: 'small' }, ...laws.map((m) => h('li', null, h('b', null, `${m.year} · ${T(m.title)}`), lawOn19(s, m.id.slice(4)) ? '' : ` (${t(l('pendente', 'pending'))})`, ' — ', T(m.mech)))) : muted(l('Nenhuma ainda.', 'None yet.'))),
    mine(s)[0] ? row(why18(s, 'reg19.law', { act: mine(s)[0].id }, t(l('Efeito das leis no seu último lançamento', 'Laws\' effect on your latest release')))) : null,
    section(t(l('Campanhas', 'Campaigns')), Object.keys(st.camp).length ? h('ul', { class: 'small' }, ...Object.entries(st.camp).map(([y, v]) => h('li', null, `${y} — "${s.releases[v.split('|')[0]]?.title ?? '?'}"`))) : muted(l('Nenhuma canção sua em campanha ainda.', 'None of your songs in a campaign yet.'))));
}
function schTab(s: GameState): HTMLElement {
  const st = sch19(s);
  return h('div', null,
    muted(l('Celeiros de talento: coros de igreja das cidades do gospel lançam vozes todo ano (gospel vira soul depois de 1955), formandos com potencial raro viram "prodígio" (potencial revelado +3). Bolsas em conservatórios, escola de jazz, coro de igreja e escola de artes cênicas ficam em Talentos › Escolas; aqui você funda o programa de coral do selo (prédio no campus, um cantor por ano já conhecido). Para achar vozes no domingo, use o canal de descoberta "Culto de domingo".', 'Talent nurseries: church choirs in gospel cities launch voices every year (gospel turns soul after 1955), graduates with rare potential become "prodigies" (revealed potential +3). Scholarships at conservatories, jazz school, church choir and performing-arts school are in Talent › Schools; here you found the label\'s choir program (a campus building, one already-known singer a year). To find Sunday voices, use the "Sunday service" discovery channel.')),
    row(why18(s, 'sch19.choir', {}, pill(fmtS(l('{n} coros ativos', '{n} active choirs'), { n: choirsNow19(s).length }))), st.prog ? pill(fmtS(l('seu programa em {c} desde {y}', 'your program in {c} since {y}'), { c: cname(st.prog.city), y: st.prog.since }), 'good')
      : btn(fmtS(l('Fundar programa de coral ({c})', 'Found a choir program ({c})'), { c: $(progCost19(s)) }), () => say(foundChoir19(s)))),
    section(t(l('Diário', 'Log')), st.log.length ? list(st.log) : muted(l('Nada ainda.', 'Nothing yet.'))));
}
function page(s: GameState): HTMLElement {
  const st = reg19(s);
  return h('div', null,
    h('h2', null, t(l('Regiões e política', 'Regions and politics'))),
    tabs('regions19', [
      { id: 'ind', label: t(l('Selos regionais', 'Regional labels')), badge: Object.keys(st.ind).length || undefined, render: () => indTab(s) },
      { id: 'com', label: t(l('Comuna e exílio', 'Commune and exile')), badge: Object.keys(st.com).length || undefined, render: () => comTab(s) },
      { id: 'visa', label: t(ERA19.visas(s)), render: () => visaTab(s) },
      { id: 'strike', label: t(l('Greves', 'Strikes')), badge: strikeActive(s) && !w4(s).union ? 1 : undefined, render: () => strikeTab(s) },
      { id: 'pol', label: t(l('Campanhas e leis', 'Campaigns and laws')), render: () => polTab(s) },
      { id: 'sch', label: t(l('Celeiros', 'Nurseries')), render: () => schTab(s) },
    ], rerender));
}
registerArea({ id: 'regions19', label: l('Regiões e política', 'Regions and politics'), icon: 'globe', key: '', render: page,
  badge: (s) => (strikeActive(s) && !w4(s).union && !reg19(s).stk.mode ? 1 : undefined) });
