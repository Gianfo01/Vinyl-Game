# Arte: ícones, capas e logos no estilo do pacote v1

Alinha os ícones da UI, as capas de disco e os logos ao estilo oficial (`art/pack-equipamentos-v1/_folha.png`,
`docs/arte-artistas/_sheet.png`, regras em `.claude/skills/masters-artist-sprites/SKILL.md`). Nenhuma regra de
simulação, save, texto, nome ou ID exportado mudou.

## Inventário

| Arquivo | O que desenha | Onde aparece |
| --- | --- | --- |
| `src/ui/pixel/icons.ts` | 54 ícones 16×16 (`ICON_NAMES`) | menu, botões, cabeçalhos, pílulas (16 px; 32 px em destaque) |
| `src/ui/pixel/icons17.ts` | 41 ícones 16×16 (`ICON17_NAMES`) | grupos e páginas do menu |
| `src/ui/art.ts` | logo 32×32, crachá, cartaz 14×19, capa 40×40 (9 estilos por era + 7 escolhas do jogador) | listas de atos e selos (18–40 px), sede, lançamentos/catálogo (96 px) |
| `src/ui/pixel/font.ts` | fonte bitmap 3×5 | textos das capas, logos e alguns ícones |
| `src/ui/provbadge20.ts`, `src/ui/ab18stars.ts` | pílula CSS e estrelas Unicode | **não são pixel art**; ficaram como estão |

## Diagnóstico (antes)

- **Contorno**: `#1a1214`/`#120d10`, quase neutro; o estilo pede `#170e12` (quente).
- **Rampas**: cores chapadas, no máximo um pixel de brilho branco desenhado à mão. Sem sombra, sem volume, sem luz
  de cima à esquerda.
- **Paleta**: saturada e fria (amarelo `#f0c040`, vermelho `#e04848`, azul `#4a8ae0`, verde `#48b85c`). Faltavam
  mogno, latão, vinho e cromado.
- **Brilho**: realces brancos (`#ffffff`, `#fff2b0`) em qualquer material, inclusive tecido e papel.
- **Leitura em 16 px**: pontilhado (microfone e alto-falante do rádio) que vira xadrez; anel e cifrão da moeda se misturavam.
- **Capas/logos**: boa variedade por década, mas fundos digitais lisos, sem textura de papel ou vinil, sem volume e
  sem contorno. Saturação no máximo (psicodelia, néon).

## O que mudou

**`src/ui/pixel/finish.ts`** (novo): o acabamento da casa em TypeScript, portado de `scripts/px.py`:
- `ramp6(cor)`: 6 tons, sombra arroxeada e luz quente, com os mesmos coeficientes do `px.py`. `tone(cor, n)` devolve um tom.
- `relief(px, opts)`: luz de cima à esquerda. A altura vem da distância à borda e o tom, da normal. O tom 5 só vale
  para material brilhante (`spec`). Dois modos: `regions`, em que cada mancha de cor vira um volume (ícones), e
  `silhouette`, em que a peça inteira vira um volume (logos).
- `grade(cor, k)`: gradação quente. Tira um pouco de saturação, puxa as sombras para o roxo e as luzes para o creme.
- `INK = #170e12` e `HOUSE` (mogno, latão, vinho, cromado).

**Ícones** (`iconkit.ts` novo, `icons.ts`, `icons17.ts`):
- Paleta única de cores-base quentes (latão `#cc9a48`, vinho, mogno, cromado, creme `#efe4cf`, âmbar para
  aviso/fogo/luz), compartilhada pelos dois arquivos.
- O desenho fica em cores-base. `finishIcon` aplica relevo (r 3, inclinação 0,8) e contorno `#170e12`. Brilho só
  em latão, cromado, vinil, vidro e esmalte.
- Saíram os brilhos brancos feitos à mão e as cores avulsas. Microfone e rádio trocaram o pontilhado por grade e
  ripas. A moeda perdeu o anel para o cifrão ler.
- Os nomes, os tipos e as funções exportadas (`ICON_NAMES`, `icon`, `iconUrl`, `iconPx`, `iconCanvas`, `icon17`)
  continuam iguais. O tamanho continua 16×16.

**Capas** (`coverPx`): as mesmas composições por era e por escolha, com acabamento comum (`finishCover`):
- Gradação quente, mais leve na psicodelia, no néon e no neural (k 0,55) para manter a identidade dessas eras.
- Grão de papel por estilo: forte no deco (papel pardo), médio no clássico, punk e grunge, leve no minimal.
  Gloss, néon e neural ficam lisos.
- Marca circular do disco gasto na capa nas eras de vinil (deco, clássico, psicodélico, punk).
- Volume da capa (borda clara em cima e à esquerda, escura embaixo e à direita) e contorno `#170e12`.
- Deco: filetes em mogno, brilho do vinil em arco no alto à esquerda (no lugar dos pixels brancos) e título subido
  para não encostar no filete.

**Logos, crachás e cartazes**: gradação quente, relevo do selo inteiro (latão brilhante no deco e no gloss) e
contorno `#170e12`. As formas, as cores por gênero e as iniciais não mudaram.

**Fonte**: não mudou. A 3×5 já é pixel art limpa e as métricas (`textWidth`, `FONT_H`) entram no layout de
capas e logos.

## Validação

- `npm ci`, `npm run typecheck` e `npm test` (ver o resultado no commit).
- Folha de arte para conferir (dev): `npx vite tools/artsheet`, depois abrir `?part=icons` (barra em 16 px,
  todos os ícones em 1×, 2× e 4×) ou `?part=art` (capas de 9 eras × 8 gêneros, escolhas do jogador, logos em
  40 e 18 px, crachás e cartazes).
- Screenshots (Playwright + Chromium):
  - `docs/arte-icones/icones-antes.png` e `icones-depois.png`
  - `docs/arte-icones/capas-logos-antes.png` e `capas-logos-depois.png`
  - `docs/arte-icones/capas-zoom-antes-depois.png` (1932, 1955, 1977, 2018 e logos, ampliados)
  - `docs/arte-icones/menu-antes-depois.png` (menu lateral do jogo com os ícones em tamanho real)

## Pendências

- O catálogo de uma partida nova está vazio, por isso as capas de 4+ eras foram validadas na folha de arte e não
  numa tela de jogo.
- A rampa do `finish.ts` copia a do `px.py`. Se a outra sessão publicar utilitários de estilo em `palette.ts`/`px.ts`,
  vale trocar por eles.
