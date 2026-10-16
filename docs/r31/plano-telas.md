# PLANO 2 — navegação "mundo primeiro" (só plano; nada foi editado no repositório)

Substitui a §4 do `PLANO.md` (árvore de 7 seções / ~30 páginas). Mantém do PLANO.md: diagnóstico (§1–3), checklist
de exclusão (§7), lista de testes (§8) e as reformulações de padrão de tela (aqui na §5).

**Ideia central.** O jogador navega por **lugares**: a mesa do chefe, a sede em corte, a cidade, o mapa-múndi e a
própria casa. Cada sala/prédio/camada abre uma **cena** com as 2–4 ações mais comuns e um botão **"ver detalhes"**
que abre a página/tabela completa de hoje (nenhuma função some: a página antiga É o "ver detalhes"). Só as telas que
são essencialmente texto/tabela continuam como páginas, agrupadas em **Listas**.

Nome de código da rodada: **r30** (módulos `ps/place30model.ts`, `ps/menu30.ts`, `ps/pending30.ts`; teste
`tests/r30-world-nav.test.ts`).

Abreviações da tabela: **VD** = "ver detalhes" (abre a página antiga, com a aba indicada); **⚑** = página sem lugar
natural (proposta marcada); **O1…O8** = onda em que a cena/lugar fica pronto (ver §8). Em O1 todo destino é
"lugar-placeholder" = cartão na faixa "Lugares" da entrada, que abre a página antiga.

---

## 1. Menu lateral novo (8 fixas + 2 condicionais = ≤ 10)

```
 ☀ Hoje        → Mesa do chefe (cena cockpit)          [badge: decisões + prazos ≤ 2 semanas]
 🏢 Sede        → Sede em corte (sede25)                [badge: soma das salas com pendência]
 🏙 Cidade      → Nosso mundo (campus18 + vizinhos)     [badge: soma dos prédios com pendência]
 🌍 Mundo       → Mapa-múndi (world, aba Mapa)          [badge: turnê/filial/festival pedindo decisão]
 🏠 Você        → Interior da sua casa                  [badge: família/saúde/patrimônio com ação]
 ☰ Listas      → página de texto com 7 abas (§1.6)      [sem badge]
 ⌕ Buscar      Ctrl+K (absorve o Índice)
 ⚙ Opções      (Arquivo/saves, Campanha, Ajuda, tema, idioma, "Menu completo")
 ── condicionais ──
 ★ Fixados     só aparece se houver pins (store17.pins); lista curta
 ⇄ Suas casas  só com 2+ carreiras ativas: troca a cena da entrada "Sede" (§4)
```

Com **"Menu completo"** ligado (Opções; padrão **desligado**, guardado em localStorage como per-viewer), aparece abaixo
uma árvore recolhida com a lista clássica (`SECTIONS25`/`tree27` em modo "Completa", sem abas na lateral). Ela
substitui a dupla Essencial × Completa (`view27`), que deixa de existir.

### 1.1 Hoje — Mesa do chefe (área `cockpit`, id não muda)
Objetos na mesa (cada um é uma zona clicável da cena; em O1 são as abas atuais):
- **Linha do tempo unificada** (faixa horizontal: hoje → +12 semanas): compromissos de `plan`, `calendar19`,
  `agenda17›Agenda`, `cal17`, sessões de estúdio, lançamentos, prazos de `long18`/contratos, eventos do mundo do mês
  (`mundo27`, só os que tocam você). Filtro: Tudo / Shows / Estúdio / Prazos / Pessoal / Mundo.
- **Bandeja de entrada** (inbox18 + boletim notify19 + alertas29): uma lista só, com "decidir agora".
- **Quadro de cortiça — Metas** (`goals` Cenário/Conquistas, metas da era `ux19`, "Rumo a" r28, Campanha29).
- **Caderno — Diário** (`diary`, story28) e **pasta "Fios do Mestre"** (`dm18`) ⚑.
- **Telefone** = "Agora" (3 ações sugeridas, home27model).
- Rodapé: "o que mudou" (1 linha por item, link para o lugar).
- VD: Painel atual, Caixa de entrada, Calendário completo (Listas).

### 1.2 Sede — corte da sede (área `sede25`; `hq` vira VD "Obras e operação")
Salas (as 6 de `hq25model` + extras de `hqrooms27` + novas ⚑):

| Sala (spot) | Existe hoje? | Abre |
|---|---|---|
| Recepção (`lobby`) | sim | Hoje › Bandeja (atalho) |
| Estúdio (`studio`) | sim | estúdio: sessões, músicos de sessão, equipamento; VD `studio` |
| Lounge do elenco (`lounge`) | sim | elenco vivo: humor, saúde, relações, bandas; VD `artists`, `people`, `dyn18` |
| Escritório / andares (`office`) | sim (vai a `finance`) | **equipe e delegação** (prancheta), contratar, estrutura, cultura, crises; VD `team`, `company`, `firm19`, `agenda17›Contratar` |
| A&R (`anr`) | sim | funil, olheiros, dossiês, decidir; VD `market` |
| Ensaio e palco (`stage`, `rehearsal`) | sim | ensaio, banda da casa; VD `shows›Operação` |
| Sala de reunião (`meeting`) | sim (extra) | rumo e estratégia: `long18` Caminhos/Doutrinas/Políticas, `business›Era e estratégia/Estrutura×era/Adoção` |
| Jurídico (`legal`) | sim (extra) | contratos em vigor, renovações; VD Listas › Contratos |
| Marketing / Imprensa (`marketing`, `press`) | sim (extra) | campanhas do selo (`media›Campanhas`), coletivas |
| **Arquivo / catálogo** (`archive`) | sim (extra: "arquivo de fitas") | 3 armários: **Masters** (`catalog`), **Editora** (canções: `songmkt27`, `cp17-publisher` se houver), **Imagem** (`media19` remix/publicidade/trilhas, `catalog›Sync` + `business›Marcas e sync`, `tribute19`) |
| **Sala de troféus e relíquias** | ⚑ nova | discos de ouro, prêmios (`awards` do selo), Hall da Fama do elenco (`rockhall`), relíquias/acervo/espólio (`lendas`), Museu (`goals›Museu`), história (`hq›História`, `catalog›História`, `long18` Ano em revista/Biografia/Post-mortems) |
| **Mural do submundo** (porão) | ⚑ nova; só se `crime` desbloqueado | seus planos, espionagem, histórico (`crime` Planos/Espionagem/Histórico) |
| **Garagem** | ⚑ nova | veículos da empresa (ônibus de turnê, van, limusine, jatinho — hoje em `goods8`/`wealth›Loja` e regras de turnê): comprar/vender, qual turnê usa qual |
| **Rua dos projetos** (calçada da frente) | ⚑ nova | cada projeto em andamento é uma vitrine/caçamba na rua com o passo atual (compor → gravar → mixar → lançar); VD `project`, `creation` |
| **Vitrine de lançamentos** (fachada) | ⚑ nova | lançamentos programados e saídos, capa, verba, data; VD `releases` |
| Jardim (`garden`), estúdio imersivo (`neural`) | sim (extra) | efeitos/perks da sala (ficam como estão) |

Salas fechadas (não compradas) aparecem esmaecidas com o motivo; a sala com pendência **pulsa** (§6).

### 1.3 Cidade — Nosso mundo (área `campus18`)
Prédios. Base técnica: `PlaceK27` em `sim/sys/place27.ts` já tem `venue, records, radio, studio, bar, press,
rehearsal, label, office, apartments, hotel, instruments`; `KIND18` (seus prédios) tem `studio, venue, fest, school,
museum, publisher, plant, media, platform, booking, rehearsal, store, dorm, park, home…`. **Novos tipos** ⚑ em
`PlaceK27`: `bank, broker, court, police, blackmkt, faction, transport, auction, cityhall, tvstation`.

| Prédio | Tipo | Abre (ações na cena) | VD |
|---|---|---|---|
| Loja de instrumentos | `instruments` (existe) | equipamento do estúdio/banda (`gear19`) | `hq›Equipamentos` |
| Casas de show | `venue` (existe) | marcar show local, ingressos, temporada | `shows`, `live19` |
| Loja de discos | `records` (existe) | vendas locais, top da loja, distribuição | `supply18›Distribuição`, Listas › Paradas |
| Rádio | `radio` (existe) | jabá, formatos, parada de rádio | `media›Rádio/Jabá` |
| Jornal / redação | `press` (existe) | notícias e boatos (+verdade/fonte), críticos, fanzines (banca) | `news17`, `known27`, `critics`, `zines19`, `media` |
| TV | ⚑ `tvstation` | clipes, programas (TV de `talent18`) | `media›Clipes`, `talent18›TV` |
| Bar / clube (talentos e noite) | `bar` (existe) | procurar talentos, cena local, sair à noite, ex-artistas | `market›Procurar`, `knownacts27›Cena local`, `night14`, `after18` ⚑ |
| Sala de ensaio | `rehearsal` (existe) | alugar ensaio; casa do músico (§4) | `cp17-musician` |
| Estúdios de terceiros | `studio` (existe) | alugar estúdio, contratar produtor | `producers15` |
| Gravadoras rivais (sala do CEO) | `label` (existe) | conversar/negociar com o CEO, o porquê de cada jogada | `labels`, `world17` |
| Banco | ⚑ `bank` | empréstimos, câmbio | `finance›Empréstimos/Dívida`, `industry›Câmbio` |
| Corretora (bolsa) | ⚑ `broker` | bolsa da empresa, fusões, investimentos pessoais | `finance›Bolsa`, `market19a›Fusões`, `wealth›Investimentos` |
| Tribunal | ⚑ `court` | disputas, processos | `business›Disputas`, `rights18›Disputas` |
| Delegacia | ⚑ `police` | polícia, fraudes e sósias | `crime›Polícia`, `fakes19` |
| Mercado negro | ⚑ `blackmkt` | mercado negro (fora do mapa até desbloquear) | `crime›Mercado negro` |
| Fachadas das facções do país | ⚑ `faction` (uma por org de `crime17` com sede no país) | falar, pagar, trair | `crime›Organizações` |
| Aeroporto / porto / estação | ⚑ `transport`, por era (§1.3.1) | viajar, vistos, levar turnê ao exterior → abre Mundo | `regions19›Vistos` |
| Casa de leilões | ⚑ `auction` | relíquias, catálogos/masters à venda, leilões por artistas | `lendas›Relíquias/Acervo`, `market›Leilões` |
| Escritórios (advocacia, contabilidade, empresários, editoras) | `office` (existe) | advogado (jurídico, direitos), contador (impostos/DRE), empresários livres, editoras de terceiros | `business›Jurídico`, `rights18`, `managers14`, `songmkt27›Ofertas` |
| Prefeitura / câmara | ⚑ `cityhall` | censura, IA, filantropia, "cidade da música", greves locais | `society18`, `regions19›Greves/Comuna` |
| Fábrica de discos | `plant` (seu) ou ⚑ fábrica de terceiros | prensagem, estoque | `supply18`, `industry›Fábricas` |
| Hotel | `hotel` (existe) | hospedagem de turnê/artistas de fora, encontros | `night14` (encontros) |
| Escola de música | `school` (seu) / ⚑ de terceiros | escolas, camps | `talent18›Escolas` |
| Sua casa | `home` (existe) | entra em **Você** | — |
| Seus prédios de carreira | `KIND18` | a casa da carreira (§4) | `cp17-*` |

#### 1.3.1 Portão de era do transporte
`< 1920`: estação de trem + porto · `1920–1957`: + aeródromo (voo caro, poucas rotas) · `≥ 1958`: aeroporto (era a
jato). Antes do prédio existir a ação "viajar" fica no porto/estação; nunca some. Testar com `era1889` e 1962.

### 1.4 Mundo — mapa-múndi (área `world`, aba `MAPTAB27`)
Camadas (botões no canto, já existe `layer` na rota): **Turnês** (`shows›Turnês`, `tour12`/`cp17-booking`) ·
**Filiais** (filiais da `hq`/branches, escritórios no exterior) · **Mercados e regiões** (`regions18`, `regions19`
política, `world›Países/Cenas`, `market19a›Cenas`) · **Festivais** (`festivals` Circuito/Mapa, `cp17-festival`) ·
**Facções estrangeiras** (orgs de `crime17` de outros países; ação só "via intermediário") · **Cultura** (`movements`,
`lendas` Panteão/Cidades/Épocas/Linha do tempo) · painel lateral **Este mês** (`mundo27` + `world17` + `dm18›rixas
do mundo`). As 20 abas região/gênero do `world` viram filtro da camada.
VD: `world` (todas as abas), `regions18`, `regions19`, `festivals`, `movements`, `lendas`.

### 1.5 Você — interior da sua casa (área `you`, aba nova `home30`)
Cômodos: **Sala** (perfil, personalidade, decisões: `you`) · **Quarto/closet** (aparência; `you›Aparência`) ·
**Família** (porta-retratos: `personal` amor/família/filhos/herdeiros, `family29`) · **Agenda de contatos**
(conhecidos/amigos/rivais: `personal›Relações`, relações de `people` com você) · **Cofre** (patrimônio: `wealth`
Patrimônio/Bens/Imóveis; investimentos → link Corretora) · **Escritório em casa** (`careers`, `ventures`,
`shared18`: carteira de negócios, sócios, "começar carreira") · **Estante** (`scenes17` álbum de cenas,
`you›Diário` → mesmo caderno do Hoje) · **Porta** → sair à noite (Cidade › Bar/Hotel, `night14`).
VD: `you`, `personal`, `wealth`, `careers`.

### 1.6 Listas — páginas de texto (área nova `lists30`, ≤ 6 abas + Mais)
1. **Artistas** — lista única com escopo Seu elenco / Conhecidos (padrão) / Radar / Mundo todo / Depois do palco;
   donos: `directory`, `knownacts27`, `artists` (tabela), `market›Lista`.
2. **Contratos e direitos** — `contracts19`, `artist18`, `rights18` (Obras, Autorizações, Extratos), Profissionais
   (`managers14`, `producers15`, músicos de sessão).
3. **Finanças** — `finance` (Resumo com o trio S13 **só aqui**, DRE e caixa, Capital e dívida, Balanço),
   `business` (Grupo, Empresas, Subselos), `supply18` (Estoque, Acordos).
4. **Paradas** — `charts` (8 sub-paradas num seletor), `society18›Paradas`, `media›Paradas e metodologia`,
   `market19a›Certificados`.
5. **Calendário completo** — `calendar19` (capacidade + 26 semanas), `cal17`, `agenda17›Agenda`.
6. **Dados de mercado** — `industry`, `labels›Ranking`, `regions18` (tabelas), `market19a` (Pesquisa, Plataformas e 360).
   Mais ▾: **Premiações** (`awards` cerimônias/indicados, `rockhall` lista completa) · **Carreiras** (as telas de
   carreira essencialmente tabulares: `cp17-platform` métricas, `cp17-publisher` catálogo de obras, `cp17-booking`
   roteiro, `cp17-critic` pauta) · **Crônica** (`lendas›Jornal/Livro`, `dm18`).

### 1.7 Buscar (Ctrl+K) e Opções
- Buscar indexa: páginas (ids antigos e rótulos antigos como sinônimos), 315 abas (`tabsreg27`), INTENTS29, SCREENS29
  e **lugares** (PLACE30: "banco", "tribunal", "garagem"…). Vazio = Índice inteiro (`openIndex29`) agrupado pelas
  5 entradas-mundo + Listas, com motivo de indisponibilidade. O botão "Índice" sai do menu.
- Opções: Arquivo (saves17), Campanha (campaign29), Ajuda (`tut18`), tema, idioma, critérios do Avançar,
  **Menu completo** (toggle).

---

## 2. Mapeamento de TODAS as áreas atuais (80 + `desk`/`inbox` + 12 `cp17-*`)

Coluna "Casa nova" = entrada › lugar › aba/objeto. "O1" = onde aparece como cartão-placeholder na O1 (a entrada).
"Onda" = quando a cena real absorve.

### 2.1 Hoje / Sede / Projetos
| id | Casa nova | O1 sob | Onda | Nota |
|---|---|---|---|---|
| `cockpit` | Hoje › Mesa do chefe (padrão) | Hoje | O2 | aba "Mesa do mês" (`ck20=desk`) dissolve: blocos → Mesa/Sede/Mundo (tabela §4.2 do PLANO) |
| `desk` (alias) | Hoje › Mesa › VD "blocos do mês" | Hoje | O2 | REDIRECT29 retarget: `{area:'cockpit', tab:['ck20','panel']}` após dissolver |
| `inbox` (alias) | Hoje › Mesa › Bandeja | Hoje | O2 | REDIRECT29 mantém `ck20=inbox` |
| `plan` | Hoje › Mesa › Linha do tempo (filtro Compromissos) | Hoje | O2 | página some em O7 (alias → cockpit, `ck20=timeline`) |
| `goals` | Hoje › Mesa › Quadro de metas; Museu → Sede › Troféus | Hoje | O2 | |
| `diary` | Hoje › Mesa › Caderno | Hoje | O2 | `you›Diário` abre o mesmo caderno |
| `dm18` ⚑ | Hoje › Mesa › pasta "Fios do Mestre" (badge = fios esperando) | Hoje | O2 | sem lugar físico natural; rixas do mundo vão ao painel Este mês |
| `sede25` | Sede (cena padrão) | Sede | O1 | já é cena; vira a área-padrão da entrada |
| `hq` | Sede › VD "Obras e operação" (Operação, Estrutura, Equipamentos, Expansão); História → Troféus | Sede | O3 | "Tudo (especialista)" exclui (checklist §7 do PLANO) |
| `company` | Sede › Escritório › Estrutura e cultura | Sede | O3 | |
| `team` | Sede › Escritório › Equipe (prancheta de delegação) | Sede | O3 | |
| `firm19` | Sede › Escritório › Crises e seguros / Cultura / Naming | Sede | O3 | Seguros: link a Listas › Finanças |
| `agenda17` | Agenda → Hoje › Linha do tempo; Você → Você › Sala; Contratar/Freelancers → Sede › Escritório; Músicos de estúdio → Sede › Estúdio | Sede | O2/O3 | VD continua `agenda17` |
| `long18` | Sede › Sala de reunião (Caminhos, Doutrinas, Políticas, Dificuldade); memórias → Troféus | Sede | O3 | |
| `artists` | Sede › Lounge (cena); VD tabela → Listas › Artistas (escopo Seu elenco) | Sede | O3 | ficha do artista (inspetor) inalterada |
| `people` | Sede › Lounge › Saúde / Relações / Segredos / Cartas; Equipe → Escritório | Sede | O3 | |
| `dyn18` | Sede › Lounge › Relações e bandas | Sede | O3 | |
| `market` | Sede › A&R (Funil, Decidir, Olheiros, Dossiês) + Cidade › Bar (Procurar, Feiras) + Cidade › Leilões (Leilões) | Sede | O3/O4 | |
| `project` | Sede › Rua dos projetos | Sede | O3 | |
| `creation` | Sede › Rua dos projetos › passo "Compor" (sala de composição no Estúdio) | Sede | O3 | 9 abas → 4 + blocos recolhidos |
| `songmkt27` | Sede › Arquivo › armário Editora (Comprar/Vender/Licenças); Ofertas também em Cidade › Escritórios | Sede | O3 | |
| `studio` | Sede › Estúdio | Sede | O1 | spot já existe (`hq25model.studio`) |
| `releases` | Sede › Vitrine de lançamentos | Sede | O3 | |
| `catalog` | Sede › Arquivo › armário Masters (Catálogo, Retrospectiva); Sync → armário Imagem; História → Troféus | Sede | O3 | |
| `tribute19` | Sede › Arquivo › Imagem › Tributos e sucesso tardio | Sede | O3 | |
| `media19` | Sede › Arquivo › Imagem › Remix/Publicidade/Trilhas | Sede | O3 | |
| `identity` | Sede (carreira gravadora) › Escritório › Identidade (= aba de `cp17-label`) | Sede | O3 | ALIAS17 |
| `biz17` | idem, aba `biz17` de `cp17-label` | Sede | O3 | ALIAS17 |

### 2.2 Cidade
| id | Casa nova | O1 sob | Onda | Nota |
|---|---|---|---|---|
| `campus18` | Cidade (cena padrão) | Cidade | O1 | já é cena |
| `shows` | Cidade › Casas de show (Agenda local, Operação, Negócios ao vivo); Turnês → Mundo | Cidade | O4 | "Tudo" exclui |
| `cal17` | Listas › Calendário (filtro Shows) | Listas | O1 | página some em O7 (alias) |
| `live19` | Cidade › Casas de show › Ingressos e temporada, Festival grátis, Beneficentes, Concursos; Vinil → Loja de discos | Cidade | O4 | |
| `news17` | Cidade › Jornal › Notícias e boatos | Cidade | O4 | |
| `known27` | Cidade › Jornal › Notícias e boatos (verdade/fonte) — **funde** com `news17` | Cidade | O4 | página some em O7 |
| `media` | Cidade › Jornal (Imprensa e crítica, Público) + Rádio (formatos, Jabá) + TV ⚑ (Clipes) + Sede › Marketing (Campanhas); Paradas e metodologia → Listas › Paradas | Cidade | O4 | VD mantém as 8 abas |
| `critics` | Cidade › Jornal › Críticos (funde `zines19›Críticos e editores`) | Cidade | O4 | |
| `zines19` | Cidade › Jornal › banca de fanzines; Sua revista → casa da carreira mídia | Cidade | O4 | |
| `labels` | Cidade › Gravadoras rivais (sala do CEO; Rivais, Estratégias); Ranking → Listas › Dados de mercado | Cidade | O4 | |
| `world17` | Cidade › Gravadoras rivais › "Por quê" + Mundo › painel Este mês | Mundo | O5 | |
| `managers14` | Cidade › Escritórios (empresários) + Listas › Contratos › Profissionais | Cidade | O4 | |
| `producers15` | Cidade › Estúdios de terceiros + Listas › Profissionais | Cidade | O4 | |
| `talent18` | Descoberta → Bar; Escolas → Escola ⚑; TV → TV ⚑; Banda da casa → Sede › Ensaio; Composição → Sede › Estúdio | Cidade | O4 | |
| `knownacts27` | Listas › Artistas (escopo Conhecidos/Radar) + Cidade › Bar › Cena local | Listas | O1 | |
| `after18` ⚑ | Cidade › Bar › "Voltas e segundas carreiras" (cortejados por rivais = ação) + Listas › Artistas (escopo Depois do palco) | Cidade | O4 | sem prédio natural; bar = onde ex-artistas aparecem |
| `night14` | Cidade › Bar/Hotel › Sair à noite (porta da casa em Você também leva) | Você | O4 | |
| `crime` | Organizações → fachadas das facções; Mercado negro → Mercado negro; Polícia → Delegacia; Planos/Espionagem/Histórico → Sede › Mural do submundo; estrangeiras → Mundo | Cidade | O4 | os 3 cartões de topo excluem |
| `fakes19` | Cidade › Delegacia › Fraudes e sósias | Cidade | O4 | |
| `society18` ⚑ | Cidade › Prefeitura ⚑ (IA, Censura, Filantropia, Cidade da música); Prêmios → Listas › Premiações; Paradas → Listas › Paradas | Cidade | O4 | prédio novo proposto |
| `supply18` | Cidade › Fábrica de discos (Prensagem, Estoque) + Loja de discos (Distribuição); Acordos/Mercado → Listas › Finanças | Cidade | O4 | `LABEL_ONLY17` mantém |
| `industry` | Listas › Dados de mercado (dono); Fábricas → Fábrica; Lojas → Loja de discos; Câmbio → Banco; Conselho → Escritórios | Listas | O1 | |
| `rights18` | Listas › Contratos e direitos (dono); Disputas → Tribunal; Editora → Sede › Arquivo › Editora | Listas | O1 | |
| `business` | Grupo/Empresas/Subselos/Catálogo → Listas › Finanças; Era e estratégia/Estrutura×era/Adoção → Sede › Reunião; Jurídico → Escritórios (advocacia); Disputas → Tribunal; Direitos → Listas › Contratos; Marcas e sync → Sede › Arquivo › Imagem; "Por que deu nisso?" → botão `why18` | Listas | O3/O4 | VD mantém as 12 abas até O7 |
| `finance` | Listas › Finanças (dono); Empréstimos/Dívida → Banco; Bolsa → Corretora | Listas | O1 | o spot `office` da sede deixa de abrir `finance` (abre Equipe) |
| `contracts19` | Listas › Contratos e direitos (Mercado, Cláusulas, Gestão e masters, Histórico; Empresários → Profissionais) + Sede › Jurídico (renovações pendentes) | Listas | O1/O3 | |
| `directory` | Listas › Artistas (escopo Mundo todo; ações rápidas e 6 filtros preservados) | Listas | O1 | página some em O7 (alias) |
| `calendar19` | Listas › Calendário completo (dono; capacidade + 26 semanas) + próximos 12 sem. na Linha do tempo do Hoje | Listas | O1 | |

### 2.3 Mundo
| id | Casa nova | O1 sob | Onda | Nota |
|---|---|---|---|---|
| `world` | Mundo (mapa; camadas) | Mundo | O1 | 25 abas → mapa + filtros; VD mantém História/leis, Países, Marcos |
| `mundo27` | Mundo › painel Este mês (+ itens que tocam você na Linha do tempo do Hoje) | Mundo | O5 | |
| `regions18` | Mundo › camada Mercados e regiões (Regiões, Submercado, Circuitos, K-pop, Japão, Afinidades); tabelas → Listas › Dados | Mundo | O5 | |
| `regions19` | Mundo › camada Política (Selos regionais, Comuna, Greves, Campanhas, Celeiros); Vistos → Cidade › Transporte | Mundo | O5 | |
| `market19a` | Listas › Dados de mercado (Certificados → Paradas, Pesquisa, Plataformas e 360); Cenas → Mundo; Fusões → Corretora | Listas | O1 | |
| `festivals` | Mundo › camada Festivais (Circuito, Mapa) | Mundo | O5 | |
| `movements` | Mundo › camada Cultura › Movimentos | Mundo | O5 | |
| `lendas` | Relíquias/Acervo/Espólio/Póstumo → Sede › Troféus; Panteão/Linha do tempo/Cidades/Épocas/Biografias → Mundo › Cultura; Jornal/Livro → Listas › Crônica; compra → Cidade › Leilões | Mundo | O3/O5 | 11 abas → 3 lugares |
| `awards` | Sede › Troféus (seus prêmios) + Listas › Premiações (cerimônias, indicados) | Sede | O3 | |
| `rockhall` | Sede › Troféus › Hall da Fama (seu elenco) + Listas › Premiações › Hall da Fama | Sede | O3 | ⚑ alternativa: Cidade › Museu |
| `charts` | Listas › Paradas (dono); Rádio/Loja de discos mostram o top local | Listas | O1 | |

### 2.4 Você / utilidades
| id | Casa nova | O1 sob | Onda | Nota |
|---|---|---|---|---|
| `you` | Você › Sala (Perfil, Personalidade, Decisões, Carreira musical) / Closet (Aparência) / Estante (Diário = caderno do Hoje) | Você | O6 | |
| `personal` | Você › Família / Agenda de contatos / Saúde e fé / Rotinas | Você | O6 | |
| `wealth` | Você › Cofre (Patrimônio, Bens, Imóveis, Equipe pessoal); Loja → Cidade (lojas); Investimentos → Corretora (renomear "Investimentos pessoais") | Você | O6 | |
| `scenes17` | Você › Estante › Álbum de cenas | Você | O6 | |
| `careers` | Você › Escritório em casa › Carreiras ("começar carreira") | Você | O6 | |
| `ventures` | Você › Escritório em casa › Empreendimentos | Você | O6 | |
| `shared18` | Você › Escritório em casa › Sócios | Você | O6 | renomear "Sócios" (≠ "Sociedade") |
| `tut18` | Opções › Ajuda (+ "?" em cada cena) | Opções | O1 | sai da entrada Você |

### 2.5 Telas absorvidas por carreira (ALIAS17) e páginas `cp17-*`
| id | Casa nova (casa da carreira, §4) | O1 sob | Onda |
|---|---|---|---|
| `management` → `cp17-manager` | Cidade › Escritórios › Seu escritório de empresário (ou Sede, se for a carreira principal) | Sede/Cidade | O4 |
| `tour12` → `cp17-booking` | Cidade › Sua agência (`KIND18.booking`) + Mundo › Turnês | Mundo | O4/O5 |
| `studio12` → `cp17-studio` | Cidade › Estúdios › Seu estúdio | Cidade | O4 |
| `publishing16` → `cp17-publisher` | Cidade › Escritórios › Sua editora (`KIND18.publisher`) | Cidade | O4 |
| `outlets16` → `cp17-media` | Cidade › Jornal/Rádio/TV › Seu veículo (`KIND18.media`) | Cidade | O4 |
| `platform16` → `cp17-platform` | Cidade › Escritório da plataforma (`KIND18.platform`, interior "sala de servidores") ⚑ | Cidade | O4 |
| `identity`, `biz17` → `cp17-label` | Sede | Sede | O3 |
| `cp17-label` | Sede (cena) | Sede | O1 |
| `cp17-musician` | Sede-variante "QG da banda" (Sala de ensaio + camarim) se for a principal; senão Cidade › Sala de ensaio › Sua banda; contrato → Listas › Contratos (`artist18`) | Sede | O3 |
| `artist18` | Listas › Contratos › "Seu contrato (artista)" (só com carreira de músico) + camarim do QG da banda | Listas | O1 |
| `cp17-manager` | ver `management` | Sede/Cidade | O4 |
| `cp17-booking` | ver `tour12` | Mundo | O4 |
| `cp17-festival` | Mundo › Festivais › Seu festival (terreno, line-up, palco) + prédio `KIND18.fest` na Cidade | Mundo | O5 |
| `cp17-venue` | Cidade › Casas de show › Sua casa (interior `ownPlace27`) | Cidade | O4 |
| `cp17-studio` | ver `studio12` | Cidade | O4 |
| `cp17-publisher` | ver `publishing16` | Cidade | O4 |
| `cp17-media` | ver `outlets16` | Cidade | O4 |
| `cp17-platform` | ver `platform16` | Cidade | O4 |
| `cp17-screen` ⚑ | Cidade › Teatro/estúdio de cinema ⚑ (novo `PlaceK27 'screen'`) | Cidade | O4 |
| `cp17-critic` ⚑ | Cidade › Jornal › "Sua mesa na redação" | Cidade | O4 |

**Conferência:** 80 áreas + `desk` + `inbox` + 12 `cp17-*` = 94 linhas; todas têm casa. ⚑ sem lugar natural:
`dm18`, `after18`, `society18`, `rockhall` (alternativa), `cp17-screen`, `cp17-critic`, `cp17-platform` — propostas
acima. Lugares novos a construir: Troféus, Mural, Garagem, Rua dos projetos, Vitrine (Sede); banco, corretora,
tribunal, delegacia, mercado negro, facções, transporte, leilões, prefeitura, TV, teatro/cinema, fábrica e escola de
terceiros (Cidade).

---

## 3. O que é EXCLUÍDO (redundante)

Do PLANO.md §4.3, continua valendo: (1) Essencial × Completa (`view27`, `viewToggle27`, `views27`, `VIEW_LABEL27`,
`HUBS27` como menu) — trocado pelo toggle "Menu completo"; (2) "Tudo (especialista)" de `hq` e `shows`; (3) aba
"Mesa do mês"; (5) S13 duplicado (só Listas › Finanças); (6) KPIs do cabeçalho que repetem a barra do topo; (7) cartão
"Caixa de entrada" e "+1 decisão" no Painel; (8) marca e chip de data na barra do topo; (9) abas e sub-abas na árvore
lateral; (10) cartões-atalho do `screenTop29`; (11) árvores mortas `careernav13/14/16`, `GROUPS`/`HINT17`, `NAV17` como
menu (viram só tabelas de alias/ícone/tecla).

Novos nesta versão:
12. **As 8 seções como menu** (`SECTIONS25`/`GROUPS29`): ficam só dentro do "Menu completo".
13. **"Suas carreiras" repetida em cada seção** e a seção "Sede": a carreira mora no seu lugar (§4).
14. **Botões Índice, Arquivo, Campanha** da lateral (vão para Buscar e Opções).
15. **Páginas que viram filtro** (em O7, como alias): `plan`, `cal17`, `known27`, `directory`, `desk`.
16. **Pontos duplicados da cena da sede**: o spot `office` deixa de abrir `finance` (vai a Equipe) e `lobby` deixa de
    ser porta para a caixa quando a Bandeja está a um clique (fica só como atalho visual).
17. **Miniatura do bairro** na Mesa (a Cidade é entrada de menu).

---

## 4. Carreiras: a "casa" de cada uma

Regra: a entrada **Sede** abre a casa da **carreira principal** (rótulo da entrada muda: "Sede", "Sua casa de shows",
"Seu estúdio"…; ícone de `CAREER_PAGE17`). Carreiras secundárias são prédios **seus** na Cidade com coroa ★ e
aparecem no seletor **⇄ Suas casas** (condicional do menu). A página `cp17-*` é sempre o VD da casa.

| Carreira (ORDER17) | Casa (cena) | Objetos-chave na cena | VD |
|---|---|---|---|
| label | Sede em corte | salas §1.2 | `cp17-label` |
| musician | QG da banda (sala de ensaio + camarim + van) | ensaio, repertório, contrato, agenda de shows | `cp17-musician`, `artist18` |
| manager | Escritório do empresário (andar alugado) | quadro de clientes, telefone de propostas, agenda | `cp17-manager` (`management`) |
| booking (agência) | Agência (`KIND18.booking`) + mapa de rotas | quadro de turnês, contratos de casas, ônibus | `cp17-booking` (`tour12`) |
| festival | Terreno do festival (Mundo › Festivais e prédio `fest`) | palco, line-up, bilheteria, estrutura | `cp17-festival` |
| venue | Interior da sua casa de shows (`ownPlace27`) | palco, bar, bilheteria, agenda da casa | `cp17-venue` |
| studio (produtor) | Seu estúdio (interior) | salas, equipamento, clientes, músicos de sessão | `cp17-studio` (`studio12`) |
| publisher | Sua editora (escritório + arquivo de obras) | arquivo de obras, licenças, compositores | `cp17-publisher` (`publishing16`) |
| media | Redação/emissora própria | pauta, audiência, anunciantes, revista | `cp17-media` (`outlets16`) |
| platform | Escritório da plataforma (sala de servidores) ⚑ | catálogo, assinantes, acordos | `cp17-platform` (`platform16`) |
| screen | Teatro/estúdio de cinema ⚑ | produções, trilhas, elenco | `cp17-screen` |
| critic | Mesa na redação do jornal ⚑ | pauta, críticas, reputação | `cp17-critic` |

Sem selo (ex.: começa como músico), Sede = QG da banda e as salas de selo ficam ausentes (não esmaecidas).

---

## 5. Reformulações mantidas do PLANO.md (§4.4), adaptadas

1. **Um cabeçalho só** (`pageHeader27` + `pageTitle21` + `screenTop29` → um componente): título + 1 linha + ≤ 3 KPIs
   exclusivos; ≤ 120 px. Nas cenas o cabeçalho é a própria cena; o "ver detalhes" abre a página com esse cabeçalho.
2. **Migalhas de 2 níveis**: Entrada › Lugar (ex.: "Cidade › Banco"); a aba atual aparece só na faixa de abas.
   ←/→, ☆, 🕘 num menu "⋯".
3. **≤ 6 abas + "Mais ▾"** em toda página (regra global de `shownTabs27`, com teste).
4. **Barra do topo enxuta**: data · caixa (Δ) · ★ · [▶ Avançar ▾] (Semana/Trimestre/Até…/Critérios/Desfazer no ▾);
   tema e ⚙ → Opções.
5. **Menos pílulas**: ≤ 1 por linha; gênero = cor/ícone; "pioneiro" = ★ com tooltip; listas grandes → linhas
   compactas + clique direito (ctx27/29).
6. **Contadores só onde há ação pendente** (regra r23 estendida): badges do menu e pulso de lugar vêm só de
   `pending30` (§6); nada de contador informativo.
7. **Um nome por coisa**: "Sede" (prédio da carreira principal) × "Cidade" (bairro/campus18; some "Nosso mundo" do
   menu, fica como título da cena) × "Mundo" (mapa); "Bolsa da empresa" × "Investimentos pessoais"; "Sócios"
   (`shared18`) × "Sociedade" (`society18`); "Leilões" só na Casa de leilões.
8. **Divulgação progressiva**: blocos secundários recolhidos; textos longos → "?".

---

## 6. Pendências, badges e pulso

- `ps/pending30.ts` (puro): `pending30(s): Record<PlaceId30, number>` somando, por lugar, os `badge(s)` já
  registrados (`registerArea({badge})`, `registerTab({badge})`), itens da inbox18 que exigem decisão (por `go.area`),
  alertas29 com ação e prazos ≤ 2 semanas. A soma por entrada = badge do menu.
- Lugar com n > 0 **pulsa** (CSS `@keyframes`, respeita `prefers-reduced-motion`: vira contorno fixo) e mostra o número.
- Mapeamento área→lugar vem de `PLACE30` (§7), então qualquer área nova com `badge` já acende o lugar certo.
- Teste: soma das entradas = soma dos lugares; item informativo não conta.

---

## 7. Compatibilidade

- **Fonte única** `ps/place30model.ts`:
  `PLACE30: Record<areaId, { entry: 'hoje'|'sede'|'cidade'|'mundo'|'voce'|'listas'|'opcoes'; place: PlaceId30;
  tab?: [string, string]; wave: number; era?: [number, number]; career?: string }>` — gerado da tabela §2 (uma linha
  por id; ids com vários lugares têm `place` principal + `also: PlaceId30[]`).
- **Ids de área não mudam.** `go({area})` continua abrindo a página (VD) direto — links profundos, clique direito,
  pins, `#/área/faixa=aba`, KEY17 seguem iguais. Só a migalha passa a mostrar "Entrada › Lugar".
- **Entradas reaproveitam áreas**: Hoje=`cockpit`, Sede=`sede25` (ou casa da carreira), Cidade=`campus18`,
  Mundo=`world` + `tab:['worldHub', MAPTAB27]`, Você=`you` + aba nova `home30`, Listas=área nova `lists30`.
  Lugares têm rota `#/campus18/place=bank`, `#/sede25/room=trophy`, `#/world/layer=tours` (parâmetros novos em
  `route16`/`initRouter15`, ignorados por versões velhas).
- **ALIAS17** intacto (absorvidas → aba da carreira). **REDIRECT29** ganha, em O7: `plan→cockpit ck20=timeline`,
  `cal17→lists30 l30=calendar(filtro shows)`, `known27→news17 (filtro verdade)`, `directory→lists30 l30=artists
  (escopo mundo)`, `desk→cockpit ck20=panel`. `ALL_AREAS29` continua com todos os ids (rede de segurança).
- **Chaves de aba** existentes ficam (`business-finance`, `lendas9`, `ck20`, `worldHub`…); abas novas: `ck20=timeline`,
  `l30=artists|contracts|finance|charts|calendar|data|awards|careers|chronicle`, `you: home30`. Rodar
  `scripts/tabs27.mjs` (regera `ps/tabsreg27.ts`).
- **Teclas**: KEY17 inalterado (páginas). Entradas do menu em `Shift+1…6` (Hoje, Sede, Cidade, Mundo, Você, Listas);
  conferir colisão com teclas de `quick18`/zoom27.
- **Ctrl+K**: + entradas de lugar (rótulo, sinônimos: "banco", "empréstimo", "tribunal", "processo", "garagem",
  "ônibus", "aeroporto", "porto", "leilão"…), resultado de lugar abre a cena focada; resultados de página continuam.
  Índice = estado vazio.
- `registerArea` sem linha em `PLACE30` cai em **Listas › "Outras páginas"** (equivalente ao `extra` de
  `navGroups25`) e o teste r30 avisa — nada some.
- `store17.pins/recent`: pins de página continuam; pins de lugar novos (`place:bank`).

---

## 8. Rollout em ondas (cada onda jogável; nada quebra antes de a cena existir)

**O0 — modelo (sem UI):** `place30model.ts` (tabela §2), `pending30.ts`, `menu30.ts` (entradas, rótulo por
carreira). Teste r30: todo id de `ALL_AREAS29` + `cp17-*` tem `PLACE30`; ≤ 10 entradas; cada lugar tem VD válido.

**O1 — menu novo com placeholders (obrigatório antes de qualquer cena):**
- Lateral = 8 entradas + condicionais; "Menu completo" (árvore clássica `tree27` sem abas) em Opções, desligado.
- Cada entrada abre sua área-base existente (cockpit / sede25 / campus18 / world-mapa / you) **+ faixa "Lugares"**
  abaixo da cena: um cartão por lugar de §1 com ícone, badge (`pending30`) e botão **"ver detalhes"** que abre a
  página antiga com a aba certa. Lugares ainda sem cena aparecem só como cartão ("na cena em breve" — sem texto de
  promessa; só o cartão). Listas = `lists30` com abas que embutem as páginas atuais (render da área dentro da aba).
- Buscar absorve Índice; Arquivo/Campanha/Ajuda → Opções; barra do topo enxuta; cabeçalho único; ≤ 6 abas + Mais;
  some Essencial × Completa.
- Spots atuais da Sede/Cidade passam a apontar para os destinos da §2 (ex.: `office` → `team`).

**O2 — Hoje:** Mesa do chefe (linha do tempo unificada, bandeja, quadro de metas, caderno, Fios do Mestre); "Mesa do
mês" dissolvida.

**O3 — Sede:** salas novas (Troféus, Mural, Garagem, Rua dos projetos, Vitrine, Arquivo com 3 armários), prancheta
de delegação; casas de carreira label/musician.

**O4 — Cidade:** novos `PlaceK27` (bank, broker, court, police, blackmkt, faction, transport por era, auction,
cityhall, tvstation, screen) com `placeActs27`; interiores das casas de carreira (venue, studio, publisher, media,
platform, booking, manager, critic).

**O5 — Mundo:** camadas Turnês, Filiais, Mercados, Política, Festivais, Facções estrangeiras (via intermediário),
Cultura; painel Este mês (mundo27 + world17).

**O6 — Você:** interior da casa (`home30`), cômodos §1.5.

**O7 — fusões e exclusões:** páginas-filtro viram alias (§3 item 15), "Tudo (especialista)" sai (checklist §7 do
PLANO), `business`/`lendas`/`world`/`media` encolhem para as abas que sobraram; `NAV17`/`careernav*` viram só tabelas.

**O8 — densidade e medição:** pílulas, listas compactas, blocos recolhidos; re-rodar `shots.mjs` (metas do PLANO §5.6
+ "toda entrada: ≤ 2 cliques até qualquer função").

---

## 9. Testes afetados

Estruturais (reescrever/adaptar):
- `tests/r25-nav.test.ts` (8 seções, `home25`, `sectionIdOf25`) — mover para o modo "Menu completo".
- `tests/r27-ux.test.ts` (HUBS27, `views27`, `resolveHub27`) — remover partes da vista Essencial.
- `tests/r27-nav.test.ts`, `tests/r27-ui.test.ts`, `tests/r19-ux.test.ts`, `tests/r20-g6.test.ts`,
  `tests/r18-tutorial.test.ts` (âncoras de tutorial apontam para itens do menu).
- `tests/r29-reorg.test.ts` — **manter** `ALL_AREAS29`; atualizar SCREENS29/DESTS29 se o grupo virar entrada.
- `tests/r17-nav.test.ts` (NAV17, ICON17, KEY17 únicos) — + teclas Shift das entradas.
- `tests/r16-menus.test.ts`, `tests/r14-shell.test.ts`, `tests/r13-careerui.test.ts`, `tests/r15-nav.test.ts`.
- `tests/r27-cockpit.test.ts` (abas `ck20` panel/inbox/desk → panel/inbox/timeline).
Cenas (spots/destinos mudam):
- `tests/r25-hq.test.ts`, `tests/r27-hqpx.test.ts`, `tests/r27-hqrooms.test.ts` (spot `office`→`team`, salas novas).
- `tests/r18-campus.test.ts`, `tests/r27-city.test.ts`, `tests/r27-city2.test.ts` (novos `PlaceK27`, portão de era).
- `tests/r27-ctx.test.ts` (clique direito: destinos continuam por id; conferir rótulos de migalha).
- `tests/r14-capacity.test.ts` só se a Capacidade sair do `calendar19`.
Por id em string: lista do PLANO §8 (business 16, media 12, hq 11, awards 11, finance 10…) — com ids e ALIAS
preservados, quebram só os que conferem árvore, lista de abas ou texto de cabeçalho.
Novo: `tests/r30-world-nav.test.ts` — cobertura de `PLACE30`; ≤ 10 entradas; `pending30` (só ação conta; soma
coerente); rótulo da Sede por carreira principal; transporte por era (1889, 1940, 1962); REDIRECT29 novos abrem a aba
certa; busca acha "banco"→Cidade›Banco e "Índice" vazio lista tudo.
Goldens de simulação (r27-p2a/p2b, sim.test) não são afetados (só interface), **exceto** se O4 criar estado novo em
`place27` — nesse caso versionar em `s.x4` sem efeito em sim.
