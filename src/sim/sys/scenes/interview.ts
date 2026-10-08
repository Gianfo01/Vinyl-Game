// Talk show, entrevista e coletiva (mini-jogo): perguntas com tempo e quatro tons de resposta.
// Cada resposta move imagem pública, popularidade, fãs, haters e a relação com o veículo.
// O cenário muda com a era: rádio, variedades em P&B, auditório, parada na TV, canal de clipes,
// talk show, podcast em vídeo e live.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { activeMembers, checkCapacity, monthIndex } from '../../capacity';
import { fandomOf } from '../../fandom';
import { activeCensorship, respondCrisis } from '../../media';
import { cityById, genreById } from '../../../data/world';
import { attrById } from '../talent/attrs';
import type { Act, GameState } from '../../types';
import { fmtL, hasTech, remember } from '../../util';
import type { Cutscene } from '../../ext4';
import { clampN, cooled, findScene, patchScene, queueScene, sc, setCool, type PlaceKind } from './state';

export type Tone = 'sincere' | 'evasive' | 'provoke' | 'funny';
export const TONES: Tone[] = ['sincere', 'evasive', 'provoke', 'funny'];
export const TONE_NAMES: Record<Tone, L> = {
  sincere: l('Sincero', 'Sincere'),
  evasive: l('Evasivo', 'Evasive'),
  provoke: l('Provocador', 'Provocative'),
  funny: l('Engraçado', 'Funny'),
};

export type Topic = 'release' | 'rival' | 'scandal' | 'private' | 'politics' | 'fans' | 'money' | 'future' | 'roots' | 'craft';

export interface Question {
  topic: Topic;
  text: L;
  ideal: Tone;
  risky: Tone;
  /** respostas escritas para esta pergunta, uma por tom (rodada 5) */
  answers?: Record<Tone, L>;
}

/** Pergunta do banco: texto, quatro respostas (uma por tom), tom ideal e arriscado. */
interface QDef {
  topic: Topic;
  q: L;
  a: Record<Tone, L>;
  ideal: Tone;
  risky: Tone;
}

const A = (sincere: L, evasive: L, provoke: L, funny: L): Record<Tone, L> => ({ sincere, evasive, provoke, funny });

const BANK: QDef[] = [
  // lançamento
  { topic: 'release', q: l('O que tem de diferente em "{release}"?', 'What is different about "{release}"?'), ideal: 'sincere', risky: 'evasive', a: A(
    l('A gente parou de tentar agradar todo mundo. "{release}" é o disco mais pessoal que já fizemos.', 'We stopped trying to please everyone. "{release}" is the most personal thing we have made.'),
    l('Ah, é melhor ouvir do que eu explicar, né?', 'Oh, better to hear it than have me explain, right?'),
    l('Diferente? Ele é melhor que tudo que está tocando hoje. Simples assim.', 'Different? It is better than everything playing today. Simple as that.'),
    l('Dessa vez a gente afinou os instrumentos antes. Mudou tudo!', 'This time we tuned the instruments first. Changed everything!')) },
  { topic: 'release', q: l('Dizem que a faixa principal de "{release}" foi gravada numa noite só. É verdade?', 'They say the lead track on "{release}" was cut in one night. True?'), ideal: 'funny', risky: 'provoke', a: A(
    l('É verdade. Saiu de primeira e ninguém quis estragar repetindo.', 'True. It came out on the first take and nobody wanted to spoil it.'),
    l('Estúdio é um lugar mágico, o tempo passa diferente lá dentro.', 'The studio is a magic place; time moves differently in there.'),
    l('Uma noite basta quando se tem talento. Outros precisam de um ano.', 'One night is enough when you have talent. Others need a year.'),
    l('Uma noite e umas quarenta xícaras de café. O café merece crédito no encarte.', 'One night and about forty cups of coffee. The coffee deserves a sleeve credit.')) },
  { topic: 'release', q: l('Qual música de "{release}" você mostraria para alguém que nunca ouviu {act}?', 'Which song from "{release}" would you play for someone who has never heard {act}?'), ideal: 'sincere', risky: 'evasive', a: A(
    l('A primeira faixa. Ela resume quem a gente é: {genre} com o coração na mão.', 'The opening track. It sums up who we are: {genre} with our heart on our sleeve.'),
    l('Todas são filhas, não dá para escolher.', 'They are all our children, I cannot choose.'),
    l('Nenhuma. Quem não conhece {act} até hoje não merece.', 'None. Anyone who does not know {act} by now does not deserve it.'),
    l('A faixa escondida. Se a pessoa achar, já virou fã.', 'The hidden track. If they find it, they are already a fan.')) },
  // rival
  { topic: 'rival', q: l('O que você acha do sucesso de {rival}?', 'What do you make of {rival}\'s success?'), ideal: 'funny', risky: 'provoke', a: A(
    l('Eles trabalharam muito. Tenho respeito, mesmo sendo bem diferentes de nós.', 'They worked hard. I respect it, even though we are very different.'),
    l('Não acompanho muito, ando ocupado(a) com o nosso disco.', 'I do not follow them much, I have been busy with our record.'),
    l('Sucesso? Rádio toca qualquer coisa se o selo pagar.', 'Success? Radio plays anything if the label pays.'),
    l('Adoro! Toda vez que eles tocam no rádio eu aproveito para ir ao banheiro.', 'Love it! Every time they are on the radio I get a bathroom break.')) },
  { topic: 'rival', q: l('É verdade que vocês não se falam com {rival}?', 'Is it true you are not on speaking terms with {rival}?'), ideal: 'evasive', risky: 'provoke', a: A(
    l('Teve um desentendimento antigo, mas eu desejo o melhor para eles.', 'There was an old disagreement, but I wish them the best.'),
    l('Isso é coisa de revista. A gente se cruza pouco.', 'That is magazine talk. We rarely cross paths.'),
    l('Falar com {rival}? Eu nem sei se eles sabem falar sem playback.', 'Talk to {rival}? I am not sure they can talk without playback.'),
    l('A gente se fala sim — por bilhetinho, pelo assessor, uma vez por década.', 'We do talk — by notes, through our press agents, once a decade.')) },
  // escândalo
  { topic: 'scandal', q: l('Vamos falar do assunto da semana: {crisis}', 'Let\'s talk about this week\'s story: {crisis}'), ideal: 'sincere', risky: 'provoke', a: A(
    l('Eu errei e peço desculpas a quem se sentiu atingido. Vou aprender com isso.', 'I made a mistake and I apologise to anyone hurt. I will learn from it.'),
    l('Meus advogados estão cuidando disso. Prefiro falar de música.', 'My lawyers are handling that. I would rather talk about music.'),
    l('Isso é perseguição. Quando é com outros artistas, ninguém fala nada.', 'This is persecution. When it is other artists, nobody says a thing.'),
    l('Se eu soubesse que dava tanta audiência, tinha feito antes!', 'If I had known it would get these ratings, I would have done it sooner!')) },
  { topic: 'scandal', q: l('Você deve desculpas a alguém?', 'Do you owe anyone an apology?'), ideal: 'sincere', risky: 'provoke', a: A(
    l('Devo, sim. Aos fãs, que mereciam mais de mim nos últimos tempos.', 'I do. To the fans, who deserved more from me lately.'),
    l('Todo mundo deve desculpas a alguém, não é?', 'Everyone owes someone an apology, right?'),
    l('Desculpas? Quem me deve desculpas é a imprensa.', 'An apology? The press owes ME an apology.'),
    l('Ao meu vizinho, pelo ensaio das três da manhã.', 'To my neighbour, for the 3 a.m. rehearsal.')) },
  { topic: 'scandal', q: l('Como a banda está lidando com toda essa polêmica?', 'How is the band dealing with all this controversy?'), ideal: 'sincere', risky: 'funny', a: A(
    l('Está sendo duro. A gente conversou muito e decidiu enfrentar junto.', 'It has been hard. We talked a lot and decided to face it together.'),
    l('Estamos focados no trabalho, o resto é ruído.', 'We are focused on the work, the rest is noise.'),
    l('A banda está ótima. Quem está com problema é quem inventou essa história.', 'The band is great. Whoever made up this story is the one with problems.'),
    l('Do jeito de sempre: fingindo que não lê os jornais.', 'As always: pretending we do not read the papers.')) },
  // vida pessoal
  { topic: 'private', q: l('E a vida amorosa, como vai?', 'How is your love life?'), ideal: 'evasive', risky: 'sincere', a: A(
    l('Estou apaixonado(a), e é a primeira vez que falo disso em público.', 'I am in love, and this is the first time I say it in public.'),
    l('Minha vida amorosa está nas letras. Quem quiser, que adivinhe.', 'My love life is in the lyrics. Guess if you want.'),
    l('Isso não é da sua conta — nem da de ninguém.', 'That is none of your business — or anyone\'s.'),
    l('Estou num relacionamento sério com o meu violão. Ele não reclama da turnê.', 'I am in a serious relationship with my guitar. It never complains about touring.')) },
  { topic: 'private', q: l('É verdade que você pensa em largar tudo?', 'Is it true you are thinking of quitting?'), ideal: 'sincere', risky: 'provoke', a: A(
    l('Já pensei, nos dias ruins. Mas a música sempre me puxa de volta.', 'I have thought about it on bad days. But music always pulls me back.'),
    l('Quem nunca pensou em largar o emprego?', 'Who has never thought about quitting their job?'),
    l('Largar? Com essa concorrência fraca, eu seria louco(a).', 'Quit? With competition this weak, I would be crazy.'),
    l('Só quando o despertador toca antes do meio-dia.', 'Only when the alarm goes off before noon.')) },
  { topic: 'private', q: l('Como foi crescer em {city}?', 'What was growing up in {city} like?'), ideal: 'sincere', risky: 'provoke', a: A(
    l('{city} me ensinou tudo: os bailes, as rádios, os vizinhos reclamando do barulho.', '{city} taught me everything: the dances, the radios, the neighbours complaining about noise.'),
    l('Normal, como qualquer infância.', 'Normal, like any childhood.'),
    l('{city} não dava valor a artista. Tive que sair para ser ouvido(a).', '{city} did not value artists. I had to leave to be heard.'),
    l('Barulhento. Mas eu era a parte mais barulhenta.', 'Noisy. But I was the noisiest part.')) },
  // política
  { topic: 'politics', q: l('Música deve falar de política?', 'Should music talk politics?'), ideal: 'sincere', risky: 'provoke', a: A(
    l('A música sempre falou do seu tempo. Não dá para fingir que nada acontece lá fora.', 'Music has always spoken about its time. You cannot pretend nothing happens outside.'),
    l('Cada artista decide. Eu prefiro deixar a música falar.', 'Each artist decides. I prefer to let the music speak.'),
    l('Quem tem medo de música política tem algo a esconder.', 'Anyone afraid of political music has something to hide.'),
    l('Só se a política aprender a dançar.', 'Only if politics learns to dance.')) },
  { topic: 'politics', q: l('O que você diria ao governo hoje?', 'What would you tell the government today?'), ideal: 'evasive', risky: 'provoke', a: A(
    l('Que olhe para a cultura e para quem vive dela, não só nas eleições.', 'To look after culture and those who live from it, not only at election time.'),
    l('Eu diria "boa noite" e cantaria a próxima música.', 'I would say "good night" and play the next song.'),
    l('Nada que possa ir ao ar.', 'Nothing that could go on air.'),
    l('Que baixe o imposto do disco — e do café do estúdio.', 'To cut the tax on records — and on studio coffee.')) },
  // fãs
  { topic: 'fans', q: l('Uma mensagem para quem acampou na porta?', 'A message for the fans who camped outside?'), ideal: 'sincere', risky: 'provoke', a: A(
    l('Vocês são o motivo de tudo isso. Obrigado(a) de verdade.', 'You are the reason for all of this. Truly, thank you.'),
    l('Levem casaco, a noite promete frio!', 'Bring a coat, the night will be cold!'),
    l('Quem acampou ontem chegou atrasado. Os verdadeiros estão aqui desde o primeiro disco.', 'Whoever camped yesterday is late. The real ones have been here since the first record.'),
    l('Guardem um lugar na barraca para mim depois do show!', 'Save me a spot in the tent after the show!')) },
  { topic: 'fans', q: l('Os fãs se chamam de "{fandom}". Gosta do apelido?', 'Fans call themselves "{fandom}". Like the nickname?'), ideal: 'funny', risky: 'provoke', a: A(
    l('Adoro. É bonito ver uma família se formar em volta da música.', 'I love it. It is beautiful to see a family form around the music.'),
    l('O nome é deles, eles escolhem.', 'The name is theirs, they choose.'),
    l('Prefiro fã que compra disco a fã com apelido.', 'I prefer fans who buy records to fans with nicknames.'),
    l('Já mandei fazer a camiseta. Dez por cento é meu!', 'I already ordered the T-shirts. Ten percent is mine!')) },
  // dinheiro
  { topic: 'money', q: l('Quanto você ganhou com esse sucesso?', 'How much did you make from this hit?'), ideal: 'evasive', risky: 'sincere', a: A(
    l('Bem menos do que as pessoas pensam. Depois do selo, dos impostos e da turnê, sobra pouco.', 'Much less than people think. After the label, taxes and touring, little is left.'),
    l('O suficiente para continuar fazendo música.', 'Enough to keep making music.'),
    l('Mais do que você vai ganhar a vida inteira.', 'More than you will make in your whole life.'),
    l('Deu para trocar as cordas da guitarra. As duas!', 'Enough to change the guitar strings. Both of them!')) },
  { topic: 'money', q: l('A gravadora fica com a maior parte, não é?', 'The label keeps most of it, right?'), ideal: 'evasive', risky: 'provoke', a: A(
    l('O contrato é o contrato. Estamos conversando para melhorar.', 'A contract is a contract. We are talking about improving it.'),
    l('Eu cuido da música; quem cuida da conta é o empresário.', 'I handle the music; the manager handles the bills.'),
    l('Fica. E um dia todo artista vai acordar para isso.', 'It does. And one day every artist will wake up to it.'),
    l('Fica com a maior parte do bolo; eu fico com a cereja.', 'They keep most of the cake; I get the cherry.')) },
  // futuro
  { topic: 'future', q: l('Qual o próximo passo de {act}?', 'What is next for {act}?'), ideal: 'sincere', risky: 'evasive', a: A(
    l('Estrada. Quero levar esse disco a cidades que nunca nos ouviram.', 'The road. I want to take this record to cities that never heard us.'),
    l('Surpresa. Fiquem de olho.', 'A surprise. Stay tuned.'),
    l('O próximo passo é o topo. O resto é detalhe.', 'The next step is the top. The rest is detail.'),
    l('Dormir uma semana inteira. Depois a gente vê.', 'Sleep for a whole week. Then we will see.')) },
  { topic: 'future', q: l('Onde você se vê daqui a dez anos?', 'Where do you see yourself in ten years?'), ideal: 'sincere', risky: 'provoke', a: A(
    l('Fazendo música, de preferência com as mesmas pessoas de hoje.', 'Making music, hopefully with the same people as today.'),
    l('Dez anos é muito tempo no nosso meio...', 'Ten years is a long time in our business...'),
    l('No lugar que hoje é de {rival}.', 'In the spot {rival} holds today.'),
    l('No mesmo sofá deste programa, contando as mesmas piadas.', 'On this same couch, telling the same jokes.')) },
  // raízes e ofício
  { topic: 'roots', q: l('Quem te fez querer fazer {genre}?', 'Who made you want to play {genre}?'), ideal: 'sincere', risky: 'provoke', a: A(
    l('Os discos que tocavam em casa. Eu decorava cada solo, cada respiração.', 'The records that played at home. I memorised every solo, every breath.'),
    l('Muita gente, seria injusto citar só um nome.', 'Many people, it would be unfair to name just one.'),
    l('Ninguém. Eu vi o que estavam fazendo e achei que dava para fazer melhor.', 'Nobody. I saw what they were doing and thought I could do better.'),
    l('Minha mãe, que mandou eu largar o violão. Desobedeci.', 'My mother, who told me to drop the guitar. I disobeyed.')) },
  { topic: 'craft', q: l('Como nasce uma música de {act}?', 'How is an {act} song born?'), ideal: 'sincere', risky: 'evasive', a: A(
    l('Quase sempre de uma frase de letra; a melodia vem depois, no ensaio.', 'Almost always from a lyric line; the melody comes later, in rehearsal.'),
    l('Cada uma nasce de um jeito, não tem fórmula.', 'Each one is born differently, there is no formula.'),
    l('Nasce de mim. A banda só atrapalha um pouco.', 'From me. The band just gets in the way a little.'),
    l('Geralmente às quatro da manhã, quando todo mundo quer dormir.', 'Usually at four in the morning, when everyone wants to sleep.')) },
];

export interface Venue {
  id: string;
  place: PlaceKind;
  show: L;
  host: string;
}

export type InterviewCtx = 'action' | 'number1' | 'crisis';

const HOSTS = ['Alda Vieira', 'Bob Castelo', 'Celina Reis', 'Duda Monteiro', 'Edu Faria', 'Flora Nunes', 'Gil Prado', 'Hebe Arantes', 'Ivo Lacerda', 'Jô Martins'];

/** Formato da entrevista conforme a era (e o contexto). */
export function interviewVenue(s: GameState, ctx: InterviewCtx = 'action'): Venue {
  const y = s.year;
  const host = HOSTS[(y + s.month) % HOSTS.length];
  if (ctx === 'crisis') {
    if (hasTech(s, 'streaming')) return { id: 'live', place: 'livestream', show: l('Coletiva transmitida ao vivo', 'Live-streamed press conference'), host };
    if (hasTech(s, 'tv_music')) return { id: 'press_tv', place: 'tv_talk', show: l('Coletiva de imprensa', 'Press conference'), host };
    return { id: 'press_radio', place: 'radio_am', show: l('Coletiva para jornais e rádio', 'Press conference for papers and radio'), host };
  }
  if (!hasTech(s, 'tv_music')) return { id: 'radio', place: 'radio_am', show: l('Entrevista no rádio — Hora do Artista', 'Radio interview — The Artist Hour'), host };
  if (ctx === 'number1' && y >= 1958 && y < 2005) return { id: 'chart_tv', place: 'tv_chart', show: l('Parada Musical da Semana (TV)', 'Weekly TV Chart Show'), host };
  if (y < 1962) return { id: 'variety', place: 'tv_variety', show: l('Show de Variedades (ao vivo, P&B)', 'Variety Hour (live, B&W)'), host };
  if (y < 1982) return { id: 'auditorium', place: 'tv_auditorium', show: l('Programa de Auditório — com calouros e buzina', 'Studio-audience show — talent spot and horn'), host };
  if (y < 1996 && hasTech(s, 'clipnet')) return { id: 'clips', place: 'tv_clips', show: l('Canal de Clipes — entrevista do VJ', 'Music Video Channel — VJ interview'), host };
  if (y < 2010) return { id: 'talk', place: 'tv_talk', show: l('Talk show do fim da noite', 'Late-night talk show'), host };
  if (y < 2022) return { id: 'podcast', place: 'podcast', show: l('Podcast em vídeo', 'Video podcast'), host };
  return { id: 'live', place: 'livestream', show: l('Live com chat aberto', 'Livestream with open chat'), host };
}

function buildQuestions(s: GameState, r: Rng, act: Act, ctx: InterviewCtx, crisisText?: L): Question[] {
  const rival = Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status !== 'retired' && a.genre === act.genre).sort((a, b) => b.fame - a.fame)[0]
    ?? Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status === 'active').sort((a, b) => b.fame - a.fame)[0];
  const fandom = s.fandoms[act.id]?.name ?? `${act.name.split(' ')[0]}${['ers', 'ianos', 'nation'][act.name.length % 3]}`;
  const lastRel = act.releases.length ? s.releases[act.releases[act.releases.length - 1]] : undefined;
  const params: Record<string, string | L> = {
    rival: rival?.name ?? 'a concorrência', crisis: crisisText ?? l('a polêmica', 'the controversy'), fandom, act: act.name,
    release: lastRel?.title ?? act.name, city: cityById[act.city]?.name ?? act.city, genre: genreById[act.genre]?.name ?? act.genre,
  };
  const pool: Topic[] = ctx === 'crisis' ? ['scandal', 'scandal', 'private', 'fans', 'future'] : ['release', 'rival', 'private', 'politics', 'fans', 'money', 'future', 'roots', 'craft'];
  if (!lastRel) pool.splice(pool.indexOf('release'), 1);
  const topics: Topic[] = [];
  if (ctx === 'crisis') topics.push('scandal');
  if (ctx === 'number1' && lastRel) topics.push('release');
  const rest = pool.filter((t) => !topics.includes(t) || t === 'scandal');
  r.shuffle(rest);
  for (const t of rest) {
    if (topics.length >= 4) break;
    if (topics.filter((x) => x === t).length >= (t === 'scandal' ? 2 : 1)) continue;
    topics.push(t);
  }
  const censors = activeCensorship(s).some((c) => c.markets.includes(s.player.territories[0] ?? 'na'));
  const used = new Set<QDef>();
  return topics.map((topic) => {
    const opts = BANK.filter((x) => x.topic === topic && !used.has(x));
    const d = opts.length ? opts[r.int(0, opts.length - 1)] : BANK.find((x) => x.topic === topic)!;
    used.add(d);
    let { ideal, risky } = d;
    if (topic === 'politics' && censors) [ideal, risky] = ['evasive', 'provoke'];
    const answers = {} as Record<Tone, L>;
    for (const tn of TONES) answers[tn] = fmtL(d.a[tn], params);
    return { topic, text: fmtL(d.q, params), ideal, risky, answers };
  });
}

/** Reação do apresentador/plateia à resposta. */
export function reaction(q: Question, tone: Tone | null): { text: L; mood: 'good' | 'bad' | 'mid' } {
  if (!tone) return { text: l('Silêncio no ar. O apresentador muda de assunto.', 'Dead air. The host changes the subject.'), mood: 'bad' };
  if (tone === q.ideal) return { text: [l('A plateia aplaude.', 'The audience applauds.'), l('O apresentador ri e concorda.', 'The host laughs and agrees.'), l('Essa frase vai virar manchete — das boas.', 'That line will make headlines — the good kind.')][(q.text.pt.length + tone.length) % 3], mood: 'good' };
  if (tone === q.risky) return { text: [l('Um silêncio constrangedor toma o estúdio.', 'An awkward silence fills the studio.'), l('O apresentador ergue a sobrancelha.', 'The host raises an eyebrow.'), l('Os telefones da emissora não param de tocar.', 'The station\'s phones will not stop ringing.')][(q.text.pt.length + tone.length) % 3], mood: 'bad' };
  return { text: l('Resposta aceita; a conversa segue.', 'Answer accepted; the chat moves on.'), mood: 'mid' };
}

export interface InterviewEffect {
  img: number;
  pop: number;
  core: number;
  haters: number;
  outlet: number;
}

/** Efeito de um tom para uma pergunta (o tom ideal rende mais; o arriscado custa caro). */
export function toneEffect(q: Question, tone: Tone | null): InterviewEffect {
  if (!tone) return { img: -1, pop: -2, core: 0, haters: 0, outlet: -4 }; // ficou mudo: tempo esgotado
  const base: Record<Tone, InterviewEffect> = {
    sincere: { img: 2, pop: 1, core: 1, haters: 0, outlet: 3 },
    evasive: { img: 0, pop: -1, core: 0, haters: 0, outlet: -2 },
    provoke: { img: -2, pop: 3, core: 2, haters: 3, outlet: 2 },
    funny: { img: 1, pop: 2, core: 1, haters: 0, outlet: 1 },
  };
  const e = { ...base[tone] };
  if (tone === q.ideal) { e.img += 3; e.pop += 2; e.outlet += 2; }
  if (tone === q.risky) { e.img -= 4; e.haters += 3; e.outlet -= 1; }
  return e;
}

export function canInterview(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  if (act.status === 'retired' || act.status === 'split') return l('Ato inativo.', 'Inactive act.');
  if (act.fame < 5) return l('Ninguém chama um ato desconhecido (fama 5+).', 'Nobody books an unknown act (fame 5+).');
  if (!cooled(s, `iv:${actId}`, 6)) return l('Uma entrevista a cada 6 semanas por ato.', 'One interview every 6 weeks per act.');
  const conflict = checkCapacity(s, activeMembers(s, act), monthIndex(s), 1, 10);
  if (conflict) return conflict.text;
  return null;
}

/** Monta a cena da entrevista. `queue` = enfileira para abrir depois (cena de evento). */
export function startInterview(s: GameState, r: Rng, actId: string, ctx: InterviewCtx = 'action', crisisId?: string): Cutscene | L {
  const act = s.acts[actId];
  if (ctx === 'action') {
    const why = canInterview(s, actId);
    if (why) return why;
  }
  if (!act) return l('Ato não encontrado.', 'Act not found.');
  act.image ??= { artistic: 40, popularity: Math.round(act.fame), professionalism: 50, publicImage: 50 };
  const crisis = crisisId ? s.crises.find((c) => c.id === crisisId) : undefined;
  const venue = interviewVenue(s, ctx);
  const questions = buildQuestions(s, r, act, ctx, crisis?.text);
  setCool(s, `iv:${actId}`);
  // tempo: a agenda de mídia cansa os músicos
  for (const id of activeMembers(s, act)) {
    const p = s.persons[id];
    if (p) p.fatigue = clampN(p.fatigue + 5, 0, 100);
  }
  const title = ctx === 'crisis'
    ? fmtL(l('Coletiva: {a}', 'Press conference: {a}'), { a: act.name })
    : fmtL(l('{s}: {a}', '{s}: {a}'), { s: venue.show, a: act.name });
  const cs = queueScene(s, 'interview', venue.place, { title, actId, ctx, crisisId: crisisId ?? null, venue, questions });
  if (!cs) return l('Agenda cheia.', 'Schedule full.');
  if (ctx === 'action') cs.seen = true; // a interface abre na hora
  return cs;
}

/** Respostas automáticas pelos atributos (sociabilidade do líder, assessoria). */
export function autoAnswers(s: GameState, r: Rng, csId: string): Tone[] {
  const cs = findScene(s, csId);
  if (!cs) return [];
  const act = s.acts[String(cs.data.actId)];
  const leader = act ? s.persons[act.leaderId ?? act.members[0]] : undefined;
  const social = leader ? (attrById(s, leader, 'media') ?? leader.persona?.sociability ?? 50) : 50;
  const pr = (s.prAgency?.tier ?? 0) * 10 + (s.player.staff.some((x) => x.role === 'publicist') ? 12 : 0);
  const p = clampN(0.35 + social / 250 + pr / 200, 0.3, 0.85);
  return (cs.data.questions as Question[]).map((q) => (r.chance(p) ? q.ideal : r.chance(0.5) ? 'sincere' : 'evasive'));
}

export interface InterviewResult {
  total: InterviewEffect;
  lines: L[];
  grade: number; // 0..100
  /** perguntas, respostas e reações (rodada 5) */
  transcript?: { q: L; a: L | null; r: L; mood: 'good' | 'bad' | 'mid' }[];
}

/** Aplica as respostas (uma única vez). `null` = tempo esgotado. */
export function resolveInterview(s: GameState, r: Rng, csId: string, answers: (Tone | null)[]): InterviewResult | L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'interview') return l('Entrevista não encontrada.', 'Interview not found.');
  if (cs.data.done) return cs.data.outcome as InterviewResult;
  const act = s.acts[String(cs.data.actId)];
  if (!act) return l('Ato não encontrado.', 'Act not found.');
  const qs = cs.data.questions as Question[];
  const total: InterviewEffect = { img: 0, pop: 0, core: 0, haters: 0, outlet: 0 };
  let good = 0;
  qs.forEach((q, i) => {
    const e = toneEffect(q, answers[i] ?? null);
    if (answers[i] === q.ideal) good += 1;
    total.img += e.img; total.pop += e.pop; total.core += e.core; total.haters += e.haters; total.outlet += e.outlet;
  });
  // desenvoltura na mídia de quem fala (atributo do líder) dá um empurrão pequeno
  const spk = act.leaderId ? s.persons[act.leaderId] : s.persons[act.members[0]];
  const media = spk ? attrById(s, spk, 'media') ?? 50 : 50;
  total.img += Math.round((media - 50) / 25);
  // bônus limitado: jogar bem nunca vale mais que ~10 pontos de imagem/popularidade
  total.img = clampN(total.img, -12, 10);
  total.pop = clampN(total.pop, -8, 10);
  const lines: L[] = [];
  act.image ??= { artistic: 40, popularity: Math.round(act.fame), professionalism: 50, publicImage: 50 };
  const img = act.image;
  if (img) {
    img.publicImage = clampN(img.publicImage + total.img, 0, 100);
    img.popularity = clampN(img.popularity + total.pop, 0, 100);
  }
  act.momentum = clampN(act.momentum + clampN((total.img + total.pop) / 2, -8, 8), 0, 100);
  if (total.pop > 0) act.fans.casual += Math.round(total.pop * (300 + act.fame * 60));
  const fd = fandomOf(s, act.id);
  if (total.core > 0) fd.superfans += Math.round(total.core * (20 + act.fame * 2));
  if (total.haters > 0) fd.haters += Math.round(total.haters * (40 + act.fame * 8));
  const venue = cs.data.venue as Venue;
  const st = sc(s);
  st.outlets[venue.id] = clampN((st.outlets[venue.id] ?? 0) + total.outlet, -100, 100);
  st.stats.interviews += 1;
  lines.push(fmtL(l('Imagem pública {a}, popularidade {b}.', 'Public image {a}, popularity {b}.'), { a: signed(total.img), b: signed(total.pop) }));
  if (total.haters > 0) lines.push(l('Os haters encontraram munição.', 'The haters found ammunition.'));
  if (total.core > 0) lines.push(l('Os fãs mais fiéis compartilharam os melhores momentos.', 'Core fans shared the best moments.'));
  lines.push(fmtL(l('Relação com {v}: {o}.', 'Relationship with {v}: {o}.'), { v: venue.show, o: signed(st.outlets[venue.id]) }));
  // coletiva de crise: o tom dominante vira a resposta oficial
  if (cs.data.ctx === 'crisis' && cs.data.crisisId) {
    const c = s.crises.find((x) => x.id === cs.data.crisisId);
    if (c && !c.resolved) {
      const count: Record<Tone, number> = { sincere: 0, evasive: 0, provoke: 0, funny: 0 };
      for (const a of answers) if (a) count[a] += 1;
      const dom = (Object.entries(count) as [Tone, number][]).sort((a, b) => b[1] - a[1])[0][0];
      const resp = ({ sincere: 'apologize', evasive: 'silence', provoke: 'counter', funny: 'deny' } as const)[dom];
      lines.push(respondCrisis(s, r, c.id, resp));
    }
  }
  const grade = Math.round((good / Math.max(1, qs.length)) * 70 + clampN(total.img + total.pop, -10, 20) * 1.5);
  const transcript = qs.map((q, i) => { const tn = answers[i] ?? null; const re = reaction(q, tn); return { q: q.text, a: tn ? q.answers?.[tn] ?? TONE_NAMES[tn] : null, r: re.text, mood: re.mood }; });
  const outcome: InterviewResult = { total, lines, grade: clampN(grade, 0, 100), transcript };
  patchScene(s, csId, { done: true, outcome, answers });
  remember(s, 'interview', fmtL(l('{a} em "{v}": imagem {i}, popularidade {p}.', '{a} on "{v}": image {i}, popularity {p}.'), { a: act.name, v: venue.show, i: signed(total.img), p: signed(total.pop) }), { actId: act.id });
  return outcome;
}

function signed(n: number): string {
  return n > 0 ? `+${Math.round(n)}` : String(Math.round(n));
}

/** Detecção de crises novas dos seus atos → coletiva enfileirada. */
export function crisisPressers(s: GameState, r: Rng): void {
  for (const c of s.crises) {
    if (c.resolved) continue;
    const key = `crisis:${c.id}`;
    const st = sc(s);
    if (st.seen.includes(key)) continue;
    const act = s.acts[c.actId];
    if (!act || (act.owner !== 'player' && !act.playerBand)) continue;
    st.seen.push(key);
    if (st.seen.length > 160) st.seen.splice(0, st.seen.length - 160);
    if (c.severity < 25) continue;
    startInterview(s, r, act.id, 'crisis', c.id);
  }
}
