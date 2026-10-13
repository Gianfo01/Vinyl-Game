# R29 — Oferta a um integrante específico

Pedido do autor: *"permita tentar contratar não só a banda, mas integrantes específicos da banda, seja oferecendo uma
carreira solo, integrar em uma banda existente, dentre outras"*.

Antes só dava para assinar o ato inteiro. Agora dá para abordar **uma pessoa** de qualquer banda (banda livre, banda de
NPC ou banda de selo rival) e oferecer uma de várias coisas. Cada opção usa um mecanismo que **já existia**. Não há
contrato paralelo: a carreira solo é assinada pela proposta de sempre (docs/act27.md, um caminho só).

Arquivos:
- motor: `src/sim/sys/member29.ts` (puro, determinístico), registrado em `src/sim/sys/index.ts`;
- interface: `src/ui/sys/member29.ts`, com o item e o submenu em `src/ui/ps/ctx27model.ts` e a execução em `src/ui/ps/ctx27.ts`;
- testes: `tests/r29-member-offer.test.ts`;
- capturas: `docs/shots29member/` (script `scripts/shots29member.mjs`).

## Onde fica

**Clique direito numa pessoa** (ou toque longo, ou Shift+F10) → seção **Carreira e contrato** → **"Oferecer a {nome}… ›"**.
O item abre um submenu com as opções. Cada opção mostra:
- a chance (%);
- o custo (luvas, rescisão, cachê, salário);
- uma nota curta;
- ou, quando está desabilitada, o motivo.

A **ficha da pessoa** tem o mesmo item no painel "Ações com esta pessoa". O painel e o clique direito usam o mesmo modelo
(`ctxMenu27` + `menuSections27`); o botão da ficha abre o mesmo submenu, ancorado no botão.

Motivos de bloqueio comuns (`memberBlock29`):
- a pessoa faleceu;
- é você;
- já está no seu elenco ou na sua equipe;
- não está numa banda (para artista solo, use "Fazer proposta");
- já há uma proposta em andamento para ela;
- recusou há pouco (espera de 8 a 13 semanas);
- falta caixa (`cashWhy20`).

Cada opção também tem bloqueios próprios:
- habilidade baixa para o cargo;
- sede sem vaga para equipe;
- a banda já tem alguém nessa função (use "Substituir");
- a banda já tem 6 integrantes;
- nenhuma música sua pronta para um feat;
- o selo rival não libera artistas para você (rivalidade);
- jogando como artista, as opções de selo ficam bloqueadas.

## As opções

| Opção | Mecanismo de sempre | A pessoa sai da banda? |
|---|---|---|
| **Carreira solo no seu selo…** | o ato solo nasce como a carreira solo paralela (`dynasty.soloActFrom29`, a mesma montagem de `startSoloCareer`), sem dono; é assinado pela **tela da oferta** (mesa de negociação r27 ou "Resolver rápido: proposta única" → `makeOffer` → `acceptOffer`) | sim, ao assinar |
| **Entrar em {sua banda} / Substituir {x} em {sua banda}** | `lineup16.joinBand` (a mesma entrada de formação do mundo), saída pela `departNpc16`; o substituído sai por `leaveBand16` | sim |
| **Trabalhar no selo como Produtor / A&R** | vira membro da equipe (`s.player.staff`), com habilidade de produção ou de negócios ≥ 50 | sim |
| **Músico(a) de sessão para {ato} (6 meses)** | `session19.hireAce19` (ás avulso de banda, com crédito na capa; melhora uma dimensão do disco) | não |
| **Projeto paralelo com {líder} ({ato})** | `bonds9.formBond('super')`, com a liberação do feats8 (`bondCost`) | não |
| **Compor em segredo para {ato} (ghostwriter)** | `writers19.hireGhost19` com a pessoa escolhida (o rancor cresce com os hits) | não |
| **Participação (feat) de {banda} num lançamento seu…** | abre o feat negociado de sempre (`round8.openFeatModal`), com a banda como convidada | não |

O feat de sempre trabalha com o ato (a banda) da pessoa, não com a pessoa sozinha.

### Carreira solo: como funciona sem contrato paralelo

1. A opção cria um **solo-proposta**: um ato solo sem dono, com a pessoa (como na carreira solo paralela, ela continua na
   banda enquanto a proposta corre).
2. A interface abre a **tela da oferta de sempre** (`openOffer`): a mesa r27 ou, no caminho rápido, a proposta única.
3. A chance de aceitar é a de `evaluateOffer` mais os fatores da pessoa. Um gancho `registerOfferMod('member29')` só vale
   para o solo-proposta; a mesa mostra a linha "Deixar {banda}: …" com os três fatores mais fortes. A chance mostrada no
   menu (`soloChance29`) é a da proposta padrão na mesma curva de `evaluateOffer` (meio em 0,58); o teste confere que ela
   bate com a da mesa.
4. Ao fechar a mesa ou a proposta, `settleMember29` decide o desfecho:
   - **assinou com você**: a pessoa sai da banda pela saída do lineup16 (`departNpc16`: `exitMember20`, ex-integrante em
     `rw.former`, substituto do mercado de músicos livres ou gerado, segue menor ou acaba). O solo leva fama e parte dos
     fãs, como a opção "Manter sob contrato em carreira solo" do lineup16;
   - **um rival cobriu e levou** (a mesa r27 tem disputa): a pessoa sai do mesmo jeito, mas assina com o rival, e você
     recebe o aviso;
   - **sem acordo**: o solo-proposta some. A pessoa fica na banda, a banda perde 3 de confiança em você (soube da
     sondagem) e há 8 semanas de espera.

   Se a proposta ficar pendente ("pensando", contraproposta), o gancho semanal conclui ou desfaz sozinho, com prazo de 8
   semanas. Se o solo-proposta já tiver obra quando for desfeito, ele vira um solo encerrado, para nada ficar órfão.

## A chance (fatores da pessoa)

Os fatores entram em **pontos do placar de `evaluateOffer`**; 0,1 vale cerca de ±20 pontos percentuais perto do meio. Nas
outras opções, a mesma soma passa por uma curva logística a partir de uma base própria. O "porquê" de cada chance lista
cada fator.

- **Pressão para sair**: a mesma `pressure16` que faz NPCs deixarem bandas (relação ruim com o líder, ressentimento,
  ambição solo de quem é a frente da banda, rixa de família, dependência).
- **Relação com a banda**: a média de `rel` com os colegas. Relação boa segura; briga com o líder empurra para fora.
- **Ressentimento** e **moral** baixa empurram para fora.
- **Sucesso da banda**: banda famosa segura; banda pequena empurra. Ter **fama própria maior que a da banda** empurra.
- **Fatia de cada um**: mais integrantes significa uma fatia menor, então empurra.
- **Lealdade** (traço `loyal`) segura.
- Só na carreira solo: **sonha com a carreira solo** (`goal === 'solo'`, +0,12), **ambição de fama**, **é a voz/rosto da banda**.
- Na troca de banda:
  - fama da sua banda × fama da banda atual;
  - mesmo universo musical;
  - sua reputação com artistas.
- Na sessão:
  - opinião sobre você;
  - ambição de dinheiro ou segurança;
  - banda ocupada;
  - cansaço.
- No projeto paralelo:
  - admiração pelo seu ato (`bonds9.admiration`);
  - diferença de fama;
  - ambição artística;
  - reputação com artistas.
- Na equipe: idade, talento para o cargo, ambição de estabilidade.
- No ghostwriter:
  - ambição de dinheiro;
  - ressentimento na banda;
  - fama própria (esconder o nome custa);
  - talento de composição.
- Selo rival: **rescisão paga** (+0,02) ou **aliciamento** (−0,07, medo de processo).

## Selo rival: rescisão ou aliciamento

Quando a banda tem contrato com um selo rival (`buyout29`), o valor da rescisão é calculado assim:

- adiantamento esperado da banda ÷ número de integrantes;
- × (0,6 + fração do contrato que falta);
- \+ US$ 1.500 (em dinheiro da época).

| Caminho | Custo | Consequência |
|---|---|---|
| **Pagar a rescisão** (carreira solo, troca de banda, equipe) | a rescisão vai ao caixa do selo rival | mágoa pequena (`grudge27` +6, com lembrança datada) |
| **Aliciar sem pagar** (só carreira solo) | nada | chance menor; mágoa grande (`grudge27` +18); rivalidade +10 (`s.rivalries`); chance de **processo por contrato** (`business.fileLawsuit`, tipo `contract`, valor 1,5× a rescisão). A chance de processo é 35% + 20% se o selo for vingativo (+10% se orgulhoso) − jurídico/400, entre 10% e 80% |

Sessão e projeto paralelo com integrante de selo rival pagam a **liberação** do feats8 (`clearance`). Se a rivalidade
passar de 60, o selo não libera, e o item aparece desabilitado com esse motivo.

## A banda que fica

- A saída vai pela `departNpc16` do lineup16:
  - memória `member_quits` com a pessoa (`pid`), ex-integrante;
  - substituto do mercado de músicos livres (mesma família de gênero e função) ou gerado (`replaceMember`), ou a banda
    segue menor;
  - se quem saiu era a frente e sobrou só um, há 50% de chance de **acabar** (memória `split`).
- Reação:
  - moral dos que ficam −8;
  - confiança da banda em você −10;
  - momento −5;
  - se foi um rival quem levou o solo, a reação é mais leve: moral −4, confiança −4, momento −2;
  - relação de cada colega com quem saiu −8 (`leaveBand16`).
- No modo "Vida real exata", interferir marca a banda como história alterada (`h15alt:`), como contratar ou roubar um
  artista (history15).

## Fatos, memórias e cenas

- Memórias:
  - `member_quits` e `lineup`/`split` na banda;
  - `solo` ou, quando veio de selo rival, **`poach`**, que dispara a cena r29 **"steal"** (você levando o artista de outro);
  - `supergroup` e `session_hire`;
  - `hire` na equipe.
- A entrada numa banda sua grava `lineup` com "entra" ou "assume o lugar" no seu ato, o que dispara a cena r29 **"join"**.
  Se uma banda **sua** acabar, a cena é **"split"**.
- Fatos no barramento (`emitFact`), com a pessoa, o ato e você como atores, para o Diário, o "O que sabemos" e as
  manchetes: `member_solo`, `member_join`, `hire`, `rival_grudge`, `session_credit`/`hire` do session19.
- Avisos: na hora (toast com o desfecho, chance e motivo) e `notify` quando um rival leva o solo; processo pelo
  `fileLawsuit`, que também grava memória e aviso.
- Conexões (R29 connect29): a fonte canônica pessoa ↔ ato vê o novo solo como atual e a banda antiga como passagem
  encerrada. A página da banda lista a pessoa em **Ex-integrantes**. O teste confere `careerActs29` × `exMembers29`.

## Determinismo

Todo sorteio usa `Rng.fromSeed(semente|member29v1|parte|semana|n)`, em que `n` é um contador por ação guardado no
estado. Isso vale para a aceitação, a reação da banda (a `departNpc16` recebe esse gerador), o supergrupo (`formBond`
ganhou um `r` opcional; sem ele, o comportamento antigo) e o processo.

- O teste confere que o fluxo compartilhado (`s.rng`) não muda e que a mesma semente com as mesmas ações dá o mesmo
  resultado.
- O gancho semanal não sorteia nada.
- O bot (`playbot16`) não usa a oferta a integrante. Os testes de referência continuam iguais (r27-p2a, r27-p2b, r27-m2;
  também r27-ctx, r29-connect, r29-fixes, r16-lineups e r27-lineup).

## Mudanças em arquivos existentes

Todas são aditivas, e o comportamento antigo ficou igual:

- `sim/dynasty.ts`: `soloActFrom29`, a montagem do ato solo extraída de `startSoloCareer`, com mesmo consumo de RNG e
  mesmos campos;
- `sim/sys/lineup16.ts`: `joinBand` exportada;
- `sim/sys/bonds9.ts`: `formBond(..., { r })` opcional;
- `sim/sys/session19.ts`:
  - `FREE19`, o ás avulso de banda, contratável só pela oferta a integrante (fica fora do mercado de ases);
  - campo `fam` para a afinidade de gênero;
- `sim/sys/writers19.ts`: `hireGhost19(..., pid?)`;
- `ui/act27/negotiate27.ts` e `ui/ficha.ts`: ao fechar a mesa ou a proposta única, `settleMember29`;
- `ui/ps/ctx27model.ts` e `ui/ps/ctx27.ts`:
  - item `person.offer29`;
  - submenu `mo29:<pessoa>`;
  - itens `mo.*`.

## Capturas (`docs/shots29member/`)

1. `00-ficha-da-banda`: a banda de selo rival.
2. `01-clique-direito-oferecer`: clique direito no integrante; "Oferecer a {nome}… ›" em Carreira e contrato.
3. `02-submenu-oferecer`: o submenu com:
   - solo com rescisão ou aliciamento;
   - substituir na sua banda;
   - produtor e A&R;
   - sessão, projeto paralelo e ghostwriter;
   - feat desabilitado com o motivo.
4. `03-mesa-do-solo` e `04-mesa-resultado`: a mesa r27 de sempre, com contrato assinado.
5. `05-aviso-saida-da-banda`: o aviso "{p} deixa {banda} e começa carreira solo com {selo}. Rescisão de $X paga a {rival}".
6. `06-banda-com-ex-integrante`: a página da banda, com a pessoa em Ex-integrantes.
7. `07-submenu-entrar-na-sua-banda` e `08-resultado-entrar`: a troca de banda (na captura, uma recusa com a chance).
8. `09-ficha-acoes-oferecer` e `09b-ficha-submenu`: o mesmo item no painel "Ações" da ficha.
9. `09c-ficha-ja-e-seu`: o item desabilitado com o motivo, para quem acabou de entrar no seu elenco (ou ainda habilitado,
   se a troca foi recusada).
10. `10-submenu-celular-390`: a folha inferior no celular.

A partida rápida sorteia o mundo, então os nomes mudam de uma captura para outra.

## Limites conhecidos

- **Aliciar sem pagar** só existe para a carreira solo. Troca de banda e equipe com integrante de selo rival sempre
  incluem a rescisão.
- O ás de sessão avulso é contratado sempre **com crédito** na capa (sem a variante barata sem crédito).
- A participação (feat) é do ato da pessoa (a banda), como no feats8. Não existe feat de uma pessoa sem a banda.
- Projeto paralelo: o supergrupo nasce sem contrato, como no bonds9. A interface abre a proposta para ele logo depois.
- O bot não usa a oferta a integrante.
