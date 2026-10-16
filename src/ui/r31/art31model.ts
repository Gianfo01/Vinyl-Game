// R31 · onda 4 (ART2) — ASSETS NOVOS DOS INTERIORES ligados às mecânicas (modelo PURO, sem DOM).
// Cada lugar do Nosso mundo e do submundo ganha objetos novos desenhados no estilo do jogo (src/ui/pixel/props31.ts) —
// jukebox com as suas músicas, parada da semana, telefone público, vitrine de relíquias, quadro de audiência, rack de
// efeitos, mural de recados de músicos, fliperama, carro na porta, cartaz de procurado, som do palco, rádio da sala —
// e cada um vira ponto clicável que abre uma ação que JÁ existe no jogo (ação do lugar, comprar relíquia, advogado,
// ouvir prévia, ficha, painel rápido, uma tela) ou mostra informação lida do estado.
//   artOf31(s, x, year)    — os objetos do lugar nesta época (o que pintar e onde);
//   artSpots31(s, x, room) — os pontos clicáveis (a mesma caixa da pintura);
//   artPanel31(s, x, id)   — o painel: linhas prontas e botões (o que cada botão roda, com o motivo do bloqueio).
// Montar tudo isso só LÊ o estado: nada é criado, nenhum sorteio, nenhuma transação (os testes conferem).

import { l, type L } from '../../data/world';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { placeActs27, homeShowSoon, type PAct27 } from '../../sim/sys/place27';
import { playingThisWeek31, tourCity31 } from '../../sim/sys/where31';
import { cells31, cellLock31, lawyerCost31, myFile31, police31, room31 } from '../../sim/sys/under31';
import { relicPrice, isRelicFixed9, RELIC_KIND, type Relic } from '../../sim/sys/relics9';
import { FMT18, type Fmt18 } from '../../sim/sys/radio18';
import { VENUES17 } from '../../sim/sys/venues17';
import { cashWhy20, freeCash20 } from '../../sim/oblig20';
import { usd } from '../../sim/sys/crime17';
import { box31, variant31, type ArtItem31, type ArtT31, type CarK31, type G31 } from '../pixel/props31';
import { geom27, type IKind27, type Interior27, type PropT27 } from '../pixel/interior27';
import type { Badge31, Spot31 } from './scene31model';
import type { InsideT31 } from './inside31model';

// ---------------------------------------------------------------- o que cada lugar ganha (por época)

/** Um objeto novo: desenho próprio (`t`) ou ponto sobre um adereço que já existe (`on`). */
export interface ArtDef31 {
  id: string; t?: ArtT31; on?: PropT27; x: number; w?: number; car?: CarK31;
  label: L; tip: L;
  /** painel direto (rota já existente) em vez do painel do asset */
  route?: string;
  /** adereço genérico da época que o novo substitui no mesmo lugar (cartaz qualquer vira a parada) */
  replaces?: PropT27;
}
type Ctx = { s: GameState; x: InsideT31; year: number };
type Rule = (c: Ctx) => ArtDef31 | null;

const A = (id: string, t: ArtT31 | undefined, x: number, label: L, tip: L, o: Partial<ArtDef31> = {}): ArtDef31 => ({ id, t, x, label, tip, ...o });

const CHARTS = (x: number, w = 0.08, replaces?: PropT27): Rule => () => A('charts', 'charts', x, l('Parada da semana', 'This week\'s chart'), l('Os mais tocados e vendidos agora, com o seu melhor lugar.', 'The most played and sold right now, with your best spot.'), { w, replaces });
const PHONE = (x: number, tip?: L): Rule => () => A('phone', 'phone', x, l('Telefone público', 'Payphone'), tip ?? l('Ligar para o escritório: recados e decisões esperando você.', 'Call the office: messages and decisions waiting for you.'));
const wantedDef = (x: number): ArtDef31 => A('wanted', 'wanted', x, l('Cartaz de procurado', 'Wanted poster'), l('Quem a polícia procura e o calor sobre você.', 'Who the police are after and the heat on you.'));
const WANTED = (x: number): Rule => () => wantedDef(x);

const tourHere = (s: GameState): string[] => {
  const out = new Set<string>();
  for (const w of playingThisWeek31(s)) out.add(w.actId);
  for (const t of s.tours ?? []) if (t.status === 'running' && tourCity31(s, t.actId) === s.config.homeCity) out.add(t.actId);
  return [...out];
};

const RULES31: Partial<Record<IKind27, Rule[]>> = {
  venue: [
    () => A('pa', 'pa', 0.425, l('Som da casa', 'House sound'), l('O equipamento desta época e a lotação; marcar uma data aqui.', 'This era\'s gear and the capacity; book a date here.')),
    CHARTS(0.27),
    PHONE(0.36),
    ({ s }) => (tourHere(s).length || homeShowSoon(s) ? A('car', 'car', 0.56, l('Ônibus da turnê', 'Tour bus'), l('Quem chegou para tocar na cidade nesta semana.', 'Who came to play in town this week.'), { car: 'tour' }) : null),
  ],
  records: [
    CHARTS(0.55, 0.07, 'poster'),
    () => A('relic', 'relic', 0.63, l('Vitrine de raridades', 'Rarities case'), l('Relíquias em leilão: arrematar aqui.', 'Relics at auction: win one here.'), { w: 0.1 }),
  ],
  radio: [
    () => A('ratings', 'ratings', 0.29, l('Quadro de audiência', 'Ratings board'), l('As estações, o formato e a sua relação com cada diretor.', 'The stations, their format and your standing with each director.'), { w: 0.13 }),
    CHARTS(0.45, 0.09),
  ],
  studio: [() => A('rack', 'rack', 0.18, l('Rack de efeitos', 'Effects rack'), l('O equipamento da época e as suas sessões em andamento.', 'This era\'s gear and your sessions in progress.'), { w: 0.13 })],
  bar: [
    ({ year }) => A('jukebox', year >= 1940 ? undefined : 'jukebox', 0.69, l('Jukebox', 'Jukebox'), l('Ouvir as suas músicas e o que o povo está pedindo.', 'Hear your songs and what people are asking for.'), year >= 1940 ? { on: 'jukebox' } : {}),
    PHONE(0.385),
  ],
  press: [PHONE(0.635, l('Ligar para a redação: marcar entrevista com um artista seu.', 'Call the newsroom: book an interview for one of your acts.'))],
  rehearsal: [() => A('flyers', 'flyers', 0.07, l('Mural de recados', 'Notice board'), l('"Procura-se músico": quem está sem banda na cidade.', '"Musician wanted": who has no band in town.'), { w: 0.13 })],
  label: [CHARTS(0.44)],
  apartments: [({ year }) => A('radio', year >= 1955 ? 'radio' : undefined, 0.48, l('Rádio da sala', 'Living-room radio'), l('O que toca em casa: ouvir as suas músicas.', 'What plays at home: hear your songs.'), year >= 1955 ? {} : { on: 'tv' })],
  hotel: [
    () => A('arcade', 'arcade', 0.885, l('Máquina do saguão', 'Lobby machine'), l('O placar da semana: as gravadoras com mais discos nas paradas.', 'This week\'s scoreboard: the labels with the most records in the charts.')),
    ({ s }) => (tourHere(s).length
      ? A('car', 'car', 0.4, l('Ônibus da turnê', 'Tour bus'), l('Artistas em turnê hospedados aqui.', 'Touring acts staying here.'), { car: 'tour' })
      : A('car', 'car', 0.4, l('Táxi na porta', 'Cab at the door'), l('Quem chega e quem sai do hotel.', 'Who arrives and leaves the hotel.'), { car: 'cab' })),
  ],
  instruments: [() => A('relic', 'relic', 0.5, l('Vitrine histórica', 'Historic case'), l('Instrumentos e peças lendárias em leilão.', 'Legendary instruments and pieces at auction.'), { w: 0.12 })],
  facade: [
    ({ x }) => wantedDef(x.v === 'casino' ? 0.62 : 0.8),
    ({ x }) => (x.org ? A('car', 'car', 0.5, l('Carro preto na porta', 'Black car at the door'), l('O carro do chefe: quem manda aqui.', 'The boss\'s car: who runs this place.'), { car: 'boss' }) : null),
  ],
  police: [
    WANTED(0.205),
    PHONE(0.468, l('O direito a um telefonema: chamar advogado para quem é seu.', 'The right to one call: get a lawyer for your people.')),
    () => A('car', 'car', 0.3, l('Viatura', 'Patrol car'), l('Viaturas na ronda e o calor da polícia.', 'Patrols around and the police heat.'), { car: 'police' }),
  ],
  market: [
    WANTED(0.35),
    () => A('car', 'car', 0.5, l('Furgão na porta', 'Van at the door'), l('O que chegou no beco este mês.', 'What came to the alley this month.'), { car: 'van', route: 'info:bm' }),
  ],
  baile: [() => A('car', 'car', 0.7, l('Viatura na esquina', 'Patrol on the corner'), l('A polícia rondando o baile: o calor agora.', 'Police circling the party: the heat right now.'), { car: 'police' })],
};

/** Os objetos novos do lugar nesta época. */
export function artDefs31(s: GameState, x: InsideT31): ArtDef31[] {
  const c: Ctx = { s, x, year: x.year };
  return (RULES31[x.k] ?? []).map((r) => r(c)).filter((d): d is ArtDef31 => !!d);
}

/** Tira da sala os adereços genéricos que um asset novo substitui (mesmo tipo, a menos de 3% da largura). */
export function dressRoom31(s: GameState, x: InsideT31, room: Interior27): Interior27 {
  const rep = artDefs31(s, x).filter((d) => d.replaces);
  if (!rep.length) return room;
  return { ...room, props: room.props.filter((p) => !rep.some((d) => d.replaces === p.t && Math.abs(d.x - p.x) < 0.03)) };
}

/** O que pintar (só os de desenho próprio). */
export function artItems31(s: GameState, x: InsideT31): ArtItem31[] {
  return artDefs31(s, x).filter((d) => d.t).map((d) => ({ t: d.t!, x: d.x, w: d.w, car: d.car, n: d.t === 'relic' ? Math.min(3, auctionRelics(s, x.k).length || 1) : undefined, lit: d.t === 'charts' ? bestOf(s) !== null : undefined }));
}

// ---------------------------------------------------------------- pontos clicáveis

/** Pontos dos objetos novos (mesma caixa da pintura; ponto sobre adereço antigo usa a caixa do adereço). */
export function artSpots31(s: GameState, x: InsideT31, room: Interior27, W: number): Spot31[] {
  const G = geom27(W) as G31;
  const out: Spot31[] = [];
  for (const d of artDefs31(s, x)) {
    let bx: { x: number; y: number; w: number; h: number } | null = null;
    if (d.t) bx = box31({ t: d.t, x: d.x, w: d.w, car: d.car }, G, x.year);
    else if (d.on) {
      const pr = room.props.find((p) => p.t === d.on);
      if (pr) { const px = G.X(pr.x); bx = { x: px - 1, y: G.fy - 26, w: Math.max(14, pr.w ? G.Wd(pr.w) : 14), h: 26 }; }
    }
    if (!bx) continue;
    const lock = lockOf(s, x, d);
    out.push({ id: `art:${d.id}`, x: bx.x, y: bx.y, w: bx.w, h: bx.h, label: d.label, tip: lock ? fmtL(l('{t} 🔒 {w}', '{t} 🔒 {w}'), { t: d.tip, w: lock }) : d.tip, go: { panel: d.route ?? `art:${d.id}` }, badge: badgeOf(s, x, d) });
  }
  return out;
}

/** Motivo de bloqueio da ação principal, mostrado na dica antes do clique. */
function lockOf(s: GameState, x: InsideT31, d: ArtDef31): L | undefined {
  const pa = (id: string) => placeActsOf(s, x).find((a) => a.id === id);
  if (d.id === 'pa') return pa('show')?.dis;
  if (d.id === 'phone' && x.k === 'press') return pa('interview')?.dis;
  if (d.id === 'phone' && x.k === 'police' && !cells31(s).some((c) => c.mine)) return l('Ninguém seu está preso.', 'None of your people is in jail.');
  return undefined;
}

/** Selo curto (texto + símbolo): seu disco na parada, recados, relíquias à venda, presos seus. */
function badgeOf(s: GameState, x: InsideT31, d: ArtDef31): Badge31 | undefined {
  switch (d.id) {
    case 'charts': { const b = bestOf(s); return b ? { text: fmtL(l('você #{p}', 'you #{p}'), { p: b.pos }), level: 'info', sym: '★' } : undefined; }
    case 'jukebox': case 'radio': return mySongs(s).length ? { text: l('suas músicas', 'your songs'), level: 'info', sym: '♪' } : undefined;
    case 'phone': {
      if (x.k === 'police') { const n = cells31(s).filter((c) => c.mine).length; return n ? { text: fmtL(l('{n} seu(s) preso(s)', '{n} of yours jailed'), { n }), level: 'soon' } : undefined; }
      if (x.k === 'press') return undefined;
      const n = unread(s); return n ? { text: fmtL(l('{n} recado(s)', '{n} message(s)'), { n }), level: n >= 5 ? 'soon' : 'info' } : undefined;
    }
    case 'relic': { const n = auctionRelics(s, x.k).length; return n ? { text: fmtL(l('{n} em leilão', '{n} at auction'), { n }), level: 'info' } : undefined; }
    case 'wanted': { const f = myFile31(s); const ch = f.cases.filter((c) => c.stage === 'charged').length; return ch ? { text: l('seu nome', 'your name'), level: 'soon', sym: '!' } : f.heat >= 45 ? { text: fmtL(l('calor {h}', 'heat {h}'), { h: f.heat }), level: 'info' } : undefined; }
    case 'car': return d.car === 'tour' ? { text: fmtL(l('{n} na cidade', '{n} in town'), { n: tourHere(s).length || 1 }), level: 'info' } : d.car === 'police' ? (police31(s).heat >= 45 ? { text: fmtL(l('calor {h}', 'heat {h}'), { h: police31(s).heat }), level: 'soon' } : undefined) : undefined;
    default: return undefined;
  }
}

// ---------------------------------------------------------------- leituras (sem criar estado)

const placeActsOf = (s: GameState, x: InsideT31): PAct27[] => (x.place ? placeActs27(s, x.place) : []);
const x4 = <T>(s: GameState, k: string): T | undefined => (s as unknown as { x4?: Record<string, unknown> }).x4?.[k] as T | undefined;

/** Recados não lidos + decisões esperando (lê a caixa sem criar o bloco). */
export function unread(s: GameState): number {
  const ib = x4<{ inbox?: { read?: boolean; resolved?: boolean }[] }>(s, 'people')?.inbox ?? [];
  return ib.filter((m) => !m.read && !m.resolved).length + (s.decisions?.length ?? 0);
}

/** Seu melhor lugar nas paradas de singles/álbuns. */
export function bestOf(s: GameState): { pos: number; title: string; rid: string } | null {
  let best: { pos: number; title: string; rid: string } | null = null;
  for (const list of [s.charts.singles, s.charts.albums]) list.forEach((e, i) => {
    const r = s.releases[e.releaseId];
    if (r?.owner === 'player' && (!best || i + 1 < best.pos)) best = { pos: i + 1, title: r.title, rid: r.id };
  });
  return best;
}

/** Suas músicas gravadas mais recentes (o que a jukebox / o rádio de casa tem). */
export function mySongs(s: GameState, n = 4): { song: string; title: string; act: string; rid: string }[] {
  const mine = new Set(playerActs(s));
  const rs = Object.values(s.releases).filter((r) => mine.has(r.actId) || r.owner === 'player').sort((a, b) => b.week - a.week);
  const out: { song: string; title: string; act: string; rid: string }[] = [];
  for (const r of rs) {
    const sid = r.songs.find((x) => s.songs[x]);
    if (sid) out.push({ song: sid, title: s.songs[sid].title, act: s.acts[r.actId]?.name ?? '?', rid: r.id });
    if (out.length >= n) break;
  }
  return out;
}

const INSTR = new Set(['guitar', 'drums', 'piano', 'bass', 'mic']);
/** Relíquias em leilão (a loja de instrumentos mostra primeiro os instrumentos). */
export function auctionRelics(s: GameState, k: IKind27): Relic[] {
  const list = x4<{ list?: Relic[] }>(s, 'relics9')?.list ?? [];
  const xs = list.filter((r) => r.st === 'auction' && !isRelicFixed9(r));
  return k === 'instruments' ? [...xs.filter((r) => INSTR.has(r.k)), ...xs.filter((r) => !INSTR.has(r.k))] : xs;
}

/** Músicos sem banda que já passaram por bandas notáveis (mesma regra de soul9.freeMusicians, sem criar o bloco). */
export function freeHere31(s: GameState, n = 5): { pid: string; name: string; age: number; inst: string }[] {
  const mem = x4<{ mem?: Record<string, unknown> }>(s, 'chron9')?.mem ?? {};
  const busy = new Set<string>();
  for (const a of Object.values(s.acts)) if (a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus') for (const m of a.members) busy.add(m);
  const out: { pid: string; name: string; age: number; inst: string }[] = [];
  for (const id of Object.keys(mem).sort()) {
    const p = s.persons[id];
    if (!p?.alive || p.isPlayer || busy.has(id) || s.year - p.born < 18 || s.year - p.born > 55) continue;
    out.push({ pid: id, name: p.name, age: s.year - p.born, inst: String((p as { instrument?: string }).instrument ?? '') });
    if (out.length >= n) break;
  }
  return out;
}

/** Placar: gravadoras com mais discos no top 40 de singles e álbuns. */
export function scoreboard31(s: GameState, n = 5): { name: string; n: number; you: boolean }[] {
  const m = new Map<string, number>();
  for (const list of [s.charts.singles.slice(0, 40), s.charts.albums.slice(0, 40)]) for (const e of list) {
    const r = s.releases[e.releaseId];
    if (r) m.set(r.owner, (m.get(r.owner) ?? 0) + 1);
  }
  return [...m.entries()].map(([id, k]) => ({ name: id === 'player' ? s.config.companyName : s.labels[id]?.name ?? '?', n: k, you: id === 'player' }))
    .sort((a, b) => b.n - a.n || (a.name < b.name ? -1 : 1)).slice(0, n);
}

// ---------------------------------------------------------------- painel do asset

/** O que um botão roda (a tela traduz para a função do jogo que já existe; o modelo só descreve). */
export type ArtRun31 =
  | { k: 'place'; act: string }
  | { k: 'go'; area: string; tab?: [string, string] }
  | { k: 'panel'; panel: string }
  | { k: 'listen'; song: string }
  | { k: 'relic'; id: string }
  | { k: 'lawyer'; pid: string }
  | { k: 'quick'; act: string }
  | { k: 'person'; pid: string }
  | { k: 'ficha'; key: string };
export interface ArtBtn31 { label: L; run: ArtRun31; lock?: L | null; main?: boolean }
export interface ArtPanel31 { title: L; lines: L[]; btns: ArtBtn31[] }

const ERA_LINE: Record<string, L> = {
  // som do palco
  'pa:horn': l('Corneta no poste: a voz tem de vencer a sala sozinha.', 'A horn on a pole: the voice must fill the room alone.'),
  'pa:column': l('Colunas de som valvuladas: o primeiro "sistema de som" da casa.', 'Valve speaker columns: the house\'s first "sound system".'),
  'pa:stack': l('Pilhas de amplificador: volume de rock, o palco é o PA.', 'Amp stacks: rock volume, the stage is the PA.'),
  'pa:tower': l('Torres de PA e mesa no meio do público.', 'PA towers and a desk in the middle of the crowd.'),
  'pa:array': l('Line array pendurado: som igual do gargarejo ao fundo.', 'A flown line array: the same sound front to back.'),
  'pa:holo': l('Projetor de holograma e som espacial.', 'Hologram projector and spatial sound.'),
  // rack
  'rack:chamber': l('Câmara de eco no porão e microfone de fita.', 'An echo chamber in the basement and a ribbon mic.'),
  'rack:tape': l('Eco de fita e gravador de rolo.', 'Tape echo and a reel-to-reel.'),
  'rack:valve': l('Compressores valvulados e equalizadores.', 'Valve compressors and equalisers.'),
  'rack:digital': l('Rack digital: reverb, sampler e sincronizador.', 'A digital rack: reverb, sampler and sync.'),
  'rack:laptop': l('Laptop com interface: o estúdio cabe na mochila.', 'A laptop and an interface: the studio fits in a backpack.'),
  'rack:neural': l('Processador neural: mixa sozinho, com o seu gosto.', 'A neural processor: it mixes by itself, to your taste.'),
};

export function artPanel31(s: GameState, x: InsideT31, id: string): ArtPanel31 | null {
  const d = artDefs31(s, x).find((y) => y.id === id);
  if (!d) return null;
  const pa = (act: string): ArtBtn31 | null => { const a = placeActsOf(s, x).find((y) => y.id === act); return a ? { label: a.label, run: { k: 'place', act }, lock: a.dis ?? null, main: true } : null; };
  const lines: L[] = [];
  const btns: (ArtBtn31 | null)[] = [];
  const mine = new Set(playerActs(s));
  switch (id) {
    case 'charts': {
      const lb = x.k === 'label' ? Object.values(s.labels).find((y) => y.name === x.place?.owner) : undefined;
      s.charts.singles.slice(0, 5).forEach((e, i) => {
        const r = s.releases[e.releaseId]; if (!r) return;
        const tag = r.owner === 'player' ? l(' ★ seu', ' ★ yours') : lb && r.owner === lb.id ? l(' · deles', ' · theirs') : l('', '');
        lines.push(fmtL(l('{i}. "{t}" — {a}{m}', '{i}. "{t}" — {a}{m}'), { i: i + 1, t: r.title, a: s.acts[r.actId]?.name ?? '?', m: tag }));
      });
      const b = bestOf(s);
      lines.push(b ? fmtL(l('Seu melhor lugar: #{p} com "{t}".', 'Your best spot: #{p} with "{t}".'), { p: b.pos, t: b.title }) : l('Nenhum disco seu nas paradas agora.', 'None of your records in the charts right now.'));
      if (!s.charts.singles.length) lines.unshift(l('A parada ainda não saiu nesta semana.', 'The chart is not out yet this week.'));
      const top = s.charts.singles[0] ? s.releases[s.charts.singles[0].releaseId] : undefined;
      const sid = top?.songs.find((y) => s.songs[y]);
      btns.push({ label: l('Ver as paradas', 'See the charts'), run: { k: 'go', area: 'charts' }, main: true });
      if (sid) btns.push({ label: fmtL(l('Ouvir o nº 1 ("{t}")', 'Hear the No. 1 ("{t}")'), { t: top!.title }), run: { k: 'listen', song: sid } });
      break;
    }
    case 'jukebox': case 'radio': {
      const ss = mySongs(s, 3);
      if (ss.length) for (const so of ss) { lines.push(fmtL(l('"{t}" — {a}', '"{t}" — {a}'), { t: so.title, a: so.act })); btns.push({ label: fmtL(l('Ouvir "{t}"', 'Hear "{t}"'), { t: so.title }), run: { k: 'listen', song: so.song } }); }
      else lines.push(id === 'jukebox' ? l('Nenhum disco seu na jukebox ainda: lance um single.', 'None of your records in the jukebox yet: release a single.') : l('Nada seu tocando em casa ainda: lance um disco.', 'Nothing of yours plays at home yet: release a record.'));
      const top = s.charts.singles[0] ? s.releases[s.charts.singles[0].releaseId] : undefined;
      if (top) lines.push(fmtL(l('O mais pedido: "{t}" — {a}.', 'Most requested: "{t}" — {a}.'), { t: top.title, a: s.acts[top.actId]?.name ?? '?' }));
      btns.push({ label: l('Seus lançamentos', 'Your releases'), run: { k: 'go', area: 'releases' } });
      break;
    }
    case 'phone': {
      if (x.k === 'press') { lines.push(l('A redação atende: entrevista dá exposição, com risco de frase infeliz.', 'The newsroom picks up: an interview gives exposure, with a risk of a gaffe.')); btns.push(pa('interview'), pa('news')); break; }
      if (x.k === 'police') {
        const cs = cells31(s).filter((c) => c.mine);
        if (!cs.length) lines.push(l('Ninguém seu está preso: o telefone fica para quem precisa.', 'None of your people is jailed: the phone is for those who need it.'));
        for (const c of cs.slice(0, 4)) {
          lines.push(fmtL(l('{n} — {w}, faltam {k} semana(s).', '{n} — {w}, {k} week(s) left.'), { n: c.name, w: c.why, k: c.weeks }));
          btns.push({ label: fmtL(l('Advogado para {n} ({v})', 'Lawyer for {n} ({v})'), { n: c.name.split(' ')[0], v: usd(lawyerCost31(s)) }), run: { k: 'lawyer', pid: c.pid }, lock: cellLock31(s, c.pid, 'lawyer'), main: true });
        }
        btns.push({ label: l('Ver as celas', 'See the cells'), run: { k: 'panel', panel: 'info:cells' } });
        break;
      }
      const n = unread(s);
      lines.push(n ? fmtL(l('{n} recado(s) e decisão(ões) esperando no escritório.', '{n} message(s) and decision(s) waiting at the office.'), { n }) : l('Nenhum recado: o escritório está em dia.', 'No messages: the office is up to date.'));
      btns.push({ label: l('Atender os recados', 'Take the messages'), run: { k: 'go', area: 'inbox' }, main: true });
      break;
    }
    case 'relic': {
      const rs = auctionRelics(s, x.k).slice(0, 4);
      if (!rs.length) lines.push(l('Vitrine vazia: nenhuma relíquia em leilão agora.', 'The case is empty: no relic at auction right now.'));
      for (const r of rs) {
        const price = relicPrice(s, r);
        const left = r.au !== undefined ? Math.max(0, r.au - s.week) : undefined;
        lines.push(fmtL(l('{n} ({k}) — {v}{w}', '{n} ({k}) — {v}{w}'), { n: r.n, k: RELIC_KIND[r.k] ?? l('peça', 'piece'), v: usd(price), w: left !== undefined ? fmtL(l(', termina em {n} semana(s)', ', ends in {n} week(s)'), { n: left }) : l('', '') }));
        btns.push({ label: fmtL(l('Arrematar: {n}', 'Win: {n}'), { n: r.n }), run: { k: 'relic', id: r.id }, lock: freeCash20(s) < price ? cashWhy20(s, price, l('Caixa insuficiente.', 'Not enough cash.')) : null, main: true });
      }
      const own = (x4<{ list?: Relic[] }>(s, 'relics9')?.list ?? []).filter((r) => r.st === 'player').length;
      lines.push(fmtL(l('No seu acervo: {n} peça(s).', 'In your collection: {n} piece(s).'), { n: own }));
      btns.push({ label: l('Troféus e relíquias', 'Trophies and relics'), run: { k: 'go', area: 'lendas' } });
      break;
    }
    case 'ratings': {
      const st = x4<{ st?: { call: string; fmt: Fmt18; pd: string; rel: number }[] }>(s, 'radio18')?.st ?? [];
      if (!st.length) lines.push(l('Ainda sem estações na cidade.', 'No stations in town yet.'));
      for (const y of st.slice(0, 5)) lines.push(fmtL(l('{c} — {f} · diretor {p}, relação {r}/100', '{c} — {f} · director {p}, standing {r}/100'), { c: y.call, f: FMT18[y.fmt]?.name ?? l('variedades', 'variety'), p: y.pd, r: Math.round(y.rel) }));
      btns.push(pa('pitch'), pa('lunch'));
      break;
    }
    case 'rack': {
      lines.push(ERA_LINE[`rack:${variant31('rack', x.year)}`]);
      const ss = (s.sessions ?? []).filter((y) => !y.done && mine.has(y.actId));
      for (const y of ss.slice(0, 3)) lines.push(fmtL(l('{a} está gravando (sessão em andamento).', '{a} is recording (session in progress).'), { a: s.acts[y.actId]?.name ?? '?' }));
      if (!ss.length) lines.push(l('Nenhuma sessão sua em andamento.', 'No session of yours in progress.'));
      btns.push(pa('rent'), { label: l('Estúdio da sede', 'Your studio'), run: { k: 'go', area: 'studio' } });
      break;
    }
    case 'flyers': {
      const fs = freeHere31(s, 5);
      if (!fs.length) lines.push(l('Nenhum recado novo: todo mundo está tocando em alguma banda.', 'No new notes: everyone is playing in some band.'));
      for (const f of fs) { lines.push(fmtL(l('{n}, {a} anos{i} — procura banda.', '{n}, {a} — looking for a band{i}.'), { n: f.name, a: f.age, i: f.inst ? l(` (${f.inst.replace(/_/g, ' ')})`, ` (${f.inst.replace(/_/g, ' ')})`) : l('', '') })); btns.push({ label: fmtL(l('Ficha de {n}', '{n}\'s card'), { n: f.name.split(' ')[0] }), run: { k: 'person', pid: f.pid } }); }
      btns.push({ label: l('Descobrir talentos', 'Discover talent'), run: { k: 'go', area: 'market' }, main: true });
      break;
    }
    case 'arcade': {
      const sb = scoreboard31(s);
      if (!sb.length) lines.push(l('Placar zerado: a parada ainda não saiu.', 'Scoreboard empty: the chart is not out yet.'));
      sb.forEach((y, i) => lines.push(fmtL(l('{i}. {n} — {k} disco(s){m}', '{i}. {n} — {k} record(s){m}'), { i: i + 1, n: y.name, k: y.n, m: y.you ? l(' ★', ' ★') : l('', '') })));
      btns.push({ label: l('Gravadoras rivais', 'Rival labels'), run: { k: 'go', area: 'labels' }, main: true });
      break;
    }
    case 'pa': {
      lines.push(ERA_LINE[`pa:${variant31('pa', x.year)}`]);
      const v = x.place?.venue ? VENUES17.find((y) => y.id === x.place?.venue) : undefined;
      if (v) lines.push(fmtL(l('Lotação: {n} pessoas.', 'Capacity: {n} people.'), { n: v.cap }));
      btns.push(pa('show'), { label: l('Shows e turnês', 'Shows and tours'), run: { k: 'go', area: 'shows' } });
      break;
    }
    case 'car': {
      if (d.car === 'tour' || d.car === 'cab') {
        const ids = tourHere(s);
        if (!ids.length) lines.push(l('Nenhum artista em turnê na cidade agora.', 'No touring act in town right now.'));
        for (const a of ids.slice(0, 5)) { const ac = s.acts[a]; if (!ac) continue; lines.push(fmtL(l('{a}{m}', '{a}{m}'), { a: ac.name, m: mine.has(a) ? l(' (seu)', ' (yours)') : l('', '') })); btns.push({ label: l(ac.name, ac.name), run: { k: 'quick', act: a } }); }
        const sh = homeShowSoon(s);
        if (sh) lines.push(fmtL(l('Seu show em casa: {a} em {d} dia(s).', 'Your home show: {a} in {d} day(s).'), { a: s.acts[sh.t.actId]?.name ?? '?', d: sh.st.day - s.day }));
        btns.push({ label: l('Shows e turnês', 'Shows and tours'), run: { k: 'go', area: 'shows' } });
      } else if (d.car === 'boss') {
        const r = x.org ? room31(s, x.org) : null;
        if (r) { lines.push(fmtL(l('{b} ({r}) está aqui hoje.', '{b} ({r}) is here today.'), { b: r.boss.name, r: r.boss.role })); if (r.boss.key) btns.push({ label: l('Ficha do chefe', 'The boss\'s card'), run: { k: 'ficha', key: r.boss.key } }); }
        btns.push({ label: l('Entrar na sala dos fundos', 'Go into the back room'), run: { k: 'panel', panel: 'room:enter' }, main: true });
      } else if (d.car === 'police') {
        const p = police31(s);
        lines.push(fmtL(l('{a}: {t}', '{a}: {t}'), { a: p.agency, t: p.text }), fmtL(l('Calor: {h}/100 · {n} viatura(s) na ronda.', 'Heat: {h}/100 · {n} patrol car(s) around.'), { h: p.heat, n: p.cars }));
        btns.push({ label: l('Sua pasta na polícia', 'Your police file'), run: { k: 'panel', panel: 'info:file' }, main: true });
        if (x.k === 'baile') btns.push({ label: l('O baile', 'The party'), run: { k: 'panel', panel: 'info:baile' } });
      }
      break;
    }
    case 'wanted': {
      const f = myFile31(s);
      const ch = f.cases.filter((c) => c.stage === 'charged');
      lines.push(ch.length ? fmtL(l('Seu nome no cartaz: {n} indiciamento(s).', 'Your name on the poster: {n} charge(s).'), { n: ch.length }) : f.cases.length ? l('Seu nome ainda não está no cartaz, mas há investigação aberta.', 'Your name is not on the poster yet, but there is an open investigation.') : l('Seu nome não está no cartaz.', 'Your name is not on the poster.'));
      lines.push(fmtL(l('Calor no país: {h}/100.', 'Heat in the country: {h}/100.'), { h: f.heat }));
      const cs = cells31(s).slice(0, 3);
      for (const c of cs) lines.push(fmtL(l('Pego: {n} — {w}.', 'Caught: {n} — {w}.'), { n: c.name, w: c.why }));
      btns.push({ label: l('Sua pasta na polícia', 'Your police file'), run: { k: 'panel', panel: 'info:file' }, main: true });
      break;
    }
    default: break;
  }
  return { title: d.label, lines, btns: btns.filter((b): b is ArtBtn31 => !!b) };
}
