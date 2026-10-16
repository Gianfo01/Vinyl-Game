// r27 (P2A) — REDE DE FAVORES. Um quadro de cortiça com barbantes: quem deve a quem e quem sabe o quê, montado
// sobre o livro de obrigações (holds17), os segredos (secrets23) e a lealdade da equipe (links23 L2: equipe
// insatisfeita vaza). As gentilezas pagas de sempre (almoço com empresário — managers14; jantar com produtor —
// producers15; presente — persona13) viram JOGADAS DE FAVOR:
//   • DAR: a gentileza de sempre (mesmo custo, recarga e opinião) + uma conversa escolhida pela personalidade
//     (elogiar agrada o vaidoso; falar de negócios, o ambicioso; oferecer ajuda deixa o generoso em dívida). Cria
//     (ou reforça) um FAVOR: a pessoa passa a te dever.
//   • PEDIR sem crédito (o "pedir favor" de sempre): ganho na hora, mas agora VOCÊ deve (dívida no livro).
//   • COBRAR: gasta o favor que te devem num pedido (uma boa palavra, informação, empurrão, portas abertas).
//   • RETRIBUIR: quita o que você deve.
//   • QUEIMAR o contato: cobra tudo de uma vez (efeito dobrado), mas vira mágoa, a notícia corre entre os pares,
//     ele fala mal de você e, se guarda um segredo seu, expõe.
// Modo rápido = os botões de sempre (almoço/jantar/presente/pedir favor), intactos. Determinístico: sorteios só em
// Rng.fromSeed(semente|favors27v1|…); estado próprio nenhum (tudo vive em holds17/persona13/secrets23).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { CRITICS } from '../../data/content';
import { emitFact } from '../facts17';
import { allHolds, canUse, grantHold, holds17, registerHoldEffect, useHold, voidHolds, type Hold, type HoldKind } from '../holds17';
import type { GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { cashWhy20, freeCash20 } from '../oblig20';
import { addHype } from './hype12';
import { lunch, lunchBlock, mgrKey, repOf } from './managers14';
import { askFavor, favorBlock, giftBlock, opine, opinionOf, per13, sendGift } from './persona13';
import { careerLoyalty, careerOf } from './people/staff';
import { dinner, dinnerBlock, p15, prodKey } from './producers15';
import { know23, knownAbout23, raise23, secretsOf23 } from './secrets23';
import { addStaffLoyalty } from '../opinion';

export const FAVORS27_RNG = 'favors27v1';
export type CKind27 = 'manager' | 'producer' | 'critic' | 'leader' | 'staff' | 'person' | 'act' | 'label' | 'other';
export type Gesture27 = 'lunch' | 'dinner' | 'gift';
export type Talk27 = 'flatter' | 'business' | 'help';
export type Ask27 = 'word' | 'intel' | 'push' | 'door';
export interface Contact27 {
  key: string; hid: string; name: string; kind: CKind27; op: number;
  vanity?: number; generosity?: number; ambition?: number;
  /** o que te devem, o que você deve, mágoas, segredos que você tem sobre ele e que ele tem sobre você */
  owesMe: Hold[]; iOwe: Hold[]; grudges: Hold[]; dirt: Hold[]; dirtOnMe: Hold[];
  /** segredos (secrets23) que você conhece sobre ele, nível ≥ boato */
  know: number;
  /** links23 L2: equipe insatisfeita vaza segredos */
  leak?: boolean;
  gestures: Gesture27[];
}
export interface String27 { from: string; to: string; kind: HoldKind; strength: number; text: L; id: string }

const CREDIT: HoldKind[] = ['favor', 'debt', 'promise', 'loyalty'];
const norm = (k: string) => (k.startsWith('p:') ? k.slice(2) : k);
const keyOfId = (s: GameState, id: string): string => (s.persons[id] ? `p:${id}` : id);
function kindOf(s: GameState, key: string): CKind27 {
  if (key.startsWith('e:')) return 'manager';
  if (key.startsWith('pd:')) return 'producer';
  if (key.startsWith('c:')) return 'critic';
  if (key.startsWith('l:')) return 'leader';
  if (key.startsWith('s:')) return 'staff';
  if (key.startsWith('p:')) return 'person';
  if (s.acts[key]) return 'act';
  if (s.labels[key]) return 'label';
  return 'other';
}
function nameOf(s: GameState, key: string): string {
  if (s.acts[key]) return s.acts[key].name;
  if (s.labels[key]) return s.labels[key].name;
  try { return per13(s, key)?.name ?? key; } catch { return key; }
}

// ---------------------------------------------------------------- o quadro

/** Contatos do quadro (no máx. `max`): quem tem obrigação com você, quem você já agradou, seus empresários e
 *  produtores, os críticos da época e a equipe (quem está insatisfeito aparece com o alerta de vazamento). */
export function contacts27(s: GameState, max = 12): Contact27[] {
  const keys = new Map<string, number>();
  const bump = (k: string, v: number) => { if (k && k !== 'player' && !k.startsWith('w:')) keys.set(k, (keys.get(k) ?? 0) + v); };
  const all = allHolds(s);
  for (const h of all) {
    if (h.holder === 'player') bump(keyOfId(s, h.target), 40 + h.strength / 4);
    else if (h.target === 'player') bump(keyOfId(s, h.holder), 40 + h.strength / 4);
  }
  for (const id of playerActs(s)) { const m = repOf(s, id); if (m) bump(mgrKey(m.id), 30); }
  for (const id of Object.keys(p15(s).credits)) bump(prodKey(id), 12);
  for (const [k, o] of Object.entries((s.x4 as unknown as { persona13?: { op: Record<string, { v: number }> } }).persona13?.op ?? {})) bump(k, 8 + Math.abs(o.v) / 3);
  const cr = (CRITICS as unknown as { name: string; start?: number; end?: number; from?: number; to?: number }[]).filter((c) => (c.start ?? c.from ?? 0) <= s.year && s.year <= (c.end ?? c.to ?? 9999)).slice(0, 2);
  for (const c of cr) bump(`c:${c.name}`, 6);
  for (const st of s.player.staff) { const loy = careerLoyalty(s, st); bump(`s:${st.id}`, loy < 35 ? 25 : 3); }
  const out: Contact27[] = [];
  for (const [key] of [...keys.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) {
    if (out.length >= max) break;
    const c = contact27(s, key, all);
    if (c) out.push(c);
  }
  return out;
}

export function contact27(s: GameState, key: string, all: Hold[] = allHolds(s)): Contact27 | null {
  const hid = norm(key);
  const kind = kindOf(s, key);
  if (kind === 'person' && (!s.persons[hid] || s.persons[hid].isPlayer)) return null;
  if (kind === 'staff' && !s.player.staff.some((x) => `s:${x.id}` === key)) return null;
  const P = kind === 'act' || kind === 'label' || kind === 'other' ? null : (() => { try { return per13(s, key); } catch { return null; } })();
  const name = nameOf(s, key);
  if (!name) return null;
  const mine = (h: Hold) => h.holder === 'player' && h.target === hid;
  const theirs = (h: Hold) => h.holder === hid && h.target === 'player';
  const sm = kind === 'staff' ? s.player.staff.find((x) => `s:${x.id}` === key) : undefined;
  const gestures: Gesture27[] = [];
  if (kind === 'manager') gestures.push('lunch');
  if (kind === 'producer') gestures.push('dinner');
  if (P) gestures.push('gift');
  const subj = kind === 'person' ? `p:${hid}` : kind === 'act' ? `a:${hid}` : kind === 'label' ? `lb:${hid}` : kind === 'staff' ? key : '';
  return {
    key, hid, name, kind, op: P ? opinionOf(s, key) : 0,
    ...(P ? { vanity: P.facets.vaidade, generosity: P.facets.generosidade, ambition: P.facets.ambicao } : {}),
    owesMe: all.filter((h) => mine(h) && CREDIT.includes(h.kind)), iOwe: all.filter((h) => theirs(h) && CREDIT.includes(h.kind)),
    grudges: all.filter((h) => theirs(h) && h.kind === 'grievance'), dirt: all.filter((h) => mine(h) && (h.kind === 'secret' || h.kind === 'blackmail')),
    dirtOnMe: all.filter((h) => theirs(h) && (h.kind === 'secret' || h.kind === 'blackmail')),
    know: subj ? knownAbout23(s, subj).filter((x) => x.k.p >= 2).length : 0,
    ...(sm && careerLoyalty(s, sm) < 35 ? { leak: true } : {}),
    gestures,
  };
}

/** Barbantes: você ↔ contatos e, entre contatos do quadro, as obrigações deles entre si. */
export function strings27(s: GameState, cs: Contact27[]): String27[] {
  const on = new Map(cs.map((c) => [c.hid, c.key]));
  const out: String27[] = [];
  for (const h of allHolds(s)) {
    const a = h.holder === 'player' ? 'player' : on.get(h.holder);
    const b = h.target === 'player' ? 'player' : on.get(h.target);
    if (!a || !b || a === b) continue;
    out.push({ from: a, to: b, kind: h.kind, strength: h.strength, text: h.text, id: h.id });
  }
  return out;
}

// ---------------------------------------------------------------- dar (almoço/jantar/presente + conversa)

/** Quanto a conversa combina com a pessoa (−1..+1). */
export function talkFit27(c: Pick<Contact27, 'vanity' | 'generosity' | 'ambition'>, talk: Talk27): number {
  const f = talk === 'flatter' ? c.vanity : talk === 'business' ? c.ambition : c.generosity;
  return f === undefined ? 0 : clamp((f - 50) / 50, -1, 1);
}
export function giveBlock27(s: GameState, key: string, g: Gesture27): L | null {
  if (g === 'lunch') return key.startsWith('e:') ? lunchBlock(s, key.slice(2)) : l('Almoço é com empresário.', 'Lunch is for managers.');
  if (g === 'dinner') return key.startsWith('pd:') ? dinnerBlock(s, key.slice(3)) : l('Jantar é com produtor.', 'Dinner is for producers.');
  return giftBlock(s, key);
}
/** Dá a gentileza (a de sempre) com uma conversa; a pessoa passa a te dever um favor. */
export function give27(s: GameState, key: string, g: Gesture27, talk: Talk27): { ok: boolean; text: L } {
  const b = giveBlock27(s, key, g);
  if (b) return { ok: false, text: b };
  const c = contact27(s, key);
  if (!c) return { ok: false, text: l('Contato inválido.', 'Invalid contact.') };
  let base: L;
  if (g === 'lunch') { const r = lunch(s, key.slice(2)); if (!r.ok) return r; base = r.text; }
  else if (g === 'dinner') { const r = dinner(s, key.slice(3)); if (!r.ok) return r; base = r.text; }
  else base = sendGift(s, key);
  const fit = talkFit27(c, talk);
  const d = Math.round(4 * fit);
  if (d) opine(s, key, d, d > 0 ? TALK_OK[talk] : TALK_BAD[talk]);
  const strength = Math.round(clamp(28 + 14 * (talk === 'help' ? fit : fit / 2) + ((c.generosity ?? 50) - 50) / 5, 10, 60));
  const h = grantHold(s, { holder: 'player', target: c.hid, kind: 'favor', strength, months: 24, src: 'favors27', ref: 'favors27', quiet: true,
    text: fmtL(l('{n} te deve uma gentileza.', '{n} owes you a kindness.'), { n: c.name }) });
  return { ok: true, text: fmtL(l('{b} Conversa: {t}. {n} agora te deve um favor (força {f}).', '{b} Talk: {t}. {n} now owes you a favor (strength {f}).'), { b: base, t: d > 0 ? l('caiu bem', 'went well') : d < 0 ? l('caiu mal', 'fell flat') : l('neutra', 'neutral'), n: c.name, f: h.strength }) };
}
const TALK_OK: Record<Talk27, L> = { flatter: l('me elogiou (e eu gosto disso).', 'flattered me (and I like that).'), business: l('falou de negócios grandes comigo.', 'talked big business with me.'), help: l('ofereceu ajuda sem pedir nada.', 'offered help without asking anything.') };
const TALK_BAD: Record<Talk27, L> = { flatter: l('veio com bajulação.', 'came at me with flattery.'), business: l('só falou de dinheiro.', 'only talked money.'), help: l('quis me fazer de devedor.', 'tried to make me a debtor.') };

// ---------------------------------------------------------------- pedir sem crédito (o "pedir favor" de sempre)

export const askBlock27 = (s: GameState, key: string): L | null => favorBlock(s, key);
/** O favor de sempre (ganho na hora), mas agora você deve: entra uma dívida no livro. */
export function askNow27(s: GameState, key: string): { ok: boolean; text: L } {
  const b = askBlock27(s, key);
  if (b) return { ok: false, text: b };
  const c = contact27(s, key);
  if (!c) return { ok: false, text: l('Contato inválido.', 'Invalid contact.') };
  const base = askFavor(s, key);
  grantHold(s, { holder: c.hid, target: 'player', kind: 'debt', strength: 35, months: 36, src: 'favors27', ref: 'favors27', quiet: true, text: fmtL(l('Você deve um favor a {n}.', 'You owe {n} a favor.'), { n: c.name }) });
  return { ok: true, text: fmtL(l('{b} Agora você deve um favor a {n}.', '{b} Now you owe {n} a favor.'), { b: base, n: c.name }) };
}

// ---------------------------------------------------------------- cobrar

export const ASK27: Record<Ask27, { name: L; hint: L; best: CKind27[] }> = {
  word: { name: l('Uma boa palavra', 'A good word'), hint: l('Reputação: artística (crítica/imprensa), institucional (líderes) ou com artistas (empresários e músicos).', 'Reputation: artistic (critics/press), institutional (leaders) or with artists (managers and musicians).'), best: ['critic', 'leader'] },
  intel: { name: l('Informação', 'Intel'), hint: l('Ele conta o que sabe: um segredo de um rival sobe um nível no que você sabe.', 'They tell what they know: a rival\'s secret goes up one level in what you know.'), best: ['manager', 'staff', 'person'] },
  push: { name: l('Um empurrão', 'A push'), hint: l('+10 de expectativa para o seu artista mais em evidência (+15 se for do ramo).', '+10 anticipation for your most prominent act (+15 if they are in the trade).'), best: ['producer', 'critic'] },
  door: { name: l('Abrir portas', 'Open doors'), hint: l('Reputação institucional e um contato novo (o empresário indica artistas).', 'Institutional reputation and a new contact (a manager recommends acts).'), best: ['manager', 'leader'] },
};
let CALL: { ask: Ask27; k: number } | null = null;
registerHoldEffect('favors27', (s, h, verb) => (verb === 'call' && CALL ? callFx(s, h, CALL.ask, CALL.k) : null));

function callFx(s: GameState, h: Hold, ask: Ask27, k: number): L {
  const key = keyOfId(s, h.target);
  const kind = kindOf(s, key);
  const best = ASK27[ask].best.includes(kind) ? 1.5 : 1;
  const m = k * best;
  const R = s.player.reputation;
  const name = nameOf(s, key);
  if (ask === 'word') {
    const v = Math.round(2 * m);
    if (kind === 'critic' || kind === 'producer') R.artistic = clamp(R.artistic + v, 0, 100);
    else if (kind === 'leader') R.institutional = clamp(R.institutional + v + 1, 0, 100);
    else R.artists = clamp(R.artists + v, 0, 100);
    return fmtL(l('{n} falou bem de você por aí (+{v} de reputação).', '{n} spoke well of you around town (+{v} reputation).'), { n: name, v });
  }
  if (ask === 'intel') {
    const r = Rng.fromSeed(`${s.config.seed}|${FAVORS27_RNG}|intel|${h.id}|${s.week}`);
    const rivals = Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && !a.playerBand && a.status !== 'retired').sort((a, b) => b.fame - a.fame || (a.id < b.id ? -1 : 1)).slice(0, 12);
    const pool = rivals.flatMap((a) => secretsOf23(s, `a:${a.id}`).concat(a.members.flatMap((p) => secretsOf23(s, `p:${p}`)))).filter((x) => know23(s, x).p < 3);
    if (!pool.length) return fmtL(l('{n} não sabia de nada que você já não soubesse.', '{n} knew nothing you did not already know.'), { n: name });
    const sec = pool[r.int(0, pool.length - 1)];
    const to = Math.min(3, know23(s, sec).p + (m >= 1.5 ? 2 : 1)) as 1 | 2 | 3;
    raise23(s, sec, 'player', to, 'informant', fmtL(l('Contado por {n} (favor cobrado).', 'Told by {n} (favor called in).'), { n: name }));
    return fmtL(l('{n} te contou um segredo do meio (veja Segredos).', '{n} told you an industry secret (see Secrets).'), { n: name });
  }
  if (ask === 'push') {
    const a = playerActs(s).map((id) => s.acts[id]).filter(Boolean).sort((x, y) => (s.pendingReleases.some((p) => p.actId === y.id) ? 50 : 0) + y.fame - ((s.pendingReleases.some((p) => p.actId === x.id) ? 50 : 0) + x.fame) || (x.id < y.id ? -1 : 1))[0];
    if (!a) return l('Você não tem artista para empurrar.', 'You have no act to push.');
    const v = Math.round(10 * m);
    addHype(s, s.pendingReleases.some((p) => p.actId === a.id) ? `n:${a.id}` : `a:${a.id}`, 'favors27', fmtL(l('Empurrão de {n}', 'A push from {n}'), { n: name }), v);
    return fmtL(l('{n} deu um empurrão em {a}: +{v} de expectativa.', '{n} gave {a} a push: +{v} anticipation.'), { n: name, a: a.name, v });
  }
  const v = Math.round(2 * m);
  R.institutional = clamp(R.institutional + v, 0, 100);
  if (kind === 'manager') R.artists = clamp(R.artists + 1, 0, 100);
  return fmtL(l('{n} abriu portas: +{v} de reputação institucional.', '{n} opened doors: +{v} institutional reputation.'), { n: name, v });
}

/** Cobra um favor que te devem (gasta: fraco some, forte só volta em 2 anos). */
export function call27(s: GameState, holdId: string, ask: Ask27): { ok: boolean; text: L } {
  const h = allHolds(s).find((x) => x.id === holdId);
  if (!h || h.holder !== 'player') return { ok: false, text: l('Favor não encontrado.', 'Favor not found.') };
  const why = canUse(s, h, 'call');
  if (why) return { ok: false, text: why };
  const native = h.src === 'favors27';
  CALL = { ask, k: native ? 1 : 0.8 };
  // obrigações de outros sistemas: o efeito padrão do livro + o pedido
  const extra = native ? null : callFx(s, h, ask, 0.8);
  const r = useHold(s, holdId, 'call');
  CALL = null;
  if (!r.ok) return r;
  opine(s, keyOfId(s, h.target), -3, l('cobrou um favor.', 'called in a favor.'));
  return { ok: true, text: extra ? fmtL(l('{a} {b}', '{a} {b}'), { a: r.text, b: extra }) : r.text };
}

// ---------------------------------------------------------------- retribuir

export const repayCost27 = (s: GameState): number => money(s, 800);
export function repay27(s: GameState, holdId: string): { ok: boolean; text: L } {
  const h = holds17(s).h.find((x) => x.id === holdId);
  if (!h || h.target !== 'player' || h.status !== 'open' || !CREDIT.includes(h.kind)) return { ok: false, text: l('Nada a quitar aqui.', 'Nothing to settle here.') };
  const cost = repayCost27(s);
  if (freeCash20(s) < cost) return { ok: false, text: cashWhy20(s, cost, l('Caixa insuficiente.', 'Not enough cash.')) };
  if (!post(s, `favors27repay:${h.id}`, -cost, 'marketing', 'Retribuição de favor')) return { ok: false, text: l('Já feito nesta semana.', 'Already done this week.') };
  h.status = 'used'; h.uses++; h.lastUse = s.week;
  const key = keyOfId(s, h.holder);
  opine(s, key, 4, l('retribuiu o favor que me devia.', 'repaid the favor they owed me.'));
  return { ok: true, text: fmtL(l('Favor retribuído a {n}. Conta zerada.', 'Favor repaid to {n}. Slate clean.'), { n: nameOf(s, key) }) };
}

// ---------------------------------------------------------------- queimar

export interface Burn27 { ok: boolean; text: L; gains: L[]; costs: L[] }
/** Queima o contato: cobra tudo agora (efeito dobrado), mas vira mágoa, os pares ficam sabendo e ele revida. */
export function burn27(s: GameState, key: string, ask: Ask27 = 'word'): Burn27 {
  const c = contact27(s, key);
  if (!c) return { ok: false, text: l('Contato inválido.', 'Invalid contact.'), gains: [], costs: [] };
  const gains: L[] = [], costs: L[] = [];
  const credit = c.owesMe.filter((h) => !canUse(s, h, 'call'));
  if (credit.length) {
    CALL = { ask, k: 2 };
    const h = credit.sort((a, b) => b.strength - a.strength)[0];
    const r = h.src === 'favors27' ? useHold(s, h.id, 'call') : { ok: true, text: callFx(s, h, ask, 2) };
    CALL = null;
    if (r.ok) gains.push(r.text);
  }
  voidHolds(s, (h) => h.holder === 'player' && h.target === c.hid && CREDIT.includes(h.kind));
  opine(s, key, -35, l('me usou e me descartou.', 'used me and threw me away.'));
  costs.push(fmtL(l('{n} agora te odeia (opinião −35 ponderada pela personalidade).', '{n} now hates you (opinion −35 weighted by personality).'), { n: c.name }));
  grantHold(s, { holder: c.hid, target: 'player', kind: 'grievance', strength: 60, months: 60, src: 'favors27', ref: 'burn', quiet: true, text: fmtL(l('{n} não esquece como foi descartado.', '{n} will not forget being discarded.'), { n: c.name }) });
  // a notícia corre entre os pares do mesmo ramo
  let peers = 0;
  for (const o of contacts27(s, 20)) if (o.key !== key && o.kind === c.kind && o.kind !== 'other') { opine(s, o.key, -4, fmtL(l('soube como tratou {n}.', 'heard how they treated {n}.'), { n: c.name })); peers++; }
  if (peers) costs.push(fmtL(l('{p} colega(s) do ramo ficaram sabendo (−4).', '{p} peer(s) in the trade heard about it (−4).'), { p: peers }));
  emitFact(s, { kind: 'statement', actors: [c.hid, 'player'], severity: 25, visibility: 'rumor', tags: ['rumor', 'favors27', 'burn'], src: 'favors27', text: fmtL(l('{n} fala mal de {c} pelos bastidores.', '{n} badmouths {c} behind the scenes.'), { n: c.name, c: s.config.companyName }) });
  costs.push(l('Corre um boato contra o selo.', 'A rumor against the label is going around.'));
  if (c.kind === 'staff') { const sm = s.player.staff.find((x) => `s:${x.id}` === key); if (sm) { careerOf(s, sm); addStaffLoyalty(s, sm.id, -20, { why: l('você queimou a relação.', 'you burned the relationship.') }); costs.push(l('Lealdade da pessoa despenca (e equipe insatisfeita vaza segredos).', 'Their loyalty plummets (and unhappy staff leak secrets).')); } }
  for (const h of c.dirtOnMe) { const r = useHold(s, h.id, 'expose'); if (r.ok) costs.push(r.text); }
  return { ok: true, text: fmtL(l('Você queimou {n}.', 'You burned {n}.'), { n: c.name }), gains, costs };
}

/** Segredos que você tem sobre alguém (holds17): chantagear ou expor — os verbos de sempre do livro. */
export const useDirt27 = (s: GameState, holdId: string, verb: 'blackmail' | 'expose') => useHold(s, holdId, verb);
