# Medição de referência — versão 30 (W0-BASE)

Gerado por `npx tsx scripts/r31/measure.ts` (4 sementes × 5 eras, 36 meses cada, robô `playbot16` perfil equilibrado, selo, rock, base padrão).
Sementes: `r31-base-0`, `r31-base-1`, `r31-base-2`, `r31-base-3`. Eras de início: 1900, 1955, 1990, 2012, 2030 (antes do rádio, LP, 1990, streaming, futuro).
Máquina: Intel(R) Xeon(R) Processor @ 2.80GHz (4 núcleos), Node v22.22.0, 4 partidas em paralelo; tempo total 1643 s.

Os números de jogo (caixa, fama, atos, receita, tamanho do save, chaves em `x4`) são determinísticos: rodar de novo dá o mesmo resultado
(confira com `--compare docs/r31/base30.json`). Os tempos variam com a máquina e a carga: "ms/mês" é relógio (robô + virada do mês),
"CPU ms/mês" é o tempo de CPU do processo no mesmo trecho (inclui coleta de lixo; menos sensível a outros processos na máquina).

**Reprodutibilidade conferida:** uma 2ª execução completa (`--compare`) deu números de jogo e de save idênticos nas 20 partidas.
**Atenção aos tempos desta base:** a máquina estava compartilhada com outras suítes de teste rodando ao mesmo tempo (4 núcleos), por isso o
relógio por mês ficou bem acima da CPU por mês; para comparar ondas, prefira a coluna de CPU ou meça as duas versões na mesma condição.

## Desempenho e save por era (medianas das sementes; tempos = média)

| Era | Partidas | Criar (ms) | ms/mês média | ms/mês mediana | CPU ms/mês | Save JSON | Save gzip | Serializar (ms) | Chaves x4 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1900 | 4 | 3.022 | 1.994 | 1.922 | 334 | 3,40 MB | 0,66 MB | 375 | 255 |
| 1955 | 4 | 2.607 | 5.143 | 5.114 | 697 | 5,82 MB | 1,15 MB | 635 | 256 |
| 1990 | 4 | 2.553 | 7.980 | 6.383 | 1.331 | 9,88 MB | 1,96 MB | 1.366 | 257 |
| 2012 | 4 | 4.570 | 11.409 | 10.735 | 2.041 | 12,52 MB | 2,47 MB | 2.031 | 256 |
| 2030 | 4 | 3.305 | 17.564 | 16.067 | 2.347 | 12,28 MB | 2,35 MB | 1.904 | 257 |

## Balanço por era (medianas das sementes, US$ de 2020)

| Era | Caixa | Patrimônio | Fama | Atos do jogador | Receita do último ano | Partidas encerradas |
|---|---:|---:|---:|---:|---:|---:|
| 1900 | 86 mil | 1,38 mi | 27 | 3 | 436 mil | 1 |
| 1955 | -17 mil | 613 mil | 16 | 3 | 362 mil | 1 |
| 1990 | 97 mil | 2,74 mi | 17 | 3 | 954 mil | 0 |
| 2012 | 51 mil | 6,62 mi | 19 | 3 | 1,77 mi | 0 |
| 2030 | 448 mil | 8,38 mi | 20 | 4 | 2,64 mi | 0 |

## Todas as partidas

| Era | Semente | Fim | ms/mês (méd/p90/máx) | Save JSON | gzip | x4 | Caixa (US$ 2020) | Patrimônio | Fama | Rep. art./com. | Atos | Lançamentos | Nº 1 | Receita/ano (US$ 2020) | Encerrou |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---|
| 1900 | `r31-base-0` | 01/1903 | 2199/2842/4045 | 3,52 MB | 0,67 MB | 255 | 93 mil | 3,72 mi | 29 | 13/71 | 3 | 25 | 10 | 1900: 37 mil · 1901: 429 mil · 1902: 1,32 mi | não |
| 1900 | `r31-base-1` | 01/1903 | 2160/3509/3759 | 3,37 MB | 0,66 MB | 256 | 107 mil | 1,85 mi | 31 | 26/77 | 3 | 14 | 17 | 1900: 83 mil · 1901: 382 mil · 1902: 507 mil | não |
| 1900 | `r31-base-2` | 01/1903 | 2130/3098/4469 | 3,42 MB | 0,69 MB | 255 | 80 mil | 924 mil | 25 | 26/62 | 3 | 7 | 11 | 1900: 78 mil · 1901: 159 mil · 1902: 365 mil | não |
| 1900 | `r31-base-3` | 09/1901 | 1082/1559/2722 | 2,33 MB | 0,51 MB | 255 | -22 mil | -122 mil | 19 | 31/47 | 3 | 9 | 4 | 1900: 76 mil | insolvency |
| 1955 | `r31-base-0` | 01/1958 | 4889/6993/8865 | 5,83 MB | 1,15 MB | 256 | -47 mil | 1,65 mi | 17 | 71/42 | 3 | 9 | 0 | 1955: 57 mil · 1956: 202 mil · 1957: 966 mil | não |
| 1955 | `r31-base-1` | 06/1957 | 4852/6565/7410 | 5,91 MB | 1,32 MB | 256 | -7 mil | -82 mil | 15 | 63/39 | 3 | 18 | 0 | 1955: 89 mil · 1956: 225 mil | insolvency |
| 1955 | `r31-base-2` | 01/1958 | 5367/7304/8940 | 5,81 MB | 1,15 MB | 256 | -27 mil | 802 mil | 15 | 59/37 | 3 | 21 | 0 | 1955: 87 mil · 1956: 361 mil · 1957: 411 mil | não |
| 1955 | `r31-base-3` | 01/1958 | 5408/7757/10468 | 5,74 MB | 1,14 MB | 257 | 46 mil | 424 mil | 17 | 63/42 | 3 | 9 | 0 | 1955: 159 mil · 1956: 180 mil · 1957: 312 mil | não |
| 1990 | `r31-base-0` | 01/1993 | 6943/10899/14897 | 9,88 MB | 1,96 MB | 257 | 109 mil | 2,93 mi | 16 | 60/40 | 3 | 7 | 0 | 1990: 138 mil · 1991: 207 mil · 1992: 1,02 mi | não |
| 1990 | `r31-base-1` | 01/1993 | 8346/16040/21023 | 9,92 MB | 1,99 MB | 257 | 147 mil | 2,07 mi | 18 | 60/45 | 2 | 1 | 0 | 1990: 172 mil · 1991: 372 mil · 1992: 832 mil | não |
| 1990 | `r31-base-2` | 01/1993 | 8695/15612/20498 | 9,88 MB | 1,97 MB | 257 | 22 mil | 3,91 mi | 21 | 60/52 | 3 | 18 | 0 | 1990: 351 mil · 1991: 542 mil · 1992: 1,07 mi | não |
| 1990 | `r31-base-3` | 01/1993 | 7935/14064/18154 | 9,74 MB | 1,94 MB | 257 | 85 mil | 2,56 mi | 16 | 59/41 | 3 | 14 | 0 | 1990: 186 mil · 1991: 235 mil · 1992: 883 mil | não |
| 2012 | `r31-base-0` | 01/2015 | 11861/15549/18646 | 12,33 MB | 2,44 MB | 256 | 40 mil | 5,09 mi | 16 | 64/40 | 3 | 16 | 0 | 2012: 69 mil · 2013: 667 mil · 2014: 1,25 mi | não |
| 2012 | `r31-base-1` | 01/2015 | 12224/16212/23379 | 12,71 MB | 2,49 MB | 256 | -49 mil | 8,15 mi | 18 | 72/45 | 3 | 36 | 0 | 2012: 126 mil · 2013: 466 mil · 2014: 2,30 mi | não |
| 2012 | `r31-base-2` | 01/2015 | 11799/19131/22041 | 13,03 MB | 2,51 MB | 257 | 648 mil | 31,47 mi | 24 | 86/59 | 5 | 46 | 3 | 2012: 169 mil · 2013: 1,54 mi · 2014: 9,62 mi | não |
| 2012 | `r31-base-3` | 01/2015 | 9751/15128/15753 | 12,13 MB | 2,40 MB | 256 | 62 mil | 2,70 mi | 19 | 71/49 | 3 | 24 | 0 | 2012: 37 mil · 2013: 172 mil · 2014: 1.000 mil | não |
| 2030 | `r31-base-0` | 01/2033 | 15360/22063/26065 | 12,12 MB | 2,30 MB | 257 | 10 mil | 1,28 mi | 19 | 68/48 | 3 | 11 | 0 | 2030: 70 mil · 2031: 452 mil · 2032: 722 mil | não |
| 2030 | `r31-base-1` | 01/2033 | 19547/29067/34273 | 12,85 MB | 2,46 MB | 257 | 1,21 mi | 24,69 mi | 21 | 68/53 | 5 | 36 | 0 | 2030: 37 mil · 2031: 2,89 mi · 2032: 9,48 mi | não |
| 2030 | `r31-base-2` | 01/2033 | 16523/22630/29342 | 11,98 MB | 2,30 MB | 257 | 115 mil | 1,14 mi | 18 | 72/46 | 3 | 8 | 0 | 2030: 32 mil · 2031: 266 mil · 2032: 739 mil | não |
| 2030 | `r31-base-3` | 01/2033 | 18826/26779/30954 | 12,45 MB | 2,39 MB | 257 | 780 mil | 15,48 mi | 21 | 73/53 | 5 | 35 | 0 | 2030: 65 mil · 2031: 1,26 mi · 2032: 4,54 mi | não |

## Maiores blocos de `x4` no save (era 2030, mediana em bytes)

| Chave | Bytes |
|---|---:|
| `ch7` | 491.435 |
| `chron9` | 311.252 |
| `facts17` | 251.712 |
| `fame15` | 215.675 |
| `creation` | 145.783 |
| `leisure14` | 123.522 |
| `ag18` | 119.877 |
| `st28` | 103.761 |
| `fame16` | 100.710 |
| `fest8` | 92.855 |
| `hype12` | 78.471 |
| `people` | 77.913 |

## Como medir de novo

```sh
npx tsx scripts/r31/measure.ts --out docs/r31/base31 --label "versão 31"          # mesma grade, outra saída
npx tsx scripts/r31/measure.ts --out /tmp/rep --compare docs/r31/base30.json      # confere reprodutibilidade
node scripts/r31/measure-ui.mjs 5331 docs/r31/base30   # interface (sobe e derruba o vite sozinho)
```

<!-- measure-ui:início -->

## Interface (Playwright)

Gerado por `node scripts/r31/measure-ui.mjs` (Chromium, 1360×900, pt-BR). Partida criada pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA,
configuração padrão: label, 1962); depois 12 meses jogados pelo robô dentro da página (fim: 1/1963, 3 atos).
Tempos de relógio do clique até a tela pintada (dois quadros); variam com a máquina e a carga.

- Abrir o jogo (até a tela inicial): **11.170 ms**; criar a partida (clique em COMEÇAR até o menu): **1.125 ms**.
- Virar uma semana (botão ▷ Semana): média **267 ms** (338 / 250 / 277 / 205; cliques 2/1/1/1).
- Virar um mês (botão ▶ Avançar mês): média **848 ms** (770 / 946 / 827; cliques 1/2/3).
- Salvar (store.saveGame: serializar + gzip + IndexedDB): média **354 ms** (383 / 283 / 397); última divisão: serializar 197 ms, comprimir 195 ms, gravar 4 ms; JSON 5,51 MB → 1,17 MB.

### Tarefas comuns: cliques no percurso atual

Cada tarefa começa no Cockpit (Painel), sem janelas abertas. O percurso é o definido em `TASKS` no script.

| Tarefa | Cliques | Chegou | Tempo (ms) | Percurso |
|---|---:|---|---:|---|
| Abrir a ficha de um artista seu | 3 | sim | 1.174 | Pessoas → (Artistas: já aberto) → Los Cometas → Abrir ficha completa |
| Abrir as paradas | 3 | sim | 823 | Mundo → Paradas e mercado (hub) › Paradas |
| Marcar datas de shows (4 datas avulsas) | 2 | sim | 686 | Ao vivo → (Shows: já aberto) → (Agenda: já aberto) → Agendar 4 datas |
| Abrir o planejador de turnê (1ª etapa) | 2 | sim | 964 | Ao vivo → (Shows: já aberto) → Turnês |
| Abrir o estúdio | 2 | sim | 756 | Projetos → Estúdio |
| Abrir o projeto musical (fazer um disco) | 1 | sim | 350 | Projetos |
| Ver as finanças | 3 | sim | 811 | Gestão → Dinheiro (hub) › Finanças |
| Abrir a caixa de entrada | 1 | sim | 416 | (Cockpit: já aberto) → Caixa de entrada |
| Ver o mundo (mapa) | 3 | sim | 835 | Mundo → Mapa e política (hub) › Mundo |
| Procurar talentos | 3 | sim | 852 | Pessoas → Descobrir talentos (hub) › Talentos |
| Ver o calendário | 3 | sim | 802 | Gestão → Rumo e direitos (hub) › Calendário |
| Ler notícias e boatos | 2 | sim | 644 | Mundo → Notícias e boatos |
| Salvar o jogo com nome (Arquivo) | 3 | sim | 787 | Arquivo → Salvar como novo… → OK na janela do nome |

Total: 31 cliques em 13 tarefas concluídas (média 2,4).

### Seções do menu

| Seção | 1ª abertura, jogo novo (ms) | 1ª abertura, 12 meses (ms) | Seguintes, 12 meses (ms) | Elementos na tela |
|---|---:|---:|---:|---:|
| Cockpit | 51 | 91 | 35 | 249 |
| Sede | 117 | 105 | 136 | 280 |
| Pessoas | 63 | 112 | 87 | 433 |
| Projetos | 65 | 139 | 95 | 446 |
| Ao vivo | 64 | 110 | 61 | 420 |
| Mundo | 50 | 57 | 68 | 204 |
| Gestão | 52 | 56 | 50 | 371 |
| Você | 59 | 67 | 57 | 228 |

### Páginas do menu

| Seção › Página | 1ª abertura, jogo novo (ms) | 1ª abertura, 12 meses (ms) | Seguintes, 12 meses (ms) | Elementos na tela |
|---|---:|---:|---:|---:|
| Sede › Sua sede | 134 | 86 | 83 | 280 |
| Sede › Sede | 117 | 92 | 56 | 158 |
| Sede › Nosso mundo | 337 | 346 | 191 | 356 |
| Sede › Central | 76 | 161 | 37 | 486 |
| Sede › Metas | 28 | 27 | 36 | 65 |
| Sede › Diário da run | 32 | 61 | 60 | 353 |
| Pessoas › Artistas | 65 | 69 | 69 | 433 |
| Pessoas › Pessoas | 63 | 106 | 111 | 694 |
| Pessoas › Dinâmica | — | 144 | 75 | 147 |
| Pessoas › Mercado de contratos | 76 | 68 | 59 | 226 |
| Pessoas › Talentos | 87 | 83 | 68 | 584 |
| Pessoas › Artistas conhecidos | 193 | 112 | 105 | 952 |
| Pessoas › Todos os artistas | 123 | 103 | 94 | 915 |
| Pessoas › Talentos e formação | 50 | 95 | 53 | 327 |
| Pessoas › Gestão de artistas | 55 | 75 | 59 | 95 |
| Pessoas › Empresários | 156 | 80 | 63 | 591 |
| Pessoas › Produtores | 141 | 66 | 94 | 624 |
| Projetos › Projeto musical | 60 | 68 | 66 | 446 |
| Projetos › Composição | 128 | 167 | 157 | 1.210 |
| Projetos › Mercado de canções | 72 | 75 | 66 | 283 |
| Projetos › Estúdio | 47 | 146 | 149 | 1.699 |
| Projetos › Lançamentos | 53 | 85 | 55 | 312 |
| Projetos › Catálogo | 65 | 102 | 123 | 236 |
| Projetos › Tributos e covers | 39 | 63 | 57 | 253 |
| Projetos › Remix, anúncios e trilhas | 97 | 44 | 71 | 64 |
| Projetos › Estúdio e produtor | 47 | 69 | 64 | 70 |
| Projetos › Editora | 64 | 52 | 55 | 344 |
| Ao vivo › Shows | 45 | 200 | 61 | 420 |
| Ao vivo › Agenda de shows | 80 | 68 | 53 | 99 |
| Ao vivo › Agente e promotor | 45 | 61 | 50 | 112 |
| Ao vivo › Palco e temporada | 49 | 52 | 55 | 104 |
| Ao vivo › Festivais | 65 | 123 | 60 | 306 |
| Ao vivo › Premiações | 52 | 41 | 55 | 95 |
| Mundo › Este mês no mundo | 39 | 56 | 54 | 204 |
| Mundo › O que sabemos | 37 | 68 | 61 | 182 |
| Mundo › Notícias e boatos | 49 | 67 | 43 | 398 |
| Mundo › Paradas | 75 | 139 | 138 | 1.409 |
| Mundo › Gravadoras | 62 | 71 | 72 | 455 |
| Mundo › Indústria | 106 | 61 | 54 | 391 |
| Mundo › Mercados | 78 | 88 | 80 | 587 |
| Mundo › Mercado: certificados e cenas | 66 | 48 | 54 | 94 |
| Mundo › Mídia | 82 | 95 | 85 | 959 |
| Mundo › Críticos | 91 | 103 | 75 | 429 |
| Mundo › Imprensa e fanzines | 68 | 47 | 74 | 77 |
| Mundo › Veículos de mídia | 72 | 65 | 65 | 361 |
| Mundo › Mundo | 127 | 751 | 108 | 669 |
| Mundo › Mundo vivo | 42 | 42 | 58 | 216 |
| Mundo › Regiões e política | 51 | 39 | 45 | 81 |
| Mundo › Depois do palco | 37 | 32 | 45 | 116 |
| Mundo › Crime | 106 | 155 | 145 | 1.131 |
| Mundo › Fraudes e sósias | 53 | 40 | 50 | 103 |
| Mundo › Lendas | 51 | 67 | 51 | 247 |
| Mundo › Relações e movimentos | 42 | 35 | 35 | 93 |
| Mundo › Sociedade | 38 | 41 | 53 | 104 |
| Mundo › Diário do Mestre | 35 | 74 | 55 | 296 |
| Gestão › Gravadora | 50 | 72 | 58 | 371 |
| Gestão › Finanças | 68 | 80 | 59 | 228 |
| Gestão › Negócios | 75 | 115 | 66 | 219 |
| Gestão › Cadeia física & acordos | 89 | 49 | 91 | 183 |
| Gestão › Agenda e contratações | 59 | 59 | 55 | 196 |
| Gestão › Equipe e ritmo | 52 | 131 | 82 | 335 |
| Gestão › Empresa | 57 | 81 | 83 | 463 |
| Gestão › Crises, seguros e cultura | 86 | 52 | 47 | 66 |
| Gestão › Rumo do selo | 54 | 60 | 68 | 249 |
| Gestão › Calendário | 145 | 115 | 115 | 627 |
| Gestão › Direitos | 76 | 61 | 67 | 192 |
| Gestão › Carreiras | 117 | 63 | 82 | 160 |
| Gestão › Empreendimentos | 55 | 76 | 66 | 360 |
| Gestão › Sociedades | 32 | 31 | 40 | 67 |
| Você › Você | 59 | 73 | 52 | 228 |
| Você › Vida pessoal | 104 | 57 | 45 | 140 |
| Você › Patrimônio e investimentos | 62 | 63 | 65 | 227 |
| Você › Noite e encontros | 55 | 88 | 59 | 189 |
| Você › Álbum de cenas | 37 | 47 | 52 | 118 |
| Você › Ajuda e tutorial | 81 | 81 | 50 | 800 |

Média da 1ª abertura de página (12 meses): **91 ms** em 75 páginas; mais lentas: Mundo (751 ms), Nosso mundo (346 ms), Shows (200 ms), Composição (167 ms), Central (161 ms).

<!-- measure-ui:fim -->
