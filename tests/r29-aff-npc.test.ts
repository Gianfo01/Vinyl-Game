// R29c (Submundo) — facções × ARTISTAS DO MUNDO (sim/sys/aff29npc): as facções das cenas abordam também os atos NPC,
// o NPC decide pelos traços/selo/época/dinheiro, os desfechos passam pelos sistemas de sempre e aparecem no feed, na
// ficha do ato, no card da organização e na ficha do selo; o jogador age pelo menu do ato (denunciar / tirar do esquema)
// e na negociação. Regra (revista pelo autor): nos modos livres qualquer facção aborda qualquer ato da cena (real ou
// não); no modo "Vida real exata" artista real só com laço documentado. Determinismo.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { Rng } from '../src/core/rng';
import { evaluateOffer, defaultOffer } from '../src/sim/contracts';
import { buyoutPrice } from '../src/sim/contracts2';
import { recentFacts } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { affs29 } from '../src/sim/sys/aff29';
import {
  OFF29N, actLog29n, approach29n, approachBlock29n, decide29n, denounce29n, denounceBlock29n, docTieAct29n, labelLog29n, orgLog29n, peek29n,
  pressure29n, realAct29n, rescue29n, rescueBlock29n,
} from '../src/sim/sys/aff29npc';
import { crime17, orgById } from '../src/sim/sys/crime17';
import { labelRepParts28 } from '../src/sim/sys/labelrep28';
import { linksOfKey29, orgLinks29, resolveWho29 } from '../src/sim/sys/orglinks29';
import { ctxMenu27, type CtxEnv27 } from '../src/ui/ps/ctx27model';
import { monthlyDigest27 } from '../src/ui/sys/mundo27model';

type Hist = 'strict' | 'loose';
const game = (y: number, h: Hist = 'loose', seed = 'r29npc'): GameState => createGame(defaultConfig(`${seed}-${y}-${h}`, { startYear: y, scenario: 'established', realNames: true, history: h }));
const LUCKY = { chance: () => true, float: (a: number) => a, int: (a: number) => a, pick: <T>(x: T[]) => x[0] } as unknown as Rng;
const UNLUCKY = { chance: () => false, float: (a: number) => a, int: (a: number) => a, pick: <T>(x: T[]) => x[0] } as unknown as Rng;
const ENV: CtxEnv27 = { has: (f) => f !== 'songmarket' };
const ids = (s: GameState, id: string) => ctxMenu27(s, 'act', id, ENV)?.items.map((x) => x.id) ?? [];
const live = (s: GameState, a: Act) => a.status === 'active' && a.owner !== 'player' && !a.playerBand && !playerActs(s).includes(a.id);
let CUR: GameState | null = null;
/** CV ↔ funk no Rio (1999): afinidade e um ato NPC (inventado ou real) levado para a cena. */
function cvScene(s: GameState, real: boolean): { af: ReturnType<typeof affs29>[number]; a: Act } {
  CUR = s;
  const af = affs29(s).find((x) => x.o === 'cv')!;
  const a = Object.values(s.acts).find((x) => live(s, x) && realAct29n(s, x) === real)!;
  a.genre = 'funk_carioca'; a.city = 'rio';
  return { af, a };
}

describe('r29c — facções abordam artistas do mundo (aff29npc)', () => {
  it('no mundo, sem o jogador: atos NPC da cena são abordados, decidem de jeitos diferentes e ninguém do seu elenco entra', () => {
    const s = game(1975, 'loose', 'world');
    for (let i = 0; i < 12; i++) advanceMonth(s);
    const log = peek29n(s)?.log ?? [];
    expect(log.length).toBeGreaterThan(2);
    for (const e of log) {
      expect(playerActs(s)).not.toContain(e.a);
      expect(orgById(s, e.o)).toBeTruthy();
      expect(e.p).toBeGreaterThan(0);
    }
    // por organização/mês o teto segura o ritmo (no máximo 2 por mês por organização)
    const per: Record<string, number> = {};
    for (const e of log) { const k = `${e.o}|${e.y}|${e.w}`; per[k] = (per[k] ?? 0) + 1; }
    expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2);
    // fato com consumidor (feed do Mundo / labelrep28)
    expect(recentFacts(s, { kind: 'faction_approach', months: 12 }).length).toBeGreaterThan(0);
  }, 300000);

  it('decisão do NPC: selo (major × cena × sem selo), traços, dinheiro e fama mexem na chance', () => {
    const s = game(1999);
    const { af, a } = cvScene(s, false);
    const o = af.org;
    const major = Object.values(s.labels).find((x) => x.family === 'A')!;
    const scene = Object.values(s.labels).find((x) => x.family === 'B') ?? Object.values(s.labels).find((x) => x.family !== 'A')!;
    a.owner = null;
    const free = decide29n(s, a, o, af, 'baile').p;
    a.owner = major.id;
    const maj = decide29n(s, a, o, af, 'baile').p;
    a.owner = scene.id;
    const sc = decide29n(s, a, o, af, 'baile').p;
    expect(maj).toBeLessThan(sc);
    expect(maj).toBeLessThan(free);
    const lead = s.persons[a.leaderId ?? a.members[0]];
    const keep = lead.traits;
    lead.traits = ['street', 'rebel'];
    const rua = decide29n(s, a, o, af, 'homage').p;
    lead.traits = ['disciplined', 'spiritual'];
    const certinho = decide29n(s, a, o, af, 'homage').p;
    lead.traits = keep;
    expect(rua).toBeGreaterThan(certinho);
    const fame = a.fame; a.fame = 70;
    const famous = decide29n(s, a, o, af, 'baile').p; a.fame = 5;
    const small = decide29n(s, a, o, af, 'baile').p; a.fame = fame;
    expect(small).toBeGreaterThan(famous);
    expect(decide29n(s, a, o, af, 'baile').why.length).toBeGreaterThan(0);
  });

  it('desfechos pelos sistemas de sempre e visíveis: feed, ficha do ato, card da organização, selo, labelrep, menu', () => {
    const s = game(1999);
    const { af, a } = cvScene(s, false);
    const lb = Object.values(s.labels).find((x) => x.family === 'A' && x.active)!;
    a.owner = lb.id; lb.roster.push(a.id);
    const fame = a.fame;
    const e = approach29n(s, af, a, LUCKY, 'homage');
    expect(e.d).toBe('write');
    expect(e.out).toEqual(expect.arrayContaining(['tie', 'scandal']));
    expect(crime17(s).ties[a.id]).toBe('cv');                      // laço de rua de sempre (crimenpc17)
    expect(a.owner).toBeNull();                                     // a major dispensou
    expect(a.fame).toBeGreaterThan(fame);
    expect(recentFacts(s, { kind: 'scandal', actor: a.id, months: 1 }).length).toBeGreaterThan(0);
    expect(recentFacts(s, { kind: 'exit', actor: a.id, months: 1 }).length).toBeGreaterThan(0); // aff29npc (ou npc17, se o escândalo pesou)
    // ficha do ato, card e selo
    expect(actLog29n(s, a.id)[0].id).toBe(e.id);
    expect(orgLog29n(s, 'cv').some((x) => x.a === a.id)).toBe(true);
    expect(labelLog29n(s, lb.id).some((x) => x.a === a.id)).toBe(true);
    expect(labelRepParts28(s, lb.id).map((p) => p.k)).toContain('faction');
    // a ligação aparece nos dois lados (fonte única), sem rótulo de "simulado"/"documentado" na interface
    expect(linksOfKey29(s, a.id).some((x) => x.o === 'cv' && x.kind === 'assoc')).toBe(true);
    expect(orgLinks29(s, 'cv').some((x) => x.key === a.id)).toBe(true);
    // feed do Mundo (resumo do mês)
    expect(monthlyDigest27(s).items.some((x) => x.id.startsWith('f:') && x.title.pt === e.t.pt)).toBe(true);
    // menu de ações do ato: denunciar e tirar do esquema
    expect(ids(s, a.id)).toEqual(expect.arrayContaining(['mob.affden', 'mob.afffree']));
    // baile com batida: fato de prisão (cena de batida) e caso contra a facção
    const b = cvScene(game(1999, 'loose', 'raid'), false);
    const e2 = approach29n(CUR!, b.af, b.a, LUCKY, 'baile');
    expect(e2.out).toEqual(expect.arrayContaining(['cash', 'raid', 'case']));
    expect(crime17(CUR!).cases.some((c) => c.who === 'o:cv')).toBe(true);
    // recusa do pedágio: ameaça fora de cena, ato sob pressão
    const c = cvScene(game(1999, 'loose', 'toll'), false);
    const e3 = approach29n(CUR!, c.af, c.a, UNLUCKY, 'toll');
    expect(e3.d).toBe('refuse');
    expect(e3.out).toContain('threat');
    expect(pressure29n(CUR!, c.a.id)?.k).toBe('pr');
  });

  it('recusou o baile e outro topou: rixa de cena', () => {
    const s = game(1999, 'loose', 'feud');
    const { af, a } = cvScene(s, false);
    const b = Object.values(s.acts).find((x) => live(s, x) && x.id !== a.id && !x.catalogNo && x.owner !== 'player')!;
    b.genre = 'funk_carioca'; b.city = 'rio';
    approach29n(s, af, b, LUCKY, 'baile');
    const e = approach29n(s, af, a, UNLUCKY, 'baile');
    expect(e.out).toContain('feud');
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    expect(crime17(s).feud[key]).toBeGreaterThan(0);
  });

  it('ganchos do jogador: denunciar (escândalo, caso, a facção sabe) e tirar do esquema (favor, proposta e buyout)', () => {
    const s = game(1999, 'loose', 'hooks');
    s.player.cash = Math.max(s.player.cash, 5e8);
    const { af, a } = cvScene(s, false);
    expect(denounceBlock29n(s, a.id)).not.toBeNull(); // nada a denunciar sem abordagem
    a.owner = null;
    approach29n(s, af, a, LUCKY, 'homage');
    expect(denounceBlock29n(s, a.id)).toBeNull();
    const r = denounce29n(s, a.id);
    expect(r.text.pt.length).toBeGreaterThan(10);
    expect((peek29n(s)!.den[a.id])).toBe(s.week);
    expect(denounceBlock29n(s, a.id)).not.toBeNull(); // uma vez por ano
    // tirar do esquema: sai do laço, deve favor, proposta pesa mais
    const before = evaluateOffer(s, a, defaultOffer(s, a)).score;
    expect(rescueBlock29n(s, a.id)).toBeNull();
    const cash = s.player.cash;
    expect(rescue29n(s, a.id).ok).toBe(true);
    expect(s.player.cash).toBeLessThan(cash);
    expect(crime17(s).ties[a.id]).toBeUndefined();
    expect(pressure29n(s, a.id)?.k).toBe('res');
    expect(evaluateOffer(s, a, defaultOffer(s, a)).score).toBeGreaterThan(before);
    // buyout: ato com selo e sob pressão sai mais barato
    const t = cvScene(game(1999, 'loose', 'buy'), false);
    const w = CUR!;
    const signed = Object.values(w.acts).find((x) => live(w, x) && !realAct29n(w, x) && x.owner && x.contractId && w.contracts[x.contractId])!;
    signed.genre = 'funk_carioca'; signed.city = 'rio';
    const p0 = buyoutPrice(w, signed);
    approach29n(w, t.af, signed, UNLUCKY, 'toll');
    expect(buyoutPrice(w, signed)).toBeLessThan(p0);
  });

  it('regra (autor): no modo padrão ato REAL pode ser abordado por facção real; no modo exato, só com laço documentado', () => {
    // modo padrão (nomes reais, história livre): pode, e a ligação aparece como ligação
    const s = game(1999, 'loose', 'real');
    const { af, a } = cvScene(s, true);
    expect(realAct29n(s, a)).toBe(true);
    expect(af.org.real).toBe(true);
    expect(approachBlock29n(s, af.org, a)).toBeNull();
    approach29n(s, af, a, LUCKY, 'homage');
    expect(linksOfKey29(s, a.id).some((x) => x.o === 'cv')).toBe(true);
    // modo exato: o mesmo ato real não é abordado sem laço documentado
    const x = game(1999, 'strict', 'real');
    const r2 = cvScene(x, true);
    expect(docTieAct29n(x, 'cv', r2.a)).toBe(false);
    expect(approachBlock29n(x, r2.af.org, r2.a)).not.toBeNull();
    // …nem um ato inventado é barrado
    const f2 = cvScene(x, false);
    expect(approachBlock29n(x, f2.af.org, f2.a)).toBeNull();
    // com laço documentado (Frank Sinatra × Chicago Outfit, 1960), no modo exato pode
    const y = game(1965, 'strict', 'doc');
    const k = resolveWho29(y, 'Frank Sinatra')!;
    const sin = Object.values(y.acts).find((z) => z.members.includes(k.slice(2)) && z.status !== 'retired' && z.status !== 'split')!;
    expect(sin).toBeTruthy();
    expect(docTieAct29n(y, 'outfit', sin)).toBe(true);
    if (!playerActs(y).includes(sin.id)) expect(approachBlock29n(y, orgById(y, 'outfit')!, sin)).toBeNull();
    // varredura: mundo exato simulado — ninguém real abordado sem laço documentado
    const z = game(1975, 'strict', 'sweep');
    for (let i = 0; i < 8; i++) advanceMonth(z);
    for (const e of peek29n(z)?.log ?? []) {
      const act = z.acts[e.a];
      if (act && realAct29n(z, act)) expect(docTieAct29n(z, e.o, act), `${act.name} × ${e.o}`).toBe(true);
    }
    for (const ln of orgLinks29(z, 'outfit', true)) if (ln.sim && z.acts[ln.key] && realAct29n(z, z.acts[ln.key])) expect(docTieAct29n(z, 'outfit', z.acts[ln.key])).toBe(true);
  }, 300000);

  it('determinismo: mesma semente, mesmas abordagens; desligado, nenhum estado', () => {
    const run = (off = false) => {
      OFF29N.all = off;
      try {
        const s = game(1975, 'loose', 'det');
        for (let i = 0; i < 6; i++) advanceMonth(s);
        return JSON.stringify([peek29n(s) ?? null, Object.keys(crime17(s).feud).length]);
      } finally { OFF29N.all = false; }
    };
    const a = run(), b = run();
    expect(a).toBe(b);
    expect(JSON.parse(run(true))[0]).toBeNull();
  }, 300000);
});
