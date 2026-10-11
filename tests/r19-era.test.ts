// Rodada 19 (smoke): nada do futuro na tela — vizinhos só com gravadoras já fundadas e nomes bilíngues de
// época, ano documentado das gravadoras reais, rótulos de época (era19) e o "Grupo e consolidado" com todo
// negócio ativo do jogador.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { ERA19, deptName19, pbText19, skillName19 } from '../src/sim/era19';
import { nb19, nbNames19 } from '../src/sim/sys/hood19';
import { REAL_LABEL_FOUNDED } from '../src/data/realnames';
import { ventures } from '../src/sim/sys/ventures9';
import { PLAYBOOKS } from '../src/sim/sys/rivals8';
import { DEPT_NAME } from '../src/sim/sys/eras12';
import { extraTabs } from '../src/ui/registry';
import '../src/ui/sys/media18';
import { rows19 } from '../src/ui/sys/careers19';

const FUT = /stream|\bTV\b|rádio|radio|vinil|vinyl|internet|redes|social|playlist|viral|download|digital|\bCD\b/i;
const game = (y: number, extra: Record<string, unknown> = {}) => createGame(defaultConfig(`era19-${y}`, { startYear: y, ...extra }));

describe('r19 era: nada do futuro', () => {
  it('vizinhos: rival só se já fundada; nomes bilíngues e de época', () => {
    for (const y of [1889, 1925, 1955, 1975]) for (const seed of ['a', 'b', 'c']) {
      const s = createGame(defaultConfig(`nb-${seed}-${y}`, { startYear: y, realNames: true }));
      for (const x of nb19(s)) {
        expect(typeof x.name.pt).toBe('string');
        expect(typeof x.name.en).toBe('string');
        if (x.who) expect(s.labels[x.who].founded).toBeLessThanOrEqual(y);
        for (const lb of Object.values(s.labels)) if (lb.founded > y) expect(x.name.pt.includes(lb.name)).toBe(false);
        if (y < 1948) expect(x.name.pt).not.toMatch(/vinil/i);
      }
    }
    const s = game(1925);
    expect(nbNames19(s, 'records').some((n) => /vinil/i.test(n.pt))).toBe(false);
    expect(nbNames19(game(1889), 'records').map((n) => n.en)).toContain('Phonograph Parlour');
    expect(nbNames19(game(1970), 'records').some((n) => /vinil/i.test(n.pt))).toBe(true);
  });

  it('gravadoras reais não nascem antes do ano documentado', () => {
    const s = createGame(defaultConfig('real-1950', { startYear: 1950, realNames: true }));
    const ch = s.labels.carioca_fono;
    expect(ch.name).toBe('Chantecler');
    expect(ch.founded).toBeGreaterThanOrEqual(REAL_LABEL_FOUNDED.carioca_fono);
    expect(ch.active).toBe(false);
    // no modo ficcional, nada muda
    expect(game(1950).labels.carioca_fono.founded).toBeLessThan(REAL_LABEL_FOUNDED.carioca_fono);
  });

  it('rótulos de época: 1889 sem tecnologia do futuro; hoje com', () => {
    const old = game(1889), now = game(2020);
    for (const f of Object.values(ERA19)) expect(f(old).pt).not.toMatch(FUT);
    for (const d of Object.keys(DEPT_NAME)) expect(deptName19(old, d, DEPT_NAME[d as keyof typeof DEPT_NAME]).pt).not.toMatch(/rádio|\bTV\b|digital/i);
    for (const id of ['dg_meta', 'dg_social', 'dg_playlist', 'dg_data', 'dg_viral', 'dg_platform']) expect(skillName19(old, id, undefined)!.pt).not.toMatch(FUT);
    const pb = pbText19(old, 'conglomerate', PLAYBOOKS.conglomerate);
    expect([pb.desc, ...pb.tells].map((x) => x.pt).join(' ')).not.toMatch(/rádio|\bTV\b/);
    expect(ERA19.audience(now).pt).toMatch(/streaming/);
    expect(ERA19.talentShow(now).pt).toBe('TV de talentos');
    expect(ERA19.talentShow(game(1935)).pt).toMatch(/rádio/);
    const tabs = extraTabs('mediaHub', old).map((x) => x.label).join(' | ');
    expect(tabs).not.toMatch(/streaming|virais/i);
    expect(extraTabs('mediaHub', now).map((x) => x.label).join(' | ')).toMatch(/streaming/i);
  });

  it('Grupo e consolidado: todo negócio ativo aparece, mesmo sem receita', () => {
    const s = createGame(defaultConfig('grp19', { startYear: 1975, careers: { main: ['festival', 'manager'] } }));
    advanceMonth(s);
    const fest = ventures(s).list.filter((v) => v.kind === 'festival');
    expect(fest.length).toBeGreaterThan(0);
    const rows = rows19(s);
    for (const v of fest) expect(rows.some((r) => r.name.includes(v.name))).toBe(true);
    expect(rows.some((r) => /Empresário|Manager/.test(r.name))).toBe(true);
  });
});
