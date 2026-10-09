// Dilemas pessoais (rodada 9): escolhas reais na área Você. Cada dilema tem 2 a 4 opções com custos
// visíveis (dinheiro pessoal, tempo livre) e efeitos em saúde, estresse, relação, reputação e dinheiro.
// Algumas opções exigem atributos/dinheiro; várias deixam consequências para meses depois.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, notify, remember } from '../util';
import { ownerOf } from './people/owner';
import { energyLeft, life, spendEnergy } from './life';

export interface Effects { health?: number; stress?: number; love?: number; rep?: number; cash?: number; wealth?: number }
export interface DilemmaOption {
  id: string;
  label: L;
  note: L;
  /** dinheiro pessoal */
  cost?: number;
  energy?: number;
  fx: Effects;
  /** requisito (devolve o motivo do bloqueio) */
  gate?: (s: GameState) => L | null;
  /** consequência atrasada */
  later?: { months: number; text: L; fx: Effects; chance?: number };
}
export interface Dilemma { id: string; name: L; desc: L; opts: DilemmaOption[]; coolMonths: number }
export interface DilemmaState { done: Record<string, number>; pending: { due: number; text: L; fx: Effects; chance: number }[]; log: { m: number; text: L }[] }

const fresh = (): DilemmaState => ({ done: {}, pending: [], log: [] });
declare module '../ext4' { interface Ext4 { dilemmas9: DilemmaState } }
registerExt4('dilemmas9', fresh);
export function dilemmas(s: GameState): DilemmaState {
  const x = s.x4 as unknown as { dilemmas9?: DilemmaState };
  x.dilemmas9 ??= fresh();
  x.dilemmas9.pending ??= [];
  x.dilemmas9.done ??= {};
  x.dilemmas9.log ??= [];
  return x.dilemmas9;
}

const mk = (s: GameState) => s.year * 12 + s.month;
const needAttr = (a: 'charisma' | 'negotiation' | 'management' | 'ear', n: number) => (s: GameState): L | null =>
  ownerOf(s).attrs[a] >= n ? null : l(`Exige ${a} ${n}+.`, `Requires ${a} ${n}+.`);
const needPartner = (s: GameState): L | null => (life(s).partner ? null : l('Exige um(a) parceiro(a).', 'Requires a partner.'));

export const DILEMMAS: Dilemma[] = [
  { id: 'burnout', name: l('Exaustão', 'Burnout'), desc: l('Meses de estrada e planilha cobram a conta. O corpo avisou.', 'Months of road and spreadsheets are collecting. Your body warned you.'), coolMonths: 12, opts: [
    { id: 'rest', label: l('Tirar duas semanas de folga', 'Take two weeks off'), note: l('Sem dinheiro, mas custa tempo agora; a imprensa nota sua ausência.', 'Free, but costs time now; press notices your absence.'), energy: 2, fx: { health: 12, stress: -25, rep: -1 } },
    { id: 'clinic', label: l('Clínica de repouso', 'Rest clinic'), note: l('Caro, mas resolve de vez e a saúde fica melhor.', 'Pricey, but it fixes it for good and your health improves.'), cost: 6000, energy: 1, fx: { health: 20, stress: -35 } },
    { id: 'push', label: l('Continuar a toda', 'Keep pushing'), note: l('Ganha dinheiro agora; a conta chega em 2 meses.', 'Earn now; the bill arrives in 2 months.'), fx: { cash: 4000, stress: 10 }, later: { months: 2, text: l('O corpo cobrou: você desabou no estúdio.', 'Your body collected: you collapsed in the studio.'), fx: { health: -18, stress: 15, rep: -2 }, chance: 0.8 } },
  ] },
  { id: 'old_friend', name: l('Velho amigo pede ajuda', 'An old friend asks for help'), desc: l('Do tempo da primeira banda, ele está quebrado e pede um empréstimo e uma vaga.', 'From the first-band days, he is broke and asks for a loan and a job.'), coolMonths: 18, opts: [
    { id: 'loan', label: l('Emprestar dinheiro', 'Lend money'), note: l('Sai do seu bolso; talvez volte.', 'Out of your pocket; may come back.'), cost: 3000, fx: { rep: 1, stress: -3 }, later: { months: 5, text: l('O amigo devolveu o empréstimo com juros e uma música de presente.', 'The friend paid you back with interest and a song as a gift.'), fx: { wealth: 4500, rep: 1 }, chance: 0.55 } },
    { id: 'job', label: l('Dar um emprego no selo', 'Give him a label job'), note: l('Custa tempo para treinar; ele pode ser leal ou um problema.', 'Takes time to train; he may be loyal or a problem.'), energy: 1, fx: { stress: 3 }, later: { months: 3, text: l('O amigo virou peça-chave da equipe.', 'The friend became a key team member.'), fx: { cash: 2500, stress: -4 }, chance: 0.5 } },
    { id: 'refuse', label: l('Recusar com firmeza', 'Refuse firmly'), note: l('Poupa dinheiro e energia; deixa uma ferida na cena.', 'Saves money and energy; leaves a wound on the scene.'), fx: { rep: -2, stress: 4 }, later: { months: 4, text: l('O amigo falou mal de você numa entrevista.', 'The friend badmouthed you in an interview.'), fx: { rep: -3 }, chance: 0.45 } },
  ] },
  { id: 'partner_trip', name: l('Aniversário de namoro', 'Relationship anniversary'), desc: l('A data chegou no meio da agenda mais cheia do ano.', 'The date landed in the busiest stretch of your year.'), coolMonths: 12, opts: [
    { id: 'trip', label: l('Viagem a dois', 'Trip for two'), note: l('Caro e toma tempo; a relação sobe muito.', 'Pricey and time-consuming; the bond grows a lot.'), cost: 5000, energy: 2, fx: { love: 16, stress: -12 }, gate: needPartner },
    { id: 'dinner', label: l('Jantar em casa', 'Dinner at home'), note: l('Barato e rápido; relação melhora um pouco.', 'Cheap and quick; the bond improves a little.'), cost: 300, energy: 1, fx: { love: 6, stress: -4 }, gate: needPartner },
    { id: 'skip', label: l('Adiar para depois da turnê', 'Postpone until after the tour'), note: l('Foco no trabalho; ressentimento depois.', 'Work first; resentment later.'), fx: { cash: 2000, love: -4 }, gate: needPartner, later: { months: 2, text: l('Seu parceiro lembrou da data esquecida, e não esqueceu mais.', 'Your partner remembered the missed date, and has not let go.'), fx: { love: -8, stress: 6 }, chance: 0.7 } },
  ] },
  { id: 'scandal_offer', name: l('Tabloide quer uma história', 'A tabloid wants a story'), desc: l('Um repórter oferece pagar por um relato íntimo da sua vida.', 'A reporter offers to pay for an intimate account of your life.'), coolMonths: 24, opts: [
    { id: 'sell', label: l('Vender a entrevista', 'Sell the interview'), note: l('Dinheiro rápido, fama boa e má.', 'Quick money, fame good and bad.'), fx: { wealth: 7000, rep: -4, stress: 5 }, later: { months: 1, text: l('A manchete foi pior que o combinado.', 'The headline was worse than agreed.'), fx: { rep: -3, love: -5 }, chance: 0.5 } },
    { id: 'charm', label: l('Dar uma entrevista controlada', 'Give a controlled interview'), note: l('Exige carisma 50+; melhora a imagem sem custo.', 'Requires charisma 50+; improves your image at no cost.'), energy: 1, fx: { rep: 3 }, gate: needAttr('charisma', 50) },
    { id: 'lawyer', label: l('Mandar o advogado', 'Send the lawyer'), note: l('Caro, mas a história morre.', 'Pricey, but the story dies.'), cost: 4000, fx: { stress: -2 } },
  ] },
  { id: 'sleepless', name: l('Convite para a festa da madrugada', 'Invite to the all-night party'), desc: l('Todo mundo da cena estará lá. Amanhã tem estúdio cedo.', 'Everyone from the scene will be there. Studio call is early tomorrow.'), coolMonths: 6, opts: [
    { id: 'go', label: l('Ir e ficar até o fim', 'Go and stay to the end'), note: l('Contatos e fama; a saúde sente.', 'Contacts and fame; your health feels it.'), energy: 1, cost: 400, fx: { rep: 2, health: -5, stress: -6 } },
    { id: 'brief', label: l('Passar só uma hora', 'Drop by for an hour'), note: l('Equilíbrio: um pouco de cada.', 'Balance: a bit of each.'), fx: { rep: 1, stress: -2 } },
    { id: 'home', label: l('Ficar em casa', 'Stay in'), note: l('Descansa e rende no estúdio.', 'You rest and perform in the studio.'), fx: { health: 3, stress: -3, rep: -1 } },
  ] },
];

export function dilemmaBlocker(s: GameState, d: Dilemma): L | null {
  const t0 = dilemmas(s).done[d.id];
  if (t0 !== undefined && mk(s) - t0 < d.coolMonths) return fmtL(l('Volta em {n} meses.', 'Returns in {n} months.'), { n: d.coolMonths - (mk(s) - t0) });
  return null;
}
export function optionBlocker(s: GameState, o: DilemmaOption): L | null {
  const g = o.gate?.(s);
  if (g) return g;
  if (o.cost && ownerOf(s).wealth < o.cost) return l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.');
  if (o.energy && energyLeft(s) < o.energy) return l('Sem tempo livre suficiente.', 'Not enough free time.');
  return null;
}

export function applyFx(s: GameState, fx: Effects): void {
  const o = ownerOf(s);
  if (fx.health) o.health = clamp(o.health + fx.health, 0, 100);
  if (fx.stress) o.stress = clamp(o.stress + fx.stress, 0, 100);
  if (fx.wealth) o.wealth += fx.wealth;
  if (fx.cash) s.player.cash += fx.cash;
  if (fx.rep) s.player.reputation.artists = clamp(s.player.reputation.artists + fx.rep, 0, 100);
  if (fx.love) { const p = life(s).partner; if (p) p.affinity = clamp(p.affinity + fx.love, 0, 100); }
}

export function takeDilemma(s: GameState, id: string, optId: string): L | null {
  const d = DILEMMAS.find((x) => x.id === id);
  const o = d?.opts.find((x) => x.id === optId);
  if (!d || !o) return l('Dilema desconhecido.', 'Unknown dilemma.');
  const e = dilemmaBlocker(s, d) ?? optionBlocker(s, o);
  if (e) return e;
  if (o.energy) spendEnergy(s, o.energy);
  if (o.cost) ownerOf(s).wealth -= o.cost;
  applyFx(s, o.fx);
  const st = dilemmas(s);
  st.done[d.id] = mk(s);
  if (o.later) st.pending.push({ due: mk(s) + o.later.months, text: o.later.text, fx: o.later.fx, chance: o.later.chance ?? 1 });
  remember(s, 'decision', fmtL(l('{d}: {o}.', '{d}: {o}.'), { d: d.name, o: o.label }), { important: false });
  return null;
}

registerSimHook('month', 'dilemmas9', (s, r) => {
  const st = dilemmas(s);
  const now = mk(s);
  const keep: DilemmaState['pending'] = [];
  for (const p of st.pending) {
    if (p.due > now) { keep.push(p); continue; }
    if (r.chance(p.chance)) { applyFx(s, p.fx); notify(s, p.text, 'event'); st.log.unshift({ m: now, text: p.text }); }
  }
  st.pending = keep;
  st.log.length = Math.min(st.log.length, 12);
});
