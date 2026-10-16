// R31 · onda 2 (Q) — TELA DE DELEGAÇÃO (estilo Football Manager). Uma tela só, na Sede (Diretoria):
//   1. visão por departamento — empresa grande não pede mais cliques: cada departamento mostra quem cuida, carga da
//      equipe, decisões do mês e SÓ as exceções (RN-16/17/18/34); unidades (sede e filiais) agregadas;
//   2. pedidos de aprovação (modo parcial, acima do limite);
//   3. responsabilidades: quem decide (eu / delegar a alguém qualificado / parcial / regra), com atributos e carga de
//      quem pode responder, diretrizes (escopo, orçamento, tetos, "me pergunte acima de") e o resultado do mês;
//   4. diretriz por artista (agenda delegada, prioridade, atenção, teto, objetivo) e envolvimento por carreira;
//   5. registro de automação: quem agiu, por quê, quanto, resultado — com "desfazer" quando possível.
// A tela só lê o motor; cada mudança passa pelas funções de sim/deleg31.ts (explorar não muda o mundo).

import './deleg31.css';
import { GENRES, genreById, l, type L } from '../../data/world';
import { STAFF_ROLES } from '../../data/rules';
import { t } from '../../i18n/strings';
import {
  DEPT31, MODE31, PRESET31, RESP31, answerAsk31, applyPreset31, asks31, autoLog31, canUndo31, excs31, goalSet31, lockWhy31, qualified31, set31,
  setDir31, setGoal31, setMode31, stat31, staffFor31, undo31, type Dept31, type Dir31, type Goal31, type Log31, type Mode31, type Preset31, type Resp31, type RespDef31,
} from '../../sim/deleg31';
import { agendaCount31, setAgendaMode31 } from '../../sim/sys/deleg31run';
import { qLabel, quality } from '../../sim/sys/deleg16';
import { roleLoads } from '../../sim/sys/capacity14';
import { overCapacity } from '../../sim/sys/pacing8';
import { GOAL18 } from '../../sim/sys/policy18';
import { careerDef, careers } from '../../sim/sys/careers12';
import { INV_NAME, ag17, invOf, setInv, type Inv } from '../../sim/sys/agenda17';
import type { GameState, StaffMember } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerArea } from '../registry';
import { ic } from '../vis';
import { policyRow } from './pacing8';

/** Seções extras de outros sistemas (ex.: reunião de diretoria e crises, act27/p2b27). */
export const DELEG_EXTRA31: ((s: GameState) => HTMLElement | null)[] = [];

const ui: { r: Resp31 | ''; exc: boolean; open: Partial<Record<Dept31, boolean>> } = { r: '', exc: false, open: {} };
const MON = [l('jan', 'Jan'), l('fev', 'Feb'), l('mar', 'Mar'), l('abr', 'Apr'), l('mai', 'May'), l('jun', 'Jun'), l('jul', 'Jul'), l('ago', 'Aug'), l('set', 'Sep'), l('out', 'Oct'), l('nov', 'Nov'), l('dez', 'Dec')];
const monL = (m: number): string => `${t(MON[((m % 12) + 12) % 12])} ${Math.floor(m / 12)}`;
const say = (x: L | null, ok: L): void => { toast(t(x ?? ok), x ? 'bad' : 'good'); rerender(); };
const roleName = (role: string): L => STAFF_ROLES.find((x) => x.id === role)?.name ?? l(role, role);
const toneCls = (x: string): string => (x === 'bad' ? 'bad' : x === 'good' ? 'good' : x === 'ask' ? 'warn' : 'muted');
/** Empresa grande: muitos artistas, filiais ou equipe — a tela abre agregada (só exceções). */
const isBig = (s: GameState): boolean => playerActs(s).length >= 8 || (s.branches?.length ?? 0) > 0 || s.player.staff.length >= 10;

// ---------------------------------------------------------------- peças

function loadOf(s: GameState, st: StaffMember): number | null {
  const r = roleLoads(s).find((x) => x.role === st.role);
  return r ? r.load : null;
}
function staffLabel(s: GameState, st: StaffMember): string {
  const q = quality(s, st), ld = loadOf(s, st);
  return `${st.name} · ${t(roleName(st.role))} · ${t(qLabel(q.q))}${ld !== null ? ` · ${t(l('carga', 'load'))} ${ld}%` : ''}`;
}
function staffChip(s: GameState, st: StaffMember): HTMLElement {
  const q = quality(s, st), ld = loadOf(s, st);
  return h('span', { class: 'dg31-staff', title: q.why.map((x) => t(x)).join(' · ') },
    h('b', null, st.name), ' ', pill(t(qLabel(q.q)), q.q >= 0.6 ? 'good' : q.q < 0.4 ? 'bad' : ''),
    ld !== null ? h('span', { class: 'dg31-load' }, h('i', { style: `width:${Math.min(100, ld)}%`, class: ld > 100 ? 'over' : '' })) : null,
    ld !== null ? h('small', { class: 'muted' }, ` ${ld}%`) : null);
}

function num(v: number, set: (x: number) => void, o: { step?: number; min?: number; max?: number; w?: number; label: string }): HTMLElement {
  return h('input', { type: 'number', class: 'dg31-num', value: String(v), step: String(o.step ?? 1), min: String(o.min ?? 0), max: o.max !== undefined ? String(o.max) : undefined, 'aria-label': o.label, title: o.label, style: o.w ? `width:${o.w}em` : undefined,
    onchange: (e: Event) => { set(Math.max(o.min ?? 0, Math.min(o.max ?? 1e12, Number((e.target as HTMLInputElement).value) || 0))); rerender(); } });
}

const DIR_L: Record<keyof Dir31, L> = {
  cap: l('teto por decisão (US$)', 'cap per decision (US$)'), ask: l('me pergunte acima de (US$)', 'ask me above (US$)'), budget: l('orçamento/mês (US$)', 'budget/month (US$)'),
  genres: l('só os gêneros', 'genres only'), per: l('decisões/mês', 'decisions/month'), minQ: l('nota mínima para lançar', 'minimum grade to release'), fmt: l('formato', 'format'),
  frac: l('fração', 'share'), months: l('prazo (meses)', 'term (months)'), minTrust: l('confiança mínima', 'minimum trust'), reserve: l('reserva (meses de custo fixo)', 'reserve (months of fixed costs)'),
  rest: l('descanso a partir de (estresse)', 'rest from (stress)'), maxShows: l('máx. shows por trimestre', 'max shows per quarter'), sponsor: l('aceitar patrocínios', 'accept sponsorships'), head: l('fechar headliner', 'book a headliner'),
};
const FRAC_L: Partial<Record<Resp31, L>> = { renew: l('bônus máx. (× adiantamento esperado)', 'max bonus (× expected advance)'), fest: l('teto do adiantamento (fração do caixa)', 'advance cap (share of cash)') };

function dirField(s: GameState, def: RespDef31, k: keyof Dir31, d: Dir31): HTMLElement {
  const lab = t((k === 'frac' && FRAC_L[def.id]) || DIR_L[k]);
  const put = (patch: Dir31) => setDir31(s, def.id, patch);
  let el: HTMLElement;
  switch (k) {
    case 'genres': {
      const cur = d.genres ?? [];
      const open = GENRES.filter((g) => g.born <= s.year && !cur.includes(g.id));
      el = h('span', { class: 'dg31-genres' },
        cur.length ? cur.map((g) => h('button', { class: 'pill dg31-chip', title: t(l('Tirar', 'Remove')), onclick: () => { put({ genres: cur.filter((x) => x !== g) }); rerender(); } }, `${t(genreById[g]?.name ?? l(g, g))} ×`)) : h('small', { class: 'muted' }, t(l('todos', 'all'))),
        select<string>('', [{ value: '', label: t(l('+ gênero', '+ genre')) }, ...open.map((g) => ({ value: g.id, label: t(g.name) }))], (v) => { if (v) { put({ genres: [...cur, v] }); rerender(); } }, { 'aria-label': lab }));
      break;
    }
    case 'fmt':
      el = select<string>(d.fmt ?? 'auto', [{ value: 'auto', label: t(l('o que estiver pronto', 'whatever is ready')) }, { value: 'single', label: 'single' }, { value: 'lp', label: 'LP' }], (v) => { put({ fmt: v as Dir31['fmt'] }); rerender(); }, { 'aria-label': lab });
      break;
    case 'per':
      el = select<number>(d.per ?? 1, [1, 2, 3].map((n) => ({ value: n, label: String(n) })), (v) => { put({ per: Number(v) }); rerender(); }, { 'aria-label': lab });
      break;
    case 'sponsor': case 'head':
      el = h('input', { type: 'checkbox', checked: !!d[k], 'aria-label': lab, onchange: () => { put({ [k]: !d[k] }); rerender(); } });
      break;
    case 'frac': el = num(d.frac ?? 0, (x) => put({ frac: x }), { step: 0.05, max: 2, w: 5, label: lab }); break;
    case 'minQ': case 'minTrust': case 'rest': el = num(Number(d[k] ?? 0), (x) => put({ [k]: x }), { step: 5, max: 100, w: 4.5, label: lab }); break;
    case 'months': el = num(d.months ?? 24, (x) => put({ months: x }), { step: 6, min: 6, max: 60, w: 4.5, label: lab }); break;
    case 'reserve': el = num(d.reserve ?? 0, (x) => put({ reserve: x }), { step: 1, max: 24, w: 4, label: lab }); break;
    case 'maxShows': el = num(d.maxShows ?? 0, (x) => put({ maxShows: x }), { step: 1, max: 60, w: 4, label: lab }); break;
    default: el = num(Number(d[k] ?? 0), (x) => put({ [k]: x }), { step: k === 'budget' ? 500 : 1000, w: 6.5, label: lab });
  }
  return h('label', { class: 'dg31-dir' }, h('small', null, lab), el);
}

function modeSel(s: GameState, def: RespDef31, m: Mode31): HTMLElement {
  if (def.locked) return h('span', { class: 'dg31-locked', title: t(def.locked) }, ic('lock'), ' ', t(MODE31.me.name));
  const opts = def.modes.map((x) => { const why = lockWhy31(s, def.id, x); return { value: x, label: `${t(MODE31[x].name)}${why ? ' 🔒' : ''}`, disabled: !!why }; });
  const reasons = def.modes.map((x) => lockWhy31(s, def.id, x)).filter((x): x is L => !!x).map((x) => t(x));
  return select<Mode31>(m, opts, (v) => {
    const r = def.id === 'agenda' ? setAgendaMode31(s, v) : setMode31(s, def.id, v);
    say(r, fmtL0(l('{r}: {m}.', '{r}: {m}.'), { r: def.name, m: MODE31[v].name }));
  }, { 'aria-label': t(l('Quem decide', 'Who decides')), title: reasons.length ? reasons.join(' · ') : t(MODE31[m].desc) });
}
const fmtL0 = (x: L, p: Record<string, L | string | number>): L => ({ pt: x.pt.replace(/\{(\w+)\}/g, (_, k) => { const v = p[k]; return typeof v === 'object' ? v.pt : String(v); }), en: x.en.replace(/\{(\w+)\}/g, (_, k) => { const v = p[k]; return typeof v === 'object' ? v.en : String(v); }) });

function whoCell(s: GameState, def: RespDef31, m: Mode31): HTMLElement | null {
  if (m === 'rule') return h('span', { class: 'muted small' }, ic('scroll'), ' ', t(l('regra fixa', 'fixed rule')));
  if (m === 'me') return h('span', { class: 'muted small' }, t(l('você', 'you')));
  const q = qualified31(s, def.id), cur = staffFor31(s, def.id);
  if (!q.length) return null;
  if (def.id === 'tour' || def.id === 'marketing') return h('span', { class: 'dg31-who' }, q.map((st) => staffChip(s, st)), h('small', { class: 'muted' }, ' ', t(l('(cada um pelas ordens dele)', '(each by their orders)'))));
  return h('span', { class: 'dg31-who' },
    q.length > 1 ? select<string>(cur?.id ?? '', q.map((st) => ({ value: st.id, label: staffLabel(s, st) })), (v) => say(setMode31(s, def.id, m, v), l('Responsável trocado.', 'Owner changed.')), { 'aria-label': t(l('Quem responde', 'Who answers')) }) : null,
    cur ? staffChip(s, cur) : null);
}

function respRow(s: GameState, def: RespDef31): HTMLElement {
  const cur = set31(s, def.id), st = stat31(s, def.id);
  const showDirs = !def.locked && def.dirs.length && (cur.m !== 'me' || def.id === 'finance' || def.id === 'rest');
  const missing = def.roles.length && !qualified31(s, def.id).length && def.modes.some((x) => x === 'staff' || x === 'partial')
    ? lockWhy31(s, def.id, 'staff') : null;
  const ag = def.id === 'agenda' ? agendaCount31(s) : null;
  return h('div', { class: `dg31-row ${cur.m}` },
    h('div', { class: 'dg31-name' }, h('b', null, t(def.name)), h('small', { class: 'muted' }, t(def.desc)),
      missing ? h('small', { class: 'warn' }, ic('lock'), ' ', t(missing)) : null,
      def.locked ? h('small', { class: 'muted' }, t(def.locked)) : null,
      ag ? h('small', { class: 'muted' }, t(l('{n} de {m} agenda(s) montadas pela equipe', '{n} of {m} agenda(s) planned by the team'), { n: ag.team, m: ag.all })) : null),
    h('div', { class: 'dg31-mode' }, modeSel(s, def, cur.m), whoCell(s, def, cur.m)),
    h('div', { class: 'dg31-dirs' }, showDirs ? def.dirs.map((k) => (k === 'ask' && cur.m !== 'partial' ? null : dirField(s, def, k, cur.d))) : null),
    h('div', { class: 'dg31-stat' },
      h('span', null, t(l('{d} decisão(ões)', '{d} decision(s)'), { d: st.done }), st.exc ? h('b', { class: 'warn' }, ' · ', t(l('{e} exceção(ões)', '{e} exception(s)'), { e: st.exc })) : null, st.spent ? h('span', { class: 'muted' }, ` · ${$(st.spent)}`) : null),
      st.last ? h('small', { class: `${toneCls(st.last.tone)} dg31-last` }, t(st.last.t)) : null));
}

// ---------------------------------------------------------------- visão por departamento (RN-34)

function deptCard(s: GameState, dept: Dept31): HTMLElement {
  const rs = RESP31.filter((x) => x.dept === dept);
  const ids = rs.map((x) => x.id);
  const modes = rs.map((x) => set31(s, x.id).m);
  const roles = [...new Set(rs.flatMap((x) => x.roles))];
  const staff = s.player.staff.filter((x) => roles.includes(x.role));
  const done = rs.reduce((n, x) => n + stat31(s, x.id).done, 0);
  const exc = excs31(s, s.week - 5).filter((e) => ids.includes(e.r));
  const asks = asks31(s).filter((a) => ids.includes(a.r));
  const n = (m: Mode31) => modes.filter((x) => x === m).length;
  return h('div', { class: `dg31-dept ${exc.length || asks.length ? 'hot' : ''}` },
    h('h4', null, ic(DEPT31[dept].icon), ' ', t(DEPT31[dept].name)),
    h('p', { class: 'small' }, [n('staff') + n('partial') ? t(l('{n} com a equipe', '{n} with staff'), { n: n('staff') + n('partial') }) : '', n('rule') ? t(l('{n} pela regra', '{n} by rule'), { n: n('rule') }) : '', n('me') ? t(l('{n} com você', '{n} with you'), { n: n('me') }) : ''].filter(Boolean).join(' · ')),
    staff.length ? h('div', { class: 'dg31-staffs' }, staff.slice(0, 4).map((st) => staffChip(s, st)), staff.length > 4 ? h('small', { class: 'muted' }, ` +${staff.length - 4}`) : null) : h('p', { class: 'small muted' }, t(l('ninguém da equipe neste departamento', 'nobody on staff in this department'))),
    h('p', { class: 'small' }, t(l('Este mês: {d} decisão(ões) da equipe/regra', 'This month: {d} staff/rule decision(s)'), { d: done })),
    asks.length ? h('p', { class: 'small warn' }, ic('handshake'), ' ', t(l('{n} pedido(s) de aprovação', '{n} approval request(s)'), { n: asks.length })) : null,
    exc.length ? h('ul', { class: 'small dg31-exc' }, exc.slice(0, 3).map((e) => h('li', { class: 'warn' }, t(e.t)))) : h('p', { class: 'small good' }, t(l('Sem exceções.', 'No exceptions.'))));
}

function unitsView(s: GameState): HTMLElement | null {
  const brs = s.branches ?? [];
  if (!brs.length) return null;
  const acts = playerActs(s);
  const units = [{ id: '', name: t(l('Sede', 'HQ')) }, ...brs.map((b) => ({ id: b.id, name: b.name }))];
  const recent = excs31(s, s.week - 5);
  const mine = autoLog31(s, { since: s.week - 5 });
  return section(t(l('Unidades (sede e filiais)', 'Units (HQ and branches)')),
    h('div', { class: 'dg31-units' }, units.map((u) => {
      const ids = acts.filter((a) => (s.branchOf[a] ?? '') === u.id);
      const ex = recent.filter((e) => e.act && ids.includes(e.act));
      const dn = mine.filter((e) => e.act && ids.includes(e.act) && e.tone !== 'ask' && e.who !== 'player').length;
      return h('div', { class: `dg31-unit ${ex.length ? 'hot' : ''}` }, h('b', null, u.name), h('small', null, t(l('{a} artista(s) · {d} decisão(ões) em 5 semanas', '{a} act(s) · {d} decision(s) in 5 weeks'), { a: ids.length, d: dn })),
        ex.length ? h('small', { class: 'warn' }, t(ex[0].t)) : h('small', { class: 'good' }, t(l('sem exceções', 'no exceptions'))));
    })));
}

// ---------------------------------------------------------------- pedidos, artistas, carreiras, registro

function asksView(s: GameState): HTMLElement | null {
  const xs = asks31(s);
  if (!xs.length) return null;
  return section(t(l('Pedidos de aprovação', 'Approval requests')),
    h('ul', { class: 'dg31-asks' }, xs.map((a) => h('li', null, ic('handshake'), ' ', t(a.t), ' ', h('small', { class: 'muted' }, t(l('(vale até a semana {w})', '(valid until week {w})'), { w: a.until })), ' ',
      h('button', { class: 'btn small primary', onclick: () => say(answerAsk31(s, a.id, true), l('Aprovado.', 'Approved.')) }, t(l('Aprovar', 'Approve'))), ' ',
      h('button', { class: 'btn small ghost', onclick: () => say(answerAsk31(s, a.id, false), l('Recusado.', 'Declined.')) }, t(l('Recusar', 'Decline')))))));
}

function actsView(s: GameState, big: boolean): HTMLElement | null {
  const ids = playerActs(s).filter((id) => s.acts[id] && !s.acts[id].playerBand);
  if (!ids.length) return null;
  const over = overCapacity(s);
  const goal = (id: string) => h('td', null, select<string>(goalSet31(s, id) ?? '', [{ value: '', label: t(l('sem objetivo', 'no goal')) }, ...(Object.keys(GOAL18) as Goal31[]).map((g) => ({ value: g, label: t(GOAL18[g].name) }))],
    (v) => { setGoal31(s, id, (v || undefined) as Goal31 | undefined); rerender(); }, { title: t(GOAL18[goalSet31(s, id) ?? 'grow'].desc), 'aria-label': t(l('Objetivo', 'Goal')) }));
  const table = h('table', { class: 'table small team-table' },
    h('thead', null, h('tr', null, ...[l('Carreira', 'Career'), l('Agenda', 'Agenda'), l('Prioridade', 'Priority'), l('Atenção', 'Attention'), l('Teto/mês', 'Cap/mo'), l('Objetivo', 'Goal')].map((x) => h('th', null, t(x))))),
    h('tbody', null, ids.map((id) => policyRow(s, id, over, goal(id)))));
  const body = [h('p', { class: 'muted small' }, t(l('A diretriz de cada artista vale para a agenda montada pela equipe, os lançamentos automáticos e as ordens de turnê/divulgação (o objetivo trava o que não combina).', 'Each act\'s directive applies to the team-planned agenda, automatic releases and tour/promotion orders (the goal blocks what does not fit).'))), table];
  return big ? section(t(l('Por artista', 'Per act')), h('details', null, h('summary', null, t(l('{n} artista(s) — abrir a diretriz de cada um', '{n} act(s) — open each one\'s directive'), { n: ids.length })), ...body)) : section(t(l('Por artista', 'Per act')), ...body);
}

function careersView(s: GameState): HTMLElement | null {
  const act = (careers(s).active ?? []).filter((id) => careerDef(id));
  if (act.length < 2) return null;
  const a = ag17(s);
  return section(t(l('Carreiras (envolvimento)', 'Careers (involvement)')),
    h('p', { class: 'muted small' }, t(l('Delegar uma carreira inteira exige um diretor para ela (contratado na Agenda › Contratar).', 'Delegating a whole career requires a director for it (hired in Schedule › Hire).'))),
    h('ul', { class: 'dg31-careers' }, act.map((id) => {
      const hd = a.heads[id];
      return h('li', null, h('b', null, t(careerDef(id)!.name)), ' ',
        select<Inv>(invOf(s, id), (Object.keys(INV_NAME) as Inv[]).map((v) => ({ value: v, label: t(INV_NAME[v]), disabled: v === 'deleg' && !hd })), (v) => { const r = setInv(s, id, v); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); }, { 'aria-label': t(l('Envolvimento', 'Involvement')) }), ' ',
        hd ? h('small', null, t(l('diretor(a): {n} (habilidade {k})', 'director: {n} (skill {k})'), { n: hd.name, k: hd.skill })) : h('small', { class: 'muted' }, t(l('sem diretor', 'no director'))));
    })));
}

function logItem(s: GameState, e: Log31): HTMLElement {
  const undoWhy = e.undo ? canUndo31(s, e) : l('', '');
  return h('li', { class: `dg31-log ${toneCls(e.tone)}${e.undone ? ' undone' : ''}` },
    h('span', { class: 'muted' }, `${monL(e.m)} · `), h('b', null, e.n), ' · ', h('span', { class: 'dg31-tag' }, t(RESP31.find((x) => x.id === e.r)?.name ?? l(e.r, e.r))), ' — ', t(e.t),
    e.act && s.acts[e.act] ? h('span', null, ' ', actLink(s, e.act)) : null,
    e.amt ? h('span', { class: e.amt < 0 ? 'bad' : 'good' }, ` ${e.amt < 0 ? '−' : '+'}${$(Math.abs(e.amt))}`) : null,
    e.why ? h('div', { class: 'muted why' }, '↳ ', t(l('Por quê: ', 'Why: ')), t(e.why)) : null,
    e.undo && !e.undone ? h('button', { class: 'btn small ghost', disabled: !!undoWhy, title: undoWhy ? t(undoWhy) : t(l('Desfaz pela regra da ação manual', 'Undoes by the manual action\'s rule')), onclick: () => say(undo31(s, e.id), l('Desfeito.', 'Undone.')) }, '↶ ', t(l('Desfazer', 'Undo'))) : null,
    e.undone ? pill(t(l('desfeito', 'undone')), 'muted') : null);
}
function logView(s: GameState): HTMLElement {
  const xs = autoLog31(s, { r: ui.r || undefined, tone: ui.exc ? 'ask' : undefined, n: 60 });
  return section(t(l('Registro de automação', 'Automation log')),
    h('div', { class: 'row wrap' },
      select<string>(ui.r, [{ value: '', label: t(l('Todas as responsabilidades', 'All responsibilities')) }, ...RESP31.filter((x) => !x.locked).map((x) => ({ value: x.id, label: t(x.name) }))], (v) => { ui.r = v as Resp31 | ''; rerender(); }, { 'aria-label': t(l('Filtrar', 'Filter')) }),
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: ui.exc, onchange: () => { ui.exc = !ui.exc; rerender(); } }), ' ', t(l('só exceções', 'exceptions only')))),
    xs.length ? h('ul', { class: 'dg31-logs small' }, xs.map((e) => logItem(s, e))) : h('p', { class: 'muted small' }, t(l('Nada ainda: o que a equipe e as regras decidirem aparece aqui, com o motivo.', 'Nothing yet: whatever staff and rules decide shows up here, with the reason.'))));
}

// ---------------------------------------------------------------- tela

export function deleg31View(s: GameState): HTMLElement {
  const big = isBig(s);
  const depts = Object.keys(DEPT31) as Dept31[];
  return h('div', { class: 'panel dg31' },
    h('div', { class: 'dg31-head' },
      h('h2', null, ic('handshake'), ' ', t(l('Delegação: quem decide o quê', 'Delegation: who decides what'))),
      h('p', { class: 'muted' }, t(big
        ? l('Empresa grande: cada departamento mostra só o que precisa de você. A equipe usa as mesmas regras de custo, agenda e elegibilidade das ações manuais; a competência de quem decide pesa.', 'Large company: each department shows only what needs you. Staff use the same cost, schedule and eligibility rules as manual actions; the decider\'s competence matters.')
        : l('Para cada responsabilidade, escolha quem decide e as diretrizes. A equipe usa as mesmas regras de custo, agenda e elegibilidade das ações manuais; a competência de quem decide pesa.', 'For each responsibility, choose who decides and the directives. Staff use the same cost, schedule and eligibility rules as manual actions; the decider\'s competence matters.'))),
      h('div', { class: 'row wrap dg31-presets' }, h('small', { class: 'muted' }, t(l('Conjuntos prontos:', 'Presets:'))), (Object.keys(PRESET31) as Preset31[]).map((p) => h('button', { class: 'btn small', title: t(PRESET31[p].desc), onclick: () => { toast(t(applyPreset31(s, p)), 'good'); rerender(); } }, t(PRESET31[p].name))))),
    h('div', { class: 'dg31-depts' }, depts.map((d) => deptCard(s, d))),
    unitsView(s),
    asksView(s),
    section(t(l('Responsabilidades', 'Responsibilities')),
      depts.map((d) => {
        const rs = RESP31.filter((x) => x.dept === d);
        const hot = excs31(s, s.week - 5).some((e) => rs.some((x) => x.id === e.r)) || asks31(s).some((a) => rs.some((x) => x.id === a.r));
        const open = ui.open[d] ?? (!big || hot);
        return h('details', { class: 'dg31-group', open, ontoggle: (e: Event) => { ui.open[d] = (e.target as HTMLDetailsElement).open; } },
          h('summary', null, ic(DEPT31[d].icon), ' ', h('b', null, t(DEPT31[d].name)), hot ? h('span', { class: 'warn' }, ' ● ', t(l('exceções', 'exceptions'))) : null),
          rs.map((def) => respRow(s, def)));
      })),
    actsView(s, big),
    careersView(s),
    ...DELEG_EXTRA31.map((f) => f(s)),
    logView(s));
}

registerArea({ id: 'deleg31', label: l('Delegação', 'Delegation'), icon: 'handshake', key: '',
  badge: (s) => (asks31(s).length + excs31(s, s.week - 5).length) || undefined,
  render: (s) => deleg31View(s) });

