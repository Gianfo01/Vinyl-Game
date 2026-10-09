# Equilíbrio R16 — testes jogando de fato

## O bot jogador (`src/sim/playbot16.ts`)
`simulatePlayer(cfg, anos, perfil)` com perfis `cautious | balanced | aggressive`. Usa só as funções que os botões chamam:
scouting (aprofundar + pedido de scout quando o radar só tem estrelas caras), proposta com negociação (royalty/controle criativo,
aceita contraproposta), projeto musical (formato, conceito, produtor, verba, intenção), "Gravar agora", programar lançamento ou
rollout com marketing, turnê pela rota sugerida com produção do tamanho do ato, festivais (pitch/convites), sync, contratação
(incl. agente de shows e promotor com ordens permanentes), empréstimo/cortes, renovações, cartas de decisão lidas pelo texto
das opções, encomendas e vida pessoal (mentoria, festas, terapia) com o tempo livre. Teste: `tests/r16-playbot.test.ts`.

## Problemas de fluxo achados jogando (Playwright, 1975 e 2005, ~30 meses) e corrigidos
- **"Gravar agora" recusava** por causa da própria agenda do ato ("Agenda de X 91%"): a sessão agora toma o lugar da agenda do mês
  (gravação automática primeiro), com aviso de quantos itens saíram (`fitOverAgenda` em capacity.ts).
- **Turnê recusava** pelo mesmo motivo ("Agenda 97%"): mesma correção em `planTour`.
- **Rota de turnê era adivinhação no mapa** (o script marcou cidades sem público, logística de $10,9 mil para $4 mil de bilheteria):
  botão "Sugerir rota (maior procura)" (`src/sim/route16.ts`), só cidades que valem a viagem e produção/equipe proporcionais ao ato.
- **O planejador não dizia o que sobra para o selo**: linha "Para o selo: −$X" (contrato clássico: bilheteria é do artista) e alerta
  quando passa de 1/4 do caixa.
- **Sync não aparecia no Ir para… (Ctrl K)**: abas extras (Sync, Disputas...) agora entram na paleta.
- Bugs do próprio bot achados no caminho: verba de rádio do promotor em centavos (100×), contratar funções que o mercado não oferecia.

## Números (16 seeds × perfil × 8 anos; main = 1960/1975/1990/2005, late = 2012/2018 × 6 seeds; caixa final em US$ de 2020)

| perfil | antes: quebra main | antes: mediana main | antes: mediana late | depois: quebra main | depois: mediana main | depois: mediana late |
|---|---|---|---|---|---|---|
| bot antigo (thin) | 44% | 11,9 mil | −5 mil (67% quebra) | — | — | — |
| cautious | 0% | 1,83 mi | 10,6 mi | 0% (n=15) | 1,08 mi | (não rodado) |
| balanced | 0% | 277 mil | 3,82 mi | 6% | 254 mil | 2,76 mi |
| aggressive | 0% | 232 mil | 1,05 mi | (não rodado) | — | — |

Por início (balanced, antes → depois): 1960 169k→214k · 1975 193k→110k · 1990 292k→326k (1 quebra) · 2005 8,5 mi→5,5 mi ·
2012 2,9 mi→2,8 mi · 2018 5,7 mi→2,8 mi. Caixa real ao fim do 1º ano (mediana): 32k→30k; mínimo do caixa ~0 (aperto real nos 2 primeiros anos).

## Botões mexidos
- `worldgen.ts`: começo "do zero" 45 mil → 34 mil reais (emergente 110 → 100 mil).
- `overhead13.ts`: era streaming (≥2008) — equipe de dados/playlists ganha 6% da receita acima de 0,6 mi; teto de despesas gerais +8 p.p.
- `sync15.ts`: encaixe dos rivais 0,30–0,68 → 0,36–0,74 (sync menos garantido como salva-vidas no começo).

## Leitura e pendências
- Um jogador competente que gasta proporcional ao caixa quase não quebra: quebra do balanced foi de 0% para 6%, abaixo da meta
  de 15–30%. Quem quebra é quem erra cedo (contrata caro e o primeiro disco não paga). Próximo botão sugerido: carência do overhead
  (`grace`, hoje a partir de 120 mil/ano) e promoção mínima por lançamento já no 1º ano.
- Começos tardios ainda ficam ~8× o de 1990 no balanced (antes ~13×); o cauteloso fica ~2× e dentro da meta.
- Cauteloso (3 atos, sem rollout) fatura mais que balanced/agressivo: lançar muito dilui o foco promocional (`focusCap` no mercado);
  contratar assessoria/administração é o que escala — vale explicitar isso na interface.
- Lotes rodados com `tmp-bal/snap.sh` (retrato do código, retomável); resultados brutos em `tmp-bal/out-*` (não versionados).
