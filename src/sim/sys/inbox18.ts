// Rodada 18 (U2) — Inbox 2.0 (vista tipada: categoria, prioridade, "ir para") e o analista do Conselheiro v2:
// fôlego de caixa, lançamento abaixo da previsão, jogadas de rivais, oportunidades, estresse do elenco e
// mensagens vencendo — cada dica com o porquê, o efeito estimado e uma ação. Relatório mensal do analista.

import { formatMoney } from '../../core/money';
import { hashString } from '../../core/rng';
import { genreById, l, type L } from '../../data/world';
import { monthlyCosts } from '../economy';
import { registerSimHook } from '../ext4';
import { recentFacts } from '../facts17';
import {
  advisorTips18, inboxKind18, isArchived18, ib18, pushInbox18, registerAdvisorTip, registerInboxKind, snoozed18,
  type AdvTip18, type Goto18, type InboxCat18,
} from '../inbox18';
import { stressOf } from '../stress17';
import type { GameState } from '../types';
import { fmtL, money, playerActs, staffCount } from '../util';
import { expectedFor } from './explain8';
import { CAT18 } from './why18';
import { MSG_HANDLERS, inboxItems, type InboxItem } from './people/inbox';
import { P, trackedPersons, type InboxMsg } from './people/state';

// ---------------------------------------------------------------- respostas dos tipos registrados

MSG_HANDLERS.k18 = (s, m, action, r) => {
  const k = inboxKind18(String(m.ref?.k18 ?? ''));
  return k?.handle ? k.handle(s, m, action, r) : l('Anotado.', 'Noted.');
};

// ---------------------------------------------------------------- vista tipada

export const CAT18_NAME: Record<InboxCat18, L> = {
  decision: l('Decisões', 'Decisions'), people: l('Elenco e pessoas', 'Roster and people'), deals: l('Negócios', 'Deals'), money: l('Finanças', 'Finances'),
  press: l('Imprensa e fãs', 'Press and fans'), world: l('Mercado e rivais', 'Market and rivals'), staff: l('Equipe', 'Staff'), life: l('Vida pessoal', 'Personal life'),
  analyst: l('Relatórios', 'Reports'), other: l('Outros', 'Other'),
};
export interface Item18 extends InboxItem { cat: InboxCat18; prio: number; goto: Goto18 | null; label?: L }

const MSG_CAT: Record<InboxMsg['kind'], InboxCat18> = { request: 'people', complaint: 'people', promise: 'people', health: 'people', staff: 'staff', owner: 'life', secret: 'press', info: 'other', fan: 'press', deal: 'deals' };
function noteCat(txt: string): InboxCat18 {
  const x = txt.toLowerCase();
  if (/contrat|assin|oferta|proposta|acordo|licen/.test(x)) return 'deals';
  if (/caixa|dívida|empréstim|imposto|falên|\$|lucro|prejuízo/.test(x)) return 'money';
  if (/boato|escând|imprensa|jornal|crític|manchete|fã/.test(x)) return 'press';
  if (/parada|nº 1|rival|selo |mercado|prêmio/.test(x)) return 'world';
  if (/equipe|funcionári|salário/.test(x)) return 'staff';
  return 'other';
}
function gotoOf(s: GameState, m: InboxMsg): Goto18 | null {
  const r = m.ref ?? {};
  if (r.k18) { const k = inboxKind18(String(r.k18)); const g = k?.goto?.(s, m); if (g) return g; }
  if (r.person && s.persons[String(r.person)]) return { person: `p:${r.person}` };
  if (r.act && s.acts[String(r.act)]) return { act: String(r.act) };
  if (r.staff) return { area: 'team' };
  if (m.kind === 'owner') return { area: 'you' };
  return null;
}

/** Itens da caixa de entrada com categoria, prioridade (0–3) e destino; arquivados ficam de fora (ou só eles). */
export function items18(s: GameState, o: { archived?: boolean } = {}): Item18[] {
  const out: Item18[] = [];
  for (const it of inboxItems(s)) {
    const key = it.source === 'notification' ? `n${it.week}:${hashString(it.body.pt)}` : it.key;
    if (isArchived18(s, key) !== !!o.archived) continue;
    let cat: InboxCat18 = 'other', prio = 0, goto: Goto18 | null = null, label: L | undefined;
    if (it.source === 'decision') { cat = 'decision'; prio = 3; }
    else if (it.msg) {
      const m = it.msg;
      const k = m.ref?.k18 ? inboxKind18(String(m.ref.k18)) : undefined;
      cat = k?.cat ?? MSG_CAT[m.kind] ?? 'other';
      label = k?.label;
      prio = k?.prio ?? (m.kind === 'secret' || m.kind === 'health' ? 2 : m.tone === 'bad' ? 1 : 0);
      if (m.actions?.length && !m.resolved) prio += 1;
      if (m.expires && !m.resolved && m.expires - s.week <= 2) prio += 1;
      goto = gotoOf(s, m);
    } else {
      cat = noteCat(it.body.pt);
      prio = it.tone === 'bad' ? 1 : 0;
    }
    out.push({ ...it, key, cat, prio: Math.min(3, prio), goto, label });
  }
  return out;
}

// ---------------------------------------------------------------- analista: dicas com porquê e ação

export const usd18 = (c: number): L => l(formatMoney(Math.round(c), 'pt-BR'), formatMoney(Math.round(c), 'en-US'));
const mine = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');

registerAdvisorTip('core18', (s) => {
  const out: AdvTip18[] = [];
  // 1. fôlego do caixa
  const net = Object.values(s.lastMonthLedger).reduce((a, b) => a + b, 0);
  if (net < 0 && s.player.cash > 0) {
    const run = s.player.cash / -net;
    if (run < 8) {
      const costs = Object.entries(s.lastMonthLedger).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).slice(0, 2);
      const fx = monthlyCosts(s);
      const cheap = [...s.player.staff].sort((a, b) => a.skill - b.skill)[0];
      out.push({
        id: 'c18-runway', cat: 'cash', level: run < 3 ? 'bad' : 'warn', score: 100 - run * 6,
        text: fmtL(l('Fôlego de caixa: ~{n} meses no ritmo do último mês.', 'Cash runway: ~{n} months at last month\'s pace.'), { n: Math.max(0, Math.floor(run)) }),
        why: [fmtL(l('Maiores saídas: {c}.', 'Biggest outflows: {c}.'), { c: costs.length ? l(costs.map(([k, v]) => `${CAT18[k]?.pt ?? k} ${usd18(v).pt}`).join(', '), costs.map(([k, v]) => `${CAT18[k]?.en ?? k} ${usd18(v).en}`).join(', ')) : '—' }),
          fmtL(l('Custos fixos/mês (aluguel, salários, terceiros): {v}.', 'Fixed costs/month (rent, salaries, outsourcing): {v}.'), { v: usd18(fx.rent + fx.salaries + fx.outsourcing) })],
        effect: cheap ? fmtL(l('Dispensar {n} economiza {v}/mês (e mexe na moral da equipe).', 'Letting {n} go saves {v}/mo (and dents staff morale).'), { n: cheap.name, v: usd18(cheap.salary) }) : l('Vender masters antigas ou um empréstimo compram tempo.', 'Selling old masters or a loan buys time.'),
        goto: { area: 'finance', label: l('Ver finanças', 'Open finances') },
      });
    }
  }
  // 2. lançamento abaixo da previsão
  for (const a of mine(s)) {
    const rid = a.releases[a.releases.length - 1];
    const rel = rid ? s.releases[rid] : undefined;
    if (!rel || rel.fc === undefined) continue;
    const age = s.week - rel.week;
    if (age < 3 || age > 14) continue;
    const exp = expectedFor(rel, age) ?? 0;
    const got = rel.weekly.slice(0, age).reduce((t, x) => t + x, 0);
    if (exp <= 0 || got >= exp * 0.6) continue;
    const worst = (rel.autopsy ?? []).filter((x) => x.value < 1).sort((x, y) => x.value - y.value)[0];
    out.push({
      id: `c18-flop-${rel.id}`, cat: 'release', level: 'warn', score: 70 + (1 - got / exp) * 20,
      text: fmtL(l('"{t}" ({a}) está abaixo da previsão: {g} de {e} unidades esperadas.', '"{t}" ({a}) is under forecast: {g} of {e} expected units.'), { t: rel.title, a: a.name, g: Math.round(got), e: Math.round(exp) }),
      why: [worst ? fmtL(l('Pior fator: {f}.', 'Worst factor: {f}.'), { f: worst.label }) : l('Sem leitura detalhada ainda (a autópsia sai com 10 semanas).', 'No detailed reading yet (the autopsy comes at 10 weeks).'),
        l('Discos que não pegam em 6 semanas raramente se recuperam sozinhos.', 'Records that don\'t catch on in 6 weeks rarely recover alone.')],
      effect: l('Um single de apoio, marketing extra ou shows nas cidades fortes podem salvar 20–40% das vendas.', 'A follow-up single, extra marketing or shows in strong cities can save 20–40% of sales.'),
      goto: { act: a.id, label: l('Abrir o artista', 'Open the act') },
    });
  }
  // 3. jogadas de rivais
  const myGenres = new Set(mine(s).map((a) => a.genre));
  const myIds = new Set(playerActs(s));
  for (const f of recentFacts(s, { kinds: ['signing', 'poach'], months: 2, notSecret: true, limit: 12 })) {
    const act = f.actors.map((x) => s.acts[x]).find(Boolean);
    if (!act) continue;
    const vsMe = f.kind === 'poach' && f.actors.some((x) => myIds.has(x));
    if (!vsMe && (act.owner === 'player' || act.fame < 25 || !myGenres.has(act.genre))) continue;
    out.push({
      id: `c18-rival-${f.id}`, cat: 'rival', level: vsMe ? 'bad' : 'info', score: vsMe ? 85 : 35 + act.fame / 4,
      text: f.text, why: [vsMe ? l('Um rival levou alguém do seu elenco.', 'A rival took someone from your roster.') : fmtL(l('Concorre no seu gênero ({g}).', 'Competes in your genre ({g}).'), { g: genreById[act.genre]?.name ?? l(act.genre, act.genre) })],
      effect: l('Reforce a promoção dos seus atos do gênero ou procure o próximo nome antes deles.', 'Boost promotion for your acts in the genre or find the next name before they do.'),
      goto: { act: act.id, label: l('Ver o artista', 'See the act') },
    });
    if (out.filter((x) => x.cat === 'rival').length >= 2) break;
  }
  // 4. oportunidades: atos conhecidos, livres e em alta; gênero em alta sem ninguém seu
  const opp = Object.keys(s.knowledge).map((id) => s.acts[id]).filter((a) => a && !a.owner && (a.status === 'active' || a.status === 'emerging') && a.momentum >= 60)
    .sort((a, b) => b.momentum - a.momentum).slice(0, 2);
  for (const a of opp) out.push({
    id: `c18-opp-${a.id}`, cat: 'opportunity', level: 'good', score: 40 + a.momentum / 5,
    text: fmtL(l('{a} está em alta (embalo {m}) e sem contrato.', '{a} is hot (momentum {m}) and unsigned.'), { a: a.name, m: Math.round(a.momentum) }),
    why: [fmtL(l('Você já conhece o ato (grau {d}/5).', 'You already know the act (degree {d}/5).'), { d: s.knowledge[a.id]?.degree ?? 1 }), l('Quanto mais fama, mais rivais na disputa e mais caro.', 'More fame means more rival bidders and a higher price.')],
    effect: l('Fazer a oferta agora sai mais barato do que depois do próximo sucesso.', 'Offering now is cheaper than after their next hit.'),
    goto: { act: a.id, label: l('Ver e ofertar', 'View and offer') },
  });
  const hot = Object.entries(s.genrePop).filter(([g, v]) => v >= 1.15 && (genreById[g]?.born ?? 0) <= s.year && !myGenres.has(g)).sort((a, b) => b[1] - a[1])[0];
  if (hot && playerActs(s).length) out.push({
    id: `c18-hot-${hot[0]}`, cat: 'opportunity', level: 'info', score: 32,
    text: fmtL(l('{g} está em alta e você não tem ninguém no gênero.', '{g} is hot and you have nobody in the genre.'), { g: genreById[hot[0]]?.name ?? l(hot[0], hot[0]) }),
    why: [fmtL(l('Popularidade do gênero: ×{v}.', 'Genre popularity: ×{v}.'), { v: Math.round(hot[1] * 100) / 100 })],
    effect: l('Olheiros focados no gênero encontram nomes em 1–2 meses.', 'Scouts focused on the genre find names in 1–2 months.'),
    goto: { area: 'market', label: l('Ir ao mercado', 'Go to market') },
  });
  // 5. estresse do elenco
  for (const p of trackedPersons(s)) {
    if (p.isPlayer) continue;
    const st = stressOf(s, p.id);
    if (st.level !== 'breaking' && st.level !== 'strained') continue;
    out.push({
      id: `c18-stress-${p.id}`, cat: 'people', level: st.level === 'breaking' ? 'bad' : 'warn', score: st.level === 'breaking' ? 88 : 55 + st.short / 5,
      text: fmtL(l('{p} está {n} (estresse {v}).', '{p} is {n} (stress {v}).'), { p: p.name, n: st.level === 'breaking' ? l('à beira de quebrar', 'close to breaking') : l('sob pressão', 'under strain'), v: st.short }),
      why: st.why.slice(0, 2),
      effect: l('Folga ou terapia: −10 a −20 de estresse; uma quebra custa meses de agenda e pode virar escândalo.', 'Time off or therapy: −10 to −20 stress; a breakdown costs months and can become a scandal.'),
      goto: { person: `p:${p.id}`, label: l('Ver a pessoa', 'See the person') },
    });
  }
  // 6. mensagens vencendo
  const due = P(s).inbox.filter((m) => !m.resolved && m.actions?.length && m.expires && m.expires - s.week <= 2 && m.expires >= s.week);
  if (due.length) out.push({
    id: 'c18-due', cat: 'other', level: 'warn', score: 58,
    text: fmtL(l('{n} mensagem(ns) vencem em até 2 semanas.', '{n} message(s) expire within 2 weeks.'), { n: due.length }),
    why: [l('Sem resposta, vale a última opção (o padrão), que costuma ser a pior.', 'Unanswered, the last option (the default) applies — usually the worst.')],
    goto: { area: 'cockpit', label: l('Abrir a caixa', 'Open the inbox') },
  });
  return out.filter((t) => !snoozed18(s, t.id));
});

// ---------------------------------------------------------------- relatório mensal do analista

registerInboxKind('analyst', { label: l('Relatório do analista', 'Analyst report'), cat: 'analyst', icon: 'chart-up', prio: 0, goto: () => ({ area: 'cockpit' }) });

registerSimHook('month', 'inbox18:analyst', (s) => {
  const every = staffCount(s, 'analyst') ? 1 : 3;
  const mk = s.year * 12 + s.month;
  const st = ib18(s);
  if (st.rep >= 0 && mk - st.rep < every) return;
  const tips = advisorTips18(s).slice(0, 3);
  if (!tips.length) return;
  st.rep = mk;
  const who = s.player.staff.find((x) => x.role === 'analyst')?.name ?? l('Assessoria', 'Advisory desk').pt;
  pushInbox18(s, 'analyst', {
    from: who,
    subject: l('Relatório do mês: o que olhar agora', 'Monthly report: what to look at now'),
    body: { pt: tips.map((t, i) => `${i + 1}. ${t.text.pt}${t.effect ? ` → ${t.effect.pt}` : ''}`).join(' '), en: tips.map((t, i) => `${i + 1}. ${t.text.en}${t.effect ? ` → ${t.effect.en}` : ''}`).join(' ') },
  });
});

export const _inbox18 = { noteCat, money };
