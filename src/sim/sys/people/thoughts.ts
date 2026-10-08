// Humor como pilha de pensamentos (inspiração: RimWorld). Cada pensamento tem valor e prazo; a soma
// é o humor, que puxa o moral existente todo mês e entra no apelo dos lançamentos ("Clima na banda").

import { l, type L } from '../../../data/world';
import { registerMod, registerSimHook } from '../../ext4';
import type { GameState, Person } from '../../types';
import { fmtL, playerActs } from '../../util';
import { P, actOf, clamp01, today, trackedPersons, type Thought } from './state';

export interface ThoughtDef {
  v: number;
  days: number;
  text: L;
}

const T = (v: number, days: number, pt: string, en: string): ThoughtDef => ({ v, days, text: l(pt, en) });

export const THOUGHTS: Record<string, ThoughtDef> = {
  show_full: T(12, 7, 'Show lotado em {p}', 'Sold-out show in {p}'),
  show_good: T(5, 5, 'Bom show em {p}', 'Good show in {p}'),
  show_empty: T(-8, 7, 'Casa vazia em {p}', 'Empty house in {p}'),
  bus_sleep: T(-6, 4, 'Dormiu no ônibus', 'Slept on the bus'),
  credit_taken: T(-10, 30, 'Parceiro levou o crédito de "{p}"', 'Bandmate took credit for "{p}"'),
  own_credit: T(5, 21, 'Assinou "{p}"', 'Wrote "{p}"'),
  top_chart: T(15, 21, 'Disco no topo: "{p}"', 'Record at number one: "{p}"'),
  top10: T(8, 14, '"{p}" no top 10', '"{p}" in the top 10'),
  launch: T(5, 10, 'Lançou "{p}"', 'Released "{p}"'),
  flop: T(-7, 21, '"{p}" encalhou', '"{p}" flopped'),
  unpaid: T(-8, 30, 'Sem pagamento', 'Not getting paid'),
  broke: T(-12, 30, 'Falido', 'Broke'),
  rich: T(4, 30, 'Vida confortável', 'Comfortable life'),
  exhausted: T(-7, 10, 'Exausto', 'Exhausted'),
  praised: T(8, 21, 'Elogiado pelo selo', 'Praised by the label'),
  scolded: T(-6, 14, 'Levou uma bronca', 'Got told off'),
  motivated: T(5, 14, 'Cobrança acendeu o fogo', 'The push lit a fire'),
  patience: T(3, 21, 'O selo pediu paciência', 'The label asked for patience'),
  fined: T(-12, 30, 'Multado pelo selo', 'Fined by the label'),
  promise_made: T(6, 30, 'Promessa: {p}', 'Promise: {p}'),
  promise_kept: T(10, 45, 'Promessa cumprida: {p}', 'Promise kept: {p}'),
  promise_broken: T(-15, 60, 'Promessa quebrada: {p}', 'Broken promise: {p}'),
  in_love: T(8, 30, 'Apaixonado(a) por {p}', 'In love with {p}'),
  breakup: T(-18, 60, 'Término com {p}', 'Breakup with {p}'),
  friend_signed: T(5, 21, 'Amigo no selo: {p}', 'Friend joined the label: {p}'),
  friend_dropped: T(-8, 30, 'Dispensaram {p}', 'They dropped {p}'),
  newcomer: T(-4, 21, 'Novato roubando atenção: {p}', 'Newcomer stealing the spotlight: {p}'),
  clique: T(0, 30, 'Clima da panelinha', 'Clique mood'),
  rival_ahead: T(-5, 14, '{p} passou na frente', '{p} got ahead'),
  breakdown_shame: T(-6, 21, 'Vergonha do vexame', 'Ashamed of the meltdown'),
  catharsis: T(10, 7, 'Desabafou', 'Let it all out'),
  bandmate_breakdown: T(-4, 14, 'Colega surtou: {p}', 'Bandmate melted down: {p}'),
  sick_voice: T(-6, 14, 'Voz falhando', 'Voice failing'),
  tinnitus: T(-4, 30, 'Zumbido nos ouvidos', 'Ringing ears'),
  injured: T(-8, 14, 'Lesionado: {p}', 'Injured: {p}'),
  craving: T(-8, 14, 'Abstinência', 'Cravings'),
  treated: T(8, 30, 'Tratamento concluído', 'Treatment done'),
  haters: T(-5, 14, 'Leu ataques nas redes', 'Read the hate online'),
  fans_love: T(4, 14, 'Carinho dos fãs', 'Love from the fans'),
  fan_letters: T(3, 21, 'Cartas de fãs', 'Fan letters'),
  gossip: T(-4, 21, 'Saiu em coluna de fofoca', 'In the gossip column'),
  family_strain: T(-5, 30, 'Crise em casa', 'Trouble at home'),
  secret_leaked: T(-20, 60, 'Segredo exposto', 'Secret exposed'),
  new_house: T(10, 60, 'Casa nova', 'New house'),
  party: T(6, 7, 'Festança', 'Big party'),
  solo: T(12, 45, 'Carreira solo', 'Solo career'),
  raise: T(8, 45, 'Ganhou aumento', 'Got a raise'),
  leader_mood: T(0, 30, 'Clima do líder ({p})', 'Leader\'s mood ({p})'),
};

/** Traços mudam a intensidade com que a pessoa sente as coisas. */
function feel(p: Person, v: number): number {
  let m = 1;
  const tr = p.traits;
  if (v < 0) {
    if (tr.includes('resilient')) m *= 0.7;
    if (tr.includes('insecure') || tr.includes('anxious')) m *= 1.2;
    if (tr.includes('melancholic')) m *= 1.15;
    if (tr.includes('optimist')) m *= 0.85;
  } else {
    if (tr.includes('optimist')) m *= 1.15;
    if (tr.includes('melancholic')) m *= 0.85;
    if (tr.includes('big_ego')) m *= 1.1;
  }
  const res = p.persona?.resilience ?? 50;
  if (v < 0) m *= 1.15 - res / 330;
  return Math.round(v * m);
}

/** Acrescenta (ou renova) um pensamento. Mesma chave + parâmetro renova em vez de empilhar. */
export function addThought(s: GameState, pid: string, k: string, opts: { p?: string; v?: number; days?: number; stack?: boolean } = {}): void {
  const def = THOUGHTS[k];
  const p = s.persons[pid];
  if (!def || !p?.alive) return;
  const st = P(s);
  const list = (st.thoughts[pid] ??= []);
  const v = feel(p, opts.v ?? def.v);
  const until = today(s) + (opts.days ?? def.days);
  const same = opts.stack ? undefined : list.find((x) => x.k === k && x.p === opts.p);
  if (same) {
    same.until = Math.max(same.until, until);
    if (Math.abs(v) > Math.abs(same.v)) same.v = v;
  } else list.push({ k, v, until, p: opts.p });
  if (list.length > 14) {
    // sai o mais fraco
    let wi = 0;
    for (let i = 1; i < list.length; i++) if (Math.abs(list[i].v) < Math.abs(list[wi].v)) wi = i;
    list.splice(wi, 1);
  }
}

export function thoughtText(t: Thought): L {
  const def = THOUGHTS[t.k];
  return def ? fmtL(def.text, { p: t.p ?? '' }) : l(t.k);
}

export function activeThoughts(s: GameState, pid: string): Thought[] {
  const now = today(s);
  return (P(s).thoughts[pid] ?? []).filter((x) => x.until >= now).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

/** Humor = soma dos pensamentos vivos (limitado a ±40). */
export function moodOf(s: GameState, pid: string): number {
  let m = 0;
  for (const t of activeThoughts(s, pid)) m += t.v;
  return Math.max(-40, Math.min(40, m));
}

export function actMood(s: GameState, actId: string): number {
  const a = s.acts[actId];
  if (!a) return 0;
  const ms = a.members.filter((id) => s.persons[id]?.alive);
  if (!ms.length) return 0;
  return ms.reduce((t, id) => t + moodOf(s, id), 0) / ms.length;
}

export function thoughtAll(s: GameState, actId: string, k: string, opts: { p?: string; v?: number; days?: number } = {}): void {
  const a = s.acts[actId];
  if (!a) return;
  for (const id of a.members) addThought(s, id, k, opts);
}

// ---------------------------------------------------------------- ganchos

registerSimHook('show', 'people-thoughts', (s, r, arg) => {
  const sh = arg.show;
  if (!sh) return;
  const act = s.acts[sh.actId];
  if (!act || act.owner !== 'player') return;
  const ratio = sh.sold / Math.max(1, sh.capacity);
  const city = sh.cityId;
  for (const id of act.members) {
    if (ratio >= 0.95) addThought(s, id, 'show_full', { p: city });
    else if (ratio >= 0.7) addThought(s, id, 'show_good', { p: city });
    else if (ratio < 0.4) addThought(s, id, 'show_empty', { p: city });
  }
  const tour = s.tours.find((t) => t.id === sh.tourId);
  const stop = tour?.stops.find((x) => x.cityId === sh.cityId && x.status === 'played' && x.travelDays > 0);
  if (stop && !s.player.equipment.includes('tour_bus') && r.chance(0.5)) for (const id of act.members) addThought(s, id, 'bus_sleep');
});

registerSimHook('launch', 'people-thoughts', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || rel.owner !== 'player') return;
  thoughtAll(s, rel.actId, 'launch', { p: rel.title });
});

registerSimHook('compose', 'people-thoughts', (s, _r, arg) => {
  const song = arg.song;
  if (!song) return;
  const act = s.acts[song.actId];
  if (!act || act.owner !== 'player' || act.members.length < 2) return;
  const writers = new Set(song.splits?.length ? song.splits.filter((x) => x.share >= 0.15).map((x) => x.personId) : song.writers);
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    if (writers.has(id)) {
      if (writers.size < act.members.length) addThought(s, id, 'own_credit', { p: song.title });
    } else if (p.skills.comp >= 40 && (p.goal === 'credit' || p.ambition === 'critics' || p.traits.includes('big_ego'))) {
      addThought(s, id, 'credit_taken', { p: song.title });
      p.resentment = clamp01(p.resentment + 4);
    }
  }
});

registerSimHook('week', 'people-thoughts', (s) => {
  const mine = new Set(playerActs(s));
  if (!mine.size) return;
  for (const e of s.charts.singles.concat(s.charts.albums)) {
    if (e.pos > 10) continue;
    const rel = s.releases[e.releaseId];
    if (!rel || !mine.has(rel.actId)) continue;
    thoughtAll(s, rel.actId, e.pos === 1 ? 'top_chart' : 'top10', { p: rel.title });
  }
  for (const id of mine) {
    const act = s.acts[id];
    for (const rid of act.releases.slice(-3)) {
      const rel = s.releases[rid];
      if (rel && rel.owner === 'player' && s.week - rel.week === 8 && rel.peak > 40) thoughtAll(s, id, 'flop', { p: rel.title });
    }
  }
  for (const p of trackedPersons(s)) if (p.fatigue > 75) addThought(s, p.id, 'exhausted');
});

/** Fechamento do mês: limpa pensamentos vencidos e o humor puxa moral e estresse. */
export function thoughtsMonth(s: GameState): void {
  const st = P(s);
  const now = today(s);
  const tracked = new Set<string>();
  for (const p of trackedPersons(s)) {
    tracked.add(p.id);
    const list = st.thoughts[p.id];
    if (list) st.thoughts[p.id] = list.filter((x) => x.until >= now);
    const mood = moodOf(s, p.id);
    p.morale = clamp01(p.morale + mood * 0.25);
    if (mood < -10) p.stress = clamp01(p.stress + (-mood - 10) * 0.15);
    else if (mood > 10) p.stress = clamp01(p.stress - (mood - 10) * 0.1);
  }
  for (const id of Object.keys(st.thoughts)) if (!tracked.has(id)) delete st.thoughts[id];
}

registerMod('appeal', 'people-mood', (s, value, ctx) => {
  const act = ctx.act ?? (ctx.release ? s.acts[ctx.release.actId] : undefined);
  if (!act || act.owner !== 'player') return null;
  const m = actMood(s, act.id);
  if (Math.abs(m) < 4) return null;
  const f = 1 + Math.max(-0.06, Math.min(0.04, m / 300));
  return { value: value * f, label: l('Clima na banda', 'Band morale') };
});

export { actOf };
