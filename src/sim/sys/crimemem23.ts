// Rodada 23 — MEMBROS das organizações criminosas. Pessoas (artistas, família), a SUA equipe e líderes de selo
// podem entrar numa organização com patente (associado → soldado → tenente → chefe) e função (músico ligado,
// contador/lavador, segurança, motorista, olheiro, advogado, promotor de shows). Recrutamento mensal raro, puxado
// pelos traços (persona13: ambição, coragem, impulsividade, pouca empatia, pouca disciplina), aperto de dinheiro,
// mágoas (holds17), presença da organização no país/época, cena de rua (trap/drill/funk/corridos), parentes já
// dentro e a prisão (recrutado na cela). Saídas: prisão/indiciamento (delação → informante), morte, aposentadoria,
// conversão, demissão. Promoção por crimes bem-sucedidos (pelo commitCrime de sempre).
// Ligações: apelo de rua (ou fama de bandido), casas/territórios da organização, isenção de pizzo, proteção e
// vazamentos quando o membro é da sua equipe (descoberta pela segurança → cartão: demitir/manter/denunciar),
// selos-fachada e conluio entre líderes membros, atenção policial pela densidade de membros, delatores
// enfraquecendo a organização, rixas entre membros de organizações rivais (alimenta as rixas de rua) e
// notícias secreto → boato → confirmado.
// Regras de história mantidas: membros nunca cometem assassinato; no modo "Vida real exata" pessoas/selos reais
// não entram em organização nenhuma; fora dele, gente real fica no máximo no boato.

import { clamp, Rng, seedState } from '../../core/rng';
import { countryName } from '../../data/geo';
import { l, type L } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { grantHold, holds17 } from '../holds17';
import { histMode } from '../history15';
import { scandal } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, Decision, GameState, Person } from '../types';
import { fmtL, money, nextId, notify, playerActs, post } from '../util';
import {
  ODDS17, SEC17, SHIELD17, a3Of, addHeat, commitCrime, crime17, feedCase, isReal, mIdx, orgById, orgs17,
  type Gone23, type Mem23, type Org17, type Rank23, type Role23,
} from './crime17';
import { STREET } from './crimenpc17';
import { leaders } from './leaders10';
import { per13 } from './persona13';
import { registerSituation } from './situations17';
import { actsNow27 } from '../tickcache27';

// ================================================================ nomes

export const RANK23: L[] = [l('associado', 'associate'), l('soldado', 'soldier'), l('tenente', 'lieutenant'), l('chefe', 'boss')];
export const ROLE23: Record<Role23, L> = {
  musico: l('músico ligado', 'connected musician'), contador: l('contador/lavador', 'accountant/launderer'), seguranca: l('segurança', 'muscle'),
  motorista: l('motorista', 'driver'), olheiro: l('olheiro', 'lookout'), advogado: l('advogado', 'lawyer'), promotor: l('promotor de shows', 'show promoter'),
};
export const GONE23: Record<Gone23['how'], L> = {
  informant: l('virou informante', 'turned informant'), death: l('morreu', 'died'), retired: l('aposentou-se', 'retired'), arrest: l('queimado após a prisão', 'cut loose after arrest'),
  conversion: l('converteu-se e largou a vida', 'converted and left the life'), fired: l('demitido(a) por você', 'fired by you'), left: l('saiu da cena', 'left the scene'), org_end: l('a organização acabou', 'the organization ended'),
};
const PROMO = [2, 5, 9];
/** teto da chance mensal de entrar (também o pré-sorteio barato do recrutamento) */
const P_MAX = 0.03;

export const mem23 = (s: GameState): Record<string, Mem23> => (crime17(s).mem23 ??= {});
const gone23 = (s: GameState): Gone23[] => (crime17(s).gone23 ??= []);
/** Poder efetivo (delatores tiram poder; volta 1/mês). */
export const orgPower23 = (s: GameState, o: Org17): number => clamp(o.power + (crime17(s).pw23?.[o.id] ?? 0), 5, 100);

// ================================================================ quem é quem

const F = (s: GameState, key: string, f: string): number => ((per13(s, key)?.facets as Record<string, number> | undefined)?.[f] ?? 50);
const live = (a?: Act): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
// mapa pessoa → ato vivo, refeito uma vez por semana (evita varrer todos os atos por pessoa)
const ACTMAP = new WeakMap<GameState, { w: number; m: Map<string, Act> }>();
function actOf(s: GameState, pid: string): Act | undefined {
  let c = ACTMAP.get(s);
  if (!c || c.w !== s.week) {
    const m = new Map<string, Act>();
    for (const a of actsNow27(s)) if (live(a)) for (const x of a.members) if (!m.has(x)) m.set(x, a);
    ACTMAP.set(s, (c = { w: s.week, m }));
  }
  const a = c.m.get(pid); // o ato pode ter mudado na mesma semana (saída/separação)
  return a && live(a) && a.members.includes(pid) ? a : undefined;
}
/** Quem age no commitCrime: pessoa → ela mesma; líder → o selo dele; equipe → ninguém de fora. */
export function actor23(s: GameState, key: string): string | undefined {
  const [k, id] = [key.slice(0, 1), key.slice(2)];
  if (k === 'p') return s.persons[id]?.alive ? id : undefined;
  if (k === 'l') { const L0 = leaders(s).L[id]; return L0?.label && s.labels[L0.label]?.active ? L0.label : undefined; }
  return undefined;
}
export function name23(s: GameState, key: string): string {
  const id = key.slice(2);
  if (key.startsWith('p:')) return s.persons[id]?.name ?? id;
  if (key.startsWith('s:')) return s.player.staff.find((x) => x.id === id)?.name ?? id;
  if (key.startsWith('l:')) { const L0 = leaders(s).L[id]; return L0 ? `${L0.name}${L0.label && s.labels[L0.label] ? ` (${s.labels[L0.label].name})` : ''}` : id; }
  return id;
}
/** Real (regras de história): pessoa de ato do catálogo ou executivo real. */
function real23(s: GameState, key: string): boolean {
  const id = key.slice(2);
  if (key.startsWith('p:')) return isReal(s, id);
  if (key.startsWith('l:')) return !!leaders(s).L[id]?.real;
  return false;
}
const jailedK = (s: GameState, key: string): { a3: string } | undefined => { const j = key.startsWith('p:') ? crime17(s).jail[key.slice(2)] : undefined; return j && j.u > s.week ? j : undefined; };
function city23(s: GameState, key: string): string {
  const id = key.slice(2);
  if (key.startsWith('p:')) return actOf(s, id)?.city ?? s.config.homeCity;
  if (key.startsWith('l:')) return leaders(s).L[id]?.city ?? s.config.homeCity;
  return s.config.homeCity;
}
const a3K = (s: GameState, key: string): string => jailedK(s, key)?.a3 ?? a3Of(s, city23(s, key));
const isStaff = (key: string): boolean => key.startsWith('s:');
/** Fachada: o selo do líder membro. */
export const front23 = (s: GameState, labelId: string): Org17 | undefined => {
  const L0 = s.labels[labelId]?.leaderId; const m = L0 ? mem23(s)[`l:${L0}`] : undefined;
  return m && m.rk >= 1 ? orgById(s, m.o) : undefined;
};
/** Membros conhecidos de uma organização (o jogador só vê boato/confirmado). */
export const knownMembers23 = (s: GameState, oid: string): [string, Mem23][] => Object.entries(mem23(s)).filter(([, m]) => m.o === oid && m.k >= 1).sort((a, b) => b[1].rk - a[1].rk || b[1].k - a[1].k);
/** Membros de uma pessoa do elenco de um ato (com o que o jogador sabe). */
const actMembers = (s: GameState, a: Act, minK = 1): Mem23[] => a.members.map((m) => mem23(s)[`p:${m}`]).filter((m): m is Mem23 => !!m && m.k >= minK);
const myStaffIn = (s: GameState, oid: string): Mem23[] => Object.entries(mem23(s)).filter(([k, m]) => isStaff(k) && m.o === oid && s.player.staff.some((x) => `s:${x.id}` === k)).map(([, m]) => m);
/** Densidade de membros num país (polícia presta atenção). */
export const density23 = (s: GameState, a3: string): number => Object.keys(mem23(s)).filter((k) => a3K(s, k) === a3).length;

// ================================================================ recrutamento

function roleFor(s: GameState, key: string, r: Rng): Role23 {
  const id = key.slice(2);
  if (key.startsWith('s:')) {
    const ro = s.player.staff.find((x) => x.id === id)?.role ?? '';
    return ro === 'legal' ? 'advogado' : ['admin', 'analyst', 'rights'].includes(ro) ? 'contador' : ['booking', 'tour_manager', 'agent', 'manager'].includes(ro) ? 'promotor' : r.pick(['seguranca', 'motorista', 'olheiro'] as Role23[]);
  }
  if (key.startsWith('l:')) { const bg = leaders(s).L[id]?.bg; return bg === 'lawyer' ? 'advogado' : bg === 'promoter' || bg === 'dj' ? 'promotor' : 'contador'; }
  return actOf(s, id) ? 'musico' : r.pick(['seguranca', 'motorista', 'olheiro'] as Role23[]);
}
/** Parentes (pais, filhos, irmãos) já dentro de uma organização. */
function kinOrg(s: GameState, p: Person): string | undefined {
  const M = mem23(s);
  const kin = new Set<string>();
  if (p.parentId) { kin.add(p.parentId); for (const k of s.families[p.parentId]?.kids ?? []) if (k.personId) kin.add(k.personId); }
  for (const k of s.families[p.id]?.kids ?? []) if (k.personId) kin.add(k.personId);
  kin.delete(p.id);
  for (const k of kin) if (M[`p:${k}`]) return M[`p:${k}`].o;
  return undefined;
}
function candidates(s: GameState): string[] {
  const out: string[] = [];
  for (const p of Object.values(s.persons)) if (p.alive && !p.isPlayer && s.year - p.born >= 16 && s.year - p.born < 72) out.push(`p:${p.id}`);
  for (const x of s.player.staff) out.push(`s:${x.id}`);
  for (const L0 of Object.values(leaders(s).L)) if (L0.st === 'active' && L0.label && s.labels[L0.label]?.active) out.push(`l:${L0.id}`);
  return out;
}
/** Chance mensal de alguém entrar (com o porquê). Exportada para a ficha e os testes. */
// quem guarda mágoas (livro próprio de obrigações, uma leitura por semana; os adaptadores são caros)
const GRIEV = new WeakMap<GameState, { w: number; set: Set<string> }>();
function grudges(s: GameState): Set<string> {
  let c = GRIEV.get(s);
  if (!c || c.w !== s.week) { const set = new Set<string>(); for (const h of holds17(s).h) if (h.kind === 'grievance' && h.status === 'open') set.add(h.holder); GRIEV.set(s, (c = { w: s.week, set })); }
  return c.set;
}
/** r23 (links23): outros sistemas pesam no recrutamento (multiplicador + porquê). */
export const RECRUIT23: ((s: GameState, key: string) => { k: number; why: L } | null)[] = [];
const ORGW = new WeakMap<GameState, { w: number; l: Org17[] }>(); // organizações ativas da semana
/** `u` (opcional): sorteio do mês — se nem com os traços no máximo daria, sai antes de ler a persona (barato). */
export function recruitOdds(s: GameState, key: string, u?: number): { p: number; why: L[]; o?: Org17; ro?: Role23 } {
  const strict = histMode(s) === 'strict';
  const st = crime17(s);
  if (mem23(s)[key]) return { p: 0, why: [] };
  const rl = real23(s, key);
  if (rl && strict) return { p: 0, why: [l('Vida real exata: gente real não entra em organização inventada.', 'Exact real life: real people do not join invented organizations.')] };
  const jail = jailedK(s, key);
  const a3 = a3K(s, key);
  const orgs = (ORGW.get(s)?.w === s.week ? ORGW.get(s)! : (ORGW.set(s, { w: s.week, l: orgs17(s).filter((o) => (st.down[o.id] ?? 0) < s.week && !(strict && o.real)) }), ORGW.get(s)!)).l.filter((o) => o.a3 === a3);
  if (!orgs.length) return { p: 0, why: [l('Nenhuma organização atua aqui nesta época.', 'No organization operates here in this era.')] };
  const why: L[] = [];
  let mult = 1;
  let pref: string | undefined;
  const id = key.slice(2);
  let street = false;
  if (key.startsWith('p:')) {
    const p = s.persons[id]; const a = actOf(s, id);
    if (a && (a.cash < 0 || (a.fame < 10 && s.year - p.born < 35))) { mult *= 1.8; why.push(l('Sem dinheiro, carreira travada', 'Broke, career stalled')); }
    if (p.resentment > 50) { mult *= 1.3; why.push(l('Ressentido(a) com o meio', 'Resentful of the business')); }
    if (a && STREET(a.genre)) { street = true; mult *= 2.2; why.push(l('Cena de rua (trap/drill/funk/corridos)', 'Street scene (trap/drill/funk/corridos)')); }
    const tie = a ? st.ties[a.id] : undefined;
    if (tie && orgs.some((o) => o.id === tie)) { mult *= 3; pref = tie; why.push(l('O grupo já anda com eles', 'The act already runs with them')); }
    const kin = kinOrg(s, p);
    if (kin && orgs.some((o) => o.id === kin)) { mult *= 5; pref = kin; why.push(l('Um parente já é da organização', 'A relative is already in')); }
  } else if (key.startsWith('s:')) {
    if (s.player.cash < 0) { mult *= 2; why.push(l('Salário atrasado: seu caixa no vermelho', 'Late salary: your cash is in the red')); }
    if ((s.player.staff.find((x) => x.id === id)?.salary ?? 0) < money(s, 2000)) { mult *= 1.3; why.push(l('Salário baixo', 'Low salary')); }
  } else {
    const lb = s.labels[leaders(s).L[id]?.label ?? ''];
    if (lb && lb.cash < 0) { mult *= 2; why.push(l('Selo no vermelho: precisa de dinheiro "limpo"', 'Label in the red: needs "clean" money')); }
  }
  if (grudges(s).has(key.startsWith('p:') ? id : key)) { mult *= 1.5; why.push(l('Guarda mágoas e quer revanche', 'Holds grudges and wants payback')); }
  if (jail) { mult *= 6; why.push(l('Recrutado(a) na prisão', 'Recruited in prison')); }
  for (const f of RECRUIT23) { const x = f(s, key); if (x) { mult *= x.k; why.push(x.why); } } // r23 ligações (cultura, bairro, filhos, agiota)
  if (rl) { mult *= 0.2; why.push(l('Pessoa real: fica no boato', 'Real person: stays a rumor')); }
  if (u !== undefined && u >= 0.0025 * mult * 2.5) return { p: 0, why };
  // traços (persona13)
  const f = (F(s, key, 'ambicao') + F(s, key, 'coragem') + F(s, key, 'impulsividade') + (100 - F(s, key, 'empatia')) + (100 - F(s, key, 'disciplina'))) / 500;
  const tw = clamp((f - 0.42) * 6, 0, 2.5);
  if (tw <= 0 && !jail) return { p: 0, why: [l('O temperamento não combina com o crime.', 'Temperament does not fit crime.')] };
  if (tw > 0.8) why.unshift(l('Ambicioso(a), ousado(a), pouca empatia/disciplina', 'Ambitious, daring, little empathy/discipline'));
  mult *= Math.max(tw, jail ? 0.6 : 0);
  const pool = jail ? orgs.filter((o) => o.kind !== 'syndicate') : street ? orgs.filter((o) => o.kind === 'gang' || o.kind === 'cartel' || o.kind === 'firm') : orgs;
  const o = (pref ? orgs.find((x) => x.id === pref) : undefined) ?? [...(pool.length ? pool : orgs)].sort((a, b) => orgPower23(s, b) - orgPower23(s, a))[0];
  why.push(fmtL(l('{o} atua em {c}', '{o} operates in {c}'), { o: o.name, c: countryName(a3) }));
  return { p: clamp(0.0025 * mult, 0, P_MAX), why: why.slice(-4), o };
}

function join(s: GameState, key: string, o: Org17, why: L[], r: Rng, ro?: Role23): Mem23 {
  const m: Mem23 = { o: o.id, rk: 0, ro: ro ?? roleFor(s, key, r), w: s.week, why, k: 0, n: 0 };
  mem23(s)[key] = m;
  const actor = actor23(s, key);
  emitFact(s, { kind: 'crime_join', actors: [actor ?? key, o.key], place: city23(s, key), severity: 30, visibility: 'secret', tags: ['crime', 'member23'], text: fmtL(l('{p} entra para {o} como {r} ({f}).', '{p} joins {o} as {r} ({f}).'), { p: name23(s, key), o: o.name, r: RANK23[0], f: ROLE23[m.ro] }), src: 'crime23' });
  grantHold(s, { holder: o.key, target: actor ?? key, kind: 'loyalty', strength: 60, months: 240, src: 'crime17', text: l('Jurou lealdade à organização', 'Swore loyalty to the organization'), quiet: true });
  if (key.startsWith('p:')) addStress(s, key.slice(2), 4, l('Vida dupla', 'Double life'));
  return m;
}
/** Saída (com fato e registro). */
export function leave23(s: GameState, key: string, how: Gone23['how']): void {
  const M = mem23(s); const m = M[key];
  if (!m) return;
  delete M[key];
  const g = gone23(s); g.push({ k: key, o: m.o, how, w: s.week, rk: m.rk }); if (g.length > 60) g.splice(0, g.length - 60);
  const o = orgById(s, m.o);
  if (how === 'informant' && o) {
    const st = crime17(s);
    (st.pw23 ??= {})[o.id] = clamp((st.pw23[o.id] ?? 0) - 8 - m.rk * 6, -60, 0);
    // o delator entrega os outros: casos citam membros
    const others = Object.entries(M).filter(([, x]) => x.o === o.id).sort((a, b) => b[1].rk - a[1].rk).slice(0, 3);
    for (const [k2, x] of others) {
      const ac = actor23(s, k2);
      if (ac) feedCase(s, ac, a3K(s, k2), 25, 40, true, [actor23(s, key) ?? key]);
      x.k = real23(s, k2) ? 1 : 2;
    }
    grantHold(s, { holder: o.key, target: actor23(s, key) ?? key, kind: 'grievance', strength: 80, months: 240, src: 'crime17', text: l('Delatou a organização', 'Ratted out the organization'), quiet: true });
  }
  if (how !== 'death' && how !== 'org_end' && o && m.k >= 1) emitFact(s, { kind: 'crime_leave', actors: [actor23(s, key) ?? key, o.key], place: city23(s, key), severity: how === 'informant' ? 50 : 25, visibility: how === 'informant' && !real23(s, key) ? 'public' : 'rumor', tags: ['crime', 'member23', how], text: fmtL(l('{p} deixa {o}: {h}.', '{p} leaves {o}: {h}.'), { p: name23(s, key), o: o.name, h: GONE23[how] }), src: 'crime23' });
}
/** Sobe o que o jogador sabe (com fato secreto → boato → público). */
export function reveal23(s: GameState, key: string, k: 1 | 2, why?: L): void {
  const m = mem23(s)[key];
  if (!m) return;
  const kk = (real23(s, key) ? 1 : k) as 1 | 2;
  if (m.k >= kk) return;
  m.k = kk;
  const o = orgById(s, m.o);
  emitFact(s, { kind: 'crime_member', actors: [actor23(s, key) ?? key, o?.key ?? m.o], place: city23(s, key), severity: 25 + m.rk * 8, visibility: kk === 2 && !isStaff(key) ? 'public' : kk === 2 ? 'secret' : 'rumor', tags: ['crime', 'member23', kk === 2 ? 'confirmed' : 'rumor'], text: fmtL(kk === 2 ? l('Confirmado: {p} é {r} de {o}. {w}', 'Confirmed: {p} is a {r} of {o}. {w}') : l('Boato: {p} seria ligado(a) a {o}. {w}', 'Rumor: {p} is said to be tied to {o}. {w}'), { p: name23(s, key), r: RANK23[m.rk], o: o?.name ?? m.o, w: why ?? '' }), src: 'crime23' });
}

// ================================================================ cartão: funcionário seu é membro

registerSituation({
  id: 'crime23_mole', pressure: 'law', cost: 1, cooldown: 0, playerOnly: true,
  when: () => false, actorsPick: () => null, // só nasce pela descoberta (moleCard23)
  title: (s, c) => fmtL(l('{p} trabalha para {o}', '{p} works for {o}'), { p: name23(s, c.cast.staff), o: orgById(s, c.cast.org)?.name ?? '?' }),
  text: (s, c) => { const m = mem23(s)[c.cast.staff]; return fmtL(l('Sua segurança descobriu: {p} é {r} ({f}) de {o}. Enquanto ficar, eles "protegem" a casa (sem pizzo, menos extorsão) — mas há desvios, vazamentos e calor.', 'Your security found out: {p} is a {r} ({f}) of {o}. While they stay, the org "protects" the house (no pizzo, less extortion) — but there is embezzlement, leaks and heat.'), { p: name23(s, c.cast.staff), r: m ? RANK23[m.rk] : '?', f: m ? ROLE23[m.ro] : '?', o: orgById(s, c.cast.org)?.name ?? '?' }); },
  options: [
    { id: 'fire', label: l('Demitir', 'Fire'), hint: l('Fim dos desvios e vazamentos; a organização guarda mágoa (relação −15).', 'Embezzlement and leaks stop; the organization holds a grudge (relationship −15).'), apply: (s, c) => moleReply23(s, c.cast.staff, 'fire') },
    { id: 'report', label: l('Entregar à polícia (vira informante)', 'Hand to the police (becomes informant)'), hint: l('Ele(a) delata: poder da organização cai, casos citam outros membros; reputação +2; vingança por 18 meses.', 'They inform: the organization loses power, cases name other members; reputation +2; revenge for 18 months.'), apply: (s, c) => moleReply23(s, c.cast.staff, 'report') },
    { id: 'keep', label: l('Manter e fingir que não sabe', 'Keep and look the other way'), hint: l('Proteção continua; desvios e calor também; relação +5.', 'Protection continues; so do embezzlement and heat; relationship +5.'), apply: (s, c) => moleReply23(s, c.cast.staff, 'keep') },
  ],
});
export function moleReply23(s: GameState, key: string, how: 'fire' | 'report' | 'keep'): L {
  const m = mem23(s)[key];
  if (!m) return l('Já não é membro.', 'No longer a member.');
  const st = crime17(s);
  const o = orgById(s, m.o);
  if (how === 'keep') { m.kept = 1; st.org[m.o] = clamp((st.org[m.o] ?? 0) + 5, -100, 100); return l('Você finge que não viu. Eles agradecem.', 'You look away. They are grateful.'); }
  if (how === 'fire') {
    s.player.staff = s.player.staff.filter((x) => `s:${x.id}` !== key);
    st.org[m.o] = clamp((st.org[m.o] ?? 0) - 15, -100, 100);
    if (o) grantHold(s, { holder: o.key, target: 'player', kind: 'grievance', strength: 35, months: 24, src: 'crime17', text: l('Demitiu um dos nossos', 'Fired one of ours'), quiet: true });
    leave23(s, key, 'fired');
    return l('Demitido(a). A casa fica limpa — e com um inimigo a mais.', 'Fired. The house is clean — and has one more enemy.');
  }
  st.org[m.o] = clamp((st.org[m.o] ?? 0) - 40, -100, 100);
  st.vend[m.o] = s.week + 78;
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
  leave23(s, key, 'informant');
  return fmtL(l('{p} vira informante. {o} perde força — e quer vingança.', '{p} turns informant. {o} loses strength — and wants revenge.'), { p: name23(s, key), o: o?.name ?? '?' });
}
/** Descoberta pela segurança → cartão de decisão na mesa. */
export function moleCard23(s: GameState, key: string): Decision | null {
  const m = mem23(s)[key];
  if (!m || !isStaff(key)) return null;
  reveal23(s, key, 2);
  const ctx = { cast: { staff: key, org: m.o }, hero: 'player', data: {} };
  const d: Decision = {
    id: nextId(s, 'd'), eventId: 'sit17:crime23_mole', cat: 'people',
    title: fmtL(l('{p} trabalha para {o}', '{p} works for {o}'), { p: name23(s, key), o: orgById(s, m.o)?.name ?? '?' }),
    text: fmtL(l('Sua segurança descobriu: {p} é {r} ({f}) de {o}. Enquanto ficar, eles "protegem" a casa (sem pizzo, menos extorsão) — mas há desvios, vazamentos e calor.', 'Your security found out: {p} is a {r} ({f}) of {o}. While they stay, the org "protects" the house (no pizzo, less extortion) — but there is embezzlement, leaks and heat.'), { p: name23(s, key), r: RANK23[m.rk], f: ROLE23[m.ro], o: orgById(s, m.o)?.name ?? '?' }),
    options: [
      { id: 'fire', label: l('Demitir', 'Fire'), hint: l('Fim dos desvios e vazamentos; a organização guarda mágoa (relação −15).', 'Embezzlement and leaks stop; the organization holds a grudge (relationship −15).') },
      { id: 'report', label: l('Entregar à polícia (vira informante)', 'Hand to the police (becomes informant)'), hint: l('Poder da organização cai, casos citam outros membros; reputação +2; vingança por 18 meses.', 'The organization loses power, cases name other members; reputation +2; revenge for 18 months.') },
      { id: 'keep', label: l('Manter', 'Keep'), hint: l('Proteção continua; desvios e calor também.', 'Protection continues; so do embezzlement and heat.') },
    ],
    ctx: { hero: ctx.hero, c_staff: key, c_org: m.o }, week: s.week, defaultOption: 'keep', tags: ['crime'],
  };
  s.decisions.push(d);
  notify(s, d.title, 'event');
  return d;
}

// ================================================================ mês

function pickTarget(s: GameState, key: string, m: Mem23, r: Rng): { c: string; target: string } | undefined {
  const M = mem23(s);
  const strict = histMode(s) === 'strict';
  const o = orgById(s, m.o);
  if (!o) return undefined;
  const a3 = a3K(s, key);
  // contra você (raro): só quando a organização quer vingança ou a relação azedou — sua segurança pesa na chance
  const st0 = crime17(s);
  if (((st0.vend[o.id] ?? 0) > s.week || (st0.org[o.id] ?? 0) < -20) && r.chance(0.2)) {
    const mine = playerActs(s).map((id) => s.acts[id]).filter(live).sort((a, b) => b.fame - a.fame)[0];
    if (mine) return { c: m.ro === 'musico' ? 'bootleg' : 'sabotage', target: mine.id };
  }
  // rivais: membros de outra organização no mesmo país (estende as rixas)
  const riv = Object.entries(M).filter(([k2, x]) => k2 !== key && x.o !== m.o && k2.startsWith('p:') && s.persons[k2.slice(2)]?.alive && a3K(s, k2) === a3 && !(strict && real23(s, k2)));
  const violent = m.ro === 'seguranca' || m.rk >= 1;
  if (riv.length) { const [k2] = r.pick(riv); return { c: violent ? 'assault' : 'blackmail', target: k2.slice(2) }; }
  // atos ligados a organizações rivais (rixas de rua)
  const st = crime17(s);
  const tied = Object.entries(st.ties).filter(([aid, oid]) => oid !== m.o && live(s.acts[aid]) && a3Of(s, s.acts[aid].city) === a3 && !(strict && s.acts[aid].catalogNo)).map(([aid]) => s.acts[aid]);
  if (tied.length) { const a = r.pick(tied); return m.ro === 'musico' ? { c: 'sabotage', target: a.id } : { c: 'bootleg', target: a.id }; }
  return undefined;
}

function memberMonth(s: GameState, r: Rng): void {
  const st = crime17(s);
  const M = mem23(s);
  const strict = histMode(s) === 'strict';
  const home = a3Of(s, s.config.homeCity);
  const dens: Record<string, number> = {};
  for (const k of Object.keys(M)) { const a3 = a3K(s, k); dens[a3] = (dens[a3] ?? 0) + 1; }
  for (const [key, m] of Object.entries(M)) {
    const o = orgById(s, m.o);
    const id = key.slice(2);
    // saídas
    if (!o || o.to < s.year) { leave23(s, key, 'org_end'); continue; }
    if (strict && real23(s, key)) { delete M[key]; continue; } // troca de modo: some sem rastro
    if (key.startsWith('p:')) {
      const p = s.persons[id];
      if (!p?.alive) { leave23(s, key, 'death'); continue; }
      if (s.year - p.born >= 72) { leave23(s, key, 'retired'); continue; }
    } else if (key.startsWith('s:')) { if (!s.player.staff.some((x) => x.id === id)) { leave23(s, key, 'left'); continue; } }
    else { const L0 = leaders(s).L[id]; if (!L0 || L0.st !== 'active') { leave23(s, key, L0?.st === 'dead' ? 'death' : 'retired'); continue; } }
    if (r.chance(F(s, key, 'empatia') > 60 ? 0.006 : 0.002)) { leave23(s, key, 'conversion'); continue; }
    const actor = actor23(s, key);
    // prisão/indiciamento: delata, é queimado ou segura a barra
    const charged = actor && st.cases.some((c) => c.who === actor && c.stage === 'charged');
    if (!m.tr && (charged || jailedK(s, key))) {
      m.tr = 1;
      reveal23(s, key, 2, l('(caso na polícia)', '(police case)'));
      const loy = F(s, key, 'lealdade');
      if (r.chance(clamp((100 - loy) / 160, 0.05, 0.6))) { leave23(s, key, 'informant'); continue; }
      if (r.chance(0.25)) { leave23(s, key, 'arrest'); continue; }
    }
    // atenção policial pela densidade (cases citam os membros)
    if (actor) { const d = dens[a3K(s, key)] ?? 0; st.nh[actor] = clamp((st.nh[actor] ?? 0) + 0.5 + d / 25, 0, 100); }
    // boato
    if (m.k === 0 && r.chance(0.008 + m.rk * 0.01 + (key.startsWith('p:') ? (actOf(s, id)?.fame ?? 0) / 2500 : 0) + (jailedK(s, key) ? 0.03 : 0))) reveal23(s, key, 1);
    // músico membro numa cena de rua: o grupo passa a "andar com eles" (entra nas rixas)
    if (key.startsWith('p:') && m.k >= 1) { const a = actOf(s, id); if (a && STREET(a.genre) && !st.ties[a.id] && !(strict && a.catalogNo)) st.ties[a.id] = o.id; }
    // escândalo do artista membro exposto
    if (key.startsWith('p:') && m.k >= 1 && !m.sc) { const a = actOf(s, id); if (a && a.fame > 15 && r.chance(0.02)) { m.sc = 1; scandal(s, a.id, 'crime', 30 + m.rk * 8, fmtL(l('{p} ({a}) e a ligação com {o}.', '{p} ({a}) and the tie to {o}.'), { p: name23(s, key), a: a.name, o: o.name }), { place: a.city, tags: ['crime', 'member23'] }); } }
    // equipe do jogador: desvio, lavagem, descoberta
    if (isStaff(key)) {
      const sec = SEC17[st.sec].def;
      if (r.chance((m.ro === 'contador' ? 0.1 : 0.05) * (1 - sec))) post(s, `c23emb:${id}`, -money(s, 400 + (s.player.staff.find((x) => x.id === id)?.skill ?? 40) * 20), 'admin', 'Despesas sem comprovante');
      if (m.ro === 'contador') addHeat(s, 'player', home, 1);
      if (!m.kept && m.k < 2 && r.chance(0.03 + sec * 1.2 + (st.sec >= 3 ? 0.08 : 0))) moleCard23(s, key);
      continue;
    }
    // líder membro: selo-fachada lava dinheiro
    if (key.startsWith('l:') && actor && s.labels[actor]) { s.labels[actor].cash += money(s, 600 + orgPower23(s, o) * 15); st.nh[actor] = clamp((st.nh[actor] ?? 0) + 1.5, 0, 100); }
    // crimes pela organização (nunca assassinato)
    if (!actor || jailedK(s, key) || !r.chance(0.03 + m.rk * 0.02)) continue;
    if (strict && real23(s, key)) continue;
    const pt = pickTarget(s, key, m, r);
    if (!pt) continue;
    // conluio: líderes de selo da mesma organização entram juntos
    const partners = key.startsWith('l:') ? Object.entries(M).filter(([k2, x]) => k2 !== key && k2.startsWith('l:') && x.o === m.o).map(([k2]) => actor23(s, k2)).filter((x): x is string => !!x && !(strict && isReal(s, x))).slice(0, 1) : [];
    const res = commitCrime(s, pt.c, { actor, target: pt.target, partners, org: o.id }, r);
    if (typeof res !== 'object' || !('ok' in res)) continue;
    if (res.ex) reveal23(s, key, 1);
    if (res.ok) {
      m.n++;
      const need = PROMO[m.rk];
      if (need !== undefined && m.n >= need && (m.rk < 2 || !Object.values(M).some((x) => x !== m && x.o === m.o && x.rk === 3))) {
        m.rk = (m.rk + 1) as Rank23;
        emitFact(s, { kind: 'crime_member', actors: [actor, o.key], place: city23(s, key), severity: 25 + m.rk * 10, visibility: m.k >= 1 ? 'rumor' : 'secret', tags: ['crime', 'member23', 'promotion'], text: fmtL(l('{p} sobe a {r} em {o}.', '{p} rises to {r} in {o}.'), { p: name23(s, key), r: RANK23[m.rk], o: o.name }), src: 'crime23' });
      }
    }
  }
  // delatores enfraquecem; poder volta devagar
  for (const k of Object.keys(st.pw23 ?? {})) { st.pw23![k] = Math.min(0, st.pw23![k] + 1); if (!st.pw23![k]) delete st.pw23![k]; }
}

function recruitMonth(s: GameState, r: Rng): void {
  const M = mem23(s);
  const n0 = Object.keys(M).length;
  if (n0 > 400) return;
  for (const key of candidates(s)) {
    if (M[key]) continue;
    // pré-sorteio barato antes de ler a persona (nada passa do teto P_MAX)
    const u = r.float();
    if (u >= P_MAX) continue;
    const od = recruitOdds(s, key, u);
    if (!od.o || u >= od.p) continue;
    join(s, key, od.o, od.why, r, od.ro);
  }
}

registerSimHook('month', 'crimemem23', (s) => {
  const r = new Rng(seedState(`crimemem23|${s.config.seed}|${mIdx(s)}`));
  memberMonth(s, r);
  recruitMonth(s, r);
});

// ================================================================ efeitos nos outros sistemas

// chances do commitCrime: proteção da casa, vazamentos da sua equipe, delatores enfraquecendo a organização
ODDS17.push((s, c, _cid, x) => {
  const st = crime17(s);
  if (c.org && (st.pw23?.[c.org.replace(/^o:/, '')] ?? 0) < 0) { const d = (st.pw23![c.org.replace(/^o:/, '')]) / 400; x.p += d; x.why.push(fmtL(l('Delatores enfraqueceram a organização: {x}%', 'Informants weakened the organization: {x}%'), { x: Math.round(d * 100) })); }
  if (c.actor === 'player') {
    const leaks = Object.entries(mem23(s)).filter(([k, m]) => isStaff(k) && m.o !== c.org?.replace(/^o:/, '') && s.player.staff.some((y) => `s:${y.id}` === k)).length;
    if (leaks) { const d = Math.min(0.12, leaks * 0.04); x.q += d; x.why.push(fmtL(l('Alguém da sua equipe fala com o crime: exposição +{x}%', 'Someone on your staff talks to the mob: exposure +{x}%'), { x: Math.round(d * 100) })); }
    return;
  }
  const oid = c.org?.replace(/^o:/, '') ?? (c.actor.startsWith('o:') ? c.actor.slice(2) : undefined);
  if (!oid) return;
  const tgtMine = c.target === 'player' || playerActs(s).some((a) => a === c.target || s.acts[a]?.members.includes(c.target));
  if (tgtMine && myStaffIn(s, oid).length) { x.p -= 0.15; x.why.push(l('Gente sua é da organização: eles poupam a casa −15%', 'One of yours is in the organization: they spare the house −15%')); }
});
// pizzo: gente sua lá dentro (funcionário ou artista membro) = isenção
SHIELD17.push((s, oid) => (myStaffIn(s, oid).length || playerActs(s).some((a) => s.acts[a] && actMembers(s, s.acts[a], 0).some((m) => m.o === oid)) ? 1 : 0));
// apelo: credibilidade de rua para gêneros de rua; fama de bandido nos outros
registerMod('appeal', 'crimemem23', (s, v, { release }) => {
  if (!release || s.week - release.week > 2) return null;
  const a = s.acts[release.actId];
  const ms = a ? actMembers(s, a) : [];
  if (!ms.length) return null;
  const o = orgById(s, ms[0].o);
  return STREET(a!.genre)
    ? { value: v * 1.06, label: fmtL(l('Credibilidade de rua (membro de {o})', 'Street credibility (member of {o})'), { o: o?.name ?? '?' }) }
    : { value: v * 0.95, label: fmtL(l('Fama de bandido (ligação com {o})', 'Gangster image (tie to {o})'), { o: o?.name ?? '?' }) };
});
// shows: casas controladas pela organização no país dela
const orgHere = (s: GameState, a: Act | undefined, cityId: string | undefined): Org17 | undefined => {
  if (!a || !cityId) return undefined;
  const a3 = a3Of(s, cityId);
  for (const m of actMembers(s, a, 0)) { const o = orgById(s, m.o); if (o && o.a3 === a3) return o; }
  return undefined;
};
registerMod('showRevenue', 'crimemem23', (s, v, { act, cityId }) => { const o = orgHere(s, act, cityId); return o && (o.rackets.includes('clubs') || o.rackets.includes('tickets')) ? { value: v * 1.06, label: fmtL(l('Casas de {o} abrem as portas', '{o} venues open their doors'), { o: o.name }) } : null; });
registerMod('tourRisk', 'crimemem23', (s, v, { act, cityId }) => { const o = orgHere(s, act, cityId); return o ? { value: Math.max(0, v - 0.03), label: fmtL(l('Território de {o}: ninguém mexe com eles', '{o} turf: nobody touches them'), { o: o.name }) } : null; });

export const _crimemem23 = { memberMonth, recruitMonth, candidates, join, pickTarget };
export type { Mem23 };
