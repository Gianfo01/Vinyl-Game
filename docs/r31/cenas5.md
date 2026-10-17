# Onda 5 · CENAS5 — cenas de lugar só com o cenário navegável

Pedido do dono (2026-10-16): com `exp5.nav` ligado, entrar num lugar (ex.: "Rádio Cidade") não mostra mais a moldura
antiga — "← Voltar à cidade", título + tipo, "Cena / Ver como lista", "Mostrar tudo que é clicável", "Rótulos" e a caixa
tracejada de ajuda ("Pessoas e objetos são clicáveis… [Entendi]"). Fica só o cenário navegável e as telas combinadas
(papel por cima, painel rápido). Desligado, tudo como hoje.

## Como ficou (modo novo, `exp5.nav` ligado)

| Antes (moldura antiga) | Depois |
|---|---|
| "← Voltar à cidade" + título + tipo | Faixa de lugar da casca, como "SEDE · LONDRES · 1962": `◂ CIDADE  RÁDIO NACIONAL · RÁDIO AM/FM · LONDRES · 1965`. O "◂ Cidade" é pequeno, em pixel. |
| Voltar | Esc ou Backspace volta um nível (fundos/feira → o lugar → a cidade; sala da sede → sede). Papel, pausa, ajuda ou janela abertos por cima têm a vez. |
| "Cena / Ver como lista" | Sai. Não há modo lista: tudo o que a lista mostrava é ponto da cena. |
| "Mostrar tudo que é clicável" | Vira Alt: segurar Alt contorna tudo o que é clicável. |
| "Rótulos" | Vira Alt + passar o mouse/foco (rótulo e dica do ponto). |
| Caixa tracejada de ajuda ("Entendi") e "Pontos desta cena (n)" | Saem. A ajuda do lugar (o que é o lugar + cada objeto e o que faz + legenda + bloqueios) vai para o "?" da casca, no bloco "Neste lugar". |
| 🔒 motivo só na lista/painel | Selo de cadeado no próprio objeto, antes do clique; o motivo aparece na dica (passar o mouse/foco), no leitor de tela e na ajuda "?". |
| Cena com largura fixa e rolagem | A cena se ajusta à área (cabe na largura e na altura da casca, sem rolagem); o painel rápido abre ao lado só quando há algo aberto. |
| Teclado | Tab e setas percorrem os pontos na ordem de leitura (de cima para baixo, da esquerda para a direita); Enter abre; clique direito (ou tecla de menu) abre o painel rápido. |

As ações dos objetos e das pessoas continuam as mesmas (painel rápido do lugar, painel ⚡, papel): nenhuma função mudou.

## Inventário (todas as telas de cena/lugar com a moldura antiga)

| Cena | Arquivo | Como abre | Modo novo |
|---|---|---|---|
| Hospedeiro comum das cenas | `src/ui/r31/scene31.ts` (`sceneView31`) | — | `sceneNav5`: só o cenário (vale para todas as cenas abaixo marcadas "hospedeiro") |
| Interiores da cidade (12 tipos: casa de shows, loja de discos, rádio, estúdio, bar, imprensa, ensaio, gravadora, escritório, apartamentos, hotel, instrumentos) + fachada/sala dos fundos/baile, delegacia, moradias do LOTE | `inside31.ts` (+ `inside31model.ts`, `art31.ts`) | prédio da cidade → entrar | hospedeiro + faixa de lugar "◂ Cidade", Esc/Backspace, cena ocupa a área da casca, painel rápido ao lado |
| Vitrine do mês (prateleira da loja de discos, feira dos fundos) | `vit31.ts` (+ `vit31model.ts`) | interior da loja de discos | sai o botão "Ver como lista" do item; a vitrine inteira é o objeto "Vitrine do mês" da cena |
| Vitrine do mês do aeroporto e da casa de leilões | `vit31.ts` (`vitStrip31`) | embaixo da cena | a faixa em lista sai; vira a placa "Vitrine do mês" no canto da cena (`vitSpot5`/`vitOpen5`, mesmos cartões e botões) |
| Loja de instrumentos | `city31ui.ts` (`shopScene31`, área `loja31`) | prédio "Loja de instrumentos" (papel) | hospedeiro |
| Sua moradia (casa alugada/comprada) | `city31ui.ts` (`houseScene31`, área `casa31`) | casa | hospedeiro (no jogo explorável a casa é a região Casa da frente CASA) |
| Aeroporto e porto | `airport31.ts` (área `airport31`) | prédio "Aeroporto" (papel) | hospedeiro; o título repetido do papel some |
| Alfândega | `customs31ui.ts` (área `customs31`) | aeroporto › Alfândega | hospedeiro |
| Casa de leilões | `auction31.ts` (área `auction31`) | prédio "Casa de leilões" (papel) | hospedeiro; catálogo e balcão de consignação já são objetos da cena |
| Abertura dos envelopes | `sealed31ui.ts` (área `sealed31`) | leilões › Envelopes | hospedeiro |
| Leilão silencioso do beco | `bauc31ui.ts` (área `bauc31`) | beco do submundo (papel) | hospedeiro |
| Mural de ligações do submundo | `under31ui.ts` | beco / crime | hospedeiro |
| Encontros do AMOR (encontro, "descobriu o caso") | `amor31ui.ts` | Coração › Encontro em cena | hospedeiro |
| Casa Fossati e praça Efro e Lucia Fossati | `fos31.ts` (+ `fos31model.ts`) | cidade (prédio da família / placa da praça) ou Mundo › Família | hospedeiro + faixa de lugar ("◂ Cidade" ou "◂ Família Fossati"), Esc/Backspace, "Ir à casa/à praça" e ⚡ na faixa |
| Mesa do chefe | `desk31.ts` | Hoje/mesa | hospedeiro |
| Projeto musical (rua dos projetos) | `proj31.ts` | projeto | hospedeiro |
| Turnê em cena | `tour31.ts` | turnê | hospedeiro (o seletor de turnê/mês continua como controle pequeno em cima) |
| Salas da sede em cena (estúdio, elenco, equipe, catálogo, talentos, troféus, salas-assinatura das 12 carreiras) | `salas31.ts` (área `sala31`) | quick "Ver na sede (cena)" | no jogo explorável a sede é o corte da NAV (`sede5.ts`, cada objeto abre o papel); a página `sala31`, se aberta, vem sem "mostrar tudo", sem a caixa de ajuda e sem a lista de pontos, com faixa "◂ Sede", Esc/Backspace, setas e "Ver detalhes" (as listas de sessões, equipe e acervo ficam no "Ver detalhes") |
| Cenas de mecânica (negociar, renovar, rescindir, contratar, demitir, punir, formação, lançamento, banco, compra, jabá) | `mech31.ts` + `scene31stage.ts` | botões de ação (janela) | sem "Mostrar tudo que é clicável" e "Rótulos nos balões" (Alt + passar o mouse/foco); a dica da primeira vez sai e fica num "?" pequeno; "Pular cena" e "Ver detalhes" continuam (são decisão e formulário, não lista de lugar) |
| Corte antigo do interior (r27) | `src/ui/sys/place27ui.ts` (`insideView27old`) | ninguém (só comparação de capturas) | sem mudança |
| Festival | — | não há cena própria: o festival é página de shows (`hubs20`) e, na cidade, o lugar abre o interior da casa de shows/teatro | coberto pelo interior |

## Ganchos mínimos fora dos arquivos de cena

- `src/ui/r31/shell5.ts` (NAV): uma linha na ajuda "?" (`helpHere5`): mostra "Neste lugar" da cena à vista (dentro do papel aberto, se houver).
- Nada em `nav5.ts`, `keys5.ts`, bolso, janela baixa ou volta mundo↔cidade (frente POL5).

## Arquivos novos

- `src/ui/r31/cenas5model.ts` — modelo puro (moldura por interruptor, ordem de leitura, setas, bloqueio, ajuda).
- `src/ui/r31/cenas5.ts` + `cenas5.css` — faixa de lugar, Esc/Backspace, ajuda do lugar, setas, caber na área.
- `tests/r31-cenas5.test.ts`, `scripts/shots31cenas5.mjs`, `scripts/r31/cenas5grid.py`.

## Prova

- Capturas antes/depois de cada tipo de cena em 2 épocas (Londres 1965, Nova York 2005):
  `docs/r31/shots/onda5-cenas5-<tipo>-antes-depois.png` (interior, vitrine, loja, aeroporto, leilões, beco, alfândega,
  casa, festival, sala, mecânica, fossati). O script confere no DOM do "depois" que não sobra nenhum botão antigo nem a
  caixa de ajuda (`check.json`).
- `tests/r31-cenas5.test.ts`: moldura nova sem as peças antigas e desligado = moldura de hoje; todo ponto que a lista tinha é
  ponto da cena, com destino, e Tab/setas alcançam todos (2 épocas, todos os tipos); bloqueio vira selo; o conteúdo das
  cenas é o mesmo com o interruptor ligado ou desligado; explorar não muda o estado nem os sorteios.
