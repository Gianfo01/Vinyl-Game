// Rodada 18 (item 9) — "Diário do Mestre": a curva de tensão da partida (atos e fases), os fios de campanha abertos
// (só o que você sabe), os arcos públicos dos NPCs principais, os ganchos que o Mestre guardou ("lembra quando…"),
// as rixas (sua escada com mediação/trégua/feat e as do mundo) e quem agiu contra quem. Também a aba "Rixas" no ato.

import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { ag18, nameOfKey18, VERBS18 } from '../../sim/sys/agency18';
import { dm18, knownThreads18, PHASE18, THREADS18, type Thread18 } from '../../sim/sys/dm18';
import { activeFeuds18, altHist18, ALT_NOTE18, cool18, feud18, feudsOf18, STAGE18, tryCool18, type Feud18 } from '../../sim/sys/feud18';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { actLink, monthName, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerArea, registerPageTab } from '../registry';
import { store } from '../store';
import { directorCard17 } from './npc17';

const PH_CLS: Record<string, string> = { calm: 'good', rising: 'warn', climax: 'bad', resolution: '' };
const PH_COL: Record<string, string> = { calm: 'var(--good, #4caf50)', rising: 'var(--warn, #e0a030)', climax: 'var(--bad, #d04040)', resolution: 'var(--muted, #888)' };

/** Curva de tensão (SVG): cada ponto colorido pela fase. */
function curve(s: GameState): HTMLElement {
  const c = dm18(s).curve;
  const W = 520, H = 90;
  if (c.length < 2) return h('p', { class: 'muted small' }, t(l('A curva aparece depois do primeiro mês.', 'The curve shows up after the first month.')));
  const x = (i: number) => (i / (c.length - 1)) * (W - 8) + 4;
  const y = (v: number) => H - 6 - (v / 100) * (H - 12);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('style', 'width:100%;max-width:560px;height:auto');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t(l('Curva de tensão', 'Tension curve')));
  for (let i = 1; i < c.length; i++) {
    const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', String(x(i - 1))); ln.setAttribute('y1', String(y(c[i - 1][1])));
    ln.setAttribute('x2', String(x(i))); ln.setAttribute('y2', String(y(c[i][1])));
    ln.setAttribute('stroke', PH_COL[c[i][2]] ?? '#888'); ln.setAttribute('stroke-width', '2.5'); ln.setAttribute('stroke-linecap', 'round');
    svg.appendChild(ln);
  }
  return h('div', null, svg as unknown as HTMLElement,
    h('div', { class: 'row wrap small' }, ...(['calm', 'rising', 'climax', 'resolution'] as const).map((p) => h('span', { style: `color:${PH_COL[p]}` }, `● ${t(PHASE18[p].name)}  `))));
}

function threadCard(s: GameState, th: Thread18): HTMLElement {
  const def = THREADS18.find((d) => d.k === th.k);
  const n = def?.beats.length ?? 1;
  const dots = Array.from({ length: n }, (_, i) => (i < th.st || th.done ? '●' : i === th.st ? '◐' : '○')).join(' ');
  const beats = th.beats.filter((b) => b.known);
  return h('div', { class: 'card', style: 'margin:6px 0;padding:8px' },
    h('div', { class: 'row wrap' }, h('b', null, def ? t(def.name) : th.k), ' ', pill(dots), th.wait !== undefined ? pill(t(l('aguarda sua resposta (Caixa)', 'awaiting your answer (Inbox)')), 'warn') : null, th.done ? pill(t(th.done), 'good') : null,
      th.mine ? null : pill(t(l('arco de NPC', 'NPC arc')))),
    def ? h('p', { class: 'small' }, t(def.sum(s, th))) : null,
    beats.length ? h('ul', { class: 'small' }, ...beats.slice(-5).map((b) => h('li', null, h('span', { class: 'muted' }, `${monthName(b.m)} ${b.y} `), t(b.t)))) : h('p', { class: 'muted small' }, t(l('Algo se move… ainda sem detalhes.', 'Something stirs… no details yet.'))),
    th.wait !== undefined ? h('button', { class: 'btn small', onclick: () => { store.area = 'inbox' as typeof store.area; rerender(); } }, t(l('Responder na Caixa', 'Answer in the Inbox'))) : null);
}

function heatBar(f: Feud18): HTMLElement {
  return h('div', { style: 'display:flex;gap:2px;align-items:center' }, ...STAGE18.map((st, i) => h('span', { title: `${t(st.name)} — ${t(st.desc)}`, style: `flex:1;height:8px;border-radius:2px;background:${i <= f.st ? (i >= 4 ? '#d04040' : i >= 3 ? '#e07030' : '#e0a030') : 'rgba(128,128,128,.25)'}` })), h('span', { class: 'small muted', style: 'margin-left:6px' }, `${Math.round(f.h)}/100`));
}

function feudRow(s: GameState, f: Feud18, mine: boolean): HTMLElement {
  const last = f.hist[f.hist.length - 1];
  const btn = (how: 'mediate' | 'truce' | 'collab', label: L) => {
    const o = cool18(s, f, how);
    return h('button', { class: 'btn small', title: o.why.map((w) => t(w)).join(' · '), onclick: () => { const r = Rng.fromSeed(`${s.config.seed}:feud18ui:${f.id}:${how}:${s.week}`); toast(t(tryCool18(s, f, how, 'player', r).text)); rerender(); } },
      `${t(label)} (${Math.round(o.p * 100)}% · $${Math.round(o.cost / 100).toLocaleString()})`);
  };
  return h('div', { class: 'card', style: 'margin:6px 0;padding:8px' },
    h('div', { class: 'row wrap' }, actLink(s, f.a), ' × ', actLink(s, f.b), ' ', pill(t(STAGE18[f.st].name), f.st >= 3 ? 'bad' : f.st >= 1 ? 'warn' : ''),
      f.dead?.length ? pill(t(l('mortes', 'deaths')) + ` ${f.dead.length}`, 'bad') : null, f.jail ? pill(t(l('processos', 'cases')) + ` ${f.jail}`, 'warn') : null,
      f.truce && f.truce > s.week ? pill(t(l('trégua', 'truce')), 'good') : null),
    heatBar(f),
    h('p', { class: 'small' }, t(f.why), last && last.t !== f.why ? h('span', { class: 'muted' }, ` — ${t(last.t)}`) : null),
    mine ? h('div', { class: 'row wrap' }, btn('mediate', l('Mediação', 'Mediation')), btn('truce', l('Trégua', 'Truce')), btn('collab', l('Feat da paz', 'Peace feat'))) : null);
}

const PUBLIC_VERBS = new Set(['praise', 'diss', 'sue', 'poach', 'reconcile']);
function agencyList(s: GameState): HTMLElement {
  const rows = ag18(s).log.filter((r) => r.mine || PUBLIC_VERBS.has(r.v)).slice(0, 25);
  if (!rows.length) return h('p', { class: 'muted small' }, t(l('Ninguém se mexeu ainda.', 'Nobody has moved yet.')));
  return h('ul', { class: 'small' }, ...rows.map((r) => {
    const v = VERBS18.find((x) => x.id === r.v);
    return h('li', null, h('span', { class: 'muted' }, `${monthName(r.m)} ${r.y} `), pill(v ? t(v.name) : r.v, v?.harm ? 'bad' : 'good'), ' ', `${nameOfKey18(s, r.a)} → ${nameOfKey18(s, r.t)}: `, t(r.txt), r.mine ? pill(t(l('você', 'you')), 'warn') : null);
  }));
}

function area(s: GameState): HTMLElement {
  const st = dm18(s);
  const ph = PHASE18[st.ph];
  const known = knownThreads18(s);
  const open = known.filter((x) => !x.done), closed = known.filter((x) => x.done).slice(-8).reverse();
  const mine = new Set(playerActs(s));
  const feuds = activeFeuds18(s);
  const myF = feuds.filter((f) => mine.has(f.a) || mine.has(f.b));
  const worldF = feuds.filter((f) => !mine.has(f.a) && !mine.has(f.b) && f.st >= 1).sort((a, b) => b.st - a.st || b.h - a.h).slice(0, 12);
  const hooks = st.hooks.filter((x) => !x.sec || x.used).slice(-10).reverse();
  return h('div', { class: 'page' },
    h('h2', null, t(l('Diário do Mestre', 'DM Journal'))),
    h('p', { class: 'small muted' }, t(l('O diretor criativo conduz a partida como um Mestre de RPG: lê o mundo e os traços de cada personagem, planta ganchos, abre fios que voltam meses depois e dosa a tensão. Aqui está só o que você sabe.', 'The creative director runs the game like a tabletop DM: reads the world and each character\'s traits, plants hooks, opens threads that return months later and doses the tension. Only what you know is shown here.'))),
    altHist18(s) ? h('p', { class: 'small' }, pill(t(l('História alternativa', 'Alternate history')), 'warn'), ' ', t(ALT_NOTE18)) : h('p', { class: 'small' }, pill(t(l('Vida real exata', 'Exact real life')), 'good'), ' ', t(l('Pessoas reais só vivem fatos documentados: rixas, ataques e fios do Mestre envolvem apenas personagens fictícios (e você).', 'Real people only live documented facts: feuds, attacks and DM threads only involve fictional characters (and you).'))),
    section(fmtAct(st.arc, ph.name), h('p', null, pill(t(ph.name), PH_CLS[st.ph]), ' ', t(ph.desc), ' ', h('span', { class: 'muted small' }, `${t(l('Tensão', 'Tension'))} ${Math.round(st.t)}/100`)), curve(s)),
    section(t(l('Fios abertos', 'Open threads')), open.length ? h('div', null, ...open.map((x) => threadCard(s, x))) : h('p', { class: 'muted small' }, t(l('Nenhum fio à vista. Na calmaria, o Mestre planta ganchos.', 'No threads in sight. In calm times, the DM plants hooks.')))),
    section(t(l('Rixas', 'Feuds')),
      myF.length ? h('div', null, h('h4', null, t(l('As suas', 'Yours'))), ...myF.map((f) => feudRow(s, f, true))) : h('p', { class: 'muted small' }, t(l('Nenhuma rixa sua. Dá para começar uma no menu de ações de outro artista ("Encomendar uma diss").', 'No feuds of yours. You can start one from another artist\'s action menu ("Commission a diss").'))),
      worldF.length ? h('div', null, h('h4', null, t(l('No mundo', 'In the world'))), ...worldF.map((f) => feudRow(s, f, false))) : null,
      h('p', { class: 'small muted' }, t(l('Escada: farpas → diss track → guerra de faixas → confronto → briga → tiros. Sobe com ego, impulsividade, coragem, laço com gangue, fama e o clímax do Mestre; desce com empatia, disciplina, idade, mediação, trégua e feat. Violência só fora do modo "Vida real exata"; tiros só com rua (rap, funk, corridos…) ou gangue.', 'Ladder: shade → diss track → track war → confrontation → fight → shots. Rises with ego, impulsiveness, courage, gang ties, fame and the DM\'s climax; falls with empathy, discipline, age, mediation, truce and a feat. Violence only outside "Exact real life"; shots only with street acts (rap, funk, corridos…) or gangs.')))),
    section(t(l('Quem agiu contra quem', 'Who moved against whom')), agencyList(s)),
    section(t(l('O que o Mestre lembra', 'What the DM remembers')), hooks.length ? h('ul', { class: 'small' }, ...hooks.map((x) => h('li', null, h('span', { class: 'muted' }, `${monthName(x.m)} ${x.y} `), t(x.t), x.used ? pill(t(l('virou fio', 'became a thread')), 'warn') : null))) : h('p', { class: 'muted small' }, t(l('Nada ainda.', 'Nothing yet.')))),
    closed.length ? section(t(l('Fios encerrados', 'Closed threads')), h('div', null, ...closed.map((x) => threadCard(s, x)))) : null,
    directorCard17(s),
  );
}
const fmtAct = (n: number, ph: L): string => `${t(l('Ato', 'Act'))} ${n} · ${t(ph)}`;

registerArea({ id: 'dm18', label: l('Diário do Mestre', 'DM Journal'), icon: 'pen', key: '', render: area, badge: (s) => dm18(s).th.filter((x) => x.wait !== undefined && !x.done).length || undefined });

registerPageTab('act', {
  id: 'feud18', label: l('Rixas', 'Feuds'), icon: 'fire', order: 87,
  when: (s, id) => feud18(s).f.some((f) => f.a === id || f.b === id),
  render: (s, id) => {
    const mine = playerActs(s).includes(id);
    const act = feudsOf18(s, id);
    const old = feud18(s).f.filter((f) => f.end && (f.a === id || f.b === id)).slice(-5).reverse();
    return h('div', null,
      act.length ? h('div', null, ...act.map((f) => feudRow(s, f, mine))) : h('p', { class: 'muted small' }, t(l('Sem rixas ativas.', 'No active feuds.'))),
      old.length ? section(t(l('Rixas passadas', 'Past feuds')), h('ul', { class: 'small' }, ...old.map((f) => h('li', null, actLink(s, f.a), ' × ', actLink(s, f.b), ` — ${t(STAGE18[f.st].name)}: ${t(f.end!)}`)))) : null);
  },
});
