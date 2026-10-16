# Onda 5 · arte nova (ART5)

Arte dos objetos e papéis do jogo explorável, em pixel art desenhada por código (mesmo estilo da sede `hqpx27`/`salas31px`
e dos interiores `props31`: luz de cima à esquerda, sombra arroxeada, contorno escuro quente, paleta da era). **Ainda não
está ligada em nenhuma tela**; quem montar as cenas da onda 5 usa estes módulos.

## Módulos
- `src/ui/pixel/exp5px.ts`
  - `obj5Px(id, ano, estado)`: 31 objetos (`OBJ5`), cada um com tamanho fixo e margem `PAD5` para o brilho e o selo.
  - 6 épocas (`ep5Of`): 1889–1919, 1920–49, 1950–69, 1970–89, 1990–2009, 2010–2040.
  - 3 estados: `idle` (parado), `new` (selo "!"), `lit` (aceso: anel dourado e o que tem luz acende).
  - Luz (cones de abajur, halos) fica numa camada própria, sem contorno.
  - `travel5Px(id, estado)`: ícones 16×16 de viagem (Sede, Casa, Cidade, Mundo).
- `src/ui/pixel/exp5paper.ts`
  - `paper5Px(tipo, w, h)` + `paper5Layout`: 9 molduras (livro-caixa, caderno do olheiro, quadro branco, revista de
    paradas, mural de cortiça, quadro de planejamento, agenda de couro, fichário, ficha em prancheta). O layout dá onde
    entram o título, as abas e as páginas em HTML.
  - Peças: `tab5Px` (aba do próprio objeto), `polaroid5Px`, `card5Px`, `postit5Px`, `tack5`, `magnet5`.
  - Caixa de entrada: `inbox5Look(ano)` escolhe a aparência (escrivaninha → cartas e telegrama → fax e secretária →
    monitor de tubo → tela plana → celular); `inbox5Layout` tem a mesma estrutura em todas (cabeçalho, abas, filtros,
    lista, leitura, pendências, teclas); `inboxItem5Px` é o fundo de cada item (lacre, telegrama, fax, linha, cartão)
    com a cor da categoria (`CAT5`).
- `src/ui/pixel/exp5gallery.ts` + `docs/r31/mocks/onda5/galeria-art.html`: galeria para aprovação (com o vite rodando).

## Escala
Pixels lógicos iguais aos da sede. O boneco tem 24×34; a porta tem 22×38; a mesa bate na cintura (26); o telefone (14×16)
cabe sobre a mesa.

## Galeria e teste
- Capturas: `node scripts/r31/shots-exp5art.mjs` → `docs/r31/shots/onda5-art-galeria-*.png`.
- Teste: `tests/r31-exp5-art.test.ts`. Confere que tudo desenha no tamanho certo e que cada época e cada estado são
  diferentes. Também confere que nenhum desenho é um bloco de uma cor só e que as áreas de HTML ficam dentro da moldura
  sem se sobrepor.
