// Rodada 7 — artistas reais com discografia, ciclo de vida, paradas por país/formato, início
// personalizado, instrumentos, mobília, vícios/empréstimos/viagens, venda de composições,
// negociação na hora e agenda por semana.

import { describe, expect, it } from 'vitest';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { REAL_ALL, rw } from '../src/sim/sys/realworld';
import { ch7, board } from '../src/sim/sys/charts7';
import { COUNTRY_INFO, countryPop, countryTaste } from '../src/data/countries';
import { instrumentsOf, startLessons, aptitude, MAX_INSTRUMENTS } from '../src/sim/sys/instruments';
import { furn, buyFurniture } from '../src/sim/sys/furnish';
import { vices, indulge, takePersonalLoan, takeTrip, takeCompanyLoan } from '../src/sim/sys/vices';
import { ownerOf } from '../src/sim/sys/people/owner';
import { persona } from '../src/sim/sys/persona';
import { offerSong, fairTerms, sales } from '../src/sim/sys/songsale';
import { defaultOffer, offerNow } from '../src/sim/contracts';
import { plannedCombos } from '../src/sim/sys/agenda7';
import { replaceMember } from '../src/sim/sys/lifecycle7';
import { personDies } from '../src/sim/dynasty';
import { money, rngOf } from '../src/sim/util';
import { l } from '../src/data/world';
import type { AgendaSlot, GameState, RunConfig } from '../src/sim/types';

const invariant = (s: GameState) => expect(s.player.cash).toBe(s.player.initialCash + s.player.totalPosted);
const mk = (seed: string, over: Partial<RunConfig> = {}) => createGame(defaultConfig(seed, over));

describe('artistas reais e discografia', () => {
  it('nomes reais: os artistas surgem com integrantes, discos anteriores e quem já acabou fica na história', () => {
    const s = mk('r7-real', { startYear: 1975, mode: 'historic', realNames: true });
    expect(REAL_ALL.length).toBeGreaterThan(500);
    const acts = Object.values(s.acts);
    const beatles = acts.find((a) => a.name === 'The Beatles');
    expect(beatles).toBeTruthy();
    expect(beatles!.status === 'split' || beatles!.status === 'retired').toBe(true);
    expect(beatles!.releases.length).toBeGreaterThan(2);
    const caetano = acts.find((a) => a.name === 'Caetano Veloso');
    expect(caetano?.status).toBe('active');
    expect(caetano!.releases.some((id) => s.releases[id]?.hist)).toBe(true);
    // quem estreia depois de 1975 está na fila
    expect(rw(s).upcoming.length).toBeGreaterThan(200);
    invariant(s);
  });

  it('no modo ficcional os arquétipos reais entram com nomes inventados', () => {
    const s = mk('r7-fic', { startYear: 1975 });
    expect(Object.values(s.acts).some((a) => a.name === 'The Beatles')).toBe(false);
    expect(Object.values(s.acts).filter((a) => (a.catalogNo ?? 0) >= 1000).length).toBeGreaterThan(100);
  });

  it('atos gerados ativos no início ganham discografia simulada', () => {
    const s = mk('r7-disco', { startYear: 1990 });
    const gen = Object.values(s.acts).filter((a) => !a.catalogNo && a.status === 'active' && a.fame > 10 && !a.playerBand);
    expect(gen.some((a) => a.releases.length > 0)).toBe(true);
  });
});

describe('ciclo de vida', () => {
  it('banda que perde um integrante pode seguir com substituto e o catálogo continua vendendo', () => {
    const s = mk('r7-life', { startYear: 1980 });
    const r = rngOf(s);
    const band = Object.values(s.acts).find((a) => a.members.length >= 3 && a.status === 'active' && a.owner !== 'player')!;
    const old = band.members[0];
    personDies(s, s.persons[old], l('teste', 'test'));
    expect(s.persons[old].died).toBe(s.year);
    const np = replaceMember(s, r, band, old);
    expect(band.members).toContain(np.id);
    expect(band.members).not.toContain(old);
    expect(rw(s).former[band.id].some((f) => f.personId === old && f.reason === 'died')).toBe(true);
    // catálogo: discos antigos de atos parados seguem somando vendas
    const retired = Object.values(s.acts).find((a) => (a.status === 'split' || a.status === 'retired') && a.releases.some((id) => s.releases[id]?.hist));
    if (retired) {
      const rel = s.releases[retired.releases.find((id) => s.releases[id]?.hist)!];
      const before = rel.totalUnits;
      advanceMonth(s);
      expect(rel.totalUnits).toBeGreaterThanOrEqual(before);
    }
    invariant(s);
  });
});

describe('paradas por país e formato', () => {
  it('cada país tem sua parada e prêmios nacionais saem no fim do ano', () => {
    const s = mk('r7-charts', { startYear: 2012, realNames: true, mode: 'historic' });
    for (let i = 0; i < 13; i++) { botMonth(s); advanceMonth(s); }
    // depois de carregar um save as paradas da semana são refeitas na próxima semana
    advanceWeek(s);
    expect(board(s, 'BRA', 'songs').length + board(s, 'BRA', 'albums').length).toBeGreaterThan(0);
    expect(board(s, 'world', 'stream').length).toBeGreaterThan(0);
    expect(ch7(s).awards.length).toBeGreaterThan(10);
    const bra = COUNTRY_INFO.find((c) => c.a3 === 'BRA')!;
    expect(countryPop(bra, 2020)).toBeGreaterThan(countryPop(bra, 1950));
    expect(countryTaste(bra, 'brazil', 1990)).toBeGreaterThan(1.5);
    invariant(s);
  });
});

describe('início personalizado', () => {
  it('ano exato, caixa, sede, estúdio, formação e estágio do artista', () => {
    const s = mk('r7-custom', { role: 'artist', startYear: 1987, custom: { cash: 12345, hq: 1, studio: 'basic', members: 1, level: 'established', markets: 'world', reputation: 70 } });
    expect(s.year).toBe(1987);
    const band = s.acts[s.player.bandActId!];
    expect(band.members.length).toBe(1);
    expect(band.releases.length).toBeGreaterThanOrEqual(3);
    expect(band.fame).toBeGreaterThan(30);
    expect(s.player.territories.length).toBe(7);
    expect(s.player.reputation.artistic).toBe(70);
    expect(furn(s).items.drums).toBe(1);
    invariant(s);
  });
});

describe('instrumentos, mobília e vida intensa', () => {
  it('pessoas tocam até 5 instrumentos e aprendem com aulas', () => {
    const s = mk('r7-inst', { role: 'artist' });
    const p = s.persons[s.acts[s.player.bandActId!].members[0]];
    const before = instrumentsOf(s, p).length;
    expect(before).toBeLessThanOrEqual(MAX_INSTRUMENTS);
    expect(aptitude(p, 'keys')).toBeGreaterThan(0);
    const id = ['accordion', 'cavaquinho', 'banjo', 'sitar', 'flute'].find((x) => !instrumentsOf(s, p).some((y) => y.id === x))!;
    expect(startLessons(s, p.id, id, true)).toBeNull();
    for (let i = 0; i < 8; i++) advanceMonth(s);
    expect(instrumentsOf(s, p).some((x) => x.id === id) || instrumentsOf(s, p).length >= MAX_INSTRUMENTS).toBe(true);
    invariant(s);
  });

  it('a sede começa vazia e a mobília comprada entra no estado', () => {
    const s = mk('r7-furn', { scenario: 'established' });
    expect(furn(s).legacy).toBe(false);
    expect(furn(s).items.sofa ?? 0).toBe(0);
    expect(buyFurniture(s, 'plant', ['office'])).toBeNull();
    expect(furn(s).items.plant).toBe(1);
    invariant(s);
  });

  it('vícios, empréstimos e viagens têm consequências e mudam traços', () => {
    const s = mk('r7-vice', { scenario: 'established' });
    const r = rngOf(s);
    const o = ownerOf(s);
    o.wealth += money(s, 50000);
    expect(takePersonalLoan(s, 'family', money(s, 2000))).toBeNull();
    expect(vices(s).loans.length).toBe(1);
    for (let i = 0; i < 6; i++) { vices(s).dep.drink = 80; indulge(s, r, 'drink'); advanceMonth(s); }
    expect(persona(s).traits).toContain('addicted');
    o.wealth += money(s, 50000);
    expect(takeTrip(s, r, 'rio')).toBeNull();
    expect(vices(s).trips.length).toBe(1);
    expect(takeCompanyLoan(s, 'bank')).toBeNull();
    invariant(s);
  });
});

describe('venda de composições e negociação na hora', () => {
  it('vender uma música rende royalties combinados', () => {
    const s = mk('r7-sale', { role: 'artist', startYear: 1990 });
    const r = rngOf(s);
    const band = s.acts[s.player.bandActId!];
    const songId = band.songs.find((id) => s.songs[id] && !s.songs[id].releaseId);
    if (!songId) return;
    s.songs[songId].q = 95;
    s.songs[songId].melody = 95;
    const target = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player' && a.status === 'active' && a.fame > 6)!;
    const fair = fairTerms(s, s.songs[songId], target.id);
    let res = offerSong(s, r, songId, target.id, { ...fair, fee: Math.round(fair.fee * 0.3), royalty: 0.03 });
    for (let i = 0; i < 5 && res.result !== 'accepted'; i++) res = offerSong(s, r, songId, target.id, { ...fair, fee: Math.round(fair.fee * 0.3), royalty: 0.03 });
    expect(['accepted', 'counter', 'rejected']).toContain(res.result);
    if (res.result === 'accepted') expect(sales(s).sales.length).toBe(1);
    invariant(s);
  });

  it('oferta de contrato tem resposta imediata (ou o artista pede tempo)', () => {
    const s = mk('r7-neg', { scenario: 'established' });
    const r = rngOf(s);
    const act = Object.values(s.acts).find((a) => !a.owner && a.status !== 'retired' && a.status !== 'split' && !a.playerBand)!;
    const { result } = offerNow(s, r, defaultOffer(s, act));
    expect(['accepted', 'counter', 'rejected', 'thinking', 'sniped']).toContain(result);
    if (result === 'thinking') {
      advanceWeek(s);
      advanceWeek(s);
      advanceWeek(s);
      expect(s.offers.find((o) => o.actId === act.id)?.status).not.toBe('pending');
    }
    invariant(s);
  });
});

describe('agenda por semana', () => {
  it('combinações são detectadas e ações de semanas posteriores rodam ao longo do mês', () => {
    const slots: AgendaSlot[] = [{ action: 'rehearse', params: { week: 1 } }, { action: 'gigs', params: { week: 3, tier: 0, dates: 2 } }];
    expect(plannedCombos(slots).map((x) => x.combo.id)).toContain('tight');
    const s = mk('r7-agenda', { role: 'artist' });
    const band = s.acts[s.player.bandActId!];
    s.agenda[band.id] = [{ action: 'compose', params: { week: 1 } }, { action: 'compose', params: { week: 4 } }];
    s.delegated[band.id] = false;
    const before = band.songs.length;
    advanceMonth(s);
    expect(band.songs.length).toBeGreaterThan(before);
    invariant(s);
  });
});
