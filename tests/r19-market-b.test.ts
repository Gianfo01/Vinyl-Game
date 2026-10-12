import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { emitFact, factListeners19, recentFacts } from '../src/sim/facts17';
import { MARKETB19, RESERVED19 } from '../src/sim/factmatrix19';
import { STREAMS19 } from '../src/sim/rng19';
import { explain18 } from '../src/sim/explain18';
import { calendar19 } from '../src/sim/calendar19';
import { offerMods } from '../src/sim/ext4';
import { scandal } from '../src/sim/scandal17';
import { P } from '../src/sim/sys/people/state';
import { cine18 } from '../src/sim/sys/cine18';
import { ensureDjs18 } from '../src/sim/sys/media18';
import { remix19, remixOdds19, resolveRemix19, rmx19, residency19, whiteLabel19 } from '../src/sim/sys/remix19';
import { ad19, brandsNow19, takeAd19 } from '../src/sim/sys/adsync19';
import { needle19, scoreMonth19, scr19, takeTheme19 } from '../src/sim/sys/score19';
import { revivalMonth19, rv19 } from '../src/sim/sys/revival19';
import { cancelMonth19, cx19, respond19 } from '../src/sim/sys/cancel19';
import { ins19, insureKey19, keyPerson19, setPlan19 } from '../src/sim/sys/insure19';
import { cul19, setCulture19 } from '../src/sim/sys/culture19';
import { nameBrands19, nm19, sellName19, targets19 } from '../src/sim/sys/naming19';
import { VENUES17, v17, venueOpen } from '../src/sim/sys/venues17';
import { BRANDS } from '../src/data/content';
import { l } from '../src/data/world';
import type { Act, GameState, Release } from '../src/sim/types';

const kinds = (s: GameState, k: string) => recentFacts(s, { kind: k, months: 900 });
function setup(seed: string, year: number): { s: GameState; a: Act } {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  s.config.history = 'loose';
  const a = Object.values(s.acts).find((x) => !x.catalogNo && !x.playerBand && x.members.length >= 2 && x.members.every((p) => s.persons[p]?.alive))!;
  a.owner = 'player'; a.fame = 60; a.status = 'active'; a.trust = 70;
  s.player.cash += 50_000_00;
  return { s, a };
}
function oldRel(s: GameState, a: Act, year: number): Release {
  const rel: Release = { id: `rb-${a.id}-${year}`, actId: a.id, owner: 'player', type: 'single', title: `Faixa de ${year}`, songs: a.songs.slice(0, 1), week: 0, year, q: 66, appeal: 30,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 40000, revenue: 0, peak: 0, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: false };
  s.releases[rel.id] = rel; a.releases.push(rel.id);
  return rel;
}

describe('r19 T7 — mercado B: remix19, adsync19, score19', () => {
  it('cadeia 2: fracasso de 1983 → remix 1997 → comercial 2009 → série 2022 → sucesso tardio → certificação tardia', () => {
    const { s, a } = setup('r19-mb-c2', 1997);
    const rel = oldRel(s, a, 1983);
    // 1997: remix de clube de uma faixa antiga (DJ do estilo certo, white label antes)
    expect(whiteLabel19(s, rel.id)).toBeNull();
    expect(rmx19(s).wl[rel.id][0]).toBeGreaterThanOrEqual(0);
    const dj = ensureDjs18(s)[0];
    expect(remixOdds19(s, rel, dj).p).toBeGreaterThan(0);
    expect(remix19(s, rel.id, dj.id)).toBeNull();
    const rx = rmx19(s).rx.find((x) => x.rel === rel.id)!;
    resolveRemix19(s, rx, Rng.fromSeed('t'), true);
    expect(kinds(s, 'remix_hit').length).toBe(1);
    expect(rv19(s).c[rel.id]?.h ?? 0).toBeGreaterThan(0); // revival19 ouviu remix_hit com data.rel
    expect(rel.hypeBoost ?? 0).toBeGreaterThan(0);
    // 2009: a faixa vira comercial (licença) → ad_sync
    s.year = 2009;
    const b = brandsNow19(s, 'license')[0];
    expect(takeAd19(s, a.id, b.id, 'license', 100000, rel.id)).toBeNull();
    expect(kinds(s, 'ad_sync').length).toBe(1);
    expect(ad19(s).cred[a.id]).toBeGreaterThan(0);
    // 2022: needle drop numa série → sucesso tardio
    s.year = 2022;
    expect(needle19(s, rel.id, 'Netstream', 50000)).toBeNull();
    expect(kinds(s, 'needle_drop').length).toBe(1);
    expect(kinds(s, 'revival_hit').length).toBe(1);
    // certificação tardia na onda
    rel.totalUnits = 499_000;
    revivalMonth19(s);
    expect(kinds(s, 'late_cert').length).toBe(1);
    expect(rel.certified).toBeTruthy();
  });

  it('residência de DJ e canção-tema com estreia e prêmio', () => {
    const { s, a } = setup('r19-mb-res', 2014);
    const p = s.persons[a.members[0]];
    p.role = 'dj';
    expect(residency19(s, a.id, 'vegas')).toBeNull();
    expect(kinds(s, 'dj_residency').length).toBe(1);
    const cash0 = s.player.cash;
    advanceMonth(s);
    expect(s.player.cash).not.toBe(cash0);
    // canção-tema original
    const studio = BRANDS.find((x) => x.sync.includes('film') && x.start <= s.year)!;
    const th = takeTheme19(s, a.id, 'film', studio.id, l('Noite Final', 'Final Night'), 500000, 'orig');
    expect('id' in th).toBe(true);
    expect(kinds(s, 'score_hired').length).toBeGreaterThan(0);
    const x = scr19(s).th[0];
    x.prem = s.week;
    const shots0 = cine18(s).log.length;
    scoreMonth19(s);
    expect(x.box).toBeGreaterThan(0);
    expect(cine18(s).log.length).toBeGreaterThan(shots0);
    // prêmio forçado: emitir o fato aplica prestígio
    const art0 = s.player.reputation.artistic;
    emitFact(s, { kind: 'theme_award', actors: [a.id, 'player'], severity: 60, visibility: 'public', tags: ['score19', 'film', 'win', 'good'], text: l('venceu', 'won'), src: 'test' });
    expect(s.player.reputation.artistic).toBeGreaterThan(art0);
    expect(explain18(s, 'sc19.award', { th: x.id })).toBeTruthy();
  });
});

describe('r19 T7 — mercado B: cancel19, insure19, culture19, naming19', () => {
  it('cancelamento 2016: onda, janela, desculpas, cláusula de conduta da marca e do nome da casa', () => {
    const { s, a } = setup('r19-mb-cx', 2016);
    const b = brandsNow19(s, 'license')[0];
    oldRel(s, a, 2015);
    expect(takeAd19(s, a.id, b.id, 'jingle', 200000)).toBeNull();
    const vd = VENUES17.find((d) => venueOpen(s, d) && d.buyable !== false)!;
    v17(s).own.push({ id: vd.id, rep: 50, policy: 'curated', price: 'mid', cond: 80, maint: true, y: s.year, paid: 0, booked: [], total: 0, actId: a.id } as never);
    const tg = targets19(s).find((x) => x.k === 'v')!;
    expect(sellName19(s, 'v', tg.id, nameBrands19(s)[0].id, 3)).toBeNull();
    expect(kinds(s, 'naming_deal').length).toBe(1);
    expect(v17(s).own[0].rep).toBeLessThan(50);
    const cash0 = s.player.cash;
    scandal(s, a.id, 'conduct', 75);
    const w = cx19(s).w.find((x) => x.act === a.id)!;
    expect(w).toBeTruthy();
    expect(kinds(s, 'cancel_wave').length).toBe(1);
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'cx19_wave')).toBe(true);
    expect(calendar19(s, { weeks: 4 }).some((d) => d.id.startsWith('cancel19-'))).toBe(true);
    // cláusulas: campanha cancelada com devolução; nome da casa sai
    expect(ad19(s).runs.every((x) => x.off)).toBe(true);
    expect(s.player.cash).toBeLessThan(cash0);
    expect(kinds(s, 'naming_pulled').length).toBe(1);
    // desculpas dentro da janela: a onda cai
    respond19(s, w.id, 'apology');
    cancelMonth19(s); const peak = w.int;
    cancelMonth19(s);
    expect(w.int).toBeLessThan(peak);
    expect(explain18(s, 'cx19.wave', { wave: w.id })).toBeTruthy();
  });

  it('seguro de pessoa-chave paga na morte e irrita herdeiros; plano de saúde e cultura mexem em equipe e propostas', () => {
    const { s, a } = setup('r19-mb-ins', 1975);
    expect(insureKey19(s, a.id, 2)).toBeNull();
    const pol = ins19(s).pol[0];
    expect(pol.prem).toBeGreaterThan(0);
    const kp = keyPerson19(s, a)!;
    kp.alive = false; kp.died = s.year;
    const cash0 = s.player.cash;
    emitFact(s, { kind: 'death', actors: [kp.id, a.id], severity: 80, visibility: 'public', tags: ['bad'], text: l('morte', 'death'), src: 'test' });
    expect(kinds(s, 'keyman_claim').length).toBe(1);
    expect(s.player.cash - cash0).toBe(pol.cover);
    expect(ins19(s).pol.length).toBe(0);
    expect(setPlan19(s, true)).toBeNull();
    expect(setCulture19(s, 'profit')).toBeNull();
    expect(setCulture19(s, 'artist')).not.toBeNull(); // cooldown de 12 meses (r27 AUD2)
    expect(cul19(s).c).toBe('profit');
    expect(kinds(s, 'culture_shift').length).toBe(1);
    expect(offerMods().some((m) => m.id === 'culture19')).toBe(true);
    expect(offerMods().some((m) => m.id === 'insure19:plan')).toBe(true);
    s.week += 56;
    expect(setCulture19(s, 'artist')).toBeNull();
    expect(cul19(s).c).toBe('artist');
    expect(kinds(s, 'culture_shift').length).toBe(2);
  });

  it('fatos novos têm ouvintes, fluxos de sorteio registrados, nada antes da época', () => {
    const ls = factListeners19();
    for (const k of [...Object.keys(MARKETB19), 'remix_hit', 'white_label', 'dj_residency', 'ad_sync', 'jingle', 'sellout_backlash', 'score_hired', 'needle_drop', 'theme_award'])
      expect(ls.some((x) => x.kind === k), k).toBe(true);
    for (const k of ['remix_hit', 'white_label', 'dj_residency', 'ad_sync', 'jingle', 'sellout_backlash', 'score_hired', 'needle_drop', 'theme_award']) expect(RESERVED19[k], k).toBeTruthy();
    for (const k of ['remix19', 'adsync19', 'score19', 'cancel19', 'culture19']) expect(STREAMS19[k], k).toBeTruthy();
    const { s, a } = setup('r19-mb-era', 1960);
    const rel = oldRel(s, a, 1950);
    expect(remix19(s, rel.id, 'x')).not.toBeNull(); // remix só 1975+
    expect(whiteLabel19(s, rel.id)).not.toBeNull(); // white label só 1985+
    expect(targets19(s).length).toBe(0); // naming rights só 1973+
    for (let i = 0; i < 6; i++) advanceMonth(s);
    expect(cx19(s).w.length).toBe(0); // cancelamento digital só 2010+
    expect(nm19(s).d.length).toBe(0);
  });
});
