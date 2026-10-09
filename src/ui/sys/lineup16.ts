// Rodada 16: linha do tempo da formação (página do ato) e trajetória da pessoa (bandas, ex-bandas, carreira solo).
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { formerNames16, lineupLog16, path16, segTxt, stints16, type Path16 } from '../../sim/sys/lineup16';
import { ROLE_NAMES } from '../../sim/sys/talent/attrs';
import type { Act, GameState, Person } from '../../sim/types';
import { actLink, pill } from '../common';
import { h } from '../dom';
import { ACT_TABS, PERSON_TABS, openPersonPage } from '../pages';

const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const live = (a: Act) => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';
const roleName = (p: Person) => t((ROLE_NAMES as Record<string, ReturnType<typeof l>>)[p.role] ?? l(p.role, p.role));

/** Outros atos da pessoa, com rótulo (solo / banda) e anos. */
function others(s: GameState, pid: string, except: string): HTMLElement[] {
  return path16(s, pid).filter((x) => x.act.id !== except).map((x) => h('span', { class: 'small' }, ' ', pill(t(x.solo ? l('solo', 'solo') : x.current ? l('banda', 'band') : l('ex-banda', 'ex-band')), x.solo ? 'gold' : ''), ' ', actLink(s, x.act.id), h('small', { class: 'muted' }, ` ${segTxt(x.segs)}`)));
}

function lineupTab(s: GameState, a: Act): HTMLElement {
  const st = stints16(s, a);
  const y0 = Math.min(a.debutYear, ...st.flatMap((x) => x.segs.map((g) => g.from)));
  const y1 = Math.max(y0 + 1, live(a) ? s.year : Math.min(s.year, a.careerEnd));
  const span = y1 - y0;
  const pct = (y: number) => `${Math.max(0, Math.min(100, ((y - y0) / span) * 100))}%`;
  const names = formerNames16(s, a);
  const log = lineupLog16(s, a);
  const rows = st.slice().sort((x, y) => x.segs[0].from - y.segs[0].from || (a.members.includes(y.pid) ? 1 : 0) - (a.members.includes(x.pid) ? 1 : 0));
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Quem entrou, quem saiu e para onde foi. Integrantes saem por diferenças criativas, ambição solo (fama pessoal maior que a da banda), brigas de família ou dependência; quem sai pode seguir solo, montar outra banda ou entrar em outro grupo — e às vezes volta.', 'Who joined, who left and where they went. Members leave over creative differences, solo ambition (personal fame bigger than the band), family feuds or addiction; whoever leaves may go solo, form another band or join another group — and sometimes returns.'))),
    names.length ? h('p', { class: 'small' }, t(l('Nomes: ', 'Names: ')), ...names.map(([y, n]) => h('span', null, h('b', null, n), h('small', { class: 'muted' }, ` (${t(l('até', 'until'))} ${y})`), ' → ')), h('b', null, a.name)) : null,
    h('div', { class: 'l16-grid', style: 'display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:4px 10px;align-items:center' },
      h('span'), h('div', { class: 'small muted', style: 'display:flex;justify-content:space-between' }, h('span', null, String(y0)), h('span', null, live(a) ? t(l('hoje', 'now')) : String(y1))),
      ...rows.flatMap((x) => {
        const p = s.persons[x.pid];
        const now = a.members.includes(x.pid);
        return [
          h('div', { class: 'small' }, h('button', { class: 'link', onclick: () => openPersonPage(p.id) }, p.name), !p.alive ? ' †' : '', h('div', { class: 'muted', style: 'font-size:11px' }, `${roleName(p)} · ${segTxt(x.segs)}`)),
          h('div', null,
            h('div', { title: segTxt(x.segs), style: 'position:relative;height:10px;border-radius:5px;background:var(--panel-2)' },
              ...x.segs.map((g) => h('div', { style: `position:absolute;top:0;bottom:0;left:${pct(g.from)};width:calc(${pct(g.to ?? y1)} - ${pct(g.from)} + 4px);min-width:4px;border-radius:5px;background:${now && g.to === undefined ? 'var(--accent)' : 'var(--muted)'}` }))),
            h('div', null, ...others(s, x.pid, a.id))),
        ];
      })),
    log.length ? h('div', null, h('h4', null, t(l('Mudanças nesta partida', 'Changes in this run'))),
      h('ul', { class: 'small' }, log.slice(0, 14).map(([m, , pid, k]) => h('li', null, h('span', { class: 'muted' }, `${MO[m % 12]}/${Math.floor(m / 12)} · `), k === 'j' ? pill(t(l('entrou', 'joined')), 'good') : pill(t(l('saiu', 'left')), 'bad'), ' ', s.persons[pid] ? h('button', { class: 'link', onclick: () => openPersonPage(pid) }, s.persons[pid].name) : '?')))) : null,
  );
}

ACT_TABS.push((s, a) => {
  const n = stints16(s, a).length;
  if (n < 2 && !formerNames16(s, a).length) return null;
  return { id: 'lineup16', label: l('Formação', 'Lineup'), icon: 'fans', render: () => lineupTab(s, a) };
});

function pathTab(s: GameState, p: Person): HTMLElement {
  const xs = path16(s, p.id);
  const bands = xs.filter((x) => !x.solo), solos = xs.filter((x) => x.solo);
  const ex = bands.filter((x) => !x.act.members.includes(p.id));
  const overlap = (a: Path16, b: Path16) => a.segs.some((g) => b.segs.some((k) => g.from <= (k.to ?? 9999) && k.from <= (g.to ?? 9999)));
  return h('div', null,
    h('p', { class: 'small' },
      ex.length ? [h('b', null, t(l('Ex-integrante de: ', 'Former member of: '))), ...ex.flatMap((x, i) => [i ? ', ' : '', actLink(s, x.act.id), h('small', { class: 'muted' }, ` (${segTxt(x.segs)})`)]), h('br')] : null,
      solos.length ? [h('b', null, t(l('Carreira solo: ', 'Solo career: '))), ...solos.flatMap((x, i) => [i ? ', ' : '', actLink(s, x.act.id), h('small', { class: 'muted' }, ` (${t(l('desde', 'since'))} ${x.segs[0].from})`)])] : null),
    h('ul', { class: 'small' }, xs.map((x) => {
      const par = x.solo ? bands.find((b) => overlap(x, b)) : undefined;
      return h('li', null, pill(t(x.solo ? l('carreira solo', 'solo career') : x.current ? l('integrante', 'member') : l('ex-integrante', 'former member')), x.solo ? 'gold' : x.current ? 'good' : ''), ' ', actLink(s, x.act.id), ` · ${segTxt(x.segs)}`,
        par ? h('small', { class: 'muted' }, ` · ${t(l('em paralelo a', 'alongside'))} ${par.act.name}`) : null);
    })),
    h('p', { class: 'muted small' }, t(l('A pessoa é a mesma em todos os atos: fama, fãs fiéis, relações e histórico vão junto quando ela troca de banda ou segue solo.', 'The person is the same across every act: fame, loyal fans, relationships and history travel with them when they switch bands or go solo.'))),
  );
}

PERSON_TABS.push((s, p) => (path16(s, p.id).length ? { id: 'path16', label: l('Trajetória', 'Career path'), icon: 'guitar', render: () => pathTab(s, p) } : null));
