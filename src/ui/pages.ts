// Páginas completas (rodada 5): ficha do artista com abas (visão geral, integrantes, discografia,
// músicas, carreira, contrato) e card do integrante estilo "carta de jogador" com todos os atributos
// por grupo, instrumentos, personalidade, saúde, relações, carreira e aulas.
// O que o jogador vê de atos alheios depende do grau de conhecimento (faixas, não números exatos).

import { AMBITIONS, ORIGINS, traitById } from '../data/people';
import { actAffinity, affinityLabel, bestFamilies, genreFamilyName, worstFamily } from '../sim/sys/temper';
import { CONTRACT_MODELS } from '../data/rules';
import { l, type L } from '../data/world';
import { S, t } from '../i18n/strings';
import { avgReview } from '../sim/media';
import { actState } from '../sim/people';
import { DEGREES, estimate, sourceName, visibleFields } from '../sim/scouting';
import {
  GROUP_NAMES, LESSON_COST, LESSON_NAMES, ROLE_NAMES, attrsOf, form, groupAvg, lessonFor, marketValue, overall, startLessons, stopLessons, tal,
  type AttrGroup,
} from '../sim/sys/talent';
import { P } from '../sim/sys/people/state';
import { activeThoughts, thoughtText } from '../sim/sys/people/thoughts';
import type { Act, GameState, Person } from '../sim/types';
import { money } from '../sim/util';
import { $, N, actLink, cityName, cover, genreName, kv, labelLink, logo, modal, monthName, pill, rerender, statusName, toast } from './common';
import { bar, h, rangeBar, select } from './dom';
import { openOffer, openRelease } from './ficha';
import { portraitCanvas } from './pixel/avatar';
import { appearanceEditor } from './pixel/editor';
import { personActivity } from './pixel/activity';
import { instrumentsTab } from './sys/instruments';
import { rw } from '../sim/sys/realworld';
import { instById, instrumentsOf } from '../sim/sys/instruments';
import { icon } from './pixel/icons';
import { pageTabs as extraPageTabs } from './registry';
import { store } from './store';
import { chips, ic, meter, stat } from './vis';
import './pages.css';

/** Botões extras no topo da página do ato (rodada 8: projeto musical). */
export const ACT_HEAD_EXTRAS: ((s: GameState, a: Act, close: () => void) => HTMLElement | null)[] = [];

function g(): GameState {
  return store.game!;
}

const GROUPS: AttrGroup[] = ['tech', 'create', 'stage', 'mind', 'body'];

/** Abas extras das páginas (rodada 8: relações entre artistas, feats). */
export interface PageTab { id: string; label: L; icon?: string; render: () => HTMLElement | null }
export const PERSON_TABS: ((s: GameState, p: Person, closeAll: () => void) => PageTab | null)[] = [];
export const ACT_TABS: ((s: GameState, a: Act, close: () => void) => PageTab | null)[] = [];
const GROUP_ICON: Record<AttrGroup, string> = { tech: 'guitar', create: 'pen', stage: 'mic', mind: 'bulb', body: 'heart' };

/** Abas locais de uma página (redesenham só o corpo da página). */
function pageTabs(items: { id: string; label: L; icon?: string; render: () => HTMLElement | null }[], initial?: string): HTMLElement {
  const body = h('div', { class: 'pg-tab-body' });
  const bar0 = h('div', { class: 'tabs', role: 'tablist' });
  let cur = items.find((i) => i.id === initial)?.id ?? items[0]?.id;
  const draw = () => {
    bar0.replaceChildren(...items.map((i) => h('button', { role: 'tab', 'aria-selected': i.id === cur ? 'true' : 'false', class: i.id === cur ? 'on' : '', onclick: () => { cur = i.id; draw(); } }, i.icon ? ic(i.icon) : null, ' ', t(i.label))));
    body.replaceChildren(items.find((i) => i.id === cur)?.render() ?? h('span'));
  };
  draw();
  return h('div', { class: 'tabs-wrap pg-tabs' }, bar0, body);
}

const tone = (v: number): string => (v >= 80 ? 'elite' : v >= 65 ? 'good' : v >= 45 ? 'mid' : 'low');

function ovrBadge(v: number | string, big = false): HTMLElement {
  const n = typeof v === 'number' ? v : Number(String(v).split('–')[0]);
  return h('span', { class: `ovr ${tone(n)} ${big ? 'big' : ''}`, title: t(l('Nota geral', 'Overall rating')) }, String(v));
}

function formIcon(f: number): HTMLElement {
  const arrows = ['⇊', '↓', '→', '↑', '⇈'];
  const names = [l('Péssima', 'Awful'), l('Ruim', 'Poor'), l('Normal', 'Normal'), l('Boa', 'Good'), l('Excelente', 'Excellent')];
  return h('span', { class: `form f${f + 2}`, title: `${t(l('Forma', 'Form'))}: ${t(names[f + 2])}` }, arrows[f + 2]);
}

/** Largura da incerteza dos atributos conforme o grau de conhecimento. */
function fuzz(deg: number, mine: boolean): number {
  return mine ? 0 : [99, 30, 18, 10, 4, 0][Math.max(0, Math.min(5, deg))];
}

function personDegree(s: GameState, p: Person): { act?: Act; mine: boolean; deg: number } {
  const act = Object.values(s.acts).find((a) => a.members.includes(p.id));
  const mine = !!act && (act.owner === 'player' || !!act.playerBand) || !!p.isPlayer;
  const deg = mine ? 5 : act ? s.knowledge[act.id]?.degree ?? 0 : 0;
  return { act, mine, deg };
}

function shown(v: number, w: number): string {
  if (!w) return String(v);
  if (w >= 99) return '?';
  return `${Math.max(1, Math.round(v - w / 2))}–${Math.min(99, Math.round(v + w / 2))}`;
}

// ================================================================== card do integrante

export function personCard(s: GameState, p: Person, opts: { onClick?: () => void; compact?: boolean } = {}): HTMLElement {
  const { mine, deg } = personDegree(s, p);
  const w = fuzz(deg, mine);
  const ovr = overall(s, p);
  const top = attrsOf(s, p).sort((a, b) => b.value - a.value).slice(0, opts.compact ? 2 : 3);
  return h('button', { class: `pcard ${tone(ovr)}`, type: 'button', onclick: opts.onClick ?? (() => openPersonPage(p.id)) },
    h('div', { class: 'pcard-top' }, w >= 99 ? ovrBadge('?') : ovrBadge(w ? shown(ovr, w) : ovr), h('small', null, t(ROLE_NAMES[p.role] ?? l(p.role, p.role))), mine ? formIcon(form(p)) : null),
    portraitCanvas(p, s, 2),
    h('b', { class: 'pcard-name' }, p.name, p.isPlayer ? ' ★' : ''),
    h('small', { class: 'muted' }, `${s.year - p.born} ${t(l('anos', 'yrs'))}`),
    w < 99 ? h('div', { class: 'pcard-attrs' }, top.map((x) => h('span', null, t(x.def.name), ' ', h('b', null, shown(x.value, w))))) : null,
  );
}

export function openPersonPage(id: string): void {
  const s = g();
  const p = s.persons[id];
  if (!p) return;
  let close = () => {};
  const content = h('div');
  const draw = () => content.replaceChildren(personBody(s, p, () => { close(); rerender(); }, draw));
  draw();
  close = modal(p.name, content, { wide: true, onClose: () => rerender() });
}

function personBody(s: GameState, p: Person, closeAll: () => void, redraw: () => void): HTMLElement {
  const { act, mine, deg } = personDegree(s, p);
  const vis = visibleFields(deg);
  const w = fuzz(deg, mine);
  const ovr = overall(s, p);
  const portraitBox = h('div', { class: 'pg-portrait' }, portraitCanvas(p, s, 4));
  const activity = mine ? personActivity(s, p.id) : null;
  const pot = Math.round(p.potential);
  const potShown = mine ? (s.year - p.born < 26 ? `${Math.max(ovr, pot - 6)}–${pot + 6}` : `~${Math.max(ovr, pot)}`) : vis.skills ? `${Math.max(1, pot - 15)}–${pot + 15}` : '?';
  const editLook = () => {
    const editor = appearanceEditor(p, (look) => {
      if (look) p.look = look;
      else delete p.look;
      portraitBox.replaceChildren(portraitCanvas(p, s, 4));
    }, s.year);
    modal(t(l('Editar aparência', 'Edit look')) + ` — ${p.name}`, editor, { wide: true });
  };
  const head = h('div', { class: `pg-head pcard-big ${tone(ovr)}` },
    portraitBox,
    h('div', { class: 'pg-head-main' },
      h('div', { class: 'row wrap' }, w >= 99 ? ovrBadge('?', true) : ovrBadge(w ? shown(ovr, w) : ovr, true), h('div', null,
        h('h3', null, p.name, p.isPlayer ? pill(t(l('você', 'you')), 'gold') : null, !p.alive ? pill(t(l('falecido(a)', 'deceased')), 'bad') : null),
        h('div', null, pill(t(ROLE_NAMES[p.role] ?? l(p.role, p.role))), ' ', act ? actLink(s, act.id) : h('span', { class: 'muted' }, t(l('sem banda', 'no band'))), mine ? h('span', null, ' ', formIcon(form(p))) : null))),
      chips(
        stat('calendar', s.year - p.born, l('Idade', 'Age')),
        stat('star', potShown, l('Potencial', 'Potential')),
        vis.skills || mine ? stat('coin', $(money(s, marketValue(s, p, act?.fame ?? 0))), l('Valor de mercado (cachê/passe)', 'Market value (fee/transfer)')) : null,
        stat('globe', t(ORIGINS.find((o) => o.id === p.origin)?.name) || '—', l('Formação', 'Background')),
      ),
      activity ? h('div', { class: 'small' }, icon(activity.icon, 1), ' ', t(activity.label)) : null,
      h('div', { class: 'row wrap' },
        mine || vis.private ? h('button', { class: 'btn small', onclick: editLook }, ic('pen'), ' ', t(l('Editar aparência', 'Edit look'))) : null,
        act ? h('button', { class: 'btn small ghost', onclick: () => { closeAll(); openActPage(act.id); } }, ic('guitar'), ' ', t(l('Página do artista', 'Artist page'))) : null),
    ),
  );
  return h('div', { class: 'ficha pg' }, head, pageTabs([
    { id: 'attrs', label: l('Atributos', 'Attributes'), icon: 'chart-up', render: () => attrsTab(s, p, w, mine) },
    { id: 'profile', label: l('Perfil', 'Profile'), icon: 'bulb', render: () => profileTab(s, p, vis) },
    { id: 'inst', label: l('Instrumentos', 'Instruments'), icon: 'guitar', render: () => instrumentsTab(s, p, mine || !!p.isPlayer, redraw) },
    mine ? { id: 'mood', label: l('Humor e saúde', 'Mood and health'), icon: 'heart', render: () => moodTab(s, p) } : null,
    vis.private || mine ? { id: 'rel', label: l('Relações', 'Relationships'), icon: 'handshake', render: () => relTab(s, p) } : null,
    { id: 'career', label: l('Carreira', 'Career'), icon: 'trophy', render: () => careerTab(s, p) },
    mine && !p.isPlayer ? { id: 'train', label: l('Treino', 'Training'), icon: 'sparkle', render: () => trainTab(s, p, redraw) } : null,
    ...PERSON_TABS.map((f) => f(s, p, closeAll)),
  ].filter((x): x is NonNullable<typeof x> => !!x)));
}

function attrsTab(s: GameState, p: Person, w: number, mine: boolean): HTMLElement {
  if (w >= 99) return h('p', { class: 'muted' }, t(l('Os atributos aparecem a partir de Observação (descoberta).', 'Attributes appear from Observation onward (discovery).')));
  const all = attrsOf(s, p);
  const growth = tal(s).g[p.id] ?? {};
  return h('div', null,
    h('div', { class: 'attr-grid' }, GROUPS.map((gr) => {
      const xs = all.filter((x) => x.def.group === gr);
      if (!xs.length) return null;
      const avg = Math.round(groupAvg(s, p, gr));
      return h('section', { class: 'attr-col' },
        h('h4', null, ic(GROUP_ICON[gr]), ' ', t(GROUP_NAMES[gr]), ' ', h('span', { class: `attr-v ${tone(avg)}` }, shown(avg, w))),
        h('ul', null, xs.map((x) => {
          const gv = growth[x.def.id] ?? 0;
          return h('li', { title: t(x.def.desc) },
            h('span', null, t(x.def.name)),
            w ? rangeBar(Math.max(0, x.value - w / 2), Math.min(100, x.value + w / 2)) : bar(x.value, 100, tone(x.value)),
            h('b', { class: `attr-v ${tone(x.value)}` }, shown(x.value, w)),
            mine && Math.abs(gv) >= 0.5 ? h('small', { class: gv > 0 ? 'good' : 'bad' }, gv > 0 ? `+${Math.round(gv)}` : String(Math.round(gv))) : null);
        })));
    })),
    h('p', null, h('b', null, t(l('Instrumentos: ', 'Instruments: '))), instrumentsOf(s, p).map((x) => pill(`${t(instById[x.id]?.name ?? l(x.id))} ${shown(x.lvl, w)}`))),
    h('p', { class: 'muted small' }, t(l('Técnica entra na performance das gravações; criação nas notas das músicas; palco na receita dos shows; mental na regularidade; físico no desgaste das turnês. Passe o mouse para ver o que cada atributo faz.', 'Technique feeds recording performance; creativity feeds song scores; stage feeds show revenue; mental feeds consistency; physical feeds tour wear. Hover to see what each attribute does.'))),
    mine ? null : h('p', { class: 'muted small' }, t(l('Faixas = incerteza do seu conhecimento sobre o artista. Olheiros e reuniões estreitam.', 'Ranges = uncertainty of your knowledge. Scouts and meetings narrow them.'))),
  );
}

const PERSONA_NAMES: Record<string, L> = {
  openness: l('Abertura a novidades', 'Openness'), perfectionism: l('Perfeccionismo', 'Perfectionism'), ambition: l('Ambição', 'Ambition'),
  sociability: l('Sociabilidade', 'Sociability'), discipline: l('Disciplina', 'Discipline'), resilience: l('Resiliência', 'Resilience'),
};
const GOAL_NAMES: Record<string, L> = {
  security: l('Segurança financeira', 'Financial security'), credit: l('Reconhecimento artístico', 'Artistic credit'), family: l('Família', 'Family'), leadership: l('Liderar a banda', 'Lead the band'), solo: l('Carreira solo', 'Solo career'),
};

function profileTab(s: GameState, p: Person, vis: ReturnType<typeof visibleFields>): HTMLElement {
  return h('div', { class: 'grid2' },
    h('div', null,
      h('h4', null, t(l('Personalidade', 'Personality'))),
      p.persona && vis.traits ? h('ul', { class: 'attr-list' }, Object.entries(p.persona).map(([k, v]) => h('li', null, h('span', null, t(PERSONA_NAMES[k] ?? l(k, k))), bar(v), h('b', null, Math.round(v))))) : h('p', { class: 'muted small' }, t(l('Personalidade aparece com mais contato.', 'Personality shows with more contact.'))),
      vis.ambition ? kv(t(S.ambition), t(AMBITIONS.find((x) => x.id === p.ambition)?.name)) : null,
      vis.ambition && p.goal ? kv(t(l('Objetivo pessoal', 'Personal goal')), t(GOAL_NAMES[p.goal])) : null,
    ),
    h('div', null,
      h('h4', null, t(S.traits)),
      vis.traits ? h('ul', { class: 'trait-list' }, p.traits.map((tr) => {
        const d = traitById[tr];
        if (!d) return null;
        const mods = Object.entries(d.mod).map(([k, v]) => `${k} ${Number(v) > 0 ? '+' : ''}${v}`).join(', ');
        return h('li', null, pill(t(d.name), 'trait'), h('small', { class: 'muted' }, ` ${mods}`));
      })) : h('p', { class: 'muted small' }, '…'),
      vis.traits && bestFamilies(p).length ? kv(t(l('Combina com', 'Suits')), h('span', null, ...bestFamilies(p).map((f) => pill(t(f.name), 'good')))) : null,
      vis.traits && worstFamily(p) ? kv(t(l('Não combina com', 'Does not suit')), pill(t(worstFamily(p)!.name), 'bad')) : null,
      kv(t(S.origin), t(ORIGINS.find((o) => o.id === p.origin)?.name)),
      kv(t(l('Nascimento', 'Born')), p.born),
      p.retireAge ? kv(t(l('Pensa em parar aos', 'Plans to stop at')), p.retireAge) : null,
    ),
  );
}

function moodTab(s: GameState, p: Person): HTMLElement {
  const hs = P(s).health[p.id];
  const th = activeThoughts(s, p.id);
  return h('div', { class: 'grid2' },
    h('div', null,
      h('div', { class: 'grid2' },
        meter('heart', S.morale, p.morale), meter('sparkle', S.inspiration, p.inspiration),
        meter('sleep', S.fatigue, p.fatigue, 100, true), meter('stress', S.stress, p.stress, 100, true)),
      kv(t(S.health), p.health === 'ok' ? t(l('Bem', 'Fine')) : p.health),
      hs ? h('ul', { class: 'attr-list' },
        h('li', null, h('span', null, t(l('Desgaste vocal', 'Vocal wear'))), bar(hs.voice, 100, hs.voice > 70 ? 'bad' : ''), h('b', null, Math.round(hs.voice))),
        h('li', null, h('span', null, t(l('Dano auditivo', 'Hearing damage'))), bar(hs.hearing, 100, hs.hearing > 55 ? 'bad' : ''), h('b', null, Math.round(hs.hearing))),
        h('li', null, h('span', null, t(l('Dependência', 'Dependency'))), bar(hs.dependency, 100, hs.dependency > 60 ? 'bad' : ''), h('b', null, Math.round(hs.dependency))),
        hs.injuryWeeks > 0 ? h('li', null, h('span', null, t(l('Lesão', 'Injury'))), h('b', { class: 'bad' }, `${hs.injuryWeeks} ${t(l('sem.', 'wks'))}`)) : null,
      ) : null,
    ),
    h('div', null,
      h('h4', null, t(l('O que está pensando', 'What they are thinking'))),
      th.length ? h('ul', { class: 'thoughts' }, th.slice(0, 10).map((x) => h('li', { class: x.v >= 0 ? 'good' : 'bad' }, `${x.v > 0 ? '+' : ''}${Math.round(x.v)} `, t(thoughtText(x))))) : h('p', { class: 'muted small' }, t(l('Nada em particular.', 'Nothing in particular.'))),
    ),
  );
}

function relTab(s: GameState, p: Person): HTMLElement {
  const rels = Object.entries(p.rel ?? {}).filter(([id]) => s.persons[id]).sort((a, b) => b[1] - a[1]);
  const row = ([id, v]: [string, number]) => h('li', null, h('button', { class: 'link', onclick: () => openPersonPage(id) }, s.persons[id].name), ' ', bar(Math.abs(v), 100, v >= 0 ? 'good' : 'bad'), h('b', { class: v >= 0 ? 'good' : 'bad' }, ` ${v > 0 ? '+' : ''}${Math.round(v)}`));
  const rom = (P(s).romances ?? []).filter((r) => r.status === 'together' && (r.a === p.id || r.b === p.id));
  return h('div', { class: 'grid2' },
    h('div', null, h('h4', null, t(l('Afinidades', 'Friends'))), rels.filter(([, v]) => v > 0).length ? h('ul', { class: 'attr-list' }, rels.filter(([, v]) => v > 0).slice(0, 6).map(row)) : h('p', { class: 'muted small' }, '—')),
    h('div', null, h('h4', null, t(l('Atritos', 'Frictions'))), rels.filter(([, v]) => v < 0).length ? h('ul', { class: 'attr-list' }, rels.filter(([, v]) => v < 0).reverse().slice(0, 6).map(row)) : h('p', { class: 'muted small' }, '—'),
      rom.length ? h('p', null, ic('heart'), ' ', t(l('Namorando: ', 'Dating: ')), rom.map((r) => s.persons[r.a === p.id ? r.b : r.a]?.name).join(', ')) : null),
  );
}

function careerTab(s: GameState, p: Person): HTMLElement {
  const written = Object.values(s.songs).filter((so) => so.writers.includes(p.id));
  const released = written.filter((so) => so.releaseId);
  const hits = released.filter((so) => (s.releases[so.releaseId!]?.peak ?? 999) <= 10);
  const best = released.sort((a, b) => (s.releases[a.releaseId!]?.peak ?? 999) - (s.releases[b.releaseId!]?.peak ?? 999)).slice(0, 5);
  const acts = Object.values(s.acts).filter((a) => a.members.includes(p.id) || (a.history.length && p.parentId === a.id));
  return h('div', null,
    chips(stat('pen', written.length, l('Músicas escritas', 'Songs written')), stat('disc', released.length, l('Lançadas', 'Released')), stat('trophy', hits.length, l('No top 10', 'Top 10'))),
    acts.length ? h('p', null, t(l('Atos: ', 'Acts: ')), acts.map((a) => actLink(s, a.id))) : null,
    best.length ? h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, h('th', null, t(S.title)), h('th', null, 'Q'), h('th', null, t(S.peak)), h('th', null, t(l('Ano', 'Year'))))),
      h('tbody', null, best.map((so) => { const r = s.releases[so.releaseId!]; return h('tr', null, h('td', null, h('button', { class: 'link', onclick: () => openRelease(r.id) }, so.title)), h('td', null, Math.round(so.q)), h('td', null, r.peak < 999 ? `#${r.peak}` : '—'), h('td', null, r.year)); }))) : null,
  );
}

function trainTab(s: GameState, p: Person, redraw: () => void): HTMLElement {
  const cur = lessonFor(s, p.id);
  let pick: AttrGroup = 'tech';
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Aulas por 3 meses, pagas mês a mês pela empresa. Jovens e dedicados aprendem mais rápido; aulas cansam um pouco (menos terapia e preparo físico, que aliviam).', 'Three months of lessons, paid monthly by the company. The young and hard-working learn faster; lessons tire a little (except therapy and fitness, which relieve).'))),
    cur ? h('div', { class: 'row wrap' }, pill(`${t(LESSON_NAMES[cur.group])} — ${Math.max(0, cur.until - s.week)} ${t(l('semanas', 'weeks'))}`, 'good'), h('button', { class: 'btn small ghost', onclick: () => { stopLessons(s, p.id); redraw(); } }, t(l('Cancelar aulas', 'Cancel lessons'))))
      : h('div', { class: 'row wrap' },
        select<AttrGroup>(pick, GROUPS.map((gr) => ({ value: gr, label: `${t(LESSON_NAMES[gr])} · ${$(money(s, LESSON_COST[gr]))}/${t(l('mês', 'mo'))}` })), (v) => (pick = v)),
        h('button', { class: 'btn small primary', onclick: () => { const e = startLessons(s, p.id, pick); toast(t(e ?? l('Aulas marcadas.', 'Lessons booked.')), e ? 'bad' : 'good'); redraw(); } }, t(l('Começar aulas', 'Start lessons')))),
  );
}

// ================================================================== página do artista

export function openActPage(id: string, tab?: string): void {
  const s = g();
  const a = s.acts[id];
  if (!a) return;
  let close = () => {};
  const content = h('div');
  content.appendChild(actBody(s, a, () => close(), tab));
  close = modal(a.name, content, { wide: true });
}

function actBody(s: GameState, a: Act, close: () => void, tab?: string): HTMLElement {
  const k = s.knowledge[a.id];
  const mine = a.owner === 'player' || !!a.playerBand;
  const deg = mine ? 5 : k?.degree ?? 0;
  const vis = visibleFields(deg);
  const ms = a.members.map((x) => s.persons[x]).filter((p): p is Person => !!p);
  const teamOvr = ms.length ? Math.round(ms.reduce((t0, p) => t0 + overall(s, p), 0) / ms.length) : 0;
  const w = fuzz(deg, mine);
  const head = h('div', { class: 'pg-head' }, logo(a, 84),
    h('div', { class: 'pg-head-main' },
      h('div', { class: 'row wrap' }, w >= 99 ? ovrBadge('?', true) : ovrBadge(w ? shown(teamOvr, w) : teamOvr, true),
        h('div', null,
          h('h3', null, a.name, a.catalogNo ? pill('★', 'gold') : null, a.legend ? pill(t(l('Lenda', 'Legend')), 'gold') : null, a.archetype === 'synthetic' ? pill('AI', 'neural') : null),
          h('div', { class: 'muted' }, `${genreName(a.genre)} · ${cityName(a.city)} · ${t(l('desde', 'since'))} ${a.formed} · `, pill(statusName(a.status))),
          h('div', null, t(S.owner), ': ', labelLink(s, a.owner), ' · ', t(S.knownAs), ': ', pill(t(DEGREES[Math.max(0, deg - 1)])), k ? h('span', { class: 'muted' }, ` · ${t(S.source)}: ${t(sourceName(k.source))}`) : null))),
      h('div', { class: 'row wrap' },
        !mine && !a.owner && s.config.role !== 'artist' ? h('button', { class: 'btn small primary', onclick: () => { close(); openOffer(a.id); } }, t(S.makeOffer)) : null,
        ...ACT_HEAD_EXTRAS.map((f) => f(s, a, close))),
    ),
  );
  return h('div', { class: 'ficha pg' }, head, pageTabs([
    { id: 'overview', label: l('Visão geral', 'Overview'), icon: 'star', render: () => overviewTab(s, a, deg, mine) },
    { id: 'members', label: l('Integrantes', 'Members'), icon: 'fans', render: () => membersTab(s, a, ms) },
    { id: 'disco', label: l('Discografia', 'Discography'), icon: 'disc', render: () => discoTab(s, a, mine) },
    vis.private || mine ? { id: 'songs', label: l('Músicas', 'Songs'), icon: 'note', render: () => songsTab(s, a, mine) } : null,
    { id: 'history', label: l('Carreira', 'Career'), icon: 'trophy', render: () => historyTab(s, a) },
    a.contractId && (mine || deg >= 3) ? { id: 'contract', label: S.contract, icon: 'contract', render: () => contractTab(s, a) } : null,
    ...ACT_TABS.map((f) => f(s, a, close)),
    ...extraPageTabs('act', s, a.id).map((x) => ({ id: x.id, label: x.label, icon: x.icon, render: () => x.render(s, a.id) })),
  ].filter((x): x is NonNullable<typeof x> => !!x), tab));
}

/** Blocos extras no fim da visão geral do artista (rodada 8: assinatura sonora). */
export const ACT_OVERVIEW_EXTRAS: ((s: GameState, a: Act, deg: number, mine: boolean) => HTMLElement | null)[] = [];

function overviewTab(s: GameState, a: Act, deg: number, mine: boolean): HTMLElement {
  return h('div', null, overviewGrid(s, a, deg, mine), ...ACT_OVERVIEW_EXTRAS.map((f) => f(s, a, deg, mine)));
}

function overviewGrid(s: GameState, a: Act, deg: number, mine: boolean): HTMLElement {
  const st = actState(s, a);
  const pot = estimate(s, a.id, 'potential');
  const fame = estimate(s, a.id, 'fame');
  const ms = a.members.map((x) => s.persons[x]).filter((p): p is Person => !!p);
  const groupScores = GROUPS.map((gr) => ({ gr, v: ms.length ? ms.reduce((t0, p) => t0 + groupAvg(s, p, gr), 0) / ms.length : 0 })).sort((x, y) => y.v - x.v);
  const img = a.image;
  return h('div', { class: 'grid2' },
    h('div', null,
      kv(t(S.fame), fame ? h('span', null, mine ? Math.round(a.fame) : `${fame.lo}–${fame.hi}`, ' ', bar(a.fame)) : '?'),
      kv(t(S.momentum), deg >= 2 ? bar(a.momentum) : '?'),
      kv(t(S.positioning), h('span', null, t(S.underground), ' ', deg >= 2 ? bar(a.positioning) : '?', ' ', t(S.crossover))),
      kv(t(S.potential), pot ? h('span', null, `${pot.lo}–${pot.hi} `, rangeBar(pot.lo, pot.hi)) : h('span', { class: 'muted' }, t(S.hidden))),
      kv(t(S.fans), deg >= 2 ? `${N(a.fans.casual)} ${t(S.casual)} · ${N(a.fans.active)} ${t(S.active)} · ${N(a.fans.core)} ${t(S.core)}` : '?'),
      mine && !a.playerBand ? kv(t(S.trust), bar(a.trust)) : null,
      deg >= 4 || mine ? kv(`${t(S.morale)} / ${t(S.fatigue)} / ${t(S.stress)}`, h('span', null, bar(st.morale, 100, 'good'), bar(st.fatigue, 100, 'warn'), bar(st.stress, 100, 'bad'))) : null,
      mine ? kv(t(l('Caixa próprio do ato', 'Act\'s own cash')), $(a.cash)) : null,
      deg >= 4 || mine ? kv(t(l('Temperamento × gênero', 'Temperament × genre')), h('span', null, pill(t(affinityLabel(actAffinity(s, a))), actAffinity(s, a) > 0.2 ? 'good' : actAffinity(s, a) < -0.2 ? 'bad' : ''), h('small', { class: 'muted' }, ` ${t(genreFamilyName(a.genre))}`))) : null,
    ),
    h('div', null,
      h('h4', null, t(l('Recordes', 'Records'))),
      chips(stat('chart-up', a.peakChart < 999 ? `#${a.peakChart}` : '—', l('Melhor posição', 'Best position')), stat('star', a.hits, l('Top 10', 'Top 10')), stat('trophy', a.number1s, l('Números 1', 'Number ones')), stat('trophy', a.awards, l('Prêmios', 'Awards')), stat('disc', a.releases.length, l('Lançamentos', 'Releases'))),
      img && deg >= 2 ? h('div', null, h('h4', null, t(l('Reputação', 'Reputation'))), h('ul', { class: 'attr-list' },
        h('li', null, h('span', null, t(l('Artística', 'Artistic'))), bar(img.artistic), h('b', null, Math.round(img.artistic))),
        h('li', null, h('span', null, t(l('Popularidade', 'Popularity'))), bar(img.popularity), h('b', null, Math.round(img.popularity))),
        h('li', null, h('span', null, t(l('Profissionalismo', 'Professionalism'))), bar(img.professionalism), h('b', null, Math.round(img.professionalism))),
        h('li', null, h('span', null, t(l('Imagem pública', 'Public image'))), bar(img.publicImage), h('b', null, Math.round(img.publicImage))))) : null,
      ms.length && deg >= 2 ? h('p', null, t(l('Ponto forte: ', 'Strength: ')), pill(t(GROUP_NAMES[groupScores[0].gr]), 'good'), ' · ', t(l('ponto fraco: ', 'weakness: ')), pill(t(GROUP_NAMES[groupScores[groupScores.length - 1].gr]), 'bad')) : null,
    ),
  );
}

function membersTab(s: GameState, a: Act, ms: Person[]): HTMLElement {
  const former = (rw(s).former[a.id] ?? []).map((f) => ({ f, p: s.persons[f.personId] })).filter((x) => x.p);
  const why = { left: l('saiu', 'left'), died: l('faleceu', 'died'), retired: l('aposentou-se', 'retired'), fired: l('foi demitido', 'was fired') };
  return h('div', null,
    h('div', { class: 'pcard-grid' }, ms.map((p) => personCard(s, p))),
    former.length ? h('div', null, h('h4', null, t(l('Ex-integrantes', 'Former members'))),
      h('ul', { class: 'small' }, former.map(({ f, p }) => h('li', null, h('button', { class: 'link', onclick: () => openPersonPage(p.id) }, p.name), ` — ${t(why[f.reason])} ${t(l('em', 'in'))} ${f.year}`, !p.alive ? ' †' : '')))) : null,
    h('p', { class: 'muted small' }, t(l('Clique num integrante para ver a carta completa com todos os atributos.', 'Click a member for the full card with every attribute.'))),
  );
}

function discoTab(s: GameState, a: Act, mine: boolean): HTMLElement {
  const rels = a.releases.map((id) => s.releases[id]).filter(Boolean).sort((x, y) => y.year - x.year || y.week - x.week);
  if (!rels.length) return h('p', { class: 'muted' }, t(l('Ainda sem lançamentos.', 'No releases yet.')));
  return h('table', { class: 'tbl compact disco' },
    h('thead', null, h('tr', null, h('th', null, ''), h('th', null, t(S.title)), h('th', null, t(l('Tipo', 'Type'))), h('th', null, t(l('Ano', 'Year'))), h('th', null, t(S.peak)), h('th', null, t(S.totalUnits)), h('th', null, t(l('Crítica', 'Reviews'))), mine ? h('th', null, t(S.revenue)) : null)),
    h('tbody', null, rels.map((r) => {
      const rv = avgReview(s, r.id);
      return h('tr', { class: 'click', onclick: () => openRelease(r.id) },
        h('td', null, cover(s, r, 32)), h('td', null, h('b', null, r.title), r.certified ? pill(r.certified, 'gold') : null, r.hist ? pill(t(l('antes da run', 'before the run'))) : null),
        h('td', null, r.type.toUpperCase()), h('td', null, r.year), h('td', null, r.peak < 999 ? `#${r.peak}` : '—'), h('td', null, N(r.totalUnits)),
        h('td', null, rv !== undefined ? rv.toFixed(1) : '—'), mine ? h('td', null, $(r.revenue)) : null);
    })));
}

function songsTab(s: GameState, a: Act, mine: boolean): HTMLElement {
  const songs = a.songs.map((id) => s.songs[id]).filter(Boolean).sort((x, y) => y.q - x.q).slice(0, 30);
  const show = (v: number) => (mine ? Math.round(v) : '~' + Math.round(v / 10) * 10);
  return h('table', { class: 'tbl compact' },
    h('thead', null, h('tr', null, h('th', null, t(S.title)), h('th', null, 'Q'), h('th', null, t(S.melody)), h('th', null, t(S.lyrics)), h('th', null, t(S.performance)), h('th', null, t(S.production)), h('th', null, t(l('Compositores', 'Writers'))), h('th', null, t(l('Lançada em', 'Released on'))))),
    h('tbody', null, songs.map((so) => h('tr', null,
      h('td', null, so.title), h('td', null, h('b', null, show(so.q))), h('td', null, show(so.melody)), h('td', null, show(so.lyrics)),
      h('td', null, so.recorded ? show(so.performance) : '—'), h('td', null, so.recorded ? show(so.production) : '—'),
      h('td', { class: 'small' }, so.writers.map((w) => s.persons[w]?.name.split(' ')[0] ?? '?').join(', ')),
      h('td', null, so.releaseId && s.releases[so.releaseId] ? h('button', { class: 'link', onclick: () => openRelease(so.releaseId!) }, s.releases[so.releaseId].title) : h('span', { class: 'muted' }, t(so.recorded ? l('gravada', 'recorded') : l('escrita', 'written'))))))));
}

function historyTab(s: GameState, a: Act): HTMLElement {
  const items = a.history.slice().reverse().map((mid) => s.memory.find((x) => x.id === mid)).filter(Boolean);
  return h('div', null,
    h('ul', { class: 'memory timeline' }, items.map((m) => h('li', { class: m!.important ? 'important' : '' }, h('span', { class: 'muted' }, `${monthName(m!.month)} ${m!.year} · `), t(m!.text)))),
    items.length ? null : h('p', { class: 'muted' }, t(l('Nenhum fato marcante ainda.', 'No notable events yet.'))),
  );
}

function contractTab(s: GameState, a: Act): HTMLElement {
  const c = s.contracts[a.contractId!];
  if (!c) return h('p', null, '—');
  return h('div', null,
    kv(t(S.model), `${t(CONTRACT_MODELS.find((m) => m.id === c.model)?.name)}${c.party !== 'player' ? ` — ${s.labels[c.party]?.name ?? ''}` : ''}`),
    kv(t(S.royalty), `${Math.round(c.royalty * 100)}%`),
    c.party === 'player' ? kv(t(S.recoup), $(c.recoupBalance)) : null,
    kv(t(S.ends), `${Math.max(0, Math.round((c.endWeek - s.week) / 4.35))} ${t(l('meses', 'months'))}`),
    kv(t(S.releasesOwed), `${c.releasesDone}/${c.releasesOwed}`),
  );
}
