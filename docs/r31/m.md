# Onda 4 · M (Estilos por época)

Só apresentação: nenhum arquivo de `src/sim` mudou, não há regra nova e por isso não há interruptor nem medição de
economia (a simulação é byte a byte a mesma; os goldens r27-p2a/p2b/m3 e r16-playbot ficam iguais na suíte).

## O que o jogador vê
- **9 estilos prontos** (`ready: true`), que mudam sozinhos com a época (padrão) ou ficam fixos: Gazeta (1889–1919),
  Déco Rádio (1920–45), Jukebox (1946–64), Hi‑Fi (1965–79), Fósforo (1980–89), Janelas 95 (1990–99),
  Portal 2000 (2000–07), Plano (2008–19), Vidro (2020–40) e o Estúdio (o de hoje). Cada um tem variante clara e escura
  (o tema do jogador continua valendo; o "nativo" dos mocks é o das capturas `*-hoje/mercado/opcoes`, o outro está em
  `*-outro-tema`). As cenas em pixel não mudam; só a moldura (topo, menu, cabeçalho, KPIs, abas, botões, cartões,
  tabelas, campos, diálogos).
- **Opções › Visual da interface**: menu (acessível) + grade de amostras como no mock (Automático, Estúdio e os 9),
  botão **Pré‑visualizar** (passar o mouse/foco num estilo mostra‑o; sair da grade volta), "Avisar quando uma nova
  época trocar o visual" e "Animar a troca" (respeita movimento reduzido).
- **Aviso na virada**: faixa discreta "Nova época: a interface passou ao estilo Fósforo (1980–1989)…" com
  **Voltar ao Hi‑Fi** (fixa o anterior), **Fixar este**, **Opções…** e fechar; some em 12 s. Só no automático, com o
  aviso ligado e dentro da mesma partida.

## Como foi feito
- `src/ui/skins31.css` (carregado por último): (1) paletas por estilo × tema só redefinindo tokens de superfície,
  texto, menu, topo e marca — as cores de estado (bom/ruim/alerta, chips) seguem o tema, o daltonismo e o alto
  contraste, que valem por cima (única exceção: Janelas claro, cuja página é cinza #c0c0c0, tem estados mais escuros
  com variantes próprias de daltonismo); (2) forma por estilo (fontes, cantos, bordas, caixa); (3) uma camada única de
  componentes e estados lendo os tokens; (4) poucas assinaturas por época (régua dupla, raios déco, xadrez, alumínio,
  prompt `C:\SELO>` com cursor, chanfro e barra de título azul, degradê portal, elevação, vidro fosco).
- Fontes de época via @fontsource (Unifraktur, Josefin Sans, Pacifico, Nunito, Fraunces, VT323, Roboto, Inter), só
  latim e poucos pesos; o navegador só baixa a fonte do estilo em uso.
- Tokens novos: `--top-bg/-ink/-muted/-line`, `--nav-sel-bg/-ink`, `--sk-pri-bg/-ink`, `--focus`, `--font-head`,
  `--font-brand`, `--font-num`, `--sk-*` (forma).

## Testes
- `tests/r31-contrast.test.ts`: pares AA (PAIRS31, mais barra do topo, seção aberta do menu, botão principal,
  desabilitado, motivo de bloqueio na página e anel de foco ≥ 3:1) em **10 estilos × 2 temas × 4 modos de daltonismo ×
  alto contraste = 160 combinações**; cada estilo tem paleta clara e escura; estados (hover, foco, desabilitado,
  pressionado, bloqueado) existem para todos; nenhuma regra vaza para o Estúdio. 176 testes.
- `scripts/r31/shotsM.mjs` (navegador): nada estoura em 1360 px nem em 390 px (celular) nos 10 estilos; estados com
  cores reais (botão ≥ 4,5, desabilitado ≥ 3, motivo do bloqueio ≥ 4,5, anel de foco presente e ≥ 3) nos dois temas;
  aviso de virada 1979 → 1980 aparece com as 3 ações e "Voltar ao Hi‑Fi" fixa o anterior. Sai com erro se algo falhar.
- Capturas: `docs/r31/shots/onda4-m-<estilo>-{hoje,mercado,opcoes,outro-tema}.png` e `onda4-m-aviso-virada.png`.
