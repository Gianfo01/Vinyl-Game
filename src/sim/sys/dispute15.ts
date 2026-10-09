// Rodada 15 — Disputas de contrato: artista com pouca confiança (ou empresário tubarão) não some em
// silêncio — pede auditoria de royalties, entra em greve de estúdio ou ataca o selo na imprensa.
// Cada caso vira decisão com custo, chance e efeito explicados: acordo, abrir os livros, tribunal
// (Jurídico na equipe ajuda; nas décadas de contabilidade "criativa" os livros raramente estão limpos),
// ceder royalties, esperar a greve ou liberar o artista. O histórico pesa na reputação com artistas.

import { toReal } from '../../core/money';
import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { endContract, raiseRoyalty } from '../contracts';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { mgrKey, mgrName, repOf } from './managers14';
import { opine } from './persona13';

export interface Case15 { y: number; m: number; act: string; kind: 'audit' | 'strike' | 'press'; out: string; t: L }
export interface Dispute15 { cd: Record<string, number>; cases: Case15[]; won: number; lost: number; settled: number }
declare module '../ext4' { interface Ext4 { dispute15: Dispute15 } }
const fresh = (): Dispute15 => ({ cd: {}, cases: [], won: 0, lost: 0, settled: 0 });
registerExt4('dispute15', fresh);
export function dp15(s: GameState): Dispute15 {
  const x = s.x4 as unknown as { dispute15?: Dispute15 };
  const st = (x.dispute15 ??= fresh());
  st.cd ??= {}; st.cases ??= [];
  return st;
}

/** Força do seu jurídico (0..1): melhor advogado da equipe. */
export const legal15 = (s: GameState): number => s.player.staff.filter((x) => x.role === 'legal').reduce((t, x) => Math.max(t, x.skill), 0) / 100;
/** Livros limpos? Contabilidade antiga era opaca; Administração e Gestor de direitos ajudam. */
export function cleanBooks(s: GameState): { p: number; why: L[] } {
  const why: L[] = [];
  let p = 0.5;
  if (s.year < 1980) { p -= 0.15; why.push(l('Contabilidade da época é opaca (−15%)', 'Accounting of the era is murky (−15%)')); }
  if (s.player.staff.some((x) => x.role === 'admin')) { p += 0.12; why.push(l('Administração organizada (+12%)', 'Organised administration (+12%)')); }
  if (s.player.staff.some((x) => x.role === 'rights')) { p += 0.12; why.push(l('Gestor de direitos registra tudo (+12%)', 'Rights manager logs everything (+12%)')); }
  return { p: clamp(p, 0.1, 0.9), why };
}
export const courtOdds = (s: GameState): number => clamp(0.35 + legal15(s) * 0.4 + (dp15(s).won - dp15(s).lost) * 0.03, 0.15, 0.85);

/** Quanto o artista diz que deixou de receber (dólares reais): parte da receita recente dos discos dele. */
export function claimOf(s: GameState, a: Act): number {
  const rev = a.releases.map((id) => s.releases[id]).filter((r) => r && r.owner === 'player' && s.year - r.year <= 3).reduce((t, r) => t + r.revenue, 0);
  return Math.max(2500, Math.round(toReal(rev, s.year) * 0.08 / 100) * 100);
}

const pushCase = (s: GameState, c: Omit<Case15, 'y' | 'm'>) => { const st = dp15(s); st.cases.unshift({ y: s.year, m: s.month, ...c }); if (st.cases.length > 20) st.cases.length = 20; };
const A = (s: GameState, c: Record<string, string | number>) => s.acts[String(c.act)];
const rep = (s: GameState, k: 'artists' | 'institutional' | 'commercial', d: number) => { s.player.reputation[k] = clamp(s.player.reputation[k] + d, 0, 100); };
const mgrOp = (s: GameState, c: Record<string, string | number>, d: number, why: L) => { if (c.mk) opine(s, String(c.mk), d, why); };
const pay = (s: GameState, key: string, real: number, memo: string) => post(s, key, -money(s, real), 'legal', memo);
const rr = (s: GameState, c: Record<string, string | number>, k: string) => Rng.fromSeed(`${s.config.seed}:dispute15:${c.act}:${c.w}:${k}`);

export function disputeMonth15(s: GameState): void {
  const st = dp15(s);
  if (s.decisions.some((d) => d.eventId.startsWith('dsp15_'))) return;
  const r = Rng.fromSeed(`${s.config.seed}:dispute15:${s.year}:${s.month}`);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    const c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || a.playerBand || !c || c.party !== 'player' || (st.cd[id] ?? 0) > s.week) continue;
    const m = repOf(s, id);
    const shark = m && (m.style === 'shark' || m.style === 'muscle');
    if (a.trust >= (shark ? 38 : 28)) continue;
    if (!r.chance(0.06 + (shark ? 0.05 : 0) + (28 - Math.min(28, a.trust)) / 300)) continue;
    st.cd[id] = s.week + 78;
    const kind = a.fame >= 45 && r.chance(0.35) ? 'dsp15_press' : r.chance(s.year < 1985 ? 0.6 : 0.45) ? 'dsp15_audit' : 'dsp15_strike';
    const lead = m ? mgrName(s, m) : a.name;
    emitEvent(s, r, kind, { act: id, w: s.week, fee: claimOf(s, a), lead, mk: m ? mgrKey(m.id) : '', clean: Math.round(cleanBooks(s).p * 100), court: Math.round(courtOdds(s) * 100) });
    return;
  }
}

deferEvents<EventDef>([
  {
    id: 'dsp15_audit', cat: 'contract', tone: 'bad', tags: [], cooldown: 2, forcedOnly: true,
    title: l('{act} pede auditoria de royalties', '{act} demands a royalty audit'),
    text: l('{lead} chegou com um contador: diz que {act} deixou de receber {feeTxt} e ameaça processar. Seus livros têm {clean}% de chance de estar limpos; no tribunal, suas chances são de {court}%.', '{lead} arrived with an accountant: claims {act} is owed {feeTxt} and threatens to sue. Your books have a {clean}% chance of being clean; in court your odds are {court}%.'),
    options: [
      { id: 'books', label: l('Abrir os livros', 'Open the books'), hint: l('Limpos: só custas (10%), imagem institucional +2, confiança −4. Sujos: paga tudo +20% e a reputação cai.', 'Clean: only costs (10%), institutional rep +2, trust −4. Dirty: pay it all +20% and reputation drops.'),
        apply: (s, _r, c) => {
          const a = A(s, c); if (!a) return;
          const ok = rr(s, c, 'books').chance(cleanBooks(s).p);
          const v = Math.round(Number(c.fee) * (ok ? 0.1 : 1.2));
          pay(s, `dsp15:${c.w}`, v, `Auditoria ${a.name}`);
          if (ok) { a.trust = clamp(a.trust - 4, 0, 100); rep(s, 'institutional', 2); } else { a.cash += money(s, Number(c.fee)); a.trust = clamp(a.trust + 4, 0, 100); rep(s, 'artists', -3); rep(s, 'institutional', -4); }
          const t = ok ? fmtL(l('Auditoria de {a}: livros limpos. A cobrança cai; o artista engole o orgulho.', '{a} audit: books clean. The claim collapses; the artist swallows their pride.'), { a: a.name }) : fmtL(l('Auditoria de {a}: os livros tinham "erros". O selo paga tudo e a história corre a indústria.', '{a} audit: the books had "errors". The label pays in full and the story spreads through the industry.'), { a: a.name });
          notify(s, t, ok ? 'good' : 'bad'); pushCase(s, { act: a.id, kind: 'audit', out: ok ? 'clean' : 'dirty', t });
          if (!ok) remember(s, 'dispute15', t, { actId: a.id, important: true });
        } },
      { id: 'court', label: l('Ir ao tribunal', 'Go to court'), hint: l('Custas de 25%. Vitória: não paga nada, mas o artista quer sair. Derrota: paga 160% e artistas desconfiam do selo. Jurídico na equipe melhora as chances.', '25% in costs. Win: pay nothing, but the act wants out. Loss: pay 160% and artists distrust the label. Legal staff improves the odds.'),
        apply: (s, _r, c) => {
          const a = A(s, c); if (!a) return;
          const st = dp15(s), win = rr(s, c, 'court').chance(courtOdds(s));
          pay(s, `dsp15c:${c.w}`, Math.round(Number(c.fee) * (win ? 0.25 : 1.85)), `Processo ${a.name}`);
          if (win) { st.won++; a.trust = clamp(a.trust - 20, 0, 100); s.flags[`leaving:${a.id}`] = 1; rep(s, 'institutional', 2); } else { st.lost++; a.cash += money(s, Math.round(Number(c.fee) * 1.6)); rep(s, 'artists', -6); }
          mgrOp(s, c, win ? -15 : -5, l('me arrastou para o tribunal.', 'dragged me into court.'));
          const t = win ? fmtL(l('Tribunal: o selo vence {a}. Precedente útil, mas a relação acabou.', 'Court: the label beats {a}. Useful precedent, but the relationship is over.'), { a: a.name }) : fmtL(l('Tribunal: {a} vence o selo. A indústria toda comenta.', 'Court: {a} beats the label. The whole industry talks.'), { a: a.name });
          notify(s, t, win ? 'info' : 'bad'); pushCase(s, { act: a.id, kind: 'audit', out: win ? 'won' : 'lost', t }); remember(s, 'dispute15', t, { actId: a.id, important: true });
        } },
      { id: 'settle', label: l('Acordo: pagar 70%', 'Settle: pay 70%'), hint: l('Certo e rápido. Confiança +10; reputação com artistas +1.', 'Sure and quick. Trust +10; artist reputation +1.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; const v = Math.round(Number(c.fee) * 0.7); pay(s, `dsp15:${c.w}`, v, `Acordo de royalties ${a.name}`); a.cash += money(s, v); a.trust = clamp(a.trust + 10, 0, 100); rep(s, 'artists', 1); dp15(s).settled++; mgrOp(s, c, 5, l('fez acordo justo com meu cliente.', 'settled fairly with my client.')); pushCase(s, { act: a.id, kind: 'audit', out: 'settle', t: l('Acordo de 70% da cobrança', 'Settled at 70% of the claim') }); } },
    ],
  },
  {
    id: 'dsp15_strike', cat: 'contract', tone: 'bad', tags: [], cooldown: 2, forcedOnly: true,
    title: l('{act} entra em greve de estúdio', '{act} goes on a studio strike'),
    text: l('{lead} avisa: {act} não grava nem divulga nada até o contrato melhorar.', '{lead} warns: {act} will not record or promote anything until the deal improves.'),
    options: [
      { id: 'raise', label: l('Ceder: royalty +3 pontos', 'Give in: royalty +3 points'), hint: l('Você ganha menos em cada venda até o fim do contrato; confiança volta (+12).', 'You earn less on every sale until the deal ends; trust returns (+12).'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; raiseRoyalty(s, a.id, 0.03); a.trust = clamp(a.trust + 8, 0, 100); dp15(s).settled++; mgrOp(s, c, 6, l('melhorou o contrato do meu cliente.', 'improved my client\'s deal.')); pushCase(s, { act: a.id, kind: 'strike', out: 'raise', t: l('Royalty +3 pontos', 'Royalty +3 points') }); } },
      { id: 'free', label: l('Liberar o artista', 'Release the act'), hint: l('Fim do contrato agora; os discos já lançados seguem com você pela ficha de direitos. Reputação com artistas +2.', 'Contract ends now; released records stay with you per the rights sheet. Artist reputation +2.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; endContract(s, a, 'terminated'); rep(s, 'artists', 2); pushCase(s, { act: a.id, kind: 'strike', out: 'free', t: l('Artista liberado', 'Act released') }); } },
      { id: 'wait', label: l('Esperar: contrato é contrato', 'Wait it out: a deal is a deal'), hint: l('3 meses de pausa forçada (momento −25%); confiança −6; se cair abaixo de 15, o artista sai.', '3-month forced pause (momentum −25%); trust −6; below 15, the act leaves.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; a.hiatusUntil = s.week + 13; a.status = 'hiatus'; a.momentum *= 0.75; a.trust = clamp(a.trust - 6, 0, 100); if (a.trust < 15) endContract(s, a, 'left'); pushCase(s, { act: a.id, kind: 'strike', out: 'wait', t: l('Greve de 3 meses', '3-month strike') }); } },
    ],
  },
  {
    id: 'dsp15_press', cat: 'contract', tone: 'bad', tags: [], cooldown: 2, forcedOnly: true,
    title: l('{act} ataca o selo na imprensa', '{act} attacks the label in the press'),
    text: l('Numa entrevista, {act} chama o selo de "agiota" e diz que não vê um centavo. Outros artistas estão lendo.', 'In an interview, {act} calls the label "loan sharks" and says they never see a penny. Other artists are reading.'),
    options: [
      { id: 'meet', label: l('Reunião a portas fechadas + bônus', 'Closed-door meeting + bonus'), hint: l('Paga 30% da cobrança como bônus; confiança +12; a história morre.', 'Pay 30% of the claim as a bonus; trust +12; the story dies.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; const v = Math.round(Number(c.fee) * 0.3); pay(s, `dsp15p:${c.w}`, v, `Bônus de paz ${a.name}`); a.cash += money(s, v); a.trust = clamp(a.trust + 12, 0, 100); pushCase(s, { act: a.id, kind: 'press', out: 'meet', t: l('Paz com bônus', 'Peace with a bonus') }); } },
      { id: 'reply', label: l('Responder com os números', 'Reply with the numbers'), hint: l('Livros limpos: imagem do selo sobe e o artista perde crédito. Sujos: o escândalo dobra.', 'Clean books: the label looks good and the act loses face. Dirty: the scandal doubles.'),
        apply: (s, _r, c) => { const a = A(s, c); if (!a) return; const ok = rr(s, c, 'reply').chance(cleanBooks(s).p); if (ok) { rep(s, 'institutional', 3); if (a.image) a.image.publicImage = clamp(a.image.publicImage - 4, 0, 100); a.trust = clamp(a.trust - 8, 0, 100); } else { rep(s, 'artists', -5); rep(s, 'commercial', -2); } const t = ok ? fmtL(l('Os números do selo convencem: {a} sai menor da briga.', 'The label\'s numbers convince: {a} comes out smaller.'), { a: a.name }) : fmtL(l('Os números do selo não fecham: a briga com {a} vira escândalo.', 'The label\'s numbers do not add up: the fight with {a} becomes a scandal.'), { a: a.name }); notify(s, t, ok ? 'good' : 'bad'); pushCase(s, { act: a.id, kind: 'press', out: ok ? 'clean' : 'dirty', t }); } },
      { id: 'silent', label: l('Silêncio', 'Silence'), hint: l('Reputação com artistas −3; nada muda no contrato.', 'Artist reputation −3; nothing changes in the deal.'),
        apply: (s, _r, c) => { const a = A(s, c); rep(s, 'artists', -3); if (a) pushCase(s, { act: a.id, kind: 'press', out: 'silent', t: l('Silêncio', 'Silence') }); } },
    ],
  },
]);

registerSimHook('month', 'dispute15', (s) => disputeMonth15(s));
