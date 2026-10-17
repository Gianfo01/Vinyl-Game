# DADOS33 — auditoria da base de gente real

Frente DADOS33 (R33). O dono pediu para **corrigir a base** e autorizou mexer nos dados de gente real.
Ponto de partida: três casos que a FICHAS33 achou jogando em 1962. Esta auditoria acha a **causa** de cada um,
corrige a regra (gerador, sorteio, gravadoras por época) e os dados claramente errados, e mede a base inteira antes e depois.

## Os três casos e as causas

| Caso (FICHAS33, 1962) | Causa | Correção |
|---|---|---|
| O dono de **Luiz Gonzaga** muda a cada partida: RCA Victor, Columbia, K-tel, "Victor Talking Machine Co." (nome extinto em 1929); numa partida ele aparece independente e aposentado | (a) O contrato do começo saía de `signToBestRival`, um **sorteio ponderado entre todas as gravadoras** do mundo; a base não tinha a gravadora histórica de nenhum ato. (b) As gravadoras **não tinham ano de fim**: a sugestão da Nova run (`suggestLabels22`, grupo "majors que já existem") e as listas `setupLabels`/`rankReal29` punham em 1962 a Victor Talking Machine (1901), a Columbia Phonograph (1889) e a Casa Edison (1900). (c) "Aposentado": o **sorteio de presença** do catálogo (`presence`, 60–100% no modo livre) tirava o ato do mundo, e o `realworld` recriava todo ato clássico ausente como "terminou antes do início" (`retired`/`split`), mesmo quem estava em atividade | Gravadora histórica por época (`HIST_LABEL33`) aplicada no fim do começo; fim documentado das gravadoras (`LABEL_END33`) em todas as listas; ato do catálogo em atividade no ano de início sempre existe e nunca é recriado como encerrado |
| **Elvis** "separado" em 1985 e "aposentado" em 2022 (morreu em 1977) | Mesma causa (c) — fora do mundo pelo sorteio de presença, ele voltava como `split` (o dado real dizia "banda", por causa do caso abaixo). Na partida, o ato continuava depois da morte dele porque os "integrantes" de apoio estavam vivos | Presença (acima) + Elvis solo: quando o artista de um ato solo morre na partida, `personDies` encerra o ato (`retired` + `deceased`) e a volta exige `!deceased` |
| O ato **Elvis Presley** tem 4 integrantes, com Scotty Moore | Dado errado: `REAL_CLASSIC[14].m` listava Scotty Moore, Bill Black e D.J. Fontana (os Blue Moon Boys, banda de apoio) como integrantes; `REAL_ACTS[14]` também | `mdel` no `audit27` (o mesmo mecanismo que já tirava Zé Dantas de Luiz Gonzaga e Snoop/Nate Dogg de Dr. Dre); `REAL_ACTS` 14 e 23 só com o artista |

## Varredura

Script: `scripts/r33/dados/run33.ts` (biblioteca `scripts/r33/dados/audit33.ts`).
Anos de começo 1900, 1930, 1950, 1962, 1975, 1990, 2005 e 2020 × modos de história exata (`strict`), com variações
(`loose`) e livre (`free`, linha do tempo caos) × 3 sementes × 3 caminhos de montagem do mundo:

- **ui**: a Nova run (a sugestão de gravadoras da época, `materializeLabels22` → `suggestLabels22`);
- **l29**: a Nova run rápida com "Gravadoras no início: muitas" (`labels29`);
- **bot**: o mundo padrão (`defaultConfig`, 22 clássicas + núcleo r21).

São 216 mundos com nomes reais. Além disso, para 1950, 1962 e 1975 (semente 0, caminho bot), 30 anos de partida
simulados, conferindo no fim de cada ano se algum ato encerrado por morte voltou.

| Tipo | O que conta | Antes | Depois |
|---|---|---:|---:|
| `selo_fora_epoca` | gravadora no mundo do começo depois de extinta (ou antes de fundada) | 343 | 0 |
| `dono_fora_epoca` | ato real contratado por gravadora fora da época | 3 784 | 0 |
| `dono_historico` | ato real com selo histórico conhecido, esse selo no mundo, e o dono é outro | 912 | 0 |
| `morto_ativo` | artista real que morreu antes do ano de começo aparecendo vivo/ativo/separado | 0 | 0 |
| `solo_com_integrantes` | ato solo com mais de um integrante | 85 ¹ | 0 |
| `integrante_duplo` | a mesma pessoa real duplicada (mesmo nome e nascimento, dois registros vivos) | 0 | 0 |
| `idade` | integrante vivo com menos de 5 ou mais de 110 anos (ou morte antes do nascimento) | 184 | 0 |
| `morto_depois` | (partida simulada) ato encerrado por morte, ou cujo artista morreu, ativo/separado depois | 1 | 0 |

¹ Medido com a 1ª versão da regra (nome do ato = nome de um integrante; `docs/r33/dados/antes-v1.json`, só caminhos ui
e bot): Elvis (com Scotty Moore/Bill Black/D.J. Fontana, de 1950 a 1975) e Alice Cooper (a banda original continuava
de 1975 a 2020). A versão final
da regra aceita banda com o nome do líder **quando a base documenta a formação no ano** (a banda Alice Cooper de
1969–74), por isso a base original — que documentava Scotty Moore como integrante — mede 0 com ela. Depois das
correções as duas versões dão 0.

Arquivos: `docs/r33/dados/antes.json` (base `aa72336c`), `docs/r33/dados/depois.json`, com até 40 exemplos por tipo.

### Exemplos do antes

- `selo_fora_epoca`: Victor Talking Machine Co. e Columbia Phonograph Co. em todo começo de 1930 a 1975; North American
  Phonograph Co. (falida em 1894) em 1900 e 1930; Berliner Gramophone e Edison em 1930.
- `dono_fora_epoca`: Frank Sinatra, Bing Crosby e Nat King Cole na Columbia Phonograph Co. em 1962; The Ronettes e Maurice
  Chevalier na Victor Talking Machine em 1962; Elza Soares, Jair Rodrigues e Sérgio Mendes na Casa Edison (fechada em 1932).
- `dono_historico`: Luiz Gonzaga na Continental, na Odeon, na Casa Edison em 1962; Elvis na Philips, na Motown, na Decca
  West Africa; Bob Dylan na Chantecler e na Claddagh; The Supremes na Island; Aretha Franklin na K-tel.
- `idade`: Haydn Quartet (S. H. Dudley e William F. Hooley sem data de morte, nascimento estimado) vivos com 111–135 anos
  de 1990 a 2020; Golden Gate Quartet (Henry Owens, Willie Johnson, William Langford) e Trio Lescano idem; Cassiane
  (n. 1973) estreando com 2 anos em 1975 no modo livre (a variação de estreia de ±6 anos passava do nascimento).
- `morto_depois`: Enrico Caruso (†1921) "volta" à ativa em 1953 (começo 1950, com variações) — ver regra 6.

## Correções

### Regras (gerador e sorteio)

1. **Gravadoras por época** — `src/data/labelhist33.ts` (`LABEL_END33`, `labelAliveAt33`): ano de fim documentado de 31
   gravadoras reais (Victor Talking Machine 1929 → RCA Victor; Edison 1929; Casa Edison 1932; Columbia Phonograph 1925 →
   Columbia Records; Pathé Frères 1936 → Pathé-Marconi; Telefunken 1950 → Teldec; Panart 1961; Chess 1975; Factory 1992;
   PolyGram 1999…; volta do nome para Stax 2006, Casablanca 2000, Arista 2018, Capricorn 1990). Só fins sem ambiguidade:
   selo que seguiu como marca de uma major (Okeh, HMV, Odeon, Brunswick) não "acaba". Aplicado em `suggestLabels22`
   (inclusive a era acústica), `setupLabels` (escolhidas e complemento), `rankReal29`/`LB29.prep` (labels29) e no
   mundo padrão (clássicas, era acústica, núcleo r21). Vale também com nomes ficcionais (o arquétipo é o mesmo).
2. **Gravadora histórica no começo** — `HIST_LABEL33` (77 atos do catálogo, gravadora por faixa de anos, pelo nome real)
   + `src/sim/sys/labelhist33.ts` (`histOwners33`), chamado no fim do `newgame` do realworld (depois dos renomes do
   lineup16). Só muda ato real ativo com selo documentado para o ano E com esse selo no mundo; move o contrato existente
   ou assina (sorteio próprio `semente|hist33`, o resto do mundo não muda de sequência). Nunca mexe no jogador, na
   gravadora assumida, nem nos começos "todos iguais"/"startups". Sem selo documentado, segue o sorteio de sempre.
3. **Presença do catálogo** (`worldgen.ts`): com nomes reais, o ato do catálogo em atividade no ano de início sempre existe
   (o sorteio de presença continua sendo feito, mesma sequência) e é o fim real que decide se ele já acabou (os ±3 anos
   valem só para o futuro). O "mundo aleatório" (início simulado, r20 G8) continua sorteando presença e estreia.
4. **Nada de "encerrado" para quem estava ativo** (`realworld.ts`): o realworld só recria como aposentado/separado o ato
   clássico cujo fim real é anterior ao início.
5. **Idade** (`realworld.ts`): gente real sem morte documentada não passa dos 100 anos no começo (morte estimada antes do
   início); a variação de estreia (livre/caos) não faz ninguém estrear com menos de 14 anos.
6. **Volta de morto pelo tributo** (`tribute19.ts`, `soundalike19`): o "original contrata o sósia como voz oficial" e
   reativava o ato mesmo com o artista morto (Caruso em 1953, pela corrente `chains28`). Agora recusa ato encerrado por
   morte ou sem ninguém vivo.

### Dados

- Elvis Presley solo (`audit27` `mdel`: Scotty Moore, Bill Black, D.J. Fontana); `REAL_ACTS` 14 (Elvis) e 23 (Luiz Gonzaga)
  só com o artista.
- Alice Cooper: a banda original (Glen Buxton, Michael Bruce, Dennis Dunaway, Neal Smith) sai em 1975; dali em diante é solo.
- Haydn Quartet: S. H. Dudley 1864–1947, William F. Hooley 1861–1918.
- Trio Lescano: Alexandra 1910–1987, Judik 1913–2007, Kitty 1919–1965.

### Política dos modos (decisão do dono)

"Nada inventado para gente real" continua só no modo exato (`config.history === 'strict'`, `realSafe`/`histLocked`).
Fatos **anteriores ao começo** valem em todos os modos: quem já morreu está morto, quem já era solo é solo, gravadora
extinta não existe, quem estava em atividade não começa encerrado, e o contrato do começo segue a gravadora histórica
(quando a base a conhece e ela está no mundo). Depois do começo, com variações e livre, a vida segue os sorteios, mas
ato encerrado por morte não volta.

## Testes e goldens

- `npx tsc --noEmit -p .` — sem erros.
- `tests/r33-dados.test.ts` (novo): os três casos (Gonzaga na RCA Victor em 1962, ativo e solo, nos 3 modos × caminhos
  ui/bot × 3 sementes; Elvis solo e na RCA Victor em 1962; Elvis aposentado e falecido em 1985 nos 3 modos e sem volta
  em 2 anos; no modo exato ele morre em 1977 e o ato fica encerrado até 1986), selos extintos fora do começo, e a
  varredura (1 semente, 72 mundos) com **limite 0** para `selo_fora_epoca`, `dono_fora_epoca`, `dono_historico`,
  `morto_ativo`, `solo_com_integrantes`, `integrante_duplo` e `idade`.
- `tests/r31-uiwords.test.ts`: `src/data/uiwords31.ts` regenerado (`npx tsx scripts/r31/uiwords31.ts`). Já estava
  desatualizado na base (falhava antes desta frente: faltava "founded").
- **Goldens que mudaram, por causa das correções de dado** (semente r16pb-5, 1975, nomes reais, mundo padrão):
  - `tests/r27-p2a` e `tests/r27-p2b`: caixa / turnês / acts / rng `703829 / 3703042045 / 3137463213 / 2738656355` →
    `732007 / 3533897490 / 1265575343 / 2652050922`. Em 1975 os atos reais ativos com selo documentado passam para ele
    (Elvis na RCA Victor, Queen na EMI, Led Zeppelin na Atlantic, Bob Marley na Island…), atos do catálogo antes tirados pelo sorteio de presença
    passam a existir e a sequência do mundo muda. Só sem o selo histórico mediu-se `167269 / 32808709 / 477092327 / 2334738270`.
  - `tests/r27-m3`: não mudou.
  - `tests/r16-playbot`: a semente pb-10 deixou de contratar equipe no 1º ano. Varredura pb-1..16 na ordem de carga do
    teste (`scripts/r33/dados/pbsweep33.ts`): 6 de 16 com todas as ações (pb-2, 8, 9, 11, 13, 16) → **pb-9** (2 turnês,
    5 festivais, 2 contratações).
  - `tests/r29-lineup-start` (The Who em 1981): a semente `d1` caiu nos 8% de ausência do modo livre depois da mudança
    de sequência; trocada por `d2` (d2–d8 conferidas, todas com The Who sem Keith Moon).

## Fica para depois

- Gravadora que **acaba durante a partida** (começo em 1900 e a Victor Talking Machine ainda em 1962): o fim no meio da
  partida (fechar ou renomear para a sucessora no modo exato) não foi feito; aqui só o começo é coerente.
- `HIST_LABEL33` cobre 77 dos 100 atos do catálogo em que o selo é bem documentado e está no catálogo de gravadoras;
  os 5 678 atos de `REAL_ALL` seguem o sorteio (sem selo histórico na base).
- Golden Gate Quartet (Henry Owens, Willie Johnson, William Langford) segue sem datas na base; a regra dos 100 anos os
  trata como mortos antes do início, mas o ano de morte é estimado.
