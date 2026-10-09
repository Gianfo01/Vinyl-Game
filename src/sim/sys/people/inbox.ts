// Caixa de entrada por era (Football Manager): mensagens dos sistemas de pessoas (pedidos, promessas,
// reclamações, saúde, equipe, chantagem) com resposta direta. A interface junta isto às notificações
// e decisões existentes, com o meio de cada época (carta, telegrama, telefonema, fax, e-mail, mensagem).

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import type { GameState, Notification } from '../../types';
import { fmtL, money, post, rngOf } from '../../util';
import { P, actOf, addMsg, clamp01, mediumFor, trackedPersons, type InboxMsg, type Medium } from './state';
import { activeThoughts, addThought, thoughtText } from './thoughts';
import { startTreatment, type Treatment } from './health';
import { answerRaise } from './staff';
import { personalAdvance } from './life';
import { leakSecret } from './secrets';
import { talk } from './talks';

/**
 * Rodada 8: respostas de mensagens de outros sistemas (convites de feat, propostas). A mensagem leva
 * `kind: 'deal'` e `ref.sys` com a chave do tratador; o tratador devolve o texto do resultado.
 */
export const MSG_HANDLERS: Record<string, (s: GameState, m: InboxMsg, action: string, r: Rng) => L> = {};

export function msgMedium(m: { year: number; tone?: string; kind?: string }): Medium {
  return mediumFor(m.year, m.tone === 'bad' || m.kind === 'health' || m.kind === 'secret');
}

/** Responde uma mensagem. Devolve o texto do resultado. */
export function answerMsg(s: GameState, msgId: string, action: string, r: Rng = rngOf(s)): L {
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
      const sec = st.secrets.find((x) => x.id === ref.secret);
      if (!sec) break;
      if (action === 'pay') {
        const amount = Number(ref.amount);
        if (s.player.cash < amount) return l('Caixa insuficiente.', 'Not enough cash.');
        post(s, `hushpay:${sec.id}`, -amount, 'legal', 'Acordo confidencial');
        sec.knownBy = sec.knownBy.filter((x) => x !== ref.label);
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
  return out;
}

export function markRead(s: GameState, msgId?: string): void {
  const st = P(s);
  if (msgId) {
    const m = st.inbox.find((x) => x.id === msgId);
    if (m) m.read = true;
    return;
  }
  for (const m of st.inbox) m.read = true;
  st.readUntil = s.week;
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

export function inboxItems(s: GameState): InboxItem[] {
  const st = P(s);
  const items: InboxItem[] = [];
  for (const m of st.inbox) {
    items.push({ key: m.id, week: m.week, year: m.year, medium: msgMedium(m), from: m.from, subject: m.subject, body: m.body, tone: m.tone ?? 'info', unread: !m.read, source: 'msg', msg: m });
  }
  s.notifications.forEach((n: Notification, i) => {
    const year = yearAtWeek(s, n.week);
    items.push({ key: `n${i}-${n.week}`, week: n.week, year, medium: mediumFor(year, n.kind === 'bad'), from: s.config.companyName, subject: n.kind === 'bad' ? l('Alerta', 'Alert') : n.kind === 'good' ? l('Boa notícia', 'Good news') : l('Aviso', 'Notice'), body: n.text, tone: n.kind, unread: n.week > st.readUntil, source: 'notification' });
  });
  for (const d of s.decisions) {
    items.push({ key: d.id, week: d.week, year: s.year, medium: mediumFor(s.year, true), from: l('Mesa de decisões', 'Decision desk').pt, subject: d.title, body: d.text, tone: 'event', unread: true, source: 'decision', decisionId: d.id });
  }
  return items.sort((a, b) => b.week - a.week || (a.source === 'decision' ? -1 : 1));
}

export function unreadCount(s: GameState): number {
  const st = P(s);
  return st.inbox.filter((m) => !m.read && !m.resolved).length + s.decisions.length + s.notifications.filter((n) => n.week > st.readUntil && n.kind !== 'info').length;
}

export { money };
