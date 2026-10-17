# R33 · CIDADE — decisões

Arquivo novo: `src/sim/r33/cidade33.ts` (importado em `src/sim/r31/index.ts`). Teste: `tests/r33-cidade.test.ts`.
Quatro interruptores, todos desligados no código (editor, área "tools"). Desligados, nada muda (teste confere).

| Interruptor | O que faz |
|---|---|
| `exp33.cidade.lojas` | Mod `chartUnits`: vendas físicas do formato × oferta de lojas da época na cidade da sede (`BIZ31` + lugares reais de loja): 0 lojas = 0,93; +5% por loja até 3 (máx. 1,15). Digital neutro. Loja própria em terreno seu (`openShop33`, US$5.000, custo mensal US$150, renda mensal pequena) soma +4% por loja (até 2) nos lançamentos do jogador. |
| `exp33.cidade.base` | Imóvel em outra cidade (`homes31`) = base: mod `tourRisk` × 0,9 na cidade; ganchos `baseFatigueRelief33` e `baseLodgingSaving33`. Escritório regional (`openOffice33`, US$2.500 + US$400/mês): todo mês 35% de pôr o ato mais famoso da cidade ainda fora do radar em `watchAct` (sorteio no fluxo `cidade33`). |
| `exp33.cidade.terrenos` | Terreno seu: valor = preço × 1,03^anos × (1 + 0,5 × mudança de gentrificação do bairro desde a compra), piso 70%. Vende (92% do valor, `sellLot33`), aluga (0,4% do valor/mês, `rentLot33`); vizinho (`nb19`) ao lado (`adjacent33`, rua não conta) dá parceria: aluguel × 1,25 e um fato público. Virada de estágio do bairro (barato → na moda → caro) vira fato na virada do ano. Terreno com obra ou loja não vende nem aluga. |
| `exp33.cidade.cenas` | Mod `cityDemand` × 1,18 quando o gênero do ato é o da cena da cidade no ano (`SCENES33`: Nova Orleans jazz 1895, Chicago blues 1945, Nashville country 1945, Memphis rock 1950 e soul 1963, Rio bossa 1957, Liverpool beat 1960, Detroit soul 1959, Kingston ska/reggae 1962, Londres punk 1975, Seattle grunge 1988). |

## Fechamento do que tinha ficado de fora
- **Botões/cartão:** terreno seu no cartão do mapa ganha "Abrir loja própria", "Alugar/Retomar o terreno" e "Vender o terreno" (`LOTS27.acts/run` embrulhados em `cidade33.ts`). Na lista de imóveis fora da sede (`city31ui.houseList31`) cada imóvel ganha "Escritório regional", "Alugar/Retomar" e "Vender" (`baseActs33` / `runBase33`).
- **Turnê:** dois ganchos novos em `TOUR18` (`baseRelief`, `baseLodging`), chamados em `tours.ts` (cansaço por show e logística da previsão). Base = imóvel seu na cidade, interruptor `base` ligado e imóvel não alugado. Hospedagem poupada: 70% de US$90 por pessoa e noite.
- **Outras cidades:** `homeValue33` valoriza o imóvel pelo bairro DA cidade dele (`districtStage33(cidade, ano)`), com venda a 92% do valor e aluguel de 0,4%/mês pelo bolso pessoal (`rentBase33`, `sellBase33`), atrás de `exp33.cidade.terrenos`. Imóvel alugado deixa de ser base.

## Ganchos para outras frentes
- Turnê (PESSOAS/tours): `baseFatigueRelief33(s, cidade)` e `baseLodgingSaving33(s, cidade, noites)` — hoje só o risco entra via mod; cansaço e hospedagem esperam quem for dono de `tours.ts`.
- Interface: ações já no cartão do lote e na lista de imóveis; `openShop33`, `sellLot33`, `rentLot33`, `openOffice33` devolvem `{ok, text}` e `shopLock33`, `officeLock33`, `lotUseLock33` dão o motivo da recusa.
- MUNDO/PESSOAS: `sceneAt33(cidade, ano)`. CATÁLOGO: `lotValue33` (terreno como garantia). MAPA33: `districtStage33(cidade, ano)`.
- Não mexi em `lots31.ts` nem `city31.ts`; em `tours.ts`/`tourhook18.ts` só os dois ganchos acima. Posição de lote é da MAPA33.
