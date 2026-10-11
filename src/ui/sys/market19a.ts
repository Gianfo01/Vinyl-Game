// Rodada 19 (onda 3, T6 — Frente 7, mercado A): página "Mercado: certificados e cenas" — certificações por país e época
// (auditoria, contar pacotes), pesquisa de mercado (teste de faixa por método da época), ciclo de vida das cenas,
// plataformas (faixas sem rosto) e promotora 360, fusões com remédio antitruste (leilão).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  BID19, CB19, PH19, PLAT19, PROMO19, TEST19, answer360, audit19, auditAll19, auditFee19, bid19, bodies19, bodyOf19, ghost19, ghostFee19, matchCost19,
  mka19, pickTest19, sceneName19, streamYear19, test19, testCands19, testCost19, testMethods19, testSd19, thOf19, tierName19, type TestM19,
} from '../../sim/sys/market19a';
import type { MarketId } from '../../data/world';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
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
const n = (v: number) => v.toLocaleString('en-US');

function certTab(s: GameState): HTMLElement {
  const st = mka19(s), pend = Object.entries(st.pend);
  const mine = Object.entries(st.c).filter(([id]) => s.releases[id]?.owner === 'player').slice(0, 30);
  return h('div', null,
    muted(l('Cada país tem sua entidade, seus patamares e o ano em que streams passam a contar (EUA: singles em 2013, álbuns em 2016). A entidade só certifica depois de uma auditoria paga pelo selo. "Contar pacotes" sobe um degrau, mas pode ser revogado.', 'Each country has its own body, thresholds and the year streams start to count (US: singles in 2013, albums in 2016). The body only certifies after an audit paid by the label. "Count bundles" claims one tier more, but may be revoked.')),
    section(t(l('Esperando auditoria', 'Awaiting audit')), pend.length ? h('div', null,
      row(btn(l('Pagar todas', 'Pay all'), () => say(auditAll19(s))), btn(l('Contar pacotes em todas', 'Count bundles on all'), () => say(auditAll19(s, true)))),
      ...pend.map(([k, lv]) => { const [rid, mk] = k.split('|'); const r = s.releases[rid], b = bodyOf19(mk as MarketId);
        return row(h('b', null, `"${r?.title ?? '?'}"`), r ? actLink(s, r.actId) : null, pill(b?.id.toUpperCase() ?? mk), why18(s, 'mka19.cert', { rel: rid, mk }, T(tierName19(lv))),
          btn(fmtS(l('Auditoria ({v})', 'Audit ({v})'), { v: $(auditFee19(s, lv)) }), () => say(audit19(s, k))), btn(l('Contar pacotes', 'Count bundles'), () => say(audit19(s, k, true)))); })) : muted(l('Nada esperando.', 'Nothing waiting.'))),
    section(t(l('Suas placas', 'Your plaques')), mine.length ? h('ul', { class: 'small' }, ...mine.map(([id, c]) => h('li', null, `"${s.releases[id]?.title ?? '?'}" — `,
      ...Object.entries(c).map(([mk, lv]) => why18(s, 'mka19.cert', { rel: id, mk }, `${bodyOf19(mk as MarketId)?.id.toUpperCase()} ${T(tierName19(lv ?? 0))}${st.inf[`${id}|${mk}`] ? ' ⚠' : ''}  `))))) : muted(l('Nenhuma ainda.', 'None yet.'))),
    section(t(l('Entidades da época', 'Bodies of the era')), h('ul', { class: 'small' }, ...bodies19(s).map((b) => { const a = thOf19(b, s.year, 'lp'), sg = thOf19(b, s.year, 'single');
      return h('li', null, h('b', null, T(b.name)), ` (${b.mk}) — ${t(l('álbum', 'album'))} ${a.map((v) => (v ? n(v) : '—')).join(' / ')} · single ${sg.map((v) => (v ? n(v) : '—')).join(' / ')} · streams: ${t(l('singles', 'singles'))} ${streamYear19(b, 'single')}, ${t(l('álbuns', 'albums'))} ${streamYear19(b, 'lp')}`, h('br'), h('span', { class: 'muted' }, b.ref)); })),
      bodies19(s).length < CB19.length ? muted(l('Outras entidades nascem mais tarde.', 'Other bodies are founded later.')) : null));
}
function testTab(s: GameState): HTMLElement {
  const st = mka19(s), ms = testMethods19(s);
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && testCands19(s, a.id).length >= 2);
  return h('div', null,
    muted(l('Antes de escolher o single, teste as inéditas. Cada método da época tem custo, erro, viés e risco de vazar. A escolha boa rende +7% nas paradas; a ruim, +2% (marketing focado). A banda pode discordar.', 'Before picking the single, test the unreleased songs. Each era method has cost, error, bias and leak risk. A good pick earns +7% on the charts; a bad one +2% (focused marketing). The band may disagree.')),
    ms.length ? h('ul', { class: 'small' }, ...ms.map((m) => h('li', null, h('b', null, T(TEST19[m].name)), ` — ${$(testCost19(s, m))} · `, why18(s, 'mka19.test', { m }, `±${testSd19(s, m)}`), ` · ${T(TEST19[m].desc)}`))) : muted(l('Ainda não há pesquisa de mercado (1935+).', 'No market research yet (1935+).')),
    acts.length ? h('div', null, ...acts.map((a) => card(row(actLink(s, a.id), muted(fmtS(l('{n} inéditas', '{n} unreleased'), { n: testCands19(s, a.id).length }))), row(...ms.map((m: TestM19) => btn(T(TEST19[m].name), () => say(test19(s, a.id, m).text))))))) : muted(l('Nenhum ato seu com 2+ canções inéditas.', 'None of your acts has 2+ unreleased songs.')),
    section(t(l('Testes recentes', 'Recent tests')), st.t.length ? h('div', null, ...st.t.slice(0, 8).map((x) => card(
      row(actLink(s, x.act), pill(T(TEST19[x.m].name)), x.leak ? pill(t(l('vazou', 'leaked')), 'bad') : null, x.how ? pill(x.how === 'follow' ? t(l('seguiu a pesquisa', 'followed research')) : t(l('instinto', 'gut')), 'good') : null),
      h('div', { class: 'small' }, x.res.map(([id, v]) => `"${s.songs[id]?.title ?? '?'}" ${v}`).join(' · ')),
      !x.pick ? row(btn(l('Seguir a pesquisa', 'Follow the research'), () => say(pickTest19(s, x.id, 'follow'))), btn(l('Ir com a banda', 'Go with the band'), () => say(pickTest19(s, x.id, 'gut')))) : muted(fmtS(l('Single: "{s}"', 'Single: "{s}"'), { s: s.songs[x.pick]?.title ?? '?' }))))) : muted(l('Nenhum.', 'None.'))));
}
function sceneTab(s: GameState): HTMLElement {
  const xs = Object.values(mka19(s).sc).sort((a, b) => b.ph - a.ph || b.h - a.h);
  return h('div', null,
    muted(l('Cenas nascem, viram hype, atraem a corrida das majors (adiantamentos inflados), saturam, entram em ressaca (a cena vira turismo: shows na cidade +8%) e, anos depois, podem renascer. Na corrida: assinar barato cedo, vender uma fatia do braço local ou ficar independente.', 'Scenes are born, become hype, draw the majors\' rush (inflated advances), saturate, hit the hangover (the scene becomes tourism: shows in the city +8%) and, years later, may be reborn. In the rush: sign cheap early, sell a stake of your local arm or stay independent.')),
    xs.length ? h('div', null, ...xs.map((x) => card(row(why18(s, 'mka19.scene', { k: x.k }, h('b', null, T(sceneName19(x.k)))), pill(T(PH19[x.ph]), x.ph === 2 ? 'good' : x.ph >= 3 && x.ph <= 4 ? 'bad' : undefined),
      muted(fmtS(l('calor {h} · pico {p} · {g} assinaturas das majors · desde {y}', 'heat {h} · peak {p} · {g} majors\' signings · since {y}'), { h: Math.round(x.h), p: Math.round(x.pk), g: x.sg, y: x.first })))))) : muted(l('Nenhuma cena em observação.', 'No scene under watch.')));
}
function platTab(s: GameState): HTMLElement {
  const st = mka19(s), offers = Object.values(st.p360);
  return h('div', null,
    section(T(PLAT19), s.year < 2015 ? muted(l('Playlists de humor com faixas sem rosto só a partir de 2015.', 'Mood playlists with faceless tracks only from 2015.')) : h('div', null,
      muted(fmtS(l('Faixas sem rosto ocupam ~{p}% das playlists de humor: ambient, lo-fi, clássico e trip hop rendem menos. (Alegações de reportagens reais tratadas como ficção; plataforma fictícia.)', 'Faceless tracks take ~{p}% of mood playlists: ambient, lo-fi, classical and trip hop earn less. (Allegations from real reporting treated as fiction; fictional platform.)'), { p: Math.round(st.ghN * 100) })),
      st.gh ? muted(fmtS(l('Seu selo vende {n} faixas por ano ({v}).{o}', 'Your label sells {n} tracks a year ({v}).{o}'), { n: st.gh.tracks, v: $(ghostFee19(s)), o: st.gh.out ? t(l(' Vazou em ', ' Leaked in ')) + st.gh.out : '' }))
        : row(btn(fmtS(l('Oferecer faixas ({v}/ano)', 'Offer tracks ({v}/year)'), { v: $(ghostFee19(s)) }), () => say(ghost19(s, 'accept'))), btn(l('Denunciar à imprensa', 'Expose to the press'), () => say(ghost19(s, 'expose')), (st.ghCold ?? 0) > s.week)))),
    section(T(PROMO19), s.year < 2007 ? muted(l('Contratos 360 de promotora só a partir de 2007.', 'Promoter 360 deals only from 2007.')) : offers.length ? h('div', null, ...offers.map((p) => { const a = s.acts[p.act];
      return card(row(actLink(s, p.act), pill(p.k ? T({ match: l('coberto', 'matched'), partner: l('dividido', 'split'), let: l('sai', 'leaving') }[p.k]) : t(l('pendente', 'pending')), p.k === 'let' ? 'bad' : undefined), muted(fmtS(l('fim do contrato em {w} sem.', 'contract ends in {w} wks'), { w: Math.max(0, p.end - s.week) }))),
        !p.k && a ? row(btn(fmtS(l('Cobrir ({v})', 'Match ({v})'), { v: $(matchCost19(s, a)) }), () => say(answer360(s, p.act, 'match'))), btn(l('Dividir', 'Split'), () => say(answer360(s, p.act, 'partner'))), btn(l('Deixar sair', 'Let go'), () => say(answer360(s, p.act, 'let')))) : null); })) : muted(l('Nenhuma estrela sua com oferta de promotora.', 'None of your stars has a promoter offer.'))));
}
function antiTab(s: GameState): HTMLElement {
  const xs = mka19(s).anti;
  return h('div', null,
    muted(l('Fusão que passa do limiar do regulador (1998–2013: 12% do mercado; antes 30%, depois 20%) é aprovada com remédio: parte do catálogo vai a leilão. Lance alto vence ~85%, justo ~55%, baixo ~25% (menos com rival rico na disputa). Contestar custa advogados e pode aumentar o lote.', 'A merger above the regulator threshold (1998–2013: 12% of the market; before 30%, after 20%) is cleared with a remedy: part of the catalog goes to auction. High bid wins ~85%, fair ~55%, low ~25% (less with a rich rival bidding). Contesting costs lawyers and may enlarge the lot.')),
    xs.length ? h('div', null, ...xs.map((x) => card(row(h('b', null, s.labels[x.b]?.name ?? '?'), pill(`${x.y}`), pill(x.st === 'open' ? t(l('aberto', 'open')) : x.st === 'won' ? t(l('seu', 'yours')) : x.st === 'rival' ? (s.labels[x.to ?? '']?.name ?? '?') : t(l('fundo', 'fund')), x.st === 'won' ? 'good' : undefined),
      muted(fmtS(l('{n} masters · avaliação {v}{b}', '{n} masters · valued {v}{b}'), { n: x.rels.length, v: $(x.price), b: x.bid ? ` · ${t(l('seu lance', 'your bid'))} ${$(x.bid)}` : '' }))),
      x.st === 'open' ? row(...(Object.keys(BID19) as (keyof typeof BID19)[]).map((k) => btn(`${T({ high: l('Alto', 'High'), fair: l('Justo', 'Fair'), low: l('Baixo', 'Low') }[k])} ${$(Math.round(x.price * BID19[k][0]))}`, () => say(bid19(s, x.id, k)))), btn(l('Contestar', 'Contest'), () => say(bid19(s, x.id, 'contest')))) : null))) : muted(l('Nenhuma fusão sob revisão.', 'No merger under review.')));
}
function page(s: GameState): HTMLElement {
  const st = mka19(s);
  return h('div', null,
    h('h2', null, t(l('Mercado: certificados e cenas', 'Market: certifications and scenes'))),
    tabs('market19a', [
      { id: 'cert', label: t(l('Certificados', 'Certifications')), badge: Object.keys(st.pend).length || undefined, render: () => certTab(s) },
      { id: 'test', label: t(l('Pesquisa', 'Research')), render: () => testTab(s) },
      { id: 'scene', label: t(l('Cenas', 'Scenes')), badge: Object.values(st.sc).filter((x) => x.ph === 2).length || undefined, render: () => sceneTab(s) },
      { id: 'plat', label: t(l('Plataformas e 360', 'Platforms and 360')), badge: Object.values(st.p360).filter((p) => !p.k).length || undefined, render: () => platTab(s) },
      { id: 'anti', label: t(l('Fusões', 'Mergers')), badge: st.anti.filter((x) => x.st === 'open').length || undefined, render: () => antiTab(s) },
    ], rerender),
    section(t(l('Histórico', 'History')), st.log.length ? h('ul', { class: 'small' }, ...st.log.slice(0, 12).map(([y, m, x]) => h('li', null, `${y}/${m + 1} — ${t(x)}`))) : muted(l('Nada ainda.', 'Nothing yet.'))));
}
registerArea({ id: 'market19a', label: l('Mercado: certificados e cenas', 'Market: certifications and scenes'), icon: 'chart', key: '', render: page,
  badge: (s) => (Object.keys(mka19(s).pend).length + mka19(s).anti.filter((x) => x.st === 'open' && !x.bid).length + Object.values(mka19(s).p360).filter((p) => !p.k).length) || undefined });
