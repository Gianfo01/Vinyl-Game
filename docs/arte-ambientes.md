# Arte dos ambientes — alinhamento ao pacote de equipamentos v1

Sede isométrica, salas, estúdios, palcos e casas de show restilizados para conversar com
`art/pack-equipamentos-v1/` e com os personagens de `docs/arte-artistas/`. Tudo continua procedural
(sem PNG novo no jogo), varia por era/ano como antes e nenhuma regra de simulação, save ou texto mudou.

## Diagnóstico (antes)

| aspecto | pacote de assets | ambientes antes |
|---|---|---|
| paleta | mogno `#6e2e20`, latão `#c09048`, vinho `#8a2430`, cromado `#a8acb8`; cores quentes e um pouco dessaturadas | cores chapadas por era, algumas muito saturadas (azul 2000, branco puro 2010, vermelho `#9c1f24`, dourado amarelo) |
| sombreamento | rampa de 6 tons: sombra deslocada para o roxo, luz para o amarelo quente; volume pela forma | `shade()` só escurecia para preto/azul e clareava para branco; caixas com 1 px de realce |
| contorno | 1 px em `#170e12` em toda silhueta, linhas internas escuras entre camadas | sede: contorno translúcido (alfa 200) e de cor diferente por era; locais: o `outline()` do fundo não fazia nada (o fundo é todo opaco), então móveis, palcos e mesas não tinham contorno |
| pisos | superfícies limpas, juntas definidas | ruído "sal e pimenta" por pixel (carpete, cimento, chão de show), que vira chuvisco em zoom alto |
| paredes | camadas legíveis (rodapé, régua, sanca), latão como acento | faixas de 1 cor; lambri e tijolo sem luz/sombra |
| densidade de detalhe | ~150 px por objeto, cada camada com luz e sombra | detalhe concentrado nos móveis; parede, piso e palco quase planos |
| céu/luz | gradientes em faixas | pontilhado de 50 % no meio do céu (xadrez) |

## Decisões

1. **Utilitários de estilo em `src/ui/pixel/px.ts`** (reutilizáveis pelo resto do jogo, nenhuma assinatura antiga mudou):
   - `ramp6(cor)` — rampa de 6 tons idêntica à do motor de referência (`px.py`); `lv(cor, n)` pega o tom n (aceita fração);
   - `tint(cor, f)` — substituto de `shade()` que anda pela rampa (f < 0 → roxo, f > 0 → luz quente). `shade()` ficou
     igual para não mudar a arte de quem ainda o usa;
   - `volume()` + atalhos `discV/ellipseV/rectV` — sombreamento por volume (máscara "inflada", normal pelo gradiente,
     luz de cima à esquerda, tom 5 só com `spec`), com contorno opcional;
   - `inked(px, desenho)` — desenha numa camada, contorna a silhueta com `INK` e cola (resolve o contorno sobre fundo opaco);
   - `glint()` — brilho especular só em material brilhante; constantes `INK` (`#170e12`) e `HOUSE` (mogno/latão/vinho/cromado);
   - `Px.sbox` (caixa isométrica usada pelos móveis) passou a usar a rampa e ganhou linha escura no pé das faces.
2. **Paletas por era (`palette.ts`)**: contorno único `INK` em todas as eras (vale também para avatares e móveis, que já liam
   `pal.outline`); madeira puxando para o mogno, metais em latão (1920) e cromado (1950+), tecidos com vinho; 2010 trocou o
   branco puro por off-white quente, 2000/1980 ficaram menos saturados. Novo: `rampOf()`, `HOUSE_COLORS`, `INK` exportados.
3. **Pisos e paredes da sede (`tiles.ts`)**: tábuas/tacos/ladrilhos com junta escura (tom 1) e fio de luz (tom 4), carpete
   com trama miúda e manchas largas em vez de ruído; parede com rodapé saliente, oclusão sobre o rodapé e sob a sanca,
   lambri de mogno com régua de latão (1920), lambri setentista com veio, tijolo com luz em cima; muretas com tampo
   iluminado e linha escura entre camadas; contorno `INK` cheio. Tapetes com franja, borda em sombra e filete
   (latão em 1920/1990). Decalques (janela, discos de ouro, porta, relógio, troféus) com moldura em luz/sombra,
   brilho e contorno.
4. **Luz da sede (`hq.ts`, só desenho)**: oclusão em degraus arroxeados junto às paredes, luz das janelas quente,
   sombra do prédio e das pessoas em roxo escuro, placa da entrada com chanfro.
5. **Kit dos locais (`places/kit.ts`)**, mesmas assinaturas: parede com sanca/rodapé e oclusão; piso em perspectiva
   com tábuas, juntas e sombra roxa ao fundo; `box`, `table`, `stagePlatform`, `lightRig`, `plant` contornados
   (`box` passou a contornar por padrão — `0` desliga); cortina em 6 tons com varão de latão; telão e janela com
   moldura, reflexo e peitoril; palco com borda de latão; céu em faixas.
6. **Locais (`venues.ts`, `rooms.ts`, `rooms14.ts`)**: vermelho/dourado trocados por vinho/latão da casa; teatro com
   carpete vinho, ginásio com piso de quadra; mesa de som do estúdio com tampo iluminado, régua de latão e contorno;
   espuma acústica em pirâmide com luz/sombra; painéis setentistas com chanfro.

Fora do escopo (outras sessões): móveis/equipamentos isométricos (`sprites.ts`), avatares e plateia (`avatar.ts`),
ícones, cinemáticas e mapa. Eles já herdam o contorno `INK`, a paleta nova e o `sbox` com rampa; os sprites HD de
artistas não foram integrados.

## Validação

- `npm run typecheck`: sem erros.
- `npm test`: 945 passaram, 3 falharam, nenhuma por causa desta mudança. `r16-playbot` ("run curta com ações
  variadas") falha igual no commit de base, antes desta branch. `r14-db` ("enorme < 1500 ms") é limite de tempo:
  passa quando roda sozinho e só estoura com a suíte inteira em paralelo. A terceira falha é um timeout do worker
  do vitest (`onTaskUpdate`) com a máquina carregada. Os testes de cenas e da sede (`r12-scenes-eras`,
  `r12-rivals-hq`, `r14-scenes`, `r16-scenes`) passam.

## Antes e depois

Capturas com Playwright (Chromium) a partir de um harness local que monta a sede (`HqView`, nível Loft, ano fixo)
e os locais (`placeView`/`scene14`) com movimento reduzido.

### Sede — 1925, 1965, 2015

| antes | depois |
|---|---|
| ![](arte-ambientes/hq_1925_antes.png) | ![](arte-ambientes/hq_1925_depois.png) |
| ![](arte-ambientes/hq_1965_antes.png) | ![](arte-ambientes/hq_1965_depois.png) |
| ![](arte-ambientes/hq_2015_antes.png) | ![](arte-ambientes/hq_2015_depois.png) |

Extras: Complexo em 1985 e Loft em 2035.

| antes | depois |
|---|---|
| ![](arte-ambientes/hq_1985_antes.png) | ![](arte-ambientes/hq_1985_depois.png) |
| ![](arte-ambientes/hq_2035_antes.png) | ![](arte-ambientes/hq_2035_depois.png) |

### Shows — clube em 1925, 1965, 2015

| antes | depois |
|---|---|
| ![](arte-ambientes/club_1925_antes.png) | ![](arte-ambientes/club_1925_depois.png) |
| ![](arte-ambientes/club_1965_antes.png) | ![](arte-ambientes/club_1965_depois.png) |
| ![](arte-ambientes/club_2015_antes.png) | ![](arte-ambientes/club_2015_depois.png) |

### Teatro, arena e festival

| antes | depois |
|---|---|
| ![](arte-ambientes/theatre_1925_antes.png) | ![](arte-ambientes/theatre_1925_depois.png) |
| ![](arte-ambientes/theatre_1965_antes.png) | ![](arte-ambientes/theatre_1965_depois.png) |
| ![](arte-ambientes/arena_1985_antes.png) | ![](arte-ambientes/arena_1985_depois.png) |
| ![](arte-ambientes/festival_1969_antes.png) | ![](arte-ambientes/festival_1969_depois.png) |

### Estúdio (técnica) — 1925, 1965, 2015

| antes | depois |
|---|---|
| ![](arte-ambientes/studio_1925_antes.png) | ![](arte-ambientes/studio_1925_depois.png) |
| ![](arte-ambientes/studio_1965_antes.png) | ![](arte-ambientes/studio_1965_depois.png) |
| ![](arte-ambientes/studio_2015_antes.png) | ![](arte-ambientes/studio_2015_depois.png) |

## Próximos passos sugeridos

- `sprites.ts` (móveis da sede) pode trocar `shade()` por `tint()` e usar `volume()`/`glint()` nas peças redondas
  (bateria, plantas, vasos, poltronas) para fechar o visual com o pacote.
- Plateia e avatares: usar `ramp6()` nas roupas para as sombras arroxeadas.
