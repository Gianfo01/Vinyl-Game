// R31 · UNI-4 — fusões grandes da onda 4: cada assunto com UMA fonte (cidade, segredos, festival, casa de shows, turnê,
// empresário, rivais) e as ligações novas (estilo em alta pelas paradas, sua rádio como estação, sua plataforma como
// fonte de descoberta). Testes de comportamento: o que a regra não mudou continua igual; os estados antigos sumiram.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { runSimHooks } from '../src/sim/ext4';
import { Rng } from '../src/core/rng';
import { setSw } from '../src/sim/r31/switches';
import { CITY_REL0, cityRel, cityRelAdd, cityRels } from '../src/sim/city';
import { rel as rel12, bookRoute, defaultStop, openPromoter, shows12, addShow12, cancelShow } from '../src/sim/sys/tour12';
import { relOf as relOf8 } from '../src/sim/sys/route8';
import { STYLES, hotStyle } from '../src/sim/sys/studio12';
import { trends17 } from '../src/sim/sys/trends17';
import { foundVenture, ventures, clientTrust9, addClientTrust9 } from '../src/sim/sys/ventures9';
import { radio18, spins18 } from '../src/sim/sys/radio18';
import { medOf, setSlot } from '../src/sim/sys/media12';
import { mixOf18, ownPlatShare18 } from '../src/sim/sys/stream18';
import { sec23, secById23, expose23 } from '../src/sim/sys/secrets23';
import { addDossier, dossiers, secKnown, secOwner } from '../src/sim/sys/people/secrets';
import { knownSecrets, plantSecret } from '../src/sim/sys/intrigue';
import { allHolds, grantHold, holds17, useHold } from '../src/sim/holds17';
import { c12 } from '../src/sim/sys/manager12';
import { buyVenue } from '../src/sim/sys/live/venue';
import { VENUES17, buyVenue17, venueOpen } from '../src/sim/sys/venues17';
import { BUILT27, builtVenue, houses27, realVenues } from '../src/sim/sys/venuestore27';
import { addNight12, v12 } from '../src/sim/sys/venue12';
import { myVenues27 } from '../src/sim/sys/venues27';
import { createFestival } from '../src/sim/sys/live/festival';
import { f12 } from '../src/sim/sys/fest12';
import { editions8, fests31, ownFests } from '../src/sim/sys/feststore';
import { tourList } from '../src/sim/tours';
import { rivalOf, rivals31 } from '../src/sim/sys/rivalstore';
import { mind18 } from '../src/sim/sys/rivalmind18';
import { grudge27 } from '../src/sim/sys/rivals27';
import { l } from '../src/data/world';
import type { GameState } from '../src/sim/types';

const mk = (seed: string, year: number): GameState => { const s = createGame(defaultConfig(seed, { startYear: year })); s.player.cash += 5_000_000_000; return s; };
const x4 = (s: GameState) => s.x4 as unknown as Record<string, unknown>;
const src = (f: string) => readFileSync(f, 'utf8');

describe('UNI-4 · relação com a praça (city.ts)', () => {
  it('um número por cidade, padrão 30, lido igual pelos três sistemas', () => {
    const s = mk('uni4-city', 1975);
    const c = s.config.homeCity;
    expect(cityRel(s, c)).toBe(CITY_REL0);
    expect(rel12(s, c)).toBe(30);
    expect(relOf8(s, c)).toBe(30); // route8 começava em 50: agora a mesma praça
    cityRelAdd(s, c, 12);
    expect(rel12(s, c)).toBe(42);
    expect(relOf8(s, c)).toBe(42);
    expect(cityRels(s)[c]).toBe(42);
  });
  it('mesma regra de antes: esfria 1% ao mês para 30 e cancelar show do promotor custa 3', () => {
    const s = mk('uni4-city2', 1975);
    const c = s.config.homeCity;
    cityRelAdd(s, c, 20); // 50
    runSimHooks('month', s, Rng.fromSeed('uni4-1'));
    expect(cityRel(s, c)).toBeCloseTo(50 + (30 - 50) * 0.01, 6);
    const act = Object.values(s.acts).find((a) => a.members.length && a.status !== 'retired')!;
    const sh = addShow12(s, { ...defaultStop(s, act, c, s.week + 5), id: 'shU', actId: act.id, by: 'promoter', rate: 0, deposit: 0 });
    const r0 = cityRel(s, c);
    expect(cancelShow(s, sh.id)).toBeNull();
    expect(cityRel(s, c)).toBeCloseTo(r0 - 3, 6);
  });
  it('os três campos antigos saíram e ninguém escreve a relação fora do city.ts', () => {
    const s = mk('uni4-city3', 1975);
    expect((x4(s).tour12 as Record<string, unknown>).rel).toBeUndefined();
    expect((x4(s).route8 as Record<string, unknown>).rel).toBeUndefined();
    expect((x4(s).exch20 as Record<string, unknown>).rel).toBeUndefined();
    for (const f of ['src/sim/sys/tour12.ts', 'src/sim/sys/route8.ts', 'src/sim/sys/exch20.ts', 'src/sim/sys/live18.ts', 'src/sim/sys/live19.ts', 'src/sim/sys/deleg16.ts']) {
      expect(src(f)).not.toMatch(/\.rel\[[^\]]+\]\s*=/);
    }
  });
});

describe('UNI-4 · estilo em alta, rádio e plataforma (uni4.links)', () => {
  it('estilo em alta sai das paradas; desligado volta ao sorteio de 3 em 3 anos', () => {
    const s = mk('uni4-hot', 1980);
    trends17(s).share = { edm: 0.7, hard_rock: 0.1 };
    expect(hotStyle(s)).toBe('experimental');
    trends17(s).share = { hard_rock: 0.6, edm: 0.2 };
    expect(hotStyle(s)).toBe('raw');
    setSw(s, 'uni4.links', false);
    expect(hotStyle(s)).toBe(STYLES[Math.floor(Rng.fromSeed(`${s.config.seed}:hot12:${Math.floor(s.year / 3)}`).next() * 4)]);
  });
  it('sua rádio vira estação com dono e toca o último disco dos artistas escalados', () => {
    const s = mk('uni4-radio', 1975);
    expect(foundVenture(s, 'media', 'label', { media: 'radio', name: 'Rádio Teste' })).toBeNull();
    const v = ventures(s).list.find((x) => x.kind === 'media')!;
    // um ato seu com disco recente (o mundo inicial pode não ter: adota um lançamento recente de um ato qualquer)
    const rel0 = Object.values(s.releases).filter((r) => s.acts[r.actId]?.members.length).sort((x, y) => y.week - x.week)[0];
    const act = s.acts[rel0.actId];
    act.owner = 'player'; rel0.owner = 'player'; rel0.week = s.week - 2;
    runSimHooks('month', s, Rng.fromSeed('uni4-2'));
    const st = radio18(s).st.find((x) => x.own === v.id);
    expect(st).toBeDefined();
    expect(st!.call).toBe('Rádio Teste');
    medOf(s, v.id);
    setSlot(s, v.id, 0, 'rotation', act.id);
    const rid = act.releases.slice().reverse().find((id) => s.releases[id]?.owner === 'player' && s.week - s.releases[id].week <= 30);
    runSimHooks('month', s, Rng.fromSeed('uni4-3'));
    if (rid) expect(spins18(s, rid)).toBeGreaterThan(0);
    // desligado: a rádio própria não é estação
    setSw(s, 'uni4.links', false);
    runSimHooks('month', s, Rng.fromSeed('uni4-4'));
    expect(radio18(s).st.some((x) => x.own)).toBe(false);
  });
  it('sua plataforma é fonte de descoberta dos seus discos (só no streaming)', () => {
    const s = mk('uni4-plat', 2016);
    expect(ownPlatShare18(s)).toBe(0);
    expect(foundVenture(s, 'platform', 'label', { name: 'Plataforma Teste' })).toBeNull();
    const v = ventures(s).list.find((x) => x.kind === 'platform')!;
    v.subs = 600_000;
    expect(ownPlatShare18(s)).toBeCloseTo(0.4 > 0.35 ? 0.35 : 0.4, 6);
    const rel = Object.values(s.releases).find((r) => r.owner === 'player');
    if (rel) expect(mixOf18(s, rel).own ?? 0).toBeGreaterThan(0);
    setSw(s, 'uni4.links', false);
    expect(ownPlatShare18(s)).toBe(0);
  });
});

describe('UNI-4 · segredos: secrets23 é o único depósito', () => {
  it('dossiê, intriga e trunfo do livro nascem no secrets23; holds17 guarda só o uso', () => {
    const s = mk('uni4-sec', 1975);
    expect((x4(s).people as Record<string, unknown>).secrets).toBeUndefined();
    expect((x4(s).intrigue as Record<string, unknown>).secrets).toBeUndefined();
    const a = Object.values(s.acts).find((x) => !x.catalogNo && x.owner !== 'player' && x.members.length && x.status !== 'retired')!;
    const pid = a.members[0];
    const d = addDossier(s, pid, 'tax', 2, true);
    expect(sec23(s).own.some((x) => x.id === d.id && x.src === 'people')).toBe(true);
    expect(dossiers(s).some((x) => x.id === d.id && secOwner(x) === pid)).toBe(true);
    expect(secKnown(s, d)).toBe(true);
    const ig = plantSecret(s, { kind: 'act', id: a.id }, 'affair', true);
    expect(sec23(s).own.some((x) => x.id === ig.id && x.src === 'intrigue')).toBe(true);
    expect(knownSecrets(s).some((x) => x.id === ig.id)).toBe(true);
    const h = grantHold(s, { holder: 'player', target: a.id, kind: 'secret', strength: 50, text: l('Trunfo', 'Leverage'), src: 'press18' });
    expect(h.ref).toBeDefined();
    expect(sec23(s).own.find((x) => x.id === h.ref)?.src).toBe('holds');
    // usar a chantagem: o uso fica no holds17 apontando para o segredo
    const vh = allHolds(s).find((x) => x.src === 'intrigue' && x.ref === ig.id)!;
    expect(useHold(s, vh.id, 'blackmail').ok).toBe(true);
    expect(holds17(s).su[ig.id]?.n).toBe(1);
  });
  it('segredo da Intriga agora vaza pela camada única (imprensa expõe com os efeitos da Intriga)', () => {
    const s = mk('uni4-sec2', 1975);
    const a = Object.values(s.acts).find((x) => !x.catalogNo && x.owner !== 'player' && x.members.length && x.status !== 'retired')!;
    const ig = plantSecret(s, { kind: 'act', id: a.id }, 'plagiarism', true);
    const f0 = a.fame;
    const sec = secById23(s, ig.id)!;
    expect(sec).toBeDefined();
    expose23(s, sec, l('Uma reportagem', 'A news report'));
    expect(a.fame).toBeCloseTo(f0 * 0.85, 6);
    expect(knownSecrets(s).some((x) => x.id === ig.id)).toBe(false); // exposto
  });
});

describe('UNI-4 · empresário: ficha única do cliente', () => {
  it('a satisfação saiu: quem mexia nela mexe na confiança da ficha (mesmo delta)', () => {
    const s = mk('uni4-mgr', 1985);
    const a = Object.values(s.acts).find((x) => x.owner && x.owner !== 'player' && x.status !== 'retired')!;
    ventures(s).mg.clients.push({ actId: a.id, rate: 0.15, since: s.week, earned: 0 });
    const c = ventures(s).mg.clients.at(-1)!;
    expect((c as unknown as Record<string, unknown>).sat).toBeUndefined();
    const t0 = c12(s, a.id).trust;
    addClientTrust9(s, a.id, -8);
    expect(c12(s, a.id).trust).toBeCloseTo(t0 - 8, 6);
    expect(clientTrust9(s, a.id)).toBe(c12(s, a.id).trust);
    expect(x4(s).manager11).toBeUndefined();
    expect(existsSync('src/sim/sys/manager11.ts')).toBe(false);
  });
});

describe('UNI-4 · casas de shows: um registro só', () => {
  it('construída, real e programação moram no mesmo registro pela chave do mapa', () => {
    const s = mk('uni4-venue', 1975);
    const v = buyVenue(s, 'club', s.config.homeCity, 'Casa U');
    expect(typeof v === 'object' && 'kind' in v).toBe(true);
    expect(builtVenue(s)?.name).toBe('Casa U');
    expect(houses27(s).v[BUILT27].built).toBe(builtVenue(s));
    expect(addNight12(s, { k: 'original', day: 'fri', deal: 'door' })).toBeNull();
    expect(houses27(s).v[BUILT27].prog).toBe(v12(s));
    const d = VENUES17.find((x) => venueOpen(s, x) && x.buyable !== false)!;
    expect(buyVenue17(s, d.id)).toBeNull();
    expect(houses27(s).v[`ve:${d.id}`].real?.id).toBe(d.id);
    expect(realVenues(s).map((o) => o.id)).toContain(d.id);
    expect(myVenues27(s).map((x) => x.key).sort()).toEqual([BUILT27, `ve:${d.id}`].sort());
    expect(x4(s).venue12).toBeUndefined();
    expect(x4(s).venues17).toBeUndefined();
    expect((x4(s).live as Record<string, unknown>).venue).toBeUndefined();
  });
});

describe('UNI-4 · festivais: um registro só (do mundo e seus)', () => {
  it('terreno e negócio do seu festival são partes do mesmo registro; mundo com edição do ano', () => {
    const s = mk('uni4-fest', 1975);
    const f = createFestival(s, 'Festival U', s.config.homeCity, (s.month + 3) % 12);
    expect(typeof f === 'object' && 'grid' in f).toBe(true);
    const fx = f as Exclude<typeof f, { pt: string }>;
    expect(ownFests(s).map((x) => x.id)).toContain(fx.id);
    const biz = f12(s, fx);
    expect(fests31(s).f[fx.id].land).toBe(fx);
    expect(fests31(s).f[fx.id].biz).toBe(biz);
    advanceMonth(s);
    expect(editions8(s).length).toBeGreaterThan(0);
    for (const k of ['fest12', 'fest18', 'fest8']) expect(x4(s)[k]).toBeUndefined();
    expect((x4(s).live as Record<string, unknown>).fests).toBeUndefined();
  });
});

describe('UNI-4 · turnês: s.tours é o registro único de datas', () => {
  it('show avulso do promotor é uma turnê de 1 data com papel; o motor de turnês não a toca', () => {
    const s = mk('uni4-tour', 1975);
    const act = Object.values(s.acts).filter((a) => a.members.length && a.status !== 'retired' && !a.catalogNo).sort((a, b) => b.fame - a.fame)[0];
    expect(openPromoter(s)).toBeNull();
    const st = defaultStop(s, act, act.city, s.week + 3);
    const r = bookRoute(s, Rng.fromSeed('uni4-5'), 'promoter', act.id, [st]);
    if (!r.ok) return;
    const sh = shows12(s).find((x) => x.actId === act.id)!;
    expect(s.tours).toContain(sh);
    expect(sh.by).toBe('promoter');
    expect(tourList(s)).not.toContain(sh);
    expect(sh.stops).toHaveLength(1);
    for (let i = 0; i < 3; i++) advanceMonth(s);
    expect(sh.status).toBe('done');
    expect(sh.res).toBeDefined();
    expect((x4(s).tour12 as Record<string, unknown>).shows).toBeUndefined();
    expect(x4(s).road27).toBeUndefined();
    expect(existsSync('src/sim/route16.ts')).toBe(false);
  });
});

describe('UNI-4 · rivais: estado único atrás da fachada', () => {
  it('memória, mágoa e jogadas de cada selo num registro só; estados antigos sumiram', () => {
    const s = mk('uni4-riv', 1975);
    const lb = Object.values(s.labels).find((x) => x.active)!;
    mind18(s, lb.id).lost.push(s.week);
    grudge27(s, lb.id, 10, l('Teste', 'Test'));
    expect(rivalOf(s, lb.id)?.mind?.lost).toContain(s.week);
    expect(rivalOf(s, lb.id)?.mem?.g).toBeGreaterThan(0);
    for (let i = 0; i < 6; i++) advanceMonth(s);
    expect(Object.keys(rivals31(s).lb).length).toBeGreaterThan(0);
    for (const k of ['rivals8', 'rivals12', 'rivalmind18', 'rv27', 'rs28']) expect(x4(s)[k]).toBeUndefined();
  });
});

describe('UNI-4 · determinismo', () => {
  it('mesma semente → mesmos registros únicos depois de 6 meses', () => {
    const run = () => { const s = createGame(defaultConfig('uni4-det', { startYear: 1990 })); for (let i = 0; i < 6; i++) advanceMonth(s); return s; };
    const a = run(), b = run();
    for (const k of ['city', 'festivals', 'venues27', 'rivals', 'secrets23', 'holds17']) expect(JSON.stringify(x4(b)[k])).toBe(JSON.stringify(x4(a)[k]));
    expect(JSON.stringify(b.tours)).toBe(JSON.stringify(a.tours));
  });
});
