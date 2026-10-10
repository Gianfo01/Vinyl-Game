// Rodada 17 — extras da vida pessoal ligados ao resto: terapia e reabilitação pagas pelo selo para o elenco
// (audit17 §3.1 #7), fé (retiro/conversão do jogador; conversão de artista que quer largar a música secular,
// como Little Richard e Cat Stevens/Yusuf), e disputa de herança quando um artista morre (herdeiros brigam;
// o catálogo fica em juízo). Tudo publica Facts e mexe em estresse/obrigações.

import { clamp, Rng } from '../../core/rng';
import { genreById, l, type L } from '../../data/world';
import { relById, shiftPlayerViews, type RelId } from '../beliefs';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { grantHold } from '../holds17';
import { addStress, relieveLong, stressOf } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { playerPerson, spendEnergy } from './life';
import { ownerOf } from './people/owner';
import { healthOf } from './people/state';
import { registerSituation } from './situations17';
import { actsOfPerson17 } from '../actidx17';

export interface Extras17State { th: Record<string, number>; conv: Record<string, number>; estate: { pid: string; act: string; w: number; esc?: number; until?: number; done?: 1 }[] }
declare module '../ext4' { interface Ext4 { extras17: Extras17State } }
const fresh = (): Extras17State => ({ th: {}, conv: {}, estate: [] });
registerExt4('extras17', fresh);
export function ex17(s: GameState): Extras17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.extras17 ??= fresh()) as Extras17State;
  st.th ??= {}; st.conv ??= {}; st.estate ??= [];
  return st;
}
const actOfP = (s: GameState, pid: string): Act | undefined => actsOfPerson17(s, pid)[0];
const mKey = (s: GameState) => s.year * 12 + s.month;

// ---------------------------------------------------------------- terapia e clínica para o elenco

export const THERAPY17 = 800, REHAB17 = 6000;
/** Terapia paga pelo selo (1×/mês por pessoa). */
export function castTherapy(s: GameState, pid: string): L | null {
  const p = s.persons[pid];
  if (!p?.alive || !playerActs(s).some((a) => s.acts[a]?.members.includes(pid))) return l('Só para o seu elenco.', 'Only for your roster.');
  const st = ex17(s);
  if (st.th[pid] === mKey(s)) return l('Já fez terapia este mês.', 'Already had therapy this month.');
  st.th[pid] = mKey(s);
  post(s, `th17:${pid}:${s.week}`, -money(s, THERAPY17), 'artist_dev', `Terapia: ${p.name}`);
  addStress(s, pid, -15, l('Terapia paga pelo selo', 'Therapy paid by the label'));
  relieveLong(s, pid, 10);
  const h = healthOf(s, pid); h.dependency = clamp(h.dependency - 4, 0, 100);
  p.morale = clamp(p.morale + 4, 0, 100);
  const a = actOfP(s, pid); if (a) a.trust = clamp(a.trust + 2, 0, 100);
  return null;
}
/** Clínica de reabilitação para dependência (afasta 8 semanas). */
export function castRehab(s: GameState, pid: string): L | null {
  const p = s.persons[pid];
  if (!p?.alive || !playerActs(s).some((a) => s.acts[a]?.members.includes(pid))) return l('Só para o seu elenco.', 'Only for your roster.');
  const h = healthOf(s, pid);
  if (h.dependency < 25 && p.health !== 'addiction') return l('Não há dependência que justifique a clínica.', 'No dependency that warrants rehab.');
  post(s, `rh17:${pid}:${s.week}`, -money(s, REHAB17), 'artist_dev', `Reabilitação: ${p.name}`);
  h.dependency = clamp(h.dependency - 45, 0, 100);
  if (p.health === 'addiction') p.health = 'recovering';
  relieveLong(s, pid, 15);
  const a = actOfP(s, pid);
  if (a) { a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 8); a.trust = clamp(a.trust + 5, 0, 100); }
  emitFact(s, { kind: 'rehab', actors: [pid, ...(a ? [a.id] : [])], place: a?.city, severity: 35, visibility: (a?.fame ?? 0) >= 30 ? 'rumor' : 'secret', tags: ['health', 'drugs', 'good'], text: fmtL(l('{p} se interna numa clínica, bancada pelo selo.', '{p} checks into rehab, paid by the label.'), { p: p.name }), src: 'extras17' });
  return null;
}

// ---------------------------------------------------------------- fé

/** Retiro espiritual / conversão do jogador. */
export function faithRetreat(s: GameState, rel?: RelId): L | null {
  const e = spendEnergy(s, 2);
  if (e) return e;
  const o = ownerOf(s);
  const c = money(s, 500);
  if (o.wealth < c) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  o.wealth -= c;
  const pp = playerPerson(s);
  if (pp) { addStress(s, pp.id, -12, l('Retiro espiritual', 'Spiritual retreat')); relieveLong(s, pp.id, 18); }
  o.stress = clamp(o.stress - 10, 0, 100);
  shiftPlayerViews(s, { ...(rel ? { rel } : {}), dev: 15 });
  if (rel) emitFact(s, { kind: 'statement', actors: ['player'], place: s.config.homeCity, severity: 30, visibility: 'public', tags: ['faith', `religion:${rel}`], text: fmtL(l('{o} se converte: agora {r}.', '{o} converts: now {r}.'), { o: o.name, r: relById[rel].name }), src: 'extras17' });
  return null;
}

const convCand = (s: GameState, mine: boolean): [string, Act] | null => {
  const st = ex17(s);
  for (const a of Object.values(s.acts)) {
    if ((a.owner === 'player') !== mine || a.catalogNo || !(a.status === 'active' || a.status === 'emerging') || (!mine && a.fame < 35)) continue;
    for (const m of a.members) {
      const p = s.persons[m];
      if (!p?.alive || p.isPlayer || st.conv[m]) continue;
      const x = stressOf(s, m);
      if (x.long > 45 || (p.traits.includes('spiritual') && x.short > 55)) return [m, a];
    }
  }
  return null;
};
for (const mine of [true, false]) registerSituation({
  id: mine ? 'convert17' : 'convert17n', pressure: 'faith', cost: 2, cooldown: 14, ...(mine ? { playerOnly: true } : { npcOnly: true }),
  when: (s) => !!convCand(s, mine),
  actorsPick: (s) => { const c = convCand(s, mine); return c ? { hero: c[0], act: c[1].id, cast: { person: c[0] }, data: {} } : null; },
  title: (s, c) => fmtL(l('{p} encontrou a fé', '{p} has found faith'), { p: s.persons[c.hero]?.name ?? '?' }),
  text: (s, c) => fmtL(l('Depois de anos de desgaste, {p} ({a}) se converteu e diz que não quer mais cantar "música do mundo". Já aconteceu com Little Richard (1957) e Cat Stevens (1977).', 'After years of strain, {p} ({a}) converted and says they no longer want to sing "worldly music". It happened to Little Richard (1957) and Cat Stevens (1977).'), { p: s.persons[c.hero]?.name ?? '?', a: s.acts[c.act!]?.name ?? '?' }),
  options: [
    { id: 'gospel', label: l('Apoiar a virada: disco religioso', 'Back the turn: a religious record'), hint: l('O ato vira gospel: 40% do público casual vai embora, núcleo fica; estresse −25, sem mágoa.', 'The act turns gospel: 40% of casual fans leave, the core stays; stress −25, no grudge.'),
      weightByTraits: (P0) => (P0?.facets.lealdade ?? 50) / 50 + 0.5,
      apply: (s, c) => { const a = s.acts[c.act!]; ex17(s).conv[c.hero] = s.year; if (a && genreById.gospel && genreById.gospel.born <= s.year) { a.genre = 'gospel'; a.fans.casual = Math.round(a.fans.casual * 0.6); } addStress(s, c.hero, -25, l('Em paz com a fé', 'At peace with faith')); relieveLong(s, c.hero, 20); emitFact(s, { kind: 'statement', actors: [c.hero, c.act!], place: a?.city, severity: 40, visibility: 'public', tags: ['faith'], text: fmtL(l('{a} troca o repertório por música religiosa.', '{a} swaps the repertoire for religious music.'), { a: a?.name ?? '?' }), src: 'extras17' }); } },
    { id: 'sabbatical', label: l('Um ano sabático', 'A sabbatical year'), hint: l('Ato parado 12 meses; estresse −30. Pode voltar renovado(a).', 'Act on hold for 12 months; stress −30. May come back renewed.'),
      weightByTraits: (P0) => (P0?.facets.paciencia ?? 50) / 50,
      apply: (s, c) => { const a = s.acts[c.act!]; ex17(s).conv[c.hero] = s.year; if (a) a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 52); addStress(s, c.hero, -30, l('Ano sabático', 'Sabbatical')); relieveLong(s, c.hero, 25); } },
    { id: 'contract', label: l('Cobrar o contrato', 'Hold them to the contract'), hint: l('Segue tudo como está; estresse +12 e mágoa forte contra o selo (pesa na renovação).', 'Business as usual; stress +12 and a strong grudge against the label (weighs on renewal).'),
      weightByTraits: (P0) => (P0?.facets.ambicao ?? 50) / 50,
      apply: (s, c) => { ex17(s).conv[c.hero] = s.year; addStress(s, c.hero, 12, l('Obrigado(a) a cantar contra a fé', 'Forced to sing against their faith')); const a = s.acts[c.act!]; grantHold(s, { holder: c.hero, target: a?.owner ?? 'player', kind: 'grievance', strength: 60, months: 48, src: 'extras17', text: l('Obrigado(a) a cantar contra a própria fé', 'Forced to sing against their own faith') }); } },
  ],
});

// ---------------------------------------------------------------- herança em disputa

onFact('death', (s, f) => {
  const pid = f.actors.find((x) => s.persons[x]);
  if (!pid) return;
  const a = actOfP(s, pid);
  if (!a || a.catalogNo || a.fame < 25) return;
  const fam = s.families[pid];
  const heirs = (fam?.kids.length ?? 0) + (fam?.partner ? 1 : 0);
  if (heirs < 2 && !fam?.separated) return;
  const r = Rng.fromSeed(`${s.config.seed}:estate17:${pid}`);
  if (!r.chance(0.45)) return;
  const st = ex17(s);
  if (st.estate.some((x) => x.pid === pid)) return;
  st.estate.push({ pid, act: a.id, w: s.week });
  emitFact(s, { kind: 'case_ruling', actors: [pid, a.id], place: a.city, severity: 35, visibility: 'public', tags: ['money', 'family', 'estate'], text: fmtL(l('Herdeiros de {p} brigam na justiça pelo espólio e pelo catálogo.', '{p}\'s heirs fight in court over the estate and the catalog.'), { p: s.persons[pid]?.name ?? '?' }), cause: [f.id], src: 'extras17' });
}, 'extras17:estate');

const openEstate = (s: GameState) => ex17(s).estate.find((x) => !x.done && x.esc === undefined && s.acts[x.act]?.owner === 'player');
registerSituation({
  id: 'estate17', pressure: 'money', cost: 2, cooldown: 4, playerOnly: true,
  when: (s) => !!openEstate(s),
  actorsPick: (s) => { const e = openEstate(s); return e ? { hero: 'player', act: e.act, cast: { person: e.pid }, data: { pid: e.pid } } : null; },
  title: (s, c) => fmtL(l('Espólio de {p} em disputa', '{p}\'s estate in dispute'), { p: s.persons[c.cast.person]?.name ?? '?' }),
  text: (s, c) => fmtL(l('Viúvo(a), ex e filhos de {p} disputam quem manda no catálogo de {a}. Sem acordo, o juiz congela os repasses.', '{p}\'s widow(er), ex and children fight over who controls {a}\'s catalog. Without a deal, the judge freezes payments.'), { p: s.persons[c.cast.person]?.name ?? '?', a: s.acts[c.act!]?.name ?? '?' }),
  options: [
    { id: 'mediate', label: l('Bancar a mediação', 'Fund a mediation'), hint: l('Custa $7.000 (era): acordo, herdeiros gratos (lealdade) e homenagem póstuma (+10 momento).', 'Costs $7,000 (era): settlement, grateful heirs (loyalty) and a posthumous tribute (+10 momentum).'),
      apply: (s, c) => { post(s, `estate17:${c.data.pid}`, -money(s, 7000), 'legal', 'Mediação de espólio'); const e = ex17(s).estate.find((x) => x.pid === c.data.pid); if (e) e.done = 1; const a = s.acts[c.act!]; if (a) a.momentum = clamp(a.momentum + 10, 0, 100); grantHold(s, { holder: `estate:${c.data.pid}`, target: 'player', kind: 'loyalty', strength: 50, months: 60, src: 'extras17', text: l('Herdeiros gratos pela mediação', 'Heirs grateful for the mediation') }); } },
    { id: 'wait', label: l('Esperar o juiz', 'Wait for the judge'), hint: l('Grátis, mas $10.000 (era) do seu caixa ficam retidos em juízo por 12 meses.', 'Free, but $10,000 (era) of your cash is held in escrow for 12 months.'),
      apply: (s, c) => { const v = money(s, 10000); post(s, `escrow17:${c.data.pid}`, -v, 'legal', 'Depósito judicial (espólio)'); const e = ex17(s).estate.find((x) => x.pid === c.data.pid); if (e) { e.esc = v; e.until = s.week + 52; } } },
  ],
});
registerSimHook('month', 'extras17', (s) => {
  for (const e of ex17(s).estate) if (e.esc !== undefined && !e.done && e.until !== undefined && s.week >= e.until) {
    e.done = 1;
    post(s, `escrow17r:${e.pid}`, e.esc, 'legal', 'Depósito judicial liberado');
    notify(s, fmtL(l('O juiz liberou o depósito do espólio de {p}.', 'The judge released the escrow of {p}\'s estate.'), { p: s.persons[e.pid]?.name ?? '?' }), 'good');
  }
  const st = ex17(s);
  if (st.estate.length > 40) st.estate = st.estate.slice(-40);
});
