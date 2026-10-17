// R33 · CATÁLOGO: cinco mecânicas atrás de exp33.* (desligadas no código). Poucos casos, sem jogo longo:
//   · desligado = nada nasce no save (cat33) nem nos modificadores;
//   · ciclos de formato: vinil morre e volta, CD morre; disco no formato morto vende menos;
//   · relíquias: efeito pequeno no estúdio (teto 3%), garantia barra a consignação e a execução manda a leilão;
//   · sampling: liberar paga e entra na cadeia; processo aberto se resolve pelo gancho do cartório;
//   · catálogo que reaparece: cachê de sync, linha na vitrine e calor no sucesso tardio;
//   · cadeia: extrato do master soma 1.
import { describe, expect, it } from 'vitest';
import { off33c } from './helpers/off33';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import { setSw, sw } from '../src/sim/r31/switches';
import { addRelic } from '../src/sim/sys/relics9';
import { consignable31 } from '../src/sim/sys/auction31';
import { rv19 } from '../src/sim/sys/revival19';
import { cat33, peek33 } from '../src/sim/r33/cat33';
import { formatFit33, formatLife33 } from '../src/sim/r33/formats33';
import { collateral33, pledge33, relicQ33, RELIC_Q_CAP33, seize33 } from '../src/sim/r33/relic33';
import { answerReq33, openCases33, resolveCase33 } from '../src/sim/r33/sample33';
import { resurface33, resurfaced33 } from '../src/sim/r33/resurf33';
import { chain33 } from '../src/sim/r33/chain33';
import type { GameState, Release } from '../src/sim/types';

const SW = ['exp33.relics', 'exp33.sampling', 'exp33.resurface', 'exp33.chain', 'exp33.formats'];
const game = (y: number): GameState => createGame(off33c(defaultConfig('r33cat', { startYear: y, scenario: 'established', dbSize: 'small' } as Parameters<typeof defaultConfig>[1]))); // QA33: 33 ligada por padrão
/** um disco antigo do jogador (fabricado no teste quando a partida não tem) */
function oldRel(s: GameState): Release {
  const own = Object.values(s.releases).find((r) => r.owner === 'player' && s.year - r.year >= 10 && r.q >= 35 && s.acts[r.actId]);
  if (own) return own;
  const base = Object.values(s.releases).find((r) => s.acts[r.actId] && r.songs.length)!;
  const rel: Release = { ...base, id: 'rel_t33', owner: 'player', year: s.year - 15, q: 60, totalUnits: 50000, reissueOf: undefined };
  s.releases[rel.id] = rel;
  return rel;
}

describe('r33 catálogo', () => {
  it('desligado: interruptores no padrão e nada nasce no save', () => {
    const s = game(1975);
    for (const id of SW) expect(sw(s, id)).toBe(false);
    for (let i = 0; i < 5; i++) advanceWeek(s);
    expect(peek33(s)).toBeUndefined();
    expect(relicQ33(s, 'rock')).toBe(0);
    expect(collateral33(s)).toEqual([]);
  });

  it('ciclos de formato: vinil morre e volta, CD morre, formato errado vende menos', () => {
    const s = game(1990);
    s.techDates.cd = 1982; s.techDates.streaming = 2008;
    expect(formatLife33(s, 'lp', 1985)).toBe(1);
    expect(formatLife33(s, 'lp', 1997)).toBeLessThan(0.1);
    expect(formatLife33(s, 'lp', 2020)).toBeGreaterThan(0.4);
    expect(formatLife33(s, 'cd', 2000)).toBe(1);
    expect(formatLife33(s, 'cd', 2022)).toBeLessThan(0.2);
    expect(formatLife33(s, 'cassette', 2000)).toBeLessThan(0.1);
    s.year = 1997;
    expect(formatFit33(s, { formats: ['lp'] })).toBeLessThan(0.2);
    expect(formatFit33(s, { formats: ['cd', 'lp'] })).toBe(1);
    expect(formatFit33(s, { formats: ['streaming'] })).toBe(1);
  });

  it('relíquias: estúdio com teto, garantia barra consignação, execução vai a leilão', () => {
    const s = game(1975);
    setSw(s, 'exp33.relics', true);
    for (let i = 0; i < 5; i++) { const rl = addRelic(s, i % 2 ? 'mic' : 'guitar', { pt: `Peça ${i}`, en: `Piece ${i}` }, undefined, undefined, 5000); rl.st = 'player'; }
    expect(relicQ33(s)).toBeCloseTo(RELIC_Q_CAP33, 6);
    const c = collateral33(s)[0];
    expect(c.v).toBeGreaterThan(0);
    expect(pledge33(s, c.rid, 'Banco')).toBeNull();
    expect(consignable31(s).some((x) => x.id === c.rid)).toBe(false);
    expect(seize33(s, c.rid, 'Banco')).toBe(c.v);
    expect(s.x4 && (s.x4 as unknown as { relics9: { list: { id: string; st: string }[] } }).relics9.list.find((x) => x.id === c.rid)?.st).toBe('auction');
  });

  it('sampling: liberar paga e entra na cadeia; processo se resolve pelo gancho', () => {
    const s = game(1990);
    setSw(s, 'exp33.sampling', true);
    const rel = oldRel(s), sid = rel.songs[0];
    const by = Object.values(s.acts).find((a) => a.owner !== 'player' && !a.playerBand)!.id;
    const st = cat33(s);
    st.req.push({ id: 'q1', kind: 'sample', song: sid, rel: rel.id, by, fee: 50000, until: s.week + 8, st: 'open' });
    const cash = s.player.cash;
    answerReq33(s, 'q1', true);
    expect(s.player.cash).toBe(cash + 50000);
    expect(st.boost[rel.id]).toBeGreaterThan(s.week);
    expect(st.lic.some((x) => x.song === sid)).toBe(true);
    st.cases.push({ id: 'c1', kind: 'sample', song: sid, vs: by, stake: 30000, since: s.week, st: 'open' });
    expect(openCases33(s).length).toBe(1);
    const c2 = s.player.cash;
    resolveCase33(s, 'c1', 'settle');
    expect(s.player.cash).toBe(c2 + 18000);
    expect(openCases33(s).length).toBe(0);
  });

  it('catálogo que reaparece: cachê, vitrine e calor no sucesso tardio', () => {
    const s = game(1995);
    setSw(s, 'exp33.resurface', true);
    const rel = oldRel(s);
    const cash = s.player.cash, h0 = rv19(s).c[rel.id]?.h ?? 0;
    const x = resurface33(s, rel, 'film', 0);
    expect(x).not.toBeNull();
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(resurfaced33(s).length).toBe(1);
    expect((rv19(s).c[rel.id]?.h ?? 0) > h0 || rv19(s).rv.some((v) => v.rel === rel.id)).toBe(true);
  });

  it('cadeia: o extrato do master soma 1 e a edição fica na taxa da edição', () => {
    const s = game(1990);
    const ch = chain33(s, oldRel(s));
    expect(ch.master.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 6);
    expect(ch.pub.reduce((t, x) => t + x.share, 0)).toBeCloseTo(0.12, 6);
  });
});
