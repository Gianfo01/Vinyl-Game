// Rodada 20 (G4) — registro único de ações por artista: elegibilidade com motivo, prévia sem efeito colateral,
// execução que revalida, lote com escopo explícito, Protótipo A (preparar gravação) e alertas críticos do elenco.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';
import '../src/sim/sys';
import {
  CAT20, DEFAULT_PINS20, FILTER0_20, SUB20, actionRow20, actionRows20, actions20, alerts20, applyRecordPlan20, batchPreview20,
  filterRoster20, paletteEntries20, planAgenda20, recordPlan20, runAction20, runBatch20, togglePin20, _agendaIds20,
} from '../src/ui/actions20';

function game(): { s: GameState; id: string } {
  const s = createGame(defaultConfig('r20-g4'));
  const a = Object.values(s.acts).filter((x) => x.members.length >= 2 && !x.catalogNo && (x.status === 'active' || x.status === 'emerging') && x.members.every((m) => s.persons[m]?.alive)).sort((x, y) => y.fame - x.fame)[0];
  a.owner = 'player';
  const id = playerActs(s).includes(a.id) ? a.id : playerActs(s)[0];
  return { s, id };
}

describe('r20 G4 — registro de ações', () => {
  it('catálogo: ids únicos, toda categoria e subaba presentes, rótulos bilíngues', () => {
    const ids = actions20().map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CAT20) expect(actions20().some((x) => x.cat === c.id)).toBe(true);
    for (const a of actions20()) { expect(a.label.pt.length).toBeGreaterThan(2); expect(a.label.en.length).toBeGreaterThan(2); }
    expect(SUB20.map((x) => x.id)).toEqual(['overview', 'agenda', 'career', 'audience', 'members', 'full']);
    for (const p of DEFAULT_PINS20) expect(ids).toContain(p);
    expect(_agendaIds20()).toContain('rehearse');
  });

  it('menu: linhas sem mudar estado; bloqueio tem motivo; fora do elenco é bloqueado', () => {
    const { s, id } = game();
    expect(id).toBeTruthy();
    const before = JSON.stringify({ a: s.agenda, d: s.delegated, c: s.player.cash });
    const rows = actionRows20(s, { act: id });
    expect(rows.length).toBeGreaterThan(8);
    for (const r of rows) if (r.block) expect(r.block.pt.length).toBeGreaterThan(3);
    paletteEntries20(s, [id]);
    batchPreview20(s, 'rest.add', [id]);
    recordPlan20(s, id);
    expect(JSON.stringify({ a: s.agenda, d: s.delegated, c: s.player.cash })).toBe(before);
    const npc = Object.values(s.acts).find((a) => a.owner !== 'player' && a.members.length)!;
    expect(actionRow20(s, 'rest.add', { act: npc.id })!.block).not.toBeNull();
    expect(runAction20(s, 'rest.add', { act: npc.id }).ok).toBe(false);
  });

  it('execução revalida: caixa zerado bloqueia na hora de confirmar; navegação não muda nada', () => {
    const { s, id } = game();
    const nav = runAction20(s, 'agenda.edit', { act: id });
    expect(nav.ok).toBe(true);
    expect(nav.nav?.sub).toBe('agenda');
    const r = actionRow20(s, 'rehearse.add', { act: id })!;
    if (r.cost > 0) {
      const cash = s.player.cash;
      s.player.cash = 0;
      expect(runAction20(s, 'rehearse.add', { act: id }).ok).toBe(false);
      s.player.cash = cash;
    }
    expect(r.block).toBeNull();
    const out = runAction20(s, 'rehearse.add', { act: id });
    {
      expect(out.ok).toBe(true);
      expect(s.delegated[id]).toBe(false);
      expect((s.agenda[id] ?? []).some((x) => x.action === 'rehearse')).toBe(true);
    }
  });

  it('plano de agenda respeita slots e capacidade e lista o que sai', () => {
    const { s, id } = game();
    const a = s.acts[id];
    const p = planAgenda20(s, a, [{ action: 'rest' }]);
    if (!p.block) { expect(p.load).toBeLessThanOrEqual(p.cap); expect(p.slots.some((x) => x.action === 'rest')).toBe(true); }
  });

  it('lote: escopo explícito, prévia por artista, aplica só aos elegíveis', () => {
    const { s, id } = game();
    const npc = Object.values(s.acts).find((a) => a.owner !== 'player' && a.members.length)!.id;
    const pv = batchPreview20(s, 'agenda.delegate', [id, npc]);
    expect(pv.rows).toHaveLength(2);
    expect(pv.rows[1].block).not.toBeNull();
    const res = runBatch20(s, 'agenda.delegate', [npc]);
    expect(res[0].out.ok).toBe(false);
  });

  it('Protótipo A: preparar gravação compara opções com custo/ocupação reais e confirma na agenda', () => {
    const { s, id } = game();
    const a = s.acts[id];
    const rp = recordPlan20(s, id);
    expect(rp.options.map((x) => x.id)).toEqual(['now', 'rehearse', 'train', 'producer']);
    if (!rp.songs.length) expect(rp.block).not.toBeNull();
    // garante músicas escritas para testar a confirmação
    if (!rp.songs.length) { const sid = Object.keys(s.songs).find((k) => !s.songs[k].recorded); expect(sid).toBeTruthy(); a.songs.push(sid!); }
    const rp2 = recordPlan20(s, id, 1);
    const reh = rp2.options.find((x) => x.id === 'rehearse')!;
    expect(rp2.block).toBeNull();
    expect(reh.plan?.block ?? null).toBeNull();
    {
      s.player.cash = Math.max(s.player.cash, reh.plan!.cost + 1);
      const out = applyRecordPlan20(s, id, 'rehearse', 1);
      expect(out.ok).toBe(true);
      const acts = (s.agenda[id] ?? []).map((x) => x.action);
      expect(acts).toContain('record');
      expect(acts).toContain('rehearse');
    }
  });

  it('alertas críticos não somem com filtro; favoritos e filtros puros', () => {
    const { s, id } = game();
    const a = s.acts[id];
    a.status = 'hiatus';
    expect(alerts20(s, a).some((x) => x.critical)).toBe(true);
    const f = filterRoster20(s, [id], { ...FILTER0_20, state: 'active' });
    expect(f.shown).not.toContain(id);
    expect(f.hiddenCritical).toContain(id);
    expect(togglePin20(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePin20(['a', 'b'], 'a')).toEqual(['b']);
    expect(togglePin20(['1', '2', '3', '4', '5'], '6')).toHaveLength(5);
  });
});
