// Rodada 28 (ARTE) — mais TIPOS de relíquia nascidos de fatos da partida (complementa relics9/relics18, que cuidam de
// guitarras, microfones, fitas, letras, troféus, figurinos, carros e fotos). Aqui entram as peças "de memorabilia":
// disco de ouro/platina emoldurado (certificação sua), cartaz e ingresso do festival e do show histórico, setlist do
// retorno, ingresso da volta da banda, baquetas do baterista que morreu, amplificador/sintetizador/sopro da lenda
// (pelo instrumento do líder), jukebox do clube que fechou, caderno da canção do fim, foto do supergrupo.
// Cada uma tem desenho próprio (ui/pixel/relic28). Nada de estado novo: usa a lista de relics9 e a meta/dedupe de relics18.
// Modo exato: nada é inventado para ato real intocado (histLocked), como em relics18.

import { l, type L } from '../../data/world';
import { histLocked } from '../history15';
import type { Act, GameState } from '../types';
import { fmtL } from '../util';
import { chronListeners, cityL, nameOf, type ChronEv } from './chron9';
import { addRelic, relMeta, relics, type RelicKind } from './relics9';
import { rel18 } from './relics18';

const lead = (a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]);
const count = (s: GameState, a: Act, k: RelicKind) => relics(s).list.filter((x) => x.a === a.id && x.k === k).length;

function born28(s: GameState, k: RelicKind, n: L, a: Act | undefined, pid: string | undefined, v: number, o: string, story: L, max = 2): void {
  if (a && count(s, a, k) >= max) return;
  const st = rel18(s);
  const key = `r28:${k}:${a?.id ?? n.en}:${s.year}`;
  if (st.seen[key]) return;
  st.seen[key] = 1;
  const rl = addRelic(s, k, n, a?.id, pid, v);
  Object.assign(relMeta(rl), { o, b: rl.v, st: story });
}

chronListeners().push((s: GameState, e: ChronEv) => {
  const a = e.a?.[0] ? s.acts[e.a[0]] : undefined;
  if (a && histLocked(s, a)) return;
  const fame = a?.fame ?? 30;
  const big = !!a && (a.fame >= 35 || a.owner === 'player' || !!a.playerBand || a.legend);
  const pl = a ? lead(a) : undefined;
  const ln = pl ? nameOf(s, pl) : a?.name ?? '?';
  switch (e.k) {
    case 'cert': {
      if (!a) return;
      const plat = /platinum|diamond/i.test(e.t.en);
      born28(s, 'goldrec', fmtL(plat ? l('O disco de platina emoldurado de {a} ({y})', '{a}\'s framed platinum record ({y})') : l('O disco de ouro emoldurado de {a} ({y})', '{a}\'s framed gold record ({y})'), { a: a.name, y: e.y }), a, undefined, 6000 + fame * 500, 'hit', e.t, 3);
      return;
    }
    case 'festival': case 'festival8':
      if (a && big && fame >= 45) born28(s, 'poster', fmtL(l('O cartaz do festival com {a} ({y})', 'The festival poster billing {a} ({y})'), { a: a.name, y: e.y }), a, undefined, 2500 + fame * 250, 'show', e.t);
      return;
    case 'legendary_show': case 'liveaid': case 'mega_event':
      if (!a || !big) return;
      born28(s, 'ticket', fmtL(l('Um ingresso do show histórico de {a} ({y})', 'A ticket from {a}\'s historic show ({y})'), { a: a.name, y: e.y }), a, undefined, 1500 + fame * 200, 'show', e.t);
      if (e.k === 'legendary_show') born28(s, 'setlist', fmtL(l('A setlist do show histórico de {a} ({y})', '{a}\'s setlist from the historic show ({y})'), { a: a.name, y: e.y }), a, undefined, 3000 + fame * 300, 'show', e.t);
      return;
    case 'reunion': case 'comeback':
      if (!a || !big) return;
      born28(s, e.k === 'reunion' ? 'ticket' : 'setlist', fmtL(e.k === 'reunion' ? l('O ingresso da volta de {a} ({y})', 'The ticket from {a}\'s reunion ({y})') : l('A setlist do retorno de {a} ({y})', '{a}\'s comeback setlist ({y})'), { a: a.name, y: e.y }), a, undefined, 2000 + fame * 250, 'show', e.t);
      return;
    case 'death': {
      if (!a || e.i < 3) return;
      const pid = e.a?.find((x) => s.persons[x] && !s.persons[x].alive);
      const p = pid ? s.persons[pid] : undefined;
      if (p?.role === 'drums') born28(s, 'sticks', fmtL(l('As baquetas de {p}', '{p}\'s drumsticks'), { p: p.name }), a, pid, 4000 + fame * 500, 'death', e.t, 1);
      return;
    }
    case 'legend': case 'hall_of_fame': {
      if (!a || !pl) return;
      const role = s.persons[pl]?.role;
      if (role === 'guitar' || role === 'bass') born28(s, 'amp', fmtL(l('O amplificador de {p}', '{p}\'s amplifier'), { p: ln }), a, pl, 9000 + fame * 700, 'base', e.t, 1);
      else if (role === 'keys') born28(s, 'synth', fmtL(e.y >= 1968 && e.y < 2000 ? l('O sintetizador de {p}', '{p}\'s synthesizer') : l('O teclado de {p}', '{p}\'s keyboard'), { p: ln }), a, pl, 9000 + fame * 700, 'base', e.t, 1);
      else if (role === 'horns') born28(s, 'horn', fmtL(l('O sopro de {p}', '{p}\'s horn'), { p: ln }), a, pl, 9000 + fame * 700, 'base', e.t, 1);
      return;
    }
    case 'club_closed':
      if (e.c && (relics(s).list.filter((x) => x.k === 'jukebox').length < 4)) born28(s, 'jukebox', fmtL(l('A jukebox de um clube lendário de {c} ({y})', 'The jukebox from a legendary {c} club ({y})'), { c: cityL(e.c), y: e.y }), undefined, undefined, 5000, 'scene', e.t, 9);
      return;
    case 'breakup_song':
      if (a && big) born28(s, 'notebook', fmtL(l('O caderno de {p} com a canção do fim', '{p}\'s notebook with the break-up song'), { p: ln }), a, pl, 4000 + fame * 300, 'base', e.t, 1);
      return;
    case 'supergroup':
      if (a) born28(s, 'photo', fmtL(l('A foto da primeira sessão do supergrupo {a}', 'The first-session photo of supergroup {a}'), { a: a.name }), a, undefined, 3000 + fame * 300, 'cover', e.t, 1);
      return;
  }
});
