# R31 · Onda 4 — POL: auditoria de acabamento visual

Revisão com "olho de artista" de todas as cenas e mapas da onda 4 já juntados no ramo principal, mais as cenas de
mecânica/negociação (pedido do dono). Capturas novas geradas com os roteiros de cada frente
(`scripts/r31/shots-h.mjs`, `shots-is.mjs`, `shots-fos.mjs`, `shots-art2.mjs`, `shotsM.mjs`, `scripts/shots31w4wr.mjs`);
antes × depois lado a lado em `docs/r31/shots/onda4-pol-*-antes-depois.png`.

Legenda dos defeitos: **F** flutuando / sem chão · **E** escala · **P** placeholder · **G** objeto genérico ·
**R** rótulo tapando/cortado/colidindo · **C** paleta · **V** vazio excessivo · **S** estilo diferente do pixel art antigo.

## Correções na raiz (valem para todas as cenas)

| O quê | Onde | Efeito |
|---|---|---|
| Posicionador de rótulos comum (`placeLabels31`): sem colisão entre rótulos, sem tapar outro objeto clicável, sem tapar selos; tenta embaixo → base → em cima → topo; abrevia na fronteira da palavra (`shortNames31`); o que não cabe some do desenho e fica no passar do mouse/foco/lista | `scene31model.ts`, `scene31.ts`, `salas31.ts` | loja, casa, interiores (I+S, ART2), casa Fossati e praça, mesa do chefe, turnê, projeto, salas da sede |
| Rótulos re-posicionados pela largura real da cena na tela (ResizeObserver) | `scene31.ts` | celular e tela grande |
| Camada da FRENTE nas cenas: balcão/mesa/vidro pintados depois das pessoas (quem está atrás aparece do tronco para cima, pé no chão escondido) | `interior27.paintInterior27`, `shop31px`, `scene31px`, `scene27.drawScene27` | vendedor, bartender, gente na mesa de negociação |
| Casca única do corte (`cut27`/`cutEnd27`, extraída do interior27) | `interior27.ts` | loja, casa e salas de mecânica no mesmo acabamento da sede |
| Janela com a paisagem da cidade e da época (`window31`/`cityView31`, recorte do skyline27) | `pixel/window31.ts` | loja, casa, mesa, sala, sala do dono, diretoria (r27), mesa de contrato (r27) |
| Instrumentos e presentes desenhados de verdade (`inst31`, 40 peças: violão, archtop, guitarra, baixo, ukulele, cavaquinho, bandolim, banjo, violino, trompete, cornetim, clarinete, sax, piano, órgão, sintetizador, bateria, caixa, contrabaixo, amplificador, microfones, toca-discos de DJ, acordeão, gaita, módulos, controlador, sampler, bateria eletrônica, pedal, flores, charutos, vinho, champanhe, relógios, caneta, lenço, perfume, livro, caixa de discos, fones) | `pixel/stage31px.ts` | loja H, loja de instrumentos (I+S) |
| Vitrine sem peça = suporte vazio no veludo + plaquinha (nunca retângulo liso) | `props31.ts` (`showcase31`) | loja H, ART2 |
| Abreviação sem cortar palavra (`abbrText`) nas placas pintadas | `font.ts`, `hqpx27.sign` | letreiros dos interiores, quadro da loja, mapa |
| Altura do palco = altura em que as pessoas pisam (baile tinha tablado de 9 px e gente erguida 5 px: pés afundados) | `interior27.ts` | baile, bar |
| Checagem automática | `tests/r31-pol.test.ts` + `src/ui/r31/pol31*.ts` | 120+ cenas registradas |

## Por cena

### H — Loja de instrumentos (`onda4-h-loja-*`) → `onda4-pol-loja-antes-depois.png`
- **F** vendedor flutuando atrás do balcão (pés em y=86 com o chão em 98) → agora atrás do balcão, pé no chão, balcão na frente.
- **P** "Janela da garagem" e "Vitrine de relíquia" retângulos lisos → janela com moldura, céu/prédios reais da cidade, pátio com faixas e o carro (ou um cone esperando carro); vitrine de vidro com suporte e plaquinha.
- **R** rótulo "Janela da garagem" sobre o desenho → plaquinha GARAGEM embaixo da janela e rótulo posicionado.
- **G** acordeão e amplificador = caixas cinza; "panela vermelha" no lugar de bateria; caixas marrons e banqueta genéricas → peças reais por item do estoque (parede ripada com os pendurados, chão com piano/bateria/amplificador, mesa de vitrine com miúdos e presentes).
- **E/R** etiquetas grandes tapando os instrumentos → etiquetas de uma linha da fonte 3×5, ao lado (penduradas embaixo ou acima), preço curto (`$13K`), preço inteiro na dica.
- **C/S** janela de prédios cinza; estilo próprio (240×120 chapado) → corte da sede, paleta da era, lâmpadas e contorno INK.
- **R** quadro "Novidades": faixa "MUDA EM" cobria a 3ª linha e linhas cortadas no meio → quadro maior, linhas abreviadas na palavra.

### H — Casa por dentro (`onda4-h-casa-1975`) → `onda4-pol-casa-antes-depois.png`
- **P** garagem = bloco marrom com "VAZIA" → garagem de verdade: parede de bloco, porta basculante (portões de madeira antes de 1950), painel de ferramentas (martelo, chave, serrote), prateleira de latas, mancha de óleo; sem carro = bicicleta e caixa de ferramentas de rodinha; com carro = carros da época de fabricação.
- **V** sala quase vazia → sofá, abajur de pé, rádio/TV da época, vitrola ou piano, estante, planta, discos de ouro (ou pôster).
- **F** violão flutuando na parede → violão no suporte de chão.
- **C** janela de prédios cinza → vista real da cidade.
- texto "vazia" removido do modelo (`HouseArt31.empty` saiu).

### H — Mapas das cidades (`onda4-h-rio-*`, `-londres-*`, `-ny-2036-*`, `-sp-1905`) → `onda4-pol-mapa-*-antes-depois.png`
- **R** etiquetas se sobrepondo ("TV GLOBO" sobre "RÁDIO…"): a marca ABRIU/VAI FECHAR só conferia a própria caixa, não a do nome → as duas caixas são conferidas.
- **R** "LOJA DE INSTRUMENT" cortado (`slice(0,18)`) e nomes de vizinhos cortados (`slice(0,16)`) → abreviação na fronteira da palavra.
- **R** etiquetas por cima das placas À VENDA, dos outdoors, do cartaz do festival e dos ícones dos pinos → todos entram como áreas ocupadas.
- **V/R** excesso de etiquetas ao mesmo tempo → regra de densidade pelo zoom: de longe até 5 notícias (abriu/vai fechar), 5 letreiros reais e 4 lojas; zoom médio ~10 de cada; perto, todas. O preço das placas aparece só ao passar o mouse/foco ou aproximando. O nome inteiro continua no ponto clicável de cada prédio.
- **R** placas À VENDA amontoadas → no máximo 4 que cabem no caixa + 1 fora (todas seguem na lista "À venda" e clicáveis); outdoor não cobre placa.

### W+R — Cenas de mecânica / negociação (`onda4-wr-cena-*`) → `onda4-pol-negociacao-*-antes-depois.png`
- **F** pessoas "de pé em cima da mesa" (banco, lançamento, compra, jabá, renovação, sala) → mesa na camada da frente, pessoas sentadas atrás com cadeira; quem assiste fica no chão ou atrás do vidro.
- **G/S** salas desenhadas à parte (parede lisa + xadrez, móveis genéricos) → corte da sede com peças da fonte única (arquivo, planta, disco de ouro, estante, sofá, amplificadores, bateria, mesa de som, microfone, cofre, guichê com grade, aquário da rádio com NO AR).
- **C** janelas de prédios cinza → cidade real (sala, mesa, sala do dono).
- **R** "Reunião de diretoria" e mesa de contrato (r27, mesmas cenas de negociação): janelas de prédios cinza → cidade real.

### I+S — Interiores, gente, submundo (`onda4-is-*`) → `onda4-pol-is-*-antes-depois.png`
- **F** quem trabalha no balcão era pintado por cima do balcão → balcão na frente (bartender, vendedor, recepção).
- **F** violões da loja de instrumentos com suporte de chão pendurados no meio da parede → pendurados no gancho, peças reais pela época; piano da loja = peça da fonte única.
- **F** baile: pés afundados no tablado (5 px) → palco e pessoas na mesma altura.
- **R** rótulos de pessoas e objetos colidindo/cortados → posicionador comum.

### FOS — Casa Fossati e praça (`onda4-fos-*`) → `onda4-pol-fos-*-antes-depois.png`
- **R** "Mesa do al…", "Gianluca Fossati" sobre "e d…", rótulos de pessoas cortados e por cima uns dos outros → posicionador comum (nome inteiro, ou abreviado na palavra, ou só no passar do mouse).
- pintura dividida em pura (`paintFosHome31`/`paintFosSquare31`) + desenho dos bonecos, para a checagem.

### ART2 — Salas e objetos interativos (`onda4-art2-*`) → `onda4-pol-art2-*-antes-depois.png`
- **R** com "mostrar tudo", todos os rótulos das salas apareciam juntos e se cobriam → posicionador comum (o rótulo de cada objeto continua no passar do mouse).
- **F** loja de instrumentos (interior): ver I+S.
- Sem placeholders: objetos novos (jukebox, parada, telefone, vitrine, rack, cartazes, fliperama, carro, procurado, PA, rádio) já eram desenhados por época; a vitrine vazia ganhou suporte e plaquinha.

### M — Estilos por época (`onda4-m-*`)
- Telas de interface (temas), não cenas pintadas. Sem defeito de pixel art próprio; as cenas dentro delas (mesa do chefe, salas) herdam as correções acima. Observação deixada: o mural vazio da mesa do chefe usa um "+" grande como chamada para começar um disco — é botão, não placeholder.

## Checagem automática (`tests/r31-pol.test.ts`)
Passa em todas as cenas registradas (`src/ui/r31/pol31reg.ts`: loja e casa em 5 épocas/cidades, 7 salas de mecânica × 3 épocas, 19 interiores × 3 épocas com objetos ART2, casa Fossati e praça, todas as salas da sede):
1. toda pessoa com o pé numa linha de chão, num palco, ou escondido atrás de um móvel da camada da frente;
2. rótulos sem sobreposição na escala de tela grande (4×) e pequena (2,5×);
3. nenhum ponto clicável (fora pessoas) dominado por uma cor só (≥ 70% = placeholder);
4. nenhum "VAZIO/VAZIA/EMPTY" pintado como desenho;
5. abreviação nunca corta palavra sem ponto.

Com `POL_DUMP=<pasta>` o teste grava cada cena (.rgba/.json) para pré-visualização sem navegador.

Números do jogo: nada mudou (só interface e pintura).
