// r27 (P2B) — REUNIÃO DE DIRETORIA. Uma vez por mês a equipe (funcionários de s.player.staff, diretores de carreira
// e chefe de gabinete do agenda17, sócios com assento do capital) leva 3–4 propostas à mesa. Cada um tem a sua
// agenda, tirada da função e do traço de personalidade (ambicioso pede aumento, disciplinado quer reserva de caixa,
// perfeccionista quer estúdio, gerente de turnê quer folga para a banda cansada…). Aprovar ou vetar mexe nos
// sistemas de sempre: caixa (post), hype (hype12), ordens delegadas (deleg16), políticas (policy18), treinamento
// e lealdade da equipe (people/staff), cansaço/estresse/moral do elenco, opinião dos sócios (capital).
// • Modo rápido: a reunião não existe até o jogador ligar ("Reunião mensal") — o jogo segue idêntico. Ligada, o mês
//   em que o jogador não se senta à mesa é decidido sozinho pelas regras de delegação de hoje (policy18: teto de
//   gasto, reserva mínima, objetivo por artista, descanso obrigatório).
// Sorte: Rng.fromSeed(semente|board27v1|mês|quem) — nunca s.rng.

import { Rng, clamp, hashString } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { activeMembers } from '../capacity';
import { addStress } from '../stress17';
import { addHype } from './hype12';
import { ag17 } from './agenda17';
import { capital } from './capital';
import { addOrder } from './deleg16';
import { burn18, goalOf18, pol18, tired18 } from './policy18';
import { careerOf, trainCost, trainStaff } from './people/staff';
import { overPolicy27 } from './road27';
import { STAFF_ROLES } from '../../data/rules';

export const BOARD27_RNG = 'board27v1';
export type PropKind27 = 'tour' | 'promo' | 'rest' | 'studio' | 'reserve' | 'cap' | 'renew' | 'raise' | 'train' | 'audit' | 'cut';
export interface Dir27 { id: string; name: string; role: string; roleName: L; trait: string; staff: boolean; inv?: boolean }
export interface Prop27 { id: string; by: string; k: PropKind27; title: L; pitch: L; agenda: L; cost: number; actId?: string; amt?: number; backers: string[]; foes: string[] }
export interface Meet27 { mk: string; w: number; props: Prop27[]; dec: Record<string, 'yes' | 'no'>; auto?: 1; res: L[] }
export interface Board27 { on: boolean; held: Record<string, Meet27>; n: { yes: number; no: number; auto: number } }
export const board27 = (s: GameState): Board27 => {
  const x = s.x4 as unknown as { board27?: Board27 };
  return (x.board27 ??= { on: false, held: {}, n: { yes: 0, no: 0, auto: 0 } });
};
const peek = (s: GameState): Board27 | undefined => (s.x4 as unknown as { board27?: Board27 }).board27;
export const monthKey27 = (s: GameState): string => `${s.year}-${s.month}`;
const rng = (s: GameState, mk: string, who: string) => Rng.fromSeed(`${s.config.seed}|${BOARD27_RNG}|${mk}|${who}`);

export const TRAIT27: Record<string, L> = {
  disciplined: l('disciplinado(a)', 'disciplined'), workaholic: l('workaholic', 'workaholic'), diplomatic: l('diplomático(a)', 'diplomatic'), perfectionist: l('perfeccionista', 'perfectionist'),
  lazy: l('acomodado(a)', 'laid-back'), ambitious: l('ambicioso(a)', 'ambitious'), loyal: l('leal', 'loyal'), opportunist: l('oportunista', 'opportunist'), investor: l('sócio(a)', 'partner'),
};
const TRAITS = ['disciplined', 'workaholic', 'diplomatic', 'perfectionist', 'lazy', 'ambitious', 'loyal', 'opportunist'];
const roleName = (r: string): L => STAFF_ROLES.find((x) => x.id === r)?.name ?? (r === 'chief' ? l('Chefe de gabinete', 'Chief of staff') : r.startsWith('head:') ? l('Diretor(a) de carreira', 'Career director') : r === 'inv' ? l('Sócio(a)', 'Partner') : l(r, r));

/** Quem senta à mesa: até 6, dos mais graduados aos mais novos. */
export function directors27(s: GameState): Dir27[] {
  const out: Dir27[] = s.player.staff.slice()
    .sort((a, b) => careerOf(s, b).level - careerOf(s, a).level || b.skill - a.skill || (a.id < b.id ? -1 : 1))
    .map((m) => ({ id: m.id, name: m.name, role: m.role, roleName: roleName(m.role), trait: m.trait && TRAITS.includes(m.trait) ? m.trait : TRAITS[hashString(m.id) % TRAITS.length], staff: true }));
  const a = ag17(s);
  for (const [career, hd] of Object.entries(a.heads)) out.push({ id: `head:${career}:${hd.id}`, name: hd.name, role: `head:${career}`, roleName: roleName(`head:${career}`), trait: hd.trait, staff: false });
  if (a.chief) out.push({ id: `chief:${a.chief.id}`, name: a.chief.name, role: 'chief', roleName: roleName('chief'), trait: a.chief.trait, staff: false });
  for (const inv of capital(s).investors) if (inv.clause === 'seat' || inv.share >= 0.15) out.push({ id: `inv:${inv.id}`, name: inv.name, role: 'inv', roleName: roleName('inv'), trait: 'investor', staff: false, inv: true });
  return out.slice(0, 6);
}

const KINDS_BY_ROLE: Record<string, PropKind27[]> = {
  booking_agent: ['tour'], booking: ['tour', 'promo'], agent: ['tour'], promoter: ['promo'], publicist: ['promo'], designer: ['promo'], sync: ['promo', 'audit'],
  tour_manager: ['rest', 'tour'], manager: ['rest', 'renew', 'raise'], producer: ['studio', 'train'], engineer: ['studio', 'train'], anr: ['studio', 'train'],
  analyst: ['reserve', 'cap', 'cut'], admin: ['cut', 'reserve', 'cap'], rights: ['audit', 'reserve'], legal: ['renew', 'cap', 'audit'], manufacturing: ['cut', 'train'],
  chief: ['reserve', 'cut', 'train'], inv: ['reserve', 'cap'],
};
const TRAIT_KIND: Record<string, PropKind27[]> = {
  ambitious: ['raise'], opportunist: ['raise', 'audit'], disciplined: ['reserve', 'cap'], perfectionist: ['studio', 'train'], lazy: ['cut', 'rest'], workaholic: ['tour'], diplomatic: ['rest', 'renew'], loyal: [],
};
const FIN = new Set(['admin', 'analyst', 'rights', 'inv', 'chief']);
const CREATIVE = new Set(['producer', 'engineer', 'anr', 'publicist', 'promoter', 'designer', 'booking', 'booking_agent', 'agent', 'sync']);
const SPEND = new Set<PropKind27>(['tour', 'promo', 'studio', 'raise', 'train']);

/** As propostas do mês (3–4). Puras: mesma semente, mesmo mês, mesma equipe → mesma pauta. */
export function agenda27(s: GameState, mk = monthKey27(s)): Prop27[] {
  const held = peek(s)?.held[mk];
  if (held) return held.props;
  const ds = directors27(s);
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split' && !a.playerBand);
  if (!ds.length) return [];
  const out: Prop27[] = [];
  const used = new Set<string>();
  for (const d of ds) {
    if (out.length >= 4) break;
    const r = rng(s, mk, d.id);
    if (out.length >= 3 && r.next() < 0.5) continue;
    const base = KINDS_BY_ROLE[d.role] ?? (d.role.startsWith('head:') ? ['promo', 'tour', 'studio'] as PropKind27[] : ['train']);
    const pool = [...(TRAIT_KIND[d.trait] ?? []).filter(() => r.next() < 0.6), ...base];
    for (const k of pool) {
      const actPick = acts.length ? actFor(s, k, acts, r) : undefined;
      if (['tour', 'promo', 'rest', 'studio'].includes(k) && !actPick) continue;
      if ((k === 'raise' || k === 'train') && !d.staff) continue;
      if (k === 'renew' && pol18(s).renew) continue;
      if (k === 'reserve' && pol18(s).reserve >= 2) continue;
      if (k === 'cap' && pol18(s).cap > 0) continue;
      const key = `${k}:${actPick?.id ?? ''}`;
      if (used.has(key)) continue;
      used.add(key);
      out.push(make27(s, d, k, actPick, ds));
      break;
    }
  }
  return out;
}
function actFor(s: GameState, k: PropKind27, acts: Act[], r: Rng): Act | undefined {
  if (k === 'rest') return acts.map((a) => ({ a, v: tired18(s, a).v })).filter((x) => x.v >= 45).sort((a, b) => b.v - a.v)[0]?.a;
  if (k === 'tour') return acts.filter((a) => !s.tours.some((t) => t.actId === a.id && (t.status === 'planned' || t.status === 'running'))).sort((a, b) => b.fame - a.fame)[0];
  return acts[Math.floor(r.next() * acts.length)];
}

function make27(s: GameState, d: Dir27, k: PropKind27, a: Act | undefined, ds: Dir27[]): Prop27 {
  const big = d.trait === 'ambitious' ? 1.5 : d.trait === 'loyal' || d.trait === 'disciplined' ? 0.8 : 1;
  const st = s.player.staff.find((m) => m.id === d.id);
  const an = a?.name ?? '';
  const v = { n: d.name, a: an, t: TRAIT27[d.trait] ?? l(d.trait, d.trait), r: d.roleName };
  let cost = 0, amt: number | undefined;
  let title: L, pitch: L;
  switch (k) {
    case 'tour': cost = 0; title = fmtL(l('Pôr {a} na estrada', 'Put {a} on the road'), v); pitch = d.role === 'booking_agent' ? l('Uma ordem permanente de turnê: o agente marca as datas sozinho, dentro da política.', 'A standing tour order: the agent books dates alone, within policy.') : l('Uma rodada de shows anunciada agora: hype para o próximo disco, mais cansaço para a banda.', 'A round of shows announced now: hype for the next record, more fatigue for the band.'); break;
    case 'promo': cost = money(s, Math.round(700 * big)); title = fmtL(l('Campanha para {a}', 'Campaign for {a}'), v); pitch = l('Imprensa, rádio e cartazes: hype e público novo.', 'Press, radio and posters: hype and new audience.'); break;
    case 'rest': title = fmtL(l('Folga para {a}', 'Time off for {a}'), v); pitch = fmtL(l('{p} está no limite. Duas semanas sem agenda: menos cansaço e estresse, um pouco de momento perdido.', '{p} is at the limit. Two weeks off: less fatigue and stress, a little momentum lost.'), { p: a ? tired18(s, a).who : '' }); break;
    case 'studio': cost = money(s, Math.round(900 * big)); title = fmtL(l('Mais tempo de estúdio para {a}', 'More studio time for {a}'), v); pitch = l('Pré-produção caprichada: moral e momento do ato sobem.', 'Careful pre-production: act morale and momentum rise.'); break;
    case 'reserve': amt = d.trait === 'disciplined' || d.inv ? 3 : 2; title = fmtL(l('Política: reserva de {m} meses de custo', 'Policy: a {m}-month cost reserve'), { m: amt }); pitch = l('A equipe delegada não gasta abaixo dessa reserva. Mais segurança, menos agilidade.', 'Delegated staff won\'t spend below this reserve. Safer, less nimble.'); break;
    case 'cap': amt = d.trait === 'disciplined' ? 1500 : 3000; title = fmtL(l('Política: teto de US$ {c} por gasto', 'Policy: a US$ {c} cap per spend'), { c: amt }); pitch = l('Ordens delegadas acima disso param e pedem a sua autorização.', 'Delegated orders above that stop and ask for your approval.'); break;
    case 'renew': title = l('Política: renovação delegada de contratos', 'Policy: delegated contract renewals'); pitch = l('O jurídico/empresário renova sozinho quem vence em 9 semanas, dentro das condições.', 'Legal/manager renew deals ending within 9 weeks on their own, within terms.'); break;
    case 'raise': cost = st ? Math.round(st.salary * 0.12 * 3) : 0; amt = st ? Math.round(st.salary * 0.1) : 0; title = fmtL(l('Aumento para {n}', 'A raise for {n}'), v); pitch = l('10% de aumento (três meses de diferença já entram na conta do ano).', 'A 10% raise (three months\' difference already counts toward the year).'); break;
    case 'train': cost = st ? trainCost(s, st) : 0; title = fmtL(l('Curso de especialização para {n}', 'Specialist course for {n}'), v); pitch = l('Quatro semanas de treinamento: habilidade e lealdade sobem.', 'Four weeks of training: skill and loyalty rise.'); break;
    case 'audit': cost = money(s, 500); title = l('Auditoria de royalties', 'Royalty audit'); pitch = l('Caçar dinheiro esquecido em distribuidoras e editoras. Pode não achar nada.', 'Hunt for forgotten money at distributors and publishers. May find nothing.'); break;
    case 'cut': default: title = l('Corte de despesas', 'Cost cutting'); pitch = l('Menos viagens, menos mimos: economia já, equipe resmunga.', 'Fewer trips, fewer perks: savings now, staff grumbles.'); break;
  }
  const agenda = AGENDA27(d, k, v);
  const backers: string[] = [], foes: string[] = [];
  for (const o of ds) {
    if (o.id === d.id) continue;
    const st2 = stance27(o, k, cost);
    if (st2 > 0) backers.push(o.id); else if (st2 < 0) foes.push(o.id);
  }
  return { id: `${k}:${d.id}:${a?.id ?? ''}`, by: d.id, k, title, pitch, agenda, cost, ...(a ? { actId: a.id } : {}), ...(amt !== undefined ? { amt } : {}), backers, foes };
}
function AGENDA27(d: Dir27, k: PropKind27, v: Record<string, string | L>): L {
  if (d.inv) return fmtL(l('{n} representa os sócios: quer o dinheiro deles protegido.', '{n} speaks for the partners: wants their money protected.'), v);
  if (k === 'raise') return fmtL(l('{n} ({t}) acha que vale mais do que ganha — e sabe que os rivais pagam bem.', '{n} ({t}) feels underpaid — and knows rivals pay well.'), v);
  const by: Record<string, L> = {
    disciplined: l('{n} ({r}, {t}) quer a casa em ordem antes de crescer.', '{n} ({r}, {t}) wants the house in order before growing.'),
    workaholic: l('{n} ({r}, {t}) acha que parado ninguém fica famoso.', '{n} ({r}, {t}) thinks nobody gets famous standing still.'),
    diplomatic: l('{n} ({r}, {t}) quer manter os artistas felizes.', '{n} ({r}, {t}) wants to keep the artists happy.'),
    perfectionist: l('{n} ({r}, {t}) não aceita nada abaixo do impecável.', '{n} ({r}, {t}) won\'t accept anything short of flawless.'),
    lazy: l('{n} ({r}, {t}) prefere o caminho de menos atrito.', '{n} ({r}, {t}) prefers the path of least friction.'),
    ambitious: l('{n} ({r}, {t}) quer resultado grande — e o crédito por ele.', '{n} ({r}, {t}) wants big results — and the credit.'),
    loyal: l('{n} ({r}, {t}) propõe o que acha melhor para o selo.', '{n} ({r}, {t}) proposes what they think is best for the label.'),
    opportunist: l('{n} ({r}, {t}) vê uma chance de lucro rápido.', '{n} ({r}, {t}) sees a chance of quick profit.'),
  };
  return fmtL(by[d.trait] ?? l('{n} ({r}) traz uma proposta.', '{n} ({r}) brings a proposal.'), v);
}
/** +1 apoia, −1 se opõe, 0 neutro — pela função e pelo traço de quem ouve. */
export function stance27(o: Dir27, k: PropKind27, cost: number): number {
  if (FIN.has(o.role) || o.inv) { if (k === 'reserve' || k === 'cap' || k === 'cut' || k === 'audit') return 1; if (cost > 0 && SPEND.has(k)) return -1; }
  if (CREATIVE.has(o.role)) { if (k === 'cut' || k === 'cap' || k === 'reserve') return -1; if (k === 'studio' || k === 'promo') return 1; }
  if (o.role === 'tour_manager' || o.role === 'manager') { if (k === 'rest') return 1; if (k === 'tour') return -1; }
  if (o.trait === 'ambitious' && k === 'raise') return 1;
  if (o.trait === 'disciplined' && k === 'raise') return -1;
  if (o.trait === 'workaholic' && k === 'rest') return -1;
  return 0;
}

// ---------------------------------------------------------------- decisões

/** A decisão que a equipe tomaria pelas regras de delegação de hoje (policy18). */
export function autoDecide27(s: GameState, p: Prop27): { yes: boolean; why: L } {
  const a = p.actId ? s.acts[p.actId] : undefined;
  if (p.cost > 0) {
    const pol = overPolicy27(s, p.cost);
    if (pol) return { yes: false, why: fmtL(l('vetado pela política: {p}', 'vetoed by policy: {p}'), { p: pol }) };
    if (s.player.cash < p.cost) return { yes: false, why: l('vetado: sem caixa', 'vetoed: no cash') };
  }
  const g = goalOf18(s, a?.id);
  if (a && g === 'rest' && (p.k === 'tour' || p.k === 'promo')) return { yes: false, why: l('vetado: artista em "Descansar"', 'vetoed: act set to "Rest"') };
  if (a && g === 'catalog' && p.k === 'tour') return { yes: false, why: l('vetado: artista em "Cuidar do catálogo"', 'vetoed: act set to "Nurture the catalog"') };
  if (a && g === 'profit' && p.k === 'promo' && pol18(s).cap > 0) return { yes: false, why: l('vetado: objetivo "Dar lucro"', 'vetoed: goal "Turn a profit"') };
  if (p.k === 'tour' && a && pol18(s).rest > 0 && tired18(s, a).v >= pol18(s).rest) return { yes: false, why: l('vetado: descanso obrigatório', 'vetoed: mandatory rest') };
  if (p.k === 'rest') return a && tired18(s, a).v >= (pol18(s).rest || 70) ? { yes: true, why: l('aprovado: banda no limite', 'approved: band at the limit') } : { yes: false, why: l('vetado: dá para seguir', 'vetoed: they can keep going') };
  if (p.k === 'raise') { const st = s.player.staff.find((m) => m.id === p.by); return st && careerOf(s, st).loyalty < 50 ? { yes: true, why: l('aprovado: para não perder a pessoa', 'approved: to keep them') } : { yes: false, why: l('vetado: salário em dia com o mercado', 'vetoed: pay is in line with the market') }; }
  if (p.k === 'cut') return s.player.cash < 0 ? { yes: true, why: l('aprovado: caixa no vermelho', 'approved: cash in the red') } : { yes: false, why: l('vetado: não há aperto', 'vetoed: no squeeze') };
  if (p.k === 'reserve') return s.player.cash < 3 * burn18(s) ? { yes: true, why: l('aprovado: caixa curto', 'approved: thin cash') } : { yes: false, why: l('vetado: caixa folgado', 'vetoed: cash is comfortable') };
  if (p.k === 'cap' || p.k === 'renew') return { yes: false, why: l('vetado: sem mudar as regras sem você', 'vetoed: no rule changes without you') };
  return { yes: true, why: l('aprovado: dentro das regras', 'approved: within the rules') };
}

const loy = (s: GameState, id: string, d: number) => { const st = s.player.staff.find((m) => m.id === id); if (st) { const c = careerOf(s, st); c.loyalty = clamp(c.loyalty + d, 0, 100); } };
const invMood = (s: GameState, id: string, d: number, label: L) => { const inv = capital(s).investors.find((x) => `inv:${x.id}` === id); if (inv) { inv.mods.push({ label, value: d, decay: 1 }); if (inv.mods.length > 10) inv.mods.shift(); } };

/** Aprova ou veta uma proposta. Devolve o que aconteceu (frase explicada). */
export function decide27(s: GameState, propId: string, yes: boolean, auto = false): L {
  const mk = monthKey27(s);
  const B = board27(s);
  const props = agenda27(s, mk);
  const p = props.find((x) => x.id === propId);
  if (!p) return l('Proposta não encontrada.', 'Proposal not found.');
  const m = (B.held[mk] ??= { mk, w: s.week, props, dec: {}, res: [] });
  if (m.dec[p.id]) return l('Já decidida.', 'Already decided.');
  if (yes && p.cost > 0 && s.player.cash < p.cost) return l('Caixa insuficiente.', 'Not enough cash.');
  m.dec[p.id] = yes ? 'yes' : 'no';
  const d = directors27(s).find((x) => x.id === p.by);
  const a = p.actId ? s.acts[p.actId] : undefined;
  const r = rng(s, mk, `res:${p.id}`);
  let res: L;
  if (yes) {
    B.n.yes++;
    if (p.cost > 0 && p.k !== 'train') post(s, `board27:${mk}:${p.id}`, -p.cost, p.k === 'promo' ? 'marketing' : p.k === 'raise' ? 'salaries' : 'misc', `Diretoria: ${p.title.pt}`);
    switch (p.k) {
      case 'tour': {
        const e = d?.role === 'booking_agent' && a ? addOrder(s, p.by, 'tour', { actId: a.id }) : 'x';
        if (a) { addHype(s, `a:${a.id}`, 'board27', l('Shows anunciados pela diretoria', 'Shows announced by the board'), 6); for (const id of activeMembers(s, a)) { const pp = s.persons[id]; if (pp) pp.fatigue = clamp(pp.fatigue + 4, 0, 100); } }
        res = e === null ? fmtL(l('Ordem de turnê criada para {a}: o agente marca as datas.', 'Tour order created for {a}: the agent books the dates.'), { a: a?.name ?? '' }) : fmtL(l('{a}: shows anunciados (hype +6, cansaço +4).', '{a}: shows announced (hype +6, fatigue +4).'), { a: a?.name ?? '' });
        break;
      }
      case 'promo': if (a) { addHype(s, `a:${a.id}`, 'board27', l('Campanha aprovada na diretoria', 'Campaign approved by the board'), 10); a.fans.casual += Math.round(400 + a.fame * 60); } res = fmtL(l('{a}: campanha na rua (hype +10, fãs casuais).', '{a}: campaign out (hype +10, casual fans).'), { a: a?.name ?? '' }); break;
      case 'rest': if (a) { a.momentum = clamp(a.momentum - 3, 0, 100); for (const id of activeMembers(s, a)) { const pp = s.persons[id]; if (pp) { pp.fatigue = clamp(pp.fatigue - 15, 0, 100); addStress(s, id, -8); } } } res = fmtL(l('{a} folga: cansaço −15, estresse −8, momento −3.', '{a} rests: fatigue −15, stress −8, momentum −3.'), { a: a?.name ?? '' }); break;
      case 'studio': if (a) { a.momentum = clamp(a.momentum + 3, 0, 100); for (const id of activeMembers(s, a)) { const pp = s.persons[id]; if (pp) pp.morale = clamp(pp.morale + 3, 0, 100); } } res = fmtL(l('{a}: pré-produção caprichada (moral +3, momento +3).', '{a}: careful pre-production (morale +3, momentum +3).'), { a: a?.name ?? '' }); break;
      case 'reserve': pol18(s).reserve = Math.max(pol18(s).reserve, p.amt ?? 2); res = fmtL(l('Política: reserva mínima de {m} meses.', 'Policy: a {m}-month minimum reserve.'), { m: pol18(s).reserve }); break;
      case 'cap': pol18(s).cap = p.amt ?? 3000; res = fmtL(l('Política: teto de US$ {c} por gasto delegado.', 'Policy: a US$ {c} cap per delegated spend.'), { c: pol18(s).cap }); break;
      case 'renew': pol18(s).renew = true; res = l('Política: renovação delegada ligada.', 'Policy: delegated renewals on.'); break;
      case 'raise': { const st = s.player.staff.find((x) => x.id === p.by); if (st) st.salary += p.amt ?? 0; loy(s, p.by, 6); res = fmtL(l('{n} ganha 10% a mais e fica mais leal.', '{n} gets 10% more and grows more loyal.'), { n: d?.name ?? '' }); break; }
      case 'train': { const e = trainStaff(s, p.by); res = e ? e : fmtL(l('{n} entra em treinamento (4 semanas).', '{n} starts training (4 weeks).'), { n: d?.name ?? '' }); break; }
      case 'audit': { const ok = r.next() < 0.6; const v = ok ? money(s, Math.round(r.float(800, 2600))) : 0; if (v) post(s, `board27a:${mk}`, v, 'other_income', 'Auditoria de royalties'); res = ok ? fmtL(l('A auditoria achou dinheiro esquecido: +{v}.', 'The audit found forgotten money: +{v}.'), { v: `$${Math.round(v / 100)}` }) : l('A auditoria não achou nada desta vez.', 'The audit found nothing this time.'); break; }
      case 'cut': default: { post(s, `board27c:${mk}`, money(s, 700), 'misc', 'Diretoria: corte de despesas'); for (const st of s.player.staff) loy(s, st.id, -2); res = l('Despesas cortadas: economia já; lealdade da equipe −2.', 'Costs cut: savings now; staff loyalty −2.'); break; }
    }
    loy(s, p.by, d?.trait === 'ambitious' ? 6 : 4);
    if (d?.inv) invMood(s, p.by, 4, l('A diretoria aceitou a proposta dos sócios', 'The board accepted the partners\' proposal'));
    for (const id of p.backers) loy(s, id, 1);
    for (const id of p.foes) loy(s, id, -1);
  } else {
    B.n.no++;
    const hit = d?.trait === 'ambitious' || d?.trait === 'opportunist' ? -7 : d?.trait === 'loyal' ? -2 : -4;
    loy(s, p.by, hit);
    if (d?.inv) invMood(s, p.by, -6, l('A diretoria vetou a proposta dos sócios', 'The board vetoed the partners\' proposal'));
    for (const id of p.backers) loy(s, id, -1);
    for (const id of p.foes) loy(s, id, 1);
    if (p.k === 'rest' && a) for (const id of activeMembers(s, a)) { const pp = s.persons[id]; if (pp) pp.morale = clamp(pp.morale - 2, 0, 100); }
    res = fmtL(l('Vetada. {n} sai da sala contrariado(a) (lealdade {d}).', 'Vetoed. {n} leaves the room unhappy (loyalty {d}).'), { n: d?.name ?? '', d: hit });
  }
  if (auto) B.n.auto++;
  const line = fmtL(l('{t}: {r}', '{t}: {r}'), { t: p.title, r: res });
  m.res.push(line);
  return res;
}

/** Fecha a reunião: o que ficou sem decisão vai pelas regras de delegação. */
export function closeMeeting27(s: GameState, auto = false): L[] {
  const mk = monthKey27(s);
  const B = board27(s);
  const props = agenda27(s, mk);
  if (!props.length) return [];
  const m = (B.held[mk] ??= { mk, w: s.week, props, dec: {}, res: [] });
  for (const p of props) if (!m.dec[p.id]) { const a = autoDecide27(s, p); decide27(s, p.id, a.yes, true); }
  if (auto) m.auto = 1;
  const ks = Object.keys(B.held);
  if (ks.length > 24) for (const k of ks.slice(0, ks.length - 24)) delete B.held[k];
  emitFact(s, { kind: 'board27', actors: ['player'], severity: 10, visibility: 'secret', tags: ['board', auto ? 'auto' : 'held'], src: 'board27', text: fmtL(l('Reunião de diretoria de {m}: {y} aprovada(s), {n} vetada(s).', 'Board meeting {m}: {y} approved, {n} vetoed.'), { m: mk, y: Object.values(m.dec).filter((x) => x === 'yes').length, n: Object.values(m.dec).filter((x) => x === 'no').length }) });
  return m.res;
}
export const meetingHeld27 = (s: GameState): boolean => !!peek(s)?.held[monthKey27(s)] && agenda27(s).every((p) => !!peek(s)?.held[monthKey27(s)]?.dec[p.id]);
export function setBoard27(s: GameState, on: boolean): void { board27(s).on = on; }

// fim do mês: reunião ligada e não feita → a equipe decide pelas regras (só depois que o jogador ligou a reunião)
registerSimHook('month', 'board27', (s) => {
  const B = peek(s);
  if (!B?.on || meetingHeld27(s)) return;
  closeMeeting27(s, true);
});
