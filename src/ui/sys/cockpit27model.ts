// Rodada 27 (COCK) — o MODELO do Cockpit enxuto, função pura do estado (sem DOM: testável em tests/r27-cockpit.test.ts).
// O Cockpit virou a 1ª seção do menu e a página inicial; a análise achou "Decisões (0)" repetido 3×, itens de baixa
// prioridade acima da dobra e ~1.200 palavras no fim do ano 1. Agora o painel tem só:
//   1. "Agora": até 3 ações por prioridade (decisões com prazo, próximo passo da jornada, alerta de caixa) — as mesmas
//      do "Precisa de você" da sede (hq25model.needs), para as duas telas nunca discordarem;
//   2. a faixa do mês: data, caixa, fôlego e fama;
//   3. no máximo 4 cartões (compromissos, projetos, caixa de entrada, elenco) — cartão vazio não ocupa espaço:
//      vira uma linha só ("Ainda vazio: …");
//   4. "Ver mais": links para a Mesa do mês (aba) e as páginas próprias.
// Regras: um único contador de decisões na tela (o "Mais N decisões" do Agora) e nenhum "(0)".

import { l, type L } from '../../data/world';
import { formatMoney } from '../../core/money';
import { calendar19 } from '../../sim/calendar19';
import type { Goto18 } from '../../sim/inbox18';
import { items18 } from '../../sim/sys/inbox18';
import { STAGE_NAMES, openProjects, projectStage } from '../../sim/sys/project8';
import { slack } from '../../sim/sys/project12';
import { PROM28_NAME, promiseRows28 } from '../../sim/sys/promises28';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { hqModel25, runway25, type Goto25, type Need25 } from '../ps/hq25model';
import type { Kpi27, Tone27 } from '../ps/ui27model';

export const AGORA_MAX27 = 3;
export const CARDS_MAX27 = 4;
export const ROWS_MAX27 = 3;

export type CardId27 = 'commit' | 'proj' | 'inbox' | 'cast';
export interface Row27m { id: string; title: L | string; meta?: L | string; aside?: L | string; tone?: Tone27; go?: Goto25; hub?: { actId: string; pid: string } }
export interface Card27m { id: CardId27; title: L; icon: string; rows: Row27m[]; foot?: L; action: { label: L; go: Goto25 } }
export interface More27 { id: string; label: L; go: Goto25 }
export interface Cockpit27 {
  sub: L;
  agora: Need25[];
  /** decisões que não couberam no "Agora" (o único contador de decisões da tela) */
  agoraMore?: L;
  strip: Kpi27[];
  cards: Card27m[];
  /** cartões sem conteúdo agora (viram uma linha só) */
  empty: { id: CardId27; title: L }[];
  more: More27[];
}

const INBOX: Goto25 = { area: 'cockpit', tab: ['ck20', 'inbox'] };
const DESK: Goto25 = { area: 'cockpit', tab: ['ck20', 'desk'] };
const pl = (n: number, one: L, many: L): L => (n === 1 ? one : many);
const live = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && !(a as { deceased?: boolean }).deceased);

/** Faixa do mês: data (texto pronto, vem da interface), caixa, fôlego e fama. */
export function strip27(s: GameState, loc: string, date: string): Kpi27[] {
  const rw = runway25(s);
  const acts = live(s).sort((a, b) => b.fame - a.fame);
  const top = acts[0];
  const rwN = rw === null ? 0 : Math.floor(rw);
  const rwV = rw === null ? l('estável', 'stable') : rw <= 0 ? l('sem caixa', 'no cash') : rw < 1 ? l('< 1 mês', '< 1 month') : fmtL(pl(rwN, l('~{n} mês', '~{n} month'), l('~{n} meses', '~{n} months')), { n: rwN });
  return [
    { label: l('Mês', 'Month'), value: date },
    { label: l('Caixa', 'Cash'), value: formatMoney(s.player.cash, loc), tone: s.player.cash < 0 ? 'bad' : 'neutral', go: 'finance' },
    { label: l('Fôlego', 'Runway'), value: loc.startsWith('en') ? rwV.en : rwV.pt, tone: rw === null ? 'good' : rw < 3 ? 'bad' : rw < 6 ? 'warn' : 'neutral', hint: l('no ritmo do último mês', 'at last month\'s pace'), go: 'finance' },
    { label: l('Fama', 'Fame'), value: top ? String(Math.round(top.fame)) : '—', hint: top ? l(top.name, top.name) : l('sem elenco', 'no roster'), tone: top ? 'neutral' : 'neutral', go: 'artists' },
  ];
}

/** r28 (C7): promessas abertas (verba comprometida, prazo, multa) entram primeiro nos compromissos. */
function promises(s: GameState): Row27m[] {
  let xs: ReturnType<typeof promiseRows28> = [];
  try { xs = promiseRows28(s).filter((r) => r.state === 'open'); } catch { xs = []; }
  return xs.slice(0, 2).map((r) => ({
    id: `prom28:${r.actId}:${r.kind}`,
    title: fmtL(l('Promessa a {a}: {k}', 'Promise to {a}: {k}'), { a: r.act, k: PROM28_NAME[r.kind] }),
    meta: fmtL(l('verba {b} · multa {m}', 'budget {b} · penalty {m}'), { b: usd(r.budget - r.spent), m: usd(r.penalty) }),
    aside: r.met ? l('atendida', 'met') : r.kind === 'freedom' ? l('contrato todo', 'whole deal') : fmtL(l('vence em {n} sem.', 'due in {n} wk'), { n: Math.max(0, r.weeksLeft) }),
    tone: r.met ? 'good' : r.kind !== 'freedom' && r.weeksLeft < 8 ? 'warn' : undefined, go: { act: r.actId } as Goto25,
  }));
}
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

function commit(s: GameState): Row27m[] {
  let xs: ReturnType<typeof calendar19> = [];
  try { xs = calendar19(s, { weeks: 4 }); } catch { xs = []; }
  const pr = promises(s);
  return [...pr, ...xs.filter((d) => d.kind !== 'decision' && d.kind !== 'msg' && d.w0 === undefined).slice(0, ROWS_MAX27).map((d): Row27m => ({
    id: d.id, title: d.t, meta: d.d,
    aside: d.w <= s.week ? l('esta semana', 'this week') : fmtL(l('em {n} sem.', 'in {n} wk'), { n: d.w - s.week }),
    tone: d.tone === 'bad' ? 'bad' : undefined, go: d.goto as Goto25 | undefined,
  }))].slice(0, ROWS_MAX27);
}

function proj(s: GameState): Row27m[] {
  let xs: ReturnType<typeof openProjects> = [];
  try { xs = openProjects(s).filter((p) => { const a = s.acts[p.actId]; return !!a && (a.owner === 'player' || !!a.playerBand); }); } catch { xs = []; }
  return xs.slice(0, ROWS_MAX27).map((p) => {
    let sl: number | null = null;
    try { sl = slack(s, p); } catch { sl = null; }
    const name = s.acts[p.actId]?.name ?? '—';
    return {
      id: p.id, title: `${name}: ${p.title || p.type.toUpperCase()}`, meta: STAGE_NAMES[projectStage(s, p)],
      aside: sl === null ? undefined : sl < 0 ? fmtL(l('atrasado {n} sem.', '{n} wk behind'), { n: -sl }) : fmtL(l('folga {n} sem.', '{n} wk slack'), { n: sl }),
      tone: sl !== null && sl < 0 ? 'bad' : undefined, hub: { actId: p.actId, pid: p.id },
    };
  });
}

/** Caixa de entrada sem as decisões (essas já estão no "Agora"): as 3 mais importantes não lidas. */
function inbox(s: GameState): { rows: Row27m[]; foot?: L } {
  let xs: ReturnType<typeof items18> = [];
  try { xs = items18(s).filter((x) => x.cat !== 'decision'); } catch { xs = []; }
  const unread = xs.filter((x) => x.unread).sort((a, b) => b.prio - a.prio || b.year - a.year || b.week - a.week);
  const rows = unread.slice(0, ROWS_MAX27).map((x) => ({
    // avisos do mês têm assunto genérico ('Alerta'): o texto é o que importa
    id: x.key, title: x.source === 'notification' ? x.body : x.subject, meta: x.source === 'notification' ? x.subject : x.from ? l(x.from, x.from) : undefined,
    tone: (x.tone === 'bad' ? 'bad' : x.tone === 'good' ? 'good' : undefined) as Tone27 | undefined, go: (x.goto ?? INBOX) as Goto18 as Goto25,
  }));
  const rest = unread.length - rows.length;
  return { rows, foot: rest > 0 ? fmtL(pl(rest, l('+{n} mensagem não lida', '+{n} unread message'), l('+{n} mensagens não lidas', '+{n} unread messages')), { n: rest }) : undefined };
}

function cast(s: GameState): Row27m[] {
  return live(s).sort((a, b) => b.fame - a.fame).slice(0, ROWS_MAX27).map((a) => ({
    id: a.id, title: a.name,
    meta: a.status === 'hiatus' ? l('em pausa', 'on hiatus') : fmtL(l('momento {m}', 'momentum {m}'), { m: Math.round(a.momentum) }),
    aside: fmtL(l('fama {n}', 'fame {n}'), { n: Math.round(a.fame) }), tone: a.status === 'hiatus' ? 'warn' : undefined, go: { act: a.id },
  }));
}

/** O Cockpit inteiro (painel). `date` é o rótulo do mês já traduzido (ex.: "Janeiro 1962"). */
export function cockpit27(s: GameState, loc = 'pt-BR', date = `${s.month + 1}/${s.year}`): Cockpit27 {
  let agora: Need25[] = [];
  try { agora = hqModel25(s).needs.slice(0, AGORA_MAX27); } catch { agora = []; }
  // decisões fora do "Agora" (o caixa ou o próximo passo passaram na frente): uma linha só, com o número
  const shown = agora.filter((n) => n.id.startsWith('dec:') && n.id !== 'dec:more').length;
  const extra = agora.some((n) => n.id === 'dec:more') ? 0 : (s.decisions?.length ?? 0) - shown;
  const agoraMore = extra > 0 ? fmtL(pl(extra, l('+{n} decisão na caixa de entrada', '+{n} decision in the inbox'), l('+{n} decisões na caixa de entrada', '+{n} decisions in the inbox')), { n: extra }) : undefined;
  const ib = inbox(s);
  const all: Card27m[] = [
    { id: 'commit', title: l('Próximos compromissos', 'Upcoming commitments'), icon: 'clock', rows: commit(s), action: { label: l('Calendário', 'Calendar'), go: { area: 'calendar19' } } },
    { id: 'proj', title: l('Projetos em andamento', 'Projects in progress'), icon: 'disc', rows: proj(s), action: { label: l('Projetos', 'Projects'), go: { area: 'project' } } },
    { id: 'inbox', title: l('Caixa de entrada', 'Inbox'), icon: 'newspaper', rows: ib.rows, foot: ib.foot, action: { label: l('Abrir a caixa', 'Open the inbox'), go: INBOX } },
    { id: 'cast', title: l('Elenco em destaque', 'Roster highlights'), icon: 'guitar', rows: cast(s), action: { label: l('Elenco', 'Roster'), go: { area: 'artists' } } },
  ];
  const cards = all.filter((c) => c.rows.length).slice(0, CARDS_MAX27);
  return {
    sub: s.decisions.length
      ? l('Decisões ignoradas aplicam a opção padrão ao avançar.', 'Ignored decisions apply the default option when you advance.')
      : l('Nada pendente: dá para avançar o mês.', 'Nothing pending: you can advance the month.'),
    agora, agoraMore, strip: strip27(s, loc, date), cards,
    empty: all.filter((c) => !c.rows.length).map((c) => ({ id: c.id, title: c.title })),
    more: [
      { id: 'desk', label: l('Mesa do mês (resumo, ofertas, metas, rumores)', 'Monthly desk (briefing, offers, goals, rumors)'), go: DESK },
      { id: 'plan', label: l('Central de decisões', 'Decision hub'), go: { area: 'plan' } },
      { id: 'goals', label: l('Metas e conquistas', 'Goals and achievements'), go: { area: 'goals' } },
      { id: 'sede', label: l('Sua sede', 'Your HQ'), go: { area: 'sede25' } },
    ],
  };
}

/** Todos os textos do painel (pt), na ordem — para os testes de ruído (contadores repetidos, "(0)"). */
export function texts27(m: Cockpit27): string[] {
  const s = (x: L | string | undefined): string => (x === undefined ? '' : typeof x === 'string' ? x : x.pt);
  return [
    s(m.sub),
    ...m.agora.flatMap((n) => [s(n.title), s(n.why), s(n.cta)]), s(m.agoraMore),
    ...m.strip.flatMap((k) => [s(k.label), k.value, s(k.hint)]),
    ...m.cards.flatMap((c) => [s(c.title), ...c.rows.flatMap((r) => [s(r.title), s(r.meta), s(r.aside)]), s(c.foot), s(c.action.label)]),
    ...m.empty.map((e) => s(e.title)),
    ...m.more.map((x) => s(x.label)),
  ].filter(Boolean);
}
