# Masters 31 — briefing comum dos agentes

Leia isto inteiro antes de mexer em código. Cada agente recebe, além deste arquivo, só a parte do plano dele
(`docs/r31/PLANO.md`, pelo identificador do requisito).

## Projeto
- Jogo de gestão de gravadora/carreira musical (1889 → 2040), TypeScript + Vite, sem framework de UI (helpers `h()` em `src/ui`).
- Simulação em `src/sim` (núcleo) e `src/sim/sys` (sistemas). UI em `src/ui`. Dados em `src/data`.
- Ramo de integração: `claude/friendly-brown-vpsmfl`. Cada agente trabalha na sua cópia (worktree) e faz commits lá;
  quem junta é o coordenador.

## Regras duras
1. **Determinismo.** Nada de `Math.random`, `Date.now()` na simulação. Sorte vem de `rng19(s, 'chave')` (fluxo por sistema,
   registre a chave em `STREAMS19`) ou de `Rng.fromSeed(\`${s.config.seed}|...\`)` (sorte pura por chave). O fluxo único
   antigo (`rngOf`) foi removido na onda 0; não reintroduza.
2. **Explorar não muda o mundo.** Abrir, fechar ou filtrar tela/cena nunca cria pessoas, muda estoque, consome sorteio ou
   faz transação. Geração acontece na virada do mês/semana, no motor; a UI só lê.
3. **Fontes únicas (onda 0).** Opinião sobre o jogador só via `src/sim/opinion.ts`; o que se sabe de alguém via
   `src/sim/know.ts`; acontecimento é `emitFact` (diário e aviso são ouvintes); toda data visível tem provedor no calendário;
   pessoa com vários papéis é uma pessoa (`Role`). Não crie depósito paralelo. Testes de contrato (`tests/r31-contracts*.test.ts`)
   travam escritas fora do dono.
4. **Estado novo** vai em `registerExt4('chave', fresh)` (declaração de tipo via `declare module './ext4'`). Ganchos de
   simulação via `registerSimHook`; fatos via `emitFact`/`onFact`.
5. **Saves antigos não precisam abrir** (o jogo está em testes). Não escreva pontes para formatos velhos.
6. **Textos** sempre bilíngues `l('pt', 'en')`, em português claro, sem dado cru (nada de `0.37`, ids, `NaN`, chaves internas).
7. **Sem janelas do navegador** (`alert`, `confirm`, `prompt`) em código novo.
8. **Arte:** só o estilo pixel art antigo do jogo (ver `docs/arte29*.md` e a skill `masters-artist-sprites`). Sem selos
   "simulado/fictício".
9. **Nomes reais** novos entram no registro `src/data/realnames31.ts` (identificador → nome real → substituto).
10. **Editores:** a partir da onda 1, todo sistema novo registra no editor dentro da partida o que pode ser editado/rodado e,
    se for dado de base, no editor de base.
11. **Família Fossati** (Efro, Lucia, Sonia, Antonella): sempre presentes, papéis por época, nunca envelhecem nem morrem;
    Sonia só se aposenta. Homenagem é ficção declarada.
12. Não notificar a sessão da wiki.

## Testes
- `npx tsc --noEmit` e `npx vitest run` (suíte inteira ~ minutos). Rode os testes do seu pedaço sempre e a suíte antes de
  terminar.
- Valores de referência (goldens: `r27-p2a`, `r27-p2b`, `m2`, `m3` e outros com números fixos) só mudam com explicação
  escrita em `docs/r31/DECISOES.md` (o que mudou e por quê).
- Medições de economia: cada mudança sozinha e depois combinada, várias sementes e épocas (antes do rádio, LP, 1990,
  streaming, futuro) — `npm run balance:quick`.

## Entrega de cada agente
- Commits pequenos e descritivos no seu worktree, com a linha `Co-Authored-By` que o coordenador indicar.
- Relatório final curto: o que fez, arquivos, testes rodados (com resultado), goldens alterados e por quê, pendências.
- Nada de servidores de dev deixados rodando.
