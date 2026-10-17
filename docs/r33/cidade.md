# R33 · CIDADE — decisões

Arquivo novo: `src/sim/r33/cidade33.ts` (importado em `src/sim/r31/index.ts`). Teste: `tests/r33-cidade.test.ts`.
Quatro interruptores, todos desligados no código (editor, área "tools"). Desligados, nada muda (teste confere).

| Interruptor | O que faz |
|---|---|
| `exp33.cidade.lojas` | Mod `chartUnits`: vendas físicas do formato × oferta de lojas da época na cidade da sede (`BIZ31` + lugares reais de loja): 0 lojas = 0,93; +5% por loja até 3 (máx. 1,15). Digital neutro. Loja própria em terreno seu (`openShop33`, US$5.000, custo mensal US$150, renda mensal pequena) soma +4% por loja (até 2) nos lançamentos do jogador. |
| `exp33.cidade.base` | Imóvel em outra cidade (`homes31`) = base: mod `tourRisk` × 0,9 na cidade; ganchos `baseFatigueRelief33` e `baseLodgingSaving33`. Escritório regional (`openOffice33`, US$2.500 + US$400/mês): todo mês 35% de pôr o ato mais famoso da cidade ainda fora do radar em `watchAct` (sorteio no fluxo `cidade33`). |
| `exp33.cidade.terrenos` | Terreno seu: valor = preço × 1,03^anos × (1 + 0,5 × mudança de gentrificação do bairro desde a compra), piso 70%. Vende (92% do valor, `sellLot33`), aluga (0,4% do valor/mês, `rentLot33`); vizinho (`nb19`) ao lado (`adjacent33`, rua não conta) dá parceria: aluguel × 1,25 e um fato público. Virada de estágio do bairro (barato → na moda → caro) vira fato na virada do ano. Terreno com obra ou loja não vende nem aluga. |
| `exp33.cidade.cenas` | Mod `cityDemand` × 1,18 quando o gênero do ato é o da cena da cidade no ano (`SCENES33`: Nova Orleans jazz 1895, Chicago blues 1945, Nashville country 1945, Memphis rock 1950 e soul 1963, Rio bossa 1957, Liverpool beat 1960, Detroit soul 1959, Kingston ska/reggae 1962, Londres punk 1975, Seattle grunge 1988). |

## Ganchos para outras frentes
- Turnê (PESSOAS/tours): `baseFatigueRelief33(s, cidade)` e `baseLodgingSaving33(s, cidade, noites)` — hoje só o risco entra via mod; cansaço e hospedagem esperam quem for dono de `tours.ts`.
- Interface (ainda sem botão): `openShop33`, `sellLot33`, `rentLot33`, `openOffice33` devolvem `{ok, text}`; `lotValue33`, `lotRent33`, `shopLock33`, `officeLock33` dão o motivo de recusa. Entram no cartão de ações do lote (`lotActs31`) quando a MAPA33/INT decidirem o desenho.
- MUNDO/PESSOAS: `sceneAt33(cidade, ano)`. CATÁLOGO: `lotValue33` (terreno como garantia). MAPA33: `districtStage33(cidade, ano)`.
- Não mexi em `lots31.ts`, `city31.ts` nem em `tours.ts`; só li. Posição de lote é da MAPA33.
