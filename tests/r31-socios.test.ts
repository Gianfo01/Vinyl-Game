// R31 · onda 3 (SOC) — sócios e compras (src/sim/sys/socio31.ts): comprar parte ou tudo de festival/casa/rádio/estúdio
// existente pelo modelo de valor da bolsa, voto pela participação, dividendos que somam exatamente o resultado, saída,
// sócio NPC que age, criar em conjunto com acordo renegociável, determinismo e "explorar não muda o mundo".
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { opinionOf, setOpinion } from '../src/sim/opinion';
import { rngSnapshot19, STREAMS19 } from '../src/sim/rng19';
import { setSw } from '../src/sim/r31/switches';
import { companyValue31, dealPremium31 } from '../src/sim/r31/value31';
import { resultsReport31, results31Balance } from '../src/sim/r31/results31';
import { purse31, purseSet } from '../src/sim/r31/purse31';
import { pendingList } from '../src/sim/r31/pending';
import { runEdit, setEditorOn } from '../src/sim/r31/editor';
import { buyVenue17 } from '../src/sim/sys/venues17';
import {
  accept31, answer31, buy31, buyLock31, bizValue31, createJoint31, holdings31, jvAccept31, propose31, quote31, renegotiate31, sell31, sellLock31,
  socio31, socMonth31, split31, SW_SOC31, targets31, TOTAL31, voteLock31, type Target31,
} from '../src/sim/sys/socio31';
import type { GameState } from '../src/sim/types';

const game = (seed = 'r31-soc', y = 1990): GameState => {
  const s = createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));
  s.player.cash = 5e9;
  return s;
};
/** Um alvo comum (não lendário) do tipo pedido, com o dono simpático a você. */
function pick(s: GameState, kind: Target31['kind'] = 'venue'): Target31 {
  const t = targets31(s).find((x) => x.kind === kind && !x.legend && !x.never)!;
  expect(t).toBeTruthy();
  setOpinion(s, t.owner.k, 60);
  return t;
}

describe('r31 SOC · sócios e compras', () => {
  it('interruptor ligado, chave de sorteio registrada, alvos dos quatro tipos', () => {
    const s = game();
    expect(STREAMS19.socio31?.length ?? 0).toBeGreaterThan(10);
    const kinds = new Set(targets31(s).map((t) => t.kind));
    for (const k of ['fest', 'venue', 'studio'] as const) expect(kinds.has(k)).toBe(true);
    for (const t of targets31(s)) {
      const v = bizValue31(s, t.id)!;
      expect(v.parts.reduce((a, p) => a + p.v, 0)).toBe(v.total); // partes somam o total (mesmo modelo da bolsa)
      expect(v.total).toBeGreaterThan(0);
    }
  });

  it('compra parcial e total: preço pelo valor com o prêmio de controle; dinheiro sai do selo e entra nos resultados por projeto', () => {
    const s = game();
    const t = pick(s);
    const v = bizValue31(s, t.id)!.total;
    expect(quote31(s, t.id, 2000)).toBe(Math.round(v * 0.2 * dealPremium31(0.2)));
    const cash0 = s.player.cash;
    const q = quote31(s, t.id, 3000);
    expect(buy31(s, t.id, 3000, 'label')).toBeNull();
    expect(s.player.cash).toBe(cash0 - q);
    const b = socio31(s).b[t.id];
    expect(b.me).toBe(3000);
    expect(b.me + b.p.reduce((a, p) => a + p.sh, 0)).toBe(TOTAL31);
    // resto, até 100%
    const rest = TOTAL31 - b.me;
    expect(buy31(s, t.id, rest, 'label')).toBeNull();
    expect(socio31(s).b[t.id].me).toBe(TOTAL31);
    expect(socio31(s).b[t.id].p.length).toBe(0);
    // o alvo sai da lista do mercado; a casa real não pode ser comprada de novo por venues17
    expect(targets31(s).some((x) => x.id === t.id)).toBe(false);
    expect(buyVenue17(s, t.id.slice(3))).not.toBeNull();
    // participação entra no valor da empresa
    expect(companyValue31(s, 'player').parts.some((p) => p.k === 'stakes' && p.v > 0)).toBe(true);
    // o mês fecha e o resultado entra no projeto soc:<id>
    advanceMonth(s);
    const row = resultsReport31(s, 'project').rows.find((r) => r.id === `soc:${t.id}`);
    expect(row).toBeTruthy();
    expect(row!.name).toBe(t.name);
    expect(results31Balance(s)).toEqual([]);
  });

  it('lendário só vende parte; quem não gosta de você não vende; motivo antes do clique', () => {
    const s = game();
    const leg = targets31(s).find((x) => x.legend && !x.never);
    if (leg) {
      setOpinion(s, leg.owner.k, 100);
      expect(accept31(s, leg.id, leg.owner, 6000, 0, leg).ok).toBe(false);
      expect(buyLock31(s, leg.id, 6000, 'label')).not.toBeNull();
    }
    const t = targets31(s).find((x) => !x.legend && x.owner.pk === 'indep')!;
    setOpinion(s, t.owner.k, -100);
    const lk = buyLock31(s, t.id, 1000, 'label');
    expect(lk).not.toBeNull();
    expect(buy31(s, t.id, 1000, 'label')).not.toBeNull();
    expect(socio31(s).b[t.id]).toBeUndefined();
    setSw(s, SW_SOC31, false);
    setOpinion(s, t.owner.k, 80);
    expect(buyLock31(s, t.id, 1000, 'label')?.why.pt).toMatch(/desligado/);
  });

  it('dividendos somam certo: a divisão fecha no centavo, a sua parte vai para o bolso certo', () => {
    for (const [res, parts] of [[1001, [3333, 3333, 3334]], [-777, [5000, 2500, 2500]], [123457, [100, 9900]]] as [number, number[]][]) {
      const out = split31(res, parts.map((sh, i) => ({ k: `p${i}`, sh })));
      expect(Object.values(out).reduce((a, b) => a + b, 0)).toBe(res);
    }
    const s = game();
    const t = pick(s, 'studio');
    purseSet(s, 5e9, 'edit', 'test');
    const tot0 = JSON.stringify(purse31(s).tot.dividend ?? null) + JSON.stringify(purse31(s).tot.business ?? null);
    expect(buy31(s, t.id, 4000, 'personal')).toBeNull();
    for (let i = 0; i < 6; i++) advanceMonth(s);
    const b = socio31(s).b[t.id];
    expect(b.months.length).toBeGreaterThanOrEqual(5);
    for (const m of b.months) {
      const parts = split31(m.res, [{ k: 'me', sh: b.me }, ...b.p.map((p) => ({ k: p.k, sh: p.sh }))]);
      expect(m.mine).toBe(parts.me);
      expect(m.res).toBe(m.rev - m.cost);
    }
    expect(b.got).toBe(b.months.reduce((a, m) => a + m.mine, 0));
    // pessoal: entrou no extrato pessoal (dividendos ou prejuízo de negócio)
    expect(tot0).toBe('nullnull');
    const tot = purse31(s).tot;
    expect((tot.dividend?.i ?? 0) + (tot.business?.o ?? 0)).toBe(b.months.filter((m) => m.mine > 0).reduce((a, m) => a + m.mine, 0) + b.months.filter((m) => m.mine < 0).reduce((a, m) => a + m.mine, 0));
  });

  it('voto pela participação: maioria decide; minoria perde; acordo pode dar a decisão a você; discordar pesa na relação', () => {
    const s = game();
    const t = pick(s, 'fest');
    expect(buy31(s, t.id, 2000, 'label')).toBeNull();
    const b = socio31(s).b[t.id];
    const p = b.p[0];
    const ten0 = b.ten;
    // com 20%, só passa se o sócio concordar
    const r = propose31(s, t.id, 'price', b.set.price === 2 ? 0 : 2);
    expect(r.ok).toBe(true);
    expect(r.votes.reduce((a, v) => a + v.sh, 0)).toBe(TOTAL31);
    const yes = r.votes.filter((v) => v.yes).reduce((a, v) => a + v.sh, 0);
    expect(r.passed).toBe(yes * 2 > TOTAL31);
    if (!r.passed) expect(b.ten).toBeGreaterThan(ten0);
    // o mesmo assunto não volta a voto no mesmo mês
    expect(voteLock31(s, t.id, 'price', 0)).not.toBeNull();
    // renegociar: você decide a programação; com relação boa o sócio aceita
    setOpinion(s, p.k, 90);
    const rn = renegotiate31(s, t.id, { prog: 'me' });
    if (rn.ok) {
      const before = opinionOf(s, p.k);
      const v = b.set.prog === 2 ? 0 : 2;
      const r2 = propose31(s, t.id, 'prog', v);
      expect(r2.passed).toBe(true);
      expect(b.set.prog).toBe(v);
      expect(opinionOf(s, p.k)).toBeLessThanOrEqual(before);
    }
    // com a maioria (80%), você aprova sozinho
    const s2 = game('r31-soc-maj');
    const t2 = pick(s2, 'venue');
    expect(buy31(s2, t2.id, 8000, 'label')).toBeNull();
    const r3 = propose31(s2, t2.id, 'prog', 2);
    expect(r3.passed).toBe(true);
  });

  it('saída: vender ao sócio ou ao mercado (com preferência do acordo); vender tudo encerra a sociedade', () => {
    const s = game();
    const t = pick(s, 'venue');
    expect(buy31(s, t.id, 5000, 'label')).toBeNull();
    const b = socio31(s).b[t.id];
    b.exit = 'first';
    expect(sellLock31(s, t.id, 1000, 'market')).not.toBeNull(); // preferência: ofereça ao sócio
    const cash0 = s.player.cash;
    expect(sell31(s, t.id, 1000, 'partner')).toBeNull();
    expect(s.player.cash).toBeGreaterThan(cash0);
    expect(b.me).toBe(4000);
    b.exit = 'free';
    expect(sell31(s, t.id, 1000, 'market')).toBeNull();
    expect(b.p.length).toBe(2); // entrou um sócio novo
    expect(b.me + b.p.reduce((a, p) => a + p.sh, 0)).toBe(TOTAL31);
    expect(sell31(s, t.id, b.me, 'partner')).toBeNull();
    expect(socio31(s).b[t.id]).toBeUndefined();
    expect(socio31(s).done.some((d) => d.id === t.id)).toBe(true);
  });

  it('sócio NPC age: com tensão alta pede saída ou briga; a pendência aparece e a resposta resolve', () => {
    const s = game();
    const t = pick(s, 'venue');
    expect(buy31(s, t.id, 3000, 'label')).toBeNull();
    const b = socio31(s).b[t.id];
    let acted = false;
    for (let i = 0; i < 24 && !acted; i++) {
      b.ten = 90;
      const f0 = socio31(s).n.fights;
      socMonth31(s);
      acted = !!b.ask || socio31(s).n.fights > f0;
    }
    expect(acted).toBe(true);
    if (b.ask) {
      expect(pendingList(s).some((p) => p.id === `soc31:${t.id}`)).toBe(true);
      const k = b.ask.k;
      expect(answer31(s, t.id, k === 'vote')).toBeNull();
      expect(b.ask).toBeUndefined();
    }
    // pedido de saída recusado: o sócio vende a um terceiro; parte total segue 100%
    b.ask = { k: 'exit', due: s.week + 4, from: b.p[0].k, price: quote31(s, t.id, b.p[0].sh, b.me), sh: b.p[0].sh };
    const old = b.p[0].k;
    expect(answer31(s, t.id, false)).toBeNull();
    expect(b.p.some((p) => p.k === old)).toBe(false);
    expect(b.me + b.p.reduce((a, p) => a + p.sh, 0)).toBe(TOTAL31);
  });

  it('criar em conjunto: acordo com aporte, %, quem decide o quê e saída; o parceiro recusa acordo ruim', () => {
    const s = game();
    const lb = Object.values(s.labels).find((x) => x.active && x.leaderId)!;
    setOpinion(s, `l:${lb.leaderId}`, 60);
    const bad = jvAccept31(s, { kind: 'fest', name: 'X', pk: 'label', lb: lb.id, me: 9000, rules: { price: 'me', prog: 'me', date: 'me', invest: 'me' }, exit: 'locked' });
    expect(bad.ok).toBe(false);
    const cash0 = s.player.cash;
    const id = createJoint31(s, { kind: 'fest', name: 'Festival da Ponte', pk: 'label', lb: lb.id, me: 6000, rules: { prog: 'p' }, exit: 'first' });
    expect(typeof id === 'string' && id.startsWith('jv:')).toBe(true);
    const b = socio31(s).b[id as string];
    expect(b.me).toBe(6000);
    expect(b.p[0].sh).toBe(4000);
    expect(b.rules.prog).toBe('p');
    expect(s.player.cash).toBeLessThan(cash0);
    expect(voteLock31(s, b.id, 'prog', 2)).not.toBeNull(); // é decisão do sócio pelo acordo
    // prefeitura também pode ser parceira
    const id2 = createJoint31(s, { kind: 'venue', name: 'Casa do Porto', pk: 'city', me: 5000, h: 'label' });
    expect(typeof id2 === 'string' && id2.startsWith('jv:')).toBe(true);
    expect(holdings31(s).length).toBe(2);
  });

  it('determinismo: duas partidas iguais dão os mesmos resultados e pedidos', () => {
    const run = () => {
      const s = game('r31-soc-det');
      const t = pick(s, 'venue');
      buy31(s, t.id, 4500, 'label');
      const u = pick(s, 'fest');
      buy31(s, u.id, 3000, 'personal');
      for (let i = 0; i < 10; i++) advanceMonth(s);
      return JSON.stringify(socio31(s)) + s.player.cash;
    };
    expect(run()).toBe(run());
  });

  it('explorar não muda o mundo: listar, cotar, ver quem aceita e travas não sorteiam nem gravam', () => {
    const s = game();
    const t = pick(s);
    const snap = JSON.stringify(s.x4.socio31 ?? null) + rngSnapshot19(s) + s.player.cash + JSON.stringify((s.x4 as unknown as { op: unknown }).op);
    for (const x of targets31(s)) { bizValue31(s, x.id); quote31(s, x.id, 2500); accept31(s, x.id, x.owner, 2500, 0, x); buyLock31(s, x.id, 2500, 'label'); }
    jvAccept31(s, { kind: 'fest', name: 'Y', pk: 'city', me: 5000 });
    holdings31(s);
    expect(JSON.stringify(s.x4.socio31 ?? null) + rngSnapshot19(s) + s.player.cash + JSON.stringify((s.x4 as unknown as { op: unknown }).op)).toBe(snap);
    expect(t).toBeTruthy();
  });

  it('sem participação o mês não consome sorte; editor dá participação e fecha o mês', () => {
    const s = game();
    const r0 = rngSnapshot19(s, 'socio31');
    advanceMonth(s);
    expect(rngSnapshot19(s, 'socio31')).toBe(r0);
    setEditorOn(s, true);
    const t = targets31(s)[0];
    expect(runEdit(s, 'soc31.grant', undefined, t.id).ok).toBe(true);
    expect(socio31(s).b[t.id].me).toBe(2500);
    expect(runEdit(s, 'soc31.month').ok).toBe(true);
    expect(socio31(s).b[t.id].months.length).toBe(1);
  });
});
