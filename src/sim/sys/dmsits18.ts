// Rodada 18 (item 9) — SITUAÇÕES COMBINÁVEIS do Mestre: 8 MOTIVOS (inveja, amor, dinheiro, vingança, ambição,
// lealdade, medo, orgulho) × 4 COMPLICAÇÕES (imprensa presente, alguém gravou, uma testemunha, um selo rival de olho)
// = 32 modelos, cada um num CENÁRIO sorteado pela época (bastidores, estúdio, premiação, festa, TV, homenagem).
// O elenco sai do estado do mundo (relações, mágoas, trunfos, fama, cargos); NPCs escolhem pelos traços; se envolve
// você ou seus artistas, vira cartão (situations17). Mesma partida nunca repete a mesma combinação de elenco ×
// motivo × lugar × complicação — runs diferentes. Modo "Vida real exata": ninguém real entra (shield18).

import { clamp, type Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { emitFact } from '../facts17';
import { grantHold, holdsOf, useHold, voidHolds } from '../holds17';
import { scandal } from '../scandal17';
import { addStress, relieveLong } from '../stress17';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { forceVerb, dm18 } from './dm18';
import { heatFeud18, leadOf18, shield18, startFeud18 } from './feud18';
import { addHype } from './hype12';
import { leaders } from './leaders10';
import type { P13 } from './persona13';
import { registerSituation, type Pressure, type SitCtx } from './situations17';

// ---------------------------------------------------------------- utilidades

const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging');
const F = (P: P13 | null, k: string): number => (P?.facets[k as keyof P13['facets']] ?? 50) / 50;
const okP = (s: GameState, p?: Person): p is Person => !!p?.alive && !p.isPlayer && !shield18(s, p.id);
const okA = (s: GameState, a?: Act): a is Act => live(a) && !shield18(s, a.id);
const mineA = (s: GameState, a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand || playerActs(s).includes(a.id));
const pool = (s: GameState, r: Rng, n = 14): Act[] => {
  const mine = new Set(playerActs(s));
  return r.shuffle(Object.values(s.acts).filter((a) => okA(s, a) && (mine.has(a.id) || a.fame >= 18))).slice(0, n);
};
const nmP = (s: GameState, id?: string): string => (!id ? '?' : id === 'player' ? s.config.companyName : s.persons[id]?.name ?? s.acts[id]?.name ?? (id.startsWith('l:') ? leaders(s).L[id.slice(2)]?.name : undefined) ?? id);
const rel = (s: GameState, a: string, b: string, d: number) => { const x = s.persons[a], y = s.persons[b]; if (x) x.rel[b] = clamp((x.rel[b] ?? 0) + d, -100, 100); if (y) y.rel[a] = clamp((y.rel[a] ?? 0) + d, -100, 100); };
const insp = (s: GameState, id: string | undefined, d: number) => { const p = id ? s.persons[id] : undefined; if (p) p.inspiration = clamp(p.inspiration + d, 0, 100); };
const resent = (s: GameState, id: string | undefined, d: number) => { const p = id ? s.persons[id] : undefined; if (p) p.resentment = clamp(p.resentment + d, 0, 100); };
const mom = (a: Act | undefined, d: number) => { if (a) a.momentum = clamp(a.momentum + d, 0, 100); };
const actOf = (s: GameState, c: SitCtx): Act | undefined => (c.act ? s.acts[c.act] : undefined);
/** Paga em dólares da época: o jogador (se o ato é seu) ou o caixa do ato/selo. */
function pay(s: GameState, a: Act | undefined, real: number, memo: string, key: string): void {
  const v = money(s, real);
  if (!a) return;
  if (mineA(s, a)) post(s, `dms18:${key}:${a.id}`, -v, 'misc', memo);
  else if (a.owner && s.labels[a.owner]) s.labels[a.owner].cash -= v;
  else a.cash -= v;
}

// ---------------------------------------------------------------- cenários (pela época)

const SETTINGS: { id: string; name: L; from: number; line: L }[] = [
  { id: 'backstage', name: l('nos bastidores', 'backstage'), from: 0, line: l('Camarim apertado, cerveja quente, o show acabou de terminar.', 'A cramped dressing room, warm beer, the show just ended.') },
  { id: 'studio', name: l('no estúdio', 'in the studio'), from: 0, line: l('Três da manhã, a fita rodando, ninguém quer ir embora.', 'Three a.m., the tape rolling, nobody wants to leave.') },
  { id: 'awards', name: l('na premiação', 'at the awards'), from: 1959, line: l('Smoking alugado, flashes, e um envelope que muda tudo.', 'A rented tux, flashbulbs, and an envelope that changes everything.') },
  { id: 'party', name: l('na festa', 'at the party'), from: 0, line: l('Uma cobertura, gente demais, e alguém que bebeu além da conta.', 'A penthouse, too many people, and someone who drank too much.') },
  { id: 'tv', name: l('ao vivo na TV', 'live on TV'), from: 1950, line: l('Luz vermelha acesa: o país inteiro está olhando.', 'The red light is on: the whole country is watching.') },
  { id: 'tribute', name: l('numa homenagem', 'at a tribute'), from: 0, line: l('Uma noite para um velho mestre — e velhas contas na plateia.', 'A night for an old master — and old scores in the audience.') },
];
const settingOf = (c: SitCtx) => SETTINGS[Number(c.data.set ?? 0)] ?? SETTINGS[0];

// ---------------------------------------------------------------- motivos

type Kind = 'hot' | 'cool' | 'out';
interface MOpt { id: string; label: L; hint: L; kind: Kind; w: (P: P13 | null) => number; apply: (s: GameState, c: SitCtx, r: Rng) => L | void }
interface Motive { id: string; name: L; pressure: Pressure; cost: number; pick: (s: GameState, r: Rng) => SitCtx | null; title: L; text: L; opts: MOpt[] }

const MOTIVES: Motive[] = [
  {
    id: 'envy', name: l('Inveja', 'Envy'), pressure: 'fame', cost: 1,
    pick: (s, r) => {
      for (const a of pool(s, r)) {
        const p = leadOf18(s, a); if (!okP(s, p)) continue;
        const b = Object.values(s.acts).find((x) => okA(s, x) && x.id !== a.id && familyOf(x.genre) === familyOf(a.genre) && x.fame > a.fame + 3 && x.fame < a.fame + 30);
        const q = leadOf18(s, b); if (b && okP(s, q)) return { hero: p.id, act: a.id, cast: { person: p.id, other: q.id, oact: b.id }, data: {} };
      }
      return null;
    },
    title: l('{h} e a sombra de {o}', '{h} and the shadow of {o}'),
    text: l('{h} ({a}) não suporta ver {o} ({b}) sempre um passo à frente.', '{h} ({a}) can\'t stand seeing {o} ({b}) always one step ahead.'),
    opts: [
      { id: 'attack', label: l('Atacar (diss)', 'Attack (diss)'), hint: l('Começa/esquenta uma rixa: hype +4 para os dois, relação −20.', 'Starts/heats a feud: hype +4 for both, relationship −20.'), kind: 'hot', w: (P) => F(P, 'ego') + F(P, 'impulsividade'),
        apply: (s, c) => { rel(s, c.hero, c.cast.other, -20); const f = startFeud18(s, c.act!, c.cast.oact, fmtL(l('Inveja: {h} ataca {o}', 'Envy: {h} attacks {o}'), { h: nmP(s, c.hero), o: nmP(s, c.cast.other) }), 16); if (f) heatFeud18(s, f, 6); for (const id of [c.act!, c.cast.oact]) addHype(s, `a:${id}`, 'dms18envy', l('Provocação', 'Provocation'), 4); } },
      { id: 'emulate', label: l('Copiar a fórmula', 'Copy the formula'), hint: l('Inspiração +10, embalo +3; críticos notam a cópia.', 'Inspiration +10, momentum +3; critics notice the copying.'), kind: 'out', w: (P) => F(P, 'ambicao') + F(P, 'disciplina') * 0.5,
        apply: (s, c) => { insp(s, c.hero, 10); mom(actOf(s, c), 3); } },
      { id: 'admire', label: l('Admitir a admiração', 'Admit the admiration'), hint: l('Relação +15; estresse −5.', 'Relationship +15; stress −5.'), kind: 'cool', w: (P) => F(P, 'empatia') + F(P, 'humor') * 0.5,
        apply: (s, c) => { rel(s, c.hero, c.cast.other, 15); addStress(s, c.hero, -5, l('Paz com o rival', 'At peace with the rival')); } },
    ],
  },
  {
    id: 'love', name: l('Amor', 'Love'), pressure: 'heart', cost: 1,
    pick: (s, r) => {
      for (const a of pool(s, r)) {
        const p = leadOf18(s, a); if (!okP(s, p) || s.year - p.born < 18) continue;
        const o = Object.entries(p.rel).filter(([id, v]) => v >= 30 && okP(s, s.persons[id]) && s.year - s.persons[id].born >= 18).sort((x, y) => y[1] - x[1])[0];
        if (o) return { hero: p.id, act: a.id, cast: { person: p.id, other: o[0] }, data: {} };
      }
      return null;
    },
    title: l('{h} e {o}: algo mais', '{h} and {o}: something more'),
    text: l('Entre {h} ({a}) e {o} há mais do que amizade. Todo mundo percebe — menos, talvez, os dois.', 'Between {h} ({a}) and {o} there is more than friendship. Everyone notices — except, maybe, the two of them.'),
    opts: [
      { id: 'confess', label: l('Se declarar', 'Confess'), hint: l('Relação +20; 40% vira caso secreto (um segredo que alguém pode guardar).', 'Relationship +20; 40% becomes a secret affair (a secret someone may keep).'), kind: 'hot', w: (P) => F(P, 'romantismo') + F(P, 'coragem'),
        apply: (s, c, r) => { rel(s, c.hero, c.cast.other, 20); if (r.chance(0.4)) { const t = fmtL(l('{h} e {o} viraram amantes.', '{h} and {o} became lovers.'), { h: nmP(s, c.hero), o: nmP(s, c.cast.other) }); const f = emitFact(s, { kind: 'affair', actors: [c.hero, c.cast.other], severity: 40, visibility: 'secret', tags: ['sex', 'secret', 'dms18'], text: t, src: 'dmsits18' }); const w = actOf(s, c)?.members.find((m) => m !== c.hero && okP(s, s.persons[m])); if (w) grantHold(s, { holder: w, target: c.hero, kind: 'secret', strength: 50, proof: 1, months: 120, src: 'dmsits18', factId: f.id, text: t, quiet: true }); return t; } } },
      { id: 'hide', label: l('Esconder o que sente', 'Hide the feelings'), hint: l('Estresse +8; nada muda (ainda).', 'Stress +8; nothing changes (yet).'), kind: 'out', w: (P) => F(P, 'ansiedade') + F(P, 'disciplina'),
        apply: (s, c) => { addStress(s, c.hero, 8, l('Amor escondido', 'Hidden love')); } },
      { id: 'song', label: l('Transformar em canção', 'Turn it into a song'), hint: l('Inspiração +12; relação −5.', 'Inspiration +12; relationship −5.'), kind: 'cool', w: (P) => F(P, 'curiosidade') + F(P, 'romantismo') * 0.5,
        apply: (s, c) => { insp(s, c.hero, 12); rel(s, c.hero, c.cast.other, -5); } },
    ],
  },
  {
    id: 'money', name: l('Dinheiro', 'Money'), pressure: 'money', cost: 2,
    pick: (s, r) => {
      for (const a of pool(s, r)) {
        const p = leadOf18(s, a); if (!okP(s, p) || !a.owner || mineA(s, a)) continue;
        const boss = a.owner === 'player' ? 'player' : s.labels[a.owner]?.leaderId ? `l:${s.labels[a.owner].leaderId}` : undefined;
        if (!boss || (boss !== 'player' && shield18(s, a.owner))) continue;
        if (a.fame >= 25 || p.resentment > 30) return { hero: p.id, act: a.id, cast: { person: p.id, boss }, data: {} };
      }
      return null;
    },
    title: l('{h} quer ver as contas', '{h} wants to see the books'),
    text: l('{h} ({a}) acha que está ganhando pouco perto do que dá a {o}.', '{h} ({a}) thinks they earn too little for what they bring {o}.'),
    opts: [
      { id: 'demand', label: l('Exigir aumento', 'Demand a raise'), hint: l('O dono do contrato paga ~$6k; relação −10 se ele resiste.', 'The contract holder pays ~$6k; relationship −10 if they resist.'), kind: 'hot', w: (P) => F(P, 'ambicao') + F(P, 'teimosia'),
        apply: (s, c) => { pay(s, actOf(s, c), 6000, 'Aumento exigido', 'raise'); resent(s, c.hero, -10); } },
      { id: 'audit', label: l('Pedir auditoria', 'Request an audit'), hint: l('50%: acha royalties desviados (mágoa contra o dono + escândalo de dinheiro).', '50%: finds skimmed royalties (grudge against the owner + money scandal).'), kind: 'cool', w: (P) => F(P, 'disciplina') + F(P, 'teimosia') * 0.5,
        apply: (s, c, r) => { if (!r.chance(0.5)) return l('Auditoria limpa: as contas batem.', 'Clean audit: the books add up.'); const a = actOf(s, c); grantHold(s, { holder: c.hero, target: c.cast.boss, kind: 'grievance', strength: 50, months: 60, src: 'dmsits18', text: l('Auditoria achou royalties desviados', 'Audit found skimmed royalties') }); if (a?.owner && a.owner !== 'player') scandal(s, a.owner, 'money', 30, l('Auditoria acha royalties desviados.', 'Audit finds skimmed royalties.'), { tags: ['dms18'] }); return l('A auditoria achou dinheiro sumido.', 'The audit found missing money.'); } },
      { id: 'swallow', label: l('Engolir e seguir', 'Swallow it and move on'), hint: l('Ressentimento +10.', 'Resentment +10.'), kind: 'out', w: (P) => F(P, 'lealdade') + F(P, 'paciencia'),
        apply: (s, c) => { resent(s, c.hero, 10); } },
    ],
  },
  {
    id: 'revenge', name: l('Vingança', 'Revenge'), pressure: 'heart', cost: 2,
    pick: (s, r) => {
      for (const a of pool(s, r, 20)) {
        for (const pid of a.members) {
          const p = s.persons[pid]; if (!okP(s, p)) continue;
          const h = holdsOf(s, pid).has.find((x) => x.kind === 'grievance' && x.status === 'open' && x.target !== pid && x.target !== 'player' && !s.persons[x.target]?.isPlayer && !shield18(s, x.target));
          if (h) return { hero: pid, act: a.id, cast: { person: pid, target: h.target === 'player' ? 'player' : s.persons[h.target] ? `p:${h.target}` : h.target }, data: { hold: h.id } };
        }
      }
      return null;
    },
    title: l('{h} não esqueceu', '{h} has not forgotten'),
    text: l('{h} ({a}) guarda uma mágoa de {o}. Hoje, a chance de acertar as contas está ali.', '{h} ({a}) holds a grudge against {o}. Today, the chance to settle the score is right there.'),
    opts: [
      { id: 'strike', label: l('Acertar as contas', 'Settle the score'), hint: l('Age contra o alvo do jeito dele (boato, diss, processo, intimidação…).', 'Acts against the target their own way (rumor, diss, lawsuit, intimidation…).'), kind: 'hot', w: (P) => F(P, 'impulsividade') + (2 - F(P, 'empatia')),
        apply: (s, c, r) => { forceVerb(s, `p:${c.hero}`, c.cast.target, ['diss', 'rumor', 'expose', 'sue', 'intimidate'], r); } },
      { id: 'forgive', label: l('Perdoar', 'Forgive'), hint: l('A mágoa acaba; desgaste −10.', 'The grudge ends; long stress −10.'), kind: 'cool', w: (P) => F(P, 'empatia') + F(P, 'generosidade'),
        apply: (s, c) => { voidHolds(s, (h) => h.id === c.data.hold); relieveLong(s, c.hero, 10); } },
      { id: 'wait', label: l('Esperar a hora certa', 'Wait for the right moment'), hint: l('Estresse +6; a mágoa fica mais forte.', 'Stress +6; the grudge grows stronger.'), kind: 'out', w: (P) => F(P, 'paciencia') + F(P, 'disciplina'),
        apply: (s, c) => { addStress(s, c.hero, 6, l('Remoendo uma mágoa', 'Brooding over a grudge')); const h = holdsOf(s, c.hero).has.find((x) => x.id === c.data.hold); if (h) h.strength = Math.min(100, h.strength + 10); } },
    ],
  },
  {
    id: 'ambition', name: l('Ambição', 'Ambition'), pressure: 'power', cost: 2,
    pick: (s, r) => {
      for (const a of pool(s, r)) {
        if (a.members.length < 3) continue;
        const lead = leadOf18(s, a);
        const p = a.members.map((m) => s.persons[m]).find((x) => okP(s, x) && x.id !== lead?.id && (x.rel[lead?.id ?? ''] ?? 0) < 20);
        if (p && lead) return { hero: p.id, act: a.id, cast: { person: p.id, other: lead.id }, data: {} };
      }
      return null;
    },
    title: l('{h} quer o microfone', '{h} wants the mic'),
    text: l('{h} acha que {a} seria maior com outra pessoa na frente — no caso, ele(a) mesmo(a). {o} sente o golpe chegando.', '{h} thinks {a} would be bigger with someone else up front — namely themselves. {o} feels the coup coming.'),
    opts: [
      { id: 'coup', label: l('Tomar a liderança', 'Take the lead'), hint: l('Vira líder do ato; relação com o ex-líder −25.', 'Becomes the act\'s leader; relationship with the old leader −25.'), kind: 'hot', w: (P) => F(P, 'ambicao') + F(P, 'ego'),
        apply: (s, c) => { const a = actOf(s, c); if (a) a.leaderId = c.hero; rel(s, c.hero, c.cast.other, -25); resent(s, c.cast.other, 20); return fmtL(l('{h} assume a frente de {a}; {o} fica de lado.', '{h} takes the front of {a}; {o} is pushed aside.'), { h: nmP(s, c.hero), a: actOf(s, c)?.name ?? '?', o: nmP(s, c.cast.other) }); } },
      { id: 'side', label: l('Projeto paralelo', 'Side project'), hint: l('Inspiração +10, estresse +6.', 'Inspiration +10, stress +6.'), kind: 'out', w: (P) => F(P, 'curiosidade') + F(P, 'ambicao') * 0.5,
        apply: (s, c) => { insp(s, c.hero, 10); addStress(s, c.hero, 6, l('Duas frentes', 'Two fronts')); } },
      { id: 'patience', label: l('Esperar a vez', 'Wait their turn'), hint: l('Lealdade registrada com o líder; relação +10.', 'Loyalty logged with the leader; relationship +10.'), kind: 'cool', w: (P) => F(P, 'lealdade') + F(P, 'paciencia'),
        apply: (s, c) => { rel(s, c.hero, c.cast.other, 10); grantHold(s, { holder: c.cast.other, target: c.hero, kind: 'loyalty', strength: 35, months: 36, src: 'dmsits18', text: l('esperou a vez sem golpe', 'waited their turn without a coup'), quiet: true }); } },
    ],
  },
  {
    id: 'loyalty', name: l('Lealdade', 'Loyalty'), pressure: 'power', cost: 2,
    pick: (s, r) => {
      for (const a of pool(s, r)) {
        const p = leadOf18(s, a); if (!okP(s, p) || !a.owner || a.fame < 20) continue;
        const rv = Object.values(s.labels).filter((lb) => lb.active && lb.id !== a.owner && lb.leaderId && !shield18(s, lb.id) && lb.cash > 0).sort((x, y) => y.reputation - x.reputation)[r.int(0, 2)];
        if (rv) return { hero: p.id, act: a.id, cast: { person: p.id, rival: `l:${rv.leaderId}`, rlabel: rv.id }, data: {} };
      }
      return null;
    },
    title: l('Uma oferta para {h}', 'An offer for {h}'),
    text: l('{o} chama {h} ({a}) para conversar: "no meu selo você seria tratado(a) como merece".', '{o} invites {h} ({a}) for a talk: "at my label you\'d be treated as you deserve".'),
    opts: [
      { id: 'listen', label: l('Ouvir a proposta', 'Hear the offer'), hint: l('Fica de olho na porta: relação com o rival +15; com o dono −10; estresse +5.', 'One foot out the door: relationship with the rival +15; with the owner −10; stress +5.'), kind: 'hot', w: (P) => F(P, 'ambicao') + (2 - F(P, 'lealdade')),
        apply: (s, c) => { const a = actOf(s, c); const L0 = leaders(s).L[c.cast.rival.slice(2)]; if (L0) L0.rel[`p:${c.hero}`] = clamp((L0.rel[`p:${c.hero}`] ?? 0) + 15, -100, 100); resent(s, c.hero, 10); addStress(s, c.hero, 5, l('Dividido(a) entre dois selos', 'Torn between two labels')); if (a) emitFact(s, { kind: 'poach', actors: [a.id, c.cast.rlabel], place: a.city, severity: 30, visibility: 'rumor', tags: ['dms18'], text: fmtL(l('Boato: {a} conversa com {o}.', 'Rumor: {a} talks with {o}.'), { a: a.name, o: nmP(s, c.cast.rival) }), src: 'dmsits18' }); } },
      { id: 'leverage', label: l('Usar para renegociar', 'Use it to renegotiate'), hint: l('O dono paga ~$5k para segurar; ressentimento −10.', 'The owner pays ~$5k to keep them; resentment −10.'), kind: 'cool', w: (P) => F(P, 'ambicao') + F(P, 'disciplina') * 0.5,
        apply: (s, c) => { pay(s, actOf(s, c), 5000, 'Contraproposta', 'counter'); resent(s, c.hero, -10); } },
      { id: 'refuse', label: l('Recusar por lealdade', 'Refuse out of loyalty'), hint: l('Lealdade registrada; o rival guarda o desaforo.', 'Loyalty logged; the rival remembers the snub.'), kind: 'out', w: (P) => F(P, 'lealdade') * 2,
        apply: (s, c) => { const a = actOf(s, c); if (a) grantHold(s, { holder: a.owner === 'player' ? 'player' : a.owner ?? a.id, target: c.hero, kind: 'loyalty', strength: 40, months: 36, src: 'dmsits18', text: l('recusou proposta de rival', 'turned down a rival offer'), quiet: true }); } },
    ],
  },
  {
    id: 'fear', name: l('Medo', 'Fear'), pressure: 'law', cost: 2,
    pick: (s, r) => {
      for (const a of pool(s, r, 20)) {
        for (const pid of a.members) {
          const p = s.persons[pid]; if (!okP(s, p)) continue;
          const h = holdsOf(s, pid).owes.find((x) => (x.kind === 'secret' || x.kind === 'blackmail') && x.status === 'open' && x.holder !== 'player' && !shield18(s, x.holder));
          if (h) return { hero: pid, act: a.id, cast: { person: pid, holder: h.holder }, data: { hold: h.id } };
        }
      }
      return null;
    },
    title: l('{h} tem medo de {o}', '{h} is afraid of {o}'),
    text: l('{o} sabe de algo sobre {h} ({a}). Hoje, deixou isso bem claro.', '{o} knows something about {h} ({a}). Today, they made it very clear.'),
    opts: [
      { id: 'pay', label: l('Pagar', 'Pay'), hint: l('~$5k do caixa do ato; o segredo some (por ora).', '~$5k from the act\'s cash; the secret goes away (for now).'), kind: 'out', w: (P) => F(P, 'ansiedade') + F(P, 'disciplina') * 0.5,
        apply: (s, c) => { pay(s, actOf(s, c), 5000, 'Silêncio', 'silence'); voidHolds(s, (h) => h.id === c.data.hold); } },
      { id: 'confront', label: l('Enfrentar', 'Confront'), hint: l('40%: ele recua; 60%: o segredo vaza.', '40%: they back down; 60%: the secret leaks.'), kind: 'hot', w: (P) => F(P, 'coragem') + F(P, 'impulsividade'),
        apply: (s, c, r) => { if (r.chance(0.4)) { voidHolds(s, (h) => h.id === c.data.hold); return l('Encarado, ele recua.', 'Faced down, they back off.'); } const u = useHold(s, String(c.data.hold), 'expose'); const a = actOf(s, c); if (a) scandal(s, a.id, 'conduct', 35, u.text, { person: c.hero, tags: ['dms18'] }); return fmtL(l('{o} cumpriu a ameaça.', '{o} followed through.'), { o: nmP(s, c.cast.holder) }); } },
      { id: 'confess', label: l('Confessar antes', 'Confess first'), hint: l('Escândalo pequeno agora; o trunfo morre.', 'A small scandal now; the leverage dies.'), kind: 'cool', w: (P) => F(P, 'coragem') + F(P, 'empatia') * 0.5,
        apply: (s, c) => { const a = actOf(s, c); if (a) scandal(s, a.id, 'conduct', 18, fmtL(l('{h} conta tudo antes que contem.', '{h} tells all before anyone else does.'), { h: nmP(s, c.hero) }), { person: c.hero, tags: ['dms18'] }); voidHolds(s, (h) => h.id === c.data.hold); } },
    ],
  },
  {
    id: 'pride', name: l('Orgulho', 'Pride'), pressure: 'heart', cost: 1,
    pick: (s, r) => {
      for (const a of pool(s, r)) {
        const ms = a.members.map((m) => s.persons[m]).filter((p) => okP(s, p));
        if (ms.length < 2) continue;
        const [x, y] = r.shuffle(ms);
        return { hero: x.id, act: a.id, cast: { person: x.id, other: y.id }, data: {} };
      }
      return null;
    },
    title: l('De quem é a música?', 'Whose song is it?'),
    text: l('{h} jura que escreveu o refrão do sucesso de {a}. {o} lembra diferente.', '{h} swears they wrote the chorus of {a}\'s hit. {o} remembers it differently.'),
    opts: [
      { id: 'lawyer', label: l('Chamar advogado', 'Call a lawyer'), hint: l('Relação −30; vira mágoa; notícia de processo.', 'Relationship −30; becomes a grudge; lawsuit news.'), kind: 'hot', w: (P) => F(P, 'teimosia') + F(P, 'ego'),
        apply: (s, c) => { rel(s, c.hero, c.cast.other, -30); grantHold(s, { holder: c.cast.other, target: c.hero, kind: 'grievance', strength: 45, months: 60, src: 'dmsits18', text: l('processo pelo refrão', 'lawsuit over the chorus'), quiet: true }); const a = actOf(s, c); if (a) emitFact(s, { kind: 'law', actors: [c.hero, c.cast.other, a.id], place: a.city, severity: 30, visibility: 'public', tags: ['law', 'dms18'], text: fmtL(l('{h} processa {o} pela autoria de um sucesso de {a}.', '{h} sues {o} over the authorship of an {a} hit.'), { h: nmP(s, c.hero), o: nmP(s, c.cast.other), a: a.name }), src: 'dmsits18' }); } },
      { id: 'share', label: l('Dividir o crédito', 'Share the credit'), hint: l('Relação +10 dos dois.', 'Relationship +10 for both.'), kind: 'cool', w: (P) => F(P, 'empatia') + F(P, 'generosidade'),
        apply: (s, c) => { rel(s, c.hero, c.cast.other, 10); } },
      { id: 'let', label: l('Deixar pra lá', 'Let it go'), hint: l('Ressentimento +12; inspiração +5 ("a próxima eu assino sozinho").', 'Resentment +12; inspiration +5 ("I\'ll sign the next one alone").'), kind: 'out', w: (P) => F(P, 'paciencia') + F(P, 'humor'),
        apply: (s, c) => { resent(s, c.hero, 12); insp(s, c.hero, 5); } },
    ],
  },
];

// ---------------------------------------------------------------- complicações

interface Comp { id: string; name: L; line: L; hint: L; fx: (s: GameState, c: SitCtx, k: Kind, r: Rng) => L | void }
const COMPS: Comp[] = [
  { id: 'press', name: l('com imprensa', 'with press'), line: l('Um repórter está a dois metros, gravador ligado.', 'A reporter stands two meters away, recorder on.'), hint: l('Imprensa: atitude quente vira manchete (hype +5, escândalo leve); fria rende simpatia (embalo +2).', 'Press: a hot move makes headlines (hype +5, mild scandal); a cool one wins sympathy (momentum +2).'),
    fx: (s, c, k) => { const a = actOf(s, c); if (!a) return; if (k === 'hot') { addHype(s, `a:${a.id}`, 'dms18press', l('Manchete', 'Headline'), 5); scandal(s, a.id, 'conduct', 18, fmtL(l('Flagrado(a) {w}.', 'Caught {w}.'), { w: settingOf(c).name }), { person: c.hero, tags: ['dms18'], quiet: !mineA(s, a) }); } else if (k === 'cool') mom(a, 2); } },
  { id: 'tape', name: l('com gravação', 'on tape'), line: l('Alguém está gravando tudo — e não é da banda.', 'Someone is recording everything — and they\'re not in the band.'), hint: l('Gravação: atitude quente vira trunfo nas mãos de alguém (segredo).', 'Tape: a hot move becomes leverage in someone\'s hands (a secret).'),
    fx: (s, c, k, r) => { if (k !== 'hot') return; const a = actOf(s, c); const w = Object.values(s.persons).find((p) => okP(s, p) && p.id !== c.hero && !a?.members.includes(p.id) && (p.rel[c.hero] ?? 0) < 0) ?? (a ? s.persons[a.members.find((m) => m !== c.hero && okP(s, s.persons[m])) ?? ''] : undefined); if (!w || !r.chance(0.7)) return; grantHold(s, { holder: w.id, target: c.hero, kind: 'secret', strength: 45, proof: 2, months: 120, src: 'dmsits18', text: fmtL(l('Gravação de {h} {w}', 'A tape of {h} {w}'), { h: nmP(s, c.hero), w: settingOf(c).name }), quiet: true }); return fmtL(l('{w} guardou a gravação.', '{w} kept the tape.'), { w: w.name }); } },
  { id: 'witness', name: l('com testemunha', 'with a witness'), line: l('Um velho conhecido dos dois assiste a tudo calado.', 'An old acquaintance of both watches it all in silence.'), hint: l('Testemunha: atitude quente afasta (relação −10); fria aproxima (+10) e ela vira aliada.', 'Witness: a hot move pushes them away (relationship −10); a cool one draws them in (+10), an ally.'),
    fx: (s, c, k) => { const p = s.persons[c.hero]; if (!p) return; const w = Object.entries(p.rel).filter(([id, v]) => v > 15 && okP(s, s.persons[id]) && id !== c.cast.other).sort((x, y) => y[1] - x[1])[0]?.[0]; if (!w) return; rel(s, w, c.hero, k === 'hot' ? -10 : k === 'cool' ? 10 : 0); if (k === 'cool') grantHold(s, { holder: c.hero, target: w, kind: 'favor', strength: 30, months: 36, src: 'dmsits18', text: l('Testemunhou sua grandeza', 'Witnessed your grace'), quiet: true }); } },
  { id: 'rival', name: l('com um selo rival de olho', 'with a rival label watching'), line: l('Um executivo de outro selo observa do bar, sorrindo.', 'An executive from another label watches from the bar, smiling.'), hint: l('Selo rival: atitude quente atrai um aliciador (relação do rival +10, boato de saída).', 'Rival label: a hot move draws a poacher (rival relationship +10, exit rumor).'),
    fx: (s, c, k) => { if (k !== 'hot') return; const a = actOf(s, c); const lb = Object.values(s.labels).find((x) => x.active && x.id !== a?.owner && x.leaderId && !shield18(s, x.id)); if (!lb || !a) return; const L0 = leaders(s).L[lb.leaderId!]; if (L0) L0.rel[`p:${c.hero}`] = clamp((L0.rel[`p:${c.hero}`] ?? 0) + 10, -100, 100); emitFact(s, { kind: 'poach', actors: [a.id, lb.id], place: a.city, severity: 25, visibility: 'rumor', tags: ['dms18'], text: fmtL(l('Boato: {l} quer {a} depois do que viu {w}.', 'Rumor: {l} wants {a} after what they saw {w}.'), { l: lb.name, a: a.name, w: settingOf(c).name }), src: 'dmsits18' }); } },
];

// ---------------------------------------------------------------- registro (8 × 4 = 32)

const fill = (s: GameState, c: SitCtx, t: L): L => fmtL(t, { h: nmP(s, c.hero), o: nmP(s, c.cast.other ?? c.cast.boss ?? c.cast.target ?? c.cast.rival ?? c.cast.holder), a: actOf(s, c)?.name ?? '?', b: nmP(s, c.cast.oact) });
export const DMSITS18: string[] = [];
let ix = 0;
for (const M of MOTIVES) for (const C of COMPS) {
  const id = `dm18_${M.id}_${C.id}`;
  const k = ix++;
  DMSITS18.push(id);
  registerSituation({
    id, pressure: M.pressure, cost: M.cost, cooldown: 8, tone: 'mixed',
    // o Mestre segura as situações na calmaria (só de vez em quando)
    // rodízio: cerca de 1/3 dos modelos por mês (1/2 no clímax, 1/6 na calmaria) para não abafar as outras situações
    when: (s) => { const ph = dm18(s).ph; return (s.month + s.year + k) % (ph === 'climax' ? 2 : ph === 'calm' ? 6 : 3) === 0; },
    actorsPick: (s, _c, r) => {
      const c = M.pick(s, r);
      if (!c) return null;
      const ok = SETTINGS.map((x, i) => [x, i] as const).filter(([x]) => s.year >= x.from);
      c.data.set = ok[r.int(0, ok.length - 1)][1];
      c.data.m = M.id; c.data.c = C.id;
      return c;
    },
    title: (s, c) => fmtL(l('{t} — {w}', '{t} — {w}'), { t: fill(s, c, M.title), w: settingOf(c).name }),
    text: (s, c) => fmtL(l('{x} {t} {c}', '{x} {t} {c}'), { x: settingOf(c).line, t: fill(s, c, M.text), c: C.line }),
    options: M.opts.map((o) => ({
      id: o.id, label: o.label, hint: fmtL(l('{h} · {c}', '{h} · {c}'), { h: o.hint, c: C.hint }),
      weightByTraits: (P: P13 | null) => o.w(P),
      apply: (s: GameState, c: SitCtx, r: Rng) => {
        const a = o.apply(s, c, r);
        const b = C.fx(s, c, o.kind, r);
        if (settingOf(c).id === 'tribute' && o.kind === 'hot') addStress(s, c.hero, 5, l('Briga numa homenagem pegou mal', 'A fight at a tribute looked bad'));
        if (settingOf(c).id === 'tv' && o.kind === 'hot') { const x = actOf(s, c); if (x) addHype(s, `a:${x.id}`, 'dms18tv', l('Ao vivo na TV', 'Live on TV'), 3); }
        const t = [a, b].filter(Boolean) as L[];
        return t.length ? (t.length === 1 ? t[0] : fmtL(l('{a} {b}', '{a} {b}'), { a: t[0], b: t[1] })) : undefined;
      },
    })),
  });
}
