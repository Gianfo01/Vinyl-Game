// R31 · onda 2 (Q) — delegação única (sim/deleg31.ts + sys/deleg31run.ts):
//   • diretriz respeitada (A&R: gêneros, teto, "me pergunte acima de"; produtor executivo: nota mínima e formato);
//   • o registro de automação grava quem decidiu e por quê, e "desfazer" volta pela regra da ação manual;
//   • delegar sem diretriz nova = o mesmo resultado das regras de antes;
//   • determinismo e "explorar não muda o mundo";
//   • uma delegação só (estados antigos policy18/bud19/pace8.log/deleg16.log não existem mais).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { toReal } from '../src/core/money';
import { hashString } from '../src/core/rng';
import { advanceMonth } from '../src/sim/tick';
import { opinionOf } from '../src/sim/opinion';
import { rngSnapshot19 } from '../src/sim/rng19';
import { offerEligible29 } from '../src/sim/contracts';
import {
  EXEC31, RESP31, answerAsk31, applyPreset31, asks31, autoLog31, d31, excs31, lockWhy31, modeOf31, setDir31, setMode31, stat31, undo31,
} from '../src/sim/deleg31';
import { anrMonth31, anrRead31 } from '../src/sim/sys/deleg31run';
import { gate18 } from '../src/sim/sys/policy18';
import type { Act, GameState, StaffMember } from '../src/sim/types';

const game = (seed: string, y = 1975): GameState => {
  const s = createGame(defaultConfig(seed, { startYear: y, scenario: 'established' }));
  s.player.cash = 50_000_000_00;
  return s;
};
const hire = (s: GameState, role: string, skill = 70, id = `st-${role}`): StaffMember => {
  s.player.staff = s.player.staff.filter((x) => x.role !== role); // só o contratado do teste responde
  const st: StaffMember = { id, name: `Teste ${role}`, role, skill, salary: 100_000, hiredWeek: s.week };
  s.player.staff.push(st);
  return st;
};
/** Põe no radar do selo vários atos livres (o A&R só escolhe entre quem você já conhece). */
const scoutSome = (s: GameState, n = 30): Act[] => {
  const free = Object.values(s.acts).filter((a) => offerEligible29(s, a, 'classic').ok && !s.knowledge[a.id]).sort((a, b) => (a.id < b.id ? -1 : 1)).slice(0, n);
  for (const a of free) s.knowledge[a.id] = { actId: a.id, degree: 3, stage: 'investigating', bias: 0, updatedWeek: s.week, source: 'test' };
  return free;
};
const stateSig = (s: GameState): number => hashString(JSON.stringify([s.player.cash, s.offers, Object.keys(s.contracts).length, s.pendingReleases.map((x) => x.id), s.agenda]));

describe('R31 Q · diretriz respeitada', () => {
  it('A&R delegado: só gêneros da diretriz, adiantamento até o teto, pelas regras da proposta manual', () => {
    const s = game('r31dlg-a');
    const known = scoutSome(s);
    const genre = known[0].genre;
    const st = hire(s, 'anr');
    expect(setMode31(s, 'anr', 'staff')).toBeNull();
    setDir31(s, 'anr', { genres: [genre], cap: 1_000_000, per: 3 });
    const n0 = s.offers.length;
    anrMonth31(s);
    const mine = s.offers.slice(n0);
    expect(mine.length).toBeGreaterThan(0);
    for (const o of mine) {
      expect(s.acts[o.actId].genre).toBe(genre);
      expect(toReal(o.advance, s.year)).toBeLessThanOrEqual(1_000_000 + 100);
      expect(o.status).toBe('pending'); // resposta no fechamento do mês, como a proposta manual
    }
    const e = autoLog31(s, { r: 'anr', who: st.id }).find((x) => x.x === 'offer')!;
    expect(e).toBeTruthy();
    expect(e.why?.pt.length).toBeGreaterThan(10);
    expect(e.undo?.k).toBe('offer');
  });

  it('teto baixo: o A&R passa quem pede muito mais; parcial acima do limite vira pedido de aprovação', () => {
    const s = game('r31dlg-b');
    scoutSome(s);
    hire(s, 'anr');
    setMode31(s, 'anr', 'staff');
    setDir31(s, 'anr', { cap: 1 });
    const n0 = s.offers.length;
    anrMonth31(s);
    expect(s.offers.length).toBe(n0);
    expect(autoLog31(s, { r: 'anr' }).some((x) => x.x === 'cap')).toBe(true);
    // parcial: decide até o limite, pergunta acima dele
    setDir31(s, 'anr', { cap: 0, ask: 1 });
    expect(setMode31(s, 'anr', 'partial')).toBeNull();
    anrMonth31(s);
    expect(s.offers.length).toBe(n0);
    const ask = asks31(s).find((a) => a.r === 'anr')!;
    expect(ask).toBeTruthy();
    expect(answerAsk31(s, ask.id, true)).toBeNull();
    expect(s.offers.length).toBe(n0 + 1);
    expect(s.offers[s.offers.length - 1].actId).toBe(ask.act);
  });

  it('qualidade do A&R pesa: o fraco lê o potencial com mais ruído e paga mais adiantamento', () => {
    const s = game('r31dlg-q');
    scoutSome(s);
    hire(s, 'anr', 15, 'st-weak');
    const r1 = anrRead31(s, null);
    hire(s, 'anr', 95, 'st-good');
    const r2 = anrRead31(s, null);
    const a = r1[0].act.id;
    expect(r1.find((x) => x.act.id === a)!.adv).toBeGreaterThan(r2.find((x) => x.act.id === a)!.adv);
  });

  it('produtor executivo: nota mínima segura o lançamento; faixa boa sai no formato pedido', () => {
    const s = game('r31dlg-c');
    hire(s, 'producer', 95);
    const act = Object.values(s.acts).find((a) => a.owner === 'player' && !a.playerBand)!;
    const tpl = Object.values(s.songs)[0];
    const songs = [0, 1, 2].map((i) => { const x = { ...tpl, id: `t31-${i}`, actId: act.id, recorded: true, releaseId: undefined, vault: false, q: 20 }; s.songs[x.id] = x; return x; });
    act.songs = songs.map((x) => x.id);
    const base = { ok: true, minGap: 0, budgetMult: 1, maxSpend: Number.MAX_SAFE_INTEGER };
    expect(EXEC31.release!(s, act, base)).toEqual(base); // regra de sempre (padrão)
    setMode31(s, 'exec', 'staff');
    setDir31(s, 'exec', { minQ: 70, fmt: 'single' });
    expect(EXEC31.release!(s, act, base).ok).toBe(false);
    expect(autoLog31(s, { r: 'exec' }).some((x) => x.x === 'minq')).toBe(true);
    songs[0].q = 98;
    const p = EXEC31.release!(s, act, base);
    expect(p.ok).toBe(true);
    expect(p.type).toBe('single');
    expect(p.songs).toEqual([songs[0].id]);
    setDir31(s, 'exec', { cap: 1000 });
    expect(EXEC31.release!(s, act, base).maxSpend).toBeLessThanOrEqual(s.player.cash);
  });

  it('modo travado sem gente qualificada mostra o cargo que falta; política de descanso trava a turnê delegada', () => {
    const s = game('r31dlg-d');
    s.player.staff = s.player.staff.filter((x) => x.role !== 'anr');
    expect(lockWhy31(s, 'anr', 'staff')?.pt).toMatch(/A&R/);
    expect(setMode31(s, 'anr', 'staff')).not.toBeNull();
    expect(modeOf31(s, 'anr')).toBe('me');
    const act = Object.values(s.acts).find((a) => a.owner === 'player' && !a.playerBand)!;
    for (const id of act.members) if (s.persons[id]) s.persons[id].fatigue = 90;
    setDir31(s, 'rest', { rest: 50 });
    expect(gate18(s, { kind: 'tour', actId: act.id })).not.toBeNull();
    expect(excs31(s).some((e) => e.r === 'rest' && e.act === act.id)).toBe(true);
  });
});

describe('R31 Q · registro de automação', () => {
  it('grava quem decidiu e o motivo; desfazer retira a proposta e pesa na opinião de quem decidiu', () => {
    const s = game('r31dlg-e');
    scoutSome(s);
    const st = hire(s, 'anr');
    const opBefore = opinionOf(s, `s:${st.id}`);
    setMode31(s, 'anr', 'staff');
    const op0 = opinionOf(s, `s:${st.id}`);
    expect(op0).toBeGreaterThan(opBefore); // delegar é gesto de confiança (opinion.ts)
    anrMonth31(s);
    const e = autoLog31(s, { r: 'anr', who: st.id }).find((x) => x.x === 'offer')!;
    expect(e.n).toBe(st.name);
    expect(e.t.pt).toMatch(/propôs contrato/);
    expect(e.t.en.length).toBeGreaterThan(10);
    const offerId = e.undo!.id;
    expect(undo31(s, e.id)).toBeNull();
    expect(s.offers.some((o) => o.id === offerId)).toBe(false);
    expect(d31(s).log.find((x) => x.id === e.id)!.undone).toBe(1);
    expect(opinionOf(s, `s:${st.id}`)).toBeLessThan(op0);
    expect(undo31(s, e.id)).not.toBeNull(); // não desfaz duas vezes
    expect(stat31(s, 'anr').done).toBeGreaterThan(0);
  });

  it('exceções das regras antigas (teto, reserva, descanso, renovação) entram no mesmo registro', () => {
    const s = game('r31dlg-f');
    const act = Object.values(s.acts).find((a) => a.owner === 'player' && !a.playerBand)!;
    for (const id of act.members) if (s.persons[id]) s.persons[id].fatigue = 95;
    setDir31(s, 'rest', { rest: 40 });
    gate18(s, { kind: 'tour', actId: act.id });
    const x = autoLog31(s, { tone: 'ask' })[0];
    expect(x.r).toBe('rest');
    expect(x.t.pt).toMatch(/Descanso obrigatório/);
  });
});

describe('R31 Q · delegar sem diretriz nova = regras de antes; determinismo', () => {
  it('pôr explicitamente os padrões (regra da produção, agentes com ordens) não muda nada em 3 meses', () => {
    const a = game('r31dlg-g'), b = game('r31dlg-g');
    for (const def of RESP31) setMode31(b, def.id, modeOf31(b, def.id));
    for (let i = 0; i < 3; i++) { advanceMonth(a); advanceMonth(b); }
    expect(stateSig(b)).toBe(stateSig(a));
    expect(rngSnapshot19(b)).toBe(rngSnapshot19(a));
    expect(hashString(JSON.stringify(b.acts))).toBe(hashString(JSON.stringify(a.acts)));
  }, 120000);

  it('A&R delegado é determinístico; ler a tela (leitura do A&R, registro, estatística) não sorteia nem muda o estado', () => {
    const run = () => {
      const s = game('r31dlg-h');
      scoutSome(s);
      hire(s, 'anr', 60);
      setMode31(s, 'anr', 'staff');
      setDir31(s, 'anr', { per: 2 });
      advanceMonth(s);
      advanceMonth(s);
      return s;
    };
    const a = run(), b = run();
    expect(JSON.stringify(a.offers)).toBe(JSON.stringify(b.offers));
    expect(JSON.stringify(d31(a).log)).toBe(JSON.stringify(d31(b).log));
    expect(rngSnapshot19(a)).toBe(rngSnapshot19(b));
    const snap = rngSnapshot19(a), sig = JSON.stringify(a.x4), cash = a.player.cash;
    anrRead31(a, null); autoLog31(a, { n: 50 }); for (const def of RESP31) stat31(a, def.id); excs31(a); asks31(a);
    expect(rngSnapshot19(a)).toBe(snap);
    expect(JSON.stringify(a.x4)).toBe(sig);
    expect(a.player.cash).toBe(cash);
  }, 120000);

  it('uma delegação só: os estados antigos não existem; conjuntos prontos mudam a delegação inteira', () => {
    const s = game('r31dlg-i');
    advanceMonth(s);
    const x4 = s.x4 as unknown as Record<string, Record<string, unknown> | undefined>;
    expect(x4.policy18).toBeUndefined();
    expect(x4.bud19).toBeUndefined();
    expect(x4.pace8 && 'log' in x4.pace8).toBe(false);
    expect(x4.pace8 && 'pol' in x4.pace8).toBe(false);
    expect(x4.deleg16 && 'log' in x4.deleg16).toBe(false);
    hire(s, 'anr'); hire(s, 'producer'); hire(s, 'legal');
    applyPreset31(s, 'multi');
    expect(modeOf31(s, 'anr')).toBe('staff');
    expect(modeOf31(s, 'exec')).toBe('staff');
    expect(modeOf31(s, 'renew')).toBe('staff');
    applyPreset31(s, 'garage');
    expect(modeOf31(s, 'anr')).toBe('me');
    expect(modeOf31(s, 'renew')).toBe('me');
  });
});
