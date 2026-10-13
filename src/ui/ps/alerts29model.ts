// Rodada 29 (REORG, M44 da Bíblia de UI/UX) — alertas por CATEGORIA, com liga/desliga e prioridade por categoria.
// Puro (sem DOM). É PREFERÊNCIA de apresentação (localStorage do navegador, fora do save): muda o que vira destaque,
// a ordem e o que aparece como aviso flutuante. Não muda regra, chance, custo, prazo nem resposta padrão; nada é
// apagado — a caixa de entrada e o diário continuam com o registro integral, e categorias silenciadas aparecem
// contadas ("silenciadas: n"), nunca escondidas.

import { l, type L } from '../../data/world';

export const ALERT_CATS29 = ['finance', 'people', 'contracts', 'projects', 'live', 'world', 'underworld', 'legal'] as const;
export type AlertCat29 = (typeof ALERT_CATS29)[number];
export const ALERT_L29: Record<AlertCat29, { label: L; icon: string }> = {
  finance: { label: l('Finanças', 'Finance'), icon: 'money' },
  people: { label: l('Pessoas', 'People'), icon: 'people' },
  contracts: { label: l('Contratos e promessas', 'Contracts and promises'), icon: 'contract' },
  projects: { label: l('Projetos', 'Projects'), icon: 'cassette' },
  live: { label: l('Ao vivo', 'Live'), icon: 'stage' },
  world: { label: l('Mundo', 'World'), icon: 'globe' },
  underworld: { label: l('Submundo', 'Underworld'), icon: 'mask' },
  legal: { label: l('Jurídico', 'Legal'), icon: 'scroll' },
};

/** 0 = baixa, 1 = normal, 2 = alta, 3 = crítica (só ordem e destaque). */
export type AlertPrio29 = 0 | 1 | 2 | 3;
export const PRIO_L29: Record<AlertPrio29, L> = { 0: l('baixa', 'low'), 1: l('normal', 'normal'), 2: l('alta', 'high'), 3: l('crítica', 'critical') };
export interface AlertPref29 { on: boolean; prio: AlertPrio29 }
export type AlertPrefs29 = Record<AlertCat29, AlertPref29>;
export const ALERT_DEFAULTS29 = (): AlertPrefs29 => Object.fromEntries(ALERT_CATS29.map((c) => [c, { on: true, prio: c === 'finance' || c === 'contracts' ? 2 : 1 }])) as AlertPrefs29;

/** Normaliza preferências lidas do armazenamento (campos faltando = padrão; valores inválidos ignorados). */
export function alertPrefs29(raw: unknown): AlertPrefs29 {
  const out = ALERT_DEFAULTS29();
  if (raw && typeof raw === 'object') for (const c of ALERT_CATS29) {
    const x = (raw as Record<string, Partial<AlertPref29>>)[c];
    if (!x) continue;
    if (typeof x.on === 'boolean') out[c].on = x.on;
    if (x.prio === 0 || x.prio === 1 || x.prio === 2 || x.prio === 3) out[c].prio = x.prio;
  }
  return out;
}

const norm = (x: string): string => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/** Regras por texto (pt e en), da mais específica para a mais geral. */
const RULES: [AlertCat29, RegExp][] = [
  ['underworld', /submundo|crime|criminos|mafia|payola|suborno|golpe|fraude|sosia|contraband|extors|underworld|mob\b|bribe|scam|fraud|fake/],
  ['legal', /processo|tribunal|juridic|advogad|juiz|censura|liminar|multa|direitos autora|copyright|lawsuit|court|legal|lawyer|judge|censor/],
  ['contracts', /contrat|promessa|clausula|assinatura|assinou|renova|royalt|adiantament|oferta|proposta|contract|promise|clause|royalt|advance|offer|signed|renew/],
  ['live', /show|turne|festival|palco|ingresso|casa de show|temporada|apresenta|tour|gig|stage|ticket|venue|concert/],
  ['projects', /disco|album|gravac|estudio|lancament|single|compos|faixa|repertorio|cancao|cancoes|record|studio|release|track|song|repertoire|writing/],
  ['finance', /caixa|divida|emprestim|imposto|falen|lucro|prejuiz|receita|despesa|fechamento|\$|cash|debt|loan|tax|profit|loss|revenue|bankrupt/],
  ['people', /saude|integrante|banda|artista|moral|estresse|cansac|equipe|funcionari|salario|familia|relacion|health|member|band|artist|morale|stress|staff|salary|family/],
  ['world', /parada|rival|gravadora|mercado|premio|cena|genero|imprensa|jornal|critic|boato|era\b|chart|rival|label|market|award|scene|press|rumor|critic/],
];
/** Categoria de alerta pelo texto (assunto + corpo) e, se houver, pela categoria da caixa (InboxCat18). */
export function alertCat29(text: string, inboxCat?: string): AlertCat29 {
  const x = norm(text);
  // notas do mundo (era, política, mercado) vêm marcadas "Mundo: …" / "Marco da indústria": são contexto do Mundo
  if (/(^|\s)(mundo|world|marco da industria|industry milestone)\s*:/.test(x) || /marco da industria|industry milestone/.test(x)) return 'world';
  for (const [c, re] of RULES) if (re.test(x)) return c;
  if (inboxCat === 'money' || inboxCat === 'analyst') return 'finance';
  if (inboxCat === 'deals') return 'contracts';
  if (inboxCat === 'people' || inboxCat === 'staff' || inboxCat === 'life') return 'people';
  if (inboxCat === 'press' || inboxCat === 'world') return 'world';
  return 'world';
}

export interface AlertItem29 { key: string; text: string; /** texto curto para mostrar (sem o assunto genérico) */ show?: string; cat?: string; prio?: number; unread?: boolean }
export interface AlertGroup29 { cat: AlertCat29; on: boolean; prio: AlertPrio29; total: number; unread: number; top?: AlertItem29 }
/** Resumo por categoria, ordenado pela prioridade escolhida (depois pelas não lidas). Silenciadas vão ao fim, contadas. */
export function alertGroups29(items: AlertItem29[], prefs: AlertPrefs29): AlertGroup29[] {
  const g = new Map<AlertCat29, AlertGroup29>(ALERT_CATS29.map((c) => [c, { cat: c, on: prefs[c].on, prio: prefs[c].prio, total: 0, unread: 0 }]));
  for (const it of items) {
    const c = alertCat29(it.text, it.cat);
    const x = g.get(c)!;
    x.total++;
    if (it.unread) { x.unread++; if (!x.top || (it.prio ?? 0) > (x.top.prio ?? 0)) x.top = it; }
  }
  return [...g.values()].sort((a, b) => Number(b.on) - Number(a.on) || b.prio - a.prio || b.unread - a.unread || ALERT_CATS29.indexOf(a.cat) - ALERT_CATS29.indexOf(b.cat));
}

/** Avisos flutuantes do avanço: só categorias ligadas, na ordem de prioridade; as silenciadas só entram na contagem
 *  "+N outros" (a lista completa continua a mesma). Devolve a ordem e quantas foram silenciadas. */
export function toastOrder29<T extends { text: L }>(xs: T[], prefs: AlertPrefs29): { shown: T[]; muted: T[] } {
  const withCat = xs.map((x, i) => ({ x, i, c: alertCat29(`${x.text.pt} ${x.text.en}`) }));
  const shown = withCat.filter((y) => prefs[y.c].on).sort((a, b) => prefs[b.c].prio - prefs[a.c].prio || a.i - b.i).map((y) => y.x);
  const muted = withCat.filter((y) => !prefs[y.c].on).map((y) => y.x);
  return { shown, muted };
}
