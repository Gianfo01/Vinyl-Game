# R33 · MAPA33 — cidade expandida e lote de cada tipo novo

Interruptor: `exp33.mapa` (padrão DESLIGADO, `src/sim/r33/mapa33.ts`; editável em "Ferramentas"). Desligado, o mapa é idêntico ao de hoje.

## O que mudou
- **Dois bairros novos na borda** (só acrescentando; lotes 0–57 e a ordem dos 7 bairros de sempre não mudam), em `src/sim/sys/campus18.ts`:
  - 7 · **Periferia leste** (lotes 58–65, 5×6, mapa 56×32; rua nova em gx 44–45): terrenos grandes para estádio, ginásio, zona industrial, pátio.
  - 8 · **Orla sul** (lotes 66–83, mapa 56×40; avenida nova em gy 32–33): quadra do hospital, docas, terminal, quadras de fundo.
  - `DIST_BASE18 = 7`: sem `exp33.mapa`, `dist18` nunca passa do bairro 6 (os bairros 7–8 existem nos dados, mas ficam fechados). Os dois têm `hq: 99, year: 9999`: só abrem **quando falta lote** — a regra de sempre (`MIN_FREE18` lotes livres) ou um pedido do registro (abaixo).
  - Ruas novas só aparecem nos mapas maiores (`campus18px`: `HROADS_()/VROADS_()` dependem do tamanho da grade; `roadAt18` agora conhece todas as ruas, como o comentário já dizia). Mapa de 44×32 desenha exatamente como antes.
- **Registro "tipo → onde pode ficar"** (`registerSite33`): cada tipo tem zonas em ordem de preferência, cidade onde existe e ano; o lote é o primeiro livre da primeira zona (atribuição estável por cidade, sem depender da época nem do jogador).
  | tipo | zonas (em ordem) | regra |
  |---|---|---|
  | `bank` banco | centro na avenida → financeiro → centro | — |
  | `court` cartório/tribunal | centro na avenida → centro → financeiro | — |
  | `ad_agency` publicidade | centro → financeiro | — |
  | `church` igreja/coral | centro → leste | — |
  | `hospital` | avenida sul → quadra do hospital → orla | — |
  | `stadium` estádio | leste → terrenos grandes → periferia | periferia |
  | `jazz_club`, `nightclub` | boemia → centro | — |
  | `cinema` | boemia → centro → bairro novo | — |
  | `tv_studio` | bairro novo → periferia → leste | — |
  | `samba_school` | quadra do samba → boemia | **só `rio`** |
  | `print_shop` gráfica | industrial → leste | — |
  | `pirate_radio` | industrial → orla → periferia | — |
  | `train_station` | estação → porto | — |
  | `harbor` porto | cais → porto | **só cidade com água** (`geo31(city).water.length > 0`) |
- **Reserva**: `reserved33(s)` = lotes dos tipos PEDIDOS agora. Preenchimento automático (`layoutN`), lotes livres (`freeN`) e placas "À venda" (`forSale27`) não os tocam. Pedido cujo lote está num bairro ainda fechado abre o bairro (gancho `MAPA33.need` em `dist18`).
- Arte: nenhuma peça nova — os lotes usam a arte por tipo do PRED e o letreiro do POL2 como sempre; cada tipo novo ganha sprite da frente que o cria (INT-1/INT-2).

## Ganchos para as outras frentes (INT-1/INT-2, CIDADE)
- Registrar/ajustar um tipo: `registerSite33({ kind, label, zones, city?, from? })` (mesmo `kind` substitui). Pedir o lote: `setWant33(kind, (s) => …)` (padrão não pedido; ligue quando o prédio existir no jogo, normalmente atrás do seu `exp33.*`).
- Achar o lote do tipo: `lotFor33(s, kind)` (ou `undefined` na cidade em que o tipo não existe: ex.: `siteHere33(s, 'harbor')`). Colocar o prédio: `b.lot = lotFor33(...)` no `Bld18` (como `lot` explícito já faz `layoutN`).
- Tabela legível: `sitesTable33(city)`. Zonas: `ZONES33` (faixas de LOTS18) — mudar posição de lote é daqui; valor/regra dos lotes continua com a CIDADE (`lots31`).
- Os 15 tipos acima são a lista do PLANO; os ids são sugestão: se a frente usar outro id, basta `registerSite33` com o mesmo comportamento.

## Testes e provas
- `tests/r33-mapa33.test.ts` (7 casos): desligado = 7 bairros e nada reservado; 26 lotes novos sem sobreposição/rua/fora da grade e em terra em todas as cidades de GEO31; tipo → lote (banco no centro, estádio na periferia, porto só com água, samba só no Rio, lote único por tipo); ligado com tipos de exemplo: reserva, abre o bairro, fora do layout e das placas.
- Testes antigos ajustados: `tests/r27-lots.test.ts` (2 linhas: "todos os bairros" agora é `DIST_BASE18`, porque os bairros 7–8 só abrem com o interruptor). `r31-geo` e `r27-lots` rodados e passando (o de geo já cobre os lotes e mapas novos).
- Prints (`scripts/r33/shots-mapa33.mjs`, `docs/r33/mocks/mapa33/`): `<cidade>-<ano>-antes|expandida|plano.png` para Londres 1962/2025 (rio), Sydney 2025 (rio/porto), Rio 1962/2025 (mar, morro, Quadra do samba). "plano" = lotes numerados (amarelo = novos).

## Fica de fora
- Adensamento do centro (lotes menores nas sobras de rua dos 20×16): preferi a borda para não mexer no que existe; `ZONES33` aceita novas zonas se a CIDADE quiser.
- Reserva por cidade que não é a sede (imóveis em outras cidades).
- Sprites dos tipos novos (INT-1/INT-2) e valores/preço dos lotes novos (`pm`/`vis` são provisórios; CIDADE ajusta).
