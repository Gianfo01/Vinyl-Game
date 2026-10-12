// r23: a jornada do primeiro disco num fio só. O Projeto musical mostra UM próximo passo recomendado por
// etapa (artista → repertório → trabalho marcado → gravação → capa/verba/data → divulgação → balanço);
// Composição, Estúdio e Lançamentos ficam como atalhos opcionais. Trabalho já marcado não pede clique:
// mostra a semana e a ocupação, e "quero mais" diz o custo e o que sairia da agenda antes de confirmar.

import './journey23.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { needSongs, type MusicProject } from '../../sim/sys/project8';
import { STEPS23, agendaName23, booked23, bookedAction23, bookedText23, load23, nextStep23, type Step23 } from '../../sim/sys/journey23';
import type { Act, GameState } from '../../sim/types';
import { $, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { store } from '../store';
import { commitAgenda20, planAgenda20 } from '../actions20';
import { applyNav20, openRecord20 } from './actmenu20';
import { ic, setTab } from '../vis';
import { playComposeBtn27 } from '../act27/compose27';

/** r23: uma pergunta por tela — linha de propósito logo abaixo do título da página. */
export const PURPOSE23: Record<string, L> = {
  project: l('O quê, por quê, com que verba e até quando: o disco inteiro, com um próximo passo por vez.', 'What, why, on what budget and by when: the whole record, one next step at a time.'),
  creation: l('De onde vem o repertório: compor, encomendar a compositores ou escolher um cover.', 'Where the repertoire comes from: write, commission from songwriters or pick a cover.'),
  studio: l('Como as gravações são executadas: faixas, produtor, estúdio, dias e custo.', 'How recordings get made: tracks, producer, studio, days and cost.'),
  releases: l('Como e quando o disco chega ao público: formato, data, divulgação e rollout.', 'How and when the record reaches the public: format, date, promotion and rollout.'),
};

export const STEP_NAME23: Record<Step23, L> = {
  artist: l('Artista', 'Artist'),
  songs: l('Repertório', 'Songs'),
  busy: l('Trabalho marcado', 'Work booked'),
  record: l('Gravação', 'Recording'),
  release: l('Capa, verba e data', 'Cover, budget, date'),
  promo: l('Divulgação', 'Promotion'),
  debrief: l('Balanço', 'Debrief'),
};

const nav = (s: GameState, n: Parameters<typeof applyNav20>[1]) => () => applyNav20(s, n);

/** r23: "quero mais" — custo, ocupação e o que sairia da agenda; nada muda antes de confirmar. */
function moreBox23(s: GameState, a: Act, action: 'compose' | 'record', onDone?: () => void): HTMLElement {
  const pl = planAgenda20(s, a, [{ action, params: { week: 1 } }]);
  const again = !!bookedAction23(s, a, action);
  return h('div', { class: 'j23-more' },
    h('p', { class: 'small' },
      `${t(l('Custo', 'Cost'))} ${$(pl.cost)} · ${t(l('ocupação', 'load'))} ${pl.load}% / ${pl.cap}%`,
      pl.dropped.length ? h('span', { class: 'bad' }, ` · ${t(l('sai da agenda', 'leaves the agenda'))}: ${pl.dropped.map((d) => t(agendaName23(d.action))).join(', ')}`) : ` · ${t(l('nada sai da agenda', 'nothing leaves the agenda'))}`,
      again ? h('span', { class: 'muted' }, ` · ${t(l('uma segunda vez no mês rende menos (retorno decrescente)', 'a second time in the month yields less (diminishing returns)'))}`) : null),
    pl.block ? h('p', { class: 'bad small', role: 'alert' }, t(pl.block), ' ', t(l('Abra a agenda do artista e tire alguma ação.', 'Open the act\'s agenda and remove an action.'))) :
      h('button', { class: 'btn small', onclick: () => { commitAgenda20(s, a, pl.slots); toast(t(action === 'compose' ? l('Composição a mais na agenda.', 'Extra writing on the agenda.') : l('Gravação na agenda.', 'Recording on the agenda.')), 'good'); onDone?.(); rerender(); } },
        t(pl.dropped.length ? l('Confirmar mesmo assim', 'Confirm anyway') : l('Confirmar', 'Confirm'))));
}

/** r23: "Compor" sem clique redundante — já marcado? diz a semana; senão mostra o que sairia (se algo sair). */
export function compose23(s: GameState, actId: string): void {
  const a = s.acts[actId];
  if (!a) return;
  const b = bookedAction23(s, a, 'compose');
  const pl = planAgenda20(s, a, [{ action: 'compose', params: { week: 1 } }]);
  if (!b && !pl.block && !pl.dropped.length) { commitAgenda20(s, a, pl.slots); toast(t(s.clock?.opened ? l('"Compor" entrou na agenda (semana 1 do mês que vem).', '"Write" added to the agenda (week 1 of next month).') : l('"Compor" entrou na agenda (semana 1).', '"Write" added to the agenda (week 1).')), 'good'); rerender(); return; }
  const { load, cap } = load23(s, a);
  let close = () => {};
  const box = h('div', { class: 'j23-modal' },
    b ? h('p', null, ic('calendar'), ' ', h('b', null, t(bookedText23(b)))) : null,
    h('p', { class: 'muted small' }, t(l('Agenda do mês: {u}% de {c}% da capacidade.', 'This month\'s agenda: {u}% of {c}% capacity.')).replace('{u}', String(load)).replace('{c}', String(cap))),
    h('h4', null, t(b ? l('Quer compor mais?', 'Want to write more?') : l('Para caber, algo sai da agenda', 'To fit, something leaves the agenda'))),
    moreBox23(s, a, 'compose', () => close()),
    h('button', { class: 'btn ghost small', onclick: () => close() }, t(l('Deixar como está', 'Leave it as is'))));
  close = modal(t(l('Compor', 'Write')), box);
}

function stepsBar23(cur: Step23): HTMLElement {
  const i = STEPS23.indexOf(cur);
  return h('ol', { class: 'j23-steps', 'aria-label': t(l('Jornada do disco', 'Record journey')) },
    STEPS23.map((x, k) => h('li', { class: k < i ? 'done' : k === i ? 'on' : '', 'aria-current': k === i ? 'step' : undefined }, h('span', null, k + 1), t(STEP_NAME23[x]))));
}

/** r23: o cartão "Próximo passo" — um botão principal, atalhos opcionais e, quando há, os controles da etapa. */
export function journey23(s: GameState, actId: string | undefined, p?: MusicProject, extra?: HTMLElement | null): HTMLElement {
  const step = nextStep23(s, actId, p);
  const a = s.acts[p?.actId ?? actId ?? ''];
  const id = a?.id ?? '';
  const main = (label: L, icon: string, run: () => void) => h('button', { class: 'btn primary', onclick: run }, ic(icon), ' ', t(label));
  const link = (label: L, run: () => void) => h('button', { class: 'btn small ghost', onclick: run }, t(label));
  let title: L, why: L | string, primary: HTMLElement | null = null;
  const links: (HTMLElement | null)[] = [];
  const body: (HTMLElement | null)[] = [];
  switch (step) {
    case 'artist':
      title = l('Encontrar um artista', 'Find an artist');
      why = l('Sem artista no elenco não há disco. Descubra talentos no Mercado e faça uma oferta.', 'No act on the roster, no record. Discover talent in the Market and make an offer.');
      primary = main(l('Encontrar um artista', 'Find an artist'), 'fans', () => { store.marketTab = 'scouting'; store.area = 'market'; rerender(); });
      break;
    case 'songs': {
      const miss = p ? Math.max(1, needSongs(p.type) - p.songIds.length) : 1;
      title = l('Arranjar repertório', 'Get songs');
      why = t(l('Faltam {n} música(s) para o formato. Escolha de onde vêm: compor, encomendar ou gravar um cover.', '{n} song(s) missing for the format. Choose where they come from: write, commission or record a cover.')).replace('{n}', String(miss));
      primary = main(l('Compor', 'Write'), 'note', () => compose23(s, id));
      links.push(playComposeBtn27(s, id)); // r27 M1: composição jogável
      links.push(link(l('Encomendar a compositores', 'Commission songwriters'), nav(s, { area: 'creation', tab: ['creation-write', 'writers19'], act: id })),
        link(l('Escolher cover', 'Pick a cover'), nav(s, { area: 'studio', tab: ['creation-studio', 'versions'], act: id })));
      break;
    }
    case 'busy': {
      const b = a ? booked23(s, a, p) : null;
      const { load, cap } = a ? load23(s, a) : { load: 0, cap: 0 };
      title = b ? bookedText23(b) : l('Trabalho já marcado', 'Work already booked');
      why = t(l('Nada a clicar agora: a agenda cuida disso. Ocupação do mês: {u}% de {c}%.', 'Nothing to click now: the agenda handles it. This month\'s load: {u}% of {c}%.')).replace('{u}', String(load)).replace('{c}', String(cap));
      if (a && b && b.action !== 'session') body.push(h('details', { class: 'j23-details' }, h('summary', null, t(b.action === 'compose' ? l('Quero compor mais', 'I want to write more') : l('Quero gravar mais', 'I want to record more'))), moreBox23(s, a, b.action)));
      links.push(link(l('Ver agenda do artista', 'See the act\'s agenda'), nav(s, { sub: 'agenda', act: id })));
      break;
    }
    case 'record':
      title = l('Preparar gravação', 'Prepare a recording');
      why = l('Há música escrita esperando: compare gravar agora, ensaiar antes ou buscar produtor — com custo e o que sai da agenda.', 'Written songs are waiting: compare recording now, rehearsing first or finding a producer — with cost and what leaves the agenda.');
      primary = main(l('Preparar gravação', 'Prepare a recording'), 'mic', () => openRecord20(s, id));
      links.push(link(l('Estúdio (sessão com produtor)', 'Studio (session with a producer)'), nav(s, { area: 'studio', tab: ['creation-studio', 'session'], act: id })));
      break;
    case 'release':
      title = l('Revisar capa, verba e data', 'Review cover, budget and date');
      why = l('Tudo gravado. Confira capa, divulgação e caixa; depois programe o lançamento.', 'Everything is recorded. Check cover, promotion and cash; then schedule the release.');
      primary = main(l('Revisar capa, verba e data', 'Review cover, budget and date'), 'cd', () => { store.selectedAct = id; setTab('creation-write', 'projects'); store.area = 'creation'; rerender(); });
      links.push(link(l('Lançamentos (marketing e rollout)', 'Releases (marketing and rollout)'), nav(s, { area: 'releases', tab: ['creation-release', p?.type === 'lp' ? 'rollout' : 'launch'], act: id })));
      break;
    case 'promo':
      title = l('Acompanhar agenda e divulgação', 'Follow the agenda and promotion');
      why = l('Lançamento programado. Shows e entrevistas na semana do lançamento somam.', 'Release scheduled. Shows and interviews in release week add up.');
      primary = main(l('Abrir agenda do artista', 'Open the act\'s agenda'), 'calendar', nav(s, { sub: 'agenda', act: id }));
      links.push(link(l('Marketing e rollout', 'Marketing and rollout'), nav(s, { area: 'releases', tab: ['creation-release', p?.type === 'lp' ? 'rollout' : 'launch'], act: id })));
      break;
    default:
      title = l('Ler o balanço e escolher a próxima aposta', 'Read the debrief and pick the next bet');
      why = l('O que aconteceu, por que, e qual a próxima decisão — os números dizem a janela de medição.', 'What happened, why, and the next decision — the numbers state their measuring window.');
      primary = main(l('Ver balanço', 'See the debrief'), 'chart-up', () => document.getElementById('p23-res')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  return h('section', { class: 'j23', 'data-step23': step },
    stepsBar23(step),
    h('div', { class: 'j23-card' },
      h('small', { class: 'j23-kicker' }, t(l('Próximo passo', 'Next step'))),
      h('h3', null, t(title)),
      h('p', { class: 'muted small' }, typeof why === 'string' ? why : t(why)),
      ...body,
      primary || links.length ? h('div', { class: 'row wrap' }, primary, ...links) : null,
      extra ?? null));
}
