// Rodada 21 — FUNÇÕES MÚLTIPLAS POR PESSOA, com vínculos que mudam ao longo do tempo. Alguém começa como artista,
// abre um selo, empresaria outros músicos e cria um festival — sem deixar de tocar. A linha do tempo de cada pessoa
// junta o que já existia (carreira nova do npc17, segunda carreira do world18, integrante de ato) com as funções
// novas desta rodada (dono(a) de festival, produtor(a)/financiador(a), dono(a) de selo ainda na ativa) e as funções
// reais documentadas no acervo (ROLES21), que entram no ano certo no modo nomes reais.
//
// Cada inclusão gera DECISÕES CONCRETAS para o jogador (Caixa → Decisões):
//  - empresário(a) novo quer representar um artista seu (aceitar, negociar a comissão, recusar);
//  - festival novo convida um artista seu para a escalação (aceitar o cachê, pedir horário nobre, recusar);
//  - produtor(a)/financiador(a) oferece bancar o próximo disco (adiantamento contra parte da receita, 24 meses);
//  - selo aberto por artista disputa um talento seu (cobrir a proposta, deixar a relação esfriar);
//  - patrocínio para o seu festival ou casa de shows (aceitar, exigir exclusividade, recusar);
//  - artista sem empresário pede que você o represente (se você tem a carreira de empresário).
// Efeitos passam pelo razão (post) e por fluxos mensais com prazo; tudo com semente própria (sem mexer no RNG do jogo).

import { Rng, clamp } from '../../core/rng';
import { ROLES21, type Role21 } from '../../data/acervo21';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { histMode } from '../history15';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { careerOf, foundLabel17 } from './npc17';
import { career18 } from './world18';
import { careers } from './careers12';
import { ventures } from './ventures9';
import { actsNow27 } from '../tickcache27';

export type Role21K = 'artist' | 'manager' | 'label_owner' | 'label_exec' | 'festival_founder' | 'producer' | 'financier' | 'publisher' | 'booking'
  | 'studio_owner' | 'dj_radio' | 'media' | 'venue_owner' | 'songwriter' | 'teacher' | 'politics' | 'business';
export const ROLE21_NAME: Record<Role21K, L> = {
  artist: l('Artista', 'Artist'), manager: l('Empresário(a)', 'Manager'), label_owner: l('Dono(a) de selo', 'Label owner'), label_exec: l('Executivo(a)/A&R', 'Executive/A&R'),
  festival_founder: l('Criador(a) de festival', 'Festival founder'), producer: l('Produtor(a)', 'Producer'), financier: l('Financiador(a) de discos', 'Record financier'),
  publisher: l('Editor(a) musical', 'Music publisher'), booking: l('Agente/promotor(a)', 'Booking agent/promoter'), studio_owner: l('Dono(a) de estúdio', 'Studio owner'),
  dj_radio: l('DJ/radialista', 'DJ/radio host'), media: l('Mídia/crítica', 'Media/critic'), venue_owner: l('Dono(a) de casa de shows', 'Venue owner'),
  songwriter: l('Compositor(a)', 'Songwriter'), teacher: l('Professor(a)', 'Teacher'), politics: l('Política', 'Politics'), business: l('Negócios fora da música', 'Business outside music'),
};
export interface Span21 { k: Role21K; org?: string; from: number; to?: number; real?: 1; why?: L; /** terminou sem ano registrado */ ended?: 1 }
export interface Fest21 { id: string; name: string; city: string; owner: string; since: number; size: number }
export interface Flow21 { key: string; amt: number; until: number; cat: string; memo: string }
export interface R21 { sp: Record<string, Span21[]>; fest: Fest21[]; flow: Flow21[]; seen: Record<string, 1>; cd: Record<string, number>; n: number }
declare module '../ext4' { interface Ext4 { r21: R21 } }
const fresh = (): R21 => ({ sp: {}, fest: [], flow: [], seen: {}, cd: {}, n: 0 });
registerExt4('r21', fresh);
export function r21(s: GameState): R21 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.r21 ??= fresh()) as R21;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
const mIdx = (s: GameState) => s.year * 12 + s.month;
const rng = (s: GameState) => rng19(s, 'r21');
const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const $k = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const cool = (s: GameState, k: string, months: number): boolean => { const st = r21(s); if ((st.cd[k] ?? -1) > mIdx(s)) return false; st.cd[k] = mIdx(s) + months; return true; };

// ---------------------------------------------------------------- linha do tempo unificada

const NPC17_K: Record<string, Role21K> = { artist: 'artist', manager: 'manager', label: 'label_owner', exec: 'label_exec', imprint: 'label_owner' };
const W18_K: Record<string, Role21K> = { manager: 'manager', producer: 'producer', anr: 'label_exec', label: 'label_owner', teacher: 'teacher', radio: 'dj_radio', critic: 'media', politics: 'politics', business: 'business' };
const ROLE_K = (x: string): Role21K | undefined => (x in ROLE21_NAME ? (x as Role21K) : NPC17_K[x] ?? W18_K[x]);

/** Todas as funções de uma pessoa, em ordem, somando os registros antigos e os desta rodada. */
export function spans21(s: GameState, pid: string): Span21[] {
  const id = pid.replace(/^p:/, '');
  const out: Span21[] = [];
  for (const a of actsNow27(s)) if (a.members.includes(id)) out.push({ k: 'artist', org: a.name, from: a.debutYear || a.formed, ...(a.status === 'retired' || a.status === 'split' ? { ended: 1 as const } : {}) });
  for (const [y, , to, why] of careerOf(s, `p:${id}`)) { const k = ROLE_K(to); if (k && k !== 'artist') out.push({ k, from: y, why }); }
  const c18 = career18(s, `p:${id}`);
  if (c18 && W18_K[c18.k]) out.push({ k: W18_K[c18.k], from: c18.y, why: c18.why, ...(c18.lb && s.labels[c18.lb] ? { org: s.labels[c18.lb].name } : {}) });
  out.push(...(r21(s).sp[id] ?? []));
  const seen = new Set<string>();
  return out.filter((x) => { const k = `${x.k}|${x.org ?? ''}|${x.from}`; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.from - b.from);
}
export const activeRoles21 = (s: GameState, pid: string): Span21[] => spans21(s, pid).filter((x) => !x.ended && x.from <= s.year && (x.to === undefined || x.to >= s.year));

function addSpan(s: GameState, p: Person, sp: Span21, act?: Act, quiet = false): void {
  (r21(s).sp[p.id] ??= []).push(sp);
  if (quiet) return;
  emitFact(s, { kind: 'career', actors: [p.id, ...(act ? [act.id] : [])], place: act?.city, severity: clamp(15 + (act?.fame ?? 20) / 3, 1, 100), visibility: (act?.fame ?? 0) >= 35 || sp.real ? 'public' : 'rumor', tags: ['r21', sp.k], src: 'roles21',
    text: fmtL(l('{p} soma uma nova função: {k}{o}.', '{p} takes on a new role: {k}{o}.'), { p: p.name, k: ROLE21_NAME[sp.k], o: sp.org ? ` (${sp.org})` : '' }) });
}

// ---------------------------------------------------------------- funções reais documentadas (acervo)

const ROLE_REAL: Record<string, Role21K> = { producer: 'producer', manager: 'manager', label_owner: 'label_owner', label_exec: 'label_exec', festival_founder: 'festival_founder', publisher: 'publisher',
  studio_owner: 'studio_owner', songwriter: 'songwriter', dj_radio: 'dj_radio', media: 'media', venue_owner: 'venue_owner', booking: 'booking' };
function realRoles(s: GameState, quiet = false): void {
  if (!s.config.realNames) return;
  const st = r21(s);
  const byName = new Map<string, Person>();
  for (const p of Object.values(s.persons)) if (p.alive && ROLES21[p.name]) byName.set(p.name, p);
  for (const a of actsNow27(s)) if (ROLES21[a.name] && a.members.length === 1 && s.persons[a.members[0]]?.alive) byName.set(a.name, s.persons[a.members[0]]);
  for (const [name, p] of byName) {
    for (const [k0, org, from, to] of ROLES21[name] as Role21[]) {
      const k = ROLE_REAL[k0];
      const y = from ?? undefined;
      if (!k || y === undefined || y > s.year || (to !== undefined && to < s.year)) continue;
      const key = `${p.id}|${k}|${org ?? ''}`;
      if (st.seen[key]) continue;
      st.seen[key] = 1;
      const act = actsNow27(s).find((a) => a.members.includes(p.id));
      addSpan(s, p, { k, ...(org ? { org } : {}), from: y, ...(to !== undefined ? { to } : {}), real: 1 }, act, quiet || y < s.year);
      if (k === 'festival_founder' && org && !st.fest.some((f) => f.name === org)) st.fest.push({ id: `f21_${++st.n}`, name: org, city: act?.city ?? s.config.homeCity, owner: p.id, since: y, size: 2 });
    }
  }
}

// ---------------------------------------------------------------- funções novas de quem ainda está na ativa

type Pick = { k: Role21K; w: number; why: L };
function wishes(p: Person, a: Act): Pick[] {
  const age = (y: number) => y - p.born;
  void age;
  const amb = p.ambition;
  return [
    { k: 'label_owner', w: (amb === 'status' || amb === 'freedom' ? 2 : 0.6) * (a.fame / 50), why: l('quer controlar as próprias masters e lançar os amigos', 'wants to own the masters and release friends') },
    { k: 'manager', w: amb === 'security' || amb === 'money' ? 1.4 : 0.6, why: l('conhece o meio por dentro e enxerga talento antes dos outros', 'knows the business from the inside and spots talent early') },
    { k: 'festival_founder', w: (amb === 'fame' || amb === 'legacy' ? 1.6 : 0.4) * (a.fame / 60), why: l('quer uma vitrine para a própria cena', 'wants a showcase for their own scene') },
    { k: 'producer', w: amb === 'art' || amb === 'critics' ? 1.5 : 0.5, why: l('passa mais tempo no estúdio do que no palco', 'spends more time in the studio than on stage') },
    { k: 'financier', w: amb === 'money' ? 1.4 : 0.3 * (a.fame / 50), why: l('ganhou dinheiro e quer apostar em discos alheios', 'made money and wants to bet on other people\'s records') },
  ];
}
function newRoles(s: GameState, r: Rng): void {
  const freeWorld = histMode(s) !== 'strict';
  const cands = actsNow27(s).filter((a) => live(a) && a.owner !== 'player' && !a.playerBand && a.fame >= 40 && (freeWorld || !a.catalogNo))
    .sort((x, y) => y.fame - x.fame).slice(0, 80);
  let n = 0;
  for (const a of cands) {
    if (n >= 4) break;
    const p = s.persons[a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]];
    if (!p?.alive || p.isPlayer || s.year - p.born < 24 || (r21(s).sp[p.id]?.length ?? 0) >= 3) continue;
    if (!r.chance(clamp(0.01 + a.fame / 1500, 0, 0.08))) continue;
    // "nenhuma gravadora nova" no Novo Jogo vale também para selos abertos por artistas
    const ws = wishes(p, a).filter((w) => !activeRoles21(s, p.id).some((x) => x.k === w.k) && !(w.k === 'label_owner' && s.config.labels?.future === 'none'));
    const tot = ws.reduce((t, w) => t + w.w, 0);
    let roll = r.float(0, tot);
    const pick = ws.find((w) => (roll -= w.w) <= 0) ?? ws[0];
    if (!pick) continue;
    n++;
    const st = r21(s);
    if (pick.k === 'label_owner') {
      const lb = foundLabel17(s, r, { by: `p:${p.id}`, name: p.name, born: p.born, city: a.city, genre: a.genre, cash: 45000 + a.fame * 900, k: 'artist', why: pick.why });
      addSpan(s, p, { k: 'label_owner', org: lb.name, from: s.year, why: pick.why }, a);
    } else if (pick.k === 'festival_founder') {
      const name = `${cityById[a.city]?.name.pt ?? a.city} ${['Fest', 'Sound', 'Open Air', 'Weekend'][r.int(0, 3)]}`;
      st.fest.push({ id: `f21_${++st.n}`, name, city: a.city, owner: p.id, since: s.year, size: a.fame >= 70 ? 3 : 2 });
      addSpan(s, p, { k: 'festival_founder', org: name, from: s.year, why: pick.why }, a);
    } else addSpan(s, p, { k: pick.k, from: s.year, why: pick.why }, a);
  }
}

// ---------------------------------------------------------------- decisões para o jogador

const recent = (s: GameState, k: Role21K, years = 3): [string, Span21][] => Object.entries(r21(s).sp).flatMap(([pid, xs]) => xs.filter((x) => x.k === k && s.year - x.from <= years && (x.to === undefined || x.to >= s.year)).map((x) => [pid, x] as [string, Span21]))
  .filter(([pid]) => s.persons[pid]?.alive);
const myActs = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter(live);

function offerDecisions(s: GameState, r: Rng): void {
  if (!r.chance(0.35)) return;
  const acts = myActs(s);
  const opts: (() => boolean)[] = [];
  // festival novo convida um artista seu
  const fest = r21(s).fest.filter((f) => f.since <= s.year && s.persons[f.owner]?.alive);
  if (fest.length && acts.length) opts.push(() => {
    const f = r.pick(fest), a = r.pick(acts);
    if (!cool(s, `fest:${a.id}`, 10)) return false;
    const fee = money(s, 1500 + a.fame * 120 * f.size);
    pushInbox18(s, 'r21_fest', { from: f.name, tone: 'good', weeks: 6, ref: { act: a.id, fee, fest: f.id },
      subject: fmtL(l('{f} quer {a} na escalação', '{f} wants {a} on the line-up'), { f: f.name, a: a.name }),
      body: fmtL(l('Festival de {o} em {c}. Cachê oferecido: {v}. Pedir horário nobre pode render 60% a mais — ou o convite cair.', 'Festival run by {o} in {c}. Fee offered: {v}. Asking for a prime slot can pay 60% more — or lose the invite.'),
        { o: s.persons[f.owner].name, c: cityById[f.city]?.name.pt ?? f.city, v: $k(fee) }),
      actions: [{ id: 'yes', label: l('Aceitar o cachê', 'Take the fee') }, { id: 'prime', label: l('Pedir horário nobre', 'Ask for a prime slot') }, { id: 'no', label: l('Recusar', 'Decline') }] });
    return true;
  });
  // empresário(a) novo quer representar um artista seu
  const mgrs = recent(s, 'manager');
  const unmanaged = acts.filter((a) => !(s.x4 as unknown as { m14?: { rep: Record<string, unknown> } }).m14?.rep[a.id]);
  if (mgrs.length && unmanaged.length) opts.push(() => {
    const [pid] = r.pick(mgrs), a = r.pick(unmanaged), p = s.persons[pid];
    if (!cool(s, `mgr:${a.id}`, 12)) return false;
    pushInbox18(s, 'r21_mgr', { from: p.name, tone: 'info', weeks: 6, ref: { act: a.id, p: pid },
      subject: fmtL(l('{p} quer empresariar {a}', '{p} wants to manage {a}'), { p: p.name, a: a.name }),
      body: fmtL(l('Comissão pedida: 15% da receita de {a} por 3 anos, em troca de agenda melhor e mais confiança do artista. Dá para negociar 10%.', 'Commission asked: 15% of {a}\'s revenue for 3 years, for a better schedule and more trust from the act. 10% is negotiable.'), { a: a.name }),
      actions: [{ id: 'yes', label: l('Aceitar 15%', 'Accept 15%') }, { id: 'neg', label: l('Contraproposta: 10%', 'Counter: 10%') }, { id: 'no', label: l('Recusar', 'Decline') }] });
    return true;
  });
  // produtor(a)/financiador(a) quer bancar o próximo disco
  const fin = [...recent(s, 'financier', 4), ...recent(s, 'producer', 4)];
  if (fin.length && acts.length) opts.push(() => {
    const [pid, sp] = r.pick(fin), a = r.pick(acts), p = s.persons[pid];
    if (!cool(s, `fin:${a.id}`, 18)) return false;
    const adv = money(s, 6000 + a.fame * 250);
    pushInbox18(s, 'r21_fin', { from: p.name, tone: 'info', weeks: 6, ref: { act: a.id, adv, p: pid },
      subject: fmtL(l('{p} quer financiar o próximo disco de {a}', '{p} wants to finance {a}\'s next record'), { p: p.name, a: a.name }),
      body: fmtL(l('{r} oferece {v} agora; em troca fica com 7% desse valor por mês durante 24 meses (devolve ~1,7×). Bom para caixa curto, caro no longo prazo.', '{r} offers {v} now; in return takes 7% of it per month for 24 months (~1.7× back). Good for tight cash, costly long term.'),
        { r: ROLE21_NAME[sp.k], v: $k(adv) }),
      actions: [{ id: 'yes', label: l('Aceitar o financiamento', 'Take the financing') }, { id: 'no', label: l('Recusar', 'Decline') }] });
    return true;
  });
  // selo aberto por artista disputa um talento seu
  const owners = recent(s, 'label_owner', 4);
  if (owners.length && acts.length) opts.push(() => {
    const [pid, sp] = r.pick(owners), a = r.pick(acts), p = s.persons[pid];
    if (a.trust > 70 || !cool(s, `war:${a.id}`, 12)) return false;
    const bonus = money(s, 3000 + a.fame * 150);
    pushInbox18(s, 'r21_war', { from: p.name, tone: 'bad', weeks: 4, ref: { act: a.id, bonus, p: pid },
      subject: fmtL(l('{o} está cortejando {a}', '{o} is courting {a}'), { o: sp.org ?? p.name, a: a.name }),
      body: fmtL(l('{p}, artista e agora dono(a) de selo, promete mais liberdade a {a}. Cobrir custa {v} em bônus (confiança +8); deixar passar esfria a relação (confiança −10).', '{p}, an artist and now a label owner, promises {a} more freedom. Matching costs {v} in bonuses (trust +8); letting it go cools the relationship (trust −10).'),
        { p: p.name, a: a.name, v: $k(bonus) }),
      actions: [{ id: 'match', label: l('Cobrir a proposta', 'Match the offer') }, { id: 'let', label: l('Deixar passar', 'Let it go') }] });
    return true;
  });
  // patrocínio para o seu festival/casa de shows
  const cs = careers(s).active;
  if (cs.includes('festival') || cs.includes('venue')) opts.push(() => {
    if (!cool(s, 'sponsor', 12)) return false;
    const amt = money(s, 900 + r.int(0, 8) * 150);
    const brand = r.pick(['Cervejaria Aurora', 'Rádio Onda', 'Refri Cola Sul', 'Banco Horizonte', 'Telefônica Eco', 'Tênis Pulso']);
    pushInbox18(s, 'r21_sponsor', { from: brand, tone: 'good', weeks: 6, ref: { amt },
      subject: fmtL(l('{b} quer patrocinar seu {k}', '{b} wants to sponsor your {k}'), { b: brand, k: cs.includes('festival') ? l('festival', 'festival') : l('palco', 'venue') }),
      body: fmtL(l('{v} por mês durante 12 meses. Com exclusividade, 50% a mais — mas a cena torce o nariz (reputação com artistas −2).', '{v} a month for 12 months. With exclusivity, 50% more — but the scene frowns (artist reputation −2).'), { v: $k(amt) }),
      actions: [{ id: 'yes', label: l('Aceitar', 'Accept') }, { id: 'excl', label: l('Aceitar com exclusividade', 'Accept with exclusivity') }, { id: 'no', label: l('Recusar', 'Decline') }] });
    return true;
  });
  // você é empresário(a): artista sem empresário pede representação
  if (cs.includes('manager')) opts.push(() => {
    const taken = new Set(ventures(s).mg.clients.map((c) => c.actId));
    const pool = actsNow27(s).filter((a) => live(a) && a.owner !== 'player' && !taken.has(a.id) && a.fame >= 15 && a.fame <= 70 && !(s.x4 as unknown as { m14?: { rep: Record<string, unknown> } }).m14?.rep[a.id]);
    if (!pool.length) return false;
    const a = r.pick(pool);
    if (!cool(s, `client:${a.id}`, 24)) return false;
    pushInbox18(s, 'r21_client', { from: a.name, tone: 'info', weeks: 6, ref: { act: a.id },
      subject: fmtL(l('{a} quer você como empresário(a)', '{a} wants you as their manager'), { a: a.name }),
      body: l('Pedem 15% de comissão. Dá para pedir 20% (podem desistir) ou recusar.', 'They offer 15% commission. You can ask for 20% (they may walk) or decline.'),
      actions: [{ id: 'yes', label: l('Aceitar 15%', 'Accept 15%') }, { id: 'up', label: l('Pedir 20%', 'Ask 20%') }, { id: 'no', label: l('Recusar', 'Decline') }] });
    return true;
  });
  for (const f of r.shuffle(opts)) if (f()) return;
}

const actOf = (s: GameState, ref?: Record<string, string | number>) => s.acts[String(ref?.act ?? '')];
const gone = l('A oportunidade passou.', 'The opportunity is gone.');
registerInboxKind('r21_fest', { label: l('Escalação', 'Line-up'), cat: 'decision', icon: 'tent', prio: 2, goto: (_s, m) => ({ act: String(m.ref?.act ?? '') }),
  handle: (s, m, act, r) => {
    const a = actOf(s, m.ref);
    if (!live(a)) return gone;
    if (act === 'no') return l('Convite recusado.', 'Invite declined.');
    let fee = Number(m.ref?.fee ?? 0);
    if (act === 'prime') { if (!r.chance(0.5)) return fmtL(l('{f} não cedeu o horário e chamou outro artista.', '{f} would not give the slot and booked someone else.'), { f: m.from }); fee = Math.round(fee * 1.6); a.fame = clamp(a.fame + 1, 0, 100); }
    post(s, `r21:fest:${a.id}:${s.week}`, fee, 'live', `${m.from}: ${a.name}`);
    a.fame = clamp(a.fame + 2, 0, 100);
    for (const id of a.members) { const p = s.persons[id]; if (p) p.fatigue = clamp(p.fatigue + 8, 0, 100); }
    return fmtL(l('{a} no {f}: {v} no caixa, mais fama e um pouco de cansaço.', '{a} at {f}: {v} cashed, more fame and some fatigue.'), { a: a.name, f: m.from, v: $k(fee) });
  } });
registerInboxKind('r21_mgr', { label: l('Empresário', 'Manager'), cat: 'decision', icon: 'handshake', prio: 2, goto: (_s, m) => ({ act: String(m.ref?.act ?? '') }),
  handle: (s, m, act, r) => {
    const a = actOf(s, m.ref);
    if (!live(a)) return gone;
    if (act === 'no') { a.trust = clamp(a.trust - 2, 0, 100); return l('Recusado — o artista queria tentar (confiança −2).', 'Declined — the act wanted to try (trust −2).'); }
    const rate = act === 'neg' ? 0.10 : 0.15;
    if (act === 'neg' && !r.chance(0.55)) return fmtL(l('{p} não aceitou 10% e foi procurar outro cliente.', '{p} would not take 10% and went elsewhere.'), { p: m.from });
    const fee = -Math.round(money(s, 200 + a.fame * 12) * rate / 0.15);
    r21(s).flow.push({ key: `mgr:${a.id}`, amt: fee, until: mIdx(s) + 36, cat: 'staff', memo: `Comissão de ${m.from} (${a.name})` });
    a.trust = clamp(a.trust + 6, 0, 100);
    a.momentum = clamp(a.momentum + 6, 0, 100);
    return fmtL(l('{p} agora empresaria {a} ({x}%): agenda melhor e confiança +6; comissão mensal de {v}.', '{p} now manages {a} ({x}%): better schedule and trust +6; monthly commission {v}.'), { p: m.from, a: a.name, x: Math.round(rate * 100), v: $k(-fee) });
  } });
registerInboxKind('r21_fin', { label: l('Financiamento', 'Financing'), cat: 'decision', icon: 'coins', prio: 2, goto: () => ({ area: 'finance' }),
  handle: (s, m, act) => {
    const a = actOf(s, m.ref);
    if (!live(a) || act !== 'yes') return l('Você segue com o próprio dinheiro.', 'You keep using your own money.');
    const adv = Number(m.ref?.adv ?? 0);
    post(s, `r21:fin:${a.id}:${s.week}`, adv, 'financing', `Financiamento de ${m.from} (${a.name})`);
    r21(s).flow.push({ key: `fin:${a.id}:${s.week}`, amt: -Math.round(adv * 0.07), until: mIdx(s) + 24, cat: 'financing', memo: `Parcela a ${m.from} (${a.name})` });
    return fmtL(l('{v} entram agora; 24 parcelas de {p} a {f}.', '{v} in now; 24 instalments of {p} to {f}.'), { v: $k(adv), p: $k(adv * 0.07), f: m.from });
  } });
registerInboxKind('r21_war', { label: l('Disputa por talento', 'Talent war'), cat: 'decision', icon: 'swords', prio: 3, goto: (_s, m) => ({ act: String(m.ref?.act ?? '') }),
  handle: (s, m, act) => {
    const a = actOf(s, m.ref);
    if (!live(a)) return gone;
    if (act === 'match') { post(s, `r21:war:${a.id}:${s.week}`, -Number(m.ref?.bonus ?? 0), 'signing', `Bônus de permanência (${a.name})`); a.trust = clamp(a.trust + 8, 0, 100); return fmtL(l('{a} fica — e sabe que você bancou (confiança +8).', '{a} stays — and knows you paid up (trust +8).'), { a: a.name }); }
    a.trust = clamp(a.trust - 10, 0, 100);
    return fmtL(l('{a} ficou balançado(a): confiança −10. Na renovação, o selo de {p} estará esperando.', '{a} is wavering: trust −10. At renewal, {p}\'s label will be waiting.'), { a: a.name, p: m.from });
  } });
registerInboxKind('r21_sponsor', { label: l('Patrocínio', 'Sponsorship'), cat: 'decision', icon: 'coins', prio: 1, goto: () => ({ area: 'ventures' }),
  handle: (s, m, act) => {
    if (act === 'no') return l('Sem logo no palco.', 'No logo on stage.');
    const amt = Math.round(Number(m.ref?.amt ?? 0) * (act === 'excl' ? 1.5 : 1));
    r21(s).flow.push({ key: `sp:${m.from}:${s.week}`, amt, until: mIdx(s) + 12, cat: 'sponsorship', memo: `Patrocínio ${m.from}` });
    if (act === 'excl') s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
    return fmtL(l('{b}: {v}/mês por 12 meses{x}.', '{b}: {v}/mo for 12 months{x}.'), { b: m.from, v: $k(amt), x: act === 'excl' ? l(' (exclusivo; reputação com artistas −2)', ' (exclusive; artist reputation −2)') : '' });
  } });
registerInboxKind('r21_client', { label: l('Novo cliente', 'New client'), cat: 'decision', icon: 'handshake', prio: 2, goto: () => ({ area: 'ventures' }),
  handle: (s, m, act, r) => {
    const a = actOf(s, m.ref);
    if (!live(a) || act === 'no') return l('Você segue com a carteira atual.', 'You keep your current roster.');
    if (act === 'up' && !r.chance(0.5)) return fmtL(l('{a} achou 20% demais e procurou outro empresário.', '{a} found 20% too much and went elsewhere.'), { a: a.name });
    ventures(s).mg.clients.push({ actId: a.id, rate: act === 'up' ? 0.2 : 0.15, since: s.week, earned: 0 });
    return fmtL(l('{a} entrou na sua carteira de empresariados.', '{a} joined your management roster.'), { a: a.name });
  } });

// ---------------------------------------------------------------- relógio

registerSimHook('month', 'roles21', (s) => {
  const st = r21(s);
  const m = mIdx(s);
  st.flow = st.flow.filter((f) => f.until >= m);
  for (const f of st.flow) post(s, `r21:flow:${f.key}:${m}`, f.amt, f.cat, f.memo);
  const r = rng(s);
  if (s.month === 0) { realRoles(s); newRoles(s, r); }
  if (s.config.role !== 'artist' || careers(s).active.length > 1) offerDecisions(s, r);
});
registerSimHook('newgame', 'roles21', (s) => { r21(s); realRoles(s, true); }); // o que já aconteceu antes do início é histórico, não notícia
