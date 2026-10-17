# INT-2 · prédios novos com interior (v33)

Interruptor **`exp33.int2`** (padrão DESLIGADO no código; sim `src/sim/r33/int2.ts`). Desligado: `int2Types` devolve vazio e nenhuma ação roda.

## Padrão de arte (ajuste pedido pelo dono)
Os interiores NÃO são cenas próprias: usam o caminho do jogo. `int2Scene(id, ano)` devolve um `Interior27` (adereços do vocabulário `PropT27`, `spots` das pessoas) + um gancho `extra` com os adereços novos, e quem pinta é o `paintInterior27`/`drawInterior27` (casca `cut27`: céu, vizinhos, rua, parede e piso da época, letreiro, lâmpadas, contorno INK). As pessoas são os bonecos do jogo (`avatarSprite` 24×34, `placePeople27`). Lojas da época (`int2ShopScene`) usam o mesmo corte, com `props31` (jukebox, fliperama, rádio, caixa de som, telefone). A fachada no mapa é a arte isométrica que já existe (`mapArt` do registro → `buildingSprite18`), até a MAPA33/PRED dar desenho próprio.

## Arquivos
- `src/sim/r33/int2.ts` — registro `INT2` (15 tipos), ações (`int2Acts`/`int2Do`, formato `PAct27`), ganchos `INT2_HOOKS`, linha de situação `int2Now`.
- `src/ui/r33/int2px.ts` — `int2Scene`, `int2ShopScene`, `paintInt2` (só Px, sem DOM), `drawInt2` (com bonecos).
- `src/ui/r33/int2gallery.ts` + `docs/r33/mocks/int2/galeria.html` — galeria (vite) pelo caminho do jogo; `scripts/r33/int2shots.mjs` tira os prints (`npx vite --host 127.0.0.1 --port 5880 &` e `node scripts/r33/int2shots.mjs`).
- Prints em `docs/r33/mocks/int2/<id>.png` (prédio isométrico + interior com bonecos em 1889, 1962, 2025 e 2035 onde o lugar existe) e `lojas.png` (23 lojas, cada uma numa época).
- `tests/r33-int2.test.ts` — registro, interruptor, ações, festival, arte.

## Registro (para a MAPA33)
`int2Types(s, cidade, ano)` → `{ id, name, lot:{w,d}, where, from, to, cities?, water?, tag, mapArt }`.
| id | lote | onde | existe |
|---|---|---|---|
| bank | 4×4 | centro | 1889+ |
| court | 4×4 | centro | 1889+ |
| hospital | 4×4 | borda | 1889+ (reabilitação 1970+) |
| stadium | 8×6 | periferia | 1920+ |
| jazz | 4×3 | bairro | 1920–1979 |
| nightclub | 4×3 | bairro | 1970+ |
| church | 4×4 | bairro | 1889+ |
| tvstudio | 6×5 | borda | 1920+ |
| adagency | 4×3 | centro | 1900+ |
| samba | 6×4 | periferia | 1928+, só `rio` |
| festival | 8×6 | periferia | 1889+ |
| print | 4×3 | borda | 1889+ |
| pirate | 3×3 | beco | 1960+ |
| station | 6×4 | centro | 1889+ |
| port | 6×4 | água | 1889+, só cidades de `PORT_CITIES33` |

## Festival (acréscimo)
Terreno do festival com cena própria (hoje o botão abre a sede do selo: QA5 #17). Cena por época: coreto e feira (1889–1919), parque com concha (1920–49), campo com palco de madeira e lona (1950–69), lama e andaimes (1970–89), megapalco com telões (1990–2009), LED e drones (2010+); barracas de comida e merch, banheiros, VIP, torre de som, plateia em campo. Ações com as funções que já existem: `festival.convite` (`acceptInvite`, fests8), `festival.escalar` (`addToLineup` no 1º festival próprio), `festival.ingresso` (`setFestival` +10%), `festival.visitar`. **Falta ligar o botão "Terreno do festival"** (`objects5` `cidade.festival`) à cena: é arquivo de outra frente; o gancho é `int2Scene('festival', ano)` + `drawInt2` + `int2Acts(s, 'festival')`, atrás de `exp33.int2`.

## Ações (cartão do lugar; efeito simples, custo e espera visíveis)
1–4 ações por lugar em `PAct27` com custo em dólar real do ano, espera em semanas e motivo de bloqueio. Efeitos pequenos: reputação, estresse/saúde do dono, caixa. Próprios: `bank.loan` (`takeLoan`), `bank.collateral` (crédito de US$ 6 mil reais, 10% a.a., 12 meses), `hospital.rehab` (1º integrante com vício/burnout/doença → `recovering`, estresse −20), e as quatro do festival.

## Ganchos para outras frentes (`INT2_HOOKS[<lugar>.<ação>] = (s, chave) => {ok,text} | null`)
Quem registra assume o efeito (custo e espera continuam daqui). Nenhum existe ainda:
- GESTÃO: `bank.loan`; CATÁLOGO: `bank.collateral`, `court.registro`/`plagio`/`rescisao`, `tvstudio.calouros`/`trilha`, `adagency.jingle`/`sync`, `print.capa`.
- VIDA: `hospital.checkup`, `hospital.rehab`; PESSOAS/turnês: `stadium.show`; MUNDO: `station.viagem`, `port.embarque`; crise de crédito em `int2Now('bank')` (`economy.recession`).

## Fica de fora
Ligar nas telas (botão "Entrar", objetos em `objects5`/`acoes5data`, botão "Terreno do festival", prédio no mapa com arte própria) — arquivos de INT-1/MAPA33/place27. Sem gancho, sem regra de dinheiro própria além do crédito pequeno.
