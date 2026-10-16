# R31 · Onda 5 — SALAS (EXP-8, parte 1): salas antigas do r27 no padrão novo

Frente SALAS do polimento geral. As salas e cenas que ainda usavam o desenho chapado do r27 (parede lisa listrada,
piso xadrez solto, móveis genéricos, gente de pé em cima da mesa) foram refeitas no **corte da sede**, o mesmo
acabamento da POL/POL2 (`scene31px`): céu e vizinhos da época, parede de madeira/tijolo/papel da era, lâmpadas,
janela com a cidade e a época reais (`window31`), peças da fonte única (`prim27`, `stage31px`) e a **camada da frente**
(mesa, balcão, vidro) pintada depois das pessoas.

Código: `src/ui/r31/salas5px.ts` (pinturas PURAS, só Px) e `src/ui/r31/salas5ui.ts` (pinta no canvas com os bonecos).
Só aparência: a simulação não mudou; goldens r27-p2a, r27-p2b, r27-m3 e r16-playbot passam iguais.

## Inventário

| Sala / cena | Onde abre | Antes (r27) | Defeitos | Depois |
|---|---|---|---|---|
| Mesa de composição | `act27/compose27` | `scene27.paintTable27` 200×92 | **F** parceiros pintados por cima do tampo (de pé na mesa); **S** papel de parede listrado e piso xadrez; **G** cartas como quadradinhos soltos | `paintCompose5`: mesa de painel fechado na frente, parceiros sentados atrás (tronco à vista, pé escondido); quadro de cortiça com um cartão por ideia jogada (cor por tipo; sem cartas = bilhetes); piano de armário (até 1974), sintetizador (1975–99), modular na mesinha (2000+); rádio/TV da época; violão no suporte; janela com a cidade |
| Estúdio (gravação/mix) | `act27/record27` | `scene27.paintStudio27` | **S** parede de espuma inteira chapada; **F** técnica = retângulo de vidro sem ninguém; **G** bateria/amplificador simplificados | `paintStudio5`: sala de gravação com painéis de espuma, bateria e amplificador da fonte única, pedestais, tapete; parede da técnica com luz REC (ON antes de 1950); **técnica atrás do vidro** (caixilho, mureta e vidro translúcido na frente) com a mesa da época (torno de disco → mesa a válvula → console analógico → DAW → laptop), rolo de fita ou estante; o técnico da equipe (produtor/engenheiro) aparece se houver |
| Sala de guerra da campanha | `act27/campaign27` | `p2apx27.paintWarRoom27` | **V** sala sem ninguém; **S** parede/piso chapados; **F** aparelhos soltos na parede | `paintWar5`: calendário de semanas (estreia marcada, semanas riscadas), cartazes de rua acesos pela verba, janela com a cidade, termômetro de expectativa; mesa comprida com os aparelhos da época **sobre o tampo** (rádio de capela/transistor, TV, tela de clipes, computador, celular, jornal), acesos pelos canais com verba; até 3 da equipe sentados |
| Sala de crise (relógio) | `act27/crisis27` | `px27b.paintCrisis27` | **F** equipe de pé atrás de uma tábua (pés no ar); **S** chapada | `paintCrisis5`: quadro de avisos, janela, relógio grande que anda, gráfico caindo (lousa com giz antes de 1955, tela depois), giroflex que pisca pela ameaça; mesa com telefones da época (castiçal, disco, teclas, sem fio) — o que toca fica vermelho; equipe sentada |
| Coletiva / talk show / escândalo | `act27/interview27` (e entrevistas da campanha) | `p2apx27.paintPress27` | **F** quem fala flutuando; **S** repórteres = bolas de costas sobre xadrez | `paintPress5`: painel de fundo (cortina com letreiro, ou logos repetidos na crise), mesa com toalha até o chão e o cacho de microfones da época longe do rosto; quem fala sentado atrás; 4 repórteres de pé nos lados, câmera no tripé (1950+), holofote, flashes; calor da sala = vinheta vermelha |
| Golpe (quadro da operação) | `act27/heist27` | `heist27.boardPx27` 192×72 | **S** parede azul chapada, mesa solta | `paintHeist5`: sala dos fundos de tijolo, cortiça com o alvo, cartões da equipe e barbante, etapas; luminária baixa com o cone (mais vermelho com mais risco); mesa com a planta do lugar e telefone; a equipe de pé no chão |
| Estrada (turnê) | `act27/road27` | `px27b.paintRoad27` | **G** cidade genérica (a mesma em qualquer lugar/época); **S** van = retângulo com rodas (apontado pelo dono: "o ônibus está bem feio") | horizonte = **cidade real da próxima parada e da época** (`cityView31`), tingida pelo céu do evento; van por época (`tourVan5`): furgão de capô comprido com para-lamas e estribo (até 1949), perua de duas cores (1950–74), furgão quadrado com faixa (1975–99), van alta moderna (2000+); bagageiro com cases, motorista, calotas, farol/lanterna; quebrada = capô levantado e fumaça em rolos |

Já estavam no padrão (POL/POL2) e não mudaram: reunião de diretoria (`paintDirectors31`), as 7 salas de mecânica
(`scene31px`), interiores (`interior27`), loja/casa, aeroporto e leilão.

Fora desta frente (conferidas): a noite de olheiro (`night27`) é o mapa da cidade (frente PRED); o palco do show jogável
(`stage27`) é palco/plateia, não sala em corte; a cortiça do quadro de favores (`paintCork27`) é fundo de interface.

Pinturas antigas removidas (sem uso): `paintTable27`, `paintStudio27`, `paintWarRoom27`, `paintPress27`,
`paintPressFront27`, `paintCrisis27`, `boardPx27`. A folha de arte `tools/arte29c` passou a mostrar as salas novas.

## Checagem automática
`tests/r31-pol.test.ts` agora exige o registro `salas5` (`salas5px` → `registerPol31`): composição (com e sem cartas),
estúdio com técnico, sala de guerra, crise, coletiva, escândalo e golpe em 1935/1975/2015 — pé no chão ou atrás da
camada da frente, sem texto "vazio", rótulos sem colisão.

## Capturas (antes × depois, 1935 / 1975 / 2015)
`docs/r31/shots/onda5-salas-{composicao,estudio,guerra,crise,coletiva,escandalo,golpe,estrada}-antes-depois.png`.
Roteiro: `scripts/r31/salas5/` (`shoot.mjs` + página `index.html` que pinta cada cena com bonecos de exemplo;
`antes.ts` rodou no commit anterior, `depois.ts` nas salas novas; `sidebyside.py` monta as imagens).
