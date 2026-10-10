// Rodada 18 (U3) — explicações registradas para os números mais importantes da interface:
// resultado do mês, hype do ato, chance de oferta, posição na parada, fama por país, estresse,
// demanda de show, bolinhas de tempo e opinião sobre você. Cada parte pode abrir o próximo nível.

import { countryName, countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { defaultOffer, evaluateOffer } from '../contracts';
import { registerExplain, sortParts, type WhyPart } from '../explain18';
import { stressOf, shortOf, STRESS_LEVEL } from '../stress17';
import { cityDemand } from '../tours';
import type { Act, GameState, Offer } from '../types';
import { fmtL } from '../util';
import { balls, careerBalls, officeCap } from './agenda17';
import { energyLeft, maxEnergy } from './life';
import { base16, fameIn, fameMap16, f16, homeA3 } from './fame16';
import { hypeOf } from './hype12';
import { opinionOf, p13, per13 } from './persona13';
import { c12, localDraw, baseDraw, suggestTier } from './tour12';

export const CAT18: Record<string, L> = {
  sales: l('Vendas (master)', 'Sales (master)'), publishing: l('Edição', 'Publishing'), live: l('Shows', 'Live'), live_costs: l('Custos de shows', 'Live costs'),
  royalties: l('Royalties', 'Royalties'), distribution: l('Distribuição', 'Distribution'), release: l('Fabricação e marketing', 'Manufacturing & marketing'),
  recording: l('Gravação', 'Recording'), advances: l('Adiantamentos', 'Advances'), rent: l('Aluguel', 'Rent'), salaries: l('Salários', 'Salaries'),
  scouting: l('Scouting', 'Scouting'), artist_dev: l('Desenvolvimento artístico', 'Artist development'), legal: l('Jurídico', 'Legal'), sync: l('Sync', 'Sync'),
  loans: l('Empréstimos', 'Loans'), financing: l('Financiamento', 'Financing'), equipment: l('Equipamento', 'Equipment'), hq: l('Sede', 'HQ'),
  marketing: l('Marketing avulso', 'Ad-hoc marketing'), taxes: l('Impostos', 'Taxes'), outsourcing: l('Terceirização', 'Outsourcing'), neural: l('Era neural', 'Neural era'),
  acquisitions: l('Aquisições', 'Acquisitions'), asset_sales: l('Venda de ativos', 'Asset sales'), overhead: l('Despesas gerais', 'Overhead'),
  promo: l('Promoção mínima de lançamentos', 'Baseline release promo'), dividends: l('Dividendos', 'Dividends'), owner_draw: l('Retiradas e aportes do dono', 'Owner draws and injections'),
  other: l('Outros', 'Other'),
};
const catL = (c: string): L => CAT18[c] ?? l(c, c);
const actOf = (s: GameState, c: Record<string, unknown>): Act | undefined => s.acts[String(c.act ?? '')];
const r1 = (v: number) => Math.round(v * 10) / 10;
const P18 = (xs: (WhyPart | null | undefined)[]): WhyPart[] => xs.filter((x): x is WhyPart => !!x);

// ---------------------------------------------------------------- dinheiro

registerExplain('cash.month', (s) => {
  const e = Object.entries(s.lastMonthLedger).filter(([, v]) => v);
  const net = e.reduce((t, [, v]) => t + v, 0);
  const parts: WhyPart[] = sortParts(e.map(([k, v]) => ({ label: catL(k), value: v, fmt: 'money', tone: v >= 0 ? 'good' : 'bad', why: { key: 'cash.cat', ctx: { cat: k } } })));
  const run = net < 0 ? Math.floor(s.player.cash / -net) : null;
  return {
    title: l('Resultado do último mês', 'Last month result'), value: net, fmt: 'money', parts,
    note: run === null ? l('Mês no azul: o caixa cresce no ritmo atual.', 'Month in the black: cash grows at this pace.')
      : fmtL(l('No ritmo atual o caixa dura ~{n} meses. Receitas chegam com atraso (lojas pagam em ~2 meses; edição por trimestre).', 'At this pace cash lasts ~{n} months. Revenue arrives late (stores pay in ~2 months; publishing quarterly).'), { n: Math.max(0, run) }),
  };
});

registerExplain('cash.cat', (s, c) => {
  const cat = String(c.cat ?? '');
  const end = s.clock?.opened ? s.clock.monthStartWeek : s.week + 1;
  const rows = s.ledger.filter((x) => x.cat === cat && x.week >= end - 5 && x.week < end);
  const agg = new Map<string, number>();
  for (const x of rows) agg.set(x.memo, (agg.get(x.memo) ?? 0) + x.amount);
  const parts: WhyPart[] = sortParts([...agg.entries()].map(([m, v]) => ({ label: m, value: v, fmt: 'money', tone: v >= 0 ? 'good' : 'bad' }))).slice(0, 10);
  return { title: catL(cat), value: s.lastMonthLedger[cat] ?? 0, fmt: 'money', parts, note: agg.size > 10 ? fmtL(l('+{n} lançamentos menores.', '+{n} smaller entries.'), { n: agg.size - 10 }) : undefined };
});

// ---------------------------------------------------------------- ato: hype e fama

registerExplain('act.hype', (s, c) => {
  const a = actOf(s, c);
  if (!a) return null;
  const m = hypeOf(s, `a:${a.id}`);
  return {
    title: fmtL(l('Hype de {a}', '{a} hype'), { a: a.name }), value: m.v,
    parts: m.parts.map((p) => ({ label: p.t, value: r1(p.v), fmt: 'signed' as const, tone: p.v >= 0 ? 'good' as const : 'bad' as const })),
    note: fmtL(l('Soma limitada a 0–100. Tendência na semana: {t}. O embalo (momentum) acima de 45 vira hype.', 'Sum capped at 0–100. Weekly trend: {t}. Momentum above 45 turns into hype.'), { t: m.tr > 0 ? `+${m.tr}` : m.tr }),
  };
});

registerExplain('act.fame', (s, c) => {
  const a = actOf(s, c);
  if (!a) return null;
  const top = fameMap16(s, a).slice(0, 6);
  return {
    title: fmtL(l('Fama de {a}', '{a} fame'), { a: a.name }), value: Math.round(a.fame),
    parts: top.map((x) => ({ label: countryName(x.a3), value: x.v, fmt: 'num' as const, why: { key: 'fame.region', ctx: { act: a.id, a3: x.a3 } } })),
    note: l('A fama geral é a média do mundo; em cada país ela vem da origem, idioma, alcance e do que aconteceu ali (shows, paradas, imprensa, escândalos).', 'Overall fame is the world average; in each country it comes from origin, language, reach and what happened there (shows, charts, press, scandals).'),
  };
});

registerExplain('fame.region', (s, c) => {
  const a = actOf(s, c);
  const a3 = String(c.a3 ?? '');
  if (!a || !a3) return null;
  const b = base16(s, a, a3);
  const d = f16(s).d[a.id] ?? {};
  const dv = d[a3] ?? 0;
  const mk = Object.keys(d).find((k) => k.startsWith('r:') && dv === 0 && d[k]);
  const parts: WhyPart[] = P18([
    { label: fmtL(l('Base: fama {f} × {w}', 'Base: fame {f} × {w}'), { f: Math.round(a.fame), w: b.why }), value: r1(b.v), fmt: 'num' },
    b.aff !== 1 ? { label: l('Gosto local pelo gênero', 'Local taste for the genre'), value: r1(b.aff), fmt: 'mult' } : null,
    dv ? { label: l('Atividade no país (shows, paradas, imprensa, escândalos)', 'Activity in the country (shows, charts, press, scandals)'), value: r1(dv), fmt: 'signed', tone: dv >= 0 ? 'good' : 'bad' } : null,
    mk ? { label: l('Atividade na região', 'Activity in the region'), value: r1(d[mk]), fmt: 'signed', tone: d[mk] >= 0 ? 'good' : 'bad' } : null,
  ]);
  return { title: fmtL(l('{a} em {c}', '{a} in {c}'), { a: a.name, c: countryName(a3) }), value: fameIn(s, a, a3), parts, note: homeA3(a) === a3 ? l('País de origem: a base é a própria fama.', 'Home country: the base is the act\'s own fame.') : undefined };
});

// ---------------------------------------------------------------- oferta

registerExplain('offer.chance', (s, c) => {
  const a = actOf(s, c);
  if (!a) return null;
  const o = (c.offer as Omit<Offer, 'id' | 'week' | 'status'> | undefined) ?? defaultOffer(s, a);
  const ev = evaluateOffer(s, a, o);
  const parts: WhyPart[] = sortParts((ev.parts ?? []).map((p) => ({ label: p.t, value: Math.round(p.v * 100), fmt: 'signed' as const, tone: p.v >= 0 ? 'good' as const : 'bad' as const })));
  const band = ev.band === 'likely' ? l('provável', 'likely') : ev.band === 'uncertain' ? l('incerta', 'uncertain') : l('improvável', 'unlikely');
  return {
    title: fmtL(l('Chance de {a} aceitar', 'Chance {a} accepts'), { a: a.name }), value: band as unknown as string, fmt: 'text', parts,
    note: fmtL(l('Placar {p} pontos (meio da curva = 58). Leitura por faixa: sem analista na equipe a faixa é mais grosseira. Ambição principal pesa nos termos.', 'Score {p} points (curve midpoint = 58). Shown as a band: without an analyst on staff the read is rougher. Main ambition weights the terms.'), { p: Math.round(ev.score * 100) }),
  };
});

// ---------------------------------------------------------------- paradas

registerExplain('chart.pos', (s, c) => {
  const kind = c.kind === 'albums' ? 'albums' : 'singles';
  const list = s.charts[kind];
  const e = list.find((x) => x.releaseId === c.rel);
  const rel = s.releases[String(c.rel ?? '')];
  if (!e || !rel) return null;
  const above = list.find((x) => x.pos === e.pos - 1), below = list.find((x) => x.pos === e.pos + 1);
  const a = s.acts[rel.actId];
  const age = s.week - rel.week;
  const parts: WhyPart[] = P18([
    { label: l('Unidades nesta semana', 'Units this week'), value: e.units, fmt: 'num' },
    above ? { label: fmtL(l('Falta para #{p}', 'Gap to #{p}'), { p: above.pos }), value: above.units - e.units, fmt: 'num', tone: 'bad' } : { label: l('Topo da parada', 'Top of the chart'), value: '★', fmt: 'text', tone: 'good' },
    below ? { label: fmtL(l('Vantagem sobre #{p}', 'Lead over #{p}'), { p: below.pos }), value: e.units - below.units, fmt: 'num', tone: 'good' } : null,
    { label: l('Posição na semana anterior', 'Last week position'), value: e.last ? `#${e.last}` : l('estreia', 'debut').pt, fmt: 'text' },
    { label: l('Semanas desde o lançamento (vendas caem com o tempo)', 'Weeks since release (sales decay over time)'), value: age, fmt: 'num' },
    { label: l('Qualidade do disco', 'Record quality'), value: Math.round(rel.q), fmt: 'num' },
    { label: l('Apelo comercial', 'Commercial appeal'), value: Math.round(rel.appeal), fmt: 'num' },
    a ? { label: fmtL(l('Fama de {a}', '{a} fame'), { a: a.name }), value: Math.round(a.fame), fmt: 'num', why: { key: 'act.fame', ctx: { act: a.id } } } : null,
    a ? { label: fmtL(l('Hype de {a}', '{a} hype'), { a: a.name }), value: hypeOf(s, `a:${a.id}`).v, fmt: 'num', why: { key: 'act.hype', ctx: { act: a.id } } } : null,
    rel.marketing.length ? { label: l('Marketing investido', 'Marketing spent'), value: rel.marketing.reduce((t, m) => t + m.budget, 0), fmt: 'money' } : null,
  ]);
  return { title: fmtL(l('"{t}" em #{p}', '"{t}" at #{p}'), { t: rel.title, p: e.pos }), value: `#${e.pos}`, fmt: 'text', parts, note: l('A parada ordena por unidades da semana; qualidade, apelo, fama, hype e marketing movem as vendas.', 'The chart ranks by weekly units; quality, appeal, fame, hype and marketing drive sales.') };
});

// ---------------------------------------------------------------- estresse

registerExplain('stress', (s, c) => {
  const p = s.persons[String(c.person ?? '')];
  if (!p) return null;
  const so = shortOf(s, p);
  const st = stressOf(s, p.id);
  const parts: WhyPart[] = so.np.map(([t, v]) => ({ label: t, value: r1(v), fmt: 'signed' as const, tone: 'bad' as const }));
  parts.push({ label: l('Desgaste de longo prazo', 'Long-term wear'), value: st.long, fmt: 'num', note: l('sobe quando o curto passa de 40; cai devagar com férias e terapia', 'rises when short-term exceeds 40; falls slowly with holidays and therapy') });
  parts.push({ label: l('Vulnerabilidade (personalidade)', 'Vulnerability (personality)'), value: Math.round(st.vuln * 100), fmt: 'pct' });
  return {
    title: fmtL(l('Estresse de {p}', '{p}\'s stress'), { p: p.name }), value: st.short, parts,
    note: fmtL(l('Nível: {n}. Quebra só com curto > 65 e longo > 45 (risco agora {r}%).', 'Level: {n}. A breakdown only with short > 65 and long > 45 (risk now {r}%).'), { n: STRESS_LEVEL[st.level], r: Math.round(st.risk * 100) }),
  };
});

// ---------------------------------------------------------------- shows

registerExplain('show.demand', (s, c) => {
  const a = actOf(s, c);
  const city = String(c.city ?? '');
  if (!a || !cityById[city]) return null;
  const dem = cityDemand(s, a, city);
  const base = baseDraw(s, a, city);
  const h = c12(s).heat[`${a.id}:${city}`];
  const v = localDraw(s, a, city);
  const parts: WhyPart[] = P18([
    { label: l('Fãs que moram perto (núcleo, ativos, casuais × parcela da cidade)', 'Fans nearby (core, active, casual × city share)'), value: dem, fmt: 'num' },
    { label: l('Ajuste pela fama (estrelas lotam menos por fã)', 'Fame adjustment (stars draw less per fan)'), value: r1(base / Math.max(1, dem)), fmt: 'mult' },
    h ? { label: l('Histórico local (shows já feitos aqui, 70%)', 'Local history (shows already played here, 70%)'), value: Math.round(h.v), fmt: 'num', tone: 'good' } : { label: l('Mercado novo: ninguém sabe ainda', 'New market: nobody knows yet'), value: '—', fmt: 'text' },
    { label: fmtL(l('Fama em {c}', 'Fame in {c}'), { c: countryName(homeOfCity(city)) }), value: fameIn(s, a, homeOfCity(city)), fmt: 'num', why: { key: 'fame.region', ctx: { act: a.id, a3: homeOfCity(city) } } },
  ]);
  return { title: fmtL(l('Público de {a} em {c}', '{a} draw in {c}'), { a: a.name, c: cityById[city].name }), value: Math.round(v), parts, note: fmtL(l('Porte sustentável: casa nº {t}. Voltar cedo à mesma cidade satura o público.', 'Sustainable size: venue tier {t}. Coming back too soon saturates the audience.'), { t: suggestTier(s, a, city) + 1 }) };
});
const homeOfCity = (city: string): string => countryOfCity(city) ?? 'USA';

// ---------------------------------------------------------------- bolinhas de tempo

registerExplain('balls', (s) => {
  const b = balls(s);
  const parts: WhyPart[] = careerBalls(s).map((x) => ({ label: x.why, value: x.n, fmt: 'num' as const }));
  parts.push({ label: l('Expediente (bolinhas que só carreiras usam)', 'Office hours (slots only careers use)'), value: officeCap(s), fmt: 'num', tone: 'good' });
  parts.push({ label: l('Tempo pessoal do mês', 'Personal time this month'), value: maxEnergy(s), fmt: 'num', tone: 'good' });
  if (b.over.length) parts.push({ label: l('Sobrecarga (estresse e resultados piores)', 'Overbooked (stress and worse results)'), value: b.over.length, fmt: 'num', tone: 'bad' });
  return { title: l('Seu tempo', 'Your time'), value: `${energyLeft(s)}/${maxEnergy(s)}`, fmt: 'text', parts, note: l('Carreiras ocupam o expediente; o que passa dele come seu tempo pessoal. Delegar ou contratar um chefe de gabinete libera bolinhas.', 'Careers fill office hours; what spills over eats your personal time. Delegating or hiring a chief of staff frees slots.') };
});

// ---------------------------------------------------------------- opinião sobre você

registerExplain('opinion', (s, c) => {
  const key = String(c.key ?? '');
  const P = per13(s, key);
  if (!P) return null;
  const led = p13(s).op[key];
  const parts: WhyPart[] = (led?.w ?? []).slice().reverse().map(([y, m, d, w]) => ({ label: fmtL(l('{m}/{y}: {w}', '{m}/{y}: {w}'), { m: m + 1, y, w }), value: d, fmt: 'signed' as const, tone: d >= 0 ? 'good' as const : 'bad' as const }));
  const f = P.facets;
  parts.push({ label: l('Personalidade: empatia e generosidade ampliam gestos bons; teimosia e impaciência ampliam os ruins', 'Personality: empathy and generosity amplify kind gestures; stubbornness and impatience amplify bad ones'), value: `${Math.round(f.empatia)}/${Math.round(f.teimosia)}`, fmt: 'text' });
  return { title: fmtL(l('O que {n} pensa de você', 'What {n} thinks of you'), { n: P.name }), value: opinionOf(s, key), fmt: 'signed', parts, note: l('−100 a +100. Gestos recentes; o histórico antigo já está na soma.', '−100 to +100. Recent gestures; older history is already in the total.') };
});
