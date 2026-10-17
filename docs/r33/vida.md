# R33 · VIDA (branch claude/r33-vida)

Código: `src/sim/r33/vida33.ts`. Estado em `s.x4.vida33` (só nasce quando usado). Tudo atrás de interruptor `exp33.*`, padrão DESLIGADO.

| Interruptor | Efeito |
|---|---|
| `exp33.saude` | estresse >= 75 tira 1 de tempo livre (`maxEnergy`, sys/life); saúde < 60 baixa a qualidade de música do ato do jogador até -6% (`songQ`) e desconta até 0,6 do bônus de negociação (`ownerBonus`) |
| `exp33.paparazzi` | só casa com prestígio >= 4; chance mensal (0,1 + 0,02/prestígio), muro -50%, segurança básica x0,6 / completa x0,25 (custo mensal pessoal); incidente = +4 estresse e escândalo leve |
| `exp33.rotina` | rotina escolhida (sono / viagem / hobby): alívio pequeno de estresse por mês, viagem e hobby custam do bolso |
| `exp33.reppessoal` | reputação pessoal -100..100, separada de `s.player.reputation`; escândalo, doação, fundação (amortece 40% e rende +0,8/mês); mexe só no apelo dos lançamentos (±4% no máximo); esmaece 0,4/mês |
| `exp33.herdeiros` | filho passa a ter interesse (melhor atributo do dono) e aptidão puxada 40% para a média dos atributos; ao herdar o selo o interesse ganha +6. Fossati não usam `owner.kids`, intocados |

Ações (sem tela nova; a interface liga pelo cartão de ações): `buildWall33`, `setGuard33`, `setRoutine33`, `donate33`, `foundFoundation33`, `scandal33` (para eventos de vida), `treatOwner33`.

**Gancho INT-2 (hospital/reabilitação):** `treatOwner33(s, 'checkup' | 'rehab')`. Cobra do patrimônio pessoal; rehab = +20 saúde, -30 estresse, 8 semanas de férias.

**Cartões de ação (EXP-13, sem tela nova):** `src/ui/r33/vida33ui.ts` acrescenta ações e números aos cartões existentes, só visíveis com o interruptor ligado (`when`): sofá (rotina sono/hobby, check-up, retiro, imagem pessoal), porta da casa (muro, segurança), cofre (doar, fundação), mapa na parede (viagem de lazer + próximo destino). Importado por `acoes5model.ts`.

**Escândalo pessoal:** evento de vida `r33_scandal` (`src/sim/r33/vida33ev.ts`), no sorteio mensal de `lifeevents10`; peso > 0 só com `exp33.reppessoal` e fama > 25 (sobe com estresse alto e paparazzi recente). Respostas: desculpas, doar, negar, ficar quieto; mexem na imagem pessoal, não na reputação da empresa.

**Viagem de lazer (`exp33.rotina`):** `tripOptions33` sorteia 4 destinos por mês (determinístico), custo e alívio pela distância e pela época (navio/trem mais caros antes de 1960); `takeTrip33` paga do bolso, 3 semanas de férias.

Pontos tocados em arquivos meus: `owner.ts` (`ownerBonus`, `succession`), `sys/life.ts` (`maxEnergy`); em outros: `sys/index.ts` (import do evento) e `ui/r31/acoes5model.ts` (import da UI).
