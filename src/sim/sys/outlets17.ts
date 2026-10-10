// Rodada 17 (F) — Onde lançar: canais de venda por época, por cima dos formatos (vinil, K7, CD já existem no
// pedido de prensagem). Cada canal tem alcance (mais unidades), margem (receita por unidade), custo de
// entrada e efeito colateral: operadoras de jukebox, rack-jobbers de supermercado, cartucho 8-track (carro,
// 1965–82), clube do disco por correio (alcance enorme, royalty mínimo, adiantamento), lojas independentes,
// megastores de shopping, exclusiva de rede (dinheiro adiantado, outros lojistas boicotam), loja de
// download, venda direta ao fã (margem alta, alcance pequeno), plataforma de vídeo, streaming, janela
// (segurar o streaming: físico vende mais, jovens reclamam), exclusiva de plataforma, vídeo curto e
// edição especial em vinil. Sem canais escolhidos = comportamento antigo.

import { clamp } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { GameState, Release } from '../types';
import { fmtL, money, post } from '../util';

export type OutId = 'jukebox_ops' | 'rack' | 'eight_track' | 'record_club' | 'indie_shops' | 'mall_chain' | 'bigbox_excl' | 'mp3_store' | 'direct' | 'video' | 'streaming' | 'window' | 'platform_excl' | 'short_video' | 'vinyl_special';
export interface OutDef { id: OutId; name: L; desc: L; from: number; to: number; reach: number; margin: number; fee: number; upfront?: number; cred?: number; youth?: number; single?: boolean; excl?: OutId[]; fam?: string[] }
export const OUTLETS: OutDef[] = [
  { id: 'jukebox_ops', name: l('Operadoras de jukebox', 'Jukebox operators'), desc: l('Compactos em bares e lanchonetes: vende o single e espalha o nome.', 'Singles in bars and diners: sells the single and spreads the name.'), from: 1940, to: 1985, reach: 0.07, margin: -0.1, fee: 1500, single: true, youth: 1 },
  { id: 'rack', name: l('Rack-jobbers (supermercados)', 'Rack-jobbers (supermarkets)'), desc: l('Discos ao lado do sabão em pó: muito alcance, margem espremida, imagem popularesca.', 'Records next to the detergent: lots of reach, squeezed margin, a down-market image.'), from: 1960, to: 2005, reach: 0.1, margin: -0.15, fee: 2000, cred: -1 },
  { id: 'eight_track', name: l('Cartucho 8-track', '8-track cartridge'), desc: l('O som do carro (1965–82). Prensagem extra; some quando o K7 domina.', 'The car stereo (1965–82). Extra pressing; fades once the cassette rules.'), from: 1965, to: 1982, reach: 0.06, margin: 0, fee: 3000, fam: ['rock', 'country_folk', 'rnb'] },
  { id: 'record_club', name: l('Clube do disco (correio)', 'Record club (mail order)'), desc: l('"12 discos por 1 centavo": milhões de lares, royalty mínimo — mas o clube adianta dinheiro.', '"12 records for a penny": millions of homes, minimal royalty — but the club pays an advance.'), from: 1955, to: 2008, reach: 0.12, margin: -0.35, fee: 0, upfront: 4000, cred: -1 },
  { id: 'indie_shops', name: l('Lojas independentes', 'Independent shops'), desc: l('Balconistas que recomendam: pouco alcance, boa margem, credibilidade.', 'Clerks who recommend: little reach, good margin, credibility.'), from: 1950, to: 2100, reach: 0.03, margin: 0.05, fee: 800, cred: 1 },
  { id: 'mall_chain', name: l('Megastores de shopping', 'Mall megastores'), desc: l('Vitrine e "co-op" pago: alcance nacional, margem menor.', 'Window displays and paid co-op: national reach, lower margin.'), from: 1975, to: 2008, reach: 0.09, margin: -0.08, fee: 4000 },
  { id: 'bigbox_excl', name: l('Exclusiva de grande rede', 'Big-box exclusive'), desc: l('A rede paga adiantado pela exclusividade; as outras lojas boicotam e a crítica torce o nariz.', 'The chain pays upfront for exclusivity; other stores boycott and critics sneer.'), from: 1995, to: 2015, reach: -0.06, margin: 0, fee: 0, upfront: 15000, cred: -2, excl: ['mall_chain', 'indie_shops', 'rack'] },
  { id: 'mp3_store', name: l('Loja de downloads', 'Download store'), desc: l('Faixa a 99 centavos: o single vira produto de novo.', '99-cent tracks: the single is a product again.'), from: 2003, to: 2020, reach: 0.06, margin: 0, fee: 500 },
  { id: 'direct', name: l('Venda direta ao fã', 'Direct-to-fan store'), desc: l('Sua loja/página de artista: margem alta, alcance só dos fãs.', 'Your own store/artist page: high margin, reach only among fans.'), from: 2008, to: 2100, reach: 0.02, margin: 0.25, fee: 600, cred: 1 },
  { id: 'video', name: l('Plataforma de vídeo', 'Video platform'), desc: l('Clipe e áudio com anúncios: muita gente ouve, paga pouco, faz fama.', 'Video and audio with ads: lots of listeners, little pay, builds fame.'), from: 2006, to: 2100, reach: 0.08, margin: -0.2, fee: 0, youth: 2 },
  { id: 'streaming', name: l('Todas as plataformas de streaming', 'All streaming platforms'), desc: l('Onde o público está: alcance máximo, centavos por play.', 'Where the audience is: maximum reach, cents per play.'), from: 2008, to: 2100, reach: 0.15, margin: -0.1, fee: 0, youth: 1 },
  { id: 'window', name: l('Janela: segurar o streaming', 'Window: hold off streaming'), desc: l('Quatro semanas só físico/download: fãs compram, os jovens reclamam e piratiam.', 'Four weeks physical/download only: fans buy, the young complain and pirate.'), from: 2014, to: 2100, reach: -0.08, margin: 0.3, fee: 0, youth: -2, excl: ['streaming', 'platform_excl'] },
  { id: 'platform_excl', name: l('Exclusiva de plataforma', 'Platform exclusive'), desc: l('Uma plataforma paga pela estreia exclusiva; quem assina outra fica de fora.', 'One platform pays for an exclusive premiere; subscribers elsewhere miss out.'), from: 2015, to: 2019, reach: -0.12, margin: 0, fee: 0, upfront: 25000, excl: ['streaming', 'window'] },
  { id: 'short_video', name: l('Campanha de vídeo curto', 'Short-video campaign'), desc: l('Criadores usam o refrão: viraliza ou some.', 'Creators use the hook: goes viral or vanishes.'), from: 2018, to: 2100, reach: 0.12, margin: 0, fee: 3000, youth: 2 },
  { id: 'vinyl_special', name: l('Edição especial em vinil', 'Special vinyl edition'), desc: l('Vinil colorido numerado: colecionadores pagam caro.', 'Numbered colored vinyl: collectors pay a premium.'), from: 2010, to: 2100, reach: 0.02, margin: 0.3, fee: 4000, cred: 1 },
];
export const outDef = (id: string) => OUTLETS.find((x) => x.id === id);
/** Canais que definem a venda inteira (streaming, janela, exclusivas) vs. laterais (fatia ~ 4× o alcance extra). */
const WHOLE17: OutId[] = ['streaming', 'window', 'platform_excl', 'bigbox_excl'];
export const shareOf = (o: OutDef): number => (WHOLE17.includes(o.id) ? 1 : clamp(Math.abs(o.reach) * 4, 0.05, 0.6));

export interface Out17 { rel: Record<string, OutId[]>; preset: OutId[]; log: { w: number; t: L }[] }
declare module '../ext4' { interface Ext4 { out17: Out17 } }
registerExt4('out17', () => ({ rel: {}, preset: [], log: [] }));
export const out17 = (s: GameState): Out17 => { const x = s.x4 as unknown as { out17?: Out17 }; return (x.out17 ??= { rel: {}, preset: [], log: [] }); };

export const outletsNow = (s: GameState, rel?: Release): OutDef[] => OUTLETS.filter((o) => s.year >= o.from && s.year <= o.to && (!o.single || !rel || rel.type === 'single'));
/** Alcance efetivo: fade no fim da vida do canal, afinidade de gênero. */
export function reachOf(s: GameState, o: OutDef, rel: Release): number {
  const fade = o.to < 2100 ? clamp((o.to - s.year) / 5, 0.3, 1) : 1;
  const fam = o.fam ? (o.fam.includes(familyOf(s.acts[rel.actId]?.genre ?? 'pop')) ? 1.3 : 0.8) : 1;
  return o.reach * (o.reach > 0 ? fade * fam : 1);
}
export const feeOf = (s: GameState, o: OutDef) => money(s, o.fee);
export const upfrontOf = (s: GameState, o: OutDef, rel: Release) => (o.upfront ? Math.round(money(s, o.upfront) * (0.5 + (s.acts[rel.actId]?.fame ?? 20) / 50)) : 0);
export const editable = (s: GameState, rel: Release) => rel.owner === 'player' && s.week - rel.week <= 8;
export const relOutlets = (s: GameState, relId: string): OutId[] => out17(s).rel[relId] ?? [];

export function estimate(s: GameState, rel: Release, ids: OutId[]): { reach: number; margin: number; why: [L, number, number][] } {
  let reach = 1, margin = 0;
  const why: [L, number, number][] = [];
  // r17 final: a margem de um canal lateral só vale para a fatia que passa por ele (antes valia para todas as
  // unidades: clube do disco + supermercado derrubavam 50% da receita; loja própria dava +25% em tudo)
  for (const id of ids) { const o = outDef(id); if (!o) continue; const r = reachOf(s, o, rel); reach *= 1 + r; const m = o.margin * shareOf(o); margin += m; why.push([o.name, r, m]); }
  return { reach, margin, why };
}

/** Liga/desliga um canal num lançamento recente: paga a entrada, recebe adiantamento, aplica a imagem. */
export function toggleOutlet(s: GameState, relId: string, id: OutId): L | null {
  const rel = s.releases[relId], o = outDef(id);
  if (!rel || !o) return l('Inválido.', 'Invalid.');
  if (!editable(s, rel)) return l('Só nas primeiras 8 semanas do lançamento.', 'Only in the first 8 weeks of a release.');
  const st = out17(s), cur = st.rel[relId] ?? [];
  if (cur.includes(id)) { st.rel[relId] = cur.filter((x) => x !== id); return null; }
  if (!outletsNow(s, rel).some((x) => x.id === id)) return l('Esse canal não existe nesta época.', 'That channel does not exist in this era.');
  const clash = cur.find((x) => o.excl?.includes(x) || outDef(x)?.excl?.includes(id));
  if (clash) return fmtL(l('Incompatível com {x}.', 'Incompatible with {x}.'), { x: outDef(clash)!.name });
  const fee = feeOf(s, o);
  if (fee && s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  if (fee) post(s, `out17:${relId}:${id}`, -fee, 'marketing', `Canal ${o.name.pt}: ${rel.title}`);
  const up = upfrontOf(s, o, rel);
  if (up) post(s, `out17up:${relId}:${id}`, up, 'sales', `Adiantamento ${o.name.pt}: ${rel.title}`);
  if (o.cred) s.player.reputation.artistic = clamp(s.player.reputation.artistic + o.cred, 0, 100);
  st.rel[relId] = [...cur, id];
  if (up >= money(s, 10000)) emitFact(s, { kind: 'deal', actors: ['player', rel.actId], severity: 45, visibility: 'public', tags: ['deal', 'release'], text: fmtL(l('"{t}" sai com {o}: adiantamento de {v}.', '"{t}" goes out via {o}: {v} advance.'), { t: rel.title, o: o.name, v: `$${Math.round(up / 100).toLocaleString('en-US')}` }), src: 'outlets17' });
  return null;
}
export function setPreset(s: GameState, ids: OutId[]): void { out17(s).preset = ids.filter((x, i, xs) => xs.indexOf(x) === i); }

registerMod('chartUnits', 'outlets17', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  const ids = out17(s).rel[rel.id];
  if (!ids?.length) return null;
  const e = estimate(s, rel, ids);
  // janela: o efeito acaba depois de 4 semanas
  const win = ids.includes('window') && s.week - rel.week > 4 ? 1 / (1 + reachOf(s, outDef('window')!, rel)) : 1;
  return { value: v * e.reach * win, label: l('Canais de venda', 'Sales channels') };
});

// lançamento: aplica o padrão escolhido (sem cobrar o que não cabe no caixa)
registerSimHook('launch', 'outlets17', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || rel.owner !== 'player') return;
  const st = out17(s);
  if (!st.preset.length || st.rel[rel.id]) return;
  for (const id of st.preset) toggleOutlet(s, rel.id, id);
});

registerSimHook('month', 'outlets17', (s) => {
  const st = out17(s);
  for (const [rid, ids] of Object.entries(st.rel)) {
    const rel = s.releases[rid];
    if (!rel || rel.owner !== 'player' || s.week - rel.week > 104) { if (!rel || rel.owner !== 'player') delete st.rel[rid]; continue; }
    const e = estimate(s, rel, ids);
    if (!e.margin) continue;
    const units = rel.weekly.slice(-4).reduce((t, x) => t + x, 0);
    const per = rel.revenue / Math.max(1, rel.totalUnits);
    const adj = Math.round(units * per * e.margin * (ids.includes('window') && s.week - rel.week > 4 ? 0 : 1));
    if (adj) post(s, `out17m:${rid}:${s.month}`, adj, 'sales', adj > 0 ? `Margem dos canais: ${rel.title}` : `Repasse dos canais: ${rel.title}`);
    // jovens x janela; vídeo/vídeo curto fazem fama
    const a = s.acts[rel.actId];
    const y = ids.reduce((t, id) => t + (outDef(id)?.youth ?? 0), 0);
    if (a && y && s.week - rel.week <= 12) a.momentum = clamp(a.momentum + y * 0.6, 0, 100);
  }
});
