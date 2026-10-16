// R29 (CONNECT): o que já era registrado em outro sistema e não aparecia na ficha da entidade de quem fala. Só leitura,
// sem mexer em telas existentes (aba nova "Conexões" na pessoa e no ato; fatos e memória de rival no dossiê do selo):
//  - correio (inbox27) que cita a pessoa/o ato;
//  - promessas feitas à pessoa (abertas, cumpridas, quebradas) — antes só as abertas, no card do elenco;
//  - relíquias da pessoa e prêmios dos atos da carreira (a página do ato já tinha; a da pessoa não);
//  - submundo: organização ligada ao ato, rixas e ocorrências do registro do crime;
//  - selo: fatos do barramento (facts17) com o selo como ator e a memória da rivalidade (rivals27).
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { crime17, orgById } from '../../sim/sys/crime17';
import { tieOf } from '../../sim/sys/crimenpc17';
import { actAff29 } from '../../sim/sys/aff29'; // r29: facções × cenas
import { LINK29, linksOfKey29 } from '../../sim/sys/orglinks29'; // r29 Submundo: fonte única pessoa ↔ organização
import { ASK29N, DEC29N, OUT29N, actLog29n, labelLog29n, pressure29n } from '../../sim/sys/aff29npc'; // r29c: facções × artistas do mundo
import { ent27 } from '../ps/ent27';
import { careerActs29, personFeats29 } from '../../sim/sys/connect29';
import { items18 } from '../../sim/sys/inbox18';
import { P } from '../../sim/sys/people/state';
import { relics } from '../../sim/sys/relics9';
import { rivalMemory27 } from '../../sim/sys/rivals27';
import type { Act, GameState, Person } from '../../sim/types';
import { actLink, pill, section } from '../common';
import { registerPageTab } from '../registry';
import { h } from '../dom';
import { awardTxt29 } from '../ps/raw29';
import { PERSON_TABS } from '../pages';
import { factsList17 } from './found17';
import { ents27 } from './mail27model';
import { see } from '../../sim/know';

const STATUS = { open: l('em aberto', 'open'), kept: l('cumprida', 'kept'), broken: l('quebrada', 'broken') } as const;
const KIND = { single: l('single', 'single'), tour: l('turnê', 'tour'), raise: l('aumento', 'raise'), solo: l('projeto solo', 'solo project'), album: l('álbum', 'album') } as const;

/** Mensagens do correio que citam a entidade (mesmo reconhecimento de entidades da caixa de entrada). */
function mailOf(s: GameState, ent: string): HTMLElement | null {
  const xs = [...items18(s), ...items18(s, { archived: true })].filter((it) => ents27(s, it).some((e) => e.id === ent)).sort((a, b) => b.week - a.week).slice(0, 12);
  if (!xs.length) return null;
  return section(t(l('No seu correio', 'In your mail')), h('ul', { class: 'small' }, ...xs.map((it) => h('li', null, h('span', { class: 'muted' }, `${it.year} · `), h('b', null, t(it.subject)), ' — ', t(it.body).slice(0, 140)))));
}

function promisesOf(s: GameState, p: Person): HTMLElement | null {
  const xs = (P(s).promises ?? []).filter((x) => x.personId === p.id).slice(-12).reverse();
  if (!xs.length) return null;
  return section(t(l('Promessas', 'Promises')), h('ul', { class: 'small' }, ...xs.map((x) => h('li', null,
    pill(t(STATUS[x.status]), x.status === 'kept' ? 'good' : x.status === 'broken' ? 'bad' : ''), ' ', t(KIND[x.kind] ?? l(x.kind, x.kind)), ' · ',
    s.acts[x.actId] ? actLink(s, x.actId) : '', h('small', { class: 'muted' }, ` ${t(l('prazo: semana', 'due: week'))} ${x.dueWeek}`)))));
}

function relicsAwards(s: GameState, ids: string[], pid?: string): HTMLElement | null {
  const set = new Set(ids);
  const rs = relics(s).list.filter((r) => (pid && r.p === pid) || (r.a && set.has(r.a))).slice(0, 12);
  const aw = (s.awards ?? []).filter((a) => a.actId && set.has(a.actId)).slice(-12).reverse();
  if (!rs.length && !aw.length) return null;
  return section(t(l('Relíquias e prêmios', 'Relics and awards')),
    rs.length ? h('ul', { class: 'small' }, ...rs.map((r) => h('li', null, h('b', null, t(r.n)), ` · ${r.y}`, r.a && s.acts[r.a] ? [' · ', actLink(s, r.a)] : null))) : null,
    aw.length ? h('ul', { class: 'small' }, ...aw.map((a) => h('li', null, `${a.year} · ${awardTxt29(a)}`, // r29: sem o id da categoria
       a.actId && s.acts[a.actId] ? [' · ', actLink(s, a.actId)] : null))) : null);
}

/** r29: facções que rondam a CENA do ato (gênero + país) — afinidade cultural, nunca afirmação sobre as pessoas. */
function sceneAff(s: GameState, a: Act): HTMLElement | null {
  const xs = actAff29(s, a);
  if (!xs.length) return null;
  return section(t(l('A cena e o submundo', 'The scene and the underworld')), h('ul', { class: 'small' }, ...xs.map((x) => h('li', null,
    h('b', { class: 'ent27', tabindex: '0', ...ent27('org', x.o) }, t(x.org.name)), ' — ', t(x.scene),
    h('div', { class: 'muted' }, t(x.note))))),
    h('p', { class: 'small muted' }, t(l('É uma afinidade da cena (gênero e país). O que o artista fez com ela aparece em "Facções e o artista".', 'This is a scene affinity (genre and country). What the act did about it shows under "Factions and the act".'))));
}

/** r29c (aff29npc): as abordagens das facções a este artista do mundo — o pedido, a decisão e o que veio depois. As
 *  ações (denunciar / tirar do esquema) ficam no menu de ações do ato (um caminho só). */
function factionsOf(s: GameState, a: Act): HTMLElement | null {
  const xs = actLog29n(s, a.id).slice(0, 8);
  if (!xs.length) return null;
  return section(t(l('Facções e o artista', 'Factions and the act')), h('ul', { class: 'small' }, ...xs.map((e) => h('li', null,
    h('span', { class: 'muted' }, `${e.y} · `), h('b', { class: 'ent27', tabindex: '0', ...ent27('org', e.o) }, t(orgById(s, e.o)?.name ?? l(e.o, e.o))), ' ',
    pill(t(ASK29N[e.k])), ' ', pill(t(DEC29N[e.d]), e.d === 'refuse' ? 'good' : 'warn'), ' ',
    ...e.out.filter((k) => k !== 'cash' && k !== 'movement').map((k) => pill(t(OUT29N[k]), k === 'drop' || k === 'raid' || k === 'scandal' ? 'bad' : '')),
    e.lb && s.labels[e.lb] ? h('small', { class: 'muted' }, ` · ${s.labels[e.lb].name}`) : null,
    h('div', { class: 'muted' }, t(e.t))))),
    pressure29n(s, a.id) ? h('p', { class: 'small warn' }, t(pressure29n(s, a.id)!.k === 'res'
      ? l('Você tirou este artista do esquema: ele(a) deve um favor e ouve melhor as suas propostas.', 'You got this act out of the scheme: they owe you a favor and listen better to your offers.')
      : l('Sob pressão da facção: topa mais mudar de selo (proposta e buyout).', 'Under pressure from the faction: more willing to switch labels (offer and buyout).'))) : null);
}

function underworld(s: GameState, acts: Act[], keys: string[], linkKey?: string, subj?: string): HTMLElement | null {
  // r31 F #22: o submundo de alguém só aparece pelo que é público (prisão, crime, processo); o do que é seu, inteiro
  const vis = subj ? see(s, subj, 'crime') : 'exact';
  if (vis === 'hidden') return null;
  const full = vis === 'exact';
  const st = crime17(s), ks = new Set(keys);
  // r29 (Submundo): ligações com organizações pela fonte única (orglinks29) — a mesma do card da organização
  const links = linkKey ? linksOfKey29(s, linkKey) : [];
  const ties = links.length ? [] : acts.map((a) => ({ a, o: tieOf(s, a.id) })).filter((x) => x.o);
  const feuds = full ? Object.entries(st.feud ?? {}).filter(([k]) => k.split('|').some((x) => ks.has(x))) : [];
  const log = full ? (st.log ?? []).filter((x) => ks.has(x.actor) || ks.has(x.target)).slice(-8).reverse() : [];
  if (!links.length && !ties.length && !feuds.length && !log.length) return null;
  return section(t(l('Submundo', 'Underworld')),
    links.length ? h('ul', { class: 'small' }, ...links.map((x) => { const o = orgById(s, x.o); return h('li', null,
      h('b', { class: 'ent27', tabindex: '0', ...ent27('org', x.o) }, o ? t(o.name) : x.o), ' ', pill(t(LINK29[x.kind]), x.kind === 'enemy' ? 'bad' : x.kind === 'owes' ? 'warn' : ''),
      x.y ? ` ${x.y}` : '', x.via && s.acts[x.via] ? [` · ${t(l('via', 'via'))} `, actLink(s, x.via)] : null,
      full ? h('div', { class: 'muted' }, t(x.text)) : h('div', { class: 'muted' }, t(l('(o que saiu na imprensa)', '(what the press reported)')))); })) : null,
    ties.length ? h('p', { class: 'small' }, ...ties.flatMap((x) => [actLink(s, x.a.id), ` ${t(l('ligado(a) a', 'tied to'))} `, h('b', null, t(x.o!.name)), ' ']) ) : null,
    feuds.length ? h('p', { class: 'small' }, t(l('Rixas: ', 'Feuds: ')), feuds.map(([k, v]) => `${k.split('|').map((x) => orgById(s, x) ? t(orgById(s, x)!.name) : s.acts[x]?.name ?? x).join(' × ')} (${Math.round(v)})`).join(', ')) : null,
    log.length ? h('ul', { class: 'small' }, ...log.map((x) => h('li', { class: x.ok ? '' : 'muted' }, `${x.y} · `, t(x.text)))) : null);
}

/** R29 (feat de pessoa): as participações da pessoa — as dela (pessoa a pessoa) e as do ato inteiro de uma banda dela. */
function featsOf29(s: GameState, p: Person): HTMLElement | null {
  const xs = personFeats29(s, p.id, 16);
  if (!xs.length) return null;
  return section(t(l('Participações (feat.)', 'Features (feat.)')), h('ul', { class: 'small' }, ...xs.map((x) => h('li', null,
    h('span', { class: 'muted' }, `${x.year} · `), h('b', null, `"${x.title}"`), ` ${t(l('de', 'by'))} `, actLink(s, x.hostActId),
    x.via === 'act' && x.actId ? h('small', { class: 'muted' }, ` · ${t(l('com', 'with'))} ${s.acts[x.actId]?.name ?? '?'} ${t(l('(a banda inteira)', '(the whole band)'))}`) : h('small', { class: 'muted' }, ` · ${t(l('só a pessoa', 'just the person'))}`)))));
}

PERSON_TABS.push((s, p: Person) => {
  if (p.isPlayer) return null;
  const acts = careerActs29(s, p.id).map((x) => x.act);
  const parts = () => [featsOf29(s, p), mailOf(s, `p:${p.id}`), promisesOf(s, p), relicsAwards(s, acts.map((a) => a.id), p.id), underworld(s, acts.filter((a) => a.members.includes(p.id)), [p.id, `p:${p.id}`, ...acts.filter((a) => a.members.includes(p.id)).map((a) => a.id)], `p:${p.id}`, p.id)].filter((x): x is HTMLElement => !!x);
  return { id: 'connect29', label: l('Conexões', 'Connections'), icon: 'handshake', render: () => { const xs = parts(); return xs.length ? h('div', null, ...xs) : h('p', { class: 'muted small' }, t(l('Nada registrado em outros sistemas ainda.', 'Nothing recorded in other systems yet.'))); } };
});

registerPageTab('act', { id: 'connect29', label: l('Conexões', 'Connections'), icon: 'handshake', order: 86, render: (s, id) => {
  const a = s.acts[id];
  if (!a) return h('div');
  const xs = [mailOf(s, id), underworld(s, [a], [id, ...a.members, ...a.members.map((x) => `p:${x}`)], id, id), factionsOf(s, a), sceneAff(s, a)].filter((x): x is HTMLElement => !!x);
  return xs.length ? h('div', null, ...xs) : h('p', { class: 'muted small' }, t(l('Nada registrado em outros sistemas ainda.', 'Nothing recorded in other systems yet.')));
} });

registerPageTab('label', { id: 'facts29', label: l('Fatos e rivalidade', 'Facts and rivalry'), icon: 'newspaper', order: 85, render: (s, id) => {
  const m = rivalMemory27(s, id);
  return h('div', null,
    m && (m.mem.length || m.g || m.copies.length) ? section(t(l('Memória da rivalidade', 'Rivalry memory')),
      h('p', { class: 'small' }, `${t(l('Mágoa', 'Grudge'))}: ${m.g}`),
      m.mem.length ? h('ul', { class: 'small' }, ...m.mem.slice(0, 10).map((x) => h('li', null, `${x.y} · `, t(x.t)))) : null,
      m.copies.length ? h('p', { class: 'small muted' }, t(l('Cópias em andamento: {n}', 'Copies in progress: {n}'), { n: m.copies.length })) : null) : null,
    labelFactions(s, id),
    factsList17(s, id, false));
} });

/** r29c (aff29npc): facções que procuraram artistas do elenco deste selo, o que eles decidiram e se o selo dispensou. */
function labelFactions(s: GameState, lbId: string): HTMLElement | null {
  const xs = labelLog29n(s, lbId).slice(0, 10);
  if (!xs.length) return null;
  return section(t(l('Elenco e facções', 'Roster and factions')), h('ul', { class: 'small' }, ...xs.map((e) => h('li', null,
    h('span', { class: 'muted' }, `${e.y} · `), s.acts[e.a] ? actLink(s, e.a) : '?', ' · ', h('b', { class: 'ent27', tabindex: '0', ...ent27('org', e.o) }, t(orgById(s, e.o)?.name ?? l(e.o, e.o))), ' ',
    pill(t(DEC29N[e.d]), e.d === 'refuse' ? 'good' : 'warn'), e.out.includes('drop') ? pill(t(OUT29N.drop), 'bad') : null))));
}

