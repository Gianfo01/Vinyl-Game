# Conexões r23 — "tudo influencia tudo"

Ponto de partida: auditoria estática (nº de outros módulos da simulação que leem as exportações de cada sistema).
Para cada sistema com 0–2 leitores: está mesmo desligado? que entrada/saída faz sentido? O que mudou na r23.

Hubs usados (nenhum sistema novo de ligação): ouvintes de fatos (`onFact`), `ODDS17` (chances de crime),
`RECRUIT23` (novo, recrutamento do `crimemem23`), `FIND23` (novo, peso do olheiro no `scout23`),
`PRESS23` / `ERA23` / `MEDIA23` (novos, no `secrets23`), `holds17`, `stress17`, `scandal17`.

## Camada nova: `secrets23` (segredos e vínculos)

| Sistema | Lê de | Escreve em | r23 |
|---|---|---|---|
| secrets23 | people/secrets, crimemem23 (membros e selo-fachada), sex17 (armário), fakes19 (dublagem), stream18 (fazenda de streams), crime17 (ficha/prisão), beliefs (fé/política), ventures9 e zines19 (seu veículo), holds17 (mágoas → vazamentos), crime17 (relação com organizações → informantes), relações pessoais (proximidade), selos rivais | facts17 (`secret23`, `secret_exposed`), scandal17, stress17, holds17 (favor/chantagem/mágoa/dívida), crime17 (calor), reputação, cartão de decisão (situations17), e de volta no sistema dono (people/secrets `known`/`leakSecret`, crimemem23 `reveal23`, sex17 `comeOut`, fakes19 `expose19`) | **novo**. Nativos: agiota, doença escondida, colaborador do regime, ghostwriter, informante |

## Ligações implementadas (`src/sim/sys/links23.ts`)

| # | Sistema | Lê de | Escreve em | O que mudou na r23 |
|---|---|---|---|---|
| L1 | culture19 | lealdade da equipe, cultura | crimemem23 (`RECRUIT23`) | funcionário com lealdade < 30 é recrutado ×1,6; cultura artista/prestígio ×0,8 |
| L2 | culture19 | lealdade média, cultura "caos" | secrets23 (`PRESS23`) | equipe insatisfeita ×1,5 / caos ×1,3 nos vazamentos do seu círculo |
| L3 | hood19 | segurança do bairro da sede | crime17 (`ODDS17`), crimemem23 | bairro inseguro (< 45): crimes contra você +até 15%; equipe recrutada ×1,3 (< 40) |
| L4 | insure19 | fato `arrest` (crime17 `jailPerson`) | caixa, apólices | pessoa segurada presa: 20% da cobertura (1×/ano) — ou apólice anulada se é membro de organização |
| L5 | insure19 | apólices × segredos (doença/drogas) | secrets23 (jogador confirma), prêmio +15% | exame médico da seguradora |
| L6 | extras17 | reabilitação (já emitia `rehab`) | secrets23 | coberta pela ponte people/secrets (dependência) + exame da L5 |
| L7 | kids17 | rebeldia dos filhos do dono | secrets23 (drogas/crime sobre você), holds17 (a organização tem um segredo seu) | filho(a) rebelde se mete com drogas ou com a organização da praça |
| L8 | zines19 | cenas de fanzine vivas, seu fanzine/revista | secrets23 (`PRESS23`, `MEDIA23`) | cena de fanzine ×1,5 na apuração; seu veículo apura junto e você fica sabendo |
| L9 | idols18 / kpop18 | gênero idol/k-pop | secrets23 (`PRESS23`, `ERA23`) | fansites ×1,6; caso/filho de idol pesa ×1,6 na exposição |
| L10 | naming19 | `secret_exposed` do dono (gravidade ≥ 40) | naming19 `pullName19` | cláusula de conduta também para segredo exposto (antes só `scandal`) |
| L11 | session19 | ases com rancor que tocaram para o ato | secrets23 (`PRESS23`) | dublagem/ghostwriter vazam ×1,5 |
| L12 | schools19 | `prodigy_found` no seu país | scout23 / funil (`addSignal`, origem "escola/coro") | prodígio entra no funil do olheiro |
| L13 | trends17 | gêneros em alta (top 5) | scout23 (`FIND23`) | olheiro acha ×1,5 nesses gêneros |
| L14 | furnish | efeitos de conforto da sede | lealdade da equipe (people/staff) | moral/escritório sobem a lealdade até 70 |
| L15 | secrets23 (agiota) | dívida com agiota | crimemem23 (`RECRUIT23`) | devedor recrutado ×2,5; agiota também cria `debt` no holds17 |
| — | crime17 / crimemem23 | — | secrets23 | pontes (membros, fachada, informantes nativos, ficha criminal) |
| — | media/ventures9 | — | secrets23 | seu veículo de mídia apura; vazar pelo seu veículo dá alcance/reputação a ele |

## Julgados já bem ligados (ou de interface/relatório — sem mudança)

| Sistema | Por quê |
|---|---|
| adsync19, contests19, live19, market19a, links19b, regions19, score19, session19 (resto), history19, realhist19, terr20, extras17 | já ouvem fatos e escrevem caixa/fama/fato; leitores baixos porque são "pontas" (efeitos via fatos, não via import) |
| facades19 | não é "fachada" de crime: é o índice/ouvintes dos fatos r19 (manter por último). Fachadas de crime = `front23` (crimemem23), agora ponteadas no secrets23 |
| awards18, scenes19, review18, reach17, fan15, idols18/kpop18 (resto), naming19 (resto), schools19 (resto) | efeitos via fatos e mods; review18 é post-mortem (relatório) |
| moments16, novelty9, story12, mapx8, project13, people16, rights8, bandpay19, links16 | interface/relatório, identidade ou ações diretas do jogador (lidas pela UI); nada a ganhar com mais acoplamento |
| hood19 (resto), furnish (resto), kids17 (resto), trends17 (resto), insure19 (resto), culture19 (resto) | já tinham efeitos próprios; r23 só acrescentou as saídas acima |

## Não feito (ideias para depois)

- union20 como "militância" pessoal (hoje é negociação coletiva; não há filiação por pessoa).
- adsync19: licença/jingle cair com segredo exposto (o scandal17 já rompe patrocínios de `s.deals`; o adsync19 guarda os seus à parte).
- awards: cassar prêmio por jabá/bots expostos (fakes19 já cassa por dublagem).
- Selos: aba "O que sabemos" na ficha do selo (a camada já suporta `lb:`; falta a aba na UI do selo).
