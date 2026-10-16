# Onda 3 · CAR (Carreiras que mudam o mundo): medição

Este resumo fica em `car-resumo.md` porque `car.md` é o relatório que `scripts/r31/measure.ts` gera.

## 1. Partidas de referência (robô de selo): nada muda

`npx tsx scripts/r31/measure.ts --out docs/r31/car --label car` (ligado) e o mesmo com todos os `car31.*` desligados
(`R31_SW=car31.charts=false,…` → `car-off`, com `--compare docs/r31/car.json`). São 4 sementes × 5 eras × 36 meses.

- **Números de jogo idênticos nas 20 partidas** (caixa, patrimônio, fama, atos, lançamentos, nº 1, receita, pessoas).
  O robô do selo não abre rádio, plataforma, casa ou festival próprios, então o livro de execuções fica vazio.
- O save difere em 221 bytes por partida: os interruptores desligados ficam gravados em `sw31`. Ligado, o CAR acrescenta
  seis chaves pequenas em `x4` (`car31`, `car31m`, `car31p`, `car31s`, `car31x`, `car31g`).
- Os goldens r27-p2a, r27-p2b, r27-m3, r16-playbot e sim não mudaram.

## 2. Cada carreira: a decisão muda o mundo (partidas gêmeas)

`npx tsx scripts/r31/car31measure.ts --out docs/r31/car-medida`: 3 sementes, 6 meses. Nos dois lados da comparação a
semente, o negócio e a decisão são os mesmos (14 faixas de outros selos na grade, 15 no Top da playlist, 4 noites na
casa). O que muda é o efeito no mundo: `car31.charts` e `car31.fame` ligados ou desligados. As vendas são medidas na
parada do país do negócio, semana a semana.

| Caso | Unidades na parada do país (ligado ÷ desligado) | Semanas-faixa no top 40 do país | Vendas mundiais das faixas | Fama local (soma dos artistas, ligado − desligado) | Medida própria |
|---|---|---|---|---|---|
| Rádio 1960 (Londres, nível 1) | ×1,14 | 149 / 141 | ×1,010 | +37 | audiência 27%, 1ª de 7 |
| Rádio 1978 | ×1,07 | 201 / 197 | ×1,003 | +44 | audiência 21%, 1ª de 25 |
| Rádio 1995 | ×1,05 | 196 / 194 | ×1,003 | +33 | audiência 18%, 1ª de 25 |
| TV 1985 | ×1,24 | 102 / 89 | ×1,012 | +58 | audiência 40% |
| Plataforma 2016 (8 mi de assinantes) | ×1,70 | 165 / 135 | ×1,047 | +172 | — |
| Casa de shows 1975 (teatro) | ×1,01 | 23 / 21 | ×1,001 | +20 | prestígio 24, 1 noite lendária |

Leitura:
- **O efeito cai no país do negócio, não no mundo.** Uma rádio de cidade em nível 1 aumenta em 5% a 14% as unidades das
  suas faixas na parada nacional e quase nada no mundo (+0,3% a +1%). A rádio pesa menos com o tempo (televisão,
  internet, streaming, `radioWeight18`) e a mesma grade rende menos em 1995 que em 1960. O efeito cresce com o nível
  do veículo: a cobertura vai de cidade (12%) a rede (até 70% do país). A TV já nasce nacional.
- **A fama local é o efeito mais forte e o mais durável.** Ela soma de +2 a +4 pontos de fama no país por artista
  tocado, com teto de 14. A playlist dá cerca de +11 por artista, porque os assinantes ficam concentrados nos maiores mercados.
- **A dificuldade continua.** A audiência leva meses para subir, a rotação pesada cansa e o próprio selo vale 50%
  (conflito de interesse). O próprio selo segue nos retornos decrescentes do mercado. Os rivais copiam o formato de
  quem lidera três trimestres seguidos.
- A casa de shows mexe pouco nas vendas, porque a noite comum dá fama e não disco. Só a noite lendária leva o artista
  às paradas, por 4 semanas.

Comportamento coberto pelos testes (`tests/r31-carreiras.test.ts`) mas sem tabela aqui:
- estúdio: nota até +5 e apelo até +12% no próximo disco do selo cliente;
- editora: apelo de +6% a +15% e edição paga pelas vendas reais;
- agência: shows nas cidades do mercado-alvo;
- empresário: pedidos aceitos ou recusados, com espera entre eles;
- crítica: peso no país do veículo e lista do ano;
- trilhas: impulso pela bilheteria;
- desafio de fim de jogo: choque, meta e resolução no prazo.
