// r27 AUD2 — sistemas soltos ligados: agiota × crime/segredos/obrigações, filhos × herança (e escolhas), cultura
// emergente, estresse que quebra, críticos com memória, choques macro no dinheiro e reações de fora para fatos que
// só o emissor ouvia. Determinismo: sorteios próprios; reações semeadas pelo conteúdo do fato (factSeedKey17).
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { l } from '../src/data/world';
import { countryOfCity } from '../src/data/geo';
import { subOfA3_18 } from '../src/data/regions18';
import { defaultConfig } from '../src/sim/bot';
import { relWith } from '../src/sim/criticrel';
import { applyMods, runDecisionListeners } from '../src/sim/ext4';
import { resolveDecision } from '../src/sim/events';
import { emitFact, factListeners19, recentFacts } from '../src/sim/facts17';
import { AUD2_27 } from '../src/sim/factmatrix19';
import { holds17 } from '../src/sim/holds17';
import { activeCritics } from '../src/sim/media';
import { RELIEF27 } from '../src/sim/relief27';
import { stress17 } from '../src/sim/stress17';
import type { Act, GameState } from '../src/sim/types';
import { money, playerActs } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { bolsa } from '../src/sim/sys/bolsa10';
import { cul19, setCulture19 } from '../src/sim/sys/culture19';
import { goods } from '../src/sim/sys/goods8';
import { heirCandidates } from '../src/sim/sys/heirs8';
import { kidOf } from '../src/sim/sys/kids17';
import { life } from '../src/sim/sys/life';
import { ownerOf } from '../src/sim/sys/people/owner';
import { P } from '../src/sim/sys/people/state';
import { sc27 } from '../src/sim/sys/scenes27';
import { sec23, secretsOf23 } from '../src/sim/sys/secrets23';
import { takeCompanyLoan, takePersonalLoan, vices } from '../src/sim/sys/vices';
import { _shark27, linkShark27, shark27 } from '../src/sim/sys/aud27/shark27';
import { bringKidIn27, cutOffKid27, heirStance27, payKidSchool27, reconcileKid27, supportBlock27 } from '../src/sim/sys/aud27/kin27';
import { actualCulture27, cul27, cultureMonth27 } from '../src/sim/sys/aud27/culture27';
import { breakChance27, burn27, burnoutMonth27, reliefContext27 } from '../src/sim/sys/aud27/burnout27';
import { critMonth27, reviewHistory27 } from '../src/sim/sys/aud27/critic27';
import { fxHit27, macro27 } from '../src/sim/sys/aud27/macro27';
import { warmScene27 } from '../src/sim/sys/aud27/reach27';

const game = (seed: string, startYear = 1985): GameState => createGame(defaultConfig(seed, { startYear }));
/** Um ato do jogador (assina um ato ativo de NPC se o começo não tem nenhum). */
function myAct(s: GameState): Act {
  const id = playerActs(s).find((x) => !s.acts[x].playerBand);
  if (id) return s.acts[id];
  const a = Object.values(s.acts).filter((x) => x.status === 'active' && x.members.length >= 2 && !x.rs).sort((x, y) => (x.id < y.id ? -1 : 1))[0];
  a.owner = 'player'; a.trust = 50;
  return a;
}
const npcAct = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status === 'active' && a.members.length).sort((a, b) => b.fame - a.fame)[0];
const ff = (s: GameState, kind: string) => recentFacts(s, { kind, months: 600 });

describe('r27 AUD2 — agiota ligado a crime, segredos e obrigações', () => {
  it('empréstimo de agiota do jogador vira segredo, dívida da organização e visita com escolhas', () => {
    const s = game('aud2-shark');
    expect(takePersonalLoan(s, 'shark', money(s, 5000))).toBeNull();
    expect(linkShark27(s)).toBe(1);
    expect(linkShark27(s)).toBe(0); // idempotente
    const id = vices(s).loans[0].id;
    const link = shark27(s).L[id];
    expect(link.o).not.toBe('');
    expect(secretsOf23(s, 'player').some((x) => x.kind === 'shark')).toBe(true);
    expect(holds17(s).h.some((h) => h.src === 'shark27' && h.kind === 'debt' && h.target === 'player' && h.holder === `o:${link.o}`)).toBe(true);
    // dois atrasos → visita
    const ln = vices(s).loans[0];
    for (let i = 0; i < 2; i++) { ln.missed += 1; s.week += 4; _shark27.playerMonth(s); }
    const d = s.decisions.find((x) => x.eventId === 'shark27_visit');
    expect(d).toBeTruthy();
    expect(d!.options.map((o) => o.id)).toEqual(['pay', 'favor', 'police', 'ignore']);
    // denunciar: a dívida some, vira informante, rancor forte e vingança armada
    expect(resolveDecision(s, d!.id, 'police')).toBe(true);
    expect(vices(s).loans.length).toBe(0);
    expect(shark27(s).L[id]).toBeUndefined();
    expect(secretsOf23(s, 'player').some((x) => x.kind === 'informant')).toBe(true);
    expect(secretsOf23(s, 'player').some((x) => x.kind === 'shark')).toBe(false);
    expect(holds17(s).h.some((h) => h.src === 'shark27' && h.kind === 'grievance' && h.strength >= 80)).toBe(true);
    expect(shark27(s).rev[link.o]).toBeGreaterThan(s.week);
  });

  it('quitar fecha o segredo; agiota da empresa também tem dono; pedir prazo dá favor à organização', () => {
    const s = game('aud2-shark2');
    takePersonalLoan(s, 'shark', money(s, 3000));
    expect(takeCompanyLoan(s, 'shark')).toBeNull();
    expect(linkShark27(s)).toBe(2);
    const [pl] = vices(s).loans;
    const co = s.player.loans.find((x) => vices(s).coLenders[x.id] === 'shark')!;
    expect(shark27(s).L[co.id].k).toBe('c');
    vices(s).loans = [];
    _shark27.playerMonth(s);
    expect(shark27(s).L[pl.id]).toBeUndefined();
    expect(sec23(s).own.find((x) => x.data?.loan === pl.id)?.end).toBe(s.week);
    // empresa no vermelho duas vezes → visita → prazo em troca de favor
    s.player.cash = -1000;
    for (let i = 0; i < 2; i++) { s.week += 4; _shark27.playerMonth(s); }
    const d = s.decisions.find((x) => x.eventId === 'shark27_visit')!;
    const bal = co.balance;
    resolveDecision(s, d.id, 'favor');
    expect(co.balance).toBeGreaterThan(bal);
    expect(holds17(s).h.some((h) => h.src === 'shark27' && h.kind === 'favor')).toBe(true);
    expect(secretsOf23(s, 'player').some((x) => x.kind === 'crime')).toBe(true);
  });

  it('NPCs: selos no vermelho pegam com a organização e sofrem cobrança; o segundo calote vira fachada', () => {
    const s = game('aud2-shark3', 1975);
    for (const lb of Object.values(s.labels)) lb.cash = -money(s, 50000);
    for (let i = 0; i < 30 && !Object.keys(shark27(s).npc).some((k) => k.startsWith('lb:')); i++) { s.week += 4; _shark27.npcMonth(s); }
    const key = Object.keys(shark27(s).npc).find((k) => k.startsWith('lb:'))!;
    expect(key).toBeTruthy();
    const sec = sec23(s).own.find((x) => x.subject === key && x.kind === 'shark')!;
    expect(sec).toBeTruthy();
    const lb = s.labels[key.slice(3)];
    lb.cash = -money(s, 50000);
    sec.since = s.week - 40;
    const cash0 = lb.cash;
    let i = 0;
    while (shark27(s).npc[key].miss < 1 && i < 200) { s.week += 14; _shark27.collect(s, sec, Rng.fromSeed(`t${i++}`)); }
    expect(lb.cash).toBeLessThan(cash0);
    expect(ff(s, 'crime').some((f) => f.tags.includes('shark') && f.actors.includes(lb.id))).toBe(true);
  });
});

describe('r27 AUD2 — filhos × herança e escolhas sobre os filhos', () => {
  const withKids = (s: GameState) => {
    const o = ownerOf(s);
    o.kids = [{ name: 'Ana', born: s.year - 22, aptitude: 60 }, { name: 'Beto', born: s.year - 20, aptitude: 50 }];
    life(s).kidsX = { 0: { edu: 'public', bond: 50 }, 1: { edu: 'public', bond: 50 } };
    ownerOf(s).wealth = money(s, 100000);
    return o;
  };
  const kidKeys = (s: GameState) => heirCandidates(s).filter((c) => c.rel === 'kid').map((c) => c.key);

  it('afastado e artista de selo rival não herdam como um filho próximo; quem trabalha no selo passa à frente', () => {
    const s = game('aud2-kin');
    withKids(s);
    expect(kidKeys(s)).toEqual(['kid:0', 'kid:1']);
    kidOf(s, ownerOf(s).kids[0]).path = 'estranged';
    expect(kidKeys(s)).toEqual(['kid:1']);
    life(s).kidsX[0].bond = 65; // fizeram as pazes
    expect(kidKeys(s)).toContain('kid:0');
    kidOf(s, ownerOf(s).kids[0]).path = 'rival';
    life(s).kidsX[0].bond = 50;
    expect(heirStance27(s, 0).skip).toBe(true);
    life(s).kidsX[0].bond = 75;
    expect(heirStance27(s, 0).skip).toBeFalsy();
    kidOf(s, ownerOf(s).kids[0]).path = 'other';
    life(s).kidsX[0].bond = 50;
    // o de aptidão menor entra na empresa e passa à frente na ordem
    expect(bringKidIn27(s, 1)).toBeNull();
    expect(kidOf(s, ownerOf(s).kids[1]).path).toBe('label');
    expect(kidKeys(s)[0]).toBe('kid:1');
    expect(heirCandidates(s).find((c) => c.key === 'kid:1')!.note).toBeTruthy();
  });

  it('pagar estudos, apoiar, deserdar e fazer as pazes', () => {
    const s = game('aud2-kin2');
    const o = withKids(s);
    const w0 = o.wealth, ap0 = o.kids[0].aptitude;
    expect(payKidSchool27(s, 0, 'college')).toBeNull();
    expect(o.kids[0].aptitude).toBe(ap0 + 5);
    expect(o.wealth).toBeLessThan(w0);
    expect(payKidSchool27(s, 0, 'conservatory')).not.toBeNull(); // uma vez só
    expect(supportBlock27(s, 0)).not.toBeNull(); // sem carreira artística
    kidOf(s, o.kids[0]).path = 'music';
    expect(supportBlock27(s, 0)).toBeNull();
    o.heir = 'kid:0';
    expect(cutOffKid27(s, 0)).toBeNull();
    expect(o.heir).toBeUndefined();
    expect(kidKeys(s)).not.toContain('kid:0');
    expect(life(s).kidsX[0].bond).toBeLessThan(20);
    life(s).kidsX[0].bond = 50;
    expect(reconcileKid27(s, 0)).toBeNull();
    expect(kidOf(s, o.kids[0]).path).toBe('other'); // vínculo 65 → deixa de ser afastado
    expect(kidKeys(s)).toContain('kid:0');
  });
});

describe('r27 AUD2 — cultura que emerge das decisões', () => {
  it('decisões generosas puxam "artista primeiro"; 3 meses dominando mudam a casa sem decreto (sem o choque de −6)', () => {
    const s = game('aud2-cul');
    for (let i = 0; i < 4; i++) runDecisionListeners(s, 'any_event', 'support_artist');
    expect(cul27(s).w.artist).toBeGreaterThan(4);
    expect(actualCulture27(s)).toBe('artist');
    const loy = () => s.player.staff.map((m) => P(s).career[m.id]?.loyalty ?? 0).join(',');
    const l0 = loy();
    for (let m = 0; m < 3; m++) { runDecisionListeners(s, 'any_event', 'support_artist'); s.week += 4; cultureMonth27(s); }
    expect(cul19(s).c).toBe('artist');
    expect(ff(s, 'culture_shift').some((f) => f.tags.includes('drift'))).toBe(true);
    expect(loy()).toBe(l0);
  });

  it('declarar outra cultura empurra devagar (recarga de 12 meses) e a distância cansa a equipe', () => {
    const s = game('aud2-cul2');
    if (!s.player.staff.length) s.player.staff.push({ id: 'stx', name: 'X', role: 'admin', skill: 40, salary: 100, hiredWeek: 0 } as never);
    for (const m of s.player.staff) (P(s).career[m.id] ??= { loyalty: 60 } as never).loyalty = 60;
    for (let i = 0; i < 8; i++) runDecisionListeners(s, 'any_event', 'support_artist');
    expect(setCulture19(s, 'profit')).toBeNull();
    expect(cul27(s).decl).toBe('profit');
    expect(cul27(s).w.profit).toBeGreaterThanOrEqual(3);
    s.week += 30;
    expect(setCulture19(s, 'chaos')).not.toBeNull(); // 12 meses
    for (let m = 0; m < 6; m++) { runDecisionListeners(s, 'any_event', 'support_artist'); runDecisionListeners(s, 'any_event', 'support_band'); s.week += 4; cultureMonth27(s); }
    expect(cul19(s).c).toBe('artist');
    expect(cul27(s).gap).toBeGreaterThan(0);
    const m0 = s.player.staff[0];
    expect(P(s).career[m0.id].loyalty).toBeLessThan(60);
  });
});

describe('r27 AUD2 — estresse que quebra de verdade', () => {
  it('portas novas: crise aguda e desgaste crônico', () => {
    expect(breakChance27(70, 10, 0.5).p).toBe(0);
    expect(breakChance27(85, 0, 0.5).k).toBe('acute');
    expect(breakChance27(60, 30, 0.5).k).toBe('chronic');
    expect(breakChance27(100, 0, 0.9).p).toBeGreaterThan(breakChance27(82, 0, 0.1).p);
  });

  it('artista no limite quebra (no máximo uma vez por ano); o dono esgotado recebe o cartão', () => {
    const s = game('aud2-burn');
    const a = myAct(s);
    const p = s.persons[a.members[0]];
    let i = 0;
    while (stress17(s).lb[p.id] !== s.year && i++ < 60) { p.stress = 100; p.fatigue = 100; p.morale = 0; s.week += 1; burnoutMonth27(s); }
    expect(stress17(s).lb[p.id]).toBe(s.year);
    expect(ff(s, 'breakdown').some((f) => f.actors.includes(p.id))).toBe(true);
    expect(burn27(s).n.acute + burn27(s).n.chronic).toBeGreaterThan(0);
    const o = ownerOf(s);
    i = 0;
    while (!s.decisions.some((d) => d.eventId === 'burnout27_owner') && i++ < 40) { o.stress = 95; s.week += 4; burnoutMonth27(s); }
    const d = s.decisions.find((x) => x.eventId === 'burnout27_owner')!;
    expect(d.options.map((x) => x.id)).toEqual(['rest', 'family', 'drink', 'push']);
    expect(ff(s, 'health').some((f) => f.tags.includes('owner'))).toBe(true);
    resolveDecision(s, d.id, 'rest');
    expect(o.stress).toBeLessThan(60);
  });

  it('gastar para aliviar tem contexto: as ações avisam e às vezes algo acontece', () => {
    const s = game('aud2-relief');
    expect(RELIEF27.length).toBeGreaterThan(0);
    const out = [];
    for (let w = 0; w < 40; w++) { s.week += 1; out.push(reliefContext27(s, 'drink', 18)); out.push(reliefContext27(s, 'trip', 20, 'paris')); }
    expect(out.filter(Boolean).length).toBeGreaterThan(3);
    expect(burn27(s).log.length).toBeGreaterThan(0);
  });
});

describe('r27 AUD2 — críticos com memória', () => {
  it('quem elogiou defende; jabá exposto afasta todos; editor da sua revista vira aliado; o tempo esfria', () => {
    const s = game('aud2-crit', 1990);
    const a = myAct(s);
    const cs = activeCritics(s);
    const [c1, c2] = cs;
    s.releases.rx = { id: 'rx', actId: a.id, owner: 'player', title: 'Teste', week: s.week } as never;
    a.releases.push('rx');
    s.reviews.rx = [{ critic: c1.name, outlet: c1.outlet, score: 9, quote: l('', '') }, { critic: c2.name, outlet: c2.outlet, score: 3, quote: l('', '') }];
    expect(reviewHistory27(s)).toBe(1);
    expect(reviewHistory27(s)).toBe(0);
    expect(relWith(s, c1.name)).toBeGreaterThan(0);
    expect(relWith(s, c2.name)).toBeLessThan(0);
    emitFact(s, { kind: 'critic_editor', actors: ['player'], severity: 30, text: l('editor', 'editor'), data: { c: c2.name, o: 'z1' } });
    expect(relWith(s, c2.name)).toBeGreaterThan(0);
    const r1 = relWith(s, c1.name);
    emitFact(s, { kind: 'payola', actors: ['player', a.id], severity: 55, visibility: 'public', tags: ['crime', 'payola'], text: l('jabá', 'payola') });
    expect(relWith(s, c1.name)).toBeLessThan(r1);
    const r2 = relWith(s, c2.name);
    critMonth27(s);
    expect(Math.abs(relWith(s, c2.name))).toBeLessThan(Math.abs(r2));
  });

  it('escândalo: quem reage sai do conteúdo do fato, não do id (um fato a mais antes não muda nada)', () => {
    const run = (extra: boolean) => {
      const s = game('aud2-crit2', 1990);
      const a = myAct(s);
      if (extra) emitFact(s, { kind: 'statement', actors: ['lbX'], severity: 10, text: l('x', 'x') });
      emitFact(s, { kind: 'scandal', actors: [a.id], severity: 50, text: l('escândalo', 'scandal') });
      return activeCritics(s).map((c) => relWith(s, c.name)).join(',');
    };
    expect(run(true)).toBe(run(false));
  });
});

describe('r27 AUD2 — choques macro no dinheiro', () => {
  it('juros sobem: empréstimos flutuantes, bolsa e fundos', () => {
    const s = game('aud2-macro', 1990);
    takeCompanyLoan(s, 'bank');
    const ln = s.player.loans[s.player.loans.length - 1];
    const r0 = ln.rate;
    bolsa(s).q.zz = { p: 10000, lv: 0, x: 0, hist: [10000], born: s.year, evY: s.year, chg: 0, base: 10000 };
    goods(s).inv.stocks = { principal: 100000, value: 100000 };
    emitFact(s, { kind: 'rate_shift', actors: ['market'], severity: 40, tags: ['money', 'rates', 'up'], text: l('juros', 'rates'), data: { r: 9, d: 3 } });
    // R28: a taxa nova é arredondada a 4 casas; com o mundo da F3 a taxa inicial deixou de ser "redonda" (0,12267)
    expect(ln.rate).toBeCloseTo(r0 + 0.012, 3);
    expect(bolsa(s).q.zz.p).toBeLessThan(10000);
    expect(goods(s).inv.stocks!.value).toBeLessThan(100000);
    expect(macro27(s).log.length).toBe(1);
  });

  it('crise cambial: estrada mais cara no submercado por 12 meses', () => {
    const s = game('aud2-fx', 1990);
    const a = myAct(s);
    const sub = subOfA3_18(countryOfCity(a.city))!;
    expect(sub).toBeTruthy();
    const v0 = applyMods(s, 'showRevenue', 1000, { act: a, cityId: a.city }).value;
    emitFact(s, { kind: 'fx_crisis', actors: ['player'], severity: 50, tags: ['fx', 'bad', sub], text: l('crise', 'crisis') });
    expect(fxHit27(s, a.city)).toBe(true);
    expect(applyMods(s, 'showRevenue', 1000, { act: a, cityId: a.city }).value).toBeLessThan(v0);
    expect(macro27(s).fx[sub]).toBe(s.week + 52);
  });
});

describe('r27 AUD2 — reações de fora para fatos que só o emissor ouvia', () => {
  const KINDS = ['tribute_born', 'tribute_licensed', 'tribute_sued', 'cert_award', 'cowrite_split', 'zine_founded', 'ghost_band', 'contest_winner', 'judge_feud', 'choir_alumni', 'legend', 'revival_hit', 'catalog_rerelease', 'critic_editor', 'conflict_interest', 'rate_shift', 'fx_crisis', 'bond_default'];
  it('os tipos mais frequentes têm ouvinte fora do sistema que emite', () => {
    const ls = factListeners19();
    for (const k of KINDS) expect(ls.some((x) => x.kind === k && /^(reach27|critic27|macro27):/.test(x.id)), k).toBe(true);
    // documentado na matriz (factmatrix19.AUD2_27) e cada consumidor declarado existe no barramento
    for (const [k, to] of Object.entries(AUD2_27)) for (const c of to) expect(ls.some((x) => x.kind === k && x.id === c.split(' ')[0]), `${k} ${c}`).toBe(true);
  });
  it('tributo, certificado, divisão de autoria e fanzine mexem em fãs, confiança, banda e cena', () => {
    const s = game('aud2-reach', 1990);
    const a = myAct(s), n = npcAct(s);
    const c0 = n.fans.casual;
    emitFact(s, { kind: 'tribute_born', actors: [n.id], severity: 30, text: l('tributo', 'tribute') });
    expect(n.fans.casual).toBeGreaterThan(c0);
    const t0 = a.trust;
    emitFact(s, { kind: 'cert_award', actors: [a.id, 'player'], severity: 40, text: l('ouro', 'gold'), data: { rel: 'x', mk: 'na', n: 1 } });
    expect(a.trust).toBe(Math.min(100, t0 + 2));
    if (a.members.length >= 2) {
      const other = s.persons[a.members[1]];
      other.resentment = 10;
      const r0 = other.resentment;
      emitFact(s, { kind: 'cowrite_split', actors: [a.id, a.members[0]], severity: 10, tags: ['songwriting', 'split', 'lead'], text: l('split', 'split') });
      expect(other.resentment).toBeGreaterThan(r0);
    }
    const sc = { id: 'tsc', name: l('Cena', 'Scene'), genre: a.genre, gs: [a.genre], city: a.city, venue: '', founders: [], w0: 0, y0: s.year, src: 'local', ph: 'growing', heat: 40, sat: 0, phW: 0, cities: [{ c: a.city, y: s.year, why: l('', '') }], log: [] };
    sc27(s).list.push(sc as never);
    emitFact(s, { kind: 'zine_founded', actors: [], place: a.city, severity: 20, tags: ['zines19', 'press', a.genre], text: l('zine', 'zine'), data: { z: 'z', g: a.genre } });
    expect(sc.heat).toBeGreaterThan(40);
    expect(warmScene27(s, a.city, a.genre, 1, l('t', 't'))).toBe(1);
  });
});

describe('r27 AUD2 — determinismo', () => {
  it('mesma semente, mesmos estados novos depois de meses de jogo', async () => {
    const { advanceMonth } = await import('../src/sim/tick');
    const { botMonth } = await import('../src/sim/bot');
    const run = () => {
      const s = game('aud2-det', 1975);
      for (let m = 0; m < 4; m++) { botMonth(s); advanceMonth(s); }
      const x = s.x4 as unknown as Record<string, unknown>;
      return JSON.stringify([x.shark27, x.cul27, x.burn27, x.crit27, x.macro27, x.kin27, s.player.cash]);
    };
    expect(run()).toBe(run());
  });
});
