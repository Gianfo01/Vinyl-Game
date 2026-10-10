// Rodada 18 (talent18, K1) — acampamentos de composição, topline e pitching (modelo Brill Building / Cheiron /
// camps escandinavos): o selo junta compositores do elenco com topliners contratados por 2 semanas e sai com um
// lote de canções "de fábrica" (refrão forte, menos originalidade). Estrelas de outros selos abrem PEDIDOS de canção
// (gênero, qualidade mínima, prazo); você oferece uma inédita e, se pegar, vira single deles (songsale: cachê +
// royalties para sempre). Estrela grande pode exigir CRÉDITO de composição (o "cut-in" à Elvis/Hill and Range):
// aceitar aumenta a chance, mas tira royalties e, se a música estourar, o compositor de verdade sente — e pode ir a público.

import { clamp, Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { composeSongs, songQ } from '../production';
import { songStatus } from '../repertoire';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, GameState, Song } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { canSell, closeSale, fairTerms, sales } from './songsale';

export interface Camp18 { id: string; host: string; w1: number; size: number; top: number; songs?: string[] }
export interface Pitch18 { id: string; a: string; g: string; minQ: number; until: number; fee: number; cut: number; done?: string }
export interface Camps18State { camps: Camp18[]; pitches: Pitch18[]; cut: Record<string, { star: string; share: number; w: number; told?: 1 }>; seq: number; topShare: Record<string, number> }
declare module '../ext4' { interface Ext4 { camps18: Camps18State } }
const fresh = (): Camps18State => ({ camps: [], pitches: [], cut: {}, seq: 0, topShare: {} });
registerExt4('camps18', fresh);
export function camps18(s: GameState): Camps18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.camps18 ??= fresh()) as Camps18State;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}

export const CAMP_SIZE18: { name: L; usd: number; songs: number; mel: number; desc: L }[] = [
  { name: l('—', '—'), usd: 0, songs: 0, mel: 0, desc: l('', '') },
  { name: l('Retiro pequeno', 'Small retreat'), usd: 2500, songs: 2, mel: 3, desc: l('Uma casa alugada, o elenco e um violão.', 'A rented house, the roster and a guitar.') },
  { name: l('Camp de composição', 'Writing camp'), usd: 7000, songs: 4, mel: 6, desc: l('Várias salas, duplas trocando a cada dia.', 'Several rooms, pairs swapping every day.') },
  { name: l('Camp internacional', 'International camp'), usd: 18000, songs: 6, mel: 9, desc: l('Produtores e topliners de fora, castelo na Suécia ou casa em LA.', 'Producers and topliners from abroad, a castle in Sweden or a house in LA.') },
];
export const topFee18 = (s: GameState) => money(s, s.year >= 1995 ? 2200 : 1200);
export const campCost18 = (s: GameState, size: number, top: number) => money(s, CAMP_SIZE18[size]?.usd ?? 0) + top * topFee18(s);
/** Topliners por época: Brill Building (1958+), Motown/Holland-Dozier-Holland, Cheiron (1992+), camps globais (2005+). */
export function campModel18(s: GameState): L {
  if (s.year >= 2005) return l('camp global (topliners de vários países)', 'global camp (topliners from many countries)');
  if (s.year >= 1992) return l('fábrica sueca de hits (melodia matemática)', 'Swedish hit factory (melodic math)');
  if (s.year >= 1958) return l('cubículos do Brill Building (dupla letra/música)', 'Brill Building cubicles (lyric/music pairs)');
  return l('compositores de aluguel do Tin Pan Alley', 'Tin Pan Alley hired writers');
}

/** Realiza um camp: 2 semanas, canções ficam inéditas no ato anfitrião. */
export function holdCamp18(s: GameState, hostId: string, size: number, top: number): L | null {
  const a = s.acts[hostId], st = camps18(s);
  if (!a || a.owner !== 'player') return l('Escolha um ato do seu elenco para anfitrião.', 'Pick one of your acts as host.');
  if (!CAMP_SIZE18[size] || size < 1) return l('Tamanho inválido.', 'Invalid size.');
  if (st.camps.some((c) => !c.songs)) return l('Já há um camp em andamento.', 'A camp is already running.');
  const cost = campCost18(s, size, top);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `camp18:${hostId}`, -cost, 'recording', `Camp de composição: ${a.name}`);
  st.camps.push({ id: `cp${++st.seq}`, host: hostId, w1: s.week + 2, size, top: clamp(top, 0, 4) });
  if (st.camps.length > 12) st.camps.splice(0, st.camps.length - 12);
  return null;
}

function finishCamp(s: GameState, c: Camp18): void {
  const a = s.acts[c.host];
  c.songs = [];
  if (!a) return;
  const r = Rng.fromSeed(`${s.config.seed}|camp18|${c.id}`);
  const def = CAMP_SIZE18[c.size];
  const songs = composeSongs(s, r, a, def.songs + c.top);
  for (const sg of songs) {
    sg.melody = clamp(sg.melody + def.mel + c.top * 3, 5, 100);
    sg.lyrics = clamp(sg.lyrics + c.top * 2, 5, 100);
    sg.originality = clamp(sg.originality - c.top * 2 - (c.size >= 3 ? 3 : 0), 5, 100);
    sg.q = songQ({ ...sg, performance: sg.melody * 0.6, production: 30 });
    if (c.top) camps18(s).topShare[sg.id] = Math.min(0.5, 0.15 * c.top);
    c.songs.push(sg.id);
  }
  for (const pid of a.members) addStress(s, pid, 3 + c.size, l('Camp de composição', 'Writing camp'));
  const best = songs.slice().sort((x, y) => y.q - x.q)[0];
  const t = fmtL(l('Camp de {a} ({m}) termina com {n} canções. Melhor: "{b}" (Q{q}).{t}', '{a}\'s camp ({m}) ends with {n} songs. Best: "{b}" (Q{q}).{t}'),
    { a: a.name, m: campModel18(s), n: songs.length, b: best?.title ?? '?', q: Math.round(best?.q ?? 0), t: c.top ? fmtL(l(' Topliners ficam com {p}% da edição dessas faixas.', ' Topliners keep {p}% of publishing on these tracks.'), { p: Math.round(Math.min(0.5, 0.15 * c.top) * 100) }) : '' });
  notify(s, t, 'good');
  emitFact(s, { kind: 'deal', actors: [a.id, 'player'], severity: 12, visibility: 'rumor', tags: ['good', 'camp', 'songwriting'], src: 'camps18', text: t });
}

/** Inéditas do seu elenco que podem ser oferecidas. */
export function pitchable18(s: GameState): Song[] {
  const out: Song[] = [];
  for (const id of playerActs(s)) for (const sid of s.acts[id]?.songs ?? []) { const sg = s.songs[sid]; if (sg && !sg.coverOf && !canSell(s, sid) && (songStatus(s, sg) === 'written' || songStatus(s, sg) === 'vault')) out.push(sg); }
  return out.sort((a, b) => b.q - a.q).slice(0, 30);
}
export interface PitchOdds { p: number; why: L[] }
export function pitchOdds18(s: GameState, pid: string, songId: string, giveCut: boolean): PitchOdds {
  const pt = camps18(s).pitches.find((x) => x.id === pid), sg = s.songs[songId], star = pt && s.acts[pt.a];
  if (!pt || !sg || !star) return { p: 0, why: [] };
  const why: L[] = [];
  let p = 0.3;
  const dq = (sg.q - pt.minQ) / 40;
  p += dq; why.push(fmtL(l('Qualidade {q} vs. pedida {m}: {d}', 'Quality {q} vs. requested {m}: {d}'), { q: Math.round(sg.q), m: pt.minQ, d: `${dq >= 0 ? '+' : ''}${Math.round(dq * 100)}%` }));
  const fit = familyOf(sg.genre) === familyOf(pt.g) ? 0.15 : -0.2;
  p += fit; why.push(fit > 0 ? l('Gênero casa: +15%', 'Genre fits: +15%') : l('Gênero de fora: −20%', 'Off-genre: −20%'));
  const rep = (s.player.reputation.artists - 50) / 250;
  p += rep; why.push(fmtL(l('Reputação com artistas: {v}', 'Reputation with artists: {v}'), { v: `${rep >= 0 ? '+' : ''}${Math.round(rep * 100)}%` }));
  if (pt.cut) { const v = giveCut ? 0.25 : -0.15; p += v; why.push(giveCut ? l('Você cede o crédito pedido: +25%', 'You give up the credit asked: +25%') : l('Você recusa o crédito: −15%', 'You refuse the credit: −15%')); }
  return { p: clamp(p, 0.03, 0.92), why };
}
/** Oferece uma canção ao pedido de uma estrela. */
export function pitchSong18(s: GameState, pid: string, songId: string, giveCut: boolean): L {
  const st = camps18(s), pt = st.pitches.find((x) => x.id === pid), sg = s.songs[songId];
  if (!pt || pt.done || pt.until < s.week) return l('Pedido encerrado.', 'Request closed.');
  if (!sg || canSell(s, songId)) return l('Essa canção não pode ser oferecida.', 'That song cannot be pitched.');
  const star = s.acts[pt.a];
  if (!star) return l('O artista sumiu.', 'The artist is gone.');
  const odds = pitchOdds18(s, pid, songId, giveCut);
  const r = Rng.fromSeed(`${s.config.seed}|pitch18|${pid}|${songId}`);
  pt.done = songId;
  if (!r.chance(odds.p)) return fmtL(l('{a} escolheu outra canção. Por quê: {w}', '{a} picked another song. Why: {w}'), { a: star.name, w: odds.why.map((x) => x.pt).join('; ') });
  const fair = fairTerms(s, sg, star.id);
  const share = pt.cut && giveCut ? pt.cut : 0;
  const top = st.topShare[songId] ?? 0;
  const roy = Math.round(fair.royalty * (1 - share) * 1000) / 1000;
  const sale = closeSale(s, r, songId, star.id, { fee: Math.round(pt.fee * (1 - top)), royalty: roy, labelShare: 0.5 });
  if (!sale) return l('Algo deu errado no contrato.', 'Something went wrong with the deal.');
  if (share) st.cut[sale.id] = { star: star.id, share, w: s.week };
  const t = fmtL(l('{a} grava "{t}"! Cachê {f}{c}.', '{a} records "{t}"! Fee {f}{c}.'), { a: star.name, t: sg.title, f: `$${Math.round(pt.fee * (1 - top) / 100).toLocaleString('en-US')}`, c: share ? fmtL(l(', mas a estrela leva {p}% do crédito de composição', ', but the star takes {p}% of the writing credit'), { p: Math.round(share * 100) }) : '' });
  emitFact(s, { kind: 'deal', actors: [star.id, sg.actId, 'player'], severity: 20 + star.fame / 4, visibility: 'public', tags: ['good', 'pitch', 'songwriting', ...(share ? ['cut_in'] : [])], src: 'camps18', text: t });
  return t;
}

registerInboxKind('camps18_cut', { label: l('Crédito', 'Credit'), cat: 'people', icon: 'pen', prio: 2,
  handle: (s, m, act) => {
    const c = camps18(s).cut[String(m.ref?.sale ?? '')];
    const sale = sales(s).sales.find((x) => x.id === m.ref?.sale);
    const star = c && s.acts[c.star];
    if (!c || !sale || !star) return l('Assunto encerrado.', 'Matter closed.');
    const w = sale.writers[0];
    if (act === 'public') {
      scandal(s, star.id, 'money', 30, l('Crédito de composição tomado', 'Songwriting credit taken'), { text: fmtL(l('O compositor de "{t}" acusa {a} de pegar crédito por uma canção que não escreveu.', 'The writer of "{t}" accuses {a} of taking credit for a song they did not write.'), { t: sale.title, a: star.name }), tags: ['credit'] });
      if (w) addStress(s, w, -8, l('Falou a verdade', 'Told the truth'));
      s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100);
      return l('A história sai na imprensa: a estrela fica mal, seu compositor respira — e aquela porta se fecha.', 'The story hits the press: the star looks bad, your writer breathes — and that door closes.');
    }
    if (w) addStress(s, w, 6, l('Crédito tomado em silêncio', 'Credit taken in silence'));
    return l('Silêncio. A estrela fica te devendo uma; seu compositor, magoado.', 'Silence. The star owes you one; your writer, hurt.');
  } });

registerSimHook('month', 'camps18', (s) => {
  const st = camps18(s);
  for (const c of st.camps) if (!c.songs && s.week >= c.w1) finishCamp(s, c);
  if (s.config.role === 'artist' || s.year < 1930) return;
  const r = Rng.fromSeed(`${s.config.seed}|pitch18m|${s.week}`);
  st.pitches = st.pitches.filter((p) => p.until >= s.week - 8).slice(-10);
  if (st.pitches.filter((p) => !p.done && p.until >= s.week).length < 3 && r.chance(0.55)) {
    const stars = Object.values(s.acts).filter((a: Act) => a.owner && a.owner !== 'player' && a.status === 'active' && !a.deceased && a.fame >= 35);
    if (stars.length) {
      const a = r.weighted(stars, (x) => x.fame)!;
      const cut = a.fame >= 70 && (s.year < 1975 || r.chance(0.35)) ? (r.chance(0.5) ? 0.5 : 0.33) : a.fame >= 55 && r.chance(0.2) ? 0.25 : 0;
      const pt: Pitch18 = { id: `pt${++st.seq}`, a: a.id, g: a.genre, minQ: Math.round(clamp(40 + a.fame / 3 + r.normal(0, 6), 35, 85)), until: s.week + 8, fee: money(s, 600 + a.fame * 60), cut };
      st.pitches.push(pt);
      pushInbox18(s, 'camps18_pitch', { from: a.name, subject: fmtL(l('{a} procura canções', '{a} is looking for songs'), { a: a.name }),
        body: fmtL(l('Pedido de repertório ({g}, qualidade {q}+), por 8 semanas. Cachê {f}.{c}', 'Song request ({g}, quality {q}+), open 8 weeks. Fee {f}.{c}'), { g: a.genre.replace(/_/g, ' '), q: pt.minQ, f: `$${Math.round(pt.fee / 100).toLocaleString('en-US')}`, c: cut ? fmtL(l(' Exigem {p}% do crédito de composição.', ' They demand {p}% of the writing credit.'), { p: Math.round(cut * 100) }) : '' }), ref: { pitch: pt.id } });
    }
  }
  // cut-in que virou hit: o compositor de verdade sente
  for (const [sid, c] of Object.entries(st.cut)) {
    if (c.told) continue;
    const sale = sales(s).sales.find((x) => x.id === sid);
    const rel = sale && s.releases[sale.relId];
    if (!rel || !rel.peak || rel.peak > 10) continue;
    c.told = 1;
    const star = s.acts[c.star];
    pushInbox18(s, 'camps18_cut', { from: s.persons[sale.writers[0]]?.name ?? '?', subject: fmtL(l('"{t}" estourou — com o nome de {a} nos créditos', '"{t}" is a hit — with {a}\'s name in the credits'), { t: sale.title, a: star?.name ?? '?' }),
      body: l('Seu compositor está furioso: a estrela assina uma canção que não escreveu. Ir a público expõe a estrela; ficar quieto guarda a relação.', 'Your writer is furious: the star signs a song they did not write. Going public exposes the star; staying quiet keeps the relationship.'),
      ref: { sale: sid }, actions: [{ id: 'public', label: l('Ir a público', 'Go public') }, { id: 'quiet', label: l('Ficar quieto', 'Stay quiet') }] });
  }
});
registerInboxKind('camps18_pitch', { label: l('Pedido de canção', 'Song request'), cat: 'deals', icon: 'pen', prio: 1, goto: () => ({ area: 'talent18', tab: ['talent18', 'camps'] }) });

registerExplain('camps18.pitch', (s, c) => {
  const o = pitchOdds18(s, String(c.pitch), String(c.song), !!c.cut);
  return { title: l('Chance do pitch', 'Pitch chance'), value: o.p, fmt: 'pct', parts: o.why.map((w) => ({ label: w })), note: l('Base 30%; qualidade conta 1% a cada 0,4 ponto acima/abaixo do pedido.', 'Base 30%; quality counts 1% per 0.4 point above/below the request.') };
});
registerAdvisorTip('camps18', (s) => {
  const open = camps18(s).pitches.filter((p) => !p.done && p.until >= s.week);
  if (!open.length || !pitchable18(s).length) return [];
  return [{ id: 'camps18-pitch', level: 'info', cat: 'opportunity', score: 40, text: fmtL(l('{n} estrela(s) pedindo canções — e você tem inéditas.', '{n} star(s) asking for songs — and you have unreleased ones.'), { n: open.length }),
    effect: l('Cachê agora + royalties para sempre se gravarem.', 'A fee now + royalties forever if they record.'), goto: { area: 'talent18', tab: ['talent18', 'camps'] } }];
});
