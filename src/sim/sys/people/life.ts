// Romances na banda (química sobe, término arriscado, disco de separação com letras melhores) e
// fortuna pessoal dos artistas (cachês e direitos entram, estilo de vida sai). Estrela falida
// aceita contratos piores; estrela rica fica exigente.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { emitEvent } from '../../events';
import { registerMod, registerSimHook } from '../../ext4';
import { songQ } from '../../production';
import type { GameState } from '../../types';
import { fmtL, money, nextId, playerActs, post, remember } from '../../util';
import { P, actOf, addMsg, addPost, clamp01, socialEra, trackedPersons } from './state';
import { addThought } from './thoughts';

// ---------------------------------------------------------------- romances

export function activeRomance(s: GameState, actId: string) {
  return P(s).romances.find((x) => x.actId === actId && x.status === 'together');
}

export function recentBreakup(s: GameState, actId: string) {
  return P(s).romances.find((x) => x.actId === actId && x.status === 'over' && x.endWeek !== undefined && s.week - x.endWeek < 78);
}

export function breakUp(s: GameState, r: Rng, id: string): void {
  const ro = P(s).romances.find((x) => x.id === id);
  if (!ro || ro.status !== 'together') return;
  ro.status = 'over';
  ro.endWeek = s.week;
  const a = s.persons[ro.a];
  const b = s.persons[ro.b];
  const act = s.acts[ro.actId];
  if (!a || !b || !act) return;
  addThought(s, a.id, 'breakup', { p: b.name });
  addThought(s, b.id, 'breakup', { p: a.name });
  a.rel[b.id] = Math.max(-100, (a.rel[b.id] ?? 0) - 60);
  b.rel[a.id] = Math.max(-100, (b.rel[a.id] ?? 0) - 60);
  a.resentment = clamp01(a.resentment + 10);
  b.resentment = clamp01(b.resentment + 10);
  remember(s, 'breakup', fmtL(l('{a} e {b} ({c}) terminam. O clima no estúdio congela.', '{a} and {b} ({c}) break up. The studio goes cold.'), { a: a.name, b: b.name, c: act.name }), { actId: act.id, important: true });
  addPost(s, { author: socialEra(s.year) ? '@popfeed' : l('Coluna social', 'Society column').pt, role: socialEra(s.year) ? 'journalist' : 'gossip', text: fmtL(l('Fim do romance em {c}: {a} e {b} não estão mais juntos.', 'Romance over in {c}: {a} and {b} are no longer together.'), { a: a.name, b: b.name, c: act.name }), sentiment: -0.2, actId: act.id, likes: 1500 });
  if (act.members.length > 2 && r.chance(0.35)) {
    const leaver = a.morale < b.morale ? a : b;
    emitEvent(s, r, 'people_quit_stage', { act: act.id, person: leaver.id });
  }
}

function romanceMonth(s: GameState, r: Rng): void {
  const st = P(s);
  for (const actId of playerActs(s)) {
    const act = s.acts[actId];
    const ms = act.members.map((id) => s.persons[id]).filter((p) => p?.alive && s.year - p.born >= 18);
    if (ms.length < 2) continue;
    const cur = activeRomance(s, actId);
    if (!cur) {
      if (recentBreakup(s, actId) && s.week - (recentBreakup(s, actId)!.endWeek ?? 0) < 26) continue;
      for (let i = 0; i < ms.length && i < 5; i++) {
        for (let j = i + 1; j < ms.length && j < 5; j++) {
          const a = ms[i];
          const b = ms[j];
          if ((a.rel[b.id] ?? 0) < 35 || st.romances.some((x) => x.status === 'together' && [x.a, x.b].some((y) => y === a.id || y === b.id))) continue;
          if (!r.chance(0.012)) continue;
          st.romances.push({ id: nextId(s, 'ro'), a: a.id, b: b.id, actId, since: s.week, status: 'together' });
          a.rel[b.id] = Math.min(100, (a.rel[b.id] ?? 0) + 20);
          b.rel[a.id] = Math.min(100, (b.rel[a.id] ?? 0) + 20);
          addThought(s, a.id, 'in_love', { p: b.name });
          addThought(s, b.id, 'in_love', { p: a.name });
          remember(s, 'romance', fmtL(l('{a} e {b} ({c}) estão juntos.', '{a} and {b} ({c}) are together.'), { a: a.name, b: b.name, c: act.name }), { actId });
          // quem tinha parceiro fora da banda agora tem um segredo
          for (const p of [a, b]) {
            if (s.families[p.id]?.partner && !st.secrets.some((x) => x.owner === p.id && x.kind === 'affair')) {
              st.secrets.push({ id: nextId(s, 'sc'), owner: p.id, kind: 'affair', severity: 2, known: true, knownBy: [], leaked: false, used: 0 });
            }
          }
          break;
        }
        if (activeRomance(s, actId)) break;
      }
    } else {
      const a = s.persons[cur.a];
      const b = s.persons[cur.b];
      if (!a?.alive || !b?.alive || !act.members.includes(a.id) || !act.members.includes(b.id)) {
        cur.status = 'over';
        cur.endWeek = s.week;
        continue;
      }
      addThought(s, a.id, 'in_love', { p: b.name });
      addThought(s, b.id, 'in_love', { p: a.name });
      const stress = (a.stress + b.stress) / 2;
      if (r.chance(0.018 + (stress > 60 ? 0.03 : 0) + (a.resentment + b.resentment) / 2000)) breakUp(s, r, cur.id);
    }
  }
  if (st.romances.length > 30) st.romances = st.romances.filter((x) => x.status === 'together' || s.week - (x.endWeek ?? 0) < 104).slice(-30);
}

registerMod('appeal', 'people-romance', (s, value, ctx) => {
  const act = ctx.release ? s.acts[ctx.release.actId] : ctx.act;
  if (!act || act.owner !== 'player') return null;
  if (activeRomance(s, act.id)) return { value: value * 1.03, label: l('Química do casal na banda', 'Couple chemistry in the band') };
  return null;
});

/** Disco de separação: a dor vira letra. */
registerSimHook('compose', 'people-romance', (s, _r, arg) => {
  const song = arg.song;
  if (!song) return;
  const act = s.acts[song.actId];
  if (!act || act.owner !== 'player') return;
  const br = recentBreakup(s, act.id);
  if (!br) return;
  song.lyrics = Math.min(100, song.lyrics + 8);
  song.originality = Math.min(100, song.originality + 3);
  song.theme ??= l('separação', 'heartbreak');
  song.q = songQ(song);
  const key = `breakupsong:${br.id}`;
  if (!s.flags[key]) {
    s.flags[key] = s.week;
    remember(s, 'breakup_song', fmtL(l('{c} transforma o término em canções: "{t}".', '{c} turns the breakup into songs: "{t}".'), { c: act.name, t: song.title }), { actId: act.id });
  }
});

// ---------------------------------------------------------------- fortuna pessoal

export function lifestyle(s: GameState, pid: string): number {
  const p = s.persons[pid];
  const act = actOf(s, pid);
  let m = 1;
  if (p?.traits.includes('spendthrift')) m = 2.1;
  if (p?.traits.includes('frugal')) m = 0.5;
  if (p?.traits.includes('big_ego')) m *= 1.3;
  return money(s, (120 + (act?.fame ?? 0) * 20) * m);
}

export function wealthOf(s: GameState, pid: string): number {
  return P(s).wealth[pid] ?? 0;
}

export function richLine(s: GameState): number {
  return money(s, 150000);
}

/** −1 (falido) .. +1 (rico): usado na Mesa de negociação. */
export function fortuneFactor(s: GameState, actId: string): number {
  const a = s.acts[actId];
  if (!a) return 0;
  const ms = a.members.filter((id) => s.persons[id]?.alive);
  if (!ms.length) return 0;
  const avg = ms.reduce((t, id) => t + (P(s).wealth[id] ?? money(s, 3000)), 0) / ms.length;
  if (avg < 0) return Math.max(-1, avg / money(s, 20000));
  return Math.min(1, avg / richLine(s));
}

function fortuneMonth(s: GameState, r: Rng): void {
  const st = P(s);
  const tracked = trackedPersons(s);
  const ids = new Set(tracked.map((p) => p.id));
  for (const p of tracked) {
    const act = actOf(s, p.id)!;
    if (st.wealth[p.id] === undefined) st.wealth[p.id] = money(s, 1500 + act.fame * 300);
    const roy = s.personalCash[p.id] ?? 0;
    // retirada do caixa do próprio ato (cachês, adiantamento) + direitos autorais
    const alive = act.members.filter((id) => s.persons[id]?.alive).length || 1;
    const draw = act.cash > 0 ? Math.round((act.cash * 0.05) / alive) : 0;
    act.cash -= draw;
    // quem ainda não vive de música faz bicos (aulas, bailes, emprego de dia)
    const sideJob = act.fame < 35 ? money(s, 150 - act.fame * 3) : 0;
    const income = Math.max(0, roy - (st.lastRoyalty[p.id] ?? roy)) + draw + sideJob;
    st.lastRoyalty[p.id] = roy;
    const spend = lifestyle(s, p.id);
    st.wealth[p.id] += income - spend;
    const w = st.wealth[p.id];
    if (w < -money(s, 800)) {
      addThought(s, p.id, 'broke');
      if (w < -money(s, 4000) && r.chance(0.25) && !st.inbox.some((m) => m.kind === 'request' && m.ref?.person === p.id && !m.resolved)) {
        const amount = money(s, Math.round(-w / money(s, 1) / 500) * 500 + 1000);
        addMsg(s, {
          from: p.name, kind: 'request', tone: 'info', expires: s.week + 6,
          subject: l('Pedido de adiantamento pessoal', 'Personal advance request'),
          body: fmtL(l('{p} está sem dinheiro para o aluguel e pede um adiantamento, descontado dos royalties.', '{p} can\'t make rent and asks for an advance against royalties.'), { p: p.name }),
          ref: { person: p.id, amount },
          actions: [{ id: 'lend', label: l('Adiantar', 'Advance it') }, { id: 'refuse', label: l('Recusar', 'Refuse') }],
        });
      }
    } else if (w > richLine(s)) {
      addThought(s, p.id, 'rich');
      // rico fica exigente: royalties abaixo do que acha justo pesam na confiança
      const c = act.contractId ? s.contracts[act.contractId] : undefined;
      if (c && c.royalty < 0.16 + act.fame / 400) act.trust = clamp01(act.trust - 1);
      if (r.chance(0.06)) {
        const big = Math.round(w * 0.3);
        st.wealth[p.id] -= big;
        const house = r.chance(0.5);
        addThought(s, p.id, house ? 'new_house' : 'party');
        addPost(s, { author: socialEra(s.year) ? `@${p.name.split(' ')[0].toLowerCase()}` : l('Coluna social', 'Society column').pt, role: socialEra(s.year) ? 'artist' : 'gossip', text: house ? fmtL(l('{p} compra uma mansão.', '{p} buys a mansion.'), { p: p.name }) : fmtL(l('{p} dá uma festa de três dias.', '{p} throws a three-day party.'), { p: p.name }), sentiment: 0.2, actId: act.id, likes: 800 });
      }
    } else if (income === 0 && w < spend * 2) addThought(s, p.id, 'unpaid');
  }
  for (const k of Object.keys(st.wealth)) if (!ids.has(k)) delete st.wealth[k];
  for (const k of Object.keys(st.lastRoyalty)) if (!ids.has(k)) delete st.lastRoyalty[k];
}

/** Adiantamento pessoal: sai do caixa do selo e entra no saldo a recuperar do contrato. */
export function personalAdvance(s: GameState, pid: string, amount: number): L | null {
  const p = s.persons[pid];
  const act = actOf(s, pid);
  if (!p || !act) return l('Pessoa fora do elenco.', 'Person not on the roster.');
  if (s.player.cash < amount) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `personaladv:${pid}`, -amount, 'advances', `Adiantamento ${p.name}`);
  P(s).wealth[pid] = (P(s).wealth[pid] ?? 0) + amount;
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (c) c.recoupBalance += amount;
  act.trust = clamp01(act.trust + 5);
  return null;
}

export function lifeMonth(s: GameState, r: Rng): void {
  romanceMonth(s, r);
  fortuneMonth(s, r);
}

export type { L };
