// Eventos de vida pessoal (rodada 10): substituem os antigos "dilemas pessoais". Todo mês há uma chance
// (guiada por traços, estilo de vida da árvore de habilidades, patrimônio, saúde/estresse, família, vícios,
// idade, época, política/religião, fama e situação do selo) de acontecer 0–1 evento (raramente 2) que
// aparece como pop-up com 2–4 respostas. Cada resposta tem custos à vista e efeitos reais no jogo; algumas
// têm sequência meses depois. Se o jogador avança sem responder, vale a resposta padrão (branda).
// Aleatoriedade própria (Rng semeado por semente+mês+evento): não mexe no fluxo compartilhado.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { queueCutscene, registerExt4, registerSimHook } from '../ext4';
import { activeCensorship } from '../media';
import { playerViews, shiftPlayerViews, type PolId, type RelId, type Views } from '../beliefs';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { ownerOf } from './people/owner';
import { energyLeft, life, spendEnergy, addKid, type Partner } from './life';
import { vices, gainTrait, loseTrait, type ViceId } from './vices';
import type { Owner } from './people/state';
import { persona, skills } from './persona';
import { EVENTS } from './lifeevents10/data';

export interface LeCtx { act?: string; pid?: string; lab?: string; n?: number; kid?: number }
export interface Fx {
  /** saúde, estresse (pontos) */
  h?: number; st?: number;
  /** dólares reais: patrimônio pessoal e caixa do selo (negativo = custo) */
  w?: number; cash?: number;
  /** reputação: artística, institucional, comercial, entre artistas */
  art?: number; ins?: number; com?: number; arts?: number;
  love?: number; fame?: number; sp?: number; kidBond?: number; heat?: number;
  attr?: [keyof Owner['attrs'], number];
  /** pessoa do contexto: moral e ressentimento; ato do contexto: fama e fãs centrais (%) */
  mor?: number; res?: number; afame?: number; fans?: number;
  dep?: [ViceId, number];
  pol?: PolId; eng?: number; rel?: RelId; dev?: number;
  gain?: string; lose?: string;
  /** o parceiro vai embora / casam / ficam noivos */
  breakup?: 1; marry?: 1; engage?: 1; baby?: 1;
}
export interface Ch {
  id: string;
  label: L;
  note?: L;
  energy?: number;
  fx: Fx;
  res: L;
  /** efeito extra que depende do contexto/visões */
  dyn?: (s: GameState, c: LeCtx) => Fx;
  gate?: (e: Env, c: LeCtx) => L | null;
  /** chance (0..1) de o resultado ruim substituir o normal */
  odds?: { p: number | ((e: Env, c: LeCtx) => number); fx: Fx; res: L };
  next?: { ev: string; m: number; p?: number };
}
export interface Def {
  id: string;
  name: L;
  era?: [number, number];
  once?: boolean;
  cool: number;
  /** peso de sorteio (0 = não acontece) */
  w: (e: Env) => number;
  pick?: (e: Env, r: Rng) => LeCtx | null;
  text: (s: GameState, c: LeCtx) => L;
  ch: Ch[];
  /** resposta padrão se o jogador ignorar */
  def: string;
  chain?: boolean;
}
export interface Env {
  s: GameState; year: number; age: number; o: Owner; v: Views; traits: string[]; ls: string | null;
  stress: number; health: number; wealth: number; cash: number; fame: number;
  partner: Partner | null; married: boolean; kids: number; dep: number; acts: Act[]; censor: boolean; sex: string;
}
interface Open { id: string; ev: string; ctx: LeCtx; m: number; done?: { ch: string; text: L } }
export interface LeState { cd: Record<string, number>; open: Open[]; pend: { due: number; ev: string; ctx: LeCtx }[]; log: { m: number; ev: string; text: L }[]; seq: number }

const fresh = (): LeState => ({ cd: {}, open: [], pend: [], log: [], seq: 0 });
declare module '../ext4' { interface Ext4 { life10: LeState } }
registerExt4('life10', fresh);
export function leState(s: GameState): LeState {
  const x = s.x4 as unknown as { life10?: LeState };
  x.life10 ??= fresh();
  const st = x.life10;
  st.cd ??= {}; st.open ??= []; st.pend ??= []; st.log ??= []; st.seq ??= 0;
  return st;
}

const mk = (s: GameState) => s.year * 12 + s.month;
export const defOf = (id: string): Def | undefined => EVENTS.find((e) => e.id === id);

export function envOf(s: GameState): Env {
  const o = ownerOf(s);
  const L0 = life(s);
  const v = vices(s);
  const f = money(s, 1) || 1;
  return {
    s, year: s.year, age: s.year - o.born, o, v: playerViews(s), traits: persona(s).traits, ls: skills(s).lifestyle ?? null,
    stress: o.stress, health: o.health, wealth: o.wealth / f, cash: s.player.cash / f, fame: L0.fame,
    partner: L0.partner, married: L0.partner?.stage === 'married', kids: o.kids.length,
    dep: Math.max(v.dep.smoke, v.dep.drink, v.dep.drugs), acts: playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.deceased && a.status !== 'retired'),
    censor: activeCensorship(s).length > 0, sex: persona(s).sex ?? 'x',
  };
}

/** Custos visíveis de uma resposta (dólares reais). */
export function costOf(ch: Ch): { w: number; cash: number; energy: number } {
  return { w: Math.max(0, -(ch.fx.w ?? 0)), cash: Math.max(0, -(ch.fx.cash ?? 0)), energy: ch.energy ?? 0 };
}
export function choiceBlocker(s: GameState, ch: Ch, c: LeCtx): L | null {
  const e = envOf(s);
  const g = ch.gate?.(e, c);
  if (g) return g;
  const k = costOf(ch);
  if (k.w && e.o.wealth < money(s, k.w)) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  if (k.cash && s.player.cash < money(s, k.cash)) return l('Caixa do selo insuficiente.', 'Not enough label cash.');
  if (k.energy && energyLeft(s) < k.energy) return l('Sem tempo livre suficiente.', 'Not enough free time.');
  return null;
}

function apply(s: GameState, fx: Fx, c: LeCtx, key: string, soft = false): void {
  const o = ownerOf(s);
  const rep = s.player.reputation;
  const pr = s.persons[c.pid ?? ''];
  const act = s.acts[c.act ?? ''];
  if (fx.h) o.health = clamp(o.health + fx.h, 0, 100);
  if (fx.st) o.stress = clamp(o.stress + fx.st, 0, 100);
  if (fx.w) o.wealth = soft ? Math.max(Math.min(0, o.wealth), o.wealth + money(s, fx.w)) : o.wealth + money(s, fx.w);
  if (fx.cash) post(s, `le10:${key}`, money(s, fx.cash), 'misc', 'Vida pessoal');
  if (fx.art) rep.artistic = clamp(rep.artistic + fx.art, 0, 100);
  if (fx.ins) rep.institutional = clamp(rep.institutional + fx.ins, 0, 100);
  if (fx.com) rep.commercial = clamp(rep.commercial + fx.com, 0, 100);
  if (fx.arts) rep.artists = clamp(rep.artists + fx.arts, 0, 100);
  const L0 = life(s);
  if (fx.love && L0.partner) L0.partner.affinity = clamp(L0.partner.affinity + fx.love, 0, 100);
  if (fx.fame) L0.fame = clamp(L0.fame + fx.fame, 0, 100);
  if (fx.sp) { const sk = skills(s); sk.points += fx.sp; sk.earned += fx.sp; }
  if (fx.kidBond) for (const k of Object.values(L0.kidsX)) k.bond = clamp(k.bond + fx.kidBond, 0, 100);
  if (fx.heat) vices(s).heat = clamp(vices(s).heat + fx.heat, 0, 100);
  if (fx.attr) { const k = fx.attr[0] as keyof Owner['attrs']; o.attrs[k] = clamp(o.attrs[k] + fx.attr[1], 5, 99); }
  if (fx.mor && pr) pr.morale = clamp(pr.morale + fx.mor, 0, 100);
  if (fx.res && pr) pr.resentment = clamp(pr.resentment + fx.res, 0, 100);
  if (fx.afame && act) act.fame = clamp(act.fame + fx.afame, 0, 100);
  if (fx.fans && act) act.fans.core = Math.max(0, Math.round(act.fans.core * (1 + fx.fans / 100)));
  if (fx.dep) { const v = vices(s); v.dep[fx.dep[0]] = clamp(v.dep[fx.dep[0]] + fx.dep[1], 0, 100); }
  if (fx.pol || fx.eng || fx.rel || fx.dev) shiftPlayerViews(s, { pol: fx.pol, eng: fx.eng, rel: fx.rel, dev: fx.dev });
  if (fx.gain) gainTrait(s, fx.gain);
  if (fx.lose) loseTrait(s, fx.lose);
  if (fx.breakup && L0.partner) {
    if (L0.partner.stage === 'married') o.wealth -= Math.round(Math.max(0, o.wealth) * 0.3);
    o.spouse = undefined; L0.exes.push(L0.partner.name); L0.partner = null;
  }
  if (fx.engage && L0.partner && L0.partner.stage === 'dating') L0.partner.stage = 'engaged';
  if (fx.marry && L0.partner && L0.partner.stage !== 'married') { L0.partner.stage = 'married'; o.spouse = L0.partner.name; }
  if (fx.baby) addKid(s, Rng.fromSeed(`le10baby:${s.config.seed}:${key}`), false);
}

function addFx(a: Fx, b: Fx): Fx {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = typeof v === 'number' ? ((out[k] as number | undefined) ?? 0) + v : v;
  return out as Fx;
}

function resolve(s: GameState, op: Open, ch: Ch, ignored: boolean): void {
  const st = leState(s);
  const d = defOf(op.ev)!;
  const r = Rng.fromSeed(`le10r:${s.config.seed}:${op.id}:${ch.id}`);
  if (ch.energy && !ignored) spendEnergy(s, ch.energy);
  let fx = ch.fx;
  let res = ch.res;
  if (ch.dyn) fx = addFx(fx, ch.dyn(s, op.ctx));
  if (ch.odds) {
    const p = typeof ch.odds.p === 'number' ? ch.odds.p : ch.odds.p(envOf(s), op.ctx);
    if (r.chance(p)) { fx = { ...ch.odds.fx, w: (ch.odds.fx.w ?? 0) + Math.min(0, fx.w ?? 0), cash: (ch.odds.fx.cash ?? 0) + Math.min(0, fx.cash ?? 0) }; res = ch.odds.res; }
  }
  apply(s, fx, op.ctx, `${op.id}:${ch.id}`, ignored);
  const text = fmtL(res, names(s, op.ctx));
  op.done = { ch: ch.id, text };
  st.cd[d.id] = mk(s);
  st.log.unshift({ m: mk(s), ev: d.id, text });
  if (st.log.length > 30) st.log.length = 30;
  if (ch.next && (ch.next.p === undefined || r.chance(ch.next.p))) st.pend.push({ due: mk(s) + ch.next.m, ev: ch.next.ev, ctx: { ...op.ctx } });
  remember(s, 'decision', fmtL(l('{n}: {r}', '{n}: {r}'), { n: d.name, r: text }), { important: !!(fx.breakup || fx.marry || fx.baby || fx.engage) });
  if (ignored) notify(s, fmtL(l('{n}: você deixou passar. {r}', '{n}: you let it pass. {r}'), { n: d.name, r: text }), 'info');
}

/** Nomes para substituir {a} (ato), {p} (pessoa), {k} (filho) e {x} (parceiro) nos textos. */
export function names(s: GameState, c: LeCtx): Record<string, string> {
  const pt = life(s).partner;
  const kid = ownerOf(s).kids[c.kid ?? -1] ?? ownerOf(s).kids[ownerOf(s).kids.length - 1];
  return { a: s.acts[c.act ?? '']?.name ?? '', p: s.persons[c.pid ?? '']?.name ?? '', k: kid?.name ?? '', x: pt?.name ?? '', lab: c.lab ? s.labels[c.lab]?.name ?? '' : '', n: String(c.n ?? '') };
}

/** O jogador responde ao evento aberto. */
export function answerLifeEvent(s: GameState, openId: string, chId: string): L | null {
  const st = leState(s);
  const op = st.open.find((x) => x.id === openId);
  const d = op && defOf(op.ev);
  const ch = d?.ch.find((x) => x.id === chId);
  if (!op || !d || !ch) return l('Evento desconhecido.', 'Unknown event.');
  if (op.done) return l('Você já respondeu.', 'You already answered.');
  const b = choiceBlocker(s, ch, op.ctx);
  if (b) return b;
  resolve(s, op, ch, false);
  return null;
}

export function openEvents(s: GameState): Open[] {
  return leState(s).open.filter((o) => !o.done);
}

function fire(s: GameState, ev: string, ctx: LeCtx): void {
  const st = leState(s);
  const d = defOf(ev);
  if (!d) return;
  const op: Open = { id: `le${++st.seq}`, ev, ctx, m: mk(s) };
  st.open.push(op);
  if (st.open.length > 12) st.open.splice(0, st.open.length - 12);
  queueCutscene(s, 'lifeEvent', { title: d.name, openId: op.id });
}

function eligible(s: GameState, e: Env, d: Def, now: number): number {
  if (d.chain) return 0;
  if (d.era && (e.year < d.era[0] || e.year > d.era[1])) return 0;
  const st = leState(s);
  const t0 = st.cd[d.id];
  if (t0 !== undefined && (d.once || now - t0 < d.cool)) return 0;
  return Math.max(0, d.w(e));
}

/** Sorteio mensal (testável): devolve os ids disparados. */
export function rollLifeEvents(s: GameState): string[] {
  const st = leState(s);
  const now = mk(s);
  // quem foi ignorado no mês anterior ganha a resposta padrão
  for (const op of st.open) {
    if (op.done) continue;
    const d = defOf(op.ev);
    const ch = d?.ch.find((x) => x.id === d.def);
    if (d && ch) resolve(s, op, ch, true);
  }
  st.open = st.open.filter((o) => o.m >= now - 1 || !o.done).slice(-12);
  const fired: string[] = [];
  // continuações marcadas
  const keep: LeState['pend'] = [];
  for (const p of st.pend) {
    if (p.due <= now && defOf(p.ev)) { fire(s, p.ev, p.ctx); fired.push(p.ev); } else keep.push(p);
  }
  st.pend = keep;
  if (fired.length) return fired;
  if ((s.year - s.config.startYear) * 12 + s.month < 2) return fired;
  const r = Rng.fromSeed(`le10m:${s.config.seed}:${now}`);
  const e = envOf(s);
  let p = 0.5 + (e.stress > 65 ? 0.08 : 0) + (e.fame > 50 ? 0.05 : 0) - (e.traits.includes('shy') ? 0.06 : 0) + (e.traits.includes('bohemian') ? 0.05 : 0);
  p = clamp(p, 0.25, 0.7);
  const tries = r.chance(p) ? (r.chance(0.07) ? 2 : 1) : 0;
  for (let i = 0; i < tries; i++) {
    const pool = EVENTS.map((d) => ({ d, w: eligible(s, e, d, now) })).filter((x) => x.w > 0 && !fired.includes(x.d.id));
    while (pool.length) {
      const tot = pool.reduce((a, x) => a + x.w, 0);
      let t = r.next() * tot;
      let k = 0;
      for (; k < pool.length - 1; k++) { t -= pool[k].w; if (t <= 0) break; }
      const { d } = pool[k];
      pool.splice(k, 1);
      const ctx = d.pick ? d.pick(e, r) : {};
      if (!ctx) continue;
      fire(s, d.id, ctx);
      st.cd[d.id] = now;
      fired.push(d.id);
      break;
    }
  }
  return fired;
}

registerSimHook('month', 'life10', (s) => { rollLifeEvents(s); });
