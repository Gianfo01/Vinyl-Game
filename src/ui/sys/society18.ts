// Rodada 18 (society18) — páginas das carreiras Trilhas e palco (cp17-screen) e Jornalismo (cp17-critic), e a área
// Mundo › Sociedade (prêmios, paradas, IA, censura, filantropia, cidade da música). Todo número com "por quê" (explain18).

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { careers } from '../../sim/sys/careers12';
import { AIMODE18, ai18, canClone18, cloneTerms18, joinSuit18, licenseClone18, modeOf18, platformPolicy18, setAiMode18, type AiMode18 } from '../../sim/sys/ai18';
import { CAMP18, RULES18, aw18, bundle18, bundleCost18, bundlesOk18, campaign18, fycScore18, lobbyReform18, lobbyRule18, ruleDate18, rulesDebated18, rulesNow18, voters18, type Camp18 } from '../../sim/sys/awards18';
import { aiEra } from '../../sim/sys/consent8';
import { specShown18 } from '../../sim/sys/eras18';
import { ALT_NOTE18, altHist18 } from '../../sim/sys/feud18';
import { OUTK18, STAGE18, foundOutlet18, influence18, pr18, queue18, review18, type OutK18 } from '../../sim/sys/press18';
import { AP18, MED18, STYLE18, acceptComm18, composers18, coproduce18, copCost18, declineComm18, sc18, skill18, type Ap18 } from '../../sim/sys/screen18';
import { CHRON18, CAUSES18, FMT18, REGIMES18, applyUnesco18, buildMuseum18, causesNow18, censorOdds18, cityScore18, invite18, joinOdds18, lobbyCouncil18, museumCost18, regimeAt18, routeCost18, soc18, startCharity18, tourismMonth18 } from '../../sim/sys/society18';
import { countryOfCity } from '../../data/geo';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { why18 } from '../explain18';
import { registerArea } from '../registry';
import { tabs } from '../vis';
import { CP_TABS18, CP_VIS18 } from './careerpages17';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok: L = l('Feito.', 'Done.')) => { toast(T(r ?? ok), r ? 'info' : 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false, cls = 'btn small') => h('button', { class: cls, disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const card = (...k: (Node | string | null)[]) => h('div', { class: 'card', style: 'margin:6px 0;padding:8px' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const logList = (xs: { y: number; t: L }[]) => (xs.length ? h('ul', { class: 'small' }, ...xs.slice(0, 10).map((x) => h('li', null, `${x.y} — ${t(x.t)}`))) : muted(l('Nada ainda.', 'Nothing yet.')));
const fmtS = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));

// ---------------------------------------------------------------- Trilhas e palco
const pick: Record<string, { who?: string; ap: Ap18 }> = {};
function screenTab(s: GameState): HTMLElement {
  const st = sc18(s), comps = composers18(s);
  const offers = st.list.filter((c) => c.st === 'offer');
  const work = st.list.filter((c) => c.st === 'work' || c.st === 'late');
  const done = st.list.filter((c) => c.st === 'done' || c.st === 'rejected').slice(-12).reverse();
  return h('div', null,
    row(pill(fmtS(l('reputação {r}', 'reputation {r}'), { r: Math.round(st.rep) }), st.rep >= 50 ? 'good' : ''), pill(fmtS(l('ganhos {v}', 'earnings {v}'), { v: $(st.earned) })), pill(fmtS(l('{n} indicações · {w} prêmios', '{n} nominations · {w} awards'), { n: st.noms, w: st.wins }), st.wins ? 'gold' : '')),
    careers(s).active.includes('screen') ? null : muted(l('Assuma a carreira para receber encomendas com frequência (astros famosos do elenco recebem algumas mesmo assim).', 'Take up the career to get commissions regularly (famous roster stars get a few anyway).')),
    section(t(l('Encomendas na mesa', 'Commissions on the table')), ...(offers.length ? offers.map((c) => {
      const p = (pick[c.id] ??= { who: comps[0]?.id, ap: c.style === 'meddler' ? 'temp' : c.style === 'auteur' ? 'bold' : 'orch' });
      return card(row(h('b', null, c.title), pill(t(MED18[c.med].name)), pill(fmtS(l('diretor {d} ({s})', 'director {d} ({s})'), { d: c.dir, s: t(STYLE18[c.style].name) }), c.style === 'meddler' ? 'warn' : ''), pill($(c.fee)), pill(fmtS(l('{m} meses · prestígio {p}%', '{m} months · {p}% prestige'), { m: c.mo, p: Math.round(c.pres * 100) }))),
        muted(STYLE18[c.style].desc),
        row(t(l('Compositor', 'Composer')), select(p.who ?? '', comps.map((x) => ({ value: x.id, label: `${x.name} (${Math.round(skill18(x))})` })), (v) => { p.who = v; }),
          t(l('Abordagem', 'Approach')), select(p.ap, (Object.keys(AP18) as Ap18[]).map((k) => ({ value: k, label: t(AP18[k].name) })), (v) => { p.ap = v; rerender(); })),
        muted(AP18[p.ap].desc),
        row(btn(l('Aceitar', 'Accept'), () => say(acceptComm18(s, c.id, p.who ?? '', p.ap)), !p.who, 'btn small primary'), btn(l('Recusar', 'Decline'), () => { declineComm18(s, c.id); rerender(); }),
          c.med === 'musical' ? btn(fmtS(l('Co-produzir ({v})', 'Co-produce ({v})'), { v: $(copCost18(s, c)) }), () => say(coproduce18(s, c.id))) : null));
    }) : [muted(l('Nenhuma agora. Elas chegam pela Caixa.', 'None right now. They arrive in the Inbox.'))])),
    work.length ? section(t(l('Em produção', 'In production')), ...work.map((c) => card(row(h('b', null, c.title), pill(t(MED18[c.med].name)), pill(s.persons[c.who ?? '']?.name ?? '?'), pill(t(AP18[c.ap ?? 'orch'].name)),
      why18(s, 'screen18.deliv', { c: c.id }, pill(fmtS(l('{p}% pronta', '{p}% done'), { p: Math.round(c.prog * 100) }), c.st === 'late' ? 'bad' : '')), pill(fmtS(l('prazo em {w} sem.', 'due in {w} wk'), { w: Math.max(0, c.due - s.week) }), c.due - s.week < 6 ? 'warn' : ''))))) : null,
    section(t(l('Entregues', 'Delivered')), ...(done.length ? done.map((c) => row(h('b', null, c.title), pill(t(MED18[c.med].name)), c.st === 'rejected' ? pill(t(l('rejeitada', 'rejected')), 'bad') : pill(fmtS(l('nota {q}', 'grade {q}'), { q: c.q ?? 0 })),
      c.box !== undefined ? pill(fmtS(l('bilheteria {b}', 'box office {b}'), { b: Math.round(c.box * 100) })) : c.prem ? pill(t(l('estreia em breve', 'premiere soon'))) : null,
      c.run !== undefined ? pill(fmtS(l('{w} sem. em cartaz', '{w} wk left'), { w: c.run })) : null, c.won ? pill(t(l('premiada', 'award winner')), 'gold') : c.nom ? pill(t(l('indicada', 'nominated')), 'good') : null,
      c.st === 'done' && !c.nom && !c.prem && s.year >= MED18[c.med].awFrom ? why18(s, 'screen18.award', { c: c.id }, btn(fmtS(l('Campanha de prêmio ({v})', 'Awards campaign ({v})'), { v: $(money(s, 7000)) }), () => say(fycScore18(s, c.id, st.list)), !!c.fyc)) : null)) : [muted(l('Nenhuma ainda.', 'None yet.'))])),
    section(t(l('Diário', 'Log')), logList(st.log)));
}
function pressTab(s: GameState): HTMLElement {
  const st = pr18(s), q = queue18(s);
  const sc: Record<string, number> = {};
  return h('div', null,
    row(pill(t(STAGE18[st.stage])), why18(s, 'press18.infl', {}, pill(fmtS(l('credibilidade {c} · alcance {r} · peso {i}%', 'credibility {c} · reach {r} · weight {i}%'), { c: Math.round(st.cred), r: Math.round(st.reach), i: Math.round(influence18(s) * 1000) / 10 }), st.cred >= 60 ? 'good' : st.cred < 30 ? 'bad' : '')), pill(fmtS(l('{n} resenhas · {k} furos', '{n} reviews · {k} scoops'), { n: st.n, k: st.scoops }))),
    section(t(l('Para resenhar', 'To review')), muted(l('Sua nota (0–100) entra na média da crítica e move o apelo do disco conforme o seu peso. Notas perto da qualidade real dão credibilidade; apostar alto num desconhecido que depois estoura vale ouro. Resenhar o próprio selo é conflito de interesse.', 'Your score (0–100) joins the critics\' average and moves the record\'s appeal by your weight. Scores close to real quality build credibility; backing an unknown that later breaks is gold. Reviewing your own label is a conflict of interest.')),
      ...(q.length ? q.map((r) => row(h('b', null, `"${r.title}"`), actLink(s, r.actId), r.owner === 'player' ? pill(t(l('seu selo', 'your label')), 'warn') : null,
        h('input', { type: 'number', min: '0', max: '100', value: '60', style: 'width:64px', oninput: (e: Event) => { sc[r.id] = Number((e.target as HTMLInputElement).value); } }),
        btn(l('Publicar resenha', 'Publish review'), () => say(review18(s, r.id, sc[r.id] ?? 60))))) : [muted(l('Nenhum lançamento novo nas últimas 6 semanas.', 'No new releases in the last 6 weeks.'))])),
    section(t(l('Seu veículo', 'Your outlet')), st.out ? row(h('b', null, st.out.name), pill(t(OUTK18[st.out.k].name)), pill(fmtS(l('{n} assinantes', '{n} subscribers'), { n: st.out.subs.toLocaleString() })))
      : h('div', null, ...(Object.keys(OUTK18) as OutK18[]).filter((k) => s.year >= OUTK18[k].from).map((k) => row(h('b', null, t(OUTK18[k].name)), pill($(money(s, OUTK18[k].cost))), btn(l('Fundar', 'Found'), () => say(foundOutlet18(s, k, `${s.config.companyName} ${t(OUTK18[k].name)}`))))))),
    section(t(l('Diário da redação', 'Newsroom log')), logList(st.log)));
}
CP_VIS18.screen = (s) => careers(s).active.includes('screen') || sc18(s).list.length > 0;
CP_VIS18.critic = (s) => careers(s).active.includes('critic') || pr18(s).n > 0;
CP_TABS18.screen = (s) => [{ id: 'scr', label: t(l('Encomendas e trilhas', 'Commissions and scores')), icon: 'film', render: () => screenTab(s) }];
CP_TABS18.critic = (s) => [{ id: 'crit', label: t(l('Resenhas e redação', 'Reviews and newsroom')), icon: 'newspaper', render: () => pressTab(s) }];

// ---------------------------------------------------------------- Sociedade
function awardsTab(s: GameState): HTMLElement {
  const v = voters18(s), st = aw18(s);
  const rels = Object.values(s.releases).filter((r) => r.year === s.year && (r.owner === 'player' || s.acts[r.actId]?.playerBand) && r.totalUnits > 0).sort((a, b) => (a.peak || 999) - (b.peak || 999)).slice(0, 8);
  return h('div', null,
    section(t(l('Quem vota', 'Who votes')), card(row(h('b', null, t(v.era))), row(pill(fmtS(l('{n} membros', '{n} members'), { n: v.n.toLocaleString() })), pill(fmtS(l('idade média {a}', 'average age {a}'), { a: v.age })), pill(fmtS(l('{p}% jovens', '{p}% young'), { p: Math.round(v.young * 100) }))),
      row(...Object.entries(v.bias).filter(([, b]) => b).map(([f, b]) => pill(`${f} ${b! > 0 ? '+' : ''}${b}`, b! > 0 ? 'good' : 'bad'))),
      !v.reformed ? row(btn(l('Lobby pela reforma dos votantes', 'Lobby for voter reform'), () => say(lobbyReform18(s, 1))), muted(altHist18(s) ? ALT_NOTE18 : l('Modo exato: a reforma é em 2019.', 'Exact mode: the reform comes in 2019.'))) : null)),
    section(t(l('Campanhas deste ano', 'This year\'s campaigns')), ...(rels.length ? rels.map((r) => row(h('b', null, `"${r.title}"`), r.peak ? pill(`#${r.peak}`) : null, why18(s, 'aw18.adj', { rel: r.id }, pill(t(l('política', 'politics')))),
      ...(Object.keys(CAMP18) as Camp18[]).filter((k) => s.year >= CAMP18[k].from).map((k) => btn(`${t(CAMP18[k].name)} (${$(money(s, CAMP18[k].cost))})`, () => say(campaign18(s, r.id, k)), st.camps.some((c) => c.rel === r.id && c.k === k && c.y === s.year))))) : [muted(l('Nenhum lançamento seu este ano.', 'None of your releases this year.'))]),
      muted(Object.values(CAMP18).map((c) => `${t(c.name)}: ${t(c.desc)}`).join(' · '))),
    section(t(l('Esnobadas e boicotes', 'Snubs and boycotts')), st.snub.length ? h('ul', { class: 'small' }, ...st.snub.slice(-8).reverse().map((x) => h('li', null, `${x.y} — ${s.acts[x.act]?.name ?? '?'}: ${x.ch ?? '…'}`))) : muted(l('Nenhuma.', 'None.'))),
    section(t(l('Diário', 'Log')), logList(st.log)));
}
function chartsTab(s: GameState): HTMLElement {
  const now = rulesNow18(s), deb = rulesDebated18(s);
  const fresh = Object.values(s.releases).filter((r) => (r.owner === 'player' || s.acts[r.actId]?.playerBand) && s.week - r.week <= 4);
  return h('div', null,
    section(t(l('Regras em vigor', 'Rules in force')), ...(now.length ? now.map((r) => row(pill(`${ruleDate18(s, r)}`), pill(r.mk.toUpperCase()), h('b', null, t(r.name)), muted(r.desc))) : [muted(l('A parada ainda mede como sempre (palpite das lojas e rádio).', 'The chart still measures the old way (store guesswork and radio).'))])),
    deb.length ? section(t(l('Em debate no órgão da parada', 'Under debate at the chart body')), ...deb.map((r) => card(row(h('b', null, t(r.name)), pill(r.mk.toUpperCase())), muted(r.desc),
      row(btn(l('Lobby: antecipar', 'Lobby: bring forward'), () => say(lobbyRule18(s, r.id, 1))), btn(l('Lobby: atrasar', 'Lobby: delay'), () => say(lobbyRule18(s, r.id, -1)))), muted(altHist18(s) ? l('Fora do modo exato o lobby pode mudar a data (história alternativa).', 'Outside exact mode lobbying can move the date (alternate history).') : l('Modo exato: a data é a real; o lobby dá informação antecipada.', 'Exact mode: the date is real; lobbying buys early information.'))))) : null,
    bundlesOk18(s) ? section(t(l('Bundles (brecha da regra atual)', 'Bundles (current rule loophole)')), ...(fresh.length ? fresh.map((r) => row(h('b', null, `"${r.title}"`), why18(s, 'aw18.rules', { rel: r.id }, pill(t(l('regras', 'rules')))), btn(fmtS(l('Bundle com merch ({v})', 'Merch bundle ({v})'), { v: $(bundleCost18(s, r)) }), () => say(bundle18(s, r.id)), !!aw18(s).bundles[r.id]))) : [muted(l('Nenhum lançamento seu nas últimas 4 semanas.', 'None of your releases in the last 4 weeks.'))])) : null);
}
function aiTab(s: GameState): HTMLElement {
  if (!aiEra(s)) return muted(l('A IA generativa de música ainda não existe nesta época.', 'Generative music AI does not exist in this era yet.'));
  const st = ai18(s), acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  return h('div', null,
    card(row(h('b', null, t(l('Plataformas agora', 'Platforms now'))), why18(s, 'ai18.appeal', {}, pill(t(platformPolicy18(s).name)))), ...specShown18(s).filter((x) => x.key.startsWith('voices')).map((x) => muted(`${x.y}: ${t(x.name)} — ${t(x.text)}`))),
    section(t(l('IA no estúdio, por ato', 'AI in the studio, per act')), muted(Object.values(AIMODE18).map((m) => `${t(m.name)}: ${t(m.desc)}`).join(' · ')),
      row(h('label', null, h('input', { type: 'checkbox', checked: st.disclose, onchange: () => { st.disclose = !st.disclose; rerender(); } }), ' ', t(l('Rotular faixas geradas ("feito com IA")', 'Label generated tracks ("made with AI")')))),
      ...acts.map((a) => row(actLink(s, a.id), select(modeOf18(s, a.id), (Object.keys(AIMODE18) as AiMode18[]).map((k) => ({ value: k, label: t(AIMODE18[k].name) })), (v) => say(setAiMode18(s, a.id, v))),
        canClone18(s, a) ? muted(canClone18(s, a)!) : btn(fmtS(l('Licenciar clone de voz ({v} + {m}/mês, 50% ao artista)', 'License voice clone ({v} + {m}/mo, 50% to the artist)'), { v: $(cloneTerms18(s, a).up), m: $(cloneTerms18(s, a).mo) }), () => say(licenseClone18(s, a.id)))))),
    section(t(l('Processo contra os geradores', 'Lawsuit against the generators')), row(pill(st.suit.st), st.suit.paid ? pill(fmtS(l('honorários {v}', 'fees {v}'), { v: $(st.suit.paid) })) : null),
      st.suit.st === 'none' && s.year >= 2024 ? row(btn(l('Entrar na coalizão', 'Join the coalition'), () => say(joinSuit18(s, 'join'))), btn(l('Licenciar o catálogo', 'License the catalog'), () => say(joinSuit18(s, 'license')))) : null),
    section(t(l('Diário', 'Log')), logList(st.log)));
}
function censorTab(s: GameState): HTMLElement {
  const st = soc18(s);
  const regs = REGIMES18.filter((r) => s.year >= r.from && s.year <= r.to);
  const past = CHRON18.filter(([y, m]) => s.year * 12 + s.month >= y * 12 + m);
  return h('div', null,
    altHist18(s) ? muted(ALT_NOTE18) : null,
    section(t(l('Regimes que censuram hoje', 'Regimes censoring today')), ...(regs.length ? regs.map((r) => row(h('b', null, t(r.name)), pill(t(r.censor)), pill(r.a3.slice(0, 4).join(' '))) ) : [muted(l('Nenhum regime censor no mapa agora.', 'No censoring regime on the map right now.'))])),
    section(t(l('Seu elenco', 'Your roster')), ...playerActs(s).map((id) => s.acts[id]).filter(Boolean).map((a) => {
      const o = censorOdds18(s, a), x = st.exile[a.id];
      return o || x || st.heat[a.id] ? row(actLink(s, a.id), o ? why18(s, 'soc18.censor', { act: a.id }, pill(fmtS(l('veto {p}%', 'veto {p}%'), { p: Math.round(o.p * 100) }), o.p > 0.4 ? 'bad' : 'warn')) : null,
        st.heat[a.id] ? pill(fmtS(l('calor {h}', 'heat {h}'), { h: Math.round(st.heat[a.id]) }), st.heat[a.id] >= 60 ? 'bad' : '') : null, x ? pill(fmtS(l('exílio em {c} desde {y}', 'exile in {c} since {y}'), { c: (cityById[x.to] ? t(cityById[x.to].name) : x.to), y: x.since }), 'warn') : null,
        regimeAt18(s, countryOfCity(a.city)) ? null : null) : null;
    }).filter(Boolean) as HTMLElement[], muted(l('Vetos chegam pela Caixa: cortar, letra em código ou desafiar.', 'Vetoes arrive in the Inbox: cut, code or defy.'))),
    section(t(l('Crônica (casos reais documentados)', 'Chronicle (documented real cases)')), past.length ? h('ul', { class: 'small' }, ...past.slice().reverse().map(([y, , x]) => h('li', null, `${y} — ${t(x)}`))) : muted(l('Nada ainda.', 'Nothing yet.'))),
    section(t(l('Diário', 'Log')), logList(st.log)));
}
const charity: { cause?: string; fmt: 'single' | 'concert' | 'foundation'; fee: number } = { fmt: 'single', fee: 0 };
function charityTab(s: GameState): HTMLElement {
  const st = soc18(s), c = st.camp, causes = causesNow18(s);
  charity.cause ??= causes[0]?.id;
  const stars = Object.values(s.acts).filter((a) => !playerActs(s).includes(a.id) && a.fame >= 35 && a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.fame - a.fame).slice(0, 12);
  return h('div', null,
    row(pill(fmtS(l('filantropia {p}', 'philanthropy {p}'), { p: st.phil })), st.honors ? pill(fmtS(l('{n} honraria(s)', '{n} honour(s)'), { n: st.honors }), 'gold') : null),
    c && c.stage !== 'done' ? section(t(l('Campanha em andamento', 'Campaign in progress')), row(pill(t(CAUSES18.find((x) => x.id === c.cause)?.name ?? l('?', '?'))), pill(t(FMT18[c.fmt].name)), pill(c.stage), why18(s, 'soc18.raise', {}, pill(t(l('arrecadação prevista', 'expected funds'))))),
      row(...c.stars.map((id) => actLink(s, id))),
      c.stage === 'recruit' ? h('div', null, muted(l('Convide estrelas (até 8): relação com você e fama decidem. Egos podem brigar pelo refrão.', 'Invite stars (up to 8): your relationship and their fame decide. Egos may fight over the chorus.')),
        ...stars.map((a) => row(actLink(s, a.id), pill(`${Math.round(joinOdds18(s, a) * 100)}%`), btn(l('Convidar', 'Invite'), () => say(invite18(s, a.id)), c.asked.includes(a.id))))) : null)
      : section(t(l('Nova campanha', 'New campaign')),
        row(t(l('Causa', 'Cause')), select(charity.cause ?? '', causes.map((x) => ({ value: x.id, label: t(x.name) })), (v) => { charity.cause = v; }),
          t(l('Formato', 'Format')), select(charity.fmt, (Object.keys(FMT18) as (keyof typeof FMT18)[]).filter((k) => s.year >= FMT18[k].from).map((k) => ({ value: k, label: `${t(FMT18[k].name)} (${$(money(s, FMT18[k].cost))})` })), (v) => { charity.fmt = v; rerender(); }),
          t(l('Taxa administrativa', 'Admin fee')), select(charity.fee, [0, 0.05, 0.15].map((x) => ({ value: x, label: `${x * 100}%` })), (v) => { charity.fee = v; })),
        muted(FMT18[charity.fmt].desc), muted(l('Taxa acima de 4% pode virar escândalo na auditoria; escândalo recente no elenco faz a imprensa falar em "caridade cínica".', 'A fee above 4% may become an audit scandal; a recent roster scandal makes the press call it "cynical charity".')),
        btn(l('Lançar campanha', 'Launch campaign'), () => say(startCharity18(s, charity.cause ?? '', charity.fmt, charity.fee)), false, 'btn small primary')),
    section(t(l('Campanhas passadas', 'Past campaigns')), st.past.length ? h('ul', { class: 'small' }, ...st.past.map((x) => h('li', null, `${x.y} — ${t(x.t)}`))) : muted(l('Nenhuma.', 'None.'))));
}
function cityTab(s: GameState): HTMLElement {
  const st = soc18(s), city = s.config.homeCity, sc = cityScore18(s, city);
  return h('div', null,
    card(row(h('b', null, (cityById[city] ? t(cityById[city].name) : city)), why18(s, 'soc18.city', { city }, pill(fmtS(l('cidade da música {v}/100', 'music city {v}/100'), { v: sc.v }), sc.v >= 40 ? 'good' : '')), st.unesco[city] ? pill(fmtS(l('UNESCO {y}', 'UNESCO {y}'), { y: st.unesco[city] }), 'gold') : null, tourismMonth18(s) ? pill(fmtS(l('turismo {v}/mês', 'tourism {v}/mo'), { v: $(tourismMonth18(s)) })) : null)),
    section(t(l('Investir na cidade', 'Invest in the city')),
      row(btn(fmtS(l('Museu da música ({v})', 'Music museum ({v})'), { v: $(museumCost18(s)) }), () => say(buildMuseum18(s, 'museum')), !!st.museum), btn(fmtS(l('Rota turística ({v})', 'Tourist route ({v})'), { v: $(routeCost18(s)) }), () => say(buildMuseum18(s, 'route')), !!st.route)),
      row(btn(fmtS(l('Lobby: lei pró-casas de show ({v})', 'Lobby: pro-venue ordinance ({v})'), { v: $(money(s, 12000)) }), () => say(lobbyCouncil18(s))), s.year >= 2006 ? btn(l('Candidatura UNESCO Cidade da Música', 'Bid for UNESCO City of Music'), () => say(applyUnesco18(s)), !!st.unesco[city]) : null),
      muted(l('Pontuação 40+ aumenta a renda de shows na cidade; museu e rota pagam por visitante; cidade cara traz ameaças de aluguel às suas casas.', 'A 40+ score raises show revenue in the city; museum and route pay per visitor; an expensive city brings rent threats to your venues.'))),
    Object.keys(st.unesco).length ? section(t(l('Cidades da Música UNESCO', 'UNESCO Cities of Music')), row(...Object.entries(st.unesco).map(([c, y]) => pill(`${(cityById[c] ? t(cityById[c].name) : c)} ${y}`)))) : null);
}
registerArea({ id: 'society18', label: l('Sociedade', 'Society'), icon: 'globe', key: '', render: (s) => h('div', { class: 'hub' }, h('h2', null, t(l('Sociedade: prêmios, paradas, IA, censura, filantropia e cidade', 'Society: awards, charts, AI, censorship, charity and city'))),
  tabs('society18', [
    { id: 'awards', label: t(l('Prêmios', 'Awards')), icon: 'trophy', render: () => awardsTab(s) },
    { id: 'charts', label: t(l('Paradas', 'Charts')), icon: 'chart', render: () => chartsTab(s) },
    { id: 'ai', label: t(l('IA', 'AI')), icon: 'bulb', render: () => aiTab(s) },
    { id: 'censor', label: t(l('Censura e exílio', 'Censorship & exile')), icon: 'alert', render: () => censorTab(s) },
    { id: 'charity', label: t(l('Filantropia', 'Philanthropy')), icon: 'heart', render: () => charityTab(s) },
    { id: 'city', label: t(l('Cidade da música', 'Music city')), icon: 'home', render: () => cityTab(s) },
  ], rerender)) });
void RULES18;
