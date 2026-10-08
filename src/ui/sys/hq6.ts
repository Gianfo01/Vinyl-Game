// Gestão direto da página da Sede (rodada 6): ampliar a matriz, comprar o prédio, departamentos com
// níveis, abrir filiais em qualquer cidade, ampliar, definir foco e diretor regional, designar artistas
// e abrir mercados — tudo sem sair da Sede.

import { BRANCH_LEVELS, HQ_LEVELS } from '../../data/rules';
import { CITIES, MARKETS, l, type L } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { assignBranch, canOpenBranch, closeBranch, hqBlocker, hqCaps, openBranch, upgradeBranch } from '../../sim/branches';
import { openTerritory, territoryCost, upgradeCost, upgradeHq } from '../../sim/economy';
import { BRANCH_FOCUS, DEPTS, buildDept, buildingPrice, buyBuilding, closeDept, deptBlocker, deptCount, deptSlots, directorSalary, hireDirector, hq6, setBranchFocus, type BranchFocus } from '../../sim/sys/hq6';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, actLink, cityName, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerSection } from '../registry';
import { ic } from '../vis';
import { careerSlotsUsed } from '../../sim/contracts';

const say = (e: L | null, ok?: L) => { if (e) toast(t(e), 'bad'); else if (ok) toast(t(ok), 'good'); rerender(); };
let newCity = '';

function hqBlock(s: GameState): HTMLElement {
  const st = hq6(s);
  const up = upgradeCost(s);
  const blk = hqBlocker(s);
  const caps = hqCaps(s);
  const next = HQ_LEVELS[s.player.hq + 1];
  return h('div', { class: 'mg-card' },
    h('h4', null, ic('building'), ' ', t(HQ_LEVELS[s.player.hq].name), ' ', st.ownBuilding ? pill(t(l('prédio próprio', 'own building')), 'good') : pill(`${t(l('aluguel', 'rent'))} ${$(money(s, HQ_LEVELS[s.player.hq].rent))}/${t(l('mês', 'mo'))}`)),
    h('p', { class: 'small' }, t(l('Carreiras {u}/{c} · equipe {st} · sessões {se} · equipamentos {e} · departamentos {d}/{ds}', 'Careers {u}/{c} · staff {st} · sessions {se} · equipment {e} · departments {d}/{ds}'), { u: careerSlotsUsed(s), c: caps.careers, st: caps.staff, se: caps.sessions, e: caps.equipment, d: deptCount(s), ds: deptSlots(s) })),
    h('div', { class: 'row wrap' },
      up !== null && next ? h('button', { class: 'btn small primary', disabled: !!blk, title: blk ? t(blk) : t(next.reach), onclick: () => say(upgradeHq(s), l('Sede ampliada!', 'HQ upgraded!')) }, ic('building'), ` ${t(S.upgrade)}: ${t(next.name)} (${$(up)})`) : null,
      blk && next ? h('small', { class: 'muted' }, t(blk)) : null,
      !st.ownBuilding ? h('button', { class: 'btn small', title: t(l('Acaba o aluguel da matriz até a próxima mudança de sede.', 'Ends the main HQ rent until the next move.')), onclick: () => { if (confirm(t(l('Comprar o prédio por {v}?', 'Buy the building for {v}?'), { v: $(buildingPrice(s)) }))) say(buyBuilding(s), l('O prédio é seu.', 'The building is yours.')); } }, `${t(l('Comprar o prédio', 'Buy the building'))} (${$(buildingPrice(s))})`) : null,
    ),
  );
}

function deptBlock(s: GameState): HTMLElement {
  const st = hq6(s);
  return h('div', { class: 'mg-depts' }, DEPTS.map((d) => {
    const lv = st.depts[d.id] ?? 0;
    const blk = deptBlocker(s, d.id);
    return h('div', { class: `mg-dept ${lv ? 'on' : ''}` },
      h('b', null, ic(d.icon), ' ', t(d.name)), ' ', lv ? pill(`${lv}/3`, 'good') : null,
      h('small', { class: 'muted' }, t(d.desc)),
      lv ? h('small', null, t(l('Manutenção: {v}/mês', 'Upkeep: {v}/mo'), { v: $(money(s, d.upkeep * lv)) })) : null,
      h('div', { class: 'row wrap' },
        lv < 3 ? h('button', { class: 'btn small', disabled: !!blk, title: blk ? t(blk) : '', onclick: () => say(buildDept(s, d.id), lv ? l('Departamento ampliado.', 'Department upgraded.') : l('Departamento criado.', 'Department created.')) }, `${lv ? t(l('Ampliar', 'Upgrade')) : t(l('Criar', 'Create'))} ${$(money(s, d.cost[lv]))}`) : null,
        lv ? h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Fechar o departamento? O investimento não volta.', 'Close the department? The investment is not refunded.')))) { closeDept(s, d.id); rerender(); } } }, t(l('Fechar', 'Close'))) : null,
      ),
    );
  }));
}

function branchBlock(s: GameState): HTMLElement {
  const st = hq6(s);
  const acts = playerActs(s);
  const options = [...CITIES].filter((c) => c.id !== s.config.homeCity && !s.branches.some((b) => b.city === c.id)).sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
  if (!options.some((c) => c.id === newCity)) newCity = options[0]?.id ?? '';
  const err = newCity ? canOpenBranch(s, newCity) : l('Sem cidades disponíveis.', 'No cities available.');
  return h('div', null,
    h('div', { class: 'row wrap mg-open' },
      select(newCity, options.map((c) => ({ value: c.id, label: `${cityName(c.id)} (${t(MARKETS.find((m) => m.id === c.market)?.name)})` })), (v) => { newCity = v; rerender(); }, { 'aria-label': t(l('Cidade da nova filial', 'New branch city')) }),
      h('button', { class: 'btn small primary', disabled: !!err, title: err ? t(err) : '', onclick: () => say(openBranch(s, newCity), l('Filial aberta!', 'Branch opened!')) }, ic('building'), ` ${t(l('Abrir filial', 'Open branch'))} (${$(money(s, BRANCH_LEVELS[0].cost))})`),
      err ? h('small', { class: 'muted' }, t(err)) : null,
    ),
    s.branches.length ? h('div', { class: 'mg-branches' }, s.branches.map((b) => {
      const lv = BRANCH_LEVELS[b.level];
      const next = BRANCH_LEVELS[b.level + 1];
      const here = acts.filter((id) => s.branchOf[id] === b.id);
      const focus = st.branchFocus[b.id];
      return h('div', { class: 'mg-card' },
        h('h4', null, `${cityName(b.city)} — ${t(lv.name)}`),
        h('small', null, `+${lv.careers} ${t(l('carreiras', 'careers'))} · +${lv.staff} ${t(l('equipe', 'staff'))} · +${lv.sessions} ${t(l('sessões', 'sessions'))} · ${$(money(s, lv.rent))}/${t(l('mês', 'mo'))}`),
        h('label', null, t(l('Foco', 'Focus')), ' ', select<string>(focus ?? '', [{ value: '', label: t(l('(nenhum)', '(none)')) }, ...(Object.keys(BRANCH_FOCUS) as BranchFocus[]).map((f) => ({ value: f, label: `${t(BRANCH_FOCUS[f].name)} — ${t(BRANCH_FOCUS[f].desc)}` }))], (v) => { if (v) setBranchFocus(s, b.id, v as BranchFocus); else { delete st.branchFocus[b.id]; } rerender(); })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!st.directors[b.id], onchange: () => say(hireDirector(s, b.id)) }), t(l('Diretor(a) regional: foco 50% mais forte ({v}/mês)', 'Regional director: focus 50% stronger ({v}/mo)'), { v: $(directorSalary(s, b.id)) })),
        h('div', { class: 'row wrap' }, here.length ? here.map((id) => actLink(s, id)) : h('small', { class: 'muted' }, t(l('Nenhum artista designado.', 'No artists assigned.')))),
        h('div', { class: 'row wrap' },
          next ? h('button', { class: 'btn small', onclick: () => say(upgradeBranch(s, b.id), l('Filial ampliada!', 'Branch upgraded!')) }, `${t(l('Ampliar para', 'Upgrade to'))} ${t(next.name)} (${$(money(s, next.cost))})`) : null,
          h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Fechar esta filial? O investimento não volta.', 'Close this branch? The investment is not refunded.')))) { closeBranch(s, b.id); rerender(); } } }, t(l('Fechar', 'Close'))),
        ),
      );
    })) : null,
    s.branches.length && acts.length ? h('div', null, h('h4', null, t(l('Quem trabalha onde', 'Who works where'))),
      h('ul', { class: 'small' }, acts.map((id) => h('li', null, actLink(s, id), ' ',
        select(s.branchOf[id] ?? '', [{ value: '', label: t(l('Matriz', 'Main HQ')) }, ...s.branches.map((b) => ({ value: b.id, label: cityName(b.city) }))], (v) => { assignBranch(s, id, v || null); rerender(); }))))) : null,
  );
}

function marketsBlock(s: GameState): HTMLElement {
  return h('ul', { class: 'mg-markets' }, MARKETS.map((m) => h('li', null, t(m.name), ' ',
    s.player.territories.includes(m.id) ? pill('✓', 'good') : h('button', { class: 'btn small', onclick: () => say(openTerritory(s, m.id), l('Mercado aberto.', 'Market opened.')) }, `${t(S.openMarket)} ${$(territoryCost(s, m.id))}`))));
}

function managementSection(s: GameState): HTMLElement {
  return section(t(l('Gestão da empresa', 'Company management')),
    h('p', { class: 'muted small' }, t(l('Amplie a sede, crie departamentos, compre o prédio, abra e especialize filiais e entre em novos mercados. Departamentos e focos viram bônus (veja Você → Personalidade → Seus bônus).', 'Upgrade the HQ, build departments, buy the building, open and specialise branches and enter new markets. Departments and focuses become bonuses (see You → Personality → Your bonuses).'))),
    hqBlock(s),
    h('h4', null, t(l('Departamentos', 'Departments'))),
    deptBlock(s),
    h('h4', null, t(l('Filiais', 'Branches'))),
    branchBlock(s),
    h('h4', null, t(S.territories)),
    marketsBlock(s),
  );
}

registerSection('hq', { id: 'management', order: 1, render: managementSection });

