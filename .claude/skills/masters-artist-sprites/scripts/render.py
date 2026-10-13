"""Renderiza fichas JSON em PNG.

  python3 render.py specs/*.json --out saida/              # PNG 6× (576×912) + _sheet.png
  python3 render.py specs/*.json --out saida/ --scale 1    # nativo 96×152, para o jogo
  python3 render.py --looks "Bob Dylan@1965" "Rita Lee@1975" --repo . --out saida/   # rascunho a partir de looks15/17
  python3 render.py --looks-all --repo . --out saida/ --scale 1          # um rascunho para cada artista com visual no jogo
"""
import argparse, json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import build
import looks


def slug(s):
    s = s.lower()
    for a, b in (('á', 'a'), ('à', 'a'), ('â', 'a'), ('ã', 'a'), ('é', 'e'), ('ê', 'e'), ('í', 'i'), ('ó', 'o'), ('ô', 'o'), ('õ', 'o'), ('ú', 'u'), ('ç', 'c')):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '_', s).strip('_')


def sheet(items, path, scale):
    if not items:
        return
    S, H = 96 * scale, 152 * scale
    pad = 12 * scale
    cols = min(len(items), 5)
    rows = (len(items) + cols - 1) // cols
    sh = Image.new('RGBA', (cols * S, rows * (H + pad)), (40, 30, 34, 255))
    d = ImageDraw.Draw(sh)
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', max(10, 5 * scale))
        f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', max(9, 4 * scale))
    except OSError:
        f = f2 = ImageFont.load_default()
    for i, (name, year, im) in enumerate(items):
        x0, y0 = (i % cols) * S, (i // cols) * (H + pad)
        d.ellipse([x0 + 22 * scale, y0 + 140 * scale, x0 + 74 * scale, y0 + 148 * scale], fill=(28, 20, 24, 255))
        sh.alpha_composite(im, (x0, y0))
        d.text((x0 + S // 2, y0 + H + 1), name, font=f, fill=(240, 220, 190, 255), anchor='mt')
        d.text((x0 + S // 2, y0 + H + 1 + 6 * scale), str(year), font=f2, fill=(190, 160, 120, 255), anchor='mt')
    sh.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('specs', nargs='*')
    ap.add_argument('--out', default='out')
    ap.add_argument('--scale', type=int, default=6)
    ap.add_argument('--looks', nargs='*', default=[])
    ap.add_argument('--looks-all', action='store_true')
    ap.add_argument('--repo', default='.')
    ap.add_argument('--dump-specs', action='store_true', help='grava as fichas geradas de looks em --out/specs para refinar')
    ap.add_argument('--no-sheet', action='store_true')
    ap.add_argument('--portrait', action='store_true', help='também grava o retrato de busto 64×64 (<nome>_busto.png)')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    specs = []
    for p in a.specs:
        with open(p, encoding='utf-8') as fh:
            if p.endswith('.jsonl'):
                specs.extend(json.loads(l) for l in fh if l.strip())
            else:
                specs.append(json.load(fh))
    if a.looks or a.looks_all:
        table = looks.load(a.repo)
        req = [(n, None) for n in sorted(table)] if a.looks_all else [tuple(x.split('@')) if '@' in x else (x, None) for x in a.looks]
        for name, year in req:
            if name not in table:
                print('sem visual no jogo:', name, file=sys.stderr)
                continue
            y = int(year) if year else looks.first_year(table[name])
            specs.append(looks.to_spec(name, table[name], y))
    items = []
    for s in specs:
        im = build(s).render(a.scale)
        fn = slug(s['name']) + '_' + str(s.get('year', ''))
        im.save(os.path.join(a.out, fn + '.png'))
        if a.portrait:
            # busto 64×64: recorte nativo (x 15–79, y 4–68 do buffer) — mesmo desenho, sem retrabalho
            small = build(s).render(1)
            small.crop((15, 4, 79, 68)).resize((64 * a.scale, 64 * a.scale), Image.NEAREST).save(os.path.join(a.out, fn + '_busto.png'))
        if a.dump_specs:
            os.makedirs(os.path.join(a.out, 'specs'), exist_ok=True)
            with open(os.path.join(a.out, 'specs', fn + '.json'), 'w', encoding='utf-8') as fh:
                json.dump(s, fh, ensure_ascii=False, indent=2)
        items.append((s['name'], s.get('year', ''), im))
    if not a.no_sheet:
        # folhas de até 40 por arquivo (_sheet.png, _sheet_2.png, …)
        for k in range(0, len(items), 40):
            sheet(items[k:k + 40], os.path.join(a.out, '_sheet.png' if k == 0 else f'_sheet_{k // 40 + 1}.png'), a.scale)
    print(f'{len(items)} sprites em {a.out}')


if __name__ == '__main__':
    main()
