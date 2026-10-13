"""Peças pedidas na revisão dos 2.888 personagens: chapéus, instrumentos, trajes, pinturas. Mesma grade de kit.py."""
import math
import numpy as np

INK = '#141016'
BRASS = '#c09048'
CHROME = '#a8acb8'
WOOD = '#8a4a22'


def _col(v, d):
    from kit import col
    return col(v, d)


def _F(cx, cy, ang):
    from kit import Frame
    return Frame(cx, cy, ang)


# ================================================================ chapéus
HATS = {'cangaceiro', 'sombrero', 'flat_cap', 'bucket', 'kangol', 'kufi', 'fila', 'turban', 'headwrap', 'military_cap', 'sailor_cap',
        'captain_cap', 'headdress', 'fur_hat', 'bowler', 'mitre', 'headscarf', 'panama'}


def hat(c, h, rng, cx=47):
    st = h.get('style')
    if st not in HATS:
        return False
    colr = _col(h.get('color'), '#2a2228')
    trim = _col(h.get('trim'), '#d8d0c0')
    if st == 'cangaceiro':
        # chapéu de couro nordestino (meia-lua, aba dobrada para cima na frente, estrelas e ilhoses)
        lc = _col(h.get('color'), '#8a5a2a')
        c.shape(c.poly([(cx - 13, 20), (cx - 12, 10), (cx - 5, 3), (cx + 6, 3), (cx + 13, 10), (cx + 14, 20), (cx + 1, 16)]), lc, r=5, spec=True)
        c.shape(c.poly([(cx - 12, 20), (cx + 1, 15.5), (cx + 14, 20), (cx + 1, 22.5)]), lc, r=2, bias=-0.15)
        for (x, y) in ((cx - 5, 9), (cx + 1, 6), (cx + 7, 9)):
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1), (0, 0)):
                c.px(x + dx, y + dy, ('#d8c070', 5 if (dx, dy) == (0, 0) else 3))
        for x in range(int(cx - 10), int(cx + 12), 3):
            c.px(x, 14 + abs(x - cx - 1) * 0.15, ('#d8c070', 4))
        c.shade_mask(c.ell(cx - 2, 23.5, 12, 2.6), -1)
    elif st == 'sombrero':
        brim = c.ell(cx + 1, 19, 25, 5.2, ang=-4)
        c.shape(brim, colr, r=3)
        ring = brim & ~c.ell(cx + 1, 19, 22.5, 4.2, ang=-4)
        ys, xs = np.nonzero(ring)
        for x, y in zip(xs, ys):
            if (x + y) % 2 == 0:
                c.pxa(x, y, (trim, 4))
        c.shape(c.poly([(cx - 8, 19), (cx - 7, 8), (cx - 3, 4), (cx + 5, 4), (cx + 9, 8), (cx + 10, 18)]), colr, r=5)
        for x in range(int(cx - 6), int(cx + 9), 2):
            c.px(x, 15, (trim, 4))
        front = brim & (c.yy > 19)
        c.shape(front, colr, r=3, bias=0.1)
        c.shade_mask(c.ell(cx - 2, 23.5, 13, 3), -1)
    elif st == 'panama':
        brim = c.ell(cx + 1, 19.5, 16, 3.4, ang=-6)
        c.shape(brim, colr if h.get('color') else '#e8dcbc', r=2)
        c.shape(c.poly([(cx - 9, 19), (cx - 8, 11), (cx, 9.5), (cx + 9, 11), (cx + 11, 18)]), colr if h.get('color') else '#e8dcbc', r=4)
        c.shape(c.poly([(cx - 9, 15.5), (cx + 11, 14.5), (cx + 11, 18), (cx - 9, 19)]), _col(h.get('band'), '#2a2228'), r=1)
        c.shade_mask(c.ell(cx - 2, 23.5, 12, 2.6), -1)
    elif st == 'bowler':
        c.shape(c.ell(cx + 1, 19.5, 14, 2.8, ang=-5), colr, r=2, spec=True)
        c.shape(c.ell(cx + 1, 14, 10.5, 7.5) & (c.yy < 19.5), colr, r=5, spec=True)
        c.shade_mask(c.ell(cx - 2, 23, 11, 2.5), -1)
    elif st == 'flat_cap':
        c.shape(c.poly([(cx - 11, 22), (cx - 10, 15), (cx - 2, 12), (cx + 9, 13), (cx + 13, 18), (cx + 12, 22)]), colr, r=4)
        c.shape(c.ell(cx - 11, 21.5, 6.5, 2.2, ang=-6), colr, r=2, bias=-0.1)
        c.line(cx - 8, 16, cx + 9, 15, (colr, 2))
    elif st in ('bucket', 'kangol'):
        c.shape(c.poly([(cx - 11, 22), (cx - 9.5, 12), (cx + 1, 10), (cx + 10, 12), (cx + 12.5, 22)]), colr, r=4)
        c.shape(c.ell(cx + 1, 22, 15, 3.4) & (c.yy > 19), colr, r=2, bias=-0.05)
        if st == 'kangol':
            c.px(cx - 8, 19, (trim, 5)); c.px(cx - 7, 19, (trim, 4))
    elif st in ('kufi', 'fila'):
        m = c.poly([(cx - 10.5, 20), (cx - 10, 12 if st == 'fila' else 15), (cx + 11, 11 if st == 'fila' else 14), (cx + 11.5, 19)])
        if st == 'kufi':
            m |= c.ell(cx + 0.5, 15, 11, 4.5) & (c.yy < 17)
        c.shape(m, colr, r=3)
        if h.get('pattern', True):
            for x in range(int(cx - 9), int(cx + 11), 3):
                c.px(x, 17, (trim, 4))
    elif st in ('turban', 'headwrap'):
        tall = 3 if st == 'headwrap' else 0
        m = c.poly([(cx - 11, 24), (cx - 11.5, 13), (cx - 5, 6 - tall), (cx + 5, 5 - tall), (cx + 12, 11), (cx + 12.5, 24), (cx + 3, 20), (cx - 5, 21)])
        c.shape(m, colr, r=4)
        for k in range(4):
            c.line(cx - 10 + k * 2, 22 - k * 4, cx + 11, 13 - k * 3 + (k == 3) * 2, (colr, 2 if k % 2 else 4))
        if st == 'headwrap':
            c.shape(c.ell(cx + 4, 5 - tall, 5, 3.4, ang=-20), colr, r=2, spec=True)
    elif st in ('military_cap', 'captain_cap', 'sailor_cap'):
        top = '#f2eee4' if st == 'captain_cap' and not h.get('color') else colr
        if st == 'sailor_cap':
            c.shape(c.ell(cx + 1, 15, 12, 4), '#f2eee4' if not h.get('color') else colr, r=3)
            c.shape(c.rect(cx - 9, 16, cx + 11, 20), '#1e2440', r=1)
        else:
            c.shape(c.ell(cx + 1, 13, 13.5, 4.5), top, r=3)
            c.shape(c.rect(cx - 9.5, 14, cx + 11, 19.5), colr if st == 'military_cap' else '#1e1a20', r=2)
            c.shape(c.ell(cx - 8, 20, 9, 2.2, ang=-4), INK, r=1, spec=True)
            c.shape(c.ell(cx - 2, 16.5, 1.6, 1.6), BRASS, r=1, spec=True)
            c.shade_mask(c.ell(cx - 3, 23, 11, 2.4), -1)
    elif st == 'headdress':
        cols = h.get('feathers', ['#f4f0e6', '#c8302a', '#f4f0e6', '#2a2228'])
        for k, a in enumerate(np.linspace(-165, -15, 11)):
            r = 24 if 3 < k < 8 else 20
            x1, y1 = cx + 1 + math.cos(math.radians(a)) * r, 21 + math.sin(math.radians(a)) * r
            c.shape(c.cap([(cx + 1 + math.cos(math.radians(a)) * 9, 21 + math.sin(math.radians(a)) * 9), (x1, y1)], 2.2, 1.4),
                    cols[k % len(cols)], r=2)
            c.px(x1, y1, ('#2a2228', 2))
        c.shape(c.poly([(cx - 11, 21), (cx + 12, 18), (cx + 12.5, 22), (cx - 10.5, 25)]), _col(h.get('band'), '#c8302a'), r=1)
        for x in range(int(cx - 9), int(cx + 11), 2):
            c.px(x, 22 - (x - cx) * 0.13, ('#f0c030', 4))
    elif st == 'fur_hat':
        m = c.ell(cx + 1, 13, 16, 10)
        c.shape(m, colr, r=5)
        c.texture(m, rng, 60, colr, (1, 2, 4))
    elif st == 'mitre':
        c.shape(c.poly([(cx - 9, 20), (cx - 8, 6), (cx + 1, -4), (cx + 10, 6), (cx + 11, 19)]), colr if h.get('color') else '#2a2228', r=4)
        c.line(cx + 1, -2, cx + 1, 19, ('#d0a040', 4)); c.line(cx - 8, 15, cx + 10, 14, ('#d0a040', 4))
    elif st == 'headscarf':
        m = c.poly([(cx - 11.5, 27), (cx - 11, 15), (cx - 3, 10), (cx + 8, 11), (cx + 13, 18), (cx + 14, 38), (cx + 9, 42), (cx + 8, 24), (cx - 6, 21)])
        c.shape(m, colr, r=4)
        c.shape(c.ell(cx + 12, 40, 3, 2.5), colr, r=2, bias=-0.1)
    if h.get('emblem'):
        c.shape(c.poly([(cx - 4, 13), (cx - 3, 15), (cx - 1, 15), (cx - 2.5, 16.5), (cx - 2, 18.5), (cx - 4, 17.2), (cx - 6, 18.5), (cx - 5.5, 16.5), (cx - 7, 15), (cx - 5, 15)]),
                h['emblem'], r=1, spec=True)
    return True


# ================================================================ instrumentos
LAST = None


def prop(c, p, lefty=False):
    """Desenha instrumentos novos; guarda em LAST o Frame (para a mão no braço) e devolve-o, None ou False (tipo desconhecido)."""
    global LAST
    LAST = None
    r = _prop(c, p, lefty)
    if r not in (None, False):
        LAST = r
    return r


def _prop(c, p, lefty=False):
    t = p.get('type')
    s = -1 if lefty else 1
    ang = 212 if lefty else -35
    cx = 48 if lefty else 50
    if t == 'sitar':
        f = _F(48, 84, -62)
        w = _col(p.get('color'), '#8a4a1c')
        c.shape(c.poly(f.ell(-4, 0, 9.5, 10)), w, r=5, spec=True)
        c.shape(c.poly(f.poly([(4, -2.2), (48, -1.8), (48, 1.8), (4, 2.2)])), w, r=1, spec=True)
        c.shape(c.poly(f.ell(36, 3.6, 3.4, 3.4)), w, r=2, spec=True)
        for u in range(8, 46, 4):
            a, b = f.pt(u, -2), f.pt(u, 2)
            c.line(a[0], a[1], b[0], b[1], ('#e8d8a8', 4))
        for v in (-0.8, 0.8):
            a, b = f.pt(-10, v), f.pt(48, v)
            c.line(a[0], a[1], b[0], b[1], (CHROME, 4))
        f.fret_u = 26
        return f
    if t in ('banjo', 'ukulele', 'cavaquinho', 'bouzouki', 'oud', 'tres'):
        f = _F(cx, 80, ang)
        if t == 'banjo':
            c.shape(c.poly(f.ell(-2, 0, 10, 10)), '#8a8890', r=2, spec=True)
            c.shape(c.poly(f.ell(-2, 0, 8.6, 8.6)), '#ece4cc', r=4)
            neck_to, f.fret_u = 46, 32
        elif t in ('ukulele', 'cavaquinho'):
            k = 0.7
            c.shape(c.poly(f.ell(-3, 0, 7, 7.5)) | c.poly(f.ell(5, 0, 5.2, 5.6)), _col(p.get('top'), '#d8a058'), r=4, spec=True)
            c.shape(c.poly(f.ell(4, 0, 2.2, 2.2)), '#140c0c', r=1, lvl=0)
            neck_to, f.fret_u = 27, 20
        elif t in ('bouzouki', 'oud'):
            c.shape(c.poly(f.ell(-3, 0, 10.5 if t == 'oud' else 8.5, 9 if t == 'oud' else 7.5)), _col(p.get('top'), '#c8904a'), r=5, spec=True)
            for v in (-4, 0, 4):
                a, b = f.pt(-12, v), f.pt(5, v * 0.6)
                c.line(a[0], a[1], b[0], b[1], (_col(p.get('top'), '#c8904a'), 2))
            c.shape(c.poly(f.ell(3, 0, 1.8, 1.8)), '#140c0c', r=1, lvl=0)
            neck_to, f.fret_u = (24, 18) if t == 'oud' else (44, 30)
        else:  # tres cubano
            c.shape(c.poly(f.ell(-4, 0, 9, 9.5)) | c.poly(f.ell(6, 0, 6.5, 7)), _col(p.get('top'), '#d8a058'), r=4, spec=True)
            c.shape(c.poly(f.ell(5, 0, 2.8, 2.8)), '#140c0c', r=1, lvl=0)
            neck_to, f.fret_u = 38, 27
        nk = _col(p.get('neck'), '#4a2416')
        c.shape(c.poly(f.poly([(8, -1.6), (neck_to, -1.4), (neck_to, 1.4), (8, 1.6)])), nk, r=1, spec=True)
        hd = f.poly([(neck_to, -2.4), (neck_to + 6, -2.4 if t != 'oud' else 1), (neck_to + 6, 2.4), (neck_to, 2.4)])
        c.shape(c.poly(hd), '#2a1610', r=1, spec=True)
        for v in (-1, 0, 1):
            a = f.pt(-8, v); b = f.pt(neck_to, v * 0.8)
            c.line(a[0], a[1], b[0], b[1], (CHROME, 4))
        a = f.pt(10, -2 * s)
        c.shape(c.cap([a, (38 if lefty else 60, 50)], 0.9), _col(p.get('strap'), '#5a2a1c'), r=1)
        return f
    if t in ('cello', 'upright_bass'):
        big = 1.25 if t == 'upright_bass' else 1.0
        w = _col(p.get('color'), '#8a3a18')
        c.shape(c.ell(29, 100, 9 * big, 9 * big) | c.ell(29, 84, 7 * big, 7.5 * big) | c.poly([(23, 84), (35, 84), (33, 100), (25, 100)]), w, r=5, spec=True)
        for x in (25, 33):
            c.line(x, 88, x, 96, '#1e1210')
        c.shape(c.rect(28, 108, 30, 134), '#2a2228', r=1)
        c.shape(c.cap([(29, 78), (31, 44 - 6 * (big - 1))], 1.4), '#1e1412', r=1, spec=True)
        c.shape(c.ell(31.5, 42 - 6 * (big - 1), 2, 2.5), w, r=1)
        for v in (-0.6, 0.6):
            c.line(29 + v, 104, 31 + v, 46, (CHROME, 3))
        if t == 'cello':
            c.shape(c.cap([(48, 86), (16, 98)], 0.6), '#d8c8a0', r=1)
        return None
    if t == 'trombone':
        c.shape(c.cap([(41, 37), (16, 52)], 1.0), BRASS, r=1, spec=True)
        c.shape(c.cap([(43, 41), (18, 56)], 1.0), BRASS, r=1, spec=True)
        c.shape(c.cap([(16, 52), (18, 56)], 1.0), BRASS, r=1, spec=True)
        f = _F(44, 41, -150)
        c.shape(c.poly(f.poly([(0, -1.2), (14, -1), (14, 1), (0, 1.2)])), BRASS, r=1, spec=True)
        c.shape(c.poly(f.poly([(10, -1.3), (19, -5.5), (19.5, 5.5), (10, 1.3)])), BRASS, r=2, spec=True)
        c.shape(c.poly(f.ell(19.5, 0, 1.4, 5.6)), '#7a4e1c', r=1, spec=True)
        return None
    if t == 'clarinet':
        c.shape(c.cap([(42, 37), (43.5, 60), (45, 76)], 1.3, 1.8), '#1a1618', r=1, spec=True)
        c.shape(c.ell(45.3, 78, 3, 2), '#1a1618', r=1, spec=True)
        for y in range(46, 74, 4):
            c.px(43.6 + (y - 46) * 0.05, y, (CHROME, 5))
        return None
    if t == 'flute':
        c.shape(c.cap([(35, 36.5), (66, 43)], 0.9), _col(p.get('color'), '#c8ccd8'), r=1, spec=True)
        for x in range(46, 64, 3):
            c.px(x, 39.6 + (x - 46) * 0.2, (CHROME, 2))
        return None
    if t == 'pan_flute':
        for k in range(7):
            c.shape(c.rect(34 + k * 2.2, 37, 36 + k * 2.2, 44 + k * 1.6), '#c8904a', r=1, spec=True)
        return None
    if t == 'pandeiro':
        rim = c.ell(25, 24, 7, 7)
        c.shape(rim, _col(p.get('color'), '#8a4a22'), r=2, spec=True)
        c.shape(c.ell(25, 24, 5.6, 5.6), '#ece4cc', r=3)
        for a in range(0, 360, 60):
            c.px(25 + 6.3 * math.cos(math.radians(a)), 24 + 6.3 * math.sin(math.radians(a)), (CHROME, 5))
        return None
    if t == 'maracas':
        for (x, y) in ((28, 22), (86, 48)):
            c.shape(c.cap([(x + 2, y + 6), (x + 3, y + 10)], 0.8), '#5e3c26', r=1)
            c.shape(c.ell(x, y, 3.6, 4.6, ang=-20), _col(p.get('color'), '#d8a838'), r=2, spec=True)
            c.px(x - 1, y - 1, ('#c8302a', 4))
        return None
    if t == 'bandoneon':
        c.shape(c.rect(37, 62, 44, 78), '#1e1a20', r=3, spec=True)
        c.shape(c.rect(53, 62, 60, 78), '#1e1a20', r=3, spec=True, bias=-0.1)
        c.shape(c.rect(44, 63, 53, 77), '#d8d0c0', r=2)
        for x in range(45, 53, 2):
            c.line(x, 63, x, 76, ('#3a3036', 2))
        for y in range(64, 78, 3):
            c.px(39, y, '#e8e0d0'); c.px(57, y, '#e8e0d0')
        return None
    return False


def electric_extra(c, f, p, s):
    """Formatos e pinturas extras para a guitarra elétrica (chamado por kit.electric)."""
    bc = _col(p.get('body'), '#c83030')
    shape = p.get('shape')
    if shape == 'sg':
        body = c.poly(f.ell(-1, 0, 9.5, 8.5)) | c.poly(f.poly([(2, -8), (9, -7.5), (8, -3), (4, -2)])) | c.poly(f.poly([(2, 8), (9, 7.5), (8, 3), (4, 2)]))
        c.shape(body, bc, r=4, spec=True)
        c.shape(c.poly(f.poly([(-3, 2 * s), (4, 1 * s), (5, 6 * s), (-2, 7 * s)])), '#1a1418', r=1)
        for u in (-3.5, 2):
            c.shape(c.poly(f.poly([(u - 1.3, -3.2), (u + 1.3, -3.2), (u + 1.3, 3.2), (u - 1.3, 3.2)])), '#1e1a1e', r=1)
        return True
    if shape == 'gretsch':
        body = c.poly(f.ell(-2, 0, 12.5, 11)) | c.poly(f.ell(7, 0, 8, 8.5))
        c.shape(body, _col(p.get('body'), '#d8702a'), r=5, spec=True)
        for v in (-6, 6):
            a, b = f.pt(-4, v), f.pt(2, v * 0.8)
            c.line(a[0], a[1], b[0], b[1], '#1e1210')
        for u in (-4, 2):
            c.shape(c.poly(f.poly([(u - 1.3, -3), (u + 1.3, -3), (u + 1.3, 3), (u - 1.3, 3)])), CHROME, r=1, spec=True)
        c.shape(c.poly(f.poly([(-9, -3), (-6.5, -3), (-6.5, 3), (-9, 3)])), BRASS, r=1, spec=True)
        return True
    return False


def guitar_stripes(c, f, p):
    col2 = p.get('stripes')
    if not col2:
        return
    cols = col2 if isinstance(col2, list) else [col2, '#141016']
    for k, (u0, v0, u1, v1) in enumerate(((-9, -7, 4, 8), (-6, -9, 7, 6), (-10, -2, 0, 9), (-2, -9, 9, 2))):
        a, b = f.pt(u0, v0), f.pt(u1, v1)
        c.line(a[0], a[1], b[0], b[1], cols[k % len(cols)])
        c.line(a[0] + 1, a[1], b[0] + 1, b[1], cols[k % len(cols)])


# ================================================================ rosto
def face_paint(c, kind, skin, cx=47, cy=29, colr=None):
    if not kind:
        return
    head = (c.ell(cx, cy, 10, 12) | c.poly([(cx - 9.5, cy + 2), (cx + 9.5, cy + 2), (cx + 8, cy + 9), (cx + 2, cy + 13.5), (cx - 4, cy + 13), (cx - 8.5, cy + 9)]))
    face = head & (c.xx < cx + 8.5) & (c.yy > cy - 8)
    ey = cy + 1
    if kind in ('white', 'skull', 'kiss_star', 'kiss_cat'):
        ys, xs = np.nonzero(face)
        for x, y in zip(xs, ys):
            if c.mat[y, x] == c.m(skin):
                c.mat[y, x] = c.m('#f0ece4')
        if kind == 'skull':
            for x0 in (cx - 10, cx - 4):
                for x in range(x0, x0 + 4):
                    for y in (ey - 1, ey, ey + 1, ey + 2):
                        c.px(x, y, INK)
            for x in range(cx - 8, cx - 1):
                c.px(x, ey + 6, INK)
                if x % 2:
                    c.px(x, ey + 7, INK); c.px(x, ey + 5, INK)
            c.px(cx - 6, ey + 3, INK); c.px(cx - 5, ey + 3, INK)
        elif kind == 'kiss_star':
            for (dx, dy) in ((0, -3), (0, 3), (-3, 0), (3, 0), (-1, -1), (1, 1), (1, -1), (-1, 1), (0, -2), (0, 2), (-2, 0), (2, 0)):
                c.px(cx - 1.5 + dx, ey + 0.5 + dy, INK)
        elif kind == 'kiss_cat':
            for x in range(cx - 7, cx - 2):
                c.px(x, ey + 4, INK)
            for (dx, dy) in ((-1, 0), (1, 0), (0, -1)):
                c.px(cx - 5 + dx, ey + 3 + dy, INK)
        elif kind == 'white':
            for x0 in (cx - 10, cx - 4):
                for x in range(x0, x0 + 4):
                    c.px(x, ey - 2, INK); c.px(x, ey + 2, INK)
    elif kind == 'mask':
        m = face & (c.yy > ey + 2.5)
        c.shape(m, _col(colr, '#141016'), r=2)
    elif kind == 'bolt':
        pts = [(cx - 6, cy - 8), (cx - 9, cy - 1), (cx - 5, cy - 1), (cx - 9, cy + 7)]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            c.line(x0, y0, x1, y1, '#d83030'); c.line(x0 + 1, y0, x1 + 1, y1, '#3a7ad8')
    elif kind == 'eyeliner':
        for x in (cx - 10, cx - 9, cx - 3, cx - 2, cx - 1, cx, cx + 1):
            c.px(x, ey - 1, INK)


def split_facial(c, colr, color2, cx=47, cy=29):
    """Bigode/barba bicolor: divide no eixo da boca (vista 3/4 → x = cx-5), só na região do rosto."""
    m1, m2 = c.m(colr), c.m(color2)
    k = (c.mat == m1) & (c.yy > cy + 4) & (c.yy < cy + 16) & (c.xx >= cx - 4.5) & (c.xx < cx + 9)
    c.mat[k] = m2


def roots(c, colr, root_col, depth=19):
    """Raiz de outra cor: recolore o alto do cabelo (y < depth)."""
    m1, m2 = c.m(colr), c.m(root_col)
    k = (c.mat == m1) & (c.yy < depth)
    c.mat[k] = m2


def twintails(c, colr, cx=47, length=58):
    for side, x0 in ((-1, cx - 11), (1, cx + 12)):
        c.shape(c.cap([(x0, 18), (x0 + side * 5, 34), (x0 + side * 3, length)], 3.2, 2.2), colr, r=3, spec=True)
        c.shape(c.ell(x0, 17, 2.4, 2.2), '#d83a6a', r=1, spec=True)


def split_hair(c, colr, color2, side='right', cx=47):
    """Cabelo bicolor: recolore metade do cabelo já desenhado."""
    m1, m2 = c.m(colr), c.m(color2)
    k = (c.mat == m1) & (c.yy < 60)
    k &= (c.xx >= cx) if side == 'right' else (c.xx < cx)
    c.mat[k] = m2


# ================================================================ roupas
TOPS = {'sari', 'qipao', 'hanbok', 'kaftan', 'robe', 'poncho', 'shawl', 'bare_chest', 'kimono'}
BOTTOMS = {'kilt', 'skirt_full'}


def top(c, t, build, skin, rng, torso_shape, pattern):
    from kit import BUILDS, G_TORSO
    st = t.get('style')
    tc = _col(t.get('color'), '#c8302a')
    trim = _col(t.get('trim'), '#d0a040')
    sh, wa, _ = BUILDS[build]
    if st == 'bare_chest':
        m = torso_shape(c, build)
        c.shape(m, skin, r=7, group=G_TORSO)
        c.px(46, 60, (skin, 1)); c.px(50, 60, (skin, 1)); c.line(48, 66, 48, 80, (skin, 2))
        return
    if st in ('sari', 'qipao', 'kimono', 'kaftan', 'robe'):
        long_ = st in ('kaftan', 'robe', 'kimono')
        m = torso_shape(c, build, long=long_)
        c.shape(m, tc, r=6, group=G_TORSO, spec=st in ('qipao', 'kimono'))
        pattern(c, t, m, rng)
        if st == 'sari':
            d = c.poly([(56, 46), (61, 50), (40, 90), (34, 88)])
            c.shape(d, _col(t.get('drape'), tc), r=3, bias=0.1, spec=True)
            c.line(57, 47, 36, 89, (trim, 4))
            c.shape(c.poly([(42, 47), (54, 47), (48, 53)]), skin, r=2, bias=-0.1)
        elif st == 'qipao':
            c.shape(c.rect(43, 41, 53, 48), tc, r=2, bias=-0.1)
            c.line(48, 48, 56, 56, (trim, 4))
            for y in (51, 54):
                c.px(52 + (y - 51), y, (trim, 5))
        elif st in ('kimono', 'robe'):
            c.shape(c.poly([(42, 45), (48, 62), (54, 45), (51, 45), (48, 55), (45, 45)]), trim if st == 'kimono' else tc, r=2, bias=0.1)
            c.shape(c.poly([(43, 46), (53, 46), (48, 60)]), skin, r=2, bias=-0.1)
            c.shape(c.rect(34, 74, 62, 80), _col(t.get('sash'), trim if st == 'kimono' else tc), r=2, bias=0.05)
        else:  # kaftan
            c.shape(c.poly([(44, 46), (52, 46), (48, 58)]), skin, r=2, bias=-0.1)
            c.line(44, 46, 48, 58, (trim, 4)); c.line(52, 46, 48, 58, (trim, 3))
            c.line(48, 58, 48, 100, (trim, 3))
        return
    if st == 'hanbok':
        c.shape(c.poly([(48 - sh, 51), (48 - sh + 5, 46), (48 + sh - 5, 46), (48 + sh, 51), (48 + sh - 1, 62), (48 - sh + 1, 62)]), tc, r=4, group=G_TORSO)
        c.shape(c.poly([(43, 46), (48, 54), (53, 46)]), '#f2eee4', r=1)
        c.shape(c.poly([(47, 54), (50, 54), (52, 70), (49, 70)]), trim, r=1, spec=True)
        return
    if st in ('poncho', 'shawl'):
        base = torso_shape(c, build)
        c.shape(base, _col(t.get('shirt'), '#2a2228' if st == 'shawl' else '#e8e0cc'), r=6, group=G_TORSO)
        if st == 'poncho':
            m = c.poly([(36, 48), (60, 48), (68, 82), (48, 92), (28, 82)])
        else:
            m = c.poly([(34, 50), (62, 50), (64, 64), (48, 78), (32, 64)])
        c.shape(m, tc, r=4)
        pattern(c, t, m, rng)
        if st == 'poncho':
            for y in (60, 70):
                c.line(30, y + 10, 66, y + 10, (trim, 3))
        else:
            for x in range(34, 63, 2):
                c.line(x, 64 + (14 - abs(x - 48)), x, 67 + (14 - abs(x - 48)), (tc, 2))
        c.shape(c.poly([(43, 46), (53, 46), (48, 52)]), skin, r=2, bias=-0.1)
        return


def legs(c, b, shoes, build, shoe_fn):
    st = b.get('style')
    pc = _col(b.get('color'), '#2a4a3a')
    sc = _col(shoes.get('color'), '#2a2224')
    sk = _col(b.get('skin'), '#d69a6c')
    if st == 'kilt':
        for x0, x1, sx, fy, bias in ((50, 57, 54, 134, -0.15), (38, 46, 40, 135.5, 0)):
            c.shape(c.cap([((x0 + x1) / 2, 100), ((x0 + x1) / 2 - 1, 130)], 3.2), sk, r=2, bias=bias)
            c.shape(c.rect(x0, 118, x1, 130), _col(b.get('socks'), '#e8e4dc'), r=2, bias=bias)
            shoe_fn(c, sc, sx, fy, 6.5 if bias else 7.5, shoes.get('style', 'shoe'))
        k = c.poly([(36, 84), (60, 84), (63, 108), (33, 108)])
        c.shape(k, pc, r=4)
        ys, xs = np.nonzero(k)
        for x, y in zip(xs, ys):
            if x % 5 == 0 or y % 5 == 0:
                c.pxa(x, y, (_col(b.get('plaid'), '#c8302a'), 3 if x < 48 else 2))
        return True
    if st == 'skirt_full':
        m = c.poly([(38, 58), (58, 58), (70, 132), (62, 136), (34, 136), (26, 132)])
        c.shape(m, pc, r=6)
        c.shape(c.ell(40, 136, 5, 2.5), sc, r=2)
        c.shape(c.ell(54, 136, 5, 2.5), sc, r=2)
        return True
    return False


def thick_glasses(c, frame=INK, cx=47, cy=29):
    ey = cy + 1
    for (x0, x1) in ((cx - 11, cx - 6), (cx - 4, cx + 2)):
        for x in range(x0, x1 + 1):
            c.px(x, ey - 1, frame); c.px(x, ey + 2, frame)
        c.px(x0, ey, frame); c.px(x0, ey + 1, frame); c.px(x1, ey, frame); c.px(x1, ey + 1, frame)
    c.px(cx - 5, ey, frame); c.px(cx + 3, ey, frame)
