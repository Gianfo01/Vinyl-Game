// R31 · onda 2 (V) — MECÂNICAS EM CENA, lote 1 (núcleo, sem DOM).
//
// Negociar, renovar, rescindir, contratar funcionário, demitir, punir e montar formação viram cenas em pixel art com o
// seu personagem e a outra parte presentes. Este arquivo é a FRENTE DO MESMO CÁLCULO (plano: "a cena é a frente do
// mesmo cálculo"): cada cena descreve quem está na sala, o humor de cada um (opinion.ts + o que você sabe dele em
// know.ts), os números-chave e as escolhas — e a decisão chama A MESMA FUNÇÃO do formulário de sempre:
//
//   negociar  → offerNow(defaultOffer) (proposta única)  · a mesa completa continua em act27/negotiate27
//   renovar   → runAction20('contract.renew')              (menu do artista)
//   rescindir → rescind31                                  (sim/r31/rescind31)
//   contratar → hireStaff                                  (Mercado › Profissionais)
//   demitir   → fireStaff                                  (Equipe)
//   punir     → talk(…, 'demand' | 'fine')                 (Pessoas › conversa um a um)
//   formação  → runMemberOption29('mo.join:…')             (oferta a integrante)
//
// Montar o modelo (abrir, olhar, cancelar) NUNCA muda o estado nem consome sorteio; o sorteio acontece só dentro da
// função do jogo chamada por `decideScene31`. A interface (ui/r31/scene31.ts) desenha; testes rodam em Node.
//
//   sceneModel31(s, 'renew', { id: actId })      // quem, humor, números, escolhas (com o motivo do bloqueio)
//   decideScene31(s, 'renew', { id }, 'renew')   // executa (mesmo resultado do formulário)
//   sceneMode31(s, 'renew', { id }, 'key')       // 'scene' ou 'quick' (preferência flow27 + importância)

import { formatMoney } from '../../core/money';
import { l, type L } from '../../data/world';
import { staffRoleById } from '../../data/rules';
import { defaultOffer, evaluateOffer, offerEligible29, offerNow } from '../../sim/contracts';
import { fireStaff, hireSignOn, hireStaffBlock, hireStaff } from '../../sim/economy';
import { know, know3 } from '../../sim/know';
import { loyaltyOf, opinionOf, rel0 } from '../../sim/opinion';
import { lock31, lockOf31, UNLOCK31, type Lock31 } from '../../sim/r31/lock';
import { leaderOf31, myContract31, REACTION31, rescind31, rescindQuote31 } from '../../sim/r31/rescind31';
import { rng19 } from '../../sim/rng19';
import { forecastRenewal } from '../../sim/sys/explain12';
import { freePool } from '../../sim/sys/lineup16';
import { memberOptions29, myBands29, roleName29, runMemberOption29 } from '../../sim/sys/member29';
import { actOf } from '../../sim/sys/people/state';
import { canTalk, fineAmount, talk } from '../../sim/sys/people/talks';
import { per13 } from '../../sim/sys/persona13';
import { playerPerson } from '../../sim/sys/life';
import { familyOf } from '../../data/world';
import { visibleAct } from '../../sim/future';
import type { Act, Appearance, GameState, Person, StaffMember } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { actionRow20, runAction20 } from '../actions20';
import { signLock31 } from './quick31core';

// ---------------------------------------------------------------- tipos

export type SceneKind31 = 'nego' | 'renew' | 'rescind' | 'hire' | 'fire' | 'punish' | 'lineup'
  // onda 4 (W) — lote 2, registrado em scene31w.ts: quadro do lançamento, banco, compra/sociedade, jabá (dar e receber)
  | 'release' | 'bank' | 'buy' | 'jaba' | 'jabain';
/** lote 1 (onda 2, V) */
export const SCENE_KINDS31: SceneKind31[] = ['nego', 'renew', 'rescind', 'hire', 'fire', 'punish', 'lineup'];
/** lote 2 (onda 4, W) */
export const SCENE_KINDS_W31: SceneKind31[] = ['release', 'bank', 'buy', 'jaba', 'jabain'];
export const SCENE_KINDS_ALL31: SceneKind31[] = [...SCENE_KINDS31, ...SCENE_KINDS_W31];
/** Alvo: `id` = ato (nego/renew/rescind/lineup), profissional (hire), funcionário (fire) ou pessoa (punish). */
export interface SceneTarget31 { id: string }
export type Room31 = 'table' | 'office' | 'rehearsal' | 'board' | 'bank' | 'ceo' | 'radio';
export type Tone31 = 'warm' | 'ok' | 'cool' | 'cold' | 'unknown';

/** Humor visível: tom, gesto (ícone + texto curto) e se a leitura é clara (você conhece bem) ou ambígua. */
export interface Mood31 { tone: Tone31; icon: string; label: L; clear: boolean }

export interface Cast31 {
  /** id estável (pessoa, funcionário ou 'you') */
  id: string;
  name: string;
  /** para o boneco (avatarSprite/lookOf) */
  lookId: string;
  look?: Appearance;
  born?: number;
  role?: Person['role'];
  side: 'you' | 'them' | 'watch';
  /** papel na cena ("empresário", "baterista"…) */
  part?: L;
  mood: Mood31;
}
export interface Num31 { label: L; value: string | L; hint?: L; basis?: 'fact' | 'calc' | 'guess' }
export interface Choice31 {
  id: string;
  label: L;
  lock: Lock31 | null;
  cost?: number;
  effect?: L;
  primary?: boolean;
  danger?: boolean;
  /** escolha que só abre outra tela (a mesa completa): não decide aqui */
  opens?: 'nego-table';
  /** W: ajuste que não encerra a cena (cartão no quadro): decide, mostra a reação e continua na sala */
  stay?: boolean;
}
export interface SceneModel31 {
  kind: SceneKind31;
  title: L;
  room: Room31;
  cast: Cast31[];
  nums: Num31[];
  choices: Choice31[];
  /** trava da cena inteira (alvo sumiu, não é seu…) */
  lock: Lock31 | null;
  important: boolean;
  note?: L;
  /** W: cartões no quadro (sala 'board') */
  cards?: number;
}
export interface SceneOut31 { ok: boolean; text: L; tone: 'good' | 'warn' | 'bad'; /** gesto da outra parte depois da decisão */ react?: Mood31 }

interface Spec31 {
  kind: SceneKind31;
  label: L;
  icon: string;
  room: Room31;
  exists: (s: GameState, t: SceneTarget31) => boolean;
  important: (s: GameState, t: SceneTarget31) => boolean;
  build: (s: GameState, t: SceneTarget31) => Omit<SceneModel31, 'kind' | 'room' | 'important' | 'lock'> & { lock?: Lock31 | null };
  decide: (s: GameState, t: SceneTarget31, choice: string) => SceneOut31;
  /** W: alvos possíveis (editor e busca) — as cenas do lote 1 usam o switch de sceneTargets31 */
  targets?: (s: GameState) => { id: string; name: string }[];
}

const REG = new Map<SceneKind31, Spec31>();
const reg = (x: Spec31): void => { REG.set(x.kind, x); };
/** W (onda 4): registro de cenas de outros arquivos (scene31w.ts) — o mesmo registro, sem caminho paralelo. */
export const registerScene31 = (x: Spec31): void => reg(x);
export type SceneSpec31 = Spec31;
export const sceneSpec31 = (k: SceneKind31): Spec31 | undefined => REG.get(k);
export const sceneLabel31 = (k: SceneKind31): L => REG.get(k)?.label ?? l(k, k);
export const sceneIcon31 = (k: SceneKind31): string => REG.get(k)?.icon ?? 'eye';

const N = (pt: string, en: string): L => l(pt, en);
/** Dinheiro pelo formatador do jogo; a tela mostra no idioma atual (W2-REV: antes, sempre en-US). */
const usd = (_s: GameState, c: number): L => l(formatMoney(Math.max(0, c), 'pt-BR'), formatMoney(Math.max(0, c), 'en-US'));
const GONE = (): Lock31 => lock31(N('Não está mais disponível.', 'No longer available.'), UNLOCK31.generic);

// ---------------------------------------------------------------- humor (opinião + o quanto você conhece)

/** Gesto pelo valor de opinião (−100..100). */
export function toneOf31(op: number): Exclude<Tone31, 'unknown'> {
  return op >= 30 ? 'warm' : op >= -10 ? 'ok' : op >= -40 ? 'cool' : 'cold';
}
const GESTURE: Record<Tone31, [string, L]> = {
  warm: ['😊', N('Sorri', 'Smiles')],
  ok: ['🙂', N('Ouve com atenção', 'Listens closely')],
  cool: ['🙅', N('Cruza os braços', 'Crosses their arms')],
  cold: ['😠', N('Fecha a cara', 'Scowls')],
  unknown: ['🤔', N('Difícil de ler', 'Hard to read')],
};
export const mood31 = (tone: Tone31, clear = true, icon?: string, label?: L): Mood31 => ({ tone, icon: icon ?? GESTURE[tone][0], label: label ?? GESTURE[tone][1], clear });

/** Humor de uma pessoa sobre você. A leitura só é clara se você a conhece bem (know.ts); senão, ambígua. */
export function personMood31(s: GameState, pid: string): Mood31 {
  const clear = know3(know(s, pid)) >= 2;
  if (!clear) return mood31('unknown', false);
  const p = s.persons[pid];
  const imp = per13(s, `p:${pid}`)?.facets.impulsividade ?? 50;
  const tone = toneOf31(opinionOf(s, `p:${pid}`));
  // impaciência (persona13): quem é impulsivo batuca a mesa quando a coisa esfria
  if ((tone === 'cool' || tone === 'cold') && imp >= 68) return mood31(tone, true, '🥁', N('Batuca a mesa, impaciente', 'Drums on the table, impatient'));
  if (p && p.stress >= 75) return mood31(tone === 'warm' ? 'ok' : tone, true, '😰', N('Parece tenso', 'Looks tense'));
  return mood31(tone);
}
/** Humor de um funcionário seu (lealdade = 50 + opinião/2: sempre clara, é da casa). */
export const staffMood31 = (s: GameState, staffId: string): Mood31 => mood31(toneOf31(opinionOf(s, `s:${staffId}`)));

// ---------------------------------------------------------------- elenco da cena

export function you31(s: GameState): Cast31 { return you(s); }
function you(s: GameState): Cast31 {
  const me = playerPerson(s);
  return { id: 'you', name: me?.name ?? s.config.companyName, lookId: me?.id ?? 'player', look: me?.look, born: me?.born, role: me?.role, side: 'you', part: N('Você', 'You'), mood: mood31('ok', true, '🧑‍💼', N('Você', 'You')) };
}
export const personCast31 = (s: GameState, pid: string, part: L, side: Cast31['side'] = 'them'): Cast31 | null => personCast(s, pid, part, side);
function personCast(s: GameState, pid: string, part: L, side: Cast31['side'] = 'them'): Cast31 | null {
  const p = s.persons[pid];
  if (!p) return null;
  return { id: pid, name: p.name, lookId: p.id, look: p.look, born: p.born, role: p.role, side, part, mood: personMood31(s, pid) };
}
export const staffCast31 = (s: GameState, st: StaffMember, side: Cast31['side'], mood?: Mood31): Cast31 => staffCast(s, st, side, mood);
function staffCast(s: GameState, st: StaffMember, side: Cast31['side'], mood?: Mood31): Cast31 {
  return { id: st.id, name: st.name, lookId: `staff:${st.id}`, side, part: staffRoleById[st.role]?.name ?? l(st.role, st.role), mood: mood ?? staffMood31(s, st.id) };
}
/** Quem fala pelo ato e quem senta ao lado (o segundo integrante com mais negociação, ou o empresário). */
function actSide(s: GameState, a: Act): Cast31[] {
  const lead = leaderOf31(s, a);
  const out: Cast31[] = [];
  if (lead) { const c = personCast(s, lead, a.members.length > 1 ? N('Líder', 'Leader') : N('Artista', 'Artist')); if (c) out.push(c); }
  const other = a.members.filter((m) => m !== lead && s.persons[m]?.alive && !s.persons[m].isPlayer)
    .map((m) => ({ m, neg: per13(s, `p:${m}`)?.attrs.neg ?? 0 })).sort((x, y) => y.neg - x.neg || (x.m < y.m ? -1 : 1))[0];
  if (other) { const c = personCast(s, other.m, N('Negocia junto', 'Negotiates too')); if (c) out.push(c); }
  return out;
}

export const live31 = (a: Act | undefined): a is Act => live(a);
const live = (a: Act | undefined): a is Act => !!a && a.status !== 'retired' && a.status !== 'split';
const pct = (x: number): string => `${Math.round(x * 100)}%`;

// ---------------------------------------------------------------- negociar (proposta única; a mesa completa abre por aqui)

reg({
  kind: 'nego', label: N('Negociar contrato', 'Negotiate a deal'), icon: 'handshake', room: 'table',
  exists: (s, t) => live(s.acts[t.id]),
  important: (s, t) => (s.acts[t.id]?.fame ?? 0) >= 15,
  build: (s, t) => {
    const a = s.acts[t.id];
    const o = defaultOffer(s, a);
    const ev = evaluateOffer(s, a, o);
    const lk = signLock31(s, a);
    const BAND: Record<typeof ev.band, L> = { likely: N('provável', 'likely'), uncertain: N('incerta', 'uncertain'), unlikely: N('improvável', 'unlikely') };
    const el = offerEligible29(s, a, o.model);
    return {
      title: fmtL(N('Mesa de negociação · {a}', 'Negotiating table · {a}'), { a: a.name }),
      cast: [you(s), ...actSide(s, a)],
      nums: [
        { label: N('Adiantamento', 'Advance'), value: usd(s, o.advance), hint: N('Proposta padrão do mercado para este artista.', 'The market\'s standard offer for this act.'), basis: 'calc' },
        { label: N('Royalty', 'Royalty'), value: pct(o.royalty), basis: 'calc' },
        { label: N('Prazo', 'Term'), value: fmtL(N('{m} meses · {d} disco(s)', '{m} months · {d} record(s)'), { m: o.termMonths, d: o.releasesOwed }), basis: 'fact' },
        { label: N('Chance de aceitar', 'Chance they accept'), value: BAND[ev.band], hint: N('Leitura grosseira se você conhece pouco o artista.', 'A rough read if you know the act little.'), basis: (s.knowledge[a.id]?.degree ?? 0) < 3 ? 'guess' : 'calc' },
      ],
      lock: el.ok ? null : lockOf31(el.why ?? N('Não contratável agora.', 'Not signable right now.')),
      choices: [
        { id: 'table', label: N('Sentar à mesa (cláusula por cláusula)', 'Sit at the table (clause by clause)'), lock: lk, primary: true, opens: 'nego-table', effect: N('Rodadas de proposta e contraproposta; paciência, blefe e rival.', 'Rounds of offer and counter; patience, bluff and rivals.') },
        { id: 'offer', label: N('Proposta padrão agora', 'Standard offer now'), lock: lk, cost: o.advance, effect: N('Uma proposta, uma resposta (o formulário de sempre).', 'One offer, one answer (the usual form).') },
      ],
    };
  },
  decide: (s, t, choice) => {
    const a = s.acts[t.id];
    if (choice !== 'offer') return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
    const lk = signLock31(s, a);
    if (lk) return { ok: false, text: lk.why, tone: 'bad' };
    const o = defaultOffer(s, a);
    const { offer, result } = offerNow(s, rng19(s, 'act'), { ...o, promises: [...o.promises], rights: o.rights ? { ...o.rights } : undefined });
    const name = a.name;
    // W2-REV: igual ao formulário (ficha.ts) — a proposta recusada sai das ofertas em aberto
    if (offer && result !== 'accepted' && result !== 'thinking' && result !== 'counter' && result !== 'sniped') s.offers = s.offers.filter((x) => x.id !== offer.id);
    if (result === 'accepted') return { ok: true, text: fmtL(N('{a} aceitou na hora! Contrato assinado.', '{a} accepted on the spot! Contract signed.'), { a: name }), tone: 'good', react: mood31('warm', true, '🤝', N('Aperta a sua mão', 'Shakes your hand')) };
    if (result === 'thinking') return { ok: true, text: fmtL(N('{a} pediu um tempo para pensar.', '{a} asked for time to think.'), { a: name }), tone: 'warn', react: mood31('ok', true, '🤫', N('Cochicha com o parceiro', 'Whispers to their partner')) };
    if (result === 'counter') return { ok: true, text: fmtL(N('{a} fez uma contraproposta (veja as ofertas em aberto).', '{a} made a counter-offer (see open offers).'), { a: name }), tone: 'warn', react: mood31('cool', true, '✍️', N('Risca uma cláusula', 'Strikes out a clause')) };
    if (result === 'sniped') return { ok: false, text: N('Tarde demais: outro selo fechou antes.', 'Too late: another label closed first.'), tone: 'bad', react: mood31('cool', true, '🃏', N('Mostra a carta do rival', 'Shows the rival\'s card')) };
    if (result === 'invalid') return { ok: false, text: N('Já existe uma oferta em aberto para este artista.', 'There is already an open offer for this act.'), tone: 'bad' };
    return { ok: false, text: fmtL(N('{a} recusou.', '{a} declined.'), { a: name }), tone: 'bad', react: mood31('cold', true, '🚪', N('Levanta e sai', 'Gets up and leaves')) };
  },
});

// ---------------------------------------------------------------- renovar

const promisesOf = (s: GameState, a: Act): { kept: number; broken: number } => {
  const c = myContract31(s, a);
  const ps = c?.promises ?? [];
  return { kept: ps.filter((p) => p.kept === true).length, broken: ps.filter((p) => p.kept === false).length };
};
const hits = (s: GameState, a: Act): number => a.releases.filter((id) => (s.releases[id]?.peak ?? 99) <= 10).length;

reg({
  kind: 'renew', label: N('Renovar contrato', 'Renew contract'), icon: 'quill', room: 'table',
  exists: (s, t) => !!myContract31(s, s.acts[t.id]),
  important: (s, t) => (s.acts[t.id]?.fame ?? 0) >= 30,
  build: (s, t) => {
    const a = s.acts[t.id];
    const c = myContract31(s, a)!;
    const row = actionRow20(s, 'contract.renew', { act: a.id });
    const bonus = row?.cost ?? 0;
    const f = forecastRenewal(s, a, bonus);
    const pr = promisesOf(s, a);
    const left = Math.max(0, Math.round((c.endWeek - s.week) / 4.35));
    return {
      title: fmtL(N('Renovação · {a}', 'Renewal · {a}'), { a: a.name }),
      cast: [you(s), ...actSide(s, a)],
      nums: [
        { label: N('Bônus de assinatura', 'Signing bonus'), value: usd(s, bonus), basis: 'fact' },
        { label: N('Chance de renovar', 'Chance to renew'), value: `${pct(f.lo)}–${pct(f.hi)}`, hint: N('Faixa: mais estreita com analista e conhecendo bem o artista.', 'A range: narrower with an analyst and knowing the act well.'), basis: 'guess' },
        { label: N('Contrato acaba em', 'Contract ends in'), value: fmtL(N('{m} meses', '{m} months'), { m: left }), basis: 'fact' },
        { label: N('Histórico na mesa', 'Track record on the table'), value: fmtL(N('{d}/{o} discos · {h} no top 10 · promessas {k}✓ {b}✗', '{d}/{o} records · {h} top-10s · promises {k}✓ {b}✗'), { d: c.releasesDone, o: c.releasesOwed, h: hits(s, a), k: pr.kept, b: pr.broken }), basis: 'fact' },
        { label: N('Confiança no selo', 'Trust in the label'), value: String(Math.round(a.trust)), basis: 'fact' },
      ],
      note: f.risks[0],
      choices: [
        { id: 'renew', label: N('Propor a renovação (36 meses)', 'Propose the renewal (36 months)'), lock: row?.block ? lockOf31(row.block, row.unlock) : null, cost: bonus, primary: true, effect: row?.effect ?? undefined },
      ],
    };
  },
  decide: (s, t, choice) => {
    if (choice !== 'renew') return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
    const r = runAction20(s, 'contract.renew', { act: t.id });
    return { ok: r.ok, text: r.text, tone: r.ok ? 'good' : 'bad', react: r.ok ? mood31('warm', true, '🤝', N('Assina e sorri', 'Signs and smiles')) : mood31('cool', true, '🙅', N('Empurra o papel de volta', 'Pushes the paper back')) };
  },
});

// ---------------------------------------------------------------- rescindir

const LEAN: Record<'calm' | 'mixed' | 'hostile', L> = { calm: N('a relação é boa: tende a aceitar', 'good relationship: likely to accept'), mixed: N('relação morna: pode doer', 'lukewarm relationship: it may hurt'), hostile: N('relação ruim: pode virar briga', 'bad relationship: it may turn ugly') };

reg({
  kind: 'rescind', label: N('Rescindir contrato', 'Terminate contract'), icon: 'broken-heart', room: 'office',
  exists: (s, t) => !!myContract31(s, s.acts[t.id]),
  important: () => true,
  build: (s, t) => {
    const a = s.acts[t.id];
    const q = rescindQuote31(s, t.id);
    const lead = leaderOf31(s, a);
    const clear = lead ? know3(know(s, lead)) >= 2 : false;
    return {
      title: fmtL(N('Cara a cara · {a}', 'Face to face · {a}'), { a: a.name }),
      cast: [you(s), ...actSide(s, a).slice(0, 1)],
      nums: [
        { label: N('Multa da rescisão', 'Termination fee'), value: usd(s, q.fee), hint: N('30% do adiantamento de mercado × o prazo que falta.', '30% of the market advance × the remaining term.'), basis: 'calc' },
        { label: N('Prazo que falta', 'Remaining term'), value: fmtL(N('{m} meses · {d} disco(s) devidos', '{m} months · {d} record(s) owed'), { m: q.monthsLeft, d: q.owedLeft }), basis: 'fact' },
        { label: N('Saldo a recuperar perdoado', 'Unrecouped balance forgiven'), value: usd(s, q.unrecouped), basis: 'fact' },
        { label: N('Como deve reagir', 'Likely reaction'), value: clear ? LEAN[q.lean] : N('difícil de ler: você o conhece pouco', 'hard to read: you know them little'), hint: N('Aceita, chora, ameaça processo ou vaza para a imprensa — conforme a relação.', 'Accepts, cries, threatens to sue or leaks to the press — depending on the relationship.'), basis: 'guess' },
      ],
      note: N('Os discos já lançados continuam com você pela ficha de direitos.', 'Released records stay with you per the rights sheet.'),
      choices: [{ id: 'rescind', label: N('Rescindir agora', 'Terminate now'), lock: q.lock, cost: q.fee, danger: true, effect: N('O artista deixa o selo hoje. Não volta atrás.', 'The act leaves the label today. No going back.') }],
    };
  },
  decide: (s, t, choice) => {
    if (choice !== 'rescind') return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
    const r = rescind31(s, t.id);
    if (!r.ok || !r.reaction) return { ok: false, text: r.text, tone: 'bad' };
    const R = REACTION31[r.reaction];
    return { ok: true, text: r.text, tone: R.tone, react: mood31(R.tone === 'good' ? 'ok' : R.tone === 'warn' ? 'cool' : 'cold', true, R.icon, R.label) };
  },
});

// ---------------------------------------------------------------- contratar funcionário (entrevista)

const pro = (s: GameState, id: string): StaffMember | undefined => s.professionals.find((x) => x.id === id);
/** Quem conhece o candidato: gente da sua equipe com o mesmo cargo (referência que dá para "ligar"). */
function refsOf(s: GameState, x: StaffMember): StaffMember[] { return s.player.staff.filter((y) => y.role === x.role).slice(0, 2); }

reg({
  kind: 'hire', label: N('Entrevistar e contratar', 'Interview and hire'), icon: 'people', room: 'office',
  exists: (s, t) => !!pro(s, t.id),
  important: (s, t) => (pro(s, t.id)?.skill ?? 0) >= 60,
  build: (s, t) => {
    const x = pro(s, t.id)!;
    const role = staffRoleById[x.role];
    const block = hireStaffBlock(s, x.id);
    // reação ao salário: quem é muito bom e ganha pouco no mercado olha o relógio; o resto ouve
    const cand: Cast31 = { id: x.id, name: x.name, lookId: `staff:${x.id}`, side: 'them', part: role?.name ?? l(x.role, x.role),
      mood: x.skill >= 70 ? mood31('cool', true, '⌚', N('Olha o relógio: sabe o que vale', 'Checks the watch: knows their worth')) : mood31('ok') };
    const refs = refsOf(s, x);
    return {
      title: fmtL(N('Entrevista · {n}', 'Interview · {n}'), { n: x.name }),
      cast: [you(s), cand, ...refs.map((r) => staffCast(s, r, 'watch'))],
      nums: [
        { label: N('Cargo', 'Role'), value: role?.name ?? l(x.role, x.role), hint: role?.desc, basis: 'fact' },
        { label: N('Competência', 'Skill'), value: String(x.skill), basis: 'fact' },
        { label: N('Salário', 'Salary'), value: fmtL(N('{v}/mês', '{v}/mo'), { v: usd(s, x.salary) }), basis: 'fact' },
        { label: N('Luvas (meio salário)', 'Signing fee (half a salary)'), value: usd(s, hireSignOn(x.salary)), basis: 'fact' },
        { label: N('Referências', 'References'), value: refs.length ? refs.map((r) => r.name).join(', ') : N('ninguém da casa conhece', 'nobody in-house knows them'), hint: N('Gente da sua equipe com o mesmo cargo.', 'People on your staff in the same role.'), basis: 'fact' },
      ],
      choices: [{ id: 'hire', label: N('Contratar', 'Hire'), lock: lockOf31(block), cost: hireSignOn(x.salary), primary: true, effect: N('Entra para a equipe hoje; o salário corre todo mês.', 'Joins the staff today; the salary runs every month.') }],
    };
  },
  decide: (s, t, choice) => {
    if (choice !== 'hire') return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
    const name = pro(s, t.id)?.name ?? '?';
    const e = hireStaff(s, t.id);
    return e ? { ok: false, text: e, tone: 'bad' } : { ok: true, text: fmtL(N('{n} contratado(a) para a equipe.', '{n} hired for the staff.'), { n: name }), tone: 'good', react: mood31('warm', true, '🤝', N('Aperta a sua mão', 'Shakes your hand')) };
  },
});

// ---------------------------------------------------------------- demitir (a equipe olha pelo vidro)

const staffOf = (s: GameState, id: string): StaffMember | undefined => s.player.staff.find((x) => x.id === id);

reg({
  kind: 'fire', label: N('Demitir', 'Fire'), icon: 'broken-heart', room: 'office',
  exists: (s, t) => !!staffOf(s, t.id),
  important: (s, t) => { const x = staffOf(s, t.id); return !!x && (s.week - x.hiredWeek >= 104 || x.skill >= 60); },
  build: (s, t) => {
    const x = staffOf(s, t.id)!;
    const loyal = loyaltyOf(opinionOf(s, `s:${x.id}`));
    const years = Math.max(0, (s.week - x.hiredWeek) / 52);
    const watchers = s.player.staff.filter((y) => y.id !== x.id).slice(0, 3);
    return {
      title: fmtL(N('Sala fechada · {n}', 'Closed room · {n}'), { n: x.name }),
      cast: [you(s), staffCast(s, x, 'them'), ...watchers.map((w) => staffCast(s, w, 'watch'))],
      nums: [
        { label: N('Rescisão (um salário)', 'Severance (one salary)'), value: usd(s, x.salary), basis: 'fact' },
        { label: N('Tempo de casa', 'Time with you'), value: fmtL(N('{y} ano(s)', '{y} year(s)'), { y: years.toFixed(1) }), basis: 'fact' },
        { label: N('Lealdade', 'Loyalty'), value: String(Math.round(loyal)), basis: 'fact' },
        { label: N('Competência', 'Skill'), value: String(x.skill), basis: 'fact' },
      ],
      note: watchers.length ? N('O resto da equipe assiste pelo vidro.', 'The rest of the staff watches through the glass.') : undefined,
      choices: [{ id: 'fire', label: N('Demitir', 'Fire'), lock: null, cost: x.salary, danger: true, effect: N('Sai hoje; paga um salário de rescisão.', 'Leaves today; pays one salary in severance.') }],
    };
  },
  decide: (s, t, choice) => {
    if (choice !== 'fire') return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
    const x = staffOf(s, t.id);
    if (!x) return { ok: false, text: GONE().why, tone: 'bad' };
    const loyal = loyaltyOf(opinionOf(s, `s:${x.id}`));
    fireStaff(s, x.id);
    return { ok: true, text: fmtL(N('{n} foi demitido(a).', '{n} was let go.'), { n: x.name }), tone: 'warn',
      react: loyal >= 65 ? mood31('cool', true, '😢', N('Sai em silêncio, magoado', 'Leaves quietly, hurt')) : mood31('cold', true, '📦', N('Junta as coisas e bate a porta', 'Packs up and slams the door')) };
  },
});

// ---------------------------------------------------------------- punir (cobrar / multar)

reg({
  kind: 'punish', label: N('Cobrar ou punir', 'Push or discipline'), icon: 'warning', room: 'office',
  exists: (s, t) => !!s.persons[t.id] && !!actOf(s, t.id) && playerActs(s).includes(actOf(s, t.id)!.id),
  important: () => true,
  build: (s, t) => {
    const p = s.persons[t.id];
    const a = actOf(s, t.id)!;
    const lk = lockOf31(canTalk(s, t.id));
    const others = a.members.filter((m) => m !== p.id && s.persons[m]?.alive && !s.persons[m].isPlayer).slice(0, 2);
    const fine = fineAmount(s, t.id);
    const cast = [you(s), personCast(s, p.id, a.name.length ? l(a.name, a.name) : N('Artista', 'Artist'))!, ...others.map((m) => personCast(s, m, N('Assiste', 'Watching'), 'watch')).filter((c): c is Cast31 => !!c)];
    return {
      title: fmtL(N('Conversa séria · {n}', 'Serious talk · {n}'), { n: p.name }),
      cast,
      nums: [
        { label: N('Moral', 'Morale'), value: String(Math.round(p.morale)), basis: 'fact' },
        { label: N('Estresse', 'Stress'), value: String(Math.round(p.stress)), basis: 'fact' },
        { label: N('Confiança do ato', 'Act\'s trust'), value: String(Math.round(a.trust)), basis: 'fact' },
        { label: N('Multa disciplinar', 'Disciplinary fine'), value: usd(s, fine), hint: N('Entra no caixa do selo; sai do bolso da pessoa.', 'Goes into the label\'s cash; comes out of the person\'s pocket.'), basis: 'fact' },
      ],
      note: N('A reação depende da personalidade, do humor e de quantas vezes você já usou o mesmo argumento.', 'The reaction depends on personality, mood and how often you have used the same argument.'),
      choices: [
        { id: 'demand', label: N('Cobrar mais empenho', 'Push for more effort'), lock: lk, primary: true, effect: N('Quem é durão encara como desafio; quem está frágil desaba.', 'The tough take it as a challenge; the fragile break down.') },
        { id: 'fine', label: N('Multar', 'Fine'), lock: lk, danger: true, effect: N('Mágoa e confiança menor — menos se a pessoa sabe que errou.', 'Resentment and lower trust — less if they know they messed up.') },
      ],
    };
  },
  decide: (s, t, choice) => {
    if (choice !== 'demand' && choice !== 'fine') return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
    const a = actOf(s, t.id);
    const trust0 = a?.trust ?? 0;
    const r = talk(s, t.id, choice);
    if (!r.ok) return { ok: false, text: r.text, tone: 'bad' };
    const fell = (a?.trust ?? 0) < trust0;
    return { ok: true, text: r.text, tone: fell ? 'warn' : 'good',
      react: fell ? mood31('cold', true, choice === 'fine' ? '📞' : '🚪', choice === 'fine' ? N('Liga para o advogado', 'Calls the lawyer') : N('Sai batendo a porta', 'Slams the door')) : mood31('ok', true, '💪', N('Encara o desafio', 'Takes on the challenge')) };
  },
});

// ---------------------------------------------------------------- montar formação (sala de ensaio)

const skillOf = (p: Person): number => Math.round(Math.max(p.skills.instr ?? 0, p.role === 'vocal' || p.role === 'mc' ? p.skills.voice ?? 0 : 0));

/** Candidatos para a banda: músicos livres do mesmo universo + integrantes de bandas alheias (até `n`, pelos melhores). Só leitura. */
export function lineupCandidates31(s: GameState, actId: string, n = 5): Person[] {
  const a = s.acts[actId];
  if (!a) return [];
  const fam = familyOf(a.genre);
  const seen = new Set<string>(a.members);
  const out: Person[] = [];
  for (const p of freePool(s, a.genre, a.id)) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  const mine = new Set(playerActs(s));
  for (const b of Object.values(s.acts)) {
    if (mine.has(b.id) || !live(b) || b.status === 'hiatus' || familyOf(b.genre) !== fam) continue;
    for (const m of b.members) { const p = s.persons[m]; if (p?.alive && !p.isPlayer && !seen.has(m)) { seen.add(m); out.push(p); } }
  }
  return out.sort((x, y) => skillOf(y) - skillOf(x) || (x.id < y.id ? -1 : 1)).slice(0, n);
}
/** Química interna: média das relações entre os integrantes (−100..100). */
export function bandChem31(s: GameState, actId: string): number {
  const ms = (s.acts[actId]?.members ?? []).map((m) => s.persons[m]).filter((q): q is Person => !!q?.alive && !q.isPlayer);
  const vs: number[] = [];
  for (const x of ms) for (const y of ms) if (x !== y) vs.push(x.rel[y.id] ?? 0);
  return vs.length ? Math.round(vs.reduce((t, v) => t + v, 0) / vs.length) : 0;
}
/** Química do candidato com a banda (relações já existentes; sem relação = neutro). */
export function chemistry31(s: GameState, actId: string, pid: string): number {
  const a = s.acts[actId];
  const rs = (a?.members ?? []).map((m) => s.persons[m]).filter((q): q is Person => !!q?.alive && !q.isPlayer).map((q) => rel0(s, q.id, pid));
  return rs.length ? Math.round(rs.reduce((t, v) => t + v, 0) / rs.length) : 0;
}

/** W2-REV: as teclas 1–9 só valem com a cena na janela de CIMA e o foco dentro dela (uma Ficha aberta por cima não
 *  dispara escolhas da cena embaixo). Puro: recebe a janela da cena, as janelas abertas (em ordem) e o alvo. */
export function sceneKeyOk31(own: { contains(n: unknown): boolean } | null, overlays: readonly unknown[], target: unknown): boolean {
  if (!own || !overlays.length || overlays[overlays.length - 1] !== own) return false;
  return !!target && own.contains(target);
}

/** A opção de integrante é de entrar NESTA banda? (`mo.join:<ato>` ou `mo.join:<ato>:<substituído>`; W2-REV: o prefixo
 *  solto casava `a1` com `a1z`) */
export const joinOf31 = (optId: string, actId: string): boolean => optId === `mo.join:${actId}` || optId.startsWith(`mo.join:${actId}:`);

reg({
  kind: 'lineup', label: N('Montar formação', 'Shape the lineup'), icon: 'people', room: 'rehearsal',
  exists: (s, t) => myBands29(s).some((a) => a.id === t.id),
  important: () => true,
  build: (s, t) => {
    const a = s.acts[t.id];
    const members = a.members.map((m) => personCast(s, m, s.persons[m] ? roleName29(s.persons[m].role) : N('Integrante', 'Member'))).filter((c): c is Cast31 => !!c);
    const cands = lineupCandidates31(s, a.id, 12);
    let choices: Choice31[] = [];
    for (const p of cands) {
      for (const o of memberOptions29(s, p.id).filter((x) => x.k === 'join' && joinOf31(x.id, a.id)).slice(0, 1)) {
        const ch = chemistry31(s, a.id, p.id);
        choices.push({ id: `${p.id}|${o.id}`, label: fmtL(N('{n}: {o}', '{n}: {o}'), { n: p.name, o: o.label }), lock: lockOf31(o.block), cost: o.cost,
          effect: fmtL(N('{n} · {r} · nível {k}{c}{q}', '{n} · {r} · level {k}{c}{q}'), { n: p.name, r: roleName29(p.role), k: skillOf(p),
            c: o.chance !== undefined ? fmtL(N(' · chance {p}%', ' · odds {p}%'), { p: Math.round(o.chance * 100) }) : '',
            q: ch >= 10 ? N(' · entrosamento com a banda', ' · gets on with the band') : ch <= -10 ? N(' · olhares tortos na banda', ' · side-eye from the band') : '' }) });
      }
    }
    // quem pode entrar de fato vem primeiro (os travados continuam visíveis, com o motivo)
    choices = [...choices.filter((c) => !c.lock), ...choices.filter((c) => c.lock)].slice(0, 5);
    return {
      title: fmtL(N('Sala de ensaio · {a}', 'Rehearsal room · {a}'), { a: a.name }),
      cast: [you(s), ...members],
      nums: [
        { label: N('Integrantes', 'Members'), value: String(a.members.filter((m) => s.persons[m]?.alive).length), basis: 'fact' },
        { label: N('Química entre integrantes', 'Chemistry between members'), value: String(bandChem31(s, a.id)), hint: N('Média das relações entre eles (−100 a 100).', 'Average of their relationships (−100 to 100).'), basis: 'fact' },
        { label: N('Candidatos na porta', 'Candidates at the door'), value: String(choices.length), hint: N('Músicos livres do mesmo universo e integrantes de outras bandas.', 'Free musicians from the same world and members of other bands.'), basis: 'fact' },
      ],
      note: cands.length ? N('Escolha quem entra (ou quem substitui alguém). A chance e as luvas são as da oferta a integrante.', 'Pick who joins (or who replaces someone). Odds and fee are those of the member offer.') : N('Nenhum músico disponível do mesmo universo agora.', 'No musician from the same world is available right now.'),
      choices,
    };
  },
  decide: (s, t, choice) => {
    const [pid, opt] = choice.split('|');
    if (!pid || !opt || !joinOf31(opt, t.id)) return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
    const ch = chemistry31(s, t.id, pid);
    const r = runMemberOption29(s, pid, opt);
    return { ok: r.ok, text: r.text, tone: r.ok ? 'good' : 'bad',
      react: r.ok ? (ch <= -10 ? mood31('cool', true, '😒', N('A banda troca olhares', 'The band trades looks')) : mood31('warm', true, '🎸', N('Jam de boas-vindas', 'A welcome jam'))) : mood31('cool', true, '👋', N('Agradece e vai embora', 'Thanks you and leaves')) };
  },
});

// ---------------------------------------------------------------- API

/** Modelo da cena (só leitura). null se o alvo não existe mais. */
export function sceneModel31(s: GameState, kind: SceneKind31, t: SceneTarget31): SceneModel31 | null {
  const sp = REG.get(kind);
  if (!sp) return null;
  let ok = false;
  try { ok = sp.exists(s, t); } catch { ok = false; }
  if (!ok) return null;
  const b = sp.build(s, t);
  return { kind, room: sp.room, important: !!sp.important(s, t), ...b, lock: b.lock ?? null };
}

/** Executa a escolha pela função do jogo (revalida a trava agora). */
export function decideScene31(s: GameState, kind: SceneKind31, t: SceneTarget31, choice: string): SceneOut31 {
  const m = sceneModel31(s, kind, t);
  if (!m) return { ok: false, text: GONE().why, tone: 'bad' };
  if (m.lock) return { ok: false, text: m.lock.why, tone: 'bad' };
  const c = m.choices.find((x) => x.id === choice);
  if (!c) return { ok: false, text: N('Escolha inválida.', 'Invalid choice.'), tone: 'bad' };
  if (c.lock) return { ok: false, text: c.lock.why, tone: 'bad' };
  if (c.opens) return { ok: false, text: N('Esta escolha abre a mesa completa.', 'This choice opens the full table.'), tone: 'warn' };
  return REG.get(kind)!.decide(s, t, choice);
}

/** Preferência flow27: 'play' = sempre a cena; 'key' = cena só nas importantes; 'quick' = sempre o modo de 2 cliques. */
export function sceneMode31(s: GameState, kind: SceneKind31, t: SceneTarget31, pref: 'play' | 'key' | 'quick'): 'scene' | 'quick' {
  if (pref === 'quick') return 'quick';
  if (pref === 'play') return 'scene';
  try { return REG.get(kind)?.important(s, t) ? 'scene' : 'quick'; } catch { return 'quick'; }
}

/** Alvos possíveis de cada cena (editor e busca): ids e nomes. Só leitura. */
export function sceneTargets31(s: GameState, kind: SceneKind31): { id: string; name: string }[] {
  const acts = playerActs(s).map((id) => s.acts[id]).filter(live);
  switch (kind) {
    case 'nego': { // contratáveis primeiro (a mesma regra do radar e da proposta), depois os mais famosos
      const pool = Object.values(s.acts).filter((a) => live(a) && visibleAct(s, a) && !playerActs(s).includes(a.id) && a.fame >= 3);
      const ok = new Set(pool.filter((a) => offerEligible29(s, a, 'classic').ok).map((a) => a.id));
      return pool.sort((x, y) => Number(ok.has(y.id)) - Number(ok.has(x.id)) || y.fame - x.fame || (x.id < y.id ? -1 : 1)).slice(0, 30).map((a) => ({ id: a.id, name: a.name }));
    }
    case 'renew': case 'rescind': return acts.filter((a) => !!myContract31(s, a)).map((a) => ({ id: a.id, name: a.name }));
    case 'lineup': return myBands29(s).map((a) => ({ id: a.id, name: a.name }));
    case 'hire': return s.professionals.map((x) => ({ id: x.id, name: x.name }));
    case 'fire': return s.player.staff.map((x) => ({ id: x.id, name: x.name }));
    case 'punish': return acts.flatMap((a) => a.members.filter((m) => s.persons[m]?.alive && !s.persons[m].isPlayer).map((m) => ({ id: m, name: `${s.persons[m].name} (${a.name})` })));
    default: return REG.get(kind)?.targets?.(s) ?? [];
  }
}
