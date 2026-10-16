// Rodada 27 (ACH) — telas de conquistas: grade só com as desbloqueadas (ícones em pixel art), contador "X de N",
// "??? × k" por categoria (secretas só no total). Na tela inicial: conquistas do perfil antes de carregar um save,
// com troca de perfil. No jogo (Metas → Conquistas): desta partida + do perfil. Modelo puro em ach27model.ts.

import { l, type L } from '../data/world';
import { locale, t } from '../i18n/strings';
import { fmtL } from '../sim/util';
import type { GameState } from '../sim/types';
import { h, select } from './dom';
import { AFTER_ADVANCE } from './registry';
import { ic } from './vis';
import { card27, emptyState27, statusChip27 } from './ps/ui27';
import { MARKS27, profMedals27, profView27, runView27, syncRunAch27, type AchItem27, type AchView27 } from './ach27model';
import { curProfile17, profiles17, switchProfile17 } from './saves17';
import './ach27.css';

const T = (x: L) => t(x);
const MEDAL27: Record<string, [string, L]> = { gold: ['🥇', l('ouro', 'gold')], silver: ['🥈', l('prata', 'silver')], bronze: ['🥉', l('bronze', 'bronze')] };
const day27 = (ts: number) => { try { return new Date(ts).toLocaleDateString(locale(), { dateStyle: 'short' } as Intl.DateTimeFormatOptions); } catch { return ''; } };

/** "X de N desbloqueadas" (+ aviso de secretas, sem dizer quais). */
export function achCounter27(v: AchView27): HTMLElement {
  return h('p', { class: 'ach27-count', 'data-got': String(v.got), 'data-total': String(v.total) },
    h('b', null, T(fmtL(l('{x} de {n} desbloqueadas', '{x} of {n} unlocked'), { x: v.got, n: v.total }))),
    v.secretLeft ? h('small', { class: 'muted' }, ' · ', T(l('algumas são secretas', 'some are secret'))) : null);
}

function item27(it: AchItem27, o: { fresh?: Set<string>; showRun?: boolean }): HTMLElement {
  const meta: string[] = [];
  if (it.gy) meta.push(T(fmtL(l('ano {y} no jogo', 'game year {y}'), { y: it.gy })));
  if (o.showRun && it.run) meta.push(`${it.run.co} (${it.run.y0})`);
  if (it.at) meta.push(day27(it.at));
  if (it.runs && it.runs > 1) meta.push(T(fmtL(l('{n} partidas', '{n} runs'), { n: it.runs })));
  return h('li', { class: `ach27-it ${it.secret ? 'secret' : ''} ${o.fresh?.has(it.id) ? 'fresh' : ''}`, 'data-ach': it.id, title: o.showRun && it.run ? `${it.run.co} · ${it.run.y0} · seed ${it.run.seed}` : undefined },
    h('span', { class: 'ach27-ic', 'aria-hidden': 'true' }, ic(it.icon, 2)),
    h('span', { class: 'ach27-b' },
      h('b', null, T(it.name), it.secret ? h('span', { class: 'ach27-star', title: T(l('Secreta', 'Secret')) }, ' ★') : null, o.fresh?.has(it.id) ? h('span', { class: 'ach27-new' }, ' ', T(l('nova!', 'new!'))) : null),
      h('small', null, T(it.desc)),
      meta.length ? h('small', { class: 'ach27-meta' }, meta.join(' · ')) : null));
}

/** Grade por categoria: só desbloqueadas; bloqueadas comuns viram "??? × k". */
export function achGrid27(v: AchView27, o: { fresh?: Set<string>; showRun?: boolean; empty?: L } = {}): HTMLElement {
  if (!v.got) {
    return h('div', { class: 'ach27' }, achCounter27(v), emptyState27({ icon: 'trophy', title: o.empty ?? l('Nenhuma conquista ainda.', 'No achievements yet.'), why: l('As conquistas ficam escondidas até você destravá-las jogando.', 'Achievements stay hidden until you unlock them by playing.') }));
  }
  const lockedChip = (n: number) => statusChip27(`??? × ${n}`, 'neutral', T(l('Bloqueadas: descubra jogando.', 'Locked: find out by playing.')));
  const open = v.cats.filter((c) => c.items.length), shut = v.cats.filter((c) => !c.items.length && c.locked);
  return h('div', { class: 'ach27' }, achCounter27(v),
    ...open.map((c) => h('section', { class: 'ach27-cat', 'data-cat': c.cat },
      h('h4', null, T(c.label), ' ', h('small', { class: 'muted' }, `${c.items.length}`), c.locked ? h('span', { class: 'ach27-locked' }, lockedChip(c.locked)) : null),
      h('ul', { class: 'ach27-grid' }, ...c.items.map((it) => item27(it, o))))),
    // categorias sem nada desbloqueado: uma linha só, com a contagem (sem nomes)
    shut.length ? h('section', { class: 'ach27-cat ach27-shut' }, h('h4', null, T(l('Ainda bloqueadas', 'Still locked'))),
      h('p', { class: 'ach27-shut-row' }, ...shut.map((c) => h('span', { class: 'ach27-shut-it', 'data-cat': c.cat }, T(c.label), ' ', lockedChip(c.locked))))) : null);
}

/** Medalhas de cenário do perfil. */
function medals27(pid: string): HTMLElement | null {
  const ms = profMedals27(pid);
  if (!ms.length) return null;
  return h('div', { class: 'ach27-medals' }, h('h4', null, T(l('Medalhas de cenário', 'Scenario medals'))),
    h('ul', { class: 'ach27-grid' }, ...ms.map((m) => h('li', { class: 'ach27-it', 'data-medal': m.id },
      h('span', { class: 'ach27-ic ach27-medal', 'aria-hidden': 'true' }, MEDAL27[m.rec.m]?.[0] ?? '🏅'),
      h('span', { class: 'ach27-b' }, h('b', null, T(m.name)), h('small', null, T(MEDAL27[m.rec.m]?.[1] ?? l('medalha', 'medal'))),
        h('small', { class: 'ach27-meta' }, [`${m.rec.run.co} (${m.rec.run.y0})`, day27(m.rec.at)].join(' · ')))))));
}

/** Marcos entre partidas (ux19: cadeias, caminhos, medalhas de partida) — só os conquistados. */
function marks27(pid: string): HTMLElement | null {
  let ms: { k: string; name: L; y: number }[] = [];
  try { ms = MARKS27.f?.(pid) ?? []; } catch { ms = []; }
  if (!ms.length) return null;
  return h('div', { class: 'ach27-medals' }, h('h4', null, T(l('Marcos entre partidas', 'Cross-run milestones')), ' ', h('small', { class: 'muted' }, String(ms.length))),
    h('ul', { class: 'ach27-grid' }, ...ms.map((m) => h('li', { class: 'ach27-it', 'data-mark': m.k },
      h('span', { class: 'ach27-ic', 'aria-hidden': 'true' }, ic(m.k.startsWith('medal') ? 'trophy' : m.k.startsWith('chain') ? 'star' : m.k.startsWith('path') ? 'flag' : 'calendar', 2)),
      h('span', { class: 'ach27-b' }, h('b', null, T(m.name)), h('small', { class: 'ach27-meta' }, T(fmtL(l('ano {y} no jogo', 'game year {y}'), { y: m.y }))))))));
}

/** Painel da tela inicial: conquistas do perfil atual, antes de carregar save; troca de perfil no topo. */
export function homeAch27(onSwitch: () => void): HTMLElement {
  const cur = curProfile17();
  const v = profView27(cur.id);
  const ps = profiles17();
  return h('div', { class: 'h27-panel h27-panel-wide ach27-home', id: 'h27-ach' },
    h('div', { class: 'ach27-head' },
      h('h2', { tabindex: '-1' }, '🏆 ', T(fmtL(l('Conquistas de {p}', '{p}\'s achievements'), { p: cur.name }))),
      ps.length > 1 ? h('label', { class: 'ach27-switch' }, h('span', { class: 'small muted' }, T(l('Perfil', 'Profile')), ' '),
        select(cur.id, ps.map((p) => ({ value: p.id, label: `${p.name}${p.pin ? ' 🔒' : ''}` })), (id) => { void switchProfile17(id).then(() => onSwitch()); }, { 'aria-label': T(l('Ver conquistas do perfil', 'View profile achievements')) })) : null),
    h('p', { class: 'muted small' }, T(l('Ficam no perfil, de todas as partidas — apagar um save não apaga conquistas. Bloqueadas ficam escondidas.', 'Kept in the profile, from every run — deleting a save keeps them. Locked ones stay hidden.'))),
    achGrid27(v, { showRun: true, empty: l('Este perfil ainda não tem conquistas.', 'This profile has no achievements yet.') }),
    medals27(cur.id), marks27(cur.id));
}
/** Selo pequeno "🏆 X/N" do perfil (tela inicial). */
export function achBadge27(): string {
  const v = profView27();
  return `🏆 ${v.got}/${v.total}`;
}

/** Aba Metas → Conquistas: desta partida e do perfil (só desbloqueadas). */
export function gameAch27(s: GameState, fresh: Set<string>): HTMLElement {
  try { syncRunAch27(s); } catch { /* sem armazenamento */ }
  const run = runView27(s), prof = profView27(), cur = curProfile17();
  return h('div', { class: 'ach27-game' },
    card27({ title: l('Nesta partida', 'This run'), icon: 'trophy' }, achGrid27(run, { fresh, empty: l('Nenhuma conquista nesta partida ainda.', 'No achievements in this run yet.') })),
    card27({ title: fmtL(l('Perfil {p} — todas as partidas', 'Profile {p} — every run'), { p: cur.name }), icon: 'star' }, achGrid27(prof, { showRun: true }), medals27(cur.id), marks27(cur.id)));
}

// grava no perfil logo depois de cada avanço (só leitura do estado; cache evita regravar à toa)
AFTER_ADVANCE.push((s) => { try { syncRunAch27(s); } catch (e) { console.warn('ach27', e); } });
