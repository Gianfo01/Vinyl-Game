// Rodada 29 — Submundo: ligações pessoa ↔ organização numa fonte só (orglinks29, auditoria R10) e as famílias
// (mob29): interações com consequência, "Contratar a família" com favor devido que ela cobra, escalada ao recusar,
// menus de ações (org / pessoa / ato / selo), época e região, determinismo. Pedidos do autor:
//  1. "em uma menciona Frank Sinatra, mas em membros ele não aparece";
//  2. "mais opções de interações (com possíveis consequências) com as organizações criminais";
//  3. "opções de contratar tal família (com consequências e nos fazendo dever favor...)".
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { audit29, count29 } from '../src/sim/audit29';
import { holds17 } from '../src/sim/holds17';
import { advanceMonth } from '../src/sim/tick';
import { crime17, heatIn, a3Of } from '../src/sim/sys/crime17';
import {
  MOB29, _mob29, asks29, doMob29, fulfill29, hire29, hireOdds29, meter29, mob29, mobActs29, owed29, peek29, refuse29,
} from '../src/sim/sys/mob29';
import { docTies29, linksOfKey29, orgLinks29, resolveWho29 } from '../src/sim/sys/orglinks29';
import { orgById, orgs17 } from '../src/sim/sys/crime17';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { ctxMenu27, type CtxEnv27 } from '../src/ui/ps/ctx27model';

type Hist = 'strict' | 'loose';
const game = (y: number, h: Hist = 'loose', seed = 'r29mob'): GameState => createGame(defaultConfig(`${seed}-${y}-${h}`, { startYear: y, scenario: 'established', realNames: true, history: h }));
const ENV: CtxEnv27 = { has: (f) => f !== 'songmarket' };
const pt = (x: { pt: string } | null | undefined): string => x?.pt ?? '';
const ids = (s: GameState, ent: Parameters<typeof ctxMenu27>[1], id: string) => ctxMenu27(s, ent, id, ENV)?.items.map((x) => x.id) ?? [];
const rich = (s: GameState) => { s.player.cash = Math.max(s.player.cash, 5e8); return s; };
/** Um ato de outro selo, ativo, no país-base (alvo de serviço). */
const victim = (s: GameState) => Object.values(s.acts).find((a) => !playerActs(s).includes(a.id) && a.status === 'active' && a.fame > 5 && a.debutYear <= s.year && a3Of(s, a.city) === a3Of(s, s.config.homeCity))!;

describe('r29 Submundo — ligações pessoa ↔ organização (fonte única)', () => {
  it('Frank Sinatra × Chicago Outfit: o laço documentado aparece nos DOIS lados, com o rótulo', () => {
    for (const h of ['loose', 'strict'] as Hist[]) {
      const s = game(1965, h);
      const k = resolveWho29(s, 'Frank Sinatra')!;
      expect(k).toMatch(/^p:/);
      expect(s.persons[k.slice(2)].name).toBe('Frank Sinatra');
      const card = orgLinks29(s, 'outfit');
      expect(card.some((x) => x.key === k && x.kind === 'doc' && x.y === 1960)).toBe(true);
      const sheet = linksOfKey29(s, k);
      expect(sheet.some((x) => x.o === 'outfit' && x.kind === 'doc')).toBe(true);
      // também pelo id puro da pessoa e no menu de ações dela
      expect(linksOfKey29(s, k.slice(2)).some((x) => x.o === 'outfit')).toBe(true);
      expect(ids(s, 'person', k)).toContain('org29:outfit');
      // Morris Levy (empresário, não artista) × Genovese
      expect(linksOfKey29(s, 'e:morris_levy').some((x) => x.o === 'genovese' && x.kind === 'doc')).toBe(true);
    }
  });

  it('história alternativa: laço documentado só até o início da partida; no modo exato, até o ano atual', () => {
    for (const h of ['loose', 'strict'] as Hist[]) {
      const s = game(1955, h);
      s.year = 1961; // depois do laço (1960): só o modo exato o mostra; nos livres a história depois do início é simulada
      expect(docTies29(s).some((t) => t.who === 'Frank Sinatra')).toBe(h === 'strict');
    }
  });

  it('auditoria R10 (assimetria organização ↔ pessoa) = 0 em sementes e épocas', () => {
    for (const [y, h, seed] of [[1960, 'strict', 'a'], [1965, 'loose', 'b'], [1975, 'loose', 'c'], [1992, 'loose', 'd'], [2006, 'loose', 'e']] as [number, Hist, string][]) {
      const s = game(y, h, seed);
      expect(count29(audit29(s)).R10 ?? 0, `${y} ${h}`).toBe(0);
    }
    // depois de meses simulados (filiações do crimemem23, laços de rua) e com favores devidos
    const s = rich(game(1975, 'loose', 'r10sim'));
    for (let i = 0; i < 4; i++) advanceMonth(s);
    hire29(s, 'fnoite', 'sabotage', victim(s).id);
    expect(orgLinks29(s, 'fnoite').some((x) => x.key === 'player' && x.kind === 'owes')).toBe(true);
    expect(linksOfKey29(s, 'player').some((x) => x.o === 'fnoite' && x.kind === 'owes')).toBe(true);
    expect(count29(audit29(s)).R10 ?? 0).toBe(0);
  }, 120000);
});

describe('r29 Submundo — famílias: interações, contratar, favores, escalada', () => {
  it('cada interação tem custo/chance/consequência ou o motivo de não dar', () => {
    const s = rich(game(1975, 'loose', 'inter'));
    const rows = mobActs29(s, 'fnoite');
    for (const r of rows) {
      expect(pt(r.a.fx).length, r.a.id).toBeGreaterThan(10);
      if (r.block) expect(pt(r.block).length, r.a.id).toBeGreaterThan(5);
    }
    const o = orgById(s, 'fnoite')!;
    const h0 = heatIn(s, o.a3), c0 = s.player.cash;
    // proteção: paga e melhora o respeito; parar gera hostilidade
    expect(doMob29(s, 'fnoite', 'pizzo_pay').ok).toBe(true);
    expect(crime17(s).pizzo.fnoite).toBeGreaterThan(0);
    const m1 = meter29(s, 'fnoite');
    expect(m1.respect).toBeGreaterThan(0);
    expect(doMob29(s, 'fnoite', 'pizzo_stop').ok).toBe(true);
    expect(meter29(s, 'fnoite').hostility).toBeGreaterThan(m1.hostility);
    // boate: dinheiro ou batida (os dois mexem no caixa e no calor)
    const club = doMob29(s, 'fnoite', 'club');
    expect(club.ok).toBe(true);
    expect(s.player.cash !== c0 || heatIn(s, o.a3) !== h0).toBe(true);
    // proteção de artista: taxa, favor devido
    expect(doMob29(s, 'fnoite', 'guard').ok).toBe(true);
    expect(owed29(s, o).length).toBeGreaterThan(0);
    // quitar a dívida zera os favores
    const pay = doMob29(s, 'fnoite', 'paydebt');
    expect(pay.ok).toBe(true);
    expect(owed29(s, o).filter((x) => x.src === 'mob29').length).toBe(0);
    // empréstimo da família: dívida da organização sobre você (agiota de sempre)
    const before = s.player.loans.length;
    expect(doMob29(s, 'fnoite', 'loan').ok).toBe(true);
    expect(s.player.loans.length).toBe(before + 1);
    expect(owed29(s, o).some((x) => x.src === 'shark27' && x.kind === 'debt')).toBe(true);
    // sociedade: precisa de confiança; com ela, renda e segredo
    expect(pt(mobActs29(s, 'fnoite').find((x) => x.a.id === 'partner')?.block)).toMatch(/confiam|hostilidade/);
    const st = mob29(s); st.o.fnoite.res = 80; st.o.fnoite.hos = 0; crime17(s).org.fnoite = 60; delete crime17(s).vend.fnoite;
    for (const h of holds17(s).h) if (h.holder === 'o:fnoite' && h.kind === 'grievance') h.status = 'forgiven';
    expect(doMob29(s, 'fnoite', 'partner').ok).toBe(true);
    expect(linksOfKey29(s, 'player').some((x) => x.o === 'fnoite' && x.kind === 'partner')).toBe(true);
    // delatar: hostilidade e medo (vingança)
    expect(doMob29(s, 'fnoite', 'inform').ok).toBe(true);
    const m2 = meter29(s, 'fnoite');
    expect(m2.hostility).toBeGreaterThanOrEqual(50);
    expect(m2.fear).toBeGreaterThan(0);
    expect(MOB29.length).toBeGreaterThanOrEqual(10);
  });

  it('contratar a família: mais chance, menos calor para você, taxa — e um FAVOR DEVIDO que ela cobra depois', () => {
    const s = rich(game(1975, 'loose', 'hire'));
    const v = victim(s);
    const mine = hireOdds29(s, 'fnoite', 'sabotage', v.id);
    expect(mine.block).toBeNull();
    expect(mine.fee).toBeGreaterThan(0);
    expect(mine.favor).toBeGreaterThan(0);
    expect(mine.heatYou).toBeLessThan(10);
    const o = orgById(s, 'fnoite')!;
    const r = hire29(s, 'fnoite', 'sabotage', v.id);
    expect(r.ok === true || r.ok === false).toBe(true);
    expect(pt(r.text)).toMatch(/deve um favor/);
    const fav = owed29(s, o).find((h) => h.src === 'mob29' && h.kind === 'favor')!;
    expect(fav).toBeTruthy();
    expect(Number(fav.data?.due)).toBeGreaterThan(s.week);
    expect(crime17(s).log.some((e) => e.actor === o.key && e.target === v.id)).toBe(true);
    // chega a data: a família cobra (pedido com prazo, na caixa de entrada)
    fav.data!.due = s.week;
    const n0 = s.notifications?.length ?? 0;
    advanceMonth(s);
    const a = asks29(s, 'fnoite').find((x) => x.hold === fav.id)!;
    expect(a).toBeTruthy();
    expect(a.dl).toBeGreaterThan(s.week);
    expect((s.notifications?.length ?? 0)).toBeGreaterThan(n0);
    // cumprir zera a dívida e sobe a confiança
    const res0 = meter29(s, 'fnoite').respect;
    const f = fulfill29(s, a.id);
    expect(f.ok, pt(f.text)).toBe(true);
    expect(owed29(s, o).some((h) => h.id === fav.id)).toBe(false);
    expect(meter29(s, 'fnoite').respect).toBeGreaterThan(res0);
  }, 60000);

  it('recusar escala: ameaça → sabotagem → violência; a dívida continua', () => {
    const s = rich(game(1975, 'loose', 'esc'));
    const o = orgById(s, 'fnoite')!;
    hire29(s, 'fnoite', 'sabotage', victim(s).id);
    const fav = owed29(s, o).find((h) => h.src === 'mob29')!;
    const ask = () => _mob29.ask29(s, o, 'vote', fav.id);
    const h0 = meter29(s, 'fnoite').hostility;
    refuse29(s, ask().id);
    expect(peek29(s)!.o.fnoite.esc).toBe(1);
    expect(meter29(s, 'fnoite').hostility).toBeGreaterThan(h0);
    const logN = crime17(s).log.filter((e) => e.actor === o.key).length;
    refuse29(s, ask().id);
    expect(peek29(s)!.o.fnoite.esc).toBe(2);
    expect(crime17(s).log.filter((e) => e.actor === o.key).length).toBeGreaterThan(logN); // retaliação: sabotagem contra seu artista
    expect(owed29(s, o).some((h) => h.id === fav.id)).toBe(true);
    // pedido que vence sem resposta = recusa
    const a3 = ask();
    a3.dl = s.week;
    advanceMonth(s);
    expect(asks29(s).some((x) => x.id === a3.id)).toBe(false);
    expect(peek29(s)!.o.fnoite.esc).toBeGreaterThanOrEqual(3);
  }, 60000);

  it('menus de ações: organização, pessoa, ato e selo — "Contratar {família} para… ›" e os serviços com motivo', () => {
    const s = rich(game(1975, 'loose', 'ctx'));
    const org = ids(s, 'org', 'fnoite');
    expect(org).toEqual(expect.arrayContaining(['mob.hire:fnoite', 'mob.do:club', 'mob.do:guard', 'mob.do:loan', 'mob.do:partner', 'mob.do:paydebt', 'org.approach', 'org.report']));
    const v = victim(s);
    const p = v.members.find((m) => s.persons[m]?.alive)!;
    const pm = ids(s, 'person', `p:${p}`);
    const hireP = pm.find((x) => x.startsWith('mob.hire:'))!;
    expect(hireP).toBeTruthy();
    const sub = ctxMenu27(s, 'org', `hire29:${hireP.slice(9)}|p:${p}`, ENV)!;
    expect(sub.items.map((x) => x.id)).toEqual(expect.arrayContaining(['mob.job:assault', 'mob.job:blackmail', 'mob.job:murder']));
    for (const x of sub.items) if (x.block) expect(pt(x.block).length).toBeGreaterThan(5); else expect(x.chance).toBeGreaterThan(0);
    expect(ids(s, 'act', v.id).some((x) => x.startsWith('mob.hire:'))).toBe(true);
    const act = ctxMenu27(s, 'org', `hire29:fnoite|${v.id}`, ENV)!;
    expect(act.items.map((x) => x.id)).toEqual(expect.arrayContaining(['mob.job:sabotage', 'mob.job:bootleg']));
    const lb = Object.values(s.labels).find((x) => x.active && a3Of(s, x.city) === a3Of(s, s.config.homeCity)) ?? Object.values(s.labels).find((x) => x.active)!;
    expect(ids(s, 'label', lb.id).some((x) => x.startsWith('mob.hire:'))).toBe(true);
    // sem alvo (a partir da organização): os serviços abrem o planejador
    const free = ctxMenu27(s, 'org', 'hire29:fnoite|', ENV)!;
    expect(free.items.every((x) => x.id.startsWith('mob.plan:'))).toBe(true);
  });

  it('época, região e regras de história bloqueiam com o motivo', () => {
    const s = rich(game(1965, 'loose', 'era'));
    const v = victim(s);
    expect(pt(hireOdds29(s, 'medellin', 'sabotage', v.id).block)).toMatch(/não existe nesta época/);
    const st = game(1965, 'strict', 'era');
    expect(pt(hireOdds29(st, 'genovese', 'sabotage', victim(st).id).block)).toMatch(/Vida real exata/);
    const s90 = rich(game(1990, 'loose', 'era'));
    const outfit = mobActs29(s90, 'outfit').find((x) => x.a.id === 'jukebox')!;
    expect(pt(outfit.block)).toMatch(/jukeboxes acabou|lançamento/);
    // fora da área: família de outro país sem alcance internacional
    const far = orgs17(s).find((o) => o.a3 !== a3Of(s, v.city) && o.power < 85)!;
    expect(pt(hireOdds29(s, far.id, 'sabotage', v.id).block)).toMatch(/Fora da área/);
    // calor alto
    crime17(s).heat[a3Of(s, s.config.homeCity)] = 90;
    expect(pt(hireOdds29(s, 'fnoite', 'sabotage', v.id).block)).toMatch(/calor/);
  });

  it('determinismo: mesma partida, mesmas escolhas, mesmo resultado; sem interação o mundo fica igual', () => {
    const run = () => {
      const s = rich(game(1975, 'loose', 'det'));
      hire29(s, 'fnoite', 'sabotage', victim(s).id);
      doMob29(s, 'fnoite', 'club');
      for (let i = 0; i < 5; i++) advanceMonth(s);
      return JSON.stringify([peek29(s), s.player.cash, crime17(s).heat, crime17(s).log.length]);
    };
    expect(run()).toBe(run());
    const s = game(1975, 'loose', 'quiet');
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(peek29(s)).toBeUndefined();
  }, 120000);
});
