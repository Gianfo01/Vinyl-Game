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

## Fora (lacunas)

* NPCs não fazem feat de pessoa sozinhos (o `npcFeats` do mundo segue ato × ato): mexer mudaria os mundos padrão.
* Convites de fora (caixa de entrada) continuam convidando o ato do jogador inteiro.
* O "Convite rápido" (preço de tabela, sem negociar) segue só para atos; pessoa vai pela negociação.

Capturas: `docs/shots29feat/` (script `scripts/shots29feat.mjs`). Testes: `tests/r29-person-feat.test.ts`.
