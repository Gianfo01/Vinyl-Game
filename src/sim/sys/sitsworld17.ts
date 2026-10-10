// Rodada 17 (onda 1, B) — o DIRETOR CRIATIVO joga situações em TODOS os personagens: 31 situações novas (além das 11
// sementes de sits17) sobre carreira, amor, dinheiro, fama, dinâmica de banda, política de selo e momentos de época
// (alistamento, censura, MTV, Napster, streaming, invasão britânica, antidisco). NPCs escolhem pelos traços
// (persona13 → weightByTraits); se o elenco envolve você ou seu selo, vira cartão com chance e custo à vista.
// Cada desfecho mexe em estresse (stress17), obrigações (holds17), escândalo (scandal17), fama/embalo, contratos e
// carreiras (npc17) — e vira Fato com o porquê (situations17).

import { clamp, type Rng } from '../../core/rng';
import { cityById, familyOf, l } from '../../data/world';
import { endContract, signWithRival } from '../contracts';
import { grantHold } from '../holds17';
import { histLocked } from '../history15';
import { unreleasedRecorded } from '../production';
import { scandal } from '../scandal17';
import { addStress, relieveLong, stressOf } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { addHype } from './hype12';
import { leaders } from './leaders10';
import { replaceMember } from './lifecycle7';
import { goSolo16, leaveBand16 } from './lineup16';
import { m14, mgrName } from './managers14';
import { mgrById } from '../../data/managers14';
import { becomeManager17, leaveLabel17, npc17, okAct17, okPerson17, pickNewLabel17 } from './npc17';
import { per13, type P13 } from './persona13';
import { registerSituation, type SitCtx } from './situations17';

// ---------------------------------------------------------------- utilidades

const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging');
const F = (P: P13 | null, k: string): number => (P?.facets[k as keyof P13['facets']] ?? 50) / 50;
const nm = (s: GameState, id?: string): string => (!id ? '?' : s.persons[id]?.name ?? s.acts[id]?.name ?? s.labels[id]?.name ?? (id.startsWith('l:') ? leaders(s)?.L[id.slice(2)]?.name : id.startsWith('e:') && mgrById[id.slice(2)] ? mgrName(s, mgrById[id.slice(2)]) : undefined) ?? '?');
const A = (s: GameState, c: SitCtx): Act | undefined => (c.act ? s.acts[c.act] : undefined);
const mineA = (s: GameState, a: Act): boolean => a.owner === 'player' || playerActs(s).includes(a.id);
/** Atos com história para contar: os seus e os NPC notáveis (mundo inteiro). */
const pool = (s: GameState, minFame = 25): Act[] => { const mine = new Set(playerActs(s)); return Object.values(s.acts).filter((a) => live(a) && (mine.has(a.id) || a.fame >= minFame)); };
const npcMembers = (s: GameState, a: Act): Person[] => a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive && !p.isPlayer);
const leadOf = (s: GameState, a: Act): Person | undefined => { const ms = npcMembers(s, a); return ms.find((p) => p.id === a.leaderId) ?? ms[0]; };
const pickR = <T>(r: Rng, xs: T[]): T | undefined => (xs.length ? xs[r.int(0, xs.length - 1)] : undefined);
const P = (s: GameState, pid?: string): P13 | null => (pid ? per13(s, `p:${pid}`) : null);
const mom = (a: Act | undefined, d: number) => { if (a) a.momentum = clamp(a.momentum + d, 0, 100); };
const fame = (a: Act | undefined, d: number) => { if (a) a.fame = clamp(a.fame + d, 0, 100); };
const fans = (a: Act | undefined, k: 'casual' | 'active' | 'core', m: number) => { if (a) a.fans[k] = Math.max(0, Math.round(a.fans[k] * m)); };
const insp = (s: GameState, pid: string | undefined, d: number) => { const p = pid ? s.persons[pid] : undefined; if (p) p.inspiration = clamp(p.inspiration + d, 0, 100); };
const resent = (s: GameState, pid: string | undefined, d: number) => { const p = pid ? s.persons[pid] : undefined; if (p) p.resentment = clamp(p.resentment + d, 0, 100); };
const rel = (s: GameState, a: string, b: string, d: number) => { const x = s.persons[a], y = s.persons[b]; if (x) x.rel[b] = clamp((x.rel[b] ?? 0) + d, -100, 100); if (y) y.rel[a] = clamp((y.rel[a] ?? 0) + d, -100, 100); };
/** Paga (ou recebe, com valor negativo) em dólares da época: você, o selo do ato ou o próprio ato. */
const pay = (s: GameState, c: SitCtx, key: string, real: number, memo: string): void => {
  const a = A(s, c);
  const v = money(s, real);
  if (a && mineA(s, a)) post(s, `sitw17:${key}:${s.week}`, -v, 'misc', memo);
  else if (a) { const lb = a.owner ? s.labels[a.owner] : undefined; if (lb && real > 0 && key.startsWith('lb')) lb.cash -= v; else a.cash -= v; }
};
const yr = (s: GameState, a: number, b: number) => s.year >= a && s.year <= b;
const marketOf = (a: Act): string => cityById[a.city]?.market ?? 'na';

// ================================================================ BANDA

registerSituation({
  id: 'creative_clash', pressure: 'heart', cost: 1, cooldown: 3, tone: 'bad',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const cs = pool(s).filter((a) => npcMembers(s, a).length >= 2);
    for (const a of r.shuffle(cs).slice(0, 12)) {
      const ms = npcMembers(s, a); const lead = leadOf(s, a)!;
      const other = ms.filter((p) => p.id !== lead.id).sort((x, y) => (lead.rel[x.id] ?? 0) - (lead.rel[y.id] ?? 0))[0];
      if (other && ((lead.rel[other.id] ?? 0) < -5 || F(P(s, lead.id), 'ego') > 1.3)) return { hero: lead.id, act: a.id, cast: { person: lead.id, other: other.id }, data: {} };
    }
    return null;
  },
  title: (s, c) => fmtL(l('{a}: brigas no estúdio', '{a}: fights in the studio'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('{p} e {o} discordam sobre o rumo do disco novo. Alguém vai ceder?', '{p} and {o} disagree about where the new record should go. Will someone give in?'), { p: nm(s, c.hero), o: nm(s, c.cast.other) }),
  options: [
    { id: 'impose', label: l('O líder impõe a visão', 'The leader imposes the vision'), hint: l('Inspiração do líder +10; o outro: ressentimento +15, estresse +10.', 'Leader inspiration +10; the other: resentment +15, stress +10.'), weightByTraits: (p) => F(p, 'ego') + F(p, 'teimosia'),
      apply: (s, c) => { insp(s, c.hero, 10); resent(s, c.cast.other, 15); addStress(s, c.cast.other, 10, l('Voto vencido na banda', 'Outvoted in the band')); } },
    { id: 'split_album', label: l('Cada um escreve metade', 'Each writes half'), hint: l('Inspiração +5 para os dois; 25% de virar mágoa.', 'Inspiration +5 for both; 25% chance it becomes a grudge.'), weightByTraits: (p) => F(p, 'curiosidade') + F(p, 'humor') * 0.5,
      apply: (s, c, r) => { insp(s, c.hero, 5); insp(s, c.cast.other, 5); if (r.chance(0.25)) { grantHold(s, { holder: c.cast.other, target: c.act!, kind: 'grievance', strength: 30, months: 24, text: l('disco dividido ao meio', 'a record split down the middle'), src: 'sitw17', quiet: true }); return fmtL(l('{a} dividiu o disco, mas {o} saiu magoado(a).', '{a} split the record, but {o} came out hurt.'), { a: nm(s, c.act), o: nm(s, c.cast.other) }); } } },
    { id: 'compromise', label: l('Meio-termo', 'Compromise'), hint: l('Relação +10; inspiração −5 para os dois.', 'Relationship +10; inspiration −5 for both.'), weightByTraits: (p) => F(p, 'empatia') + F(p, 'paciencia'),
      apply: (s, c) => { rel(s, c.hero, c.cast.other, 10); insp(s, c.hero, -5); insp(s, c.cast.other, -5); } },
  ],
});

registerSituation({
  id: 'solo_offer', pressure: 'power', cost: 2, cooldown: 6, tone: 'mixed',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 35).filter((x) => npcMembers(s, x).length >= 2 && x.members.length >= 3 && !histLocked(s, x) && okPerson17(s, x)));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('Proposta solo para {p}', 'Solo offer for {p}'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('Um selo oferece a {p} um contrato solo — sem {a}.', 'A label offers {p} a solo deal — without {a}.'), { p: nm(s, c.hero), a: nm(s, c.act) }),
  options: [
    { id: 'solo', label: l('Sair em carreira solo', 'Go solo'), hint: l('{p} deixa a banda e estreia sozinho(a) com parte dos fãs; a banda se ressente.', 'They leave the band and debut alone with part of the fans; the band resents it.'), weightByTraits: (p) => F(p, 'ego') + F(p, 'ambicao') - 0.6,
      apply: (s, c, r) => { const a = A(s, c); const p = s.persons[c.hero]; if (!a || !p) return; leaveBand16(s, a, p, 'solo'); const so = goSolo16(s, r, p, a); for (const m of a.members) rel(s, m, p.id, -20); return fmtL(l('{p} saiu de {a} para a carreira solo ({s}).', '{p} left {a} for a solo career ({s}).'), { p: p.name, a: a.name, s: so.name }); } },
    { id: 'side', label: l('Projeto paralelo', 'Side project'), hint: l('Inspiração +10, estresse +8; fica na banda.', 'Inspiration +10, stress +8; stays in the band.'), weightByTraits: (p) => F(p, 'curiosidade') + F(p, 'ambicao') * 0.5,
      apply: (s, c) => { insp(s, c.hero, 10); addStress(s, c.hero, 8, l('Duas carreiras ao mesmo tempo', 'Two careers at once')); } },
    { id: 'stay', label: l('Recusar: a banda vem primeiro', 'Refuse: the band comes first'), hint: l('Relação com a banda +10; lealdade registrada.', 'Band relationship +10; loyalty on record.'), weightByTraits: (p) => F(p, 'lealdade') + F(p, 'empatia') * 0.5,
      apply: (s, c) => { const a = A(s, c); for (const m of a?.members ?? []) if (m !== c.hero) rel(s, m, c.hero, 10); grantHold(s, { holder: c.act!, target: c.hero, kind: 'loyalty', strength: 35, months: 36, text: l('recusou carreira solo pela banda', 'turned down a solo career for the band'), src: 'sitw17', quiet: true }); } },
  ],
});

registerSituation({
  id: 'band_romance', pressure: 'heart', cost: 1, cooldown: 6, tone: 'mixed',
  when: () => true,
  actorsPick: (s, _c, r) => {
    for (const a of r.shuffle(pool(s)).slice(0, 15)) {
      const ms = npcMembers(s, a);
      for (const x of ms) for (const y of ms) if (x.id < y.id && (x.rel[y.id] ?? 0) >= 35 && F(P(s, x.id), 'romantismo') > 1.1) return { hero: x.id, act: a.id, cast: { person: x.id, other: y.id }, data: {} };
    }
    return null;
  },
  title: (s, c) => fmtL(l('Romance dentro de {a}', 'Romance inside {a}'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('{p} e {o}, da mesma banda, estão apaixonados. A imprensa ainda não sabe.', '{p} and {o}, from the same band, are in love. The press does not know yet.'), { p: nm(s, c.hero), o: nm(s, c.cast.other) }),
  options: [
    { id: 'public', label: l('Assumir em público', 'Go public'), hint: l('Fama +2 e manchetes; se terminar, a banda balança.', 'Fame +2 and headlines; if it ends, the band shakes.'), weightByTraits: (p) => F(p, 'vaidade') + F(p, 'coragem'),
      apply: (s, c) => { const a = A(s, c); fame(a, 2); if (a) addHype(s, `a:${a.id}`, 'romance17', l('Casal da banda', 'In-band couple'), 6); rel(s, c.hero, c.cast.other, 15); } },
    { id: 'secret', label: l('Manter em segredo', 'Keep it secret'), hint: l('Inspiração +10 para os dois; a imprensa ganha um segredo.', 'Inspiration +10 for both; the press gets a secret.'), weightByTraits: (p) => F(p, 'ansiedade') + F(p, 'romantismo'),
      apply: (s, c) => { insp(s, c.hero, 10); insp(s, c.cast.other, 10); grantHold(s, { holder: 'press', target: c.act!, kind: 'secret', strength: 35, months: 24, proof: 0, text: fmtL(l('{p} e {o} juntos em segredo', '{p} and {o} secretly together'), { p: nm(s, c.hero), o: nm(s, c.cast.other) }), src: 'sitw17', data: { sk: 'sex' } }); } },
    { id: 'end', label: l('Terminar antes de estragar a banda', 'End it before it wrecks the band'), hint: l('Estresse +10 para os dois.', 'Stress +10 for both.'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'ambicao') * 0.5,
      apply: (s, c) => { addStress(s, c.hero, 10, l('Amor desfeito', 'Love called off')); addStress(s, c.cast.other, 10, l('Amor desfeito', 'Love called off')); } },
  ],
});

registerSituation({
  id: 'credit_split', pressure: 'money', cost: 1, cooldown: 6, tone: 'bad',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 30).filter((x) => x.hits >= 1 && npcMembers(s, x).length >= 2));
    const w = a ? npcMembers(s, a).sort((x, y) => y.skills.comp - x.skills.comp)[0] : undefined;
    return a && w ? { hero: w.id, act: a.id, cast: { person: w.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('Quem escreveu o sucesso de {a}?', 'Who wrote {a}\'s hit?'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('{p} diz que compôs quase tudo e quer a maior parte dos créditos (e dos direitos autorais). O resto da banda discorda.', '{p} says they wrote almost everything and wants most of the credits (and publishing). The rest of the band disagrees.'), { p: nm(s, c.hero) }),
  options: [
    { id: 'equal', label: l('Divisão igual para todos', 'Equal split for everyone'), hint: l('Banda unida (relação +8); {p} se ressente (+10).', 'Band united (relationship +8); the writer resents it (+10).'), weightByTraits: (p) => F(p, 'generosidade') + F(p, 'lealdade'),
      apply: (s, c) => { const a = A(s, c); for (const m of a?.members ?? []) if (m !== c.hero) for (const n of a!.members) if (n !== m) rel(s, m, n, 4); resent(s, c.hero, 10); } },
    { id: 'writer', label: l('O compositor leva a maior parte', 'The writer takes the lion\'s share'), hint: l('{p} feliz; os outros: ressentimento +15 e mágoa.', 'The writer is happy; the others: resentment +15 and a grudge.'), weightByTraits: (p) => F(p, 'ego') + F(p, 'ambicao'),
      apply: (s, c) => { const a = A(s, c); for (const m of a?.members ?? []) if (m !== c.hero) { resent(s, m, 15); grantHold(s, { holder: m, target: c.hero, kind: 'grievance', strength: 30, months: 36, text: l('ficou sem crédito do sucesso', 'left without credit for the hit'), src: 'sitw17', quiet: true }); } addStress(s, c.hero, -5, l('Crédito reconhecido', 'Credit recognized')); } },
    { id: 'lawyer', label: l('Advogado decide pela contribuição', 'A lawyer splits by contribution'), hint: l('Custa $2.000 (era); justo para todos, estresse −5.', 'Costs $2,000 (era); fair to all, stress −5.'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'perfeccionismo') * 0.5,
      apply: (s, c) => { pay(s, c, 'lawyer', 2000, 'Advogado de créditos'); const a = A(s, c); for (const m of a?.members ?? []) addStress(s, m, -5, l('Créditos resolvidos', 'Credits settled')); } },
  ],
});

registerSituation({
  id: 'fire_member', pressure: 'power', cost: 2, cooldown: 6, tone: 'bad',
  when: () => true,
  actorsPick: (s, _c, r) => {
    for (const a of r.shuffle(pool(s)).slice(0, 15)) {
      if (a.members.length < 3 || histLocked(s, a)) continue;
      const lead = leadOf(s, a);
      const weak = npcMembers(s, a).filter((p) => p.id !== lead?.id && (p.fatigue > 60 || stressOf(s, p.id).short > 60 || (lead?.rel[p.id] ?? 0) < -25))[0];
      if (lead && weak) return { hero: lead.id, act: a.id, cast: { person: lead.id, victim: weak.id }, data: {} };
    }
    return null;
  },
  title: (s, c) => fmtL(l('{a} quer trocar {v}', '{a} wants to replace {v}'), { a: nm(s, c.act), v: nm(s, c.cast.victim) }),
  text: (s, c) => fmtL(l('{v} anda faltando a ensaios e brigando com {p}. A banda discute demitir.', '{v} keeps missing rehearsals and clashing with {p}. The band is discussing a firing.'), { v: nm(s, c.cast.victim), p: nm(s, c.hero) }),
  options: [
    { id: 'fire', label: l('Demitir e chamar outro', 'Fire and bring someone in'), hint: l('Entra um substituto; quem saiu guarda mágoa e pode falar mal.', 'A replacement joins; the one fired holds a grudge and may badmouth.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'teimosia') - F(p, 'lealdade') * 0.5,
      apply: (s, c, r) => { const a = A(s, c); const v = c.cast.victim; if (!a || !a.members.includes(v)) return; const np = replaceMember(s, r, a, v); addStress(s, v, 15, l('Demitido(a) da banda', 'Fired from the band')); grantHold(s, { holder: v, target: a.id, kind: 'grievance', strength: 45, months: 48, text: l('demitido(a) da banda', 'fired from the band'), src: 'sitw17', quiet: true }); return fmtL(l('{a} demitiu {v}; {n} entra no lugar.', '{a} fired {v}; {n} comes in.'), { a: a.name, v: nm(s, v), n: np.name }); } },
    { id: 'severance', label: l('Demitir com acerto', 'Fire with a payout'), hint: l('Custa $1.500 (era); a mágoa é menor.', 'Costs $1,500 (era); a smaller grudge.'), weightByTraits: (p) => F(p, 'generosidade') + F(p, 'disciplina') * 0.5,
      apply: (s, c, r) => { const a = A(s, c); const v = c.cast.victim; if (!a || !a.members.includes(v)) return; pay(s, c, 'severance', 1500, 'Acerto de saída'); replaceMember(s, r, a, v); grantHold(s, { holder: v, target: a.id, kind: 'grievance', strength: 20, months: 24, text: l('saiu com acerto', 'left with a payout'), src: 'sitw17', quiet: true }); } },
    { id: 'chance', label: l('Dar mais uma chance', 'Give one more chance'), hint: l('Estresse do líder +5; 50% de melhorar (relação +15).', 'Leader stress +5; 50% it gets better (relationship +15).'), weightByTraits: (p) => F(p, 'lealdade') + F(p, 'empatia'),
      apply: (s, c, r) => { addStress(s, c.hero, 5, l('Paciência com a banda', 'Patience with the band')); if (r.chance(0.5)) rel(s, c.hero, c.cast.victim, 15); } },
  ],
});

// ================================================================ CARREIRA

registerSituation({
  id: 'career_switch', pressure: 'power', cost: 1, cooldown: 8, tone: 'mixed', npcOnly: true,
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, Object.values(s.acts).filter((x) => okAct17(s, x) && okPerson17(s, x) && x.fame >= 20 && x.momentum < 25 && x.members.length <= 2));
    const p = a ? leadOf(s, a) : undefined;
    return a && p && s.year - p.born >= 40 && !npc17(s).car[`p:${p.id}`] ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('{p} pensa em mudar de vida', '{p} is thinking about a new life'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('A carreira de {a} esfriou. {p} recebe convites para empresariar gente nova.', '{a}\'s career has cooled. {p} is getting offers to manage new talent.'), { a: nm(s, c.act), p: nm(s, c.hero) }),
  options: [
    { id: 'manager', label: l('Virar empresário(a)', 'Become a manager'), hint: l('Encerra a carreira e passa a disputar clientes como empresário(a).', 'Ends the career and starts competing for clients as a manager.'), weightByTraits: (p) => F(p, 'sociabilidade') + F(p, 'ambicao'),
      apply: (s, c, r) => { const a = A(s, c); const p = s.persons[c.hero]; if (!a || !p) return; leaveBand16(s, a, p, 'left'); if (a.members.length === 0 || a.members.every((m) => m === p.id)) { a.status = 'retired'; a.careerEnd = s.year; } becomeManager17(s, r, p, a, l('carreira em baixa e talento para articular', 'a fading career and a knack for deal-making')); } },
    { id: 'one_more', label: l('Uma última turnê', 'One last tour'), hint: l('Embalo +10, fama +2; estresse +10.', 'Momentum +10, fame +2; stress +10.'), weightByTraits: (p) => F(p, 'vaidade') + F(p, 'teimosia'),
      apply: (s, c) => { const a = A(s, c); mom(a, 10); fame(a, 2); addStress(s, c.hero, 10, l('Turnê de despedida', 'Farewell tour')); } },
    { id: 'retire', label: l('Pendurar as chuteiras', 'Hang up the boots'), hint: l('O ato se aposenta; estresse −20.', 'The act retires; stress −20.'), weightByTraits: (p) => F(p, 'paciencia') + F(p, 'melancolia'),
      apply: (s, c) => { const a = A(s, c); if (!a) return; if (a.owner && s.labels[a.owner]) endContract(s, a, 'expired'); a.status = 'retired'; a.careerEnd = s.year; addStress(s, c.hero, -20, l('Aposentadoria', 'Retirement')); relieveLong(s, c.hero, 15); } },
  ],
});

registerSituation({
  id: 'reunion_offer', pressure: 'money', cost: 1, cooldown: 8, tone: 'good', npcOnly: true,
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, Object.values(s.acts).filter((x) => (x.status === 'split' || x.status === 'hiatus' || x.status === 'retired') && !x.playerBand && x.owner !== 'player' && x.fame >= 35 && s.year - (x.careerEnd || s.year) >= 5 && !histLocked(s, x) && npcMembers(s, x).length >= 1));
    const p = a ? npcMembers(s, a)[0] : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('Volta de {a}?', '{a} reunion?'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('Um promotor oferece uma fortuna para {a} voltar aos palcos. {p} tem a palavra final.', 'A promoter offers a fortune for {a} to get back on stage. {p} has the final word.'), { a: nm(s, c.act), p: nm(s, c.hero) }),
  options: [
    { id: 'reunite', label: l('Voltar', 'Reunite'), hint: l('O ato volta à ativa com embalo +20 e caixa.', 'The act returns with momentum +20 and cash.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'vaidade') * 0.5,
      apply: (s, c) => { const a = A(s, c); if (!a) return; a.status = 'active'; a.hiatusUntil = undefined; a.careerEnd = Math.max(a.careerEnd, s.year + 6); mom(a, 20); a.cash += money(s, 20000 + a.fame * 500); return fmtL(l('{a} anunciou a volta aos palcos.', '{a} announced a comeback.'), { a: a.name }); } },
    { id: 'one_show', label: l('Só um show', 'Just one show'), hint: l('Caixa; nada de volta definitiva.', 'Cash; no permanent comeback.'), weightByTraits: (p) => F(p, 'curiosidade') + F(p, 'paciencia') * 0.5,
      apply: (s, c) => { const a = A(s, c); if (a) a.cash += money(s, 8000 + a.fame * 200); } },
    { id: 'never', label: l('Nunca mais', 'Never again'), hint: l('Orgulho intacto; lenda preservada.', 'Pride intact; legend preserved.'), weightByTraits: (p) => F(p, 'teimosia') + F(p, 'melancolia'),
      apply: (s, c) => { relieveLong(s, c.hero, 5); } },
  ],
});

// ================================================================ AMOR

registerSituation({
  id: 'muse', pressure: 'heart', cost: 1, cooldown: 4, tone: 'good',
  when: () => true,
  actorsPick: (s, _c, r) => {
    for (const a of r.shuffle(pool(s)).slice(0, 10)) { const p = npcMembers(s, a).find((x) => F(P(s, x.id), 'romantismo') > 1.15); if (p) return { hero: p.id, act: a.id, cast: { person: p.id }, data: {} }; }
    return null;
  },
  title: (s, c) => fmtL(l('{p} se apaixonou', '{p} fell in love'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('{p} ({a}) conheceu alguém e só pensa nisso — inclusive nas letras.', '{p} ({a}) met someone and thinks of nothing else — lyrics included.'), { p: nm(s, c.hero), a: nm(s, c.act) }),
  options: [
    { id: 'dive', label: l('Mergulhar no romance', 'Dive into the romance'), hint: l('Inspiração +20; cansaço +10.', 'Inspiration +20; fatigue +10.'), weightByTraits: (p) => F(p, 'romantismo') + F(p, 'impulsividade') * 0.5,
      apply: (s, c) => { insp(s, c.hero, 20); const p = s.persons[c.hero]; if (p) p.fatigue = clamp(p.fatigue + 10, 0, 100); addStress(s, c.hero, -8, l('Apaixonado(a)', 'In love')); } },
    { id: 'songs', label: l('Escrever um disco sobre isso', 'Write a record about it'), hint: l('Inspiração +12; 15% de virar fofoca.', 'Inspiration +12; 15% chance of gossip.'), weightByTraits: (p) => F(p, 'vaidade') + F(p, 'curiosidade'),
      apply: (s, c, r) => { insp(s, c.hero, 12); if (r.chance(0.15)) scandal(s, c.act!, 'sex', 20, fmtL(l('As letras de {p} entregam um romance proibido.', '{p}\'s lyrics give away a forbidden romance.'), { p: nm(s, c.hero) }), { person: c.hero }); } },
    { id: 'focus', label: l('Manter o foco na carreira', 'Keep the focus on the career'), hint: l('Estresse +5; nada muda.', 'Stress +5; nothing changes.'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'ambicao'),
      apply: (s, c) => { addStress(s, c.hero, 5, l('Amor adiado', 'Love postponed')); } },
  ],
});

registerSituation({
  id: 'breakup_album', pressure: 'heart', cost: 1, cooldown: 3, tone: 'mixed', trigger: ['breakup'],
  when: (s, c) => !!c.fact,
  actorsPick: (s, c) => {
    const pid = c.fact!.actors.find((id) => s.persons[id]?.alive && !s.persons[id].isPlayer);
    const a = pid ? Object.values(s.acts).find((x) => live(x) && x.members.includes(pid)) : undefined;
    return pid && a ? { hero: pid, act: a.id, cast: { person: pid }, data: {}, fact: c.fact } : null;
  },
  title: (s, c) => fmtL(l('{p} depois do fim', '{p} after the break-up'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('O relacionamento de {p} acabou. Como transformar a dor?', '{p}\'s relationship is over. What to do with the pain?'), { p: nm(s, c.hero) }),
  options: [
    { id: 'confessional', label: l('Disco confessional', 'A confessional record'), hint: l('Inspiração +25, embalo +5; 20% de fofoca.', 'Inspiration +25, momentum +5; 20% gossip.'), weightByTraits: (p) => F(p, 'melancolia') + F(p, 'romantismo'),
      apply: (s, c, r) => { insp(s, c.hero, 25); mom(A(s, c), 5); if (r.chance(0.2)) scandal(s, c.act!, 'conduct', 20, fmtL(l('A ex de {p} rebate as letras em entrevista.', '{p}\'s ex hits back at the lyrics in an interview.'), { p: nm(s, c.hero) }), { person: c.hero }); } },
    { id: 'feud', label: l('Guerra pública com o ex', 'Public war with the ex'), hint: l('Fama +2; estresse +10; 40% de escândalo.', 'Fame +2; stress +10; 40% scandal.'), weightByTraits: (p) => F(p, 'impulsividade') + F(p, 'ego'),
      apply: (s, c, r) => { fame(A(s, c), 2); addStress(s, c.hero, 10, l('Briga com o ex', 'Fight with the ex')); if (r.chance(0.4)) scandal(s, c.act!, 'conduct', 30, fmtL(l('{p} e o ex trocam acusações em público.', '{p} and the ex trade accusations in public.'), { p: nm(s, c.hero) }), { person: c.hero }); } },
    { id: 'silence', label: l('Silêncio', 'Silence'), hint: l('Estresse +8.', 'Stress +8.'), weightByTraits: (p) => F(p, 'ansiedade') + F(p, 'paciencia'),
      apply: (s, c) => { addStress(s, c.hero, 8, l('Luto calado', 'Silent grief')); } },
  ],
});

registerSituation({
  id: 'wedding', pressure: 'fame', cost: 1, cooldown: 3, tone: 'good', trigger: ['marriage'],
  when: (s, c) => !!c.fact,
  actorsPick: (s, c) => {
    const pid = c.fact!.actors.find((id) => s.persons[id]?.alive && !s.persons[id].isPlayer);
    const a = pid ? Object.values(s.acts).find((x) => live(x) && x.members.includes(pid) && x.fame >= 20) : undefined;
    return pid && a ? { hero: pid, act: a.id, cast: { person: pid }, data: {}, fact: c.fact } : null;
  },
  title: (s, c) => fmtL(l('O casamento de {p}', '{p}\'s wedding'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('{p} ({a}) vai casar. Festa de revista ou cerimônia íntima?', '{p} ({a}) is getting married. Magazine party or an intimate ceremony?'), { p: nm(s, c.hero), a: nm(s, c.act) }),
  options: [
    { id: 'sell', label: l('Vender as fotos para uma revista', 'Sell the photos to a magazine'), hint: l('Ganha $5.000 (era) e fama +1; parece interesseiro.', 'Earns $5,000 (era) and fame +1; looks mercenary.'), weightByTraits: (p) => F(p, 'vaidade') + F(p, 'ambicao'),
      apply: (s, c) => { pay(s, c, 'wed_photos', -5000, 'Fotos do casamento'); fame(A(s, c), 1); fans(A(s, c), 'core', 0.98); } },
    { id: 'lavish', label: l('Festa grande', 'A big party'), hint: l('Custa $5.000 (era); fama +2, manchetes.', 'Costs $5,000 (era); fame +2, headlines.'), weightByTraits: (p) => F(p, 'sociabilidade') + F(p, 'vaidade'),
      apply: (s, c) => { pay(s, c, 'wedding', 5000, 'Casamento'); fame(A(s, c), 2); const a = A(s, c); if (a) addHype(s, `a:${a.id}`, 'wed17', l('Casamento do ano', 'Wedding of the year'), 6); } },
    { id: 'private', label: l('Cerimônia íntima', 'Intimate ceremony'), hint: l('Estresse −10; nenhuma manchete.', 'Stress −10; no headlines.'), weightByTraits: (p) => F(p, 'empatia') + F(p, 'paciencia'),
      apply: (s, c) => { addStress(s, c.hero, -10, l('Casamento tranquilo', 'A quiet wedding')); relieveLong(s, c.hero, 5); } },
  ],
});

// ================================================================ DINHEIRO

registerSituation({
  id: 'tax_exile', pressure: 'money', cost: 2, cooldown: 12, tone: 'bad',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 50).filter((x) => x.cash > money(s, 150000) && !histLocked(s, x) && (marketOf(x) === 'eu' ? yr(s, 1965, 1985) : r.chance(0.3))));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('O fisco bate à porta de {a}', 'The taxman knocks on {a}\'s door'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('A alíquota sobre os ganhos de {a} ficou altíssima. O contador sugere sair do país (como fizeram os Rolling Stones em 1971).', 'The tax rate on {a}\'s earnings is sky-high. The accountant suggests leaving the country (as the Rolling Stones did in 1971).'), { a: nm(s, c.act) }),
  options: [
    { id: 'exile', label: l('Exílio fiscal', 'Tax exile'), hint: l('Muda de país: preserva o caixa; fãs núcleo de casa −8%.', 'Moves abroad: keeps the cash; home core fans −8%.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'coragem') * 0.5,
      apply: (s, c) => { const a = A(s, c); if (!a) return; const home = marketOf(a); const to = Object.values(cityById).find((x) => x.market !== home && (x.market === 'eu' || x.market === 'na')); if (to) a.city = to.id; fans(a, 'core', 0.92); return fmtL(l('{a} se mudou para {c} para fugir do fisco.', '{a} moved to {c} to escape the taxman.'), { a: a.name, c: to?.name ?? '?' }); } },
    { id: 'pay', label: l('Pagar tudo', 'Pay it all'), hint: l('Caixa do ato −30%; imagem limpa.', 'Act cash −30%; clean image.'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'lealdade'),
      apply: (s, c) => { const a = A(s, c); if (a && !mineA(s, a)) a.cash = Math.round(a.cash * 0.7); else pay(s, c, 'tax', 8000, 'Imposto'); addStress(s, c.hero, 6, l('Mordida do fisco', 'Tax bite')); } },
    { id: 'creative', label: l('Contabilidade criativa', 'Creative accounting'), hint: l('Nada agora; 25% de escândalo financeiro; o contador sabe demais.', 'Nothing now; 25% financial scandal; the accountant knows too much.'), weightByTraits: (p) => F(p, 'impulsividade') + F(p, 'rebeldia'),
      apply: (s, c, r) => { grantHold(s, { holder: 'press', target: c.act!, kind: 'secret', strength: 40, months: 48, proof: 1, text: fmtL(l('{a}: sonegação', '{a}: tax dodge'), { a: nm(s, c.act) }), src: 'sitw17', data: { sk: 'money' } }); if (r.chance(0.25)) scandal(s, c.act!, 'money', 40, fmtL(l('{a} é acusado(a) de sonegar impostos.', '{a} is accused of tax evasion.'), { a: nm(s, c.act) }), { person: c.hero }); } },
  ],
});

registerSituation({
  id: 'embezzled', pressure: 'money', cost: 2, cooldown: 12, tone: 'bad',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const rep = m14(s).rep;
    const a = pickR(r, pool(s, 35).filter((x) => rep[x.id] && x.cash > money(s, 30000) && !mineA(s, x)));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id, mgr: `e:${rep[a.id].m}` }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('O dinheiro de {a} sumiu', '{a}\'s money is gone'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('Uma auditoria mostra que {m}, empresário de {a}, desviou parte dos ganhos (como aconteceu com Billy Joel e Leonard Cohen).', 'An audit shows {m}, {a}\'s manager, siphoned off part of the earnings (as happened to Billy Joel and Leonard Cohen).'), { m: nm(s, c.cast.mgr), a: nm(s, c.act) }),
  options: [
    { id: 'sue', label: l('Processar o empresário', 'Sue the manager'), hint: l('Rompe com ele, recupera metade; estresse +10.', 'Breaks with them, recovers half; stress +10.'), weightByTraits: (p) => F(p, 'coragem') + F(p, 'teimosia'),
      apply: (s, c) => { const a = A(s, c); if (!a) return; a.cash = Math.round(a.cash * 0.85); delete m14(s).rep[a.id]; addStress(s, c.hero, 10, l('Processo contra o empresário', 'Suing the manager')); grantHold(s, { holder: c.cast.mgr, target: a.id, kind: 'grievance', strength: 50, months: 60, text: l('processado pelo cliente', 'sued by the client'), src: 'sitw17', quiet: true }); return fmtL(l('{a} processou {m} e rompeu com ele.', '{a} sued {m} and cut ties.'), { a: a.name, m: nm(s, c.cast.mgr) }); } },
    { id: 'tour', label: l('Turnê para recuperar', 'Tour to recover'), hint: l('Perde 30% do caixa; embalo +6, estresse +12.', 'Loses 30% of cash; momentum +6, stress +12.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'disciplina'),
      apply: (s, c) => { const a = A(s, c); if (!a) return; a.cash = Math.round(a.cash * 0.7); mom(a, 6); addStress(s, c.hero, 12, l('Turnê para pagar dívidas', 'Touring to pay debts')); } },
    { id: 'forgive', label: l('Perdoar em silêncio', 'Forgive quietly'), hint: l('Perde 30% do caixa; o empresário fica (e deve um favor).', 'Loses 30% of cash; the manager stays (and owes a favor).'), weightByTraits: (p) => F(p, 'lealdade') + F(p, 'empatia'),
      apply: (s, c) => { const a = A(s, c); if (!a) return; a.cash = Math.round(a.cash * 0.7); grantHold(s, { holder: a.id, target: c.cast.mgr, kind: 'favor', strength: 50, months: 60, text: l('perdoou o desvio', 'forgave the theft'), src: 'sitw17', quiet: true }); } },
  ],
});

registerSituation({
  id: 'endorsement', pressure: 'money', cost: 1, cooldown: 4, tone: 'good',
  when: (s) => s.year >= 1950,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 40));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: { v: 6000 + Math.round(a.fame * 300) } } : null;
  },
  title: (s, c) => fmtL(l('Uma marca quer {a}', 'A brand wants {a}'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('Um refrigerante oferece ${v} (era) para {a} estrelar o comercial (Michael Jackson × Pepsi, 1984).', 'A soft drink offers ${v} (era) for {a} to star in the commercial (Michael Jackson × Pepsi, 1984).'), { a: nm(s, c.act), v: Number(c.data.v).toLocaleString() }),
  options: [
    { id: 'accept', label: l('Aceitar', 'Accept'), hint: l('Recebe o cachê; posicionamento +8 (mais comercial); fãs núcleo −3%.', 'Takes the fee; positioning +8 (more commercial); core fans −3%.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'vaidade') * 0.5,
      apply: (s, c) => { pay(s, c, 'endorse', -Number(c.data.v), 'Comercial'); const a = A(s, c); if (a) a.positioning = clamp(a.positioning + 8, 0, 100); fans(a, 'core', 0.97); } },
    { id: 'haggle', label: l('Pedir o dobro', 'Ask for double'), hint: l('50%: dobro; 50%: a marca desiste.', '50%: double; 50%: the brand walks.'), weightByTraits: (p) => F(p, 'ego') + F(p, 'coragem'),
      apply: (s, c, r) => { if (r.chance(0.5)) { pay(s, c, 'endorse', -Number(c.data.v) * 2, 'Comercial (dobro)'); const a = A(s, c); if (a) a.positioning = clamp(a.positioning + 8, 0, 100); return fmtL(l('{a} pediu o dobro — e levou.', '{a} asked for double — and got it.'), { a: nm(s, c.act) }); } return fmtL(l('{a} pediu o dobro e a marca foi embora.', '{a} asked for double and the brand walked away.'), { a: nm(s, c.act) }); } },
    { id: 'refuse', label: l('Recusar: arte não se vende', 'Refuse: art is not for sale'), hint: l('Fãs núcleo +3%.', 'Core fans +3%.'), weightByTraits: (p) => F(p, 'rebeldia') + F(p, 'teimosia'),
      apply: (s, c) => { fans(A(s, c), 'core', 1.03); } },
  ],
});

registerSituation({
  id: 'broke_act', pressure: 'money', cost: 1, cooldown: 6, tone: 'bad',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 20).filter((x) => x.cash < 0 && x.owner && x.owner !== 'player' && s.labels[x.owner]));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('{a} está quebrado', '{a} is broke'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('O adiantamento acabou e {a} está no vermelho. O que fazer?', 'The advance is gone and {a} is in the red. What now?'), { a: nm(s, c.act) }),
  options: [
    { id: 'beg', label: l('Pedir adiantamento ao selo', 'Ask the label for an advance'), hint: l('Selo paga $5.000 (era) — vira dívida com o selo.', 'Label pays $5,000 (era) — becomes a debt to the label.'), weightByTraits: (p) => F(p, 'sociabilidade') + F(p, 'confianca'),
      apply: (s, c) => { const a = A(s, c); const lb = a?.owner ? s.labels[a.owner] : undefined; if (!a || !lb) return; lb.cash -= money(s, 5000); a.cash += money(s, 5000); grantHold(s, { holder: lb.id, target: a.id, kind: 'debt', strength: 40, months: 36, text: l('adiantamento extra', 'extra advance'), src: 'sitw17', quiet: true }); } },
    { id: 'publishing', label: l('Vender os direitos de edição', 'Sell the publishing'), hint: l('+$8.000 (era) agora; perde para sempre a renda autoral.', '+$8,000 (era) now; loses songwriting income for good.'), weightByTraits: (p) => F(p, 'impulsividade') + F(p, 'ansiedade'),
      apply: (s, c) => { const a = A(s, c); if (a) { a.cash += money(s, 8000); a.positioning = clamp(a.positioning + 3, 0, 100); } addStress(s, c.hero, -6, l('Contas pagas', 'Bills paid')); } },
    { id: 'gigs', label: l('Shows em bar para pagar as contas', 'Bar gigs to pay the bills'), hint: l('+$1.500 (era); estresse +10.', '+$1,500 (era); stress +10.'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'teimosia'),
      apply: (s, c) => { const a = A(s, c); if (a) a.cash += money(s, 1500); addStress(s, c.hero, 10, l('Tocando por trocados', 'Playing for spare change')); } },
  ],
});

// ================================================================ FAMA

registerSituation({
  id: 'big_moment', pressure: 'fame', cost: 1, cooldown: 3, tone: 'good',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 20).filter((x) => x.momentum >= 30));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(s.year < 1955 ? l('{a} estoura no rádio', '{a} blows up on the radio') : s.year < 1981 ? l('{a} arrasa na TV', '{a} kills it on TV') : s.year < 2005 ? l('O clipe de {a} não sai da MTV', '{a}\'s video is all over MTV') : l('{a} viralizou', '{a} went viral'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('Todo mundo está falando de {a} esta semana. Como aproveitar?', 'Everyone is talking about {a} this week. How to make the most of it?'), { a: nm(s, c.act) }),
  options: [
    { id: 'ride', label: l('Surfar a onda: agenda cheia', 'Ride the wave: packed schedule'), hint: l('Embalo +12, fama +2; estresse +8.', 'Momentum +12, fame +2; stress +8.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'sociabilidade') * 0.5,
      apply: (s, c) => { const a = A(s, c); mom(a, 12); fame(a, 2); addStress(s, c.hero, 8, l('Agenda lotada', 'Packed schedule')); if (a) addHype(s, `a:${a.id}`, 'moment17', l('Momento do ano', 'Moment of the year'), 8); } },
    { id: 'mock', label: l('Brincar com o próprio sucesso', 'Poke fun at the hype'), hint: l('Fama +1; fãs núcleo +2%.', 'Fame +1; core fans +2%.'), weightByTraits: (p) => F(p, 'humor') + F(p, 'rebeldia'),
      apply: (s, c) => { fame(A(s, c), 1); fans(A(s, c), 'core', 1.02); } },
    { id: 'hide', label: l('Sumir e voltar ao estúdio', 'Disappear back to the studio'), hint: l('Inspiração +10; embalo −3.', 'Inspiration +10; momentum −3.'), weightByTraits: (p) => F(p, 'ansiedade') + F(p, 'perfeccionismo'),
      apply: (s, c) => { insp(s, c.hero, 10); mom(A(s, c), -3); } },
  ],
});

registerSituation({
  id: 'paparazzi', pressure: 'fame', cost: 1, cooldown: 4, tone: 'bad',
  when: (s) => s.year >= 1958,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 55));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('Fotógrafos na porta de {p}', 'Photographers at {p}\'s door'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('Paparazzi seguem {p} ({a}) dia e noite.', 'Paparazzi follow {p} ({a}) day and night.'), { p: nm(s, c.hero), a: nm(s, c.act) }),
  options: [
    { id: 'pose', label: l('Posar e sorrir', 'Pose and smile'), hint: l('Fama +1,5; estresse +5.', 'Fame +1.5; stress +5.'), weightByTraits: (p) => F(p, 'vaidade') + F(p, 'sociabilidade'),
      apply: (s, c) => { fame(A(s, c), 1.5); addStress(s, c.hero, 5, l('Vida sem privacidade', 'Life without privacy')); } },
    { id: 'sue', label: l('Processar o tabloide', 'Sue the tabloid'), hint: l('Custa $2.000 (era); estresse −5.', 'Costs $2,000 (era); stress −5.'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'teimosia') * 0.5,
      apply: (s, c) => { pay(s, c, 'tabloid', 2000, 'Processo contra tabloide'); addStress(s, c.hero, -5, l('Limite aos fotógrafos', 'Boundaries with photographers')); } },
    { id: 'punch', label: l('Partir para cima', 'Go after them'), hint: l('Escândalo de violência (gravidade 35); fama +1.', 'Violence scandal (severity 35); fame +1.'), weightByTraits: (p) => F(p, 'impulsividade') * 1.4 + F(p, 'ego') * 0.4 - 0.5,
      apply: (s, c) => { fame(A(s, c), 1); scandal(s, c.act!, 'violence', 35, fmtL(l('{p} agride um fotógrafo.', '{p} attacks a photographer.'), { p: nm(s, c.hero) }), { person: c.hero }); } },
  ],
});

registerSituation({
  id: 'award_snub', pressure: 'fame', cost: 1, cooldown: 3, tone: 'bad', trigger: ['award'],
  when: (s, c) => !!c.fact,
  actorsPick: (s, c, r) => {
    const win = s.acts[c.fact!.actors[0]];
    if (!win) return null;
    const a = pickR(r, pool(s, 35).filter((x) => x.id !== win.id && familyOf(x.genre) === familyOf(win.genre)));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id, winner: win.id }, data: {}, fact: c.fact } : null;
  },
  title: (s, c) => fmtL(l('{a} esnobado(a) no prêmio', '{a} snubbed at the awards'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('{w} levou o prêmio que {a} achava seu. Como reagir?', '{w} took the award {a} thought was theirs. How to react?'), { w: nm(s, c.cast.winner), a: nm(s, c.act) }),
  options: [
    { id: 'gracious', label: l('Aplaudir de pé', 'Standing ovation'), hint: l('Relação com o vencedor +15; estresse +3.', 'Relationship with the winner +15; stress +3.'), weightByTraits: (p) => F(p, 'empatia') + F(p, 'generosidade'),
      apply: (s, c) => { const w = s.acts[c.cast.winner]; const wl = w ? leadOf(s, w) : undefined; if (wl) rel(s, c.hero, wl.id, 15); addStress(s, c.hero, 3, l('Esnobado(a)', 'Snubbed')); } },
    { id: 'boycott', label: l('Boicotar a cerimônia', 'Boycott the ceremony'), hint: l('Embalo +5 entre os fãs; a academia não esquece.', 'Momentum +5 among fans; the academy will not forget.'), weightByTraits: (p) => F(p, 'rebeldia') + F(p, 'teimosia'),
      apply: (s, c) => { const a = A(s, c); mom(a, 5); if (a && mineA(s, a)) s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100); } },
    { id: 'rant', label: l('Reclamar no microfone', 'Rant at the mic'), hint: l('Fama +2; escândalo de declaração (gravidade 25).', 'Fame +2; offensive-remark scandal (severity 25).'), weightByTraits: (p) => F(p, 'ego') + F(p, 'impulsividade'),
      apply: (s, c) => { fame(A(s, c), 2); scandal(s, c.act!, 'offense', 25, fmtL(l('{p} reclama do prêmio no palco.', '{p} complains about the award on stage.'), { p: nm(s, c.hero) }), { person: c.hero }); } },
  ],
});

registerSituation({
  id: 'chart_race', pressure: 'fame', cost: 2, cooldown: 6, tone: 'mixed',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const recent = Object.values(s.releases).filter((x) => x.week >= s.week - 4 && x.lastPos > 0 && x.lastPos <= 10).map((x) => s.acts[x.actId]).filter(live);
    const a = pickR(r, recent);
    const b = a ? recent.find((x) => x.id !== a.id) : undefined;
    const p = a ? leadOf(s, a) : undefined;
    return a && b && p ? { hero: p.id, act: a.id, cast: { person: p.id, rival: b.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('Corrida pelo 1º lugar: {a} × {b}', 'Race for No. 1: {a} vs {b}'), { a: nm(s, c.act), b: nm(s, c.cast.rival) }),
  text: (s, c) => fmtL(l('{a} e {b} lançaram na mesma semana e a imprensa transformou tudo numa batalha (Blur × Oasis, 1995).', '{a} and {b} released the same week and the press turned it into a battle (Blur vs Oasis, 1995).'), { a: nm(s, c.act), b: nm(s, c.cast.rival) }),
  options: [
    { id: 'escalate', label: l('Investir pesado na disputa', 'Go all-in on the race'), hint: l('Custa $4.000 (era): embalo +10 e fama +2 para os dois.', 'Costs $4,000 (era): momentum +10 and fame +2 for both.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'ego') * 0.5,
      apply: (s, c) => { pay(s, c, 'lb_race', 4000, 'Campanha da disputa'); for (const x of [A(s, c), s.acts[c.cast.rival]]) { mom(x, 10); fame(x, 2); } } },
    { id: 'troll', label: l('Provocar o rival', 'Trash-talk the rival'), hint: l('Fama +2; estresse +6; vira rixa.', 'Fame +2; stress +6; becomes a feud.'), weightByTraits: (p) => F(p, 'humor') + F(p, 'impulsividade'),
      apply: (s, c) => { fame(A(s, c), 2); addStress(s, c.hero, 6, l('Guerra nas paradas', 'Chart war')); const b = s.acts[c.cast.rival]; const bl = b ? leadOf(s, b) : undefined; if (bl) rel(s, c.hero, bl.id, -25); } },
    { id: 'concede', label: l('Não entrar no jogo', 'Stay out of it'), hint: l('Estresse −5; nada muda.', 'Stress −5; nothing changes.'), weightByTraits: (p) => F(p, 'paciencia') + F(p, 'empatia'),
      apply: (s, c) => { addStress(s, c.hero, -5, l('Fora da guerra', 'Out of the war')); } },
  ],
});

registerSituation({
  id: 'hometown_show', pressure: 'fame', cost: 1, cooldown: 8, tone: 'good',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 50));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('{a} e a cidade natal', '{a} and the hometown'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('A cidade onde {a} começou pede um show beneficente.', 'The city where {a} started asks for a benefit show.'), { a: nm(s, c.act) }),
  options: [
    { id: 'free', label: l('Show gratuito', 'Free show'), hint: l('Custa $3.000 (era); fãs núcleo +5%, estresse −5.', 'Costs $3,000 (era); core fans +5%, stress −5.'), weightByTraits: (p) => F(p, 'generosidade') + F(p, 'lealdade'),
      apply: (s, c) => { pay(s, c, 'hometown', 3000, 'Show beneficente'); fans(A(s, c), 'core', 1.05); addStress(s, c.hero, -5, l('Carinho da terra natal', 'Hometown love')); } },
    { id: 'paid', label: l('Show pago, com renda doada', 'Paid show, proceeds donated'), hint: l('Fama +1; fãs núcleo +2%; estresse +4 (mais um show na agenda).', 'Fame +1; core fans +2%; stress +4 (one more show on the schedule).'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'empatia') * 0.5,
      apply: (s, c) => { fame(A(s, c), 1); fans(A(s, c), 'core', 1.02); addStress(s, c.hero, 4, l('Show extra na agenda', 'Extra show on the schedule')); } }, // r18 (U12): não era dominante só por não ter custo
    { id: 'skip', label: l('Agenda cheia demais', 'Too busy'), hint: l('Fãs núcleo −2%.', 'Core fans −2%.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'ego') * 0.5,
      apply: (s, c) => { fans(A(s, c), 'core', 0.98); } },
  ],
});

// ================================================================ POLÍTICA DE SELO

const npcLabelAct = (s: GameState, a: Act): boolean => !!a.owner && a.owner !== 'player' && !!s.labels[a.owner];

registerSituation({
  id: 'ceo_ultimatum', pressure: 'power', cost: 2, cooldown: 6, tone: 'bad', npcOnly: true,
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, Object.values(s.acts).filter((x) => okAct17(s, x) && npcLabelAct(s, x) && x.fame >= 20 && x.positioning < 45 && s.labels[x.owner!].cash < money(s, 300000)));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id, label: a.owner! }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('A {b} quer um hit de {a}', '{b} wants a hit from {a}'), { b: nm(s, c.cast.label), a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('O chefe da {b} dá o ultimato: disco comercial ou contrato revisto.', '{b}\'s boss issues an ultimatum: a commercial record or a revised deal.'), { b: nm(s, c.cast.label) }),
  options: [
    { id: 'comply', label: l('Fazer o disco comercial', 'Make the commercial record'), hint: l('Posicionamento +15; fãs núcleo −5%; estresse +6.', 'Positioning +15; core fans −5%; stress +6.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'ansiedade') * 0.5,
      apply: (s, c) => { const a = A(s, c); if (a) a.positioning = clamp(a.positioning + 15, 0, 100); fans(a, 'core', 0.95); addStress(s, c.hero, 6, l('Disco por encomenda', 'A record on demand')); } },
    { id: 'resist', label: l('Recusar e bancar a arte', 'Refuse and stand by the art'), hint: l('Mágoa com o selo; 30% de sair do selo.', 'A grudge against the label; 30% chance of leaving it.'), weightByTraits: (p) => F(p, 'rebeldia') + F(p, 'teimosia'),
      apply: (s, c, r) => { const a = A(s, c); const lb = s.labels[c.cast.label]; if (!a || !lb) return; grantHold(s, { holder: a.id, target: lb.id, kind: 'grievance', strength: 40, months: 36, text: l('ultimato do selo', 'the label\'s ultimatum'), src: 'sitw17', quiet: true }); if (a.owner === lb.id && r.chance(0.3)) { leaveLabel17(s, r, a, lb, [l('recusou o ultimato do selo', 'refused the label\'s ultimatum')]); return fmtL(l('{a} recusou o ultimato e saiu da {b}.', '{a} refused the ultimatum and left {b}.'), { a: a.name, b: lb.name }); } } },
    { id: 'negotiate', label: l('Negociar um single de rádio', 'Negotiate one radio single'), hint: l('Posicionamento +6; sem mágoa.', 'Positioning +6; no grudge.'), weightByTraits: (p) => F(p, 'sociabilidade') + F(p, 'paciencia'),
      apply: (s, c) => { const a = A(s, c); if (a) a.positioning = clamp(a.positioning + 6, 0, 100); } },
  ],
});

registerSituation({
  id: 'creative_control', pressure: 'power', cost: 1, cooldown: 6, tone: 'mixed',
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 30).filter((x) => { const c = x.contractId ? s.contracts[x.contractId] : undefined; return !!c && !c.creativeControl && x.owner !== null && (x.owner === 'player' || !!s.labels[x.owner]) && !x.playerBand; }));
    if (!a) return null;
    const lb = a.owner !== 'player' ? s.labels[a.owner!] : undefined;
    const hero = lb?.leaderId ? `l:${lb.leaderId}` : leadOf(s, a)?.id;
    return hero ? { hero, act: a.id, cast: { label: a.owner! }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('{a} exige controle criativo', '{a} demands creative control'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('{a} quer decidir repertório, capa e produtor sem interferência do selo.', '{a} wants to pick songs, cover and producer without label interference.'), { a: nm(s, c.act) }),
  options: [
    { id: 'grant', label: l('Conceder', 'Grant it'), hint: l('Confiança +10; posicionamento −5 (menos comercial).', 'Trust +10; positioning −5 (less commercial).'), weightByTraits: (p) => F(p, 'empatia') + F(p, 'curiosidade'),
      apply: (s, c) => { const a = A(s, c); const k = a?.contractId ? s.contracts[a.contractId] : undefined; if (!a || !k) return; k.creativeControl = true; a.trust = clamp(a.trust + 10, 0, 100); a.positioning = clamp(a.positioning - 5, 0, 100); } },
    { id: 'partial', label: l('Só no repertório', 'Songs only'), hint: l('Confiança +4, mas a briga pela capa e pelo produtor fica (mágoa leve por 1 ano).', 'Trust +4, but the fight over cover and producer remains (mild grudge for 1 year).'), weightByTraits: (p) => F(p, 'paciencia') + F(p, 'sociabilidade') * 0.5,
      apply: (s, c) => { const a = A(s, c); if (!a) return; a.trust = clamp(a.trust + 4, 0, 100); grantHold(s, { holder: a.id, target: c.cast.label === 'player' ? 'player' : c.cast.label, kind: 'grievance', strength: 12, months: 12, text: l('controle só pela metade', 'only half the control'), src: 'sitw17', quiet: true }); } }, // r18 (U12)
    { id: 'deny', label: l('Negar: quem paga decide', 'Deny: who pays decides'), hint: l('Confiança −8; vira mágoa contra o selo.', 'Trust −8; becomes a grudge against the label.'), weightByTraits: (p) => F(p, 'ego') + F(p, 'teimosia'),
      apply: (s, c) => { const a = A(s, c); if (!a) return; a.trust = clamp(a.trust - 8, 0, 100); grantHold(s, { holder: a.id, target: c.cast.label === 'player' ? 'player' : c.cast.label, kind: 'grievance', strength: 30, months: 24, text: l('controle criativo negado', 'creative control denied'), src: 'sitw17', quiet: true }); } },
  ],
});

registerSituation({
  id: 'shelved_album', pressure: 'power', cost: 2, cooldown: 8, tone: 'bad', npcOnly: true,
  when: () => true,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, Object.values(s.acts).filter((x) => okAct17(s, x) && npcLabelAct(s, x) && unreleasedRecorded(s, x).length >= 6 && s.labels[x.owner!].cash < money(s, 150000)));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id, label: a.owner! }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('A {b} engavetou o disco de {a}', '{b} shelved {a}\'s record'), { b: nm(s, c.cast.label), a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('O selo diz que o disco "não tem single" e não vai lançar (Wilco, 2001).', 'The label says the record "has no single" and won\'t release it (Wilco, 2001).'), {}),
  options: [
    { id: 'buyback', label: l('Comprar as fitas e sair', 'Buy the tapes back and leave'), hint: l('Ato paga e fica independente; o selo perde o disco.', 'The act pays and goes independent; the label loses the record.'), weightByTraits: (p) => F(p, 'coragem') + F(p, 'rebeldia'),
      apply: (s, c, r) => { const a = A(s, c); const lb = s.labels[c.cast.label]; if (!a || !lb || a.owner !== lb.id) return; a.cash -= money(s, 10000); lb.cash += money(s, 10000); leaveLabel17(s, r, a, lb, [l('o selo engavetou o disco', 'the label shelved the record')], undefined, 'indie'); } },
    { id: 'leak', label: l('Vazar o disco', 'Leak the record'), hint: l('Fama +3, embalo +8 (os fãs acham em fitas piratas ou na internet); o selo nunca perdoa.', 'Fame +3, momentum +8 (fans find it on bootleg tapes or online); the label never forgives.'), weightByTraits: (p) => F(p, 'impulsividade') + F(p, 'rebeldia') * 0.5,
      apply: (s, c) => { const a = A(s, c); fame(a, 3); mom(a, 8); grantHold(s, { holder: c.cast.label, target: c.act!, kind: 'grievance', strength: 45, months: 48, text: l('vazou o disco engavetado', 'leaked the shelved record'), src: 'sitw17', quiet: true }); } },
    { id: 'wait', label: l('Esperar e regravar', 'Wait and re-record'), hint: l('Estresse +10; o disco atrasa meses.', 'Stress +10; the record is months late.'), weightByTraits: (p) => F(p, 'paciencia') + F(p, 'lealdade'),
      apply: (s, c) => { addStress(s, c.hero, 10, l('Disco na gaveta', 'Record in a drawer')); const a = A(s, c); if (a) a.lastRelease = Math.max(a.lastRelease, s.week - 8); } },
  ],
});

registerSituation({
  id: 'exec_follow', pressure: 'power', cost: 1, cooldown: 6, tone: 'mixed', npcOnly: true,
  when: () => true,
  actorsPick: (s, _c, r) => {
    const LS = leaders(s);
    const gone = Object.values(LS?.L ?? {}).filter((L0) => L0.jobs.some((j) => j.to === s.year && j.end !== 'died'));
    for (const L0 of r.shuffle(gone)) {
      const job = L0.jobs.find((j) => j.to === s.year)!;
      const a = pickR(r, (s.labels[job.lb]?.roster ?? []).map((id) => s.acts[id]).filter((x) => okAct17(s, x) && x.fame >= 20));
      const p = a ? leadOf(s, a) : undefined;
      if (a && p) return { hero: p.id, act: a.id, cast: { person: p.id, exec: `l:${L0.id}`, label: a.owner! }, data: {} };
    }
    return null;
  },
  title: (s, c) => fmtL(l('{e} saiu da {b}', '{e} left {b}'), { e: nm(s, c.cast.exec), b: nm(s, c.cast.label) }),
  text: (s, c) => fmtL(l('{a} foi descoberto(a) por {e}, que acaba de deixar a {b}. Seguir o executivo?', '{a} was discovered by {e}, who just left {b}. Follow the executive?'), { a: nm(s, c.act), e: nm(s, c.cast.exec), b: nm(s, c.cast.label) }),
  options: [
    { id: 'follow', label: l('Seguir para outro selo', 'Follow to another label'), hint: l('Sai do selo atual (o novo paga a rescisão).', 'Leaves the current label (the new one pays the buyout).'), weightByTraits: (p) => F(p, 'lealdade') + F(p, 'ambicao') * 0.5,
      apply: (s, c, r) => { const a = A(s, c); const lb = s.labels[c.cast.label]; if (!a || !lb || a.owner !== lb.id) return; if (!pickNewLabel17(s, r, a, [lb.id])) return; leaveLabel17(s, r, a, lb, [fmtL(l('seguiu {e}', 'followed {e}'), { e: nm(s, c.cast.exec) })], undefined, 'sign'); } },
    { id: 'stay', label: l('Ficar', 'Stay'), hint: l('Nada muda; o selo fica grato.', 'Nothing changes; the label is grateful.'), weightByTraits: (p) => F(p, 'paciencia') + F(p, 'ansiedade') * 0.5,
      apply: (s, c) => { grantHold(s, { holder: c.act!, target: c.cast.label, kind: 'loyalty', strength: 30, months: 36, text: l('ficou quando o executivo saiu', 'stayed when the executive left'), src: 'sitw17', quiet: true }); } },
  ],
});

registerSituation({
  id: 'merger_cut', pressure: 'power', cost: 1, cooldown: 2, tone: 'bad', trigger: ['deal'], npcOnly: true,
  when: (s, c) => !!c.fact?.tags.includes('merger'),
  actorsPick: (s, c, r) => {
    const a = pickR(r, c.fact!.actors.slice(2).map((id) => s.acts[id]).filter((x) => okAct17(s, x) && !x.owner));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {}, fact: c.fact } : null;
  },
  title: (s, c) => fmtL(l('{a} cortado(a) na fusão', '{a} cut in the merger'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('Na fusão, {a} foi dispensado(a). E agora?', 'In the merger, {a} was let go. Now what?'), { a: nm(s, c.act) }),
  options: [
    { id: 'shop', label: l('Procurar outro selo', 'Shop for another label'), hint: l('Assina com quem tiver caixa (se houver).', 'Signs with whoever has cash (if anyone).'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'sociabilidade'),
      apply: (s, c, r) => { const a = A(s, c); if (!a || a.owner) return; const nl = pickNewLabel17(s, r, a, []); if (nl) { signWithRival(s, a, nl.id, r, true); return fmtL(l('{a} assinou com a {b} depois do corte.', '{a} signed with {b} after the cut.'), { a: a.name, b: nl.name }); } } },
    { id: 'diy', label: l('Seguir independente', 'Go independent'), hint: l('Fica independente por um bom tempo; fãs núcleo +3%.', 'Stays independent for a good while; core fans +3%.'), weightByTraits: (p) => F(p, 'rebeldia') + F(p, 'teimosia'),
      apply: (s, c, r) => { const a = A(s, c); if (!a) return; npc17(s).indie[a.id] = s.week + r.int(52, 104); fans(a, 'core', 1.03); } },
    { id: 'pause', label: l('Dar um tempo', 'Take a break'), hint: l('Estresse −10; embalo −8.', 'Stress −10; momentum −8.'), weightByTraits: (p) => F(p, 'melancolia') + F(p, 'paciencia'),
      apply: (s, c) => { addStress(s, c.hero, -10, l('Pausa após o corte', 'A break after the cut')); mom(A(s, c), -8); } },
  ],
});

// ================================================================ ÉPOCAS (só nos anos em que fazem sentido)

registerSituation({
  id: 'draft_notice', pressure: 'body', cost: 2, cooldown: 12, tone: 'bad',
  when: (s) => yr(s, 1950, 1972),
  actorsPick: (s, _c, r) => {
    for (const a of r.shuffle(pool(s, 20).filter((x) => marketOf(x) === 'na' && !histLocked(s, x))).slice(0, 10)) {
      const p = npcMembers(s, a).find((x) => s.year - x.born >= 18 && s.year - x.born <= 26 && per13(s, `p:${x.id}`)?.sex !== 'f');
      if (p) return { hero: p.id, act: a.id, cast: { person: p.id }, data: {} };
    }
    return null;
  },
  title: (s, c) => fmtL(l('{p} foi convocado(a)', '{p} got drafted'), { p: nm(s, c.hero) }),
  text: (s, c) => fmtL(l('Chegou a carta do serviço militar para {p} ({a}). Elvis serviu em 1958; outros fugiram para o Canadá.', 'The draft letter arrived for {p} ({a}). Elvis served in 1958; others fled to Canada.'), { p: nm(s, c.hero), a: nm(s, c.act) }),
  options: [
    { id: 'serve', label: l('Servir', 'Serve'), hint: l('Ato parado ~2 anos; fama −5, mas imagem de patriota (fãs núcleo +5%).', 'Act on hold ~2 years; fame −5, but a patriot image (core fans +5%).'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'lealdade'),
      apply: (s, c) => { const a = A(s, c); if (!a) return; a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 96); fame(a, -5); fans(a, 'core', 1.05); addStress(s, c.hero, 10, l('Quartel', 'Barracks')); } },
    { id: 'dodge', label: l('Fugir do alistamento', 'Dodge the draft'), hint: l('Escândalo político (gravidade 40); a juventude rebelde aplaude (embalo +6).', 'Political scandal (severity 40); rebellious youth cheers (momentum +6).'), weightByTraits: (p) => F(p, 'rebeldia') + F(p, 'coragem'),
      apply: (s, c) => { mom(A(s, c), 6); scandal(s, c.act!, 'politics', 40, fmtL(l('{p} foge do alistamento.', '{p} dodges the draft.'), { p: nm(s, c.hero) }), { person: c.hero }); } },
    { id: 'exempt', label: l('Dispensa médica arranjada', 'An arranged medical exemption'), hint: l('Custa $3.000 (era); vira segredo que alguém guarda.', 'Costs $3,000 (era); becomes a secret someone keeps.'), weightByTraits: (p) => F(p, 'ansiedade') + F(p, 'impulsividade') * 0.5,
      apply: (s, c) => { pay(s, c, 'exempt', 3000, 'Dispensa médica'); grantHold(s, { holder: 'press', target: c.act!, kind: 'secret', strength: 45, months: 120, proof: 1, text: fmtL(l('{p}: dispensa militar comprada', '{p}: a bought draft exemption'), { p: nm(s, c.hero) }), src: 'sitw17', data: { sk: 'politics' } }); } },
  ],
});

registerSituation({
  id: 'radio_ban', pressure: 'faith', cost: 1, cooldown: 6, tone: 'bad',
  when: (s) => s.year < 1972 || yr(s, 1984, 1992),
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 25).filter((x) => ['rock', 'hiphop', 'rnb', 'electronic'].includes(familyOf(x.genre)) && x.positioning < 60));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(s.year >= 1984 ? l('{a} ganha selo de "conteúdo explícito"', '{a} gets a "parental advisory" sticker') : l('Rádios banem a faixa de {a}', 'Radio bans {a}\'s track'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(s.year >= 1984 ? l('Um comitê de pais (PMRC, 1985) acusa as letras de {a} e convoca artistas a depor.', 'A parents\' committee (PMRC, 1985) attacks {a}\'s lyrics and calls artists to testify.') : l('As rádios acham a letra de {a} indecente e cortam a música da programação.', 'Radio finds {a}\'s lyric indecent and drops the song.'), { a: nm(s, c.act) }),
  options: [
    { id: 'edit', label: l('Lançar versão editada', 'Release an edited version'), hint: l('Posicionamento +10; fãs núcleo −3%.', 'Positioning +10; core fans −3%.'), weightByTraits: (p) => F(p, 'ansiedade') + F(p, 'disciplina') * 0.5,
      apply: (s, c) => { const a = A(s, c); if (a) a.positioning = clamp(a.positioning + 10, 0, 100); fans(a, 'core', 0.97); } },
    { id: 'defy', label: l('Desafiar a censura', 'Defy the censors'), hint: l('Fama +2, embalo +6 (fruto proibido); escândalo leve em mercados religiosos.', 'Fame +2, momentum +6 (forbidden fruit); a mild scandal in religious markets.'), weightByTraits: (p) => F(p, 'rebeldia') + F(p, 'coragem'),
      apply: (s, c) => { const a = A(s, c); fame(a, 2); mom(a, 6); scandal(s, c.act!, 'offense', 20, fmtL(l('{a} desafia a censura.', '{a} defies the censors.'), { a: nm(s, c.act) }), { person: c.hero }); } },
    { id: 'testify', label: l('Depor e defender a liberdade', 'Testify for free speech'), hint: l('Fama +3; estresse +8 (Zappa e Dee Snider no Senado).', 'Fame +3; stress +8 (Zappa and Dee Snider before the Senate).'), weightByTraits: (p) => F(p, 'coragem') + F(p, 'sociabilidade') * 0.5,
      apply: (s, c) => { fame(A(s, c), 3); addStress(s, c.hero, 8, l('Depoimento público', 'Public testimony')); } },
  ],
});

registerSituation({
  id: 'video_budget', pressure: 'fame', cost: 1, cooldown: 4, tone: 'mixed',
  when: (s) => yr(s, 1981, 2006),
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 30));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('O clipe de {a}', '{a}\'s music video'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('A MTV mudou tudo: um clipe caro pode fazer {a} estourar — ou só gastar dinheiro.', 'MTV changed everything: an expensive video could make {a} explode — or just burn money.'), { a: nm(s, c.act) }),
  options: [
    { id: 'epic', label: l('Superprodução', 'Blockbuster video'), hint: l('Custa $8.000 (era); 60%: fama +3 e embalo +10; 40%: só embalo +3.', 'Costs $8,000 (era); 60%: fame +3 and momentum +10; 40%: just momentum +3.'), weightByTraits: (p) => F(p, 'vaidade') + F(p, 'ambicao'),
      apply: (s, c, r) => { pay(s, c, 'lb_video', 8000, 'Clipe'); const a = A(s, c); if (r.chance(0.6)) { fame(a, 3); mom(a, 10); return fmtL(l('O clipe de {a} virou um marco da MTV.', '{a}\'s video became an MTV landmark.'), { a: nm(s, c.act) }); } mom(a, 3); } },
    { id: 'cheap', label: l('Clipe barato e criativo', 'Cheap, creative video'), hint: l('Custa $1.000 (era); embalo +4.', 'Costs $1,000 (era); momentum +4.'), weightByTraits: (p) => F(p, 'curiosidade') + F(p, 'humor'),
      apply: (s, c) => { pay(s, c, 'lb_video', 1000, 'Clipe'); mom(A(s, c), 4); } },
    { id: 'refuse', label: l('Recusar: música não é imagem', 'Refuse: music is not image'), hint: l('Fãs núcleo +3%; posicionamento −5.', 'Core fans +3%; positioning −5.'), weightByTraits: (p) => F(p, 'rebeldia') + F(p, 'teimosia'),
      apply: (s, c) => { const a = A(s, c); fans(a, 'core', 1.03); if (a) a.positioning = clamp(a.positioning - 5, 0, 100); } },
  ],
});

registerSituation({
  id: 'piracy', pressure: 'money', cost: 1, cooldown: 12, tone: 'mixed',
  when: (s) => yr(s, 1999, 2007),
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 45));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('{a} e a pirataria na internet', '{a} and online piracy'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('As músicas de {a} circulam de graça no Napster. Processar os fãs (como o Metallica) ou abraçar?', '{a}\'s songs are circulating for free on Napster. Sue the fans (like Metallica) or embrace it?'), { a: nm(s, c.act) }),
  options: [
    { id: 'sue', label: l('Processar', 'Sue'), hint: l('Fãs casuais −10%, núcleo −3%; imagem de ganancioso.', 'Casual fans −10%, core −3%; a greedy image.'), weightByTraits: (p) => F(p, 'teimosia') + F(p, 'ego') * 0.5,
      apply: (s, c) => { const a = A(s, c); fans(a, 'casual', 0.9); fans(a, 'core', 0.97); } },
    { id: 'embrace', label: l('Liberar e lucrar com shows', 'Give it away, earn on tour'), hint: l('Fãs casuais +15%; embalo +5; custa ~$4.000 (era) em vendas que não acontecem.', 'Casual fans +15%; momentum +5; costs ~$4,000 (era) in sales that never happen.'), weightByTraits: (p) => F(p, 'curiosidade') + F(p, 'generosidade'),
      apply: (s, c) => { const a = A(s, c); fans(a, 'casual', 1.15); mom(a, 5); pay(s, c, 'piracy', 4000, 'Vendas perdidas para a pirataria'); } }, // r18 (U12)
    { id: 'ignore', label: l('Ignorar', 'Ignore it'), hint: l('Nada muda.', 'Nothing changes.'), weightByTraits: (p) => F(p, 'paciencia') + 0.5,
      apply: () => undefined },
  ],
});

registerSituation({
  id: 'streaming_stand', pressure: 'money', cost: 1, cooldown: 12, tone: 'mixed',
  when: (s) => s.year >= 2010,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 55));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('{a} contra o streaming?', '{a} vs streaming?'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('{a} acha que o streaming paga pouco e pensa em tirar o catálogo das plataformas (Taylor Swift, 2014).', '{a} thinks streaming pays too little and considers pulling the catalog (Taylor Swift, 2014).'), { a: nm(s, c.act) }),
  options: [
    { id: 'pull', label: l('Tirar o catálogo', 'Pull the catalog'), hint: l('Fãs núcleo +5%, casuais −10%; embalo −5.', 'Core fans +5%, casual −10%; momentum −5.'), weightByTraits: (p) => F(p, 'teimosia') + F(p, 'coragem'),
      apply: (s, c) => { const a = A(s, c); fans(a, 'core', 1.05); fans(a, 'casual', 0.9); mom(a, -5); } },
    { id: 'deal', label: l('Negociar royalties melhores', 'Negotiate better royalties'), hint: l('50%: +$6.000 (era); 50%: nada.', '50%: +$6,000 (era); 50%: nothing.'), weightByTraits: (p) => F(p, 'sociabilidade') + F(p, 'ambicao'),
      apply: (s, c, r) => { if (r.chance(0.5)) pay(s, c, 'stream', -6000, 'Acordo de streaming'); } },
    { id: 'embrace', label: l('Abraçar as playlists', 'Embrace the playlists'), hint: l('Fãs casuais +10%; repasse menor: −$2.000 (era).', 'Casual fans +10%; lower payout: −$2,000 (era).'), weightByTraits: (p) => F(p, 'curiosidade') + F(p, 'paciencia') * 0.5,
      apply: (s, c) => { fans(A(s, c), 'casual', 1.1); pay(s, c, 'stream', 2000, 'Repasse menor das playlists'); } }, // r18 (U12)
  ],
});

registerSituation({
  id: 'foreign_invasion', pressure: 'fame', cost: 1, cooldown: 8, tone: 'good',
  when: (s) => s.year >= 1955,
  actorsPick: (s, _c, r) => {
    const a = pickR(r, pool(s, 35).filter((x) => marketOf(x) !== 'na' && (marketOf(x) === 'eu' ? yr(s, 1963, 1970) || r.chance(0.3) : r.chance(0.4))));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(l('Convite para atravessar o oceano: {a}', 'An invitation across the ocean: {a}'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('A TV americana quer {a} (a Invasão Britânica, 1964; o crossover latino, 1999). Arriscar a turnê?', 'American TV wants {a} (the British Invasion, 1964; the Latin crossover, 1999). Risk the tour?'), { a: nm(s, c.act) }),
  options: [
    { id: 'go', label: l('Ir com tudo', 'Go all in'), hint: l('Fama +4, embalo +8; cansaço e estresse +10.', 'Fame +4, momentum +8; fatigue and stress +10.'), weightByTraits: (p) => F(p, 'ambicao') + F(p, 'coragem'),
      apply: (s, c) => { const a = A(s, c); fame(a, 4); mom(a, 8); for (const m of a?.members ?? []) { addStress(s, m, 10, l('Turnê internacional', 'International tour')); const p = s.persons[m]; if (p) p.fatigue = clamp(p.fatigue + 10, 0, 100); } } },
    { id: 'translate', label: l('Gravar em inglês antes', 'Record in English first'), hint: l('Inspiração −5; fama +2; posicionamento +5.', 'Inspiration −5; fame +2; positioning +5.'), weightByTraits: (p) => F(p, 'disciplina') + F(p, 'perfeccionismo'),
      apply: (s, c) => { insp(s, c.hero, -5); const a = A(s, c); fame(a, 2); if (a) a.positioning = clamp(a.positioning + 5, 0, 100); } },
    { id: 'home', label: l('Ficar em casa', 'Stay home'), hint: l('Fãs núcleo de casa +3%; estresse −5.', 'Home core fans +3%; stress −5.'), weightByTraits: (p) => F(p, 'lealdade') + F(p, 'ansiedade'),
      apply: (s, c) => { fans(A(s, c), 'core', 1.03); addStress(s, c.hero, -5, l('Perto de casa', 'Close to home')); } },
  ],
});

registerSituation({
  id: 'genre_backlash', pressure: 'fame', cost: 2, cooldown: 12, tone: 'bad',
  when: (s) => yr(s, 1979, 1982) || yr(s, 1991, 1994),
  actorsPick: (s, _c, r) => {
    const hot = s.year <= 1982 ? (a: Act) => a.genre.includes('disco') : (a: Act) => familyOf(a.genre) === 'rock' && a.positioning >= 55; // antidisco; grunge enterra o hair metal
    const a = pickR(r, pool(s, 20).filter(hot));
    const p = a ? leadOf(s, a) : undefined;
    return a && p ? { hero: p.id, act: a.id, cast: { person: p.id }, data: {} } : null;
  },
  title: (s, c) => fmtL(s.year <= 1982 ? l('"Disco sucks": {a} na mira', '"Disco sucks": {a} in the crosshairs') : l('O grunge enterrou o som de {a}', 'Grunge buried {a}\'s sound'), { a: nm(s, c.act) }),
  text: (s, c) => fmtL(l('O público virou as costas para o estilo de {a} da noite para o dia (Disco Demolition Night, 1979; Nevermind, 1991).', 'The public turned its back on {a}\'s style overnight (Disco Demolition Night, 1979; Nevermind, 1991).'), { a: nm(s, c.act) }),
  options: [
    { id: 'pivot', label: l('Mudar de som', 'Change the sound'), hint: l('Fãs casuais −10%, núcleo −10%; embalo +8; inspiração +10.', 'Casual −10%, core −10%; momentum +8; inspiration +10.'), weightByTraits: (p) => F(p, 'curiosidade') + F(p, 'ambicao'),
      apply: (s, c) => { const a = A(s, c); fans(a, 'casual', 0.9); fans(a, 'core', 0.9); mom(a, 8); insp(s, c.hero, 10); } },
    { id: 'double', label: l('Dobrar a aposta', 'Double down'), hint: l('Fãs casuais −25%, núcleo +6%.', 'Casual fans −25%, core +6%.'), weightByTraits: (p) => F(p, 'teimosia') + F(p, 'lealdade'),
      apply: (s, c) => { const a = A(s, c); fans(a, 'casual', 0.75); fans(a, 'core', 1.06); } },
    { id: 'pause', label: l('Sair de cena por um tempo', 'Step away for a while'), hint: l('Pausa de ~6 meses; estresse −15.', 'A ~6-month break; stress −15.'), weightByTraits: (p) => F(p, 'melancolia') + F(p, 'paciencia'),
      apply: (s, c) => { const a = A(s, c); if (a) a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 26); addStress(s, c.hero, -15, l('Longe dos holofotes', 'Away from the spotlight')); } },
  ],
});
