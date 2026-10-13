"""Monta um sprite a partir de uma ficha (dict/JSON). Ordem de camadas fixa — é ela que dá a leitura de volume."""
import numpy as np
from px import Canvas
import kit
import kit_ext
import kit_more
from kit import col, hand

# braços: caminho ombro→cotovelo→ponta, mão, camada
FRONT = {
    'hang':        dict(path=[(34, 52), (32, 68), (33, 81)], hand=(33.5, 84)),
    'mic_stand':   dict(path=[(34, 52), (31, 68), (26, 60)], hand=(24.5, 58.5), cuff=((27.5, 62.5), (26, 60))),
    'hand_mic':    dict(path=[(34, 52), (29, 66), (34, 50)], hand=(35.5, 48.5)),
    'strum':       dict(path=[(34, 52), (31, 70), (45, 77)], hand=(47, 77)),
    'fret_left':   dict(path=[(34, 52), (27, 64), (21, 61)], hand='fret_left'),
    'trumpet':     dict(path=[(34, 53), (32, 68), (38, 72)], hand=(39, 71)),
    'raise_stand': dict(path=[(34, 52), (27, 38), (27, 21)], hand=(26.5, 19.5)),
    'hat_tip':     dict(path=[(36, 52), (24, 40), (31, 22)], hand=(31.5, 20.5), after_hat=True),
    'raise_hand':  dict(path=[(35, 56), (27, 45), (30, 30)], hand=(31, 28)),
    'sax':         dict(path=[(34, 52), (38, 66), (45, 62)], hand=(46, 62)),
    'violin':      dict(path=[(34, 52), (26, 60), (21, 55)], hand=(20.5, 55.5)),
    'squeeze':     dict(path=[(34, 52), (31, 64), (37, 70)], hand=(37.5, 71)),
    'stick':       dict(path=[(34, 52), (31, 68), (38, 73)], hand=(39, 73)),
    'keys':        dict(path=[(34, 52), (32, 68), (40, 75)], hand=(41, 75)),
    'flute':       dict(path=[(34, 52), (30, 46), (37, 40)], hand=(37.5, 39.5)),
    'pan':         dict(path=[(34, 52), (32, 62), (37, 46)], hand=(37.5, 45.5)),
    'slide':       dict(path=[(34, 52), (26, 60), (20, 53)], hand=(19.5, 53.5)),
    'cello_neck':  dict(path=[(34, 52), (28, 64), (31, 60)], hand=(31, 60)),
}
BACK = {
    'hang':         dict(path=[(62, 51), (64, 67), (62, 80)], hand=(62, 83), behind=True),
    'pocket':       dict(path=[(62, 51), (64, 67), (61.5, 82)], hand=None, behind=True),
    'hip':          dict(path=[(62, 52), (71, 64), (63, 78)], hand=(62, 79), behind=True),
    'out':          dict(path=[(62, 51), (72, 60), (82, 55)], hand=(85.5, 53.5), behind=True),
    'fret':         dict(path=[(62, 51), (68, 64), (72, 56)], hand='fret', behind=True),
    'strum_left':   dict(path=[(62, 52), (63, 70), (54, 80)], hand=(52, 81), behind=False),
    'handkerchief': dict(path=[(62, 51), (66, 67), (64, 80)], hand=(64, 82), behind=True, kerchief=True),
    'sax':          dict(path=[(62, 51), (58, 68), (49, 73)], hand=(48, 73), behind=False),
    'bow':          dict(path=[(62, 51), (64, 66), (57, 70)], hand=(56, 70), behind=False),
    'squeeze':      dict(path=[(62, 51), (64, 64), (60, 70)], hand=(59.5, 71), behind=False),
    'stick':        dict(path=[(62, 51), (66, 66), (60, 74)], hand=(59, 75), behind=True),
    'keys':         dict(path=[(62, 51), (64, 66), (57, 72)], hand=(56, 72), behind=False),
    'flute':        dict(path=[(62, 51), (66, 52), (62, 44)], hand=(61.5, 43.5), behind=True),
    'slide_back':   dict(path=[(62, 51), (58, 60), (47, 42)], hand=(46, 42), behind=False),
    'bow_cello':    dict(path=[(62, 51), (62, 68), (48, 86)], hand=(48, 86), behind=False),
    'pluck':        dict(path=[(62, 51), (60, 70), (38, 92)], hand=(37, 92), behind=False),
}
POSES = {  # pose → (braço da frente, braço de trás)
    'stand': ('hang', 'hang'),
    'pocket': ('hang', 'pocket'),
    'hip': ('hang', 'hip'),
    'mic_stand': ('mic_stand', 'pocket'),
    'hand_mic': ('hand_mic', 'out'),
    'guitar': ('strum', 'fret'),
    'guitar_lefty': ('fret_left', 'strum_left'),
    'trumpet': ('trumpet', 'handkerchief'),
    'raise_stand': ('raise_stand', 'hip'),
    'hat_tip': ('hat_tip', 'hang'),
    'arm_up': ('raise_hand', 'hip'),
    'bass': ('strum', 'fret'),
    'sax': ('sax', 'sax'),
    'violin': ('violin', 'bow'),
    'accordion': ('squeeze', 'squeeze'),
    'drums': ('stick', 'stick'),
    'keytar': ('keys', 'keys'),
    'clarinet': ('sax', 'sax'),
    'flute': ('flute', 'flute'),
    'pan_flute': ('pan', 'hip'),
    'trombone': ('slide', 'slide_back'),
    'cello': ('cello_neck', 'bow_cello'),
    'upright_bass': ('cello_neck', 'pluck'),
    'pandeiro': ('raise_hand', 'hip'),
    'maracas': ('raise_hand', 'out'),
    'bandoneon': ('squeeze', 'squeeze'),
}


def _arm(c, a, sleeve, rad, shoulder, bias=0.0, spec=False, t=None, skin=None):
    t = t or {}
    path = list(a['path'])
    dx = shoulder - path[0][0]
    path[0] = (path[0][0] + dx, path[0][1])
    path[1] = (path[1][0] + dx * 0.5, path[1][1])
    if t.get('sleeves') == 'short':
        c.shape(c.cap(path, rad * 0.8, rad * 0.7), skin, r=4, bias=bias)
        mid = (path[0][0] * 0.45 + path[1][0] * 0.55, path[0][1] * 0.45 + path[1][1] * 0.55)
        c.shape(c.cap([path[0], mid], rad * 1.05), sleeve, r=3, bias=bias, spec=spec)
        return
    c.shape(c.cap(path, rad, rad * 0.85), sleeve, r=4, bias=bias, spec=spec)
    if t.get('sleeve_stripe'):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            c.line(x0 - 2, y0, x1 - 2, y1, (t['sleeve_stripe'], 3))
    if t.get('sleeve_fringe'):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            for s in np.linspace(0.15, 0.95, 6):
                x, y = x0 + (x1 - x0) * s + rad * 0.7, y0 + (y1 - y0) * s + rad * 0.5
                c.line(x, y, x + 1, y + 3, (sleeve, 2))


def build(spec):
    c = Canvas()
    rng = np.random.default_rng(spec.get('seed', 7))
    b = spec.get('body', {})
    female = b.get('sex') == 'f'
    build_ = b.get('build', 'female' if female else 'regular')
    sh, wa, rad = kit.BUILDS[build_]
    skin = col(b.get('skin'), kit.SKINS['claro'])
    hair = spec.get('hair', {})
    hair_col = col(hair.get('color'), kit.INK)
    hat = spec.get('hat', {})
    t = spec.get('top', {})
    bottom = spec.get('bottom', {})
    shoes = spec.get('shoes', {})
    prop = spec.get('prop', {})
    fa, ba = POSES[spec.get('pose', 'stand')]
    if 'front_arm' in spec:
        fa = spec['front_arm']
    if 'back_arm' in spec:
        ba = spec['back_arm']
    F, B = FRONT[fa], BACK[ba]
    bare = t.get('sleeves') == 'bare'
    sleeve = skin if bare else col(t.get('sleeve_color'), col(t.get('color'), '#33405e'))
    shiny = t.get('shiny', False)
    fsh, bsh = 48 - sh + 3, 48 + sh - 3
    arm_r = rad * (0.78 if bare else 1)
    if bottom.get('style') in ('skirt', 'shorts'):
        bottom.setdefault('skin', skin)

    if fa == 'mic_stand':
        kit.vintage_mic(c)
    kit.hair_back(c, hair, rng)
    if spec.get('cape'):
        kit.cape(c, spec['cape'])

    def back_arm():
        _arm(c, B, sleeve, arm_r * 0.92, bsh, bias=-0.15, spec=shiny, t=t, skin=skin)
        if t.get('style') == 'jumpsuit' and ba == 'out':
            c.shape(c.poly([(78, 51), (85, 47), (88, 58), (82, 60)]), sleeve, r=2, bias=-0.05)
        if spec.get('bangles_back'):
            kit.bangles(c, 67, 66, spec['bangles_back'])

    if B['behind']:
        back_arm()
        if B['hand'] and B['hand'] != 'fret':
            if spec.get('glove_back'):
                g = c.ell(B['hand'][0], B['hand'][1], 3.4, 3.6)
                c.shape(g, spec['glove_back'], r=2, spec=True)
                c.sparkle(g, rng, 4, '#bcc4d8')
            else:
                hand(c, skin, *B['hand'], 3.2, bias=-0.1)
        if B.get('kerchief'):
            kit.handkerchief(c)
    kit.legs(c, bottom, shoes, build_)
    c.shape(c.rect(43.5, 36, 52.5, 51) if female else c.rect(43, 36, 53, 49), skin, r=3, bias=-0.35)
    kit.top(c, t, build_, skin, rng)
    if spec.get('chain'):
        kit_ext.chain(c, spec['chain'], big=spec.get('chain_big', False))
    if spec.get('necklaces'):
        kit.necklaces(c, spec['necklaces'])

    frame = None
    ptype = prop.get('type')
    lefty_pose = fa == 'fret_left'
    held_late = ptype in ('pandeiro', 'maracas')
    if ptype == 'acoustic':
        frame = kit.acoustic(c, prop, *((48, 80, 212) if lefty_pose else (50, 80, -35)), lefty=lefty_pose)
    elif ptype and not held_late and kit_more.prop(c, prop, lefty=lefty_pose) is not False:
        frame = kit_more.LAST if hasattr(kit_more, 'LAST') else None
    elif ptype == 'electric':
        lefty = fa == 'fret_left'
        frame = kit.electric(c, prop, *((48, 80, 212) if lefty else (50, 80, -35)), lefty=lefty)
    elif ptype == 'trumpet':
        kit.trumpet(c)
    elif ptype == 'bass':
        frame = kit_ext.bass(c, prop, kit.Frame, col, lefty=lefty_pose)
    elif ptype == 'sax':
        kit_ext.sax(c, prop, col)
    elif ptype == 'violin':
        kit_ext.violin(c, prop, col)
    elif ptype == 'accordion':
        kit_ext.accordion(c, prop, col)
    elif ptype == 'keytar':
        kit_ext.keytar(c, prop, col)
    if B['hand'] == 'fret' and frame:
        hand(c, skin, *frame.pt(getattr(frame, 'fret_u', 31), -3.2), 3.0)
    if not B['behind']:
        back_arm()
        hand(c, skin, *B['hand'], 3.2)

    def front_arm():
        _arm(c, F, sleeve, arm_r, fsh, spec=shiny, t=t, skin=skin)
        if t.get('style') == 'jumpsuit' and fa == 'hand_mic':
            c.shape(c.poly([(30, 47), (37, 44), (39, 53), (32, 55)]), sleeve, r=2)
        if F.get('cuff') and not bare:
            c.shape(c.cap(list(F['cuff']), 3.0), col(t.get('shirt'), kit.SHIRT), r=1)
        if spec.get('bangles'):
            kit.bangles(c, 28, 44, spec['bangles'], ang=-60)
        if fa == 'hand_mic':
            kit.hand_mic(c, 35, 47)
        if fa == 'raise_stand':
            kit.bottomless_stand(c)
        hpos = frame.pt(getattr(frame, 'fret_u', 31), 2.5) if F['hand'] == 'fret_left' and frame else F['hand']
        if F['hand'] == 'fret_left' and not frame:
            hpos = (21, 61)
        if F.get('after_hat') and spec.get('glove'):
            g = c.ell(hpos[0], hpos[1], 3.6, 3.8)
            c.shape(g, spec['glove'], r=2, spec=True)
            c.sparkle(g, rng, 4, '#bcc4d8')
        elif hpos:
            hand(c, skin, *hpos, 3.3)
        if fa == 'mic_stand':
            c.line(22, 57, 22, 60, (skin, 1))
        if fa == 'raise_stand':
            c.line(24, 18, 29, 18, (skin, 2)); c.line(24, 20, 29, 20, (skin, 2))

    if not F.get('after_hat'):
        front_arm()
    if held_late:
        kit_more.prop(c, prop)
    kit.head(c, skin, female=female, rx=b.get('head_rx', 10), jaw=spec.get('face', {}).get('jaw'), ears=spec.get('face', {}).get('ears'))
    f = dict(spec.get('face', {}))
    kit.face(c, skin, f, hair_col=hair_col)
    fh = f.get('facial')
    for k in (fh if isinstance(fh, list) else [fh]):
        kit.facial_hair(c, k, col(f.get('facial_color'), hair_col))
    if f.get('facial_color2') and fh:
        kit_more.split_facial(c, col(f.get('facial_color'), hair_col), f['facial_color2'])
    kit_more.face_paint(c, f.get('paint'), skin, colr=f.get('paint_color'))
    kit.glasses(c, f.get('glasses'), f.get('glasses_color', '#d0a040'), lens_tint=f.get('lens_color', '#c8486a'))
    if spec.get('earrings'):
        kit.earrings(c, spec['earrings'], skin)
    kit.hair_front(c, hair, hat.get('style'))
    if hair.get('color2'):
        kit_more.split_hair(c, hair_col, hair['color2'], hair.get('split', 'right'))
    kit.hat(c, hat, rng)
    if spec.get('headphones'):
        kit_ext.headphones(c, spec['headphones'])
    if F.get('after_hat'):
        front_arm()
    if ptype == 'drumsticks' or spec.get('pose') == 'drums':
        kit_ext.drumsticks(c, [((40, 72), (31, 58)), ((58, 74), (68, 60))], col)
    return c
