// R31 · onda 4 (ART2) — ASSETS NOVOS DAS SALAS DA SEDE (mesmos desenhos de props31, no corte da sede). Cada sala ganha
// um objeto ligado à mecânica dela, num vão livre da parede/chão (não cobre mobília nem gente):
//   Estúdio → rack de efeitos (sessões) · Elenco → jukebox com as suas músicas (ouvir) · Equipe → telefone (recados)
//   Catálogo → parada da semana · Talentos → mural de recados (músicos sem banda) · Troféus → vitrine de leilão (arrematar).
// Os botões rodam funções que já existem (tela, ficha, sessões, buyRelic, prévia de áudio); montar só lê o estado.

import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { buyRelic, relicPrice, RELIC_KIND } from '../../sim/sys/relics9';
import { cashWhy20, freeCash20 } from '../../sim/oblig20';
import { usd } from '../../sim/sys/crime17';
import { play, nowPlaying, stopAll } from '../../audio/engine';
import { buildSongSpec } from '../../audio/spec';
import { box31, drawProps31, type ArtT31, type G31 } from '../pixel/props31';
import type { Ctx27 } from '../ps/hqpx27';
import { RUN31, SALA_ART31, type Btn31, type Chip31, type Do31, type Hot31, type SalaId31, type SalaM31 } from './salas31model';
import type { Lay31 } from './salas31px';
import { auctionRelics, bestOf, freeHere31, mySongs, unread } from './art31model';
import { listenLock31 } from './art31';

/** `at`: lugar fixo (vão da parede/chão conferido nas capturas); sem ele, o vão livre mais perto de `pref`. */
interface SalaArt31 { id: string; t: ArtT31; pref: number; at?: number; label: L; tip: L }
const DEF31: Partial<Record<SalaId31, SalaArt31>> = {
  studio: { id: 'rack', t: 'rack', pref: 0.3, at: 0.225, label: l('Rack de efeitos', 'Effects rack'), tip: l('O equipamento da época e as sessões em andamento.', 'This era\'s gear and the sessions in progress.') },
  roster: { id: 'jukebox', t: 'jukebox', pref: 0.6, at: 0.595, label: l('Jukebox do selo', 'Label jukebox'), tip: l('As suas músicas: ouvir aqui mesmo.', 'Your songs: hear them right here.') },
  team: { id: 'phone', t: 'phone', pref: 0.6, label: l('Telefone', 'Phone'), tip: l('Recados e decisões esperando você.', 'Messages and decisions waiting for you.') },
  catalog: { id: 'charts', t: 'charts', pref: 0.9, at: 0.905, label: l('Parada da semana', 'This week\'s chart'), tip: l('Os mais tocados agora e o seu melhor lugar.', 'The most played right now and your best spot.') },
  talent: { id: 'flyers', t: 'flyers', pref: 0.4, at: 0.4, label: l('Mural de recados', 'Notice board'), tip: l('"Procura-se banda": músicos livres na cidade.', '"Looking for a band": free musicians in town.') },
  trophy: { id: 'relic', t: 'relic', pref: 0.03, at: 0.025, label: l('Vitrine de leilão', 'Auction case'), tip: l('Relíquias em leilão: arrematar para o acervo.', 'Relics at auction: win one for the collection.') },
};
const W31: Record<ArtT31, number> = { jukebox: 16, charts: 28, phone: 18, relic: 32, ratings: 34, rack: 30, flyers: 30, arcade: 20, car: 46, wanted: 16, pa: 14, radio: 20 };

/** Vão livre mais perto da posição preferida (frações da largura útil); null se a sala está cheia. */
export function freeSlot31(m: SalaM31, need: number, pref: number): number | null {
  const iv = [...m.hots.map((h) => [h.x, h.x + Math.max(h.w, 0.05)] as const), ...m.deco.map((d) => [d.x, d.x + (d.w ?? 0.08)] as const), ...(m.you.here ? [[m.you.x - 0.03, m.you.x + 0.04] as const] : [])]
    .map(([a, b]) => [a - 0.01, b + 0.01] as const).sort((a, b) => a[0] - b[0]);
  const gaps: [number, number][] = [];
  let cur = 0.02;
  for (const [a, b] of iv) { if (a - cur >= need) gaps.push([cur, a]); cur = Math.max(cur, b); }
  if (0.98 - cur >= need) gaps.push([cur, 0.98]);
  let best: number | null = null, bd = 9;
  for (const [a, b] of gaps) { const x = Math.min(Math.max(pref, a), b - need); const d = Math.abs(x - pref); if (d < bd) { bd = d; best = x; } }
  return best === null ? null : Math.round(best * 1000) / 1000;
}

/** Os pontos novos de uma sala (lê o estado; nada é criado). */
export function salaArtHots31(s: GameState, m: SalaM31): Hot31[] {
  const d = DEF31[m.id];
  if (!d) return [];
  const need = W31[d.t] / Math.max(200, m.art.W - 16);
  const x = d.at ?? freeSlot31(m, need, d.pref);
  if (x === null) return [];
  let acts: Btn31[] = [];
  let main: Do31 = { k: 'go', area: 'charts' };
  let chip: Chip31 | undefined;
  switch (d.id) {
    case 'rack': {
      const n = (s.sessions ?? []).filter((y) => !y.done && s.acts[y.actId]?.owner === 'player').length;
      main = { k: 'sessions' };
      acts = [{ id: 'rack.sess', label: l('Sessões de gravação', 'Recording sessions'), do: { k: 'sessions' }, main: true }, { id: 'rack.go', label: l('Estúdio', 'Studio'), do: { k: 'go', area: 'studio' } }];
      if (n) chip = { sym: '●', text: fmtL(l('{n} sessão(ões)', '{n} session(s)'), { n }), tone: 'info' };
      break;
    }
    case 'jukebox': {
      const ss = mySongs(s, 3);
      const lk = listenLock31();
      acts = ss.map((so, i) => ({ id: `juke.${i}`, label: fmtL(l('Ouvir "{t}"', 'Hear "{t}"'), { t: so.title }), do: { k: 'run', id: 'art31.listen', arg: so.song } as Do31, lock: lk, main: i === 0 }));
      acts.push({ id: 'juke.rel', label: l('Seus lançamentos', 'Your releases'), do: { k: 'go', area: 'releases' } });
      main = { k: 'go', area: 'releases' };
      if (ss.length) chip = { sym: '♪', text: fmtL(l('{n} música(s)', '{n} song(s)'), { n: ss.length }), tone: 'info' };
      break;
    }
    case 'phone': {
      const n = unread(s);
      main = { k: 'go', area: 'inbox' };
      acts = [{ id: 'phone.inbox', label: l('Atender os recados', 'Take the messages'), do: main, main: true }];
      if (n) chip = { sym: '✉', text: fmtL(l('{n} recado(s)', '{n} message(s)'), { n }), tone: n >= 5 ? 'soon' : 'info' };
      break;
    }
    case 'charts': {
      const b = bestOf(s);
      main = { k: 'go', area: 'charts' };
      acts = [{ id: 'charts.go', label: l('Ver as paradas', 'See the charts'), do: main, main: true }];
      if (b) { acts.push({ id: 'charts.rel', label: fmtL(l('"{t}" (#{p})', '"{t}" (#{p})'), { t: b.title, p: b.pos }), do: { k: 'release', id: b.rid } }); chip = { sym: '★', text: fmtL(l('você #{p}', 'you #{p}'), { p: b.pos }), tone: 'good' }; }
      break;
    }
    case 'flyers': {
      const fs = freeHere31(s, 3);
      main = { k: 'go', area: 'market' };
      acts = [...fs.map((f, i) => ({ id: `fly.${i}`, label: fmtL(l('{n}, {a} anos', '{n}, {a}'), { n: f.name, a: f.age }), do: { k: 'person', id: f.pid } as Do31 })), { id: 'fly.go', label: l('Descobrir talentos', 'Discover talent'), do: main, main: true }];
      if (fs.length) chip = { sym: 'i', text: fmtL(l('{n} sem banda', '{n} without a band'), { n: fs.length }), tone: 'info' };
      break;
    }
    case 'relic': {
      const rs = auctionRelics(s, 'records').slice(0, 2);
      main = { k: 'go', area: 'lendas' };
      acts = [...rs.map((r, i) => { const v = relicPrice(s, r); return { id: `relic.${i}`, label: fmtL(l('Arrematar {n} ({k}, {v})', 'Win {n} ({k}, {v})'), { n: r.n, k: RELIC_KIND[r.k] ?? l('peça', 'piece'), v: usd(v) }), do: { k: 'run', id: 'art31.relic', arg: r.id } as Do31, lock: freeCash20(s) < v ? cashWhy20(s, v, l('Caixa insuficiente.', 'Not enough cash.')) : null, main: i === 0 }; }),
        { id: 'relic.go', label: l('Troféus e relíquias', 'Trophies and relics'), do: main }];
      if (rs.length) chip = { sym: '§', text: fmtL(l('{n} em leilão', '{n} at auction'), { n: auctionRelics(s, 'records').length }), tone: 'info' };
      break;
    }
  }
  return [{ id: `art:${d.id}`, kind: 'object', x, w: need, label: d.label, tip: d.tip, chip, do: main, acts, pp: { kind: `art31:${d.t}` } }];
}

const artT = (h: Hot31): ArtT31 | null => (h.pp?.kind?.startsWith('art31:') ? (h.pp.kind.slice(6) as ArtT31) : null);
const g31 = (L: Lay31): G31 => { const r = L.rooms.find((x) => x.floor === 0) ?? L.rooms[0]; return { W: L.W, H: L.H, x0: L.X(0), w0: L.X(1) - L.X(0), y0: r.y, fy: L.fy(0), X: L.X, Wd: (f = 0.1) => L.Wd(f) }; };

SALA_ART31.hots = salaArtHots31;
SALA_ART31.hit = (m, lay, h) => { const t = artT(h); return t ? box31({ t, x: h.x }, g31(lay as Lay31), m.art.year) : null; };
SALA_ART31.paint = (g, m, lay) => {
  const items = m.hots.map((h) => ({ h, t: artT(h) })).filter((x): x is { h: Hot31; t: ArtT31 } => !!x.t).map(({ h, t }) => ({ t, x: h.x, n: 2, lit: true }));
  if (items.length) drawProps31(g as Ctx27, items, g31(lay as Lay31), m.art.year);
};

RUN31['art31.listen'] = (s, arg) => {
  if (nowPlaying()) { stopAll(); return null; }
  const so = arg ? s.songs[arg] : undefined;
  if (!so) return l('Sem gravação guardada.', 'No stored recording.');
  return play(buildSongSpec(s, so)) ? null : l('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.');
};
RUN31['art31.relic'] = (s, arg) => buyRelic(s, String(arg ?? ''));
