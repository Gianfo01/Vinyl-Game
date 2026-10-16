# Carreiras: o que o jogador decide hoje, onde isso não chega ao mundo e como deixar cada decisão "de verdade" (plano 30/R31)

Só leitura: nada foi alterado no repositório. Referências `arquivo:linha` conferidas no código atual.

**Pergunta do dono:** "Na carreira de dono de rádio, a gente escolhe as músicas que tocam? Isso mexe na fama e nas
paradas conforme o alcance/notoriedade da rádio? Se não, deveria: escolher músicas, programação, estilo da rádio,
mantendo dificuldade. Pense o mesmo para as outras carreiras."

**Resposta curta:** não. Hoje o dono de rádio escolhe **artistas** (não músicas) para 5–8 "vagas". Cada vaga só
dá um pouco de **embalo** (momentum) ao artista, que mexe pouco nas vendas e nada direto nas paradas. A rádio não tem
audiência medida contra concorrentes, não tem cidade/país de alcance que valha para a fama local, e não entra no
mercado de rádios onde o selo do jogador faz divulgação (`radio18`). O mesmo padrão (escolha → só "embalo" global)
se repete em quase todas as carreiras.

---

## 0. Como o "efeito no mundo" funciona hoje (para entender os buracos)

| Alavanca | O que move | Onde |
|---|---|---|
| `act.momentum` (embalo, 0–100) | Apelo de um disco **no lançamento** (`0.8 + m/250`) e calor semanal de quem já está tocando (`0.85 + m/300`). +3 de embalo ≈ +1% nas vendas da semana. | `src/sim/market.ts:135`, `:325` |
| `act.fame` (global) | Apelo (convexo), cachê, lotação | `market.ts:130` |
| Mod `appeal` | Multiplica o apelo **uma vez, na estreia** do disco | `market.ts:145` |
| Mod `chartUnits` | Multiplica as unidades **toda semana** (é o que de fato sobe parada) | `market.ts:355` |
| Fama por país (`fame16`) | Desvio local por: paradas do país, prêmio, **shows feitos lá** (flag `played:ato:cidade`), divulgação local, rede da cena **só para atos do jogador**, cena do gênero | `src/sim/sys/fame16.ts:205-251` |
| Paradas por país | Já existem: as unidades globais de cada disco são repartidas por país (tamanho do mercado, gosto, efeito casa) | `src/sim/sys/charts7.ts:1-7` |
| Cena `s.scenes['cidade:gênero']` | Cena local, apelo de quem é de lá | `scenes12`, `world4/scenes` |

Regra prática: **só `chartUnits` e a fama por país fazem uma escolha virar posição de parada**. Quase todas as carreiras
hoje só escrevem `momentum` (efeito pequeno e global) e às vezes `fame` global por sorteio.

---

## 1. Lista de carreiras (do código)

Registradas em `src/sim/sys/careers12.ts:30-44` + `registerCareer` em outros arquivos:

1. **label** Gravadora (núcleo do jogo)
2. **manager** Empresário (`ventures9`, `manager11`, `manager12`, rivais reais `managers14`)
3. **festival** Dono de festival (`fest12`, `fest18`, `live/festival`, `careers19` terreno/procura)
4. **booking** Agente/promotor de shows (`ventures9` bookingMonth, `tour12`, delegação `deleg16`)
5. **venue** Dono de casa de shows (`live/venue`, `venue12`, casas reais `venues17`, modelo único `venues27`)
6. **studio** Dono de estúdio / produtor (`studio12`, `recipe12`, produtores reais `producers15`)
7. **publisher** Editor musical (`ventures12`, sync `sync15`)
8. **media** Dono de mídia — subtipos `magazine` (1900), `radio` (1922), `tv` (1950), `blog` (1998), `playlist` (2008) (`ventures9:70-76`, `media12`, programa de calouros próprio em `tv18`, fanzine/revista em `zines19`)
9. **platform** Dono de plataforma de streaming (2005+) (`ventures9:522`, `platform12`)
10. **musician** Músico (sua banda; usa o núcleo do jogo)
11. **critic** Jornalista/crítico (`press18:188`, fanzine/revista `zines19`)
12. **screen** Compositor de trilhas e palco (`screen18:258`)

(TV de talentos `tv18` e clipes `media18` são sistemas que várias carreiras usam, não carreiras próprias.)

---

## 2. RÁDIO (e mídia em geral) — análise detalhada

### 2.1 O que o jogador decide hoje

Painel da mídia (`src/ui/sys/ventures9.ts:161-164` e `src/ui/sys/ventures12.ts:99-120`):

- **Linha editorial** (mainstream / underground / prestígio / fofoca) e **público** (jovem / adulto / nicho)
  — `media12.ts:27-35`, `setLine` `:65` (trocar custa −6 de credibilidade).
- **Programação: vagas** = `radio 5 / revista 3 / TV 3 / blog 4 / playlist 6` + nível (`media12.ts:42`). Cada vaga
  tem um **tipo** (rotação, entrevista, resenha, sessão ao vivo 1930+, estreia 1950+) e um **ARTISTA** (`setSlot`
  `:71`). **Não se escolhe música nem disco.**
- **Artista favorecido** (um só) — `ventures9.ts:408`.
- **Empurrar uma cena** (gênero da cidade) — `ventures9.ts:431`.
- **Aceitar jabá** de um rival — `ventures9.ts:414` (dinheiro, o artista dele vira favorecido, "calor" de escândalo).
- Equipe (apresentador, crítico, curador, repórter), exclusivas, dilema crítico × anunciante, adaptação de formato
  por época (Top 40 1955, FM segmentada 1990, on-line 2012) — `media12.ts:45-51, 89-153`.

### 2.2 O que essas decisões afetam (e quanto)

| Decisão | Efeito | Onde | Tamanho |
|---|---|---|---|
| Vaga de programação | `momentum += alcance/40 × peso` (estreia ×2, entrevista ×1.3) | `media12.ts:178` | alcance 30 → +0,75/mês ≈ +0,25% vendas. **Irrelevante para parada.** |
| Vaga com ato pequeno (<35) | Enche "nova audiência"; com 100 → alcance +3, cena +5 | `media12.ts:179, 201-206` | bom para a rádio, nada para o ato |
| Coerência com a linha | Credibilidade sobe/desce | `media12.ts:175-189` | ok |
| Favorecido | `momentum += alcance/20`, chance alcance/200 de **+1 fama global**; apelo na estreia ×(1+alcance/400) | `ventures9.ts:449-453, 475-488` | só vale para discos **lançados** enquanto favorecido |
| Cena | `s.scenes` sobe alcance/25 por mês; atos do gênero na cidade +0,5 embalo | `ventures9.ts:455-459` | é o efeito mais forte e é "por cidade" |
| Jabá | dinheiro; calor que vira escândalo (rep −25, multa) | `ventures9.ts:414-428, 461-470` | ok |

### 2.3 As três perguntas do dono

1. **Escolhemos as músicas?** Não. Escolhemos **artistas**. Não há lista de faixas, rotação pesada/média/leve, nem
   limite de minutos. O sistema que tem isso de verdade (adição → rotação leve → média → pesada → saída, diretor de
   programação, consultores, formatos com gêneros e época) é o `radio18`, **mas lá o jogador é o selo que pede para
   tocar, e as rádios são NPC** (`radio18.ts:28-53, 127, 194-215`). A rádio do jogador não existe nesse mercado.
2. **Influencia fama e paradas?** Quase nada. O único caminho para a parada é o `chartUnits` do `radio18`
   (`radio18.ts:185-192`: unidades ×(1 + min(0,6; 0,05×spins) × peso da rádio na época)) — e ele **só se aplica a
   discos do jogador** (`rel.owner !== 'player'` → nada). A rádio própria não gera "spins". Fama: só +1 global por
   sorteio no favorecido; a fama por país (`fame16`) não recebe nada da programação (só do vínculo abstrato
   `ties.media` da rede de cena, e só para atos do jogador — `fame16.ts:228-232`, `scenes12.ts:210`).
3. **Está escalado pelo alcance/notoriedade?** Em parte: tudo multiplica `v.reach` (0–100). Mas o alcance é uma
   fórmula fechada (`mediaReach`, `ventures9.ts:434`: nível×12 + reputação×0,3 + equipe − declínio pós-2000), não uma
   **audiência**. Não há: cidade/país de cobertura que limite o efeito, participação (share) contra rádios rivais,
   medição de audiência (Ibope/Arbitron), formato do `radio18` para a rádio do jogador, nem perda de ouvintes quando
   a programação é ruim (só a credibilidade cai devagar).

Era: rádio liberada em 1922 (`ventures9.ts:72`) ✔; declínio pós-2000 ✔; peso da rádio cai com internet/streaming/
vídeo curto no `radio18` (`radio18.ts:91`) ✔ — mas a rádio do jogador não usa esse peso.

### 2.4 Proposta — "Grade da rádio" (`station31`)

**Decisão-assinatura:** montar a **grade semanal** da sua estação: quais **faixas** (lançamentos reais do mundo, de
qualquer selo) entram e em que **rotação** (pesada / média / leve / "aposta"). A grade tem **vagas limitadas** por
formato (Top 40: 10 pesadas + 15 médias; AOR: muitas faixas de álbum, poucas pesadas; universitária: 30 leves).

1. **A estação vira uma `Station18` de verdade** no mercado do `radio18`, com flag `own: true`, a cidade da
   venture e o **formato** escolhido entre os `FMT18` disponíveis no ano (`radio18.ts:28-38`: rede nacional 1925–56,
   Top 40 1955+, AC 1965+, AOR 1968–2006, urbana 1972+, country, universitária 1975+, latina, dance). Isso substitui
   a "linha editorial" no caso de rádio (revista/TV mantêm `LINES`). Antes de 1955 o formato é "rede/programas
   patrocinados": poucas vagas, ao vivo, orquestra.
2. **Audiência como share na cidade/mercado.** Cada cidade tem N rádios NPC do `radio18` (já geradas) disputando
   ouvintes. Share mensal = f(encaixe da grade com o gosto da cidade por família de gênero no ano — `charts7` já
   tem esse gosto —, qualidade/fama das faixas, apresentador, credibilidade, formato atualizado, potência/nível).
   "Pesquisa de audiência" trimestral com posição no ranking. Anunciantes pagam por share (troca a fórmula fixa de
   `ventures9.ts:448`).
3. **Efeito no mundo, escalado pelo share:** cada faixa em rotação soma **spins** = share × peso da rotação × peso
   da rádio na época (`radioWeight18`). Os spins entram no mesmo `chartUnits` que já existe (tirar a trava
   `owner === 'player'` para os spins da estação própria) **e** num empurrão de fama no país da rádio
   (`nudge16(ato, país, …)`, bit novo "rádio local" no `SRC16`). Com `chartsx30` (paradas por país do R31), o
   efeito cai principalmente no país/cidade da estação — exatamente o "alcance" pedido.
4. **Tensão / dificuldade:**
   - Tocar o que já é sucesso segura o share, mas não dá credibilidade nem "olho clínico".
   - Apostar em novos (rotação "aposta") derruba o share no curto prazo; se a faixa estourar depois (verdict19 /
     `x.disc` de `media12.ts:207-226`), credibilidade e fama de "rádio que lança gente".
   - Ouvintes cansam: faixa pesada por >8 semanas perde share (burnout), como o ciclo de saída do `radio18:212`.
   - Rádios rivais reagem: copiam seu formato se você lidera (NPC muda `fmt`), ou fazem "guerra de jabá".
   - **Jabá** vira oferta por **faixa**: o selo rival paga para pôr X em pesada. Ganha dinheiro, perde share se a
     faixa for ruim, gera Fato `payola` (mesmo trilho do `radio18.ts:160, 226` e `crime17` calor). Lei por país e
     época (escândalo de 1959–60 nos EUA; "jabá" no Brasil) via leis por país do R31.
   - Conflito de interesse: tocar demais o próprio selo já custa reputação (`favorCost19`); passa a custar share.
   - Época: TV (1950s) e depois streaming tiram ouvintes de todas; adaptar formato (FM 1990, online 2012) mantém.
5. **Delegação:** um **diretor de programação** contratável (pessoa com gosto, como os PDs NPC) monta a grade por
   diretriz ("só sucesso", "30% novos", "cena da cidade") — encaixa em `deleg30` (registro "quem agiu, por qual
   diretriz, resultado").
6. **Conhecimento (`know30`):** quem tem rádio ouve demos e vê o desempenho real das faixas na cidade dela (pedidos de
   ouvintes) — reduz a névoa de `compare30` sobre atos locais.
7. **Cena (`scene30`/`interior30`):** estúdio de rádio em corte: locutor, painel de grade (cartões de faixas com cor
   da rotação), telefone de pedidos, envelope de jabá na mesa (já existe a imagem em `scenes/radio.ts`).

**Revista/TV/blog/playlist (mesmo esqueleto, alavanca diferente):**
- *Revista*: capa (1 por edição, efeito forte e curto) + resenhas (nota que entra no `chartUnits` de 12 semanas, como
  o `press18:117`), escalado por **tiragem** no país. Tensão: capa para anunciante × credibilidade.
- *TV* (1950+; canal de clipes 1981+): **rotação de clipes** (liga em `media18` M4: a "rede de clipes" passa a ser
  sua quando você é dono) + apresentações em programa. Audiência por share nacional. Tensão: censura de clipe, custo.
- *Playlist/blog*: liga direto nas **fontes de descoberta** do `stream18` (fonte "playlist" do ato vem da sua
  playlist com N seguidores) — ver plataforma.

---

## 3. Outras carreiras

Formato: **Hoje** (decisões → efeito, arquivo:linha) · **Buraco** · **Proposta** (decisão-assinatura, tensão, ganchos, risco).

### 3.1 Plataforma de streaming (2005+)

- **Hoje:** proposta de valor, plano grátis/pago e preço, peso curadoria humana × algoritmo, **critério de destaque**
  (popular / novidade / diversidade / editorial) — `platform12.ts:66`; repasse e transparência, exclusivas,
  conteúdo sintético. Destaques mensais: `picks` (`platform12.ts:153-169`) dão `momentum += 2,5×alcance×eficácia`,
  chance pequena de +1 fama e cena para atos <35. Sessão exclusiva (`:135-147`).
- **Buraco:** o jogador escolhe um **critério**, não **faixas**; os destaques não viram **streams** nem posição nas
  paradas de streaming (`charts7` tem parada de streaming por país). As playlists editoriais do `stream18` (fonte
  "playlist" dos discos do jogador) são de plataformas abstratas, **não da sua**. Assinantes não têm país.
- **Proposta (`playlist31`):** **playlists da casa** com vagas (ex.: "Top da semana" 50, "Novidades" 30, uma por
  humor a partir de 2018 — `SHIFTS` já tem isso), escolhidas faixa a faixa ou por regra (algoritmo). Streams da
  faixa = seguidores da playlist × posição × taxa de "salvar". Entra no `chartUnits` e na **fonte "playlist"** do
  `stream18` (a dependência de uma playlist só, `stream18.ts:315`, passa a ser a SUA playlist: tirar a faixa derruba o
  ato — poder real). Assinantes por país (fatia do mercado contra Spotify-equivalentes NPC) limitam onde o efeito
  vale. **Tensão:** majors exigem vagas em troca de catálogo (renovação já existe, `:92`); favorecer seu selo = conflito
  e êxodo de artistas; fazendas de streams (`stream18` já detecta) poluem seu ranking; repasse baixo × artistas que
  saem (boicote real 2014–2020).

### 3.2 Casa de shows

- **Hoje:** calendário fixo por noite (autoral, residência, festa, privado, aluguel), três acordos de porta, reformas,
  vizinhança, metas (`venue12.ts`); casas reais com linha de programação e preço (`venues17.ts`). Efeito no ato:
  `fans.casual += 5% do público`, `fans.core += 0,4%` (`venue12.ts:319-320`); residência e "noite lendária" (+4 fama,
  `venues17.ts:165-170`); ocupação depende de fama e cena (`venue12.ts:92`).
- **Buraco:** noite na sua casa **não marca `played:ato:cidade`** (só `tours.ts:337` e `tour12.ts:291` marcam), então
  não conta como "show feito lá" na fama por país (`fame16.ts:216-224`). Atos NPC escalados não ganham fama local; a
  casa não "lança" ninguém de forma mensurável.
- **Proposta (`stage31`):** a **escalação do mês** (quem abre, quem fecha, quantas noites para novos) com teto de
  cachê. Cada noite marca `played:` e dá `nudge16` na cidade escalado por prestígio da casa × lotação; noite lendária
  vira Fato e pode puxar o ato para olheiros de selos (rivais também — risco de "perder sua descoberta"). **Tensão:**
  noites de novos esvaziam a casa e o bar; noites comerciais desgastam o prestígio (já existe em `venues17`);
  vizinhança/alvará. Cena: a casa vista de dentro (`interior30`) com o cartaz do mês clicável.

### 3.3 Festival

- **Hoje:** ciclo completo (conceito → financiamento → contratação com palco/horário → lotes → operação → memória do
  público) em `fest12`; curadoria e patrocinadores em `fest18`; terreno e procura em `careers19.ts:181-285`. Efeito:
  **atos do jogador** ganham fama +1+ex/100, embalo +3, fãs (`fest12.ts:742-748`); **atos de terceiros só ganham
  +2% do público em fãs casuais e o cachê** (`fest12.ts:741`). Identidade "gênero" sobe a cena da cidade (`:759`).
- **Buraco:** a posição no cartaz (headliner × palco pequeno às 14h) não muda nada para o ato; festival não marca
  `played:`; um festival lendário não "lança" ninguém de fora do selo; sem efeito em paradas (álbuns ao vivo `rights12`
  pagam, mas não viram disco nas paradas).
- **Proposta (`bill31`):** o **cartaz** é a decisão: cada slot tem peso (headliner, sub, revelação, palco
  secundário). Depois da edição: fama no país do festival (`nudge16`) ∝ público × peso do slot × nota da edição;
  "revelação do festival" (Fato) pode virar momento de parada (`chartUnits` curto para o disco atual do ato, como o
  `awards18`). **Tensão:** headliners caros vendem ingresso; revelações baratas dão prestígio mas arriscam a procura
  (já modelada em `festQ19`); exclusividade territorial com rivais. Era: Newport 1954, Woodstock 1969, mega-festivais
  1990s+ (já em `careers19`).

### 3.4 Agente/promotor de shows (booking)

- **Hoje:** clientes com comissão sobre `grossShows` (passivo, `ventures9.ts:399-404`); em `tour12` o agente monta
  rotas de verdade e marca `played:` (`tour12.ts:290-291`); promotor banca a porta; delegação com ordens permanentes
  (`deleg16`).
- **Buraco:** o modo "agência" (ventures9) é só comissão; a escolha de praças não decide em que país o ato cresce
  para clientes passivos. Turnê do empresário (`manager11.ts:111-123`) é um botão: +2 fama, +8 embalo, sem rota.
- **Proposta (`route31`):** toda turnê de cliente passa pelo mesmo motor de rotas (tour12/route8), e o jogador
  escolhe **mercados-alvo** por cliente ("abrir a Alemanha"). Shows → `played:` → fama por país → paradas do país
  (R31 `chartsx30`: "fama local vende"). **Tensão:** abrir mercado novo dá prejuízo e cansa; mercados conquistados dão
  dinheiro. Delegação (`deleg30`) aplica a diretriz por cliente.

### 3.5 Empresário

- **Hoje:** confiança, plano de carreira co-escolhido, mandato, equipe por cliente, dilemas (`manager12`); turnê,
  campanhas de imagem, levar ao mercado (`manager11`); patrocínios e renovação (`careers19.ts:317-436`); rivais reais
  (`managers14`). Efeitos em `fame`/`momentum` diretos (`manager11.ts:121-122, 222-227`; `manager12.ts:322`).
- **Buraco:** o plano de carreira não **dirige** o que o ato NPC faz (o selo NPC decide lançamentos sozinho); as
  ações são pacotes fixos de +fama/+embalo sem geografia; "levar ao mercado" não usa as rádios/festivais/casas do
  mundo.
- **Proposta (`plan31`):** o plano vira **ordens ao mundo**: "lançar single em março", "turnê na América Latina",
  "tocar no festival X", "trocar de produtor" — cada uma é um pedido a outro sistema (selo NPC aceita ou não conforme
  a força do mandato e da relação; o festival aceita conforme a fama). **Tensão:** o selo do artista tem outra
  agenda (conflito já modelado em `careers19.ts:415-416`); cobrar demais do selo queima a relação; o artista co-escolhe
  metas que brigam. Encaixe: Caixa (inbox18) com as respostas; `deleg30` para o assistente.

### 3.6 Estúdio e produtor

- **Hoje:** estúdio: salas, equipamento, engenheiros, contratos, reputação (`studio12.ts:124-175`); para o selo do
  jogador, "som da casa" melhora `song.production` (`ventures9.ts:491-501`). Produtor: projeto com precisão/emoção/
  comercial, assinatura de estilo que envelhece (`studio12.ts:213, 280-312`, `hotStyle` só é lido).
- **Buraco:** a sessão que você grava para um **cliente NPC** gera uma nota (`b.q`) que só mexe na reputação do
  estúdio — **o disco do cliente não fica melhor**. A produção para NPC só dá `momentum += (q−60)/15`
  (`studio12.ts:301`). A sua assinatura não influencia a moda (é sempre o mundo que dita `hotStyle`, nunca você).
- **Proposta (`sound31`):** o que sai do seu estúdio/produção **vira o próximo lançamento do cliente** (a nota entra
  como `rel.q`/produção do disco NPC, já que `launchNpcRelease` existe em `market.ts`). Créditos visíveis no disco.
  Se discos com a sua assinatura fazem sucesso, ela empurra a **tendência de som** do gênero (escrever no mesmo
  estado que `hotStyle` lê, devagar). **Tensão:** datas (estúdio cheio = recusar clientes), assinatura que envelhece
  vs. reinventar (perde reputação), pontos × cachê já existem.

### 3.7 Editora musical

- **Hoje:** compositores, pedidos (artista, cinema, publicidade, games), coautoria, divisão, proteger × oferecer,
  ressurreição (`ventures12.ts:124-318`). Efeito no ato que grava: `momentum +2/+3` (`:246, :282`); "vira febre" é
  só texto (`:243-248`). Catálogo da editora é de **títulos inventados** (`:87`), não `s.songs`.
- **Buraco:** colocar uma canção com um artista não cria **gravação** nem parada; sync de editora não ressuscita nada
  (só o `sync15` faz isso, e para o catálogo de masters do selo).
- **Proposta (`cover31`):** obra colocada → o artista NPC **lança** uma gravação (Release com `songs` ligada à
  composição); royalties de edição pela venda real; sync usa o motor do `sync15` (efeito série) também para obras da
  editora. **Tensão:** dar a canção a um nome grande (vende, pode estragar) × a um novo (arrisca, cria parceiro);
  exclusividade; autor que veta marca (já existe).

### 3.8 Crítico/jornalista

- **Hoje:** resenha por lançamento do mês, influência = credibilidade × alcance (até ~0,16), entra no `appeal` e no
  `chartUnits` das 12 primeiras semanas (`press18.ts:61, 110-121`); escada frila → editor → veículo próprio; suborno,
  embargo, furos (`:130-167`); fanzine que cria cena (`zines19`).
- **Buraco pequeno:** é a carreira mais ligada. Falta: alcance por **país** (a resenha vale no mundo inteiro igual) e
  efeito de **lista de fim de ano** / cânone.
- **Proposta:** influência ponderada pelo país do veículo (R31 `chartsx30`); "lista do ano" em dezembro com efeito de
  catálogo (`chartUnits` leve em jan–fev) e no `verdict19`. **Tensão:** já boa (credibilidade × acesso × suborno).

### 3.9 Compositor de trilhas e palco (screen)

- **Hoje:** encomendas com diretor, abordagem (trilha provisória / orquestra / ousada), prazo, bilheteria, álbum de
  trilha (lançar pelo selo, licenciar ou nada), prêmios (`screen18.ts:104-248`). Fama do ato +box×2 / +4 em prêmio.
- **Buraco:** a canção-tema de um filme de sucesso não sobe nas paradas por si (só se lançada pelo selo).
- **Proposta:** "canção do filme" vira lançamento com `chartUnits` ligado à bilheteria por país (como `sync15`).
  **Tensão:** diretor quer a sua trilha × selo quer o single.

### 3.10 Gravadora e Músico (núcleo)

- **Hoje:** o motor inteiro de lançamento, marketing, rádio (`radio18` pitch), streaming (`stream18`), turnês
  (`tours.ts`) já liga escolhas a paradas. Músico usa o mesmo motor com a banda do jogador.
- **Buraco:** é o "lado que pede". Com as propostas acima, o selo passa a **pedir a donos reais** (rádio/plataforma/
  festival/casa de jogadores ou NPC) com as mesmas regras — a simetria é o ganho principal.

---

## 4. Como encaixar no R31 sem bagunçar

- **Peça comum (`airplay31`):** uma função única "exposição de uma faixa num lugar" = `{relId, país/cidade, peso,
  fonte}` que todas as carreiras de mídia escrevem e que vira (a) `chartUnits` multiplicador (somado, com teto) e
  (b) `nudge16` no país. Rádio, TV de clipes, playlist, festival, casa e crítico usam a mesma peça; a autópsia já
  mostra o rótulo do mod ("Sua rádio", "Sua playlist").
- **Paradas por país (`chartsx30`, O2·Y):** pré-requisito natural — a exposição vira posição **no país da
  estação**, não no mundo.
- **Conhecimento (`know30`):** dono de rádio/casa/plataforma vê números reais dos atos que expõe (pedidos, streams,
  lotação) — fonte nova de conhecimento por observação.
- **Delegação (`deleg30`, O3·Q):** diretor de programação, curador da playlist, booker da casa, agente: diretrizes +
  registro de automação. Sem isso, as grades viram microgestão.
- **Cenas (`scene30`/`interior30`):** rádio (estúdio com grade), redação/banca, escritório de tecnologia, casa e
  festival já estão na lista do R31 como "lugares no mundo"; a grade/cartaz/playlist é o objeto clicável principal.
- **Fatos (`emitFact`):** `own_rotation`, `own_bill`, `own_playlist_add`, `payola` — outros sistemas reagem sem
  editar arquivos alheios.

## 5. Determinismo, goldens e riscos

- **Determinismo:** cada sistema novo com gerador próprio (`Rng.fromSeed('semente|station31|mês')` ou fluxo novo em
  `rng19.ts` STREAMS19). Nada no fluxo comum.
- **Goldens (`tests/sim.test.ts`, `r27-p2a/p2b`):** tudo que só roda **quando o jogador é dono** do veículo/casa/
  plataforma não muda as partidas de referência (que não abrem mídia). **Muda os goldens:** (1) tirar a trava
  `owner === 'player'` do `chartUnits` do `radio18` se ela valer para NPC; (2) dar `played:`/fama local a atos NPC em
  festivais/casas que já existem no mundo; (3) produção do estúdio virando `rel.q` de NPC; (4) audiência de rádios NPC
  competindo entre si. Fazer atrás de interruptor (`CONN29_OFF` / novo `R31_CAREERS_OFF`) e remedir na junção da onda.
- **Save:** estado novo em `s.x4` via `registerExt4` (grade, share, playlists); estações NPC do `radio18` ganham
  `city?` opcional (saves antigos: sem cidade = nacional).
- **Equilíbrio:** teto por fonte (o `chartUnits` do `radio18` já limita a +60%); retornos decrescentes de escala
  do jogador (`market.ts:356-360`) seguem valendo — e precisam valer para "sua rádio tocando seu selo" (senão vira
  máquina de hits). Conflito de interesse (`favorCost19`, `zines19`) é o freio narrativo.
- **Performance:** spins por faixa por estação por mês — limitar a grade (≤40 faixas) e só estações com dono jogador
  + top NPC por país.

## 6. Ordem sugerida

1. `airplay31` (peça comum) + rádio (`station31`) — responde direto à pergunta do dono.
2. Plataforma (`playlist31`) reaproveitando a mesma peça e o `stream18`.
3. Casa e festival marcando `played:` + slot do cartaz (barato, grande efeito de "mundo vivo").
4. Estúdio/editora gerando lançamentos NPC reais (mexe em goldens — fazer na janela de remedição).
5. Empresário como "ordens ao mundo" (depende de 1–4 existirem para ter onde mandar).
