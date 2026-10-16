# O que o jogador sabe (e não sabe) sobre as pessoas — auditoria de coerência (plano 30)

Leitura só de código (sem edição). Repo: `/home/user/Vinyl-Game`. Todos os caminhos abaixo são relativos a ele.

## 1. Como o sistema funciona hoje (mapa)

Hoje existem **quatro fontes de verdade concorrentes** para "o quanto se sabe", e cada tela escolhe uma delas.

| Fonte | Onde | O que mede | Quem lê |
|---|---|---|---|
| `s.knowledge[actId].degree` (1–5, com `bias`) | `src/sim/types.ts:527`, `src/sim/scouting.ts` | scouting por **ato** (rumor → observação → acompanhamento → audição/conversa → convivência) | `estimate()` (`scouting.ts:45`), diretório, comparador, talentos23, `nego27.insight27/read27` (`nego27.ts:73,115`), oferta clássica (`ficha.ts:178`) |
| `knownLevel()` (`src/sim/sys/fame15.ts:120`) | junta `deg` (scouting), `rel` (relação do **seu personagem** com a pessoa, `relDeg` `fame15.ts:106-112`) e `exp` (degrau de fama vista do seu país) → `priv = max(deg,rel)`, `pub = max(deg,rel,exp)` | ficha da pessoa e do ato (`pages.ts`), dossiê13, persona13, `est18`, fame15/16, mapa | |
| `canSee(id, campo)` com a tabela `NEED` (`fame15.ts:143-151`) | público: bio 1, fama/fãs/imagem 2, vida 3, relações 4; privado: atributos 2, contrato 3, potencial 3, traços/humor/saúde 4, músicas 5 | maior parte das abas | |
| `KNOW27` 0–3 (`src/sim/sys/knownacts27.ts:49,215-221`) | derivado de `knownLevel` + "laço" (contato/cena/festival) | página Artistas conhecidos | |
| Segredos por **observador** (`src/sim/sys/secrets23.ts`, `LVL23` desconhecido→suspeita→boato→confirmado→público; observadores 'player', 'press', id de selo) | o melhor modelo do jogo: já é multi-observador | aba "O que sabemos" | |
| Fatos com `visibility: public / rumor / secret` (`facts17`, emitidos em family29, crime, holds17…) | nível de exposição do **fato**, não do observador | knownacts27 (imprensa/boato), found17 | |

Outros "medidores" paralelos: `visibleFields(degree)` (`scouting.ts:76`: skills ≥2, potencial ≥3, ambição ≥3, traços ≥4, privado ≥5), `fuzz()` das fichas (`pages.ts:102`: `[99,30,18,10,4,0]`), `w13` da persona13 (`persona13.ts:51`, mesma tabela), `est18` com viés e névoa (`ability18.ts:279-310`), dossier8 com 7 sinais enviesados por fonte (bom), `opinionOf` (`persona13.ts:496`).

Diagnóstico de fundo: **relação (intimidade), opinião (gostar/odiar) e conhecimento se confundem** — `relDeg` usa `|rel|`, então o inimigo mortal "conhece você" tanto quanto o melhor amigo; e não existe o estado "nunca se encontraram" (ausência de `rel` = 0 = "neutro").

## 2. Matriz — o que a UI mostra HOJE

Legenda: ✓ = mostra (exato) · ~ = faixa/estimativa · ? = escondido · ⚠ = incoerente (ver §3, número do problema entre colchetes).
Colunas: (a) seu artista/equipe · (b) famoso (Internacional+) nunca visto · (c) obscuro (fama < 10) nunca visto · (d1/d2/d3) olheiro grau 1/2/3 num desconhecido obscuro · (e) contato/amigo (|rel| ≥ 35, sem olheiro).

| Informação | (a) seu | (b) famoso | (c) obscuro | (d1) | (d2) | (d3) | (e) amigo |
|---|---|---|---|---|---|---|---|
| Nome, logo, foto/retrato | ✓ | ✓ | ✓ ⚠[1] (listado no diretório mundial) | ✓ | ✓ | ✓ | ✓ |
| Gênero, cidade, ano de formação, status | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Selo atual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Integrantes (nomes) | ✓ | ✓ | ? na aba, mas ✓ no diretório de pessoas e na busca ⚠[2] | ✓ | ✓ | ✓ | ✓ |
| Idade / origem | ✓ | ✓ cabeçalho, ? no Perfil ⚠[3] | idem ⚠[3] | ✓ | ✓ | ✓ | ✓ |
| Discografia, vendas, crítica | ✓ (+receita) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Paradas, recordes, prêmios | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Histórico de selos / contratos passados (dossiê13) | ✓ | ✓ (fãs públicos) | ? | ? | ✓ | ✓ +royalty | ✓ |
| Fama | ✓ | ✓ exata (global, não a do seu país) ⚠[4] | ? (mas ordena listas pela fama real ⚠[5]) | ~ | ✓ | ✓ | ✓ |
| Fãs casuais/ativos/núcleo | ✓ | ✓ exato | ? | ? | ✓ exato | ✓ | ✓ |
| Momento, posicionamento, reputação (4 notas) | ✓ | ✓ exato | ? | ? | ✓ | ✓ | ✓ |
| Hype agora (dossiê13 recordes) | ✓ | ✓ | ✓ ⚠[6] | ✓ | ✓ | ✓ | ✓ |
| Talento/atributos | ✓ | ? | ? | ~±15 **centrado no valor real** ⚠[7]; diretório/comparador dizem ? ⚠[8] | ~±9 centrado ⚠[7] | ~±5 | ~±9 na ficha, ? no diretório/comparador ⚠[8] |
| Potencial | ~ (duas leituras diferentes ⚠[9]) | ? | ? | ? | **~±15 centrado no real** na ficha da pessoa ⚠[10]; ? na do ato | ~ (com viés) | ~ ficha da pessoa, ? ato/diretório ⚠[8] |
| Valor de mercado (cachê/passe) | ✓ | ? | ? | ? | ✓ exato (do valor real) ⚠[11] | ✓ | ✓ |
| Personalidade / traços / ambição | ✓ | ? | ? | ? | ? (nego27 já mostra traços ⚠[12]) | ambição | traços só com rel ≥ 60 |
| Política e religião | ✓ | ✓ (aba Crenças sempre) / ? (Perfil) ⚠[13] | ✓/? ⚠[13] | ⚠[13] | ⚠[13] | ✓ | ✓ |
| Humor/estresse/saúde | ✓ | ✓ estresse exato na aba Fatos ⚠[14]; ? no resto | ✓ estresse ⚠[14] | ⚠[14] | ⚠[14] | ⚠[14] | ⚠[14]; ato: humor só com grau 4 |
| Vícios/dependência | ✓ | ? mesmo com escândalo público de vício ⚠[15] | ? | ? | ? | ? | ✓ (rel ≥ 60) com número /100 |
| Contrato vigente (modelo, royalty, fim, discos) | ✓ | modelo/discos ✓ (dossiê13), royalty ?, fim ? | ? | ? | modelo ✓ | **tudo exato** | idem d3 se rel ≥ 35 |
| "Royalty que considera justo" | ✓ | ✓ exato só por ser famoso ⚠[16] | ? | ? | ✓ | ✓ | ✓ |
| Chance de aceitar sua oferta | — | faixa + **placar exato no hover** ⚠[17] | idem ⚠[17] | idem | idem | idem | idem |
| Mínimo escondido na mesa (nego27) | — | faixa (só olheiro conta; amizade não) ⚠[18]; paciência exata | idem | idem | idem | idem | idem ⚠[18] |
| Relações (amigos/atritos) | ✓ | ✓ **grafo inteiro com números** só por ser superstar ⚠[19] | ? | ? | ? | ? | ✓ (rel ≥ 60) |
| Família (cônjuge, filhos, pais, menor) | ✓ | ✓ sempre (aba Família + cabeçalho) ⚠[20] | ✓ sempre ⚠[20] | ✓ | ✓ | ✓ | ✓ |
| Favores/segredos/dívidas entre NPCs (holds) | ✓ | ✓ **todos, inclusive segredos NPC↔NPC** ⚠[21] | ✓ ⚠[21] | ✓ | ✓ | ✓ | ✓ |
| Laço com crime organizado | ✓ | ✓ sempre (Conexões › Submundo) ⚠[22]; aba Crime só se público, mas com posto/função/nº de crimes até no boato ⚠[23] | ⚠[22] | ⚠[22] | ⚠[22] | ⚠[22] | ⚠[22] |
| Segredos (secrets23) | ✓ | por observador ✓ (coerente) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Opinião sobre você | ✓ | **"0 — nada marcante"** sem nunca ter te encontrado ⚠[24] | idem ⚠[24] | idem | idem | idem | ✓ |
| Opinião sobre outros (bonds9) | ✓ | ✓ citações (ok se públicas) | ? (fama < 10) | — | — | — | — |
| Finanças (selo rival) | — | receita ✓ (ok), dívida ✓, avaliação e passivos ✓ (derivam do caixa) ⚠[25] | | | | | |

## 3. Incoerências concretas (com arquivo:linha)

**Listas e diretório**
1. **Diretório mundial onisciente**: "Todos os artistas" lista todo ato estreado do planeta (`src/ui/sys/directory.ts:42-62`, só filtra `visibleAct`, que só esconde quem não estreou — `src/sim/future.ts:17-21`). Contradiz "Artistas conhecidos", que só mostra quem tem laço (`knownacts27.ts:1-7`). O botão "Seguir" põe qualquer desconhecido do outro lado do mundo no radar de graça. — ✅ **corrigida na 31.3 (F)**, commit 64f7f08, f65ffc0: o diretório (ativos e encerrados) e o mapa listam só `knownActIds31` (o que a sua empresa conhece) e o público.
2. Integrantes de ato desconhecido: aba escondida por `canSee('bio')` (`pages.ts:362`), mas o diretório de pessoas lista nome, idade, função, ato e tags de família de todo mundo (`directory.ts:113-150`), e a busca de Artistas conhecidos casa nomes de integrantes (`ui/sys/knownacts27.ts:80-81`). — ✅ **corrigida na 31.3 (F)**, commit 64f7f08: nomes de integrantes só com `seen(members)`; diretório de pessoas só de atos conhecidos ou com laço.
3. Idade e origem: o cabeçalho da pessoa mostra sempre (`pages.ts:175,178`), mas o Perfil esconde "Nascimento" e "Formação" atrás de `canSee('bio')` (`pages.ts:251-252`). — ✅ **corrigida na 31.3 (F)**, commit 8e47dde: cabeçalho usa a mesma regra do Perfil (`seen(bio)`) para idade e formação.
4. Fama local × global: `knownLevel` usa a fama **vista do seu país** (`fameAt '@me'`, `fame15.ts:129`), mas `fameText` (`fame15.ts:164`) e `estimate('fame')` (`scouting.ts:56`, exata a partir de 30 de fama **global**) mostram o número global. Um nome famoso no Japão aparece com fama exata no Brasil; o mapa (`mapinfo17.ts:89`) só mostra o degrau com `canSee('fame')` (pub ≥ 2), então um ato "Local" visto na própria cidade dele aparece com "?". — ✅ **corrigida na 31.3 (F)**, commit 64f7f08: fama mostrada = `fameHere31` (vista do seu país) em `fameText` e `estimate('fame')`.
5. Ordenação vaza o valor real: diretório ordena por `a.fame` e `a.momentum` reais (`directory.ts:67,72`), pessoas por `overall` real como desempate (`directory.ts:126`), o mapa pega os 8 maiores por fama real (`mapinfo17.ts:86`). A coluna mostra "?" mas a ordem entrega o ranking. — ✅ **corrigida na 31.3 (F)**, commit 64f7f08, f65ffc0: listas e mapa ordenam por `shownFame31` (oculto = −1) e pelo geral visível.
6. Hype exato de qualquer ato (`ui/sys/dossier13.ts:251`) enquanto momento/fãs ficam escondidos para obscuros. — ✅ **corrigida na 31.3 (F)**, commit b129ee4: hype só com `seen(hype)`.

**Atributos e potencial**
7. Faixas **centradas no valor verdadeiro**: `shown(v,w)` = `v ± w/2` (`pages.ts:114-118`, usado em `personCard` `pages.ts:127`, cabeçalho e `attrsTab` `pages.ts:212-230`, e `ovr` do ato `pages.ts:347`); a persona13 faz o mesmo (`persona13.ts:52`). O ponto médio é o valor exato: a névoa não esconde nada. Já `estimate()` e `est18` aplicam viés (`scouting.ts:62-66`, `ability18.ts:298-305`), o que é o certo. — ✅ **corrigida na 31.3 (F)**, commit c28c06b, e05c145 (onda 0): faixas com desvio em `know.band`; verificado de novo no teste.
8. Duas fontes de conhecimento: a ficha usa `knownLevel.priv` (amizade conta), mas diretório/comparador/talentos23/visão do ato usam `estimate()`, que lê só `s.knowledge` (`scouting.ts:49`). Um amigo (rel ≥ 35) tem atributos visíveis na ficha e "?" na coluna Talento do diretório (`directory.ts:83`) e no comparador (`compare.ts:19-22`). — ✅ **corrigida na 31.3 (F)**, commit c28c06b (onda 0), f6574f4: `estimate` usa o grau privado; a intimidade agora vem do grafo social.
9. Potencial de quem é seu aparece de dois jeitos: `pot ± 6` ou `~pot` real (`pages.ts:159`) e as estrelas de `est18` com viés (`ability18.ts:287,296`). A equipe usa `pa ± 15` centrado (`ab18stars.ts:37-40`). — ✅ **corrigida na 31.3 (F)**, commit e04030d: estrelas de teto da equipe com desvio (`band`), sem `pa ± 15`.
10. Potencial de terceiros na ficha da pessoa aparece já no grau 2 (`vis.skills`), como `pot ± 15` **sem viés** (`pages.ts:159`), contra `NEED.potential = 3` (`fame15.ts:144`), `visibleFields` (≥ 3) e `estimate` (≥ 3 com viés), que a ficha do ato usa (`pages.ts:381,392`). — ✅ **corrigida na 31.3 (F)**, commit c28c06b (onda 0): potencial de terceiros só no grau 3 (`KNOW_FIELDS.potential`).
11. Valor de mercado exato calculado dos valores reais a partir do grau 2 (`pages.ts:177`). — ✅ **corrigida na 31.3 (F)**, commit 8e47dde: valor de mercado só com `seen(value)` (grau 3) e em faixa não centrada.
12. nego27 mostra traços de ganância/ansiedade no grau 2 (`nego27.ts:117`), enquanto o NEED pede grau 4 para traços. — ✅ **corrigida na 31.3 (F)**, commit 6e636ba: traços na mesa só com `see(traits) === exact`; ambição com `seen(ambition)`.
13. Política e religião: a aba Crenças sempre mostra (`ui/sys/people16.ts:150-160,352`), mas o Perfil (`pages.ts:253`), a persona13 (`persona13.ts:54`) e os integrantes (`pages.ts:417` usa `canSee('bio')`, enquanto o Perfil usa `'life'`) escondem. São três regras para o mesmo dado. — ✅ **corrigida na 31.3 (F)**, commit 8e47dde, 59e9e93: política e fé por `seen(beliefs)` no Perfil, integrantes, ficha unificada e aba Crenças.

**Vida privada**
14. Estresse exato (curto, desgaste, risco de quebra, porquês) de **qualquer pessoa**, na aba "Fatos & Obrigações" (`ui/sys/found17.ts:25-37,85,89`). Contradiz a aba Humor, que é só para quem é seu (`pages.ts:191`), e o NEED `mood: priv 4`. — ✅ **corrigida na 31.3 (F)**, commit 4dfa4fb: estresse por `see(stress)`; surto público aparece em rótulo.
15. Saúde/vício só com `priv ≥ 4` (`ui/sys/dossier13.ts:307-309`), mas o próprio jogo emite fato **público** de vício para quem tem fama ≥ 35 (`sim/sys/family29.ts:909`). Um famoso com escândalo de drogas nas manchetes aparece com saúde "?". — ✅ **corrigida na 31.3 (F)**, commit b129ee4: fato público de vício/saúde promove o campo `health` (rótulo).
16. "Royalty que considera justo" (`wantRoyalty`), um dado de negociação privado, aparece só por fama `pub ≥ 2` (`ui/sys/fame15.ts:85`). — ✅ **corrigida na 31.3 (F)**, commit e62693e: "royalty justo" só com `seen(wantRoyalty)` (grau 4 ou convivência).
17. A chance de aceitar a oferta é mostrada como faixa com ruído (`contracts.ts:181-185`), mas o "por quê" do hover entrega o **placar exato** e cada parcela (`sim/sys/why18.ts:116-126`), sem olhar o conhecimento. Isso também entrega o mínimo escondido da nego27, que é uma logística em volta do mesmo placar (`nego27.ts:92-95`). — ✅ **corrigida na 31.3 (F)**, commit 7522455: o porquê da chance mostra direção das parcelas em palavras, sem placar.
18. nego27 lê só `s.knowledge.degree` (`nego27.ts:73-76,115`). Amizade/relação com a banda não melhora a leitura. A "Paciência {p}/100" é exata desde o grau 0 (`nego27.ts:105,217`). — ✅ **corrigida na 31.3 (F)**, commit 6e636ba: `insight27` usa o grau privado (olheiro ou intimidade); paciência em rótulo sem conhecimento.
19. Relações: superstar (`pub ≥ 4`) abre o grafo inteiro com valores numéricos de afinidade e atrito (`pages.ts:192,283-298`). Imprensa sabe de casais e brigas públicas, não de "−37 com o baixista". — ✅ **corrigida na 31.3 (F)**, commit 8e47dde: números de afinidade só com convivência/olheiro; pela imprensa, rótulos das relações fortes.
20. Família: a aba de relações é condicionada (`pages.ts:192`) e o `lifeBlock` também (`dossier13.ts:311`), mas a aba "Família" mostra sempre `familyBlock15 + famSection29` (`ui/sys/people16.ts:344-350`), e o cabeçalho mostra sempre parceiro e "menor + responsável" (`ui/sys/family29.ts:144-150`). Há também a tag ♥/"filho(a) de famoso" no diretório (`directory.ts:145`). Ao mesmo tempo, o sim publica namoro/casamento/nascimento como `rumor` abaixo de certos limiares de fama (`family29.ts:353,397,466`). — ✅ **corrigida na 31.3 (F)**, commit 59e9e93: aba Família e cabeçalho por `see(family)`; o que é público (casamento, filhos) em rótulo.
21. Obrigações entre NPCs: `holdsBlock17` mostra todos os `has/owes` de qualquer pessoa (`found17.ts:58-66`; o filtro da linha 61 só restringe quando `id === 'player'`). Isso inclui `kind: 'secret' | 'blackmail'`, que o próprio holds17 emite como fato `secret` (`sim/holds17.ts:145`). — ✅ **corrigida na 31.3 (F)**, commit 4dfa4fb: obrigações entre NPCs só com `see(holds) === exact`; segredo/chantagem de terceiros nunca.
22. Submundo: Conexões mostra ligações com organizações, rixas e o log de crimes de qualquer pessoa ou ato, sem checar se aquilo é público (`ui/sys/connect29.ts:85-100,112-124`). — ✅ **corrigida na 31.3 (F)**, commit 4dfa4fb: Submundo por `see(crime)` (fatos públicos: prisão, crime, processo), detalhes só do que é seu.
23. A aba Crime (`ui/sys/crimemem23.ts:16-22`) até respeita o nível público (boato/confirmado), mas mesmo no **boato** mostra organização, posto, função e o número de crimes bem-sucedidos. — ✅ **corrigida na 31.3 (F)**, commit 4dfa4fb: no boato só a organização; posto, função, contagem e porquê só confirmado.

**Opinião e finanças**
24. Opinião sobre você: `opinionOf` devolve 0 para quem nunca te encontrou (`sim/sys/persona13.ts:496-504`) e a ficha mostra "0 · Nada marcante entre vocês" (`ui/sys/persona13.ts:80-82`). A ficha também mostra exato o atributo `img` (`persona13.ts:76`), mesmo com `w13 = 99`, e a negociação do representante do ato vem sem névoa (`persona13.ts:117`). Falta o estado "não te conhece". — ✅ **corrigida na 31.3 (F)**, commit b64ece4, 59e9e93: "Não te conhece" / "Conhece de nome" (`knowsMe31`); imagem e negociação do representante em faixa.
25. Selo rival: a dívida aparece sempre (`ui/sys/dossier13.ts:182`); "Avaliação" e "passivos" (que usam caixa, dívida e saldo de recoupment, `sim/business.ts:29-33`) aparecem exatos sem participação (`ui/sys/round8.ts:154`). Há também dois limiares para informação interna: 5% (`bolsa10.ts:234` `INSIGHT_AT`, conselho no pregão) e 25% (`stakes8.ts:54` `BOARD_SEAT`, caixa no dossiê). A bolsa **não vaza potencial** hoje (o alvo usa fama, catálogo, caixa e standing: `business.ts:29-33`, `bolsa10.ts:385-397`), mas também não lê nenhuma camada de conhecimento. — ✅ **corrigida na 31.3 (F)**, commit b129ee4: limiar único `INSIDE31` (5%, bolsa ou compra direta); dívida, caixa e passivos só por dentro (ou dívida cobrada em público).

**Outros vazamentos pontuais** (31.3 · F: todos corrigidos — tv18 e scout23 pela estimativa/burburinho, talent18 por `fameText`, "Conhecido como" com "Só o nome"/"Pela imprensa", editar aparência só do que é seu, clientes de empresariamento contam como seus, `relDeg` pela intimidade do grafo social, comparador com todo conhecido; commits e62693e, 8e47dde, f6574f4)
- `tv18.ts:237`: o "por quê" do programa de TV mostra "Carisma (potencial ÷ 2)" com o valor exato do potencial.
- `scout23.ts:354`: o aviso "rivais podem ter visto" dispara com `a.potential >= 60`, o que denuncia potencial alto.
- `talent18.ts:66,70`: `Math.round(a.fame)★` exato para headliners e "os que escaparam", fora do `fameText`.
- `pages.ts:352`: "Conhecido como: Rumor" para quem tem grau 0 (`DEGREES[max(0,deg-1)]`), inclusive superstars que você conhece pela TV.
- `pages.ts:183`: "Editar aparência" de um NPC com grau 5 (é ferramenta de autor, não conhecimento).
- `knownacts27.ts:216` trata cliente de empresariamento como "seu" (know 3), mas `knownLevel` não (`fame15.ts:124`). Você empresaria o ato e não vê o humor dele.
- `relDeg` (`fame15.ts:111`) usa `|rel|`: inimizade forte conta como intimidade nível 4, o que abre traços, humor e saúde do seu desafeto.
- Comparador (`compare.ts:14`): só seus atos e o radar entram na lista, então não dá para comparar com uma superestrela pública.

## 4. O que é coerente (o alvo)

| Informação | Seu | Famoso nunca visto | Obscuro nunca visto | Olheiro 1 / 2 / 3 (+4/5) | Contato / amigo |
|---|---|---|---|---|---|
| Nome, foto, gênero, cidade, selo | ✓ | ✓ | só se estiver no seu radar, na cena, nas paradas ou num laço; fora disso não aparece | ✓ | ✓ |
| Discografia, paradas, prêmios, certificados | ✓ | ✓ | ✓ quando visível (é registro público) | ✓ | ✓ |
| Fama | ✓ | degrau + número arredondado **do seu país** | "desconhecido" ou degrau | faixa → número | faixa |
| Fãs | ✓ | ordem de grandeza ("~1,2 mi") | ? | ? / ordem de grandeza / número | ordem de grandeza |
| Momento, reputação | ✓ | rótulo (em alta / em queda) | ? | ? / rótulo / número | rótulo |
| Talento, atributos | ✓ | ? (o que a crítica diz, em rótulo) | ? | faixa larga **com viés** → estreita | faixa média com viés (intimidade) |
| Potencial | faixa (verdade é oculta até para você) | ? | ? | ? / ? / faixa com viés | faixa larga só com intimidade alta |
| Personalidade, ambição | ✓ | traços "de imagem pública" (ego, polêmico) | ? | ? / ? / ambição; traços em 4 | traços conforme intimidade |
| Humor, estresse | ✓ | ? (salvo surto público) | ? | só em 4–5 (convivência) | intimidade alta |
| Saúde, vícios | ✓ | o que saiu na imprensa (fatos públicos) | ? | 4–5 | intimidade alta |
| Contrato (modelo, selo, fim aproximado) | ✓ | selo e "até ~ano" (a indústria sabe) | ? | 3: modelo e fim; 4: termos | ✓ termos só com intimidade alta |
| Royalty e adiantamento exatos | ✓ | ? | ? | 4–5 ou fonte (jurídico ou ex-colega) | ? |
| Família | ✓ | o que é público (casamento, filhos famosos, divórcio) | ? | 3+ | ✓ |
| Relações | ✓ | casais e rixas públicas, em rótulo | ? | 4+ em rótulo | o que a pessoa te conta |
| Segredos, crime | ✓ (dossiê próprio) | só fatos públicos ou boatos que chegaram até você | ? | detetive ou fontes (secrets23) | o que te confidenciam |
| Opinião sobre você | ✓ | "não te conhece" ou "conhece de nome", com tom vindo de fatos públicos (você brigou com o selo dele…) | "não te conhece" | idem | valor ou rótulo |
| Opinião sobre outros | — | declarações públicas | ? | — | o que te contam |

## 5. Proposta: camada de conhecimento única (`know30`)

Separar seis eixos que hoje estão misturados em `knownLevel`, e fazer **toda UI** (e qualquer sistema que "estima por você", como bolsa, IA de conselho e explicações `why18`) perguntar a uma API só.

### 5.1 Eixos (para TODO par observador → alvo, não só o jogador)
O grafo social planejado cobre todos os personagens entre si. O observador pode ser `player`, uma pessoa NPC, um selo, a imprensa ou uma organização. Tudo fica esparso: só se guarda o que fugir do padrão.

1. **Reconhecimento público** `pub(obs, alvo)`: derivado, não armazenado. É o degrau de fama do alvo **no mercado do observador** (`fameAt`) mais o "alcance de mídia" da era. Serve para todos.
2. **Contato pessoal** `met(obs, alvo)`: `none | heard | met | worked` + semana do primeiro contato. Novo e esparso. Hoje `rel` ausente vira 0, e é isso que permite exibir "não te conhece".
3. **Intimidade** `intim(obs, alvo)` 0–100: o quanto um conhece a vida do outro. Cresce com convivência (mesma banda, turnê, sessão, família) e decai. **Separada da opinião.**
4. **Opinião** `op(obs, alvo)` −100..+100: é o `p.rel` atual / `p13.op`. Só existe com `met ≥ heard`; sem isso a UI mostra "não te conhece".
5. **Laços** `ties`: parentesco (kin15/family29), contrato, holds17, organização (orglinks29). São fatos com o seu próprio `visibility`.
6. **Conhecimento investigado** `scout(obs, alvo)`: o grau 1–5 com `bias` (o `s.knowledge` atual, e também os olheiros dos selos rivais), mais os segredos da secrets23, que já são por observador.

### 5.2 API única (pura, memorizada por semana)
```
know30(s, obs, alvo) -> { pub, met, intim, op?, scout, mine }
see30(s, obs, alvo, campo) -> 'exact' | 'range' | 'label' | 'hidden'
val30(s, obs, alvo, campo) -> { kind, v?, lo?, hi?, label?, why: L }   // SEMPRE com viés determinístico por (obs, alvo, campo)
```
- Uma tabela única de campos, que substitui `NEED`, `visibleFields`, `fuzz`, `w13`, as faixas de `estimate` e os `KNOW27`. Cada campo declara: classe (público / profissional / privado / íntimo / secreto), qual eixo o revela (pub, scout, intim, fato público) e a forma (exato, faixa, rótulo).
- **Faixas sempre com viés** (o `hu()`/`bias` atual). Nunca `v ± w/2` centrado.
- Fatos públicos (`facts17.visibility = public`, e `rumor` quando chegou ao mercado do observador) **promovem** campos: o vício nas manchetes revela "saúde: dependência (pública)"; o casamento público revela o cônjuge.
- "Seu" = elenco, banda do jogador, **clientes de empresariamento** e equipe. Os campos verdadeiramente ocultos (potencial, mínimo da negociação, segredos que nem você sabe) continuam em faixa.

### 5.3 Consumidores a migrar (ordem sugerida)
1. **Vazamentos graves** (barato, alto impacto): `found17` stress e holds (#14, #21), `connect29` submundo (#22), `why18 offer.chance` (#17), `people16` Crenças e Família (#13, #20), `family29` cabeçalho, `pages.ts:159/177` potencial e valor de mercado (#10, #11), `fame15` royalty justo (#16), `tv18:237`.
2. Trocar `shown(v,w)` e o `sh()` da persona13 por `val30` com viés (#7). `estimate()` vira um adaptador de `val30` e passa a enxergar a intimidade (#8). `nego27.insight27/read27` usam `know30` (#18).
3. Diretório: a lista pública fica limitada ao conhecido (knownacts27 vira o filtro, com a pesquisa global "nos jornais" restrita a atos com fama ≥ local no mercado do observador). Ordenar só pelo valor **mostrado** (#1, #5).
4. Opinião: `opinionOf` devolve `null` quando `met = none`; a UI mostra "Não te conhece" ou "Conhece de nome" (#24).
5. Selos rivais: um campo `fin` com classes (receita pública, dívida "pública se protestada", caixa só com assento) e um limiar único para informação interna (#25).
6. Bolsa e valuation: o preço-alvo dos selos e de qualquer futuro ativo ligado a artistas lê **o que o mercado sabe** (`know30(s, 'market', alvo)`: fama, vendas, paradas, escândalos públicos), nunca `potential` ou `talent` crus. Isso vale também para a IA dos rivais que "apostam" em potencial (`rivalmind18.ts:200`, `media12.ts:210`), que deveria usar os olheiros do rival (`scout('lb:x', alvo)`), coerente com o grafo de todos com todos.

### 5.4 Grafo NPC↔NPC (todos com todos)
- Os mesmos eixos valem entre NPCs: o A&R rival só "descobre" quem os olheiros dele viram; um integrante só sabe do segredo do colega se `intim` for alta ou se o fato chegou a ele; a imprensa é um observador com `scout` alto e foco em famosos.
- Na UI, o jogador vê arestas NPC↔NPC **pelo filtro dele**: a relação X↔Y aparece se for fato público (casal, rixa, parceria creditada), se o jogador tiver intimidade com X ou Y (o amigo te conta) ou se houver investigação (detetive/secrets23). As relações aparecem em rótulo ("amigos", "brigados"), não como número.
- A propagação de conhecimento (boca a boca) é um gancho mensal barato: com chance proporcional à intimidade, o vizinho repassa fatos `rumor`. É o mesmo mecanismo do `knownBy` da secrets23, generalizado.

### 5.5 Testes sugeridos (invariantes)
- Para qualquer alvo não-seu com `scout = 0` e `intim = 0`: nenhum campo privado retorna `exact`, e `potential` retorna `hidden`.
- O ponto médio de uma faixa nunca é o valor verdadeiro com probabilidade 1 (o viés existe).
- Ordenação de lista ≡ ordenação pelo valor exibido.
- Famoso (`pub ≥ 3` no mercado do jogador): discografia, selo, paradas, prêmios e degrau de fama estão sempre visíveis.
- Obscuro sem laço: não aparece em listas globais.
- `opinionOf(nunca encontrou) === null`.

## 6. Estado na 31.3 (F) — regra única aplicada

- Seis eixos para todo par observador → alvo (`src/sim/know.ts`: `axes6`, `know(s, alvo, obs)`): reconhecimento público, contato
  (grafo social `src/sim/social31.ts`), intimidade (grafo social, separada da opinião), opinião (`opinion.ts`), laços e
  investigação (olheiros; selos rivais com `rivalDeg31`). Observadores: jogador, selo rival, `market` (bolsa), `press`, pessoas.
- Tabela única de campos `KNOW_FIELDS` + `see(s, alvo, campo, obs)` → exato / rótulo (fato público) / oculto. `canSee` (fame15)
  passou a ler dela.
- Rivais decidem por `guessPot31` (o que os olheiros deles sabem, ou o burburinho público) — interruptor `know31.rivals`.
- Testes: `tests/r31-know.test.ts` (uma asserção por incoerência) e `tests/r31-social.test.ts`.

