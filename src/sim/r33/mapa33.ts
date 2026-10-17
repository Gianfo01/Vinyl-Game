// R33 · MAPA33 — onde cada tipo de prédio novo pode ficar na cidade. Interruptor `exp33.mapa` (DESLIGADO): com ele desligado
// o mapa é idêntico ao de sempre (os bairros novos de campus18 — periferia leste e orla sul, lotes 58–83 — ficam fechados e nada é reservado).
//
// Registro aberto "tipo → onde pode ficar": as frentes INT-1/INT-2 (banco, estádio, porto, escola de samba…) chamam `registerSite33`
// com o id do tipo, as zonas em ordem de preferência, a cidade onde faz sentido e a época; e ligam o pedido com `setWant33(tipo, s => …)`
// (padrão: não pedido). O resto é daqui:
//   • `lotFor33(s, tipo)`  → o lote reservado daquele tipo na cidade-sede (estável: não depende de época nem do que o jogador comprou);
//   • `reserved33(s)`      → lotes dos tipos PEDIDOS agora: o preenchimento automático e as placas "À venda" não os tocam;
//   • `need33`             → pedido cujo lote ainda não está num bairro aberto faz a cidade crescer (campus18 MAPA33.need).
// Zonas são faixas de lotes de campus18 (LOTS18); a arte do prédio no lote é do PRED, o letreiro do POL2 (nada muda aqui).

import { geo31 } from '../../data/geo31';
import { l, type L } from '../../data/world';
import { LOTS18, MAPA33 } from '../sys/campus18';
import type { GameState } from '../types';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';

export const SW_MAPA33 = 'exp33.mapa';
registerSwitch({
  id: SW_MAPA33, def: false, scope: 'game',
  desc: l('Versão 33 · cidade expandida: bairros novos na borda (periferia leste, orla sul) e lote coerente para cada tipo de prédio novo (estádio na periferia, banco no centro, porto só com água, escola de samba só no Rio). Desligado: o mapa de sempre.',
    'Version 33 · expanded city: new edge districts (east outskirts, south shore) and a fitting plot for every new building type (stadium on the outskirts, bank downtown, harbour only with water, samba school only in Rio). Off: the map as before.'),
});
export const mapaOn33 = (s: GameState): boolean => !!sw<boolean>(s, SW_MAPA33);
registerEditable({ id: `sw.${SW_MAPA33}`, area: 'tools', label: l('Versão 33 · cidade expandida e lotes dos prédios novos', 'Version 33 · expanded city and plots for new buildings'), kind: 'bool',
  get: (s) => mapaOn33(s), set: (s, v) => { setSw(s, SW_MAPA33, !!v); } });
MAPA33.on = mapaOn33;

// ---------------------------------------------------------------- zonas (faixas de LOTS18)

const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);
export interface Zone33 { id: string; name: L; lots: number[] }
const Z = (id: string, pt: string, en: string, lots: number[]): Zone33 => ({ id, name: l(pt, en), lots });
/** Faixas de lotes por vizinhança. Os índices 0–57 são os de sempre; 58–83 são os bairros novos (campus18, EXT33). */
export const ZONES33: Zone33[] = [
  Z('centro-avenida', 'Centro, na avenida', 'Downtown, on the avenue', [1, 5]),
  Z('centro', 'Centro', 'Downtown', range(1, 14)),
  Z('leste', 'Quarteirões do leste', 'East blocks', range(14, 22)),
  Z('avenida-sul', 'Avenida sul', 'South avenue', range(22, 28)),
  Z('bairro-novo', 'Bairro novo', 'New quarter', range(28, 34)),
  Z('porto', 'Porto e estação', 'Harbour and station', range(34, 44)),
  Z('cais', 'Cais do porto', 'Harbour quays', [34, 37, 38, 39, 42, 43, 72, 74, 82, 83]),
  Z('estacao', 'Estação de trem', 'Railway station', [40, 41, 36, 64]),
  Z('boemia', 'Zona das casas de show', 'Venue district', range(44, 52)),
  Z('samba', 'Quadra do samba', 'Dance-hall block', [50, 49, 48]),
  Z('financeiro', 'Centro financeiro', 'Financial district', range(52, 58)),
  Z('periferia', 'Periferia leste', 'East outskirts', range(58, 66)),
  Z('estadio', 'Terrenos grandes da periferia', 'Big outskirts plots', [58, 60, 59, 61]),
  Z('industrial', 'Zona industrial', 'Industrial zone', [62, 63, 64, 65, 73, 83]),
  Z('orla', 'Orla sul', 'South shore', range(66, 84)),
  Z('hospital', 'Quadra do hospital', 'Hospital block', [70, 81, 77, 78]),
];
const zoneBy = new Map(ZONES33.map((z) => [z.id, z]));
export const zone33 = (id: string): Zone33 | undefined => zoneBy.get(id);

// ---------------------------------------------------------------- registro de tipos

export interface Site33 {
  /** id do tipo (o mesmo do prédio da frente que o cria) */ kind: string;
  label: L;
  /** zonas em ordem de preferência: o lote é o primeiro livre da primeira zona que tiver */ zones: string[];
  /** cidades onde o tipo existe (padrão: todas) */ city?: (city: string) => boolean;
  /** primeiro ano em que faz sentido (informativo para as frentes; o pedido é de `want`) */ from?: number;
  /** o jogo pede esse prédio agora (a frente dona liga); padrão: não */ want?: (s: GameState) => boolean;
}
const SITES = new Map<string, Site33>();
const cache = new Map<string, Map<string, number>>();

/** Registra (ou substitui) um tipo. Quem registra de novo o mesmo `kind` troca a regra inteira. */
export function registerSite33(d: Site33): void { SITES.set(d.kind, d); cache.clear(); }
/** Liga/desliga o pedido de um tipo já registrado (as frentes INT-1/INT-2 chamam quando o prédio entra no jogo). */
export function setWant33(kind: string, want: ((s: GameState) => boolean) | undefined): void {
  const d = SITES.get(kind);
  if (d) d.want = want;
}
export const sites33 = (): Site33[] => [...SITES.values()];
export const site33 = (kind: string): Site33 | undefined => SITES.get(kind);

const hasWater = (city: string): boolean => geo31(city).water.length > 0;
const only = (...ids: string[]) => (c: string): boolean => ids.includes(c);

/** Tipos previstos para a 33 (planejamento INT-1/INT-2): regra de lugar já pronta; nenhum é pedido até a frente dona ligar `want`. */
const DEFAULT_SITES: Site33[] = [
  { kind: 'bank', label: l('Banco', 'Bank'), zones: ['centro-avenida', 'financeiro', 'centro'], from: 1889 },
  { kind: 'court', label: l('Cartório e tribunal', 'Registry and court'), zones: ['centro-avenida', 'centro', 'financeiro'], from: 1889 },
  { kind: 'ad_agency', label: l('Agência de publicidade', 'Ad agency'), zones: ['centro', 'financeiro'], from: 1920 },
  { kind: 'church', label: l('Igreja e coral', 'Church and choir'), zones: ['centro', 'leste'], from: 1889 },
  { kind: 'hospital', label: l('Hospital e reabilitação', 'Hospital and rehab'), zones: ['avenida-sul', 'hospital', 'orla'], from: 1889 },
  { kind: 'stadium', label: l('Estádio', 'Stadium'), zones: ['leste', 'estadio', 'periferia'], from: 1920 },
  { kind: 'jazz_club', label: l('Clube de jazz', 'Jazz club'), zones: ['boemia', 'centro'], from: 1920 },
  { kind: 'nightclub', label: l('Boate', 'Nightclub'), zones: ['boemia', 'centro'], from: 1960 },
  { kind: 'cinema', label: l('Cinema', 'Cinema'), zones: ['boemia', 'centro', 'bairro-novo'], from: 1900 },
  { kind: 'tv_studio', label: l('Estúdio de TV e cinema', 'TV and film studio'), zones: ['bairro-novo', 'periferia', 'leste'], from: 1950 },
  { kind: 'samba_school', label: l('Escola de samba', 'Samba school'), zones: ['samba', 'boemia'], city: only('rio'), from: 1928 },
  { kind: 'print_shop', label: l('Gráfica e estúdio de arte', 'Print shop and art studio'), zones: ['industrial', 'leste'], from: 1889 },
  { kind: 'pirate_radio', label: l('Rádio pirata e garagem', 'Pirate radio and garage'), zones: ['industrial', 'orla', 'periferia'], from: 1960 },
  { kind: 'train_station', label: l('Estação de trem', 'Train station'), zones: ['estacao', 'porto'], from: 1889 },
  { kind: 'harbor', label: l('Porto', 'Harbour'), zones: ['cais', 'porto'], city: hasWater, from: 1889 },
];
for (const d of DEFAULT_SITES) SITES.set(d.kind, d);

// ---------------------------------------------------------------- lote de cada tipo

/** Atribuição estável por cidade: tipos na ordem do registro, cada um no primeiro lote livre da primeira zona que tiver.
 *  Não depende de época, de pedido nem do jogador: o lote de um tipo nunca muda enquanto o registro for o mesmo. */
export function assign33(city: string): Map<string, number> {
  const hit = cache.get(city);
  if (hit) return hit;
  const out = new Map<string, number>(), taken = new Set<number>();
  for (const d of SITES.values()) {
    if (d.city && !d.city(city)) continue;
    let lot: number | undefined;
    for (const zid of d.zones) {
      lot = zone33(zid)?.lots.find((n) => LOTS18[n] && !taken.has(n));
      if (lot !== undefined) break;
    }
    if (lot !== undefined) { out.set(d.kind, lot); taken.add(lot); }
  }
  cache.set(city, out);
  return out;
}
/** Lote reservado do tipo na cidade-sede (ou `undefined`: o tipo não existe nesta cidade ou o registro não tem zona livre). */
export const lotFor33 = (s: GameState, kind: string): number | undefined => assign33(s.config.homeCity).get(kind);
/** O tipo existe nesta cidade (porto só com água, escola de samba só no Rio…). */
export const siteHere33 = (s: GameState, kind: string): boolean => lotFor33(s, kind) !== undefined;
/** Lotes dos tipos PEDIDOS agora (com `exp33.mapa` ligado): ficam fora do preenchimento e das placas "À venda". */
export function reserved33(s: GameState): Set<number> {
  const out = new Set<number>();
  if (!mapaOn33(s)) return out;
  for (const [k, lot] of assign33(s.config.homeCity)) if (SITES.get(k)?.want?.(s)) out.add(lot);
  return out;
}
MAPA33.reserved = (s) => reserved33(s);
/** Pedido sem lote nos bairros abertos (`end` primeiros) → a cidade abre o próximo bairro. */
MAPA33.need = (s, end) => {
  if (!mapaOn33(s)) return false;
  for (const lot of reserved33(s)) if (lot >= end) return true;
  return false;
};

/** Tabela "tipo → onde pode ficar" (para o relatório, o editor e as frentes que chegam). */
export function sitesTable33(city: string): { kind: string; label: L; zones: string[]; lot?: number; lotName?: L }[] {
  const m = assign33(city);
  return [...SITES.values()].map((d) => {
    const lot = m.get(d.kind);
    return { kind: d.kind, label: d.label, zones: d.zones, lot, lotName: lot !== undefined ? LOTS18[lot].name : undefined };
  }).filter((r) => !SITES.get(r.kind)?.city || SITES.get(r.kind)!.city!(city));
}
