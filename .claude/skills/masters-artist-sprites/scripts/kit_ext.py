"""Extensão do catálogo: cabelos e roupas adicionais + estampas. Mesma grade de kit.py (cabeça em 47,29)."""
import math
import numpy as np

INK = '#141016'


def _col(v, d):
    from kit import col
    return col(v, d)


def _bumpy(c, cx, cy, rx, ry, n=14, r=2.6, ang0=0.0):
    m = c.ell(cx, cy, rx, ry)
    for t in np.linspace(0, 2 * math.pi, n, endpoint=False):
        m |= c.ell(cx + rx * math.cos(t + ang0), cy + ry * math.sin(t + ang0), r, r)
    return m


def _cap(c, cx, low=26):
    """Calota básica de cabelo curto (deixa testa e olhos livres)."""
    return c.poly([(cx - 10.5, low), (cx - 10, 17), (cx - 4, 13), (cx + 5, 13), (cx + 10, 17), (cx + 11.5, 27), (cx + 9, 31),
                   (cx + 8, 23), (cx + 1, 19.5), (cx - 7, 20.5)])


def _strand(c, x0, y0, x1, y1, r, colr, wig=0.0, spec=True, bias=0.0):
    mx, my = (x0 + x1) / 2 + wig, (y0 + y1) / 2
    c.shape(c.cap([(x0, y0), (mx, my), (x1, y1)], r, r * 0.8), colr, r=2, spec=spec, bias=bias)


# ------------------------------------------------------------------ cabelo: parte de trás
def back(c, st, colr, k, rng, cx=47):
    if st == 'dreads':
        L = 46 + 20 * (k - 1)
        for i in range(9):
            x0 = cx - 6 + i * 2.4
            _strand(c, x0, 20, x0 + 4 + i * 0.9, L + (i % 3) * 3, 1.8, colr, wig=1.5 * ((i % 2) * 2 - 1), bias=-0.15)
        return True
    if st == 'curly':
        m = _bumpy(c, cx + 2, 25, 13.5 * k, 12.5 * k, n=16, r=2.8)
        c.shape(m, colr, r=5)
        c.texture(m, rng, 60, colr, (1, 2, 4))
        return True
    if st == 'wavy_long':
        m = c.poly([(cx - 11, 22), (cx + 11, 20), (cx + 15, 36), (cx + 15, 50 * k), (cx + 6, 53 * k), (cx + 4, 30), (cx - 8, 30),
                    (cx - 11, 46 * k), (cx - 15, 42)])
        c.shape(m, colr, r=4, spec=True)
        for y in range(30, int(50 * k), 5):
            c.line(cx + 6, y, cx + 13, y + 2, (colr, 1)); c.line(cx - 13, y, cx - 10, y + 2, (colr, 1))
        return True
    if st == 'ponytail':
        _strand(c, cx + 9, 21, cx + 14, 46, 2.8, colr, wig=3)
        return True
    if st == 'bun':
        c.shape(c.ell(cx + 6, 12, 5.5, 5), colr, r=3, spec=True)
        return True
    if st == 'bouffant':
        m = c.ell(cx + 1, 20, 15 * k, 12 * k) | c.poly([(cx - 13, 22), (cx + 14, 22), (cx + 13, 40), (cx - 12, 38)])
        c.shape(m, colr, r=6, spec=True)
        return True
    if st == 'mullet':
        c.shape(c.poly([(cx + 4, 22), (cx + 11, 21), (cx + 14, 46), (cx + 6, 48), (cx + 5, 34)]), colr, r=3, spec=True)
        return True
    if st == 'braids':
        for i in range(8):
            x0 = cx - 5 + i * 2.4
            _strand(c, x0, 20, x0 + 3 + i * 0.8, 50 + (i % 2) * 4, 1.4, colr, bias=-0.1)
        return True
    if st == 'long_fringe':
        m = c.poly([(cx - 12, 22), (cx + 11, 20), (cx + 16, 36), (cx + 16, 58 * k), (cx + 5, 60 * k), (cx + 4, 30), (cx - 8, 30),
                    (cx - 12, 52 * k), (cx - 15, 46)])
        c.shape(m, colr, r=4, spec=True)
        return True
    return False


# ------------------------------------------------------------------ cabelo: parte da frente
def front(c, st, colr, k, rng, cx=47):
    if st == 'dreads':
        c.shape(_cap(c, cx), colr, r=3)
        for i, x in enumerate((cx - 9, cx - 5, cx - 1, cx + 3, cx + 7)):
            c.shape(c.ell(x, 17.5 + (i % 2), 2.2, 2.4), colr, r=2, spec=True)
        for i in range(3):
            _strand(c, cx - 10.5 - i * 1.6, 22, cx - 11.5 - i * 2.2, 40 + i * 5 * k, 1.6, colr, wig=-1)
        for i in range(2):
            _strand(c, cx + 9 + i * 2.2, 22, cx + 11 + i * 2.6, 40 + i * 4 * k, 1.6, colr, wig=1)
        return True
    if st == 'flattop':
        m = c.poly([(cx - 10.5, 26), (cx - 11.5, 9), (cx + 11.5, 8), (cx + 12, 26), (cx + 9.5, 31), (cx + 8, 22), (cx - 6, 20)])
        m |= c.ell(cx - 7, 9, 4, 2.5)
        c.shape(m, colr, r=4)
        c.texture(m, rng, 35, colr, (1, 2, 3, 4))
        return True
    if st == 'curly':
        m = _cap(c, cx) | c.poly([(cx - 12, 22), (cx - 9, 13), (cx, 10), (cx + 9, 12), (cx + 13, 20), (cx + 13, 30), (cx + 9, 30)])
        for x in range(int(cx - 10), int(cx + 9), 3):
            m |= c.ell(x, 19 + ((x * 5) % 3) * 0.6, 2.2, 2.2)
        c.shape(m, colr, r=3)
        c.texture(m, rng, 40, colr, (1, 2, 4, 5))
        c.shape(c.poly([(cx - 12, 22), (cx - 9.5, 22), (cx - 10.5, 33), (cx - 12.5, 32)]), colr, r=1)
        return True
    if st == 'wavy_long':
        m = _cap(c, cx) | c.poly([(cx - 11, 20), (cx - 2, 15), (cx - 6, 22), (cx - 10.5, 25)])
        c.shape(m, colr, r=3, spec=True)
        c.shape(c.poly([(cx + 7, 22), (cx + 12, 22), (cx + 13, 44 * k), (cx + 9, 46 * k), (cx + 8, 30)]), colr, r=2, spec=True)
        c.shape(c.poly([(cx - 11.5, 22), (cx - 9.5, 22), (cx - 10.5, 38), (cx - 13, 40)]), colr, r=1, spec=True)
        for (a, b) in (((cx - 8, 17), (cx - 2, 15)), ((cx + 2, 16), (cx + 8, 18))):
            c.line(a[0], a[1], b[0], b[1], (colr, 5))
        return True
    if st == 'mohawk':
        side = _cap(c, cx)
        ys, xs = np.nonzero(side)
        for x, y in zip(xs, ys):
            if (x + y) % 2 == 0:
                c.pxa(x, y, (colr, 2))
        c.shape(c.poly([(cx - 5, 18), (cx - 3, 3), (cx + 2, 1), (cx + 7, 5), (cx + 9, 14), (cx + 6, 19)]), colr, r=3, spec=True)
        return True
    if st == 'spiky':
        m = _cap(c, cx)
        for i, x in enumerate(range(int(cx - 10), int(cx + 11), 4)):
            m |= c.poly([(x - 2.5, 17), (x + 0.5 - (i % 2), 7 + (i % 2) * 2), (x + 2.5, 16)])
        c.shape(m, colr, r=2, spec=True)
        return True
    if st in ('ponytail', 'bun'):
        c.shape(_cap(c, cx) | c.poly([(cx - 10.5, 20), (cx - 3, 15), (cx - 8, 22)]), colr, r=3, spec=True)
        for x0 in (cx - 6, cx - 1, cx + 4):
            c.line(x0, 16, x0 + 5, 15, (colr, 5))
        return True
    if st == 'bouffant':
        m = c.poly([(cx - 11.5, 26), (cx - 12, 14), (cx - 4, 8), (cx + 7, 8), (cx + 13, 15), (cx + 13, 30), (cx + 9, 32), (cx + 8, 22), (cx - 6, 20)])
        c.shape(m, colr, r=5, spec=True)
        c.shape(c.poly([(cx - 12, 22), (cx - 9.5, 22), (cx - 10.5, 34), (cx - 13, 34)]), colr, r=1, spec=True)
        return True
    if st == 'mullet':
        m = _cap(c, cx) | c.poly([(cx - 11, 20), (cx - 2, 15), (cx - 6, 22), (cx - 10.5, 25)])
        c.shape(m, colr, r=3, spec=True)
        return True
    if st == 'pixie':
        m = _cap(c, cx) | c.poly([(cx - 11, 22), (cx - 6, 15), (cx + 4, 15), (cx - 3, 20), (cx - 9, 25.5)])
        c.shape(m, colr, r=3, spec=True)
        c.line(cx - 7, 18, cx + 2, 16, (colr, 5))
        return True
    if st == 'buzz':
        m = _cap(c, cx, low=24)
        ys, xs = np.nonzero(m)
        for x, y in zip(xs, ys):
            if (x + y) % 2 == 0 or y < 15 + c.oy:
                c.pxa(x, y, (colr, 2 if x > cx + 2 else 3))
        return True
    if st == 'braids':
        m = _cap(c, cx)
        c.shape(m, colr, r=3)
        for x0 in range(int(cx - 8), int(cx + 9), 3):
            c.line(x0, 14, x0 - 2, 21, (colr, 1))
        for i in range(2):
            _strand(c, cx - 10.5 - i * 1.6, 22, cx - 11.5 - i * 2, 42 + i * 4, 1.3, colr)
        return True
    if st in ('bowl', 'fringe'):
        m = c.poly([(cx - 11.5, 26), (cx - 11, 15), (cx - 4, 11), (cx + 6, 11), (cx + 12, 17), (cx + 12.5, 31), (cx + 9.5, 33),
                    (cx + 8.5, 26), (cx + 7, 26), (cx + 6, 24)]) if st == 'bowl' else \
            _cap(c, cx) | c.poly([(cx - 11, 20), (cx - 2, 15), (cx + 6, 18), (cx + 4, 24), (cx - 10, 25)])
        c.shape(m, colr, r=4, spec=True)
        for x in range(int(cx - 10), int(cx + 6), 2):
            c.px(x, 25, (colr, 1))
        return True
    if st == 'long_fringe':
        m = _cap(c, cx) | c.poly([(cx - 11, 19), (cx + 6, 17), (cx + 5, 24), (cx - 3, 23.5), (cx - 10.5, 24.5)])
        c.shape(m, colr, r=3, spec=True)
        for x in range(int(cx - 9), int(cx + 5), 3):
            c.line(x, 18, x - 1, 23, (colr, 2))
        c.shape(c.poly([(cx + 7, 22), (cx + 12, 21), (cx + 15, 56 * k), (cx + 9, 58 * k), (cx + 8, 30)]), colr, r=2, spec=True)
        c.shape(c.poly([(cx - 11.5, 22), (cx - 9.5, 22), (cx - 9.5, 50 * k), (cx - 14, 52 * k)]), colr, r=1, spec=True)
        return True
    return False


LONGISH = {'long', 'curls_long', 'afro', 'bob', 'dreads', 'curly', 'wavy_long', 'braids', 'bouffant', 'long_fringe', 'mullet', 'ponytail'}


# ------------------------------------------------------------------ roupas extras
TOPS = {'tank', 'turtleneck', 'shirt', 'open_shirt', 'denim_jacket', 'leather_jacket', 'hoodie', 'tunic', 'vest', 'tracksuit', 'blouse', 'gown'}


def top(c, t, build, skin, rng, torso_shape, pattern):
    st = t.get('style')
    tc = _col(t.get('color'), '#5a6a8a')
    shirt = _col(t.get('shirt'), '#ece4d4')
    spec = t.get('shiny', False)
    from kit import BUILDS, CHROME, G_TORSO
    sh, wa, _ = BUILDS[build]
    if st == 'tank':
        c.shape(torso_shape(c, build), skin, r=7, group=G_TORSO)
        m = c.poly([(40, 47), (44, 47), (45, 52), (51, 52), (52, 47), (56, 47), (48 + sh - 2, 70), (48 + wa + 1, 89), (48 - wa - 1, 89), (48 - sh + 3, 70)])
        c.shape(m, tc, r=5, spec=spec)
        pattern(c, t, m, rng)
        return True
    torso = torso_shape(c, build, long=st in ('tunic',))
    if st == 'turtleneck':
        c.shape(torso, tc, r=7, group=G_TORSO, spec=spec)
        c.shape(c.rect(42.5, 40, 53.5, 49), tc, r=3, bias=-0.1)
        for x in range(43, 53, 2):
            c.line(x, 41, x, 47, (tc, 2))
        pattern(c, t, torso, rng)
        return True
    c.shape(torso, tc, r=7, group=G_TORSO, spec=spec)
    if st == 'shirt':
        pattern(c, t, torso, rng)
        c.shape(c.poly([(43, 46), (53, 46), (50, 51), (46, 51)]), skin, r=2, bias=-0.1)
        c.shape(c.poly([(42, 45), (37, 49), (42, 51), (46, 50)]), tc, r=1, bias=0.2)
        c.shape(c.poly([(54, 45), (59, 49), (54, 51), (50, 50)]), tc, r=1, bias=0.05)
        for y in range(54, 88, 6):
            c.px(48, y, (tc, 1)); c.px(49, y, (tc, 4))
        c.line(48, 52, 48, 88, (tc, 2))
        return True
    if st == 'open_shirt':
        pattern(c, t, torso, rng)
        c.shape(c.poly([(43, 46), (53, 46), (51, 58), (48, 66), (45, 58)]), skin, r=2, bias=-0.1)
        c.shape(c.poly([(43, 45), (34, 52), (40, 55), (46, 50)]), tc, r=1, bias=0.2)
        c.shape(c.poly([(53, 45), (62, 52), (56, 55), (50, 50)]), tc, r=1, bias=0.05)
        if t.get('chain'):
            for x in range(44, 53):
                c.px(x, 52 + abs(x - 48) * -0.5 + 3, (t['chain'], 4))
        return True
    if st in ('denim_jacket', 'leather_jacket'):
        inner = _col(t.get('shirt'), '#ece4d4' if st == 'denim_jacket' else '#2a2830')
        c.shape(c.poly([(43, 46), (53, 46), (52, 60), (48, 64), (44, 60)]), inner, r=2)
        c.shape(c.poly([(42, 45), (36, 50), (41, 60), (48, 66), (44, 52)]), tc, r=2, bias=0.15, group=G_TORSO, spec=spec)
        c.shape(c.poly([(54, 45), (60, 50), (55, 60), (48, 66), (52, 52)]), tc, r=2, bias=-0.05, group=G_TORSO, spec=spec)
        if st == 'denim_jacket':
            for x0 in (37, 53):
                c.line(x0, 60, x0 + 7, 60, (tc, 1)); c.line(x0, 66, x0 + 7, 66, (tc, 4))
                c.px(x0 + 3, 62, ('#d0a040', 4))
            c.line(35, 82, 61, 82, (tc, 1))
            for y in (70, 76):
                c.px(47, y, ('#d0a040', 4))
        else:
            c.line(50, 66, 46, 88, (CHROME, 4))
            c.line(37, 63, 43, 63, (CHROME, 3))
        pattern(c, t, torso, rng)
        return True
    if st == 'hoodie':
        c.shape(c.poly([(39, 48), (42, 40), (54, 40), (58, 48), (48, 52)]), tc, r=3, bias=-0.15)
        c.shape(c.poly([(43, 47), (53, 47), (48, 52)]), skin, r=2, bias=-0.1)
        c.line(46, 51, 45, 60, ('#e8e4dc', 4)); c.line(50, 51, 51, 60, ('#e8e4dc', 4))
        c.shape(c.poly([(39, 72), (57, 72), (59, 84), (37, 84)]), tc, r=2, bias=-0.05)
        pattern(c, t, torso, rng)
        return True
    if st == 'tunic':
        pattern(c, t, torso, rng)
        trim = _col(t.get('trim'), '#d0a040')
        c.shape(c.poly([(44, 46), (52, 46), (48, 60)]), skin, r=2, bias=-0.1)
        c.line(44, 46, 48, 60, (trim, 4)); c.line(52, 46, 48, 60, (trim, 3))
        c.line(35, 103, 61, 103, (trim, 3))
        return True
    if st == 'vest':
        c.shape(torso, shirt, r=7, group=G_TORSO)
        c.shape(c.poly([(43, 46), (53, 46), (50, 51), (46, 51)]), skin, r=2, bias=-0.1)
        v = c.poly([(38, 49), (45, 48), (47, 74), (46, 88), (36, 88), (35, 70)]) | c.poly([(51, 48), (58, 49), (61, 70), (60, 88), (50, 88), (49, 74)])
        c.shape(v, tc, r=4, spec=spec)
        pattern(c, t, v, rng)
        for y in (60, 67, 74, 81):
            c.px(46, y, ('#d0a040', 4))
        return True
    if st == 'tracksuit':
        pattern(c, t, torso, rng)
        c.shape(c.rect(43, 40, 53, 48), tc, r=3, bias=-0.1)
        c.line(48, 44, 48, 88, (CHROME, 4))
        s = _col(t.get('stripe'), '#f4f2ee')
        c.line(48 - sh + 1, 52, 48 - sh + 3, 86, (s, 3)); c.line(48 + sh - 1, 52, 48 + sh - 3, 86, (s, 2))
        return True
    if st == 'blouse':
        pattern(c, t, torso, rng)
        c.shape(c.ell(48, 49, 6, 3.5), skin, r=2, bias=-0.1)
        for x in range(42, 55, 2):
            c.px(x, 53, (tc, 4))
        return True
    if st == 'gown':
        pattern(c, t, torso, rng)
        c.shape(c.poly([(41, 47), (55, 47), (48, 57)]), skin, r=2, bias=-0.1)
        c.sparkle(torso, rng, 25, (tc, 5))
        return True
    if st == 'fringe_jacket':
        return False
    return False


def pattern(c, t, mask, rng):
    p = t.get('pattern')
    pc = t.get('pattern_color')
    if p in (None, 'sparkle', 'studs', 'eagle'):
        return False
    ys, xs = np.nonzero(mask)
    cols = pc if isinstance(pc, list) else [pc or '#f0c030', '#d4363a', '#2f9a5a']
    if p == 'floral':
        for _ in range(max(6, len(xs) // 55)):
            i = rng.integers(len(xs)); x, y = xs[i], ys[i]
            cc = cols[int(rng.integers(len(cols)))]
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                if 0 <= y + dy < c.h and 0 <= x + dx < c.w and mask[y + dy, x + dx]:
                    c.pxa(x + dx, y + dy, (cc, 4))
            c.pxa(x, y, ('#f6e6a0', 4))
    elif p == 'african':
        for x, y in zip(xs, ys):
            row = (y // 4) % len(cols)
            if (x + (y % 4) * ((-1) ** (y // 4))) % 4 == 0 or y % 4 == 0:
                c.pxa(x, y, (cols[row], 3 if x < 48 else 2))
    elif p == 'stripes_h':
        for x, y in zip(xs, ys):
            if y % 4 == 0:
                c.pxa(x, y, (cols[(y // 4) % len(cols)], 3 if x < 50 else 2))
    elif p == 'stripes_v':
        for x, y in zip(xs, ys):
            if x % 4 == 0:
                c.pxa(x, y, (cols[0], 3 if x < 50 else 2))
    elif p == 'checks':
        for x, y in zip(xs, ys):
            if (x // 3 + y // 3) % 2 == 0:
                c.pxa(x, y, (cols[0], 2 if x > 50 else 3))
    elif p == 'polka':
        for x, y in zip(xs, ys):
            if x % 5 == 0 and y % 5 == (x // 5 % 2) * 2:
                c.pxa(x, y, (cols[0], 4))
    elif p == 'rasta':
        bands = pc if isinstance(pc, list) else ['#c8282c', '#f0c030', '#2f8a4a']
        top_, bot = ys.min(), ys.max()
        for x, y in zip(xs, ys):
            k = int((y - top_) / max(1, (bot - top_ + 1)) * 3)
            c.pxa(x, y, (bands[min(k, 2)], 3 if x < 50 else 2))
    return True
