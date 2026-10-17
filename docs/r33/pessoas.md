# R33 · PESSOAS — decisões

Motor: `src/sim/r33/pessoas33.ts` (importado no fim de `src/sim/r31/index.ts`). Teste: `tests/r33-pessoas.test.ts`.

## Interruptores (todos desligados no código; editor › ferramentas)
| id | o quê |
|---|---|
| `exp33.ego` | química da banda e crise de ego |
| `exp33.mentor` | mentor e aprendiz |
| `exp33.opening` | efeito extra da turnê de abertura |
| `exp33.life` | fases da carreira, despedida, homenagem póstuma |

Desligado = nada muda: os ganchos saem na primeira linha, nenhum sorteio é consumido e o estado `x4.pes33` não é
criado (sem `registerExt4`; nasce na primeira leitura com algum interruptor ligado). Os modificadores (`songQ`,
`cityDemand`, `chartUnits`) devolvem `null` com o interruptor desligado.

## Regras
- **Ego** (0..100, calculado, não guardado): ambição da personalidade, objetivo solo, sede de fama, liderança/vocal,
  fama do ato, menos sociabilidade.
- **Química** (0..100, guardada só para bandas acompanhadas com 2+ vivos): vai 25%/mês para o alvo (relações entre
  integrantes, ressentimento, choque dos dois maiores egos, momento bom); +4/mês em pausa. Grava ±5% na nota da música.
- **Crise de ego**: química < 28, maior ego ≥ 65, no máximo 1 por ano por ato, 18%/mês. Ato do jogador → decisão
  (`ego33_crisis`): dar um tempo (6 meses, química +20, ressentimento −15), deixar sair em solo (solo nasce livre, sem
  contrato), solo paralelo (ninguém sai, química +8), mediador ($3.000, 55% de dar certo). NPC: rompe (química < 12,
  30%), pausa ou solo.
- **Mentor**: só pessoas dos atos do jogador; mentor mais velho (8+ anos) ou bem mais experiente; até 2 aprendizes;
  dura 104 semanas. Por mês: habilidades do aprendiz andam para as do mentor (até o potencial +2), inspiração do
  aprendiz +1, moral do mentor +1 e cansaço +0,5, relação dos dois sobe. Mentor morre → aprendiz homenageia (+20 de
  inspiração). API: `mentorLock33`, `mentorPair33`, `mentorEnd33`, `mentorOf33`, `apprenticesOf33`.
- **Abertura** (gancho `show` do motor de turnês; `tours.ts` não foi editado): por show de abertura, o novato ganha
  4% do público em casuais e 1,2% em ativos (vezes a diferença de fama/50) e +0,08 de fama; o veterano ganha +0,35 de
  momento (×1,5 se o momento está abaixo de 50) quando o novato é mais novo.
- **Fases** (atos acompanhados): subida → auge (fama ≥ 60 e momento ≥ 55) → declínio (6 meses com momento < 28) →
  volta (momento ≥ 50 depois do declínio; fãs fiéis +5%, demanda de show ×1,15). Fato no diário nas viradas.
- **Despedida**: `farewell33` (ato do jogador, ativo, 8+ anos de carreira): 1 ano com demanda de show ×1,6 e
  momento +15; depois aposenta como lenda (fama > 35). NPC veterano (15+ anos, alguém com 62+) em declínio pode anunciar
  (2%/mês).
- **Homenagem póstuma**: integrante de ato acompanhado que morreu no ano (na formação ou em `rw.former` como 'died'):
  momento +30 (+15 ato pequeno), casuais +15% e metade dos fiéis, lenda se grande; catálogo dispara ×3 por 26 semanas
  (×1,8 por 13 no ato pequeno), caindo em linha.

## Vida real exata e Fossati
- `histLocked` (modo exato, ato real não alterado) bloqueia crise, rompimento, solo, pausa e despedida destas regras.
  A química ainda é medida (só leitura). A homenagem póstuma vale: a morte vem do roteiro real e o catálogo real disparou.
- Pessoas `fam:*` (Fossati) ficam fora de tudo; ato com alguém da família não entra em nenhuma regra.

## Ganchos para outras frentes
- **CATÁLOGO**: `setCatalogSurge33((s, actId, mult, weeks) => boolean)`. Se registrado e devolver `true`, o disparo do
  catálogo é dela; senão, o fallback daqui (`chartUnits` ×mult sobre os lançamentos do ato, caindo até `weeks`).
- **Interface** (sem frente de UI própria nesta 33): ler `chem33`, `ego33`, `phase33`/`PHASE_NAME33`, mentoria e
  `farewellLock33`/`farewell33` para botões no cartão de ações do artista (EXP-13). A decisão de crise já usa o motor de
  decisões existente.
- **Goldens**: com tudo desligado não mudam (sem sorteio, sem chave no save). Não rodados nesta frente (regra da 33).

## Fora desta frente
Tela/cartão de ações para mentoria e despedida; IA dos robôs usando mentor/despedida; química afetando shows ao vivo.
