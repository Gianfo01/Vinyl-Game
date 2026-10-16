// R31 · onda 3 (CAR) — carreiras que mudam o mundo. Para cada carreira: a decisão muda o mundo de forma MEDIDA
// (partida gêmea com e sem a decisão, mesma semente), determinismo, e explorar (telas, modelos, previsões) não muda nada.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { applyMods, runSimHooks } from '../src/sim/ext4';
import { Rng, clamp } from '../src/core/rng';
import { c12 } from '../src/sim/sys/manager12';
import { countryOfCity } from '../src/data/geo';
import { setSw } from '../src/sim/r31/switches';
import { calendar19 } from '../src/sim/calendar19';
import { recentFacts } from '../src/sim/facts17';
import { setMode31 } from '../src/sim/deleg31';
import { boost31, car31, conflict31, exec31, ledger31, unitsMult31, type Exec31 } from '../src/sim/sys/car31';
import { board } from '../src/sim/sys/charts7';
import { addGrid31, answerJaba31, cands31, lawRisk31, mediaVentures31, power31, stRo31, setFmt31, fmtsFor31, slotsOf31, used31, BET_FAME31 } from '../src/sim/sys/car31media';
import { addList31, cands31p, platRo31, platVentures31, subsShare31 } from '../src/sim/sys/car31plat';
import { setOpener31, stageRo31, venueNow31 } from '../src/sim/sys/car31stage';
import { askFor31, askLock31, moreRo31, setTarget31, yearList31 } from '../src/sim/sys/car31more';
import { CARS31, DEF31, progRo31, progView31, tierOf31 } from '../src/sim/sys/car31prog';
import { f16 } from '../src/sim/sys/fame16';
import { FEST31 } from '../src/sim/sys/fest12';
import { SCREEN31 } from '../src/sim/sys/screen18';
import { foundVenture, routeTour, ventures } from '../src/sim/sys/ventures9';
import { buyVenue } from '../src/sim/sys/live/venue';
import { addNight12 } from '../src/sim/sys/venue12';
import { careers } from '../src/sim/sys/careers12';
import { runEdit, setEditorOn } from '../src/sim/r31/editor';
import type { Act, GameState, Release } from '../src/sim/types';

const mk = (seed: string, year: number): GameState => { const s = createGame(defaultConfig(seed, { startYear: year })); s.player.cash += 5_000_000_000; return s; };
const months = (s: GameState, n: number) => { for (let i = 0; i < n; i++) advanceMonth(s); };
const units = (s: GameState, ids: string[]) => ids.reduce((t, id) => t + (s.releases[id]?.totalUnits ?? 0), 0);
const dev = (s: GameState, actId: string, a3: string) => f16(s).d[actId]?.[a3] ?? 0;
const npcRel = (s: GameState, n = 1): Release[] => Object.values(s.releases).filter((r) => r.live && s.acts[r.actId] && s.acts[r.actId].owner !== 'player' && !s.acts[r.actId].playerBand && s.week - r.week <= 10).sort((a, b) => b.appeal - a.appeal || (a.id < b.id ? -1 : 1)).slice(0, n);
const radio = (s: GameState) => { expect(foundVenture(s, 'media', 'label', { media: 'radio', city: s.config.homeCity })).toBeNull(); return mediaVentures31(s)[0]; };
const fillGrid = (s: GameState) => { const v = mediaVentures31(s)[0]; const rels = cands31(s, v, 30).filter((r) => s.acts[r.actId].owner !== 'player'); let i = 0; for (const r of rels) { const rot = i < 4 ? 'heavy' : i < 10 ? 'mid' : 'light'; if (!addGrid31(s, v.id, r.id, rot)) i++; if (i >= 14) break; } return stRo31(s, v).grid.map((x) => x.rel); };

describe('R31 CAR · peça comum (função única de execução)', () => {
  it('execução vira unidades e peso no país; o seu selo vale a fração do conflito; artistas de fora só com car31.others', () => {
    const s = mk('car-core', 1975);
    const npc = npcRel(s)[0];
    const a3 = countryOfCity(s.acts[npc.actId].city) ?? 'USA';
    expect(unitsMult31(s, npc.id)).toBe(1);
    boost31(s, { rel: npc.id, act: npc.actId, a3, w: 0.5, u: s.week + 4, src: 'radio', by: 'test' });
    const k = unitsMult31(s, npc.id);
    expect(k).toBeGreaterThan(1);
    expect(applyMods(s, 'chartUnits', 1000, { release: npc }).value).toBeGreaterThan(1000);
    // conflito de interesse: a mesma execução para um ato seu vale car31.conflict
    const out: Exec31[] = [];
    const mine = Object.values(s.acts).find((a) => a.id !== npc.actId && a.status !== 'retired')!;
    mine.owner = 'player'; // um ato seu (teste)
    exec31(s, { push: (e) => out.push(e) }, { act: mine.id, a3, w: 1, src: 'radio', by: 't' });
    expect(out[0].w).toBeCloseTo(conflict31(s));
    // car31.others desligado: o ato de fora sai do livro
    setSw(s, 'car31.others', false);
    expect(unitsMult31(s, npc.id)).toBe(1);
    setSw(s, 'car31.charts', false); setSw(s, 'car31.others', true);
    expect(unitsMult31(s, npc.id)).toBe(1);
  });
});

describe('R31 CAR · rádio (grade, audiência, ibope, jabá, diretor de programação)', () => {
  it('a grade muda o mundo: as faixas tocadas vendem mais no país e o artista ganha fama lá (gêmeas, só o interruptor muda)', () => {
    // as três partidas têm a mesma rádio e a mesma grade; só o efeito no mundo muda (car31.charts / car31.fame)
    const A = mk('car-radio', 1976), B = mk('car-radio', 1976), C = mk('car-radio', 1976);
    for (const s of [A, B, C]) radio(s);
    const ids = fillGrid(A); fillGrid(B); fillGrid(C);
    expect(ids.length).toBeGreaterThan(8);
    expect(JSON.stringify(stRo31(A, mediaVentures31(A)[0]).grid)).toBe(JSON.stringify(stRo31(B, mediaVentures31(B)[0]).grid));
    setSw(B, 'car31.charts', false);
    setSw(C, 'car31.fame', false);
    const v = mediaVentures31(A)[0];
    const a3 = countryOfCity(v.city)!;
    const u0 = units(A, ids);
    months(A, 3); months(B, 3); months(C, 3); // a audiência sobe mês a mês até o alvo
    const inCountry = (s: GameState) => ['songs', 'albums'].reduce((t, k) => t + board(s, a3, k as 'songs').filter((r) => ids.includes(r.relId)).reduce((x, r) => x + r.u, 0), 0);
    expect(inCountry(A)).toBeGreaterThan(inCountry(B) * 1.1); // medido: parada do país da rádio
    expect(units(A, ids) - u0).toBeGreaterThan(units(B, ids) - u0); // e no total
    const acts = [...new Set(ids.map((id) => A.releases[id].actId))];
    const dA = acts.reduce((t, id) => t + dev(A, id, a3), 0), dC = acts.reduce((t, id) => t + dev(C, id, a3), 0);
    expect(dA).toBeGreaterThan(dC + 1); // fama local no país da rádio
    expect(stRo31(A, v).share).toBeGreaterThan(0.05);
    expect(stRo31(A, v).ib.length).toBeGreaterThan(0); // ibope trimestral
    expect(recentFacts(A, { kinds: ['ibope'] }).length).toBeGreaterThan(0);
  });

  it('grade cheia ganha audiência de quem não monta a grade (mesma rádio)', () => {
    const A = mk('car-share', 1976), B = mk('car-share', 1976);
    radio(A); radio(B); fillGrid(A);
    months(A, 3); months(B, 3);
    expect(stRo31(A, mediaVentures31(A)[0]).share).toBeGreaterThan(stRo31(B, mediaVentures31(B)[0]).share * 1.5);
  });

  it('aposta é só para artista novo; formato da época; jabá esquenta o risco legal por país e época', () => {
    const s = mk('car-jaba', 1978);
    const v = radio(s);
    const famous = cands31(s, v, 60).find((r) => s.acts[r.actId].fame >= BET_FAME31)!;
    expect(addGrid31(s, v.id, famous.id, 'bet')).not.toBeNull();
    expect(fmtsFor31(s, v)).toContain('top40');
    expect(setFmt31(s, v.id, 'college')).toBeNull();
    expect(slotsOf31(stRo31(s, v)).light).toBe(14);
    expect(slotsOf31(stRo31(s, v)).heavy).toBe(0); // universitária: quase só leve e aposta
    expect(setFmt31(s, v.id, 'top40')).toBeNull();
    expect(lawRisk31('USA', 1965)).toBeGreaterThan(lawRisk31('USA', 1955));
    expect(lawRisk31('BRA', 1990)).toBeLessThan(lawRisk31('USA', 1990));
    const st = stRo31(s, v);
    st.offers.push({ id: 'jt', rel: npcRel(s)[0].id, lab: s.acts[npcRel(s)[0].actId].owner!, amt: 100000, u: s.week + 4 });
    const cash = s.player.cash;
    expect(answerJaba31(s, v.id, 'jt', true)).toBeNull();
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(stRo31(s, v).heat).toBeGreaterThan(0);
    expect(stRo31(s, v).grid.some((x) => x.jab && x.rot === 'heavy')).toBe(true);
  });

  it('diretor de programação delegado monta a grade sozinho; determinístico', () => {
    const run = () => { const s = mk('car-pd', 1980); radio(s); setMode31(s, 'radio', 'rule'); months(s, 3); return s; };
    const a = run(), b = run();
    const va = mediaVentures31(a)[0];
    expect(stRo31(a, va).grid.length).toBeGreaterThan(5);
    expect(JSON.stringify(a.x4.car31m)).toBe(JSON.stringify(b.x4.car31m));
    expect(JSON.stringify(Object.values(a.releases).map((r) => r.totalUnits))).toBe(JSON.stringify(Object.values(b.releases).map((r) => r.totalUnits)));
    expect(used31(stRo31(a, va), 'heavy')).toBeLessThanOrEqual(slotsOf31(stRo31(a, va)).heavy);
  });

  it('car31.media desligado: a rádio não expõe nada (o resto do jogo segue)', () => {
    const s = mk('car-off', 1976);
    radio(s); fillGrid(s);
    expect(ledger31(s).src.get('radio') ?? 0).toBeGreaterThan(0);
    setSw(s, 'car31.media', false);
    expect(ledger31(s).src.get('radio') ?? 0).toBe(0);
  });
});

describe('R31 CAR · plataforma (playlists com vagas)', () => {
  it('playlist da casa vira streams no país dos assinantes (gêmeas)', () => {
    const A = mk('car-plat', 2016), B = mk('car-plat', 2016);
    for (const s of [A, B]) { expect(foundVenture(s, 'platform', 'label', { city: s.config.homeCity })).toBeNull(); platVentures31(s)[0].subs = 8_000_000; }
    const v = platVentures31(A)[0];
    const pick = cands31p(A, 30).filter((r) => A.acts[r.actId].owner !== 'player').slice(0, 15);
    pick.forEach((r, i) => expect(addList31(A, v.id, 'top', r.id, i)).toBeNull());
    expect(subsShare31(A, v).length).toBeGreaterThan(0);
    expect(ledger31(A).src.get('platform') ?? 0).toBeGreaterThan(0);
    const ids = pick.map((r) => r.id);
    const u0 = units(A, ids);
    months(A, 2); months(B, 2);
    expect(units(A, ids) - u0).toBeGreaterThan((units(B, ids) - u0) * 1.01);
    expect(platRo31(A, v.id).lists.top.length).toBeGreaterThan(0);
  });
});

describe('R31 CAR · casa de shows e festival', () => {
  it('noite na casa marca o show na cidade e dá fama local a quem fecha e a quem abre', () => {
    const s = mk('car-venue', 1975);
    const v = buyVenue(s, 'club', s.config.homeCity, 'Casa Teste');
    expect(typeof v === 'object' && 'kind' in v).toBe(true);
    const locals = Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split').sort((a, b) => a.fame - b.fame || (a.id < b.id ? -1 : 1));
    const head = locals[locals.length - 1], op = locals[0];
    expect(addNight12(s, { k: 'original', day: 'fri', deal: 'door', actId: head.id })).toBeNull();
    advanceMonth(s);
    const n = venueNow31(s)!.x.prog[0];
    expect(setOpener31(s, n.id, op.id)).toBeNull();
    expect(setOpener31(s, n.id, head.id)).not.toBeNull(); // quem fecha não abre
    const a3 = venueNow31(s)!.a3;
    expect(ledger31(s).act.get(head.id)?.get(a3) ?? 0).toBeGreaterThan(0);
    expect(ledger31(s).act.get(op.id)?.get(a3) ?? 0).toBeGreaterThan(0);
    const p0 = stageRo31(s).pres;
    advanceMonth(s); advanceMonth(s);
    expect(s.flags[`played:${head.id}:${s.config.homeCity}`]).toBeGreaterThan(0);
    expect(s.flags[`played:${op.id}:${s.config.homeCity}`]).toBeGreaterThan(0);
    if (op.fame < 30) expect(stageRo31(s).pres).toBeGreaterThan(p0); // abrir com artista novo dá prestígio
  });

  it('festival: posição no cartaz e nota viram fama no país; a revelação ganha empurrão nas paradas', () => {
    const s = mk('car-fest', 1975);
    const acts = Object.values(s.acts).filter((a) => a.owner !== 'player' && a.status !== 'retired' && a.status !== 'split').sort((a, b) => a.fame - b.fame || (a.id < b.id ? -1 : 1));
    const big = acts[acts.length - 1];
    const small = acts.find((a) => a.fame < 40)!;
    // a revelação com disco em circulação recebe o empurrão nas paradas
    const live = Object.values(s.releases).find((r) => r.live && r.actId === big.id)!;
    const sm = { ...live, id: 'relsmall', actId: small.id } as Release;
    s.releases[sm.id] = sm; small.releases.push(sm.id);
    const f = { id: 'ftest', cityId: s.config.homeCity, name: 'Festival Teste' } as unknown as Parameters<NonNullable<typeof FEST31.after>>[1];
    FEST31.after!(s, f, { acts: [small.id, big.id], time: { [small.id]: 2, [big.id]: 3 }, att: 9000, cap: 10000, rating: 75, ex: 70, verdict: 'ok', disaster: false });
    const a3 = countryOfCity(s.config.homeCity)!;
    const L = ledger31(s);
    expect(L.act.get(big.id)!.get(a3)!).toBeGreaterThan(0);
    expect(L.src.get('festival') ?? 0).toBeGreaterThan(0);
    expect([...L.rel.keys()].some((id) => s.releases[id]?.actId === small.id)).toBe(true); // revelação → paradas
    expect(recentFacts(s, { kinds: ['festival_breakout'] }).length).toBe(1);
  });
});

describe('R31 CAR · estúdio, editora, agência, empresário, crítico e trilhas', () => {
  it('editora: a canção colocada entra no próximo disco do artista (apelo e pagamento pela venda real)', () => {
    const s = mk('car-pub', 1975);
    expect(foundVenture(s, 'publisher', 'label', {})).toBeNull();
    const v = ventures(s).list.find((x) => x.kind === 'publisher')!;
    const a = Object.values(s.acts).find((x) => x.owner !== 'player' && x.status !== 'retired' && x.releases.length)!;
    (v.cat ??= []).push({ title: 'Canção Teste', actId: a.id, y: s.year, v: 200 });
    advanceMonth(s);
    expect(moreRo31(s).pl.some((p) => p.act === a.id)).toBe(true);
    const base = s.releases[a.releases[a.releases.length - 1]];
    const rel = { ...base, id: 'reltest', appeal: 10, autopsy: [] } as Release;
    s.releases[rel.id] = rel;
    runSimHooks('launch', s, Rng.fromSeed('t'), { release: rel });
    expect(rel.appeal).toBeGreaterThan(10);
    expect(rel.autopsy!.some((x) => x.key === 'car31pub')).toBe(true);
    expect(moreRo31(s).pr.reltest).toBeDefined();
  });

  it('estúdio: a sessão vendida vira nota e apelo do próximo disco do selo cliente', () => {
    const s = mk('car-studio', 1975);
    expect(foundVenture(s, 'studio', 'label', {})).toBeNull();
    const v = ventures(s).list.find((x) => x.kind === 'studio')!;
    v.sound = 90; v.level = 3;
    const lab = Object.values(s.labels).find((x) => x.active && x.roster.length)!;
    advanceMonth(s);
    v.booked = [{ lab: lab.id, n: 2 }];
    advanceMonth(s); // o mês guarda as sessões vendidas (vale 13 semanas); ventures9 refaz booked antes, então repomos
    const st = (s.x4 as unknown as { car31x: { sb: Record<string, { n: number }> } }).car31x;
    st.sb[lab.id] = { n: 2, q: 90 * (0.6 + 3 * 0.08), u: s.week + 13, vid: v.id } as never;
    const base = Object.values(s.releases).find((r) => r.owner === lab.id)!;
    const rel = { ...base, id: 'reltest2', appeal: 10, q: 50, autopsy: [] } as Release;
    runSimHooks('launch', s, Rng.fromSeed('t'), { release: rel });
    expect(rel.q).toBeGreaterThan(50);
    expect(rel.appeal).toBeGreaterThan(10);
    expect(rel.autopsy!.some((x) => x.key === 'car31studio')).toBe(true);
  });

  it('agência: a turnê roteirizada passa pelas cidades do mercado-alvo (fama no país)', () => {
    const s = mk('car-route', 1980);
    setSw(s, 'car31.agency', false); // regra da primeira rodada (a turnê pelo motor de rotas está em r31-carreiras2)
    expect(foundVenture(s, 'booking', 'label', {})).toBeNull();
    const v = ventures(s).list.find((x) => x.kind === 'booking')!;
    const a = Object.values(s.acts).find((x) => x.owner !== 'player' && x.status !== 'retired' && x.fame > 30)!;
    v.clients!.push({ actId: a.id, rate: 0.15, since: s.week });
    expect(setTarget31(s, a.id, 'DEU')).toBeNull();
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) { (v.clients![0] as { cool?: number }).cool = 0; ok = routeTour(s, Rng.fromSeed(`r${i}`), v.id, a.id).ok; }
    expect(ok).toBe(true);
    const flags = Object.keys(s.flags).filter((k) => k.startsWith(`played:${a.id}:`) && countryOfCity(k.split(':')[2]) === 'DEU');
    expect(flags.length).toBeGreaterThan(0);
  });

  it('empresário: pedido real pode ser aceito ou recusado; espera entre pedidos; determinístico', () => {
    const run = () => {
      const s = mk('car-mgr', 1985);
      const a = Object.values(s.acts).filter((x) => x.owner && x.owner !== 'player' && s.labels[x.owner] && x.releases.some((id) => s.releases[id]?.live)).sort((p, q) => q.fame - p.fame || (p.id < q.id ? -1 : 1))[0];
      ventures(s).mg.clients.push({ actId: a.id, rate: 0.15, since: s.week, earned: 0 }); c12(s, a.id).trust = clamp(c12(s, a.id).trust + 5, 0, 100); // UNI-4: satisfação 70 → confiança da ficha
      const r = askFor31(s, a.id, 'radio');
      return { s, a, r };
    };
    const x = run(), y = run();
    expect(x.r.ok).toBe(y.r.ok);
    expect(askLock31(x.s, x.a.id, 'radio')).not.toBeNull(); // espera
    if (x.r.ok) expect(car31(x.s).b.some((b) => b.act === x.a.id && b.src === 'manager')).toBe(true);
    expect(recentFacts(x.s, { kinds: ['manager_ask_ok', 'manager_ask_no'] }).length).toBe(1);
  });

  it('crítico: resenha boa pesa no país do veículo; lista do ano; trilha vende pela bilheteria', () => {
    const s = mk('car-crit', 1990);
    careers(s).active.push('critic');
    const rel = npcRel(s)[0];
    (s.x4 as unknown as { press18: { revs: unknown[]; cred: number } }).press18.revs.push({ rel: rel.id, sc: 92, w: s.week, y: s.year });
    expect(ledger31(s).src.get('critic') ?? 0).toBeGreaterThan(0);
    expect(yearList31(s)).toContain(rel.id);
    const a = s.acts[rel.actId];
    SCREEN31.prem!(s, { id: 'cm1', box: 1.2 } as never, a);
    expect(car31(s).b.some((b) => b.src === 'screen' && b.act === a.id)).toBe(true);
  });
});

describe('R31 CAR · progressão e fim de jogo das 12 carreiras', () => {
  it('cada carreira tem degraus, objetivo, tensão e desafio de fim de jogo; o desafio resolve no prazo', () => {
    const s = mk('car-prog', 1985);
    for (const c of CARS31) {
      const d = DEF31[c];
      expect(d.tiers.length).toBe(d.at.length);
      expect(d.tiers.length).toBeGreaterThanOrEqual(3);
      expect(d.tension.pt.length).toBeGreaterThan(10);
      expect(d.end.name.pt.length).toBeGreaterThan(3);
      const t = tierOf31(s, c);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(progView31(s, c).name.pt).toBeTruthy();
    }
    // mídia: força o desafio pelo editor e passa o prazo
    radio(s); fillGrid(s); months(s, 2);
    careers(s).active.push('media');
    setEditorOn(s, true);
    const share0 = stRo31(s, mediaVentures31(s)[0]).share;
    runEdit(s, 'car31.prog.force', 'media');
    expect(stRo31(s, mediaVentures31(s)[0]).share).toBeLessThan(share0); // choque: a queda do rádio
    const e = progRo31(s).end.find((x) => x.c === 'media')!;
    expect(e).toBeDefined();
    expect(calendar19(s, { weeks: 60 }).some((d) => d.id.startsWith('car31e:media'))).toBe(true);
    months(s, 13);
    expect(progRo31(s).end.find((x) => x.c === 'media')!.res).toMatch(/ok|fail/);
    expect(recentFacts(s, { kinds: ['endgame_ok', 'endgame_fail'] }).length).toBe(1);
  });
});

describe('R31 CAR · explorar não muda o mundo', () => {
  it('ler livro, grade, candidatos, assinantes, degraus, calendário e cenas não muda o estado', async () => {
    const s = mk('car-ro', 2016);
    radio(s); fillGrid(s);
    foundVenture(s, 'platform', 'label', {});
    months(s, 1);
    const before = JSON.stringify(s);
    const v = mediaVentures31(s)[0];
    ledger31(s); power31(s, v); cands31(s, v); cands31p(s); subsShare31(s, platVentures31(s)[0]);
    for (const c of CARS31) { tierOf31(s, c); progView31(s, c); }
    stageRo31(s); venueNow31(s); yearList31(s); calendar19(s, { weeks: 26 });
    const { salaModel31 } = await import('../src/ui/r31/salas31model');
    for (const c of ['media', 'platform', 'venue', 'festival', 'manager', 'critic', 'label'] as const) salaModel31(s, `sig:${c}`);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('as partidas de referência não mudam sem negócios do jogador (o livro fica vazio)', () => {
    const s = mk('car-empty', 1975);
    months(s, 2);
    expect(ledger31(s).list.length).toBe(0);
    expect(unitsMult31(s, Object.keys(s.releases)[0])).toBe(1);
  });
});
void ({} as Act);
