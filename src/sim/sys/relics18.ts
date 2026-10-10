// Rodada 18 (talent18, item 4) — relíquias CRIADAS NO JOGO a partir dos fatos da partida: a guitarra do show
// lendário, a letra manuscrita do nº 1, a estatueta do prêmio (nome por época), o último instrumento de quem morreu,
// o objeto do escândalo, o ônibus do acidente de turnê, o figurino do megaevento, as fotos da capa e da cena que
// nasceu, a última setlist da separação, a arte original da obra-prima. O valor acompanha o LEGADO do artista
// (fama, nº 1, prêmios, lenda, morte) com o porquê no tooltip. Também: autenticação contra falsificações (crime17),
// ala-museu do selo (ingressos, prestígio, segurança) e exposição itinerante.
// Modos de história: catálogo real (relics17 + mais peças reais) só com nomes reais; fora do modo exato só nasce o
// que é anterior ao início e, depois do início, toda peça real vira "história alternativa" (destino sorteado).

import { clamp, hashString, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { RELICS18 } from '../../data/relics18';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { histLocked, histMode } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { RELICS17, relics17Gate } from '../relics17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { chron, chronListeners, cityL, genreL, nameOf, type ChronEv } from './chron9';
import { crime17 } from './crime17';
import { addRelic, relics, type Relic, type RelicKind } from './relics9';

for (const d of RELICS18) if (!RELICS17.some((x) => x.id === d.id)) RELICS17.push(d);

// ---------------------------------------------------------------- modos de história
const strict = (s: GameState) => histMode(s) === 'strict';
relics17Gate.f = (s, d) => strict(s) || d.year < s.config.startYear;
relics17Gate.step = (s, x) => strict(s) || x[0] < s.config.startYear;

// ---------------------------------------------------------------- estado
export interface RelMeta18 { o: string; b: number; st?: L; lg?: number; auth?: 1; alt?: string; tour?: number }
export interface Relics18State { m: Record<string, RelMeta18>; seen: Record<string, 1>; wing: number; vis: number; inc: number; tourW?: number }
declare module '../ext4' { interface Ext4 { relics18: Relics18State } }
registerExt4('relics18', () => ({ m: {}, seen: {}, wing: 0, vis: 0, inc: 0 }));
export function rel18(s: GameState): Relics18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.relics18 ??= { m: {}, seen: {}, wing: 0, vis: 0, inc: 0 }) as Relics18State;
  st.m ??= {}; st.seen ??= {};
  return st;
}

/** Origens das peças nascidas na partida (rótulo para a ficha). */
export const ORIGIN18: Record<string, L> = {
  show: l('Show lendário', 'Legendary show'), hit: l('Nº 1', 'Number one'), award: l('Prêmio', 'Award'), death: l('Morte', 'Death'),
  scandal: l('Escândalo', 'Scandal'), bus: l('Acidente de turnê', 'Tour accident'), mega: l('Megaevento', 'Mega event'), cover: l('Capa de revista', 'Magazine cover'),
  scene: l('Nascimento de cena', 'Scene born'), split: l('Separação', 'Split'), master: l('Obra-prima', 'Masterpiece'), stage: l('Incidente de palco', 'Stage incident'),
  real: l('História real', 'Real history'), base: l('Crônica', 'Chronicle'),
};

/** Nome da estatueta pela época (nomes reais só no modo de nomes reais). */
export function statuette18(s: GameState, y = s.year): L {
  if (!s.config.realNames) return y >= 1984 && (hashString(`${s.config.seed}|st|${y}`) & 1) ? l('Astronauta de Prata', 'Silver Astronaut') : l('Gramófono de Ouro', 'Golden Gramophone');
  if (y >= 1984 && (hashString(`${s.config.seed}|st|${y}`) % 3) === 0) return l('Moonman da MTV', 'MTV Moonman');
  if (y >= 1977 && (hashString(`${s.config.seed}|st|${y}`) % 3) === 1) return l('Estatueta do BRIT Award', 'BRIT Award statuette');
  if (y >= 1959) return l('Gramofone do Grammy', 'Grammy gramophone');
  return l('Disco de ouro emoldurado', 'Framed gold record');
}

const lead = (s: GameState, a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]);
const latestHit = (s: GameState, a: Act): string | undefined => {
  let best: { t: string; w: number } | undefined;
  for (const r of Object.values(s.releases)) if (r.actId === a.id && r.peak === 1 && (!best || r.week > best.w)) best = { t: r.title, w: r.week };
  return best?.t;
};
/** Ato real intocado no modo exato: nada de peça inventada (o catálogo real cobre). */
const blocked = (s: GameState, a?: Act) => !!a && histLocked(s, a);

function born(s: GameState, k: RelicKind, n: L, a: Act | undefined, pid: string | undefined, v: number, o: string, story: L): Relic | null {
  const key = `${o}:${a?.id ?? n.en}:${s.year}`;
  const st = rel18(s);
  if (st.seen[key]) return null;
  st.seen[key] = 1;
  const rl = addRelic(s, k, n, a?.id, pid, v);
  st.m[rl.id] = { o, b: rl.v, st: story };
  emitFact(s, { kind: 'relic', actors: a ? [a.id] : [], severity: 20 + Math.min(30, Math.round(v / 4000)), visibility: 'public', tags: ['relic', 'born', o], src: 'relics18',
    text: fmtL(l('Nasce uma relíquia: {n}.', 'A relic is born: {n}.'), { n }), data: { relic: rl.id } });
  if (a?.owner === 'player') notify(s, fmtL(l('Nova relíquia ligada ao seu elenco: {n} (Lendas → Relíquias).', 'New relic tied to your roster: {n} (Legends → Relics).'), { n }), 'good');
  return rl;
}

/** Fatos da crônica → peças (todas as partidas; no modo exato não inventa nada para ato real intocado). */
chronListeners().push((s: GameState, e: ChronEv) => {
  const a = e.a?.[0] ? s.acts[e.a[0]] : undefined;
  if (blocked(s, a)) return;
  const pidL = a ? lead(s, a) : undefined;
  const ln = pidL ? nameOf(s, pidL) : a?.name ?? '?';
  const fame = a?.fame ?? 30;
  const big = !!a && (a.fame >= 35 || a.owner === 'player' || a.legend);
  const role = pidL ? s.persons[pidL]?.role : undefined;
  const instr = (): [RelicKind, L] => role === 'vocal' ? ['mic', l('O microfone', 'microphone')] : role === 'drums' ? ['drums', l('A bateria', 'drum kit')] : role === 'bass' ? ['bass', l('O baixo', 'bass')] : role === 'keys' ? ['piano', l('O piano', 'piano')] : ['guitar', l('A guitarra', 'guitar')];
  switch (e.k) {
    case 'legendary_show': case 'liveaid': {
      if (!a || !big) return;
      const [k, nm] = instr();
      born(s, k, fmtL(l('{k} de {p} no show histórico de {y}', '{p}\'s {k} from the historic {y} show'), { k: nm, p: ln, y: e.y }), a, pidL, 25000 + fame * 1800, 'show', fmtL(l('Tocado na noite que entrou para a história: {t}', 'Played on the night that went down in history: {t}'), { t: e.t }));
      if (e.k === 'liveaid') born(s, 'outfit', fmtL(l('O figurino de {p} no megaevento', '{p}\'s mega-event outfit'), { p: ln }), a, pidL, 15000 + fame * 900, 'mega', e.t);
      return;
    }
    case 'mega_event': if (a && big) born(s, 'outfit', fmtL(l('O figurino de {p} no megaevento de {y}', '{p}\'s outfit from the {y} mega event'), { p: ln, y: e.y }), a, pidL, 15000 + fame * 900, 'mega', e.t); return;
    case 'number1': {
      if (!a || !big || (a.number1s > 2 && a.fame < 70)) return; // os primeiros nº 1 ou os de uma superestrela
      const ttl = latestHit(s, a);
      if (ttl) born(s, 'lyrics', fmtL(l('A letra manuscrita de "{t}"', 'The handwritten lyrics of "{t}"'), { t: ttl }), a, a.songs.length ? s.songs[a.songs[a.songs.length - 1]]?.writers[0] : pidL, 9000 + fame * 700, 'hit', fmtL(l('Rascunho com rasuras do nº 1 de {a}.', 'A scribbled draft of {a}\'s number one.'), { a: a.name }));
      return;
    }
    case 'award': case 'award2': case 'nat_award': {
      if (!a || e.i < 3 || relics(s).list.filter((x) => x.a === a.id && x.k === 'trophy').length >= 3) return;
      const stt = statuette18(s, e.y);
      born(s, 'trophy', fmtL(l('{s} de {a} ({y})', '{a}\'s {s} ({y})'), { s: stt, a: a.name, y: e.y }), a, undefined, 12000 + fame * 700, 'award', e.t);
      return;
    }
    case 'death': {
      if (!a || e.i < 3) return;
      const pid = e.a?.find((x) => s.persons[x] && !s.persons[x].alive);
      const p = pid ? s.persons[pid] : undefined;
      if (p) born(s, p.role === 'vocal' ? 'lyrics' : p.role === 'drums' ? 'drums' : 'guitar', fmtL(p.role === 'vocal' ? l('O último caderno de {p}', '{p}\'s last notebook') : l('O último instrumento de {p}', '{p}\'s last instrument'), { p: p.name }), a, pid, 18000 + fame * 1500, 'death', e.t);
      // prêmio da morte: tudo que já existe do ato sobe na hora
      for (const rl of relics(s).list) if (rl.a === a.id && rl.st !== 'lost' && !rl.rr) rl.v = Math.round(rl.v * 1.35);
      return;
    }
    case 'scandal': case 'era_scandal': case 'voice_scandal':
      if (a && big && e.i >= 2) born(s, 'art', fmtL(l('As fotos do escândalo de {a}', 'The {a} scandal photos'), { a: a.name }), a, undefined, 4000 + fame * 300, 'scandal', e.t);
      return;
    case 'tour_accident': if (a) born(s, 'car', fmtL(l('O ônibus da turnê de {a}', '{a}\'s tour bus'), { a: a.name }), a, undefined, 8000 + fame * 600, 'bus', e.t); return;
    case 'stage_incident': if (a && big) born(s, 'prop', fmtL(l('O objeto de cena do incidente de {a}', 'The stage prop from {a}\'s incident'), { a: a.name }), a, undefined, 6000 + fame * 500, 'stage', e.t); return;
    case 'magazine_cover': if (a && a.fame >= 50) born(s, 'art', fmtL(l('As fotos originais da capa de {a} ({y})', '{a}\'s original cover photos ({y})'), { a: a.name, y: e.y }), a, undefined, 5000 + fame * 300, 'cover', e.t); return;
    case 'masterwork': if (a) born(s, 'art', fmtL(l('A arte original da capa de {a}', '{a}\'s original cover artwork'), { a: a.name }), a, undefined, 10000 + fame * 800, 'master', e.t); return;
    case 'split': if (a && big) born(s, 'lyrics', fmtL(l('A última setlist de {a}', '{a}\'s last setlist'), { a: a.name }), a, undefined, 3000 + fame * 400, 'split', e.t); return;
    case 'scene_born': if (e.g && e.c) born(s, 'art', fmtL(l('As fotos do álbum da cena de {g} em {c}', 'The {g} scene photo album from {c}'), { g: genreL(e.g), c: cityL(e.c) }), undefined, undefined, 3000, 'scene', e.t); return;
  }
});

// ---------------------------------------------------------------- legado → valor
export interface Legacy18 { m: number; parts: [L, number][] }
export function legacy18(s: GameState, rl: Relic): Legacy18 {
  const a = rl.a ? s.acts[rl.a] : undefined;
  const parts: [L, number][] = [];
  if (a) {
    parts.push([l('Fama do artista', 'Artist fame'), a.fame / 100 * 1.2]);
    if (a.number1s) parts.push([l('Números 1', 'Number ones'), Math.min(0.6, a.number1s * 0.06)]);
    if (a.awards) parts.push([l('Prêmios', 'Awards'), Math.min(0.4, a.awards * 0.03)]);
    if (a.legend) parts.push([l('Lenda', 'Legend'), 0.5]);
    const dead = rl.p ? s.persons[rl.p] && !s.persons[rl.p].alive : a.deceased;
    if (dead) parts.push([l('Morte (mito)', 'Death (myth)'), 0.4]);
  }
  const age = Math.max(0, s.year - rl.y);
  parts.push([l('Idade da peça', 'Age of the piece'), Math.min(0.8, age * 0.02)]);
  const meta = rel18(s).m[rl.id];
  if (meta?.auth) parts.push([l('Certificado de autenticidade', 'Certificate of authenticity'), 0.1]);
  if (meta?.tour) parts.push([l('Exposição itinerante', 'Touring exhibition'), Math.min(0.2, meta.tour * 0.05)]);
  return { m: 1 + parts.reduce((t, x) => t + x[1], 0), parts };
}
registerExplain('relic.value', (s, c) => {
  const rl = relics(s).list.find((x) => x.id === c.id);
  if (!rl) return null;
  const meta = rel18(s).m[rl.id];
  const lg = legacy18(s, rl);
  return { title: l('Valor da relíquia', 'Relic value'), value: money(s, rl.v) as number, fmt: 'money',
    parts: [{ label: l('Valor de origem', 'Original value'), value: money(s, meta?.b ?? rl.v), fmt: 'money' }, ...lg.parts.map(([lb, v]) => ({ label: lb, value: 1 + v, fmt: 'mult' as const, tone: 'good' as const }))],
    note: rl.rr ? l('Peça real: segue os leilões reais.', 'Real piece: follows real auctions.') : l('Recalculado todo ano: valor de origem × legado do artista (fama, nº 1, prêmios, lenda, morte) × idade.', 'Recalculated yearly: original value × artist legacy (fame, #1s, awards, legend, death) × age.') };
});

// ---------------------------------------------------------------- autenticação, falsificações
export const authFee18 = (s: GameState, rl: Relic) => Math.round(money(s, 1500 + rl.v * 0.02));
export const isFake18 = (s: GameState, id: string) => !!crime17(s).fake[id];
/** Perito: revela falsificação (a peça sai do leilão e o vendedor é exposto) ou certifica (+10% de valor). */
export function authenticate18(s: GameState, id: string): L {
  const rl = relics(s).list.find((x) => x.id === id);
  const st = rel18(s);
  if (!rl || rl.rr) return l('Peça real catalogada: autenticidade já conhecida.', 'Catalogued real piece: authenticity already known.');
  const m = (st.m[rl.id] ??= { o: 'base', b: rl.v });
  if (m.auth) return l('Já certificada.', 'Already certified.');
  const fee = authFee18(s, rl);
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `rel18auth:${rl.id}`, -fee, 'legal', `Perícia: ${rl.n.pt}`);
  if (isFake18(s, rl.id)) {
    const mine = rl.st === 'player';
    rl.st = 'lost'; rl.v = Math.round(rl.v * 0.03);
    rl.n = fmtL(l('{n} (falsificação)', '{n} (forgery)'), { n: rl.n });
    emitFact(s, { kind: 'scandal', actors: rl.a ? [rl.a] : [], severity: 35, visibility: 'public', tags: ['relic', 'forgery', 'crime'], src: 'relics18', text: fmtL(l('Perícia desmascara uma falsificação: {n}.', 'Experts expose a forgery: {n}.'), { n: rl.n }) });
    return mine ? l('Falsa! A peça do seu acervo não vale quase nada. Pelo menos agora você sabe — e ninguém te pega revendendo.', 'Fake! The piece in your collection is worth almost nothing. At least you know now — and no one catches you reselling it.')
      : l('Falsa! O leilão é cancelado antes que alguém (você) pagasse por ela.', 'Fake! The auction is pulled before anyone (you) paid for it.');
  }
  m.auth = 1;
  rl.v = Math.round(rl.v * 1.1);
  return l('Autêntica. Certificado emitido: +10% no valor e compradores mais confiantes.', 'Authentic. Certificate issued: +10% value and more confident buyers.');
}

// ---------------------------------------------------------------- ala-museu do selo
export const WING18: { name: L; cost: number; slots: number; sec: number; desc: L }[] = [
  { name: l('Sem ala-museu', 'No museum wing'), cost: 0, slots: 0, sec: 0, desc: l('Peças expostas só na recepção da sede.', 'Pieces shown only in the HQ lobby.') },
  { name: l('Sala de memórias', 'Memorabilia room'), cost: 40000, slots: 4, sec: 0.3, desc: l('Vitrine com alarme: ingressos baratos, fãs do elenco visitam.', 'Alarmed showcase: cheap tickets, fans of the roster visit.') },
  { name: l('Ala-museu', 'Museum wing'), cost: 140000, slots: 10, sec: 0.55, desc: l('Curadoria, guardas, loja: turistas e escolas.', 'Curators, guards, a shop: tourists and school trips.') },
  { name: l('Museu do selo', 'Label museum'), cost: 450000, slots: 25, sec: 0.8, desc: l('Prédio próprio: ponto turístico da cidade e prestígio institucional.', 'Its own building: a city landmark and institutional prestige.') },
];
export function buildWing18(s: GameState): L | null {
  const st = rel18(s);
  const nx = WING18[st.wing + 1];
  if (!nx) return l('Já está no nível máximo.', 'Already at the top level.');
  const c = money(s, nx.cost);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `venture:relwing:${st.wing + 1}`, -c, 'capex', `Museu: ${nx.name.pt}`);
  st.wing++;
  emitFact(s, { kind: 'deal', actors: ['player'], place: s.config.homeCity, severity: 20 + st.wing * 10, visibility: 'public', tags: ['good', 'relic', 'museum'], src: 'relics18', text: fmtL(l('{c} abre: {n}.', '{c} opens: {n}.'), { c: s.config.companyName, n: nx.name }) });
  return null;
}
export const shown18 = (s: GameState) => relics(s).list.filter((x) => (x.st === 'player' && x.ex && !x.ln) || x.brw);
/** Visitantes/ano estimados e receita (antes de custos). */
export function wingYield18(s: GameState): { vis: number; rev: number; why: L[] } {
  const st = rel18(s);
  const w = WING18[st.wing];
  const pieces = shown18(s).sort((a, b) => b.v - a.v).slice(0, Math.max(2, w.slots));
  const star = pieces.reduce((t, x) => t + Math.sqrt(x.v / 1000), 0);
  const vis = Math.round(star * (st.wing ? 1400 * st.wing : 250));
  const why = [fmtL(l('{n} peças expostas (força {f})', '{n} pieces on show (pull {f})'), { n: pieces.length, f: Math.round(star) }), w.desc];
  return { vis, rev: money(s, vis * (st.wing ? 6 : 0)), why };
}
/** Exposição itinerante: aluga o acervo exposto a outras cidades por 6 meses. */
export function tourExhibit18(s: GameState): L {
  const st = rel18(s);
  const ps = shown18(s).filter((x) => x.st === 'player');
  if (ps.length < 3) return l('Exponha pelo menos 3 peças suas primeiro.', 'Put at least 3 of your pieces on show first.');
  if (st.tourW && st.tourW > s.week) return l('A exposição já está na estrada.', 'The exhibition is already on the road.');
  st.tourW = s.week + 26;
  const fee = Math.round(ps.reduce((t, x) => t + money(s, x.v), 0) * 0.04);
  post(s, 'rel18tour', fee, 'services', 'Exposição itinerante');
  for (const x of ps) { const m = (st.m[x.id] ??= { o: 'base', b: x.v }); m.tour = (m.tour ?? 0) + 1; const a = x.a ? s.acts[x.a] : undefined; if (a) a.fame = clamp(a.fame + 0.8, 0, 100); }
  emitFact(s, { kind: 'show', actors: ['player'], severity: 25, visibility: 'public', tags: ['good', 'relic', 'exhibit'], src: 'relics18', text: fmtL(l('A coleção de {c} sai em exposição itinerante ({n} peças).', '{c}\'s collection goes on a touring exhibition ({n} pieces).'), { c: s.config.companyName, n: ps.length }) });
  return fmtL(l('Exposição na estrada por 6 meses: {v} de cachê agora; risco de dano ou roubo no caminho.', 'Exhibition on the road for 6 months: {v} fee now; risk of damage or theft on the way.'), { v: `$${Math.round(fee / 100).toLocaleString('en-US')}` });
}

// ---------------------------------------------------------------- inbox: fraude no leilão
registerInboxKind('relic18_fake', { label: l('Relíquias', 'Relics'), cat: 'deals', icon: 'vault', prio: 2, goto: () => ({ area: 'lendas', tab: ['lendas9', 'relics18'] }),
  handle: (s, m, act) => {
    const id = String(m.ref?.rl ?? '');
    if (act === 'auth') return authenticate18(s, id);
    return l('Você decide arriscar sem perícia.', 'You decide to risk it without an expert.');
  } });

registerSimHook('month', 'relics18', (s) => {
  const st = rel18(s);
  const r = Rng.fromSeed(`${s.config.seed}|relics18|${s.week}`);
  // fora do modo exato: depois do início, peça real vira história alternativa (destino sorteado pelo relics9)
  if (!strict(s)) for (const rl of relics(s).list) if (rl.rr) (st.m[rl.id] ??= { o: 'real', b: rl.v }).alt = rl.rr;
  for (const rl of relics(s).list) {
    if (!st.m[rl.id]) st.m[rl.id] = { o: rl.rr ? 'real' : 'base', b: rl.v };
    // leilão novo de peça não catalogada: 8% de chance de ser falsificação de um "colecionador"
    if (rl.st === 'auction' && !rl.rr && !st.seen[`auc:${rl.id}:${rl.au}`]) {
      st.seen[`auc:${rl.id}:${rl.au}`] = 1;
      if (r.chance(0.08) && !st.m[rl.id].auth) {
        crime17(s).fake[rl.id] = 1;
        if (rl.v > 20000) pushInbox18(s, 'relic18_fake', { from: l('Perito independente', 'Independent appraiser').pt, subject: fmtL(l('Dúvida sobre {n}', 'Doubts about {n}'), { n: rl.n }),
          body: fmtL(l('Um perito viu fotos do lote e algo não fecha (procedência, ferragens, caligrafia). Uma perícia custa {f}.', 'An appraiser saw photos of the lot and something is off (provenance, hardware, handwriting). An appraisal costs {f}.'), { f: `$${Math.round(authFee18(s, rl) / 100).toLocaleString('en-US')}` }),
          ref: { rl: rl.id }, actions: [{ id: 'auth', label: l('Pagar perícia', 'Pay for an appraisal') }, { id: 'no', label: l('Ignorar', 'Ignore') }], weeks: 8 });
      }
    }
  }
  // exposição itinerante: risco no caminho
  if (st.tourW && st.tourW > s.week && r.chance(0.02)) {
    const ps = shown18(s).filter((x) => x.st === 'player');
    if (ps.length) {
      const x = r.pick(ps);
      if (r.chance(1 - WING18[st.wing].sec * 0.5)) { x.st = 'stolen'; x.ex = undefined; chron(s, { k: 'relic', i: 3, a: x.a ? [x.a] : [], t: fmtL(l('Roubo na exposição itinerante: some {n}.', 'Theft on the touring exhibition: {n} vanishes.'), { n: x.n }) }); }
      else { x.v = Math.round(x.v * 0.8); notify(s, fmtL(l('{n} sofreu um dano no transporte: −20% no valor.', '{n} was damaged in transit: −20% value.'), { n: x.n }), 'bad'); }
    }
  }
});

registerSimHook('year', 'relics18', (s) => {
  const st = rel18(s);
  // história alternativa: peça real fora do modo exato tem destino sorteado depois do início
  if (!strict(s)) {
    const r = Rng.fromSeed(`${s.config.seed}|relics18y|${s.year}`);
    for (const rl of relics(s).list) {
      if (!rl.rr || rl.st !== 'kept') continue;
      rl.v = Math.round(rl.v * 1.03);
      const x = r.next();
      if (x < 0.03) { rl.st = 'auction'; rl.au = s.week + 13; chron(s, { k: 'relic', i: 3, a: rl.a ? [rl.a] : [], t: fmtL(l('História alternativa: {n} vai a leilão.', 'Alternate history: {n} goes to auction.'), { n: rl.n }) }); }
      else if (x < 0.045) { rl.st = 'stolen'; chron(s, { k: 'relic', i: 3, a: rl.a ? [rl.a] : [], t: fmtL(l('História alternativa: roubam {n}.', 'Alternate history: {n} is stolen.'), { n: rl.n }) }); }
      else if (x < 0.055 && s.year - rl.y > 15) { rl.st = 'museum'; rl.own.push([r.pick(['Museu do Som', 'Hall dos Ecos']), s.year, 'doação']); }
    }
  }
  // valor acompanha o legado (peças reais seguem os leilões reais)
  for (const rl of relics(s).list) {
    if (rl.rr || rl.st === 'lost') continue;
    const m = (st.m[rl.id] ??= { o: 'base', b: rl.v });
    const lg = legacy18(s, rl).m;
    const prev = m.lg ?? lg;
    m.lg = lg;
    const target = Math.round(m.b * lg);
    rl.v = Math.round(rl.v * 0.5 + Math.max(target, rl.v * 0.85) * 0.5);
    if (rl.st === 'player' && lg > prev * 1.25) notify(s, fmtL(l('{n} valorizou: o legado do artista cresceu (×{a} → ×{b}).', '{n} gained value: the artist\'s legacy grew (×{a} → ×{b}).'), { n: rl.n, a: prev.toFixed(2), b: lg.toFixed(2) }), 'good');
  }
  // compra sem perícia: falsificação aparece com o tempo
  for (const rl of relics(s).list) if (rl.st === 'player' && isFake18(s, rl.id) && !st.m[rl.id]?.auth && (hashString(`${s.config.seed}|fk|${rl.id}|${s.year}`) % 100) < 30) {
    rl.st = 'lost'; rl.v = Math.round(rl.v * 0.03); rl.n = fmtL(l('{n} (falsificação)', '{n} (forgery)'), { n: rl.n });
    s.player.reputation.artistic = clamp(s.player.reputation.artistic - 2, 0, 100);
    emitFact(s, { kind: 'scandal', actors: ['player'], severity: 40, visibility: 'public', tags: ['bad', 'relic', 'forgery'], src: 'relics18', text: fmtL(l('Vexame: a peça exposta por {c} era falsa ({n}).', 'Embarrassment: the piece shown by {c} was a fake ({n}).'), { c: s.config.companyName, n: rl.n }) });
  }
  // ala-museu: ingressos, prestígio e fama de quem está nas vitrines
  const y = wingYield18(s);
  st.vis = y.vis;
  st.inc = 0;
  if (st.wing && y.vis) {
    const upkeep = money(s, WING18[st.wing].cost * 0.06);
    st.inc = y.rev - upkeep;
    post(s, 'rel18wing', y.rev, 'services', 'Museu: ingressos');
    post(s, 'rel18wingc', -upkeep, 'hq', 'Museu: manutenção');
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + st.wing, 0, 100);
    for (const x of shown18(s)) { const a = x.a ? s.acts[x.a] : undefined; if (a && a.owner === 'player') a.fame = clamp(a.fame + 0.5, 0, 100); }
  }
});

registerAdvisorTip('relics18', (s) => {
  const st = rel18(s);
  const mine = relics(s).list.filter((x) => x.st === 'player');
  const out = [];
  if (mine.length >= 3 && !mine.some((x) => x.ex)) out.push({ id: 'rel18-show', level: 'info' as const, cat: 'opportunity' as const, text: l('Seu acervo está no cofre.', 'Your collection sits in the vault.'),
    why: [fmtL(l('{n} peças suas, nenhuma exposta.', '{n} pieces of yours, none on show.'), { n: mine.length })], effect: l('Expor dá prestígio todo ano; com ala-museu, ingressos.', 'Showing them gives prestige every year; with a museum wing, tickets.'), goto: { area: 'lendas', tab: ['lendas9', 'relics18'] as [string, string] } });
  if (!st.wing && mine.length >= 5) out.push({ id: 'rel18-wing', level: 'info' as const, cat: 'opportunity' as const, text: l('Um museu do selo pagaria sozinho.', 'A label museum would pay for itself.'), why: [l('Acervo grande parado.', 'A big idle collection.')], goto: { area: 'lendas', tab: ['lendas9', 'relics18'] as [string, string] } });
  return out;
});
