# R31 · onda 4 · PRED — arte própria por tipo de prédio no mapa

Pedido do dono: cada tipo de prédio do mapa "Nosso mundo" com arte reconhecível e diferente (a loja de discos não
pode ser igual à gravadora). Só aparência: a simulação continua com o `BKind`; goldens iguais.

## Como era

Todo lugar desembocava num dos 21 `BKind` da simulação antes de chegar ao desenho (`buildingSprite18`):

- lugares do bairro (`place27.DRAW27`): loja de discos, loja de instrumentos e mercado negro → `store`;
  bar, casa de shows e fachada de facção → `venue`; hotel, delegacia e escritório → `office`;
  jornal → `publisher` (a mesma carcaça da sua editora); apartamentos e casa → `home`;
  casa do LOTE de porte "apartamento" → `office`;
- lugares reais (`city31.RDRAW31`): rádio e TV → `media`; teatro → `museum`; arena, bar e casa de shows → `venue`;
- lojas da época (frente H, `BIZ31`): 23 negócios, 19 deles `store` (partituras, pianos, gramofones, alfaiate,
  discos, lanchonete, hi-fi, fliperama, locadora, megastore, bipes, lan house, celulares, games, vinil, café,
  hologramas, padaria, instrumentos), cinema e bar da jukebox → `venue`, telégrafo → `office`.

O `store` era sempre a mesma caixa com o mesmo toldo listrado vermelho e branco; o `venue`, a mesma marquise; o
`office`, a mesma torre com o letreiro genérico da época. Só a cor da cidade mudava.

## Como ficou

`src/ui/pixel/pred31.ts` define o tipo de arte (`Art31`, 55 tipos), mais fino que o `BKind`, e de onde ele vem
(prédio seu, vizinho `nb19`, lugar do bairro com loja da época e porte da casa — `pred31place.ts` —, lugar real).
`src/ui/pixel/pred31px.ts` dá a cada tipo silhueta (`shape31`: largura, altura, parede e telhado próprios) e
detalhes próprios; `buildingSprite18` desenha a caixa de sempre e chama `drawArt31` antes do contorno de 1 px.
Mesma luz (alto à esquerda), mesmo pixel, mesmas paletas chapadas; letreiros variam por época (pintado → esmalte
com lâmpadas → neon → neon 80 → caixa luminosa → LED) e os veículos também (carroça antes de 1915).

| Tipo | Origem | Arte agora |
|---|---|---|
| Sede | BKind hq | inalterada (casca do interior) |
| Gravadora (sua filial, rival, real) | branch / nb rival / place label / real label | prédio de escritórios, porta de vidro, disco de ouro na fachada, faixa do logo, mastros |
| Subselo | sublabel | disco de platina, estandarte vertical na lateral |
| Selo boutique | imprint | sobrado com três bandeirinhas e floreiras |
| Estúdio (seu, do bairro, real) | studio | fachada fechada com painéis de isolamento, placa REC vermelha acesa, ar-condicionado no telhado |
| Casa de shows | venue / real venue | marquise com lâmpadas, letreiro vertical, cartazes na lateral |
| Festival | fest | inalterado (palco, tendas) |
| Escola de música | school | torre do sino + clave na fachada e degrau |
| Museu | museum | colunata, cúpula de cobre, disco de ouro, estandartes azuis |
| Editora musical | publisher | janela saliente e colcheia em placa redonda |
| Fábrica de discos | plant | dente de serra, chaminé, plataforma de carga e caixas |
| Escritório | office / place office | porta giratória, mastros com bandeiras |
| Rádio | media / place radio / real radio | mastro listrado vermelho e branco, lâmpada "no ar", microfone |
| TV | real tv | torre treliçada alta, parabólicas (1950+), placa da emissora, caminhão de externa |
| Streaming | platform | data center sem janelas, faixas de LED, ventiladores |
| Agência de turnês | booking | quadro de datas, ônibus da turnê |
| Sala de ensaio | rehearsal | porta de garagem de enrolar, guitarra, amplificador |
| Loja do selo | store | toldo dourado, camisetas na vitrine, letreiro da época |
| Letreiro | sign | inalterado |
| Alojamento | dorm | faixas por andar, bicicletário |
| Praça | park | inalterada |
| Apartamentos | place apartments / casa LOTE porte 0 | varandas com roupa no varal, ar-condicionado (1970+), caixa-d'água |
| Casa | home / casa LOTE porte 1 / casa Fossati | duas águas, cerquinha, caixa de correio, chaminé |
| Mansão | casa LOTE porte 2 | larga, colunas na varanda, sebe com portão, duas chaminés, carro da época |
| Loja de discos | place records / nb records / real store / BIZ records | vitrine larga com capas de LP (CDs nos anos 90), toldo listrado da época, disco no braço |
| Loja de instrumentos | place instruments / BIZ instruments | guitarras na vitrine, toldo verde liso, guitarra no braço |
| Bar | place bar / nb bar / real bar | toldo, mesas na calçada (guarda-sol 1950+), caneca de neon, luz quente |
| Jornal | place press | rotativa pela janela, faixa do nome, relógio, fardos, furgão (carroça antes de 1915) |
| Hotel | place hotel | alto, varandas, marquise até a calçada com porteiro, HOTEL no telhado (até 1949) / vertical depois |
| Fachada de facção | place facade | cortinas fechadas, lampião vermelho, carro preto, vigia |
| Delegacia | place police | lâmpada azul, grades, mastro com bandeira, viatura (1915+) |
| Beco / mercado negro | place market | parede escura e gasta, cartazes rasgados (grafite 1970+), escada de incêndio, lixo, lâmpada nua |
| Teatro | real theatre | frontão com tímpano, colunas, cortinas vermelhas, globos de luz, escadaria |
| Arena | real arena | cobertura oval com nervuras, torres de refletor, portões |
| Partituras | BIZ sheet | folhas com pauta na vitrine, toldo azul, nota no braço |
| Pianos | BIZ piano | piano de cauda na vitrine, faixa dourada, pilastras |
| Telégrafo | BIZ telegraph | poste com cruzeta e fios, relógio grande |
| Gramofones | BIZ gramophone | gramofone de corneta dourada na vitrine e no braço |
| Alfaiate | BIZ tailor | manequins de terno, tesoura no braço |
| Cinema | BIZ cinema | letreiro vertical CINE, marquise triangular com lâmpadas, cartazes, bilheteria |
| Rádios e TVs | BIZ radio_tv | rádios de madeira (até 1949) / TVs acesas, antena em V |
| Lanchonete | BIZ diner | faixa cromada, janelão aceso, placa redonda no poste |
| Bar da jukebox | BIZ jukebox_bar | jukebox arco-íris, piso xadrez, nota de neon |
| Hi-fi | BIZ hifi | caixas de som altas, medidor VU aceso |
| Fliperama | BIZ arcade | fachada escura, gabinetes com tela acesa, estrela de neon |
| Locadora | BIZ video | faixa amarela e azul, prateleiras de fitas, caixa de devolução, outdoor (1970+) |
| Megastore de CD | BIZ cd_mega | caixa larga, faixa vermelha, CD gigante no telhado |
| Bipes | BIZ pager | quiosque baixo, bipe gigante, antena piscando |
| Lan house | BIZ lan | vidro escuro com monitores azuis, outdoor de telas |
| Celulares | BIZ phones | loja branca de vidro, celular gigante aceso |
| Games | BIZ games | caixas coloridas, controle no braço e no outdoor |
| Vinil | BIZ vinyl | caixotes na calçada, lousa de cavalete, LPs pendurados |
| Café com wi-fi | BIZ cowork | vidro do chão ao teto, mesas com notebook, vasos, xícara |
| Hologramas | BIZ holo | figura translúcida projetada na calçada, faixa luminosa |
| Padaria | BIZ bakery | toldo marrom e creme, pães na vitrine, sacas de farinha |

Lojas antigas (partituras, pianos, gramofones, alfaiate, padaria, telégrafo, discos, instrumentos, rádios) ganham
frontão escalonado até 1949. Banco e aeroporto não existem como prédio do mapa da cidade (o aeroporto é cena
própria; banco não é lugar do bairro) — ficam fora.

## Prova

- `docs/r31/shots/onda4-pred-galeria-<época>.png` — os 55 tipos lado a lado em cada uma das 6 épocas.
- `docs/r31/shots/onda4-pred-mapa-{londres-1965,rio-1975,ny-2012,sp-2036}-{antes,depois}.png` (o "antes" foi tirado antes da junção com a GEO; a diferença de chão/água é dela). Conserto junto: as chaminés vitorianas não saem mais para fora do telhado em prédio estreito.
- `tests/r31-pred.test.ts`: tabelas cobrem todo lugar (BIZ31, RKINDS31, nb19, place27); desenho sem erro e com
  pixels em 6 épocas × 4 cidades; assinatura de pixels: quaisquer dois tipos diferem em > 4% dos pixels opacos
  em toda época (ou têm silhueta de tamanho diferente).
- Capturas: `node scripts/r31/shots-pred.mjs <porta> antes|depois|galeria`.
