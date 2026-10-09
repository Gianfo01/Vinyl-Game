// Rodada 15: seção "Família" na aba de vida pessoal das pessoas (extensão de dossier13, sem duplicar a aba).
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { actOf15, feudOf15, kin15, kinOf15, REL15, type Rel15 } from '../../sim/sys/kin15';
import type { GameState, Person } from '../../sim/types';
import { pill } from '../common';
import { h } from '../dom';
import { openPersonPage } from '../pages';
import { ic } from '../vis';
import { LIFE_EXTRAS13 } from './dossier13';
import { personLife } from '../../sim/sys/dossier13';

const ROWS: { k: string; rels: Rel15[]; label: ReturnType<typeof l> }[] = [
  { k: 'up', rels: ['parent', 'uncle'], label: l('Pais e tios', 'Parents and uncles/aunts') },
  { k: 'side', rels: ['spouse', 'ex', 'sibling', 'cousin'], label: l('Casal, irmãos e primos', 'Partner, siblings and cousins') },
  { k: 'down', rels: ['child', 'nephew'], label: l('Filhos e sobrinhos', 'Children and nieces/nephews') },
];

export function familyBlock15(s: GameState, p: Person): HTMLElement | null {
  const ks = kinOf15(s, p.id), st = kin15(s);
  const mine = Object.values(s.acts).some((a) => a.owner === 'player' && a.members.some((id) => ks.some((k) => k.id === id)));
  // bloco único: parentes do grafo + parceiro(a), ex e filhos vindos da vida pessoal (famílias, romances, lazer)
  const lf = personLife(s, p);
  const named = new Set(ks.map((k) => k.p.name));
  const byName = (n: string) => Object.values(s.persons).find((x) => x.name === n);
  const loose = (n: string, rel: string, extra = '') => {
    const q = byName(n);
    return h('li', null, q ? h('button', { class: 'link', onclick: () => openPersonPage(q.id) }, n) : h('span', null, n), ` · ${rel}${extra}`);
  };
  const partner = lf.partner && !named.has(lf.partner) ? lf.partner : undefined;
  const exes = lf.exes.filter((n) => !named.has(n) && n !== lf.partner).slice(0, 4);
  const kids = lf.kids.filter((k) => !named.has(k.name));
  const status = lf.together ? l('Em relacionamento', 'In a relationship') : lf.separated ? l('Separado(a)', 'Separated') : l('Solteiro(a)', 'Single');
  const total = ks.length + (partner ? 1 : 0) + exes.length + kids.length;
  const node = (k: { id: string; rel: Rel15; p: Person }) => {
    const a = actOf15(s, k.id), feud = feudOf15(s, p.id, k.id) !== undefined;
    return h('li', null, h('button', { class: 'link', onclick: () => openPersonPage(k.id) }, k.p.name), ` · ${t(REL15[k.rel])} · `,
      k.p.alive ? `${s.year - k.p.born} ${t(l('anos', 'yrs'))}` : `† ${k.p.died ?? '?'}`,
      a ? h('small', { class: 'muted' }, ` · ${a.name}`) : null,
      feud ? [' ', pill(t(l('em rixa', 'feuding')), 'bad')] : null,
      a?.owner === 'player' ? [' ', pill(t(l('no seu elenco', 'on your roster')), 'good')] : null,
      st.tips[a?.id ?? ''] === p.id ? [' ', pill(t(l('indicado por ele(a)', 'recommended by them')), 'good')] : null);
  };
  const log = st.log.filter((e) => ks.some((k) => t(e[2]).includes(k.p.name)) || t(e[2]).includes(p.name)).slice(0, 4);
  return h('details', { class: 'dos13-fam15', open: true },
    h('summary', { class: 'small' }, ic('fans'), ` ${t(l('Família', 'Family'))} (${total}) · ${t(status)}`),
    partner || exes.length || kids.length ? h('ul', { class: 'dos13-list small' },
      partner ? loose(partner, t(l('parceiro(a) atual', 'current partner'))) : null,
      ...exes.map((n) => loose(n, t(l('ex', 'ex')))),
      ...kids.map((k) => loose(k.name, t(l('filho(a)', 'child')), ` · ${s.year - k.born} ${t(l('anos', 'yrs'))}`))) : null,
    !total ? h('p', { class: 'small muted' }, t(l('Sem família conhecida.', 'No known family.'))) : null,
    h('p', { class: 'dos13-why small muted' }, t(l('Laços pesam: luto derruba moral, irmãos na mesma banda podem brigar e rachar o grupo, filhos de artistas herdam parte do público e parentes no seu elenco indicam outros nomes da família.', 'Ties matter: grief drops morale, siblings in one band may feud and split it, artists\' kids inherit part of the audience and relatives on your roster recommend other family names.'))),
    mine ? h('p', { class: 'small good' }, ic('heart'), ` ${t(l('Há parentes seus no elenco: o contato é direto (indicações e confiança maior).', 'Relatives are on your roster: direct contact (recommendations and more trust).'))}`) : null,
    ...ROWS.map((row) => {
      const xs = ks.filter((k) => row.rels.includes(k.rel));
      return xs.length ? h('div', null, h('small', { class: 'muted' }, t(row.label)), h('ul', { class: 'dos13-list small' }, xs.map(node))) : null;
    }),
    log.length ? h('ul', { class: 'memory small' }, log.map((e) => h('li', null, h('span', { class: 'muted' }, `${e[0]}/${String(e[1] + 1).padStart(2, '0')} · `), t(e[2])))) : null);
}

// rodada 16: na página da pessoa a família tem aba própria; no ato continua dentro da vida pessoal
LIFE_EXTRAS13.push((s: GameState, p: Person, open?: boolean) => (open === false ? null : familyBlock15(s, p)));
