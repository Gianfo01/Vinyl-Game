// R18 media18: marketing com saturação/conversão/atraso/ingressos, streaming por fontes e pró-rata, rádio por
// formatos/consultores, fraude de streams, clipe e remix.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { applyMods } from '../src/sim/ext4';
import { MEDIA18 } from '../src/sim/media18hook';
import { mk18, profile18, satOf18, term18 } from '../src/sim/sys/mkt18';
import { a18, buyStreams18, payout18, st18 } from '../src/sim/sys/stream18';
import { CONS18, ensureStations18, pitchRadio18, radio18, spins18 } from '../src/sim/sys/radio18';
import { commissionRemix18, ensureDirs18, ensureDjs18, makeVideo18, media18 } from '../src/sim/sys/media18';
import type { GameState, Release } from '../src/sim/types';

const mk = (seed: string, y: number) => createGame(defaultConfig(seed, { startYear: y }));
function rel(s: GameState, id: string, o: Partial<Release> = {}): Release {
  const act = Object.values(s.acts).find((a) => a.members.length && !a.owner && !a.playerBand)!;
  act.owner = 'player';
  const x = { id, actId: act.id, owner: 'player', type: 'single', title: id, songs: [], week: s.week, year: s.year, q: 60, appeal: 1, formats: ['streaming'], stock: 0, pressed: 0, marketing: [], marketingE: 0.5, territories: ['na'], weekly: [], totalUnits: 0, revenue: 0, peak: 999, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: true, ...o } as Release;
  s.releases[id] = x; act.releases.push(id);
  return x;
}

describe('r18 media: marketing', () => {
  it('canal repetido satura, equipe aprende; cena local converte pouco e vende ingresso', () => {
    const s = mk('r18m-1', 1990);
    const act = Object.values(s.acts)[0];
    expect(satOf18(s, act.id, 'radio_plug').k).toBe(1);
    mk18(s).use[`${act.id}|radio_plug`] = 3; mk18(s).xp.radio_plug = 10;
    const k = satOf18(s, act.id, 'radio_plug');
    expect(k.sat).toBeLessThan(0.7);
    expect(k.learn).toBeGreaterThan(1.15);
    const loc = profile18(s, [{ channel: 'street_team', budget: 500000 }], act.id, 'single');
    const pl = profile18(s, [{ channel: 'radio_plug', budget: 500000 }], act.id, 'single');
    expect(loc.c).toBeLessThan(pl.c);
    expect(loc.tix).toBeGreaterThan(pl.tix * 3);
  });
  it('imprensa demora a render; vídeo curto não sustenta álbum fraco', () => {
    const s = mk('r18m-2', 2020);
    const press = profile18(s, [{ channel: 'press', budget: 900000 }], undefined, 'lp');
    expect(term18(press, 0.6, 0, 'lp', 70)).toBeLessThan(term18(press, 0.6, 3, 'lp', 70));
    const sv = profile18(s, [{ channel: 'short_clips', budget: 900000 }], undefined, 'lp');
    expect(term18(sv, 0.6, 8, 'lp', 40)).toBeLessThan(term18(sv, 0.6, 8, 'lp', 80));
  });
});

describe('r18 media: streaming', () => {
  it('pró-rata: mercado barato paga menos por play; fã que volta paga mais que vídeo', () => {
    const s = mk('r18m-3', 2018);
    const na = rel(s, 'rNA', { territories: ['na'] });
    const af = rel(s, 'rAF', { territories: ['africa'] });
    expect(payout18(s, af).k).toBeLessThan(payout18(s, na).k * 0.6);
    const fan = rel(s, 'rFan'); fan.st18 = { src: { wom: 0.6, srch: 0.4 }, ret: 0.35, L: 0, R: 0, F: 0 };
    const vid = rel(s, 'rVid'); vid.st18 = { src: { vid: 0.8, pl: 0.2 }, ret: 0.1, L: 0, R: 0, F: 0 };
    expect(payout18(s, fan).k).toBeGreaterThan(payout18(s, vid).k);
  });
  it('playlist traz plays, busca/indicação trazem fãs', () => {
    const s = mk('r18m-4', 2018);
    const a = rel(s, 'rPl'); a.st18 = { src: { pl: 1 }, ret: 0, L: 0, R: 0, F: 0 };
    const act = s.acts[a.actId];
    const b0 = act.fans.active;
    MEDIA18.fans!(s, a, act, 10000);
    const gPl = act.fans.active - b0;
    a.st18 = { src: { wom: 0.5, srch: 0.5 }, ret: 0, L: 0, R: 0, F: 0 };
    const b1 = act.fans.active;
    MEDIA18.fans!(s, a, act, 10000);
    expect(act.fans.active - b1).toBeGreaterThan(gPl * 2.5);
    expect(a18(s, act.id).mL).toBeGreaterThan(0);
  });
  it('fazenda de streams: sobe unidades, não paga, e a derrubada zera', () => {
    const s = mk('r18m-5', 2020);
    s.player.cash += 10_000_000;
    const r = rel(s, 'rFarm');
    expect(buyStreams18(s, r.id, 1).pt).toContain('Contratado');
    expect(applyMods(s, 'chartUnits', 100, { release: r }).value).toBeGreaterThan(150);
    expect(payout18(s, r).farm).toBeLessThan(1);
    st18(s).down[r.id] = s.week + 5;
    expect(applyMods(s, 'chartUnits', 100, { release: r }).value).toBeLessThan(20);
  });
});

describe('r18 media: rádio, clipe e remix', () => {
  it('formatos com consultor real na época; adição dá rotação e empurra as unidades', () => {
    const s = mk('r18m-6', 1978);
    s.player.cash += 10_000_000;
    const sts = ensureStations18(s);
    expect(sts.some((x) => x.fmt === 'aor' && x.cons === 'ba')).toBe(true);
    expect(CONS18.find((c) => c.id === 'ba')!.real).toBe(true);
    expect(sts.some((x) => x.fmt === 'network')).toBe(false); // rede ao vivo já acabou
    const r = rel(s, 'rRad', { q: 85, type: 'lp' });
    s.acts[r.actId].genre = 'hard_rock';
    pitchRadio18(s, r.id, 'aor', 'indie');
    pitchRadio18(s, r.id, 'college', 'plug');
    expect(radio18(s).paid.length).toBe(1); // "quem pagou" fica registrado
    if (spins18(s, r.id) > 0) expect(applyMods(s, 'chartUnits', 100, { release: r }).value).toBeGreaterThan(100);
  });
  it('clipe entra como canal; remix encomendado vai às pistas', () => {
    const s = mk('r18m-7', 1985);
    s.player.cash += 50_000_000;
    const r = rel(s, 'rVid2', { formats: ['lp'] });
    const d = ensureDirs18(s)[0];
    makeVideo18(s, r.id, { tier: 1, dir: d.id, censor: true });
    expect(media18(s).vids[r.id]).toBeTruthy();
    expect(r.marketing.some((m) => m.channel === 'music_video')).toBe(true);
    const dj = ensureDjs18(s)[0];
    commissionRemix18(s, r.id, dj.id);
    expect(media18(s).rmx[r.id].k).toBeGreaterThan(1);
  });
});
