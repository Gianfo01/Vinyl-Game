// Rodada 27 (AUD2) — ESTRESSE QUE MORDE. Em 2 anos de bot o mundo inteiro teve 0 quebras: o desgaste longo do
// stress17 quase nunca passa de 45 (cresce 0,1 por ponto acima de 40 de curto prazo), então a regra "curto > 65 E
// longo > 45" do bridge17 nunca dispara. Esta camada soma duas portas, com sorteio próprio por mês:
//  • CRISE AGUDA: curto ≥ 75 (alguém no limite agora) — chance (6% + (curto − 75)/120) × (0,6 + vulnerabilidade);
//  • DESGASTE CRÔNICO: longo ≥ 20 e curto ≥ 50 — 5% + (longo − 20)/150.
//  As duas usam a mesma quebra do bridge17 (colapso no seu elenco; surto, vício ou esgotamento nos NPCs), no máximo
//  uma por pessoa por ano, com o mesmo ritmo do mundo (pace9) e a trava de gente real (history15) para NPCs.
//  • O DONO (você): estresse ≥ 80 por 2 meses → cartão de esgotamento (parar um mês, seguir trabalhando, afogar no
//    bar, se apoiar na família), no máximo 1 por ano; empurrar com a barriga deixa a próxima crise mais provável.
//  • As ações "gaste X, estresse −N" (noitada, droga, viagem, saída) ganham CONTEXTO (relief27): com quem você bebeu
//    (laço com o artista — e o vício dele, se houver), o executivo rival no balcão (rivalidade esfria), o fotógrafo
//    (boato de drogas no secrets23), o cobrador do agiota (shark27), o escritório sem você (equipe desleal = cheque
//    perdido; leal = confiança), o par que ficou em casa, o jornalista na mesa ao lado (um segredo do seu círculo
//    sobe um nível na imprensa).

import { Rng, clamp } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { deferEvents, registerExt4, registerSimHook } from '../../ext4';
import { emitEvent, type EventDef } from '../../events';
import { emitFact } from '../../facts17';
import { histLocked } from '../../history15';
import { RELIEF27, type Relief27 } from '../../relief27';
import { addStress, relieveLong, shortOf, stress17, vulnOf } from '../../stress17';
import type { Act, GameState, Person } from '../../types';
import { fmtL, money, notify, playerActs, post } from '../../util';
import { _bridge17 } from '../bridge17';
import { avgLoy19 } from '../culture19';
import { energyLeft, life, playerPerson, spendEnergy } from '../life';
import { playerFame } from '../love17';
import { worldDramaOk } from '../pace9';
import { P, healthOf } from '../people/state';
import { ownerOf } from '../people/owner';
import { opine } from '../persona13';
import { addSecret23, raise23, secretsOf23 } from '../secrets23';
import { vices } from '../vices';
import { OFF_AUD27 } from './off';
import { shark27 } from './shark27';

const N = (pt: string, en: string): L => l(pt, en);

export interface Burn27State { hot: number; last: number; push: number; rn: number; n: { acute: number; chronic: number; owner: number }; log: [number, number, L][] }
declare module '../../ext4' { interface Ext4 { burn27: Burn27State } }
const fresh = (): Burn27State => ({ hot: 0, last: -999, push: 0, rn: 0, n: { acute: 0, chronic: 0, owner: 0 }, log: [] });
registerExt4('burn27', fresh);
export function burn27(s: GameState): Burn27State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.burn27 ??= fresh()) as Burn27State;
  st.n ??= { acute: 0, chronic: 0, owner: 0 }; st.log ??= []; st.rn ??= 0; st.push ??= 0; st.hot ??= 0; st.last ??= -999;
  return st;
}
const logIt = (s: GameState, t: L): void => { const st = burn27(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 30) st.log.length = 30; };

/** Chance mensal de quebra pelas portas novas (0 se nenhuma abre). Mostrável na interface. */
export function breakChance27(short: number, long: number, vuln: number): { p: number; k: 'acute' | 'chronic' | null } {
  const acute = short >= 75 ? clamp((0.06 + (short - 75) / 120) * (0.6 + vuln), 0, 0.35) : 0;
  const chronic = long >= 20 && short >= 50 ? clamp(0.05 + (long - 20) / 150, 0, 0.3) : 0;
  return acute >= chronic ? { p: acute, k: acute ? 'acute' : null } : { p: chronic, k: 'chronic' };
}

function tracked(s: GameState): [Person, Act, boolean][] {
  const out: [Person, Act, boolean][] = [];
  const mine = new Set(playerActs(s));
  const seen = new Set<string>();
  for (const a of Object.values(s.acts)) {
    if (a.status !== 'active' && a.status !== 'emerging' && a.status !== 'hiatus') continue;
    const my = mine.has(a.id);
    if (!my && a.fame < 35) continue;
    for (const id of a.members) {
      const p = s.persons[id];
      if (!p?.alive || seen.has(id)) continue;
      seen.add(id);
      // pré-filtro barato: sem tensão de base, cansaço, saúde, moral ou mágoa não há como chegar perto
      if (p.stress < 30 && p.fatigue < 70 && p.health === 'ok' && p.morale >= 30 && p.resentment < 40) continue;
      out.push([p, a, my]);
    }
  }
  return out;
}

export function burnoutMonth27(s: GameState): void {
  const st = burn27(s), s17 = stress17(s);
  const r = Rng.fromSeed(`${s.config.seed}:burn27:${s.week}`);
  for (const [p, a, mine] of tracked(s)) {
    if (s17.lb[p.id] === s.year) continue;
    const c = breakChance27(shortOf(s, p).v, s17.l[p.id] ?? 0, vulnOf(s, p));
    if (!c.k || !r.chance(c.p)) continue;
    if (!mine && (histLocked(s, a) || !worldDramaOk(s, r, 1))) continue;
    _bridge17.breakdown17(s, r, p, a, mine);
    st.n[c.k]++;
  }
  ownerMonth(s, r);
}

// ---------------------------------------------------------------- o dono

function ownerMonth(s: GameState, r: Rng): void {
  const st = burn27(s), o = ownerOf(s), me = playerPerson(s);
  const hot = o.stress >= 80 || (!!me && shortOf(s, me).v >= 80);
  st.hot = hot ? st.hot + 1 : 0;
  if (st.hot < 2 || s.week - st.last < 52 || s.ended || s.config.contentFilters.includes('health')) return;
  if (!r.chance(Math.min(0.9, 0.45 + st.push * 0.2))) return;
  if (s.decisions.some((d) => d.eventId === 'burnout27_owner')) return;
  st.last = s.week; st.n.owner++;
  emitFact(s, { kind: 'health', actors: [me?.id ?? 'player', 'player'], place: s.config.homeCity, severity: 40, visibility: 'rumor', tags: ['bad', 'stress', 'burnout', 'owner'],
    text: fmtL(N('{o}, dono(a) de {c}, chega ao limite: insônia, crises e decisões no automático.', '{o}, owner of {c}, hits the wall: insomnia, panic and decisions on autopilot.'), { o: o.name, c: s.config.companyName }), src: 'burnout27' });
  emitEvent(s, r, 'burnout27_owner', {});
}

const relieveMe = (s: GameState, d: number, long: number) => { const o = ownerOf(s), me = playerPerson(s); o.stress = clamp(o.stress - d, 0, 100); if (me) { addStress(s, me.id, -d, N('Esgotamento tratado', 'Burnout treated')); relieveLong(s, me.id, long); } };
export const BURN_EVS27: EventDef[] = [{
  id: 'burnout27_owner', cat: 'health', tone: 'bad', tags: ['health', 'burnout27'], cooldown: 0, forcedOnly: true,
  title: N('Você chegou ao limite', 'You have hit the wall'),
  text: N('Meses dormindo pouco, decidindo tudo, apagando incêndio. O médico é direto: ou para, ou o corpo para por você. A equipe já percebeu.',
    'Months of little sleep, deciding everything, putting out fires. The doctor is blunt: either you stop, or your body stops for you. The staff have noticed.'),
  options: [
    { id: 'rest', label: N('Parar um mês: médico e descanso', 'Stop for a month: doctor and rest'), hint: N('Custa do seu bolso; estresse −45 e desgaste longo −25; o tempo livre do mês acaba.', 'Paid from your pocket; stress −45 and long-term wear −25; this month\'s free time is gone.'),
      apply: (s) => { ownerOf(s).wealth -= money(s, 2500); relieveMe(s, 45, 25); spendEnergy(s, energyLeft(s)); burn27(s).push = 0; logIt(s, N('Um mês longe de tudo. Você volta outra pessoa.', 'A month away from everything. You come back a different person.')); } },
    { id: 'family', label: N('Se apoiar na família', 'Lean on your family'), hint: N('Estresse −25; vínculo com os filhos +5; sem família por perto, ajuda menos.', 'Stress −25; bond with the kids +5; with no family around, it helps less.'),
      apply: (s) => { const L0 = life(s); const fam = !!L0.partner || ownerOf(s).kids.length > 0; relieveMe(s, fam ? 25 : 10, fam ? 10 : 3); for (const k of Object.values(L0.kidsX)) k.bond = clamp(k.bond + 5, 0, 100); if (L0.partner) L0.partner.affinity = clamp(L0.partner.affinity + 3, 0, 100); burn27(s).push = 0; } },
    { id: 'drink', label: N('Afogar no bar', 'Drown it at the bar'), hint: N('Estresse −30 agora; dependência de bebida +15 e atenção da imprensa.', 'Stress −30 now; drinking dependency +15 and press attention.'),
      apply: (s) => { const v = vices(s); v.dep.drink = clamp(v.dep.drink + 15, 0, 100); v.heat = clamp(v.heat + 5, 0, 100); relieveMe(s, 30, 0); burn27(s).push++; } },
    { id: 'push', label: N('Seguir trabalhando', 'Keep working'), hint: N('Estresse −5; saúde −12; a próxima crise fica mais provável.', 'Stress −5; health −12; the next crisis becomes more likely.'),
      apply: (s) => { const o = ownerOf(s); o.health = clamp(o.health - 12, 0, 100); relieveMe(s, 5, 0); burn27(s).push++; } },
  ],
}];
deferEvents<EventDef>(BURN_EVS27);

// ---------------------------------------------------------------- contexto das ações de alívio

function myCircleSecret(s: GameState, r: Rng) {
  const subs = playerActs(s).map((id) => `a:${id}`);
  const list = subs.flatMap((k) => secretsOf23(s, k));
  return list.length ? r.pick(list) : undefined;
}

export function reliefContext27(s: GameState, kind: Relief27, d: number, ref?: string): L | null {
  const st = burn27(s);
  const r = Rng.fromSeed(`${s.config.seed}:relief27:${kind}:${ref ?? ''}:${s.week}:${st.rn++}`);
  const o = ownerOf(s), fame = playerFame(s);
  const say = (t: L, tone: 'bad' | 'good' | 'info' = 'info'): L => { logIt(s, t); if (tone !== 'info') notify(s, t, tone); return t; };
  if (kind === 'drink' || kind === 'drugs') {
    // o cobrador do agiota te acha no bar
    if (Object.keys(shark27(s).L).length && r.chance(0.2)) { o.stress = clamp(o.stress + 8, 0, 100); return say(N('No balcão, um dos homens do agiota senta ao seu lado. O alívio dura pouco.', 'At the bar, one of the loan shark\'s men sits next to you. The relief does not last.'), 'bad'); }
    // fotógrafo: vira boato de drogas na imprensa
    if (r.chance(0.05 + fame / 400 + (kind === 'drugs' ? 0.08 : 0))) {
      if (kind === 'drugs' || vices(s).dep.drink >= 40) {
        const sec = secretsOf23(s, 'player').find((x) => x.kind === 'drugs') ?? addSecret23(s, { kind: 'drugs', subject: 'player', sev: 40, ev: 35, base: { p: 4 } });
        raise23(s, sec, 'press', 2, 'press', N('fotografado(a) na noite', 'photographed on a night out'));
        return say(N('Um fotógrafo te pega saindo da festa: boato sobre o seu uso circula nas redações.', 'A photographer catches you leaving the party: rumours about your use reach the newsrooms.'), 'bad');
      }
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100);
      return say(N('Foto saindo do bar de madrugada: nada grave, mas gente séria comenta.', 'A late-night photo leaving the bar: nothing serious, but serious people talk.'));
    }
    // com quem você bebeu: alguém do elenco (laço) — e o vício dele, se houver
    const mates = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.playerBand).flatMap((a) => a.members.map((m) => s.persons[m]).filter((p): p is Person => !!p?.alive && !p.isPlayer));
    if (mates.length && r.chance(0.4)) {
      const p = mates.sort((a, b) => b.stress - a.stress || (a.id < b.id ? -1 : 1))[0];
      opine(s, `p:${p.id}`, 4, N('Noitada com o chefe', 'A night out with the boss'));
      addStress(s, p.id, -5, N('Noitada com o chefe', 'A night out with the boss'));
      const h = healthOf(s, p.id);
      if (kind === 'drugs' || h.history || h.dependency >= 30) { h.dependency = clamp(h.dependency + 6, 0, 100); return say(fmtL(N('Você e {p} viram a noite. Laço mais forte — e um vício alimentado.', 'You and {p} party till dawn. A stronger bond — and a habit fed.'), { p: p.name }), 'bad'); }
      return say(fmtL(N('Você e {p} viram a noite: a confiança sobe.', 'You and {p} party till dawn: trust goes up.'), { p: p.name }));
    }
    // o executivo rival no balcão
    const lbs = Object.values(s.labels).filter((lb) => lb.active && lb.leaderId && lb.city === s.config.homeCity).sort((a, b) => (a.id < b.id ? -1 : 1));
    if (lbs.length && r.chance(0.2)) {
      const lb = r.pick(lbs);
      opine(s, `l:${lb.leaderId}`, 4, N('Bebeu com você', 'Had a drink with you'));
      s.rivalries[lb.id] = Math.max(0, (s.rivalries[lb.id] ?? 0) - 3);
      return say(fmtL(N('No balcão, alguém de {l}. Duas doses depois, a rivalidade esfria um pouco.', 'At the bar, someone from {l}. Two rounds later, the rivalry cools a little.'), { l: lb.name }));
    }
    return null;
  }
  if (kind === 'trip') {
    const ls = s.player.staff.map((m) => P(s).career[m.id]?.loyalty).filter((x): x is number => x !== undefined);
    const loy = ls.length ? avgLoy19(s) : 50;
    if (ls.length && loy < 40 && r.chance(0.5)) {
      post(s, `relief27:office:${s.week}`, -money(s, 1200), 'misc', 'Escritório sem o dono: cheque perdido');
      return say(N('Na sua ausência ninguém assinou os cheques certos: multa e fornecedor bravo.', 'While you were away nobody signed the right cheques: a fine and an angry supplier.'), 'bad');
    }
    if (ls.length && loy >= 55 && r.chance(0.35)) {
      for (const m of s.player.staff) { const c = P(s).career[m.id]; if (c) c.loyalty = clamp(c.loyalty + 1, 0, 100); }
      return say(N('A equipe segurou tudo sem você — e gostou de ser confiada.', 'The staff ran everything without you — and liked being trusted.'), 'good');
    }
    const pt = life(s).partner;
    if (pt && r.chance(0.4)) { pt.affinity = clamp(pt.affinity - 4, 0, 100); return say(fmtL(N('{p} ficou em casa e não gostou da viagem sozinho(a).', '{p} stayed home and did not like the solo trip.'), { p: pt.name })); }
    return null;
  }
  // saída (bar, clube, igreja, parque…)
  if (ref === 'bar' || ref === 'club') {
    if (r.chance(0.1)) {
      const sec = myCircleSecret(s, r);
      if (sec) { raise23(s, sec, 'press', 1, 'press', N('ouvido numa mesa de bar', 'overheard at a bar table')); return say(N('Um jornalista na mesa ao lado ouviu mais do que devia sobre alguém do seu elenco.', 'A journalist at the next table heard more than they should about someone on your roster.'), 'bad'); }
    }
    if (r.chance(0.15)) { o.health = clamp(o.health - 2, 0, 100); return say(N('Ressaca: a manhã seguinte cobra a noite.', 'Hangover: the next morning collects on the night.')); }
  }
  void d;
  return null;
}
RELIEF27.push((s, kind, d, ref) => { if (!OFF_AUD27.burnout) reliefContext27(s, kind, d, ref); });

registerSimHook('month', 'burnout27', (s) => { if (!OFF_AUD27.burnout) burnoutMonth27(s); });
