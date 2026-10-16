# Onda 5 · mapa de todas as telas no jogo explorável

Levantamento de 2026-10-16: ~95 páginas, ~330 abas internas, ~30 cenas em pixel art. Menu esquerdo atual: Hoje, Sede,
Cidade, Mundo, Você, Listas, Buscar, Opções (`ui/ps/menu31*.ts`). Atalhos de uma tecla já existem para ~45 páginas
(`KEY17` em `ui/nav17.ts`), Shift+1…6 para o menu e Ctrl K (paleta) para busca.

## Regras para poucos cliques

1. **Tudo a no máximo 2 cliques da sede:** clicar no objeto abre o papel ou a cena (1 clique) e a aba interna fica no
   segundo (abas do fichário, capítulos da revista, páginas do livro; `{` e `}` trocam).
2. **Uma tecla abre qualquer função de qualquer lugar.** Os atalhos de hoje continuam e passam a abrir o objeto
   correspondente; o objeto mostra a tecla ao passar o mouse. Tecla `?` = lista de teclas.
3. **Ctrl K continua** como busca (pessoas, selos, obras, "quero…"). É busca, não lista de navegação.
4. **Avisos levam direto:** cada item da secretária eletrônica, da agenda e do jornal tem "ir até lá", que abre o objeto
   ou a cena certa (0 navegação). Objetos e prédios com novidade ganham "!".
5. **Clicar numa pessoa em qualquer cena** abre a ficha do personagem (que fica como está) e o menu "Ações ▾" que já existe.
6. **Viagem rápida:**
   - andar é opcional (animação curta, pulável);
   - porta da rua → mapa da cidade, com 1 clique para entrar em qualquer prédio;
   - mapa-múndi → país → cidade;
   - "ir até lá" pula direto.
7. **Bolso (barra pequena fixa, opcional):** até 8 objetos fixados pelo jogador (substitui os "Fixados" de hoje). Não
   é lista de tudo, só atalhos escolhidos.
8. **Esc volta um nível; uma tecla (H) volta à sede de qualquer lugar.** O topo continua com data, caixa e "Avançar mês".
9. **Carreiras (12):** o prédio da carreira principal é a sede; os objetos trocam de nome e arte por carreira (já
   acontece com "QG da banda", "Agência"…). Outras carreiras ficam como prédios ★ na cidade.

## Sede — o centro (substitui Hoje, Sede e quase toda Listas)

| Lugar na sede | Objeto | Abre (páginas de hoje) | Tecla |
|---|---|---|---|
| Recepção | Porta da rua | Cidade (`campus18`) | Shift+3 |
| Recepção | Mapa-múndi na parede | Mundo (`world`, mapa) | W |
| Sua sala | Correspondência (objeto muda com a época) | Caixa de entrada `inbox`, Caixa 2.0 | E |
| Recepção | Calendário de parede | Compromissos `plan`, `agenda17`, `calendar19`, `cal17` | C |
| Sua sala | Mesa do mês | Mesa `desk` (já é cena) / Cockpit | 1 |
| Sua sala | Livro-caixa | Finanças `finance` (posição, DRE, empréstimos, bolsa, dívida) | Z |
| Sua sala | Cofre da empresa | Capital e sócios, caixa | — |
| Sua sala | Arquivo de aço | Contratos `contracts19`, direitos `rights18`, `artist18` | — |
| Sua sala | Fichário de contatos (rolodex) | Artistas conhecidos `knownacts27`, diretório `directory` | A |
| Sua sala | Telefone | Empresários `managers14`, pedidos, agente | G |
| Sua sala | Jornal na mesa | Notícias `news17`, críticos `critics`, fanzines `zines19`, boatos `fakes19` | ' / Q |
| Sua sala | Rádio/TV | Mídia `media` e Paradas `charts` (revista de paradas, capítulos por parada) | 6 / 3 |
| Sua sala | Quadro de metas | Metas `goals` (cenário, conquistas) | F |
| Sua sala | Diário na gaveta | Diário `diary`; Fios do Mestre `dm18` como anotações | D |
| Sua sala | Caderno na estante | Aprendizados `learn31`, Resultados `results31` | — |
| Sua sala | Porta-retrato | Casa Fossati e praça | — |
| Sala de reunião | Quadro branco | Lançamentos `releases`, rollout, reunião de lançamento | U |
| Sala de reunião | Mesa de reunião | Reunião `long18`, Diretoria `deleg31`, Sócios `soc31` | — |
| Sala de reunião | Maquete do prédio | Obras e expansão `hq` | 2 |
| A&R | Mural de cortiça | Seu elenco `artists`, Pessoas `people` | 4 / P |
| A&R | Mesa do olheiro (caderno) | Mercado `market`: procurar, funil, olheiros, feiras, dossiês | 5 |
| A&R | Pilha de demos | Talentos `talent18` | — |
| Lounge | Artistas sentados | Dinâmicas `dyn18` (relações, saúde, cartas); clicar na pessoa = ficha | — |
| Estúdio | Mesa de som | Estúdio `studio`; criação: receita sonora, direção, equipamento, músicos de sessão | S / 8 |
| Estúdio | Piano | Compor, temas, parcerias, encomendas, mercado de canções `songmkt27` | — |
| Estúdio | Sala de gravação | Projeto `project` (rua dos projetos já é cena) | \ |
| Arquivo | Prateleiras de masters | Catálogo `catalog`: sync, história, retrospectiva, remaster, tributos, `media19` | 7 |
| Financeiro | Contador (pessoa) | Empresa `business`: grupo, era, disputas, IA, seu bolso | B |
| RH | Quadro de funcionários | Equipe `team`, `company`, `firm19` | T / 0 |
| Pesquisa | Gráficos na parede | Dados `industry`, `market19a` | I |
| Corredor | Estante de troféus | Prêmios `awards`, Hall da fama `rockhall`, museu do selo | O / R |

## Caixa de entrada — a correspondência

A caixa de entrada continua como é hoje: entrada, adiadas, arquivadas, busca, ordem por data/prioridade, filtros (não
lidas, pedem resposta, estrela, decisões, contratos, imprensa, finanças, mundo, relatórios), respostas com consequência,
"consequências pendentes" e as teclas (J/K, Enter, A, S, Esc). Muda só a forma, por época:

| Época | Objeto | Como aparece |
|---|---|---|
| 1889–1919 | Escrivaninha com envelopes | Cartas com lacre colorido por categoria; o carteiro passa na recepção |
| 1920–1969 | Cartas e telegramas | Urgentes chegam como telegrama amarelo |
| 1970–1989 | Telex e fax | Máquina de fax que cospe papel; secretária eletrônica para recados |
| 1990–2009 | Computador | E-mail num monitor de tubo, depois tela plana |
| 2010–2040 | Celular e app | Notificações no telefone; mensagens e áudios curtos |

Abre como papel/tela por cima da cena (mock: `docs/r31/mocks/onda5/onda5-mock-caixa.png`); "Responder" usa a cena da
mecânica quando existe (negociação, banco, compra…). Tecla E de qualquer lugar; o objeto mostra o número de não lidas. A troca de forma por época acontece sozinha; não
existe linha do tempo nem explicação das épocas na tela (decisão do dono).

### Mecânicas da correspondência por época (propostas)

**Regra do dono (2026-10-16):** a caixa de entrada é a mesma em qualquer época: tudo chega na hora, nada se perde, nada
atrasa, mesmos filtros, respostas e teclas. A época muda só a aparência (mocks `onda5-mock-caixa-85/00/25.png`). As ideias
abaixo são mecânicas à parte, que acontecem fora da caixa (eventos, objetos, escolhas), e nunca mudam o funcionamento dela.
Atributos que guiam essas mecânicas: **custo**, **privacidade** e **alcance**.

**Cartas (1889–1919, e depois como meio "pessoal")**
- **Censura em guerra** (1914–18, 1939–45) como notícia e evento: carta de artista estrangeiro chega riscada (só texto).
- **Carta de próprio punho** para artista, crítico ou dono de rádio: sobe a relação mais que um recado. Sai uma por mês,
  porque gasta energia.
- **Sacos de cartas de fãs** medem a fama; responder fãs dá lealdade.
- **Carta de apresentação:** abre porta com quem você não conhece (sobe o conhecimento).
- **Carta guardada vira prova:** chantagem e trunfo (holds), falsificação no submundo, relíquia ou memórias no futuro.

**Telegrama, telefone fixo e telex (1920–1969)**
- **Telefone de mesa:**
  - fechar negócio na hora (negociação mais rápida, sem tempo para pensar);
  - interurbano caro;
  - telefonista ou mesa PBX na sede;
  - linha cruzada pode revelar um segredo;
  - grampo (polícia ou rival).
- **Telex (1930+):** acordos internacionais sem viajar.
- **Lista telefônica** = o fichário ganha telefones.

**Fax, secretária eletrônica, bip e "tijolão" (1970–1989)**
- **Fax:**
  - contrato assinado à distância, para fechar acordo em outro país sem viajar;
  - fax enviado ao número errado vaza documento para a imprensa.
- **Bip (pager):** emergências de turnê te alcançam fora da sede.
- **Celular tijolão (1985+):** caro, dá prestígio e você atende em qualquer lugar.

**Computador e e-mail (1990–2009)**
- **E-mail instantâneo:**
  - demos por e-mail (MP3) aumentam o funil de A&R, mas com muito mais lixo;
  - um assistente filtra o spam.
- **Responder a todos sem querer** vira escândalo.
- **Disco vazado** antes do lançamento (1999+): risco por e-mail ou FTP; segurança custa.
- **Mailing list e site do artista:** marketing direto com os fãs; MySpace (2003–2008) com mensagens de fãs.
- **Dados de vendas mais precisos** (SoundScan, 1991): o conhecimento do mercado sobe.
- **Vírus e invasão** (2000+): dados roubados.

**Celular e apps (2010–2040)**
- **Grupo da banda no app:** o clima da banda fica visível; print vazado vira escândalo.
- **Redes sociais no bolso:** posts do artista, viral, cancelamento, DMs de fãs, números de streaming em tempo real.
- **Videochamada:** reunião à distância (sem viajar, mas com menos efeito que ao vivo).
- **Golpes:** phishing, clonagem e deepfake de voz (2025+).
- **Assistente de IA (2030+)** tria e responde o rotineiro (liga com a delegação `deleg31`).

**Transversais**
- A chegada de cada meio novo é um evento (o primeiro telefone da sede, o primeiro fax, o primeiro e-mail) e troca a
  aparência da caixa; não muda prazos.
- Os meios antigos não somem de vez: carta de próprio punho continua valendo mais em 2030.

## Botões de viagem (lugares principais)

- Uma barra fixa pequena num canto (embaixo à esquerda, antes do bolso) com botões grandes em pixel art: **Sede**,
  **Casa**, **Cidade** e **Mundo**.
- Teclas Shift+1 a Shift+4 (as mesmas do menu de hoje).
- Cada botão ganha "!" quando há novidade lá.
- Clicar leva na hora, sem passar tempo, e o botão do lugar atual fica aceso.
- Com várias carreiras, o botão Sede vira a casa da carreira atual (o chaveiro troca).
- É diferente do bolso: os botões de viagem são fixos; o bolso é de objetos que o jogador escolhe.

## Cidade — prédios (o menu "Cidade" de hoje já tem quase todos como lugares)

| Prédio | Abre |
|---|---|
| Casa de shows | Shows `shows`, ao vivo `live19`, turnê (cena) |
| Rádio e TV | Mídia `media`, campanhas, clipes, jabá (cena) |
| Jornal | Notícias, críticos, fanzines |
| Bar | Talentos `talent18`, `after18`, noite `night14` |
| Empresários | `managers14` |
| Estúdios de terceiros | Produtores `producers15` |
| Prédios dos rivais | Selos `labels` (clicar = ficha do selo) |
| Beco do submundo | `crime` (organizações, planos, mercado negro, polícia, mural de ligações) |
| Prefeitura | Sociedade `society18` |
| Fábrica | Prensagem `supply18` |
| Banco | Empréstimos (cena do banco) |
| Aeroporto e porto | `airport31`, viagens, cruzeiros |
| Casa de leilões | `auction31` |
| Loja de instrumentos | `loja31` |
| Terreno do festival | Festivais `festivals` |
| Sua casa | Vida pessoal (abaixo) |
| Casa Fossati e praça | Família e extras (`fossati31`, `extras31`) |
| Lotes e prédios à venda | Compra (cena de compra) |

## Sua casa — substitui "Você"

| Objeto | Abre |
|---|---|
| Espelho | Ficha do personagem `you` (fica como está, só polida) |
| Cama | Descansar e energia |
| Calendário da cozinha | Agenda pessoal |
| Telefone de casa | Contatos, chamar para sair (AMOR) |
| Instrumento na parede | Praticar e aprender instrumento |
| Escrivaninha | Compor sozinho, memórias |
| Gaveta ou cofre | Patrimônio pessoal `wealth` |
| Porta-retratos | Parceiro, filhos e família `personal`, "Coração" |
| Escritório em casa | Outras carreiras `careers`, negócios `ventures`, sociedades `shared18` |
| Estante | Lembranças `scenes17` |
| Garagem | Veículos |
| Quarto das crianças | Aparece quando há filhos |

## Mundo — mapa-múndi

| Clique | Abre |
|---|---|
| País | Mercado do país `regions18`/`regions19` |
| Cidade de outro país | Mapa daquela cidade (prédios, lugares reais) |
| Telex na borda | "Este mês no mundo" `mundo27`/`world17` |
| Ícone de festival | Festivais do mundo |
| Livro "Cultura" | Movimentos `movements`, Lendas `lendas`, era |

## Telas que faltavam no mapa

| Tela de hoje | Onde fica |
|---|---|
| Painel do Cockpit (mês, caixa, fôlego, fama) | Topo (HUD) ampliável com um clique; detalhes no livro-caixa |
| Suas casas (várias carreiras ativas) | Chaveiro na recepção (uma chave por casa) e tecla Tab para trocar |
| Decisões de carreira `car31` | Mesa de reunião |
| Consequências pendentes | Bloco de notas ao lado da correspondência |
| Avisos rápidos (toasts) | Alguém entra na sala com o recado (balão), sem parar o jogo |
| Cenas que abrem sozinhas (prêmios, fim de ano, marcos) | Continuam como cenas automáticas |
| Comparar artistas e carreiras | Fichário: marcar cartões e "comparar" |
| Controles de tempo (semana, trimestre, até…) | Topo, junto de "Avançar mês" |
| Tutorial e conselheiro | Um personagem guia na sede nos primeiros meses |
| Tela inicial, nova partida, editor de base, fim de jogo | Fora do mundo, como hoje (já em pixel art) |

## Fora do mundo

**Menu de pausa (Esc ou engrenagem):** salvar/carregar, opções (incl. Nomes reais), ajuda `tut18`, editor `editor31`
(modo editor), índice completo (só para quem quer, como "mapa do jogo" de consulta).

## O que some

- O menu esquerdo inteiro.
- "Listas" e "Outras páginas".
- Os modos "Ver como lista" das cenas.
- As abas do topo.

O índice completo pode ficar só no menu de pausa, como consulta, se o dono quiser; a navegação do dia a dia nunca passa
por ele.

## Ordem sugerida

1. **Sede:** objetos que abrem as páginas atuais, mais teclas, Ctrl K, "ir até lá" e "!".
2. **Casa:** substitui Você.
3. **Mundo e cidade:** sem lista.
4. **Papéis:** as páginas viram papéis por cima da cena (fichário, livro-caixa, revista de paradas, jornal).
5. **Sede que cresce:** objetos aparecem quando a função é liberada.
