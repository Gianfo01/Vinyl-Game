"""Exporta todas as fichas para o jogo: corpo 96×152 e busto 64×64 nativos + index.json.

  python3 export.py ../specs/lotes/lote_??.jsonl --out ../../../../art/personagens

Saída: <out>/corpo/<slug>.png, <out>/busto/<slug>.png e <out>/index.json
({nome: {ano, arquivo, conf, ref, papel, genero, atos}}). Também gera <out>/_mosaico.png (todos os bustos).
"""
import argparse, json, os, sys
from multiprocessing import Pool
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import build
from render import slug

OUT = None


def work(spec):
    im = build(spec).render(1)
    fn = slug(spec['name']) + '.png'
    im.save(os.path.join(OUT, 'corpo', fn), optimize=True)
    im.crop((15, 4, 79, 68)).save(os.path.join(OUT, 'busto', fn), optimize=True)
    m = spec.get('_meta', {})
    return spec['name'], {'ano': spec.get('year'), 'arquivo': fn, 'conf': spec.get('conf'), 'ref': spec.get('ref'),
                          'papel': m.get('role'), 'genero': m.get('genre'), 'atos': m.get('acts')}


def init(out):
    global OUT
    OUT = out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('specs', nargs='+')
    ap.add_argument('--out', required=True)
    ap.add_argument('--jobs', type=int, default=os.cpu_count() or 4)
    a = ap.parse_args()
    for d in ('corpo', 'busto'):
        os.makedirs(os.path.join(a.out, d), exist_ok=True)
    specs = []
    for p in a.specs:
        with open(p, encoding='utf-8') as fh:
            specs += [json.loads(l) for l in fh if l.strip()] if p.endswith('.jsonl') else [json.load(fh)]
    with Pool(a.jobs, initializer=init, initargs=(a.out,)) as pool:
        idx = dict(pool.map(work, specs, chunksize=16))
    with open(os.path.join(a.out, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump(idx, fh, ensure_ascii=False, indent=1, sort_keys=True)
    # mosaico de todos os bustos (prévia)
    names = sorted(idx)
    cols = 60
    rows = (len(names) + cols - 1) // cols
    mos = Image.new('RGBA', (cols * 64, rows * 64), (40, 30, 34, 255))
    for i, n in enumerate(names):
        b = Image.open(os.path.join(a.out, 'busto', idx[n]['arquivo']))
        mos.alpha_composite(b, ((i % cols) * 64, (i // cols) * 64))
    mos.save(os.path.join(a.out, '_mosaico.png'), optimize=True)
    print(len(idx), 'personagens em', a.out)


if __name__ == '__main__':
    main()
