// Interface dos especialistas (rodada 8): estilo, ambição e pessoa-chave na tabela da equipe; química,
// assinatura sonora, influência do selo e proposta de rival num quadro acima da tabela.

import { FAMILIES, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { AMBITIONS, SPECS, chemistryTarget, crew, matchPoach, profileOf, respec, respecCost } from '../../sim/sys/crew8';
import type { GameState, StaffMember } from '../../sim/types';
import { $, pill, rerender, toast } from '../common';
import { bar, h } from '../dom';

const famName = (id?: string) => (id ? t(FAMILIES.find((f) => f.id === id)?.name) : '');

/** Célula de perfil (especialização com prós e contras, ambição, pessoa-chave). */
export function crewProfileCell(s: GameState, st: StaffMember, opts: { mine?: boolean } = {}): HTMLElement {
  const p = profileOf(s, st);
  const sp = p.spec ? SPECS[p.spec] : undefined;
  const key = opts.mine && crew(s).key === st.id;
  return h('div', { class: 'crew8-prof' },
    sp ? h('span', { title: `+ ${t(sp.up)}\n− ${t(sp.down)}` }, pill(`${t(sp.name)}${p.fam ? ` · ${famName(p.fam)}` : ''}`, 'info')) : h('small', { class: 'muted' }, t(l('generalista', 'generalist'))),
    ' ', h('small', { class: 'muted', title: t(AMBITIONS[p.amb].desc) }, t(AMBITIONS[p.amb].name)),
    key ? h('span', null, ' ', pill(t(l('pessoa-chave', 'key person')), 'warn')) : null,
    sp && opts.mine ? h('div', { class: 'small' }, h('span', { class: 'good' }, `+ ${t(sp.up)}`), ' ', h('span', { class: 'bad' }, `− ${t(sp.down)}`)) : null,
  );
}

/** Botão de reorientar o estilo de alguém (só funções com duas especializações). */
export function crewRespecButton(s: GameState, st: StaffMember): HTMLElement | null {
  if (!profileOf(s, st).spec) return null;
  return h('button', { class: 'btn small ghost', title: t(l('Treina a pessoa no estilo oposto (perde um pouco de habilidade e lealdade).', 'Retrains them in the opposite style (loses some skill and loyalty).')), onclick: () => {
    const e = respec(s, st.id);
    toast(t(e ?? l('Estilo redirecionado.', 'Style switched.')), e ? 'bad' : 'good');
    rerender();
  } }, `${t(l('Mudar estilo', 'Switch style'))} (${$(respecCost(s, st))})`);
}

/** Quadro da equipe: química, assinatura, influência e alertas. */
export function crewSummary(s: GameState): HTMLElement {
  const c = crew(s);
  const poached = c.poach ? s.player.staff.find((x) => x.id === c.poach!.id) : undefined;
  return h('div', { class: 'crew8-sum' },
    h('p', { class: 'muted small' }, t(l('Especialistas não são uma escada de raridade: cada estilo tem um lado bom e um custo, e a habilidade amplia os dois. Quem trabalha junto há anos cria química — mas fica dependente de quem segura o grupo.', 'Specialists are not a rarity ladder: each style has an upside and a cost, and skill amplifies both. People who work together for years build chemistry — and grow dependent on whoever holds the group together.'))),
    h('div', { class: 'kv-grid small' },
      h('div', { title: t(l('Cresce com anos de casa; mentores aceleram, estrelas atrapalham. Melhora gravações, negociações de turnê e reduz acidentes.', 'Grows with years together; mentors speed it up, stars get in the way. Improves recordings, tour negotiations and reduces accidents.')) }, t(l('Química', 'Chemistry')), ' ', bar(c.chem, 100, c.chem > 50 ? 'good' : ''), ` ${Math.round(c.chem)} → ${Math.round(chemistryTarget(s))}`),
      h('div', { title: t(l('Construída pelo engenheiro de assinatura: mais apelo nos lançamentos do selo.', 'Built by a signature engineer: more appeal on label releases.')) }, t(l('Assinatura sonora', 'Sound signature')), ' ', bar(c.sig, 100), ` ${Math.round(c.sig)}`),
      h('div', { title: t(l('Quanto o selo manda nas decisões das carreiras. Empresário independente reduz; da casa aumenta.', 'How much say the label has in career decisions. An independent manager lowers it; an in-house one raises it.')) }, t(l('Influência do selo', 'Label influence')), ' ', bar(c.infl, 100, c.infl < 35 ? 'warn' : ''), ` ${Math.round(c.infl)}`),
    ),
    c.shock > 0 ? h('p', { class: 'bad small' }, t(l('Equipe em choque pela saída de alguém-chave ({n} meses).', 'Team in shock after a key departure ({n} months).'), { n: c.shock })) : null,
    poached ? h('p', { class: 'warn small' }, t(l('{b} quer levar {n} (até a semana {w}).', '{b} wants to hire {n} (until week {w}).'), { b: c.poach!.rival, n: poached.name, w: c.poach!.until }), ' ',
      h('button', { class: 'btn small', onclick: () => { const e = matchPoach(s); toast(t(e ?? l('Ficou na equipe.', 'They stay.')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Cobrir proposta (+25% salário)', 'Match offer (+25% salary)'))}`)) : null,
    c.log.length ? h('ul', { class: 'small' }, c.log.slice(0, 4).map((x) => h('li', { class: x.tone ?? '' }, t(x.text)))) : null,
  );
}
