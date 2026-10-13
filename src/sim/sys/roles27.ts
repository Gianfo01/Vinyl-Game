// r27 (LIN): todas as funções de uma pessoa na banda ("Guitarra · Vocal"). Só exibição: a função principal (Person.role)
// é a que a simulação usa (técnica, instrumento); as extras vêm de Person.roles27 (gravadas ao criar a pessoa real) ou,
// em saves antigos sem o campo, da tabela ROLES27 pelo nome real. Puro (sem DOM): testável.

import { realRoles27, type RoleSpec27 } from '../../data/lineup27';
import { l, type L } from '../../data/world';
import type { GameState, Person } from '../types';
import { ROLE_NAMES } from './talent/attrs';

/** Nomes das funções extras (as que não existem como função principal). */
export const ROLE27_NAMES: Record<string, L> = {
  ...(ROLE_NAMES as Record<string, L>),
  harmonica: l('Gaita', 'Harmonica'),
  piano: l('Piano', 'Piano'),
  rhythm: l('Guitarra base', 'Rhythm guitar'),
};

/** Funções da pessoa no ano atual: a principal primeiro, depois as extras (sem repetir; [função, ano] só desde o ano). */
export function rolesOf27(s: GameState, p: Pick<Person, 'role' | 'name' | 'roles27'>): string[] {
  const spec: RoleSpec27[] | (string | [string, number])[] = p.roles27 ?? (s.config.realNames ? realRoles27(p.name) ?? [] : []);
  const out = [p.role as string];
  for (const x of spec) {
    const [r, from] = Array.isArray(x) ? x : [x, undefined];
    if (from !== undefined && s.year < from) continue;
    // guitarra base de quem já é guitarrista é a mesma função
    if (r === 'rhythm' && out.includes('guitar')) continue;
    if (!out.includes(r)) out.push(r);
  }
  return out;
}

/** "Guitarra · Vocal" (pt/en) para cards, ficha da pessoa, formação e diretório (`max` corta no card). */
export function roleLine27(s: GameState, p: Pick<Person, 'role' | 'name' | 'roles27'>, max = 9): L {
  const ns = rolesOf27(s, p).slice(0, max).map((r) => ROLE27_NAMES[r] ?? l(r, r));
  return { pt: ns.map((n) => n.pt).join(' · '), en: ns.map((n) => n.en).join(' · ') };
}
