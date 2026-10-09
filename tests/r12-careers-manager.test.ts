// Rodada 12 — carreiras (escolhas do Novo Jogo, agenda, herdeiro), mercado de serviços de NPCs e empresário com confiança.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { careers, dropCareer, startCareer, timeLoad } from '../src/sim/sys/careers12';
import { providers, remaining, requestService, signService } from '../src/sim/sys/services12';
import { ambitionsOf, answerIssue, c12, proposePlan, resolveDilemma, talk, type Amb } from '../src/sim/sys/manager12';
import { ventures } from '../src/sim/sys/ventures9';
import { money, rngOf } from '../src/sim/util';

const mk = (seed: string, careers?: { main: string[]; origin?: string; ambition?: string }) => createGame(defaultConfig(seed, { startYear: 1990, careers }));

describe('carreiras r12', () => {
  it('aplica escolhas do Novo Jogo e a agenda cheia estressa', () => {
    const base = mk('r12-c');
    const s = mk('r12-c', { main: ['label', 'manager'], origin: 'lawyer', ambition: 'money' });
    expect(careers(s).active).toEqual(['label', 'manager']);
    expect(ownerOf(s).attrs.negotiation).toBeGreaterThan(ownerOf(base).attrs.negotiation);
    for (const id of ['festival', 'studio', 'media', 'booking']) expect(startCareer(s, id).ok).toBe(true);
    expect(timeLoad(s)).toBeGreaterThan(1);
    const st0 = ownerOf(s).stress;
    advanceMonth(s);
    expect(ownerOf(s).stress).toBeGreaterThan(st0 - 10);
    expect(dropCareer(s, 'media').ok).toBe(true);
    expect(careers(s).active).not.toContain('media');
  });
});

describe('serviços e empresário r12', () => {
  it('capacidade limitada, plano co-escolhido, dilema e prestação de contas', () => {
    const s = mk('r12-m', { main: ['manager'], origin: 'musician', ambition: 'legacy' });
    const r = rngOf(s);
    const a = Object.values(s.acts).find((x) => x.status !== 'retired' && !x.playerBand && x.fame >= 20)!;
    ventures(s).mg.clients.push({ actId: a.id, rate: 0.15, since: s.week, sat: 60, earned: 0 });
    // mercado: lota a capacidade do mês
    const p = providers(s, 'studio')[0];
    expect(p).toBeTruthy();
    a.cash += money(s, 1_000_000);
    while (remaining(s, p)) expect(signService(s, r, p.id, a.id, 100, 'test', 'act').ok).toBe(true);
    expect(requestService(s, r, p.id, a.id, money(s, 999999), 'test').status).toBe('full');
    // plano: o artista recusa metas que não são dele; aceita as que são
    expect(talk(s, a.id).ok).toBe(true);
    const amb = ambitionsOf(s, a.id);
    const other = (['money', 'recognition', 'family', 'international', 'art'] as Amb[]).filter((k) => !amb.includes(k));
    expect(proposePlan(s, a.id, other.slice(0, 1)).ok).toBe(false);
    const t0 = c12(s, a.id).trust;
    expect(proposePlan(s, a.id, [...amb.filter((k) => k !== 'genre'), 'family']).ok).toBe(true);
    expect(c12(s, a.id).trust).toBeGreaterThan(t0 - 6);
    // dilema: escolher o dinheiro quebra a promessa e é lembrado
    const x = c12(s, a.id);
    x.dilemma = { gross: money(s, 50000), w: s.week };
    const t1 = x.trust;
    resolveDilemma(s, a.id, 'full');
    expect(x.trust).toBeLessThan(t1 - 10);
    expect(x.promises.some((q) => q.kept === false)).toBe(true);
    // esconder um problema guarda a bomba para depois
    x.issue = { t: { pt: 'x', en: 'x' }, w: s.week };
    answerIssue(s, a.id, 'hide');
    expect(x.hidden.length).toBe(1);
    for (let i = 0; i < 3; i++) advanceMonth(s);
  });
});
