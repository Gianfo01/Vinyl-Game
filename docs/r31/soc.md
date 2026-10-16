# SOC · Sócios e compras (onda 3)

Medição: `npx tsx scripts/r31/measure.ts --jobs 3 --out docs/r31/soc --label "soc" --compare docs/r31/base30.json`
(interruptor `soc31` ligado, padrão) e `… --out docs/r31/soc-off --sw soc31=false --compare docs/r31/soc.json`
(desligado). 4 sementes × 5 eras × 36 meses, robô realista.

## Números

**Ligado × desligado: idênticos.** As 20 partidas têm o bloco de jogo igual (caixa, patrimônio, fama, receita, atos,
nº 1, pessoas, selos, razão…); só o save muda 13 bytes (a linha `"soc31":false` dos interruptores). Motivo: o
robô não compra participação nem cria negócio em conjunto, e o fechamento do mês das sociedades não faz nada (nem
consome sorte do fluxo `socio31`) quando você não tem participação. Nenhuma regra do mundo NPC mudou.

Contra `base30.json` (versão 30, antes das ondas 0–3), mediana das 4 sementes, dólares de 2020 — a diferença vem das
ondas já juntadas (mercado, bolsa, paradas, resultados…), não da SOC:

| Era | Patrimônio (agora / v30) | Caixa | Receita do último ano | Atos | CPU ms/mês (ligado / desligado / v30) | Save |
|---|---|---|---|---|---|---|
| 1900 | 4.581 mil / 1.385 mil | 102 mil / 86 mil | 1.816 mil / 436 mil | 3 / 3 | 331 / 360 / 326 | 3,7 MB / 3,2 MB |
| 1955 | 206 mil / 613 mil | −10 mil / −17 mil | 199 mil / 362 mil | 2 / 3 | 690 / 728 / 706 | 5,7 MB / 5,6 MB |
| 1990 | 2.682 mil / 2.744 mil | −13 mil / 97 mil | 1.111 mil / 954 mil | 3 / 3 | 1.550 / 1.630 / 1.352 | 10,0 MB / 9,4 MB |
| 2012 | 13.322 mil / 6.620 mil | 644 mil / 51 mil | 5.415 mil / 1.774 mil | 5 / 3 | 2.231 / 2.292 / 2.084 | 12,8 MB / 11,9 MB |
| 2030 | 6.513 mil / 8.378 mil | 219 mil / 448 mil | 2.280 mil / 2.638 mil | 4 / 4 | 2.608 / 2.388 / 2.354 | 12,5 MB / 11,7 MB |

Custo da SOC: nenhum sem participação (o gancho do mês sai na primeira linha). Com participação: uma conta por
negócio seu por mês (valor, divisão, o que o sócio faz). A lista do mercado (`targets31`, ~120 negócios em 1990) é
montada só quando a tela abre.

Num jogo com participação (teste `r31-socios`, 1990): uma casa comprada a 30% e depois 100% rende pelo projeto
`soc:<id>` nos resultados por projeto; o fechamento de resultados (`results31Balance`) continua sem desvio.

## O que mudou para o jogador

- **Comprar existente, inteiro ou parte**: Negócios › *Sócios e compras* lista festivais do catálogo, casas reais
  (as que ainda não são suas), emissoras de rádio e estúdios reais da época, com dono, valor, preço da fatia (10%,
  25%, 49%, 51% ou tudo) e "Aceita negociar — por quê" (opinião do dono, intimidade, conhecidos em comum, rivalidade,
  necessidade de dinheiro, peso de passar o controle). Lendários (prestígio ≥ 88) só vendem até 49%; os maiores
  (≥ 94) nunca. Paga pelo selo ou com o dinheiro pessoal.
- **Preço pelo modelo da bolsa**: o que rende × múltiplo, prestígio e público, histórico, dívidas (fato / cálculo /
  hipótese) e o mesmo prêmio de controle de `dealValue31`. A ficha mostra "Por que vale isso".
- **Ser sócio**: voto pela participação em preço, line-up/programação, data (festival) e investimento; o acordo diz
  quem decide cada assunto. Discordar mexe na opinião do sócio e na tensão. Lucro e prejuízo do mês divididos na
  mesma proporção (dividendo ou aporte), no selo (resultados por projeto) ou no seu bolso (extrato pessoal).
- **Sócio NPC age**: propõe votações (pendência no menu; sem resposta em 3 semanas, conta sem você), pede para sair
  (você compra a parte dele ou ele vende a um estranho), briga em público quando a tensão passa de 75 (o mês
  seguinte rende menos).
- **Criar em conjunto** com selo rival, prefeitura, marca patrocinadora ou casa de shows parceira: sua parte (20–80%),
  quem decide o quê, cláusula de saída; cada um paga a sua parte da abertura. O parceiro responde pela mesma conta
  (recusa acordo em que você quer tudo). Renegociável na ficha do negócio.
- **Vender**: ao sócio (preço cheio) ou ao mercado (−10%, entra um sócio novo), respeitando a preferência do acordo.
- **Onde**: Negócios › Sócios e compras; ficha da empresa › Mais › *Negócios e sócios* (sua: participações; rival:
  o que ele tem para vender); painel rápido da cidade (*Comprar parte de festival, casa, rádio ou estúdio*). Toda
  ação travada mostra o motivo e o que fazer antes do clique.
- **Valor da empresa**: participações do selo entram como "Participações em negócios" na ficha "Por que vale isso".
- **Editor**: interruptor e campo "Sócios e compras ligado", dar 25% de um negócio, tirar uma participação, fechar o
  mês das sociedades, tensão com os sócios.

## Pendências (fora deste item)

- Dono, sócio e parceiro ainda não aparecem no interior do lugar nem no terreno da cidade (UNI-4 / H da onda 4).
- A renegociação usa o formulário da ficha, não a cena de negociação da onda 2 (V).
- Festival comprado continua sendo operado pelo dono (o seu festival próprio de fest12 segue como antes); comprar
  100% dá todas as decisões e todo o resultado, mas não o transforma num festival de terreno.

Capturas: `docs/r31/shots/onda3-soc-*.png` (`scripts/shots31soc.mjs`).
