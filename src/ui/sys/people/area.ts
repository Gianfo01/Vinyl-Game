// Área "Pessoas" (tecla P): humor como pilha de pensamentos, saúde, conversas e promessas, relações,
// segredos, dono do selo, carreira da equipe e feed. A caixa de entrada fica na tecla E.

import { STAFF_ROLES } from '../../../data/rules';
import { l, type L } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { BREAK_NAME, breakRisk } from '../../../sim/sys/people/breakdowns';
import { MED_ROLES, TREATMENT, buyEarProtection, fireMedic, hireMedic, inEarsAvailable, medCandidates, startTreatment, treatmentCost, type Treatment } from '../../../sim/sys/people/health';
import { activeRomance, personalAdvance, wealthOf } from '../../../sim/sys/people/life';
import { ATTR_DESC, ATTR_NAME, availableHouses, buyHouse, invest, ownerAge, ownerCourse, ownerOf, setHeir, setSalary, vacation, withdraw, type OwnerAttr } from '../../../sim/sys/people/owner';
import { SECRET_NAME, detectiveCost, hireDetective, ownerLabel, pressureCeo } from '../../../sim/sys/people/secrets';
import { LEVEL_NAME, ROLE_PATHS, careerOf, changeRole, promote, promoteReady, trainCost, trainStaff } from '../../../sim/sys/people/staff';
import { P, healthOf } from '../../../sim/sys/people/state';
import { PROMISE_INFO, TALK_NAME, canTalk, openPromises, talk, type PromiseKind, type TalkKind } from '../../../sim/sys/people/talks';
import { activeThoughts, moodOf, thoughtText } from '../../../sim/sys/people/thoughts';
import type { GameState, Person } from '../../../sim/types';
import { money, playerActs, rngOf } from '../../../sim/util';
import { $, N, actLink, pill, rerender, section, toast } from '../../common';
import { h, select } from '../../dom';
import { registerArea, registerSection } from '../../registry';
import { chips, ic, meter, portrait, stat, tabs, tile } from '../../vis';
import { inboxArea, inboxBadge } from './inbox';
import { negotiateButton } from './negotiation';
import { feedView, socialDiagram } from './views';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const ui = { person: '', promise: 'single' as PromiseKind, detective: '', invest: 0 };

function rosterPeople(s: GameState): Person[] {
  const out: Person[] = [];
  for (const id of playerActs(s)) for (const pid of s.acts[id].members) { const p = s.persons[pid]; if (p?.alive) out.push(p); }
  return out;
}

function moodColor(v: number): string {
  return v >= 15 ? 'good' : v <= -15 ? 'bad' : '';
}

// ------------------------------------------------------------------ elenco

function personCard(s: GameState, p: Person): HTMLElement {
  const act = playerActs(s).map((id) => s.acts[id]).find((a) => a.members.includes(p.id));
  const mood = moodOf(s, p.id);
  const th = activeThoughts(s, p.id).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const hl = healthOf(s, p.id);
  const risk = breakRisk(s, p);
  const rom = act ? activeRomance(s, act.id) : undefined;
  const promises = openPromises(s, p.id);
  const talkErr = canTalk(s, p.id);
  const doTalk = (k: TalkKind) => { const res = talk(s, p.id, k, k === 'promise' ? ui.promise : undefined); toast(t(res.text), res.ok ? 'good' : 'warn'); rerender(); };
  return h('article', { class: 'pp-card' },
    h('div', { class: 'pp-head' }, portrait(p, 48), h('div', null, h('b', null, p.name), h('div', { class: 'small muted' }, act ? actLink(s, act.id) : '', ` · ${p.role}`)),
      h('span', { class: `pp-mood ${moodColor(mood)}`, title: t(l('Humor (soma dos pensamentos)', 'Mood (sum of thoughts)')) }, mood > 0 ? `+${mood}` : String(mood))),
    th.length ? h('ul', { class: 'pp-thoughts' }, th.slice(0, 8).map((x) => h('li', { class: x.v > 0 ? 'good' : 'bad' }, h('b', null, x.v > 0 ? `+${x.v}` : String(x.v)), ' ', t(thoughtText(x))))) : h('p', { class: 'muted small' }, t(l('Sem pensamentos marcantes.', 'No notable thoughts.'))),
    chips(
      meter('stress', l('Estresse', 'Stress'), p.stress, 100, true),
      meter('heart', l('Moral', 'Morale'), p.morale),
      risk > 0.02 ? pill(`${t(l('risco de colapso', 'breakdown risk'))} ${Math.round(risk * 100)}%`, 'bad') : null,
    ),
    h('div', { class: 'pp-health' },
      stat('mic', Math.round(hl.voice), l('Desgaste vocal', 'Vocal wear'), hl.voice > 70 ? 'bad' : ''),
      stat('radio', Math.round(hl.hearing), l('Dano auditivo', 'Hearing damage'), hl.hearing > 55 ? 'bad' : ''),
      hl.injuryWeeks ? stat('warning', `${hl.injuryWeeks}s`, l('Lesão', 'Injury'), 'bad') : null,
      hl.dependency > 30 ? stat('skull', Math.round(hl.dependency), l('Dependência', 'Dependency'), hl.dependency > 60 ? 'bad' : 'warn') : null,
      hl.nodes ? pill(t(l('calos nas cordas vocais', 'vocal nodes')), 'bad') : null,
      hl.treatment ? pill(`${t(TREATMENT[hl.treatment.kind].name)} · ${t(l('até a semana', 'until week'))} ${hl.treatment.untilWeek}`, 'warn') : null,
    ),
    !hl.treatment ? h('div', { class: 'row wrap' }, (Object.keys(TREATMENT) as Treatment[]).map((k) => h('button', { class: 'btn small ghost', onclick: () => say(startTreatment(s, p.id, k), l('Tratamento iniciado.', 'Treatment started.')) }, `${t(TREATMENT[k].name)} ${$(treatmentCost(s, k))}`))) : null,
    rom ? h('p', { class: 'small' }, ic('heart'), ' ', t(l('Romance na banda', 'Romance in the band')), `: ${s.persons[rom.a]?.name} & ${s.persons[rom.b]?.name}`) : null,
    h('p', { class: 'small' }, `${t(l('Patrimônio pessoal', 'Personal wealth'))}: ${$(wealthOf(s, p.id))} `, h('button', { class: 'btn small ghost', onclick: () => say(personalAdvance(s, p.id, money(s, 3000)), l('Adiantamento pago.', 'Advance paid.')) }, t(l('Adiantar dinheiro', 'Advance money')))),
    promises.length ? h('ul', { class: 'small' }, promises.map((pr) => h('li', null, ic('contract'), ` ${t(l('Promessa', 'Promise'))}: ${t(PROMISE_INFO[pr.kind].name)} · ${t(l('prazo semana', 'due week'))} ${pr.dueWeek}`))) : null,
    h('div', { class: 'pp-talk' },
      h('small', { class: 'muted' }, t(l('Conversa', 'Talk')), talkErr ? ` — ${t(talkErr)}` : ''),
      h('div', { class: 'row wrap' },
        (['praise', 'demand', 'patience', 'fine'] as TalkKind[]).map((k) => h('button', { class: 'btn small', disabled: !!talkErr, onclick: () => doTalk(k) }, t(TALK_NAME[k]))),
        select(ui.promise, (Object.keys(PROMISE_INFO) as PromiseKind[]).map((k) => ({ value: k, label: t(PROMISE_INFO[k].name) })), (v) => { ui.promise = v; }, { 'aria-label': t(l('Promessa', 'Promise')) }),
        h('button', { class: 'btn small', disabled: !!talkErr, onclick: () => doTalk('promise') }, t(TALK_NAME.promise))),
    ),
  );
}

function rosterTab(s: GameState): HTMLElement {
  const people = rosterPeople(s).sort((a, b) => moodOf(s, a.id) - moodOf(s, b.id));
  const st = P(s);
  return h('div', null,
    section(t(l('Elenco: humor, saúde e conversas', 'Roster: mood, health and talks')),
      h('p', { class: 'muted small' }, t(l('O humor é a soma dos pensamentos de cada pessoa, cada um com valor e prazo. Abaixo de um limite, aumenta o risco de colapso.', "Mood is the sum of each person's thoughts, each with a value and a deadline. Below a threshold, breakdown risk rises."))),
      people.length ? h('div', { class: 'pp-grid' }, people.map((p) => personCard(s, p))) : h('p', { class: 'muted' }, t(l('Sem artistas no elenco.', 'No artists on the roster.'))),
    ),
    st.breakdowns.length ? section(t(l('Colapsos recentes', 'Recent breakdowns')), h('ul', { class: 'small' }, st.breakdowns.slice(-10).reverse().map((b) => h('li', null, `${b.year} · ${s.persons[b.personId]?.name ?? '?'}: `, t(BREAK_NAME[b.kind as keyof typeof BREAK_NAME] ?? b.text), ' — ', t(b.text))))) : null,
  );
}

// ------------------------------------------------------------------ saúde e equipe médica

function healthTab(s: GameState): HTMLElement {
  const st = P(s);
  return h('div', null,
    section(t(l('Equipe médica', 'Medical staff')),
      st.medics.length ? h('ul', null, st.medics.map((m) => h('li', null, `${m.name} — ${t(MED_ROLES[m.role].name)} (${m.skill}) · ${$(m.salary)}/m `, h('button', { class: 'btn small ghost', onclick: () => { fireMedic(s, m.id); rerender(); } }, t(l('Dispensar', 'Let go')))))) : null,
      h('div', { class: 'cards' }, medCandidates(s).map((m) => tile('heart', `${m.name} — ${t(MED_ROLES[m.role].name)}`, [h('small', null, t(MED_ROLES[m.role].desc)), h('small', { class: 'muted' }, `${t(l('habilidade', 'skill'))} ${m.skill} · ${$(m.salary)}/m`), h('button', { class: 'btn small', onclick: () => say(hireMedic(s, m.id), l('Contratado.', 'Hired.')) }, t(l('Contratar', 'Hire')))]))),
    ),
    section(t(l('Proteção auditiva', 'Hearing protection')),
      inEarsAvailable(s) ? h('button', { class: 'btn', onclick: () => say(buyEarProtection(s), l('Retornos intra-auriculares para todo o elenco.', 'In-ear monitors for the whole roster.')) }, t(l('Comprar retornos intra-auriculares', 'Buy in-ear monitors'))) : h('p', { class: 'muted small' }, t(l('Retornos intra-auriculares ainda não existem ou já foram comprados.', 'In-ear monitors are not available yet or already bought.'))),
    ),
  );
}

// ------------------------------------------------------------------ relações

function relationsTab(s: GameState): HTMLElement {
  return h('div', null, socialDiagram(s));
}

// ------------------------------------------------------------------ segredos

function secretsTab(s: GameState): HTMLElement {
  const st = P(s);
  const known = st.secrets.filter((x) => x.known && !x.leaked);
  const targets = [
    ...rosterPeople(s).map((p) => ({ value: p.id, label: p.name })),
    ...Object.values(s.labels).filter((lb) => lb.active).slice(0, 12).map((lb) => ({ value: `label:${lb.id}`, label: `${t(l('CEO de', 'CEO of'))} ${lb.name}` })),
  ];
  if (!targets.some((x) => x.value === ui.detective)) ui.detective = targets[0]?.value ?? '';
  return h('div', null,
    section(t(l('Dossiês', 'Dossiers')),
      h('p', { class: 'muted small' }, t(l('Todo mundo tem segredos. Usar um segredo numa negociação funciona — até alguém descobrir que você usou.', 'Everyone has secrets. Using one in a negotiation works — until someone finds out you used it.'))),
      h('div', { class: 'row wrap' }, select(ui.detective, targets, (v) => { ui.detective = v; }, { 'aria-label': t(l('Investigar', 'Investigate')) }),
        h('button', { class: 'btn', onclick: () => { toast(t(hireDetective(s, rngOf(s), ui.detective)), 'info'); rerender(); } }, `${t(l('Contratar detetive', 'Hire a detective'))} (${$(detectiveCost(s))})`)),
      known.length ? h('div', { class: 'cards' }, known.map((x) => tile('key', t(ownerLabel(s, x)), [
        h('small', null, `${t(SECRET_NAME[x.kind])} · ${t(l('gravidade', 'severity'))} ${x.severity}/3 · ${t(l('usado', 'used'))} ${x.used}×`),
        x.knownBy.length ? h('small', { class: 'muted' }, `${t(l('Também sabem', 'Also known by'))}: ${x.knownBy.map((k) => (k === 'press' ? t(l('imprensa', 'the press')) : s.labels[k]?.name ?? k)).join(', ')}`) : null,
        x.owner.startsWith('label:') ? h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: () => { toast(t(pressureCeo(s, rngOf(s), x.id, 'back_off')), 'info'); rerender(); } }, t(l('Pressionar: recuar', 'Pressure: back off'))),
          h('button', { class: 'btn small ghost', onclick: () => { toast(t(pressureCeo(s, rngOf(s), x.id, 'cash')), 'info'); rerender(); } }, t(l('Pressionar: dinheiro', 'Pressure: cash')))) : null,
      ]))) : h('p', { class: 'muted small' }, t(l('Nenhum segredo conhecido.', 'No known secrets.'))),
    ),
  );
}

// ------------------------------------------------------------------ dono do selo

function ownerTab(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const houses = availableHouses(s);
  const kids = o.kids.map((k, i) => ({ value: `kid:${i}`, label: `${k.name} (${t(l('aptidão', 'aptitude'))} ${k.aptitude})` }));
  const staff = s.player.staff.map((st) => ({ value: `staff:${st.id}`, label: `${st.name} (${t(STAFF_ROLES.find((r) => r.id === st.role)?.name)})` }));
  return h('div', null,
    section(`${o.name} · ${ownerAge(s)} ${t(l('anos', 'years'))}`,
      chips(meter('stress', l('Estresse', 'Stress'), o.stress, 100, true), meter('heart', l('Saúde', 'Health'), o.health), stat('money', $(o.wealth), l('Patrimônio pessoal', 'Personal wealth')), stat('calendar', `${$(o.salary)}/m`, l('Retirada mensal', 'Monthly draw'))),
      h('div', { class: 'cards' }, (Object.keys(o.attrs) as OwnerAttr[]).map((a) => tile('sparkle', t(ATTR_NAME[a]), [h('b', null, String(Math.round(o.attrs[a]))), h('small', null, t(ATTR_DESC[a])), h('button', { class: 'btn small ghost', onclick: () => say(ownerCourse(s, a), l('Curso concluído.', 'Course done.')) }, t(l('Fazer curso', 'Take a course')))]))),
    ),
    section(t(l('Dinheiro pessoal', 'Personal money')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', onclick: () => say(setSalary(s, 3000), l('Retirada ajustada.', 'Draw adjusted.')) }, t(l('Retirada modesta', 'Modest draw'))),
        h('button', { class: 'btn small', onclick: () => say(setSalary(s, 9000), l('Retirada ajustada.', 'Draw adjusted.')) }, t(l('Retirada de executivo', 'Executive draw'))),
        h('button', { class: 'btn small ghost', onclick: () => say(setSalary(s, 0), l('Sem retirada.', 'No draw.')) }, t(l('Sem retirada', 'No draw'))),
        h('button', { class: 'btn small', onclick: () => say(withdraw(s, money(s, 10000)), l('Dinheiro retirado da empresa.', 'Money withdrawn from the company.')) }, `${t(l('Retirar', 'Withdraw'))} ${$(money(s, 10000))}`),
        h('button', { class: 'btn small', onclick: () => say(invest(s, money(s, 10000)), l('Dinheiro investido na empresa.', 'Money invested in the company.')) }, `${t(l('Investir', 'Invest'))} ${$(money(s, 10000))}`),
        h('button', { class: 'btn small ghost', onclick: () => say(vacation(s), l('Boas férias!', 'Enjoy the holiday!')) }, t(l('Tirar férias', 'Take a holiday')))),
    ),
    section(t(l('Casa', 'Home')), h('div', { class: 'cards' }, houses.map((hs) => {
      const idx = availableHouses(s).indexOf(hs);
      const mine = o.house >= 0 && o.house === idx;
      return tile('house', t(hs.name), [h('small', null, `${$(money(s, hs.price))} · ${t(l('alívio de estresse', 'stress relief'))} ${hs.relief}`), mine ? pill(t(l('sua casa', 'your home')), 'good') : h('button', { class: 'btn small', onclick: () => say(buyHouse(s, hs.id), l('Casa comprada!', 'House bought!')) }, t(l('Comprar', 'Buy')))]);
    }))),
    section(t(l('Família e sucessão', 'Family and succession')),
      o.spouse ? h('p', null, `${t(l('Cônjuge', 'Spouse'))}: ${o.spouse}`) : null,
      o.kids.length ? h('ul', null, o.kids.map((k) => h('li', null, `${k.name} (${s.year - k.born} ${t(l('anos', 'years'))})`))) : h('p', { class: 'muted small' }, t(l('Sem filhos.', 'No children.'))),
      h('label', null, `${t(l('Herdeiro', 'Heir'))}: `, select(o.heir ?? '', [{ value: '', label: '—' }, ...kids, ...staff], (v) => say(setHeir(s, v || undefined), l('Sucessão definida.', 'Succession set.')))),
      o.retired?.length ? h('p', { class: 'small muted' }, `${t(l('Gerações anteriores', 'Previous generations'))}: ${o.retired.map((x) => `${x.name} (${x.years})`).join(', ')}`) : null,
    ),
  );
}

// ------------------------------------------------------------------ equipe

function staffTab(s: GameState): HTMLElement {
  return section(t(l('Carreira da equipe', 'Staff careers')),
    s.player.staff.length ? h('table', { class: 'tbl compact' }, h('tbody', null, s.player.staff.map((st) => {
      const c = careerOf(s, st);
      const paths = ROLE_PATHS[st.role] ?? [];
      return h('tr', null,
        h('td', null, st.name), h('td', null, t(STAFF_ROLES.find((r) => r.id === st.role)?.name)), h('td', null, t(LEVEL_NAME[c.level])), h('td', null, `${st.skill}`), h('td', null, `${t(l('lealdade', 'loyalty'))} ${Math.round(c.loyalty)}`),
        h('td', null, c.trainingUntil && c.trainingUntil > s.week ? pill(t(l('em treinamento', 'training')), 'warn') : h('button', { class: 'btn small', onclick: () => say(trainStaff(s, st.id), l('Treinamento iniciado.', 'Training started.')) }, `${t(l('Treinar', 'Train'))} ${$(trainCost(s, st))}`)),
        h('td', null, promoteReady(s, st) ? h('button', { class: 'btn small primary', onclick: () => say(promote(s, st.id), l('Promovido!', 'Promoted!')) }, t(l('Promover', 'Promote'))) : ''),
        h('td', null, paths.length ? select('', [{ value: '', label: t(l('Mudar função…', 'Change role…')) }, ...paths.map((p) => ({ value: p, label: t(STAFF_ROLES.find((r) => r.id === p)?.name) ?? p }))], (v) => { if (v) say(changeRole(s, st.id, v), l('Função alterada.', 'Role changed.')); }) : ''));
    }))) : h('p', { class: 'muted' }, t(l('Sem equipe.', 'No staff.'))),
  );
}

function peopleArea(s: GameState): HTMLElement {
  return h('div', { class: 'hub people' }, tabs('people', [
    { id: 'roster', label: t(l('Elenco', 'Roster')), icon: 'heart', render: () => rosterTab(s) },
    { id: 'health', label: t(l('Saúde', 'Health')), icon: 'warning', render: () => healthTab(s) },
    { id: 'relations', label: t(l('Relações', 'Relationships')), icon: 'handshake', render: () => relationsTab(s) },
    { id: 'secrets', label: t(l('Segredos', 'Secrets')), icon: 'key', render: () => secretsTab(s) },
    { id: 'owner', label: t(l('Você', 'You')), icon: 'house', render: () => ownerTab(s) },
    { id: 'staff', label: t(l('Equipe', 'Staff')), icon: 'contract', render: () => staffTab(s) },
    { id: 'feed', label: t(l('Redes e cartas', 'Social and letters')), icon: 'stream', render: () => feedView(s) },
  ], rerender));
}

registerArea({ id: 'people', label: l('Pessoas', 'People'), icon: 'heart', key: 'p', render: peopleArea, badge: (s) => rosterPeople(s).filter((p) => breakRisk(s, p) > 0.08).length || undefined });
registerArea({ id: 'inbox', label: l('Caixa de entrada', 'Inbox'), icon: 'newspaper', key: 'e', render: inboxArea, badge: inboxBadge });

registerSection('artists', {
  id: 'people-negotiate',
  order: 55,
  render: (s) => {
    const ids = playerActs(s).filter((id) => s.acts[id].contractId);
    if (!ids.length) return null;
    return section(t(l('Renegociar contratos', 'Renegotiate contracts')), h('div', { class: 'row wrap' }, ids.slice(0, 10).map((id) => negotiateButton(s, id, 'renew', `${s.acts[id].name}`))), h('p', { class: 'muted small' }, `${N(ids.length)} ${t(l('contratos ativos', 'active contracts'))}`));
  },
});
