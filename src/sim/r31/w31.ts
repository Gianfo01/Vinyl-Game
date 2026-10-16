// R31 · onda 4 (W) — MECÂNICAS EM CENA 2: as duas regras novas que as cenas pedem (cada uma atrás de interruptor) e as
// contas puras que a cena mostra no rosto das pessoas. A cena (ui/r31/scene31w.ts) só lê daqui e decide pelas funções
// de sempre (payDJs, pitchLegit, lunchPd18, buy31, takeLoan…); estas regras valem também no formulário antigo.
//
//   w31.jaba      — o envelope ao diretor de programação: ACEITA, RECUSA COM DESPREZO ou DENUNCIA, conforme a época
//                   (jabá tolerado → ilegal → promotores → curadores), a lei do país, a relação com ele e o calor do
//                   esquema. Sorte pura por chave (Rng.fromSeed: semana, nível, estação) — não mexe em fluxo nenhum.
//                   Recusa: não paga, a relação cai. Denúncia: não paga, vira fato público, calor sobe, reputação cai.
//   w31.antitrust — compra grande demais chama o antitruste: controlar (> 50%) mais negócios do mesmo tipo no mesmo
//                   país do que o teto, ou mais de 40% do público desse tipo no país, trava a compra (motivo antes do
//                   clique). Só depois de 1950 (órgãos de defesa da concorrência).

import { Rng, clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { l, type L } from '../../data/world';
import { emitFact } from '../facts17';
import { radio18, type Station18 } from '../sys/radio18';
import { lawRisk31 } from '../sys/car31media';
import { socio31, targets31, BUY_GATE31, SKIND31, TOTAL31, type SKind31 } from '../sys/socio31';
import { PAYOLA_GATE31, payolaEra, type PayolaEra } from '../sys/world4/charts';
import { w4 } from '../sys/world4/state';
import type { GameState } from '../types';
import { fmtL } from '../util';
import { registerEditable } from './editor';
import { registerSwitch, sw } from './switches';

export const SW_JABA31 = 'w31.jaba';
export const SW_ANTI31 = 'w31.antitrust';
registerSwitch({
  id: SW_JABA31, def: true, scope: 'game',
  desc: l('Jabá em cena: o diretor de programação pode recusar o envelope (a relação cai) ou denunciar (escândalo, calor e reputação), conforme a época, a lei do país e a relação; desligado, todo envelope é aceito como antes.',
    'Payola on stage: the program director may refuse the envelope (the relationship drops) or report it (scandal, heat and reputation), by era, the country\'s law and the relationship; off, every envelope is accepted as before.'),
});
registerSwitch({
  id: SW_ANTI31, def: true, scope: 'game',
  desc: l('Antitruste nas compras: a partir de 1950, controlar negócios demais do mesmo tipo no mesmo país (ou mais de 40% do público) trava a compra; desligado, compra-se sem limite.',
    'Antitrust on buyouts: from 1950, controlling too many businesses of one kind in one country (or over 40% of the audience) blocks the purchase; off, there is no limit.'),
});

// ---------------------------------------------------------------- jabá: o rosto do diretor

/** chance base [recusa, denúncia] por época */
const ERA31: Record<PayolaEra, [number, number]> = { legal: [0.04, 0.01], indie: [0.07, 0.03], illegal: [0.1, 0.05], curator: [0.14, 0.04] };

/** Estação de referência do envelope: a da cena (contexto) ou a de maior alcance. Só leitura. */
let ctxStation: string | undefined;
export function withJabaStation31<T>(stId: string | undefined, fn: () => T): T {
  const prev = ctxStation;
  ctxStation = stId;
  try { return fn(); } finally { ctxStation = prev; }
}
export function jabaStation31(s: GameState, stId = ctxStation): Station18 | undefined {
  const st = (s.x4 as unknown as { radio18?: { st?: Station18[] } }).radio18?.st ?? [];
  return (stId ? st.find((x) => x.id === stId) : undefined) ?? [...st].sort((a, b) => b.reach - a.reach || (a.id < b.id ? -1 : 1))[0];
}

/** Risco de [recusa, denúncia] do envelope de nível `tier` para esta estação agora (0..1). Puro. */
export function jabaRisk31(s: GameState, tier: number, x?: Station18): [number, number] {
  const [r0, d0] = ERA31[payolaEra(s)];
  const rel = x?.rel ?? 25;
  const heat = w4(s).payola.heat;
  const law = lawRisk31(countryOfCity(s.config.homeCity) ?? 'USA', s.year);
  const k = clamp(1.4 - rel / 100, 0.5, 1.4) * (1 + tier * 0.15);
  return [clamp(r0 * k, 0, 0.5), clamp((d0 + heat / 1000) * k * (0.4 + 0.6 * law), 0, 0.4)];
}

export type JabaFace31 = 'eager' | 'glance' | 'sweat' | 'stern';
/** O risco aparece no rosto dele, não em porcentagem. */
export function jabaFace31(s: GameState, tier: number, x?: Station18): JabaFace31 {
  const [a, b] = jabaRisk31(s, tier, x);
  const r = a + b * 1.5;
  return r < 0.07 ? 'eager' : r < 0.14 ? 'glance' : r < 0.24 ? 'sweat' : 'stern';
}
/** Você conhece o diretor o bastante para ler o rosto? (relação ≥ 40 = já jantaram, já negociaram) */
export const jabaClear31 = (x?: Station18): boolean => (x?.rel ?? 0) >= 40;

/** Portão do payDJs: com o interruptor ligado, decide (sorte pura por chave) se o diretor aceita. */
PAYOLA_GATE31.push((s, tier) => {
  if (!sw<boolean>(s, SW_JABA31)) return null;
  const x = jabaStation31(s);
  if (!x) return null;
  const [ref, rep] = jabaRisk31(s, tier, x);
  const roll = Rng.fromSeed(`${s.config.seed}|w31jaba|${s.week}|${tier}|${x.id}`).next();
  if (roll >= ref + rep) return null;
  const w = w4(s).payola;
  w.lastWeek = s.week; // a tentativa ocupa a semana, como o pagamento
  if (roll < rep) {
    x.rel = clamp(x.rel - 25, 0, 100);
    w.heat = clamp(w.heat + 15, 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
    const text = fmtL(l('{pd}, da {c}, devolve o envelope na frente da equipe e conta tudo à imprensa: "o selo quis comprar a minha grade".', '{pd} of {c} hands the envelope back in front of the staff and tells the press: "the label tried to buy my playlist".'), { pd: x.pd, c: x.call });
    emitFact(s, { kind: 'payola', actors: ['player'], severity: 50, visibility: 'public', tags: ['crime', 'payola', 'radio', 'scandal', 'w31'], text, src: 'w31', diary: true, notify: 'bad' });
    return fmtL(l('{pd} denunciou o envelope. Nada foi pago; o escândalo é público.', '{pd} reported the envelope. Nothing was paid; the scandal is public.'), { pd: x.pd });
  }
  x.rel = clamp(x.rel - 10, 0, 100);
  emitFact(s, { kind: 'payola_refused', actors: ['player'], severity: 15, visibility: 'secret', tags: ['payola', 'radio', 'w31'], text: fmtL(l('{pd} empurra o envelope de volta com desprezo: "aqui não".', '{pd} pushes the envelope back with contempt: "not here".'), { pd: x.pd }), src: 'w31', diary: true });
  return fmtL(l('{pd} recusou o envelope com desprezo. Nada foi pago; a relação esfriou.', '{pd} refused the envelope with contempt. Nothing was paid; the relationship cooled.'), { pd: x.pd });
});

// ---------------------------------------------------------------- antitruste

/** teto de negócios controlados do mesmo tipo no mesmo país */
export const ANTI_MAX31: Record<SKind31, number> = { fest: 3, venue: 5, radio: 3, studio: 5 };
export const ANTI_SHARE31 = 0.4;

export interface Anti31 { n: number; max: number; share: number; country: string; blocked: boolean }
/** Concentração depois de comprar `bp` de `id` (só leitura). */
export function antitrust31(s: GameState, id: string, bp: number): Anti31 | null {
  const all = targets31(s, true);
  const t = all.find((x) => x.id === id);
  const st = socio31(s);
  const b = st.b[id];
  const kind = t?.kind ?? b?.kind;
  const city = t?.city ?? b?.city;
  if (!kind || !city) return null;
  const country = countryOfCity(city) ?? '';
  const same = (c: string) => (countryOfCity(c) ?? '') === country;
  const ctl = (x: { me: number }) => x.me > TOTAL31 / 2;
  const mine = Object.values(st.b).filter((x) => x.kind === kind && same(x.city) && x.id !== id && ctl(x));
  const after = (b?.me ?? 0) + bp;
  const n = mine.length + (after > TOTAL31 / 2 ? 1 : 0);
  const cap = (x: string) => all.find((y) => y.id === x)?.cap ?? 0;
  const tot = all.filter((x) => x.kind === kind && same(x.city)).reduce((t0, x) => t0 + x.cap, 0);
  const myCap = mine.reduce((t0, x) => t0 + cap(x.id), 0) + (after > TOTAL31 / 2 ? cap(id) : 0);
  const share = tot > 0 ? myCap / tot : 0;
  const max = ANTI_MAX31[kind];
  return { n, max, share, country, blocked: s.year >= 1950 && after > TOTAL31 / 2 && (n > max || (share > ANTI_SHARE31 && mine.length > 0)) };
}

BUY_GATE31.push((s, id, bp) => {
  if (!sw<boolean>(s, SW_ANTI31)) return null;
  const a = antitrust31(s, id, bp);
  if (!a?.blocked) return null;
  const kind = socio31(s).b[id]?.kind ?? targets31(s, true).find((x) => x.id === id)?.kind ?? 'venue';
  return {
    why: a.n > a.max
      ? fmtL(l('O órgão antitruste veta: você passaria a controlar {n} {k} no mesmo país (teto {m}).', 'The antitrust authority blocks it: you would control {n} {k} in the same country (cap {m}).'), { n: a.n, k: SKIND31[kind].plural, m: a.max })
      : fmtL(l('O órgão antitruste veta: você passaria a ter {p}% do público de {k} no país (teto 40%).', 'The antitrust authority blocks it: you would hold {p}% of the {k} audience in the country (cap 40%).'), { p: Math.round(a.share * 100), k: SKIND31[kind].plural }),
    unlock: l('Compre uma fatia minoritária (até 50%), venda o controle de outro negócio do mesmo tipo ou compre noutro país.', 'Buy a minority slice (up to 50%), sell control of another business of the same kind or buy in another country.'),
  };
});

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({
  id: 'w31.anti.max', area: 'world', kind: 'number', min: 1, max: 20, step: 1, raw: true,
  label: l('Antitruste: teto de rádios controladas por país', 'Antitrust: cap of controlled radio stations per country'),
  help: l('Quantas rádios do mesmo país você pode controlar antes do veto (as outras categorias seguem a tabela).', 'How many stations in one country you may control before the veto (other kinds follow the table).'),
  get: () => ANTI_MAX31.radio,
  set: (_s, v) => { ANTI_MAX31.radio = clamp(Math.round(Number(v)), 1, 20); },
});

/** Rótulo do rosto (texto da cena). */
export const JABA_FACE31: Record<JabaFace31, { icon: string; label: L }> = {
  eager: { icon: '🤑', label: l('Guarda o envelope sem nem olhar', 'Pockets the envelope without even looking') },
  glance: { icon: '👀', label: l('Olha para os lados antes de pegar', 'Glances around before taking it') },
  sweat: { icon: '😰', label: l('Sua frio e olha para a porta', 'Breaks into a cold sweat, eyes on the door') },
  stern: { icon: '😐', label: l('Encara você, sério, sem tocar no envelope', 'Stares at you, stern, without touching the envelope') },
};
export { radio18 };
