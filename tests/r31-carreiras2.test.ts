// R31 · onda 3 (CAR, segunda rodada) — as pendências das carreiras. Cada item tem interruptor `car31.*` próprio: partida
// gêmea ligada × desligada (mesma semente, mesma decisão), determinismo e "explorar não muda o mundo".
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { runSimHooks } from '../src/sim/ext4';
import { Rng } from '../src/core/rng';
import { countryOfCity } from '../src/data/geo';
import { CITIES } from '../src/data/world';
import { cityDistanceKm } from '../src/sim/travel';
import { setSw, switchDefs } from '../src/sim/r31/switches';
import { editables } from '../src/sim/r31/editor';
import { calendar19 } from '../src/sim/calendar19';
import { recentFacts } from '../src/sim/facts17';
import { ledger31 } from '../src/sim/sys/car31';
import { addGrid31, cityBoard31, clipK31, mediaVentures31, rivals31, stRo31 } from '../src/sim/sys/car31media';
import { addList31, answerBoy31, cands31p, outOf31, platRo31, platVentures31 } from '../src/sim/sys/car31plat';
import { exBlocked31, exclOf31, exclQuote31, setExcl31, stageRo31, EXCL_KM31, EXCL_WK31 } from '../src/sim/sys/car31stage';
import { ASKS_MORE31, agencyStops31, askFor31, askLock31, moreRo31, setSyn31, setTarget31, trendPush31, vehicles31 } from '../src/sim/sys/car31more';
import { f16 } from '../src/sim/sys/fame16';
import { FEST31, festOf, f12, offer12, proj12, found12 } from '../src/sim/sys/fest12';
import { media18 } from '../src/sim/sys/media18';
import { radio18 } from '../src/sim/sys/radio18';
import { disc18 } from '../src/sim/sys/discover18';
import { addShow12, c12, shows12 } from '../src/sim/sys/tour12';
import { foundVenture, routeTour, ventures } from '../src/sim/sys/ventures9';
import { buyVenue } from '../src/sim/sys/live/venue';
import { addNight12 } from '../src/sim/sys/venue12';
import { careers } from '../src/sim/sys/careers12';
import { pr18 } from '../src/sim/sys/press18';
import { platOf } from '../src/sim/sys/platform12';
import type { Act, GameState, Release } from '../src/sim/types';

const mk = (seed: string, year: number): GameState => { const s = createGame(defaultConfig(seed, { startYear: year })); s.player.cash += 5_000_000_000; return s; };
const months = (s: GameState, n: number) => { for (let i = 0; i < n; i++) advanceMonth(s); };
const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const npcActs = (s: GameState) => Object.values(s.acts).filter((a) => live(a) && a.owner !== 'player' && !a.playerBand).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1));
const NEW = ['trend', 'clips', 'agency', 'asks', 'outlets', 'scouts', 'excl', 'cities', 'boycott'];

describe('R31 CAR2 · interruptores e editor', () => {
  it('cada item tem interruptor car31.* próprio, ligado por padrão, e aparece no editor', () => {
    const ids = switchDefs().map((d) => d.id);
    const ed = editables().map((e) => e.id);
    for (const k of NEW) {
      expect(ids, k).toContain(`car31.${k}`);
      expect(ed, k).toContain(`sw.car31.${k}`);
    }
  });
});

describe('R31 CAR2 · 1. assinatura do estúdio empurra a moda do gênero', () => {
  it('disco com a assinatura nas paradas empurra o gênero (com teto); desligado não mexe', () => {
    const run = (on: boolean) => {
      const s = mk('car2-trend', 1978);
      if (!on) setSw(s, 'car31.trend', false);
      expect(foundVenture(s, 'studio', 'label', {})).toBeNull();
      const lab = Object.values(s.labels).find((x) => x.active && x.roster.length)!;
      const st = (s.x4 as unknown as { car31x: { sb: Record<string, unknown> } }).car31x ?? ((s.x4 as unknown as Record<string, unknown>).car31x = { sb: {}, pl: [], seen: {}, pr: {}, tgt: {}, rq: {}, yl: [], log: [] }) as never;
      // o disco que está no topo das paradas foi gravado no seu estúdio
      const top = s.charts.singles[0] ?? s.charts.albums[0];
      const rel = s.releases[top.releaseId];
      (st as { sb: Record<string, unknown> }).sb[rel.owner] = { n: 2, q: 90, u: s.week + 13, vid: ventures(s).list[0].id };
      const r2 = { ...rel, autopsy: [] } as Release;
      runSimHooks('launch', s, Rng.fromSeed('t'), { release: r2 });
      void lab;
      return { s, g: (moreRo31(s).ss ?? [])[0]?.g };
    };
    const A = run(true), B = run(false);
    expect(A.g).toBeTruthy();
    expect(B.g).toBeUndefined();
    const push = trendPush31(A.s);
    expect(push[A.g!]).toBeGreaterThan(0);
    expect(push[A.g!]).toBeLessThanOrEqual(0.04); // teto por mês
    const snap = JSON.stringify(A.s.genrePop);
    trendPush31(A.s); // explorar não muda o mundo
    expect(JSON.stringify(A.s.genrePop)).toBe(snap);
    const p0 = A.s.genrePop[A.g!], q0 = B.s.genrePop[A.g!];
    advanceMonth(A.s); advanceMonth(B.s);
    expect(A.s.genrePop[A.g!] - p0).toBeGreaterThan(B.s.genrePop[A.g!] - q0);
    // teto anual
    for (let i = 0; i < 12; i++) advanceMonth(A.s);
    for (const v of Object.values(moreRo31(A.s).tl ?? {})) expect(v.v).toBeLessThanOrEqual(0.25 + 1e-9);
  });
});

describe('R31 CAR2 · 2. rotação de clipes da TV = media18', () => {
  it('clipe do media18 pesa na TV; banido não entra; rotação pesada da TV vai para o clipe (mesmo campo)', () => {
    const s = mk('car2-clip', 1985);
    expect(foundVenture(s, 'media', 'label', { media: 'tv', city: s.config.homeCity })).toBeNull();
    const v = mediaVentures31(s)[0];
    const mineRels = Object.values(s.releases).filter((r) => r.live && r.owner === 'player').slice(0, 2);
    const own = mineRels.length >= 2 ? mineRels : (() => {
      const xs = Object.values(s.releases).filter((r) => r.live && s.acts[r.actId]).slice(0, 2);
      for (const r of xs) { s.acts[r.actId].owner = 'player'; r.owner = 'player'; }
      return xs;
    })();
    const [good, bad] = own;
    const m = media18(s);
    m.vids[good.id] = { rel: good.id, w: s.week, dir: 'd', tier: 2, v: 90 };
    m.vids[bad.id] = { rel: bad.id, w: s.week, dir: 'd', tier: 2, v: 80, banned: 1 };
    expect(clipK31(s, v, good)).toBeGreaterThan(1.5);
    expect(clipK31(s, v, bad)).toBe(0);
    expect(addGrid31(s, v.id, bad.id, 'mid')).not.toBeNull();
    expect(addGrid31(s, v.id, good.id, 'heavy')).toBeNull();
    advanceMonth(s);
    expect(m.vids[good.id].heavy).toBeGreaterThan(s.week); // fonte única: o campo do media18
    expect((s.x4 as unknown as { car31m: object }).car31m).not.toHaveProperty('clips');
    setSw(s, 'car31.clips', false);
    expect(clipK31(s, v, good)).toBe(1);
    expect(addGrid31(s, v.id, bad.id, 'mid')).toBeNull();
  });
});

describe('R31 CAR2 · 3. agência usa o motor de rotas (tour12)', () => {
  it('turnê vira datas reais no mercado-alvo; os shows acontecem e dão fama no país (gêmeas)', () => {
    const run = (on: boolean) => {
      const s = mk('car2-agency', 1980);
      if (!on) setSw(s, 'car31.agency', false);
      expect(foundVenture(s, 'booking', 'label', {})).toBeNull();
      const v = ventures(s).list.find((x) => x.kind === 'booking')!;
      const a = npcActs(s).find((x) => x.fame > 30 && countryOfCity(x.city) !== 'DEU')!;
      v.clients!.push({ actId: a.id, rate: 0.15, since: s.week });
      expect(setTarget31(s, a.id, 'DEU')).toBeNull();
      const snap = JSON.stringify(c12(s));
      const stops = agencyStops31(s, v, a); // explorar não muda o mundo
      expect(JSON.stringify(c12(s))).toBe(snap);
      if (on) { expect(stops.length).toBeGreaterThan(0); for (const st of stops) expect(countryOfCity(st.city)).toBe('DEU'); }
      const r = routeTour(s, Rng.fromSeed('rt'), v.id, a.id);
      return { s, a, r };
    };
    const A = run(true), B = run(false);
    expect(A.r.ok).toBe(true);
    const shows = shows12(A.s).filter((x) => x.actId === A.a.id);
    expect(shows.length).toBeGreaterThan(1);
    expect(shows.every((x) => countryOfCity(x.city) === 'DEU' && x.by === 'agent')).toBe(true);
    expect(shows12(B.s).filter((x) => x.actId === B.a.id).length).toBe(0); // desligado: regra antiga (instantânea)
    months(A.s, 3); months(B.s, 3);
    const played = shows12(A.s).filter((x) => x.actId === A.a.id && x.status === 'done');
    expect(played.length).toBeGreaterThan(0);
    expect(played.every((x) => !!x.res)).toBe(true);
    expect(f16(A.s).d[A.a.id]?.DEU ?? 0).toBeGreaterThan(0);
  });
});

describe('R31 CAR2 · 4. empresário com mais tipos de pedido', () => {
  it('TV, revista, playlist, casa, trilha e agência: aceitar ou recusar com motivo; espera; desligado trava', () => {
    const s = mk('car2-ask', 2012);
    const a = npcActs(s).find((x) => x.releases.some((id) => s.releases[id]?.live) && s.labels[x.owner ?? ''])!;
    (s.x4 as unknown as { ventures9: { mg: { clients: unknown[] } } }).ventures9.mg.clients.push({ actId: a.id, sat: 60, rate: 0.15, since: s.week } as never);
    let ok = 0, no = 0;
    const why = new Set<string>();
    for (const k of ASKS_MORE31) {
      expect(askLock31(s, a.id, k), k).toBeNull();
      const r = askFor31(s, a.id, k);
      if (r.ok) ok++; else { no++; why.add(r.text.pt); }
      expect(r.text.pt.length).toBeGreaterThan(5);
      expect(askLock31(s, a.id, k)).not.toBeNull(); // espera entre pedidos
    }
    expect(ok + no).toBe(ASKS_MORE31.length);
    expect(recentFacts(s, { kinds: ['manager_ask_ok', 'manager_ask_no'] }).length).toBe(ASKS_MORE31.length);
    for (const w of why) expect(w).not.toMatch(/\d\.\d|NaN|undefined/); // motivo legível, sem dado cru
    const t = mk('car2-ask', 2012);
    setSw(t, 'car31.asks', false);
    (t.x4 as unknown as { ventures9: { mg: { clients: unknown[] } } }).ventures9.mg.clients.push({ actId: a.id, sat: 60, rate: 0.15, since: t.week } as never);
    expect(askLock31(t, a.id, 'tv')).not.toBeNull();
    expect(askLock31(t, a.id, 'radio')).toBeNull(); // os pedidos antigos seguem
  });
});

describe('R31 CAR2 · 5. crítico pesa no país de cada veículo', () => {
  it('com alcance, a resenha sai em outros países (sindicação); escolha do jogador; desligado = só a sede', () => {
    const s = mk('car2-crit', 1990);
    careers(s).active.push('critic');
    const p = pr18(s);
    p.cred = 80; p.reach = 60;
    const rel = Object.values(s.releases).filter((r) => r.live && s.acts[r.actId]?.owner !== 'player').sort((a, b) => b.appeal - a.appeal)[0];
    p.revs.push({ rel: rel.id, sc: 95, w: s.week, y: s.year });
    const vs = vehicles31(s);
    expect(vs.length).toBe(3); // casa + 2 (alcance 60)
    const L = ledger31(s);
    const countries = vs.map((v) => v.a3);
    const w = L.rel.get(rel.id)!;
    expect(w).toBeTruthy();
    expect(new Set(L.list.filter((e) => e.src === 'critic').map((e) => e.a3)).size).toBe(3);
    expect(setSyn31(s, ['JPN'])).toBeNull();
    expect(vehicles31(s).map((v) => v.a3)).toContain('JPN');
    expect(setSyn31(s, ['XXX'])).not.toBeNull();
    setSw(s, 'car31.outlets', false);
    expect(vehicles31(s).length).toBe(1);
    expect(new Set(ledger31(s).list.filter((e) => e.src === 'critic').map((e) => e.a3)).size).toBe(1);
    void countries;
  });
});

describe('R31 CAR2 · 6. olheiros rivais roubam a revelação', () => {
  it('a revelação sem selo entra na disputa da descoberta; se você não age, o rival assina; desligado não', () => {
    const run = (on: boolean) => {
      const s = mk('car2-scout', 1975);
      if (!on) setSw(s, 'car31.scouts', false);
      const acts = npcActs(s);
      const big = acts[0];
      const small = acts.find((a) => a.fame < 30 && !a.owner) ?? acts[acts.length - 1];
      small.owner = null;
      const f = { id: 'ftest', cityId: s.config.homeCity, name: 'Festival Teste' } as unknown as Parameters<NonNullable<typeof FEST31.after>>[1];
      FEST31.after!(s, f, { acts: [small.id, big.id], time: { [small.id]: 2, [big.id]: 3 }, att: 9000, cap: 10000, rating: 75, ex: 70, verdict: 'ok', disaster: false });
      return { s, small };
    };
    const A = run(true), B = run(false);
    expect(disc18(A.s).hot[A.small.id]).toBeTruthy();
    expect(disc18(B.s).hot[B.small.id]).toBeUndefined();
    expect(recentFacts(A.s, { kinds: ['scout_circling'] }).length).toBe(1);
    months(A.s, 3); months(B.s, 3);
    expect(A.small.owner && A.small.owner !== 'player').toBeTruthy();
    expect(stageRo31(A.s).stolen ?? 0).toBe(1);
    expect(recentFacts(A.s, { kinds: ['reveal_stolen'] }).length).toBe(1);
  });
});

describe('R31 CAR2 · 7. exclusividade territorial no festival', () => {
  const setup = (seed: string) => {
    const s = mk(seed, 1990);
    const f = found12(s, 'label', { month: 6, ident: 'mega' });
    expect(typeof f === 'object' && 'id' in f).toBe(true);
    const fest = f as Exclude<typeof f, { pt: string }>;
    const a = npcActs(s).find((x) => x.fame >= 40 && x.fame < 60)!;
    const r = offer12(s, fest.id, a.id, { stage: 0, time: 3, len: 60, excl: false, fee: 10_000_000 });
    expect(r.res).toBe('yes');
    return { s, fid: fest.id, a };
  };
  it('raio e prazo maiores custam mais; cláusula paga e muda a procura; desfazer não devolve', () => {
    const { s, fid, a } = setup('car2-excl');
    const q1 = exclQuote31(s, fid, a.id, EXCL_KM31[0], EXCL_WK31[0]), q3 = exclQuote31(s, fid, a.id, EXCL_KM31[2], EXCL_WK31[2]);
    expect(q3.cost).toBeGreaterThan(q1.cost);
    const snap = JSON.stringify(s.x4);
    exBlocked31(s, fid, 2000, 26); exclQuote31(s, fid, a.id, 800, 16); // explorar não muda o mundo
    expect(JSON.stringify(s.x4)).toBe(snap);
    const d0 = proj12(s, festOf(s, fid)!).demand;
    const cash = s.player.cash;
    expect(setExcl31(s, fid, a.id, 800, 16)).toBeNull();
    expect(f12(s, festOf(s, fid)!).deals[a.id].excl).toBe(true);
    expect(s.player.cash).toBeLessThanOrEqual(cash);
    expect(exclOf31(s, fid, a.id)?.paid).toBeGreaterThan(0);
    expect(proj12(s, festOf(s, fid)!).demand).not.toBe(d0);
    expect(setExcl31(s, fid, a.id, 123, 16)).not.toBeNull();
    expect(calendar19(s, { weeks: 200 }).some((x) => x.id.startsWith('car31x:'))).toBe(true);
  });
  it('quebra: show seu dentro do raio fura a exclusividade (gêmeas com o interruptor)', () => {
    const run = (on: boolean) => {
      const { s, fid, a } = setup('car2-excl2');
      expect(setExcl31(s, fid, a.id, 2000, 26)).toBeNull();
      if (!on) setSw(s, 'car31.excl', false);
      // a sua agência marca um show do artista numa cidade próxima, dentro do prazo
      const fc = festOf(s, fid)!.cityId;
      const city = CITIES.map((c) => c.id).filter((c) => c !== fc && cityDistanceKm(c, fc) <= 1500).sort()[0];
      expect(city).toBeTruthy();
      addShow12(s, { id: 'shx', actId: a.id, by: 'agent', city, week: s.week + 3, tier: 1, deal: 'guarantee', fee: 1, pct: 0.85, pmult: 1, promo: 1, rate: 0.1, deposit: 0 }); // UNI-4: show avulso em s.tours
      for (let i = 0; i < 4; i++) advanceMonth(s);
      return { s, fid, a };
    };
    const A = run(true), B = run(false);
    const ca = exclOf31(A.s, A.fid, A.a.id), cb = exclOf31(B.s, B.fid, B.a.id);
    expect(stageRo31(A.s).breaks ?? 0).toBeGreaterThan(0);
    expect(recentFacts(A.s, { kinds: ['excl_broken'] }).length).toBeGreaterThan(0);
    expect(ca === undefined || ca.broke === 1).toBe(true);
    expect(stageRo31(B.s).breaks ?? 0).toBe(0);
    expect(cb?.broke).toBeUndefined();
  });
});

describe('R31 CAR2 · 8. rádios NPC com cidade; audiência cidade a cidade', () => {
  it('estações têm cidade; a sua rádio só disputa com as da cidade; quem perde ouvintes perde alcance', () => {
    const run = (on: boolean) => {
      const s = mk('car2-city', 1978);
      if (!on) setSw(s, 'car31.cities', false);
      advanceMonth(s);
      expect(foundVenture(s, 'media', 'label', { media: 'radio', city: s.config.homeCity })).toBeNull();
      const v = mediaVentures31(s)[0];
      return { s, v };
    };
    const A = run(true), B = run(false);
    const st = radio18(A.s).st;
    expect(st.length).toBeGreaterThan(0);
    expect(st.every((x) => !!x.city)).toBe(true);
    expect(new Set(st.map((x) => x.city)).size).toBeGreaterThan(1);
    expect(rivals31(A.s, A.v)).not.toBe(rivals31(B.s, B.v));
    const snap = JSON.stringify(radio18(A.s));
    const b = cityBoard31(A.s, A.v.city); // explorar não muda o mundo
    expect(JSON.stringify(radio18(A.s))).toBe(snap);
    expect(b.some((x) => x.mine)).toBe(true);
    expect(b.filter((x) => !x.mine).every((x) => st.find((y) => y.id === x.id)?.city === A.v.city)).toBe(true);
    const sum = b.reduce((t, x) => t + x.share, 0);
    expect(sum).toBeLessThan(1);
    // a sua grade cheia ganha a cidade: as rivais do mesmo formato perdem alcance; as de outra cidade não
    const v = A.v;
    const rels = Object.values(A.s.releases).filter((r) => r.live && A.s.acts[r.actId] && A.s.acts[r.actId].owner !== 'player' && A.s.week - r.week <= 30).sort((x, y) => y.appeal - x.appeal);
    let i = 0;
    for (const r of rels) { if (!addGrid31(A.s, v.id, r.id, i < 6 ? 'heavy' : 'mid')) i++; if (i >= 14) break; }
    const fmt = stRo31(A.s, v).fmt;
    const same = st.filter((x) => x.city === v.city && x.fmt === fmt), other = st.filter((x) => x.city !== v.city);
    const r0 = same.map((x) => x.reach), o0 = other.map((x) => x.reach);
    months(A.s, 4);
    const st2 = radio18(A.s).st;
    if (same.length) expect(same.some((x, k) => (st2.find((y) => y.id === x.id)?.reach ?? 0) < r0[k])).toBe(true);
    expect(other.every((x, k) => st2.find((y) => y.id === x.id)?.reach === o0[k])).toBe(true);
  });
});

describe('R31 CAR2 · 9. boicote à plataforma: o catálogo sai de verdade', () => {
  it('aviso com prazo e decisão; sem resposta o artista sai das playlists e leva assinantes; desligado não', () => {
    const run = (on: boolean) => {
      const s = mk('car2-boy', 2016);
      if (!on) setSw(s, 'car31.boycott', false);
      expect(foundVenture(s, 'platform', 'label', { city: s.config.homeCity })).toBeNull();
      const v = platVentures31(s)[0];
      v.subs = 8_000_000;
      const pick = cands31p(s, 30).filter((r) => s.acts[r.actId].owner !== 'player').slice(0, 15);
      pick.forEach((r, i) => addList31(s, v.id, 'top', r.id, i));
      platOf(s, v.id).trust = 5; // repasses desacreditados
      return { s, v };
    };
    const A = run(true), B = run(false);
    let warned: { act: string } | undefined;
    for (let i = 0; i < 8 && !warned; i++) { advanceMonth(A.s); warned = platRo31(A.s, A.v.id).bq?.[0]; }
    expect(warned).toBeTruthy();
    expect(recentFacts(A.s, { kinds: ['artist_boycott'] }).length).toBeGreaterThan(0);
    expect(calendar19(A.s, { weeks: 10 }).some((d) => d.id.startsWith('car31b:'))).toBe(true);
    const act = warned!.act;
    const subs0 = A.v.subs!;
    expect(answerBoy31(A.s, A.v.id, act, 'let')).toBeNull();
    const rel = Object.values(A.s.releases).find((r) => r.actId === act && r.live);
    expect(platRo31(A.s, A.v.id).lists.top.every((id) => A.s.releases[id]?.actId !== act)).toBe(true);
    if (rel) { expect(outOf31(A.s, A.v.id, rel)).toBe(true); expect(addList31(A.s, A.v.id, 'top', rel.id)).not.toBeNull(); }
    expect(A.v.subs!).toBeLessThan(subs0);
    expect(recentFacts(A.s, { kinds: ['catalog_exit'] }).length).toBe(1);
    months(B.s, 8);
    expect(platRo31(B.s, B.v.id).bq ?? []).toEqual([]);
    expect(recentFacts(B.s, { kinds: ['catalog_exit'] }).length).toBe(0);
  });
  it('pagar o bônus segura o artista (custo) e é determinístico', () => {
    const go = () => {
      const s = mk('car2-boy2', 2016);
      expect(foundVenture(s, 'platform', 'label', { city: s.config.homeCity })).toBeNull();
      const v = platVentures31(s)[0];
      v.subs = 8_000_000;
      platOf(s, v.id).trust = 5;
      let b: { act: string } | undefined;
      for (let i = 0; i < 8 && !b; i++) { advanceMonth(s); b = platRo31(s, v.id).bq?.[0]; }
      return { s, v, b };
    };
    const A = go(), B = go();
    expect(JSON.stringify(A.s.x4.car31p)).toBe(JSON.stringify(B.s.x4.car31p));
    if (A.b) {
      expect(answerBoy31(A.s, A.v.id, A.b.act, 'pay')).toBeNull();
      expect(platRo31(A.s, A.v.id).out?.[A.b.act]).toBeUndefined();
      expect(answerBoy31(A.s, A.v.id, A.b.act, 'pay')).not.toBeNull(); // já respondido
    }
  });
});

describe('R31 CAR2 · determinismo', () => {
  it('duas partidas iguais com tudo ligado dão o mesmo estado das carreiras', () => {
    const run = () => {
      const s = mk('car2-det', 1985);
      foundVenture(s, 'media', 'label', { media: 'radio', city: s.config.homeCity });
      buyVenue(s, 'club', s.config.homeCity, 'Casa Det');
      const a = npcActs(s)[0];
      addNight12(s, { k: 'original', day: 'fri', deal: 'door', actId: a.id });
      months(s, 4);
      return s;
    };
    const a = run(), b = run();
    for (const k of ['car31', 'car31m', 'car31s', 'car31x', 'radio18']) expect(JSON.stringify((a.x4 as unknown as Record<string, unknown>)[k]), k).toBe(JSON.stringify((b.x4 as unknown as Record<string, unknown>)[k]));
  });
});
