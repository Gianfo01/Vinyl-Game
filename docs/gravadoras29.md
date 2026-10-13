# Rodada 29 — Gravadoras no início e selos novos durante a run

> Pedido do autor: *"No começo rápido, permita escolher quantas gravadoras iniciais (e ao longo da run faça ser aleatório
> quantas aparecem)."* — *"No modo completo deve ser possível ter esse nível de escolha também, e até mais."*

Complementa o [nível dos rivais](rivais29.md): **o nível decide o porte, o número decide quantas**. Tudo fica num campo
opcional, `config.labels29` (tipo `Labels29` em `src/sim/labels29gate.ts`). Sem ele, o mundo e a run são exatamente os
de sempre: os valores-ouro `r27-p2a`, `r27-p2b` e `r27-m2` estão intactos, e o teste compara byte a byte o mundo e dois
meses jogados.

## Nova run rápida

Ao lado de "Nível dos rivais", o campo **"Gravadoras no início"** (`#h27-labels`) oferece:

- Padrão (como a história deixou) — o comportamento de sempre, e é o padrão;
- Poucas (3–5);
- Algumas (6–10);
- Muitas (11–20);
- Mercado lotado (21–40).

O número sai da semente (`labels29:semente:n:atalho`), por isso a tela mostra o mesmo número que o mundo terá. Ele
também **respeita a era**: os atalhos param em 8 gravadoras antes de 1900, 12 antes de 1920, 24 antes de 1946 e 40
depois disso.

Escolher um atalho também liga o **sorteio de selos novos durante a run**, na frequência "normal" (ver abaixo).

Quando a carreira principal tem negócios rivais no ano escolhido, aparece também **"Concorrentes no início"**
(`#h27-ven`). As opções são: padrão, nenhum, poucos (1–2), alguns (3–4) ou muitos (5–8). Os negócios são estúdios,
festivais, agências de shows, editoras, veículos ou plataformas, conforme a carreira.

A linha de status mostra a escolha, por exemplo: **"Selo emergente · rivais gigantes · 10 gravadoras"** ou
"Produtor emergente · rivais gigantes · 10 gravadoras · 6 estúdios rivais".

## Nova run completa: etapa 4, "Gravadoras e rivais"

O cartão **"Gravadoras no início"** (`src/ui/ng29labels.ts`) vem logo depois de "Nível dos rivais". Ele usa o mesmo
setter da rápida, `setLabels29`, e por isso as duas telas produzem a mesma `RunConfig`. O cartão tem:

- **os mesmos atalhos**, mais a opção **"Número exato"**, que abre um controle deslizante de 1 a 60 gravadoras;
- **Gravadoras reais**: de 0 a 100% (o padrão é 100%). O resto é inventado no estilo da época;
- **Porte**: muitas indies pequenas, misto (padrão) ou poucas majors grandes;
- **Região**: na sua região, casa + América do Norte + Europa, ou o mundo todo (padrão);
- **Selos novos durante a run**: como sempre, nenhuma, rara, normal, frequente ou caótica;
- **"Gravadoras podem fechar e se fundir"**: uma chave. Desligada, a falência vira socorro e não há fusões entre
  rivais;
- **Incluir ou excluir gravadoras reais**: uma busca por nome ou cidade que mostra até 12 resultados, cada um com os
  botões Incluir e Excluir;
- **Concorrentes no início**: aparece só quando a carreira tem negócios rivais no ano. Tem os atalhos e um número
  exato de 0 a 12.

Com o cartão ligado, a lista antiga "Quantas e quais" é substituída, e o texto de ajuda do cartão avisa isso.

Na revisão:
- a linha "Situação inicial" mostra o status completo;
- a linha "No começo" mostra "14 · escolha da Nova run";
- uma linha nova, "Selos novos", mostra a frequência.

Cenário histórico apaga o campo no `buildRun27`, como no `start29` e no `rivals29`.

## Como funciona

As peças ficam em quatro arquivos:
- `src/sim/labels29gate.ts`: módulo-folha com os ganchos;
- `src/sim/labels29data.ts`: dados puros e o setter;
- `src/sim/sys/labels29start.ts`: lista inicial, porte e selos novos;
- `src/sim/sys/labels29ven.ts`: concorrentes da carreira.

Os pontos de contato com o código de sempre são guardas de uma linha:
- `worldgen.createGame` chama `LB29.prep`;
- o `setupLabels` usa `LB29.gen` para criar as inventadas, e com `labels29` não completa a lista com reais sorteadas;
- `lifecycle.newRivalLabel` retorna logo de início;
- `rivals.ts` desliga a falência e as fusões;
- `npc17` desliga as fusões e as aberturas de selo por NPCs.

### Quais gravadoras e quantas

1. **Antes do mundo** (`LB29.prep`): o número é o exato, ou o atalho sorteado pela semente, ou o tamanho da sugestão
   de sempre. As reais que existiam na data entram em fila. Na frente vêm as incluídas à força. Depois, o peso é:
   - a região escolhida (+6);
   - o porte (majors e catálogos primeiro no "misto"; indies primeiro em "muitas indies");
   - o núcleo histórico curado (+1,5);
   - a praça de casa;
   - a idade.

   As excluídas nunca entram. O mesmo nome real em duas entradas do catálogo conta uma vez.
2. A fila vira `cfg.labels.ids`, com o `count`. As reais fundadas depois do início continuam chegando nas datas reais,
   exceto na frequência "nenhuma".
3. **Inventadas** (`LB29.gen`, sorteio `labels29:semente:gen:i`) completam o que falta: quando não havia gravadoras
   reais suficientes na data (1889 só tem 2) ou quando a % de reais é menor. Os nomes seguem a moda da época, por
   exemplo:
   - "Laurel Phonograph Co.", "Sterling Talking Machine Co." (era fonográfica);
   - "Moonglow Records" (anos 20–40);
   - "Comet-Tone" (anos 50–60);
   - "Safety Pin Productions" (anos 70–80);
   - "Mixtape Recordings" (anos 90);
   - "Bedroom Collective" (2005 em diante);
   - "Discos X" no Brasil e na América Latina.

   A cidade vem da região escolhida, pesada pelo tamanho do mercado na época.
4. **Porte** (gancho `newgame` `labels29`, antes do `rivals29`):
   - "muitas indies": só a maior continua major, as outras majors viram médias com metade do caixa;
   - "poucas majors grandes": as 3 maiores viram majors mundiais e as indies crescem.

   O nível dos rivais escala o conjunto depois.

### Selos novos durante a run

O gancho mensal `labels29` usa um sorteio próprio, `labels29:semente:ano` (nunca o da partida):

- **quantos por ano**: Poisson com média dada pela frequência (rara 0,3 · normal 0,8 · frequente 2 · caótica 1,6),
  multiplicada por:
  - o **ritmo da run**, de 0,5 a 1,6×, sorteado uma vez por semente;
  - a **onda da época**:

    | Período | Multiplicador |
    |---|---|
    | antes de 1920 | ×0,5 |
    | depressão e guerra (1929–45) | ×0,35 |
    | boom indie (1950–62) | ×1,9 |
    | punk/indie (1977–85) | ×1,8 |
    | anos 90 | ×1,5 |
    | Napster (2000–04) | ×0,8 |
    | digital (2005 em diante) | ×1,9 |

  - o **humor do ano**: seca (15%, ×0,15), explosão (12%, ×2,2) ou normal (×0,6 a 1,4). A frequência caótica
    acrescenta deserto, explosão ×4 ou qualquer coisa no meio.
- os selos abrem em meses sorteados, com nome da época, praça da região escolhida e foco num gênero vivo. Eles
  aparecem na memória e numa notificação ("Novo rival: …"). O teto é de 90 gravadoras ativas.
- o selo independente de sempre do `lifecycle`, que usava o sorteio da partida a 8% ao mês, sai de cena: a frequência
  sorteada o substitui.
- as aberturas por personagens (`npc17`: estrela, empresário, executivo) e as reais nas datas reais continuam. Na
  frequência "nenhuma", as duas param.
- **fechamentos e fusões**: os mecanismos que já existiam continuam (falência no `rivals.ts`, `rival_merger`, fusões
  do `npc17`). Com a chave desligada, eles não acontecem: falência vira um socorro de US$ 50 mil (reais).

### Concorrentes da carreira

O gancho `labels29:ven` roda depois do `rivals29`. Ele ajusta os negócios rivais (`ventures9.npc`) do tipo da sua
carreira para o número escolhido, só se o tipo existe no ano:

| Tipo | Existe a partir de |
|---|---|
| estúdio | 1920 |
| agência | 1930 |
| festival | 1950 |
| plataforma | 2005 |
| editora | 1889 |
| mídia | 1900 |

Os donos são os selos rivais mais fortes primeiro. A reputação fica na faixa do nível dos rivais, ou 25–60 sem nível.
O primeiro negócio abre na sua cidade e os outros na sua praça ou na cidade do dono. Um número exato vence o nível dos
rivais: "0 concorrentes" com rivais gigantes dá 0.

## Números medidos

Gravadoras rivais ativas no começo, com nomes reais, semente `doc-<ano>`; entre parênteses, quantas são reais:

| Era | Poucas (3–5) | Algumas (6–10) | Muitas (11–20) | Mercado lotado (21–40) | Padrão |
|---|---|---|---|---|---|
| 1889 | 3 (2 reais) | 8 (2 reais) | 8 (2 reais) | 8 (2 reais) | 5 |
| 1925 | 4 (4 reais) | 7 (7 reais) | 17 (17 reais) | 22 (20 reais) | 5 |
| 1962 | 5 (5 reais) | 10 (10 reais) | 16 (16 reais) | 30 (30 reais) | 16 |
| 1990 | 5 (5 reais) | 10 (10 reais) | 15 (15 reais) | 22 (22 reais) | 29 |
| 2020 | 5 (5 reais) | 10 (10 reais) | 16 (16 reais) | 28 (28 reais) | 34 |

Selos novos em 40 anos (1950–1989), começo "algumas", em quatro runs (o ritmo das runs foi 0,80, 1,23, 0,71 e 0,89):

| Frequência | run s1 | run s2 | run s3 | run s4 | média/ano |
|---|---|---|---|---|---|
| Nenhuma | 0 | 0 | 0 | 0 | 0.00 |
| Rara | 8 | 27 | 9 | 14 | 0.36 |
| Normal | 31 | 59 | 27 | 35 | 0.95 |
| Frequente | 73 | 80 | 71 | 82 | 1.91 |
| Caótica | 80 | 62 | 83 | 82 | 1.92 |

Ondas da época, na frequência normal (média de 50 runs):

| Período | Selos novos por ano |
|---|---|
| anos 20 (1920–1928) | 0.85 |
| depressão e guerra (1930–1945) | 0.28 |
| pós-guerra (1946–1949) | 0.92 |
| boom indie dos 50 (1950–1962) | 1.70 |
| 1963–76 | 0.82 |
| punk/indie (1977–1985) | 1.52 |
| 1986–89 | 0.89 |
| anos 90 (1990–1999) | 1.33 |
| Napster/crise (2000–2004) | 0.67 |
| digital (2005–2025) | 1.65 |

Para comparar com o padrão: o selo independente do `lifecycle` só abre enquanto houver menos de 14 gravadoras ativas
(8% ao mês, cerca de 1 por ano). Na maioria dos mundos já há mais de 14 desde o início, e então ele nunca abre.

## Testes

`tests/r29-labels-start.test.ts` tem 9 testes:
- cada atalho fica na faixa limitada pela era e o mundo nasce com esse número (4 eras × 4 atalhos);
- a seleção é real-primeiro, e em 1889 as inventadas seguem a era fonográfica; com 50% de reais, metade é inventada;
- o padrão (sem campo, com campo vazio ou "padrão" na rápida) é idêntico byte a byte, inclusive depois de 2 meses
  jogados;
- a rápida produz a mesma `RunConfig` que a completa em 5 combinações, e o status sai como "Selo emergente · rivais
  gigantes · N gravadoras";
- cenário histórico tem precedência;
- os controles finos fazem efeito: porte (contagem de majors), região, incluir/excluir, fechamentos desligados e
  frequência "nenhuma" (que corta as reais do futuro e as aberturas por NPCs); o gancho de sempre fica desligado só
  com o campo;
- concorrentes da carreira: o atalho cai na faixa, o número exato 0 vence os gigantes, e não são criados antes de o
  tipo existir;
- frequência medida em 40 anos (nenhuma < rara < normal < frequente), ritmo diferente por run, ondas da época, secas e
  variância maior no modo caótico;
- 12 meses de jogo de verdade com frequência alta abrem exatamente os selos do plano;
- determinismo do mundo, do plano e do número.

Rodados, todos verdes:
- `tsc --noEmit`, sem erros;
- `r29-labels-start`, `r29-rivals-start`, `r27-home`, `r29-fixes`, `r29-reorg`, `r28-f4`, `r17-start`, `r23-scenarios`;
- `r16-lineups`, `r27-lineup`;
- `r10-labels`, `r22-newrun`, `r11-takeover-all`;
- `r27-p2a`, `r27-p2b`, `r27-m2`.

## Capturas

Ficam em `docs/shots29rivais/`, tiradas com Playwright em pt-BR, em 1440×900 e 390×844. O script é
`node scripts/r29/labels.mjs docs/shots29rivais 5181`.

- `gravadoras-rapida-{desk,mob}.png`: rápida em 1990, "Selo emergente · rivais gigantes · 10 gravadoras";
- `gravadoras-rapida-estudio-{desk,mob}.png`: carreira de estúdio com "Concorrentes no início: muitos";
- `gravadoras-completa-{desk,mob}.png`: o cartão na etapa 4, já com a escolha da rápida;
- `gravadoras-completa-fino-{desk,mob}.png`: número exato 14, poucas majors grandes e frequência frequente;
- `gravadoras-completa-incluir-{desk,mob}.png`: a busca "mo" com a Motown incluída;
- `gravadoras-revisao-{desk,mob}.png`: a revisão com "· 14 gravadoras · 6 estúdios rivais" e "Selos novos:
  Frequente";
- `gravadoras-jogo-desk.png`: partida iniciada com "mercado lotado", sem erro de página.

## Lacunas

- Com a escolha ligada, o "Quantas e quais" antigo (lista marcada e o seu controle deslizante) continua visível e é
  ignorado. O aviso está no texto de ajuda do cartão; não escondi a lista para não mexer no `newgameLabels`.
- A ordem "por porte/fama" das reais usa a família (major/catálogo/hit/indie), o núcleo histórico curado e a idade. O
  catálogo não tem tamanho ou faturamento real por ano, então há majors antigas que já tinham sido absorvidas (HMV e
  EMI em 1962, por exemplo) e entram juntas.
- Os selos novos sorteados não ganham um líder na hora, assim como o selo independente antigo. Também não têm elenco
  inicial: assinam pelo A&R de sempre.
- Fechamentos históricos (consolidação da era 1889) e compras feitas pelo jogador (`stakes8`, `business`) não são
  afetados pela chave "fechar e se fundir".
- Empresários e casas de shows rivais continuam fora, pelas mesmas razões do `rivals29`: são dados fixos.
