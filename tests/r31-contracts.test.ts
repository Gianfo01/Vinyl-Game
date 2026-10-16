// R31 · W0-CON / W0-ROLE — contratos compartilhados (src/sim/r31): pendência única, destino, pessoa e papéis, objeto,
// transação atribuída com totais duráveis e interruptores.
import { beforeAll, describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import { advanceMonth } from '../src/sim/tick';
import type { GameState, Offer } from '../src/sim/types';
import { post } from '../src/sim/util';
import { addMsg } from '../src/sim/sys/people/state';
import { r21 } from '../src/sim/sys/roles21';
import { destKey, parseDestKey, resolveDest, type Dest } from '../src/sim/r31/dest';
import { pendingAt, pendingCount, pendingList, pendingSources, registerPendingSource } from '../src/sim/r31/pending';
import { addRole, endRole, hasRole, retire, rolesOf } from '../src/sim/r31/role';
import { createObj, objInvariants, obj31, offer, offersAt, recover, registerItemModel, steal, takeOffer, transfer, withdraw, HIST_CAP31 } from '../src/sim/r31/object';
import { recordTxn, txn31, txnBalance, txnTotal, txnUnallocated, withTxn } from '../src/sim/r31/txn';
import { registerSwitch, setSw, sw, switchDefs } from '../src/sim/r31/switches';

const game = (seed = 'r31c', y = 1990): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));

let s: GameState;
beforeAll(() => { s = game(); });

// ---------------------------------------------------------------- destino

describe('destino', () => {
  const samples: Dest[] = [
    { area: 'desk' },
    { area: 'artists', tab: 'roster', intent: 'renew', actId: 'a1' },
    { area: 'market', personId: 'p:x y', country: 'BRA', era: 1965, career: 'manager' },
    { area: 'world', tab: 'a&b=c?d', era: 2040 },
  ];
  it('chave estável e ida e volta', () => {
    for (const d of samples) {
      expect(parseDestKey(destKey(d))).toEqual(d);
      expect(destKey(parseDestKey(destKey(d)))).toBe(destKey(d));
    }
    // ordem dos campos não muda a chave
    expect(destKey({ era: 1965, area: 'market', country: 'BRA' } as Dest)).toBe(destKey({ area: 'market', country: 'BRA', era: 1965 }));
    expect(destKey({ area: 'desk', tab: undefined })).toBe('desk');
  });
  it('resolve contra o estado', () => {
    const act = Object.values(s.acts)[0];
    const pid = Object.keys(s.persons)[0];
    const ok = resolveDest(s, { area: 'artists', actId: act.id, personId: pid, country: 'BRA', era: 1990, career: 'label' });
    expect(ok.ok).toBe(true);
    expect(resolveDest(s, { area: 'artists', personId: `p:${pid}` }).ok).toBe(true);
    const bad = resolveDest(s, { area: 'nao_existe', tab: 'x', actId: 'zz', personId: 'p:zz', country: 'XXX', era: 1700, career: 'astronaut' });
    expect(bad.ok).toBe(false);
    expect(bad.dest).toEqual({ area: 'hq' });
    expect(new Set(bad.dropped)).toEqual(new Set(['area', 'actId', 'personId', 'country', 'era', 'career']));
    // área própria de carreira (careers12) é válida
    expect(resolveDest(s, { area: 'management' }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------- pendência única

describe('pendência única', () => {
  it('fontes reais ligadas, sem gravar estado, deduplicadas', () => {
    expect(pendingSources()).toEqual(expect.arrayContaining(['decisions', 'inbox', 'offers']));
    const g = game('r31p');
    const act = Object.values(g.acts).find((a) => a.owner !== 'player')!;
    g.decisions.push({ id: 'dT1', eventId: 'x', cat: 'x', title: l('Decidir', 'Decide'), text: l('', ''), options: [], ctx: { act: act.id }, week: g.week, defaultOption: 'a', tags: [] });
    const m = addMsg(g, { from: 'X', subject: l('Responder', 'Answer'), body: l('', ''), kind: 'deal', actions: [{ id: 'ok', label: l('Ok', 'Ok') }], expires: g.week + 3 });
    addMsg(g, { from: 'X', subject: l('Só aviso', 'Just info'), body: l('', ''), kind: 'info' });
    g.offers.push({ id: 'oT1', actId: act.id, status: 'counter', week: g.week } as Offer);
    const before = JSON.stringify(g);
    const list = pendingList(g);
    expect(JSON.stringify(g)).toBe(before); // provedores só leem
    const ids = list.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['dec:dT1', `msg:${m.id}`, 'offer:oT1']));
    expect(ids.some((i) => i.startsWith('msg:') && i !== `msg:${m.id}` && list.find((p) => p.id === i)!.title.pt === 'Só aviso')).toBe(false);
    // W1-REV2: carta com resposta conta uma vez (caixa 'inbox' e fila 'attn' davam ib:<id> e msg:<id>)
    expect(list.filter((p) => p.title.pt === 'Responder')).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
    const n = pendingCount(g);
    // outra fonte devolvendo a mesma decisão (visto de outro lugar) não conta de novo; vira atalho
    registerPendingSource('t31dup', (x) => x.decisions.filter((d) => d.id === 'dT1').map((d) => ({ id: `dec:${d.id}`, kind: 'decision', title: d.title, owner: { area: 'company', tab: 'board' }, shortcuts: [], due: x.week + 1 })));
    try {
      expect(pendingCount(g)).toBe(n);
      const p = pendingList(g).find((x) => x.id === 'dec:dT1')!;
      expect(p.owner.area).toBe('desk');
      expect(p.shortcuts.map((d) => d.area)).toEqual(expect.arrayContaining(['company', 'artists']));
      expect(p.due).toBe(g.week + 1);
      // visível em várias áreas, uma vez em cada
      expect(pendingAt(g, 'company').filter((x) => x.id === 'dec:dT1')).toHaveLength(1);
      expect(pendingAt(g, 'desk').filter((x) => x.id === 'dec:dT1')).toHaveLength(1);
      // atalhos não repetem o dono nem a si mesmos
      for (const x of pendingList(g)) {
        const keys = x.shortcuts.map(destKey);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys).not.toContain(destKey(x.owner));
      }
    } finally { registerPendingSource('t31dup', () => []); }
    // resolvida pelo dono, some
    g.decisions = g.decisions.filter((d) => d.id !== 'dT1');
    m.resolved = 'ok';
    expect(pendingList(g).map((p) => p.id)).not.toContain('dec:dT1');
    expect(pendingList(g).map((p) => p.id)).not.toContain(`msg:${m.id}`);
  });
  it('todo dono de pendência é um destino válido', () => {
    for (const p of pendingList(s)) expect(resolveDest(s, p.owner).dropped).not.toContain('area');
  });
});

// ---------------------------------------------------------------- pessoa e papéis

describe('pessoa e papéis (W0-ROLE)', () => {
  it('lê roles21, soma papéis, encerra e aposenta sem trocar a identidade', () => {
    const g = game('r31r');
    const act = Object.values(g.acts).find((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length)!;
    const pid = act.members[0];
    const person = g.persons[pid];
    expect(rolesOf(g, pid, g.year).some((r) => r.kind === 'artist' && r.src === 'r21')).toBe(true);
    expect(rolesOf(g, `p:${pid}`, g.year)).toEqual(rolesOf(g, pid, g.year));
    const st = addRole(g, pid, 'staff', { org: 'player', data: { dept: 'ar' } });
    expect(addRole(g, pid, 'staff', { org: 'player' })).toBe(st); // não duplica papel aberto
    expect(hasRole(g, pid, 'staff')).toBe(true);
    expect(endRole(g, pid, 'staff', g.year)).toBe(1);
    expect(rolesOf(g, pid, g.year + 1).some((r) => r.kind === 'staff')).toBe(false);
    expect(rolesOf(g, pid).some((r) => r.kind === 'staff' && r.to === g.year)).toBe(true); // histórico fica
    // período guardado em roles21 também fecha
    (r21(g).sp[pid] ??= []).push({ k: 'producer', from: g.year - 2 });
    expect(hasRole(g, pid, 'producer')).toBe(true);
    const y = g.year;
    const ret = retire(g, pid, y);
    expect(ret.kind).toBe('retired');
    expect(g.persons[pid]).toBe(person); // mesma pessoa
    const after = rolesOf(g, pid, y + 1).map((r) => r.kind);
    expect(after).toEqual(['retired']);
    expect(r21(g).sp[pid].find((x) => x.k === 'producer')!.to).toBe(y - 1);
    // a vida toda continua visível
    expect(rolesOf(g, pid).map((r) => r.kind)).toEqual(expect.arrayContaining(['artist', 'staff', 'producer', 'retired']));
    // família continua depois de aposentar
    addRole(g, pid, 'family', { from: y });
    retire(g, pid, y + 1);
    expect(hasRole(g, pid, 'family', y + 2)).toBe(true);
  });

  it('papel aberto no próprio ano da aposentadoria não fica ativo nesse ano (registrado, roles21 e derivado)', () => {
    const g = game('r31r2');
    const act = Object.values(g.acts).find((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length)!;
    const pid = act.members[0];
    const y = g.year;
    addRole(g, pid, 'staff', { org: 'player', from: y });                 // registrado aqui, aberto neste ano
    (r21(g).sp[pid] ??= []).push({ k: 'producer', from: y });              // período de roles21 aberto neste ano
    retire(g, pid, y);
    const now = rolesOf(g, pid, y).map((r) => r.kind);
    expect(now).toContain('retired');
    expect(now).not.toContain('staff');
    expect(now).not.toContain('producer');
    expect(r21(g).sp[pid].find((x) => x.k === 'producer')!.to).toBe(y - 1);
    // continuam no histórico
    expect(rolesOf(g, pid).map((r) => r.kind)).toEqual(expect.arrayContaining(['staff', 'producer', 'retired']));
    // derivado (integrante de ato ativo) que começou no ano da aposentadoria também sai do ano
    const g2 = game('r31r3');
    const a2 = Object.values(g2.acts).find((a) => a.status !== 'retired' && a.status !== 'split' && a.members.length)!;
    const p2 = a2.members[0];
    const art = rolesOf(g2, p2, g2.year).find((r) => r.kind === 'artist' && r.src === 'r21')!;
    expect(art).toBeTruthy();
    retire(g2, p2, art.from);
    expect(rolesOf(g2, p2, art.from).map((r) => r.kind)).toEqual(['retired']);
    // endRole(ano − 1) não deixa ativo no ano atual um papel aberto neste ano
    addRole(g2, p2, 'writer', { from: g2.year + 3 });
    expect(endRole(g2, p2, 'writer', g2.year + 2)).toBe(1);
    expect(hasRole(g2, p2, 'writer', g2.year + 3)).toBe(false);
  });
});

// ---------------------------------------------------------------- objeto

describe('objeto: modelo ≠ instância', () => {
  registerItemModel({ id: 't31_violin', kind: 'instrument', unique: true });
  registerItemModel({ id: 't31_strat', kind: 'instrument' });
  it('invariantes de oferta, compra, roubo e histórico', () => {
    const g = game('r31o');
    const v = createObj(g, { modelId: 't31_violin', origin: 'heir', owner: 'player' });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(createObj(g, { modelId: 't31_violin', origin: 'x', owner: 'p:y' })).toEqual({ ok: false, why: 'unique_exists' });
    expect(createObj(g, { modelId: 'nada', origin: 'x', owner: 'player' })).toEqual({ ok: false, why: 'no_model' });
    const a = createObj(g, { modelId: 't31_strat', origin: 'shop', owner: 'player' });
    const b = createObj(g, { modelId: 't31_strat', origin: 'shop', owner: 'player' });
    if (!a.ok || !b.ok) throw new Error('create');
    expect(a.v.id).not.toBe(b.v.id); // mesmo modelo, peças diferentes
    // uma peça em no máximo uma oferta
    const o1 = offer(g, a.v.id, 'shop:centro', 1000);
    expect(o1.ok).toBe(true);
    expect(offer(g, a.v.id, 'auction:1', 900)).toEqual({ ok: false, why: 'in_offer' });
    expect(offer(g, a.v.id, 'museum:1', 0)).toEqual({ ok: false, why: 'in_offer' });
    expect(offersAt(g, 'shop:centro')).toHaveLength(1);
    // compra uma vez
    if (!o1.ok) return;
    const t1 = takeOffer(g, o1.v.id, 'p:comprador');
    expect(t1.ok).toBe(true);
    expect(takeOffer(g, o1.v.id, 'p:outro')).toEqual({ ok: false, why: 'no_offer' });
    expect(obj31(g).objs[a.v.id].owner).toBe('p:comprador');
    // roubo muda quem está com a peça, não o dono; peça roubada sai da oferta e não volta sem recuperar
    const o2 = offer(g, v.v.id, 'museum:1', 0);
    expect(o2.ok).toBe(true);
    steal(g, v.v.id, 'p:ladrao');
    const vv = obj31(g).objs[v.v.id];
    expect(vv.owner).toBe('player');
    expect(vv.holder).toBe('p:ladrao');
    expect(vv.offer).toBeUndefined();
    expect(offersAt(g, 'museum:1')).toHaveLength(0);
    expect(offer(g, v.v.id, 'auction:1', 5)).toEqual({ ok: false, why: 'not_owner_holding' });
    recover(g, v.v.id);
    expect(vv.holder).toBe('player');
    // transferência leva dono e posse e tira da oferta
    const o3 = offer(g, b.v.id, 'shop:centro', 10);
    if (!o3.ok) throw new Error('offer');
    transfer(g, b.v.id, 'act:x');
    expect(obj31(g).offers[o3.v.id]).toBeUndefined();
    expect(obj31(g).objs[b.v.id]).toMatchObject({ owner: 'act:x', holder: 'act:x' });
    expect(withdraw(g, o3.v.id)).toEqual({ ok: false, why: 'no_offer' });
    expect(objInvariants(g)).toEqual([]);
    // histórico com teto: compacta em vez de descartar
    for (let i = 0; i < HIST_CAP31 * 2; i++) { steal(g, v.v.id, 'p:l'); recover(g, v.v.id); }
    expect(vv.history.length).toBeLessThanOrEqual(HIST_CAP31);
    const total = vv.history.length + Object.values(vv.old!.n).reduce((t, n) => t + (n ?? 0), 0);
    expect(total).toBe(5 + HIST_CAP31 * 4); // create, offer, withdraw (roubo), steal, recover + os ciclos: todas contadas
    // a varredura pega estado corrompido
    obj31(g).offers.fake = { id: 'fake', objId: a.v.id, venue: 'shop:x', price: 1, since: 0 };
    expect(objInvariants(g).length).toBeGreaterThan(0);
  });
  it('modo estrito transforma recusa em erro', () => {
    const g = game('r31o2');
    setSw(g, 'contracts31.strict', true);
    expect(() => withdraw(g, 'nada')).toThrow();
    setSw(g, 'contracts31.strict', false);
    expect(withdraw(g, 'nada').ok).toBe(false);
  });
});

// ---------------------------------------------------------------- transação atribuída

describe('transação atribuída e totais duráveis', () => {
  it('liga ao livro sem mudar valores e fecha atribuído + não alocado = total', () => {
    const g = game('r31t');
    const act = Object.values(g.acts)[0];
    const rel = Object.values(g.releases)[0];
    const r0 = txn31(g).cls.res.total;
    const cash0 = g.player.cash;
    expect(post(g, `t31:${act.id}`, 12345, 'sales', 'teste')).toBe(true);
    expect(g.player.cash - cash0).toBe(12345); // valores intactos
    expect(txnTotal(g, 'artist', act.id)).toBeGreaterThanOrEqual(12345);
    const un0 = txnUnallocated(g, 'artist');
    post(g, 't31:semdono', -500, 'marketing', 'teste');
    expect(txnUnallocated(g, 'artist') - un0).toBe(-500);
    const art0 = txnTotal(g, 'artist', act.id);
    withTxn({ artist: act.id, project: rel?.id ?? 'proj1', payer: 'p:fa' }, () => post(g, 't31:ctx', 777, 'merch', 'teste'));
    expect(txnTotal(g, 'artist', act.id) - art0).toBe(777);
    const last = txn31(g).last[txn31(g).last.length - 1];
    expect(last).toMatchObject({ amount: 777, payer: 'p:fa', beneficiary: 'player', owner: 'player', cls: 'res' });
    expect(txnTotal(g, 'period', String(g.year))).toBe(txn31(g).cls.res.dims.period.by[String(g.year)]);
    // compra de bem e financiamento separados do resultado
    const res1 = txn31(g).cls.res.total;
    post(g, `eq:t31:${g.week}`, -9000, 'equipment', 'teste');
    post(g, 't31:loan', 50000, 'loans', 'teste');
    expect(txn31(g).cls.res.total).toBe(res1);
    expect(txn31(g).cls.inv.total).toBeLessThanOrEqual(-9000);
    expect(txn31(g).cls.fin.total).toBeGreaterThanOrEqual(50000);
    expect(txnBalance(g)).toEqual([]);
    expect(res1 - r0).toBe(12345 - 500 + 777);
  });
  it('totais não somem quando o razão corta linhas; fecham depois de meses de jogo', () => {
    const g = game('r31t2');
    const act = Object.values(g.acts)[0];
    const t0 = txnTotal(g, 'artist', act.id);
    for (let i = 0; i < 450; i++) post(g, `t31n${i}:${act.id}`, 100, 'sales', 'x');
    expect(g.ledger.length).toBeLessThanOrEqual(400);
    expect(txnTotal(g, 'artist', act.id) - t0).toBe(45000);
    for (let i = 0; i < 3; i++) advanceMonth(g);
    expect(txnBalance(g)).toEqual([]);
    expect(txn31(g).n).toBeGreaterThan(450);
    expect(txn31(g).last.length).toBeLessThanOrEqual(60);
  });
  it('recordTxn direto (sem livro) também fecha', () => {
    const g = game('r31t3');
    withTxn({ artist: 'a', project: 'p' }, () => withTxn({ period: '1999' }, () => recordTxn(g, 'k', 10, 'sales', 'rev', false)));
    expect(txnTotal(g, 'artist', 'a')).toBe(10);
    expect(txnTotal(g, 'period', '1999')).toBe(10);
    expect(txnBalance(g)).toEqual([]);
  });
});

// ---------------------------------------------------------------- interruptores

describe('interruptores', () => {
  it('registro, padrão, leitura e escrita', () => {
    const g = game('r31s');
    registerSwitch({ id: 't31.n', def: 3, scope: 'game', desc: l('Teste', 'Test') });
    expect(sw<number>(g, 't31.n')).toBe(3);
    setSw(g, 't31.n', 5);
    expect(sw<number>(g, 't31.n')).toBe(5);
    setSw(g, 't31.n', 3);
    expect((g as unknown as { x4: { sw31: Record<string, unknown> } }).x4.sw31['t31.n']).toBeUndefined(); // só diferenças
    expect(() => sw(g, 'nao.existe')).toThrow();
    expect(() => setSw(g, 't31.n', 'x')).toThrow();
    // nomes reais lê da configuração (sem segunda fonte)
    expect(sw<boolean>(g, 'realNames')).toBe(!!g.config.realNames);
    setSw(g, 'realNames', true);
    expect(g.config.realNames).toBe(true);
    for (const d of switchDefs()) { expect(d.desc.pt.length).toBeGreaterThan(0); expect(d.desc.en.length).toBeGreaterThan(0); }
  });
});
