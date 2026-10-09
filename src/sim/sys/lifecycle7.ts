// Ciclo de vida para todo o mundo (rodada 7): todo personagem envelhece e pode morrer, se aposentar,
// voltar da aposentadoria, sair em carreira solo, montar um supergrupo, virar produtor; bandas decidem
// seguir com substituto, seguir menores ou acabar; o catálogo de quem parou continua vendendo para
// sempre; e os NPCs vivem as mesmas tentações do jogador (vícios, reabilitação) enquanto os selos
// rivais pegam empréstimos para não quebrar.

import { clamp, type Rng } from '../../core/rng';
import { nominal } from '../../core/money';
import { familyOf, l } from '../../data/world';
import { personDies, realSafe } from '../dynasty';
import { deferEvents, registerSimHook } from '../ext4';
import { bandName, langForCity, makeAct, makePerson } from '../people';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { genStaff } from '../worldgen';
import { rw } from './realworld';
import { histLocked } from '../history15';
import { resolveThinking } from '../contracts';

type Ctx = Record<string, string | number>;

const alive = (s: GameState, a: Act) => a.members.filter((id) => s.persons[id]?.alive);
const tracked = (a: Act) => a.owner === 'player' || a.fame > 25 || !!a.catalogNo || a.legend;

function deathRisk(age: number, p: Person): number {
  let v = age < 45 ? 0.000015 : age < 60 ? 0.00012 : age < 70 ? 0.0005 : age < 80 ? 0.0017 : age < 90 ? 0.005 : 0.018;
  if (p.health === 'addiction') v += 0.0008;
  if (p.health === 'burnout' || p.health === 'ill') v += 0.0004;
  return Math.min(0.07, v);
}

function formerPush(s: GameState, actId: string, personId: string, reason: 'left' | 'died' | 'retired' | 'fired'): void {
  const f = (rw(s).former[actId] ??= []);
  if (!f.some((x) => x.personId === personId)) f.push({ personId, year: s.year, reason });
}

// ---------------------------------------------------------------- 1. envelhecer e morrer (todos)

function agingAll(s: GameState, r: Rng): void {
  for (const act of Object.values(s.acts)) {
    if (tracked(act)) continue;
    const safe = realSafe(s, act); // os acompanhados já envelhecem em dynasty.ts; reais seguem o roteiro
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p?.alive) continue;
      const age = s.year - p.born;
      if (age > 40 && r.chance(deathRisk(age, p)) && !safe) personDies(s, p, age > 70 ? l('causas naturais', 'natural causes') : l('uma doença', 'an illness'));
    }
  }
}

// ---------------------------------------------------------------- 2. a banda decide se continua

function bandLoss(s: GameState, r: Rng): void {
  const seen = (s.flags as Record<string, number>);
  for (const act of Object.values(s.acts)) {
    if (act.status === 'retired' || act.status === 'split') continue;
    const dead = act.members.filter((id) => s.persons[id] && !s.persons[id].alive);
    if (!dead.length) continue;
    const live = alive(s, act);
    for (const pid of dead) {
      const key = `lc7loss:${act.id}:${pid}`;
      if (seen[key]) continue;
      seen[key] = 1;
      formerPush(s, act.id, pid, 'died');
      if (!live.length) continue;
      if (act.owner === 'player' || act.playerBand) {
        s.x7pending ??= [];
        s.x7pending.push({ act: act.id, person: pid });
        continue;
      }
      // NPC: quanto maior a banda e a fama, mais chance de seguir (catálogo é dinheiro)
      const lead = s.persons[pid]?.role === 'vocal' || act.leaderId === pid;
      const pSplit = clamp(0.15 + (lead ? 0.25 : 0) + (live.length === 1 ? 0.2 : 0) - act.fame / 400, 0.05, 0.8);
      const pReplace = clamp(0.35 + act.fame / 250 - (lead ? 0.1 : 0), 0.1, 0.8);
      const roll = histLocked(s, act) ? 1 : r.next(); // vida real exata: segue sem substituir (o roteiro real cuida do resto)
      if (roll < pSplit) {
        act.status = 'split';
        act.careerEnd = s.year;
        remember(s, 'split', fmtL(l('Sem {p}, {a} decide encerrar a carreira.', 'Without {p}, {a} decides to call it a day.'), { p: s.persons[pid].name, a: act.name }), { actId: act.id, important: act.fame > 30 || !!act.catalogNo });
      } else if (roll < pSplit + pReplace) {
        replaceMember(s, r, act, pid);
      } else {
        act.members = act.members.filter((x) => x !== pid);
        remember(s, 'lineup', fmtL(l('{a} segue sem substituir {p}.', '{a} carries on without replacing {p}.'), { a: act.name, p: s.persons[pid].name }), { actId: act.id, important: act.fame > 30 });
      }
    }
  }
  // decisões do jogador (uma por mês, para não empilhar)
  const pend = s.x7pending ?? [];
  const next = pend.shift();
  if (next && s.acts[next.act] && s.persons[next.person]) emitBandLoss(s, r, next);
}

export function replaceMember(s: GameState, r: Rng, act: Act, oldId: string): Person {
  const old = s.persons[oldId];
  const np = makePerson(s, r, { lang: langForCity(act.city, r), role: old?.role === 'synthetic' ? 'vocal' : old?.role ?? 'guitar', potential: clamp((old?.potential ?? 60) - r.int(0, 10), 30, 95), born: s.year - r.int(20, 34), startFrac: 0.8 });
  s.persons[np.id] = np;
  act.members = act.members.map((x) => (x === oldId ? np.id : x));
  if (!act.members.includes(np.id)) act.members.push(np.id);
  if (act.leaderId === oldId) act.leaderId = act.members[0];
  formerPush(s, act.id, oldId, old?.alive ? 'left' : 'died');
  remember(s, 'lineup', fmtL(l('{a} segue em frente: {n} assume o lugar de {o}.', '{a} carries on: {n} takes over from {o}.'), { a: act.name, n: np.name, o: old?.name ?? '?' }), { actId: act.id, important: act.fame > 25 || act.owner === 'player' });
  return np;
}

declare module '../types' { interface GameState { x7pending?: { act: string; person: string }[] } }

function emitBandLoss(s: GameState, r: Rng, ctx: { act: string; person: string }): void {
  // usa o motor de eventos (decisão no mês) com o evento registrado abaixo
  void r;
  s.decisions.push({
    id: `bandloss:${ctx.act}:${ctx.person}`, eventId: 'lc7_band_loss', cat: 'band', week: s.week, tags: [], defaultOption: 'replace',
    title: fmtL(l('{a} perdeu {p}', '{a} lost {p}'), { a: s.acts[ctx.act].name, p: s.persons[ctx.person].name }),
    text: l('A banda precisa decidir: seguir com alguém novo, seguir menor, fazer uma pausa ou acabar. O catálogo continua vendendo em qualquer caso.', 'The band must decide: carry on with someone new, carry on smaller, take a break or end it. The catalog keeps selling either way.'),
    options: [
      { id: 'replace', label: l('Seguir com um substituto ($4.000)', 'Carry on with a replacement ($4,000)'), hint: l('Fãs mais antigos podem estranhar.', 'Older fans may balk.') },
      { id: 'smaller', label: l('Seguir sem substituir', 'Carry on without replacing') },
      { id: 'hiatus', label: l('Pausa de luto (1 ano)', 'Mourning hiatus (1 year)'), hint: l('Volta com o catálogo valorizado.', 'Returns with a more valuable catalog.') },
      { id: 'split', label: l('Encerrar a banda', 'End the band'), hint: l('Vira lenda; o catálogo segue vendendo.', 'Becomes a legend; the catalog keeps selling.') },
    ],
    ctx: { act: ctx.act, person: ctx.person },
  });
}

const actOf = (s: GameState, c: Ctx) => s.acts[String(c.act)];

deferEvents([{
  id: 'lc7_band_loss', cat: 'band', tone: 'bad', tags: [], cooldown: 0, forcedOnly: true,
  title: l('{act} perdeu {person}', '{act} lost {person}'),
  text: l('A banda precisa decidir como seguir.', 'The band must decide how to go on.'),
  options: [
    { id: 'replace', label: l('Seguir com um substituto', 'Carry on with a replacement'), apply: (s: GameState, r: Rng, c: Ctx) => { const a = actOf(s, c); if (!a) return; post(s, `lc7sub:${a.id}`, -money(s, 4000), 'artist_dev', 'Substituto'); replaceMember(s, r, a, String(c.person)); a.fans.core = Math.round(a.fans.core * 0.93); } },
    { id: 'smaller', label: l('Seguir sem substituir', 'Carry on without replacing'), apply: (s: GameState, _r: Rng, c: Ctx) => { const a = actOf(s, c); if (!a) return; a.members = a.members.filter((x) => x !== String(c.person)); if (!a.members.length) a.status = 'split'; } },
    { id: 'hiatus', label: l('Pausa de luto', 'Mourning hiatus'), apply: (s: GameState, _r: Rng, c: Ctx) => { const a = actOf(s, c); if (!a) return; a.members = a.members.filter((x) => x !== String(c.person)); a.status = 'hiatus'; a.hiatusUntil = s.week + 52; } },
    { id: 'split', label: l('Encerrar', 'End it'), apply: (s: GameState, _r: Rng, c: Ctx) => { const a = actOf(s, c); if (!a) return; a.status = 'split'; a.careerEnd = s.year; a.legend = a.legend || a.fame > 40; remember(s, 'split', fmtL(l('{a} encerra a carreira.', '{a} calls it a day.'), { a: a.name }), { actId: a.id, important: true }); } },
  ],
}] as never[]);

// ---------------------------------------------------------------- 3. aposentadoria e volta

function retirements(s: GameState, r: Rng): void {
  for (const act of Object.values(s.acts)) {
    if (act.playerBand || act.owner === 'player' || histLocked(s, act)) continue;
    if (act.status !== 'active' && act.status !== 'hiatus') continue;
    const live = alive(s, act);
    if (!live.length) { act.status = 'retired'; act.deceased = true; continue; }
    // solo idoso se aposenta (limiar pessoal)
    if (act.members.length === 1) {
      const p = s.persons[act.members[0]];
      if (p && s.year - p.born >= (p.retireAge ?? 68 + (act.fame > 60 ? 8 : 0)) && r.chance(0.015)) {
        act.status = 'retired';
        act.careerEnd = s.year;
        remember(s, 'retired', fmtL(l('{a} anuncia a aposentadoria aos {n} anos.', '{a} announces retirement at {n}.'), { a: act.name, n: s.year - p.born }), { actId: act.id, important: act.fame > 30 || !!act.catalogNo });
      }
    }
  }
}

function comebacks(s: GameState, r: Rng): void {
  for (const act of Object.values(s.acts)) {
    if (act.status !== 'retired' && act.status !== 'split') continue;
    if (act.deceased || act.owner === 'player' || act.playerBand || histLocked(s, act)) continue;
    const live = alive(s, act);
    if (!live.length) continue;
    const off = s.year - act.careerEnd;
    if (off < 2) continue;
    const ages = live.map((id) => s.year - (s.persons[id]?.born ?? s.year));
    if (Math.min(...ages) > 82) continue;
    // nostalgia: 15–30 anos depois o público quer de volta; fama e catálogo pesam
    const nostalgia = off >= 15 && off <= 32 ? 2 : off >= 8 ? 1.2 : 0.6;
    const chance = (0.0006 + act.fame / 60000 + (act.legend ? 0.0015 : 0)) * nostalgia * (act.status === 'split' && live.length < 2 ? 0.3 : 1);
    if (!r.chance(chance)) continue;
    act.status = 'active';
    act.momentum = clamp(act.momentum + 45, 0, 100);
    act.careerEnd = s.year + r.int(2, 9);
    act.fans.casual = Math.round(act.fans.casual * 1.25);
    const reunion = act.members.length > 1;
    remember(s, 'comeback', fmtL(reunion ? l('{a} anuncia a volta depois de {n} anos!', '{a} announce a reunion after {n} years!') : l('{a} sai da aposentadoria depois de {n} anos!', '{a} comes out of retirement after {n} years!'), { a: act.name, n: off }), { actId: act.id, important: true });
    if (act.fame > 40) notify(s, fmtL(l('Volta: {a} está de volta aos palcos.', 'Comeback: {a} is back on stage.'), { a: act.name }), 'event');
  }
}

// ---------------------------------------------------------------- 4. carreiras: solo, supergrupo, produtor

function careerMoves(s: GameState, r: Rng): void {
  const acts = Object.values(s.acts);
  // carreira solo (lateral): integrante famoso e ambicioso lança um projeto próprio
  for (const act of acts) {
    if (act.status !== 'active' || act.members.length < 2 || act.fame < 38 || act.owner === 'player' || act.playerBand || histLocked(s, act)) continue;
    if (!r.chance(0.004)) continue;
    const cands = alive(s, act).map((id) => s.persons[id]).filter((p) => p.goal === 'solo' || p.ambition === 'fame' || p.role === 'vocal');
    const p = cands.length ? r.pick(cands) : undefined;
    if (!p || acts.some((a) => a.members.length === 1 && a.members[0] === p.id)) continue;
    const solo = makeAct(s, r, { name: p.name, genre: act.genre, city: act.city, members: 1, potential: p.potential, formed: s.year, debutYear: s.year, fame: act.fame * 0.45 });
    // a pessoa gerada pelo makeAct dá lugar à pessoa real
    const gen = solo.members[0];
    delete s.persons[gen];
    solo.members = [p.id];
    solo.leaderId = p.id;
    solo.status = 'active';
    solo.fans = { casual: Math.round(act.fans.casual * 0.18), active: Math.round(act.fans.active * 0.15), core: Math.round(act.fans.core * 0.1) };
    const leaves = r.chance(0.35);
    if (leaves) { act.members = act.members.filter((x) => x !== p.id); formerPush(s, act.id, p.id, 'left'); }
    remember(s, 'solo', fmtL(leaves ? l('{p} deixa {a} para seguir carreira solo.', '{p} leaves {a} to go solo.') : l('{p} ({a}) lança carreira solo paralela.', '{p} ({a}) launches a parallel solo career.'), { p: p.name, a: act.name }), { actId: act.id, important: act.fame > 45 });
  }
  // supergrupo: dois nomes de bandas diferentes do mesmo universo musical
  if (r.chance(0.025)) {
    const pool = acts.filter((a) => a.fame > 45 && (a.status === 'active' || a.status === 'split' || a.status === 'hiatus') && a.owner !== 'player' && !a.playerBand && !histLocked(s, a));
    if (pool.length >= 2) {
      const a = r.pick(pool);
      const b = r.pick(pool.filter((x) => x !== a && familyOf(x.genre) === familyOf(a.genre)));
      const pa = a ? s.persons[r.pick(alive(s, a))] : undefined;
      const pb = b ? s.persons[r.pick(alive(s, b))] : undefined;
      if (a && b && pa && pb && pa.id !== pb.id) {
        const sg = makeAct(s, r, { genre: a.genre, city: a.city, members: 2, potential: Math.max(pa.potential, pb.potential), formed: s.year, debutYear: s.year, fame: (a.fame + b.fame) * 0.35 });
        for (const id of sg.members) delete s.persons[id];
        sg.members = [pa.id, pb.id];
        sg.leaderId = pa.id;
        sg.name = r.chance(0.5) ? `${pa.name.split(' ').pop()} & ${pb.name.split(' ').pop()}` : bandName(r, langForCity(a.city, r), familyOf(a.genre), 3);
        sg.status = 'active';
        sg.careerEnd = s.year + r.int(2, 8);
        sg.fans = { casual: Math.round((a.fans.casual + b.fans.casual) * 0.12), active: Math.round((a.fans.active + b.fans.active) * 0.1), core: Math.round((a.fans.core + b.fans.core) * 0.06) };
        remember(s, 'supergroup', fmtL(l('Supergrupo: {p} ({a}) e {q} ({b}) formam {n}.', 'Supergroup: {p} ({a}) and {q} ({b}) form {n}.'), { p: pa.name, a: a.name, q: pb.name, b: b.name, n: sg.name }), { actId: sg.id, important: true });
      }
    }
  }
  // aposentados com ouvido viram produtores (aparecem no mercado de profissionais)
  if (r.chance(0.08)) {
    const ret = acts.filter((a) => (a.status === 'retired' || a.status === 'split') && !a.deceased && a.fame > 25);
    const a = ret.length ? r.pick(ret) : undefined;
    const p = a ? s.persons[r.pick(alive(s, a).length ? alive(s, a) : a.members)] : undefined;
    if (a && p?.alive && s.year - p.born < 75 && !s.professionals.some((x) => x.name === p.name) && !s.player.staff.some((x) => x.name === p.name)) {
      const st = genStaff(s, r, 'producer', clamp(Math.round(p.skills.prod * 0.6 + p.skills.comp * 0.4 + 10), 30, 95));
      st.name = p.name;
      s.professionals.push(st);
      remember(s, 'producer', fmtL(l('{p} ({a}) agora produz outros artistas e está disponível para contratação.', '{p} ({a}) now produces other artists and is available for hire.'), { p: p.name, a: a.name }), { actId: a.id });
    }
  }
}

// ---------------------------------------------------------------- 5. vícios e saúde dos NPCs

function npcVices(s: GameState, r: Rng): void {
  const mine = new Set(playerActs(s));
  const eraRisk = s.year >= 1965 && s.year < 1995 ? 1.6 : 1;
  for (const act of Object.values(s.acts)) {
    if (mine.has(act.id) || act.status !== 'active') continue;
    if (!r.chance(0.12)) continue; // amostra: barato e suficiente
    for (const id of act.members) {
      const p = s.persons[id];
      if (!p?.alive || p.health === 'addiction') {
        if (p?.alive && p.health === 'addiction' && r.chance(0.06)) {
          p.health = 'recovering';
          if (act.fame > 40) remember(s, 'rehab', fmtL(l('{p} ({a}) sai da reabilitação.', '{p} ({a}) leaves rehab.'), { p: p.name, a: act.name }), { actId: act.id });
        }
        continue;
      }
      const party = (p.traits.includes('party') ? 2 : 1) * (p.traits.includes('rebel') ? 1.4 : 1) * (p.traits.includes('disciplined') ? 0.4 : 1);
      const fameF = 0.5 + act.fame / 60;
      if (r.chance(0.004 * party * fameF * eraRisk)) {
        p.health = 'addiction';
        p.stress = clamp(p.stress + 15, 0, 100);
        act.scandals += r.chance(0.4) ? 1 : 0;
        if (act.fame > 45) remember(s, 'addiction', fmtL(l('Bastidores: {p} ({a}) luta contra a dependência.', 'Backstage: {p} ({a}) struggles with addiction.'), { p: p.name, a: act.name }), { actId: act.id });
      }
    }
  }
}

// ---------------------------------------------------------------- 6. catálogo vende para sempre

function catalogIncome(s: GameState): void {
  const byAct: Record<string, number> = {};
  for (const rel of Object.values(s.releases)) {
    if (rel.live || rel.owner === 'player') continue;
    const act = s.acts[rel.actId];
    if (!act || act.playerBand) continue;
    // ~1% das vendas históricas por ano, mais para quem é lenda ou morreu (redescoberta)
    const k = 0.0009 * (act.legend ? 1.5 : 1) * (act.deceased ? 1.3 : 1);
    const units = rel.totalUnits * k;
    if (units < 1) continue;
    rel.totalUnits += Math.round(units);
    const gross = Math.round(units * nominal(rel.type === 'lp' ? 6 : 1.4, s.year));
    const lb = s.labels[rel.owner];
    if (lb?.active) {
      lb.cash += Math.round(gross * 0.8);
      lb.revenueYear += gross;
    }
    byAct[act.id] = (byAct[act.id] ?? 0) + Math.round(gross * 0.2);
  }
  for (const [id, v] of Object.entries(byAct)) s.acts[id].cash += v;
}

// ---------------------------------------------------------------- 7. selos rivais pegam empréstimo

function labelLoans(s: GameState, r: Rng): void {
  for (const lb of Object.values(s.labels)) {
    if (!lb.active) continue;
    const debt = lb.debt ?? 0;
    if (debt > 0) {
      const interest = Math.round(debt * 0.009);
      const pay = Math.min(lb.cash > 0 ? lb.cash * 0.1 : 0, debt);
      lb.cash -= interest + pay;
      lb.debt = Math.max(0, debt - pay);
    }
    if (lb.cash < -money(s, 50000) && debt < money(s, 1_500_000) && r.chance(0.5)) {
      const amount = money(s, 250000 + lb.reputation * 3000);
      lb.cash += amount;
      lb.debt = (lb.debt ?? 0) + amount;
      lb.lastDecision = fmtL(l('pegou empréstimo bancário de {v}', 'took a bank loan of {v}'), { v: Math.round(amount / 100) });
    }
  }
}

// ---------------------------------------------------------------- 8. manutenção

function yearly(s: GameState): void {
  // composições guardadas de NPCs que nunca vão sair (ato parado ou ideia velha) somem do save
  const mine = new Set(playerActs(s));
  for (const act of Object.values(s.acts)) {
    if (mine.has(act.id) || act.playerBand) continue;
    const stopped = act.status === 'retired' || act.status === 'split';
    const keep: string[] = [];
    for (const id of act.songs) {
      const so = s.songs[id];
      if (!so) continue;
      if (!so.releaseId && !so.vault && (stopped || s.week - so.createdWeek > 156)) { delete s.songs[id]; continue; }
      keep.push(id);
    }
    act.songs = keep;
  }
  const cr = (s as unknown as { x4: { creation?: { songs?: Record<string, unknown> } } }).x4.creation;
  if (cr?.songs) for (const id of Object.keys(cr.songs)) if (!s.songs[id]) delete cr.songs[id];
  for (const id of Object.keys(s.reviews)) {
    const rel = s.releases[id];
    if (!rel) { delete s.reviews[id]; continue; }
    if (rel.owner !== 'player' && !s.acts[rel.actId]?.playerBand && rel.year < s.year - 2) delete s.reviews[id];
  }
  for (const k of Object.keys(s.flags)) if (k.startsWith('lc7loss:')) {
    const [, actId] = k.split(':');
    if (!s.acts[actId]) delete s.flags[k];
  }
}

registerSimHook('month', 'lifecycle7', (s, r) => {
  agingAll(s, r);
  bandLoss(s, r);
  retirements(s, r);
  comebacks(s, r);
  careerMoves(s, r);
  npcVices(s, r);
  catalogIncome(s);
  labelLoans(s, r);
});
registerSimHook('year', 'lifecycle7', (s) => yearly(s));

// rodada 7: quem pediu tempo para pensar responde ao longo das semanas (não espera o fim do mês)
registerSimHook('week', 'offers7', (s, r) => resolveThinking(s, r));
