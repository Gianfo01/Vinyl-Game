// Rodada 27 (CTX) — menu de ações das entidades (clique direito / toque longo / Shift+F10 num nome).
// Parte pura: ações por tipo e estado, motivos de bloqueio, nada muda ao montar o menu.
// Parte DOM (documento falso mínimo): os link helpers carimbam data-ent/data-id.
import { beforeAll, describe, expect, it } from 'vitest';
import { REAL_MGRS } from '../src/data/managers14';
import { cityById } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { hqCaps } from '../src/sim/branches';
import { VENUES17 } from '../src/sim/sys/venues17';
import type { GameState } from '../src/sim/types';
import { playerActs } from '../src/sim/util';
import { createGame } from '../src/sim/worldgen';
import { ctxMenu27, offerBlock27, type CtxEnv27, type CtxMenu27 } from '../src/ui/ps/ctx27model';
import { ENTS27, ent27, isEnt27, personKey27 } from '../src/ui/ps/ent27';

const game = (year = 2005, seed = 'r27ctx'): GameState => createGame(defaultConfig(`${seed}-${year}`, { scenario: 'established', startYear: year }));
const ids = (m: CtxMenu27 | null) => (m ? m.items.map((x) => x.id) : []);
const item = (m: CtxMenu27 | null, id: string) => m?.items.find((x) => x.id === id);
const ENV: CtxEnv27 = { has: (f) => f !== 'songmarket' };
const pt = (x: { pt: string } | null | undefined) => x?.pt ?? '';

describe('r27 CTX — ent27', () => {
  it('atributos só com id; tipos conhecidos; chave de pessoa canônica', () => {
    expect(ent27('act', 'a1')).toEqual({ 'data-ent': 'act', 'data-id': 'a1' });
    expect(ent27('act', '')).toEqual({});
    expect(ent27('song', undefined)).toEqual({});
    for (const e of ENTS27) expect(isEnt27(e)).toBe(true);
    expect(isEnt27('banana')).toBe(false);
    expect(personKey27('abc')).toBe('p:abc');
    expect(personKey27('e:x')).toBe('e:x');
    expect(personKey27('player')).toBe('player');
  });
});

describe('r27 CTX — modelo de ações', () => {
  let s: GameState;
  beforeAll(() => { s = game(); });

  it('artista do elenco: agenda, compor, gravar, lançar, turnê e "todas as ações"; sem proposta', () => {
    const mine = playerActs(s)[0];
    const m = ctxMenu27(s, 'act', mine, ENV);
    expect(m?.name).toBe(s.acts[mine].name);
    expect(ids(m)).toEqual(expect.arrayContaining(['act.open', 'act.agenda', 'act.compose', 'act.record', 'act.release', 'act.tour', 'act.more', 'act.compare', 'act.charts', 'act.known', 'copy']));
    expect(ids(m)).not.toContain('act.offer');
    expect(ids(m)).not.toContain('act.watch');
    // nada gravado à espera → "Lançar" desabilitado com o motivo
    const ready = Object.values(s.songs).some((so) => so.actId === mine && so.recorded && !so.releaseId && !so.vault);
    if (!ready) expect(pt(item(m, 'act.release')?.block)).toMatch(/grave antes/);
  });

  it('artista de outro selo: proposta desabilitada com o motivo; observar disponível', () => {
    const other = Object.values(s.acts).find((a) => a.owner && a.owner !== 'player' && s.labels[a.owner] && a.status !== 'retired' && a.status !== 'split')!;
    const m = ctxMenu27(s, 'act', other.id, ENV);
    expect(ids(m)).toContain('act.offer');
    expect(pt(item(m, 'act.offer')?.block)).toContain(s.labels[other.owner!].name);
    expect(item(m, 'act.watch')?.block).toBeNull();
    expect(pt(item(m, 'act.watch')?.label)).toMatch(/Observar/);
    // ninguém do elenco conhece? comparar pede conhecer antes
    if (!s.knowledge[other.id]) expect(pt(item(m, 'act.compare')?.block)).toMatch(/não conhece/);
    // proposta em andamento bloqueia uma segunda
    const free = Object.values(s.acts).find((a) => !a.owner && a.status !== 'retired' && a.status !== 'split');
    if (free) {
      s.offers.push({ id: 'ctx-o', actId: free.id, status: 'pending' } as unknown as GameState['offers'][number]);
      expect(pt(offerBlock27(s, free))).toMatch(/proposta em andamento/);
      s.offers.pop();
    }
  });

  it('paradas: fora delas mostra o motivo; nas paradas libera', () => {
    const e = s.charts.singles[0] ?? s.charts.albums[0];
    if (e) {
      const r = s.releases[e.releaseId];
      expect(item(ctxMenu27(s, 'act', r.actId, ENV), 'act.charts')?.block).toBeNull();
      expect(item(ctxMenu27(s, 'release', r.id, ENV), 'release.charts')?.block).toBeNull();
    }
    const out = Object.values(s.acts).find((a) => ![...s.charts.singles, ...s.charts.albums].some((x) => s.releases[x.releaseId]?.actId === a.id))!;
    expect(pt(item(ctxMenu27(s, 'act', out.id, ENV), 'act.charts')?.block)).toMatch(/Fora das paradas|não há paradas/);
  });

  it('jogando como artista: proposta e olheiro dizem por quê', () => {
    const t = game(1995, 'r27ctx-artist');
    (t.config as { role: string }).role = 'artist';
    const other = Object.values(t.acts).find((a) => !playerActs(t).includes(a.id))!;
    expect(pt(offerBlock27(t, other))).toMatch(/artista/);
    const home = ctxMenu27(t, 'city', t.config.homeCity, ENV);
    expect(pt(item(home, 'city.scout')?.block)).toMatch(/artista/);
  });

  it('pessoa: integrante tem presente, relações e "o que sabemos"; você mesmo só abre e copia', () => {
    const a = s.acts[playerActs(s)[0]];
    const pid = a.members.find((m) => s.persons[m] && !s.persons[m].isPlayer)!;
    const m = ctxMenu27(s, 'person', pid, ENV); // id solto vira 'p:'
    expect(m?.id).toBe(`p:${pid}`);
    expect(ids(m)).toEqual(expect.arrayContaining(['person.open', 'person.gift', 'person.rel', 'person.known', 'copy']));
    expect(item(m, 'person.gift')?.cost).toBeGreaterThan(0);
    expect(ids(m)).not.toContain('person.lunch');
    const me = ctxMenu27(s, 'person', 'player', ENV);
    if (me) expect(ids(me)).not.toContain('person.gift');
  });

  it('empresário: almoço (com custo ou motivo); produtor nunca ganha almoço', () => {
    let found = false;
    for (const r of REAL_MGRS.slice(0, 80)) {
      const m = ctxMenu27(s, 'person', `e:${r.id}`, ENV);
      if (!m) continue;
      const lu = item(m, 'person.lunch');
      if (!lu) continue;
      found = true;
      expect(lu.cost).toBeGreaterThan(0);
      expect(ids(m)).not.toContain('person.dinner');
      break;
    }
    expect(found).toBe(true);
  });

  it('profissional do mercado: contratar com custo; sede cheia e sem caixa dão o motivo', () => {
    const t = game(2005, 'r27ctx-hire');
    const pro = t.professionals[0];
    expect(pro).toBeTruthy();
    const key = `s:${pro.id}`;
    const m = ctxMenu27(t, 'person', key, ENV);
    expect(ids(m)).toContain('person.hire');
    expect(ids(m)).not.toContain('person.open');
    expect(item(m, 'person.hire')?.cost).toBe(Math.round(pro.salary * 0.5));
    const cash = t.player.cash;
    t.player.cash = 0;
    expect(pt(item(ctxMenu27(t, 'person', key, ENV), 'person.hire')?.block)).toMatch(/Caixa|caixa|reserv/);
    t.player.cash = cash;
    const cap = hqCaps(t).staff;
    while (t.player.staff.length < cap) t.player.staff.push({ ...pro, id: `fill${t.player.staff.length}` });
    expect(pt(item(ctxMenu27(t, 'person', key, ENV), 'person.hire')?.block)).toMatch(/Sede sem vagas/);
  });

  it('gravadora: dossiê, rivalidade (com nota), elenco, finanças', () => {
    const lb = Object.values(s.labels).find((x) => x.roster.length > 0)!;
    const m = ctxMenu27(s, 'label', lb.id, ENV);
    // r29: + o chefe do selo (submenu de pessoa) e o plano do Submundo contra o selo (grampo), antes do "Copiar nome"
    expect(ids(m).slice(0, 4)).toEqual(['label.open', 'label.rival', 'label.roster', 'label.money']);
    expect(ids(m)).toEqual(expect.arrayContaining(['crime.plan:wiretap', 'copy']));
    expect(ids(m).at(-1)).toBe('copy');
    expect(pt(item(m, 'label.rival')?.note)).toMatch(/mágoa/);
    expect(item(m, 'label.roster')?.block).toBeNull();
  });

  it('cidade: "Nosso mundo" só na sua cidade; marcar show pede artistas', () => {
    const home = ctxMenu27(s, 'city', s.config.homeCity, ENV);
    expect(ids(home)).toEqual(expect.arrayContaining(['city.open', 'city.scene', 'city.home', 'city.show', 'city.scout', 'copy']));
    const other = Object.keys(cityById).find((c) => c !== s.config.homeCity)!;
    expect(ids(ctxMenu27(s, 'city', other, ENV))).not.toContain('city.home');
    const t = game(2005, 'r27ctx-noacts');
    for (const id of playerActs(t)) { t.acts[id].owner = null as unknown as string; t.acts[id].playerBand = false; }
    if (!playerActs(t).length) expect(pt(item(ctxMenu27(t, 'city', t.config.homeCity, ENV), 'city.show')?.block)).toMatch(/não tem artistas/);
  });

  it('lançamento e música: ouvir depende do áudio; licenciar só com o mercado de músicas', () => {
    const r = Object.values(s.releases).find((x) => x.songs.some((so) => s.songs[so]))!;
    const noAudio: CtxEnv27 = { has: (f) => f !== 'audio' && f !== 'songmarket' };
    expect(pt(item(ctxMenu27(s, 'release', r.id, noAudio), 'release.listen')?.block)).toMatch(/Áudio indisponível/);
    expect(item(ctxMenu27(s, 'release', r.id, ENV), 'release.listen')?.block).toBeNull();
    const so = s.songs[r.songs.find((x) => s.songs[x])!];
    expect(ids(ctxMenu27(s, 'song', so.id, ENV))).not.toContain('song.market');
    const market: CtxEnv27 = { has: () => true };
    const sm = ctxMenu27(s, 'song', so.id, market);
    expect(ids(sm)).toContain('song.market');
    if (!playerActs(s).includes(so.actId)) expect(pt(item(sm, 'song.market')?.block)).toMatch(/seu elenco/);
  });

  it('casa de shows: fora da época fica desabilitada com o ano', () => {
    const t = game(1960, 'r27ctx-venue');
    const fut = VENUES17.find((v) => v.from > 1960)!;
    const m = ctxMenu27(t, 'venue', fut.id, ENV);
    expect(pt(item(m, 'venue.open')?.block)).toContain(String(fut.from));
    expect(item(m, 'venue.show')?.block).not.toBeNull();
    const t2 = game(1995, 'r27ctx-fest');
    expect(pt(item(ctxMenu27(t2, 'festival', 'x', { has: (f) => f !== 'area:festivals' }, 'Fest'), 'festival.open')?.block)).toMatch(/festivais/);
  });

  it('id desconhecido → sem menu (o navegador mostra o nativo); montar o menu não mexe no estado', () => {
    expect(ctxMenu27(s, 'act', 'nope', ENV)).toBeNull();
    expect(ctxMenu27(s, 'city', 'atlantis', ENV)).toBeNull();
    expect(ctxMenu27(s, 'person', 'p:nope', ENV)).toBeNull();
    const snap = () => JSON.stringify([s.player.cash, s.offers.length, s.player.staff.length, Object.keys(s.knowledge).length, s.week]);
    const before = snap();
    for (const a of Object.keys(s.acts).slice(0, 30)) ctxMenu27(s, 'act', a, ENV);
    for (const lb of Object.keys(s.labels).slice(0, 10)) ctxMenu27(s, 'label', lb, ENV);
    expect(snap()).toBe(before);
  });
});

// ---------------------------------------------------------------- DOM: os link helpers carimbam a marca

class FNode { childNodes: FNode[] = []; parentNode: FNode | null = null; textContent = ''; appendChild(c: FNode) { this.childNodes.push(c); c.parentNode = this; return c; } }
class FEl extends FNode {
  attrs: Record<string, string> = {}; className = ''; style = {}; tagName: string;
  constructor(tag: string) { super(); this.tagName = tag.toUpperCase(); }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  getAttribute(k: string) { return this.attrs[k] ?? null; }
  addEventListener() { /* sem eventos */ }
  get text(): string { return this.childNodes.map((c) => (c instanceof FEl ? c.text : c.textContent)).join(''); }
}
class FText extends FNode { constructor(t: string) { super(); this.textContent = t; } }

describe('r27 CTX — DOM: data-ent/data-id nos nomes', () => {
  it('actLink, releaseLink, labelLink, cityLink, songName e personLink16', async () => {
    const G = globalThis as Record<string, unknown>;
    G.Node = FNode;
    G.document = { createElement: (t: string) => new FEl(t), createTextNode: (t: string) => new FText(t), createElementNS: (_: string, t: string) => new FEl(t), documentElement: new FEl('html'), body: new FEl('body'), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
    G.window ??= { matchMedia: () => ({ matches: false }), addEventListener() {}, innerWidth: 1280, innerHeight: 800 };
    G.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
    const { actLink, releaseLink, labelLink, cityLink, songName } = await import('../src/ui/common');
    const { personLink16 } = await import('../src/ui/sys/people16');
    const s = game(2005, 'r27ctx-dom');
    const a = Object.values(s.acts)[0];
    const el = actLink(s, a.id) as unknown as FEl;
    expect(el.attrs['data-ent']).toBe('act');
    expect(el.attrs['data-id']).toBe(a.id);
    expect(el.text).toBe(a.name);
    const r = Object.values(s.releases)[0];
    expect((releaseLink(s, r.id) as unknown as FEl).attrs).toMatchObject({ 'data-ent': 'release', 'data-id': r.id });
    const lb = Object.values(s.labels)[0];
    expect((labelLink(s, lb.id) as unknown as FEl).attrs).toMatchObject({ 'data-ent': 'label', 'data-id': lb.id });
    expect((labelLink(s, 'player') as unknown as FEl).attrs['data-ent']).toBeUndefined(); // o seu selo não é link
    expect((cityLink(s.config.homeCity) as unknown as FEl).attrs).toMatchObject({ 'data-ent': 'city', 'data-id': s.config.homeCity });
    expect((cityLink('atlantis') as unknown as FEl).attrs['data-ent']).toBeUndefined();
    const so = Object.values(s.songs)[0];
    expect((songName(so.id, so.title) as unknown as FEl).attrs).toMatchObject({ 'data-ent': 'song', 'data-id': so.id, tabindex: '0' });
    const pid = a.members[0];
    expect((personLink16(s, `p:${pid}`, 'X') as unknown as FEl).attrs).toMatchObject({ 'data-ent': 'person', 'data-id': `p:${pid}` });
  });
});
