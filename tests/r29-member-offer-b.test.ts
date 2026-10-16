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
import { acceptTheirs27, bringRival27, propose27, startNego27 } from '../src/sim/sys/nego27';
import { canonKey, rw } from '../src/sim/sys/realworld';
import { ses19 } from '../src/sim/sys/session19';
import {
  freeAgent29, memberBlock29, memberJoin29, memberOptions29, memberSession29, memberSide29, memberStaff29, mo29,
  memberOffer29, realNote29, settleMember29, soloChance29, startMemberBand29, startMemberSolo29,
} from '../src/sim/sys/member29';
import { ctxMenu27 } from '../src/ui/ps/ctx27model';
import { screenOffered27 } from '../src/ui/act27/flow27model';
import { freeStep16, l16 } from '../src/sim/sys/lineup16';
import { Rng } from '../src/core/rng';
import { advanceWeek } from '../src/sim/tick';
import { rngSnapshot19 } from '../src/sim/rng19';

const BEATLES = 26;
function world(seed = 'b4') /* r31 (W0-RNG): em 'b3' os Beatles ainda não existem no início */: GameState {
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
/** Sem acordo: proposta irrisória com prazo até a mesa acabar (ou sair da mesa). */
function failAtTable(s: GameState, actId: string): string {
  const o = { ...defaultOffer(s, s.acts[actId]), advance: 0, royalty: 0.02 };
  const n = startNego27(s, actId, o);
  if (!('actId' in n)) throw new Error(n.pt);
  for (let i = 0; i < 6 && n.status === 'open'; i++) propose27(s, n, o, 'deadline');
  return n.status;
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

  it('montar banda + acordo: a banda só passa a existir de verdade (anunciada, assinada) quando o contrato fecha', () => {
    const s = world();
    const pete = person(s, 'Pete Best');
    const cash0 = s.player.cash;
    const r = startMemberBand29(s, pete.id) as { actId: string };
    expect(r.actId).toBeTruthy();
    const b = s.acts[r.actId];
    expect(b.members).toContain(pete.id);
    expect(b.members.length).toBeGreaterThanOrEqual(3);
    expect(b.owner).toBeFalsy();
    expect(memberOffer29(s, r.actId)).toBe(true);
    expect(s.player.cash).toBeLessThan(cash0); // audições pagas na hora
    // sem anúncio antes do contrato
    expect(s.memory.some((m) => m.actId === r.actId)).toBe(false);
    expect(closeAtTable(s, r.actId)).toBe('deal');
    settleMember29(s);
    expect(s.acts[r.actId].owner).toBe('player');
    expect(memberOffer29(s, r.actId)).toBe(false);
    expect(s.memory.some((m) => (m.kind === 'lineup' || m.kind === 'supergroup') && m.actId === r.actId)).toBe(true);
    expect(careerActs29(s, pete.id).find((x) => x.act.id === r.actId)?.current).toBe(true);
    expect(freeAgent29(s, pete.id)).toBe(false);
  }, 60_000);

  it('montar banda + recusa: nenhum ato fica, a turma volta livre, gente nova some, sem ex-integrante nem crônica', () => {
    const s = world();
    const pete = person(s, 'Pete Best');
    const acts0 = Object.keys(s.acts).length, persons0 = Object.keys(s.persons).length, mem0 = s.memory.length;
    const free0 = JSON.stringify(l16(s).free);
    const cash0 = s.player.cash;
    const r = startMemberBand29(s, pete.id) as { actId: string };
    const crew = [...s.acts[r.actId].members];
    expect(failAtTable(s, r.actId)).not.toBe('deal');
    settleMember29(s);
    expect(s.acts[r.actId]).toBeUndefined();
    expect(Object.keys(s.acts).length).toBe(acts0);
    expect(Object.keys(s.persons).length).toBe(persons0); // gente nova da montagem não fica
    expect(JSON.stringify(l16(s).free)).toBe(free0); // a turma volta ao mercado como estava
    expect(s.player.cash).toBeLessThan(cash0); // as audições ficaram pagas
    for (const id of crew) if (s.persons[id]) {
      expect(careerActs29(s, id).some((x) => x.act.id === r.actId)).toBe(false);
      expect(freeAgent29(s, id) || Object.values(s.acts).some((a) => a.members.includes(id))).toBe(true);
    }
    expect(Object.values(s.acts).every((a) => !exMembers29(s, a).some((x) => crew.includes(x.pid) && a.id === r.actId))).toBe(true);
    expect(s.memory.slice(mem0).some((m) => m.actId === r.actId || (m.kind === 'lineup' && crew.some((c) => m.pid === c)))).toBe(false);
    expect(memberBlock29(s, pete.id)).toBeNull();
    expect(memberOptions29(s, pete.id).find((o) => o.id === 'mo.band')?.block?.pt).toMatch(/Recusou há pouco/);
  }, 60_000);

  it('reserva: enquanto a banda está na mesa, nenhuma banda do mundo leva os músicos dela; a semana que passa desfaz', () => {
    const s = world();
    const pete = person(s, 'Pete Best');
    const r = startMemberBand29(s, pete.id) as { actId: string };
    const crew = [...s.acts[r.actId].members];
    for (const id of crew) expect(l16(s).free[id]).toBeUndefined(); // fora do mercado de músicos livres
    // o passo do músico livre (forçado) não pega ninguém da banda em montagem
    const before = JSON.stringify(Object.values(s.acts).filter((a) => a.id !== r.actId).map((a) => a.members));
    for (const id of crew) expect(freeStep16(s, Rng.fromSeed('mo29-reserva'), id, true)).toBeUndefined();
    expect(JSON.stringify(Object.values(s.acts).filter((a) => a.id !== r.actId).map((a) => a.members))).toBe(before);
    // nenhum rival disputa a banda que ainda não existe
    const n = startNego27(s, r.actId, defaultOffer(s, s.acts[r.actId]));
    if ('actId' in n) { bringRival27(s, n, true); expect(n.rival).toBeNull(); }
    // sem contrato, a primeira semana que passa desfaz a banda
    advanceWeek(s);
    expect(s.acts[r.actId]).toBeUndefined();
    expect(memberOffer29(s, r.actId)).toBe(false);
  }, 60_000);

  it('flow27: "Só as importantes" abre a mesa para o solo e a banda em montagem; "Sempre rápido" resolve rápido', () => {
    const s = world();
    const pete = person(s, 'Pete Best'), stu = person(s, 'Stuart Sutcliffe');
    const solo = startMemberSolo29(s, pete.id, 'free') as { actId: string };
    expect(s.acts[solo.actId].fame).toBeLessThan(15); // fama baixa: antes ia para a proposta única
    const band = startMemberBand29(s, stu.id) as { actId: string };
    for (const id of [solo.actId, band.actId]) {
      const occ = { src: 'screen', key: `nego:${id}`, actId: id };
      expect(screenOffered27(s, 'nego', occ, 'key'), id).toBe(true);
      expect(screenOffered27(s, 'nego', occ, 'quick'), id).toBe(false);
    }
    // um ato comum de fama baixa continua indo para a proposta única no "Só as importantes"
    const plain = Object.values(s.acts).find((a) => !a.owner && a.fame < 15 && (a.status === 'active' || a.status === 'emerging') && !memberOffer29(s, a.id))!;
    expect(screenOffered27(s, 'nego', { src: 'screen', key: `nego:${plain.id}`, actId: plain.id }, 'key')).toBe(false);
    // membro de banda: o solo-proposta também
    const mineless = Object.values(s.acts).find((a) => !a.owner && a.members.length >= 3 && (a.status === 'active' || a.status === 'emerging') && a.catalogNo !== BEATLES && a.members.every((m) => s.persons[m]?.alive))!;
    const m = startMemberSolo29(s, mineless.members[1], 'free') as { actId: string };
    expect(screenOffered27(s, 'nego', { src: 'screen', key: `nego:${m.actId}`, actId: m.actId }, 'key')).toBe(true);
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

  it('determinismo: mesma semente e mesmas ações → mesmo resultado; fluxos de sorteio (rng19) intocados', () => {
    const run = () => {
      const s = world();
      const mine = myBand(s);
      const rng0 = rngSnapshot19(s);
      const pete = person(s, 'Pete Best'), stu = person(s, 'Stuart Sutcliffe');
      const a = memberJoin29(s, stu.id, mine.id, 'buyout', memberOptions29(s, stu.id).find((o) => o.id.startsWith(`mo.join:${mine.id}`))?.id.split(':')[2]).ok;
      const rb = startMemberBand29(s, pete.id);
      const bs = 'actId' in rb ? closeAtTable(s, rb.actId) : 'none';
      settleMember29(s);
      return { a, b: bs, bt: 'actId' in rb ? s.acts[rb.actId]?.name ?? '' : '', same: rngSnapshot19(s) === rng0, acts: Object.keys(s.acts).length, mine: s.acts[mine.id].members.join(','), log: mo29(s).log.map((x) => `${x.k}:${x.ok}:${x.t.pt}`).join('|') };
    };
    const x = run();
    expect(x.same).toBe(true);
    expect(run()).toEqual(x);
  }, 120_000);
});
