"""Mini motor de pixel art: formas com sombreamento por 'inflar' a máscara, rampas de cor com
sombra arroxeada e luz quente, contorno escuro na silhueta e linhas internas entre camadas.
Luz vem de cima à esquerda, como no pacote de assets."""
import numpy as np
from PIL import Image, ImageDraw

OUTLINE = (23, 14, 18)
SH_TINT = [(58, 32, 80), (42, 24, 56), (28, 16, 36)]
HI_TINT = [(255, 240, 200), (255, 251, 232)]
LIGHT = np.array([-0.5, -0.72, 0.62])
LIGHT = LIGHT / np.linalg.norm(LIGHT)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))


def ramp(base):
    b = hexrgb(base) if isinstance(base, str) else base
    mul = lambda c, m: tuple(min(255, int(x * m)) for x in c)
    return [
        mix(mul(b, 0.40), SH_TINT[2], 0.32),
        mix(mul(b, 0.60), SH_TINT[1], 0.22),
        mix(mul(b, 0.80), SH_TINT[0], 0.12),
        b,
        mix(b, HI_TINT[0], 0.24),
        mix(b, HI_TINT[1], 0.55),
    ]


class Canvas:
    def __init__(self, w=96, h=152, oy=8):
        """oy: folga no topo para chapéus altos. Coordenadas de desenho são 'lógicas' (y lógico = y real - oy)."""
        self.w, self.h, self.oy = w, h, oy
        self.mat = np.full((h, w), -1, int)
        self.lvl = np.zeros((h, w), int)
        self.sid = np.full((h, w), -1, int)
        self.grp = np.full((h, w), -1, int)
        self.rawc = np.zeros((h, w, 3), np.uint8)
        self.raw = np.zeros((h, w), bool)
        self.ramps = []
        self.cache = {}
        self.lines = []  # por shape: desenha linha interna?
        self.yy, self.xx = np.mgrid[0:h, 0:w]
        self.yy = self.yy + 0.5 - oy
        self.xx = self.xx + 0.5

    # ---------- materiais ----------
    def m(self, hexc):
        if hexc not in self.cache:
            self.cache[hexc] = len(self.ramps)
            self.ramps.append(ramp(hexc))
        return self.cache[hexc]

    # ---------- máscaras ----------
    def ell(self, cx, cy, rx, ry, ang=0.0):
        x, y = self.xx - cx, self.yy - cy
        if ang:
            ca, sa = np.cos(np.radians(ang)), np.sin(np.radians(ang))
            x, y = x * ca + y * sa, -x * sa + y * ca
        return (x / rx) ** 2 + (y / ry) ** 2 <= 1.0

    def poly(self, pts):
        im = Image.new('L', (self.w, self.h), 0)
        ImageDraw.Draw(im).polygon([(float(a), float(b) + self.oy) for a, b in pts], fill=1, outline=1)
        return np.array(im).astype(bool)

    def cap(self, pts, r0, r1=None):
        """Cadeia de cápsulas (membro): pts = [(x,y),...], raio interpolado de r0 a r1."""
        r1 = r0 if r1 is None else r1
        out = np.zeros((self.h, self.w), bool)
        n = len(pts) - 1
        for i in range(n):
            (ax, ay), (bx, by) = pts[i], pts[i + 1]
            ra = r0 + (r1 - r0) * i / n
            rb = r0 + (r1 - r0) * (i + 1) / n
            dx, dy = bx - ax, by - ay
            L2 = dx * dx + dy * dy or 1e-6
            t = np.clip(((self.xx - ax) * dx + (self.yy - ay) * dy) / L2, 0, 1)
            px, py = ax + t * dx, ay + t * dy
            d = np.hypot(self.xx - px, self.yy - py)
            out |= d <= ra + (rb - ra) * t
        return out

    def rect(self, x0, y0, x1, y1):
        return (self.xx >= x0) & (self.xx < x1) & (self.yy >= y0) & (self.yy < y1)

    # ---------- formas ----------
    def _height(self, mask, r):
        d = np.zeros(mask.shape, float)
        cur = mask.copy()
        for i in range(1, r + 1):
            d[cur] = i
            p = np.pad(cur, 1)
            e = p[1:-1, 1:-1] & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
            if i % 2 == 0:
                e &= p[:-2, :-2] & p[2:, 2:] & p[:-2, 2:] & p[2:, :-2]
            cur = e
            if not cur.any():
                break
        t = np.clip(d / r, 0, 1)
        h = r * np.sqrt(1 - (1 - t) ** 2)
        p = np.pad(h, 1, mode='edge')
        h = (4 * p[1:-1, 1:-1] + p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 8
        return np.where(mask, h, 0)

    def shape(self, mask, col, r=4, bias=0.0, spec=False, group=None, shadow=True, line=True, lvl=None, flat=False):
        mask = mask & True
        if not mask.any():
            return mask
        mi = self.m(col)
        sid = len(self.lines)
        self.lines.append(line)
        if lvl is not None:
            L = np.full(mask.shape, lvl)
        else:
            if flat:
                lam = np.full(mask.shape, 0.57)
            else:
                h = self._height(mask, r)
                gy, gx = np.gradient(h)
                n = np.stack([-gx, -gy, np.ones_like(h)], -1)
                n /= np.linalg.norm(n, axis=-1, keepdims=True)
                lam = n @ LIGHT
            lam = lam + bias
            L = np.select([lam < -0.1, lam < 0.25, lam < 0.48, lam < 0.74, lam < 0.92], [0, 1, 2, 3, 4], 5)
            if not spec:
                L = np.minimum(L, 4)
        if shadow:
            sh = np.zeros_like(mask)
            sh[2:, 1:] = mask[:-2, :-1]
            sh &= ~mask & (self.sid >= 0)
            self.lvl[sh] = np.maximum(self.lvl[sh] - 1, 0)
        self.mat[mask] = mi
        self.lvl[mask] = L[mask]
        self.sid[mask] = sid
        self.grp[mask] = sid if group is None else group
        self.raw[mask] = False
        return mask

    # ---------- detalhes pixel a pixel ----------
    def px(self, x, y, c):
        self.pxa(int(x), int(y) + self.oy, c)

    def pxa(self, x, y, c):
        """Pixel em coordenada absoluta do buffer."""
        if 0 <= x < self.w and 0 <= y < self.h:
            if isinstance(c, tuple) and len(c) == 2 and isinstance(c[0], str):
                self.mat[y, x] = self.m(c[0]); self.lvl[y, x] = c[1]; self.raw[y, x] = False
                if self.sid[y, x] < 0:
                    self.sid[y, x] = len(self.lines); self.lines.append(False)
            else:
                self.rawc[y, x] = hexrgb(c) if isinstance(c, str) else c
                self.raw[y, x] = True
                if self.sid[y, x] < 0:
                    self.sid[y, x] = len(self.lines); self.lines.append(False)

    def line(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.px(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def shade_mask(self, mask, delta):
        """Escurece/clareia o que já está desenhado dentro da máscara (sombras projetadas)."""
        k = mask & (self.mat >= 0) & ~self.raw
        self.lvl[k] = np.clip(self.lvl[k] + delta, 0, 5)

    def sparkle(self, mask, rng, n, col='#fffbe8'):
        ys, xs = np.nonzero(mask & (self.mat >= 0))
        if len(xs) == 0:
            return
        for i in rng.choice(len(xs), size=min(n, len(xs)), replace=False):
            self.pxa(xs[i], ys[i], col)

    def texture(self, mask, rng, n, col, levels=(1, 2, 3)):
        """Pontilhado de textura (cabelo crespo, tecido) com níveis aleatórios do material."""
        ys, xs = np.nonzero(mask & (self.mat >= 0))
        if len(xs) == 0:
            return
        for i in rng.choice(len(xs), size=min(n, len(xs)), replace=False):
            self.pxa(xs[i], ys[i], (col, int(rng.choice(levels))))

    # ---------- render ----------
    def render(self, scale=6):
        h, w = self.h, self.w
        img = np.zeros((h, w, 4), np.uint8)
        lvl = self.lvl.copy()
        # linhas internas: o pixel de baixo de uma borda com camada posterior vira o tom mais escuro
        opaque = self.mat >= 0
        linef = np.array(self.lines + [False])
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb_sid = np.full((h, w), -1); nb_grp = np.full((h, w), -2)
            ys = slice(max(dy, 0), h + min(dy, 0)); yd = slice(max(-dy, 0), h + min(-dy, 0))
            xs = slice(max(dx, 0), w + min(dx, 0)); xd = slice(max(-dx, 0), w + min(-dx, 0))
            nb_sid[yd, xd] = self.sid[ys, xs]
            nb_grp[yd, xd] = self.grp[ys, xs]
            cond = opaque & (nb_sid > self.sid) & (nb_grp != self.grp) & linef[np.clip(nb_sid, 0, None)] & (nb_sid >= 0)
            lvl[cond] = 0
        for mi, rp in enumerate(self.ramps):
            arr = np.array(rp, np.uint8)
            k = self.mat == mi
            img[k, :3] = arr[lvl[k]]
            img[k, 3] = 255
        img[self.raw, :3] = self.rawc[self.raw]
        img[self.raw, 3] = 255
        a = img[..., 3] > 0
        p = np.pad(a, 1)
        dil = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
        ol = dil & ~a
        img[ol] = (*OUTLINE, 255)
        im = Image.fromarray(img, 'RGBA')
        return im.resize((w * scale, h * scale), Image.NEAREST) if scale != 1 else im
