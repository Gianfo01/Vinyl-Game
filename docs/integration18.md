# Rodada 18 APIs — onda 0 (core18)

Quatro registros puros (importáveis de qualquer sistema, sem DOM) que as frentes da rodada 18 usam para textos,
mensagens, dicas e ações. A interface lê tudo sozinha: registrou, apareceu.

| Módulo | Para quê | Interface |
|---|---|---|
| `src/sim/explain18.ts` | **por quê** encadeado de qualquer número (tooltip dentro de tooltip, CK3) | `src/ui/explain18.ts` |
| `src/sim/inbox18.ts` | **Caixa de entrada 2.0** (tipos com categoria/prioridade/"ir para"/resposta) e **Conselheiro v2** | `src/ui/sys/inbox18.ts`, `src/ui/advisor.ts` |
| `src/sim/personact18.ts` | **menu de ações** sobre qualquer pessoa (custo, chance com porquê, efeito) | `src/ui/sys/personact18.ts` |
| `src/sim/sys/dyn18.ts` | **Dinâmica** (hierarquia, grupos, porta-voz, humor, promessas) | `src/ui/sys/dyn18.ts` |

## explain18 — "nenhum número sem origem"

```ts
import { registerExplain } from '../explain18';
registerExplain('radio.spins', (s, c) => ({
  title: l('Execuções na rádio', 'Radio spins'), value: 120, fmt: 'num',
  parts: [
    { label: l('Payola', 'Payola'), value: +40, fmt: 'signed', tone: 'bad', why: { key: 'payola.risk', ctx: { act: c.act } } }, // › abre o próximo nível
    { label: l('Gosto do DJ', 'DJ taste'), value: 1.2, fmt: 'mult' },
  ],
  note: l('Regra/fórmula em uma frase.', 'Rule/formula in one sentence.'),
}));
```
- Formatos: `num | signed | pct | money (centavos) | mult | text`. A função pode devolver `null` (não se aplica); erro vira `null`.
- Na interface, três jeitos: `why18(s, key, ctx, conteúdo)`, `whyIcon(s, key, ctx)` ou atributos
  `h('b', { class: 'why18', 'data-why': key, 'data-why-ctx': JSON.stringify(ctx), tabindex: '0' }, valor)` (delegação global,
  ctx precisa ser JSON). Mouse abre; clique/toque fixa; `›` abre o nível seguinte ao lado; Esc fecha um nível.
- Já registrados: `cash.month` → `cash.cat`, `act.hype`, `act.fame` → `fame.region`, `offer.chance` (termo a termo de
  `evaluateOffer`, que agora devolve `parts`), `chart.pos`, `stress` (usa `shortOf().np`, a soma com números), `show.demand`,
  `balls`, `opinion`, `pa.chance` (chance de qualquer ação de pessoa).
- Ligados na interface: caixa do topo e "último mês" da Mesa, fama/hype/fama no seu país/público em casa no resumo do artista,
  chance da oferta, posição nas paradas (tabela e Mesa), fama por país (fame16), estresse (found17), força local (tour12),
  bolinhas (agenda17), chance de cada ação de pessoa.

## Caixa de entrada 2.0 e Conselheiro v2

```ts
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
registerInboxKind('payola_offer', {
  label: l('Rádio', 'Radio'), cat: 'deals', icon: 'radio', prio: 2,            // cat: decision|people|deals|money|press|world|staff|life|analyst|other
  goto: (s, m) => ({ area: 'media', label: l('Abrir mídia', 'Open media') }),  // ou { act }, { person: 'p:id' | 'l:id' … }, { area, tab: [host, id] }
  handle: (s, m, action, r) => action === 'pay' ? pagar(s, m.ref!.act as string) : l('Recusado.', 'Refused.'),
});
pushInbox18(s, 'payola_offer', { from: 'DJ Joe', subject: l('…', '…'), body: l('…', '…'), ref: { act: id },
  actions: [{ id: 'pay', label: l('Pagar', 'Pay') }, { id: 'no', label: l('Recusar', 'Refuse') }] }); // o ÚLTIMO botão é o padrão ao expirar (weeks, padrão 6)
registerAdvisorTip('radio18', (s) => [{
  id: 'radio-cold', level: 'warn', cat: 'release', score: 65,                  // score maior = mais alto no ranking
  text: l('Seu single sumiu das rádios.', 'Your single vanished from radio.'),
  why: [l('3 semanas sem execução em mercados grandes.', '3 weeks without spins in big markets.')],
  effect: l('Um promotor de rádio: +15% de execuções, −$3k.', 'A radio plugger: +15% spins, −$3k.'),
  goto: { area: 'media' }, run: { label: l('Contratar promotor', 'Hire a plugger'), fn: (s) => contratar(s) },
}]);
```
- `items18(s)` (src/sim/sys/inbox18.ts) devolve a vista tipada (categoria, prioridade 0–3, destino) de mensagens, avisos e
  decisões; `archive18(s, key)`/`isArchived18`; `snoozeTip18(s, id)` adia uma dica.
- Analista embutido (`core18`): fôlego de caixa, lançamento abaixo da previsão, jogadas de rivais no seu gênero, atos livres em
  alta, gênero em alta sem ninguém seu, estresse do elenco, mensagens vencendo. Relatório do analista na caixa todo mês (com
  analista na equipe) ou a cada 3 meses.
- Interface: a área `inbox` (atalho E, dentro do Cockpit) agora tem categorias, "pedem resposta", arquivo, prioridade e "ir
  para"; "Próximos passos" mostra 7 dicas em ranking com porquê, efeito, ação e "adiar" + "ver mais".

## Ações sobre pessoas (item 11)

```ts
import { registerPersonAction } from '../personact18';
registerPersonAction({
  id: 'radio_interview', label: l('Convidar para entrevista na rádio', 'Invite to a radio interview'), group: 'press', // social|career|press|care|love|dark
  icon: 'radio', cooldown: 12, desc: l('…', '…'),
  cost: (s, key) => ({ usd: 500, balls: 1 }),            // usd (dólar real, convertido pela época) | cents | balls (tempo pessoal); shown: só mostra
  visible: (s, key) => key.startsWith('p:'),              // some do menu
  available: (s, key) => null,                            // null = pode; L = motivo do bloqueio (mostrado)
  chance: (s, key) => ({ p: 0.6, why: [l('Base 60%', 'Base 60%')] }), // null = sem sorteio; selfRoll: true se a ação sorteia sozinha
  run: (s, key, r, ok) => ({ ok, text: ok ? l('Topou.', 'Agreed.') : l('Recusou.', 'Declined.') }),     // ui: 'offer' + uiArg abre a proposta
});
```
- Chaves de pessoa: `p:<id>` (artista/integrante/você), `l:` (chefe de selo), `e:` (empresário), `pd:` (produtor), `c:`
  (crítico), `s:` (equipe), outras da persona13. `doPersonAction18(s, id, key)` confere, cobra, sorteia com Rng próprio
  semeado, aplica cooldown e registra (`paLog18`).
- 20 ações (`src/sim/sys/personact18.ts`): telefonar, almoçar/jantar (revela o ato ao A&R), presente, pedir conselho (indica
  um nome livre), pedir desculpas (encerra mágoa), pedir favor (você passa a dever), cobrar favor (holds17), oferecer
  emprego/contrato (artista livre → proposta; profissional → entra na equipe), parceria/feat (bonds9), convidar para
  show/festa (hype se a pessoa é famosa), apresentar a alguém (laço com seu elenco), elogiar/criticar em público (fatos,
  mágoa, estresse, fama), espalhar boato (media17), visitar no hospital, funeral/homenagem, ajuda/clínica (lealdade),
  flertar (love17: namoro ou caso), detetive (acha fato secreto → trunfo), ameaçar, subornar. Crime17 (morte, intimidar,
  chantagear, sabotar/piratear o ato, grampear o selo) aparece no mesmo menu via `crimeOdds`/`commitCrime`.
- Modo **Vida real exata**: ações que inventariam fatos (emprego, boato, flerte, detetive, ameaça, suborno, crimes) ficam
  bloqueadas para pessoas reais (`realKey18`). Nos outros modos, valem para qualquer um.
- Menu em toda página de pessoa (`PERSON_HEAD_EXTRAS`), página única r16 (novo `PAGE16_HEAD`) e no artista ("Ações" por integrante).

## Dinâmica (U1) e popup do artista (item 12)

- `dynBand(s, act)`, `dynRoster(s)`, `dynStaff(s)` → `{ nodes (influência, nível, humor, estresse, promessas, apoia/atrita),
  groups, spokes, tension, notes }`. Área **Artistas › Dinâmica** e aba **Dinâmica** no artista.
- `popcat17`: novas categorias **Integrantes** (members, lineup16, dyn18) e **Música** (disco, songs, releases, era8, retro,
  story12, records13); Carreira fica com a trajetória. Aba sem categoria continua em "Mais".

## Usabilidade (base, `src/ui/quick18.ts`)
`emptyState18(o quê, por quê, ação?)`, `pager18(chave, itens, tamanho)` (lista longa → "mostrar mais/tudo"; usado no
catálogo), `confirm18(...)` (só para o irreversível), `actQuick18(s, act)` (hype com porquê, alerta de estresse, página,
elogiar o líder, dinâmica — na lista do elenco).

## dm18 (onda 1) — qualquer um contra qualquer um, rixas e o Mestre

| Módulo | Para quê |
|---|---|
| `src/sim/sys/feud18.ts` | **rixas** entre dois atos quaisquer: farpas → diss → guerra de faixas → confronto → briga → tiros (`startFeud18`, `heatFeud18`, `tryCool18` mediação/trégua/feat, `cool18` chance com porquê). `shield18(s, id)`/`altHist18(s)`: no modo exato gente real é protegida; nos outros, história alternativa. |
| `src/sim/sys/agency18.ts` | **iniciativa de NPCs** (e dos seus artistas) contra qualquer chave persona13: `registerVerb18` (elogio, diss, boato, aliciar, processar, chantagear, expor, intimidar, sabotar, pazes, favor, caso), `choose18`/`act18`, `grudge18`/`relOf18`/`adjRel18`. Contra você → Caixa 2.0 (`agency18`, `feud18`). Ações novas no menu de pessoa: encomendar diss, mediar rixa, instigar contra rival. |
| `src/sim/sys/verbs18.ts` | **motivos, não calendário** (r18b): `onFact('*')` → `pushMotive18(A,T,motivo,…)` (mágoa, gratidão, ambição, inveja, afeto; decaimento mensal; aniversários). Age quem passa do limiar (`th18`: impulsivo antes; clímax do Mestre baixa) — calculista espera o `moment18` (mesma cidade/selo, rixa, alvo fragilizado); cooldown por par e por ator; cada linha do diário guarda `why`. 41 verbos com `tone` (15 bons, 11 neutros, 15 ruins); `ask` = proposta (contra você vira carta aceitar/negociar/recusar/ignorar; entre NPCs o alvo decide). Dinheiro por `pay18` (livro-caixa para você; caixa do ato/selo para NPCs). |
| `src/sim/sys/dm18.ts` | **o Mestre**: curva de tensão (calmaria → tensão → clímax → resolução) que mexe no orçamento de situações, na escalada das rixas e na iniciativa dos NPCs; ganchos (`onFact('*')`) que voltam como lembrança; fios de campanha com estágios (`registerThread18`: segredo, mágoa, rival em ascensão, ascensão e queda, a conta chega, nêmesis, rixa, legado, sua jornada) e arcos de NPC (ascensão, queda, redenção, vingança). Respostas pela Caixa (`dm18`). |
| `src/sim/sys/dmsits18.ts` | **32 situações combináveis** (8 motivos × 4 complicações, cenário por época) via `registerSituation`. |
| `src/ui/sys/dm18.ts` | área **Mundo › Diário do Mestre** e aba **Rixas** no ato. |

Regra de história (r18): `crime17` só bloqueia assassinato de gente real no modo "Vida real exata"; `crimenpc17` idem para as rixas de rua.
## ability18 — habilidade atual e potencial (CA/PA, estilo FM)
- `src/sim/sys/ability18.ts`: `ability18(s, key)` → CA (0–200, soma ponderada pela função) e PA verdadeiros de qualquer
  chave (`p:`, `player`, `s:`, `e:`, `pd:`, `l:`, `c:`, `m:`); `est18(s, key)` → o que o jogador sabe (faixas com incerteza
  por conhecimento fame15 × olho do A&R, relatório de olheiro); `actEst18`/`prospect18` (atos, bot, rivais).
- Artistas: as habilidades (`p.skills`) crescem dentro do teto (idade por atributo, estrada/estúdio pelos ganchos
  `show`/`record`/`compose`, aulas `train18`, mentor `mentor18`, personalidade) e caem por idade/saúde/estresse; `p.potential`
  vira o teto efetivo (PA × alcance da personalidade ÷ 2). Atos de NPC em rodízio trimestral.
- Quem não é artista: ajuste fechado (idade + experiência `ab18(s).x[key]`) aplicado aos atributos persona13 via `POST13`.
- Consumidores: `registerDimAdj18('ability18')` (técnica), `showRevenue`, `registerOfferMod('ability18')` (promessa custa mais).
- Interface: `src/ui/ab18stars.ts` (`stars18`, `personStars18`, `abilityCell18`, `staffStars18` — sem efeitos colaterais) e
  `src/ui/sys/ability18.ts` (aba Desenvolvimento, cabeçalhos, bloco no artista). Explicações: `ability.ca`, `ability.pa`.

## rights18 (onda 1, frente A — D1–D4, feedback #10)

| Módulo | Para quê |
|---|---|
| `src/data/rights18.ts` | sociedades reais por mercado/época (taxa, defasagem, caixa preta; execução/mecânico/conexos), conexos por país, 14 precedentes com data real e efeitos |
| `src/sim/sys/rights18.ts` | estado `s.x4.rights18`; `pubRoute18` (edição do selo por mercado × modalidade, com taxa, caixa preta, caução e prazo — chamado em `market.ts`); conexos mensais; caixa preta (expira em 3 anos; `claimBB18`); splits/cadastro (`record`/`launch`), disputas de crédito (`openDispute18`, caução, inbox `rights18`); autorizações (sample, cover fora dos EUA, sync de obra alheia); regravações (`rr`, mod `chartUnits`); rescisão de 35 anos (EUA, 1978+); subeditoras; administração de catálogos; `catVal18` (avaliação de catálogo); `precMul18`/`precAdd18` (lidos em `business.ts`) |
| `src/ui/sys/rights18.ts` | área **Empresa › Direitos** (10 abas) |

- Bloqueio de usos: `USE_BLOCK18.fn` (em `rights.ts`) — `exploitBlock` e `sync15.candidates` respeitam disputas/autorizações.
- "Metadados limpos" (`dg_meta`) agora é a vantagem `metadata` (menos caixa preta, conflitos e atraso), não vendas.
- Explicações: `rights18.meta`, `rights18.rate` ({mk, mod}), `rights18.cat` ({rels}). Fatos: `credit_dispute`, `audit`, `case_ruling`, `termination`, `deal` (regravação).

## supply18 (onda 1, frente B) — cadeia física, acordos e relatório de mercado

| Módulo | Para quê |
|---|---|
| `src/sim/sys/supply18.ts` | **P1**: 9 fábricas por época (`PLANTS18`: capacidade, defeitos, preço, frete, fábrica de major), fila por material e ano (`baseQueue18`: vinil 8→22 semanas em 2019–21, choque do petróleo, febre disco, CD novo), carga e cliente (`queueOf18`, `clientFactor18`), reserva automática de cada lançamento programado (`book18`, por material; 4 semanas de crédito), atraso → política (`late`: perguntar / decidir / adiar / prioridade / lançar) ou Caixa (`supply_late`); esbarrão de pedido de superestrela em época de aperto; no lançamento o material atrasado vira pedido futuro (estoque zerado até lá = venda perdida) + Fato. Variantes de vinil (2014+), contrato de capacidade (take-or-pay), armazém (custo/mês), devoluções (frete; 1979–80 "shipped gold, returned platinum"), ponta de estoque/destruição (`cutOut18`). Distribuidor (`DISTS18`: própria / rede independente com reserva de 20% e risco de quebra / P&D com major: adiantamento em financiamento, mínimo de lançamentos e cobrança) e agregador (`AGGS18`: %, assinatura com derrubada por fraude, pitching). Quebras de redes de varejo (1980, 2006, 2009, 2013) baixam recebíveis. `botSupply18` no playbot. |
| `src/sim/sys/deals18.ts` | **D5**: contrato de desenvolvimento (`startDev18`: opção 12/24 meses, mesada, veto a rivais via `SIGN_VETO`, exercer/estender/liberar pela Caixa `deal_dev`), selo-vaidade (`startImprint18`: estrela indica talentos, +4% de apelo, 15% da receita para ela), JV de gênero com major (`startJv18`: aporte = financiamento, +15% de vendas no gênero, 30% da receita para a major, compra em 5 anos). Pacotes `services` e `pd` em `PKG18` (modelo distribuição). |
| `src/sim/sys/report18.ts` | **U10**: relatório trimestral (mensal com analista): formatos por país (`mix18`), gêneros subindo/caindo, concorrência nas paradas, varejo, filas, adiantamento médio dos rivais; Caixa `market18`, porquês `market.mix`/`market.adv`, dica de gênero sem elenco. |
| `src/ui/sys/supply18.ts` | área **Cadeia física & acordos** (Empresa): Prensagem, Distribuição, Estoque, Acordos, Mercado. |

Ganchos em arquivos compartilhados: `market.distributionFee` soma `s.flags.distFeeAdj18`; `econ18.postSalesAR18` usa `s.flags.distLag18`/`distRes18`; `Pkg18` ganhou `model`/`fee`. Porquês: `supply.queue`, `supply.fee`, `deal.dev`.

## media18 (onda 1) — marketing, streaming, rádio, clipes, viral e pistas

| Módulo | Para quê |
|---|---|
| `src/sim/media18hook.ts` | ganchos puros que `market.ts` chama (`eff`, `term`, `fterm`, `payout`, `fans`); desligados = fórmulas antigas. |
| `src/sim/sys/mkt18.ts` | **canais com limites**: `CH18` (público, conversão, ingressos, atraso, gancho), saturação por artista e do selo + aprendizado da equipe (`satOf18`), `profile18`/`term18` (calor com atraso e vídeo curto que não sustenta álbum fraco), atenção sem consumo → fama, campanha que vende ingresso (mod `cityDemand`), `addChannel18` (clipe/rollout entram como canal), `rankChannels18`. **Pós-morte** por lançamento: `postMortem18(s, relId)` → `{ fc, u10, ch: [{ id, en, e, conv, exp, act }], att, tix, L, R, fans, notes }` (previsto × realizado por canal, para o long18). |
| `src/sim/sys/stream18.ts` | **fontes de descoberta** por lançamento (`mixOf18`, `RET18`), ouvintes/voltam/seguidores por artista (`a18`, `funnel18`), estratégia pico × base (`setStrat18`), **pró-rata** por território/assinantes/perfil de ouvinte (`payout18`, explicação `stream.payout`), dependência de playlist (queda), reativação de catálogo, pitch editorial (`pitchPlaylist18`), impulso algorítmico, comissão de alcance (`setDm18`, 2019+), fazenda de streams (`buyStreams18`: derrubada, multa, escândalo, lista negra) e denúncia de rival (Caixa). |
| `src/sim/sys/radio18.ts` | **rádio por formato** (`FMT18`), consultores (`CONS18`: Drake-Chenault e Burkhart/Abrams reais; demais fictícios), estações e diretores (`ensureStations18`, `lunchPd18`), `pitchRadio18(s, rel, fmt, 'self'|'plug'|'indie', edit)` → adição/rotação leve-média-pesada; promotor independente registra "quem pagou" e pode vazar (fato público, escândalo, calor do jabá). |
| `src/sim/sys/media18.ts` | **clipes** (`makeVideo18`: orçamento, diretor autoral/estúdio/estreante, coreografia, versão censurada, banimento, rotação pesada 1981–2008, carreira de diretor), **viral/catálogo** (decisão na Caixa: impulsionar/remix oficial/derrubar/deixar), **DJs/remix** (`commissionRemix18`, `togglePool18`, `remixContest18`, parada de clubes, DJ que vira estrela). |
| `src/sim/botmedia18.ts` | playbot usa tudo isso (nunca compra streams falsos). |

Fatos novos: `playlist`, `stream_fraud`, `payola`, `video_banned`, `viral`, `club_chart`, `remix_contest`, `career`. Interface: abas em Mídia (`src/ui/sys/media18.ts`).
## regions18 (onda 2, frente F — feedback #11, R1–R3)
| Módulo | Para quê |
|---|---|
| `src/data/regions18/*` | submercados por região com dados por época (`asia.ts`: Japão, Coreia, Grande China, Sudeste Asiático, Índia, Oriente Médio; `americas.ts`; `afeu.ts`): peso, poder de compra, idiomas, gosto, plataformas (Melon, LINE Music, JioSaavn, Boomplay, Anghami, Palco MP3, Sua Música…), parceiros, barreiras (censura, cotas, vistos, aprovação, pirataria), custo de entrada; `flows.ts`: viradas históricas, diásporas e circuitos (R3) |
| `src/sim/sys/regions18.ts` | `MarketId` não muda (paradas/relevance17/reach17/fame16 e saves intactos). Mod `appeal` = média dos submercados ÷ conta antiga (neutro em média); mod `cityDemand` (vistos, diáspora, circuitos). Afinidades `perm` (viradas; sorteadas fora do modo exato) e `dyn` (seus top 10 no exterior, virais, cenas, feats; decaem). `localize18` (licenciado/escritório), `version18` (versão no idioma local), `collab18` (feat com astro local). Explicações `regions18.sub`, `regions18.fit`; inbox `regions18`; dica do conselheiro |
| `src/sim/sys/circuits18.ts` | rodeios, São João, bailes funk, gospel BR/CCM, marketers de Alaba (venda do master), Lagos corporativo, playback de Bollywood, sound systems/dub plates, perreo, palenques, teatro de idols |
| `src/sim/sys/kpop18.ts` | trainees, audição, debut direto/sobrevivência (fraude de voto), contratos 13 anos → KFTC 2009 (7 anos) → regra 2017, processo de "contrato escravo", maldição dos 7 anos, vitórias semanais/sajaegi, fandom com várias versões, serviço militar |
| `src/sim/sys/idols18.ts` | aperto de mão/eleição (Oricon; metade após 2018), segurança, graduação, Kōhaku, enka |
| `src/ui/sys/regions18.ts` | área **Mundo › Mercados** (Regiões, Submercado, Circuitos, K-pop, Japão e idols, Afinidades) |
## long18 (onda 2) — interface e ritmo, várias formas de vencer (feedback #14/#15, U4–U9, U11, U12)

| Módulo | Para quê |
|---|---|
| `src/sim/sys/review18.ts` | **post-mortem** de cada lançamento seu 12 semanas depois: alcance (unidades × previsão guardada), retorno (semanas 7–12 × curva normal), conversão em fãs (× histórico do ato), campanha (verba × eficácia), crítica, dimensões de qualidade (quality18) e dinheiro → frase + fatores com tom (`rv18(s).pm`, `buildPM18`). Fato `release_review`, Caixa `review18`, explicação `review18.reach`. Quando media18/live18 entrarem, trocar retorno/conversão pelos dados deles em `buildPM18`. |
| `src/sim/sys/policy18.ts` | **delegação por políticas**: teto por gasto, reserva mínima (meses de custo fixo), descanso obrigatório (estresse/cansaço e shows por trimestre), renovação delegada (jurídico/empresário/A&R; bônus máx., prazo, confiança mínima), objetivo por artista (crescer/lucro/descansar/catálogo/sem política). Portões `D16_GATES`/`D16_PAY` no deleg16; exceções → Caixa `policy18` ("liberar uma vez"). Tudo desligado por padrão. |
| `src/sim/sys/paths18.ts` | **caminhos de vitória** (indie sustentável, major comercial, catálogo, artista com autonomia, festival, estúdio, empresário, selo cult, rede ao vivo): 4 KPIs com meta, 3 marcos (35/65/90), final próprio, `legacy18`; escolha/detecção e até 3 metas ativas (marco de meta ativa vale 1,5×). **Doutrinas** em 5 pares exclusivos (perks com retorno decrescente; travam ações via `registerPAGate18` e `registerOfferMod`; uma por semestre; revogar após 1 ano) que destravam **decisões do selo** (sazonais, com requisito/custo/prazo) junto com as de `intrigue.ts`. Conquistas narrativas ("primeiro disco de ouro do selo — X de Y"). |
| `src/sim/sys/saga18.ts` | **Ano em revista** (dezembro, cena `long18year`, cartão copiável), **biografia viva** (`bio18(s, 'player'|actId)`), **Casa/dinastia** (mandato por geração, prestígio herdado → perk, pontuação ao passar o selo; lê `heirs8.lineage`), **dificuldade adaptativa** opcional (`setAdapt18`; perk visível com porquê), **três perguntas do Cockpit** (`cockpit18`: decidir agora / funciona-falha / ameaças, incluindo fase e tensão do dm18 — sem duplicar a curva). |
| `src/ui/sys/long18.ts` | seção no Cockpit e área **Selo › Rumo do selo** (Caminhos, Doutrinas e decisões, Políticas, Post-mortems, Ano em revista, Biografia, Casa e dinastia, Dificuldade). |

U12: auditoria (script de rascunho) das 86 situações — 5 opções dominantes (só ganho) ganharam custo visível: show pago na cidade natal (+estresse), controle criativo parcial (mágoa leve), abraçar pirataria (vendas perdidas), abraçar playlists (repasse menor), dividir crédito (ressentimento). Estratégias longas: `docs/strategies18.md`.

## tutorial18 (final) — ajuda, tours, dicas, trilhas e glossário
- `src/ui/help18.ts`: `registerHelp18(areaId, { title, what, how, tips, links, gloss })`; abas: `registerHelp18('tab:<chave data-tabs>|*:<id>', …)` (atalhos `H`/`T`). Conteúdo em `help18data.ts` (páginas) e `help18tabs.ts` (abas e fichas `tab:act:`/`tab:person:`/`tab:label:`). **Página ou aba nova → registre a ajuda** (o teste `r18-tutorial` lê `registerArea`/`registerTab`/`registerPageTab` do código e falha sem ela).
- `src/ui/gloss18.ts` (glossário pesquisável, também no Ctrl+K), `src/ui/tracks18.ts` (trilhas por carreira e dicas de 1ª vez: só leem `s.x4`, sem RNG), `src/ui/tutorial18.ts` (botão "?" no cabeçalho, tour da 1ª visita, dicas via `onFact('*')` + Caixa 2.0, página **Você › Ajuda e tutorial** `tut18`, opções nas Configurações). Progresso em `store.prefs.tut18`.

## campus18 — Nosso mundo (Empresa › Sede e equipe, 1ª página)
- `src/sim/sys/campus18.ts`: `buildings18(s)` deriva TODOS os prédios do estado real (sede/hq6/filiais, ventures9, venues17, casa de shows e festivais de live, escola18, ala-museu relics18, fábricas, escritórios `own` de regions18, banda da casa, imprints/JVs, subselos, casa do dono) — sistema novo com algo "possuível" → acrescente um `add({...})` ali (id estável, `lvl` 1..6, `goto` para a página de gestão). Estilo = `styleOf18(ano de construção/reforma)`; estados planned/building/open/renovating/damaged/closed/sold.
- Obras próprias (loja, letreiro, casa dos artistas, praça dos fãs, reforma): `startProj18(s, kind, lote, empreiteiro, alvo?)` — capex (`post(..., 'capex')`), atrasos/estouros com Rng próprio → inbox18 `campus18` (hora extra) + facts17. Fogo (`onFact('disaster')` com ato seu) danifica a sede/estúdio até a reforma. Retrato anual compacto em `s.x4.campus18.snaps` (máx. 170).
- UI: `src/ui/sys/campus18.ts` + `src/ui/pixel/campus18px.ts` (canvas 300×226, anima só visível); `campusThumb18(s)` substitui a sede em pixel art no Cockpit.

## decide18 — consequências agora × depois, Cockpit vivo, Caixa com fios, ligações entre sistemas
| Módulo | Para quê |
|---|---|
| `src/sim/decide18.ts` | registro puro: `registerConseq18('ev:<evento>:<opção>' \| 'ib:<tipo k18>:<resposta>' \| 'pa:<ação>:ok\|fail', { now, later: [{ in: [mín,máx meses], p, tone, hint (sem spoiler), when?, fx(f: Fx18) → manchete, miss? }], odds?, gate?, unlock? })`; `Fx18` (cash/mood/trust/fame/fans/rep com linhas legíveis), `fuzzy18`, `unlocked18`. |
| `src/sim/sys/decide18.ts` | estado `dec18` (fila de ecos, fios, desbloqueios, pulso do mês), ouvintes (`registerDecisionListener` agora recebe `ctx`; `MSG_AFTER18` em people/inbox; `PA_AFTER18` em personact18), disparo mensal (máx. 3, Rng próprio, Fato `echo`, Caixa `echo18` no fio `ref.thr`), portão `DEC_GATE18` (opção travada vira a padrão), prazos `ctx.dl18` (vencem na semana), `pending18`, `odds18`, porquês `dec18.pending`/`dec18.odds`. |
| `src/sim/sys/echoes18.ts` | 57 opções de eventos antigos + 6 ações de pessoa com ecos; `follow18(f, eventoId)` abre a etapa seguinte como cartão. |
| `src/sim/sys/decnew18.ts` | 10 decisões novas (show relâmpago ⏱+aposta, promessa do disco solo em 2 etapas, mentira ao jornalista, dobrar tiragem %, mentor 🔒A&R, trégua 🔒relação/negociação, show beneficente 🔓, van em etapas, demo quente ⏱%, jantar 🔒carisma/gestão). |
| `src/sim/sys/links18.ts` | 17 ligações (`LINKS18`, porquê `link18` {id}, registro `links18Log`): campus→equipe/elenco, direitos→sync (`SYNC_FIT18`), escritórios→pistas, facções→notícia, potencial→salário, doutrinas→opiniões, cadeia/colecionadores/recessão/foto→merch, censura→rádio, fio do Mestre→coletiva, rixa→paradas, separação→canções, mágoa→shows, prêmio/mágoa→propostas, museu→reputação. |
| `src/ui/sys/decide18.ts`, `home18.ts`, `links18.ts` | prévias nos cartões (`decOptBody18`, `decTimer18`), "Consequências pendentes", voz/retrato do remetente; Cockpit vivo (`home18`) e resumo do mês (`AFTER_ADVANCE` em registry, chamado por app.ts); seção "Ligações do mês". |
## cine18 — storyboards de cenas e carreiras póstumas
- `src/sim/sys/cine18.ts` (puro): **camada de composição** `Board18 = quadros (Frame18: local-base + atores com estado + objetos + efeitos + plateia {n, humor, cartazes} + legenda + encaixe de decisão)`. Leitores de estado com o porquê: `outfitOf18` (figurino do tapete vermelho `chooseFit18` ou imagem do ato), `injured18`, `heat18` (escândalo → protesto/imprensa), `crowd18` (fans18: lealdade/cansaço), `stage18` (kit da turnê live18 + casa própria campus18), `lineup18` (lineup16), `weather18`, idade no avatar (age17). Construtores: `awardBoard18` (tapete, indicados com retrato, apresentador, envelope, vencedor + reações pelos traços, subida, discurso com o balão do tema escolhido no scene17, festa; prêmio póstumo com herdeiro/holograma) e `momentBoard18` (number1, signing, soldout, premiere, verdict, funeral, musicshow, festival, hall, hologram, avatar, ghost, tribute). `logShot18` grava na Cinemateca; fatos do barramento alimentam o álbum (maiores abrem cena `cine18`, ≤2/mês). **Momento novo → acrescente um `case` em `momentBoard18` e um `onFact` que chame `big18`/`logShot18`.**
- `src/ui/pixel/cine18.ts`: `boardView18(s, board, { slot, rebuild })` (canvas 256×144, balões/indicados em HTML, envelope animado, holograma com tremulação e linhas de varredura, pular/pausar, movimento reduzido). Cutscenes `awards`, `number1`, `hall`, `hologram`, `farewell` passam a ser storyboards (ui/sys/cine18.ts); `VIEW17_X`/`ALBUM17_X` em ui/sys/scene17.ts (cenas do scene17 viram storyboard; Cinemateca no Álbum de cenas).
- `src/sim/sys/post18.ts`: espólios (`estate18`: herdeiros com postura, união, desejo do artista, legado, disputas/mediação) e projetos `start18` (tributo, caixa, remaster, cofre via neural.ts, cinebiografia, Pepper's ghost <2012, holograma 2012+, turnê 2018+, avatares 2022+ também vivos, IA 2023+) com `ask18`/`back18`/`forecast18`/`tech18` explicados. Exato: reais bloqueados e `REAL18` vira crônica na data; demais modos: rivais fazem hologramas/filmes (história alternativa). UI: Lendas › Legado póstumo (`post18`).
