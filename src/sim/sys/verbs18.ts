// Rodada 18 — mais iniciativas de NPCs (agency18), equilibradas em tom: BOAS (apadrinhar, indicar, abrir turnê,
// compor para, emprestar, visitar, defender, doar, apresentar, regravar, acertar créditos, feat), NEUTRAS
// (conselho, negócio, reunião, turnê conjunta, liberar sample, batalha, sondar parceria, pedir apresentação,
// pedir empréstimo, festa, entrevista) e RUINS (acusação de plágio, vazar demos, roubar data, comprar crítico,
// virar a banda contra, sumir/quebrar promessa). Efeitos pelos sistemas que já existem: relações, holds17,
// stress17, facts17 (→ imprensa), fame16, hype12, scandal17 e o livro-caixa (você) / caixa do ato ou do selo.
// Contra você (ou seus artistas) as propostas viram cartas na Caixa com aceitar/negociar/recusar/ignorar.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { emitFact, recentFacts } from '../facts17';
import { grantHold, voidHolds } from '../holds17';
import { scandal } from '../scandal17';
import { addStress, relieveLong, stressOf } from '../stress17';
import type { Act, GameState } from '../types';
import { fmtL, money, post } from '../util';
import { homeA3, nudge16 } from './fame16';
import { addHype } from './hype12';
import { leaders } from './leaders10';
import { opine, per13 } from './persona13';
import { actOfKey18, adjRel18, ag18, H18, hid18, isPlayerKey, MK18, MOT18, nameOfKey18, pay18, playerSide18, pushMotive18, registerVerb18, relOf18, usd18 } from './agency18';

const { fac: F, fact } = H18;
const N = nameOfKey18;
const A0 = actOfKey18;
const nm = (s: GameState, A: string, T: string) => ({ a: N(s, A), t: N(s, T) });
const pid = (k: string): string | undefined => (k.startsWith('p:') ? k.slice(2) : undefined);
const tid = (s: GameState, k: string): string => (isPlayerKey(s, k) ? 'player' : hid18(k));
const cash = (s: GameState, k: string): number => (isPlayerKey(s, k) ? s.player.cash : k.startsWith('l:') ? s.labels[leaders(s).L[k.slice(2)]?.label ?? '']?.cash ?? 0 : A0(s, k)?.cash ?? 0);
/** Entrada/saída de fora (negócio, doação, suborno). */
function box(s: GameState, k: string, d: number, memo: string): void {
  if (!d) return;
  if (isPlayerKey(s, k)) { post(s, `ag18:${memo}:${k}`, d, d < 0 ? 'misc' : 'other_income', memo); return; }
  if (k.startsWith('l:')) { const lb = s.labels[leaders(s).L[k.slice(2)]?.label ?? '']; if (lb) { lb.cash += d; return; } }
  const a = A0(s, k);
  if (a) a.cash = (a.cash ?? 0) + d;
}
const fameUp = (s: GameState, a: Act | undefined, where: Act | undefined, dv: number): void => { if (!a) return; const c = homeA3(where ?? a); if (c) nudge16(s, a.id, c, dv); };
const mom = (a: Act | undefined, d: number): void => { if (a) a.momentum = clamp(a.momentum + d, 0, 100); };
const two = (s: GameState, A: string, T: string): boolean => { const a = A0(s, A), b = A0(s, T); return !!a && !!b && a.id !== b.id; };
const favor = (s: GameState, A: string, T: string, st: number, t: L): void => { grantHold(s, { holder: hid18(A), target: tid(s, T), kind: 'favor', strength: st, months: 48, src: 'agency18', text: t, quiet: !playerSide18(s, T) }); };
const isBiz = (A: string): boolean => A.startsWith('l:') || A.startsWith('e:') || A.startsWith('pd:');
const R = (s: GameState, A: string, T: string, ok: boolean, pt: string, en: string, x: Record<string, string | number | L> = {}): { ok: boolean; t: L } => ({ ok, t: fmtL(l(pt, en), { ...nm(s, A, T), ...x }) });

// ================================================================ BOAS

registerVerb18({
  id: 'mentor', name: l('Apadrinha um novato', 'Mentors a newcomer'), harm: false, tone: 'good', ask: true,
  pitch: l('{a} se oferece para apadrinhar {t}: estúdio aberto, conselhos, portas.', '{a} offers to mentor {t}: open studio, advice, doors.'),
  m: { care: 1, gr: 0.5 }, pf: (s, A) => (F(s, A, 'generosidade') + F(s, A, 'empatia')) / 130,
  ok: (s, A, T) => two(s, A, T) && A0(s, A)!.fame >= A0(s, T)!.fame + 15, accP: () => 0.3,
  run: (s, A, T) => {
    const b = A0(s, T)!;
    mom(b, 4); b.networking = (b.networking ?? 0) + 3;
    const p = pid(T); if (p && !isPlayerKey(s, T)) relieveLong(s, p, 6);
    favor(s, A, T, 35, fmtL(l('Apadrinhado(a) por {a}', 'Mentored by {a}'), { a: N(s, A) }));
    adjRel18(s, T, A, 12, l('Mentoria', 'Mentoring'));
    const o = R(s, A, T, true, '{a} apadrinha {t}: momento +4, contatos +3.', '{a} mentors {t}: momentum +4, contacts +3.');
    fact(s, 'favor', A, T, 28, 'public', ['good', 'mentor'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'recommend', name: l('Indica a um selo/produtor', 'Recommends to a label/producer'), harm: false, tone: 'good',
  m: { gr: 1, care: 0.7 }, pf: (s, A) => (F(s, A, 'generosidade') + F(s, A, 'lealdade')) / 140,
  ok: (s, A, T) => two(s, A, T),
  run: (s, A, T) => {
    const b = A0(s, T)!;
    mom(b, 3); fameUp(s, b, A0(s, A), 2);
    favor(s, A, T, 30, fmtL(l('Indicação de {a}', 'Recommended by {a}'), { a: N(s, A) }));
    const o = R(s, A, T, true, '{a} indica {t} a gente que decide: momento +3, fama +2 na terra de {a}.', '{a} puts in a word for {t} with people who decide: momentum +3, fame +2 in {a}\'s home market.');
    fact(s, 'favor', A, T, 25, 'rumor', ['good', 'recommend'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'invite_tour', name: l('Convida para abrir a turnê', 'Invites as opening act'), harm: false, tone: 'good', ask: true,
  pitch: l('{a} convida {t} para abrir a turnê: palco grande, cachê pequeno, estrada longa.', '{a} invites {t} to open the tour: big stage, small fee, long road.'),
  m: { care: 0.8, gr: 0.8, am: 0.3 }, pf: (s, A) => (F(s, A, 'generosidade') + F(s, A, 'sociabilidade')) / 130,
  ok: (s, A, T) => two(s, A, T) && A0(s, A)!.fame >= A0(s, T)!.fame + 8, accP: () => 0.4,
  run: (s, A, T) => {
    const a = A0(s, A)!, b = A0(s, T)!;
    fameUp(s, b, a, 3);
    const c = pay18(s, A, T, money(s, 800 + a.fame * 20), 'abertura de turnê');
    const p = pid(T); if (p) addStress(s, p, 4, l('Estrada como banda de abertura', 'On the road as opening act'));
    adjRel18(s, T, A, 8, l('Abertura de turnê', 'Opening slot'));
    const o = R(s, A, T, true, '{t} abre a turnê de {a}: fama +3 no mercado de {a}, cachê {v}, estresse +4.', '{t} opens {a}\'s tour: fame +3 in {a}\'s market, fee {v}, stress +4.', { v: usd18(c) });
    fact(s, 'show', A, T, 30, 'public', ['good', 'tour'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'write_song', name: l('Compõe uma canção para', 'Writes a song for'), harm: false, tone: 'good', ask: true,
  pitch: l('{a} escreveu uma canção pensando em {t} e quer que grave.', '{a} wrote a song with {t} in mind and wants them to cut it.'),
  m: { gr: 0.8, care: 0.8 }, pf: (s, A) => ((per13(s, A)?.attrs.ear ?? 50) / 60) * (A.startsWith('p:') || A.startsWith('pd:') ? 1 : 0.3),
  ok: (s, A, T) => !!A0(s, T), accP: () => 0.35,
  run: (s, A, T) => {
    const b = A0(s, T)!;
    mom(b, 5); addHype(s, `a:${b.id}`, 'ag18song', l('Canção de presente', 'A gifted song'), 5);
    favor(s, A, T, 40, fmtL(l('Canção composta por {a}', 'A song written by {a}'), { a: N(s, A) }));
    const o = R(s, A, T, true, '{a} entrega uma canção a {t}: momento +5, hype +5 (e um favor a cobrar).', '{a} hands {t} a song: momentum +5, hype +5 (and a favor to collect).');
    fact(s, 'favor', A, T, 30, 'public', ['good', 'song'], o.t);
    return o;
  },
});
const needy = (s: GameState, k: string): boolean => (isPlayerKey(s, k) ? s.player.cash < money(s, 20000) : cash(s, k) < money(s, 2000));
registerVerb18({
  id: 'lend_money', name: l('Empresta dinheiro', 'Lends money'), harm: false, tone: 'good', ask: true,
  pitch: l('{a} soube do aperto e oferece um empréstimo a {t}, sem juros.', '{a} heard about the squeeze and offers {t} a loan, interest-free.'),
  m: { care: 1, gr: 0.6 }, pf: (s, A) => F(s, A, 'generosidade') / 60,
  ok: (s, A, T) => !isPlayerKey(s, A) && cash(s, A) > money(s, 8000) && needy(s, T) && !!A0(s, T), accP: () => 0.4,
  run: (s, A, T) => {
    const c = pay18(s, A, T, money(s, 5000), 'empréstimo');
    grantHold(s, { holder: hid18(A), target: tid(s, T), kind: 'debt', strength: 40, months: 36, src: 'agency18', text: fmtL(l('Emprestou {v}', 'Lent {v}'), { v: usd18(c) }), quiet: !playerSide18(s, T) });
    adjRel18(s, T, A, 10, l('Empréstimo', 'Loan'));
    const o = R(s, A, T, c > 0, '{a} empresta {v} a {t} — sem juros, mas com memória.', '{a} lends {t} {v} — no interest, but a long memory.', { v: usd18(c) });
    fact(s, 'favor', A, T, 22, 'rumor', ['good', 'loan'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'visit_sick', name: l('Visita no hospital/na crise', 'Visits when sick'), harm: false, tone: 'good',
  m: { care: 1.2 }, pf: (s, A) => (F(s, A, 'empatia') + F(s, A, 'lealdade')) / 120,
  ok: (s, A, T) => { const p = s.persons[pid(T) ?? '']; return !!p && A.startsWith('p:') && (p.health !== 'ok' || stressOf(s, p.id).level !== 'ok'); },
  run: (s, A, T) => {
    relieveLong(s, pid(T)!, 10); adjRel18(s, T, A, 15, l('Visita na hora difícil', 'Visit in hard times'));
    const o = R(s, A, T, true, '{a} aparece para ver {t} na hora difícil: estresse de fundo −10.', '{a} shows up for {t} in hard times: long-term stress −10.');
    fact(s, 'favor', A, T, 20, 'rumor', ['good', 'visit'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'defend', name: l('Defende em público no escândalo', 'Defends them in a scandal'), harm: false, tone: 'good',
  m: { care: 1, gr: 0.8 }, pf: (s, A) => (F(s, A, 'coragem') + F(s, A, 'lealdade')) / 130,
  ok: (s, _A, T) => { const b = A0(s, T); return !!b && recentFacts(s, { kind: 'scandal', actor: b.id, months: 6, limit: 1 }).length > 0; },
  run: (s, A, T) => {
    const b = A0(s, T)!;
    mom(b, 3); fameUp(s, b, b, 1); mom(A0(s, A), -1);
    adjRel18(s, T, A, 15, l('Defesa pública', 'Public defense'));
    const o = R(s, A, T, true, '{a} sai em defesa de {t} no meio do escândalo: momento +3 para {t}; {a} arrisca a própria imagem (−1).', '{a} stands up for {t} mid-scandal: momentum +3 for {t}; {a} risks their own image (−1).');
    fact(s, 'statement', A, T, 35, 'public', ['good', 'defend'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'donate', name: l('Doa a uma causa em nome de', 'Donates to a cause in their name'), harm: false, tone: 'good',
  m: { gr: 0.7, care: 0.9 }, pf: (s, A) => F(s, A, 'generosidade') / 70,
  ok: (s, A, T) => !isPlayerKey(s, A) && cash(s, A) > money(s, 6000) && !!A0(s, T),
  run: (s, A, T) => {
    const c = money(s, 2500);
    box(s, A, -c, 'doação');
    adjRel18(s, T, A, 12, l('Doação em seu nome', 'Donation in their name'));
    fameUp(s, A0(s, A), undefined, 1); fameUp(s, A0(s, T), undefined, 1);
    const o = R(s, A, T, true, '{a} doa {v} a uma causa em nome de {t}: boa imprensa para os dois.', '{a} donates {v} to a cause in {t}\'s name: good press for both.', { v: usd18(c) });
    fact(s, 'favor', A, T, 30, 'public', ['good', 'charity'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'introduce', name: l('Apresenta a um contato', 'Introduces to a contact'), harm: false, tone: 'good',
  m: { gr: 0.9, care: 0.6, am: 0.3 }, pf: (s, A) => F(s, A, 'sociabilidade') / 70,
  ok: (s, _A, T) => !!A0(s, T),
  run: (s, A, T) => {
    const b = A0(s, T)!;
    b.networking = (b.networking ?? 0) + 5;
    favor(s, A, T, 25, fmtL(l('Apresentado(a) por {a}', 'Introduced by {a}'), { a: N(s, A) }));
    adjRel18(s, T, A, 8, l('Apresentação', 'Introduction'));
    const o = R(s, A, T, true, '{a} apresenta {t} a um contato importante: contatos +5.', '{a} introduces {t} to an important contact: contacts +5.');
    fact(s, 'favor', A, T, 20, 'rumor', ['good', 'intro'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'cover_song', name: l('Regrava uma canção (royalties)', 'Covers their song (royalties)'), harm: false, tone: 'good',
  m: { care: 0.7, gr: 0.6, en: 0.2 }, pf: (s, A) => (F(s, A, 'sociabilidade') + 50) / 120,
  ok: (s, A, T) => two(s, A, T) && A0(s, T)!.fame >= 20,
  run: (s, A, T) => {
    const a = A0(s, A)!, b = A0(s, T)!;
    const c = pay18(s, A, T, money(s, 1500 + a.fame * 40), 'royalties de regravação');
    mom(a, 2); mom(b, 2);
    adjRel18(s, T, A, 8, l('Regravação', 'Cover version'));
    const o = R(s, A, T, true, '{a} regrava uma canção de {t}: royalties de {v} e público novo para os dois.', '{a} covers a song by {t}: {v} in royalties and a new audience for both.', { v: usd18(c) });
    fact(s, 'release', A, T, 30, 'public', ['good', 'cover'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'fix_credits', name: l('Acerta os créditos', 'Fixes the credits'), harm: false, tone: 'good',
  m: { gr: 1, g: 0.2 }, pf: (s, A) => (F(s, A, 'empatia') + F(s, A, 'lealdade')) / 150,
  ok: (s, A, T) => two(s, A, T),
  run: (s, A, T) => {
    const c = pay18(s, A, T, money(s, 2500), 'créditos acertados');
    adjRel18(s, T, A, 15, l('Créditos acertados', 'Credits fixed'));
    voidHolds(s, (h) => h.kind === 'grievance' && h.holder === tid(s, T) && h.target === hid18(A));
    const o = R(s, A, T, true, '{a} reconhece a parte de {t} numa faixa e acerta os créditos ({v} retroativos). Mágoa encerrada.', '{a} acknowledges {t}\'s part in a track and fixes the credits ({v} back pay). Grudge closed.', { v: usd18(c) });
    fact(s, 'deal', A, T, 30, 'public', ['good', 'credits'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'feature', name: l('Chama para um feat', 'Features them on a track'), harm: false, tone: 'good', ask: true,
  pitch: l('{a} quer {t} numa faixa nova: um feat.', '{a} wants {t} on a new track: a feature.'),
  m: { care: 0.8, gr: 0.8, am: 0.5 }, pf: (s, A) => (F(s, A, 'sociabilidade') + F(s, A, 'ambicao')) / 130,
  ok: (s, A, T) => two(s, A, T) && A0(s, A)!.fame >= 10 && A0(s, T)!.fame >= 10,
  accP: (s, A, T) => (A0(s, A)!.fame - A0(s, T)!.fame) / 150,
  run: (s, A, T) => {
    const a = A0(s, A)!, b = A0(s, T)!;
    for (const x of [a, b]) { addHype(s, `a:${x.id}`, 'ag18feat', l('Feat', 'Feature'), 5); mom(x, 3); x.feats = (x.feats ?? 0) + 1; }
    adjRel18(s, A, T, 10, l('Feat', 'Feature')); adjRel18(s, T, A, 10, l('Feat', 'Feature'));
    const o = R(s, A, T, true, '{a} e {t} gravam juntos: hype +5 e momento +3 para os dois.', '{a} and {t} record together: hype +5 and momentum +3 for both.');
    fact(s, 'release', A, T, 35, 'public', ['good', 'feat'], o.t);
    return o;
  },
});

// ================================================================ NEUTRAS (propostas)

registerVerb18({
  id: 'ask_advice', name: l('Pede um conselho', 'Asks for advice'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} pede um conselho a {t}: carreira, contrato, estrada.', '{a} asks {t} for advice: career, contract, the road.'),
  m: { am: 1, gr: 0.4 }, pf: (s, A) => ((100 - F(s, A, 'ego')) + F(s, A, 'sociabilidade')) / 130,
  ok: (s, A, T) => two(s, A, T) && A0(s, T)!.fame >= A0(s, A)!.fame + 10, accP: () => 0.3,
  run: (s, A, T) => {
    mom(A0(s, A), 2); const p = pid(A); if (p) relieveLong(s, p, 4);
    adjRel18(s, A, T, 8, l('Conselho', 'Advice')); adjRel18(s, T, A, 5, l('Pediu conselho', 'Asked for advice'));
    return R(s, A, T, true, '{t} dá um conselho a {a}: momento +2 para {a}; os dois se aproximam.', '{t} gives {a} some advice: momentum +2 for {a}; they grow closer.');
  },
});
registerVerb18({
  id: 'propose_deal', name: l('Propõe um negócio', 'Proposes a business deal'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} propõe um negócio a {t}: licença, coedição ou parceria de catálogo — dinheiro para os dois.', '{a} proposes a deal to {t}: licensing, co-publishing or a catalog partnership — money for both.'),
  m: { am: 1.2 }, pf: (s, A) => (F(s, A, 'ambicao') + (per13(s, A)?.attrs.neg ?? 50)) / 130 * (isBiz(A) ? 1.3 : 0.6),
  ok: (s, _A, T) => !!A0(s, T) || isPlayerKey(s, T),
  run: (s, A, T, r) => {
    const c = money(s, 3000 + r.int(0, 4) * 1000);
    box(s, A, c, 'negócio'); box(s, T, c, 'negócio');
    adjRel18(s, A, T, 6, l('Negócio', 'Deal')); adjRel18(s, T, A, 6, l('Negócio', 'Deal'));
    const o = R(s, A, T, true, '{a} e {t} fecham negócio: {v} para cada lado.', '{a} and {t} close a deal: {v} each.', { v: usd18(c) });
    fact(s, 'deal', A, T, 25, 'public', ['deal', 'neutral'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'request_meeting', name: l('Pede uma reunião', 'Requests a meeting'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} pede uma reunião com {t}. Sem pauta — o que quer de verdade?', '{a} asks {t} for a meeting. No agenda — what do they really want?'),
  m: { am: 0.6, g: 0.3, gr: 0.3, care: 0.3 }, pf: (s, A) => F(s, A, 'sociabilidade') / 80,
  run: (s, A, T, r) => {
    adjRel18(s, A, T, 5, l('Reunião', 'Meeting')); adjRel18(s, T, A, 5, l('Reunião', 'Meeting'));
    const m = ag18(s).mot[`${A}>${T}`];
    const top = m ? MK18[m.v.indexOf(Math.max(...m.v))] : 'am';
    if (!isPlayerKey(s, T) && r.chance(0.15)) grantHold(s, { holder: hid18(A), target: tid(s, T), kind: 'secret', strength: 25, months: 60, src: 'agency18', text: fmtL(l('Algo que {t} deixou escapar numa reunião', 'Something {t} let slip in a meeting'), { t: N(s, T) }), quiet: true });
    return R(s, A, T, true, 'Reunião entre {a} e {t}. Por trás da conversa: {m}.', 'Meeting between {a} and {t}. Behind the talk: {m}.', { m: MOT18[top] });
  },
});
registerVerb18({
  id: 'joint_tour', name: l('Negocia turnê conjunta', 'Negotiates a joint tour'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} propõe uma turnê conjunta com {t}: dividir palco, custos e público.', '{a} proposes a joint tour with {t}: share stage, costs and audience.'),
  m: { am: 1, gr: 0.6 }, pf: (s, A) => F(s, A, 'ambicao') / 70,
  ok: (s, A, T) => two(s, A, T) && A0(s, A)!.fame >= 20 && A0(s, T)!.fame >= 20 && Math.abs(A0(s, A)!.fame - A0(s, T)!.fame) < 20,
  run: (s, A, T) => {
    const a = A0(s, A)!, b = A0(s, T)!;
    fameUp(s, b, a, 2); fameUp(s, a, b, 2);
    const c = money(s, 2500 + (a.fame + b.fame) * 15);
    box(s, A, c, 'turnê conjunta'); box(s, T, c, 'turnê conjunta');
    for (const k of [A, T]) { const p = pid(k); if (p) addStress(s, p, 5, l('Turnê conjunta', 'Joint tour')); }
    adjRel18(s, A, T, 8, l('Turnê conjunta', 'Joint tour')); adjRel18(s, T, A, 8, l('Turnê conjunta', 'Joint tour'));
    const o = R(s, A, T, true, '{a} e {t} saem em turnê juntos: fama +2 no mercado do outro, {v} para cada um, estresse +5.', '{a} and {t} tour together: fame +2 in each other\'s market, {v} each, stress +5.', { v: usd18(c) });
    fact(s, 'show', A, T, 35, 'public', ['neutral', 'tour'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'sample_clear', name: l('Pede para liberar sample/regravação', 'Asks to clear a sample'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} quer usar um trecho de {t} numa faixa nova e oferece uma taxa de liberação.', '{a} wants to sample {t} on a new track and offers a clearance fee.'),
  m: { am: 0.8, gr: 0.3, en: 0.2 }, ok: (s, A, T) => two(s, A, T) && A0(s, T)!.fame >= 25,
  run: (s, A, T) => {
    const c = pay18(s, A, T, money(s, 1500 + A0(s, T)!.fame * 40), 'liberação de sample');
    mom(A0(s, A), 3);
    const o = R(s, A, T, true, '{t} libera o sample para {a}: taxa de {v}; a faixa nova ganha corpo (momento +3).', '{t} clears the sample for {a}: {v} fee; the new track takes shape (momentum +3).', { v: usd18(c) });
    fact(s, 'sample', A, T, 20, 'rumor', ['neutral', 'rights'], o.t);
    return o;
  },
  resp: {
    decline: (s, A, T, r) => {
      adjRel18(s, A, T, -5, l('Sample negado', 'Sample refused'));
      if (r.chance(0.35)) { grantHold(s, { holder: tid(s, T), target: hid18(A), kind: 'grievance', strength: 40, months: 48, src: 'agency18', text: fmtL(l('{a} usou o sample sem autorização', '{a} used the sample without clearance'), { a: N(s, A) }), quiet: false }); return fmtL(l('Você negou — e {a} usou o sample mesmo assim. Agora você tem uma mágoa (e um caso) contra {a}.', 'You refused — and {a} used it anyway. Now you hold a grievance (and a case) against {a}.'), { a: N(s, A) }); }
      return fmtL(l('Você negou o sample. {a} engole (relação −5).', 'You refused the sample. {a} swallows it (relation −5).'), { a: N(s, A) });
    },
  },
});
registerVerb18({
  id: 'battle', name: l('Desafia para uma batalha amistosa', 'Challenges to a friendly battle'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} desafia {t} para uma batalha/concurso amistoso no palco. Recusar parece medo.', '{a} challenges {t} to a friendly battle on stage. Refusing looks scared.'),
  m: { en: 0.8, am: 0.6, g: 0.3 }, pf: (s, A) => (F(s, A, 'ego') + F(s, A, 'coragem')) / 130,
  ok: (s, A, T) => two(s, A, T), accP: () => 0.2,
  run: (s, A, T, r) => {
    const a = A0(s, A)!, b = A0(s, T)!;
    const wa = r.chance(clamp(0.5 + (a.fame - b.fame) / 200, 0.2, 0.8));
    const [w, lk] = wa ? [a, T] : [b, A];
    mom(w, 4); for (const x of [a, b]) addHype(s, `a:${x.id}`, 'ag18battle', l('Batalha', 'Battle'), 4);
    const p = pid(lk); if (p) addStress(s, p, 3, l('Perdeu a batalha', 'Lost the battle'));
    const o = R(s, A, T, true, 'Batalha amistosa entre {a} e {t}: vence {w} (momento +4); hype +4 para os dois.', 'Friendly battle between {a} and {t}: {w} wins (momentum +4); hype +4 for both.', { w: w.name });
    fact(s, 'show', A, T, 30, 'public', ['neutral', 'battle'], o.t);
    return o;
  },
  resp: { decline: (s, A, T) => { mom(A0(s, T), -1); mom(A0(s, A), 1); return fmtL(l('Você recusou a batalha: {a} diz que vocês "amarelaram" (momento −1).', 'You declined the battle: {a} says you "chickened out" (momentum −1).'), { a: N(s, A) }); } },
});
registerVerb18({
  id: 'poll_collab', name: l('Sonda uma parceria', 'Floats a collaboration'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} sonda {t}: "a gente devia fazer algo juntos um dia".', '{a} sounds out {t}: "we should do something together someday".'),
  m: { care: 0.6, gr: 0.6, am: 0.6 }, pf: (s, A) => F(s, A, 'sociabilidade') / 70,
  ok: (s, A, T) => two(s, A, T),
  run: (s, A, T) => {
    adjRel18(s, A, T, 6, l('Parceria em vista', 'Collaboration in sight')); adjRel18(s, T, A, 6, l('Parceria em vista', 'Collaboration in sight'));
    pushMotive18(s, A, T, 'care', 40, fmtL(l('{a} e {t} combinaram uma parceria', '{a} and {t} agreed to collaborate'), nm(s, A, T)));
    if (!isPlayerKey(s, T)) pushMotive18(s, T, A, 'gr', 20, fmtL(l('{a} sondou uma parceria', '{a} floated a collaboration'), nm(s, A, T)));
    return R(s, A, T, true, '{a} e {t} combinam fazer algo juntos — a ideia fica no ar (um feat pode vir).', '{a} and {t} agree to work together — the idea hangs in the air (a feature may follow).');
  },
});
registerVerb18({
  id: 'ask_intro', name: l('Pede uma apresentação', 'Asks for an introduction'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} pede a {t} que o(a) apresente a alguém importante do meio.', '{a} asks {t} for an introduction to someone important in the business.'),
  m: { am: 1 }, pf: (s, A) => (F(s, A, 'sociabilidade') + F(s, A, 'ambicao')) / 130,
  ok: (s, A, T) => two(s, A, T) && A0(s, T)!.fame >= A0(s, A)!.fame + 5,
  run: (s, A, T) => {
    const a = A0(s, A)!;
    a.networking = (a.networking ?? 0) + 4;
    grantHold(s, { holder: tid(s, T), target: hid18(A), kind: 'favor', strength: 30, months: 48, src: 'agency18', text: fmtL(l('Apresentei {a} a gente importante', 'I introduced {a} to important people'), { a: N(s, A) }), quiet: !playerSide18(s, T) });
    adjRel18(s, A, T, 8, l('Apresentação', 'Introduction'));
    return R(s, A, T, true, '{t} apresenta {a} a quem importa: contatos +4 para {a} — e {a} fica devendo um favor a {t}.', '{t} introduces {a} to people who matter: contacts +4 for {a} — and {a} owes {t} a favor.');
  },
});
registerVerb18({
  id: 'ask_loan', name: l('Pede dinheiro emprestado', 'Asks for a loan'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} está apertado(a) e pede dinheiro emprestado a {t}.', '{a} is short on cash and asks {t} for a loan.'),
  m: { am: 0.6, care: 0.4, gr: 0.3 }, pf: (s, A) => ((100 - F(s, A, 'teimosia')) + F(s, A, 'sociabilidade')) / 140,
  ok: (s, A, T) => !!A0(s, A) && needy(s, A) && (isPlayerKey(s, T) ? s.player.cash > money(s, 30000) : cash(s, T) > money(s, 8000)), accP: () => -0.1,
  run: (s, A, T) => {
    const c = pay18(s, T, A, money(s, 4000), 'empréstimo');
    grantHold(s, { holder: tid(s, T), target: hid18(A), kind: 'debt', strength: 45, months: 36, src: 'agency18', text: fmtL(l('{a} me deve {v}', '{a} owes me {v}'), { a: N(s, A), v: usd18(c) }), quiet: !playerSide18(s, T) });
    adjRel18(s, A, T, 10, l('Empréstimo', 'Loan'));
    return R(s, A, T, c > 0, '{t} empresta {v} a {a}. Agora {a} deve — e dívida é alavanca.', '{t} lends {a} {v}. Now {a} owes — and debt is leverage.', { v: usd18(c) });
  },
});
registerVerb18({
  id: 'invite_party', name: l('Convida para uma festa', 'Invites to a party'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} convida {t} para uma festa daquelas.', '{a} invites {t} to one of those parties.'),
  m: { care: 1, gr: 0.5, am: 0.3 }, pf: (s, A) => F(s, A, 'sociabilidade') / 60, accP: () => 0.2,
  run: (s, A, T, r) => {
    adjRel18(s, A, T, 6, l('Festa', 'Party')); adjRel18(s, T, A, 6, l('Festa', 'Party'));
    const p = pid(T); if (p && !isPlayerKey(s, T)) relieveLong(s, p, 3);
    let x: L = l('', '');
    if (!isPlayerKey(s, T) && r.chance(0.15)) { grantHold(s, { holder: hid18(A), target: tid(s, T), kind: 'secret', strength: 30, months: 60, src: 'agency18', text: fmtL(l('O que {t} fez na festa', 'What {t} did at the party'), { t: N(s, T) }), quiet: true }); x = l(' Alguém viu algo que não devia.', ' Someone saw something they shouldn\'t have.'); }
    if (A.startsWith('p:') && T.startsWith('p:') && !isPlayerKey(s, T) && r.chance(0.12)) pushMotive18(s, A, T, 'care', 30, l('Química na festa', 'Chemistry at the party'));
    return R(s, A, T, true, '{t} vai à festa de {a}: relação +6.{x}', '{t} goes to {a}\'s party: relation +6.{x}', { x });
  },
});
registerVerb18({
  id: 'interview', name: l('Pede uma entrevista', 'Requests an interview'), harm: false, tone: 'neutral', ask: true,
  pitch: l('{a} quer {t} no seu programa/podcast/coluna. Vitrine — ou armadilha?', '{a} wants {t} on their show/podcast/column. Showcase — or trap?'),
  m: { am: 0.7, en: 0.3, care: 0.3 }, pf: (s, A) => (F(s, A, 'sociabilidade') + F(s, A, 'vaidade')) / 130,
  ok: (s, _A, T) => !!A0(s, T), accP: () => 0.25,
  run: (s, A, T, r) => {
    const b = A0(s, T)!;
    if (relOf18(s, A, T) < -20 && r.chance(0.5)) {
      const t = fmtL(l('A entrevista de {t} com {a} era uma armadilha: perguntas venenosas, cortes maldosos.', '{t}\'s interview with {a} was a trap: poisoned questions, nasty edits.'), nm(s, A, T));
      scandal(s, b.id, 'conduct', 18, t, { person: pid(T), tags: ['ag18', 'interview'], quiet: !playerSide18(s, T) });
      return { ok: false, t };
    }
    fameUp(s, b, A0(s, A), 1.5); addHype(s, `a:${b.id}`, 'ag18int', l('Entrevista', 'Interview'), 3);
    return R(s, A, T, true, '{t} dá entrevista a {a}: fama +1,5 e hype +3.', '{t} is interviewed by {a}: fame +1.5 and hype +3.');
  },
});

// ================================================================ RUINS

registerVerb18({
  id: 'plagiarism', name: l('Acusa de plágio', 'Claims plagiarism'), harm: true, tone: 'bad',
  m: { g: 0.7, en: 0.8, am: 0.4 }, pf: (s, A) => (F(s, A, 'teimosia') + F(s, A, 'ambicao')) / 150,
  ok: (s, A, T) => two(s, A, T),
  run: (s, A, T, r) => {
    const b = A0(s, T)!;
    mom(b, -3); adjRel18(s, T, A, -20, l('Acusação de plágio', 'Plagiarism claim'));
    let x: L = l('', '');
    if (!playerSide18(s, T) && r.chance(0.4)) { const c = pay18(s, T, A, money(s, 6000), 'acordo de plágio'); x = fmtL(l(' Acordo: {v}.', ' Settled: {v}.'), { v: usd18(c) }); }
    const o = R(s, A, T, true, '{a} acusa {t} de plágio: "essa melodia é minha". Momento −3 para {t}.{x}', '{a} accuses {t} of plagiarism: "that melody is mine". Momentum −3 for {t}.{x}', { x });
    fact(s, 'plagiarism', A, T, 40, 'public', ['law', 'bad'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'leak_demos', name: l('Vaza as demos', 'Leaks their demos'), harm: true, tone: 'bad', hidden: true,
  m: { g: 0.8, en: 0.9 }, pf: (s, A) => ((100 - F(s, A, 'lealdade')) + F(s, A, 'impulsividade')) / 150,
  ok: (s, _A, T) => !!A0(s, T),
  run: (s, A, T, r) => {
    const b = A0(s, T)!;
    addHype(s, `a:${b.id}`, 'ag18leak', l('Demos vazadas', 'Leaked demos'), -4); mom(b, -3);
    const traced = r.chance(0.35);
    if (traced) { grantHold(s, { holder: tid(s, T), target: hid18(A), kind: 'grievance', strength: 45, months: 60, src: 'agency18', text: l('Vazou minhas demos', 'Leaked my demos'), quiet: !playerSide18(s, T) }); adjRel18(s, T, A, -20, l('Vazamento', 'Leak')); }
    const o = R(s, A, T, true, 'Demos de {t} vazam antes da hora: hype −4, momento −3.{x}', '{t}\'s demos leak early: hype −4, momentum −3.{x}', { x: traced ? fmtL(l(' Todo mundo sabe que foi {a}.', ' Everyone knows it was {a}.'), { a: N(s, A) }) : l(' Ninguém sabe de onde veio.', ' Nobody knows where it came from.') });
    emitFact(s, { kind: 'leak', actors: traced ? [hid18(A), hid18(T), b.id] : [b.id], place: b.city, severity: 35, visibility: 'rumor', tags: ['bad', 'leak', 'ag18'], text: o.t, src: 'agency18' });
    return o;
  },
});
registerVerb18({
  id: 'undercut', name: l('Rouba a data (undercut)', 'Undercuts their booking'), harm: true, tone: 'bad',
  m: { en: 1, am: 0.8 }, pf: (s, A) => (F(s, A, 'ambicao') + (100 - F(s, A, 'empatia'))) / 150,
  ok: (s, A, T) => two(s, A, T) && Math.abs(A0(s, A)!.fame - A0(s, T)!.fame) < 20,
  run: (s, A, T, r) => {
    const b = A0(s, T)!;
    const c = pay18(s, T, A, money(s, 1500 + b.fame * 30), 'data perdida');
    mom(b, -2);
    const traced = r.chance(0.5);
    if (traced) adjRel18(s, T, A, -12, l('Roubou a data', 'Stole the booking'));
    const o = R(s, A, T, true, '{a} cobra mais barato e fica com a data de {t}: {v} a menos para {t}.{x}', '{a} undercuts {t} and takes the booking: {v} less for {t}.{x}', { v: usd18(c), x: traced ? l(' O contratante contou quem foi.', ' The promoter told who it was.') : l('', '') });
    fact(s, 'show', A, T, 25, 'rumor', ['bad', 'undercut'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'bribe_critic', name: l('Compra um crítico contra', 'Bribes a critic against them'), harm: true, tone: 'bad', hidden: true,
  m: { g: 0.6, en: 1 }, pf: (s, A) => ((100 - F(s, A, 'empatia')) + F(s, A, 'ambicao')) / 160 * (isBiz(A) ? 1.3 : 0.7),
  ok: (s, A, T) => !!A0(s, T) && !isPlayerKey(s, A) && cash(s, A) > money(s, 5000),
  run: (s, A, T, r) => {
    const b = A0(s, T)!;
    box(s, A, -money(s, 2500), 'jabá para crítico');
    mom(b, -4); addHype(s, `a:${b.id}`, 'ag18critic', l('Crítica arrasadora', 'Savage review'), -5);
    const a = A0(s, A);
    const traced = r.chance(0.25);
    if (traced && a) scandal(s, a.id, 'money', 30, fmtL(l('{a} pagou um crítico para arrasar {t}', '{a} paid a critic to trash {t}'), nm(s, A, T)), { person: pid(A), tags: ['ag18', 'payola'], quiet: !playerSide18(s, A) });
    const o = R(s, A, T, true, 'Um crítico influente arrasa {t}: momento −4, hype −5.{x}', 'An influential critic savages {t}: momentum −4, hype −5.{x}', { x: traced ? fmtL(l(' Depois se descobre: {a} pagou.', ' Later it comes out: {a} paid.'), { a: N(s, A) }) : l('', '') });
    emitFact(s, { kind: 'press', actors: traced ? [hid18(A), hid18(T), b.id] : [b.id], place: b.city, severity: 30, visibility: 'public', tags: ['bad', 'press', 'ag18'], text: o.t, src: 'agency18' });
    return o;
  },
});
registerVerb18({
  id: 'turn_band', name: l('Vira a banda contra', 'Turns their bandmates'), harm: true, tone: 'bad', hidden: true,
  m: { g: 0.9, en: 0.6 }, pf: (s, A) => ((100 - F(s, A, 'empatia')) + F(s, A, 'sociabilidade')) / 150,
  ok: (s, _A, T) => { const b = A0(s, T); return !!b && b.members.filter((m) => s.persons[m]?.alive && !s.persons[m].isPlayer).length >= 2; },
  run: (s, A, T) => {
    const b = A0(s, T)!;
    const lead = pid(T);
    const ms = b.members.filter((m) => m !== lead && s.persons[m]?.alive && !s.persons[m].isPlayer).slice(0, 2);
    for (const m of ms) {
      const p = s.persons[m];
      p.resentment = clamp((p.resentment ?? 0) + 8, 0, 100);
      if (lead) p.rel[lead] = clamp((p.rel[lead] ?? 0) - 10, -100, 100);
      addStress(s, m, 5, fmtL(l('Intrigas de {a}', 'Whispers from {a}'), { a: N(s, A) }));
      if (playerSide18(s, T)) opine(s, `p:${m}`, -5, fmtL(l('Ouviu coisas de {a}', 'Heard things from {a}'), { a: N(s, A) }));
    }
    const o = R(s, A, T, true, '{a} sussurra no ouvido da banda de {t}: ressentimento +8 em {n} integrante(s).', '{a} whispers in the ears of {t}\'s band: resentment +8 in {n} member(s).', { n: ms.length });
    fact(s, 'statement', A, T, 30, 'rumor', ['bad', 'intrigue'], o.t);
    return o;
  },
});
registerVerb18({
  id: 'ghost', name: l('Some / quebra a promessa', 'Ghosts them / breaks a promise'), harm: true, tone: 'bad',
  m: { am: 0.5, en: 0.3, g: 0.3 }, pf: (s, A) => ((100 - F(s, A, 'lealdade')) + F(s, A, 'ego')) / 160,
  ok: (s, A, T) => relOf18(s, T, A) > 10 || relOf18(s, A, T) > 10,
  run: (s, A, T) => {
    adjRel18(s, T, A, -12, l('Sumiu', 'Ghosted'));
    grantHold(s, { holder: tid(s, T), target: hid18(A), kind: 'grievance', strength: 30, months: 36, src: 'agency18', text: fmtL(l('{a} prometeu e sumiu', '{a} promised and vanished'), { a: N(s, A) }), quiet: !playerSide18(s, T) });
    const p = pid(T); if (p) addStress(s, p, 4, l('Promessa quebrada', 'Broken promise'));
    const o = R(s, A, T, true, '{a} some depois de prometer a {t} (show, faixa, dinheiro). Relação −12 e uma mágoa.', '{a} vanishes after promising {t} (a show, a track, money). Relation −12 and a grudge.');
    fact(s, 'statement', A, T, 20, 'rumor', ['bad', 'ghost'], o.t);
    return o;
  },
});

export const _verbs18 = { box, cash, needy };
