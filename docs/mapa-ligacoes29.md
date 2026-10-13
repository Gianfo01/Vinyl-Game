# Mapa das ligações entre sistemas (R29 — "conectar tudo")

Medido pela sonda do jogo (`src/sim/probe29all.ts`): cada sistema recebe um "empurrão" (ex.: ficar pobre, ganhar fama, levar um escândalo) e mede-se o efeito em 11 outros sistemas, na mesma semente. **104 de 132 pares** estão ligados.

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

## Matriz (linha influencia coluna)

| de \ para | dinheiro | reputacao | imprensa | projetos | aovivo | sede | fama | mundo | vida | contratos | premios | submundo |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **dinheiro** | · | — | ● | ●●● | ●●● | ●●● | — | — | ●●● | ●●● | ●●● | ●●● |
| **reputacao** | ●●● | · | ●● | ● | ●● | ●● | ● | — | ●● | ●●● | ●● | ● |
| **imprensa** | ●● | ●● | · | ●●● | ●● | ● | ● | — | ●●● | ●● | ●● | ●●● |
| **projetos** | ●●● | ● | ●●● | · | ●● | — | ● | — | ●●● | ●● | ●●● | ●● |
| **aovivo** | ●●● | — | ●●● | ● | · | — | ● | — | ●●● | ●● | ●● | ●● |
| **sede** | ●●● | — | ●● | ●● | ●● | · | ● | ● | ●● | ●●● | ● | ●●● |
| **fama** | ●●● | ● | ●●● | ●●● | ●●● | — | · | — | ●● | ●●● | ●●● | ●●● |
| **mundo** | ●● | ● | ●●● | ●●● | ●●● | ● | ●● | · | ●● | ●● | — | ●●● |
| **vida** | ● | — | ●●● | ●● | ●● | — | ● | — | · | ●● | ●● | ●● |
| **contratos** | ●● | — | ●● | ●● | ●● | — | — | — | ●●● | · | ● | ●● |
| **premios** | ●● | ● | ● | ●●● | ●●● | — | ●● | — | — | ●● | · | — |
| **submundo** | ●●● | ● | ●●● | ●●● | ● | — | — | — | ●●● | ●●● | ● | · |

## Ligações por sistema

### Dinheiro e livro-caixa

Influencia 8 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -99.6% | `pobre→cabe_shows` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -97.6% | `pobre→cabe_adiant` |
| Sede, equipe e departamentos | ●●● forte | ↓ | -94.3% | `pobre→cabe_depto` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↓ | -93.7% | `pobre→cabe_gravar` |
| Submundo | ●●● forte | ↓ | -91.7% | `pobre→cabe_crime` |
| Prêmios e legado | ●●● forte | ↓ | -75.0% | `pobre→cabe_campanha` |
| Vida pessoal e saúde | ●●● forte | ↑ | 13.8% | `pobre→estresse` |
| Imprensa, críticos e escândalos | ● fraca | ↑ | 2.4% | `pobre→critica2` |

Sem ligação medida para: Reputação, Fama, fãs e facções, Mundo, eras, tecnologia.

### Reputação

Influencia 10 sistemas · é influenciado por 6.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Contratos, promessas, rivais | ●●● forte | ↑ | 20.2% | `rep→oferta` |
| Dinheiro e livro-caixa | ●●● forte | ↓ | -13.4% | `rep→receita` |
| Vida pessoal e saúde | ●● média | ↓ | -9.2% | `rep→estresse` |
| Imprensa, críticos e escândalos | ●● média | ↓ | -7.8% | `rep→reacao` |
| Sede, equipe e departamentos | ●● média | ↑ | 6.7% | `rep→equipe` |
| Ao vivo, turnês e festivais | ●● média | ↑ | 6.5% | `rep→show` |
| Prêmios e legado | ●● média | ↑ | 4.7% | `rep→gramofone` |
| Submundo | ● fraca | ↓ | -2.4% | `rep→crime_q` |
| Fama, fãs e facções | ● fraca | ↑ | 0.6% | `rep→fama` |
| Projetos, composição, estúdio, lançamento | ● fraca | ↑ | 0.3% | `rep→gravacao` |

Sem ligação medida para: Mundo, eras, tecnologia.

### Imprensa, críticos e escândalos

Influencia 10 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Vida pessoal e saúde | ●●● forte | ↑ | 101.5% | `escandalo→estresse` |
| Submundo | ●●● forte | ↑ | 100.0% | `escandalo→calor` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 12.0% | `resenha→vendas` |
| Ao vivo, turnês e festivais | ●● média | ↓ | -9.4% | `escandalo→show` |
| Contratos, promessas, rivais | ●● média | ↓ | -7.6% | `escandalo→renova` |
| Dinheiro e livro-caixa | ●● média | ↑ | 6.9% | `escandalo→despesas` |
| Prêmios e legado | ●● média | ↓ | -5.5% | `escandalo→gramofone` |
| Reputação | ●● média | ↓ | -3.0% | `escandalo→rep` |
| Fama, fãs e facções | ● fraca | ↑ | 0.8% | `escandalo→embalo` |
| Sede, equipe e departamentos | ● fraca | ↓ | -0.3% | `escandalo→equipe` |

Sem ligação medida para: Mundo, eras, tecnologia.

### Projetos, composição, estúdio, lançamento

Influencia 9 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 36.6% | `qualidade→critica2` |
| Prêmios e legado | ●●● forte | ↑ | 26.1% | `qualidade→gramofone` |
| Dinheiro e livro-caixa | ●●● forte | ↑ | 20.0% | `qualidade→receita` |
| Vida pessoal e saúde | ●●● forte | ↓ | -12.0% | `qualidade→estresse_mes` |
| Submundo | ●● média | ↑ | 7.8% | `qualidade→crime_pirata` |
| Contratos, promessas, rivais | ●● média | ↑ | 5.1% | `qualidade→renova` |
| Ao vivo, turnês e festivais | ●● média | ↑ | 5.0% | `qualidade→show` |
| Fama, fãs e facções | ● fraca | ↑ | 1.4% | `qualidade→fama` |
| Reputação | ● fraca | ↑ | 0.7% | `qualidade→rep` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia.

### Ao vivo, turnês e festivais

Influencia 8 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 100.0% | `shows→atencao` |
| Vida pessoal e saúde | ●●● forte | ↑ | 66.2% | `shows→estresse` |
| Dinheiro e livro-caixa | ●●● forte | ↓ | -35.5% | `shows→receita` |
| Submundo | ●● média | ↑ | 9.3% | `shows→crime_q` |
| Contratos, promessas, rivais | ●● média | ↓ | -6.5% | `shows→renova` |
| Prêmios e legado | ●● média | ↓ | -5.1% | `shows→gramofone` |
| Projetos, composição, estúdio, lançamento | ● fraca | ↑ | 1.9% | `shows→apelo` |
| Fama, fãs e facções | ● fraca | ↑ | 0.9% | `shows→embalo` |

Sem ligação medida para: Reputação, Sede, equipe e departamentos, Mundo, eras, tecnologia.

### Sede, equipe e departamentos

Influencia 10 sistemas · é influenciado por 4.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 184.7% | `sede→custos` |
| Submundo | ●●● forte | ↓ | -12.2% | `sede→crime_q` |
| Contratos, promessas, rivais | ●●● forte | ↑ | 10.9% | `sede→oferta` |
| Ao vivo, turnês e festivais | ●● média | ↑ | 10.0% | `sede→show` |
| Projetos, composição, estúdio, lançamento | ●● média | ↑ | 8.0% | `sede→vendas` |
| Vida pessoal e saúde | ●● média | ↓ | -8.0% | `sede→estresse_mes` |
| Imprensa, críticos e escândalos | ●● média | ↓ | -7.8% | `sede→reacao` |
| Prêmios e legado | ● fraca | ↑ | 2.2% | `sede→gramofone` |
| Mundo, eras, tecnologia | ● fraca | ↑ | 0.8% | `sede→gosto` |
| Fama, fãs e facções | ● fraca | ↑ | 0.7% | `sede→fama` |

Sem ligação medida para: Reputação.

### Fama, fãs e facções

Influencia 9 sistemas · é influenciado por 8.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 303.0% | `fama→show` |
| Dinheiro e livro-caixa | ●●● forte | ↑ | 217.7% | `fama→receita` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 108.2% | `fama→apelo` |
| Prêmios e legado | ●●● forte | ↑ | 39.5% | `fama→hall` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 27.0% | `fama→fatos` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -16.5% | `fama→renova` |
| Submundo | ●●● forte | ↑ | 14.6% | `fama→crime_q` |
| Vida pessoal e saúde | ●● média | ↓ | -5.1% | `fama→estresse_mes` |
| Reputação | ● fraca | ↑ | 0.7% | `fama→rep` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia.

### Mundo, eras, tecnologia

Influencia 10 sistemas · é influenciado por 1.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 60.0% | `moda→apelo` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 42.4% | `decada→gig` |
| Imprensa, críticos e escândalos | ●●● forte | ↓ | -19.6% | `decada→reacao` |
| Submundo | ●●● forte | ↑ | 11.4% | `decada→crime_q` |
| Dinheiro e livro-caixa | ●● média | ↑ | 9.4% | `decada→despesas` |
| Contratos, promessas, rivais | ●● média | ↑ | 5.7% | `decada→oferta` |
| Fama, fãs e facções | ●● média | ↓ | -3.3% | `decada→embalo` |
| Vida pessoal e saúde | ●● média | ↑ | 3.0% | `decada→estresse_mes` |
| Sede, equipe e departamentos | ● fraca | ↑ | 2.6% | `decada→equipe` |
| Reputação | ● fraca | ↓ | -0.8% | `decada→rep` |

Sem ligação medida para: Prêmios e legado.

### Vida pessoal e saúde

Influencia 8 sistemas · é influenciado por 10.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 15.8% | `estresse→fatos` |
| Submundo | ●● média | ↑ | 9.1% | `estresse→crime_q` |
| Contratos, promessas, rivais | ●● média | ↓ | -7.6% | `estresse→renova` |
| Projetos, composição, estúdio, lançamento | ●● média | ↓ | -6.0% | `estresse→gravacao` |
| Ao vivo, turnês e festivais | ●● média | ↓ | -5.9% | `estresse→show` |
| Prêmios e legado | ●● média | ↓ | -5.2% | `estresse→gramofone` |
| Dinheiro e livro-caixa | ● fraca | ↑ | 1.3% | `estresse→despesas` |
| Fama, fãs e facções | ● fraca | ↓ | -1.1% | `estresse→embalo` |

Sem ligação medida para: Reputação, Sede, equipe e departamentos, Mundo, eras, tecnologia.

### Contratos, promessas, rivais

Influencia 7 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Vida pessoal e saúde | ●●● forte | ↑ | 23.1% | `desconfianca→estresse` |
| Dinheiro e livro-caixa | ●● média | ↓ | -9.5% | `desconfianca→receita` |
| Projetos, composição, estúdio, lançamento | ●● média | ↓ | -4.0% | `desconfianca→gravacao` |
| Ao vivo, turnês e festivais | ●● média | ↓ | -4.0% | `desconfianca→show` |
| Imprensa, críticos e escândalos | ●● média | ↑ | 3.7% | `rival→critica2` |
| Submundo | ●● média | ↑ | 3.6% | `desconfianca→crime_q` |
| Prêmios e legado | ● fraca | ↓ | -1.2% | `desconfianca→gramofone` |

Sem ligação medida para: Reputação, Sede, equipe e departamentos, Fama, fãs e facções, Mundo, eras, tecnologia.

### Prêmios e legado

Influencia 7 sistemas · é influenciado por 10.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 15.0% | `premios→vendas` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 12.0% | `premios→show` |
| Contratos, promessas, rivais | ●● média | ↑ | 8.0% | `premios→oferta` |
| Fama, fãs e facções | ●● média | ↑ | 7.2% | `premios→fama` |
| Dinheiro e livro-caixa | ●● média | ↑ | 4.2% | `premios→despesas` |
| Reputação | ● fraca | ↑ | 0.7% | `premios→rep` |
| Imprensa, críticos e escândalos | ● fraca | ↑ | 0.5% | `premios→fatos` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia, Vida pessoal e saúde, Submundo.

### Submundo

Influencia 8 sistemas · é influenciado por 10.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 25.4% | `jaba→despesas` |
| Vida pessoal e saúde | ●●● forte | ↑ | 23.1% | `calor→estresse` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 14.0% | `jaba→vendas` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -13.3% | `calor→oferta` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 11.8% | `calor→reacao` |
| Ao vivo, turnês e festivais | ● fraca | ↓ | -1.6% | `jaba→cabe_shows` |
| Prêmios e legado | ● fraca | ↓ | -1.2% | `calor→gramofone` |
| Reputação | ● fraca | ↓ | -0.7% | `calor→rep` |

Sem ligação medida para: Sede, equipe e departamentos, Fama, fãs e facções, Mundo, eras, tecnologia.

