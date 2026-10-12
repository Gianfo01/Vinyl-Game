# As 16 camadas da Teoria de Tudo dos Jogos

Cada camada tem: **base teórica**, **perguntas-guia**, **testes** (o que medir/procurar) e **rubrica 0–5**.
Rubrica geral: 0 = ausente ou quebrado · 1 = trabalha contra o jogo · 2 = fraco, com problemas visíveis · 3 = funciona, sem brilho ·
4 = forte, poucos ajustes · 5 = referência, nada a mudar agora. As rubricas abaixo dizem o que distingue 2, 3 e 5 em cada camada.

Agrupamento (útil para dividir entre agentes):
- **Sistema** (regras): 2 MDA, 7 Teoria dos jogos, 8 Sistemas e economia, 9 Probabilidade
- **Mente** (jogador): 3 Diversão/aprendizado, 4 Fluxo, 5 Motivação, 6 Decisões
- **Superfície** (o que se vê): 10 Narrativa, 11 UX/informação, 12 Estética e sensação
- **Tempo e contexto**: 1 Identidade, 13 Sessão e retenção, 14 Técnica, 15 Ética, 16 Mercado

---

## 1. Identidade e pilares
**Base**: visão de design, "fantasia do jogador", pilares (GDD), promessa central.
**Perguntas**
- Qual é a fantasia em uma frase? Os pilares estão escritos? Eles são escolhas (excluem algo) ou slogans?
- Cada sistema principal serve a qual pilar? Há sistemas que não servem a nenhum?
- O primeiro contato (tela inicial, primeira hora) entrega a fantasia?
**Testes**: tabela Sistema × Pilar (✔ serve / ✖ contradiz / — neutro). Conte sistemas órfãos.
**Rubrica**: 2 = pilares vagos ou sistemas órfãos relevantes · 3 = pilares claros, alguns órfãos · 5 = tudo serve a um pilar e a primeira hora entrega a fantasia.

## 2. MDA — Mecânicas, Dinâmicas, Estéticas
**Base**: Hunicke, LeBlanc & Zubek (2004); os 8 tipos de diversão (sensação, fantasia, narrativa, desafio, companheirismo, descoberta, expressão, passatempo).
**Perguntas**
- Quais estéticas (dos 8 tipos) o jogo mira? Quais ele realmente produz?
- Para cada estética-alvo, quais dinâmicas a geram e quais mecânicas geram essas dinâmicas?
- Há mecânicas cuja dinâmica contradiz a estética-alvo (ex.: microgestão numa fantasia de "visão de magnata")?
**Testes**: árvore M → D → E para as 3 estéticas principais. Marque elos quebrados ou só presumidos.
**Rubrica**: 2 = estéticas-alvo não são produzidas · 3 = produzidas, com elos fracos · 5 = cadeia completa e reforçada por vários sistemas.

## 3. Teoria da Diversão (Koster) e curva de maestria
**Base**: Raph Koster, *A Theory of Fun* — diversão é aprender padrões; quando o padrão é dominado ("grokked"), vem o tédio.
**Perguntas**
- Quais padrões o jogador aprende na 1ª hora, na 10ª, na 50ª? Sempre há um padrão novo a dominar?
- Quando a estratégia ótima fica óbvia? O jogo renova o desafio (eras, rivais, mutadores, metas)?
- Existe "padrão sem sentido" (ruído que não dá para aprender)?
**Testes**: linha do tempo de introdução de sistemas/padrões; ponto em que a variância de resultados entre perfis de jogador cai (sinal de padrão resolvido).
**Rubrica**: 2 = resolvido cedo ou opaco demais · 3 = renova até meio do jogo · 5 = novos padrões até o fim, com transferência do que se aprendeu.

## 4. Fluxo, dificuldade e ritmo
**Base**: Csikszentmihalyi (fluxo: desafio ≈ habilidade), curvas de dificuldade, ritmo tensão/alívio.
**Perguntas**
- Como a dificuldade evolui ao longo da partida? Há picos injustos ou vales longos?
- A dificuldade escolhida muda o quê (números, regras, informação)?
- Existe espiral da morte (perder causa mais perda) ou bola de neve (ganhar garante ganhar)? Há recuperação?
**Testes**: taxa de falência/derrota por perfil e por momento da partida; tempo até a primeira derrota possível; curva de caixa/recurso médio ao longo do tempo com dispersão.
**Rubrica**: 2 = derrota quase certa ou impossível · 3 = curva razoável, com vales · 5 = tensão sobe e desce, recuperação possível mas custosa.

## 5. Motivação e perfis de jogador
**Base**: Teoria da Autodeterminação (autonomia, competência, pertencimento), tipos de Bartle, modelo Quantic Foundry (ação, social, maestria, conquista, imersão, criatividade).
**Perguntas**
- Onde o jogo dá autonomia real (caminhos diferentes que funcionam)? Onde sinaliza competência (feedback de progresso)? Há pertencimento (personagens, mundo, comunidade)?
- Quais perfis o jogo atende bem e quais ignora? Isso combina com o público-alvo?
- Recompensas são intrínsecas (o próprio jogar) ou só extrínsecas (números, conquistas)?
**Testes**: inventário de recompensas classificadas por necessidade (A/C/P) e por perfil; número de estratégias viáveis distintas (cruza com camada 7).
**Rubrica**: 2 = uma necessidade ignorada ou só recompensa extrínseca · 3 = as três presentes, desiguais · 5 = as três fortes e coerentes com o público.

## 6. Decisões interessantes
**Base**: Sid Meier ("um jogo é uma série de decisões interessantes"); trade-offs, informação, consequência, reversibilidade.
**Perguntas**
- Para as decisões mais frequentes: existe trade-off real? A resposta certa é óbvia? O jogador tem informação suficiente? A consequência aparece e é atribuível à decisão?
- Quantas decisões por minuto/turno? Quantas são "falsas" (só uma opção sensata)?
- O jogador consegue entender depois por que algo deu certo ou errado?
**Testes**: amostre 10–20 decisões típicas e classifique cada uma (trade-off ✔/✖, óbvia ✔/✖, informada ✔/✖, consequência visível ✔/✖). Conte as automatizáveis sem perda.
**Rubrica**: 2 = maioria óbvia ou cega · 3 = metade interessante · 5 = quase todas com trade-off, informadas e com consequência legível.

## 7. Teoria dos jogos e estratégia
**Base**: estratégias dominantes/dominadas, equilíbrio de Nash, dilemas, jogos repetidos, metagame, soluções degeneradas; IA adversária.
**Perguntas**
- Existe estratégia dominante (sempre melhor, qualquer contexto)? Existe exploit (ação barata com retorno desproporcional, repetível)?
- Os adversários/IA reagem ao jogador? Usam só informação pública? Podem ser explorados de forma previsível?
- Há escolhas pedra-papel-tesoura (contra-estratégias)? O equilíbrio muda por era/fase?
**Testes**: rodar perfis de bot diferentes (cauteloso, agressivo, especialista, "spam" de uma ação) e comparar resultados; procurar ações com custo fixo e retorno sem teto; ver se algum perfil domina em todas as condições.
**Rubrica**: 2 = estratégia dominante ou exploit fácil · 3 = alguns caminhos claramente melhores · 5 = várias estratégias viáveis, cada uma com contra-jogo.

## 8. Pensamento sistêmico e economia
**Base**: Donella Meadows (estoques, fluxos, laços de reforço e equilíbrio, atrasos, pontos de alavancagem); economia de jogos (torneiras e ralos, inflação, Machinations).
**Perguntas**
- Quais são os estoques principais (dinheiro, fãs, reputação, tempo, energia…)? Quais fluxos os enchem e esvaziam?
- Cada estoque tem laço de reforço e de equilíbrio? Onde há bola de neve sem freio? Onde há estagnação?
- Atrasos: o jogador percebe a ligação entre causa e efeito? Atrasos longos sem feedback geram decisões erradas.
- Há inflação (recursos acumulam sem uso no fim de jogo)? Os ralos continuam relevantes?
**Testes**: diagrama de estoques e fluxos (texto ou mermaid) dos 4–6 estoques principais; série temporal de cada estoque em simulação (média, p10, p90); razão torneira/ralo por fase.
**Rubrica**: 2 = bola de neve ou colapso sistemático · 3 = estável, com fase final inflacionada · 5 = economia viva até o fim, com laços legíveis.

## 9. Probabilidade, aleatoriedade e determinismo
**Base**: aleatoriedade de entrada × de saída, variância, sorte × habilidade, falácias de probabilidade do jogador, seeds.
**Perguntas**
- Onde a sorte entra antes da decisão (planejamento) e onde depois (resultado)? Há resultados decisivos por um único sorteio?
- A probabilidade mostrada ao jogador é honesta? Ele a entende (faixas × porcentagens)?
- O jogo é determinístico por seed? Replays/saves reproduzem o mesmo resultado?
- Quanto do resultado final é explicado pela habilidade (perfil do bot) e quanto pela seed?
**Testes**: mesma estratégia em N seeds (variância por sorte) × estratégias diferentes na mesma seed (variância por habilidade); teste de determinismo (rodar duas vezes e comparar).
**Rubrica**: 2 = sorte decide ou determinismo quebrado · 3 = equilíbrio razoável, alguns sorteios decisivos · 5 = habilidade domina no longo prazo e a sorte cria histórias.

## 10. Narrativa, mundo e emergência
**Base**: narrativa embutida × emergente, dissonância ludonarrativa, diretor de histórias (estilo RimWorld), apofenia do jogador.
**Perguntas**
- As histórias que o jogador conta depois vêm dos sistemas ou só de texto escrito?
- Eventos têm consequência que volta mais tarde (ecos)? Repetem demais?
- As regras contam a mesma história que o texto (sem dissonância)? O mundo é coerente com a época/tema?
**Testes**: frequência e repetição de eventos numa partida longa; parcela de eventos com consequência posterior; amostra de "diário" de uma partida e pergunta: dá para contar uma história com isso?
**Rubrica**: 2 = texto desconectado dos sistemas · 3 = algumas histórias emergentes · 5 = cada partida gera uma história única e coerente.

## 11. Interface, informação, onboarding e acessibilidade
**Base**: Don Norman (affordance, feedback, mapeamento), carga cognitiva, divulgação progressiva, tutoriais, Game Accessibility Guidelines, WCAG.
**Perguntas**
- O jogador acha a informação de que precisa para cada decisão em ≤ 2 cliques? O que é mostrado e não serve para nada?
- Feedback: toda ação tem resposta imediata e compreensível? Erros explicam o motivo?
- Onboarding: em quanto tempo o jogador faz a primeira decisão significativa? O tutorial ensina jogando ou com texto?
- Acessibilidade: contraste, tamanho de fonte/zoom, teclado, cor não é o único sinal, leitores de tela, telas pequenas, idiomas.
**Testes**: percorrer os fluxos principais contando cliques e telas; checar contraste/zoom/teclado; listar mensagens de bloqueio sem motivo; contar elementos por tela nas telas mais densas.
**Rubrica**: 2 = informação crítica escondida ou inacessível · 3 = usável com esforço · 5 = clara, progressiva e acessível.

## 12. Estética, som e sensação (game feel)
**Base**: coesão audiovisual, "juice", Steve Swink (game feel), identidade visual.
**Perguntas**
- A direção de arte e o som são coerentes entre si e com o tema? Mudam com o progresso (eras, fases)?
- Momentos importantes (vitória, perda, marco) têm peso audiovisual proporcional?
- Há inconsistências visuais (estilos misturados, ícones divergentes, textos estourando)?
**Testes**: inventário dos momentos-chave e do tratamento que recebem; capturas de tela comparando telas de épocas diferentes do desenvolvimento.
**Rubrica**: 2 = incoerente ou sem peso · 3 = coerente e funcional · 5 = memorável e reforça a fantasia.

## 13. Estrutura de sessão, progressão e retenção
**Base**: loops (núcleo, meta, longo prazo), metas de curto/médio/longo prazo, rejogabilidade (runs, seeds, mutadores), respeito ao tempo.
**Perguntas**
- Quanto dura uma sessão natural? Existe ponto de parada bom e um gancho para voltar?
- O jogador sempre tem uma meta de curto, uma de médio e uma de longo prazo visíveis?
- O que muda numa segunda/terceira partida? A variação é estrutural ou cosmética?
- Save/continuar é confiável? O fim da partida dá vontade de recomeçar?
**Testes**: mapa de metas por horizonte; diferença estrutural entre duas partidas com seeds/escolhas diferentes; tempo real de um turno/mês e de uma partida inteira.
**Rubrica**: 2 = sem gancho ou partidas iguais · 3 = boa primeira partida, repetição fraca · 5 = sessões com ritmo e partidas realmente diferentes.

## 14. Saúde técnica
**Base**: desempenho, determinismo, cobertura de testes, compatibilidade de saves, dívida técnica, robustez.
**Perguntas**
- Os testes passam? Cobrem as invariantes do design (economia, contratos, determinismo)?
- Desempenho: tempo de turno, de carregamento, uso de memória em partidas longas.
- Saves antigos carregam? Há migração? Estado inválido é detectado?
- Arquivos/módulos duplicados ou paralelos (versões 12, 14, 18… do mesmo sistema) que divergem?
**Testes**: rodar a suíte e o typecheck; medir tempo de simulação; procurar sistemas duplicados por nome; procurar `TODO`/`FIXME` em código de regra.
**Rubrica**: 2 = testes falhando ou lentidão que afeta o jogo · 3 = estável, com dívida acumulando · 5 = rápido, testado e com caminho de migração.

## 15. Ética, bem-estar e representação
**Base**: dark patterns (FOMO, compulsão, custos escondidos), respeito ao tempo do jogador, conteúdo sensível, representação de pessoas/culturas/épocas, uso de pessoas e marcas reais.
**Perguntas**
- Há mecânicas que exploram compulsão (recompensa variável sem fim, penalidade por ausência)?
- Temas sensíveis (abuso, drogas, exploração, preconceito histórico) são tratados com contexto e opção de filtro?
- Culturas, gêneros musicais, regiões e épocas são representados com cuidado e sem caricatura?
- Nomes, marcas e pessoas reais: risco legal ou de imagem?
**Testes**: inventário de conteúdo sensível e dos filtros existentes; busca por nomes/marcas reais nos dados; revisão de mecânicas de retenção.
**Rubrica**: 2 = padrão abusivo ou representação problemática · 3 = sem problemas graves, sem cuidado ativo · 5 = cuidado ativo, filtros e contexto.

## 16. Mercado, posicionamento e escopo
**Base**: comparáveis do gênero, público-alvo, proposta única, escopo × capacidade de produção.
**Perguntas**
- Quais são os 3–5 jogos comparáveis? Em que este é melhor, pior e diferente?
- O público-alvo é claro? A complexidade combina com ele?
- O escopo é sustentável? Há sistemas que custam mais manutenção do que valor entregam?
- O que seria o "corte vertical" que vende o jogo em 30 segundos de vídeo?
**Testes**: tabela de comparáveis; razão (nº de sistemas) ÷ (sistemas que aparecem na primeira hora); lista de candidatos a corte ou fusão.
**Rubrica**: 2 = sem diferencial ou escopo insustentável · 3 = diferencial claro, escopo arriscado · 5 = posição única e escopo sob controle.
