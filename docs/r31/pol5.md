# POL5 · acabamento da navegação nova (onda 5, exp5.nav ligado)

Pedido do dono (Masters 31 · onda 5 · frente POL5). Só interface: a simulação não muda, goldens iguais. Tudo segue atrás de
`exp5.nav` (desligado = jogo de hoje). Provas lado a lado em `docs/r31/shots/onda5-pol5-*-antes-depois.png` (antes = ramo
base `claude/friendly-brown-vpsmfl`, depois = este ramo, mesma semente e mesma cena; `scripts/r31/shots-pol5.mjs` +
`scripts/r31/pol5-pares.py`). Varredura automática: `scripts/r31/audit-pol5.mjs` (contraste do cabeçalho, texto cortado,
coisa vazando do papel, botão apagado) em 1912, 1962, 1985, 2005 e 2025, sede em cada degrau, todos os papéis da sede, da
casa e do mundo, casa, cidade, mundo, pausa e ajuda (55 telas por época).

## 1. Título e subtítulo do papel ilegíveis (pedido do dono)

| Achado | Correção | Prova |
|---|---|---|
| Caderno do olheiro, diário e caderno: título escuro sobre capa escura; subtítulo invisível | O cabeçalho mede o pixel da moldura por baixo do título (`headInk5`) e escolhe a letra: clara em moldura escura, escura em clara | `onda5-pol5-cabecalho-antes-depois.png`, `-cabecalho-tela-` |
| Fichário (moldura clara) e mural (cortiça): letra clara sobre papel claro / textura | Textura ou tom médio ganha etiqueta própria de papel com borda em pixel | idem |
| Subtítulo sumindo no cinza (opacidade 0,75) | Subtítulo opaco, na cor do título (contraste ≥ 4,5 em todas as molduras e épocas, medido) | idem |
| Lista fixa de molduras "escuras" no CSS (errava o caderno e o fichário) | Saiu; vale a medição, em todas as 9 molduras, nas 6 caixas de entrada e em todos os papéis | — |

Resultado da medição depois: 0 cabeçalhos abaixo de 4,5 em 5 épocas × todos os papéis (antes: caderno/diário/olheiro ≈ 1,3).

## 2. Mural e quadro com área morta (pedido do dono)

| Achado | Correção | Prova |
|---|---|---|
| Miolo do ELENCO calculado pela janela: faixa preta à direita e embaixo do mural, do quadro e do fichário | A casca passa o tamanho medido do miolo (`PaperCtx5.box`); o miolo enche o papel | `onda5-pol5-mural-`, `-quadro-`, `-fichario-antes-depois.png` |
| Mural: cortiça vazia com elenco pequeno | Polaroids crescem até 4× (escala inteira, a maior que cabe); a vaga é uma polaroid vazia que abre o caderno do olheiro; recortes de jornal do selo (imprensa sobre o elenco, contratos assinados, fundação; clique = jornal); post-its de **metas** (quadro de metas e metas da run, com barra) e **próximos passos** (calendário único, "ir até lá"); as duas notas de ajuda viraram um post-it "Como usar"; tudo se espalha pela cortiça | `onda5-pol5-mural-antes-depois.png` |
| Quadro: uma linha e o resto branco | Linha **Empresa e equipe** (prazos sem artista: leilões, festivais, obras, contratos…); linhas mais altas quando há pouca gente; **marcos das próximas semanas** (lançamentos, shows e prazos + a agenda do mês do elenco, semana a semana, clique = ir até lá / menu do artista); botão **Só conflitos** no papel (a aba não existe na casca) | `onda5-pol5-quadro-antes-depois.png` |
| Fichário: 12 cartões fixos e faixa vazia | Página com quantos cartões couberem | `onda5-pol5-fichario-antes-depois.png` |
| Trocar Meses/Semanas, filtros e gavetas do fichário não redesenhavam dentro da casca | Redesenho pela casca quando o papel está nela; ←/→ trocam de gaveta também na casca | — |

## 3. Varredura de polimento (decidido aqui)

| Tela | Achado | Correção | Prova |
|---|---|---|---|
| Sede (todas as épocas) | Recados como coluna ao lado: a cena encolhia e sobrava faixa escura embaixo dos recados (1912) | Recados por cima do céu, como no mock aprovado; a sede usa a largura inteira | `onda5-pol5-sede-antes-depois.png` |
| Sede (1985+) | Faixas pretas acima e abaixo da cena (escala em quartos) | A sobra continua o céu em cima e a rua embaixo | idem |
| Casa (todas as moradias) | Faixa de cômodo pequena no meio de um vazio preto; rótulo encostado na borda | A casa cresce quando cabe na largura; céu em cima e chão embaixo; rótulo com margem | `onda5-pol5-casa-antes-depois.png` |
| Mundo | Viajar para o Mundo abria a última aba da página (ex.: família Fossati), não o mapa | A viagem volta sempre ao mapa (aba do destino) | `onda5-pol5-mundo-antes-depois.png` |
| Cidade e Mundo | Página centralizada na região: o alto (abas do mapa) ficava cortado sob o topo | Começam do topo e rolam | idem |
| Papéis com página antiga (espelho, cofre de casa, garagem, estante, demos, cultura, escritório em casa…) | Nas épocas de tema escuro, retângulo escuro solto dentro da moldura clara | Tinta escura sobre papel claro em toda época (mesma paleta dos miolos do PAPEL) | `onda5-pol5-papel-antigo-antes-depois.png` |
| Mapa-múndi (papel) | Marcador com o id cru "cidade5" | Página escondida do menu mostra o nome ("Cidade (visita)") | `onda5-pol5-marcador-antes-depois.png` |
| Casa | Tab disparava dois chaveiros (o da casa e o da casca) com 2+ carreiras | Na casa vale o chaveiro da CASA | — |
| Quadro (novo) | "Marcos" virava "Marondo" pelo filtro de nomes reais | Rótulo passa cru, como os outros rótulos do ELENCO (o filtro é da frente NOMES; não mexido) | — |

Olhado e deixado como está (sem defeito ou fora do escopo da interface):
- Pausa, ajuda de teclas, bolso, transições e cidade: sem sobreposição nem corte; a lista de teclas rola dentro da janela.
- "Marondo da cidade" (placas da cidade) e trocas parecidas: filtro de nomes reais, frente NOMES.
- Livro-caixa e cofre: algumas abas antigas (ex.: Capital e sócios) ficam estreitas numa das páginas do livro; é a divisão
  em duas páginas do PAPEL, legível, sem corte — candidato a passada própria do PAPEL.
- Calendário do quarto em 2025 mostra "SET" (arte da CASA, desenho do relógio digital): não é texto do jogo.
- Enfeites da moldura (post-it da escrivaninha, ímãs do quadro branco, lacre e tinteiro) são arte aprovada da ART5.
- A auditoria marca como "texto cortado" os marcadores em pixel do PAPEL (o texto acessível fica escondido atrás do
  desenho): falso positivo.

## 4. Desvios temporários de ELENCO e CASA

| Desvio | Situação | O que foi feito |
|---|---|---|
| `elenco5.ts` embrulhava `NAV5.go` (objeto com papel abria a moldura própria do ELENCO por cima da casca) | A casca já abre os papéis pela API (`registerPaper5`) | Removido; `openPaper5` com objeto chama `open5` (a casca); a moldura própria fica só para a Contratação, que não tem objeto |
| `elenco5.ts` embrulhava `store.rerender` | A casca redesenha o papel a cada ação | Removido |
| `casa5.ts` `AREA5`/`area5Of` + `panel()` de `app.ts` (casa31, sede25, maquete por cima de 'hq') | A casa é a região registrada; a sede é da casca; a maquete é papel registrado | Removido |
| `menu31` `MenuCtx31.nav5` (Você → Casa) | Com a casca, a Casa é o botão de viagem | Removido (teste da CASA ajustado) |

## Testes

`npx tsc --noEmit` limpo; `r31-nav5`, `r31-papel5`, `r31-elenco5`, `r31-casa5`, `r31-mapa5`, `r31-pol` verdes; goldens
`r27-p2a`, `r27-p2b`, `r27-m3`, `r16-playbot` iguais. Ajustes de teste: `r31-elenco5` (ligado, o objeto abre pela casca
`NAV5.open`, não pelo embrulho) e `r31-casa5` (sem o desvio do menu).
