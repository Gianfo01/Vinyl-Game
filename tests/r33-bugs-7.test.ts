// R33 · BUGS33 item 7 — "não consigo reordenar os objetos" no modo Arrumar: os obrigatórios (cofre, arquivo, telefone…)
// trocam de lugar entre si (mesa com mesa, chão com chão), a ordem fica no estado e sobrevive a avançar e a salvar/carregar;
// peças de decoração continuam trocando de lugar como antes.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import type { GameState } from '../src/sim/types';
import { DECO31 } from '../src/data/deco31';
import { decoPlaces31, deco31, orderReq31, placeDeco31, reqKey31, reqNeighbor31, setReq31, spotKey31, swapReq31 } from '../src/sim/r31/deco31';
import { createObj } from '../src/sim/r31/object';
import { ME31 } from '../src/sim/r31/relic31';
import { setSw } from '../src/sim/r31/switches';
import { advanceWeek } from '../src/sim/tick';
import { decodeSave20, encodeSave20 } from '../src/core/save20';
import { migrate } from '../src/ui/store';

const game = (): GameState => createGame(defaultConfig('bugs33-7', { startYear: 1962, scenario: 'established' }));
const office = (s: GameState) => decoPlaces31(s).find((p) => p.key === 'sede')!.rooms.find((r) => r.id === 'office')!.req;

describe('BUGS33 item 7: reordenar no Arrumar', () => {
  it('cofre e arquivo trocam de lugar; o telefone não vai para o chão', () => {
    const s = game();
    const before = office(s);
    expect(before.slice(0, 3)).toEqual(['telefone', 'arquivoaco', 'cofre']);
    expect(swapReq31(s, 'sede', 'office', 'cofre', 'arquivoaco').ok).toBe(true);
    const after = office(s);
    expect(after.indexOf('cofre')).toBe(before.indexOf('arquivoaco'));
    expect(after.indexOf('arquivoaco')).toBe(before.indexOf('cofre'));
    const r = swapReq31(s, 'sede', 'office', 'telefone', 'cofre');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.why).toBe('wrong_slot');
    expect(office(s)).toEqual(after);
  });

  it('o nível instalado acompanha o item (a chave é o item, não a posição)', () => {
    const s = game();
    const up = createObj(s, { modelId: 'upg:u_cofre_2_1940', origin: 'gift', owner: ME31 });
    if (!up.ok) throw new Error(up.why);
    expect(setReq31(s, reqKey31('sede', 'office', 'cofre'), up.v.id).ok).toBe(true);
    expect(swapReq31(s, 'sede', 'office', 'cofre', 'mesames').ok).toBe(true);
    expect(deco31(s).req[reqKey31('sede', 'office', 'cofre')]).toBe(up.v.id);
  });

  it('setas: vizinho do mesmo grupo; ordem guardada tolera item novo', () => {
    const req = ['telefone', 'arquivoaco', 'cofre', 'livrocaixa', 'fichario', 'mesames', 'radiotv'];
    expect(reqNeighbor31(req, 'telefone', 1)).toBe('livrocaixa');
    expect(reqNeighbor31(req, 'telefone', -1)).toBeUndefined();
    expect(reqNeighbor31(req, 'cofre', -1)).toBe('arquivoaco');
    expect(orderReq31(['a', 'b', 'c'], ['c', 'x', 'a'])).toEqual(['c', 'a', 'b']);
  });

  it('a ordem sobrevive a avançar e a salvar/carregar; desligado não troca', () => {
    const s = game();
    swapReq31(s, 'sede', 'office', 'cofre', 'arquivoaco');
    const o = office(s);
    for (let i = 0; i < 4; i++) advanceWeek(s);
    expect(office(s)).toEqual(o);
    const t = decodeSave20(encodeSave20(s), migrate) as GameState;
    expect(office(t)).toEqual(o);
    setSw(t, 'deco31', false);
    expect(swapReq31(t, 'sede', 'office', 'cofre', 'arquivoaco').ok).toBe(false);
  });

  it('peças de decoração continuam trocando de lugar (mesma instância)', () => {
    const s = game();
    const ws = DECO31.filter((d) => d.slots.includes('wall') && d.places.includes('home')).slice(0, 2);
    const ids = ws.map((d) => { const r = createObj(s, { modelId: `deco:${d.id}`, origin: 'gift', owner: ME31 }); if (!r.ok) throw new Error(r.why); return r.v.id; });
    placeDeco31(s, ids[0], spotKey31('home', 'sala', 'w1'));
    placeDeco31(s, ids[1], spotKey31('home', 'sala', 'w2'));
    expect(placeDeco31(s, ids[0], spotKey31('home', 'sala', 'w2')).ok).toBe(true);
    expect(deco31(s).at[spotKey31('home', 'sala', 'w2')]).toBe(ids[0]);
    expect(deco31(s).at[spotKey31('home', 'sala', 'w1')]).toBe(ids[1]);
  });
});
