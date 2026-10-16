// R31 · onda 4 (T2) — ALFÂNDEGA COMO MECÂNICA REAL. Interruptor 't31.customs' (desligado = imposto automático e texto,
// como a frente T deixou).
//
// O que você compra fora (martelo de pregão no exterior, casa de leilões) ou traz por fora (lote do leilão silencioso do
// mercado negro que está noutro país) vira CARGA: viaja (navio até 1946, avião depois — o mesmo prazo da casa de
// leilões), chega ao porto ou ao aeroporto da sua cidade e fica parada na alfândega até você decidir:
//   • declarar e pagar o imposto (carga com nota: libera; carga roubada: é confiscada com multa pequena, sem jornal);
//   • tentar liberar sem declarar — sozinho ou com o despachante (taxa; quem você já conhece cobra menos e erra menos);
//   • oferecer propina ao fiscal (aceita conforme a corrupção do país; recusada, vira denúncia);
//   • abandonar a carga (perde a peça, sem consequência).
// A chance de apreensão (pura, `inspect31`) depende da época (fiscal com lanterna → cão farejador e raio X → scanner
// depois de 2001), do país (rigor = o contrário da corrupção percebida do crime17) e de quem você conhece (despachante).
// Pego: multa, fato no jornal (manchete) e reputação; carga roubada é apreendida e o calor sobe (polícia, crime17).
// Carga parada há mais de 4 semanas: com nota, o imposto é pago sozinho; sem nota, a Receita fica com ela.
// Sorte: pura por chave (Rng.fromSeed: carga e ação). Geração e prazos na virada do mês; a cena só lê. Estado: x4.customs31.

import { clamp, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { cashWhy20, freeCash20 } from '../oblig20';
import { removeObj } from '../r31/object';
import { registerEditable, registerRunnable } from '../r31/editor';
import { IMPORT31 } from '../r31/hooks31t2';
import { items31 } from '../r31/items31';
import { registerSwitch, sw } from '../r31/switches';
import type { GameState } from '../types';
import { fmtL, money, notify, post } from '../util';
import { dutyRate31, shipWeeks31 } from './auction31';
import { addHeat, corruption, crime17, feedCase } from './crime17';
import { headline19 } from './factlink19';
import { npcName27 } from './place27';
import { relics } from './relics9';

// ---------------------------------------------------------------- interruptor e estado

export const SW_CUSTOMS31 = 't31.customs';
registerSwitch({
  id: SW_CUSTOMS31, def: true, scope: 'game',
  desc: l('Alfândega real (onda 4): o que você compra ou traz de fora passa pelo porto ou aeroporto; declarar, pagar imposto, tentar liberar (despachante, propina) ou perder a carga, com risco de apreensão por época e país.',
    'Real customs (wave 4): what you buy or bring from abroad goes through the port or airport; declare, pay duty, try to clear it (broker, bribe) or lose the cargo, with seizure risk by era and country.'),
});
export const customsOn31 = (s: GameState): boolean => sw<boolean>(s, SW_CUSTOMS31);

export type CargoK31 = 'relic' | 'instr';
/** legal = com nota; stolen = peça roubada (sem nota, contrabando) */
export type Law31 = 'legal' | 'stolen';
export type CargoSt31 = 'transit' | 'held' | 'cleared' | 'seized' | 'lost';
export interface Cargo31 {
  id: string;
  n: L;
  k: CargoK31;
  /** relíquia (relics9) ou objeto (r31/object) */
  ref: string;
  /** valor declarado (dinheiro do jogo) */
  v: number;
  law: Law31;
  /** cidade de origem */
  from: string;
  via: 'port' | 'air';
  w: number;
  arrive: number;
  st: CargoSt31;
  /** imposto de importação devido */
  duty: number;
  src: 'auction31' | 'bauc31';
  /** desfecho em texto (para a cena e o histórico) */
  res?: L;
  /** semana do desfecho */
  done?: number;
}
export interface Customs31State {
  q: Cargo31[];
  /** vezes que você usou o despachante (por país): 2+ = já conhece */
  desp: Record<string, number>;
  seq: number;
  log: [number, L][];
  /** editor: multiplicador do rigor da fiscalização */
  strict?: number;
}
declare module '../ext4' { interface Ext4 { customs31: Customs31State } }
const fresh = (): Customs31State => ({ q: [], desp: {}, seq: 0, log: [] });
registerExt4('customs31', fresh);
export function customs31(s: GameState): Customs31State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const st = (x.customs31 ??= fresh()) as Customs31State;
  st.q ??= []; st.desp ??= {}; st.seq ??= 0; st.log ??= [];
  return st;
}
const peek = (s: GameState): Customs31State | undefined => (s.x4 as unknown as { customs31?: Customs31State }).customs31;
const logC = (s: GameState, t: L): void => { const st = customs31(s); st.log.push([s.week, t]); if (st.log.length > 30) st.log.splice(0, st.log.length - 30); };
const homeA3 = (s: GameState): string => countryOfCity(s.config.homeCity) ?? '';
const usd = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
/** Pela água até 1946 (como o prazo da casa de leilões), pelo ar depois. */
export const viaOf31 = (y: number): 'port' | 'air' => (y < 1946 ? 'port' : 'air');

// ---------------------------------------------------------------- inspeção (pura)

export type How31 = 'self' | 'desp';
/** Inspeção por época: lanterna e pé-de-cabra → cão farejador → raio X → scanner e banco de dados. */
export function eraRisk31(y: number): number { return y < 1919 ? 0.08 : y < 1946 ? 0.12 : y < 1970 ? 0.16 : y < 1990 ? 0.2 : y < 2001 ? 0.25 : 0.35; }
export const ERA_TOOL31 = (y: number): L => (y < 1946 ? l('fiscal com lanterna e pé-de-cabra', 'inspector with a lamp and a crowbar') : y < 1975 ? l('cão farejador', 'sniffer dog') : y < 2001 ? l('raio X das bagagens', 'baggage X-ray') : l('scanner de contêiner e banco de dados', 'container scanner and database'));
/** Rigor do país: o contrário da corrupção percebida (crime17). */
export const strictOf31 = (corr: number): number => clamp(1.25 - corr, 0.45, 1.2);
/** Chance de apreensão ao tentar liberar sem declarar (0..1): época × rigor do país × tipo da carga × despachante. */
export function inspect31(y: number, strict: number, law: Law31, how: How31, known: boolean): number {
  const k = law === 'legal' ? 0.6 : 1.3;
  const d = how === 'desp' ? (known ? 0.35 : 0.5) : 1;
  return clamp(eraRisk31(y) * strict * k * d, 0.02, 0.9);
}
export const knownDesp31 = (s: GameState): boolean => (peek(s)?.desp[homeA3(s)] ?? 0) >= 2;
export const despName31 = (s: GameState): string => npcName27(s, `desp31|${homeA3(s)}`);
export const inspectorName31 = (s: GameState): string => npcName27(s, `fiscal31|${s.config.homeCity}`);
export function seizeP31(s: GameState, c: Pick<Cargo31, 'law'>, how: How31): number {
  return clamp(inspect31(s.year, strictOf31(corruption(s, homeA3(s))), c.law, how, knownDesp31(s)) * (peek(s)?.strict ?? 1), 0.02, 0.95);
}
/** Chance de o fiscal aceitar a propina. */
export const bribeP31 = (s: GameState): number => clamp(corruption(s, homeA3(s)) + (knownDesp31(s) ? 0.15 : 0) - (s.year >= 2001 ? 0.1 : 0), 0.05, 0.9);
export const despFee31 = (s: GameState, c: Pick<Cargo31, 'v'>): number => Math.round(money(s, knownDesp31(s) ? 150 : 250) + c.v * (knownDesp31(s) ? 0.02 : 0.03));
export const bribeCost31 = (s: GameState, c: Pick<Cargo31, 'v'>): number => Math.round(Math.max(money(s, 300), c.v * 0.12));
export const fine31 = (s: GameState, c: Pick<Cargo31, 'v' | 'law' | 'duty'>): number => (c.law === 'legal' ? c.duty * 2 : Math.round(c.v * 0.3 + money(s, 1000)));

// ---------------------------------------------------------------- cargas

/** Manda uma carga para a alfândega (o motor chama: martelo no exterior, lote de fora do leilão silencioso). */
export function ship31(s: GameState, c: Pick<Cargo31, 'n' | 'k' | 'ref' | 'v' | 'law' | 'from' | 'src'>): Cargo31 {
  const st = customs31(s);
  const x: Cargo31 = { ...c, id: `cg${++st.seq}`, via: viaOf31(s.year), w: s.week, arrive: s.week + shipWeeks31(s.year), st: 'transit', duty: Math.round(c.v * dutyRate31(s.year)) };
  st.q.push(x);
  logC(s, fmtL(l('{n} embarcada em {c}; chega em {w} semana(s).', '{n} shipped from {c}; arrives in {w} week(s).'), { n: c.n, c: cityById[c.from]?.name ?? c.from, w: x.arrive - s.week }));
  return x;
}
export const cargos31 = (s: GameState): Cargo31[] => peek(s)?.q ?? [];
/** Cargas na alfândega esperando você (chegaram e não foram resolvidas). */
export const held31 = (s: GameState): Cargo31[] => cargos31(s).filter((c) => c.st === 'held');
export const transit31 = (s: GameState): Cargo31[] => cargos31(s).filter((c) => c.st === 'transit');

/** A peça sai das suas mãos (confiscada, apreendida ou abandonada). */
function revert(s: GameState, c: Cargo31, who: L): void {
  if (c.k === 'relic') {
    const rl = relics(s).list.find((x) => x.id === c.ref);
    const cr = crime17(s);
    cr.stash = cr.stash.filter((x) => x !== c.ref);
    delete cr.hot[c.ref];
    if (rl) { rl.st = cr.fake[rl.id] ? 'lost' : 'kept'; rl.own.push([who.pt, s.year, 'alfândega']); }
  } else {
    removeObj(s, c.ref);
    delete items31(s).d[c.ref];
    const u = (s.x4 as unknown as { under31?: { hotGear?: Record<string, number> } }).under31;
    if (u?.hotGear) delete u.hotGear[c.ref];
  }
}
function finish(s: GameState, c: Cargo31, st: CargoSt31, res: L): void {
  c.st = st; c.res = res; c.done = s.week;
  logC(s, fmtL(l('{n}: {r}', '{n}: {r}'), { n: c.n, r: res }));
}
/** Pego na inspeção: multa, jornal, reputação; com nota, libera depois da multa; roubada, apreendida. */
function caught(s: GameState, c: Cargo31, bribe: boolean): L {
  const fine = fine31(s, c);
  post(s, `cus31fine:${c.id}`, -fine, 'legal', `Multa da alfândega: ${c.n.pt}`);
  const a3 = homeA3(s);
  const stolen = c.law === 'stolen';
  const rep = s.player.reputation;
  rep.institutional = clamp(rep.institutional - (stolen ? 6 : 3) - (bribe ? 3 : 0), 0, 100);
  rep.commercial = clamp(rep.commercial - 1, 0, 100);
  if (stolen || bribe) addHeat(s, 'player', a3, (stolen ? 8 : 0) + (bribe ? 6 : 0));
  if (stolen) feedCase(s, 'player', a3, 15, 30, false);
  const port = c.via === 'port' ? l('no porto', 'at the port') : l('no aeroporto', 'at the airport');
  const text = bribe
    ? fmtL(l('{c} tenta subornar o fiscal da alfândega {p} para liberar {n}; o fiscal denuncia e a carga é retida.', '{c} tries to bribe the customs inspector {p} to clear {n}; the inspector reports it and the cargo is held.'), { c: s.config.companyName, p: port, n: c.n })
    : stolen ? fmtL(l('Alfândega apreende {n} {p}: peça roubada numa carga de {c}.', 'Customs seizes {n} {p}: a stolen piece in a cargo from {c}.'), { n: c.n, p: port, c: s.config.companyName })
      : fmtL(l('{c} é multada {p} por tentar passar {n} sem pagar o imposto.', '{c} is fined {p} for trying to bring in {n} without paying duty.'), { c: s.config.companyName, p: port, n: c.n });
  emitFact(s, { kind: 'customs_seizure', actors: ['player'], place: s.config.homeCity, severity: stolen || bribe ? 45 : 30, visibility: 'public', tags: ['customs31', stolen ? 'crime' : 'tax', ...(bribe ? ['bribe'] : [])], text, src: 'customs31', data: { c: c.id } });
  if (stolen) { revert(s, c, l('Receita (apreensão)', 'Customs (seizure)')); finish(s, c, 'seized', fmtL(l('apreendida; multa de {f}.', 'seized; {f} fine.'), { f: usd(fine) })); }
  else finish(s, c, 'cleared', fmtL(l('liberada depois da multa de {f} (imposto incluído).', 'cleared after a {f} fine (duty included).'), { f: usd(fine) }));
  notify(s, fmtL(l('Alfândega: {n} — {r}', 'Customs: {n} — {r}'), { n: c.n, r: c.res! }), 'bad');
  return text;
}

export type Act31 = 'declare' | 'self' | 'desp' | 'bribe' | 'drop';
/** Motivo para não poder fazer a ação (null = pode). */
export function cargoLock31(s: GameState, id: string, act: Act31): L | null {
  if (!customsOn31(s)) return l('A alfândega real está desligada nesta partida.', 'Real customs is off in this game.');
  const c = cargos31(s).find((x) => x.id === id);
  if (!c) return l('Carga inexistente.', 'No such cargo.');
  if (c.st === 'transit') return fmtL(l('A carga ainda está a caminho (chega em {n} semana(s)).', 'The cargo is still on its way (arrives in {n} week(s)).'), { n: Math.max(0, c.arrive - s.week) });
  if (c.st !== 'held') return l('Esta carga já foi resolvida.', 'This cargo is already settled.');
  const need = act === 'declare' ? (c.law === 'legal' ? c.duty : Math.round(c.v * 0.1)) : act === 'desp' ? despFee31(s, c) : act === 'bribe' ? bribeCost31(s, c) : 0;
  return need > 0 && freeCash20(s) < need ? cashWhy20(s, need, l('Caixa livre não cobre.', 'Free cash does not cover it.')) : null;
}
/** Decide uma carga parada na alfândega. */
export function cargoAct31(s: GameState, id: string, act: Act31): { ok: boolean; text: L } {
  const lk = cargoLock31(s, id, act);
  if (lk) return { ok: false, text: lk };
  const c = cargos31(s).find((x) => x.id === id)!;
  const st = customs31(s);
  const r = Rng.fromSeed(`${s.config.seed}|cus31|${c.id}|${act}`);
  if (act === 'drop') {
    revert(s, c, l('Receita (abandono)', 'Customs (abandoned)'));
    finish(s, c, 'lost', l('abandonada na alfândega.', 'abandoned at customs.'));
    return { ok: true, text: l('Você deixa a carga para trás. A Receita fica com ela.', 'You leave the cargo behind. Customs keeps it.') };
  }
  if (act === 'declare') {
    if (c.law === 'legal') {
      post(s, `cus31duty:${c.id}`, -c.duty, 'acquisitions', `Alfândega (imposto): ${c.n.pt}`);
      finish(s, c, 'cleared', fmtL(l('declarada; imposto de {d} pago.', 'declared; {d} duty paid.'), { d: usd(c.duty) }));
      return { ok: true, text: fmtL(l('Declarada. Imposto de {d} pago; a peça segue para a sede.', 'Declared. {d} duty paid; the piece goes on to HQ.'), { d: usd(c.duty) }) };
    }
    const f = Math.round(c.v * 0.1);
    post(s, `cus31conf:${c.id}`, -f, 'legal', `Alfândega (confisco): ${c.n.pt}`);
    revert(s, c, l('Receita (declarada sem nota)', 'Customs (declared without invoice)'));
    finish(s, c, 'seized', fmtL(l('declarada sem nota: confiscada, multa de {f}.', 'declared without invoice: confiscated, {f} fine.'), { f: usd(f) }));
    return { ok: true, text: fmtL(l('Sem nota não há como importar: a peça é confiscada e você paga {f}. Nada sai no jornal.', 'Without an invoice it cannot be imported: the piece is confiscated and you pay {f}. Nothing in the papers.'), { f: usd(f) }) };
  }
  if (act === 'bribe') {
    const cost = bribeCost31(s, c);
    if (r.chance(bribeP31(s))) {
      post(s, `cus31bribe:${c.id}`, -cost, 'misc', 'Despesas de despacho');
      addHeat(s, 'player', homeA3(s), 2);
      finish(s, c, 'cleared', l('liberada com um envelope por baixo do balcão.', 'cleared with an envelope under the counter.'));
      return { ok: true, text: fmtL(l('O fiscal guarda o envelope ({v}) e carimba a guia.', 'The inspector pockets the envelope ({v}) and stamps the form.'), { v: usd(cost) }) };
    }
    return { ok: false, text: caught(s, c, true) };
  }
  if (act === 'desp') {
    const fee = despFee31(s, c);
    post(s, `cus31desp:${c.id}`, -fee, 'misc', `Despachante: ${c.n.pt}`);
    st.desp[homeA3(s)] = (st.desp[homeA3(s)] ?? 0) + 1;
  }
  if (r.chance(seizeP31(s, c, act === 'desp' ? 'desp' : 'self'))) return { ok: false, text: caught(s, c, false) };
  finish(s, c, 'cleared', act === 'desp' ? l('liberada pelo despachante, sem declarar.', 'cleared by the broker, undeclared.') : l('passou sem declarar.', 'got through undeclared.'));
  return { ok: true, text: l('Ninguém abriu a caixa. A carga passou.', 'Nobody opened the crate. The cargo got through.') };
}

// ---------------------------------------------------------------- motor

/** Virada do mês: cargas chegam; carga esquecida há 4+ semanas se resolve sozinha. */
export function customsMonth31(s: GameState): void {
  const st = peek(s);
  if (!st) return;
  for (const c of st.q) {
    if (c.st === 'transit' && c.arrive <= s.week) { c.st = 'held'; if (customsOn31(s)) notify(s, fmtL(l('Chegou à alfândega: {n}. Decida no balcão.', 'Arrived at customs: {n}. Decide at the desk.'), { n: c.n }), 'info'); }
    else if (c.st === 'held' && s.week - c.arrive >= 4) {
      if (c.law === 'legal') {
        post(s, `cus31duty:${c.id}`, -c.duty, 'acquisitions', `Alfândega (imposto): ${c.n.pt}`);
        finish(s, c, 'cleared', fmtL(l('imposto de {d} pago sozinho depois de 4 semanas parada.', '{d} duty paid automatically after 4 weeks waiting.'), { d: usd(c.duty) }));
      } else { revert(s, c, l('Receita (carga esquecida)', 'Customs (forgotten cargo)')); finish(s, c, 'lost', l('esquecida na alfândega: a Receita ficou com ela.', 'left at customs: customs kept it.')); }
    }
  }
  st.q = st.q.filter((c) => !c.done || s.week - c.done < 26).slice(-30);
}
registerSimHook('month', 'customs31', (s) => { customsMonth31(s); });

/** A apreensão vira manchete do jornal (o fato é a fonte; o jornal é ouvinte). */
onFact('customs_seizure', (s, f) => { headline19(s, f.text, f.severity >= 45 ? 2 : 1); }, 'customs31:news');

IMPORT31.f = (s, o) => {
  if (!customsOn31(s)) return false;
  const rl = relics(s).list.find((x) => x.id === o.rid);
  if (!rl) return false;
  ship31(s, { n: rl.n, k: 'relic', ref: rl.id, v: o.price, law: 'legal', from: o.from, src: 'auction31' });
  return true;
};

// ---------------------------------------------------------------- calendário e editor

registerDeadline('customs31', (s, from, to) => {
  if (!peek(s) || !customsOn31(s)) return [];
  const out = [];
  for (const c of cargos31(s)) {
    if (c.st === 'transit' && c.arrive >= from && c.arrive <= to) out.push({ id: `cus31:${c.id}`, w: c.arrive, kind: 'other' as const, tone: 'info' as const, act: undefined, t: fmtL(l('Chega à alfândega: {n}', 'Arrives at customs: {n}'), { n: c.n }), d: c.via === 'port' ? l('Pelo porto.', 'By sea.') : l('Pelo aeroporto.', 'By air.'), goto: { area: 'customs31' } });
    if (c.st === 'held' && s.week >= from && s.week <= to) out.push({ id: `cus31h:${c.id}`, w: Math.max(s.week, c.arrive + 4), kind: 'other' as const, tone: 'bad' as const, act: true as const, t: fmtL(l('Carga parada na alfândega: {n}', 'Cargo held at customs: {n}'), { n: c.n }), d: l('Declarar, tentar liberar ou abandonar; depois de 4 semanas ela se resolve sozinha.', 'Declare, try to clear or abandon; after 4 weeks it settles itself.'), goto: { area: 'customs31' } });
  }
  return out;
});
registerEditable({
  id: 'customs31.strict', area: 'world', kind: 'number', raw: true, min: 0, max: 3, step: 0.1, label: l('Alfândega: rigor da fiscalização (×)', 'Customs: inspection strictness (×)'),
  help: l('Multiplica a chance de apreensão de quem tenta liberar sem declarar.', 'Multiplies the seizure chance for undeclared cargo.'),
  get: (s) => peek(s)?.strict ?? 1, set: (s, v) => { customs31(s).strict = clamp(Number(v), 0, 3); },
});
registerRunnable({
  id: 'customs31.arrive', area: 'world', label: l('Alfândega: fazer chegar agora as cargas a caminho', 'Customs: make the cargo on its way arrive now'),
  run: (s) => { const xs = transit31(s); for (const c of xs) { c.arrive = s.week; c.st = 'held'; } return fmtL(l('{n} carga(s) na alfândega.', '{n} cargo(s) at customs.'), { n: xs.length }); },
});
