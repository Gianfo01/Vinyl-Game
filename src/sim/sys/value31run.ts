// R31 · onda 3 (E · Bolsa) — registro no editor dentro da partida (regra 10) do modelo único de valor (r31/value31).
// Sem ganchos de simulação: o preço anda dentro dos pregões que já existem (business.listingMonth e bolsa10).

import { l, type L } from '../../data/world';
import { registerEditable, registerRunnable } from '../r31/editor';
import { companyValue31, money31, PART31, SW_VALUE31, val31, value31On } from '../r31/value31';
import { setSw } from '../r31/switches';
import type { GameState } from '../types';
import { fmtL } from '../util';

registerEditable({
  id: 'bolsa31.on', area: 'companies', kind: 'bool',
  label: l('Bolsa: preço pelo valor real da empresa', 'Exchange: price by the real company value'),
  help: l('Desligado volta ao preço sorteado por lucro e crescimento (com o escorregão de janeiro) e aos solavancos por notícia.', 'Off reverts to the profit/growth random price (with the January slip) and news jolts.'),
  get: (s) => value31On(s),
  set: (s, v) => { setSw(s, SW_VALUE31, !!v); },
});
registerEditable({
  id: 'bolsa31.mood', area: 'companies', target: 'label', kind: 'number', min: -12, max: 12, raw: true,
  label: l('Humor do mercado sobre o selo (%)', 'Market mood on the label (%)'),
  get: (s, id) => Math.round((val31(s).mood[id ?? ''] ?? 0) * 100),
  set: (s, v, id) => { if (!id || !s.labels[id]) return l('Escolha um selo.', 'Pick a label.'); val31(s).mood[id] = Math.max(-0.12, Math.min(0.12, Number(v) / 100)); },
});

function sheetText(s: GameState, id: string): L {
  const v = companyValue31(s, id);
  const top = v.parts.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 4);
  return fmtL(l('Valor {v}. Maiores partes: {p}.', 'Value {v}. Largest parts: {p}.'), {
    v: money31(v.total),
    p: l(top.map((x) => `${PART31[x.k].pt} ${money31(x.v).pt}`).join('; '), top.map((x) => `${PART31[x.k].en} ${money31(x.v).en}`).join('; ')),
  });
}
registerRunnable({ id: 'bolsa31.value.me', area: 'companies', label: l('Bolsa: valor do seu selo (conta por parte)', 'Exchange: your label\'s value (by part)'), run: (s) => sheetText(s, 'player') });
registerRunnable({ id: 'bolsa31.value.label', area: 'companies', target: 'label', label: l('Bolsa: valor deste selo (conta por parte)', 'Exchange: this label\'s value (by part)'), run: (s, id) => (id && s.labels[id] ? sheetText(s, id) : l('Escolha um selo.', 'Pick a label.')) });
