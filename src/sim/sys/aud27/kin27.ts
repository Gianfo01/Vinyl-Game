// Rodada 27 (AUD2) — FILHOS × HERANÇA. heirs8 escolhia o herdeiro pela aptidão e ignorava o caminho e o vínculo
// do kids17: um filho afastado, ou que assinou com a concorrência, herdava como qualquer outro. Agora:
//  • herança (HEIR_KID8 em heirs8): afastado(a) recusa a sucessão (a menos que vocês tenham feito as pazes, vínculo
//    ≥ 60); quem é artista de selo RIVAL só aceita com vínculo ≥ 70 (e entra com peso menor); deserdado(a) fica de
//    fora; quem trabalha no selo ganha peso, e o vínculo pesa sempre ((vínculo − 50) / 4).
//  • escolhas do jogador sobre os filhos: apoiar a carreira (dinheiro, embalo do ato; se o ato é de um rival, o seu
//    elenco torce o nariz), pagar faculdade ou conservatório (uma vez; muda aptidão e caminho), trazer para a empresa
//    (vira herdeiro em formação; a equipe reclama de nepotismo se o filho for menos capaz), deserdar (vínculo
//    despenca, sai da sucessão, o par e o ato do filho no seu selo reagem; vira boato se você é famoso) e fazer as
//    pazes (tempo livre; desfaz o "deserdado").
// Sem sorteios: efeitos fixos (determinístico por construção).

import { clamp } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { registerExt4, registerSimHook } from '../../ext4';
import type { GameState } from '../../types';
import { fmtL, money, playerActs } from '../../util';
import { headline19 } from '../factlink19';
import { HEIR_KID8 } from '../heirs8';
import { kidKey, kidOf } from '../kids17';
import { life, spendEnergy } from '../life';
import { playerFame } from '../love17';
import { ownerOf } from '../people/owner';
import { P } from '../people/state';
import { OFF_AUD27 } from './off';

const N = (pt: string, en: string): L => l(pt, en);

export interface Kin27 { cut?: 1; co?: number; sup?: number; sch?: 'college' | 'conservatory' }
export interface Kin27State { k: Record<string, Kin27> }
declare module '../../ext4' { interface Ext4 { kin27: Kin27State } }
registerExt4('kin27', () => ({ k: {} }));
export function kin27(s: GameState): Kin27State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.kin27 ??= { k: {} }) as Kin27State;
  st.k ??= {};
  return st;
}
const kidAt = (s: GameState, i: number) => ownerOf(s).kids[i];
const kxAt = (s: GameState, i: number) => (life(s).kidsX[i] ??= { edu: 'public', bond: 50 });
const memo = (s: GameState, i: number): Kin27 => { const k = kidAt(s, i); return (kin27(s).k[kidKey(k)] ??= {}); };
/** leitura sem criar registro (bloqueios lidos pela interface) */
const peek = (s: GameState, i: number): Kin27 => kin27(s).k[kidKey(kidAt(s, i))] ?? {};
const hist = (s: GameState, i: number, t: L) => { const x = kidOf(s, kidAt(s, i)); x.hist.unshift([s.year, t]); if (x.hist.length > 12) x.hist.length = 12; };
/** Ato do filho(a) num selo que não é o seu. */
const rivalAct = (s: GameState, i: number) => { const id = life(s).kidsX[i]?.actId; const a = id ? s.acts[id] : undefined; return a && a.owner && a.owner !== 'player' ? a : undefined; };

// ---------------------------------------------------------------- herança

export const HEIR_NOTE27 = {
  rival: N('artista de selo rival', 'artist at a rival label'),
  label: N('trabalha no selo', 'works at the label'),
  low: N('vínculo frágil', 'fragile bond'),
};
/** Como o filho(a) entra na sucessão (também mostrado na ficha). */
export function heirStance27(s: GameState, i: number): { skip?: boolean; d?: number; note?: L; why?: L } {
  const k = kidAt(s, i);
  if (!k) return { skip: true };
  const x = kidOf(s, k), m = kin27(s).k[kidKey(k)] ?? {}, bond = life(s).kidsX[i]?.bond ?? 50;
  if (m.cut) return { skip: true, why: N('deserdado(a)', 'disinherited') };
  if (x.path === 'estranged' && bond < 60) return { skip: true, why: N('afastado(a): recusa a sucessão', 'estranged: refuses to take over') };
  let d = (bond - 50) / 4, note: L | undefined = bond < 35 ? HEIR_NOTE27.low : undefined;
  if (x.path === 'rival' || rivalAct(s, i)) {
    if (bond < 70) return { skip: true, why: N('artista de um selo rival: não assume o seu', 'artist at a rival label: will not take over yours') };
    d -= 8; note = HEIR_NOTE27.rival;
  }
  if (x.path === 'label' || m.co) { d += 12; note = HEIR_NOTE27.label; }
  if (m.sch === 'college') d += 3;
  return { d: Math.round(d * 10) / 10, note };
}
HEIR_KID8.push((s, i) => { if (OFF_AUD27.kin) return null; const h = heirStance27(s, i); return h.skip ? { skip: true } : { d: h.d, note: h.note }; });

// ---------------------------------------------------------------- escolhas do jogador

export const KIN_COST27 = { support: 3000, college: 12000, conservatory: 8000 };
const adult = (s: GameState, i: number, min: number): L | null => { const k = kidAt(s, i); if (!k) return N('Filho(a) não encontrado(a).', 'Child not found.'); return s.year - k.born < min ? fmtL(N('Precisa ter {n} anos ou mais.', 'Must be {n} or older.'), { n: min }) : null; };
const wealthOk = (s: GameState, v: number): L | null => (ownerOf(s).wealth < v ? N('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.') : null);

export function supportBlock27(s: GameState, i: number): L | null {
  const e = adult(s, i, 16); if (e) return e;
  const x = kidOf(s, kidAt(s, i)), kx = kxAt(s, i), m = peek(s, i);
  if (m.cut) return N('Você deserdou este filho(a).', 'You disinherited this child.');
  if (!kx.actId && x.path !== 'music' && x.path !== 'rival') return N('Não tem carreira artística para apoiar.', 'Has no artistic career to support.');
  if (m.sup === s.year) return N('Já apoiou este ano.', 'Already supported this year.');
  return wealthOk(s, money(s, KIN_COST27.support));
}
/** Apoiar a carreira do filho(a): dinheiro do seu bolso, vínculo e embalo; se ele(a) é de um rival, o seu elenco reclama. */
export function supportKidCareer27(s: GameState, i: number): L | null {
  const b = supportBlock27(s, i); if (b) return b;
  const v = money(s, KIN_COST27.support), kx = kxAt(s, i), m = memo(s, i), k = kidAt(s, i);
  ownerOf(s).wealth -= v;
  m.sup = s.year;
  kx.bond = clamp(kx.bond + 10, 0, 100);
  const a = kx.actId ? s.acts[kx.actId] : undefined;
  if (a) { a.momentum = clamp(a.momentum + 6, -100, 100); a.cash += Math.round(v * 0.5); }
  const riv = rivalAct(s, i);
  if (riv) for (const id of playerActs(s)) { const y = s.acts[id]; if (y && !y.playerBand) y.trust = clamp(y.trust - 1, 0, 100); }
  const t = riv ? fmtL(N('Você banca {k}, que grava por {l}: o vínculo cresce; o seu elenco comenta.', 'You back {k}, who records for {l}: the bond grows; your roster talks.'), { k: k.name, l: s.labels[riv.owner!]?.name ?? '—' })
    : fmtL(N('Você apoia a carreira de {k}: o vínculo cresce.', 'You support {k}\'s career: the bond grows.'), { k: k.name });
  hist(s, i, t);
  return null;
}

export function schoolBlock27(s: GameState, i: number): L | null {
  const e = adult(s, i, 17); if (e) return e;
  const k = kidAt(s, i), m = peek(s, i);
  if (s.year - k.born > 25) return N('Já passou da idade da faculdade.', 'Past college age.');
  if (m.sch) return N('Os estudos já foram pagos.', 'Studies already paid for.');
  if (m.cut) return N('Você deserdou este filho(a).', 'You disinherited this child.');
  return null;
}
/** Pagar faculdade (gestão: aptidão +5, pode puxar para o selo) ou conservatório (arte +10, aptidão +6, puxa para a música). */
export function payKidSchool27(s: GameState, i: number, kind: 'college' | 'conservatory'): L | null {
  const b = schoolBlock27(s, i) ?? wealthOk(s, money(s, KIN_COST27[kind])); if (b) return b;
  const k = kidAt(s, i), x = kidOf(s, k), kx = kxAt(s, i), m = memo(s, i);
  ownerOf(s).wealth -= money(s, KIN_COST27[kind]);
  m.sch = kind;
  kx.bond = clamp(kx.bond + 6, 0, 100);
  if (kind === 'college') {
    x.stu = clamp(x.stu + 10, 0, 100); k.aptitude = clamp(k.aptitude + 5, 0, 99);
    if (x.path === 'other' && kx.bond >= 45) x.path = 'label';
  } else {
    x.art = clamp(x.art + 10, 0, 100); k.aptitude = clamp(k.aptitude + 6, 0, 99);
    if (x.path === 'other' && x.art >= 60) x.path = 'music';
  }
  hist(s, i, kind === 'college' ? N('Faculdade paga pela família.', 'College paid for by the family.') : N('Conservatório pago pela família.', 'Conservatory paid for by the family.'));
  return null;
}

export function companyBlock27(s: GameState, i: number): L | null {
  const e = adult(s, i, 18); if (e) return e;
  const x = kidOf(s, kidAt(s, i)), kx = kxAt(s, i), m = peek(s, i);
  if (m.co) return N('Já trabalha no selo.', 'Already works at the label.');
  if (m.cut) return N('Você deserdou este filho(a).', 'You disinherited this child.');
  if (x.path === 'estranged' && kx.bond < 60) return N('Afastado(a): não quer saber do selo.', 'Estranged: wants nothing to do with the label.');
  if (rivalAct(s, i)) return N('Tem contrato com um selo rival.', 'Under contract with a rival label.');
  if (kx.bond < 35) return N('Vínculo baixo demais para aceitar.', 'Bond too low to accept.');
  return null;
}
/** Trazer para a empresa: vira herdeiro(a) em formação (caminho "selo"); a equipe mais capaz reclama de nepotismo. */
export function bringKidIn27(s: GameState, i: number): L | null {
  const b = companyBlock27(s, i); if (b) return b;
  const k = kidAt(s, i), x = kidOf(s, k), kx = kxAt(s, i), m = memo(s, i);
  m.co = s.year; x.path = 'label';
  kx.bond = clamp(kx.bond + 8, 0, 100);
  k.aptitude = clamp(k.aptitude + 3, 0, 99);
  for (const sf of s.player.staff) { const c = P(s).career[sf.id]; if (c) c.loyalty = clamp(c.loyalty + (sf.skill > k.aptitude ? -3 : 1), 0, 100); }
  hist(s, i, N('Começou a trabalhar no selo da família.', 'Started working at the family label.'));
  return null;
}

export function cutBlock27(s: GameState, i: number): L | null {
  const e = adult(s, i, 16); if (e) return e;
  return peek(s, i).cut ? N('Já deserdado(a).', 'Already disinherited.') : null;
}
/** Deserdar: sai da sucessão, vínculo −40, o par e o ato do filho no seu selo reagem; boato se você é famoso(a). */
export function cutOffKid27(s: GameState, i: number): L | null {
  const b = cutBlock27(s, i); if (b) return b;
  const k = kidAt(s, i), x = kidOf(s, k), kx = kxAt(s, i), m = memo(s, i), o = ownerOf(s);
  m.cut = 1; delete m.co;
  kx.bond = clamp(kx.bond - 40, 0, 100);
  if (s.year - k.born >= 18) x.path = 'estranged';
  if (o.heir === `kid:${i}`) o.heir = undefined;
  const pt = life(s).partner;
  if (pt) pt.affinity = clamp(pt.affinity - 12, 0, 100);
  o.stress = clamp(o.stress + 6, 0, 100);
  const a = kx.actId ? s.acts[kx.actId] : undefined;
  if (a && a.owner === 'player') a.trust = clamp(a.trust - 20, 0, 100);
  if (playerFame(s) >= 40) headline19(s, fmtL(N('{o} deserda {k}: a família de {c} vira notícia.', '{o} disinherits {k}: the {c} family makes the news.'), { o: o.name, k: k.name, c: s.config.companyName }), 1);
  hist(s, i, N('Foi deserdado(a).', 'Was disinherited.'));
  return null;
}

export function reconcileBlock27(s: GameState, i: number): L | null {
  const k = kidAt(s, i); if (!k) return N('Filho(a) não encontrado(a).', 'Child not found.');
  const x = kidOf(s, k);
  return peek(s, i).cut || x.path === 'estranged' ? null : N('Não há o que reparar.', 'Nothing to mend.');
}
/** Fazer as pazes: gasta tempo livre; desfaz o "deserdado" e, com vínculo ≥ 60, o afastamento. */
export function reconcileKid27(s: GameState, i: number): L | null {
  const b = reconcileBlock27(s, i); if (b) return b;
  const e = spendEnergy(s, 1); if (e) return e;
  const x = kidOf(s, kidAt(s, i)), kx = kxAt(s, i), m = memo(s, i);
  delete m.cut;
  kx.bond = clamp(kx.bond + 15, 0, 100);
  if (x.path === 'estranged' && kx.bond >= 60) x.path = 'other';
  hist(s, i, N('Pai/mãe e filho(a) fizeram as pazes.', 'Parent and child made peace.'));
  return null;
}

// ---------------------------------------------------------------- ano

registerSimHook('year', 'kin27', (s) => {
  const o = ownerOf(s);
  o.kids.forEach((k, i) => {
    const m = kin27(s).k[kidKey(k)];
    if (!m) return;
    const kx = kxAt(s, i);
    if (m.co) { k.aptitude = clamp(k.aptitude + 2, 0, 99); kx.bond = clamp(kx.bond + (o.stress > 70 ? -3 : 2), 0, 100); }
    if (m.cut) kx.bond = clamp(kx.bond - 5, 0, 100);
  });
});
