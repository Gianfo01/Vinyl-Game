// Rodada 19 (Frente 9.2/9.3) — abas "Músicos de sessão" (Estúdio › Gravação e página Estúdio) e "Créditos e autores"
// (Compor e página Editora): mercado de ases por coletivo, contratação com/sem crédito, rancor, documentários e processos;
// divisão negociada das obras, ghostwriters, canções de fora e plágio.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { INST19, aceCA19, aceFee19, actsForHire19, backCredit19, backCreditCost19, collName19, collectives19, hireAce19, market19, myAces19, ses19 } from '../../sim/sys/session19';
import { SPLIT19, answerSuit19, cutOdds19, ghostCost19, ghostMonthly19, hireGhost19, myGhosts19, negotiateSplit19, npcGhosts19, splitPlan19, splittable19, takeOffer19, wr19, type SplitMode19 } from '../../sim/sys/writers19';
import type { GameState } from '../../sim/types';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { why18 } from '../explain18';
import { registerTab } from '../registry';
import { CP_TABS19 } from './careerpages17';

const T = (x: L | string) => (typeof x === 'string' ? x : t(x));
const say = (r: L | null | string, ok?: L) => { if (r) toast(T(r), 'info'); else if (ok) toast(T(ok), 'good'); rerender(); };
const btn = (label: L | string, fn: () => void, dis = false) => h('button', { class: 'btn small', disabled: dis, onclick: fn }, T(label));
const row = (...k: (Node | string | null)[]) => h('div', { class: 'row wrap', style: 'gap:6px;align-items:center;margin:4px 0' }, ...k);
const muted = (x: L | string) => h('p', { class: 'muted small' }, T(x));
const fm = (x: L, p: Record<string, string | number>) => t(x).replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''));
const F = { act: '', credit: false, crew: '', ghostAct: '', nda: true, split: {} as Record<string, SplitMode19> };

// ---------------------------------------------------------------- músicos de sessão
export function sessionTab19(s: GameState): HTMLElement {
  const st = ses19(s);
  const acts = actsForHire19(s);
  if (!F.act || !acts.some((a) => a.id === F.act)) F.act = acts[0]?.id ?? '';
  const now = collectives19(s, true);
  if (!F.crew || !now.some((c) => c.id === F.crew)) F.crew = now[0]?.id ?? '';
  const mk = market19(s).filter((a) => a.crew === F.crew);
  const mine = myAces19(s);
  return h('div', null,
    section(t(l('Mercado de músicos de estúdio', 'Session player market')),
      muted(l('Cada ás sobe uma dimensão do disco (bateria → imediatismo, baixo → durabilidade, guitarra → técnica, teclados/vocal → acessibilidade, metais → força do single, cordas → emoção) e cresce tocando. Sem crédito sai barato — e o rancor fica guardado. O coletivo inteiro se contrata em Contratar › Músicos (agenda).', 'Each ace lifts one record dimension (drums → immediacy, bass → longevity, guitar → technique, keys/vocals → accessibility, horns → single strength, strings → emotion) and grows by playing. Uncredited is cheap — and the grudge is kept. The whole collective is hired in Hire › Players (agenda).')),
      now.length ? row(select(F.crew, now.map((c) => ({ value: c.id, label: t(c.name) })), (v) => { F.crew = v; rerender(); }),
        acts.length ? select(F.act, acts.map((a) => ({ value: a.id, label: a.name })), (v) => { F.act = v; rerender(); }) : null,
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.credit, onchange: () => { F.credit = !F.credit; rerender(); } }), ' ', t(l('crédito na capa (+25%, sem rancor)', 'sleeve credit (+25%, no grudge)')))) : muted(l('Nenhum coletivo de estúdio nesta época.', 'No studio collective in this era.')),
      ...mk.map((a) => row(h('b', null, a.name), pill(t(INST19[a.inst].name)), pill(fm(l('CA {c}', 'CA {c}'), { c: aceCA19(s, a) })), a.hits ? pill(fm(l('{h} hits', '{h} hits'), { h: a.hits })) : null,
        why18(s, 'ses19.ace', { ace: a.id }, pill(fm(l('rancor {g}', 'grudge {g}'), { g: Math.round(a.grudge) }), a.grudge >= 45 ? 'bad' : '')),
        pill(`${$(aceFee19(s, a, F.credit))}/${t(l('mês', 'mo'))}`),
        a.hire && a.hire.until >= s.week ? pill(fm(l('com {x}', 'with {x}'), { x: s.acts[a.hire.act]?.name ?? '?' }), 'good') : btn(l('Contratar 6 meses', 'Hire 6 months'), () => say(hireAce19(s, a.id, F.act, F.credit), l('Contratado.', 'Hired.')), !F.act))),
    ),
    section(t(l('Quem já tocou com você', 'Who has played with you')),
      mine.length ? h('table', { class: 'table small' }, h('tr', null, ...[l('Músico', 'Player'), l('Coletivo', 'Collective'), l('Faixas', 'Tracks'), l('Hits', 'Hits'), l('Rancor', 'Grudge'), l('Situação', 'Status'), ''].map((x) => h('th', null, T(x)))),
        ...mine.map((a) => h('tr', null, h('td', null, a.name), h('td', null, t(collName19(s, a.crew))), h('td', null, `${a.plays.length} (${a.cred} ${t(l('c/ crédito', 'credited'))})`), h('td', null, String(a.hits)),
          h('td', null, why18(s, 'ses19.ace', { ace: a.id }, String(Math.round(a.grudge)))),
          h('td', null, a.star ? actLink(s, a.star) : a.sued ? pill(fm(l('processou em {y}', 'sued in {y}'), { y: a.sued }), 'bad') : a.hire && a.hire.until >= s.week ? pill(t(l('contratado', 'hired')), 'good') : ''),
          h('td', null, a.plays.length > a.cred && !a.sued ? btn(fm(l('Crédito retroativo ({v})', 'Back credit ({v})'), { v: $(backCreditCost19(s, a)) }), () => say(backCredit19(s, a.id), l('Créditos corrigidos.', 'Credits fixed.'))) : ''))))
        : muted(l('Ninguém ainda.', 'Nobody yet.'))),
    section(t(l('Documentários e processos', 'Documentaries and lawsuits')),
      Object.keys(st.docs).length ? row(...Object.entries(st.docs).map(([c, y]) => pill(`🎬 ${t(collName19(s, c))} (${y})`))) : muted(l('Décadas depois do fim de um coletivo, um documentário pode revelar quem tocou nos sucessos — e o rancor vira processo.', 'Decades after a collective ends, a documentary may reveal who played on the hits — and the grudge becomes a lawsuit.')),
      st.log.length ? h('ul', { class: 'small' }, ...st.log.slice().reverse().slice(0, 8).map((x) => h('li', null, t(x.t)))) : null));
}

// ---------------------------------------------------------------- créditos e autores
export function writersTab19(s: GameState): HTMLElement {
  const st = wr19(s);
  const acts = actsForHire19(s);
  if (!F.ghostAct || !acts.some((a) => a.id === F.ghostAct)) F.ghostAct = acts[0]?.id ?? '';
  const songs = splittable19(s).slice(0, 8);
  const suits = st.suits.slice().reverse().slice(0, 8);
  return h('div', null,
    section(t(l('Divisão das obras', 'Songwriting splits')),
      muted(l('Antes de lançar, decida quem assina cada canção. Partes iguais unem a banda; pelo mérito agrada quem compõe; líder com metade é o clássico que separa bandas.', 'Before release, decide who signs each song. Equal shares unite the band; by merit pleases the writers; leader-takes-half is the classic band-breaker.')),
      ...songs.map((so) => {
        const m = F.split[so.id] ?? 'writers';
        const plan = splitPlan19(s, so.id, m) ?? [];
        return row(h('b', null, `"${so.title}"`), actLink(s, so.actId), select(m, (Object.keys(SPLIT19) as SplitMode19[]).map((k) => ({ value: k, label: t(SPLIT19[k].name) })), (v) => { F.split[so.id] = v; rerender(); }),
          h('span', { class: 'small', title: t(SPLIT19[m].desc) }, plan.map((x) => `${s.persons[x.personId]?.name ?? '?'} ${Math.round(x.share * 100)}%`).join(' · ')),
          btn(l('Assinar', 'Sign'), () => say(negotiateSplit19(s, so.id, m), l('Divisão registrada.', 'Split registered.'))));
      }),
      songs.length ? null : muted(l('Nenhuma canção inédita de banda.', 'No unreleased band songs.'))),
    section(t(l('Ghostwriters', 'Ghostwriters')),
      muted(l('Alguém escreve para a estrela sem aparecer: canções melhores (força do single). Cada hit aumenta o rancor; NDA segura, mas se ele falar o escândalo é maior — e a revelação costuma lançar a carreira solo dele.', 'Someone writes for the star without showing up: better songs (single strength). Every hit raises the grudge; an NDA holds, but if they talk the scandal is bigger — and the reveal often launches their solo career.')),
      acts.length ? row(select(F.ghostAct, acts.map((a) => ({ value: a.id, label: a.name })), (v) => { F.ghostAct = v; rerender(); }),
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: F.nda, onchange: () => { F.nda = !F.nda; rerender(); } }), ' NDA'),
        pill(fm(l('{c} + {m}/mês', '{c} + {m}/month'), { c: $(ghostCost19(s, F.nda)), m: $(ghostMonthly19(s)) })),
        btn(l('Contratar ghostwriter', 'Hire a ghostwriter'), () => say(hireGhost19(s, F.ghostAct, F.nda), l('Contratado em segredo.', 'Hired in secret.')))) : null,
      ...myGhosts19(s).slice(-6).reverse().map((g) => row(h('b', null, s.persons[g.pid]?.name ?? '?'), actLink(s, g.act), pill(fm(l('{n} canções · {h} hits', '{n} songs · {h} hits'), { n: g.songs.length, h: g.hits })),
        pill(fm(l('rancor {g}', 'grudge {g}'), { g: Math.round(g.grudge) }), g.grudge >= 50 ? 'bad' : ''), g.nda ? pill('NDA') : null, pill(T(g.st === 'on' ? l('ativo', 'active') : g.st === 'credit' ? l('creditado', 'credited') : l('fora', 'out')), g.st === 'credit' ? 'good' : ''))),
      npcGhosts19(s).some((g) => g.st === 'out') ? muted(fm(l('Revelados no mercado: {n}.', 'Revealed in the market: {n}.'), { n: npcGhosts19(s).filter((g) => g.st === 'out').map((g) => `${s.persons[g.pid]?.name ?? '?'} → ${s.acts[g.act]?.name ?? '?'}`).join(' · ') })) : null),
    section(t(l('Canções oferecidas por compositores', 'Songs offered by writers')),
      st.offers.length ? h('div', null, ...st.offers.map((o) => row(h('b', null, s.persons[o.pid]?.name ?? '?'), pill(o.pub), actLink(s, o.act), pill(`Q~${o.q}`), pill($(o.fee)),
        btn(l('Gravar', 'Record'), () => say(takeOffer19(s, o.id, false))), btn(fm(l('Pedir 25% ({p}%)', 'Ask 25% ({p}%)'), { p: Math.round(cutOdds19(s, o) * 100) }), () => say(takeOffer19(s, o.id, true)))))) : muted(l('Compositores de outros selos oferecem canções pela Caixa (editora, cachê e crédito).', 'Writers from other labels offer songs through the Inbox (publisher, fee and credit).'))),
    section(t(l('Plágio', 'Plagiarism')),
      suits.length ? h('div', null, ...suits.map((su) => row(pill(T(su.dir === 'in' ? l('contra você', 'against you') : l('você processa', 'you sue')), su.dir === 'in' ? 'bad' : ''), h('b', null, `"${s.songs[su.song]?.title ?? '?'}"`), actLink(s, su.other),
        why18(s, 'wr19.plag', { su: su.id }, pill(`${Math.round(su.odds * 100)}%`)),
        su.st === 'open' ? (su.dir === 'in' ? h('span', null, btn(l('Brigar', 'Fight'), () => say(answerSuit19(s, su.id, 'fight'))), ' ', btn(l('Crédito', 'Credit'), () => say(answerSuit19(s, su.id, 'credit'))), ' ', btn(fm(l('Acordo {v}', 'Settle {v}'), { v: $(su.amt) }), () => say(answerSuit19(s, su.id, 'settle'))))
          : h('span', null, btn(l('Processar', 'Sue'), () => say(answerSuit19(s, su.id, 'sue'))), ' ', btn(l('Deixar', 'Drop'), () => say(answerSuit19(s, su.id, 'no')))))
          : su.st === 'court' ? pill(fm(l('veredito sem. {w}', 'verdict wk {w}'), { w: su.due ?? 0 }), 'warn') : h('span', { class: 'small muted' }, su.res ? t(su.res) : '')))) : muted(l('Hits viram alvo: rivais acusam e você pode processar quem copiou seu catálogo. Depois de 2015 os processos dobram.', 'Hits become targets: rivals accuse and you can sue whoever copied your catalog. After 2015 suits double.'))),
    st.log.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, ...st.log.slice().reverse().slice(0, 8).map((x) => h('li', null, t(x.t))))) : null);
}

registerTab('creation', { id: 'session19', label: l('Músicos de sessão', 'Session players'), icon: 'guitar', order: 56, visible: (s) => s.year >= 1925, render: sessionTab19 });
registerTab('creation', { id: 'writers19', label: l('Créditos e autores', 'Credits & writers'), icon: 'pen', order: 57, render: writersTab19 });
CP_TABS19.studio = (s) => [{ id: 'session19', label: t(l('Músicos de sessão', 'Session players')), icon: 'guitar', render: () => sessionTab19(s) }];
CP_TABS19.publisher = (s) => [{ id: 'writers19', label: t(l('Créditos e autores', 'Credits & writers')), icon: 'pen', render: () => writersTab19(s) }];
