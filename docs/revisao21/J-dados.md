# J — Revisão cruzada de dados (Masters, `src/data` × `src/sim`)

Scripts (rodar de `/home/user/Vinyl-Game` com `npx tsx <arquivo>`), todos em `scratchpad/`:

| Script | O que cobre |
|---|---|
| `validate1.ts` → `validate1.out/.json` | ids duplicados, pais de gênero, cidades/países, atos reais (gênero/cidade/país/datas/integrantes/discos), lineups16, realnames × catálogo, TECHS/FORMATS/eras, países (população, gosto, idioma, relevância), mojibake, EN=PT, referências de selos/produtores/managers/festivais/mídia/regions18/heritage/hist19/hood/landmarks |
| `validate2.ts`, `validate2b.ts` | sobreposição media17×media19, nomes de país fora do atlas, estatísticas de equilíbrio (gêneros×atos, décadas×mercados, países, cidades, eras/plataformas/geo por década, 2025–2040) |
| `validate3.ts`, `evdup.ts` | 796 eventos registrados (sim inteiro carregado): tags, categorias, tons, opções, EN/PT, ids repetidos |
| `validate4.ts` | literais de gênero/cidade/formato/tech/país/mercado/família/traço em `src/sim`+`src/ui` × catálogos; chaves `S.*` × `i18n/strings.ts`; `l('pt')` sem EN |
| `sub.ts`, `covdup.ts`, `kin.ts` | submercados regions18, covers repetidos, totais do kin15 |

Baseline: `npx tsc --noEmit` limpo; `tests/r19-data-base.test.ts` e `tests/r17-data.test.ts` passam (13 testes). Tudo abaixo é o que **esses testes não pegam**.

Volumes lidos: 371 gêneros · 249 cidades · 7 mercados · 25 submercados · 128 fichas de país (177 no atlas) · 1 929 atos reais em `REAL_ALL` (+100 do catálogo) · 796 eventos · 23 techs · 11 formatos · 17 eras · 3 745 objetos `{pt,en}` visitados.

---

## 1. Erros de dados concretos

### P1 — corrigir

| # | Status | Onde | Problema |
|---|---|---|---|
| 1.1 | [CONFIRMADO] | `src/data/geo/meta.json` (`cities`), gerado por `tools/build-geo.ts` (polígono mais próximo no atlas 1:110m) | **`pointe_a_pitre` → `PRI`** (Guadalupe; GLP não existe no atlas). **`singapore` → `MYS`**, **`hong_kong` → `CHN`** (SGP/HKG não estão no atlas). Efeitos: `Kassav'` (`cn: 'FRA'`, more14 #1795) fica com cidade em "Porto Rico"; `countryOfCity('singapore')` = Malásia para 3 atos com `cn: 'SGP'` (JJ Lin, Saloma, Stefanie Sun) e 5 com `cn: 'HKG'` (Leslie Cheung, Anita Mui, Sam Hui, Alan Tam, Twins). Correção: `a3` explícito nessas três cidades em `world.ts` (como as C19 fazem). |
| 1.2 | [CONFIRMADO] | `src/data/world19.ts` `NAMES19` | Só tem BRB/CPV/PYF/WSM/FRO. **`countryName('SGP')` e `countryName('HKG')` devolvem o próprio código** na UI (8 atos reais com esses `cn`; ambos têm `CountryInfo`). Faltam também MAC, BHR, MCO, MLT, que `regions18` lista em `a3` (`cn`, `mena`, `fr`, `south_eu`). |
| 1.3 | [CONFIRMADO] | `src/data/countries.ts` (PRI) × `src/data/geo.ts marketOfCountry` | `PRI` tem `market: 'latam'` na ficha, mas `marketOfCountry('PRI')` = `'na'`; `san_juan` e `pointe_a_pitre` são `latam` em `world.ts`. Única ficha com essa divergência. |
| 1.4 | [CONFIRMADO] | `src/data/world.ts` GENRES | **Pai mais novo que o filho** (5): `art_rock` (1964) ← `psychedelic` (1965); `torch_song` (1930) ← `vocal_jazz` (1933); `bhangra` (1980) ← `dance_pop` (1982); `psytrance` (1990) ← `trance` (1991); `alt_rnb` (2011) ← `bedroom_pop` (2012). (O teste r19 só checa `born <= born+5`.) |
| 1.5 | [CONFIRMADO] | `realacts_us.ts` Lead Belly; `realacts_world.ts` Secos & Molhados; `lineups16.ts` Vímana | **Gênero nasce depois do fim do ato**: Lead Belly `folk` (1958) × carreira 1934–1949; Secos & Molhados `rock_br` (1980) × 1973–1974; Vímana `rock_br` (1980) × 1974–1978. O ato inteiro vive com um gênero inexistente (`worldgen` filtra cenas por `born <= year`). Trocar para `old_time`/`country` e `prog`/`glam`. |
| 1.6 | [CONFIRMADO] | `src/data/hist19.ts` H19 (`g`) | Eventos empurram `genrePop` de gêneros **ainda não nascidos** (consumidor `history19.ts`): `h19_apollo` (1934) e `h19_hammond` (1935) → `rnb` (1945); `h19_ramlee` (1948) → `malay_pop` (1955); `h19_kolosoy` (1948) → `soukous` (1966); `h19_avandaro` (1971) → `rock_latino` (1980). |
| 1.7 | [CONFIRMADO] | `src/data/realacts_more14.ts` Exaltasamba, La Sonora Matancera; `realacts_world.ts` Franco & TPOK Jazz | **Integrante entra criança**: Thiaguinho `b 1983` entra em **1985** (real: 2003); Celio González `b 1924` entra em **1924** (0 anos); Madilu System `b 1952` entra em 1956 (4 anos). Luis Hernández (Los Tigres, 1959→1968) e Rogelio Martínez (1915→1924) ficam no limite (9 anos). |
| 1.8 | [CONFIRMADO] | `src/data/realacts_more14.ts` Thiaguinho (solo) | Disco `"Ousadia & Alegria"` 2012 **antes da estreia** `d: 2013`. |
| 1.9 | [CONFIRMADO] | `src/data/more17.ts` | `Chic`, `The Stone Roses`, `The Four Seasons` já existem em `realacts_us/eu` → o carregador **descarta** a versão do more17 (dados dessa rodada perdidos silenciosamente). |
| 1.10 | [CONFIRMADO] | `src/sim/sys/session19.ts:63` `FICT19` | `city: 'rio_de_janeiro'` — o id é **`rio`**. `langForCity('rio_de_janeiro')` cai em `'en'`: a "Os Feras do Estúdio" ganha músicos com nomes ingleses. |
| 1.11 | [CONFIRMADO] | `src/sim/sys/careers19.ts:323` | `['pop', 'country', 'gospel'].includes(fam)` com `fam = familyOf(...)`: `country` e `gospel` não são famílias (`country_folk`, `sacred`) → marcas "family" nunca dão bônus a country/gospel. |
| 1.12 | [CONFIRMADO] | `src/sim/sys/sex17.ts:168` | `['pop','electronic','disco','dance'].includes(familyOf(...))`: `disco`/`dance` não são famílias → atos disco (família `rnb`) ficam fora do bônus "ícone". |

### P2 — vale olhar

| # | Status | Onde | Problema |
|---|---|---|---|
| 1.13 | [CONFIRMADO] | `src/sim/events.ts:861` × `src/ui/newgame.ts:35` | `SENSITIVE_TAGS` tem **`health`** (11 eventos) que a UI de filtros não oferece; a UI oferece **`romance`**, que nenhum evento carrega como tag (o filtro só age por código em `life17.ts:121`/`sex17`). 434 dos 796 eventos não têm tag nenhuma. |
| 1.14 | [CONFIRMADO] | `src/data/lineups16.ts` / `realacts_world.ts` / `more14` | Mesma pessoa com **nascimento diferente** em atos diferentes (o `canonical` une por nome+nascimento, então vira duas pessoas): `Daniel` — solo 1968 × `João Paulo & Daniel` 1967 (× um "Daniel" 1970 em Só Pra Contrariar, que é outro). |
| 1.15 | [CONFIRMADO] | `src/data/media19.ts` COVERS19 | 2 covers repetidos de `heritage17.COVERS17`: "Got to Give It Up" (Robin Thicke) e "Let's Get It On" (Ed Sheeran). Os outros 65 covers, 37 veículos e 40 cenas são novos (o merge em `sim/sys/media19.ts` deduplica). |
| 1.16 | [SUSPEITO] | `src/data/content.ts` TECH_ERAS | `ipod` começa em 2001 mas aponta `tech: 'download'` (base 2003) — única era cujo `start` ≠ `tech.base`. |
| 1.17 | [SUSPEITO] | `src/data/rules.ts` FORMATS | `shellac` não tem `tech: 'disc'`; `production.ts:148` trata à mão (`techDates.disc`), mas qualquer outro consumidor de `FORMATS` vê 78 rpm em 1889. |
| 1.18 | [SUSPEITO] | `src/sim/sys/remix19.ts:34,38` RES19 | `city: 'nyc'` e `'lasvegas'` (ids reais: `new_york`, `las_vegas`). Hoje o campo não é lido por ninguém; vira bug no dia em que for. |
| 1.19 | [SUSPEITO] | `realacts_*` | 7 discos **depois do fim** sem `rj` (póstumos: Sam Cooke 1985, Patsy Cline 1967, Roy Orbison 1989, Otis Redding 1968, The Band 1978, Juice WRLD 2020, Avicii 2019). O carregador agenda o lançamento mesmo assim — provavelmente intencional, mas sem marcação. |
| 1.20 | [SUSPEITO] | `realacts_us.ts`/`eu.ts` | Integrante listado 2× no mesmo ato (duas passagens?): Jermaine Jackson, David Lee Roth, Phil Collins (Genesis), Bruce Dickinson, Robbie Williams. |
| 1.21 | [SUSPEITO] | `src/data/countries.ts`/`countries19.ts` | 27 códigos em `CountryInfo.lang` sem lista em `people.FIRST_NAMES` (kl, sl, bs, mk, lv, be, az, ku, bm, ha, so, lg, sn, af, tn, ht, qu, ay, gn, pa, ta, ne, fj, ty, sm). Nenhum consumidor usa esse campo hoje → inofensivo. |
| 1.22 | [SUSPEITO] | `src/data/world19.ts` G19 `aff` | `reggae_fusion` (`us`) e `pacific_reggae` (`au` ×2) declaram afinidade para submercados cujo `taste` é **vazio** (`us`, `ca`, `au` caem em `MARKET_PREF`); o laço de `regions18/index.ts:16` não cria nada → afinidade perdida. |

### O que foi checado e está limpo

- Ids duplicados: 0 em gêneros, cidades, países, atos do catálogo, selos (ids e nomes), produtores, managers, festivais (por nome), techs, eras, plataformas, prêmios, paradas, submercados, hist19, marcos, eventos (0 nas 260 definições literais; `registerEvents` descartaria em silêncio). `david_geffen` aparece 2× em `REAL_EXECS` de propósito (chave `rid:label` em `leaders10`).
- Gêneros: todos os pais existem; todas as cenas de cidade existem; famílias válidas. Cidades: todas com mercado válido, país, ficha e submercado; 0 com coordenadas zero.
- Atos reais: 0 com gênero/cidade/país inexistente; 0 com `e < d`, `x < b` ou `b > d`; 189 estreiam antes do nascimento do gênero, **todos** dentro da tolerância de 6 anos ou declarados em `FORERUNNERS19` (0 fora). 63 integrantes "entram" antes da estreia (formação da banda) — o carregador trata como fundadores. 325 grupos sem `m` nem `b` (todos do more19) → o jogo gera a formação.
- `realnames.REAL_ACTS` ↔ `CATALOG_ACTS`: 100 ↔ 100, sem órfãos, contagem de integrantes bate.
- TECHS: dependências existem e nunca são posteriores; `worldgen.ts:43` força `dep + 1` no modo Livre, então o spread sobreposto (multitrack×lp, p2p×internet, streaming×download) não gera ordem invertida. Formatos: todo ano 1889–2040 tem ≥1 formato físico e ≥1 não físico; todo ano tem ≥3 eras.
- Mojibake: **0 linhas** em 796 arquivos `.ts/.json` de `src/`. Caracteres de controle: 0.
- EN: 0 objetos `{pt,en}` com `en` vazio (3 745 visitados); os 44 `en === pt` são nomes próprios (São Paulo, Teatro Colón…). `strings.ts`: 0 `s(x, x)`; 0 `l('…')` com acento em `sim/ui`.
- i18n: 247 chaves `S.*`, nenhuma usada sem definição (os `S.A/S.house/...` de `bolsa10`/`saga18` são objetos locais); 48 chaves nunca usadas (`load start confirm random modeHistoric areaDesk … estimate`).
- Código × catálogos: 307 literais de tech, 136 de cidade, 104 de gênero, 110 de família, 60 de traço conferidos; só os casos 1.10–1.12 e 1.18 falham (os demais "misses" são palavras de outros domínios: `'global'`, `'any'`, `'support'`).
- Existing r19 test cobre: C19/G19, submercado por país, `exact`, FESTS19 etc.

---

## 2. Problemas de equilíbrio visíveis nos dados

| # | Status | Achado | Números |
|---|---|---|---|
| 2.1 | [CONFIRMADO] | **75 gêneros não estão na cena de nenhuma cidade** → atos procedurais nunca nascem neles (`worldgen.ts:160` sorteia só de `city.scenes`). Só atos reais os usam. | Entre eles: `chicago_blues`, `rockabilly`, `mambo`, `cha_cha`, `teen_pop`, `boy_band`, `new_jack`, `acid_house`, `idm`, `uk_garage`, `dubstep`, `drill`, `uk_drill`, `nu_metal`, `phonk`, `lofi_hiphop`, `brega_funk`, `funk_150`, `pagode`, `samba_enredo`, `choro`, `marchinha`, `visual_kei`, `anison`, `vocaloid_pop`, toda a era 1889 (`parlor_song`, `march`, `vaudeville`, `opera`, `choro`, `maxixe`…) e **todos os 17 gêneros de 2030+**. |
| 2.2 | [CONFIRMADO] | **103 gêneros sem nenhum ato real** (86 nascidos até 2024); 59 com um único ato. | Sem ato: `surf`, `baiao`, `pagode`?, `go_go`, `lovers_rock`, `acid_house`, `psytrance`, `gabber`, `uk_garage`, `dubstep`, `vaporwave`, `phonk`, `manele`, `ostrock`, `hamburger_schule`, `iskelma`, `champeta`, `cumbia_villera`, `hiplife`, `gengetone`, `piseiro`, `mahraganat`… Lista completa em `validate2.out`. |
| 2.3 | [CONFIRMADO] | **`musicSpend17` devolve 1 para 100 dos 128 países** sem curva — acima de Itália (0,7), Brasil (0,65), México (0,6), Argentina. Arábia Saudita (13,9) e Taiwan (13,0) ficam com mercado maior que Turquia, Rússia e Polônia em 2020; Irã/Síria/Sudão/Mali com fator 1. | `relevance17.ts` só tem 28 curvas. Mesma coisa em `relevance.ts`: 94 países com ficha caem no `softPower` 0,2 e no `localPref` 1,6 (Áustria = Síria = Samoa). |
| 2.4 | [CONFIRMADO] | **População antes de 1920 é constante** (todas as curvas `PD` começam em 1920): EUA 106 M em 1889 (real ≈ 62 M), Brasil 30,6 M (real ≈ 14 M), Índia 248 M, China 472 M. `era1889.ts` não traz tabela de população apesar do comentário. | Inflaciona o mercado do início da run de 1889/1902. |
| 2.5 | [CONFIRMADO] | Distribuição de atos reais por década × mercado (1 929 atos): `na` e `eu` dominam 1960–2010; **`oceania` tem 0 atos antes de 1940**, `africa` 0 em 1880–90 e `asia` 0 em 1910; **década de 2020 tem só 64 atos** (31 deles `asia`, 8 `na`, 1 `br`). | Tabela completa em `validate2.out`. 1 167 atos sem fim nem morte (ativos em 2026); 702 sem discografia. |
| 2.6 | [CONFIRMADO] | Países: 34 fichas com **zero atos reais** (FRO GRL MKD ALB LTU BLR GEO ARM AZE PSE JOR ARE TGO BFA NER COG SOM MOZ ZMB NAM BWA HND VEN ECU BOL PRY MMR BGD LKA NPL FJI NCL PYF WSM); 19 com 1–2. **70 cidades sem nenhum ato real** (bogota, caracas, cali, busan, dubai, leeds, newcastle, edinburgh, louisville, portland, denver, phoenix, tijuana, quito, la_paz…). | Cidades com ≤1 cena: hong_kong, dakar, sydney, maputo, harare, oran, zanzibar. |
| 2.7 | [CONFIRMADO] | Mercados: todos têm cidades (na 34, eu 81, br 15, latam 30, asia 37, africa 40, oceania 12). `na` = 30 EUA + 3 CAN + 1 GRL: **nenhuma cidade do México no `na`** (está em `latam`, ok) mas também nenhuma em Porto Rico/Cuba como `na`. `eu` concentra 1/3 das cidades do jogo. | — |
| 2.8 | [CONFIRMADO] | Eras/formatos: nenhum ano sem formato. Eventos: 714 dos 796 não têm portão de época (`s.year`/`hasTech`), logo todas as décadas têm centenas de eventos possíveis; só 2 eventos são exclusivos de 2030+ (`human_cert_audit`, `r11_reality_tv`) e **18 na categoria `neural`** para 10 anos de era sintética. | — |
| 2.9 | [CONFIRMADO] | Submercados (`regions18`): `us`, `ca`, `au` têm `taste: []` (caem na preferência da região); `north` (África) só tem gosto até 1990; `nordic` até 2005; **nenhum submercado tem gosto, plataforma ou barreira datados ≥ 2025**. | — |
| 2.10 | [CONFIRMADO] | Fichas de país: 49 sem `award`, 99 sem `notes` (quase todas as de `countries19`). | — |

---

## 3. O que pode ser aprofundado (lacunas óbvias)

1. **Era sintética 2025–2040 é rasa**: 17 gêneros novos sem cidade-cena e sem ato (nem do catálogo — nenhum `CATALOG_ACTS` estreia ≥ 2025); 0 plataformas, 0 geopolítica, 0 movimentos novos ≥ 2025 (`mv_latent/handmade/consent/dreamfeed` existem a partir de 2031, mas sem cidades de 2030+); 3 marcas (`b_neuro`, `b_ai_lab`, `b_holo`), 1 selo (`cortex`), 1 prêmio (`human_mark`), 1 parada (`neural_top`), 3 fatos hist19 (`h19_golden`, `h19_ai_licence`, `h19_superbowl`). Submercados param em ~2020.
2. **1889–1919**: 27 gêneros nascem em "1889" (data-sentinela) e nenhum tem cidade-cena; população constante; 0 plataformas/geo/prêmios/paradas (só `sheet_music` a partir de 1910); 44 atos reais em 30 anos (7 na década de 1880). Submercados têm `share` só a partir de 1920.
3. **Geografia desigual**: 94 países sem curva de soft power/preferência local; 100 sem gasto musical; África (40 cidades) e Ásia (37) têm 1–2 atos por cidade; América Latina sem Bogotá/Caracas/Cali/Quito/La Paz/Assunção com ato real; Oceania sem nada antes de 1940.
4. **Cidades sem "vida"**: só 25/249 têm clima (`CLIMATE19`), 19/249 têm bairros (`HOODS19`, resto usa `GEN19`), 49/249 têm marcos. Cidades sem ato real: 70.
5. **Gêneros órfãos** (2.1/2.2): 75 fora de qualquer cena e 103 sem ato — o jogador nunca verá `choro`, `rockabilly`, `dubstep`, `uk_garage`, `drill`, `phonk`, `vaporwave` surgindo organicamente.
6. **Década de 2020**: 64 atos reais (vs 235 em 2010); 1 gênero novo (hiphop). Faltam corridos tumbados/sertanejo/afrobeats/amapiano com atos de 2020+ fora da Ásia.
7. **Dados de pessoas**: `kin15` lista 172 nomes e **150 não existem no banco** (só 22 laços ativáveis); `looks17` 3 nomes órfãos (John McVie, Victoria Beckham, Kevin Parker); managers com 11 clientes que não existem (Busta Rhymes, Bros, East 17, 2NE1, Uriah Heep, The Move, Nick Lowe, The Wailers, Bruce Cockburn, Wonder Girls, 2PM); produtores com 91 "obras" de artistas fora do banco (só texto); cenas 17/19 citam 17 atos inexistentes (Jim Reeves, Percy Sledge, The Paragons, Fania All-Stars, Pablo Milanés, Saxon, Chuck Brown, DAF…); covers citam 42 donos originais e 30 regravadores que não existem (Big Mama Thornton existe? Pat Boone, The Tokens, José Feliciano, Kris Kristofferson, Badfinger, The Chiffons, Laura Branigan…). Cada um desses nomes é um ato real "quase pronto" para entrar.
8. **Fichas de país**: 49 sem prêmio nacional, 99 sem notas históricas; `H19` tem 0 fatos antes de 1926 e 0 depois de 2026.
9. **Famílias**: `sacred` tem 9 gêneros/22 atos; `electronic` 27 gêneros/62 atos (2,3 por gênero) contra `rock` 42/458.

---

## 4. Inconsistências entre dados e código

| # | Status | Detalhe |
|---|---|---|
| 4.1 | [CONFIRMADO] | `session19.ts:63` `city: 'rio_de_janeiro'` → id inexistente (ver 1.10). |
| 4.2 | [CONFIRMADO] | `careers19.ts:323` compara `familyOf()` com `'country'`/`'gospel'`; `sex17.ts:168` com `'disco'`/`'dance'` → ramos mortos (1.11, 1.12). |
| 4.3 | [CONFIRMADO] | `events.ts SENSITIVE_TAGS` (`health`) × `newgame.ts SENSITIVE` (`romance`) desalinhados; `romance` não é tag de nenhum evento (1.13). |
| 4.4 | [CONFIRMADO] | `world19.ts` G19 afinidades para `us`/`au` são ignoradas porque esses submercados têm `taste: []` (1.22). |
| 4.5 | [CONFIRMADO] | `geo.ts countryName` devolve o código para SGP/HKG (dados existem em `countries19`, nome não está em `NAMES19`) (1.2); `marketOfCountry('PRI')` ≠ `countryInfoByA3.PRI.market` (1.3). |
| 4.6 | [CONFIRMADO] | `rules.ts FORMATS.shellac` sem `tech`, dependência de `disc` só em `production.ts:148` (1.17). |
| 4.7 | [SUSPEITO] | `remix19.ts RES19` cidades `nyc`/`lasvegas` (1.18). |
| 4.8 | [CONFIRMADO] | `hasTech(s, '…')`: 20 ids distintos, todos existem em `TECHS`. `techDates.x`, `formatById`, `genreById[...]`, `cityById[...]`, `subById18[...]`, `countryInfoByA3[...]`: nenhum literal órfão. Chaves `S.*`: nenhuma ausente. |
| 4.9 | [CONFIRMADO] | `realworld.ts` descarta em silêncio atos de `more17` com nome repetido (1.9) e, pelo mesmo filtro, qualquer pacote `more19` que repita nome — hoje 0 casos entre pacotes. |

---

## 5. Ideias de conteúdo

1. **Fechar os gêneros órfãos com cena + 1 ato real cada** (lista de 2.1/2.2): e.g. `chicago_blues`→chicago (Muddy Waters já existe com outro gênero?), `rockabilly`→memphis, `mambo`/`cha_cha`→havana/new_york, `dubstep`/`uk_garage`→london/bristol, `drill`→chicago, `phonk`/`memphis_rap`→memphis, `choro`/`marchinha`/`samba_enredo`→rio, `pagode`→sao_paulo/rio, `visual_kei`/`anison`/`vocaloid_pop`→tokyo, `acid_house`→chicago/manchester, `cumbia_villera`→buenos_aires, `champeta`→cartagena.
2. **Cenas de 2030+**: dar cidade a cada gênero sintético (`k_synth`→seoul, `samba_latente`→rio, `afro_neural`→lagos, `mesh_reggaeton`→san_juan, `haptic_dub`→london/bristol, `holo_folk`→nashville) e 10–15 atos fictícios no catálogo com `debut ≥ 2026` (hoje só Aiko Prism, que tem `debut 2007` com gênero `synthetic` nascido em 2030 — [SUSPEITO] `catalog.ts:124`).
3. **Promover os "nomes citados" a atos reais**: os 17 atos das cenas (Jim Reeves, Percy Sledge, Fania All-Stars, Saxon, Chuck Brown, DAF, Crying Nut…), os 11 clientes de managers (Busta Rhymes, 2NE1, Uriah Heep, Wonder Girls…) e os donos de covers (Big Mama Thornton, Hank Ballard, The Chiffons, Badfinger, Los Kjarkas, Ednaswap) já têm contexto pronto em `heritage17/managers14`.
4. **Curvas de relevância para os 94 países de `countries19`**: pelo menos por bloco (`T` de countries19 já agrupa: nordic/central/balkan/east/arab/maghreb/westaf/…) para `softPower`, `localPref` e `musicSpend17`, em vez do padrão plano.
5. **População 1889–1919** por país (ou fator único por década) e `share` de submercados antes de 1920; fatos `H19` para 1889–1925 (Berliner × Edison, Caruso 1902, Tin Pan Alley, partituras, jazz 1917, Odeon no Rio 1913).
6. **Década de 2020 fora da Ásia**: corridos tumbados (Peso Pluma existe; faltam Natanael Cano, Fuerza Regida), afrobeats/amapiano (Burna Boy? Rema, Tyla), sertanejo/funk (Anitta existe?), pop anglo 2020+ (Olivia Rodrigo existe; faltam Chappell Roan, Sabrina Carpenter), e os 34 países sem ato (Venezuela, Equador, Bolívia, Paraguai, Honduras, Bangladesh, Sri Lanka, Nepal, Fiji…).
7. **Clima/bairros/marcos** para as 70 cidades sem ato e para as 40 africanas (hoje 25 climas e 19 bairros no total).
8. **Tags de conteúdo**: adicionar `romance` aos eventos de caso/traição/armário (`affair`, `affair_exposed`, `band_romance`, `closet`, `divorce_threat`) e expor `health` na UI — hoje o jogador não consegue desligar os 11 eventos de saúde.
9. **Prêmios e paradas** para os 49 países sem `award` (Bulgária, Grécia?, Irã, Argélia, Marrocos, Tunísia, Senegal, Mali, Peru, Equador, Bolívia, Paraguai, Sri Lanka, Nepal…) e `notes` para as 99 fichas sem fato histórico.
10. **Submercados até 2040**: gosto, plataformas (feeds neurais regionais, mercados de voz) e barreiras (licença de voz por país) ≥ 2025 em `regions18`, que hoje param em 2018–2020.
