# Rodada 20 — auditorias de UI/UX, análise profunda e nova run

## Confiança (saves e turno)
- Indicador de save sempre no topo (local/nuvem, último checkpoint confirmado, falha visível, "Tentar de novo"); lista de saves com erro não vira lista vazia.
- Nuvem com chunks por geração e publicação atômica; importação com limites e validação; envelope com versões (formato, save, RNG) e recusa de versões futuras sem dano.
- Avanço de turno transacional: erro no meio restaura o estado anterior (inclusive Ironman).

## Finanças
- Títulos (bonds) como dívida no balanço; covenant bancário rotulado com o subconjunto que conta.
- Adiantamento de oferta reserva caixa e é revalidado em todo aceite; contas a receber/pagar ao vivo com foto datada no fechamento.
- Teto opcional na cláusula de recuperação; "Legado do selo" × "Legado por caminhos".
- Finanças → **Posição** (Agora × Último fechamento, obrigações consolidadas, reconciliação); Empresa com "Resumo financeiro" da mesma fonte.

## Simulação
- Show ao vivo reproduzível (sem `Math.random`); kit efetivo (van→ônibus) igual na previsão, no save e no acerto; segurança só nas cartas de público.
- Concorrência de shows com a mesma conta na previsão e na bilheteria (corrigido o dia 7 da semana); preço por mercado de destino.
- Elegibilidade única de contratação e olheiros sem fallback que viola filtros; saída de integrantes centralizada; facções pelo grafo de relações.
- Show do ano por foto de cada show; rivais escolhem mercados por oportunidade; aviso de fim de carreira; gêneros sem anacronismo; temas pela cidade.
- Fãs por região (casuais/ativos/fiéis) que somam o total; preço por mercado opcional.

## Interface
- **Artistas**: lista com filtros, cabeçalho com estado e alertas, 5 subabas e "Ficha completa"; menu **Ações ▾** (clique, botão direito, teclado, celular) com catálogo único de ações (menu, Ctrl+K, Sede, tutorial), ações fixadas e em lote; "Preparar gravação".
- **Shows** (Agenda / Turnês em 5 etapas / Operação / Negócios ao vivo), sala de controle do próximo show; **Sede** (Operação com planta ou lista, Estrutura, Equipe, Equipamentos, Expansão, História); **Mundo** por perguntas, legenda com unidade/data/confiança.
- **Cockpit** com o essencial e a caixa de entrada como aba; pós-turno "3 destaques + N outros"; oferta de contrato em 3 grupos com comparação e revisão de caixa; revisão do projeto por fase; ajuda em toda área; gráficos acessíveis; modo compacto.

## Nova run
- Padrão **Reais em mundo aleatório**: nomes reais, mas catálogo, contratos, vínculos e trajetórias simulados desde o início (política versionada). Os seis modos continuam ("Fidelidade histórica" é o antigo Vida real exata).
- Tela "Crie sua próxima história": 4 áreas (Mundo, Você e seu começo, Regras e ritmo, Revisão), presets Recomendado/Historiador/Sandbox/Desafio, comparação de modos, resumo editável, prévia rápida honesta, configuração única resolvida; saves e códigos antigos mantêm a semântica ("Configuração legada").
