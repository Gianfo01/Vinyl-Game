// R31 · onda 5 (TUT, EXP-12) — O ROTEIRO do tutorial guiado, como DADOS (fácil de editar):
// cada passo = alvo (objects5 / keys5 / botão da casca / papel / região), fala bilíngue do mentor ({m} = nome do
// mentor, {b} = a banda roteirizada, {k} = tecla do alvo), o que fica liberado além do alvo, a condição de concluído e
// a ação que o passo pede (`do`, usada pelo robô do teste). Só os passos puramente explicativos têm "Entendi" (ack).
// 12 capítulos (~15 min, cada um pulável) + 1 capítulo extra curto da carreira principal (mesmo motor).
// EXP-13 (ações no objeto): clicar num objeto pode abrir só um cartão de ações ao lado dele; por isso "abrir" conclui com
// o cartão OU o papel (opened5) e os passos de fazer concluem pela AÇÃO no mundo, não pela tela onde ela foi feita.
// Ordem: a virada do mês vem antes de lançar porque a gravação leva dias (o single precisa de músicas gravadas).

import { l } from '../../data/world';
import { bare5, cityHash5, opened5, setScript5, type Chapter5, type Step5 } from './tut5model';
import { ownerCity } from '../../sim/sys/mapx8';
import { energyLeft } from '../../sim/sys/life';
import { monthIndex } from '../../sim/capacity';
import { pocketIds5 } from '../../sim/r31/exp5';

const open = (id: string, obj: string, say: ReturnType<typeof l>): Step5 =>
  ({ id, say, target: { obj }, done: (c) => opened5(c.v, obj), do: { open: obj } });
const travel = (id: string, r: 'sede' | 'casa' | 'cidade' | 'mundo', say: ReturnType<typeof l>): Step5 =>
  ({ id, say, target: { travel: r }, done: (c) => c.v.region === r && bare5(c.v), do: { travel: r } });
const ackOn = (id: string, target: Step5['target'], say: ReturnType<typeof l>): Step5 => ({ id, say, target, ack: true, do: { ack: true } });

export const CHAPTERS5: Chapter5[] = [
  { id: 'sede', title: l('A sede e o topo', 'The HQ and the top bar'), mins: 1.5, steps: [
    ackOn('ola', { region: 'sede' }, l('Olá! Eu sou {m}. Vou te mostrar o ofício fazendo, não lendo. Esta é a sua sede: cada objeto é uma parte do negócio. Clique nele (ou use a tecla) e ele abre.',
      'Hello! I am {m}. I will show you the trade by doing, not reading. This is your HQ: every object is a part of the business. Click it (or use its key) and it opens.')),
    ackOn('data', { shell: 'date' }, l('Aqui em cima, a data. O jogo anda mês a mês, só quando você manda.', 'Up here, the date. The game moves month by month, only when you say so.')),
    ackOn('caixa', { shell: 'cash' }, l('O caixa da empresa. Vermelho é dívida: cuidado com ele.', 'The company cash. Red means debt: keep an eye on it.')),
    ackOn('fama', { shell: 'fame' }, l('A fama do selo (média da reputação artística, comercial, com artistas e com o mercado).', 'The label\'s fame (average of artistic, commercial, artist and industry reputation).')),
    ackOn('bang', { shell: 'recados' }, l('Um "!" num objeto é novidade esperando por você. Os recados mais urgentes ficam nesta secretária, cada um com "ir até lá".',
      'A "!" on an object is news waiting for you. The most urgent messages sit on this answering machine, each with "go there".')),
    ackOn('avancar', { shell: 'advance' }, l('E este é o botão de avançar o mês (Ctrl+Enter). Ainda não! Primeiro vamos arrumar o mês.', 'And this is the advance-month button (Ctrl+Enter). Not yet! First let\'s set up the month.')),
  ] },
  { id: 'caixa', title: l('A caixa de entrada', 'The inbox'), mins: 1, steps: [
    open('abrir', 'correspondencia', l('Chegou correspondência. Abra a caixa de entrada (tecla {k}).', 'Mail has arrived. Open the inbox (key {k}).')),
    ackOn('ler', { paper: true }, l('Cada carta é um recado do mundo. As importantes trazem "ir até lá", que leva direto ao objeto certo. Uma delas fala de {b}, que está na recepção.',
      'Each letter is a message from the world. The important ones carry "go there", which takes you straight to the right object. One of them is about {b}, who are at reception.')),
    { id: 'fechar', say: l('Feche a carta (botão "fechar") para voltar à sala.', 'Close the letter ("close" button) to get back to the office.'), target: { paper: true },
      done: (c) => bare5(c.v), do: { bot: 'close' } },
  ] },
  { id: 'contratar', title: l('Contratar a banda', 'Signing the band'), mins: 1.5, steps: [
    open('fichario', 'fichario', l('Os contatos ficam no fichário (tecla {k}). Abra.', 'Contacts live in the rolodex (key {k}). Open it.')),
    { id: 'assinar', say: l('Ache o cartão de {b}, abra a ficha e proponha um contrato. Se pedirem mais, aceite a contraproposta; se recusarem, melhore a proposta e tente de novo.', 'Find {b}\'s card, open their file and offer a contract. If they ask for more, accept the counter-offer; if they refuse, sweeten it and try again.'),
      target: { paper: true }, done: (c) => c.band?.owner === 'player', do: { bot: 'sign' } },
  ] },
  { id: 'planejar', title: l('Marcar a gravação', 'Booking the recording'), mins: 1.5, steps: [
    open('mural', 'mural', l('Agora {b} é seu. Cada artista vira uma polaroid no mural de cortiça (tecla {k}). Dê uma olhada.', '{b} is yours now. Each artist becomes a polaroid on the corkboard (key {k}). Take a look.')),
    open('quadro', 'quadroplan', l('O quadro de planejamento (tecla {k}) mostra os próximos 12 meses de cada artista.', 'The planning board (key {k}) shows each artist\'s next 12 months.')),
    { id: 'marcar', say: l('Marque uma gravação de {b} para o mês que vem no quadro.', 'Book a recording for {b} next month on the board.'), target: { paper: true },
      done: (c) => c.s.plans.some((p) => p.actId === c.band?.id && p.action === 'record'), do: { bot: 'plan' } },
  ] },
  { id: 'gravar', title: l('A mesa de som', 'The mixing desk'), mins: 1.5, steps: [
    open('mesa', 'mesasom', l('Não precisa esperar: o estúdio da sede está livre. Vá à mesa de som (tecla {k}).', 'No need to wait: the HQ studio is free. Go to the mixing desk (key {k}).')),
    { id: 'sessao', say: l('Comece uma sessão com {b}: escolha as músicas e o jeito de gravar.', 'Start a session with {b}: pick the songs and how to record.'), target: { paper: true },
      done: (c) => c.s.sessions.some((x) => x.actId === c.band?.id), do: { bot: 'record' } },
  ] },
  { id: 'virada', title: l('A virada do mês', 'Turning the month'), mins: 1, steps: [
    { id: 'avancar', say: l('A gravação leva alguns dias. Agora sim: avance o mês.', 'Recording takes a few days. Now yes: advance the month.'), target: { shell: 'advance' },
      done: (c) => monthIndex(c.s) > c.b.t, do: { shell: 'advance' } },
    ackOn('resultado', { shell: 'date' }, l('O calendário virou. Na virada o mundo anda: vendas, paradas, contas e recados novos. As músicas de {b} estão gravadas.',
      'The calendar turned. At the turn the world moves: sales, charts, bills and new messages. {b}\'s songs are recorded.')),
  ] },
  { id: 'lancar', title: l('Lançar e divulgar', 'Release and promote'), mins: 2, steps: [
    open('quadrobranco', 'quadrobranco', l('Lançamentos se planejam no quadro branco da sala de reunião (tecla {k}).', 'Releases are planned on the meeting-room whiteboard (key {k}).')),
    { id: 'single', say: l('Lance um single de {b} e ponha alguma verba de divulgação (rádio, imprensa).', 'Release a {b} single and put some promotion money in (radio, press).'), target: { paper: true },
      done: (c) => c.s.pendingReleases.some((p) => p.actId === c.band?.id) || Object.values(c.s.releases).some((r) => r.actId === c.band?.id), do: { bot: 'release' } },
    open('revista', 'revista', l('Quando sair, a posição dele aparece na revista de paradas (tecla {k}).', 'Once it is out, its position shows in the charts magazine (key {k}).')),
  ] },
  { id: 'livro', title: l('O livro-caixa', 'The ledger'), mins: 1, steps: [
    open('livro', 'livrocaixa', l('De onde veio e para onde foi o dinheiro? Abra o livro-caixa (tecla {k}).', 'Where did the money come from and go? Open the ledger (key {k}).')),
    ackOn('ler', { paper: true }, l('Cada linha é uma entrada ou saída: adiantamento, gravação, fabricação, divulgação. Os resultados por artista e por disco também estão aqui.',
      'Each line is money in or out: advance, recording, manufacturing, promotion. Results per artist and per record are here too.')),
  ] },
  { id: 'cidade', title: l('A cidade', 'The city'), mins: 1.5, steps: [
    travel('ir', 'cidade', l('Saia da sede: vá à cidade (botão de viagem, tecla {k}).', 'Leave the HQ: go to the city (travel button, key {k}).')),
    { id: 'show', say: l('Lojas de discos, rádio, jornal e a casa de shows ficam aqui. Marque um show de {b} na cidade.', 'Record shops, radio, newspaper and the venue are here. Book a {b} show in town.'), target: { region: 'cidade' }, free: [{ paper: true }],
      done: (c) => (c.s.tours?.length ?? 0) > c.b.tours, do: { bot: 'show' } },
  ] },
  { id: 'mundo', title: l('O mundo', 'The world'), mins: 1.5, steps: [
    travel('ir', 'mundo', l('O mundo inteiro é seu mercado. Vá ao mapa-múndi (tecla {k}).', 'The whole world is your market. Go to the world map (key {k}).')),
    { id: 'viagem', say: l('Faça a primeira viagem: escolha uma cidade e compre a passagem (sai do seu bolso e leva dias).', 'Take your first trip: pick a city and buy the ticket (it comes out of your own pocket and takes days).'), target: { region: 'mundo' }, free: [{ paper: true }],
      done: (c) => cityHash5(ownerCity(c.s)) !== c.b.city, do: { bot: 'trip' } },
  ] },
  { id: 'casa', title: l('A casa', 'Home'), mins: 1, steps: [
    travel('ir', 'casa', l('Você também tem uma vida. Vá para casa (tecla {k}).', 'You have a life too. Go home (key {k}).')),
    { id: 'descanso', say: l('Sua energia do mês é limitada e o estresse cobra. Tire um dia de folga.', 'Your monthly energy is limited and stress takes its toll. Take a day off.'), target: { region: 'casa' }, free: [{ paper: true }],
      done: (c) => energyLeft(c.s) < c.b.energy, do: { bot: 'rest' } },
  ] },
  { id: 'teclas', title: l('Teclas e bolso', 'Keys and pocket'), mins: 1, steps: [
    { id: 'agenda', say: l('A agenda de couro (tecla {k}) abre de qualquer lugar. Abra e peça "ver tudo ▸".', 'The leather planner (key {k}) opens from anywhere. Open it and ask for "see all ▸".'),
      target: { obj: 'agenda' }, free: [{ paper: true }], done: (c) => c.v.paper === 'agenda', do: { open: 'agenda' } },
    { id: 'fixar', say: l('O que você mais usa vai no bolso: aperte "+ fixar".', 'What you use most goes in the pocket: press "+ pin".'), target: { shell: 'pin' }, free: [{ paper: true }],
      done: (c) => pocketIds5(c.s).length > c.b.pocket, do: { shell: 'pin' } },
    { id: 'ajuda', say: l('Esqueceu uma tecla? "?" mostra todas — e dá para trocar.', 'Forgot a key? "?" shows them all — and you can change them.'), target: { shell: 'help' },
      done: (c) => c.v.help, do: { shell: 'help' } },
    { id: 'fecha', say: l('Pronto. Feche a lista (botão "fechar").', 'Done. Close the list ("close" button).'), target: { shell: 'helpbox' }, done: (c) => !c.v.help, do: { shell: 'helpbox' } },
  ] },
];

/** Capítulo extra curto por carreira (o da carreira principal entra depois dos 12). */
const extra = (career: string, obj: string, title: ReturnType<typeof l>, say: ReturnType<typeof l>, more: ReturnType<typeof l>): Chapter5 => ({
  id: `car-${career}`, career, title, mins: 1, steps: [
    { id: 'abrir', say, target: { obj }, done: (c) => opened5(c.v, obj), do: { open: obj } },
    ackOn('ler', { paper: true }, more),
  ],
});
export const EXTRAS5: Record<string, Chapter5> = {
  label: extra('label', 'car:label', l('Extra: a gravadora', 'Extra: the record label'), l('Seu selo tem identidade e valor de mercado. Abra a gravadora (tecla {k}).', 'Your label has an identity and a market value. Open the label (key {k}).'),
    l('Aqui ficam o nome, o logotipo, o foco de gêneros e, um dia, a venda do selo. Gravadoras crescem por catálogo: cada disco segue vendendo.', 'Here are the name, the logo, the genre focus and, one day, the sale of the label. Labels grow by catalogue: every record keeps selling.')),
  musician: extra('musician', 'car:musician', l('Extra: a banda', 'Extra: the band'), l('Você também toca. O QG da banda (tecla {k}) é a sua carreira de artista.', 'You play too. The band HQ (key {k}) is your artist career.'),
    l('Ensaios, composição, formação e shows da sua própria banda. Artista vive de palco e de repertório.', 'Rehearsals, writing, line-up and gigs for your own band. Artists live on stage and repertoire.')),
  booking: extra('booking', 'car:booking', l('Extra: a agência', 'Extra: the agency'), l('A agência de shows (tecla {k}) vende datas de artistas para casas e festivais.', 'The booking agency (key {k}) sells artist dates to venues and festivals.'),
    l('Agência ganha comissão por data: monte rotas, negocie cachês e mantenha as casas felizes.', 'An agency earns a commission per date: build routes, negotiate fees and keep venues happy.')),
  festival: extra('festival', 'car:festival', l('Extra: o festival', 'Extra: the festival'), l('O terreno do seu festival (tecla {k}) é onde se monta o line-up.', 'Your festival grounds (key {k}) are where the line-up is built.'),
    l('Festival vive de line-up, ingresso e clima: convide atrações, monte palcos e cuide do público.', 'A festival lives on line-up, tickets and weather: invite acts, build stages and look after the crowd.')),
  studio: extra('studio', 'car:studio', l('Extra: o estúdio', 'Extra: the studio'), l('Seu estúdio (tecla {k}) aluga horas e produtores para quem grava.', 'Your studio (key {k}) rents hours and producers to whoever records.'),
    l('Estúdio vive de agenda cheia e equipamento bom: horas vendidas, produtores e salas.', 'A studio lives on a full calendar and good gear: hours sold, producers and rooms.')),
  manager: extra('manager', 'agenda', l('Extra: o empresário', 'Extra: the manager'), l('Empresário cuida da carreira de outros. A agenda (tecla {k}) é a sua ferramenta principal.', 'A manager runs other people\'s careers. The planner (key {k}) is your main tool.'),
    l('Empresário ganha porcentagem do que o artista ganha: agenda cheia, bons contratos e artistas saudáveis.', 'A manager earns a share of what the artist earns: a full calendar, good deals and healthy artists.')),
  venue: extra('venue', 'car:venue', l('Extra: a casa de shows', 'Extra: the venue'), l('Sua casa de shows (tecla {k}) tem palco, bar e agenda.', 'Your venue (key {k}) has a stage, a bar and a calendar.'),
    l('Casa de shows vive de noites cheias: escolha as atrações, o preço do ingresso e cuide do bar.', 'A venue lives on full nights: pick the acts, the ticket price and look after the bar.')),
  publisher: extra('publisher', 'car:publisher', l('Extra: a editora', 'Extra: the publisher'), l('Sua editora musical (tecla {k}) cuida das canções e dos direitos.', 'Your music publisher (key {k}) looks after songs and rights.'),
    l('Editora ganha com cada execução e regravação: contrate autores e coloque as canções na boca dos cantores.', 'A publisher earns from every play and cover: sign writers and get the songs to singers.')),
};

setScript5(CHAPTERS5, EXTRAS5);
