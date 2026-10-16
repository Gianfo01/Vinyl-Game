// R31 · onda 3 (CAR) — medição das carreiras que mudam o mundo. Partidas gêmeas (mesma semente, mesmo negócio, mesma
// decisão); a única diferença é o efeito no mundo ligado ou desligado (car31.charts + car31.fame). Mede, por carreira:
//   paradas do país   unidades da última semana das faixas expostas na parada do país do negócio (on ÷ off)
//   vendas totais     unidades acumuladas dessas faixas no período (on ÷ off)
//   fama local        soma do desvio de fama no país dos artistas expostos (on − off)
//   e o que a carreira mede dela mesma (audiência, ibope, prestígio, assinantes).
// Uso: npx tsx scripts/r31/car31measure.ts [--out docs/r31/car-medida] [--seeds a,b,c] [--months 6]
import { writeFileSync } from 'node:fs';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', 'docs/r31/car-medida');
const SEEDS = arg('seeds', 'car-m1,car-m2,car-m3').split(',');
const MONTHS = Number(arg('months', '6'));

async function main(): Promise<void> {
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
main().catch((e) => { console.error(e); process.exit(1); });
