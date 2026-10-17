// R33 (DADOS33) — base de gente real coerente no começo da partida (docs/r33/dados/AUDITORIA.md):
//  1. dono do contrato inicial = gravadora histórica (Luiz Gonzaga na RCA Victor em 1962), nunca selo extinto/fora da época
//  2. morte histórica antes do começo vale em todos os modos; morte na partida encerra o ato solo de vez (Elvis)
//  3. ato solo não tem músicos de apoio como integrantes (Elvis sem Scotty Moore, Bill Black e D.J. Fontana)
//  + varredura reduzida com limite 0 para os tipos corrigidos.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { advanceMonth } from '../src/sim/tick';
import type { Act, GameState } from '../src/sim/types';
import { labelAliveAt33 } from '../src/data/labelhist33';
import { HISTS33, YEARS33, audit33, cfg33, count33, scanAfter33 } from '../scripts/r33/dados/audit33';

const actOf = (s: GameState, name: string): Act | undefined => Object.values(s.acts).find((a) => a.catalogNo && a.name === name);
const PATHS = ['ui', 'bot'] as const;

describe('R33 DADOS — os três casos da FICHAS33', () => {
  it('Luiz Gonzaga em 1962: ativo, solo e na RCA Victor em todos os modos (nada de Victor Talking Machine, K-tel ou aposentado)', () => {
    for (const h of HISTS33) for (const path of PATHS) for (let i = 0; i < 3; i++) {
      const s = createGame(cfg33(`gonz-${h}-${path}-${i}`, 1962, h, path));
      const a = actOf(s, 'Luiz Gonzaga');
      expect(a, `${h}/${path}/${i}`).toBeDefined();
      expect(a!.status).toBe('active');
      expect(a!.members.length).toBe(1);
      expect(a!.owner && s.labels[a!.owner]?.name).toBe('RCA Victor');
      expect(Object.values(s.labels).some((lb) => lb.name === 'Victor Talking Machine Co.' && lb.active)).toBe(false);
    }
  }, 120000);

  it('Elvis Presley é solo (sem a banda de apoio) e ativo em 1962 em todos os modos', () => {
    for (const h of HISTS33) for (const path of PATHS) for (let i = 0; i < 3; i++) {
      const s = createGame(cfg33(`elvis-${h}-${path}-${i}`, 1962, h, path));
      const a = actOf(s, 'Elvis Presley')!;
      expect(a.status, `${h}/${path}/${i}`).toBe('active');
      expect(a.members.map((id) => s.persons[id].name)).toEqual(['Elvis Presley']);
      expect(s.labels[a.owner!]?.name).toBe('RCA Victor');
      for (const n of ['Scotty Moore', 'Bill Black', 'D.J. Fontana']) expect(Object.values(s.persons).some((p) => p.name === n && a.members.includes(p.id))).toBe(false);
    }
  }, 120000);

  it('Elvis morto antes do começo (1985) em todos os modos: aposentado, falecido e sem volta', () => {
    for (const h of HISTS33) {
      const s = createGame(cfg33(`elvis85-${h}`, 1985, h, 'bot'));
      const a = actOf(s, 'Elvis Presley')!;
      expect(a.status, h).toBe('retired');
      expect(a.deceased).toBe(true);
      expect(s.persons[a.members[0]].alive).toBe(false);
      expect(s.persons[a.members[0]].died).toBe(1977);
      for (let m = 0; m < 24; m++) advanceMonth(s);
      expect(a.status).toBe('retired');
    }
  }, 120000);

  it('modo exato: Elvis morre em 1977 na partida e o ato fica encerrado (nunca "separado" depois)', () => {
    const s = createGame(cfg33('elvis76', 1976, 'strict', 'bot'));
    const a = actOf(s, 'Elvis Presley')!;
    for (let m = 0; m < 12 * 10 && !s.ended; m++) advanceMonth(s);
    expect(s.persons[a.members[0]].alive).toBe(false);
    expect(s.persons[a.members[0]].died).toBe(1977);
    expect(a.status).toBe('retired');
    expect(a.deceased).toBe(true);
    expect(scanAfter33(s, 'strict', 'elvis76')).toEqual([]);
  }, 240000);

  it('selos extintos não começam a partida (Victor 1929, Factory 1992)', () => {
    expect(labelAliveAt33('x_victor', 1928)).toBe(true);
    expect(labelAliveAt33('x_victor', 1962)).toBe(false);
    expect(labelAliveAt33('x_stax', 1980)).toBe(false);
    expect(labelAliveAt33('x_stax', 2010)).toBe(true);
    const s = createGame(cfg33('factory', 2005, 'loose', 'bot'));
    expect(Object.values(s.labels).some((lb) => lb.name === 'Factory Records' && lb.founded <= 2005)).toBe(false);
  }, 60000);
});

describe('R33 DADOS — varredura (limite 0 para os tipos corrigidos)', () => {
  it(`anos ${YEARS33.join(', ')} × modos × caminhos (Nova run e bot)`, () => {
    const xs = audit33({ seeds: 1 });
    const c = count33(xs);
    const bad = xs.filter((x) => x.kind !== 'morto_depois').slice(0, 10).map((x) => `${x.kind} ${x.hist} ${x.year}: ${x.what}`);
    expect(bad).toEqual([]);
    for (const k of ['selo_fora_epoca', 'dono_fora_epoca', 'dono_historico', 'morto_ativo', 'solo_com_integrantes', 'integrante_duplo', 'idade'] as const) expect(c[k], k).toBe(0);
  }, 600000);
});
