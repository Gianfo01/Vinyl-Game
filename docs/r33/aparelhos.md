# APARELHOS33 — celular e computador (versão 33)

Escopo: `docs/r33/CELULAR_PC.md`. Interruptor `exp33.aparelhos` (**ligado** por padrão; Editor › Interruptores
"V33 · celular e computador"). Só aparece com a casca da onda 5 (`exp5.nav`).

## O que entrou

- **Botão CELULAR** no menu de baixo, o quinto (depois de Sede, Casa, Cidade, Mundo), tecla **⇧5**, só de 1983 em
  diante. O "!" é a soma dos "!" dos apps, que vêm das mesmas pendências de hoje (`bangs5`). Abre o aparelho por cima
  da cena, sem trocar de lugar (EXP-13); Esc volta à tela inicial e depois fecha.
- **Computador**: o PC da mesa do escritório. É o upgrade "Computador com planilha" do livro-caixa (1982–2010; de 2010
  em diante o "Painel financeiro em tempo real"). O cartão do livro-caixa ganhou "Instalar computador na mesa" (o mesmo
  `buyDeco31` + `setReq31` do Arrumar). Instalado, o PC aparece como mesinha de trabalho ao lado da mesa do mês, com
  cartão de ações (ACOES5): Ligar o PC, E-mails, Planilha de vendas, Gravar demo caseira, Trocar de computador (loja).
- **Catálogo pelo correio** na mesa (1889–1999): cartão "Folhear o catálogo" abre a folha com as peças e a mesma compra
  a distância do `decoshop31` (`orderDeco31`, preço `remotePrice31`, prazo da época).
- **5 versões de cada aparelho** desenhadas em `Px` (`src/ui/r33/aparelhos33px.ts`): tijolão 1983 (visor verde),
  flip 1997, primeiro smartphone 2007, smartphone 2012, holograma no pulso 2032 (a luz sai do projetor, com o cone até a
  tela); PC de tela verde e disquete 1982, de janelas e modem 1995, de banda larga 2003, tela plana 2012, lâmina de
  vidro 2032.
- **Apps e ações** (`src/ui/r33/aparelhos33model.ts`): as tabelas `PHONE_APPS33`/`PC_APPS33` são as da
  especificação; cada ação tem `de`–`até`, a função que já existe (`fn` + `src`, conferidos pelo teste), a trava da
  própria regra (`lock`, mostrada cinza com o motivo por `lockBtn31`) e o sistema de origem (`sys`: desligado = some).
  O conteúdo da tela usa os componentes do jogo: botão do cartão de ações, trava, retratos `portraitCanvas`,
  miniaturas `decoPx5` das peças, fontes do jogo.
- **Minijogos** (`src/sim/r33/jogos33.ts`, lógica pura com semente): tênis de dois traços e labirinto (PC), cobrinha
  (1997), blocos (2007), toque rápido (2012), cobrinha em holograma (2032). Teclado (setas; no celular de 1997 também
  2/4/6/8). Cada partida baixa o estresse do dono até 8 pontos por mês; o recorde vira fato do diário (`hobby33`).
- **Mecânicas novas** (`src/sim/r33/aparelhos33.ts`): toque de celular como formato (1997–2009, curva própria,
  renda mensal pequena); demo caseira (a sessão do `compose27` no automático, 1 bolinha, qualidade ×0,72); ligação
  por época (minuto caro 1983–96; vídeo 2012+ e holograma 2032+ pesam mais no `shiftTie31`); assistente de IA 2032+
  (responde até 4 mensagens com a resposta padrão via `answerMsg`; 8% de erro → fato `industry_suit` → sala de crise
  `openCrisis27`); denúncia de pirataria 1999–2010 (custas, processo no gancho `registerLegalCase33`, ganhando as
  cópias saem da vitrine e 30% do prejuízo volta); assinatura de fãs 2013+ (núcleo × lealdade do `fans18`, teto);
  vazamento do álbum 1999+ (evento `ap33_leak` com lançar às pressas / processar / usar a favor, no lugar do
  vazamento antigo dali em diante); cambistas e preço dinâmico 2012+ (`setTix` do `clash17`); deepfake de voz 2023+
  (`resolveFake18` derrubar/licenciar e `licenseClone18`).

## Gancho para a REDES33

```ts
import { registerPhoneApp33, registerPcApp33, registerAct33 } from '../r33/aparelhos33model';

registerPhoneApp33({
  id: 'redes',                  // o lugar já está reservado nas tabelas (2007, 2012, 2032)
  name: l('Redes', 'Social'),   // ou (s, dev) => L
  icon: 'redes',                // ícone do catálogo (aparelhos33px) — ou outro id que a frente desenhe
  de: 2004,                     // anos do app (ate opcional)
  vers: [2007, 2012, 2032],     // opcional: versões do aparelho (sem isto, as da tabela; app fora da tabela vai para o fim)
  sys: (s) => redesOn(s),       // opcional: sistema desligado = app some
  bang: (s) => pendRedes(s),    // opcional: "!" do app (entra na soma do botão CELULAR)
  open: ({ s, dev, ver, ctx }) => tela(s, ctx), // tela própria (HTMLElement); sem `open`, a casca lista as ações do catálogo
});
registerAct33('red.postar', { app: 'redes', label, de: 2010, kind: 'do', fn: addHype, src: ['sim/sys/hype12', 'addHype'], run, lock });
```

`ctx` (`Ctx33`): `go(obj, marcador?)` leva ao objeto do mundo (cartão ACOES5), `travel(região)`, `app(id)` troca de
app, `close()`, `say(texto)`, `refresh()`. O Jornal continua sendo da REDES33 (o catálogo pelo correio da mesa é só a
compra a distância). A Câmera (foto que vira post) espera o app Redes: sem ele, o app mostra só paparazzi/segurança.

## Arquivos

- `src/sim/r33/aparelhos33.ts` — interruptor, versões, estado `x4.ap33` (nasce na primeira escrita), mecânicas novas.
- `src/sim/r33/jogos33.ts` — minijogos (lógica pura).
- `src/ui/r33/aparelhos33model.ts` — apps, ações, tabelas, gancho de registro (sem DOM).
- `src/ui/r33/aparelhos33.ts` + `.css` — a casca (tela por cima da cena, botão do menu, teclado, objetos e cartões).
- `src/ui/r33/aparelhos33px.ts` — arte.
- Pontos mínimos em arquivos da casca: `nav5.ts` (`DOCK5`, `NAV5.phone`, tecla `sys:phone`), `shell5.ts` (botões do
  `DOCK5` no menu de baixo, tela por cima, Esc), `keys5.ts` (⇧5 = celular; a pilha de demos foi para ⇧9),
  `objects5.ts` (tecla da pilha de demos), `sede5.ts` (`SEDE_ART5`/`SEDE_HAS5`: objetos com arte de outra frente),
  `app.ts` (carrega a casca do aparelho por último).
- Teste: `tests/r33-aparelhos.test.ts`. Prints: `docs/r33/aparelhos/` (`scripts/r33/shots-aparelhos.mjs`).

## Pendências

- Com o interruptor ligado por padrão, o vazamento de 1999+ passou a ser o evento novo e as rendas de toque/assinatura
  só existem quando o jogador usa: os goldens não foram rodados (regime da 33); o QA33 confere.
- Câmera → post e o app Redes ficam com a REDES33 (gancho pronto).
- Entrega do catálogo/loja: o prazo real é o do `decoshop31` (correio em semanas, internet na semana seguinte); a
  linha "no mesmo dia" (2015) e "drone" (2030) é só texto, como pede a especificação.
