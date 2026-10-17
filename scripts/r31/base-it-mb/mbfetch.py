# Coleta MusicBrainz: artistas italianos (país IT) por tag; ficha completa; área → região. Cache em disco; 1 req/s.
import json, os, sys, time, hashlib, urllib.request, urllib.parse
D = os.path.join(os.path.dirname(__file__), 'mb')
UA = 'VinylGame/1.0 (gianfo@gmail.com)'
last = [0.0]
def get(path, params):
    key = path.replace('/', '_') + '_' + urllib.parse.urlencode(sorted(params.items())).replace('&', '_').replace('%', '')[:150]
    fn = os.path.join(D, 'c_' + hashlib.md5((path + json.dumps(params, sort_keys=True)).encode()).hexdigest() + '.json')
    if os.path.exists(fn):
        return json.load(open(fn))
    for attempt in range(5):
        wait = 1.1 - (time.time() - last[0])
        if wait > 0: time.sleep(wait)
        last[0] = time.time()
        url = 'https://musicbrainz.org/ws/2/' + path + '?' + urllib.parse.urlencode({**params, 'fmt': 'json'})
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r)
            json.dump(d, open(fn, 'w'))
            return d
        except Exception as e:
            print('ERR', url, e, file=sys.stderr); time.sleep(3 * (attempt + 1))
    return None

TAGS = ['italo disco', 'italo-disco', 'italo dance', 'eurodance', 'cantautore', 'cantautorato', 'singer-songwriter', 'canzone napoletana', 'neapolitan',
  'progressive rock', 'rock progressivo italiano', 'trap', 'italian trap', 'drill', 'hip hop', 'rap', 'italian hip hop', 'beat', 'opera', 'classical',
  'soundtrack', 'film score', 'punk', 'punk rock', 'new wave', 'post-punk', 'heavy metal', 'power metal', 'symphonic metal', 'death metal', 'black metal',
  'thrash metal', 'gothic metal', 'indie', 'indie rock', 'indie pop', 'alternative rock', 'jazz', 'swing', 'house', 'techno', 'trance', 'electronic',
  'synth-pop', 'disco', 'reggae', 'ska', 'folk', 'folk rock', 'blues', 'soul', 'r&b', 'pop rock', 'rock', 'hard rock', 'pop', 'italian pop',
  'canzone italiana', 'easy listening', 'dance', 'dance-pop', 'psychedelic rock', 'rock and roll', 'world music', 'lounge', 'hardcore punk',
  'stoner rock', 'garage rock', 'shoegaze', 'emo', 'hardcore', 'grindcore', 'doom metal', 'progressive metal', 'electro', 'ambient', 'tenor', 'soprano',
  'baritone', 'chanson', 'musica leggera', 'yé-yé', 'exotica', 'library music', 'italian', 'neapolitan song', 'tarantella', 'pizzica']
stage = sys.argv[1] if __name__ == '__main__' else ''
if stage == 'discover':
    found = {}
    for t in TAGS:
        for off in range(0, 500, 100):
            d = get('artist/', {'query': f'country:IT AND tag:"{t}"', 'limit': 100, 'offset': off})
            if not d: break
            for a in d.get('artists', []):
                found.setdefault(a['id'], {'name': a['name'], 'tags': []})['tags'].append(t)
            if off + 100 >= d.get('count', 0): break
        print(t, len(found), flush=True)
    json.dump(found, open(os.path.join(D, 'found.json'), 'w'))
elif stage == 'detail':
    found = json.load(open(os.path.join(D, 'found.json')))
    # pré-filtro com o que a busca já trouxe (cache): país IT, pessoa/grupo, local de origem conhecido
    pre = {}
    for t in TAGS:
        for off in range(0, 500, 100):
            d = get('artist/', {'query': f'country:IT AND tag:"{t}"', 'limit': 100, 'offset': off})
            if not d: break
            for a in d.get('artists', []): pre[a['id']] = a
            if off + 100 >= d.get('count', 0): break
    ok = [m for m in found if m in pre and pre[m].get('type') in ('Person', 'Group') and (pre[m].get('begin-area') or (pre[m].get('type') == 'Group' and pre[m].get('area', {}).get('name') not in (None, 'Italy')))]
    print('pre-filtro', len(found), '->', len(ok), flush=True)
    out = {}
    for i, mbid in enumerate(ok):
        a = get('artist/' + mbid, {'inc': 'url-rels+genres+tags+release-groups+artist-rels'})
        if a: out[mbid] = a
        if i % 100 == 0: print('detail', i, len(ok), flush=True)
    json.dump(out, open(os.path.join(D, 'detail.json'), 'w'))
elif stage == 'areas':
    det = json.load(open(os.path.join(D, 'detail.json')))
    areas = {}
    def chain(aid, depth=0):
        if aid in areas or depth > 6: return
        a = get('area/' + aid, {'inc': 'area-rels'})
        if not a: return
        parent = None
        for r in a.get('relations', []):
            if r.get('type') == 'part of' and r.get('direction') == 'backward':
                parent = r['area']['id']; break
        areas[aid] = {'name': a['name'], 'type': a.get('type'), 'parent': parent, 'iso': a.get('iso-3166-2-codes') or a.get('iso-3166-1-codes')}
        if parent: chain(parent, depth + 1)
    for i, a in enumerate(det.values()):
        ba = a.get('begin-area') or a.get('area')
        if ba and a.get('country') == 'IT':
            chain(ba['id'])
        if i % 100 == 0: print('areas', i, len(det), len(areas), flush=True)
    json.dump(areas, open(os.path.join(D, 'areas.json'), 'w'))
