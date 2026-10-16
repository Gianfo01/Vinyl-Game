# R31 · onda 5 (SALAS) — monta docs/r31/shots/onda5-salas-<sala>-antes-depois.png (3 épocas, antes | depois).
# Uso: python3 scripts/r31/salas5/sidebyside.py <pasta-antes> <pasta-depois>  (capturas de shoot.mjs)
import sys
from PIL import Image, ImageDraw
A0, B0 = sys.argv[1], sys.argv[2]; D = 'docs/r31/shots'
for name in ['composicao', 'estudio', 'guerra', 'crise', 'coletiva', 'escandalo', 'estrada', 'golpe']:
    rows = []
    for y in (1935, 1975, 2015):
        A = Image.open(f'{A0}/{name}-{y}.png').convert('RGB'); B = Image.open(f'{B0}/{name}-{y}.png').convert('RGB')
        A = A.resize((round(A.width * 300 / A.height), 300), Image.NEAREST); B = B.resize((round(B.width * 300 / B.height), 300), Image.NEAREST)
        rows.append((y, A, B))
    wA = max(r[1].width for r in rows); wB = max(r[2].width for r in rows)
    out = Image.new('RGB', (wA + wB + 60, len(rows) * 310 + 28), (18, 20, 28)); d = ImageDraw.Draw(out)
    d.text((40, 6), 'ANTES (r27)', fill=(240, 200, 120)); d.text((wA + 50, 6), 'DEPOIS (onda 5 · SALAS)', fill=(140, 230, 150))
    for i, (y, A, B) in enumerate(rows):
        yy = 24 + i * 310; d.text((4, yy + 140), str(y), fill=(220, 220, 230)); out.paste(A, (40, yy)); out.paste(B, (wA + 50, yy))
    out.save(f'{D}/onda5-salas-{name}-antes-depois.png'); print(name, out.size)
