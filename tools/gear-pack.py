"""Reduz o pacote de equipamentos (art/pack-equipamentos-v1, PNGs de ~1250 px) para o tamanho em que os
objetos aparecem na sede/lugares (16–48 px) e monta um atlas único:

  src/assets/gear21.png        atlas indexado (paleta ≤ 256 cores, transparência binária)
  src/ui/pixel/gear21-atlas.ts retângulos de cada sprite no atlas (gerado, não editar à mão)

Redução própria para pixel art (não é um resize comum):
  1. recorta pela máscara alfa e escala em dois passos com média de área sobre alfa pré-multiplicado
     (4× o alvo → nitidez leve → alvo), o que guarda a cor média de cada célula sem halo;
  2. alfa binário (limiar 0,45) para não haver borda semitransparente;
  3. +saturação/contraste leves e quantização sem pontilhado (≤ 22 cores por sprite), o que reconstrói
     as rampas de tons do estilo em vez de um degradê borrado;
  4. contorno externo de 1 px na cor da casa #170e12 (regra do estilo).

O fonógrafo de 1890 (01) veio corrompido no pacote: é desenhado aqui com o motor de estilo da skill
(.claude/skills/masters-artist-sprites/scripts/px.py: rampas de 6 tons, luz de cima à esquerda,
mogno/latão) e passa pela mesma redução.

Uso: python3 tools/gear-pack.py   (precisa de Pillow e numpy)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'pack-equipamentos-v1')
OUT_PNG = os.path.join(ROOT, 'src', 'assets', 'gear21.png')
OUT_TS = os.path.join(ROOT, 'src', 'ui', 'pixel', 'gear21-atlas.ts')
sys.path.insert(0, os.path.join(ROOT, '.claude', 'skills', 'masters-artist-sprites', 'scripts'))

OUTLINE = (0x17, 0x0E, 0x12)

# id → (arquivo do pacote, largura máx., altura máx.) em px do jogo, sem o contorno.
# Os limites vêm da pegada de cada objeto (1 tile = losango de 32 px; 2×1 = 48 px) e da altura de FURN.
SPRITES = {
    'fonografo': ('@fonografo', 28, 30),
    'gramofone': ('02_gramofone_1920', 28, 36),
    'microfone': ('03_microfone_1930', 16, 34),
    'gravador': ('04_gravador_1950', 30, 32),
    'mesa': ('05_mesa_1960', 44, 30),
    'multifaixas': ('06_multifaixas_1980', 30, 34),
    'daw': ('07_daw_2000', 46, 34),
    'servidor': ('09_servidor_2035', 24, 38),
    'piano': ('10_piano', 44, 34),
    'violao': ('11_violao', 12, 26),
    'guitarra': ('12_guitarra_1960', 12, 26),
    'baixo': ('13_baixo_1970', 12, 28),
    'bateria': ('14_bateria_1960', 34, 30),
    'sintetizador': ('15_sintetizador_1980', 42, 30),
    'sintetizador_p': ('15_sintetizador_1980', 28, 24),
    'sampler': ('16_sampler_1990', 28, 22),
    'dj': ('17_dj_2000', 44, 22),
    'amplificador': ('18_amplificador', 20, 20),
    'caixa_pa': ('20_caixa_pa', 20, 36),
    'prensa_1930': ('23_prensa_1930', 40, 42),
    'prensa_1970': ('24_prensa_1970', 40, 42),
    'duplicador_cd': ('26_duplicador_cd', 26, 36),
    'caixa_discos': ('27_caixa_distribuicao', 26, 22),
    'carrinho': ('28_carrinho_estoque', 22, 30),
    'cilindros': ('29_cilindros', 28, 18),
}


def draw_phonograph():
    """Fonógrafo de cilindro (c. 1890) no estilo do pacote: caixa de mogno, cilindro de cera, corneta de latão."""
    from px import Canvas
    c = Canvas(96, 96, oy=0)
    mog, lat, cera = '#6e2e20', '#c09048', '#4a3424'
    # caixa em 3/4: frente, lateral e tampo
    c.shape(c.poly([(14, 60), (62, 60), (62, 84), (14, 84)]), mog, r=3, bias=0.05)
    c.shape(c.poly([(62, 60), (76, 50), (76, 74), (62, 84)]), mog, r=3, bias=-0.35)
    c.shape(c.poly([(14, 60), (28, 50), (76, 50), (62, 60)]), mog, r=2, bias=0.25, group=1)
    c.shape(c.rect(16, 66, 60, 68), lat, r=1, spec=True, line=False)
    c.shape(c.rect(16, 78, 60, 80), lat, r=1, spec=True, line=False)
    c.shape(c.ell(38, 73, 5, 3), '#2a1410', r=1, lvl=1)
    # suportes e cilindro de cera
    c.shape(c.rect(26, 42, 30, 54), lat, r=1, spec=True)
    c.shape(c.rect(58, 40, 62, 52), lat, r=1, spec=True)
    c.shape(c.cap([(28, 42), (60, 40)], 6), cera, r=4)
    c.shape(c.ell(60, 40, 2.5, 5), lat, r=2, spec=True)
    # manivela
    c.shape(c.cap([(76, 62), (84, 62), (84, 70)], 1.4), lat, r=1, spec=True)
    c.shape(c.ell(85, 71, 2, 2), '#2a1410', r=1)
    # reprodutor e corneta subindo para a esquerda
    c.shape(c.ell(46, 34, 4, 4), lat, r=2, spec=True)
    c.shape(c.cap([(46, 32), (40, 24), (30, 16), (20, 10)], 2, 11), lat, r=5, spec=True)
    c.shape(c.ell(17, 9, 9, 12, ang=-35), '#5a3a18', r=4, bias=-0.3, line=False)
    c.shape(c.ell(15, 7, 5, 8, ang=-35), '#2a1a10', r=2, lvl=0, line=False)
    return c.render(scale=1)


def load(src):
    if src == '@fonografo':
        return draw_phonograph().convert('RGBA')
    return Image.open(os.path.join(SRC, src + '.png')).convert('RGBA')


def reduce(im, max_w, max_h, k=22):
    a = np.array(im)
    ys, xs = np.nonzero(a[..., 3] > 40)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    s = min(max_w / im.width, max_h / im.height)
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    arr = np.array(im).astype(np.float32) / 255
    arr[..., :3] *= arr[..., 3:4]
    pm = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), 'RGBA')
    mid = pm.resize((w * 4, h * 4), Image.BOX).filter(ImageFilter.UnsharpMask(2, 80, 2))
    sm = np.array(mid.resize((w, h), Image.BOX)).astype(np.float32) / 255
    al = sm[..., 3]
    rgb = np.where(al[..., None] > 0.01, sm[..., :3] / np.maximum(al[..., None], 1e-3), 0)
    mask = al > 0.45
    img = Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB')
    img = ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.12)).enhance(1.08)
    px = np.array(img)[mask]
    q = Image.fromarray(px.reshape(1, -1, 3), 'RGB').quantize(min(k, len(px)), method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = np.zeros((h + 2, w + 2, 4), np.uint8)
    sub = np.zeros((h, w, 3), np.uint8)
    sub[mask] = np.array(q.convert('RGB')).reshape(-1, 3)
    out[1:-1, 1:-1, :3] = sub
    out[1:-1, 1:-1, 3] = mask * 255
    m = out[..., 3] > 0
    p = np.pad(m, 1)
    ring = (p[1:-1, :-2] | p[1:-1, 2:] | p[:-2, 1:-1] | p[2:, 1:-1]) & ~m
    out[ring] = (*OUTLINE, 255)
    return Image.fromarray(out, 'RGBA')


def main():
    tiles = {name: reduce(load(src), mw, mh) for name, (src, mw, mh) in SPRITES.items()}
    # empacotamento em prateleiras, do mais alto para o mais baixo
    W = 192
    rects, x, y, row = {}, 0, 0, 0
    for name in sorted(tiles, key=lambda n: -tiles[n].height):
        t = tiles[name]
        if x + t.width > W:
            x, y, row = 0, y + row + 1, 0
        rects[name] = (x, y, t.width, t.height)
        x += t.width + 1
        row = max(row, t.height)
    H = y + row
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for name, (x, y, _, _) in rects.items():
        atlas.alpha_composite(tiles[name], (x, y))
    # paleta global ≤ 255 cores + índice transparente
    a = np.array(atlas)
    opaque = a[..., 3] > 0
    q = Image.fromarray(a[..., :3][opaque].reshape(1, -1, 3), 'RGB').quantize(255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()[:255 * 3]
    idx = np.full(a.shape[:2], 255, np.uint8)
    idx[opaque] = np.array(q).reshape(-1)
    out = Image.fromarray(idx, 'P')
    out.putpalette(pal + [0, 0, 0])
    os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
    out.save(OUT_PNG, optimize=True, transparency=255)
    lines = [
        '// Gerado por tools/gear-pack.py a partir de art/pack-equipamentos-v1 — não editar à mão.',
        '// Retângulos [x, y, w, h] de cada sprite em src/assets/gear21.png (já com contorno de 1 px).',
        '',
        'export const GEAR_ATLAS = {',
    ]
    for name in SPRITES:
        lines.append(f'  {name}: [{", ".join(map(str, rects[name]))}],')
    lines += ['} as const satisfies Record<string, readonly [number, number, number, number]>;', '', 'export type GearId = keyof typeof GEAR_ATLAS;', '']
    with open(OUT_TS, 'w') as f:
        f.write('\n'.join(lines))
    print(f'{OUT_PNG}: {W}x{H}, {os.path.getsize(OUT_PNG)} bytes, {len(SPRITES)} sprites')


if __name__ == '__main__':
    main()
