// R17 balanço — fatia do 360 com alavanca e teto. Na vida real, quem assina 360 é quase sempre o novato; a estrela
// renegocia (ou ameaça sair) e a parte do selo em shows/merch encolhe; e o que o selo leva de um ato por ano tem
// limite (o empresário audita a turnê, a fatia incide sobre o líquido). Aqui: fatia efetiva = fatia do contrato ×
// alavanca pela fama do ato (100% até fama 45, cai até 40% na fama 93+), somada num teto anual por ato que cresce
// com a época (o mercado de shows de 2005+ é maior). Usado por turnês, rotas, casa própria e a adoção do 360 (w4).

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money } from '../util';

export interface D360 { y: number; got: Record<string, number> }
declare module '../ext4' { interface Ext4 { deal360_17: D360 } }
registerExt4('deal360_17', () => ({ y: 0, got: {} }));
const st = (s: GameState): D360 => {
  const x = s.x4 as unknown as { deal360_17?: D360 };
  const d = (x.deal360_17 ??= { y: s.year, got: {} });
  if (d.y !== s.year) { d.y = s.year; d.got = {}; }
  return d;
};

/** Alavanca do ato: multiplica a fatia 360 do selo (1 = sem desconto). */
export const lever360 = (fame: number): number => clamp(1 - Math.max(0, fame - 45) / 80, 0.4, 1);
/** Teto anual (nominal) do que o selo leva de um ato via 360, por época. */
export const cap360 = (s: GameState): number => money(s, s.year >= 2005 ? 90000 : s.year >= 1990 ? 70000 : 50000);
/** Fatia efetiva de um contrato 360 hoje (sem teto). */
export const eff360 = (a: Act, share: number): number => share * lever360(a.fame);
/** Quanto o selo já levou do ato neste ano via 360. */
export const got360 = (s: GameState, actId: string): number => st(s).got[actId] ?? 0;

/** Parte do selo de uma receita bruta de shows/merch de um ato 360: aplica alavanca e teto anual e registra. */
export function take360(s: GameState, a: Act, gross: number, share: number): number {
  if (gross <= 0 || share <= 0) return 0;
  const d = st(s);
  const room = Math.max(0, cap360(s) - (d.got[a.id] ?? 0));
  const lab = Math.min(room, Math.round(gross * eff360(a, share)));
  if (lab > 0) d.got[a.id] = (d.got[a.id] ?? 0) + lab;
  return lab;
}

// ---------------------------------------------------------------- r21 (H-8): UMA régua para a fatia do selo
// Antes a fatia 360 era lida de três jeitos (com alavanca + teto, com alavanca sem teto, crua) e o merch estava
// invertido (30% no 360, 70% num acordo de imagem). Regra única, por fluxo de receita:
//  - live / merch vendido na estrada (`live`, `merch_live`): só no 360 — fatia do contrato × alavanca pela fama, somada
//    no teto anual (`take360`); contrato clássico: a bilheteria é do artista.
//  - merch cujo ESTOQUE o selo banca (`merch`: linhas do merch17 e brands.produceMerch): no 360 o selo leva a fatia 360
//    com mínimo de 50% (pagou o estoque); fora do 360 leva 70% só porque bancou o estoque (acordo de imagem).
//  - marcas/patrocínio (`brand`): fatia 360 no 360; 15% de comissão de agência no contrato clássico.
//  - endosso de instrumento (`endorse`): comissão de 20%, ou a fatia 360 se maior.
// Banda do jogador: 100% em tudo. Ato que não é seu (ou contrato de outro selo): 0.
export type Stream360 = 'live' | 'merch_live' | 'merch' | 'brand' | 'endorse';
function deal(s: GameState, a: Act): { c?: { share360: number; model: string }; mine: boolean; is360: boolean } {
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  const mine = !!c && c.party === 'player' && a.owner === 'player';
  return { c, mine, is360: mine && c!.model === '360' };
}
/** Fração do selo numa receita do ato (sem registrar no teto anual; para previsões, kits e post-mortem). */
export function labelRate(s: GameState, a: Act, stream: Stream360): number {
  if (a.playerBand) return 1;
  const { c, mine, is360 } = deal(s, a);
  const sh = c?.share360 ?? 0;
  switch (stream) {
    case 'live': case 'merch_live': return is360 ? eff360(a, sh) : 0;
    case 'merch': return is360 ? Math.max(0.5, sh) : mine ? 0.7 : 0;
    case 'brand': return is360 ? sh : mine ? 0.15 : 0;
    case 'endorse': return mine ? Math.max(0.2, sh) : 0;
  }
}
/** Quanto o selo leva de uma receita bruta do ato (a parte 360 de shows/merch de estrada entra no teto anual). */
export function labelTake(s: GameState, a: Act, stream: Stream360, gross: number): number {
  if (gross <= 0) return 0;
  if (a.playerBand) return Math.round(gross);
  const { c, is360 } = deal(s, a);
  if (stream === 'live' || stream === 'merch_live') return is360 ? take360(s, a, gross, c!.share360) : 0;
  return Math.round(gross * labelRate(s, a, stream));
}

/** Explicação para a ficha de contrato e o painel de shows. */
export function why360(s: GameState, a: Act, share: number): L {
  const k = lever360(a.fame);
  return fmtL(l('360 na prática: com fama {f}, {a} tem {lv} — o selo leva {e}% (de {p}%) de shows e merch, até {c} por ano por ato (teto da época; o empresário audita a turnê). Já levado este ano: {g}.',
    '360 in practice: at fame {f}, {a} has {lv} — the label takes {e}% (of {p}%) of live and merch, up to {c} a year per act (era cap; the manager audits the tour). Taken this year: {g}.'), {
    f: Math.round(a.fame), a: a.name, p: Math.round(share * 100), e: Math.round(eff360(a, share) * 1000) / 10,
    lv: k >= 1 ? l('pouca força para negociar', 'little bargaining power') : k > 0.6 ? l('força para renegociar a fatia', 'leverage to renegotiate the cut') : l('poder de estrela: a fatia encolhe muito', 'star power: the cut shrinks a lot'),
    c: `$${Math.round(cap360(s) / 100).toLocaleString('en-US')}`, g: `$${Math.round(got360(s, a.id) / 100).toLocaleString('en-US')}`,
  });
}
