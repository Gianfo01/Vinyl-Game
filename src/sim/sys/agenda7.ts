// Agenda do mês evoluída (rodada 7): calendário de 4 semanas, combinações entre ações (ensaiar antes dos
// shows, compor antes de gravar, descansar depois da estrada…), sinergia com a semana de lançamento,
// semana cheia que cansa, e modelos de agenda que você salva e aplica a qualquer artista.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { runAgendaSlot, setAgendaHooks, slotWeek } from '../agenda';
import { registerExt4, registerSimHook } from '../ext4';
import { growPerson } from '../people';
import type { Act, AgendaSlot, GameState } from '../types';
import { fmtL, notify } from '../util';

export interface ComboDef { id: string; before: string; after: string; name: L; desc: L; apply: (s: GameState, act: Act) => void }

const mood = (s: GameState, act: Act, k: 'fatigue' | 'stress' | 'morale' | 'inspiration', v: number) => {
  for (const id of act.members) { const p = s.persons[id]; if (p?.alive) p[k] = clamp(p[k] + v, 0, 100); }
};

export const COMBOS: ComboDef[] = [
  { id: 'tight', before: 'rehearse', after: 'gigs', name: l('Banda afiada', 'Tight band'), desc: l('Ensaiar antes dos shows: palco melhor e mais fãs.', 'Rehearse before the gigs: better stage, more fans.'), apply: (s, a) => { a.rehearsed = clamp(a.rehearsed + 4, 0, 15); a.fans.active += Math.round(20 + a.fame * 2); } },
  { id: 'notebook', before: 'compose', after: 'record', name: l('Do caderno ao estúdio', 'From notebook to studio'), desc: l('Compor antes de gravar: a inspiração chega quente ao estúdio.', 'Write before recording: inspiration arrives hot at the studio.'), apply: (s, a) => mood(s, a, 'inspiration', 12) },
  { id: 'workshop', before: 'workshop', after: 'compose', name: l('Oficina inspirada', 'Inspired workshop'), desc: l('Oficina antes de compor: músicas melhores.', 'Workshop before writing: better songs.'), apply: (s, a) => mood(s, a, 'inspiration', 10) },
  { id: 'chops', before: 'train', after: 'record', name: l('Técnica em dia', 'Chops in shape'), desc: l('Treinar antes de gravar: interpretação melhor.', 'Train before recording: better performance.'), apply: (s, a) => { for (const id of a.members) { const p = s.persons[id]; if (p?.alive) { growPerson(p, 'instr', 0.8); growPerson(p, 'voice', 0.8); } } } },
  { id: 'deserved', before: 'gigs', after: 'rest', name: l('Descanso merecido', 'Well-earned rest'), desc: l('Descansar depois da estrada recupera o dobro.', 'Resting after the road recovers twice as much.'), apply: (s, a) => { mood(s, a, 'fatigue', -12); mood(s, a, 'stress', -8); } },
  { id: 'buzz', before: 'interview', after: 'gigs', name: l('Divulgação antes do show', 'Buzz before the show'), desc: l('Entrevista antes dos shows: casas mais cheias e momento.', 'Interview before gigs: fuller venues and momentum.'), apply: (_s, a) => { a.momentum = clamp(a.momentum + 4, 0, 100); a.fans.casual += Math.round(200 + a.fame * 20); } },
  { id: 'contacts', before: 'networking', after: 'opening', name: l('Contatos certos', 'The right contacts'), desc: l('Networking antes de abrir shows: a abertura certa.', 'Networking before opening slots: the right support slot.'), apply: (_s, a) => { a.fame = clamp(a.fame + 0.6, 0, 100); } },
  { id: 'retreat', before: 'residency_art', after: 'compose', name: l('Retiro criativo', 'Creative retreat'), desc: l('Residência antes de compor: originalidade.', 'Residency before writing: originality.'), apply: (s, a) => mood(s, a, 'inspiration', 14) },
];

export interface Ag7State {
  weekNo: number;
  queue: { actId: string; slot: AgendaSlot; dim: number; week: number }[];
  done: Record<string, { action: string; week: number }[]>;
  sessions: number;
  templates: { id: string; name: string; slots: AgendaSlot[] }[];
  combos: { week: number; actId: string; combo: string }[];
}

declare module '../ext4' { interface Ext4 { ag7: Ag7State } }
registerExt4('ag7', () => ({ weekNo: 1, queue: [], done: {}, sessions: 0, templates: [], combos: [] }));
export const ag7 = (s: GameState): Ag7State => (s as unknown as { x4: { ag7: Ag7State } }).x4.ag7;

/** Combinações que esta agenda ativa (para a interface mostrar ✦). */
export function plannedCombos(slots: AgendaSlot[]): { combo: ComboDef; after: number }[] {
  const out: { combo: ComboDef; after: number }[] = [];
  slots.forEach((x, i) => {
    const w = slotWeek(x, i);
    for (const c of COMBOS) {
      if (c.after !== x.action) continue;
      if (slots.some((y, j) => j !== i && y.action === c.before && slotWeek(y, j) <= w && (slotWeek(y, j) < w || j < i))) out.push({ combo: c, after: i });
    }
  });
  return out;
}

/** Semanas cheias (shows + gravação na mesma semana, ou 3+ ações): cansam mais. */
export function crowdedWeeks(slots: AgendaSlot[]): number[] {
  const per: Record<number, string[]> = {};
  slots.forEach((x, i) => (per[slotWeek(x, i)] ??= []).push(x.action));
  return Object.entries(per).filter(([, a]) => a.length >= 3 || (a.includes('gigs') && a.includes('record'))).map(([w]) => Number(w));
}

/** Semana do mês (1–4) em que sai um lançamento já agendado deste ato. */
export function releaseWeek(s: GameState, actId: string): number | null {
  const pr = s.pendingReleases.find((p) => p.actId === actId);
  if (!pr) return null;
  const start = s.clock.opened ? s.clock.monthStartWeek : s.week;
  const w = pr.week - start + 1;
  return w >= 1 && w <= 4 ? w : null;
}

function before(s: GameState, _r: Rng, act: Act, slot: AgendaSlot, week: number): void {
  const st = ag7(s);
  const done = (st.done[act.id] ??= []);
  for (const c of COMBOS) {
    if (c.after === slot.action && done.some((d) => d.action === c.before && d.week <= week)) {
      c.apply(s, act);
      st.combos.push({ week: s.week, actId: act.id, combo: c.id });
      if (st.combos.length > 40) st.combos.shift();
    }
  }
  // divulgação na semana do lançamento: mais expectativa
  if ((slot.action === 'interview' || slot.action === 'social' || slot.action === 'feat') && releaseWeek(s, act.id) === week) {
    const pr = s.pendingReleases.find((p) => p.actId === act.id);
    if (pr) pr.hype = (pr.hype ?? 0) + 0.12;
  }
  // semana cheia cansa
  const sameWeek = done.filter((d) => d.week === week).map((d) => d.action);
  if (sameWeek.length >= 2 || (slot.action === 'gigs' && sameWeek.includes('record')) || (slot.action === 'record' && sameWeek.includes('gigs'))) mood(s, act, 'fatigue', 5);
  done.push({ action: slot.action, week });
}

setAgendaHooks({
  queue: (s, actId, slot, dim, week) => ag7(s).queue.push({ actId, slot: { ...slot, params: { ...(slot.params ?? {}) } }, dim, week }),
  before,
  bank: (s, left) => { ag7(s).sessions = left; },
});

function runQueued(s: GameState, r: Rng, upTo: number): void {
  const st = ag7(s);
  const due = st.queue.filter((q) => q.week <= upTo);
  if (!due.length) return;
  st.queue = st.queue.filter((q) => q.week > upTo);
  for (const q of due) {
    const act = s.acts[q.actId];
    if (!act || act.owner !== 'player' && !act.playerBand) continue;
    if (act.hiatusUntil && act.hiatusUntil > s.week) continue;
    before(s, r, act, q.slot, q.week);
    runAgendaSlot(s, r, act, q.slot, q.dim, () => {
      if (st.sessions > 0) { st.sessions -= 1; return true; }
      return false;
    });
  }
}

// a cada fechamento semanal, roda o que estava marcado para a semana seguinte
registerSimHook('week', 'ag7', (s, r) => {
  const st = ag7(s);
  st.weekNo += 1;
  runQueued(s, r, st.weekNo);
});

// fechamento do mês: o que sobrou roda; zera o calendário
registerSimHook('month', 'ag7', (s, r) => {
  const st = ag7(s);
  runQueued(s, r, 99);
  st.weekNo = 1;
  st.done = {};
});

// ---------------------------------------------------------------- modelos

export function saveTemplate(s: GameState, name: string, slots: AgendaSlot[]): void {
  const st = ag7(s);
  st.templates.push({ id: `tpl${st.templates.length + 1}-${s.week}`, name: name.slice(0, 40) || 'Modelo', slots: slots.map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } })) });
  if (st.templates.length > 12) st.templates.shift();
}

export function deleteTemplate(s: GameState, id: string): void {
  const st = ag7(s);
  st.templates = st.templates.filter((x) => x.id !== id);
}

export function applyTemplate(s: GameState, id: string, actIds: string[]): number {
  const tpl = ag7(s).templates.find((x) => x.id === id);
  if (!tpl) return 0;
  for (const a of actIds) {
    s.agenda[a] = tpl.slots.map((x) => ({ action: x.action, params: { ...(x.params ?? {}) } }));
    s.delegated[a] = false;
  }
  if (actIds.length > 1) notify(s, fmtL(l('Modelo "{n}" aplicado a {k} artistas.', 'Template "{n}" applied to {k} acts.'), { n: tpl.name, k: actIds.length }), 'info');
  return actIds.length;
}

/** Modelos prontos para começar. */
export const PRESETS: { id: string; name: L; slots: AgendaSlot[] }[] = [
  { id: 'studio', name: l('Modo estúdio', 'Studio mode'), slots: [{ action: 'workshop', params: { week: 1 } }, { action: 'compose', params: { week: 2 } }, { action: 'record', params: { week: 3, tier: 1, approach: 'balanced' } }] },
  { id: 'road', name: l('Modo estrada', 'Road mode'), slots: [{ action: 'rehearse', params: { week: 1 } }, { action: 'interview', params: { week: 1 } }, { action: 'gigs', params: { week: 2, tier: 1, dates: 6 } }, { action: 'rest', params: { week: 4 } }] },
  { id: 'promo', name: l('Divulgação', 'Promotion'), slots: [{ action: 'networking', params: { week: 1 } }, { action: 'opening', params: { week: 2 } }, { action: 'interview', params: { week: 3 } }, { action: 'social', params: { week: 4 } }] },
  { id: 'recover', name: l('Recuperação', 'Recovery'), slots: [{ action: 'rest', params: { week: 1 } }, { action: 'residency_art', params: { week: 3 } }] },
];
