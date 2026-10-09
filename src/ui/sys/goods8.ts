// Interface dos bens e da agenda pessoal (rodada 8), dentro da área "Você": loja por categoria, seus bens
// (valor de mercado, manutenção, venda), investimentos, equipe pessoal e fundação; e a agenda pessoal com
// cursos, rotina de saúde, aparições públicas, noites em clubes, palestras e as ações liberadas por bens.

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  APPEARANCES, CAT_NAMES, COURSES, FOUNDATION, GOODS, PSTAFF, ROUTINES, appear, artExhibit, buyGood, canReachCity, closeFoundation, courseBlocker,
  createFoundation, firePStaff, goodAvailable, goodById, goodPrice, goodUpkeep, goods, hasUnlock, hirePStaff, homeSession, lecture, netWorth,
  saleValue, sellGood, setRoutine, staffBlocker, study, upkeepTotal, venueNight, yachtParty,
  type AppearId, type CourseId, type FoundationFocus, type GoodCat, type GoodDef, type PStaffId, type RoutineId,
} from '../../sim/sys/goods8';
import { energyLeft, maxEnergy } from '../../sim/sys/life';
import { ATTR_NAME, ownerOf } from '../../sim/sys/people/owner';
import type { PerkKey } from '../../sim/perks';
import type { GameState } from '../../sim/types';
import { money, rngOf } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { chips, stat, tabs, tile } from '../vis';
import { investmentsTab } from './bolsa10';

const isL = (x: unknown): x is L => !!x && typeof x === 'object' && 'pt' in (x as object) && 'en' in (x as object);

/** Resultado de ação: erro (L) vira aviso ruim; {text} vira aviso; null vira o texto de sucesso. */
function run(res: unknown, ok?: L): void {
  if (res === null || res === undefined) { if (ok) toast(t(ok), 'good'); }
  else if (isL(res)) toast(t(res), 'bad');
  else if (typeof res === 'object' && 'text' in (res as object)) toast(t((res as { text: L }).text), (res as { ok?: boolean }).ok === false ? 'info' : 'good');
  rerender();
}

const PERK_NAMES: Partial<Record<PerkKey, L>> = {
  offer: l('Ofertas', 'Offers'), critics: l('Crítica', 'Critics'), songQ: l('Qualidade das músicas', 'Song quality'), signals: l('Sinais de talentos', 'Talent signals'),
  scoutAccuracy: l('Precisão dos olheiros', 'Scout accuracy'), energy: l('Tempo livre', 'Free time'), appeal: l('Apelo dos lançamentos', 'Release appeal'),
  showRevenue: l('Receita de shows', 'Show revenue'), morale: l('Moral do elenco', 'Roster morale'), trust: l('Confiança dos artistas', 'Artist trust'),
  reputation: l('Reputação', 'Reputation'), staffCost: l('Custo da equipe', 'Staff cost'), valuation: l('Valor do selo', 'Label value'), advance: l('Adiantamentos', 'Advances'),
};

const pct = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
const num = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 10) / 10}`;
const FRACTION: PerkKey[] = ['scoutAccuracy', 'appeal', 'showRevenue', 'staffCost', 'valuation', 'advance', 'offer'];

function perkPills(perks: Partial<Record<PerkKey, number>> | undefined): HTMLElement[] {
  if (!perks) return [];
  return (Object.keys(perks) as PerkKey[]).filter((k) => PERK_NAMES[k]).map((k) => {
    const v = perks[k]!;
    const good = k === 'staffCost' || k === 'advance' ? v < 0 : v > 0;
    return pill(`${t(PERK_NAMES[k]!)} ${FRACTION.includes(k) ? pct(v) : num(v)}`, good ? 'good' : 'warn');
  });
}

function effects(d: GoodDef): HTMLElement {
  const out: HTMLElement[] = [];
  if (d.city) out.push(pill(t(l('Casa em {c}: +6% de público e sinais locais', 'Home in {c}: +6% audience and local signals'), { c: cityById[d.city]?.name ?? l(d.city) }), 'good'));
  if (d.relief) out.push(pill(t(l('Estresse −{n}/mês', 'Stress −{n}/mo'), { n: d.relief }), 'good'));
  if (d.health) out.push(pill(t(l('Saúde {n}/mês', 'Health {n}/mo'), { n: num(d.health) }), d.health > 0 ? 'good' : 'warn'));
  if (d.fame) out.push(pill(t(l('Fama {n}/mês', 'Fame {n}/mo'), { n: num(d.fame) })));
  if (d.xp) out.push(pill(`${t(ATTR_NAME[d.xp[0]])} ↑`, 'good'));
  if (d.skill) out.push(pill(t(l('Treina sua música', 'Trains your music')), 'good'));
  out.push(...perkPills(d.perks));
  if (d.unlock) out.push(pill(t(UNLOCK_NAMES[d.unlock]), 'good'));
  if (d.risky) out.push(pill(t(l('risco de acidente', 'accident risk')), 'warn'));
  if (d.stealable) out.push(pill(t(l('alvo de ladrões', 'theft target')), 'warn'));
  out.push(pill(d.drift >= 0 ? t(l('valoriza ~{p}/ano', 'appreciates ~{p}/yr'), { p: pct(d.drift) }) : t(l('deprecia ~{p}/ano', 'depreciates ~{p}/yr'), { p: pct(-d.drift) }), d.drift >= 0 ? 'good' : ''));
  return h('div', { class: 'chips' }, out);
}

const UNLOCK_NAMES: Record<NonNullable<GoodDef['unlock']>, L> = {
  yachtParty: l('libera festa no iate', 'unlocks yacht parties'),
  homeSession: l('libera sessões em casa', 'unlocks home sessions'),
  artExhibit: l('libera exposição', 'unlocks exhibitions'),
  privateFlight: l('voos particulares no mapa', 'private flights on the map'),
};

function wealthChips(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const st = goods(s);
  return chips(
    stat('money', $(o.wealth), l('Dinheiro no bolso', 'Cash in pocket')),
    stat('house', $(st.owned.reduce((a, x) => a + x.value, 0)), l('Valor dos bens', 'Value of belongings')),
    stat('chart-up', $(Object.values(st.inv).reduce((a, x) => a + (x?.value ?? 0), 0)), l('Investido', 'Invested')),
    stat('calendar', `${$(upkeepTotal(s))}/${t(l('mês', 'mo'))}`, l('Custos fixos pessoais', 'Personal fixed costs')),
    stat('star', $(netWorth(s)), l('Patrimônio líquido', 'Net worth')),
  );
}

// ------------------------------------------------------------------ loja

let shopCat: GoodCat = 'home';
const CAT_ICON: Record<GoodCat, string> = { home: 'house', vehicle: 'tour-bus', gear: 'guitar', studio: 'mic', art: 'bulb', style: 'shirt', jewelry: 'sparkle', boat: 'ship', plane: 'plane', collect: 'disc' };

function shopTab(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const cats = Object.keys(CAT_NAMES) as GoodCat[];
  const list = GOODS.filter((d) => d.cat === shopCat).sort((a, b) => a.price - b.price);
  return h('div', null,
    wealthChips(s),
    h('div', { class: 'layer-bar', role: 'group' }, cats.map((c) => h('button', { type: 'button', class: `chip-btn ${shopCat === c ? 'on' : ''}`, 'aria-pressed': shopCat === c ? 'true' : 'false', onclick: () => { shopCat = c; rerender(); } }, t(CAT_NAMES[c])))),
    h('p', { class: 'muted small' }, t(l('Tudo sai do seu patrimônio pessoal, não do caixa do selo. Bens têm manutenção mensal; se faltar dinheiro por três meses, o banco toma e leiloa. Venda quando quiser pelo valor de mercado (menos 6%).', 'Everything comes out of your personal wealth, not the label\'s cash. Belongings have monthly upkeep; three months unpaid and the bank repossesses them. Sell any time at market value (minus 6%).'))),
    h('div', { class: 'cards' }, list.filter((d) => goodAvailable(s, d)).map((d) => {
      const price = goodPrice(s, d);
      const have = goods(s).owned.filter((x) => x.id === d.id).length;
      return tile(CAT_ICON[d.cat], t(d.name), [
        h('small', null, t(d.desc)),
        h('div', null, h('b', null, $(price)), h('small', { class: 'muted' }, ` · ${t(l('manutenção', 'upkeep'))} ${$(goodUpkeep(s, d))}/${t(l('mês', 'mo'))}`)),
        effects(d),
        have ? pill(t(l('você tem {n}', 'you own {n}'), { n: have }), 'good') : null,
        h('button', { class: 'btn small primary', disabled: o.wealth < price, onclick: () => run(buyGood(s, d.id), l('Comprado!', 'Bought!')) }, t(l('Comprar', 'Buy'))),
      ]);
    })),
  );
}

// ------------------------------------------------------------------ seus bens

function mineTab(s: GameState): HTMLElement {
  const st = goods(s);
  const rows = st.owned.map((o) => {
    const d = goodById[o.id];
    const gain = o.value / Math.max(1, o.paid) - 1;
    return h('tr', null,
      h('td', null, h('b', null, d ? t(d.name) : o.id), d ? h('div', { class: 'muted small' }, t(CAT_NAMES[d.cat])) : null),
      h('td', null, $(o.paid)),
      h('td', null, $(o.value), ' ', pill(pct(gain), gain >= 0 ? 'good' : 'bad')),
      h('td', null, d ? `${$(goodUpkeep(s, d))}/${t(l('mês', 'mo'))}` : '—', o.unpaid ? pill(t(l('atrasada', 'overdue')), 'bad') : null),
      h('td', null, h('button', { class: 'btn small', onclick: () => { if (confirm(t(l('Vender por {v}?', 'Sell for {v}?'), { v: $(saleValue(o)) }))) run(sellGood(s, o.uid), l('Vendido.', 'Sold.')); } }, `${t(l('Vender', 'Sell'))} ${$(saleValue(o))}`)));
  });
  return h('div', null,
    wealthChips(s),
    section(t(l('Seus bens', 'Your belongings')),
      rows.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Bem', 'Item'))), h('th', null, t(l('Pago', 'Paid'))), h('th', null, t(l('Vale hoje', 'Worth today'))), h('th', null, t(l('Manutenção', 'Upkeep'))), h('th', null, ''))),
        h('tbody', null, rows)) : h('p', { class: 'muted' }, t(l('Nada comprado ainda. Veja a loja.', 'Nothing bought yet. Check the shop.'))),
    ),
    st.log.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'memory' }, st.log.slice(0, 12).map((e) => h('li', { class: e.tone }, h('span', { class: 'muted' }, `${e.year} · `), t(e.text))))) : null,
  );
}

// ------------------------------------------------------------------ equipe pessoal e fundação

function staffTab(s: GameState): HTMLElement {
  const st = goods(s);
  const ids = (Object.keys(PSTAFF) as PStaffId[]).filter((id) => s.year >= PSTAFF[id].from);
  let focus: FoundationFocus = 'schools';
  const f = st.foundation;
  return h('div', null,
    section(t(l('Equipe pessoal', 'Personal staff')),
      h('p', { class: 'muted small' }, t(l('Pagos do seu bolso todo mês. Sem salário, eles vão embora.', 'Paid from your pocket every month. Without pay, they leave.'))),
      h('div', { class: 'cards' }, ids.map((id) => {
        const d = PSTAFF[id];
        const hired = st.staff[id] !== undefined;
        const err = hired ? null : staffBlocker(s, id);
        return tile('fans', t(d.name), [
          h('small', null, t(d.desc)),
          h('small', { class: 'muted' }, `${$(money(s, d.salary))}/${t(l('mês', 'mo'))}`),
          h('div', { class: 'chips' }, perkPills(d.perks), d.relief ? pill(t(l('Estresse −{n}/mês', 'Stress −{n}/mo'), { n: d.relief }), 'good') : null, d.health ? pill(t(l('Saúde {n}/mês', 'Health {n}/mo'), { n: num(d.health) }), 'good') : null),
          hired ? h('button', { class: 'btn small ghost', onclick: () => run(firePStaff(s, id), l('Dispensado.', 'Let go.')) }, t(l('Dispensar', 'Let go')))
            : h('button', { class: 'btn small primary', disabled: !!err, title: err ? t(err) : '', onclick: () => run(hirePStaff(s, id), l('Contratado!', 'Hired!')) }, t(l('Contratar', 'Hire'))),
          !hired && err ? h('small', { class: 'muted' }, t(err)) : null,
        ]);
      })),
    ),
    section(t(l('Fundação', 'Foundation')),
      f ? h('div', null,
        h('p', null, pill(t(FOUNDATION[f.focus].name), 'good'), ` ${t(l('desde', 'since'))} ${f.since} · ${t(l('doado', 'given'))} ${$(f.given)}`),
        h('p', { class: 'small muted' }, t(FOUNDATION[f.focus].desc), ' ', t(l('Repasse de {v}/mês do seu bolso.', 'Transfers {v}/mo from your pocket.'), { v: $(money(s, 1500)) })),
        h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Encerrar a fundação? A imprensa vai notar.', 'Close the foundation? The press will notice.')))) run(closeFoundation(s), l('Fundação encerrada.', 'Foundation closed.')); } }, t(l('Encerrar', 'Close'))))
        : h('div', null,
          h('p', { class: 'small muted' }, t(l('Dotação inicial de {v} e repasse mensal de {m}. Dá reputação, fama e efeitos conforme a causa.', 'Initial endowment of {v} and a monthly transfer of {m}. Gives reputation, fame and effects depending on the cause.'), { v: $(money(s, 50000)), m: $(money(s, 1500)) })),
          h('div', { class: 'row wrap' },
            select<FoundationFocus>(focus, (Object.keys(FOUNDATION) as FoundationFocus[]).map((k) => ({ value: k, label: `${t(FOUNDATION[k].name)} — ${t(FOUNDATION[k].desc)}` })), (v) => (focus = v)),
            h('button', { class: 'btn small primary', onclick: () => run(createFoundation(s, focus), l('Fundação criada!', 'Foundation created!')) }, t(l('Criar fundação', 'Create foundation'))))),
    ),
  );
}

/** Aba "Bens e investimentos" da área Você. */
export function possessionsTab(s: GameState): HTMLElement {
  return tabs('goods8', [
    { id: 'shop', label: t(l('Loja', 'Shop')), icon: 'money', render: () => shopTab(s) },
    { id: 'mine', label: t(l('Seus bens', 'Your belongings')), icon: 'house', badge: goods(s).owned.filter((x) => x.unpaid).length || undefined, render: () => mineTab(s) },
    { id: 'invest', label: t(l('Investimentos', 'Investments')), icon: 'chart-up', render: () => investmentsTab(s) },
    { id: 'staff', label: t(l('Equipe pessoal e fundação', 'Personal staff and foundation')), icon: 'fans', render: () => staffTab(s) },
  ], rerender);
}

// ------------------------------------------------------------------ agenda pessoal

function freeTime(s: GameState): HTMLElement {
  return h('p', { class: 'small' }, t(l('Tempo livre este mês: {n} de {m} ⏱', 'Free time this month: {n} of {m} ⏱'), { n: energyLeft(s), m: maxEnergy(s) }));
}

/** Aba "Agenda pessoal" da área Você. */
export function personalAgendaTab(s: GameState): HTMLElement {
  const st = goods(s);
  const r = () => rngOf(s);
  const courses = (Object.keys(COURSES) as CourseId[]).filter((id) => s.year >= COURSES[id].from);
  const routines = (Object.keys(ROUTINES) as RoutineId[]).filter((id) => s.year >= ROUTINES[id].from);
  const apps = (Object.keys(APPEARANCES) as AppearId[]).filter((id) => s.year >= APPEARANCES[id].from);
  const clubs = s.clubs.filter((c) => !c.closed && canReachCity(s, c.city)).sort((a, b) => b.prestige - a.prestige).slice(0, 8);
  const unlocks = [
    hasUnlock(s, 'homeSession') ? h('button', { class: 'btn small', onclick: () => run(homeSession(s)) }, t(l('Sessão no estúdio de casa', 'Home studio session')), ' ⏱') : null,
    hasUnlock(s, 'yachtParty') ? h('button', { class: 'btn small', onclick: () => run(yachtParty(s, r())) }, `${t(l('Festa no iate', 'Yacht party'))} (${$(money(s, 4000))}) ⏱⏱`) : null,
    hasUnlock(s, 'artExhibit') ? h('button', { class: 'btn small', onclick: () => run(artExhibit(s)) }, `${t(l('Expor sua coleção', 'Exhibit your collection'))} (${$(money(s, 1500))}) ⏱`) : null,
  ].filter(Boolean) as HTMLElement[];
  return h('div', null,
    freeTime(s),
    section(t(l('Estudos', 'Studies')),
      h('p', { class: 'muted small' }, t(l('Cada aula gasta 1 de tempo livre e sai do bolso. Ao completar o curso, o diploma dá um bônus permanente ao selo.', 'Each class uses 1 free time and comes out of your pocket. Finishing the course gives a permanent bonus to the label.'))),
      h('table', { class: 'tbl compact' }, h('tbody', null, courses.map((id) => {
        const c = COURSES[id];
        const done = st.diplomas.includes(id);
        const err = courseBlocker(s, id);
        return h('tr', null,
          h('td', null, h('b', null, t(c.name)), h('div', { class: 'muted small' }, t(c.desc))),
          h('td', null, h('div', { class: 'chips' }, perkPills(c.perks))),
          h('td', null, done ? pill(t(l('formado', 'graduated')), 'good') : `${st.study[id] ?? 0}/${c.sessions}`),
          h('td', null, done ? '' : h('button', { class: 'btn small', disabled: !!err, onclick: () => run(study(s, id)) }, `${t(l('Assistir aula', 'Attend class'))} (${$(money(s, c.cost))}) ⏱`)));
      }))),
    ),
    section(t(l('Rotina de saúde', 'Health routine')),
      h('div', { class: 'row wrap' },
        select<RoutineId>(st.routine, routines.map((id) => ({ value: id, label: `${t(ROUTINES[id].name)}${ROUTINES[id].cost ? ` · ${$(money(s, ROUTINES[id].cost))}/${t(l('mês', 'mo'))}` : ''}` })), (v) => run(setRoutine(s, v), l('Rotina ajustada.', 'Routine set.'))),
        h('small', { class: 'muted' }, t(ROUTINES[st.routine]?.desc ?? l('', '')))),
      h('p', { class: 'muted small' }, t(l('Não gasta tempo livre: vale todo mês enquanto você pagar. Pode moldar seu jeito (disciplinado, espiritual).', 'Uses no free time: it applies every month while you pay. It can shape you (disciplined, spiritual).'))),
    ),
    section(t(l('Aparições públicas', 'Public appearances')),
      h('p', { class: 'muted small' }, t(l('Sobem sua fama e deixam você em evidência por seis semanas (lançamentos do selo com mais apelo). Carisma e um estilista reduzem o risco de gafe.', 'They raise your fame and keep you in the spotlight for six weeks (label releases get more appeal). Charisma and a stylist lower the risk of a gaffe.'))),
      st.spotlight >= s.week ? pill(t(l('em evidência', 'in the spotlight')), 'good') : null,
      h('div', { class: 'row wrap' }, apps.map((id) => {
        const d = APPEARANCES[id];
        return h('button', { class: 'btn small', title: t(d.desc), onclick: () => run(appear(s, r(), id)) }, t(d.name), d.fee < 0 ? ` (${$(money(s, -d.fee))})` : d.fee > 0 ? ` (+${$(money(s, d.fee))})` : '', ' ⏱');
      })),
    ),
    section(t(l('Noites e networking', 'Nights out and networking')),
      h('p', { class: 'muted small' }, t(l('Clubes da sua cidade, de cidades onde você tem casa ou filial, ou onde você está viajando (aba Mundo → mapa). Cada noite pode revelar um talento local.', 'Clubs in your city, in cities where you own a home or a branch, or where you are travelling (World → map). Each night may reveal a local talent.'))),
      clubs.length ? h('table', { class: 'tbl compact' }, h('tbody', null, clubs.map((c) => h('tr', null,
        h('td', null, h('b', null, c.name), h('div', { class: 'muted small' }, `${t(cityById[c.city]?.name ?? l(c.city))} · ${t(l('prestígio', 'prestige'))} ${Math.round(c.prestige)}`)),
        h('td', null, h('button', { class: 'btn small', onclick: () => run(venueNight(s, r(), c.id)) }, `${t(l('Passar a noite', 'Spend the night'))} (${$(money(s, 150 + c.prestige * 4))}) ⏱`)))))) : h('p', { class: 'muted small' }, t(l('Nenhum clube ao seu alcance agora.', 'No club within reach right now.'))),
      h('div', { class: 'row wrap' }, h('button', { class: 'btn small', onclick: () => run(lecture(s)) }, t(l('Dar uma palestra (cachê)', 'Give a lecture (paid)')), ' ⏱')),
    ),
    unlocks.length ? section(t(l('Ações dos seus bens', 'Actions from your belongings')), h('div', { class: 'row wrap' }, unlocks)) : null,
  );
}
