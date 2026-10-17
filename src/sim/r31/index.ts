// R31 · onda 0 — contratos compartilhados (docs/r31/PLANO.md, W0-CON e W0-ROLE). Importado no fim de src/sim/sys/index.ts
// para registrar estados (registerExt4), provedores de pendência e o observador do livro antes de qualquer partida.
import './switches';
import './dest';
import './pending';
import './pendsrc';
import './role';
import './object';
import './txn';
import './purse31'; // R31 onda 3 (P/B.17): dinheiro pessoal com registro
import './results31'; // R31 onda 3 (P): resultados por projeto/artista e diário com contexto
import './editor'; // R31 onda 1 (EDT): editor dentro da partida — registro de editáveis/executáveis
import './base31'; // R31 onda 1 (EDT): editor de base — diferenças da base original, validação, código
import './pendattn';
import './lock';
import './tags';
import './mine'; // R31 · O: favoritos e metas pessoais (my31)
import './scenesj31'; // R31 onda 2 (J): editáveis/executáveis das cenas (projeto, turnê)
import './relic31'; // R31 onda 3 (G): relíquia com definição única, níveis pela história, objeto individual, violino do Efro
import './items31'; // R31 onda 3 (G): itens com história, loja com estoque mensal, comprar para você/empresa/presente
import './city31'; // R31 onda 4 (H): cidade de cada época — lugares reais, lojas por época, festival no terreno, outdoors, casas
import '../look31'; // R31 onda 3 (AP): aparência e sex appeal — ficha de aparência, cuidados, piora, acontecimentos
import './uni4sw'; // R31 onda 4 (UNI-4): interruptor das ligações novas das fusões
import '../city'; // R31 onda 4 (UNI-4/B.4): relação com a praça, fonte única
import './exp5'; // R31 onda 5 (TEC): interruptor exp5.nav (desligado) e bolso (pocket5)
import './exp5ini'; // R31 onda 5 (INI): tela inicial e nova run novas (interruptor no editor)
import './exp5trn'; // R31 onda 5 (TRN): transições entre telas (interruptor e modo no editor)
import './deco31'; // R31 DECO-M: decoração de casa, sede e estabelecimentos (lugares, upgrades, efeitos com teto)
import '../r33/catalogo33'; // R33 CATÁLOGO: relíquias, sampling, catálogo que reaparece, royalties em cadeia, ciclos de formato (exp33.*)
