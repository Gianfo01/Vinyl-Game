// Rodada 18 (supply18, U10): relatório de mercado — trimestral (mensal com analista na equipe).
// Fatia de cada formato por país (físico pela adoção desigual de eras18), gêneros subindo e caindo (trends17),
// lançamentos da concorrência nas paradas, saúde do varejo, fila das prensas, adiantamento médio pago pelos rivais
// e a sua distribuidora. Vira mensagem na Caixa 2.0 (analista) e dicas do conselheiro; cada número tem porquê.

import { genreById, l, MARKETS, type L, type MarketId } from '../../data/world';
import { registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import type { GameState } from '../types';
import { fmtL, money, playerActs, staffCount } from '../util';
import { MK_LAG18, physIn18 } from './eras18';
import { retailCycle } from './industry/retail';
import { hotList17 } from './trends17';
import { baseQueue18, digitalOn18, physMix18, queueWhy18, sup18 } from './supply18';

const pc = (v: number) => `${Math.round(v * 100)}%`;
const $ = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

export interface Mix18 { phys: number; shellac: number; vinyl: number; tape: number; cd: number; radio: number; dl: number; stream: number }
export interface Rep18 { y: number; m: number; mix: Partial<Record<MarketId, Mix18>>; hot: { g: string; share: number; d: number }[]; cold: { g: string; d: number }[];
  comp: { lb: string; n: number; top: string; pos: number }[]; retail: number; queue: { vinyl: number; cd: number; tape: number }; adv: number; advPrev: number; gap: string[]; notes: L[] }

/** Formatos num mercado agora: físico pela adoção (eras18) dividido pela mistura da época com atraso do país. */
export function mix18(s: GameState, mk: MarketId): Mix18 {
  const phys = physIn18(s, mk);
  const pm = physMix18(s.year - Math.min(3, MK_LAG18[mk]));
  const dig = 1 - phys;
  const st = s.techDates.streaming;
  const lag = MK_LAG18[mk];
  const sf = st === undefined || s.year < st + lag ? 0 : Math.min(0.95, (s.year - st - lag + 1) * 0.22);
  const dlOn = digitalOn18(s) && s.year >= (s.techDates.download ?? 9999) + Math.min(2, lag);
  return { phys, shellac: phys * pm.shellac, vinyl: phys * pm.vinyl, tape: phys * (pm.tape + pm.eight), cd: phys * pm.cd, radio: dlOn ? 0 : dig, dl: dlOn ? dig * (1 - sf) : 0, stream: dlOn ? dig * sf : 0 };
}

export function makeReport18(s: GameState): Rep18 {
  const mix: Partial<Record<MarketId, Mix18>> = {};
  for (const m of MARKETS) if (m.size(s.year) > 0.04) mix[m.id] = mix18(s, m.id);
  const hl = hotList17(s, 14);
  const hot = hl.filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 4).map((x) => ({ g: x.g, share: x.share, d: x.d }));
  const cold = hl.filter((x) => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3).map((x) => ({ g: x.g, d: x.d }));
  // concorrência: entradas novas nas paradas (últimas 13 semanas) por selo
  const by: Record<string, { n: number; top: string; pos: number }> = {};
  for (const e of [...s.charts.singles.slice(0, 50), ...s.charts.albums.slice(0, 50)]) {
    const rel = s.releases[e.releaseId];
    if (!rel || rel.owner === 'player' || !s.labels[rel.owner] || s.week - rel.week > 13) continue;
    const x = (by[rel.owner] ??= { n: 0, top: '', pos: 999 });
    x.n += 1;
    if (e.pos < x.pos) { x.pos = e.pos; x.top = `${s.acts[rel.actId]?.name ?? '?'} — ${rel.title}`; }
  }
  const comp = Object.entries(by).map(([lb, x]) => ({ lb, ...x })).sort((a, b) => b.n - a.n || a.pos - b.pos).slice(0, 5);
  // adiantamento médio pago pelos rivais (12 meses) e no ano anterior
  let a1 = 0, n1 = 0, a0 = 0, n0 = 0;
  for (const c of Object.values(s.contracts)) {
    if (c.party === 'player') continue;
    const age = s.week - c.startWeek;
    if (age >= 0 && age < 52) { a1 += c.advance; n1++; } else if (age >= 52 && age < 104) { a0 += c.advance; n0++; }
  }
  const queue = { vinyl: baseQueue18('vinyl', s.year), cd: s.techDates.cd !== undefined && s.year >= s.techDates.cd ? baseQueue18('polycarbonate', s.year) : 0, tape: s.techDates.cassette !== undefined && s.year >= s.techDates.cassette ? baseQueue18('tape', s.year) : 0 };
  // gêneros subindo sem ninguém seu
  const fams = new Set(playerActs(s).map((id) => s.acts[id]?.genre));
  const gap = hot.filter((h) => !fams.has(h.g)).map((h) => h.g).slice(0, 2);
  const retail = retailCycle(s.year);
  const notes: L[] = [];
  if (queue.vinyl >= 7) notes.push(fmtL(l('Prensas lotadas: reserve o vinil com {q}+ semanas de antecedência ou adie.', 'Presses packed: book vinyl {q}+ weeks ahead or postpone.'), { q: queue.vinyl - 2 }));
  if (retail < 0.6) notes.push(l('Varejo físico encolhendo: lojas fecham, prazos e devoluções pioram — o digital e a venda direta ganham peso.', 'Physical retail shrinking: stores close, terms and returns worsen — digital and direct sales gain weight.'));
  else if (retail > 1.1) notes.push(l('Varejo em alta: megastores abrem espaço e pedem co-op (verba de vitrine).', 'Retail booming: megastores open space and ask for co-op (display money).'));
  if (n1 && n0 && a1 / n1 > (a0 / n0) * 1.2) notes.push(l('Adiantamentos subindo: a briga por talento está cara; contratos de desenvolvimento saem mais em conta.', 'Advances rising: the talent war is pricey; development deals are cheaper.'));
  for (const g of gap) notes.push(fmtL(l('{g} está subindo e você não tem ninguém no gênero.', '{g} is rising and you have no one in the genre.'), { g: genreById[g]?.name ?? l(g) }));
  const st = sup18(s);
  if (st.dist === 'indie_net' && st.health < 40) notes.push(l('A sua distribuidora independente está fraca: risco de calote.', 'Your independent distributor is weak: default risk.'));
  return { y: s.year, m: s.month, mix, hot, cold, comp, retail, queue, adv: n1 ? Math.round(a1 / n1) : 0, advPrev: n0 ? Math.round(a0 / n0) : 0, gap, notes };
}

export interface RepState18 { list: Rep18[] }
export function reps18(s: GameState): RepState18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.rep18 ??= { list: [] }) as RepState18;
  st.list ??= [];
  return st;
}

registerSimHook('month', 'report18', (s) => {
  if (s.config.role === 'artist') return;
  const analyst = staffCount(s, 'analyst') > 0;
  if (!analyst && s.month % 3 !== 2) return;
  const rp = makeReport18(s);
  const st = reps18(s);
  st.list.unshift(rp);
  if (st.list.length > 8) st.list.length = 8;
  const home = (MARKETS.find((m) => m.id === s.player.territories[0]) ?? MARKETS[0]).id;
  const mx = rp.mix[home];
  const lines: string[] = [];
  if (mx) lines.push(`${MARKETS.find((m) => m.id === home)!.name.pt}: físico ${pc(mx.phys)} (vinil ${pc(mx.vinyl)}, fita ${pc(mx.tape)}, CD ${pc(mx.cd)})${mx.stream ? `, streaming ${pc(mx.stream)}` : mx.dl ? `, download ${pc(mx.dl)}` : ''}.`);
  if (rp.hot.length) lines.push(`Subindo: ${rp.hot.map((h) => genreById[h.g]?.name.pt ?? h.g).join(', ')}.`);
  if (rp.comp.length) lines.push(`Concorrência: ${rp.comp.slice(0, 2).map((c) => `${s.labels[c.lb]?.name ?? c.lb} (${c.n} nas paradas)`).join('; ')}.`);
  const linesEn: string[] = [];
  if (mx) linesEn.push(`${MARKETS.find((m) => m.id === home)!.name.en}: physical ${pc(mx.phys)} (vinyl ${pc(mx.vinyl)}, tape ${pc(mx.tape)}, CD ${pc(mx.cd)})${mx.stream ? `, streaming ${pc(mx.stream)}` : mx.dl ? `, download ${pc(mx.dl)}` : ''}.`);
  if (rp.hot.length) linesEn.push(`Rising: ${rp.hot.map((h) => genreById[h.g]?.name.en ?? h.g).join(', ')}.`);
  if (rp.comp.length) linesEn.push(`Competition: ${rp.comp.slice(0, 2).map((c) => `${s.labels[c.lb]?.name ?? c.lb} (${c.n} on the charts)`).join('; ')}.`);
  pushInbox18(s, 'market18', {
    from: analyst ? 'Analista' : 'Relatório de mercado', tone: 'info',
    subject: fmtL(analyst ? l('Relatório de mercado — {m}/{y}', 'Market report — {m}/{y}') : l('Relatório trimestral de mercado — {m}/{y}', 'Quarterly market report — {m}/{y}'), { m: s.month + 1, y: s.year }),
    body: { pt: [...lines, ...rp.notes.map((n) => n.pt)].join(' '), en: [...linesEn, ...rp.notes.map((n) => n.en)].join(' ') },
  });
});
registerInboxKind('market18', { label: l('Mercado', 'Market'), cat: 'analyst', icon: 'chart-up', prio: 0, goto: () => ({ area: 'supply18', tab: ['supply18', 'rep'], label: l('Ver relatório', 'See report') }) });

registerExplain('market.mix', (s, c) => {
  const mk = String(c.mk ?? 'na') as MarketId;
  const m = MARKETS.find((x) => x.id === mk);
  if (!m) return null;
  const x = mix18(s, mk);
  const parts: WhyPart[] = [
    { label: fmtL(l('Atraso de adoção do país: {n} anos', 'Country adoption lag: {n} years'), { n: MK_LAG18[mk] }), value: x.phys, fmt: 'pct' },
    { label: l('Vinil', 'Vinyl'), value: x.vinyl, fmt: 'pct' }, { label: l('Fita/cartucho', 'Tape/cartridge'), value: x.tape, fmt: 'pct' }, { label: l('CD', 'CD'), value: x.cd, fmt: 'pct' },
  ];
  if (x.shellac > 0.005) parts.push({ label: l('Goma-laca', 'Shellac'), value: x.shellac, fmt: 'pct' });
  if (x.dl) parts.push({ label: l('Download', 'Download'), value: x.dl, fmt: 'pct' });
  if (x.stream) parts.push({ label: l('Streaming', 'Streaming'), value: x.stream, fmt: 'pct' });
  if (x.radio) parts.push({ label: l('Rádio/execução (não físico)', 'Radio/performance (non-physical)'), value: x.radio, fmt: 'pct' });
  return { title: fmtL(l('Formatos: {m}', 'Formats: {m}'), { m: m.name }), value: x.phys, fmt: 'pct', parts, note: queueWhy18('vinyl', s.year) ?? l('Mercados e públicos mais velhos adotam formatos novos anos depois.', 'Older markets and audiences adopt new formats years later.') };
});
registerExplain('market.adv', (s) => {
  const rp = reps18(s).list[0];
  if (!rp) return null;
  return { title: l('Adiantamento médio dos rivais', 'Rivals\' average advance'), value: rp.adv, fmt: 'money', parts: [{ label: l('Ano anterior', 'Previous year'), value: rp.advPrev, fmt: 'money' }], note: fmtL(l('Média dos contratos assinados pelos outros selos nos últimos 12 meses (referência: {v}).', 'Average of deals signed by other labels in the last 12 months (reference: {v}).'), { v: $(money(s, 10000)) }) };
});

registerAdvisorTip('report18', (s) => {
  const rp = reps18(s).list[0];
  if (!rp || !rp.gap.length || s.year * 12 + s.month - (rp.y * 12 + rp.m) > 3) return [];
  const g = rp.gap[0];
  return [{ id: `mkt-gap-${g}`, level: 'info', cat: 'opportunity', score: 42, text: fmtL(l('{g} está subindo e seu elenco não tem ninguém no gênero.', '{g} is rising and your roster has no one in it.'), { g: genreById[g]?.name ?? l(g) }), why: [l('Relatório de mercado: maior alta nas paradas no período.', 'Market report: biggest chart gain this period.')], effect: l('Um contrato de desenvolvimento é a porta de entrada mais barata.', 'A development deal is the cheapest way in.'), goto: { area: 'supply18', tab: ['supply18', 'deals'] } }];
});
