# Mapa das ligações entre sistemas (R29 — "conectar tudo")

Medido pela sonda do jogo (`src/sim/probe29all.ts`): cada sistema recebe um "empurrão" (ex.: ficar pobre, ganhar fama, levar um escândalo) e mede-se o efeito em 12 outros sistemas, na mesma semente. **114 de 156 pares** estão ligados.

Força: ●●● forte (efeito ≥ 10%), ●● média (≥ 3%), ● fraca (≥ 0,5%). Direção: ↑ o empurrão faz a saída subir, ↓ faz cair.

Fonte de dados para a wiki: `src/sim/connmap29.ts` (`SYSTEMS29` e `CONNMAP29`). Para regravar: `npx tsx scripts/probe29all.ts --write` e depois `npx tsx scripts/r29/connmap-md.ts`.

## Sistemas

- **Dinheiro e livro-caixa** (`dinheiro`)
- **Reputação** (`reputacao`)
- **Imprensa, críticos e escândalos** (`imprensa`)
- **Projetos, composição, estúdio, lançamento** (`projetos`)
- **Ao vivo, turnês e festivais** (`aovivo`)
- **Sede, equipe e departamentos** (`sede`)
- **Fama, fãs e facções** (`fama`)
- **Mundo, eras, tecnologia** (`mundo`)
- **Vida pessoal e saúde** (`vida`)
- **Contratos, promessas, rivais** (`contratos`)
- **Prêmios e legado** (`premios`)
- **Submundo** (`submundo`)
- **Público por idade e região (demo29)** (`publico`)

## Matriz (linha influencia coluna)

| de \ para | dinheiro | reputacao | imprensa | projetos | aovivo | sede | fama | mundo | vida | contratos | premios | submundo | publico |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **dinheiro** | · | — | ●● | ●●● | ●●● | ●●● | — | — | ●●● | ●●● | ●●● | ●●● | — |
| **reputacao** | ●● | · | ●● | ● | ●● | ●● | ● | — | ●● | ●●● | ●● | ● | — |
| **imprensa** | ●● | ●● | · | ●●● | ●●● | ● | ● | — | ●●● | ●● | ●●● | ●●● | ● |
| **projetos** | ●●● | ● | ●●● | · | ●● | — | ● | — | ●●● | ●● | ●●● | ●● | — |
| **aovivo** | ● | ● | ●●● | ● | · | — | ●● | — | ●●● | ●● | ●● | ●● | — |
| **sede** | ●●● | — | ●●● | ●● | ●●● | · | ● | ● | ●● | ●●● | ● | ●●● | — |
| **fama** | ●●● | ● | ●●● | ●●● | ●●● | — | · | — | ●●● | ●●● | ●●● | ●●● | ●● |
| **mundo** | ●● | ● | ●●● | ●●● | ●●● | ● | ● | · | ●●● | ●● | ● | ●●● | ●●● |
| **vida** | ●● | — | ●●● | ●● | ●●● | — | — | — | · | ●● | ●● | ●● | — |
| **contratos** | ●● | — | ●● | ●● | ●● | — | — | — | ●●● | · | ● | ●● | — |
| **premios** | ●● | ● | ●●● | ●●● | ●●● | — | ●● | — | — | ●● | · | — | ● |
| **submundo** | ●●● | ● | ●●● | ●●● | ● | — | — | — | ●●● | ●●● | ● | · | — |
| **publico** | ● | — | — | ●●● | ●●● | — | — | — | — | ●● | ●● | — | · |

## Ligações por sistema

### Dinheiro e livro-caixa

Influencia 8 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -99.6% | `pobre→cabe_shows` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -97.6% | `pobre→cabe_adiant` |
| Sede, equipe e departamentos | ●●● forte | ↓ | -94.3% | `pobre→cabe_depto` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↓ | -93.7% | `pobre→cabe_gravar` |
| Submundo | ●●● forte | ↓ | -91.7% | `pobre→cabe_crime` |
| Prêmios e legado | ●●● forte | ↓ | -75.0% | `pobre→cabe_campanha` |
| Vida pessoal e saúde | ●●● forte | ↑ | 14.0% | `pobre→estresse` |
| Imprensa, críticos e escândalos | ●● média | ↑ | 9.9% | `pobre→fatos` |

Sem ligação medida para: Reputação, Fama, fãs e facções, Mundo, eras, tecnologia, Público por idade e região (demo29).

### Reputação

Influencia 10 sistemas · é influenciado por 7.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Contratos, promessas, rivais | ●●● forte | ↑ | 19.3% | `rep→oferta` |
| Vida pessoal e saúde | ●● média | ↓ | -9.3% | `rep→estresse` |
| Imprensa, críticos e escândalos | ●● média | ↓ | -8.5% | `rep→reacao` |
| Sede, equipe e departamentos | ●● média | ↑ | 6.7% | `rep→equipe` |
| Ao vivo, turnês e festivais | ●● média | ↑ | 6.5% | `rep→show` |
| Dinheiro e livro-caixa | ●● média | ↓ | -6.2% | `rep→receita` |
| Prêmios e legado | ●● média | ↑ | 5.3% | `rep→gramofone` |
| Submundo | ● fraca | ↓ | -2.3% | `rep→crime_q` |
| Fama, fãs e facções | ● fraca | ↑ | 0.6% | `rep→fama` |
| Projetos, composição, estúdio, lançamento | ● fraca | ↑ | 0.3% | `rep→gravacao` |

Sem ligação medida para: Mundo, eras, tecnologia, Público por idade e região (demo29).

### Imprensa, críticos e escândalos

Influencia 11 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Vida pessoal e saúde | ●●● forte | ↑ | 116.8% | `escandalo→estresse` |
| Submundo | ●●● forte | ↑ | 100.0% | `escandalo→calor` |
| Prêmios e legado | ●●● forte | ↓ | -19.4% | `escandalo→gramofone` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↓ | -14.0% | `escandalo→apelo` |
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -11.5% | `escandalo→show` |
| Contratos, promessas, rivais | ●● média | ↓ | -9.1% | `escandalo→oferta` |
| Dinheiro e livro-caixa | ●● média | ↑ | 7.3% | `escandalo→despesas` |
| Reputação | ●● média | ↓ | -3.4% | `escandalo→rep` |
| Público por idade e região (demo29) | ● fraca | ↑ | 2.4% | `escandalo→fora` |
| Fama, fãs e facções | ● fraca | ↓ | -1.0% | `escandalo→fas` |
| Sede, equipe e departamentos | ● fraca | ↓ | -0.4% | `escandalo→equipe` |

Sem ligação medida para: Mundo, eras, tecnologia.

### Projetos, composição, estúdio, lançamento

Influencia 9 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 37.5% | `qualidade→critica2` |
| Prêmios e legado | ●●● forte | ↑ | 29.6% | `qualidade→gramofone` |
| Dinheiro e livro-caixa | ●●● forte | ↑ | 18.4% | `qualidade→receita` |
| Vida pessoal e saúde | ●●● forte | ↓ | -13.7% | `qualidade→estresse_mes` |
| Submundo | ●● média | ↑ | 7.7% | `qualidade→crime_pirata` |
| Ao vivo, turnês e festivais | ●● média | ↑ | 4.9% | `qualidade→show` |
| Contratos, promessas, rivais | ●● média | ↑ | 4.8% | `qualidade→renova` |
| Fama, fãs e facções | ● fraca | ↑ | 1.3% | `qualidade→fama` |
| Reputação | ● fraca | ↑ | 0.7% | `qualidade→rep` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia, Público por idade e região (demo29).

### Ao vivo, turnês e festivais

Influencia 9 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 100.0% | `shows→atencao` |
| Vida pessoal e saúde | ●●● forte | ↑ | 46.7% | `shows→estresse` |
| Submundo | ●● média | ↑ | 7.2% | `shows→crime_q` |
| Contratos, promessas, rivais | ●● média | ↓ | -6.1% | `shows→renova` |
| Prêmios e legado | ●● média | ↓ | -4.5% | `shows→gramofone` |
| Fama, fãs e facções | ●● média | ↑ | 3.2% | `shows→embalo` |
| Projetos, composição, estúdio, lançamento | ● fraca | ↑ | 2.0% | `shows→apelo` |
| Reputação | ● fraca | ↓ | -1.9% | `shows→rep` |
| Dinheiro e livro-caixa | ● fraca | ↓ | -1.6% | `shows→receita` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia, Público por idade e região (demo29).

### Sede, equipe e departamentos

Influencia 10 sistemas · é influenciado por 4.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 184.7% | `sede→custos` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 13.2% | `sede→fatos` |
| Submundo | ●●● forte | ↓ | -12.2% | `sede→crime_q` |
| Contratos, promessas, rivais | ●●● forte | ↑ | 10.9% | `sede→oferta` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 10.1% | `sede→cabe_shows` |
| Projetos, composição, estúdio, lançamento | ●● média | ↑ | 8.0% | `sede→vendas` |
| Vida pessoal e saúde | ●● média | ↓ | -6.2% | `sede→estresse_mes` |
| Prêmios e legado | ● fraca | ↑ | 2.4% | `sede→gramofone` |
| Mundo, eras, tecnologia | ● fraca | ↓ | -1.3% | `sede→gosto` |
| Fama, fãs e facções | ● fraca | ↑ | 0.7% | `sede→fama` |

Sem ligação medida para: Reputação, Público por idade e região (demo29).

### Fama, fãs e facções

Influencia 10 sistemas · é influenciado por 7.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 303.0% | `fama→show` |
| Dinheiro e livro-caixa | ●●● forte | ↑ | 220.3% | `fama→receita` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 108.2% | `fama→apelo` |
| Prêmios e legado | ●●● forte | ↑ | 39.5% | `fama→hall` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 39.1% | `fama→fatos` |
| Vida pessoal e saúde | ●●● forte | ↑ | 26.8% | `fama→estresse_mes` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -15.9% | `fama→renova` |
| Submundo | ●●● forte | ↑ | 14.1% | `fama→crime_q` |
| Público por idade e região (demo29) | ●● média | ↑ | 6.8% | `fama→fora` |
| Reputação | ● fraca | ↓ | -0.7% | `fama→rep` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia.

### Mundo, eras, tecnologia

Influencia 12 sistemas · é influenciado por 1.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Público por idade e região (demo29) | ●●● forte | ↓ | -60.5% | `decada→jovens` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 60.0% | `moda→apelo` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 42.4% | `decada→gig` |
| Imprensa, críticos e escândalos | ●●● forte | ↓ | -20.3% | `decada→reacao` |
| Vida pessoal e saúde | ●●● forte | ↑ | 12.6% | `decada→estresse_mes` |
| Submundo | ●●● forte | ↑ | 11.0% | `decada→crime_q` |
| Contratos, promessas, rivais | ●● média | ↑ | 5.7% | `decada→oferta` |
| Dinheiro e livro-caixa | ●● média | ↑ | 5.2% | `decada→despesas` |
| Sede, equipe e departamentos | ● fraca | ↑ | 2.6% | `decada→equipe` |
| Prêmios e legado | ● fraca | ↑ | 2.5% | `decada→gramofone` |
| Fama, fãs e facções | ● fraca | ↓ | -0.9% | `decada→fas` |
| Reputação | ● fraca | ↓ | -0.8% | `decada→rep` |

### Vida pessoal e saúde

Influencia 7 sistemas · é influenciado por 10.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 49.4% | `estresse→fatos` |
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -11.5% | `estresse→show` |
| Submundo | ●● média | ↑ | 7.5% | `estresse→crime_q` |
| Contratos, promessas, rivais | ●● média | ↓ | -7.2% | `estresse→renova` |
| Projetos, composição, estúdio, lançamento | ●● média | ↓ | -6.0% | `estresse→gravacao` |
| Dinheiro e livro-caixa | ●● média | ↓ | -5.9% | `estresse→receita` |
| Prêmios e legado | ●● média | ↓ | -5.5% | `estresse→gramofone` |

Sem ligação medida para: Reputação, Sede, equipe e departamentos, Fama, fãs e facções, Mundo, eras, tecnologia, Público por idade e região (demo29).

### Contratos, promessas, rivais

Influencia 7 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Vida pessoal e saúde | ●●● forte | ↑ | 23.4% | `desconfianca→estresse` |
| Imprensa, críticos e escândalos | ●● média | ↑ | 9.5% | `desconfianca→fatos` |
| Dinheiro e livro-caixa | ●● média | ↑ | 9.3% | `rival→receita` |
| Projetos, composição, estúdio, lançamento | ●● média | ↓ | -5.9% | `desconfianca→gravacao` |
| Ao vivo, turnês e festivais | ●● média | ↓ | -5.9% | `desconfianca→show` |
| Submundo | ●● média | ↑ | 3.5% | `desconfianca→crime_q` |
| Prêmios e legado | ● fraca | ↓ | -0.7% | `desconfianca→gramofone` |

Sem ligação medida para: Reputação, Sede, equipe e departamentos, Fama, fãs e facções, Mundo, eras, tecnologia, Público por idade e região (demo29).

### Prêmios e legado

Influencia 8 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 15.0% | `premios→vendas` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 12.9% | `premios→fatos` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 12.0% | `premios→show` |
| Contratos, promessas, rivais | ●● média | ↑ | 7.6% | `premios→oferta` |
| Fama, fãs e facções | ●● média | ↑ | 7.2% | `premios→fama` |
| Dinheiro e livro-caixa | ●● média | ↑ | 3.3% | `premios→receita` |
| Reputação | ● fraca | ↑ | 2.3% | `premios→rep` |
| Público por idade e região (demo29) | ● fraca | ↑ | 0.6% | `premios→fora` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia, Vida pessoal e saúde, Submundo.

### Submundo

Influencia 8 sistemas · é influenciado por 10.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 24.8% | `jaba→despesas` |
| Vida pessoal e saúde | ●●● forte | ↑ | 23.4% | `calor→estresse` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 14.0% | `jaba→vendas` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -12.7% | `calor→oferta` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 11.9% | `calor→reacao` |
| Ao vivo, turnês e festivais | ● fraca | ↓ | -1.6% | `jaba→cabe_shows` |
| Reputação | ● fraca | ↓ | -0.7% | `calor→rep` |
| Prêmios e legado | ● fraca | ↓ | -0.7% | `calor→gramofone` |

Sem ligação medida para: Sede, equipe e departamentos, Fama, fãs e facções, Mundo, eras, tecnologia, Público por idade e região (demo29).

### Público por idade e região (demo29)

Influencia 5 sistemas · é influenciado por 4.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -25.1% | `velho→show` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↓ | -20.0% | `velho→apelo` |
| Prêmios e legado | ●● média | ↑ | 5.5% | `velho→gramofone` |
| Contratos, promessas, rivais | ●● média | ↓ | -4.9% | `velho→oferta` |
| Dinheiro e livro-caixa | ● fraca | ↓ | -0.8% | `velho→receita` |

Sem ligação medida para: Reputação, Imprensa, críticos e escândalos, Sede, equipe e departamentos, Fama, fãs e facções, Mundo, eras, tecnologia, Vida pessoal e saúde, Submundo.

