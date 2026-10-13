# Submundo: ligações, famílias e "contratar a família" (rodada 29)

O autor fez três pedidos:

1. "acho que as ligações dos crimes com personagens não refletem: em uma menciona Frank Sinatra, mas em membros ele
   não aparece";
2. "acho que devemos ter mais opções de interações (com possíveis consequências) com as organizações criminais";
3. "em coisas do submundo (até selecionando com botão direito) devemos ter opções de contratar tal família (com
   consequências e nos fazendo dever favor...)".

## 1. Ligações pessoa ↔ organização: uma fonte só

**Causa raiz.** Cada vista lia um pedaço diferente:

- **Card da organização.** Os laços documentados de `ORGS17.ties` eram só texto por nome ("Frank Sinatra (1960): …")
  e não apontavam para a pessoa do mundo. "Membros conhecidos" lia só o `crimemem23` e "Andam com eles" só o
  `crime17.ties`.
- **Ficha da pessoa.** O bloco Conexões › Submundo mostrava só o laço de rua do ato e o registro de crimes. Não
  aparecia laço documentado, filiação nem dívida.
- **Menu e busca.** Nada.

**Agora.** `src/sim/sys/orglinks29.ts` (`orgLinks29` / `linksOfKey29`) junta tudo:

- os laços documentados, ligados à pessoa pelo nome canônico (artista `p:`, empresário `e:`, produtor `pd:`, líder
  `l:`);
- as filiações do `crimemem23`;
- os atos associados (`crime17.ties`);
- os favores, dívidas, segredos e mágoas do `holds17`;
- a sociedade com o jogador.

Cada ligação tem um rótulo: **ligação documentada**, **membro**, **associado**, **deve favor**, **a família deve a
ele(a)**, **inimizade** ou **sócio(a)**.

As vistas que leem dessa fonte:

- o card da organização (Ligações);
- a ficha do artista (Conexões › Submundo);
- a ficha da indústria (aba Submundo, para Morris Levy, Suge Knight…);
- o menu de ações ("{família}: {tipo} ›");
- a busca (Ctrl+K acha as famílias).

**História.** Segue a mesma regra da crônica `DOC17`. No modo "Vida real exata", valem todos os laços documentados
até o ano atual. Nos modos livres, valem só os anteriores ao início da partida; depois disso a história é simulada
(filiações, laços de rua, favores).

**Auditoria.** `audit29` ganhou o código **R10**: uma ligação que aparece num lado e não no outro, ou o laço
documentado de alguém que existe no mundo mas não está ligado. O resultado é 0 nas sementes e épocas do teste
(1960 exato; 1965, 1975, 1992 e 2006 livres; e 1975 depois de meses simulados com favores).

## 2. Famílias: interações com consequência

Tudo está em `src/sim/sys/mob29.ts`. Cada família tem um **medidor visível** com respeito, medo, dívida e hostilidade.

| Interação | Custo e chance | Consequências |
|---|---|---|
| Aproximar-se | jantar e presente | relação +15, respeito, calor +3 |
| Negociar proteção (pagar pizzo) | taxa mensal | respeito, medo, calor; shows sem depredação |
| Recusar / parar de pagar proteção | — | hostilidade +20, mágoa; ~30% de show depredado por mês durante 6 meses |
| Pedir empréstimo | agiota (vices + shark27) ligado à família | dívida (holds17) e segredo; atrasar traz visita |
| Lavar dinheiro pelo seu selo | — | renda mensal, calor, segredo provado, caso de crime organizado |
| Show na boate deles | cachê com 30% para a casa; chance de não ter batida | embalo; batida = multa, calor, estresse e cena de batida |
| Jukebox / jabá da família | taxa; risco de exposição | +35% nas paradas por 6 semanas; favor devido; exposto = memória "payola" (cena), reputação e caso |
| Proteção de artista | taxa mensal | crimes contra o ato −25%; favor devido |
| Virar sócio | precisa de respeito 50 e relação 30 | renda mensal, sem pizzo, calor, segredo, risco de RICO; sair = hostilidade e mágoa |
| Quitar a dívida | proporcional ao favor | zera os favores e os pedidos; respeito +, hostilidade − |
| Delatar à polícia | — | caso contra eles e reputação; hostilidade +50, medo +25 e vingança |

Os efeitos da época e da região:

- Lei Seca: boates com bônus.
- Anos 1950–79: a era das boates e jukeboxes, com o maior bônus de boate. As jukeboxes acabam depois de 1985 e o
  jabá vira playlist depois de 2005.
- Cartéis nos anos 1980–90.
- Era digital.
- A família só age no próprio país, a menos que tenha poder 85+ (alcance internacional).

## 3. Contratar a família

Os serviços são os crimes de sempre, executados pela organização (`commitCrime` com ator `o:<família>`):

- intimidar ("convencer" um rival, um devedor ou um jornalista);
- cobrar com um segredo;
- sabotar;
- fazer um problema sumir (polícia, testemunha ou juiz);
- pressionar rádio e DJs;
- rodar uma pirataria;
- grampear;
- roubar uma relíquia;
- encomendar uma morte.

Comparado a fazer você mesmo, a família traz:

- mais chance: +8% e a cobertura da organização;
- menos calor para você: 35% do calor; se o serviço vier a público, há 45% de chance de a polícia ligá-lo a você;
- uma taxa;
- um **FAVOR DEVIDO**: uma obrigação no `holds17` (fonte `mob29`) com data de cobrança.

**Cobrança.** Quando chega a data, a família faz um pedido com prazo de 4 semanas, que aparece na caixa de entrada,
no Cockpit e no card. Ela pode pedir para você:

- assinar o afilhado dela;
- escalar um artista seu na boate;
- lavar dinheiro;
- esconder alguém;
- dar uma parte de um lançamento;
- votar como ela quer.

**Cumprir** quita o favor e sobe a confiança. **Recusar**, ou deixar o prazo vencer, mantém a dívida e a família
escala:

1. ameaça;
2. sabotagem do disco;
3. intimidação do líder;
4. incêndio no estúdio.

Com respeito alto, a família também oferece trabalho: dinheiro e calor, e a partir daí ela fica devendo a você.

**Um caminho só** (docs/act27.md). O card da organização, o submenu do clique direito e o planejador do Submundo
chamam as mesmas funções: `doMob29`, `hire29`/`hireOdds29` e `fulfill29`/`refuse29`.

- **Menu da organização:** os pedidos, "Contratar a família para… ›" (abre o planejador com a família como
  executora) e as interações.
- **Menu de uma pessoa, um ato ou um selo:** "Contratar {família} para… ›", com as 3 famílias da área. O submenu traz
  os serviços que cabem naquele alvo, com chance, custo, taxa, calor e o favor devido.
- **Planejador:** o executor pode ser "Contratar {família} (a família executa)".

Os bloqueios sempre mostram o motivo:

- a família não existe na época;
- organização real no modo exato;
- fora da área;
- calor 70+;
- hostilidade alta;
- alvo morto ou inválido (`targetBlock17`);
- caixa.

## Determinismo

- Os sorteios usam `Rng.fromSeed` com a chave `mob29`.
- O estado (`x4.mob29`) só nasce na primeira interação do jogador, e o gancho mensal não faz nada sem ele.
- Os ganchos de chance (proteção de artista) e de pizzo (sócio) também só agem com esse estado.
- Nenhum tipo novo de fato ou fonte de apelo: as cenas são as de sempre (`arrest` → batida; memória `payola` → jabá).
- Os testes de referência `r27-p2a`, `r27-p2b` e `r27-m2` passam sem nenhuma remedição.

## Testes e capturas

`tests/r29-underworld.test.ts` cobre:

- Sinatra × Outfit e Morris Levy × Genovese nos dois lados;
- a regra de história;
- R10 = 0;
- cada interação, com custo, chance, consequência ou motivo;
- o favor devido e a cobrança dele;
- a escalada;
- os menus (organização, pessoa, ato, selo e o submenu);
- época, região e calor;
- o determinismo e o mundo sem interação, que fica igual.

As capturas estão em `docs/shots29submundo/` e são geradas por `node scripts/shots29submundo.mjs`, com o servidor em
`npx vite --port 5330`.
