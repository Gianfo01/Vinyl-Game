// Rodada 17 (J) — catálogo de cenas interativas. Cada opção mostra dica (e chance quando há sorte) e devolve o
// desfecho com o porquê; o motor (scene17.ts) aplica fama regional, fãs, estresse, boatos, obrigações e fotos.

import { clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { activeCensorship } from '../media';
import { piety } from '../scandal17';
import type { GameState } from '../types';
import { fmtL, money } from '../util';
import { life } from './life';
import { PARTNER_TRAITS } from './life/data';
import { love17 } from './love17';
import { ownerOf } from './people/owner';
import { acceptAtCity } from './sex17';
import { orgs17 } from './crime17';
import { usd17, amp17, actOf17, cityN, ctx17, def17, open17, result17, type Ctx17, type Odds17, type Opt17 } from './scene17';
import { sc } from './scenes/state';
import type { MomentRec16 } from './moments16';
import { fameTier } from './fame15';

const F = fmtL;
const od = (p: number, ...why: L[]): Odds17 => ({ p: clamp(p, 0.05, 0.95), why });
const actN = (s: GameState, c: Ctx17) => actOf17(s, c)?.name ?? l('você', 'you').pt;
const rivalN = (s: GameState, c: Ctx17) => (c.rival && s.labels[c.rival] ? s.labels[c.rival].name : '—');
const cha = (s: GameState) => ownerOf(s).attrs.charisma;
const censored = (s: GameState, c: Ctx17): boolean => { const m = cityById[c.city ?? '']?.market; return !!m && activeCensorship(s).some((x) => x.markets.includes(m)); };
const pietyAt = (s: GameState, c: Ctx17): number => piety(cityById[c.city ?? s.config.homeCity]?.market ?? 'us', s.year);
const rebel = (s: GameState, c: Ctx17): boolean => ['rock', 'hiphop', 'punk', 'metal', 'electronic'].some((g) => (actOf17(s, c)?.genre ?? '').includes(g));
/** Quem faz o favor: organização local (crime17) ou o selo mais poderoso. */
const fixer = (s: GameState, c: Ctx17): string | undefined => {
  const a3 = countryOfCity(c.city ?? s.config.homeCity);
  const o = orgs17(s).filter((x) => x.a3 === a3).sort((x, y) => y.power - x.power)[0];
  return o?.key ?? Object.values(s.labels).filter((lb) => lb.active).sort((x, y) => y.reputation - x.reputation)[0]?.id;
};
const era = (y: number) => (y < 1950 ? 0 : y < 1964 ? 1 : y < 1981 ? 2 : y < 2000 ? 3 : y < 2015 ? 4 : 5);

/** Programa de TV da época (Ed Sullivan-like → auditório → canal de clipes → talk show → live viral). */
export function tvOf17(y: number): { place: string; name: L } {
  return [
    { place: 'radio_am', name: l('programa de rádio ao vivo', 'live radio show') },
    { place: 'tv_variety', name: l('show de variedades de domingo (tipo Ed Sullivan)', 'Sunday variety show (Ed Sullivan-style)') },
    { place: 'tv_auditorium', name: l('programa de auditório com plateia', 'studio-audience TV show') },
    { place: 'tv_clips', name: l('canal de clipes (tipo MTV)', 'music video channel (MTV-style)') },
    { place: 'tv_talk', name: l('talk show de fim de noite', 'late-night talk show') },
    { place: 'livestream', name: l('live viral com milhões de pessoas', 'viral livestream with millions watching') },
  ][era(y)];
}

// ================================================================ prêmios

const SPEECH: Opt17[] = [
  { id: 'team', label: l('Agradecer a equipe e a banda', 'Thank the team and the band'), hint: l('Moral, confiança, menos estresse.', 'Morale, trust, less stress.'),
    fx: (s, c, _ok, e) => { e.morale(5).trust(4).stress(-6, l('reconhecimento no palco', 'recognition on stage')).rep('artists', 2); return l('Você agradece nome por nome. A banda sai da festa mais unida.', 'You thank everyone by name. The band leaves the party closer.'); } },
  { id: 'family', label: l('Agradecer à família', 'Thank your family'), hint: l('Público casual se identifica; seu par gosta.', 'Casual audience relates; your partner loves it.'),
    fx: (s, c, _ok, e) => { e.fans(40, 600).fame(1.5).partner(6); return l('A voz embarga ao falar da mãe. A cena vira a mais reprisada da noite.', 'Your voice cracks talking about your mother. It becomes the most replayed moment of the night.'); } },
  { id: 'god', label: l('Agradecer a Deus', 'Thank God'), hint: l('Rende muito onde o público é religioso; divide onde não é.', 'Pays off where audiences are religious; divides where not.'),
    odds: (s, c) => od(0.25 + pietyAt(s, c) * 0.7, F(l('Religiosidade do mercado agora: {p}%', 'Market religiosity now: {p}%'), { p: Math.round(pietyAt(s, c) * 100) })),
    fx: (s, c, ok, e) => { if (ok) { e.fame(2.5).fans(80, 300); return l('A plateia diz amém. Rádios religiosas tocam o ato a semana toda.', 'The audience says amen. Religious radio plays the act all week.'); } e.fame(0.5).haters(500).rep('artistic', -1); return l('Parte da plateia revira os olhos; a crítica chama de cafona.', 'Part of the audience rolls its eyes; critics call it corny.'); } },
  { id: 'political', label: l('Declaração política', 'Political statement'), hint: l('Prestígio e fãs fiéis; censores e conservadores anotam.', 'Prestige and core fans; censors and conservatives take notes.'),
    odds: (s, c) => od(censored(s, c) ? 0.3 : 0.65, censored(s, c) ? l('Há censura ativa neste mercado.', 'Active censorship in this market.') : l('Sem censura forte aqui.', 'No heavy censorship here.')),
    fx: (s, c, ok, e) => { e.rep('artistic', 4).fans(150, 0); if (c.act) sc(s).heat[c.act] = s.week + 52; e.news(F(l('{a} usa o prêmio para um discurso político.', '{a} uses the award for a political speech.'), { a: actN(s, c) }), 55, ['politics', 'statement'], 'public', 'statement'); if (!ok) { e.rep('institutional', -4).fame(-2).stress(6, l('ameaças após o discurso', 'threats after the speech')); return l('O discurso é cortado da transmissão e o governo reclama. Fãs fiéis aplaudem; patrocinadores somem.', 'The speech is cut from the broadcast and officials complain. Core fans cheer; sponsors vanish.'); } e.fame(1.5); return l('Aplausos de pé. O discurso vira referência de coragem.', 'A standing ovation. The speech becomes a reference for courage.'); } },
  { id: 'rival', label: (s, c) => F(l('Provocar {r}', 'Taunt {r}'), { r: rivalN(s, c) }), hint: l('Manchetes, embalo e rixa; o setor torce o nariz.', 'Headlines, momentum and a feud; the industry frowns.'),
    fx: (s, c, _ok, e) => { e.rival(15).mom(10).haters(600).rep('institutional', -3); e.news(F(l('{a} alfineta {r} no palco do prêmio.', '{a} jabs {r} on the awards stage.'), { a: actN(s, c), r: rivalN(s, c) }), 50, ['feud']); if (c.rival) e.hold(c.rival, 'player', 'grievance', 40, l('Provocação no prêmio', 'Award-show jab')); e.photo(l('O dedo apontado para a mesa do rival', 'The finger pointed at the rival\'s table')); return l('A alfinetada vira manchete. A rivalidade esquenta e a imprensa adora.', 'The jab makes headlines. The rivalry heats up and the press loves it.'); } },
  { id: 'humble', label: l('Curto e humilde', 'Short and humble'), hint: l('Seguro: imagem boa, sem risco.', 'Safe: good image, no risk.'),
    fx: (s, c, _ok, e) => { e.rep('institutional', 2).stress(-3, l('noite sem drama', 'a drama-free night')); return l('Um "obrigado" sincero e você volta à mesa. Elegante.', 'A sincere "thank you" and you are back at your table. Elegant.'); } },
];
def17({ id: 'award_win', name: l('Discurso de prêmio', 'Award speech'), icon: 'trophy', major: true, cool: 0, bold: ['rival', 'political'],
  place: (s, c) => (c.award === 'contest' ? 'venue_bar' : 'awards'),
  title: (s, c) => F(l('{a} sobe ao palco', '{a} takes the stage'), { a: actN(s, c) }),
  text: () => l('O envelope abre com o seu nome. Você tem 45 segundos antes da música subir. O que dizer?', 'The envelope opens with your name. You have 45 seconds before the music plays you off. What do you say?'),
  stages: [{ q: l('Tema do discurso', 'Speech topic'), opts: SPEECH }] });

def17({ id: 'award_lose', name: l('Perder o prêmio', 'Losing the award'), icon: 'trophy', major: true, cool: 0, bold: ['stage', 'walkout'],
  place: () => 'awards',
  title: (s, c) => F(l('{w} leva o troféu', '{w} takes the trophy'), { w: c.who ?? '—' }),
  text: () => l('As câmeras cortam para a sua mesa no instante em que o nome do outro é anunciado.', 'The cameras cut to your table the moment the other name is announced.'),
  stages: [{ q: l('Sua reação', 'Your reaction'), opts: [
    { id: 'applaud', label: l('Aplaudir de pé', 'Applaud standing'), hint: l('Elegância rende respeito no setor e nos jurados.', 'Grace earns respect from the industry and juries.'),
      fx: (s, c, _ok, e) => { e.rep('institutional', 4).fame(0.5).stress(3, l('a derrota dói', 'the loss hurts')); return l('O aplauso sincero é notado. No ano que vem, jurados lembram.', 'The sincere applause is noticed. Next year, juries remember.'); } },
    { id: 'stage', label: l('Invadir o palco', 'Crash the stage'), hint: l('Escândalo instantâneo: fãs fiéis vibram, setor fecha portas.', 'Instant scandal: core fans cheer, the industry closes doors.'),
      odds: (s, c) => od(rebel(s, c) ? 0.55 : 0.3, rebel(s, c) ? l('Gênero rebelde: o público perdoa mais.', 'Rebel genre: the public forgives more.') : l('Gênero comportado: a reação é dura.', 'Well-behaved genre: the backlash is harsh.')),
      fx: (s, c, ok, e) => { e.photo(l('O microfone tomado da mão do vencedor', 'The mic grabbed from the winner\'s hand')); e.scandal('conduct', 55, F(l('{a} invade o palco e toma o microfone do vencedor.', '{a} crashes the stage and grabs the winner\'s mic.'), { a: actN(s, c) })); e.rep('institutional', -8).mom(12); if (ok) { e.fans(250, 0); return l('Meio mundo vaia, meio mundo vira fã. Não se fala de outra coisa.', 'Half the world boos, half becomes a fan. Nobody talks about anything else.'); } e.haters(1500); return l('Vaias, segurança, manchete negativa no mundo todo.', 'Boos, security, negative headlines worldwide.'); } },
    { id: 'still', label: l('Ficar imóvel, sorriso congelado', 'Sit still, frozen smile'), hint: l('Nada muda — mas engolir em seco cansa.', 'Nothing changes — but swallowing it wears you down.'),
      fx: (s, c, _ok, e) => { e.stress(6, l('derrota engolida a seco', 'a swallowed defeat')); return l('O sorriso congelado vira meme por uma semana, e passa.', 'The frozen smile becomes a meme for a week, then fades.'); } },
    { id: 'walkout', label: l('Sair no meio da cerimônia', 'Walk out mid-ceremony'), hint: l('Protesto: fãs fiéis gostam, organizadores não.', 'Protest: core fans like it, organizers do not.'),
      fx: (s, c, _ok, e) => { e.fans(120, 0).rep('institutional', -5).fame(rebel(s, c) ? 1 : -1); e.news(F(l('{a} deixa a premiação antes do fim.', '{a} walks out of the awards before the end.'), { a: actN(s, c) }), 45, ['awards']); e.photo(l('As costas saindo pelo corredor', 'Backs walking out down the aisle')); return l('A cadeira vazia aparece na transmissão. Há quem chame de protesto, há quem chame de birra.', 'The empty seat shows up on the broadcast. Some call it protest, some call it a tantrum.'); } },
    { id: 'party', label: l('Afogar a mágoa na festa depois', 'Drown it at the afterparty'), hint: l('Alivia — e tabloides adoram ressaca de perdedor.', 'Relieves it — and tabloids love a loser\'s hangover.'),
      odds: (s, c) => od(0.75 - c.ft * 0.1, l('Quanto mais famoso, mais câmeras na festa.', 'The more famous, the more cameras at the party.')),
      fx: (s, c, ok, e) => { e.stress(-8, l('noite de esquecer', 'a night to forget')); if (!ok) { e.scandal('conduct', 35, F(l('{a} flagrado(a) em festa após perder o prêmio.', '{a} caught partying hard after losing the award.'), { a: actN(s, c) })); return l('Alguém fotografa a pior hora da noite. Vira capa.', 'Someone photographs the worst hour of the night. It becomes a cover.'); } return l('Ninguém viu nada. De manhã, só a ressaca.', 'Nobody saw a thing. In the morning, just the hangover.'); } },
  ] }] });

// ================================================================ shows e festivais

def17({ id: 'show_night', name: l('Noite de show', 'Show night'), icon: 'mic', cool: 0, bold: ['dive', 'smash'],
  place: (s, c) => (['venue_bar', 'venue_club', 'venue_theatre', 'venue_arena', 'venue_stadium'][clamp(c.tier ?? 1, 0, 4)]),
  title: (s, c) => F(l('{a} em {c}', '{a} in {c}'), { a: actN(s, c), c: cityN(c.city) }),
  text: (s, c) => (c.wx === 'storm' || c.wx === 'monsoon' ? l('Lá fora a tempestade ameaça a luz. Última música: como fechar a noite?', 'Outside, the storm threatens the power. Last song: how do you close the night?') : l('Última música. A plateia pede mais. Como fechar a noite?', 'Last song. The crowd wants more. How do you close the night?')),
  stages: [{ q: l('O fechamento', 'The closer'), opts: [
    { id: 'encore', label: l('Bis com uma música nova', 'Encore with a new song'), hint: l('Inspira a banda; risco de esfriar a plateia.', 'Inspires the band; may cool the crowd.'),
      odds: (s, c) => od(0.45 + (actOf17(s, c)?.momentum ?? 30) / 250, l('O embalo do ato ajuda a plateia a comprar o novo.', 'The act\'s momentum helps the crowd buy into new songs.')),
      fx: (s, c, ok, e) => { e.insp(ok ? 8 : 3); if (ok) { e.fans(60, 200).fame(0.8); return l('A música nova vira coro no segundo refrão.', 'The new song turns into a sing-along by the second chorus.'); } e.mom(-3); return l('Silêncio educado. A banda aprende o que ajustar.', 'Polite silence. The band learns what to fix.'); } },
    { id: 'singalong', label: l('Deixar a plateia cantar o hit', 'Let the crowd sing the hit'), hint: l('Seguro: os fãs saem felizes.', 'Safe: fans leave happy.'),
      fx: (s, c, _ok, e) => { e.fans(40, 120).morale(3); return l('Milhares de vozes no refrão. A banda fica arrepiada.', 'Thousands of voices on the chorus. The band gets goosebumps.'); } },
    { id: 'dive', label: l('Mergulho na plateia', 'Stage dive'), hint: l('Lenda ou lesão.', 'Legend or injury.'), when: (s, c) => (c.tier ?? 1) <= 3 && s.year >= 1965,
      odds: (s, c) => od(0.7 - (c.tier ?? 1) * 0.08, l('Quanto maior a casa, maior a queda.', 'The bigger the room, the bigger the fall.')),
      fx: (s, c, ok, e) => { e.photo(l('O corpo no ar sobre mil mãos', 'A body in the air over a thousand hands')); if (ok) { e.fans(120, 300).fame(1.2).mom(5); return l('A plateia carrega o vocalista até o fundo e de volta. Noite histórica.', 'The crowd carries the singer to the back and back again. A historic night.'); } e.stress(10, l('lesão no mergulho', 'stage-dive injury')).news(F(l('{a} se machuca ao pular na plateia em {c}.', '{a} gets hurt diving into the crowd in {c}.'), { a: actN(s, c), c: cityN(c.city) }), 45, ['health']); return l('A plateia abre. Tornozelo torcido e show encerrado às pressas.', 'The crowd parts. A twisted ankle and a hurried end to the show.'); } },
    { id: 'smash', label: l('Quebrar a guitarra', 'Smash the guitar'), hint: l('Imagem rebelde; custa o instrumento.', 'Rebel image; costs the instrument.'), when: (s) => s.year >= 1964,
      fx: (s, c, _ok, e) => { e.cash(-900, 'guitar'); e.photo(l('A guitarra em pedaços contra o amplificador', 'The guitar in pieces against the amp')); if (rebel(s, c)) e.fans(150, 100).fame(1); else e.haters(400); e.news(F(l('{a} quebra a guitarra no palco em {c}.', '{a} smashes a guitar on stage in {c}.'), { a: actN(s, c), c: cityN(c.city) }), 40, ['show']); return rebel(s, c) ? l('A plateia urra. Pedaços viram relíquia de fã.', 'The crowd roars. Pieces become fan relics.') : l('Para este público, foi agressivo demais.', 'For this crowd, it was too aggressive.'); } },
    { id: 'rain', label: l('Tocar acústico no escuro', 'Play acoustic in the dark'), hint: l('Só com tempestade: risco elétrico vira momento íntimo.', 'Storm only: electrical risk becomes an intimate moment.'), when: (s, c) => ['storm', 'monsoon', 'rain'].includes(c.wx ?? ''),
      fx: (s, c, _ok, e) => { e.fans(100, 50).insp(5); e.photo(l('Isqueiros acesos na chuva', 'Lighters raised in the rain')); return l('A luz cai, os isqueiros acendem e a banda toca desplugada. Ninguém esquece.', 'The power fails, lighters go up and the band plays unplugged. Nobody forgets.'); } },
    { id: 'short', label: l('Encerrar no horário', 'End on time'), hint: l('Sem risco; sem história.', 'No risk; no story.'),
      fx: (s, c, _ok, e) => { e.stress(-2, l('noite tranquila', 'a calm night')); return l('Boa noite, obrigado, até a próxima.', 'Good night, thank you, see you next time.'); } },
  ] }] });

def17({ id: 'fest_head', name: l('Atração principal do festival', 'Festival headline'), icon: 'star', major: true, cool: 0, bold: ['guest', 'curfew'],
  place: () => 'venue_festival',
  title: (s, c) => F(l('{a} fecha o festival', '{a} headlines the festival'), { a: actN(s, c) }),
  text: (s, c) => (['rain', 'storm', 'monsoon'].includes(c.wx ?? '') ? l('Lama até o tornozelo, cem mil capas de chuva. Seu set começa agora.', 'Mud to the ankles, a hundred thousand raincoats. Your set starts now.') : l('O sol se põe sobre cem mil pessoas. Seu set começa agora.', 'The sun sets over a hundred thousand people. Your set starts now.')),
  stages: [{ q: l('O set', 'The set'), opts: [
    { id: 'hits', label: l('Só sucessos', 'Hits only'), hint: l('Público casual em massa.', 'Mass casual audience.'),
      fx: (s, c, _ok, e) => { e.fans(80, 1500).fame(1.5); return l('Cem mil cantando. O festival vira vitrine do ato.', 'A hundred thousand singing. The festival becomes the act\'s showcase.'); } },
    { id: 'new', label: l('Estrear o disco novo', 'Debut the new record'), hint: l('Crítica e inspiração; plateia pode dispersar.', 'Critics and inspiration; the crowd may drift.'),
      odds: (s, c) => od(0.35 + c.ft * 0.08, l('Fama alta segura a plateia no material novo.', 'High fame holds the crowd through new material.')),
      fx: (s, c, ok, e) => { e.insp(6).rep('artistic', ok ? 3 : 1); if (ok) { e.fame(1.2).fans(200, 300); return l('A crítica fala em "show do ano".', 'Critics call it "show of the year".'); } e.mom(-4); return l('Metade da plateia vai para o outro palco.', 'Half the crowd heads to the other stage.'); } },
    { id: 'guest', label: l('Chamar um convidado surpresa', 'Bring a surprise guest'), hint: l('Momento viral; custa um favor.', 'Viral moment; costs a favor.'),
      fx: (s, c, _ok, e) => { e.fame(2).fans(150, 900).cash(-3000, 'guest'); e.photo(l('Dois ídolos dividindo o microfone', 'Two idols sharing a mic')); e.news(F(l('Convidado surpresa no show de {a} vira o assunto do festival.', 'A surprise guest at {a}\'s show becomes the talk of the festival.'), { a: actN(s, c) }), 45, ['good', 'show']); return l('O grito quando o convidado entra é ouvido no estacionamento.', 'The scream when the guest walks on is heard in the parking lot.'); } },
    { id: 'speech', label: l('Discurso entre as músicas', 'A speech between songs'), hint: l('Fãs fiéis e prestígio; censores atentos.', 'Core fans and prestige; censors watching.'),
      fx: (s, c, _ok, e) => { e.fans(180, 0).rep('artistic', 2); if (censored(s, c)) e.scandal('politics', 40, F(l('{a} faz discurso político no festival.', '{a} gives a political speech at the festival.'), { a: actN(s, c) })); return censored(s, c) ? l('O discurso ecoa — e os censores mandam recado.', 'The speech echoes — and the censors send word.') : l('A plateia ergue os punhos.', 'The crowd raises its fists.'); } },
    { id: 'curfew', label: l('Estourar o toque de recolher', 'Blow past the curfew'), hint: l('Lenda e multa da prefeitura.', 'Legend and a city fine.'),
      fx: (s, c, _ok, e) => { e.cash(-6000, 'curfew').fans(220, 400).mom(6); e.photo(l('A banda tocando com as luzes da prefeitura cortadas', 'The band playing as the city cuts the lights')); return l('Desligam o som às 23h; a banda segue com a plateia cantando.', 'They cut the sound at 11pm; the band carries on with the crowd singing.'); } },
  ] }] });

// ================================================================ mídia por época

def17({ id: 'tv_spot', name: l('Aparição na mídia', 'Media appearance'), icon: 'tv', cool: 0, bold: ['hips', 'trash', 'drama'],
  place: (s, c) => (c.medium === 'radio' ? (s.year < 1966 ? 'radio_am' : s.year < 2008 ? 'radio_fm' : 'podcast') : tvOf17(s.year).place),
  title: (s, c) => F(l('{a} no {t}', '{a} on the {t}'), { a: actN(s, c), t: c.medium === 'radio' ? l('rádio', 'radio') : tvOf17(s.year).name }),
  text: (s) => [
    l('O locutor avisa: tudo ao vivo, sem corte.', 'The announcer warns: everything is live, no cuts.'),
    l('O apresentador avisa nos bastidores: "só da cintura para cima, e nada de rebolado".', 'The host warns backstage: "waist up only, and no hip-shaking".'),
    l('Auditório lotado, playback pronto, o apresentador quer um número animado.', 'Packed studio, playback ready, the host wants a lively number.'),
    l('O VJ te recebe no estúdio colorido; o clipe estreia em seguida.', 'The VJ welcomes you in the colorful studio; the video premieres next.'),
    l('Sofá do talk show, plateia rindo, o apresentador quer uma história.', 'Talk-show couch, audience laughing, the host wants a story.'),
    l('Live aberta, o contador passa de um milhão; o chat corre rápido.', 'Live is on, the counter passes a million; the chat scrolls fast.'),
  ][era(s.year)],
  stages: [{ q: l('Como se portar', 'How to play it'), opts: [
    { id: 'obey', label: l('Seguir o roteiro', 'Stick to the script'), hint: l('Seguro: público casual e emissora contente.', 'Safe: casual audience and a happy network.'),
      fx: (s, c, _ok, e) => { e.fans(20, 500).rep('institutional', 2); return l('Tudo nos conformes. A emissora convida de novo.', 'All by the book. The network invites you back.'); } },
    { id: 'hips', label: l('Rebolar mesmo assim', 'Shake the hips anyway'), hint: l('Jovens enlouquecem; a emissora bane.', 'Teens go wild; the network bans you.'), when: (s) => era(s.year) === 1 || era(s.year) === 2,
      fx: (s, c, _ok, e) => { e.fans(300, 800).fame(2).rep('institutional', -5); e.scandal('conduct', 35, F(l('{a} desafia a censura do programa de TV.', '{a} defies the TV show\'s censors.'), { a: actN(s, c) })); e.photo(l('O quadril que a TV não queria mostrar', 'The hips TV did not want to show')); return l('Os pais ligam furiosos; os filhos compram o disco no dia seguinte.', 'Parents call in furious; their kids buy the record the next day.'); } },
    { id: 'live', label: l('Recusar o playback e tocar ao vivo', 'Refuse playback and play live'), hint: l('Credibilidade; risco de som ruim.', 'Credibility; risk of bad sound.'), when: (s) => era(s.year) === 2 || era(s.year) === 3,
      odds: () => od(0.55, l('Som de TV é traiçoeiro.', 'TV sound is treacherous.')),
      fx: (s, c, ok, e) => { e.rep('artistic', 3); if (ok) { e.fans(150, 300).fame(1); return l('A banda soa enorme e a crítica nota.', 'The band sounds huge and critics notice.'); } e.haters(300); return l('Microfonia ao vivo para o país inteiro.', 'Live feedback for the whole country.'); } },
    { id: 'trash', label: l('Destruir o cenário', 'Trash the set'), hint: l('Ícone rebelde; multa e banimento.', 'Rebel icon; fine and ban.'), when: (s) => era(s.year) >= 3,
      fx: (s, c, _ok, e) => { e.cash(-4000, 'set').fans(rebel(s, c) ? 300 : 50, 400).rep('institutional', -6); e.scandal('conduct', 40, F(l('{a} destrói o cenário ao vivo.', '{a} trashes the set live on air.'), { a: actN(s, c) })); e.photo(l('O VJ escondido atrás do sofá', 'The VJ hiding behind the couch')); return l('Cenas reprisadas por décadas.', 'Footage replayed for decades.'); } },
    { id: 'story', label: l('Contar uma história pessoal', 'Tell a personal story'), hint: l('Carisma decide; público casual se apega.', 'Charisma decides; casual audience gets attached.'), when: (s) => era(s.year) >= 4,
      odds: (s) => od(0.3 + cha(s) / 140, F(l('Seu carisma: {c}', 'Your charisma: {c}'), { c: cha(s) })),
      fx: (s, c, ok, e) => { if (ok) { e.fans(80, 900).fame(1.5); return l('A plateia ri e se emociona; o trecho viraliza.', 'The audience laughs and tears up; the clip goes viral.'); } e.stress(4, l('silêncio constrangedor', 'awkward silence', ), 'me'); return l('A piada morre no ar. O apresentador muda de assunto.', 'The joke dies on air. The host changes the subject.'); } },
    { id: 'drama', label: l('Provocar polêmica (bait)', 'Stir up drama (bait)'), hint: l('Milhões de views; detratores e boatos.', 'Millions of views; detractors and rumors.'), when: (s) => era(s.year) >= 4,
      fx: (s, c, _ok, e) => { e.fame(2).mom(8).haters(1200); e.news(F(l('Polêmica de {a} ao vivo domina as redes.', '{a}\'s live controversy dominates social media.'), { a: actN(s, c) }), 50, ['bad', 'media'], 'rumor'); return l('O trecho vira meme e briga nos comentários.', 'The clip becomes a meme and a comment-section war.'); } },
    { id: 'plug', label: l('Só divulgar o disco', 'Just plug the record'), hint: l('Vendas; zero história.', 'Sales; zero story.'),
      fx: (s, c, _ok, e) => { e.fans(0, 600).mom(3); return l('Capa do disco na tela, data de lançamento repetida duas vezes.', 'Record sleeve on screen, release date repeated twice.'); } },
  ] }] });

def17({ id: 'presser', name: l('Coletiva de imprensa', 'Press conference'), icon: 'newspaper', cool: 6, bold: ['attack'],
  place: (s) => (s.year < 2010 ? 'tv_talk' : 'livestream'),
  title: (s, c) => (c.medium === 'feud' ? F(l('Coletiva: a rixa de {a}', 'Press conference: {a}\'s feud'), { a: actN(s, c) }) : F(l('Coletiva: o escândalo de {a}', 'Press conference: {a}\'s scandal'), { a: actN(s, c) })),
  text: () => l('Microfones de vinte veículos apontados. A primeira pergunta é a que você temia.', 'Microphones from twenty outlets pointed at you. The first question is the one you dreaded.'),
  stages: [{ q: l('A resposta', 'The answer'), opts: [
    { id: 'sorry', label: l('Pedir desculpas', 'Apologize'), hint: l('Contém o estrago; fãs rebeldes acham fraco.', 'Contains the damage; rebel fans call it weak.'),
      fx: (s, c, _ok, e) => { e.fame(1.5).rep('institutional', 3).stress(-4, l('peso tirado das costas', 'weight off the shoulders')); if (rebel(s, c)) e.fans(-80, 0); return l('A desculpa é aceita pela maioria; a história esfria.', 'Most accept the apology; the story cools down.'); } },
    { id: 'deny', label: l('Negar tudo', 'Deny everything'), hint: l('Se colar, some; se não, piora.', 'If it sticks, it fades; if not, it gets worse.'),
      odds: (s, c) => od(0.55 - c.ft * 0.05, l('Quanto mais famoso, mais gente cavando.', 'The more famous, the more people digging.')),
      fx: (s, c, ok, e) => { if (ok) { e.fame(1); return l('Sem provas novas, a imprensa muda de assunto.', 'With no new evidence, the press moves on.'); } e.fame(-2.5).stress(8, l('mentira desmentida', 'a lie exposed')); e.news(F(l('Imprensa desmente a negativa de {a}.', 'Press debunks {a}\'s denial.'), { a: actN(s, c) }), 50, ['bad']); return l('Um repórter mostra a prova ao vivo. Pior que antes.', 'A reporter shows the proof live. Worse than before.'); } },
    { id: 'joke', label: l('Fazer piada', 'Make a joke of it'), hint: l('Carisma decide.', 'Charisma decides.'),
      odds: (s) => od(0.25 + cha(s) / 130, F(l('Seu carisma: {c}', 'Your charisma: {c}'), { c: cha(s) })),
      fx: (s, c, ok, e) => { if (ok) { e.fans(60, 400).fame(1); return l('A sala ri junto. A piada vira a manchete no lugar do escândalo.', 'The room laughs along. The joke becomes the headline instead of the scandal.'); } e.haters(700); return l('Ninguém riu. "Debochado(a)", diz a capa do dia seguinte.', 'Nobody laughed. "Smug," says the next day\'s cover.'); } },
    { id: 'attack', label: l('Atacar a imprensa', 'Attack the press'), hint: l('Fãs fiéis em peso; imprensa vira inimiga.', 'Core fans rally; the press becomes an enemy.'),
      fx: (s, c, _ok, e) => { e.fans(200, 0).haters(900).rep('institutional', -4); e.news(F(l('{a} chama jornalistas de urubus na coletiva.', '{a} calls journalists vultures at the press conference.'), { a: actN(s, c) }), 55, ['bad', 'media']); e.photo(l('O dedo em riste para as câmeras', 'A finger jabbed at the cameras')); return l('A imprensa não esquece. Seus fãs, também não.', 'The press will not forget. Neither will your fans.'); } },
    { id: 'nocomment', label: l('"Sem comentários"', '"No comment"'), hint: l('Neutro; a história segue sozinha.', 'Neutral; the story runs on its own.'),
      fx: (s, c, _ok, e) => { e.stress(3, l('silêncio sob pressão', 'silence under pressure')); return l('Você sai pela porta dos fundos. A história segue sem você.', 'You leave through the back door. The story goes on without you.'); } },
  ] }] });

// ================================================================ estúdio, lançamento, contrato

def17({ id: 'studio_break', name: l('Virada no estúdio', 'Studio breakthrough'), icon: 'disc', cool: 0,
  place: () => 'studio',
  title: (s, c) => F(l('Madrugada no estúdio com {a}', 'Late night in the studio with {a}'), { a: actN(s, c) }),
  text: () => l('Num erro de gravação, algo mágico acontece: um take torto, mas vivo.', 'In a recording mistake, something magical happens: a crooked take, but alive.'),
  stages: [{ q: l('O que fazer com o acidente', 'What to do with the accident'), opts: [
    { id: 'keep', label: l('Manter o take imperfeito', 'Keep the imperfect take'), hint: l('Inspiração e prestígio.', 'Inspiration and prestige.'),
      fx: (s, c, _ok, e) => { e.insp(10).rep('artistic', 2); return l('O erro vira a marca registrada da faixa.', 'The mistake becomes the track\'s signature.'); } },
    { id: 'clean', label: l('Regravar limpo', 'Re-record it clean'), hint: l('Polido e comercial; a banda fica cansada.', 'Polished and commercial; the band gets tired.'),
      fx: (s, c, _ok, e) => { e.rep('commercial', 2).stress(4, l('takes infinitos', 'endless takes')); return l('Perfeito tecnicamente. Algo se perdeu, mas toca no rádio.', 'Technically perfect. Something got lost, but it plays on radio.'); } },
    { id: 'credit', label: l('Dar crédito ao músico de estúdio', 'Credit the session player'), hint: l('Lealdade de quem tocou; ego da banda reclama.', 'Loyalty from the player; the band\'s ego grumbles.'),
      fx: (s, c, _ok, e) => { e.rep('artists', 4).rep('artistic', 1).morale(-2); return l('O nome do músico vai para a capa. A cena musical fala bem do selo.', 'The player\'s name goes on the sleeve. The scene speaks well of the label.'); } },
    { id: 'allnight', label: l('Virar a noite atrás de mais', 'Pull an all-nighter for more'), hint: l('Mais inspiração; muito estresse.', 'More inspiration; lots of stress.'),
      odds: () => od(0.5, l('Madrugadas rendem ou queimam.', 'All-nighters pay off or burn out.')),
      fx: (s, c, ok, e) => { e.stress(9, l('noite sem dormir', 'a sleepless night')); if (ok) { e.insp(15); return l('Às 6h nasce a melhor faixa do disco.', 'At 6am the best track on the record is born.'); } e.morale(-4); return l('Às 6h todos se odeiam e nada presta.', 'At 6am everyone hates each other and nothing works.'); } },
  ] }] });

def17({ id: 'launch_party', name: l('Festa de lançamento', 'Album launch party'), icon: 'disc', cool: 0, bold: ['wild'],
  place: (s) => (s.year < 1975 ? 'country_house' : s.year < 2010 ? 'dance_club' : 'livestream'),
  title: (s, c) => F(l('Lançamento de {a}', '{a}\'s launch'), { a: actN(s, c) }),
  text: (s) => (s.year < 1975 ? l('Coquetel com jornalistas e o disco na vitrola.', 'Cocktails with journalists and the record on the turntable.') : s.year < 2010 ? l('Clube alugado, lista VIP e a imprensa na porta.', 'Club rented, VIP list and the press at the door.') : l('Audição ao vivo nas redes, contagem regressiva no chat.', 'Live listening session online, countdown in the chat.')),
  stages: [{ q: l('Que festa', 'What kind of party'), opts: [
    { id: 'press', label: l('Audição exclusiva para a crítica', 'Exclusive listening for critics'), hint: l('Crítica mais favorável.', 'Friendlier critics.'),
      fx: (s, c, _ok, e) => { e.rep('artistic', 3).cash(-1500, 'press party'); return l('Críticos saem com o disco debaixo do braço e boa vontade.', 'Critics leave with the record under their arm and goodwill.'); } },
    { id: 'fans', label: l('Festa aberta para os fãs', 'Open party for the fans'), hint: l('Fãs fiéis; custo maior.', 'Core fans; higher cost.'),
      fx: (s, c, _ok, e) => { e.fans(250, 300).cash(-3000, 'fan party'); return l('Fila dobrando o quarteirão. Os fãs se sentem parte do disco.', 'A line around the block. Fans feel part of the record.'); } },
    { id: 'wild', label: l('Festa sem limites', 'A no-limits party'), hint: l('Alivia e vira lenda — ou boato feio.', 'A release and a legend — or an ugly rumor.'),
      odds: (s, c) => od(0.6 - c.ft * 0.07, l('Fama alta = celulares e paparazzi.', 'High fame = phones and paparazzi.')),
      fx: (s, c, ok, e) => { e.stress(-10, l('noite de excesso', 'a night of excess')).cash(-5000, 'wild party').mom(4); e.photo(l('A piscina cheia de convidados vestidos', 'A pool full of fully-dressed guests')); if (!ok) { e.scandal('drugs', 40, F(l('Festa de lançamento de {a} termina com a polícia na porta.', '{a}\'s launch party ends with police at the door.'), { a: actN(s, c) })); return l('A polícia chega às 4h. A foto sai antes do disco.', 'Police arrive at 4am. The photo comes out before the record.'); } return l('Ninguém lembra direito, todo mundo comenta.', 'Nobody quite remembers, everybody talks about it.'); } },
    { id: 'charity', label: l('Sem festa: doar a verba', 'No party: donate the budget'), hint: l('Imagem e setor.', 'Image and industry respect.'),
      fx: (s, c, _ok, e) => { e.rep('institutional', 3).fame(0.8); e.news(F(l('{a} troca festa de lançamento por doação.', '{a} swaps the launch party for a donation.'), { a: actN(s, c) }), 30, ['good']); return l('A notícia corre bem; o disco ganha simpatia.', 'The news travels well; the record wins sympathy.'); } },
  ] }] });

def17({ id: 'store_sign', name: l('Tarde de autógrafos', 'Record store signing'), icon: 'disc', cool: 0, bold: ['acoustic'],
  place: () => 'store',
  title: (s, c) => F(l('{a} autografa na loja de discos', '{a} signs at the record store'), { a: actN(s, c) }),
  text: (s, c) => (c.ft <= 1 ? l('Meia dúzia de fãs e o dono da loja animado.', 'Half a dozen fans and an excited store owner.') : l('A fila sai pela porta e vira a esquina.', 'The line goes out the door and around the corner.')),
  stages: [{ q: l('Como conduzir', 'How to run it'), opts: [
    { id: 'all', label: l('Autografar até o último', 'Sign until the very last one'), hint: l('Fãs fiéis; cansaço.', 'Core fans; fatigue.'),
      fx: (s, c, _ok, e) => { e.fans(120, 50).stress(4, l('horas de fila', 'hours of signing')); return l('Mão dormente, coração cheio. Ninguém sai sem autógrafo.', 'Numb hand, full heart. Nobody leaves without a signature.'); } },
    { id: 'acoustic', label: l('Show acústico surpresa', 'Surprise acoustic set'), hint: l('Vira lenda local; a loja lota.', 'Becomes local legend; the store packs out.'),
      fx: (s, c, _ok, e) => { e.fans(160, 250).fame(1); e.photo(l('Violão entre as prateleiras de vinil', 'An acoustic guitar between vinyl racks')); return l('Três músicas entre as prateleiras; vídeos e fotos por toda parte.', 'Three songs between the racks; videos and photos everywhere.'); } },
    { id: 'leave', label: l('Sair no horário pelos fundos', 'Leave on time through the back'), hint: l('Poupa a banda; fãs da fila reclamam.', 'Spares the band; fans in line complain.'),
      fx: (s, c, _ok, e) => { e.fans(-40, 0).stress(-2, l('agenda respeitada', 'a schedule kept')); return l('Metade da fila vai embora sem autógrafo.', 'Half the line goes home without a signature.'); } },
  ] }] });

def17({ id: 'signing', name: l('Cerimônia de assinatura', 'Signing ceremony'), icon: 'contract', cool: 0,
  place: () => 'boardroom',
  title: (s, c) => F(l('{a} assina com o selo', '{a} signs with the label'), { a: actN(s, c) }),
  text: (s) => (s.year < 1980 ? l('Contrato datilografado, caneta-tinteiro e um fotógrafo da revista.', 'Typed contract, fountain pen and a magazine photographer.') : s.year < 2005 ? l('Advogados, fax e champanhe na sala de reunião.', 'Lawyers, a fax and champagne in the meeting room.') : l('Assinatura digital, celular gravando para as redes.', 'Digital signature, phones recording for social media.')),
  stages: [{ q: l('O tom da assinatura', 'The signing\'s tone'), opts: [
    { id: 'photo', label: l('Foto com champanhe para a imprensa', 'Champagne photo for the press'), hint: l('Divulgação: público casual.', 'Promotion: casual audience.'),
      fx: (s, c, _ok, e) => { e.fans(0, 400).fame(0.8); e.news(F(l('{a} assina com {s}.', '{a} signs with {s}.'), { a: actN(s, c), s: s.config.companyName }), 30, ['good', 'signing'], 'public', 'signing'); return l('A foto sai nas revistas do setor.', 'The photo runs in the trade press.'); } },
    { id: 'private', label: l('Aperto de mão discreto', 'A quiet handshake'), hint: l('Confiança do artista.', 'The artist\'s trust.'),
      fx: (s, c, _ok, e) => { e.trust(6); return l('Sem holofotes. O artista sente que é pessoa, não produto.', 'No spotlight. The artist feels like a person, not a product.'); } },
    { id: 'promise', label: l('Prometer o primeiro single em 6 meses', 'Promise the first single within 6 months'), hint: l('Confiança alta agora; promessa vira obrigação.', 'High trust now; the promise becomes a hold.'),
      fx: (s, c, _ok, e) => { e.trust(12).morale(5); if (c.act) e.hold(c.act, 'player', 'promise', 50, l('Primeiro single em 6 meses', 'First single within 6 months'), 6); return l('O artista sai sorrindo. Agora é cumprir.', 'The artist leaves smiling. Now you must deliver.'); } },
  ] }] });

// ================================================================ bastidores e conselho

def17({ id: 'backstage17', name: l('Briga no camarim', 'Backstage fight'), icon: 'fire', cool: 10, bold: ['leak'],
  place: () => 'backstage',
  title: (s, c) => F(l('Gritaria no camarim de {a}', 'Shouting in {a}\'s dressing room'), { a: actN(s, c) }),
  text: (s, c) => F(l('{p} joga uma garrafa na parede. Faltam 20 minutos para o show.', '{p} throws a bottle at the wall. Twenty minutes to showtime.'), { p: c.pid && s.persons[c.pid] ? s.persons[c.pid].name : '?' }),
  stages: [{ q: l('Sua intervenção', 'Your move'), opts: [
    { id: 'mediate', label: l('Mediar você mesmo(a)', 'Mediate yourself'), hint: l('Carisma decide; se der certo, a mágoa cai.', 'Charisma decides; if it works, resentment drops.'),
      odds: (s) => od(0.3 + cha(s) / 120, F(l('Seu carisma: {c}', 'Your charisma: {c}'), { c: cha(s) })),
      fx: (s, c, ok, e) => { const a = actOf17(s, c); if (ok && a) { for (const id of a.members) { const p = s.persons[id]; if (p) p.resentment = clamp(p.resentment - 15, 0, 100); } e.morale(5).trust(4).note(l('Mágoa na banda: −15', 'Band resentment: −15')); return l('Abraço meio torto, mas o show acontece e é ótimo.', 'An awkward hug, but the show happens and it is great.'); } e.morale(-4).stress(5, l('briga sem solução', 'an unresolved fight')); return l('Ninguém te escuta. O show sai no automático.', 'Nobody listens. The show runs on autopilot.'); } },
    { id: 'split', label: l('Separar os dois até o palco', 'Keep them apart until showtime'), hint: l('Show salvo; problema adiado.', 'Show saved; problem postponed.'),
      fx: (s, c, _ok, e) => { e.stress(3, l('tensão engavetada', 'tension shelved')); return l('Cada um num canto. No palco, nem se olham.', 'Each in a corner. On stage, they do not look at each other.'); } },
    { id: 'fight', label: l('Deixar que resolvam no braço', 'Let them settle it'), hint: l('Pode limpar o ar — ou acabar em hospital.', 'May clear the air — or end at the hospital.'),
      odds: () => od(0.4, l('Briga é sempre loteria.', 'A fight is always a lottery.')),
      fx: (s, c, ok, e) => { if (ok) { e.morale(3); return l('Dois socos, uma risada e eles tocam como nunca.', 'Two punches, a laugh, and they play like never before.'); } e.stress(10, l('briga física', 'a physical fight')).scandal('violence', 35, F(l('Briga física no camarim de {a}.', 'Physical fight backstage at {a}\'s show.'), { a: actN(s, c) })); return l('Nariz quebrado, show cancelado, boletim de ocorrência.', 'Broken nose, show cancelled, police report.'); } },
    { id: 'leak', label: l('Vazar a briga para a imprensa', 'Leak the fight to the press'), hint: l('Publicidade grátis; a banda descobre quem vazou?', 'Free publicity; will the band find out who leaked?'),
      fx: (s, c, _ok, e) => { e.mom(8).fame(1); e.news(F(l('Boato: clima péssimo nos bastidores de {a}.', 'Rumor: terrible mood backstage at {a}.'), { a: actN(s, c) }), 50, ['rumor', 'bad'], 'rumor'); if (c.pid) e.hold(c.pid, 'player', 'grievance', 30, l('Vazou a briga do camarim', 'Leaked the backstage fight')); return l('A procura por ingressos sobe. E alguém da banda desconfia de você.', 'Ticket demand rises. And someone in the band suspects you.'); } },
    { id: 'cancel', label: l('Cancelar o show', 'Cancel the show'), hint: l('Evita o pior; fãs frustrados.', 'Avoids the worst; frustrated fans.'),
      fx: (s, c, _ok, e) => { e.fans(-60, -200).stress(-4, l('noite de folga forçada', 'a forced night off')); return l('Reembolso, nota oficial: "problemas de saúde".', 'Refunds, official note: "health problems".'); } },
  ] }] });

def17({ id: 'board17', name: l('Reunião do conselho', 'Label board meeting'), icon: 'building', cool: 9,
  place: () => 'boardroom',
  title: (s) => F(l('Conselho de {c}', '{c} board meeting'), { c: s.config.companyName }),
  text: (s, c) => F(l('Os conselheiros querem saber o plano. O nome na mesa: {a}. O rival do momento: {r}.', 'The board wants to hear the plan. The name on the table: {a}. The rival of the moment: {r}.'), { a: actN(s, c), r: rivalN(s, c) }),
  stages: [{ q: l('Sua proposta', 'Your proposal'), opts: [
    { id: 'bet', label: l('Apostar tudo no artista principal', 'Bet it all on the lead act'), hint: l('Embalo do ato; custo alto.', 'Act momentum; high cost.'),
      fx: (s, c, _ok, e) => { e.cash(-12000, 'board bet').mom(12).trust(5); return l('Verba extra de marketing aprovada.', 'Extra marketing budget approved.'); } },
    { id: 'cut', label: l('Cortar custos', 'Cut costs'), hint: l('Caixa; artistas desconfiam.', 'Cash; artists grow wary.'),
      fx: (s, c, _ok, e) => { e.cash(8000, 'cost cuts').rep('artists', -3); return l('O conselho aplaude; o elenco ouve boatos de cortes.', 'The board applauds; the roster hears rumors of cuts.'); } },
    { id: 'war', label: (s, c) => F(l('Declarar guerra a {r}', 'Declare war on {r}'), { r: rivalN(s, c) }), hint: l('Rivalidade e imprensa.', 'Rivalry and press.'), when: (s, c) => !!c.rival,
      fx: (s, c, _ok, e) => { e.rival(20).rep('commercial', 2); e.news(F(l('{c} promete tirar artistas de {r}.', '{c} vows to poach acts from {r}.'), { c: s.config.companyName, r: rivalN(s, c) }), 45, ['feud']); return l('A ata vaza. O rival se prepara.', 'The minutes leak. The rival gets ready.'); } },
    { id: 'artists', label: l('Defender a liberdade dos artistas', 'Defend artistic freedom'), hint: l('Reputação com artistas; conselho resmunga.', 'Reputation with artists; the board grumbles.'),
      fx: (s, c, _ok, e) => { e.rep('artists', 4).rep('artistic', 2).rep('institutional', -2); return l('Você ganha o elenco e perde um conselheiro.', 'You win the roster and lose a board member.'); } },
  ] }] });

// ================================================================ justiça e polícia

def17({ id: 'arrest17', name: l('Prisão', 'Arrest'), icon: 'lock', major: true, cool: 3, bold: ['smile'],
  place: () => 'street',
  title: (s, c) => F(l('{p} algemado(a)', '{p} in handcuffs'), { p: c.pid && s.persons[c.pid] ? s.persons[c.pid].name : actN(s, c) }),
  text: (s) => (s.year < 1990 ? l('Flashes na porta da delegacia; a foto da ficha vai para os jornais.', 'Flashbulbs outside the station; the mugshot goes to the papers.') : l('Celulares filmam a viatura; a foto da ficha vaza em uma hora.', 'Phones film the squad car; the mugshot leaks within an hour.')),
  stages: [{ q: l('Diante das câmeras', 'In front of the cameras'), opts: [
    { id: 'smile', label: l('Sorrir para a foto da ficha', 'Smile for the mugshot'), hint: l('Foto icônica e fãs rebeldes; juiz não gosta.', 'Iconic photo and rebel fans; the judge disapproves.'),
      fx: (s, c, _ok, e) => { e.photo(l('A ficha policial sorridente', 'The smiling mugshot')); e.fans(rebel(s, c) ? 250 : 60, 300).rep('institutional', -4); return l('A foto vira camiseta. A promotoria guarda uma cópia.', 'The photo becomes a T-shirt. The prosecutor keeps a copy.'); } },
    { id: 'hide', label: l('Esconder o rosto', 'Hide your face'), hint: l('Menos eco; estresse.', 'Less echo; stress.'),
      fx: (s, c, _ok, e) => { e.stress(8, l('vergonha pública', 'public shame'), c.pid ?? 'act'); return l('A foto sai borrada. A notícia, nem tanto.', 'The photo comes out blurry. The news, not so much.'); } },
    { id: 'lawyer', label: l('Falar só por meio do advogado', 'Speak only through a lawyer'), hint: l('Postura séria; custa honorários.', 'Serious stance; costs fees.'),
      fx: (s, c, _ok, e) => { e.cash(-5000, 'lawyer').rep('institutional', 1); return l('Nota curta e técnica. A imprensa perde o interesse mais rápido.', 'A short technical statement. The press loses interest faster.'); } },
    { id: 'call', label: l('Ligar para alguém influente', 'Call someone influential'), hint: l('Solta mais rápido; você fica devendo.', 'Out faster; you owe them.'),
      fx: (s, c, _ok, e) => { e.stress(-5, l('fiança paga por um amigo', 'bail paid by a friend'), c.pid ?? 'act'); const fx = fixer(s, c); if (fx) e.hold(fx, 'player', 'favor', 55, l('Favor do contato influente na prisão', 'The influential contact\'s favor at the arrest')); return l('Uma ligação e a fiança aparece. Um dia vão cobrar.', 'One call and bail appears. Someday they will collect.'); } },
  ] }] });

def17({ id: 'court17', name: l('Audiência no tribunal', 'Court hearing'), icon: 'gavel', major: true, cool: 3,
  place: () => 'court',
  title: (s, c) => F(l('Escadaria do tribunal: {a}', 'Courthouse steps: {a}'), { a: actN(s, c) }),
  text: () => l('O veredito saiu. Na escadaria, repórteres esperam a primeira frase.', 'The verdict is in. On the steps, reporters await the first sentence.'),
  stages: [{ q: l('A primeira frase', 'The first sentence'), opts: [
    { id: 'remorse', label: l('Remorso e respeito à justiça', 'Remorse and respect for the court'), hint: l('Imagem; menos estresse.', 'Image; less stress.'),
      fx: (s, c, _ok, e) => { e.fame(1).rep('institutional', 3).stress(-4, l('capítulo encerrado', 'a chapter closed')); return l('A frase é citada como exemplo de maturidade.', 'The sentence is quoted as an example of maturity.'); } },
    { id: 'defiant', label: l('Punho erguido, desafiador', 'Raised fist, defiant'), hint: l('Fãs fiéis; o sistema não esquece.', 'Core fans; the system does not forget.'),
      fx: (s, c, _ok, e) => { e.fans(220, 0).rep('institutional', -5); e.photo(l('O punho erguido na escadaria', 'The raised fist on the steps')); e.news(F(l('{a} sai do tribunal desafiando a justiça.', '{a} leaves court defying the system.'), { a: actN(s, c) }), 45, ['crime']); return l('A foto vira símbolo. A polícia passa a vigiar mais.', 'The photo becomes a symbol. Police watch more closely.'); } },
    { id: 'system', label: l('Denunciar o sistema', 'Denounce the system'), hint: l('Ativismo: prestígio e risco onde há censura.', 'Activism: prestige and risk where there is censorship.'),
      fx: (s, c, _ok, e) => { e.rep('artistic', 3).fans(150, 0); if (censored(s, c)) e.scandal('politics', 40, F(l('{a} ataca a justiça do país.', '{a} attacks the country\'s justice system.'), { a: actN(s, c) })); return l('O discurso é transmitido e debatido.', 'The speech is broadcast and debated.'); } },
    { id: 'silent', label: l('Passar calado(a) pelas câmeras', 'Walk past the cameras in silence'), hint: l('Neutro.', 'Neutral.'),
      fx: (s, c, _ok, e) => { e.stress(2, l('silêncio tenso', 'tense silence')); return l('O carro arranca. As câmeras filmam o vidro escuro.', 'The car pulls away. Cameras film the tinted glass.'); } },
  ] }] });

// ================================================================ vida: funeral, casamento, nascimento, reabilitação

def17({ id: 'funeral17', name: l('Funeral', 'Funeral'), icon: 'broken-heart', major: true, cool: 0, bold: ['sing'],
  place: () => 'funeral',
  title: (s, c) => F(l('Adeus a {p}', 'Farewell to {p}'), { p: c.who ?? '?' }),
  text: (s, c) => (['rain', 'monsoon', 'storm'].includes(c.wx ?? '') ? l('Chove no cemitério. Fãs com flores do lado de fora do portão.', 'Rain at the cemetery. Fans with flowers outside the gate.') : l('Sol frio no cemitério. Fãs com flores do lado de fora do portão.', 'Cold sun at the cemetery. Fans with flowers outside the gate.')),
  stages: [{ q: l('Como se despedir', 'How to say goodbye'), opts: [
    { id: 'sing', label: l('Cantar no enterro', 'Sing at the funeral'), hint: l('Luto vira catarse; fãs choram juntos.', 'Grief becomes catharsis; fans cry together.'),
      fx: (s, c, _ok, e) => { e.stress(-6, l('luto expresso', 'grief expressed')).fans(200, 300).insp(8); e.photo(l('A voz embargada diante do caixão', 'A cracked voice before the coffin')); return l('A canção à capela atravessa o portão. Os fãs cantam junto.', 'The a cappella song carries past the gate. The fans sing along.'); } },
    { id: 'private', label: l('Luto em silêncio, sem imprensa', 'Grieve privately, no press'), hint: l('Respeito; o luto pesa mais tempo.', 'Respect; grief weighs longer.'),
      fx: (s, c, _ok, e) => { e.stress(4, l('luto guardado', 'grief held in')).rep('institutional', 2); return l('Nenhuma foto. A família agradece em nota.', 'No photos. The family thanks you in a note.'); } },
    { id: 'tribute', label: l('Anunciar show-tributo beneficente', 'Announce a benefit tribute show'), hint: l('Fama e fãs; custa organização.', 'Fame and fans; costs to organize.'),
      fx: (s, c, _ok, e) => { e.cash(-4000, 'tribute').fame(1.5).fans(150, 500).insp(4); e.news(F(l('Show-tributo a {p} anunciado.', 'Tribute show for {p} announced.'), { p: c.who ?? '?' }), 40, ['good']); return l('Artistas de toda a cena confirmam presença.', 'Artists from the whole scene sign up.'); } },
    { id: 'album', label: l('Anunciar disco póstumo', 'Announce a posthumous record'), hint: l('Dinheiro; acusação de oportunismo.', 'Money; accusations of cashing in.'),
      fx: (s, c, _ok, e) => { e.cash(6000, 'posthumous advance').haters(800).rep('artistic', -3); e.news(F(l('Selo anuncia disco póstumo de {p} — fãs se dividem.', 'Label announces {p}\'s posthumous record — fans split.'), { p: c.who ?? '?' }), 45, ['bad', 'death']); return l('O adiantamento entra. Os comentários, também.', 'The advance comes in. So do the comments.'); } },
  ] }] });

def17({ id: 'wedding17', name: l('Casamento', 'Wedding'), icon: 'heart', major: true, cool: 0, bold: ['magazine'],
  place: (s, c) => ((c.n ?? 0) >= 2 ? 'mansion' : 'country_house'),
  title: (s, c) => F(l('O casamento com {p}', 'The wedding with {p}'), { p: c.who ?? '?' }),
  text: () => l('Flores, família, e lá fora uma van de revista oferecendo dinheiro pelas fotos.', 'Flowers, family, and outside a magazine van offering money for the photos.'),
  stages: [{ q: l('Que festa', 'What kind of party'), opts: [
    { id: 'private', label: l('Só família e amigos', 'Family and friends only'), hint: l('Afinidade e paz.', 'Affinity and peace.'),
      fx: (s, c, _ok, e) => { e.partner(8).stress(-8, l('dia em paz', 'a peaceful day'), 'me'); return l('Ninguém de fora viu. Foi perfeito.', 'No outsider saw it. It was perfect.'); } },
    { id: 'magazine', label: l('Vender as fotos para uma revista', 'Sell the photos to a magazine'), hint: l('Dinheiro e fama; seu par pode não gostar.', 'Money and fame; your partner may not like it.'),
      odds: (s) => od(PARTNER_TRAITS.find((x) => x.id === life(s).partner?.trait)?.likes === 'fame' ? 0.9 : 0.45, l('Depende de quanto seu par gosta de holofotes.', 'Depends on how much your partner likes the spotlight.')),
      fx: (s, c, ok, e) => { e.pocket(4000 + c.ft * 6000).fame(1); e.photo(l('O beijo na capa da revista', 'The kiss on the magazine cover')); if (!ok) { e.partner(-8); return l('A revista vende muito; seu par se sente exposto.', 'The magazine sells big; your partner feels exposed.'); } e.partner(3); return l('Capa dupla. Seu par adora.', 'A double cover. Your partner loves it.'); } },
    { id: 'industry', label: l('Festão com a indústria', 'A huge industry party'), hint: l('Contatos no setor; caro.', 'Industry contacts; expensive.'),
      fx: (s, c, _ok, e) => { e.pocket(-9000).rep('institutional', 4).rep('commercial', 2); return l('Metade do setor dança na sua festa. Negócios fecham no bar.', 'Half the industry dances at your party. Deals close at the bar.'); } },
    { id: 'ex', label: l('Convidar um(a) ex', 'Invite an ex'), hint: l('Gesto de paz — ou drama na pista.', 'A peace gesture — or drama on the dance floor.'), when: (s) => love17(s).exes.length > 0,
      odds: () => od(0.45, l('Ex no casamento é sempre arriscado.', 'An ex at the wedding is always risky.')),
      fx: (s, c, ok, e) => { const ex = love17(s).exes[0]; if (ok) { if (ex) ex.bitter = undefined; e.note(l('Mágoa do(a) ex desfeita.', 'The ex\'s bitterness is gone.')); return l('Brinde emocionado. Velhas feridas fecham.', 'An emotional toast. Old wounds close.'); } e.partner(-10).news(l('Barraco no casamento: ex convidado(a) causa cena.', 'Wedding drama: an invited ex makes a scene.'), 45, ['bad', 'romance'], 'rumor'); return l('Discussão na pista, taça quebrada, convidados filmando.', 'An argument on the dance floor, a broken glass, guests filming.'); } },
  ] }] });

def17({ id: 'birth17', name: l('Nascimento', 'Child birth'), icon: 'heart', major: true, cool: 0,
  place: () => 'clinic',
  title: () => l('Um bebê na família', 'A baby in the family'),
  text: () => l('Na maternidade, um choro novo. No corredor, um fotógrafo esperando.', 'At the maternity ward, a new cry. In the hallway, a photographer waiting.'),
  stages: [{ q: l('E agora', 'And now'), opts: [
    { id: 'share', label: l('Compartilhar a foto do bebê', 'Share the baby photo'), hint: l('Público casual se derrete.', 'The casual audience melts.'),
      fx: (s, c, _ok, e) => { e.fans(40, 800).fame(1); return l('A foto vira a mais curtida do ano no seu círculo.', 'The photo becomes the most loved of the year in your circle.'); } },
    { id: 'private', label: l('Proteger a privacidade', 'Protect the baby\'s privacy'), hint: l('Paz em casa.', 'Peace at home.'),
      fx: (s, c, _ok, e) => { e.partner(6).stress(-5, l('família protegida', 'family protected'), 'me'); return l('Nenhum rosto na imprensa. Seu par agradece.', 'No face in the press. Your partner is grateful.'); } },
    { id: 'song', label: l('Escrever uma canção de ninar', 'Write a lullaby'), hint: l('Inspiração.', 'Inspiration.'),
      fx: (s, c, _ok, e) => { e.insp(12).partner(4); return l('Às 3h da manhã, com o bebê no colo, nasce uma melodia.', 'At 3am, with the baby in your arms, a melody is born.'); } },
    { id: 'leave', label: l('Tirar licença de 2 meses', 'Take a 2-month leave'), hint: l('Menos estresse e família; o ato perde embalo.', 'Less stress and family; the act loses momentum.'),
      fx: (s, c, _ok, e) => { e.stress(-12, l('licença parental', 'parental leave'), 'me').partner(10).mom(-6); return l('Fraldas no lugar de reuniões. Vale cada dia.', 'Diapers instead of meetings. Worth every day.'); } },
  ] }] });

def17({ id: 'rehab17', name: l('Reabilitação', 'Rehab'), icon: 'heart', major: true, cool: 6,
  place: () => 'clinic',
  title: (s, c) => F(l('{p} na clínica', '{p} in rehab'), { p: c.pid && s.persons[c.pid] ? s.persons[c.pid].name : actN(s, c) }),
  text: () => l('Corredor branco, celular recolhido. A terapeuta pergunta quem deve saber.', 'White hallway, phone confiscated. The therapist asks who should know.'),
  stages: [{ q: l('Como lidar', 'How to handle it'), opts: [
    { id: 'public', label: l('Assumir publicamente', 'Go public'), hint: l('Honestidade comove; a vida vira pauta.', 'Honesty moves people; life becomes a story.'),
      fx: (s, c, _ok, e) => { e.fans(150, 300).fame(0.8).stress(-6, l('sem segredos', 'no secrets'), c.pid ?? 'act'); e.news(F(l('{p} fala abertamente sobre a reabilitação.', '{p} speaks openly about rehab.'), { p: c.pid && s.persons[c.pid] ? s.persons[c.pid].name : actN(s, c) }), 40, ['good', 'health']); return l('Cartas de fãs chegam aos montes: "você me salvou".', 'Fan letters pour in: "you saved me".'); } },
    { id: 'secret', label: l('Manter em segredo', 'Keep it secret'), hint: l('Ninguém sabe — se a clínica não vazar.', 'Nobody knows — if the clinic does not leak.'),
      fx: (s, c, _ok, e) => { e.news(F(l('{p} se interna em segredo.', '{p} checks into rehab in secret.'), { p: c.pid && s.persons[c.pid] ? s.persons[c.pid].name : actN(s, c) }), 30, ['health'], 'secret', 'rehab'); return l('Oficialmente, "férias". Um enfermeiro sabe demais.', 'Officially, a "vacation". One nurse knows too much.'); } },
    { id: 'tour', label: l('Sair antes para não perder a turnê', 'Leave early to keep the tour'), hint: l('Caixa e embalo; alto risco de recaída.', 'Cash and momentum; high relapse risk.'),
      fx: (s, c, _ok, e) => { e.mom(5).stress(10, l('tratamento interrompido', 'treatment cut short'), c.pid ?? 'act'); return l('A turnê segue. O problema, também.', 'The tour goes on. So does the problem.'); } },
    { id: 'band', label: l('Sessão de família com a banda', 'Family session with the band'), hint: l('Banda mais unida; expõe mágoas.', 'A closer band; exposes old grudges.'),
      fx: (s, c, _ok, e) => { e.morale(6); const a = actOf17(s, c); if (a) for (const id of a.members) { const p = s.persons[id]; if (p) p.resentment = clamp(p.resentment - 10, 0, 100); } e.note(l('Mágoa na banda: −10', 'Band resentment: −10')); return l('Choro, verdade e, no fim, um abraço coletivo.', 'Tears, truth and, in the end, a group hug.'); } },
  ] }] });

// ================================================================ encontro (liga ao love17)

const SPOTS: { id: string; y0: number; y1: number; name: L; likes: string[]; cost: number }[] = [
  { id: 'diner', y0: 1920, y1: 2100, name: l('Lanchonete com jukebox', 'Diner with a jukebox'), likes: ['calm', 'family'], cost: 40 },
  { id: 'jazz', y0: 1920, y1: 1975, name: l('Clube de jazz enfumaçado', 'Smoky jazz club'), likes: ['music'], cost: 120 },
  { id: 'drivein', y0: 1950, y1: 1985, name: l('Cinema drive-in', 'Drive-in movie'), likes: ['calm', 'family'], cost: 60 },
  { id: 'disco', y0: 1975, y1: 1990, name: l('Discoteca com pista iluminada', 'Disco with a lit dance floor'), likes: ['fame', 'music'], cost: 200 },
  { id: 'gala', y0: 1920, y1: 2100, name: l('Restaurante chique', 'Fancy restaurant'), likes: ['money', 'fame'], cost: 400 },
  { id: 'arcade', y0: 1980, y1: 2000, name: l('Fliperama', 'Arcade'), likes: ['calm'], cost: 50 },
  { id: 'karaoke', y0: 1985, y1: 2100, name: l('Karaokê', 'Karaoke bar'), likes: ['music', 'fame'], cost: 80 },
  { id: 'rooftop', y0: 2005, y1: 2100, name: l('Bar no terraço', 'Rooftop bar'), likes: ['money', 'fame'], cost: 250 },
  { id: 'park', y0: 1920, y1: 2100, name: l('Piquenique no parque', 'Picnic in the park'), likes: ['family', 'calm'], cost: 20 },
  { id: 'gig', y0: 1920, y1: 2100, name: l('Seu próprio show, da coxia', 'Your own show, from the wings'), likes: ['music', 'fame'], cost: 0 },
];
const likesOf = (s: GameState): string => PARTNER_TRAITS.find((x) => x.id === life(s).partner?.trait)?.likes ?? 'calm';
const outdoor = (id: string) => id === 'park' || id === 'drivein' || id === 'rooftop';
const spotOpt = (sp: (typeof SPOTS)[number]): Opt17 => ({ id: sp.id, label: sp.name, hint: (s) => (sp.cost ? F(l('~{c} do seu bolso', '~{c} from your pocket'), { c: usd17(money(s, sp.cost)) }) : l('de graça', 'free')),
  when: (s, c) => s.year >= sp.y0 && s.year <= sp.y1 && !(outdoor(sp.id) && ['rain', 'storm', 'monsoon', 'snow'].includes(c.wx ?? '')),
  fx: () => l('', '') });
const TALK: Opt17[] = [
  { id: 'music', label: l('Falar de música', 'Talk about music'), hint: l('Ótimo com quem ama música.', 'Great with music lovers.'), fx: () => l('', '') },
  { id: 'dreams', label: l('Perguntar dos sonhos dele(a)', 'Ask about their dreams'), hint: l('Quase sempre funciona.', 'Almost always works.'), fx: () => l('', '') },
  { id: 'fame', label: l('Contar histórias da fama', 'Tell fame stories'), hint: l('Encanta quem gosta de holofote; cansa o resto.', 'Charms spotlight lovers; bores the rest.'), fx: () => l('', '') },
  { id: 'open', label: l('Abrir o coração (vulnerável)', 'Open your heart (vulnerable)'), hint: l('Aproxima muito — ou assusta.', 'Brings you very close — or scares them off.'), fx: () => l('', '') },
  { id: 'future', label: l('Falar de futuro juntos', 'Talk about a future together'), hint: l('Bom para quem quer família.', 'Good for those who want family.'), fx: () => l('', '') },
];
function dateOdds(s: GameState, c: Ctx17): Odds17 {
  const lk = likesOf(s);
  const sp = SPOTS.find((x) => x.id === c.picks[0]);
  const why: L[] = [F(l('Seu par gosta de: {k}', 'Your partner likes: {k}'), { k: lk })];
  let p = 0.45 + (cha(s) - 50) / 200;
  if (sp?.likes.includes(lk)) { p += 0.2; why.push(l('O lugar combina com o gosto dele(a).', 'The place suits their taste.')); }
  return { p: clamp(p, 0.1, 0.9), why };
}
function dateFx(s: GameState, c: Ctx17, ok: boolean, e: import('./scene17').Fx17, talk: string): L {
  const lk = likesOf(s);
  const sp = SPOTS.find((x) => x.id === c.picks[0]) ?? SPOTS[0];
  const fit = (talk === 'music' && lk === 'music') || (talk === 'fame' && lk === 'fame') || (talk === 'future' && lk === 'family') || talk === 'dreams';
  let gain = (ok ? 7 : 1) + (fit ? 6 : talk === 'fame' ? -4 : 0) + (talk === 'open' ? (ok ? 8 : -6) : 0);
  if (sp.likes.includes(lk)) gain += 3;
  if (sp.cost) e.pocket(-sp.cost);
  e.partner(Math.round(gain)).stress(-5, l('noite a dois', 'a night together'), 'me');
  love17(s).st.dates += 1;
  // paparazzi: fama alta em lugar público; casal do mesmo sexo onde a aceitação é baixa → risco real
  const pub = sp.id !== 'park' || c.ft >= 3;
  if (pub && c.ft >= 3 && !ok) {
    const ss = !!love17(s).ss;
    const acc = acceptAtCity(s, c.city ?? s.config.homeCity);
    if (ss && acc < 0.4) { e.scandal('sex', 45, F(l('Fotos de {p} num encontro em {c} causam reação hostil.', 'Photos of {p} on a date in {c} draw a hostile reaction.'), { p: actN(s, c), c: cityN(c.city) })); e.note(F(l('Aceitação local: {v}% — a cidade não perdoa.', 'Local acceptance: {v}% — the city is unforgiving.'), { v: Math.round(acc * 100) })); }
    else e.news(F(l('Paparazzi flagram {p} em encontro romântico em {c}.', 'Paparazzi catch {p} on a romantic date in {c}.'), { p: actN(s, c), c: cityN(c.city) }), 40, ['romance'], 'rumor', 'romance');
  }
  if (gain >= 12) { e.photo(l('O casal rindo à mesa, fora de foco', 'The couple laughing at the table, out of focus')); return F(l('{s}: a conversa flui e vocês perdem a hora.', '{s}: the conversation flows and you lose track of time.'), { s: sp.name }); }
  if (gain >= 5) return F(l('{s}: noite agradável, um passo adiante.', '{s}: a pleasant night, a step forward.'), { s: sp.name });
  return F(l('{s}: algo não encaixou; voltam calados.', '{s}: something did not click; you ride home in silence.'), { s: sp.name });
}
def17({ id: 'date17', name: l('Encontro romântico', 'Romantic date'), icon: 'heart', cool: 3, bold: ['open'],
  place: (s) => (s.year < 1975 ? 'dance_club' : s.year < 2005 ? 'dance_club' : 'street'),
  title: (s, c) => F(l('Encontro com {p}', 'Date with {p}'), { p: c.who ?? '?' }),
  text: (s, c) => (c.n ? l('O primeiro encontro de verdade. Onde levar?', 'The first real date. Where to go?') : l('Uma noite só de vocês dois. Onde ir?', 'A night just for the two of you. Where to go?')),
  stages: [
    { q: l('Onde', 'Where'), opts: SPOTS.map(spotOpt) },
    { q: l('Sobre o que conversar', 'What to talk about'), opts: TALK.map((t) => ({ ...t, odds: dateOdds, fx: (s: GameState, c: Ctx17, ok: boolean, e: import('./scene17').Fx17) => dateFx(s, c, ok, e, t.id) })) },
  ] });

// ================================================================ momentos (moments16) → cena

/** Que cena interativa cada momento ilustrado oferece. */
export function momentDef17(ev: { k: string; fest?: boolean; award?: string; medium?: string; year: number }, ft = 0): string | null {
  switch (ev.k) {
    case 'award': return ev.award === 'festival' ? 'fest_head' : 'award_win';
    case 'show': return ev.fest ? 'fest_head' : 'show_night';
    case 'press': return ev.medium === 'magazine' ? null : 'tv_spot';
    case 'record': return 'studio_break';
    case 'release': return ev.year < 1990 || ft <= 1 ? 'store_sign' : 'launch_party';
    case 'contract': return 'signing';
    default: return null;
  }
}
void amp17;

/** Abre (ou acha) a cena interativa de um momento ilustrado. Devolve a chave ou null (sem cena). */
export function momentScene17(s: GameState, rec: MomentRec16): string | null {
  const key = `m:${rec.id}`;
  if (result17(s, key)) return key;
  const act = rec.act ?? (rec.mem ? s.memory.find((m) => m.id === rec.mem)?.actId : undefined);
  const a = act ? s.acts[act] : undefined;
  if (!a || !(a.owner === 'player' || a.playerBand)) return null;
  const ev = rec.ev as MomentRec16['ev'] & { fest?: boolean; award?: string; medium?: string; tier?: number; city?: string };
  const def = momentDef17(ev, fameTier(a.fame));
  if (!def) return null;
  // só cenas do mês corrente (ou ainda pendentes) aceitam escolhas: rever antigas é só lembrança
  if (s.week - rec.week > 8) return null;
  const c = ctx17(s, { act, pid: a.members[0], city: ev.city ?? a.city, tier: ev.tier, medium: ev.medium, award: ev.award });
  c.year = rec.year;
  return open17(s, key, def, c) ? key : null;
}

type Cat17 = { nominees: { name: string; mine: boolean; actId?: string }[]; winner: number };
/** Cerimônia dos Gramófonos: discurso (ganhou) ou reação (perdeu, com indicação sua). */
export function awardScene17(s: GameState, cs: { id: string; data: Record<string, unknown> }): string | null {
  const key = `aw:${cs.id}`;
  if (result17(s, key)) return key;
  const cats = (cs.data.cats as Cat17[] | undefined) ?? [];
  const won = !!cs.data.won;
  let act = cs.data.actId ? String(cs.data.actId) : undefined;
  let who: string | undefined;
  if (!won) {
    const lost = cats.find((c) => c.nominees.some((n) => n.mine) && !c.nominees[c.winner]?.mine);
    if (!lost) return null;
    act = lost.nominees.find((n) => n.mine)?.actId;
    who = lost.nominees[lost.winner]?.name;
  }
  if (act && !s.acts[act]) act = undefined;
  const c = ctx17(s, { act, pid: act ? s.acts[act].members[0] : undefined, rival: cs.data.rivalId ? String(cs.data.rivalId) : undefined, who, award: 'major' });
  return open17(s, key, won ? 'award_win' : 'award_lose', c) ? key : null;
}
