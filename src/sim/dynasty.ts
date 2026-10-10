// Pessoas além da banda: famílias com agenda própria, facções e líder, votação de autonomia,
// reunião negociada, genealogia e dinastias, carreira solo jogável, tributos, Hall da Fama,
// envelhecimento e morte (GDD §8, §10, §36, §43, §44, §46.5).

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { makePerson, personName, langForCity } from './people';
import type { Act, GameState, Person } from './types';
import type { Family } from './xtypes';
import { fmtL, money, nextId, notify, playerActs, post, remember } from './util';
import { personaOf } from './ext';
import { histLocked } from './history15';
import { actsTouched17 } from './actidx17';

const JOBS: L[] = [
  l('professora', 'teacher'), l('enfermeiro', 'nurse'), l('fotógrafa', 'photographer'), l('advogado', 'lawyer'),
  l('produtora de cinema', 'film producer'), l('chef', 'chef'), l('engenheira', 'engineer'), l('jornalista', 'journalist'),
  l('pintor', 'painter'), l('médica', 'doctor'), l('comerciante', 'shopkeeper'), l('dançarina', 'dancer'),
];
const AGENDAS: L[] = [
  l('quer mudar de cidade por causa do trabalho', 'wants to move city for work'),
  l('começou uma pós-graduação', 'started a graduate program'),
  l('quer mais tempo juntos nos fins de semana', 'wants more weekends together'),
  l('abriu um negócio próprio', 'opened their own business'),
  l('cuida de um parente doente', 'is caring for a sick relative'),
  l('foi promovida e viaja muito', 'got promoted and travels a lot'),
];

export function ensureFamily(s: GameState, personId: string): Family {
  return (s.families[personId] ??= { personId, kids: [], householdCash: 0 });
}

// ---------- Envelhecimento e morte (GDD §44) ----------
function deathRisk(age: number, p: Person): number {
  let r = age < 45 ? 0.000015 : age < 60 ? 0.00012 : age < 70 ? 0.0005 : age < 80 ? 0.0017 : age < 90 ? 0.005 : 0.018;
  if (p.health === 'addiction') r += 0.0008;
  if (p.health === 'burnout' || p.health === 'ill') r += 0.0004;
  return Math.min(0.07, r);
}

/** Artistas reais seguem a vida real até o presente: não morrem por sorteio antes de 2026 (as mortes reais vêm do roteiro). */
export const realSafe = (s: GameState, act: { catalogNo?: number }): boolean => !!act.catalogNo && s.year < 2026 && s.config.history !== 'free';

export function personDies(s: GameState, p: Person, cause: L): void {
  if (!p.alive) return;
  p.alive = false;
  p.died = s.year;
  const acts = Object.values(s.acts).filter((a) => a.members.includes(p.id));
  for (const act of acts) {
    const alive = act.members.filter((id) => s.persons[id]?.alive);
    if (!alive.length) {
      act.status = 'retired';
      act.deceased = true;
    } else {
      act.hiatusUntil = Math.max(act.hiatusUntil ?? 0, s.week + 4); // um mês de luto
      if (act.leaderId === p.id) act.leaderId = alive[0];
    }
    // catálogo volta a tocar
    for (const rid of act.releases) {
      const rel = s.releases[rid];
      if (rel && rel.owner === 'player' && !rel.live) {
        rel.live = true;
        rel.week = s.week - 53;
        rel.appeal *= 0.3;
      }
    }
    act.momentum = clamp(act.momentum + 30, 0, 100);
    // inéditas viram cofre (lançamento póstumo exige direitos)
    const unreleased = act.songs.filter((id) => s.songs[id] && !s.songs[id].releaseId && s.songs[id].writers.includes(p.id));
    if (unreleased.length) s.vault[p.id] = [...new Set([...(s.vault[p.id] ?? []), ...unreleased])];
    for (const id of unreleased) s.songs[id].vault = true;
  }
  s.imageRights[p.id] ??= { personId: p.id, holder: 'estate', feeAsk: money(s, 20000 + (acts[0]?.fame ?? 0) * 2500), consent: false };
  // família sente a perda
  const fam = s.families[p.id];
  if (fam) for (const k of fam.kids) k.bond = clamp(k.bond - 10, 0, 100);
  const famous = acts.some((a) => a.fame > 40 || a.owner === 'player' || a.catalogNo);
  remember(s, 'death', fmtL(l('Morre {p} ({a}), aos {age} anos — {c}.', '{p} ({a}) dies at {age} — {c}.'), { p: p.name, a: acts[0]?.name ?? '', age: s.year - p.born, c: cause }), { actId: acts[0]?.id, important: famous });
  if (famous) notify(s, fmtL(l('Luto: {p} ({a}).', 'Mourning: {p} ({a}).'), { p: p.name, a: acts[0]?.name ?? '' }), 'event');
}

function agingMonth(s: GameState, r: Rng): void {
  for (const act of Object.values(s.acts)) {
    const tracked = act.owner === 'player' || act.fame > 25 || act.catalogNo || act.legend;
    if (!tracked) continue;
    const safe = realSafe(s, act);
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p || !p.alive) continue;
      const age = s.year - p.born;
      if (r.chance(deathRisk(age, p)) && !safe) { // sorteia sempre (mantém a sequência), mas reais não morrem
        const cause = age > 70 ? l('causas naturais', 'natural causes') : p.health === 'addiction' ? l('complicações de saúde', 'health complications') : l('um acidente inesperado', 'an unexpected accident');
        personDies(s, p, cause);
        continue;
      }
      // aposentadoria individual (limiar pessoal 62–75, decisão probabilística)
      if (age >= (p.retireAge ?? 70) && act.members.length > 1 && r.chance(0.02 + (p.health !== 'ok' ? 0.02 : 0)) && !histLocked(s, act)) {
        act.members = act.members.filter((x) => x !== p.id);
        remember(s, 'member_retires', fmtL(l('{p} se aposenta e deixa {a}.', '{p} retires and leaves {a}.'), { p: p.name, a: act.name }), { actId: act.id });
      }
    }
  }
}

// ---------- Famílias ----------
function familyMonth(s: GameState, r: Rng): void {
  for (const actId of playerActs(s)) {
    const act = s.acts[actId];
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p?.alive) continue;
      const age = s.year - p.born;
      const fam = ensureFamily(s, p.id);
      // rodada 14: quem já vive a rotina de lazer (leisure14) namora e tem filhos por lá — sem sorteio em dobro
      // (o teste fica no fim da condição para não mudar o consumo do Rng compartilhado)
      const lz = !!(s.x4 as unknown as { leisure14?: { r?: Record<string, unknown> } }).leisure14?.r?.[`p:${p.id}`];
      if (!fam.partner && !fam.separated && age > 24 && r.chance(0.01) && !lz) {
        fam.partner = { name: personName(r, langForCity(act.city, r)), job: r.pick(JOBS), trust: 60, wellbeing: 60, agenda: r.pick(AGENDAS) };
        remember(s, 'partner', fmtL(l('{p} começa um relacionamento com {q}.', '{p} starts a relationship with {q}.'), { p: p.name, q: fam.partner.name }), { actId });
      }
      if (fam.partner && age < 45 && fam.kids.length < 3 && r.chance(0.006) && !lz) {
        const kid = { id: nextId(s, 'k'), name: personName(r, langForCity(act.city, r)), born: s.year, bond: 70, musical: r.int(10, 90) };
        fam.kids.push(kid);
        remember(s, 'birth', fmtL(l('Nasce {k}, filho(a) de {p}.', '{k} is born to {p}.'), { k: kid.name, p: p.name }), { actId });
      }
      // agenda própria do parceiro: muda de tempos em tempos e cobra presença
      if (fam.partner) {
        if (r.chance(0.04)) fam.partner.agenda = r.pick(AGENDAS);
        const away = (s.loadNow[actId] ?? 0) > 75 || s.tours.some((t) => t.actId === actId && t.status === 'running');
        fam.partner.trust = clamp(fam.partner.trust + (away ? -2 : 0.5), 0, 100);
        fam.partner.wellbeing = clamp(fam.partner.wellbeing + (away ? -1 : 0.3), 0, 100);
        if (fam.partner.trust < 20 && r.chance(0.08)) {
          remember(s, 'separation', fmtL(l('{p} e {q} se separam.', '{p} and {q} separate.'), { p: p.name, q: fam.partner.name }), { actId, important: true });
          fam.partner = undefined;
          fam.separated = true;
          p.stress = clamp(p.stress + 20, 0, 100);
          p.morale = clamp(p.morale - 15, 0, 100);
        } else if (fam.partner.trust < 35) p.stress = clamp(p.stress + 1.5, 0, 100);
      }
      fam.householdCash += money(s, fam.partner ? 900 : 0) - money(s, 700 + fam.kids.length * 180);
      for (const k of fam.kids) {
        const kage = s.year - k.born;
        k.bond = clamp(k.bond + ((s.loadNow[actId] ?? 0) > 75 ? -0.8 : 0.3), 0, 100);
        // dinastia: filho músico vira pessoa jogável aos 18
        if (kage >= 18 && !k.personId && k.musical > 55) {
          const child = makePerson(s, r, { lang: langForCity(act.city, r), role: p.role === 'synthetic' ? 'vocal' : p.role, potential: clamp((p.potential + k.musical) / 2 + r.normal(0, 6), 30, 99), born: k.born, startFrac: 0.4, name: k.name });
          child.parentId = p.id;
          s.persons[child.id] = child;
          k.personId = child.id;
          s.lineage[p.id] = [...(s.lineage[p.id] ?? []), child.id];
          remember(s, 'dynasty', fmtL(l('{k}, filho(a) de {p}, decide seguir carreira na música.', '{k}, child of {p}, decides to pursue music.'), { k: k.name, p: p.name }), { actId, important: true });
          notify(s, fmtL(l('Dinastia: {k} ({p}) quer começar uma carreira. Veja Pessoas → Família.', 'Dynasty: {k} ({p}) wants to start a career. See People → Family.'), { k: k.name, p: p.name }), 'event');
        }
      }
    }
  }
}

export function familyAction(s: GameState, personId: string, kind: 'talk' | 'support' | 'month'): L | null {
  const fam = ensureFamily(s, personId);
  if (fam.lastTalk && s.week - fam.lastTalk < 4) return l('Uma decisão familiar por mês.', 'One family decision per month.');
  fam.lastTalk = s.week;
  if (kind === 'support') {
    const c = money(s, 500);
    if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `fam:${personId}`, -c, 'artist_dev', 'Apoio familiar');
    fam.householdCash += c;
  }
  if (fam.partner) {
    fam.partner.trust = clamp(fam.partner.trust + (kind === 'talk' ? 6 : kind === 'support' ? 8 : 15), 0, 100);
    fam.partner.wellbeing = clamp(fam.partner.wellbeing + 5, 0, 100);
  }
  for (const k of fam.kids) k.bond = clamp(k.bond + (kind === 'month' ? 12 : 3), 0, 100);
  const p = s.persons[personId];
  if (p) p.stress = clamp(p.stress - (kind === 'month' ? 15 : 4), 0, 100);
  if (kind === 'month') {
    const act = Object.values(s.acts).find((a) => a.members.includes(personId) && a.owner === 'player');
    if (act) act.hiatusUntil = Math.max(act.hiatusUntil ?? 0, s.week + 4);
  }
  return null;
}

/** Filho(a) músico(a) vira um novo ato do jogador (dinastia). */
export function launchHeir(s: GameState, r: Rng, personId: string): L | null {
  const p = s.persons[personId];
  if (!p?.parentId) return l('Pessoa sem vínculo de dinastia.', 'No dynasty link.');
  if (Object.values(s.acts).some((a) => a.members.includes(personId))) return l('Já tem carreira.', 'Already has a career.');
  const parentAct = Object.values(s.acts).find((a) => a.members.includes(p.parentId!));
  const cost = money(s, 3000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `heir:${personId}`, -cost, 'artist_dev', `Carreira de ${p.name}`);
  const act: Act = {
    ...(parentAct ? structuredClone(parentAct) : ({} as Act)),
    id: nextId(s, 'a'), name: p.name, members: [p.id], formed: s.year, debutYear: s.year, status: 'emerging',
    fame: Math.min(20, (parentAct?.fame ?? 0) * 0.15 + 2), momentum: 40, fans: { casual: Math.round((parentAct?.fans.casual ?? 0) * 0.03), active: 10, core: 3 },
    owner: 'player', trust: 60, songs: [], releases: [], lastRelease: -999, peakChart: 999, hits: 0, number1s: 0, awards: 0,
    legend: false, scandals: 0, networking: 0, rehearsed: 0, feats: 0, cash: 0, history: [], logoSeed: r.int(1, 2 ** 30),
    catalogNo: undefined, contractId: undefined, playerBand: false, careerEnd: s.year + 35, archetype: undefined, potential: p.potential,
    genre: parentAct?.genre ?? 'pop', city: parentAct?.city ?? s.config.homeCity, positioning: 40, leaderId: p.id,
  };
  s.acts[act.id] = act;
  actsTouched17(s);
  s.delegated[act.id] = true;
  remember(s, 'heir', fmtL(l('{p} estreia carreira pelo selo, herdeiro(a) de {a}.', '{p} debuts on the label, heir to {a}.'), { p: p.name, a: parentAct?.name ?? '' }), { actId: act.id, important: true });
  return null;
}

// ---------- Facções e líder ----------
function factionsMonth(s: GameState): void {
  for (const actId of playerActs(s)) {
    const act = s.acts[actId];
    const ms = act.members.filter((id) => s.persons[id]?.alive);
    if (ms.length < 3) continue;
    // agrupa por afinidade (> 20 forma aliança)
    const groups: string[][] = [];
    const seen = new Set<string>();
    for (const a of ms) {
      if (seen.has(a)) continue;
      const g = [a];
      seen.add(a);
      for (const b of ms) if (!seen.has(b) && (s.persons[a].rel[b] ?? 0) > 20 && (s.persons[b].rel[a] ?? 0) > 20) {
        g.push(b);
        seen.add(b);
      }
      groups.push(g);
    }
    const prev = s.factions[actId];
    const tension = clamp(groups.length > 1 ? (prev?.tension ?? 10) + (groups.length - 1) * 2 - 1 : (prev?.tension ?? 0) - 3, 0, 100);
    s.factions[actId] = { actId, groups, leaderId: act.leaderId, tension };
    if (tension > 70 && groups.length > 1 && !s.flags[`factionWarn:${actId}`]) {
      s.flags[`factionWarn:${actId}`] = s.week;
      notify(s, fmtL(l('{a} está rachada em {n} facções. Mediação ou troca de líder podem ajudar.', '{a} is split into {n} factions. Mediation or a new leader may help.'), { a: act.name, n: groups.length }), 'bad');
    }
  }
}

export function setLeader(s: GameState, actId: string, personId: string): L | null {
  const act = s.acts[actId];
  if (!act || !act.members.includes(personId)) return l('Integrante inválido.', 'Invalid member.');
  const old = act.leaderId;
  if (old === personId) return null;
  act.leaderId = personId;
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p) continue;
    const aff = p.rel[personId] ?? 0;
    p.morale = clamp(p.morale + aff / 20, 0, 100);
    if (id === old) {
      p.stress = clamp(p.stress + (p.goal === 'leadership' ? 25 : 10), 0, 100);
      p.resentment = clamp(p.resentment + (p.goal === 'leadership' ? 20 : 8), 0, 100);
    }
    if (id === personId && p.goal === 'leadership') p.morale = clamp(p.morale + 15, 0, 100);
  }
  remember(s, 'leader', fmtL(l('{p} assume a liderança de {a}.', '{p} takes over leadership of {a}.'), { p: s.persons[personId].name, a: act.name }), { actId });
  return null;
}

/** Votação de autonomia criativa: integrantes votam conforme personalidade e facção. */
export function openVote(s: GameState, r: Rng, actId: string, topic: L, options: { id: string; label: L }[]): void {
  const act = s.acts[actId];
  const votes: Record<string, string> = {};
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    const pe = personaOf(p);
    const idx = pe.openness > 60 ? options.length - 1 : pe.ambition > 60 ? 0 : r.int(0, options.length - 1);
    votes[id] = options[idx].id;
  }
  // o líder puxa sua facção
  const leader = act.leaderId;
  const fac = s.factions[actId];
  if (leader && fac) for (const g of fac.groups) if (g.includes(leader)) for (const id of g) votes[id] = votes[leader];
  s.votes.push({ id: nextId(s, 'v'), actId, topic, options, votes, week: s.week });
}

export function resolveVote(s: GameState, voteId: string, chosen: string): L {
  const v = s.votes.find((x) => x.id === voteId);
  if (!v) return l('Votação encerrada.', 'Vote closed.');
  s.votes = s.votes.filter((x) => x !== v);
  const act = s.acts[v.actId];
  let agree = 0;
  for (const [pid, opt] of Object.entries(v.votes)) {
    const p = s.persons[pid];
    if (!p) continue;
    if (opt === chosen) {
      agree++;
      p.morale = clamp(p.morale + 3, 0, 100);
    } else {
      p.resentment = clamp(p.resentment + 6, 0, 100);
      p.morale = clamp(p.morale - 2, 0, 100);
    }
  }
  const total = Object.keys(v.votes).length || 1;
  if (act) act.trust = clamp(act.trust + (agree / total > 0.5 ? 3 : -4), 0, 100);
  return agree / total > 0.5 ? l('A maioria apoiou. A banda segue unida.', 'The majority agreed. The band stays united.') : l('Você contrariou a maioria. Houve ressentimento.', 'You overruled the majority. Resentment followed.');
}

// ---------- Reunião negociada ----------
export function reunionTerms(s: GameState, actId: string): { ok: boolean; cost: number; chance: number; reason: L } {
  const act = s.acts[actId];
  if (!act || (act.status !== 'split' && act.status !== 'retired' && act.status !== 'hiatus')) return { ok: false, cost: 0, chance: 0, reason: l('O ato está em atividade.', 'The act is active.') };
  const alive = act.members.map((id) => s.persons[id]).filter((p) => p?.alive);
  if (alive.length < Math.max(1, Math.ceil(act.members.length / 2))) return { ok: false, cost: 0, chance: 0, reason: l('Integrantes demais faleceram.', 'Too many members have died.') };
  let relSum = 0;
  let n = 0;
  for (const a of alive) for (const b of alive) if (a !== b) {
    relSum += a.rel[b.id] ?? 0;
    n++;
  }
  const rel = n ? relSum / n : 30;
  const resent = alive.reduce((t, p) => t + p.resentment, 0) / alive.length;
  const chance = clamp(0.35 + rel / 150 - resent / 200 + (s.flags[`reunionPrep:${actId}`] ? 0.25 : 0), 0.05, 0.95);
  const cost = money(s, 15000 + act.fame * 1500 + act.number1s * 8000);
  return { ok: true, cost, chance, reason: fmtL(l('Relações médias {r}; ressentimento {x}. Nostalgia pode criar demanda.', 'Average relations {r}; resentment {x}. Nostalgia may create demand.'), { r: Math.round(rel), x: Math.round(resent) }) };
}

export function negotiateReunion(s: GameState, r: Rng, actId: string): L {
  const t = reunionTerms(s, actId);
  if (!t.ok) return t.reason;
  if (s.player.cash < t.cost) return l('Caixa insuficiente para a proposta.', 'Not enough cash for the offer.');
  post(s, `reunion:${actId}`, -t.cost, 'artist_dev', 'Proposta de reunião');
  const act = s.acts[actId];
  if (!r.chance(t.chance)) {
    post(s, `reunionRefund:${actId}`, Math.round(t.cost / 2), 'artist_dev', 'Devolução parcial da proposta de reunião');
    remember(s, 'reunion_fail', fmtL(l('A reunião de {a} não sai: velhas feridas pesaram.', '{a}\'s reunion falls through: old wounds weighed in.'), { a: act.name }), { actId });
    return l('Eles recusaram. Metade do valor foi gasto em reuniões e advogados.', 'They declined. Half the money went to meetings and lawyers.');
  }
  act.members = act.members.filter((id) => s.persons[id]?.alive);
  act.status = 'active';
  act.hiatusUntil = undefined;
  act.owner = 'player';
  act.careerEnd = s.year + 8;
  act.momentum = 85;
  act.fans.casual += Math.round(act.fans.core * 20);
  for (const id of act.members) s.persons[id].resentment = Math.max(0, s.persons[id].resentment - 20);
  s.delegated[act.id] = true;
  remember(s, 'reunion', fmtL(l('{a} anuncia a reunião! Ingressos esgotam em minutos.', '{a} announces a reunion! Tickets sell out in minutes.'), { a: act.name }), { actId, important: true });
  return l('Reunião fechada! O ato volta ao seu elenco.', 'Reunion signed! The act rejoins your roster.');
}

// ---------- Carreira solo paralela (GDD §43) ----------
export function startSoloCareer(s: GameState, r: Rng, actId: string, personId: string): L | null {
  const act = s.acts[actId];
  const p = s.persons[personId];
  if (!act || !p || !act.members.includes(personId) || act.members.length < 2) return l('Só integrantes de bandas com 2+ pessoas.', 'Only members of 2+ person bands.');
  if (Object.values(s.soloOf).some((orig) => orig === actId) && Object.entries(s.soloOf).some(([solo]) => s.acts[solo]?.members.includes(personId))) return l('Essa pessoa já tem carreira solo.', 'This person already has a solo career.');
  const cost = money(s, 1500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `solo:${personId}`, -cost, 'artist_dev', `Carreira solo ${p.name}`);
  const solo: Act = {
    ...structuredClone(act),
    id: nextId(s, 'a'), name: p.name, members: [p.id], status: 'emerging', fame: Math.min(15, act.fame * 0.3),
    fans: { casual: Math.round(act.fans.casual * 0.05), active: Math.round(act.fans.active * 0.05), core: Math.round(act.fans.core * 0.05) },
    songs: [], releases: [], lastRelease: -999, peakChart: 999, hits: 0, number1s: 0, awards: 0, legend: false, scandals: 0,
    history: [], logoSeed: r.int(1, 2 ** 30), catalogNo: undefined, contractId: act.contractId, leaderId: p.id, owner: act.owner,
  };
  s.acts[solo.id] = solo;
  actsTouched17(s);
  s.soloOf[solo.id] = act.id;
  s.delegated[solo.id] = true;
  if (p.goal === 'solo') p.morale = clamp(p.morale + 20, 0, 100);
  for (const id of act.members) if (id !== p.id && s.persons[id]) s.persons[id].rel[p.id] = clamp((s.persons[id].rel[p.id] ?? 0) - 5, -100, 100);
  remember(s, 'solo', fmtL(l('{p} lança carreira solo paralela a {a}.', '{p} launches a solo career alongside {a}.'), { p: p.name, a: act.name }), { actId: solo.id, important: true });
  return null;
}

// ---------- Hall da Fama e tributos ----------
function hallOfFameYear(s: GameState): void {
  const cands = Object.values(s.acts)
    .filter((a) => !s.hallOfFame.some((h) => h.actId === a.id) && s.year - a.debutYear >= 25 && (a.number1s + a.hits / 3 + a.awards * 2 + (a.legend ? 5 : 0)) >= 4)
    .sort((a, b) => b.number1s + b.hits / 3 + b.awards * 2 - (a.number1s + a.hits / 3 + a.awards * 2))
    .slice(0, 3);
  for (const a of cands) {
    s.hallOfFame.push({ actId: a.id, year: s.year, name: a.name });
    a.legend = true;
    a.momentum = clamp(a.momentum + 15, 0, 100);
    remember(s, 'hall_of_fame', fmtL(l('{a} entra para o Hall dos Ecos.', '{a} is inducted into the Hall of Echoes.'), { a: a.name }), { actId: a.id, important: true });
    if (a.owner === 'player' || a.releases.some((id) => s.releases[id]?.owner === 'player')) {
      s.player.legacy.cultural = (s.player.legacy.cultural ?? 0) + 3;
      notify(s, fmtL(l('{a} entrou para o Hall dos Ecos!', '{a} was inducted into the Hall of Echoes!'), { a: a.name }), 'good');
    }
  }
}

/** Disco-tributo póstumo: outros atos regravam o repertório (ver studio.ts para a gravação). */
export function tributeCandidates(s: GameState): Act[] {
  return Object.values(s.acts).filter((a) => (a.deceased || a.members.some((id) => s.persons[id] && !s.persons[id].alive)) && a.releases.some((id) => s.releases[id]?.owner === 'player'));
}

export function dynastyMonth(s: GameState, r: Rng): void {
  agingMonth(s, r);
  familyMonth(s, r);
  factionsMonth(s);
  // estresse > 80 registra memória de alerta na primeira passagem (GDD §45.3)
  for (const id of playerActs(s)) for (const pid of s.acts[id].members) {
    const p = s.persons[pid];
    if (!p?.alive) continue;
    const key = `stress80:${pid}`;
    if (p.stress > 80 && !s.flags[key]) {
      s.flags[key] = s.week;
      remember(s, 'stress_alert', fmtL(l('{p} passou do limite de estresse.', '{p} crossed the stress limit.'), { p: p.name }), { actId: id });
      p.morale = clamp(p.morale - 5, 0, 100);
    } else if (p.stress < 60 && s.flags[key]) delete s.flags[key];
    // objetivos pessoais
    if (p.goal === 'credit' && s.songs && Object.values(s.acts[id].songs).some((sid) => s.songs[sid]?.writers.includes(pid))) p.morale = clamp(p.morale + 0.3, 0, 100);
  }
}

export function dynastyYear(s: GameState): void {
  hallOfFameYear(s);
}
