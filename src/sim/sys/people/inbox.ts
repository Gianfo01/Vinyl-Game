// Caixa de entrada por era (Football Manager): mensagens dos sistemas de pessoas (pedidos, promessas,
// reclamações, saúde, equipe, chantagem) com resposta direta. A interface junta isto às notificações
// e decisões existentes, com o meio de cada época (carta, telegrama, telefonema, fax, e-mail, mensagem).

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import type { GameState } from '../../types';
import { attn, resolveAttn, seeAttn } from '../../attention';
import { fmtL, money, post } from '../../util';
import { P, actOf, addMsg, clamp01, mediumFor, trackedPersons, type InboxMsg, type Medium } from './state';
import { activeThoughts, addThought, thoughtText } from './thoughts';
import { startTreatment, type Treatment } from './health';
import { answerRaise } from './staff';
import { personalAdvance } from './life';
import { delSecKnownBy, dossierById, leakSecret } from './secrets';
import { talk } from './talks';
import { cashWhy20, freeCash20 } from '../../oblig20';
import { isSeen18 } from '../../inbox18';
import { rng19 } from '../../rng19';

/**
 * Rodada 8: respostas de mensagens de outros sistemas (convites de feat, propostas). A mensagem leva
 * `kind: 'deal'` e `ref.sys` com a chave do tratador; o tratador devolve o texto do resultado.
 */
/** r18 decide18: ouvintes de resposta (ecos atrasados). */
export const MSG_AFTER18: ((s: GameState, m: InboxMsg, action: string) => void)[] = [];
export const MSG_HANDLERS: Record<string, (s: GameState, m: InboxMsg, action: string, r: Rng) => L> = {};

export function msgMedium(m: { year: number; tone?: string; kind?: string }): Medium {
  return mediumFor(m.year, m.tone === 'bad' || m.kind === 'health' || m.kind === 'secret');
}

/** Responde uma mensagem. Devolve o texto do resultado. */
export function answerMsg(s: GameState, msgId: string, action: string, r: Rng = rng19(s, 'act')): L {
  const st = P(s);
  const m = st.inbox.find((x) => x.id === msgId);
  if (!m || m.resolved) return l('Mensagem já respondida.', 'Message already answered.');
  if (!m.actions?.some((a) => a.id === action)) return l('Resposta inválida.', 'Invalid reply.');
  const ref = m.ref ?? {};
  let out: L = l('Respondido.', 'Answered.');
  switch (m.kind) {
    case 'health': {
      const pid = String(ref.person);
      if (action === 'ignore') {
        const p = s.persons[pid];
        if (p) p.stress = clamp01(p.stress + 5);
        out = l('Vida que segue. O problema continua.', 'Life goes on. So does the problem.');
      } else {
        const err = startTreatment(s, pid, action as Treatment);
        if (err) return err;
        out = l('Tratamento marcado.', 'Treatment booked.');
      }
      break;
    }
    case 'staff':
      out = answerRaise(s, String(ref.staff), action as 'full' | 'half' | 'refuse');
      break;
    case 'request': {
      const pid = String(ref.person);
      if (action === 'lend') {
        const err = personalAdvance(s, pid, Number(ref.amount));
        if (err) return err;
        out = l('Dinheiro enviado; entra no saldo a recuperar.', 'Money sent; it is added to the recoup balance.');
      } else {
        const act = actOf(s, pid);
        if (act) act.trust = clamp01(act.trust - 4);
        addThought(s, pid, 'unpaid');
        out = l('Recusado.', 'Refused.');
      }
      break;
    }
    case 'secret': {
      const sec = dossierById(s, String(ref.secret));
      if (!sec) break;
      if (action === 'pay') {
        const amount = Number(ref.amount);
        if (freeCash20(s) < amount) return cashWhy20(s, amount, l('Caixa insuficiente.', 'Not enough cash.'));
        post(s, `hushpay:${sec.id}`, -amount, 'legal', 'Acordo confidencial');
        delSecKnownBy(s, sec, String(ref.label));
        out = l('Pago. Por enquanto, silêncio.', 'Paid. Silence, for now.');
      } else {
        const lb = s.labels[String(ref.label)];
        leakSecret(s, sec, l(lb?.name ?? 'Um rival', lb?.name ?? 'A rival'));
        s.rivalries[String(ref.label)] = (s.rivalries[String(ref.label)] ?? 0) + 10;
        out = l('Você recusou. O rival vazou a história.', 'You refused. The rival leaked the story.');
      }
      break;
    }
    case 'complaint': {
      const pid = String(ref.person ?? '');
      if (!pid) break;
      if (action === 'ignore') {
        const act = actOf(s, pid);
        if (act) act.trust = clamp01(act.trust - 2);
        out = l('Sem resposta. Isso também é uma resposta.', 'No reply. That is also a reply.');
      } else {
        const res = action === 'promise_single' ? talk(s, pid, 'promise', 'single') : talk(s, pid, action as 'praise' | 'patience');
        if (!res.ok) return res.text;
        out = res.text;
      }
      break;
    }
    case 'deal': {
      const fn = MSG_HANDLERS[String(ref.sys ?? '')];
      if (fn) out = fn(s, m, action, r);
      break;
    }
    default:
      break;
  }
  m.resolved = action;
  m.read = true;
  resolveAttn(s, `msg:${m.id}`);
  for (const f of MSG_AFTER18) f(s, m, action);
  return out;
}

export function markRead(s: GameState, msgId?: string): void {
  const st = P(s);
  if (msgId) {
    const m = st.inbox.find((x) => x.id === msgId);
    if (m) m.read = true;
    seeAttn(s, msgId);
    return;
  }
  for (const m of st.inbox) m.read = true;
  seeAttn(s);
}

/** Reclamações espontâneas de quem está mal; respostas expiradas seguem o padrão. */
export function inboxMonth(s: GameState, r: Rng): void {
  const st = P(s);
  for (const m of st.inbox) {
    if (m.resolved || !m.actions?.length || !m.expires || m.expires > s.week) continue;
    const def = m.actions[m.actions.length - 1].id;
    answerMsg(s, m.id, def, r);
    m.read = false;
  }
  for (const p of trackedPersons(s)) {
    if (p.morale >= 38) continue;
    if (st.inbox.some((m) => m.kind === 'complaint' && m.ref?.person === p.id && (!m.resolved || s.week - m.week < 10))) continue;
    if (!r.chance(0.35)) continue;
    const worst = activeThoughts(s, p.id).filter((x) => x.v < 0).slice(0, 2).map((x) => thoughtText(x));
    const why = worst.length ? worst.map((x) => x.pt).join('; ') : 'cansaço';
    const whyEn = worst.length ? worst.map((x) => x.en).join('; ') : 'exhaustion';
    addMsg(s, {
      from: p.name, kind: 'complaint', tone: 'bad', expires: s.week + 6,
      subject: l('Precisamos conversar', 'We need to talk'),
      body: fmtL(l('{p} anda abatido(a) e pede uma conversa. Motivos: {w}.', '{p} is down and asks for a talk. Reasons: {e}.'), { p: p.name, w: why, e: whyEn }),
      ref: { person: p.id },
      actions: [{ id: 'praise', label: l('Elogiar', 'Praise') }, { id: 'promise_single', label: l('Prometer um single', 'Promise a single') }, { id: 'patience', label: l('Pedir paciência', 'Ask for patience') }, { id: 'ignore', label: l('Não responder', 'Don\'t reply') }],
    });
  }
}

// ---------------------------------------------------------------- vista unificada para a interface

export interface InboxItem {
  key: string;
  week: number;
  year: number;
  medium: Medium;
  from: string;
  subject: L;
  body: L;
  tone: 'good' | 'bad' | 'info' | 'event';
  unread: boolean;
  source: 'msg' | 'notification' | 'decision';
  msg?: InboxMsg;
  decisionId?: string;
}

function yearAtWeek(s: GameState, week: number): number {
  return s.year - Math.floor((s.week - week) / 52);
}

/** A caixa única (r31 UNI-1): lista pela fila de atenção — mensagens (corpo em `P(s).inbox`), avisos e o boletim da
 *  semana (item-cabeça; as linhas são os itens dobrados) — mais as decisões da mesa. Itens dobrados e cenas não entram. */
export function inboxItems(s: GameState): InboxItem[] {
  const st = P(s);
  const byId = new Map(st.inbox.map((m) => [m.id, m]));
  const items: InboxItem[] = [];
  const inQ = new Set<string>();
  for (const x of attn(s).q) if (x.msg) inQ.add(x.msg);
  for (const x of attn(s).q) {
    if (x.cat === 'scene' || (x.fold && x.bw === undefined)) continue;
    if (x.msg) {
      const m = byId.get(x.msg);
      if (!m) continue;
      byId.delete(x.msg);
      items.push({ key: m.id, week: m.week, year: m.year, medium: msgMedium(m), from: m.from, subject: m.subject, body: m.body, tone: m.tone ?? 'info', unread: !m.read, source: 'msg', msg: m });
    } else if (x.bw !== undefined) {
      const year = yearAtWeek(s, x.at);
      const m: InboxMsg = { id: x.id, week: x.at, year, from: l('Boletim', 'Bulletin').pt, subject: x.title, body: x.body ?? x.title, kind: 'deal', tone: 'info', read: x.seen, ref: { sys: 'k18', k18: 'bulletin19', bw: x.bw, n: x.n ?? 1 } };
      items.push({ key: x.id, week: x.at, year, medium: msgMedium(m), from: m.from, subject: m.subject, body: m.body, tone: 'info', unread: !x.seen, source: 'msg', msg: m });
    } else if (x.tone) {
      const year = yearAtWeek(s, x.at), n = x.tone;
      items.push({ key: x.id, week: x.at, year, medium: mediumFor(year, n === 'bad'), from: s.config.companyName, subject: n === 'bad' ? l('Alerta', 'Alert') : n === 'good' ? l('Boa notícia', 'Good news') : l('Aviso', 'Notice'), body: x.title, tone: n, unread: !x.seen, source: 'notification' });
    }
  }
  // carta que está na caixa mas cujo item saiu da fila (corte do teto) continua na caixa
  for (const m of st.inbox) if (!inQ.has(m.id)) items.push({ key: m.id, week: m.week, year: m.year, medium: msgMedium(m), from: m.from, subject: m.subject, body: m.body, tone: m.tone ?? 'info', unread: !m.read, source: 'msg', msg: m });
  for (const d of s.decisions) {
    items.push({ key: d.id, week: d.week, year: s.year, medium: mediumFor(s.year, true), from: l('Mesa de decisões', 'Decision desk').pt, subject: d.title, body: d.text, tone: 'event', unread: !isSeen18(s, d.id), source: 'decision', decisionId: d.id });
  }
  return items.sort((a, b) => b.week - a.week || (a.source === 'decision' ? -1 : 1));
}

/** Não lidos: mensagens (e o boletim) não lidas e não resolvidas + decisões + avisos não vistos que não são só informativos. */
export function unreadCount(s: GameState): number {
  const st = P(s);
  const open = new Set(st.inbox.filter((m) => !m.read && !m.resolved).map((m) => m.id));
  let n = s.decisions.length;
  const inQ = new Set<string>();
  for (const x of attn(s).q) {
    if (x.msg) inQ.add(x.msg);
    if (x.cat === 'scene' || x.done) continue;
    if (x.msg) { if (open.has(x.msg)) { n++; open.delete(x.msg); } }
    else if (x.bw !== undefined) { if (!x.seen) n++; }
    else if (x.tone && !x.fold && !x.seen && x.tone !== 'info') n++;
  }
  // cartas abertas cujo item saiu da fila: contam pelo que está na caixa (no prazo)
  for (const m of st.inbox) if (open.has(m.id) && !inQ.has(m.id) && (m.expires === undefined || m.expires >= s.week)) n++;
  return n;
}

export { money };
