# Rodada 19 — tudo o que mudou

## Base de integração
- **Matriz de fatos** (`factmatrix19`): todo fato emitido tem quem o consuma; **fluxos aleatórios por sistema** (`rng19`), **calendário único** (`calendar19`), **boletim semanal** (`notify19`), fachadas de fãs, rivais e prêmios.
- Ligações novas entre sistemas (`links19a/b`), ecos de decisões (`echoes19`), eras e contexto histórico (`era19`, `eracon19`, `realhist19`).

## 13 sistemas novos e cadeias de história
- **Covers e tributos** (bandas cover, tributos, regravações famosas), **revivals** de músicas antigas, **sessões de estúdio** (músicos de sessão, greves de gravação), **compositores contratados**.
- **Remix e DJs**, **publicidade e sincronização**, **trilhas de cinema/TV/games**, **ondas de cancelamento**, **seguros de pessoa-chave**, **cultura da empresa**, **naming rights**.
- **Regiões e escolas** (comunas, exílio, cotas e vistos, needle time, greves da AFM, campanhas políticas, escolas e conservatórios), **zines e revistas próprias**, **farsas** (playback, bandas-fantasma, voz de IA), **shows beneficentes**, **concursos e festivais de TV**, **espólio como personagem**, **equipamento e endossos**.
- **Dinheiro**: falência e leilão de masters, regravação estilo "Taylor's Version", títulos Bowie, juros por era, compra e venda de contratos, empresário "total", janelas de transferência e empréstimo de artistas.
- **Mercado**: certificações por país, pesquisa de mercado, artistas-fantasma em playlists, contratos 360, antitruste em fusões, ciclo de vida das cenas (nascimento → febre → saturação → revival).
- **Ao vivo**: boicote ao monopólio de ingressos, festival gratuito, volta do vinil e Record Store Day, calendário sazonal.
- 6 **cadeias de história** que ligam vários sistemas.

## Banco de dados
- ~150 marcos históricos (1925–2026) com decisão e mecânica, ~60 eventos geopolíticos, mais artistas por país, imprensa, formatos de rádio/TV, covers e samples documentados, cenas locais, relíquias, organizações; modo exato só com fatos documentados.

## Auditoria (8 pontos) aplicada
- **Toda carreira sustenta uma partida**: pacote inicial por carreira (empréstimo de fundação se faltar dinheiro), custos de selo só com selo, empresário com candidatos realistas, espera após recusa, patrocínios com chance, renovação de mandato como decisão e crises do ramo; festival com terreno que cresce, público que depende do line-up e decisões entre edições.
- **Regras fixas viraram contexto** com "por quê?": dedicação × diretor, saturação de obras, credibilidade da crítica, festival rival, regra do plano do empresário e outras 10.
- **Chance mostrada = chance sorteada** em todas as negociações; o tamanho do pedido pesa na contraproposta.
- **Cockpit por profissão** (ações rápidas e "Hoje/Ameaças" de cada carreira).
- **Volume de eventos**: orçamento global de conflitos, avisos menores agrupados no resumo do mês, aviso antes de avançar listando o que vai valer o padrão, delegação por carreira.
- **Vitórias pequenas**: formador de talentos, casa duradoura, veículo de referência, editora de nicho, plataforma, independente; 19 marcos por carreira.
- **Economia entre seus negócios**: transferências internas a preço de mercado, "desconto da casa", avisos de conflito de interesse e aba **Grupo e consolidado**.
- **Histórias da partida**: decisões leem mágoas, favores, promessas e temperamento (linha "⚖ Contexto").

## Nosso mundo (bairro da sede)
- O mapa é o **bairro** da cidade da sede, com **pontos turísticos** no horizonte (datas reais de construção e demolição; só atalho para marcar show, sem liberar mecânica).
- Começa **pequeno** (salinha de loja, garagem, quarto-estúdio, estúdio caseiro conforme a época) e cresce em etapas.
- **13 estilos de fachada** por época (vitoriano, gótico, art déco, modernista, brutalista, pós-moderno, vidro, eco…), com custo, manutenção e efeito pequeno.
- **Popups no mapa** (prédio, lote vazio, vizinho, marco, evento), vizinhos compráveis, bônus de vizinhança, eventos do bairro com decisão, fases do bairro que seguem a história real de cada lugar.

## Cenas e premiações
- Calendário real de cada prêmio (Gramofones desde 1959, cerimônia em fevereiro), **indicados oficiais**, **sem spoiler** (o resultado só sai depois da cena), roupa do tapete vermelho escolhida antes e pesando no voto, cerimônias na Cinemateca, casamentos e nascimentos como cena, menos cenas de NPCs, cenas para artista e empresário.

## Interface
- Card de virada de década/era com metas, recibo de decisão, "Por que perdi?", epitáfio e conquistas entre partidas, retrospectiva da década, menus que se abrem aos poucos, acessibilidade.
- **"Sem tutoriais (já sei jogar)"** no título, no Novo Jogo e em cada tutorial.
- Textos e nomes de abas que mudam com a época; nada do futuro na tela.

## Equilíbrio e desempenho
- Corrigidos: ordens delegadas cobrando 100× o valor mostrado, multa fixa por show duplicado, aluguel provisório eterno, pirataria maior que o faturamento, crise do petróleo em 1975 forte demais.
- Falência (12 partidas × 5 anos): equilibrado 17%, cauteloso 17%, agressivo 33%, artista 0%, empresário 0%, festival 17% — detalhes em [balance19.md](balance19.md).
- Teste de balanceamento rápido (`npm run balance:quick`), testes longos só com `BALANCE_FULL=1`.
