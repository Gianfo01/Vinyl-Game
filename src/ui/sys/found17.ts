// Rodada 17 — bloco "Fatos & Obrigações" na página de pessoa (artistas, você e a página única de quem não é
// artista) e na página do ato: estresse curto/longo com o porquê, obrigações que a pessoa tem/deve (com os verbos
// para as que são suas) e fatos recentes com visibilidade e a reação calculada do último escândalo.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { VIS_NAME, factsAbout, type Fact } from '../../sim/facts17';
import { HOLD_NAME, VERB_NAME, canUse, holdsOf, useHold, type Hold, type HoldVerb } from '../../sim/holds17';
import { SCANDAL_NAME, lastScandal, type ScandalKind } from '../../sim/scandal17';
import { BREAK_LONG, BREAK_SHORT, STRESS_LEVEL, stressOf } from '../../sim/stress17';
import type { GameState, Person } from '../../sim/types';
import { monthName, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { PERSON_TABS } from '../pages';
import { registerPageTab } from '../registry';
import { meter } from '../vis';
import { PAGE16_TABS } from './people16';

const LEVEL_CLS = { ok: 'good', tense: '', strained: 'warn', breaking: 'bad' } as const;
const VIS_CLS = { secret: 'trait', rumor: 'warn', public: '' } as const;
const nameOf = (s: GameState, id: string): string => id === 'player' ? t(l('você', 'you')) : s.persons[id]?.name ?? s.acts[id]?.name ?? s.labels[id]?.name ?? (id.startsWith('lender:') ? t(l('credor', 'lender')) : id === 'press' ? t(l('a imprensa', 'the press')) : id);

/** Estresse com o porquê e as consequências. */
export function stressBlock17(s: GameState, pid: string): HTMLElement | null {
  const p = s.persons[pid];
  if (!p?.alive) return null;
  const x = stressOf(s, pid);
  return section(t(l('Estresse', 'Stress')),
    h('div', { class: 'row wrap' }, pill(t(STRESS_LEVEL[x.level]), LEVEL_CLS[x.level]), x.risk > 0 ? pill(`${t(l('risco de quebra', 'breakdown risk'))} ${Math.round(x.risk * 100)}%/${t(l('mês', 'mo'))}`, 'bad') : null),
    meter('heart', l('Curto prazo', 'Short-term'), x.short, 100, true),
    meter('clock', l('Desgaste (longo prazo)', 'Wear (long-term)'), x.long, 100, true),
    x.why.length ? h('p', { class: 'small' }, `${t(l('Por quê', 'Why'))}: ${x.why.slice(0, 5).map((w) => t(w)).join(' · ')}`) : null,
    h('p', { class: 'small muted' }, t(l(
      `Quebra só quando curto > ${BREAK_SHORT} E desgaste > ${BREAK_LONG}: vira colapso, vício, esgotamento ou surto público (escândalo), conforme a personalidade. Banda com estresse médio acima de 70 grava faixas 6% piores; voz cansada e estresse no palco derrubam cachê e sobem o risco da turnê.`,
      `Breaks only when short > ${BREAK_SHORT} AND wear > ${BREAK_LONG}: becomes a breakdown, addiction, burnout or a public meltdown (scandal), depending on personality. A band averaging stress above 70 records tracks 6% worse; a tired voice and stage stress cut fees and raise tour risk.`))));
}

function holdRow(s: GameState, hd: Hold, mine: boolean): HTMLElement {
  const verbs: HoldVerb[] = !mine ? [] : hd.kind === 'secret' || hd.kind === 'blackmail' ? ['blackmail', 'expose'] : hd.kind === 'grievance' ? ['forgive'] : ['call', 'forgive'];
  const until = hd.until ? ` · ${t(l('até', 'until'))} ${Math.round(s.year + (hd.until - s.week) / 52)}` : '';
  return h('li', null,
    pill(t(HOLD_NAME[hd.kind]), hd.kind === 'grievance' ? 'bad' : hd.kind === 'secret' || hd.kind === 'blackmail' ? 'warn' : 'good'), ' ',
    `${nameOf(s, hd.holder)} → ${nameOf(s, hd.target)}: ${t(hd.text)} (${t(l('força', 'strength'))} ${Math.round(hd.strength)}${until})`,
    ...verbs.map((v) => {
      const why = canUse(s, hd, v);
      return h('button', { class: 'btn small', disabled: !!why, title: why ? t(why) : t(VERB_HINT[v]), onclick: () => { const r = useHold(s, hd.id, v); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, t(VERB_NAME[v]));
    }));
}
const VERB_HINT: Record<HoldVerb, L> = {
  call: l('Gasta a obrigação: confiança do ato, pressão numa oferta, trégua com selo, ou caixa (dívida).', 'Spends the obligation: act trust, pressure on an offer, truce with a label, or cash (debt).'),
  blackmail: l('Ganho forte agora; ~20% de vazar (reputação institucional −10).', 'Strong gain now; ~20% chance it leaks (institutional reputation −10).'),
  expose: l('Vira escândalo do alvo (reação por país, imprensa e fãs).', 'Becomes the target\'s scandal (reaction by country, press and fans).'),
  forgive: l('Encerra a obrigação: a relação melhora e o estresse cai.', 'Ends the obligation: the relationship improves and stress drops.'),
};

/** Obrigações em que alguém aparece (como quem tem ou quem deve). */
export function holdsBlock17(s: GameState, id: string): HTMLElement | null {
  const { has, owes } = holdsOf(s, id);
  const mineOver = id === 'player' ? [] : holdsOf(s, 'player').has.filter((hd) => hd.target === id);
  const list = [...new Map([...has, ...owes, ...mineOver].map((x) => [x.id, x])).values()].filter((x) => x.holder === 'player' || x.target === 'player' || id !== 'player');
  if (!list.length) return section(t(l('Obrigações', 'Obligations')), h('p', { class: 'muted small' }, t(l('Ninguém deve nada a ninguém aqui — por enquanto.', 'Nobody owes anybody here — for now.'))));
  return section(t(l('Obrigações', 'Obligations')),
    h('ul', { class: 'small' }, ...list.slice(0, 14).map((x) => holdRow(s, x, x.holder === 'player'))),
    h('p', { class: 'small muted' }, t(l('Favores, segredos e lealdade a seu favor melhoram propostas e renovações; mágoas (promessa quebrada, favor recusado) pioram. Fracas valem uma vez; fortes (60+) a cada 2 anos.', 'Favors, secrets and loyalty in your favor improve offers and renewals; grievances (broken promise, refused favor) hurt them. Weak ones work once; strong ones (60+) every 2 years.'))));
}

function factRow(s: GameState, f: Fact): HTMLElement {
  const sk = f.kind === 'scandal' && f.data?.kind ? ` · ${t(SCANDAL_NAME[f.data.kind as ScandalKind] ?? l(String(f.data.kind)))} ×${f.data.mult ?? 1}` : '';
  return h('li', null, h('span', { class: 'muted' }, `${monthName(f.m)} ${f.y} `), pill(t(VIS_NAME[f.visibility]), VIS_CLS[f.visibility]), ' ', t(f.text), h('span', { class: 'muted' }, ` (${t(l('gravidade', 'severity'))} ${f.severity}${sk})`));
}

/** Fatos recentes sobre alguém (segredos só quando envolvem você). */
export function factsList17(s: GameState, id: string, withAct = true): HTMLElement {
  const fs = factsAbout(s, id, { limit: 40, withAct }).filter((f) => f.visibility !== 'secret' || f.actors.includes('player') || f.actors.some((a) => s.acts[a]?.owner === 'player')).slice(0, 14);
  const sc = s.acts[id] ? lastScandal(s, id) : undefined;
  return section(t(l('Fatos recentes', 'Recent facts')),
    fs.length ? h('ul', { class: 'small' }, ...fs.map((f) => factRow(s, f))) : h('p', { class: 'muted small' }, t(l('Nada notável registrado ainda.', 'Nothing notable on record yet.'))),
    sc ? h('p', { class: 'small' }, `${t(l('Último escândalo', 'Last scandal'))} (${t(SCANDAL_NAME[sc.kind])}, ${sc.sev} → ${sc.eff}): ${sc.why.map((w) => t(w)).join(' · ')}${sc.lost?.length ? ` · ${t(l('patrocínio perdido', 'sponsorship lost'))}: ${sc.lost.join(', ')}` : ''}`) : null,
    h('p', { class: 'small muted' }, t(l('Boato = circula em algumas cidades (press9); público = manchete. Escândalos reagem à religião e à censura do país na época, à imprensa local, aos fãs núcleo e à fama regional.', 'Rumor = circulating in some cities (press9); public = headline. Scandals react to the country\'s religion and censorship at the time, local press, core fans and regional fame.'))));
}

export function factsBlock17(s: GameState, key: string): HTMLElement {
  const id = key === 'player' ? (Object.values(s.persons).find((p) => p.isPlayer)?.id ?? 'player') : key.startsWith('p:') ? key.slice(2) : key;
  return h('div', null, stressBlock17(s, id), holdsBlock17(s, key === 'player' ? 'player' : id), factsList17(s, id));
}

const LABEL = l('Fatos & Obrigações', 'Facts & Obligations');
PERSON_TABS.push((s, p: Person) => ({ id: 'facts17', label: LABEL, icon: 'newspaper', render: () => factsBlock17(s, p.isPlayer ? 'player' : `p:${p.id}`) }));
PAGE16_TABS.push((s, key) => ({ id: 'facts17', label: LABEL, icon: 'newspaper', render: () => factsBlock17(s, key) }));
registerPageTab('act', { id: 'facts17', label: LABEL, icon: 'newspaper', order: 85, render: (s, id) => h('div', null, holdsBlock17(s, id), factsList17(s, id, false)) });
