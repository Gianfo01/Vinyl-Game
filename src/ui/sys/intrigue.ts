// Interface de intriga e decisões (rodada 6): tramas em andamento, nova trama (tipo, alvo, agentes,
// chance e risco), segredos conhecidos com ganchos e exposição, e o menu de decisões grandes.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  DECISIONS, HOOK_USES, SCHEMES, SECRETS, agentCost, cancelScheme, canTarget, decisionBlocker, exposeSecret, hookReady, intrigue, knownSecrets, maxSchemes,
  schemeOdds, schemeRisk, schemeSpeed, startScheme, takeDecision, targetName, useHook, type HookUse, type SchemeKind, type Target,
} from '../../sim/sys/intrigue';
import type { GameState } from '../../sim/types';
import { money, rngOf } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { lifeEventsSection } from './lifeevents10';
import { ic } from '../vis';
import { visibleAct } from '../../sim/future';

const say = (e: L | null, ok?: L) => { if (e) toast(t(e), 'bad'); else if (ok) toast(t(ok), 'good'); rerender(); };
const pct = (x: number) => `${Math.round(x * 100)}%`;

const form: { kind: SchemeKind; target: string; agents: number } = { kind: 'dig', target: '', agents: 1 };

function targets(s: GameState, kind: SchemeKind): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const on = SCHEMES[kind].on;
  if (on.includes('label')) for (const lb of Object.values(s.labels).filter((x) => x.active).sort((a, b) => (s.rivalries[b.id] ?? 0) - (s.rivalries[a.id] ?? 0) || b.revenueLastYear - a.revenueLastYear)) out.push({ value: `label:${lb.id}`, label: `🏢 ${lb.name}` });
  if (on.includes('act')) for (const a of Object.values(s.acts).filter((x) => visibleAct(s, x) && x.status !== 'retired' && x.status !== 'split' && (kind !== 'poach' || (x.owner && x.owner !== 'player')) && (kind !== 'smear' || x.owner !== 'player') && (x.fame > 8 || x.owner === 'player' || s.knowledge[x.id])).sort((a, b) => b.fame - a.fame).slice(0, 80)) out.push({ value: `act:${a.id}`, label: `🎤 ${a.name}${a.owner && a.owner !== 'player' ? ` (${s.labels[a.owner]?.name ?? ''})` : a.owner === 'player' ? ` (${t(l('seu', 'yours'))})` : ''}` });
  return out;
}

const parse = (v: string): Target | null => { const [k, id] = v.split(':'); return k && id ? { kind: k as Target['kind'], id } : null; };

function schemesSection(s: GameState): HTMLElement {
  const st = intrigue(s);
  const opts = targets(s, form.kind);
  if (!opts.some((o) => o.value === form.target)) form.target = opts[0]?.value ?? '';
  const tg = parse(form.target);
  const preview = tg ? { kind: form.kind, target: tg, agents: form.agents } : null;
  const err = tg ? canTarget(s, form.kind, tg) : l('Escolha um alvo.', 'Pick a target.');
  return section(`${t(l('Tramas', 'Schemes'))} (${st.schemes.length}/${maxSchemes(s)})`,
    st.schemes.length ? h('div', { class: 'cards' }, st.schemes.map((sc) => h('article', { class: 'tile inv' },
      h('header', null, h('b', null, t(SCHEMES[sc.kind].name)), ' → ', targetName(s, sc.target)),
      h('div', null, h('span', { class: 'meter-bar', style: 'width:160px' }, h('span', { style: `width:${Math.min(100, sc.progress)}%` })), ` ${Math.round(sc.progress)}%`),
      h('small', null, t(l('+{v}/mês · sucesso {o} · risco de ser descoberto {r}/mês · {a} agente(s)', '+{v}/mo · success {o} · discovery risk {r}/mo · {a} agent(s)'), { v: Math.round(schemeSpeed(s, sc)), o: pct(schemeOdds(s, sc)), r: pct(schemeRisk(s, sc)), a: sc.agents })),
      h('button', { class: 'btn small ghost', onclick: () => { cancelScheme(s, sc.id); rerender(); } }, t(l('Abandonar', 'Abandon'))),
    ))) : h('p', { class: 'muted small' }, t(l('Nenhuma trama em andamento.', 'No schemes running.'))),
    h('h4', null, t(l('Nova trama', 'New scheme'))),
    h('div', { class: 'row wrap' },
      select<SchemeKind>(form.kind, (Object.keys(SCHEMES) as SchemeKind[]).map((k) => ({ value: k, label: `${t(SCHEMES[k].name)} — ${t(SCHEMES[k].desc)}` })), (v) => { form.kind = v; rerender(); }),
      select(form.target, opts, (v) => { form.target = v; rerender(); }, { 'aria-label': t(l('Alvo', 'Target')) }),
      select(form.agents, [0, 1, 2, 3].map((n) => ({ value: n, label: `${n} ${t(l('agentes', 'agents'))}${n ? ` (${$(agentCost(s) * n)}/${t(l('mês', 'mo'))})` : ''}` })), (v) => { form.agents = v; rerender(); }),
    ),
    preview && !err ? h('p', { class: 'small' }, t(l('Duração estimada: {m} meses · chance de sucesso: {o} · risco mensal de ser descoberto: {r}. Começar custa 1 tempo livre.', 'Estimated duration: {m} months · success chance: {o} · monthly discovery risk: {r}. Starting costs 1 free time.'), { m: Math.ceil(100 / schemeSpeed(s, preview)), o: pct(schemeOdds(s, preview)), r: pct(schemeRisk(s, preview)) })) : err ? h('p', { class: 'small muted' }, t(err)) : null,
    h('button', { class: 'btn small primary', disabled: !!err, onclick: () => { if (tg) say(startScheme(s, form.kind, tg, form.agents), l('Trama em andamento.', 'Scheme under way.')); } }, ic('camera'), ' ', t(l('Começar trama', 'Start scheme'))),
    h('p', { class: 'muted small' }, t(l('Ser pego custa reputação, confiança e rivalidade. Traços como Ardiloso e o estilo Intrigante ajudam; Honesto sofre estresse ao tramar.', 'Getting caught costs reputation, trust and rivalry. Traits like Scheming and the Schemer style help; Honest suffers stress when scheming.'))),
  );
}

function secretsSection(s: GameState): HTMLElement {
  const ks = knownSecrets(s);
  return section(t(l('Segredos e ganchos', 'Secrets and hooks')),
    ks.length ? h('div', { class: 'cards' }, ks.map((sec) => {
      const def = SECRETS[sec.kind];
      const ready = hookReady(s, sec);
      const uses = (Object.keys(HOOK_USES) as HookUse[]).filter((u) => HOOK_USES[u].on === sec.target.kind);
      return h('article', { class: 'tile inv' },
        h('header', null, h('b', null, targetName(s, sec.target)), ' ', pill(def.criminal ? t(l('gancho forte', 'strong hook')) : t(l('gancho fraco', 'weak hook')), def.criminal ? 'bad' : 'warn')),
        h('div', { class: 'small' }, t(def.name)),
        h('small', { class: 'muted' }, def.criminal ? t(l('Crime: reutilizável a cada 5 anos.', 'A crime: reusable every 5 years.')) : t(l('Vergonhoso: uso único.', 'Shameful: single use.'))),
        ready ? h('div', { class: 'row wrap' }, uses.map((u) => h('button', { class: 'btn small', title: t(HOOK_USES[u].desc), onclick: () => say(useHook(s, rngOf(s), sec.id, u), l('Gancho usado.', 'Hook used.')) }, t(HOOK_USES[u].name)))) : h('small', { class: 'muted' }, t(l('Gancho já usado.', 'Hook already used.'))),
        h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Expor o segredo publicamente? O gancho se perde.', 'Expose the secret publicly? The hook is lost.')))) say(exposeSecret(s, sec.id), l('Segredo exposto.', 'Secret exposed.')); } }, t(l('Expor publicamente', 'Expose publicly'))),
      );
    })) : h('p', { class: 'muted small' }, t(l('Nenhum segredo conhecido. Use a trama Investigar, ou fique de ouvidos abertos em galas e retiros.', 'No known secrets. Use the Dig scheme, or keep your ears open at galas and retreats.'))),
  );
}

function logSection(s: GameState): HTMLElement | null {
  const st = intrigue(s);
  if (!st.log.length) return null;
  return section(t(l('Bastidores', 'Backstage')), h('ul', { class: 'small' }, st.log.slice(0, 12).map((x) => h('li', { class: x.tone === 'bad' ? 'bad' : x.tone === 'good' ? 'good' : '' }, `${t(l('sem.', 'wk'))} ${x.week}: `, t(x.text)))));
}

export function intriguePanel(s: GameState): HTMLElement {
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' }, schemesSection(s), secretsSection(s)),
    h('aside', { class: 'col-side' }, logSection(s) ?? h('p', { class: 'muted small' }, '')),
  );
}

export function decisionsTab(s: GameState): HTMLElement {
  return h('div', null, lifeEventsSection(s), bigDecisions(s));
}

function bigDecisions(s: GameState): HTMLElement {
  return section(t(l('Decisões', 'Decisions')),
    h('p', { class: 'muted small' }, t(l('Grandes jogadas com requisitos e custo. Algumas são para sempre; outras podem ser repetidas depois de um tempo.', 'Big moves with requirements and costs. Some are forever; others can be repeated after a while.'))),
    h('div', { class: 'card-grid' }, DECISIONS.map((d) => {
      const blk = decisionBlocker(s, d);
      const done = intrigue(s).decisions[d.id] !== undefined;
      return h('div', { class: `pick ${done && !d.cooldown ? 'on' : ''}` },
        h('b', null, t(d.name)), done && !d.cooldown ? pill(t(l('feito', 'done')), 'good') : null,
        h('small', null, t(d.desc)),
        h('small', { class: 'muted' }, `${$(money(s, d.cost))}${d.energy ? ` · ${d.energy} ${t(l('tempo livre', 'free time'))}` : ''}`),
        h('button', { class: 'btn small', disabled: !!blk, title: blk ? t(blk) : '', onclick: () => say(takeDecision(s, rngOf(s), d.id), l('Decisão tomada.', 'Decision taken.')) }, t(l('Decidir', 'Decide'))),
        blk ? h('small', { class: 'muted' }, t(blk)) : null,
      );
    })),
  );
}

// rodada 17: a aba de intriga/espionagem mudou para Crime → Espionagem (ui/sys/crime17.ts)
