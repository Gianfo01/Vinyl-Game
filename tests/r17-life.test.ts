// Rodada 17 (C) — vida pessoal: sexualidade por país/época (pessoas reais só com dado público), armário e
// exposição pelo pipeline de escândalo, traição com segredo como obrigação, divórcio com partilha e pensões,
// começar com filhos, filhos que crescem e mudam, retratos que envelhecem, aparência como jogo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { holdsOf } from '../src/sim/holds17';
import { advanceMonth } from '../src/sim/tick';
import { money } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { kidOf, temperOf } from '../src/sim/sys/kids17';
import { life } from '../src/sim/sys/life';
import { lookEffects17, diversity17 } from '../src/sim/sys/looks17';
import { confess, divorce17, divorceTerms, love17, startAffair } from '../src/sim/sys/love17';
import { ownerOf } from '../src/sim/sys/people/owner';
import { acceptance, comeOut, criminalized, marriageLegal, sexOf } from '../src/sim/sys/sex17';
import { ageLook } from '../src/ui/pixel/age17';
import { Rng } from '../src/core/rng';
import type { Act, GameState } from '../src/sim/types';

const npcAct = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.members.length >= 1).sort((a, b) => b.fame - a.fame)[0];
const char = (o: Record<string, unknown> = {}) => ({ name: 'Teste', age: 42, background: 'musician', ...o }) as never;

describe('r17 vida pessoal', () => {
  it('aceitação por país e época, lei e casamento igualitário', () => {
    expect(acceptance('USA', 1960)).toBeLessThan(0.15);
    expect(acceptance('GBR', 2020)).toBeGreaterThan(0.7);
    expect(acceptance('NGA', 2020)).toBeLessThan(0.1);
    expect(criminalized('RUS', 2015)).toBe(true);
    expect(criminalized('GBR', 1970)).toBe(false);
    expect(marriageLegal('BRA', 2012)).toBe(false);
    expect(marriageLegal('BRA', 2013)).toBe(true);
  });

  it('pessoas reais: só o documentado; o resto fica não declarado', () => {
    const s = createGame(defaultConfig('r17-life-real', { startYear: 1990, history: 'strict', mode: 'historic', realNames: true, realFates: true }));
    const a = npcAct(s);
    a.catalogNo = 999;
    const p = s.persons[a.members[0]];
    p.name = 'Fulano Sem Registro';
    expect(sexOf(s, p.id)).toMatchObject({ o: 'private', real: true });
    p.name = 'Elton John';
    expect(sexOf(s, p.id)).toMatchObject({ o: 'gay', c: 'out', real: true });
    p.name = 'Lil Nas X';
    expect(sexOf(s, p.id).o).toBe('private'); // em 1990 ainda não declarou
    // r18: história alternativa — quem não tem registro entra no sorteio; o documentado continua
    s.config.history = 'loose';
    p.name = 'Fulano Sem Registro';
    expect(sexOf(s, p.id).real).toBeFalsy();
    p.name = 'Elton John';
    expect(sexOf(s, p.id)).toMatchObject({ o: 'gay', c: 'out', real: true });
  });

  it('exposição: em época hostil vira escândalo pelo pipeline; em época acolhedora, apoio', () => {
    const queer = (s: GameState): [Act, string] => {
      for (const a of Object.values(s.acts)) for (const m of a.members) { const x = sexOf(s, m); if (!x.real && x.c === 'closet' && a.members.length <= 2 && s.persons[m]?.alive && !s.persons[m].isPlayer) return [a, m]; }
      throw new Error('ninguém no armário');
    };
    const s = createGame(defaultConfig('r17-life-out', { startYear: 1965 }));
    const [a, m] = queer(s);
    const n0 = a.scandals;
    comeOut(s, m, 'outed', 'Tabloide');
    expect(a.scandals).toBe(n0 + 1);
    expect(sexOf(s, m).c).toBe('out');
    // pessoa real nunca é exposta
    const r = npcAct(s); r.catalogNo = 998; const rn = r.scandals;
    comeOut(s, r.members[0], 'outed');
    expect(r.scandals).toBe(rn);
    const s2 = createGame(defaultConfig('r17-life-out2', { startYear: 2020 }));
    const [b, m2] = queer(s2);
    const m0 = b.scandals;
    comeOut(s2, m2, 'chose');
    expect(b.scandals).toBe(m0);
    expect(sexOf(s2, m2).c).toBe('out');
  });

  it('começar casado(a) com filhos; filhos crescem e mudam de temperamento', () => {
    const s = createGame(defaultConfig('r17-life-kids', { character: char({ kids: 3, marital: 'married' }) }));
    const o = ownerOf(s);
    expect(o.kids).toHaveLength(3);
    for (const k of o.kids) expect(s.year - k.born).toBeLessThanOrEqual(24);
    expect(life(s).partner?.stage).toBe('married');
    expect(love17(s).mw).toBeDefined();
    const k0 = o.kids[o.kids.length - 1];
    life(s).kidsX[o.kids.length - 1].bond = 5;
    const reb0 = kidOf(s, k0).reb;
    for (let i = 0; i < 13; i++) advanceMonth(s);
    expect(kidOf(s, k0).reb).toBeGreaterThan(reb0);
    expect(typeof temperOf(kidOf(s, k0))).toBe('string');
  });

  it('traição: amante guarda o segredo; confessar derruba a afinidade; divórcio partilha e cria pensões', () => {
    const s = createGame(defaultConfig('r17-life-love', { character: char({ kids: 2, marital: 'married' }) }));
    const L0 = life(s);
    L0.candidates = [{ id: 'cx', name: 'Pessoa X', born: s.year - 35, job: { pt: 'x', en: 'x' }, trait: 'zen', chemistry: 70 }];
    expect(startAffair(s, 'cx')).toBeNull();
    expect(holdsOf(s, 'player').owes.some((h) => h.src === 'love17' && h.kind === 'secret')).toBe(true);
    const a0 = L0.partner!.affinity;
    confess(s);
    expect(L0.partner!.affinity).toBeLessThan(a0);
    const o = ownerOf(s);
    o.wealth = money(s, 100000);
    love17(s).mw = s.week - 52 * 10;
    L0.used = 0;
    const T = divorceTerms(s, 'court');
    expect(T.alimony).toBeGreaterThan(0);
    const w0 = o.wealth;
    expect(divorce17(s, 'court', new Rng([1, 2, 3, 4]))).toBeNull();
    expect(L0.partner).toBeNull();
    expect(o.wealth).toBe(w0 - T.share - T.fees);
    expect(love17(s).pay.some((p) => p.kind === 'alimony')).toBe(true);
    expect(love17(s).pay.some((p) => p.kind === 'child')).toBe(true);
  });

  it('retrato envelhece mantendo o visual; aparência pesa por época', () => {
    const look = { body: 0, face: 1, skin: 2, hair: 5, hairColor: 1, outfit: 0, outfitColor: 2, glasses: false, hat: false, beard: true };
    expect(ageLook(look, 30, 'x')).toBe(look);
    const old = ageLook(look, 78, 'x', 'm');
    expect(old.ag).toBe(3);
    expect(old.skin).toBe(2);
    expect(old.face).toBe(1);
    const s = createGame(defaultConfig('r17-life-looks', { startYear: 2019 }));
    const a = npcAct(s);
    expect(Array.isArray(lookEffects17(s, a))).toBe(true);
    const s2 = createGame(defaultConfig('r17-life-looks2', { startYear: 1990 }));
    expect(diversity17(s2, npcAct(s2))).toBeNull();
  });
});
