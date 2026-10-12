// r25 (Pixel Studio, fase 3 "Sede viva"): o modelo da Sede é função pura do estado.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import { ROOM_CAP25, ROOMS25, era25, hqModel25 } from '../src/ui/ps/hq25model';
import { plan27 } from '../src/ui/ps/hqpx27';

const game = (seed: string, year = 1975): GameState => createGame(defaultConfig(seed, { scenario: 'established', startYear: year, dbSize: 'small' } as Parameters<typeof defaultConfig>[1]));
const room = (m: ReturnType<typeof hqModel25>, id: string) => m.rooms.find((r) => r.id === id)!;

describe('r25 era e planta', () => {
  it('imagem por ano e tamanho da sede', () => {
    expect(era25(1950)).toBe('heritage');
    expect(era25(1959, 5)).toBe('heritage');
    expect(era25(1960)).toBe('garage');
    expect(era25(1989, 4)).toBe('garage');
    expect(era25(2005, 3)).toBe('modern');
    expect(era25(2005, 0)).toBe('garage'); // selo na garagem não ganha prédio de vidro
  });
  it('r27: salas desenhadas (pixel art) dentro do desenho e sem sobreposição, em todo nível', () => {
    for (let hq = 0; hq <= 5; hq++) for (const year of [1950, 1975, 2005]) {
      const p = plan27({ hq, year });
      const xs = p.cells.map((c) => [c.x, c.y, c.w, c.h]);
      for (const [x, y, w, h] of xs) { expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0); expect(x + w).toBeLessThanOrEqual(p.W); expect(y + h).toBeLessThanOrEqual(p.H); }
      for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
        const [a, b] = [xs[i], xs[j]];
        const overlap = a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
        expect(overlap).toBe(false);
      }
    }
  });
});

describe('r25 hqModel25', () => {
  it('modelo básico: 6 salas com selo, no máximo 3 tarefas, cada uma com botão e destino', () => {
    const s = game('r25-a');
    const m = hqModel25(s);
    expect(m.rooms.map((r) => r.id)).toEqual(ROOMS25);
    for (const r of m.rooms) { expect(r.badges.length).toBeGreaterThan(0); expect(r.sprites.length).toBeLessThanOrEqual(ROOM_CAP25); expect(r.go.area).toBeTruthy(); }
    expect(m.needs.length).toBeLessThanOrEqual(3);
    for (const n of m.needs) { expect(n.cta.pt).toBeTruthy(); expect(n.go.area).toBeTruthy(); }
    expect(m.cast.length).toBe(playerActs(s).filter((id) => !['retired', 'split'].includes(s.acts[id].status)).length);
    // estados vazios dizem o próximo passo (nada de "0" solto)
    for (const r of m.rooms) for (const b of r.badges) expect(b.text.pt).not.toMatch(/^\s*0\s*$/);
  });

  it('gravação em andamento: artista no estúdio, selo verde e agenda com a sessão', () => {
    const s = game('r25-b');
    const actId = playerActs(s)[0];
    // sessão mínima em andamento (o formato real de StudioSession; startSession exige música não gravada)
    s.sessions.push({ id: 'ses25', actId, songIds: [], approach: 'balanced', tier: 0, startDay: s.day, days: 4, dayDone: 1, takes: {}, costPaid: 0, log: [] });
    const m = hqModel25(s);
    const st = room(m, 'studio');
    expect(st.badges[0].tone).toBe('good');
    expect(st.badges[0].text.pt).toContain('Gravando');
    expect(m.cast.find((c) => c.actId === actId)!.where).toBe('studio');
    expect(st.sprites.some((x) => x.actId === actId)).toBe(true);
    expect(m.agenda[0].kind).toBe('studio');
  });

  it('turnê rodando: artista fora da sede; decisão pendente: recepção e "Precisa de você"', () => {
    const s = game('r25-c');
    const id = playerActs(s)[0];
    s.tours.push({ id: 't25', actId: id, name: 'Tour 25', stops: [], setlist: [], minutes: 45, production: 0, role: 'headline', crew: 1, pay: 'door', costReserved: 0, revenue: 0, costs: 0, status: 'running', log: [], accidents: 0 });
    s.decisions.push({ id: 'd25', eventId: 'x', cat: 'x', title: { pt: 'Decisão teste', en: 'Test decision' }, text: { pt: '', en: '' }, options: [], ctx: { dl18: s.week + 1 }, week: s.week, defaultOption: '', tags: [] });
    const m = hqModel25(s);
    expect(m.away.some((x) => x.actId === id)).toBe(true);
    expect(m.cast.find((c) => c.actId === id)!.where).toBe('away');
    expect(room(m, 'lobby').badges[0].tone).toBe('bad');
    expect(m.needs[0].id).toBe('dec:d25');
    expect(m.needs[0].go.tab).toEqual(['ck20', 'inbox']);
  });

  it('sem elenco: a primeira tarefa é encontrar um artista; caixa negativo vira alerta no escritório', () => {
    const s = game('r25-d');
    for (const a of Object.values(s.acts)) if (a.owner === 'player') a.owner = 'npc' as typeof a.owner;
    s.player.cash = -100;
    const m = hqModel25(s);
    expect(m.cast).toEqual([]);
    expect(room(m, 'lounge').badges[0].tone).toBe('warn');
    expect(room(m, 'office').badges[0].tone).toBe('bad');
    const ids = m.needs.map((n) => n.id);
    expect(ids).toContain('step:artist');
    expect(ids).toContain('cash');
  });

  it('sede pequena: salas sem espaço próprio ficam apagadas com a dica; equipe grande vira "+N"', () => {
    const s = game('r25-e', 2005);
    s.player.hq = 0;
    for (let i = 0; i < 8; i++) s.player.staff.push({ id: `x${i}`, name: `Pessoa ${i}`, role: 'admin', skill: 50, salary: 0, hiredWeek: 0 });
    const m = hqModel25(s);
    expect(m.era).toBe('garage');
    expect(m.city).toBe(s.config.homeCity);
    expect(plan27({ hq: m.hq, year: m.year }).rooms).not.toContain('anr'); // sala fechada não é desenhada
    expect(room(m, 'anr').open).toBe(false);
    expect(room(m, 'anr').lockNote).toBeTruthy();
    expect(room(m, 'stage').open).toBe(false);
    expect(room(m, 'studio').open).toBe(true);
    const off = room(m, 'office');
    expect(off.sprites.length).toBe(ROOM_CAP25);
    expect(off.more).toBeGreaterThan(0);
  });
  it('r27 I1: o modelo traz as salas e andares compráveis do nível (garagem: nenhum; torre: fechados com custo)', () => {
    const s = game('r25-f', 1975);
    s.player.hq = 0;
    expect(hqModel25(s).units).toEqual([]);
    s.player.hq = 4;
    const m = hqModel25(s);
    expect(m.units.length).toBeGreaterThan(4);
    expect(m.units.every((u) => u.status === 'locked' && u.cost > 0)).toBe(true);
    expect(m.units.filter((u) => u.kind === 'floor').length).toBe(2);
    // a planta desenhada usa o mesmo estado (andares fechados → salas deles escuras)
    const p = plan27({ hq: m.hq, year: m.year, units: Object.fromEntries(m.units.map((u) => [u.id, u.status])) });
    expect(Object.keys(p.flock).map(Number).sort()).toEqual([3, 4]);
  });
});
