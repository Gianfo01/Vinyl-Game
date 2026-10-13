# R29 "arte consistente" — reduz as folhas de contato (PNG em paleta de até 256 cores, sem pontilhado extra) e
# corta o excesso de altura. Uso: python3 scripts/pngq29.py <entrada_dir> <saída_dir> [altura_max]
import os
import sys

from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
hmax = int(sys.argv[3]) if len(sys.argv) > 3 else 20000
os.makedirs(dst, exist_ok=True)
tot = 0
for n in sorted(os.listdir(src)):
    if not n.endswith('.png'):
        continue
    im = Image.open(os.path.join(src, n)).convert('RGB')
    if im.height > hmax:
        im = im.crop((0, 0, im.width, hmax))
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    out = os.path.join(dst, n)
    q.save(out, optimize=True)
    tot += os.path.getsize(out)
    print(f'{n}: {os.path.getsize(out) // 1024} KB')
print(f'total {tot // 1024} KB')
