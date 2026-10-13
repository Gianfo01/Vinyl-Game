// R29 (integrante, B): pessoa SEM banda — as livres da formação real (rw.free29: Pete Best e Stuart Sutcliffe num mundo
// 'famous' de 1962), músicos livres do lineup16, quem viu a banda acabar. Assinar como solo pela proposta de sempre,
// entrar numa banda sua, as outras opções sem banda que fica, montar uma banda (lineup16.newBand16) e determinismo.
// Ver docs/integrante29.md.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas (como nos outros testes)
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { applyWorld17 } from '../src/sim/start17';
import type { Act, GameState } from '../src/sim/types';
import { careerActs29, exMembers29 } from '../src/sim/sys/connect29';
import { acceptTheirs27, propose27, startNego27 } from '../src/sim/sys/nego27';
import { canonKey, rw } from '../src/sim/sys/realworld';
import { ses19 } from '../src/sim/sys/session19';
import {
  freeAgent29, memberBand29, memberBlock29, memberJoin29, memberOptions29, memberSession29, memberSide29, memberStaff29, mo29,
  realNote29, settleMember29, soloChance29, startMemberSolo29,
} from '../src/sim/sys/member29';
import { ctxMenu27 } from '../src/ui/ps/ctx27model';

const BEATLES = 26;
function world(seed = 'b3'): GameState {
  const c = defaultConfig(seed, { startYear: 1962 });
  applyWorld17(c, 'random');
  c.lineup29 = 'famous';
  const s = createGame(c);
  s.player.cash += 50_000_000_00;
  return s;
}
const person = (s: GameState, n: string) => Object.values(s.persons).find((p) => canonKey(p.name) === canonKey(n))!;
const beatles = (s: GameState): Act => Object.values(s.acts).find((a) => a.catalogNo === BEATLES)!;
const live = (a: Act) => a.status === 'active' || a.status === 'emerging';
function myBand(s: GameState): Act {
  const a = Object.values(s.acts).filter((x) => !x.owner && !x.playerBand && live(x) && x.members.length >= 3 && x.members.every((m) => s.persons[m]?.alive && !s.persons[m].isPlayer) && x.catalogNo !== BEATLES).sort((x, y) => y.fame - x.fame)[0];
  acceptOffer(s, a, { ...defaultOffer(s, a), id: `o-${a.id}`, week: s.week, status: 'pending', advance: 0 });
  return a;
}
function closeAtTable(s: GameState, actId: string): string {
  const o = defaultOffer(s, s.acts[actId]);
  o.advance *= 6; o.royalty = 0.3; o.creativeControl = true;
  const n = startNego27(s, actId, o);
  if (!('actId' in n)) throw new Error(n.pt);
  for (let i = 0; i < 6 && n.status === 'open'; i++) { if (n.theirs) acceptTheirs27(s, n); else propose27(s, n, o, 'plain'); }
  return n.status;
}
const retry = <T extends { ok: boolean }>(s: GameState, pid: string, k: string, f: () => T, n = 20): T => {
  let out = f();
  for (let i = 0; i < n && !out.ok; i++) { delete mo29(s).cd[`${pid}|${k}`]; s.week++; out = f(); }
  return out;
};

describe('R29 — oferta a uma pessoa SEM banda', () => {
  it('Pete Best (livre num mundo "famous" de 1962): assina solo pela mesa de sempre; nada de "ex-Beatles"', () => {
    const s = world();
    const pete = person(s, 'Pete Best');
    const b = beatles(s);
    expect(rw(s).free29?.[pete.id]).toBe(b.id);
    expect(freeAgent29(s, pete.id)).toBe(true);
    expect(memberBlock29(s, pete.id)).toBeNull();
    // a nota da história real é só referência (não diz que a banda é dele)
    expect(realNote29(s, pete.id)?.pt).toMatch(/Na história real tocou com .*sem banda/);
    const opt = memberOptions29(s, pete.id).find((o) => o.id === 'mo.solo:free')!;
    expect(opt.block).toBeNull();
    expect(opt.label.pt).toContain('artista solo');
    expect(opt.note?.pt).toMatch(/história real/);
    const pre = soloChance29(s, pete.id, 'free').p;
    const r = startMemberSolo29(s, pete.id, 'free') as { actId: string };
    expect(r.actId).toBeTruthy();
    const ev = evaluateOffer(s, s.acts[r.actId], defaultOffer(s, s.acts[r.actId]));
    expect(ev.parts?.some((x) => /sem banda/.test(x.t.pt))).toBe(true);
    expect(Math.abs(ev.p - pre)).toBeLessThan(0.1);
    expect(s.soloOf[r.actId]).toBeUndefined(); // não é "solo de" banda nenhuma
    expect(closeAtTable(s, r.actId)).toBe('deal');
    const out = settleMember29(s);
    expect(out[0]?.t.pt).toMatch(/sem banda, começa carreira solo/);
    const solo = s.acts[r.actId];
    expect(solo.owner).toBe('player');
    expect(solo.members).toEqual([pete.id]);
    // nenhuma banda perdeu ninguém; Pete nunca vira ex-integrante dos Beatles
    expect(exMembers29(s, b)).toEqual([]);
    expect(careerActs29(s, pete.id).map((x) => x.act.id)).toEqual([r.actId]);
    expect(s.memory.some((m) => m.kind === 'member_quits' && m.pid === pete.id)).toBe(false);
  }, 60_000);

  it('Stuart Sutcliffe entra numa banda sua (sem banda que fica para trás)', () => {
    const s = world();
    const mine = myBand(s);
    const stu = person(s, 'Stuart Sutcliffe');
    expect(freeAgent29(s, stu.id)).toBe(true);
    const opts = memberOptions29(s, stu.id).filter((o) => o.id.startsWith(`mo.join:${mine.id}`));
    expect(opts.length).toBeGreaterThan(0);
    const o = opts[0];
    const rep = o.id.split(':')[2];
    const out = retry(s, stu.id, 'join', () => memberJoin29(s, stu.id, mine.id, 'buyout', rep));
    expect(out.ok, out.text.pt).toBe(true);
    expect(s.acts[mine.id].members).toContain(stu.id);
    expect(out.text.pt).toMatch(/sem banda, entra em/);
    expect(s.memory.some((m) => m.kind === 'lineup' && m.actId === mine.id && /entra|assume/.test(m.text.pt) && !/ex-—/.test(m.text.pt))).toBe(true);
    expect(careerActs29(s, stu.id).find((x) => x.act.id === mine.id)?.current).toBe(true);
    expect(exMembers29(s, beatles(s))).toEqual([]);
  }, 60_000);

  it('as outras opções valem sem banda: sessão, projeto, equipe; e montar uma banda em volta da pessoa', () => {
    const s = world();
    const mine = myBand(s);
    const pete = person(s, 'Pete Best');
    const opts = memberOptions29(s, pete.id);
    for (const id of [`mo.session:${mine.id}`, `mo.side:${mine.id}`, 'mo.band']) expect(opts.find((o) => o.id === id)?.block ?? null, id).toBeNull();
    expect(opts.some((o) => o.id === 'mo.feat')).toBe(true);
    // sessão: grava com o seu ato, sem liberação de selo
    const ses = retry(s, pete.id, 'session', () => memberSession29(s, pete.id, mine.id));
    expect(ses.ok, ses.text.pt).toBe(true);
    expect(ses19(s).aces.find((a) => a.pid === pete.id)?.hire?.act).toBe(mine.id);
    // projeto paralelo com o líder do seu ato
    const side = retry(s, pete.id, 'side', () => memberSide29(s, pete.id, mine.id));
    expect(side.ok, side.text.pt).toBe(true);
    expect(s.acts[side.actId!].members).toContain(pete.id);
    // equipe (A&R) com habilidade: pessoa livre vira equipe e sai do mercado de músicos livres
    const stu = person(s, 'Stuart Sutcliffe');
    stu.skills.biz = 80;
    const st = retry(s, stu.id, 'staff', () => memberStaff29(s, stu.id, 'anr'));
    expect(st.ok, st.text.pt).toBe(true);
    expect(mo29(s).staff[stu.id]).toBeTruthy();
    expect(memberBlock29(s, stu.id)?.pt).toMatch(/equipe/);
  }, 60_000);

  it('montar uma banda: nasce sem contrato com a pessoa e músicos livres; ela deixa de estar "sem banda"', () => {
    const s = world();
    const pete = person(s, 'Pete Best');
    const out = retry(s, pete.id, 'band', () => memberBand29(s, pete.id));
    expect(out.ok, out.text.pt).toBe(true);
    const b = s.acts[out.actId!];
    expect(b.members).toContain(pete.id);
    expect(b.members.length).toBeGreaterThanOrEqual(3);
    expect(b.owner).toBeFalsy();
    expect(freeAgent29(s, pete.id)).toBe(false);
    expect(memberOptions29(s, pete.id).some((o) => o.id === 'mo.band')).toBe(false); // agora tem banda: opções de integrante
  }, 60_000);

  it('vale para qualquer músico sem banda (banda que acabou), e o menu mostra o item habilitado', () => {
    const s = world();
    const a = Object.values(s.acts).find((x) => !x.owner && live(x) && x.members.length >= 3 && x.catalogNo !== BEATLES && x.members.every((m) => s.persons[m]?.alive))!;
    const pid = a.members[0];
    a.status = 'split';
    expect(freeAgent29(s, pid)).toBe(true);
    const m = ctxMenu27(s, 'person', `p:${pid}`)!;
    const item = m.items.find((x) => x.id === 'person.offer29')!;
    expect(item.block).toBeNull();
    expect(item.note?.pt).toMatch(/Sem banda/);
    const sub = ctxMenu27(s, 'person', `mo29:${pid}`)!;
    expect(sub.items.find((x) => x.id === 'mo.solo:free')?.block ?? null).toBeNull();
    expect(sub.items.some((x) => x.id === 'mo.band')).toBe(true);
    // artista solo em atividade continua indo pelo "Fazer proposta"
    const solo = Object.values(s.acts).find((x) => live(x) && x.members.length === 1 && s.persons[x.members[0]]?.alive && !s.persons[x.members[0]].isPlayer);
    if (solo) expect(memberBlock29(s, solo.members[0])?.pt).toMatch(/Fazer proposta/);
  }, 60_000);

  it('determinismo: mesma semente e mesmas ações → mesmo resultado; s.rng intocado', () => {
    const run = () => {
      const s = world();
      const mine = myBand(s);
      const rng0 = JSON.stringify(s.rng);
      const pete = person(s, 'Pete Best'), stu = person(s, 'Stuart Sutcliffe');
      const a = memberJoin29(s, stu.id, mine.id, 'buyout', memberOptions29(s, stu.id).find((o) => o.id.startsWith(`mo.join:${mine.id}`))?.id.split(':')[2]).ok;
      const b = memberBand29(s, pete.id);
      const r = startMemberSolo29(s, pete.id, 'free');
      if ('actId' in r) closeAtTable(s, r.actId);
      settleMember29(s);
      return { a, b: b.ok, bt: b.text.pt, same: JSON.stringify(s.rng) === rng0, acts: Object.keys(s.acts).length, mine: s.acts[mine.id].members.join(','), log: mo29(s).log.map((x) => `${x.k}:${x.ok}:${x.t.pt}`).join('|') };
    };
    const x = run();
    expect(x.same).toBe(true);
    expect(run()).toEqual(x);
  }, 120_000);
});
