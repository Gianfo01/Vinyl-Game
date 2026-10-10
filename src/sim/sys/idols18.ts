// Rodada 18 (regions18, R2) — IDOLS JAPONESES. Modelo AKB48 (2005): "idols que você pode encontrar" — o CD vem com
// ingresso de aperto de mão e (desde 2009) voto na "eleição geral"; a Oricon conta cada unidade física, então o pacote
// vira posição (menos depois que a Billboard Japan, 2008, e a parada combinada da Oricon, 2018, pesam streaming).
// Custa eventos, cansa as integrantes e traz risco de segurança (ataque com serra em 2014; caso NGT48 em 2019).
// "Graduação": a integrante sai com show de despedida. Kōhaku Uta Gassen (NHK, 1951+): convite de fim de ano para os
// mais famosos no Japão; o enka vive desse público mais velho e fiel.

import { clamp, Rng } from '../../core/rng';
import { MARKETS, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { addStress } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { fameIn, nudge16 } from './fame16';
import { leaveBand16 } from './lineup16';
import { subW18 } from './regions18';

export interface Idol18State { hs: Record<string, 1>; sec: Record<string, 1>; asked: Record<string, number>; kohaku: Record<string, string[]> }
declare module '../ext4' { interface Ext4 { idols18: Idol18State } }
const fresh = (): Idol18State => ({ hs: {}, sec: {}, asked: {}, kohaku: {} });
registerExt4('idols18', fresh);
export function id18(s: GameState): Idol18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.idols18 ??= fresh()) as Idol18State;
  st.hs ??= {}; st.sec ??= {}; st.asked ??= {}; st.kohaku ??= {};
  return st;
}
export const IDOL_G18 = ['jpop', 'anison', 'kpop', 'pop', 'vocaloid_pop', 'kayokyoku', 'city_pop'];
export const hsCost18 = (s: GameState) => money(s, 1200);
export const secCost18 = (s: GameState) => money(s, 500);
/** Peso do pacote: cheio na era Oricon-só-físico; metade depois da parada combinada (2018). */
export const hsPower18 = (y: number) => (y < 2018 ? 0.9 : 0.45);

export function hsBlock18(s: GameState, a: Act | undefined): L | null {
  if (!a || a.owner !== 'player') return l('Inválido.', 'Invalid.');
  if (s.year < 2005) return l('O modelo de aperto de mão nasce com o AKB48 (2005).', 'The handshake model is born with AKB48 (2005).');
  if (!IDOL_G18.includes(a.genre)) return l('Só para atos de idol/pop.', 'Only for idol/pop acts.');
  if (!s.player.territories.includes('asia')) return l('Precisa distribuir na Ásia (Japão).', 'Needs distribution in Asia (Japan).');
  return null;
}
export function setHs18(s: GameState, actId: string, on: boolean): L | null {
  const a = s.acts[actId];
  if (on) { const b = hsBlock18(s, a); if (b) return b; id18(s).hs[actId] = 1; }
  else { delete id18(s).hs[actId]; delete id18(s).sec[actId]; }
  return null;
}
export const setSec18 = (s: GameState, actId: string, on: boolean): void => { if (on) id18(s).sec[actId] = 1; else delete id18(s).sec[actId]; };

/** Fatia japonesa do lançamento (peso do Japão na Ásia × tamanho da Ásia ÷ territórios). */
export function jpShare18(s: GameState, territories: string[]): number {
  const tot = territories.reduce((t, mk) => t + (MARKETS.find((m) => m.id === mk)?.size(s.year) ?? 0), 0);
  if (!tot || !territories.includes('asia')) return 0;
  return clamp(subW18('jp', s.year) * (MARKETS.find((m) => m.id === 'asia')!.size(s.year)) / tot * 2.5, 0, 1);
}
registerMod('chartUnits', 'idols18', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel || rel.owner !== 'player' || !id18(s).hs[rel.actId]) return null;
  const k = jpShare18(s, rel.territories);
  if (!k) return null;
  const el = s.month === 5 && s.year >= 2009 ? 1.3 : 1;
  return { value: value * (1 + hsPower18(s.year) * k) * el, label: el > 1 ? l('Single da eleição (voto no CD)', 'Election single (ballot in the CD)') : l('Ingresso de aperto de mão no CD', 'Handshake ticket in the CD') };
});
registerMod('appeal', 'idols18enka', (s, value, ctx) => {
  const a = ctx.act, rel = ctx.release;
  if (!a || !rel || a.genre !== 'enka' || !rel.territories.includes('asia') || s.year - a.debutYear < 8) return null;
  return { value: value * 1.1, label: l('Público fiel do enka', 'Loyal enka audience') };
});

registerSimHook('month', 'idols18', (s) => {
  const st = id18(s);
  const r = Rng.fromSeed(`${s.config.seed}|idol18|${s.week}`);
  for (const id of Object.keys(st.hs)) {
    const a = s.acts[id];
    if (!a || a.owner !== 'player') { delete st.hs[id]; continue; }
    post(s, `idol18hs:${id}`, -hsCost18(s), 'live_costs', `Eventos de aperto de mão (${a.name})`);
    if (st.sec[id]) post(s, `idol18sec:${id}`, -secCost18(s), 'security', `Segurança nos eventos (${a.name})`);
    for (const pid of a.members) addStress(s, pid, 2, l('Filas de aperto de mão', 'Handshake lines'));
    nudge16(s, id, 'JPN', 0.6);
    if (r.chance(st.sec[id] ? 0.006 : 0.015)) {
      const p = s.persons[r.pick(a.members)];
      if (p) { addStress(s, p.id, 20, l('Ataque num evento', 'Attack at an event')); p.health = 'recovering'; }
      emitFact(s, { kind: 'health', actors: [p ? p.id : id, id], severity: 55, visibility: 'public', tags: ['bad', 'idol', 'security'], src: 'idols18', text: fmtL(l('Um fã ataca {p} num evento de aperto de mão de {a}.', 'A fan attacks {p} at a {a} handshake event.'), { p: p?.name ?? '?', a: a.name }) });
      notify(s, fmtL(l('⚠ Incidente de segurança no evento de {a}. Contratar segurança reduz o risco.', '⚠ Security incident at {a}\'s event. Hiring security cuts the risk.'), { a: a.name }), 'bad');
    }
    // eleição geral (junho, 2009+): a integrante mais votada brilha, as últimas sofrem
    if (s.month === 5 && s.year >= 2009 && a.members.length >= 3) {
      const ms = a.members.map((pid) => s.persons[pid]).filter((p) => p?.alive).sort((x, y) => (y!.skills.stage + y!.skills.voice) - (x!.skills.stage + x!.skills.voice));
      const top = ms[0], last = ms[ms.length - 1];
      if (top && last) {
        addStress(s, last.id, 10, l('Último lugar na eleição', 'Last place in the election'));
        last.morale = clamp(last.morale - 8, 0, 100);
        emitFact(s, { kind: 'award', actors: [top.id, id], severity: 25, visibility: 'public', tags: ['idol', 'election'], src: 'idols18', text: fmtL(l('{p} vence a eleição geral de {a}; {q} fica em último e chora no palco.', '{p} wins {a}\'s general election; {q} comes last and cries on stage.'), { p: top.name, a: a.name, q: last.name }) });
      }
    }
    // graduação (março)
    if (s.month === 2 && a.members.length > 3 && (st.asked[id] ?? -999) < s.week - 40) {
      const old = a.members.map((pid) => s.persons[pid]).find((p) => p?.alive && s.year - p.born >= 25);
      if (old && r.chance(0.4)) {
        st.asked[id] = s.week;
        pushInbox18(s, 'idols18_grad', { from: old.name, subject: fmtL(l('{p} quer se graduar de {a}', '{p} wants to graduate from {a}'), { p: old.name, a: a.name }),
          body: fmtL(l('Com {y} anos, {p} quer seguir carreira de atriz/solo. Show de graduação (renda {c}, ela sai com festa) ou segurar mais um ano (moral −15)?', 'At {y}, {p} wants an acting/solo career. Graduation concert (revenue {c}, she leaves in style) or hold her one more year (morale −15)?'), { y: s.year - old.born, p: old.name, c: `$${Math.round(gradRev18(s, a) / 100).toLocaleString('en-US')}` }),
          ref: { act: id, p: old.id }, actions: [{ id: 'hold', label: l('Segurar mais um ano', 'Hold one more year') }, { id: 'grad', label: l('Show de graduação', 'Graduation concert') }], weeks: 8 });
      }
    }
  }
  if (s.month === 11 && s.year >= 1951) kohaku(s);
});
export const gradRev18 = (s: GameState, a: Act) => money(s, Math.round(15000 * (0.5 + a.fame / 50)));
registerInboxKind('idols18_grad', { label: l('Idols', 'Idols'), cat: 'people', icon: 'star', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const a = s.acts[String(m.ref?.act)], p = s.persons[String(m.ref?.p)];
    if (!a || !p || !a.members.includes(p.id)) return l('Encerrado.', 'Closed.');
    if (action === 'hold') { p.morale = clamp(p.morale - 15, 0, 100); return l('Ela fica, contrariada.', 'She stays, unhappily.'); }
    post(s, `idol18grad:${a.id}`, gradRev18(s, a), 'live', `Show de graduação de ${p.name}`);
    a.momentum = clamp(a.momentum + 8, 0, 100);
    leaveBand16(s, a, p, 'solo');
    emitFact(s, { kind: 'exit', actors: [p.id, a.id], severity: 35, visibility: 'public', tags: ['idol', 'graduation'], src: 'idols18', text: fmtL(l('{p} se gradua de {a} num show lotado.', '{p} graduates from {a} at a sold-out show.'), { p: p.name, a: a.name }) });
    return l('Graduação feita: renda do show, momento +8.', 'Graduation done: concert revenue, momentum +8.');
  } });

function kohaku(s: GameState): void {
  const st = id18(s), key = String(s.year);
  if (st.kohaku[key]) return;
  const cand = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.fame > 10)
    .map((a) => ({ a, v: fameIn(s, a, 'JPN') + (a.genre === 'enka' ? 15 : 0) })).filter((x) => x.v >= 35).sort((x, y) => y.v - x.v).slice(0, 8);
  st.kohaku[key] = cand.map((x) => x.a.id);
  const keys = Object.keys(st.kohaku).sort();
  if (keys.length > 30) delete st.kohaku[keys[0]];
  const mine = cand.filter((x) => x.a.owner === 'player' && playerActs(s).includes(x.a.id));
  for (const { a } of mine) pushInbox18(s, 'idols18_kohaku', { from: 'NHK', subject: fmtL(l('{a} convidado para o festival de Ano-Novo da NHK', '{a} invited to NHK\'s New Year festival'), { a: a.name }),
    body: l('Cantar no Kōhaku em 31 de dezembro é a coroação do ano no Japão (fama no Japão +8; público mais velho). Recusar libera para um show pago de Réveillon.', 'Singing on Kōhaku on 31 December crowns the year in Japan (fame in Japan +8; older audience). Declining frees you for a paid New Year\'s gig.'),
    ref: { act: a.id }, actions: [{ id: 'gig', label: l('Recusar (show pago)', 'Decline (paid gig)') }, { id: 'go', label: l('Aceitar', 'Accept') }], weeks: 4 });
  if (cand.length) emitFact(s, { kind: 'award', actors: cand.slice(0, 3).map((x) => x.a.id), severity: 25, visibility: 'public', tags: ['japan', 'kohaku'], src: 'idols18', text: fmtL(l('Kōhaku {y}: {n} e outros no palco da NHK.', 'Kōhaku {y}: {n} and others on NHK\'s stage.'), { y: s.year, n: cand[0].a.name }) });
}
registerInboxKind('idols18_kohaku', { label: l('Japão', 'Japan'), cat: 'deals', icon: 'star', prio: 1, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const a = s.acts[String(m.ref?.act)];
    if (!a) return l('Encerrado.', 'Closed.');
    if (action === 'gig') { post(s, `idol18gig:${a.id}`, money(s, 8000), 'live', `Show de Réveillon (${a.name})`); return l('Show pago no Réveillon.', 'Paid New Year\'s gig.'); }
    nudge16(s, a.id, 'JPN', 8); a.fans.casual += 30000;
    return l('No palco do Kōhaku: fama no Japão +8.', 'On the Kōhaku stage: fame in Japan +8.');
  } });
