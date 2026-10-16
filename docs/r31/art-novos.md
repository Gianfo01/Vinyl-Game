# R31 · onda 4 · ART2 — assets novos para as cenas

Pedido: mais assets nas cenas (interiores do Nosso mundo, submundo, salas da sede), interativos e ligados às mecânicas.
Estilo: pixel art antigo do jogo (vista lateral do corte, luz de cima à esquerda, sombra arroxeada no pé, contorno INK pela
camada de adereços, rampa de 6 tons `lv`/`tint`, fonte 3×5), mesma grade e escala dos adereços de `interior27`.
Código: `src/ui/pixel/props31.ts` (desenho, PURO quanto à escolha da época e à caixa), `src/ui/r31/art31model.ts`
(o que cada lugar ganha, pontos, painel), `src/ui/r31/art31.ts` (DOM do painel), `src/ui/r31/salaart31.ts` (salas da sede).

## Os 12 desenhos e as variações por época

| Asset | Variações (ano em que muda) |
|---|---|
| Jukebox | fonógrafo de corneta a ficha (<1925) → móvel de madeira (<1946) → arco de tubos de luz (<1961) → caixa cromada (<1980) → jukebox de CD (<2005) → tela de parede (<2030) → holograma |
| Parada da semana | folha "mais vendidas" (<1940) → "Hit Parade" impresso (<1970) → quadro TOP40 de números (<2000) → LCD (<2015) → tela de streaming com barras |
| Telefone público | de manivela na parede (<1930) → cabine de madeira e vidro (<1970) → orelhão (<2000) → público de metal (<2020) → totem de carga |
| Vitrine de relíquias | caixa de madeira (<1960) → vitrine de vidro com luz (<2000) → LED; dentro: disco de ouro, guitarra, microfone, manuscrito |
| Quadro de audiência | lousa (<1960) → quadro magnético (<1996) → tela |
| Rack de efeitos | câmara de eco (<1950) → eco de fita (<1966) → valvulados (<1982) → rack digital (<2000) → laptop (<2025) → processador neural |
| Mural de recados | impresso (<1960) → xerox (<2005) → com código QR |
| Máquina do saguão | mutoscópio (<1947) → pinball (<1978) → fliperama de gabinete (<2006) → máquina de dança |
| Carro na porta | Ford T (<1931) → sedã (<1950) → rabo de peixe (<1968) → caixote (<1990) → moderno (<2015) → cápsula; tipos: ônibus/van de turnê, carro preto do chefe, viatura, furgão, táxi |
| Cartaz de procurado | sépia (<1950) → foto P&B (<1990) → impresso a cores |
| Som do palco | corneta no poste (<1930) → colunas (<1956) → pilhas de amplificador (<1976) → torres de PA (<1996) → line array (<2026) → holograma |
| Rádio da sala | (antes de 1955 o rádio que já existe na sala vira o ponto) → móvel de som (<1976) → aparelho portátil (<1996) → micro system (<2016) → caixinha inteligente |

Galeria: `shots/onda4-art2-galeria.png`, `onda4-art2-galeria-2.png`.

## Por lugar: o que abre

| Lugar | Asset | O que mostra (lido do estado) | Botões (funções que já existem) |
|---|---|---|---|
| Casa de shows | Som do palco | equipamento da época, lotação da casa | Marcar show aqui (doPlace27 `show`, com motivo do bloqueio), Shows e turnês |
| | Parada da semana | top 5, seu melhor lugar (selo ★ você #n) | Ver as paradas, Ouvir o nº 1 (prévia; travado se o som estiver desligado) |
| | Telefone público | recados e decisões esperando (selo) | Atender os recados (caixa de entrada) |
| | Ônibus da turnê (só com artista tocando na semana) | quem chegou para tocar, seu show em casa | painel rápido de cada artista, Shows e turnês |
| Loja de discos | Parada (substitui um cartaz genérico) | igual acima | igual acima |
| | Vitrine de raridades | relíquias em leilão, preço, prazo; seu acervo | Arrematar (buyRelic, travado por caixa), Troféus e relíquias |
| Rádio | Quadro de audiência | estações, formato, diretor e relação | Levar a música ao diretor (`pitch`), Jantar com o diretor (`lunch`) |
| | Parada | igual acima | igual acima |
| Estúdio | Rack de efeitos | equipamento da época, suas sessões em andamento | Alugar horas de estúdio (`rent`), Estúdio da sede |
| Bar | Jukebox (desenho novo antes de 1940; depois, a jukebox que já existe vira o ponto) | suas músicas gravadas, o mais pedido | Ouvir cada música (prévia), Seus lançamentos |
| | Telefone público | recados | caixa de entrada |
| Redação | Telefone | — | Marcar entrevista (`interview`), Mandar release (`news`) |
| Sala de ensaio | Mural de recados | músicos sem banda (regra de `freeMusicians`, lida sem criar estado) | Ficha de cada um, Descobrir talentos |
| Gravadora rival | Parada | top 5 com os discos deles marcados | Ver as paradas |
| Prédio (apartamentos) | Rádio da sala | suas músicas, o mais pedido | Ouvir, Seus lançamentos |
| Hotel | Máquina do saguão | placar: gravadoras com mais discos no top 40 | Gravadoras rivais |
| | Ônibus da turnê / táxi | artistas em turnê hospedados | painel rápido de cada um, Shows e turnês |
| Loja de instrumentos | Vitrine histórica | relíquias em leilão (instrumentos primeiro) | Arrematar, Troféus e relíquias |
| Fachada (submundo) | Cartaz de procurado | seu nome no cartaz (indiciamentos), calor, quem foi pego | Sua pasta na polícia (painel que já existe) |
| | Carro preto na porta | o chefe está aqui | Ficha do chefe, Entrar na sala dos fundos |
| Delegacia | Cartaz de procurado | igual acima | Sua pasta |
| | Telefone ("direito a um telefonema") | seus presos e o tempo que falta | Advogado para cada um (lawyer31, com o motivo do bloqueio), Ver as celas |
| | Viatura | agência, calor, viaturas na ronda | Sua pasta |
| Beco (mercado negro) | Cartaz de procurado | igual acima | Sua pasta |
| | Furgão na porta | → abre direto o painel do mercado negro que já existe | Comprar (buyBm31) |
| Baile | Viatura na esquina | o calor agora | Sua pasta, O baile |
| **Sede** · Estúdio | Rack de efeitos | sessões em andamento | Sessões de gravação, Estúdio |
| Sede · Elenco | Jukebox do selo | suas músicas | Ouvir (prévia), Seus lançamentos |
| Sede · Equipe | Telefone | recados (selo ✉) | Atender os recados |
| Sede · Catálogo | Parada da semana | seu melhor lugar | Ver as paradas, o lançamento |
| Sede · Talentos | Mural de recados | músicos sem banda | Ficha de cada um, Descobrir talentos |
| Sede · Troféus | Vitrine de leilão | relíquias em leilão | Arrematar, Troféus e relíquias |

Regras seguidas: explorar não muda o mundo (o teste compara o estado inteiro antes/depois de montar cenas e painéis);
motivo de bloqueio antes do clique (`lockBtn31`, também na dica do ponto); selo sempre com texto + símbolo; painel rápido
(⚡) nos artistas; nenhuma mecânica nova (por isso nenhum interruptor nem medição).

## Propostas para a próxima rodada (não feitas)
- Cenas `scene31*`/`mech31` (negociação, contratar, demitir, escalação): telefone na mesa da negociação com a proposta
  rival; cofre na rescisão mostrando a multa. Pedem mexer no núcleo das cenas da onda 2 — fica para quando a sessão ART
  terminar a uniformização.
- Placa "à venda" na fachada dos lugares com `sale` (abre `buyv`), carro do jogador por época na garagem da sede.

## Capturas
`docs/r31/shots/onda4-art2-*.png`: galeria (2), loja (parada, vitrine 1962), bar (jukebox 1958 e 1931), rádio, estúdio
1972, ensaio, hotel (fliperama, carro 2010), casa de shows 1995, instrumentos, apartamento 1990, redação 1950,
delegacia (telefone, procurado 2025), beco, fachada (carro do chefe) e as seis salas da sede.
