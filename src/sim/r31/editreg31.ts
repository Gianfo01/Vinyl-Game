// R31 · registro do editor (mapas) num módulo-folha, sem dependências de execução: sistemas de `sys/index` que
// registram editáveis podem ser carregados no meio do ciclo editor → careers12 → sys/index → sistema → editor
// (a ordem depende de quem importa primeiro); com os mapas aqui eles já existem quando o sistema registra.
import type { Editable, Runnable } from './editor';

export const EDITABLES31 = new Map<string, Editable>();
export const RUNNABLES31 = new Map<string, Runnable>();
