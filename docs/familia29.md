# R29 — Família: vida familiar para todo personagem e estrelas mirins

Pedido do autor: *"Coloque um agente nisso e conecte com todo o resto."* — vida familiar para **todo** personagem (não só
os seus atos) e estrelas mirins.

Arquivos:
- motor: `src/sim/sys/family29.ts` (registrado no fim de `src/sim/sys/index.ts`, antes do `facades19`);
- interface: `src/ui/sys/family29.ts` + `family29.css` (seção Família e árvore da ficha, filhos da indústria na página
  única, cabeçalho "Menor · responsável", busca Ctrl+K), `src/ui/sys/directory.ts` (filtro **Família**),
  `src/ui/sys/people16.ts` (aba Família e estado civil), `src/ui/sys/personact18.ts` ("Ver família" abre a aba);
- ganchos pequenos (aditivos): `sys/kin15.ts` (`debutKid15` — estreia de filho num caminho só; `KIN15X`; `parentId`
  vira laço do grafo), `capacity.ts` (`PERSON_LOAD29` — carga extra por pessoa), `sys/post18.ts` (`EST_HEIRS29` —
  herdeiros fora do mundo no espólio), `sys/world18.ts` (`addProd18` — produtor de carreira nova), `sys/people16.ts`
  (modo exato: nada de namoro/filho inventado para gente real da indústria), `sys/realworld.ts` (`AGE29` = 12),
  `caps18.ts` (`family29` na família **image** do APPEAL_CAT19);
- também: `src/sim/events.ts` (solo que sai do próprio ato encerra o ato), `src/ui/pixel/age17.ts` (antes dos 17: sem
  barba/tatuagem, corpo de criança), `src/ui/sys/kin15.ts` (estado civil conta o cônjuge do grafo e o family29);
- testes: `tests/r29-family.test.ts`; golden re-medidos em `tests/r27-p2a`, `r27-p2b` (r27-m2 compara execuções entre
  si); medição `scripts/measure29familia.ts`; capturas `docs/shots29familia/` (`scripts/shots29familia.mjs`).

## O modelo

### 1. Artistas NPC (todos, não só os seus)

Rodízio com teto, como o `CAP16` do people16: **CAP29 = 60 pessoas por mês** entre os integrantes vivos de atos NPC
ativos, emergentes ou em hiato (os seus seguem pela `dynasty.ts`, como antes). Quem fica *k* meses sem vez recupera a
chance acumulada (`1 − (1 − p)^k`, *k* ≤ 48), então o banco "enorme" anda no mesmo ritmo do pequeno sem custar mais
por mês.

Registro compacto por pessoa: `F29 = [nome do par, id do par (se for pessoa do mundo), ano do casamento, estado, casa]`
(estado 0 solteiro · 1 namorando · 2 casado · 3 separado/viúvo; casa = dinheiro da família em dólares reais).

| Evento | Chance por mês (antes do acúmulo) | Efeitos |
|---|---|---|
| Começa a namorar | 1,1% (18–68 anos) | 5% + fama/400 de ser **outra pessoa do mundo** (casal célebre: mesma banda, cidade e gênero pesam) |
| Casa | 0,7% | fato `marriage`; casal célebre ganha laço `spouse` no kin15, +1 de fama e 1% do público do outro |
| Filho (casado) | 0,95% × natalidade da época | 21–45 anos, até 4; natalidade: 0,95 (–1945), **1,35** (baby boom 1946–64), 1,05, 0,85, 0,72 (2000+) |
| Filho (namorando) | 0,18% × natalidade | idem |
| Separação | 0,35% + vício 0,8% + estresse>70 0,4% + turnê 0,2% + casal célebre 0,15% | divórcio: estresse +18, moral −12, bens divididos (casa ×0,55); `breakup` com `divorce` |
| Caso extraconjugal | 0,25% × (1 + fama/60) (casado, fama ≥ 25) | fato `affair`; boato chega à sua assessoria = segredo guardado (Submundo) |

- **Divórcio dentro da mesma banda**: vira rixa no kin15 (`feud`), que o **lineup16 lê como pressão de saída**
  (`pressure16` → "feud", 1,5); metade das vezes a banda racha na hora (`departNpc16`). Banda sua: aviso, você decide.
- **Guarda dos filhos**: divórcio com filhos menores e fama somada ≥ 30 → fato `custody` (manchete, estresse,
  advogados comem 20% da casa) e cena para o seu elenco.
- **Casal célebre** (uma vez por ano): 22% de **dueto** (o anfitrião NPC credita o par numa faixa ainda não lançada —
  `attachNpcFeat29`, o mesmo feat de pessoa do mundo) e 15% de **turnê do casal** (+6 de embalo nos dois atos, 2% do
  público de um vai para o outro, fato `couple_tour`).
- **Herança**: quem morre deixa a casa para o cônjuge (pessoa), os filhos que viraram pessoa ou o ato (espólio); no
  post18, filhos leves adultos e o cônjuge de fora entram como herdeiros (`EST_HEIRS29`) — brigas de espólio, relíquias
  "com os herdeiros" e projetos póstumos passam a ter nomes da família.
- **Luto**: casal célebre está no grafo do kin15, então a morte de um derruba a moral do outro (o luto de sempre).

### 2. Filhos: registro leve até virar pessoa (um caminho só com o kin15)

`Kid29 = [id, pai/mãe, outro pai/mãe, nome, nascimento, musicalidade, pessoa, ano da estreia]` — tupla de ~60 bytes.
A musicalidade sai do potencial dos pais (+ acaso). Quem tem ≥ 55 segue música com 55% + (mus − 55)/90 + fama/400 e
estreia entre 17 e 24 anos — ou **cedo (12–16)** quando é prodígio (≥ 72) e a época tem crianças no palco.

O kin15 deixou de fazer nascer filhos (com o family29 na partida — pelo estado, não pela ordem dos imports); a estreia
dos dois passa por `debutKid15`: fama e fãs herdados do ato do pai/mãe, laço `child` com **os dois** pais, "o
sobrenome abre portas, mas a comparação pesa", e às vezes (20%) o filho **entra na banda do pai/mãe** (banda de
família). Contatos herdados: as 6 melhores relações do pai/mãe passam pela metade.

**O mundo começa com famílias**: no 1º mês, artistas NPC gerados com 34+ anos já têm casamento (42%) e 0–3 filhos
(alguns na idade de estrear); empresários da praça e líderes de selo gerados com 42+ já têm filhos crescidos (35%).
**Pessoas reais nunca ganham família antes do início.**

### 3. Filhos de gente da indústria seguem carreira

Os filhos que o people16 dá a empresários, produtores, líderes de selo, equipe e críticos (`s.families[chave].kids`),
aos 18–30 anos, escolhem (`pathFor29`, determinístico pela semente): **o ramo do pai/mãe** (peso 0,55 × aptidão),
**música** (musicalidade ≥ 55), produtor, empresário, equipe/A&R, crítico, executivo — ou outra vida (peso 1,1). Viram
**pessoas do mundo** (ficha, busca, árvore, `fam29.ip` → chave do pai/mãe):

| Caminho | O que vira no jogo | Nepotismo |
|---|---|---|
| Artista | ato solo pelo `debutKid15` (+4 a +6 de fama de sobrenome) | filho de líder de selo assina com o selo do pai/mãe ("nada a ver com o sobrenome", jura a assessoria) |
| Produtor(a) | produtor no estúdio (`x18_<id>`, como os ex-artistas do world18) | filho de produtor começa um degrau acima |
| Empresário(a) | empresário de carreira nova (`n17_<id>`, como no npc17) | herda o estilo, a família de gêneros e ~70% dos atributos do pai/mãe |
| Equipe / A&R | candidato no mercado de profissionais (com carta de recomendação) | +6 de habilidade |
| Crítico(a) | carreira de crítico (world18) | — |
| Executivo(a) | A&R num selo do mercado; filho de líder fica na fila de **herdeiro** do people16 | na sucessão, quando ninguém da família do líder herda, 30% de um "executivo da casa" filho de gente da indústria |

A opinião do pai/mãe sobre você passa (metade) ao filho; a proposta a um ato com pai/mãe no seu elenco (ou que gosta de
você) ganha "a família conhece você: porta aberta" (+0,05); sobrenome famoso de fora encarece (−0,02).

### 4. Estrelas mirins

**Menor de idade** (< 18) em ato tem registro `Minor29`: responsável (o pai/mãe do kin15; pessoa real: o pai/mãe
**documentado** — Joe Jackson para Michael — ou "a família", nunca um nome inventado), fundo, meses de sobrecarga,
origem e, às vezes, **pai/mãe-empresário(a)**.

Fontes geradas por época (por ano, no mundo todo): criança-prodígio 1920–1965 (0,35) · concurso de calouros 1930+ (0,2;
0,3 a partir de 1980) · programa infantil de TV 1950+ (0,25; 0,45 a partir de 1980) · grupo infantil/de irmãos
1960–2005 (0,55; 60% irmãos de verdade, com laço no kin15 — estilo Jackson 5 / Menudo / Musical Youth) · trainee de
idol em Seul/Tóquio 1992+ (0,6) · escola de música 1970+ (0,15). Idade 12–15 (trainee até 16), potencial alto e
crescimento rápido (+1 a +4 por ano em voz, instrumento, composição, palco e letra, até o potencial).

**Leis da época** (`LAWS29`): Lei Coogan (EUA, 1939: 15% em fundo), Children and Young Persons Act (Reino Unido, 1963),
ECA (Brasil, 1990), normas japonesas (2000), lei coreana de proteção a artistas menores (2014) e, para o resto, a
Convenção dos Direitos da Criança (ONU, 1989). Antes delas: sem fundo e sem limite.

| Proteção / risco | Como funciona |
|---|---|
| Responsável na proposta | −0,04 "o responsável exige escola, fundo e limite de turnê" (−0,02 com 16–17 anos); pai/mãe-empresário −0,03 a mais |
| Fundo (Coogan) | todo mês a parte da lei (US$ 40 + fama×8, escalado pela `trust`) dos ganhos do **próprio menor** vai para o fundo (não é custo do selo); aos 18 o fundo vai para o artista |
| Escola e limite de horas | carga extra na agenda (`PERSON_LOAD29`): escola 25 (15 sem lei) + a fração `hours` do trabalho do mês; 16–17 anos: escola 10 (5) e 30% do teto |
| Tutor na estrada | US$ 300 por mês de turnê |
| Exploração | seu menor com carga > 70 (90 sem lei) ou > 10 dias de estrada (18) por 3 meses: denúncia (60% depois de 1975): reputação com artistas −4, institucional −3, multa (com lei), escândalo de conduta, fato `child_exploit`; selo rival: −3 de reputação |
| Esgotamento | sobrecarga = +5 de estresse e +6 de cansaço por mês; estresse > 85 na denúncia = burnout |
| Pai/mãe-empresário | 5% ao ano de sumir com o fundo (escândalo de dinheiro, relação −45); 12% ao ano de briga (estresse, relação −10) |
| Maldição da estrela mirim | dos 18 aos 30: 3,5% + fama/2500 + estresse/3000 ao ano de cair no vício |

**Formação real (lineup29)**: a idade mínima para pessoa real existir no mundo caiu de 15 para **12** (Michael Jackson
com 12 num mundo de 1970). No modo exato vale o roteiro real (idade real).

### 5. Pessoas reais

- **Modo exato**: só a família documentada. Nada de namoro, casamento, filho, pai/mãe-empresário inventado — nem para
  gente real da indústria (people16 passou a respeitar).
- **Mundos alternativos, depois do início**: casamentos e filhos simulados valem como história alternativa,
  **marcados "simulado"** (ficha e filtro do diretório). Quem tem casamento/ex documentado não ganha romance simulado;
  quem tem filhos documentados não ganha filho simulado. Nunca antes do início.

## Conexões ("conecte com todo o resto")

| Sistema | Ligação |
|---|---|
| Dinheiro | casa de cada família (renda do ato − custo da casa e dos filhos), divisão de bens no divórcio, advogados na guarda, herança (cônjuge/filhos/espólio), fundo Coogan, multa por exploração, tutor na estrada |
| Contratos | menor exige responsável (motivo na proposta), pai/mãe-empresário, porta aberta da família, sobrenome famoso encarece; filho de líder assina com o selo da família |
| Fama e fãs | casal célebre: fama e público cruzado; estreia de filho com fama e fãs herdados; apelo `family29` (família **image**: sobrenome +4% nos 3 primeiros anos, comparação −3% depois); `youthSkew29` para a demografia |
| Imprensa e escândalos | fatos `marriage`/`breakup`/`birth`/`affair` (consumidores de sempre), `custody`, `child_exploit`, `child_star`, `nepo`, `family_debut` ("nepo baby": 40% de vaia quando o pai/mãe tem fama ≥ 50), `couple_tour` — manchetes do mês (press9) |
| Vida pessoal e saúde | luto (laço no kin15), estresse do divórcio, casamento/filhos seguram vício (people16), maldição da estrela mirim, esgotamento do menor |
| Ao vivo | turnê do casal; limite de horas e tutor para menores; sobrecarga de estrada vira denúncia |
| Projetos | dueto do casal (feat de pessoa); banda de família (filho na banda do pai/mãe, grupos de irmãos) |
| Prêmios e legado | dinastia no Hall dos Ecos (parente já empossado: memória importante, +5 de embalo, +2 de legado cultural se for seu); herdeiros reais no espólio (post18 → relíquias e projetos póstumos) |
| Submundo | caso extraconjugal que vira boato chega à sua assessoria como **segredo guardado** — a chantagem do crime17 ganha +25% (sem sequestro: o sistema não tem e o tom não pede) |
| Mundo e épocas | natalidade por época, leis do trabalho infantil por país e ano, fontes de estrela mirim por época (prodígio, grupos de irmãos, TV, calouros, idols) |
| Cenas (scene17) | casamento, bebê, divórcio e estreia de família no seu elenco viram cenas interativas (`wedding29`, `birth29`, `divorce29`, `debut29`) |
| Interface | aba Família com árvore em retratos (portraitCanvas, que já envelhece), cabeçalho "Menor · responsável", filtros Família no diretório, Ctrl+K acha filhos, "Ver família" / "Presente de casamento" (favor no livro) / "Mandar condolências" no menu de pessoa |

Todo tipo novo de fato tem consumidor (`onFact` no family29 — r19-infra passa) e a fonte nova de apelo está numa
família do APPEAL_CAT19.

## Números

Medido com `scripts/measure29familia.ts` (bot realista playbot16), `tests/r14-db.test.ts`, `tools/balance19.ts --quick`
e as golden. Máquina carregada (4 núcleos, carga 6–13 por causa de outros agentes): o relógio de parede engana; o custo
do sistema vem do perfil de ganchos (`__hookProf`) e do CPU.

**Por década** (semente `fam29probe`, início 1960, base média, 20 anos):

| Década | Casamentos | Filhos | Estreias de família | Divórcios | Estrelas mirins | Casais célebres | Carreiras da indústria | Exploração |
|---|---|---|---|---|---|---|---|---|
| 1960 | 161 | 75 | 0 | 13 | 20 | 21 | 4 | 0 |
| 1970 | 297 | 174 | 4 | 78 | 19 | 35 | 0 | 0 |

**40 anos** (semente `fam29long`, início 1955, base pequena):

| Década | Casamentos | Filhos | Estreias de família | Divórcios | Estrelas mirins | Casais célebres | Carreiras da indústria | Exploração |
|---|---|---|---|---|---|---|---|---|
| 1955–59 | 45 | 18 | 1 | 4 | 3 | 7 | 1 | 0 |
| 1960 | 200 | 145 | 0 | 38 | 46 | 25 | 0 | 0 |
| 1970 | 340 | 224 | 22 | 83 | 44 | 32 | 2 | 1 |
| 1980 | 381 | 202 | 66 | 138 | 58 | 40 | 4 | 3 |
| 1990–94 | 165 | 94 | 53 | 74 | 56 | 16 | 11 | 2 |

No fim (1994): 3.289 famílias, 683 filhos leves, 18 filhos da indústria com carreira, 112 ex-mirins; gancho 15,3 + 0,9
ms/mês; estado `family29` 185 KB num save de 25,7 MB (0,7%).

As estreias crescem depois de ~17 anos de partida (os filhos nascidos no jogo chegam à idade; a semeadura inicial dá
poucos porque os artistas gerados são jovens). No fim: 1.875 famílias, 263 filhos leves, 24 menores, 37 ex-mirins,
632 pessoas reais com família simulada (mundo "com variações", o padrão).

**Custo por mês** (perfil de ganchos):

| Medida | Antes | Depois |
|---|---|---|
| gancho `family29` (mês + ano), base média 1960–1979 | — | **10,4 + 0,7 ms** (CPU total do mês ~2.000–3.000 ms: ≈ 0,4%) |
| gancho `family29`, base **enorme** 2010 (1 ano) | — | **11,4 + 1,0 ms** de 3.536 ms/mês (≈ 0,3%) |
| `tests/r14-db` "enorme: simulate(1 ano)/mês" | 3.804 ms | 4.011 ms (ruído da máquina; os dois passam do limite de 1.500 ms do teste nesta máquina, também sem a família) |
| gancho `kin15` (com o laço `parentId` no grafo) | 17,1 ms | 15,1 ms |

**Save** (20 anos, base média): estado `family29` = **98 KB** (0,5% de 18,1 MB); `s.families` (indústria) 170 KB, igual
a antes (173 KB); save total 17,98 MB antes × 18,09 MB depois (os mundos divergem; a diferença é do tamanho da
variação). Filhos leves são tuplas (~60 bytes); viram pessoa só quando seguem carreira.

**Equilíbrio** (`tools/balance19.ts --quick`, 12 sementes, 3 anos, perfil equilibrado):

| | Quebra | Caixa p25 / mediana / p75 | Patrimônio |
|---|---|---|---|
| antes | 25% | 6k / 30k / 86k | 1,97 M |
| depois | 25% | −14k / 8k / 63k | 1,03 M |
| só 1975, antes | 42% | −8k / 19k / 99k | 719k |
| só 1975, depois | 50% | −9k / 11k / 47k | 45k |

As mesmas sementes quebram nos dois (b19-0, 1, 4, 9 de 1975; b19-0 de 1889; b19-3 de 2005); a diferença é uma semente
de cada lado (o mundo diverge). Uma delas expôs um erro antigo: um solo que "saía do próprio ato" pelo evento
`member_leaves` deixava o ato **ativo e vazio** (o bot o contratava e quebrava) — agora o ato encerra (`events.ts`).
Ajustes feitos pela medição: o fundo do menor sai dos ganhos **dele** (não é custo do selo); 16–17 anos têm escola de
meio período e só 30% do teto de horas; a proposta pesa −0,02 (não −0,04) para quem tem 16–17.

**Golden** (`r16pb-5`, 1975, nomes reais, 8 meses de playbot): caixa e rng iguais; acts muda (e tours no r27-p2b, pela
venda das paradas) — comentários nos testes. r27-m2 compara execuções entre si e segue passando.

## Capturas (`docs/shots29familia/`)

1. `01-ficha-familia-casal-celebre` — aba Família: bloco do kin15 e a seção R29 (casado desde, "casal célebre", filhos).
2. `02-arvore-da-familia` — árvore em retratos (a pessoa, o cônjuge, os filhos; envelhecem pelo age17).
3. `03-filho-que-estreou` — o filho que estreou com herança (laço com os dois pais).
4. `04-estrela-mirim-responsavel-fundo` — grupo de irmãos mirim: responsável, lei da época, fundo, escola.
5. `05-empresario-filhos-e-carreiras` — página única de um empresário: filhos e o que viraram (produtor, empresário).
6. `06-diretorio-filtro-familia` — Todos os artistas › Pessoas com "Família: Casais célebres" (♥, menor, filho de famoso).
7. `07-clique-direito-ver-familia` — menu de pessoa com "Ver família" (e presente de casamento / condolências quando cabe).
8. `08-ctrl-k-acha-filho` — a busca acha um filho que ainda é bebê ("filho(a) de … · 0 anos").
9. `09-arvore-celular-390` — a árvore no celular.

## Testes

`tests/r29-family.test.ts` (9 casos): filho da indústria → empresário, artista e produtor (e o caminho segue o ramo);
casal célebre com filho que estreia com herança (laço com os dois pais, carreira no connect29, ficha concorda com o
grafo); divórcio na mesma banda (rixa/pressão do lineup16 ou banda rachada); rodízio; estrela mirim de 12+ com
responsável, fundo Coogan, escola na agenda e motivo na proposta; denúncia de exploração (seu selo e rival); Michael
Jackson com 12 anos num mundo de 1970 com o pai documentado como responsável; modo exato sem família inventada e mundo
alternativo marcado como simulado; determinismo e Rng compartilhado intocado.

## Lacunas

- **Sequestro/extorsão de família famosa**: o Submundo não tem essa operação; a ligação é pelo segredo guardado (caso
  extraconjugal) que a chantagem já usa. Nada de sequestro.
- **Demografia (demo29)**: o módulo ainda não existe neste ramo; `youthSkew29(s, actId)` (parte do público jovem pelos
  menores/ex-mirins do ato) fica pronto para ele ler.
- **Mapa de 13 sistemas (connmap29)**: é gerado pela sonda `probe29all`; a família entra no sistema "vida" e não
  re-gerei o mapa (a sonda é pesada). `r29-connect-all` segue passando.
- **Cenas animadas do cut27**: usei as cenas interativas do scene17 (casamento, bebê, divórcio, estreia de família no
  seu elenco); não criei chaves novas no `cut29model`.
- **contests19 / discover18 / school18** não foram mexidos: as estrelas mirins nascem com a origem marcada (calouros,
  TV, trainee, escola) e entram no radar da sua cidade pelo fato `child_star`; os concursos ainda não escolhem crianças.
- **Vínculo filho × estrada** só existe para os seus atos (dynasty.ts); filhos leves de NPC não guardam vínculo.
- **Seus próprios filhos** (kids17) não viraram estrelas mirins por este sistema (seguem o caminho deles aos 18).
- **Casais do mesmo sexo / leis de casamento por época** não entram (o sex17 cuida da época para o jogador).
- **Filhos da indústria** dependem dos filhos que o people16 dá (e da semeadura dos gerados): em partidas curtas
  aparecem poucos; a fila de herdeiro de selo segue a regra do people16.
- **Bot**: o playbot não entende o limite de horas de menor; contrata estrela mirim como qualquer ato.
- Teste antigo que já falhava no ramo base (não é desta rodada): `r17-life` "exposição: em época hostil…".
