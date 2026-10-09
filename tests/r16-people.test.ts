// Rodada 16 — uma identidade por pessoa (artista = produtor = empresário = CEO), empresários da praça para atos
// gerados, vida completa para a indústria (vício, reabilitação, morte com efeito no cargo) e sucessão nos selos rivais.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { availableProducers } from '../src/sim/studio';
import { m14, mgrActive, repOf } from '../src/sim/sys/managers14';
import { mgrById } from '../src/data/managers14';
import { leaders, leaderOf } from '../src/sim/sys/leaders10';
import { realDataOf } from '../src/sim/sys/realworld';
import { canon16, clientsOf16, force16, isGen16, keys16, life16, roles16, successions16 } from '../src/sim/sys/people16';

describe('r16 pessoas', () => {
  it('quem é artista e produtor é uma pessoa só, com os dois cargos', () => {
    const s = createGame(defaultConfig('r16-id', { startYear: 2001, realNames: true, mode: 'historic' }));
    const ks = keys16(s, 'pd:dre');
    expect(ks[0].startsWith('p:')).toBe(true);
    expect(canon16(s, 'pd:dre')).toBe(ks[0]);
    const roles = roles16(s, ks[0]).map((x) => x.role);
    expect(roles).toContain('artist');
    expect(roles).toContain('producer');
    expect(s.persons[ks[0].slice(2)].name).toBe('Dr. Dre');
    // produtor que nunca foi artista continua com a própria chave
    expect(canon16(s, 'pd:martinmax')).toBe('pd:martinmax');
  });

  it('empresário real liga o cliente no ano certo; atos gerados ganham empresário da praça', () => {
    const s = createGame(defaultConfig('r16-m', { startYear: 1963, realNames: true, mode: 'historic' }));
    for (let i = 0; i < 2; i++) advanceMonth(s);
    const beatles = Object.values(s.acts).find((a) => realDataOf(a)?.n === 'The Beatles')!;
    expect(repOf(s, beatles.id)?.id).toBe('epstein');
    expect(clientsOf16(s, 'epstein').some((c) => c.act.id === beatles.id && c.from <= 1963 && c.to === undefined)).toBe(true);
    const f = createGame(defaultConfig('r16-g', { startYear: 1975, realNames: false, mode: 'free' }));
    for (let i = 0; i < 24; i++) advanceMonth(f);
    const gen = Object.entries(m14(f).rep).filter(([, r]) => isGen16(r.m));
    expect(gen.length).toBeGreaterThan(0);
    expect(f.acts[gen[0][0]].catalogNo).toBeFalsy();
  });

  it('vida com efeito no cargo: reabilitação fecha a agenda, morte libera clientes e abre sucessão', () => {
    const s = createGame(defaultConfig('r16-l', { startYear: 1985, realNames: true, mode: 'historic' }));
    advanceMonth(s);
    force16(s, 'pd:rubin', 'rehab', 10);
    expect(life16(s, 'pd:rubin')!.st).toBe('rehab');
    expect(s.producerBusy.rp_rubin).toBeGreaterThanOrEqual(s.week + 10);
    force16(s, 'pd:lange', 'dead');
    expect(availableProducers(s).some((p) => p.id === 'rp_lange')).toBe(false);
    // empresário morto sai de cena e os clientes ficam livres
    const mid = Object.values(m14(s).rep)[0]?.m;
    expect(mid).toBeTruthy();
    force16(s, `e:${mid}`, 'dead');
    expect(mgrActive(s, mgrById[mid])).toBe(false);
    expect(Object.values(m14(s).rep).some((r) => r.m === mid)).toBe(false);
    // líder rival morre: sucessor empossado e registrado no histórico do selo
    const lb = Object.values(s.labels).find((x) => x.active && leaderOf(s, x.id))!;
    const old = leaderOf(s, lb.id)!;
    force16(s, `l:${old.id}`, 'dead');
    expect(leaders(s).L[old.id].st).toBe('dead');
    const nw = leaderOf(s, lb.id)!;
    expect(nw.id).not.toBe(old.id);
    const h = successions16(s, lb.id);
    expect(h[0].inId).toBe(nw.id);
    expect(h[0].out).toBe(old.name);
    // o tempo passa e a vida da indústria acontece (rodízio)
    for (let i = 0; i < 24; i++) advanceMonth(s);
    expect(Object.keys((s.x4 as unknown as { people16: { L: object } }).people16.L).length).toBeGreaterThan(30);
  });
});
