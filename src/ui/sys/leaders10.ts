// Interface da rodada 10: perfil dos líderes das gravadoras (ficha do selo, Mundo → Gravadoras) e a
// tabela de estratégias e líderes de todos os selos ativos.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { BG_TXT, STYLE_TXT, ageOf, describeLeader, jobEndText, leaderOf, leaders, type Leader } from '../../sim/sys/leaders10';
import { PLAYBOOKS, playbookOf } from '../../sim/sys/rivals8';
import { describeSoul } from '../../sim/sys/soul9';
import { playerPerson } from '../../sim/sys/life';
import { ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import { actLink, cityName, labelLink, modal, pill } from '../common';
import { bar, h } from '../dom';
import { portraitCanvas } from '../pixel/avatar';
import { registerPageTab } from '../registry';
import { store } from '../store';
import { ficha13 } from './persona13';
import { personRoute16 } from '../route16';

const relWord = (v: number): L => v >= 40 ? l('aliado', 'ally') : v >= 12 ? l('cordial', 'friendly') : v > -12 ? l('neutro', 'neutral') : v > -40 ? l('frio', 'cold') : l('inimigo', 'enemy');
const relCls = (v: number) => (v >= 12 ? 'good' : v <= -12 ? 'bad' : '');

function face(s: GameState, L0: Leader, px = 3): HTMLElement {
  try {
    const c = portraitCanvas({ id: L0.id, born: L0.born }, s, px);
    c.classList.add('portrait');
    if (L0.st === 'dead') c.classList.add('deceased');
    return c;
  } catch {
    return h('span', { class: 'portrait' }, L0.name.split(' ').map((x) => x[0]).slice(0, 2).join(''));
  }
}

/** Link para o perfil do líder. */
export function leaderLink(s: GameState, L0: Leader | undefined): HTMLElement {
  if (!L0) return h('span', { class: 'muted' }, '—');
  return h('button', { class: 'link', onclick: (e: Event) => { e.stopPropagation(); openLeader(L0.id); } }, L0.name);
}

export function openLeader(id: string): void {
  if (personRoute16.f?.(`l:${id}`, 'r_ceo')) return;
  const s = store.game;
  if (!s) return;
  const L0 = leaders(s).L[id];
  if (!L0) return;
  modal(L0.name, leaderBody(s, L0));
}

/** Corpo do perfil do líder (rodada 16: também é a aba "CEO" da página única de pessoa). */
export function leaderBody(s: GameState, L0: Leader, full = true): HTMLElement {
  const lb = L0.label ? s.labels[L0.label] : undefined;
  const pb = PLAYBOOKS[L0.pref];
  const status = L0.st === 'dead' ? fmt(l('morreu em {y}', 'died in {y}'), { y: L0.died ?? '?' }) : L0.st === 'retired' ? t(l('aposentadoria', 'retired')) : L0.st === 'free' ? t(l('sem cargo', 'between jobs')) : '';
  const ties = Object.entries(L0.rel).filter(([k]) => k !== 'player' && leaders(s).L[k]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
  const protegés = lb ? lb.roster.map((x) => s.acts[x]).filter(Boolean).sort((a, b) => b.fame - a.fame).slice(0, 3) : [];
  const grudge = lb ? lb.roster.map((x) => s.acts[x]).filter((a) => a && a.trust < 35).sort((a, b) => a.trust - b.trust)[0] : undefined;
  const relP = L0.rel.player ?? 0;
  const body = h('div', { class: 'ficha leader10' },
    h('div', { class: 'row' }, full ? face(s, L0, 4) : null, h('div', null,
      full ? null : L0.real ? pill(t(l('pessoa real', 'real person')), 'gold') : null, h('h3', full ? null : { hidden: true }, L0.name, L0.real ? h('small', { class: 'muted' }, ` · ${t(l('pessoa real', 'real person'))}`) : null),
      h('p', null, `${ageOf(s, L0)} ${t(l('anos', 'years old'))} · ${t(l('de', 'from'))} ${cityName(L0.city)} · ${t(BG_TXT[L0.bg])}`, status ? ` · ${status}` : ''),
      lb ? h('p', null, t(L0.founder ? l('Fundador e líder de ', 'Founder and head of ') : l('Líder de ', 'Head of ')), labelLink(s, lb.id), ` ${t(l('desde', 'since'))} ${L0.since}`) : null,
      L0.note ? h('p', { class: 'small muted' }, t(L0.note)) : null)),
    h('h4', null, t(l('Liderança', 'Leadership'))),
    h('p', null, pill(t(STYLE_TXT[L0.style][0]), 'gold'), ' ', h('span', { class: 'small muted' }, t(STYLE_TXT[L0.style][1]))),
    h('p', { class: 'small' }, h('b', null, t(l('Estratégia preferida: ', 'Preferred strategy: '))), t(pb.name), h('span', { class: 'muted' }, ` — ${t(pb.desc)}`)),
    lb && playbookOf(lb) !== L0.pref ? h('p', { class: 'small muted' }, t(l('O selo ainda segue outra estratégia; o líder pode mudá-la.', 'The label still follows another strategy; the leader may change it.'))) : null,
    h('div', { class: 'kv' }, h('span', { class: 'k' }, t(l('Ambição', 'Ambition'))), h('span', { class: 'v' }, bar(L0.amb), ` ${L0.amb}`)),
    h('div', { class: 'kv' }, h('span', { class: 'k' }, t(l('Apetite a risco', 'Risk tolerance'))), h('span', { class: 'v' }, bar(L0.risk), ` ${L0.risk}`)),
    h('h4', null, t(l('Personalidade', 'Personality'))),
    h('ul', { class: 'small' }, describeLeader(s, L0).map((x) => h('li', null, t(x)))),
    h('h4', null, t(l('Relações', 'Relationships'))),
    h('p', { class: 'small' }, h('b', null, t(l('Com você: ', 'With you: '))), pill(t(relWord(relP)), relCls(relP)), ` (${relP > 0 ? '+' : ''}${relP})`),
    ties.length ? h('ul', { class: 'small' }, ties.map(([k, v]) => { const o = leaders(s).L[k]; const olb = o.label ? s.labels[o.label] : undefined; return h('li', null, leaderLink(s, o), olb ? ` (${olb.name})` : '', ' — ', pill(t(relWord(v)), relCls(v))); })) : null,
    protegés.length ? h('p', { class: 'small' }, h('b', null, t(l('Apostas pessoais: ', 'Personal bets: '))), ...protegés.map((a, i) => h('span', null, i ? ', ' : '', actLink(s, a.id)))) : null,
    grudge ? h('p', { class: 'small' }, h('b', null, t(l('Em atrito com: ', 'At odds with: '))), actLink(s, grudge.id)) : null,
    h('h4', null, t(l('Carreira', 'Career'))),
    L0.jobs.length ? h('ul', { class: 'small' }, [...L0.jobs].reverse().map((j) => h('li', null,
      s.labels[j.lb] ? labelLink(s, j.lb) : h('span', null, j.n), ` ${j.from}–${j.to ?? t(l('hoje', 'now'))}`, j.end ? h('span', { class: 'muted' }, ` · ${t(jobEndText(j.end))}`) : null)))
      : h('p', { class: 'muted small' }, '—'),
    full ? h('h4', null, t(l('Ficha completa', 'Full profile'))) : null, full ? ficha13(s, `l:${L0.id}`) : null,
  );
  return body;
}

function fmt(x: L, p: Record<string, string | number>): string { return t(x, p as never); }

/** Perfil do próprio jogador como líder do selo. */
export function openPlayerLeader(): void {
  if (personRoute16.f?.('player', 'r_owner')) return;
  const s = store.game;
  if (!s) return;
  modal(ownerOf(s).name, playerLeaderBody(s));
}

/** Você como líder do selo (rodada 16: aba "Dono do selo" na sua página). */
export function playerLeaderBody(s: GameState, full = true): HTMLElement {
  const o = ownerOf(s);
  const p = playerPerson(s);
  const body = h('div', { class: 'ficha leader10' },
    h('h3', null, o.name),
    h('p', null, `${s.year - o.born} ${t(l('anos', 'years old'))} · ${t(l('Líder de ', 'Head of '))}${s.config.companyName} ${t(l('desde', 'since'))} ${s.config.startYear}`),
    h('div', { class: 'kv' }, h('span', { class: 'k' }, t(l('Ouvido', 'Ear'))), h('span', { class: 'v' }, bar(o.attrs.ear), ` ${o.attrs.ear}`)),
    h('div', { class: 'kv' }, h('span', { class: 'k' }, t(l('Negociação', 'Negotiation'))), h('span', { class: 'v' }, bar(o.attrs.negotiation), ` ${o.attrs.negotiation}`)),
    h('div', { class: 'kv' }, h('span', { class: 'k' }, t(l('Carisma', 'Charisma'))), h('span', { class: 'v' }, bar(o.attrs.charisma), ` ${o.attrs.charisma}`)),
    h('div', { class: 'kv' }, h('span', { class: 'k' }, t(l('Gestão', 'Management'))), h('span', { class: 'v' }, bar(o.attrs.management), ` ${o.attrs.management}`)),
    p ? h('h4', null, t(l('Personalidade', 'Personality'))) : null,
    p ? h('ul', { class: 'small' }, describeSoul(s, p).map((x) => h('li', null, t(x)))) : null,
    h('h4', null, t(l('Como os outros líderes o veem', 'How other leaders see you'))),
    h('ul', { class: 'small' }, Object.values(leaders(s).L).filter((x) => x.st === 'active' && x.label && s.labels[x.label])
      .sort((a, b) => (a.rel.player ?? 0) - (b.rel.player ?? 0)).slice(0, 8)
      .map((x) => h('li', null, leaderLink(s, x), ` (${s.labels[x.label!].name}) — `, pill(t(relWord(x.rel.player ?? 0)), relCls(x.rel.player ?? 0))))),
    full ? h('h4', null, t(l('Ficha completa', 'Full profile'))) : null, full ? ficha13(s, 'player') : null,
  );
  return body;
}

// ---------------------------------------------------------------- ficha do selo

registerPageTab('label', {
  id: 'leader10', label: l('Líder', 'Leader'), icon: 'building', order: 8,
  render: (s, id) => {
    const L0 = leaderOf(s, id);
    if (!L0) return h('div');
    return h('div', { class: 'leader10-card row' }, face(s, L0, 2), h('div', null,
      h('h4', null, t(l('Líder', 'Leader')), ': ', leaderLink(s, L0)),
      h('p', { class: 'small' }, `${ageOf(s, L0)} ${t(l('anos', 'yrs'))} · ${t(STYLE_TXT[L0.style][0])} · ${t(l('prefere', 'prefers'))} "${t(PLAYBOOKS[L0.pref].name)}" · ${t(l('no cargo desde', 'in charge since'))} ${L0.since}`)));
  },
});

// ---------------------------------------------------------------- Mundo → Gravadoras

/** Tabela: cada selo ativo, sua estratégia (explicada) e o líder. */
export function leadersTab(s: GameState): HTMLElement {
  const list = Object.values(s.labels).filter((lb) => lb.active).sort((a, b) => b.revenueLastYear - a.revenueLastYear || a.name.localeCompare(b.name));
  const o = ownerOf(s);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Cada selo segue um manual reconhecível. Passe o mouse na estratégia para ver como reconhecê-la; clique no líder para ver o perfil.', 'Each label follows a recognizable playbook. Hover the strategy to see how to spot it; click the leader for their profile.'))),
    h('table', { class: 'table' },
      h('thead', null, h('tr', null, ...[l('Selo', 'Label'), l('Estratégia', 'Strategy'), l('Líder', 'Leader'), l('Idade', 'Age'), l('Estilo', 'Style'), l('Desde', 'Since'), l('Com você', 'With you')].map((x) => h('th', null, t(x))))),
      h('tbody', null,
        h('tr', { class: 'mine' }, h('td', null, h('b', null, s.config.companyName)), h('td', null, '—'),
          h('td', null, h('button', { class: 'link', onclick: () => openPlayerLeader() }, o.name)), h('td', null, String(s.year - o.born)), h('td', null, '—'), h('td', null, String(s.config.startYear)), h('td', null, '—')),
        ...list.map((lb) => {
          const pb = PLAYBOOKS[playbookOf(lb)];
          const L0 = leaderOf(s, lb.id);
          const rel = L0?.rel.player ?? 0;
          return h('tr', null,
            h('td', null, labelLink(s, lb.id)),
            h('td', { title: `${t(pb.desc)}\n${pb.tells.map((x) => '• ' + t(x)).join('\n')}` }, pill(t(pb.name), 'gold')),
            h('td', null, leaderLink(s, L0)),
            h('td', null, L0 ? String(ageOf(s, L0)) : '—'),
            h('td', null, L0 ? t(STYLE_TXT[L0.style][0]) : '—'),
            h('td', null, L0?.since ? String(L0.since) : '—'),
            h('td', null, L0 ? pill(t(relWord(rel)), relCls(rel)) : '—'));
        })),
    ),
    h('h4', null, t(l('Os manuais', 'The playbooks'))),
    h('ul', { class: 'small' }, [...new Set(list.map((lb) => playbookOf(lb)))].map((id) => h('li', null, h('b', null, t(PLAYBOOKS[id].name)), ' — ', t(PLAYBOOKS[id].desc), h('span', { class: 'muted' }, ` ${t(l('Sinais:', 'Tells:'))} ${PLAYBOOKS[id].tells.map((x) => t(x)).join(' ')}`)))),
  );
}
