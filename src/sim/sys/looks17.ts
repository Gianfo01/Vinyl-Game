// Rodada 17 — APARÊNCIA É JOGO (com cuidado e explicado). Soma às barreiras históricas de persona13 (rádio
// segregada, MTV, machismo) o que faltava: (1) a virada por diversidade (anos 2010+: curadorias, festivais com
// meta de paridade como o Keychange de 2018, academias de prêmios ampliando o júri) que dá visibilidade a
// mulheres, artistas negros/pardos e LGBT assumidos — nos mercados onde ela aconteceu; (2) o selo do jogador:
// dono(a) negro(a) em época de segregação paga mais caro na distribuição, mas artistas negros confiam mais
// (Motown, Stax); (3) etarismo na era da imagem (MTV/redes) para pop; (4) uma leitura única com o porquê de cada
// efeito para a interface (ficha do personagem, página do ato). Nada aqui é sorteio: tudo é contexto.

import { countryOfCity } from '../../data/geo';
import { cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerMod, registerOfferMod } from '../ext4';
import type { Act, GameState, Person } from '../types';
import { fmtL } from '../util';
import { juryMemHook } from './awards15';
import { playerPerson } from './life';
import { barriers13, imageWeight, ownerBarrier, per13 } from './persona13';
import { isQueer, sexOf } from './sex17';

export interface Look17 { k: 'img' | 'race' | 'sex' | 'owner' | 'div' | 'age' | 'dist' | 'lgbt'; m: number; why: L; niche?: L; fought?: L }

const front = (s: GameState, a: Act): Person | undefined => {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  return ms.find((p) => p.role === 'vocal' || p.role === 'mc') ?? ms[0];
};
const mkt = (cityId: string): MarketId => (cityById[cityId]?.market ?? 'na') as MarketId;
/** Mercados (e ano) onde a virada por diversidade aconteceu de fato. */
function diversityPush(market: MarketId, a3: string | null, y: number): number {
  if (y < 2014) return 0;
  const base = market === 'na' || market === 'eu' || market === 'oceania' ? 1 : market === 'br' || market === 'latam' ? 0.7 : 0.3;
  const ramp = y < 2016 ? 0.4 : y < 2018 ? 0.7 : 1;
  return base * ramp * (a3 === 'USA' || a3 === 'GBR' || a3 === 'CAN' ? 1.1 : 1);
}

/** Virada por diversidade: visibilidade extra (multiplicador ≥ 1) e o porquê. */
export function diversity17(s: GameState, a: Act, cityId?: string): Look17 | null {
  const city = cityId ?? a.city;
  const k = diversityPush(mkt(city), countryOfCity(city), s.year);
  if (!k) return null;
  const f = front(s, a);
  if (!f) return null;
  const P = per13(s, `p:${f.id}`);
  const x = sexOf(s, f.id);
  const who: string[] = [];
  if (P?.sex === 'f' && ['rock', 'hiphop', 'electronic', 'country_folk'].includes(familyOf(a.genre))) who.push(l('mulher num gênero dominado por homens', 'a woman in a male-dominated genre').pt);
  if ((P?.skin ?? 0) >= 2) who.push(l('artista negro(a)/pardo(a)', 'a Black/brown artist').pt);
  if (isQueer(x) && x.c === 'out') who.push(l('artista LGBT assumido(a)', 'an out LGBT artist').pt);
  if (!who.length) return null;
  const m = 1 + 0.025 * k * Math.min(2, who.length);
  return { k: 'div', m, why: fmtL(l('Virada por diversidade ({y}): curadorias, festivais com meta de paridade e júris ampliados procuram {w}. Ajuda a abrir portas — o resto é música.', 'Diversity push ({y}): playlists, festivals with parity pledges and broadened juries look for {w}. It opens doors — the rest is music.'), { y: s.year, w: who.join(', ') }) };
}
/** Etarismo na era da imagem: pop/dance com frente acima dos 45 perde um pouco de alcance novo. */
export function ageism17(s: GameState, a: Act): Look17 | null {
  const f = front(s, a);
  if (!f) return null;
  const age = s.year - f.born;
  const fam = familyOf(a.genre);
  if (age < 45 || !['pop', 'electronic', 'rnb', 'hiphop'].includes(fam)) return null;
  const iw = imageWeight(s.year);
  if (iw.w < 0.1) return null;
  const m = 1 - Math.min(0.06, (age - 44) * 0.0025) * (a.legend ? 0.3 : 1);
  return { k: 'age', m, why: fmtL(l('Etarismo na {e}: frente de {a} anos num gênero jovem — rádio e playlists preferem rostos novos{l}.', 'Ageism in the {e}: a {a}-year-old front in a youth genre — radio and playlists prefer new faces{l}.'), { e: iw.era, a: age, l: a.legend ? l(' (lenda: pesa pouco)', ' (legend: barely matters)').pt : '' }) };
}
registerMod('appeal', 'looks17div', (s, v, c) => { const d = c.act && diversity17(s, c.act); return d ? { value: v * d.m, label: d.why } : null; });
registerMod('appeal', 'looks17age', (s, v, c) => { const d = c.act && ageism17(s, c.act); return d ? { value: v * d.m, label: d.why } : null; });
{
  const prev = juryMemHook.f;
  juryMemHook.f = (s, actId, a3) => {
    let k = prev?.(s, actId, a3) ?? 1;
    const a = s.acts[actId];
    const d = a && s.year >= 2018 ? diversity17(s, a) : null;
    if (d) k *= 1 + (d.m - 1) * 1.4; // academias ampliaram o júri (2018+)
    return k;
  };
}

// ---------------------------------------------------------------- o selo do jogador

const mySkin = (s: GameState): number => playerPerson(s)?.look?.skin ?? per13(s, 'player')?.skin ?? 0;
/** Distribuição segregada: dono(a) negro(a) paga mais caro para prensar/distribuir (EUA até 1965, África do Sul até 1994). */
export function distBarrier17(s: GameState): Look17 | null {
  if (mySkin(s) < 2) return null;
  const a3 = countryOfCity(s.config.homeCity);
  const y = s.year;
  const pen = a3 === 'USA' ? (y < 1955 ? 0.12 : y < 1965 ? 0.08 : y < 1975 ? 0.03 : 0) : a3 === 'ZAF' ? (y < 1994 ? 0.12 : 0) : a3 === 'GBR' ? (y < 1970 ? 0.04 : 0) : 0;
  return pen ? { k: 'dist', m: 1 + pen, why: l('Distribuidoras e lojas segregadas cobram mais e pagam mais tarde de um selo de dono(a) negro(a).', 'Segregated distributors and shops charge more and pay later to a Black-owned label.') } : null;
}
registerMod('pressingCost', 'looks17dist', (s, v) => { const d = distBarrier17(s); return d ? { value: v * d.m, label: d.why } : null; });
registerOfferMod('looks17owner', (s, act) => {
  const f = front(s, act);
  const P = f && per13(s, `p:${f.id}`);
  if (!P) return null;
  const me = mySkin(s);
  const y = s.year;
  if (me >= 2 && P.skin >= 2 && y < 2000) return { delta: 0.04, reason: l('Artista negro(a) confia num selo de dono(a) negro(a) (como a Motown e a Stax).', 'A Black artist trusts a Black-owned label (like Motown and Stax).') };
  if (me >= 2 && P.skin < 2 && y < 1970 && countryOfCity(s.config.homeCity) === 'USA') return { delta: -0.03, reason: l('Época de segregação: parte dos artistas brancos evita um selo de dono(a) negro(a).', 'Segregation era: some white artists avoid a Black-owned label.') };
  return null;
});

/** Leitura única dos efeitos de aparência de um ato (barreiras de persona13 + estes), com o porquê. */
export function lookEffects17(s: GameState, a: Act, cityId?: string): Look17[] {
  const out: Look17[] = [...barriers13(s, a, cityId)];
  const d = diversity17(s, a, cityId); if (d) out.push(d);
  const g = ageism17(s, a); if (g) out.push(g);
  return out;
}
/** Efeitos sobre você como dono(a) do selo. */
export function ownerLook17(s: GameState): Look17[] {
  const out: Look17[] = [];
  const b = ownerBarrier(s); if (b) out.push(b);
  const d = distBarrier17(s); if (d) out.push(d);
  if (mySkin(s) >= 2 && s.year < 2000) out.push({ k: 'owner', m: 1.04, why: l('Artistas negros confiam mais no seu selo (+4% nas propostas).', 'Black artists trust your label more (+4% on offers).') });
  return out;
}
