// Masters 31 (onda 0, W0-OP) — contrato: opinião sobre o jogador tem dono único (src/sim/opinion.ts).
//
// Varre src/ por escritas diretas nos campos nativos de opinião (líderes `rel.player`, críticos `critrel.rel`,
// lealdade da equipe, `Person.rel[pessoa do jogador]`) e por acesso cru ao registro `op` do x4 fora de
// opinion.ts. ALLOW reflete o estado no fim da onda 0: a onda 31.3 troca esses escritores por opine/setOpinion,
// e a contagem de cada arquivo SÓ PODE DIMINUIR (arquivo novo ou contagem maior = teste falha). Ao reduzir,
// baixe o número aqui (ou apague a linha) no mesmo commit.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { OP_WHY_MAX, hasOpinion, opine, opinionOf, opinionWhy, opState, setOpinion } from '../src/sim/opinion';
import { leaders } from '../src/sim/sys/leaders10';
import { careerOf } from '../src/sim/sys/people/staff';
import { staffAdj13 } from '../src/sim/sys/persona13';

const ROOT = join(__dirname, '..');
const OWNER = 'src/sim/opinion.ts';

/** Padrões de escrita direta (contados por ocorrência). */
const ALWAYS: RegExp[] = [
  /\.rel\.player\s*(?:\+|-)?=(?!=)/g, // líder de selo → você
  /\.rel\[\s*['"]player['"]\s*\]\s*(?:\+|-)?=(?!=)/g, // idem, com colchetes
  /\.loyalty\s*(?:\+|-|\*)?=(?!=)/g, // lealdade da equipe (deriva de opinionOf: 50 + op/2)
  /\.rel\[\s*(?:me|pid|pp\.id|me\.id|pid0\(s\)!?|playerPid|myPid)\s*\]\s*(?:\+|-)?=(?!=)/g, // pessoa → pessoa do jogador
  /p13\([^)]*\)\.op\b/g, // registro antigo da persona13
  /\bx4\.op\b/g, // registro cru
  /\bopState\(/g, // registro cru
];
/** Em arquivos que mexem no estado dos críticos, toda escrita em `.rel[...]` conta. */
const CRITIC_FILE = /critRel\(/;
const CRITIC = /\.rel\[[^\]]+\]\s*(?:\+|-)?=(?!=)/g;

/** Estado no fim da onda 0 (só diminui). */
const ALLOW: Record<string, number> = {
  'src/sim/criticrel.ts': 4,
  'src/sim/scandal17.ts': 1,
  'src/sim/sys/aud27/burnout27.ts': 1,
  'src/sim/sys/aud27/critic27.ts': 1,
  'src/sim/sys/aud27/culture27.ts': 1,
  'src/sim/sys/aud27/kin27.ts': 1,
  'src/sim/sys/aud27/shark27.ts': 2,
  'src/sim/sys/board27.ts': 1,
  'src/sim/sys/crew8.ts': 2,
  'src/sim/sys/crimenpc17.ts': 1,
  'src/sim/sys/crisis27.ts': 1,
  'src/sim/sys/culture19.ts': 3,
  'src/sim/sys/favors27.ts': 1,
  'src/sim/sys/featp29.ts': 1,
  'src/sim/sys/heist27.ts': 1,
  'src/sim/sys/identity8.ts': 1,
  'src/sim/sys/insure19.ts': 2,
  'src/sim/sys/leaders10.ts': 2,
  'src/sim/sys/leisure14.ts': 1,
  'src/sim/sys/links16.ts': 1,
  'src/sim/sys/links19b.ts': 3,
  'src/sim/sys/links23.ts': 1,
  'src/sim/sys/manager12.ts': 3,
  'src/sim/sys/media17.ts': 10,
  'src/sim/sys/member29.ts': 1,
  'src/sim/sys/people/staff.ts': 8,
  'src/sim/sys/rivals12.ts': 2,
  'src/sim/sys/songmkt27.ts': 2,
  'src/sim/sys/writers19.ts': 1,
};

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function scanOpinionWrites(): Record<string, number> {
  const res: Record<string, number> = {};
  for (const abs of walk(join(ROOT, 'src'))) {
    const rel = relative(ROOT, abs).split('\\').join('/');
    if (rel === OWNER) continue;
    const src = readFileSync(abs, 'utf8');
    let n = 0;
    for (const re of ALWAYS) n += src.match(re)?.length ?? 0;
    if (CRITIC_FILE.test(src)) n += src.match(CRITIC)?.length ?? 0;
    if (n) res[rel] = n;
  }
  return res;
}

describe('r31 contrato — opinião em fonte única', () => {
  it('escritas diretas fora de opinion.ts só diminuem (lista de permitidos com contagem)', () => {
    const now = scanOpinionWrites();
    const bad: string[] = [];
    for (const [f, n] of Object.entries(now)) {
      const a = ALLOW[f];
      if (a === undefined) bad.push(`${f}: ${n} escrita(s) nova(s) — use opine/setOpinion de src/sim/opinion.ts`);
      else if (n > a) bad.push(`${f}: ${n} > ${a} permitidas — use opine/setOpinion de src/sim/opinion.ts`);
    }
    expect(bad).toEqual([]);
    // sem folga: quando um arquivo for migrado, baixe/apague a linha no mesmo commit
    const stale = Object.entries(ALLOW).filter(([f, a]) => (now[f] ?? 0) < a).map(([f, a]) => `${f}: ${now[f] ?? 0} < ${a}`);
    expect(stale).toEqual([]);
  });

  it('opine/setOpinion/opinionOf: uma escala, motivos com limite, leitura nativa pela mesma fonte', () => {
    const s = createGame(defaultConfig('r31-op', { startYear: 1975 }));
    // líder: escreve uma vez, lê igual pela API e pelo campo nativo
    const lid = Object.keys(leaders(s).L)[0];
    const lk = `l:${lid}`;
    setOpinion(s, lk, 20, l('teste', 'test'));
    expect(opinionOf(s, lk)).toBe(20);
    expect(leaders(s).L[lid].rel.player).toBe(20);
    for (let i = 0; i < 10; i++) opine(s, lk, -1, l('gesto', 'gesture'));
    expect(opinionWhy(s, lk).length).toBe(OP_WHY_MAX);
    expect(opinionOf(s, lk)).toBeLessThan(20);
    expect(opState(s)[lk].v).toBe(leaders(s).L[lid].rel.player);
    // equipe: lealdade = 50 + op/2, e o rendimento (staffAdj13) lê a mesma opinião que a ficha
    if (!s.player.staff.length) s.player.staff.push({ id: 'st31', name: 'Ana', role: 'admin', skill: 50, salary: 1, hiredWeek: 0 });
    const st = s.player.staff[0];
    {
      setOpinion(s, `s:${st.id}`, -60);
      expect(careerOf(s, st).loyalty).toBe(20);
      expect(opinionOf(s, `s:${st.id}`)).toBe(-60);
      expect(staffAdj13(s, st).why.some((w) => /demotivated/.test(w.en))).toBe(true);
      setOpinion(s, `s:${st.id}`, 40);
      expect(careerOf(s, st).loyalty).toBe(70);
      expect(staffAdj13(s, st).why.some((w) => /demotivated/.test(w.en))).toBe(false);
    }
    // chave só do registro (grupo, empresário…): limites −100..100
    setOpinion(s, 'w:artists', 500);
    expect(opinionOf(s, 'w:artists')).toBe(100);
    expect(hasOpinion(s, 'w:artists')).toBe(true);
    expect(hasOpinion(s, 'e:ninguem')).toBe(false);
  });
});
