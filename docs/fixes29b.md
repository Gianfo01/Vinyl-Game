# R29b — testes que falhavam depois dos merges do R29

Seis testes falhavam (ou estouravam o tempo) em `claude/friendly-brown-vpsmfl` depois de juntar o R29. Cada um foi rodado
sozinho (`npx vitest run tests/<arquivo>`), a causa foi achada pela história (`git log` + sondas em cópias de `src/` de
commits antigos, no lugar de `git bisect` na árvore de trabalho) e corrigida onde ela está. Nenhum teste foi pulado ou
desligado; nenhum fluxo de sorteio compartilhado foi tocado; a ordem dos ganchos (`src/sim/sys/index.ts`, facades19 por
último) ficou igual.

Resumo:

| Teste | Causa | Correção | Onde |
| --- | --- | --- | --- |
| `r19-fix-b` (fest.pitch) | **bug do jogo**: a chance mostrada do festival ignorava as recusas do sorteio (ato já escalado, edição fechada, "não insista") | `pitchOdds8` devolve 0 nos mesmos casos do `pitchAct` | `src/sim/sys/fests8.ts` |
| `sim` (arco 2030) | **simulação mais lenta** com o R29 (+49% sozinho): demo29 recalculava a semente do público de todos os atos todo mês; conn29 refazia a busca do ato 4× por leitura de estresse | caches exatos (mesmos números, conferido por hash do estado) | `demo29.ts`, `stress17.ts`, `conn29.ts`, `promises28.ts` |
| `r9-rockhall` | tempo: passa sozinho (72 s de 300 s); estourava só com a suíte inteira em paralelo na máquina carregada | ganha com as otimizações acima | — |
| `r16-playbot` | trajetória mudou por uma correção legítima (ordem dos ganchos de início, d2651a4): a semente pb-16 não chega a festival nem à 1ª contratação no 1º ano | semente r16pb-11 (todas as ações com folga), com comentário | `tests/r16-playbot.test.ts` |
| `r17-life` | o teste contava com sorte: na história alternativa (padrão desde o r18), a orientação de pessoa real sem registro é sorteada; depois do r28-f3 o ato mais famoso de 1965 sorteia bi no armário | o teste usa alguém que de fato seria exposto e verifica as duas proteções reais (modo exato; registro público) | `tests/r17-life.test.ts` |
| `r8-identity` (export) | o 1º ato de Londres da semente mudou (r28-f3) e quer fama: "carreira internacional" (+0,07) cobre "o selo esqueceu a cidade" (−0,05) | mede a reação da cidade com ambição neutra (como o teste já fazia com o outro ato) | `tests/r8-identity.test.ts` |

Três das falhas (`r17-life`, `r8-identity`, `r19-fix-b`) são anteriores ao R29: vêm de merges do R28 (r28-f3 em
`d175b74`, fase 5 em `d640be7`).

## 1. `tests/r19-fix-b.test.ts` — chance mostrada ≠ chance sorteada no festival (bug)

**Sintoma.** `fest.pitch [0,"a2","opening",323474] u=0.996 p=1: expected false to be true`.

**Causa.** O teste confere, para cada tela de negociação, que a chance mostrada (`ODDS19[id].chance`) é exatamente a do
sorteio (`roll`). No festival, `pitchOdds8` (usada pela previsão da tela, `explain12.forecastFestival`, e pelo registro
de chances) só olhava gênero, faixa e cachê; o `pitchAct` recusa antes disso quando não há edição aberta, quando o
line-up já fechou, quando o ato **já está no line-up** e quando a produção pediu para não insistir (cooldown). A tela
mostrava 100% para um ato já escalado e o sorteio recusava. Apareceu em `d640be7` (R28 fase 5): o line-up de 1975 da
semente `r19b` passou a ter o ato `a2` (Vince Albrecht) no festival 0 e no 2 — conferido por sonda: em `cd0b809` o ato não
estava no line-up; em `d640be7` está.

**Correção.** `pitchOdds8` aplica as mesmas recusas de saída do `pitchAct` (devolve 0). Nada muda na simulação: o
`pitchAct` faz essas recusas antes de ler a chance e os bots chamam o `pitchAct`.

## 2. `tests/sim.test.ts` "uma run iniciada em 2030 chega a um dos 20 finais" — tempo

**Medição** (sozinho, mesma máquina, `-t "arco completo"`):

| Versão | Tempo |
| --- | --- |
| antes do R29 (`2269a63`) | 145 s |
| com o R29 (`9998048`) | 216 s (241 s com carga ~6) |
| depois desta correção | 182 s (200 s com carga ~6) |

Na suíte inteira, com vários processos do vitest na mesma máquina, o teste levou 1651 s — isso é carga, não trabalho;
o teto de 300 s continua (comentário com as medições no teste).

**Perfil** (`--cpu-prof`, 72 meses do mesmo arco, tempo inclusivo; antes do R29 → com o R29 → depois):
total 89 s → 138 s → 103 s (com a máquina menos carregada: 80 s → 90 s). O que o R29 acrescentou:

- **demo29 — 14 s.** `ageMix29` deriva a mistura de idades de cada ato não guardado pela "semente" (`seed29`): simula a
  carreira desde a estreia, até 70 anos × 5 faixas de gosto (`taste29` → `histPop29`/`avgPop`). O cache era por
  `ano|versão` e a versão (`demo29.v`) sobe todo mês — então, todo mês, as ~1.400 sementes eram refeitas do zero, pelas
  paradas (`chartUnits`/`appeal`/`phys`) de cada lançamento.
  **Correção:** os anos passados da semente só leem dados fixos, o registro `gh` (muda no `recordHistory`) e o próprio
  ato; ficam guardados por (ano, datas das tecnologias, fotografia do `gh`) e por ato (tudo o que a conta lê dele, com o
  posicionamento exato). Só o ano corrente — que lê a fotografia do mês (`gp`, `rp`) — é refeito. As contas são as
  mesmas, na mesma ordem (`base29`/`inflowW29`/`seedStep29`), então o número é o mesmo bit a bit. Também: a leitura
  derivada do mês confere os campos da assinatura um a um antes de montar o texto da chave, e `stepRegional` lê a parada
  de cada mercado uma vez (antes: uma por família × mercado).
- **conn29 / estresse — ~10 s.** As quatro pressões novas de `PRESSURE29` (caixa, confiança, submundo, reputação) faziam
  cada uma `playerActs().map().find()` para achar o ato da pessoa, em toda leitura de `shortOf` (todas as pessoas, várias
  vezes por mês). **Correção:** `shortOf` passa um rascunho por leitura (`Px29`) e as pressões leem o ato dali (uma busca
  só, sem alocar). Nada muda entre as pressões de uma mesma leitura.
- **promises28 — ~2 s.** O caixa livre (`freeCash20`, lido pela pressão do caixa) soma promessas varrendo
  `Object.values(s.contracts)` duas vezes — e os contratos NPC do R29 (npc29) aumentaram a lista. **Correção:** `for…in`
  na mesma ordem, sem copiar.
- Ficaram (custo do próprio recurso): feats de pessoa do mundo (`featp29`, ~2 s/72 meses), família (`family29`, <1 s),
  mais estado (GC).

**Conferência de que nada mudou.** Hash do estado inteiro (`JSON.stringify`) depois de três runs fixas, antes e depois:
arco 2030 (30 meses, bot), playbot r16pb-11 (14 meses) e mundo 1990 sem jogador (26 meses) — idênticos
(`nto37a`, `ydokk4`, `1rncubs`). Os golden `r27-p2a`, `r27-p2b`, `r27-m2` e `r27-m3` passam sem re-medir.

## 3. `tests/r9-rockhall.test.ts` — tempo

Sozinho passa: 72 s com a máquina carregada (teto 300 s). Na suíte inteira levou 331 s pela carga (mesma situação do
arco). Não muda o teto; as otimizações do item 2 valem para ele também.

## 4. `tests/r16-playbot.test.ts` — `festivals` = 0 (e `hires` = 0)

**Causa.** `d2651a4` (R29 CONNECT) corrigiu a ordem dos ganchos de início — renomes e marcação dos atos reais do
lineup16 passam a rodar depois que os atos reais existem (antes dependia da ordem dos imports: "The Jackson 5" nunca
virava "The Jacksons"). É uma correção legítima e muda a trajetória da partida. Com a semente r16pb-16 o bot assina, no 5º
mês, um ato de chanson com fama 0,3 no lugar da Westend Orchestra (laiko, fama 11,6): os outros dois atos (glam e punk)
não cabem em nenhum festival de 1975, e o novo, quando passa da fama 5 que o bot exige (7º mês), não é aceito pelos festivais que ainda faltam no ano — sem festival.
Sem esse ato, falta receita para a 1ª contratação (regra do r27: liquidez 1,57 mi < 18 × salário × 1,1 = 1,73 mi).
Conferido por sondas: `6283222` (antes) 8 festivais e 1 contratação; `d2651a4` 0 e 0.

**Não é bug do bot**: varredura r16pb-1…15 no 1º ano — festivais aparecem em 14 de 15; contratar no 1º ano segue raro
(9 de 15 sem), como o próprio teste já registrava no r27 ("contratar no 1º ano ficou raro").

**Correção.** Semente r16pb-11 (todas as ações; 8 festivais, 2 turnês, 1 contratação), com o comentário no teste. Todas
as asserções ficam (ações variadas + determinismo pela reprise).

## 5. `tests/r17-life.test.ts` — "pessoa real nunca é exposta"

**Causa.** O teste marcava como real o ato mais famoso (`catalogNo = 998`) e esperava que o `comeOut(…, 'outed')` não
virasse escândalo. Desde o r18, na história alternativa (o padrão), a orientação de quem é real **sem registro público**
é sorteada como a de qualquer personagem; o `comeOut` protege sempre o documentado (`REAL_SEX17`) e, no modo exato, todo
mundo do catálogo. O teste passava por sorte (o sorteio dava hétero). Em `d175b74` (merge do r28-f3) o ato mais famoso de
1965 nesta semente passou a ser "Yumi Sakai" (Tóquio), sorteada bi e no armário — e a "pessoa real" virou escândalo.
Conferido por sonda: `b128d90` Moacir Valente (hétero); `d175b74` Yumi Sakai (bi, armário).

**Correção.** O teste agora usa alguém que de fato seria exposto (no armário, em 1965) e verifica as duas proteções que
o jogo garante: no modo exato o `comeOut` recusa ("Pessoa real…") e não há escândalo; na história alternativa, com nome
documentado (Elton John, que só se declara em 1976), a pessoa fica "não declarada" e também não há escândalo.

## 6. `tests/r8-identity.test.ts` — reação ao selo de exportação

**Causa.** A reação do perfil "export" é medida em `local`, o 1º ato da cidade-sede: "o selo esqueceu a cidade" (−0,05).
Mas quem quer fama/status também ganha "quer carreira internacional" (+0,07). Em `d175b74` (r28-f3) o 1º ato de Londres
da semente `r8-effects` passou de Wes Stroud (ambição arte) para Reggie Graves (ambição fama) e a soma virou +0,02.

**Correção.** A medida da cidade usa ambição neutra (segurança) no `local` e devolve a ambição original depois — o teste
já fixava a ambição do outro ato do mesmo jeito (`setAmbition`). Continua protegendo o que importa: o selo de exportação
custa simpatia na cidade.

## Arquivos

- `src/sim/sys/fests8.ts` — `pitchOdds8` com as recusas do `pitchAct`.
- `src/sim/sys/demo29.ts` — `base29`/`inflowW29`/`seedStep29`/`seedPrefix29`, memória da leitura derivada,
  `stepRegional` com uma leitura por mercado.
- `src/sim/stress17.ts`, `src/sim/sys/conn29.ts` — rascunho `Px29` por leitura de `shortOf`.
- `src/sim/sys/promises28.ts` — `committed28`/`owed28` sem copiar os contratos.
- `tests/r16-playbot.test.ts`, `tests/r17-life.test.ts`, `tests/r8-identity.test.ts`, `tests/sim.test.ts` — comentários
  com o porquê.

## Fora do escopo (achado de passagem)

`tests/r25-festival.test.ts` › "produtor cauteloso: duas edições boas, a 2ª com lucro" também falha, e já falhava antes
do R29 (`2269a63`: lucro da 2ª edição −42.360; `9998048`: −7.008). Não faz parte desta lista; fica para uma rodada própria.
