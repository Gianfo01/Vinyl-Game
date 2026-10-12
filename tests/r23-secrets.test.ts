// Rodada 23 — segredos e vínculos (secrets23): ciclo escondido → suspeita → boato → confirmado por um canal, regras de
// história (Vida real exata: nada inventado sobre gente real; fora dele, no máximo boato), exposição pesada pela época,
// cartão de decisão e ida e volta no save.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { resolveDecision } from '../src/sim/events';
import { recentFacts } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { isReal } from '../src/sim/sys/crime17';
import '../src/sim/sys/index';
import {
  _secrets23, addSecret23, eraK23, expose23, investigate23, know23, raise23, sec23, secById23, secretsOf23,
} from '../src/sim/sys/secrets23';
import type { GameState } from '../src/sim/types';

const fictAct = (s: GameState) => Object.values(s.acts).filter((a) => !a.catalogNo && a.owner !== 'player' && a.members.length && a.members.every((m) => !isReal(s, m)) && a.status !== 'retired' && a.status !== 'split').sort((a, b) => b.fame - a.fame)[0];

describe('r23 segredos e vínculos', () => {
  it('ciclo: escondido → suspeita → boato → confirmado (proximidade, imprensa, detetive), com fatos', () => {
    const s = createGame(defaultConfig('r23-s1', { startYear: 1990 }));
    const a = fictAct(s)!;
    const pid = a.members[0];
    const sec = addSecret23(s, { kind: 'affair', subject: `p:${pid}`, sev: 50, ev: 40 });
    expect(know23(s, sec).p).toBe(0);
    expect(raise23(s, sec, 'player', 1, 'proximity')).toBe(1);
    expect(raise23(s, sec, 'press', 2, 'press')).toBe(2);
    expect(know23(s, sec).pr).toBe(2);
    // detetive: vários casos até um achar algo (chance, não certeza)
    s.player.cash = 1e9;
    let found = false;
    for (let i = 0; i < 30 && !found; i++) {
      expect(typeof investigate23(s, `p:${pid}`).pt).toBe('string');
      s.week += 5;
      _secrets23.resolveInv(s, Rng.fromSeed(`inv${i}`));
      found = know23(s, sec).p >= 3;
    }
    expect(found).toBe(true);
    const fs = recentFacts(s, { months: 600 }).filter((f) => f.kind === 'secret23' && f.data?.sec === sec.id);
    expect(fs.length).toBeGreaterThanOrEqual(3);
    expect(fs.some((f) => f.visibility === 'rumor')).toBe(true); // a imprensa no boato
    // cartão de decisão nasceu ao chegar no boato; proteger resolve
    const d = s.decisions.find((x) => x.eventId === 'sit17:secret23' && x.ctx?.c_sec === sec.id);
    expect(d).toBeTruthy();
    expect(resolveDecision(s, d!.id, 'protect')).toBe(true);
    expect(sec23(s).k[sec.id].done).toBe('protect');
    expect((sec23(s).k[sec.id].prot ?? 0)).toBeGreaterThan(s.week);
  });

  it('Vida real exata: nenhum segredo inventado sobre gente real; fora dele, no máximo boato', () => {
    const s = createGame(defaultConfig('r23-s2', { startYear: 1975, mode: 'historic', realNames: true }));
    s.config.history = 'strict';
    const rp = Object.values(s.persons).find((p) => p.alive && isReal(s, p.id));
    expect(rp).toBeTruthy();
    const inv = addSecret23(s, { kind: 'tax', subject: `p:${rp!.id}`, sev: 50, ev: 40, real: true });
    expect(secretsOf23(s, `p:${rp!.id}`).some((x) => x.id === inv.id)).toBe(false);
    for (const a of Object.values(s.acts)) a.cash = -1000; // aperto de dinheiro em todo lugar (agiotas)
    for (let i = 0; i < 36; i++) { _secrets23.nativeMonth(s, Rng.fromSeed(`n${i}`)); s.week += 4; if (++s.month > 12) { s.month = 1; s.year++; } }
    for (const x of sec23(s).own) if (x.id !== inv.id) expect(x.real ?? false).toBe(false);
    // modo livre: aparece, mas trava no boato e a exposição não inventa escândalo
    s.config.history = 'loose';
    _secrets23.bust();
    const x = secById23(s, inv.id)!;
    expect(x).toBeTruthy();
    expect(raise23(s, x, 'player', 4, 'investigation')).toBe(2);
    const sc0 = Object.values(s.acts).reduce((t, a) => t + a.scandals, 0);
    expect(expose23(s, x, { pt: 'teste', en: 'test' }).eff).toBe(0);
    expect(Object.values(s.acts).reduce((t, a) => t + a.scandals, 0)).toBe(sc0);
    expect(know23(s, x).pr).toBeLessThanOrEqual(2);
  });

  it('vazamento vira escândalo pesado pela época (jabá antes × depois das audiências de 1959)', () => {
    const s = createGame(defaultConfig('r23-s3', { startYear: 1960 }));
    const a = fictAct(s)!;
    a.fame = Math.max(a.fame, 40);
    const s1 = addSecret23(s, { kind: 'payola', subject: `a:${a.id}`, sev: 60, ev: 50 });
    const s2 = addSecret23(s, { kind: 'payola', subject: `a:${a.id}`, sev: 60, ev: 50 });
    s.year = 1956;
    const k56 = eraK23(s, s1).k;
    const e56 = expose23(s, s1, { pt: 'x', en: 'x' }).eff;
    s.year = 1961;
    const k61 = eraK23(s, s2).k;
    const e61 = expose23(s, s2, { pt: 'x', en: 'x' }).eff;
    expect(k56).toBeLessThan(k61);
    expect(e56).toBeGreaterThan(0);
    expect(e61).toBeGreaterThan(e56);
    expect(a.scandals).toBeGreaterThanOrEqual(2);
    expect(know23(s, s1).pr).toBe(4);
  });

  it('conhecimento e segredos nativos persistem no save (JSON)', () => {
    const s = createGame(defaultConfig('r23-s4', { startYear: 1990 }));
    const a = fictAct(s)!;
    const sec = addSecret23(s, { kind: 'shark', subject: `p:${a.members[0]}`, sev: 35, ev: 40, data: { o: 'x', amt: 100 } });
    raise23(s, sec, 'player', 2, 'informant');
    const raw = JSON.parse(JSON.stringify(s)) as GameState;
    _secrets23.bust();
    const x = secById23(raw, sec.id)!;
    expect(x.kind).toBe('shark');
    expect(know23(raw, x).p).toBe(2);
    expect(sec23(raw).k[sec.id].how.at(-1)?.ch).toBe('informant');
  });

  it('o mês roda no jogo inteiro (gancho registrado, descoberta e nativos) sem erro', { timeout: 300000 }, () => {
    const s = createGame(defaultConfig('r23-s5', { startYear: 1980 }));
    advanceMonth(s);
    for (let i = 0; i < 36; i++) { const r = Rng.fromSeed(`d${i}`); _secrets23.nativeMonth(s, r); _secrets23.discoverMonth(s, r); s.week += 4; if (++s.month > 12) { s.month = 1; s.year++; } }
    expect(sec23(s).own.length).toBeGreaterThan(0);
    expect(_secrets23.tracked(s).length).toBeGreaterThan(5);
  });
});
