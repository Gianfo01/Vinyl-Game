// Rodada 18 (core18) — APIs da onda 0: explain18 (por quês encadeados), inbox 2.0 + conselheiro v2,
// menu de ações por pessoa (com crime17 ligado), dinâmica (banda, elenco, equipe) e categorias do popup.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { explain18, explainKeys, registerExplain } from '../src/sim/explain18';
import { facts17 } from '../src/sim/facts17';
import { advisorTips18, archive18, pushInbox18, registerAdvisorTip, registerInboxKind } from '../src/sim/inbox18';
import { doPersonAction18, pa18, personActions18, registerPersonAction } from '../src/sim/personact18';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { answerMsg } from '../src/sim/sys/people/inbox';
import { items18 } from '../src/sim/sys/inbox18';
import { dynBand, dynRoster, dynStaff } from '../src/sim/sys/dyn18';
import { opinionOf } from '../src/sim/sys/persona13';
import { CATS17, catOf17, groupTabs17 } from '../src/ui/popcat17';
import type { Act, GameState } from '../src/sim/types';
import '../src/sim/sys';

const npcAct = (s: GameState): Act => Object.values(s.acts).filter((a) => a.owner !== 'player' && !a.playerBand && a.status !== 'retired' && a.status !== 'split' && a.members.length >= 2).sort((a, b) => b.fame - a.fame)[0];

describe('r18 core', () => {
  it('explain18: chaves principais explicam com partes e níveis encadeados', () => {
    const s = createGame(defaultConfig('r18-core-1'));
    advanceMonth(s);
    advanceMonth(s);
    for (const k of ['cash.month', 'act.hype', 'act.fame', 'fame.region', 'offer.chance', 'chart.pos', 'stress', 'show.demand', 'balls', 'opinion']) expect(explainKeys()).toContain(k);
    const cash = explain18(s, 'cash.month')!;
    expect(cash.parts.length).toBeGreaterThan(0);
    const sub = cash.parts.find((p) => p.why)!;
    expect(explain18(s, sub.why!.key, sub.why!.ctx)).not.toBeNull();
    const a = npcAct(s);
    const fame = explain18(s, 'act.fame', { act: a.id })!;
    const reg = fame.parts[0].why!;
    expect(explain18(s, reg.key, reg.ctx)!.parts.length).toBeGreaterThan(0);
    const off = explain18(s, 'offer.chance', { act: a.id })!;
    expect(off.parts.length).toBeGreaterThan(3);
    expect(explain18(s, 'stress', { person: a.members[0] })!.parts.length).toBeGreaterThan(0);
    expect(explain18(s, 'show.demand', { act: a.id, city: a.city })).not.toBeNull();
    const e = s.charts.singles[0];
    if (e) expect(explain18(s, 'chart.pos', { rel: e.releaseId, kind: 'singles' })!.value).toBe(`#${e.pos}`);
    registerExplain('test.x', () => { throw new Error('x'); });
    expect(explain18(s, 'test.x')).toBeNull();
  });

  it('inbox 2.0: tipos registrados, resposta pelo tratador, categoria/prioridade e arquivo', () => {
    const s = createGame(defaultConfig('r18-core-2'));
    let got = '';
    registerInboxKind('t18', { label: l('Teste', 'Test'), cat: 'deals', prio: 1, goto: () => ({ area: 'market' }), handle: (s0, m, act) => { got = act; return l('ok', 'ok'); } });
    const m = pushInbox18(s, 't18', { from: 'X', subject: l('S', 'S'), body: l('B', 'B'), actions: [{ id: 'yes', label: l('Sim', 'Yes') }, { id: 'no', label: l('Não', 'No') }] });
    const it = items18(s).find((x) => x.msg?.id === m.id)!;
    expect(it.cat).toBe('deals');
    expect(it.prio).toBe(2);
    expect(it.goto?.area).toBe('market');
    answerMsg(s, m.id, 'yes');
    expect(got).toBe('yes');
    archive18(s, it.key);
    expect(items18(s).some((x) => x.key === it.key)).toBe(false);
    expect(items18(s, { archived: true }).some((x) => x.key === it.key)).toBe(true);
  });

  it('conselheiro v2: dicas registradas com porquê; runway e relatório mensal do analista', () => {
    const s = createGame(defaultConfig('r18-core-3'));
    registerAdvisorTip('t18', () => [{ id: 't18a', level: 'info', text: l('a', 'a'), why: [l('b', 'b')], score: 999 }]);
    expect(advisorTips18(s)[0].id).toBe('t18a');
    s.lastMonthLedger = { salaries: -s.player.cash / 2 };
    expect(advisorTips18(s).some((x) => x.id === 'c18-runway')).toBe(true);
    for (let i = 0; i < 4; i++) advanceMonth(s);
    const P = (s.x4 as unknown as { people: { inbox: { ref?: Record<string, unknown> }[] } }).people;
    expect(P.inbox.some((x) => x.ref?.k18 === 'analyst')).toBe(true);
  });

  it('ações por pessoa: menu com chance e porquê, custo, cooldown, fatos e crime17 ligado', () => {
    const s = createGame(defaultConfig('r18-core-4'));
    const a = npcAct(s);
    const key = `p:${a.members[0]}`;
    const rows = personActions18(s, key);
    const ids = rows.map((r) => r.def.id);
    for (const id of ['call', 'lunch', 'gift', 'advice', 'favor', 'job', 'invite', 'praise', 'criticize', 'rumor', 'flirt', 'detective', 'threaten', 'bribe', 'crime:assault', 'crime:blackmail']) expect(ids).toContain(id);
    expect(rows.find((r) => r.def.id === 'lunch')!.chance!.why.length).toBeGreaterThan(1);
    const op0 = opinionOf(s, key);
    const n0 = facts17(s).f.length;
    const o = doPersonAction18(s, 'praise', key);
    expect(o.ok).toBe(true);
    expect(opinionOf(s, key)).toBeGreaterThan(op0);
    expect(facts17(s).f.length).toBeGreaterThan(n0);
    doPersonAction18(s, 'call', key);
    expect(doPersonAction18(s, 'call', key).ok).toBe(false); // cooldown
    expect(pa18(s).log.length).toBeGreaterThanOrEqual(2);
    // líder de selo e crítico também têm menu
    const lid = Object.keys((s.x4 as unknown as { leaders10: { L: Record<string, unknown> } }).leaders10.L)[0];
    if (lid) expect(personActions18(s, `l:${lid}`).length).toBeGreaterThan(5);
    registerPersonAction({ id: 't18', label: l('T', 'T'), group: 'social', run: () => ({ ok: true, text: l('t', 't') }) });
    expect(doPersonAction18(s, 't18', key).ok).toBe(true);
  });

  it('dinâmica: banda, elenco e equipe com hierarquia e notas', () => {
    const s = createGame(defaultConfig('r18-core-5'));
    const a = npcAct(s);
    const d = dynBand(s, a);
    expect(d.nodes.length).toBe(a.members.filter((m) => s.persons[m]?.alive).length);
    expect(d.nodes[0].tier).toBe(0);
    expect(d.spokes).toBeTruthy();
    expect(Array.isArray(dynRoster(s).nodes)).toBe(true);
    expect(Array.isArray(dynStaff(s).nodes)).toBe(true);
  });

  it('popup: Integrantes é categoria própria; nenhuma aba some', () => {
    expect(CATS17.some((c) => c.id === 'members')).toBe(true);
    expect(catOf17('members')).toBe('members');
    expect(catOf17('lineup16')).toBe('members');
    expect(catOf17('disco')).toBe('music');
    const tabs = ['overview', 'members', 'disco', 'songs', 'history', 'contract', 'facts17', 'qualquer'].map((id) => ({ id }));
    expect(groupTabs17(tabs).flatMap((g) => g.items).length).toBe(tabs.length);
    expect(CATS17.at(-1)!.id).toBe('more');
  });
});
