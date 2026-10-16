# Masters 31 — registro de decisões

Cada linha: data · onda · decisão (o que substituiu o quê) · motivo · valores de referência alterados.

- 2026-10-16 · W0 · Saves da versão 30 não precisam abrir na 31 · decisão do dono (jogo em testes) · —
- 2026-10-16 · W0 · Documentos do plano entram em `docs/r31/`; scripts de build e fumaça em `scripts/r31/` · antes ficavam fora do repo · —
- 2026-10-16 · W0-AT · `src/sim/attention.ts` (fila única `x4.attn`, teto 160, orçamento único de 24 avisos de prioridade 0–1 por mês); `notify()` grava em `s.notifications` **e** na fila (a interface atual segue lendo `s.notifications` até a 31.1) · contrato da fila única (B.6) · —
- 2026-10-16 · W0-FACT · `emitFact(s, { ..., diary, notify })`: diário e aviso viram ouvintes centrais (`registerFactSink` em facts17, ouvintes em util.ts), rodando depois dos ouvintes do fato (mesma ordem de emitFact → remember → notify). Convertidos: rights18 (regravação, rescisão de 35 anos), eggs27 (`eggFire27`), traj18 (virada artística) · B.23 · —
- 2026-10-16 · W0-CAL · `tests/r31-calendar-rule.test.ts` com pendentes que só diminuem (tour12, route8, road27, fests8, clash17, rollout, agenda17); provedores novos `awardcal19` (Crítica, Indústria, Ao Vivo, Hall dos Ecos) e `fest12` (compromissos de dinheiro dos festivais próprios; a data do festival já vinha por `live`) · B.9 · —
