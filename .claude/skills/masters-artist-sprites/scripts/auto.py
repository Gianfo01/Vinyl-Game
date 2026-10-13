"""Rascunho automático de ficha para qualquer pessoa real do jogo (data/people.json, exportado por tools/dump-people.ts).

Usa o visual do jogo (looks15/17) quando existe; senão monta pelo gênero/família, papel e época. O rascunho acerta
pose e instrumento pelo papel e o figurino pela cena, mas NÃO sabe sexo, pele nem cabelo de quem não tem visual
(marcado com "_todo": true) — isso vem da revisão pessoa a pessoa.

  python3 auto.py --repo ../../../.. --out ../specs/rascunhos.jsonl
"""
import argparse, hashlib, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import looks

HERE = os.path.dirname(os.path.abspath(__file__))
SQUEEZE = ('forro', 'baiao', 'tango', 'vallenato', 'zydeco', 'polka', 'musette', 'norteno', 'conjunto', 'xote', 'cajun')
ACOUSTIC_FAM = {'country_folk', 'brazil', 'latin', 'europe', 'africa', 'asia_me', 'sacred'}


def h(s, salt=''):
    return int(hashlib.md5((s + salt).encode()).hexdigest(), 16)


def pick(name, opts, salt=''):
    return opts[h(name, salt) % len(opts)]


def iconic_year(p):
    y = p['debut'] + 4
    if p.get('death'):
        y = min(y, p['death'] - 1)
    return max(p['debut'], min(y, 2025))


def outfit(p, y):
    fam, g, n = p.get('family') or 'pop', p['genre'], p['name']
    if any(k in g for k in ('metal', 'thrash', 'doom', 'grunge')):
        return {'style': 'leather_jacket', 'color': '#24201e', 'shiny': True, 'shirt': '#1e1a1c'}, {'style': 'jeans', 'color': '#2a2c34'}, {'style': 'long'}
    if 'punk' in g:
        return {'style': 'leather_jacket', 'color': '#24201e', 'shiny': True, 'shirt': '#e8e4dc'}, {'style': 'jeans', 'color': '#2a2c34'}, {'style': pick(n, ['spiky', 'mohawk', 'short'])}
    if fam == 'blues_jazz' or (y < 1955 and fam not in ('country_folk',)):
        return {'style': pick(n, ['suit', 'suit', 'tux']), 'color': pick(n, ['#25232b', '#33405e', '#5a4a3a', '#3a3a40'], 'c'), 'tie': pick(n, ['tie', 'bow'], 't')}, {'style': 'pants'}, {}
    if fam == 'country_folk':
        return {'style': pick(n, ['shirt', 'denim_jacket', 'vest']), 'color': pick(n, ['#8a3a30', '#3a5a8c', '#c8a070', '#e8e0cc'], 'c'), 'pattern': pick(n, [None, 'checks'], 'p')}, {'style': 'jeans', 'flare': 1968 <= y <= 1979}, {'hat': pick(n, [None, 'cowboy'], 'h')}
    if fam == 'hiphop':
        return {'style': pick(n, ['tracksuit', 'hoodie', 'tshirt', 'leather_jacket']), 'color': pick(n, ['#c8282c', '#2a2a34', '#2c4a7e', '#e8e4dc', '#2f7a4c'], 'c'), 'sleeves': None, 'sleeve_stripe': '#f4f2ee'}, {'style': 'jeans', 'color': '#3a5a8c'}, {'hat': pick(n, [None, 'cap', 'beanie'], 'h'), 'chain': '#d8b040'}
    if fam == 'electronic':
        return {'style': pick(n, ['tshirt', 'hoodie', 'tank']), 'color': pick(n, ['#2a2a34', '#6a4590', '#2c4a7e', '#e8e4dc'], 'c')}, {'style': 'jeans', 'color': '#26262c'}, {}
    if fam == 'caribbean' and 'reggae' in g:
        return {'style': pick(n, ['shirt', 'tshirt', 'denim_jacket']), 'color': '#3a5a3a', 'pattern': pick(n, ['rasta', None], 'p')}, {'style': 'jeans'}, {}
    if fam == 'africa':
        return {'style': pick(n, ['tunic', 'shirt', 'open_shirt']), 'color': pick(n, ['#e8b030', '#2f7a4c', '#c8282c', '#2c4a7e'], 'c'), 'pattern': 'african', 'pattern_color': ['#2f7a4c', '#c8282c', '#1e1a20']}, {'style': 'pants', 'color': '#e8e0cc'}, {}
    if fam == 'rnb':
        if y < 1975:
            return {'style': 'suit', 'color': pick(n, ['#33405e', '#6a4590', '#2a2a34', '#a33434'], 'c'), 'tie': 'tie', 'shiny': True}, {'style': 'pants'}, {}
        return {'style': pick(n, ['open_shirt', 'leather_jacket', 'jacket_open', 'tank']), 'color': pick(n, ['#e8e4dc', '#a33434', '#2a2a34', '#d8b040'], 'c'), 'shiny': True}, {'style': pick(n, ['pants', 'flare'] if y < 1982 else ['pants', 'jeans'], 'b')}, {'chain': pick(n, [None, '#d8b040'], 'ch')}
    if fam == 'rock':
        st = pick(n, ['leather_jacket', 'denim_jacket', 'tshirt', 'shirt'] if y >= 1955 else ['shirt'])
        if 1966 <= y <= 1975:
            st = pick(n, ['open_shirt', 'fringe_jacket', 'denim_jacket', 'tunic', 'shirt'])
        return {'style': st, 'color': pick(n, ['#2a2428', '#4a6a9a', '#a33434', '#e8e4dc', '#5e3c26'], 'c'), 'shiny': st == 'leather_jacket', 'pattern': pick(n, [None, None, 'floral'], 'p') if 1966 <= y <= 1975 else None}, {'style': 'jeans', 'flare': 1968 <= y <= 1979}, {}
    if fam == 'brazil':
        return {'style': pick(n, ['shirt', 'open_shirt', 'tshirt', 'suit'] if y >= 1960 else ['suit', 'shirt']), 'color': pick(n, ['#e8e4dc', '#c8a040', '#2f7a4c', '#2c4a7e', '#a33434'], 'c'), 'pattern': pick(n, [None, 'floral', 'stripes_h'], 'p') if y >= 1966 else None}, {'style': pick(n, ['pants', 'jeans'], 'b') if y >= 1960 else 'pants'}, {}
    if fam == 'latin':
        return {'style': pick(n, ['shirt', 'vest', 'suit', 'open_shirt']), 'color': pick(n, ['#e8e4dc', '#a33434', '#2a2a34', '#d8b040'], 'c'), 'shiny': True}, {'style': 'pants', 'color': '#2a2a34'}, {}
    if fam in ('europe', 'asia_me', 'sacred'):
        return {'style': pick(n, ['suit', 'turtleneck', 'shirt', 'jacket_open']), 'color': pick(n, ['#2a2a34', '#33405e', '#e8e4dc', '#6a4590'], 'c'), 'tie': None}, {'style': 'pants'}, {}
    # pop
    st = pick(n, ['jacket_open', 'leather_jacket', 'tshirt', 'shirt', 'denim_jacket'] if y >= 1975 else ['suit', 'shirt', 'turtleneck'])
    return {'style': st, 'color': pick(n, ['#e070a8', '#2c4a7e', '#e8e4dc', '#2a2a34', '#d8692a'], 'c'), 'shiny': st in ('jacket_open', 'leather_jacket'), 'pattern': pick(n, [None, 'sparkle'], 'p') if 1975 <= y <= 1990 else None}, {'style': 'jeans' if y >= 1960 else 'pants'}, {}


def pose_for(p, y, spec):
    role, n, fam, g = p.get('role') or 'vocal', p['name'], p.get('family') or 'pop', p['genre']
    if any(k in g for k in SQUEEZE) and role in ('vocal', 'keys', None):
        return 'accordion', {'type': 'accordion', 'color': pick(n, ['#a83030', '#2a4a8a', '#1e1a20'])}
    if role == 'guitar':
        if fam in ACOUSTIC_FAM or (fam == 'blues_jazz' and y < 1950):
            return 'guitar', {'type': 'acoustic', 'top': pick(n, ['#e0aa5c', '#d8a058', '#8a5426', '#1e1c24'], 'g')}
        return 'guitar', {'type': 'electric', 'shape': pick(n, ['strat', 'lp'], 's'),
                          'body': pick(n, ['#c83030', '#efe8d8', '#1e1c22', '#8a5426', '#2c6ab0', '#d8a838'], 'g'),
                          'neck': pick(n, ['#e0b070', '#5a3020'], 'n')}
    if role == 'bass':
        return ('bass', {'type': 'bass', 'body': pick(n, ['#2a2a34', '#c83030', '#8a5426', '#efe8d8'], 'b')}) if y >= 1955 else ('pocket', {})
    if role == 'drums':
        return 'drums', {}
    if role == 'keys':
        return ('keytar', {'type': 'keytar', 'body': pick(n, ['#e8e4dc', '#2a2a34', '#c83030'], 'k')}) if 1980 <= y <= 1995 else (pick(n, ['pocket', 'hip']), {})
    if role == 'horns':
        return pick(n, [('sax', {'type': 'sax'}), ('trumpet', {'type': 'trumpet'})])
    if role == 'strings':
        return 'violin', {'type': 'violin'}
    if role in ('dj', 'producer'):
        spec['headphones'] = '#2a2830'
        return pick(n, ['hip', 'pocket']), {}
    if role == 'mc':
        return 'hand_mic', {}
    return ('mic_stand' if y < 1958 else pick(n, ['hand_mic', 'hand_mic', 'mic_stand', 'arm_up'], 'v')), {}


def draft(p, table):
    y = iconic_year(p)
    n = p['name']
    if n in table:
        spec = looks.to_spec(n, table[n], y)
        todo = False
    else:
        spec = {'name': n, 'year': y, 'seed': h(n) % 1000, 'body': {'sex': 'm', 'build': 'regular', 'skin': 'medio'},
                'hair': {'style': 'short', 'color': '#2a1c14'}, 'face': {'mouth': 'neutral'}, 'shoes': {'color': '#2a2224'}}
        top, bottom, extra = outfit(p, y)
        spec['top'] = {k: v for k, v in top.items() if v is not None}
        spec['bottom'] = {k: v for k, v in bottom.items() if v is not None}
        if extra.get('style'):
            spec['hair']['style'] = extra['style']
        if extra.get('hat'):
            spec['hat'] = {'style': extra['hat'], 'color': pick(n, ['#2a2a34', '#c83030', '#e8e4dc', '#5e3c26'], 'hc')}
        if extra.get('chain'):
            spec['chain'] = extra['chain']
        if spec['bottom'].get('style') == 'jeans' or p.get('family') in ('hiphop', 'electronic'):
            spec['shoes'] = {'color': pick(n, ['#2a2224', '#f2f0ea', '#5e3c26'], 'sh'), 'style': 'sneaker' if y >= 1975 else 'boot'}
        todo = True
    pose, prop = pose_for(p, y, spec)
    spec['pose'] = pose
    if prop:
        spec['prop'] = prop
    else:
        spec.pop('prop', None)
    if p.get('role') == 'mc':
        spec.setdefault('chain', '#d8b040')
    spec['_meta'] = {k: p.get(k) for k in ('role', 'genre', 'family', 'debut', 'birth', 'death', 'tier', 'country', 'acts')}
    if todo:
        spec['_todo'] = True
    spec.pop('_from', None)
    return spec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default='.')
    ap.add_argument('--people', default=os.path.join(HERE, '..', 'data', 'people.json'))
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    people = json.load(open(a.people, encoding='utf-8'))
    table = looks.load(a.repo)
    people.sort(key=lambda p: (p['acts'][0].lower(), p['name'].lower()))
    with open(a.out, 'w', encoding='utf-8') as fh:
        for p in people:
            fh.write(json.dumps(draft(p, table), ensure_ascii=False) + '\n')
    print(len(people), 'rascunhos em', a.out)


if __name__ == '__main__':
    main()
