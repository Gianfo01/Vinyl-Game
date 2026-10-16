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
| Recepção | Secretária eletrônica (pisca) | Bandeja `inbox`, Caixa 2.0 | — |
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
