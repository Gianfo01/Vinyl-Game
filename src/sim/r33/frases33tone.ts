// R33 · REDES — tons, aberturas, fechos e gíria da época ('pt|en'). 6 tons × 14 aberturas e 14 fechos (84 de cada),
// mais 8 interjeições por faixa de época (as 6 faixas de ep5Of). Sem emoji.

export type Tone33 = 'humilde' | 'arrogante' | 'engracado' | 'misterioso' | 'politico' | 'romantico';
export const TONES33: Tone33[] = ['humilde', 'arrogante', 'engracado', 'misterioso', 'politico', 'romantico'];

export const OPEN33: Record<Tone33, string[]> = {
  humilde: [
    'Sem pretensão nenhuma.|No pretension at all.', 'Com o coração na mão.|Heart in hand.', 'Ainda aprendendo.|Still learning.', 'Falo baixinho, mas falo.|I speak softly, but I speak.',
    'Fico sem jeito de dizer isso.|I feel awkward saying this.', 'Só uma palavrinha.|Just a quick word.', 'Antes de tudo, obrigado.|First of all, thank you.', 'Sei que sou um entre muitos.|I know I am one among many.',
    'Com todo o respeito.|With all due respect.', 'Sem alarde.|Without a fuss.', 'Se me permitem.|If you will allow me.', 'Aprendi na marra.|I learned the hard way.',
    'Acho que mereço pouco, e ganho muito.|I think I deserve little, and I get a lot.', 'Pé no chão.|Feet on the ground.',
  ],
  arrogante: [
    'Para quem duvidava.|For the doubters.', 'Eu avisei.|I told you so.', 'Nada de novo para quem é o melhor.|Nothing new for the best.', 'Anotem esta data.|Mark this date.',
    'Modéstia à parte.|Modesty aside.', 'Quem manda aqui sou eu.|I run this place.', 'Era óbvio, mas tudo bem.|It was obvious, but fine.', 'Enquanto vocês dormiam.|While you were asleep.',
    'Para quem ainda não entendeu.|For those who have not understood yet.', 'Sem concorrência.|No competition.', 'Aplausos de pé, por favor.|Standing ovation, please.', 'Eu sou assim, não me peçam desculpas por mim.|This is who I am, do not apologise for me.',
    'Fui eu, claro.|It was me, of course.', 'A elite é pequena e eu estou nela.|The elite is small and I am in it.',
  ],
  engracado: [
    'Vocês não vão acreditar.|You will not believe this.', 'Fato aleatório do dia.|Random fact of the day.', 'Minha mãe pediu para eu avisar.|My mum asked me to let you know.', 'Alerta de notícia:|News alert:',
    'Quem diria, hein.|Who would have thought.', 'Spoiler.|Spoiler.', 'Se eu chorar, é cebola.|If I cry, it is onions.', 'Pausa para o óbvio.|A pause for the obvious.',
    'Última hora, sem fonte confiável.|Breaking news, no reliable source.', 'Registrem: eu fiquei sério por cinco segundos.|Record this: I stayed serious for five seconds.', 'Boletim do cantor:|Singer\'s bulletin:', 'Pergunta honesta:|Honest question:',
    'Meu cachorro aprovou.|My dog approved.', 'Tudo bem se eu rir?|Is it okay if I laugh?',
  ],
  misterioso: [
    'Há coisas que só se ouvem à noite.|Some things are only heard at night.', 'Não conto tudo.|I do not tell it all.', 'Quem souber, saberá.|Whoever knows, will know.', 'Entre uma sombra e outra.|Between one shadow and the next.',
    'Ouçam nas entrelinhas.|Listen between the lines.', 'Nada é por acaso.|Nothing is by accident.', 'O silêncio também diz.|Silence says things too.', 'Uma pista:|A clue:',
    'Algo está mudando.|Something is changing.', 'Ainda não é hora.|It is not time yet.', 'Escrevo isto de madrugada.|I write this in the early hours.', 'Acendi uma vela e pensei.|I lit a candle and thought.',
    'Vocês verão.|You will see.', 'Espere.|Wait.',
  ],
  politico: [
    'Em tempos como estes, calar é escolher.|In times like these, silence is a choice.', 'A música é de todos.|Music belongs to everyone.', 'Isto é maior do que eu.|This is bigger than me.', 'Não separo arte de realidade.|I do not separate art from reality.',
    'Falo pelos que não têm microfone.|I speak for those without a microphone.', 'O povo merece ser ouvido.|The people deserve to be heard.', 'Recado ao poder:|A message to power:', 'Como trabalhador da cultura,|As a culture worker,',
    'Pelo direito de cantar:|For the right to sing:', 'Dignidade primeiro.|Dignity first.', 'Atenção, coletivo:|Attention, community:', 'Não é só música.|It is not just music.',
    'Cultura é resistência.|Culture is resistance.', 'Cada voz conta.|Every voice counts.',
  ],
  romantico: [
    'Com o coração aberto.|With an open heart.', 'Escrevo isto olhando a lua.|I write this looking at the moon.', 'Amor, se você ler:|Love, if you read this:', 'Hoje o dia tem gosto de saudade.|Today tastes like longing.',
    'Cada acorde lembra alguém.|Every chord reminds me of someone.', 'Entre uma estrofe e um suspiro.|Between a verse and a sigh.', 'Meu coração anda cantando.|My heart has been singing.', 'Que bonito é sentir.|How beautiful it is to feel.',
    'Se o amor é uma canção,|If love is a song,', 'Pensando em você, em {c}.|Thinking of you, in {c}.', 'O mundo fica doce quando se ama.|The world turns sweet when you love.', 'Uma cena de filme, só que real.|A movie scene, only real.',
    'Dedicado a quem sabe.|Dedicated to whoever knows.', 'Ternura é coragem.|Tenderness is courage.',
  ],
};

export const CLOSE33: Record<Tone33, string[]> = {
  humilde: [
    'Obrigado por tudo.|Thank you for everything.', 'Continuo aprendendo.|I keep learning.', 'Vocês são demais.|You are too much.', 'Sigo de cabeça baixa e coração cheio.|I keep my head down and my heart full.',
    'Até a próxima, com carinho.|Until next time, with love.', 'Qualquer erro é meu.|Any mistake is mine.', 'Agradeço a quem me ajudou.|Thanks to everyone who helped me.', 'É só isso, de verdade.|That is all, really.',
    'Dá trabalho, mas dá gosto.|It is work, but it is a pleasure.', 'Fico por aqui.|I will stay here.', 'Vou ouvir o que vocês disserem.|I will listen to whatever you say.', 'Com respeito.|With respect.',
    'Um abraço apertado.|A tight hug.', 'Sou muito grato.|I am very grateful.',
  ],
  arrogante: [
    'Podem aplaudir.|You may applaud.', 'Próximo.|Next.', 'Nada mal para um dia de trabalho.|Not bad for a day at work.', 'Quem for melhor, que apareça.|Whoever is better, step up.',
    'É isso.|That is it.', 'Aprendam.|Learn.', 'Sem comentários.|No comments.', 'Eu não repito, eu supero.|I do not repeat, I surpass.',
    'Fim de papo.|End of discussion.', 'O recado está dado.|The message is delivered.', 'Anotado?|Noted?', 'Quem entendeu, entendeu.|Whoever got it, got it.',
    'Sou o padrão.|I am the standard.', 'Tchau, concorrência.|Goodbye, competition.',
  ],
  engracado: [
    'Foi mal pelo textão.|Sorry for the long post.', 'Podem rir, eu deixo.|Go ahead and laugh, I allow it.', 'Mamãe, estou na internet.|Mum, I am on the internet.', 'Fim do comunicado, tchau.|End of announcement, bye.',
    'Se achar graça, curte. Se não, finge.|If you find it funny, like it. If not, pretend.', 'Rindo por não chorar.|Laughing so I do not cry.', 'Prometo não fazer de novo. Mentira.|I promise not to do it again. Lie.', 'Aceito sugestões de piada melhor.|Open to better joke suggestions.',
    'Seguimos sem noção.|Carrying on clueless.', 'Pra quem gosta, é só aplaudir.|If you like it, just applaud.', 'Isso foi sério, juro.|That was serious, I swear.', 'Peguem a pipoca.|Grab the popcorn.',
    'Ninguém me para, só o sono.|Nobody stops me but sleep.', 'Ah, e bom dia.|Oh, and good morning.',
  ],
  misterioso: [
    '...|...', 'Ouçam bem.|Listen well.', 'Até a próxima sombra.|Until the next shadow.', 'Nem tudo precisa ser dito.|Not everything needs to be said.',
    'O resto, vocês imaginam.|The rest, you imagine.', 'Volto quando for a hora.|I return when it is time.', 'Quem viu, viu.|Whoever saw, saw.', 'Guardo o restante.|I keep the rest.',
    'A noite explica.|The night explains.', 'Há mais.|There is more.', 'Fim, por enquanto.|End, for now.', 'Quem ouvir, entenderá.|Whoever hears will understand.',
    'Silêncio.|Silence.', 'Vejo vocês no escuro.|See you in the dark.',
  ],
  politico: [
    'Cultura é direito.|Culture is a right.', 'Juntos somos mais.|Together we are more.', 'Não vão nos calar.|They will not silence us.', 'Música é para todos.|Music is for everyone.',
    'Quem vive de arte merece respeito.|Those who live from art deserve respect.', 'A luta continua.|The struggle continues.', 'Compartilhem, é importante.|Share it, it matters.', 'O povo não esquece.|The people do not forget.',
    'Votem com consciência.|Vote with conscience.', 'Calar nunca foi opção.|Silence was never an option.', 'Pela liberdade de criar.|For the freedom to create.', 'Que a voz se ouça.|May the voice be heard.',
    'A arte é de quem faz e de quem ouve.|Art belongs to those who make it and those who listen.', 'Seguimos.|We go on.',
  ],
  romantico: [
    'Com amor.|With love.', 'Até o fim da canção.|Until the end of the song.', 'Fica comigo.|Stay with me.', 'Que todos amem assim.|May everyone love like this.',
    'Um beijo no coração.|A kiss on the heart.', 'O resto é saudade.|The rest is longing.', 'Boa noite, meus amores.|Good night, my loves.', 'Se tiver quem amar, ame hoje.|If you have someone to love, love today.',
    'Que o amor vença.|May love win.', 'Guardo um verso para você.|I keep a verse for you.', 'Sonhando acordado.|Daydreaming.', 'Suspiro e sigo.|I sigh and carry on.',
    'Nada é tão bonito quanto o que se sente.|Nothing is as beautiful as what is felt.', 'Até o próximo acorde.|Until the next chord.',
  ],
};

/** Gíria da época: 8 interjeições por faixa (0 = 1889–1919 … 5 = 2010–2040). */
export const SLANG33: string[][] = [
  ['Caros amigos.|Dear friends.', 'Por Deus.|By Jove.', 'Digníssimos senhores.|Esteemed sirs.', 'Que maravilha.|How marvellous.', 'Com licença.|If you please.', 'Ora, vejam só.|Well, I never.', 'Santo Deus.|Good heavens.', 'Boa tarde a todos.|Good afternoon to all.'],
  ['Puxa vida.|Gee whiz.', 'Que beleza.|Swell.', 'Formidável.|Splendid.', 'Meu Deus do céu.|Goodness me.', 'Ora bolas.|Well, bother.', 'Sensacional.|Sensational.', 'Quem diria.|Fancy that.', 'Alô, alô.|Hello, hello.'],
  ['Legal.|Cool.', 'Bacana.|Neat.', 'Que barato.|Far out.', 'Pra frente.|Right on.', 'É isso aí.|That is the stuff.', 'Brotou.|Dig it.', 'Maneiríssimo.|Real gone.', 'Show de bola.|Boss.'],
  ['Maneiro.|Groovy.', 'Beleza pura.|Right on.', 'Sinistro.|Radical.', 'É nóis.|Heavy.', 'Que loucura.|Far out.', 'Valeu, gente.|Thanks, people.', 'Tá ligado.|You know.', 'Demais.|Wicked.'],
  ['Fala aí.|Hey there.', 'Tipo assim.|Like, y\'know.', 'Irado.|Totally rad.', 'Na moral.|No joke.', 'Mandou bem.|Nailed it.', 'Valeu mesmo.|Props.', 'Pô.|Dude.', 'Tá ligado, né.|You feel me.'],
  ['Bora.|Let us go.', 'Mano.|Fam.', 'Sem crise.|No cap.', 'É nós.|Respect.', 'Brabo.|Lit.', 'Salve.|Yo.', 'Pesado.|Big mood.', 'Tamo junto.|We are one.'],
];
