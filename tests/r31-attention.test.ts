// Masters 31 (onda 0, W0-AT): fila única de avisos. `notify` grava também na fila; pendências contam uma vez só.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import { ATTN_BUDGET, ATTN_CAP, attn, attnQueue, pendingCount, pushAttn, resolveAttn, type AttnItem } from '../src/sim/attention';
import { notify } from '../src/sim/util';

const game = () => createGame(defaultConfig('r31attn', { startYear: 1975 }));

describe('r31 W0-AT · fila única de avisos', () => {
  it('o item tem os campos do contrato', () => {
    const s = game();
    const it0: AttnItem = pushAttn(s, { cat: 'money', prio: 2, title: l('A', 'A'), body: l('b', 'b'), from: 'r31', pendId: 'p1', dest: { area: 'finance', tab: 'loans', id: 'x' } });
    expect(it0.id).toMatch(/^a\d+$/);
    expect(it0.at).toBe(s.week);
    expect(it0.seen).toBe(false);
    expect(attnQueue(s).some((x) => x.id === it0.id)).toBe(true);
  });

  it('notify grava em s.notifications e na fila', () => {
    const s = game();
    const n0 = s.notifications.length, q0 = attn(s).q.length;
    notify(s, l('Aviso r31', 'r31 notice'), 'bad');
    expect(s.notifications.length).toBe(n0 + 1);
    expect(attn(s).q.length).toBe(q0 + 1);
    expect(attn(s).q[attn(s).q.length - 1]).toMatchObject({ cat: 'bad', prio: 2 });
    notify(s, l('Pendência r31', 'r31 pending'), 'info', { cat: 'deadline', prio: 3, pendId: 'r31:dl', dest: { area: 'calendar19' } });
    expect(attnQueue(s)[0].pendId).toBe('r31:dl');
  });

  it('pendingCount conta pendências únicas por pendId, sem duplicar', () => {
    const s = game();
    const p0 = pendingCount(s);
    pushAttn(s, { cat: 'decision', prio: 2, title: l('X', 'X'), pendId: 'dup' });
    pushAttn(s, { cat: 'people', prio: 1, title: l('X de novo', 'X again'), pendId: 'dup' });
    pushAttn(s, { cat: 'decision', prio: 1, title: l('Y', 'Y'), pendId: 'other' });
    pushAttn(s, { cat: 'info', prio: 0, title: l('Z', 'Z') });
    expect(pendingCount(s)).toBe(p0 + 2);
    expect(attn(s).q.filter((x) => x.pendId === 'dup').length).toBe(1); // o novo atualiza o antigo
    expect(attn(s).q.find((x) => x.pendId === 'dup')!.prio).toBe(2); // a prioridade não cai
    expect(resolveAttn(s, 'dup')).toBe(1);
    expect(pendingCount(s)).toBe(p0 + 1);
  });

  it('orçamento único do mês e teto da fila', () => {
    const s = game();
    attn(s).bm = -1;
    for (let i = 0; i < ATTN_BUDGET + 5; i++) pushAttn(s, { cat: 'info', prio: 0, title: l(`r${i}`, `r${i}`) });
    pushAttn(s, { cat: 'bad', prio: 2, title: l('grave', 'serious') });
    const mine = attn(s).q.filter((x) => /^r\d+$/.test(x.title.pt));
    expect(mine.filter((x) => x.fold).length).toBe(5);
    expect(attn(s).q.find((x) => x.title.pt === 'grave')!.fold).toBeUndefined();
    for (let i = 0; i < ATTN_CAP * 2; i++) pushAttn(s, { cat: 'info', prio: 0, title: l('x', 'x') });
    expect(attn(s).q.length).toBeLessThanOrEqual(ATTN_CAP);
  });
});
