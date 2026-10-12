# Adaptador: Masters (Vinyl-Game)

Simulador de gestão musical em turnos (1889–2040), TypeScript, roda no navegador. Simulação em `src/sim`, interface em
`src/ui`, dados em `src/data`, testes em `tests/`, ferramentas em `tools/`. Os sufixos numéricos nos nomes de arquivo
(`*12.ts`, `*18.ts`, `*20.ts`) indicam a rodada de desenvolvimento em que o módulo nasceu.

## Leitura obrigatória antes de julgar (Fase 0)
- `README.md`: mapa do GDD v8/v11 → o que está implementado, e o resumo de cada rodada. É a fonte dos pilares e da intenção.
- `docs/plano19.md`, `docs/rodada20.md`: o que já está planejado. Um achado que o plano já cobre vira "parcial: falta X".
- Revisões e lotes anteriores: `docs/revisao18.md`, `docs/verificacao19.md`, `docs/balance16.md`, `docs/balance17.md`, `docs/balance19.md`, `docs/econ18.md`, `docs/precos20.md`. Não repita achados já resolvidos; confira no código se o fix entrou.
- `docs/screenshots/`: telas de referência (úteis para a camada 12 sem rodar o jogo).

## Ferramentas de medição

| Para | Comando | Observações |
|---|---|---|
| Checagem rápida de equilíbrio | `npm run balance -- --quick` | 6 seeds × 3 anos, perfil equilibrado, base pequena. Segundos. |
| Lote completo | `npm run balance -- --full --json <scratchpad>/b.json` | 4 perfis + 6 adversários, 6 seeds × 5 anos. Minutos. |
| Caça a exploits (camada 7) | `npm run balance -- --adv all` | Bots adversários (spam, empréstimos…) pareados com o equilibrado nas mesmas (seed, início). |
| Determinismo (camada 9) | `npm run balance -- --quick --det` | Joga a 1ª partida duas vezes em processos diferentes e compara. |
| Eras/inícios | `--starts 1889,1955,1975,2005` ou `--grid` | `--grid` cruza todas as seeds com todos os inícios (lento). |
| Papéis | `--role label|artist|manager|publisher|studio|hybrid` | Compare papéis na camada 5 (autonomia) e 7. |
| Partidas longas | `npm run headless -- --runs 20 --years 30 --start 1960 --mode free --profile balanced` | Bot realista (`playbot16`). `--bot simple` é espantalho que quebra quase sempre: não use como evidência de dificuldade. |
| Testes e tipos (camada 14) | `npm test` e `npm run typecheck` | Mais de 160 arquivos de teste; registre falhas com o nome do teste. |
| Interface (camadas 11–12) | `npm run dev` + Playwright | Chromium já instalado (`PLAYWRIGHT_BROWSERS_PATH`). Não rode `playwright install`. |

Perfis do bot realista: `cautious`, `balanced`, `aggressive` (`src/sim/playbot16.ts`). Sondagens finas: escreva um script
`tsx` no scratchpad que importe `simulatePlayer`/`playMonth` e conte o que precisar (ex.: fatos por tipo via `onFact('*')`,
eventos sorteados, caixa por mês). Apague o script no fim e descreva-o no relatório.

## Onde cada camada costuma morar

| Camada | Pontos de entrada no código |
|---|---|
| 2 MDA / 6 Decisões | eventos e opções (`src/sim/events*.ts`, `decide18`), cartões da Mesa do mês, ações de agenda (`src/data/actions.ts`, `agenda*.ts`) |
| 3 Diversão / 13 Sessão | eras e formatos (`eras*.ts`), metas e cartas, mutators, 20 finais, legado em 7 dimensões |
| 4 Fluxo | dificuldade, narradores Maestro/Brisa/Acaso, insolvência e recuperação, "machuca, mas não mata" |
| 7 Teoria dos jogos | IA dos rivais (`rivals*.ts`, `botr19.ts`), leilões, negociação de contratos (`contracts*.ts`), bots adversários do `balance19` |
| 8 Sistemas e economia | dinheiro em centavos (`src/core/money`), preços por década (`precos20.md`), royalties, recoupment, crédito, caixa livre (`freeCash20`), marketing `E = 1 − exp(−verba/custo)` |
| 9 Probabilidade | RNG por seed (`src/core/rng.ts`), faixas de negociação (nunca %), intervalos de previsão, sorteio de eventos |
| 10 Narrativa | Diretor de Histórias, fatos (`facts17`, `onFact`), ecos (`registerConseq18`), Diário da run, atos reais (`realacts_*`) |
| 11 UX / acessibilidade | `src/ui/**`, ajuda (`help18*.ts`), tutorial (`tutorial*.ts`), texto 90–130 %, alto contraste, daltonismo, leitor de tela, teclado, layout 390 px |
| 12 Estética | pixel art (`src/ui/pixel/**`), áudio procedural (`src/audio`), capas e logos gerados |
| 14 Técnica | saves IndexedDB + migrações (`src/core/save20.ts`), módulos paralelos de rodadas diferentes que fazem a mesma coisa, tempo de turno |
| 15 Ética | nomes reais ligados por padrão (`realnames.ts`, `realacts_*`), vícios e drogas (`vices.ts`), censura por era, filtros de conteúdo, voz IA e hologramas (consentimento do espólio) |
| 16 Mercado | comparáveis: *Game Dev Tycoon* (gestão de indústria criativa), *Football Manager* (densidade de sistema), *Crusader Kings* (personagens e dinastias), *RimWorld* (diretor de histórias) |

## Cuidados específicos
- O jogo é enorme (~1000 arquivos). No modo completo, divida a leitura entre agentes `Explore` por grupo de camadas e use o mapa do README para mirar os arquivos.
- O estilo de achado do projeto é **Evidência → Efeito → Plano (o que o plano19/rodada já cobre) → Fix → Esforço S/M/L**. Mantenha o campo "Plano" quando um doc de planejamento existir.
- Densidade de sistemas é intenção de design (simulador profundo). Julgue o custo de legibilidade (camada 11) e de foco (camada 1), não a quantidade em si.
