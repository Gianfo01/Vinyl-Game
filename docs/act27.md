# Atividades jogáveis — um caminho só (r27 FLOW)

Feedback que motivou: *"o minigame de compor não parece implementado, porque eu componho colocando na agenda do
artista e esperando o mês passar. Se tiver mais de um jeito, está confuso — e não só compor, todos."*

Regra: **cada ação tem UMA entrada, a natural**. A atividade jogável não é um botão "Jogar" ao lado da ação;
ela acontece dentro do fluxo de sempre, e o modo rápido é o caminho curto *dentro* dela.

| Ação | Entrada única | Jogável | Rápido |
|---|---|---|---|
| Compor | "Compor" na agenda do artista (🎮 no espaço) | cartão no Avançar (virada do mês) → sessão de cartas | o motor compõe na agenda, como sempre |
| Gravar | "Entrar em estúdio" marca a sessão (🎮 na Central) | cartão no Avançar (semana/mês) → takes + mixagem | o estúdio grava sozinho nos dias marcados |
| Show | turnê marcada (🎮 na lista de turnês) | cartão no Avançar quando a próxima data cai na janela → setlist + momentos | o show acontece na data |
| Assinar | "Fazer proposta" (ficha) | a tela da oferta **é** a mesa de negociação | "Resolver rápido: proposta única" (formulário de sempre) |
| Renegociar | pedido do artista (Direitos) | "Responder na mesa" | "Resolver rápido: aceitar como está" |
| Operação do submundo | "Executar" | abre o plano (equipe, complicações, encobrimento) | "Resolver rápido: executar direto" |

Os botões "Jogar" avulsos (estúdio, Central, turnês, projeto, jornada, ficha, direitos, submundo) foram removidos.

## Preferência (Opções → Atividades)

* **Jogáveis** — todas as atividades da janela são oferecidas (até o limite do mês).
* **Só as importantes** — só as que `important()` marca (gravação, show em casa ≥ 2, operação, contrato de ato
  com fama ≥ 15 / renegociação ≥ 30, composição do seu próprio grupo).
* **Sempre rápido** — nada aparece; tudo como antes.

## O avanço

`src/ui/app.ts` → `doAdvance` chama `flowGate27(g, mode, go)` **antes** do motor (a composição precisa ser jogada
antes de a agenda rodar). O gate:

1. monta a janela (`window27`: hoje → fim da semana/mês; `opensMonth` = a agenda do mês roda neste avanço);
2. junta as ocasiões das fontes registradas (`occasions27`) e casa cada uma com uma atividade (`planFlow27`);
3. ordena (importantes primeiro, depois por data) e oferece no máximo `MONTH_CAP27` (= 3) por mês — o resto vai
   no rápido com nota; avanços longos (trimestre, "até…", evento) resolvem tudo no rápido;
4. mostra **um cartão por vez** ("Sessão de composição: X — Jogar / Resolver rápido / Tudo no rápido e avançar");
   ✕/Esc adia o avanço (o que já foi decidido fica);
5. depois do último cartão chama `go()` — o avanço normal. Em `AFTER_ADVANCE` sai o resumo:
   "🎮 Atividades do mês — jogadas: … · no rápido: …" (aviso + linha na agenda do artista).

Bots, testes e autoplay usam a API do motor (`advance`, `advanceMonth`…) e nunca passam pelo gate. O motor não
mudou: a composição jogada marca `params.played27` no espaço "Compor" (já tratado em `sim/agenda.ts`), o show
jogado resolve a data por `playShow27`, a gravação usa a mesma sessão do estúdio.

## Como plugar uma atividade nova (fase 2: campanha, entrevista, favores, mapa de turnê, crises, conselho, olheiro…)

Arquivos: `src/ui/act27/flow27model.ts` (puro, testável) e `src/ui/act27/flow27.ts` (telas, gate, marcadores).

```ts
import { registerActivity27, registerOccasions27 } from '../act27/flow27';

// 1) (se a ocasião não vier da agenda/estúdio/turnê) uma fonte de ocasiões para a janela do avanço
registerOccasions27('release', (s, w) => s.pendingReleases
  .filter((p) => p.week * 7 < w.to)          // o que cai entre w.from e w.to (dias do jogo)
  .map((p) => ({ src: 'release', key: `rel:${p.id}`, actId: p.actId, day: p.week * 7, data: { relId: p.id } })));

// 2) a atividade
registerActivity27({
  id: 'campaign', kind: 'release',            // kind = src das ocasiões ('agenda' | 'studio' | 'show' | 'screen' | a sua)
  label: l('Campanha de lançamento', 'Release campaign'),
  when: (s, occ) => !!occ.data?.relId,         // aplica-se a esta ocasião?
  important: (s, occ) => (s.acts[occ.actId!]?.fame ?? 0) >= 40,
  title: (s, occ) => l(`Campanha: ${s.acts[occ.actId!].name}`, `Campaign: ${s.acts[occ.actId!].name}`),
  preview: () => l('Jogar: …  Rápido: …', 'Play: …  Quick: …'),
  play: (s, occ, done) => openCampaign27(s, occ, (played) => done({ played })), // SEMPRE chame done ao fechar
  quick: () => {},                             // o de sempre (normalmente nada: o motor resolve ao avançar)
});
```

Para uma ação de **agenda** use `kind: 'agenda'` e teste `occ.slot.action` em `when`; o marcador 🎮 aparece
sozinho no espaço da agenda (`slotMark27`). Para uma ação de **tela** (abre a partir de um botão) use
`kind: 'screen'` e, no botão natural, `if (!screen27('id', s, { actId, data }, classicFn)) classicFn();` —
`classicFn` vira o "Resolver rápido" dentro da sua tela (`occ.data.classic`).

Regras: uma janela por vez (abra a sua tela só dentro de `play`, e chame `done` no `onClose` **antes** de
`rerender()`); `done` também quando a tela nem chega a abrir (bloqueio → toast + `done({ played: false })`);
motor puro e determinístico em `src/sim/sys/` (streams `Rng.fromSeed` próprias); o modo rápido continua sendo o
comportamento de sempre. Testes: `tests/r27-flow.test.ts`.
