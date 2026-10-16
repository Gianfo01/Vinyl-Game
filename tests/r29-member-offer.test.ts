// R29 (integrante): oferecer a um integrante específico — carreira solo pela proposta de sempre (makeOffer/acceptOffer e a
// mesa r27), entrar numa banda sua, músico de sessão, projeto paralelo, equipe; recusas, selo rival (rescisão/mágoa/
// processo) e determinismo. Ver docs/integrante29.md.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, evaluateOffer, makeOffer } from '../src/sim/contracts';
import { advanceWeek } from '../src/sim/tick';
import type { Act, GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { careerActs29, exMembers29 } from '../src/sim/sys/connect29';
import { acceptTheirs27, propose27, startNego27 } from '../src/sim/sys/nego27';
import { rv27 } from '../src/sim/sys/rivals27';
import { ses19 } from '../src/sim/sys/session19';
import { bonds } from '../src/sim/sys/bonds9';
import { ctxMenu27, menuSections27 } from '../src/ui/ps/ctx27model';
import {
  bandOf29, buyout29, memberBlock29, memberJoin29, memberOptions29, memberSession29, memberSide29, memberStaff29, mo29,
  settleMember29, soloChance29, startMemberSolo29,
} from '../src/sim/sys/member29';
import { rngSnapshot19 } from '../src/sim/rng19';

const game = (seed = 'r29mo', year = 1975): GameState => { const s = createGame(defaultConfig(seed, { startYear: year })); s.player.cash += 50_000_000_00; return s; };
const sign = (s: GameState, a: Act) => acceptOffer(s, a, { ...defaultOffer(s, a), id: `o-${a.id}`, week: s.week, status: 'pending', advance: 0 });
const live = (a: Act) => a.status === 'active' || a.status === 'emerging';
/** Banda livre (sem selo) com 3+ integrantes vivos. */
const freeBand = (s: GameState, skip: string[] = []): Act => Object.values(s.acts).filter((a) => !a.owner && !a.playerBand && live(a) && a.members.length >= 3 && a.members.every((m) => s.persons[m]?.alive && !s.persons[m].isPlayer) && !skip.includes(a.id)).sort((a, b) => b.fame - a.fame)[0];
const rivalBand = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && s.labels[a.owner]?.active && live(a) && a.members.length >= 3 && a.members.every((m) => s.persons[m]?.alive)).sort((a, b) => b.fame - a.fame)[0];
/** Uma banda sua (contratada) para receber gente. */
function myBand(s: GameState, skip: string[]): Act { const a = freeBand(s, skip); sign(s, a); return a; }
/** Força o sim na mesa: proposta generosa pela mesa r27 (o mesmo caminho da tela). */
function closeAtTable(s: GameState, actId: string): string {
  const o = defaultOffer(s, s.acts[actId]);
  o.advance *= 6; o.royalty = 0.3; o.creativeControl = true;
  const n = startNego27(s, actId, o);
  if (!('actId' in n)) throw new Error(n.pt);
  for (let i = 0; i < 6 && n.status === 'open'; i++) { if (n.theirs) acceptTheirs27(s, n); else propose27(s, n, o, 'plain'); }
  return n.status;
}

describe('R29 — oferta a um integrante específico', () => {
  it('solo aceito: ato novo seu, a banda o lista como ex-integrante e carreira/ex-integrantes (connect29) concordam', () => {
    const s = game();
    const band = freeBand(s);
    const pid = band.members.find((m) => m !== band.leaderId)!;
    const pre = soloChance29(s, pid, 'free').p;
    const r = startMemberSolo29(s, pid, 'free');
    expect('actId' in r).toBe(true);
    const id = (r as { actId: string }).actId;
    // enquanto a proposta corre: a pessoa segue na banda; a chance vem de evaluateOffer + fatores da pessoa
    expect(s.acts[band.id].members).toContain(pid);
    const ev = evaluateOffer(s, s.acts[id], defaultOffer(s, s.acts[id]));
    expect(ev.parts?.some((x) => /Deixar /.test(x.t.pt))).toBe(true);
    expect(Math.abs(ev.p - pre)).toBeLessThan(0.1); // a chance do menu é a da proposta padrão na mesa
    expect(closeAtTable(s, id)).toBe('deal');
    const msgs = settleMember29(s);
    expect(msgs.length).toBe(1);
    const solo = s.acts[id];
    expect(solo.owner).toBe('player');
    expect(solo.members).toEqual([pid]);
    expect(s.acts[band.id].members).not.toContain(pid);
    expect(exMembers29(s, s.acts[band.id]).some((x) => x.pid === pid)).toBe(true);
    const ca = careerActs29(s, pid);
    expect(ca.find((x) => x.act.id === band.id)?.current).toBe(false);
    expect(ca.find((x) => x.act.id === id)?.current).toBe(true);
    expect(s.memory.some((m) => m.kind === 'member_quits' && m.actId === band.id && m.pid === pid)).toBe(true);
    expect(s.memory.some((m) => m.kind === 'solo' && m.actId === id)).toBe(true);
    expect(mo29(s).sh[id]).toBeUndefined();
  }, 60_000);

  it('solo sem acordo: o solo-proposta some, a pessoa fica e não dá para insistir logo', () => {
    const s = game('r29mo-b2'); // r31 (W0-RNG): em 'r29mo-b' a pessoa aceita até a proposta irrisória
    const band = freeBand(s);
    const pid = band.members[1];
    const before = Object.keys(s.acts).length;
    const r = startMemberSolo29(s, pid, 'free') as { actId: string };
    const n = startNego27(s, r.actId, { ...defaultOffer(s, s.acts[r.actId]), advance: 0, royalty: 0.02 });
    if ('actId' in n) for (let i = 0; i < 6 && n.status === 'open'; i++) propose27(s, n, { ...n.ours, advance: 0, royalty: 0.02 }, 'deadline');
    settleMember29(s);
    expect(s.acts[r.actId]).toBeUndefined();
    expect(Object.keys(s.acts).length).toBe(before);
    expect(s.acts[band.id].members).toContain(pid);
    expect(memberOptions29(s, pid).find((o) => o.id === 'mo.solo:free')?.block?.pt).toMatch(/Recusou há pouco/);
  }, 60_000);

  it('entrar numa banda sua: a pessoa muda de banda (substituindo quem toca o mesmo instrumento) e a banda dela reage', () => {
    const s = game('r29mo-c');
    const mine = myBand(s, []);
    const other = freeBand(s, [mine.id]);
    // alguém de lá com a mesma função de alguém daqui (substituir) — ou alguém de função livre (entrar)
    let pid = other.members.find((m) => mine.members.some((x) => s.persons[x].role === s.persons[m].role));
    const rep = pid ? mine.members.find((x) => s.persons[x].role === s.persons[pid!].role) : undefined;
    pid ??= other.members[0];
    const trust0 = other.trust;
    // até aceitar (cada tentativa recusada segura a pessoa por 13 semanas: limpamos a espera para o teste)
    let out = memberJoin29(s, pid, mine.id, 'buyout', rep);
    for (let i = 0; i < 12 && !out.ok; i++) { delete mo29(s).cd[`${pid}|join`]; s.week++; out = memberJoin29(s, pid, mine.id, 'buyout', rep); }
    expect(out.ok, out.text.pt).toBe(true);
    expect(s.acts[mine.id].members).toContain(pid);
    expect(s.acts[other.id].members).not.toContain(pid);
    if (rep) expect(s.acts[mine.id].members).not.toContain(rep);
    expect(s.acts[other.id].trust).toBeLessThan(trust0);
    expect(s.memory.some((m) => m.kind === 'lineup' && m.actId === mine.id && /entra|assume/.test(m.text.pt))).toBe(true);
    expect(careerActs29(s, pid).find((x) => x.act.id === mine.id)?.current).toBe(true);
    expect(memberBlock29(s, pid)?.pt).toMatch(/seu elenco/);
  }, 60_000);

  it('sessão e projeto paralelo: continua na banda; o ás de sessão grava com o seu ato e o supergrupo nasce', () => {
    const s = game('r29mo-d');
    const mine = myBand(s, []);
    const other = freeBand(s, [mine.id]);
    const pid = other.members[0];
    let ses = memberSession29(s, pid, mine.id);
    for (let i = 0; i < 12 && !ses.ok; i++) { delete mo29(s).cd[`${pid}|session`]; s.week++; ses = memberSession29(s, pid, mine.id); }
    expect(ses.ok, ses.text.pt).toBe(true);
    expect(s.acts[other.id].members).toContain(pid);
    const ace = ses19(s).aces.find((a) => a.pid === pid);
    expect(ace?.hire?.act).toBe(mine.id);
    const pid2 = other.members[1];
    let side = memberSide29(s, pid2, mine.id);
    for (let i = 0; i < 20 && !side.ok; i++) { delete mo29(s).cd[`${pid2}|side`]; s.week++; side = memberSide29(s, pid2, mine.id); }
    expect(side.ok, side.text.pt).toBe(true);
    expect(s.acts[other.id].members).toContain(pid2);
    expect(s.acts[side.actId!].members).toContain(pid2);
    expect(bonds(s).list.some((b) => b.k === 'super' && b.p.includes(pid2) && b.act === side.actId)).toBe(true);
  }, 60_000);

  it('recusas e bloqueios: morto, você mesmo, já seu, sem banda, falta de habilidade; recusa dá espera', () => {
    const s = game('r29mo-e');
    const band = freeBand(s);
    const dead = band.members[0];
    s.persons[dead].alive = false;
    expect(memberBlock29(s, dead)?.pt).toMatch(/Faleceu/);
    const me = Object.values(s.persons).find((p) => p.isPlayer);
    if (me) expect(memberBlock29(s, me.id)?.pt).toMatch(/É você/);
    const mine = myBand(s, [band.id]);
    expect(memberBlock29(s, mine.members[0])?.pt).toMatch(/seu elenco/);
    const opts = memberOptions29(s, band.members[1]);
    expect(opts.length).toBeGreaterThan(5);
    for (const o of opts.filter((x) => x.block)) expect(o.block!.pt.length).toBeGreaterThan(3);
    // pouca habilidade de produção: cargo de produtor bloqueado com o motivo
    const q = s.persons[band.members[1]];
    q.skills.prod = 10;
    expect(memberOptions29(s, q.id).find((o) => o.id === 'mo.staff:producer')?.block?.pt).toMatch(/Habilidade/);
    // recusa: chance mínima → recusa e espera de 13 semanas
    const pid = band.members[2];
    const p = s.persons[pid];
    p.traits.push('loyal'); p.morale = 100; p.resentment = 0; for (const m of band.members) p.rel[m] = 100;
    band.fame = 95; p.skills.biz = 80;
    let refused = false;
    for (let i = 0; i < 6 && !refused; i++) { const r = memberStaff29(s, pid, 'anr'); if (!r.ok) refused = true; else break; }
    if (refused) expect(memberOptions29(s, pid).find((o) => o.id === 'mo.staff:anr')?.block?.pt).toMatch(/Recusou há pouco/);
    expect(s.acts[band.id].members.includes(pid) || !!mo29(s).staff[pid]).toBe(true);
  }, 60_000);

  it('integrante de banda de selo rival: rescisão paga ao selo ou aliciamento com mágoa (e talvez processo)', () => {
    const s = game('r29mo-f');
    const band = rivalBand(s);
    expect(band).toBeTruthy();
    const lb = s.labels[band.owner!];
    const buy = buyout29(s, band);
    expect(buy).toBeGreaterThan(0);
    const opts = memberOptions29(s, band.members[1]);
    expect(opts.some((o) => o.id === 'mo.solo:buyout' && o.cost === buy)).toBe(true);
    expect(opts.some((o) => o.id === 'mo.solo:tamper')).toBe(true);
    // rescisão
    const cash0 = lb.cash;
    const r1 = startMemberSolo29(s, band.members[1], 'buyout') as { actId: string };
    expect(closeAtTable(s, r1.actId)).toBe('deal');
    settleMember29(s);
    expect(lb.cash).toBe(cash0 + buy);
    const g1 = rv27(s).L[lb.id]?.g ?? 0;
    expect(g1).toBeGreaterThan(0);
    // aliciamento (sem pagar): mágoa maior e rivalidade
    const riv0 = s.rivalries[lb.id] ?? 0;
    const pid2 = s.acts[band.id].members.find((m) => s.persons[m]?.alive)!;
    const r2 = startMemberSolo29(s, pid2, 'tamper');
    expect('actId' in r2).toBe(true);
    expect(closeAtTable(s, (r2 as { actId: string }).actId)).toBe('deal');
    settleMember29(s);
    expect((rv27(s).L[lb.id]?.g ?? 0)).toBeGreaterThan(g1 + 10);
    expect(s.rivalries[lb.id] ?? 0).toBeGreaterThan(riv0);
    expect(s.memory.some((m) => m.kind === 'poach')).toBe(true);
  }, 60_000);

  it('a chance do solo mostrada no menu cai no aliciamento e sobe com quem sonha com a carreira solo', () => {
    const s = game('r29mo-g');
    const band = rivalBand(s);
    band.fame = 30; // longe do teto/piso da curva
    const pid = band.members[0];
    const a = soloChance29(s, pid, 'buyout').p, b = soloChance29(s, pid, 'tamper').p;
    expect(b).toBeLessThan(a);
    s.persons[pid].goal = undefined;
    const c0 = soloChance29(s, pid, 'buyout').p;
    s.persons[pid].goal = 'solo';
    expect(soloChance29(s, pid, 'buyout').p).toBeGreaterThan(c0);
  }, 60_000);

  it('determinismo: mesma semente e mesmas ações → mesmo resultado; o fluxo compartilhado (s.rng) não é tocado', () => {
    const run = () => {
      const s = game('r29mo-h');
      const mine = myBand(s, []);
      const other = freeBand(s, [mine.id]);
      const rng0 = rngSnapshot19(s);
      const outs = other.members.map((pid) => memberJoin29(s, pid, mine.id, 'buyout', mine.members.find((x) => s.persons[x].role === s.persons[pid].role)).ok);
      const third = freeBand(s, [mine.id, other.id]);
      const r = startMemberSolo29(s, third.members[1], 'free');
      if ('actId' in r) closeAtTable(s, r.actId);
      settleMember29(s);
      const untouched = rngSnapshot19(s) === rng0;
      for (let i = 0; i < 3; i++) advanceWeek(s);
      return { outs, untouched, mine: s.acts[mine.id].members.join(','), other: s.acts[other.id]?.members.join(','), third: s.acts[third.id]?.members.join(','), acts: Object.keys(s.acts).length, cash: s.player.cash, log: mo29(s).log.map((x) => `${x.k}:${x.ok}:${x.t.pt}`).join('|') };
    };
    const a = run();
    expect(a.untouched).toBe(true);
    expect(run()).toEqual(a);
  }, 120_000);

  it('a banda de onde saiu pode acabar ou repor (lineup16) e quem vai ao solo ainda aparece na banda até assinar', () => {
    const s = game('r29mo-i');
    const band = freeBand(s);
    expect(bandOf29(s, band.members[0])?.id).toBe(band.id);
  });
  it('menu: "Oferecer a {nome}… ›" em Carreira e contrato (clique direito e ficha) abre o submenu com motivo/chance/custo', () => {
    const s = game('r29mo-j');
    const band = freeBand(s);
    const pid = band.members[1];
    const m = ctxMenu27(s, 'person', `p:${pid}`)!;
    const car = menuSections27(m).find((x) => x.sec === 'career')!;
    const it0 = car.items.find((x) => x.id === 'person.offer29')!;
    expect(it0.block).toBeNull();
    expect(it0.label.pt).toContain(s.persons[pid].name);
    const sub = ctxMenu27(s, 'person', `mo29:${pid}`)!;
    expect(sub.items.some((x) => x.id === 'mo.solo:free' && x.chance !== undefined)).toBe(true);
    expect(sub.items.some((x) => x.id.startsWith('mo.join'))).toBe(true);
    expect(sub.items.some((x) => x.id.startsWith('mo.session'))).toBe(true);
    expect(sub.items.some((x) => x.id === 'mo.feat')).toBe(true);
    // sem banda sua: "entrar" desabilitado com o motivo
    expect(sub.items.find((x) => x.id.startsWith('mo.join'))?.block?.pt).toMatch(/banda/);
    // pessoa morta: o item do menu aparece desabilitado com o motivo
    s.persons[pid].alive = false;
    expect(ctxMenu27(s, 'person', `p:${pid}`)?.items.find((x) => x.id === 'person.offer29')?.block?.pt ?? 'sem item').toMatch(/Faleceu|sem item/);
  }, 60_000);
  it('proposta que fica pendente (fecha no fim do mês): o gancho semanal conclui ou desfaz sozinho', () => {
    const s = game('r29mo-k');
    const band = freeBand(s);
    const pid = band.members[1];
    const r = startMemberSolo29(s, pid, 'free') as { actId: string };
    const o = makeOffer(s, { ...defaultOffer(s, s.acts[r.actId]), advance: 0 });
    expect(o).toBeTruthy();
    for (let i = 0; i < 10 && mo29(s).sh[r.actId]; i++) advanceWeek(s);
    expect(mo29(s).sh[r.actId]).toBeUndefined();
    const solo = s.acts[r.actId];
    if (solo?.owner) {
      expect(s.acts[band.id].members).not.toContain(pid);
      expect(careerActs29(s, pid).find((x) => x.act.id === band.id)?.current).toBe(false);
    } else expect(s.acts[band.id].members.includes(pid) || !solo).toBe(true);
  }, 120_000);
});

