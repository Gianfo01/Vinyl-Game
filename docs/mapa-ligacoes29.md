# Mapa das ligações entre sistemas (R29 — "conectar tudo")

Medido pela sonda do jogo (`src/sim/probe29all.ts`): cada sistema recebe um "empurrão" (ex.: ficar pobre, ganhar fama, levar um escândalo) e mede-se o efeito em 12 outros sistemas, na mesma semente. **137 de 156 pares** estão ligados.

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
| **dinheiro** | · | — | ●● | ●●● | ●●● | ●●● | ● | ●●● | ●●● | ●●● | ●●● | ●●● | — |
| **reputacao** | ●● | · | ●● | ● | ●● | ●● | ● | — | ●● | ●●● | ●● | ● | — |
| **imprensa** | ●● | ●● | · | ●●● | ●●● | ● | ● | — | ●●● | ●● | ●●● | ●●● | ● |
| **projetos** | ●●● | ● | ●●● | · | ●● | — | ● | ●●● | ●●● | ●● | ●●● | ●● | ●● |
| **aovivo** | ●●● | ● | ●●● | ● | · | — | ●● | — | ●●● | ●● | ●● | ●● | ●● |
| **sede** | ●●● | — | ●●● | ●● | ●●● | · | ● | ● | ●● | ●●● | ● | ●●● | ● |
| **fama** | ●●● | ● | ●●● | ●●● | ●●● | ● | · | ● | ●●● | ●●● | ●●● | ●●● | ●● |
| **mundo** | ●● | ● | ●●● | ●●● | ●●● | ● | ● | · | ●●● | ● | ● | ●●● | ● |
| **vida** | ●● | — | ●●● | ●●● | ●●● | — | ●●● | — | · | ●● | ●● | ●● | ● |
| **contratos** | ●● | — | ●● | ●● | ●● | ● | — | ● | ●●● | · | ● | ●● | ● |
| **premios** | ●● | ● | ●●● | ●●● | ●●● | ●● | ●● | — | ●● | ●● | · | ●●● | ● |
| **submundo** | ●●● | ● | ●●● | ●●● | ● | ●● | ● | — | ●●● | ●●● | ● | · | ● |
| **publico** | ● | ● | ●● | ●●● | ●●● | — | ● | — | — | ●● | ●● | ●●● | · |

## Ligações por sistema

### Dinheiro e livro-caixa

Influencia 10 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -99.6% | `pobre→cabe_shows` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -97.6% | `pobre→cabe_adiant` |
| Sede, equipe e departamentos | ●●● forte | ↓ | -94.3% | `pobre→cabe_depto` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↓ | -93.7% | `pobre→cabe_gravar` |
| Submundo | ●●● forte | ↓ | -91.7% | `pobre→cabe_crime` |
| Prêmios e legado | ●●● forte | ↓ | -75.0% | `pobre→cabe_campanha` |
| Mundo, eras, tecnologia | ●●● forte | ↑ | 26.7% | `divulgacao→cena` |
| Vida pessoal e saúde | ●●● forte | ↑ | 14.0% | `pobre→estresse` |
| Imprensa, críticos e escândalos | ●● média | ↑ | 9.9% | `pobre→fatos` |
| Fama, fãs e facções | ● fraca | ↓ | -0.8% | `divulgacao→embalo` |

Sem ligação medida para: Reputação, Público por idade e região (demo29).

### Reputação

Influencia 10 sistemas · é influenciado por 8.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Contratos, promessas, rivais | ●●● forte | ↑ | 19.3% | `rep→oferta` |
| Vida pessoal e saúde | ●● média | ↓ | -9.3% | `rep→estresse` |
| Imprensa, críticos e escândalos | ●● média | ↓ | -8.5% | `rep→reacao` |
| Sede, equipe e departamentos | ●● média | ↑ | 6.7% | `rep→equipe` |
| Ao vivo, turnês e festivais | ●● média | ↑ | 6.5% | `rep→show` |
| Dinheiro e livro-caixa | ●● média | ↓ | -6.3% | `rep→receita` |
| Prêmios e legado | ●● média | ↑ | 5.4% | `rep→gramofone` |
| Submundo | ● fraca | ↓ | -2.3% | `rep→crime_q` |
| Fama, fãs e facções | ● fraca | ↑ | 0.6% | `rep→fama` |
| Projetos, composição, estúdio, lançamento | ● fraca | ↑ | 0.3% | `rep→gravacao` |

Sem ligação medida para: Mundo, eras, tecnologia, Público por idade e região (demo29).

### Imprensa, críticos e escândalos

Influencia 11 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Vida pessoal e saúde | ●●● forte | ↑ | 116.8% | `escandalo→estresse` |
| Submundo | ●●● forte | ↑ | 100.0% | `escandalo→calor` |
| Prêmios e legado | ●●● forte | ↓ | -19.6% | `escandalo→gramofone` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↓ | -13.6% | `escandalo→apelo` |
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -11.1% | `escandalo→show` |
| Contratos, promessas, rivais | ●● média | ↓ | -9.1% | `escandalo→oferta` |
| Dinheiro e livro-caixa | ●● média | ↑ | 7.3% | `escandalo→despesas` |
| Reputação | ●● média | ↓ | -3.4% | `escandalo→rep` |
| Público por idade e região (demo29) | ● fraca | ↑ | 2.9% | `escandalo→jovens` |
| Fama, fãs e facções | ● fraca | ↓ | -0.9% | `escandalo→fas` |
| Sede, equipe e departamentos | ● fraca | ↓ | -0.4% | `escandalo→equipe` |

Sem ligação medida para: Mundo, eras, tecnologia.

### Projetos, composição, estúdio, lançamento

Influencia 11 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 76.0% | `disco_lp→receita` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 37.5% | `qualidade→critica2` |
| Prêmios e legado | ●●● forte | ↑ | 29.8% | `qualidade→gramofone` |
| Vida pessoal e saúde | ●●● forte | ↓ | -13.7% | `qualidade→estresse_mes` |
| Mundo, eras, tecnologia | ●●● forte | ↑ | 12.0% | `disco_lp→cena` |
| Submundo | ●● média | ↑ | 7.7% | `qualidade→crime_pirata` |
| Ao vivo, turnês e festivais | ●● média | ↑ | 4.9% | `qualidade→show` |
| Público por idade e região (demo29) | ●● média | ↓ | -4.9% | `disco_lp→jovens` |
| Contratos, promessas, rivais | ●● média | ↑ | 4.8% | `qualidade→renova` |
| Fama, fãs e facções | ● fraca | ↑ | 1.3% | `qualidade→fama` |
| Reputação | ● fraca | ↑ | 0.7% | `qualidade→rep` |

Sem ligação medida para: Sede, equipe e departamentos.

### Ao vivo, turnês e festivais

Influencia 10 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 369.4% | `shows→receita_ja` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 100.0% | `shows→atencao` |
| Vida pessoal e saúde | ●●● forte | ↑ | 46.7% | `shows→estresse` |
| Submundo | ●● média | ↑ | 7.2% | `shows→crime_q` |
| Público por idade e região (demo29) | ●● média | ↑ | 6.8% | `turne_fora→fora` |
| Contratos, promessas, rivais | ●● média | ↓ | -6.1% | `shows→renova` |
| Prêmios e legado | ●● média | ↓ | -4.5% | `shows→gramofone` |
| Fama, fãs e facções | ●● média | ↑ | 3.2% | `shows→embalo` |
| Projetos, composição, estúdio, lançamento | ● fraca | ↑ | 2.0% | `shows→apelo` |
| Reputação | ● fraca | ↓ | -1.9% | `shows→rep` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia.

### Sede, equipe e departamentos

Influencia 11 sistemas · é influenciado por 8.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 184.7% | `sede→custos` |
| Submundo | ●●● forte | ↓ | -12.2% | `sede→crime_q` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 11.9% | `sede→fatos` |
| Contratos, promessas, rivais | ●●● forte | ↑ | 10.9% | `sede→oferta` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 10.1% | `sede→cabe_shows` |
| Projetos, composição, estúdio, lançamento | ●● média | ↑ | 8.0% | `sede→vendas` |
| Vida pessoal e saúde | ●● média | ↓ | -6.2% | `sede→estresse_mes` |
| Prêmios e legado | ● fraca | ↑ | 2.4% | `sede→gramofone` |
| Público por idade e região (demo29) | ● fraca | ↑ | 1.5% | `sede→jovens` |
| Mundo, eras, tecnologia | ● fraca | ↓ | -1.3% | `sede→gosto` |
| Fama, fãs e facções | ● fraca | ↑ | 0.8% | `sede→fama` |

Sem ligação medida para: Reputação.

### Fama, fãs e facções

Influencia 12 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 303.0% | `fama→show` |
| Dinheiro e livro-caixa | ●●● forte | ↑ | 219.4% | `fama→receita` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 108.2% | `fama→apelo` |
| Prêmios e legado | ●●● forte | ↑ | 39.5% | `fama→hall` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 38.7% | `fama→fatos` |
| Vida pessoal e saúde | ●●● forte | ↑ | 26.8% | `fama→estresse_mes` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -15.9% | `fama→renova` |
| Submundo | ●●● forte | ↑ | 13.8% | `fama→crime_q` |
| Público por idade e região (demo29) | ●● média | ↑ | 6.8% | `fama→fora` |
| Sede, equipe e departamentos | ● fraca | ↑ | 2.1% | `fama→equipe` |
| Mundo, eras, tecnologia | ● fraca | ↑ | 1.2% | `fama→gosto` |
| Reputação | ● fraca | ↓ | -0.7% | `fama→rep` |

### Mundo, eras, tecnologia

Influencia 12 sistemas · é influenciado por 5.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 60.0% | `moda→apelo` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 42.4% | `decada→gig` |
| Imprensa, críticos e escândalos | ●●● forte | ↓ | -20.3% | `decada→reacao` |
| Vida pessoal e saúde | ●●● forte | ↑ | 12.6% | `decada→estresse_mes` |
| Submundo | ●●● forte | ↑ | 11.0% | `decada→crime_q` |
| Dinheiro e livro-caixa | ●● média | ↑ | 5.5% | `decada→despesas` |
| Sede, equipe e departamentos | ● fraca | ↑ | 2.6% | `decada→equipe` |
| Prêmios e legado | ● fraca | ↑ | 2.4% | `moda→gramofone` |
| Fama, fãs e facções | ● fraca | ↓ | -0.9% | `decada→fas` |
| Reputação | ● fraca | ↓ | -0.8% | `decada→rep` |
| Contratos, promessas, rivais | ● fraca | ↓ | -0.8% | `decada→renova` |
| Público por idade e região (demo29) | ● fraca | ↓ | -0.6% | `decada→gosto_jovem` |

### Vida pessoal e saúde

Influencia 9 sistemas · é influenciado por 11.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 100.0% | `casamento→atencao` |
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -11.5% | `estresse→show` |
| Fama, fãs e facções | ●●● forte | ↑ | 11.2% | `casamento→famap` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 10.6% | `casamento→apelo` |
| Submundo | ●● média | ↑ | 7.5% | `estresse→crime_q` |
| Contratos, promessas, rivais | ●● média | ↓ | -7.2% | `estresse→renova` |
| Prêmios e legado | ●● média | ↓ | -5.5% | `estresse→gramofone` |
| Dinheiro e livro-caixa | ●● média | ↑ | 5.0% | `casamento→receita` |
| Público por idade e região (demo29) | ● fraca | ↑ | 1.1% | `casamento→fora` |

Sem ligação medida para: Reputação, Sede, equipe e departamentos, Mundo, eras, tecnologia.

### Contratos, promessas, rivais

Influencia 10 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Vida pessoal e saúde | ●●● forte | ↑ | 23.4% | `desconfianca→estresse` |
| Dinheiro e livro-caixa | ●● média | ↑ | 8.9% | `rival→receita` |
| Imprensa, críticos e escândalos | ●● média | ↑ | 8.8% | `desconfianca→fatos` |
| Projetos, composição, estúdio, lançamento | ●● média | ↓ | -5.9% | `desconfianca→gravacao` |
| Ao vivo, turnês e festivais | ●● média | ↓ | -5.9% | `desconfianca→show` |
| Submundo | ●● média | ↑ | 3.5% | `desconfianca→crime_q` |
| Sede, equipe e departamentos | ● fraca | ↓ | -2.1% | `jv→equipe` |
| Público por idade e região (demo29) | ● fraca | ↑ | 1.7% | `confianca→fora` |
| Mundo, eras, tecnologia | ● fraca | ↓ | -0.8% | `jv→gosto` |
| Prêmios e legado | ● fraca | ↓ | -0.7% | `desconfianca→gramofone` |

Sem ligação medida para: Reputação, Fama, fãs e facções.

### Prêmios e legado

Influencia 11 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 15.0% | `premios→vendas` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 12.3% | `premios→fatos` |
| Ao vivo, turnês e festivais | ●●● forte | ↑ | 12.0% | `premios→show` |
| Submundo | ●●● forte | ↑ | 10.0% | `premios→crime_chantagem` |
| Vida pessoal e saúde | ●● média | ↓ | -9.3% | `premios→estresse` |
| Contratos, promessas, rivais | ●● média | ↑ | 7.6% | `premios→oferta` |
| Fama, fãs e facções | ●● média | ↑ | 7.2% | `premios→fama` |
| Sede, equipe e departamentos | ●● média | ↑ | 4.3% | `premios→equipe` |
| Dinheiro e livro-caixa | ●● média | ↑ | 4.2% | `premios→receita` |
| Reputação | ● fraca | ↑ | 2.4% | `premios→rep` |
| Público por idade e região (demo29) | ● fraca | ↑ | 0.6% | `premios→fora` |

Sem ligação medida para: Mundo, eras, tecnologia.

### Submundo

Influencia 11 sistemas · é influenciado por 12.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Dinheiro e livro-caixa | ●●● forte | ↑ | 24.9% | `jaba→despesas` |
| Vida pessoal e saúde | ●●● forte | ↑ | 23.4% | `calor→estresse` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↑ | 14.0% | `jaba→vendas` |
| Contratos, promessas, rivais | ●●● forte | ↓ | -12.7% | `calor→oferta` |
| Imprensa, críticos e escândalos | ●●● forte | ↑ | 11.9% | `calor→reacao` |
| Sede, equipe e departamentos | ●● média | ↓ | -3.2% | `calor→equipe` |
| Ao vivo, turnês e festivais | ● fraca | ↓ | -1.6% | `jaba→cabe_shows` |
| Público por idade e região (demo29) | ● fraca | ↑ | 1.0% | `calor→jovens` |
| Fama, fãs e facções | ● fraca | ↑ | 0.8% | `calor→fama` |
| Prêmios e legado | ● fraca | ↓ | -0.8% | `calor→gramofone` |
| Reputação | ● fraca | ↓ | -0.7% | `calor→rep` |

Sem ligação medida para: Mundo, eras, tecnologia.

### Público por idade e região (demo29)

Influencia 9 sistemas · é influenciado por 10.

| Afeta | Força | Direção | Efeito medido | Como (empurrão → saída) |
|---|---|:-:|--:|---|
| Ao vivo, turnês e festivais | ●●● forte | ↓ | -25.5% | `velho→show` |
| Projetos, composição, estúdio, lançamento | ●●● forte | ↓ | -20.3% | `velho→apelo` |
| Submundo | ●●● forte | ↓ | -11.1% | `velho→crime_pirata` |
| Imprensa, críticos e escândalos | ●● média | ↓ | -7.7% | `velho→fatos` |
| Prêmios e legado | ●● média | ↑ | 5.5% | `velho→gramofone` |
| Contratos, promessas, rivais | ●● média | ↓ | -4.5% | `velho→oferta` |
| Reputação | ● fraca | ↑ | 1.1% | `velho→rep` |
| Dinheiro e livro-caixa | ● fraca | ↓ | -0.8% | `velho→receita` |
| Fama, fãs e facções | ● fraca | ↑ | 0.6% | `jovem→embalo` |

Sem ligação medida para: Sede, equipe e departamentos, Mundo, eras, tecnologia, Vida pessoal e saúde.

