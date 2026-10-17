# Monta atos do jogo a partir das fichas do MusicBrainz (mb/detail.json + mb/areas.json). Regras estritas: nada inventado.
import json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
from mbfetch import get, D
det = json.load(open(os.path.join(D, 'detail.json')))
areas = json.load(open(os.path.join(D, 'areas.json')))
gd = json.load(open(os.path.join(D, 'gamedata.json')))
GBORN = gd['genres']
def norm(n): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', n.lower()))
def dkey(n):
    k = norm(re.sub(r'^the\s+', '', n, flags=re.I).replace('&', ' and '))
    return {'gruporevelacao': 'revelacao'}.get(k, k)
taken = set(gd['keys'])

REG = {'IT-21': 'milan', 'IT-23': 'milan', 'IT-25': 'milan', 'IT-32': 'milan', 'IT-34': 'milan', 'IT-36': 'milan', 'IT-42': 'milan', 'IT-45': 'milan',
       'IT-52': 'milan', 'IT-55': 'rome', 'IT-57': 'rome', 'IT-62': 'rome', 'IT-65': 'rome', 'IT-67': 'naples', 'IT-72': 'naples', 'IT-75': 'naples',
       'IT-77': 'naples', 'IT-78': 'naples', 'IT-82': 'naples', 'IT-88': 'rome'}
PROV_ROME = {'IT-RN', 'IT-FC', 'IT-FI', 'IT-AR', 'IT-SI', 'IT-GR'}  # Romanha a leste e Toscana central/sul: Roma está mais perto
REGNAME = {'IT-21': 'Piemonte', 'IT-23': "Valle d'Aosta", 'IT-25': 'Lombardia', 'IT-32': 'Trentino-Alto Adige', 'IT-34': 'Vêneto', 'IT-36': 'Friul-Veneza Júlia',
           'IT-42': 'Ligúria', 'IT-45': 'Emília-Romanha', 'IT-52': 'Toscana', 'IT-55': 'Úmbria', 'IT-57': 'Marcas', 'IT-62': 'Lácio', 'IT-65': 'Abruzos',
           'IT-67': 'Molise', 'IT-72': 'Campânia', 'IT-75': 'Apúlia', 'IT-77': 'Basilicata', 'IT-78': 'Calábria', 'IT-82': 'Sicília', 'IT-88': 'Sardenha'}
CITYDIRECT = {'Milano': 'milan', 'Milan': 'milan', 'Roma': 'rome', 'Rome': 'rome', 'Napoli': 'naples', 'Naples': 'naples'}
def city_of(aid):
    """(cidade do jogo, nome real, região) seguindo 'parte de' até uma região italiana."""
    seen, cur, prov, reg, first = 0, aid, None, None, None
    while cur and cur in areas and seen < 8:
        a = areas[cur]; seen += 1
        first = first or a['name']
        for code in a.get('iso') or []:
            if code in REG: reg = code
            elif re.match(r'^IT-[A-Z]{2}$', code): prov = prov or code
        if reg: break
        cur = a.get('parent')
    if first in CITYDIRECT: return CITYDIRECT[first], first, None
    if not reg: return None
    c = 'rome' if prov in PROV_ROME else REG[reg]
    if c == 'milan' and reg == 'IT-52' and prov is None: return None  # Toscana sem província: não dá para decidir
    return c, first, REGNAME[reg]

# gênero do MusicBrainz → gênero do jogo (ordem de prioridade dentro das tags do artista)
GMAP = [
  (('italo-disco', 'italo disco'), 'italo'), (('italo dance', 'eurodance', 'euro house', 'italo house'), 'eurodance'),
  (('canzone napoletana', 'neapolitan', 'neapolitan song', 'tarantella', 'pizzica'), 'canzone_napoletana'),
  (('cantautore', 'cantautorato', 'singer-songwriter'), 'cantautori'),
  (('rock progressivo italiano', 'progressive rock', 'symphonic prog', 'progressive metal'), 'prog'),
  (('drill', 'uk drill'), 'drill'), (('trap', 'italian trap'), 'trap'),
  (('hip hop', 'rap', 'italian hip hop', 'hardcore hip hop', 'conscious hip hop', 'boom bap'), 'hiphop'),
  (('opera', 'tenor', 'soprano', 'baritone', 'bel canto'), 'opera'),
  (('soundtrack', 'film score', 'film soundtrack', 'library music'), 'soundtrack'),
  (('classical', 'contemporary classical', 'baroque', 'romantic classical', 'chamber music', 'minimalism'), 'classical'),
  (('death metal', 'melodic death metal', 'technical death metal'), 'death_metal'), (('black metal',), 'black_metal'), (('thrash metal',), 'thrash'),
  (('heavy metal', 'power metal', 'symphonic metal', 'gothic metal', 'doom metal', 'metal', 'speed metal'), 'heavy_metal'),
  (('hardcore punk', 'hardcore'), 'hardcore_punk'), (('punk', 'punk rock', 'pop punk', 'oi!'), 'punk'), (('post-punk', 'gothic rock', 'darkwave', 'coldwave'), 'post_punk'),
  (('new wave',), 'new_wave'), (('shoegaze',), 'shoegaze'), (('grunge',), 'grunge'), (('stoner rock', 'hard rock'), 'hard_rock'),
  (('indie', 'indie rock', 'indie pop', 'itpop', 'lo-fi'), 'indie'), (('alternative rock', 'noise rock', 'post-rock'), 'alt_rock'),
  (('beat', 'beat italiano', 'merseybeat'), 'beat'), (('psychedelic rock', 'psychedelia'), 'psychedelic'), (('garage rock',), 'garage_rock'),
  (('rock and roll', "rock 'n' roll", 'rockabilly'), 'rnr'),
  (('trance', 'progressive trance', 'dream house'), 'trance'), (('techno', 'minimal techno'), 'techno'), (('house', 'deep house', 'tech house', 'progressive house'), 'house'),
  (('edm', 'electro house', 'big room house', 'electroclash', 'electro'), 'edm'), (('gabber', 'hardcore techno', 'hardstyle'), 'gabber'), (('ambient',), 'ambient'),
  (('synth-pop', 'synthpop', 'electropop'), 'synthpop'), (('disco', 'cosmic disco'), 'disco'),
  (('reggae', 'dub', 'dancehall', 'roots reggae'), 'reggae'), (('ska', 'ska punk'), 'ska'),
  (('swing', 'big band'), 'big_band'), (('vocal jazz',), 'vocal_jazz'), (('jazz fusion', 'jazz-rock', 'fusion'), 'fusion'), (('jazz', 'post-bop', 'hard bop', 'cool jazz', 'free jazz'), 'cool_jazz'),
  (('blues', 'blues rock'), 'blues_rock'), (('soul', 'funk'), 'soul'), (('r&b', 'contemporary r&b'), 'pop_rnb'),
  (('folk', 'folk rock', 'world music', 'italian folk', 'traditional folk'), 'folk'),
  (('lounge', 'exotica', 'easy listening'), 'exotica'), (('chanson', 'musica leggera', 'canzone italiana', 'italian pop', 'yé-yé'), 'canzone'),
  (('dance-pop', 'dance', 'dance pop'), 'dance_pop'), (('pop rock', 'soft rock'), 'pop_rock'), (('rock',), 'pop_rock'), (('pop',), 'canzone'),
]
def tagnames(a):
    ts = sorted(a.get('genres', []) + a.get('tags', []), key=lambda t: -t.get('count', 0))
    return [t['name'].lower() for t in ts]
def genre_of(a):
    names = tagnames(a)
    for nm in names:
        for keys, g in GMAP:
            if nm in keys: return g, nm
    return None, None

ROLE = [(('lead vocals', 'vocals', 'background vocals', 'voice'), 'vocal'), (('rap', 'mc'), 'mc'), (('guitar', 'electric guitar', 'acoustic guitar', 'rhythm guitar', 'lead guitar'), 'guitar'),
        (('bass guitar', 'bass', 'double bass', 'electric bass guitar'), 'bass'), (('drums', 'drums (drum set)', 'percussion', 'drum machine'), 'drums'),
        (('keyboard', 'piano', 'synthesizer', 'organ', 'hammond organ', 'keyboards'), 'keys'), (('saxophone', 'trumpet', 'trombone', 'horn', 'flute', 'clarinet'), 'horns'),
        (('violin', 'cello', 'viola', 'strings'), 'strings'), (('turntables', 'dj-mix'), 'dj')]
def role_of(attrs):
    for keys, r in ROLE:
        for at in attrs:
            if at.lower() in keys: return r
    return None
def yr(s):
    m = re.match(r'^(\d{4})', s or ''); return int(m.group(1)) if m else None
BAD2 = {'Compilation', 'Live', 'Remix', 'Demo', 'Interview', 'Audiobook', 'Spokenword', 'DJ-mix', 'Audio drama', 'Field recording'}
def rgs_of(mbid, a):
    rg = a.get('release-groups', [])
    if len(rg) >= 25:
        allr, off = [], 0
        while True:
            d = get('release-group', {'artist': mbid, 'limit': 100, 'offset': off})
            if not d: break
            allr += d.get('release-groups', []); off += 100
            if off >= d.get('release-group-count', 0) or off >= 500: break
        if allr: rg = allr
    out = []
    for r in rg:
        y = yr(r.get('first-release-date'))
        pt = r.get('primary-type')
        if not y or pt not in ('Album', 'Single', 'EP') or set(r.get('secondary-types') or []) & BAD2: continue
        out.append((y, pt, r['title']))
    out.sort()
    return out, len(rg)

PROLE = [(('rapper', 'rap', 'mc'), 'mc'), (('dj', 'disc jockey', 'turntablism'), 'dj'), (('pianist', 'piano', 'organist', 'organ', 'harpsichord', 'keyboardist', 'keyboards'), 'keys'),
         (('violinist', 'violin', 'cellist', 'cello', 'viola', 'violist', 'harp'), 'strings'), (('guitarist', 'guitar', 'classical guitar', 'lute'), 'guitar'),
         (('saxophonist', 'saxophone', 'trumpeter', 'trumpet', 'trombone', 'clarinet', 'flute', 'flautist'), 'horns'), (('drummer', 'drums', 'percussion'), 'drums'),
         (('bassist', 'double bass', 'bass guitar'), 'bass'), (('singer', 'vocalist', 'soprano', 'tenor', 'baritone', 'mezzo-soprano', 'bass-baritone', 'contralto', 'countertenor', 'female vocalists', 'male vocalists'), 'vocal'),
         (('producer', 'record producer'), 'producer')]
SINGER = {'canzone', 'cantautori', 'canzone_napoletana', 'pop_rock', 'dance_pop', 'italo', 'eurodance', 'soul', 'pop_rnb', 'folk', 'trad_pop', 'opera', 'indie', 'punk', 'alt_rock', 'rnr', 'beat', 'vocal_jazz', 'reggae'}
acts, rej = [], {}
def no(reason, n): rej.setdefault(reason, []).append(n)
for mbid, a in det.items():
    n = a['name']
    if a.get('country') != 'IT': no('país', n); continue
    typ = a.get('type')
    if typ not in ('Person', 'Group'): no('tipo', n); continue
    wd = [r['url']['resource'].rsplit('/', 1)[-1] for r in a.get('relations', []) if r.get('type') == 'wikidata' and r.get('url')]
    if not wd: no('sem wikidata', n); continue
    k = dkey(n)
    if not k or k in taken: no('duplicata', n); continue
    if re.search(r'fossati', n, re.I): no('família Fossati', n); continue
    ba = a.get('begin-area') or (a.get('area') if typ == 'Group' else None)
    co = city_of(ba['id']) if ba and ba['id'] in areas else None
    if not co: no('sem cidade italiana', n); continue
    g, gtag = genre_of(a)
    if not g: no('gênero', n); continue
    rel, nrg = rgs_of(mbid, a)
    if not rel: no('sem disco datado', n); continue
    if nrg < 3: no('menos de 3 lançamentos', n); continue
    ls = a.get('life-span') or {}
    b = yr(ls.get('begin')); end = yr(ls.get('end')) if ls.get('ended') else None
    d = rel[0][0]
    if d > 2026 or d < 1889: no('estreia', n); continue
    if typ == 'Person':
        if b is not None and d - b < 12: no('idade na estreia', n); continue
        if end is not None and (end < d or (b is not None and end <= b)): no('morte', n); continue
    else:
        if b is not None and b > d: b = None  # formação depois do 1º disco: dado inconsistente, fica sem formação
        if end is not None and end < d: no('fim antes da estreia', n); continue
        if b is not None and d - b > 15: no('banda: 1º disco datado muito depois da formação', n); continue
    born = GBORN.get(g)
    if born is None or born > d + 6:
        # gênero nasceu depois: canção popular antiga vira pop tradicional/napolitana, se der
        alt = 'canzone_napoletana' if co[0] == 'naples' and d >= 1889 else ('trad_pop' if d >= 1929 else None)
        if g in ('canzone', 'cantautori', 'pop_rock', 'dance_pop') and alt: g = alt
        else: no('gênero depois da estreia', n); continue
    keep = [r for r in rel if end is None or r[0] <= end]
    if not keep: no('obras depois do fim', n); continue
    pick = [keep[0]]
    albums = [r for r in keep if r[1] == 'Album']
    for r in ([albums[0]] if albums else []) + ([albums[-1]] if len(albums) > 1 else []):
        if r not in pick: pick.append(r)
    al = [[t, y, {'Album': 'lp', 'Single': 'single', 'EP': 'ep'}[pt]] for (y, pt, t) in pick[:3]]
    m = []
    if typ == 'Group':
        for r in a.get('relations', []):
            if r.get('type') != 'member of band' or r.get('direction') != 'backward': continue
            ro = role_of(r.get('attributes') or [])
            if not ro: continue
            j, l = yr(r.get('begin')), yr(r.get('end'))
            if l is not None and j is not None and l < j: continue
            m.append([r['artist']['name'], ro, None, None, j, l])
        if len(m) > 8: m = m[:8]
    role, apd = None, typ == 'Group' and b is not None and d - b > 8
    if typ == 'Person':
        tn = tagnames(a)
        for nm in tn:
            role = next((r for keys, r in PROLE if nm in keys), None)
            if role: break
        if not role:
            role = 'mc' if g in ('hiphop', 'trap', 'drill') else 'vocal' if g in SINGER else None
        if not role: no('papel desconhecido', n); continue
        if b is not None and d - b > 40: no('estreia tardia (reedição)', n); continue
        apd = b is not None and d - b > 30
    taken.add(k)
    acts.append({'n': n, 'g': g, 'gtag': gtag, 'c': co[0], 'rc': co[1] if co[0] and co[1] not in CITYDIRECT else None, 'reg': co[2], 'd': d, 'typ': typ, 'b': b, 'x': end if typ == 'Person' else None,
                 'e': end, 'f': b if typ == 'Group' and b and b < d else None, 'al': al, 'm': m, 'r': role, 'mbid': mbid, 'wd': wd[0], 'nrg': nrg, 'apd': apd})
json.dump(acts, open(os.path.join(D, 'acts.json'), 'w'), ensure_ascii=False, indent=0)
json.dump({k: len(v) for k, v in rej.items()}, sys.stdout, ensure_ascii=False); print()
json.dump({k: v[:12] for k, v in rej.items()}, open(os.path.join(D, 'rej.json'), 'w'), ensure_ascii=False, indent=1)
print('aceitos', len(acts))
from collections import Counter
print(Counter(x['g'] for x in acts).most_common(40)); print(Counter(x['c'] for x in acts)); print(Counter(x['d'] // 10 * 10 for x in acts))
