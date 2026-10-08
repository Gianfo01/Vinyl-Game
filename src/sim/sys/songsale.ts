// Venda de composições (rodada 7): o jogador negocia na hora com outro artista o valor de compra, o
// percentual de royalties da composição e quanto desse percentual fica com o selo (edição) e quanto vai
// para quem escreveu. O comprador aceita, faz contraproposta ou recusa. Depois, todo mês, a receita da
// gravação alheia paga os royalties combinados — para sempre, enquanto a faixa vender.
// NPCs também compram e vendem músicas entre si (compositores de aluguel).

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { launchNpcRelease } from '../market';
import { songQ } from '../production';
import { songProfile, songStatus } from '../repertoire';
import type { GameState, Song } from '../types';
import { fmtL, money, nextId, playerActs, post, remember } from '../util';
import { ownerOf } from './people/owner';

export interface SongSale { id: string; songId: string; title: string; fromActId: string; toActId: string; relId: string; writers: string[]; fee: number; royalty: number; labelShare: number; paid: number; lastRev: number; week: number }
export interface SaleTerms { fee: number; royalty: number; labelShare: number }
export interface SaleState { sales: SongSale[]; npc: { year: number; writer: string; buyer: string; title: string }[] }

declare module '../ext4' { interface Ext4 { songsale: SaleState } }
registerExt4('songsale', () => ({ sales: [], npc: [] }));
export const sales = (s: GameState): SaleState => (s as unknown as { x4: { songsale: SaleState } }).x4.songsale;

export function saleTargets(s: GameState, song: Song) {
  const mine = new Set(playerActs(s));
  return Object.values(s.acts)
    .filter((a) => !mine.has(a.id) && (a.status === 'active' || a.status === 'emerging') && !a.deceased && a.fame > 6 && a.owner)
    .sort((a, b) => Number(b.genre === song.genre) - Number(a.genre === song.genre) || b.fame - a.fame)
    .slice(0, 12);
}

/** Proposta "justa" para o comprador (referência para a interface). */
export function fairTerms(s: GameState, song: Song, targetId: string): SaleTerms {
  const tg = s.acts[targetId];
  const fame = tg?.fame ?? 10;
  return { fee: money(s, 300 + song.q * 22 + fame * 25), royalty: clamp(0.05 + song.q / 1000 + songProfile(song).hook / 2000, 0.04, 0.16), labelShare: 0.5 };
}

/** Quanto o comprador gosta da proposta (−∞..+∞; >0 tende a aceitar). */
function buyerScore(s: GameState, song: Song, targetId: string, t0: SaleTerms): number {
  const tg = s.acts[targetId];
  if (!tg) return -9;
  const fair = fairTerms(s, song, targetId);
  const want = (song.q - tg.fame * 0.5) / 40 + (song.genre === tg.genre ? 0.3 : -0.25) + songProfile(song).hook / 300;
  const price = t0.fee / Math.max(1, fair.fee) - 1;
  const roy = t0.royalty / fair.royalty - 1;
  return want - price * 0.9 - roy * 0.8;
}

export function saleChance(s: GameState, song: Song, targetId: string, t0: SaleTerms): number {
  return clamp(1 / (1 + Math.exp(-buyerScore(s, song, targetId, t0) * 3)), 0.02, 0.97);
}

export function canSell(s: GameState, songId: string): L | null {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  const st = songStatus(s, song);
  if (st !== 'written' && st !== 'recorded' && st !== 'vault') return l('Só músicas inéditas podem ser vendidas.', 'Only unreleased songs can be sold.');
  if (sales(s).sales.some((x) => x.songId === songId)) return l('Já foi vendida.', 'Already sold.');
  return null;
}

/** Negociação na hora: aceita, contraproposta (com os termos dela) ou recusa. */
export function offerSong(s: GameState, r: Rng, songId: string, targetId: string, t0: SaleTerms): { result: 'accepted' | 'counter' | 'rejected'; counter?: SaleTerms; text: L } {
  const err = canSell(s, songId);
  if (err) return { result: 'rejected', text: err };
  const song = s.songs[songId];
  const tg = s.acts[targetId];
  if (!tg) return { result: 'rejected', text: l('Artista inválido.', 'Invalid artist.') };
  const p = saleChance(s, song, targetId, t0);
  if (r.chance(p)) {
    closeSale(s, r, songId, targetId, t0);
    return { result: 'accepted', text: fmtL(l('{a} comprou "{t}"! Vai gravar e lançar.', '{a} bought "{t}"! They will record and release it.'), { a: tg.name, t: song.title }) };
  }
  if (p > 0.15) {
    const fair = fairTerms(s, song, targetId);
    const counter: SaleTerms = { fee: Math.round((t0.fee + fair.fee * 0.8) / 2), royalty: Math.round(((t0.royalty + fair.royalty * 0.8) / 2) * 1000) / 1000, labelShare: t0.labelShare };
    return { result: 'counter', counter, text: fmtL(l('{a} gostou de "{t}", mas propõe {f} e {r}% de royalties.', '{a} likes "{t}" but offers {f} and {r}% royalties.'), { a: tg.name, t: song.title, f: Math.round(counter.fee / 100), r: (counter.royalty * 100).toFixed(1) }) };
  }
  return { result: 'rejected', text: fmtL(l('{a} passou: "{t}" não é para eles agora (ou o preço está alto).', '{a} passed: "{t}" is not for them now (or the price is too high).'), { a: tg.name, t: song.title }) };
}

export function closeSale(s: GameState, r: Rng, songId: string, targetId: string, t0: SaleTerms): SongSale | null {
  const song = s.songs[songId];
  const target = s.acts[targetId];
  if (!song || !target) return null;
  // pagamento inicial: o selo fica com a parte combinada; o resto vai para quem escreveu
  const labelPart = Math.round(t0.fee * t0.labelShare);
  if (labelPart > 0) post(s, `songsale:${songId}`, labelPart, 'publishing', `Venda de "${song.title}" para ${target.name}`);
  payWriters(s, song.writers, t0.fee - labelPart);
  const cover: Song = {
    ...song, id: nextId(s, 's'), actId: target.id, coverOf: song.id, recorded: true, releaseId: undefined, vault: false, createdWeek: s.week,
    performance: clamp(45 + target.fame / 2 + r.normal(0, 6), 5, 100), production: clamp(55 + r.normal(0, 8), 5, 100), genre: target.genre,
  };
  cover.q = songQ(cover);
  s.songs[cover.id] = cover;
  target.songs.push(cover.id);
  const rel = launchNpcRelease(s, r, target, target.owner ?? 'indie', [cover.id], 'single', 3000 + target.fame * 80);
  song.vault = false;
  s.flags[`ro:${song.id}`] = 1;
  s.flags[`pitched:${song.id}`] = 1;
  const sale: SongSale = { id: nextId(s, 'ss'), songId, title: song.title, fromActId: song.actId, toActId: target.id, relId: rel.id, writers: [...song.writers], fee: t0.fee, royalty: t0.royalty, labelShare: t0.labelShare, paid: 0, lastRev: 0, week: s.week };
  sales(s).sales.push(sale);
  remember(s, 'songsale', fmtL(l('"{t}", composta em {a}, vira single de {b} ({r}% de royalties).', '"{t}", written in {a}, becomes a single for {b} ({r}% royalties).'), { t: song.title, a: s.acts[song.actId]?.name ?? '', b: target.name, r: (t0.royalty * 100).toFixed(1) }), { actId: song.actId, important: target.fame > 30 });
  return sale;
}

/** Parte dos compositores: integrantes recebem no caixa pessoal; o personagem do jogador, no patrimônio. */
function payWriters(s: GameState, writers: string[], amount: number): void {
  if (amount <= 0 || !writers.length) return;
  const per = Math.round(amount / writers.length);
  for (const w of writers) {
    const p = s.persons[w];
    if (p?.isPlayer) ownerOf(s).wealth += per;
    else s.personalCash[w] = (s.personalCash[w] ?? 0) + per;
    if (p) p.morale = clamp(p.morale + 1, 0, 100);
  }
}

function salesMonth(s: GameState): void {
  for (const sale of sales(s).sales) {
    const rel = s.releases[sale.relId];
    if (!rel) continue;
    const delta = rel.revenue - sale.lastRev;
    if (delta <= 0) continue;
    sale.lastRev = rel.revenue;
    const roy = Math.round(delta * sale.royalty);
    if (roy <= 0) continue;
    const labelPart = Math.round(roy * sale.labelShare);
    if (labelPart > 0) post(s, `songroy:${sale.id}:${s.year}:${s.month}`, labelPart, 'publishing', `Royalties de composição: "${sale.title}"`);
    payWriters(s, sale.writers, roy - labelPart);
    sale.paid += roy;
    if (rel.peak <= 10 && !s.flags[`salehit:${sale.id}`]) {
      s.flags[`salehit:${sale.id}`] = 1;
      s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100);
      remember(s, 'songsale_hit', fmtL(l('"{t}", que você vendeu para {b}, virou hit! Os compositores ganham fama.', '"{t}", which you sold to {b}, became a hit! The writers gain renown.'), { t: sale.title, b: s.acts[sale.toActId]?.name ?? '' }), { actId: sale.fromActId, important: true });
    }
  }
}

/** NPCs: compositores de outros atos vendem músicas entre si (o mundo também negocia). */
function npcSales(s: GameState, r: Rng): void {
  if (!r.chance(0.25)) return;
  const acts = Object.values(s.acts).filter((a) => a.status === 'active' && a.owner !== 'player' && !a.playerBand);
  const writers = acts.filter((a) => a.members.some((id) => (s.persons[id]?.skills.comp ?? 0) > 60));
  const buyers = acts.filter((a) => a.fame > 30);
  if (!writers.length || !buyers.length) return;
  const w = r.pick(writers);
  const b = r.pick(buyers.filter((x) => x.id !== w.id));
  if (!b) return;
  const comp = w.members.map((id) => s.persons[id]).filter(Boolean).sort((x, y) => y.skills.comp - x.skills.comp)[0];
  const fee = money(s, 500 + b.fame * 40);
  if (b.cash < fee) return;
  b.cash -= fee;
  w.cash += Math.round(fee * 0.6);
  if (comp) s.personalCash[comp.id] = (s.personalCash[comp.id] ?? 0) + Math.round(fee * 0.4);
  const st = sales(s);
  st.npc.push({ year: s.year, writer: comp?.name ?? w.name, buyer: b.name, title: '' });
  if (st.npc.length > 30) st.npc.shift();
  if (b.fame > 50) remember(s, 'npc_songsale', fmtL(l('{w} ({a}) compõe para {b}.', '{w} ({a}) writes for {b}.'), { w: comp?.name ?? '?', a: w.name, b: b.name }), { actId: b.id });
}

registerSimHook('month', 'songsale', (s, r) => { salesMonth(s); npcSales(s, r); });
