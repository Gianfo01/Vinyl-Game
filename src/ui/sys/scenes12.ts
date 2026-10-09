// Interface das cenas locais como redes (rodada 12): cada cidade mostra a casa, o produtor, a mídia e o
// público, o cabo de guerra autenticidade x comercialização, o selo concorrente local e — onde há filial —
// a escolha de parceiro. Cada número vem com o porquê.

import { cityById, genreById, l } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  AUD_DESC, AUD_NAME, NODES, NODE_ROLE, choosePartner, cultivate, cultivateCost, harvest, harvestGain, hasBranch, netCities, netOf, nodeKind, scene12, type Harvest, type Net, type Node,
} from '../../sim/sys/scenes12';
import { HIST_SCENES, STAGE_NAME, sceneStage } from '../../sim/sys/world4/scenes';
import type { GameState } from '../../sim/types';
import { $, labelLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerTab } from '../registry';
import { meter } from '../vis';

const say = (e: ReturnType<typeof cultivate>, ok = l('Feito.', 'Done.')) => { toast(t(e ?? ok), e ? 'bad' : 'good'); rerender(); };
const btn = (label: string, fn: () => void, cls = 'btn small', dis = false, title = '') => h('button', { class: cls, disabled: dis, title, onclick: fn }, label);

function why(s: GameState, n: Net): string[] {
  const out: string[] = [];
  if (n.health < 40) out.push(t(l('Cena pequena: cada investimento agora rende o dobro de crescimento.', 'Small scene: every investment now yields double growth.')));
  if (n.exploit >= 40) out.push(t(l('A cena sente que está sendo usada (exploração {e}/100). Acima de 60 ela rejeita o selo.', 'The scene feels used (exploitation {e}/100). Above 60 it rejects the label.'), { e: Math.round(n.exploit) }));
  if (n.auth <= 35) out.push(t(l('Autenticidade baixa: o selo concorrente local ganha força todo mês. Abaixo de 20 a cena rejeita o selo.', 'Low authenticity: the local rival label gains strength every month. Below 20 the scene rejects the label.')));
  if (n.auth >= 60) out.push(t(l('Presença autêntica: o concorrente local perde força e seus discos ganham respeito.', 'Authentic presence: the local rival weakens and your records earn respect.')));
  if (s.week < n.push) out.push(t(l('Som da cena no mainstream: +15% de apelo para seus atos de {g} da cidade até a semana {w}.', 'Scene sound in the mainstream: +15% appeal for your {g} acts from the city until week {w}.'), { g: t(genreById[n.genre]?.name ?? l(n.genre)), w: n.push }));
  if (s.week - n.rejectW < 52) out.push(t(l('A cena rejeitou o selo há menos de um ano.', 'The scene rejected the label less than a year ago.')));
  return out;
}

function netCard(s: GameState, n: Net): HTMLElement {
  const city = cityById[n.city];
  const hs = HIST_SCENES.find((x) => x.city === n.city && !['future', 'over'].includes(sceneStage(s, x)));
  const branch = hasBranch(s, n.city);
  const hv = n.health >= 20 && s.week - n.harvestW >= 8;
  return h('article', { class: 'card scene12' },
    h('div', { class: 'row between' },
      h('h4', null, t(city.name), ' · ', t(genreById[n.genre]?.name ?? l(n.genre))),
      h('span', null, n.city === s.config.homeCity ? pill(t(l('matriz', 'HQ')), 'good') : null, ' ', branch ? pill(t(l('filial', 'branch')), 'good') : null, ' ', hs ? pill(`${t(hs.name)}: ${t(STAGE_NAME[sceneStage(s, hs)])}`, 'warn') : null)),
    h('p', { class: 'small' }, t(l('Público', 'Audience')), ': ', h('b', null, t(AUD_NAME[n.aud])), ' — ', h('span', { class: 'muted' }, t(AUD_DESC[n.aud]))),
    meter('heart', l('Saúde da cena', 'Scene health'), n.health),
    meter('flag', l('Autenticidade do selo', 'Label authenticity'), n.auth),
    meter('clock', l('Exploração', 'Exploitation'), n.exploit, 100, true),
    h('table', { class: 'tbl compact' }, h('tbody', null, NODES.map((node: Node) => h('tr', null,
      h('td', null, h('b', null, t(nodeKind(s, node))), ' ', n.names[node], n.partner === node ? [' ', pill(t(l('parceiro da filial', 'branch partner')), 'good')] : null,
        h('div', { class: 'small muted' }, t(NODE_ROLE[node]))),
      h('td', null, `${t(l('laço', 'tie'))} ${Math.round(n.ties[node])}`),
      h('td', null,
        btn(`${t(l('Investir', 'Invest'))} (${$(cultivateCost(s))})`, () => say(cultivate(s, n.city, node)), 'btn small', s.week - (n.cult[node] ?? -99) < 4),
        branch && n.partner !== node ? btn(t(l('Escolher como parceiro', 'Pick as partner')), () => say(choosePartner(s, n.city, node), l('Parceria firmada.', 'Partnership formed.')), 'btn small ghost') : null)))),
    ),
    h('div', { class: 'row wrap small' },
      btn(`${t(l('Vender patrocínio', 'Sell sponsorship'))} (+${$(harvestGain(s, n))})`, () => say(harvest(s, n.city, 'sponsor' as Harvest)), 'btn small', !hv, t(l('Dinheiro agora; exploração +22, autenticidade cai.', 'Cash now; exploitation +22, authenticity drops.'))),
      btn(t(l('Levar o som ao mainstream', 'Take the sound mainstream')), () => say(harvest(s, n.city, 'mainstream')), 'btn small', !hv, t(l('+15% de apelo por 6 meses aos seus atos do gênero; exploração +28.', '+15% appeal for 6 months to your acts of the genre; exploitation +28.')))),
    n.rival && s.labels[n.rival] ? h('p', { class: 'small' }, t(l('Concorrente local', 'Local rival')), ': ', labelLink(s, n.rival), ` — ${t(l('força', 'strength'))} ${Math.round(n.rivalStr)}/100`) : null,
    branch && !n.partner ? h('p', { class: 'small warn' }, t(l('Sua filial ainda não escolheu com quem construir presença: sem parceiro, ela é só um escritório.', 'Your branch has not chosen whom to build presence with: without a partner it is just an office.'))) : null,
    h('ul', { class: 'small' }, why(s, n).map((x) => h('li', null, x))),
  );
}

function scenesTab(s: GameState): HTMLElement {
  for (const c of netCities(s)) netOf(s, c);
  const nets = Object.values(scene12(s).nets).filter((n) => cityById[n.city]).sort((a, b) => Number(hasBranch(s, b.city)) - Number(hasBranch(s, a.city)) || b.health - a.health);
  return h('div', { class: 'panel scene12-panel' },
    section(t(l('Cenas locais', 'Local scenes')),
      h('p', { class: 'muted small' }, t(l('Cada cena é uma rede: uma casa onde artistas surgem, um produtor influente, um veículo de mídia e um público com gosto próprio. Investir cedo faz a cena crescer; explorar demais faz ela rejeitar o selo e fortalece um selo local concorrente. Uma filial escolhe UM parceiro: ele cresce sozinho e vale 50% a mais — os outros esfriam mais rápido.', 'Each scene is a network: a venue where artists emerge, an influential producer, a media outlet and an audience with its own taste. Investing early grows the scene; over-exploiting makes it reject the label and strengthens a local rival label. A branch picks ONE partner: it grows on its own and counts 50% more — the others cool faster.'))),
      nets.map((n) => netCard(s, n))),
  );
}

registerTab('worldHub', { id: 'scene12', label: l('Cenas locais', 'Local scenes'), icon: 'flag', order: 56, render: scenesTab,
  badge: (s) => (s.branches ?? []).filter((b) => !scene12(s).nets[b.city]?.partner).length || undefined });
