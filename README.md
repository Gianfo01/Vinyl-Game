# Masters


*(antes chamado "Vinyl to Neural")*
Simulador de gestão musical em turnos mensais, de 1920 a 2040: da goma-laca às vozes neurais.
Esta é a primeira versão jogável construída a partir do **GDD v8**, do **Catálogo do Universo** e da
**Pesquisa de design**. Roda no navegador, sem servidor, em PT-BR e EN.

## Como rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm run build      # gera dist/ (site estático; pode ir para itch.io, GitHub Pages etc.)
npm test           # invariáveis do GDD §27 (determinismo, extrato, recoupment…)
npm run headless -- --runs 20 --years 30 --start 1960 --mode free   # simulador sem interface
```

## Como jogar (resumo)

1. **Nova run**: escolha papel (Gravadora, Artista/banda ou Híbrido), cenário, ano (1920, 1950, 1962,
   1980, 2000 ou 2030), cidade-sede, modo de mundo (Histórico, Livre, Caos), narrador (Maestro, Brisa,
   Acaso), Carta do Selo, mutators, dificuldade, seed e filtros de conteúdo.
2. **Mesa do mês** (tecla 1): briefing de até 5 itens, cartões de decisão, ofertas, metas e rumores.
3. **Mercado → Scouting** (5): sinais chegam todo mês. Aprofunde o conhecimento (rumor → observação →
   acompanhamento → audição → convivência) para estreitar intervalos de talento e potencial; faça ofertas
   com 5 modelos de contrato, cláusulas e promessas. A leitura da negociação é uma faixa, nunca uma %.
4. **Artistas** (4): agenda de 4 slots (3 para iniciantes) com 12 ações + compor/gravar/shows, ou delegue.
5. **Criação** (8): planeje lançamentos — formatos da era, tiragem física (estoque!), marketing com
   retorno decrescente `E = 1 − exp(−verba/custo de alcance)`, territórios e previsão com intervalo.
6. **Avançar**: mês a mês, trimestre ou até o próximo evento (Ctrl+Enter avança; Ctrl+K abre a paleta).
7. Acompanhe **Paradas** (WorldSound 100 / Albums, fecham por semana), **Catálogo** (autópsia de cada
   lançamento, reedições), **Shows**, **Empresa** (finanças, equipe, sede, equipamento, territórios,
   crédito, legado) e o **Diário da run**.
8. Em 2040 a run termina num dos **20 finais do Arco Neural**, escolhido pelo legado em 7 dimensões e
   pelas escolhas da era sintética. Depois dá para seguir em sandbox.

## O que está implementado (mapa do GDD v8)

| GDD | Situação nesta versão |
|---|---|
| §1 Pilares, plataforma | Navegador, PC primeiro; layout responsivo para celular (abas, tabelas roláveis) |
| §3 Cadeia de 16 etapas | Formação/cena, descoberta, negociação, composição, gravação, mixagem (abordagem), fabricação/estoque, distribuição (territórios), promoção, palco, direitos (master × edição, sync), catálogo (reedição, compra de catálogo), negócios (investidor, crédito, fusões de rivais), legado. Manual ou delegado |
| §4 Papéis | Gravadora, Artista/banda e Híbrido jogáveis. Empresário, Editora e Estúdio aparecem bloqueados (fase 4) |
| §5 Run única | Seed (L0), datas de tecnologia por modo e grafo de dependências (L1), elenco a partir dos 100 atos-arquétipo + gerador procedural com gênio solitário e ato fênix (L2), rivais e profissionais (L3), diretor de histórias e pontos de divergência (L4), papel/cenário/Carta/mutators/narrador (L5). 16 mutators, 12 Cartas com metas, assinatura da run, Diário |
| §6 Loop e ritmo | Briefing ≤ 5 itens, avanço mês/trimestre/até evento com interrupções, desfazer mês ou modo compromisso |
| §7 Mundo | 7 mercados, 40 cidades, eras com formatos, mídia e pressões próprias; macroeventos (recessão, greve, leis) |
| §8 Cenas e gêneros | ~130 gêneros em 14 famílias com data de nascimento e pais; popularidade dinâmica, cenas por cidade, explosão de cena, revivals |
| §9 Pessoas | 7 habilidades 0–100, potencial oculto, 36 traços, 8 ambições, 7 origens, estados (moral, inspiração, fadiga, estresse, ressentimento), saída de integrante (moral < 25 por 3 meses; substituto $6.500), carreira em 3 eixos, aposentadoria, lendas |
| §10 Scouting | 9 fontes por era, 5 graus, viés e envelhecimento de relatórios, pedido estruturado, disputa com rivais, quadro de pipeline |
| §11 Contratos | Clássico, 360, licenciamento, distribuição e edição; adiantamento, royalties, prazo, controle criativo, publishing, promessas registradas; recoupment conforme o exemplo do v6; renovação, contraproposta, rescisão |
| §12 Criação | Q = 0,25 melodia + 0,20 letra + 0,25 performance + 0,20 produção + 0,10 originalidade; estúdios por nível, abordagem espontânea/equilibrada/minuciosa, produtor, engenheiro, equipamento por era |
| §13 Fabricação e distribuição | Formatos por era, parcela física 80/35/8 %, prensagem com custo, estoque e falta, reprensagem, pirataria por era |
| §14 Marketing | 12 canais por era com retorno decrescente, críticos, jabá com risco persistente, gestão de crise, reputação em 4 dimensões |
| §15 Palco | 5 níveis de casa, estimativa de público, divisão com promotor, fadiga, incidentes, festivais com billing (abertura/tarde/headline), residências |
| §16 Direitos | Master e edição separados; chaves únicas no ledger (reprocessar não duplica); sync; licença de voz sintética |
| §17 Fandom | Casual, ativo e núcleo com conversão e desgaste |
| §18 Economia | Centavos e índice de preços por década, cascata com distribuição e impostos, crédito, investidor, insolvência com venda de ativos |
| §19 Rivais | 22 gravadoras do Catálogo em 4 famílias + selos novos procedurais; IA por regras, só com informação pública, motivo de cada decisão registrado; falências e fusões |
| §20 Eventos | ~50 eventos em 15 categorias com pré-condições, cooldown, tags de conteúdo e opções; perfis Maestro/Brisa/Acaso; "machuca, mas não mata"; regra RS do Catálogo |
| §21 Sede | Garagem, Estúdio pequeno, Loft, Complexo (vagas, equipe, sessões, equipamento), carga de gestão e terceirização; 12 funções de equipe; sede isométrica com uma unidade por banda |
| §22 Progressão | Metas visíveis, legado em 7 dimensões, Gramófonos de Ouro (4 categorias), Hall of Echoes, 20 finais |
| §24 Interface | 10 áreas + Diário, Mesa do mês, ficha unificada com cadeia de inspeção, autópsia, paleta de comandos, informação tipada (exato × intervalo) |
| §25 Arte, áudio, acessibilidade | Logos e capas gerados por parâmetros (fora do save); prévias instrumentais procedurais por gênero e era, só por clique; texto 90–130 %, alto contraste, movimento reduzido, teclado, tema claro/escuro; PT-BR e EN |
| §26 Arquitetura | TypeScript, Canvas 2D, simulação separada da renderização, saves em IndexedDB com gzip, exportação/importação JSON, migrações; simulador headless |
| §27 QA | Testes de determinismo, extrato × caixa, recoupment, cancelar não cobra, chave duplicada, filtros de conteúdo, regra RS, finais |


## Expansão GDD v11 (esta versão)

| Sistema | O que mudou |
|---|---|
| Tempo | Avanço por **semana** (mês agregado) ou mês/trimestre; turnês, sessões de estúdio e crises rodam **dia a dia** |
| Agenda | **100% de capacidade por pessoa** por mês, compartilhada entre banda e carreira solo; reservas até 12 meses sem custo; conflitos explicados; deslocamento entre cidades |
| Economia | Centavos; **royalties pagos a cada autor** (créditos que somam 100%); inventário de **ativos com depreciação**; **credores** que retomam bens |
| Mapa | Contornos de 177 países (Natural Earth), **fronteiras históricas** por ano, blocos da Guerra Fria, **vistos**, transporte por era (navio, hélice, jato) e **clima** |
| Narrativa | **Diretor de Histórias** cria arcos a partir do save (rivalidade, volta por cima, ascensão, guerra entre selos, traição, cena) e traz **memórias de volta** |
| Subselos | Empresas com caixa, extrato, credores, **conselho com votos**, dividendos e **falência própria** |
| Descoberta | Olheiros com região, viés e salário; concursos e showcases por era; mercado de demos; **leilão** contra rivais |
| Criação | Sessão com **decisão por take**; produtores com **assinatura sonora**; camps; samples/interpolações com liberação; covers, remixes, versões em outro idioma e tributos |
| Lançamento | **Rollout**: teaser → pré-save → singles → clipe → álbum → deluxe; edição limitada; reedição de aniversário; devoluções do varejo |
| Mídia | Críticos com viés, TV, capas, assessoria, **crises com prazo**, cancelamento e **censura por país e era** |
| Shows | Planejador sobre o mapa: setlist, produção, headline/co/abertura, equipe, pagamento, bilheteria e merch por cidade, acidentes |
| Marcas | Merch, licenciamento, patrocínio exclusivo e sync (cinema, TV/novela, jogos, comerciais) |
| Negócios | Compra de selos **com passivos**, joint venture, fábrica, editora própria, leilão e **securitização** de catálogo, **bolsa (IPO)**, processos (plágio, sample, auditoria) |
| Contratos | Territórios, cessão parcial, cross-collateral, buyout, opções, multa de saída, renegociação em crise |
| Era sintética | **Hologramas** de artistas falecidos, lançamentos **póstumos** e faixas com **voz IA** — exigem negociar direitos com o espólio (ou arriscar o uso sem consentimento) |
| Pessoas | 6 traços de personalidade, objetivos, **famílias com agenda própria**, facções e líder, votação da banda, reunião negociada, mentoria, **dinastias**, carreira solo, documentários, Hall dos Ecos, envelhecimento e morte |
| Cultura | **Movimentos** que geram subgêneros nomeados, clubes por cena (compráveis), moda por era, geopolítica (guerras, ditaduras, embargos, pandemia) |
| Rivais | Arquétipos com CEO, rivalidades longas, aliciamento, espionagem e contraespionagem, relatório mensal "o que os rivais fizeram" |
| Paradas e público | Paradas por gênero e região, recordes, certificações; superfãs, haters, toxicidade e rituais de fandom |
| Conteúdo | 155 cidades, subgêneros por era (1920–59 e 2030–40 detalhados), ~120 eventos novos, plataformas, críticos, produtores, marcas e prêmios fictícios **com o equivalente real ao lado** |
| Interface | **Sede em pixel art isométrica** por era e nível, pessoas andando conforme a atividade real, avatares combináveis com editor, ícones em pixel art, retratos; novas áreas Central, Mundo e Negócios; tutorial; modos para daltonismo; leitor de tela; comparador de carreiras |

## Rodada 8: festivais, premiações, críticos, herdeiros, direitos e identidade

- **Correções:** instrumento em branco; o caixa do início personalizado é o valor exato digitado e os atos contratados entram em qualquer papel; nomes reais ligados por padrão (Elvis, Beatles…); sem desafio da semana e editor de universo; agenda e gêneros em ordem alfabética; compor cabe 3–4× por mês; paradas já preenchidas no início (`warmup8.ts`).
- **Ficha do disco** (`relinfo.ts`): faixas com duração (até de discos anteriores à run), nota da crítica, gênero, formatos, compositores, produção e a leitura **"Por que deu nisso?"** (`explain8.ts`: 3 fatores a favor, 2 contra, resultado × previsão, uma oportunidade).
- **Capas** (`covers.ts`): três propostas por lançamento, com custo e efeito (retrato, conceitual, provocativa com risco de censura…).
- **Festivais, premiações e críticos com página** (`fests8.ts`, `ceremonies8.ts`, `critics8.ts`, `criticrel.ts`): line-up por ano, negociação na hora e convites; indicados em outubro, campanhas e convite para tocar; críticos regionais com gosto e relação com o selo.
- **Peso mundial dos países** (`relevance.ts`, `relevance8.ts`): artista local domina em casa; fora, viaja conforme o peso cultural do país em cada época.
- **Você e mapa** (`goods8.ts`, `mapx8.ts`): bens, investimentos com crises históricas, equipe pessoal, fundação, agenda pessoal; ficha de cidade e país com ações.
- **Herdeiros, compra de selos, relações e feats** (`heirs8.ts`, `stakes8.ts`, `social8.ts`, `feats8.ts`).
- **Projeto musical** (`project8.ts`), **retrospectiva do catálogo** (`retro8.ts`).
- **Identidade e memória dos artistas, histórias com continuidade, rivais reconhecíveis e público por tipo** (`identity8.ts`, `stories8.ts`, `rivals8.ts`, `audience8.ts`).
- **Sede como interface, estratégia por era, "Até…" e delegação** (`hq8.ts`, `eras8.ts`, `pacing8.ts`).
- **Documento de oportunidades:** identidade mecânica do selo e liderança (`identity.ts`), direção sonora por faixa com o momento de vida de quem compõe (`sound.ts`), direitos como economia e dossiê de A&R (`rights.ts`, `rights8.ts`, `dossier8.ts`), equipe com química, roteiro de turnê e IA com consentimento (`crew8.ts`, `route8.ts`, `consent8.ts`).

## Rodada 7: mundo real, ciclo de vida, paradas por país e vida intensa

- **~740 artistas reais** (EUA/Canadá, Reino Unido/Irlanda, Itália, resto da Europa, Brasil e mundo) surgem perto do ano real de estreia, com integrantes (entradas e saídas), discografia anterior à run, fim de carreira e voltas. No modo ficcional entram como arquétipos com nomes gerados. Opção de mortes nos anos reais (modo histórico). Dados em `src/data/realacts_*.ts`, carregador em `src/sim/sys/realworld.ts`.
- **Ciclo de vida para todos** (`lifecycle7.ts`): envelhecer, morrer, aposentar, sair da aposentadoria, reunião, carreira solo, supergrupo, virar produtor; bandas decidem seguir com substituto, seguir menores, pausar ou acabar; o catálogo de quem parou vende para sempre; NPCs têm vícios e reabilitação; selos rivais pegam empréstimos.
- **Paradas por país, região e formato** (`charts7.ts`, `data/countries.ts`): 34 países com população, poder de compra e gosto por época; top músicas, álbuns, streaming, vendas e clipes; prêmios nacionais (Grammy, BRIT, Prêmio da Música Brasileira…). Aba **Países** em Mundo.
- **Início personalizado**: ano exato, caixa, patrimônio, sede, estúdio/mobília, solo ou banda (1–6), estágio da carreira com discografia, atos contratados, equipe, mercados e reputação.
- **Instrumentos** (`instruments.ts`): até 5 por pessoa, facilidade por família, aulas sozinho ou com professor; instrumentos típicos do gênero dão bônus.
- **Sede que começa vazia** (`furnish.ts`): mobília e instrumentos comprados aparecem no desenho e têm efeito.
- **Vida intensa** (`vices.ts`): cigarro, bebida, drogas (dependência, polícia, escândalo, reabilitação), viagens, empréstimos pessoais (banco, família, agiota) e da empresa (banco, fomento, dívida conversível, agiota); traços conquistados (Dependente, Sóbrio, Fumante, Viajado, Endividado).
- **Venda de composições** (`songsale.ts`) com valor, royalties e parte do selo negociados na hora; **ofertas de contrato com resposta imediata** (o artista pode pedir tempo para pensar).
- **Agenda em calendário** (`agenda7.ts`): 4 semanas, combinações entre ações, semana cheia, sinergia com a semana do lançamento, modelos prontos e salvos.
- **Menu agrupado** em 6 grupos (Início, Selo, Artistas, Música, Mundo, Você); a reprodução de áudio saiu e os atributos das composições ficaram explícitos.

## Rodada 6: personagem com personalidade, capital, gestão, intriga e nomes reais

- **Scouting e pipeline consertados:** 3 ações por mês no mínimo (mais A&R, olheiros, sede e bônus), custos menores, filtros e ordenação. O pipeline agora é interativo (setas entre colunas, aprofundar, oferta, contraproposta, descartar), e as colunas Oferta e Negociação seguem as ofertas reais.
- **Todos os artistas (tecla A):** lista de todos os atos e pessoas do mundo, com busca (inclusive por integrante), filtros e ordenação, além de botões para abrir a página, seguir no radar ou fazer oferta.
- **Perks** (`src/sim/perks.ts`): um registro único de bônus que mexem na simulação. Origem, traços, estilo de vida, cartas, mutators, sócios, departamentos e decisões entram nele. O quadro "Seus bônus" mostra tudo.
- **Personagem:**
  - Ficha de criação com nome, apelido, pronome, idade, cidade natal, gênero do coração, visual, lema, 3 traços (opostos se excluem), estilo de vida e pontos livres, com prévia dos atributos resultantes.
  - 11 origens com efeitos reais. As 5 novas são Cria da periferia, Maestro, Crítico, Engenheiro e Ex-produtor de turnê.
  - 20 traços. O ouvido absoluto é hereditário.
- **Estilos de vida (Crusader Kings):** Mentor, Magnata, Fazedor de hits, Garimpeiro, Showman e Intrigante. Cada um tem uma árvore de 6 perks liberada com XP mensal. Também há válvulas de escape quando o estresse estoura.
- **Temperamento × gênero:** traços como Rebelde, Cria da rua, Espiritual, Festeiro, Romântico, Intelectual, Raiz, Sonhador e Virtuoso puxam o artista para certos gêneros. Combinar melhora composição e gravação; contrariar derruba a moral.
- **Cartas e mutators:** 12 cartas novas, com metas próprias, e 14 mutators novos.
- **Capital e sócios** (Negócios → Capital e sócios):
  - Aporte, empréstimo e retirada entre o seu bolso e a empresa, com consequências. Também há o cartão corporativo, com risco de auditoria.
  - 8 tipos de investidor, cada um com gostos, metas, cláusulas e opinião com modificadores que decaem.
  - Recompra de participação, dividendos e IPO com escolha de fatia, banco e roadshow.
  - Confiança do conselho: quem tem menos de 50% das ações pode ser demitido.
- **Gestão na Sede:** ampliar a matriz, comprar o prédio, 8 departamentos com 3 níveis, abrir filiais em qualquer cidade, definir foco e diretor regional delas e abrir mercados.
- **Intriga (Mercado → Intriga e segredos):**
  - Segredos de artistas e de rivais, que viram ganchos fracos ou fortes.
  - Tramas com agentes: investigar, aproximar-se, roubar artista, sabotar e difamar.
  - Decisões grandes, como escola de música, estúdio lendário, premiação própria, turnê beneficente, retiro criativo, gala, manifesto e pacto de não agressão.
- **Nomes reais (opcional, no novo jogo):** os 100 atos históricos (com integrantes conhecidos), as gravadoras, os festivais, a mídia, as plataformas, as paradas e os prêmios aparecem com os nomes reais.

## Rodada 5: pessoas de verdade, você no jogo, críticas e entrevistas

| O quê | Como ficou |
|---|---|
| Mini-jogos de composição | Retirados (acordes, melodia, letra, arranjo, take, mixagem, masterização, sequenciador, garimpo, audição às cegas, jam). Ficaram o ▶ para ouvir cada música, a rádio do jogo e a aba **Estúdio** em Criação (foco por etapa e equipamentos lendários) |
| Atributos detalhados (`src/sim/sys/talent/`) | Técnica por função (vocal: afinação, extensão, timbre, fôlego, interpretação; guitarra: técnica, base, solos, timbre, leitura; bateria: tempo, groove, potência, dinâmica, rudimentos; baixo, teclas, sopros, cordas, DJ, produção, MC, voz sintética), criação (melodia, harmonia, letra, arranjo, criatividade, versatilidade), palco e mídia, mental e físico; nota geral, forma, instrumentos secundários, valor de mercado; aulas de 3 meses; evolução por shows/gravações/idade. Entram na composição, na performance da gravação, na receita dos shows e nas entrevistas |
| Páginas | Página do artista com abas (visão geral, integrantes em cartas, discografia com crítica, músicas, carreira, contrato) e carta completa de cada integrante (atributos por grupo, perfil e personalidade, humor e saúde, relações, carreira, treino). Atos alheios aparecem em faixas conforme o conhecimento |
| Você (`src/sim/sys/life.ts`, tecla V) | Criação do personagem no novo jogo (nome, idade, origem, instrumento, aparência). O dono vira uma pessoa do mundo com tempo livre por mês: conhecer gente, namorar, programas a dois, pedido, casamento (3 tamanhos), divórcio, filhos e adoção, educação dos filhos e estreia deles pelo selo; praticar, aprender instrumentos, compor, tocar em bares, carreira solo, formar/entrar/sair de banda; mentoria dos artistas do selo (conversa, estúdio, ensaio); academia, terapia, festas da indústria, hobbies, filantropia, memórias; patrimônio e sucessão |
| Críticas (`src/sim/reviews.ts`) | Nota por aspecto (melodias, letras, interpretação, produção, originalidade, coesão) pesada pelo gosto de cada crítico; texto com contexto da carreira, pontos fortes e fracos, melhor e pior faixa, comparação com o rival do ano e veredito; nota dos fãs. O save guarda números e semente; o texto é montado na hora |
| Entrevistas | Cada pergunta tem quatro respostas escritas para ela (uma por tom), reação da plateia e transcrição no fim; a desenvoltura na mídia de quem fala pesa |
| Jogabilidade | "Próximos passos" na Mesa (caixa, músicas paradas, contratos no fim, moral, cansaço, caixa de entrada, sua vida); avisos repetidos agrupados; eventos pessoais aleatórios não escolhem o seu personagem; fama pessoal ajuda um pouco a divulgação; tocar numa banda ocupa tempo e cansa o dono |

## Rodada 4: tudo do documento de pesquisa (`docs/ideias-pesquisa.html`)

A base de extensão (`src/sim/ext4.ts`, `src/ui/registry.ts`) deixa cada sistema guardar estado próprio, entrar no tick por ganchos, mexer no apelo/demanda/custos por modificadores (que aparecem na autópsia) e registrar abas, áreas, seções e cenas.

| Sistema | O que entrou |
|---|---|
| Música | Cada música soa diferente (áudio procedural com filtro de época: gramofone, AM, FM, digital); mini-jogos de acordes, melodia, letra, arranjo, take no tempo, mixagem, masterização (guerra do volume), sequenciador de 16 passos, garimpo de samples, audição às cegas e jam da banda; foco por etapa; pistas por era e equipamentos lendários; rádio do jogo nas Paradas |
| Criação | Tema da letra × gênero com tendências e caderno de combinações; receita sonora (ingredientes → efeitos que cada mercado procura); críticas reveladas em cena; participações e duetos; compositores contratados e fantasmas; encomendas (jingles, trilhas, novela, jogos, hinos); domínio público e standards; remasterização; capa (editor), videoclipe e trecho viral; divisões (clássica, gospel, infantil, trilhas, musicais, jogos) com prêmios |
| Pessoas | Humor como pilha de pensamentos, colapsos, saúde (voz, audição, lesões, dependência, clínica), conversas e promessas, relações e panelinhas, segredos e dossiês, o dono do selo como personagem (casa, família, patrimônio, sucessão), carreira da equipe, romances, fortuna dos artistas, caixa de entrada por era (carta → mensagem), redes sociais simuladas, mesa de negociação |
| Indústria | Matéria-prima com choques históricos, fábricas próprias e fila de prensagem, lojas com planta editável, distribuidores e equipe de rua, preço com elasticidade, jukebox, clube do disco, streaming próprio, mídia própria, promotora, ticketeira, instrumentos, árvore de pesquisa, conselho de investidores (pode demitir), fusões com antitruste, câmbio e hiperinflação, sede editável com itens e combos de salas |
| Mundo e leis | Marcos da história da música como regras datadas (greve de 1942, guerra das velocidades, jabá de 1959, MIDEM, MTV, CD, Parental Advisory, SoundScan, Napster…), jabá e curadores, metodologia das paradas por era, manipulação, mais paradas, feiras, fã-clubes, sindicatos, sociedades de direitos, leis votadas, pirataria, mercados com regras próprias, cenas históricas com arcos |
| Shows e modos | Construtor de festival com público e pensamentos, notas do show (empolgação, intensidade, cansaço), curva do setlist, show ao vivo jogável, casa de shows própria, ingressos/cambistas/meia, residência, megaeventos, cenários históricos com medalhas, desafio da semana, editor de universo, conquistas e museu |
| Cenas em pixel art | 36 locais por era (premiação, TV, auditório, rádio, casas de show, fábrica, loja, camarim, ônibus, aeroporto, hotel, tribunal, conselho, pregão, clube, set de clipe, clínica, velório, mansão, rua, feira, palco holográfico) com escolhas: discurso na premiação, entrevista com tempo, visita à rádio, audiência no tribunal, assembleia, vinhetas de turnê; galeria Lugares; interface com o visual da época |
| Melhorias | Simulação ~2× mais rápida, equilíbrio do começo de jogo, save e diário em texto (copiar/colar), clubes como camada do mapa, layout de celular com navegação inferior |

Ainda não: simulação em Web Worker (preferi otimizar os laços), tutorial convertido em cenário guiado (os cenários existem; o tutorial de 8 passos continua) e explicação por passar o mouse em todos os números (a autópsia e as fichas explicam os principais).

## Rodada 3: profundidade (repertório, sedes, mapa)

| Sistema | O que mudou |
|---|---|
| Repertório | Nova aba **Criação → Repertório**: todas as composições do ato com status (escrita, gravada inédita, programada, lançada, cofre, descartada), barras de qualidade, autores e participações, **em quais discos cada música entrou** (single, EP, LP, coletânea, ao vivo, demo) e versões derivadas. Filtros ("nunca usadas em disco") e ordenação |
| O que fazer com uma música | Revisar a composição (refrão, letra ou arranjo; até 4 vezes, custo e estresse crescentes), mandar para o estúdio, lançar como **demo** ou single, montar **coletânea** com faixas já lançadas, **disco ao vivo** depois de uma turnê, guardar no cofre, descartar/recuperar, **oferecer a outro artista** (taxa + 8 % de edição) e **oferecer para sync** |
| Perfil comercial | Cada faixa tem gancho, acessibilidade e durabilidade; o gancho entra no apelo dos singles (e aparece na autópsia) |
| Caderno de ideias | Turnês, família, perdas, movimentos e política viram temas anotados; a ideia mais forte vira o tema da próxima composição e melhora melodia, letra e originalidade |
| Sedes | Escada **Garagem → Estúdio pequeno → Loft → Complexo → Torre multinacional (anos 70+) → Campus futurista (era dos hologramas)**, com requisitos de era, tecnologia e reputação; plantas isométricas novas para Torre e Campus |
| Filiais | A partir do Loft, abra **filiais em outras cidades** pelo mapa: somam carreiras, equipe e sessões, abrem o mercado local, aumentam público e garimpo na região; podem ser ampliadas (escritório → estúdio → sede regional); cada artista pode ser designado a uma sede; a vista da sede alterna entre matriz e filiais |
| Mapa | **Camadas ligáveis**: seus fãs (bolhas), cenas, suas sedes e filiais, selos rivais, festivais, turnês em andamento (rotas), movimentos, crises e censura (sombreamento por mercado). Ficha de **cidade** (fãs por artista, cenas, festivais, rivais, clubes, clima, contexto político, abrir filial) e de **país** |
| Geopolítica | Mostra só **quando começou e os efeitos** (consumo, shows suspensos, fabricação, temas visados, risco de veto) — nunca quando termina |

### Decisões pendentes do GDD §30 — o que foi adotado

Usei as recomendações do próprio GDD: sem "porte inicial" (cenário + sede); Gravadora e Híbrido começam no
Estúdio pequeno; logos e capas procedurais; 4 slots de agenda; os três narradores; capital do Do zero menor
que o do Artista; 3 papéis primeiro; recarga livre com compromisso opcional; filtros de conteúdo oferecidos,
tudo ligado por padrão; dólar fictício único; pool de streaming pró-rata; PT-BR e EN; sem nuvem.
Conteúdo sexual explícito **não** foi incluído (dúvida 8 do GDD ainda em aberto).

### Ainda não está (próximas fases do roadmap)

- Papéis Empresário, Editora musical e Estúdio/produtor (fase 4/5) e modelos de contrato correspondentes.
- Tick em Web Worker, editor de universo, placar por seed, telemetria opt-in, pacote offline.
- Mercados com moedas próprias; mais eventos (há ~170).
- Calibração fina: o simulador headless já mede falência e unicidade (sobreposição de top 100 entre
  seeds fica entre 6 % e 23 %), mas os números `[HIP]` do GDD ainda precisam de playtest.

## Estrutura

```
src/core      RNG determinístico (sfc32) e dinheiro em centavos com índice de preços
src/data      Catálogo do Universo, mundo (mercados, cidades, gêneros), pessoas e regras
src/sim       Simulação: worldgen, scouting, contratos, produção, mercado, palco, rivais,
              eventos/diretor, economia, legado, agenda, ciclo de vida, tick e bot headless
src/ui        Interface: app, painéis, ficha, sede isométrica, arte e áudio procedurais
src/i18n      Textos da interface (PT-BR/EN)
tools         Simulador sem interface
tests         Invariáveis do GDD §27
```

Por padrão o universo é ficcional. O modo opcional "Nomes reais" (rodada 6, para uso pessoal) troca atos históricos, selos, festivais, mídia e prêmios pelos nomes reais (`src/data/realnames.ts`).

## Rodada 9: mundo vivo, empreendimentos e Masters

- **Início da partida:** papel Gravadora ou Híbrido (padrão), assumir um selo existente, ~40 anos de início, sexo do personagem com aparência filtrada, 17 trajetórias, efeitos dos traços visíveis, árvore de habilidades (6 ramos) que gera um de 10 estilos de vida.
- **Empreendimentos** (do selo ou pessoais): festival próprio, editora, estúdio, agência, mídia/conglomerado, streaming (2005+); **Gestão de artistas** de qualquer selo.
- **Prestígio de todos os selos:** reconhecimento, popularidade, momento, crédito com a crítica, confiança dos artistas.
- **Sucessão:** a carreira só continua passando o selo a outra pessoa, que você passa a controlar.
- **Lendas:** crônica do mundo, biografias, genealogia de bandas, influências, livro da partida; personalidade (facetas e valores), sonhos, estresse, surto criativo, relíquias, boatos, jornal, pré-história e mundo persistente.
- **Relações e movimentos:** duplas de composição, casais, supergrupos, alianças, cruzamentos de gênero, padrinhos; movimentos com núcleo, manifesto, convite, pedido, criação e fim.
- **Identidades:** 18 perfis de selo, 13 estratégias de rivais, 9 eixos sonoros, 15 timbres, 40 momentos de vida, subgêneros gerados.
- **Você:** dilemas com escolhas reais, 5 unidades de tempo por mês, novidades de época que precisam ser desbloqueadas.
- **Hall da Fama do Rock** (1983/1986), **15 eras**, nada do futuro nas telas e novidades do ano nas notícias.
- **Menus:** grupos Mundo (Mapa, Paradas, Gravadoras, Relações e movimentos, Lendas) e Prêmios e eventos (Festivais, Premiações, Hall da Fama, Críticos).
- **Saves:** baixar, copiar e colar; o importador aceita arquivo ou texto.

## Rodada 10: vida pessoal, gravadoras, bolsa e menus

- **Vida pessoal:** 50 eventos aleatórios em pop-up (2–4 respostas, custos visíveis, desdobramentos meses depois), no lugar dos dilemas.
- **Política e religião** para todas as pessoas: afinidade, atrito, censura e reação a capas e letras.
- **Gravadoras:** 45 novas (com nome real em "Nomes reais"), escolha de quantas e quais, modo "do zero — todos iguais", 21 estratégias reconhecíveis e líderes com perfil, carreira, sucessão e troca de estratégia.
- **Vocalista:** sem alguém que cante, só instrumental (salvo feat ou cantor de estúdio); a banda do jogador começa com vocalista.
- **Pessoas reais únicas** entre bandas e carreira solo; opiniões variadas por personalidade e gosto; integrantes clicáveis com características principais.
- **Investimentos:** bolsa com ações de gravadoras, streaming, vídeo, mídia e fabricantes que reagem ao mundo do jogo; aluguel só de imóvel próprio.
- **Menus:** Música → Compor, Estúdio, Lançamentos; Selo → Finanças separada de Negócios; Você → Você, Vida pessoal, Patrimônio e investimentos.

## Rodada 11: início em abas, bolsa ligada, lendas, mercado e empresário

- **Nova run em abas** (Personagem, Gravadora e papel, Mundo e ano, Rivais, Regras, Resumo) com resumo fixo e Começar sempre à mão; dá para assumir **qualquer** gravadora existente no ano de início.
- **Bolsa** começa cheia, com histórico; você e a gravadora investem no mesmo mercado. Gravadoras só aparecem depois do IPO; fundos, rivais e artistas compram e vendem, há maiores acionistas e ameaça de tomada do seu selo.
- **Lendas** refeita: Panteão, abas e popups para fatos, lendas, recordes e relíquias (oferta ao dono, lance fechado, compra direta, empréstimo a museu, exposição, doação, investigador).
- **Opiniões** sem autorreferência (inclui bandas antigas e carreira solo) e sem repetição; frases variam com personalidade, política e relação.
- **Mercado**: busca que não perde o foco, filtros, missões de olheiro com região/gênero/duração e névoa de potencial, lista de observados e comparação.
- **Empresário**: comissão renegociável, metas de carreira, turnês, campanhas de imagem, oferecer clientes a gravadoras, conflito de interesse, empresários rivais e relatórios mensais.
- **+116 eventos aleatórios** (artistas, gravadora, indústria por época e vida pessoal), todos com condições de época e intervalo mínimo.

## Rodada 12: projeto musical no centro e carreiras independentes

- **Projeto musical** (Música → Projeto musical): intenção, compromissos (orçamento, direção, prazo, público), linha do tempo, problemas com consequências (atraso, orçamento, conflito) e próximo passo. Sem receita fixa por gênero no estúdio.
- **Propostas em pacote** (dinheiro, autonomia, direitos, compromissos) comparadas com rivais; **previsões e "Por que deu nisso?"** em contratação, renovação, turnê e festival.
- **Sede viva** (quem grava, quem negocia, prêmios reais, equipe sobrecarregada) e **rivais que respondem** (leilões, janela de lançamento, produtor, mercado, catálogo, festival; distribuição com rivais).
- **Cenas como redes** (casa, produtor, veículo, público; autenticidade × exploração) e **eras que exigem reorganização** (estrutura em 7 departamentos).
- **Arcos de artistas** com memória nas negociações, **vida pessoal ligada à carreira** (herdeiro, romance, venda de masters), rotinas e **história do selo**.
- **Carreiras**: escolha de atividade(s), origem e ambição; mudar de carreira no meio da partida; mercado de serviços de empresas do jogo. Empresário (confiança, plano, mandato, equipe), festival unificado e casa de shows, agente/promotor, estúdio/produtor, editora, mídia e plataforma.

## Hype e equilíbrio de começos tardios

- **Hype** (0–100, com tendência e motivos) para artistas, discos, relíquias, festivais, turnês, selos e cenas: vira vendas de estreia, ingressos e preços de leilão; hype maior que a qualidade gera rejeição, discos ótimos sem alarde viram sucessos lentos. Alavancas por época (teaser, vazamento, briga encenada, audição exclusiva, embargo) e ranking de hype nas paradas.
- **Equilíbrio**: pirataria pesa mais na era P2P; download e streaming rendem menos por unidade; selo novo na era digital tem alcance reduzido até se firmar; a qualidade técnica do jogador conta menos a partir dos anos 90 (ferramentas baratas para todos); teto de fatia semanal por lançamento e retornos decrescentes quando o selo passa de ~3% do mercado (menos na era do streaming).

## Rodada 13
- Telas e menus seguem as carreiras escolhidas; painel por carreira na sede; mapa do promotor e fundação de agência/estúdio corrigidos.
- Novo jogo: trajetória/origem/ambição em lista, sem lema, traços em cartões agrupados, eras com nomes únicos, 5 narradores novos, ajuda (?) em cada seção, carreira+gravadora+papel numa aba só, 6 origens e 5 ambições novas.
- Atributos iguais para todos (inclusive o jogador): ouvido, negociação, política, traços, proficiência por cargo; visual, sexo e cor pesam conforme época e país (barreiras históricas que dá para enfrentar); ações mudam relações com motivo.
- O artista do jogador é o próprio personagem (sem opiniões geradas sobre você).
- Árvore de habilidades com 8 ramos; pontos por prêmios, nº 1, hits, certificados e turnês lotadas.
- Matéria-prima com preço próprio por material e crise, escolha de fornecedor por grau; projeto com mistura de conceitos, local, estratégia de singles, edições, direção de capa, orçamento e prévia com motivos.
- Mapa com camadas e legendas, painel por país com ações; ficha completa de gravadora; página de artista com abas (marcos, contratos, relíquias, vida pessoal).
- Despesas crescem com o porte e a era (estrutura, jurídico, compliance, equipes de dados/vídeo, promoção mínima).
