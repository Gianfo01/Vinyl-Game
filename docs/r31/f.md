# R31 · onda 3 · F — conhecidos e conhecimento (medição)

Medição: `npx tsx scripts/r31/measure.ts --out docs/r31/f` (ligado) e com
`R31_SW="know31.rivals=false,know31.intim=false"` → `docs/r31/f-off` (desligado). 4 sementes × 5 eras × 36 meses,
robô realista. A base `base30.json` é a versão 30 (sem as ondas 0–3); a comparação que mede **só F** é ligado × desligado.
Números completos: `f.json` (ligado) e `f-off.json`/`f-off.md` (desligado); este arquivo é o resumo.

## Médias por era (base v30 | F desligado | F ligado)

| Era | Caixa real | Patrimônio real | Receita do último ano (real) | Lançamentos | Atos do mundo |
|---|---|---|---|---|---|
| 1900 | 64k \| 43k \| 43k | 1,59 mi \| 3,50 mi \| 3,50 mi | 568k \| 1,30 mi \| 1,30 mi | 14 \| 23 \| 23 | 210 \| 221 \| 221 |
| 1955 | −8k \| 13k \| 42k | 0,70 mi \| 1,06 mi \| 1,58 mi | 479k \| 555k \| 816k | 14 \| 11 \| 13 | 528 \| 497 \| 498 |
| 1990 | 91k \| 58k \| 67k | 2,87 mi \| 2,44 mi \| 2,38 mi | 953k \| 897k \| 901k | 10 \| 12 \| 12 | 1061 \| 1040 \| 1042 |
| 2012 | 175k \| 249k \| 135k | 11,9 mi \| 7,57 mi \| 7,49 mi | 3,54 mi \| 2,54 mi \| 2,05 mi | 30 \| 24 \| 21 | 1386 \| 1394 \| 1396 |
| 2030 | 529k \| 391k \| 294k | 10,6 mi \| 5,50 mi \| 6,41 mi | 3,87 mi \| 2,78 mi \| 3,01 mi | 22 \| 22 \| 24 | 1498 \| 1510 \| 1504 |

- **1900: idêntico** ligado e desligado — antes do rádio os rivais quase não contratam pelos caminhos que usavam o
  potencial real, e a intimidade ainda não pesa nas decisões do robô.
- **Demais eras: 10 de 20 partidas mudam.** Com `know31.rivals` ligado os rivais escolhem pelo que os olheiros deles
  sabem (ou pelo burburinho) em vez do potencial verdadeiro: erram mais em atos longe de casa, então talentos reais
  ficam livres por mais tempo e o mercado de contratação se embaralha. O efeito sobre o jogador não tem direção única
  (1955 e 2030 melhores, 2012 pior) — é a cadeia "quem o rival assinou" mudando, não uma regra que favoreça alguém.
  A fama do selo do jogador e o nº de atos ficam iguais (±1).
- **Desempenho:** mês médio 963 ms (desligado) × 915 ms (ligado) — dentro do ruído da máquina (a base v30, 8,8 s/mês,
  foi medida com a máquina muito mais carregada). O grafo social custa 0,5–1,8 ms por mês (mês social + ouvinte de
  fatos; `tests/r31-social.test.ts` imprime o número) e ~470 laços em 2 anos.
- **Save:** gzip médio 1,749 mi bytes (ligado) × 1,749 mi (desligado): o grafo (`soc31`) não aparece entre as 8 maiores
  chaves do x4.

## O que mudou para o jogador

- Ficha da pessoa › Relações: a relação com você em cinco dimensões e "como se conheceram"; "Pedir apresentação" a um
  amigo em comum. Quem nunca te viu: "Não te conhece" / "Conhece de nome" (sem número).
- Você › Conhecidos: lista filtrável (tipo, proximidade, forma de encontro, busca).
- Diretório, mapa e comparador mostram e ordenam só o que a sua empresa conhece/vê; segredos (estresse, obrigações entre
  terceiros, submundo, números de rivais, placar da negociação) só com o conhecimento certo; manchete revela em rótulo.
- Capturas: `docs/r31/shots/onda3-F-conhecidos.png`, `onda3-F-ficha-relacao.png`, `onda3-F-ficha-nao-conhece.png`.
