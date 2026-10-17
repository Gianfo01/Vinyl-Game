// R33 · APARELHOS33 — celular e computador (docs/r33/CELULAR_PC.md): poucos casos, sem jogo longo.
//  - toda ação aponta para a função que existe (a mesma referência exportada pelo módulo);
//  - as 5 versões de cada aparelho batem com a tabela da especificação; o gancho põe o Redes no lugar reservado;
//  - app some com o sistema desligado; ação cinza mostra o motivo;
//  - ver vídeo gera o mesmo lead do dig18; comprar pelo app chama a compra a distância (orderDeco31);
//  - cobrinha (e os outros jogos) é lógica pura com semente; Encontros nunca mostra a família Fossati nem menores;
//  - cada mecânica nova com 1–2 casos.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState, Release } from '../src/sim/types';
import { setSw } from '../src/sim/r31/switches';
import { playerActs } from '../src/sim/util';
import {
  PHONE33, PC33, phoneV33, pcV33, ap33, endGame33, CALM33, makeRingtone33, ringLock33, ringIncome33, homeDemo33, callCost33, CALL_K33, phoneCall33,
  aiLock33, reportPiracy33, resolvePiracy33, pirLock33, setFanSub33, subLock33, subIncome33, leakChoice33, SW_AP33,
} from '../src/sim/r33/aparelhos33';
import { newSnake33, stepSnake33, newMaze33, stepMaze33, mazeWall33, newBlocks33, stepBlocks33, newTap33, stepTap33, newTennis33, stepTennis33, newGame33, stepGame33 } from '../src/sim/r33/jogos33';
import { ACTS33, PHONE_APPS33, PC_APPS33, apps33, actsOf33, lock33, why33, profiles33, matchOf33, registerPhoneApp33, type Ctx33 } from '../src/ui/r33/aparelhos33model';
import { disc18, dig18 } from '../src/sim/sys/discover18';
import { decol31, remoteCat31 } from '../src/sim/r31/decoshop31';
import { orderDeco31 } from '../src/sim/r31/decoshop31';
import { isFossati31 } from '../src/sim/sys/amor31';
import { gente31 } from '../src/sim/sys/gente31';
import { ownerOf } from '../src/sim/sys/people/owner';
import { energyLeft } from '../src/sim/sys/life';
import { vit31 } from '../src/sim/r31/vitrine31';
import { cal17 } from '../src/sim/sys/clash17';
import { ai18 } from '../src/sim/sys/ai18';
import { eventById } from '../src/sim/events';
import { recentFacts } from '../src/sim/facts17';

const game = (y: number, seed = 'ap33'): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const ctx: Ctx33 = { go: () => {}, travel: () => {}, app: () => {}, close: () => {}, say: () => {}, refresh: () => {} };
const act0 = (s: GameState) => playerActs(s).find((id) => s.acts[id].status === 'active') ?? playerActs(s)[0];

describe('APARELHOS33 · catálogo de ações', () => {
  it('toda ação aponta para a função que existe (mesma referência exportada)', async () => {
    for (const [id, a] of Object.entries(ACTS33)) {
      expect(typeof a.fn, id).toBe('function');
      const mod = await import(`../src/${a.src[0]}`);
      expect(mod[a.src[1]], `${id} → ${a.src.join('#')}`).toBe(a.fn);
      expect(a.de, id).toBeGreaterThanOrEqual(1889);
      if (a.ate !== undefined) expect(a.ate, id).toBeGreaterThanOrEqual(a.de);
    }
  });
  it('as 5 versões de cada aparelho batem com a tabela da especificação', () => {
    expect([...PHONE33]).toEqual([1983, 1997, 2007, 2012, 2032]);
    expect([...PC33]).toEqual([1982, 1995, 2003, 2012, 2032]);
    expect(phoneV33(1982)).toBeUndefined(); expect(phoneV33(1983)).toBe(1983); expect(phoneV33(2011)).toBe(2007); expect(phoneV33(2035)).toBe(2032);
    expect(pcV33(1981)).toBeUndefined(); expect(pcV33(1999)).toBe(1995); expect(pcV33(2025)).toBe(2012);
    expect(PHONE_APPS33[1983]).toEqual(['ligar', 'agenda', 'recados']);
    expect(PHONE_APPS33[1997]).toEqual(['ligar', 'recados', 'agenda', 'toques', 'jogo', 'radio', 'familia']);
    expect(PHONE_APPS33[2007]).toEqual(['ligar', 'recados', 'agenda', 'musica', 'videos', 'noticias', 'mapa', 'camera', 'jogo', 'banco', 'redes', 'faclube']);
    const the20 = ['ligar', 'recados', 'videos', 'redes', 'streaming', 'radio', 'noticias', 'banco', 'bolsa', 'compras', 'leilao', 'ingressos', 'mapa', 'agenda', 'camera', 'encontros', 'familia', 'imoveis', 'saude', 'faclube'];
    expect(PHONE_APPS33[2012].filter((x) => x !== 'jogo')).toEqual(the20);
    expect(PHONE_APPS33[2032]).toEqual([...PHONE_APPS33[2012], 'assistente']);
    expect(PC_APPS33[1982]).toEqual(['planilha', 'contratos', 'relatorios', 'jogo']);
    for (const [a, b] of [[1995, 1982], [2003, 1995], [2012, 2003], [2032, 2012]]) for (const x of PC_APPS33[b]) expect(PC_APPS33[a], `${a} herda ${x}`).toContain(x);
    for (const x of ['email', 'site', 'compras', 'bolsa', 'editor']) expect(PC_APPS33[1995]).toContain(x);
    for (const x of ['forum', 'demos', 'leilao', 'noticias', 'loja']) expect(PC_APPS33[2003]).toContain(x);
    for (const x of ['videos', 'painel', 'anuncios']) expect(PC_APPS33[2012]).toContain(x);
    expect(PC_APPS33[2032]).toContain('ia');
  });
  it('no ano, o aparelho mostra os apps da versão (sistemas ligados); o Redes entra pelo gancho no lugar reservado', () => {
    const s = game(2025);
    for (const id of ['exp33.paparazzi', 'exp33.saude', 'exp33.reppessoal', 'exp33.memes', 'exp33.relics', 'exp33.cidade.terrenos', 'exp33.cidade.lojas', 'exp33.rotina']) setSw(s, id, true);
    const xs = apps33(s, 'phone');
    expect(xs).toEqual(PHONE_APPS33[2012].filter((x) => x !== 'redes'));
    registerPhoneApp33({ id: 'redes', name: { pt: 'Redes', en: 'Social' }, icon: 'redes', de: 2004, open: () => null });
    expect(apps33(s, 'phone').indexOf('redes')).toBe(PHONE_APPS33[2012].indexOf('redes'));
    expect(apps33(game(1983), 'phone')).toEqual(['ligar', 'agenda', 'recados']);
    expect(apps33(game(1975), 'phone')).toEqual([]);
    const pc = apps33(game(1985), 'pc');
    for (const x of ['planilha', 'contratos', 'relatorios', 'jogo']) expect(pc).toContain(x);
    // cada ação só no ano dela
    const s97 = game(1997);
    expect(actsOf33(s97, 'phone', 'toques')).toContain('toq.vender');
    expect(actsOf33(game(2011), 'phone', 'toques')).toEqual([]);
  });
  it('app some com o sistema desligado; ligado volta', () => {
    const s = game(2025);
    expect(apps33(s, 'phone')).toContain('encontros');
    setSw(s, 'amor31.ask', false); expect(apps33(s, 'phone')).not.toContain('encontros');
    setSw(s, 'auction31', false); expect(apps33(s, 'phone')).not.toContain('leilao');
    setSw(s, 'deco31.shops', false); expect(apps33(s, 'phone')).not.toContain('compras');
    setSw(s, 'fam31', false); expect(apps33(s, 'phone')).not.toContain('familia');
    setSw(s, SW_AP33, false); expect(apps33(s, 'phone')).toEqual([]);
  });
  it('ação cinza mostra o motivo (a mesma trava da regra)', () => {
    const s = game(2008);
    const a = act0(s);
    expect(lock33(s, 'vid.alta')).toBeNull();
    ACTS33['vid.alta'].run(s, ctx);
    const why = why33(lock33(s, 'vid.alta'));
    expect(why?.pt).toMatch(/já usou este canal/);
    expect(why33(lock33(game(2033), 'rec.ia'))?.pt).toMatch(/Nada esperando resposta|já respondeu/);
    expect(why33(lock33(game(2025), 'ass.responder'))?.pt).toMatch(/chega em 2032/);
    void a;
  });
});

describe('APARELHOS33 · liga no que existe', () => {
  it('ver vídeo gera o mesmo lead do dig18 (mesmo custo, mesmo canal)', () => {
    const a = game(2010, 'vid'), b = game(2010, 'vid');
    ACTS33['vid.alta'].run(a, ctx);
    dig18(b, 'youtube');
    expect(disc18(a).leads.map((x) => x.a)).toEqual(disc18(b).leads.map((x) => x.a));
    expect(a.player.cash).toBe(b.player.cash);
    expect(disc18(a).leads.length).toBeGreaterThan(0);
  });
  it('comprar pelo app chama a compra a distância do decoshop31', () => {
    const a = game(2025, 'shop'), b = game(2025, 'shop');
    const d = remoteCat31(a, 'net')[0];
    ACTS33['com.comprar'].run(a, ctx, d.id);
    orderDeco31(b, d.id, 'net', 'co');
    expect(JSON.stringify(decol31(a))).toBe(JSON.stringify(decol31(b)));
    expect(a.player.cash).toBe(b.player.cash);
  });
  it('Encontros nunca mostra a família Fossati nem menores', () => {
    for (const y of [1999, 2012, 2025, 2035]) {
      const s = game(y, 'enc');
      // um menor e um Fossati trabalhando na cidade não aparecem
      const ids = Object.keys(s.persons).filter((id) => s.persons[id].alive && !s.persons[id].isPlayer);
      const kid = s.persons[ids[0]], fos = s.persons[ids[1]];
      kid.born = y - 15; fos.name = 'Lucia Fossati';
      const g = gente31(s);
      g.j['test:0:0'] = { p: kid.id, w: s.week }; g.j['test:0:1'] = { p: fos.id, w: s.week };
      for (const it of profiles33(s)) {
        const p = s.persons[it.arg.slice(2)];
        expect(isFossati31(s, it.arg), `${y} ${it.title}`).toBe(false);
        expect(y - p.born, `${y} ${it.title}`).toBeGreaterThanOrEqual(18);
      }
      expect(profiles33(s).some((it) => it.arg === `p:${kid.id}` || it.arg === `p:${fos.id}`)).toBe(false);
    }
  });
  it('o match do Encontros usa a mesma chance do "chamar para sair"', () => {
    const s = game(2025, 'match');
    const it = profiles33(s)[0];
    expect(it).toBeTruthy();
    const m = matchOf33(s, it.arg), sup = matchOf33(s, it.arg, true);
    expect(sup.p).toBeGreaterThanOrEqual(m.p);
  });
});

describe('APARELHOS33 · minijogos (lógica pura com semente)', () => {
  it('cobrinha: mesma semente e mesmas teclas = mesma partida; parede = fim; comer cresce', () => {
    const keys = ['up', 'up', 'left', 'left', 'down', undefined, 'right'] as const;
    const run = () => { const g = newSnake33('seed-x'); for (const k of keys) stepSnake33(g, k); return JSON.stringify(g); };
    expect(run()).toBe(run());
    const w = newSnake33('w', 'snake', 8, 6);
    for (let i = 0; i < 10 && !w.over; i++) stepSnake33(w);
    expect(w.over).toBe(true);
    const f = newSnake33('f', 'snake', 12, 8);
    f.food = [f.body[0][0] + 1, f.body[0][1]];
    const n = f.body.length;
    stepSnake33(f);
    expect(f.body.length).toBe(n + 1);
    expect(f.score).toBe(10);
    // não vira para trás
    const b = newSnake33('b'); stepSnake33(b, 'left'); expect(b.over).toBe(false);
    // holograma: as bordas dão a volta
    const h = newSnake33('h', 'holo', 8, 6);
    for (let i = 0; i < 12; i++) stepSnake33(h);
    expect(h.over).toBe(false);
  });
  it('tênis, labirinto, blocos e toque rápido são determinísticos e acabam', () => {
    const t = newTennis33('t'); for (let i = 0; i < 3000 && !t.over; i++) stepTennis33(t); expect(t.over).toBe(true);
    const m = newMaze33('m'); expect(mazeWall33(m, m.at[0], m.at[1])).toBe(false); expect(mazeWall33(m, m.exit[0], m.exit[1])).toBe(false);
    const bl = newBlocks33('b'); for (let i = 0; i < 2000 && !bl.over; i++) stepBlocks33(bl); expect(bl.over).toBe(true);
    const tp = newTap33('p'); stepTap33(tp, `n${tp.lit + 1}` as 'n1'); expect(tp.score).toBe(1);
    const a = newGame33('blocks', 'q'), c = newGame33('blocks', 'q');
    for (const k of ['left', 'up', undefined, 'right', undefined] as const) { stepGame33(a, k); stepGame33(c, k); }
    expect(JSON.stringify(a)).toBe(JSON.stringify(c));
    void stepMaze33;
  });
  it('fim da partida baixa o estresse até o teto do mês e o recorde vira fato do diário', () => {
    const s = game(1997, 'calm');
    const o = ownerOf(s); o.stress = 60;
    let tot = 0;
    for (let i = 0; i < 6; i++) tot += endGame33(s, 'snake', { pt: 'Cobrinha', en: 'Snake' }, 50 + i).calm;
    expect(tot).toBe(CALM33.cap);
    expect(o.stress).toBe(60 - CALM33.cap);
    expect(ap33(s).rec.snake).toBe(55);
    expect(recentFacts(s, { kind: 'hobby33' }).length).toBeGreaterThan(0);
  });
});

describe('APARELHOS33 · mecânicas novas', () => {
  const fakeHit = (s: GameState, peak = 5): string => {
    const a = act0(s);
    const r = { id: 'rel-ap33', actId: a, owner: 'player', type: 'single', title: 'Toque Teste', songs: [], week: s.week - 10, year: s.year, q: 60, appeal: 1, formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: [], weekly: [], totalUnits: 100000, revenue: 0, peak, weeksOnChart: 10, lastPos: peak, coverSeed: 1, shortage: 0, live: false } as unknown as Release;
    s.releases[r.id] = r;
    return r.id;
  };
  it('toque de celular (1997–2009): hit vira toque e rende; antes e depois não', () => {
    const s = game(2003, 'ring');
    const id = fakeHit(s);
    expect(makeRingtone33(s, id)).toBeNull();
    expect(ringIncome33(s, id)).toBeGreaterThan(0);
    expect(ringLock33(s, id)?.pt).toMatch(/já virou toque/);
    const old = game(1990, 'ring'); expect(ringLock33(old, fakeHit(old))?.pt).toMatch(/a partir de 1997/);
    const late = game(2015, 'ring'); expect(ringLock33(late, fakeHit(late))?.pt).toMatch(/acabou/);
  });
  it('demo caseira: 1 bolinha, faixas na gaveta com qualidade baixa', () => {
    const s = game(1999, 'demo');
    const a = act0(s);
    const e0 = energyLeft(s);
    const r = homeDemo33(s, a);
    expect(r.ok, r.text.pt).toBe(true);
    expect(energyLeft(s)).toBe(e0 - 1);
    expect(r.songs.length).toBeGreaterThan(0);
    for (const so of r.songs) expect(so.q).toBeLessThan(80);
  });
  it('ligação por época: minuto caro até 1996; vídeo e holograma pesam mais na relação', () => {
    expect(callCost33(game(1985, 'call'))).toBeGreaterThan(0);
    expect(callCost33(game(1997, 'call'))).toBe(0);
    expect(CALL_K33.video).toBeGreaterThan(CALL_K33.voice);
    expect(CALL_K33.holo).toBeGreaterThan(CALL_K33.video);
    const s = game(1985, 'call');
    const p = s.acts[act0(s)].members[0];
    const c0 = s.player.cash;
    phoneCall33(s, p);
    expect(s.player.cash).toBeLessThan(c0);
  });
  it('assistente de IA só em 2032+', () => {
    expect(aiLock33(game(2025, 'ai'))?.pt).toMatch(/2032/);
  });
  it('denúncia de pirataria: a cópia pirata vira processo; ganhando, sai da rua', () => {
    const s = game(2004, 'pir');
    const id = fakeHit(s);
    expect(pirLock33(s)?.pt).toMatch(/Nenhuma cópia pirata/);
    vit31(s).items.push({ id: 'vp1', c: 'bm_pirate', p: 'market', at: 0, to: 9999, ref: { rel: id } as never });
    s.player.cash += 1e7;
    expect(reportPiracy33(s).pt).toMatch(/processo está aberto/);
    const c = ap33(s).pir[0];
    resolvePiracy33(s, c.id, 1);
    expect(ap33(s).pir[0].done).toBe('won');
    expect(vit31(s).items.some((x) => x.c === 'bm_pirate')).toBe(false);
  });
  it('assinatura de fãs (2013+): renda pequena pela lealdade', () => {
    const s = game(2016, 'sub');
    const a = act0(s);
    s.acts[a].fans.core = 20000;
    expect(subLock33(s, a)).toBeNull();
    expect(setFanSub33(s, a, true)).toBeNull();
    expect(subIncome33(s, a)).toBeGreaterThan(0);
    expect(subLock33(game(2010, 'sub'), a)?.pt).toMatch(/2013/);
  });
  it('vazamento do álbum (1999+): o evento vira escolha e "às pressas" antecipa a data', () => {
    expect(eventById.ap33_leak?.options.map((o) => o.id)).toEqual(['rush', 'sue', 'use']);
    const s = game(2005, 'leak');
    s.pendingReleases.push({ id: 'pr-ap33', actId: act0(s), type: 'lp', songs: [], title: 'Disco', formats: [], press: 0, marketing: [], territories: [], week: s.week + 6 } as never);
    leakChoice33(s, 'pr-ap33', 'rush');
    expect(s.pendingReleases.find((p) => p.id === 'pr-ap33')!.week).toBe(s.week + 1);
  });
  it('cambistas e preço dinâmico (2012+): o app usa a regra dos ingressos (clash17)', () => {
    const s = game(2014, 'tix');
    ACTS33['ing.dinamico'].run(s, ctx);
    expect(cal17(s).tix[act0(s)]).toBe('dynamic');
    ACTS33['ing.nominal'].run(s, ctx);
    expect(cal17(s).tix[act0(s)]).toBe('paperless');
  });
  it('deepfake de voz (2023+): derrubar chama o resolveFake18', () => {
    const s = game(2026, 'fake');
    const a = act0(s);
    ai18(s).fakes.push({ w: s.week, act: a });
    expect(actsOf33(s, 'phone', 'videos')).toContain('vid.derrubar');
    ACTS33['vid.derrubar'].run(s, ctx);
    expect(ai18(s).fakes[0].ch).toBe('takedown');
  });
});
