// Interface das carreiras (rodada 12): escolha no Novo Jogo (aba própria), área "Carreiras" em Você,
// painel em Empreendimentos e um cartão por carreira na mesa (registerCareerCard deixa cada sistema
// desenhar o próprio cartão).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState, RunConfig } from '../../sim/types';
import {
  AMBITIONS, AMBITION_PERK, ORIGINS, ambitionGoal, roleFromMain, careerDef, careerDefs, careers, decideHeir, dropCareer, startCareer, timeLoad, type Ambition, type CareerDef, type Origin,
} from '../../sim/sys/careers12';
import { pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerArea, registerSection } from '../registry';
import { store } from '../store';
import { hl } from '../newgame13';
import { fxText } from './persona';
import { openCareer } from './careerui13';
import { notoPanel } from './notoriety14';
import { setTab } from '../vis';
import { ngBalls17 } from './agenda17';

const res = (x: { ok: boolean; text: L }) => { toast(t(x.text), x.ok ? 'good' : 'bad'); rerender(); };
const go = (area: string) => { store.area = area; rerender(); };

// ---------------------------------------------------------------- cartões da mesa (registro)

const CARDS: Record<string, (s: GameState, d: CareerDef) => HTMLElement | null> = {};
/** Cada carreira pode desenhar o próprio cartão na mesa (o padrão mostra status e um atalho). */
export function registerCareerCard(id: string, render: (s: GameState, d: CareerDef) => HTMLElement | null): void { CARDS[id] = render; }

function defaultCard(s: GameState, d: CareerDef): HTMLElement {
  const st = d.status?.(s);
  return h('div', { class: 'card car12-card' },
    h('div', { class: 'row between' }, h('b', null, t(d.name)), h('button', { class: 'btn tiny', onclick: () => openCareer(d.id) }, t(l('Abrir', 'Open')) + ' →')),
    st ? h('div', { class: 'small muted' }, t(st)) : null);
}

function homeCards(s: GameState): HTMLElement | null {
  const st = careers(s);
  const load = timeLoad(s);
  return section(`${t(l('Suas carreiras', 'Your careers'))} · ${t(l('agenda', 'schedule'))} ${Math.round(load * 100)}%`,
    load > 1 ? h('p', { class: 'small bad' }, t(l('Agenda acima do limite: o estresse sobe todo mês. Largue uma carreira ou monte equipe.', 'Schedule over the limit: stress rises every month. Drop a career or build a team.'))) : null,
    h('div', { class: 'car12-grid' }, st.active.map((id) => { const d = careerDef(id); return d ? (CARDS[id] ?? defaultCard)(s, d) : null; })),
    st.heir && !st.heir.decided ? h('p', null, pill(t(l('herdeiro', 'heir')), 'warn'), ' ', h('button', { class: 'linkish', onclick: () => go('careers') }, t(l('Seu herdeiro tem outros sonhos — decidir', 'Your heir has other dreams — decide')))) : null);
}
registerSection('desk', { id: 'careers12', order: 3, render: homeCards });

// ---------------------------------------------------------------- área "Carreiras"

export function careersPanel(s: GameState): HTMLElement {
  const st = careers(s);
  const load = timeLoad(s);
  const w = st.heir && !st.heir.decided ? st.heir : undefined;
  return h('div', { class: 'car12' },
    w ? section(t(l('O herdeiro quer outra vida', 'The heir wants another life')),
      h('p', null, t(l('{h} sonha em ser: {c}. Ambição: {a}.', '{h} dreams of being: {c}. Ambition: {a}.'), { h: w.name, c: w.wants.map((id) => t(careerDef(id)!.name)).join(', '), a: t(AMBITIONS[w.ambition].name) })),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small primary', title: t(l('Troca as carreiras e a ambição pelas do herdeiro; −10 de estresse.', 'Swaps careers and ambition for the heir\'s; −10 stress.')), onclick: () => res(decideHeir(s, 'embrace')) }, t(l('Deixar seguir o próprio caminho', 'Let them follow their path'))),
        h('button', { class: 'btn small', title: t(l('Soma as carreiras do herdeiro às atuais: mais frentes, agenda mais cheia.', 'Adds the heir\'s careers to the current ones: more fronts, fuller schedule.')), onclick: () => res(decideHeir(s, 'blend')) }, t(l('Somar os dois', 'Combine both'))),
        h('button', { class: 'btn small ghost', title: t(l('Mantém tudo como está; +15 de estresse (frustração).', 'Keeps everything; +15 stress (frustration).')), onclick: () => res(decideHeir(s, 'tradition')) }, t(l('Manter a tradição da família', 'Keep the family tradition'))))) : null,
    section(t(l('Quem você é', 'Who you are')),
      h('div', { class: 'small' }, t(l('Origem', 'Origin')), ': ', h('b', null, t(ORIGINS[st.origin].name)), h('span', { class: 'muted' }, ` — ${t(ORIGINS[st.origin].desc)}`)),
      // r17: ambição é do personagem e fica travada durante a partida (só um herdeiro pode trazer outra)
      h('div', { class: 'small' }, t(l('Ambição', 'Ambition')), ': ', h('b', null, '🔒 ', t(AMBITIONS[st.ambition].name)), h('span', { class: 'muted' }, ` — ${t(AMBITIONS[st.ambition].desc)} `, t(l('(definida na criação do personagem; não muda no meio da partida)', '(set when creating the character; it does not change mid-run)')))),
      (() => { const g = ambitionGoal(s); return g ? h('div', { class: `small ${g.ok ? 'good' : 'muted'}` }, t(l('Meta deste ano até agora: ', 'This year\'s goal so far: ')), t(g.why), ` · ${t(l('cumprida dá', 'met gives'))}: ${fxText(AMBITION_PERK[st.ambition])}`) : null; })(),
      h('div', { class: 'row small' }, t(l('Agenda', 'Schedule')), ' ', bar(Math.min(100, load * 100)), ` ${Math.round(load * 100)}%`),
      st.mood.length ? h('ul', { class: 'small' }, st.mood.slice(-4).reverse().map((m) => h('li', { class: m.ok ? 'good' : 'bad' }, `${m.y}: ${t(m.t)}`))) : null),
    section(t(l('Carreiras', 'Careers')),
      h('p', { class: 'small' }, t(l('Cada carreira ocupa bolinhas de agenda (1 normal, 2 à frente, 0 delegada). Ajuste o envolvimento e contrate diretores em ', 'Each career takes schedule balls (1 normal, 2 hands-on, 0 delegated). Set involvement and hire directors in ')), h('button', { class: 'linkish', onclick: () => go('agenda17') }, t(l('Agenda e contratações', 'Schedule and hiring')))),
      h('p', { class: 'muted small' }, t(l('Comece ou largue carreiras a qualquer momento. Cada uma ocupa parte da sua agenda; sem ser dono dos negócios, use o mercado de serviços (Gestão de artistas → Serviços).', 'Start or drop careers anytime. Each takes a share of your schedule; without owning businesses, use the services market (Artist management → Services).'))),
      h('table', { class: 'tbl compact' }, h('tbody', null, careerDefs(s).map((d) => {
        const on = st.active.includes(d.id);
        return h('tr', { class: on ? 'me' : '' },
          h('td', null, h('b', null, t(d.name)), h('div', { class: 'small muted' }, t(d.desc))),
          h('td', { class: 'small' }, on ? `${t(l('desde', 'since'))} ${st.started[d.id] ?? s.year}` : `${Math.round(d.load * 100)}% ${t(l('da agenda', 'of schedule'))}`),
          h('td', null, on ? h('div', { class: 'row' }, h('button', { class: 'btn tiny', onclick: () => openCareer(d.id) }, t(l('Abrir', 'Open'))), d.id === 'label' ? h('button', { class: 'btn tiny ghost', title: t(l('Em vez de abandonar, venda o selo (r17)', 'Instead of abandoning it, sell the label (r17)')), onclick: () => { setTab('biz17', 'sale'); store.area = 'biz17'; rerender(); } }, t(l('Vender', 'Sell'))) : h('button', { class: 'btn tiny ghost', onclick: () => res(dropCareer(s, d.id)) }, t(l('Largar', 'Drop'))))
            : h('button', { class: 'btn tiny primary', onclick: () => res(startCareer(s, d.id)) }, t(l('Começar', 'Start')))));
      })))),
    notoPanel(s),
    st.log.length ? section(t(l('Trajetória', 'Path')), h('ul', { class: 'small' }, st.log.slice(-8).reverse().map((x) => h('li', null, `${x.y}: ${t(x.t)}`)))) : null,
  );
}
registerArea({ id: 'careers', label: l('Carreiras', 'Careers'), icon: 'star', key: '', render: careersPanel, badge: (s) => (careers(s).heir && !careers(s).heir!.decided ? 1 : undefined) });

// ---------------------------------------------------------------- Novo Jogo

const NG_CAREERS = ['label', 'manager', 'festival', 'booking', 'venue', 'studio', 'publisher', 'media', 'platform', 'musician'];
/** Aba "Carreira" do Novo Jogo: atividades principais (várias), origem profissional e ambição. */
export function careerCard(cfg: RunConfig, onRole?: () => void, part: 'all' | 'main' | 'identity' = 'all'): HTMLElement {
  const c = (cfg.careers ??= { main: ['label'], origin: 'musician', ambition: 'legacy' });
  cfg.role = roleFromMain(c.main);
  const box = h('div', { class: 'car12-ng' });
  // r17: atividades ficam na aba do negócio; origem e ambição são do PERSONAGEM (aba Personagem)
  const main = part !== 'identity', ident = part !== 'main';
  const draw = () => box.replaceChildren(...[
    !main ? null : h('section', { class: 'card wide' }, h('h3', null, ...hl(l('Atividade principal', 'Main activity'), 'main')),
      h('p', { class: 'muted small' }, t(l('Escolha uma ou mais. O papel (selo, banda ou os dois) sai das atividades escolhidas; as outras definem onde você gasta seu tempo. Carreiras de época (ex.: plataforma) só abrem no ano certo.', 'Pick one or more. Your role (label, band or both) follows from what you pick; the rest decide where your time goes. Era careers (e.g. platform) only open in the right year.'))),
      h('div', { class: 'mut-grid' }, NG_CAREERS.map((id) => { const d = careerDef(id); if (!d) return null; const off = d.from > cfg.startYear; return h('label', { class: `check ${off ? 'disabled' : ''}`, title: t(d.desc) },
        h('input', { type: 'checkbox', checked: c.main.includes(id), disabled: off, onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; c.main = on ? [...c.main, id] : c.main.filter((x) => x !== id); if (!c.main.length) c.main = ['label']; cfg.role = roleFromMain(c.main); onRole?.(); draw(); } }),
        h('span', null, t(d.name), h('small', { class: 'muted' }, ` — ${t(d.desc)}`))); })), ngBalls17(c.main)),
    !ident ? null : h('section', { class: 'card' }, h('h3', null, ...hl(l('Origem profissional', 'Professional origin'), 'origin')),
      h('p', { class: 'muted small' }, t(l('O que você fazia antes de ter um negócio na música. Vale dinheiro, habilidades, reputação e contatos de saída.', 'What you did before running a music business. Brings money, skills, reputation and contacts from day one.'))),
      select<Origin>(c.origin as Origin, (Object.keys(ORIGINS) as Origin[]).map((k) => ({ value: k, label: t(ORIGINS[k].name) })), (k) => { c.origin = k; draw(); }, { 'aria-label': t(l('Origem profissional', 'Professional origin')) }),
      h('p', { class: 'small good' }, t(ORIGINS[c.origin as Origin]?.desc ?? l('', '')))),
    !ident ? null : h('section', { class: 'card' }, h('h3', null, ...hl(l('Ambição', 'Ambition'), 'ambition')),
      h('p', { class: 'small muted' }, '🔒 ', t(l('Escolha com calma: a ambição fica travada durante toda a partida.', 'Choose carefully: the ambition stays locked for the whole run.'))),
      select<Ambition>(c.ambition as Ambition, (Object.keys(AMBITIONS) as Ambition[]).map((k) => ({ value: k, label: t(AMBITIONS[k].name) })), (k) => { c.ambition = k; draw(); }, { 'aria-label': t(l('Ambição', 'Ambition')) }),
      h('p', { class: 'small' }, h('b', null, t(l('Meta anual: ', 'Yearly goal: '))), t(AMBITIONS[c.ambition as Ambition]?.desc ?? l('', ''))),
      h('p', { class: 'small good' }, h('b', null, t(l('Cumprida: ', 'Met: '))), `${t(l('−6 de estresse e no ano seguinte', '−6 stress and next year'))} ${fxText(AMBITION_PERK[c.ambition as Ambition])}`),
      h('p', { class: 'small bad' }, h('b', null, t(l('Frustrada: ', 'Missed: '))), t(l('+6 de estresse.', '+6 stress.')))),
  ].filter((x): x is HTMLElement => !!x));
  draw();
  return box;
}
export function careerSummary(cfg: RunConfig): string {
  const c = cfg.careers;
  if (!c) return '—';
  return `${c.main.map((id) => t(careerDef(id)?.name ?? l(id, id))).join(' + ')} · ${t(ORIGINS[c.origin as Origin]?.name ?? l('—', '—'))} · ${t(AMBITIONS[c.ambition as Ambition]?.name ?? l('—', '—'))}`;
}
