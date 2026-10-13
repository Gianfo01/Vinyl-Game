# Rodada 29 — Cenas: mais cenas animadas e as atuais melhores

Pedido do autor: *"bote um agente para criar mais cenas e melhorar as atuais"*. Ramo `claude/r29-scenes`, a partir de
`claude/friendly-brown-vpsmfl` (Masters_28).

Resumo:

- São **22 cenas animadas novas** no mesmo tocador do cut27. Elas usam a mesma fila, o mesmo orçamento de atenção do
  story28, as mesmas preferências (todas / só importantes / desligadas) e as mesmas regras "uma vez".
- Cada uma tem **2 ou 3 escolhas com efeito real**.
- A arte é **procedural no estilo antigo** (kit27: paleta da era, rampas, contorno escuro de 1 px, objetos que mudam de
  geração). São **13 cenários completos novos** e **8 camadas** por cima dos cenários do art27.
- As **21 cenas antigas** ganharam:
  - luz por era e por hora do dia;
  - camadas de cena;
  - plateia variada;
  - figurantes com a roupa da época;
  - variantes de fala;
  - ritmo único e clique para avançar.
- O holograma ficou translúcido e com brilho. O golpe e os herdeiros ganharam arte própria.
- **Toda cena que dispara** entra no Álbum de cenas (seção nova "Cenas animadas", com "rever") e no storyboard do fim
  (miniatura em pixel + lista completa).
- Nada na simulação mudou. Os valores-ouro (P2A, P2B, M2, F3) passam sem re-medir.

## 1. Inventário (antes desta rodada)

### Cenas animadas do cut27/cut28 (tocador `src/ui/ps/cut27.ts`)

| chave | momento | gatilho | arte (cena-base do art27) |
|---|---|---|---|
| press1 | primeiro disco prensado | memória `release` (1ª vez) | releases (fábrica/loja) |
| chart1 | primeira vez nas paradas | sonda das paradas (1ª vez) | charts |
| no1 | número 1 | memória `number1` | charts |
| star | estrela assina | memória `signed` com fama ≥ 45 | signing |
| show1 | primeiro show | memória `gigs` | shows (casa vazia) |
| sold | ingressos esgotados | `sellout` / `legendary_show` | shows (lotado) |
| flop | show desastroso | `stage_incident` / `show` | shows |
| tour | pé na estrada | sonda das turnês (1ª parada tocada) | tour |
| award | premiação | fato `award` | awards |
| scandal | escândalo | fato `scandal` público, sev ≥ 25 | door (imprensa na porta) |
| raid | batida policial | fatos `arrest` / `crime` falho | crime |
| leave | alguém sai da banda | memória `member_quits` | leave |
| death | morte | fato `death` de gente sua | memorial (+ retrato) |
| broke | ameaça de falência | sonda do caixa | finance |
| era | nova era (geração dos objetos) | sonda do ano (1955/1980/2000) | era |
| fest | festival | memória `festival*` / fato `own_festival` | festival |
| magic | take mágico | memória `session` "melhor sessão" | studio |
| betray | traição no Submundo | ponte da atividade (`betrayal`) | crime |
| coup | golpe de NPC (r28 F8) | fato da agency18 contra você | **press (redação)**: a falha apontada |
| holo | holograma (r28 F8) | fato `hologram` de ato seu | shows: **sem transparência nem brilho** |
| heirs | briga dos herdeiros (r28 F8) | fatos `dispute`/`estate_suit` | **rights (escritório genérico)** |

### Outras cenas que já existiam (outros sistemas, não foram tocadas)

- **Cenas de lugar** (`src/sim/sys/scenes/*`, interface `src/ui/sys/scenes.ts`):
  - awards, court/appeal (audiência e recurso), interview, radio, ipo, sublabel, factory;
  - goldfx (disco de ouro), hologram (palco holográfico), farewell (velório), hall, mansion, street, club, fair,
    vignette, agm, review, festivalDay, liveShow.
  - Ficam no arquivo `scenes.archive` (30 últimas), que é o que o storyboard lia.
- **Cenas interativas** (r17, `scene17`/`scenedefs17`): funeral, casamento, prisão, coletiva etc.
  - Ficam no "Álbum de cenas" (Recortes).
- **Storyboards** (cine18), **momentos** (moment16), **number1** de rua, **busfx**.
- **Capítulo da década** (`chapter28`, r28 F4): cena de texto.
- **Fim de prazo** (`run17Result`): o storyboard.
- **cenas20** (`src/ui/pixel/cenas20.ts`): não é uma cena. É o acabamento de rampas e contorno usado pelos marcos
  isométricos e pelo horizonte.
- **Aviso de cenas que não interromperam** (r23, `quiet23`): caixa de entrada e "Rever cena" no álbum.

### Momentos importantes que estavam SEM cena animada

- a primeira assinatura (só havia "estrela assina", com fama ≥ 45);
- a primeira sessão de estúdio;
- o fim e a volta de uma banda;
- quem entra na formação;
- o rival que leva o seu artista;
- promessa cumprida ou quebrada (r28 F5);
- processo e sentença;
- pirataria e jabá;
- disco de ouro e de platina (só havia a cena de lugar `goldfx`);
- headline de festival;
- a turnê que cruza a fronteira;
- a sede nova;
- a aposentadoria;
- a venda da empresa e a compra de um selo;
- cada virada de tecnologia (só havia "nova era", genérica, por geração).

**Já tinham cena:** primeiro disco, primeiro show, esgotado, saída de integrante, morte, escândalo e capítulo.

## 2. Cenas novas (22)

Todas estão em `src/ui/ps/cut29model.ts`.

- **Detecção:**
  - `cutOfMemory29` e `cutOfFact29`, que o `scan27` chama antes dos casos antigos e por isso podem refinar um caso deles
    (headline em vez de festival comum; primeira assinatura);
  - `probes29`, para a turnê.
- **Regras "uma vez":** `onceKey29`.
- **Figurantes:** `figs29`, com os bonecos do avatar, os visuais do looks27 e os integrantes reais do ato.

| chave | título | gatilho real | uma vez por | tier | cenário |
|---|---|---|---|---|---|
| sign1 | A primeira assinatura | memória `signed` (1ª da partida) | partida | major | signing + camada (contrato, caneta, carimbo) |
| studio1 | A primeira sessão | memória `session` (1ª) | partida | minor | studio + camada (REC, rolos) |
| split | O fim da banda | memória `split` de ato seu | ato | major | **ensaio abandonado** (lâmpada balançando, pele furada, cabo, setlist rasgada) |
| reunion | A volta | memória `reunion` | ato | major | shows + faixa REUNION/DE VOLTA + plateia lotada |
| join | Alguém novo na formação | memória `lineup` "entra/substitui" (formações mensais) | ato-ano | minor | studio + case novo, cadeira a mais |
| poach | Levaram o seu artista | memória `sniped` (rival leva na disputa) | semestre | major | **calçada do selo à noite, limusine do rival** |
| steal | A manobra de bastidores | memória `poach` (você leva o de outro) | semestre | minor | night + mala na mesa, velas |
| vow_kept | Promessa cumprida | memória `promise_kept` | trimestre | minor | team + calendário com a data marcada |
| vow_broken | Promessa quebrada | `promise_broken` / `broken_promise` | trimestre | major | team + data com X, chuva na janela |
| court | O processo | memória `lawsuit` (fileLawsuit) | 8 semanas | major | **tribunal** (bancada, brasão, bandeiras, martelo) |
| verdict | A sentença | memória `verdict` (sem recurso pendente) | 8 semanas | major | tribunal + carimbo VITÓRIA/DERROTA |
| bootleg | Piratas na calçada | fato `piracy` (crime17) de ato seu | semestre | minor | **camelô** com a mídia da época (78, LP, cassete, CD-R, pendrive), viatura |
| payola | O jabá vem à tona | memória `payola` (radio18 / charts) | semestre | major | **cabine de rádio** ON AIR, envelope deslizando |
| gold | Disco de ouro | memória `cert` (AMIF) | ato-ano | minor | **parede de discos** emoldurados, placa no cavalete, flash |
| plat | Disco de platina | `cert` platina/diamante | ato-ano | major | idem, prata/diamante |
| headline | Atração principal | memória `festival` "(headline)" | ato-ano | major | festival + telão com o nome, colunas de fogo |
| leg | A turnê cruza a fronteira | sonda: 1ª parada tocada em outro mercado | turnê × mercado | minor | **cais e navio (até 54) / pista e avião (55+)**, placar com o destino |
| hq | A sede nova | memória `hq` | semestre | minor | **fachada por nível** (sobrado → torre com guindaste), fita cortada aos 4 s |
| retire | A despedida dos palcos | memória `retired` | ato | major | **palco vazio**, banquinho, um foco, isqueiros (até 1999) ou celulares (2000+) |
| sale | A venda da empresa | memória `label_sold` (sale17) | evento | major | **sala de reunião alta**, contrato e caneta, chuva na janela |
| acq | Você compra um selo | memória `acquisition` | evento | major | sala de reunião + discos do catálogo comprado |
| tech | Chega uma tecnologia | memória `tech` de rádio, LP, TV musical, cassete, rede de clipes, CD, internet, streaming, vídeo curto | tecnologia | major | **sala de estar** com o aparelho que chega e a família na luz dele |

### Escolhas

- As escolhas mexem no jogo pelos sistemas que já existem:
  - caixa pelo livro-razão (`post`);
  - reputação (artística, comercial, institucional, com artistas);
  - confiança;
  - momento;
  - moral e cansaço dos integrantes;
  - fãs fiéis e casuais;
  - fama;
  - calor da polícia (`addHeat`).
- **Um fluxo por ação** (docs/act27.md):
  - **Acordo do processo:** a escolha "Propor acordo" chama o mesmo `settleLawsuit` do painel de processos (paga cerca
    de 45% do pedido e encerra o caso).
  - **Advogado:** "Contratar o melhor advogado" sobe a chance real do processo (`suit.odds` +0,08).
  - **Sentença:** o recurso continua sendo a cena interativa do tribunal (`appeal`). A cena "A sentença" não aparece
    quando há recurso pendente e não oferece recorrer.
  - **Cenas antigas do mesmo momento:** o disco de ouro (`goldfx`) e o palco holográfico (`hologram`) vão para o álbum em
    silêncio quando a cena animada conta o momento (regra `SAME27`, igual à do r27).
- **Cara ou coroa:** sai de `coin29` (hash FNV do id da cena). Nunca usa `s.rng` nem os fluxos do rng19, como testado.

## 3. Cenas antigas melhoradas

- **Luz por era e por hora** (`light29`, por cima de toda cena):
  - grão de película, vinheta e um risco ocasional até 1954;
  - brilho quente de 1955 a 1979;
  - névoa neon (magenta e ciano nas bordas) de 1980 a 1999;
  - LED frio no chão de 2000 em diante;
  - dia, fim de tarde ou noite. A hora é fixa onde faz sentido (golpe, batida e pirataria à noite; tribunal de dia;
    velório e herdeiros no fim de tarde) e, nas outras cenas, vem do hash da cena.
- **Camadas de cena** (`OVER29` em `src/ui/pixel/cenas29.ts`):
  - pilhas de discos no primeiro disco;
  - brilhos dourados no nº 1;
  - plateia rala no primeiro show;
  - placa ESGOTADO/SOLD OUT e casa cheia;
  - tomates no show desastroso;
  - placa de estrada com a cidade;
  - canhões de luz varrendo a premiação;
  - várias câmeras com flash no escândalo;
  - holofote de busca na batida;
  - fileira de velas e flores no memorial;
  - contas voando na falência;
  - calendário com o ano na nova era;
  - bandeirolas no festival;
  - REC no take mágico.
- **F8:**
  - **Holograma:** o boneco é desenhado translúcido em ciano, em duas passadas, com brilho e tremido de varredura
    (`Fig27.holo`). Por cima vão o feixe do projetor, as linhas de varredura e uma falha ocasional (`holoFx29`).
  - **Golpe:** arte própria, um escritório escuro com chuva na janela, sombra atrás da persiana, telefone da época
    tocando e relâmpago. Antes era a redação de jornal.
  - **Herdeiros:** arte própria, uma sala fria com mesa comprida, testamento lacrado e moldura dourada com o retrato de
    quem se foi (`portraitPx`). Sem retrato, aparece um busto em sombra.
- **Figurantes:** os bonecos sem pessoa vêm de `crowdLook27(seed, ano)`, com a roupa e o cabelo da época, em vez do
  visual aleatório sem época.
- **Texto:**
  - variantes de fala (pt/en) para 14 cenas antigas (`VARS29`) e para 19 das novas (`vars`), escolhidas pelo hash da cena
    (estáveis entre aberturas);
  - placeholders novos com os objetos reais da época: `{o}` (o disco de 78, o vinil, o LP, a fita cassete, o CD, o
    arquivo MP3, o single no streaming), `{m}` (a rádio, a TV, a rede de clipes, a internet, o streaming) e `{c}` (a
    cidade);
  - continuam os nomes reais do ato, da pessoa, do disco e do selo.
- **Ritmo e pulo:**
  - ritmo único, 1,8 s + 2,6 s por fala (`pace27`). Antes cada cena tinha o seu `ms`;
  - clique no quadro, ou Enter/Espaço com o foco nele, pula para a próxima fala;
  - "Pular ⏭" continua indo direto às escolhas;
  - com movimento reduzido, o quadro fica estático e todas as falas aparecem listadas.
- **Chuva:** saiu de dentro das salas. Herdeiros, venda e promessa quebrada agora mostram a chuva só na janela.

## 4. Álbum e storyboard

- **Registro:** `src/ui/ps/album29.ts`. Toda cena enfileirada pelo `enqueue27` (avanço) ou pela ponte das atividades
  (`bridge27`) é registrada na hora: id, chave, semana, ano, título, ato e dados da cena. Fica em `x4.cut27.log`, com no
  máximo 300 linhas.
- **Escolha:** quando o jogador escolhe, o registro guarda a escolha e o resultado (`outcome29`).
- **Cenas que não interrompem:** também entram no registro (orçamento de atenção, preferência).
- **Álbum de cenas:** seção nova "Cenas animadas", por ano, com a escolha feita e "rever cena". Rever usa o mesmo fluxo
  de sempre:
  - se a cena ainda está na fila, abre por `openCutscene` (uma escolha ainda aberta pode ser feita ali);
  - se não está, abre só para ver, com o resultado guardado.
- **Storyboard do fim** (`end28`):
  - `album28` lê o registro junto com o arquivo das cenas de lugar;
  - a cena animada aparece com uma **miniatura em pixel**: o quadro inteiro, mostrado a 50%;
  - abaixo do álbum (uma cena por ano, como no r28) aparece **"Todas as cenas animadas (N)"**, com a lista completa por
    ano e a escolha.

## 5. Arquivos

**Novos:**

- `src/ui/ps/cut29model.ts`: catálogo, detecção, "uma vez", figurantes, variantes de fala, palavras da época e dados do
  cenário. É puro.
- `src/ui/pixel/cenas29.ts`: 13 cenários completos, 24 camadas, `light29`, `holoFx29` e `car29`. É puro (só Px).
- `src/ui/ps/cutpaint29.ts`: pintura pura do quadro, a mesma no tocador, nos testes, na folha de contato e no
  storyboard.
- `src/ui/ps/album29.ts`: registro, álbum, rever, miniatura e lista do storyboard.
- `tests/r29-scenes.test.ts`.
- `tools/cutsheet29/`: folha de contato (`?part=new|old|all&before=1&t=2.6`).
- `scripts/shots29scenes.mjs`: capturas dentro do jogo.

**Editados** (mudanças pequenas e só aditivas):

- `src/ui/ps/cut27model.ts`:
  - o tipo `CutKey29` e os campos `city` e `vars`;
  - `...CUT29` no catálogo;
  - os ganchos `cutOfMemory29` e `cutOfFact29`;
  - `init29` e `probes29`;
  - `onceKey29` e `figs29`;
  - os placeholders `{o}`, `{m}` e `{c}`;
  - `beatsOf27` e `pace27`.
- `src/ui/ps/cut27.ts`:
  - pintura por `paintCut29`, retrato da moldura em morte e herdeiros, variantes, ritmo e clique para avançar;
  - `log29` e `outcome29`;
  - `SAME27` para gold, plat e holo.
- `src/ui/ps/cut28model.ts`: o holograma marcado `holo: true`; os herdeiros sem chuva interna.
- `src/ui/ps/art27.ts`: `Fig27.holo` (desenho translúcido) e `crowdLook27` para os figurantes das cenas.
- `src/sim/sys/end28.ts`: `album28` também lê `x4.cut27.log`. Só leitura, sem `??=`.
- `src/ui/end28.ts`: miniatura e "Todas as cenas animadas" no storyboard.

## 6. Números

- **Catálogo:** 43 cenas animadas (21 antigas + 22 novas).
  - Major: 14 novas.
  - Minor: 8 novas (`studio1`, `join`, `steal`, `vow_kept`, `bootleg`, `gold`, `leg`, `hq`). Na preferência "Só
    importantes", essas não tocam.
- **Escolhas novas:** 59 (2 a 3 por cena).
- **Cenários próprios:** 13. Camadas: 24 (8 das cenas novas, 15 das antigas e o holograma).
- **Variantes de fala:** 33 conjuntos alternativos (14 de cenas antigas + 19 de novas).
- **Prioridades das novas** (desempate quando várias acontecem no mesmo avanço): venda 96, fim da banda 87, jabá 84,
  aposentadoria 83, rival 81, sentença 80, … tecnologia 42.
  - No máximo 2 cenas por avanço (scan27).
  - Pelo story28: 2 por avanço e 3 por mês; decisões ('always') sempre passam.

## 7. Testes

`tests/r29-scenes.test.ts` tem 13 testes e passa todos.

- **Catálogo:** ≥ 15 cenas novas; 2–3 escolhas; arte própria (cenário ou camada) para cada uma; golpe e herdeiros com
  cenário próprio; holograma com efeito.
- **Falas:**
  - variantes estáveis pelo hash;
  - nenhum `{x}` sobra sem resolver em nenhuma cena em 1930, 1975 e 2015, em pt e em en;
  - pelo menos uma cena varia entre ids.
- **Pintura:** todas as 43 cenas em 8 épocas (1925–2021):
  - não dão erro;
  - o quadro sai cheio (mais de 90% opaco);
  - a pintura é determinística (mesmo hash duas vezes);
  - pintam também animadas (t = 3,7 s);
  - cada cena tem pelo menos 3 quadros distintos entre as épocas.
- **Detecção:**
  - as memórias reais (`signed`, `session`, `split`, `reunion`, `lineup`, `sniped`, promessas, `lawsuit`, `verdict`,
    `payola`, `cert`, `festival` headline, `hq`, `retired`, `label_sold`, `acquisition`, `tech`) viram a cena certa, só
    de ato seu;
  - o `scan27` com memória e fato reais (`split` + `piracy` do crime17) acerta o ato;
  - a regra "uma vez" funciona.
- **Escolhas:**
  - todas as 59 escolhas novas são determinísticas (dois jogos iguais dão estado igual);
  - repetir não faz nada;
  - **`s.rng` e os fluxos do rng19 ficam intocados**. O mesmo vale para o scan e para a pintura;
  - o acordo do processo encerra o processo real e o advogado sobe a chance real;
  - o cara-ou-coroa sai do hash e fica balanceado em cerca de 50%.
- **Fila e orçamento:**
  - 5 momentos no mesmo avanço viram 2 cenas, as de maior prioridade (venda e fim da banda); o resto conta como visto;
  - `attnScenes28` deixa passar 2 de 4 cenas 'milestone', e a decisão ('always') passa;
  - as chaves "uma vez" funcionam.
- **Álbum:**
  - todas as 43 cenas registradas entram no registro e no `album28` (storyboard);
  - a escolha fica anotada.

Rodados também, em lotes pequenos (`--poolOptions.forks.maxForks=2`):

| arquivos | testes |
|---|---|
| `r28-f8-cut`, `r27-art`, `r27-int`, `r28-f4` | 45 |
| **`r27-p2a`, `r27-p2b`, `r27-m2`, `r28-f3`** | 70 |

Todos passam. Os valores-ouro passam **sem re-medir**: a simulação não mudou. Só a interface enfileira e escolhe cenas,
e o `end28` só lê. `tsc --noEmit` está limpo.

## 8. Capturas (`docs/shots29scenes/`)

**Folhas de contato** (`tools/cutsheet29`, t = 2,6 s, 4 épocas: 1932, 1966, 1988, 2016):

- `sheet-new.png`: as 22 cenas novas.
- `sheet-old-antes.png`: as 21 cenas antigas no checkout Masters_28 (pintura do r28).
- `sheet-old-depois.png`: as mesmas 21 cenas agora. Compare golpe, holograma e herdeiros no fim da folha.

**Dentro do jogo** (partida rápida pela tela inicial, NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR; Selo Agulha, 1962):

- **Antes** (Masters_28): `antes-holo-*`, `antes-coup-*`, `antes-heirs-*`, `antes-death-*`, `antes-scandal-*`,
  `antes-album.png`, `antes-storyboard.png`.
- **Depois:** `depois-<cena>-meio.png` (no meio da animação) e `depois-<cena>-resultado.png` (depois da escolha), para
  split, holo, coup, heirs, tech, plat, leg, court, retire, bootleg, sign1, headline e gold, além de
  `depois-split-escolhas.png` e `depois-court-escolhas.png`.
- **Álbum e storyboard:** `depois-album.png` (seção "Cenas animadas") e `depois-storyboard.png` (miniatura e "Todas as
  cenas animadas").

Para refazer (servidores de desenvolvimento rodando):

```
npx vite tools/cutsheet29 --port 5299 &
npx vite --port 5327 &
node scripts/shots29scenes.mjs docs/shots29scenes 5327 depois
```

## 9. Lacunas e próximos passos

- **Luz nos bonecos:** os bonecos não recebem a luz da era e da hora. Eles são desenhados no canvas depois do buffer
  (como no r27). Uma passada de cor por cima dos bonecos resolveria.
- **Capítulo da década** (`chapter28`): continua uma cena de texto. A cena pixel ficou de fora para não criar um segundo
  fluxo do mesmo momento. O próximo passo seria pôr o quadro (por exemplo, o cenário `tech` com o ano) dentro da própria
  cena do capítulo.
- **Escândalo e facções de fãs:** a variante de fala cita a divisão dos fãs, mas a escolha ainda não mexe nas facções do
  fan15 (só reputação e momento).
- **Jabá:** "Assumir e encerrar o esquema" não zera o esquema do radio18 (`w4.payola`), só mexe em reputação e momento.
  O ideal é chamar a ação existente de encerrar o jabá, se houver uma pública.
- **Pirataria:** "Chamar a polícia" é uma apreensão pontual. Não muda a política antipirataria (`piracy` stance do
  milestones).
- **Tecnologias:** só as 9 grandes viram cena. Gravação elétrica, FM, sintetizador, DAW, download e P2P não viram.
- **Testes de gatilho:** os gatilhos foram testados com memórias e fatos reais emitidos pelo teste, não com uma partida
  longa jogada até cada momento. Uma partida de 40 anos com o bot e a interface ligada mediria a frequência real.
- **Celular:** não foi capturado na largura do celular. O tocador encolhe o quadro, mas os cenários completos foram
  compostos para 256×112. Abaixo de cerca de 190 px de largura, alguns letreiros cortam.
- **Arquivo de lugares:** a lista "Lugares › cenas que você viveu" (`scenes.archive`, 30 últimas) não recebe as cenas
  animadas, de propósito, para não empurrar as cenas de lugar para fora. Elas estão no Álbum de cenas e no storyboard.
