// R31 · onda 3 (CAR) — AS OUTRAS CARREIRAS LIGADAS AO MUNDO (cada uma com interruptor próprio).
//
//   car31.studio  ESTÚDIO: a sessão vendida a um selo vira a qualidade real do próximo disco dele (nota e apelo no
//                 lançamento, com o crédito "Gravado no seu estúdio" na explicação das vendas).
//                 EDITORA: a canção colocada com um artista entra no próximo disco dele (apelo no lançamento) e a
//                 editora recebe a edição pelas vendas reais desse disco durante um ano.
//   car31.route   AGENCIAMENTO: cada cliente tem um mercado-alvo; a turnê roteirizada passa por cidades desse país
//                 (marca os shows: fama no país pela regra da turnê). Abrir mercado onde o artista é desconhecido dá
//                 prejuízo.
//   car31.manager EMPRESÁRIO (por último): o plano vira pedidos reais — à rádio, a um festival, ao selo do cliente
//                 (divulgação) — que podem recusar conforme fama, satisfação do cliente e a relação com o líder do selo.
//   car31.press   CRÍTICO: resenha boa pesa no país do veículo (três meses); em dezembro, a lista do ano empurra o
//                 catálogo em janeiro e fevereiro. TRILHAS: a música do filme vende na proporção da bilheteria.
// Tudo o que vira parada ou fama passa pela função única (car31.ts).

import { Rng, clamp } from '../../core/rng';
import { CITIES, l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { opine, opinionOf } from '../opinion';
import { registerEditable, registerRunnable } from '../r31/editor';
import type { Act, GameState, Release } from '../types';
import { fmtL, money } from '../util';
import { boost31, car31On, exec31, registerExec31, touch31 } from './car31';
import { fameIn } from './fame16';
import { SCREEN31 } from './screen18';
import { ROUTE31, vpay, type Venture } from './ventures9';

export interface Pledge31 { act: string; vid: string; t: string; u: number; k: number }
export interface More31State {
  /** estúdio: selo → sessões vendidas e a qualidade da casa (vale 13 semanas) */
  sb: Record<string, { n: number; q: number; u: number; vid: string }>;
  /** editora: canções colocadas à espera do próximo disco do artista; obras já processadas */
  pl: Pledge31[]; seen: Record<string, 1>;
  /** editora: discos com canção da casa → editora e prazo do pagamento */
  pr: Record<string, { vid: string; u: number; paid: number }>;
  /** agência: mercado-alvo por cliente */
  tgt: Record<string, string>;
  /** empresário: último pedido por cliente e tipo (semana) */
  rq: Record<string, number>;
  /** crítico: lista do ano escolhida (vazia = automática) */
  yl: string[];
  log: { w: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { car31x: More31State } }
const fresh = (): More31State => ({ sb: {}, pl: [], seen: {}, pr: {}, tgt: {}, rq: {}, yl: [], log: [] });
registerExt4('car31x', fresh);
export const moreRo31 = (s: GameState): More31State => (s as unknown as { x4?: { car31x?: More31State } }).x4?.car31x ?? fresh();
function mx(s: GameState): More31State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.car31x ??= fresh()) as More31State;
  const f = fresh();
  for (const k of Object.keys(f) as (keyof More31State)[]) (st as unknown as Record<string, unknown>)[k] ??= f[k];
  return st;
}
const note = (st: More31State, w: number, t: L) => { st.log.unshift({ w, t }); if (st.log.length > 16) st.log.length = 16; };
const mine = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
const vlist = (s: GameState): Venture[] => (s as unknown as { x4?: { ventures9?: { list?: Venture[] } } }).x4?.ventures9?.list ?? [];
const latestLive = (s: GameState, actId: string): Release | undefined => {
  const a = s.acts[actId];
  for (let i = (a?.releases.length ?? 0) - 1; i >= 0; i--) { const r = s.releases[a!.releases[i]]; if (r?.live) return r; }
  return undefined;
};
const home = (s: GameState): string => countryOfCity(s.config.homeCity) ?? 'USA';

// ---------------------------------------------------------------- estúdio e editora: o lançamento de verdade

/** qualidade da casa do estúdio (a mesma conta do "som da casa") */
export const studioQ31 = (v: Venture): number => (v.sound ?? 0) * (0.6 + v.level * 0.08);
/** bônus do disco gravado no seu estúdio (q 0..100 da casa): nota +0..5, apelo +0..12% */
export const studioBonus31 = (q: number): { dq: number; k: number } => ({ dq: clamp((q - 40) / 10, 0, 5), k: clamp((q - 40) / 400, 0, 0.12) });

registerSimHook('launch', 'car31more', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || !car31On(s, 'studio')) return;
  const st = moreRo31(s);
  const a = s.acts[rel.actId];
  // estúdio: o selo que gravou com você nas últimas 13 semanas
  const b = st.sb[rel.owner];
  if (b && b.u >= s.week && b.n > 0 && rel.owner !== 'player') {
    const x = mx(s).sb[rel.owner];
    const { dq, k } = studioBonus31(x.q);
    if (k > 0) {
      rel.q = Math.round(clamp(rel.q + dq, 0, 100));
      rel.appeal *= 1 + k;
      (rel.autopsy ??= []).push({ key: 'car31studio', label: l('Gravado no seu estúdio', 'Recorded at your studio'), value: 1 + k, confidence: 'medium' });
      x.n -= 1;
      if (x.n <= 0) delete mx(s).sb[rel.owner];
    }
  }
  // editora: canção colocada com o artista entra neste disco
  const pi = st.pl.findIndex((p) => p.act === rel.actId && p.u >= s.week);
  if (pi >= 0 && a) {
    const p = mx(s).pl.splice(pi, 1)[0];
    rel.appeal *= 1 + p.k;
    (rel.autopsy ??= []).push({ key: 'car31pub', label: fmtL(l('Canção da sua editora: "{t}"', 'Your publisher\'s song: "{t}"'), { t: p.t }), value: 1 + p.k, confidence: 'medium' });
    mx(s).pr[rel.id] = { vid: p.vid, u: s.week + 52, paid: 0 };
    emitFact(s, { kind: 'cover_recorded', actors: ['player', a.id], place: a.city, severity: 25, tags: ['car31', 'publisher'], src: 'car31',
      text: fmtL(l('{a} grava "{t}", da sua editora, no disco "{r}".', '{a} records "{t}", from your publisher, on "{r}".'), { a: a.name, t: p.t, r: rel.title }), diary: true });
  }
});

function studioPubMonth(s: GameState): void {
  const st = mx(s);
  for (const v of vlist(s)) {
    if (v.kind === 'studio') for (const b of v.booked ?? []) {
      if (s.labels[b.lab]?.active) st.sb[b.lab] = { n: (st.sb[b.lab]?.u ?? 0) >= s.week ? Math.min(6, st.sb[b.lab].n + b.n) : b.n, q: studioQ31(v), u: s.week + 13, vid: v.id };
    }
    if (v.kind === 'publisher') for (const c of v.cat ?? []) {
      const key = `${v.id}:${c.title}:${c.actId}:${c.y}`;
      if (st.seen[key] || c.y < s.year - 1 || !s.acts[c.actId]) continue;
      st.seen[key] = 1;
      st.pl.push({ act: c.actId, vid: v.id, t: c.title, u: s.week + 39, k: clamp(0.06 + (c.v ?? 0) / 4000, 0.06, 0.15) });
    }
  }
  for (const k of Object.keys(st.sb)) if (st.sb[k].u < s.week) delete st.sb[k];
  st.pl = st.pl.filter((p) => p.u >= s.week).slice(-40);
  const keys = Object.keys(st.seen);
  if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete st.seen[k];
  // edição pelas vendas reais do disco com a canção da casa
  for (const [relId, p] of Object.entries(st.pr)) {
    const rel = s.releases[relId], v = vlist(s).find((x) => x.id === p.vid);
    if (!rel || !v || p.u < s.week) { delete st.pr[relId]; continue; }
    const u = rel.weekly.slice(-4).reduce((t, x) => t + x, 0);
    const amt = Math.round(u * money(s, 0.03));
    if (amt > 0) { vpay(s, v.owner, amt, `pub31:${relId}:${s.year}:${s.month}`, `Edição de "${rel.title}"`, v); p.paid += amt; }
  }
}

// ---------------------------------------------------------------- agenciamento: mercado-alvo

export function setTarget31(s: GameState, actId: string, a3: string | undefined): L | null {
  const ok = vlist(s).some((v) => v.kind === 'booking' && (v.clients ?? []).some((c) => c.actId === actId));
  if (!ok) return l('Esse artista não é cliente da sua agência.', 'That act is not your agency\'s client.');
  const st = mx(s);
  if (!a3) delete st.tgt[actId]; else st.tgt[actId] = a3;
  return null;
}
export const targetOf31 = (s: GameState, a: Act): string => moreRo31(s).tgt[a.id] ?? countryOfCity(a.city) ?? home(s);
ROUTE31.f = (s, v, a) => {
  if (!car31On(s, 'route')) return;
  if (!mine(a) && !car31On(s, 'others')) return;
  const a3 = targetOf31(s, a);
  const cities = CITIES.filter((c) => countryOfCity(c.id) === a3).map((c) => c.id).sort();
  if (!cities.length) return;
  const r = Rng.fromSeed(`${s.config.seed}|car31|route|${a.id}|${s.week}`);
  const n = Math.min(cities.length, 2 + Math.min(3, v.level));
  const pick: string[] = [];
  const pool = [...cities];
  while (pick.length < n && pool.length) pick.push(pool.splice(r.int(0, pool.length - 1), 1)[0]);
  for (const c of pick) s.flags[`played:${a.id}:${c}`] = s.week;
  const local = fameIn(s, a, a3);
  if (local < 20) vpay(s, v.owner, -money(s, 1500 * pick.length), `route31:${a.id}:${s.week}`, `Abrir mercado: turnê de ${a.name}`, v);
  note(mx(s), s.week, fmtL(l('Turnê de {a} por {n} cidade(s) do mercado-alvo.', '{a}\'s tour through {n} target-market city(ies).'), { a: a.name, n: pick.length }));
};

// ---------------------------------------------------------------- empresário: pedidos reais

export type Ask31k = 'radio' | 'festival' | 'push';
export const ASK31: Record<Ask31k, { name: L; desc: L }> = {
  radio: { name: l('Pedir execução nas rádios', 'Ask radio for airplay'), desc: l('As rádios do país do cliente aceitam ou não tocar o disco atual (8 semanas).', 'Stations in the client\'s country accept or not to play the current record (8 weeks).') },
  festival: { name: l('Pedir vaga num festival', 'Ask for a festival slot'), desc: l('Um festival grande do país aceita ou não escalar o cliente (fama no país por meio ano).', 'A big festival in the country accepts or not to book the client (fame there for half a year).') },
  push: { name: l('Cobrar divulgação do selo', 'Press the label to promote'), desc: l('O selo do cliente aceita ou não divulgar o disco atual; cobrar demais queima a relação.', 'The client\'s label accepts or not to promote the current record; pushing too hard burns the relationship.') },
};
export const ASK_COOL31 = 13;
export function askOdds31(s: GameState, a: Act, k: Ask31k): number {
  const c = ((s as unknown as { x4?: { ventures9?: { mg?: { clients?: { actId: string; sat: number }[] } } } }).x4?.ventures9?.mg?.clients ?? []).find((x) => x.actId === a.id);
  const sat = c?.sat ?? 50;
  const lb = s.labels[a.owner ?? ''];
  const rel = lb?.leaderId ? opinionOf(s, `l:${lb.leaderId}`) : 0;
  if (k === 'radio') return clamp(0.25 + a.fame / 200 + sat / 300, 0.05, 0.9);
  if (k === 'festival') return clamp(0.2 + a.fame / 150, 0.05, 0.9);
  return clamp(0.3 + sat / 250 + rel / 400, 0.05, 0.9);
}
export function askLock31(s: GameState, actId: string, k: Ask31k): L | null {
  if (!car31On(s, 'manager')) return l('Desligado nas regras desta partida.', 'Turned off in this game\'s rules.');
  const isClient = ((s as unknown as { x4?: { ventures9?: { mg?: { clients?: { actId: string }[] } } } }).x4?.ventures9?.mg?.clients ?? []).some((x) => x.actId === actId);
  if (!isClient) return l('Só para clientes do seu empresariamento.', 'Only for your management clients.');
  const w = moreRo31(s).rq[`${actId}:${k}`];
  if (w !== undefined && s.week - w < ASK_COOL31) return fmtL(l('Pedido feito há pouco: espere {n} semana(s).', 'Asked recently: wait {n} week(s).'), { n: ASK_COOL31 - (s.week - w) });
  if (k !== 'festival' && !latestLive(s, actId)) return l('O cliente não tem disco em circulação.', 'The client has no record in circulation.');
  if (k === 'push' && !s.labels[s.acts[actId]?.owner ?? '']) return l('O cliente não tem selo.', 'The client has no label.');
  return null;
}
export function askFor31(s: GameState, actId: string, k: Ask31k): { ok: boolean; text: L } {
  const lock = askLock31(s, actId, k);
  const a = s.acts[actId];
  if (lock || !a) return { ok: false, text: lock ?? l('Inválido.', 'Invalid.') };
  mx(s).rq[`${actId}:${k}`] = s.week;
  const r = Rng.fromSeed(`${s.config.seed}|car31|ask|${actId}|${k}|${s.week}`);
  const yes = r.chance(askOdds31(s, a, k));
  const a3 = countryOfCity(a.city) ?? home(s);
  const lb = s.labels[a.owner ?? ''];
  let text: L;
  if (yes) {
    if (k === 'radio') { const rel = latestLive(s, actId)!; boost31(s, { rel: rel.id, act: actId, a3, w: 0.3, u: s.week + 8, src: 'manager', by: 'mg' }); text = fmtL(l('As rádios topam: "{t}" entra na programação por dois meses.', 'Stations agree: "{t}" goes on air for two months.'), { t: rel.title }); }
    else if (k === 'festival') {
      const city = CITIES.filter((c) => countryOfCity(c.id) === a3).map((c) => c.id).sort()[0] ?? a.city;
      s.flags[`played:${actId}:${city}`] = s.week;
      boost31(s, { act: actId, a3, w: 0.4, u: s.week + 26, src: 'manager', by: 'mg' });
      text = fmtL(l('Um festival do país escala {a}.', 'A festival in the country books {a}.'), { a: a.name });
    } else {
      const rel = latestLive(s, actId)!;
      boost31(s, { rel: rel.id, act: actId, a3, w: 0.25, u: s.week + 6, src: 'manager', by: 'mg' });
      if (lb?.leaderId) opine(s, `l:${lb.leaderId}`, -1, l('o empresário cobrou divulgação', 'the manager pushed for promotion'));
      text = fmtL(l('{b} aceita divulgar "{t}".', '{b} agrees to promote "{t}".'), { b: lb?.name ?? '?', t: rel.title });
    }
  } else {
    if (k === 'push' && lb?.leaderId) opine(s, `l:${lb.leaderId}`, -3, l('o empresário cobrou demais', 'the manager pushed too hard'));
    text = k === 'radio' ? l('As rádios recusam: "não é para o nosso público agora".', 'Stations refuse: "not for our audience right now".')
      : k === 'festival' ? l('O festival recusa: line-up fechado.', 'The festival refuses: the line-up is closed.')
      : fmtL(l('{b} recusa: "a agenda do selo é outra".', '{b} refuses: "the label has other plans".'), { b: lb?.name ?? '?' });
  }
  emitFact(s, { kind: yes ? 'manager_ask_ok' : 'manager_ask_no', actors: ['player', actId], place: a.city, severity: 20, tags: ['car31', 'manager'], src: 'car31', text: fmtL(l('{a}: {t}', '{a}: {t}'), { a: a.name, t: text }), diary: true });
  touch31(s);
  return { ok: yes, text };
}

// ---------------------------------------------------------------- crítico e trilhas

interface Rev { rel: string; sc: number; w: number; y: number }
const pressRo = (s: GameState): { cred: number; reach: number; revs: Rev[] } | undefined => (s as unknown as { x4?: { press18?: { cred: number; reach: number; revs: Rev[] } } }).x4?.press18;
const criticOn = (s: GameState): boolean => ((s as unknown as { x4?: { careers12?: { active?: string[] } } }).x4?.careers12?.active ?? []).includes('critic');
/** peso de uma resenha sua no país do veículo (nota 0–100; só a partir de 60 empurra) */
export const reviewW31 = (cred: number, sc: number): number => (sc > 60 ? 0.15 * (cred / 100) * ((sc - 60) / 40) : 0);
registerExec31('critic', (s, out) => {
  if (!car31On(s, 'press') || !criticOn(s)) return;
  const p = pressRo(s);
  if (!p) return;
  const a3 = home(s);
  for (const r of p.revs) {
    if (s.week - r.w > 12) continue;
    const rel = s.releases[r.rel];
    if (rel) exec31(s, out, { rel: rel.id, act: rel.actId, a3, w: reviewW31(p.cred, r.sc), src: 'critic', by: 'critic' });
  }
});
export function setYearList31(s: GameState, relIds: string[]): void { mx(s).yl = relIds.filter((id) => s.releases[id]).slice(0, 10); }
export function yearList31(s: GameState): string[] {
  const st = moreRo31(s);
  if (st.yl.length) return st.yl.filter((id) => s.releases[id]);
  const p = pressRo(s);
  return (p?.revs ?? []).filter((r) => r.y === s.year).sort((a, b) => b.sc - a.sc || (a.rel < b.rel ? -1 : 1)).slice(0, 10).map((r) => r.rel);
}
function criticMonth(s: GameState): void {
  if (s.month !== 11 || !criticOn(s)) return;
  const p = pressRo(s);
  const list = yearList31(s);
  if (!p || !list.length) return;
  const a3 = home(s);
  for (const id of list) { const rel = s.releases[id]; if (rel) boost31(s, { rel: rel.id, act: rel.actId, a3, w: 0.2 * (p.cred / 100), u: s.week + 9, src: 'critic', by: 'yl' }); }
  mx(s).yl = [];
  emitFact(s, { kind: 'critic_list', actors: ['player'], severity: 30, tags: ['car31', 'critic'], src: 'car31',
    text: fmtL(l('Sua lista dos melhores do ano sai: {n} discos voltam a ser procurados em janeiro.', 'Your best-of-the-year list is out: {n} records are in demand again in January.'), { n: list.length }), diary: true });
}
SCREEN31.prem = (s, c, act) => {
  if (!car31On(s, 'press') || !act || !(c.box && c.box > 0.1)) return;
  if (!mine(act) && !car31On(s, 'others')) return;
  const rel = latestLive(s, act.id);
  for (const a3 of new Set(['USA', home(s)])) boost31(s, { rel: rel?.id, act: act.id, a3, w: 0.35 * Math.min(1.5, c.box), u: s.week + 8, src: 'screen', by: c.id });
};

registerSimHook('month', 'car31more', (s) => {
  if (car31On(s, 'studio')) studioPubMonth(s);
  if (car31On(s, 'press')) criticMonth(s);
});

registerEditable({
  id: 'car31.more.target', area: 'careers', target: 'act', label: l('Mercado-alvo do cliente da agência (código do país)', 'Agency client\'s target market (country code)'), kind: 'text', raw: true,
  get: (s, id) => (id ? moreRo31(s).tgt[id] ?? '' : ''),
  set: (s, v, id) => { if (!id) return l('Escolha o artista.', 'Pick the act.'); const e = setTarget31(s, id, String(v || '') || undefined); if (e) return e; },
});
registerRunnable({
  id: 'car31.more.list', area: 'careers', label: l('Ver a lista do ano do crítico (sem efeito)', 'See the critic\'s year list (no effect)'),
  run: (s) => { const xs = yearList31(s).map((id) => s.releases[id]?.title ?? '?'); return xs.length ? l(xs.join(' · '), xs.join(' · ')) : l('Nenhuma resenha neste ano.', 'No reviews this year.'); },
});

