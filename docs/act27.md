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
| Campanha de lançamento (FLOW2) | programar o lançamento (estreia em ≤ 6 sem.) ou cartão no Avançar | o quadro de semanas **é** o marketing daquele lançamento | "Resolver rápido: só o marketing do plano" (dentro do quadro) / no cartão |
| Imprevisto da campanha | cartão no Avançar | o quadro, na resposta da semana | vale a opção prudente (a 1ª) |
| Entrevista / coletiva | cartão no Avançar (matéria, escândalo, convite da campanha; 1 pedido de imprensa por mês) | a sala de imprensa (4 posturas) | o pedido fica para outra vez; a matéria segue com os botões de sempre |
| Favores | "Almoço" (empresário), "Jantar" (produtor), "Presente" / "Pedir favor" (perfil) | a conversa de favor (quadro de cortiça focado na pessoa) | "Resolver rápido: o almoço/jantar/presente de sempre" (dentro) |
| Crise | cartão no Avançar (na mesa e, a cada semana, em andamento) | a sala de crise com relógio | deixar correr / a equipe age |
| Reunião de diretoria | cartão no Avançar (começo do mês, com pauta) | sentar à mesa | as regras de delegação (desligada: não pergunta de novo) |
| Turnê | "Confirmar turnê" | a turnê no mapa (rota, eventos de estrada) | "Resolver rápido: marcar como no formulário" (dentro) |
| Estrada | cartão no Avançar (eventos das próximas datas) | o diário de estrada | a equipe decide no dia |
| Renovar contrato | "Renegociar contratos" (Pessoas) | pedido do artista → mesa de renegociação (negotiate27); sem pedido → mesa de renovação | "Resolver automático" (dentro) |
| Show ao vivo | cartão do show no Avançar (show27) | setlist e momentos | o show na data; a cena pós-show só mostra o resultado (o mini-jogo antigo saiu) |

Os botões "Jogar" avulsos (estúdio, Central, turnês, projeto, jornada, ficha, direitos, submundo) foram removidos.
Na FLOW2 saíram também os da fase 2: "▶ Campanha" (lançamentos, alavancas de hype, mídia), "▶ Entrevista/Coletiva"
(cenas, matérias, escândalo, perfil), "▶ Rede de favores"/"Almoço como favor"/"Jantar como favor", "▶ Enfrentar" e
"Sentar à mesa" (Cockpit/Políticas viram estado + marcador 🎮), "Planejar no mapa" (tours) e o mini-jogo pós-show.
Onde a atividade chega pelo Avançar, a tela de sempre mostra o marcador **🎮 jogável** (`occMark27`, `ivMark27`,
`campRow27`). O livro de favores segue no seu perfil (cobrar/retribuir/queimar) e o diário fica na turnê.

## Preferência (Opções → Atividades)

* **Todas jogáveis** — todas as atividades da janela são oferecidas (até o limite do mês).
* **Só as importantes** (padrão desde a FLOW2 para perfis/preferências novos — `ACT_DEFAULT27`; quem já escolheu
  mantém) — só as que `important()` marca (gravação, show em casa ≥ 2, operação, contrato de ato com fama ≥ 15 /
  renegociação ≥ 30, composição do seu próprio grupo, campanha de ato com fama ≥ 40 ou do seu grupo, coletiva de
  matéria/escândalo, crise, reunião, estrada, turnê com 3+ cidades ou fama ≥ 30, favor com algo no livro).
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

## FLOW2 — fase 2 no caminho único

Arquivos: `src/ui/act27/flow27p2model.ts` (puro: fontes `release`, `press`, `crisis`, `board`, `road` e as
atividades `campaign`, `campEvent`, `interview`, `crisis`, `board`, `road` + as de tela `favors`, `route`, `renew`;
recusas por sessão `decline27`) e `src/ui/act27/flow27p2.ts` (telas ligadas por `setPlayer27` e as entradas naturais
`favorAct27`, `afterSchedule27`, `campRow27`, `ivMark27`, `bookTour27`, `renewBtn27`). As telas das atividades
ganharam `onDone` (o cartão segue) e o caminho rápido dentro (`openCampaign27(tg, { quick })`,
`openFavors27(key, { gesture, classic })`, `openRoute27(act, cidades, { classic })`). Testes: `tests/r27-flow2.test.ts`.

Também na FLOW2:
* **Menu** — o contador de cada seção soma só as páginas dela; decisões contam só no Cockpit (`secBadge27`,
  `DECISION_PAGES27` em `ps/tree27.ts`; teste em `r27-nav`).
* **Mapa-múndi** — filiais, escritórios no exterior e empreendimentos fora da cidade-sede (que a CITY2 tirou do mapa
  do bairro) viram marcadores na camada "Seus lugares" (ligada por padrão) do Mundo › Mapa; a ficha da cidade abre
  com "Seus lugares aqui" (tipo, nível, equipe, artistas, **Abrir →** a página — filial: Sede › gestão, âncora
  `br27-<id>`). Modelo puro `foreignSites27`/`sitesByCity27` em `sys/mundo27model.ts` (teste em `r27-mundo`).
