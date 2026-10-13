// Rodada 29 — "Seu personagem" na Nova run rápida.
// (1) rápida == completa para nome, idade, sexo, aparência, funções (até 3 instrumentos) e banda (mesmos setters);
// (2) a principal e as extras chegam à Person do jogador (role + roles27);
// (3) quem canta dispensa outro cantor e a banda completa as funções que faltam;
// (4) funções e gêneros respeitam a época; (5) os padrões valem para todas as atividades.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas (como nos outros testes)
import { newRunConfig20 } from '../src/sim/start17';
import { careerDefs, roleFromMain } from '../src/sim/sys/careers12';
import { playerPerson } from '../src/sim/sys/life';
import { sings } from '../src/sim/sys/vocals10';
import { AGE29_MAX, AGE29_MIN, EXTRA29_MAX, ROLES29_MAX, roleOpen29, rolesOpen29, setCharAge29, setCharName29, setExtraRoles29, setMainRole29 } from '../src/sim/char29data';
import type { GameState, Person, RunConfig } from '../src/sim/types';
import { rollGenre29, setBandGenre29 } from '../src/sim/genre29data';
import { applyQuick27, buildRun27, draftDefaults27, quickDefaults27, quickRunConfig27, type QuickRun27 } from '../src/ui/ps/home27model';
import { artDefaults29, canAddRole29, charDefaults29, charLine29, genresOpen29, setCharSex29, toggleExtra29, type QuickArt29, type QuickChar29 } from '../src/ui/ps/char29model';

/** O que a configuração completa faz: fábrica + padrões dos cartões; atividade (cartão de atividades), ano exato,
 *  cidade; ficha (charCreate: nome, idade, sexo, aparência, instrumento principal e os chips "Também toca ou canta");
 *  bloco da banda (nome, gênero) e "Seu artista: formação" (custom.members). */
function fullFlow(seed: string, e: { startYear: number; homeCity: string; career: string }, c: QuickChar29, a?: QuickArt29): RunConfig {
  const cfg = draftDefaults27(newRunConfig20({ seed, companyName: 'Selo' }));
  cfg.startYear = e.startYear;
  cfg.homeCity = e.homeCity;
  if (e.career !== 'label') { const m = cfg.careers!; m.main = [...m.main, e.career].filter((x) => x !== 'label'); cfg.role = roleFromMain(m.main); }
  draftDefaults27(cfg);
  const ch = cfg.character!;
  setCharName29(ch, c.name);
  setCharAge29(ch, c.age);
  if (c.look) ch.look = c.look; // editor de aparência
  setCharSex29(ch, c.sex);
  if (a) {
    setMainRole29(ch, a.role, cfg.startYear);
    for (const r of a.extra) { const x = { role: ch.role!, extra: [...(ch.roles27 ?? [])] }; toggleExtra29(x, r, cfg.startYear); setExtraRoles29(ch, x.extra, cfg.startYear); }
    if (a.genre) setBandGenre29(cfg, a.genre); // lista de gêneros
    else for (let i = 0; i < (a.genreK ?? 0); i++) rollGenre29(cfg); // 🎲
    if (a.members !== undefined) cfg.custom!.members = a.members;
    cfg.bandName = a.bandName;
  }
  return draftDefaults27(cfg);
}

const quick = (seed: string, e: Partial<QuickRun27>, c?: Partial<QuickChar29>, a?: Partial<QuickArt29>): QuickRun27 => {
  const q: QuickRun27 = { ...quickDefaults27(seed, 'Selo'), ...e };
  q.char29 = { ...charDefaults29(q), ...c };
  if (a) q.art29 = { ...artDefaults29(), ...a };
  return q;
};
const others = (s: GameState, p: Person) => s.acts[s.player.bandActId!].members.filter((id) => id !== p.id).map((id) => s.persons[id]);

describe('r29 Nova run rápida: Seu personagem', () => {
  it('rápida == completa para nome, idade, sexo, aparência, funções e banda', () => {
    const genre = genresOpen29(1991).find((g) => g.id === 'grunge')?.id ?? genresOpen29(1991)[5].id;
    const e = { startYear: 1991, homeCity: 'sao_paulo', career: 'musician' };
    const q = quick('r29c-a', e, { name: 'Ana Souza', age: 22, sex: 'f', nameAuto: false, ageAuto: false }, { role: 'vocal', extra: ['guitar', 'keys'], genre, members: 4, bandName: 'Os Testes' });
    const qc = quickRunConfig27(q);
    expect(qc).toEqual(fullFlow('r29c-a', e, q.char29!, q.art29));
    expect(qc.character).toMatchObject({ name: 'Ana Souza', age: 22, sex: 'f', pronoun: 'she', role: 'vocal', roles27: ['guitar', 'keys'] });
    expect(qc.bandGenre).toBe(genre);
    expect(qc.custom?.members).toBe(4);
    expect(qc.bandName).toBe('Os Testes');
    expect(t2(charLine29(qc.character, true))).toBe('Ana Souza, 22 · Vocal · Guitarra · Teclados');
    // aplicar de novo é idempotente e "Configuração completa" recebe o rascunho pronto
    expect(applyQuick27(JSON.parse(JSON.stringify(qc)) as RunConfig, q)).toEqual(qc);
    expect(draftDefaults27(JSON.parse(JSON.stringify(qc)) as RunConfig)).toEqual(qc);
    // não artista: só o personagem; as escolhas de banda não entram
    const e2 = { startYear: 1975, homeCity: 'rio', career: 'manager' };
    const q2 = quick('r29c-b', e2, { name: 'Zé', age: 44, sex: 'm' }, { role: 'drums', extra: ['vocal'], members: 1, bandName: 'x' });
    expect(quickRunConfig27(q2)).toEqual(fullFlow('r29c-b', e2, q2.char29!));
  });

  it('até 3 instrumentos no total (principal + 2), igual na rápida e na completa', () => {
    expect(ROLES29_MAX).toBe(3);
    expect(EXTRA29_MAX).toBe(2);
    const a = { ...artDefaults29(), role: 'vocal' };
    toggleExtra29(a, 'guitar', 1990);
    toggleExtra29(a, 'keys', 1990);
    expect(canAddRole29(a)).toBe(false);
    toggleExtra29(a, 'bass', 1990); // bloqueado: já são 3
    expect(a.extra).toEqual(['guitar', 'keys']);
    toggleExtra29(a, 'vocal', 1990); // a principal não vira extra
    expect(a.extra).toEqual(['guitar', 'keys']);
    toggleExtra29(a, 'keys', 1990); // desmarcar libera
    expect(canAddRole29(a)).toBe(true);
    // o setter corta mesmo que chegue uma lista maior (código de run, save editado)
    const ch = { name: '', age: 30, background: 'musician', role: 'vocal' as Person['role'] };
    setExtraRoles29(ch, ['guitar', 'bass', 'keys', 'drums'], 1990);
    expect(ch).toMatchObject({ roles27: ['guitar', 'bass'] });
    const e = { startYear: 1990, homeCity: 'london', career: 'musician' };
    const q = quick('r29c-cap', e, {}, { role: 'vocal', extra: ['guitar', 'bass', 'keys', 'drums'] });
    const qc = quickRunConfig27(q);
    expect(qc.character!.roles27).toEqual(['guitar', 'bass']);
    expect(qc).toEqual(fullFlow('r29c-cap', e, q.char29!, q.art29));
    // tirar a principal das extras ao trocar a principal
    setMainRole29(ch, 'guitar', 1990);
    expect(ch).toMatchObject({ role: 'guitar', roles27: ['bass'] });
  });

  it('principal + extras chegam à Person do jogador; quem canta dispensa outro cantor; a banda completa as funções', () => {
    const q = quick('r29c-band', { startYear: 1984, homeCity: 'london', career: 'musician' }, { name: 'Ana Souza', age: 22, sex: 'f' }, { role: 'guitar', extra: ['vocal'], genre: 'new_wave', members: 4, bandName: 'Teste' });
    const s = createGame(buildRun27(quickRunConfig27(q)));
    const p = playerPerson(s)!;
    expect(p.name).toBe('Ana Souza');
    expect(s.year - (p.born ?? 0)).toBe(22);
    expect(p.role).toBe('guitar');
    expect(p.roles27).toEqual(['vocal']);
    expect(sings(s, p)).toBe(true);
    const os = others(s, p);
    expect(os.length).toBe(3);
    expect(os.every((o) => o.role !== 'vocal' && o.role !== 'guitar')).toBe(true); // sem cantor extra, sem guitarra repetida
    expect(new Set(os.map((o) => o.role)).size).toBe(3);
    expect(s.acts[s.player.bandActId!]).toMatchObject({ genre: 'new_wave', name: 'Teste' });
    // personagem que não canta: a banda continua com quem cante (r10) e sem baterista repetido
    const q2 = quick('r29c-drum', { startYear: 1984, homeCity: 'london', career: 'musician' }, {}, { role: 'drums', extra: [], members: 3 });
    const s2 = createGame(buildRun27(quickRunConfig27(q2)));
    const p2 = playerPerson(s2)!;
    expect(p2.role).toBe('drums');
    expect(p2.roles27).toBeUndefined();
    const os2 = others(s2, p2);
    expect(os2.some((o) => sings(s2, o))).toBe(true);
    expect(os2.every((o) => o.role !== 'drums')).toBe(true);
  });

  it('funções e gêneros respeitam a época', () => {
    const r60 = rolesOpen29(1960);
    expect(r60).not.toContain('dj');
    expect(r60).not.toContain('mc');
    expect(r60).not.toContain('producer');
    expect(rolesOpen29(1995)).toEqual(expect.arrayContaining(['dj', 'mc', 'producer', 'vocal']));
    expect(roleOpen29('dj', 1974)).toBe(false);
    expect(roleOpen29('dj', 1975)).toBe(true);
    const q = quick('r29c-era', { startYear: 1960, homeCity: 'london', career: 'musician' }, {}, { role: 'dj', extra: ['mc', 'guitar'], genre: 'boom_bap' });
    const c = quickRunConfig27(q);
    expect(c.character!.role).toBe('vocal'); // DJ ainda não existe: cai em Vocal
    expect(c.character!.roles27).toEqual(['guitar']);
    expect(c.bandGenre).not.toBe('boom_bap');
    expect(genresOpen29(1960).some((g) => g.id === c.bandGenre)).toBe(true);
    expect(genresOpen29(1960).some((g) => g.id === 'boom_bap')).toBe(false);
  });

  it('os padrões (sem mexer em nada) valem para todas as atividades', () => {
    const ids = careerDefs().map((d) => d.id);
    expect(ids.length).toBeGreaterThanOrEqual(10);
    for (const id of ids) {
      const d = careerDefs().find((x) => x.id === id)!;
      const year = Math.max(d.from, 1962);
      const q0: QuickRun27 = { ...quickDefaults27(`r29c-def-${id}`, 'Selo'), startYear: year, career: id };
      q0.char29 = charDefaults29(q0);
      if (id === 'musician') q0.art29 = artDefaults29();
      const cfg = quickRunConfig27(q0);
      const ch = cfg.character!;
      expect(ch.name.trim().length).toBeGreaterThan(2);
      expect(ch.age).toBeGreaterThanOrEqual(AGE29_MIN);
      expect(ch.age).toBeLessThanOrEqual(AGE29_MAX);
      expect(['m', 'f']).toContain(ch.sex);
      expect(ch.look).toBeTruthy();
      if (id === 'musician') expect(ch.age).toBeLessThan(30);
      const s = createGame(buildRun27(cfg));
      expect(s.year).toBe(year);
      expect(playerPerson(s)?.name).toBe(ch.name.trim());
    }
  });
});

const t2 = (x: { pt: string }) => x.pt;
