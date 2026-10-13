# R29 REORG — aplicação da Bíblia de UI/UX ao Masters

Base: `claude/friendly-brown-vpsmfl` (Masters 28). Branch: `claude/r29-reorg`. Plano do autor: `docs/biblia-ui-ux.md` (3.566 linhas, lido inteiro).
Regra seguida: **reorganizar a atenção, não cortar simulação.** Nenhuma página, aba, mecânica, texto ou arte foi removida. A pixel art ficou como está: nenhum sprite, ícone ou paleta novo; as telas novas usam só componentes e tokens ui27.

A Bíblia foi escrita sem olhar o branch. **A maior parte do que ela pede já existia** desde R27/R28: Cockpit como entrada, hubs Essencial/Completa, inbox FM, mesa de negociação com promessas, shows jogáveis, storyboard final, ano de início e de fim, modo história e formação mensal. Esta rodada fez quatro coisas:

1. mapeou cada ID contra o código;
2. tomou as decisões de rota da Parte VIII;
3. construiu a **fundação que faltava**: catálogo único, estados de dado, passaporte, rascunho, retorno e teste de layout;
4. ligou o **ciclo** (S01/S02 → S06/S07 → S08–S10 → S13/S16, com S03 coordenando) às fontes que já existiam, sem duplicar fluxo.

---

## 1. Decisões de rota adotadas (Parte VIII prevalece)

| Decisão | O que ficou |
|---|---|
| **D1 — 8 grupos, nenhum macromenu novo** | Cockpit · Sede · Pessoas · Projetos · Ao vivo · Mundo · Gestão · Você (as seções r27, `SECTIONS25`). O teste garante que `GROUPS29` = seções r27. |
| **D2 — 17 telas são endereços, não menus** | `SCREENS29` (`src/ui/ps/route29model.ts`) dá a cada S01–S17 um grupo, uma casa e as páginas que a formam. Elas abrem por `#/s07`, pelo Ctrl+K e pelo Índice. Não viram itens de menu. |
| **D3 — S02 no Cockpit** | A Caixa de entrada continua sendo a aba `ck20=inbox` do Cockpit. Os ids antigos `inbox` e `desk` abrem agora a aba certa; antes caíam no Painel. |
| **D4 — S03 em Gestão** | A casa é o Calendário (`calendar19`, Gestão › Rumo e direitos). "Agenda e contratações" (`agenda17`) e o calendário de shows (`cal17`) entram na mesma tela como páginas relacionadas. A agenda só coordena: o avanço continua no botão de sempre. |
| **D5 — S07: endereço mantido em Pessoas por compatibilidade, declarado** | A Parte VIII aceita isso explicitamente ("se o projeto mantiver o endereço atual em Pessoas… o índice deve declarar"). A nota está em `SCREENS29.S07.note`. Gestão, a busca ("contrato", "proposta", "royalties") e `#/s07` abrem o MESMO `contracts19`. Não existe um segundo contrato. |
| **D6 — S13 em Gestão** | Casa `finance`; o hub Dinheiro já separava caixa, competência, a receber/a pagar e obrigações (fin20). |
| **D7 — S15: Submundo agrupa, não funde** | `crime` e `fakes19` continuam páginas próprias, ambas na tela S15. Os aliases "submundo", "crime", "crimes", "fraude(s)", "golpes", "underworld" chegam ao mesmo destino. O hub r27 `under` já era a entrada. |
| **D8 — S17 é utilidade global** | O botão **Campanha** na barra de utilidades (ao lado de Buscar/Arquivo/Opções), o Ctrl+K e `#/s17` abrem o **passaporte**. Não é grupo de menu. |
| **D9 — Índice completo é utilidade global** | O botão **Índice** lista todas as páginas por grupo, com tela, id e motivo de disponibilidade (no menu · aba da página da sua carreira · ainda não existe nesta era/papel · nome antigo). |
| **D10 — ids antigos são aliases permanentes** | `ALIAS17`, hubs (`hub:money`), `desk`/`inbox`, ids de tela, intenções (`quero:hire`) e termos resolvem por `resolve29`. Nada foi renomeado. |

---

## 2. Mapa completo: ID → código

Legenda: ✅ feito (antes de R29) · 🆕 feito nesta rodada · 🟡 parcial · ⬜ falta · ⚠ conflito com decisão do autor (resolvido como indicado).

### 2.1 M01–M30

| ID | Status | Onde / o que | O que falta |
|---|---|---|---|
| M01 Catálogo único | 🆕 | `route29model.ts` (`SCREENS29`, `DESTS29`, `resolve29`, `avail29`) é **derivado** de `SECTIONS25`/`HUBS27`/`NAV17`/`ALIAS17`, então não pode divergir. Índice completo (`route29.ts`), Ctrl+K por termos, rotas `#/s15`, `#/submundo`. | Abas internas ainda vêm do registro gerado `tabsreg27`; não entram no índice de páginas. |
| M02 Atalhos por intenção | 🆕 | `INTENTS29` (8 intenções da Parte I §2.2) + `intentTarget29`: o passo depende do contexto. Exemplo: selo sem elenco → mercado; projeto com faixas por gravar → estúdio. Aparece no Ctrl+K. | Bloco "O que quero fazer?" visível no Cockpit (hoje só pela busca). |
| M03 Resumo/detalhe/histórico | 🟡 | Fichas de ato/pessoa (`pages.ts`), dossiê (`dossier13`), `ent27`. A ficha já tem abas de visão, formação, discografia e memória. | Padronizar a hierarquia das fichas de contrato e de projeto. |
| M04 Mesa personalizável | 🆕/🟡 | Bloco **Acompanhando** no Cockpit (`follow29`): artistas no radar (scout11) e páginas fixadas (☆), como objetos separados. Fixar/radar já existiam. | Escolher a ordem e quais blocos do Cockpit aparecem; "restaurar layout". |
| M05 Ficha contextual | 🟡 | Fichas abrem em modal sobre a página (foco volta ao fechar). Menu de contexto ctx27 (outro agente). | Inspetor lateral persistente no desktop. Fica para o agente do ctx27; não mexi. |
| M06 Mesma linguagem | ✅ + 🆕 | ui27 (componentes, tons, contraste). 🆕 `state29model.ts`: glossário de estados de dado (`KNOWN_L29`) e de entidade (`ENT_STATES29`). | Aplicar `show29` nas telas antigas que usam "—" para tudo. |
| M07 Uma ocorrência, várias vistas | 🟡 | `items18` alimenta a inbox e o Cockpit; `calendar19` tem `goto`. A revisão S03 aponta para a mesma decisão da inbox. | Um id de ocorrência único entre diário, inbox e agenda. |
| M08 Projeto em etapas | ✅ | `project12`, `journey23`, `review20`. | — |
| M09 Agenda única | 🟡 | `calendar19` (todos os prazos), `capacity14`, bolinhas em `agenda17`. A tela S03 junta os três pelo catálogo. | Vista semana/mês com capacidade por recurso numa grade. |
| M10 Revisão antes de avançar | 🆕 | **"Antes de avançar"** no Calendário (`review29`). Estados atendido/pendente/bloqueado/desconhecido; o padrão está escrito em cada decisão; promessas que vencem; prazos que pedem ação; verba já comprometida. Não avança nada. `askAdvance19` continua avisando no botão. | Abrir a revisão direto do botão Avançar, além do aviso atual. |
| M11 Avanço por critério | ✅ | `pacing8` (`advanceUntil`, critérios de parada) e o "Até…". | — |
| M12 Delegação com mandato | ✅ | `deleg16`, `budget19`. | — |
| M13 Cartões de decisão | ✅ | `decide18` (agora × depois, travas, prazo). | — |
| M14 Consequência ligada à decisão | 🟡 | Ecos (`dec18`), "Voltaram recentemente", `conseq27`. 🆕 a retomada mostra "decisão → escolha". | Link da consequência para a decisão original na inbox. |
| M15 Pré-requisito vira ação | 🟡 | Motivos de bloqueio (ctx27model, `actions20`), estados vazios com ação. | Resolvedor comum "o que falta → como resolver". |
| M16 Primeiro ciclo por papel | ✅ | `onboard28`, `tutorial*`, `tracks18`. | — |
| M17 "Onde eu estava?" | 🆕 | `resume29` + painel no Cockpit **só ao carregar uma partida**: data, prazo/sandbox, projetos, próximas datas, últimas escolhas. Diz "nada foi simulado enquanto você esteve fora". Tem "Continuar" e "Não mostrar mais". | —  (religar: caixa na Central da campanha) |
| M18 Densidade/texto/contraste | ✅ | `textScale`, `contrast`, `reducedMotion`, `colorblind`, `dens20`. | — |
| M19 Mobile com atalhos | 🟡 | Barra inferior com as 8 seções + folha (`tree27`). | O jogador escolher até 4 atalhos + Menu. |
| M20 Presets de apresentação | 🟡 | As preferências existem separadas (act27, cut27, audio28, Essencial/Completa). | Juntar em Guiado/Livre/Contemplativo. |
| M21 Comparação com proveniência | ✅/🟡 | `compare.ts`, `offer20`, `provbadge20`, `prov27`. | — |
| M22 Rede de relações | 🟡 | Aba Relações em lista (`pages.ts`), `links18`. | Grafo opcional (P2). |
| M23 Mundo relevante × inteiro | ✅ | `knownacts27`, `mundo27`. | — |
| M24 Cena ligada à escolha | ✅ | `cut27`/`cut28`, `quiet23` (álbum, rever cena). | Outro agente cuida das cutscenes. |
| M25 Enciclopédia contextual | ✅ | `gloss18`, `help18`, `explain18`. | — |
| M26 Revisão de fase | 🟡 | `review20`, `saga18`, capítulos (`end28`). | — |
| M27 Planejamento de cenários | 🟡 | `offer20` (alternativas), `review20`. | Planejador de orçamento (P2). |
| M28 Coleções/objetivos | 🟡 | `ach27`, `goals`, `tracks18`. | Metas definidas pelo jogador. |
| M29 Performance sem cortes | 🟡 | `docs/perf27.md`, paginação. | Virtualização de listas longas. |
| M30 Passaporte da campanha | 🆕 | `campaign29model.ts` + **Central da campanha**. Mostra: esquema do save (atual/mínimo) e compatibilidade; RNG; data; semente; início → fim ou sandbox; dificuldade (com o detalhe −2…+2); política histórica; mundo inicial; nomes reais; ironman; modo história; modificadores; filtros; narrador; identidade; apresentação. Separa **regras gravadas × identidade × preferência do navegador**. Save antigo: "guarde o arquivo, não apague". | — |

### 2.2 M31–M50

| ID | Status | Onde / o que | O que falta |
|---|---|---|---|
| M31 Identidade estratégica | ✅ | `identity`, "Rumo do selo" (`long18`), `paths18`. | — |
| M32 Brief criativo | 🟡 | `project12` (intenção/direção/público), conversa inicial do estúdio. | — |
| M33 Desenvolvimento de artista | 🟡 | `ability18` (Desenvolvimento), `traj18`. | — |
| M34 Preparação de show | ✅ | `show27` (setlist), `tours`. | — |
| M35 Promessas | ✅ | `promises28` (Cockpit, mesa). 🆕 também na revisão S03 e em "Comprometido". | — |
| M36 Pequenas conquistas | ✅ | `wins19`, `ach27`. | — |
| M37 Rivais legíveis | ✅/🟡 | `rivalsense28`, `rivals12`. | — |
| M38 Fracasso e recuperação | 🟡 | `assist28`, `tx20` (desfazer mês). 🆕 a revisão marca caixa negativo como **bloqueado**, com caminho para Finanças. | — |
| M39 Memória de relações | 🟡 | `holds17`, `npc17`, linha do tempo. | — |
| M40 Transição de era | ✅ | `ux19` ("Nova era"), cena, `eras8`/`era19`. | — |
| M41 Lote com prévia | 🟡 | Só na inbox (arquivar lidas, adiar em lote). | Lote de grupo no elenco (S04), com prévia. |
| M42 Rascunhos persistentes | 🆕/🟡 | `draft29.ts`. A **mesa de negociação** guarda a proposta ao fechar sem acordo (por partida, expira em 8 semanas de jogo) e a recupera com aviso; acordo ou ruptura apagam. O rascunho da Nova run já era um só (rápida/completa). | Persistir o rascunho da Nova run (fica com o agente da Nova run) e o do projeto. |
| M43 Histórico e retorno | 🆕/🟡 | Roteador com hash, ← →, recentes. 🆕 **"↩ Voltar a ‹origem›"** na barra de migalhas: reabre a página de onde você veio, com aba e rolagem lembradas. | Rotas para fichas de entidade (`#/act/…`). |
| M44 Alertas e histórico | 🟡 | `INT_PREF23`, `openNotes20`, boletim `notify19`. | Preferência por categoria. |
| M45 Linguagem de dinheiro/calendário | ✅ + 🆕 | `formatMoney`, `num27`, datas. 🆕 `month29`, `usd29` (sinal), `PERIOD29`. Indicadores com unidade/período/fonte (`indicators29`). | Mostrar a fonte dos KPIs do Cockpit na própria tela (o modelo já tem). |
| M46 Áudio opcional | ✅ | `audio28` (desligado por padrão, opt-in). | — |
| M47 Comparar períodos | 🟡 | DRE mensal/anual, "Agora × Último fechamento", 24 fechamentos (`close23`). | — |
| M48 Layout extremo | 🆕 | `scripts/r29/overflow.mjs`: 71 páginas em 390×844 e 1440×900, com nome de selo enorme. **0 estouros horizontais, 0 erros de página.** CSS novo com `overflow-wrap:anywhere`. | Rodar em aparelho físico. |
| M49 Núcleo de decisões | ✅ | `decide18`, `decnew18`, `quarter28`. | — |
| M50 Configuração compreensível | ✅ | Etapas, presets com desfazer, avisos (`newgame17`, `home27`). | — |

### 2.3 S01–S17

| Tela | Grupo (Parte VIII) | Casa | Status | O que esta rodada fez |
|---|---|---|---|---|
| S01 Cockpit | Cockpit | `cockpit` › Painel | ✅ + 🆕 | Retomada (M17), Acompanhando (M04), indicadores com fonte no modelo (`indicators29`). O modelo r27 não mudou. |
| S02 Correspondência | Cockpit | `cockpit` › Caixa de entrada | ✅ | `inbox`/`desk` abrem a aba certa; "correspondência", "cartas", "e-mail", "telefonema" na busca. |
| S03 Agenda e fechamento | Gestão | `calendar19` | 🆕/🟡 | **Antes de avançar** (M10). Agenda (`agenda17`) e shows (`cal17`) ligados pela tela. Falta a grade semana/mês por recurso. |
| S04 Elenco | Pessoas | `artists` | ✅ | Aliases. Falta o lote de grupo (M41). |
| S05 Ficha e formação | Pessoas | ficha do ato (`inspect.act`) | ✅ | Formação mensal (r27/r28) intocada. |
| S06 Scouting | Pessoas | `market` | ✅ | Intenção "Quero contratar". |
| S07 Negociação e contrato | Gestão (endereço em Pessoas, D5) | `contracts19` + mesa | ✅ + 🆕 | Rascunho persistente (M42); promessas entram na revisão S03. |
| S08 Projeto e repertório | Projetos | `project` | ✅ | Intenção "Quero lançar" escolhe a etapa. |
| S09 Estúdio | Projetos | `studio` | ✅ | — |
| S10 Lançamento e catálogo | Projetos | `releases` | ✅ | — |
| S11 Ao vivo | Ao vivo | `shows` | ✅ | — |
| S12 Sede | Sede | `hq` (+ `sede25`, `campus18`) | ✅ | — |
| S13 Finanças | Gestão | `finance` | ✅ + 🆕 | `money29` (realizado × comprometido × estimado, nada somado entre categorias) usado na revisão S03. A aba Posição (fin20) já separava os quatro conceitos, então não criei um segundo painel. |
| S14 Mundo | Mundo | `mundo27` | ✅ | — |
| S15 Submundo e fraudes | Mundo | `crime` (+ `fakes19`) | ✅ | D7: aliases. |
| S16 Você: trajetória | Você | `you` | ✅ + 🆕 | `trail29` (rumo, capítulos, continuidade história/sandbox). Story mode e storyboard (r28) intocados. |
| S17 Central da campanha | utilidade global | botão Campanha | 🆕 | Passaporte (M30) + atalhos para Arquivo, Opções e Índice. |

### 2.4 Nova run (NR)

O agente da Nova run cuida do rótulo de status e das opções de início. Aqui só há o mapa; não mexi nos arquivos.

| ID | Status | Onde |
|---|---|---|
| NR-01 Dois caminhos, um rascunho | ✅ | `quickRunConfig27`, `buildRun27` (home27model). |
| NR-02 Ano final independente | ✅ (decisão do autor) | `endyear28.ts`: início **e** fim, "Sem fim" = sandbox; o storyboard oferece continuar em sandbox. |
| NR-03 Snapshot revisado = gerado | ✅/🟡 | Etapa Revisão, `setupCode17`, `charPreview17`. O passaporte (M30) mostra a semente e a política gravadas na partida. |
| NR-04 Disponibilidade por era/papel | 🟡 | "Abre em {y}" na rápida. Falta o motivo na completa. |
| NR-05 Papel/fundar/assumir | ✅ | `takeoverCard`. |
| NR-06 Presets reversíveis | ✅ | `presetBar17` + "Desfazer a última predefinição". |
| NR-07 Validação no campo | 🟡 | Erro de ano e de código. |
| NR-08 Revisão no celular | 🟡 | `newgame20.css`. |
| NR-09 Apresentação/som separados | 🟡 | Ficam em Opções. O passaporte agora mostra a apresentação separada das regras. |

### 2.5 Conflitos com decisões do autor

- **"Não chamar nenhum preset de Completo" (M20) × vista "Completa" do menu.** Não há conflito real: "Completa" é a vista do menu, não um preset de dificuldade. Mantida.
- **Mobile com 4 atalhos (M19).** É uma proposta, não regra. A barra com 8 seções continua até o autor decidir.
- **Arte (G01/Parte VII).** Os mockups da Bíblia são direção, não especificação. Nenhuma arte foi trocada e o estilo pixel antigo foi preservado.
- **Áudio do álbum final (M46).** Continua opt-in.

---

## 3. Plano ordenado (Parte VIII · Prioridades normalizadas)

1. **Fundação.** Feito: M01, M06 (vocabulário), M30, M42 (mesa), M45 e M48. Parcial: M03, M05 (inspetor lateral, com o agente do ctx27), M07 (id de ocorrência único), M18 (já existia) e M50 (já existia).
2. **Ciclo.** S01/S02 → S06/S07 → S08–S10 → S13/S16, com S03 coordenando: ✅ ligado pelas mesmas fontes (catálogo, revisão, passaporte, retomada). Falta a grade semana/mês de S03.
3. **Conforto.** Já existiam: M11, M12, M43 (agora com o retorno nomeado) e M17 (🆕). Faltam: M04 (ordem dos blocos), M19 (atalhos escolhidos), M29 (virtualização), M41 (lote do elenco) e M44 (alertas por categoria).
4. **Profundidade (P2).** M22 (grafo), M27 (planejador), M28 (metas próprias), M20 (presets de apresentação). Depende das etapas acima.

---

## 4. Arquivos

**Novos** (todos em `src/ui/ps/`, sem DOM nos `*model.ts`):

- `route29model.ts`: catálogo, 17 telas, intenções, aliases, disponibilidade.
- `route29.ts` + `.css`: Índice completo, Central da campanha, comandos do Ctrl+K, "↩ Voltar a".
- `campaign29model.ts`: passaporte.
- `state29model.ts`: estados de dado/entidade, mês, dinheiro.
- `screens29model.ts`: `indicators29`, `review29`, `money29`, `follow29`, `resume29`, `trail29`.
- `screens29.ts` + `.css`: "Antes de avançar", "Onde eu estava?", "Acompanhando".
- `draft29.ts`: rascunhos.

**Editados** (aditivos, uma a poucas linhas cada):

- `src/ui/app.ts`:
  - `bindRoute29`;
  - `open29`;
  - `go()`/router resolvem pelo catálogo;
  - 2 botões de utilidade;
  - `paletteCmds29`;
  - `backChip29`.
- `src/ui/sys/cockpit14.ts`: `cockpit29Into` no Painel.
- `src/ui/sys/calendar19.ts`: `review29View`.
- `src/ui/act27/negotiate27.ts`: rascunho ao abrir/fechar.

**Scripts:** `scripts/r29/shots.mjs`, `util.mjs`, `cycle.mjs`, `overflow.mjs` (servidor: `npx vite --port 5179`).

## 5. Números

- **Catálogo:** 92 páginas inventariadas (`ALL_AREAS29`), todas com grupo entre os 8. 17 telas; 8 intenções; 10 decisões de rota.
- **Disponibilidade:** 5 estados de disponibilidade e 6 de dado.
- **Layout:** 71 páginas verificadas em 2 tamanhos, 0 estouros.
- **Determinismo:** goldens (r27-p2a/p2b/m2) não re-medidos: **nenhuma mudança no mundo**. Tudo é leitura ou preferência de interface. O teste confirma que os modelos não alteram o estado (JSON idêntico antes/depois).

## 6. Testes

- `tests/r29-reorg.test.ts`, 18 testes:
  - inventário antes ⊆ depois;
  - todo id antigo resolve;
  - hubs;
  - aliases Submundo/Crime/Fraudes, contrato, lançamento, formação, `s07`;
  - 17 telas nos 8 grupos;
  - alocação da Parte VIII;
  - S15 sem fusão;
  - intenções conforme o contexto;
  - disponibilidade com motivo;
  - estados de dado;
  - modelos do ciclo (consulta pura, padrão escrito por decisão, naturezas financeiras separadas);
  - Cockpit r27 intacto;
  - passaporte;
  - rascunho.
- Verdes, sem alteração: `r27-ux`, `r27-nav`, `r27-cockpit`, `r27-inbox`, `r27-home`, `r28-f4`.

## 7. Capturas (`docs/shots29reorg/`)

Todas em desktop 1440×900 (`-desk`) e celular 390×844 (`-mob`), locale pt-BR.

- **Antes:** `antes-*`. Home, Nova run, Nova run completa, Cockpit, Mercado, Contratos, Projeto, Estúdio, Lançamentos, Finanças, Calendário, Agenda, Você, Submundo.
- **Depois:**
  - `depois-indice-*`: Índice completo;
  - `depois-campanha-*`: Central/passaporte;
  - `depois-busca-fraudes-*`: Ctrl+K por termo;
  - `depois-alias-s15-*`: `#/s15` abre o Submundo;
  - `depois-calendar19-*` e `depois-revisao-*`: Antes de avançar;
  - `depois-cockpit-*`: Acompanhando;
  - `depois-retomada-*`: Onde eu estava?.

## 8. Lacunas, por ID

Do mais visível para o mais profundo:

- **S03:** grade semana/mês com capacidade por recurso.
- **M05:** inspetor lateral (com o agente do ctx27).
- **M07:** id de ocorrência único entre diário, inbox e agenda.
- **M19:** atalhos de celular escolhidos.
- **M41:** lote de grupos no elenco com prévia.
- **M44:** alertas por categoria.
- **M04:** ordem dos blocos do Cockpit.
- **M20:** presets Guiado/Livre/Contemplativo.
- **M42:** rascunho da Nova run e do projeto.
- **M43:** rotas de fichas.
- **M03:** hierarquia das fichas de contrato e projeto.
- **M15:** resolvedor comum de pré-requisito.
- **P2:** M22, M27, M28, M29 (virtualização).
- **NR-04, NR-07, NR-08:** com o agente da Nova run.

---

## 9. Estilo do Atlas visual (Parte IX), com a pixel art de hoje

O autor mandou as imagens do Atlas: S03–S17 e NR01–NR06, 2560×1440. São "conceito visual — não implementado". O pedido foi "fazer nesses estilos ou o mais próximo possível". Apliquei o **padrão comum** das imagens usando só a arte que já existe (art27, ícones pixel, sprites) e os tokens ui27. Nenhum sprite foi trocado e nenhuma ilustração do mockup foi copiada.

**Peças do padrão** (`src/ui/ps/atlas29.css`, `shell29.ts`):

| Peça | Como ficou |
|---|---|
| Cabeçalho-herói | Cartão com sobrescrito do grupo em dourado ("GESTÃO", "PESSOAS"), título grande e régua dourada curta. A ilustração art27 da página ocupa a metade direita, com degradê. No celular a arte sobe e esmaece embaixo. Vale para **todas** as páginas com `.ph27`. |
| Cartões-resumo coloridos | `triCards29`: borda verde/âmbar/azul, ícone, explicação, valores e "Ver origem". |
| Funil/jornada em chevrons | `steps29`, com a etapa atual em dourado. |
| Inspetor lateral | `layout29`: no desktop é uma coluna fixa à direita; no celular desce para baixo do conteúdo. |
| Cartões de link | `linkCards29`, com ícone, título, descrição e seta. No celular viram uma faixa rolável compacta. |
| Pílula de estado | `pill29`, com ponto e **texto** (nunca só cor). |

**Telas aproximadas** (topos em `screentop29.ts`, um encaixe só em `app.ts`):

| Tela | Status | O que ficou |
|---|---|---|
| S03 Agenda e fechamento | 🆕 | Calendário à esquerda e coluna **"Revisar período"**, agrupada em decisões pendentes, promessas, prazos e caixa. Diz que "nenhuma ação aqui faz o tempo avançar". |
| S06 Scouting / S07 Contratos | 🆕 | Funil **1 Descobrir → 2 Avaliar → 3 Acompanhar → 4 Negociar** sobre as páginas que já existem. |
| S08–S10 Projetos | 🆕 | **Jornada do projeto**: Projeto → Composição → Estúdio → Lançamento → Catálogo. |
| S11 Ao vivo | 🆕 | Modos de trabalho: Shows · Turnês · Agenda de shows · Temporada. |
| S12 Sede / S14 Mundo / S15 Submundo | 🆕 | Cartões de contexto. Mundo: Relevante agora × Mundo inteiro (M23). Submundo: Ocorrências · Fraudes (destino próprio) · Imprensa · Índice. |
| S13 Finanças | 🆕 | **Realizado · Comprometido · Estimado** com valores e "Ver origem". Avisa: "não se somam; desconhecido não é zero". |
| S16 Você | 🆕 | **"Sua história em marcos"** (capítulos e escolhas reais) e coluna **"Seu contexto"**: Objetivo, Relações, Compromissos, Diário, Álbum de cenas. |
| S17 Central da campanha | 🆕 | Atalhos (Retomar/salvar, Índice, Opções), **Ficha da campanha** em duas colunas e aviso "Consultar não altera a partida". |
| S04 Elenco, S05 Ficha | 🟡 | Só o herói. O inspetor "Formação/Projetos/Contratos" à direita da lista precisa refazer o painel `artists`, que fica para uma próxima rodada. |
| NR01–NR06 Nova run | ⬜ | Pertencem ao agente da Nova run (rótulo de status e opções de início). As imagens ficam como referência para ele. |

**Validação:**

- 71 páginas sem rolagem horizontal em 390 e 1440 px;
- `r27-ui` (contraste e componentes) segue verde;
- capturas em `docs/shots29reorg/atlas-*`: calendar19, finance, market, directory, contracts19, you, crime, hq, shows, mundo27, agenda17, project, artists e campanha, em `-desk` e `-mob`.

---

## 10. Rodada R29b: lacunas fechadas a pedido do autor (repassado pela sessão-mãe)

Base: `origin/claude/friendly-brown-vpsmfl`, que já inclui r29-scenes, r29-art e os fixes (ctx27 por seções, escada `start29`, rótulo de status). O merge entrou sem conflito. Cada item foi um commit com push.

| # | ID | O que ficou | Arquivos | Testes | Capturas |
|---|---|---|---|---|---|
| 1 | **S03 / M09** | Grade **Semana/Mês** com capacidade por recurso. Seis colunas ancoradas no relógio do jogo (`s.day`), mesmas fontes do motor:<br>• pessoas: `personLoad`, em % da agenda<br>• estúdio: sessões abertas<br>• dinheiro: a pagar − a receber agendados no ledger<br>• tempo: bolinhas do mês corrente; meses futuros ficam "desconhecido", nunca zero<br>• prazos do calendário<br>Cada célula tem cor **e** texto. Selecionar uma coluna mostra os prazos do período com "Abrir origem". É só consulta; o avanço continua no botão de sempre. | `ps/grid29model.ts`, `ps/grid29.ts/.css`, `screens29.calendarLayout29` | colunas e recursos; desconhecido fora do mês corrente; estado JSON idêntico antes/depois. `balls()` faz a virada preguiçosa do mês, por isso é lido sobre uma cópia. | `s03-antes-*`, `s03-depois-calendar19-*` |
| 2 | **S04 / S05 / M05** | **Inspetor lateral** do ato com as abas Formação, Projetos, Contratos (vigentes e promessas), Agenda (mês e prazos do ato) e Saúde (moral, cansaço, estresse, inspiração e integrantes). As **Ações** vêm de `menuSections27`, a mesma fonte do clique direito, e rodam pelo executor `CTXHOOK27`. "Abrir ficha completa".<br>• No Elenco: vista **Lista + inspetor** (padrão, `layout29`; no celular o inspetor desce) ou a **Ficha detalhada** de sempre.<br>• Na ficha do ato: o mesmo inspetor como aba **Resumo**. | `ps/insp29model.ts`, `ps/insp29.ts/.css`, `panels/artists.ts` (+ alternador) | abas, fontes, contratos vigentes, estado intacto | `s04-antes-artists-*`, `s04-depois-artists-*` |
| 3 | **M41** | **Lote** a partir do Elenco: marcar artistas → "Prévia da ação em lote…". Abre o painel de lote **que já existia** (`openBatch20`), não um segundo fluxo, agora com:<br>• a seleção pré-carregada;<br>• colunas Efeito e tempo;<br>• linha de **reversibilidade** por ação;<br>• aplicação em **dois passos**: "Revisar e confirmar…" e depois "Confirmar e aplicar". Nada é processado antes. | `ps/batch29.ts`, `ps/batch29model.ts`, `sys/actmenu20.ts` (aditivo) | reversibilidade declarada; nunca promete desfazer | `s04-depois-lote-*` |
| 4 | **M44** | **Alertas por categoria**: Finanças, Pessoas, Contratos/promessas, Projetos, Ao vivo, Mundo, Submundo e Jurídico.<br>• Opções: mostrar e prioridade (baixa → crítica), restaurar padrão.<br>• Caixa de entrada: faixa "Alertas:" com contagem não lidas/total; o filtro é só de vista.<br>• Cockpit: bloco na ordem escolhida; silenciadas aparecem contadas.<br>• Avanço: silenciadas não viram aviso flutuante e entram no "+N outros".<br>Tudo em `localStorage`, fora do save; regras, prazos e respostas padrão não mudam. | `ps/alerts29model.ts`, `ps/alerts29.ts`, `sys/mail27model.ts` / `sys/inbox27.ts` / `sys/ui20.ts` (aditivo), Opções | classificação pt/en (notas "Mundo:" ficam em Mundo); padrão; nada some da contagem; cada conversa em exatamente uma categoria | `m44-depois-cockpit_ck20_panel-*`, `…inbox-*`, `…opcoes-*` |
| 5 | **M20** | Estilos **Guiado / Livre / Contemplativo** em Opções, com prévia antes → depois em nomes legíveis, aplicar e "Desfazer o último estilo". Lista **fechada** de chaves: densidade, tutoriais, interrupções, ritmo das atividades e cenas, aviso antes de avançar, vista do menu. Nunca dificuldade, `assist28`, som, regras ou save. | `ps/presets29model.ts`, `ps/presets29.ts` | chaves permitidas; prévia exata; cópia; detecção; a partida não contém as chaves | `m20-depois-opcoes-*` |
| 6 | **NR01–NR06** | Nova run completa no estilo do Atlas:<br>• herói por etapa ("Nova run completa · n/6", título do Atlas, ícone pixel existente ampliado);<br>• etapas numeradas (atual em dourado, feitas com ✓);<br>• resumo e revisão como cartões;<br>• **Confirmação da campanha** (NR-03): semente, versão do save, valores herdados, início/fim e avisos.<br>**Mesmo rascunho e mesmo gerador** (`launchRun27`).<br>Correção M48: o editor de aparência vazava 57 px no celular (problema anterior), agora 0 px. | `ps/nr29.ts/.css`, `newgame.ts` (3 trocas pontuais) | `r27-home`, `r29-fixes`, `r28-f4` verdes; heróis das 6 etapas | `nr-antes-NR0x-*`, `nr-depois-NR0x-*` |

**Validação geral:**
- 11 arquivos de teste relacionados, 130 testes, todos verdes: r29-reorg, r27-ux/nav/cockpit/inbox/home/ui/ctx, r28-f4, r29-fixes, r20-g4.
- `tsc` limpo.
- 71 páginas sem rolagem horizontal em 390 e 1440 px, e as 6 etapas da Nova run sem estouro no celular.

**O que ainda falta:**
- **M41 para pessoas.** O lote cobre atos (o registro de ações em lote é por artista). Ações em lote sobre **pessoas** (integrantes, equipe) precisam marcar no `personact18` quais ações aceitam lote.
- **Capturas "antes" de Opções** (M20/M44). Os blocos são acréscimos; a tela anterior é a mesma sem eles. O "antes" do Cockpit é `depois-cockpit-*` da rodada anterior.
- **Grade S03 de pessoas.** Mostra até 6 integrantes (os mais carregados); a lista completa continua na Agenda e na capacidade de cada ato.
