// R29 (FAMÍLIA) — vida familiar para todo personagem e estrelas mirins (src/sim/sys/family29.ts, docs/familia29.md).
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { applyWorld17, newRunConfig20 } from '../src/sim/start17';
import { ensureFamily } from '../src/sim/dynasty';
import { personLoad, monthIndex } from '../src/sim/capacity';
import { offerMods } from '../src/sim/ext4';
import { recentFacts } from '../src/sim/facts17';
import { mgrById } from '../src/data/managers14';
import { PRODUCERS } from '../src/sim/studio';
import { careerActs29 } from '../src/sim/sys/connect29';
import { kin15, kinOf15 } from '../src/sim/sys/kin15';
import { pressure16 } from '../src/sim/sys/lineup16';
import {
  ADULT29, CAP29, birth29, canInvent29, careerOf, debutNow29, divorce29, exploit29, fam29, famOf29, familyMonth29, industryKids29, isReal29,
  kinTags29, law29, lifeTick29, marry29, minorsMonth29, minorsYear29, pathFor29, searchKids29, spawnChildStar29,
} from '../src/sim/sys/family29';
import { genMgrs16 } from '../src/sim/sys/people16';
import { Rng } from '../src/core/rng';
import type { Act, GameState, Person } from '../src/sim/types';

const game = (seed: string, over: Parameters<typeof defaultConfig>[1] = {}) => createGame(defaultConfig(seed, { startYear: 1975, dbSize: 'small', ...over }));
const live = (a: Act) => a.status === 'active' || a.status === 'emerging';
/** artistas NPC gerados (não reais), vivos e adultos, em atos ativos */
function npcs(s: GameState, n = 4, band = false): { p: Person; a: Act }[] {
  const out: { p: Person; a: Act }[] = [];
  for (const a of Object.values(s.acts)) {
    if (!live(a) || a.owner === 'player' || a.catalogNo || (band && a.members.length < 3)) continue;
    for (const id of a.members) { const p = s.persons[id]; if (p?.alive && !p.real27 && s.year - p.born >= 22 && !out.some((x) => x.p.id === id)) out.push({ p, a }); }
    if (out.length >= n) break;
  }
  return out;
}

describe('R29 família — filhos da indústria seguem carreira', () => {
  it('filho de produtor/empresário/CEO vira pessoa do mundo: produtor, empresário e artista (nepotismo e laço com o pai/mãe)', () => {
    const s = game('fam29-ind');
    const m = genMgrs16(s).find((x) => x.from <= s.year && x.to >= s.year)!;
    const key = `e:${m.id}`;
    const F0 = ensureFamily(s, key);
    F0.kids.push({ id: 'kA', name: 'Ana Teste', born: s.year - 22, bond: 60, musical: 40 }, { id: 'kB', name: 'Bia Teste', born: s.year - 20, bond: 60, musical: 80 }, { id: 'kC', name: 'Caio Teste', born: s.year - 25, bond: 60, musical: 50 });
    const mgr = careerOf(s, key, F0.kids[0], 'manager')!;
    const art = careerOf(s, key, F0.kids[1], 'music')!;
    const prod = careerOf(s, key, F0.kids[2], 'producer')!;
    for (const p of [mgr, art, prod]) { expect(s.persons[p.id]).toBeTruthy(); expect(fam29(s).ip[p.id]).toBe(key); expect(famOf29(s, p.id).ipar).toBe(key); }
    expect(mgrById[`n17_${mgr.id}`]?.name).toBe('Ana Teste');
    expect(PRODUCERS.some((x) => x.id === `rp_x18_${prod.id}`)).toBe(true);
    const act = careerActs29(s, art.id)[0]?.act;
    expect(act?.members).toContain(art.id);
    expect(act?.name).toBe('Bia Teste'); // solo leva o nome do filho
    expect(industryKids29(s, key).filter((k) => k.pid).length).toBe(3);
    expect(recentFacts(s, { kind: 'nepo' }).length).toBeGreaterThanOrEqual(2);
    // o caminho segue o ramo do pai/mãe mais vezes que o acaso
    const share = (k: string, want: string) => Array.from({ length: 300 }, (_, i) => pathFor29(s, k, { id: `z${k}${i}`, musical: 40 })).filter((x) => x === want).length;
    expect(share('pd:xx', 'producer')).toBeGreaterThan(share('c:yy', 'producer') + 20);
    expect(share('c:yy', 'critic')).toBeGreaterThan(share('pd:xx', 'critic') + 20);
  });
});

describe('R29 família — artistas NPC: casamento, filhos, casal célebre e divórcio', () => {
  it('casal célebre: duas pessoas do mundo casam (laço no kin15, fato, fama), têm filho e a ficha concorda com o grafo', () => {
    const s = game('fam29-couple');
    const [x, y] = npcs(s, 2);
    const fame0 = x.a.fame;
    expect(marry29(s, x.p.id, y.p.id)).toBe(true);
    expect(kinOf15(s, x.p.id).find((k) => k.id === y.p.id)?.rel).toBe('spouse');
    expect(famOf29(s, x.p.id).partner?.pid).toBe(y.p.id);
    expect(famOf29(s, y.p.id).partner?.married).toBe(s.year);
    expect(x.a.fame).toBeGreaterThanOrEqual(fame0);
    expect(recentFacts(s, { kind: 'marriage' }).some((f) => f.actors.includes(x.p.id) && f.actors.includes(y.p.id))).toBe(true);
    expect(kinTags29(s, x.p.id).has('couple')).toBe(true);
    const k = birth29(s, x.p.id)!;
    expect(k[1]).toBe(x.p.id); expect(k[2]).toBe(y.p.id);
    expect(famOf29(s, y.p.id).kids.map((z) => z.id)).toContain(k[0]);
    expect(searchKids29(s, k[3].slice(0, 4).toLowerCase()).some((z) => z.name === k[3])).toBe(true);
    // estreia com herança (fama e fãs do pai/mãe), laço de sangue com OS DOIS e a carreira no connect29
    x.a.fame = 60; x.a.fans.casual = 200000;
    const kid = debutNow29(s, k[0])!;
    const ka = careerActs29(s, kid.id)[0].act;
    expect(ka.fame).toBeGreaterThan(5);
    expect(ka.fans.casual).toBeGreaterThan(3000);
    expect(kinOf15(s, kid.id).filter((z) => z.rel === 'parent').map((z) => z.id).sort()).toEqual([x.p.id, y.p.id].sort());
    expect(famOf29(s, x.p.id).kids.find((z) => z.id === k[0])?.pid).toBe(kid.id);
    expect(kinTags29(s, kid.id).has('nepo')).toBe(true);
    expect(recentFacts(s, { kind: 'family_debut' }).some((f) => f.actors.includes(kid.id))).toBe(true);
  });

  it('divórcio dentro da mesma banda vira rixa (pressão de saída do lineup16) ou racha a banda na hora', () => {
    let done = false;
    for (const seed of ['fam29-div', 'fam29-div2', 'fam29-div3']) {
      const s = game(seed);
      const a = Object.values(s.acts).find((x) => live(x) && x.owner !== 'player' && !x.catalogNo && x.members.length >= 3);
      if (!a) continue;
      const [p, q] = a.members.map((id) => s.persons[id]);
      expect(marry29(s, p.id, q.id)).toBe(true);
      const n0 = a.members.length;
      expect(divorce29(s, p.id)).toBe(true);
      expect(kinOf15(s, p.id).find((k) => k.id === q.id)?.rel).toBe('ex');
      const left = a.members.length < n0;
      const feud = kin15(s).feud[p.id < q.id ? `${p.id}|${q.id}` : `${q.id}|${p.id}`] !== undefined;
      expect(left || feud).toBe(true);
      if (!left) expect(pressure16(s, a, p).why).toBe('feud');
      expect(recentFacts(s, { kind: 'breakup' }).some((f) => f.tags.includes('divorce'))).toBe(true);
      done = true;
      break;
    }
    expect(done).toBe(true);
  });

  it('rodízio com teto: a vida acontece para NPCs (namoro, casamento, filhos) e só para quem pode', () => {
    const s = game('fam29-life');
    for (const { p } of npcs(s, 30)) for (let i = 0; i < 6; i++) lifeTick29(s, p.id, 48, `t${i}`);
    const st = fam29(s);
    expect(Object.values(st.f).filter((f) => f[3] === 2).length).toBeGreaterThan(3);
    expect(st.k.length).toBeGreaterThan(0);
    expect(CAP29).toBeGreaterThanOrEqual(30);
  });
});

describe('R29 família — estrelas mirins', () => {
  it('estrela mirim de 12+ tem responsável, fundo Coogan (EUA, 1939+), escola/limite de horas na agenda e o responsável pesa na proposta', () => {
    const s = game('fam29-kid', { startYear: 1985, homeCity: 'new_york' });
    const a = spawnChildStar29(s, Rng.fromSeed('fam29-kid|7'), 'kidgroup')!;
    expect(a).toBeTruthy();
    for (const id of a.members) { const p = s.persons[id]; expect(s.year - p.born).toBeGreaterThanOrEqual(12); expect(s.year - p.born).toBeLessThan(ADULT29); expect(fam29(s).min[id]?.g.length).toBeGreaterThan(0); }
    a.city = 'new_york'; a.owner = 'player';
    expect(law29('new_york', 1985)?.cc).toBe('USA');
    expect(law29('new_york', 1930)).toBeUndefined();
    const kid = a.members[0];
    const L = personLoad(s, kid, monthIndex(s));
    expect(L.parts.some((x) => /Escola/.test(x.label.pt))).toBe(true);
    const cash0 = s.player.cash;
    minorsMonth29(s);
    expect(fam29(s).min[kid].tr).toBeGreaterThan(0);
    expect(s.player.cash).toBeLessThan(cash0);
    const mod = offerMods().find((x) => x.id === 'family29')!.fn(s, a, {} as never);
    expect(mod?.delta).toBeLessThan(0);
    expect(mod?.reason?.pt).toMatch(/responsável/);
    expect(famOf29(s, kid).minor?.law?.cc).toBe('USA');
    expect(kinTags29(s, kid).has('minor')).toBe(true);
  });

  it('exploração: menor sobrecarregado no seu selo vira denúncia (fato, reputação, multa)', () => {
    const s = game('fam29-exp', { startYear: 1990, homeCity: 'los_angeles' });
    const a = spawnChildStar29(s, Rng.fromSeed('fam29-exp|3'), 'tv')!;
    a.owner = 'player'; a.city = 'los_angeles';
    const rep0 = s.player.reputation.artists;
    s.loadNow[a.id] = 140;
    for (let i = 0; i < 8 && !recentFacts(s, { kind: 'child_exploit' }).length; i++) { s.week += 1; minorsMonth29(s); }
    expect(recentFacts(s, { kind: 'child_exploit' }).length).toBeGreaterThan(0);
    expect(s.player.reputation.artists).toBeLessThan(rep0);
    // NPC: o selo rival que explora perde reputação
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const b = spawnChildStar29(s, Rng.fromSeed('fam29-exp|9'), 'contest')!;
    b.owner = lb.id;
    const r0 = lb.reputation;
    exploit29(s, b.members[0], lb.id);
    expect(lb.reputation).toBeLessThan(r0);
  });
});

describe('R29 família — estrela mirim real na formação inicial (lineup29)', () => {
  it('mundo alternativo de 1970: Michael Jackson (12) já existe e está num ato (antes esperava os 15), com o pai documentado como responsável', () => {
    const c = defaultConfig('fam29-j5', { startYear: 1970, dbSize: 'small' });
    applyWorld17(c, 'random'); c.lineup29 = 'famous'; c.dbSize = 'small';
    const s = createGame(c);
    const mj = Object.values(s.persons).find((p) => p.name === 'Michael Jackson')!;
    expect(mj).toBeTruthy();
    expect(s.year - mj.born).toBe(12);
    expect(Object.values(s.acts).some((a) => a.members.includes(mj.id))).toBe(true);
    minorsYear29(s);
    const m = fam29(s).min[mj.id];
    expect(m?.src).toBe('real');
    expect(m?.g).toMatch(/Joe Jackson|Jackson/);
    expect(famOf29(s, mj.id).minor).toBeTruthy();
  });
});

describe('R29 família — pessoas reais', () => {
  it('modo exato: nada de família inventada para gente real; mundo alternativo: simulada (marcada) e nunca contra o documentado', () => {
    const c = newRunConfig20({ seed: 'fam29-real', companyName: 'Selo' });
    applyWorld17(c, 'exact'); c.startYear = 1975; c.dbSize = 'small';
    const s = createGame(c);
    const reals = Object.values(s.persons).filter((p) => p.alive && s.year - p.born >= 20 && isReal29(s, p)).slice(0, 25);
    expect(reals.length).toBeGreaterThan(5);
    for (const p of reals) { expect(canInvent29(s, p).love).toBe(false); for (let i = 0; i < 4; i++) lifeTick29(s, p.id, 48, `r${i}`); }
    for (const p of reals) { expect(fam29(s).f[p.id]).toBeUndefined(); expect(fam29(s).k.some((k) => k[1] === p.id || k[2] === p.id)).toBe(false); }
    familyMonth29(s);
    for (const p of reals) expect(fam29(s).f[p.id]).toBeUndefined(); // a semeadura também não inventa
    // mundo alternativo com nomes reais: simulado para quem não tem família documentada; documentado fica intocado
    const c2 = newRunConfig20({ seed: 'fam29-real2', companyName: 'Selo' });
    applyWorld17(c2, 'random'); c2.startYear = 1975; c2.dbSize = 'small';
    const s2 = createGame(c2);
    const r2 = Object.values(s2.persons).filter((p) => p.alive && isReal29(s2, p));
    const doc = r2.find((p) => kinOf15(s2, p.id).some((k) => k.rel === 'spouse' || k.rel === 'ex'));
    if (doc) expect(canInvent29(s2, doc).love).toBe(false);
    const free = r2.find((p) => canInvent29(s2, p).love);
    expect(free).toBeTruthy();
    expect(canInvent29(s2, free!).sim).toBe(true);
  });
});

describe('R29 família — determinismo e fluxo próprio', () => {
  it('mesma semente = mesma família; o mês da família não mexe no Rng compartilhado', () => {
    const run = () => { const s = game('fam29-det'); for (let i = 0; i < 3; i++) { familyMonth29(s); s.month = (s.month + 1) % 12; } return s; };
    const a = run(), b = run();
    expect(JSON.stringify(fam29(a))).toBe(JSON.stringify(fam29(b)));
    const s = game('fam29-det2');
    const rng0 = JSON.stringify(s.rng);
    familyMonth29(s);
    expect(JSON.stringify(s.rng)).toBe(rng0);
  });
});
