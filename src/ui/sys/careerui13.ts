// Rodada 13 — telas que seguem a carreira: indicadores de cada carreira ativa na sede, dicas de
// "próximos passos" por carreira (e sem conselho de selo para quem não tem selo), e formulários
// curtos para fundar o negócio/assinar clientes direto da página da carreira (antes eram becos sem
// botão: "funde em Empreendimentos"). Quando algo bloqueia, a tela diz quanto falta e de onde tirar.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { careerDef, careers, timeLoad } from '../../sim/sys/careers12';
import { liveOf } from '../../sim/sys/live';
import { prod, studios } from '../../sim/sys/studio12';
import { c12, hasAgency } from '../../sim/sys/tour12';
import { VKINDS, bookingCandidates, foundCost, foundVenture, funds, kindsAvailable, signBooking, ventures, type Holder, type VKind } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { fmtL, money, rngOf } from '../../sim/util';
import { ADVISOR_EXTRA, type Tip } from '../advisor';
import { CAREER_NAV } from '../careernav13';
import { PAGE16 } from '../pages16';
import { CAREER_PAGE17 } from '../nav17';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerSection } from '../registry';
import { store } from '../store';
import { setTab } from '../vis';

const say = (e: L | null, ok: L) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const HOLD: Record<Holder, L> = { label: l('Caixa do selo', 'Label cash'), personal: l('Seu patrimônio', 'Your wealth') };

/** Abre a "casa" de uma carreira (área + aba certa). */
export function openCareer(id: string): void {
  const hm = CAREER_NAV[id]?.home;
  // r17: cada carreira abre a sua página exclusiva (Você › Carreiras)
  if (CAREER_PAGE17[id]) { store.area = CAREER_PAGE17[id].area; rerender(); return; }
  const area = careerDef(id)?.area ?? hm?.area ?? 'desk';
  if (hm?.tab && hm.area === area) setTab(hm.tab[0], hm.tab[1]);
  store.area = area;
  rerender();
}

// ---------------------------------------------------------------- fundar / assinar na própria página

export function foundInline(s: GameState, kind: VKind, why: L): HTMLElement {
  const info = VKINDS[kind];
  if (!kindsAvailable(s).includes(kind)) return h('p', { class: 'muted' }, t(l('Esse negócio só surge a partir de {y}.', 'This business only appears from {y}.'), { y: info.from }));
  const cost = foundCost(s, kind);
  const can = (x: Holder) => funds(s, x) >= cost;
  let owner: Holder = can('label') || !can('personal') ? 'label' : 'personal';
  let name = '';
  const short = Math.max(0, cost - Math.max(funds(s, 'label'), funds(s, 'personal')));
  return h('div', { class: 'card' },
    h('p', null, t(why)),
    h('p', { class: 'small muted' }, t(info.desc), ' ', t(l('Custo de abertura {c}; manutenção ~{u}/mês mais equipe.', 'Opening cost {c}; upkeep ~{u}/month plus staff.'), { c: $(cost), u: $(money(s, info.upkeep)) })),
    h('div', { class: 'found13' },
      h('input', { type: 'text', placeholder: t(l('Nome (opcional)', 'Name (optional)')), maxlength: 40, oninput: (e: Event) => (name = (e.target as HTMLInputElement).value) }),
      select<Holder>(owner, (['label', 'personal'] as Holder[]).map((x) => ({ value: x, label: `${t(HOLD[x])} — ${$(funds(s, x))}${can(x) ? '' : ` (${t(l('insuficiente', 'not enough'))})`}` })), (x) => (owner = x)),
      h('button', { class: 'btn small primary', disabled: !can('label') && !can('personal'), onclick: () => say(foundVenture(s, kind, owner, { name }), fmtL(l('{k} fundada. Agora assine clientes.', '{k} founded. Now sign clients.'), { k: info.name })) }, t(l('Fundar ({c})', 'Found ({c})'), { c: $(cost) }))),
    short > 0 ? h('p', { class: 'small bad' }, t(l('Faltam {x}: o selo tem {a} e você tem {b}. Venda um master ou negócio, pegue um empréstimo (Negócios) ou use o mercado de serviços enquanto junta o dinheiro.', 'You are {x} short: the label has {a} and you have {b}. Sell a master or a business, take a loan (Business) or use the services market while you save up.'), { x: $(short), a: $(funds(s, 'label')), b: $(funds(s, 'personal')) })) : null);
}

/** Assinar clientes direto da página de turnês (a agência existe, mas está vazia). */
export function signInline(s: GameState, v: NonNullable<ReturnType<typeof hasAgency>>): HTMLElement {
  const cands = bookingCandidates(s, v.id);
  let pick = cands[0]?.id ?? '';
  let rate = 0.12;
  const cap = 3 + v.level * 2;
  return h('div', { class: 'card' },
    h('p', null, t(l('{n} ainda não tem clientes ({c}/{m}). Ofereça agenciamento: comissão menor e agência com boa reputação convencem mais; estrelas resistem a trocar de agência.', '{n} has no clients yet ({c}/{m}). Offer booking: a lower commission and a well-reputed agency persuade more; stars resist switching agencies.'), { n: v.name, c: v.clients?.length ?? 0, m: cap })),
    cands.length ? h('div', { class: 'found13' },
      select<string>(pick, cands.map((a) => ({ value: a.id, label: `${a.name} (${Math.round(a.fame)})` })), (x) => (pick = x)),
      select<number>(rate, [0.08, 0.1, 0.12, 0.15, 0.2].map((x) => ({ value: x, label: `${t(l('comissão', 'commission'))} ${Math.round(x * 100)}%` })), (x) => (rate = x)),
      h('button', { class: 'btn small primary', onclick: () => { const r = signBooking(s, rngOf(s), v.id, pick, rate); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, t(l('Oferecer agenciamento', 'Offer booking'))))
      : h('p', { class: 'muted small' }, t(l('Nenhum artista livre com fama 10+ agora. Volte no mês que vem.', 'No free act with fame 10+ right now. Check again next month.'))));
}

// ---------------------------------------------------------------- indicadores na sede

type Kpi = [L, string, string?];
const vsum = (s: GameState, k: VKind) => { const list = ventures(s).list.filter((v) => v.kind === k); return { n: list.length, y: list.reduce((a, v) => a + v.pl.reduce((b, e) => b + e.rev - e.cost, 0), 0) }; };
const ventureKpis = (s: GameState, k: VKind): Kpi[] => { const x = vsum(s, k); return [[l('Negócios', 'Businesses'), String(x.n), x.n ? '' : 'bad'], [l('Resultado 12 meses', '12-month result'), $(x.y), x.y < 0 ? 'bad' : 'good']]; };

function kpis(s: GameState, id: string): Kpi[] {
  switch (id) {
    case 'label': { const r = s.player.reputation; return [[l('Elenco', 'Roster'), String(Object.values(s.acts).filter((a) => a.owner === 'player').length)], [l('Caixa', 'Cash'), $(s.player.cash), s.player.cash < 0 ? 'bad' : ''], [l('Reputação', 'Reputation'), String(Math.round((r.artistic + r.commercial + r.artists + r.institutional) / 4))]]; }
    case 'manager': { const mg = ventures(s).mg; return [[l('Clientes', 'Clients'), String(mg.clients.length), mg.clients.length ? '' : 'bad'], [l('Reputação', 'Reputation'), String(Math.round(mg.rep))], [l('Comissões (total)', 'Commissions (total)'), $(mg.total)], [l('Crises', 'Crises'), String(mg.clients.filter((c) => c.crisis).length), mg.clients.some((c) => c.crisis) ? 'bad' : '']]; }
    case 'booking': { const c = c12(s), ag = hasAgency(s); return [[l('Agência', 'Agency'), ag ? `${ag.clients?.length ?? 0} ${t(l('clientes', 'clients'))}` : '—', ag ? '' : 'bad'], [l('Datas marcadas', 'Dates booked'), String(c.shows.filter((x) => x.status === 'booked').length)], [l('Promotora', 'Promotion arm'), c.promoter.on ? $(c.promoter.total) : '—', c.promoter.total < 0 ? 'bad' : ''], [l('Ofertas na mesa', 'Offers pending'), String(c.offers.length), c.offers.length ? 'warn' : '']]; }
    case 'festival': { const f = liveOf(s).fests; return [[l('Festivais', 'Festivals'), String(f.length), f.length ? '' : 'bad'], ...ventureKpis(s, 'festival').slice(1)]; }
    case 'venue': { const v = liveOf(s).venue; return [[l('Casa', 'Venue'), v ? v.name : '—', v ? '' : 'bad']]; }
    case 'studio': { const p = prod(s); return [[l('Estúdios', 'Studios'), String(studios(s).length), studios(s).length || p.on ? '' : 'bad'], [l('Produtor: reputação', 'Producer reputation'), p.on ? String(Math.round(p.rep)) : '—'], [l('Propostas', 'Offers'), String(p.offers.length)]]; }
    case 'publisher': case 'media': case 'platform': return ventureKpis(s, id);
    case 'musician': { const b = Object.values(s.acts).find((a) => a.playerBand); return b ? [[l('Banda', 'Band'), b.name], [l('Fama', 'Fame'), String(Math.round(b.fame))]] : [[l('Banda', 'Band'), '—', 'bad']]; }
    default: return [];
  }
}

function hqKpis(s: GameState): HTMLElement | null {
  const st = careers(s);
  const load = timeLoad(s);
  return section(t(l('Painel das suas carreiras', 'Your careers at a glance')),
    h('div', { class: 'kpi13' }, st.active.map((id) => {
      const d = careerDef(id);
      if (!d) return null;
      return h('div', { class: 'card' },
        h('div', { class: 'row between' }, h('b', null, t(d.name)), h('button', { class: 'btn tiny', onclick: () => openCareer(id) }, t(l('Abrir', 'Open')), ' →')),
        kpis(s, id).map(([k, v, c]) => h('div', { class: 'kv13' }, h('span', { class: 'muted' }, t(k)), h('b', { class: c ?? '' }, v))));
    })),
    load > 1 ? h('p', { class: 'small bad' }, pill(`${Math.round(load * 100)}%`, 'bad'), ' ', t(l('Agenda acima do limite: cada mês assim soma estresse. Largue uma carreira em Carreiras ou monte equipe.', 'Schedule over the limit: every month like this adds stress. Drop a career in Careers or build a team.'))) : null);
}
registerSection('hq', { id: 'careers13', order: 0, render: hqKpis });

// ---------------------------------------------------------------- próximos passos por carreira

ADVISOR_EXTRA.push((s) => {
  const st = careers(s), out: Tip[] = [];
  const on = (id: string) => st.active.includes(id);
  const tab = (k: VKind): [string, string] | undefined => PAGE16[k].tab; // rodada 16: cada negócio na sua página
  if (on('booking')) {
    const ag = hasAgency(s), c = c12(s);
    if (!ag && !c.promoter.on) out.push({ icon: 'tour-bus', text: l('Agente/promotor sem estrutura: funde a agência ou abra a promotora (Agente e promotor).', 'Agent/promoter with no setup: found the agency or open the promotion arm (Agent & promoter).'), area: 'tour12', level: 'warn' });
    else if (ag && !ag.clients?.length) out.push({ icon: 'tour-bus', text: l('Sua agência não tem clientes: ofereça agenciamento a artistas livres.', 'Your agency has no clients: offer booking to free acts.'), area: 'tour12', level: 'warn' });
    if (c.offers.length) out.push({ icon: 'tour-bus', text: fmtL(l('{n} proposta(s) de turnê esperando resposta.', '{n} tour offer(s) awaiting a reply.'), { n: c.offers.length }), area: 'tour12', level: 'info' });
  }
  if (on('manager')) {
    const mg = ventures(s).mg;
    if (!mg.clients.length) out.push({ icon: 'handshake', text: l('Empresário sem agenciados: prospecte artistas.', 'A manager with no clients: prospect acts.'), area: 'management', tab: ['management9', 'prospect'], level: 'warn' });
    const cr = mg.clients.filter((c) => c.crisis).length;
    if (cr) out.push({ icon: 'warning', text: fmtL(l('{n} agenciado(s) em crise: resolva antes que larguem você.', '{n} client(s) in crisis: handle it before they leave you.'), { n: cr }), area: 'management', level: 'bad' });
  }
  if (on('festival') && !liveOf(s).fests.length && s.year >= 1950) out.push({ icon: 'star', text: l('Você é dono de festival sem festival: escolha data, cidade e identidade.', 'A festival owner with no festival: pick a date, city and identity.'), area: PAGE16.festival.area, tab: tab('festival'), level: 'warn' });
  if (on('venue') && !liveOf(s).venue) out.push({ icon: 'mic', text: l('Sem casa de shows ainda: compre uma em Shows.', 'No venue yet: buy one in Shows.'), area: 'shows', level: 'warn' });
  if (on('studio') && !studios(s).length && !prod(s).on) out.push({ icon: 'cd', text: l('Estúdio/produtor parado: funde um estúdio ou comece a produzir.', 'Studio/producer idle: found a studio or start producing.'), area: 'studio12', level: 'warn' });
  for (const k of ['publisher', 'media', 'platform'] as const) if (on(k) && kindsAvailable(s).includes(k) && !vsum(s, k).n) out.push({ icon: CAREER_NAV[k].icon, text: fmtL(l('Carreira de {c} sem negócio: funde um ({p}).', '{c} career with no business: found one ({p}).'), { c: careerDef(k)!.name, p: $(foundCost(s, k)) }), area: PAGE16[k].area, tab: tab(k), level: 'info' });
  if (timeLoad(s) > 1) out.push({ icon: 'clock', text: fmtL(l('Agenda em {p}%: carreiras demais estressam todo mês.', 'Schedule at {p}%: too many careers add stress every month.'), { p: Math.round(timeLoad(s) * 100) }), area: 'careers', level: 'warn' });
  return out;
});

// r17 nav: indicadores reaproveitados pelas páginas de carreira
export { kpis as careerKpis13 };
