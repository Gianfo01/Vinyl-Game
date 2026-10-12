// Rodada 27 (F) — modelo histórico novo ("Arquivo 4" do usuário) + validador de consistência dos dados reais.
// 1) passagens (saiu e voltou), 2) laços com período/subtipo, 3) apelidos e uma pessoa em vários papéis, 4) composição ×
// gravação, 5) procedência, 6) nada de trabalho novo depois da morte, 7) validador (src/data/check27.ts), 8) pesquisa.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame, SAVE_VERSION } from '../src/sim/worldgen';
import { canonKey, classicLineup25, REAL_ALL, realSongs22, rw } from '../src/sim/sys/realworld';
import { halfByParents27, kinLabel15, kinOf15, marriage15 } from '../src/sim/sys/kin15';
import { keys16 } from '../src/sim/sys/people16';
import { REAL_CLASSIC } from '../src/data/realacts_classic';
import { REAL_ACTS } from '../src/data/realnames';
import { REAL_PRODS } from '../src/data/producers15';
import { REAL_MGRS } from '../src/data/managers14';
import { REAL_EXECS } from '../src/data/labels10';
import { CITIES, GENRES } from '../src/data/world';
import { check27, type Db27 } from '../src/data/check27';
import { MERGED27, songList27, workOf27 } from '../src/data/model27';
import { atDebut27, inLineupAt, periodsOf, type RealArtist, type RealMember } from '../src/data/realtypes';
import { decodeSave20, encodeSave20, SaveError20 } from '../src/core/save20';
import { migrate } from '../src/ui/store';
import type { Act, GameState, Person } from '../src/sim/types';

const ra = (n: string): RealArtist => { const a = REAL_ALL.find((x) => x.n === n); if (!a) throw new Error(n); return a; };
const cl = (n: string) => { const no = Object.entries(REAL_ACTS).find(([, a]) => a.name === n)?.[0]; if (!no) throw new Error(n); return REAL_CLASSIC[+no]; };
const mem = (m: RealMember[] | undefined, n: string) => (m ?? []).filter((x) => x[0] === n);
const songsOf = (n: string) => { const i = REAL_ALL.findIndex((a) => a.n === n); const no = Object.entries(REAL_ACTS).find(([, a]) => a.name === n)?.[0]; return realSongs22({ catalogNo: i >= 0 ? 1000 + i : Number(no) } as Act); };

describe('r27 F: validador de consistência', () => {
  it('nenhum problema nos dados (mesma pessoa, passagens, mortes, família, bastidores, cópias)', () => {
    const acts: Db27['acts'] = [...REAL_ALL, ...Object.entries(REAL_CLASSIC).map(([no, e]) => ({ ...e, n: REAL_ACTS[+no]?.name ?? `#${no}`, classic: true }))];
    const catalogNames = Object.entries(REAL_CLASSIC).filter(([no]) => REAL_ACTS[+no]?.members).map(([no, e]) => ({ n: REAL_ACTS[+no].name, members: REAL_ACTS[+no].members!, debutLineup: (e.m ?? []).filter((m) => e.d !== undefined && atDebut27(m, e.d)).map((m) => m[0]) }));
    const issues = check27({ acts, prods: REAL_PRODS, mgrs: REAL_MGRS, execs: REAL_EXECS, catalogNames, genres: new Set(GENRES.map((g) => g.id)), cities: new Set(CITIES.map((c) => c.id)), aliases: {} });
    expect(issues.map((x) => `${x.cat}: ${x.msg}`)).toEqual([]);
    expect(MERGED27, 'os dados já usam o 7º campo (passagens), sem linhas repetidas').toEqual([]);
  });
});

describe('r27 F: passagens (saiu e voltou)', () => {
  it('uma linha por pessoa, com as passagens', () => {
    const singer = mem(ra('KISS').m, 'Eric Singer');
    expect(singer).toHaveLength(1);
    expect(periodsOf(singer[0])).toEqual([[1991, 1996], [2004]]);
    expect(periodsOf(mem(ra('Take That').m, 'Robbie Williams')[0])).toEqual([[undefined, 1995], [2010, 2012]]);
    expect(periodsOf(mem(ra('Red Hot Chili Peppers').m, 'John Frusciante')[0])).toHaveLength(3);
    expect(periodsOf(mem(ra('The Jackson 5').m, 'Jermaine Jackson')[0])).toEqual([[1964, 1975], [1983, 1989]]);
    const bj = mem(ra('AC/DC').m, 'Brian Johnson')[0];
    expect([inLineupAt(bj, 2015), inLineupAt(bj, 2017), inLineupAt(bj, 2019)]).toEqual([true, false, true]);
    const cm = mem(cl('Fleetwood Mac').m, 'Christine McVie')[0];
    expect([inLineupAt(cm, 1980), inLineupAt(cm, 2005), inLineupAt(cm, 2015)]).toEqual([true, false, true]);
    expect(periodsOf(mem(cl('Pink Floyd').m, 'Richard Wright')[0])).toEqual([[undefined, 1979], [1987]]);
  });
  it('a regra da formação clássica (mundo aleatório) continua valendo', () => {
    const g = ra('Genesis');
    const set = classicLineup25(g.m!, g.d);
    expect(set, 'Genesis estreou com 3–4 e chegou a 5').toBeTruthy();
  });
});

describe('r27 F: laços com período e subtipo', () => {
  it('cônjuge × ex-cônjuge pelo ano; morte no fim do período continua cônjuge', () => {
    const astrud = { from: 1959, to: 1964 };
    expect([marriage15(astrud, 'ex', 1958), marriage15(astrud, 'ex', 1962), marriage15(astrud, 'ex', 1966)]).toEqual([undefined, 'spouse', 'ex']);
    const elis = { from: 1973, to: 1981 };
    expect([marriage15(elis, 'ex', 1975), marriage15(elis, 'ex', 1982)]).toEqual(['spouse', 'ex']);
    const john = { alive: false, died: 1980 } as Person;
    expect(marriage15({ from: 1969, to: 1980 }, 'spouse', 1990, john)).toBe('spouse');
  });
  it('meio-irmãos não ganham um segundo pai/mãe em comum', () => {
    expect(halfByParents27('Julian Lennon', 'Sean Lennon', 'John Lennon')).toBe(true);
    expect(halfByParents27('Norah Jones', 'Anoushka Shankar', 'Ravi Shankar')).toBe(true);
    expect(halfByParents27('João Marcello Bôscoli', 'Maria Rita', 'Elis Regina')).toBe(true);
    expect(halfByParents27('Maria Rita', 'Pedro Mariano', 'Elis Regina')).toBe(false);
    expect(kinLabel15({ rel: 'sibling', sub: 'half' }).pt).toBe('Meio-irmão(ã)');
    expect(kinLabel15({ rel: 'ex', from: 1959, to: 1964 }).pt).toBe('Ex-cônjuge (1959–1964)');
    expect(kinLabel15({ rel: 'parent', sub: 'step' }).pt).toBe('Padrasto/madrasta');
    expect(kinLabel15({ rel: 'parent' }).pt).toBe('Pai/mãe'); // genérico não vira biológico
  });
});

describe('r27 F: apelidos, composição e pesquisa', () => {
  it('apelidos levam ao mesmo nome canônico', () => {
    expect(canonKey('Mel B')).toBe(canonKey('Melanie Brown'));
    expect(canonKey('Mel C')).toBe(canonKey('Melanie Chisholm'));
    expect(canonKey('Phil Selway')).toBe(canonKey('Philip Selway'));
    expect(canonKey('Jay Dee')).toBe(canonKey('J Dilla'));
  });
  it('obra × gravação: autores, ano original nas estreias, sem coletânea/relançamento como música nova', () => {
    expect(workOf27('O Xote das Meninas')!.w).toEqual(['Luiz Gonzaga', 'Zé Dantas']);
    expect(workOf27('Baião')!.w).toContain('Humberto Teixeira');
    const y = (n: string, t: string) => songsOf(n).find(([x]) => x === t)?.[1];
    expect(y('Queen', 'Under Pressure')).toBe(1981);
    expect(y('Queen', 'Crazy Little Thing Called Love')).toBe(1979);
    expect(y('The Beatles', "Don't Let Me Down")).toBe(1969);
    expect(y('The Beach Boys', "California Dreamin'")).toBe(1986);
    expect(y('Elis Regina', 'Casa No Campo')).toBe(1972);
    expect(y('Jorge Ben Jor', 'Fio Maravilha')).toBe(1972);
    expect(y('Luiz Gonzaga', 'O Xote das Meninas')).toBe(1953);
    expect(songsOf('Pink Floyd').filter(([t]) => /another brick in the wall.*2/i.test(t))).toHaveLength(1); // ao vivo de 1995 não é música nova
    expect(songsOf('Michael Jackson').length).toBeGreaterThan(8);
    expect(songList27('X', [['A', 2000], ['a', 2005]])).toEqual([['A', 2000]]);
  });
  it('pesquisa aplicada: formações, discos, artistas novos, país', () => {
    expect(REAL_ACTS[Number(Object.entries(REAL_ACTS).find(([, a]) => a.name === 'BTS')![0])].members).toHaveLength(7);
    expect(REAL_ACTS[Number(Object.entries(REAL_ACTS).find(([, a]) => a.name === "Girls' Generation")![0])].members).toHaveLength(9);
    expect(cl('BTS').al!.find((r) => r[0] === 'Proof')![3]).toBe('compilation');
    expect(cl('BTS').al!.find((r) => r[0] === '2 Cool 4 Skool')![2]).toBe('single');
    expect(cl('The Beatles').al!.some((r) => r[0] === 'The Beatles (White Album)' && r[1] === 1968)).toBe(true);
    for (const n of ['Eumir Deodato', 'Itamar Assumpção', 'Jards Macalé', 'Arrigo Barnabé', 'Rosinha de Valença', 'Dori Caymmi', 'Danilo Caymmi', 'Nana Caymmi', 'J Dilla']) expect(ra(n).n).toBe(n);
    expect(ra('3T').exact).toBeUndefined();
    expect(ra('3T').ap).toEqual(['f']);
    expect(ra('Cambriana').cn).toBe('BRA');
    expect(ra('Cambriana').exact).toBe(false); // confiança baixa: segue não conferido
    expect(ra('Molejo').exact).toBeUndefined();
    expect(mem(ra('Titãs').m, 'Beto Lee')[0][4]).toBe(2016);
    expect(mem(cl('Luiz Gonzaga').m, 'Zé Dantas')).toHaveLength(0);
    expect(REAL_ALL.filter((a) => /revela[cç][aã]o/i.test(a.n))).toHaveLength(1);
  });
  it('produtores e empresários: disponibilidade acaba na morte', () => {
    for (const p of REAL_PRODS) if (p.died) expect(p.to, p.id).toBeLessThanOrEqual(p.died);
    for (const m of REAL_MGRS) if (m.died) expect(m.to, m.id).toBeLessThanOrEqual(m.died);
    expect(REAL_PRODS.find((p) => p.id === 'capone')!.to).toBe(2004);
  });
  it('save de versão antiga é recusado como "old" (a tela oferece Excluir)', async () => {
    const g = createGame(defaultConfig('r27f-save', { startYear: 1975 }));
    const env = encodeSave20(g);
    const old = env.replace(`"saveVersion":${SAVE_VERSION}`, `"saveVersion":${SAVE_VERSION - 1}`).replace(`"version":${SAVE_VERSION}`, `"version":${SAVE_VERSION - 1}`);
    let code = '';
    try { decodeSave20(old, migrate); } catch (e) { code = e instanceof SaveError20 ? e.code : 'x'; }
    expect(code).toBe('old');
    expect(decodeSave20(env, migrate).signature).toBe(g.signature);
  });
});

describe('r27 F: no jogo (vida real exata, 2005)', () => {
  const who = (s: GameState, n: string) => Object.values(s.persons).filter((p) => p.name === n);
  const act = (s: GameState, n: string) => Object.values(s.acts).find((a) => a.name === n)!;
  it('passagens, uma pessoa em vários papéis, compositor real, laços com período e procedência', { timeout: 300000 }, () => {
    const s = createGame(defaultConfig('r27f-game', { startYear: 2005, realNames: true, dbSize: 'large', history: 'strict' }));
    const name = (id: string) => s.persons[id]?.name;
    // passagens: Eric Singer de volta (2004–); Robbie fora até 2010 (volta agendada até 2012); Wright de volta ao Pink Floyd
    expect(act(s, 'KISS').members.map(name)).toContain('Eric Singer');
    const tt = act(s, 'Take That');
    expect(tt.members.map(name)).not.toContain('Robbie Williams');
    expect(rw(s).sched.some((e) => e.actId === tt.id && e.kind === 'join' && e.m?.[0] === 'Robbie Williams' && e.year === 2010 && e.until === 2012)).toBe(true);
    expect(act(s, 'Pink Floyd').members.map(name)).toEqual(expect.arrayContaining(['Richard Wright', 'David Gilmour', 'Nick Mason']));
    // Mel C: a mesma pessoa no Spice Girls e na carreira solo
    expect(who(s, 'Melanie C')).toHaveLength(1);
    expect(act(s, 'Spice Girls').members).toContain(who(s, 'Melanie C')[0].id);
    // Sérgio Mendes: solo e Brasil '66 são a mesma pessoa
    expect(who(s, 'Sérgio Mendes')).toHaveLength(1);
    // J Dilla: artista solo e produtor são a mesma pessoa (papéis unificados)
    const dilla = who(s, 'J Dilla');
    expect(dilla).toHaveLength(1);
    expect(keys16(s, 'pd:dilla')).toContain(`p:${dilla[0].id}`);
    // Zé Dantas: compositor real (Pessoa), não integrante do Gonzaga
    const ze = who(s, 'Zé Dantas');
    expect(ze).toHaveLength(1);
    expect(ze[0].real27?.writer).toBe(1);
    expect(act(s, 'Luiz Gonzaga').members.map(name)).toEqual(['Luiz Gonzaga']);
    // laços: ex-cônjuge com período; Gonzaguinha filho biológico (versão oficial)
    const jg = who(s, 'João Gilberto')[0], as = who(s, 'Astrud Gilberto')[0];
    const k = kinOf15(s, jg.id).find((x) => x.id === as.id)!;
    expect([k.rel, k.from, k.to]).toEqual(['ex', 1959, 1964]);
    const gz = who(s, 'Gonzaguinha')[0];
    expect(kinOf15(s, gz.id).find((x) => s.persons[x.id].name === 'Luiz Gonzaga')).toMatchObject({ rel: 'parent', sub: 'biological' });
    // procedência: não conferido some do modo exato; nascimento gerado = idade aproximada
    expect(Object.values(s.acts).some((a) => a.name === 'Cambriana')).toBe(false);
    const molejo = act(s, 'Molejo');
    expect([...molejo.members, ...(rw(s).former[molejo.id] ?? []).map((f) => f.personId)].map(name)).not.toContain('Andrezinho');
    expect(Object.values(s.persons).some((p) => p.real27?.bornEst)).toBe(true);
    expect(who(s, 'Gilberto Gil')[0]?.real27?.prov).toBe('c');
  });
});
