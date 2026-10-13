"""Converte os visuais do jogo (src/data/looks15.ts e looks17.ts, tokens "s0 h18 c1 o1 k0 t7 a6|1965:…")
em fichas do gerador. Dá um rascunho para cada artista real em segundos; os ícones depois ganham ficha à mão."""
import os, re

# paletas de src/ui/pixel/avatar.ts (pele levemente aquecida para o estilo novo)
SKINS = ['#f0c49c', '#d69a6c', '#a8693e', '#74462a']
HAIR_COLORS = ['#1e1814', '#3d2616', '#6e4426', '#8e3a1e', '#dcb862', '#c0602a', '#cfc9bf', '#4a6fd0', '#f1e9cf', '#d0302c', '#ee7cc0', '#8fe04a', '#7fb8e8']
OUTFIT_COLORS = ['#2c4a7e', '#a33434', '#2f7a4c', '#d0a43c', '#6a4590', '#e4dccb', '#2a2a30', '#d8692a', '#d8b040', '#e070a8', '#b4b8c4', '#5e3c26', '#6ab0e0']

# 23 cabelos do jogo → 23 desenhos do gerador (1:1)
HAIR = {0: 'bald', 1: 'short', 2: 'fringe', 3: 'buzz', 4: 'pompadour', 5: 'bowl', 6: 'afro', 7: 'long', 8: 'wavy_long',
        9: 'ponytail', 10: 'bun', 11: 'mohawk', 12: 'curly', 13: 'bob', 14: 'spiky', 15: 'dreads', 16: 'mullet',
        17: 'bouffant', 18: 'slick', 19: 'long_fringe', 20: 'curls_long', 21: 'braids', 22: 'pixie'}
# roupa casual por década (o jogo só diz "casual"); a escolha é determinística pelo nome
CASUAL = {1900: ['vest', 'shirt'], 1950: ['shirt', 'tshirt', 'leather_jacket'], 1960: ['shirt', 'turtleneck', 'tshirt', 'vest'],
          1970: ['open_shirt', 'denim_jacket', 'tunic', 'tshirt', 'shirt'], 1980: ['leather_jacket', 'tshirt', 'tracksuit', 'denim_jacket'],
          1990: ['tshirt', 'hoodie', 'tank', 'denim_jacket', 'shirt'], 2010: ['hoodie', 'tshirt', 'tank', 'tracksuit']}
CASUAL_F = {1900: ['blouse'], 1960: ['blouse', 'turtleneck'], 1970: ['blouse', 'tunic', 'open_shirt'],
            1980: ['leather_jacket', 'tshirt', 'blouse'], 1990: ['tshirt', 'tank', 'denim_jacket'], 2010: ['tank', 'hoodie', 'tshirt']}
PRINTS_70 = ['floral', 'african', 'stripes_h', None, None]


def _era(table, year):
    k = max([y for y in table if y <= year] or [min(table)])
    return table[k]


def _h(name, salt=''):
    import hashlib
    return int(hashlib.md5((name + salt).encode()).hexdigest(), 16)


HATS = {1: 'top_hat', 2: 'cowboy', 3: 'beret', 4: 'beanie', 5: 'headband', 6: 'cap', 7: 'fedora', 8: 'bandana'}
BEARD = {0: 'beard', 1: 'mustache', 2: 'goatee', 3: 'stubble'}
GLASSES = {0: 'round', 1: 'round', 2: 'dark', 3: 'aviator'}
PAIR = re.compile(r"'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'")
ALIAS = re.compile(r"L\['((?:[^'\\]|\\.)*)'\]\s*=\s*L\['((?:[^'\\]|\\.)*)'\]")


def load(repo='.'):
    """{nome: código}; looks15 tem prioridade sobre looks17 (igual ao jogo)."""
    out = {}
    for fn in ('looks17.ts', 'looks15.ts'):
        p = os.path.join(repo, 'src', 'data', fn)
        if not os.path.exists(p):
            continue
        txt = open(p, encoding='utf-8').read()
        for n, code in PAIR.findall(txt):
            if re.fullmatch(r"[A-Za-z0-9 ]+(\|\d{4}:[A-Za-z0-9 ]+)*", code) and re.search(r'\b[sh]\d', code):
                out[n.replace("\\'", "'")] = code
        for a, b in ALIAS.findall(txt):
            if b in out:
                out[a] = out[b]
    return out


def segments(code):
    segs = []
    for i, part in enumerate(code.split('|')):
        if i and ':' in part:
            y, tk = part.split(':', 1)
            segs.append((int(y), tk))
        else:
            segs.append((None, part))
    return segs


def first_year(code):
    return ''


def parse(tokens):
    a = {}
    for tk in tokens.split():
        if tk == 'F':
            a['F'] = 1
        else:
            a[tk[0]] = int(tk[1:] or 0)
    return a


def to_spec(name, code, year=None):
    segs = segments(code)
    tok = segs[0][1]
    for y, t in segs:
        if y is not None and year and y <= int(year):
            tok = t
    a = parse(tok)
    female = 'F' in a or 'F' in parse(segs[0][1])  # o sexo vem do primeiro trecho, como no jogo
    hair_style = HAIR.get(a.get('h', 1), 'short')
    if female and hair_style in ('short', 'slick', 'cropped') and a.get('h') not in (22,):
        hair_style = 'bob'
    o = a.get('o', 0)
    yr = int(year) if year else 1970
    tc = OUTFIT_COLORS[a.get('k', 6) % len(OUTFIT_COLORS)]
    jeans = {'style': 'jeans', 'flare': 1968 <= yr <= 1979}
    dark = {'style': 'pants', 'color': '#2a2a34'}
    if female:
        if o == 2:
            top = {'style': 'gown' if yr < 1960 or _h(name) % 3 == 0 else 'dress', 'color': tc}
            bottom = {'style': 'skirt_long', 'color': tc}
        elif o == 1:
            top = {'style': 'suit', 'color': tc, 'shirt': '#ece4d4'}
            bottom = {'style': 'pants', 'color': tc}
        else:
            opts = _era(CASUAL_F, yr) if o == 0 else ['turtleneck', 'sweater']
            top = {'style': opts[_h(name) % len(opts)], 'color': tc}
            bottom = jeans if yr >= 1960 and _h(name, 'b') % 2 else ({'style': 'skirt', 'color': '#2a2a34'} if yr < 1990 else jeans)
    else:
        if o == 1:
            top = {'style': 'suit', 'color': tc, 'tie': 'tie' if yr < 1975 else None, 'tie_color': '#8a2430' if a.get('k') != 1 else '#1e1a20'}
            bottom = {'style': 'pants', 'color': tc}
        elif o == 2:
            top = {'style': 'tunic' if 1966 <= yr <= 1985 and _h(name) % 2 else 'coat_long', 'color': tc}
            bottom = jeans if yr >= 1960 else dark
        elif o == 3:
            top = {'style': ['sweater', 'turtleneck'][_h(name) % 2], 'color': tc}
            bottom = jeans if yr >= 1960 else dark
        else:
            opts = _era(CASUAL, yr)
            top = {'style': opts[_h(name) % len(opts)], 'color': tc}
            bottom = jeans if yr >= 1955 else dark
        if top['style'] == 'denim_jacket':
            top['color'] = '#4a6a9a'; top['shirt'] = tc
        if top['style'] == 'leather_jacket':
            top['shiny'] = True; top['shirt'] = tc; top['color'] = '#2a2428' if _h(name, 'l') % 3 else '#5e3c26'
        if top['style'] in ('tshirt', 'tank', 'open_shirt', 'shirt'):
            if top['style'] == 'tshirt':
                top['sleeves'] = 'short'
            if top['style'] == 'tank':
                top['sleeves'] = 'bare'
    if 1966 <= yr <= 1979 and top['style'] in ('open_shirt', 'tunic', 'shirt', 'blouse'):
        p = PRINTS_70[_h(name, 'p') % len(PRINTS_70)]
        if p:
            top['pattern'] = p
    hat = {}
    if 't' in a:
        hat = {'style': HATS.get(a['t'], 'fedora')}
        if 'a' in a:
            hat['color'] = OUTFIT_COLORS[a['a'] % len(OUTFIT_COLORS)]
    face = {'mouth': {0: 'neutral', 1: 'smirk', 2: 'smile'}.get(a.get('f', 0), 'neutral')}
    if female:
        face.update({'mouth': 'lips', 'lashes': True, 'lips': '#b04a50'})
    if 'd' in a:
        face['facial'] = BEARD.get(a['d'], 'beard')
    if 'g' in a:
        face['glasses'] = GLASSES.get(a['g'], 'round')
    if a.get('p') == 6:
        face['lashes'] = True
    build = 'female' if female else {0: 'slim', 1: 'regular', 2: 'stocky'}.get(a.get('y', 1), 'regular')
    return {
        'name': name, 'year': year or '', 'seed': _h(name) % 1000,
        'body': {'sex': 'f' if female else 'm', 'build': build, 'skin': SKINS[a.get('s', 0) % 4]},
        'hair': {'style': hair_style, 'color': HAIR_COLORS[a.get('c', 0) % len(HAIR_COLORS)]},
        'hat': hat, 'face': face, 'top': top, 'bottom': bottom,
        'shoes': {'color': '#2a2224' if yr < 1980 else ['#2a2224', '#f2f0ea', '#5e3c26'][_h(name, 's') % 3],
                  'style': 'sneaker' if yr >= 1980 and _h(name, 's') % 3 == 1 else ('boot' if 1965 <= yr <= 1980 and _h(name, 's') % 2 else 'shoe')},
        'pose': ['stand', 'pocket', 'hip'][_h(name, 'pose') % 3], '_from': 'looks:' + tok,
    }
