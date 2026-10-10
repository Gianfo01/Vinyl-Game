# R18 econ18 — economia, contratos, câmbio/eras e bônus empilhados

## 1. Livro contábil (sim/ledger18.ts + util.post)
- Cada `post(s, key, valor, categoria, memo)` cai numa seção: **receita/custo operacional**, **não operacional**
  (câmbio, desconto de antecipação, indenizações, dividendos recebidos), **impostos**, **investimento** (catálogo,
  casas, sede, equipamento, empresas — inclusive por prefixo de chave, ex. `eq:`, `v17buy`) e **financiamento**
  (empréstimos, aportes, IPO, retiradas, dividendos pagos).
- `revenueByYear`/`profitByYear` agora = receita e **lucro operacional**. Conselho, metas, impostos (op + não op),
  avaliação (sale17), overhead13 e o conselheiro leem esses números: aporte/empréstimo não inflam mais nada.
- `fin18.y[ano]` / `fin18.m[ano*12+mês]`: linhas `rev:rec|live|pub|merch|svc`, `cost:cogs|mkt|ar|pay|ovh`,
  `nonop:fx|int|oth`, `tax:*`, `inv:x`, `fin:x` (competência) e `cf:op|inv|fin` (caixa).
- `post(..., cash=false)` reconhece agora e deixa o caixa para um título (`fin18.ar` / `fin18.ap`).

## 2. Prazos (sim/sys/econ18.ts)
- Vendas: distribuidor físico 120 dias (<1970) / 90 dias; digital ~2 meses; +1 mês em BR/LatAm/África e +1 em
  crise cambial. Edição: sociedade arrecadadora semestral (<1985) / trimestral, ~1 trimestre depois.
- Royalties do artista e pontos de produtor: custo agora, pagos na **prestação de contas** do contrato (padrão
  semestral + 3 meses; cláusula `stmt`/`lag`).
- Caixa negativo com recebíveis → **antecipação** automática (3% + 1,5%/mês até o vencimento, +2 p.p. em país em
  crise), lançada como despesa financeira. Políticas na aba "DRE e caixa": antecipar automático, atrasar prestação
  de contas (custa confiança e chama auditoria), distribuidor rápido (+3% de taxa, −1 mês).
- Venda de catálogo registra a renda futura perdida (`noteLost18`).

## 3. Cláusulas de contrato (sim/sys/contracts18.ts)
Recuperável por tipo (gravação 0/50/100%, clipe, apoio de turnê, 0/25/50% do marketing), teto por projeto com
aprovação do artista, recuperação cruzada × por projeto, base do royalty (varejo/atacado com embalagem por época ×
receita líquida), prestação de contas (período, atraso, auditoria), lançamentos garantidos e verba mínima. Pacotes:
Major clássico, Licença por prazo + 2 lançamentos, Indie, Pró-artista. O artista pesa cada cláusula pela ambição,
confiança, caixa e assessoria (empresário = lê tudo, advogado = quase tudo, sozinho = só o nominal). Ao longo dos
anos: confiança deriva pela justiça das cláusulas, artista engavetado 24 meses gera evento (prometer / liberar /
segurar), garantia não cumprida vira processo, auditorias anuais (achados viram processo; livros limpos sobem confiança).
Contratos sem cláusulas seguem a regra antiga (50% da gravação, cruzado).

## 4. Câmbio e eras (econ18 + eras18)
- Perda cambial = Σ mercados em crise de `taxa × (0,25·faturado no mês + a receber lá/12 + 0,3·caixa na moeda da
  casa/12 − a pagar lá/12)`; nada exposto, nada perdido.
- Fatia física de cada lançamento = média dos seus mercados com atraso de adoção (NA 0, EU/Oceania/Ásia +1,
  BR/LatAm +3, África +5 anos) e do público do gênero (jazz/sacro +4, folk +3 … hip-hop/eletrônica −1).
- 2027–2040: ramos **especulativos** sorteados por partida (vozes sintéticas regulamentadas / soltas / licença
  coletiva; interface neural de massa / nicho / nunca; palco presencial / virtual), revelados só quando o ano chega.

## 5. Retornos decrescentes (sim/caps18.ts)
- `applyMods`: B = produto dos multiplicadores PEQUENOS favoráveis da categoria (cada um até +25%; efeitos grandes
  isolados passam inteiros). Até o joelho nada muda; acima, efetivo = 1 + joelho + folga·tanh((B−1−joelho)/folga).
  Joelho/folga: appeal 0,3/0,6 · chartUnits, cityDemand, showRevenue 0,3/0,5 · songQ 0,15/0,2 · pressingCost 0,25/0,25
  (redução) · tourRisk 0,3/0,3 (redução). Penalidades ficam inteiras. A autópsia mostra "Retornos decrescentes".
- `perk`: soma positiva de cada chave passa pelo mesmo joelho suave (`PERK_CAP18`, joelho = folga, na unidade da
  chave); em staffCost/pressingCost/stress o bônus é a parte negativa.
- `globalThis.__caps18 = {}` liga a coleta (média, máximo e % cortado por categoria) para o balanço.
