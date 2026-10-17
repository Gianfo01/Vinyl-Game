# R31 · BASE-BR — coleta no MusicBrainz para a fila de candidatos brasileiros (docs/r31/base-br/*.jsonl, status "skip").
# Regras de confiabilidade: nome exato + país BR (um único candidato; homônimo brasileiro = pula); estreia = data original
# mais antiga entre os lançamentos próprios (álbum/single/EP, sem coletânea/ao vivo/remix) e marcada `ap: d` (discografia
# do MB pode estar incompleta); cidade = área de nascimento/fundação levada à cidade do jogo do mesmo estado; fontes = página
# do artista no MB + links Wikidata/Wikipédia que ele traz. Notoriedade (para a DBTAM): anos de carreira, nº de discos.
# Uso: python3 scripts/r31/base-br-mb/mbbr.py <cache_dir> <saida.jsonl> nome|gênero|cidade ...  (lista em stdin)
import json, os, sys, time, hashlib, urllib.request, urllib.parse, unicodedata, re
CACHE, OUT = sys.argv[1], sys.argv[2]
UA = 'VinylGameResearch/1.0 (+https://github.com/gianfo01/vinyl-game)'
last = [0.0]
def get(path, params):
    fn = os.path.join(CACHE, 'c_' + hashlib.md5((path + json.dumps(params, sort_keys=True)).encode()).hexdigest() + '.json')
    if os.path.exists(fn): return json.load(open(fn))
    for attempt in range(4):
        wait = 1.15 - (time.time() - last[0])
        if wait > 0: time.sleep(wait)
        last[0] = time.time()
        url = 'https://musicbrainz.org/ws/2/' + path + '?' + urllib.parse.urlencode({**params, 'fmt': 'json'})
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r: d = json.load(r)
            json.dump(d, open(fn, 'w')); return d
        except Exception as e:
            print('ERR', url, e, file=sys.stderr); time.sleep(3 * (attempt + 1))
    return None
def norm(s): return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()).strip().replace(' e ', ' and ').replace('&', 'and')
def yr(s):
    m = re.match(r'^(\d{4})', s or ''); return int(m.group(1)) if m else None
UF = {'São Paulo': 'sao_paulo', 'Rio de Janeiro': 'rio', 'Bahia': 'salvador', 'Pernambuco': 'recife', 'Minas Gerais': 'bh', 'Rio Grande do Sul': 'porto_alegre',
      'Paraná': 'curitiba', 'Pará': 'belem', 'Ceará': 'fortaleza', 'Distrito Federal': 'brasilia', 'Goiás': 'goiania', 'Amazonas': 'manaus', 'Santa Catarina': 'florianopolis',
      'Maranhão': 'sao_luis', 'Espírito Santo': 'rio', 'Mato Grosso': 'goiania', 'Mato Grosso do Sul': 'goiania', 'Tocantins': 'goiania', 'Piauí': 'sao_luis',
      'Rio Grande do Norte': 'recife', 'Paraíba': 'recife', 'Alagoas': 'recife', 'Sergipe': 'salvador', 'Amapá': 'belem', 'Roraima': 'manaus', 'Rondônia': 'manaus', 'Acre': 'manaus'}
CITY = {'São Paulo': 'sao_paulo', 'Rio de Janeiro': 'rio', 'Salvador': 'salvador', 'Recife': 'recife', 'Belo Horizonte': 'bh', 'Porto Alegre': 'porto_alegre', 'Curitiba': 'curitiba',
        'Belém': 'belem', 'Fortaleza': 'fortaleza', 'Brasília': 'brasilia', 'Goiânia': 'goiania', 'Manaus': 'manaus', 'Florianópolis': 'florianopolis', 'São Luís': 'sao_luis', 'Campinas': 'campinas'}
def state_of(area_id, depth=0):
    """(nome da área, estado) subindo a cadeia 'part of'."""
    a = get('area/' + area_id, {'inc': 'area-rels'})
    if not a or depth > 6: return None
    if a['name'] in UF and a.get('type') == 'Subdivision': return a['name']
    for r in a.get('relations', []):
        if r.get('type') == 'part of' and r.get('direction') == 'backward':
            return state_of(r['area']['id'], depth + 1)
    return None
def city_of(art):
    for key in ('begin-area', 'area'):
        ar = art.get(key)
        if not ar: continue
        if ar['name'] in CITY: return CITY[ar['name']], None
        st = state_of(ar['id'])
        if st: return UF[st], f"{ar['name']} ({st})"
    return None, None
res = []
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    name, g, c = (line.split('|') + ['', ''])[:3]
    rec = {'n': name, 'status': 'skip'}
    d = get('artist/', {'query': f'artist:"{name}" AND country:BR', 'limit': 10})
    cands = [a for a in (d or {}).get('artists', []) if norm(a['name']) == norm(name) or any(norm(x.get('name', '')) == norm(name) for x in a.get('aliases', []))]
    cands = [a for a in cands if a.get('country') == 'BR']
    if len(cands) != 1:
        rec['motivo'] = 'MusicBrainz: ' + ('sem artista brasileiro com esse nome' if not cands else f'{len(cands)} homônimos brasileiros (ambíguo)')
        res.append(rec); continue
    mbid = cands[0]['id']
    art = get('artist/' + mbid, {'inc': 'url-rels+release-groups+artist-rels+genres'})
    if not art: rec['motivo'] = 'MusicBrainz: ficha indisponível'; res.append(rec); continue
    rgs = [r for r in art.get('release-groups', []) if r.get('primary-type') in ('Album', 'Single', 'EP') and not r.get('secondary-types') and yr(r.get('first-release-date'))]
    rgs.sort(key=lambda r: r['first-release-date'])
    if not rgs: rec['motivo'] = 'MusicBrainz: sem lançamento próprio datado'; res.append(rec); continue
    d0 = yr(rgs[0]['first-release-date'])
    ls = art.get('life-span', {})
    b = yr(ls.get('begin')); x = yr(ls.get('end')) if ls.get('ended') else None
    person = art.get('type') == 'Person'
    if person and b and (d0 - b < 8 or d0 - b > 75):
        rec['motivo'] = f'MusicBrainz: estreia {d0} incoerente com nascimento {b} (discografia incompleta?)'; res.append(rec); continue
    if x and d0 > x + 1:
        rec['motivo'] = f'MusicBrainz: primeiro lançamento {d0} depois do fim/morte {x} (póstumo)'; res.append(rec); continue
    cc, lugar = city_of(art)
    j = {'n': name, 'g': g, 'c': cc or c, 'd': d0, 't': 3, 'ap': ['d'], 'status': 'ok', 'apelidos': [], 'confirmar': []}
    if not cc: j['confirmar'].append('cidade do jogo = sugestão da lista (MusicBrainz sem área)')
    if lugar: j['cityNote'] = lugar
    if person:
        if b: j['b'] = b
        if x: j['x'] = x; j['e'] = x
        j['r'] = 'vocal'
    else:
        if b and b < d0 - 1: j['f'] = b
        if x: j['e'] = x
        mem = []
        for r in art.get('relations', []):
            if r.get('type') == 'member of band' and r.get('direction') == 'backward' and r.get('artist'):
                mi, mo = yr(r.get('begin')), yr(r.get('end'))
                row = [r['artist']['name'], 'vocal', None, None, mi if mi and mi > d0 else None, mo]
                if row[0] not in [m[0] for m in mem]: mem.append(row)
        if mem: j['m'] = mem[:6]; j['ap'].append('m'); j['confirmar'].append('papéis dos integrantes não vêm do MusicBrainz (todos como vocal)')
    al = [r for r in rgs if r.get('primary-type') == 'Album'][:2] + [r for r in rgs if r.get('primary-type') == 'Single'][:1]
    j['al'] = [[r['title'], yr(r['first-release-date']), 'lp' if r['primary-type'] == 'Album' else ('single' if r['primary-type'] == 'Single' else 'ep')] for r in al]
    urls = [f'https://musicbrainz.org/artist/{mbid}'] + [u['url']['resource'] for u in art.get('relations', []) if u.get('type') in ('wikidata', 'wikipedia') and u.get('url')][:3]
    j['fontes'] = urls
    j['nt'] = {'anos': ((x or 2026) - d0), 'discos': len([r for r in rgs if r.get('primary-type') == 'Album']), 'lancamentos': len(rgs), 'fonte': 'MusicBrainz'}
    j['confirmar'].append('estreia = lançamento original mais antigo no MusicBrainz (discografia pode estar incompleta)')
    res.append(j)
    print(name, '->', d0, cc, flush=True)
with open(OUT, 'w') as f:
    for r in res: f.write(json.dumps(r, ensure_ascii=False) + '\n')
print('ok', sum(r['status'] == 'ok' for r in res), 'skip', sum(r['status'] != 'ok' for r in res))
