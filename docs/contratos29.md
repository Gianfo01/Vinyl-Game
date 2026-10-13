# Contratos+ (R29) — empresariamento, produção e joint venture jogáveis

Pedido do autor: *"Fases prometidas no setup mas ainda bloqueadas."* Os papéis Empresário, Editora musical e
Estúdio/produtor apareciam como "(fase 4)" em `ROLES`, e três modelos de contrato (`management`, `production`, `jv`)
apareciam desativados no formulário de oferta com "(fase posterior)". Agora tudo é jogável, em cima dos sistemas que já
existiam. Nenhum caminho de contrato novo: **a proposta continua sendo o formulário de sempre e a mesa r27**
(docs/act27.md — uma entrada por ação).

## Papéis e carreiras

* `ROLES` (src/data/rules.ts) virou um espelho das atividades do sistema de 12 carreiras (careers12): todos
  `available: true`, sem "fase 4", e cada papel diz por quais atividades começa (`careers`). O papel do MOTOR
  (`RunConfig.role`) continua sendo só `label | artist | hybrid`, derivado das atividades (`roleFromMain`).
* `roleOfCareers29(main)` dá o papel mostrado: o resumo da Nova run (aba Revisão) agora mostra "Empresário",
  "Estúdio / produtor" ou "Editora musical" quando essa é a atividade principal (antes mostrava "Gravadora").
* A Nova run rápida (`CAREERS27`) e a configuração completa (`careers12`) já deixavam escolher e jogar essas atividades.
* Saiu a string `S.phaseLater` ("(fase posterior)"). Um teste varre rules, i18n, newgame, ficha, home27model,
  careers12 e a mesa r27 atrás de "fase 4/5", "phase 4/5", "phaseLater" e "fase posterior".

## Os três modelos

Termos puros em `src/sim/terms29.ts` (sem estado, sem ciclo de imports); o sistema em `src/sim/sys/contracts29.ts`;
as telas em `src/ui/sys/contracts29.ts` e `src/ui/sys/contracts29reg.ts`. Campos novos, todos opcionais (save antigo
abre igual): `Offer.x29` e `Contract.x29` (por *module augmentation* dos tipos). Nada novo em `s.x4`.

### Empresariamento (`management`)

* **Quem pode receber**: ato sem selo **ou com selo rival** (o ato fica onde está). Não vale para atos do seu selo
  (conflito de interesse), para a sua banda, para quem já é seu cliente, nem acima do limite de clientes da carreira
  (`mgCap`). Regra única em `offerEligible29(s, act, model)` — a ficha, a mesa, `makeOffer` e o aceite usam a mesma.
* **Entrada**: na ficha de um ato de selo rival aparece **"Propor empresariamento"** (abre a MESMA proposta já no
  modelo). Para ato sem selo, "Fazer proposta" → Modelo → Empresariamento.
* **Termos**: comissão de 10–25% (padrão 15%), luvas opcionais (o artista espera pouco: 15% do adiantamento de selo),
  prazo, promessas r28.
* **Ao assinar**: o contrato fica em `s.contracts` (party `player`, model `management`) mas **não** é o
  `act.contractId`; o ato vira cliente em `ventures9 mg.clients` — a mesma máquina da carreira de empresário:
  comissão mensal (`mgGross × taxa`, paga ao dono da carteira, pessoal por padrão), satisfação, crises, demissão,
  reputação. O empresário NPC que representava o ato (managers14) perde o cliente.
* **Carreira**: se você ainda não é empresário, **a carreira começa no aceite** (`startCareer('manager')`) — opção
  escolhida por ser a mais limpa: o contrato é a porta de entrada da atividade, e as ações de carreira (turnê,
  negociar com o selo dele, campanha de imagem, crises, plano) ficam na Gestão de artistas, como sempre.
* **Conflito de interesse**: se o ato vier para o seu selo, a confiança cai 2 e a satisfação 3 por mês (aviso uma vez)
  até um dos dois acabar. A renegociação "pelo cliente" contra o seu próprio selo já era bloqueada.
* **Saídas**: fim do prazo (`expired`), "Deixar a gestão" (`quit`; antes do prazo: confiança −8 e reputação −2), o
  artista demite você quando a satisfação desaba (`fired`, a regra de sempre do ventures9) e o ato que encerra a
  carreira (`gone`).
* **Sem leilão**: nenhum selo rival disputa (nem na proposta única nem na mesa — "Chamar um rival" fica desativado com
  o motivo).

### Produção (`production`)

* **Ao assinar**: contrato normal — a sua produtora assina o ato (`act.owner = 'player'`) e é dona dos masters
  (`defaultRights('production')`: master do selo/produtora, sem pontos de produtor terceiro, 1 opção, licença
  permitida). A carreira Estúdio/produtor começa se ainda não estiver ativa.
* **Termo principal**: o "royalty" é **a parte do artista em tudo o que a produtora receber** (padrão ~45%).
* **Gravar**: como sempre (agenda, estúdio, sessões).
* **Lançar pelo seu selo**: o lançamento de sempre (o contrato cobre o disco; o artista recebe a parte combinada).
* **Entregar a um selo rival** (aba Acordos especiais): os masters gravados e não lançados (até 10 faixas) viram um
  disco do selo (`launchNpcRelease`, dono = o selo; conta como disco entregue do contrato).
  * **Licença**: o selo paga um adiantamento por master (fama, qualidade, reputação do selo) e **pontos** (16%, 18%
    para ato com fama > 30) sobre a receita do disco. Os pontos recuperam o adiantamento antes de pagar.
  * **Venda**: preço único (2,2× o adiantamento), sem pontos.
  * Todo dinheiro que chega à produtora entra como `production` e a parte do artista sai como `royalties`
    (abatendo o adiantamento dele primeiro). Liquidação do disco entregue: `market.ts → prod29().dist` (o selo fica
    com a receita do master; a venda NÃO cai no seu caixa como se o disco fosse seu).
* **Saídas**: fim do prazo (contrato normal) ou "Liberar o artista" (`released`). As entregas já feitas continuam
  pagando pontos.

### Joint venture (`jv`)

* **Quem pode**: só quem tem empresa (gravadora ou híbrido) — selo é selo.
* **Ao assinar**: contrato normal + um **subselo** (sublabels.ts) "<ato> Records": você com `founderShare`
  (1 − participação), o artista como sócio no conselho (`board`), estratégia "catálogo" (lança pela máquina de
  sempre), o ato no elenco do subselo. **O adiantamento vira o capital do selo** (não vai para o bolso do artista;
  no livro-caixa aparece convertido em `transfers`), e não é recuperável.
* **Termos**: participação do artista 20–60% (padrão 35%), meta de lançamentos no prazo (padrão 3; acima de 1 a cada
  9 meses assusta), master co-propriedade (`shared`: nos discos do SEU selo o artista leva metade do líquido).
* **Lucro**: todo dezembro, o lucro distribuível (até o lucro retido, acima da reserva) é dividido pela participação:
  a sua parte entra como `dividends`, a do artista vai para o caixa dele.
* **Meta**: lançamentos do subselo (atos do elenco da JV) + discos do ato da JV pelo seu selo, desde a assinatura.
* **Saídas**:
  * **Comprar a parte do artista** (valor do subselo × participação × 1,15): o selo vira 100% seu; o contrato segue.
  * **Dissolver** (`dissolved`): o caixa é dividido pela participação, as dívidas saem da sua parte, **multa ao
    artista se a meta não estiver cumprida** (25% do adiantamento, mínimo de US$ 1 mil corrigidos), o ato deixa o selo.
  * **Fim do prazo** (`expired`): mesma divisão; meta cumprida = confiança +8; não cumprida = multa.
  * **O artista sai da sociedade** quando a confiança cai abaixo de 20 (`partner_exit`, sem multa).
  * Falência do subselo (regra de sempre dos subselos): a JV acaba; o contrato de selo segue até o fim.

## Avaliação (`evaluateOffer`)

A conta dos modelos antigos não mudou (os goldens r27-p2a/p2b/m2 passam sem re-medir). Para os novos:

* O termo principal de cada modelo entra no lugar do royalty (`royTerms29`): o que sobra depois da comissão; a parte
  dos recebimentos; a participação no selo — cada um com a sua expectativa (`expRoy29`).
* A expectativa de adiantamento cai por modelo (`advFactor29`: 0,15 empresário, 0,6 produção, 0,7 JV).
* **Modelo × ambição**: carreiristas (fama, status, dinheiro) gostam de empresário; quem quer segurança, menos.
  Independentes (liberdade, legado, arte) gostam de JV; quem quer segurança tem medo; ato pequeno desconfia.
  Arte/crítica gostam de produção; quem quer fama prefere selo.
* **Traços e carreira** (ganchos `c29.fit` e `c29.mgr`, com motivo visível no "por quê"): ambiciosos/competitivos
  querem empresário, solitários/rebeldes não; comissão > 20% pesa; já tem empresário NPC; já demitiram você; sua
  reputação de empresário pequena demais para o tamanho do ato (a mesma régua `mgAdj9` da carreira). Gente de estúdio
  (produtor na formação, perfeccionista, virtuose, experimental) e ter estúdio próprio puxam a produção. Rebeldes e
  atos grandes puxam a JV; meta puxada demais derruba.
* No empresariamento, o "alcance" que pesa é o seu como empresário (reputação, carreira ativa), não o do selo.
* O "por quê" das ofertas (offers12 — pacote e comparação) enxerga comissão e participação.

## Onde aparece

* **Formulário de oferta** (ficha.ts): os 8 modelos selecionáveis; ao trocar, o adiantamento e a parte do artista se
  reajustam; quadro do modelo (o que acontece ao assinar + comissão / participação e meta); o resumo "O selo concede /
  O artista concede" fala a língua de cada modelo.
* **Mesa r27** (negotiate27): o Modelo escolhe-se antes da 1ª proposta (opções indisponíveis desativadas com o
  motivo); a contraproposta mexe no termo do modelo (comissão menor, participação maior, parte maior); o diário da
  mesa escreve "15% de comissão" etc.; fecha pelo caminho normal (`makeOffer → acceptOffer`).
* **Mercado de contratos → Acordos especiais** (Pessoas › Contratos — a tela S07 da REORG): cada acordo com termos,
  dinheiro que já andou, situação e as saídas (deixar a gestão, licenciar/vender masters, liberar o artista, comprar
  a parte, dissolver) + "Como funcionam".
* **Direitos** (Negócios › Direitos, rights8): os três modelos com o status certo (o empresariamento não é o
  `act.contractId`) e sem "reversão" falsa para o empresário.
* **Ficha do ato**: aba Contrato mostra "Empresário: você — 15% de comissão"; o selo de cabeçalho mostra
  "Empresário: você"; dossiê "Contratos e selos" (dossier13) com o termo e o vigente certos; inspetor lateral
  (insp29model) com "Você é o empresário" / "Contrato de produção" / "Joint venture".
* **Promessas r28**: valem nos três (verba, prazo, multa); a revisão do avanço as lista como sempre.
* **Clique direito (ctx27)**, seção "Carreira e contrato" do menu do ato e do menu da pessoa (pelo ato dela):
  "Propor empresariamento", "Propor contrato de produção" e "Propor joint venture". Bloqueados mostram o motivo da
  mesma regra da proposta (`offerEligible29`): num ato de selo rival só o empresariamento vale ("Tem contrato com
  outro selo" nos outros dois). Os três chamam o MESMO handler do botão da ficha (`ctx29c.c29Open().f` →
  `openOffer(ato, false, modelo)`; despacho `runC29` no `run()` de ctx27.ts). Itens puros em `src/ui/ps/ctx29c.ts`.

## O mundo também usa os três modelos (NPC — `src/sim/sys/npc29.ts`)

* **Empresários NPC** (managers14, reais e gerados): "quem empresaria quem" (`m14.rep`) vira contrato de verdade em
  `s.contracts` — party `e:<id>`, model `management`, comissão pelo estilo (tubarão/linha-dura 20%, fabricante de
  imagem 25%, empresário de palco 15%, guardião 12%), prazo 36–60 meses (renova sozinho; trocar de empresário encerra
  um e abre outro). A comissão sai do caixa do ato todo mês (`mgGross` × taxa). A contratação de clientes pelos
  empresários NPC segue a curva de época `mgrEra29` (×0,4 antes de 1950, ×0,9 nos 1950, ×1,5 de 1960 a 1989, ×1
  depois): forte na era do rock.
* **Produtoras NPC** (produtores reais ativos de producers15 — Spector, a Motown, Sam Phillips… — e os estúdios dos
  selos rivais, ventures9 `npc`): assinam atos sem selo (party `pd:<id>` / `vs:<selo>:<cidade>`, adiantamento
  recuperável pela parte do artista, até 8 contratos vivos, 2 por produtora). Chance por mês pela curva `prodEra29`:
  0 antes de 1950, 6% nos 1950, **30% de 1960 a 1989**, 12% até 2004, 5% depois. A cada ~4 meses a produtora grava
  (por conta dela) e entrega as masters a um selo rival (licença com adiantamento e pontos, às vezes venda) — **ou
  oferece ao SEU selo pela Caixa de entrada**: *"{produtora} oferece as masters de {ato}"*, com **Licenciar** (paga o
  adiantamento; o disco sai pelo seu selo e a produtora ganha pontos depois de recuperar), **Comprar as masters**
  (2,2×, sem pontos) ou **Recusar** (vai para um selo rival) — a mesma liquidação de entregas (`deliverNpc29` /
  `prod29().dist`). Quem está com produtora NPC não assina direto (radar/proposta mostram o motivo); um selo NPC que o
  contrata compra o contrato de produção (`sold`).
* **JV / selo-vaidade NPC**: quando um selo NPC assina uma estrela (fama ≥ 40), a partir dos anos 1970 (`jvEra29`:
  12% até 1989, 20% depois) o contrato vira `jv` com selo-vaidade ("<ato> Records"): royalty maior e o mesmo +4% de
  apelo do selo-vaidade do deals18 (a mesma fonte `deals18:imprint`, sem família nova).
* **Disputa** (rivalsense28): na disputa por uma estrela (fama ≥ 30, a partir de 1970) o rival agressivo pode cobrir
  com uma **joint venture** (selo próprio) em vez de um contrato clássico — o artista avalia pela mesma régua
  (`evaluateOffer`, modelo `jv`); se vencer, assina como JV ("{selo} roubou {ato} com uma joint venture").
* **Estrela propõe JV ao seu selo** (Caixa de entrada, a partir de 1970, 4–6% ao mês, no máximo 1 por ano): *"{ato}
  propõe uma joint venture"* com participação, meta e capital pedidos; aceitar assina pelo caminho normal
  (`acceptOffer` → subselo), recusar magoa um pouco.
* Medido (bot equilibrado, 10 anos): semente `c29-npc-62` (1962–72) → 416 contratos de empresariamento NPC (com as
  renovações e trocas), 38 de produção, 3 JV (todas de 1970+); semente `c29-npc-75` (1975–85) → 33 de produção, 18 JV.

## Fora do escopo / limites

* A comissão do empresário usa a estimativa de ganhos de sempre da carreira (`mgGross`, fama e momento), não a
  receita exata de cada fonte do ato; é paga ao dono da carteira (pessoal por padrão, como na carreira).
* Produtora NPC e empresário NPC não têm caixa próprio no jogo: o que recebem sai do selo/ato e some (só o
  artista e o seu selo têm caixa); `x29.paid` guarda quanto andou.
* A mesa r27 ("Chamar um rival") segue trazendo rival só com contrato clássico; a JV de disputa é da proposta única /
  fechamento do mês (rivalsense28).
* O "Propor" rápido da Gestão de artistas (ventures9, taxa fixa) continua sendo o atalho da carreira; o contrato é o
  caminho completo.
* Disco entregue a selo rival: fãs pela regra simples (sem o caminho de descoberta do media18) e edição resumida
  (5% da receita ao ato).

## Determinismo e infraestrutura

* Sorte só por fluxos próprios: `Rng.fromSeed(semente|prod29|contrato|n)` na entrega e `…|jv29|contrato` no logo do
  subselo; NPC em `…|npc29|…` (empresário, assinatura e mês da produtora, JV de selo, proposta de JV) e a JV de
  disputa em `rivalsense28 …|jv29|…`; nenhum sorteio no fluxo comum (`s.rng`). O mesmo sorteio do 360 do
  `signWithRival` continua no lugar (ordem do RNG do selo preservada).
* Ganchos guardados em funções (`special29()`, `prod29()`): carregam antes dos módulos que registram (ciclo de imports).
* Nenhum tipo de fato novo nem fonte de appeal nova (r19-infra verde).
* Goldens re-medidos (de propósito, com comentário nos testes): o mundo NPC agora assina empresariamento, produção e
  JV (ids, caixa dos atos, JV de estrela, disputa por JV). r27-p2a/r27-p2b: caixa 450735 → 187797, acts 2386675548 →
  2538409132, rng 2839816166 → 673973041 (turnês iguais). r27-m2: o show do 9º mês de r16pb-8 virou empate de resenha;
  o fixture passou a r16pb-2 (show no 8º mês, resenha 66 × 60, razão de fãs 0,98) depois de medir r16pb-2…11.
* Desempenho: índices por estado para "contrato de produção NPC do ato" (o radar consulta muito) e "disco → entrega";
  numa run de 2030 com o bot, com × sem npc29 deu o mesmo tempo (dentro do ruído da máquina).

## Testes e capturas

* `tests/r29-contracts-more.test.ts`: oferta → aceite → 1 ano para cada modelo (comissão; entrega com adiantamento,
  parte do artista abatendo o adiantamento e pontos depois da recuperação; divisão 60/40 do lucro da JV), as saídas
  (deixar, prazo, demissão; venda e liberar; compra, dissolução com multa, saída do sócio), avaliação × ambição/traço,
  telas (Acordos especiais, inspetor, dossiê, offers12), a mesa r27 e determinismo; papéis sem "fase 4/5"; NPC em 10
  anos de bot (contagens por modelo e época), Caixa (masters → licenciar/comprar/recusar; JV proposta por estrela),
  clique direito (as três propostas num ato de selo rival e na pessoa, mesmo handler) e determinismo do lado NPC.
* `scripts/shots29contratos.mjs` → `docs/shots29contratos/` (Nova run, ficha com "Propor empresariamento", mesa,
  formulário de produção e de JV, Acordos especiais, Direitos, a aba Contrato do ato empresariado, o clique direito com
  as três propostas e a Caixa com "Sam Phillips oferece as masters de …").
