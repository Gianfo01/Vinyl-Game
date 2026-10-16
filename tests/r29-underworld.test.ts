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
import { Rng } from '../src/core/rng';
import { l } from '../src/data/world';
import { CYBER29 } from '../src/data/cyber29';
import { calendar19 } from '../src/sim/calendar19';
import { recentFacts } from '../src/sim/facts17';
import { grantHold } from '../src/sim/holds17';
import { publishGramo19, yearlyAwards } from '../src/sim/legacy';
import { juryMemHook } from '../src/sim/sys/awards15';
import { campaignBonus } from '../src/sim/sys/ceremonies8';
import { commitCrime as commit17, crimeById, crimeOdds, isReal, targetBlock17 } from '../src/sim/sys/crime17';
import { AFF29, sceneAff29 } from '../src/sim/sys/aff29';
import { delay29, favorRows29, jobsFor29 } from '../src/sim/sys/mob29';
import { allLinks29 } from '../src/sim/sys/orglinks29';
import { AWCAT29, peekRig29, rigAward29, rigPow29 } from '../src/sim/sys/rig29';
import { hallScore } from '../src/sim/sys/rockhall9';
import { st18 } from '../src/sim/sys/stream18';
import { cockpit27 } from '../src/ui/sys/cockpit27model';
import { attnSeq, notes } from '../src/sim/attention';
const commitCrime = commit17;
/** Rng que sempre "acerta". */
const LUCKY = { chance: () => true, float: (a: number) => a, int: (a: number) => a, pick: <T>(x: T[]) => x[0] } as unknown as Rng;

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
    const n0 = attnSeq(s);
    advanceMonth(s);
    const a = asks29(s, 'fnoite').find((x) => x.hold === fav.id)!;
    expect(a).toBeTruthy();
    expect(a.dl).toBeGreaterThan(s.week);
    expect(notes(s, { after: n0 }).length).toBeGreaterThan(0);
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

// ================================================================ rodada 29b — prêmios comprados, crime digital, Cockpit, facções × cenas

describe('r29 Submundo — votação de prêmio comprada (rig29)', () => {
  it('muda o resultado dos Gramófonos; ganhou e vazou → prêmio cassado, escândalo e reputação', () => {
    const s = rich(game(1975, 'loose', 'rig'));
    const year = s.year - 1;
    const R = () => Rng.fromSeed(`rigtest|${year}`);
    const before = yearlyAwards(s, R(), year);
    const alb = before.find((w) => w.cat === 'album')!;
    expect(alb).toBeTruthy();
    const loser = Object.values(s.releases).find((x) => x.year === year && x.type === 'lp' && x.totalUnits > 0 && x.actId !== alb.e.actId)!;
    const b0 = campaignBonus(s, loser.id, 'album');
    const rg = rigAward29(s, { act: loser.actId, cat: 'gramo', m: 'jury', by: 'player', pow: 500, q: 1 });
    expect(campaignBonus(s, loser.id, 'album') - b0).toBe(500); // indicação e noite (GRAMO_ADJ)
    const after = yearlyAwards(s, R(), year);
    expect(after.find((w) => w.cat === 'album')!.e.actId).toBe(loser.actId); // o voto comprado ganha
    // a noite: o prêmio entra no livro; no mês, o sorteio de exposição (q = 1) cassa
    publishGramo19(s, after.find((w) => w.cat === 'album')!);
    expect(s.awards.some((e) => e.actId === loser.actId && e.category === 'album')).toBe(true);
    const inst0 = s.player.reputation.institutional;
    advanceMonth(s);
    expect(peekRig29(s)!.r.find((x) => x.id === rg.id)!.done).toBe('exposed');
    expect(s.awards.some((e) => e.actId === loser.actId && e.category === 'album' && e.year === year)).toBe(false);
    expect(s.player.reputation.institutional).toBeLessThan(inst0);
    expect(recentFacts(s, { kind: 'award_revoked' }).some((f) => f.actors.includes(loser.actId))).toBe(true);
  }, 60000);

  it('os outros prêmios também leem a compra (Ofício, Crítica, nacionais, Hall) — e sem compra nada muda', () => {
    const s = game(1990, 'loose', 'rig2');
    const a = Object.values(s.acts).find((x) => x.status === 'active' && x.fame > 20 && !playerActs(s).includes(x.id))!;
    const h0 = hallScore(s, a);
    const j0 = juryMemHook.f!(s, a.id, a3Of(s, a.city));
    expect(rigPow29(s, a.id, 'hall')).toBe(0);
    rigAward29(s, { act: a.id, cat: 'hall', m: 'lobby', by: 'player' });
    rigAward29(s, { act: a.id, cat: 'national', m: 'jury', by: 'player' });
    expect(hallScore(s, a)).toBeGreaterThan(h0);
    expect(juryMemHook.f!(s, a.id, a3Of(s, a.city))).toBeGreaterThan(j0);
    expect(AWCAT29.map((c) => c.id)).toEqual(['gramo', 'craft', 'critics', 'national', 'hall']);
  });

  it('ação direta (jurado), serviço da família e métodos por época', () => {
    const s = rich(game(1975, 'loose', 'rig3'));
    const a = Object.values(s.acts).find((x) => x.status === 'active' && x.fame > 10 && !playerActs(s).includes(x.id))!;
    const d = crimeById('award_rig')!;
    expect(targetBlock17(s, d, playerActs(s)[0])).toBeNull(); // o seu ato também (qualquer ato)
    expect(pt(crimeOdds(s, { actor: 'player', target: a.id, method: 'bots', partners: [] }, 'award_rig').block)).toMatch(/2005/);
    expect(crimeOdds(s, { actor: 'player', target: a.id, method: 'ballot', partners: [] }, 'award_rig').block).toBeNull();
    const r = commitCrime(s, 'award_rig', { actor: 'player', target: a.id, method: 'jury', cat: 'critics', partners: [] }, LUCKY);
    expect(typeof r === 'object' && 'ok' in r && r.ok).toBe(true);
    expect(rigPow29(s, a.id, 'critics')).toBeGreaterThan(0);
    const s2 = rich(game(2010, 'loose', 'rig4'));
    expect(pt(crimeOdds(s2, { actor: 'player', target: Object.values(s2.acts).find((x) => x.status === 'active')!.id, method: 'ballot', partners: [] }, 'award_rig').block)).toMatch(/online/);
    // a família contratada para o prêmio (jurado) — favor devido
    const v = victim(s);
    const h = hire29(s, 'fnoite', 'award_rig', v.id, undefined, 'gramo');
    expect(pt(h.text)).toMatch(/deve um favor/);
  });

  it('o pedido "vote como a gente quer" mexe no prêmio: com voto na academia, mais; sem voto, lobby (custa)', () => {
    for (const inst of [70, 10]) {
      const s = rich(game(1975, 'loose', `vote${inst}`));
      s.player.reputation.institutional = inst;
      s.player.stats.awards = 0;
      const o = orgById(s, 'fnoite')!;
      const a = _mob29.ask29(s, o, 'vote');
      expect(a.act).toBeTruthy();
      const c0 = s.player.cash;
      const f = fulfill29(s, a.id);
      expect(f.ok, pt(f.text)).toBe(true);
      const rg = peekRig29(s)!.r.at(-1)!;
      expect(rg.act).toBe(a.act);
      expect(rg.by).toBe('vote');
      if (inst >= 50) { expect(rg.m).toBe('vote'); expect(rg.pow).toBeGreaterThanOrEqual(5); expect(s.player.cash).toBe(c0); }
      else { expect(rg.m).toBe('lobby'); expect(s.player.cash).toBeLessThan(c0); }
      expect(rigPow29(s, a.act!, rg.cat)).toBe(rg.pow);
    }
  });
});

describe('r29 Submundo — crime digital (anos 1995+)', () => {
  it('aparece por época e nunca na lista padrão (NPCs e mundo intocados)', () => {
    const ids = (y: number) => { const s = game(y, 'loose', 'cy'); expect(orgs17(s).some((o) => o.kind === 'cyber')).toBe(false); return orgs17(s, false, true).filter((o) => o.kind === 'cyber').map((o) => o.id); };
    expect(ids(1990)).toEqual([]);
    expect(ids(2000)).toEqual(expect.arrayContaining(['fwarez', 'fleak']));
    expect(ids(2000)).not.toContain('fstream');
    expect(ids(2010)).toEqual(expect.arrayContaining(['fstream', 'fscalp']));
    expect(ids(2012)).toContain('fdark');
    expect(ids(2010)).not.toContain('fclone');
    expect(ids(2020)).toEqual(expect.arrayContaining(['fclone', 'fstream']));
    expect(ids(2020)).not.toContain('fwarez');
    for (const o of CYBER29) expect(o.real).toBe(false);
  }, 60000);

  it('serviços digitais ligados às fraudes de sempre: streams (stream18), vazamento (sabotagem), clone de voz (fakes19)', () => {
    const s = rich(game(2020, 'loose', 'cyjob'));
    const fs = orgById(s, 'fstream')!;
    expect(jobsFor29(fs).map((j) => j.id)).toEqual(expect.arrayContaining(['x:streams', 'cy:vote']));
    expect(jobsFor29(orgById(s, 'fnoite')!).some((j) => j.for === 'cyber')).toBe(false);
    // streams: um lançamento recente do seu ato
    const mine = s.acts[playerActs(s)[0]];
    const base = Object.values(s.releases)[0];
    const rel = { ...base, id: 'rtest29', actId: mine.id, owner: 'player', week: s.week, year: s.year, title: 'Teste' };
    s.releases.rtest29 = rel as typeof base;
    mine.releases.push('rtest29');
    const r1 = hire29(s, 'fstream', 'x:streams', mine.id);
    expect(pt(r1.text)).toMatch(/deve um favor/);
    if (r1.ok) expect(st18(s).farm[rel.id]?.until).toBeGreaterThan(s.week);
    // vazamento: sabotagem 'release' executada pela quadrilha
    const v = Object.values(s.acts).find((x) => x.status === 'active' && x.fame > 5 && !playerActs(s).includes(x.id))!;
    hire29(s, 'fleak', 'cy:leak', v.id);
    expect(crime17(s).log.some((e) => e.actor === 'o:fleak' && e.target === v.id)).toBe(true);
    // clone de voz: alvo é um(a) cantor(a) de ato ativo de outro selo
    const p = v.members.find((m) => s.persons[m]?.alive)!;
    const od = hireOdds29(s, 'fclone', 'x:clone', p);
    expect(od.block).toBeNull();
    const n0 = recentFacts(s, { kind: 'ai_voice_fake' }).length;
    const r3 = hire29(s, 'fclone', 'x:clone', p);
    if (r3.ok) expect(recentFacts(s, { kind: 'ai_voice_fake' }).length).toBeGreaterThan(n0);
    // fora da época: antes de 2015 não existe quem clone
    const s15 = rich(game(2012, 'loose', 'cyjob'));
    expect(pt(hireOdds29(s15, 'fclone', 'x:clone', 'x').block)).toMatch(/não existe nesta época/);
  }, 60000);
});

describe('r29 Submundo — Cockpit "Favores e dívidas" e calendário', () => {
  it('lista pedidos com prazo, o que você deve e o que devem a você; ações rápidas e prazos no calendário', () => {
    const s = rich(game(1975, 'loose', 'ck'));
    const o = orgById(s, 'fnoite')!;
    hire29(s, 'fnoite', 'sabotage', victim(s).id);
    const fav = owed29(s, o).find((h) => h.src === 'mob29')!;
    let rows = favorRows29(s);
    expect(rows.find((r) => r.kind === 'owe')!.due).toBe(Number(fav.data!.due));
    const a = _mob29.ask29(s, o, 'cut', fav.id);
    rows = favorRows29(s);
    const r0 = rows[0];
    expect(r0.kind).toBe('ask');
    expect(r0.due).toBe(a.dl);
    expect(r0.acts.map((x) => x.id)).toEqual([`mob.ask:${a.id}`, `mob.delay:${a.id}`, `mob.refuse:${a.id}`]);
    expect(rows.some((r) => r.kind === 'owe' && r.id === `owe:${fav.id}`)).toBe(false); // o favor cobrado vira o pedido
    const ck = cockpit27(s);
    const card = ck.cards.find((c) => c.id === 'favors')!;
    expect(card).toBeTruthy();
    expect(card.rows[0].acts?.length).toBe(3);
    expect(pt(card.rows[0].aside as { pt: string })).toMatch(/4 sem/);
    // negociar prazo: +4 semanas, uma vez
    expect(delay29(s, a.id).ok).toBe(true);
    expect(favorRows29(s)[0].due).toBe(a.dl);
    expect(a.dl - a.w).toBe(8);
    expect(delay29(s, a.id).ok).toBe(false);
    // calendário único (agenda/grade do S03)
    const cal = calendar19(s, { weeks: 12 });
    expect(cal.some((d) => d.id === `mob29:ask:${a.id}` && d.w === a.dl && d.act)).toBe(true);
    // favor que a família deve a você
    grantHold(s, { holder: 'player', target: o.key, kind: 'favor', strength: 40, text: l('teste', 'test'), quiet: true });
    expect(favorRows29(s).some((r) => r.kind === 'owed' && r.o === 'fnoite')).toBe(true);
    // sem nada com as famílias, o cartão não aparece
    expect(cockpit27(game(1975, 'loose', 'ck0')).cards.some((c) => c.id === 'favors')).toBe(false);
  });
});

describe('r29 Submundo — facções × gêneros e cenas (aff29)', () => {
  it('funk proibidão no Rio ↔ Comando Vermelho (desde 1995) e PCC em São Paulo (2001+); narcocorrido ↔ cartel', () => {
    const s99 = game(1999, 'loose', 'aff');
    expect(sceneAff29(s99, 'funk_carioca', 'rio').map((x) => x.o)).toContain('cv');
    expect(sceneAff29(s99, 'funk_carioca', 'rio').find((x) => x.o === 'cv')!.doc).toBe(true);
    expect(sceneAff29(s99, 'funk_carioca', 'sao_paulo').map((x) => x.o)).not.toContain('pcc');
    expect(sceneAff29(game(1990, 'loose', 'aff'), 'funk_carioca', 'rio').map((x) => x.o)).not.toContain('cv'); // antes do proibidão
    expect(sceneAff29(game(2005, 'loose', 'aff'), 'funk_carioca', 'sao_paulo').map((x) => x.o)).toContain('pcc');
    expect(sceneAff29(game(1995, 'loose', 'aff'), 'norteno', 'guadalajara').map((x) => x.o)).toContain('sinaloa');
    expect(sceneAff29(game(1985, 'loose', 'aff'), 'norteno', 'guadalajara').map((x) => x.o)).not.toContain('sinaloa');
    expect(sceneAff29(game(1965, 'loose', 'aff'), 'enka', 'osaka').map((x) => x.o)).toContain('yamaguchi');
    expect(sceneAff29(game(1995, 'loose', 'aff'), 'enka', 'osaka').map((x) => x.o)).not.toContain('yamaguchi'); // lei de 1992
    expect(AFF29.length).toBeGreaterThanOrEqual(12);
  }, 60000);

  it('cena com efeito: ato seu de funk no Rio recebe a facção (baile, pedágio, homenagem); a homenagem vira laço da partida (marca interna sim; a interface não distingue)', () => {
    const s = rich(game(2000, 'loose', 'baile'));
    const a = s.acts[playerActs(s)[0]];
    a.genre = 'funk_carioca'; a.city = 'rio';
    let ask: ReturnType<typeof asks29>[number] | undefined;
    for (let i = 0; i < 24 && !ask; i++) { advanceMonth(s); ask = asks29(s).find((x) => x.act === a.id && ['baile', 'homage', 'toll'].includes(x.k)); }
    expect(ask).toBeTruthy();
    expect(sceneAff29(s, 'funk_carioca', 'rio').some((x) => x.o === ask!.o)).toBe(true);
    // a homenagem: laço de rua desta partida (marca interna sim = 1; r29c: sem rótulo na interface)
    const o = orgById(s, ask!.o)!;
    const h = _mob29.ask29(s, o, 'homage', undefined, a.id);
    expect(fulfill29(s, h.id).ok).toBe(true);
    const ln = linksOfKey29(s, a.id).find((x) => x.o === o.id)!;
    expect(ln.kind).toBe('assoc');
    expect(ln.sim).toBe(1);
    expect(orgLinks29(s, o.id).some((x) => x.key === a.id && x.sim === 1)).toBe(true);
    expect(count29(audit29(s)).R10 ?? 0).toBe(0);
  }, 120000);

  it('laço sorteado em segundo plano para gente REAL não vira afirmação (só documentado ou o que aconteceu na partida: jogada sua ou abordagem de facção aceita — aff29npc)', () => {
    const s = game(1999, 'loose', 'safe');
    const real = Object.values(s.acts).find((x) => x.catalogNo && x.status === 'active' && !playerActs(s).includes(x.id))!;
    const fict = Object.values(s.acts).find((x) => !x.catalogNo && x.status === 'active' && !playerActs(s).includes(x.id))!;
    crime17(s).ties[real.id] = 'cv';
    crime17(s).ties[fict.id] = 'cv';
    const rp = real.members[0];
    (crime17(s).mem23 ??= {})[`p:${rp}`] = { o: 'cv', rk: 1, ro: 'musico', w: s.week, why: [l('x', 'x')], k: 2, n: 0 };
    grantHold(s, { holder: 'o:cv', target: rp, kind: 'debt', strength: 50, text: l('dívida', 'debt'), quiet: true });
    const card = orgLinks29(s, 'cv', true);
    expect(card.some((x) => x.key === real.id || x.key === `p:${rp}`)).toBe(false);
    expect(linksOfKey29(s, `p:${rp}`, true).filter((x) => x.kind !== 'doc')).toEqual([]);
    expect(card.some((x) => x.key === fict.id && x.kind === 'assoc' && !x.sim)).toBe(true); // ato inventado: laço de segundo plano do mundo
    // varredura: em qualquer mundo, ligação de chave real é documentada ou da partida
    for (const w of [game(1965, 'loose', 'safe2'), game(1999, 'loose', 'safe3')]) {
      for (let i = 0; i < 3; i++) advanceMonth(w);
      for (const x of allLinks29(w)) {
        const id = x.key.startsWith('p:') ? x.key.slice(2) : x.key;
        const real2 = w.acts[id] ? !!w.acts[id].catalogNo : x.key !== 'player' && !x.key.startsWith('s:') && isReal(w, x.key);
        if (real2) expect(x.kind === 'doc' || x.sim === 1, `${x.key} ${x.o} ${x.kind}`).toBe(true);
      }
    }
    // a ficha do Sinatra continua com a ligação documentada
    expect(linksOfKey29(game(1965, 'loose', 'safe4'), resolveWho29(game(1965, 'loose', 'safe4'), 'Frank Sinatra')!).some((x) => x.kind === 'doc')).toBe(true);
  }, 120000);

  it('determinismo: cena, crime digital e prêmio comprado repetem igual', () => {
    const run = () => {
      const s = rich(game(2006, 'loose', 'det2'));
      const a = s.acts[playerActs(s)[0]];
      a.genre = 'funk_carioca'; a.city = 'rio';
      rigAward29(s, { act: a.id, cat: 'gramo', m: 'bots', by: 'player' });
      hire29(s, 'fleak', 'cy:leak', Object.values(s.acts).find((x) => x.status === 'active' && x.fame > 5 && !playerActs(s).includes(x.id))!.id);
      for (let i = 0; i < 4; i++) advanceMonth(s);
      return JSON.stringify([peek29(s), peekRig29(s), s.player.cash, crime17(s).log.length]);
    };
    expect(run()).toBe(run());
  }, 120000);
});
