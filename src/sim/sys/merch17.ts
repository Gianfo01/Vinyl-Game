// Rodada 17 (F) — Merch expandido: produtos por época (bótons, pôsteres, camisetas de turnê, patches, moletons,
// box de CD, vinil colorido, ecobag, NFT na bolha de 2021–22, caixa de fã), estoque e lotes, preço, design,
// sazonalidade (moletom no inverno do hemisfério do artista), turnê dobra a venda (banca do show), fama regional,
// pirataria de camisetas quando o artista é grande (combater custa), sobra encalhada vira liquidação e
// "drops" limitados que esgotam e fortalecem o núcleo de fãs. Direito de vender: banda própria, contrato 360
// ou acordo de imagem com escopo merch (image17). Licenciar para rede de lojas: royalty sem risco, imagem
// barateia. Gerador próprio por mês.

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact, type Fact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, money, post } from '../util';
import { hasRight } from './image17';

export type Sku = 'button' | 'poster' | 'tee' | 'patch' | 'hoodie' | 'cdbox' | 'color_vinyl' | 'tote' | 'nft' | 'fanbox';
export const SKUS: Record<Sku, { name: L; from: number; to: number; cost: number; price: number; fan: 'core' | 'active' | 'casual'; winter?: 1 }> = {
  button: { name: l('Bótons', 'Buttons'), from: 1950, to: 2100, cost: 0.3, price: 2, fan: 'casual' },
  poster: { name: l('Pôsteres', 'Posters'), from: 1960, to: 2100, cost: 0.8, price: 6, fan: 'active' },
  tee: { name: l('Camiseta de turnê', 'Tour T-shirt'), from: 1968, to: 2100, cost: 3, price: 18, fan: 'active' },
  patch: { name: l('Patches', 'Patches'), from: 1970, to: 2100, cost: 0.5, price: 5, fan: 'core' },
  hoodie: { name: l('Moletom', 'Hoodie'), from: 1985, to: 2100, cost: 9, price: 45, fan: 'core', winter: 1 },
  cdbox: { name: l('Box de CDs', 'CD box set'), from: 1990, to: 2010, cost: 14, price: 60, fan: 'core' },
  color_vinyl: { name: l('Vinil colorido', 'Colored vinyl'), from: 2008, to: 2100, cost: 9, price: 35, fan: 'core' },
  tote: { name: l('Ecobag', 'Tote bag'), from: 2010, to: 2100, cost: 2, price: 15, fan: 'casual' },
  nft: { name: l('NFT colecionável', 'Collectible NFT'), from: 2021, to: 2022, cost: 1, price: 80, fan: 'core' },
  fanbox: { name: l('Caixa de fã (edição limitada)', 'Fan box (limited edition)'), from: 2015, to: 2100, cost: 25, price: 120, fan: 'core' },
};
export interface Line { act: string; sku: Sku; stock: number; made: number; sold: number; design: number; price: 'low' | 'mid' | 'high'; age: number; drop?: 1; rev: number }
export interface M17 { lines: Line[]; lic: Record<string, number>; fight: Record<string, 1>; log: { y: number; m: number; t: L }[]; boost?: Record<string, { k: number; until: number; why: L }> }
declare module '../ext4' { interface Ext4 { merch17: M17 } }
registerExt4('merch17', () => ({ lines: [], lic: {}, fight: {}, log: [] }));
export const m17 = (s: GameState): M17 => { const x = s.x4 as unknown as { merch17?: M17 }; return (x.merch17 ??= { lines: [], lic: {}, fight: {}, log: [] }); };
const log = (s: GameState, t: L) => { const st = m17(s); st.log.unshift({ y: s.year, m: s.month, t }); if (st.log.length > 30) st.log.pop(); };
const PRICE = { low: { m: 0.75, d: 1.3 }, mid: { m: 1, d: 1 }, high: { m: 1.4, d: 0.65 } };

export const skusNow = (s: GameState): Sku[] => (Object.keys(SKUS) as Sku[]).filter((k) => s.year >= SKUS[k].from && s.year <= SKUS[k].to);
export function canSell(s: GameState, a: Act): L | null {
  if (a.playerBand) return null;
  const c = a.contractId ? s.contracts[a.contractId] : undefined;
  if (a.owner === 'player' && c?.model === '360') return null;
  if (hasRight(s, a.id, 'merch')) return null;
  return l('Precisa de contrato 360 ou de um acordo de imagem com escopo merch.', 'Needs a 360 deal or an image-rights deal with merch scope.');
}
const touring = (s: GameState, a: Act) => (s.tours ?? []).some((t) => t.actId === a.id && (t.status === 'running' || t.status === 'planned') && t.stops.some((x) => x.status === 'scheduled' && Math.abs(x.day - s.day) < 35));
const southern = (a: Act) => (cityById[a.city]?.lat ?? 10) < 0;

/** Demanda mensal estimada de uma linha, com o porquê. */
export function demandOf(s: GameState, ln: Line): { units: number; why: [L, number][] } {
  const a = s.acts[ln.act], k = SKUS[ln.sku];
  if (!a) return { units: 0, why: [] };
  const base = k.fan === 'core' ? a.fans.core * 0.02 : k.fan === 'active' ? a.fans.active * 0.006 : a.fans.casual * 0.0012;
  const why: [L, number][] = [];
  let m = (0.5 + ln.design / 100) * PRICE[ln.price].d;
  why.push([l('Design e preço', 'Design and price'), m]);
  if (touring(s, a)) { m *= 2; why.push([l('Banca na turnê', 'Tour merch stand'), 2]); }
  if (k.winter) { const w = southern(a) ? [5, 6, 7].includes(s.month) : [10, 11, 0, 1].includes(s.month); const f = w ? 1.5 : 0.7; m *= f; why.push([w ? l('Inverno: moletom sai', 'Winter: hoodies sell') : l('Calor: moletom encalha', 'Warm season: hoodies sit'), f]); }
  if (a.momentum > 60) { m *= 1.25; why.push([l('Artista em alta', 'Act on a roll'), 1.25]); }
  const bo = m17(s).boost?.[a.id];
  if (bo && bo.until >= s.week) { m *= bo.k; why.push([bo.why, bo.k]); }
  if (ln.age > 12) { m *= 0.6; why.push([l('Coleção velha', 'Stale collection'), 0.6]); }
  const boot = a.fame >= 60 && !m17(s).fight[a.id] ? 0.8 : 1;
  if (boot < 1) why.push([l('Camisetas piratas na porta do show', 'Bootleg tees outside the venue'), boot]);
  return { units: Math.round(base * m * boot), why };
}
export const unitCost = (s: GameState, sku: Sku, design: number) => money(s, SKUS[sku].cost * (0.8 + design / 200));
export const unitPrice = (s: GameState, ln: Line) => money(s, SKUS[ln.sku].price * PRICE[ln.price].m);

export function makeBatch(s: GameState, actId: string, sku: Sku, units: number, design: number, price: Line['price'], drop = false): L | null {
  const a = s.acts[actId];
  if (!a) return l('Inválido.', 'Invalid.');
  const no = canSell(s, a);
  if (no) return no;
  if (!skusNow(s).includes(sku)) return l('Esse produto não existe nesta época.', 'That product does not exist in this era.');
  units = clamp(Math.round(units), 50, 50000);
  const cost = unitCost(s, sku, design) * units + money(s, 200 + design * 10);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `m17:${actId}:${sku}:${s.week}`, -cost, 'merch', `Lote ${SKUS[sku].name.pt}: ${a.name}`);
  const st = m17(s);
  let ln = st.lines.find((x) => x.act === actId && x.sku === sku && !x.drop);
  if (drop || !ln) { ln = { act: actId, sku, stock: 0, made: 0, sold: 0, design, price, age: 0, rev: 0, drop: drop ? 1 : undefined }; st.lines.push(ln); }
  ln.stock += units; ln.made += units; ln.design = Math.round((ln.design + design) / 2); ln.price = price; if (!drop) ln.age = 0;
  return null;
}
export const fightCost = (s: GameState) => money(s, 600);
export function toggleFight(s: GameState, actId: string): void { const f = m17(s).fight; if (f[actId]) delete f[actId]; else f[actId] = 1; }
/** Licenciar para rede de lojas: royalty mensal, sem estoque; imagem barateia (−credibilidade). */
export function toggleLicense(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a) return l('Inválido.', 'Invalid.');
  const st = m17(s);
  if (st.lic[actId]) { delete st.lic[actId]; return null; }
  const no = canSell(s, a);
  if (no) return no;
  if (s.year < 1975) return l('Ainda não há redes de lojas licenciando bandas.', 'No retail chains licensing bands yet.');
  st.lic[actId] = s.year;
  s.player.reputation.artistic = clamp(s.player.reputation.artistic - 1, 0, 100);
  return null;
}

registerSimHook('month', 'merch17', (s) => {
  const st = m17(s);
  const r = Rng.fromSeed(`${s.config.seed}:m17:${s.year}:${s.month}`);
  for (const ln of st.lines) {
    const a = s.acts[ln.act];
    if (!a || ln.stock <= 0) continue;
    ln.age += 1;
    let u = Math.min(ln.stock, Math.round(demandOf(s, ln).units * r.float(0.8, 1.2) * (ln.drop ? 3 : 1)));
    if (u <= 0) continue;
    ln.stock -= u; ln.sold += u;
    const rev = u * unitPrice(s, ln);
    ln.rev += rev;
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    const share = a.playerBand ? 1 : c?.model === '360' && a.owner === 'player' ? Math.max(0.3, c.share360) : 0.7;
    post(s, `m17s:${ln.act}:${ln.sku}:${s.month}:${ln.drop ?? 0}`, Math.round(rev * share), 'merch', `Merch ${a.name}`);
    if (share < 1) a.cash += Math.round(rev * (1 - share));
    if (ln.drop && ln.stock === 0 && ln.age <= 2) {
      a.fans.core = Math.round(a.fans.core * 1.02);
      const t = fmtL(l('Drop de {k} de {a} esgota em dias: o núcleo de fãs cresce.', '{a}\'s {k} drop sells out in days: the core fanbase grows.'), { k: SKUS[ln.sku].name, a: a.name });
      log(s, t);
      emitFact(s, { kind: 'merch_drop', actors: [a.id, 'player'], severity: 35, visibility: 'public', tags: ['good', 'merch'], text: t, src: 'merch17' });
      u = 0;
    }
    // encalhe: liquidação depois de 18 meses
    if (ln.age > 18 && ln.stock > 0 && !ln.drop) {
      const v = Math.round(ln.stock * unitCost(s, ln.sku, ln.design) * 0.5);
      post(s, `m17liq:${ln.act}:${ln.sku}:${s.year}`, v, 'merch', `Liquidação ${a.name}`);
      log(s, fmtL(l('{n} unidades encalhadas de {k} ({a}) liquidadas a preço de custo pela metade.', '{n} unsold {k} ({a}) cleared at half cost.'), { n: ln.stock, k: SKUS[ln.sku].name, a: a.name }));
      ln.stock = 0;
    }
  }
  st.lines = st.lines.filter((x) => x.stock > 0 || x.age < 6);
  for (const id of Object.keys(st.fight)) post(s, `m17f:${id}:${s.month}`, -fightCost(s), 'legal', 'Combate à pirataria de merch');
  for (const [id] of Object.entries(st.lic)) {
    const a = s.acts[id];
    if (!a || canSell(s, a)) { delete st.lic[id]; continue; }
    const roy = money(s, a.fame * a.fame * 0.5 + a.fans.casual * 0.0005);
    post(s, `m17lic:${id}:${s.month}`, roy, 'merch', `Licença de merch ${a.name}`);
  }
});

// fatos de outros sistemas mexem na demanda: morte (luto/coleção), prêmio, escândalo (rebelde vende, careta afunda)
const actOf = (s: GameState, f: Fact): Act | undefined => f.actors.map((id) => s.acts[id]).find((a) => a && (a.owner === 'player' || a.playerBand || m17(s).lines.some((x) => x.act === a.id)));
const boost = (s: GameState, a: Act, k: number, weeks: number, why: L) => { const st = m17(s); (st.boost ??= {})[a.id] = { k, until: s.week + weeks, why }; };
onFact('death', (s, f) => { const a = actOf(s, f); if (a) { boost(s, a, 2.5, 26, l('Luto: fãs querem uma lembrança', 'Mourning: fans want a keepsake')); log(s, fmtL(l('Morte em {a}: a procura por merch dispara.', 'Death in {a}: merch demand soars.'), { a: a.name })); } }, 'merch17:death');
onFact('award', (s, f) => { const a = actOf(s, f); if (a) boost(s, a, 1.3, 13, l('Prêmio recente', 'Recent award')); }, 'merch17:award');
onFact('scandal', (s, f) => { const a = actOf(s, f); if (!a || f.severity < 40) return; const rebel = ['rock', 'hiphop'].includes(a.genre) || ['rock', 'hiphop'].some((x) => a.genre.includes(x)); boost(s, a, rebel ? 1.15 : 0.7, 13, rebel ? l('Escândalo vira atitude: camiseta vende', 'Scandal becomes attitude: tees sell') : l('Escândalo: ninguém quer o rosto no peito', 'Scandal: nobody wants that face on their chest')); }, 'merch17:scandal');
