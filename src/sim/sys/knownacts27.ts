// Rodada 27 (KNOWN) — "Artistas conhecidos": os artistas que faz sentido a SUA empresa conhecer, e por quê.
// Não é o diretório do mundo inteiro (esse continua em "Todos os artistas"): aqui só entra quem tem um laço plausível
// com você — superestrelas e nomes famosos no seu país (limiar por era), a cena da sua cidade e das cidades onde você
// opera, seu elenco e seus clientes, quem está no seu radar (olheiros, sinais), quem a sua gente conhece (relações do
// seu elenco, parcerias de composição e produção, o line-up do seu festival), as paradas, o elenco dos rivais no seu
// território e quem saiu na imprensa ou nos boatos deste ano. Um ato pequeno e distante sem laço nenhum não aparece.
// O quanto se sabe de cada um (0–3) reaproveita a visibilidade da fama (fame15.knownLevel: olheiros + relação + fama).
// Pura e determinística (nenhum sorteio, nenhuma escrita no estado); memo por semana para o banco 'huge'.

import { cityById, l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { actsOfPerson17 } from '../actidx17';
import { fameAt } from '../famehook16';
import { facts17 } from '../facts17';
import { visibleAct } from '../future';
import { sourceName } from '../scouting';
import type { Act, GameState } from '../types';
import { knownLevel } from './fame15';

/** Motivos (chips) pelos quais o jogador conhece o ato. */
export type Why27 = 'own' | 'client' | 'former' | 'star' | 'famous' | 'local' | 'scout' | 'signal' | 'contact' | 'collab' | 'festival' | 'chart' | 'rival' | 'press' | 'rumor';
export const WHY27: Record<Why27, { name: L; tone: 'good' | 'accent' | 'info' | 'warn' | 'bad' | 'neutral'; group: Group27 }> = {
  own: { name: l('Seu elenco', 'Your roster'), tone: 'good', group: 'circle' },
  client: { name: l('Cliente', 'Client'), tone: 'good', group: 'circle' },
  former: { name: l('Ex-elenco', 'Former roster'), tone: 'neutral', group: 'circle' },
  star: { name: l('Superestrela', 'Superstar'), tone: 'accent', group: 'fame' },
  famous: { name: l('Famoso aqui', 'Famous here'), tone: 'accent', group: 'fame' },
  local: { name: l('Cena local', 'Local scene'), tone: 'info', group: 'local' },
  scout: { name: l('Olheiro', 'Scout'), tone: 'info', group: 'radar' },
  signal: { name: l('Sinal', 'Signal'), tone: 'info', group: 'radar' },
  contact: { name: l('Contato', 'Contact'), tone: 'neutral', group: 'circle' },
  collab: { name: l('Parceria', 'Collaboration'), tone: 'neutral', group: 'circle' },
  festival: { name: l('No seu festival', 'At your festival'), tone: 'neutral', group: 'circle' },
  chart: { name: l('Nas paradas', 'In the charts'), tone: 'warn', group: 'market' },
  rival: { name: l('Rival', 'Rival'), tone: 'bad', group: 'market' },
  press: { name: l('Na imprensa', 'In the press'), tone: 'neutral', group: 'market' },
  rumor: { name: l('Boato', 'Rumor'), tone: 'warn', group: 'market' },
};
/** Grupos de motivos (abas da página). */
export type Group27 = 'circle' | 'radar' | 'fame' | 'local' | 'market';
export const GROUPS27: { id: Group27; name: L }[] = [
  { id: 'circle', name: l('Seu círculo', 'Your circle') },
  { id: 'radar', name: l('Radar', 'Radar') },
  { id: 'fame', name: l('Famosos', 'Famous') },
  { id: 'local', name: l('Cena local', 'Local scene') },
  { id: 'market', name: l('Mercado e imprensa', 'Market and press') },
];
/** O quanto se sabe (0 só o nome · 1 de ouvir falar · 2 conhece bem · 3 a fundo). */
export const KNOW27: L[] = [l('Só o nome', 'Name only'), l('De ouvir falar', 'Heard of'), l('Conhece bem', 'Knows well'), l('A fundo', 'In depth')];

export interface KnownAct27 {
  id: string;
  /** motivos, do mais forte ao mais fraco */
  why: Why27[];
  /** detalhe de cada motivo (quem indicou, posição na parada, selo rival…) */
  det: Partial<Record<Why27, string | L>>;
  /** 0..3 */
  know: 0 | 1 | 2 | 3;
  /** fama vista do país do jogador */
  here: number;
  /** relevância (ordem padrão) */
  score: number;
  /** país (ISO a3) da cidade do ato */
  a3: string | null;
}

/** Limiares de fama por era: quanto mais tarde, mais a mídia é global e mais nomes de fora chegam até você. */
export function limits27(year: number): { star: number; famous: number; local: number; op: number } {
  const famous = year < 1970 ? 46 : year < 1985 ? 43 : year < 2000 ? 40 : year < 2010 ? 37 : 35;
  return { star: 72, famous, local: 3, op: 9 };
}

const W: Record<Why27, number> = { own: 1000, client: 900, scout: 260, former: 240, signal: 200, star: 180, contact: 150, collab: 140, festival: 140, chart: 120, famous: 90, rival: 70, press: 60, rumor: 40, local: 30 };
const live = (a: Act): boolean => a.status !== 'retired' && a.status !== 'split';

interface Ventures { list?: { kind: string; city: string; lineup?: { actId: string }[] }[]; mg?: { clients?: { actId: string }[] } }
const ventures = (s: GameState): Ventures => ((s as unknown as { x4?: { ventures9?: Ventures } }).x4?.ventures9) ?? {};
interface Disc { leads?: { a: string; ch: string }[] }
const disc = (s: GameState): Disc => ((s as unknown as { x4?: { disc18?: Disc } }).x4?.disc18) ?? {};
const CH_NAME: Record<string, L> = {
  openmic: l('microfone aberto', 'open mic'), college: l('rádio universitária', 'college radio'), festival: l('palco de festival', 'festival stage'),
  myspace: l('MySpace', 'MySpace'), youtube: l('YouTube', 'YouTube'), soundcloud: l('SoundCloud', 'SoundCloud'), tiktok: l('TikTok', 'TikTok'),
  referral: l('indicação do elenco', 'roster referral'), school: l('escola de música', 'music school'),
};

const MEMO = new WeakMap<GameState, { sig: string; out: KnownAct27[] }>();
function sigOf(s: GameState): string {
  const v = ventures(s);
  return `${s.config.seed}|${s.week}|${Object.keys(s.knowledge).length}|${Object.values(s.acts).length}|${(v.mg?.clients ?? []).length}|${(disc(s).leads ?? []).length}`;
}

/** Artistas que a sua empresa conhece, com o porquê. Ordem: relevância (seu elenco primeiro), depois fama aqui. */
export function knownArtists27(s: GameState): KnownAct27[] {
  const sig = sigOf(s);
  const m = MEMO.get(s);
  if (m && m.sig === sig) return m.out;
  const out = build(s);
  MEMO.set(s, { sig, out });
  return out;
}

function build(s: GameState): KnownAct27[] {
  const L27 = limits27(s.year);
  const myA3 = countryOfCity(s.config.homeCity);
  const map = new Map<string, { why: Set<Why27>; det: Partial<Record<Why27, string | L>> }>();
  const add = (a: Act | undefined, w: Why27, d?: string | L): void => {
    if (!a) return;
    let e = map.get(a.id);
    if (!e) map.set(a.id, e = { why: new Set(), det: {} });
    e.why.add(w);
    if (d !== undefined && e.det[w] === undefined) e.det[w] = d;
  };
  const acts = Object.values(s.acts);
  const v = ventures(s);

  // 1. seu elenco, clientes e ex-elenco
  const own = acts.filter((a) => a.owner === 'player' || a.playerBand);
  for (const a of own) add(a, 'own');
  for (const c of v.mg?.clients ?? []) add(s.acts[c.actId], 'client');
  for (const x of v.list ?? []) if (x.kind === 'booking') for (const c of (x as { clients?: { actId: string }[] }).clients ?? []) add(s.acts[c.actId], 'client');
  const ownIds = new Set(own.map((a) => a.id));

  // 2. cidades onde você opera: sede, cidades do elenco e dos clientes, empreendimentos, turnês em andamento
  const home = s.config.homeCity;
  const ops = new Set<string>([home]);
  for (const a of own) ops.add(a.city);
  for (const c of v.mg?.clients ?? []) { const a = s.acts[c.actId]; if (a) ops.add(a.city); }
  for (const x of v.list ?? []) if (x.city) ops.add(x.city);
  const tours = ((s as unknown as { tours?: { actId: string; status: string; stops: { cityId: string }[] }[] }).tours) ?? [];
  for (const t of tours) if (ownIds.has(t.actId) && (t.status === 'running' || t.status === 'planned')) for (const st of t.stops) ops.add(st.cityId);

  // 3. fama, cena local e ex-elenco (uma passada só por todos os atos)
  const here = new Map<string, number>();
  const hereOf = (a: Act): number => { let x = here.get(a.id); if (x === undefined) here.set(a.id, x = a.fame >= 2 ? fameAt(s, a, '@me') : a.fame); return x; };
  for (const a of acts) {
    if (ownIds.has(a.id)) continue;
    const vis = visibleAct(s, a);
    if (!vis) continue;
    if (a.fame >= L27.famous * 0.55) { // fama aqui nunca passa de ~1,1×fama+3+desvio local; abaixo disso nem calcula
      const hv = hereOf(a);
      if (a.fame >= L27.star && hv >= 40) add(a, 'star');
      else if (hv >= L27.famous) add(a, 'famous');
    }
    if (live(a) && a.debutYear <= s.year) {
      if (a.city === home && a.fame >= L27.local) add(a, 'local', cityById[a.city]?.name ?? a.city);
      else if (ops.has(a.city) && a.fame >= L27.op) add(a, 'local', cityById[a.city]?.name ?? a.city);
    }
    if (a.owner !== 'player' && a.releases.some((id) => s.releases[id]?.owner === 'player')) add(a, 'former');
  }

  // 4. radar: olheiros (conhecimento) e sinais (descoberta)
  for (const [id, k] of Object.entries(s.knowledge)) {
    const a = s.acts[id];
    if (!a || ownIds.has(id)) continue;
    add(a, 'scout', k.origin?.by ?? (k.source ? sourceName(k.source) : undefined));
  }
  for (const ld of disc(s).leads ?? []) add(s.acts[ld.a], 'signal', CH_NAME[ld.ch] ?? ld.ch);

  // 5. quem a sua gente conhece: relações do jogador e do elenco, parcerias, line-up do seu festival
  const me = Object.values(s.persons).find((p) => p.isPlayer && p.alive);
  const circle: { id: string; name: string; me: boolean }[] = me ? [{ id: me.id, name: me.name, me: true }] : [];
  for (const a of own) for (const pid of a.members) { const p = s.persons[pid]; if (p && p.alive && pid !== me?.id) circle.push({ id: pid, name: p.name, me: false }); }
  const seenC = new Set<string>();
  for (const c of circle) {
    if (seenC.has(c.id)) continue; seenC.add(c.id);
    const p = s.persons[c.id];
    for (const [pid, r] of Object.entries(p?.rel ?? {})) {
      if (Math.abs(r) < 30) continue;
      for (const a of actsOfPerson17(s, pid)) if (!ownIds.has(a.id) && visibleAct(s, a)) add(a, 'contact', c.me ? l('você', 'you') : c.name);
    }
  }
  for (const a of own) {
    const mem = new Set(a.members);
    for (const rid of a.releases) {
      const r = s.releases[rid];
      if (!r) continue;
      const ext = new Set<string>();
      for (const sid of r.songs) { const so = s.songs[sid]; if (!so) continue; for (const w of so.writers) if (!mem.has(w)) ext.add(w); if (so.producerId && !mem.has(so.producerId)) ext.add(so.producerId); }
      for (const pid of ext) for (const b of actsOfPerson17(s, pid)) if (!ownIds.has(b.id)) add(b, 'collab', a.name);
    }
  }
  for (const x of v.list ?? []) if (x.kind === 'festival') for (const ln of x.lineup ?? []) if (!ownIds.has(ln.actId)) add(s.acts[ln.actId], 'festival');

  // 6. mercado: paradas, elenco dos rivais no seu território, imprensa e boatos do ano
  for (const ce of [...s.charts.singles, ...s.charts.albums]) {
    const r = s.releases[ce.releaseId];
    const a = r && s.acts[r.actId];
    if (a && !ownIds.has(a.id)) { const e = map.get(a.id); const prev = e?.det.chart; const pos = `#${ce.pos}`; if (!prev || Number(String(prev).slice(1)) > ce.pos) { add(a, 'chart'); map.get(a.id)!.det.chart = pos; } }
  }
  // rivais: os selos do seu país e os maiores do seu mercado — você acompanha os 3 nomes mais fortes de cada um
  const myMk = cityById[home]?.market;
  const rivals = Object.values(s.labels).filter((lb) => lb.active && lb.roster?.length);
  const local = rivals.filter((lb) => countryOfCity(lb.city) === myA3);
  const big = rivals.filter((lb) => !local.includes(lb) && cityById[lb.city]?.market === myMk).sort((x, y) => y.reputation - x.reputation || (x.id < y.id ? -1 : 1)).slice(0, 4);
  for (const lb of [...local, ...big]) {
    const ros = lb.roster.map((id) => s.acts[id]).filter((a): a is Act => !!a && live(a) && visibleAct(s, a)).sort((x, y) => y.fame - x.fame || (x.id < y.id ? -1 : 1));
    ros.slice(0, 3).forEach((a) => add(a, 'rival', lb.name));
  }
  const f = facts17(s).f;
  for (const x of f) {
    if (x.y !== s.year || x.visibility === 'secret' || x.severity < 20) continue;
    const w: Why27 = x.visibility === 'rumor' ? 'rumor' : 'press';
    for (const id of x.actors.slice(0, 2)) {
      const a = s.acts[id];
      if (a) { if (!ownIds.has(a.id)) add(a, w, x.text); continue; }
      if (s.persons[id]) for (const b of actsOfPerson17(s, id)) if (!ownIds.has(b.id) && b.fame >= 5) add(b, w, x.text);
    }
  }

  // 7. o quanto se sabe e a relevância
  const res: KnownAct27[] = [];
  for (const [id, e] of map) {
    const a = s.acts[id];
    if (!a) continue;
    const why = [...e.why].sort((x, y) => W[y] - W[x]);
    const mine = e.why.has('own') || e.why.has('client');
    const k = mine ? null : knownLevel(s, id);
    let know: 0 | 1 | 2 | 3 = mine ? 3 : k!.priv >= 3 ? 3 : k!.priv >= 2 || k!.pub >= 3 ? 2 : k!.pub >= 1 ? 1 : 0;
    // laço direto (contato, parceria, cena, festival) dá ao menos "de ouvir falar"
    if (know < 1 && (e.why.has('contact') || e.why.has('collab') || e.why.has('local') || e.why.has('festival') || e.why.has('former'))) know = 1;
    const hv = mine ? a.fame : hereOf(a);
    res.push({ id, why, det: e.det, know, here: Math.round(hv * 10) / 10, score: why.reduce((t, w) => t + W[w], 0) + hv, a3: countryOfCity(a.city) });
  }
  res.sort((x, y) => y.score - x.score || (x.id < y.id ? -1 : 1));
  return res;
}

/** Contagem por motivo (para os números do topo e os filtros). */
export function countWhy27(list: KnownAct27[]): Record<Why27, number> {
  const out = Object.fromEntries(Object.keys(WHY27).map((k) => [k, 0])) as Record<Why27, number>;
  for (const x of list) for (const w of x.why) out[w]++;
  return out;
}
