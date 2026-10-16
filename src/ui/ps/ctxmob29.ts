// Rodada 29 (Submundo) — itens do menu de ações (clique direito) para as famílias: ligações com o crime (fonte única
// orglinks29), interações com a organização e "Contratar {família} para… ›" (submenu de serviços). Modelo puro: cada
// item liga às MESMAS funções do card da organização e do planejador do Submundo (sim/sys/mob29: doMob29, hire29,
// fulfill29/refuse29; r29c sim/sys/aff29npc: denounce29n, rescue29n) — ps/ctx27.ts só despacha. Módulo à parte para não mexer no miolo de ctx27model.

import { l, type L } from '../../data/world';
import { a3Of, crimeById, orgs17, placeOf, targetBlock17, targetId17, usd } from '../../sim/sys/crime17';
import { JOBS29, asks29, askDef29, delayCost29, hireOdds29, jobTk29, jobsFor29, meter29, mobActs29, present29 } from '../../sim/sys/mob29';
import { LINK29, linksOfKey29 } from '../../sim/sys/orglinks29';
import { actLog29n, denounceBlock29n, denounceOdds29n, rescueBlock29n, rescueCost29n } from '../../sim/sys/aff29npc'; // r29c
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import type { CtxEnv27, CtxItem27, CtxMenu27 } from './ctx27model';

const N = (pt: string, en: string): L => l(pt, en);
const it = (id: string, label: L, icon: string, grp: CtxItem27['grp'], block: L | null = null, extra: Partial<CtxItem27> = {}): CtxItem27 => ({ id, label, icon, grp, block, sec: 'dark', ...extra });
const NO_CRIME = N('O Submundo não está aberto nesta partida.', 'The Underworld is not open in this run.');

/** "Ligação com {família}: {tipo}" — o mesmo que o card da organização mostra (orglinks29). */
export function mobLinkItems29(s: GameState, key: string): CtxItem27[] {
  let xs: ReturnType<typeof linksOfKey29> = [];
  try { xs = linksOfKey29(s, key); } catch { xs = []; }
  const seen = new Set<string>();
  const out: CtxItem27[] = [];
  for (const x of xs) {
    if (seen.has(x.o)) continue;
    seen.add(x.o);
    const o = orgs17(s, true).find((y) => y.id === x.o);
    if (!o) continue;
    out.push(it(`org29:${o.id}`, fmtL(N('{o}: {k} ›', '{o}: {k} ›'), { o: o.name, k: LINK29[x.kind] }), 'skull', 'open', null, { note: x.text }));
  }
  return out.slice(0, 4);
}

/** r29c (aff29npc): ato do mundo abordado por uma facção — "Denunciar a ligação" e "Tirar do esquema". As mesmas
 *  funções do card da organização (sim/sys/aff29npc: denounce29n, rescue29n); só aparecem se houve abordagem. */
export function mobAffItems29(s: GameState, actId: string, env: CtxEnv27 = {}): CtxItem27[] {
  if (env.has?.('area:crime') === false || !actLog29n(s, actId).length || playerActs(s).includes(actId)) return [];
  const e = actLog29n(s, actId)[0];
  const o = orgs17(s, true).find((y) => y.id === e.o);
  const name = o?.name ?? l(e.o, e.o);
  const db = denounceBlock29n(s, actId), rb = rescueBlock29n(s, actId);
  return [
    it('mob.affden', fmtL(N('Denunciar a ligação com {o}', 'Report the tie to {o}'), { o: name }), 'newspaper', 'do', db,
      { chance: db ? undefined : denounceOdds29n(s, actId), note: N('Imprensa e polícia: escândalo para o artista e caso contra a facção. Pode não colar — e eles sabem de onde veio.', 'Press and police: a scandal for the act and a case against the faction. It may not stick — and they know where it came from.') }),
    it('mob.afffree', fmtL(N('Tirar do esquema de {o} (oferecer proteção)', 'Get them out of {o}\'s scheme (offer protection)'), { o: name }), 'shield', 'do', rb,
      { cost: rb ? undefined : rescueCost29n(s, actId), note: N('Você paga o acerto à facção; o artista sai do laço, confia em você e fica devendo um favor (proposta e buyout ficam mais fáceis).', 'You pay the faction off; the act leaves the tie, trusts you and owes you a favor (offer and buyout get easier).') }),
  ];
}

/** Tipo de alvo dos serviços que cabem nesta entidade. */
function tksFor(s: GameState, target: string): string[] {
  const id = targetId17(s, target);
  if (s.acts[id]) return playerActs(s).includes(id) ? ['own_act', 'any_act'] : ['act', 'any_act'];
  if (s.labels[id]) return ['label'];
  return ['person'];
}

/** Famílias que dá para contratar contra este alvo (na área dele), as melhores primeiro (até 3). */
export function mobHireItems29(s: GameState, target: string, env: CtxEnv27 = {}): CtxItem27[] {
  if (env.has?.('area:crime') === false) return [];
  let a3 = '';
  try { a3 = a3Of(s, placeOf(s, targetId17(s, target))); } catch { return []; }
  const tks = tksFor(s, target);
  if (!JOBS29.some((j) => tks.includes(jobTk29(j.id)))) return [];
  const os = orgs17(s, false, true).filter((o) => present29(o, a3, s) && jobsFor29(o).some((j) => tks.includes(jobTk29(j.id))));
  const scored = os.map((o) => {
    const jobs = jobsFor29(o).filter((j) => tks.includes(jobTk29(j.id)));
    const odds = jobs.map((j) => hireOdds29(s, o.id, j.id, target));
    const ok = odds.filter((x) => !x.block);
    return { o, ok: ok.length, best: Math.max(0, ...ok.map((x) => x.p)), why: odds.find((x) => x.block)?.block ?? null, m: meter29(s, o.id) };
  }).sort((x, y) => y.ok - x.ok || y.m.respect - x.m.respect || y.o.power - x.o.power).slice(0, 3);
  // r29: ação direta do Submundo contra/por um ato — manipular a votação de um prêmio (planejador com o ato escolhido)
  const direct: CtxItem27[] = s.acts[targetId17(s, target)] ? [it('crime.plan:award_rig', N('Manipular a votação de um prêmio…', 'Rig an award vote…'), 'trophy', 'do', targetBlock17(s, crimeById('award_rig')!, target),
    { note: N('Jurado, lobby, urnas ou robôs (pela época); escolha o prêmio no Submundo › Planos. Descoberto: prêmio cassado.', 'Jury, lobby, ballots or bots (by era); pick the award in Underworld › Plans. If caught: award revoked.') })] : [];
  return [...direct, ...scored.map((x) => it(`mob.hire:${x.o.id}`, fmtL(N('Contratar {o} para… ›', 'Hire {o} to… ›'), { o: x.o.name }), 'skull', 'do', x.ok ? null : x.why,
    { chance: x.ok ? x.best : undefined, note: N('A família executa: mais chance, menos calor para você, uma taxa — e você fica devendo um favor.', 'The family does it: better odds, less heat on you, a fee — and you owe them a favor.') }))];
}

/** Interações com a organização (card e menu) + "Contratar ›" + pedidos pendentes. */
export function mobOrgItems29(s: GameState, oid: string, env: CtxEnv27 = {}): CtxItem27[] {
  if (env.has?.('area:crime') === false) return [it('mob.none', N('Famílias', 'Families'), 'skull', 'do', NO_CRIME)];
  const out: CtxItem27[] = [];
  for (const a of asks29(s, oid)) {
    const d = askDef29(a.k);
    out.push(it(`mob.ask:${a.id}`, fmtL(N('Atender: {n}', 'Agree: {n}'), { n: d.name }), 'handshake', 'do', null, { note: d.fx }));
    if (!a.delay && a.k !== 'job') { const o = orgs17(s, true).find((y) => y.id === oid); out.push(it(`mob.delay:${a.id}`, fmtL(N('Negociar prazo: {n}', 'Negotiate the deadline: {n}'), { n: d.name }), 'clock', 'do', null, { cost: o ? delayCost29(s, o) : undefined, note: N('+4 semanas, uma vez; respeito −2.', '+4 weeks, once; respect −2.') })); }
    out.push(it(`mob.refuse:${a.id}`, fmtL(N('Recusar: {n}', 'Refuse: {n}'), { n: d.name }), 'warning', 'do', null, { note: a.k === 'job' ? N('Sem consequência (por ora).', 'No consequence (for now).') : N('A dívida continua e a família escala (ameaça → sabotagem → violência).', 'The debt stands and the family escalates (threat → sabotage → violence).') }));
  }
  out.push(it(`mob.hire:${oid}`, N('Contratar a família para… ›', 'Hire the family to… ›'), 'skull', 'do', null, { note: N('Escolha o serviço; o alvo se escolhe no Submundo › Planos.', 'Pick the job; the target is picked in Underworld › Plans.') }));
  for (const x of mobActs29(s, oid)) {
    if (x.a.id === 'approach' || x.a.id === 'launder' || x.a.id === 'inform') continue; // o menu já tem (org.approach, org.launder, org.report)
    out.push(it(`mob.do:${x.a.id}`, x.a.name, x.a.icon, 'do', x.block, { cost: x.cost || undefined, chance: x.chance, note: x.a.fx }));
  }
  return out;
}

/** Submenu "Contratar {família} para…": id 'hire29:<org>|<alvo>' (alvo vazio = escolher no planejador). */
export function hireMenu29(s: GameState, menuId: string): CtxMenu27 | null {
  const [oid, target = ''] = menuId.slice(7).split('|');
  const o = orgs17(s, true).find((x) => x.id === oid);
  if (!o) return null;
  const tks = target ? tksFor(s, target) : null;
  const items = jobsFor29(o).filter((j) => !tks || tks.includes(jobTk29(j.id))).map((j) => {
    if (!target) return it(`mob.plan:${j.id}`, fmtL(N('{j}…', '{j}…'), { j: j.name }), j.icon, 'do', null, { note: N('Abre Submundo › Planos com a família como executora (escolha o alvo).', 'Opens Underworld › Plans with the family as the executor (pick the target).') });
    const od = hireOdds29(s, oid, j.id, target);
    return it(`mob.job:${j.id}`, j.name, j.icon, 'do', od.block, {
      cost: od.block ? undefined : od.cost, chance: od.block ? undefined : od.p,
      note: od.block ? crimeById(j.c)?.desc ?? null : fmtL(N('Taxa {f} · calor para você +{h} · favor devido {v}/100', 'Fee {f} · heat on you +{h} · favor owed {v}/100'), { f: usd(od.fee), h: od.heatYou, v: od.favor }),
    });
  });
  return { ent: 'org', id: menuId, name: fmtL(N('Contratar {o}', 'Hire {o}'), { o: o.name }), kind: N('Família', 'Family'), items };
}
