// R31 (onda 3 · Y) — diagnóstico: quem lidera as paradas de alguns países depois de N meses (fama global, fama local,
// territórios, dono) e os maiores artistas locais de cada país. Uso: npx tsx scripts/r31/charts-who.ts [meses] [id=v,...]

async function main(): Promise<void> {
  const { defaultConfig } = await import('../../src/sim/bot');
  const { createGame } = await import('../../src/sim/worldgen');
  const { advanceMonth } = await import('../../src/sim/tick');
  const { playMonth } = await import('../../src/sim/playbot16');
  const { board } = await import('../../src/sim/sys/charts7');
  const { countryOfCity } = await import('../../src/data/geo');
  const { fameIn } = await import('../../src/sim/sys/fame16');
  const { setSw } = await import('../../src/sim/r31/switches');
  const months = Number(process.argv[2] ?? 12);
  const sw = process.argv[3] ?? '';
  const start = Number(process.argv[4] ?? 1985);
  const s = createGame(defaultConfig('r31-no1-0', { startYear: start, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
  for (const kv of sw.split(',').filter(Boolean)) { const [k, v] = kv.split('='); setSw(s, k, v === 'true' ? true : v === 'false' ? false : Number(v)); }
  for (let m = 0; m < months && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  for (const a3 of ['USA', 'GBR', 'BRA', 'JPN', 'DEU', 'NLD', 'CAN', 'FRA']) {
    console.log(`== ${a3}`);
    for (const r of board(s, a3, 'songs').slice(0, 6)) {
      const rel = s.releases[r.relId]; const a = s.acts[rel.actId];
      console.log(`  #${r.pos} ${r.u} ${a.name} [${countryOfCity(a.city)}] fama ${a.fame.toFixed(0)} local ${fameIn(s, a, a3)} terr ${rel.territories.join('/')} dono ${rel.owner} q ${rel.q.toFixed(0)}`);
    }
    const all = Object.values(s.acts).filter((a) => countryOfCity(a.city) === a3 && a.status !== 'retired' && a.status !== 'split');
    const loc = all.sort((x, y) => y.fame - x.fame).slice(0, 4);
    console.log(`  locais (${all.length} ativos): ${loc.map((a) => `${a.name} f${a.fame.toFixed(0)} lanç${a.releases.length}`).join('; ')}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
