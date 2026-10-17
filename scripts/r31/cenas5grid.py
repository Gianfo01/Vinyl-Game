# R31 onda 5 (CENAS5) — junta as capturas de scripts/shots31cenas5.mjs: para cada tipo de cena, uma imagem com
# 2 linhas (as 2 épocas) × 2 colunas (ANTES = exp5.nav desligado | DEPOIS = ligado), em
# <pasta>/onda5-cenas5-<tipo>-antes-depois.png. Uso: python3 scripts/r31/cenas5grid.py <pasta das raw> <pasta de saída>
import os
import sys
from PIL import Image, ImageDraw

raw = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else 'docs/r31/shots'
ERAS = ['1965', '2005']
K = 0.5  # cada captura 1440×900 vira 720×450
HEAD = 26
tipos = sorted({f.split('-')[0] for f in os.listdir(raw) if f.endswith('-antes.png')})
for tp in tipos:
    cells = [[os.path.join(raw, f'{tp}-{y}-{m}.png') for m in ('antes', 'depois')] for y in ERAS]
    if not all(os.path.exists(c) for row in cells for c in row):
        print('faltando', tp)
        continue
    w, h = int(1440 * K), int(900 * K)
    img = Image.new('RGB', (w * 2 + 6, (h + HEAD) * len(ERAS) + 4), (13, 21, 32))
    d = ImageDraw.Draw(img)
    for r, (y, row) in enumerate(zip(ERAS, cells)):
        for c, path in enumerate(row):
            x0, y0 = c * (w + 6), r * (h + HEAD) + HEAD
            im = Image.open(path).convert('RGB').resize((w, h), Image.LANCZOS)
            img.paste(im, (x0, y0))
            d.text((x0 + 8, y0 - HEAD + 7), f"{tp.upper()} · {y} · {'ANTES (exp5.nav desligado)' if c == 0 else 'DEPOIS (exp5.nav ligado)'}", fill=(240, 192, 64))
    dst = os.path.join(out, f'onda5-cenas5-{tp}-antes-depois.png')
    img.save(dst, optimize=True)
    print('ok', dst)
