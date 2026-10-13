// Rodada 29 — Submundo: qualquer personagem é alvo. Pedido do autor: "deve ter opção para todos os personagens".
// Antes, "Planejar no Submundo…" e "Mais opções no Submundo…" só aceitavam a lista fixa de targetsFor (os 40 atos mais
// famosos e os 2 primeiros integrantes de cada) — Elvis Presley aparecia desabilitado ("Fora da lista de alvos").
// Agora: qualquer pessoa (integrante, artista solo, produtor, empresário, líder de selo, crítico, equipe), ato ou selo
// vale; ficam de fora, COM o motivo, só os casos legítimos (morto, você, seu elenco, tipo errado de alvo, época, caixa,
// calor). Fórmulas de chance/custo/consequência são as de sempre (crimeOdds/commitCrime), com fama de reserva para quem
// não tem ato. O seletor com busca (crimetargets29) devolve no máximo 30 resultados, agrupados.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { Rng } from '../src/core/rng';
import { visibleAct } from '../src/sim/future';
import { activeCritics } from '../src/sim/media';
import { commitCrime, crime17, crimeById, crimeOdds, famOf, nameOf17, placeOf, targetBlock17, targetId17, targetsFor } from '../src/sim/sys/crime17';
import { TGRP29, candidates29, search29 } from '../src/sim/sys/crimetargets29';
import { KEY16 } from '../src/sim/sys/gone16';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { ctxMenu27, type CtxEnv27, type CtxMenu27 } from '../src/ui/ps/ctx27model';
import { crimeForm17, presetCrimeFor29 } from '../src/ui/sys/crimeform29';

const ENV: CtxEnv27 = { has: (f) => f !== 'songmarket' };
const pt = (x: { pt: string } | null | undefined): string => x?.pt ?? '';
const game = (y: number, seed = 'r29ct'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established', realNames: true }));
const C = (id: string) => crimeById(id)!;
const elvis = (s: GameState) => Object.values(s.persons).find((p) => p.name === 'Elvis Presley')!;
const item = (m: CtxMenu27 | null, id: string) => m?.items.find((x) => x.id === id);
/** Rng que sempre "acerta" (para testar a consequência sem depender da sorte). */
const LUCKY = { chance: () => true, float: (a: number) => a, int: (a: number) => a, pick: <T>(x: T[]) => x[0] } as unknown as Rng;

describe('r29 — alvos do Submundo: qualquer personagem', () => {
  let s56: GameState;
  let s75: GameState;
  beforeAll(() => { s56 = game(1956); s75 = game(1975); });

  it('produtor e crítico (fora da antiga lista dos 40) são alvos válidos, com chance/custo/lugar das fórmulas de sempre', () => {
    const s = s75;
    const bm = C('blackmail');
    const old = new Set(CRIMES_PERSON(s).flatMap((c) => targetsFor(s, c).map((x) => x.id)));
    const prod = candidates29(s, bm).find((x) => x.id === 'pd:spector') ?? candidates29(s, bm).find((x) => x.id.startsWith('pd:') && !x.dead)!;
    const crit = `c:${activeCritics(s)[0].name}`;
    for (const key of [prod.id, crit]) {
      expect(old.has(key)).toBe(false);
      for (const cid of ['blackmail', 'assault', 'murder']) expect(targetBlock17(s, C(cid), key), `${cid} ${key}`).toBeNull();
      const od = crimeOdds(s, { actor: 'player', target: key, partners: [] }, 'blackmail');
      expect(od.block).toBeNull();
      expect(od.p).toBeGreaterThan(0.05); expect(od.p).toBeLessThan(0.95);
      expect(Number.isFinite(od.cost) && od.cost > 0).toBe(true);
      expect(placeOf(s, key)).toBeTruthy();
      expect(famOf(s, key)).toBeGreaterThan(0); // fama de reserva (quem não tem ato)
      expect(nameOf17(s, key)).not.toBe(key);
    }
  });

  it('a mesma ação contra a mesma pessoa da indústria dá o mesmo resultado (RNG próprio do crime, determinístico)', () => {
    const run = () => { const s = game(1975, 'r29det'); const k = candidates29(s, C('blackmail')).find((x) => x.id.startsWith('pd:') && !x.dead)!.id; const r = commitCrime(s, 'blackmail', { actor: 'player', target: k, partners: [] }); return [JSON.stringify(r), s.player.cash, JSON.stringify(crime17(s).heat)]; };
    expect(run()).toEqual(run());
  });

  it('encomendar a morte de um produtor (fora do modo exato) tira-o de cena; depois ele aparece com o motivo', () => {
    const s = game(1975, 'r29kill');
    const k = candidates29(s, C('murder')).find((x) => x.id.startsWith('pd:') && !x.dead)!.id;
    const r = commitCrime(s, 'murder', { actor: 'player', target: k, method: 'accident', partners: [] }, LUCKY);
    expect(typeof r === 'object' && 'ok' in r && r.ok).toBe(true);
    expect(KEY16.st(s, k)).toBe('dead');
    expect(pt(targetBlock17(s, C('blackmail'), k))).toMatch(/morreu/);
  });

  it('Elvis Presley é alvo válido (pessoa) e o ato dele também (sabotagem)', () => {
    for (const s of [s56, s75]) {
      const e = elvis(s);
      expect(e?.alive).toBe(true);
      for (const cid of ['blackmail', 'assault']) expect(targetBlock17(s, C(cid), e.id), `${s.year} ${cid}`).toBeNull();
      expect(targetBlock17(s, C('blackmail'), `p:${e.id}`)).toBeNull(); // chave de pessoa do menu também vale
      const r = search29(s, C('blackmail'), 'elvis');
      expect(r.list[0].id).toBe(e.id);
      expect(r.list[0].block).toBeNull();
    }
    const a = Object.values(s56.acts).find((x) => x.name === 'Elvis Presley' && x.members.includes(elvis(s56).id))!;
    expect(targetBlock17(s56, C('sabotage'), a.id)).toBeNull();
  });

  it('casos fora mostram o motivo: morto, você, seu elenco, tipo errado, época, caixa e calor', () => {
    const s80 = game(1980);
    const dead = elvis(s80);
    expect(dead.alive).toBe(false);
    expect(pt(targetBlock17(s80, C('blackmail'), dead.id))).toMatch(/Elvis Presley já morreu \(em 1977\)/);
    const s = s75;
    expect(pt(targetBlock17(s, C('blackmail'), 'player'))).toMatch(/É você/);
    const mine = s.acts[playerActs(s)[0]];
    const member = mine.members.find((m) => s.persons[m]?.alive && !s.persons[m].isPlayer)!;
    expect(pt(targetBlock17(s, C('assault'), member))).toMatch(/seu elenco/);
    expect(pt(targetBlock17(s, C('sabotage'), mine.id))).toMatch(/seu artista/);
    // a ação pede outro tipo de alvo
    const e = elvis(s);
    expect(pt(targetBlock17(s, C('sabotage'), e.id))).toMatch(/exige um artista/);
    expect(pt(targetBlock17(s, C('sabotage'), 'pd:spector'))).toMatch(/exige um artista/);
    expect(pt(targetBlock17(s, C('blackmail'), mine.id))).toMatch(/contra uma pessoa/);
    expect(pt(targetBlock17(s, C('wiretap'), e.id))).toMatch(/contra um selo/);
    // época: ato que ainda não estreou (e que você não conhece) não entra
    const fut = Object.values(s.acts).find((a) => !visibleAct(s, a));
    if (fut) expect(pt(targetBlock17(s, C('sabotage'), fut.id))).toMatch(/Ainda não entrou em cena/);
    // época/tecnologia: avião particular de turnê só a partir de 1950
    const s46 = game(1946);
    const p46 = candidates29(s46, C('murder')).find((x) => x.grp === 'person' && !x.dead && !targetBlock17(s46, C('murder'), x.id))!;
    expect(pt(crimeOdds(s46, { actor: 'player', target: p46.id, method: 'plane', partners: [] }, 'murder').block)).toMatch(/avi/);
    // caixa e calor (as regras de sempre continuam valendo para os novos alvos)
    const s2 = game(1975, 'r29cash');
    s2.player.cash = 0;
    expect(pt(crimeOdds(s2, { actor: 'player', target: elvis(s2).id, partners: [] }, 'blackmail').block)).toMatch(/Caixa/);
    const s3 = game(1975, 'r29heat');
    const od = crimeOdds(s3, { actor: 'player', target: 'pd:spector', partners: [] }, 'blackmail');
    crime17(s3).exile[od.a3] = 1;
    expect(pt(crimeOdds(s3, { actor: 'player', target: 'pd:spector', partners: [] }, 'blackmail').block)).toMatch(/fugiu/);
    // no menu de ações, quem está fora aparece desabilitado com o motivo (não some)
    const mm = ctxMenu27(s80, 'person', `p:${dead.id}`, ENV);
    expect(pt(item(mm, 'crime.person')?.block)).toMatch(/morreu/);
    const mo = ctxMenu27(s, 'person', `p:${member}`, ENV);
    expect(pt(item(mo, 'crime.person')?.block)).toMatch(/seu elenco/);
  });

  it('menu de ações: "Planejar…" e "Mais opções no Submundo…" para qualquer pessoa/ato/selo, com o preset certo', () => {
    const s = s75;
    const e = elvis(s);
    // artista fora da lista: "Mais opções" liberado
    const me = ctxMenu27(s, 'person', `p:${e.id}`, ENV)!;
    expect(item(me, 'crime.person')?.block).toBeNull();
    // gente da indústria: planos um a um + "Mais opções", todos liberados
    const crit = `c:${activeCritics(s)[0].name}`;
    for (const key of ['pd:spector', crit]) {
      const m = ctxMenu27(s, 'person', key, ENV)!;
      expect(m, key).toBeTruthy();
      for (const id of ['crime.person', 'crime.plan:blackmail', 'crime.plan:assault']) expect(item(m, id)?.block ?? null, `${key} ${id}`).toBeNull();
      expect(item(m, 'crime.plan:blackmail')?.chance).toBeGreaterThan(0);
    }
    // ato e selo fora da antiga lista
    const act = Object.values(s.acts).find((a) => visibleAct(s, a) && a.status !== 'retired' && a.status !== 'split' && !playerActs(s).includes(a.id) && a.fame <= 5)!;
    expect(item(ctxMenu27(s, 'act', act.id, ENV), 'crime.plan:sabotage')?.block ?? null).toBeNull();
    const lb = Object.values(s.labels).filter((x) => x.active).sort((a, b) => a.reputation - b.reputation)[0];
    expect(item(ctxMenu27(s, 'label', lb.id, ENV), 'crime.plan:wiretap')?.block ?? null).toBeNull();
    // o preset do formulário (crimeform29) recebe o id do menu e guarda o id de alvo do Submundo
    presetCrimeFor29(s, 'blackmail', `p:${e.id}`);
    expect([crimeForm17.c, crimeForm17.target]).toEqual(['blackmail', e.id]);
    presetCrimeFor29(s, 'assault', 'pd:spector');
    expect([crimeForm17.c, crimeForm17.target]).toEqual(['assault', targetId17(s, 'pd:spector')]);
    presetCrimeFor29(s, 'sabotage', act.id);
    expect(crimeForm17.target).toBe(act.id);
    presetCrimeFor29(s, 'wiretap', lb.id);
    expect(crimeForm17.target).toBe(lb.id);
    // e os dois itens do menu usam esse preset (ps/ctx27.ts)
    const src = readFileSync(join(__dirname, '../src/ui/ps/ctx27.ts'), 'utf8');
    expect(src).toMatch(/case 'crime\.person':[^\n]*presetCrimeFor29\(s, c0\.id, key\)/);
    expect(src).toMatch(/startsWith\('crime\.plan:'\)\) \{ presetCrimeFor29\(s, item\.id\.slice\(11\), id\)/);
  });

  it('seletor com busca: todos os grupos, nada do futuro, no máximo 30 resultados, sugestões = a lista de sempre', () => {
    const s = s75;
    const bm = C('blackmail');
    const all = candidates29(s, bm);
    const grp = new Set(all.map((x) => x.grp));
    for (const g of ['person', 'industry', 'act', 'label'] as const) { expect(grp.has(g)).toBe(true); expect(pt(TGRP29[g]).length).toBeGreaterThan(3); }
    for (const x of all) if (x.grp === 'act') expect(visibleAct(s, s.acts[x.id])).toBe(true);
    const r = search29(s, bm, 'a');
    expect(r.total).toBeGreaterThan(30);
    expect(r.list.length).toBe(30);
    // o grupo certo para a ação vem antes
    const firstWrong = r.list.findIndex((x) => x.grp !== 'person' && x.grp !== 'industry');
    if (firstWrong >= 0) expect(r.list.slice(firstWrong).every((x) => x.grp !== 'person' && x.grp !== 'industry')).toBe(true);
    // sem termo: as sugestões de sempre (os mais famosos), na mesma ordem
    const sug = search29(s, bm, '', 8);
    expect(sug.list.map((x) => x.id)).toEqual(targetsFor(s, bm).slice(0, 8).map((x) => x.id));
    // sem acento: "joao" acha "João"
    const acc = all.find((x) => /[áéíóúãõç]/i.test(x.name));
    if (acc) expect(search29(s, bm, acc.name.normalize('NFD').replace(/[̀-ͯ]/g, '')).list.some((x) => x.id === acc.id)).toBe(true);
  });
});

function CRIMES_PERSON(s: GameState) { void s; return ['murder', 'assault', 'blackmail'].map(C); }
