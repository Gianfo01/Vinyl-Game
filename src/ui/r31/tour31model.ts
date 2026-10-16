// R31 · onda 2 (J) — TURNÊ em cena: mapa e calendário juntos, modelo PURO.
//   ponto no mapa      = cidade da rota; tamanho = lotação da casa (4 portes), cor/símbolo = já tocou (✓) / falta (●);
//   linha da rota      = ordem das datas; ônibus = onde a turnê está (dia N de M);
//   calendário do mês  = show feito / show a fazer / dia de viagem (pontilhado) / estúdio / CONFLITO (vermelho, "!") /
//                        "+" = dia livre para marcar (abre o painel rápido de turnê do artista).
// Lê as turnês do motor (s.tours), as sessões de estúdio e os shows já marcados (clash17.playerShows). Nada é gravado.
// A tabela detalhada (operação da turnê, datas, alteração) continua logo abaixo da cena.

import { cityById, l, type L } from '../../data/world';
import { playerShows, weekOfDay } from '../../sim/sys/clash17';
import { playerAct, playerPerson } from '../../sim/sys/life';
import type { GameState } from '../../sim/types';
import type { Tour } from '../../sim/xtypes';
import { cancelTour } from '../../sim/tours';
import { dateOfDay, dayOfDate, fmtL, playerActs } from '../../sim/util';
import { MON31, plural31, type Spot31 } from './scene31model';

export const TOUR_W31 = 400;
export const TOUR_MAP_H31 = 150;
export const TOUR_H31 = 200;
/** Calendário: faixa de dias embaixo do mapa. */
export const CAL_Y31 = 158, CAL_X31 = 14, CAL_CW31 = 12, CAL_CH31 = 34;

export type DotStatus31 = 'played' | 'todo' | 'cancelled' | 'draft';
export interface TourDot31 { cityId: string; name: L; x: number; y: number; r: number; cap: number; sold: number; status: DotStatus31; day?: number; order: number }
export type DayKind31 = 'played' | 'show' | 'travel' | 'studio' | 'conflict' | 'free' | 'past';
export interface Day31 { dom: number; day: number; kind: DayKind31; cityId?: string; why?: L; plus: boolean; today: boolean }
export interface TourPick31 { id: string; name: string; actName: string; status: Tour['status'] }
export interface Tour31 {
  W: number; H: number; mapH: number; year: number;
  tour?: { id: string; name: string; actId: string; status: Tour['status']; move?: string };
  actId?: string;
  draft: boolean;
  picks: TourPick31[];
  dots: TourDot31[];
  home?: { cityId: string; x: number; y: number };
  bbox: [number, number, number, number];
  month: { year: number; month: number; label: L; first: number; n: number };
  days: Day31[];
  conflicts: number;
  bus?: { x: number; y: number; dayN: number; dayT: number; label: L };
  me: { personId?: string; onRoad: boolean; x: number; y: number; tip: L };
  spots: Spot31[];
}

/** As ações da cena de turnê = as MESMAS funções da tabela de turnês (o teste compara). */
export const TOUR_ACTS31 = {
  /** "Cancelar (devolve metade)": igual ao botão de Shows › Turnês */
  cancel: (s: GameState, tourId: string): L | null => cancelTour(s, tourId),
};

/** Ônibus à esquerda da cidade (os nomes ficam à direita); encosta na borda quando não cabe. */
export const busX31 = (x: number, w: number): number => (x - w - 8 >= 0 ? x - w - 8 : Math.min(TOUR_W31 - w, x + 8));

/** Porte do ponto pela lotação (1 bar … 4 estádio). */
export const dotR31 = (cap: number): number => (cap >= 15000 ? 7 : cap >= 3000 ? 5 : cap >= 600 ? 4 : 3);

/** Turnê mostrada: a escolhida, senão a que está na estrada, senão a próxima marcada, senão a última recente. */
export function pickTour31(s: GameState, tourId?: string): Tour | undefined {
  const mine = new Set(playerActs(s));
  const xs = (s.tours ?? []).filter((x) => mine.has(x.actId));
  return xs.find((x) => x.id === tourId)
    ?? xs.find((x) => x.status === 'running')
    ?? xs.find((x) => x.status === 'planned')
    ?? [...xs].reverse().find((x) => x.status === 'done' && s.day - (x.stops.at(-1)?.day ?? 0) < 120);
}

const daysIn = (y: number, m: number): number => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function tour31(s: GameState, o: { tourId?: string; draft?: string[]; month?: { year: number; month: number } } = {}): Tour31 {
  const mine = new Set(playerActs(s));
  const picks: TourPick31[] = (s.tours ?? []).filter((x) => mine.has(x.actId) && (x.status === 'running' || x.status === 'planned' || (x.status === 'done' && s.day - (x.stops.at(-1)?.day ?? 0) < 120)))
    .map((x) => ({ id: x.id, name: x.name, actName: s.acts[x.actId]?.name ?? '—', status: x.status }));
  const tr = pickTour31(s, o.tourId);
  const draftIds = !tr ? (o.draft ?? []).filter((id) => !!cityById[id]) : [];
  const actId = tr?.actId ?? playerActs(s)[0];

  // pontos (cidade, porte, estado)
  type Raw = Omit<TourDot31, 'x' | 'y' | 'r'>;
  const raw: Raw[] = tr
    ? tr.stops.filter((st) => !!cityById[st.cityId]).map((st, i) => ({ cityId: st.cityId, name: cityById[st.cityId]?.name ?? l('—'), cap: st.capacity, sold: st.sold, status: st.status === 'played' ? 'played' : st.status === 'cancelled' ? 'cancelled' : 'todo', day: st.day, order: i }))
    : draftIds.map((id, i) => ({ cityId: id, name: cityById[id].name, cap: 0, sold: 0, status: 'draft' as const, order: i }));
  const homeId = s.config.homeCity && cityById[s.config.homeCity] ? s.config.homeCity : undefined;
  // a caixa do mapa é a da rota; a sede só entra quando está perto (senão "você" fica num canto, com a dica)
  const route = raw.map((r) => cityById[r.cityId]).filter(Boolean);
  const hc = homeId ? cityById[homeId] : undefined;
  const near = !!hc && (!route.length || (Math.max(...route.map((c) => c.lon), hc.lon) - Math.min(...route.map((c) => c.lon), hc.lon) < 40 && Math.max(...route.map((c) => c.lat), hc.lat) - Math.min(...route.map((c) => c.lat), hc.lat) < 30));
  const pts = [...route, ...(hc && near ? [hc] : [])];
  // projeção equiretangular na caixa das cidades (com folga); mantém a proporção (graus de longitude encolhem com a latitude)
  let lon0 = Math.min(...pts.map((c) => c.lon)), lon1 = Math.max(...pts.map((c) => c.lon));
  let lat0 = Math.min(...pts.map((c) => c.lat)), lat1 = Math.max(...pts.map((c) => c.lat));
  if (!pts.length) { lon0 = -60; lon1 = -30; lat0 = -35; lat1 = -5; }
  const midLat = (lat0 + lat1) / 2, k = Math.max(0.3, Math.cos((midLat * Math.PI) / 180));
  const mw = TOUR_W31 - 24, mh = TOUR_MAP_H31 - 28;
  let spanX = Math.max(4, (lon1 - lon0) * k), spanY = Math.max(3, lat1 - lat0);
  if (spanX / spanY > mw / mh) spanY = spanX * (mh / mw); else spanX = spanY * (mw / mh);
  const cx = (lon0 + lon1) / 2, cy = (lat0 + lat1) / 2;
  const bbox: [number, number, number, number] = [cx - spanX / k / 2 - (12 / mw) * spanX / k, cy - spanY / 2 - (14 / mh) * spanY, cx + spanX / k / 2 + (12 / mw) * spanX / k, cy + spanY / 2 + (14 / mh) * spanY];
  const X = (lon: number) => Math.round(((lon - bbox[0]) / (bbox[2] - bbox[0])) * TOUR_W31);
  const Y = (lat: number) => Math.round(((bbox[3] - lat) / (bbox[3] - bbox[1])) * TOUR_MAP_H31);
  const dots: TourDot31[] = raw.map((r) => { const c = cityById[r.cityId]; return { ...r, x: X(c.lon), y: Y(c.lat), r: r.status === 'draft' ? 3 : dotR31(r.cap) }; });
  const home = homeId && near ? { cityId: homeId, x: X(cityById[homeId].lon), y: Y(cityById[homeId].lat) } : undefined;

  // mês do calendário: o pedido; senão o da próxima data (ou o atual)
  const next = tr?.stops.find((x) => x.status === 'scheduled' && x.day >= s.day);
  const ref = o.month ?? (next && next.day > s.day + 20 ? dateOfDay(s.config.startYear, next.day) : { year: s.year, month: s.month });
  const first = dayOfDate(s.config.startYear, ref.year, ref.month);
  const n = daysIn(ref.year, ref.month);
  const month = { year: ref.year, month: ref.month, label: fmtL(l('{m} {y}', '{m} {y}'), { m: MON31[ref.month], y: ref.year }), first, n };

  // dias: shows, viagem, estúdio, conflitos
  const showAt = new Map<number, Tour['stops'][number]>();
  const travel = new Set<number>();
  for (const st of tr?.stops ?? []) {
    if (st.status === 'cancelled') continue;
    showAt.set(st.day, st);
    for (let d = 1; d <= Math.max(0, st.travelDays); d++) travel.add(st.day - d);
  }
  const studio = new Set<number>();
  for (const se of s.sessions ?? []) {
    if (se.actId !== actId || se.done) continue;
    for (let d = 0; d < se.days; d++) studio.add(se.startDay + d);
  }
  // outro compromisso de palco do mesmo artista na mesma semana (outra turnê, data avulsa, festival)
  const otherWeeks = new Set<number>();
  try {
    for (const x of playerShows(s)) {
      if (x.actId !== actId) continue;
      if (x.kind === 'tour' && tr && x.label === tr.name) continue;
      otherWeeks.add(x.w);
    }
  } catch { /* sem outros shows */ }
  const days: Day31[] = [];
  let conflicts = 0;
  for (let i = 0; i < n; i++) {
    const day = first + i;
    const st = showAt.get(day);
    const past = day < s.day;
    let kind: DayKind31 = past ? 'past' : 'free';
    let why: L | undefined;
    if (st) {
      kind = st.status === 'played' ? 'played' : 'show';
      if (st.status === 'scheduled' && studio.has(day)) { kind = 'conflict'; why = l('Show e estúdio no mesmo dia.', 'Show and studio on the same day.'); }
      else if (st.status === 'scheduled' && otherWeeks.has(weekOfDay(day))) { kind = 'conflict'; why = l('Outro compromisso de palco na mesma semana.', 'Another stage booking in the same week.'); }
    } else if (travel.has(day)) kind = 'travel';
    else if (studio.has(day)) kind = 'studio';
    if (kind === 'conflict') conflicts++;
    days.push({ dom: i + 1, day, kind, cityId: st?.cityId, why, plus: kind === 'free' && !!actId, today: day === s.day });
  }

  // ônibus: na última cidade tocada (ou na primeira, antes de sair)
  let bus: Tour31['bus'];
  if (tr && tr.stops.length && (tr.status === 'running' || tr.status === 'planned')) {
    const played = tr.stops.filter((x) => x.status === 'played');
    const at = played.at(-1) ?? tr.stops[0];
    const c = cityById[at.cityId];
    const d0 = tr.stops[0].day, d1 = tr.stops[tr.stops.length - 1].day;
    const dayT = Math.max(1, d1 - d0 + 1), dayN = Math.max(0, Math.min(dayT, s.day - d0 + 1));
    bus = { x: c ? X(c.lon) : 20, y: c ? Y(c.lat) : 20, dayN, dayT,
      label: tr.status === 'planned' ? fmtL(l('Sai em {n} dias', 'Leaves in {n} days'), { n: Math.max(0, d0 - s.day) }) : fmtL(l('Dia {a}/{b}', 'Day {a}/{b}'), { a: dayN, b: dayT }) };
  }

  // você: com a banda na estrada (se for a sua) ou na sede
  const pa = (() => { try { return playerAct(s); } catch { return undefined; } })();
  const onRoad = !!(tr && pa && pa.id === tr.actId && tr.status === 'running');
  const personId = (() => { try { return playerPerson(s)?.id; } catch { return undefined; } })();
  const cl = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
  const me = { onRoad, x: cl(onRoad && bus ? bus.x + 26 : home?.x ?? 14, 8, TOUR_W31 - 8), y: cl(onRoad && bus ? bus.y + 4 : home ? home.y + 2 : TOUR_MAP_H31 - 4, 34, TOUR_MAP_H31 - 2),
    tip: onRoad ? l('Você está na estrada com a banda. Abre o seu painel.', 'You are on the road with the band. Opens your panel.') : homeId ? fmtL(l('Você está na sede, em {c}. Abre o seu painel.', 'You are at the HQ, in {c}. Opens your panel.'), { c: cityById[homeId].name }) : l('Você. Abre o seu painel.', 'You. Opens your panel.') };

  // áreas clicáveis
  const spots: Spot31[] = [];
  for (const d of dots) {
    const tipCity = d.status === 'draft' ? fmtL(l('{c}: na rota em rascunho (parada {n}).', '{c}: on the draft route (stop {n}).'), { c: d.name, n: d.order + 1 })
      : d.status === 'played' ? fmtL(l('{c}: já tocou — {s} de {p} ingressos. Ações da cidade.', '{c}: played — {s} of {p} tickets. City actions.'), { c: d.name, s: d.sold, p: d.cap })
      : d.status === 'cancelled' ? fmtL(l('{c}: data cancelada.', '{c}: date cancelled.'), { c: d.name })
      : fmtL(l('{c}: falta tocar — casa para {p}. Ações da cidade.', '{c}: still to play — {p}-capacity venue. City actions.'), { c: d.name, p: d.cap });
    const pad = Math.max(6, d.r + 3);
    spots.push({ id: `city:${d.order}:${d.cityId}`, x: cl(d.x - pad, 0, TOUR_W31 - pad * 2), y: cl(d.y - pad, 0, TOUR_MAP_H31 - pad * 2), w: pad * 2, h: pad * 2, label: d.name, tip: tipCity,
      badge: d.status === 'played' ? { text: '✓', level: 'info' } : undefined, go: { quick: { kind: 'city', id: d.cityId } }, quick: { kind: 'city', id: d.cityId }, quiet: true });
  }
  if (bus && tr) spots.push({ id: 'bus', x: busX31(bus.x, 48), y: Math.max(0, bus.y - 26), w: 48, h: 24, label: l('Ônibus', 'Bus'),
    tip: fmtL(l('{t}: {d}. Logística, custo e operação da turnê.', '{t}: {d}. Logistics, cost and tour operation.'), { t: tr.name, d: bus.label }),
    badge: { text: bus.label, level: 'info' }, go: { panel: 'bus' } });
  for (const d of days) {
    const x = CAL_X31 + (d.dom - 1) * CAL_CW31, base = { x, y: CAL_Y31, w: CAL_CW31, h: CAL_CH31, quiet: true };
    const date = fmtL(l('{d} de {m}', '{m} {d}'), { d: d.dom, m: MON31[month.month] });
    const city = d.cityId ? cityById[d.cityId]?.name ?? l('—') : undefined;
    if (d.kind === 'conflict') spots.push({ id: `day:${d.dom}`, ...base, label: date, tip: fmtL(l('{d}: CONFLITO — {w} Clique para resolver.', '{d}: CONFLICT — {w} Click to resolve.'), { d: date, w: d.why ?? l('', '') }), badge: { text: '!', level: 'crit' }, go: { panel: `conflict:${d.dom}` } });
    else if ((d.kind === 'show' || d.kind === 'played') && d.cityId) spots.push({ id: `day:${d.dom}`, ...base, label: date, tip: fmtL(d.kind === 'played' ? l('{d}: tocou em {c}.', '{d}: played {c}.') : l('{d}: show em {c}.', '{d}: show in {c}.'), { d: date, c: city! }), go: { quick: { kind: 'city', id: d.cityId } }, quick: { kind: 'city', id: d.cityId } });
    else if (d.kind === 'travel') spots.push({ id: `day:${d.dom}`, ...base, label: date, tip: fmtL(l('{d}: dia de viagem. Abre a logística.', '{d}: travel day. Opens logistics.'), { d: date }), go: { panel: 'bus' } });
    else if (d.kind === 'studio') spots.push({ id: `day:${d.dom}`, ...base, label: date, tip: fmtL(l('{d}: dia de estúdio. Abre o estúdio.', '{d}: studio day. Opens the studio.'), { d: date }), go: { area: 'studio' } });
    else if (d.plus && actId) spots.push({ id: `day:${d.dom}`, ...base, label: date, tip: fmtL(l('{d}: dia livre — marcar data (ações de turnê do artista).', '{d}: free day — book a date (the act\'s tour actions).'), { d: date }), go: { quick: { kind: 'act', id: actId }, focus: 'q.tour' }, quick: { kind: 'act', id: actId } });
  }
  spots.push({ id: 'me', x: me.x - 7, y: me.y - 30, w: 14, h: 32, label: l('Você', 'You'), tip: me.tip, go: { area: 'you' } });

  return {
    W: TOUR_W31, H: TOUR_H31, mapH: TOUR_MAP_H31, year: s.year,
    tour: tr ? { id: tr.id, name: tr.name, actId: tr.actId, status: tr.status, move: tr.kit18?.move } : undefined,
    actId, draft: !tr && draftIds.length > 0, picks, dots, home, bbox, month, days, conflicts, bus, me: { personId, onRoad, x: me.x, y: me.y, tip: me.tip }, spots,
  };
}

/** Legenda escrita (nada só por cor). */
export const TOUR_LEGEND31: { k: DayKind31 | 'dot'; sym: string; name: L }[] = [
  { k: 'played', sym: '✓', name: l('já tocou', 'played') },
  { k: 'show', sym: '●', name: l('a fazer', 'to play') },
  { k: 'travel', sym: '┆', name: l('viagem', 'travel') },
  { k: 'studio', sym: '♪', name: l('estúdio', 'studio') },
  { k: 'conflict', sym: '!', name: l('conflito', 'conflict') },
  { k: 'free', sym: '+', name: l('dia livre', 'free day') },
  { k: 'dot', sym: '◯', name: l('tamanho = lotação', 'size = capacity') },
];

export const tourCount31 = (t: Tour31): L => plural31(t.dots.length, l('1 data', '1 date'), l('{n} datas', '{n} dates'));
