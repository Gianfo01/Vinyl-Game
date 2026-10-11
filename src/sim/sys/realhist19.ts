// Rodada 19 (Frente 2, piloto, realhist19) — HISTÓRIA REAL COMO CONTEÚDO: 4 marcos com decisão e consequência
// (um por fatia de época) entram em world4/milestones e abrem cartões; cada escolha agenda ecos (decide18) e o resultado
// fica registrado para o cartão "A história real" (o que aconteceu de verdade × o que aconteceu na sua partida, nos
// modos de história alternativa). Regras de sensibilidade: só fatos documentados no texto real; vítimas e feridos da
// partida são sempre anônimos e fictícios; nada gráfico; pessoas reais nunca matam nem morrem por escolha do jogo.
//   1956 Eurovisão · 1964–67 rádio pirata e a Lei de 1967 · 1969 festival gratuito que deu errado · 1983 MTV e a barreira de cor

import { clamp } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerConseq18, type Fx18 } from '../decide18';
import type { EventDef } from '../events';
import { deferEvents, registerDecisionListener, registerExt4 } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { altHistory } from '../history15';
import { registerAdvisorTip } from '../inbox18';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, hasTech, money, playerActs, post, remember } from '../util';
import { MILESTONES, type Milestone } from './world4/milestones';
import { w4 } from './world4/state';

export interface RealHist19 { id: string; ms: string; ev: string; year: number; title: L; real: L; src: string }
/** O que aconteceu de verdade (só fatos documentados; fonte curta). */
export const REAL19: RealHist19[] = [
  { id: 'eurovision', ms: 'rh19_eurovision', ev: 'rh19_euro', year: 1956, title: l('Eurovisão', 'Eurovision'), src: 'EBU; Lugano, 24/5/1956',
    real: l('O primeiro Festival Eurovisão da Canção aconteceu em 24 de maio de 1956, em Lugano, com sete países; a Suíça venceu com Lys Assia ("Refrain"). O concurso virou vitrine anual — em 1974 o ABBA venceu com "Waterloo" e ganhou o mundo.',
      'The first Eurovision Song Contest was held on 24 May 1956 in Lugano with seven countries; Switzerland won with Lys Assia ("Refrain"). The contest became a yearly showcase — in 1974 ABBA won with "Waterloo" and went global.') },
  { id: 'pirate', ms: 'rh19_pirate', ev: 'rh19_pirate', year: 1964, title: l('Rádio pirata e a Lei de 1967', 'Pirate radio and the 1967 Act'), src: 'Marine, &c., Broadcasting (Offences) Act 1967',
    real: l('Em 1964 a Radio Caroline começou a transmitir de um navio fora das águas britânicas; a BBC quase não tocava discos (limite de "needle time"). Em 15 de agosto de 1967 a Lei de Delitos de Radiodifusão Marítima proibiu abastecer e anunciar nas rádios do mar; em 30 de setembro a BBC lançou a Radio 1, contratando vários DJs piratas. A Caroline seguiu no ar, ilegal.',
      'In 1964 Radio Caroline began broadcasting from a ship outside British waters; the BBC played very few records ("needle time" limits). On 15 August 1967 the Marine Broadcasting Offences Act banned supplying and advertising on the sea stations; on 30 September the BBC launched Radio 1, hiring several pirate DJs. Caroline stayed on air, illegally.') },
  { id: 'freefest', ms: 'rh19_freefest', ev: 'rh19_fest', year: 1969, title: l('O festival gratuito que deu errado', 'The free festival that went wrong'), src: 'Altamont, 6/12/1969; "Gimme Shelter" (1970)',
    real: l('Em 6 de dezembro de 1969 o festival gratuito de Altamont, na Califórnia, foi montado em poucos dias para cerca de 300 mil pessoas; a segurança ficou com um clube de motociclistas. Houve violência durante o dia e quatro mortes. A imprensa tratou o dia como o fim simbólico do sonho de Woodstock; o documentário "Gimme Shelter" (1970) registrou o caos.',
      'On 6 December 1969 the free festival at Altamont, California, was set up in a few days for some 300,000 people; security was left to a motorcycle club. There was violence through the day and four deaths. The press treated it as the symbolic end of the Woodstock dream; the documentary "Gimme Shelter" (1970) recorded the chaos.') },
  { id: 'mtv', ms: 'rh19_mtv', ev: 'rh19_mtv', year: 1983, title: l('A MTV e a barreira de cor', 'MTV and the colour barrier'), src: 'MTV 1981–83; "Billie Jean", março de 1983',
    real: l('Nos primeiros anos (1981–83) a MTV quase não exibia clipes de artistas negros, alegando um formato "rock"; Rick James e outros denunciaram o veto em público. Em março de 1983, sob pressão da CBS (que ameaçou retirar seus clipes), a emissora pôs "Billie Jean", de Michael Jackson, na programação — a barreira começou a cair, e em 1988 o "Yo! MTV Raps" levou o rap ao horário nobre.',
      'In its first years (1981–83) MTV barely aired videos by Black artists, citing a "rock" format; Rick James and others denounced the ban publicly. In March 1983, under pressure from CBS (which threatened to pull its videos), the channel added Michael Jackson\'s "Billie Jean" — the barrier began to fall, and in 1988 "Yo! MTV Raps" brought rap to prime time.') },
];

// ---------------------------------------------------------------- estado: o que aconteceu na SUA partida
export interface RH19Run { y: number; opt: string; pick: L; out?: L; tone?: 'good' | 'bad' | 'mixed' }
export interface RH19State { run: Record<string, RH19Run>; fest?: number }
declare module '../ext4' { interface Ext4 { realhist19: RH19State } }
registerExt4('realhist19', () => ({ run: {} }));
export function rh19(s: GameState): RH19State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.realhist19 ??= { run: {} }) as RH19State;
  st.run ??= {};
  return st;
}
const byEv = (ev: string) => REAL19.find((r) => r.ev === ev);
registerDecisionListener('realhist19', (s, eventId, opt) => {
  const r = byEv(eventId);
  if (!r) return;
  const d = s.decisions.find((x) => x.eventId === eventId);
  const pick = d?.options.find((o) => o.id === opt)?.label ?? l(opt, opt);
  rh19(s).run[r.id] = { y: s.year, opt, pick };
  emitFact(s, { kind: 'real_history', actors: ['player'], severity: 25, visibility: 'public', tags: ['realhist19', r.id, opt], src: 'realhist19', text: fmtL(l('{t}: o selo escolheu "{o}".', '{t}: the label chose "{o}".'), { t: r.title, o: pick }) });
});
// a escolha entra no diário da partida (memória importante: aparece no Diário e na biografia)
onFact('real_history', (s, f) => { remember(s, 'realhist19', f.text, { important: true }); }, 'realhist19:diary');
/** grava o desfecho na partida (lido pelo cartão "A história real") */
const outcome = (f: Fx18, id: string, text: L, tone: 'good' | 'bad' | 'mixed'): L => { const r = rh19(f.s).run[id]; if (r) { r.out = text; r.tone = tone; } return text; };

/** Cartões "A história real" já disponíveis (marco disparado no jogo). */
export interface RHCard19 { r: RealHist19; run?: RH19Run; alt: boolean; diverged: boolean }
export function realCards19(s: GameState): RHCard19[] {
  const ms = w4(s).ms;
  return REAL19.filter((r) => ms[r.ms] !== undefined).map((r) => {
    const run = rh19(s).run[r.id];
    return { r, run, alt: altHistory(s), diverged: !!run && altHistory(s) };
  });
}

// ---------------------------------------------------------------- ajudantes
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && a.members.length);
const N = (pt: string, en: string): L => l(pt, en);
const pay = (s: GameState, k: string, real: number, cat: string, memo: string) => post(s, `rh19:${k}:${s.week}`, -money(s, real), cat, memo);
const T = (f: Fx18, pt: string, en: string): L => fmtL(l(pt, en), { a: f.act?.name ?? l('o selo', 'the label') });
const BLACK_FAM = ['rnb', 'hiphop'];
const topMine = (s: GameState, f: (a: Act) => boolean = () => true): Act | undefined => mine(s).filter(f).sort((a, b) => b.fame - a.fame)[0];

// ---------------------------------------------------------------- 1. Eurovisão (1956 + todo março)
const euro: EventDef = {
  id: 'rh19_euro', cat: 'career', tone: 'good', tags: ['realhist19'], cooldown: 11, weight: 0.5,
  find: (s, r) => {
    if (s.year < 1957 || s.month !== 2 || !r.chance(0.3)) return null;
    const a = topMine(s, (x) => ['europe', 'pop'].includes(familyOf(x.genre)));
    return a ? { act: a.id } : null;
  },
  title: N('Eurovisão: inscrever {act}?', 'Eurovision: enter {act}?'),
  text: N('A seleção nacional para o festival europeu da canção está aberta. Uma noite, centenas de milhões de telespectadores: a vitória abre a Europa; a derrota pode virar piada ("zero pontos").', 'The national selection for the European song contest is open. One night, hundreds of millions of viewers: victory opens Europe; defeat can become a joke ("nul points").'),
  options: [
    { id: 'enter', label: N('Inscrever e caprichar', 'Enter and go all out'), hint: N('Orquestra e figurino agora; a noite decide.', 'Orchestra and costumes now; the night decides.'), apply: (s) => pay(s, 'euro', 1500, 'marketing', 'Eurovisão: orquestra e figurino') },
    { id: 'song', label: N('Só ceder a canção a outro intérprete', 'Just give the song to another singer'), hint: N('Sem risco de vexame; a edição pode render.', 'No risk of embarrassment; publishing may pay.'), apply: () => {} },
    { id: 'skip', label: N('Não é a nossa praia', 'Not our thing'), hint: N('Nada agora.', 'Nothing now.'), apply: () => {} },
  ],
};
const euroP = (s: GameState, c: Record<string, string | number>) => { const a = s.acts[String(c.act)]; return clamp(0.2 + (a?.fame ?? 20) / 200 + s.player.reputation.artistic / 400, 0.15, 0.6); };
registerConseq18('ev:rh19_euro:enter', { odds: (s, c) => ({ p: euroP(s, c), why: [N('Base 20%', 'Base 20%'), N('+ fama do ato e reputação artística', '+ act fame and artistic reputation')] }),
  later: [{ in: [1, 2], p: (s, c) => euroP(s, c), tone: 'mixed', hint: N('Uma noite decide: Europa ou "zero pontos".', 'One night decides: Europe or "nul points".'),
    fx: (f) => { f.fame(6).fans(8).cash(2500, 'Eurovisão: discos pela Europa', 'sales'); return outcome(f, 'eurovision', T(f, '{a} venceu a Eurovisão: o single toca de Lisboa a Helsinque.', '{a} won Eurovision: the single plays from Lisbon to Helsinki.'), 'good'); },
    miss: (f) => { f.mood('morale', -6).fame(1); return outcome(f, 'eurovision', T(f, '{a} terminou lá embaixo no placar; a apresentação virou meme — e a canção vendeu um pouco mesmo assim.', '{a} finished near the bottom; the performance became a joke — and the song sold a bit anyway.'), 'mixed'); } }] });
registerConseq18('ev:rh19_euro:song', { later: [{ in: [2, 6], p: 0.5, tone: 'good', hint: N('Canção na Europa, crédito no selo.', 'A song in Europe, credit at the label.'),
  fx: (f) => { f.cash(1200, 'Edição: canção da Eurovisão', 'publishing'); return outcome(f, 'eurovision', N('A canção cedida foi gravada em quatro línguas: a edição rende.', 'The song you gave away was recorded in four languages: publishing pays.'), 'good'); } }] });
registerConseq18('ev:rh19_euro:skip', { later: [{ in: [2, 6], p: 0.3, tone: 'mixed', hint: N('A Europa assiste sem você.', 'Europe watches without you.'),
  fx: (f) => { f.momentum(-2); return outcome(f, 'eurovision', N('Um ato de outro selo levou a vaga e virou nome conhecido na Europa.', 'An act from another label took the slot and became a household name in Europe.'), 'mixed'); } }] });

// ---------------------------------------------------------------- 2. Rádio pirata (1964) e a Lei de 1967
const pirate: EventDef = {
  id: 'rh19_pirate', cat: 'market', tone: 'neutral', tags: ['realhist19'], cooldown: 999, forcedOnly: true,
  title: N('Rádios piratas no mar', 'Pirate radio at sea'),
  text: N('Navios ancorados fora das águas territoriais tocam discos o dia inteiro — a rádio estatal mal toca discos. Os piratas pedem seus lançamentos (e anúncios). É legal… por enquanto.', 'Ships anchored outside territorial waters play records all day — the state broadcaster barely plays any. The pirates want your releases (and ads). It is legal… for now.'),
  options: [
    { id: 'feed', label: N('Abastecer os piratas', 'Supply the pirates'), hint: N('Alcance enorme; a lei pode mudar.', 'Huge reach; the law may change.'), apply: (s) => { for (const a of mine(s)) a.fans.casual += Math.round(200 + a.fame * 20); } },
    { id: 'ship', label: N('Comprar horário (anúncios no navio)', 'Buy airtime (ads on the ship)'), hint: N('Custo agora; holofote total.', 'Cost now; full spotlight.'), apply: (s) => { pay(s, 'ship', 2000, 'marketing', 'Anúncios na rádio pirata'); for (const a of mine(s)) a.momentum = clamp(a.momentum + 6, -100, 100); } },
    { id: 'state', label: N('Ficar com a rádio oficial', 'Stick with the official broadcaster'), hint: N('Pouco alcance; ficha limpa.', 'Little reach; a clean record.'), apply: () => {} },
  ],
};
const lawIn = (s: GameState) => s.year > 1967 || (s.year === 1967 && s.month >= 7);
for (const opt of ['feed', 'ship'] as const) registerConseq18(`ev:rh19_pirate:${opt}`, { later: [{ in: [12, 40], p: 0.85, tone: 'mixed', hint: N('Legal hoje; amanhã, quem sabe.', 'Legal today; tomorrow, who knows.'),
  when: (s) => lawIn(s),
  fx: (f) => {
    f.rep('institutional', opt === 'ship' ? -4 : -2).cash(opt === 'ship' ? -1500 : -600, 'Lei das rádios do mar: multa e advogados', 'legal').fans(opt === 'feed' ? 3 : 2);
    return outcome(f, 'pirate', N('A lei das rádios do mar pegou o selo: multa e advogados. Mas os DJs piratas foram para a rádio oficial — e levaram os seus discos junto.', 'The sea-radio law caught the label: a fine and lawyers. But the pirate DJs moved to the official station — and took your records with them.'), 'mixed');
  },
  miss: (f) => { f.fans(4); return outcome(f, 'pirate', N('Os piratas tocaram seus discos sem parar e ninguém veio cobrar: a juventude conhece seu catálogo de cor.', 'The pirates played your records nonstop and nobody came to collect: the young know your catalog by heart.'), 'good'); } }] });
registerConseq18('ev:rh19_pirate:state', { later: [{ in: [6, 18], p: 0.6, tone: 'mixed', hint: N('Ficha limpa, alcance curto.', 'A clean record, short reach.'),
  fx: (f) => { f.rep('institutional', 2).momentum(-3); return outcome(f, 'pirate', N('Ficha limpa quando a lei chegou — mas uma geração cresceu ouvindo os discos dos rivais no mar.', 'A clean record when the law came — but a generation grew up hearing rivals\' records from the sea.'), 'mixed'); } }] });

// ---------------------------------------------------------------- 3. Festival gratuito (1969+)
const fest: EventDef = {
  id: 'rh19_fest', cat: 'stage', tone: 'neutral', tags: ['realhist19'], cooldown: 36, weight: 0.4,
  find: (s, r) => {
    if (s.year < 1969 || s.year > 1979 || !r.chance(0.08)) return null;
    const a = topMine(s, (x) => x.fame >= 25 && ['rock', 'blues_jazz', 'country_folk'].includes(familyOf(x.genre)));
    return a ? { act: a.id } : null;
  },
  title: N('Festival gratuito: {act} no palco?', 'Free festival: {act} on the bill?'),
  text: N('Promotores querem um festival gratuito em uma semana, num autódromo fora da cidade: centenas de milhares de pessoas, palco baixo, quase nenhuma estrutura. Querem {act} no fim da noite. Quem cuida da segurança?', 'Promoters want a free festival within a week at a speedway out of town: hundreds of thousands of people, a low stage, almost no infrastructure. They want {act} to close the night. Who handles security?'),
  options: [
    { id: 'pro', label: N('Tocar, pagando segurança e médicos profissionais', 'Play, paying professional security and medics'), hint: N('Custo alto agora; o dia tende a acabar bem.', 'High cost now; the day should end well.'), apply: (s) => pay(s, 'fest', 3000, 'live', 'Festival gratuito: segurança e médicos') },
    { id: 'cheap', label: N('Tocar e deixar a segurança com voluntários', 'Play and leave security to volunteers'), hint: N('Nada agora; multidão sem controle.', 'Nothing now; an uncontrolled crowd.'), apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (a) a.fans.casual += Math.round(300 + a.fame * 30); } },
    { id: 'decline', label: N('Recusar: sem estrutura, sem show', 'Decline: no infrastructure, no show'), hint: N('Nada agora; pode parecer medo.', 'Nothing now; it may look like fear.'), apply: () => {} },
  ],
};
registerConseq18('ev:rh19_fest:pro', { later: [{ in: [1, 2], p: 0.8, tone: 'good', hint: N('Estrutura paga costuma salvar o dia.', 'Paid infrastructure usually saves the day.'),
  fx: (f) => { f.fans(6).rep('institutional', 2); return outcome(f, 'freefest', T(f, 'O festival foi enorme e terminou em paz; a imprensa elogiou a organização do show de {a}.', 'The festival was huge and ended peacefully; the press praised the organisation of {a}\'s set.'), 'good'); },
  miss: (f) => { f.fans(3); return outcome(f, 'freefest', T(f, 'Tumulto na entrada, mas os médicos contratados resolveram; {a} tocou até o fim.', 'A scuffle at the gate, but the hired medics handled it; {a} played to the end.'), 'mixed'); } }] });
registerConseq18('ev:rh19_fest:cheap', { later: [{ in: [1, 2], p: 0.55, tone: 'bad', hint: N('Multidão sem estrutura é uma aposta com vidas.', 'A crowd without infrastructure is a gamble with lives.'),
  fx: (f) => {
    rh19(f.s).fest = f.s.week;
    f.fame(-3).rep('institutional', -5).mood('stress', 15);
    const x = T(f, 'O festival saiu do controle: brigas perto do palco e um espectador gravemente ferido (o nome não foi divulgado). A imprensa culpa a organização — e o show de {a}.', 'The festival spun out of control: fights near the stage and one spectator badly hurt (the name was not released). The press blames the organisers — and {a}\'s set.');
    if (f.act) scandal(f.s, f.act.id, 'violence', 30, x, { text: x });
    emitFact(f.s, { kind: 'freefest_incident', actors: [f.act?.id ?? 'player'], severity: 50, visibility: 'public', tags: ['realhist19', 'festival', 'safety'], src: 'realhist19', text: x });
    return outcome(f, 'freefest', x, 'bad');
  },
  miss: (f) => { f.fans(5); return outcome(f, 'freefest', T(f, 'Por sorte, o festival improvisado terminou sem feridos — e {a} virou lenda da contracultura.', 'Luckily the makeshift festival ended with no one hurt — and {a} became a counterculture legend.'), 'mixed'); } }] });
registerConseq18('ev:rh19_fest:decline', { later: [{ in: [1, 3], p: 0.5, tone: 'mixed', hint: N('Recusar pode parecer medo — ou juízo.', 'Declining may look like fear — or sense.'),
  fx: (f) => { f.rep('institutional', 2); return outcome(f, 'freefest', T(f, 'O festival terminou em tumulto; a imprensa notou que {a} recusou "por falta de estrutura".', 'The festival ended in chaos; the press noted {a} declined "for lack of infrastructure".'), 'good'); } }] });
onFact('freefest_incident', (s) => { for (const a of mine(s)) for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.stress = clamp(p.stress + 5, 0, 100); } }, 'realhist19:fest');
registerAdvisorTip('realhist19', (s) => {
  const w = rh19(s).fest;
  if (w === undefined || s.week - w > 104) return [];
  return [{ id: 'rh19_safety', level: 'warn', cat: 'people', text: l('Depois do festival: só aceite shows grandes com segurança e médicos profissionais.', 'After the festival: only take big shows with professional security and medics.'), why: [l('A imprensa e as prefeituras lembram do tumulto por dois anos.', 'The press and city halls remember the chaos for two years.')] }];
});

// ---------------------------------------------------------------- 4. MTV e a barreira de cor (1983)
const mtv: EventDef = {
  id: 'rh19_mtv', cat: 'market', tone: 'neutral', tags: ['realhist19'], cooldown: 999, forcedOnly: true,
  title: N('A ClipNet e a barreira de cor', 'ClipNet and the colour barrier'),
  text: N('A ClipNet, a rede de clipes, quase não exibe artistas de R&B, soul e rap: diz que o formato é "rock". Seus clipes dependem dela. Seus artistas negros perguntam o que o selo vai fazer.', 'ClipNet, the music video network, barely airs R&B, soul and rap artists: it says its format is "rock". Your videos depend on it. Your Black artists ask what the label will do.'),
  options: [
    { id: 'pressure', label: N('Ameaçar retirar todos os clipes do selo', 'Threaten to pull all the label\'s videos'), hint: N('Aposta: a rede cede ou corta você por meses.', 'A gamble: the network gives in or cuts you for months.'), apply: () => {} },
    { id: 'alt', label: N('Investir em programas e TVs da comunidade negra', 'Invest in Black community video shows and TV'), hint: N('Custo agora; público fiel.', 'Cost now; a loyal audience.'), apply: (s) => pay(s, 'mtvalt', 1800, 'marketing', 'Clipes em programas da comunidade') },
    { id: 'comply', label: N('Mandar só os clipes "de formato rock"', 'Send only "rock-format" videos'), hint: N('Nada agora; seus artistas vão lembrar.', 'Nothing now; your artists will remember.'), apply: () => {} },
  ],
};
const hasBlackActs = (s: GameState) => mine(s).some((a) => BLACK_FAM.includes(familyOf(a.genre)));
const mtvP = (s: GameState) => clamp(0.35 + s.player.reputation.commercial / 250 + (mine(s).length >= 4 ? 0.1 : 0), 0.3, 0.75);
registerConseq18('ev:rh19_mtv:pressure', { odds: (s) => ({ p: mtvP(s), why: [N('Base 35%', 'Base 35%'), N('+ reputação comercial e tamanho do elenco (a rede precisa dos seus clipes)', '+ commercial reputation and roster size (the network needs your videos)')] }),
  later: [{ in: [2, 5], p: (s) => mtvP(s), tone: 'mixed', hint: N('Ou a rede cede, ou some com seus clipes.', 'Either the network gives in, or your videos vanish.'),
    fx: (f) => {
      for (const a of f.mine) if (BLACK_FAM.includes(familyOf(a.genre))) { a.fame = clamp(a.fame + 4, 0, 100); a.momentum = clamp(a.momentum + 10, -100, 100); }
      f.rep('artistic', 3).rep('artists', 4);
      return outcome(f, 'mtv', N('A ClipNet cedeu: os clipes dos seus artistas negros entraram na programação — e outras gravadoras vieram atrás.', 'ClipNet gave in: your Black artists\' videos went into rotation — and other labels followed.'), 'good');
    },
    miss: (f) => { for (const a of f.mine) a.momentum = clamp(a.momentum - 6, -100, 100); f.rep('commercial', -2); return outcome(f, 'mtv', N('A ClipNet tirou todos os clipes do selo do ar por meses; a briga, porém, virou pauta e a barreira começou a rachar.', 'ClipNet pulled all the label\'s videos for months; the fight, though, made the news and the barrier began to crack.'), 'mixed'); } }] });
registerConseq18('ev:rh19_mtv:alt', { later: [{ in: [3, 9], p: 0.6, tone: 'good', hint: N('Público da comunidade é fiel.', 'Community audiences are loyal.'),
  fx: (f) => { for (const a of f.mine) if (BLACK_FAM.includes(familyOf(a.genre))) { a.fans.core += Math.round(150 + a.fame * 10); } f.rep('artists', 2); return outcome(f, 'mtv', N('Os programas da comunidade viraram a vitrine dos seus artistas: fãs fiéis, vendas constantes.', 'Community shows became your artists\' showcase: loyal fans, steady sales.'), 'good'); } }] });
registerConseq18('ev:rh19_mtv:comply', { later: [{ in: [2, 8], p: (s) => (hasBlackActs(s) ? 0.7 : 0.3), tone: 'bad', hint: N('Seus artistas sabem quem ficou calado.', 'Your artists know who stayed quiet.'),
  fx: (f) => { for (const a of f.mine) if (BLACK_FAM.includes(familyOf(a.genre))) { a.trust = clamp(a.trust - 8, 0, 100); } f.rep('artists', -4); return outcome(f, 'mtv', N('Seus artistas de R&B e rap souberam que o selo aceitou o veto; dois já conversam com outras gravadoras.', 'Your R&B and rap artists learned the label accepted the ban; two are already talking to other labels.'), 'bad'); } }] });

// ---------------------------------------------------------------- marcos (world4) que abrem os cartões
const M = (m: Milestone) => { if (!MILESTONES.some((x) => x.id === m.id)) MILESTONES.push(m); };
M({ id: 'rh19_eurovision', year: 1956, month: 4, world: false, realRef: 'Eurovision, Lugano, 24/5/1956', event: 'rh19_euro',
  title: l('Nasce o festival europeu da canção', 'The European song contest is born'),
  text: l('Sete países, uma orquestra e a televisão ao vivo: a Europa escolhe uma canção por ano.', 'Seven countries, one orchestra and live television: Europe picks one song a year.'),
  mech: l('Todo março, um ato pop seu pode disputar a vaga (vitória = fãs pela Europa).', 'Every March, one of your pop acts can compete for the slot (victory = fans across Europe).'),
  ctx: (s) => { const a = topMine(s); return a ? { act: a.id } : null; } });
M({ id: 'rh19_pirate', year: 1964, month: 2, realRef: 'Radio Caroline, 1964', event: 'rh19_pirate',
  title: l('Rádios piratas no mar', 'Pirate radio at sea'),
  text: l('Navios fora das águas territoriais tocam discos o dia inteiro e roubam a juventude da rádio oficial.', 'Ships outside territorial waters play records all day and steal the young audience from official radio.'),
  mech: l('Escolha: abastecer os piratas (alcance) ou ficar com a rádio oficial (ficha limpa). Uma lei pode vir.', 'Choose: supply the pirates (reach) or stick with official radio (a clean record). A law may come.'),
  ctx: (s) => (mine(s).length ? {} : null) });
M({ id: 'rh19_moa', year: 1967, month: 7, realRef: 'Marine Broadcasting Offences Act, 15/8/1967',
  title: l('A lei das rádios do mar', 'The sea-radio law'),
  text: l('Abastecer ou anunciar nas rádios piratas vira crime; semanas depois, a rádio oficial lança uma estação pop e contrata os DJs piratas.', 'Supplying or advertising on pirate stations becomes a crime; weeks later, official radio launches a pop station and hires the pirate DJs.'),
  mech: l('Quem abasteceu os piratas pode ser multado (eco); a rádio oficial passa a tocar pop.', 'Those who supplied the pirates may be fined (echo); official radio starts playing pop.') });
M({ id: 'rh19_freefest', year: 1969, month: 11, realRef: 'Altamont, 6/12/1969', title: l('O festival gratuito que deu errado', 'The free festival that went wrong'),
  text: l('Um festival gratuito montado às pressas reúne uma multidão enorme sem estrutura; a violência daquele dia encerra simbolicamente o sonho dos festivais de paz e amor.', 'A hastily organised free festival draws a huge crowd with no infrastructure; the violence that day symbolically ends the peace-and-love festival dream.'),
  mech: l('Convites para festivais gratuitos (1969–79) pedem uma escolha de segurança.', 'Free-festival invitations (1969–79) ask for a security choice.') });
M({ id: 'rh19_mtv', year: 1983, month: 1, tech: 'clipnet', realRef: 'MTV, 1981–83', event: 'rh19_mtv',
  title: l('A barreira de cor da rede de clipes', 'The video network\'s colour barrier'),
  text: l('A rede de clipes diz que seu formato é "rock" e quase não exibe artistas negros. Gravadoras e artistas começam a pressionar.', 'The video network says its format is "rock" and barely airs Black artists. Labels and artists start to push.'),
  mech: l('Escolha como o selo reage; o resultado aparece no cartão "A história real".', 'Choose how the label reacts; the outcome shows on the "Real history" card.'),
  ctx: (s) => (mine(s).length && hasTech(s, 'clipnet') ? {} : null) });

deferEvents<EventDef>([euro, pirate, fest, mtv]);
export const RH_EVENTS19 = ['rh19_euro', 'rh19_pirate', 'rh19_fest', 'rh19_mtv'];
