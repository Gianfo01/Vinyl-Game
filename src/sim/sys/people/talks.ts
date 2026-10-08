// Conversas um a um (Football Manager): elogiar, cobrar, pedir paciência, prometer e multar. As
// reações dependem de traços, personalidade, humor e de quantas vezes o selo já usou o mesmo
// argumento. Promessas ficam guardadas com prazo; cumprir ou quebrar mexe na confiança do ato.

import { l, type L } from '../../../data/world';
import type { GameState, Person } from '../../types';
import { fmtL, money, nextId, post, remember } from '../../util';
import { P, actOf, addMsg, clamp01, type PromiseRec } from './state';
import { addThought, moodOf } from './thoughts';
import { ownerBonus } from './owner';

export type TalkKind = 'praise' | 'demand' | 'patience' | 'promise' | 'fine';
export type PromiseKind = PromiseRec['kind'];

export const PROMISE_INFO: Record<PromiseKind, { name: L; weeks: number }> = {
  single: { name: l('lançar um single', 'release a single'), weeks: 16 },
  tour: { name: l('marcar uma turnê', 'book a tour'), weeks: 26 },
  raise: { name: l('dar um aumento', 'give a raise'), weeks: 10 },
  solo: { name: l('apoiar um disco solo', 'back a solo record'), weeks: 52 },
  album: { name: l('lançar um álbum', 'release an album'), weeks: 40 },
};

export const TALK_NAME: Record<TalkKind, L> = {
  praise: l('Elogiar', 'Praise'),
  demand: l('Cobrar', 'Push'),
  patience: l('Pedir paciência', 'Ask for patience'),
  promise: l('Prometer', 'Promise'),
  fine: l('Multar', 'Fine'),
};

export function canTalk(s: GameState, pid: string): L | null {
  const p = s.persons[pid];
  const act = actOf(s, pid);
  if (!p?.alive || !act) return l('Só com pessoas do seu elenco.', 'Only with people on your roster.');
  const last = P(s).lastTalk[pid];
  if (last !== undefined && s.week - last < 2) return l('Vocês conversaram há pouco. Espere umas semanas.', 'You talked recently. Wait a couple of weeks.');
  return null;
}

function used(s: GameState, pid: string, kind: string): number {
  const st = P(s);
  const key = `${pid}:${kind}`;
  const n = st.talkCount[key] ?? 0;
  st.talkCount[key] = n + 1;
  return n;
}

const has = (p: Person, ...t: string[]) => t.some((x) => p.traits.includes(x));

export function raiseAmount(s: GameState, pid: string): number {
  const act = actOf(s, pid);
  return money(s, 1500 + (act?.fame ?? 0) * 60);
}

/** Conversa um a um. Devolve a reação (texto) ou erro. */
export function talk(s: GameState, pid: string, kind: TalkKind, promise?: PromiseKind): { ok: boolean; text: L } {
  const err = canTalk(s, pid);
  if (err) return { ok: false, text: err };
  const st = P(s);
  const p = s.persons[pid];
  const act = actOf(s, pid)!;
  const pe = p.persona ?? { openness: 50, perfectionism: 50, ambition: 50, sociability: 50, discipline: 50, resilience: 50 };
  const mood = moodOf(s, pid);
  const charm = ownerBonus(s, 'charisma');
  let text: L;
  switch (kind) {
    case 'praise': {
      const n = used(s, pid, kind);
      const v = Math.round((8 + charm * 6) / (1 + n * 0.7));
      if (v <= 1) {
        text = fmtL(l('{p} sorri sem graça: "Você sempre diz isso."', '{p} smiles awkwardly: "You always say that."'), { p: p.name });
        break;
      }
      addThought(s, pid, 'praised', { v });
      act.trust = clamp01(act.trust + 1.5);
      if (has(p, 'big_ego') && p.morale > 75) {
        p.inspiration = clamp01(p.inspiration - 6);
        text = fmtL(l('{p} já se acha o máximo; agora ainda mais. Pode relaxar demais.', '{p} already thinks they are the best; now even more. Might coast.'), { p: p.name });
      } else text = fmtL(l('{p} fica visivelmente animado(a) com o elogio.', '{p} is visibly lifted by the praise.'), { p: p.name });
      break;
    }
    case 'demand': {
      used(s, pid, kind);
      const tough = pe.discipline > 55 || has(p, 'competitive', 'ambitious', 'disciplined', 'workaholic');
      const fragile = has(p, 'insecure', 'anxious') || p.morale < 35 || mood < -12;
      if (tough && !fragile) {
        addThought(s, pid, 'motivated');
        p.inspiration = clamp01(p.inspiration + 10);
        p.skills.comp = Math.min(100, p.skills.comp + 0.4);
        text = fmtL(l('{p} encara a cobrança como desafio e promete entregar mais.', '{p} takes the push as a challenge and promises to deliver more.'), { p: p.name });
      } else {
        addThought(s, pid, 'scolded');
        p.stress = clamp01(p.stress + 8);
        act.trust = clamp01(act.trust - 2);
        text = fragile
          ? fmtL(l('{p} desaba: "Eu já estou no limite."', '{p} breaks down: "I am already at my limit."'), { p: p.name })
          : fmtL(l('{p} ouve calado(a) e sai batendo a porta.', '{p} listens silently and slams the door on the way out.'), { p: p.name });
      }
      break;
    }
    case 'patience': {
      const n = used(s, pid, kind);
      if (act.trust > 40 && n < 3) {
        addThought(s, pid, 'patience');
        p.lowMoraleMonths = 0;
        text = fmtL(l('{p} aceita esperar mais um pouco. Por enquanto.', '{p} agrees to wait a bit longer. For now.'), { p: p.name });
      } else {
        act.trust = clamp01(act.trust - 3);
        text = fmtL(l('{p}: "Paciência? De novo? Eu quero fatos."', '{p}: "Patience? Again? I want facts."'), { p: p.name });
      }
      break;
    }
    case 'promise': {
      if (!promise) return { ok: false, text: l('Escolha o que prometer.', 'Choose what to promise.') };
      if (promise === 'solo' && act.members.length < 2) return { ok: false, text: l('Disco solo só faz sentido em banda.', 'A solo record only makes sense in a band.') };
      const open = st.promises.filter((x) => x.personId === pid && x.status === 'open');
      if (open.length >= 2) return { ok: false, text: l('Já há duas promessas em aberto com essa pessoa.', 'There are already two open promises with this person.') };
      if (open.some((x) => x.kind === promise)) return { ok: false, text: l('Isso já foi prometido.', 'That was already promised.') };
      const c = act.contractId ? s.contracts[act.contractId] : undefined;
      const rec: PromiseRec = { id: nextId(s, 'pr'), personId: pid, actId: act.id, kind: promise, madeWeek: s.week, dueWeek: s.week + PROMISE_INFO[promise].weeks, status: 'open', base: c?.royalty };
      st.promises.push(rec);
      if (st.promises.length > 40) st.promises = st.promises.filter((x) => x.status === 'open' || s.week - x.dueWeek < 52).slice(-40);
      addThought(s, pid, 'promise_made', { p: PROMISE_INFO[promise].name.pt });
      act.trust = clamp01(act.trust + 3);
      p.lowMoraleMonths = 0;
      text = fmtL(l('{p} anota: você prometeu {w} em {n} semanas.', '{p} takes note: you promised to {w} within {n} weeks.'), { p: p.name, w: PROMISE_INFO[promise].name, n: PROMISE_INFO[promise].weeks });
      break;
    }
    case 'fine': {
      const amount = money(s, 400 + act.fame * 25);
      const recent = st.breakdowns.some((b) => b.personId === pid && s.week - b.week < 13);
      post(s, `fine:${pid}`, amount, 'other_income', `Multa disciplinar ${p.name}`);
      st.wealth[pid] = (st.wealth[pid] ?? 0) - amount;
      addThought(s, pid, 'fined');
      p.resentment = clamp01(p.resentment + (recent ? 6 : 15));
      act.trust = clamp01(act.trust - (recent ? 2 : 7));
      if (has(p, 'disciplined', 'loyal') || recent) {
        p.stress = clamp01(p.stress - 5);
        text = fmtL(l('{p} aceita a multa: "Eu mereci."', '{p} accepts the fine: "I had it coming."'), { p: p.name });
      } else text = fmtL(l('{p} considera a multa uma humilhação e fala com o advogado.', '{p} sees the fine as humiliation and calls a lawyer.'), { p: p.name });
      break;
    }
  }
  st.lastTalk[pid] = s.week;
  remember(s, 'talk', fmtL(l('Conversa com {p}: {k}.', 'Talk with {p}: {k}.'), { p: p.name, k: TALK_NAME[kind] }), { actId: act.id });
  return { ok: true, text };
}

/** Paga o aumento prometido (vai para o patrimônio da pessoa). */
export function payRaise(s: GameState, pid: string): L | null {
  const p = s.persons[pid];
  const act = actOf(s, pid);
  if (!p || !act) return l('Pessoa fora do elenco.', 'Person not on the roster.');
  const amount = raiseAmount(s, pid);
  if (s.player.cash < amount) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `raise:${pid}`, -amount, 'artist_dev', `Aumento ${p.name}`);
  const st = P(s);
  st.wealth[pid] = (st.wealth[pid] ?? 0) + amount;
  addThought(s, pid, 'raise');
  act.trust = clamp01(act.trust + 3);
  const pr = st.promises.find((x) => x.personId === pid && x.kind === 'raise' && x.status === 'open');
  if (pr) keep(s, pr);
  return null;
}

function keep(s: GameState, pr: PromiseRec): void {
  pr.status = 'kept';
  const act = s.acts[pr.actId];
  if (act) act.trust = clamp01(act.trust + 8);
  addThought(s, pr.personId, 'promise_kept', { p: PROMISE_INFO[pr.kind].name.pt });
  remember(s, 'promise_kept', fmtL(l('Promessa cumprida com {p}: {w}.', 'Promise kept with {p}: {w}.'), { p: s.persons[pr.personId]?.name ?? '', w: PROMISE_INFO[pr.kind].name }), { actId: pr.actId });
}

function fulfilled(s: GameState, pr: PromiseRec): boolean {
  const act = s.acts[pr.actId];
  if (!act) return false;
  const since = (rid: string) => s.releases[rid] && s.releases[rid].week >= pr.madeWeek && s.releases[rid].owner === 'player';
  switch (pr.kind) {
    case 'single':
      return act.releases.some((rid) => since(rid) && s.releases[rid].type === 'single') || s.pendingReleases.some((x) => x.actId === act.id && x.type === 'single');
    case 'album':
      return act.releases.some((rid) => since(rid) && s.releases[rid].type === 'lp') || s.pendingReleases.some((x) => x.actId === act.id && x.type === 'lp');
    case 'tour':
      return s.tours.some((t) => (t.actId === act.id || t.partnerActId === act.id) && t.status !== 'cancelled' && t.stops.some((st) => st.day >= pr.madeWeek * 7 - 7));
    case 'raise': {
      const c = act.contractId ? s.contracts[act.contractId] : undefined;
      return !!c && pr.base !== undefined && c.royalty > pr.base + 0.004;
    }
    case 'solo':
      return Object.entries(s.soloOf).some(([solo, orig]) => orig === act.id && s.acts[solo]?.members.includes(pr.personId));
  }
}

export function promisesMonth(s: GameState): void {
  const st = P(s);
  for (const pr of st.promises) {
    if (pr.status !== 'open') continue;
    const p = s.persons[pr.personId];
    const act = s.acts[pr.actId];
    if (!p?.alive || !act || act.owner !== 'player') {
      pr.status = 'kept'; // sem cobrança possível
      continue;
    }
    if (fulfilled(s, pr)) {
      keep(s, pr);
      continue;
    }
    if (s.week >= pr.dueWeek) {
      pr.status = 'broken';
      act.trust = clamp01(act.trust - 15);
      p.resentment = clamp01(p.resentment + 12);
      addThought(s, pr.personId, 'promise_broken', { p: PROMISE_INFO[pr.kind].name.pt });
      remember(s, 'promise_broken', fmtL(l('Promessa quebrada com {p} ({a}): {w}.', 'Broken promise with {p} ({a}): {w}.'), { p: p.name, a: act.name, w: PROMISE_INFO[pr.kind].name }), { actId: act.id, important: true });
      addMsg(s, { from: p.name, kind: 'complaint', subject: l('Você prometeu', 'You promised'), body: fmtL(l('"Você prometeu {w}. Não cumpriu. Não esqueço."', '"You promised to {w}. You didn\'t. I won\'t forget."'), { w: PROMISE_INFO[pr.kind].name }), tone: 'bad' });
    } else if (pr.dueWeek - s.week <= 5 && pr.dueWeek - s.week > 0) {
      if (!st.inbox.some((m) => m.ref?.promise === pr.id)) {
        addMsg(s, { from: p.name, kind: 'promise', subject: l('Lembrete de promessa', 'Promise reminder'), body: fmtL(l('{p} lembra: faltam {n} semanas para você {w}.', '{p} reminds you: {n} weeks left to {w}.'), { p: p.name, n: pr.dueWeek - s.week, w: PROMISE_INFO[pr.kind].name }), ref: { promise: pr.id }, tone: 'info' });
      }
    }
  }
  // retorno decrescente das conversas some aos poucos
  for (const k of Object.keys(st.talkCount)) {
    st.talkCount[k] = Math.floor(st.talkCount[k] / 2);
    if (!st.talkCount[k]) delete st.talkCount[k];
  }
}

export function openPromises(s: GameState, pid?: string): PromiseRec[] {
  return P(s).promises.filter((x) => x.status === 'open' && (!pid || x.personId === pid));
}
