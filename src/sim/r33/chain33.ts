// R33 · CATÁLOGO — ROYALTIES EM CADEIA (`exp33.chain`, desligado).
// Cada real que um disco rende passa por uma cadeia: COMPOSITOR(ES) e EDITORA dividem a edição; INTÉRPRETE e PRODUTOR
// recebem os pontos do master; o SELO fica com o resto. Numa versão (regravação, sample, remix, tradução) a edição sobe
// a cadeia até os autores da obra original.
//  • `chain33(s, rel)`: o extrato por elo de um disco (pura; a interface mostra no cartão do disco).
//  • Efeito no jogo: versões de OUTROS selos de obras que a SUA editora administra pagam a sua parte da edição todo mês —
//    as versões que já existem na base (coverOf/sampleOf/remixOf/translationOf) e as liberadas pelos pedidos de sample
//    (r33/sample33, por dois anos, pela fama de quem gravou). Nada é pago de trás para frente: a primeira leitura de um
//    disco só marca a receita que ele já tinha.
// O lado de dentro (sua versão de obra alheia paga os autores originais) continua em sys/rights18.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { dealOfRelease, rightsOf } from '../rights';
import { releasesNow27 } from '../tickcache27';
import type { GameState, Release, Song } from '../types';
import { money, playerActs, post } from '../util';
import { cat33, on33, peek33 } from './cat33';

const ON = 'exp33.chain' as const;
/** Edição (execução + mecânico) por real de receita do master — mesma ordem de grandeza das sociedades da rights18. */
export const PUB_RATIO33 = 0.12;
/** Fatia da edição que vai à obra original numa versão. */
export const UP_SHARE33: Record<'cover' | 'sample' | 'remix' | 'translation', number> = { cover: 1, sample: 0.25, remix: 0.5, translation: 1 };

export type Link33K = 'writer' | 'publisher' | 'performer' | 'producer' | 'label' | 'original';
export interface Link33 { k: Link33K; who: string; share: number }
export const LINK_NAME33: Record<Link33K, L> = {
  writer: l('Compositor', 'Writer'), publisher: l('Editora', 'Publisher'), performer: l('Intérprete', 'Performer'),
  producer: l('Produtor', 'Producer'), label: l('Selo', 'Label'), original: l('Obra original', 'Original work'),
};

const upOf = (so: Song): [keyof typeof UP_SHARE33, string] | null =>
  so.coverOf ? ['cover', so.coverOf] : so.sampleOf ? ['sample', so.sampleOf] : so.remixOf ? ['remix', so.remixOf] : so.translationOf ? ['translation', so.translationOf] : null;

/** Fatia da edição de uma obra que fica com a SUA editora (0 = editora de terceiros). */
export function myPubShare33(s: GameState, so: Song): number {
  const a = s.acts[so.actId];
  if (!a || !playerActs(s).includes(a.id)) return 0;
  if (a.playerBand) return 1;
  const rel = s.releases[so.releaseId ?? ''];
  const c = rel ? dealOfRelease(s, rel) : undefined;
  const sh = c ? rightsOf(c).pubShare : 0;
  return sh > 0 ? sh : s.ownPublishing ? 0.5 : 0;
}

/** Extrato por elo de 1,00 de receita do master (+ a edição correspondente, PUB_RATIO33). */
export function chain33(s: GameState, rel: Release): { master: Link33[]; pub: Link33[] } {
  const c = dealOfRelease(s, rel), t = c ? rightsOf(c) : undefined;
  const act = s.acts[rel.actId];
  const perf = act?.playerBand ? 0 : c?.royalty ?? 0;
  const prodId = rel.songs.map((id) => s.songs[id]?.producerId).find(Boolean);
  const prod = prodId ? t?.producerPts ?? 0.03 : 0;
  const master: Link33[] = [];
  if (perf) master.push({ k: 'performer', who: act?.name ?? '?', share: perf });
  if (prod) master.push({ k: 'producer', who: s.persons[prodId!]?.name ?? '?', share: prod });
  master.push({ k: 'label', who: rel.owner === 'player' ? 'player' : s.labels[rel.owner]?.name ?? rel.owner, share: clamp(1 - perf - prod, 0, 1) });
  // edição: média das faixas (versões sobem a cadeia)
  const n = Math.max(1, rel.songs.length);
  let orig = 0, pubCo = 0;
  for (const id of rel.songs) {
    const so = s.songs[id];
    if (!so) continue;
    const up = upOf(so);
    const u = up ? UP_SHARE33[up[0]] : 0;
    orig += u / n;
    const ps = c && t ? t.pubShare : so.actId && s.acts[so.actId]?.playerBand ? 1 : 0.5;
    pubCo += ((1 - u) * ps) / n;
  }
  const pub: Link33[] = [];
  if (orig > 0) pub.push({ k: 'original', who: '', share: orig * PUB_RATIO33 });
  pub.push({ k: 'publisher', who: s.ownPublishing || act?.playerBand ? 'player' : '', share: pubCo * PUB_RATIO33 });
  pub.push({ k: 'writer', who: act?.name ?? '?', share: clamp(1 - orig - pubCo, 0, 1) * PUB_RATIO33 });
  return { master, pub };
}

/** Quanto a sua editora recebe por real de receita deste disco de terceiro (0 = nada). */
export function upstreamShare33(s: GameState, rel: Release): number {
  if (rel.owner === 'player' || s.acts[rel.actId]?.playerBand) return 0;
  const n = Math.max(1, rel.songs.length);
  let f = 0;
  for (const id of rel.songs) {
    const so = s.songs[id], up = so && upOf(so);
    const src = up && s.songs[up[1]];
    if (!src) continue;
    f += (UP_SHARE33[up[0]] * myPubShare33(s, src)) / n;
  }
  return f * PUB_RATIO33;
}

/** Recebido pela cadeia no ano (extrato). */
export const chainYear33 = (s: GameState, y = s.year): number => peek33(s)?.chainY[y] ?? 0;

registerSimHook('month', 'chain33', (s) => {
  if (!on33(s, ON)) return;
  const st = cat33(s);
  let tot = 0;
  for (const rel of releasesNow27(s)) {
    if (rel.owner === 'player') continue;
    const f = upstreamShare33(s, rel);
    if (f <= 0) continue;
    const prev = st.seen[rel.id];
    st.seen[rel.id] = rel.revenue;
    if (prev === undefined) continue;
    tot += Math.max(0, rel.revenue - prev) * f;
  }
  // versões liberadas pelos pedidos de sample: a fama de quem gravou faz o volume
  st.lic = st.lic.filter((x) => x.until >= s.week && s.songs[x.song]);
  for (const x of st.lic) {
    const so = s.songs[x.song];
    const fame = s.acts[x.by]?.fame ?? 0;
    tot += money(s, fame * 6) * x.share * myPubShare33(s, so) * PUB_RATIO33 * 4;
  }
  const v = Math.round(tot);
  if (v <= 0) return;
  if (post(s, 'chain33', v, 'publishing', 'Edição: versões de outros selos (cadeia)')) st.chainY[s.year] = (st.chainY[s.year] ?? 0) + v;
  for (const k of Object.keys(st.chainY)) if (+k < s.year - 5) delete st.chainY[+k];
  if (Object.keys(st.seen).length > 400) st.seen = {};
});
