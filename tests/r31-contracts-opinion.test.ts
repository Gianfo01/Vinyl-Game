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
import { playMonth } from '../src/sim/playbot16';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { OP_WHY_MAX, critRelOf, critRelPut, decayOpinions, hasOpinion, opine, opinionOf, opinionRaw, opinionWhy, opState, meId, relOf, setOpinion, staffLoyalty } from '../src/sim/opinion';
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

/** Fim da 31.3 (F/UNI-3): nenhuma escrita direta sobra — todos os escritores passaram por opine/setOpinion/shiftOpinion/
 *  putOpinion (ou relAdd/relPut para pessoa → pessoa). A lista fica vazia de propósito: arquivo novo = teste falha. */
const ALLOW: Record<string, number> = {};
/** Pessoa → pessoa: só o roteador de opinion.ts escreve `Person.rel` quando pode ser o jogador; aqui contamos a forma
 *  crua mais comum (`x.rel[y] = clamp((x.rel[y] ?? 0) ± d, −100, 100)`) em pessoas para não voltar. */
const PERSON_CLAMP = /\b(?!L0\b|LL\b|st\b|c\b|x\b|cr\b|cs\b|lead\b|Lb\b|La\b|bossOld\b)[A-Za-z_]\w*\.rel\[[^\]]+\]\s*=\s*clamp\(/g;
const PERSON_FILES_EXEMPT = /sys\/(media17|tour12|exch20|venue12|services12|hype12|supply18|outlets17|links16|press27|leaders10)\.ts|supply13|camp27/;

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
    if (!PERSON_FILES_EXEMPT.test(rel)) n += src.match(PERSON_CLAMP)?.length ?? 0;
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
    expect(leaders(s).L[lid].rel.player).toBeUndefined(); // o campo nativo deixou de existir
    for (let i = 0; i < 10; i++) opine(s, lk, -1, l('gesto', 'gesture'));
    expect(opinionWhy(s, lk).length).toBe(OP_WHY_MAX);
    expect(opinionOf(s, lk)).toBeLessThan(20);
    expect(opState(s)[lk].v).toBe(opinionRaw(s, lk));
    // equipe: lealdade = 50 + op/2, e o rendimento (staffAdj13) lê a mesma opinião que a ficha
    if (!s.player.staff.length) s.player.staff.push({ id: 'st31', name: 'Ana', role: 'admin', skill: 50, salary: 1, hiredWeek: 0 });
    const st = s.player.staff[0];
    {
      setOpinion(s, `s:${st.id}`, -60);
      expect(staffLoyalty(s, st.id)).toBe(20);
      expect((careerOf(s, st) as unknown as { loyalty?: number }).loyalty).toBeUndefined();
      expect(opinionOf(s, `s:${st.id}`)).toBe(-60);
      expect(staffAdj13(s, st).why.some((w) => /demotivated/.test(w.en))).toBe(true);
      setOpinion(s, `s:${st.id}`, 40);
      expect(staffLoyalty(s, st.id)).toBe(70);
      expect(staffAdj13(s, st).why.some((w) => /demotivated/.test(w.en))).toBe(false);
    }
    // chave só do registro (grupo, empresário…): limites −100..100
    setOpinion(s, 'w:artists', 500);
    expect(opinionOf(s, 'w:artists')).toBe(100);
    expect(hasOpinion(s, 'w:artists')).toBe(true);
    expect(hasOpinion(s, 'e:ninguem')).toBe(false);
  });

  it('crítico: nativo −50..50 convertido (×2/÷2), sem dado = sem opinião, e esfria; p: do jogador esfria sem tocar NPC↔NPC', () => {
    const s = createGame(defaultConfig('r31-op2', { startYear: 1975 }));
    const ck = 'c:Crítico Teste';
    expect(hasOpinion(s, ck)).toBe(false);
    expect(opinionOf(s, ck)).toBe(0);
    setOpinion(s, ck, 60, l('teste', 'test'));
    expect(critRelOf(s, 'Crítico Teste')).toBe(30);
    expect(opinionOf(s, ck)).toBe(60);
    expect(hasOpinion(s, ck)).toBe(true);
    setOpinion(s, ck, 300);
    expect(critRelOf(s, 'Crítico Teste')).toBe(50);
    expect(opinionOf(s, ck)).toBe(100);
    critRelPut(s, 'Outro', -20); // a escala do sistema de críticos (−50..50)
    expect(opinionOf(s, 'c:Outro')).toBe(-40);
    for (let i = 0; i < 24; i++) decayOpinions(s, 0.985);
    expect(opinionOf(s, ck)).toBeLessThan(100);
    expect(opinionOf(s, ck)).toBeGreaterThan(60);
    // pessoa → você: o nativo Person.rel[pessoa do jogador] esfria no mesmo ritmo (×0,985/mês)
    const me = Object.values(s.persons).find((p) => p.isPlayer);
    const [a, b] = Object.values(s.persons).filter((p) => !p.isPlayer).slice(0, 2);
    expect(me).toBeTruthy();
    if (me) {
      setOpinion(s, `p:${a.id}`, 50, l('teste', 'test'));
      expect(a.rel[me.id]).toBeUndefined(); // não mora mais em Person.rel
      expect(relOf(s, a.id, me.id)).toBe(50);
      a.rel[b.id] = 40;
      for (let i = 0; i < 12; i++) decayOpinions(s, 0.985);
      expect(opinionRaw(s, `p:${a.id}`)).toBeCloseTo(50 * 0.985 ** 12, 0);
      expect(opinionOf(s, `p:${a.id}`)).toBe(Math.round(relOf(s, a.id, me.id)!));
      expect(a.rel[b.id]).toBe(40); // NPC↔NPC intocado
    }
  });

  it('Person.rel nunca guarda a opinião sobre o jogador (12 meses de robô, banda e selo)', () => {
    for (const role of ['artist', 'label'] as const) {
      const s = createGame(defaultConfig(`r31-op-rt-${role}`, { startYear: 1990, role, bandGenre: 'rnr', bandName: 'Banda Teste' }));
      for (let i = 0; i < 12; i++) { playMonth(s, 'balanced'); advanceMonth(s); }
      const me = meId(s);
      expect(me).toBeTruthy();
      const bad = Object.values(s.persons).filter((p) => p.id !== me && Object.prototype.hasOwnProperty.call(p.rel, me!)).map((p) => p.id);
      expect(bad).toEqual([]);
      for (const L0 of Object.values(leaders(s).L)) expect(Object.prototype.hasOwnProperty.call(L0.rel, 'player')).toBe(false);
    }
  }, 120000);
});

