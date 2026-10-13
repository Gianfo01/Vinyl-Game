# Submundo: qualquer personagem é alvo (rodada 29)

Pedido do autor: "deve ter opção para todos os personagens". Antes, **Planejar no Submundo…** e **Mais opções no
Submundo…** só aceitavam a lista fixa de `targetsFor` (os 40 atos mais famosos e os 2 primeiros integrantes de
cada). Elvis Presley, Nat King Cole, produtores, críticos e quase todo mundo apareciam desabilitados com "Fora da
lista de alvos do Submundo".

## O que mudou

- **Alvo válido = qualquer personagem onde a ação faz sentido** (`targetBlock17` em `src/sim/sys/crime17.ts`):
  integrante, artista solo, produtor (`pd:`), empresário (`e:`), líder de selo (`l:`), crítico/jornalista (`c:`),
  gente dos rivais, qualquer ato e qualquer selo.
- **Ficam de fora só os casos legítimos, sempre com o motivo:**
  - já morreu ("Elvis Presley já morreu (em 1977).");
  - é você;
  - é do seu elenco ou da sua equipe;
  - tipo errado de alvo: ação contra ato pede um ato, contra selo pede um selo, contra pessoa pede uma pessoa;
  - ainda não entrou em cena na época: ato que não estreou, avião de turnê antes de 1950;
  - caixa, calor/fuga e o modo "Vida real exata": as regras de sempre, vindas do `crimeOdds`.
- **As fórmulas continuam as mesmas** (`crimeOdds`/`commitCrime`); só ganharam reserva para quem não tem ato:
  - fama de reserva com os mesmos pesos de `personact18.fameOfKey`;
  - cidade do crime: o selo do líder ou a cidade da ficha;
  - quem paga a chantagem de um líder é o selo dele;
  - pessoa real: líder e crítico reais contam no modo exato;
  - consequências: a morte encomendada de alguém da indústria passa pela vida de sempre (`people16`: clientes
    liberados, sucessão no selo). Intimidação vira obrigação (medo). A vítima guarda mágoa e fala mal de você.
- A lista antiga (`targetsFor`) continua igual e agora serve de **sugestão** (os mais famosos) e de padrão.

## Submundo › Planos: seletor com busca

`src/ui/sys/crimepick29.ts` substitui o `<select>` fixo. O índice fica em `src/sim/sys/crimetargets29.ts`.

- O índice cobre todas as pessoas, a indústria, os atos e os selos que já existem no ano. Nada do futuro entra
  (`visibleAct`).
- É refeito por semana. A busca ignora acentos e exige todas as palavras.
- Mostra **no máximo 30 resultados**, com "Mais N — refine a busca", então nunca há milhares de opções na tela.
- Os resultados vêm agrupados (Pessoas — artistas · Pessoas — indústria · Artistas (atos) · Selos). O grupo certo
  para a ação vem primeiro e os vivos antes dos mortos.
- Quem não vale aparece desabilitado com o motivo.
- Sem texto na busca, mostra as sugestões. Com um alvo escolhido, a lista recolhe e volta ao focar no campo.
- Teclado: Enter escolhe o primeiro, as setas navegam e Esc fecha a lista.
- **Executar (planejar)** abre a operação jogável com o mesmo alvo (`heist27` inclui o alvo escolhido na lista).

## Menu de ações (clique direito)

- **Planejar: {crime}…**: para ato, selo e agora também para gente da indústria (produtor, empresário, líder,
  crítico). Artistas já tinham as ações diretas de pessoa.
- **Mais opções no Submundo…**: para qualquer pessoa. Antes o menu escondia o item para quem é do seu elenco; agora
  ele aparece desabilitado, com o motivo.
- Os dois usam `presetCrimeFor29` (`src/ui/sys/crimeform29.ts`), que converte a chave da entidade clicada
  (`p:…`, `pd:…`, `e:…`, `l:…`, `c:…`, ato, selo) no id de alvo do Submundo.

## Determinismo

- Os RNG do crime (`crng`) não mudaram: os alvos de sempre têm o mesmo id e o mesmo sorteio.
- Os ramos novos só valem para chaves da indústria (`isKey17`), que os NPCs nunca usam.
- O gancho de vida da indústria fica em `gone16.ts`, sem dependências, para não mudar a ordem de carga dos sistemas.
- Os testes de referência `r27-p2a`, `r27-p2b` e `r27-m2` passam sem nenhuma remedição.

## Testes e capturas

- `tests/r29-crime-targets.test.ts` cobre:
  - produtor e crítico fora da lista;
  - determinismo;
  - morte encomendada de um produtor;
  - Elvis Presley em 1956 e 1975;
  - cada motivo de exclusão;
  - os presets do menu;
  - o seletor (grupos, limite de 30, sugestões, busca sem acento).
- Capturas em `docs/shots29crime/`, geradas por `node scripts/shots29crime.mjs` com o servidor em `npx vite --port 5329`.
