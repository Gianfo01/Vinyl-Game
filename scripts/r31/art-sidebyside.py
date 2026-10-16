# R31 · onda 4 (ART) — monta as capturas lado a lado "antes | depois" (recorte da cena ampliado, vizinho mais próximo).
# Antes = docs/r31/shots/onda4-is-*.png (e o atlas gear21.png do pacote); depois = onda4-art-*.png.
# Uso: python3 scripts/r31/art-sidebyside.py
from PIL import Image, ImageDraw
D = 'docs/r31/shots'
def pair(name, a, b, box, s=2, boxb=None):
    A = Image.open(f'{D}/{a}.png').convert('RGB').crop(box)
    B = Image.open(f'{D}/{b}.png').convert('RGB').crop(boxb or box)
    A = A.resize((A.width * s, A.height * s), Image.NEAREST); B = B.resize((B.width * s, B.height * s), Image.NEAREST)
    out = Image.new('RGB', (A.width + B.width + 24, max(A.height, B.height) + 28), (18, 20, 28))
    out.paste(A, (8, 22)); out.paste(B, (A.width + 16, 22))
    d = ImageDraw.Draw(out); d.text((10, 5), 'ANTES', fill=(240, 200, 120)); d.text((A.width + 18, 5), 'DEPOIS', fill=(140, 230, 150))
    out.save(f'{D}/onda4-art-{name}-lado-a-lado.png'); print(name, out.size)
pair('casa-de-shows', 'onda4-is-casa-de-shows', 'onda4-art-casa-de-shows', (420, 300, 930, 440))
pair('estudio', 'onda4-is-estudio', 'onda4-art-estudio', (480, 500, 900, 620))
pair('loja-de-instrumentos', 'onda4-is-loja-de-instrumentos', 'onda4-art-loja-de-instrumentos', (430, 500, 920, 620))
pair('baile', 'onda4-is-fachada-baile', 'onda4-art-fachada-baile', (150, 480, 640, 620))
pair('delegacia', 'onda4-is-delegacia', 'onda4-art-delegacia', (500, 380, 940, 640), 1)
pair('sala-dos-fundos', 'onda4-is-sala-dos-fundos', 'onda4-art-sala-dos-fundos', (80, 540, 960, 640), 1)
pair('mercado-negro', 'onda4-is-mercado-negro', 'onda4-art-mercado-negro', (80, 540, 960, 640), 1)
pair('mural', 'onda4-is-mural', 'onda4-art-mural', (270, 440, 1230, 740), 1)
pair('sala-estudio', 'onda2-K-epoca-estudio-1975', 'onda4-art-sala-estudio-1975', (440, 160, 720, 270), 2, (440, 160, 720, 270))
# adereços: atlas do pacote (antes) × fonte única (depois), 4×
atlas = Image.open('src/assets/gear21.png').convert('RGBA')
parts = [(136, 82, 36, 30), (99, 115, 22, 21), (108, 0, 15, 38)]
bg = Image.new('RGBA', (sum(w for _, _, w, _ in parts) + 30, 44), (74, 68, 102, 255))
x = 6
for (sx, sy, w, h) in parts:
    bg.alpha_composite(atlas.crop((sx, sy, sx + w, sy + h)), (x, 40 - h)); x += w + 8
bg = bg.convert('RGB'); bg = bg.resize((bg.width * 4, bg.height * 4), Image.NEAREST)
B = Image.open(f'{D}/onda4-art-props-depois.png').convert('RGB')
out = Image.new('RGB', (max(bg.width, B.width) + 16, bg.height + B.height + 56), (18, 20, 28))
d = ImageDraw.Draw(out)
d.text((10, 5), 'ANTES: atlas do pacote (gear21.png, arte HD reduzida) - bateria, amplificador, caixa PA', fill=(240, 200, 120)); out.paste(bg, (8, 22))
d.text((10, bg.height + 30), 'DEPOIS: fonte unica stage31px (bateria 1955/1975/2005, amp tweed/tolex/pequeno, caixa, plateia)', fill=(140, 230, 150)); out.paste(B, (8, bg.height + 48))
out.save(f'{D}/onda4-art-props-lado-a-lado.png'); print('props', out.size)
