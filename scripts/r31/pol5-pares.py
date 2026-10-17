# R31 · onda 5 (POL5) — monta as provas antes/depois lado a lado a partir das capturas de shots-pol5.mjs.
# Uso: python3 scripts/r31/pol5-pares.py <pasta-antes> <pasta-depois> <pasta-saída>
import sys
from PIL import Image, ImageDraw, ImageFont

A, D, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except OSError:
    FONT = ImageFont.load_default()
INK, BAD, GOOD = (20, 24, 32), (200, 60, 50), (40, 140, 70)

def tag(img, text, col, corner=False):
    d = ImageDraw.Draw(img)
    w = d.textlength(text, font=FONT)
    x, y = (img.width - w - 24, img.height - 32) if corner else (8, 8)
    d.rectangle([x, y, x + w + 16, y + 28], fill=col)
    d.text((x + 8, y + 3), text, fill=(255, 255, 255), font=FONT)

def pair(name, crop=None, scale=0.5):
    a, d = Image.open(f'{A}/{name}.png').convert('RGB'), Image.open(f'{D}/{name}.png').convert('RGB')
    if crop:
        a, d = a.crop(crop), d.crop(crop)
    w, h = int(a.width * scale), int(a.height * scale)
    a, d = a.resize((w, h), Image.LANCZOS), d.resize((w, h), Image.LANCZOS)
    row = Image.new('RGB', (w * 2 + 12, h + 30), (240, 236, 226))
    row.paste(a, (0, 30)); row.paste(d, (w + 12, 30))
    dr = ImageDraw.Draw(row)
    dr.text((6, 6), f'{name}', fill=INK, font=FONT)
    tag_a = row.crop((0, 30, w, h + 30)); tag(tag_a, 'ANTES', BAD, bool(crop)); row.paste(tag_a, (0, 30))
    tag_d = row.crop((w + 12, 30, w * 2 + 12, h + 30)); tag(tag_d, 'DEPOIS', GOOD, bool(crop)); row.paste(tag_d, (w + 12, 30))
    return row

def stack(rows, out):
    W = max(r.width for r in rows)
    im = Image.new('RGB', (W, sum(r.height for r in rows) + 10 * (len(rows) - 1)), (240, 236, 226))
    y = 0
    for r in rows:
        im.paste(r, (0, y)); y += r.height + 10
    im.save(f'{OUT}/onda5-pol5-{out}-antes-depois.png', optimize=True)
    print('salvo', out, im.size)

HEAD = (0, 56, 1440, 160)
stack([pair(n, HEAD, 0.5) for n in ['cab-olheiro-2025', 'cab-fichario-1912', 'cab-secretaria-1962', 'cab-quadrobranco-1985', 'cab-revista-2005', 'cab-mural-1962', 'cab-diario-1912', 'cab-agenda-2025']], 'cabecalho')
stack([pair('cab-olheiro-2025'), pair('cab-fichario-1912')], 'cabecalho-tela')
stack([pair('mural-1-artista-1985'), pair('mural-4-artistas-2025')], 'mural')
stack([pair('quadro-1-artista-1985'), pair('quadro-4-artistas-1962')], 'quadro')
stack([pair('sede-1912'), pair('sede-1985')], 'sede')
stack([pair('casa-1912'), pair('casa-2025')], 'casa')
stack([pair('mundo-depois-de-papel-2025')], 'mundo')
stack([pair('papel-antigo-espelho-2025'), pair('papel-antigo-cofrecasa-1985')], 'papel-antigo')
stack([pair('fichario-2025')], 'fichario')
stack([pair('mapa-marcador-2025', (0, 56, 1440, 160), 0.5)], 'marcador')
# pedidos do dono repassados pelo coordenador
stack([pair('janela-sede-1574x674'), pair('janela-sede-1280x720')], 'janela-sede')
stack([pair('janela-casa-larga-1280x720'), pair('janela-mundo-1600x700')], 'janela-regioes')
stack([pair('janela-cidade-predio-1600x700')], 'cidade-painel')
stack([pair('mundo-clique-na-cidade'), pair('mundo-cidade-visitada')], 'mundo-cidade')
stack([pair('bolso-fixar-sem-papel')], 'bolso')
