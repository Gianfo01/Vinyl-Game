#!/usr/bin/env python3
"""r27 (CHAR): empacota os sprites das pessoas reais (art/personagens) em atlas WebP sem perdas para o jogo.

Entrada: art/personagens/{busto,corpo}/<slug>.png + index.json (gerados pela skill masters-artist-sprites).
Saída (src/assets/people27/):
  busto-NN.webp  folhas 1024×1024 com 256 bustos 64×64 em grade 16×16 (posição implícita pela ordem)
  corpo-NN.webp  folhas 1024×1024 com os corpos 96×152 recortados ao conteúdo (prateleiras)
  index.json     índice compacto (nomes na ordem das folhas, ano retratado, retângulos dos corpos, homônimos)
  sheets.ts      URLs das folhas (Vite: inline no build de arquivo único, arquivo separado no build normal)

Ordem = (ano retratado, nome): quem é da mesma época cai na mesma folha, e uma partida decodifica poucas folhas.
Formato escolhido por medição (ver --measure): WebP sem perdas ≈ 1/3 do PNG e < PNG com paleta (que nem caberia
em 256 cores: cada folha tem 1.100+ cores). O script confere pixel a pixel que a folha decodificada é idêntica à fonte.

Uso:  npm run people27            (ou: python3 tools/pack-people27.py [--src art/personagens] [--out src/assets/people27])
      python3 tools/pack-people27.py --measure   (só mede formatos, não grava)
Requer Python 3.10+ com Pillow (com WebP) e NumPy.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys

import numpy as np
from PIL import Image

SHEET = 1024
BUST = 64
COLS = SHEET // BUST  # 16
PER = COLS * COLS  # 256 bustos por folha


def webp(im: Image.Image) -> bytes:
    b = io.BytesIO()
    im.save(b, 'WEBP', lossless=True, quality=100, method=4, exact=False)
    return b.getvalue()


def png(im: Image.Image, palette: bool = False) -> bytes:
    b = io.BytesIO()
    (im.quantize(256, method=Image.Quantize.FASTOCTREE) if palette else im).save(b, 'PNG', optimize=True)
    return b.getvalue()


def same(a: Image.Image, b: Image.Image) -> bool:
    x, y = np.asarray(a.convert('RGBA')), np.asarray(b.convert('RGBA'))
    if x.shape != y.shape:
        return False
    # alfa é binário nas fontes; RGB só importa onde é visível
    vis = x[..., 3] > 0
    return bool((x[..., 3] == y[..., 3]).all() and (x[vis] == y[vis]).all())


def main() -> int:
    ap = argparse.ArgumentParser()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument('--src', default=os.path.join(root, 'art', 'personagens'))
    ap.add_argument('--out', default=os.path.join(root, 'src', 'assets', 'people27'))
    ap.add_argument('--measure', action='store_true')
    o = ap.parse_args()

    meta = json.load(open(os.path.join(o.src, 'index.json'), encoding='utf-8'))
    names = sorted(meta, key=lambda n: (meta[n]['ano'], n))
    busts = [Image.open(os.path.join(o.src, 'busto', meta[n]['arquivo'])).convert('RGBA') for n in names]
    bodies = [Image.open(os.path.join(o.src, 'corpo', meta[n]['arquivo'])).convert('RGBA') for n in names]
    for n, b, c in zip(names, busts, bodies):
        assert b.size == (BUST, BUST), (n, b.size)
        assert c.size == (96, 152), (n, c.size)

    # ---- bustos: grade fixa
    bsheets: list[Image.Image] = []
    for s in range(0, len(names), PER):
        chunk = busts[s:s + PER]
        rows = (len(chunk) + COLS - 1) // COLS
        im = Image.new('RGBA', (SHEET, rows * BUST), (0, 0, 0, 0))
        for i, b in enumerate(chunk):
            im.paste(b, ((i % COLS) * BUST, (i // COLS) * BUST))
        bsheets.append(im)

    # ---- corpos: recortados ao conteúdo, em prateleiras
    csheets: list[Image.Image] = []
    rects: list[list[int]] = []  # [folha, x, y, w, h, dx, dy] (dx, dy = canto do recorte no quadro 96×152)
    cur = Image.new('RGBA', (SHEET, SHEET), (0, 0, 0, 0))
    x = y = shelf = used_h = 0
    for c in bodies:
        bb = c.getbbox() or (0, 0, 1, 1)
        crop = c.crop(bb)
        w, h = crop.size
        if x + w > SHEET:
            x, y, shelf = 0, y + shelf, 0
        if y + h > SHEET:
            csheets.append(cur.crop((0, 0, SHEET, used_h)))
            cur = Image.new('RGBA', (SHEET, SHEET), (0, 0, 0, 0))
            x = y = shelf = used_h = 0
        cur.paste(crop, (x, y))
        rects.append([len(csheets), x, y, w, h, bb[0], bb[1]])
        x += w
        shelf = max(shelf, h)
        used_h = max(used_h, y + h)
    csheets.append(cur.crop((0, 0, SHEET, used_h)))

    if o.measure:
        for label, sheets in (('bustos', bsheets), ('corpos', csheets)):
            src = sum(os.path.getsize(os.path.join(o.src, 'busto' if label == 'bustos' else 'corpo', meta[n]['arquivo'])) for n in names)
            print(f'{label}: {len(sheets)} folhas · PNGs de origem {src / 1e6:.2f} MB')
            print(f'  WebP sem perdas   {sum(len(webp(s)) for s in sheets) / 1e6:.2f} MB')
            print(f'  PNG RGBA          {sum(len(png(s)) for s in sheets) / 1e6:.2f} MB')
            print(f'  PNG paleta (PERDE cor: >256 cores por folha) {sum(len(png(s, True)) for s in sheets) / 1e6:.2f} MB')
        return 0

    os.makedirs(o.out, exist_ok=True)
    for f in os.listdir(o.out):
        if f.endswith('.webp'):
            os.remove(os.path.join(o.out, f))
    total = 0
    files: dict[str, list[str]] = {'busto': [], 'corpo': []}
    for kind, sheets in (('busto', bsheets), ('corpo', csheets)):
        for i, im in enumerate(sheets):
            data = webp(im)
            back = Image.open(io.BytesIO(data))
            if not same(im, back):
                print(f'ERRO: {kind}-{i:02d} não ficou idêntica ao decodificar', file=sys.stderr)
                return 1
            fn = f'{kind}-{i:02d}.webp'
            with open(os.path.join(o.out, fn), 'wb') as fh:
                fh.write(data)
            files[kind].append(fn)
            total += len(data)
    # confere cada sprite contra a fonte (recorte da folha decodificada)
    dec = {k: [Image.open(os.path.join(o.out, f)).convert('RGBA') for f in v] for k, v in files.items()}
    for i, n in enumerate(names):
        s, k = divmod(i, PER)
        bx, by = (k % COLS) * BUST, (k // COLS) * BUST
        assert same(dec['busto'][s].crop((bx, by, bx + BUST, by + BUST)), busts[i]), n
        r = rects[i]
        full = Image.new('RGBA', (96, 152), (0, 0, 0, 0))
        full.paste(dec['corpo'][r[0]].crop((r[1], r[2], r[1] + r[3], r[2] + r[4])), (r[5], r[6]))
        assert same(full, bodies[i]), n

    homo = {n: meta[n]['atos'] for n in names if n.endswith(')') and ' (' in n}
    idx = {
        'v': 1,
        'bust': {'w': BUST, 'h': BUST, 'cols': COLS, 'per': PER, 'sheets': [list(im.size) for im in bsheets]},
        'body': {'w': 96, 'h': 152, 'sheets': [list(im.size) for im in csheets]},
        'n': names,
        'y': [meta[n]['ano'] for n in names],
        'c': [v for r in rects for v in r],
        'h': homo,
    }
    with open(os.path.join(o.out, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump(idx, fh, ensure_ascii=False, separators=(',', ':'))
    lines = [
        '// Gerado por tools/pack-people27.py (npm run people27) — não editar à mão.',
        '// URLs das folhas: o Vite embute no build de arquivo único e separa em arquivos no build normal.',
        'export const BUST_URLS27: string[] = [',
        *[f"  new URL('./{f}', import.meta.url).href," for f in files['busto']],
        '];',
        'export const BODY_URLS27: string[] = [',
        *[f"  new URL('./{f}', import.meta.url).href," for f in files['corpo']],
        '];',
        '',
    ]
    with open(os.path.join(o.out, 'sheets.ts'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    isz = os.path.getsize(os.path.join(o.out, 'index.json'))
    bsz = sum(os.path.getsize(os.path.join(o.out, f)) for f in files['busto'])
    print(f'{len(names)} pessoas · bustos {len(bsheets)} folhas {bsz / 1e6:.2f} MB · corpos {len(csheets)} folhas '
          f'{(total - bsz) / 1e6:.2f} MB · índice {isz / 1e3:.0f} kB · total {(total + isz) / 1e6:.2f} MB (idênticos à fonte)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
