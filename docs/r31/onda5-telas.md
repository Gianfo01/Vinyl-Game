# Onda 5 · especificação de cada tela no padrão aprovado

> **Gerado** por `src/ui/r31/spec5.ts` a partir de `src/ui/r31/objects5.ts`, `src/ui/r31/keys5.ts` e `src/ui/ps/tabsreg27.ts`.
> Não edite à mão: mude o código e rode `UPDATE5=1 npx vitest run tests/r31-w5-tec.test.ts`. O teste falha se este arquivo ficar velho.

Padrão aprovado (PLANO, onda 5): cada tela é um objeto do mundo aberto por cima da cena, com as abas de hoje como marcadores do
próprio objeto; topo fixo (data, caixa, fama, avançar); embaixo os botões de viagem e o bolso; Esc fecha; cada objeto tem tecla própria.
Nesta etapa (TEC) o objeto ainda abre a página antiga (`open5`); a lista abaixo é o endereço de cada página no mundo novo.

Inventário: **109 páginas** registradas hoje (base + `registerArea` + virtuais) e **314 abas** (`TABS_REG27`).
82 objetos; 3 páginas ficam no menu de pausa; 34 páginas não estavam no mapa (marcadas com ⚑).

Como ler: **Lugar** = região › cômodo/prédio; **Papel** = a moldura que abre; **Marcadores** = abas que ficam no papel
(as que chegam de outra página vêm marcadas com ←); **"!"** = o que acende o ponto de novidade (por padrão, pendências únicas
cujo dono é uma destas páginas, `nav5.bangs5`); **Sai daqui** = abas que vão para outro objeto, para o topo ou para o índice da pausa.

## Sede

### Sede · tecla ⇧1 (viagem: sede)
- **Lugar:** Sede › Sede (cena inteira)
- **Papel:** cena em pixel art
- **Páginas (dono):** `sede25` (Sede em corte) ⚑, `sala31` (Sala da sede) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** soma dos "!" dos objetos da sede
- **Nota:** Botão de viagem; H também volta à sede. Com outra carreira principal, a sede é o prédio dessa carreira.

### Porta da rua · tecla ⇧3 (viagem: cidade)
- **Lugar:** Sede › Recepção
- **Papel:** cena em pixel art
- **Atalho para:** `campus18` (Nosso mundo) (dono: Cidade)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Mapa-múndi na parede · tecla ⇧4 (viagem: mundo)
- **Lugar:** Sede › Recepção
- **Papel:** mapa
- **Atalho para:** `world` (Mundo) › map27 (dono: Mapa-múndi)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Secretária eletrônica (recados) · tecla ⇧E
- **Lugar:** Sede › Recepção
- **Papel:** bloco de recados
- **Atalho para:** `cockpit` (Hoje) › panel (dono: Mesa do mês)
- **Marcadores:** — (papel de uma folha só)
- **"!":** avisos novos da fila de atenção
- **Forma por época:** 1889–1969 Bloco de recados da recepcionista · 1970–2009 Secretária eletrônica que pisca · 2010–2040 Notificações no celular
- **Nota:** Avisos do mês, cada um com "ir até lá".

### Chaveiro (suas casas) · tecla Tab (troca de casa (várias carreiras ativas))
- **Lugar:** Sede › Recepção
- **Papel:** cena em pixel art
- **Marcadores:** — (papel de uma folha só)
- **"!":** —
- **Nota:** Aparece com 2+ carreiras ativas; Tab troca de casa.

### Mesa do mês · tecla 1
- **Lugar:** Sede › Sua sala
- **Papel:** cena em pixel art
- **Páginas (dono):** `cockpit` (Hoje) ⚑, `desk` (Mesa do mês)
- **Marcadores:** Mesa do mês
- **"!":** decisões do mês (pendências "decision")
- **Sai daqui:** Painel → topo (HUD) · Caixa de entrada → Correspondência

### Correspondência · tecla E
- **Lugar:** Sede › Sua sala
- **Papel:** correspondência da época
- **Páginas (dono):** `inbox` (Caixa de entrada)
- **Marcadores:** ← Caixa de entrada
- **"!":** mensagens que pedem resposta (pendências "inbox:*")
- **Forma por época:** 1889–1919 Escrivaninha com envelopes · 1920–1969 Cartas e telegramas · 1970–1989 Telex e fax · 1990–2009 Computador · 2010–2040 Celular e app
- **Nota:** Mesmos filtros, respostas e teclas em qualquer época; muda só a forma.

### Quadro de planejamento · tecla C
- **Lugar:** Sede › Sua sala
- **Papel:** quadro na parede
- **Páginas (dono):** `plan` (Central)
- **Marcadores:** — (papel de uma folha só)
- **"!":** conflitos de agenda do elenco
- **Nota:** Linhas = artistas, colunas = 12 meses; conflito em vermelho.

### Agenda de couro · tecla G
- **Lugar:** Sede › Sua sala
- **Papel:** agenda de couro
- **Páginas (dono):** `agenda17` (Agenda e contratações), `calendar19` (Calendário), `cal17` (Agenda de shows)
- **Marcadores:** Agenda · Você
- **"!":** prazos da semana que pedem ação (calendar19 com "act")
- **Sai daqui:** Contratar → Jornal na mesa · Freelancers → Telefone · Músicos de estúdio → Telefone
- **Nota:** As bolinhas viram horários do mês; carreira delegada aparece como "diretor cuida".

### Livro-caixa · tecla Z
- **Lugar:** Sede › Sua sala
- **Papel:** livro
- **Páginas (dono):** `finance` (Finanças)
- **Marcadores:** Posição · DRE e caixa · Empréstimos · Balanço · Bolsa · Dívida e catálogo
- **"!":** pendências com dono em Finanças (sócios, dívida)
- **Sai daqui:** Capital e sócios → Cofre da empresa · Participações em selos → Cofre da empresa

### Cofre da empresa · tecla ⇧Z
- **Lugar:** Sede › Sua sala
- **Papel:** livro
- **Atalho para:** `finance` (Finanças) › capital (dono: Livro-caixa)
- **Marcadores:** ← Capital e sócios · ← Participações em selos
- **"!":** —
- **Nota:** Marcadores Capital e sócios, Participações (vindos de Finanças).

### Arquivo de aço · tecla ⇧C
- **Lugar:** Sede › Sua sala
- **Papel:** pasta do arquivo
- **Páginas (dono):** `contracts19` (Mercado de contratos), `rights18` (Direitos), `artist18` (Contratos do artista)
- **Marcadores:** Mercado · Cláusulas · Empresários · Gestão e masters · Histórico · Resumo · Obras · Gravações e versões · Autorizações · Disputas · Sociedades · Extratos · Catálogo · Editora · Precedentes · Propostas · Seu contrato · Extrato e contas · Equipe e editora · Faça você mesmo × selo
- **"!":** contratos vencendo e cláusulas com prazo

### Fichário de contatos · tecla A
- **Lugar:** Sede › Sua sala
- **Papel:** fichário (rolodex)
- **Páginas (dono):** `directory` (Todos os artistas), `knownacts27` (Artistas conhecidos)
- **Marcadores:** Todos · Seu círculo · Radar · Famosos · Cena local · Mercado e imprensa
- **"!":** pendências com dono nestas páginas
- **Nota:** Gavetas por letra, gênero e país; marcar cartões e "comparar".

### Telefone · tecla ⇧T
- **Lugar:** Sede › Sua sala
- **Papel:** telefone e lista
- **Páginas (dono):** `managers14` (Empresários)
- **Marcadores:** ← Freelancers · ← Músicos de estúdio
- **"!":** empresários e agentes esperando resposta
- **Forma por época:** 1889–1919 Mensageiro na porta · 1920–1984 Telefone de mesa · 1985–2009 Telefone sem fio · 2010–2040 Celular

### Jornal na mesa · tecla ' (marcadores: Q)
- **Lugar:** Sede › Sua sala
- **Papel:** jornal
- **Páginas (dono):** `news17` (Notícias e boatos), `critics` (Críticos), `zines19` (Imprensa e fanzines), `fakes19` (Fraudes e sósias), `known27` (O que sabemos) ⚑
- **Marcadores:** Fanzines e cenas · Sua revista · Críticos e editores · Arquivo da mídia · Voz-fantasma e dublagem · Bandas-fantasma · Leis e história · ← Contratar
- **"!":** notícia nova sobre você ou o seu elenco

### Rádio/TV · tecla 6
- **Lugar:** Sede › Sua sala
- **Papel:** tela (rádio/TV/monitor)
- **Páginas (dono):** `media` (Mídia)
- **Marcadores:** Imprensa e crítica · Canais e reputação · Público e ouvintes · Campanhas · Rádio: formatos · Clipes e pistas · Jabá e rádio
- **"!":** campanha terminando ou convite de mídia
- **Sai daqui:** Paradas e metodologia → Revista de paradas
- **Forma por época:** 1889–1919 Gramofone · 1920–1949 Rádio de válvula · 1950–2009 Rádio e TV · 2010–2040 Tela plana

### Revista de paradas · tecla 3
- **Lugar:** Sede › Sua sala
- **Papel:** revista
- **Páginas (dono):** `charts` (Paradas)
- **Marcadores:** Parada de rádio · Parada de vendas · Parada latina · Parada country · Parada dance · Fim de ano · Todos os tempos · Parada de vídeo · Parada mundial · Rádio e outras paradas · Por país e formato · Hype · ← América do Norte · ← Europa · ← Brasil · ← América Latina e Caribe · ← Ásia e Oriente Médio · ← África · ← Oceania · ← Blues e jazz · ← Country e folk · ← R&B, soul, funk e disco · ← Rock · ← Pop · ← Latina · ← Brasil · ← Ásia e Oriente Médio · ← Europa · ← Sagrado e clássico · ← Hip hop · ← Eletrônica · ← Caribe e reggae · ← Paradas e metodologia
- **"!":** disco seu entrando ou subindo nas paradas
- **Nota:** Capítulos por parada; recebe as paradas por região e gênero do Mundo.

### Quadro de metas · tecla F
- **Lugar:** Sede › Sua sala
- **Papel:** quadro na parede
- **Páginas (dono):** `goals` (Metas)
- **Marcadores:** Cenário · Conquistas · Museu do selo
- **"!":** meta cumprida ou perto do prazo

### Diário na gaveta · tecla D
- **Lugar:** Sede › Sua sala
- **Papel:** caderno
- **Páginas (dono):** `diary` (Diário da run), `dm18` (Diário do Mestre)
- **Marcadores:** ← Diário
- **"!":** pendências com dono nestas páginas
- **Nota:** Fios do Mestre viram anotações do diário.

### Caderno na estante · tecla ⇧0
- **Lugar:** Sede › Sua sala
- **Papel:** caderno
- **Atalho para:** `business` (Negócios) › learn31 (dono: Contador)
- **Marcadores:** ← learn31 · ← results31
- **"!":** —
- **Nota:** Marcadores Aprendizados e Resultados (vindos de Empresa).

### Porta-retrato · tecla ⇧F
- **Lugar:** Sede › Sua sala
- **Papel:** álbum
- **Atalho para:** `world` (Mundo) › fossati31 (dono: Mapa-múndi)
- **Marcadores:** ← fossati31 · ← extras31
- **"!":** —
- **Nota:** Família Fossati e extras (vindos do Mundo).

### Chefe de gabinete · tecla ⇧D
- **Lugar:** Sede › Sua sala
- **Papel:** conversa com a pessoa + "ver números"
- **Páginas (dono):** `deleg31` (Delegação)
- **Marcadores:** — (papel de uma folha só)
- **"!":** relatório de delegação novo

### Quadro branco · tecla U
- **Lugar:** Sede › Sala de reunião
- **Papel:** quadro na parede
- **Páginas (dono):** `releases` (Lançamentos)
- **Marcadores:** Lançar · Rollout · Capa · Capa e vídeo
- **"!":** lançamento pronto para sair ou etapa atrasada
- **Sai daqui:** Remaster e standards → Prateleiras de masters
- **Nota:** Rollout, capa e vídeo; "abrir reunião de lançamento".

### Mesa de reunião · tecla ⇧R
- **Lugar:** Sede › Sala de reunião
- **Papel:** cena em pixel art
- **Páginas (dono):** `long18` (Rumo do selo), `car31` (Decisões de carreira)
- **Marcadores:** Caminhos · Doutrinas e decisões · Post-mortems · Ano em revista · Biografia · Casa e dinastia · Dificuldade
- **"!":** decisão de carreira ou de rumo esperando

### Maquete do prédio · tecla 2
- **Lugar:** Sede › Sala de reunião
- **Papel:** planta do prédio
- **Páginas (dono):** `hq` (Sede)
- **Marcadores:** Operação · Estrutura · Equipe e departamentos · Equipamentos e conforto · Expansão · História
- **"!":** obra terminada ou sala nova à venda
- **Sai daqui:** Tudo (especialista) → índice do menu de pausa

### Mural de cortiça · tecla 4 (marcadores: P)
- **Lugar:** Sede › A&R
- **Papel:** mural de cortiça
- **Páginas (dono):** `artists` (Artistas), `people` (Pessoas)
- **Marcadores:** Visão geral · Agenda e projetos · Carreira e contrato · Público e mídia · Integrantes e relações · Ficha completa · Elenco · Segredos · Equipe
- **"!":** artista com contrato vencendo, saúde ruim ou pedido
- **Sai daqui:** Saúde → Lounge (artistas sentados) · Relações → Lounge (artistas sentados) · Cartas e recados → Lounge (artistas sentados)
- **Nota:** Uma polaroid por artista, com selos de estado; clicar = ficha + "Ações ▾".

### Mesa do olheiro (caderno) · tecla 5
- **Lugar:** Sede › A&R
- **Papel:** caderno
- **Páginas (dono):** `market` (Talentos)
- **Marcadores:** Procurar · Funil · Decidir · Lista e relatórios · Leilões · Olheiros e equipe · Feiras · Dossiês e faro de A&R
- **"!":** contrapropostas e talentos prontos para proposta (pendências "offer_counter")

### Pilha de demos · tecla ⇧5
- **Lugar:** Sede › A&R
- **Papel:** cena em pixel art
- **Páginas (dono):** `talent18` (Talentos e formação)
- **Marcadores:** Descoberta · Composição · Banda da casa · Escolas · TV de talentos
- **"!":** demo nova

### Lounge (artistas sentados) · tecla ⇧L
- **Lugar:** Sede › Lounge
- **Papel:** cena em pixel art
- **Páginas (dono):** `dyn18` (Dinâmica)
- **Marcadores:** Elenco · Bandas · Equipe · ← Saúde · ← Relações · ← Cartas e recados
- **"!":** briga, crise de saúde ou carta nova no elenco
- **Nota:** Clicar na pessoa = ficha; recebe Saúde, Relações e Cartas do elenco.

### Mesa de som · tecla S (marcadores: 8)
- **Lugar:** Sede › Estúdio
- **Papel:** cena em pixel art
- **Páginas (dono):** `studio` (Estúdio), `creation` (Composição) ⚑
- **Marcadores:** Sessões · Covers e versões · Equipamento · Músicos de sessão · Direção sonora · Detalhes do projeto · Equipamento · Receita sonora · Divisões
- **"!":** sessão marcada para esta semana
- **Sai daqui:** Repertório → Piano · Créditos e autores → Piano · Temas e tendências → Piano · Parcerias → Piano · Encomendas → Piano

### Piano · tecla ⇧8
- **Lugar:** Sede › Estúdio
- **Papel:** caderno
- **Páginas (dono):** `songmkt27` (Mercado de canções)
- **Marcadores:** Comprar · Vender · Ofertas recebidas · Licenças (covers) · ← Repertório · ← Créditos e autores · ← Temas e tendências · ← Parcerias · ← Encomendas
- **"!":** encomenda com prazo
- **Nota:** Compor, temas, parcerias, encomendas e mercado de canções.

### Sala de gravação · tecla \
- **Lugar:** Sede › Estúdio
- **Papel:** cena em pixel art
- **Páginas (dono):** `project` (Projeto musical)
- **Marcadores:** — (papel de uma folha só)
- **"!":** projeto parado esperando você

### Palco de ensaio · tecla 9
- **Lugar:** Sede › Ensaio e palco
- **Papel:** cena em pixel art
- **Páginas (dono):** `shows` (Shows), `live19` (Palco e temporada)
- **Marcadores:** Agenda · Turnês · Políticas e operação · Negócios ao vivo · Ingressos · Festival grátis · Vinil · Temporada · Beneficentes · Concursos
- **"!":** show marcado sem equipe ou turnê para fechar
- **Sai daqui:** Tudo (especialista) → índice do menu de pausa

### Prateleiras de masters · tecla 7
- **Lugar:** Sede › Arquivo
- **Papel:** cena em pixel art
- **Páginas (dono):** `catalog` (Catálogo), `tribute19` (Tributos e covers) ⚑, `media19` (Remix, anúncios e trilhas)
- **Marcadores:** Catálogo · Sync · História do selo · Retrospectiva · Tributos · Sucesso tardio · Sua banda · Histórico · Remix e DJs · Publicidade · Trilhas e needle drops · Histórico · ← Remaster e standards
- **"!":** pedido de sync ou relançamento

### Contador · tecla B
- **Lugar:** Sede › Financeiro
- **Papel:** conversa com a pessoa + "ver números"
- **Páginas (dono):** `business` (Negócios)
- **Marcadores:** Grupo e consolidado · Era e estratégia · Estrutura x era · Subselos · Empresas · Catálogo · Jurídico · Marcas e sync · Disputas · Por que deu nisso? · Direitos · Adoção e futuro
- **"!":** pendências com dono em Empresa (sócios: soc31)

### Quadro de funcionários · tecla T (marcadores: 0)
- **Lugar:** Sede › RH
- **Papel:** quadro na parede
- **Páginas (dono):** `team` (Equipe e ritmo), `company` (Empresa), `firm19` (Crises, seguros e cultura)
- **Marcadores:** Cancelamento · Seguros e saúde · Cultura · Naming rights
- **"!":** funcionário pedindo aumento ou saindo

### Gráficos na parede · tecla I
- **Lugar:** Sede › Pesquisa
- **Papel:** quadro na parede
- **Páginas (dono):** `industry` (Indústria), `market19a` (Mercado: certificados e cenas)
- **Marcadores:** Fábricas e suprimentos · Lojas · Distribuição e preço · Pesquisa · Mídia e empresas · Conselho · Câmbio · Certificados · Pesquisa · Cenas · Plataformas e 360 · Fusões
- **"!":** pendências com dono nestas páginas

### Estante de troféus · tecla O (marcadores: R)
- **Lugar:** Sede › Corredor
- **Papel:** cena em pixel art
- **Páginas (dono):** `awards` (Premiações), `rockhall` (Hall da Fama)
- **Marcadores:** — (papel de uma folha só)
- **"!":** indicação ou prêmio novo

## Casa

### Casa · tecla ⇧2 (viagem: casa)
- **Lugar:** Casa › Casa (cena inteira)
- **Papel:** cena em pixel art
- **Páginas (dono):** `casa31` (Sua casa) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** soma dos "!" dos objetos da casa

### Espelho · tecla V
- **Lugar:** Casa › Sala de estar
- **Papel:** ficha
- **Páginas (dono):** `you` (Você)
- **Marcadores:** Perfil · Personalidade · Decisões · Aparência · Carreira musical
- **"!":** pendências com dono nestas páginas
- **Sai daqui:** Diário → Diário na gaveta
- **Nota:** Ficha do personagem, como está (só polida).

### Porta-retratos · tecla Y
- **Lugar:** Casa › Sala de estar
- **Papel:** álbum
- **Páginas (dono):** `personal` (Vida pessoal)
- **Marcadores:** Amor e família · Coração · Filhos · Fé e cuidado · Lazer e saúde · Agenda pessoal · Vida intensa · Rotinas e selo
- **"!":** pedido de família ou encontro marcado
- **Nota:** Parceiro, filhos, família e aba Coração.

### Cofre de casa · tecla X
- **Lugar:** Casa › Quarto
- **Papel:** livro
- **Páginas (dono):** `wealth` (Patrimônio e investimentos)
- **Marcadores:** Bolsa · Renda fixa · Ouro · Imóveis · Carteira · Loja · Seus bens · Investimentos · Equipe pessoal e fundação · Patrimônio · Bens e investimentos
- **"!":** pendências com dono nestas páginas

### Escritório em casa · tecla N
- **Lugar:** Casa › Escritório em casa
- **Papel:** cena em pixel art
- **Páginas (dono):** `ventures` (Empreendimentos), `careers` (Carreiras), `shared18` (Sociedades)
- **Marcadores:** Sociedades · Nova sociedade · Banda e conflitos
- **"!":** pendências com dono nestas páginas
- **Nota:** Outras carreiras, negócios e sociedades.

### Telefone de casa · tecla ⇧V
- **Lugar:** Casa › Sala de estar
- **Papel:** telefone e lista
- **Páginas (dono):** `known31` (Conhecidos) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas
- **Nota:** Contatos e "chamar para sair" (AMOR).

### Estante de lembranças · tecla ⇧7
- **Lugar:** Casa › Sala de estar
- **Papel:** álbum
- **Páginas (dono):** `scenes17` (Álbum de cenas)
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Cama · tecla —
- **Lugar:** Casa › Quarto
- **Papel:** cena em pixel art
- **Atalho para:** `you` (Você) (dono: Espelho)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —
- **Nota:** Descansar e energia.

### Calendário da cozinha · tecla —
- **Lugar:** Casa › Cozinha
- **Papel:** agenda de couro
- **Atalho para:** `personal` (Vida pessoal) › agenda8 (dono: Porta-retratos)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Garagem · tecla —
- **Lugar:** Casa › Garagem
- **Papel:** cena em pixel art
- **Atalho para:** `wealth` (Patrimônio e investimentos) › mine (dono: Cofre de casa)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —
- **Nota:** Veículos.

## Cidade

### Gravadora (identidade e venda) · tecla L
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `label`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-label` (Gravadora) ⚑, `identity` (Identidade) ⚑, `biz17` (Negócios & direitos) ⚑
- **Marcadores:** Identidade do selo · Liderança · Identidade · Venda & catálogo · Canais, licenças e merch · Imagem & voz · Circuito, vaquinhas e reencontros
- **"!":** pendências com dono nestas páginas

### QG da banda · tecla ⇧M
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `musician`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-musician` (Músico) ⚑
- **Marcadores:** Sociedades · Nova sociedade · Banda e conflitos · Sua banda · Sociedades
- **"!":** pendências com dono nestas páginas

### Escritório de empresário · tecla ⇧G
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `manager`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-manager` (Empresário) ⚑, `management` (Gestão de artistas) ⚑
- **Marcadores:** Meus agenciados · Prospectar · Relatórios · Roubar clientes · Agência · Serviços
- **"!":** pendências com dono nestas páginas

### Agência · tecla [
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `booking`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-booking` (Agente e promotor) ⚑, `tour12` (Agente e promotor) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Terreno do seu festival · tecla ⇧J
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `festival`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-festival` (Dono de festival) ⚑
- **Marcadores:** Seus festivais · Festivais rivais
- **"!":** pendências com dono nestas páginas

### Sua casa de shows · tecla =
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `venue`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-venue` (Casa de shows) ⚑
- **Marcadores:** Sua casa e programação · Comprar e vender casas
- **"!":** pendências com dono nestas páginas

### Seu estúdio · tecla ]
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `studio`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-studio` (Estúdio e produtor) ⚑, `studio12` (Estúdio e produtor) ⚑
- **Marcadores:** Dono do estúdio · Produtor · Estúdio e produção · Músicos de sessão
- **"!":** pendências com dono nestas páginas

### Sua editora · tecla -
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `publisher`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-publisher` (Editora musical) ⚑, `publishing16` (Editora) ⚑
- **Marcadores:** Compositores e catálogo · Créditos e autores
- **"!":** pendências com dono nestas páginas

### Redação · tecla ,
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `media`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-media` (Dono de mídia) ⚑, `outlets16` (Veículos de mídia) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Sala de servidores · tecla .
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `platform`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-platform` (Plataforma) ⚑, `platform16` (Plataforma) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Estúdio de cinema · tecla ⇧S
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `screen`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-screen` (Trilhas e palco) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Sua mesa no jornal · tecla ⇧Q
- **Lugar:** Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) · carreira `critic`
- **Papel:** cena em pixel art
- **Páginas (dono):** `cp17-critic` (Jornalismo) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Cidade · tecla ⇧3 (viagem: cidade)
- **Lugar:** Cidade › Cidade (mapa da cidade)
- **Papel:** mapa
- **Páginas (dono):** `campus18` (Nosso mundo)
- **Marcadores:** — (papel de uma folha só)
- **"!":** prédios com novidade

### Casa de shows · tecla —
- **Lugar:** Cidade › Casa de shows
- **Papel:** fachada do prédio (cena)
- **Atalho para:** `shows` (Shows) (dono: Palco de ensaio), `live19` (Palco e temporada) (dono: Palco de ensaio)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Rádio e TV · tecla —
- **Lugar:** Cidade › Rádio e TV
- **Papel:** fachada do prédio (cena)
- **Atalho para:** `media` (Mídia) (dono: Rádio/TV)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Jornal · tecla —
- **Lugar:** Cidade › Jornal
- **Papel:** fachada do prédio (cena)
- **Atalho para:** `news17` (Notícias e boatos) (dono: Jornal na mesa)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Bar · tecla ⇧B
- **Lugar:** Cidade › Bar
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `after18` (Depois do palco), `night14` (Noite e encontros)
- **Atalho para:** `talent18` (Talentos e formação) (dono: Pilha de demos)
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas
- **Nota:** Noite, depois do expediente e talentos tocando.

### Escritórios de empresários · tecla —
- **Lugar:** Cidade › Empresários
- **Papel:** fachada do prédio (cena)
- **Atalho para:** `managers14` (Empresários) (dono: Telefone)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Estúdios e produtores · tecla ⇧P
- **Lugar:** Cidade › Estúdios de terceiros
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `producers15` (Produtores)
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Gravadoras rivais · tecla K
- **Lugar:** Cidade › Prédios dos rivais
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `labels` (Gravadoras)
- **Marcadores:** Ranking e prestígio · Selos rivais · Estratégias e líderes
- **"!":** pendências com dono nestas páginas
- **Nota:** Clicar no prédio = ficha do selo.

### Beco do submundo · tecla ;
- **Lugar:** Cidade › Beco do submundo
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `crime` (Crime), `bauc31` (Leilão silencioso (beco)) ⚑
- **Marcadores:** Organizações · Planos/Ações · Espionagem · Mercado negro · Investigações/Polícia · Histórico
- **"!":** plano em andamento ou polícia de olho

### Prefeitura · tecla ⇧K
- **Lugar:** Cidade › Prefeitura
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `society18` (Sociedade)
- **Marcadores:** Prêmios · Paradas · IA · Censura e exílio · Filantropia · Cidade da música
- **"!":** votação de lei perto do prazo

### Fábrica · tecla ⇧I
- **Lugar:** Cidade › Fábrica
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `supply18` (Cadeia física & acordos)
- **Marcadores:** Prensagem · Distribuição · Estoque · Acordos · Mercado
- **"!":** falta de estoque ou prensagem atrasada

### Banco · tecla —
- **Lugar:** Cidade › Banco
- **Papel:** fachada do prédio (cena)
- **Atalho para:** `finance` (Finanças) › loans7 (dono: Livro-caixa)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Aeroporto e porto · tecla ⇧A
- **Lugar:** Cidade › Aeroporto e porto
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `airport31` (Aeroporto e porto), `customs31` (Alfândega) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** carga parada na alfândega

### Casa de leilões · tecla ⇧X
- **Lugar:** Cidade › Casa de leilões
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `auction31` (Casa de leilões), `sealed31` (Abertura dos envelopes) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** lance coberto ou abertura de envelopes

### Loja de instrumentos · tecla ⇧Y
- **Lugar:** Cidade › Loja de instrumentos
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `loja31` (Loja de instrumentos)
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas

### Terreno do festival · tecla J
- **Lugar:** Cidade › Terreno do festival
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `festivals` (Festivais)
- **Marcadores:** Circuito e inscrições · Mapa
- **"!":** pendências com dono nestas páginas

### Casa Fossati e praça · tecla —
- **Lugar:** Cidade › Casa Fossati e praça
- **Papel:** fachada do prédio (cena)
- **Atalho para:** `world` (Mundo) › fossati31 (dono: Mapa-múndi)
- **Marcadores:** — (papel de uma folha só)
- **"!":** —

### Lojas de decoração · tecla ⇧O
- **Lugar:** Cidade › Loja de instrumentos
- **Papel:** fachada do prédio (cena)
- **Páginas (dono):** `deco31` (Lojas de decoração) ⚑
- **Marcadores:** — (papel de uma folha só)
- **"!":** pendências com dono nestas páginas
- **Nota:** Móveis, antiquário, eletrônicos, galeria, correio/internet e os seus lugares decorados.

## Mundo

### Mundo · tecla ⇧4 (viagem: mundo)
- **Lugar:** Mundo › Mundo (mapa-múndi)
- **Papel:** mapa
- **Atalho para:** `world` (Mundo) › map27 (dono: Mapa-múndi)
- **Marcadores:** — (papel de uma folha só)
- **"!":** países com novidade

### Mapa-múndi · tecla W
- **Lugar:** Mundo › Mapa-múndi
- **Papel:** mapa
- **Páginas (dono):** `world` (Mundo), `regions18` (Mercados), `regions19` (Regiões e política), `cidade5` (Cidade (visita)) ⚑
- **Marcadores:** Mapa e cenas · História, leis e lugares · Países · Cenas locais · Marcos da história · Regiões · Submercado · Circuitos · K-pop · Japão e idols · Afinidades · Selos regionais · Comuna e exílio · Vistos e rádio · Greves · Campanhas e leis · Celeiros
- **"!":** pendências com dono nestas páginas
- **Sai daqui:** América do Norte → Revista de paradas · Europa → Revista de paradas · Brasil → Revista de paradas · América Latina e Caribe → Revista de paradas · Ásia e Oriente Médio → Revista de paradas · África → Revista de paradas · Oceania → Revista de paradas · Blues e jazz → Revista de paradas · Country e folk → Revista de paradas · R&B, soul, funk e disco → Revista de paradas · Rock → Revista de paradas · Pop → Revista de paradas · Latina → Revista de paradas · Sagrado e clássico → Revista de paradas · Hip hop → Revista de paradas · Eletrônica → Revista de paradas · Caribe e reggae → Revista de paradas
- **Nota:** Clicar no país = mercado, cidades e cultura; clicar numa cidade = o mapa dela (cidade5, onda 5 MAPA).

### Telex na borda · tecla ⇧W
- **Lugar:** Mundo › Borda do mapa
- **Papel:** jornal
- **Páginas (dono):** `mundo27` (Este mês no mundo), `world17` (Mundo vivo)
- **Marcadores:** — (papel de uma folha só)
- **"!":** acontecimento grande no mundo este mês
- **Forma por época:** 1889–1929 Telégrafo · 1930–1989 Telex · 1990–2040 Agência de notícias na tela

### Livro "Cultura" · tecla M
- **Lugar:** Mundo › Borda do mapa
- **Papel:** livro
- **Páginas (dono):** `movements` (Relações e movimentos), `lendas` (Lendas)
- **Marcadores:** Panteão · Linha do tempo · Biografias · Relíquias · Acervo vivo · Legado póstumo · Cidades e cenas · Épocas · Jornal · Livro e mundo · Espólio
- **"!":** pendências com dono nestas páginas
- **Nota:** Movimentos, lendas e era.

## Fora do mundo (menu de pausa: Esc ou engrenagem)

- `tut18` (Ajuda e tutorial) — Ajuda
- `editor31` (Editor) — Editor (modo editor)
- `lists30` (Listas) — Índice completo (consulta) ⚑
- Salvar/carregar e opções (inclui Nomes reais) continuam como utilidades da pausa.

## Todas as páginas

| Página | Objeto | Lugar | Papel | Tecla | No mapa | Abas (ficam/saem) |
|---|---|---|---|---|---|---|
| `after18` Depois do palco | Bar | Cidade › Bar | fachada do prédio (cena) | ⇧B | sim | 0/0 |
| `agenda17` Agenda e contratações | Agenda de couro | Sede › Sua sala | agenda de couro | G | sim | 2/3 |
| `airport31` Aeroporto e porto | Aeroporto e porto | Cidade › Aeroporto e porto | fachada do prédio (cena) | ⇧A | sim | 0/0 |
| `artist18` Contratos do artista | Arquivo de aço | Sede › Sua sala | pasta do arquivo | ⇧C | sim | 5/0 |
| `artists` Artistas | Mural de cortiça | Sede › A&R | mural de cortiça | 4 | sim | 6/0 |
| `auction31` Casa de leilões | Casa de leilões | Cidade › Casa de leilões | fachada do prédio (cena) | ⇧X | sim | 0/0 |
| `awards` Premiações | Estante de troféus | Sede › Corredor | cena em pixel art | O | sim | 0/0 |
| `bauc31` Leilão silencioso (beco) | Beco do submundo | Cidade › Beco do submundo | fachada do prédio (cena) | ; | ⚑ não | 0/0 |
| `biz17` Negócios & direitos | Gravadora (identidade e venda) | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | L | ⚑ não | 0/0 |
| `business` Negócios | Contador | Sede › Financeiro | conversa com a pessoa + "ver números" | B | sim | 12/0 |
| `cal17` Agenda de shows | Agenda de couro | Sede › Sua sala | agenda de couro | G | sim | 0/0 |
| `calendar19` Calendário | Agenda de couro | Sede › Sua sala | agenda de couro | G | sim | 0/0 |
| `campus18` Nosso mundo | Cidade | Cidade › Cidade (mapa da cidade) | mapa | ⇧3 (viagem: cidade) | sim | 0/0 |
| `car31` Decisões de carreira | Mesa de reunião | Sede › Sala de reunião | cena em pixel art | ⇧R | sim | 0/0 |
| `careers` Carreiras | Escritório em casa | Casa › Escritório em casa | cena em pixel art | N | sim | 0/0 |
| `casa31` Sua casa | Casa | Casa › Casa (cena inteira) | cena em pixel art | ⇧2 (viagem: casa) | ⚑ não | 0/0 |
| `catalog` Catálogo | Prateleiras de masters | Sede › Arquivo | cena em pixel art | 7 | sim | 4/0 |
| `charts` Paradas | Revista de paradas | Sede › Sua sala | revista | 3 | sim | 12/0 |
| `cidade5` Cidade (visita) | Mapa-múndi | Mundo › Mapa-múndi | mapa | W | ⚑ não | 0/0 |
| `cockpit` Hoje | Mesa do mês | Sede › Sua sala | cena em pixel art | 1 | ⚑ não | 1/2 |
| `company` Empresa | Quadro de funcionários | Sede › RH | quadro na parede | T | sim | 0/0 |
| `contracts19` Mercado de contratos | Arquivo de aço | Sede › Sua sala | pasta do arquivo | ⇧C | sim | 5/0 |
| `cp17-booking` Agente e promotor | Agência | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | [ | ⚑ não | 0/0 |
| `cp17-critic` Jornalismo | Sua mesa no jornal | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ⇧Q | ⚑ não | 0/0 |
| `cp17-festival` Dono de festival | Terreno do seu festival | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ⇧J | ⚑ não | 2/0 |
| `cp17-label` Gravadora | Gravadora (identidade e venda) | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | L | ⚑ não | 7/0 |
| `cp17-manager` Empresário | Escritório de empresário | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ⇧G | ⚑ não | 6/0 |
| `cp17-media` Dono de mídia | Redação | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | , | ⚑ não | 0/0 |
| `cp17-musician` Músico | QG da banda | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ⇧M | ⚑ não | 5/0 |
| `cp17-platform` Plataforma | Sala de servidores | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | . | ⚑ não | 0/0 |
| `cp17-publisher` Editora musical | Sua editora | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | - | ⚑ não | 2/0 |
| `cp17-screen` Trilhas e palco | Estúdio de cinema | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ⇧S | ⚑ não | 0/0 |
| `cp17-studio` Estúdio e produtor | Seu estúdio | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ] | ⚑ não | 4/0 |
| `cp17-venue` Casa de shows | Sua casa de shows | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | = | ⚑ não | 2/0 |
| `creation` Composição | Mesa de som | Sede › Estúdio | cena em pixel art | S | ⚑ não | 4/5 |
| `crime` Crime | Beco do submundo | Cidade › Beco do submundo | fachada do prédio (cena) | ; | sim | 6/0 |
| `critics` Críticos | Jornal na mesa | Sede › Sua sala | jornal | ' | sim | 0/0 |
| `customs31` Alfândega | Aeroporto e porto | Cidade › Aeroporto e porto | fachada do prédio (cena) | ⇧A | ⚑ não | 0/0 |
| `deco31` Lojas de decoração | Lojas de decoração | Cidade › Loja de instrumentos | fachada do prédio (cena) | ⇧O | ⚑ não | 0/0 |
| `deleg31` Delegação | Chefe de gabinete | Sede › Sua sala | conversa com a pessoa + "ver números" | ⇧D | sim | 0/0 |
| `desk` Mesa do mês | Mesa do mês | Sede › Sua sala | cena em pixel art | 1 | sim | 0/0 |
| `diary` Diário da run | Diário na gaveta | Sede › Sua sala | caderno | D | sim | 0/0 |
| `directory` Todos os artistas | Fichário de contatos | Sede › Sua sala | fichário (rolodex) | A | sim | 0/0 |
| `dm18` Diário do Mestre | Diário na gaveta | Sede › Sua sala | caderno | D | sim | 0/0 |
| `dyn18` Dinâmica | Lounge (artistas sentados) | Sede › Lounge | cena em pixel art | ⇧L | sim | 3/0 |
| `editor31` Editor | — | menu de pausa | — | Esc | sim | 0/0 |
| `fakes19` Fraudes e sósias | Jornal na mesa | Sede › Sua sala | jornal | ' | sim | 3/0 |
| `festivals` Festivais | Terreno do festival | Cidade › Terreno do festival | fachada do prédio (cena) | J | sim | 2/0 |
| `finance` Finanças | Livro-caixa | Sede › Sua sala | livro | Z | sim | 6/2 |
| `firm19` Crises, seguros e cultura | Quadro de funcionários | Sede › RH | quadro na parede | T | sim | 4/0 |
| `goals` Metas | Quadro de metas | Sede › Sua sala | quadro na parede | F | sim | 3/0 |
| `hq` Sede | Maquete do prédio | Sede › Sala de reunião | planta do prédio | 2 | sim | 6/1 |
| `identity` Identidade | Gravadora (identidade e venda) | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | L | ⚑ não | 0/0 |
| `inbox` Caixa de entrada | Correspondência | Sede › Sua sala | correspondência da época | E | sim | 0/0 |
| `industry` Indústria | Gráficos na parede | Sede › Pesquisa | quadro na parede | I | sim | 7/0 |
| `known27` O que sabemos | Jornal na mesa | Sede › Sua sala | jornal | ' | ⚑ não | 0/0 |
| `known31` Conhecidos | Telefone de casa | Casa › Sala de estar | telefone e lista | ⇧V | ⚑ não | 0/0 |
| `knownacts27` Artistas conhecidos | Fichário de contatos | Sede › Sua sala | fichário (rolodex) | A | sim | 6/0 |
| `labels` Gravadoras | Gravadoras rivais | Cidade › Prédios dos rivais | fachada do prédio (cena) | K | sim | 3/0 |
| `lendas` Lendas | Livro "Cultura" | Mundo › Borda do mapa | livro | M | sim | 11/0 |
| `lists30` Listas | — | menu de pausa | — | Esc | ⚑ não | 0/0 |
| `live19` Palco e temporada | Palco de ensaio | Sede › Ensaio e palco | cena em pixel art | 9 | sim | 6/0 |
| `loja31` Loja de instrumentos | Loja de instrumentos | Cidade › Loja de instrumentos | fachada do prédio (cena) | ⇧Y | sim | 0/0 |
| `long18` Rumo do selo | Mesa de reunião | Sede › Sala de reunião | cena em pixel art | ⇧R | sim | 7/0 |
| `management` Gestão de artistas | Escritório de empresário | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ⇧G | ⚑ não | 0/0 |
| `managers14` Empresários | Telefone | Sede › Sua sala | telefone e lista | ⇧T | sim | 0/0 |
| `market` Talentos | Mesa do olheiro (caderno) | Sede › A&R | caderno | 5 | sim | 8/0 |
| `market19a` Mercado: certificados e cenas | Gráficos na parede | Sede › Pesquisa | quadro na parede | I | sim | 5/0 |
| `media` Mídia | Rádio/TV | Sede › Sua sala | tela (rádio/TV/monitor) | 6 | sim | 7/1 |
| `media19` Remix, anúncios e trilhas | Prateleiras de masters | Sede › Arquivo | cena em pixel art | 7 | sim | 4/0 |
| `movements` Relações e movimentos | Livro "Cultura" | Mundo › Borda do mapa | livro | M | sim | 0/0 |
| `mundo27` Este mês no mundo | Telex na borda | Mundo › Borda do mapa | jornal | ⇧W | sim | 0/0 |
| `news17` Notícias e boatos | Jornal na mesa | Sede › Sua sala | jornal | ' | sim | 0/0 |
| `night14` Noite e encontros | Bar | Cidade › Bar | fachada do prédio (cena) | ⇧B | sim | 0/0 |
| `outlets16` Veículos de mídia | Redação | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | , | ⚑ não | 0/0 |
| `people` Pessoas | Mural de cortiça | Sede › A&R | mural de cortiça | 4 | sim | 3/3 |
| `personal` Vida pessoal | Porta-retratos | Casa › Sala de estar | álbum | Y | sim | 8/0 |
| `plan` Central | Quadro de planejamento | Sede › Sua sala | quadro na parede | C | sim | 0/0 |
| `platform16` Plataforma | Sala de servidores | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | . | ⚑ não | 0/0 |
| `producers15` Produtores | Estúdios e produtores | Cidade › Estúdios de terceiros | fachada do prédio (cena) | ⇧P | sim | 0/0 |
| `project` Projeto musical | Sala de gravação | Sede › Estúdio | cena em pixel art | \ | sim | 0/0 |
| `publishing16` Editora | Sua editora | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | - | ⚑ não | 0/0 |
| `regions18` Mercados | Mapa-múndi | Mundo › Mapa-múndi | mapa | W | sim | 6/0 |
| `regions19` Regiões e política | Mapa-múndi | Mundo › Mapa-múndi | mapa | W | sim | 6/0 |
| `releases` Lançamentos | Quadro branco | Sede › Sala de reunião | quadro na parede | U | sim | 4/1 |
| `rights18` Direitos | Arquivo de aço | Sede › Sua sala | pasta do arquivo | ⇧C | sim | 10/0 |
| `rockhall` Hall da Fama | Estante de troféus | Sede › Corredor | cena em pixel art | O | sim | 0/0 |
| `sala31` Sala da sede | Sede | Sede › Sede (cena inteira) | cena em pixel art | ⇧1 (viagem: sede) | ⚑ não | 0/0 |
| `scenes17` Álbum de cenas | Estante de lembranças | Casa › Sala de estar | álbum | ⇧7 | sim | 0/0 |
| `sealed31` Abertura dos envelopes | Casa de leilões | Cidade › Casa de leilões | fachada do prédio (cena) | ⇧X | ⚑ não | 0/0 |
| `sede25` Sede em corte | Sede | Sede › Sede (cena inteira) | cena em pixel art | ⇧1 (viagem: sede) | ⚑ não | 0/0 |
| `shared18` Sociedades | Escritório em casa | Casa › Escritório em casa | cena em pixel art | N | sim | 3/0 |
| `shows` Shows | Palco de ensaio | Sede › Ensaio e palco | cena em pixel art | 9 | sim | 4/1 |
| `society18` Sociedade | Prefeitura | Cidade › Prefeitura | fachada do prédio (cena) | ⇧K | sim | 6/0 |
| `songmkt27` Mercado de canções | Piano | Sede › Estúdio | caderno | ⇧8 | sim | 4/0 |
| `studio` Estúdio | Mesa de som | Sede › Estúdio | cena em pixel art | S | sim | 5/0 |
| `studio12` Estúdio e produtor | Seu estúdio | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | ] | ⚑ não | 0/0 |
| `supply18` Cadeia física & acordos | Fábrica | Cidade › Fábrica | fachada do prédio (cena) | ⇧I | sim | 5/0 |
| `talent18` Talentos e formação | Pilha de demos | Sede › A&R | cena em pixel art | ⇧5 | sim | 5/0 |
| `team` Equipe e ritmo | Quadro de funcionários | Sede › RH | quadro na parede | T | sim | 0/0 |
| `tour12` Agente e promotor | Agência | Cidade › Prédio da carreira (★; é a sede quando é a carreira principal) | cena em pixel art | [ | ⚑ não | 0/0 |
| `tribute19` Tributos e covers | Prateleiras de masters | Sede › Arquivo | cena em pixel art | 7 | ⚑ não | 4/0 |
| `tut18` Ajuda e tutorial | — | menu de pausa | — | Esc | sim | 0/0 |
| `ventures` Empreendimentos | Escritório em casa | Casa › Escritório em casa | cena em pixel art | N | sim | 0/0 |
| `wealth` Patrimônio e investimentos | Cofre de casa | Casa › Quarto | livro | X | sim | 11/0 |
| `world` Mundo | Mapa-múndi | Mundo › Mapa-múndi | mapa | W | sim | 5/20 |
| `world17` Mundo vivo | Telex na borda | Mundo › Borda do mapa | jornal | ⇧W | sim | 0/0 |
| `you` Você | Espelho | Casa › Sala de estar | ficha | V | sim | 5/1 |
| `zines19` Imprensa e fanzines | Jornal na mesa | Sede › Sua sala | jornal | ' | sim | 4/0 |

## Todas as abas

Aba de hoje → marcador de qual objeto na onda 5 (ou topo/índice da pausa).

| Página | Aba | Marcador em | Por quê |
|---|---|---|---|
| `agenda17` | Agenda | Agenda de couro |  |
| `agenda17` | Você | Agenda de couro |  |
| `agenda17` | Contratar | Jornal na mesa (muda) | Contratar: anúncio no jornal abre a vaga; candidatos esperam na recepção. |
| `agenda17` | Freelancers | Telefone (muda) | Freelancers atendem no telefone. |
| `agenda17` | Músicos de estúdio | Telefone (muda) | Músicos de estúdio atendem no telefone. |
| `artist18` | Propostas | Arquivo de aço |  |
| `artist18` | Seu contrato | Arquivo de aço |  |
| `artist18` | Extrato e contas | Arquivo de aço |  |
| `artist18` | Equipe e editora | Arquivo de aço |  |
| `artist18` | Faça você mesmo × selo | Arquivo de aço |  |
| `artists` | Visão geral | Mural de cortiça |  |
| `artists` | Agenda e projetos | Mural de cortiça |  |
| `artists` | Carreira e contrato | Mural de cortiça |  |
| `artists` | Público e mídia | Mural de cortiça |  |
| `artists` | Integrantes e relações | Mural de cortiça |  |
| `artists` | Ficha completa | Mural de cortiça |  |
| `business` | Grupo e consolidado | Contador |  |
| `business` | Era e estratégia | Contador |  |
| `business` | Estrutura x era | Contador |  |
| `business` | Subselos | Contador |  |
| `business` | Empresas | Contador |  |
| `business` | Catálogo | Contador |  |
| `business` | Jurídico | Contador |  |
| `business` | Marcas e sync | Contador |  |
| `business` | Disputas | Contador |  |
| `business` | Por que deu nisso? | Contador |  |
| `business` | Direitos | Contador |  |
| `business` | Adoção e futuro | Contador |  |
| `catalog` | Catálogo | Prateleiras de masters |  |
| `catalog` | Sync | Prateleiras de masters |  |
| `catalog` | História do selo | Prateleiras de masters |  |
| `catalog` | Retrospectiva | Prateleiras de masters |  |
| `charts` | Parada de rádio | Revista de paradas |  |
| `charts` | Parada de vendas | Revista de paradas |  |
| `charts` | Parada latina | Revista de paradas |  |
| `charts` | Parada country | Revista de paradas |  |
| `charts` | Parada dance | Revista de paradas |  |
| `charts` | Fim de ano | Revista de paradas |  |
| `charts` | Todos os tempos | Revista de paradas |  |
| `charts` | Parada de vídeo | Revista de paradas |  |
| `charts` | Parada mundial | Revista de paradas |  |
| `charts` | Rádio e outras paradas | Revista de paradas |  |
| `charts` | Por país e formato | Revista de paradas |  |
| `charts` | Hype | Revista de paradas |  |
| `cockpit` | Painel | topo (HUD) (muda) | O painel vira o topo (data, caixa, fama), ampliável com um clique; detalhes no livro-caixa. |
| `cockpit` | Caixa de entrada | Correspondência (muda) | A caixa de entrada é a correspondência da época (tecla E). |
| `cockpit` | Mesa do mês | Mesa do mês |  |
| `contracts19` | Mercado | Arquivo de aço |  |
| `contracts19` | Cláusulas | Arquivo de aço |  |
| `contracts19` | Empresários | Arquivo de aço |  |
| `contracts19` | Gestão e masters | Arquivo de aço |  |
| `contracts19` | Histórico | Arquivo de aço |  |
| `cp17-festival` | Seus festivais | Terreno do seu festival |  |
| `cp17-festival` | Festivais rivais | Terreno do seu festival |  |
| `cp17-label` | Identidade do selo | Gravadora (identidade e venda) |  |
| `cp17-label` | Liderança | Gravadora (identidade e venda) |  |
| `cp17-label` | Identidade | Gravadora (identidade e venda) |  |
| `cp17-label` | Venda & catálogo | Gravadora (identidade e venda) |  |
| `cp17-label` | Canais, licenças e merch | Gravadora (identidade e venda) |  |
| `cp17-label` | Imagem & voz | Gravadora (identidade e venda) |  |
| `cp17-label` | Circuito, vaquinhas e reencontros | Gravadora (identidade e venda) |  |
| `cp17-manager` | Meus agenciados | Escritório de empresário |  |
| `cp17-manager` | Prospectar | Escritório de empresário |  |
| `cp17-manager` | Relatórios | Escritório de empresário |  |
| `cp17-manager` | Roubar clientes | Escritório de empresário |  |
| `cp17-manager` | Agência | Escritório de empresário |  |
| `cp17-manager` | Serviços | Escritório de empresário |  |
| `cp17-musician` | Sociedades | QG da banda |  |
| `cp17-musician` | Nova sociedade | QG da banda |  |
| `cp17-musician` | Banda e conflitos | QG da banda |  |
| `cp17-musician` | Sua banda | QG da banda |  |
| `cp17-musician` | Sociedades | QG da banda |  |
| `cp17-publisher` | Compositores e catálogo | Sua editora |  |
| `cp17-publisher` | Créditos e autores | Sua editora |  |
| `cp17-studio` | Dono do estúdio | Seu estúdio |  |
| `cp17-studio` | Produtor | Seu estúdio |  |
| `cp17-studio` | Estúdio e produção | Seu estúdio |  |
| `cp17-studio` | Músicos de sessão | Seu estúdio |  |
| `cp17-venue` | Sua casa e programação | Sua casa de shows |  |
| `cp17-venue` | Comprar e vender casas | Sua casa de shows |  |
| `creation` | Repertório | Piano (muda) | Compor fica no piano. |
| `creation` | Detalhes do projeto | Mesa de som |  |
| `creation` | Créditos e autores | Piano (muda) | Créditos e autores ficam no piano. |
| `creation` | Equipamento | Mesa de som |  |
| `creation` | Temas e tendências | Piano (muda) | Temas e tendências ficam no piano. |
| `creation` | Receita sonora | Mesa de som |  |
| `creation` | Parcerias | Piano (muda) | Parcerias ficam no piano. |
| `creation` | Encomendas | Piano (muda) | Encomendas ficam no piano. |
| `creation` | Divisões | Mesa de som |  |
| `crime` | Organizações | Beco do submundo |  |
| `crime` | Planos/Ações | Beco do submundo |  |
| `crime` | Espionagem | Beco do submundo |  |
| `crime` | Mercado negro | Beco do submundo |  |
| `crime` | Investigações/Polícia | Beco do submundo |  |
| `crime` | Histórico | Beco do submundo |  |
| `dyn18` | Elenco | Lounge (artistas sentados) |  |
| `dyn18` | Bandas | Lounge (artistas sentados) |  |
| `dyn18` | Equipe | Lounge (artistas sentados) |  |
| `fakes19` | Voz-fantasma e dublagem | Jornal na mesa |  |
| `fakes19` | Bandas-fantasma | Jornal na mesa |  |
| `fakes19` | Leis e história | Jornal na mesa |  |
| `festivals` | Circuito e inscrições | Terreno do festival |  |
| `festivals` | Mapa | Terreno do festival |  |
| `finance` | Posição | Livro-caixa |  |
| `finance` | DRE e caixa | Livro-caixa |  |
| `finance` | Capital e sócios | Cofre da empresa (muda) | Capital e sócios ficam no cofre da empresa. |
| `finance` | Empréstimos | Livro-caixa |  |
| `finance` | Participações em selos | Cofre da empresa (muda) | Participações em selos ficam no cofre. |
| `finance` | Balanço | Livro-caixa |  |
| `finance` | Bolsa | Livro-caixa |  |
| `finance` | Dívida e catálogo | Livro-caixa |  |
| `firm19` | Cancelamento | Quadro de funcionários |  |
| `firm19` | Seguros e saúde | Quadro de funcionários |  |
| `firm19` | Cultura | Quadro de funcionários |  |
| `firm19` | Naming rights | Quadro de funcionários |  |
| `goals` | Cenário | Quadro de metas |  |
| `goals` | Conquistas | Quadro de metas |  |
| `goals` | Museu do selo | Quadro de metas |  |
| `hq` | Operação | Maquete do prédio |  |
| `hq` | Estrutura | Maquete do prédio |  |
| `hq` | Equipe e departamentos | Maquete do prédio |  |
| `hq` | Equipamentos e conforto | Maquete do prédio |  |
| `hq` | Expansão | Maquete do prédio |  |
| `hq` | História | Maquete do prédio |  |
| `hq` | Tudo (especialista) | índice do menu de pausa (muda) | "Tudo (especialista)" é lista: fica no índice do menu de pausa. |
| `industry` | Fábricas e suprimentos | Gráficos na parede |  |
| `industry` | Lojas | Gráficos na parede |  |
| `industry` | Distribuição e preço | Gráficos na parede |  |
| `industry` | Pesquisa | Gráficos na parede |  |
| `industry` | Mídia e empresas | Gráficos na parede |  |
| `industry` | Conselho | Gráficos na parede |  |
| `industry` | Câmbio | Gráficos na parede |  |
| `knownacts27` | Todos | Fichário de contatos |  |
| `knownacts27` | Seu círculo | Fichário de contatos |  |
| `knownacts27` | Radar | Fichário de contatos |  |
| `knownacts27` | Famosos | Fichário de contatos |  |
| `knownacts27` | Cena local | Fichário de contatos |  |
| `knownacts27` | Mercado e imprensa | Fichário de contatos |  |
| `labels` | Ranking e prestígio | Gravadoras rivais |  |
| `labels` | Selos rivais | Gravadoras rivais |  |
| `labels` | Estratégias e líderes | Gravadoras rivais |  |
| `lendas` | Panteão | Livro "Cultura" |  |
| `lendas` | Linha do tempo | Livro "Cultura" |  |
| `lendas` | Biografias | Livro "Cultura" |  |
| `lendas` | Relíquias | Livro "Cultura" |  |
| `lendas` | Acervo vivo | Livro "Cultura" |  |
| `lendas` | Legado póstumo | Livro "Cultura" |  |
| `lendas` | Cidades e cenas | Livro "Cultura" |  |
| `lendas` | Épocas | Livro "Cultura" |  |
| `lendas` | Jornal | Livro "Cultura" |  |
| `lendas` | Livro e mundo | Livro "Cultura" |  |
| `lendas` | Espólio | Livro "Cultura" |  |
| `live19` | Ingressos | Palco de ensaio |  |
| `live19` | Festival grátis | Palco de ensaio |  |
| `live19` | Vinil | Palco de ensaio |  |
| `live19` | Temporada | Palco de ensaio |  |
| `live19` | Beneficentes | Palco de ensaio |  |
| `live19` | Concursos | Palco de ensaio |  |
| `long18` | Caminhos | Mesa de reunião |  |
| `long18` | Doutrinas e decisões | Mesa de reunião |  |
| `long18` | Post-mortems | Mesa de reunião |  |
| `long18` | Ano em revista | Mesa de reunião |  |
| `long18` | Biografia | Mesa de reunião |  |
| `long18` | Casa e dinastia | Mesa de reunião |  |
| `long18` | Dificuldade | Mesa de reunião |  |
| `market` | Procurar | Mesa do olheiro (caderno) |  |
| `market` | Funil | Mesa do olheiro (caderno) |  |
| `market` | Decidir | Mesa do olheiro (caderno) |  |
| `market` | Lista e relatórios | Mesa do olheiro (caderno) |  |
| `market` | Leilões | Mesa do olheiro (caderno) |  |
| `market` | Olheiros e equipe | Mesa do olheiro (caderno) |  |
| `market` | Feiras | Mesa do olheiro (caderno) |  |
| `market` | Dossiês e faro de A&R | Mesa do olheiro (caderno) |  |
| `market19a` | Certificados | Gráficos na parede |  |
| `market19a` | Pesquisa | Gráficos na parede |  |
| `market19a` | Cenas | Gráficos na parede |  |
| `market19a` | Plataformas e 360 | Gráficos na parede |  |
| `market19a` | Fusões | Gráficos na parede |  |
| `media` | Imprensa e crítica | Rádio/TV |  |
| `media` | Canais e reputação | Rádio/TV |  |
| `media` | Público e ouvintes | Rádio/TV |  |
| `media` | Campanhas | Rádio/TV |  |
| `media` | Rádio: formatos | Rádio/TV |  |
| `media` | Clipes e pistas | Rádio/TV |  |
| `media` | Jabá e rádio | Rádio/TV |  |
| `media` | Paradas e metodologia | Revista de paradas (muda) | Metodologia das paradas é o expediente da revista. |
| `media19` | Remix e DJs | Prateleiras de masters |  |
| `media19` | Publicidade | Prateleiras de masters |  |
| `media19` | Trilhas e needle drops | Prateleiras de masters |  |
| `media19` | Histórico | Prateleiras de masters |  |
| `people` | Elenco | Mural de cortiça |  |
| `people` | Saúde | Lounge (artistas sentados) (muda) | Saúde do elenco: quem está no lounge conversa. |
| `people` | Relações | Lounge (artistas sentados) (muda) | Relações do elenco ficam no lounge. |
| `people` | Segredos | Mural de cortiça |  |
| `people` | Equipe | Mural de cortiça |  |
| `people` | Cartas e recados | Lounge (artistas sentados) (muda) | Cartas e recados do elenco ficam no lounge. |
| `personal` | Amor e família | Porta-retratos |  |
| `personal` | Coração | Porta-retratos |  |
| `personal` | Filhos | Porta-retratos |  |
| `personal` | Fé e cuidado | Porta-retratos |  |
| `personal` | Lazer e saúde | Porta-retratos |  |
| `personal` | Agenda pessoal | Porta-retratos |  |
| `personal` | Vida intensa | Porta-retratos |  |
| `personal` | Rotinas e selo | Porta-retratos |  |
| `regions18` | Regiões | Mapa-múndi |  |
| `regions18` | Submercado | Mapa-múndi |  |
| `regions18` | Circuitos | Mapa-múndi |  |
| `regions18` | K-pop | Mapa-múndi |  |
| `regions18` | Japão e idols | Mapa-múndi |  |
| `regions18` | Afinidades | Mapa-múndi |  |
| `regions19` | Selos regionais | Mapa-múndi |  |
| `regions19` | Comuna e exílio | Mapa-múndi |  |
| `regions19` | Vistos e rádio | Mapa-múndi |  |
| `regions19` | Greves | Mapa-múndi |  |
| `regions19` | Campanhas e leis | Mapa-múndi |  |
| `regions19` | Celeiros | Mapa-múndi |  |
| `releases` | Lançar | Quadro branco |  |
| `releases` | Rollout | Quadro branco |  |
| `releases` | Capa | Quadro branco |  |
| `releases` | Remaster e standards | Prateleiras de masters (muda) | Remaster e standards ficam nas prateleiras de masters. |
| `releases` | Capa e vídeo | Quadro branco |  |
| `rights18` | Resumo | Arquivo de aço |  |
| `rights18` | Obras | Arquivo de aço |  |
| `rights18` | Gravações e versões | Arquivo de aço |  |
| `rights18` | Autorizações | Arquivo de aço |  |
| `rights18` | Disputas | Arquivo de aço |  |
| `rights18` | Sociedades | Arquivo de aço |  |
| `rights18` | Extratos | Arquivo de aço |  |
| `rights18` | Catálogo | Arquivo de aço |  |
| `rights18` | Editora | Arquivo de aço |  |
| `rights18` | Precedentes | Arquivo de aço |  |
| `shared18` | Sociedades | Escritório em casa |  |
| `shared18` | Nova sociedade | Escritório em casa |  |
| `shared18` | Banda e conflitos | Escritório em casa |  |
| `shows` | Agenda | Palco de ensaio |  |
| `shows` | Turnês | Palco de ensaio |  |
| `shows` | Políticas e operação | Palco de ensaio |  |
| `shows` | Negócios ao vivo | Palco de ensaio |  |
| `shows` | Tudo (especialista) | índice do menu de pausa (muda) | "Tudo (especialista)" é lista: fica no índice do menu de pausa. |
| `society18` | Prêmios | Prefeitura |  |
| `society18` | Paradas | Prefeitura |  |
| `society18` | IA | Prefeitura |  |
| `society18` | Censura e exílio | Prefeitura |  |
| `society18` | Filantropia | Prefeitura |  |
| `society18` | Cidade da música | Prefeitura |  |
| `songmkt27` | Comprar | Piano |  |
| `songmkt27` | Vender | Piano |  |
| `songmkt27` | Ofertas recebidas | Piano |  |
| `songmkt27` | Licenças (covers) | Piano |  |
| `studio` | Sessões | Mesa de som |  |
| `studio` | Covers e versões | Mesa de som |  |
| `studio` | Equipamento | Mesa de som |  |
| `studio` | Músicos de sessão | Mesa de som |  |
| `studio` | Direção sonora | Mesa de som |  |
| `supply18` | Prensagem | Fábrica |  |
| `supply18` | Distribuição | Fábrica |  |
| `supply18` | Estoque | Fábrica |  |
| `supply18` | Acordos | Fábrica |  |
| `supply18` | Mercado | Fábrica |  |
| `talent18` | Descoberta | Pilha de demos |  |
| `talent18` | Composição | Pilha de demos |  |
| `talent18` | Banda da casa | Pilha de demos |  |
| `talent18` | Escolas | Pilha de demos |  |
| `talent18` | TV de talentos | Pilha de demos |  |
| `tribute19` | Tributos | Prateleiras de masters |  |
| `tribute19` | Sucesso tardio | Prateleiras de masters |  |
| `tribute19` | Sua banda | Prateleiras de masters |  |
| `tribute19` | Histórico | Prateleiras de masters |  |
| `wealth` | Bolsa | Cofre de casa |  |
| `wealth` | Renda fixa | Cofre de casa |  |
| `wealth` | Ouro | Cofre de casa |  |
| `wealth` | Imóveis | Cofre de casa |  |
| `wealth` | Carteira | Cofre de casa |  |
| `wealth` | Loja | Cofre de casa |  |
| `wealth` | Seus bens | Cofre de casa |  |
| `wealth` | Investimentos | Cofre de casa |  |
| `wealth` | Equipe pessoal e fundação | Cofre de casa |  |
| `wealth` | Patrimônio | Cofre de casa |  |
| `wealth` | Bens e investimentos | Cofre de casa |  |
| `world` | América do Norte | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Europa | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Brasil | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | América Latina e Caribe | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Ásia e Oriente Médio | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | África | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Oceania | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Blues e jazz | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Country e folk | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | R&B, soul, funk e disco | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Rock | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Pop | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Latina | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Brasil | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Ásia e Oriente Médio | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Europa | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Sagrado e clássico | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Hip hop | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Eletrônica | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Caribe e reggae | Revista de paradas (muda) | Paradas por região e gênero viram capítulos da revista de paradas. |
| `world` | Mapa e cenas | Mapa-múndi |  |
| `world` | História, leis e lugares | Mapa-múndi |  |
| `world` | Países | Mapa-múndi |  |
| `world` | Cenas locais | Mapa-múndi |  |
| `world` | Marcos da história | Mapa-múndi |  |
| `you` | Perfil | Espelho |  |
| `you` | Personalidade | Espelho |  |
| `you` | Decisões | Espelho |  |
| `you` | Aparência | Espelho |  |
| `you` | Carreira musical | Espelho |  |
| `you` | Diário | Diário na gaveta (muda) | O diário pessoal fica no diário da gaveta. |
| `zines19` | Fanzines e cenas | Jornal na mesa |  |
| `zines19` | Sua revista | Jornal na mesa |  |
| `zines19` | Críticos e editores | Jornal na mesa |  |
| `zines19` | Arquivo da mídia | Jornal na mesa |  |
