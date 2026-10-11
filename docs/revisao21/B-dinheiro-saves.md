# Revisão B — Dinheiro, finanças, dívida e saves (Masters)

Escopo lido: `src/core/money.ts`, `core/save20.ts`, `core/cloud17.ts`, `sim/economy.ts`, `finance.ts`, `ledger18.ts`, `oblig20.ts`, `sublabels.ts`, `stock20.ts`, `sim/sys/fin20.ts`, `money19.ts`, `moneyb19.ts`, `econ18.ts`, `capital.ts`, `bolsa10.ts`, `overhead13.ts`, `price20.ts`, `rates19.ts`, `insure19.ts`, `ventures9.ts`, `business.ts` (securitização/IPO/dividendos), `tick.ts` (fechamento/impostos), `util.ts` (`post`), `ui/store.ts`, `ui/saves17.ts`, `ui/savehealth20.ts`, `ui/savechip20.ts`, `ui/app.ts` (avanço/ironman). `bonds9.ts` e `budget19.ts` NÃO são finanças (laços entre pessoas e orçamento de conflitos) — só os pontos com dinheiro foram olhados.

Itens marcados **[CONFIRMADO]** foram verificados no código e, quando indicado, reproduzidos pelo script `scratchpad/verify.ts` (`npx tsx`, saída anotada em cada item). Testes existentes `r20-g2`, `r18-econ`, `r20-g1` passam (19/19) — nenhum deles cobre os casos abaixo.

---

## 1. Bugs e erros concretos

### 1.1 `post()` recusa chave duplicada em silêncio e os chamadores mutam o estado mesmo assim — dinheiro criado/destruído

`src/sim/util.ts:57-61` — `post()` devolve `false` quando `${week}:${key}` já existe e **não mexe no caixa**; quase nenhum chamador lê o retorno. Toda chave que não embute um contador único permite uma segunda ação na mesma semana que altera o resto do estado sem o movimento de caixa correspondente.

| # | Onde | Chave | Efeito reproduzido (verify.ts) | Prioridade |
|---|---|---|---|---|
| a | `src/sim/sublabels.ts:61` `transferToSub` | `subtx:${sl.id}` | 2 aportes de $5.000 na mesma semana: matriz −$5.000, subselo +$10.000 → **$5.000 criados** | **alta** |
| b | `src/sim/sublabels.ts:144` `payDividend` (via `proposeDividend`, `:128`) | `subdiv:${sl.id}` | 2 dividendos: subselo −$2.000, matriz +$1.000 → dinheiro some | alta |
| c | `src/sim/sys/capital.ts:251-253` `payDividend` | `div6:${s.week}` | 2 chamadas na semana: caixa −$10.000 (uma vez), bolso do dono +$16.150 (duas vezes) → **dinheiro criado no bolso do dono** | **alta** |
| d | `src/sim/business.ts:276-277` `issueShares` | `follow:${s.week}` | 2 ofertas de 5%: caixa +$47.500 (uma vez), `floatShare` +10% (duas) → diluição sem captação | média |
| e | `src/sim/economy.ts:82-83` `takeLoan` | `loan_in:${loans.length}` | se os empréstimos forem quitados na mesma semana (`answerCall19('pay')` `money19.ts:150-151`, `payDown` `:187-197`, `payDownSilent` `:276-281`) e o jogador tomar outro, o empréstimo é empurrado para `s.player.loans` e **o caixa não é creditado** (parcelas seguem) | média |
| f | `src/sim/sys/capital.ts:324` `seekInvestors` | `seekinv:${s.week}` | 2ª chamada na semana cobra tempo livre e regenera propostas sem a taxa | baixa |

[CONFIRMADO] Correção estrutural: `post()` deveria lançar/avisar em duplicata **ou** os chamadores devem usar chave com `nextId`/contador (como `bolsa10.coPost` `:525-533` e `ventures9.vpay` já fazem) e abortar a mutação quando `post` devolve `false`.

### 1.2 Retomada de ativo por credor (`seize`) **dá dinheiro ao jogador**

`src/sim/finance.ts:149-163` — `seize()` remove o ativo e faz `post(s, 'seize:…', +value, 'asset_sales')`: o jogador **recebe** 60% do valor contábil em caixa. Reproduzido: caixa −$50.000 → +$6.000 após "retomada" do banco. Além disso o credor `bank` nunca tem `owed > 0` (`creditorsMonth` `:121-146` só reduz `patience`), então `c.owed = max(0, 0 − value)` fica 0 e nada é abatido: a "retomada" é uma venda forçada favorável. Para o `supplier`, `owed` é abatido **e** o caixa sobe → benefício dobrado. **[CONFIRMADO] alta.**

### 1.3 `creditorsMonth` deriva `supplier.owed` do caixa negativo → dívida contada duas vezes na Posição

`src/sim/finance.ts:126-130`: `sup.owed = max(owed, −cash − $30k)`. `oblig20.registerOblig20('creditors')` (`src/sim/oblig20.ts:69`) transforma isso em passivo, e `position20` (`:91-100`) calcula `equity = cash + assets + ar − debt − ap` com o caixa negativo **e** o credor. Reproduzido: caixa −$80.700, sem nenhum movimento, patrimônio cai de −$80.700 para −$141.720 só por rodar `creditorsMonth`. **[CONFIRMADO] média/alta** (Finanças → Posição e covenant de dívida inflados).

### 1.4 `closeSubLabel` cobra o caixa negativo do subselo duas vezes

`src/sim/sublabels.ts:166`: `debt = loans + Σcreditors.owed − min(0, cash)`. Mas `subLabelsMonth` (`:283`) já faz `cr.owed = −sl.cash`. Reproduzido: subselo com caixa −$2.000 e credor $2.000 → matriz paga **$4.000**. O mesmo duplo desconto está em `subLabelValuation` (`:31-32`). **[CONFIRMADO] média.**

### 1.5 Securitização antiga (`business.securitize`) e empréstimo do dono não são obrigações

- `src/sim/business.ts:207-227` `securitize`: adiantamento entra como `financing`, o jogador paga `share` das vendas até `untilWeek` **sem teto** (pode pagar várias vezes o adiantamento) e **nada entra em `obligations20`** → `debt20`/`position20` ignoram. Reproduzido: +$450.000 no caixa e `debt20` continua 0. Coexiste com os títulos de `money19` (`bond19`, que são obrigações) — dois sistemas de "título de catálogo" com regras diferentes.
- `src/sim/sys/capital.ts:196` `ownerLoan`: passivo da empresa com o dono, pago em `:488-494`, ausente das obrigações. Reproduzido: `ownerLoan = $6.560`, `obligations20` vazio.
- `s.economy.investorShare` (`src/sim/events.ts:525`, cobrado em `economy.ts:52-55` como 15% das vendas por 260 semanas) também não aparece como compromisso.
**[CONFIRMADO] média.**

### 1.6 Ordem do fechamento: credores veem caixa negativo **antes** de os recebíveis liquidarem

`src/sim/hooks.ts:48` chama `financeMonth` (→ `creditorsMonth`) antes de `runSimHooks('month')` (`:60`), onde `econ18.settleMonth18` (`src/sim/sys/econ18.ts:140-168`, hook em `:263`) liquida AR/AP e faz a antecipação automática. Reproduzido: caixa −$1.000 com $50.000 a receber vencendo no mês → mês fecha com +$48.339, mas o banco perdeu 12 de paciência e, se o caixa fosse mais negativo, o fornecedor teria recebido `owed`. `checkInsolvency` (`tick.ts:136`) roda depois, correto. **[CONFIRMADO] média.**

### 1.7 Impostos: base ignora investimento e depreciação; sem compensação de prejuízo

`src/sim/tick.ts:231-238`: base = `profitByYear` (só `rev`/`cost`) + `nonop`. Compras de equipamento/sede (`sect18 = 'inv'`, `ledger18.ts:35,44`) nunca entram, e `depreciationMonth` (`finance.ts:70-80`) só reduz `bookValue` sem lançar nada. Ano com prejuízo não gera crédito para o seguinte (`if (profit <= 0) return`). Não há imposto sobre prejuízo (ok), mas um selo que investe pesado paga imposto cheio sobre receita. **[CONFIRMADO] média (design).**

### 1.8 Centavos nominais fixos, sem índice de preços

- `src/sim/sys/movements9.ts:350,375-377`: `FOUND_COST = 8000_00` cobrado como está em qualquer ano — em 1889 equivale a ~US$ 268 mil de 2020.
- `src/sim/sys/bonds9.ts:600` `bondCost` base `30000_00/12000_00/4000_00` e `:389` `A.cash -= min(cash, 20000_00)` — mesmos valores nominais em 1920 e 2040.
Todos deveriam passar por `money(s, …)`. **[CONFIRMADO] média.**

### 1.9 Gastos que ignoram `freeCash20` (caixa reservado a ofertas)

Checam `s.player.cash` cru e lançam via `post`: `src/sim/sys/services12.ts:144`, `agenda.ts:169` (planos), `rollout.ts:88`, `scouting.ts:215`, `studio.ts:273`, `sys/tour12.ts:241`, `sys/exch20.ts:91`, `sys/afterlife19.ts:344`, `sys/hype12.ts:320`, `sys/deleg16.ts:119,269`, `sys/manager11.ts:172`, `sys/bolsa10.ts:970` (compra de ações com caixa do selo), `sys/capital.ts:247-248` (`payDividend` distribui fração do caixa bruto), `sublabels.ts:168` (`closeSubLabel`). `docs/precos20.md` diz que "todo gasto do jogador" respeita a reserva. **[CONFIRMADO] média.**

### 1.10 Câmbio pode ser cobrado duas vezes no mesmo mês

`src/sim/sys/industry/corp.ts:295-301` lança `fx:${y}:${m}` com a perda de `fxExposure18` (tabela histórica `fxRate18`, `econ18.ts:34-41`); `src/sim/sys/links19b.ts:226-239` lança `fx19:${sub}:${mi}` para crises sorteadas (`fxSub19`). Uma crise sorteada no Brasil em 1986 soma às duas. **[SUSPEITO] média** (depende de `fxSub19` excluir países já cobertos pela tabela — não vi exclusão).

### 1.11 Banco "quitado" mas credor-banco continua

`src/sim/sys/money19.ts:148-155` `answerCall19('pay')` compara `cash < debt` com `debt19 = bankDebt20` (empréstimos **+ credor `bank`**), mas só zera `s.player.loans`; o credor `bank` em `s.creditors` fica com `owed` e `patience`. **[CONFIRMADO] baixa.**

### 1.12 Leilão: `closeAuction` checa caixa bruto, não livre

`src/sim/sys/money19.ts:253` usa `s.player.cash < b.amt`; `bidAuc19` (`:226`) usa `freeCash20`. Um lance válido na hora pode ser pago com dinheiro reservado a ofertas. **[CONFIRMADO] baixa.**

### 1.13 Subselo falido: masters "ficam com os credores" só no texto

`src/sim/sublabels.ts:286-292` muda `status` e esvazia `roster`; os `releases` com `owner === sl.id` continuam do subselo (e `subLabelValuation` ainda os conta). `retained` (`:254-255`) soma aportes e empréstimos como "lucro", liberando dividendos sobre dinheiro emprestado. **[CONFIRMADO] baixa/média.**

### 1.14 Saves

- `src/ui/store.ts:205-212` `deleteSave`: a transação não tem `onerror/onabort` → promessa pendurada para sempre se falhar (UI fica em "…"). **[CONFIRMADO] baixa.**
- `src/ui/store.ts:319-322` `importSave(file)` aceita até `MAX_OUT20` (384 MB) e `importSaveText` (`:269-272`) só limita `MAX_OUT20` para JSON cru; `MAX_IN20` (96 MB, "texto de entrada") só vale para VTN1 (`:249`). Um JSON de 300 MB passa para `JSON.parse` síncrono. **[CONFIRMADO] baixa.**
- `src/core/save20.ts:61-73` `schemaProblems20` valida só `typeof cash === 'number'`; números absurdos passam (esperado), mas também não valida `loans`, `creditors`, `assets` como arrays — `ensureExt` cobre defaults, não tipos errados. **[SUSPEITO] baixa.**
- `src/core/save20.ts:43` `MIG20` está vazio: toda migração é o backfill idempotente de `store.migrate` (`store.ts:215-228`). Não achei campo perdido; `close20` só nasce no próximo fechamento (Reconciliação some até lá). **[CONFIRMADO] baixa.**
- `src/core/cloud17.ts:83-91` CAS por `gen`: dois navegadores que leem o mesmo índice e gravam em seguida passam ambos; o segundo publica e apaga a geração **anterior** (`:101`), não a do perdedor → pedaços órfãos (vazamento de cota). **[SUSPEITO] baixa.**
- `src/core/save20.ts:13` cita `measure20()` que não existe (`grep`: só o comentário). Cosmético.
- `src/sim/util.ts:85` `settleCash` usa `settle:${s.ledger.length}` como chave; com o razão truncado em 400 entradas (`:86`) a chave se repete (só afeta `key` na UI). **[CONFIRMADO] baixa.**
- `src/ui/store.ts:131` `runId17` grava `Date.now()` no estado (`g.run17`) — campo não determinístico dentro do save; inofensivo, mas quebra "mesma semente = mesmo JSON".

### 1.15 Ironman

`src/ui/saves17.ts:204` só esconde "Duplicar"; exportar (`:205-206`) e `importToSlot17` (`:75-79`) continuam permitidos e o save importado mantém `ironman: true` → o jogador duplica a run por texto. `src/ui/app.ts:192,238` desliga o undo corretamente e o `tx20` (`save20.ts:138-143`) restaura em erro. **[CONFIRMADO] baixa (design).**

### 1.16 `adjustCash` fora do livro

`src/sim/sys/live/scenarios.ts:73-77` mexe em `s.player.cash` direto (ajusta `initialCash` junto). Só em cenários no início; o teste "extrato × caixa" não é afetado porque `initialCash` acompanha. **[CONFIRMADO] baixa.** Nenhum outro `player.cash ±=` fora de `util.ts`/`worldgen.ts` (grep).

### 1.17 Checado e OK (para o revisor não procurar)
- `money()`/`nominal()` não é aplicado duas vezes em nenhum ponto da área (grep `money(s, money(`, `money(s, x.cost)` só em UI com `def.cost` real).
- Divisões: `cov19.ratio`, `rating19.tot`, `relYearly18`, `mkWeights18`, `overhead13.rate`, `bolsa10.playerFrac` (`sharesOf` ≥ 100.000, `listing.shares = 1.000.000` em `ext.ts:43`) — todas guardadas. `Release.stock = Infinity` vira `null` no JSON e `unlimitedStock20` trata (reproduzido).
- Insolvência: só dispara com `cash < 0` por 4 meses (`economy.ts:90-131`); `callDebt` petition força `insolvencyMonths = 3` mas `checkInsolvency` zera se o caixa voltar a ≥ 0. Não há insolvência com caixa positivo.
- `ledgerKeys` é zerado todo mês (`tick.ts:35`), não cresce no save.
- `inflate20` corta o gzip no teto durante a descompressão; `decodeSave20` recusa versão futura sem tocar o original; `saveGame` só confirma após `oncomplete`/`onabort`.

---

## 2. Melhorias reais — quem é dono de quê

Hoje o caixa é uma única variável (`s.player.cash`) com um único ponto de escrita (`util.post`/`settleCash`), o que é bom. O problema é **quem define passivo, receita e "dinheiro prometido"** — está espalhado em seis módulos com sobreposição:

| Conceito | Donos hoje | Problema |
|---|---|---|
| Custos fixos, empréstimos bancários, insolvência | `economy.ts` | OK, mas `monthlyCosts` ignora `overhead13`, seguros, bonds, securitização, ownerLoan → `cashForecast18`, `checkInsolvency` "deep", `withdrawFromCompany` e `paths18` usam um burn subestimado |
| Ativos, credores, royalties autorais | `finance.ts` | credores derivados do caixa (1.3), retomada que paga (1.2) |
| DRE/competência | `ledger18.ts` + `econ18.ts` (AR/AP, factoring, câmbio) | bem desenhado; `econ18` registra hook de mês mas `financeMonth` roda antes (1.6) |
| Obrigações/Posição | `oblig20.ts` | fonte única **declarada** mas incompleta (1.5); `monthlyCosts` não a consome |
| Investidores | `events.ts:525` (`investorShare`), `capital.ts` (8 tipos + conselho), `business.ts` (`listing` dividendos 20% do lucro × float), `bolsa10` (blocos hostis) | 3 regimes de dividendo diferentes; `capital.payDividend` e `business.listingMonth` podem pagar no mesmo ano |
| IPO | `business.goPublic` (float fixo 25%) e `capital.goPublic6` (float/banco/roadshow) — ambos chamados pela UI (`ui/panels/business.ts:141`, `ui/sys/capital.ts:132`) | dois botões para a mesma coisa com valuations diferentes |
| Títulos de catálogo | `business.securitize` (share de vendas, sem passivo) e `money19` bonds (rating, cupom, lastro, passivo) | manter só `money19` |
| Caixa de subselo/ventures | `sublabels.slog`, `ventures9.vpay` | fora da DRE consolidada e da Posição (ver 4) |

Propostas concretas:
1. **`post()` estrito**: `post` devolve `false` → quem chama deve abortar; adicionar `postOrThrow` e varrer os ~95 chamadores de categorias financeiras. Chaves com `nextId(s,'tx')` onde a ação pode repetir na semana.
2. **`burn20(s)`** em `oblig20` somando `monthlyCosts` + `obligations20[].monthly` + `overhead13.last` + `insure19` → usado por `checkInsolvency`, `cashForecast18`, `withdrawFromCompany`, `paths18`.
3. Credores: `owed` só nasce de um lançamento real (parcela não paga, fornecedor de prensagem a prazo via `postRoyAP18`-like), nunca de `−cash`. `seize` → abate `owed` e **não** credita caixa (ou credita só a sobra acima de `owed`).
4. Registrar em `oblig20`: `securitizations`, `capital.ownerLoan`, `economy.investorShare` (como `commitment`), empréstimos de subselo (consolidado), `tv18` parceria.
5. Unificar IPO/dividendos em `capital.ts` e apagar `business.goPublic`/`issueShares`/`listingMonth` dividend; `securitize` → delega a `issueBond19`.
6. Depreciação como lançamento `cost:ovh` não-caixa (`post(..., cash=false)` já existe) para a DRE e o imposto fecharem com o balanço.

---

## 3. O que pode ser aprofundado (raso ou stub hoje)

- **Moeda/câmbio**: não há moedas. `money.ts` usa um único CPI dos EUA para o mundo inteiro (1889–2040, inclusive 2030–40 chutados `[2030,1.25],[2040,1.5]`). `fxRate18` é uma tabela de 5 crises (BR 80–94, LatAm, Ásia 97, África) que só gera **perda**; nunca ganho, nunca taxa de conversão, nunca preço de ingresso/disco em moeda local. `exch20.ts` não é câmbio (residência entre cenas). Caminho: índice de preços por mercado (`MARKETS`) + taxa de câmbio por ano com deriva (como `rates19`), vendas lançadas na moeda do mercado (`econ18.postSalesAR18` já separa por `mk`), hedge via AP na mesma moeda (já existe a ideia em `fxExposure18`).
- **Inflação por país / hiperinflação**: hoje só "perda". Um Brasil de 1990 deveria mudar preço de ingresso, salário de equipe local e aluguel de filial mês a mês.
- **Impostos por país**: alíquota única (EUA 1909–2040). Já existe `branches`/territórios: imposto retido na fonte sobre royalties internacionais, VAT em venda física, tratados, "offshore" (combina com `capital.shady`).
- **Crédito**: 3 empréstimos de 36 meses, juros = f(reputação, recessão, `rates19`). Falta: linha rotativa, garantia (os `liens` de `money19` só na chamada da dívida), refinanciamento, crédito do fornecedor de prensagem (a prazo), factoring manual (hoje `factor18` é automático), rating do selo (há `rating19` só para o lastro do título).
- **Bolsa**: `listingMonth` é passeio aleatório com drift de sinal do lucro; preço não olha dívida, caixa, covenant, bond default (só vira notícia) nem resultado dos subselos. `bolsa10` já tem blocos hostis e dividendos dos rivais — falta P/L de verdade para OWN (`labelTarget` existe só para rivais, `bolsa10.ts:391`).
- **Seguros** (`insure19`): pessoa-chave (morte 100%, doença 20%) e plano de saúde. Rasos: sem seguro de turnê/equipamento/estoque (incidentes de `tours.ts` e `crisisDay` não têm cobertura), sem franquia, sem seguradora que recusa renovar após sinistro (só +10% no prêmio).
- **Depreciação/ativos**: `lifeMonths` linear, sem valor de revenda de mercado, sem reavaliação de imóvel por cidade/ano.
- **Subselos**: economia própria simplificada (`gross = unidades × $6/$1,2`, `sublabels.ts:216-218`), não usa `distribute`/royalties/AR; conselho vota por chance fixa.
- **Preços** (`price20`): só explicação. O índice não distingue classe de bem (ingresso subiu mais que CPI desde 1996 — já anotado em `docs/precos20.md`); um índice por família (aluguel, salário, ingresso, equipamento) resolveria sem mexer na moeda.

---

## 4. Sistemas que não se conversam

Confirmado por grep de chamadas:

1. **Posição ignora ativos financeiros do selo**: `position20.assets` soma só `s.assets` (`oblig20.ts:93`). Ações compradas com caixa do selo (`bolsa10.buyShares` acct `'c'`, `:970-973`, categoria `investments`) reduzem o patrimônio em vez de virar ativo; o mesmo para ventures mantidos pelo selo (`ventures9.vpay` `:108-118`) e para o caixa/valor dos subselos (`sublabels.ts`) — `subLabelValuation` existe mas ninguém a soma ao balanço. Credores (`seize`) só enxergam `s.assets` (equipamento/prédio), nunca o catálogo (`money19.lien` só na chamada do banco) nem as ações.
2. **Bolsa × resultado do selo**: `business.listingMonth` (`:251-268`) usa só `profitByYear`/`revenueByYear`; `bond_default`, `debt_called`, `rate_shift` só viram `bolsaNews` (`money19.ts:584-605`). `boardConfidence` (`capital.ts:456-476`) usa histórico de preço, fechando um ciclo sem fundamento.
3. **`monthlyCosts` × resto**: `overhead13` (`:445-457`), `insure19` (`:131-137`), cupom/amortização de bonds (`money19.ts:484-485`), `securitizationMonth`, `ownerloanpay`, `ccard` lançam no razão mas não entram em `monthlyCosts` → `cashForecast18` (`econ18.ts:232-247`), `checkInsolvency` "dívida funda" (`economy.ts:97-99`), `withdrawFromCompany` (`capital.ts:228`), `paths18:393` subestimam o burn.
4. **Credores × AR/AP**: 1.6 acima — o banco não vê recebíveis; `liquid18` (`econ18.ts:224-227`) existe (4 chamadas) mas `creditorsMonth`, `loanOffer` e `bids` de aperto (`moneyb19.ts:154`) usam `cash < 0` cru.
5. **Receitas de merch/sync/shows → Posição**: entram sim (93 `post(... 'merch'|'sync'|'live'|...)`) e caem na DRE via `group18`; mas **só vendas** alimentam a cobertura do título (`money19.ts:488-489`: `sales+publishing+sync`), o `catalogMonthlyRevenue` da securitização (`business.ts:202-205`) e o `investor_share` (`economy.ts:53`). Live e merch não "lastreiam" nada.
6. **Subselos × matriz**: `distribute` devolve cedo para `owner` de subselo (`market.ts:441`), então royalties, AR/AP, recoupment e autores (`payAuthors`) não existem para discos do subselo; a DRE consolidada (`int:rev/int:cost` em `ledger18.ts:96`) só elimina transferências `rel:`, não `subtx`/`subdiv`/`subclose` (categoria `transfers`, que `sect18` trata como `inv`).
7. **Dois canais de câmbio** (1.10) sem se verem.
8. Funções exportadas sem uso: `liabilities20`, `totalDebt`, `canSpend20` (0 chamadas) — `canSpend20` deveria ser o gate padrão dos 15 pontos de 1.9.

---

## 5. Ideias para o jogo a partir desta área

1. **Extrato bancário "quem me deve / a quem devo" com data**: `fin18.ar/ap` já tem `due`, `who`, `mk`; uma tela de aging (30/60/90) com botão "antecipar este título" (`factor18` manual por bucket) e "atrasar esta prestação" por ato (`delayRoy` hoje é global).
2. **Covenant negociável**: ao tomar o empréstimo, escolher entre juro menor com covenant duro (dívida ≤ 0,8× receita, masters empenhados desde o início) ou juro maior sem covenant; `cov19` já tem as peças.
3. **Credor com rosto**: o `supplier` "Prensa & Cia." vira fornecedor de verdade — prazo de 60/90 dias na prensagem (`supply18` já tem `distLag18`), desconto por pagamento à vista, e ele corta o crédito (sem reprensagem) antes de "retomar" algo.
4. **Moeda do mercado-sede**: começar em São Paulo 1985 em cruzeiro, com inflação mensal visível na tela de caixa e a decisão de dolarizar reservas (perde no câmbio normal, salva na crise) — o `fxExposure18` já modela caixa na moeda da casa.
5. **Imposto como decisão**: fechar o ano com opção "investir em equipamento/sede até dezembro para abater" (exige 1.7 corrigido) e "sede fiscal" por filial (`branches`), com auditoria e multa como já existe para o cartão corporativo (`capital.ts:496-511`).
6. **Bolsa com fundamento**: preço de OWN = múltiplo da época (`rates19.eraMultiple`) × lucro consolidado ± prêmio de controle; queda ao quebrar covenant/bond → abre janela de **recompra barata** (`repelRaider`) ou **oferta hostil** de rival rico — usar o `labelTarget` de rivais para o próprio selo.
7. **Seguro de turnê e de estoque**: apólice por turnê (cancelamento, equipamento, clima — `tours.ts` já gera incidentes) e seguro de estoque físico contra devolução/enchente; seguradora que aumenta franquia após sinistro.
8. **Subselo como empresa de verdade**: usar `distribute` para discos do subselo (royalties, AR/AP, recoupment), consolidar na DRE com eliminação de `transfers`, e permitir que o subselo tome empréstimo com aval da matriz (passivo contingente em `oblig20`).
9. **Modo "Contador"**: painel de reconciliação (`recon20` já existe) que mostra o "Outros ajustes" ≠ 0 como alerta — hoje é onde os bugs da seção 1 se escondem; com `post()` estrito esse número deveria ser sempre 0 e virar uma conquista ("livro fechado 10 anos seguidos").
10. **Ironman honesto**: bloquear exportação/importação de texto na run ironman (ou carimbar o save importado como não-ironman) e um único autosave com hash no `SaveMeta`.
