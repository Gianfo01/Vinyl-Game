"""Biblioteca de peças do estilo Masters (vista 3/4 virada para a esquerda, luz de cima à esquerda).

Coordenadas lógicas num canvas 96×144 (+8 px de folga no topo para chapéus): cabeça centrada em (47, 29),
ombros em y≈51, cintura y≈84, sola do sapato y≈136. Todas as peças usam essa grade, então qualquer
combinação encaixa. Ao criar uma peça nova, mantenha a mesma grade e a mesma ordem de camadas (build.py)."""
import math
import numpy as np
import kit_ext

BRASS = '#c09048'
WOOD = '#6e2e20'
CHROME = '#a8acb8'
SHIRT = '#ece4d4'
INK = '#141016'
G_HEAD = 9001
G_TORSO = 9100

SKINS = {'claro': '#f0c49c', 'medio': '#d69a6c', 'moreno': '#a8693e', 'escuro': '#74462a'}


def col(v, default=None):
    if v is None:
        return default
    return SKINS.get(v, v)


class Frame:
    """Coordenadas locais (u ao longo do eixo do objeto, v perpendicular) — instrumentos e microfones."""

    def __init__(self, cx, cy, ang):
        a = math.radians(ang)
        self.cx, self.cy = cx, cy
        self.d = (math.cos(a), math.sin(a))
        self.p = (-math.sin(a), math.cos(a))

    def pt(self, u, v):
        return (self.cx + u * self.d[0] + v * self.p[0], self.cy + u * self.d[1] + v * self.p[1])

    def poly(self, pts):
        return [self.pt(u, v) for u, v in pts]

    def ell(self, cu, cv, ru, rv, n=32):
        return [self.pt(cu + ru * math.cos(t), cv + rv * math.sin(t)) for t in np.linspace(0, 2 * math.pi, n, endpoint=False)]


# =============================================================== corpo
BUILDS = {  # meia-largura dos ombros, meia-largura da cintura, raio do braço
    'slim': (15, 11.5, 4.2),
    'regular': (17, 13, 4.8),
    'stocky': (18, 14.5, 5.1),
    'female': (14, 10.5, 3.6),
}


JAWS = {
    'default': lambda cx, cy: [(cx - 9.5, cy + 2), (cx + 9.5, cy + 2), (cx + 8, cy + 9), (cx + 2, cy + 13.5), (cx - 4, cy + 13), (cx - 8.5, cy + 9)],
    'female': lambda cx, cy: [(cx - 9.5, cy + 2), (cx + 9.5, cy + 2), (cx + 7, cy + 9), (cx + 1, cy + 13), (cx - 4, cy + 12), (cx - 8.5, cy + 8)],
    'square': lambda cx, cy: [(cx - 9.5, cy + 2), (cx + 9.5, cy + 2), (cx + 9, cy + 10), (cx + 4, cy + 14), (cx - 5, cy + 14), (cx - 9, cy + 10)],
    'narrow': lambda cx, cy: [(cx - 9, cy + 2), (cx + 9, cy + 2), (cx + 6, cy + 9), (cx + 1, cy + 14), (cx - 4, cy + 12.5), (cx - 7.5, cy + 8)],
    'round': lambda cx, cy: [(cx - 10, cy + 2), (cx + 10, cy + 2), (cx + 9.5, cy + 10), (cx + 3, cy + 13.8), (cx - 5, cy + 13.2), (cx - 9.8, cy + 9)],
}


def head(c, skin, cx=47, cy=29, rx=10, female=False, jaw=None, ears=None):
    jaw = jaw or ('female' if female else 'default')
    m = c.ell(cx, cy, rx, 12) | c.poly(JAWS[jaw](cx, cy))
    c.shape(m, skin, r=7, group=G_HEAD, bias=0.12)
    er = 1.25 if ears == 'big' else 1.0
    c.shape(c.ell(cx + 9.6 + (er - 1) * 2, cy + 2, 2.3 * er, 3.6 * er), skin, r=2, bias=-0.05, group=G_HEAD)
    c.px(cx + 10, cy + 2, (skin, 1)); c.px(cx + 10, cy + 3, (skin, 2))
    return m


def face(c, skin, f, cx=47, cy=29, hair_col=INK):
    iris = f.get('iris', '#3a2a22')
    brow = f.get('brow', hair_col)
    mouth = f.get('mouth', 'neutral')
    lips = f.get('lips')
    ey = cy + 1
    W = '#f4efe6'
    by = ey - 3
    for x in (cx - 10, cx - 9, cx - 8):
        c.px(x, by, brow)
    for x in (cx - 3, cx - 2, cx - 1, cx):
        c.px(x, by - (1 if x in (cx - 2, cx - 1) else 0), brow)
    for x in (cx - 9, cx - 8, cx - 3, cx - 2, cx - 1, cx):
        c.px(x, ey - 1, (skin, 0))
    if f.get('lashes'):
        c.px(cx - 10, ey - 1, INK); c.px(cx + 1, ey - 2, INK); c.px(cx + 1, ey - 1, INK)
    c.px(cx - 9, ey, iris); c.px(cx - 8, ey, W)
    c.px(cx - 3, ey, W); c.px(cx - 2, ey, iris); c.px(cx - 1, ey, INK); c.px(cx, ey, W)
    if f.get('wide_eyes'):
        c.px(cx - 10, ey, W); c.px(cx - 4, ey, W)
    c.px(cx - 2, ey + 1, (skin, 2)); c.px(cx - 1, ey + 1, (skin, 2)); c.px(cx - 9, ey + 1, (skin, 2))
    nx = cx - 5
    for y in (ey, ey + 1, ey + 2):
        c.px(nx + 1, y, (skin, 2))
    c.px(nx, ey + 2, (skin, 4))
    c.px(nx - 1, ey + 3, (skin, 2)); c.px(nx, ey + 3, (skin, 1)); c.px(nx + 1, ey + 3, (skin, 1)); c.px(nx + 2, ey + 3, (skin, 2))
    br = f.get('brow_style')
    if br == 'heavy':
        for x in (cx - 10, cx - 9, cx - 8, cx - 3, cx - 2, cx - 1, cx):
            c.px(x, by + 1 - (1 if x in (cx - 2, cx - 1) else 0) + (0 if x < cx - 5 else 0), brow)
    elif br == 'arched':
        c.px(cx - 9, by - 1, brow); c.px(cx - 2, by - 2, brow); c.px(cx - 1, by - 2, brow)
    eyes = f.get('eyes')
    if eyes == 'hooded':
        for x in (cx - 9, cx - 8, cx - 3, cx - 2, cx - 1, cx):
            c.px(x, ey - 1, (skin, 1))
        c.px(cx - 3, ey, (skin, 2)); c.px(cx - 8, ey, (skin, 3))
        c.px(cx - 2, ey - 1, INK); c.px(cx - 1, ey - 1, INK)
    elif eyes == 'deep':
        for x in (cx - 10, cx - 9, cx - 8, cx - 3, cx - 2, cx - 1, cx):
            c.px(x, ey - 2, (skin, 1))
        c.px(cx - 4, ey, (skin, 1)); c.px(cx - 3, ey + 1, (skin, 1))
    nose = f.get('nose')
    if nose == 'long':
        c.px(nx + 1, ey + 3, (skin, 2)); c.px(nx, ey + 4, (skin, 1)); c.px(nx - 1, ey + 4, (skin, 2)); c.px(nx + 1, ey + 4, (skin, 1))
        c.px(nx - 1, ey + 3, (skin, 3))
    elif nose == 'wide':
        c.px(nx - 2, ey + 3, (skin, 2)); c.px(nx + 3, ey + 3, (skin, 2)); c.px(nx - 2, ey + 2, (skin, 3))
    elif nose == 'small':
        c.px(nx + 1, ey, (skin, 3)); c.px(nx - 1, ey + 3, (skin, 3)); c.px(nx + 2, ey + 3, (skin, 3))
    if f.get('cheeks'):
        c.px(cx - 9, ey + 4, (skin, 4)); c.px(cx - 8, ey + 4, (skin, 4)); c.px(cx - 1, ey + 4, (skin, 4))
    if f.get('blush'):
        c.px(cx - 10, ey + 3, f['blush']); c.px(cx, ey + 3, f['blush'])
    my = ey + 6
    if mouth == 'neutral':
        for x in range(nx - 2, nx + 4):
            c.px(x, my, (skin, 1))
        c.px(nx - 1, my + 1, (skin, 4)); c.px(nx, my + 1, (skin, 4))
    elif mouth == 'smirk':
        for x in range(nx - 2, nx + 3):
            c.px(x, my, (skin, 1))
        c.px(nx + 3, my - 1, (skin, 1)); c.px(nx, my + 1, (skin, 4))
    elif mouth == 'snarl':
        for x in range(nx - 2, nx + 3):
            c.px(x, my, (skin, 1))
        c.px(nx - 3, my - 1, (skin, 1)); c.px(nx - 2, my - 1, (skin, 2)); c.px(nx - 1, my + 1, (skin, 4))
    elif mouth == 'smile':
        for x in range(nx - 1, nx + 3):
            c.px(x, my, (skin, 1))
        c.px(nx - 2, my - 1, (skin, 1)); c.px(nx + 3, my - 1, (skin, 1)); c.px(nx, my + 1, (skin, 4))
    elif mouth == 'grin':
        lp = lips or skin
        for x in range(nx - 3, nx + 5):
            c.px(x, my - 1, (lp, 1 if lp == skin else 2))
        for x in range(nx - 2, nx + 4):
            c.px(x, my, '#fbf6ea'); c.px(x, my + 1, (lp, 1 if lp == skin else 3))
        c.px(nx - 3, my, (lp, 1)); c.px(nx + 4, my, (lp, 1))
        c.px(nx - 4, my - 2, (skin, 2)); c.px(nx + 5, my - 2, (skin, 2))
    elif mouth == 'lips':
        lp = lips or '#b0584a'
        for x in range(nx - 2, nx + 4):
            c.px(x, my, (lp, 2))
        for x in range(nx - 1, nx + 3):
            c.px(x, my + 1, (lp, 3)); c.px(x, my - 1, (lp, 3))
        c.px(nx, my + 1, (lp, 4))
    elif mouth == 'open':
        lp = lips or skin
        for x in range(nx - 2, nx + 4):
            c.px(x, my - 1, (lp, 1)); c.px(x, my + 1, (lp, 2))
        c.px(nx - 2, my, (lp, 1)); c.px(nx + 3, my, (lp, 1))
        for x in range(nx - 1, nx + 3):
            c.px(x, my, '#3a0e14')
        c.px(nx, my, W); c.px(nx + 1, my, W)

    if f.get('smile_lines'):
        c.px(nx - 4, my - 1, (skin, 2)); c.px(nx - 4, my, (skin, 2)); c.px(nx + 5, my - 1, (skin, 2)); c.px(nx + 5, my, (skin, 2))
    if f.get('chin_cleft'):
        c.px(cx - 4, cy + 12, (skin, 2))
    if f.get('teeth') == 'overbite':
        for x in range(nx - 1, nx + 3):
            c.px(x, my, '#f8f2e4'); c.px(x, my + 1, '#efe6d2')
        c.px(nx - 2, my + 1, (lips or skin, 1)); c.px(nx + 3, my + 1, (lips or skin, 1))
        for x in range(nx - 1, nx + 3):
            c.px(x, my + 2, (lips or skin, 2))
    if f.get('scar'):
        c.px(cx - 1, cy + 6, (skin, 2)); c.px(cx, cy + 7, (skin, 2))


def facial_hair(c, kind, colr, cx=47, cy=29):
    if not kind:
        return
    nx, my = cx - 5, cy + 7
    if kind in ('mustache', 'mustache_thick', 'goatee', 'beard'):
        for x in range(nx - 3, nx + 4):
            c.px(x, my - 1, (colr, 2))
    if kind == 'mustache_thick':
        for x in range(nx - 3, nx + 4):
            c.px(x, my - 2, (colr, 3))
        c.px(nx - 4, my, (colr, 2)); c.px(nx + 4, my, (colr, 1))
    if kind == 'goatee':
        for x in range(nx - 1, nx + 3):
            c.px(x, my + 2, (colr, 2)); c.px(x, my + 3, (colr, 3))
    if kind == 'beard':
        m = c.poly([(cx - 9, cy + 4), (cx - 6, cy + 9), (cx - 1, cy + 14.5), (cx + 4, cy + 13), (cx + 9, cy + 6), (cx + 9.5, cy + 2),
                    (cx + 7, cy + 4), (cx + 3, cy + 9), (cx - 2, cy + 9), (cx - 7, cy + 6)])
        c.shape(m, colr, r=3, group=G_HEAD)
        for x in range(nx - 2, nx + 4):
            c.px(x, my, (colr, 1))
    if kind == 'stubble':
        m = c.poly([(cx - 8, cy + 8), (cx - 3, cy + 13), (cx + 3, cy + 13), (cx + 8, cy + 8), (cx + 3, cy + 10), (cx - 3, cy + 10)])
        ys, xs = np.nonzero(m)
        for x, y in zip(xs, ys):
            if (x + y) % 2 == 0:
                c.pxa(x, y, (colr, 3))


def glasses(c, kind, frame='#d0a040', cx=47, cy=29, lens_tint='#c8486a'):
    if not kind:
        return
    ey = cy + 1
    if kind in ('aviator', 'dark'):
        lens = '#6a3a24' if kind == 'aviator' else '#1c1a22'
        fr = frame if kind == 'aviator' else INK
        for x in range(cx - 11, cx + 2):
            c.px(x, ey - 1, (fr, 4) if kind == 'aviator' else fr)
        for (x0, x1) in ((cx - 11, cx - 6), (cx - 4, cx + 2)):
            for x in range(x0, x1):
                for y in (ey, ey + 1, ey + 2):
                    c.px(x, y, (lens, 1 if y == ey else 2))
            c.px(x0 + 1, ey, '#f0d0a0' if kind == 'aviator' else '#5a6070')
        c.px(cx + 2, ey, (fr, 3) if kind == 'aviator' else fr)
    elif kind == 'round_tint':
        for ccx in (cx - 8.5, cx - 1.5):
            c.shape(c.ell(ccx, ey + 0.5, 2.8, 2.6), lens_tint, r=1, lvl=2)
            c.px(ccx - 1, ey - 0.5, '#fff4d8')
        c.px(cx - 5, ey, frame); c.px(cx + 2, ey, frame)
    elif kind == 'round':
        fr = frame or INK
        for (ccx) in (cx - 8.5, cx - 1.5):
            m = c.ell(ccx, ey + 0.5, 2.8, 2.6) & ~c.ell(ccx, ey + 0.5, 1.8, 1.6)
            ys, xs = np.nonzero(m)
            for x, y in zip(xs, ys):
                c.pxa(x, y, fr)
        c.px(cx - 5, ey, fr)


# =============================================================== cabelo
def hair_back(c, h, rng, cx=47):
    st, colr, k = h.get('style'), col(h.get('color'), INK), h.get('size', 1.0)
    if kit_ext.back(c, st, colr, k, rng, cx):
        return
    if st == 'afro':
        m = c.ell(cx + 1, 22, 16 * k, 14.5 * k) | c.ell(cx + 5, 30, 13 * k, 12 * k)
        c.shape(m, colr, r=6)
        c.texture(m, rng, 70, colr)
    elif st == 'curls_long':
        m = c.poly([(cx - 11, 22), (cx + 11, 20), (cx + 14, 34), (cx + 12, 44 * k), (cx + 8, 42 * k), (cx + 7, 30), (cx - 7, 28), (cx - 10, 38), (cx - 13, 36)])
        c.shape(m, colr, r=3, spec=True)
        c.texture(m, rng, 30, colr, (2, 4, 5))
    elif st == 'long':
        m = c.poly([(cx - 11, 22), (cx + 11, 20), (cx + 15, 36), (cx + 14, 50 * k), (cx + 5, 52 * k), (cx + 4, 30), (cx - 8, 30), (cx - 11, 44 * k), (cx - 14, 40)])
        c.shape(m, colr, r=4, spec=True)
    elif st == 'bob':
        m = c.poly([(cx - 12, 22), (cx + 12, 20), (cx + 14, 38), (cx + 9, 42), (cx - 9, 40), (cx - 13, 36)])
        c.shape(m, colr, r=4, spec=True)


def hair_front(c, h, hat, cx=47):
    st, colr, k = h.get('style'), col(h.get('color'), INK), h.get('size', 1.0)
    if not st or st == 'bald':
        return
    if hat in ('fedora', 'cowboy', 'turban_fruit', 'top_hat', 'beret', 'beanie', 'cap'):
        if st not in kit_ext.LONGISH:
            c.shape(c.poly([(cx + 7, 21), (cx + 11, 22), (cx + 11, 31), (cx + 9, 31), (cx + 8, 25)]), colr, r=2)
            c.shape(c.poly([(cx - 10, 22), (cx - 6, 21), (cx - 8, 26), (cx - 10, 27)]), colr, r=1)
        else:
            c.shape(c.poly([(cx + 6, 21), (cx + 11, 21), (cx + 11, 40), (cx + 8, 42), (cx + 8, 26)]), colr, r=2, spec=True)
            c.shape(c.poly([(cx - 11.5, 21), (cx - 8.5, 21), (cx - 10, 30), (cx - 12, 31)]), colr, r=1, spec=True)
        return
    if kit_ext.front(c, st, colr, k, np.random.default_rng(3), cx):
        return
    if st == 'pompadour':
        m = c.poly([(cx - 10, 24), (cx - 10.5, 16), (cx - 7, 13 - 2 * k), (cx, 11 - 2 * k), (cx + 7, 11.5 - k), (cx + 11, 15),
                    (cx + 11.5, 22), (cx + 10, 30), (cx + 8, 23), (cx + 3, 18), (cx - 4, 18), (cx - 8, 21)])
        m |= c.ell(cx - 6, 15 - 1.5 * k, 6 * k, 4 * k, ang=-15)
        c.shape(m, colr, r=4, spec=True)
        for (a, b) in (((cx - 9, 15), (cx - 2, 11)), ((cx - 4, 17), (cx + 4, 13)), ((cx + 2, 16), (cx + 8, 14))):
            c.line(a[0], a[1] - 1, b[0], b[1] - 1, (colr, 5))
        sl = h.get('sideburns', 8)
        c.shape(c.poly([(cx + 7, 24), (cx + 9.5, 24), (cx + 9, 24 + sl), (cx + 7, 24 + sl)]), colr, r=1)
    elif st in ('short', 'slick', 'bob', 'long'):
        m = c.poly([(cx - 10.5, 25), (cx - 10, 17), (cx - 4, 13), (cx + 5, 13), (cx + 10, 17), (cx + 11.5, 27), (cx + 9, 31), (cx + 8, 23), (cx + 1, 19), (cx - 7, 20)])
        if st in ('bob', 'long'):
            m |= c.poly([(cx - 11, 20), (cx - 2, 16), (cx - 5, 22), (cx - 10, 24), (cx - 11.5, 30)])
        c.shape(m, colr, r=3, spec=True)
        if st == 'slick':
            for x0 in (cx - 7, cx - 2, cx + 3):
                c.line(x0, 16, x0 + 5, 15, (colr, 5))
    elif st == 'cropped':
        c.shape(c.poly([(cx - 10, 22), (cx - 8, 17), (cx - 2, 15), (cx + 5, 15.5), (cx + 9, 18), (cx + 11, 24), (cx + 10, 29), (cx + 8, 22), (cx + 2, 19), (cx - 5, 19.5)]), colr, r=2)
        grey = h.get('grey_sides')
        if grey:
            c.shape(c.poly([(cx + 9, 23), (cx + 11, 24), (cx + 11, 29), (cx + 9, 29)]), grey, r=1)
    elif st == 'afro':
        m = c.poly([(cx - 11, 24), (cx - 10, 15), (cx - 3, 10), (cx + 7, 11), (cx + 12, 18), (cx + 12, 25), (cx + 7, 20), (cx - 2, 19.5), (cx - 8, 21)])
        c.shape(m, colr, r=4)
        c.texture(m, np.random.default_rng(1), 25, colr, (2, 3, 4))
    elif st == 'curls_long':
        c.shape(c.poly([(cx + 7, 24), (cx + 12, 24), (cx + 13, 40), (cx + 10, 44), (cx + 8, 36)]), colr, r=2, spec=True)
        c.shape(c.poly([(cx - 11, 23), (cx - 9, 23), (cx - 10.5, 32), (cx - 12, 31)]), colr, r=1, spec=True)
        c.shape(c.poly([(cx - 10.5, 25), (cx - 9, 17), (cx - 2, 14), (cx + 6, 14), (cx + 11, 19), (cx + 11, 25), (cx + 4, 20), (cx - 5, 21)]), colr, r=3, spec=True)


# =============================================================== chapéus
def hat(c, h, rng, cx=47):
    st = h.get('style')
    if not st:
        return
    colr = col(h.get('color'), '#6e6458')
    if st in ('fedora', 'top_hat'):
        brim = c.ell(cx + 1, 19.5, 17, 3.6, ang=h.get('tilt', -7))
        c.shape(brim, colr, r=2, spec=h.get('shiny', False))
        if st == 'fedora':
            crown = c.poly([(cx - 10.5, 19), (cx - 9.5, 11), (cx - 6, 8), (cx + 1, 9.5), (cx + 8, 8), (cx + 11.5, 10.5), (cx + 13, 17.5)])
        else:
            crown = c.poly([(cx - 9, 19), (cx - 9, 2), (cx + 11, 1), (cx + 11, 17.5)])
        c.shape(crown, colr, r=5, spec=h.get('shiny', False))
        if st == 'fedora':
            c.line(cx - 3, 10, cx + 5, 10, (colr, 1))
        c.shape(c.poly([(cx - 11, 15.5), (cx + 13, 14), (cx + 13, 18), (cx - 11, 19.5)]), col(h.get('band'), '#221c20'), r=1)
        front = brim & (c.yy > 19.5 - (c.xx - cx - 1) * 0.12)
        c.shape(front, colr, r=2, bias=0.1, spec=h.get('shiny', False))
        c.shade_mask(c.ell(cx - 2, 23.5, 12, 2.8), -1)
    elif st == 'cowboy':
        brim = c.ell(cx + 1, 18.5, 19, 4.5, ang=-6)
        c.shape(brim, colr, r=2)
        c.shape(c.poly([(cx - 9, 18), (cx - 8, 9), (cx - 3, 6), (cx + 1, 8), (cx + 6, 6), (cx + 10, 9), (cx + 11, 17)]), colr, r=5)
        c.shape(c.poly([(cx - 9, 15), (cx + 11, 14), (cx + 11, 17), (cx - 9, 18)]), col(h.get('band'), '#3a2418'), r=1)
        front = brim & (c.yy > 18.5 - (c.xx - cx - 1) * 0.1)
        c.shape(front, colr, r=2, bias=0.1)
        c.shade_mask(c.ell(cx - 2, 23, 12, 3), -1)
    elif st == 'beret':
        c.shape(c.ell(cx - 1, 15, 13, 5.5, ang=-8), colr, r=4)
        c.px(cx + 1, 9, (colr, 1))
    elif st == 'beanie':
        c.shape(c.poly([(cx - 11, 22), (cx - 10, 13), (cx - 2, 8), (cx + 7, 9), (cx + 12, 15), (cx + 12, 22)]), colr, r=4)
        c.shape(c.rect(cx - 11, 19, cx + 12.5, 23), colr, r=1, bias=0.1)
    elif st == 'cap':
        c.shape(c.poly([(cx - 10, 21), (cx - 9, 13), (cx - 1, 9), (cx + 8, 10), (cx + 12, 16), (cx + 12, 22)]), colr, r=4)
        c.shape(c.ell(cx - 12, 20.5, 8, 2.4, ang=-5), colr, r=2, bias=-0.1)
    elif st in ('headband', 'bandana'):
        hc = col(h.get('color'), '#d03a2a')
        c.shape(c.poly([(cx - 11, 22), (cx + 12, 18), (cx + 12.5, 21.5), (cx - 10.5, 25.5)]), hc, r=1, spec=True)
        c.shape(c.poly([(cx + 12, 19), (cx + 18, 22), (cx + 19, 32), (cx + 15, 30), (cx + 13, 24)]), hc, r=2)
        if h.get('trim'):
            c.line(cx - 9, 23, cx + 10, 20, (h['trim'], 4))
    elif st == 'turban_fruit':
        tc = col(h.get('color'), '#e88030')
        c.shape(c.poly([(cx - 12, 22), (cx - 10, 12), (cx, 8), (cx + 11, 11), (cx + 13, 22), (cx + 10, 19), (cx + 1, 16.5), (cx - 8, 19)]), tc, r=4, spec=True)
        c.line(cx - 9, 18, cx + 11, 13, (tc, 1)); c.line(cx - 9, 15, cx + 9, 10, ('#2f9a5a', 3))
        c.shape(c.ell(cx + 5, 3, 5, 4.5), '#6a3a8a', r=3, spec=True)
        for (x, y) in ((3, 1), (6, 4), (8, 1), (4, 5), (2, 3)):
            c.shape(c.ell(cx + x, y, 1.6, 1.6), '#7a4a9a', r=1, spec=True)
        for kk, a in enumerate((-35, -10, 15)):
            f = Frame(cx - 3 + kk * 2.5, 5, a - 90)
            c.shape(c.poly(f.poly([(-4, -1.5), (3, -2.2), (8, -1), (9, 0.6), (3, 1.4), (-4, 1)])), '#f0d040', r=2, spec=True)
        c.shape(c.ell(cx - 7, 6, 3, 2, ang=-30), '#3a9a4a', r=2)
        c.shape(c.ell(cx + 13, 6, 3, 2, ang=30), '#3a9a4a', r=2)
        for (x, y) in ((-7, 9), (10, 7), (-1, -1)):
            c.shape(c.ell(cx + x, y, 2, 2), '#d02030', r=1, spec=True)
        c.shape(c.poly([(cx + 9, -2), (cx + 11, -6), (cx + 12, -2), (cx + 15, -5), (cx + 14, 0)]), '#3a9a4a', r=1)


# =============================================================== roupa
def legs(c, b, shoes, build='regular'):
    st = b.get('style', 'pants')
    pc = col(b.get('color'), '#2a2830')
    sc = col(shoes.get('color'), '#2a2224')
    sst = shoes.get('style', 'shoe')
    stripe = b.get('stripe')
    if st == 'skirt_long':
        skirt = c.poly([(37, 80), (60, 80), (68, 132), (62, 136), (34, 136), (28, 132)])
        c.shape(skirt, pc, r=5)
        for k, bc in enumerate(b.get('bands', [])):
            y0 = 90 + k * (40 / max(1, len(b['bands'])))
            c.shape(skirt & (c.yy > y0) & (c.yy < y0 + 5), bc, r=2, group=77)
        c.shape(c.ell(40, 136, 5, 2.5), sc, r=2, spec=True)
        c.shape(c.ell(54, 136, 5, 2.5), sc, r=2, spec=True)
        return
    if st == 'skirt':
        c.shape(c.poly([(37, 80), (60, 80), (64, 104), (33, 104)]), pc, r=4)
        for x0, x1, sx, fy in ((50, 56, 53, 134), (39, 46, 42, 135.5)):
            c.shape(c.cap([((x0 + x1) / 2, 104), ((x0 + x1) / 2, 130)], 3.0), col(b.get('skin'), '#d69a6c'), r=2, bias=-0.1 if sx > 50 else 0)
            shoe(c, sc, sx, fy, 6 if sx > 50 else 7, sst)
        return
    if st == 'jeans':
        pc = col(b.get('color'), '#3a5a8c')
    if st == 'shorts':
        sk = col(b.get('skin'), '#d69a6c')
        for x0, x1, sx, fy, bias in ((50, 57, 54, 134, -0.15), (38, 46, 40, 135.5, 0)):
            c.shape(c.cap([((x0 + x1) / 2, 100), ((x0 + x1) / 2 - 1, 130)], 3.2), sk, r=2, bias=bias)
            shoe(c, sc, sx, fy, 6.5 if bias else 7.5, sst)
        c.shape(c.poly([(36, 84), (60, 84), (61, 104), (49, 104), (48, 96), (47, 104), (35, 104)]), pc, r=4)
        return
    flare = 3 if st == 'flare' or b.get('flare') else 0
    for (x0, x1, sx, fy, bias) in ((49, 59, 54, 134, -0.15), (36, 48, 40, 135.5, 0)):
        bot = 124 if st == 'highwater' else 132
        c.shape(c.poly([(x0, 84), (x1, 84), (x1 + (flare + 1 if bias else flare - 1), bot), (x0 - (flare if bias else flare + 2), bot)]), pc, r=4, bias=bias, spec=b.get('shiny', False))
        if st == 'highwater':
            c.shape(c.rect(x0 + 1, 124, x1 - 1, 131), col(b.get('socks'), '#f6f4f0'), r=2, spec=True)
        if st == 'jeans':
            c.line(x1 - 2, 86, x1 - 2 + flare * 0.8, bot - 1, (pc, 4))
        if stripe:
            c.line(x1 - 1, 86, x1 - 1 + flare * 0.8, bot - 1, (stripe, 2 if bias else 3))
        if b.get('studs'):
            for t in np.linspace(0, 1, 9):
                x = x0 + 2 - (flare + 1) * t
                c.px(x, 96 + t * 34, (b['studs'][0], 4) if int(t * 8) % 2 else b['studs'][1])
        shoe(c, sc, sx, fy, 6.5 if bias else 7.5, sst)


def shoe(c, sc, x, y, w, style='shoe'):
    m = c.ell(x - 1, y, w, 3.2) | c.poly([(x - w, y), (x + 2, y - 3.5), (x + w - 2, y - 2), (x + w - 2, y + 1)])
    if style in ('boot', 'hightop'):
        m |= c.rect(x - 3, y - 7, x + 4, y - 1)
    c.shape(m, sc, r=3, spec=style not in ('sneaker', 'hightop'))
    if style in ('sneaker', 'hightop'):
        c.line(x - w + 1, y + 2, x + w - 2, y + 2, (sc, 1))
    if style == 'sneaker':
        c.line(x - w + 2, y + 1, x + 2, y - 1, ('#2a4a9a', 3))
        c.line(x - w + 1, y + 2, x + w - 2, y + 2, (sc, 2))


def torso_shape(c, build, long=False):
    sh, wa, _ = BUILDS[build]
    bottom = 104 if long else 89
    return c.poly([(48 - sh, 51), (48 - sh + 6, 46), (48 + sh - 6, 46), (48 + sh, 51), (48 + sh - 1, 70), (48 + wa + 1, bottom), (48 - wa - 1, bottom), (48 - sh + 2, 70)])


def top(c, t, build, skin, rng):
    st = t.get('style', 'suit')
    if st in kit_ext.TOPS:
        kit_ext.top(c, t, build, skin, rng, torso_shape, _pattern)
        return
    tc = col(t.get('color'), '#33405e')
    shirt = col(t.get('shirt'), SHIRT)
    spec = t.get('shiny', False)
    sh, wa, _ = BUILDS[build]
    if st == 'jumpsuit':
        c.shape(c.poly([(37, 49), (40, 36), (47, 40), (56, 36), (60, 49)]), tc, r=3, bias=-0.1)
    if st == 'crop':
        c.shape(c.poly([(39, 66), (57, 66), (59, 81), (37, 81)]), skin, r=5)
        c.px(48, 75, (skin, 1))
        c.shape(c.poly([(34, 56), (39, 51), (57, 51), (62, 56), (60, 67), (36, 67)]), tc, r=5, group=2)
        trim = col(t.get('trim'), '#f0c030')
        c.shape(c.poly([(35, 65), (61, 65), (62, 70), (34, 70)]), trim, r=2, group=3)
        for x in range(35, 62, 3):
            c.px(x, 70, (trim, 2)); c.px(x + 1, 70, (trim, 4))
        c.shape(c.poly([(39, 51), (57, 51), (57, 54), (48, 57), (39, 54)]), skin, r=2)
        return
    if st == 'dress':
        c.shape(c.poly([(48 - sh, 53), (48 - sh + 5, 48), (48 + sh - 5, 48), (48 + sh, 53), (48 + sh - 2, 70), (48 + wa + 2, 88), (48 - wa - 2, 88), (48 - sh + 2, 70)]), tc, r=6, group=G_TORSO, spec=spec)
        c.shape(c.poly([(42, 48), (54, 48), (48, 55)]), skin, r=2)
        return
    if st == 'fringe_jacket':
        torso = torso_shape(c, build)
        c.shape(torso, tc, r=7, group=G_TORSO)
        c.shape(c.poly([(43, 46), (53, 46), (51, 58), (48, 64), (45, 58)]), skin, r=2, bias=-0.1)
        beads = col(t.get('beads'), '#3a6ac8')
        for k in range(3):
            for xx in range(35, 62):
                yy = 53 + k * 3 + abs(xx - 48) * -0.25 + 3
                if torso[int(yy) + c.oy, xx] and not (44 <= xx <= 52):
                    if (xx + k) % 2 == 0:
                        c.px(xx, yy, (beads, 4 if k == 1 else 3))
        for xx in range(int(48 - wa - 1), int(48 + wa + 2)):
            ln = 4 + (xx * 7) % 3
            for yy in range(89, 89 + ln):
                c.px(xx, yy, (tc, 2 if xx % 2 else 3))
        if t.get('necklace'):
            for xx in range(45, 52):
                c.px(xx, 52 + abs(xx - 48) * -0.4 + 2, (t['necklace'], 4))
        return
    if st == 'open_military':
        c.shape(c.poly([(38, 46), (58, 46), (60, 84), (36, 84)]), shirt, r=4)
        c.shape(c.poly([(42, 46), (54, 46), (53, 52), (48, 55), (43, 52)]), skin, r=2, bias=-0.05)
        jac = c.poly([(31, 51), (37, 46), (43, 46), (42, 70), (40, 86), (35, 86), (33, 70)]) | \
              c.poly([(53, 46), (59, 46), (65, 51), (64, 70), (62, 86), (56, 86), (54, 70)])
        c.shape(jac, tc, r=5, spec=True, group=4)
        bk = col(t.get('buckle'), '#2a2228')
        for y in (56, 63, 70, 77):
            c.shape(c.rect(41, y, 45, y + 2), bk, r=1, spec=True)
            c.px(42, y, (bk, 5)); c.shape(c.rect(53, y, 56, y + 2), bk, r=1, spec=True)
        c.shape(c.poly([(32, 50), (40, 46), (40, 50), (33, 53)]), tc, r=2, bias=0.1, spec=True)
        c.shape(c.rect(36, 84, 61, 87), col(t.get('belt'), '#2a2228'), r=1)
        return
    torso = torso_shape(c, build, long=(st == 'coat_long'))
    c.shape(torso, tc, r=7, group=G_TORSO, spec=spec)
    if st == 'coat_long':
        c.line(48, 90, 48, 104, (tc, 0))
    if st in ('tshirt', 'sweater'):
        c.shape(c.poly([(43, 46), (53, 46), (51, 50), (45, 50)]), skin, r=2, bias=-0.1)
        if st == 'sweater':
            for y in range(56, 88, 3):
                c.line(48 - sh + 3, y, 48 + sh - 3, y, (tc, 2))
        if t.get('print'):
            c.shape(c.ell(48, 64, 5, 4), t['print'], r=2)
        _pattern(c, t, torso, rng)
        return
    if st == 'jumpsuit':
        c.shape(c.poly([(43.5, 46), (53, 46), (48.5, 64)]), skin, r=2, bias=-0.1)
        _pattern(c, t, torso, rng)
        belt = col(t.get('belt'), '#d0a040')
        c.shape(c.poly([(33, 80), (63, 79), (63, 87), (34, 88)]), belt, r=2, spec=True)
        c.shape(c.ell(47, 83.5, 6, 5), belt, r=3, spec=True)
        c.shape(c.ell(47, 83.5, 3, 2.5), col(t.get('jewel'), '#c03030'), r=2, spec=True)
        for x in range(36, 62, 4):
            c.px(x, 83, '#fff8dc')
        return
    # suit / tux / jacket_open / coat_long / military
    v_bottom = 62 if st == 'military' else 66
    if st == 'military':
        c.shape(c.poly([(43, 46), (53, 46), (52, 58), (48, 62), (44, 58)]), shirt, r=2)
        if t.get('scarf'):
            c.line(45, 50, 51, 56, (t['scarf'], 3)); c.line(45, 54, 49, 58, (t['scarf'], 3))
        gold = col(t.get('braid'), '#d8a838')
        for y in range(56, 86, 4):
            for x in range(36, 61):
                if torso[y + c.oy, x] and not (44 < x < 52 and y < 62):
                    if (x + y) % 2 == 0 or x in (36, 37, 59, 60):
                        c.px(x, y, (gold, 4 if x < 48 else 3))
            c.px(47, y + 1, (gold, 5)); c.px(49, y + 1, (gold, 5))
        for x in range(33, 63, 2):
            c.px(x, 50 if 38 < x < 58 else 52, (gold, 4))
        return
    c.shape(c.poly([(43, 46), (53, 46), (48, v_bottom)]), shirt, r=2)
    tie, tcol = t.get('tie'), col(t.get('tie_color'), '#8a2430')
    if tie in ('tie', 'loose'):
        c.shape(c.poly([(46.5, 48), (50, 48), (49.5, 51), (47, 51)]), tcol, r=1)
        c.shape(c.poly([(47, 51), (49.5, 51), (50.5, 63), (48.5, 66), (46.5, 62)]), tcol, r=2)
    lap = col(t.get('lapel'), tc)
    c.shape(c.poly([(42, 46), (39 - (sh - 17) * 0.5, 49), (41, 57), (48, v_bottom + 1), (44, 52)]), lap, r=2, bias=0.15, group=G_TORSO if lap == tc else None, spec=spec or st == 'tux')
    c.shape(c.poly([(54, 46), (57 + (sh - 17) * 0.5, 49), (55, 57), (48, v_bottom + 1), (52, 52)]), lap, r=2, bias=-0.05, group=G_TORSO if lap == tc else None, spec=spec or st == 'tux')
    if tie == 'bow':
        c.shape(c.poly([(43, 48), (48, 50), (53, 48), (53, 53), (48, 51), (43, 53)]), col(t.get('tie_color'), '#141216'), r=1, spec=True)
        for y in (56, 61):
            c.px(48, y, INK)
    if t.get('pocket_square'):
        c.shape(c.poly([(55, 56), (60, 55), (59, 58), (56, 58)]), col(t['pocket_square'], '#f2ece0') if isinstance(t['pocket_square'], str) else '#f2ece0', r=1)
    if st in ('suit', 'tux'):
        c.px(48, 74, ('#1e1a1e', 2)); c.px(48, 81, ('#1e1a1e', 2))
        c.line(36, 79, 44, 79, (tc, 1))
    _pattern(c, t, torso, rng)


def _pattern(c, t, torso, rng):
    if kit_ext.pattern(c, t, torso, rng):
        return
    p = t.get('pattern')
    if p == 'sparkle':
        c.sparkle(torso, rng, t.get('pattern_n', 30), col(t.get('pattern_color'), '#fffbe8'))
    elif p == 'eagle':
        gold, red, blue = t.get('pattern_color', ['#d0a040', '#c03030', '#2a4ab0'])
        for k, cc in enumerate((gold, red, blue)):
            for i in range(7):
                c.px(37 + i + k * 0.0, 52 + i * 0.9 + k * 2, (cc, 4) if cc == gold else cc)
                c.px(59 - i, 52 + i * 0.9 + k * 2, (cc, 4) if cc == gold else cc)
        c.sparkle(torso, rng, 16, (gold, 5))
    elif p == 'studs':
        gold, red = t.get('pattern_color', ['#d0a040', '#c03030'])
        for i, y in enumerate(range(52, 76, 4)):
            for x in (36 + i * 0.6, 60 - i * 0.6):
                c.px(x, y, red); c.px(x + 1, y + 1, (gold, 5)); c.px(x - 1, y + 1, (gold, 4))
        c.sparkle(torso, rng, 14, (gold, 5))


def cape(c, cp):
    outer, lining = col(cp.get('color'), '#efebe2'), col(cp.get('lining'), '#2a4a9a')
    c.shape(c.poly([(31, 49), (65, 49), (76, 120), (68, 124), (28, 124), (21, 118)]), lining, r=3, bias=-0.2)
    c.shape(c.poly([(32, 49), (64, 49), (73, 119), (66, 122), (30, 122), (24, 117)]), outer, r=5, bias=-0.1)
    if cp.get('eagle'):
        for t in np.linspace(0, 1, 7):
            c.px(66 + 5 * t, 100 + 14 * t, ('#c03030' if int(t * 6) % 2 else '#d0a040', 4))


def necklaces(c, colors):
    for k, cc in enumerate(colors):
        r = 6 + 2 * k
        for t in np.linspace(0.15, 0.85, 9 + k * 2):
            x = 48 - math.cos(t * math.pi) * (9 + k)
            y = 51 + math.sin(t * math.pi) * r
            c.px(x, y, (cc, 4)); c.px(x + 1, y, (cc, 2))


def earrings(c, colr, skin, cy=29):
    c.shape(c.ell(57, cy + 8, 2.2, 2.6), colr, r=1, spec=True)
    c.shape(c.ell(57, cy + 8, 1, 1.3), skin, r=1, lvl=2)


def hand(c, skin, x, y, r=3.4, bias=0.0):
    c.shape(c.ell(x, y, r, r * 1.05), skin, r=2, bias=bias)


# =============================================================== adereços
def vintage_mic(c, x=24, top=37, base_y=135):
    c.shape(c.ell(x, base_y, 8.5, 2.8), WOOD, r=2, spec=True)
    c.shape(c.ell(x, base_y - 1.2, 6.5, 1.8), WOOD, r=2, bias=0.15)
    c.shape(c.rect(x - 1, top + 9, x + 1, base_y - 1), BRASS, r=1, spec=True)
    c.shape(c.rect(x - 1.5, top + 22, x + 1.5, top + 25), BRASS, r=1, spec=True)
    c.shape(c.ell(x, top + 10, 2.2, 1.5), BRASS, r=1, spec=True)
    head_m = c.ell(x, top + 4, 4, 6.2)
    c.shape(head_m, '#4a4448', r=2, spec=True)
    for yy in range(top - 1, top + 10, 2):
        for xx in range(x - 3, x + 4):
            if head_m[yy + c.oy, xx]:
                c.px(xx, yy, ('#4a4448', 1))
    c.shape(c.rect(x - 4.4, top + 3, x + 4.4, top + 5), BRASS, r=1, spec=True)


def acoustic(c, p, cx=50, cy=80, ang=-35):
    f = Frame(cx, cy, ang)
    topc = col(p.get('top'), '#e0aa5c')
    side = col(p.get('side'), '#7a3a22')
    body = c.poly(f.ell(-4, 0, 11, 11.5)) | c.poly(f.ell(8, 0, 8, 8.8)) | c.poly(f.poly([(-4, -10), (8, -7), (8, 7), (-4, 10)]))
    edge = c.poly(f.ell(-4.6, 0.6, 11.6, 12.1)) | c.poly(f.ell(7.6, 0.6, 8.6, 9.4))
    c.shape(edge, side, r=2, bias=-0.1)
    c.shape(body, topc, r=5, spec=True)
    if p.get('binding'):
        inner = c.poly(f.ell(-4, 0, 10, 10.5)) | c.poly(f.ell(8, 0, 7, 7.8)) | c.poly(f.poly([(-4, -9), (8, -6), (8, 6), (-4, 9)]))
        ys, xs = np.nonzero(body & ~inner)
        for x, y in zip(xs, ys):
            c.pxa(x, y, (p['binding'], 3))
    c.shape(c.poly(f.ell(6, 0, 3.6, 3.6)), '#140c0c', r=1, lvl=0)
    c.shape(c.poly(f.poly([(1, 3), (8, 4.5), (6, 8.5), (0, 7)])), col(p.get('guard'), '#3a1a14'), r=1)
    c.shape(c.poly(f.poly([(-8, -5), (-6, -5), (-6, 5), (-8, 5)])), '#2a140e', r=1)
    c.shape(c.poly(f.poly([(15, -1.8), (43, -1.6), (43, 1.6), (15, 1.8)])), col(p.get('neck'), '#4a2416'), r=1, spec=True)
    c.shape(c.poly(f.poly([(43, -2.6), (50, -3), (50, 3), (43, 2.6)])), '#2a1610', r=2, spec=True)
    for v in (-1.5, 1.5):
        for u in (44.5, 46.5, 48.5):
            x, y = f.pt(u, v * 1.9)
            c.px(x, y, '#e0d8c8')
    for v in (-1, 0, 1):
        a = f.pt(-7, v * 1.2); b = f.pt(43, v * 0.9)
        c.line(a[0], a[1], b[0], b[1], (CHROME, 4))
    a = f.pt(14, -2)
    c.shape(c.cap([a, (60, 50)], 0.9), col(p.get('strap'), '#5a2a1c'), r=1)
    return f


def electric(c, p, cx=48, cy=80, ang=-32, lefty=False):
    f = Frame(cx, cy, ang)
    s = -1 if lefty else 1
    bc = col(p.get('body'), '#c83030')
    if p.get('shape') == 'lp':
        body = c.poly(f.ell(-1.5, 0, 10.5, 9.8)) | c.poly(f.ell(6, -4.5 * s, 4.6, 4.4))
        c.shape(body, bc, r=4, spec=True)
        c.shape(c.poly(f.poly([(1, 3 * s), (8, 2 * s), (7, 6 * s), (2, 7 * s)])), col(p.get('guard'), '#1a1418'), r=1)
        for u in (-3.5, 2.5):
            c.shape(c.poly(f.poly([(u - 1.4, -3.4), (u + 1.4, -3.4), (u + 1.4, 3.4), (u - 1.4, 3.4)])), col(p.get('pickups'), '#ece4d0'), r=1)
        for u, v in ((-6, 6 * s), (-3.5, 7 * s), (-7.5, 3.5 * s)):
            x, y = f.pt(u, v)
            c.px(x, y, ('#d0a040', 5))
    else:
        body = (c.poly(f.ell(-1, 0, 10.5, 9.5)) | c.poly(f.ell(7, -5.5 * s, 4.5, 3.4)) | c.poly(f.ell(5, 5.5 * s, 3.6, 3.2))
                | c.poly(f.poly([(-2, -8), (7, -8 * s), (9, -6 * s), (6, 0)])))
        c.shape(body, bc, r=4, spec=True)
        c.shape(c.poly(f.poly([(-6, 2 * s), (-4, -6 * s), (6, -6 * s), (8, 3 * s), (2, 7 * s), (-5, 6 * s)])), col(p.get('guard'), '#ece4d4'), r=1, bias=0.05)
        for u in (-2.5, 1, 4.5):
            c.shape(c.poly(f.poly([(u - 0.8, -3.2), (u + 0.8, -3.2), (u + 0.8, 3.2), (u - 0.8, 3.2)])), col(p.get('pickups'), '#f4f0e6'), r=1)
    c.shape(c.poly(f.poly([(-7, -3.5), (-5.5, -3.5), (-5.5, 3.5), (-7, 3.5)])), CHROME, r=1, spec=True)
    if p.get('shape') != 'lp':
        for u, v in ((-4, 5 * s), (-1.5, 6 * s)):
            x, y = f.pt(u, v)
            c.px(x, y, '#ffffff')
    nk = col(p.get('neck'), '#e0b070')
    c.shape(c.poly(f.poly([(9, -1.8), (37, -1.5), (37, 1.5), (9, 1.8)])), nk, r=1, spec=True)
    c.shape(c.poly(f.poly([(37, -2), (45, -3.6 * s), (46, -1 * s), (42, 2.2 * s), (37, 2)])), nk, r=2, spec=True)
    for u in range(12, 37, 3):
        x, y = f.pt(u, 0)
        c.px(x, y, (nk, 1))
    for v in (-1, 0, 1):
        a = f.pt(-6, v * 1.2); b = f.pt(37, v * 0.9)
        c.line(a[0], a[1], b[0], b[1], (CHROME, 4))
    a = f.pt(10, 2 * s)
    c.shape(c.cap([a, (38 if lefty else 60, 50)], 0.9), col(p.get('strap'), '#3a2418'), r=1)
    return f


def trumpet(c, cx=38, cy=70, ang=145):
    f = Frame(cx, cy, ang)
    c.shape(c.poly(f.poly([(0, -1.3), (22, -1.1), (22, 1.1), (0, 1.3)])), BRASS, r=1, spec=True)
    c.shape(c.poly(f.poly([(18, -1.5), (27, -5.5), (27.5, 5.5), (18, 1.5)])), BRASS, r=2, spec=True)
    c.shape(c.poly(f.ell(27.5, 0, 1.5, 5.6)), '#7a4e1c', r=1, spec=True)
    c.shape(c.poly(f.poly([(2, 1.2), (14, 1.2), (14, 4.6), (2, 4.6)])), BRASS, r=2, spec=True)
    for u in (5, 8, 11):
        c.shape(c.poly(f.poly([(u - 0.8, -4.2), (u + 0.8, -4.2), (u + 0.8, -1), (u - 0.8, -1)])), '#d8b060', r=1, spec=True)
    c.shape(c.poly(f.poly([(-4, -0.8), (0, -0.8), (0, 0.8), (-4, 0.8)])), CHROME, r=1)


def hand_mic(c, x, y, ang=-115):
    f = Frame(x, y, ang)
    c.shape(c.poly(f.poly([(0, -1.4), (9, -1.8), (9, 1.8), (0, 1.4)])), '#2a2830', r=1, spec=True)
    c.shape(c.poly(f.ell(11, 0, 3.2, 3.2)), CHROME, r=2, spec=True)
    for u, v in ((10, -1), (12, 1), (11, 0), (10, 1), (12, -1)):
        x2, y2 = f.pt(u, v)
        c.px(x2, y2, (CHROME, 2))


def bottomless_stand(c, x=26, y=19):
    f = Frame(x, y, -70)
    c.shape(c.poly(f.poly([(-16, -1), (22, -1), (22, 1), (-16, 1)])), CHROME, r=1, spec=True)
    c.shape(c.poly(f.ell(-17, 0, 2.2, 2)), '#2a2228', r=1)
    c.shape(c.poly(f.ell(23.5, 0, 3, 2.4)), '#2a2228', r=2, spec=True)


def handkerchief(c, x=64, y=84):
    c.shape(c.poly([(x - 2, y), (x + 4, y - 1), (x + 6, y + 12), (x + 2, y + 14), (x - 1, y + 10)]), '#f4f0e8', r=3)
    c.line(x + 2, y + 2, x + 3, y + 11, ('#f4f0e8', 2))


def bangles(c, x, y, colors, ang=0):
    for i, bc in enumerate(colors):
        c.shape(c.ell(x - i * 0.5, y + i * 3, 3.6, 1.3, ang=ang), bc, r=1, spec=True)
