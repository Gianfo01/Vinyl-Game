// r27 (AUD1) — casas de shows num modelo só (lista, teto e fechamento únicos), festival único (fest12 manda; o negócio
// de Empreendimentos só espelha) e o bot jogador tocando os negócios (salas da sede, estúdio, editora, casa, festival).
import { builtVenue, realVenues } from '../src/sim/sys/venuestore27';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { advanceMonth } from '../src/sim/tick';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import type { GameState } from '../src/sim/types';
import { buyVenue, liveOf } from '../src/sim/sys/live';
import { buyVenue17, marketVenues } from '../src/sim/sys/venues17';
import { MAX_VENUES27, myVenues27, venueCount27 } from '../src/sim/sys/venues27';
import { addNight12 } from '../src/sim/sys/venue12';
import { foundVenture, ventures } from '../src/sim/sys/ventures9';
import { festOf, sync12 } from '../src/sim/sys/fest12';
import { freshLogBiz27, playBiz27 } from '../src/sim/botbiz27';
import { rng19 } from '../src/sim/rng19';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
function rich(seed: string, startYear = 1985, acts = 3) {
  const s = createGame(defaultConfig(seed, { startYear }));
  const r = rng19(s, 'act');
  for (let i = 0; i < acts; i++) {
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 25 + i * 5 });
    acceptOffer(s, act, { ...defaultOffer(s, act), id: `o${i}`, week: 0, status: 'pending', advance: 0 });
  }
  s.player.cash += 50_000_000_00;
  s.player.initialCash += 50_000_000_00;
  return s;
}
const monthPosts = (s: GameState, w0: number) => s.ledger.filter((x) => x.week >= w0);

describe('r27 AUD1 — casas de shows num modelo só', () => {
  it('lista única (construída + reais) com a chave do mapa, teto único de 4 e um fechamento por casa', () => {
    const s = rich('aud1-venue', 1980);
    const club = buyVenue(s, 'club', s.config.homeCity, 'Clube Teste');
    expect('kind' in club).toBe(true);
    expect(addNight12(s, { k: 'original', day: 'fri', deal: 'door' })).toBeNull();
    const reais = marketVenues(s).filter((d) => d.buyable !== false).slice(0, 3);
    for (const d of reais) expect(buyVenue17(s, d.id)).toBeNull();
    expect(venueCount27(s)).toBe(Math.min(MAX_VENUES27, 1 + reais.length));
    const extra = marketVenues(s).find((d) => d.buyable !== false && !realVenues(s).some((o) => o.id === d.id));
    if (venueCount27(s) >= MAX_VENUES27 && extra) expect(buyVenue17(s, extra.id)).not.toBeNull();
    const keys = myVenues27(s).map((v) => v.key);
    expect(keys).toContain('lv:venue');
    for (const o of realVenues(s)) expect(keys).toContain(`ve:${o.id}`);
    const w0 = s.week;
    advanceMonth(s);
    const posts = monthPosts(s, w0);
    // a casa construída lança UMA receita e UM custo (base + programação juntas); nada das linhas antigas
    expect(posts.filter((x) => x.key.endsWith(':venue27:rev')).length).toBe(1);
    expect(posts.filter((x) => x.key.endsWith(':venue27:cost')).length).toBe(1);
    expect(posts.some((x) => /:(venue:rev|venue:cost|v12:rev|v12:cost)$/.test(x.key))).toBe(false);
    expect(posts.filter((x) => x.key.includes(':v17m:')).length).toBe(realVenues(s).length);
    // o histórico da casa mostra o resultado inteiro
    const h = builtVenue(s)!.history.at(-1)!;
    expect(h.revenue).toBe(posts.find((x) => x.key.endsWith(':venue27:rev'))!.amount);
    for (const v of myVenues27(s)) { expect(Number.isFinite(v.rep) && Number.isFinite(v.cond)).toBe(true); expect(v.last).toBeTruthy(); }
    invariant(s);
  });
});

describe('r27 AUD1 — festival único', () => {
  it('o negócio de Empreendimentos espelha o terreno (uma direção só) e não tem line-up próprio', () => {
    const s = rich('aud1-fest', 1985);
    expect(foundVenture(s, 'festival', 'label')).toBeNull();
    const v = ventures(s).list.find((x) => x.kind === 'festival')!;
    sync12(s);
    const f = festOf(s, v.fx!)!;
    expect('lineup' in v).toBe(false);
    const m0 = f.month;
    v.month = (m0 + 5) % 12; // mexer no espelho não muda o festival
    sync12(s);
    expect(f.month).toBe(m0);
    expect(v.month).toBe(m0);
    invariant(s);
  });
});

describe('r27 AUD1 — bot nos negócios', () => {
  it('com caixa folgado, o perfil equilibrado compra sala, casa, editora, estúdio e funda um festival — sem quebrar o caixa', () => {
    const s = rich('aud1-bot', 1985);
    const L = freshLogBiz27();
    for (let m = 0; m < 30; m++) {
      playBiz27(s, 'balanced', { cash: s.player.cash, burn: 1_000_000, cut: 2.5 }, L);
      advanceMonth(s);
    }
    expect(L.rooms).toBeGreaterThan(0);
    expect(L.venue).toBeGreaterThan(0);
    expect(L.publisher).toBeGreaterThan(0);
    expect(L.studio).toBeGreaterThan(0);
    expect(L.festival).toBeGreaterThan(0);
    expect(myVenues27(s).length).toBeGreaterThan(0);
    expect(liveOf(s).fests.length).toBe(1);
    invariant(s);
  });

  it('perfil cauteloso não abre negócios; sem caixa, nada é comprado', () => {
    const s = rich('aud1-bot2', 1985);
    const L = freshLogBiz27();
    for (let m = 0; m < 14; m++) { playBiz27(s, 'cautious', { cash: s.player.cash, burn: 1_000_000, cut: 4 }, L); advanceMonth(s); }
    expect(Object.values(L).every((x) => x === 0)).toBe(true);
    const p = createGame(defaultConfig('aud1-bot3', { startYear: 1985 }));
    const L2 = freshLogBiz27();
    for (let m = 0; m < 14; m++) { playBiz27(p, 'balanced', { cash: p.player.cash, burn: Math.max(1, p.player.cash), cut: 2.5 }, L2); advanceMonth(p); }
    expect(L2.venue + L2.studio + L2.publisher + L2.festival + L2.rooms).toBe(0);
  });
});
