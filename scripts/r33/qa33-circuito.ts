// R33 · QA33 — robô com vários negócios próprios (gravadora + rádio/TV/revista + estúdio + editora + festival + agência
// + plataforma + compra de rádios e casas no país). Pergunta: o conflito de interesse (car31.conflict, avisos do intra19,
// jabá caseiro) e o antitruste (w31.antitrust nas compras) seguram o circuito próprio sem frear o crescimento?
// Três variantes com a mesma semente: só selo · circuito com freios · circuito sem freios (conflito 1, antitruste off).
// Uso: npx tsx scripts/r33/qa33-circuito.ts [ano0=1985] [anos=15] [cidade=london] [sementes=2] [primeira=0]
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw } from '../../src/sim/r31/switches';
import { toReal } from '../../src/core/money';
import { countryOfCity } from '../../src/data/geo';
import { favorAct, foundCost, foundVenture, kindsAvailable, mediaAvailable, ventures, type VKind } from '../../src/sim/sys/ventures9';
import { buyLock31, buy31, quote31, socio31, targets31 } from '../../src/sim/sys/socio31';
import { intra19 } from '../../src/sim/sys/intra19';
import { playerActs } from '../../src/sim/util';
import type { GameState } from '../../src/sim/types';

const y0 = Number(process.argv[2] ?? 1985), years = Number(process.argv[3] ?? 15), city = process.argv[4] ?? 'london', seeds = Number(process.argv[5] ?? 2), seed0 = Number(process.argv[6] ?? 0);
type V = 'selo' | 'freios' | 'livre';

function run(seed: string, v: V) {
  const s = createGame(defaultConfig(seed, { startYear: y0, homeCity: city, dbSize: 'small', realNames: true }));
  if (v === 'livre') { setSw(s, 'car31.conflict', 1); setSw(s, 'w31.antitrust', false); }
  const country = countryOfCity(city);
  let vetoes = 0, buys = 0, vetoTxt = '';
  const fame0 = playerActs(s).reduce((t, id) => t + s.acts[id].fame, 0);
  const y1 = y0 + years;
  while (s.year < y1 && !s.ended) {
    playMonth(s, 'balanced');
    if (v !== 'selo' && s.month % 3 === 0) {
      const have = new Set(ventures(s).list.map((x) => (x.kind === 'media' ? `media:${x.media}` : x.kind)));
      for (const k of kindsAvailable(s) as VKind[]) {
        // só com folga: o caixa fica com 3× o custo depois de fundar (um negócio por trimestre)
        const opts = k === 'media' ? mediaAvailable(s).filter((m) => !have.has(`media:${m}`)) : have.has(k) ? [] : [undefined];
        const m = opts[0];
        if (!opts.length || s.player.cash < foundCost(s, k, m) * 4) continue;
        if (!foundVenture(s, k, 'label', m ? { media: m } : {})) break;
      }
      const top = playerActs(s).map((id) => s.acts[id]).sort((a, b) => b.fame - a.fame);
      ventures(s).list.filter((x) => x.kind === 'media').forEach((x, i) => { if (top.length) favorAct(s, x.id, top[i % Math.min(2, top.length)].id); });
      // compra controle (100%) de rádios e casas no país, uma por trimestre
      const t = targets31(s).filter((x) => (x.kind === 'radio' || x.kind === 'venue') && countryOfCity(x.city) === country && !x.legend && !x.never).sort((a, b) => b.cap - a.cap);
      for (const x of t.slice(0, 6)) {
        const lk = buyLock31(s, x.id, 10000, 'label');
        if (lk && /antitrust|antitruste/i.test(lk.why.pt)) { vetoes++; vetoTxt ||= `${s.year}: ${lk.why.pt}`; continue; }
        if (!lk && s.player.cash > quote31(s, x.id, 10000, 0) * 3 && !buy31(s, x.id, 10000, 'label')) { buys++; break; }
      }
    }
    advanceMonth(s);
  }
  const ctl = Object.values(socio31(s).b).filter((b) => b.me > 5000);
  const ix = intra19(s);
  const fame1 = playerActs(s).reduce((t, id) => t + s.acts[id].fame, 0);
  const media = ventures(s).list.filter((x) => x.kind === 'media');
  return {
    v, ano: s.year, fim: s.ended ? s.ended.ending : '', caixa: Math.round(toReal(s.player.cash, s.year) / 1e3), n1: s.player.stats.number1s, top10: s.player.stats.top10s,
    atos: playerActs(s).length, fama: Math.round(fame1 - fame0), negocios: ventures(s).list.length, controla: ctl.length,
    compras: buys, vetos: vetoes, conflitos: Object.keys(ix.warned ?? {}).length, repMidia: media.length ? Math.round(media.reduce((t, x) => t + x.rep, 0) / media.length) : 0,
    instit: Math.round(s.player.reputation.institutional), vetoTxt,
  };
}

for (let i = seed0; i < seed0 + seeds; i++) for (const v of ['selo', 'freios', 'livre'] as V[]) {
  const t = Date.now();
  try { console.log(JSON.stringify({ seed: i, ...run(`circ33-${i}`, v), seg: Math.round((Date.now() - t) / 1000) })); }
  catch (e) { console.log(`ERRO ${v} ${i}: ${(e as Error).stack?.split('\n').slice(0, 4).join(' | ')}`); }
}
