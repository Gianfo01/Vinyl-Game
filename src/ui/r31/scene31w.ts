// R31 · onda 4 (W) — MECÂNICAS EM CENA, lote 2 (núcleo, sem DOM). Mesmo registro, mesmo palco e mesmo modo de 2
// cliques do lote 1 (scene31core / scene31.ts). Cada cena é a FRENTE DO MESMO CÁLCULO do formulário de sempre:
//
//   release — reunião com quadro branco: cartões de divulgação na linha do tempo (o mesmo `p.marketing` do projeto),
//             A&R, assessoria e produtor opinam (a previsão real do projeto, com erro maior em quem é fraco);
//             decide por scheduleProject / rolloutProject                                     (Criação › Projeto)
//   bank    — o gerente olha os seus papéis (caixa, custo do mês, dívidas, meses no vermelho) e reage; juros da
//             oferta de sempre; crédito negado trava com o motivo      → takeLoan / takeCompanyLoan (Finanças, Vícios)
//   buy     — reunião com o dono na sala dele; fatias montadas como no contrato; sócios dele reagem; compra grande
//             demais chama o antitruste (sim/r31/w31)                  → buy31 (Sócios e compras) · buyLabel17 (sem selo)
//   jaba    — na rádio, o envelope ao diretor de programação: o risco aparece no rosto dele (w31.jabaFace31), e ele
//             pode aceitar, recusar com desprezo ou denunciar (interruptor w31.jaba)
//                                                                      → payDJs / pitchLegit / lunchPd18 (Indústria)
//   jabain  — na SUA rádio: o divulgador de um selo rival traz o envelope → answerJaba31 (Rádio própria)
//
// Montar o modelo não muda nada nem sorteia: o sorteio (quando há) é o da função do jogo.

import { formatMoney } from '../../core/money';
import { Rng, clamp } from '../../core/rng';
import { CHANNELS } from '../../data/rules';

import { cityById, l, type L } from '../../data/world';
import { loanOffer, monthlyCosts, takeLoan } from '../../sim/economy';
import { know, know3 } from '../../sim/know';
import { availableChannels } from '../../sim/market';
import { cashWhy20, freeCash20 } from '../../sim/oblig20';
import { opinionOf } from '../../sim/opinion';
import { lock31, lockOf31, UNLOCK31, type Lock31 } from '../../sim/r31/lock';
import { antitrust31, jabaClear31, jabaFace31, jabaStation31, JABA_FACE31, withJabaStation31 } from '../../sim/r31/w31';
import { rng19 } from '../../sim/rng19';
import { answerJaba31, lawRisk31, mediaVentures31, stRo31 } from '../../sim/sys/car31media';
import { countryOfCity } from '../../data/geo';
import { openProjects, projectCosts, projectForecast, projectQ, projectStage, rolloutProject, scheduleProject, STAGE_NAMES, type MusicProject } from '../../sim/sys/project8';
import { buyLabel17, buyPrice, buyableLabels, hasLabel } from '../../sim/sys/sale17';
import { accept31, bizValue31, buy31, buyLock31, quote31, socio31, SKIND31, targets31, TOTAL31, pct31, type Partner31 } from '../../sim/sys/socio31';
import { CO_LENDERS, companyLoanBlocker, takeCompanyLoan, type CoLenderId } from '../../sim/sys/vices';
import { PAYOLA_ERA_INFO, PAYOLA_TIERS, payDJs, payolaCost, payolaEra, pitchLegit } from '../../sim/sys/world4/charts';
import { lunchPd18 } from '../../sim/sys/radio18';
import { w4 } from '../../sim/sys/world4/state';
import type { GameState, StaffMember } from '../../sim/types';
import { fmtL, hasTech, money } from '../../sim/util';
import {
  mood31, personCast31, personMood31, registerScene31, staffCast31, toneOf31, you31,
  type Cast31, type Choice31, type Mood31, type Num31, type SceneOut31,
} from './scene31core';

const N = (pt: string, en: string): L => l(pt, en);
const usd = (c: number): L => l(formatMoney(Math.max(0, c), 'pt-BR'), formatMoney(Math.max(0, c), 'en-US'));
const sgnUsd = (c: number): L => (c < 0 ? fmtL(N('−{v}', '−{v}'), { v: usd(-c) }) : usd(c));
const BAD = (t: L): SceneOut31 => ({ ok: false, text: t, tone: 'bad' });
const INVALID = (): SceneOut31 => BAD(N('Escolha inválida.', 'Invalid choice.'));
/** Pessoa sem ficha (gerente, diretor de rádio): boneco pela semente, humor sempre visível no rosto. */
const extra = (id: string, name: string, part: L, mood: Mood31, side: Cast31['side'] = 'them'): Cast31 => ({ id, name, lookId: id, side, part, mood });
const roleStaff = (s: GameState, roles: string[]): StaffMember | undefined =>
  [...s.player.staff].filter((x) => roles.includes(x.role)).sort((a, b) => b.skill - a.skill || (a.id < b.id ? -1 : 1))[0];

// ================================================================ quadro do lançamento

const projOf = (s: GameState, id: string): MusicProject | undefined => openProjects(s).find((p) => p.id === id);
const READY = new Set(['recording', 'finishing']);
const CH = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<string, (typeof CHANNELS)[number]>;
/** Verba de um cartão novo: a mesma que o botão "+ Canal" do projeto põe. */
export const cardBudget31 = (s: GameState): number => money(s, 1000);

/** Opinião de um conselheiro: a previsão real do projeto, deslocada por um erro fixo (por pessoa e projeto) que cresce
 *  quanto mais fraco ele é. Sorte pura por chave: abrir a cena não sorteia nada. */
export function advisorGuess31(s: GameState, p: MusicProject, st: StaffMember, mid: number): number {
  const err = (100 - clamp(st.skill, 0, 100)) / 100 * 0.6;
  const k = Rng.fromSeed(`${s.config.seed}|w31adv|${p.id}|${st.id}`).float(-1, 1);
  return Math.max(0, Math.round(mid * (1 + err * k)));
}
const ADVISORS: { roles: string[]; part: L; about: (s: GameState, p: MusicProject) => L }[] = [
  { roles: ['anr'], part: N('A&R', 'A&R'), about: (s, p) => (projectQ(s, p) >= 65 ? N('"As faixas seguram."', '"The tracks hold up."') : N('"Falta uma faixa forte."', '"It lacks a strong track."')) },
  { roles: ['publicist'], part: N('Assessoria', 'Publicist'), about: (_s, p) => (p.marketing.some((m) => m.channel === 'press' && m.budget > 0) ? N('"Com imprensa no quadro eu trabalho."', '"With press on the board I can work."') : N('"Sem imprensa no quadro a crítica nem fica sabendo."', '"Without press on the board critics will not even hear of it."')) },
  { roles: ['producer', 'engineer'], part: N('Produtor', 'Producer'), about: (s, p) => (projectStage(s, p) === 'finishing' ? N('"Está pronto para sair."', '"It is ready to go out."') : N('"Ainda tem faixa para gravar."', '"There are still tracks to record."')) },
];

registerScene31({
  kind: 'release', label: N('Reunião de lançamento', 'Release meeting'), icon: 'calendar', room: 'board',
  exists: (s, t) => { const p = projOf(s, t.id); return !!p && READY.has(projectStage(s, p)); },
  important: (s, t) => (s.acts[projOf(s, t.id)?.actId ?? '']?.fame ?? 0) >= 25 || projOf(s, t.id)?.type === 'lp',
  targets: (s) => openProjects(s).filter((p) => READY.has(projectStage(s, p))).map((p) => ({ id: p.id, name: `${p.title || s.acts[p.actId]?.name || '?'} (${s.acts[p.actId]?.name ?? ''})` })),
  build: (s, t) => {
    const p = projOf(s, t.id)!;
    const a = s.acts[p.actId];
    const stage = projectStage(s, p);
    const fc = projectForecast(s, p);
    const c = projectCosts(s, p);
    const chans = availableChannels(s);
    const on = new Set(p.marketing.filter((m) => m.budget > 0).map((m) => m.channel));
    const cast: Cast31[] = [you31(s)];
    const opinions: Num31[] = [];
    for (const ad of ADVISORS) {
      const st = roleStaff(s, ad.roles);
      if (!st) continue;
      const g = fc ? advisorGuess31(s, p, st, fc.mid) : 0;
      const tone = !fc ? 'unknown' : g >= fc.mid * 1.1 ? 'warm' : g <= fc.mid * 0.9 ? 'cool' : 'ok';
      cast.push(staffCast31(s, st, 'them', mood31(tone, true, tone === 'warm' ? '👍' : tone === 'cool' ? '🤨' : '🗒️', ad.about(s, p))));
      opinions.push({ label: fmtL(N('{r} ({n}) acha que vende', '{r} ({n}) thinks it sells'), { r: ad.part, n: st.name }), value: fc ? fmtL(N('≈ {u} unidades', '≈ {u} units'), { u: g.toLocaleString('pt-BR') }) : N('sem previsão', 'no forecast'), hint: fmtL(N('Competência {k}: quanto mais fraco, mais erra a leitura.', 'Skill {k}: the weaker, the more the read is off.'), { k: st.skill }), basis: 'guess' });
    }
    const lk = stage === 'finishing' ? null : lock31(N('Ainda há faixas para gravar.', 'There are still tracks to record.'), UNLOCK31.record);
    const choices: Choice31[] = [
      { id: 'schedule', label: fmtL(N('Lançar em {w} semana(s) com este quadro', 'Release in {w} week(s) with this board'), { w: Math.max(1, Math.min(26, p.weeksAhead)) }), lock: lk, cost: c.remaining, primary: true, effect: N('Programa o lançamento com os cartões do quadro (o botão "Programar lançamento" do projeto).', 'Schedules the release with the board\'s cards (the project\'s "Schedule release" button).') },
    ];
    if (p.type === 'lp') choices.push({ id: 'rollout', label: N('Rollout completo: teaser → singles → clipe → álbum', 'Full rollout: teaser → singles → video → album'), lock: lk, effect: N('Cada fase paga a sua parte da verba; singles escolhidos pelo gancho.', 'Each phase pays its share of the budget; singles chosen by hook.') });
    for (const ch of chans) {
      const has = on.has(ch.id);
      choices.push({ id: `card:${ch.id}`, label: fmtL(has ? N('Tirar o cartão "{c}"', 'Remove the "{c}" card') : N('Pôr o cartão "{c}" na linha do tempo', 'Put the "{c}" card on the timeline'), { c: ch.name }), lock: null, stay: true,
        cost: has ? undefined : cardBudget31(s), effect: fmtL(N('vendas ×{s} · fama ×{f} · prestígio ×{p}', 'sales ×{s} · fame ×{f} · prestige ×{p}'), { s: ch.sales, f: ch.fame, p: ch.prestige }) });
    }
    return {
      title: fmtL(N('Reunião de lançamento · {t}', 'Release meeting · {t}'), { t: p.title || a?.name || '?' }),
      cast,
      cards: on.size,
      nums: [
        { label: N('Etapa', 'Stage'), value: STAGE_NAMES[stage], basis: 'fact' },
        { label: N('Linha do tempo', 'Timeline'), value: on.size ? [...on].map((x) => CH[x]?.name.pt ?? x).join(' → ') : N('nenhum cartão: sai sem divulgação', 'no cards: goes out without promotion'), basis: 'fact' },
        { label: N('Previsão de vendas (faixa)', 'Sales forecast (range)'), value: fc ? fmtL(N('{lo}–{hi} unidades', '{lo}–{hi} units'), { lo: fc.lo.toLocaleString('pt-BR'), hi: fc.hi.toLocaleString('pt-BR') }) : N('sem faixas escolhidas', 'no tracks chosen'), hint: N('A mesma previsão da tela do projeto; mais estreita com analista.', 'The same forecast as the project screen; narrower with an analyst.'), basis: 'guess' },
        { label: N('Ainda a gastar', 'Still to spend'), value: usd(c.remaining), basis: 'calc' },
        ...opinions,
      ],
      note: opinions.length ? N('Cada um opina pela previsão real — quem é fraco erra mais.', 'Each one reads the real forecast — the weak ones miss more.') : N('Sem A&R, assessoria ou produtor na equipe: ninguém opina. Contrate na aba Equipe.', 'No A&R, publicist or producer on staff: nobody weighs in. Hire in the Staff tab.'),
      choices,
    };
  },
  decide: (s, t, choice) => {
    const p = projOf(s, t.id);
    if (!p) return BAD(N('Projeto não encontrado.', 'Project not found.'));
    if (choice.startsWith('card:')) {
      const ch = choice.slice(5);
      if (!availableChannels(s).some((c) => c.id === ch)) return INVALID();
      const i = p.marketing.findIndex((m) => m.channel === ch && m.budget > 0);
      if (i >= 0) { p.marketing = p.marketing.filter((m) => m.channel !== ch); return { ok: true, text: fmtL(N('Cartão "{c}" saiu do quadro.', '"{c}" card removed from the board.'), { c: CH[ch].name }), tone: 'warn', react: mood31('ok', true, '🧽', N('Apaga do quadro', 'Wipes it off the board')) }; }
      p.marketing = [...p.marketing.filter((m) => m.channel !== ch), { channel: ch, budget: cardBudget31(s) }];
      return { ok: true, text: fmtL(N('Cartão "{c}" na linha do tempo ({v}).', '"{c}" card on the timeline ({v}).'), { c: CH[ch].name, v: usd(cardBudget31(s)) }), tone: 'good', react: mood31('warm', true, '📌', N('Prende o cartão no quadro', 'Pins the card on the board')) };
    }
    if (choice === 'schedule') {
      const e = scheduleProject(s, rng19(s, 'act'), p);
      return e ? BAD(e) : { ok: true, text: N('Lançamento programado. A equipe sai da sala com a lista de tarefas.', 'Release scheduled. The team leaves with the task list.'), tone: 'good', react: mood31('warm', true, '🗓️', N('Anota a data', 'Writes down the date')) };
    }
    if (choice === 'rollout') {
      const e = rolloutProject(s, p);
      return e ? BAD(e) : { ok: true, text: N('Rollout planejado: teaser, singles, clipe e álbum na linha do tempo.', 'Rollout planned: teaser, singles, video and album on the timeline.'), tone: 'good', react: mood31('warm', true, '🎯', N('Desenha as fases no quadro', 'Draws the phases on the board')) };
    }
    return INVALID();
  },
});

// ================================================================ banco

const burn31 = (s: GameState): number => { const c = monthlyCosts(s); return c.rent + c.salaries + c.outsourcing + c.loans + c.equipment; };
/** O gerente lê os seus papéis: meses de fôlego (caixa ÷ custo do mês), dívidas e meses no vermelho. */
export function bankerMood31(s: GameState): Mood31 {
  if (s.player.insolvencyMonths >= 2) return mood31('cold', true, '📁', N('Fecha a pasta antes de você sentar', 'Closes the folder before you sit down'));
  const runway = s.player.cash / Math.max(1, burn31(s));
  if (runway >= 6 && s.player.loans.length <= 1) return mood31('warm', true, '☕', N('Oferece café e sorri', 'Offers coffee and smiles'));
  if (runway >= 2) return mood31('ok', true, '🧐', N('Folheia o balanço com atenção', 'Leafs through the balance sheet carefully'));
  return mood31('cool', true, '🖊️', N('Bate a caneta na mesa, desconfiado', 'Taps the pen on the desk, wary'));
}
const LENDERS: CoLenderId[] = ['bank', 'development', 'angel', 'shark'];
const loanLock = (s: GameState): Lock31 | null => {
  const o = loanOffer(s);
  if (!o) return lock31(s.player.insolvencyMonths >= 2 ? N('Sem crédito: o banco não empresta para quem está no vermelho há 2 meses ou mais.', 'No credit: the bank will not lend to a company in the red for 2+ months.') : N('Sem crédito disponível agora.', 'No credit available right now.'), UNLOCK31.cash);
  if (s.player.loans.length >= 3) return lock31(N('Já há três empréstimos do banco em aberto.', 'There are already three bank loans open.'), N('Quite um empréstimo antes de pedir outro.', 'Pay off a loan before asking for another.'));
  return null;
};

registerScene31({
  kind: 'bank', label: N('Ir ao banco', 'Go to the bank'), icon: 'money', room: 'bank',
  exists: () => true,
  important: (s) => s.player.cash < burn31(s) * 2,
  targets: () => [{ id: 'bank', name: 'Banco' }],
  build: (s) => {
    const o = loanOffer(s);
    const debt = s.player.loans.reduce((t0, x) => t0 + x.balance, 0);
    const watch = roleStaff(s, ['admin', 'analyst', 'legal']);
    const city = cityById[s.config.homeCity]?.name ?? s.config.homeCity;
    return {
      title: fmtL(N('Agência do banco · {c}', 'Bank branch · {c}'), { c: city }),
      cast: [you31(s), extra(`bank:${s.config.homeCity}`, s.year < 1950 ? 'Sr. Almeida' : 'Gerente de contas', N('Gerente', 'Manager'), bankerMood31(s)), ...(watch ? [staffCast31(s, watch, 'watch')] : [])],
      nums: [
        { label: N('Caixa', 'Cash'), value: sgnUsd(s.player.cash), basis: 'fact' },
        { label: N('Caixa livre (sem os valores reservados)', 'Free cash (without reserved amounts)'), value: sgnUsd(freeCash20(s)), basis: 'fact' },
        { label: N('Custo fixo do mês', 'Monthly fixed cost'), value: usd(burn31(s)), basis: 'calc' },
        { label: N('Dívidas em aberto', 'Open debts'), value: fmtL(N('{n} · saldo {v}', '{n} · balance {v}'), { n: s.player.loans.length, v: usd(debt) }), basis: 'fact' },
        { label: N('Meses no vermelho', 'Months in the red'), value: String(s.player.insolvencyMonths), basis: 'fact' },
        { label: N('Oferta do banco', 'Bank offer'), value: o ? fmtL(N('{a} a {r}% ao ano, {m} meses', '{a} at {r}% a year, {m} months'), { a: usd(o.amount), r: (Math.round(o.rate * 1000) / 10).toString(), m: o.months }) : N('nenhuma', 'none'), hint: N('Cada empréstimo em aberto encolhe o próximo e encarece os juros.', 'Each open loan shrinks the next and raises the interest.'), basis: 'calc' },
      ],
      note: N('O gerente reage ao que vê nos papéis: fôlego de caixa, dívidas e meses no vermelho.', 'The manager reacts to what the papers show: cash runway, debts and months in the red.'),
      choices: [
        { id: 'loan', label: N('Pedir o empréstimo do banco', 'Ask for the bank loan'), lock: loanLock(s), cost: undefined, primary: true, effect: o ? fmtL(N('Entra {a}; parcela mensal por {m} meses.', '{a} comes in; monthly instalment for {m} months.'), { a: usd(o.amount), m: o.months }) : undefined },
        ...LENDERS.map((k) => {
          const d = CO_LENDERS[k];
          return { id: `co:${k}`, label: fmtL(N('{n}: {a} a {r}%', '{n}: {a} at {r}%'), { n: d.name, a: usd(d.amount(s)), r: Math.round(d.rate(s) * 100) }), lock: lockOf31(companyLoanBlocker(s, k)), danger: k === 'shark', effect: d.desc } as Choice31;
        }),
      ],
    };
  },
  decide: (s, _t, choice) => {
    if (choice === 'loan') {
      if (loanLock(s)) return BAD(loanLock(s)!.why);
      return takeLoan(s) ? { ok: true, text: N('O gerente assina. O dinheiro entra; os juros também.', 'The manager signs. The money comes in; so does the interest.'), tone: 'good', react: mood31('ok', true, '✍️', N('Assina e carimba', 'Signs and stamps')) }
        : { ok: false, text: N('O banco recusa.', 'The bank says no.'), tone: 'bad', react: mood31('cold', true, '📁', N('Fecha a pasta', 'Closes the folder')) };
    }
    if (choice.startsWith('co:')) {
      const k = choice.slice(3) as CoLenderId;
      if (!LENDERS.includes(k)) return INVALID();
      const e = takeCompanyLoan(s, k);
      return e ? BAD(e) : { ok: true, text: fmtL(N('Empréstimo fechado: {n}.', 'Loan closed: {n}.'), { n: CO_LENDERS[k].name }), tone: k === 'shark' ? 'warn' : 'good', react: k === 'shark' ? mood31('cool', true, '🦈', N('Sorri demais', 'Smiles too much')) : mood31('ok', true, '✍️', N('Assina e carimba', 'Signs and stamps')) };
    }
    return INVALID();
  },
});

// ================================================================ comprar empresa ou sociedade

const SLICES31 = [1000, 2500, 5100, TOTAL31];
/** Dono principal de um negócio (alvo novo ou sociedade sua). */
function ownerOfBiz(s: GameState, id: string): { o: Partner31 | undefined; others: Partner31[]; legend: boolean; never: boolean; held: number; name: string; kind: string; city: string } | null {
  const b = socio31(s).b[id];
  if (b) {
    const ps = [...b.p].sort((x, y) => y.sh - x.sh || (x.k < y.k ? -1 : 1));
    const pr = b.set.pr ?? 0;
    return { o: ps[0], others: ps.slice(1), legend: pr >= 88, never: pr >= 94, held: b.me, name: b.name, kind: b.kind, city: b.city };
  }
  const tg = targets31(s).find((x) => x.id === id);
  return tg ? { o: tg.owner, others: [], legend: tg.legend, never: tg.never, held: 0, name: tg.name, kind: tg.kind, city: tg.city } : null;
}
/** Pessoa por trás de um dono: líder do selo rival (l:<pessoa>) ou pessoa (p:<pessoa>); senão, ninguém com ficha. */
const personOfNode = (k: string): string | undefined => (k.startsWith('l:') || k.startsWith('p:') ? k.slice(2) : undefined);
function ownerCast(s: GameState, o: Partner31, part: L, side: Cast31['side'], score?: number): Cast31 {
  const pid = personOfNode(o.k);
  const c = pid ? personCast31(s, pid, part, side) : null;
  if (c) return { ...c, name: `${c.name} (${o.n})` };
  // dono sem ficha: o humor é a opinião dele sobre você (a mesma da conta do aceite); clara só se vocês se conhecem
  const op = opinionOf(s, o.k);
  const clear = score !== undefined && Math.abs(op) >= 10;
  return extra(`own:${o.k}`, o.n, part, clear ? mood31(toneOf31(op)) : mood31('unknown', false), side);
}

registerScene31({
  kind: 'buy', label: N('Reunião de compra', 'Buyout meeting'), icon: 'handshake', room: 'ceo',
  exists: (s, t) => (t.id.startsWith('lb:') ? !hasLabel(s) && !!s.labels[t.id.slice(3)]?.active : !!ownerOfBiz(s, t.id)?.o),
  important: () => true,
  targets: (s) => [
    ...(!hasLabel(s) ? buyableLabels(s).map((lb) => ({ id: `lb:${lb.id}`, name: lb.name })) : []),
    ...Object.values(socio31(s).b).filter((b) => b.me < TOTAL31).map((b) => ({ id: b.id, name: b.name })),
    ...targets31(s).filter((x) => !x.never).sort((a, b) => b.prestige - a.prestige || (a.id < b.id ? -1 : 1)).slice(0, 30).map((x) => ({ id: x.id, name: x.name })),
  ],
  build: (s, t) => {
    if (t.id.startsWith('lb:')) {
      const lb = s.labels[t.id.slice(3)];
      const price = buyPrice(s, lb);
      const ceo = lb.leaderId ? personCast31(s, lb.leaderId, N('Dono do selo', 'Label owner')) : null;
      return {
        title: fmtL(N('Sala do dono · {n}', 'Owner\'s office · {n}'), { n: lb.name }),
        cast: [you31(s), ...(ceo ? [ceo] : [])],
        nums: [
          { label: N('Preço do selo inteiro', 'Price of the whole label'), value: usd(price), hint: N('Valor do selo (elenco, catálogo, dívidas) + 5%.', 'Label value (roster, catalogue, debts) + 5%.'), basis: 'calc' },
          { label: N('Elenco', 'Roster'), value: String(lb.roster.length), basis: 'fact' },
          { label: N('Caixa do selo', 'Label cash'), value: sgnUsd(lb.cash), basis: 'fact' },
        ],
        note: N('Você está sem gravadora: compra-se com o seu patrimônio pessoal, com elenco, catálogo e dívidas.', 'You have no label: you buy with personal wealth, roster, catalogue and debts included.'),
        choices: [{ id: 'label', label: N('Comprar o selo inteiro', 'Buy the whole label'), lock: null, cost: price, primary: true, effect: N('Vira a sua gravadora hoje.', 'Becomes your label today.') }],
      };
    }
    const b = ownerOfBiz(s, t.id)!;
    const o = b.o!;
    const v = bizValue31(s, t.id);
    const big = accept31(s, t.id, o, Math.min(o.sh, 5100), b.held, b);
    const choices: Choice31[] = [];
    for (const h of ['label', 'personal'] as const) for (const bp0 of SLICES31) {
      const bp = Math.min(bp0, o.sh, b.legend ? Math.max(0, 4900 - b.held) : TOTAL31);
      if (bp <= 0 || choices.some((c) => c.id === `buy:${bp}:${h}`)) continue;
      const lk = buyLock31(s, t.id, bp, h);
      choices.push({ id: `buy:${bp}:${h}`, label: fmtL(h === 'label' ? N('Propor {p} pelo selo', 'Offer for {p} via the label') : N('Propor {p} com dinheiro pessoal', 'Offer for {p} with personal money'), { p: pct31(bp) }),
        lock: lk ? { why: lk.why, unlock: lk.unlock } : null, cost: quote31(s, t.id, bp, b.held), primary: h === 'label' && bp0 === 2500,
        effect: b.held + bp > TOTAL31 / 2 ? N('Passa o controle para você (prêmio de controle no preço).', 'Hands control to you (control premium in the price).') : N('Sociedade minoritária: o acordo diz quem decide cada assunto.', 'Minority partnership: the agreement says who decides each matter.') });
    }
    const anti = antitrust31(s, t.id, Math.min(o.sh, 5100));
    return {
      title: fmtL(N('Sala do dono · {n}', 'Owner\'s office · {n}'), { n: b.name }),
      cast: [you31(s), ownerCast(s, o, N('Dono', 'Owner'), 'them', big.score), ...b.others.slice(0, 2).map((x) => ownerCast(s, x, N('Sócio dele', 'Their partner'), 'watch'))],
      nums: [
        { label: N('Negócio', 'Business'), value: fmtL(N('{k} · {c}', '{k} · {c}'), { k: SKIND31[b.kind as keyof typeof SKIND31]?.name ?? l(b.kind), c: cityById[b.city]?.name ?? b.city }), basis: 'fact' },
        { label: N('Valor do negócio', 'Business value'), value: v ? usd(v.total) : N('—', '—'), hint: N('O mesmo modelo de valor da bolsa (o que rende, prestígio e público, histórico, dívidas).', 'The same value model as the stock exchange (earnings, prestige and audience, history, debts).'), basis: 'calc' },
        { label: N('Rende por ano', 'Earns per year'), value: v ? sgnUsd(v.annual) : N('—', '—'), basis: 'calc' },
        { label: N('Sua parte hoje', 'Your stake today'), value: pct31(b.held), basis: 'fact' },
        { label: N('Disposição do dono', 'Owner\'s willingness'), value: big.ok ? N('aceita conversar', 'willing to talk') : N('resiste', 'resists'), hint: big.why[0], basis: 'calc' },
        ...(anti && anti.n > 0 ? [{ label: N('Concentração no país (controle)', 'Concentration in the country (control)'), value: fmtL(N('{n} de {m} · {p}% do público', '{n} of {m} · {p}% of the audience'), { n: anti.n, m: anti.max, p: Math.round(anti.share * 100) }), hint: N('Acima do teto, o órgão antitruste veta a compra do controle.', 'Above the cap, the antitrust authority blocks buying control.'), basis: 'calc' } as Num31] : []),
      ],
      note: b.never ? N('É uma instituição: o dono não vende nenhuma parte.', 'It is an institution: the owner will not sell any part.') : b.legend ? N('Lendário: o dono só vende até 49%.', 'Legendary: the owner sells at most 49%.') : undefined,
      choices,
    };
  },
  decide: (s, t, choice) => {
    if (t.id.startsWith('lb:')) {
      if (choice !== 'label') return INVALID();
      const e = buyLabel17(s, t.id.slice(3));
      return e ? BAD(e) : { ok: true, text: N('Negócio fechado: o selo é seu.', 'Deal closed: the label is yours.'), tone: 'good', react: mood31('ok', true, '🔑', N('Entrega as chaves', 'Hands over the keys')) };
    }
    const [k, bpS, h] = choice.split(':');
    const bp = Number(bpS);
    if (k !== 'buy' || !(bp > 0) || (h !== 'label' && h !== 'personal')) return INVALID();
    const e = buy31(s, t.id, bp, h);
    return e ? { ok: false, text: e, tone: 'bad', react: mood31('cool', true, '🙅', N('Empurra o papel de volta', 'Pushes the paper back')) }
      : { ok: true, text: fmtL(N('Negócio fechado: {p}.', 'Deal closed: {p}.'), { p: pct31(bp) }), tone: 'good', react: mood31('warm', true, '🤝', N('Aperta a sua mão', 'Shakes your hand')) };
  },
});

// ================================================================ jabá (você leva o envelope)

const st18 = (s: GameState) => (s.x4 as unknown as { radio18?: { st?: { id: string; call: string; pd: string; rel: number; reach: number; lunch?: number }[] } }).radio18?.st ?? [];
/** Trava do envelope antes do clique (as mesmas condições do payDJs). */
function payLock31(s: GameState, tier: number): Lock31 | null {
  if (!hasTech(s, 'radio')) return lock31(N('Ainda não há rádio.', 'There is no radio yet.'), UNLOCK31.year);
  if (w4(s).payola.lastWeek === s.week) return lock31(N('Já houve um envelope nesta semana.', 'There was already an envelope this week.'), UNLOCK31.wait);
  const cost = payolaCost(s, tier);
  return freeCash20(s) < cost ? lockOf31(cashWhy20(s, cost, N('Caixa insuficiente.', 'Not enough cash.')), UNLOCK31.cash) : null;
}

registerScene31({
  kind: 'jaba', label: N('Visitar a rádio (envelope)', 'Visit the station (envelope)'), icon: 'radio', room: 'radio',
  exists: (s, t) => hasTech(s, 'radio') && st18(s).some((x) => x.id === t.id),
  important: () => true,
  targets: (s) => (hasTech(s, 'radio') ? [...st18(s)].sort((a, b) => b.reach - a.reach || (a.id < b.id ? -1 : 1)).map((x) => ({ id: x.id, name: `${x.call} (${x.pd})` })) : []),
  build: (s, t) => {
    const x = jabaStation31(s, t.id)!;
    const era = payolaEra(s);
    const clear = jabaClear31(x);
    const face = jabaFace31(s, 1, x);
    const F = JABA_FACE31[face];
    const tone = face === 'eager' ? 'warm' : face === 'glance' ? 'ok' : face === 'sweat' ? 'cool' : 'cold';
    const promo = roleStaff(s, ['promoter', 'publicist']);
    const heat = w4(s).payola.heat;
    return {
      title: fmtL(N('Sala do diretor · {c}', 'Director\'s room · {c}'), { c: x.call }),
      cast: [you31(s), extra(`pd:${x.id}`, x.pd, N('Diretor de programação', 'Program director'), clear ? mood31(tone, true, F.icon, F.label) : mood31('unknown', false)), ...(promo ? [staffCast31(s, promo, 'watch')] : [])],
      nums: [
        { label: N('Época', 'Era'), value: PAYOLA_ERA_INFO[era].name, hint: PAYOLA_ERA_INFO[era].desc, basis: 'fact' },
        { label: N('Relação com o diretor', 'Relationship with the director'), value: String(Math.round(x.rel)), hint: N('Jantares e visitas sobem; envelope recusado derruba.', 'Dinners and visits raise it; a refused envelope sinks it.'), basis: 'fact' },
        { label: N('Alcance da rádio', 'Station reach'), value: `${Math.round(x.reach * 100)}`, basis: 'fact' },
        { label: N('Calor do esquema', 'Heat on the scheme'), value: heat >= 60 ? N('alto: já se fala nisso', 'high: people are talking') : heat >= 25 ? N('médio', 'medium') : N('baixo', 'low'), basis: 'calc' },
      ],
      note: clear ? N('O risco está no rosto dele: olhe antes de pôr o envelope na mesa.', 'The risk is on his face: look before you put the envelope on the desk.') : N('Você conhece pouco este diretor: o rosto não diz nada. Um jantar antes ajuda a ler.', 'You barely know this director: his face tells you nothing. A dinner first helps you read him.'),
      choices: [
        { id: 'lunch', label: fmtL(N('Jantar com {pd}', 'Dinner with {pd}'), { pd: x.pd }), lock: (x.lunch ?? -99) > s.week - 8 ? lock31(N('Vocês jantaram há pouco.', 'You dined recently.'), UNLOCK31.wait) : null, cost: money(s, 200), effect: N('Relação +8; nada ilegal.', 'Relationship +8; nothing illegal.') },
        { id: 'legit', label: N('Apresentar o repertório (visita legítima)', 'Pitch the repertoire (legit visit)'), lock: w4(s).payola.pitchWeek === s.week ? lock31(N('Você já visitou as rádios nesta semana.', 'You already visited the stations this week.'), UNLOCK31.wait) : null, cost: money(s, 500) },
        ...PAYOLA_TIERS.map((tier, i) => ({ id: `env:${i}`, label: fmtL(N('Envelope: {n}', 'Envelope: {n}'), { n: tier.name }), lock: payLock31(s, i), cost: payolaCost(s, i), danger: true,
          effect: fmtL(N('Empurrão nas rádios +{a}%; o diretor pode aceitar, recusar ou denunciar.', 'Radio push +{a}%; the director may accept, refuse or report it.'), { a: Math.round(tier.level * 100) }) }) as Choice31),
      ],
    };
  },
  decide: (s, t, choice) => {
    const x = jabaStation31(s, t.id);
    if (!x) return BAD(N('Estação inválida.', 'Invalid station.'));
    if (choice === 'lunch') { const r0 = x.rel; const r = lunchPd18(s, t.id); const ok = x.rel > r0 || (x.lunch ?? -99) === s.week; return { ok, text: r, tone: ok ? 'good' : 'bad', react: ok ? mood31('warm', true, '🍷', N('Brinda com você', 'Raises a glass with you')) : undefined }; }
    if (choice === 'legit') { const e = pitchLegit(s); return e ? BAD(e) : { ok: true, text: N('Você apresenta o repertório. Ele ouve e anota.', 'You pitch the repertoire. He listens and takes notes.'), tone: 'good', react: mood31('ok', true, '🎧', N('Põe o fone e ouve', 'Puts the headphones on')) }; }
    if (choice.startsWith('env:')) {
      const i = Number(choice.slice(4));
      if (!PAYOLA_TIERS[i]) return INVALID();
      const e = withJabaStation31(t.id, () => payDJs(s, i));
      if (!e) return { ok: true, text: fmtL(N('{pd} guarda o envelope na gaveta. As rádios vão tocar…', '{pd} slips the envelope into the drawer. The stations will play…'), { pd: x.pd }), tone: 'warn', react: mood31('warm', true, '🤫', N('Fecha a gaveta devagar', 'Closes the drawer slowly')) };
      const reported = /denunci|reported/.test(e.pt + e.en);
      return { ok: false, text: e, tone: 'bad', react: reported ? mood31('cold', true, '📞', N('Pega o telefone e liga para a imprensa', 'Picks up the phone and calls the press')) : mood31('cold', true, '🫲', N('Empurra o envelope de volta com desprezo', 'Pushes the envelope back with contempt')) };
    }
    return INVALID();
  },
});

// ================================================================ jabá na SUA rádio (você é o diretor)

function offerOf(s: GameState, id: string) {
  const [vid, oid] = id.split('|');
  const v = mediaVentures31(s).find((x) => x.id === vid);
  const o = v ? stRo31(s, v).offers.find((x) => x.id === oid) : undefined;
  return v && o ? { v, o } : null;
}
const RISK_WORD = (r: number): L => (r >= 0.7 ? N('alto: o país pune', 'high: the country punishes it') : r >= 0.4 ? N('médio', 'medium') : N('baixo: o país tolera', 'low: the country tolerates it'));

registerScene31({
  kind: 'jabain', label: N('Receber o divulgador (jabá)', 'Receive the plugger (payola)'), icon: 'radio', room: 'radio',
  exists: (s, t) => !!offerOf(s, t.id),
  important: () => true,
  targets: (s) => mediaVentures31(s).flatMap((v) => stRo31(s, v).offers.map((o) => ({ id: `${v.id}|${o.id}`, name: `${v.name}: ${s.labels[o.lab]?.name ?? '?'}` }))),
  build: (s, t) => {
    const { v, o } = offerOf(s, t.id)!;
    const lb = s.labels[o.lab];
    const rel = s.releases[o.rel];
    const risk = lawRisk31(countryOfCity(v.city) ?? 'USA', s.year);
    const lead = lb?.leaderId ? personCast31(s, lb.leaderId, fmtL(N('Divulgador de {l}', 'Plugger for {l}'), { l: lb.name })) : null;
    const plugger = lead ?? extra(`plug:${o.lab}`, lb?.name ?? '?', N('Divulgador', 'Plugger'), mood31('ok', true, '💼', N('Põe o envelope na mesa', 'Puts the envelope on the desk')));
    const clearRead = lb?.leaderId ? know3(know(s, lb.leaderId)) >= 2 : false;
    return {
      title: fmtL(N('A sua rádio · {n}', 'Your station · {n}'), { n: v.name }),
      cast: [{ ...you31(s), part: N('Você (diretor)', 'You (director)') }, { ...plugger, mood: clearRead ? personMood31(s, lb!.leaderId!) : plugger.mood }],
      nums: [
        { label: N('No envelope', 'In the envelope'), value: usd(o.amt), basis: 'fact' },
        { label: N('A faixa', 'The track'), value: rel ? fmtL(N('"{t}" — {a}', '"{t}" — {a}'), { t: rel.title, a: s.acts[rel.actId]?.name ?? '' }) : N('—', '—'), basis: 'fact' },
        { label: N('O que ele pede', 'What they ask'), value: N('rotação pesada', 'heavy rotation'), basis: 'fact' },
        { label: N('Risco legal no país', 'Legal risk in the country'), value: RISK_WORD(risk), hint: N('Pela lei do país e pela época; aceitar esquenta a sua rádio.', 'By the country\'s law and the era; accepting heats up your station.'), basis: 'calc' },
        { label: N('Credibilidade da rádio', 'Station credibility'), value: String(Math.round(v.rep)), basis: 'fact' },
      ],
      choices: [
        { id: 'yes', label: N('Aceitar o envelope', 'Take the envelope'), lock: null, danger: true, effect: N('Entra o dinheiro; a faixa vai para a rotação pesada; o risco legal sobe.', 'The money comes in; the track goes to heavy rotation; the legal risk rises.') },
        { id: 'no', label: N('Recusar', 'Refuse'), lock: null, primary: true, effect: N('Credibilidade +0,5; o selo dele fica sentido.', 'Credibility +0.5; their label takes it badly.') },
      ],
    };
  },
  decide: (s, t, choice) => {
    const x = offerOf(s, t.id);
    if (!x) return BAD(N('A proposta já venceu.', 'The offer has expired.'));
    if (choice !== 'yes' && choice !== 'no') return INVALID();
    const e = answerJaba31(s, x.v.id, x.o.id, choice === 'yes');
    if (e) return BAD(e);
    return choice === 'yes'
      ? { ok: true, text: N('Envelope aceito: a faixa entra em rotação pesada.', 'Envelope taken: the track goes into heavy rotation.'), tone: 'warn', react: mood31('warm', true, '😏', N('Sorri e aperta a sua mão', 'Smiles and shakes your hand')) }
      : { ok: true, text: N('Você recusa. O divulgador recolhe o envelope.', 'You refuse. The plugger takes the envelope back.'), tone: 'good', react: mood31('cool', true, '😒', N('Recolhe o envelope, contrariado', 'Takes the envelope back, annoyed')) };
  },
});

export const W31_KINDS = ['release', 'bank', 'buy', 'jaba', 'jabain'] as const;
