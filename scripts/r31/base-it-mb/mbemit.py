import json, os
D = os.path.join(os.path.dirname(__file__), 'mb')
acts = [a for a in json.load(open(os.path.join(D, 'acts.json'))) if a['n'] not in ('Sabrina Salerno', 'Alessandro Mannarino')]  # mesma pessoa que 'Sabrina' (manual) e 'Mannarino' (base)
P = os.path.join(os.path.dirname(__file__), '../../../src/data/base31it.ts')
def q(s): return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"
def num(v): return 'u' if v is None else str(v)
lines = []
for a in sorted(acts, key=lambda a: (a['d'], a['n'])):
    al = '[' + ', '.join(f"[{q(t)}, {y}, '{k}']" for t, y, k in a['al']) + ']'
    o = []
    if a['typ'] == 'Person': o.append(f"r: '{a['r']}'")
    else:
        if a['e'] is not None: o.append(f"e: {a['e']}")
        if a['f'] is not None: o.append(f"f: {a['f']}")
        if a['m']:
            ms = ', '.join('[' + ', '.join([q(m[0]), q(m[1]), 'u', 'u'] + ([num(m[4])] if m[4] is not None or m[5] is not None else []) + ([num(m[5])] if m[5] is not None else [])) + ']' for m in a['m'])
            o.append(f"m: [{ms}]")
    if a['nrg'] < 10: o.append('z: 2')
    if a.get('apd'): o.append("ap: ['d']")
    rc = a['rc'] or ''
    reg = a['reg']
    place = f"{rc} ({reg})" if rc and reg else rc or reg
    if place and not (a['c'] == 'milan' and rc in ('Milano', 'Milan')): o.append(f"rc: {q(place)}")
    o.append(f"cf: [{q('gênero e papel deduzidos das tags do MusicBrainz (' + a['gtag'] + ')')}]")
    lines.append(f"mb({q(a['n'])}, '{a['g']}', '{a['c']}', {a['d']}, {num(a['b'] if a['typ']=='Person' else None)}, {num(a['x'])}, {al}, '{a['mbid']}', '{a['wd']}', {{ {', '.join(o)} }});")
src = open(P).read()
i0 = src.index('// @@MB31-START\n') + len('// @@MB31-START\n'); i1 = src.index('// @@MB31-END')
src = src[:i0] + '\n'.join(lines) + ('\n' if lines else '') + src[i1:]
open(P, 'w').write(src)
print(len(lines))
