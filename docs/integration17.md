# Integração R17 — como usar a fundação

Quatro APIs puras (importáveis de qualquer lugar, sem ciclo) e um diretor de situações:

| Módulo | Para quê |
|---|---|
| `src/sim/facts17.ts` | barramento de **Fatos** (quem, onde, gravidade, visibilidade, causa) |
| `src/sim/holds17.ts` | **obrigações** CK3: segredo, favor, dívida, promessa, mágoa, chantagem, lealdade |
| `src/sim/stress17.ts` | **estresse** curto (composto) + longo (desgaste) e quebra |
| `src/sim/scandal17.ts` | **escândalo** tipado com reação por país/época/imprensa/fãs |
| `src/sim/sys/situations17.ts` | **situações** do diretor (NPC escolhe por traços; você por cartão) |

Pontes e ligações ficam em `src/sim/sys/bridge17.ts`; sementes de situação em `src/sim/sys/sits17.ts`;
interface em `src/ui/sys/found17.ts` (aba "Fatos & Obrigações" em pessoa, página única e ato).

## Ids

Pessoa = id de `s.persons`; ato = id de `s.acts`; selo = id de `s.labels`; `'player'` = você/seu selo; outras
pessoas pela chave persona13 (`'l:'`, `'e:'`, `'pd:'`, `'s:'`, `'c:'`). `'p:<id>'` é aceito e normalizado.

## Fatos

```ts
import { emitFact, onFact, factsAbout, recentFacts } from '../facts17';
const f = emitFact(s, { kind: 'arrest', actors: [pid, actId], place: cityId, severity: 60,
  visibility: 'rumor', tags: ['crime', 'bad'], text: l('… preso em …', '… arrested in …'), cause: [prev.id], src: 'crime17' });
onFact('arrest', (s, f) => { /* reagir */ }, 'meusistema:arrest');   // '*' = todos; id evita duplicar ouvinte
recentFacts(s, { kind: 'scandal', months: 6, minSev: 40, notSecret: true });
factsAbout(s, actId, { withAct: true, limit: 20 });
```
- `severity` 0–100; `visibility` `'secret' | 'rumor' | 'public'` (`raiseVisibility(f, 'public')` nunca rebaixa).
- `remember()` e `chron()` já viram Fatos (tipos mapeados: `chart`, `award`, `death`, `split`, `signing`, `release`…);
  fato da ponte não duplica um fato nativo da mesma semana/tipo/protagonista.
- Fato **seu** com `place`, `severity ≥ 45` e não secreto vira **boato do press9** (viaja por cidades, mexe no público).
  Boato/manchete do press9 eleva a visibilidade do fato correspondente.
- Tags convencionais: `'good' | 'bad'`, tipo de escândalo (`'sex'`, `'drugs'`…), `'crime'`, `'hold'`.
- Fatos `bad` recentes sobre a pessoa/ato **aumentam o estresse** dela por 3 meses.

## Obrigações (holds)

```ts
import { grantHold, holdsOf, leverage, useHold, registerHoldSource, registerHoldEffect } from '../holds17';
grantHold(s, { holder: orgId, target: 'player', kind: 'favor', strength: 60, months: 24, src: 'crime17', text: l('…', '…') });
holdsOf(s, pid)            // { has, owes } (próprios + adaptadores)
leverage(s, 'player', id)  // −1..1 (já entra nas propostas: offer mod 'holds17')
useHold(s, holdId, 'call' | 'blackmail' | 'expose' | 'forgive')  // publica Fact; vale uma vez (<60) ou a cada 2 anos
registerHoldEffect('crime17', (s, h, verb, r) => l('Testemunha calou.', 'Witness went quiet.'));
registerHoldSource('orgs', { list: (s) => [...holds virtuais], use: (s, h, verb) => … });
```
Adaptadores já registrados: segredos de `sys/intrigue.ts` (`x:intrigue:*`), segredos de `sys/people/` (`x:people:*`,
inclusive quem mais sabe), dívidas pessoais (`x:loans:*`). Promessa quebrada → `grievance` contra você; cumprida → `loyalty`.

## Estresse

```ts
import { addStress, stressOf, relieveLong } from '../stress17';
addStress(s, pid, +12, l('Noite na delegacia', 'Night in a cell'));   // guarda o porquê
stressOf(s, pid) // { short, long, vuln, level, risk, why[] } — a mesma leitura da interface
```
Curto = `Person.stress` + cansaço + saúde + moral + ressentimento + corpo (voz/lesão) + fatos ruins + carreira.
Longo sobe com curto > 40 e cai devagar. **Quebra só com curto > 65 E longo > 45** (≤1/ano): seu elenco →
colapso existente (`people/breakdowns`); NPC → surto público (escândalo), vício ou esgotamento, pela personalidade.

## Escândalo

```ts
import { scandal, scandalReaction } from '../scandal17';
scandal(s, actOrPersonId, 'drugs', 55, l('… flagrado …', '… caught …'), { person: pid, place: cityId, cause: [f.id] });
scandalReaction(s, act, 'sex', 60)  // previsão pura: { eff, mult, why[] } — use para mostrar "quanto vai doer aqui"
```
Sempre soma **+1** em `Act.scandals` (substitui os antigos `scandals++`). Reação sem sorteio: religião do mercado na época,
censura vigente, imprensa local (veículos ativos, quem já detestava o gênero), fãs núcleo, gênero rebelde (Streisand),
fama no país. Efeitos: desvio de fama no país/região (fame16), patrocínio que rompe pela imagem da marca, relações e
estresse no elenco (devotos se ressentem), paradas (+6% rebelde / −5% grave), júri nacional evita por 1 ano. `OFF17.reaction = true` desliga.

## Situações

```ts
import { registerSituation } from './situations17';
registerSituation({
  id: 'witness', pressure: 'law', cost: 2, cooldown: 6, trigger: ['arrest'],
  when: (s, c) => (c.fact?.severity ?? 0) >= 40,
  actorsPick: (s, c, r) => ({ hero: c.fact!.actors[0], act: c.fact!.actors[1], cast: { person: c.fact!.actors[0] }, data: {} }),
  title: (s, c) => l('…', '…'), text: (s, c) => l('…', '…'),
  options: [   // a ÚLTIMA é o padrão se o jogador não responder
    { id: 'talk', label: l('Delatar', 'Talk'), hint: l('Chance e custo visíveis', 'Visible odds and cost'),
      weightByTraits: (P) => (P?.facets.lealdade ?? 50) < 40 ? 2 : 0.5, apply: (s, c, r) => { … } },
    { id: 'silent', label: l('Calar', 'Stay silent'), hint: l('…', '…'), apply: (s, c) => { … } },
  ],
});
```
Mensal: orçamento de drama (narrador), no máx. **1 situação sua** (mesa com < 4 cartões; nada de pressão de dinheiro
quando o caixa está negativo) e **3 entre NPCs**; protagonista ganha 3 (você) ou 6 (NPC) meses de calma. NPC escolhe
por `weightByTraits(persona13)`; o desfecho vira Fact `'situation'` (NPC: boato/segredo; você: público).
Sementes: burnout, luto, resposta a escândalo, favor cobrado, chantagem de selo, mágoa, recaída, fé × escândalo,
informante, rixa pública, dinheiro com amarra.

## Ligações já feitas (audit17 §3)
Voz cansada/estresse → cachê e risco de turnê · estresse → qualidade da faixa · estresse → dependência · quebra →
colapso/vício/escândalo · luto → estresse da banda · mágoa → estresse e negociação · fama regional → aceitação de oferta ·
fama regional → júri nacional · escândalo recente → júri · religião/época/censura/imprensa/fãs → reação ao escândalo ·
escândalo → fama regional, patrocínio, relações, paradas · obrigações → negociação · fato público → boato do press9.

## Crime (onda 1, A) — `sim/sys/crime17.ts`, `sim/sys/crimenpc17.ts`, `ui/sys/crime17.ts`
- `commitCrime(s, id, { actor, target, method?, org?, partners[] })` — qualquer ator ('player', pessoa, selo, `'o:<org>'`) contra qualquer alvo;
  `crimeOdds(...)` devolve chance, exposição, custo, calor e `why[]`. Fatos publicados: `crime` (secreto→boato→público, tags `crime` + id),
  `arrest`/`case_ruling` (casos), `theft`, `piracy`, `feud`, `tie`, `crime_doc` (crônica real), `betrayal`.
- Casos (`feedCase`, `resolveCase`: delação/julgamento/suborno/fuga), calor por país (`heatIn`, `agency`), presos (`jailedIn`), laços de rua (`tieOf`).
- Relíquias reais: `sim/relics17.ts` (`registerRelics17([...])`) — o crime17 semeia no relics9 quando o ano chega.
- Regras: assassinato nunca envolve pessoa real; no modo exato, pessoas/selos/orgs reais só aparecem na crônica documentada.

## Rodada 18 APIs
Ver `docs/integration18.md`: `registerExplain` (por quês encadeados), `registerInboxKind`/`pushInbox18`/`registerAdvisorTip` (Caixa 2.0 e Conselheiro v2), `registerPersonAction` (menu de ações em toda página de pessoa) e `dynBand/dynRoster/dynStaff` (Dinâmica).
