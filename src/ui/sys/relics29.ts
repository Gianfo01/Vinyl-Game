// R29 (relíquias procedurais): pedaços de interface que as telas de sempre usam para as peças do relics29 —
// arquétipo, estado, procedência e a história montada na hora. Nada de tela nova: entram na ficha da relíquia
// (Lendas → Relíquias), no Acervo vivo e no museu do selo.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { ARCHDEF29, COND29, PROV29, meta29, story29, type Prov29 } from '../../sim/sys/relics29';
import type { Relic } from '../../sim/sys/relics9';
import type { GameState } from '../../sim/types';
import { pill, section } from '../common';
import { h } from '../dom';

/** Com quem está agora: o estado da peça manda (comprada, no museu, roubada, em leilão); senão, a procedência de origem. */
const holder = (rl: Relic, prov: Prov29): Prov29 => (rl.st === 'player' ? 'p' : rl.st === 'museum' ? 'm' : rl.st === 'stolen' ? 'b' : rl.st === 'auction' ? 'u' : prov === 'p' || prov === 'u' || prov === 'b' || prov === 'm' ? 'c' : prov);
/** Pílulas curtas (arquétipo, estado, procedência) — ou null se a peça não é procedural. */
export function relic29Pills(s: GameState, rl: Relic): HTMLElement | null {
  const m = meta29(s, rl.id);
  if (!m) return null;
  return h('span', { class: 'r29-pills' },
    pill(t(ARCHDEF29[m.arch].name)), ' ',
    pill(`${t(l('estado', 'condition'))}: ${t(COND29[m.cond] ?? COND29[1])}`, m.cond >= 3 ? 'bad' : m.cond === 0 ? 'good' : ''), ' ',
    pill(t(PROV29[holder(rl, m.prov)] ?? PROV29.a)));
}

/** Seção "Versão de um arquétipo real" da ficha: história, estado, procedência e o porquê do valor. */
export function relic29Section(s: GameState, rl: Relic): HTMLElement | null {
  const m = meta29(s, rl.id);
  const st = m ? story29(s, rl) : null;
  if (!m || !st) return null;
  const d = ARCHDEF29[m.arch];
  return section(t(l('História da peça', 'The piece\'s story')),
    h('p', null, t(st)),
    relic29Pills(s, rl),
    h('p', { class: 'muted small' }, t(l('Versão procedural de "{a}", um arquétipo das relíquias reais. O valor anda com o legado do artista (fama, nº 1, prêmios, lenda), sobe na morte de quem usou a peça, em voltas e aniversários, e o escândalo mexe nele. Falsificações circulam no mercado negro: na dúvida, perícia.',
      'A procedural version of "{a}", an archetype of real relics. The value moves with the artist\'s legacy (fame, #1s, awards, legend), rises on the death of whoever used it, on comebacks and anniversaries, and scandal moves it. Forgeries circulate on the black market: when in doubt, get an appraisal.'), { a: t(d.name) })));
}
