// Rodada 19 (onda 5, C — auditoria 8 §2 e §8) — CONTEXTO NAS REGRAS E NAS DECISÕES.
// • Liga os ganchos de src/sim/ctx19.ts (temperamento da pessoa-chave do ato, ambições do artista) e registra os "por quê"
//   das regras que deixaram de ser fixas (diretor × dedicação, saturação de obras, credibilidade do crítico, festival
//   rival, crise de cliente, renovação de mandato, peso da comissão).
// • ctxFx19(s, ator): um modificador comum para as opções de CONFIANÇA e REPUTAÇÃO dos cartões (events.ts, events_more,
//   media19ev, decnew18…). Lê o histórico com o ator — mágoas abertas e favores (holds17), promessas quebradas nos últimos
//   24 meses, temperamento (persona13) e relação (agency18) — e escala a variação depois que a opção é aplicada
//   (CTXFX19.pre/post em resolveDecision). O cartão mostra a linha "Contexto" com o porquê (ui/sys/ctx19.ts).
// • Quem reage: os sorteios de ato dos eventos (pickMine/pick) preferem quem tem mágoa aberta ou promessa quebrada.
// • "Apoiar o artista" (controversial_remark) e "Ignorar" (stage_parent_feud) ganham desfechos próprios pelo histórico.
// Sem sorteio próprio.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { CTX19, WORK_KIND19, commW19, crisisP19, renewP19, rivalFest19, satur19 } from '../ctx19';
import { CTXFX19, registerDecisionListener, registerExt4 } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { allHolds, grantHold, holds17, type Hold } from '../holds17';
import type { Act, GameState } from '../types';
import { fmtL, remember } from '../util';
import { relOf18 } from './agency18';
import { careerDef } from './careers12';
import { careerQ, careerSize19 } from './agenda17';
import { f12, festOf } from './fest12';
import { ambitionsOf, c12 } from './manager12';
import { per13 } from './persona13';
import { pr18 } from './press18';
import { keyOf } from './ventures12';
import { ventures } from './ventures9';

// ---------------------------------------------------------------- ganchos da folha

const leadOf = (s: GameState, a: Act) => a.members.map((id) => s.persons[id]).find((p) => p?.alive);
CTX19.facet = (s, a, k) => { const p = leadOf(s, a); return p ? per13(s, `p:${p.id}`)?.facets[k as 'ego'] ?? 50 : 50; };
CTX19.amb = (s, id) => ambitionsOf(s, id);

// ---------------------------------------------------------------- estado (diário de ajustes, para o porquê)

export interface CtxLog19 { w: number; ev: string; opt: string; who: string; d0: number; d1: number }
export interface Ctx19State { log: CtxLog19[] }
declare module '../ext4' { interface Ext4 { ctx19: Ctx19State } }
registerExt4('ctx19', () => ({ log: [] }));
export const ctx19 = (s: GameState): Ctx19State => { const x = s.x4 as unknown as { ctx19?: Ctx19State }; return (x.ctx19 ??= { log: [] }); };

// ---------------------------------------------------------------- ctxFx: o histórico com o ator

export interface CtxFx19 { pid: string | null; name: string; gain: number; loss: number; parts: WhyPart[]; grudge: Hold[]; favor: Hold[]; broken: number }
const NEUTRAL = (name = ''): CtxFx19 => ({ pid: null, name, gain: 1, loss: 1, parts: [], grudge: [], favor: [], broken: 0 });
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Promessas quebradas com o ato nos últimos 24 meses (memória + mágoas de promessa). */
function brokenOf(s: GameState, actId: string | undefined, pid: string | null): number {
  let n = 0;
  if (actId) for (const m of s.memory) if (m.actId === actId && (m.kind === 'broken_promise' || m.kind === 'promise_broken') && s.week - m.week <= 104) n++;
  if (pid) n += holds17(s).h.filter((h) => h.status === 'open' && h.src === 'promise' && h.holder === pid && h.target === 'player' && s.week - h.w <= 104).length;
  return Math.min(4, n);
}

/** Modificador de contexto do ator: multiplica ganhos e perdas de confiança/reputação pelo histórico com você. */
export function ctxFx19(s: GameState, actor: { act?: string; person?: string }): CtxFx19 {
  const a = actor.act ? s.acts[actor.act] : undefined;
  const p = actor.person && s.persons[actor.person] ? s.persons[actor.person] : a ? leadOf(s, a) : undefined;
  if (!p || p.isPlayer) return NEUTRAL(a?.name);
  const pid = p.id, crew = new Set(a ? a.members : [pid]);
  let gain = 1, loss = 1;
  const parts: WhyPart[] = [];
  const holds = allHolds(s).filter((h) => h.status === 'open');
  const grudge = holds.filter((h) => h.kind === 'grievance' && h.target === 'player' && crew.has(h.holder));
  const favor = holds.filter((h) => h.holder === 'player' && crew.has(h.target) && (h.kind === 'favor' || h.kind === 'debt' || h.kind === 'loyalty'));
  const g = Math.min(1.5, grudge.reduce((t, h) => t + h.strength / 100, 0));
  if (g > 0) { loss *= 1 + 0.5 * g; gain *= 1 - 0.3 * Math.min(1, g); parts.push({ label: fmtL(l('Mágoa aberta: {t}', 'Open grievance: {t}'), { t: grudge[0].text }), value: r2(1 + 0.5 * g), fmt: 'mult', tone: 'bad', note: l('perdas maiores, ganhos menores', 'bigger losses, smaller gains') }); }
  const f = Math.min(1, favor.reduce((t, h) => t + h.strength / 100, 0));
  if (f > 0) { loss *= 1 - 0.25 * f; gain *= 1 + 0.1 * f; parts.push({ label: fmtL(l('Deve um favor a você: {t}', 'Owes you a favor: {t}'), { t: favor[0].text }), value: r2(1 - 0.25 * f), fmt: 'mult', tone: 'good', note: l('perdas amortecidas', 'losses cushioned') }); }
  const bp = brokenOf(s, a?.id, pid);
  if (bp) { gain *= Math.max(0.5, 1 - 0.15 * bp); loss *= 1 + 0.15 * bp; parts.push({ label: fmtL(l('{n} promessa(s) quebrada(s) nos últimos 24 meses', '{n} broken promise(s) in the last 24 months'), { n: bp }), value: r2(Math.max(0.5, 1 - 0.15 * bp)), fmt: 'mult', tone: 'bad', note: l('desconfia de gestos bonitos', 'distrusts nice gestures') }); }
  const P13 = per13(s, `p:${pid}`);
  if (P13) {
    const F = (k: string) => ((P13.facets[k as 'ego'] ?? 50) - 50) / 50;
    const loy = F('lealdade'), ego = (F('ego') + F('vaidade')) / 2, imp = F('impulsividade'), emp = F('empatia');
    const tl = (1 - 0.2 * loy) * (1 + 0.2 * ego) * (1 + 0.15 * imp), tg = (1 + 0.15 * emp) * (1 + 0.15 * imp);
    loss *= tl; gain *= tg;
    if (Math.abs(tl - 1) > 0.04 || Math.abs(tg - 1) > 0.04) parts.push({ label: l('Temperamento (lealdade, ego, impulsividade, empatia)', 'Temperament (loyalty, ego, impulsiveness, empathy)'), value: r2(tl), fmt: 'mult', tone: tl > 1 ? 'bad' : 'good', note: fmtL(l('perdas ×{a} · ganhos ×{b}', 'losses ×{a} · gains ×{b}'), { a: r2(tl), b: r2(tg) }) });
  }
  const rel = relOf18(s, `p:${pid}`, 'player');
  if (Math.abs(rel) >= 10) { gain *= 1 + rel / 400; loss *= 1 - rel / 400; parts.push({ label: fmtL(l('Relação com você: {r}', 'Relationship with you: {r}'), { r: Math.round(rel) }), value: r2(1 + rel / 400), fmt: 'mult', tone: rel > 0 ? 'good' : 'bad' }); }
  return { pid, name: a?.name ?? p.name, gain: clamp(gain, 0.4, 1.8), loss: clamp(loss, 0.5, 2), parts, grudge, favor, broken: bp };
}
/** O contexto pesa? (para mostrar a linha no cartão) */
export const ctxNotable19 = (x: CtxFx19): boolean => Math.abs(x.gain - 1) > 0.05 || Math.abs(x.loss - 1) > 0.05;

type Tok = { ev: string; opt: string; a?: Act; t0: number; rep0: Record<string, number>; fx: CtxFx19 };
const actorOf = (ctx: Record<string, string | number>) => ({ act: ctx.act !== undefined ? String(ctx.act) : undefined, person: ctx.person !== undefined ? String(ctx.person) : undefined });
CTXFX19.pre = (s, ev, opt, ctx) => {
  const who = actorOf(ctx);
  if (!who.act && !who.person) return null;
  const fx = ctxFx19(s, who);
  if (!ctxNotable19(fx)) return null;
  const a = who.act ? s.acts[who.act] : undefined;
  return { ev, opt, a, t0: a?.trust ?? 0, rep0: { ...s.player.reputation }, fx } as Tok;
};
CTXFX19.post = (s, tok) => {
  const k = tok as Tok;
  const sc = (d: number, half = false) => { const m = d > 0 ? k.fx.gain : k.fx.loss; return d * (half ? 1 + (m - 1) * 0.5 : m); };
  if (k.a) {
    const d0 = k.a.trust - k.t0;
    if (d0) {
      const d1 = sc(d0);
      k.a.trust = clamp(k.t0 + d1, 0, 100);
      const L0 = ctx19(s).log;
      L0.unshift({ w: s.week, ev: k.ev, opt: k.opt, who: k.fx.name, d0: Math.round(d0 * 10) / 10, d1: Math.round(d1 * 10) / 10 });
      if (L0.length > 20) L0.length = 20;
    }
  }
  const R = s.player.reputation as unknown as Record<string, number>;
  for (const key of Object.keys(k.rep0)) { const d = R[key] - k.rep0[key]; if (d) R[key] = clamp(k.rep0[key] + sc(d, true), 0, 100); }
};

// quem reage primeiro: peso por mágoa aberta / promessa quebrada (cache semanal; leitura barata no find dos eventos)
const PW = new WeakMap<GameState, { w: number; m: Map<string, number> }>();
CTXFX19.pickW = (s, a) => {
  let c = PW.get(s);
  if (!c || c.w !== s.week) {
    const m = new Map<string, number>();
    const byPerson = new Map<string, number>();
    for (const h of holds17(s).h) if (h.status === 'open' && h.kind === 'grievance' && h.target === 'player') byPerson.set(h.holder, (byPerson.get(h.holder) ?? 0) + h.strength / 100);
    const bp = new Map<string, number>();
    for (const x of s.memory) if (x.actId && (x.kind === 'broken_promise' || x.kind === 'promise_broken') && s.week - x.week <= 104) bp.set(x.actId, (bp.get(x.actId) ?? 0) + 1);
    if (byPerson.size || bp.size) for (const act of Object.values(s.acts)) {
      if (act.owner !== 'player' && !act.playerBand) continue;
      const g = act.members.reduce((t, id) => t + (byPerson.get(id) ?? 0), 0);
      const w = 1 + 1.5 * Math.min(1, g) + 0.5 * Math.min(2, bp.get(act.id) ?? 0);
      if (w > 1) m.set(act.id, w);
    }
    c = { w: s.week, m };
    PW.set(s, c);
  }
  return c.m.get(a.id) ?? 1;
};

// ---------------------------------------------------------------- desfechos próprios (histórico decide)

registerDecisionListener('ctx19', (s, ev, opt, ctx) => {
  if (!ctx) return;
  if (ev === 'controversial_remark' && opt === 'support') {
    const a = s.acts[String(ctx.act)]; if (!a) return;
    const fx = ctxFx19(s, { act: a.id });
    const own = holds17(s).h.filter((h) => h.status === 'open' && h.kind === 'grievance' && h.target === 'player' && a.members.includes(h.holder));
    if (own.length) {
      // apoiar em público quem guardava mágoa remenda a relação
      for (const h of own) { h.strength = Math.max(0, h.strength - 25); if (h.strength < 20) h.status = 'forgiven'; }
      a.trust = clamp(a.trust + 4, 0, 100);
      remember(s, 'ctx19', fmtL(l('{a} não esperava o seu apoio na polêmica: a mágoa antiga amolece (+4).', '{a} did not expect your support in the controversy: the old grievance softens (+4).'), { a: a.name }), { actId: a.id });
    } else if (fx.broken) {
      remember(s, 'ctx19', fmtL(l('{a} desconfia do apoio: depois das promessas quebradas, parece cálculo.', '{a} distrusts the support: after the broken promises, it looks calculated.'), { a: a.name }), { actId: a.id });
    } else if (fx.pid && (per13(s, `p:${fx.pid}`)?.facets.lealdade ?? 50) >= 60) {
      grantHold(s, { holder: 'player', target: fx.pid, kind: 'favor', strength: 35, months: 36, src: 'ctx19', text: fmtL(l('Você ficou do lado de {a} na polêmica', 'You stood by {a} in the controversy'), { a: a.name }) });
    }
  }
  if (ev === 'stage_parent_feud' && opt === 'ignore') {
    const a = s.acts[String(ctx.act)], pid = String(ctx.person ?? '');
    if (!a || !s.persons[pid]) return;
    const grudge = holds17(s).h.find((h) => h.status === 'open' && h.kind === 'grievance' && h.target === 'player' && h.holder === pid);
    const fav = holds17(s).h.find((h) => h.status === 'open' && h.holder === 'player' && h.target === pid && (h.kind === 'favor' || h.kind === 'loyalty'));
    if (grudge) { grudge.strength = Math.min(100, grudge.strength + 15); remember(s, 'ctx19', fmtL(l('{p} lê o seu silêncio como a confirmação do que a mãe dizia: a mágoa cresce.', '{p} reads your silence as proof of what the mother said: the grievance grows.'), { p: s.persons[pid].name }), { actId: a.id }); }
    else if (fav) { s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100); remember(s, 'ctx19', fmtL(l('{p} lembra do que você fez antes e fica do seu lado: o ataque esvazia (+2 de reputação com artistas).', '{p} remembers what you did before and sides with you: the attack fizzles (+2 reputation with artists).'), { p: s.persons[pid].name }), { actId: a.id }); }
    else if (relOf18(s, `p:${pid}`, 'player') < -20) grantHold(s, { holder: pid, target: 'player', kind: 'grievance', strength: 30, months: 24, src: 'ctx19', text: fmtL(l('{p}: você ignorou a briga com a família', '{p}: you ignored the family fight'), { p: s.persons[pid].name }) });
  }
});

// ---------------------------------------------------------------- por quês

const QK: Record<string, L> = { energy: l('Sua energia (dedicação)', 'Your energy (dedication)'), others: l('Outras frentes que você toca', 'Other fronts you run'), size: l('Porte do negócio', 'Size of the business'), skill: l('Habilidade do diretor', 'Director skill'), load: l('Diretores demais para supervisionar', 'Too many directors to supervise'), over: l('Agenda estourada', 'Overbooked') };
registerExplain('agenda.careerQ', (s, c) => {
  const id = String(c.id ?? ''), q = careerQ(s, id);
  return { title: fmtL(l('Resultado: {c}', 'Result: {c}'), { c: careerDef(id)?.name ?? l(id, id) }), value: Math.round((q.f - 1) * 100), fmt: 'signed',
    parts: q.parts.map((p) => ({ label: QK[p.k] ?? l(p.k, p.k), value: Math.round(p.v * 1000) / 10, fmt: 'signed' as const, tone: p.v > 0 ? 'good' as const : p.v < 0 ? 'bad' as const : '' as const })),
    note: fmtL(l('Porte atual: {z}. À frente: +2% a +18%; diretor: −25% a +15% (o excelente ganha de você num negócio grande ou quando você toca muitas frentes).', 'Current size: {z}. Hands-on: +2% to +18%; director: −25% to +15% (an excellent one beats you in a big business or when you run many fronts).'), { z: Math.round(careerSize19(s, id) * 10) / 10 }) };
});
registerExplain('ctx19.satur', (s, c) => {
  const v = ventures(s).list.find((x) => x.id === c.v), w = v?.cat?.find((x) => keyOf(x) === c.k);
  if (!v || !w) return null;
  const x = satur19(s.year, v.cat!, w, 'cover', w.x ?? {});
  return { title: l('Próxima vida da obra', 'The work\'s next life'), value: x.v, fmt: 'mult', parts: x.parts,
    note: fmtL(l('Tipo: {k} (teto {c} vidas). Cada 3 anos sem uso esfria uma vida; 8+ anos parada, redescoberta.', 'Type: {k} (cap {c} lives). Every 3 years unused cools one life; 8+ years idle, rediscovery.'), { k: WORK_KIND19[x.wk].name, c: x.cap }) };
});
registerExplain('ctx19.cred', (s) => {
  const st = pr18(s), done = st.revs.filter((r) => r.vd !== undefined && r.vd >= 0).slice(-6).reverse();
  return { title: l('Credibilidade julgada pela história', 'Credibility judged by history'), value: Math.round(st.cred), fmt: 'num',
    parts: done.map((r) => ({ label: fmtL(l('"{t}": você {n}, história {v}', '"{t}": you {n}, history {v}'), { t: s.releases[r.rel]?.title ?? '?', n: r.sc, v: r.vd ?? 0 }), value: Math.round((r.cd ?? 0) * 10) / 10, fmt: 'signed' as const, tone: (r.cd ?? 0) > 0 ? 'good' as const : 'bad' as const })),
    note: l('O veredito sai ~10 meses depois: crítica agregada (50%), paradas e vendas (35%), certificados e prêmios. Quem acertou antes do consenso do momento ganha +2.', 'The verdict lands ~10 months later: aggregate critics (50%), charts and sales (35%), certifications and awards. Calling it before the consensus of the moment earns +2.') };
});
registerExplain('ctx19.rival', (s, c) => {
  const f = festOf(s, String(c.fid ?? '')); if (!f) return null;
  const x = f12(s, f), rv = rivalFest19(s, ventures(s).npc, { city: f.cityId, month: f.month, fam: x.fam, ident: x.ident, rep: f.rep });
  return { title: l('Festivais rivais', 'Rival festivals'), value: rv.v, fmt: 'mult', parts: rv.parts, note: l('Cada rival tira até 12% × distância × mês × gênero × porte; o total nunca passa de 40%.', 'Each rival takes up to 12% × distance × month × genre × size; the total never exceeds 40%.') };
});
registerExplain('ctx19.crisis', (s, c) => { const a = s.acts[String(c.act ?? '')]; if (!a) return null; const x = crisisP19(s, a); return { title: l('Chance de crise por mês', 'Monthly crisis chance'), value: x.v, fmt: 'pct', parts: x.parts }; });
registerExplain('ctx19.renew', (s, c) => {
  const a = s.acts[String(c.act ?? '')]; if (!a) return null;
  const x = c12(s, a.id), p = renewP19(s, a, { trust: x.trust, pressured: x.pressured, broken: x.promises.filter((q) => q.kept === false).length, fame0: x.fame0, since: x.since });
  const m = commW19(s, a);
  return { title: l('Chance de renovar o mandato', 'Mandate renewal chance'), value: p.v, fmt: 'pct', parts: [...p.parts, ...m.parts.map((q) => ({ ...q, note: l('peso da comissão na hora de fechar', 'weight of the commission when closing') }))] };
});
registerExplain('ctx19.ctxfx', (s, c) => {
  const x = ctxFx19(s, { act: c.act !== undefined ? String(c.act) : undefined, person: c.person !== undefined ? String(c.person) : undefined });
  return { title: fmtL(l('Contexto com {n}', 'Context with {n}'), { n: x.name }), value: x.loss, fmt: 'mult', parts: x.parts,
    note: fmtL(l('Variações de confiança desta escolha: ganhos ×{g}, perdas ×{p}. Reputação sente metade do efeito.', 'Trust changes from this choice: gains ×{g}, losses ×{p}. Reputation feels half the effect.'), { g: r2(x.gain), p: r2(x.loss) }) };
});
