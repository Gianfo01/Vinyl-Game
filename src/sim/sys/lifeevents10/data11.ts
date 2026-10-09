// Eventos de vida pessoal da rodada 11: mais situações de casa, saúde, dinheiro, amizades, estilo de vida e época.
// Mesmo formato de data.ts (Def/Ch/Fx); entram no mesmo sorteio mensal de lifeevents10 (que já limita a 0–1
// pop-up por mês, raramente 2, com cooldown por evento), então não aumentam a frequência, só a variedade.

import { l } from '../../../data/world';
import { isDevout, isPolitical } from '../../beliefs';
import { life } from '../life';
import type { Def, Env } from '../lifeevents10';
import { C, T, actCtx, attrNeed, has } from './data';
import { fmtL } from '../../util';
import { vices } from '../vices';

const kidAged = (e: Env, lo: number, hi: number) => {
  const ks = e.o.kids.map((k, i) => ({ k, i })).filter((x) => e.year - x.k.born >= lo && e.year - x.k.born <= hi);
  return ks.length ? { kid: ks[0].i } : null;
};
const artist = (e: Env) => e.s.config.role === 'artist';

export const EVENTS11: Def[] = [
  // ------------------------------------------------------------------ casa e família
  { id: 'r11_kid_band', name: l('O filho quer ter uma banda', 'Your kid wants a band'), cool: 36, w: (e) => (kidAged(e, 13, 20) ? 1 : 0), pick: (e) => kidAged(e, 13, 20),
    text: T('{k} montou uma banda na garagem e quer que você ouça a fita. E, talvez, assine com o selo.', '{k} started a garage band and wants you to hear the tape. And maybe sign them to the label.'),
    def: 'listen', ch: [
      C('sign', 'Assinar a banda de {k}', 'Sign {k}\'s band', { kidBond: 12, arts: -2, ins: -1, cash: -1500 }, 'Nepotismo, dizem os jornais. {k} nunca esteve tão feliz.', 'Nepotism, say the papers. {k} has never been happier.'),
      C('listen', 'Ouvir com atenção e dar conselhos honestos', 'Listen closely and give honest advice', { kidBond: 6, st: -2 }, 'Você aponta o refrão fraco; {k} reescreve e melhora.', 'You point out the weak chorus; {k} rewrites it and it improves.', { energy: 1 }),
      C('discourage', 'Dizer que música não dá futuro', 'Say music has no future', { kidBond: -12, st: 2 }, 'A ironia não passa despercebida para ninguém.', 'The irony is lost on no one.'),
    ] },
  { id: 'r11_tuition', name: l('A faculdade do filho', 'Your kid\'s college'), cool: 60, w: (e) => (kidAged(e, 17, 19) ? 1.2 : 0), pick: (e) => kidAged(e, 17, 19),
    text: T('{k} passou numa faculdade cara, longe de casa. A mensalidade assusta até quem tem selo.', '{k} got into an expensive college far from home. The tuition scares even a label owner.'),
    def: 'loan', ch: [
      C('pay', 'Pagar tudo', 'Pay for everything', { w: -12000, kidBond: 10 }, '{k} parte com malas e sem dívidas.', '{k} leaves with suitcases and no debts.'),
      C('loan', 'Ajudar a metade; o resto é crédito estudantil', 'Cover half; the rest is a student loan', { w: -5000, kidBond: 3 }, '{k} aprende cedo o que é juros.', '{k} learns early what interest means.'),
      C('local', 'Sugerir a faculdade pública da cidade', 'Suggest the local public college', { kidBond: -5, st: 1 }, '{k} fica, mas lembra disso em todo Natal.', '{k} stays, but brings it up every Christmas.'),
    ] },
  { id: 'r11_sibling_money', name: l('O irmão pede dinheiro', 'Your sibling asks for money'), cool: 30, w: (e) => 0.6 + (e.wealth > 50000 ? 0.6 : 0) + (has(e, 'generous') ? 0.3 : 0),
    text: T('Seu irmão vai abrir "um negócio infalível" — um lava-rápido temático — e só falta o investimento. O seu.', 'Your brother is opening "a can\'t-miss business" — a themed car wash — and only lacks the investment. Yours.'),
    def: 'no', ch: [
      C('invest', 'Investir', 'Invest', { w: -6000, st: -1 }, 'O lava-rápido abre com festa.', 'The car wash opens with a party.', { odds: { p: 0.6, fx: { st: 6 }, res: l('Em um ano o lava-rápido fechou. O dinheiro e a paz em família foram juntos.', 'Within a year the car wash closed. The money and family peace went with it.') } }),
      C('small', 'Dar uma ajuda pequena, sem sociedade', 'Give a small gift, no partnership', { w: -1500, st: -1 }, 'Ele agradece e não pede mais (por enquanto).', 'He thanks you and asks no more (for now).'),
      C('no', 'Negar', 'Say no', { st: 4 }, 'O almoço de domingo fica gelado por meses.', 'Sunday lunch goes cold for months.'),
    ] },
  { id: 'r11_partner_job', name: l('Proposta para o(a) parceiro(a)', 'A job offer for your partner'), cool: 40, w: (e) => (e.partner ? 0.8 : 0),
    text: T('{x} recebeu a proposta da vida, em outra cidade, do outro lado do país. Quer saber o que você acha.', '{x} got the offer of a lifetime, in another city across the country. Wants to know what you think.'),
    def: 'distance', ch: [
      C('move', 'Mudar junto e tocar o selo a distância', 'Move too and run the label remotely', { love: 15, st: 6, com: -2, arts: -1 }, 'A casa nova tem vista; o selo, menos você.', 'The new home has a view; the label has less of you.', { energy: 2 }),
      C('distance', 'Namoro a distância', 'Long distance', { love: -4, st: 3 }, 'Ligações à noite, encontros a cada quinzena.', 'Late-night calls, a visit every other week.', { odds: { p: 0.25, fx: { breakup: 1, st: 10 }, res: l('A distância ganhou. {x} terminou por telefone.', 'Distance won. {x} broke up over the phone.') } }),
      C('ask', 'Pedir para recusar', 'Ask them to decline', { love: -12, st: 1 }, '{x} recusa, e guarda a mágoa numa gaveta.', '{x} declines, and files the resentment in a drawer.'),
    ] },
  { id: 'r11_anniversary', name: l('O aniversário esquecido', 'The forgotten anniversary'), cool: 24, w: (e) => (e.married ? 0.7 + (has(e, 'workaholic') ? 0.8 : 0) + (e.ls === 'workaholic' ? 0.6 : 0) : 0),
    text: T('Você chega em casa às 23h e encontra a mesa posta, velas derretidas e {x} em silêncio. Era o aniversário de casamento.', 'You get home at 11pm to a set table, melted candles and {x} in silence. It was your wedding anniversary.'),
    def: 'sorry', ch: [
      C('trip', 'Viagem-surpresa no fim de semana', 'Surprise weekend getaway', { w: -2500, love: 12, st: -6 }, 'Uma pousada na serra salva o ano.', 'A mountain inn saves the year.', { energy: 2 }),
      C('gift', 'Um presente caro', 'An expensive gift', { w: -1800, love: 4 }, 'O presente é bonito. A lembrança, nem tanto.', 'The gift is beautiful. The memory, less so.'),
      C('sorry', 'Pedir desculpas', 'Apologise', { love: -6, st: 3 }, '"Tudo bem", diz {x}. Não está tudo bem.', '"It\'s fine," says {x}. It is not fine.'),
    ] },
  { id: 'r11_ex_returns', name: l('Um ex aparece', 'An ex shows up'), cool: 40, w: (e) => (life(e.s).exes.length ? 0.6 + (has(e, 'romantic') ? 0.5 : 0) : 0),
    text: (s) => fmtL(l('Num lançamento de disco, você esbarra em {n}, seu antigo amor. A conversa flui como se nada tivesse acontecido.', 'At a record launch, you bump into {n}, your old flame. The conversation flows as if nothing had happened.'), { n: life(s).exes[life(s).exes.length - 1] ?? '' }),
    def: 'polite', ch: [
      C('coffee', 'Marcar um café', 'Arrange a coffee', { st: -3, love: -8, heat: 2 }, 'Um café vira três. Alguém viu vocês juntos.', 'One coffee becomes three. Someone saw you together.'),
      C('closure', 'Conversar e encerrar o assunto', 'Talk it through and close the chapter', { st: -6 }, 'Pela primeira vez em anos, a história tem um fim decente.', 'For the first time in years, the story has a decent ending.', { energy: 1 }),
      C('polite', 'Cumprimentar e seguir', 'Say hello and move on', { st: 1 }, 'Você passa a noite pensando no "e se".', 'You spend the night thinking "what if".'),
    ] },
  { id: 'r11_blind_date', name: l('Encontro às cegas', 'Blind date'), cool: 18, w: (e) => (!e.partner && e.age < 60 ? 0.9 + (has(e, 'romantic') ? 0.6 : 0) - (has(e, 'shy') ? 0.3 : 0) : 0),
    text: (s) => (s.year >= 2012
      ? T('Uma amiga criou um perfil seu num aplicativo de namoro "só por diversão". Você tem 400 combinações e uma mensagem interessante.', 'A friend made you a dating-app profile "just for fun". You have 400 matches and one interesting message.')(s, {})
      : T('Uma amiga arranjou um encontro às cegas num restaurante italiano. "Você vai gostar", garantiu.', 'A friend set you up on a blind date at an Italian restaurant. "You\'ll like them," she promised.')(s, {})),
    def: 'skip', ch: [
      C('go', 'Ir ao encontro', 'Go on the date', { st: -4, w: -150 }, 'Boa conversa, risadas e um "vamos repetir".', 'Good conversation, laughs and a "let\'s do it again".', { energy: 1, odds: { p: 0.45, fx: { st: 2 }, res: l('Ele(a) passou a noite falando do próprio podcast.', 'They spent the whole night talking about their podcast.') } }),
      C('skip', 'Desmarcar: trabalho demais', 'Cancel: too much work', { st: 1 }, 'O trabalho agradece. Você, nem tanto.', 'Work thanks you. You, less so.'),
    ] },
  { id: 'r11_pet', name: l('Um cachorro na porta', 'A dog at the door'), cool: 60, once: true, w: (e) => 0.5 + (e.ls === 'familia' ? 0.5 : 0) + (e.stress > 60 ? 0.3 : 0),
    text: T('Um vira-lata magro segue você do estúdio até em casa e senta na porta. Não parece que vai embora.', 'A skinny stray follows you from the studio home and sits at the door. It does not look like it is leaving.'),
    def: 'shelter', ch: [
      C('adopt', 'Adotar', 'Adopt it', { st: -8, h: 3, w: -400, kidBond: 4, love: 3 }, 'Agora o estúdio tem mascote e você caminha todo dia.', 'Now the studio has a mascot and you walk every day.'),
      C('shelter', 'Levar a um abrigo', 'Take it to a shelter', { st: 1 }, 'Você passa pelo abrigo semanas depois. Ele foi adotado.', 'You pass the shelter weeks later. It was adopted.'),
    ] },
  { id: 'r11_burglary', name: l('Assalto em casa', 'Home burglary'), cool: 60, w: (e) => (e.wealth > 40000 ? 0.4 + e.fame / 200 : 0),
    text: T('Você volta de uma turnê e encontra a porta arrombada. Levaram eletrônicos, joias e — pior — os discos de ouro da parede.', 'You return from a tour to find the door forced. They took electronics, jewellery and — worse — the gold records off the wall.'),
    def: 'police', ch: [
      C('security', 'Instalar segurança completa', 'Install full security', { w: -4000, st: -3 }, 'Câmeras, alarme e um cão de guarda. Dorme-se melhor.', 'Cameras, an alarm and a guard dog. You sleep better.'),
      C('reward', 'Oferecer recompensa pelos discos de ouro', 'Offer a reward for the gold records', { w: -1500, fame: 1 }, 'Um dos discos volta, achado num brechó. A história sai no jornal.', 'One record comes back, found in a thrift shop. The story makes the paper.'),
      C('police', 'Registrar a ocorrência e seguir', 'File a report and move on', { w: -2500, st: 6 }, 'A polícia anota e some.', 'The police take notes and vanish.'),
    ] },
  { id: 'r11_identity_theft', name: l('Roubaram seu nome', 'Identity theft'), era: [2000, 2100], cool: 48, w: (e) => 0.3 + (e.wealth > 20000 ? 0.3 : 0),
    text: T('Chega a fatura de um cartão que você nunca pediu: um jet ski, três passagens para Cancún e 40 pizzas.', 'A statement arrives for a card you never applied for: a jet ski, three tickets to Cancún and 40 pizzas.'),
    def: 'bank', ch: [
      C('lawyer', 'Advogado e boletim já', 'Lawyer and police report now', { w: -800, st: 2 }, 'Tudo estornado em semanas.', 'Everything reversed within weeks.'),
      C('bank', 'Brigar com o banco por telefone', 'Fight the bank by phone', { st: 8, w: -1500 }, 'Seis horas de música de espera depois, metade é estornada.', 'Six hours of hold music later, half is reversed.', { energy: 1 }),
    ] },
  // ------------------------------------------------------------------ saúde e rotina
  { id: 'r11_insomnia', name: l('Insônia', 'Insomnia'), cool: 18, w: (e) => (e.stress > 55 ? 0.8 + (e.stress - 55) / 30 : 0),
    text: T('Três da manhã, de novo. O teto do quarto parece uma planilha de royalties.', 'Three in the morning, again. The bedroom ceiling looks like a royalty spreadsheet.'),
    def: 'pills', ch: [
      C('doctor', 'Médico do sono e rotina rígida', 'Sleep doctor and a strict routine', { w: -600, st: -10, h: 4 }, 'Sem telas à noite, café só até as 14h. Funciona.', 'No screens at night, coffee only till 2pm. It works.', { energy: 1 }),
      C('drink', 'Uma dose para relaxar', 'A nightcap to unwind', { st: -5, dep: ['drink', 6], h: -1 }, 'Dorme-se. Mal, mas dorme-se.', 'You sleep. Badly, but you sleep.'),
      C('pills', 'Remédio por conta própria', 'Self-medicate with pills', { st: -4, h: -2 }, 'Você acorda grogue em reuniões importantes.', 'You wake up groggy for important meetings.'),
    ] },
  { id: 'r11_back_pain', name: l('A coluna reclama', 'Your back complains'), cool: 30, w: (e) => (e.age >= 42 ? 0.6 + (e.age - 42) * 0.03 + (has(e, 'workaholic') ? 0.3 : 0) : 0),
    text: T('Carregar caixas de disco por trinta anos cobrou o preço: você mal consegue sair da cadeira.', 'Thirty years of hauling record boxes sent the bill: you can barely get out of the chair.'),
    def: 'pain', ch: [
      C('physio', 'Fisioterapia duas vezes por semana', 'Physio twice a week', { w: -1200, h: 6, st: -2 }, 'Em dois meses você volta a dançar nas festas do selo.', 'In two months you are dancing at label parties again.', { energy: 1 }),
      C('chair', 'Cadeira ergonômica e alongamento', 'Ergonomic chair and stretching', { w: -500, h: 2 }, 'Melhora um pouco. A cadeira é feia.', 'It helps a bit. The chair is ugly.'),
      C('pain', 'Analgésico e seguir', 'Painkillers and carry on', { h: -3, st: 3 }, 'A dor vira companhia fixa.', 'The pain becomes a constant companion.'),
    ] },
  { id: 'r11_marathon', name: l('Desafio da maratona', 'Marathon challenge'), cool: 48, w: (e) => (e.age < 60 ? 0.4 + (has(e, 'disciplined') ? 0.5 : 0) + (e.ls === 'asceta' ? 0.6 : 0) : 0),
    text: T('Os artistas do selo apostaram que você não termina a maratona da cidade. Faltam quatro meses.', 'The label\'s artists bet you cannot finish the city marathon. Four months to go.'),
    def: 'laugh', ch: [
      C('train', 'Treinar de verdade', 'Train for real', { h: 8, st: -6, arts: 2, fame: 1 }, 'Você cruza a linha em 4h41 e ganha uma foto histórica.', 'You cross the line in 4h41 and earn a historic photo.', { energy: 2, odds: { p: 0.2, fx: { h: -4, st: 4 }, res: l('Uma lesão no joelho no km 30 encerra a aventura.', 'A knee injury at km 30 ends the adventure.') } }),
      C('charity', 'Correr por caridade, com camiseta do selo', 'Run for charity, in a label T-shirt', { h: 5, ins: 2, w: -500 }, 'A arrecadação sai no jornal local.', 'The fundraising makes the local paper.', { energy: 2 }),
      C('laugh', 'Rir e pagar a aposta', 'Laugh and pay the bet', { w: -200 }, 'Você paga um churrasco para todo mundo.', 'You buy everyone a barbecue.'),
    ] },
  { id: 'r11_quit_smoking', name: l('Proibido fumar', 'No smoking'), era: [1988, 2100], cool: 36, w: (e) => (has(e, 'smoker') || vices(e.s).dep.smoke > 25 ? 0.9 : 0),
    text: T('A nova lei proíbe cigarro em escritórios, estúdios e bares. Você passa metade do dia na calçada.', 'The new law bans smoking in offices, studios and bars. You spend half the day on the sidewalk.'),
    def: 'keep', ch: [
      C('quit', 'Parar de vez', 'Quit for good', { st: 8, h: 5, dep: ['smoke', -30], lose: 'smoker' }, 'As primeiras semanas são um inferno. Depois, o ar volta.', 'The first weeks are hell. Then the air comes back.', { odds: { p: 0.35, fx: { st: 6, dep: ['smoke', -5] }, res: l('Recaída na segunda semana, numa festa de lançamento.', 'Relapse in week two, at a launch party.') } }),
      C('patch', 'Adesivo e chiclete de nicotina', 'Nicotine patch and gum', { w: -300, st: 3, dep: ['smoke', -15] }, 'Meio caminho andado.', 'Halfway there.'),
      C('keep', 'Continuar fumando lá fora', 'Keep smoking outside', { st: 1, h: -1 }, 'A calçada vira seu segundo escritório.', 'The sidewalk becomes your second office.'),
    ] },
  { id: 'r11_retreat', name: l('Retiro de silêncio', 'Silent retreat'), cool: 36, w: (e) => 0.3 + (e.ls === 'asceta' ? 1 : 0) + (has(e, 'spiritual') ? 0.6 : 0) + (e.stress > 70 ? 0.4 : 0),
    text: T('Um mosteiro nas montanhas oferece dez dias de silêncio absoluto. Sem telefone, sem selo, sem música.', 'A mountain monastery offers ten days of absolute silence. No phone, no label, no music.'),
    def: 'no', ch: [
      C('go', 'Ir', 'Go', { st: -20, h: 4, w: -600, com: -1, sp: 1 }, 'Você volta ouvindo coisas que antes não ouvia.', 'You come back hearing things you never heard before.', { energy: 3 }),
      C('weekend', 'Só um fim de semana', 'Just a weekend', { st: -8, w: -200 }, 'Dois dias bastam para lembrar como é respirar.', 'Two days are enough to remember how to breathe.', { energy: 1 }),
      C('no', 'Não dá agora', 'Not now', { st: 2 }, 'O folheto fica na gaveta.', 'The brochure stays in the drawer.'),
    ] },
  { id: 'r11_hangover_meeting', name: l('A reunião da ressaca', 'The hangover meeting'), cool: 18, w: (e) => (vices(e.s).dep.drink > 20 || e.ls === 'festeiro' || e.ls === 'boemio' ? 0.7 + vices(e.s).dep.drink / 80 : 0),
    text: T('Você acorda às 11h, de roupa, com uma ligação perdida do banco: a reunião do empréstimo era às 9h.', 'You wake at 11am, fully dressed, with a missed call from the bank: the loan meeting was at 9am.'),
    def: 'excuse', ch: [
      C('honest', 'Ligar e assumir o erro', 'Call and own the mistake', { ins: -1, st: 2 }, 'O gerente aprecia a honestidade e remarca.', 'The manager appreciates the honesty and reschedules.'),
      C('dry', 'Assumir e fazer um mês sem bebida', 'Own it and do a dry month', { ins: -1, dep: ['drink', -12], h: 3, st: 4 }, 'Trinta dias sóbrio. Você lembra de tudo, até do que preferia esquecer.', 'Thirty days sober. You remember everything, even what you\'d rather forget.'),
      C('excuse', 'Inventar uma emergência', 'Invent an emergency', { ins: -2, st: 3 }, 'O gerente finge acreditar.', 'The manager pretends to believe you.'),
    ] },
  // ------------------------------------------------------------------ dinheiro e estilo de vida
  { id: 'r11_sports_car', name: l('O carro esporte', 'The sports car'), cool: 60, w: (e) => (e.age >= 38 && e.age <= 58 && e.wealth > 30000 ? 0.6 + (e.ls === 'magnata' || e.ls === 'jetsetter' ? 0.6 : 0) - (has(e, 'frugal') ? 0.4 : 0) : 0),
    text: T('Na vitrine da concessionária, um conversível vermelho olha para você. O vendedor já sabe seu nome.', 'In the dealership window, a red convertible stares at you. The salesman already knows your name.'),
    def: 'walk', ch: [
      C('buy', 'Comprar à vista', 'Buy it outright', { w: -25000, st: -8, fame: 1, love: -3 }, 'Vento no cabelo, olhares na rua e um IPVA assustador.', 'Wind in your hair, heads turning and a scary insurance bill.'),
      C('rent', 'Alugar por um fim de semana', 'Rent it for a weekend', { w: -700, st: -4 }, 'Dois dias de crise de meia-idade controlada.', 'Two days of a controlled midlife crisis.'),
      C('walk', 'Seguir andando', 'Keep walking', { st: 1 }, 'O carro continua lá. Você também.', 'The car is still there. So are you.'),
    ] },
  { id: 'r11_art_auction', name: l('Leilão de arte', 'Art auction'), cool: 36, w: (e) => (e.wealth > 60000 ? 0.4 + (e.ls === 'magnata' || e.ls === 'mecenas' ? 0.8 : 0) + (has(e, 'intellectual') ? 0.3 : 0) : 0),
    text: T('Um leilão vende o manuscrito original de uma canção histórica e uma tela de um pintor jovem que ninguém conhece ainda.', 'An auction is selling the original manuscript of a historic song and a canvas by a young painter nobody knows yet.'),
    def: 'watch', ch: [
      C('manuscript', 'Arrematar o manuscrito', 'Win the manuscript', { w: -15000, art: 2, ins: 2 }, 'O manuscrito vai para a sede, numa vitrine climatizada.', 'The manuscript goes to HQ, in a climate-controlled case.'),
      C('painter', 'Apostar no pintor jovem', 'Bet on the young painter', { w: -3000 }, 'A tela fica bonita na sala.', 'The canvas looks nice in the living room.', { odds: { p: 0.25, fx: { w: 30000, fame: 1 }, res: l('Dez anos depois, o pintor é estrela e a tela vale dez vezes mais.', 'Ten years later the painter is a star and the canvas is worth ten times more.') } }),
      C('watch', 'Só assistir', 'Just watch', {}, 'Você sai com um catálogo e uma taça de espumante.', 'You leave with a catalogue and a glass of bubbly.'),
    ] },
  { id: 'r11_charity_gala', name: l('Gala beneficente', 'Charity gala'), cool: 24, w: (e) => 0.3 + (e.ls === 'mecenas' ? 1 : 0) + (has(e, 'generous') ? 0.5 : 0) + e.fame / 150,
    text: T('Um hospital infantil convida você para apresentar a gala anual e escalar artistas do selo para tocar de graça.', 'A children\'s hospital invites you to host its annual gala and line up label artists to play for free.'),
    def: 'donate', ch: [
      C('host', 'Apresentar e levar o elenco', 'Host and bring the roster', { ins: 4, arts: 1, fame: 2, st: 3 }, 'A noite arrecada uma fortuna e seu discurso emociona.', 'The night raises a fortune and your speech moves people.', { energy: 2, gate: attrNeed('charisma', 35) }),
      C('donate', 'Só doar', 'Just donate', { w: -2000, ins: 2 }, 'Seu nome aparece na placa de doadores.', 'Your name goes on the donor plaque.'),
      C('decline', 'Declinar', 'Decline', { ins: -1 }, 'A organizadora não esquece.', 'The organiser does not forget.'),
    ] },
  { id: 'r11_vacation_crash', name: l('Férias interrompidas', 'Vacation interrupted'), cool: 24, w: (e) => 0.5 + (e.ls === 'jetsetter' ? 0.8 : 0) + (e.wealth > 20000 ? 0.2 : 0),
    text: T('Primeiro dia numa ilha paradisíaca. O telefone toca: um artista do selo está em crise e o contrato da distribuidora vence amanhã.', 'First day on a paradise island. The phone rings: a label artist is in crisis and the distribution contract expires tomorrow.'),
    def: 'phone', ch: [
      C('fly', 'Voltar no primeiro voo', 'Fly back on the first plane', { w: -1500, st: 6, love: -8, com: 2, arts: 2 }, 'Crise resolvida; a família termina as férias sem você.', 'Crisis solved; the family finishes the holiday without you.'),
      C('phone', 'Resolver por telefone da praia', 'Handle it by phone from the beach', { st: 3, love: -3, com: 1 }, 'Metade das férias no telefone, metade no mar.', 'Half the holiday on the phone, half in the sea.'),
      C('off', 'Desligar o telefone', 'Switch the phone off', { st: -10, love: 6, com: -2, arts: -2 }, 'O mundo sobreviveu. Por pouco.', 'The world survived. Barely.'),
    ] },
  { id: 'r11_home_studio', name: l('Estúdio em casa', 'Home studio'), cool: 60, once: true, w: (e) => (e.wealth > 15000 ? 0.4 + (has(e, 'perfectionist') ? 0.4 : 0) + (artist(e) ? 0.6 : 0) + (e.ls === 'underground' ? 0.3 : 0) : 0),
    text: (s) => (s.year >= 1995
      ? T('Com um computador e duas caixas de som boas dá para gravar quase tudo em casa. O quarto dos fundos está vazio.', 'With a computer and two good monitors you can record almost anything at home. The back room is empty.')(s, {})
      : T('Um gravador de quatro canais e espuma nas paredes: o quarto dos fundos pode virar estúdio.', 'A four-track recorder and foam on the walls: the back room could become a studio.')(s, {})),
    def: 'no', ch: [
      C('build', 'Montar o estúdio', 'Build the studio', { w: -6000, art: 2, sp: 1, st: -3 }, 'Madrugadas criativas sem pagar hora de estúdio.', 'Creative late nights without paying studio hours.', { energy: 1 }),
      C('cheap', 'Versão simples', 'Basic version', { w: -1500, art: 1 }, 'Soa como demo, mas é sua demo.', 'It sounds like a demo, but it is your demo.'),
      C('no', 'Deixar o quarto vazio', 'Leave the room empty', {}, 'O quarto vira depósito de caixas de disco.', 'The room becomes a store for record boxes.'),
    ] },
  // ------------------------------------------------------------------ fama e carreira pessoal
  { id: 'r11_memoir_offer', name: l('Proposta de autobiografia', 'Memoir offer'), cool: 60, once: true, w: (e) => (e.age >= 45 && e.fame > 25 && !life(e.s).memoir ? 0.6 + e.fame / 100 : 0),
    text: T('Uma editora quer sua autobiografia: "tudo sobre os bastidores". Os artistas do selo estão nervosos.', 'A publisher wants your memoir: "everything behind the scenes". The label\'s artists are nervous.'),
    def: 'later', ch: [
      C('tell_all', 'Contar tudo', 'Tell everything', { w: 12000, fame: 4, arts: -5, ins: -1, st: 4 }, 'Best-seller imediato. Alguns ex-artistas nunca mais falam com você.', 'Instant best-seller. Some former artists never speak to you again.', { energy: 2 }),
      C('gentle', 'Livro elegante, sem fofoca', 'Elegant book, no gossip', { w: 4000, fame: 2, art: 2 }, 'A crítica elogia a prosa; as vendas são modestas.', 'Critics praise the prose; sales are modest.', { energy: 2 }),
      C('later', 'Ainda não', 'Not yet', {}, 'A editora deixa o cartão.', 'The publisher leaves a card.'),
    ] },
  { id: 'r11_teach', name: l('Convite para dar aulas', 'Teaching invitation'), cool: 48, w: (e) => 0.3 + (has(e, 'intellectual') ? 0.6 : 0) + (e.ls === 'intelectual' ? 0.8 : 0) + (e.age > 45 ? 0.2 : 0),
    text: T('A universidade quer que você dê um curso de um semestre sobre a indústria fonográfica.', 'The university wants you to teach a one-semester course on the record industry.'),
    def: 'no', ch: [
      C('teach', 'Aceitar o semestre', 'Take the semester', { ins: 3, art: 1, st: 3, sp: 1 }, 'Alunos curiosos fazem perguntas que você nunca se fez. Dois deles viram estagiários.', 'Curious students ask questions you never asked yourself. Two become interns.', { energy: 2 }),
      C('lecture', 'Só uma palestra', 'Just one lecture', { ins: 1 }, 'O auditório lota.', 'The auditorium is packed.'),
      C('no', 'Recusar', 'Decline', {}, 'Talvez um dia.', 'Maybe someday.'),
    ] },
  { id: 'r11_troll', name: l('O perseguidor das redes', 'The online troll'), era: [2008, 2100], cool: 24, w: (e) => 0.3 + e.fame / 80,
    text: T('Uma conta anônima publica todos os dias críticas cruéis sobre você, sua aparência e seu selo. Já são meses.', 'An anonymous account posts cruel attacks on you, your looks and your label every day. It has been months.'),
    def: 'ignore', ch: [
      C('block', 'Bloquear e se afastar das redes', 'Block and step back from social media', { st: -6, fame: -1 }, 'Sem notificações, o mundo fica mais silencioso.', 'Without notifications, the world gets quieter.'),
      C('expose', 'Contratar perícia para identificar a conta', 'Hire experts to unmask the account', { w: -1500, st: 2 }, 'Era um ex-funcionário do selo. A conta some.', 'It was a former label employee. The account vanishes.', { odds: { p: 0.4, fx: { st: 5 }, res: l('A perícia não chegou a lugar nenhum.', 'The experts got nowhere.') } }),
      C('ignore', 'Ignorar', 'Ignore it', { st: 5 }, 'Você lê tudo, mesmo dizendo que não lê.', 'You read everything, even though you say you don\'t.'),
    ] },
  { id: 'r11_politician_dinner', name: l('Jantar com o político', 'Dinner with the politician'), cool: 36, w: (e) => (e.fame > 30 ? 0.4 + (isPolitical(e.v) ? 0.5 : 0) : 0),
    text: T('Um candidato importante convida você para um jantar fechado. Quer "o apoio da classe artística" e uma foto.', 'A major candidate invites you to a private dinner. He wants "the support of the artistic community" and a photo.'),
    def: 'decline', ch: [
      C('endorse', 'Ir e posar para a foto', 'Go and pose for the photo', { ins: 3, art: -2, arts: -2, eng: 8 }, 'A foto circula. Metade dos artistas do selo para de responder.', 'The photo circulates. Half the label\'s artists stop replying.'),
      C('private', 'Ir, mas sem foto', 'Go, but no photo', { ins: 1, st: 1 }, 'Você ouve muito e promete pouco.', 'You listen a lot and promise little.', { energy: 1 }),
      C('decline', 'Declinar', 'Decline', { ins: -1 }, 'A assessoria dele anota seu nome.', 'His staff write your name down.'),
    ] },
  { id: 'r11_faith_concert', name: l('Show na comunidade de fé', 'Concert at your faith community'), cool: 36, w: (e) => (isDevout(e.v) ? 0.7 : 0), pick: (e, r) => (e.acts.length ? actCtx(e, r) : {}),
    text: (s, c) => (c.act
      ? T('Sua comunidade religiosa pede um show beneficente de {a} para reformar o telhado.', 'Your faith community asks for an {a} benefit show to fix the roof.')(s, c)
      : T('Sua comunidade religiosa pede ajuda para reformar o telhado.', 'Your faith community asks for help fixing the roof.')(s, c)),
    def: 'donate', ch: [
      C('show', 'Organizar o show', 'Organise the show', { ins: 2, st: -3, mor: 4, dev: 4 }, 'O salão lota e o telhado fica pronto antes das chuvas.', 'The hall is packed and the roof is done before the rains.', { energy: 1, gate: (e, c) => (c.act ? null : l('Exige um artista no elenco.', 'Requires an artist on the roster.')) }),
      C('donate', 'Doar do próprio bolso', 'Donate from your pocket', { w: -1200, dev: 2 }, 'O padre/pastor agradece no sermão.', 'The clergy thank you in the sermon.'),
      C('skip', 'Não desta vez', 'Not this time', { dev: -2 }, 'Olham para você de um jeito diferente no próximo encontro.', 'They look at you differently at the next gathering.'),
    ] },
  { id: 'r11_underground_show', name: l('Show secreto no porão', 'Secret basement show'), cool: 24, w: (e) => 0.3 + (e.ls === 'underground' ? 1.2 : 0) + (has(e, 'rebel') ? 0.4 : 0),
    text: T('Um flyer xerocado: show secreto num porão às 2h, sem nome das bandas. Dizem que a próxima grande cena está lá.', 'A photocopied flyer: secret basement show at 2am, no band names. They say the next big scene is there.'),
    def: 'sleep', ch: [
      C('go', 'Ir sozinho, sem crachá', 'Go alone, no badge', { st: -4, art: 2, h: -1, sp: 1 }, 'Barulho, suor e uma banda que você não tira da cabeça.', 'Noise, sweat and a band you cannot get out of your head.', { energy: 1, odds: { p: 0.2, fx: { st: 3, h: -3, heat: 3 }, res: l('A polícia fechou o porão e você passou a noite numa delegacia.', 'The police shut the basement and you spent the night at a station.') } }),
      C('sleep', 'Dormir', 'Sleep', { h: 1 }, 'No dia seguinte, todos falam do show.', 'The next day, everyone is talking about the show.'),
    ] },
  { id: 'r11_old_diary', name: l('O caderno antigo', 'The old notebook'), cool: 60, once: true, w: (e) => (e.age >= 35 ? 0.4 : 0),
    text: T('Na mudança, aparece seu caderno dos 19 anos: letras, sonhos e uma lista de "coisas que nunca vou fazer quando tiver sucesso".', 'While moving, your notebook from age 19 turns up: lyrics, dreams and a list of "things I\'ll never do when I\'m successful".'),
    def: 'shelf', ch: [
      C('read', 'Ler tudo com calma', 'Read it all slowly', { st: -5, art: 2, gain: 'honest' }, 'Você risca três itens da lista que já fez, e decide parar.', 'You cross off three items you already did, and decide to stop.', { energy: 1 }),
      C('song', 'Dar uma das letras a um artista do selo', 'Give one lyric to a label artist', { arts: 2, art: 1 }, 'A letra antiga vira o melhor verso do próximo disco.', 'The old lyric becomes the best line on the next record.'),
      C('shelf', 'Guardar de volta na caixa', 'Put it back in the box', {}, 'Algumas coisas ficam melhor fechadas.', 'Some things are better left closed.'),
    ] },
  { id: 'r11_needy_artist_call', name: l('Ligação na véspera', 'Eve-of-release call'), cool: 18, w: (e) => (e.acts.length && !artist(e) ? 0.6 : 0), pick: actCtx,
    text: T('Na véspera do lançamento, {p} ({a}) liga chorando: acha o disco horrível e quer adiar tudo.', 'On release eve, {p} ({a}) calls in tears: thinks the record is awful and wants to postpone everything.'),
    def: 'firm', ch: [
      C('visit', 'Ir até lá e ouvir o disco junto', 'Go over and listen together', { mor: 12, st: 2, arts: 1 }, 'Lado A, lado B, dois copos de café. No fim, {p} sorri.', 'Side A, side B, two cups of coffee. At the end, {p} smiles.', { energy: 1 }),
      C('delay', 'Adiar um mês', 'Delay a month', { mor: 6, com: -2, cash: -800 }, 'O adiamento custa caro e não muda nada no disco.', 'The delay is costly and changes nothing on the record.'),
      C('firm', 'Manter a data', 'Keep the date', { mor: -6, res: 6 }, '{p} desliga sem se despedir.', '{p} hangs up without a goodbye.'),
    ] },
];
