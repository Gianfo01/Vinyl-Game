// R31 · onda 3 (CAR) — medição das carreiras que mudam o mundo. Partidas gêmeas (mesma semente, mesmo negócio, mesma
// decisão); a única diferença é o efeito no mundo ligado ou desligado (car31.charts + car31.fame). Mede, por carreira:
//   paradas do país   unidades da última semana das faixas expostas na parada do país do negócio (on ÷ off)
//   vendas totais     unidades acumuladas dessas faixas no período (on ÷ off)
//   fama local        soma do desvio de fama no país dos artistas expostos (on − off)
//   e o que a carreira mede dela mesma (audiência, ibope, prestígio, assinantes).
// Segunda rodada (--items): uma gêmea por item novo, só o interruptor do item muda (car31.trend, clips, agency, asks,
// outlets, scouts, excl, cities, boycott), cada uma com a medida que o item promete mudar.
// Uso: npx tsx scripts/r31/car31measure.ts [--out docs/r31/car-medida] [--seeds a,b,c] [--months 6] [--items] [--only a,b]
import { writeFileSync } from 'node:fs';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', 'docs/r31/car-medida');
const SEEDS = arg('seeds', 'car-m1,car-m2,car-m3').split(',');
const MONTHS = Number(arg('months', '6'));
const ITEMS = process.argv.includes('--items');
const ONLY = arg('only', '').split(',').filter(Boolean);

async function main(): Promise<void> {
  if (ITEMS) return items();
  const { createGame } = await import('../../src/sim/worldgen');
  const { defaultConfig } = await import('../../src/sim/bot');
  const { advanceWeek } = await import('../../src/sim/tick');
  const { setSw } = await import('../../src/sim/r31/switches');
  const { countryOfCity } = await import('../../src/data/geo');
  const { foundVenture, ventures } = await import('../../src/sim/sys/ventures9');
  const { board } = await import('../../src/sim/sys/charts7');
  const { f16 } = await import('../../src/sim/sys/fame16');
  const { ledger31, car31 } = await import('../../src/sim/sys/car31');
  const M = await import('../../src/sim/sys/car31media');
  const P = await import('../../src/sim/sys/car31plat');
  const ST = await import('../../src/sim/sys/car31stage');
  const { buyVenue } = await import('../../src/sim/sys/live/venue');
  const { addNight12 } = await import('../../src/sim/sys/venue12');
  type S = ReturnType<typeof createGame>;

  interface Case { id: string; name: string; year: number; setup: (s: S) => { a3: string; rels: () => string[]; acts: () => string[]; own: (s: S) => Record<string, number> } }
  const npcRels = (s: S, ids: string[]) => ids.filter((id) => s.acts[s.releases[id]?.actId]?.owner !== 'player');
  const CASES: Case[] = [
    ...[1960, 1978, 1995].map((year): Case => ({ id: `radio${year}`, name: `Rádio ${year}`, year, setup: (s) => {
      foundVenture(s, 'media', 'label', { media: 'radio', city: s.config.homeCity });
      const v = M.mediaVentures31(s)[0];
      let i = 0;
      for (const r of npcRels(s, M.cands31(s, v, 40).map((x) => x.id))) { if (!M.addGrid31(s, v.id, r, i < 4 ? 'heavy' : i < 10 ? 'mid' : 'light')) i++; if (i >= 14) break; }
      const grid = () => M.stRo31(s, v).grid.map((x) => x.rel);
      return { a3: countryOfCity(v.city) ?? 'USA', rels: grid, acts: () => [...new Set(grid().map((id) => s.releases[id]?.actId).filter(Boolean))], own: (x) => { const st = M.stRo31(x, M.mediaVentures31(x)[0]); return { audiencia: Math.round(st.share * 1000) / 10, ibope: st.ib.at(-1)?.rank ?? 0, rivais: st.ib.at(-1)?.n ?? 0 }; } };
    } })),
    { id: 'tv1985', name: 'TV 1985', year: 1985, setup: (s) => {
      foundVenture(s, 'media', 'label', { media: 'tv', city: s.config.homeCity });
      const v = M.mediaVentures31(s)[0];
      let i = 0;
      for (const r of npcRels(s, M.cands31(s, v, 30).map((x) => x.id))) { if (!M.addGrid31(s, v.id, r, i < 3 ? 'heavy' : 'mid')) i++; if (i >= 8) break; }
      const grid = () => M.stRo31(s, v).grid.map((x) => x.rel);
      return { a3: countryOfCity(v.city) ?? 'USA', rels: grid, acts: () => [...new Set(grid().map((id) => s.releases[id]?.actId))], own: (x) => ({ audiencia: Math.round(M.stRo31(x, M.mediaVentures31(x)[0]).share * 1000) / 10 }) };
    } },
    { id: 'plat2016', name: 'Plataforma 2016', year: 2016, setup: (s) => {
      foundVenture(s, 'platform', 'label', { city: s.config.homeCity });
      const v = P.platVentures31(s)[0];
      v.subs = 8_000_000;
      npcRels(s, P.cands31p(s, 30).map((x) => x.id)).slice(0, 15).forEach((r, i) => P.addList31(s, v.id, 'top', r, i));
      const ids = () => P.platRo31(s, v.id).lists.top.slice(0, 15);
      return { a3: countryOfCity(v.city) ?? 'USA', rels: ids, acts: () => [...new Set(ids().map((id) => s.releases[id]?.actId))], own: (x) => ({ assinantes_mi: Math.round((P.platVentures31(x)[0].subs ?? 0) / 1e5) / 10 }) };
    } },
    { id: 'venue1975', name: 'Casa de shows 1975', year: 1975, setup: (s) => {
      buyVenue(s, 'theater', s.config.homeCity, 'Casa Medida');
      const acts = Object.values(s.acts).filter((a) => a.owner !== 'player' && a.status !== 'retired' && a.status !== 'split' && a.releases.length).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1));
      const days = ['wed', 'thu', 'fri', 'sat'] as const;
      days.forEach((d, i) => addNight12(s, { k: 'original', day: d, deal: 'door', actId: acts[i * 3].id }));
      const ids = acts.filter((_, i) => i % 3 === 0).slice(0, 4).map((a) => a.id);
      return { a3: countryOfCity(s.config.homeCity) ?? 'USA', rels: () => ids.flatMap((id) => s.acts[id]?.releases ?? []).filter((r) => s.releases[r]?.live), acts: () => ids, own: (x) => ({ prestigio: ST.stageRo31(x).pres, noites_lendarias: ST.stageRo31(x).legends }) };
    } },
  ];

  const rows: Record<string, unknown>[] = [];
  for (const c of CASES) for (const seed of SEEDS) {
    const run = (on: boolean) => {
      const s = createGame(defaultConfig(seed, { startYear: c.year }));
      s.player.cash += 5_000_000_000;
      if (!on) { setSw(s, 'car31.charts', false); setSw(s, 'car31.fame', false); }
      const k = c.setup(s);
      const rels0 = k.rels();
      const u0 = Object.fromEntries(rels0.map((id) => [id, s.releases[id]?.totalUnits ?? 0]));
      // semana a semana: unidades das faixas expostas na parada do país e semanas no top 40 de lá
      let inC = 0, top = 0;
      const set = new Set(rels0);
      for (let i = 0; i < Math.round(MONTHS * 4.33); i++) {
        advanceWeek(s);
        for (const kk of ['songs', 'albums'] as const) for (const r of board(s, k.a3, kk)) if (set.has(r.relId)) { inC += r.u; if (r.pos <= 40) top++; }
      }
      const rels = rels0.filter((id) => s.releases[id]);
      const tot = rels.reduce((t, id) => t + (s.releases[id].totalUnits - (u0[id] ?? 0)), 0);
      const fame = k.acts().reduce((t, id) => t + (f16(s).d[id]?.[k.a3] ?? 0), 0);
      return { inC, top, tot, fame, own: k.own(s), meter: car31(s).m.at(-1), exp: ledger31(s).list.length, cash: s.player.cash };
    };
    const on = run(true), off = run(false);
    rows.push({ caso: c.id, nome: c.name, seed, pais: on.own, paradaPais: { on: on.inC, off: off.inC, k: off.inC ? Math.round((on.inC / off.inC) * 1000) / 1000 : null }, top40pais: { on: on.top, off: off.top },
      vendas: { on: on.tot, off: off.tot, k: off.tot ? Math.round((on.tot / off.tot) * 1000) / 1000 : null }, famaLocal: { on: Math.round(on.fame * 10) / 10, off: Math.round(off.fame * 10) / 10 }, medidor: on.meter, execucoes: on.exp });
    process.stdout.write(`${c.id} ${seed}: parada ×${rows.at(-1)!.paradaPais && (rows.at(-1)!.paradaPais as { k: number }).k} vendas ×${(rows.at(-1)!.vendas as { k: number }).k} fama +${Math.round((on.fame - off.fame) * 10) / 10}\n`);
  }
  writeFileSync(`${OUT}.json`, JSON.stringify({ months: MONTHS, seeds: SEEDS, rows }, null, 1));
  // resumo por caso (média entre sementes)
  const by = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) by.set(r.caso as string, [...(by.get(r.caso as string) ?? []), r]);
  const avg = (xs: number[]) => Math.round((xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length)) * 1000) / 1000;
  const L = ['| Caso | Unidades na parada do país (on ÷ off) | Semanas-faixa no top 40 do país (on / off) | Vendas das faixas (on ÷ off) | Fama local (on − off) | Próprio |', '|---|---|---|---|---|---|'];
  for (const [k, xs] of by) {
    const g = (f: (r: Record<string, unknown>) => number) => avg(xs.map(f));
    L.push(`| ${xs[0].nome} | ×${g((r) => (r.paradaPais as { k: number }).k ?? 1)} | ${g((r) => (r.top40pais as { on: number }).on)} / ${g((r) => (r.top40pais as { off: number }).off)} | ×${g((r) => (r.vendas as { k: number }).k ?? 1)} | +${g((r) => (r.famaLocal as { on: number; off: number }).on - (r.famaLocal as { off: number }).off)} | ${Object.entries(xs[0].pais as Record<string, number>).map(([a, b]) => `${a} ${b}`).join(', ')} |`);
    void k;
  }
  writeFileSync(`${OUT}.md`, `# Medição CAR (carreiras que mudam o mundo)\n\n${MONTHS} meses, sementes ${SEEDS.join(', ')}; gêmeas com o efeito no mundo ligado × desligado (mesma decisão).\n\n${L.join('\n')}\n`);
  console.log(L.join('\n'));
}

// ---------------------------------------------------------------- segunda rodada: gêmeas por item
async function items(): Promise<void> {
  const { createGame } = await import('../../src/sim/worldgen');
  const { defaultConfig } = await import('../../src/sim/bot');
  const { advanceMonth } = await import('../../src/sim/tick');
  const { setSw } = await import('../../src/sim/r31/switches');
  const { countryOfCity } = await import('../../src/data/geo');
  const { foundVenture, ventures, routeTour } = await import('../../src/sim/sys/ventures9');
  const { board } = await import('../../src/sim/sys/charts7');
  const { f16 } = await import('../../src/sim/sys/fame16');
  const { Rng } = await import('../../src/core/rng');
  const M = await import('../../src/sim/sys/car31media');
  const P = await import('../../src/sim/sys/car31plat');
  const ST = await import('../../src/sim/sys/car31stage');
  const MO = await import('../../src/sim/sys/car31more');
  const { media18 } = await import('../../src/sim/sys/media18');
  const { radio18 } = await import('../../src/sim/sys/radio18');
  const { c12 } = await import('../../src/sim/sys/tour12');
  const { platOf } = await import('../../src/sim/sys/platform12');
  const { careers } = await import('../../src/sim/sys/careers12');
  const { pr18, review18 } = await import('../../src/sim/sys/press18');
  const { FEST31, found12, offer12, proj12, festOf } = await import('../../src/sim/sys/fest12');
  const { buyVenue } = await import('../../src/sim/sys/live/venue');
  const { addNight12 } = await import('../../src/sim/sys/venue12');
  const { styleOfRel17 } = await import('../../src/sim/sys/trends17');
  type S = ReturnType<typeof createGame>;
  const mk = (seed: string, year: number): S => { const s = createGame(defaultConfig(seed, { startYear: year })); s.player.cash += 5_000_000_000; return s; };
  const npc = (s: S) => Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.owner !== 'player' && !a.playerBand).sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1));
  const units = (s: S, ids: string[]) => ids.reduce((t, id) => t + (s.releases[id]?.totalUnits ?? 0), 0);
  const inC = (s: S, a3: string, ids: Set<string>) => (['songs', 'albums'] as const).reduce((t, k) => t + board(s, a3, k).filter((r) => ids.has(r.relId)).reduce((x, r) => x + r.u, 0), 0);
  const R = (x: number) => Math.round(x * 1000) / 1000;
  /** um item: prepara a partida (mesma decisão nos dois lados), roda os meses e mede */
  interface Item { id: string; name: string; year: number; months: number; run: (s: S, months: (n: number, each?: () => void) => void) => Record<string, number> }
  const ITEMS: Item[] = [
    { id: 'trend', name: '1. Estúdio → moda do gênero', year: 1978, months: 6, run: (s, go) => {
      foundVenture(s, 'studio', 'label', {});
      const vid = ventures(s).list.find((v) => v.kind === 'studio')!.id;
      const top = [...s.charts.singles.slice(0, 10)].map((e) => s.releases[e.releaseId]).filter(Boolean);
      const gs = [...new Set(top.map((r) => styleOfRel17(s, r.id)).filter(Boolean) as string[])];
      const p0 = gs.reduce((t, g) => t + (s.genrePop[g] ?? 0), 0);
      // a mesma decisão nos dois lados: os seis maiores selos gravam no seu estúdio (6 sessões, casa nota 90)
      const x = ((s.x4 as unknown as Record<string, { sb: Record<string, unknown> }>).car31x ??= { sb: {} } as never);
      const labs = Object.values(s.labels).filter((lb) => lb.active && lb.roster.length >= 3).sort((a, b) => b.roster.length - a.roster.length || (a.id < b.id ? -1 : 1)).slice(0, 6);
      const book = () => { for (const lb of labs) x.sb[lb.id] = { n: 6, q: 90, u: s.week + 13, vid }; };
      book();
      go(MONTHS, book);
      const st = MO.moreRo31(s);
      // mesma régua nos dois lados: os estilos dos discos que esses selos lançaram no período
      const ids = new Set(labs.map((lb) => lb.id));
      const G = [...new Set(Object.values(s.releases).filter((r) => r.week > 0 && ids.has(r.owner)).map((r) => styleOfRel17(s, r.id)).filter(Boolean) as string[])].sort();
      const avg = G.length ? G.reduce((t0, g) => t0 + (s.genrePop[g] ?? 0), 0) / G.length : 0;
      return { discos_assinatura: (st.ss ?? []).length, moda_empurrada: R(Object.values(st.tl ?? {}).reduce((t0, x) => t0 + x.v, 0)), estilos: G.length, moda_media_estilos: R(avg), moda_soma_sucessos_delta: R(gs.reduce((t0, g) => t0 + (s.genrePop[g] ?? 0), 0) - p0) };
    } },
    { id: 'clips', name: '2. Clipes da TV = media18', year: 1985, months: 4, run: (s, go) => {
      foundVenture(s, 'media', 'label', { media: 'tv', city: s.config.homeCity });
      const v = M.mediaVentures31(s)[0];
      const rels = M.cands31(s, v, 30).slice(0, 4);
      for (const r of rels) { s.acts[r.actId].owner = 'player'; r.owner = 'player'; }
      const m = media18(s);
      m.vids[rels[0].id] = { rel: rels[0].id, w: s.week, dir: 'd', tier: 2, v: 85 };
      m.vids[rels[1].id] = { rel: rels[1].id, w: s.week, dir: 'd', tier: 1, v: 40 };
      rels.forEach((r, i) => M.addGrid31(s, v.id, r.id, i < 2 ? 'heavy' : 'mid'));
      const u0 = units(s, rels.map((r) => r.id));
      go(4);
      return { audiencia_tv: R(M.stRo31(s, v).share * 100), unidades_clipes: units(s, rels.map((r) => r.id)) - u0, semanas_rotacao_pesada: Math.max(0, (m.vids[rels[0].id].heavy ?? 0) - s.week) };
    } },
    { id: 'agency', name: '3. Agência no motor de rotas', year: 1980, months: 4, run: (s, go) => {
      foundVenture(s, 'booking', 'label', {});
      const v = ventures(s).list.find((x) => x.kind === 'booking')!;
      const a = npc(s).find((x) => x.fame > 30 && x.fame < 45 && countryOfCity(x.city) !== 'DEU')!;
      v.clients!.push({ actId: a.id, rate: 0.15, since: s.week });
      MO.setTarget31(s, a.id, 'DEU');
      const c0 = s.player.cash;
      routeTour(s, Rng.fromSeed(`${s.config.seed}|m`), v.id, a.id);
      go(4);
      const sh = c12(s).shows.filter((x) => x.actId === a.id && x.status === 'played');
      return { shows_no_alvo: sh.length, publico_medio_pct: sh.length ? R(sh.reduce((t, x) => t + (x.res!.att / x.res!.cap), 0) / sh.length * 100) : 0, fama_alvo: R(f16(s).d[a.id]?.DEU ?? 0), caixa_delta: Math.round((s.player.cash - c0) / 100) };
    } },
    { id: 'asks', name: '4. Empresário: mais pedidos', year: 2012, months: 4, run: (s, go) => {
      const a = npc(s).find((x) => x.releases.some((id) => s.releases[id]?.live) && s.labels[x.owner ?? ''] && x.fame < 60) ?? npc(s).find((x) => x.releases.some((id) => s.releases[id]?.live))!;
      (s.x4 as unknown as { ventures9: { mg: { clients: unknown[] } } }).ventures9.mg.clients.push({ actId: a.id, sat: 60, rate: 0.15, since: s.week });
      const rel = a.releases.map((id) => s.releases[id]).filter((r) => r?.live).at(-1)!;
      const a3 = countryOfCity(a.city) ?? 'USA';
      let ok = 0, no = 0, kc = 0;
      const ask = () => { for (const k of [...MO.ASKS_BASE31, ...MO.ASKS_MORE31]) if (!MO.askLock31(s, a.id, k)) { const r = MO.askFor31(s, a.id, k); if (r.ok) ok++; else no++; kc++; } };
      const u0 = rel.totalUnits, ids = new Set([rel.id]);
      let pc = 0;
      ask();
      go(4, () => { ask(); pc += inC(s, a3, ids); });
      return { pedidos: kc, aceitos: ok, recusados: no, unidades_disco: rel.totalUnits - u0, parada_pais: Math.round(pc), fama_local: R(f16(s).d[a.id]?.[a3] ?? 0) };
    } },
    { id: 'outlets', name: '5. Crítica por país do veículo', year: 1990, months: 3, run: (s, go) => {
      careers(s).active.push('critic');
      const p = pr18(s); p.cred = 80; p.reach = 60;
      const rels = Object.values(s.releases).filter((r) => r.live && s.week - r.week <= 6 && s.acts[r.actId]?.owner !== 'player').sort((a, b) => b.appeal - a.appeal || (a.id < b.id ? -1 : 1)).slice(0, 4);
      for (const r of rels) review18(s, r.id, 88);
      const vs = MO.vehicles31(s).filter((x) => !x.home).map((x) => x.a3);
      const ids = new Set(rels.map((r) => r.id)), u0 = units(s, [...ids]);
      let abroad = 0;
      go(3, () => { for (const a3 of vs) abroad += inC(s, a3, ids); });
      return { paises: MO.vehicles31(s).length, unidades_fora: Math.round(abroad), unidades_total: units(s, [...ids]) - u0 };
    } },
    { id: 'scouts', name: '6. Olheiros rivais', year: 1975, months: 4, run: (s, go) => {
      const all = npc(s);
      const small = all.filter((a) => a.fame < 30 && !a.owner).slice(0, 3);
      const big = all[0];
      const f = { id: 'fmed', cityId: s.config.homeCity, name: 'Festival Medida' } as unknown as Parameters<NonNullable<typeof FEST31.after>>[1];
      for (const sm of small) FEST31.after!(s, f, { acts: [sm.id, big.id], time: { [sm.id]: 2, [big.id]: 3 }, att: 9000, cap: 10000, rating: 75, ex: 70, verdict: 'ok', disaster: false });
      go(4);
      return { revelacoes: small.length, levadas_por_rivais: small.filter((a) => a.owner && a.owner !== 'player').length, contagem_casa: ST.stageRo31(s).stolen ?? 0 };
    } },
    { id: 'excl', name: '7. Exclusividade com raio e prazo', year: 1990, months: 18, run: (s, go) => {
      go(12); // um ano de mundo: os selos rivais abrem os festivais deles
      const f = found12(s, 'label', { month: (s.month + 7) % 12, ident: 'mega' }) as { id: string };
      const acts = npc(s).filter((x) => x.fame >= 40 && x.fame < 60).slice(0, 3);
      acts.forEach((a, i) => offer12(s, f.id, a.id, { stage: 0, time: 3 - i, len: 60, excl: true, fee: 10_000_000 })); // a exclusividade regional antiga nos dois lados
      const c0 = s.player.cash;
      let ok = 0;
      for (const a of acts) if (!ST.setExcl31(s, f.id, a.id, 2000, 26)) ok++;
      const k = ST.exclDemand31(s, f.id), d1 = proj12(s, festOf(s, f.id)!).demand;
      go(6);
      return { clausulas: ok, festivais_bloqueados: ST.exBlocked31(s, f.id, 2000, 26).length, bonus_procura_pct: R(k * 100), procura: Math.round(d1), custo_clausulas: Math.round((c0 - s.player.cash) / 100), quebras: ST.stageRo31(s).breaks ?? 0 };
    } },
    { id: 'cities', name: '8. Rádios NPC com cidade', year: 1978, months: 6, run: (s, go) => {
      foundVenture(s, 'media', 'label', { media: 'radio', city: s.config.homeCity });
      const v = M.mediaVentures31(s)[0];
      let i = 0;
      for (const r of M.cands31(s, v, 40)) { if (s.acts[r.actId].owner === 'player') continue; if (!M.addGrid31(s, v.id, r.id, i < 4 ? 'heavy' : i < 10 ? 'mid' : 'light')) i++; if (i >= 14) break; }
      go(6);
      const st = M.stRo31(s, v), fmt = st.fmt;
      const riv = radio18(s).st.filter((x) => x.city === v.city && x.fmt === fmt);
      return { audiencia: R(st.share * 100), rivais_na_cidade: riv.length, alcance_rival_medio: riv.length ? R(riv.reduce((t, x) => t + x.reach, 0) / riv.length) : 0, ibope: st.ib.at(-1)?.rank ?? 0, de: st.ib.at(-1)?.n ?? 0 };
    } },
    { id: 'boycott', name: '9. Boicote à plataforma', year: 2016, months: 8, run: (s, go) => {
      foundVenture(s, 'platform', 'label', { city: s.config.homeCity });
      const v = P.platVentures31(s)[0];
      v.subs = 8_000_000;
      P.cands31p(s, 30).filter((r) => s.acts[r.actId].owner !== 'player').slice(0, 15).forEach((r, i) => P.addList31(s, v.id, 'top', r.id, i));
      platOf(s, v.id).trust = 5;
      go(8, () => { platOf(s, v.id).trust = Math.min(platOf(s, v.id).trust, 20); });
      const p = P.platRo31(s, v.id);
      return { assinantes_mi: R((v.subs ?? 0) / 1e6), artistas_fora: Object.keys(p.out ?? {}).length, faixas_no_top: p.lists.top.length };
    } },
  ];
  const rows: Record<string, unknown>[] = [];
  for (const it of ITEMS) {
    if (ONLY.length && !ONLY.includes(it.id)) continue;
    for (const seed of SEEDS) {
      const one = (on: boolean) => {
        const s = mk(`${seed}|${it.id}`, it.year);
        if (!on) setSw(s, `car31.${it.id}`, false);
        const go = (n: number, each?: () => void) => { for (let i = 0; i < n; i++) { advanceMonth(s); each?.(); } };
        return it.run(s, go);
      };
      const on = one(true), off = one(false);
      rows.push({ item: it.id, nome: it.name, seed, on, off });
      process.stdout.write(`${it.id} ${seed}: on ${JSON.stringify(on)} | off ${JSON.stringify(off)}\n`);
    }
  }
  const tag = ONLY.length ? `-${ONLY.join('-')}` : '';
  writeFileSync(`${OUT}2${tag}.json`, JSON.stringify({ seeds: SEEDS, rows }, null, 1));
  const by = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) by.set(r.item as string, [...(by.get(r.item as string) ?? []), r]);
  const avg = (xs: number[]) => Math.round((xs.reduce((t, x) => t + x, 0) / Math.max(1, xs.length)) * 100) / 100;
  const L = ['| Item | Medida | Ligado | Desligado |', '|---|---|---|---|'];
  for (const [, xs] of by) {
    const keys = Object.keys(xs[0].on as Record<string, number>);
    keys.forEach((k, i) => L.push(`| ${i ? '' : xs[0].nome} | ${k.replace(/_/g, ' ')} | ${avg(xs.map((r) => (r.on as Record<string, number>)[k]))} | ${avg(xs.map((r) => (r.off as Record<string, number>)[k]))} |`));
  }
  writeFileSync(`${OUT}2${tag}.md`, `# Medição CAR, segunda rodada (gêmeas por item)\n\nSementes ${SEEDS.join(', ')}; em cada linha só o interruptor do item muda (média das sementes).\n\n${L.join('\n')}\n`);
  console.log(L.join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
