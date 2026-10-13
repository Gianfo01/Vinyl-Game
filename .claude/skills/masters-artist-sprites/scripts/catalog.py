"""Gera a folha-catálogo de cabelos e roupas disponíveis (para escolher peças ao montar fichas).
  python3 catalog.py --out /tmp/cat   →  /tmp/cat/cabelos.png e /tmp/cat/roupas.png"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import build
from render import sheet
from looks import HAIR

HAIRS = list(dict.fromkeys(list(HAIR.values()) + ['flattop', 'curls_long']))
TOPS = [('suit', {'tie': 'tie'}), ('tux', {'tie': 'bow', 'lapel': '#3a3640'}), ('jacket_open', {}), ('coat_long', {}),
        ('shirt', {}), ('open_shirt', {'pattern': 'floral'}), ('tshirt', {'sleeves': 'short'}), ('tank', {'sleeves': 'bare'}),
        ('turtleneck', {}), ('sweater', {}), ('hoodie', {}), ('denim_jacket', {'color': '#4a6a9a'}),
        ('leather_jacket', {'color': '#2a2428', 'shiny': True}), ('tracksuit', {'sleeve_stripe': '#f4f2ee'}),
        ('tunic', {'pattern': 'african'}), ('vest', {'shirt': '#ece4d4'}), ('military', {}), ('open_military', {'color': '#f0c02c'}),
        ('fringe_jacket', {'color': '#ece2cc', 'sleeve_fringe': True}), ('jumpsuit', {'color': '#efebe2', 'pattern': 'eagle'}),
        ('blouse', {'pattern': 'polka', 'pattern_color': '#f4f0e6'}), ('dress', {}), ('gown', {}), ('crop', {'sleeves': 'bare'}),
        ('sari', {}), ('qipao', {'pattern': 'floral'}), ('hanbok', {}), ('kaftan', {}), ('robe', {}), ('kimono', {}),
        ('poncho', {}), ('shawl', {}), ('bare_chest', {})]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default='cat'); ap.add_argument('--scale', type=int, default=4)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    items = []
    for i, h in enumerate(HAIRS):
        sk = ['claro', 'medio', 'moreno', 'escuro'][i % 4]
        hc = ['#3d2616', '#1e1814', '#dcb862', '#8e3a1e', '#6e4426'][i % 5]
        s = {'name': h, 'body': {'skin': sk}, 'hair': {'style': h, 'color': hc}, 'top': {'style': 'tshirt', 'color': '#5a6a8a', 'sleeves': 'short'},
             'bottom': {'style': 'jeans'}, 'pose': 'stand'}
        items.append((h, '', build(s).render(a.scale)))
    sheet(items, os.path.join(a.out, 'cabelos.png'), a.scale)
    items = []
    for i, (st, extra) in enumerate(TOPS):
        f = st in ('blouse', 'dress', 'gown', 'crop', 'sari', 'qipao', 'hanbok', 'shawl')
        t = {'style': st, 'color': ['#2c4a7e', '#a33434', '#2f7a4c', '#6a4590', '#d8692a'][i % 5]}
        t.update(extra)
        b = {'style': 'skirt_full', 'color': '#3a6ab0'} if st == 'hanbok' else {'style': 'skirt_long', 'color': t['color']} if st in ('dress', 'gown', 'sari', 'qipao') else ({'style': 'skirt', 'color': '#2a2a34'} if f else {'style': ['pants', 'jeans', 'flare'][i % 3]})
        s = {'name': st, 'body': {'sex': 'f' if f else 'm', 'skin': ['claro', 'medio', 'moreno'][i % 3]},
             'hair': {'style': 'bob' if f else 'short', 'color': '#3d2616'}, 'face': {'mouth': 'lips' if f else 'neutral', 'lashes': f},
             'top': t, 'bottom': b, 'pose': 'stand'}
        items.append((st, '', build(s).render(a.scale)))
    sheet(items, os.path.join(a.out, 'roupas.png'), a.scale)


if __name__ == '__main__':
    main()
