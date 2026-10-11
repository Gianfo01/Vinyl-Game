import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { personDies } from '../src/sim/dynasty';
import { explain18 } from '../src/sim/explain18';
import { factListeners19, recentFacts } from '../src/sim/facts17';
import { calendar19 } from '../src/sim/calendar19';
import { GEAR_META19 } from '../src/data/more19/wp_f';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { l } from '../src/data/world';
import { P } from '../src/sim/sys/people/state';
import { af19, arenaBlock19, buildArena19, est19, holder19, licMasters19, offer19, partnerHeirs19, residency19, suit19, answerSuit19 } from '../src/sim/sys/afterlife19';
import { buyMaker19, endorse19, g19, gearNow19, iconize19, inherit19, mainGear19, makers19, signature19 } from '../src/sim/sys/gear19';
import { block18, estate18, post18, start18 } from '../src/sim/sys/post18';
import { relics } from '../src/sim/sys/relics9';
import { sh18 } from '../src/sim/sys/shared18';
import { buildings18 } from '../src/sim/sys/campus18';
import type { Act, GameState, Release } from '../src/sim/types';

const kinds = (s: GameState, k: string) => recentFacts(s, { kind: k, months: 600 });
function setup(seed: string, year: number, solo = true): { s: GameState; a: Act; r: Rng } {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  s.config.history = 'loose';
  const a = Object.values(s.acts).find((x) => !x.catalogNo && !x.playerBand && x.owner !== 'player' && (solo ? x.members.length === 1 : x.members.length >= 2) && x.members.every((p) => s.persons[p]?.alive))!;
  a.fame = 70;
  acceptOffer(s, a, { ...defaultOffer(s, a), id: 'o-af', week: s.week, status: 'pending', advance: 0 });
  return { s, a, r: Rng.fromSeed(`${seed}|t`) };
}
function rel(s: GameState, a: Act, year: number): Release {
  const r: Release = { id: `raf-${a.id}-${year}`, actId: a.id, owner: 'player', type: 'single', title: `Faixa ${year}`, songs: a.songs.slice(0, 1), week: s.week, year, q: 70, appeal: 30,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 200000, revenue: 0, peak: 0, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: false };
  s.releases[r.id] = r; a.releases.push(r.id);
  return r;
}
const kill = (s: GameState, a: Act) => { for (const pid of [...a.members]) personDies(s, s.persons[pid], l('teste', 'test')); };

describe('r19 T3 afterlife19 — espólio como ator, 11.8, arena digital', () => {
  it('11.8: morte encerra o contrato; master do artista volta aos herdeiros; projeto de catálogo pede o espólio', () => {
    const { s, a } = setup('r19-af-118', 1995);
    const c = s.contracts[a.contractId!];
    c.rights = { ...(c.rights ?? { master: 'label', pubShare: 0, producerPts: 0, guestPts: 0, pointsFromLabel: false, scope: 'world', options: 0, exclusive: true, sync: true, reissue: true, remaster: true, license: true, reversionYears: 0, reversionNeedsRecoup: true }), master: 'artist' };
    const r1 = rel(s, a, 1995);
    const pid = a.members[0];
    kill(s, a);
    expect(c.endWeek).toBeLessThanOrEqual(s.week);
    expect(r1.owner).toBe('indie');
    const x = af19(s).e[pid];
    expect(x?.how).toBe('reverted');
    expect(x.held).toContain(r1.id);
    expect(kinds(s, 'estate_contract').length).toBe(1);
    expect(holder19(s, a)).toBe('estate');
    // caixa de colecionador agora precisa do espólio (não é mais "o selo é dono")
    s.year = 1998;
    const ask = explain18(s, 'af19.estate', { pid });
    expect(ask?.parts.length).toBeGreaterThan(2);
    expect(block18(s, pid, 'box')).toBeNull();
  });

  it('11.8: masters de selo rival bloqueiam o projeto até licenciar; sociedade passa ao herdeiro', () => {
    const { s, a } = setup('r19-af-lic', 2000);
    const lb = Object.values(s.labels).find((x) => x.active)!;
    const r1 = rel(s, a, 2000); r1.owner = lb.id;
    a.owner = lb.id; a.contractId = undefined;
    const pid = a.members[0];
    kill(s, a);
    s.year = 2003; s.player.cash = 1e10;
    expect(block18(s, pid, 'box')).toBeTruthy();
    expect(licMasters19(s, a.id)).toBeNull();
    expect(block18(s, pid, 'box')).toBeNull();
    // sócio que morre: a parte vai ao herdeiro (shared18)
    const b = Object.values(s.acts).find((x) => x.id !== a.id && !x.catalogNo && x.members.length && x.members.every((p) => s.persons[p]?.alive))!;
    const bp = b.members[0];
    sh18(s).v.push({ id: 'vx', kind: 'studio', name: 'Estúdio Sócio', pk: `p:${bp}`, pn: s.persons[bp].name, eq: 0.5, cash: 0, rep: 30, since: 2000, mood: 60, style: 'loyal', votes: [], prof: [], st: 'on', dead: 0, staff: 0 });
    personDies(s, s.persons[bp], l('teste', 'test'));
    expect(partnerHeirs19(s) + kinds(s, 'estate_partner').length).toBeGreaterThan(0);
    const v = sh18(s).v.find((x) => x.id === 'vx')!;
    expect(v.pn).not.toBe(s.persons[bp].name);
    expect(estate18(s, bp)?.heirs.some((h) => h.name === v.pn)).toBe(true);
  });

  it('E2: espólio processa, propõe projeto e tem calendário; arena digital com residência de morto', () => {
    const { s, a } = setup('r19-af-e2', 2021);
    rel(s, a, 2010);
    const pid = a.members[0];
    kill(s, a);
    s.player.cash = 1e11;
    const x = est19(s, pid)!;
    expect(x.exN.length).toBeGreaterThan(2);
    // proposta do espólio (inbox) e aceite com aval
    expect(offer19(s, pid)).toBe(true);
    expect(kinds(s, 'estate_offer').length).toBe(1);
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'af19_offer')).toBe(true);
    // processo pelos masters (o selo ficou com eles): caixa, calendário, sentença
    expect(holder19(s, a)).toBe('player');
    expect(suit19(s, pid, 'masters')).toBeTruthy();
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'af19_suit')).toBe(true);
    expect(calendar19(s, { weeks: 20 }).some((d) => d.id === `af19:suit:${pid}`)).toBe(true);
    expect(answerSuit19(s, pid, 'fight')).toBeTruthy();
    af19(s).e[pid].suit!.w = s.week;
    advanceMonth(s);
    expect(af19(s).e[pid].suit).toBeUndefined();
    expect(kinds(s, 'case_ruling').some((f) => f.tags.includes('estate'))).toBe(true);
    // arena: obra → abre → residência de avatares do morto (holograma + fato)
    expect(arenaBlock19(s)).toBeNull();
    expect(buildArena19(s)).toBeNull();
    expect(calendar19(s, { weeks: 120 }).some((d) => d.id === 'af19:arena')).toBe(true);
    af19(s).ar!.left = 1;
    advanceMonth(s);
    expect(af19(s).ar!.st).toBe('open');
    expect(kinds(s, 'arena_open').length).toBe(1);
    estate18(s, pid)!.wish = 'open'; estate18(s, pid)!.known = 1;
    post18(s).cd[pid] = 0;
    let ok: unknown = 'x';
    for (let i = 0; i < 12 && ok !== null; i++) { ok = residency19(s, a.id, 12, 'high'); post18(s).cd[pid] = 0; }
    expect(ok).toBeNull();
    expect(kinds(s, 'avatar_residency').length).toBe(1);
    expect(kinds(s, 'hologram').some((f) => f.tags.includes('arena'))).toBe(true);
    const g0 = s.player.cash;
    advanceMonth(s);
    expect(af19(s).ar!.res!.gross).toBeGreaterThan(0);
    expect(s.player.cash).not.toBe(g0);
    expect(explain18(s, 'af19.arena', {})?.parts.length).toBeGreaterThan(3);
    expect(buildings18(s).some((b) => b.id === 'af19arena')).toBe(true);
  });

  it('gear19: nada do futuro; endosso, assinatura e fabricante comprável', () => {
    const { s, a, r } = setup('r19-gear', 1985, false);
    for (const g of gearNow19(1960)) expect(g.from).toBeLessThanOrEqual(1960);
    const p = a.members.map((id) => s.persons[id]).find((x) => ['guitar', 'bass', 'drums', 'keys', 'vocal'].includes(x.role))!;
    const g = mainGear19(s, p.id)!;
    expect(g.from).toBeLessThanOrEqual(1985);
    expect(GEAR_META19[g.id]).toBeTruthy();
    const cash0 = s.player.cash;
    expect(endorse19(s, p.id)).toBeNull();
    expect(s.player.cash).toBeGreaterThan(cash0);
    expect(kinds(s, 'gear_endorse').length).toBe(1);
    expect(signature19(s, p.id, r, true)).toBeNull();
    expect(kinds(s, 'signature_model').length).toBe(1);
    const c1 = s.player.cash;
    advanceMonth(s);
    expect(g19(s).sig[p.id].units).toBeGreaterThan(0);
    expect(s.player.cash).not.toBe(c1);
    s.player.cash = 1e11;
    const mk = makers19(s)[0];
    expect(buyMaker19(s, mk.id)).toBeNull();
    expect(g19(s).mk[mk.id]).toBe(s.year);
  });

  it('cadeia 5: guitarra vira assinatura → artista morre → relíquia → leilão → herdeiros brigam → holograma/tributo oficial', () => {
    const { s, a, r } = setup('r19-chain5', 2015, false);
    const p = a.members.map((id) => s.persons[id]).find((x) => x.role === 'guitar') ?? s.persons[a.members[0]];
    if (p.role !== 'guitar') p.role = 'guitar';
    // família com guardião e quem quer faturar
    expect(endorse19(s, p.id)).toBeNull();
    expect(signature19(s, p.id, r, true)).toBeNull();
    a.number1s = 1;
    const rid = iconize19(s, p.id)!;
    expect(kinds(s, 'icon_instrument').length).toBe(1);
    const rl = relics(s).list.find((x) => x.id === rid)!;
    expect(rl.st).toBe('kept');
    const v0 = rl.v;
    kill(s, a);
    const e = estate18(s, p.id)!;
    // força a família dividida (guardião × faturar) e roda a herança de novo se preciso
    e.heirs = [{ name: 'Herdeira A', rel: l('filha', 'daughter'), st: 'cash' }, { name: 'Herdeiro B', rel: l('filho', 'son'), st: 'guard' }];
    rl.st = 'kept'; delete g19(s).seen[`inh:${p.id}`];
    expect(inherit19(s, p.id, r)).toBe('auction');
    expect(rl.st).toBe('auction');
    expect(rl.v).toBeGreaterThan(v0);
    expect(kinds(s, 'relic').some((f) => f.tags.includes('icon') && f.tags.includes('auction'))).toBe(true);
    const u0 = e.unity;
    // herdeiros brigam: processo entre eles (força) e união cai
    if (!af19(s).e[p.id]?.suit) suit19(s, p.id, 'relic');
    expect(kinds(s, 'estate_suit').length).toBeGreaterThanOrEqual(1);
    expect(e.unity).toBeLessThanOrEqual(u0);
    // depois da briga: tributo oficial (ou holograma) pelo espólio
    e.dispute = 0; af19(s).e[p.id].suit = undefined; post18(s).cd[p.id] = 0; s.player.cash = 1e11;
    s.year += 2;
    let res = start18(s, p.id, 'tribute', 'high', 'charity');
    for (let i = 0; i < 10 && !res.ok; i++) { post18(s).cd[p.id] = 0; res = start18(s, p.id, 'tribute', 'high', 'charity'); }
    expect(res.ok).toBe(true);
    expect(post18(s).proj.some((x) => x.pid === p.id && x.k === 'tribute')).toBe(true);
  });

  it('todo fato novo tem ouvinte com efeito', () => {
    const ids = factListeners19().map((x) => x.id);
    for (const id of ['af19:death', 'af19:contract', 'af19:suit', 'af19:offer', 'af19:partner', 'af19:arena', 'af19:residency', 'af19:award', 'af19:biopic', 'gear19:image', 'gear19:ledger', 'gear19:deals', 'gear19:relic', 'gear19:death']) expect(ids, id).toContain(id);
  });
});
