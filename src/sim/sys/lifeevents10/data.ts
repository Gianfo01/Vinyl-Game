// Eventos de vida pessoal (rodada 10): definições. Texto em {a} ato, {p} pessoa, {k} filho, {x} parceiro(a), {lab} selo rival.
// Pesos dependem do personagem (traços, estilo de vida, patrimônio, saúde/estresse, família, vícios, idade, época,
// política/religião, fama e situação do selo). Custos em dólares reais; "energy" é tempo livre do mês (5 unidades).

import type { Rng } from '../../../core/rng';
import type { ViceId } from '../vices';
import { l, type L } from '../../../data/world';
import { polById, isDevout, isPolitical, isStrict, viewsOf, type PolId } from '../../beliefs';
import type { GameState } from '../../types';
import { fmtL } from '../../util';
import { names, type Ch, type Def, type Env, type Fx, type LeCtx } from '../lifeevents10';

const T = (pt: string, en: string) => (s: GameState, c: LeCtx): L => fmtL(l(pt, en), names(s, c));
const C = (id: string, pt: string, en: string, fx: Fx, rpt: string, ren: string, o: Partial<Ch> & { nt?: [string, string] } = {}): Ch => {
  const { nt, ...rest } = o;
  return { id, label: l(pt, en), fx, res: l(rpt, ren), ...(nt ? { note: l(nt[0], nt[1]) } : {}), ...rest };
};
const has = (e: Env, t: string): boolean => e.traits.includes(t);
const attrNeed = (k: 'ear' | 'negotiation' | 'charisma' | 'management', n: number) => (e: Env): L | null =>
  e.o.attrs[k] >= n ? null : l(`Exige ${k} ${n}+.`, `Requires ${k} ${n}+.`);
const needPartner = (e: Env): L | null => (e.partner ? null : l('Exige um(a) parceiro(a).', 'Requires a partner.'));
const actCtx = (e: Env, r: Rng): LeCtx | null => {
  if (!e.acts.length) return null;
  const a = r.pick(e.acts);
  const pid = a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0];
  return pid ? { act: a.id, pid } : null;
};

/** Local de culto/comunidade conforme a religião. */
const placeOf = (rel: string): L => rel === 'catholic' ? l('a paróquia', 'the parish') : rel === 'evangelical' ? l('a congregação', 'the congregation') : rel === 'jewish' ? l('a sinagoga', 'the synagogue')
  : rel === 'muslim' ? l('a mesquita', 'the mosque') : rel === 'umbanda' ? l('o terreiro', 'the terreiro') : rel === 'spiritist' ? l('o centro espírita', 'the spiritist centre') : rel === 'buddhist' ? l('o templo', 'the temple')
  : rel === 'hindu' ? l('o templo hindu', 'the Hindu temple') : l('a comunidade', 'the community');

export const EVENTS: Def[] = [
  // ------------------------------------------------------------------ família
  { id: 'baby_news', name: l('Notícia na família', 'News in the family'), cool: 30, w: (e) => e.partner && e.age < 46 && e.kids < 3 && (e.partner.stage !== 'dating' || e.partner.since < 9999) && e.partner.affinity > 55 ? 1.6 + (has(e, 'romantic') ? 0.8 : 0) + (e.ls === 'familia' ? 1 : 0) : 0,
    text: T('{x} chega em casa com um teste na mão e um sorriso nervoso: vem um bebê aí, no meio da agenda mais cheia do ano.', '{x} comes home with a test in hand and a nervous smile: a baby is on the way, in the middle of your busiest year.'),
    def: 'work', ch: [
      C('leave', 'Reorganizar a agenda e ficar perto', 'Rework the schedule and stay close', { love: 12, st: -6, h: 2 }, 'Vocês passam a gravidez juntos. O selo sobrevive sem você por algumas semanas.', 'You spend the pregnancy together. The label survives without you for a few weeks.', { energy: 2, next: { ev: 'baby_born', m: 8 }, nt: ['Custa tempo; o vínculo cresce muito.', 'Costs time; the bond grows a lot.'] }),
      C('prep', 'Comprar tudo e contratar ajuda', 'Buy everything and hire help', { w: -3500, love: 6, st: -2 }, 'O quarto fica pronto e a babá, contratada.', 'The nursery is ready and the nanny hired.', { next: { ev: 'baby_born', m: 8 } }),
      C('work', 'Seguir trabalhando como sempre', 'Keep working as usual', { love: -6, st: 5, com: 1 }, 'Você promete compensar depois. {x} anota a promessa.', 'You promise to make up for it later. {x} writes the promise down.', { next: { ev: 'baby_born', m: 8 } }),
    ] },
  { id: 'baby_born', name: l('O bebê nasceu', 'The baby is here'), cool: 0, chain: true, w: () => 0,
    text: T('Nasceu. Pequeno, barulhento e perfeito. O telefone do selo vai tocar sem você hoje.', 'It is born. Tiny, loud and perfect. The label phone will ring without you today.'),
    def: 'brief', ch: [
      C('week', 'Tirar uma semana inteira', 'Take a whole week', { baby: 1, love: 8, st: -10, kidBond: 4 }, 'Uma semana de fraldas e silêncio. Você volta outra pessoa.', 'A week of diapers and silence. You come back a different person.', { energy: 1 }),
      C('brief', 'Passar dois dias e voltar', 'Take two days and return', { baby: 1, love: 2, st: 2 }, 'Dois dias bastaram para se apaixonar de novo, e para a pilha de contratos crescer.', 'Two days were enough to fall in love again, and for the contract pile to grow.'),
    ] },
  { id: 'kid_trouble', name: l('Problema com o filho', 'Trouble with your child'), cool: 12, w: (e) => (e.kids > 0 ? 1.2 + (has(e, 'workaholic') ? 0.8 : 0) : 0),
    pick: (e) => { const ks = e.o.kids.map((k, i) => ({ k, i })).filter((x) => e.year - x.k.born >= 7 && e.year - x.k.born <= 19); return ks.length ? { kid: ks[ks.length - 1].i } : null; },
    text: T('A escola ligou: {k} se meteu numa briga feia. Ou, como o diretor prefere dizer, "numa situação".', 'School called: {k} got into an ugly fight. Or, as the principal prefers to say, "a situation".'),
    def: 'ignore', ch: [
      C('talk', 'Largar tudo e conversar de verdade', 'Drop everything and really talk', { kidBond: 10, st: -3 }, '{k} chorou, você ouviu. Algo se consertou.', '{k} cried, you listened. Something got fixed.', { energy: 2 }),
      C('pay', 'Pagar o conserto e um colégio melhor', 'Pay for damages and a better school', { w: -2500, kidBond: 3, st: 2 }, 'O problema some do boletim, não da cabeça de {k}.', 'The problem leaves the report card, not {k}\'s head.'),
      C('ignore', 'Pedir ao assistente para resolver', 'Ask your assistant to handle it', { kidBond: -8, st: 4 }, '{k} entendeu o recado: o trabalho vem primeiro.', '{k} got the message: work comes first.'),
    ] },
  { id: 'parent_ill', name: l('Mãe ou pai no hospital', 'Parent in the hospital'), cool: 40, w: (e) => (e.age >= 35 ? 0.8 + (e.age - 35) * 0.04 : 0),
    text: T('Telefonema no meio da tarde: seu pai (ou sua mãe) foi internado. Os médicos falam em "acompanhar".', 'Mid-afternoon phone call: your father (or mother) was admitted. Doctors say they will "keep watching".'),
    def: 'flowers', ch: [
      C('visit', 'Ir para lá e ficar', 'Go there and stay', { st: 5, h: -2, love: 3, arts: -1 }, 'Você fica à cabeceira dias a fio. Cansa, mas é a coisa certa.', 'You sit by the bedside for days. Tiring, but right.', { energy: 3, odds: { p: 0.25, fx: { st: 12, h: -3 }, res: l('A recuperação foi longa e dolorosa; você aprendeu a se despedir.', 'The recovery was long and painful; you learned to say goodbye.') } }),
      C('private', 'Pagar o melhor hospital da cidade', 'Pay for the best hospital in town', { w: -6000, st: -2 }, 'O melhor hospital muda o prognóstico. Seu pai agradece com poucas palavras.', 'The best hospital changes the prognosis. Your father thanks you in few words.'),
      C('flowers', 'Mandar flores e prometer ir', 'Send flowers and promise to come', { st: 3 }, 'Você prometeu ir no fim de semana. Os fins de semana passaram.', 'You promised to go at the weekend. The weekends passed.', { next: { ev: 'parent_funeral', m: 4, p: 0.45 } }),
    ] },
  { id: 'parent_funeral', name: l('A despedida', 'The farewell'), cool: 0, chain: true, w: () => 0,
    text: T('Não deu tempo. A família se reúne na cerimônia e você chega tarde, com o celular ainda vibrando.', 'There was not enough time. The family gathers for the service and you arrive late, phone still buzzing.'),
    def: 'sit', ch: [
      C('speak', 'Subir e falar algumas palavras', 'Step up and say a few words', { st: -2, art: 1, h: -1 }, 'Você fala pouco e acerta. Alguém chora no fundo.', 'You speak little and get it right. Someone weeps at the back.'),
      C('sit', 'Ficar quieto no fundo', 'Stay quietly at the back', { st: 8 }, 'A culpa fica com você por meses.', 'The guilt stays with you for months.'),
    ] },
  { id: 'inheritance', name: l('Herança', 'Inheritance'), once: true, cool: 999, w: (e) => (e.age >= 44 ? 0.9 : 0),
    text: T('Um tio distante morreu e deixou algo para você. O advogado marcou hora e fala em "valores e um imóvel".', 'A distant uncle died and left you something. The lawyer booked a time and speaks of "funds and a property".'),
    def: 'take', ch: [
      C('take', 'Aceitar tudo', 'Accept everything', { w: 9000, st: 1 }, 'O dinheiro entra; a família comenta.', 'The money comes in; the family talks.'),
      C('share', 'Dividir com os primos', 'Split with the cousins', { w: 3500, arts: 1, st: -3 }, 'Poucos fazem isso. A história corre e rende simpatia.', 'Few do this. The story spreads and earns sympathy.'),
      C('label', 'Injetar no selo', 'Put it into the label', { cash: 7000, st: 1 }, 'O caixa do selo respira um pouco mais.', 'The label cash breathes a little easier.'),
    ] },
  { id: 'wedding_invite', name: l('Convite de casamento', 'Wedding invitation'), cool: 14, w: (e) => 1.1 + (e.ls === 'jetsetter' ? 0.6 : 0),
    pick: (e, r) => (e.acts.length ? actCtx(e, r) : {}),
    text: (s, c) => (c.act ? fmtL(l('O vocalista de {a} vai se casar e quer você na festa — com direito a discurso.', 'The frontperson of {a} is getting married and wants you at the party, speech included.'), names(s, c)) : l('Um velho amigo da cena vai se casar e quer você como padrinho.', 'An old friend from the scene is getting married and wants you as best man.')),
    def: 'skip', ch: [
      C('go', 'Ir e fazer o discurso', 'Go and give the speech', { w: -500, mor: 12, arts: 2, st: -3 }, 'Você acerta o tom, a festa vai até o amanhecer e todos se lembram.', 'You hit the right tone, the party runs until dawn and everyone remembers.', { energy: 1 }),
      C('gift', 'Mandar um presente caro', 'Send an expensive gift', { w: -800, mor: 3 }, 'O presente chegou antes do bolo; faltou você.', 'The gift arrived before the cake; you were missed.'),
      C('skip', 'Declinar, a agenda não deixa', 'Decline, the schedule won\'t allow it', { mor: -5, res: 3, cash: 1500 }, 'A agenda rendeu, mas a ausência foi notada.', 'The schedule paid off, but your absence was noticed.'),
    ] },
  { id: 'propose_hint', name: l('Indireta no jantar', 'A hint at dinner'), cool: 24, w: (e) => (e.partner && e.partner.stage === 'dating' && e.partner.affinity > 60 ? 1.4 : 0),
    text: T('{x} deixou um catálogo de alianças "esquecido" na mesa. Não precisa ser gênio para entender.', '{x} left a ring catalogue "forgotten" on the table. You do not need to be a genius.'),
    def: 'wait', ch: [
      C('ring', 'Propor casamento', 'Propose', { w: -2500, engage: 1, love: 18, st: -4 }, '{x} disse sim antes de você terminar a frase.', '{x} said yes before you finished the sentence.', { energy: 1 }),
      C('wait', 'Pedir mais tempo', 'Ask for more time', { love: -6, st: 3 }, 'Nada é dito, tudo é sentido.', 'Nothing is said, everything is felt.'),
      C('break', 'Ser honesto: não é isso que você quer', 'Be honest: this is not what you want', { breakup: 1, st: 10, h: -2 }, 'Foi sincero e doloroso. {x} vai embora de cabeça erguida.', 'It was honest and painful. {x} leaves with head held high.'),
    ] },
  { id: 'partner_fight', name: l('Briga em casa', 'A fight at home'), cool: 10, w: (e) => (e.partner ? 0.9 + (e.stress > 55 ? 0.9 : 0) + (has(e, 'workaholic') ? 0.8 : 0) - (e.ls === 'familia' ? 0.5 : 0) : 0),
    text: T('{x} diz que só conhece você pelos recados de voz. A discussão começa na cozinha e vai longe.', '{x} says they only know you through voice messages. The argument starts in the kitchen and goes far.'),
    def: 'double', ch: [
      C('stay', 'Cancelar compromissos e ficar', 'Cancel commitments and stay', { love: 12, st: -4, com: -1 }, 'Vocês conversam até tarde. O telefone toca e ninguém atende.', 'You talk late. The phone rings and nobody answers.', { energy: 2 }),
      C('gift', 'Pedir desculpas com um presente', 'Apologise with a gift', { w: -600, love: 4, st: -1 }, 'O presente suaviza, não resolve.', 'The gift softens, does not solve.'),
      C('double', 'Dizer que o trabalho é isso mesmo', 'Say that work is just like this', { love: -10, st: 6, cash: 1200 }, 'Você ganhou a reunião e perdeu a noite.', 'You won the meeting and lost the night.'),
    ] },
  { id: 'divorce_threat', name: l('Ultimato', 'Ultimatum'), cool: 18, w: (e) => (e.married && e.partner!.affinity < 40 ? 2.2 : 0),
    text: T('{x} deixa a mala ao lado da porta: "ou a gente muda, ou eu vou".', '{x} sets a suitcase by the door: "either we change, or I go".'),
    def: 'time', ch: [
      C('therapy', 'Terapia de casal (e cumprir as sessões)', 'Couples therapy (and actually attend)', { w: -1500, love: 14, st: -5 }, 'Doze sessões depois, vocês ainda estão juntos, e conversando.', 'Twelve sessions later you are still together, and talking.', { energy: 2 }),
      C('time', 'Prometer reduzir a agenda', 'Promise to cut down the schedule', { love: 7, com: -2, st: -2 }, 'A promessa vale por um tempo. O selo sente.', 'The promise holds for a while. The label feels it.'),
      C('go', 'Deixar ir', 'Let go', { breakup: 1, st: 10, h: -3 }, 'A casa fica grande demais. O divórcio sai caro e silencioso.', 'The house gets too large. The divorce is expensive and quiet.'),
    ] },
  { id: 'family_dinner', name: l('Jantar de domingo', 'Sunday dinner'), cool: 18, w: (e) => 0.6 + (e.v.eng > 55 ? 0.9 : 0) + (e.v.dev > 70 ? 0.8 : 0),
    pick: (e, r) => ({ n: r.int(-2, 2) }),
    text: (s, c) => { const v = viewsOf(s, 'player'); return fmtL(l('Num almoço de família, um parente solta uma opinião {side} sobre {t}. A mesa silencia e todos olham para você.', 'At a family lunch a relative drops a {side} opinion about {t}. The table goes quiet and everyone looks at you.'), { side: ((c.n ?? 0) < 0 ? 'de esquerda' : (c.n ?? 0) > 0 ? 'de direita' : 'radical'), t: v.dev > 60 && v.rel !== 'none' ? 'a fé' : 'a política' }); },
    def: 'subject', ch: [
      C('argue', 'Responder à altura', 'Answer back strongly', { eng: 6, st: 4, arts: 0 }, 'A discussão esquenta. Você sai com razão e sem sobremesa.', 'It gets heated. You leave right and without dessert.', { dyn: (s, c) => ({ love: (c.n ?? 0) * (polById[viewsOf(s, 'player').pol].axis) > 0 ? 2 : -3 }) }),
      C('subject', 'Mudar de assunto com humor', 'Change the subject with humour', { st: -1 }, 'Você salva o almoço com uma piada sobre o cachorro.', 'You save lunch with a joke about the dog.', { gate: attrNeed('charisma', 40) }),
      C('leave', 'Levantar e sair', 'Get up and leave', { st: 2, eng: 2, kidBond: -2 }, 'Silêncio no carro. Ninguém liga por uma semana.', 'Silence in the car. Nobody calls for a week.'),
    ] },
  { id: 'old_friend', name: l('Velho amigo pede ajuda', 'An old friend asks for help'), cool: 20, w: (e) => 1 + (has(e, 'generous') ? 0.6 : 0) + (e.fame > 40 ? 0.5 : 0),
    text: T('Do tempo da primeira banda, ele está quebrado e pede um empréstimo e uma vaga de trabalho.', 'From the first-band days, he is broke and asks for a loan and a job.'),
    def: 'refuse', ch: [
      C('loan', 'Emprestar dinheiro', 'Lend money', { w: -3000, st: -3, arts: 1 }, 'O dinheiro sai do seu bolso; talvez volte.', 'The money leaves your pocket; it may come back.', { next: { ev: 'friend_repaid', m: 5, p: 0.55 } }),
      C('job', 'Dar um emprego no selo', 'Give him a label job', { st: 3, cash: -300 }, 'Ele aprende rápido e vira peça-chave da equipe.', 'He learns fast and becomes a key team member.', { energy: 1, odds: { p: 0.35, fx: { st: 6, arts: -1 }, res: l('Ele chegou atrasado três vezes e brigou com o estagiário. Você teve que demitir um amigo.', 'He arrived late three times and fought with the intern. You had to fire a friend.') } }),
      C('refuse', 'Recusar com firmeza', 'Refuse firmly', { arts: -1, st: 3 }, 'Poupa dinheiro e energia; deixa uma ferida na cena.', 'Saves money and energy; leaves a wound on the scene.'),
    ] },
  { id: 'friend_repaid', name: l('O amigo voltou', 'The friend returns'), cool: 0, chain: true, w: () => 0,
    text: T('O velho amigo bate à porta com um envelope: o empréstimo, com juros, e uma música gravada em fita só para você.', 'The old friend knocks with an envelope: the loan with interest, and a tape with a song just for you.'),
    def: 'ok', ch: [
      C('ok', 'Abraçar e ouvir a fita', 'Hug him and play the tape', { w: 4500, arts: 1, st: -4, art: 1 }, 'A música é boa. Você guarda a fita na gaveta das coisas que importam.', 'The song is good. You keep the tape in the drawer of things that matter.'),
      C('half', 'Recusar os juros e pagar um jantar', 'Waive the interest and buy dinner', { w: 3000, arts: 2, st: -5 }, 'Vocês riem a noite toda. A amizade vale mais que os juros.', 'You laugh all night. The friendship is worth more than the interest.'),
    ] },

  // ------------------------------------------------------------------ saúde
  { id: 'burnout', name: l('Exaustão', 'Burnout'), cool: 14, w: (e) => (e.stress > 55 ? 1 + (e.stress - 55) / 12 + (has(e, 'workaholic') ? 1 : 0) : e.stress > 40 ? 0.2 : 0),
    text: T('Meses de estrada e planilha cobram a conta. Você acorda sem conseguir levantar da cama.', 'Months of road and spreadsheets collect. You wake up unable to leave the bed.'),
    def: 'push', ch: [
      C('rest', 'Duas semanas de folga completas', 'Two full weeks off', { h: 12, st: -26, art: -1 }, 'Duas semanas sem telefone. A imprensa nota; o corpo agradece.', 'Two weeks without a phone. Press notices; your body is grateful.', { energy: 2 }),
      C('clinic', 'Clínica de repouso', 'Rest clinic', { w: -6000, h: 20, st: -36 }, 'Caro, discreto e eficaz.', 'Pricey, discreet and effective.', { energy: 1 }),
      C('push', 'Continuar a toda', 'Keep pushing', { cash: 3000, st: 8 }, 'O caixa agradece; o corpo anota a dívida.', 'The cash is grateful; your body notes the debt.', { next: { ev: 'collapse', m: 2, p: 0.8 } }),
    ] },
  { id: 'collapse', name: l('O corpo cobrou', 'Your body collected'), cool: 0, chain: true, w: () => 0,
    text: T('Você desabou no estúdio, no meio de uma reunião. Ambulância, soro e um médico com cara de poucos amigos.', 'You collapsed in the studio mid-meeting. Ambulance, drip and a doctor with little patience.'),
    def: 'rest', ch: [
      C('rest', 'Obedecer: repouso absoluto', 'Obey: complete rest', { h: -4, st: -14, art: -1, ins: -1 }, 'Duas semanas parado. O selo anda sozinho, mal.', 'Two weeks down. The label runs on its own, poorly.', { energy: 2 }),
      C('hide', 'Esconder da imprensa e voltar', 'Hide it from the press and return', { h: -14, st: 6, w: -800 }, 'Ninguém soube. Seu corpo, sim.', 'Nobody knew. Your body did.'),
    ] },
  { id: 'accident', name: l('Acidente', 'Accident'), cool: 30, w: (e) => 0.6 + (e.ls === 'festeiro' ? 0.5 : 0) + (e.dep > 30 ? 0.6 : 0),
    text: T('Uma freada, um vidro, um susto: você se envolve num acidente de trânsito a caminho do estúdio.', 'A skid, shattered glass, a scare: you are in a traffic accident on the way to the studio.'),
    def: 'public', ch: [
      C('private', 'Hospital particular e fisioterapia', 'Private hospital and physiotherapy', { w: -4000, h: -3, st: 2 }, 'Você se recupera rápido e sem sequelas.', 'You recover fast, no aftereffects.', { energy: 1 }),
      C('public', 'Atendimento básico e repouso em casa', 'Basic care and rest at home', { h: -9, st: 4 }, 'A recuperação é lenta; o joelho avisa quando vai chover.', 'Recovery is slow; the knee warns when it will rain.', { energy: 1 }),
      C('push', 'Engessado, mas indo à reunião', 'In a cast, but going to the meeting', { h: -14, st: 8, arts: 1 }, 'Você aparece de muletas e vira exemplo para uns, loucura para outros.', 'You show up on crutches and become an example to some, madness to others.'),
    ] },
  { id: 'checkup', name: l('Exame de rotina', 'Routine checkup'), cool: 30, w: (e) => (e.age >= 38 ? 0.6 + (e.age - 38) * 0.05 + (e.health < 60 ? 0.8 : 0) : 0),
    text: T('O médico olha o resultado, depois olha para você: "vamos repetir alguns exames".', 'The doctor looks at the results, then at you: "let us repeat some tests".'),
    def: 'ignore', ch: [
      C('exam', 'Fazer todos os exames agora', 'Do all the tests now', { w: -900, h: 4, st: 3 }, 'Pegaram a tempo. Dieta, remédio e menos cigarro.', 'They caught it in time. Diet, medicine and fewer cigarettes.', { energy: 1 }),
      C('change', 'Mudar o estilo de vida', 'Change your lifestyle', { h: 8, st: -5, lose: 'smoker' }, 'Caminhadas, cama cedo, nada de fumar. Dói; funciona.', 'Walks, early bed, no smoking. It hurts; it works.', { energy: 2 }),
      C('ignore', 'Deixar para depois', 'Leave it for later', { st: 2, h: -3 }, 'Você jura que vai remarcar.', 'You swear you will reschedule.'),
    ] },
  { id: 'vice_warning', name: l('A conversa', 'The talk'), cool: 18, w: (e) => (e.dep > 28 ? 1.2 + e.dep / 40 : 0),
    text: T('Dois amigos e seu médico pedem para falar com você. Ninguém sorri. Todos conhecem a razão.', 'Two friends and your doctor ask to talk. Nobody smiles. They all know why.'),
    def: 'deny', ch: [
      C('rehab', 'Aceitar ajuda: tratamento', 'Accept help: treatment', { w: -5000, h: 10, st: -8, dep: ['drink', -25], arts: 2 }, 'Foi a decisão mais difícil do ano. E a melhor.', 'The hardest decision of the year. And the best.', { energy: 2, dyn: () => ({ dep: ['drugs', -25] as [ViceId, number] }) }),
      C('cut', 'Prometer diminuir sozinho', 'Promise to cut down alone', { st: 4, dep: ['drink', -8] }, 'Funciona por algumas semanas.', 'It works for a few weeks.'),
      C('deny', 'Negar e mudar de amigos', 'Deny it and change friends', { st: 6, arts: -2, h: -3 }, 'Você perdeu a única plateia que dizia a verdade.', 'You lost the only audience that told the truth.'),
    ] },
  { id: 'panic', name: l('Crise de ansiedade', 'Panic attack'), cool: 16, w: (e) => (e.stress > 70 ? 1.8 : 0),
    text: T('Coração disparado, mãos frias, o salão rodando: no meio de um evento do selo, a ansiedade vem de uma vez.', 'Racing heart, cold hands, the room spinning: in the middle of a label event, anxiety hits at once.'),
    def: 'push', ch: [
      C('leave', 'Sair e respirar', 'Step out and breathe', { st: -10, art: -1 }, 'Alguém te leva para tomar ar. Os outros comentam sem saber.', 'Someone takes you out for air. Others comment without knowing.'),
      C('therapist', 'Marcar uma terapeuta de verdade', 'Book a real therapist', { w: -1200, st: -18, h: 3 }, 'A terapia ajuda a nomear o que antes era só pânico.', 'Therapy helps name what was once only panic.', { energy: 1 }),
      C('push', 'Engolir seco e continuar', 'Swallow it and carry on', { h: -6, st: 6 }, 'Você terminou o evento. Pagou depois.', 'You finished the event. Paid for it later.'),
    ] },

  // ------------------------------------------------------------------ dinheiro
  { id: 'bad_tip', name: l('Dica de investimento', 'Investment tip'), cool: 18, w: (e) => (e.wealth > 15000 ? 1.1 + (has(e, 'greedy') ? 0.8 : 0) + (has(e, 'frugal') ? -0.5 : 0) : 0),
    text: (s) => s.year >= 2017 ? l('Um conhecido jura que uma nova moeda digital vai "dobrar até o fim do mês".', 'An acquaintance swears a new digital coin will "double by month end".')
      : s.year >= 1996 && s.year <= 2001 ? l('Um amigo do mercado garante: toda empresa de internet vai valer dez vezes mais até o ano que vem.', 'A market friend assures you: every internet company will be worth ten times as much next year.')
      : s.year >= 1980 && s.year <= 1989 ? l('Um corretor traz títulos de alto retorno de uma empresa "imbatível".', 'A broker brings high-yield bonds from an "unbeatable" company.') : l('Um conhecido sussurra sobre um terreno que vai valorizar quando a avenida passar.', 'An acquaintance whispers about land that will soar when the avenue goes through.'),
    def: 'no', ch: [
      C('big', 'Apostar alto', 'Bet big', { w: -8000, st: 4 }, 'A aposta rendeu: o dobro, e uma dor de cabeça com o fisco.', 'The bet paid: double, and a headache with the taxman.', { odds: { p: 0.62, fx: { st: 8, arts: 0 }, res: l('A bolha estourou, levando o dinheiro e o orgulho.', 'The bubble burst, taking the money and the pride.') }, dyn: () => ({ w: 16000 }) }),
      C('small', 'Apostar um pouco', 'Bet a little', { w: -1500 }, 'Um resultado mediano, sem lição nem prêmio.', 'A middling result, no lesson and no prize.', { odds: { p: 0.45, fx: { st: 2 }, res: l('Foi perdido. Pelo menos foi pouco.', 'It was lost. At least it was little.') }, dyn: () => ({ w: 2400 }) }),
      C('no', 'Declinar e seguir o plano', 'Decline and stick to the plan', { st: -1 }, 'Você dorme tranquilo.', 'You sleep soundly.'),
    ] },
  { id: 'tax_audit', name: l('Auditoria fiscal', 'Tax audit'), cool: 36, w: (e) => (e.wealth > 40000 || e.cash > 80000 ? 0.8 + (has(e, 'schemer') ? 0.7 : 0) : 0),
    text: T('Dois fiscais com pastas finas e olhares longos chegam à sede: "só uma conferência de rotina".', 'Two inspectors with thin folders and long stares arrive at HQ: "just a routine check".'),
    def: 'pay', ch: [
      C('acct', 'Contratar um bom contador', 'Hire a good accountant', { w: -2500, st: 2 }, 'O contador cuida de tudo; a multa vem pequena.', 'The accountant handles everything; the fine is small.', { energy: 1 }),
      C('pay', 'Pagar a multa e encerrar', 'Pay the fine and close it', { cash: -4500, st: 3 }, 'Resolvido, caro e rápido.', 'Settled, expensive and quick.'),
      C('bluff', 'Blefar e contestar', 'Bluff and contest', { st: 5 }, 'O blefe funcionou: o processo foi arquivado.', 'The bluff worked: the case was dropped.', { gate: attrNeed('negotiation', 50), odds: { p: 0.42, fx: { cash: -12000, st: 10, ins: -3 }, res: l('O blefe falhou: multa triplicada e manchete no jornal.', 'The bluff failed: tripled fine and a newspaper headline.') } }),
    ] },
  { id: 'scam', name: l('Golpe', 'Scam'), cool: 20, w: (e) => 0.8 + (e.fame > 35 ? 0.4 : 0),
    text: (s) => s.year >= 2005 ? l('Um e-mail urgente do "banco" pede que você confirme seus dados antes que a conta seja bloqueada.', 'An urgent e-mail from the "bank" asks you to confirm your details before the account is blocked.') : l('Um homem muito educado liga oferecendo um "contrato de licenciamento exclusivo" no exterior — só falta um depósito.', 'A very polite man phones offering an "exclusive licensing deal" abroad; all that is missing is a deposit.'),
    def: 'ignore', ch: [
      C('lawyer', 'Mandar o advogado conferir', 'Have the lawyer check', { w: -250, st: -1 }, 'O advogado achou o golpe em dez minutos.', 'The lawyer found the scam in ten minutes.'),
      C('pay', 'Pagar para ver', 'Pay to see', { w: -3000, st: 4 }, 'Era golpe. Você aprende (de novo).', 'It was a scam. You learn (again).', { odds: { p: 0.15, fx: { st: 0 }, res: l('Era real, e rendeu uma boa parceria.', 'It was real, and led to a good partnership.') }, dyn: () => ({}) }),
      C('ignore', 'Ignorar', 'Ignore it', { st: 0 }, 'A caixa de entrada engole o assunto.', 'The inbox swallows the matter.'),
    ] },
  { id: 'house_trouble', name: l('Problema em casa', 'Trouble at home'), cool: 24, w: () => 0.6,
    text: T('Cano estourado, teto com mofo e o orçamento do reparo em cima da mesa.', 'Burst pipe, a mouldy ceiling and the repair estimate on the table.'),
    def: 'patch', ch: [
      C('fix', 'Reformar de verdade', 'Renovate properly', { w: -5000, st: -3 }, 'A casa fica melhor do que era.', 'The house is better than it was.'),
      C('patch', 'Remendar', 'Patch it up', { w: -700, st: 3 }, 'Resolve por uma estação.', 'Holds for a season.'),
    ] },
  { id: 'royalty', name: l('Direitos inesperados', 'Unexpected royalties'), cool: 30, w: (e) => (e.acts.length || e.fame > 25 ? 0.7 : 0),
    text: T('Uma música antiga ganhou vida nova: foi usada num comercial e os direitos chegam de uma vez.', 'An old song got new life: it was used in a commercial and the rights arrive at once.'),
    def: 'take', ch: [
      C('take', 'Receber e agradecer', 'Collect and say thanks', { w: 6000 }, 'Dinheiro bom, e que ninguém esperava.', 'Good money, and nobody expected it.'),
      C('haggle', 'Renegociar a licença', 'Renegotiate the licence', { w: 9500, st: 2 }, 'Você arrancou um percentual melhor.', 'You wrung out a better percentage.', { gate: attrNeed('negotiation', 55), energy: 1 }),
      C('give', 'Doar para os músicos da cena', 'Donate to the scene\'s musicians', { w: 1000, arts: 3, art: 2 }, 'A cena nunca esquece esse tipo de gesto.', 'The scene never forgets such gestures.'),
    ] },
  { id: 'luxury', name: l('Tentação de luxo', 'Luxury temptation'), cool: 20, w: (e) => (e.wealth > 50000 ? 1 + (e.ls === 'jetsetter' ? 0.8 : 0) - (has(e, 'frugal') ? 0.7 : 0) : 0),
    text: T('Um vendedor sorridente mostra o carro, a lancha, o relógio dos sonhos. "Para quem chegou onde você chegou."', 'A smiling salesman shows the car, the yacht, the dream watch. "For someone who got where you got."'),
    def: 'no', ch: [
      C('buy', 'Comprar', 'Buy it', { w: -20000, fame: 3, st: -6, com: 1 }, 'A foto vira capa de revista e inveja de colega.', 'The photo becomes a magazine cover and colleagues\' envy.'),
      C('invest', 'Investir no selo em vez disso', 'Invest in the label instead', { w: -8000, cash: 7000, ins: 1 }, 'O selo ganha, o ego espera.', 'The label gains, the ego waits.'),
      C('no', 'Recusar educadamente', 'Politely refuse', { st: -2 }, 'Você sai da loja mais leve.', 'You leave the shop lighter.'),
    ] },

  // ------------------------------------------------------------------ social
  { id: 'star_party', name: l('Festa com uma estrela', 'Party with a star'), cool: 8, w: (e) => 0.9 + (e.ls === 'festeiro' || e.ls === 'jetsetter' ? 1 : 0) + (has(e, 'bohemian') ? 0.6 : 0) + e.fame / 90 - (has(e, 'shy') ? 0.5 : 0),
    text: (s) => l(`Convite dourado: uma das maiores estrelas da ${s.year >= 2000 ? 'cena internacional' : 'época'} dá uma festa na cobertura, e a lista é curta.`, `Golden invitation: one of the biggest stars of the ${s.year >= 2000 ? 'international scene' : 'day'} throws a party in the penthouse, and the list is short.`),
    def: 'brief', ch: [
      C('go', 'Ir e ficar até o fim', 'Go and stay to the end', { w: -400, fame: 3, art: 1, h: -4, st: -6, arts: 1 }, 'Você sai ao amanhecer com três contatos novos e um telefone de produtor.', 'You leave at dawn with three new contacts and a producer\'s number.', { energy: 1 }),
      C('brief', 'Passar só uma hora', 'Drop by for an hour', { fame: 1, st: -2 }, 'Um aperto de mão, uma foto, a porta.', 'A handshake, a photo, the door.'),
      C('home', 'Ficar em casa', 'Stay in', { h: 3, st: -3, fame: -1 }, 'Você descansa; a lista de convidados nem lembra o seu nome.', 'You rest; the guest list barely remembers your name.'),
    ] },
  { id: 'scandal_photo', name: l('Foto comprometedora', 'Compromising photo'), cool: 24, w: (e) => 0.6 + (e.fame > 45 ? 1 : 0) + (e.ls === 'festeiro' ? 0.8 : 0) + (e.dep > 25 ? 0.5 : 0),
    text: (s) => s.year >= 2008 ? l('Uma foto sua, embriagado e na companhia errada, circula nas redes. Sua assessoria liga em pânico.', 'A photo of you, drunk and in the wrong company, circulates on social media. Your press office calls in a panic.') : l('Um fotógrafo de tabloide conseguiu um flagrante seu saindo de um bar de madrugada, com a pessoa errada.', 'A tabloid photographer caught you leaving a bar at dawn with the wrong person.'),
    def: 'deny', ch: [
      C('deny', 'Mandar o advogado negar tudo', 'Have the lawyer deny everything', { w: -4000, st: -2 }, 'A história morre antes do almoço.', 'The story dies before lunch.', { odds: { p: 0.3, fx: { ins: -3, art: -2, love: -8 }, res: l('A negativa foi desmentida por uma segunda foto. O estrago dobrou.', 'The denial was contradicted by a second photo. The damage doubled.') } }),
      C('own', 'Assumir e fazer graça', 'Own it and make a joke', { fame: 4, art: 1, love: -3 }, 'O humor desarma e vira assunto simpático.', 'The humour disarms and turns it into a friendly topic.', { gate: attrNeed('charisma', 50) }),
      C('sorry', 'Pedir desculpas publicamente', 'Apologise publicly', { ins: 1, love: -2, st: 3 }, 'O pedido soa sincero. A ferida em casa demora.', 'The apology sounds sincere. The wound at home takes longer.'),
    ] },
  { id: 'profile', name: l('Perfil na imprensa', 'Press profile'), cool: 14, w: (e) => 0.8 + e.fame / 60,
    text: T('Uma jornalista respeitada quer passar uma semana com você para um perfil de capa. "Sem filtro", ela avisa.', 'A respected journalist wants a week with you for a cover profile. "No filter," she warns.'),
    def: 'no', ch: [
      C('yes', 'Aceitar, de portas abertas', 'Accept, doors open', { fame: 3, ins: 2, st: 4 }, 'O perfil sai honesto e generoso. Dá o que falar.', 'The profile is honest and generous. People talk.', { energy: 1, odds: { p: (e) => (e.o.attrs.charisma >= 60 ? 0.12 : 0.35), fx: { fame: 2, ins: -3, st: 6 }, res: l('O texto foi cruel com um detalhe que você achava inofensivo.', 'The text was cruel about a detail you thought harmless.') } }),
      C('exclusive', 'Aceitar e oferecer uma intriga sobre um artista', 'Accept and offer gossip about an artist', { fame: 4, arts: -4, res: 8 }, 'A matéria sai quente e o artista não te perdoa fácil.', 'The piece runs hot and the artist doesn\'t easily forgive.'),
      C('no', 'Recusar', 'Decline', { ins: -1 }, 'A vaga na capa vai para o concorrente.', 'The cover slot goes to a competitor.'),
    ] },
  { id: 'tabloid', name: l('Tabloide quer uma história', 'A tabloid wants a story'), cool: 30, w: (e) => (e.fame > 30 ? 0.7 + (e.cash < 20000 ? 0.7 : 0) : 0),
    text: T('Um repórter oferece pagar bem por um relato íntimo da sua vida.', 'A reporter offers to pay well for an intimate account of your life.'),
    def: 'lawyer', ch: [
      C('sell', 'Vender a entrevista', 'Sell the interview', { w: 7000, art: -2, ins: -2, st: 4, love: -3 }, 'Dinheiro rápido; a manchete sai pior que o combinado.', 'Quick money; the headline is worse than agreed.'),
      C('charm', 'Dar uma entrevista controlada', 'Give a controlled interview', { fame: 2, art: 1 }, 'Você controla a narrativa com uma frase por vez.', 'You steer the narrative one sentence at a time.', { energy: 1, gate: attrNeed('charisma', 50) }),
      C('lawyer', 'Mandar o advogado', 'Send the lawyer', { w: -3500, st: -2 }, 'A história morre.', 'The story dies.'),
    ] },
  { id: 'mentor_call', name: l('O velho mestre liga', 'The old master calls'), cool: 24, w: (e) => 0.7 + (has(e, 'intellectual') ? 0.5 : 0),
    text: T('Seu antigo mestre, agora frágil, pede que você dê uma aula magna no conservatório da cidade.', 'Your old master, now frail, asks you to give a keynote at the city conservatory.'),
    def: 'record', ch: [
      C('go', 'Dar a aula pessoalmente', 'Give the lecture in person', { sp: 1, art: 2, st: -3, arts: 1 }, 'Você sobe ao palco com nervosismo e sai com uma ovação.', 'You take the stage nervous and leave to an ovation.', { energy: 2 }),
      C('record', 'Gravar uma mensagem', 'Record a message', { art: 1, st: -1 }, 'A mensagem é exibida; o mestre sorri na primeira fila.', 'The message plays; the master smiles in the front row.', { energy: 1 }),
      C('no', 'Pedir desculpas, agenda cheia', 'Excuse yourself, busy schedule', { st: 2, art: -1 }, 'Ele entende. Você não se entende.', 'He understands. You don\'t.'),
    ] },
  { id: 'fan_story', name: l('Carta de um fã', 'A fan\'s letter'), cool: 18, w: (e) => 0.5 + e.fame / 70,
    text: T('Uma carta longa e torta de um fã conta como um disco do seu selo o tirou do fundo do poço.', 'A long, crooked letter from a fan tells how a record from your label pulled them out of the pit.'),
    def: 'reply', ch: [
      C('meet', 'Chamar o fã ao estúdio', 'Invite the fan to the studio', { st: -5, art: 2, fame: 1 }, 'Foi uma tarde comovente. Alguém filmou e virou notícia.', 'It was a moving afternoon. Someone filmed it and it became news.', { energy: 1 }),
      C('reply', 'Responder à mão', 'Reply by hand', { st: -3, art: 1 }, 'Duas linhas à mão. A carta emoldurada.', 'Two lines by hand. The letter framed.'),
      C('skip', 'Deixar com a assessoria', 'Leave it to PR', { st: 0 }, 'Um modelo de resposta foi enviado.', 'A template reply went out.'),
    ] },

  // ------------------------------------------------------------------ carreira × pessoal
  { id: 'artist_3am', name: l('Telefone às 3 da manhã', 'Phone at 3 a.m.'), cool: 8, w: (e) => (e.acts.length ? 1.3 + (e.ls === 'mecenas' ? 0.5 : 0) : 0), pick: actCtx,
    text: T('O telefone toca às 3 da manhã. É {p}, de {a}, desesperado(a): "preciso falar com alguém que entenda".', 'The phone rings at 3 a.m. It is {p}, from {a}, desperate: "I need someone who understands".'),
    def: 'aide', ch: [
      C('go', 'Ir até lá agora', 'Go there right now', { mor: 18, res: -12, h: -2, st: 3, arts: 2 }, 'Vocês conversam até o sol nascer. {p} nunca vai esquecer.', 'You talk until sunrise. {p} will never forget it.', { energy: 1 }),
      C('aide', 'Mandar alguém da equipe', 'Send someone from the team', { mor: 4, w: -150 }, 'A equipe cuidou; {p} agradeceu com frieza.', 'The team handled it; {p} thanked you coolly.'),
      C('ignore', 'Silenciar o telefone', 'Silence the phone', { mor: -12, res: 10, arts: -2 }, 'Você viu a chamada perdida de manhã. {p} também viu que você viu.', 'You saw the missed call in the morning. {p} knows you saw it.'),
    ] },
  { id: 'rival_meeting', name: l('Reunião secreta', 'Secret meeting'), cool: 16, w: (e) => (Object.values(e.s.labels).some((x) => x.active && x.id !== 'player') ? 0.9 + (e.cash < 25000 ? 0.6 : 0) + (has(e, 'schemer') ? 0.6 : 0) : 0),
    pick: (e, r) => { const ls = Object.values(e.s.labels).filter((x) => x.active && x.id !== 'player'); return ls.length ? { lab: r.pick(ls).id } : null; },
    text: T('Um executivo de {lab} convida você para jantar "sem comentar com ninguém". Há sempre uma proposta atrás de um jantar assim.', 'An executive from {lab} invites you to dinner "off the record". There is always a proposal behind a dinner like that.'),
    def: 'no', ch: [
      C('go', 'Ir e ouvir a proposta', 'Go and hear the proposal', { cash: 6000, st: 3 }, 'A proposta era um acordo de distribuição que rende bem.', 'The proposal was a distribution deal that pays well.', { energy: 1, odds: { p: 0.35, fx: { ins: -3, arts: -2, st: 6 }, res: l('Era uma sondagem para aliciar seu elenco, e a conversa vazou.', 'It was a probe to poach your roster, and the talk leaked.') } }),
      C('record', 'Ir com um advogado e gravar tudo', 'Go with a lawyer and record all', { w: -900, cash: 2000, ins: 1 }, 'Rigor compensa: você sai com informação valiosa.', 'Rigour pays: you leave with valuable information.', { energy: 1 }),
      C('no', 'Recusar', 'Decline', { st: -1 }, 'Você dorme com a consciência limpa e a dúvida do que perdeu.', 'You sleep with a clear conscience and a doubt about what you missed.'),
    ] },
  { id: 'artist_loan', name: l('Artista pede um empréstimo', 'Artist asks for a loan'), cool: 14, w: (e) => (e.acts.length ? 1 : 0), pick: actCtx,
    text: T('{p}, de {a}, pede um adiantamento fora do contrato: dívidas, aluguel e um problema na família.', '{p}, of {a}, asks for an advance outside the contract: debts, rent and a family problem.'),
    def: 'refuse', ch: [
      C('lend', 'Emprestar do próprio bolso', 'Lend from your own pocket', { w: -3000, mor: 14, res: -8, arts: 2 }, '{p} vai trabalhar o dobro por você.', '{p} will work twice as hard for you.'),
      C('adv', 'Dar um adiantamento do selo', 'Give a label advance', { cash: -4500, mor: 8, res: -3 }, 'Entra como adiantamento; mantém a política do selo.', 'It enters as an advance; the label policy holds.'),
      C('refuse', 'Dizer não', 'Say no', { mor: -9, res: 7 }, '{p} entende, mas não gosta.', '{p} understands, but dislikes it.'),
    ] },
  { id: 'political_album', name: l('Disco político', 'Political album'), cool: 20, w: (e) => (e.acts.some((a) => a.members.some((m) => isPolitical(viewsOf(e.s, m), 60))) ? 1.2 : 0),
    pick: (e, r) => { const a = e.acts.filter((x) => x.members.some((m) => isPolitical(viewsOf(e.s, m), 60))); if (!a.length) return null; const act = r.pick(a); return { act: act.id, pid: act.members.find((m) => isPolitical(viewsOf(e.s, m), 60)) }; },
    text: (s, c) => fmtL(l('{p}, de {a}, chega com um álbum todo político, de protesto direto. {cen}', '{p}, of {a}, arrives with an overtly political album of direct protest. {cen}'), { ...names(s, c), cen: c.n === 1 ? 'Há censores de olho.' : '' }),
    def: 'tone', ch: [
      C('back', 'Bancar o disco', 'Back the album', { mor: 12, art: 3, afame: 2, fans: 6, heat: 5 }, 'O disco sai, polariza e vende. {p} se sente respeitado(a).', 'The album drops, polarises and sells. {p} feels respected.', { odds: { p: (e) => (e.censor ? 0.45 : 0.2), fx: { mor: 4, heat: 10, ins: -2, st: 5, fans: 4 }, res: l('O disco foi pressionado por censores: vendas dispararam por curiosidade, mas houve ameaças.', 'Censors pressured the record: sales soared out of curiosity, but there were threats.') } }),
      C('tone', 'Pedir para suavizar', 'Ask to tone it down', { mor: -6, res: 5, ins: 1 }, 'O resultado perde o fogo, mas passa em todo lugar.', 'The result loses fire, but plays everywhere.'),
      C('split', 'Lançar sob pseudônimo', 'Release under a pseudonym', { mor: 5, art: 1, cash: -1500 }, 'Um pseudônimo protege o selo e preserva a voz.', 'A pseudonym protects the label and preserves the voice.'),
    ] },

  // ------------------------------------------------------------------ tentações
  { id: 'drugs_offer', name: l('Oferta na festa', 'Offer at the party'), cool: 14, w: (e) => (e.s.config.contentFilters.includes('drugs') ? 0 : 0.7 + (e.ls === 'festeiro' || e.ls === 'boemio' ? 1 : 0) + (has(e, 'bohemian') ? 0.7 : 0) + (e.dep > 40 ? 1 : 0) - (has(e, 'sober') ? 0.9 : 0)),
    text: (s) => fmtL(l('Alguém coloca na sua mão um pacote: {d}. "Para relaxar. Faz parte da noite."', 'Someone puts a packet in your hand: {d}. "To relax. Part of the night."'), { d: s.year < 1960 ? 'anfetaminas' : s.year < 1975 ? 'LSD' : s.year < 1995 ? 'cocaína' : s.year < 2015 ? 'pílulas' : 'sintéticos' }),
    def: 'no', ch: [
      C('try', 'Experimentar', 'Try it', { st: -12, h: -5, heat: 6, dep: ['drugs', 8], art: 1 }, 'A noite foi brilhante. A manhã, nem tanto.', 'The night was brilliant. The morning, less so.', { odds: { p: 0.2, fx: { h: -10, heat: 15, ins: -3, st: 8, dep: ['drugs', 12] }, res: l('Passou mal; alguém ligou para a polícia; a história vazou.', 'You got sick; someone called the police; the story leaked.') } }),
      C('laugh', 'Dispensar com uma piada', 'Wave it off with a joke', { st: -1, fame: 1 }, 'A piada funciona. Ninguém insiste.', 'The joke works. Nobody insists.', { gate: attrNeed('charisma', 45) }),
      C('no', 'Sair da festa', 'Leave the party', { st: -1, arts: 1 }, 'Você chega em casa às duas e dorme como uma pedra.', 'You get home at two and sleep like a stone.'),
    ] },
  { id: 'gambling', name: l('Noite de jogo', 'Gambling night'), cool: 20, w: (e) => (e.wealth > 10000 ? 0.6 + (has(e, 'greedy') ? 0.8 : 0) + (e.ls === 'jetsetter' ? 0.8 : 0) : 0),
    text: T('Num cassino de luxo, um amigo empurra fichas na sua direção: "só uma rodada".', 'At a luxury casino, a friend pushes chips your way: "just one round".'),
    def: 'no', ch: [
      C('big', 'Apostar alto', 'Bet high', { w: -10000, st: -4 }, 'A roleta sorriu: você sai com o dobro e uma história.', 'The wheel smiled: you leave with double and a story.', { odds: { p: 0.55, fx: { st: 8, h: -1 }, res: l('A casa sempre ganha. Você volta de táxi e de cabeça baixa.', 'The house always wins. You head back by taxi, head down.') }, dyn: () => ({ w: 20000 }) }),
      C('small', 'Apostar o que dá para perder', 'Bet what you can lose', { w: -600, st: -2 }, 'Uma noite divertida e barata.', 'A fun, cheap night.'),
      C('no', 'Recusar e tomar uma água', 'Decline and have a water', { st: -1 }, 'Você assiste, tranquilo, ao drama dos outros.', 'You calmly watch the others\' drama.'),
    ] },
  { id: 'affair', name: l('Tentação', 'Temptation'), cool: 20, w: (e) => (e.partner ? 0.5 + (e.partner.affinity < 50 ? 0.9 : 0) + (e.fame > 40 ? 0.5 : 0) + (has(e, 'bohemian') ? 0.4 : 0) - (isDevout(e.v, 65) ? 0.5 : 0) : 0),
    text: T('Depois de um show do selo, alguém muito interessante, e muito interessado(a), te convida para "uma bebida mais calma".', 'After a label show, someone very interesting, and very interested, invites you for "a quieter drink".'),
    def: 'resist', ch: [
      C('yield', 'Aceitar o convite', 'Accept the invitation', { st: -4, love: -12, fame: 1 }, 'Foi uma noite. A consequência veio em outro formato.', 'It was one night. The consequence came in another format.', { next: { ev: 'affair_exposed', m: 2, p: 0.5 } }),
      C('resist', 'Agradecer e ir para casa', 'Thank them and go home', { st: 2, love: 3 }, 'Você chega em casa com o coração pesado e a consciência leve.', 'You get home with a heavy heart and a light conscience.'),
      C('confess', 'Contar para {x} no dia seguinte', 'Tell {x} the next day', { love: 5, st: 2 }, 'A conversa foi difícil. A relação saiu mais honesta.', 'The talk was hard. The relationship came out more honest.', { gate: needPartner as unknown as Ch['gate'] }),
    ] },
  { id: 'affair_exposed', name: l('O segredo vazou', 'The secret leaks'), cool: 0, chain: true, w: () => 0,
    text: T('Alguém viu, alguém contou, e agora {x} está sabendo pelos outros.', 'Somebody saw, somebody talked, and now {x} is finding out from others.'),
    def: 'silent', ch: [
      C('sorry', 'Pedir perdão e sair do selo por um mês', 'Beg forgiveness and step away for a month', { love: 6, st: 6, com: -2 }, 'O perdão vem devagar, com condições.', 'Forgiveness comes slowly, with conditions.', { energy: 2 }),
      C('silent', 'Calar e esperar passar', 'Stay quiet and wait it out', { love: -16, st: 8, ins: -1 }, 'Silêncio é uma resposta, e {x} entendeu qual.', 'Silence is an answer, and {x} understood which.'),
    ] },

  // ------------------------------------------------------------------ política e religião
  { id: 'rally', name: l('Convite de campanha', 'Campaign invitation'), cool: 14, w: (e) => (e.v.pol === 'apolitical' ? 0.2 : 0.5 + e.v.eng / 60) + (e.fame > 40 ? 0.4 : 0),
    pick: (_e, r) => ({ n: r.int(-2, 2) }),
    text: (s, c) => fmtL(l('Um candidato {s} quer que você suba no palco do comício e declare apoio. Fotos, microfones, e a plateia olhando.', 'A {s} candidate wants you on the rally stage declaring your support. Photos, microphones, and the audience watching.'), { s: (c.n ?? 0) < 0 ? l('de esquerda', 'left-wing') : (c.n ?? 0) > 0 ? l('de direita', 'right-wing') : l('de centro', 'centrist') }),
    def: 'no', ch: [
      C('endorse', 'Subir no palco e apoiar', 'Take the stage and endorse', { fame: 3, eng: 6 }, 'O discurso rende aplausos de um lado e vaias do outro.', 'The speech earns applause on one side and boos on the other.', { energy: 1, dyn: (s, c) => { const m = polById[viewsOf(s, 'player').pol].axis * (c.n ?? 0); return m > 0 ? { ins: 1, arts: 1, art: 1 } : m < 0 ? { ins: -2, arts: -2, st: 4 } : { ins: -1 }; } }),
      C('donate', 'Doar discretamente', 'Donate discreetly', { w: -2500, ins: 1 }, 'Sem foto, sem barulho, sem inimigos.', 'No photo, no noise, no enemies.'),
      C('no', 'Declinar, música não é política', 'Decline, music is not politics', { st: -1, ins: 0 }, 'Alguém grita "covarde" no estacionamento. Outro agradece a discrição.', 'Someone shouts "coward" in the parking lot. Another thanks you for the discretion.', { dyn: (s) => (isPolitical(viewsOf(s, 'player'), 60) ? { eng: -3, st: 2 } : {}) }),
    ] },
  { id: 'church_request', name: l('Pedido da comunidade', 'Community request'), cool: 14, w: (e) => (e.v.rel !== 'none' && e.v.rel !== 'atheist' ? 0.6 + e.v.dev / 45 : 0.15),
    text: (s) => fmtL(l('O líder de {c} pede que você apresente um show beneficente para arrecadar fundos para uma reforma.', 'The leader of {c} asks you to host a benefit show to raise funds for repairs.'), { c: placeOf(viewsOf(s, 'player').rel) }),
    def: 'give', ch: [
      C('play', 'Organizar o show', 'Organise the show', { fame: 2, arts: 1, ins: 1, st: -4 }, 'A casa lotou e a arrecadação passou da meta.', 'The house filled up and the fundraiser beat its goal.', { energy: 2, dyn: (s) => (isDevout(viewsOf(s, 'player')) ? { st: -4, dev: 3 } : {}) }),
      C('give', 'Doar o valor', 'Donate the amount', { w: -1200, ins: 1 }, 'A comunidade agradece da tribuna.', 'The community thanks you from the pulpit.', { dyn: (s) => (isDevout(viewsOf(s, 'player')) ? { st: -2 } : {}) }),
      C('no', 'Pedir que entendam', 'Ask them to understand', { st: 1 }, 'Eles entendem, de cara fechada.', 'They understand, straight-faced.', { dyn: (s) => (isDevout(viewsOf(s, 'player'), 70) ? { st: 4, dev: -3 } : {}) }),
    ] },
  { id: 'censor_pressure', name: l('Pressão da censura', 'Censorship pressure'), cool: 10, w: (e) => (e.censor && e.acts.length ? 1.6 + (e.v.pol !== 'apolitical' ? e.v.eng / 100 : 0) : 0), pick: actCtx,
    text: T('Dois homens de terno entregam um ofício no seu escritório: uma faixa de {a} "ofende a moral e os bons costumes". Pedem cortes — ou "providências".', 'Two men in suits deliver a notice to your office: a track by {a} "offends morals and decency". They demand cuts, or "measures".'),
    def: 'comply', ch: [
      C('comply', 'Cortar a faixa', 'Cut the track', { art: -2, ins: 1, mor: -8, res: 6 }, 'A faixa some do disco. {p} fica calado(a) e machucado(a).', 'The track disappears from the record. {p} goes quiet and hurt.'),
      C('resist', 'Resistir publicamente', 'Resist publicly', { art: 3, afame: 2, mor: 10, heat: 8, fans: 5, eng: 4 }, 'A resistência vira bandeira. O público compra mais, o governo anota seu nome.', 'Resistance becomes a banner. The public buys more; the government notes your name.', { odds: { p: 0.3, fx: { cash: -5000, ins: -3, st: 10, heat: 12, mor: 6 }, res: l('A reação veio rápida: multa, batida e um mês de dor de cabeça.', 'The backlash came fast: a fine, a raid and a month of headaches.') } }),
      C('lawyer', 'Contratar advogados e recorrer', 'Hire lawyers and appeal', { cash: -3500, ins: 1, st: 3 }, 'O processo se arrasta, mas o disco continua à venda.', 'The case drags on, but the record stays on sale.'),
      C('bribe', 'Ungir a mão certa', 'Grease the right palm', { w: -6000, ins: -2, st: 3 }, 'O ofício some. O dinheiro também.', 'The notice vanishes. So does the money.', { gate: (e) => (e.ls === 'magnata' || e.o.attrs.negotiation >= 50 ? null : l('Exige negociação 50+ ou o estilo Magnata.', 'Requires negotiation 50+ or Tycoon lifestyle.')) }),
    ] },
  { id: 'boycott', name: l('Pedido de boicote', 'Boycott call'), cool: 16, w: (e) => (e.acts.some((a) => a.members.some((m) => isStrict(viewsOf(e.s, m)))) || e.year >= 2012 ? 0.9 : 0.3), pick: actCtx,
    text: (s, c) => fmtL(s.year >= 2012 ? l('Uma campanha nas redes pede o boicote a {a} por uma letra e uma capa consideradas ofensivas. O assunto toma conta do noticiário.', 'A social-media campaign calls for a boycott of {a} over a lyric and cover judged offensive. The topic fills the news.') : l('Um grupo de pais e igrejas pede o boicote a {a} por uma letra e uma capa consideradas ofensivas. O assunto toma conta do noticiário.', 'A group of parents and churches calls for a boycott of {a} over a lyric and cover judged offensive. The topic fills the news.'), names(s, c)),
    def: 'firm', ch: [
      C('firm', 'Manter e defender o artista', 'Stand firm and defend the artist', { arts: 3, art: 2, mor: 8, ins: -2, afame: 1 }, 'O público se divide. {p} sente que tem um selo ao lado.', 'The public splits. {p} feels they have a label by their side.'),
      C('talk', 'Negociar com os grupos', 'Negotiate with the groups', { ins: 1, mor: -3, st: 2 }, 'Um comunicado conciliador baixa a temperatura.', 'A conciliatory statement lowers the temperature.', { energy: 1 }),
      C('apology', 'Retirar a capa e pedir desculpas', 'Pull the cover and apologise', { art: -2, ins: 2, mor: -10, res: 8, arts: -3 }, 'A polêmica acaba. O artista, não.', 'The controversy ends. The artist\'s anger does not.'),
    ] },
  { id: 'faith_crisis', name: l('Crise de fé', 'Crisis of faith'), cool: 30, w: (e) => (e.stress > 60 ? 0.6 + (e.v.rel !== 'none' ? 0.5 : 0.2) : 0.1),
    text: T('Madrugada longa. Você pensa em sentido, em dívida, em tempo. Algo pede resposta.', 'A long night. You think about meaning, debt, time. Something asks for an answer.'),
    def: 'quiet', ch: [
      C('faith', 'Procurar um conselheiro espiritual', 'Seek a spiritual counsellor', { st: -10, dev: 8, h: 2 }, 'A conversa traz paz, uma rotina e um caderno cheio.', 'The talk brings peace, a routine and a full notebook.', { energy: 1, dyn: (s) => (viewsOf(s, 'player').rel === 'none' || viewsOf(s, 'player').rel === 'atheist' ? { rel: 'spiritist' as const, dev: 20 } : {}) }),
      C('doubt', 'Aceitar a dúvida e seguir', 'Accept the doubt and move on', { st: -2, dev: -8 }, 'Você aceita não ter resposta.', 'You accept having no answer.'),
      C('quiet', 'Escrever uma música sobre isso', 'Write a song about it', { st: -6, art: 2, sp: 0 }, 'A letra sai dolorida e verdadeira.', 'The lyrics come out sore and true.', { energy: 1 }),
    ] },
  { id: 'gospel_idea', name: l('Disco de fé', 'A faith record'), cool: 30, w: (e) => (isDevout(e.v, 55) ? 1.3 : e.v.rel !== 'none' && e.v.rel !== 'atheist' ? 0.4 : 0),
    text: (s) => fmtL(l('Lideranças de {c} propõem um disco sacro ligado ao selo, para o fim do ano. Há demanda, e há risco de rótulo.', 'Leaders from {c} propose a sacred record tied to the label for year end. There is demand, and a risk of typecasting.'), { c: placeOf(viewsOf(s, 'player').rel) }),
    def: 'no', ch: [
      C('yes', 'Bancar o projeto', 'Fund the project', { cash: -6000, ins: 1, arts: 1, dev: 4 }, 'O disco encontra um público fiel e constante.', 'The record finds a faithful, steady audience.', { odds: { p: 0.25, fx: { art: -2, st: 3 }, res: l('A crítica torceu o nariz e o público de sempre estranhou.', 'Critics turned up their noses and the usual audience was puzzled.') }, dyn: () => ({ cash: 14000 }) }),
      C('side', 'Fazer em parceria, sem custo', 'Do it as a partnership, no cost', { ins: 1, dev: 2 }, 'Parceria discreta, retorno modesto.', 'Discreet partnership, modest return.', { dyn: () => ({ cash: 2500 }) }),
      C('no', 'Recusar', 'Decline', { st: 0 }, 'Você prefere não misturar.', 'You prefer not to mix.'),
    ] },

  // ------------------------------------------------------------------ época
  { id: 'draft', name: l('Convocação', 'Draft notice'), era: [1950, 1973], cool: 60, w: (e) => (e.age < 36 && e.s.config.homeCity && ['new_york', 'los_angeles', 'nashville', 'chicago', 'memphis', 'detroit'].includes(e.s.config.homeCity) ? 0.8 : e.age < 36 ? 0.15 : 0),
    text: T('Uma carta oficial chega pelo correio: você foi convocado para o serviço militar. O selo, a banda e a carreira em suspenso.', 'An official letter arrives: you were drafted for military service. The label, the band and your career on hold.'),
    def: 'serve', ch: [
      C('serve', 'Cumprir o serviço', 'Serve', { st: 8, h: -3, ins: 2, attr: ['management', 2] }, 'Dois anos disciplinados deixam marcas e lições.', 'Two disciplined years leave marks and lessons.', { energy: 3 }),
      C('exempt', 'Pagar advogados por uma dispensa', 'Pay lawyers for an exemption', { w: -5000, st: 4 }, 'A dispensa sai, junto com um pouco de vergonha.', 'The exemption comes, along with a bit of shame.', { odds: { p: 0.2, fx: { ins: -3, st: 9 }, res: l('A manobra foi denunciada e virou um escândalo.', 'The manoeuvre was reported and became a scandal.') } }),
      C('protest', 'Recusar publicamente', 'Refuse publicly', { art: 2, ins: -3, eng: 10, heat: 10, pol: 'left' as PolId }, 'Seu nome vira símbolo da contracultura e entra em listas.', 'Your name becomes a counterculture symbol and goes on lists.'),
    ] },
  { id: 'payola', name: l('Envelope do DJ', 'The DJ\'s envelope'), era: [1955, 1978], cool: 20, w: (e) => (e.acts.length ? 0.8 : 0),
    text: T('Um DJ influente sugere, sem sorrir, que "rádio é caro" e que um envelope garantiria o novo single no horário nobre.', 'An influential DJ suggests, without smiling, that "radio is expensive" and an envelope would guarantee the new single in prime time.'),
    def: 'no', ch: [
      C('pay', 'Pagar o envelope', 'Pay the envelope', { cash: -3500, com: 3, ins: -1 }, 'O single toca a semana inteira.', 'The single plays all week.', { odds: { p: 0.22, fx: { ins: -4, art: -3, st: 7 }, res: l('Um inquérito expôs a prática e seu nome apareceu em um depoimento.', 'An inquiry exposed the practice and your name came up in testimony.') } }),
      C('no', 'Recusar e manter a postura', 'Refuse and hold your line', { ins: 1, st: 1 }, 'Você perde o horário. Ganha o respeito dos que importam.', 'You lose the slot. You gain the respect of those who matter.'),
      C('report', 'Denunciar à imprensa', 'Report to the press', { art: 2, ins: 2, arts: -1, heat: 3 }, 'A denúncia dá manchete e inimigos.', 'The report makes headlines and enemies.'),
    ] },
  { id: 'panic_rock', name: l('Pânico moral', 'Moral panic'), era: [1982, 1992], cool: 40, w: (e) => (e.acts.length ? 0.7 : 0), pick: actCtx,
    text: T('Pais e pastores picham discos e fazem fogueira de LPs na porta de lojas. {a} entrou na lista de "ameaças".', 'Parents and pastors deface records and burn LPs outside shops. {a} made the list of "threats".'),
    def: 'quiet', ch: [
      C('fight', 'Ir à TV e defender o disco', 'Go on TV and defend the record', { fame: 3, art: 2, mor: 8, ins: -1, afame: 3, st: 4 }, 'Você debate um pastor ao vivo e vence nos pontos. Os discos esgotam.', 'You debate a pastor live and win on points. Records sell out.', { energy: 1, gate: attrNeed('charisma', 45) }),
      C('sticker', 'Colocar o selo de aviso nos discos', 'Add a warning sticker to the records', { cash: -1500, ins: 1, mor: -3 }, 'O adesivo acalma os pais e atrai os jovens.', 'The sticker soothes parents and attracts the young.'),
      C('quiet', 'Esperar passar', 'Wait it out', { st: 2, mor: -2 }, 'O pânico passa como todo pânico.', 'The panic passes like every panic.'),
    ] },
  { id: 'leak', name: l('O disco vazou', 'The record leaked'), era: [1999, 2008], cool: 20, w: (e) => (e.acts.length ? 0.9 : 0), pick: actCtx,
    text: T('O novo disco de {a} apareceu nas redes de troca de arquivos duas semanas antes do lançamento.', '{a}\'s new record appeared on file-sharing networks two weeks before release.'),
    def: 'move', ch: [
      C('sue', 'Processar os sites', 'Sue the sites', { cash: -4000, ins: 1, art: -1 }, 'A ação sai cara e rende má imprensa entre os fãs.', 'The action is costly and earns bad press among fans.'),
      C('move', 'Antecipar o lançamento', 'Move the release up', { com: 1, mor: 4, cash: -800 }, 'Você sai na frente do vazamento; o ruído vira divulgação.', 'You get ahead of the leak; the noise becomes promotion.', { energy: 1 }),
      C('embrace', 'Abraçar e ficar em silêncio', 'Embrace it and stay quiet', { art: 2, afame: 2, mor: 6 }, 'Fãs elogiam sua serenidade. O caixa, nem tanto.', 'Fans praise your calm. The cash, not so much.'),
    ] },
  { id: 'lockdown', name: l('Isolamento', 'Lockdown'), era: [2020, 2021], cool: 18, w: () => 1.2,
    text: T('Com o mundo em casa, a sua vida vira reuniões em vídeo e silêncio. O que você faz com tanto tempo?', 'With the world at home, your life turns into video calls and silence. What do you do with all that time?'),
    def: 'rest', ch: [
      C('compose', 'Compor sem parar', 'Compose nonstop', { art: 2, st: -3, sp: 1 }, 'Um caderno cheio de canções que ninguém ouviu ainda.', 'A notebook full of songs nobody has heard yet.', { energy: 2 }),
      C('live', 'Fazer lives para os fãs', 'Livestream for fans', { fame: 3, st: 2, cash: 1500 }, 'A tela cheia de corações compensa a sala vazia.', 'A screen full of hearts makes up for an empty room.', { energy: 1 }),
      C('rest', 'Cuidar da saúde e da casa', 'Look after health and home', { h: 5, st: -6 }, 'Você cozinha, caminha e dorme melhor que em anos.', 'You cook, walk and sleep better than in years.'),
    ] },
  { id: 'old_post', name: l('Publicação antiga', 'Old post resurfaces'), era: [2010, 2100], cool: 24, w: (e) => 0.4 + e.fame / 90 + (has(e, 'rebel') ? 0.4 : 0),
    text: T('Um print de um comentário seu de dez anos atrás começa a circular. O contexto sumiu; a indignação, não.', 'A screenshot of a comment of yours from ten years ago starts circulating. The context is gone; the outrage is not.'),
    def: 'quiet', ch: [
      C('sorry', 'Pedir desculpas, sem desculpas', 'Apologise, no excuses', { ins: 1, st: 3, fame: -1 }, 'Direto e curto. A onda perde força em dois dias.', 'Direct and short. The wave loses force in two days.'),
      C('fight', 'Responder e explicar o contexto', 'Respond and explain the context', { fame: 2, st: 6, ins: -2 }, 'A resposta incendeia a conversa.', 'The reply stokes the conversation.', { odds: { p: 0.45, fx: { fame: 4, ins: 0, st: 4, art: 1 }, res: l('A explicação convenceu muita gente e você ganhou aliados.', 'The explanation convinced many and you gained allies.') } }),
      C('quiet', 'Esperar o cancelamento passar', 'Wait for the cancellation to pass', { st: 4, ins: -1 }, 'O silêncio funciona... por enquanto.', 'Silence works... for now.'),
    ] },
  { id: 'vinyl_find', name: l('Achado raro', 'A rare find'), cool: 24, w: () => 0.55,
    text: T('Num sebo empoeirado você encontra uma prensagem original que valia uma fortuna e estava a preço de banana.', 'In a dusty second-hand shop you find an original pressing that was worth a fortune at a bargain price.'),
    def: 'keep', ch: [
      C('keep', 'Guardar para si', 'Keep it', { st: -4, art: 1 }, 'A capa fica emoldurada no escritório.', 'The sleeve gets framed in your office.'),
      C('sell', 'Vender a um colecionador', 'Sell to a collector', { w: 4000 }, 'O dinheiro sobe; o disco, desce da parede.', 'The money rises; the record comes off the wall.'),
      C('gift', 'Dar de presente a um artista', 'Give it to an artist', { arts: 2, mor: 5, st: -2 }, 'O artista chorou. O gesto foi comentado nos camarins.', 'The artist cried. The gesture was talked about backstage.', { dyn: () => ({}) }),
    ] },
];
