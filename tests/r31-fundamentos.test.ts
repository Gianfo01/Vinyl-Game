// R31 · O — fundamentos: motivo do bloqueio antes do clique (RN-04), estimado/reservado/a pagar (RN-03),
// fato/cálculo/hipótese (RN-27/28), painel rápido de ação, busca que abre a ação, favoritos (RN-15) e metas (RN-09).
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import { decodeSave20, encodeSave20 } from '../src/core/save20';
import { migrate } from '../src/ui/store';
import type { GameState } from '../src/sim/types';
import type { Tour } from '../src/sim/xtypes';
import { playerActs } from '../src/sim/util';
import { visibleAct } from '../src/sim/future';
import { cashLock31, lockLine31, lockOf31, unlockFor31, UNLOCK31 } from '../src/sim/r31/lock';
import { autopsyBasis31, BASIS31, forecastBasis31, MONEY31, oblMoney31 } from '../src/sim/r31/tags';
import { addGoal31, favs31, goalProgress31, isFav31, my31, removeGoal31, stampGoals31, toggleFav31 } from '../src/sim/r31/mine';
import { actionRows20 } from '../src/ui/actions20';
import { parseQuery31, quickRows31, searchActions31, signLock31, venueLock31, type QTarget31 } from '../src/ui/r31/quick31core';

const game = (seed: string, y = 1990): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
const filled = (x: { pt: string; en: string } | null | undefined): boolean => !!x && x.pt.trim().length > 3 && x.en.trim().length > 3;

let s: GameState;
beforeAll(() => { s = game('r31o'); });

describe('RN-04 · motivo e condição antes do clique', () => {
  it('o motivo vira trava com condição deduzida (caixa, agenda, composição, contrato, intervalo…)', () => {
    expect(lockOf31(null)).toBeNull();
    expect(unlockFor31(l('Caixa insuficiente.', 'Not enough cash.'))).toEqual(UNLOCK31.cash);
    expect(unlockFor31(l('Nenhuma música escrita esperando gravação: componha primeiro.', 'No written songs waiting to be recorded: write first.'))).toEqual(UNLOCK31.songs);
    expect(unlockFor31(l('Não cabe no mês: capacidade ou espaços da agenda insuficientes.', 'Does not fit this month: not enough capacity or agenda slots.'))).toEqual(UNLOCK31.agenda);
    expect(unlockFor31(l('Uma entrevista a cada 6 semanas por ato.', 'One interview every 6 weeks per act.'))).toEqual(UNLOCK31.wait);
    expect(unlockFor31(l('xyz', 'xyz'))).toEqual(UNLOCK31.generic);
    const k = lockOf31(l('Royalty já no teto.', 'Royalty at the cap.'), l('Não sobe mais.', 'It goes no higher.'))!;
    expect(k.unlock.pt).toBe('Não sobe mais.');
    expect(lockLine31(k).pt).toContain('Para liberar');
  });

  it('caixa livre: diz quanto falta; sem falta, não trava', () => {
    expect(cashLock31(s, 0)).toBeNull();
    const k = cashLock31(s, s.player.cash + 100_000_00)!;
    expect(filled(k.why) && filled(k.unlock)).toBe(true);
    expect(k.unlock.pt).toMatch(/Faltam \$/);
  });

  it('toda ação travada do menu do artista traz motivo E condição (também sem caixa)', () => {
    const g = game('r31o-broke', 1975);
    const check = (st: GameState) => {
      let locked = 0;
      for (const id of playerActs(st)) for (const r of actionRows20(st, { act: id })) {
        if (!r.block) { expect(r.unlock).toBeNull(); continue; }
        locked++;
        expect(filled(r.block), r.def.id).toBe(true);
        expect(filled(r.unlock), r.def.id).toBe(true);
        expect(r.unlock!.pt).not.toBe(r.block.pt);
      }
      return locked;
    };
    check(g);
    g.player.cash = 0;
    expect(check(g)).toBeGreaterThan(0);
  });

  it('ações comuns (contratar, gravar, lançar, turnê, comprar) mostram motivo e condição quando travadas', () => {
    const g = game('r31o-common');
    const mine = playerActs(g)[0];
    expect(mine).toBeTruthy();
    // lançar sem projeto aberto
    const rel = quickRows31(g, { kind: 'act', id: mine }).find((r) => r.def.id === 'q.release')!;
    expect(rel).toBeTruthy();
    if (rel.lock) expect(filled(rel.lock.why) && filled(rel.lock.unlock)).toBe(true);
    // gravar sem músicas
    g.acts[mine].songs = g.acts[mine].songs.filter((id) => g.songs[id]?.recorded);
    const rec = quickRows31(g, { kind: 'act', id: mine }).find((r) => r.def.id === 'q.record');
    if (rec) { expect(rec.lock).not.toBeNull(); expect(rec.lock!.unlock).toEqual(UNLOCK31.songs); }
    // turnê já marcada
    g.tours.push({ id: 'trX', actId: mine, status: 'planned', stops: [] } as unknown as Tour);
    const tr = quickRows31(g, { kind: 'act', id: mine }).find((r) => r.def.id === 'q.tour')!;
    expect(tr.lock?.unlock).toEqual(UNLOCK31.tour);
    // contratar artista de selo rival
    const rival = Object.values(g.acts).find((a) => a.owner && a.owner !== 'player' && visibleAct(g, a) && a.status === 'active')!;
    expect(rival).toBeTruthy();
    const sg = signLock31(g, rival);
    expect(sg).not.toBeNull();
    expect(filled(sg!.why) && filled(sg!.unlock)).toBe(true);
    // comprar casa sem caixa
    g.player.cash = 0;
    const v = venueLock31(g)!;
    expect(v).not.toBeNull();
    expect(filled(v.unlock)).toBe(true);
    // qualquer linha travada do painel tem os dois textos
    for (const tg of [{ kind: 'act', id: mine }, { kind: 'act', id: rival.id }, { kind: 'city', id: g.config.homeCity }] as QTarget31[]) {
      for (const r of quickRows31(g, tg)) if (r.lock) expect(filled(r.lock.why) && filled(r.lock.unlock), r.def.id).toBe(true);
    }
  });
});

describe('painel rápido e busca que abre a ação', () => {
  it('lê o verbo e o alvo', () => {
    expect(parseQuery31('Contratar os Beatles')).toEqual({ verb: 'sign', rest: 'beatles' });
    expect(parseQuery31('gravar com Fulano')).toEqual({ verb: 'record', rest: 'fulano' });
    expect(parseQuery31('Lançar')).toEqual({ verb: 'release', rest: '' });
    expect(parseQuery31('turnê em Recife')).toEqual({ verb: 'tour', rest: 'recife' });
    expect(parseQuery31('comprar casa em Salvador')).toEqual({ verb: 'buy', rest: 'salvador' });
    expect(parseQuery31('beatles').verb).toBeUndefined();
  });

  it('resolve ações: contratar X, gravar Y, gravar com integrante, turnê numa cidade, comprar casa', () => {
    const mine = playerActs(s)[0];
    const rival = Object.values(s.acts).filter((a) => a.owner !== 'player' && visibleAct(s, a) && a.status === 'active').sort((a, b) => b.fame - a.fame)[0];
    const h1 = searchActions31(s, `contratar ${rival.name}`);
    expect(h1[0].row.def.id).toBe('q.sign');
    expect(h1[0].target).toEqual({ kind: 'act', id: rival.id });
    const h2 = searchActions31(s, `gravar ${s.acts[mine].name}`);
    expect(h2[0].row.def.id).toBe('q.record');
    expect(h2[0].target.id).toBe(mine);
    const member = s.acts[mine].members.map((m) => s.persons[m]).find((p) => p && !p.isPlayer && p.alive);
    if (member) {
      const h3 = searchActions31(s, `gravar com ${member.name}`);
      expect(h3.some((x) => x.row.def.id === 'q.record' && (x.target.id === mine || x.target.id === member.id))).toBe(true);
    }
    const h4 = searchActions31(s, 'turnê em Salvador');
    expect(h4.some((x) => x.row.def.id === 'q.tour' && x.target.kind === 'city' && x.target.id === 'salvador')).toBe(true);
    const h5 = searchActions31(s, 'comprar casa em Salvador');
    expect(h5[0].row.def.id).toBe('q.buyVenue');
    expect(h5[0].target.id).toBe('salvador');
    expect(searchActions31(s, 'salvador')).toEqual([]);
  });

  it('explorar não muda o mundo (painel e busca só leem)', () => {
    const before = JSON.stringify(s);
    const mine = playerActs(s)[0];
    quickRows31(s, { kind: 'act', id: mine });
    quickRows31(s, { kind: 'city', id: 'rio' });
    searchActions31(s, 'contratar a');
    searchActions31(s, 'lançar');
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('RN-03 e RN-27/28 · etiquetas', () => {
  it('obrigações viram estimado / reservado / a pagar; previsões e autópsias viram cálculo ou hipótese', () => {
    expect(oblMoney31('reserve')).toBe('reserved');
    expect(oblMoney31('commitment')).toBe('estimated');
    expect(oblMoney31('loan')).toBe('payable');
    expect(oblMoney31('payable')).toBe('payable');
    expect(forecastBasis31(0.2)).toBe('guess');
    expect(forecastBasis31(0.7)).toBe('calc');
    expect(autopsyBasis31('low')).toBe('guess');
    expect(autopsyBasis31('high')).toBe('calc');
    for (const d of [...Object.values(MONEY31), ...Object.values(BASIS31)]) expect(filled(d.label) && filled(d.hint)).toBe(true);
  });
});

describe('RN-15 / RN-09 · favoritos e metas persistem no save', () => {
  it('fixa, desfixa, cria metas e volta igual depois de salvar e carregar', () => {
    const g = game('r31o-save', 1980);
    const mine = playerActs(g)[0];
    expect(toggleFav31(g, 'act', { area: 'artists', actId: mine })).toBe(true);
    expect(toggleFav31(g, 'screen', { area: 'finance' }, l('Finanças', 'Finance'))).toBe(true);
    expect(toggleFav31(g, 'city', { area: 'world', intent: 'city:rio' })).toBe(true);
    expect(toggleFav31(g, 'city', { area: 'world', intent: 'city:rio' })).toBe(false);
    expect(favs31(g)).toHaveLength(2);
    const a = addGoal31(g, { kind: 'cash', target: g.player.cash + 1_000_000 });
    const b = addGoal31(g, { kind: 'fame', target: 90, actId: mine, byYear: 1985 });
    expect('err' in addGoal31(g, { kind: 'fame', target: 50 })).toBe(true);
    expect('err' in addGoal31(g, { kind: 'cash', target: 0 })).toBe(true);
    expect('id' in a && 'id' in b).toBe(true);
    const back = decodeSave20(encodeSave20(g), migrate);
    expect(my31(back)).toEqual(my31(g));
    expect(isFav31(back, 'act', { area: 'artists', actId: mine })).toBe(true);
    expect(favs31(back).map((f) => f.key)).toEqual(favs31(g).map((f) => f.key));
  });

  it('metas: progresso de contagem parte do momento da criação; a virada do mês carimba quando cumpre', () => {
    const g = game('r31o-goal', 1980);
    const r = addGoal31(g, { kind: 'releases', target: 2 });
    if ('err' in r) throw new Error('meta');
    expect(goalProgress31(g, r).cur).toBe(0);
    g.player.stats.releases += 2;
    expect(goalProgress31(g, r).done).toBe(true);
    expect(r.done).toBeUndefined();
    stampGoals31(g);
    expect(r.done).toBe(g.week);
    const c = addGoal31(g, { kind: 'cash', target: g.player.cash + 10_000_000, byYear: g.year });
    if ('err' in c) throw new Error('meta');
    g.year += 1;
    stampGoals31(g);
    expect(c.missed).toBe(g.week);
    expect(removeGoal31(g, c.id)).toBe(true);
    expect(my31(g).goals.map((x) => x.id)).toEqual([r.id]);
  });
});
