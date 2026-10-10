// Rodada 18 (supply18, D5): novos formatos de acordo.
// - Contrato de desenvolvimento: opção barata de 12–24 meses sobre um artista livre (mesada, ensaio, demos); rivais
//   não podem contratá-lo; no fim, você exerce a opção (contrato indie com cláusulas contracts18), estende ou libera.
//   Se o artista "estourar" no incubador, ele pede mais para assinar.
// - Selo-vaidade (imprint) de uma estrela da casa: ela ganha confiança e indica talentos do seu gosto; você paga a
//   estrutura e divide a receita dos atos do selo dela.
// - Joint venture de gênero com uma major: aporte de capital e músculo de marketing no gênero; a major leva 30% da
//   receita desses lançamentos e, depois de 5 anos, pode querer comprar a sua metade.
// - Pacotes de contrato novos em contracts18: Serviços de selo e P&D para artistas donos do master.

import { clamp, Rng, seedState } from '../../core/rng';
import { FAMILIES, familyOf, l, type FamilyId, type L } from '../../data/world';
import { acceptOffer, defaultOffer } from '../contracts';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { registerExplain } from '../explain18';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post, remember } from '../util';
import { PKG18, applyPkg18 } from './contracts18';
import { SIGN_VETO } from './gate14';

const $ = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const rngFor = (s: GameState, k: string) => new Rng(seedState(`deal18|${s.config.seed}|${k}`));
const famName = (f: string): L => FAMILIES.find((x) => x.id === f)?.name ?? l(f);

export interface Dev18 { act: string; start: number; end: number; stip: number; fame0: number; ext?: boolean; asked?: boolean }
export interface Imp18 { host: string; name: string; since: number; acts: string[]; paid: number; next: number }
export interface Jv18 { lb: string; fam: string; since: number; cap: number; paid: number; asked?: boolean; cool?: boolean }
export interface Deals18 { dev: Record<string, Dev18>; imp: Record<string, Imp18>; jv: Jv18[]; rv: Record<string, number>; log: { w: number; t: L }[] }
declare module '../ext4' { interface Ext4 { deals18: Deals18 } }
const fresh = (): Deals18 => ({ dev: {}, imp: {}, jv: [], rv: {}, log: [] });
registerExt4('deals18', fresh);
export function deals18(s: GameState): Deals18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.deals18 ??= fresh()) as Deals18;
  st.dev ??= {}; st.imp ??= {}; st.jv ??= []; st.rv ??= {}; st.log ??= [];
  return st;
}
const log = (s: GameState, t: L) => { const st = deals18(s); st.log.unshift({ w: s.week, t }); if (st.log.length > 30) st.log.length = 30; };

// rivais não contratam quem está em desenvolvimento com você
SIGN_VETO.push((s, _lb, act) => !!deals18(s).dev[act.id]);

// ================================================================== desenvolvimento

export const devStipend18 = (s: GameState): number => money(s, 650);
/** Chance de o artista aceitar uma opção barata: quem já tem nome quer contrato de verdade. */
export function devChance18(s: GameState, a: Act): { p: number; why: L[] } {
  const why: L[] = [l('Base: 80% topam mesada, estúdio e ensaio', 'Base: 80% take a stipend, studio and rehearsal')];
  let p = 0.8;
  if (a.fame > 10) { p -= (a.fame - 10) / 40; why.push(fmtL(l('Já tem nome (alcance {f}): quer contrato de verdade', 'Already known (reach {f}): wants a real deal'), { f: Math.round(a.fame) })); }
  if (a.trust > 50) { p += 0.1; why.push(l('Confia em você', 'Trusts you')); }
  if (s.player.reputation.artists > 60) { p += 0.05; why.push(l('Sua fama entre artistas', 'Your reputation among artists')); }
  return { p: clamp(p, 0.05, 0.95), why };
}
export function devCandidates18(s: GameState): Act[] {
  const known = Object.keys(s.knowledge ?? {});
  return known.map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.owner && !a.playerBand && a.fame < 35 && a.status !== 'retired' && a.status !== 'split' && !deals18(s).dev[a.id] && a.members.length > 0).slice(0, 30);
}
export function startDev18(s: GameState, actId: string, months: 12 | 24): { ok: boolean; text: L } {
  const a = s.acts[actId], st = deals18(s);
  if (!a || a.owner || a.playerBand) return { ok: false, text: l('Artista indisponível.', 'Artist unavailable.') };
  if (st.dev[actId]) return { ok: false, text: l('Já está em desenvolvimento.', 'Already in development.') };
  if (Object.keys(st.dev).length >= 4) return { ok: false, text: l('No máximo 4 artistas em desenvolvimento.', 'At most 4 artists in development.') };
  const stip = devStipend18(s);
  if (s.player.cash < stip * 3) return { ok: false, text: l('Caixa insuficiente para 3 meses de mesada.', 'Not enough cash for 3 months of stipend.') };
  const ch = devChance18(s, a);
  if (!rngFor(s, `dev|${actId}|${s.week}`).chance(ch.p)) { a.trust = clamp(a.trust - 2, 0, 100); return { ok: false, text: fmtL(l('{a} recusou a opção: prefere tentar a sorte.', '{a} turned down the option: prefers to take their chances.'), { a: a.name }) }; }
  st.dev[actId] = { act: actId, start: s.week, end: s.week + Math.round(months * 4.35), stip, fame0: a.fame };
  post(s, `dev18:${actId}`, -stip, 'artist_dev', `Desenvolvimento: ${a.name}`);
  a.trust = clamp(a.trust + 6, 0, 100);
  log(s, fmtL(l('{a} entra no programa de desenvolvimento ({m} meses).', '{a} joins the development programme ({m} months).'), { a: a.name, m: months }));
  emitFact(s, { kind: 'signing', actors: [actId, 'player'], severity: 15, visibility: 'rumor', tags: ['deal', 'development'], text: fmtL(l('{c} banca o desenvolvimento de {a}.', '{c} bankrolls {a}\'s development.'), { c: s.config.companyName, a: a.name }), src: 'deals18' });
  return { ok: true, text: fmtL(l('{a} topou: mesada de {v}/mês, estúdio e ensaio. Rivais não podem contratá-lo.', '{a} agreed: {v}/month stipend, studio and rehearsal. Rivals can\'t sign them.'), { a: a.name, v: $(stip) }) };
}
/** Valor para exercer a opção: adiantamento modesto; se o artista estourou, pede o dobro. */
export function devSignCost18(s: GameState, d: Dev18): number {
  const a = s.acts[d.act];
  if (!a) return 0;
  const base = defaultOffer(s, a).advance * 0.6;
  return Math.round(a.fame - d.fame0 > 15 ? base * 2 : base);
}
export function exerciseDev18(s: GameState, actId: string): { ok: boolean; text: L } {
  const st = deals18(s), d = st.dev[actId], a = s.acts[actId];
  if (!d || !a) return { ok: false, text: l('Sem opção ativa.', 'No active option.') };
  if (a.owner) { delete st.dev[actId]; return { ok: false, text: l('O artista já tem selo.', 'The artist already has a label.') }; }
  const adv = devSignCost18(s, d);
  if (s.player.cash < adv) return { ok: false, text: l('Caixa insuficiente para o adiantamento.', 'Not enough cash for the advance.') };
  const o = { ...defaultOffer(s, a), advance: adv, releasesOwed: 3 };
  applyPkg18(o, 'indie');
  acceptOffer(s, a, { ...o, id: `dev18-${actId}`, week: s.week, status: 'pending' });
  delete st.dev[actId];
  a.trust = clamp(a.trust + 5, 0, 100);
  log(s, fmtL(l('Opção exercida: {a} assina ({v} de adiantamento).', 'Option exercised: {a} signs ({v} advance).'), { a: a.name, v: $(adv) }));
  return { ok: true, text: fmtL(l('{a} assinou o contrato depois do desenvolvimento.', '{a} signed after development.'), { a: a.name }) };
}
export function releaseDev18(s: GameState, actId: string): void {
  const st = deals18(s), a = s.acts[actId];
  if (!st.dev[actId]) return;
  delete st.dev[actId];
  if (a) { a.trust = clamp(a.trust - 4, 0, 100); log(s, fmtL(l('{a} liberado do desenvolvimento.', '{a} released from development.'), { a: a.name })); }
}

function devMonth(s: GameState): void {
  const st = deals18(s);
  for (const d of Object.values(st.dev)) {
    const a = s.acts[d.act];
    if (!a || a.owner || a.status === 'retired' || a.status === 'split') { delete st.dev[d.act]; continue; }
    post(s, `dev18m:${d.act}:${s.month}`, -d.stip, 'artist_dev', `Desenvolvimento: ${a.name}`);
    const r = rngFor(s, `devm|${d.act}|${s.year}|${s.month}`);
    a.rehearsed = clamp((a.rehearsed ?? 0) + 3, 0, 100);
    a.networking = clamp((a.networking ?? 0) + 1, 0, 100);
    if (r.chance(0.3)) { a.fame = clamp(a.fame + r.float(0.2, 0.9) * (a.potential / 60), 0, 100); a.momentum = clamp(a.momentum + 3, 0, 100); a.fans.casual += r.int(100, 600); }
    if (s.week >= d.end && !d.asked) {
      d.asked = true;
      const big = a.fame - d.fame0 > 15;
      pushInbox18(s, 'deal_dev', {
        from: a.name, tone: big ? 'bad' : 'info', weeks: 6,
        subject: fmtL(l('Fim da opção de desenvolvimento: {a}', 'Development option ends: {a}'), { a: a.name }),
        body: fmtL(big ? l('{a} cresceu muito no incubador (alcance {f0} → {f}). Assina, mas quer o dobro: {v}. Se você liberar, as majors vão atrás.', '{a} grew a lot in the incubator (reach {f0} → {f}). Will sign, but wants double: {v}. Release them and the majors will pounce.') : l('{a} terminou o período de desenvolvimento (alcance {f0} → {f}). Exercer a opção custa {v} de adiantamento.', '{a} finished development (reach {f0} → {f}). Exercising the option costs a {v} advance.'),
          { a: a.name, f0: Math.round(d.fame0), f: Math.round(a.fame), v: $(devSignCost18(s, d)) }),
        ref: { act: d.act },
        actions: [{ id: 'sign', label: l('Exercer a opção (assinar)', 'Exercise the option (sign)') }, ...(d.ext ? [] : [{ id: 'extend', label: l('Estender 12 meses', 'Extend 12 months') }]), { id: 'release', label: l('Liberar', 'Release') }],
      });
    }
    if (s.week >= d.end + 26) releaseDev18(s, d.act);
  }
}
registerInboxKind('deal_dev', {
  label: l('Desenvolvimento', 'Development'), cat: 'deals', icon: 'star', prio: 2,
  goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : { area: 'supply18' }),
  handle: (s, m, action) => {
    const id = String(m.ref?.act ?? ''), st = deals18(s), d = st.dev[id], a = s.acts[id];
    if (!d || !a) return l('Já resolvido.', 'Already settled.');
    if (action === 'sign') return exerciseDev18(s, id).text;
    if (action === 'extend') {
      if (a.fame - d.fame0 > 15 && rngFor(s, `ext|${id}`).chance(0.6)) { releaseDev18(s, id); return fmtL(l('{a} recusou estender: "vocês queriam me prender barato". Está livre.', '{a} refused to extend: "you wanted me cheap". Now free.'), { a: a.name }); }
      d.end = s.week + 52; d.ext = true; d.asked = false; return fmtL(l('{a} fica mais 12 meses no programa.', '{a} stays 12 more months.'), { a: a.name });
    }
    releaseDev18(s, id);
    return fmtL(l('{a} está livre.', '{a} is free.'), { a: a.name });
  },
});

// ================================================================== selo-vaidade

export const impSetup18 = (s: GameState): number => money(s, 15000);
export const impMonthly18 = (s: GameState): number => money(s, 1200);
export function impOk18(s: GameState, a: Act | undefined): L | null {
  if (!a || a.owner !== 'player' || a.playerBand) return l('Só para estrelas do seu elenco.', 'Only for stars on your roster.');
  if (a.fame < 50) return l('Precisa de alcance 50+: o selo vive do nome da estrela.', 'Needs reach 50+: the imprint lives on the star\'s name.');
  if (a.trust < 50) return l('A estrela não confia o bastante em você.', 'The star doesn\'t trust you enough.');
  if (deals18(s).imp[a.id]) return l('Já tem selo próprio.', 'Already has an imprint.');
  if (Object.keys(deals18(s).imp).length >= 3) return l('No máximo 3 selos-vaidade.', 'At most 3 imprints.');
  return null;
}
export function startImprint18(s: GameState, actId: string): { ok: boolean; text: L } {
  const a = s.acts[actId], e = impOk18(s, a);
  if (e) return { ok: false, text: e };
  const c = impSetup18(s);
  if (s.player.cash < c) return { ok: false, text: l('Caixa insuficiente.', 'Not enough cash.') };
  post(s, `imp18:${actId}`, -c, 'artist_dev', `Selo-vaidade de ${a!.name}`);
  const name = `${a!.name.split(' ')[0]} Records`;
  deals18(s).imp[actId] = { host: actId, name, since: s.week, acts: [], paid: 0, next: s.week + 13 };
  a!.trust = clamp(a!.trust + 12, 0, 100);
  const txt = fmtL(l('{a} ganha o próprio selo dentro da {c}: {n}.', '{a} gets their own imprint inside {c}: {n}.'), { a: a!.name, c: s.config.companyName, n: name });
  log(s, txt); remember(s, 'imprint', txt, { actId, important: true });
  emitFact(s, { kind: 'deal', actors: [actId, 'player'], severity: 35, visibility: 'public', tags: ['deal', 'imprint'], text: txt, src: 'deals18' });
  return { ok: true, text: txt };
}
export function closeImprint18(s: GameState, actId: string, why?: L): void {
  const st = deals18(s), im = st.imp[actId];
  if (!im) return;
  delete st.imp[actId];
  const a = s.acts[actId];
  const txt = why ?? fmtL(l('{n} fecha as portas.', '{n} closes its doors.'), { n: im.name });
  log(s, txt);
  if (a && a.owner === 'player') a.trust = clamp(a.trust - 10, 0, 100);
  emitFact(s, { kind: 'deal', actors: [actId, 'player'], severity: 25, visibility: 'public', tags: ['deal', 'imprint'], text: txt, src: 'deals18' });
}
const impOf = (s: GameState, actId: string): Imp18 | undefined => Object.values(deals18(s).imp).find((x) => x.acts.includes(actId));

function impMonth(s: GameState): void {
  const st = deals18(s);
  for (const im of Object.values(st.imp)) {
    const host = s.acts[im.host];
    if (!host || host.owner !== 'player' || host.status === 'retired' || host.status === 'split') { closeImprint18(s, im.host, fmtL(l('{n} fecha: a estrela não está mais com você.', '{n} closes: the star is no longer with you.'), { n: im.name })); continue; }
    post(s, `imp18m:${im.host}:${s.month}`, -impMonthly18(s), 'salaries', `Estrutura do selo ${im.name}`);
    host.trust = clamp(host.trust + 0.5, 0, 100);
    // divide a receita dos atos do selo com a estrela (15% da receita do master)
    let rev = 0;
    for (const id of im.acts) for (const rid of s.acts[id]?.releases ?? []) { const rel = s.releases[rid]; if (!rel || rel.owner !== 'player') continue; const k = `i:${rid}`; rev += Math.max(0, rel.revenue - (st.rv[k] ?? 0)); st.rv[k] = rel.revenue; }
    if (rev > 0) { const cut = Math.round(rev * 0.15); im.paid += cut; post(s, `imp18cut:${im.host}:${s.month}`, -cut, 'royalties', `Parte de ${host.name} no selo ${im.name}`); }
    im.acts = im.acts.filter((id) => s.acts[id]?.owner === 'player');
    // a cada trimestre a estrela indica um talento do gosto dela
    if (s.week >= im.next) {
      im.next = s.week + 13;
      const fam = familyOf(host.genre);
      const pool = Object.values(s.acts).filter((x) => !x.owner && !x.playerBand && x.fame < 30 && x.members.length && x.status !== 'retired' && x.status !== 'split' && !st.dev[x.id] && familyOf(x.genre) === fam);
      const cand = pool.length ? pool[rngFor(s, `impc|${im.host}|${s.week}`).int(0, pool.length - 1)] : undefined;
      if (cand) pushInbox18(s, 'deal_imp', {
        from: host.name, weeks: 8, subject: fmtL(l('{h} indica {a} para o {n}', '{h} recommends {a} for {n}'), { h: host.name, a: cand.name, n: im.name }),
        body: fmtL(l('"Vi {a} num show pequeno. É o futuro do {g}." A estrela quer o talento no selo dela: contrato de desenvolvimento pela metade da mesada (ela banca o resto). Recusar magoa um pouco.', '"Saw {a} at a small gig. The future of {g}." The star wants them on the imprint: a development deal at half the stipend (she covers the rest). Declining stings a little.'), { a: cand.name, g: famName(fam) }),
        ref: { act: cand.id, host: im.host }, actions: [{ id: 'dev', label: l('Aceitar (desenvolvimento)', 'Accept (development)') }, { id: 'pass', label: l('Recusar', 'Pass') }],
      });
    }
  }
}
registerInboxKind('deal_imp', {
  label: l('Selo-vaidade', 'Imprint'), cat: 'deals', icon: 'star', prio: 1,
  goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : { area: 'supply18' }),
  handle: (s, m, action) => {
    const id = String(m.ref?.act ?? ''), host = String(m.ref?.host ?? ''), im = deals18(s).imp[host];
    if (action !== 'dev' || !im) { const h = s.acts[host]; if (h) h.trust = clamp(h.trust - 2, 0, 100); return l('Recusado.', 'Passed.'); }
    const r = startDev18(s, id, 12);
    if (r.ok) { const d = deals18(s).dev[id]; d.stip = Math.round(d.stip / 2); im.acts.push(id); }
    return r.text;
  },
});
// atos do selo de uma estrela pegam carona no nome dela (+4% de apelo no lançamento)
registerMod('appeal', 'deals18:imprint', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  const im = impOf(s, rel.actId);
  return im ? { value: v * 1.04, label: fmtL(l('Selo {n} (nome da estrela)', '{n} imprint (star\'s name)'), { n: im.name }) } : null;
});

// ================================================================== joint venture de gênero

export const jvCap18 = (s: GameState): number => Math.round(money(s, 60000) * (0.7 + s.player.hq * 0.2));
export function jvPartners18(s: GameState): string[] {
  return Object.values(s.labels).filter((x) => x.active && x.family === 'A' && (s.rivalries[x.id] ?? 0) <= 40 && !deals18(s).jv.some((j) => j.lb === x.id)).map((x) => x.id);
}
export function startJv18(s: GameState, lbId: string, fam: string): { ok: boolean; text: L } {
  const st = deals18(s), lb = s.labels[lbId];
  if (!lb || !jvPartners18(s).includes(lbId)) return { ok: false, text: l('Parceiro indisponível.', 'Partner unavailable.') };
  if (st.jv.some((j) => j.fam === fam)) return { ok: false, text: l('Já existe JV nesse gênero.', 'A JV in that genre already exists.') };
  if (s.player.hq < 1) return { ok: false, text: l('A major só fecha JV com selo que tenha sede de verdade (sede nível 1+).', 'The major only does JVs with a real HQ (level 1+).') };
  const mine = playerActs(s).filter((id) => familyOf(s.acts[id]?.genre ?? '') === fam).length;
  if (!mine) return { ok: false, text: l('Você precisa de ao menos um artista do gênero.', 'You need at least one artist in that genre.') };
  const cap = jvCap18(s);
  st.jv.push({ lb: lbId, fam, since: s.week, cap, paid: 0 });
  post(s, `jv18:${lbId}:${fam}`, cap, 'investment', `Aporte da JV de ${famName(fam).pt} (${lb.name})`);
  s.rivalries[lbId] = Math.max(0, (s.rivalries[lbId] ?? 0) - 15);
  const txt = fmtL(l('{c} e {m} criam uma joint venture de {g}: a major aporta {v} e põe o marketing dela nos lançamentos do gênero.', '{c} and {m} form a {g} joint venture: the major puts in {v} and its marketing muscle behind the genre\'s releases.'), { c: s.config.companyName, m: lb.name, g: famName(fam), v: $(cap) });
  remember(s, 'jv18', txt, { important: true });
  emitFact(s, { kind: 'deal', actors: ['player', `l:${lbId}`], severity: 40, visibility: 'public', tags: ['deal', 'jv'], text: txt, src: 'deals18' });
  return { ok: true, text: txt };
}
/** Desfazer: devolve o aporte (financiamento) e azeda a relação. */
export function endJv18(s: GameState, i: number): { ok: boolean; text: L } {
  const st = deals18(s), j = st.jv[i];
  if (!j) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (s.player.cash < j.cap) return { ok: false, text: fmtL(l('Para desfazer é preciso devolver o aporte ({v}).', 'Undoing it means returning the capital ({v}).'), { v: $(j.cap) }) };
  post(s, `jv18end:${j.lb}:${j.fam}`, -j.cap, 'investment', 'Devolução do aporte da JV');
  st.jv.splice(i, 1);
  s.rivalries[j.lb] = (s.rivalries[j.lb] ?? 0) + 5;
  return { ok: true, text: l('JV desfeita.', 'JV dissolved.') };
}
const jvOf = (s: GameState, actId: string): Jv18 | undefined => { const a = s.acts[actId]; if (!a) return undefined; const f = familyOf(a.genre); return deals18(s).jv.find((j) => j.fam === f); };

function jvMonth(s: GameState): void {
  const st = deals18(s);
  for (const j of [...st.jv]) {
    if (!s.labels[j.lb]?.active) { st.jv.splice(st.jv.indexOf(j), 1); log(s, l('A major da JV fechou; a JV acaba e o aporte fica com você.', 'The JV major closed; the JV ends and you keep the capital.')); continue; }
    let rev = 0;
    for (const id of playerActs(s)) {
      const a = s.acts[id];
      if (!a || familyOf(a.genre) !== j.fam) continue;
      for (const rid of a.releases) { const rel = s.releases[rid]; if (!rel || rel.owner !== 'player' || rel.week < j.since) continue; const k = `j:${rid}`; rev += Math.max(0, rel.revenue - (st.rv[k] ?? 0)); st.rv[k] = rel.revenue; }
    }
    if (rev > 0) { const cut = Math.round(rev * 0.3); j.paid += cut; post(s, `jv18cut:${j.lb}:${j.fam}:${s.month}`, -cut, 'distribution', `Parte da major na JV de ${famName(j.fam).pt}`); if (s.labels[j.lb]) s.labels[j.lb].cash += cut; }
    if (!j.asked && s.week - j.since >= 260) {
      j.asked = true;
      const price = Math.round(j.cap + j.paid * 1.5);
      pushInbox18(s, 'deal_jv', { from: s.labels[j.lb].name, weeks: 8, subject: fmtL(l('{m} quer comprar sua metade da JV de {g}', '{m} wants to buy your half of the {g} JV'), { m: s.labels[j.lb].name, g: famName(j.fam) }),
        body: fmtL(l('Cinco anos depois, a major exerce a cláusula de compra: oferece {v} pela sua metade (o aporte fica com você, e ela leva o rótulo e o marketing do gênero). Recusar mantém a JV, mas a major corta o apoio.', 'Five years on, the major triggers the buyout clause: {v} for your half (you keep the capital, it takes the brand and the genre marketing). Refusing keeps the JV, but the major cuts its support.'), { v: $(price) }),
        ref: { lb: j.lb, fam: j.fam, price }, actions: [{ id: 'sell', label: fmtL(l('Vender por {v}', 'Sell for {v}'), { v: $(price) }) }, { id: 'keep', label: l('Recusar e manter', 'Refuse and keep') }] });
    }
  }
}
registerInboxKind('deal_jv', {
  label: l('Joint venture', 'Joint venture'), cat: 'deals', icon: 'handshake', prio: 2, goto: () => ({ area: 'supply18' }),
  handle: (s, m, action) => {
    const st = deals18(s), i = st.jv.findIndex((j) => j.lb === m.ref?.lb && j.fam === m.ref?.fam);
    if (i < 0) return l('Já resolvido.', 'Already settled.');
    const j = st.jv[i];
    if (action === 'sell') {
      const v = Number(m.ref?.price ?? 0);
      post(s, `jv18sell:${j.lb}:${j.fam}`, v, 'asset_sales', 'Venda da metade da JV');
      st.jv.splice(i, 1);
      emitFact(s, { kind: 'deal', actors: ['player', `l:${j.lb}`], severity: 35, visibility: 'public', tags: ['deal', 'jv', 'sale'], text: fmtL(l('{c} vende sua metade da JV de {g} por {v}.', '{c} sells its half of the {g} JV for {v}.'), { c: s.config.companyName, g: famName(j.fam), v: $(v) }), src: 'deals18' });
      return fmtL(l('Vendido por {v}.', 'Sold for {v}.'), { v: $(v) });
    }
    j.cool = true;
    s.rivalries[j.lb] = (s.rivalries[j.lb] ?? 0) + 10;
    return l('JV mantida; a major esfria o apoio.', 'JV kept; the major cools its support.');
  },
});
registerMod('chartUnits', 'deals18:jv', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  const j = jvOf(s, rel.actId);
  if (!j || rel.week < j.since) return null;
  return { value: v * (j.cool ? 1.05 : 1.15), label: l('Marketing da major (JV)', 'Major marketing (JV)') };
});

registerSimHook('month', 'deals18', (s) => {
  const st = deals18(s);
  if (Object.keys(st.dev).length) devMonth(s);
  if (Object.keys(st.imp).length) impMonth(s);
  if (st.jv.length) jvMonth(s);
});

// ================================================================== pacotes contracts18: serviços de selo e P&D

if (!PKG18.some((p) => p.id === 'services')) PKG18.push(
  { id: 'services', model: 'distribution', fee: 0.25, name: l('Serviços de selo (artista dono do master)', 'Label services (artist owns the master)'), desc: l('O artista mantém o master e paga 25% da receita por distribuição, marketing e equipe; só metade do marketing é recuperável, por projeto; contas trimestrais rápidas com auditoria; um lançamento garantido com verba mínima.', 'The artist keeps the master and pays 25% of receipts for distribution, marketing and staff; only half the marketing is recoupable, per project; fast quarterly statements with audit; one guaranteed release with a promo floor.'),
    c: { pkg: 'services', rec: 0, video: false, tour: false, mkt: 0.5, cap: 0, cross: false, base: 'net', stmt: 'q', lag: 1, audit: true, minRel: 1, promo: 3000 }, rights: { master: 'artist', reversionYears: 0 } },
  { id: 'pd', model: 'distribution', fee: 0.18, name: l('P&D (prensagem e distribuição)', 'P&D (pressing & distribution)'), desc: l('O artista banca a gravação e o marketing e fica com o master; o selo só prensa e distribui por 18%. Nada recuperável, nenhuma verba garantida.', 'The artist funds recording and marketing and keeps the master; the label only presses and distributes for 18%. Nothing recoupable, no guaranteed spend.'),
    c: { pkg: 'pd', rec: 0, video: false, tour: false, mkt: 0, cap: 0, cross: false, base: 'net', stmt: 'q', lag: 2, audit: true, minRel: 0, promo: 0 }, rights: { master: 'artist', reversionYears: 0 } },
);

// ================================================================== porquês e conselheiro

registerExplain('deal.dev', (s, c) => {
  const a = s.acts[String(c.act ?? '')];
  if (!a) return null;
  const ch = devChance18(s, a);
  return { title: l('Chance de aceitar o desenvolvimento', 'Chance of accepting development'), value: ch.p, fmt: 'pct', parts: ch.why.map((w) => ({ label: w })), note: l('Opção barata: mesada + estúdio; no fim você decide se assina.', 'Cheap option: stipend + studio; at the end you decide whether to sign.') };
});
registerAdvisorTip('deals18', (s) => {
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  const star = playerActs(s).map((id) => s.acts[id]).find((a) => a && !impOk18(s, a) && a.trust >= 65 && a.fame >= 60);
  if (star && s.player.cash > impSetup18(s) * 4) out.push({ id: `imp-${star.id}`, level: 'info', cat: 'people', score: 38, text: fmtL(l('{a} está pronto para ter um selo próprio.', '{a} is ready for an own imprint.'), { a: star.name }), why: [l('Estrela fiel e famosa: o selo dela prende a renovação e traz talentos do gosto dela.', 'A loyal, famous star: an imprint locks in renewal and brings talent of their taste.')], effect: fmtL(l('{v} de entrada + {m}/mês; confiança +12.', '{v} setup + {m}/month; trust +12.'), { v: $(impSetup18(s)), m: $(impMonthly18(s)) }), goto: { area: 'supply18' } });
  for (const d of Object.values(deals18(s).dev)) if (s.week >= d.end - 4 && s.week < d.end) out.push({ id: `dev-${d.act}`, level: 'warn', cat: 'people', score: 55, text: fmtL(l('A opção sobre {a} vence em breve.', 'Your option on {a} expires soon.'), { a: s.acts[d.act]?.name ?? '' }), goto: { act: d.act } });
  return out;
});

export const devOf18 = (s: GameState, actId: string): Dev18 | undefined => deals18(s).dev[actId];
export const impOfAct18 = impOf;
export const famIds18 = (): FamilyId[] => FAMILIES.map((f) => f.id);
