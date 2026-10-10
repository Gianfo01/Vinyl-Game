// Rodada 18 (regions18, R1) — K-POP COMPLETO. Programa de trainees do selo (anos de aulas pagas, dívida do trainee,
// desistências), debut direto ou por PROGRAMA DE SOBREVIVÊNCIA (fama instantânea, grupo-projeto de 2,5 anos, tentação de
// fraudar votos — Produce 101, 2019), contratos: "contrato escravo" de 13 anos até 2009 (processo à la TVXQ × SM);
// contrato-padrão da KFTC de 7 anos (2009) e a "maldição dos 7 anos" na renovação; regra de 2017 (custo de trainee não
// pode ser cobrado de quem sai). Fandom que compra em lote (álbuns com várias versões/photocards), vitórias semanais nos
// programas de música (Music Bank, Inkigayo) com mobilização de voto (e "sajaegi" — manipulação — a partir de 2018) e
// SERVIÇO MILITAR dos homens (adiado até os 30 para quem tem mérito cultural, lei de 2020).

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { acceptOffer, defaultOffer } from '../contracts';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { makeAct, personName } from '../people';
import type { Act, GameState, Offer } from '../types';
import { fmtL, money, nextId, notify, playerActs, post } from '../util';
import { nudge16 } from './fame16';
import { addStress } from '../stress17';

export interface Tr18 { id: string; name: string; m: boolean; born: number; voice: number; dance: number; look: number; months: number; debt: number }
export interface Kpop18State {
  prog?: number;
  tr: Tr18[];
  aud: number;
  ctr: Record<string, { y: number; slave?: 1; debt?: number; proj?: 1; rig?: number; sued?: 1; seven?: 1 }>;
  male: Record<string, 1>;
  mil: Record<string, { until: number; act: string }>;
  served: Record<string, 1>;
  multi: Record<string, 1>;
  vote: Record<string, number>;
  wins: Record<string, number>;
  asked: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { kpop18: Kpop18State } }
const fresh = (): Kpop18State => ({ tr: [], aud: -999, ctr: {}, male: {}, mil: {}, served: {}, multi: {}, vote: {}, wins: {}, asked: {} });
registerExt4('kpop18', fresh);
export function kp18(s: GameState): Kpop18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.kpop18 ??= fresh()) as Kpop18State;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
export const KPOP_G18 = ['kpop', 'k_indie', 'k_synth', 'trot'];
export const isK18 = (a: Act | undefined): boolean => !!a && KPOP_G18.includes(a.genre);
const kgenre = (y: number) => (y >= 1996 ? 'kpop' : 'pop');
export const progCost18 = (s: GameState) => money(s, 30000);
export const audCost18 = (s: GameState) => money(s, 5000);
export const trMonthly18 = (s: GameState) => money(s, 350);
export const survCost18 = (s: GameState) => money(s, 25000);
export const debutCost18 = (s: GameState) => money(s, 12000);
export const voteCost18 = (s: GameState) => money(s, 1500);
export const multiCost18 = (s: GameState) => money(s, 800);
/** O contrato-padrão da KFTC (2009) limita a 7 anos; a regra de 2017 proíbe cobrar custo de trainee de quem sai. */
export const kftc18 = (y: number) => ({ max7: y >= 2009, trainee: y >= 2017 });

export function progBlock18(s: GameState): L | null {
  if (kp18(s).prog !== undefined) return l('O programa já existe.', 'The programme already exists.');
  if (s.year < 1989) return l('O modelo de trainees surge com a SM Entertainment (1989).', 'The trainee model appears with SM Entertainment (1989).');
  if (s.player.cash < progCost18(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function foundProg18(s: GameState): L | null {
  const b = progBlock18(s);
  if (b) return b;
  post(s, 'kp18prog', -progCost18(s), 'artist_dev', 'Academia de trainees');
  kp18(s).prog = s.year;
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 25, visibility: 'public', tags: ['kpop', 'trainee'], src: 'kpop18', text: fmtL(l('{c} abre uma academia de trainees em Seul.', '{c} opens a trainee academy in Seoul.'), { c: s.config.companyName }) });
  return null;
}
export function audition18(s: GameState): L | null {
  const st = kp18(s);
  if (st.prog === undefined) return l('Abra o programa de trainees primeiro.', 'Open the trainee programme first.');
  if (s.week - st.aud < 52) return l('Uma audição por ano.', 'One audition a year.');
  if (s.player.cash < audCost18(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  st.aud = s.week;
  post(s, 'kp18aud', -audCost18(s), 'scouting', 'Audição de trainees');
  const r = Rng.fromSeed(`${s.config.seed}|kp18aud|${s.week}`);
  const n = r.int(3, 6), global = s.year >= 2010;
  for (let i = 0; i < n; i++) {
    const lang = global && r.chance(0.3) ? r.pick(['ja', 'zh', 'th', 'en'] as const) : 'ko';
    st.tr.push({ id: nextId(s, 'tr'), name: personName(r, lang), m: r.chance(0.5), born: s.year - r.int(13, 19), voice: r.int(15, 60), dance: r.int(15, 60), look: r.int(20, 80), months: 0, debt: 0 });
  }
  return fmtL(l('{n} trainees aprovados{g}.', '{n} trainees accepted{g}.'), { n, g: global ? l(' (audição global: alguns estrangeiros)', ' (global audition: some foreigners)') : '' });
}
export const trScore18 = (t: Tr18) => Math.round(t.voice * 0.4 + t.dance * 0.4 + t.look * 0.2);

export interface Debut18 { ids: string[]; mode: 'direct' | 'survival'; long?: boolean; rig?: boolean }
export function debutBlock18(s: GameState, o: Debut18): L | null {
  const st = kp18(s), ts = st.tr.filter((t) => o.ids.includes(t.id));
  if (ts.length < 2) return l('Escolha ao menos 2 trainees.', 'Pick at least 2 trainees.');
  if (ts.some((t) => t.months < 12)) return l('Todos precisam de 12+ meses de treino.', 'Everyone needs 12+ months of training.');
  if (o.mode === 'survival' && s.year < 2016) return l('Programas de sobrevivência só a partir de 2016 (Produce 101).', 'Survival shows only from 2016 (Produce 101).');
  if (o.long && kftc18(s.year).max7) return l('Desde 2009 o contrato-padrão da KFTC limita a 7 anos.', 'Since 2009 the KFTC standard contract caps terms at 7 years.');
  const cost = debutCost18(s) + (o.mode === 'survival' ? survCost18(s) : 0);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function debut18(s: GameState, o: Debut18): L | Act {
  const b = debutBlock18(s, o);
  if (b) return b;
  const st = kp18(s), ts = st.tr.filter((t) => o.ids.includes(t.id));
  const r = Rng.fromSeed(`${s.config.seed}|kp18deb|${s.week}|${o.ids.join()}`);
  const pot = clamp(ts.reduce((t, x) => t + trScore18(x), 0) / ts.length + 15, 20, 95);
  const surv = o.mode === 'survival';
  const a = makeAct(s, r, { genre: kgenre(s.year), city: 'seoul', members: ts.length, potential: pot, formed: s.year, debutYear: s.year, fame: surv ? 16 + (o.rig ? 6 : 0) : 3, owner: null });
  a.members.forEach((pid, i) => {
    const p = s.persons[pid], t = ts[i];
    if (!p || !t) return;
    p.name = t.name; p.born = t.born; p.skills.voice = Math.max(p.skills.voice, t.voice); p.skills.stage = Math.max(p.skills.stage, t.dance);
    if (t.m) st.male[pid] = 1;
  });
  if (ts.length === 1) a.name = ts[0].name;
  if (surv) { a.fans.casual += 90000; a.fans.active += 9000; a.fans.core += 1500; }
  const debt = ts.reduce((t, x) => t + x.debt, 0);
  post(s, `kp18deb:${a.id}`, -debutCost18(s), 'artist_dev', `Debut ${a.name}`);
  if (surv) post(s, `kp18surv:${a.id}`, -survCost18(s), 'marketing', `Programa de sobrevivência (${a.name})`);
  const off = { ...defaultOffer(s, a), advance: money(s, 1000), royalty: 0.08, termMonths: surv ? 30 : o.long ? 156 : 84, releasesOwed: surv ? 2 : 5, id: nextId(s, 'of'), week: s.week, status: 'pending' as const } as Offer;
  acceptOffer(s, a, off);
  const charge = !kftc18(s.year).trainee;
  st.ctr[a.id] = { y: s.year, slave: o.long ? 1 : undefined, debt: charge ? debt : 0, proj: surv ? 1 : undefined, rig: surv && o.rig ? s.week : undefined };
  if (charge && debt) a.trust = clamp(a.trust - 8, 0, 100);
  if (o.long) a.trust = clamp(a.trust - 10, 0, 100);
  st.tr = st.tr.filter((t) => !o.ids.includes(t.id));
  emitFact(s, { kind: 'signing', actors: [a.id, 'player'], severity: surv ? 45 : 25, visibility: 'public', tags: ['kpop', 'debut', surv ? 'survival' : 'direct'], src: 'kpop18', place: 'seoul',
    text: fmtL(surv ? l('{a} estreia saído do programa de sobrevivência — fandom pronto no primeiro dia.', '{a} debuts out of the survival show — a ready-made fandom on day one.') : l('{c} apresenta o grupo {a} após anos de treino.', '{c} debuts {a} after years of training.'), { a: a.name, c: s.config.companyName }) });
  return a;
}

/** Vitórias semanais nos programas de música (1998+). Mobilizar voto ajuda; depois de 2018, "sajaegi" vira escândalo. */
export function mobilize18(s: GameState, actId: string): L | null {
  const a = s.acts[actId];
  if (!a || a.owner !== 'player') return l('Inválido.', 'Invalid.');
  if (s.player.cash < voteCost18(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `kp18vote:${actId}`, -voteCost18(s), 'promo', `Mobilização de fandom (${a.name})`);
  kp18(s).vote[actId] = s.week + 8;
  return null;
}
export const winOdds18 = (s: GameState, a: Act): number => clamp(0.06 + a.fame / 140 + Math.log10(1 + a.fans.core) / 25 + ((kp18(s).vote[a.id] ?? 0) > s.week ? 0.15 : 0), 0, 0.85);

registerMod('chartUnits', 'kpop18', (s, value, ctx) => {
  const rel = ctx.release;
  if (!rel || rel.owner !== 'player' || !kp18(s).multi[rel.actId] || !rel.territories.includes('asia')) return null;
  return { value: value * 1.3, label: l('Fandom compra em lote (várias versões)', 'Fandom bulk-buying (multiple versions)') };
});
registerMod('appeal', 'kpop18mil', (s, value, ctx) => {
  const a = ctx.act;
  if (!a || !a.members.length) return null;
  const st = kp18(s);
  const away = a.members.filter((id) => (st.mil[id]?.until ?? 0) > s.week).length;
  if (!away) return null;
  return { value: value * (1 - 0.6 * away / a.members.length), label: l('Integrantes no serviço militar', 'Members in military service') };
});

function military(s: GameState): void {
  const st = kp18(s);
  for (const [pid, m] of Object.entries(st.mil)) if (m.until <= s.week) {
    delete st.mil[pid]; st.served[pid] = 1;
    const a = s.acts[m.act], p = s.persons[pid];
    if (a && p) { a.momentum = clamp(a.momentum + 12, 0, 100); notify(s, fmtL(l('🎖 {p} volta do serviço militar; os fãs de {a} lotam a saída do quartel.', '🎖 {p} returns from military service; {a}\'s fans pack the base gates.'), { p: p.name, a: a.name }), 'good'); }
  }
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || !isK18(a) || (st.asked[id] ?? -999) > s.week - 26) continue;
    const lim = s.year >= 2020 && a.fame >= 60 ? 30 : 28;
    const due = a.members.filter((pid) => st.male[pid] && !st.served[pid] && !st.mil[pid] && s.persons[pid]?.alive && s.year - (s.persons[pid]?.born ?? s.year) >= lim);
    if (!due.length) continue;
    st.asked[id] = s.week;
    pushInbox18(s, 'kpop18_mil', { from: tl(l('Ministério da Defesa', 'Ministry of Defence')), subject: fmtL(l('{a}: convocação para o serviço militar', '{a}: military service call-up'), { a: a.name }),
      body: fmtL(l('{n} integrante(s) chegaram ao limite de idade ({l} anos{x}). Alistar só quem foi chamado (o grupo segue desfalcado, −60% do peso deles) ou o grupo inteiro de uma vez (pausa de 18 meses, volta mais forte)?', '{n} member(s) reached the age limit ({l}{x}). Enlist only those called (the group carries on short-handed, −60% of their weight) or the whole group at once (18-month break, stronger comeback)?'), { n: due.length, l: lim, x: lim === 30 ? l(', adiamento por mérito cultural', ', cultural-merit deferral') : '' }),
      ref: { act: id }, actions: [{ id: 'all', label: l('Grupo inteiro de uma vez', 'Whole group at once') }, { id: 'due', label: l('Só os convocados', 'Only those called') }], weeks: 8 });
  }
}
const tl = (x: L) => x.pt;
registerInboxKind('kpop18_mil', { label: l('K-pop', 'K-pop'), cat: 'people', icon: 'star', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const st = kp18(s), a = s.acts[String(m.ref?.act)];
    if (!a) return l('O grupo não existe mais.', 'The group no longer exists.');
    const all = action === 'all';
    const go = a.members.filter((pid) => st.male[pid] && !st.served[pid] && !st.mil[pid] && s.persons[pid]?.alive && s.year - (s.persons[pid]?.born ?? s.year) >= (all ? 20 : 28));
    for (const pid of go) st.mil[pid] = { until: s.week + 78, act: a.id };
    if (all) { a.hiatusUntil = s.week + 78; a.fans.core = Math.round(a.fans.core * 1.05); }
    emitFact(s, { kind: 'statement', actors: [a.id], severity: 35, visibility: 'public', tags: ['kpop', 'military'], src: 'kpop18', text: fmtL(all ? l('{a} anuncia que todos se alistam juntos: "esperem por nós".', '{a} announce they will all enlist together: "wait for us".') : l('{n} de {a} se alista; o grupo segue como sub-unidade.', '{n} of {a} enlist; the group carries on as a sub-unit.'), { a: a.name, n: go.length }) });
    return all ? l('Pausa de 18 meses; o fandom espera (+5% núcleo).', '18-month break; the fandom waits (+5% core).') : l('O grupo segue desfalcado.', 'The group carries on short-handed.');
  } });

function contracts(s: GameState, r: Rng): void {
  const st = kp18(s);
  for (const [id, c] of Object.entries(st.ctr)) {
    const a = s.acts[id];
    if (!a || a.owner !== 'player') { delete st.ctr[id]; continue; }
    // reforma de 2009: os contratos longos caem para 7 anos
    if (c.slave && kftc18(s.year).max7 && s.month === 0) {
      const k = a.contractId ? s.contracts[a.contractId] : undefined;
      if (k) k.endWeek = Math.min(k.endWeek, k.startWeek + Math.round(84 * 4.35));
      delete c.slave;
      notify(s, fmtL(l('KFTC: o contrato de {a} cai para 7 anos (contrato-padrão de 2009).', 'KFTC: {a}\'s contract is cut to 7 years (2009 standard contract).'), { a: a.name }), 'info');
    }
    // processo de "contrato escravo"
    if (c.slave && !c.sued && s.year - c.y >= 3 && a.fame >= 35 && r.chance(0.02)) {
      c.sued = 1;
      pushInbox18(s, 'kpop18_suit', { from: a.name, subject: fmtL(l('{a} processa o selo: "contrato escravo"', '{a} sue the label: "slave contract"'), { a: a.name }),
        body: l('Os integrantes pedem a anulação do contrato de 13 anos: dívida de trainee, folgas negadas, renda mínima. Acordo (pagar e encurtar) ou brigar na Justiça (30% de chance de vencer; se perder, o grupo sai livre)?', 'The members want the 13-year contract voided: trainee debt, denied days off, minimal income. Settle (pay and shorten) or fight in court (30% chance to win; lose and the group walks free)?'),
        ref: { act: id }, actions: [{ id: 'settle', label: l('Acordo', 'Settle') }, { id: 'fight', label: l('Brigar na Justiça', 'Fight in court') }], weeks: 8 });
    }
    // maldição dos 7 anos: renovar ou deixar ir
    const k = a.contractId ? s.contracts[a.contractId] : undefined;
    if (k && !c.proj && !c.seven && k.endWeek - s.week <= 13 && k.endWeek > s.week) {
      c.seven = 1;
      pushInbox18(s, 'kpop18_seven', { from: a.name, subject: fmtL(l('{a}: a maldição dos 7 anos', '{a}: the 7-year curse'), { a: a.name }),
        body: fmtL(l('O contrato vence em 3 meses. Renovar custa {c} em bônus (e 7 anos de paz); deixar vencer libera os integrantes — muitos grupos acabam aqui.', 'The contract ends in 3 months. Renewing costs {c} in bonuses (and 7 years of peace); letting it lapse frees the members — many groups end here.'), { c: `$${Math.round(renewCost18(s, a) / 100).toLocaleString('en-US')}` }),
        ref: { act: id }, actions: [{ id: 'renew', label: l('Renovar', 'Renew') }, { id: 'lapse', label: l('Deixar vencer', 'Let it lapse') }], weeks: 10 });
    }
    // fraude de voto no programa de sobrevivência vaza
    if (c.rig && s.week - c.rig < 104 && r.chance(0.03)) {
      delete c.rig;
      a.fame = clamp(a.fame - 10, 0, 100); a.trust = clamp(a.trust - 10, 0, 100);
      emitFact(s, { kind: 'scandal', actors: ['player', a.id], severity: 60, visibility: 'public', tags: ['bad', 'kpop', 'vote_rigging'], src: 'kpop18', text: fmtL(l('Promotores provam que os votos do programa que formou {a} foram manipulados.', 'Prosecutors prove the votes on the show that formed {a} were rigged.'), { a: a.name }) });
    }
  }
}
export const renewCost18 = (s: GameState, a: Act) => money(s, Math.round(30000 * (0.5 + a.fame / 50)));
registerInboxKind('kpop18_suit', { label: l('K-pop', 'K-pop'), cat: 'decision', icon: 'contract', prio: 3, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action, r) => {
    const a = s.acts[String(m.ref?.act)];
    if (!a || a.owner !== 'player') return l('Encerrado.', 'Closed.');
    const k = a.contractId ? s.contracts[a.contractId] : undefined;
    if (action === 'settle') {
      post(s, `kp18settle:${a.id}`, -money(s, 40000), 'legal', `Acordo ${a.name}`);
      if (k) k.endWeek = Math.min(k.endWeek, s.week + 104);
      a.trust = clamp(a.trust + 15, 0, 100);
      return l('Acordo: −$40k (dólares de 2020), contrato termina em 2 anos, confiança +15.', 'Settled: −$40k (2020 dollars), contract ends in 2 years, trust +15.');
    }
    const win = r.chance(0.3);
    emitFact(s, { kind: 'case_ruling', actors: [a.id, 'player'], severity: 55, visibility: 'public', tags: [win ? 'good' : 'bad', 'kpop', 'slave_contract'], src: 'kpop18', text: fmtL(win ? l('Justiça mantém o contrato de {a}.', 'Court upholds {a}\'s contract.') : l('Justiça anula o "contrato escravo" de {a}.', 'Court voids {a}\'s "slave contract".'), { a: a.name }) });
    if (!win) { if (a.contractId) { const ce = s.contracts[a.contractId]; if (ce) ce.endWeek = s.week; } a.trust = 0; return l('Perdeu: o grupo sai livre no fim do mês.', 'Lost: the group walks free at month end.'); }
    a.trust = clamp(a.trust - 20, 0, 100);
    return l('Venceu — mas o grupo trabalha ressentido (confiança −20).', 'Won — but the group works resentfully (trust −20).');
  } });
registerInboxKind('kpop18_seven', { label: l('K-pop', 'K-pop'), cat: 'decision', icon: 'contract', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, action) => {
    const a = s.acts[String(m.ref?.act)];
    if (!a || a.owner !== 'player') return l('Encerrado.', 'Closed.');
    if (action !== 'renew') return l('O contrato vai vencer.', 'The contract will lapse.');
    const k = a.contractId ? s.contracts[a.contractId] : undefined;
    post(s, `kp18renew:${a.id}`, -renewCost18(s, a), 'advances', `Renovação 7 anos ${a.name}`);
    if (k) { k.endWeek = s.week + Math.round(84 * 4.35); k.termMonths += 84; }
    const c = kp18(s).ctr[a.id]; if (c) delete c.seven;
    a.trust = clamp(a.trust + 10, 0, 100);
    emitFact(s, { kind: 'deal', actors: [a.id, 'player'], severity: 35, visibility: 'public', tags: ['good', 'kpop', 'renewal'], src: 'kpop18', text: fmtL(l('{a} quebra a maldição dos 7 anos e renova.', '{a} break the 7-year curse and renew.'), { a: a.name }) });
    return l('Renovado por mais 7 anos.', 'Renewed for 7 more years.');
  } });

registerSimHook('month', 'kpop18', (s) => {
  const st = kp18(s);
  const r = Rng.fromSeed(`${s.config.seed}|kp18|${s.week}`);
  // trainees: custo, crescimento, desistência
  if (st.tr.length) {
    post(s, 'kp18tr', -trMonthly18(s) * st.tr.length, 'artist_dev', `Treino de ${st.tr.length} trainees`);
    st.tr = st.tr.filter((t) => {
      t.months++; t.debt += trMonthly18(s);
      t.voice = clamp(t.voice + r.float(0.3, 1.6), 0, 100); t.dance = clamp(t.dance + r.float(0.4, 1.8), 0, 100);
      if (r.chance(t.months > 48 ? 0.035 : 0.015)) {
        if (!kftc18(s.year).trainee && t.debt) post(s, `kp18quit:${t.id}`, Math.round(t.debt * 0.3), 'other_income', `Multa de trainee desistente (${t.name})`);
        notify(s, fmtL(l('A trainee {n} desistiu depois de {m} meses{x}.', 'Trainee {n} quit after {m} months{x}.'), { n: t.name, m: t.months, x: kftc18(s.year).trainee ? '' : l(' (pagou multa: regra pré-2017)', ' (paid a penalty: pre-2017 rule)') }), 'info');
        return false;
      }
      return true;
    });
  }
  // fandom: várias versões custam fabricação e engordam o núcleo
  for (const id of Object.keys(st.multi)) {
    const a = s.acts[id];
    if (!a || a.owner !== 'player') { delete st.multi[id]; continue; }
    post(s, `kp18multi:${id}`, -multiCost18(s), 'manufacturing', `Versões e photocards (${a.name})`);
    a.fans.core = Math.round(a.fans.core * 1.01);
  }
  // programas de música semanais
  if (s.year >= 1998) for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || !isK18(a) || s.week - a.lastRelease > 8) continue;
    if (!r.chance(winOdds18(s, a))) continue;
    st.wins[id] = (st.wins[id] ?? 0) + 1;
    a.fame = clamp(a.fame + 1, 0, 100); nudge16(s, id, 'KOR', 2);
    const voted = (st.vote[id] ?? 0) > s.week;
    emitFact(s, { kind: 'award', actors: [id], severity: 20, visibility: 'public', tags: ['good', 'kpop', 'music_show'], src: 'kpop18', text: fmtL(l('{a} vence no programa de música da semana ({n}ª vitória).', '{a} win this week\'s music show ({n} wins).'), { a: a.name, n: st.wins[id] }) });
    if (voted && s.year >= 2018 && r.chance(0.08)) {
      a.trust = clamp(a.trust - 5, 0, 100); a.fame = clamp(a.fame - 3, 0, 100);
      for (const pid of a.members) addStress(s, pid, 8, l('Acusação de sajaegi', 'Sajaegi accusation'));
      emitFact(s, { kind: 'scandal', actors: ['player', id], severity: 45, visibility: 'public', tags: ['bad', 'kpop', 'sajaegi'], src: 'kpop18', text: fmtL(l('Fãs rivais acusam {a} de "sajaegi" (compra de posições).', 'Rival fans accuse {a} of "sajaegi" (chart buying).'), { a: a.name }) });
    }
  }
  military(s);
  contracts(s, r);
});

registerExplain('kpop18.win', (s, c) => {
  const a = s.acts[String(c.act)];
  if (!a) return null;
  return { title: l('Chance de vitória semanal', 'Weekly win chance'), value: Math.round(winOdds18(s, a) * 100), fmt: 'pct', parts: [
    { label: l('Base', 'Base'), value: 6, fmt: 'num' }, { label: l('Fama ÷ 1,4', 'Fame ÷ 1.4'), value: Math.round(a.fame / 1.4), fmt: 'signed' },
    { label: l('Núcleo de fãs (votos)', 'Core fans (votes)'), value: Math.round(Math.log10(1 + a.fans.core) * 4), fmt: 'signed' },
    { label: l('Mobilização de voto', 'Vote drive'), value: (kp18(s).vote[a.id] ?? 0) > s.week ? 15 : 0, fmt: 'signed' }], note: l('Só nas 8 semanas após um lançamento; teto 85%.', 'Only in the 8 weeks after a release; cap 85%.') };
});
registerAdvisorTip('kpop18', (s) => {
  const st = kp18(s), ready = st.tr.filter((t) => t.months >= 24);
  if (ready.length < 4) return [];
  return [{ id: 'kp18-debut', level: 'info', cat: 'opportunity', score: 40, text: fmtL(l('{n} trainees com 2+ anos de treino: hora do debut?', '{n} trainees with 2+ years of training: time to debut?'), { n: ready.length }),
    why: [l('Cada mês a mais custa treino e aumenta a chance de desistência.', 'Each extra month costs training and raises the dropout risk.')], goto: { area: 'regions18', tab: ['regions18', 'kpop'] } }];
});
