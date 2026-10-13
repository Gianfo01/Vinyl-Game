# Rodada 29 — três correções do autor

Capturas antes/depois em `docs/shots29fixes/` (Chromium, pt-BR, 1440×900 e 390×844). Teste: `tests/r29-fixes.test.ts`.

## 1. Sem selos de "real" / "fictícia"

> "remova os badges de fictícia e real, como em submundo"

Saíram **só os selos visíveis**. Os campos de dados continuam (`o.real`, `c.real`, `b.real`, `isReal`,
`catalogNo`, a origem `'real'` das relíquias), porque a simulação e os testes usam.

| Onde | O que saiu |
| --- | --- |
| Submundo › Organizações (`ui/sys/crime17.ts`) | pílulas **REAL** / **FICTÍCIA** ao lado do nome da organização; pílula **documentado** nos laços históricos (o texto do laço fica) |
| Mapa › ficha da cidade (`ui/sys/mapinfo17.ts`) | pílula **real** nas organizações da cidade |
| Mídia › Críticos (`ui/sys/media17.ts`) | pílula dourada **real** ao lado do crítico, e a frase "Os marcados 'real' escreveram de verdade…" |
| Ficha do chefe de selo (`ui/sys/leaders10.ts`) | pílula **pessoa real** e o "· pessoa real" do título |
| Laços duradouros (`ui/sys/bonds9.ts`) | ★ dos laços históricos |
| Músicos de estúdio (`ui/sys/session19.ts`) | ✦ dos coletivos fictícios e a nota "✦ coletivo fictício…" |
| Relíquias (`ui/sys/talent18.ts`) | pílula de origem **História real** e pílula **história alternativa** |
| Ficha do artista (`ui/pages.ts`) | ★ dourada ao lado do nome dos atos do catálogo real |
| Alvos do Submundo (`sim/sys/crime17.ts` › `targetsFor`) | ★ no nome de pessoas/atos reais (só o texto da lista) |

**Ficou** (procedência que não é selo de real × fictício): a linha "Fonte/certeza" da ficha (histórico ·
confirmado / aproximado / **não conferido** / simulado nesta partida), o **Documentado/Simulado** dos lançamentos
(`provbadge20.ts`), as pílulas de **modo** ("Vida real exata", "História alternativa") e o "(boato)" dos laços de
gente real com gangues.

## 2. Menu de ações completo e dividido (clique direito)

> "em ações devemos ter todas as ações disponíveis para aquela pessoa, como as ações de submundo, e melhor divididas"

**Uma fonte só.** `ui/ps/ctx27model.ts` monta a lista; `menuSections27()` divide em seções, sempre nesta ordem:
**Ver / Abrir · Carreira e contrato · Música e projetos · Ao vivo · Relação e vida pessoal · Imprensa e imagem ·
Submundo · Atalhos**. O clique direito (`ctx27.ts`) e o painel **"Ações com esta pessoa"** da ficha
(`ui/sys/personact18.ts`) desenham a partir dela: mesmas seções, mesmos itens, mesmo executor (`CTXHOOK27.run`).

Nada novo foi inventado. Cada item chama a mesma função, ou abre o mesmo fluxo, do botão que já existia:

- **Pessoa:** o registro inteiro do menu de pessoa (`personActions18`, itens `pa:<id>`): telefonar, almoçar,
  conselho, desculpas, favor, cobrar favor, emprego/contrato, feat, convite, networking, elogiar/criticar,
  boato, hospital, funeral, ajuda, flerte, aulas, mentor, masterclass, mediar/encomendar rixa, instigar.
  No **Submundo**: detetive, ameaçar, subornar e os crimes do `crime17` (morte, susto, chantagem, sabotar e piratear o
  ato). Também **"Mais opções no Submundo…"**, que abre Submundo › Planos com o alvo já escolhido. O executor é o
  mesmo `runPA18` da ficha, com a confirmação do jogo sujo. O **presente** continua pela conversa de favor (`person.gift`)
  e não aparece em dobro. Em **Atalhos**: abrir o artista e "Todas as ações de {ato}…".
- **Artista do elenco:** o registro inteiro do artista (`actions20`, itens `a20:<id>`) por seção: projeto,
  repertório, ensaiar, descanso, entrevista, rádio, contrato, royalties, líder, integrantes, lote, fixar. O que o menu
  já tinha com outro nome (agenda, gravar, shows, página) não volta duplicado. No **Submundo**: fraudar as paradas e
  desviar royalties (Planos) e "Andar com uma gangue…" (Organizações).
- **Artista de outro selo:** proposta, observar, olheiro, mais sabotar e pirataria (Planos) e um **submenu "Ações com
  {líder} ›"**, que é o menu de pessoa do líder.
- **Gravadora:** dossiê, rivalidade, elenco e finanças, mais **"Ações com {chefe} ›"** e **grampear** (Planos).
- **Organização do Submundo:** o nome no cartão agora tem o menu. Os itens são aproximar-se, lavar/parar de lavar
  dinheiro e denunciar (as mesmas funções `approachOrg` / `toggleLaunder` / `reportOrg` dos botões), mais ligar
  um artista seu.
- Cidade, casa de shows, lançamento e música mantêm as ações de antes, agora agrupadas.

**Indisponível aparece desabilitado**, com o motivo na linha (uma linha, com reticências) e completo no tooltip.
Exemplos: caixa, cooldown, opinião baixa, fora da lista de alvos, Submundo fechado na partida.

**Menus longos:** a partir de 10 itens, cada seção ganha um cabeçalho fixo (sticky) com a contagem
"disponíveis/total". O cabeçalho recolhe e abre a seção com clique, Enter, ← e →, e o jogo lembra o que você recolheu
enquanto a página estiver aberta. **PageUp/PageDown** pulam de seção em seção; ↑↓, Home/End e a letra inicial
continuam funcionando. A rolagem fica dentro do menu. No celular (≤ 600 px) o menu vira uma folha inferior de até
82% da altura. Conferido em 1440×900 e 390×844 (`after-ctx-person-*.png`).

Para abrir Submundo › Planos já preenchido, o rascunho do formulário saiu para `ui/sys/crimeform29.ts`. A tela do
Submundo continua dona do formulário e revalida alvo e método ao desenhar.

## 3. Nova run: status e situação inicial

> "no começo de nova run mudar o status pq aparece 'selo emergente' sendo que posso começar como artista, e coloque 5
> opções de começo" + panorama do autor: zero, emergente, médio, hipster, estabelecido, top 5, líder do mercado

**Status = carreira × situação.** `statusLabel29()` (`sim/start29data.ts`) dá nome às 12 carreiras e concorda o
adjetivo. Exemplos: "Artista iniciante", "Artista hipster", "Produtor top 5", "Empresário líder do mercado",
"Selo emergente", "Casa de shows estabelecida", "Crítico em crise". Ele aparece:

- nas opções do "Ponto de partida" da Nova run rápida e numa linha de status logo abaixo (com o começo sorteado);
- nos cartões do "Ponto de partida" da configuração completa;
- no resumo da configuração completa ("Situação inicial");
- no "Começo" dos cenários históricos.

**A escada (8 situações, iguais para as 12 carreiras):**

| Situação | Scenario base | Caixa (× emergente) | Reputação (art./com./artistas/inst.) | Sede | Elenco (negócio) / fama da banda (artista) | Equipe | Mercados | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Do zero (garagem) | from_zero | 0,34 | — | 1 | 0 / 1 | 0 | 1 | — |
| Emergente | emerging | 1 | — | 1 | 1 / 12 | 0 | 1 | — |
| De porte médio | emerging | 2 | +6/+8/+4/+6 | 1 | 2 / 16 | 1 | 2 | — |
| Hipster (cult) | emerging | 0,8 | **+22/−8**/+12/+4 | 1 | 1 / 7 | 1 | 1 | potencial +10 no elenco/banda |
| Estabelecido | established | 6,5 | +8/+12/+8/+10 | 2 | 3 / 18 | 3 | 3 | — |
| Top 5 | established | 14 | +14/+22/+12/+18 | 3 | 5 / 28 | 5 | 5 | mágoa 18 nos 3 maiores rivais |
| Líder do mercado | established | 28 | +18/+32/+14/+26 | 3 | 7 / 36 | 7 | 7 (o mundo) | mágoa 30 nos 5 maiores rivais |
| Em crise (gigante caído) | established | 2,2 | +6/+16/**−6/−12** | 2 | 3 / 22 | 2 | 3 | **dívida bancária** de 1,6× o caixa (empréstimo de verdade, 14% a.a., 60 meses); mágoa 10 em 2 rivais |

- **Por que "Em crise":** o panorama ia do pequeno ao gigante, mas não tinha um começo grande com problema. "Gigante
  caído" é o único que junta nome grande, folha pesada e caixa curto. Ele força escolhas difíceis desde o mês 1:
  vender catálogo, demitir, renegociar. "Herdeiro/legado" ficou de fora porque já existe como sabor no começo sorteado
  ("Herança da tia").
- **Topo com desafio:** top 5 e líder do mercado começam com sede 3, folha de 5 a 7 pessoas e elenco grande (custos
  fixos altos), e com a **mágoa dos maiores rivais** (`grudge27`, que alimenta imitação, aliciamento e memória
  rival).
- **Igualdade entre carreiras:** o caixa é sempre um múltiplo do começo "emergente" da própria carreira. Nas carreiras
  de negócio, o worldgen já aplica o scenario base e o gancho soma só a diferença. Para artista e híbrido, que o
  worldgen não escalava, o gancho aplica a escada inteira. Elenco vale para quem tem elenco, e fama/fãs da própria
  banda para o artista. O teste confere a mesma razão líder/emergente para "Gravadora" e "Artista".
- **Ajuste fino respeitado:** caixa, sede, elenco, equipe, mercados e reputação digitados no "Ajuste fino" valem
  sobre a escada. "Todos iguais", "Assumir gravadora" e cenário histórico pulam a escada.

**Como foi ligado.** A situação fica em `config.start29`; o `scenario` continua sendo a base que o worldgen entende.
`setStart29()` é o MESMO handler na Nova run rápida e no cartão da completa, e `syncStart29()` mantém os dois
coerentes quando outro caminho troca o scenario (predefinição, código de run). Por isso a rápida e a completa dão a
**mesma RunConfig** (`r27-home` e `r29-fixes`). O efeito entra no gancho `'newgame'` de `sim/sys/start29.ts`, com
RNG próprio. **Sem `start29`** (bot, testes, saves antigos) nada muda, e os valores-ouro ficam intactos.

**Começo sorteado (r28 F4).** Continua e aparece como detalhe na linha de status ("Começo sorteado: A crítica gostou
de você"). Ele é **pulado** quando contradiz a situação (`start28Fits29`): nas situações estabelecido, top 5, líder e
em crise saem "Começo tranquilo" ("uma cidade que ainda não sabe seu nome"), "Herança da tia", "Começa devendo"
("equipamento fiado") e "A crítica gostou de você" ("seu primeiro projeto"). "Amigo na rádio" e "Cena fervendo"
combinam com qualquer porte.

## Arquivos

- Novos: `src/sim/start29data.ts`, `src/sim/sys/start29.ts`, `src/ui/sys/crimeform29.ts`, `tests/r29-fixes.test.ts`,
  `docs/fixes29.md`, `docs/shots29fixes/`.
- Alterados: `src/sim/types.ts` (`start29?`), `src/sim/sys/index.ts` (import), `src/sim/sys/start28.ts` (guarda),
  `src/sim/sys/crime17.ts` (★ dos alvos), `src/ui/ps/ctx27model.ts`, `src/ui/ps/ctx27.ts`, `src/ui/ps/ctx27.css`,
  `src/ui/sys/personact18.ts`, `src/ui/sys/crime17.ts`, `src/ui/sys/ability18.ts` (nomes com menu),
  `src/ui/ps/home27.ts`, `src/ui/ps/home27model.ts`, `src/ui/newgame17.ts`, `src/ui/newgame.ts`, `src/ui/scen22.ts`,
  e os arquivos dos selos (tabela do item 1). O teste `tests/r27-ctx.test.ts` mudou: o menu da gravadora ganhou dois
  itens.

## Pendências

- O alvo do "Planejar…" segue a lista do Submundo (os 40 atos mais famosos; dois integrantes por ato). Fora dela, o
  item aparece desabilitado com o motivo.
- A Nova run rápida oferece 10 carreiras, como antes. "Compositor de trilhas" e "Crítico" só aparecem na
  configuração completa, mas o status e a escada já valem para elas.
