// Rodada 19 (Frente 7, mercado B) — duas páginas:
//  • "Remix, anúncios e trilhas" (grupo Música): remix de catálogo e white labels, residências de DJ, publicidade e
//    medidor "vendido", canções-tema e needle drops, histórico.
//  • "Empresa: crises, seguros, cultura" (grupo Selo): ondas de cancelamento, seguro de pessoa-chave e plano de saúde
//    (+ o seguro patrimonial do links19b), cultura da empresa e treinamento, naming rights de casas e festivais.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { ADK19, CRED_MAX19, ad19, adOpen19, medium19 } from '../../sim/sys/adsync19';
import { CANCEL_FROM19, RESP19, comeback19, comebackCost19, cx19, respond19, type Resp19 } from '../../sim/sys/cancel19';
import { CUL19, CUL_CD19, avgLoy19, cul19, setCulture19, setTrain19, trainCost19, type Cul19 } from '../../sim/sys/culture19';
import { actualCulture27, cul27 } from '../../sim/sys/aud27/culture27';
import { KEYMAN_FROM19, cover19, ins19, insureKey19, keyPerson19, planCost19, premium19, setPlan19 } from '../../sim/sys/insure19';
import { buyIns19, insPrem19, l19b } from '../../sim/sys/links19b';
import { djFit18, ensureDjs18 } from '../../sim/sys/media18';
import { NAMING_FROM19, liveDeal19, nameBrands19, nameFee19, nm19, sellName19, targets19 } from '../../sim/sys/naming19';
import { RES19, djAct19, remix19, remixCostOf19, remixOdds19, remixable19, remixOpen19, resFee19, resOpen19, residency19, rmx19, whiteCost19, whiteLabel19, whiteOpen19 } from '../../sim/sys/remix19';
import { THMED19, awardOdds19, medsNow19, scr19 } from '../../sim/sys/score19';
import type { Act, GameState, Release } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false, cls = 'btn small') => h('button', { class: cls, disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const card = (...k: (Node | string | null)[]) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fmtS = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired');
const logList = (xs: [number, number, L][], n = 12) => (xs.length ? h('ul', { class: 'small' }, ...xs.slice(0, n).map(([y, m, x]) => h('li', null, `${y}/${m + 1} — ${t(x)}`))) : muted(l('Nada ainda.', 'Nothing yet.')));

// ================================================================ Remix, anúncios e trilhas
function remixTab(s: GameState): HTMLElement {
  if (!remixOpen19(s)) return muted(l('O remix de 12" nasce com a disco, em 1975. Até lá, o single é o que sai do estúdio.', 'The 12" remix is born with disco, in 1975. Until then, the single is what leaves the studio.'));
  const st = rmx19(s), djs = ensureDjs18(s).sort((a, b) => b.fame - a.fame).slice(0, 3);
  const rels = mine(s).flatMap((a) => a.releases.map((id) => s.releases[id])).filter((x): x is Release => remixable19(s, x)).sort((a, b) => (a.peak || 99) - (b.peak || 99) < 0 ? 1 : -1).slice(0, 8);
  const busy = new Set(st.rx.filter((x) => x.ok === undefined || (x.until ?? 0) > s.week).map((x) => x.rel));
  return h('div', null,
    muted(l('Remix de clube leva uma faixa antiga (3+ anos; fracassos contam história melhor) às pistas: sai em 1 mês, a chance depende do DJ, da faixa e do teste de white label. Se pegar: vendas por 4 meses, calor no sucesso tardio e convite de residência.', 'A club remix takes an old track (3+ years; flops tell a better story) to the dancefloor: out in 1 month, odds by DJ, track and the white-label test. If it catches: 4 months of sales, late-hit heat and a residency offer.')),
    rels.length ? h('div', null, ...rels.map((rel) => card(
      row(h('b', null, `"${rel.title}" (${rel.year})`), actLink(s, rel.actId), rel.peak ? pill(`#${rel.peak}`) : pill(t(l('fracasso', 'flop')), 'warn'), st.wl[rel.id] ? pill(fmtS(l('pista {v}', 'floor {v}'), { v: st.wl[rel.id][0] }), st.wl[rel.id][0] >= 60 ? 'good' : '') : null, busy.has(rel.id) ? pill(t(l('na pista', 'in the clubs')), 'good') : null),
      busy.has(rel.id) ? null : row(...djs.map((d) => why18(s, 'rmx19.odds', { rel: rel.id, dj: d.id }, btn(fmtS(l('{d} ({c}, {p}%)', '{d} ({c}, {p}%)'), { d: d.name, c: $(remixCostOf19(s, d)), p: Math.round(remixOdds19(s, rel, d).p * 100) }), () => say(remix19(s, rel.id, d.id)), false, `btn small${djFit18(s, d, rel) >= 1 ? ' primary' : ''}`))),
        whiteOpen19(s) ? btn(fmtS(l('White label ({c})', 'White label ({c})'), { c: $(whiteCost19(s)) }), () => say(whiteLabel19(s, rel.id))) : null)))) : muted(l('Nenhuma faixa sua com 3+ anos.', 'No track of yours 3+ years old.')),
    section(t(l('Residências de DJ', 'DJ residencies')),
      h('ul', { class: 'small' }, ...resOpen19(s).map((k) => h('li', null, h('b', null, T(RES19[k].name)), RES19[k].sea ? ` (${t(l('temporada', 'season'))} ${RES19[k].sea![0] + 1}–${RES19[k].sea![1] + 1})` : '', ' — ', T(RES19[k].real)))),
      ...mine(s).filter((a) => djAct19(s, a)).map((a) => row(actLink(s, a.id), ...resOpen19(s).map((k) => btn(fmtS(l('{v}: {f}/mês', '{v}: {f}/mo'), { v: t(RES19[k].name), f: $(resFee19(s, k, a)) }), () => say(residency19(s, a.id, k)), st.res.some((x) => x.act === a.id && x.until > s.week))))),
      st.res.filter((x) => x.until > s.week).length ? h('ul', { class: 'small' }, ...st.res.filter((x) => x.until > s.week).map((x) => h('li', null, `${s.acts[x.act]?.name ?? '?'} — ${t(RES19[x.v].name)}: ${$(x.fee)}/${t(l('mês', 'mo'))}, ${t(l('ganho', 'earned'))} ${$(x.earned)}`))) : muted(l('Ato com DJ, remix que pegou ou nº 1 nas pistas pode ser residente.', 'An act with a DJ, a remix that caught on or a club No. 1 can take a residency.'))));
}
function adTab(s: GameState): HTMLElement {
  const st = ad19(s);
  return h('div', null,
    muted(fmtS(l('Marcas oferecem jingles, faixas em comerciais e (2001+) o lançamento de desconhecidos — pela Caixa. Mídia da época: {m}. Cada anúncio enche o medidor "vendido" do ato; com {x}+ os puristas se revoltam. Cancelamento aciona a cláusula de conduta.', 'Brands offer jingles, tracks in ads and (2001+) launching unknowns — via the Inbox. Medium of the era: {m}. Each ad fills the act\'s "sell-out" meter; at {x}+ purists revolt. A cancellation triggers the conduct clause.'), { m: t(medium19(s)), x: CRED_MAX19 })),
    h('ul', { class: 'small' }, ...(Object.keys(ADK19) as (keyof typeof ADK19)[]).map((k) => h('li', { style: adOpen19(s, k) ? '' : 'opacity:.5' }, h('b', null, T(ADK19[k].name)), ` (${ADK19[k].from}+) — `, T(ADK19[k].desc)))),
    section(t(l('Medidor "vendido"', '"Sell-out" meter')), mine(s).length ? h('ul', { class: 'small' }, ...mine(s).map((a) => h('li', null, actLink(s, a.id), ' ', why18(s, 'ad19.cred', { act: a.id }, `${Math.round(st.cred[a.id] ?? 0)}/${CRED_MAX19}`)))) : muted(l('Sem atos.', 'No acts.'))),
    section(t(l('Campanhas', 'Campaigns')), st.runs.length ? h('ul', { class: 'small' }, ...st.runs.slice(-12).reverse().map((x) => h('li', null, `${x.y} — ${x.brand}: ${s.acts[x.act]?.name ?? '?'} (${t(ADK19[x.k].name)}) ${$(x.fee)}`, x.off ? '' : ` · ${t(l('no ar', 'on air'))}`))) : muted(l('Nenhuma campanha ainda.', 'No campaigns yet.'))));
}
function scoreTab(s: GameState): HTMLElement {
  const st = scr19(s);
  return h('div', null,
    muted(l('Estúdios e emissoras pedem canções-tema (pela Caixa): original concorre a prêmio de cinema/TV; existente é licença. A estreia vira cena na Cinemateca. Supervisores pedem faixas do seu catálogo para cenas (needle drop): faixa com 10+ anos pode voltar às paradas. Trilhas sob encomenda continuam na página de Cinema/TV.', 'Studios and networks ask for theme songs (via the Inbox): an original competes for film/TV awards; an existing one is a licence. The premiere becomes a scene in the Cinematheque. Supervisors ask for catalogue tracks for scenes (needle drop): a track 10+ years old may return to the charts. Commissioned scores stay on the Film/TV page.')),
    h('ul', { class: 'small' }, ...medsNow19(s).map((m) => h('li', null, h('b', null, T(THMED19[m].name)), ` — ${t(THMED19[m].aw)} (${THMED19[m].awFrom}+)`))),
    section(t(l('Canções-tema', 'Theme songs')), st.th.length ? h('div', null, ...st.th.slice(-10).reverse().map((x) => card(row(h('b', null, `"${t(x.t)}"`), pill(T(THMED19[x.med].name)), actLink(s, x.act), pill(x.k === 'orig' ? t(l('original', 'original')) : t(l('licença', 'licence'))),
      x.box === undefined ? pill(fmtS(l('estreia em {w} sem.', 'premiere in {w} wk'), { w: x.prem - s.week })) : pill(fmtS(l('bilheteria {b}%', 'box office {b}%'), { b: Math.round(x.box * 100) }), x.box >= 0.6 ? 'good' : ''),
      x.won ? pill(t(l('premiada', 'won')), 'good') : x.nom ? pill(t(l('indicada', 'nominated')), 'good') : x.k === 'orig' ? why18(s, 'sc19.award', { th: x.id }, fmtS(l('chance de indicação {p}%', 'nomination odds {p}%'), { p: Math.round(awardOdds19(s, x).p * 100) })) : null)))) : muted(l('Nenhuma canção-tema ainda.', 'No theme songs yet.'))),
    section(t(l('Needle drops', 'Needle drops')), st.nd.length ? h('ul', { class: 'small' }, ...st.nd.slice(-12).reverse().map((x) => h('li', null, `${x.y} — "${s.releases[x.rel]?.title ?? '?'}" (${s.acts[s.releases[x.rel]?.actId ?? '']?.name ?? '?'}) · ${x.who}${x.fee ? ` · ${$(x.fee)}` : ''}`))) : muted(l('Nenhum ainda.', 'None yet.'))));
}
function mediaHist(s: GameState): HTMLElement {
  const r = rmx19(s), a = ad19(s), c = scr19(s);
  return h('div', null, row(...Object.entries({ ...r.n, ...a.n, ...c.n }).map(([k, v]) => pill(`${k}: ${v}`))),
    section(t(l('Remix e DJs', 'Remix and DJs')), logList(r.log)), section(t(l('Publicidade', 'Advertising')), logList(a.log)), section(t(l('Trilhas', 'Scores')), logList(c.log)));
}
registerArea({ id: 'media19', label: l('Remix, anúncios e trilhas', 'Remixes, ads and scores'), icon: 'disc', key: '',
  render: (s) => h('div', null, h('h2', null, t(l('Remix, anúncios e trilhas', 'Remixes, ads and scores'))), tabs('media19', [
    { id: 'remix', label: t(l('Remix e DJs', 'Remix and DJs')), badge: rmx19(s).rx.filter((x) => x.ok === undefined && mine(s).some((a) => a.id === s.releases[x.rel]?.actId)).length || undefined, render: () => remixTab(s) },
    { id: 'ads', label: t(l('Publicidade', 'Advertising')), render: () => adTab(s) },
    { id: 'score', label: t(l('Trilhas e needle drops', 'Scores and needle drops')), render: () => scoreTab(s) },
    { id: 'hist', label: t(l('Histórico', 'History')), render: () => mediaHist(s) },
  ], rerender)) });

// ================================================================ Empresa: crises, seguros, cultura
function cancelTab(s: GameState): HTMLElement {
  const st = cx19(s);
  if (s.year < CANCEL_FROM19) return muted(l('Ainda não existem ondas de cancelamento em rede: nesta época as crises seguem o ritmo dos jornais (página Mídia).', 'There are no online cancel waves yet: in this era crises follow the pace of newspapers (Media page).')); // r19 ux19: sem data do futuro
  const act = st.w.filter((x) => x.over === undefined), past = st.w.filter((x) => x.over !== undefined).slice(-8).reverse();
  return h('div', null,
    muted(l('Escândalo público com alcance vira onda: pico no 1º mês, janela de 2 semanas para responder. Desculpas cedo cortam pela metade; silêncio esfria devagar; contra-atacar é aposta. Acima de 50 o ato fica "cancelado": marcas saem e cláusulas de conduta cobram.', 'A public scandal with reach becomes a wave: peak in month 1, a 2-week window to respond. An early apology halves it; silence cools slowly; hitting back is a gamble. Above 50 the act is "cancelled": brands leave and conduct clauses bite.')),
    act.length ? h('div', null, ...act.map((x) => card(row(actLink(s, x.act), why18(s, 'cx19.wave', { wave: x.id }, fmtS(l('intensidade {i} (pico {p})', 'intensity {i} (peak {p})'), { i: x.int, p: x.peak })), x.resp ? pill(T(RESP19[x.resp].name)) : pill(t(l('sem resposta', 'no response')), 'bad'), s.week <= x.win && !x.resp ? pill(t(l('janela aberta', 'window open')), 'warn') : null),
      row(T(x.why)),
      !x.resp && mine(s).some((a) => a.id === x.act) ? row(...(Object.keys(RESP19) as Resp19[]).map((k) => h('span', { title: t(RESP19[k].desc) }, btn(RESP19[k].name, () => say(respond19(s, x.id, k)))))) : null))) : muted(l('Nenhuma onda agora.', 'No wave right now.')),
    past.length ? section(t(l('Ondas passadas', 'Past waves')), h('div', null, ...past.map((x) => row(`${x.y} — `, actLink(s, x.act), fmtS(l(' {m} meses, {n} fãs perdidos', ' {m} months, {n} fans lost'), { m: x.mo, n: x.lost.toLocaleString('en-US') }), x.back ? pill(t(l('voltou', 'came back')), 'good') : mine(s).some((a) => a.id === x.act) ? btn(fmtS(l('Planejar retorno ({c})', 'Plan comeback ({c})'), { c: $(comebackCost19(s)) }), () => say(comeback19(s, x.id))) : null)))) : null,
    section(t(l('Diário', 'Log')), logList(st.log)));
}
function insTab(s: GameState): HTMLElement {
  const st = ins19(s), pc = planCost19(s), prop = l19b(s).ins;
  return h('div', null,
    muted(l('Pessoa-chave: se a estrela morre, a cobertura inteira entra; colapso, internação ou doença pagam 20% (1 por ano) e encarecem o prêmio. Herdeiros podem achar que o selo lucrou com a morte. Plano de saúde: estresse do elenco cai, esgotados se recuperam, confiança e lealdade sobem, artistas aceitam mais.', 'Key person: if the star dies, the full cover pays; a breakdown, rehab or illness pays 20% (once a year) and raises the premium. Heirs may feel the label profited from the death. Health plan: roster stress falls, burnt-out people recover, trust and loyalty rise, artists accept more.')),
    s.year < KEYMAN_FROM19 ? muted(l('Ainda não há seguro de pessoa-chave nesta época.', 'No key-person cover exists yet in this era.')) : h('div', null, ...mine(s).filter((a) => !a.playerBand).map((a) => {
      const p = st.pol.find((x) => x.act === a.id), kp = keyPerson19(s, a);
      return card(row(actLink(s, a.id), kp ? ` · ${kp.name}` : '', p ? why18(s, 'ins19.prem', { act: a.id }, fmtS(l('cobertura {c}, {v}/mês', '{c} cover, {v}/mo'), { c: $(p.cover), v: $(p.prem) })) : pill(t(l('sem seguro', 'uninsured')), a.fame >= 45 ? 'warn' : '')),
        row(...([1, 2, 3] as const).map((tr) => btn(fmtS(l('Faixa {t}: {c} por {v}/mês', 'Tier {t}: {c} for {v}/mo'), { t: tr, c: $(cover19(s, a, tr)), v: $(premium19(s, a, tr, p?.claims ?? 0).v) }), () => say(insureKey19(s, a.id, tr)), p?.tier === tr)), p ? btn(l('Cancelar', 'Cancel'), () => say(insureKey19(s, a.id, 0))) : null));
    })),
    section(t(l('Plano de saúde', 'Health plan')), row(why18(s, 'ins19.plan', {}, fmtS(l('{n} pessoas · {v}/mês', '{n} people · {v}/mo'), { n: pc.n, v: $(pc.v) })), btn(st.plan ? l('Cancelar o plano', 'Cancel the plan') : l('Dar plano de saúde', 'Provide a health plan'), () => say(setPlan19(s, !st.plan))))),
    section(t(l('Seguro patrimonial (prédios)', 'Property insurance (buildings)')), row(prop ? fmtS(l('Ativo: {v}/mês, {n} sinistros', 'Active: {v}/mo, {n} claims'), { v: $(prop.prem), n: prop.claims }) : fmtS(l('Sem seguro: {v}/mês cobre 75% da reforma', 'Uninsured: {v}/mo covers 75% of repairs'), { v: $(insPrem19(s)) }), btn(prop ? l('Cancelar', 'Cancel') : l('Contratar', 'Buy'), () => say(buyIns19(s, !prop))))),
    section(t(l('Diário', 'Log')), logList(st.log)));
}
function cultureTab(s: GameState): HTMLElement {
  const st = cul19(s), wait = st.c ? Math.max(0, CUL_CD19 - (s.week - st.since)) : 0;
  return h('div', null,
    muted(l('A cultura puxa todo mês a lealdade da equipe (abaixo de 25 a pessoa sai), a confiança e o humor do elenco e a aceitação das suas propostas. Trocar abala a equipe (−6) e só pode a cada 12 meses.', 'The culture pulls staff loyalty every month (below 25 people quit), roster trust and mood, and how readily your offers are accepted. Changing it shakes staff (−6) and is allowed every 12 months.')),
    row(why18(s, 'cul19', {}, fmtS(l('Cultura: {c} · lealdade média da equipe {v}', 'Culture: {c} · average staff loyalty {v}'), { c: st.c ? t(CUL19[st.c].name) : '—', v: avgLoy19(s) })), wait ? pill(fmtS(l('troca em {w} sem.', 'change in {w} wk'), { w: wait }), 'warn') : null),
    // r27 AUD2: a cultura de fato nasce das decisões; o menu declara (e empurra devagar)
    row(why18(s, 'cul27', {}, fmtS(l('De fato: {a} · declarada: {d}', 'Actual: {a} · declared: {d}'), { a: actualCulture27(s) ? t(CUL19[actualCulture27(s)!].name) : t(l('ainda indefinida', 'not settled yet')), d: cul27(s).decl ? t(CUL19[cul27(s).decl!].name) : '—' })),
      cul27(s).gap ? pill(t(l('a equipe nota a distância', 'staff notice the gap')), 'warn') : null),
    muted(l('A cultura de fato soma o tom das suas decisões (generosas, arriscadas, duras, cautelosas), o perfil e o estilo de liderança do selo e a balança da reputação. Se outra domina por 3 meses, a casa muda sozinha. Adotar abaixo é declarar: empurra devagar, e falar uma coisa e fazer outra cansa a equipe.', 'The actual culture adds up the tone of your decisions (generous, risky, tough, cautious), the label\'s profile and leadership style and the reputation balance. If another one dominates for 3 months, the house changes on its own. Adopting below is declaring: it pushes slowly, and saying one thing while doing another wears the staff down.')),
    h('div', null, ...(Object.keys(CUL19) as Cul19[]).map((c) => card(row(h('b', null, T(CUL19[c].name)), st.c === c ? pill(t(l('atual', 'current')), 'good') : btn(l('Adotar', 'Adopt'), () => say(setCulture19(s, c)), !!wait)), muted(CUL19[c].desc), muted(CUL19[c].real)))),
    section(t(l('Treinamento da equipe', 'Staff training')), row(fmtS(l('{v}/mês para {n} pessoas: habilidade +0,15 e lealdade +0,4 por mês; evita os erros do caos.', '{v}/mo for {n} people: skill +0.15 and loyalty +0.4 a month; prevents chaos errors.'), { v: $(trainCost19(s)), n: s.player.staff.length }), btn(st.train ? l('Desligar', 'Turn off') : l('Ligar', 'Turn on'), () => { setTrain19(s, !st.train); rerender(); }))),
    section(t(l('Diário', 'Log')), logList(st.log)));
}
function namingTab(s: GameState): HTMLElement {
  const st = nm19(s), tg = targets19(s), bs = nameBrands19(s).sort((a, b) => b.budget - a.budget).slice(0, 3);
  return h('div', null,
    muted(fmtS(l('Venda o nome da sua {w}: caixa fixo por ano, mas a reputação cai com os puristas. Cláusula de conduta: escândalo do selo, cancelamento do artista da casa ou incidente com o público e a marca sai.', 'Sell the name of your {w}: fixed yearly cash, but reputation drops with purists. Conduct clause: a label scandal, the house artist\'s cancellation or a crowd incident and the brand walks.'), { w: t(s.year >= NAMING_FROM19.f ? l('casa ou do seu festival', 'venue or festival') : l('casa de shows', 'venue')) })), // r19 ux19: sem ano do futuro
    tg.length ? h('div', null, ...tg.map((x) => { const d = liveDeal19(s, x.k, x.id);
      return card(row(h('b', null, x.name), pill(x.k === 'v' ? t(l('casa', 'venue')) : t(l('festival', 'festival'))), pill(fmtS(l('reputação {r}', 'reputation {r}'), { r: Math.round(x.rep) })), d ? pill(fmtS(l('"{b}" até {y}', '"{b}" until {y}'), { b: d.bname, y: s.year + Math.ceil((d.until - s.week) / 52) }), 'good') : null),
        d ? null : row(...bs.map((b) => why18(s, 'nm19.fee', { k: x.k, id: x.id, b: b.id }, btn(fmtS(l('{b}: {v}/ano (3 anos)', '{b}: {v}/yr (3 years)'), { b: b.name, v: $(nameFee19(s, x, b).v) }), () => say(sellName19(s, x.k, x.id, b.id, 3)))))));
    })) : muted(l('Você não tem casa nem festival próprio nesta época.', 'You own no venue or festival in this era.')),
    st.d.length ? section(t(l('Contratos', 'Deals')), h('ul', { class: 'small' }, ...st.d.slice(-10).reverse().map((x) => h('li', null, `${x.bname} — ${$(x.fee)}/${t(l('ano', 'yr'))}, ${t(l('pago', 'paid'))} ${$(x.paid)}${x.pulled ? ` · ${t(l('marca saiu', 'brand left'))}: ${x.why ? t(x.why) : ''}` : ''}`)))) : null,
    section(t(l('Diário', 'Log')), logList(st.log)));
}
registerArea({ id: 'firm19', label: l('Crises, seguros e cultura', 'Crises, insurance and culture'), icon: 'building', key: '',
  badge: (s) => cx19(s).w.filter((x) => x.over === undefined && !x.resp && mine(s).some((a) => a.id === x.act)).length || undefined,
  render: (s) => h('div', null, h('h2', null, t(l('Crises, seguros e cultura', 'Crises, insurance and culture'))), tabs('firm19', [
    { id: 'cancel', label: t(l('Cancelamento', 'Cancellation')), render: () => cancelTab(s) },
    { id: 'ins', label: t(l('Seguros e saúde', 'Insurance and health')), render: () => insTab(s) },
    { id: 'culture', label: t(l('Cultura', 'Culture')), render: () => cultureTab(s) },
    { id: 'naming', label: t(l('Naming rights', 'Naming rights')), render: () => namingTab(s) },
  ], rerender)) });
