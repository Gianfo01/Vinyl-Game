# Feat de pessoa específica (R29)

Pedido do autor: *"permita a participação/feat de só integrantes/personagens específicos, sem ser a banda toda também"*.

O feat negociado de sempre (`sim/sys/feats8.ts`: cachê, royalties da faixa, liberação do selo, resposta na hora /
"preciso pensar" / contraproposta) passa a aceitar como convidado uma **pessoa** — integrante de banda, artista solo,
músico avulso, produtor(a) que canta ou toca —, **várias pessoas** (até 4) ou **um ato + pessoas** (feat misto).
Um caminho só (docs/act27.md): é a mesma tela (`round8.openFeatModal`), a mesma negociação e o mesmo registro
(`feats8.deals`, `creation.features`). O feat do ato inteiro não mudou.

## Regras (sim/sys/featp29.ts)

| | Feat do ato (como antes) | Feat de pessoa |
|---|---|---|
| Crédito | `Música (feat. Queen)` | `Música (feat. Freddie Mercury)`, `(feat. A & B)`, `(feat. Ato & Pessoa)` |
| Cachê justo | `featureFee(fama do ato)` | `featureFee(personFame)` × (0,85 + habilidade/400); somado por convidado |
| Royalties justos | pela fama do ato | pela fama da pessoa; a maior parte + 2 pontos por convidado a mais |
| Performance da faixa | +4 + fama/25 | por pessoa: peso (1; 0,6; 0,4; 0,3) × (2 + fama/30 + (habilidade − 50)/12), teto +12 |
| Habilidade | — | voz de quem canta (`vocals10.sings`), instrumento de quem toca |
| Voz na faixa instrumental | o ato tem quem canta | a pessoa canta |
| Apelo do lançamento | até +25% pela fama do ato | até +20% pela fama das pessoas (+4% se a banda é de outra família) |
| Público cruzado | 3% casuais + 1% ativos de cada lado | dos fãs da **banda da pessoa** × k, k = 0,25 + fama/250 (máx. 0,6); a banda dela ganha metade disso |
| Chance | `featChance` | a mesma fórmula, com a fama e os laços **dela**; com vários convidados, decide o mais difícil (−4% por convidado a mais) |
| Liberação | selo do ato (`clearance`) | a mesma `clearance`, uma por ato envolvido (a banda de cada pessoa), proporcional ao cachê |
| Reação | — | colegas de banda: ciúme (−2 em `Person.rel`) ou orgulho (+1 se o anfitrião é 10+ de fama maior) |

Bloqueios com motivo (menu, busca e proposta): faleceu; jovem demais (< 14 anos); produtor(a) que não canta nem toca;
fora de atividade (sem banda/carreira viva e fora do mercado de avulsos); já no seu elenco; selo da banda não libera
(rivalidade > 60); pessoa que já vem com o ato convidado no feat misto.

Determinismo: sorteio próprio `Rng.fromSeed(semente|feats8p29|parte|semana|n)` — o fluxo compartilhado não anda
(nem na proposta, nem na resposta de quem pediu tempo, nem no "pressionar"). Os ganchos do feats8/creation
(`FEAT29`, `FEATP29_CORE`) são preenchidos pelo featp29 sem import estático: nenhum módulo mudou de lugar na ordem de
avaliação (conferido no bundle: só entra o gancho de lançamento `featp29`, que não faz nada sem feat de pessoa). Mundos
padrão iguais: r27-p2a, r27-p2b e r27-m2 passam sem re-medir.

Save: só campos opcionais novos — `FeatDeal.guestPersons`, `FeatState.n29`, `creation.songs[id].featPersons`,
`Feature.guestPersons`. Com pessoas, `guestActId` é o ato do feat misto ou `''`.

## Entradas

* **Tela do feat** (Negociar feat): "Ato inteiro" | "Pessoa(s) específica(s)". No modo pessoa: busca enquanto digita
  (nome da pessoa ou da banda, no máximo 24 resultados, agrupados pela banda; "Artistas solo"; quem não pode aparece com
  o motivo), as escolhidas com ✕ e "Junto com um ato (opcional)".
* **Clique direito numa pessoa** › Música e projetos › "Convidar {nome} para um feat…".
* **"Oferecer a {nome}… ›"** (member29) › "Participação (feat) de {nome}…" — agora pré-escolhe a **pessoa**
  (`memberFeatPreset29`), não a banda.
* **Composição › Parcerias**, **Projeto musical** e **painel r13 do projeto**: botão "Pessoa específica…" ao lado do
  convite do ato (abre a mesma tela no modo pessoa). O crédito do convidado mostra as pessoas.
* **Ficha da pessoa › Conexões › Participações (feat.)** (`connect29.personFeats29`): as dela e as do ato inteiro de
  uma banda dela durante a passagem. A memória `feature` leva `pid`, então o feat entra também na crônica/biografia.

## Parte B — o mundo, a caixa de entrada e o convite rápido

**O mundo convida pessoas** (`npcPersonFeatsMonth29`, gancho mensal `featp29`). Atos NPC creditam um convidado pessoa
— integrante de outra banda, solo, avulso (lineup16), músico de estúdio (session19) ou produtor que toca — numa faixa
**gravada que vai sair** (a 1ª da fila do ato, que abre o LP e, reforçada, costuma puxar o single). Mesmos dados
(`featPersons`), crédito ("feat. {Nome}" na faixa; no LP o título do disco fica sem o crédito) e efeitos (performance/Q
pela fama e habilidade, cachê do anfitrião para a banda da pessoa, laço, reação dos colegas); o público cruza quando a
faixa sai. Sorteio próprio `Rng.fromSeed(semente|feats8p29npc|ano|mês)`.

* Frequência esperada por mês (`npcFeatRate29`): 0,15 antes de 1960 · 0,3 até 1974 · 0,55 até 1989 · 0,9 até 1997 ·
  **2 de 1998 em diante**. O anfitrião é sorteado pela fama^1,3 × afinidade do gênero (`FAM_W29`: hip-hop 2,6, pop 1,8,
  R&B 1,5 … rock 0,8, country/folk 0,4, sacro 0,3). Do fim dos anos 1990, em hip-hop/pop, 12% levam uma segunda voz.
* Par plausível (`pairScore29`): fama própria e fama parecida com a do anfitrião, mesma família de gênero (+1,2), mesma
  cidade (+0,8), mesmo selo (+0,5), laço social (social8), projeto em comum (bonds9) e admiração pelo anfitrião, e voz
  quando o anfitrião não tem quem cante. Sorteio ponderado entre os 10 mais plausíveis.
* Medido (10 anos de bot, 1994–2004, `tests/r29-person-feat-b.test.ts`): bem mais de 40 feats; ≥ 60% na mesma família
  de gênero; laço ou mesma cidade em mais da metade; ritmo dos anos 2000 maior que o dos 1990. Ex.: "Little Stranger
  (feat. Willie Dixon)", de Muddy Waters.
* Gente **sua** nunca é escalada à revelia: vira convite na caixa de entrada (abaixo).
* Ficha (Conexões › Participações), crônica/biografia (memória `feature` com `pid`) e `connect29.personFeats29` mostram
  os feats do mundo como os seus. Totais em `feats8.ns29` (`npcStats29`), registro dos 120 últimos em `feats8.np29`.

**Convite de fora a uma pessoa sua** (`npcPersonInvite29`; gancho `featp29-inbox` + quando o mundo escolhe gente sua).
A carta nomeia a pessoa ("Mohammed Rafi quer a voz de Pavel Dvořák" — modelo `featp29` do mail27model, com `{person}`):

* **Aceitar (só a pessoa)** → `acceptPersonInvite29`: o anfitrião grava e lança o single "(feat. {Nome})"; você recebe o
  cachê e os royalties combinados (acordo `side: 'guest'` com `guestPersons`); a pessoa ganha fama pessoal (fame15 `po`),
  a banda dela ganha público do anfitrião e os colegas reagem (ciúme/orgulho).
* **Propor a banda inteira** → o anfitrião topa (chance pela fama da banda × da pessoa e laços) e vira o feat do ato de
  sempre (`feats8.acceptNpcInvite`), ou desiste ("queria só {pessoa}").
* **Recusar** → laço um pouco pior. Os convites ao ato inteiro (`feat8`) continuam como antes.

**Convite rápido de pessoa(s)** (`quickFeat29`; entrada `creation/core.inviteFeaturePersons` e a aba Composição ›
Parcerias): o caminho sem negociação do mesmo feat. Preço de tabela = cachê justo da pessoa (fama + habilidade do papel)
+ liberação dos selos; chance pela fórmula do convite rápido do ato com a fama de cada pessoa; os mesmos bloqueios;
recusa fica registrada em `creation.features`.

Mundos padrão mudam de propósito: `r27-p2a`/`r27-p2b` re-medidos com comentário (6 feats de pessoa do mundo nesta
semente em 8 meses: 450730 / 1382068899 / 2126210917 / 2839816166); `r27-m2` e `r19-infra` seguem verdes.

## Fora (lacunas)

* O "Convite rápido" das telas de projeto (Projeto musical / painel r13) segue para atos; pessoa vai pelo botão
  "Pessoa específica…" (negociação) ou pela aba Parcerias (rápido).

Capturas: `docs/shots29feat/` (scripts `scripts/shots29feat.mjs` e `scripts/shots29featb.mjs`). Testes:
`tests/r29-person-feat.test.ts` e `tests/r29-person-feat-b.test.ts`.
