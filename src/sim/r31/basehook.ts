// R31 (EDT): gancho do editor de base no createGame. Módulo sem dependências: worldgen o importa sem ciclo e
// r31/base31.ts preenche `apply` (restaura a base original e aplica a base escolhida em `config.base31`).
import type { RunConfig } from '../types';

export const BASE31: { apply?: (cfg: RunConfig) => void } = {};
