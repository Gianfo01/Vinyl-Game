// r27 (SONG) — Mercado de canções: vitrine determinística, faixa estimada, direito de gravar × obra, presentes só com
// laço, licença de cover pagando os autores, riscos (plágio, venda dupla, a canção recusada que vira hit), sem NaN.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceWeek } from '../src/sim/tick';
import '../src/sim/sys';
import { allHolds } from '../src/sim/holds17';
import { bump } from '../src/sim/sys/social8';
import { wr19 } from '../src/sim/sys/writers19';
import { sales } from '../src/sim/sys/songsale';
import { recentFacts } from '../src/sim/facts17';
import {
  acceptGift27, askBlock27, askSong27, buyLot27, giveSong27, coverables27, estimate27, friends27, licenseCover27, licensed27, lots27, mechRate27,
  mkt27, month27, passLot27, sellBlock27, sellable27, settle27, width27, type Lot27,
} from '../src/sim/sys/songmkt27';
import type { Act, GameState, Release, Song } from '../src/sim/types';
import { playerActs } from '../src/sim/util';

const game = (year: number, seed = 'r27song'): GameState => {
  const cfg = defaultConfig(`${seed}-${year}`, { scenario: 'established', startYear: year });
  const s = createGame(cfg);
  s.player.cash = 1e9;
  return s;
};
const myAct = (s: GameState): Act => s.acts[playerActs(s).find((id) => s.acts[id]?.status !== 'retired')!];
/** Lançamento de mentira para a canção (cópias vendidas controladas pelo teste). */
function fakeRelease(s: GameState, so: Song, units: number): Release {
  const base = Object.values(s.releases)[0];
  const rel = { ...base, id: `t${so.id}`, actId: so.actId, songs: [so.id], totalUnits: units, peak: 0, year: s.year, week: s.week, revenue: 0, owner: 'player', title: so.title } as Release;
  s.releases[rel.id] = rel;
  so.releaseId = rel.id; so.recorded = true;
  return rel;
}
const finite = (x: unknown, path = ''): string[] => {
  if (typeof x === 'number') return Number.isFinite(x) ? [] : [path];
  if (x && typeof x === 'object') return Object.entries(x).flatMap(([k, v]) => finite(v, `${path}.${k}`));
  return [];
};

describe('r27 songmkt: vitrine', () => {
  it('é determinística, por época, e a faixa estimada sempre contém a verdade (A&R estreita)', () => {
    const a = game(1962), b = game(1962);
    const la = lots27(a), lb = lots27(b);
    expect(la.length).toBeGreaterThan(3);
    expect(JSON.stringify(la)).toBe(JSON.stringify(lb));
    for (const lot of la) {
      expect(['tinpan', 'brill', 'nashville', 'motown', 'staff', 'npc']).toContain(lot.src);
      const e = estimate27(a, lot);
      expect(e.lo).toBeLessThanOrEqual(lot.q); expect(e.hi).toBeGreaterThanOrEqual(lot.q);
      expect(lot.buy).toBeGreaterThan(lot.fee);
    }
    const w0 = width27(a);
    a.player.staff.push({ id: 'tanr', name: 'Ouvido', role: 'anr', skill: 90, salary: 0, hiredWeek: 0 });
    expect(width27(a)).toBeLessThan(w0);
    for (const lot of la) { const e = estimate27(a, lot); expect(e.lo).toBeLessThanOrEqual(lot.q); expect(e.hi).toBeGreaterThanOrEqual(lot.q); }
    // outra época, outras fontes
    const srcs = new Set([...lots27(game(2005)), ...lots27(game(2005, 'x2')), ...lots27(game(2005, 'x3'))].map((x) => x.src));
    expect(srcs.has('tinpan') || srcs.has('brill')).toBe(false);
  });
});

describe('r27 songmkt: comprar', () => {
  it('direito de gravar paga royalties mecânicos ao autor; obra comprada fica com a edição', () => {
    const s = game(1985);
    const act = myAct(s);
    const lots = lots27(s).filter((x) => !x.sim && !x.dup);
    expect(lots.length).toBeGreaterThan(1);
    const cash0 = s.player.cash;
    const r1 = buyLot27(s, lots[0].id, act.id, 'right');
    const r2 = buyLot27(s, lots[1].id, act.id, 'work');
    expect(r1.ok && r2.ok).toBe(true);
    expect(s.player.cash).toBe(cash0 - lots[0].fee - lots[1].buy);
    const s1 = s.songs[r1.song!], s2 = s.songs[r2.song!];
    expect(act.songs).toContain(s1.id); expect(act.songs).toContain(s2.id);
    expect(s1.recorded).toBe(false); // gravar segue pelo estúdio/agenda
    expect(licensed27(s, s1.id)?.k).toBe('right');
    expect(licensed27(s, s2.id)).toBeUndefined();
    expect(sellBlock27(s, s1.id)).not.toBeNull(); // não pode vender o que não é seu
    expect(sellBlock27(s, s2.id)).toBeNull();
    expect(sellable27(s).map((x) => x.id)).toContain(s2.id);
    const w1 = s1.writers[0], w2 = s2.writers[0];
    expect(s.persons[w1]).toBeTruthy();
    const pc1 = s.personalCash[w1] ?? 0, pc2 = s.personalCash[w2] ?? 0, c1 = s.player.cash;
    fakeRelease(s, s1, 10000); fakeRelease(s, s2, 10000);
    settle27(s);
    const d1 = mkt27(s).deals.find((d) => d.song === s1.id)!, d2 = mkt27(s).deals.find((d) => d.song === s2.id)!;
    const cents = mechRate27(s).cents;
    expect(cents).toBeCloseTo(mechRate27(s).compulsory ? 4 : 4.4, 5); // 1985 EUA: 4¢ por cópia (fora: tabela da sociedade)
    expect(d1.paid).toBe(Math.round(10000 * cents));
    expect(d2.paid).toBe(0);
    expect(s.player.cash).toBe(c1 - d1.paid);
    expect((s.personalCash[w1] ?? 0) - pc1).toBe(Math.round(d1.paid * 0.5));
    expect(s.personalCash[w2] ?? 0).toBe(pc2);
    // só as cópias novas pagam
    settle27(s);
    expect(d1.paid).toBe(Math.round(10000 * cents));
    s.releases[s1.releaseId!].totalUnits += 500;
    s.week += 5; s.month = (s.month % 12) + 1;
    settle27(s);
    expect(d1.paid).toBe(Math.round(10000 * cents) + Math.round(500 * cents));
  });
  it('caixa insuficiente bloqueia e não muda nada', () => {
    const s = game(1985);
    s.player.cash = 0;
    const lot = lots27(s)[0];
    const n = Object.keys(s.songs).length;
    const r = buyLot27(s, lot.id, myAct(s).id, 'work');
    expect(r.ok).toBe(false);
    expect(Object.keys(s.songs).length).toBe(n);
  });
});

describe('r27 songmkt: ganhar de outros artistas', () => {
  it('pedir canção exige laço; com laço, vira dívida de favor e a canção chega em Ofertas', () => {
    const s = game(1985);
    const act = myAct(s);
    const stranger = Object.values(s.acts).find((a) => a.owner !== 'player' && !a.playerBand && a.status === 'active' && !friends27(s).some((f) => f.act === a.id))!;
    expect(askSong27(s, stranger.id, act.id).ok).toBe(false);
    expect(askBlock27(s, undefined)).not.toBeNull();
    // cria amizade entre os integrantes
    const me = act.members.find((id) => s.persons[id]?.alive)!, them = stranger.members.find((id) => s.persons[id]?.alive)!;
    bump(s, me, them, 60, 'scene', 'friend');
    const f = friends27(s).find((x) => x.act === stranger.id && x.mine === act.id);
    expect(f).toBeTruthy();
    expect(f!.bond).toBeGreaterThanOrEqual(25);
    expect(askBlock27(s, f)).toBeNull();
    const res = askSong27(s, stranger.id, act.id);
    const lead = s.persons[stranger.leaderId ?? stranger.members[0]].id;
    expect(allHolds(s).some((h) => h.holder === lead && h.target === 'player' && h.kind === 'debt' && h.status === 'open')).toBe(true);
    expect(askBlock27(s, friends27(s).find((x) => x.act === stranger.id))).not.toBeNull(); // não dá para pedir de novo já
    if (res.ok) {
      const g = mkt27(s).gifts.find((x) => x.from === stranger.id)!;
      const n = act.songs.length;
      const acc = acceptGift27(s, g.id);
      expect(acc.ok).toBe(true);
      expect(act.songs.length).toBe(n + 1);
      expect(licensed27(s, acc.song!)?.k).toBe('gift'); // a obra fica com quem deu
    }
  });
  it('dar uma canção deixa o outro te devendo; cobrar o favor traz uma canção de volta', () => {
    const s = game(1985);
    const act = myAct(s);
    const r = buyLot27(s, lots27(s).find((x) => !x.sim && !x.dup)!.id, act.id, 'work');
    const friend = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player' && !a.playerBand && a.status === 'active' && a.fame > 10)!;
    const g = giveSong27(s, r.song!, friend.id);
    expect(g.ok).toBe(true);
    const lead = s.persons[friend.leaderId ?? friend.members[0]].id;
    expect(allHolds(s).some((h) => h.holder === 'player' && h.target === lead && h.kind === 'favor' && h.status === 'open')).toBe(true);
    expect(sales(s).sales.some((x) => x.songId === r.song && x.fee === 0)).toBe(true); // presente: sem cachê, royalties seguem
    const me = act.members.find((id) => s.persons[id]?.alive)!;
    bump(s, me, friend.members.find((id) => s.persons[id]?.alive)!, 60, 'scene', 'friend');
    const ask = askSong27(s, friend.id, act.id);
    expect(ask.ok).toBe(true);
    const gift = mkt27(s).gifts.find((x) => x.from === friend.id)!;
    expect(gift).toBeTruthy();
    const n = act.songs.length;
    const acc = acceptGift27(s, gift.id);
    expect(acc.ok).toBe(true);
    expect(act.songs.length).toBe(n + 1);
    expect(licensed27(s, acc.song!)?.k).toBe('gift');
  });
  it('sem laço nenhum, o mês não traz presentes', () => {
    const s = game(1985);
    (s.x4 as unknown as { social8: { ties: unknown[] } }).social8.ties = [];
    for (const id of playerActs(s)) for (const rid of s.acts[id].releases) for (const sid of s.releases[rid]?.songs ?? []) { const so = s.songs[sid]; if (so) { so.writers = so.writers.filter((w) => s.acts[id].members.includes(w)); so.producerId = undefined; } }
    expect(friends27(s).length).toBe(0);
    for (let i = 0; i < 24; i++) { s.week += 4; s.month = (s.month % 12) + 1; month27(s); }
    expect(mkt27(s).gifts.length).toBe(0);
  });
});

describe('r27 songmkt: licenças (covers)', () => {
  it('a licença de cover põe a canção no repertório e paga royalties aos autores originais', () => {
    const s = game(1985);
    const act = myAct(s);
    const cv = coverables27(s).find((x) => !x.pd && x.song.writers.some((w) => s.persons[w] && !s.persons[w].isPlayer));
    expect(cv).toBeTruthy();
    const w = cv!.song.writers.find((x) => s.persons[x])!;
    const res = licenseCover27(s, cv!.song.id, act.id);
    expect(res.ok).toBe(true);
    const so = s.songs[res.song!];
    expect(so.coverOf).toBe(cv!.song.id);
    expect(act.songs).toContain(so.id);
    const pc = s.personalCash[w] ?? 0;
    fakeRelease(s, so, 20000);
    settle27(s);
    const d = mkt27(s).deals.find((x) => x.song === so.id)!;
    expect(d.k).toBe('cover');
    expect(d.paid).toBe(Math.round(20000 * mechRate27(s).cents));
    expect((s.personalCash[w] ?? 0)).toBeGreaterThan(pc);
  });
  it('regras por época: licença compulsória dos EUA desde 1909 e a taxa sobe', () => {
    const a = game(1962), b = game(2010);
    a.config.homeCity = 'new_york'; b.config.homeCity = 'new_york';
    const ra = mechRate27(a), rb = mechRate27(b);
    expect(ra.compulsory && rb.compulsory).toBe(true);
    expect(ra.cents).toBe(2);
    expect(rb.cents).toBe(9.1);
    a.config.homeCity = 'sao_paulo';
    expect(mechRate27(a).compulsory).toBe(false);
  });
});

describe('r27 songmkt: riscos', () => {
  const setup = (mut: (lot: Lot27, s: GameState) => void) => {
    const s = game(1985);
    const act = myAct(s);
    const lot = lots27(s)[0];
    mut(lot, s);
    const r = buyLot27(s, lot.id, act.id, 'right');
    expect(r.ok).toBe(true);
    return { s, act, so: s.songs[r.song!], d: mkt27(s).deals.at(-1)! };
  };
  it('canção parecida com outra: ao lançar, abre processo de plágio', () => {
    const { s, so, d } = setup((lot) => { lot.sim = 1; delete lot.dup; });
    expect(d.sim).toBe(1);
    const n = wr19(s).suits.length;
    fakeRelease(s, so, 100);
    month27(s);
    expect(d.plag).toBe(1);
    expect(wr19(s).suits.length).toBe(n + 1);
  });
  it('venda dupla: quem não lança a tempo vê o outro ato lançar primeiro', () => {
    const { s, so, d } = setup((lot, st) => { delete lot.sim; lot.dup = Object.values(st.acts).find((a) => a.owner && a.owner !== 'player' && !a.playerBand && a.status === 'active' && a.fame >= 20)!.id; });
    expect(d.dup).toBeTruthy();
    const other = s.acts[d.dup!.act];
    s.week = d.dup!.due;
    const n = other.songs.length;
    month27(s);
    expect(d.dup!.done).toBe(1);
    expect(other.songs.length).toBe(n + 1);
    expect(s.songs[other.songs.at(-1)!].title).toBe(so.title);
  });
  it('a canção que você recusou vira hit na voz de outro (fato)', () => {
    const s = game(1985);
    const st = mkt27(s);
    st.passed.push({ t: 'Canção Perdida', q: 80, wn: 'Fulano', g: myAct(s).genre, w: s.week, due: s.week });
    month27(s);
    const p = st.passed.find((x) => x.t === 'Canção Perdida')!;
    expect(p.rel).toBeTruthy();
    s.releases[p.rel!].peak = 3;
    s.week += 4; s.month = (s.month % 12) + 1;
    month27(s);
    expect(p.told).toBe(1);
    expect(recentFacts(s, { kind: 'deal', months: 2, limit: 30 }).some((f) => f.tags.includes('missed'))).toBe(true);
  });
  it('passar uma canção a tira da vitrine', () => {
    const s = game(1985);
    const lot = lots27(s)[0];
    passLot27(s, lot.id);
    expect(lots27(s).some((x) => x.id === lot.id)).toBe(false);
  });
});

describe('r27 songmkt: simulação', () => {
  it('semanas seguidas sem NaN, mesma semente = mesmo estado do mercado', () => {
    const run = () => {
      const s = game(2010, 'sim');
      for (let i = 0; i < 10; i++) advanceWeek(s);
      return s;
    };
    const a = run(), b = run();
    expect(finite(mkt27(a))).toEqual([]);
    expect(JSON.stringify(mkt27(a))).toBe(JSON.stringify(mkt27(b)));
    expect(mkt27(a).lots.length).toBeGreaterThan(0);
  });
});
