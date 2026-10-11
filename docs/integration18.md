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

## R19 infra19 — rng por sistema, matriz de fatos, volume de fatos, teto de appeal, streaming
- **Rng por sistema (0.1)** `src/sim/rng19.ts`: `rng19(s, chave, legado)` devolve o fluxo sfc32 próprio da chave (estado em `s.x4.rng19.st`, semeado por `seed|rng19|chave`) quando `s.rngVersion >= 19` (jogos novos; `createGame` grava 19); save antigo (sem `rngVersion`) recebe o legado (o `Rng` comum ou a função `() => Rng.fromSeed(...)`) e mantém a história. Chaves em uso em `STREAMS19`: `events` (storyteller), `decide` (resolveDecision), `director`, `market` (ruído semanal), `launch` (sorte do apelo), `dm18`, `sit17`, `ag18`, `disc18`. **Sistema novo que sorteia: use `rng19(s, 'minhachave', r)` e acrescente a chave em `STREAMS19`.**
- **Fatos `chart` só em marcos (11.1)** `facts17.ts`: `chartClass19(f)` (n1w nº 1 mundial · n1c nº 1 num país · viral · trend · top10x top 10 fora de casa); por protagonista e mês só o 1º de cada classe entra no anel, os seguintes somam em `data.more` e em `facts17(s).agg['chart:ano-mês']`. Anel: poda por cota de tipo (`FACT_KIND_QUOTA = 90`, gravidade < 70), depois pequeno e velho, depois o mais fraco (protege as últimas 8 semanas).
- **Matriz Fato → consumidores (0.2)** `src/sim/factmatrix19.ts`: `factMatrix19(emitidos, leitores, crônica)` → linhas `{kind, listeners, wildcard, readers, chron, why}`; `WILDCARD19` (ouvintes `'*'` e os tipos que tratam), `WHITELIST19` (tipos sem consumidor, com motivo), `RESERVED19` (43 tipos dos 13 sistemas da Frente 9 com consumidores previstos — **use esses nomes** ao criar tribute19, session19, writers19, remix19, revival19, adsync19, score19, charity19, schools19, zines19, fakes19, contests19, gear19). `factListeners19()` em facts17 lista quem ouve. O teste `tests/r19-infra.test.ts` falha se um tipo emitido ficar sem consumidor nem exceção, se a exceção ficar velha, ou se um reservado for emitido sem entrar na matriz.
- **Ouvintes novos** `src/sim/sys/factlink19.ts`: `relic` (leilão → legado +2 e herdeiros guardiões × vendedores perdem união; roubo une a família; manchete), `situation` (elenco ajusta opinião ±2; pública e grave → manchete), `rise` (momento +3; grande → manchete), `masterwork` (fama +2, reputação artística +2 se for seu, manchete), `hologram` (legado do espólio; se o artista "nunca quis" → união −8 e herdeiros na justiça 6 meses), `echo` (pessoa afetada ±3 de opinião / confiança do ato ±2), mesa de imprensa para `payola`/`stream_fraud`/`label_sold`/`boycott` públicos, `viral` → momento. `headline19(s, texto, importância)` põe manchete no jornal do mês (press9, sem duplicar, ≤5/mês).
- **Teto de appeal por família (0.4)** `caps18.ts`: `APPEAL_CAT19` classifica as 63 fontes de `registerMod('appeal')` em 5 famílias (obra, imagem, público/cena, alcance, mundo); `applyMods` multiplica os bônus de cada família (até ×1,6 por fonte) e aplica `catAdj19` (joelho +20%, folga +30%) antes do teto geral; a autópsia mostra "Mesma causa repetida". **Fonte nova de appeal: acrescente o id numa família** (o teste falha sem isso). `globalThis.__mod19 = {}` coleta razão média/máxima por fonte.
- **Streaming (0.5)**: verificado — sem dupla contagem. `market.ts` usa `MEDIA18.payout ?? streamPayout`: `payout18` (stream18) já parte de `STREAM_PAYOUT17` e **substitui** a tarifa fixa; a base entra uma vez (teste). Observação: com 'streaming' entre os formatos digitais, o fator também incide sobre downloads (subcontagem leve, não dupla).
- **Cobertura da Caixa (11.9)**: `tests/r19-infra.test.ts` roda bots curtos por era × carreira e exige que todo `registerInboxKind` apareça ou esteja em `INBOX_RARE19` (motivo).
## R19 calendar19 / notify19 / blocks19 (Frente 8: P1, P2, P9; 11.3, 11.12, 11.15)

**Calendário único de prazos** — `src/sim/calendar19.ts` (puro) + provedores em `src/sim/sys/calendar19.ts`.
- `registerDeadline(id, (s, from, to) => Deadline19[])` — todo sistema com data registra um provedor. `Deadline19 = { id, w, w0?, kind, t, d?, tone?, goto?, act? }`:
  `w` = semana absoluta do prazo; `w0` = início de janela (ecos: nunca mostrar a semana exata); `kind` ∈ `decision|echo|msg|contract|clause|money|release|supply|tour|festival|build|court|award|other`;
  `act: true` = pede ação do jogador (conta para "semana apertada", badge e coluna "Hoje"). Prefixe `id` com o nome do provedor.
- `noteDeadline19(s, d)` / `dropDeadline19(s, id)` — prazo avulso guardado no save (para quem não tem estado de data próprio).
- Leitura: `calendar19(s, { weeks?, from?, kinds? })` (ordenado por semana, depois risco), `crunch19(s, weeks, n)` (semanas com n+ prazos de ação),
  `weekOfMonth19(s, y, m)`, `nextMonthWeek19(s, m)`.
- Provedores já ligados: decide18 (`ctx.dl18`, janelas de `pending18`), Caixa (mensagens com ações que vencem), contratos do selo (fim/opção, promessas,
  `clauses18.minRel`, prestação de contas pelo `stmt`/`lag`), artist18 (ofertas, fim do contrato, prestações, sentenças), lançamentos e fila da fábrica
  (supply18 `book.ready` e contrato de capacidade), turnês (`s.tours`) e festivais próprios, obras (campus18), tribunal (crime17 `dl`), empréstimos, prêmios.
- Fato `crunch` (secreto, ator `player`) no mês com semana apertada → ouvinte soma estresse ao dono. Dica do Conselheiro `cal19`. Explicação `cal19.week` ({w}).
- UI: `calStrip19(s, weeks=6)` (ui/sys/calendar19.ts) é a faixa do Cockpit (substitui a antiga linha do tempo do home18); área `calendar19` (grupo Selo).

**Orçamento de notificações e boletim semanal** — `src/sim/sys/notify19.ts`.
- `pushInbox18` passa por `INBOX_ROUTE19.f` (src/sim/inbox18.ts). Mensagens SEM ações vão para o item único `bulletin19` da semana quando:
  o tipo está em `BULLETIN19` (review18, market18, analyst, traj18, a18_stmt, tv18_third, regions18) ou a categoria
  estourou `BUDGET19[cat]` no mês. Nunca vão: mensagens com ações, `prio ≥ 2` ou `tone: 'bad'`. Tipo novo barulhento? Adicione ao `BULLETIN19`.
- O retorno de `pushInbox18` para um item roteado é o próprio boletim (não guarde `m.id` de mensagens sem ação).
- Contadores: `ib19(s).ind/bul` e `ib19(s).y[ano] = [individuais, linhas de boletim]`.
- Ofertas de selo ao artista (artist18 `scout`): no máximo 3 abertas, 1 por selo, 1 nova por mês; reoferta do mesmo selo só com fama +5 ou hit novo.

**Carta perdida e pulso (11.15)** — `follow18` (echoes18) com mesa cheia (6+) chama `FOLLOW19.f` → `follow19(s, eventId, ctx, weeks=4)`: mensagem
`follow19` ("Carta na fila") com prazo no calendário; "Pôr na mesa agora" emite o cartão; o padrão ("Deixar valer o padrão") emite e resolve com a opção padrão.
Explicações: `pulse19` ({k: cash|fans|mood|hits}; parte de caixa liga em `cash.month`) e `fact19.chain` ({f: factId} → `causeChain`). Os ▲▼ do pulso usam `why18`.

**Blocos do Cockpit (11.12)** — `src/ui/blocks19.ts`. `registerSection` aceita `weight` (número ou função), `when` e `title`; `sectionList(host, s)` em registry.ts.
`homeBlocks18(s)` + `deskBlocks19(s)` → `pick19(s, blocks, 6)` abre os ~6 de maior peso; o resto vai para a faixa "Mais (n)". Preferências
(`c` recolhido, `h` escondido, `o` fixado) ficam no save em `x4.ui19.c`. Topo fixo `head19View(s)` (ui/sys/cockpit19.ts): Hoje / Ameaças / Andamento
(saga18 `cockpit18` + calendário); a seção antiga `long18-3q` foi escondida da Mesa.
## R19 WP0 — base de dados (cidades, gêneros, países, more19)
- `src/data/world19.ts`: `C19` (94 cidades novas com `a3`; `City.a3`/`City.w` opcionais), `G19` (61 gêneros com cidades-cena e afinidade por submercado), `NAMES19`/`MKT19`/`SUB19` (ilhas fora do atlas, mercado e submercado). Ligados em `world.ts` (CITIES/GENRES + cenas), `geo.ts` (`countryOfCity` lê `City.a3`; `countryName`; `marketOfCountry`) e `regions18/index.ts` (a3 dos submercados + gosto de base dos gêneros novos). Novos `NameGroup`: ro, bg, hr, ka, hy, lt, et, my, km, si, sq (people.ts).
- `src/data/countries19.ts`: `COUNTRY_INFO19` (94 fichas) anexadas a `COUNTRY_INFO` (128 países). `charts7.weekCharts` foi reescrito sem objeto por (lançamento, país) para caber no orçamento (mesma ordem/empates).
- `src/data/more19/`: vagas `wp_a…wp_j` (`PACK: Pack19`) e `index.ts` (`ARTISTS19`, `PRODS19`, `MGRS19`, `LABELS19`, `EXECS19`, `VENUES19`, `STUDIOS19`, `GEAR19`, `FESTS19`, `AWARDS19`, `CHARTS19`, `SOCS19`, `MILESTONES19`, `FORERUNNERS19`, `norm19`) com ganchos append-only nos módulos de dados. Formato: docs/db19.md "## Formato more19". Validador: `tests/r19-data-base.test.ts`.
- `worldgen.spawnProceduralAct` pondera cidades por `City.w`; `culture.seedClubs` não abre clube com gênero do futuro.
## R19 fachadas — fandom19, rivals19, awards19 (Frente 0.6)
Toda mecânica nova da R19 lê e escreve fãs, rivais e prêmios **pelas fachadas**; os módulos antigos continuam exportando o que
exportavam (as fachadas re-exportam os mesmos nomes = aliases). Leituras das fachadas **nunca criam estado** (não chamam
`fandomOf`/`fan18(..., true)`/`mind18`/`archetypeOf` no selo real), então ler não muda o jogo.

**Fonte única por número**
| número | fonte | ler/escrever |
|---|---|---|
| fãs (casual/ativo/núcleo) | `act.fans` | `fanTotal19`, `fanCount19`, `scaleFans19` (primitivas `fanTotal`/`scaleFans` em fandom.ts; `decide18` Fx18.fans e `pulseNow18` já usam) |
| fãs por região (mercado) | derivado de `fame16.fameIn` × tamanho do mercado | `fansByRegion19(s, actId)` (soma = total; sem estado) |
| superfãs, haters, toxicidade, nome, ritual | `s.fandoms` (fandom.ts) | `fandomView19`; para escrever `fandomRec19` (= `fandomOf`) |
| lealdade, mobilização, cansaço, motivações, facções | fans18 | `loyalty19`, `mobilization19`, `fatigue19`, `motivation19`, `fanState19` (só guardado), `mobilize19` (= `setTeam18`) |
| eventos de fã | diários fans18 + fan15 + fatos | `fanEvents19(s, actId?, n)` |
| calor da rivalidade | `s.rivalries[selo]` | `heat19`, `addHeat19(s, lb, d, max?)`, `coolHeat19` (primitivas `heatOf`/`addHeat`/`coolHeat` em util.ts; rivals12 e scenes/awards migrados), `heatBand19`, `HEAT_BAND19` |
| tensão do distribuidor | rivals12 `Deal12.ten` | `tension19` (= `rivals12.tension`) |
| selos/atos rivais, intenções | rivals2 + rivals8 + rivals12 + rivalmind18 | `rivalLabels19({min,limit})`, `rivalActs19(lb?)`, `rivalView19`, `intents19` (alvo, pacto, sinais e leitura, últimas jogadas, disputas abertas, parceria) |
| vencedores | livro `s.awards` (escrito só por `recordAward` em util.ts: legacy/Gramófonos, awards2, charts7) + NPC nacionais `ch7.awards` + Hall | `winners19({year,mine,actId,src})` → `Win19 {src: gramo/regional/industry/national/hall, posthumous}`, `recordAward19` |
| cerimônias / indicados | ceremonies8, rockhall9, awards2, charts7 | `ceremonies19` (calendário do ano, nada do futuro), `nominations19(cat \| 'hall')` |
| júri e memória do júri | awards18 `voters18`, awards15 `juryRng`/`juryMemHook`, aw18 `makeup`, fadiga no livro | `jury19(s, a3?)`, `juryMemory19(s, actId, a3?)` → `{k, makeup, fatigue, why}` |
| póstumo | `persons.alive/died` | `isPosthumous19`, `posthumousWins19` |
| cerimônia do envelope (cine18) | cartão `awards` | `ceremonyOfCutscene19` (o gancho de cine18 e `awOfCs18` — agora alias — usam) |

Nomes que colidiam ganharam sufixo: `answerGramoPerform19` (ceremonies8) × `answerHallPerform19` (rockhall9), `hallLobby19`.
Consumidores migrados: cine18 (`crowd18` → `fanState19`; cerimônia → `ceremonyOfCutscene19`), decide18 (Fx18.fans, pulso),
UI deep15, panels/people, panels/discovery, sys/rivals12, sys/crime17, sys/intrigue, sys/hubs8, sys/rockhall9, sys/live18.

**Fatos das fachadas** (`src/sim/sys/facades19.ts`, último import de sim/sys/index; varredor mensal sem sorteio). São
**fatos-índice**: `emitIndexFact(s, fi)` (novo em facts17, aditivo) chama os ouvintes `onFact` normalmente (inclusive '*') mas
guarda num anel próprio (`facts17.ix`, ids `x…`, teto 150) — não ocupa o anel principal nem a numeração `f…`, então nenhum
sorteio/leitura existente muda (lote balanced 6 sementes × 5 anos idêntico ao de antes, bit a bit). Ler com `indexFacts(s, filtro)`
(mesmo filtro de `recentFacts`). Gravidade 12 e sem cidade: não viram boato nem motivo de NPC; o fato canônico de cada sistema
continua o mesmo. Lista com produtor e ouvintes em `FACTS19` (para a matriz da Frente 0.2):
- `fan_wave` (base do jogador +15%/mês com ≥1.500 fãs, ou mobilização ≥60) / `fan_drop` (−15%) → ouvintes `fandom19:wave`/`fandom19:drop` (linha no diário de fãs, `f19.waves`).
- `rivalry_flare` (calor cruza 50 ou 75, sem repetir até esfriar) / `rivalry_cool` (de ≥50 para <20) → `rivals19:flare`/`rivals19:cool` (relatório de rivais, `f19.flares`).
- `award_win` (entrada nova no livro) → `awards19:jury` (memória de vitórias do júri: `juryLedger19`); `award_posthumous` → `awards19:posthumous` (`f19.post`).
## R19 balance19 — bot realista por padrão e bots adversários (frentes 0.3 e 11.4)
- `src/sim/balance19.ts` (puro): `runBot19({ bot, start, seed, years })` → `Row19` (quebra, caixa e patrimônio em US$ 2020, fama, prestígio, nº 1, escândalos, mortes, ecos, crimes); `playBot19` devolve também o estado. Perfis `BASE19` (balanced/cautious/aggressive/artist = playbot16) e `ADV19` (spam, loans, flip, signall, catalog, crime). `summarize19` (p25/mediana/p75) e `exploit19(adv, balanced)` (≥2× e +US$ 50 mil de patrimônio sem quebrar mais). Contagem de histórias por `onFact('*')` com WeakMap por partida.
- `tools/balance19.ts` (`npm run balance`): fila em processos filhos (um por núcleo), sementes em rodízio pelos inícios 1889/1955/1975/2005 (`--grid` cruza tudo), tabela compacta e lista de EXPLOITS. `tools/headless.ts` usa `simulatePlayer` por padrão (`--bot simple` para o espantalho).
- Correções de exploit: `crime17.glut19/glutN19` (mesmo crime repetido em 12 meses rende 1/(1+0,25n), com linha no "por quê" das chances) e `loot19` (condenação confisca 60% do produto do crime); `sale17.relIncome` (disco com menos de 2 anos conta pela metade) e `rosterTerm19` (elenco vale pelo contrato restante). Detalhes e tabela em `docs/balance19.md`.
## R19 tribute19 / revival19 — tributos e covers; sucesso tardio (Frente 9.1 e 9.5)
- `src/sim/sys/tribute19.ts` (rng `tribute19`): tipos `TK19` por era (baile 1889+, orquestral/jazz 1920+, paródia 1950+, tributo-espetáculo 1964+, imitador e "ex-integrantes de X" 1970+, canal de covers 2006+, voz de IA 2020+) e circuitos `CIRC19` (bailes BR/latam, pubs EU, teatros, Las Vegas 1956+, cassinos, Japão 1966+, cruzeiros 1975+, redes 2006+). Nascimento mensal por fama + lealdade (fans18) + ausência (`absent19`: separação, morte, hiato, voz morta) ou faísca de revival; `birth19(s, r, act, k?)` cria pessoas de verdade (`makePerson`, CA via ability18) com um sósia vocal (`sa`, `sim` %). `demand19` (porquê `trib19.demand`) lê fama, ausência, lealdade, circuito, qualidade, holograma do post18 (×0,6), reunião (×0,55), revival (×1,4), residência, bênção. Decisões: selo `license19`/`sue19`(porquê `trib19.odds`)/`sign19` (álbum-tributo vira `Release` kind `tribute` do jogador → valor de venda do sale17); artista `approve19`/`soundalike19`; promotor/casa `residency19` (30% do bruto) e `festival19` (1/ano); músico `covers19` (renda rápida × rótulo de banda cover). Licença: `post(... 'licensing')` mensal + `r18(s).inc[ano].tribute19`; renovação anual pela Caixa (`trib19_renew`) e no calendário (provedor `tribute19`: licença e sentença). NPC: licencia/processa/ignora pelos traços; modo exato não processa nem troca a voz de reais (`histLocked`). Catálogo do original: `catalogLift19` (vendas + ouvintes do stream18). Fatos: `tribute_born` (ouvintes rights18/press/fans18), `tribute_licensed` (rights18), `tribute_sued` (holds17 rancor, manchete; sentença emite `case_ruling`), `soundalike_hired` (live18 química, fans18 facções + haters do fandom = **fãs divididos** `t19.split`, cine18 `logShot18` 'tribute'), `fake_farewell` (manchete, lealdade, scandal17 se for na sua casa); `revival_hit` → faísca de tributos. Documentário (`documentary19`) 1–2 anos após o sósia: fato `release` com tag `documentary`.
- `src/sim/sys/revival19.ts` (rng `revival19`): calor por faixa antiga (10+ anos) com `stage19(s, relId, k)` — `RK19`: comercial de rádio 1925+, filme 1930+, comercial de TV 1950+, série 1955+, documentário, remix 1975+, game 1985+, vídeo curto 2016+, viral, sync; esfria 15%/mês; ≥60 → `revival_hit` (8 meses de vendas decrescentes, fãs de outra geração em `act.fans`, fama). Gatilhos externos: `viral`/`remix_contest`/`club_chart` (media18), `release` com tag `screen18` (needle drop) ou `documentary` (tribute19) e os reservados `remix_hit`/`ad_sync`/`needle_drop` (remix19/adsync19/score19 da onda 3 — basta emitir com `data.rel`). Decisão (`rev19_dec`, `decide19`): relançar ×1,5, remasterizar ×1,3, turnê de volta (reunião → tributos perdem público e o sósia pode ser contratado), licenciar mais (sync agora, puristas −), espólio (post18 `start18` tributo/holograma) ou deixar quieto (artista vivo perde confiança). `lateCert19` (mesmos patamares das paradas) → `late_cert`; receita entra em `rel.revenue` → múltiplo de catálogo do `valuation17`. Fatos e ouvintes: `revival_hit` (press9, espólio post18, fans18), `late_cert` (manchete, fama, reputação comercial), `catalog_rerelease` (hype da faixa, manchete). Porquês `rev19.heat`, `rev19.units`; provedor de calendário `revival19`.
- UI: área `tribute19` "Tributos e covers" (grupo Música) com abas Tributos / Sucesso tardio / Sua banda / Histórico; ajuda `H('tribute19')`. Teste: `tests/r19-tribute.test.ts` (cadeias 1 e 2 forçadas passo a passo).
## R19 session19 / writers19 (Frente 9.2 e 9.3)
**Músicos de estúdio como mercado** — `src/sim/sys/session19.ts` (estado `x4.ses19`, Rng `rng19(s,'ses19')`).
- Coletivos: os reais do `agenda17.CREWS` (+ `andantes`, vocal de apoio da Motown, empurrado no CREWS) com ases documentados (`REAL19`: Hal Blaine, Carol Kaye, James Jamerson…; nomes reais só com `realNames`), a banda da casa do `session18` como coletivo `house`, e fictícios `FICT19` só fora do modo exato. `collectives19(s, onlyNow)`, `market19`, `collName19`.
- `Ace19 {crew, inst, sk, pid?, hits, unc, cred, grudge, fame, plays, hire?, sued?, star?}`. `hireAce19(s, ace, act, credit)` (6 meses, custo `recording`; vira pessoa → CA do ability18 cresce com `growPerson('instr')`), `backCredit19` (crédito retroativo, `royalties`). Reservas do coletivo pelo `bookCrew` (agenda17) também contam: os ases tocam nas faixas do ato.
- quality18: `registerDimAdj18('session19')` — cada ás soma na dimensão do instrumento (`INST19`: bateria→imm, baixo→dur, guitarra→tech, teclado/vocal→acc, metais→sgl, cordas→emo), metade fora do gênero, teto +8 por disco.
- Rancor: hit seu sem crédito +8, hit alheio (fato `chart` de NPC no gênero do coletivo) +2, documentário +15. Documentário 15+ anos após o fim do coletivo (modo exato: só os reais, no ano real — 2002, 2008, 2013, 2022) → fato `session_credit` (tag `doc`) + manchete + Caixa `ses19_doc` (licenciar fitas, valor lê `screen18.rep`). Depois: processo (`session_lawsuit` + `openDispute18` 5–12% da obra + `grantHold` grievance) ou carreira própria (`goSolo16` + `session_star`, dados `{crew, hits}` para tribute19). Modo exato: gente real não processa nem vira artista.
- Ouvintes: `session_credit` (reputação com artistas), `session_lawsuit` (estresse do ato + manchete), `session_star` (manchete), `credit_dispute` (marca o ás como litigante — saiu do WHITELIST19). Porquê `ses19.ace`; dica `ses19-grudge`.
**Créditos divididos, ghostwriters e plágio** — `src/sim/sys/writers19.ts` (estado `x4.wr19`, Rng `rng19(s,'wr19')`).
- `splitPlan19/negotiateSplit19(s, song, 'band'|'writers'|'lead')` via `finance.setSplits` → fato `cowrite_split` (ouvinte: relações entre os autores ±).
- Ghostwriter: `hireGhost19(s, act, nda)`; candidatos vêm de fatos `choir_alumni`/`contest_winner`/`prodigy_found` (schools19/contests19 — cadeia 3) ou novato. Escreve a cada 2 meses (`ghs[songId]`), rancor por mês e por hit; Caixa `wr19_ghost` (crédito 30% / pagar silêncio / encerrar). Revelação → `ghostwriter_revealed` + `scandal(..., 'conduct')` + 30% das obras ao ghost + `goSolo16` (ouvinte: rixa feud18 com o ato próprio dele, estresse, manchete). NPCs também têm ghosts (≤3).
- Canções de fora: Caixa `wr19_offer` (editora da época `pubName19`, cachê, cut-in de 25% com chance `cutOdds19`) → `cowrite_split` tag `outside`.
- Plágio: hit top 5 seu (≤26 sem.) → `wr19_plag` (brigar/crédito 15%/acordo); hit alheio parecido com seu catálogo → `wr19_sue`. ×1,8 depois de 2015. `plagiarism_suit` (ouvinte: rixa + manchete); veredito em ~13 sem. (`registerDeadline('wr19')`, kind `court`) → `case_ruling`. Porquê `wr19.plag`.
- quality18 `writers19`: 3+ autores → acc +2/orig −2; ghost → sgl +3; canção de fora → sgl +2.
- UI `src/ui/sys/session19.ts`: abas `session19` (Estúdio › Gravação, host `creation` grupo studio) e `writers19` (Compor) + mesmas abas nas páginas de carreira Estúdio/Editora via `CP_TABS19` (careerpages17). Ajuda em help18tabs (`T('*','session19'|'writers19')`).
- `tests/r19-infra.test.ts`: tipos reservados emitidos agora exigem consumidor (antes: proibido emitir).
## R19 links19a — Frente 1, grupo A (I1–I3, I6, I10, I12/I23, I16) + 11.7
`src/sim/sys/links19a.ts` (último antes de facades19 no índice). Seis ligações no registro `LINKS18` (porquê `link18 {id}` com números via `LINK18_PARTS[id]`, novo em links18) e no log "Ligações do mês". Fatos novos em `factmatrix19.LINKFACTS19`.
- **estate** — `NEURAL19` (neural.ts: `gate` exato/disputa, `odds` = `estOdds19` pela postura/união/desejo do espólio post18, `share` = `estShare19` 10–15%, `used`) → fato `estate_rights` (tags approved/unauthorized, good/bad) → ouvinte: legado/união do espólio, opinião dos herdeiros, `scandal17` se mau gosto (polêmica `back18` ≥55 ou sem aval), manchete. Fatia do espólio nos lançamentos `kind: 'posthumous'` (ledger, categoria `rights`) e nos hologramas.
- **delay** — `SUP19.late` (supply18: adiar ou lançar com físico atrasado) → fato `release_delayed` → `addHype(n:/r:)` −`delayCool19(semanas)`, `pr.hype` cai, rotação do single recente −1 nível (atraso ≥3 sem.), `noteDeadline19` (tipo supply).
- **banned** — varredura de `soc18.banned` → fato `banned_song`; `video_banned` (media18) também ouvido → `bootK19` (world4 `piracyLevel`, leis como `blank_tax`) dá fãs casuais, momento, fama subterrânea e hype de rádio pirata.
- **crowd** — edição nova de festival próprio com `disaster` → `tragedyOdds19` (lotação, licença fest18, segurança, `crime17.sec`, `safetyNorm18`; zero no modo exato; rng19 `links19a`) → `crowd_incident` sev 2/3 → ouvinte: processo `Lawsuit.kind = 'safety'` (festival próprio) e, em tragédia, fato `law` + `live18.inc` (normas mais duras). Também ouve os incidentes de turnê do live18 (lei só em sev 3).
- **echo** (11.7) — `fire18` grava `data {o, n, thr}` no fato `echo`; eco forte (`strongEcho19`) → `logShot18({k:'echo'})` + cena `cine18` (≤1/mês, 1/fio; novo `case 'echo'` em `momentBoard18`). `FIT19.after` (chooseFit18) agenda eco `fit18:<roupa>`.
- **region** — `regShare19` (fandom19 `fansByRegion19`, cache por semana dentro do jogo) → mod `cityDemand` `links19a:region` (fora do mercado de casa ×0,9–1,5) e bônus de renda dos circuitos18; base ≥20% e ≥5 mil fãs num mercado → fato `fan_region` → +10% de procura lá por 26 semanas.

## R19 echoes19 / era19 / eracon19 / realhist19 (onda 2: 11.2, 11.5, 11.6 + piloto da Frente 2)
- **Ecos por tom** (`sim/sys/echoes19.ts`): `decide18.DEF_CONSEQ19.f` dá um eco PADRÃO a qualquer opção sem eco escrito, pelo tom
  (`optTone19(ev, opt)` → risky/generous/deceitful/cautious/aggressive; tamanho escala com a fama do ato e a reputação).
  `conseq18(key)` agora devolve o eco escrito OU o padrão; `ownConseq18(key)` só o escrito. `coverage19(ids)` mede a cobertura.
  `TOP19` = 120 eventos mais sorteados (playbot, 12 partidas × 4 anos); piso testado: ≥35% das opções com eco escrito (hoje 53%;
  95% com o padrão). Ecos à mão no topo e nas famílias r11/w4/org12 (15×4)/era8. Fatos `risk_paid`/`risk_lost` (ouvintes: faro
  do selo, moral do elenco) e dica `echoes19_risk`. Explicação `dec19.cover`.
- **Era 1889** (`sim/sys/era19.ts`, `ui/sys/era19.ts`): `eraFactors19(s)` (crise/boato, formatos, patentes, vaudeville, costume do
  contrato; nada do futuro) → bloco "A era" no Cockpit via `home18.HOME_EXTRA19` (registro novo de blocos do topo);
  `registerAdvisorTip('era1889')`; explicação `era19.factors`; eventos `era19_cyl_bet` e `era19_vaud` (lista negra do circuito);
  ecos `ib:era1889_patent:lic|risk`, `shellac_breakage`, `shellac_ration`, `sheet_music_boom`. Fato `format_bet`; ouve `case_ruling #patent`.
- **Contrato por época** (`sim/sys/eracon19.ts`, puro): `eraK19(year)` session(<1903)/side(<1925)/modern; `royBand19`,
  `expRoy19`, `clampRoy19`, `eraOffer19` (aplicado em `artist18.mkRecord/mkDist`), `eraOfferText19`, `eraMasterL19`, `eraWord19`
  ("master" → "matriz" antes de 1925, também nas mensagens a18_*), `eraAsks19`. `contracts18`: `Pkg18.roy/from/to` e
  `pkgsFor19(year)`; pacotes `session` e `side` (a UI de cláusulas mostra só os da época).
- **História real** (`sim/sys/realhist19.ts`): `REAL19` (texto documentado + fonte), 5 marcos em `world4/milestones`
  (`rh19_eurovision`, `rh19_pirate`, `rh19_moa`, `rh19_freefest`, `rh19_mtv`), eventos `rh19_euro` (todo março), `rh19_pirate`,
  `rh19_fest` (1969–79), `rh19_mtv`, com ecos que gravam o desfecho em `rh19(s).run`. `realCards19(s)` → seção Mundo › "A história
  real" e bloco no Cockpit (lado a lado: real × sua partida, só nos modos alternativos). Fatos `real_history` (vai ao Diário) e
  `freefest_incident` (estresse do elenco + dica de segurança). Vítimas sempre anônimas e fictícias; sem detalhe gráfico.
## R19 links19b — Frente 1 grupo B + 11.10 + 11.11 (`src/sim/sys/links19b.ts`)
Tipos de fato novos em `factmatrix19.LINKS19B` (todos com ouvinte `links19b:*` de efeito real); fluxo de sorteio `rng19(s, 'l19b')`.
- **Sessão × qualidade × CA/PA**: `registerDimAdj18('links19b:session', sessAdj19)` — grupo de sessão do agenda17 ativo no mês do disco (ou banda da casa do gênero) soma `sessPts19(q)` na dimensão dele (`CREW_DIM`: rítmica → `imm`, orquestra/coral/MFSB → `emo`, turma de estúdio → `tech`); fraco (< 0,45) subtrai. Gancho `record`: q ≥ 0,72 dá experiência de estúdio e "mentor" (ab18 `e[1]`, `e[3]`) ao elenco; banda da casa aprende com elenco CA 120+. Fato `session_mark` (moral/confiança). Porquê `l19b.session` ({rel}).
- **Câmbio por submercado**: `FX19` (crises reais por submercado que a tabela por mercado do econ18 não cobre; roteiro só com `scriptedReal`; fora do modo exato, crises sorteadas após o início em `l19b.fxr`). `fxCrises19(s)`, `fxSub19(s, sub, r)` (receita do mês `mk:<mercado>` × peso do submercado + títulos a receber). Perda vai ao livro em `fx` ("Câmbio: crise em …"). Fato `fx_crisis` → selos do submercado −5% de caixa, atos seus de lá −3 de embalo, diário do regions18, manchete. Porquê `fx19.sub` ({sub?}).
- **Inteligência de rivais**: `intelOn19` (espionagem `s.flags['intel:<selo>']` < 26 semanas ou analista 60+ com rival tenso) revela o alvo escondido (`rivalmind18` via `rivals19`) → nota no relatório (`REP_NOTES19` novo em report18) + fato `rival_intel` → carta `l19b_intel` (pacto / vazar / observar, com ecos). `treachery19(s, lb)` (cartilha vulture/fund/tech), `betray19(s, lb)` → fato `pact_betrayal` → carta `l19b_betray` (processar / retaliar / perdoar, com ecos). Porquê `l19b.intel` ({lb}).
- **Campus × moral × qualidade × talento**: `campusScore19(s)`; lealdade da equipe deriva até 55+4×placar (só com placar ≠ 0); `registerDimAdj18('links19b:campus')` (técnica pela estrutura, −2 com prédio danificado, +2/+1 com desbloqueio `campus19:studio`); `registerOfferMod('links19b:campus')`. Porquê `l19b.campus`.
- **11.10**: ganchos novos em campus18 `CAMPUS19.delay/dmg` → cartas `l19b_delay` (hora extra / trocar construtora `swapBuilder19` / aceitar) e `l19b_ins` (acionar seguro / reconstruir / esperar), todas com ecos (`ib:l19b_*`). Seguro patrimonial `buyIns19`/`insPrem19` (dica do conselheiro com botão). Obra entregue (casa dos artistas/praça, reforma) → fato `campus_invest` → `dec18.unl['campus19:studio'|'campus19:scout']` (qualidade / um jovem no discover18 por trimestre).
- **Prestígio × crítica × júri**: `pathJury19(s, rel, cat)` em `GRAMO_ADJ` (caminho do paths18 + crítica vs. média do ano, teto ±6); fato `jury_nod` no mês das indicações. Porquê `l19b.jury` ({rel, cat?}).
- **11.11**: gancho novo em artist18 `A18_HOOK19.dev/adj` — chance de contrato de desenvolvimento e adiantamento/mesada × (PA enxergada pelo olho do A&R `labelEye19`, ×0,85–×1,3), linha "o selo apostou no seu potencial N", fato `pa_bet`. Porquê `a18.pa19` ({o}). Corrida pelo jovem: achado do discover18 com PA enxergada 125+ e ≤24 anos → selo NPC de bom olho entra na disputa (`disc18.hot`, 4 semanas, fato `talent_race`).
## R19 history19 — marcos 1926–2026, geopolítica, flags de dados e desempenho (T8)
- **Dados** `src/data/hist19.ts`: `H19` (113 marcos `h19_*`: `{y, m?, tech?, until?, w?, k: wave|tech|law|stage|crisis|deal, ref, t, x, g?, mk?, ap?, ty?, pop?, riv?}` — texto só com fatos documentados, nada que afirme o destino de uma pessoa real), `GEO19` (27 eventos `geo19_*` → `content.GEOPOLITICS`, total 64+) e `TRIB_K19` (lista K do db19 §3.1). Linha do tempo com 180 marcos; todo ano de 1925 a 2026 coberto.
- **Sim** `src/sim/sys/history19.ts`: cada H19 vira `Milestone` (world4; disparo na data/tecnologia, silencioso antes do início) + `EventDef` próprio (id = id do marco, `forcedOnly`) com 2–3 opções por tipo (`OPTS19`) e **ecos escritos** (`registerConseq18('ev:h19_*:opt')`, odds visíveis nas apostas). Apelo: mod único `w4ms:h19` (família "mundo" do teto) = produto dos marcos vigentes que casam com gênero/família, sede (`mk`) e tipo (`ty` 1 single / 2 álbum), teto ×0,75–×1,25; `histParts19(s, rel?, act)`, `active19`, `fits19`, `mech19` (texto da mecânica gerado). Fato `milestone_turn` (ouvinte `history19:world`: `headline19` + top 3 atos NPC do estilo ±6 de embalo) e `real_history` na escolha (`registerDecisionListener('history19')`, estado `x4.hist19.run`). `cards19(s, {fresh?})` = cartões "A história real" (fato × sua partida). Porquê `hist19.ap` ({act}); dica do Conselheiro `history19` (onda sem ato seu do estilo). Regimes novos em `society18.REGIMES18` (cn19, cu19, id19, mm19, tr19, dz19, kh19, hk19, af19). Matriz: `factmatrix19.HIST19`.
- **Flags** `RealArtist.exact?: false` (dado † não conferido: `dbsize14.realAllowed` o esconde no modo exato; `x` já era o ano de morte, por isso o nome `exact`, igual a estúdios/gear do more19) e `T?: true` (tributo; marcado por `TRIB_K19`). `tribute19.TRIB19_T.f = tribProne19` (×1,6 na chance de nascimento de tributo; vale também para nomes K do catálogo clássico).
- **UI** `src/ui/sys/history19.ts`: aba `worldHub › history19` "Marcos da história" (por década e tipo) e bloco do Cockpit `home:h19` (marco do último ano). Ajuda `H('history19')` e `T('*','history19')`.
- **Desempenho**: `chron9.debuts/pickInfluence` com candidatos agrupados por família (era O(atos²) no 1º mês do jogo enorme; mesmo resultado), `realworld.canonKey` memorizado (texto puro; `kin15.graph` recalculava milhares de chaves por mês).
