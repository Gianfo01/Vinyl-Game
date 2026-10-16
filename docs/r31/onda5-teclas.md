# Onda 5 · mapa final de teclas (TEC)

Fonte única em código: `src/ui/r31/keys5.ts` (sistema, viagem, marcadores, teclas internas de papéis) e as teclas dos
objetos em `src/ui/r31/objects5.ts` (`registerObject5` registra a tecla de cada objeto em `keys5`). As tabelas abaixo
são **geradas** do código e conferidas por `tests/r31-w5-tec.test.ts` (`UPDATE5=1` regrava). Tudo fica atrás do
interruptor `exp5.nav` (DESLIGADO por padrão, no editor em Ferramentas): desligado, valem as teclas de hoje (`KEY17`,
Shift+1…6 do menu) e nada muda.

## Regras

1. **Uma tecla por objeto, por lugar e por função do sistema.** Várias páginas dentro do mesmo objeto dividem a tecla
   do objeto; dentro do papel, `{` e `}` trocam o marcador.
2. **Manter o máximo das teclas atuais.** Toda tecla de `KEY17` continua abrindo a mesma página (pelo objeto dono) —
   menos as quatro do pedido (C, E, G, H) e Shift+1…6 do menu. Teclas de páginas que viraram marcador de outro objeto
   (P pessoas, Q críticos, R hall da fama, 0 empresa, 8 criação) continuam e abrem o objeto já no marcador.
3. **Segunda camada: Shift + letra/dígito.** Hoje Shift+letra repete a letra. Na onda 5 é a camada dos objetos que não
   tinham tecla (arquivo de aço, telefone, bar, aeroporto…) e das páginas deslocadas (Shift+G empresário). Shift+dígito
   livre é o "irmão" do objeto do dígito (5 olheiro → Shift+5 demos; 8 criação → Shift+8 piano; 7 masters → Shift+7
   lembranças).
4. **Reservadas (não configuráveis):** Ctrl K e `/` buscar, Ctrl Enter avançar, `?` teclas, `{ }` marcadores, Esc
   fecha/pausa, Alt (segurar) mostra nomes, Tab troca de casa. Só letras e dígitos aceitam Shift (Shift+[ é `{`).
5. **Teclas internas de um papel** (caixa de entrada: J/K, Enter, E arquiva, S estrela, Esc — as de hoje, em
   `src/ui/sys/inbox27.ts`; o mapa citava A/S) valem só com ele aberto e ganham das globais enquanto ele está aberto.
   Não são conflito.
6. **"!" e tecla no objeto:** o objeto mostra a tecla ao passar o mouse (ou com Alt); a ajuda `?` lista as globais.

## Conflitos dos mocks, resolvidos

| Tecla | Nos mocks / hoje | Decisão |
|---|---|---|
| C | Mock: calendário de parede. Hoje: Compromissos (`plan`). | C abre o **quadro de planejamento** (a mesma página `plan`, agora o quadro com o elenco por mês). O calendário foi para a agenda (G). |
| G | Mock e mapa: telefone. Hoje: página de empresário (`cp17-manager`). | G = **agenda de couro** (`agenda17`, `calendar19`, `cal17`). Telefone = Shift+T; empresário = Shift+G. |
| E | Hoje: outras carreiras (`careers`). | E = **caixa de entrada** (correspondência da época). `careers` virou marcador do escritório em casa (N). |
| H | Hoje: Lendas (`lendas`). | H = **volta à sede** de qualquer lugar. Lendas virou marcador do livro "Cultura" (M). |
| Shift+1…4 | Hoje: Hoje, Sede, Cidade, Mundo (Shift+5 Você, Shift+6 Listas). | Shift+1…4 = **viagem**: Sede, Casa, Cidade, Mundo (a mesma ordem dos botões). "Hoje" é a mesa do mês (1); Listas some (índice na pausa). |
| Esc | Hoje: fecha janelas. | Fecha o papel aberto; sem nada aberto, abre o **menu de pausa**. |
| Alt | Hoje: sem uso. | Segurar Alt **mostra os nomes** e as teclas de todos os objetos. |

## Personalização (preparada, sem tela ainda)

- `Bind5` = `{ id, chord, act, label, scope, fixed?, legacy? }`. O jogador troca a tecla de um `id`
  (`Custom5 = { id: tecla }`); `applyCustom5` aplica por cima do padrão e devolve o que recusou, com o motivo.
- `checkRebind5(id, tecla)` recusa: função do sistema (`fixed`), tecla reservada, formato inválido (só letra, dígito,
  Shift + letra/dígito ou símbolo) e tecla já usada no mesmo escopo (diz qual função já usa).
- `conflicts5()` lista teclas repetidas no mesmo escopo (o teste exige lista vazia).
- A preferência é do jogador (não muda o mundo); quando a tela existir, fica junto das opções.

## Tabelas (geradas)

<!-- gerado:keys5 -->
### Sistema

| Tecla | Função | Antes |
|---|---|---|
| Ctrl K | Buscar (pessoas, selos, obras, "quero…") | igual |
| / | Buscar (atalho curto) | igual |
| Ctrl Enter | Avançar mês | igual |
| ? | Lista de teclas | igual |
| { | Marcador anterior do papel aberto | igual |
| } | Próximo marcador do papel aberto | igual |
| Esc | Fecha o papel aberto; sem papel aberto, abre o menu de pausa | nova |
| Alt | Segurar: mostra o nome e a tecla de todos os objetos | nova |
| Tab | Troca de casa (várias carreiras ativas) | nova |

### Viagem (botões fixos)

| Tecla | Função | Antes |
|---|---|---|
| H | Volta à sede de qualquer lugar | nova |
| ⇧1 | Viagem: Sede | antes: ⇧2 |
| ⇧2 | Viagem: Casa | antes: ⇧5 |
| ⇧3 | Viagem: Cidade | igual |
| ⇧4 | Viagem: Mundo | igual |

### Objetos

| Tecla | Função | Antes |
|---|---|---|
| 1 | Mesa do mês | igual |
| 2 | Maquete do prédio | igual |
| 3 | Revista de paradas | igual |
| 4 | Mural de cortiça | igual |
| 5 | Mesa do olheiro (caderno) | igual |
| 6 | Rádio/TV | igual |
| 7 | Prateleiras de masters | igual |
| 9 | Palco de ensaio | igual |
| A | Fichário de contatos | igual |
| B | Contador | igual |
| C | Quadro de planejamento | igual |
| D | Diário na gaveta | igual |
| E | Correspondência | nova |
| F | Quadro de metas | igual |
| G | Agenda de couro | nova |
| I | Gráficos na parede | igual |
| J | Terreno do festival | igual |
| K | Gravadoras rivais | igual |
| L | Gravadora (identidade e venda) | igual |
| M | Livro "Cultura" | igual |
| N | Escritório em casa | igual |
| O | Estante de troféus | igual |
| S | Mesa de som | igual |
| T | Quadro de funcionários | igual |
| U | Quadro branco | igual |
| V | Espelho | igual |
| W | Mapa-múndi | igual |
| X | Cofre de casa | igual |
| Y | Porta-retratos | igual |
| Z | Livro-caixa | igual |
| ⇧0 | Caderno na estante | nova |
| ⇧5 | Pilha de demos | nova |
| ⇧7 | Estante de lembranças | nova |
| ⇧8 | Piano | nova |
| ⇧A | Aeroporto e porto | nova |
| ⇧B | Bar | nova |
| ⇧C | Arquivo de aço | nova |
| ⇧D | Chefe de gabinete | nova |
| ⇧E | Secretária eletrônica (recados) | nova |
| ⇧F | Porta-retrato | nova |
| ⇧G | Escritório de empresário | antes: G |
| ⇧I | Fábrica | nova |
| ⇧J | Terreno do seu festival | nova |
| ⇧K | Prefeitura | nova |
| ⇧L | Lounge (artistas sentados) | nova |
| ⇧M | QG da banda | nova |
| ⇧P | Estúdios e produtores | nova |
| ⇧Q | Sua mesa no jornal | nova |
| ⇧R | Mesa de reunião | nova |
| ⇧S | Estúdio de cinema | nova |
| ⇧T | Telefone | nova |
| ⇧V | Telefone de casa | nova |
| ⇧W | Telex na borda | nova |
| ⇧X | Casa de leilões | nova |
| ⇧Y | Loja de instrumentos | nova |
| ⇧Z | Cofre da empresa | nova |
| - | Sua editora | igual |
| , | Redação | igual |
| ; | Beco do submundo | igual |
| . | Sala de servidores | igual |
| ' | Jornal na mesa | igual |
| [ | Agência | igual |
| ] | Seu estúdio | igual |
| \ | Sala de gravação | igual |
| = | Sua casa de shows | igual |

### Teclas de marcador (atalhos de hoje que abrem o objeto já no marcador)

| Tecla | Função | Antes |
|---|---|---|
| P | Mural do elenco › Pessoas | igual |
| Q | Jornal › Críticos | igual |
| R | Estante de troféus › Hall da fama | igual |
| 0 | Quadro de funcionários › Empresa | igual |
| 8 | Mesa de som › Criação | igual |

### Dentro do papel "correspondencia" (ganham das globais enquanto ele está aberto)

| Tecla | Função | Antes |
|---|---|---|
| J | Próxima mensagem | igual |
| K | Mensagem anterior | igual |
| Enter | Abrir a mensagem | igual |
| E | Arquivar | igual |
| S | Marcar com estrela | igual |
| Esc | Fechar a caixa | igual |

### O que mudou

| Tecla | Antes | Agora | Por quê |
|---|---|---|---|
| E | Outras carreiras (careers) | Caixa de entrada (correspondência da época) | Pedido do dono: E = caixa de entrada. "Outras carreiras" virou marcador do escritório em casa (tecla N). |
| G | Página de empresário (cp17-manager) | Agenda de couro (agenda, calendário, shows marcados) | Os mocks tinham G = telefone; o pedido fixou G = agenda. A página de empresário foi para Shift+G; o telefone ficou com Shift+T. |
| H | Lendas (lendas) | Volta à sede de qualquer lugar | Regra 8 do mapa: H volta à sede. Lendas virou marcador do livro "Cultura" (tecla M). |
| C | Compromissos (plan) | Quadro de planejamento (plan, com o elenco por mês) | Mesma página, objeto novo: nos mocks C era o calendário; o calendário virou a agenda (G) e C abre o quadro de planejamento. |
| ⇧1 | Menu: Hoje | Viagem: Sede | Botões de viagem Sede, Casa, Cidade, Mundo em Shift+1…4. "Hoje" virou a mesa do mês (tecla 1). |
| ⇧2 | Menu: Sede | Viagem: Casa | "Você" virou a sua casa (EXP-6) e entra no segundo botão de viagem. |
| ⇧5 | Menu: Você | Pilha de demos (talentos) | Você agora é Shift+2 (Casa). Shift+dígito livre vira "irmão" do objeto do dígito: 5 olheiro, Shift+5 demos. |
| ⇧6 | Menu: Listas | (livre) | Listas some (o índice completo fica no menu de pausa). |
| Esc | Fecha janelas | Fecha o papel aberto; sem nada aberto, menu de pausa | Pausa com salvar, opções, ajuda, editor e índice (mock da pausa). |
| Alt | (sem uso) | Segurar mostra nomes e teclas dos objetos | Rótulos só ao passar o mouse ou com Alt (decisão do dono sobre os mocks). |
| ⇧A … ⇧Z | Mesma página da letra minúscula | Objetos sem tecla antes (arquivo de aço, telefone, bar, aeroporto…) | Hoje Shift+letra repete a letra; na onda 5 é a segunda camada, para dar tecla a todo objeto sem tirar nenhuma das atuais. |
<!-- /gerado:keys5 -->
