// R29 (FAMÍLIA) — a seção Família da ficha de TODA pessoa: par (com o casal célebre ligado), filhos com idade (os que
// viraram pessoa têm link), pais (artistas pelo kin15, gente da indústria pelo family29), irmãos e a árvore (avós →
// pais → a pessoa e o par → filhos → netos), em retratos no estilo procedural antigo (portraitCanvas, que já envelhece
// pela idade). Também: menor de idade (responsável, lei da época, fundo Coogan, escola), ex-estrela mirim, rótulo
// "simulado" nos mundos alternativos, filhos da indústria na página única (people16), a busca Ctrl+K acha filhos
// e o item "Ver família" do menu de contexto abre esta aba.
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { ADULT29, PATH29, SRC29, famOf29, fam29, industryKids29, searchKids29 } from '../../sim/sys/family29';
import { kinLabel15, kinOf15, type Kin15Item } from '../../sim/sys/kin15';
import { per13 } from '../../sim/sys/persona13';
import type { GameState, Person } from '../../sim/types';
import { pill } from '../common';
import { h } from '../dom';
import { PERSON_HEAD_EXTRAS, openPersonPage } from '../pages';
import { portraitCanvas } from '../pixel/avatar';
import { personRoute16, searchRoute16 } from '../route16';
import { ic } from '../vis';
import { ent27 } from '../ps/ent27';
import './family29.css';

const $$ = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const age = (s: GameState, born: number, died?: number) => (died !== undefined ? `† ${died}` : `${s.year - born} ${t(l('anos', 'yrs'))}`);

/** Abre a ficha de alguém (pessoa do mundo ou chave da indústria) já na aba Família. */
export function openFamily29(key: string): void {
  if (key.startsWith('p:') || !key.includes(':')) { openPersonPage(key.replace(/^p:/, ''), 'fam16'); return; }
  personRoute16.f?.(key, 'fam');
}
function plink(s: GameState, pid: string, name?: string): HTMLElement {
  return h('button', { class: 'link', ...ent27('person', `p:${pid}`), onclick: () => openPersonPage(pid, 'fam16') }, name ?? s.persons[pid]?.name ?? pid);
}
function klink(s: GameState, key: string): HTMLElement {
  const n = per13(s, key)?.name ?? key;
  return h('button', { class: 'link', ...ent27('person', key), onclick: () => openFamily29(key) }, n);
}

// ---------------------------------------------------------------- árvore

interface Node29 { id: string; name: string; born: number; died?: number; pid?: string; key?: string; rel: L; me?: boolean; sim?: boolean }
function chip(s: GameState, n: Node29): HTMLElement {
  const pic = portraitCanvas({ id: n.pid ?? `fam29:${n.id}`, born: n.born, look: n.pid ? s.persons[n.pid]?.look : undefined }, s, 1);
  return h('div', { class: `fam29-node${n.me ? ' me' : ''}${n.died !== undefined ? ' gone' : ''}` }, pic,
    h('div', { class: 'fam29-n' }, n.pid && !n.me ? plink(s, n.pid, n.name) : n.key ? klink(s, n.key) : h('b', null, n.name)),
    h('small', { class: 'muted' }, `${t(n.rel)} · ${age(s, n.born, n.died)}`)); // R29: sem etiqueta "simulado" (pedido do autor)
}
const fromKin = (k: Kin15Item): Node29 => ({ id: k.id, pid: k.id, name: k.p.name, born: k.p.born, died: k.p.alive ? undefined : k.p.died, rel: kinLabel15(k) });

/** Árvore de 5 gerações (avós → netos) com o que o mundo sabe: grafo kin15 + registro leve + indústria. */
export function familyTree29(s: GameState, p: Person): HTMLElement {
  const ks = kinOf15(s, p.id);
  const F = famOf29(s, p.id);
  const by = (rs: string[]) => ks.filter((k) => rs.includes(k.rel)).map(fromKin);
  const ups = by(['grandparent']);
  const pars = by(['parent']);
  if (F.ipar && !pars.length) { const P = per13(s, F.ipar); if (P) pars.push({ id: F.ipar, key: F.ipar, name: P.name, born: P.born ?? s.year - 50, rel: l('Pai/mãe (indústria)', 'Parent (industry)') }); }
  const mid: Node29[] = [{ id: p.id, pid: p.id, name: p.name, born: p.born, died: p.alive ? undefined : p.died, rel: l('Esta pessoa', 'This person'), me: true }];
  const sp = by(['spouse']);
  if (!sp.length && F.partner) mid.push({ id: `pt:${p.id}`, pid: F.partner.pid, name: F.partner.name, born: F.partner.pid ? s.persons[F.partner.pid]?.born ?? p.born : p.born + 1, rel: F.partner.married ? l('Cônjuge', 'Spouse') : l('Par', 'Partner'), sim: F.partner.sim });
  mid.push(...sp);
  const sibs = by(['sibling']);
  const kids = by(['child']);
  for (const k of F.kids) if (!kids.some((x) => x.pid && x.pid === k.pid)) kids.push({ id: k.id, pid: k.pid, name: k.name, born: k.born, rel: l('Filho(a)', 'Child'), sim: F.sim });
  const grand = by(['grandchild']);
  const row = (label: L, xs: Node29[]) => (xs.length ? h('div', { class: 'fam29-gen' }, h('small', { class: 'fam29-lab muted' }, t(label)), h('div', { class: 'fam29-row' }, xs.slice(0, 12).map((x) => chip(s, x)))) : null);
  const any = ups.length + pars.length + sibs.length + kids.length + grand.length + mid.length - 1;
  if (!any) return h('p', { class: 'small muted' }, t(l('Árvore vazia: sem parentes conhecidos.', 'Empty tree: no known relatives.')));
  return h('div', { class: 'fam29-tree', role: 'tree', 'aria-label': t(l('Árvore da família', 'Family tree')) },
    row(l('Avós', 'Grandparents'), ups),
    row(l('Pais', 'Parents'), pars),
    h('div', { class: 'fam29-gen' }, h('small', { class: 'fam29-lab muted' }, t(l('Casal e irmãos', 'Couple and siblings'))),
      h('div', { class: 'fam29-row' }, ...mid.map((x) => chip(s, x)), sibs.length ? h('span', { class: 'fam29-sep' }, '·') : null, ...sibs.slice(0, 8).map((x) => chip(s, x)))),
    row(l('Filhos', 'Children'), kids.sort((a, b) => a.born - b.born)),
    row(l('Netos', 'Grandchildren'), grand));
}

// ---------------------------------------------------------------- seção da ficha

/** Bloco R29 da aba Família (abaixo do bloco do kin15): casamento, filhos, pais, menor, árvore. */
export function famSection29(s: GameState, p: Person): HTMLElement {
  const F = famOf29(s, p.id);
  const ks = kinOf15(s, p.id);
  const spouse = ks.find((k) => k.rel === 'spouse');
  const status = spouse || F.status === 2 ? l('Casado(a)', 'Married') : F.status === 1 ? l('Namorando', 'Dating') : F.status === 3 ? (F.partner === undefined && F.exes.some((x) => x.pid && !s.persons[x.pid]?.alive) ? l('Viúvo(a)', 'Widowed') : l('Separado(a)', 'Separated')) : l('Solteiro(a)', 'Single');
  const parents = ks.filter((k) => k.rel === 'parent');
  const sibs = ks.filter((k) => k.rel === 'sibling');
  const m = F.minor;
  const lines: (HTMLElement | null)[] = [
    h('li', null, ic('heart'), ` ${t(status)}`, F.partner ? [' · ', F.partner.pid ? plink(s, F.partner.pid, F.partner.name) : h('span', null, F.partner.name), F.partner.married ? h('span', { class: 'muted' }, ` (${t(l('desde', 'since'))} ${F.partner.married})`) : null, F.partner.pid ? [' ', pill(t(l('casal célebre', 'celebrity couple')), 'gold')] : null] : null),
    F.exes.length ? h('li', { class: 'muted' }, `${t(l('Ex', 'Exes'))}: `, ...F.exes.slice(0, 4).flatMap((x, i) => [i ? ', ' : '', x.pid ? plink(s, x.pid, x.name) : h('span', null, x.name)])) : null,
    parents.length || F.ipar ? h('li', null, `${t(l('Pais', 'Parents'))}: `, ...parents.flatMap((k, i) => [i ? ', ' : '', plink(s, k.id, k.p.name)]), F.ipar ? [parents.length ? ', ' : '', klink(s, F.ipar), h('span', { class: 'muted' }, ` (${t(l('indústria', 'industry'))})`)] : null) : null,
    sibs.length ? h('li', null, `${t(l('Irmãos', 'Siblings'))}: `, ...sibs.slice(0, 8).flatMap((k, i) => [i ? ', ' : '', plink(s, k.id, k.p.name)])) : null,
    F.kids.length ? h('li', null, `${t(l('Filhos', 'Children'))}: `, ...F.kids.flatMap((k, i) => [i ? ', ' : '', k.pid ? plink(s, k.pid, k.name) : h('span', null, k.name), h('span', { class: 'muted' }, ` (${s.year - k.born}${k.music && !k.pid && k.debut && s.year - k.born >= 10 ?` · ${t(l('quer ser músico(a)', 'wants to be a musician'))}` : ''})`)])) : null,
    F.house > 0 ? h('li', { class: 'muted' }, ic('money'), ` ${t(l('Casa (patrimônio da família)', 'Household (family wealth)'))}: $${Math.round(F.house).toLocaleString('en-US')}`) : null,
    m ? h('li', { class: 'fam29-minor' }, ic('star'), ` ${t(l('Menor de idade', 'Minor'))} (${s.year - p.born}) · ${t(SRC29[m.src])} · ${t(l('responsável', 'guardian'))}: `, m.gk ? plink(s, m.gk, m.g) : h('b', null, m.g),
      m.pm ? [' ', pill(t(l('pai/mãe-empresário(a)', 'parent-manager')), 'warn')] : null,
      h('div', { class: 'small muted' }, m.law ? t(m.law.name) : t(l('Sem lei de proteção nesta época/país: nada de fundo nem limite de horas.', 'No protection law in this era/country: no trust, no hour limit.'))),
      h('div', { class: 'small' }, `${t(l('Fundo do menor', 'Minor\'s trust'))}: ${$$(m.tr)} · ${t(l('libera aos', 'released at'))} ${ADULT29} · ${t(l('escola e limite de horas pesam na agenda', 'school and hour limits weigh on the schedule'))}${m.sc ? ` · ${t(l('denúncias de exploração', 'exploitation exposés'))}: ${m.sc}` : ''}`)) : null,
    F.exChild !== undefined ? h('li', { class: 'muted' }, ic('star'), ` ${t(l('Ex-estrela mirim (maioridade em {y}): risco maior de vício até os 30.', 'Former child star (came of age in {y}): higher addiction risk until 30.'), { y: F.exChild })}`) : null,
  ];
  return h('div', { class: 'fam29' },
    h('h4', null, ic('fans'), ` ${t(l('Família (R29)', 'Family (R29)'))}`),
    h('ul', { class: 'dos13-list small' }, ...lines),
    h('details', { class: 'fam29-tree-wrap', open: true }, h('summary', { class: 'small' }, ic('network'), ` ${t(l('Árvore da família', 'Family tree'))}`), familyTree29(s, p)),
    h('p', { class: 'small muted' }, t(l('Casamento e filhos seguram vícios; divórcio dentro da banda vira rixa; filhos de famosos estreiam com fama e fãs herdados (e comparação); menores têm responsável, fundo e limite de horas.', 'Marriage and kids hold addictions back; a divorce inside the band becomes a feud; children of the famous debut with inherited fame and fans (and comparison); minors have a guardian, a trust and hour limits.'))));
}

/** Página única (gente da indústria): filhos e o que cada um virou. */
export function famIndustry29(s: GameState, key: string): HTMLElement | null {
  const ks = industryKids29(s, key);
  if (!ks.length) return null;
  return h('div', { class: 'fam29' },
    h('h4', null, ic('fans'), ` ${t(l('Filhos e carreiras', 'Children and careers'))}`),
    h('ul', { class: 'dos13-list small' }, ks.map((k) => h('li', null, k.pid ? plink(s, k.pid, k.name) : h('span', null, k.name), ` · ${s.year - k.born} ${t(l('anos', 'yrs'))}`,
      k.path ? [' · ', pill(t(PATH29[k.path]), k.path === 'other' ? '' : 'good')] : s.year - k.born < ADULT29 ? h('span', { class: 'muted' }, ` · ${t(l('ainda criança', 'still a child'))}`) : null))),
    h('p', { class: 'small muted' }, t(l('Aos 18–30 cada filho escolhe: o ramo do pai/mãe (com nepotismo: contatos, reputação e portas abertas), música, ou outra vida.', 'At 18–30 each child chooses: the parent\'s field (with nepotism: contacts, reputation and open doors), music, or another life.'))));
}

// ---------------------------------------------------------------- busca (Ctrl+K): filhos ainda leves

setTimeout(() => {
  const prevS = searchRoute16.f, prevR = personRoute16.f;
  searchRoute16.f = (s: GameState, q: string) => {
    const out = prevS?.(s, q) ?? [];
    if (q.length < 2) return out;
    for (const k of searchKids29(s, q)) out.push({ label: k.name, hint: `${t(l('filho(a) de', 'child of'))} ${k.parentName} · ${s.year - k.born} ${t(l('anos', 'yrs'))}`, key: `fam29:${k.parent}` });
    // filhos da indústria que viraram pessoa sem banda (produtor, empresário, crítico…)
    for (const [pid, key] of Object.entries(fam29(s).ip)) {
      const p = s.persons[pid];
      if (p && p.name.toLowerCase().includes(q) && out.length < 60) out.push({ label: p.name, hint: `${t(l('filho(a) de', 'child of'))} ${per13(s, key)?.name ?? key}`, key: `p:${pid}` });
    }
    return out;
  };
  personRoute16.f = (key: string, tab?: string) => {
    if (key.startsWith('fam29:')) { openFamily29(key.slice(6)); return true; }
    return prevR?.(key, tab) ?? false;
  };
}, 0);

/** Pessoa menor de idade? (para a interface: selo de "menor" no cabeçalho). */
export const isMinor29 = (s: GameState, pid: string): boolean => !!fam29(s).min[pid];

// cabeçalho da ficha: menor de idade (com o responsável) e casal célebre, clicáveis para a aba Família
PERSON_HEAD_EXTRAS.push((s, p) => {
  const F = famOf29(s, p.id);
  if (!F.minor && !F.partner?.pid) return null;
  return h('span', { class: 'row wrap small' },
    F.minor ? h('button', { class: 'btn small ghost', title: t(l('Menor de idade: responsável, fundo e limite de horas (aba Família).', 'Minor: guardian, trust and hour limits (Family tab).')), onclick: () => openFamily29(`p:${p.id}`) }, ic('star'), ` ${t(l('Menor', 'Minor'))} · ${F.minor.g}`) : null,
    F.partner?.pid ? h('button', { class: 'btn small ghost', onclick: () => openFamily29(`p:${F.partner!.pid}`) }, ic('heart'), ` ${F.partner.name}`) : null);
});
