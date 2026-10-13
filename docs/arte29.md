# Rodada 29 — Arte: mais arte para tudo

Pedido do autor: "outro agente para criar mais artes para tudo (capas, personagens, logos, coisas que ainda não têm
imagens, e muito mais)".

Estilo: o **desenho antigo** de `art.ts`, `icons.ts` e da rodada 28:
- paleta curta;
- contorno escuro quente de 1 px;
- 2 ou 3 tons por material;
- pontilhado Bayer e ruído determinístico;
- fonte bitmap 3×5.

Nada de HD nem do acabamento "finish/iconkit".

Tudo é procedural e semeado (id/nome + ano + cidade/gênero): a mesma entrada dá sempre os mesmos pixels. Não há
arquivo de imagem novo e nada novo vai para o save.

## O que entrou

| Categoria | Antes | Agora | Arquivo |
|---|---|---|---|
| Lugares (fachadas 32×32) | só texto ou ícone genérico | **13 tipos**: clube, bar, teatro, arena, estádio, estúdio, rádio, TV, loja de discos, fábrica de prensagem, sede de gravadora, tribunal, escritório. Material da parede pela **região** da cidade (`skyline27.region27`) e detalhes pela **época** (6 faixas) | `src/ui/pixel/places29.ts` |
| Placa da casa de show | — | **5 tipos** pela época: tabuleta pintada, marquise de lâmpadas, neon, caixa luminosa, LED. A largura cresce até caber o nome | `places29.ts` |
| Plataformas de streaming | não aparecia | ícone de aplicativo 24×24 (**8 símbolos**, cor pelo nome; brilho antes de 2013, chapado depois) | `places29.ts` |
| Bandeiras | — | **74 países desenhados** (faixas e símbolos simplificados). País fora da tabela ganha uma **flâmula neutra** com o código; nenhuma bandeira é inventada | `src/ui/pixel/geo29.ts` |
| Brasões de cidade | — | escudo 24×28 com coroa mural, cores da região, **10 cargas** pela geografia (onda, ponte, montanha, sol, palmeira, portal…) e as iniciais | `geo29.ts` |
| Horizonte da cidade | — | miniatura 48×24 que **reaproveita o plano de prédios do "Nosso mundo"** (`skyPlan27`): prédios da época, minaretes, pagodes, cúpulas, chaminés e guindastes do boom; dia ou noite | `geo29.ts` |
| Gêneros | só a pílula colorida | selo 24×24 para **todos os 371 gêneros**: forma pela família, símbolo pelo clima (19 desenhos), moldura pela década de nascimento | `src/ui/pixel/badge29.ts` |
| Movimentos/cenas | texto | selo-estrela com o símbolo do gênero-base e o ano | `badge29.ts` |
| Facções de fãs e fandom | texto ou troféu genérico | flâmula 20×28 com cor do gênero, **10 cargas** (pelo nome/temperamento) e as iniciais do ato | `badge29.ts` |
| Premiações | troféu (R28) | medalhão 32×32 com louros, **8 estatuetas** (gramofone, astronauta, globo, lira…) e metal da época | `badge29.ts` |
| Cabeçalhos de parada | texto | **8 estilos de época**: "Hit Parade" pintado, rádio Top 40, bolha dos 70, neon dos 80, contagem dos 90, brilho dos 2000, barras de streaming, holograma | `badge29.ts` |
| Contratos/documentos | `kv` em texto | papel 28×36 em **6 tipos**: pergaminho com selo de cera, datilografado com carimbo, formulário contínuo, PDF no tablet, holograma e guardanapo | `src/ui/pixel/paper29.ts` |
| Capas de revista e fanzine | mastro (R28) | capa 32×40 **com o retrato do artista** (fotocópia no fanzine, P&B antes de 1965), em 5 tipos | `paper29.ts` |
| Programas de TV e rádio | texto | cartão 48×32: aparelho da época **com o apresentador na tela**, ou microfone "no ar" com o dial | `paper29.ts` |
| Processos | ícone de martelo | martelo e autos, balança (direitos) ou **sala de tribunal** (julgamento) | `paper29.ts` |
| Equipamento do estúdio | ícone de microfone | **15 desenhos**: microfone de fita, câmara de eco, placa, compressor valvulado, eco de fita, console, sala de pedra, 808, vocoder, mixador neural, amplificador, sintetizador, gravador, monitor | `src/ui/pixel/things29.ts` |
| Merchandising | ícone de camiseta | **12 produtos com o logo do ato estampado** (bótom, pôster, camiseta, patch, moletom, box de CDs, vinil colorido, ecobag, NFT, caixa de fã, boné, caneca) | `things29.ts` |
| Veículos de turnê | ícone de ônibus | perfil 48×24 por época: perua com reboque → Kombi → van; ônibus de linha → prateado → ônibus-leito; avião a hélice → jato | `things29.ts` |
| Pessoas de bastidor | iniciais ou nada | retrato de busto (avatar.ts) + **adereço da função** em 10 ofícios. Produtor com fones; técnico com headset; empresário com telefone (gancho → tijolão → celular); crítico com bloquinho; advogado com pasta; olheiro com fita demo; divulgador com crachá; executivo com caneta de ouro; DJ; agente de óculos escuros | `src/ui/pixel/people29.ts` |
| Foto da banda | — | 1 a 5 integrantes (bustos desenhados) contra tijolo, estúdio, rua ou muro, com **6 tratamentos**: P&B, cor desbotada dos 70, saturada dos 80, granulada dos 90, nítida e meio-tom | `people29.ts` |
| Capas | 9 + 27 (R28) | **+12 composições**, 6 delas com **foto da banda**: foto sangrada, borda branca, close, cabine de fotos, recorte de jornal, silhuetas. As outras 6: barras de teste, mapa da turnê, folha datilografada, azulejos, olho, tipografia empilhada | `src/ui/pixel/cover29.ts` |
| Logos | 9 + 18 (R28) | **+12 estilos**: gótico, faixa, circuito, chamas, 8-bit, monolinha, diamante, asas, tubo de neon, carimbo redondo, fita Dymo, oval retrô. A época trava: nada de circuito antes de 1978 nem de 8-bit antes de 1980 | `src/ui/pixel/logo29.ts` |
| Cartazes de parede (sede) | 3 motivos | **+7 composições** pela época: show, silhueta, espiral, xerox, datas, retrato, explosão | `src/ui/pixel/poster29.ts` |
| Relíquias | 48 (R28) | **+16**: banjo, sanfona, gaita, cavaquinho, cítara, boombox, walkman, credencial, palheta, pandeiro, panfleto, sampler, keytar, letreiro de neon, telefone por época, lenço | `src/ui/pixel/relic29.ts` |
| Personagens | 26 roupas, 3 corpos | **+8 roupas** por época e região: terno zoot, guayabera, agbada, hanbok, jaqueta college, terninho de ombreiras, colete de patches, camisa de futebol. **+2 corpos**: 3 = atlético, 4 = grandalhão | `src/ui/pixel/looks29.ts`, `looks27.ts`, `avatar.ts` |

### Como as artes novas convivem com as antigas

- **Capas**: a R28 continua com cerca de 2/3. A R29 pega cerca de 60% do terço que ficava no desenho original (≈20% de
  todas as capas). Nessas, a foto aparece em 50% a 70% dos casos, conforme o gênero. Os integrantes vêm de um
  resolvedor opcional (`setCoverMembers29`) ou são gerados pelo nome do ato com a moda do gênero e do ano.
- **Logos**: a R28 fica com cerca de 55%. A R29 pega metade do resto (≈22% de todos).
- **Cartazes**: cerca de 60% dos atos ganham uma composição nova.
- **Relíquias**: a palavra do nome manda ("sanfona", "boombox", "credencial"…). Peça genérica ("objeto de cena")
  ganha um objeto da época em cerca de 55% dos casos.
- **Roupas e corpos**: o passo `flavor29` roda **no fim de `flavor27`, com RNG próprio**. As escolhas de
  cabelo, chapéu e acessórios da R27 não mudam.
  - Troca a roupa em cerca de 6% a 32% dos casos, quando uma peça nova cabe na época, no país e no gênero.
  - Troca o corpo em cerca de 7% (corpo 1 → atlético) e 35% (corpo 2 → grandalhão).
  - Só vale para o procedural: visual gravado não passa por ele.

## Onde aparece no jogo (só imagem; nenhum botão ou fluxo novo)

| Arte | Tela | Arquivo |
|---|---|---|
| Fachada pelo porte (bar → estádio) | tabela de shows do ato (Agendar datas) | `src/ui/panels/misc.ts` |
| Cabeçalho de parada da época | Paradas: singles e álbuns | `src/ui/panels/misc.ts` |
| Fachada | lista de casas lendárias na ficha da cidade | `src/ui/sys/mapinfo17.ts` |
| Fachada grande + placa | página da casa de show | `src/ui/sys/mapinfo17.ts` |
| Emissora (rádio/TV), ícone (streaming) ou mastro | tabela de veículos de mídia | `src/ui/sys/media17.ts` |
| Retrato de bastidor no lugar das iniciais | remetentes-pessoa da caixa de entrada | `src/ui/sys/inbox27.ts` |
| Marca do selo (R28, agora ligada aqui) | tabela de rivais | `src/ui/panels/market.ts` |
| Brasão + horizonte | cabeçalho da ficha da cidade no mapa | `src/ui/sys/mundo27.ts` |
| Fachada | casas da ficha da cidade no mapa | `src/ui/sys/mundo27.ts` |
| Emissora no lugar do ícone genérico | rádios da ficha da cidade no mapa | `src/ui/sys/mundo27.ts` |
| Fachada/ícone por tipo de negócio | cabeçalho de cada empreendimento: estúdio, mídia, plataforma, festival, editora, agência | `src/ui/sys/ventures9.ts` |
| Rosto com fones | produtores (lista e links) | `src/ui/sys/producers15.ts` |
| Rosto com telefone | empresários | `src/ui/sys/managers14.ts` |
| Fábrica | fábricas de prensagem disponíveis | `src/ui/sys/supply18.ts` |
| Bandeira | lista de países e ficha do país | `src/ui/sys/charts7.ts` |
| Veículo da época (pelo transporte da turnê) | cabeçalho da turnê | `src/ui/panels/tours.ts` |
| Produto com logo | cartões de merch | `src/ui/panels/tours.ts` |
| Produto com logo | linhas de merch (Negócios 17) | `src/ui/sys/biz17.ts` |
| Martelo, balança ou tribunal | processos em andamento | `src/ui/panels/business.ts` |
| Papel do contrato | aba Contrato da página do artista | `src/ui/pages.ts` |
| Flâmula | facções de fãs | `src/ui/sys/live18.ts` |
| Flâmula | nome do fandom | `src/ui/panels/people.ts` |
| Selo | lista de movimentos e página do movimento | `src/ui/sys/bonds9.ts` |
| Selo do gênero | gêneros em alta | `src/ui/sys/trends17.ts` |
| Mastro (R28) | fanzines e blogs na ativa | `src/ui/sys/media19.ts` |
| Desenho do equipamento | equipamentos lendários e leilões do estúdio | `src/ui/sys/music/room.ts` |
| Capas, logos, cartazes e relíquias novos | todos os lugares que já usavam `cover()`/`logo()`/`posterPx`/`relicImg28` | `src/ui/art.ts`, `src/ui/pixel/relic28.ts` |

Os atalhos de UI (alinhamento, tamanho e escolha da arte por tipo) ficam em `src/ui/art29ui.ts`. Cada linha nos
arquivos compartilhados é uma inserção de imagem, marcada com `r29`.

### Funções reutilizáveis para a equipe de cenas (cut27)

Não mexi na encenação. Deixei pronto, puro e semeado:
- `staffPortraitPx29(pessoa, função, ano)`;
- `bandPhotoPx29(integrantes, ano, W, H, tratamento)` e `photoTreat29(px, tratamento)`;
- `placePx29(tipo, id, nome, ano, cidade)`, `signPx29(...)`;
- `skylineThumbPx29(cidade, ano, noite)`;
- `vehiclePx29(transporte, ano)`;
- `showCardPx29(...)`, `magCoverPx29(...)`, `casePx29(...)`.

## Compatibilidade dos visuais salvos

- Antes de tocar em `avatar.ts`, gravei uma base em `tests/r29-looks-base.json` (`tests/r29-looksbase.ts`) com:
  - 260 visuais congelados: 120 procedurais, 60 com a moda da R27 e 80 famosos reais;
  - o hash dos pixels do retrato em 4 épocas e do sprite em 4 poses e direções (2.080 hashes).
- Depois das mudanças, **todos os 2.080 hashes batem**.
- As roupas novas são índices anexados (26..33). Os corpos 3 e 4 são valores novos. Os desenhos de corpo 0..2 e de
  roupa 0..25 não mudaram.
- `gate27` faz a roupa nova cair para a antiga equivalente antes do ano dela (ex.: guayabera antes de 1940 vira
  camisa).

## Números

- **Código novo:** 12 módulos, cerca de 144 KB de fonte:
  - `places29`, `geo29`, `badge29`, `paper29`, `things29`, `people29`;
  - `cover29`, `logo29`, `poster29`, `relic29`, `looks29`;
  - `art29ui`.
- **Arquivos compartilhados:** 25 editados, com inserções pequenas:
  - 2.157 linhas inseridas e 34 trocadas em `src/`, contando os módulos novos;
  - nada renomeado e nada removido.
- **Pacote (`vite build`, todos os JS):**

  | | base | R29 | diferença |
  |---|---|---|---|
  | minificado | 10.922.208 B | 10.998.066 B | **+75,9 KB (+0,69%)** |
  | gzip -9 | 4.038.813 B | 4.066.435 B | **+27,6 KB (+0,68%)** |

- **Desempenho:** a arte é gerada sob demanda e memorizada.
  - O `Px` fica em memo no `pxCache` de `art.ts` (capas, logos e cartazes).
  - A data URL fica em memo no `pxUrl28` (teto de 1.500), por chave de semente, tipo e faixa de época.

## Testes

`tests/r29-art.test.ts` tem 10 testes, todos passando.

**Determinismo**
- Todas as categorias desenham os mesmos pixels quando chamadas duas vezes.
- As escolhas puras também se repetem: composição de capa e `flavor27`.

**Variedade**
- 40 sementes dão:
  - ≥38 fachadas;
  - ≥38 ícones de streaming e ≥38 flâmulas;
  - 40 retratos de bastidor distintos e 40 fotos de banda distintas.
- 60 cidades dão ≥55 brasões.
- Os 371 gêneros dão ≥368 selos distintos.
- 120 discos dão ≥110 capas distintas e ≥9 composições novas em uso.
- Os logos novos ficam entre 40% e 60% do resto; os cartazes novos entre 48% e 72%.

**Cobertura** (tudo desenha e tem tinta)
- 13 lugares × 8 épocas × 16 cidades de todas as regiões.
- Todas as bandeiras da tabela e todos os países do jogo (com flâmula neutra quando o país está fora da tabela).
- Todas as cidades, com ≥8 cargas de brasão distintas.
- Horizontes de 16 cidades em 4 épocas.
- Todo gênero (selo e movimento), toda carga de fã, premiações em todas as épocas e cabeçalhos de parada de 1925 a 2040.
- Todos os papéis, objetos e relíquias novas em 8 épocas.
- Toda função de bastidor × época, e foto de 1 a 5 integrantes em todos os tratamentos.
- Toda composição de capa × gênero × época cobre o quadro.
- Todo estilo de logo e de cartaz, e capa/logo final para 120 gêneros em 3 épocas.

**Personagens**
- Visuais salvos desenham pixel a pixel igual (os 2.080 hashes da base).
- As roupas 26..33 e os corpos 3 e 4 aparecem no gerador para KOR, NGA, CUB, USA, BRA e GBR.

**Ajuste em teste existente** (`tests/r27-looks.test.ts`): a contagem fixa de peças desenhadas passou de `78 * 9` para
`86 * 9`, porque são 8 roupas novas anexadas a `OUTFIT27`. O comentário no teste explica.

**Regressão** — também rodaram, em lotes de 3 a 4 arquivos, todos passando:
- `r28-art`, `r27-looks`, `r15-looks`, `r27-art`;
- `r27-city`, `r27-city2`, `r27-skyline`, `r27-inbox`;
- `r27-ctx`, `r27-ui`, `r17-nav`, `r19-media`;
- `r14-managers`, `r15-producers`, `r17-biz`, `r18-supply`;
- `r11-lendas`, `r18-talent`, `r17-crime`, `r9-world`.

**Valores de ouro** (`r27-p2a`, `r27-p2b`, `r27-m2`): passaram sem mudança. A rodada não toca no simulador; tudo é UI.

`tsc --noEmit` (com `NODE_OPTIONS=--max-old-space-size=6144`) está limpo.

## Capturas (`docs/shots29art/`)

**Folhas de contato**
- Ferramenta: `tools/artsheet29` (`npx vite tools/artsheet29 --port 5299`).
- Script: `node scripts/sheets29.mjs`.
- Folhas: `sheet-places.png`, `sheet-geo.png`, `sheet-badges.png`, `sheet-paper.png`, `sheet-things.png`,
  `sheet-people.png`, `sheet-covers.png`, `sheet-logos.png`, `sheet-relics.png`.

**Telas do jogo, antes × depois**
- Script: `node scripts/shots29art.mjs <servidor> docs/shots29art antes|depois`.
- O "antes" roda contra um servidor do ramo base.
- Partida "established" em 1978, locale pt-BR.
- Telas, com `-antes.png` e `-depois.png` para cada uma:
  - `game-shows-porte`, `game-paradas`, `game-rivais`, `game-paises`;
  - `game-generos-em-alta`, `game-fandom`, `game-merch`, `game-movimentos`, `game-casa-de-show`;
  - `game-produtores`, `game-empresarios`, `game-fabricas`, `game-fanzines`, `game-caixa-de-entrada`.

## Lacunas

- **Telas sem captura:** ficha da cidade no mapa, cabeçalho do empreendimento, tabela de veículos de mídia, turnê
  ativa, processos, aba Contrato, facções e equipamentos do estúdio. Estão ligadas e tipadas, mas não fotografadas,
  porque pedem uma partida com aquele estado (turnê na estrada, processo aberto, negócio próprio). Dá para
  acrescentar ao `scripts/shots29art.mjs`.
- **Fandom na captura:** a partida de 1978 ainda não tem fandom com nome, então `game-fandom-depois` mostra a seção sem a flâmula.
- **Cartazes da sede atual (`hqpx27`):** a sede nova desenha cartazes genéricos por era e não recebe dados do ato
  (`Plan27` não tem isso). Os cartazes novos entram no `posterPx` (sede antiga, `hq.ts`). Para chegar à sede nova é
  preciso passar os atos no plano, que é área de outro agente.
- **Ícones de menu genéricos:** não troquei os ícones de menu e das centrais (`icons.ts`/`icons17.ts`, `nav17`).
  - Exemplos: `platform16`→navio, `studio12`→rádio, `tour12`→trem.
  - Mexer neles é reorganização de navegação, que é de outro agente.
  - Os desenhos novos (estúdio, plataforma, ônibus, fábrica) podem servir de base.
- **Idades:** o envelhecimento já existe (`age17`: grisalho, calvície, rugas e peso depois dos 45). Não criei
  infância nem adolescência: nenhum personagem do jogo é criança.
- **Corpos novos só no procedural:** o editor de personagem não oferece os corpos 3 e 4 (só as roupas novas, que
  entram na lista de roupas). Expor os corpos no editor é uma linha no editor, que não é área minha.
- **Bandeiras simplificadas:** 74 bandeiras em 24×16 (brasões internos viram um disco ou uma estrela). Os demais
  países ganham a flâmula neutra com o código, para não inventar símbolo de país real.
- **Fotos de banda nas capas:** sem o resolvedor `setCoverMembers29` ligado, os integrantes são procedurais pelo nome
  do ato (coerentes com gênero e ano), não os integrantes reais.
  - Ligar ao ato exige achar o ato pelo nome a partir de `coverPx`, que hoje não recebe o ato.
  - Isso mudaria a assinatura usada em muitos lugares, então ficou como gancho opcional.
- **Texto pequeno:** placas, cabeçalhos de parada e mastros a 1×, e nomes compridos em capas de 40 px, viram "cor e
  forma". O nome legível segue no texto ao lado.
