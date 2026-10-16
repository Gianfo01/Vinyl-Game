// R31 · onda 0 — contratos compartilhados (docs/r31/PLANO.md, W0-CON e W0-ROLE). Importado no fim de src/sim/sys/index.ts
// para registrar estados (registerExt4), provedores de pendência e o observador do livro antes de qualquer partida.
import './switches';
import './dest';
import './pending';
import './pendsrc';
import './role';
import './object';
import './txn';
import './editor'; // R31 onda 1 (EDT): editor dentro da partida — registro de editáveis/executáveis
import './base31'; // R31 onda 1 (EDT): editor de base — diferenças da base original, validação, código
import './pendattn';
import './lock';
import './tags';
import './mine'; // R31 · O: favoritos e metas pessoais (my31)
import './scenesj31'; // R31 onda 2 (J): editáveis/executáveis das cenas (projeto, turnê)
