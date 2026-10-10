# Plano da Rodada 19 — "Tudo conversa": aprofundar ligações, história real e mecânicas que faltam

Base: `ideas19.md` (diagnóstico, 34 ligações I1–I34, 16 ajustes J, 28 ideias reais N1–N28, 33 mecânicas que faltam M1–M33),
R18 inteira e os quatro trabalhos que ainda estão sendo integrados: **final18** (equilíbrio/diversão/UX), **era1889**
(1889–1919), **decide18** (decisões com consequência agora/depois/ambas, home e caixa de entrada dinâmicas) e **cine18**
(cenas que mudam com decisões, cerimônia do envelope, hologramas e carreira póstuma). **artist18** (ser contratado por
gravadoras, sociedades) já entrou.

Regra de ouro da R19: **nenhum sistema novo entra sem pelo menos 3 ligações** (lê de 1+, escreve em 2+) e sem consumidor
no barramento de Fatos. Toda mecânica nova aparece no "por quê?" (`explain18`), no tutorial (`help18`) e numa cena ou
manchete quando for marcante.

---

## Frente 0 — Infra para a integração (primeiro; todas dependem)
| # | O quê | Por quê |
|---|---|---|
| 0.1 | **Rng por sistema** (`rngVersion` no save) | Um evento a mais não embaralha o resto; A/B de equilíbrio passa a valer |
| 0.2 | **Matriz Fato → consumidores** + teste que falha se um tipo de fato não tiver ouvinte | ~75 tipos emitidos, ~15 ouvidos hoje |
| 0.3 | **Bots adversários** (6 perfis que caçam exploits) no lote de equilíbrio | Encontrar estratégias dominantes antes do jogador |
| 0.4 | **Auditoria de `appeal`** (64 fontes) com teto por categoria em `caps18` | Bônus empilhados saturam |
| 0.5 | **Dupla contagem de streaming** (`STREAM_PAYOUT17` × `stream18`) — se final18 não resolver | Economia correta |
| 0.6 | **Fachadas únicas**: 3 módulos de fandom → 1, 5 de rivais → 1, 4 de prêmios → 1 (API antiga vira alias) | Menos ruído, ligações num lugar só |

## Frente 1 — Malha de ligações (o coração da rodada)
As 34 ligações de `ideas19` §3 mais as que nascem dos trabalhos em curso. Cada linha = regra + gancho + teste.

**Com sistemas existentes**
- Direitos × espólio × herdeiros × hologramas: `neural` passa a exigir aprovação do espólio (`heirs8`), paga via `rights18`, gera fato e escândalo se for de mau gosto.
- Cadeia física (`supply18`) × hype × rollout: fila na fábrica atrasa lançamento → hype esfria → rádio perde a janela.
- Rádio (`radio18`) × censura (`society18`) × leis da época (`world4/laws`): música banida vira pirataria e rádio pirata.
- Festivais (`fest18`) × segurança de shows (`live18`) × crime: festival lotado sem segurança → tragédia → processo → lei nova.
- Qualidade (`quality18`, 10 dimensões) × sessões (`session18`) × CA/PA (`ability18`): músico de estúdio bom sobe a dimensão certa e ganha experiência.
- Regiões × câmbio (`econ18`): receita em moeda local, crise cambial atinge quem depende do submercado.
- Rivais que aprendem (`rivalmind18`) × relatório (`report18`): espionagem revela intenção; pactos e traições.
- Campus/"Nosso mundo" × moral da equipe × qualidade × atração de talento.
- Prestígio (`paths18`) × críticos × prêmios: júri lê o caminho que você escolheu.

**Com os trabalhos que estão entrando agora**
- **era1889**: cilindro/disco, editoras de partitura, patentes (Edison × Berliner), vaudeville e piano roll alimentam direitos (direito mecânico 1909), cadeia física (prensagem de goma-laca), rádio (só a partir de 1920) e marcos da história.
- **decide18**: toda decisão nova registra a consequência adiada como fato → ouvintes de outros sistemas reagem (promessa quebrada → rancor em `holds17`; investimento → `campus18`; mentira → `scandal17`). A caixa de entrada vira o ponto único de prazos (calendário P2).
- **cine18**: cena lê o estado (roupa, palco, prédio, multidão, idade, formação) e escreve fato ("discurso polêmico" → imprensa). Cerimônia do envelope usa o júri unificado (0.6). Holograma liga a espólio, direitos, ética por país/época.
- **artist18**: ofertas de gravadoras usam a reputação real das gravadoras NPC (honestidade, histórico de processos, falências); sociedade com NPC participa de festivais, campus e venda da empresa.

## Frente 2 — História real como conteúdo
- Marcos 43 → ~150 (fatiado por década, de 1889 a 2023), cada um com escolha e consequência, não só texto.
- Cartão "A história real" ao lado do que aconteceu na sua partida (nos modos alternativos).
- Pilotos (um por fatia): MTV e a barreira de cor, rádio pirata e a lei de 1967, Eurovisão, festival gratuito que deu errado.
- Fora do modo "Vida real exata": nomes fictícios nos casos sensíveis; conferir os itens † antes de virar dado.

## Frente 3 — Direitos, masters e dinheiro
- Falência de gravadora e **leilão de masters** (caso Stax) + banco chamando a dívida (hoje 0 falências em 21 campanhas).
- Venda de contrato de estrela (Sun → RCA), empresário total (Coronel Parker).
- Regravação "Versão do Artista" e direito de preferência (Taylor Swift).
- Securitização de catálogo (Bowie Bonds) com risco tecnológico; **múltiplos de catálogo ligados aos juros** (M13).
- Cumprir contrato com disco ruim de propósito (Prince × Warner); briga de gestão (Klein).
- **Cláusulas de saída e multa rescisória** (M2) e **janelas de transferência / empréstimo de artista** entre gravadoras (M1).

## Frente 4 — Pós-vida e espólio
- Espólio como personagem (herdeiros com opinião, brigas, processos); palco digital como empreendimento (ABBA Voyage) ligado ao campus.
- Prêmios póstumos, discos do baú, cinebiografia ligada a `screen18`.

## Frente 5 — Ao vivo, fãs e festivais
- Fandom unificado (0.6) com motivações; boicote ao monopólio de ingressos (Pearl Jam × Ticketmaster).
- Vinil e Record Store Day; **calendário sazonal** de lançamentos (M6: Natal, verão, festivais).
- Bandas cover/tributo (M24) que mantêm o catálogo vivo e pagam direitos.

## Frente 6 — Regiões, sociedade, política
- República-comuna e exílio (Fela/Kalakuta, Tropicália); império do cassete (T-Series), reggae e soundsystem, salsa (Fania), selo de rua do hip-hop.
- **Cota de músicos estrangeiros / vistos de turnê** (M11), **needle time** e sessões de rádio (M9), música em campanha política (M29).
- **Greve de gravação jogável** (1942/1948) com fundo de músicos (M10), ligada a sindicato e à era1889→1940.

## Frente 7 — Mercado, rivais, plataformas
- **Certificações por país e época** com fórmula de streams (M8) — a de maior impacto por esforço.
- **Pesquisa de mercado / teste de faixa** antes de escolher o single (M7).
- "Perfeita para a playlist" e artistas-fantasma (alegações; tratar como ficção), saída de superestrelas para contratos 360 de promotora (Madonna × Live Nation), remédios antitruste em fusões.
- Corrida do ouro numa cena (Seattle) com ciclo de vida da cena.
- **Ondas de cancelamento digital** (M20); **seguro de pessoa-chave e plano de saúde** (M17); **cultura da empresa** (M4); **naming rights** (M30).

## Frente 8 — UX, ritmo e consolidação
- Três perguntas no topo (Hoje / Ameaças / Andamento), **calendário único de prazos**, orçamento de notificações.
- Recibo de decisão, transição de década, tela "por que perdi?", divulgação progressiva das áreas.
- Tutorial e (?) para tudo que entrar.

---

## Equilíbrio e diversão (metas que todas as frentes respeitam)
- Falência no perfil equilibrado: 10–30%. Estratégia arriscada bem jogada pode superar a cautelosa (com variância maior).
- Carreira de artista: não chegar a fama 80+ e milhões garantidos em 5 anos.
- Prestígio, crítica e reputação sem bater no teto.
- Lote rápido (bots reais que tomam ações) a cada frente; nada do futuro na tela.

## Ordem de execução (agentes em paralelo)
1. **Onda 1**: Frente 0 inteira + protótipo do calendário único.
2. **Onda 2**: Frente 1 (malha de ligações, dividida em 3 agentes por grupo de sistemas) + piloto da Frente 2 (4 marcos).
3. **Onda 3**: Frentes 3, 4, 5, 6, 7 em paralelo (um agente cada).
4. **Onda 4**: Frente 8, integrador final (testes, equilíbrio, Chromium em 1889/1955/1975/2005/2030), documentação e publicação.
