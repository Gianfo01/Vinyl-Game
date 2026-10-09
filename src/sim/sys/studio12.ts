// Rodada 12: DONO DE ESTÚDIO x PRODUTOR, duas profissões com patrimônios separados.
// Estúdio (negócio do ventures9): salas com caráter, equipamento com manutenção e especialização,
// engenheiros com estilo, propostas/prazos/cancelamentos, contratos por hora/diária/projeto e
// reputação (confiabilidade, clima, resultado). Produtor (pessoa): conversa inicial, músicos e
// arranjo, conflitos artista x selo x prazo, take imperfeito, cachê x pontos, créditos que atraem
// trabalho e assinatura que envelhece se não for reinventada.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, remember } from '../util';
import { ownerOf } from './people/owner';
import { maxGear, vpay, ventures, type Venture } from './ventures9';

export type Style = 'raw' | 'warm' | 'polished' | 'experimental';
export type Spec = 'analog' | 'digital' | 'vintage';
export type Contract = 'hourly' | 'daily' | 'project';
export const STYLES: Style[] = ['raw', 'warm', 'polished', 'experimental'];
export const STYLE_NAME: Record<Style, L> = { raw: l('Cru e ao vivo', 'Raw & live'), warm: l('Quente e analógico', 'Warm & analog'), polished: l('Polido e radiofônico', 'Polished & radio-ready'), experimental: l('Experimental', 'Experimental') };
export const SPEC_NAME: Record<Spec, L> = { analog: l('Analógico', 'Analog'), digital: l('Digital', 'Digital'), vintage: l('Vintage (válvulas e fita)', 'Vintage (tubes & tape)') };
const STYLE_SPEC: Record<Style, Spec | null> = { raw: 'analog', warm: 'vintage', polished: 'digital', experimental: null };
export const ROOMS: Record<string, { name: L; live: number; dead: number; vibe: number; best: Style[]; note: L }> = {
  live: { name: l('Sala ao vivo', 'Live room'), live: 90, dead: 25, vibe: 60, best: ['raw'], note: l('Pé-direito alto, reverberação natural: bateria e banda juntas.', 'High ceiling, natural reverb: drums and band together.') },
  booth: { name: l('Cabine vocal', 'Vocal booth'), live: 15, dead: 90, vibe: 45, best: ['polished'], note: l('Seca e íntima: voz limpa, sem vazamento.', 'Dry and intimate: clean vocals, no bleed.') },
  control: { name: l('Sala de controle', 'Control room'), live: 35, dead: 70, vibe: 40, best: ['polished', 'experimental'], note: l('Escuta precisa: mixagem e edição.', 'Accurate monitoring: mixing and editing.') },
  wood: { name: l('Sala de madeira', 'Wooden room'), live: 65, dead: 45, vibe: 90, best: ['warm', 'raw'], note: l('Pequena e calorosa: clima de casa de família, ótimo para tirar emoção.', 'Small and cozy: great for pulling emotion.') },
};
export interface Room { id: string; kind: string }
export interface Gear { id: string; spec: Spec; cond: number }
export interface Eng { id: string; name: string; skill: number; style: Style; wage: number }
export interface Booking { id: string; lab: string; client: string; style: Style; contract: Contract; units: number; rate: number; deadline: number; state: 'proposal' | 'booked' | 'done' | 'cancelled'; eng?: string; room?: string; left: number; q?: number; late?: number; why?: L[]; pay?: number; start?: number }
export interface StudioX { rooms: Room[]; gear: Gear[]; engs: Eng[]; jobs: Booking[]; rep: { rel: number; vibe: number; res: number }; log: L[] }
export interface Credit { y: number; act: string; q: number; style: Style }
export interface PJob { id: string; actId: string; own: boolean; fee: number; pts: number; months: number; exp: number }
export interface Proj {
  job: PJob; step: number; terms?: 'flat' | 'points'; intent?: 'faithful' | 'reinvent' | 'commercial'; style?: Style; mus?: 'band' | 'session' | 'synth'; app?: 'live' | 'overdub' | 'hybrid'; room?: string;
  cf?: 'single' | 'deadline' | 'budget'; cfPick?: string; take?: string; sc: { prec: number; emo: number; com: number; art: number; lab: number; time: number }; cost: number; ev: L[]; done?: { q: number; art: number; lab: number; pay: number; why: L[] };
}
export interface Producer { on: boolean; skill: { ear: number; arr: number; people: number }; sig: Style; fresh: number; learning: number; rep: number; credits: Credit[]; offers: PJob[]; proj: Proj | null; pending: { due: number; amt: number; memo: string }[]; boost: Record<string, number>; total: number }
export interface Studio12 { by: Record<string, StudioX>; prod: Producer }
declare module '../ext4' { interface Ext4 { studio12: Studio12 } }
const freshP = (): Producer => ({ on: false, skill: { ear: 40, arr: 35, people: 40 }, sig: 'warm', fresh: 70, learning: 0, rep: 15, credits: [], offers: [], proj: null, pending: [], boost: {}, total: 0 });
registerExt4('studio12', () => ({ by: {}, prod: freshP() }));
export const st12 = (s: GameState): Studio12 => {
  const x = s.x4 as unknown as { studio12?: Studio12 };
  x.studio12 ??= { by: {}, prod: freshP() };
  return x.studio12;
};
export const prod = (s: GameState): Producer => st12(s).prod;
const mIdx = (s: GameState) => s.year * 12 + s.month;
const activeAct = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && a.members.length > 0;
const NAMES = ['Marcos', 'Helena', 'Tadeu', 'Bianca', 'Otto', 'Lia', 'Nelson', 'Iris', 'Caio', 'Vera', 'Duda', 'Ravi'];

// ---------------------------------------------------------------- estúdio

export const studios = (s: GameState): Venture[] => ventures(s).list.filter((v) => v.kind === 'studio');
export function studioOf(s: GameState, v: Venture): StudioX {
  const st = st12(s);
  return (st.by[v.id] ??= {
    rooms: [{ id: nextId(s, 'rm'), kind: 'control' }], gear: [{ id: nextId(s, 'gr'), spec: s.year >= 1985 ? 'digital' : 'analog', cond: 80 }],
    engs: [{ id: nextId(s, 'en'), name: NAMES[v.founded % NAMES.length], skill: 40, style: STYLES[v.founded % 4], wage: money(s, 500) }], jobs: [], rep: { rel: 50, vibe: 50, res: 50 }, log: [],
  });
}
export const roomLimit = (v: Venture): number => v.level + 1;
export const gearName = (s: GameState, g: Gear): L => g.spec === 'digital' ? l('Conversores e DAW', 'Converters & DAW') : g.spec === 'analog' ? l('Console analógico', 'Analog console') : l('Válvulas e fita', 'Tubes & tape');
export function specialty(x: StudioX): Spec | null {
  const w: Record<Spec, number> = { analog: 0, digital: 0, vintage: 0 };
  for (const g of x.gear) w[g.spec] += g.cond / 100;
  const top = (Object.keys(w) as Spec[]).sort((a, b) => w[b] - w[a])[0];
  return w[top] >= 1.5 || (x.gear.length >= 2 && w[top] > x.gear.length * 0.6) ? top : null;
}
const sstate = (s: GameState, id: string) => { const v = studios(s).find((z) => z.id === id); return v ? { v, x: studioOf(s, v) } : null; };

export function addRoom(s: GameState, vid: string, kind: string): L | null {
  const o = sstate(s, vid); if (!o || !ROOMS[kind]) return l('Inválido.', 'Invalid.');
  if (o.x.rooms.length >= roomLimit(o.v)) return l('Sem espaço: expanda o estúdio (nível) para mais salas.', 'No space: expand the studio (level) for more rooms.');
  const c = money(s, 9000 * (o.x.rooms.length + 1));
  if (ownerFunds(s, o.v) < c) return l('Sem dinheiro.', 'Not enough money.');
  vpay(s, o.v.owner, -c, `rm12:${o.v.id}`, `Nova sala ${o.v.name}`, o.v);
  o.x.rooms.push({ id: nextId(s, 'rm'), kind });
  return null;
}
export const roomCost = (s: GameState, x: StudioX): number => money(s, 9000 * (x.rooms.length + 1));
export const gearCost = (s: GameState): number => money(s, 7000);
export const maintainCost = (s: GameState): number => money(s, 700);
const ownerFunds = (s: GameState, v: Venture): number => (v.owner === 'label' ? s.player.cash : ownerOf(s).wealth);
export function buyGear(s: GameState, vid: string, spec: Spec): L | null {
  const o = sstate(s, vid); if (!o) return l('Inválido.', 'Invalid.');
  if (o.x.gear.length >= 3 + o.v.level) return l('Sem espaço para mais equipamento.', 'No room for more gear.');
  if (spec === 'digital' && s.year < 1975) return l('Ainda não existe nesta época.', 'Does not exist in this era yet.');
  if (spec === 'analog' && s.year < 1945) return l('Ainda não existe nesta época.', 'Does not exist in this era yet.');
  if (ownerFunds(s, o.v) < gearCost(s)) return l('Sem dinheiro.', 'Not enough money.');
  vpay(s, o.v.owner, -gearCost(s), `gear12:${o.v.id}`, `Equipamento ${o.v.name}`, o.v);
  o.x.gear.push({ id: nextId(s, 'gr'), spec, cond: 100 });
  return null;
}
export function maintain(s: GameState, vid: string, gid: string): L | null {
  const o = sstate(s, vid), g = o?.x.gear.find((z) => z.id === gid); if (!o || !g) return l('Inválido.', 'Invalid.');
  if (ownerFunds(s, o.v) < maintainCost(s)) return l('Sem dinheiro.', 'Not enough money.');
  vpay(s, o.v.owner, -maintainCost(s), `mt12:${g.id}`, `Manutenção ${o.v.name}`, o.v);
  g.cond = 100;
  return null;
}
export function engCandidates(s: GameState): Eng[] {
  const r = Rng.fromSeed(`${s.config.seed}:eng12:${s.year}`);
  return [0, 1, 2].map((i) => { const skill = r.int(35, 85); return { id: `cand${s.year}_${i}`, name: `${r.pick(NAMES)} ${r.pick(['Silva', 'Costa', 'Reis', 'Lima', 'Prado', 'Neves'])}`, skill, style: r.pick(STYLES), wage: money(s, 350 + skill * 9) }; });
}
export function hire(s: GameState, vid: string, candId: string): L | null {
  const o = sstate(s, vid), c = engCandidates(s).find((z) => z.id === candId); if (!o || !c) return l('Inválido.', 'Invalid.');
  if (o.x.engs.length >= 1 + o.v.level) return l('Cabine cheia de engenheiros.', 'Too many engineers for this studio.');
  if (o.x.engs.some((e) => e.id === c.id)) return l('Já contratado.', 'Already hired.');
  o.x.engs.push({ ...c });
  return null;
}
export function fire(s: GameState, vid: string, eid: string): void { const o = sstate(s, vid); if (o && o.x.engs.length > 1) o.x.engs = o.x.engs.filter((e) => e.id !== eid); }

const contractPay = (s: GameState, c: Contract, units: number, tech: number): number =>
  c === 'hourly' ? Math.round(money(s, 40 + tech * 5) * units) : c === 'daily' ? Math.round(money(s, 500 + tech * 60) * units) : Math.round(money(s, 5000 + tech * 800) * units);
export const unitName = (c: Contract): L => c === 'hourly' ? l('horas', 'hours') : c === 'daily' ? l('diárias', 'days') : l('meses de projeto', 'project months');
export const months = (b: Booking): number => (b.contract === 'hourly' ? Math.max(1, Math.ceil(b.units / 60)) : b.contract === 'daily' ? Math.max(1, Math.ceil(b.units / 12)) : b.units);

/** Explica a qualidade esperada de um trabalho (mesma conta do resultado, sem sorte). */
export function fitReport(s: GameState, v: Venture, x: StudioX, b: Booking, eng: Eng | undefined, room: Room | undefined): { q: number; lines: L[] } {
  const lines: L[] = [];
  let q = 42 + (v.rep - 50) * 0.1;
  if (!eng) return { q: 0, lines: [l('Escolha um engenheiro.', 'Choose an engineer.')] };
  q += eng.skill * 0.3; lines.push(fmtL(l('Habilidade do engenheiro: +{n}', 'Engineer skill: +{n}'), { n: Math.round(eng.skill * 0.3) }));
  if (eng.style === b.style) { q += 12; lines.push(l('Estilo do engenheiro combina: +12', 'Engineer style matches: +12')); } else if (b.style !== 'experimental') { q -= 3; lines.push(l('Estilo do engenheiro diferente do pedido: −3', 'Engineer style differs from the brief: −3')); }
  const want = STYLE_SPEC[b.style], sp = specialty(x);
  if (want && sp === want) { q += 10; lines.push(l('Especialização do estúdio combina com o estilo: +10', 'Studio specialization matches the style: +10')); } else if (want && x.gear.some((g) => g.spec === want)) { q += 4; lines.push(l('Há equipamento do tipo certo, mas sem especialização: +4', 'Right gear is there, but no specialization: +4')); } else if (want) { q -= 4; lines.push(l('Sem o equipamento que esse som pede: −4', 'Missing the gear this sound needs: −4')); }
  if (room) { const best = ROOMS[room.kind].best.includes(b.style); q += best ? 8 : 0; q += (ROOMS[room.kind].vibe - 50) * 0.1; lines.push(best ? fmtL(l('{r} é ideal para esse estilo: +8', '{r} is ideal for this style: +8'), { r: ROOMS[room.kind].name }) : fmtL(l('{r} não é a sala ideal: sem bônus', '{r} is not the ideal room: no bonus'), { r: ROOMS[room.kind].name })); }
  const gap = maxGear(s) - v.gear!; if (gap > 0) { q -= gap * 7; lines.push(fmtL(l('Tecnologia {n} geração(ões) atrás: −{p}', 'Tech {n} generation(s) behind: −{p}'), { n: gap, p: gap * 7 })); }
  const worn = x.gear.length ? x.gear.reduce((t, g) => t + g.cond, 0) / x.gear.length : 0;
  if (worn < 50) { q -= (50 - worn) * 0.3; lines.push(l('Equipamento gasto: chance de perder takes', 'Worn gear: risk of losing takes')); }
  return { q: clamp(q, 0, 100), lines };
}
export function acceptJob(s: GameState, vid: string, jid: string, eid: string, rid: string): L | null {
  const o = sstate(s, vid), b = o?.x.jobs.find((j) => j.id === jid); if (!o || !b || b.state !== 'proposal') return l('Inválido.', 'Invalid.');
  if (o.x.jobs.some((j) => j.state === 'booked' && j.eng === eid)) return l('Esse engenheiro já está em outra sessão.', 'That engineer is already in another session.');
  if (o.x.jobs.some((j) => j.state === 'booked' && j.room === rid)) return l('Essa sala já está ocupada.', 'That room is already taken.');
  if (!o.x.engs.some((e) => e.id === eid) || !o.x.rooms.some((r) => r.id === rid)) return l('Escolha engenheiro e sala.', 'Choose an engineer and a room.');
  b.state = 'booked'; b.eng = eid; b.room = rid; b.left = months(b); b.start = mIdx(s);
  return null;
}
export function declineJob(s: GameState, vid: string, jid: string): void { const o = sstate(s, vid); const b = o?.x.jobs.find((j) => j.id === jid); if (b && b.state === 'proposal') { b.state = 'cancelled'; } }

function finishJob(s: GameState, r: Rng, v: Venture, x: StudioX, b: Booking): void {
  const eng = x.engs.find((e) => e.id === b.eng), room = x.rooms.find((z) => z.id === b.room);
  const rep = fitReport(s, v, x, b, eng, room), why = [...rep.lines];
  let q = rep.q + r.normal(0, 5);
  const worn = x.gear.reduce((t, g) => t + g.cond, 0) / Math.max(1, x.gear.length);
  if (worn < 50 && r.chance((50 - worn) / 120)) { q -= 12; why.push(l('Um equipamento falhou e um take bom foi perdido: −12', 'A piece of gear failed and a good take was lost: −12')); }
  const overrun = r.chance(clamp(0.2 + b.units / 400 - (eng?.skill ?? 0) / 300, 0.05, 0.6));
  const late = mIdx(s) > b.deadline; b.late = late ? mIdx(s) - b.deadline : 0;
  let pay = b.pay ?? 0;
  if (overrun) {
    if (b.contract === 'hourly') { pay = Math.round(pay * 1.2); why.push(l('Estourou o tempo: horas extras cobradas (+20%).', 'Ran over: extra hours billed (+20%).')); } else if (b.contract === 'project') { pay = Math.round(pay * 0.85); why.push(l('Estourou o tempo no projeto fechado: você absorveu o custo (−15%).', 'Ran over on a fixed project: you absorbed the cost (−15%).')); } else why.push(l('Diárias extras de graça para fechar o disco.', 'Extra days at no charge to finish the record.'));
  }
  if (late) { pay = Math.round(pay * (1 - 0.1 * b.late!)); why.push(l('Entregue depois do prazo: multa e desgaste.', 'Delivered after the deadline: penalty and bad blood.')); }
  vpay(s, v.owner, pay, `job12:${b.id}`, `Sessões ${b.client}`, v);
  b.q = clamp(q, 0, 100); b.why = why; b.state = 'done';
  const rp = x.rep;
  rp.rel = clamp(rp.rel + (late ? -6 : 2.5), 0, 100);
  rp.res = clamp(rp.res + (b.q - 55) / 6, 0, 100);
  rp.vibe = clamp(rp.vibe + ((room ? ROOMS[room.kind].vibe : 50) - 50) / 20 + (b.q > 70 ? 1 : -0.5), 0, 100);
  v.sound = clamp((v.sound ?? 25) + (b.q - 60) * 0.03, 0, 100);
  v.rep = clamp(v.rep + (rp.rel + rp.vibe + rp.res - 150) / 150, 0, 100);
  x.log.push(fmtL(l('{c}: qualidade {q}{l}', '{c}: quality {q}{l}'), { c: b.client, q: Math.round(b.q), l: late ? l(' (atrasado)', ' (late)') : '' })); if (x.log.length > 12) x.log.shift();
}

function studioMonth(s: GameState, r: Rng, v: Venture): void {
  const x = studioOf(s, v), now = mIdx(s);
  for (const g of x.gear) g.cond = clamp(g.cond - 2.5 - v.level * 0.4 - r.next(), 0, 100);
  for (const e of x.engs) vpay(s, v.owner, -e.wage, `wg12:${e.id}`, `Salário ${e.name}`, v);
  for (const b of x.jobs) if (b.state === 'booked') {
    if (r.chance(0.025 + (x.rep.rel < 40 ? 0.05 : 0))) { b.state = 'cancelled'; const keep = b.contract === 'project' ? Math.round((b.pay ?? 0) * 0.25) : 0; if (keep) vpay(s, v.owner, keep, `cx12:${b.id}`, `Cancelamento ${b.client}`, v); notify(s, fmtL(l('{c} cancelou a sessão no estúdio.{k}', '{c} cancelled the studio session.{k}'), { c: b.client, k: keep ? l(' O sinal fica com você.', ' You keep the deposit.') : '' }), 'bad'); continue; }
    b.left -= 1;
    if (b.left <= 0) finishJob(s, r, v, x, b);
  }
  x.jobs = x.jobs.filter((b) => b.state === 'booked' || (b.state === 'proposal' && b.deadline >= now) || (b.state === 'done' && now - (b.deadline) < 8));
  // novas propostas: reputação (clima, confiança, resultado) e especialização atraem clientes
  const rp = x.rep, appeal = (rp.rel + rp.vibe + rp.res) / 150 + v.level * 0.2 + (specialty(x) ? 0.2 : 0);
  const n = clamp(Math.round(appeal * 1.3 + r.normal(0, 0.8)), 0, 3);
  const labs = Object.values(s.labels).filter((z) => z.active && z.id !== 'player');
  for (let i = 0; i < n && labs.length && x.jobs.filter((b) => b.state === 'proposal').length < 5; i++) {
    const lb = r.pick(labs), a = lb.roster.map((z) => s.acts[z]).filter(activeAct);
    const ct = r.pick<Contract>(['hourly', 'daily', 'project']), units = ct === 'hourly' ? r.int(20, 90) : ct === 'daily' ? r.int(3, 12) : r.int(1, 3);
    const style = specialty(x) && r.chance(0.5) ? (STYLES.find((z) => STYLE_SPEC[z] === specialty(x)) ?? r.pick(STYLES)) : r.pick(STYLES);
    const b: Booking = { id: nextId(s, 'bk'), lab: lb.id, client: a.length ? `${r.pick(a).name} (${lb.name})` : lb.name, style, contract: ct, units, rate: 0, deadline: now + r.int(2, 5), state: 'proposal', left: 0 };
    b.pay = contractPay(s, ct, units, v.gear!) ; x.jobs.push(b);
  }
}
/** Especialista da casa melhora os discos do selo (soma ao "som da casa" já existente). */
registerMod('songQ', 'studio12:eng', (s, value, ctx) => {
  const act = ctx.act, song = ctx.song;
  if (!act || !song || (act.owner !== 'player' && !act.playerBand)) return null;
  const P = prod(s), bonus = P.boost[act.id] ?? 0;
  const best = Math.max(0, ...studios(s).map((v) => Math.max(...studioOf(s, v).engs.map((e) => e.skill)) / 40));
  const add = Math.min(6, bonus + best);
  if (add < 0.5) return null;
  if (bonus) delete P.boost[act.id];
  const before = song.production; song.production = clamp(song.production + add, 5, 100);
  return { value: value + (song.production - before) * 0.4, label: bonus ? l('Produtor do disco', 'Record producer') : l('Engenheiro da casa', 'House engineer') };
});

// ---------------------------------------------------------------- produtor

export const hotStyle = (s: GameState): Style => STYLES[Math.floor(Rng.fromSeed(`${s.config.seed}:hot12:${Math.floor(s.year / 3)}`).next() * 4)];
export const dated = (p: Producer): boolean => p.fresh < 35;
export function startProducer(s: GameState): void { const p = prod(s); if (!p.on) { p.on = true; remember(s, 'life', l('Você passa a produzir discos de outros artistas: a cadeira de produtor é uma carreira à parte.', 'You start producing other acts\' records: the producer\'s chair is a separate career.')); } }
export function reinvent(s: GameState, style: Style): L | null {
  const p = prod(s); if (style === p.sig) return l('Já é a sua assinatura.', 'Already your signature.');
  p.sig = style; p.fresh = 70; p.learning = 3; p.rep = clamp(p.rep - 5, 0, 100);
  return null;
}
export function offerFee(s: GameState, p: Producer, a: Act): number { return Math.round(money(s, 1500 * (1 + a.fame / 12)) * (0.7 + p.rep / 100 * 0.6) * (dated(p) ? 0.7 : 1)); }
export function pointsEV(s: GameState, a: Act, pts: number, q: number): number { return Math.round(money(s, 50000 * (1 + a.fame / 15)) * Math.pow(Math.max(0.05, q) / 60, 2.2) * pts); }

export function takeJob(s: GameState, id: string, terms: 'flat' | 'points'): L | null {
  const p = prod(s), j = p.offers.find((o) => o.id === id); if (!j) return l('Inválido.', 'Invalid.');
  if (p.proj) return l('Termine o projeto em andamento primeiro.', 'Finish the current project first.');
  p.offers = p.offers.filter((o) => o !== j);
  p.proj = { job: j, step: 0, terms, sc: { prec: 45 + p.skill.ear / 5, emo: 45 + p.skill.people / 5, com: 45, art: 50, lab: 50, time: 3 }, cost: 0, ev: [] };
  return null;
}
const ev = (pr: Proj, t: L) => pr.ev.push(t);
export function stepIntent(s: GameState, intent: NonNullable<Proj['intent']>, style: Style): void {
  const pr = prod(s).proj!, p = prod(s), c = pr.sc; pr.intent = intent; pr.style = style;
  if (intent === 'faithful') { c.art += 8; c.emo += 4; c.lab += 2; ev(pr, l('Fiel às referências: o artista se sente ouvido (+arte), sem riscos novos.', 'Faithful to references: the artist feels heard, no new risks.')); }
  if (intent === 'reinvent') { c.art += 10; c.emo += 6; c.com -= 6; c.lab -= 6; p.fresh = clamp(p.fresh + 8, 0, 100); ev(pr, l('Reinventar: o artista vibra, o selo teme, e sua assinatura se renova.', 'Reinvent: the artist is thrilled, the label nervous, and your signature refreshes.')); }
  if (intent === 'commercial') { c.com += 14; c.lab += 8; c.art -= 6; ev(pr, l('Foco no rádio: o selo sorri, o artista engole seco.', 'Radio focus: the label smiles, the artist swallows hard.')); }
  if (style === hotStyle(s)) { c.com += 8; ev(pr, l('O estilo está em alta nesta época: +comercial.', 'The style is hot right now: +commercial.')); }
  if (style === p.sig) { c.prec += 3; ev(pr, l('É a sua assinatura: você domina o caminho.', 'It is your signature: you know the road.')); } else { c.prec -= 3; ev(pr, l('Fora da sua assinatura: mais incerteza.', 'Outside your signature: more uncertainty.')); }
  pr.step = 1;
}
export const synthOpen = (s: GameState): boolean => s.year >= 1975;
export function stepBand(s: GameState, mus: NonNullable<Proj['mus']>, app: NonNullable<Proj['app']>, room: string): void {
  const pr = prod(s).proj!, c = pr.sc; pr.mus = mus; pr.app = app; pr.room = room;
  if (mus === 'band') { c.emo += 12; c.prec -= 2; ev(pr, l('A banda do artista toca: emoção alta, pequenas imprecisões.', 'The act\'s own band plays: high emotion, small imprecisions.')); }
  if (mus === 'session') { c.prec += 14; c.emo -= 4; pr.cost += money(s, 2500); ev(pr, l('Músicos de estúdio: precisão e custo (pago por você).', 'Session players: precision, and a cost (paid by you).')); }
  if (mus === 'synth') { c.prec += 8; c.emo -= 8; c.com += 4; ev(pr, l('Programado: preciso e moderno, mais frio.', 'Programmed: precise and modern, colder.')); }
  if (app === 'live') { c.emo += 8; c.prec -= 4; c.time -= 0; } else if (app === 'overdub') { c.prec += 8; c.emo -= 4; c.time -= 1; } else { c.emo += 3; c.prec += 3; }
  const kind = room === 'rent' ? null : room.split(':')[1];
  if (room === 'rent') { pr.cost += money(s, 1200); ev(pr, l('Estúdio alugado: sala comum, sem o caráter de uma sala própria.', 'Rented studio: an ordinary room without a home room\'s character.')); } else if (kind) {
    const R = ROOMS[kind], good = (app === 'live' && R.live >= 60) || (app === 'overdub' && R.dead >= 60) || (app === 'hybrid' && R.live >= 40 && R.dead >= 40);
    if (good) { c.prec += 4; c.emo += 4; ev(pr, fmtL(l('{r} combina com o método: +4/+4.', '{r} suits the method: +4/+4.'), { r: R.name })); } else { c.prec -= 3; c.emo -= 3; ev(pr, fmtL(l('{r} briga com o método: −3/−3.', '{r} fights the method: −3/−3.'), { r: R.name })); }
    c.emo += (R.vibe - 50) / 10;
  }
  pr.step = 2;
}
export function conflictKind(s: GameState, pr: Proj): NonNullable<Proj['cf']> { return (['single', 'deadline', 'budget'] as const)[Math.floor(Rng.fromSeed(`${s.config.seed}:cf12:${pr.job.id}`).next() * 3)]; }
export function stepConflict(s: GameState, pick: string): void {
  const pr = prod(s).proj!, c = pr.sc, k = conflictKind(s, pr); pr.cf = k; pr.cfPick = pick;
  const M = (a: number, b: number, d: number, e: number, t: L) => { c.art += a; c.lab += b; c.com += d; c.emo += e; ev(pr, t); };
  if (k === 'single') {
    if (pick === 'label') { M(-10, 10, 8, -3, l('Você deu a mixagem de rádio ao selo: o artista ficou magoado.', 'You gave the label its radio mix: the artist is hurt.')); }
    else if (pick === 'artist') { M(8, -10, -5, 4, l('Você protegeu a visão do artista: o selo ameaçou cortar o orçamento.', 'You protected the artist\'s vision: the label threatened the budget.')); }
    else { M(3, 3, 0, 0, l('Duas mixagens: todos aceitam, mas custa um dia.', 'Two mixes: everyone accepts, but it costs a day.')); c.prec += 3; c.time -= 1; }
  } else if (k === 'deadline') {
    if (pick === 'cut') { M(-2, 4, 0, 0, l('Você cortou sessões para cumprir o prazo: menos precisão.', 'You cut sessions to hit the deadline: less precision.')); c.prec -= 8; }
    else if (pick === 'extend') { M(0, -6, 0, 0, l('Você pediu mais prazo: o selo anotou.', 'You asked for more time: the label noted it.')); c.prec += 6; c.time -= 2; }
    else { M(-2, 0, 0, 0, l('Noites em claro: precisão boa, equipe esgotada (custo seu).', 'Late nights: good precision, a worn-out crew (your cost).')); c.prec += 2; pr.cost += money(s, 1800); }
  } else {
    if (pick === 'grant') { M(8, -4, 0, 0, l('Você bancou mais dias para o artista (do seu bolso).', 'You covered extra days for the artist (your pocket).')); pr.cost += money(s, 3000); c.emo += 3; }
    else if (pick === 'refuse') { M(-8, 3, 0, 0, l('Você negou os dias extras: o artista saiu emburrado.', 'You refused the extra days: the artist left sulking.')); }
    else { M(3, 0, 0, 0, l('Dividiram o custo dos dias extras: ninguém feliz, ninguém furioso.', 'You split the extra days: nobody happy, nobody furious.')); pr.cost += money(s, 1500); }
  }
  pr.step = 3;
}
export function takeChance(p: Producer, eng: number): number { return clamp(0.35 + p.skill.people / 200 + p.skill.ear / 200 + eng / 300, 0.2, 0.9); }
export function stepTake(s: GameState, r: Rng, pick: 'keep' | 'redo' | 'comp'): void {
  const P = prod(s), pr = P.proj!, c = pr.sc; pr.take = pick;
  if (pick === 'keep') { c.emo += 16; c.prec -= 10; c.art += 6; if (!pr.job.own) c.lab -= 6; ev(pr, l('Você manteve o take imperfeito: a emoção ficou, os puristas vão reparar.', 'You kept the flawed take: the feeling stays, purists will notice.')); }
  else if (pick === 'redo') { c.prec += 12; c.emo -= 14; c.lab += 6; c.art -= 8; c.time -= 1; ev(pr, l('Refizeram para ficar certo: ficou limpo, perdeu a faísca.', 'You redid it to get it right: clean, but the spark is gone.')); }
  else if (r.chance(takeChance(P, 40))) { c.emo += 8; c.prec += 6; c.time -= 1; ev(pr, l('Edição cirúrgica: a alma do take com a precisão dos outros. Deu certo.', 'Surgical edit: the soul of the take with the precision of the rest. It worked.')); }
  else { c.emo -= 6; c.prec -= 2; c.time -= 1; ev(pr, l('A colagem soou costurada e o artista percebeu: perdeu-se o feeling.', 'The splice sounded stitched and the artist noticed: the feeling is lost.')); }
  pr.step = 4;
}
export function deliver(s: GameState, r: Rng): void {
  const P = prod(s), pr = P.proj!, c = pr.sc, a = s.acts[pr.job.actId], j = pr.job;
  const w = j.own ? [0.25, 0.5, 0.25] : [0.3, 0.3, 0.4];
  let q = c.prec * w[0] + c.emo * w[1] + c.com * w[2] + (P.skill.arr - 40) / 8 + (P.fresh - 50) / 10 - (P.learning > 0 ? 5 : 0) + r.normal(0, 3);
  q = clamp(q, 0, 100);
  const art = clamp(0.6 * c.emo + 0.2 * c.prec + 0.2 * c.art, 0, 100), lab = clamp(0.45 * c.com + 0.35 * c.prec + 0.2 * c.lab + c.time * 2 - 4, 0, 100);
  const why: L[] = [];
  why.push(fmtL(l('Precisão {p}, emoção {e}, apelo comercial {c}.', 'Precision {p}, emotion {e}, commercial appeal {c}.'), { p: Math.round(c.prec), e: Math.round(c.emo), c: Math.round(c.com) }));
  if (c.time < 0) why.push(l('Estourou o prazo: o selo cobra.', 'Missed the deadline: the label presses.'));
  if (P.fresh < 35) why.push(l('Sua assinatura soa datada: pesa na nota e no cachê.', 'Your signature sounds dated: it weighs on the grade and on your fee.'));
  const w0 = ownerOf(s);
  let pay = 0;
  if (pr.terms === 'flat') { pay = Math.round(j.fee * (0.9 + q / 500)); w0.wealth += pay; why.push(l('Cachê fixo recebido agora.', 'Flat fee received now.')); }
  else { const amt = pointsEV(s, a, j.pts, q); P.pending.push({ due: mIdx(s) + 12, amt, memo: a.name }); pay = amt; why.push(l('Pontos: o dinheiro só chega em 12 meses, conforme as vendas.', 'Points: money only arrives in 12 months, following sales.')); }
  w0.wealth -= pr.cost; P.total += pay - pr.cost;
  P.credits.push({ y: s.year, act: a.name, q, style: pr.style ?? P.sig });
  if (P.credits.length > 40) P.credits.shift();
  P.rep = clamp(P.rep + (q - 55) / 8, 0, 100);
  P.skill.ear = clamp(P.skill.ear + 0.8, 0, 100); P.skill.arr = clamp(P.skill.arr + 0.6, 0, 100); P.skill.people = clamp(P.skill.people + (art > 60 ? 0.8 : 0.3), 0, 100);
  if ((pr.style ?? P.sig) === P.sig) P.fresh = clamp(P.fresh - 4, 0, 100);
  if (P.learning > 0) P.learning--;
  a.momentum = clamp(a.momentum + (q - 60) / 15, 0, 100);
  if (j.own) P.boost[a.id] = clamp((q - 45) / 9, 0, 6);
  pr.done = { q, art, lab, pay, why };
}
export function closeProject(s: GameState): void { prod(s).proj = null; }

registerSimHook('year', 'studio12', (s) => {
  const P = prod(s); if (!P.on) return;
  P.fresh = clamp(P.fresh - (P.sig === hotStyle(s) ? 3 : 8), 0, 100);
});
registerSimHook('month', 'studio12', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:studio12:${s.year}:${s.month}`);
  for (const v of studios(s)) studioMonth(s, r, v);
  const P = prod(s), now = mIdx(s);
  for (const p of P.pending.filter((z) => z.due <= now)) { ownerOf(s).wealth += p.amt; P.total += 0; notify(s, fmtL(l('Pontos do disco de {a} renderam {m}.', 'Points on {a}\'s record paid {m}.'), { a: p.memo, m: Math.round(p.amt / 100).toLocaleString() }), 'good'); }
  P.pending = P.pending.filter((z) => z.due > now);
  if (!P.on) return;
  P.offers = P.offers.filter(() => r.chance(0.8));
  const avg = P.credits.length ? P.credits.slice(-8).reduce((t, c) => t + c.q, 0) / Math.min(8, P.credits.length) : 50;
  if (P.offers.length < 3 && r.chance(clamp(0.25 + P.rep / 150 + (avg - 50) / 250 + (P.fresh - 50) / 200, 0.05, 0.9))) {
    const pool = Object.values(s.acts).filter((a) => activeAct(a) && a.fame >= 4 && a.fame <= 40 + P.rep * 0.6 && !P.offers.some((o) => o.actId === a.id));
    if (pool.length) { const a = r.pick(pool); P.offers.push({ id: nextId(s, 'pj'), actId: a.id, own: a.owner === 'player' || !!a.playerBand, fee: offerFee(s, P, a), pts: 0.03 + P.rep / 4000, months: 3, exp: now + 4 }); }
  }
  P.offers = P.offers.filter((o) => o.exp > now);
});
