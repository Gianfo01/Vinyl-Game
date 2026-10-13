---
name: masters-artist-sprites
description: Gera sprites de artistas (pessoas reais ou fictícias) em pixel art HD no estilo do pacote de assets do Masters — vista 3/4, luz de cima à esquerda, contorno escuro quente, rampas de 6 tons. Use quando pedirem retrato/sprite/boneco de artista, banda ou integrante, "como ficaria X no estilo do jogo", ou para produzir sprites em lote a partir dos visuais de src/data/looks15.ts e looks17.ts.
---

# Sprites de artistas — estilo Masters

Tudo é gerado por código (Python + Pillow + NumPy): determinístico, sem custo por imagem, idêntico entre sessões.
Nada de gerador de imagem externo.

| arquivo | papel |
|---|---|
| `scripts/px.py` | motor: formas "infladas" (sombra automática pelo volume), rampas de cor, contorno e linhas internas |
| `scripts/kit.py` | peças base: cabeça/rosto, chapéus, ternos, pernas, instrumentos, microfones, capa |
| `scripts/kit_ext.py` | catálogo estendido: 15 cabelos extras, 12 roupas extras, estampas |
| `scripts/build.py` | monta uma **ficha** (JSON) na ordem fixa de camadas; braços e poses |
| `scripts/looks.py` | converte os tokens de aparência do jogo em ficha (rascunho automático, 1:1 nos 23 cabelos) |
| `scripts/auto.py` | rascunho para **todas** as pessoas reais do jogo (`data/people.json`): pose/instrumento pelo papel, figurino pela cena e época |
| `data/people.json` | 2.888 pessoas reais (papel, gênero, família, estreia, nascimento, fama, país, atos) — gere de novo com `npx tsx tools/dump-people.ts .claude/skills/masters-artist-sprites/data/people.json` |
| `specs/lotes/` | fichas de todos os personagens em JSONL (`lote_NN.jsonl`, uma por linha) |
| `scripts/render.py` | CLI de renderização (sprite, busto, folha de revisão) |
| `scripts/catalog.py` | folha com todos os cabelos e roupas, para escolher peças |
| `specs/` | 17 fichas pesquisadas de referência · `reference/` folha do estilo e dos exemplos |

Dependências: `pip install pillow numpy` (Python 3.10+).

## Tamanhos (decididos para o jogo)

- **Corpo inteiro: 96×152 px nativos** (personagem com ~125 px). Casa com a densidade do pacote de assets (~150 px
  nativos por objeto). Na interface, use sempre escala inteira: 2× = 192×304 (ficha/carta do artista).
- **Busto: 64×64 px** (`--portrait`), recortado do mesmo desenho. Substitui o retrato 32×32 atual
  (`portraitPx` em `src/ui/pixel/avatar.ts`) com o dobro de detalhe e a mesma área na tela em 2×.
- **Sprite de mundo** (sede isométrica, 24×34): continua procedural no jogo. Reduzir a arte HD para esse tamanho apaga
  o rosto; se for preciso, faça um conjunto próprio em baixa resolução.
- `--scale N` só amplia com vizinho mais próximo (prévia). O arquivo para o jogo é sempre `--scale 1`.

## Fluxo para produzir em escala

0. **Todos os personagens**: `python3 auto.py --repo ../../../.. --out ../specs/rascunhos.jsonl` gera um rascunho por pessoa
   (2.888). Divida em lotes (bandas juntas) e revise pessoa a pessoa (passos 2–4); o resultado vai para `specs/lotes/`.
   `render.py` aceita `.jsonl` e gera folhas de 40 (`_sheet.png`, `_sheet_2.png`, …).
1. **Rascunho em massa** (segundos) para todo artista que já tem visual no jogo:
   ```bash
   cd .claude/skills/masters-artist-sprites/scripts
   python3 render.py --repo ../../../.. --looks-all --scale 1 --portrait --out /tmp/sprites --dump-specs   # ~600 em ~30 s
   python3 render.py --repo ../../../.. --looks "Rita Lee@1975" "Tim Maia@1975" --out /tmp/prev           # prévia 6× + folha
   ```
   O rascunho acerta pele, cabelo (1:1), cor de roupa, barba, óculos e chapéu do jogo, e escolhe a roupa casual pela
   década. **Não é semelhança**: serve de base e de figurante.
2. **Pesquisar antes de refinar** (obrigatório para quem o jogador reconhece). Use WebSearch para a fase escolhida:
   figurino marcante (show, capa de disco, turnê), cabelo e pelos da época, instrumento e mão (canhoto?), traços do
   rosto. Fontes discordam com frequência: prefira a descrição mais específica e registre a escolha no campo `"ref"`
   da ficha (uma frase com a fase e os elementos). Ex.: Hendrix 1969 = Woodstock (jaqueta branca de franjas com contas
   azuis, lenço vermelho), não a jaqueta militar de 1967; Gil 1979 = dreads, Gil 1985 = black power quadrado.
3. **Escrever a ficha** em `specs/<slug>_<ano>.json` partindo do rascunho (`--dump-specs`) ou de uma das 17 fichas.
   Semelhança vem, nesta ordem: silhueta (cabelo/chapéu) → figurino da fase → adereço/pose → cor → rosto.
   Use os parâmetros de rosto para o que for marcante (dentes do Freddie, olhos fundos do Cash, bochechas do Armstrong).
4. **Revisar pela folha**: `python3 render.py ../specs/*.json --out /tmp/rev` e **abra `/tmp/rev/_sheet.png`** (Read).
   A folha reduz: em caso de dúvida, abra o PNG individual. Ajuste e renderize de novo.
5. **Exportar**: `python3 render.py ../specs/*.json --scale 1 --portrait --out <destino>`.

Peça nova vai para `kit_ext.py` (reutilizável), nunca para um artista só. Depois de criar, inclua em `catalog.py`.

## Ficha (JSON)

```jsonc
{
  "name": "Frank Sinatra", "year": 1957, "seed": 7, "ref": "fase + elementos pesquisados",
  "body":  {"sex": "m|f", "build": "slim|regular|stocky|female", "skin": "claro|medio|moreno|escuro|#hex", "head_rx": 10},
  "hair":  {"style": "<cabelo>", "color": "#hex", "size": 1.0, "sideburns": 8, "grey_sides": "#hex"},
  "hat":   {"style": "fedora|top_hat|cowboy|beret|beanie|cap|headband|bandana|turban_fruit",
            "color": "#hex", "band": "#hex", "tilt": -7, "shiny": false, "trim": "#hex"},
  "face":  {"iris": "#hex", "brow": "#hex", "mouth": "neutral|smirk|snarl|smile|grin|lips|open", "lips": "#hex",
            "jaw": "default|square|narrow|round|female", "ears": "big", "brow_style": "heavy|arched",
            "eyes": "hooded|deep", "nose": "long|wide|small", "cheeks": true, "smile_lines": true,
            "chin_cleft": true, "teeth": "overbite", "scar": true, "lashes": true, "wide_eyes": true, "blush": "#hex",
            "facial": "mustache|mustache_thick|goatee|beard|stubble", "facial_color": "#hex",
            "glasses": "round|round_tint|dark|aviator", "glasses_color": "#hex", "lens_color": "#hex"},
  "top":   {"style": "<roupa>", "color": "#hex", "shirt": "#hex", "lapel": "#hex", "tie": "tie|loose|bow",
            "tie_color": "#hex", "pocket_square": true, "shiny": false,
            "sleeves": "bare|short", "sleeve_color": "#hex", "sleeve_stripe": "#hex", "sleeve_fringe": true,
            "pattern": "sparkle|studs|eagle|floral|african|stripes_h|stripes_v|checks|polka|rasta",
            "pattern_n": 30, "pattern_color": "#hex ou [#hex, ...]",
            "scarf": "#hex", "braid": "#hex", "belt": "#hex", "buckle": "#hex", "jewel": "#hex", "trim": "#hex",
            "beads": "#hex", "necklace": "#hex", "chain": "#hex", "stripe": "#hex", "print": "#hex"},
  "bottom":{"style": "pants|jeans|flare|highwater|shorts|skirt|skirt_long", "color": "#hex", "flare": true,
            "shiny": false, "stripe": "#hex", "socks": "#hex", "bands": ["#hex"], "studs": ["#ouro", "#joia"]},
  "shoes": {"color": "#hex", "style": "shoe|boot|sneaker|hightop"},
  "pose":  "stand|pocket|hip|mic_stand|hand_mic|guitar|guitar_lefty|trumpet|raise_stand|hat_tip|arm_up",
  "front_arm": "(opcional)", "back_arm": "(opcional)",
  "prop":  {"type": "acoustic|electric|trumpet", "shape": "lp (Les Paul; padrão Strat)", "top": "#hex", "body": "#hex",
            "neck": "#hex", "guard": "#hex", "pickups": "#hex", "binding": "#hex", "side": "#hex", "strap": "#hex"},
  "cape": {"color": "#hex", "lining": "#hex", "eagle": true},
  "necklaces": ["#hex"], "earrings": "#hex", "bangles": ["#hex"], "bangles_back": ["#hex"],
  "glove": "#hex (mão da frente no hat_tip)", "glove_back": "#hex (mão de trás)"
}
```

**Peças da rodada de revisão (`kit_more.py`):**
- chapéus: sombrero (charro, `trim` = bordado), panama, bowler (chapéu-coco), flat_cap, bucket, kangol, kufi, fila
  (peci/songkok), turban (sikh/liso), headwrap (turbante alto), military_cap, captain_cap, sailor_cap, headdress
  (cocar, `feathers: [#hex]`), fur_hat, mitre, headscarf (lenço); `hat.emblem: "#hex"` põe estrela/emblema.
- instrumentos (`prop.type` + pose): banjo / ukulele / cavaquinho / bouzouki / oud / tres (pose `guitar` ou
  `guitar_lefty`), cello (pose `cello`), upright_bass (pose `upright_bass`), trombone, clarinet, flute, pan_flute,
  pandeiro, maracas, bandoneon (pose com o mesmo nome). Elétrica: `shape: sg | gretsch | lp | strat`,
  `stripes: ["#hex", "#hex"]`. Violão e baixo aceitam `guitar_lefty`.
- roupas: sari (`drape`, `trim`), qipao, hanbok (com bottom `skirt_full`), kaftan, robe, kimono (`sash`), poncho,
  shawl, bare_chest; bottom `kilt` (`plaid`, `socks`). `jumpsuit` aceita `belt: "none"`; `dress` aceita `pattern`.
- rosto: `face.paint`: skull | kiss_star | kiss_cat | white | mask | eyeliner (`paint_color` para a máscara);
  `face.facial` aceita lista (`["mustache", "goatee"]`) e `facial_color2` (bigode bicolor);
  `glasses: thick` (aro grosso); `hair.color2` + `hair.split: right|left` (cabelo bicolor); `hair.roots: "#hex"`
  (raiz de outra cor); `hair.twintails: true` (maria-chiquinhas); `face.paint: bolt` (raio do Aladdin Sane);
  `top.style: shirt` aceita `tie`.

**Cabelos (23 do jogo + extras):** bald, short, fringe, buzz, pompadour, bowl, afro, long, wavy_long, ponytail, bun,
mohawk, curly, bob, spiky, dreads, mullet, bouffant, slick, long_fringe, curls_long, braids, pixie, flattop, cropped.

**Roupas:** suit, tux, jacket_open, coat_long, shirt, open_shirt, tshirt, tank, turtleneck, sweater, hoodie,
denim_jacket, leather_jacket, tracksuit, tunic, vest, military, open_military, fringe_jacket, jumpsuit, blouse, dress,
gown, crop. Veja `python3 catalog.py --out /tmp/cat`.

**Poses:** `mic_stand` (microfone de fita de latão), `hand_mic` (mão no microfone + braço aberto), `guitar` /
`guitar_lefty` (exigem `prop`), `trumpet`, `raise_stand` (pedestal erguido), `hat_tip` (mão na aba), `arm_up`, `hip`,
`pocket`, `stand`, `bass`, `sax`, `violin`, `accordion`, `drums` (baquetas, sem prop), `keytar`. No desenho, o braço da esquerda
da imagem é o "da frente". `prop.type`: acoustic, electric (`shape: lp`), bass, trumpet, sax, violin, accordion, keytar.
Acessórios: `"headphones": "#hex"` (DJ/produtor), `"chain": "#hex"` + `"chain_big": true` (MC).

## Regras do estilo (não quebrar)

- **Grade**: canvas lógico 96×144 + 8 px de folga no topo. Cabeça em (47,29), ombros y≈51, cintura y≈84, sola y≈136.
  Personagem virado 3/4 para a esquerda.
- **Luz** de cima à esquerda. Sombra só por `bias` (−0.35 pescoço, −0.15 a −0.2 membros de trás) e `shade_mask`.
- **Rampas**: cada cor vira 6 tons (sombra arroxeada → luz quente). Passe a cor base; em detalhes use `(cor, nível 0–5)`.
  Nível 5 só em material brilhante (`spec=True`: latão, cetim, couro, gel, lantejoula).
- **Paleta da casa**: mogno `#6e2e20`, latão `#c09048`, vinho `#8a2430`, cromado `#a8acb8`, contorno `#170e12`.
- **Contorno** externo e linhas internas são automáticos; não desenhe contorno à mão.
- **Rosto**: olho de longe 2 px, de perto 4 px, nariz para a esquerda; cabelo nunca cobre os olhos (mechas laterais em
  x ≤ cx−10 abaixo de y 26; franja até y 25).

## Checklist de revisão

- [ ] Reconhecível só pela silhueta? Figurino e cabelo batem com a fase pesquisada (`ref`)?
- [ ] Olhos livres; mãos encostam no que seguram; canhoto do lado certo.
- [ ] Brilho só em material brilhante; sem "barba" escura falsa no queixo.
- [ ] Nada fora do canvas; busto 64×64 enquadra cabeça e ombros.

## Pessoas reais

O jogo trata nomes reais como modo opcional para uso pessoal (`src/data/realnames.ts`). Os sprites são caricaturas;
antes de uso comercial, avaliar direito de imagem. O modo fictício continua sendo o padrão.
