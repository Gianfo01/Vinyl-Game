// Rodada 19 (cenas): quando as cenas rodam — resultado só depois da cerimônia, indicados oficiais, calendário real,
// ganchos por marca (não por semana), ids únicos e fila sem perdas, regionais/ao vivo corretos, volume e carreiras.
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { queueCutscene, runSimHooks } from '../src/sim/ext4';
import { remember, rngOf } from '../src/sim/util';
import { emitFact } from '../src/sim/facts17';
import { calOf19, awardExists19, honoredYear19 } from '../src/sim/awardcal19';
import { ceremonies19, winners19 } from '../src/sim/awards19';
import { isRegional19, yearlyAwards2 } from '../src/sim/awards2';
import { CEREMONY_MONTH, NOMS_MONTH, cer8, cycleYear } from '../src/sim/sys/ceremonies8';
import { LIVE19, MONTH_CAP19, gramoNight19, heldResults19, releaseHeld19, scn19 } from '../src/sim/sys/scenes19';
import { awardsYear, awardSpeech } from '../src/sim/sys/scenes/awards';
import { queueScene, sc } from '../src/sim/sys/scenes/state';
import { memoryWatch } from '../src/sim/sys/scenes/life';
import { awardBoard18, cine18 } from '../src/sim/sys/cine18';
import { relAdj18 } from '../src/sim/sys/awards18';
import { inboxKind18 } from '../src/sim/inbox18';
import { s17 } from '../src/sim/sys/scene17';
import { ventures } from '../src/sim/sys/ventures9';
import { hallOfFameYear } from '../src/sim/dynasty';
import type { Act, GameState, Release } from '../src/sim/types';

afterEach(() => { LIVE19.on = false; });
const game = (y = 1990, seed = 'scn19', role: 'label' | 'artist' | 'manager' = 'label') => createGame(defaultConfig(seed, { startYear: y, role }));
const npcAct = (s: GameState, fame = 40): Act => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame }); a.owner = Object.values(s.labels)[0].id; return a; };
const myAct = (s: GameState): Act => { const a = npcAct(s, 50); a.owner = 'player'; return a; };
let relN = 0;
/** Lançamento sintético (clona um existente) do ato `a` no ano `y`. */
function mkRel(s: GameState, a: Act, y: number, q = 70): Release {
  const base = Object.values(s.releases)[0];
  const r = { ...structuredClone(base), id: `t19r${++relN}`, actId: a.id, owner: a.owner === 'player' ? 'player' : String(a.owner), year: y, type: 'lp', totalUnits: 50000, hist: false, q, title: `Disco ${relN}` } as Release;
  s.releases[r.id] = r;
  a.releases.push(r.id);
  return r;
}
/** Indicados oficiais da categoria Álbum do ano homenageado `E`, já na noite de fevereiro de E+1. */
function night(s: GameState, rels: Release[]): number {
  const E = s.year;
  cer8(s).noms = { year: E, cats: { album: rels.map((r) => r.id) } };
  s.year = E + 1;
  s.month = CEREMONY_MONTH;
  return E;
}

describe('r19 cenas: 1. resultado só depois da cerimônia', () => {
  it('com a interface ligada, livro, avisos e cartões esperam a cena ser vista', () => {
    LIVE19.on = true;
    const s = game();
    const mine = mkRel(s, myAct(s), s.year, 99), other = mkRel(s, npcAct(s), s.year, 10);
    const n0 = s.notifications.length, a0 = s.awards.length;
    const E = night(s, [mine, other]);
    gramoNight19(s, rngOf(s));
    const cs = s.cutscenes.find((c) => c.kind === 'awards' && c.data.year === E)!;
    expect(cs).toBeTruthy();
    expect(heldResults19(s)).toBe(1);
    expect(s.awards.length).toBe(a0); // nada no livro (nem fatos, nem notícia) antes da cena
    expect(s.notifications.slice(n0).some((n) => /Gram[oó]fono/.test(n.text.pt))).toBe(false);
    releaseHeld19(s); // sem ter visto: continua guardado
    expect(heldResults19(s)).toBe(1);
    cs.seen = true;
    expect(releaseHeld19(s, cs.id)).toBe(1);
    expect(s.awards.some((a) => a.year === E && a.category === 'album')).toBe(true);
    expect(s.notifications.slice(n0).some((n) => /Gram[oó]fono/.test(n.text.pt))).toBe(true);
    expect(s.cutscenes.some((c) => c.kind === 'moment16' && /Premia/.test(String((c.data.title as { pt: string }).pt)))).toBe(false); // cerimônia já mostrou
  });
  it('sem interface (bot/teste) o resultado sai na hora, com aviso de derrota quando perde', () => {
    const s = game(1990, 'scn19b');
    const mine = mkRel(s, myAct(s), s.year, 1), other = mkRel(s, npcAct(s), s.year, 100);
    other.totalUnits = 5_000_000;
    const n0 = s.notifications.length;
    const E = night(s, [mine, other]);
    gramoNight19(s, rngOf(s));
    expect(heldResults19(s)).toBe(0);
    expect(s.awards.find((a) => a.year === E && a.category === 'album')?.releaseId).toBe(other.id);
    expect(s.notifications.slice(n0).some((n) => /perdeu/.test(n.text.pt))).toBe(true);
  });
});

describe('r19 cenas: 2. indicados oficiais', () => {
  it('a cena mostra exatamente a lista oficial e só existe com indicado seu', () => {
    const s = game(1990, 'scn19c');
    const rels = [mkRel(s, myAct(s), s.year), mkRel(s, npcAct(s), s.year), mkRel(s, npcAct(s), s.year)];
    const E = s.year;
    cer8(s).noms = { year: E, cats: { album: rels.map((r) => r.id) } };
    const cs = awardsYear(s, rngOf(s), E, [{ cat: 'album', releaseId: rels[1].id, actId: rels[1].actId }])!;
    const names = (cs.data.cats as { nominees: { name: string }[] }[])[0].nominees.map((n) => n.name).sort();
    expect(names).toEqual(rels.map((r) => `${s.acts[r.actId].name} — ${r.title}`).sort());
    expect(cs.data.won).toBe(0);
    expect(awardSpeech(s, rngOf(s), cs.id, 'team').pt).toMatch(/Só quem ganha/); // sem discurso de categoria perdida
    // sem indicado oficial seu: nenhuma cerimônia (mesmo que tenha ganho outro prêmio)
    const s2 = game(1990, 'scn19d');
    const r2 = [mkRel(s2, npcAct(s2), s2.year), mkRel(s2, npcAct(s2), s2.year)];
    cer8(s2).noms = { year: s2.year, cats: { album: r2.map((r) => r.id) } };
    s2.awards.push({ year: s2.year, category: 'live_act', name: 'x', byPlayer: true });
    expect(awardsYear(s2, rngOf(s2), s2.year, [{ cat: 'album', releaseId: r2[0].id }])).toBeNull();
  });
  it('papel empresário: indicado do cliente gera cerimônia; artista: a própria banda', () => {
    const s = game(1995, 'scn19e', 'manager');
    const c = npcAct(s);
    ventures(s).mg.clients.push({ actId: c.id } as never);
    const rel = mkRel(s, c, s.year);
    cer8(s).noms = { year: s.year, cats: { album: [rel.id, mkRel(s, npcAct(s), s.year).id] } };
    const cs = awardsYear(s, rngOf(s), s.year, [{ cat: 'album', releaseId: rel.id, actId: c.id }])!;
    expect(cs).toBeTruthy();
    expect(cs.data.won).toBe(1);
    const a = game(1995, 'scn19f', 'artist');
    const band = Object.values(a.acts).find((x) => x.playerBand)!;
    const br = mkRel(a, band, a.year);
    cer8(a).noms = { year: a.year, cats: { album: [br.id] } };
    expect(awardsYear(a, rngOf(a), a.year, [{ cat: 'album', releaseId: br.id }])).toBeTruthy();
  });
});

describe('r19 cenas: 3. calendário real', () => {
  it('ano de fundação e mês do dado; indicados em novembro, cerimônia em fevereiro', () => {
    expect([calOf19('record').start, calOf19('record').month, NOMS_MONTH, CEREMONY_MONTH]).toEqual([1959, 1, 10, 1]);
    expect(calOf19('euro_stage').start).toBe(1977);
    expect(calOf19('hall_echoes').start).toBe(1986);
    expect(awardExists19('album', 1925)).toBe(false);
    expect(honoredYear19(1980, 1)).toBe(1979);
    const s = game(1950, 'scn19g');
    expect(ceremonies19(s).find((c) => c.id === 'gramo')?.on).toBe(false);
    expect(ceremonies19(s).find((c) => c.id === 'euro_stage')?.on).toBe(false);
    s.month = 0;
    expect(cycleYear(s)).toBe(s.year - 1);
    // Hall dos Ecos antes de 1986: ninguém entra
    const n0 = s.hallOfFame.length;
    hallOfFameYear(s);
    expect(s.hallOfFame.length).toBe(n0);
    // Gramófonos antes de 1959: nada acontece na noite
    s.month = CEREMONY_MONTH;
    cer8(s).noms = { year: s.year - 1, cats: {} };
    gramoNight19(s, rngOf(s));
    expect(s.cutscenes.some((c) => c.kind === 'awards')).toBe(false);
  });
  it('figurino escolhido entre indicação e cerimônia: pesa pouco no voto (com porquê) e a cena não pede de novo', () => {
    const s = game(1990, 'scn19h');
    const mine = mkRel(s, myAct(s), s.year), other = mkRel(s, npcAct(s), s.year);
    cer8(s).noms = { year: s.year, cats: { album: [mine.id, other.id] } };
    s.month = NOMS_MONTH + 1;
    const before = relAdj18(s, mine).v;
    const msg = { ref: { y: s.year, act: mine.actId } } as never;
    inboxKind18('scn19_fit')!.handle!(s, msg, 'classic', rngOf(s));
    const adj = relAdj18(s, mine);
    expect(adj.v).not.toBe(before);
    expect(Math.abs(adj.v - before)).toBeLessThanOrEqual(2);
    expect(adj.why.some(([t]) => /Figurino/.test(t.pt))).toBe(true);
    expect(relAdj18(s, other).v).toBe(relAdj18(s, other).v); // só os seus
    const E = night(s, [mine, other]);
    gramoNight19(s, rngOf(s));
    const cs = s.cutscenes.find((c) => c.kind === 'awards' && c.data.year === E)!;
    expect(cine18(s).fit[`aw:${cs.id}`]).toBe('classic');
    const b = awardBoard18(s, { cs: cs.id, year: E, cats: cs.data.cats as never, won: Number(cs.data.won) });
    expect(b.frames.some((f) => f.slot === 'outfit')).toBe(false); // sem escolher depois de ver o envelope
  });
});

describe('r19 cenas: 4. ganchos por marca processada', () => {
  it('cerimônia entra na Cinemateca e casamento vira cena interativa dias depois', () => {
    const s = game(1990, 'scn19i');
    const mine = mkRel(s, myAct(s), s.year, 99);
    night(s, [mine, mkRel(s, npcAct(s), s.year)]);
    gramoNight19(s, rngOf(s));
    const cs = s.cutscenes.find((c) => c.kind === 'awards')!;
    queueCutscene(s, 'life', { title: { pt: 'Casamento', en: 'Wedding' }, kind: 'wedding', size: 'small' });
    s.week += 1; // o gancho semanal roda depois do fechamento do mês
    runSimHooks('week', s, rngOf(s));
    expect(cine18(s).log.some((x) => x.aw?.cs === cs.id)).toBe(true);
    expect(Object.values(s17(s).pend).some((p) => p.def === 'wedding17')).toBe(true);
  });
});

describe('r19 cenas: 5. ids únicos e fila sem perdas', () => {
  it('ids por contador; não vistas importantes ficam; vistas saem primeiro', () => {
    const s = game(1990, 'scn19j');
    s.cutscenes = [];
    for (let i = 0; i < 45; i++) queueCutscene(s, 'interview', { title: { pt: 'x', en: 'x' } });
    for (let i = 0; i < 10; i++) s.cutscenes[i].seen = true;
    for (let i = 0; i < 10; i++) queueCutscene(s, 'interview', { title: { pt: 'y', en: 'y' } });
    const ids = s.cutscenes.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.cutscenes.filter((c) => !c.seen).length).toBe(45); // nenhuma não vista perdida
    expect(s.cutscenes.every((c) => !c.seen)).toBe(true); // as vistas saíram primeiro
  });
});

describe('r19 cenas: 6. regionais e ato ao vivo', () => {
  it('ids reais dos regionais; ato ao vivo de quem não é seu não é seu', () => {
    expect(isRegional19('euro_stage')).toBe(true);
    expect(isRegional19('reg_na')).toBe(true);
    expect(isRegional19('critics')).toBe(false);
    const s = game(1990, 'scn19k');
    s.awards.push({ year: 1990, category: 'euro_stage', name: 'x', byPlayer: true });
    expect(winners19(s, { year: 1990 }).find((w) => w.cat === 'euro_stage')?.src).toBe('regional');
    const a = npcAct(s);
    const E = s.year;
    s.tours.push({ status: 'done', actId: a.id, stops: [{ status: 'played', day: Math.ceil((E - s.config.startYear) * 365.25) + 30, sold: 50000 }] } as never);
    s.year = E + 1; s.month = calOf19('live_act').month;
    yearlyAwards2(s, rngOf(s));
    const w = s.awards.find((x) => x.category === 'live_act' && x.year === E);
    expect(w?.actId).toBe(a.id);
    expect(w?.byPlayer).toBe(false);
  });
});

describe('r19 cenas: 7. volume', () => {
  it('Hall e velório de NPC não viram cena; de quem é próximo, sim; final de concurso de NPC fica fora do álbum', () => {
    const s = game(1995, 'scn19l');
    s.week = Math.max(s.week, 10);
    const npc = npcAct(s, 70), mine = myAct(s), former = npcAct(s, 40);
    mkRel(s, former, 1990).owner = 'player';
    s.cutscenes = [];
    remember(s, 'hall_of_fame', { pt: 'npc', en: 'npc' }, { actId: npc.id, important: true });
    remember(s, 'death', { pt: 'npc morre', en: 'npc dies' }, { actId: npc.id, important: true });
    memoryWatch(s, rngOf(s));
    expect(s.cutscenes.length).toBe(0);
    remember(s, 'hall_of_fame', { pt: 'meu', en: 'mine' }, { actId: mine.id, important: true });
    remember(s, 'death', { pt: 'ex-artista morre', en: 'former act dies' }, { actId: former.id });
    memoryWatch(s, rngOf(s));
    expect(s.cutscenes.map((c) => c.kind).sort()).toEqual(['farewell', 'hall']);
    const log0 = cine18(s).log.length;
    emitFact(s, { kind: 'contest_final', actors: [npc.id], severity: 40, visibility: 'public', tags: ['contest'], src: 'test', text: { pt: 'final', en: 'final' } });
    expect(cine18(s).log.length).toBe(log0);
  });
  it('veredito/eco (prioridade) passam do orçamento; picos de cenas menores são espalhados', () => {
    const s = game(1990, 'scn19m');
    sc(s).monthKey = s.year * 12 + s.month; sc(s).monthCount = 2;
    expect(queueScene(s, 'cine18', 'court', { title: { pt: 'v', en: 'v' } }, { minor: true })).toBeNull();
    expect(queueScene(s, 'cine18', 'court', { title: { pt: 'v', en: 'v' } }, { minor: true, prio: true })).toBeTruthy();
    s.cutscenes = [];
    const st = scn19(s); st.mk = -1;
    for (let i = 0; i < 12; i++) queueCutscene(s, 'factory', { title: { pt: 'f', en: 'f' } });
    expect(s.cutscenes.length).toBeLessThanOrEqual(MONTH_CAP19);
    expect(st.later.length).toBe(12 - s.cutscenes.length);
    s.month = (s.month + 1) % 12; if (s.month === 0) s.year++;
    s.week += 1;
    runSimHooks('week', s, rngOf(s));
    expect(st.later.length).toBe(12 - s.cutscenes.filter((c) => c.kind === 'factory').length);
    expect(s.cutscenes.filter((c) => c.kind === 'factory').length).toBeGreaterThan(MONTH_CAP19 - 1);
  });
});
