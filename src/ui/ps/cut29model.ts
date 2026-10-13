// Rodada 29 (cenas) — MAIS CENAS ANIMADAS no tocador do cut27 (mesma fila, mesmo orçamento de atenção do story28,
// mesmas preferências "todas / só importantes / desligadas", mesmas regras "uma vez") para os grandes momentos que
// ainda passavam sem cena: a primeira assinatura, a primeira sessão de estúdio, o fim e a volta de uma banda, quem
// entra na formação, o rival que leva o seu artista (e você levando o de outro), promessa cumprida e quebrada (r28 F5),
// processo e sentença, pirataria e jabá, disco de ouro e de platina, headline de festival, a turnê que cruza a
// fronteira, a sede nova, a aposentadoria, a venda da empresa e a compra de um selo, e cada virada de tecnologia
// (rádio, LP, TV, cassete, rede de clipes, CD, internet, streaming, vídeo curto).
// Módulo PURO (sem DOM), só com `import type` do cut27model (sem ciclo em tempo de execução): o cut27model espalha
// CUT29 no catálogo e chama cutOfMemory29 / cutOfFact29 / onceKey29 / figs29 / probes29. As escolhas mexem no jogo
// pelos sistemas de sempre (caixa pelo livro-razão `post`, reputação, confiança, momento, moral, cansaço, fãs, calor
// da polícia) e o "cara ou coroa" sai do hash da cena (nunca do s.rng).
// Também mora aqui o TEXTO das cenas: variantes de falas (pt/en) para as novas e as antigas, com os objetos reais da
// época ({o} o disco/a fita/o CD/o arquivo, {m} a rádio/a TV/a rede de clipes/o streaming, {c} cidade).

import { TECHS } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import type { Fact } from '../../sim/facts17';
import { settleLawsuit } from '../../sim/business';
import { a3Of, addHeat } from '../../sim/sys/crime17';
import type { Act, GameState } from '../../sim/types';
import { fmtL, money, post } from '../../sim/util';
import type { Hour29, Stage29 } from '../pixel/cenas29';
import type { ArtModel27, Fig27, SceneKind27 } from './art27';
import type { Choice27, CutData27, CutDef27 } from './cut27model';

export type CutKey29 = 'sign1' | 'studio1' | 'split' | 'reunion' | 'join' | 'poach' | 'steal' | 'vow_kept' | 'vow_broken' | 'court' | 'verdict'
  | 'bootleg' | 'payola' | 'gold' | 'plat' | 'headline' | 'leg' | 'hq' | 'retire' | 'sale' | 'acq' | 'tech';
export const KEYS29: CutKey29[] = ['sign1', 'studio1', 'split', 'reunion', 'join', 'poach', 'steal', 'vow_kept', 'vow_broken', 'court', 'verdict', 'bootleg', 'payola', 'gold', 'plat', 'headline', 'leg', 'hq', 'retire', 'sale', 'acq', 'tech'];
export const isKey29 = (k: string): k is CutKey29 => (KEYS29 as string[]).includes(k);

// ---------------------------------------------------------------- utilidades de efeito

const cl = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const actOf = (s: GameState, d: CutData27): Act | undefined => (d.actId ? s.acts[d.actId] : undefined);
function members(s: GameState, d: CutData27, f: (p: GameState['persons'][string]) => void): void {
  for (const id of actOf(s, d)?.members ?? []) { const p = s.persons[id]; if (p?.alive && !p.isPlayer) f(p); }
}
const rep = (s: GameState, k: keyof GameState['player']['reputation'], d: number) => { s.player.reputation[k] = cl(s.player.reputation[k] + d); };
const mom = (s: GameState, d: CutData27, v: number) => { const a = actOf(s, d); if (a) a.momentum = cl(a.momentum + v); };
const trust = (s: GameState, d: CutData27, v: number) => { const a = actOf(s, d); if (a) a.trust = cl(a.trust + v); };
const pay = (s: GameState, d: CutData27, id: string, dollars: number, cat: string, memo: string): number => { const v = money(s, dollars); post(s, `cut29:${d.ref}:${id}`, -v, cat, memo); return v; };
const $ = (v: number) => `$${Math.round(v / 100).toLocaleString('en-US')}`;
/** "Cara ou coroa" determinístico pela cena (hash FNV do id; não mexe em nenhum fluxo do Rng). */
export function coin29(ref: string, p = 0.5): boolean { return hash29(ref) % 1000 / 1000 < p; }
export function hash29(ref: string): number { let h = 2166136261; for (let i = 0; i < ref.length; i++) { h ^= ref.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const Ch = (id: string, label: L, hint: L, apply: Choice27['apply']): Choice27 => ({ id, label, hint, apply });
const D = (key: CutKey29, tier: 'major' | 'minor', scene: SceneKind27, prio: number, fx: CutDef27['fx'], title: L, beats: L[], choices: Choice27[], vars: L[][] = []): CutDef27 =>
  ({ key: key as CutDef27['key'], tier, scene, prio, ms: 1800 + beats.length * 2600, fx, title, beats, choices, vars });

// ---------------------------------------------------------------- catálogo

export const CUT29: Record<CutKey29, CutDef27> = {
  sign1: D('sign1', 'major', 'signing', 78, ['flash'], l('A primeira assinatura', 'The first signing'),
    [l('Uma mesa pequena. Um contrato de três páginas.', 'A small desk. A three-page contract.'), l('{a} assina com {b}. O primeiro nome do elenco.', '{a} signs with {b}. The first name on the roster.'), l('Como começar essa história?', 'How do you start this story?')],
    [
      Ch('photo', l('Foto oficial na porta', 'Official photo at the door'), l('custa US$ 400 · +3 momento, +1 reputação comercial', 'costs US$ 400 · +3 momentum, +1 commercial reputation'), (s, d) => { const v = pay(s, d, 'photo', 400, 'marketing', 'Foto da 1ª assinatura'); mom(s, d, 3); rep(s, 'commercial', 1); return fmtL(l('O fotógrafo bate três chapas ({v}). Uma vai para a parede.', 'The photographer takes three shots ({v}). One goes on the wall.'), { v: $(v) }); }),
      Ch('talk', l('Conversar sobre o som', 'Talk about the sound'), l('+6 confiança, +1 reputação com artistas', '+6 trust, +1 reputation with artists'), (s, d) => { trust(s, d, 6); rep(s, 'artists', 1); return l('Duas horas falando de discos que vocês amam. O aperto de mão demora.', 'Two hours talking about records you both love. The handshake lingers.'); }),
      Ch('toast', l('Brinde com o que tiver', 'Toast with whatever is around'), l('+4 moral', '+4 morale'), (s, d) => { members(s, d, (p) => { p.morale = cl(p.morale + 4); }); return l('Café requentado em copos de geleia. Ninguém esquece.', 'Reheated coffee in jam jars. Nobody forgets.'); }),
    ],
    [[l('A caneta falha na primeira linha.', 'The pen skips on the first line.'), l('{a} ri, sopra a ponta e assina com {b}.', '{a} laughs, blows on the nib and signs with {b}.'), l('O selo agora tem um artista. E agora?', 'The label now has an artist. Now what?')]]),
  studio1: D('studio1', 'minor', 'studio', 58, ['spot'], l('A primeira sessão', 'The first session'),
    [l('A luz vermelha acende pela primeira vez.', 'The red light comes on for the first time.'), l('{a} grava {o} no estúdio de {b}.', '{a} cuts {o} in the {b} studio.'), l('O técnico olha para você. Mais um take?', 'The engineer looks at you. One more take?')],
    [
      Ch('keep', l('Gravar ao vivo, sem retoques', 'Cut it live, no fixes'), l('+1 reputação artística, +3 momento', '+1 artistic reputation, +3 momentum'), (s, d) => { rep(s, 'artistic', 1); mom(s, d, 3); return l('Sai com chiado e alma. O técnico guarda a fita.', 'It comes out with hiss and soul. The engineer keeps the tape.'); }),
      Ch('polish', l('Mais duas horas de mixagem', 'Two more hours of mixing'), l('custa US$ 300 · +1 reputação comercial', 'costs US$ 300 · +1 commercial reputation'), (s, d) => { const v = pay(s, d, 'polish', 300, 'recording', 'Mixagem extra'); rep(s, 'commercial', 1); return fmtL(l('Tudo no lugar ({v}). Soa como rádio.', 'Everything in place ({v}). It sounds like radio.'), { v: $(v) }); }),
      Ch('rest', l('Pizza e cama', 'Pizza and bed'), l('-6 cansaço', '-6 fatigue'), (s, d) => { members(s, d, (p) => { p.fatigue = cl(p.fatigue - 6); }); return l('Amanhã tem mais. A banda dorme no sofá da técnica.', 'More tomorrow. The band sleeps on the control-room couch.'); }),
    ],
    [[l('Cabos por todo lado. O microfone ainda cheira a novo.', 'Cables everywhere. The microphone still smells new.'), l('Primeira contagem: "um, dois, três, quatro". {a} entra.', 'First count-in: "one, two, three, four". {a} comes in.'), l('Fica esse take?', 'Keep that take?')]]),
  split: D('split', 'major', 'shows', 87, ['candles'], l('O fim da banda', 'The band breaks up'),
    [l('A sala de ensaio fica em silêncio.', 'The rehearsal room goes quiet.'), l('{t}', '{t}'), l('O que {b} faz com o que sobrou?', 'What does {b} do with what is left?')],
    [
      Ch('box', l('Caixa de despedida (coletânea)', 'Farewell box set'), l('custa US$ 1.500 · +8% fãs fiéis, +1 reputação comercial', 'costs US$ 1,500 · +8% core fans, +1 commercial reputation'), (s, d) => { const v = pay(s, d, 'box', 1500, 'marketing', 'Caixa de despedida'); const a = actOf(s, d); if (a) a.fans.core = Math.round(a.fans.core * 1.08); rep(s, 'commercial', 1); return fmtL(l('Encarte com fotos inéditas ({v}). Os fãs fazem fila.', 'Liner notes with unseen photos ({v}). The fans queue up.'), { v: $(v) }); }),
      Ch('door', l('Deixar a porta aberta', 'Leave the door open'), l('+6 confiança, +1,5 reputação com artistas', '+6 trust, +1.5 reputation with artists'), (s, d) => { trust(s, d, 6); rep(s, 'artists', 1.5); return l('"Quando quiserem voltar, o estúdio é de vocês."', '"Whenever you want to come back, the studio is yours."'); }),
      Ch('mediate', l('Uma última reunião', 'One last meeting'), l('arriscado: +6 momento ou -2 reputação com artistas', 'risky: +6 momentum or -2 reputation with artists'), (s, d) => { if (coin29(`${d.ref}:med`, 0.35)) { mom(s, d, 6); return l('Ninguém volta atrás, mas topam um último show. Esgota.', 'Nobody takes it back, but they agree to one last show. It sells out.'); } rep(s, 'artists', -2); return l('A reunião vira gritaria. Alguém joga a cadeira.', 'The meeting turns into shouting. Someone throws a chair.'); }),
    ],
    [[l('O último acorde ainda zune no amplificador.', 'The last chord still hums in the amp.'), l('{t}', '{t}'), l('Fica o catálogo. E a lembrança.', 'The catalog remains. And the memory.')]]),
  reunion: D('reunion', 'major', 'shows', 79, ['confetti', 'spot'], l('A volta', 'The reunion'),
    [l('As luzes apagam. Um grito na plateia.', 'The lights go down. A scream in the crowd.'), l('{a} sobe ao palco junto outra vez.', '{a} takes the stage together again.'), l('Turnê ou uma noite só?', 'A tour or just one night?')],
    [
      Ch('tour', l('Turnê da volta', 'Reunion tour'), l('+8 momento, +8 cansaço', '+8 momentum, +8 fatigue'), (s, d) => { mom(s, d, 8); members(s, d, (p) => { p.fatigue = cl(p.fatigue + 8); }); return l('Quarenta datas. As velhas camisetas voltam às ruas.', 'Forty dates. The old T-shirts are back on the streets.'); }),
      Ch('one', l('Uma noite só, filmada', 'One night only, filmed'), l('custa US$ 2.000 · +1,5 reputação artística, +3% fãs fiéis', 'costs US$ 2,000 · +1.5 artistic reputation, +3% core fans'), (s, d) => { const v = pay(s, d, 'film', 2000, 'live_costs', 'Filmagem da volta'); rep(s, 'artistic', 1.5); const a = actOf(s, d); if (a) a.fans.core = Math.round(a.fans.core * 1.03); return fmtL(l('Seis câmeras ({v}). Vira o show definitivo.', 'Six cameras ({v}). It becomes the definitive show.'), { v: $(v) }); }),
    ],
    [[l('Ninguém acreditava. O cartaz diz que é verdade.', 'Nobody believed it. The poster says it is true.'), l('{a} toca a primeira música como se fosse ontem.', '{a} plays the first song like it was yesterday.'), l('E depois desta noite?', 'And after tonight?')]]),
  join: D('join', 'minor', 'studio', 52, [], l('Alguém novo na formação', 'Someone new in the lineup'),
    [l('Um case novo encostado na parede.', 'A new case leaning on the wall.'), l('{t}', '{t}'), l('Como receber?', 'How do you welcome them?')],
    [
      Ch('jam', l('Jam de boas-vindas', 'Welcome jam'), l('+4 moral, +2 momento', '+4 morale, +2 momentum'), (s, d) => { members(s, d, (p) => { p.morale = cl(p.morale + 4); }); mom(s, d, 2); return l('Três horas tocando sem parar. Já parece da família.', 'Three hours of nonstop playing. Already feels like family.'); }),
      Ch('photo', l('Foto nova para a imprensa', 'New press photo'), l('custa US$ 300 · +1 fama', 'costs US$ 300 · +1 fame'), (s, d) => { const v = pay(s, d, 'photo', 300, 'marketing', 'Foto da formação'); const a = actOf(s, d); if (a) a.fame = cl(a.fame + 1); return fmtL(l('A formação nova na capa do caderno de cultura ({v}).', 'The new lineup on the arts section cover ({v}).'), { v: $(v) }); }),
    ],
    [[l('O novo integrante afina o instrumento em silêncio.', 'The new member tunes up in silence.'), l('{t}', '{t}'), l('A primeira música junto. E aí?', 'The first song together. So?')]]),
  poach: D('poach', 'major', 'night', 81, [], l('Levaram o seu artista', 'They took your artist'),
    [l('Uma limusine para na sua calçada.', 'A limousine pulls up at your curb.'), l('{t}', '{t}'), l('Deixa ir ou briga?', 'Let it go or fight?')],
    [
      Ch('counter', l('Contraproposta pública', 'Public counteroffer'), l('arriscado: +2 reputação comercial ou custa US$ 3.000', 'risky: +2 commercial reputation or costs US$ 3,000'), (s, d) => { if (coin29(`${d.ref}:ct`, 0.45)) { rep(s, 'commercial', 2); return l('O mercado vê que você não se vende barato.', 'The industry sees you do not come cheap.'); } const v = pay(s, d, 'counter', 3000, 'legal', 'Contraproposta perdida'); return fmtL(l('Você paga advogados e anúncios ({v}). Ele vai mesmo assim.', 'You pay lawyers and ads ({v}). The artist leaves anyway.'), { v: $(v) }); }),
      Ch('grace', l('Desejar boa sorte', 'Wish them luck'), l('+2 reputação com artistas', '+2 reputation with artists'), (s) => { rep(s, 'artists', 2); return l('Você manda flores para a gravadora rival. O meio comenta a elegância.', 'You send flowers to the rival label. The industry notes the class.'); }),
      Ch('roster', l('Fechar com quem ficou', 'Close ranks with who stayed'), l('+1 reputação institucional, +3 confiança no elenco', '+1 institutional reputation, +3 trust across the roster'), (s) => { rep(s, 'institutional', 1); for (const a of Object.values(s.acts)) if (a.owner === 'player') a.trust = cl(a.trust + 3); return l('Reunião com o elenco inteiro: "aqui ninguém é moeda de troca".', 'A meeting with the whole roster: "nobody here is a bargaining chip".'); }),
    ],
    [[l('O telefone toca de madrugada. É o empresário.', 'The phone rings at dawn. It is the manager.'), l('{t}', '{t}'), l('A porta do carro do rival continua aberta.', 'The rival\'s car door is still open.')]]),
  steal: D('steal', 'minor', 'night', 62, ['flash'], l('A manobra de bastidores', 'The backroom move'),
    [l('Jantar à luz de velas. A pasta em cima da mesa.', 'Candlelit dinner. The briefcase on the table.'), l('{t}', '{t}'), l('Como entrar com o pé direito?', 'How do you start off right?')],
    [
      Ch('welcome', l('Boas-vindas discretas', 'A quiet welcome'), l('+5 confiança', '+5 trust'), (s, d) => { trust(s, d, 5); return l('Sem alarde. A transição é tranquila.', 'No fanfare. A smooth transition.'); }),
      Ch('gloat', l('Anunciar com estardalhaço', 'Announce it loudly'), l('+4 momento, -1,5 reputação institucional', '+4 momentum, -1.5 institutional reputation'), (s, d) => { mom(s, d, 4); rep(s, 'institutional', -1.5); return l('Manchete de página inteira. O selo rival jura vingança.', 'A full-page headline. The rival label swears revenge.'); }),
    ]),
  vow_kept: D('vow_kept', 'minor', 'team', 48, ['gold'], l('Promessa cumprida', 'Promise kept'),
    [l('A data no calendário chega.', 'The date on the calendar arrives.'), l('{t}', '{t}'), l('Palavra dada, palavra cumprida.', 'A word given, a word kept.')],
    [
      Ch('remind', l('Lembrar em voz alta', 'Point it out'), l('+1,5 reputação com artistas', '+1.5 reputation with artists'), (s) => { rep(s, 'artists', 1.5); return l('O elenco inteiro fica sabendo. Contrato com {b} vale.', 'The whole roster hears about it. A deal with the label is a deal.'); }),
      Ch('quiet', l('Deixar falar por si', 'Let it speak for itself'), l('+5 confiança', '+5 trust'), (s, d) => { trust(s, d, 5); return l('Ninguém comenta. Mas a confiança cresce.', 'Nobody mentions it. But the trust grows.'); }),
    ],
    [[l('O cheque chega no dia certo.', 'The check arrives on the right day.'), l('{t}', '{t}')]]),
  vow_broken: D('vow_broken', 'major', 'team', 76, [], l('Promessa quebrada', 'Promise broken'),
    [l('A data passou. Ninguém ligou.', 'The date passed. Nobody called.'), l('{t}', '{t}'), l('Como encarar?', 'How do you face it?')],
    [
      Ch('apology', l('Pedir desculpas e compensar', 'Apologize and make it up'), l('custa US$ 1.200 · +6 confiança', 'costs US$ 1,200 · +6 trust'), (s, d) => { const v = pay(s, d, 'apology', 1200, 'artists', 'Compensação de promessa'); trust(s, d, 6); return fmtL(l('Uma carta à mão e um cheque ({v}). Não apaga, mas ajuda.', 'A handwritten letter and a check ({v}). It does not erase it, but it helps.'), { v: $(v) }); }),
      Ch('excuse', l('Culpar o mercado', 'Blame the market'), l('-4 confiança, -1 reputação com artistas', '-4 trust, -1 reputation with artists'), (s, d) => { trust(s, d, -4); rep(s, 'artists', -1); return l('"Os tempos estão difíceis." Ninguém acredita.', '"Times are hard." Nobody believes it.'); }),
      Ch('new', l('Nova promessa, com data', 'A new promise, with a date'), l('arriscado: +4 confiança ou -6 confiança', 'risky: +4 trust or -6 trust'), (s, d) => { if (coin29(`${d.ref}:nv`, 0.5)) { trust(s, d, 4); return l('Desta vez, por escrito. Aceitam a nova data.', 'This time in writing. They accept the new date.'); } trust(s, d, -6); return l('"De novo?" A porta bate.', '"Again?" The door slams.'); }),
    ],
    [[l('O contrato dizia uma coisa. O caixa disse outra.', 'The contract said one thing. The books said another.'), l('{t}', '{t}'), l('O artista espera uma resposta.', 'The artist waits for an answer.')]]),
  court: D('court', 'major', 'rights', 77, [], l('O processo', 'The lawsuit'),
    [l('Um oficial de justiça entrega o envelope.', 'A process server hands over the envelope.'), l('{t}', '{t}'), l('Acordo ou briga no tribunal?', 'Settle or fight in court?')],
    [
      // o acordo é o MESMO do painel de processos (settleLawsuit): paga a parte do pedido e encerra o caso
      Ch('settle', l('Propor acordo', 'Offer a settlement'), l('encerra o processo: paga ~45% do pedido (como no painel de processos)', 'closes the case: pays ~45% of the claim (as in the lawsuits panel)'), (s, d) => {
        const suit = suit29(s, d);
        if (!suit) return l('O processo já foi encerrado.', 'The case is already closed.');
        const why = settleLawsuit(s, suit.id);
        return why ?? l('Assinado no corredor. Sem manchete, sem audiência.', 'Signed in the hallway. No headline, no hearing.');
      }),
      Ch('fight', l('Contratar o melhor advogado', 'Hire the best lawyer'), l('custa US$ 1.500 · +8 pontos de chance no processo', 'costs US$ 1,500 · +8 points of odds in the case'), (s, d) => {
        const v = pay(s, d, 'fight', 1500, 'legal', 'Honorários do processo'); const suit = suit29(s, d); if (suit) suit.odds = Math.min(0.95, suit.odds + 0.08);
        return fmtL(l('O escritório mais caro da cidade assume o caso ({v}).', 'The priciest firm in town takes the case ({v}).'), { v: $(v) });
      }),
      Ch('wait', l('Esperar a audiência', 'Wait for the hearing'), l('nada muda agora', 'nothing changes now'), () => l('O envelope vai para a gaveta. O prazo corre.', 'The envelope goes in the drawer. The clock ticks.')),
    ],
    [[l('O carimbo do fórum na primeira página.', 'The court stamp on the first page.'), l('{t}', '{t}'), l('Os advogados do outro lado já estão sorrindo.', 'The lawyers on the other side are already smiling.')]]),
  // o recurso de uma derrota é a cena interativa do tribunal (scenes/court 'appeal'): aqui só a reação ao martelo
  verdict: D('verdict', 'major', 'rights', 80, ['stamp'], l('A sentença', 'The verdict'),
    [l('"Todos de pé."', '"All rise."'), l('{t}', '{t}'), l('O martelo bate. E agora?', 'The gavel falls. Now what?')],
    [
      Ch('statement', l('Nota sóbria à imprensa', 'A sober press statement'), l('+1 reputação institucional', '+1 institutional reputation'), (s) => { rep(s, 'institutional', 1); return l('Três linhas, sem adjetivos. O mercado respeita.', 'Three lines, no adjectives. The industry respects it.'); }),
      Ch('team', l('Jantar com o jurídico', 'Dinner with the legal team'), l('custa US$ 600 · +3 confiança do ato', 'costs US$ 600 · +3 act trust'), (s, d) => { const v = pay(s, d, 'team', 600, 'legal', 'Jantar do jurídico'); trust(s, d, 3); return fmtL(l('O artista vê que o selo foi até o fim por ele ({v}).', 'The artist sees the label went all the way for them ({v}).'), { v: $(v) }); }),
    ],
    [[l('A sala lotada de repórteres.', 'The courtroom packed with reporters.'), l('{t}', '{t}'), l('Lá fora, os flashes esperam.', 'Outside, the flashes wait.')]]),
  bootleg: D('bootleg', 'minor', 'crime', 57, ['police'], l('Piratas na calçada', 'Bootlegs on the sidewalk'),
    [l('Um camelô vende {o} de {a} a preço de banana.', 'A street vendor sells {o} of {a} dirt cheap.'), l('{t}', '{t}'), l('O que fazer?', 'What do you do?')],
    [
      Ch('raid', l('Chamar a polícia (apreensão)', 'Call the police (raid)'), l('custa US$ 600 · +1 reputação institucional, -4 calor', 'costs US$ 600 · +1 institutional reputation, -4 heat'), (s, d) => { const v = pay(s, d, 'raid', 600, 'legal', 'Apreensão de piratas'); rep(s, 'institutional', 1); addHeat(s, 'player', a3Of(s, s.config.homeCity), -4); return fmtL(l('Caixas e caixas apreendidas ({v}). Volta tudo na semana que vem, mas fica o recado.', 'Boxes and boxes seized ({v}). It will be back next week, but the message is sent.'), { v: $(v) }); }),
      Ch('cheap', l('Lançar uma edição barata', 'Release a budget edition'), l('custa US$ 800 · +4% fãs casuais', 'costs US$ 800 · +4% casual fans'), (s, d) => { const v = pay(s, d, 'cheap', 800, 'marketing', 'Edição econômica'); const a = actOf(s, d); if (a) a.fans.casual = Math.round(a.fans.casual * 1.04); return fmtL(l('Preço de camelô, qualidade de loja ({v}).', 'Street price, store quality ({v}).'), { v: $(v) }); }),
      Ch('shrug', l('Pirata também é fã', 'Bootleggers are fans too'), l('+2% fãs casuais, -1 reputação comercial', '+2% casual fans, -1 commercial reputation'), (s, d) => { const a = actOf(s, d); if (a) a.fans.casual = Math.round(a.fans.casual * 1.02); rep(s, 'commercial', -1); return l('A música corre a cidade. O caixa, nem tanto.', 'The music travels the city. The cash, not so much.'); }),
    ],
    [[l('{o} de {a} com capa xerocada, na esquina.', '{o} of {a} with a photocopied cover, on the corner.'), l('{t}', '{t}')]]),
  payola: D('payola', 'major', 'press', 84, ['flash'], l('O jabá vem à tona', 'The payola comes out'),
    [l('ON AIR. O envelope ainda está na mesa do DJ.', 'ON AIR. The envelope is still on the DJ\'s desk.'), l('{t}', '{t}'), l('{m} quer explicações.', '{m} wants answers.')],
    [
      Ch('own', l('Assumir e encerrar o esquema', 'Own it and end the scheme'), l('+2 reputação institucional, -3 momento', '+2 institutional reputation, -3 momentum'), (s, d) => { rep(s, 'institutional', 2); mom(s, d, -3); return l('Você demite o promotor e abre os livros. Dói, mas limpa.', 'You fire the promoter and open the books. It hurts, but it cleans.'); }),
      Ch('lawyer', l('Advogado e silêncio', 'Lawyer and silence'), l('custa US$ 2.000 · -6 calor', 'costs US$ 2,000 · -6 heat'), (s, d) => { const v = pay(s, d, 'lawyer', 2000, 'legal', 'Defesa no caso do jabá'); addHeat(s, 'player', a3Of(s, s.config.homeCity), -6); return fmtL(l('"Sem comentários." O advogado cuida do resto ({v}).', '"No comment." The lawyer handles the rest ({v}).'), { v: $(v) }); }),
      Ch('deny', l('Negar tudo', 'Deny everything'), l('arriscado: nada ou -3 reputação institucional, +6 calor', 'risky: nothing or -3 institutional reputation, +6 heat'), (s, d) => { if (coin29(`${d.ref}:deny`, 0.4)) return l('A história esfria. Ninguém acha o segundo envelope.', 'The story cools. Nobody finds the second envelope.'); rep(s, 'institutional', -3); addHeat(s, 'player', a3Of(s, s.config.homeCity), 6); return l('Aparece o segundo envelope. E o terceiro.', 'The second envelope surfaces. And the third.'); }),
    ],
    [[l('O programador abre a gaveta diante das câmeras.', 'The program director opens the drawer in front of the cameras.'), l('{t}', '{t}'), l('O telefone de {b} não para.', '{b}\'s phone will not stop.')]]),
  gold: D('gold', 'minor', 'charts', 66, ['gold', 'flash'], l('Disco de ouro', 'Gold record'),
    [l('Um quadro chega embrulhado em papel pardo.', 'A frame arrives wrapped in brown paper.'), l('"{t}", de {a}: disco de ouro.', '"{t}" by {a}: certified gold.'), l('Onde pendurar?', 'Where does it hang?')],
    [
      Ch('wall', l('Na parede da recepção', 'On the lobby wall'), l('+1 reputação comercial', '+1 commercial reputation'), (s) => { rep(s, 'commercial', 1); return l('Todo visitante para na frente dele.', 'Every visitor stops in front of it.'); }),
      Ch('band', l('Dar para a banda', 'Give it to the band'), l('+5 confiança, +3 moral', '+5 trust, +3 morale'), (s, d) => { trust(s, d, 5); members(s, d, (p) => { p.morale = cl(p.morale + 3); }); return l('Vai para a sala da mãe do vocalista. Choro garantido.', 'It goes to the singer\'s mother\'s living room. Tears guaranteed.'); }),
      Ch('party', l('Festa da certificação', 'Certification party'), l('custa US$ 700 · +3 momento', 'costs US$ 700 · +3 momentum'), (s, d) => { const v = pay(s, d, 'party', 700, 'marketing', 'Festa do disco de ouro'); mom(s, d, 3); return fmtL(l('Coquetel com imprensa e lojistas ({v}).', 'Cocktails with press and retailers ({v}).'), { v: $(v) }); }),
    ],
    [[l('O carteiro pede para assinar o recibo.', 'The courier asks you to sign the receipt.'), l('Dentro: "{t}", de {a}, em ouro.', 'Inside: "{t}" by {a}, in gold.'), l('E agora?', 'Now what?')]]),
  plat: D('plat', 'major', 'charts', 74, ['gold', 'confetti'], l('Disco de platina', 'Platinum record'),
    [l('Um milhão de cópias. Ou mais.', 'A million copies. Or more.'), l('"{t}", de {a}: platina.', '"{t}" by {a}: platinum.'), l('O que fazer com o momento?', 'What do you do with the moment?')],
    [
      Ch('tour', l('Turnê da platina', 'Platinum tour'), l('+6 momento, +6 cansaço', '+6 momentum, +6 fatigue'), (s, d) => { mom(s, d, 6); members(s, d, (p) => { p.fatigue = cl(p.fatigue + 6); }); return l('Ginásios no lugar de clubes.', 'Arenas instead of clubs.'); }),
      Ch('bonus', l('Bônus para a banda', 'Bonus for the band'), l('custa US$ 3.000 · +8 confiança, +6 moral', 'costs US$ 3,000 · +8 trust, +6 morale'), (s, d) => { const v = pay(s, d, 'bonus', 3000, 'artists', 'Bônus da platina'); trust(s, d, 8); members(s, d, (p) => { p.morale = cl(p.morale + 6); }); return fmtL(l('Cheques na mesa ({v}).', 'Checks on the table ({v}).'), { v: $(v) }); }),
      Ch('press', l('Coletiva com a placa', 'Press conference with the plaque'), l('+1,5 fama, +1 reputação comercial', '+1.5 fame, +1 commercial reputation'), (s, d) => { const a = actOf(s, d); if (a) a.fame = cl(a.fame + 1.5); rep(s, 'commercial', 1); return l('A foto com a placa roda o mundo.', 'The photo with the plaque goes around the world.'); }),
    ]),
  headline: D('headline', 'major', 'festival', 73, ['fireworks'], l('Atração principal', 'Festival headliner'),
    [l('O nome mais alto do cartaz.', 'The biggest name on the poster.'), l('{t}', '{t}'), l('Último show da noite. Qual o fecho?', 'Last set of the night. How do you close?')],
    [
      Ch('pyro', l('Fogos e efeitos', 'Pyro and effects'), l('custa US$ 2.500 · +5% fãs casuais, +3 momento', 'costs US$ 2,500 · +5% casual fans, +3 momentum'), (s, d) => { const v = pay(s, d, 'pyro', 2500, 'live_costs', 'Pirotecnia do headline'); const a = actOf(s, d); if (a) a.fans.casual = Math.round(a.fans.casual * 1.05); mom(s, d, 3); return fmtL(l('Colunas de fogo no refrão ({v}).', 'Columns of fire on the chorus ({v}).'), { v: $(v) }); }),
      Ch('acoustic', l('Fechar acústico', 'Close acoustic'), l('+1,5 reputação artística', '+1.5 artistic reputation'), (s) => { rep(s, 'artistic', 1.5); return l('Cem mil pessoas em silêncio. A crítica ama.', 'A hundred thousand people in silence. The critics love it.'); }),
      Ch('guest', l('Chamar um convidado surpresa', 'Bring a surprise guest'), l('arriscado: +6 momento ou -2 momento', 'risky: +6 momentum or -2 momentum'), (s, d) => { if (coin29(`${d.ref}:g`, 0.6)) { mom(s, d, 6); return l('O convidado entra e o festival vem abaixo.', 'The guest walks on and the festival goes wild.'); } mom(s, d, -2); return l('O convidado esquece a letra. O vídeo vira piada.', 'The guest forgets the lyrics. The clip becomes a joke.'); }),
    ],
    [[l('Cem mil pulseiras coloridas.', 'A hundred thousand colored wristbands.'), l('{t}', '{t}'), l('{a} sobe por último.', '{a} goes on last.')]]),
  leg: D('leg', 'minor', 'tour', 54, [], l('A turnê cruza a fronteira', 'The tour crosses the border'),
    [l('Passaportes, carimbos, malas trocadas.', 'Passports, stamps, mixed-up bags.'), l('{a} desembarca em {c}.', '{a} lands in {c}.'), l('Primeira noite fora de casa. Como chegar?', 'First night abroad. How do you arrive?')],
    [
      Ch('local', l('Contratar um promotor local', 'Hire a local promoter'), l('custa US$ 900 · +4% fãs casuais', 'costs US$ 900 · +4% casual fans'), (s, d) => { const v = pay(s, d, 'local', 900, 'live_costs', 'Promotor local'); const a = actOf(s, d); if (a) a.fans.casual = Math.round(a.fans.casual * 1.04); return fmtL(l('Rádio local, cartazes no idioma certo ({v}).', 'Local radio, posters in the right language ({v}).'), { v: $(v) }); }),
      Ch('song', l('Aprender uma música da terra', 'Learn a local song'), l('+3 momento, +1 reputação artística', '+3 momentum, +1 artistic reputation'), (s, d) => { mom(s, d, 3); rep(s, 'artistic', 1); return l('A plateia canta junto, com sotaque e tudo.', 'The crowd sings along, accent and all.'); }),
      Ch('rest', l('Um dia de folga', 'A day off'), l('-6 cansaço', '-6 fatigue'), (s, d) => { members(s, d, (p) => { p.fatigue = cl(p.fatigue - 6); }); return l('Museu, comida de rua e cama cedo.', 'A museum, street food and an early night.'); }),
    ],
    [[l('O avião balança. Alguém reza baixinho.', 'The plane shakes. Someone prays quietly.'), l('{c}: o primeiro carimbo no passaporte de {a}.', '{c}: the first stamp in {a}\'s passport.'), l('Lá fora, outro idioma.', 'Outside, another language.')]]),
  hq: D('hq', 'minor', 'finance', 50, ['confetti'], l('A sede nova', 'The new HQ'),
    [l('Uma fita vermelha na porta.', 'A red ribbon on the door.'), l('{t}', '{t}'), l('Discurso de inauguração?', 'Opening speech?')],
    [
      Ch('staff', l('Agradecer à equipe', 'Thank the staff'), l('+1 reputação institucional, +2 moral do elenco', '+1 institutional reputation, +2 roster morale'), (s) => { rep(s, 'institutional', 1); for (const a of Object.values(s.acts)) if (a.owner === 'player') for (const id of a.members) { const p = s.persons[id]; if (p?.alive && !p.isPlayer) p.morale = cl(p.morale + 2); } return l('Nomes de todo mundo, do porteiro ao produtor.', 'Everybody\'s name, from the doorman to the producer.'); }),
      Ch('party', l('Festa aberta à cidade', 'A party open to the city'), l('custa US$ 1.200 · +1,5 reputação comercial', 'costs US$ 1,200 · +1.5 commercial reputation'), (s, d) => { const v = pay(s, d, 'party', 1200, 'marketing', 'Inauguração da sede'); rep(s, 'commercial', 1.5); return fmtL(l('A rua inteira na porta ({v}).', 'The whole street at the door ({v}).'), { v: $(v) }); }),
    ],
    [[l('O cheiro de tinta fresca.', 'The smell of fresh paint.'), l('{t}', '{t}'), l('A tesoura está na sua mão.', 'The scissors are in your hand.')]]),
  retire: D('retire', 'major', 'shows', 83, ['spot', 'candles'], l('A despedida dos palcos', 'Farewell to the stage'),
    [l('Um banquinho. Um microfone. Um foco só.', 'A stool. A microphone. A single spotlight.'), l('{t}', '{t}'), l('Como {b} se despede?', 'How does {b} say goodbye?')],
    [
      Ch('farewell', l('Show de despedida', 'Farewell show'), l('custa US$ 2.000 · +6% fãs fiéis, +1,5 reputação artística', 'costs US$ 2,000 · +6% core fans, +1.5 artistic reputation'), (s, d) => { const v = pay(s, d, 'farewell', 2000, 'live_costs', 'Show de despedida'); const a = actOf(s, d); if (a) a.fans.core = Math.round(a.fans.core * 1.06); rep(s, 'artistic', 1.5); return fmtL(l('Três horas, todas as canções ({v}). Ninguém quer ir embora.', 'Three hours, every song ({v}). Nobody wants to leave.'), { v: $(v) }); }),
      Ch('archive', l('Abrir o arquivo de fitas', 'Open the tape vault'), l('+1 reputação comercial, +2% fãs fiéis', '+1 commercial reputation, +2% core fans'), (s, d) => { rep(s, 'commercial', 1); const a = actOf(s, d); if (a) a.fans.core = Math.round(a.fans.core * 1.02); return l('Gravações inéditas para os fãs. O legado fica.', 'Unreleased recordings for the fans. The legacy stays.'); }),
      Ch('quiet', l('Sair em silêncio', 'Leave quietly'), l('+4 confiança', '+4 trust'), (s, d) => { trust(s, d, 4); return l('Sem anúncio. Uma carta à mão aos fãs.', 'No announcement. A handwritten letter to the fans.'); }),
    ],
    [[l('Isqueiros acesos na escuridão.', 'Lighters glowing in the dark.'), l('{t}', '{t}'), l('A última música.', 'The last song.')]]),
  sale: D('sale', 'major', 'finance', 96, ['candles'], l('A venda da empresa', 'Selling the company'),
    [l('A caneta pesa mais do que no primeiro contrato.', 'The pen weighs more than on the first contract.'), l('{t}', '{t}'), l('O que você leva da sala?', 'What do you take from the room?')],
    [
      Ch('speech', l('Discurso para a equipe', 'A speech for the staff'), l('+3 reputação com artistas', '+3 reputation with artists'), (s) => { rep(s, 'artists', 3); return l('"Foi uma honra." Até o contador chora.', '"It was an honour." Even the accountant cries.'); }),
      Ch('disc', l('Levar o disco nº 1 do cofre', 'Take record no. 1 from the vault'), l('+1,5 reputação artística', '+1.5 artistic reputation'), (s) => { rep(s, 'artistic', 1.5); return l('Debaixo do braço, a primeira cópia que o selo prensou.', 'Under your arm, the first copy the label ever pressed.'); }),
      Ch('door', l('Sair pela porta dos fundos', 'Leave by the back door'), l('nada muda', 'nothing changes'), () => l('A chuva lava a calçada. Outra pessoa apaga a luz.', 'The rain washes the sidewalk. Someone else turns off the light.')),
    ],
    [[l('Os advogados contam as páginas duas vezes.', 'The lawyers count the pages twice.'), l('{t}', '{t}'), l('O nome na porta vai mudar.', 'The name on the door is about to change.')]]),
  acq: D('acq', 'major', 'finance', 72, ['flash'], l('Você compra um selo', 'You buy a label'),
    [l('Na sala de reunião do outro, agora sua.', 'In the other boardroom, now yours.'), l('{t}', '{t}'), l('Primeira ordem do dia?', 'First order of business?')],
    [
      Ch('keep', l('Manter a equipe deles', 'Keep their staff'), l('+2 reputação institucional, +3 confiança no elenco', '+2 institutional reputation, +3 trust across the roster'), (s) => { rep(s, 'institutional', 2); for (const a of Object.values(s.acts)) if (a.owner === 'player') a.trust = cl(a.trust + 3); return l('Ninguém é demitido no primeiro dia. Respiram aliviados.', 'Nobody is fired on day one. A sigh of relief.'); }),
      Ch('rebrand', l('Pôr o seu nome na fachada', 'Put your name on the building'), l('custa US$ 1.500 · +2 reputação comercial, -1 com artistas', 'costs US$ 1,500 · +2 commercial reputation, -1 with artists'), (s, d) => { const v = pay(s, d, 'rebrand', 1500, 'marketing', 'Troca de fachada'); rep(s, 'commercial', 2); rep(s, 'artists', -1); return fmtL(l('Letreiro novo na mesma semana ({v}).', 'A new sign the same week ({v}).'), { v: $(v) }); }),
    ]),
  tech: D('tech', 'major', 'era', 42, ['gold'], l('Chega uma tecnologia', 'A technology arrives'),
    [l('A família se junta em volta do aparelho novo.', 'The family gathers around the new set.'), l('{y}: chega {t}.', '{y}: {t} arrives.'), l('{b} aposta em quê?', 'What does {b} bet on?')],
    [
      Ch('first', l('Ser dos primeiros', 'Be among the first'), l('custa US$ 2.000 · +2 reputação comercial', 'costs US$ 2,000 · +2 commercial reputation'), (s, d) => { const v = pay(s, d, 'first', 2000, 'equipment', 'Adoção de tecnologia'); rep(s, 'commercial', 2); return fmtL(l('Você compra os primeiros aparelhos e grava pensando neles ({v}).', 'You buy the first units and record with them in mind ({v}).'), { v: $(v) }); }),
      Ch('wait', l('Esperar baixar o preço', 'Wait for prices to drop'), l('+1 reputação institucional', '+1 institutional reputation'), (s) => { rep(s, 'institutional', 1); return l('Prudência. Os primeiros que se arrisquem.', 'Prudence. Let the early birds take the risk.'); }),
      Ch('purist', l('Manter o som de sempre', 'Keep the classic sound'), l('+1,5 reputação artística', '+1.5 artistic reputation'), (s) => { rep(s, 'artistic', 1.5); return l('"Moda passa." Os puristas aplaudem.', '"Fads pass." The purists applaud.'); }),
    ],
    [[l('O vendedor liga o aparelho na vitrine.', 'The salesman switches the set on in the shop window.'), l('{y}: {t} chega às casas.', '{y}: {t} reaches people\'s homes.'), l('{m} nunca mais vai ser igual.', '{m} will never be the same.')]]),
};

/** O processo da cena (o mais recente em aberto com o mesmo texto; senão o mais recente em aberto do selo). */
function suit29(s: GameState, d: CutData27): GameState['lawsuits'][number] | undefined {
  const open = (s.lawsuits ?? []).filter((x) => !['settled', 'won', 'lost'].includes(x.stage) && (x.defendant === 'player' || x.plaintiff === 'player'));
  return [...open].reverse().find((x) => x.text.pt === d.t) ?? open[open.length - 1];
}

// ---------------------------------------------------------------- variantes de fala para as cenas antigas (r27/r28)

export const VARS29: Record<string, L[][]> = {
  press1: [[l('A fábrica cheira a {o} quente.', 'The plant smells of hot {o}.'), l('A primeira cópia de "{t}", de {a}, cai na bandeja.', 'The first copy of "{t}" by {a} drops into the tray.'), l('O que fazer com ela?', 'What will you do with it?')]],
  no1: [[l('A lista chega pelo telex. Você lê duas vezes.', 'The list comes over the wire. You read it twice.'), l('"{t}" é o nº 1. {a} no topo!', '"{t}" is No. 1. {a} on top!'), l('Como comemorar?', 'How do you celebrate?')]],
  star: [[l('Flashes na saída do restaurante.', 'Flashes outside the restaurant.'), l('{a} escolhe {b}. O mercado fala disso a noite toda.', '{a} chooses {b}. The industry talks about it all night.'), l('Como anunciar?', 'How do you announce it?')]],
  show1: [[l('Dez pessoas, uma lâmpada e um amplificador emprestado.', 'Ten people, one bulb and a borrowed amp.'), l('{a} toca como se fosse um estádio.', '{a} plays like it is a stadium.')]],
  sold: [[l('A fila dobra o quarteirão.', 'The line wraps around the block.'), l('{a} esgota a casa. A placa vai na porta.', '{a} sells out. The sign goes on the door.')]],
  tour: [[l('O motorista liga o motor antes do sol.', 'The driver starts the engine before sunrise.'), l('{a} pega a estrada: {t}.', '{a} hits the road: {t}.')]],
  award: [[l('Smokings alugados. Mãos suadas.', 'Rented tuxedos. Sweaty hands.'), l('"E o prêmio vai para… {a}!" — {t}', '"And the award goes to… {a}!" — {t}'), l('O microfone é seu.', 'The microphone is yours.')]],
  scandal: [[l('A manchete chega antes do café.', 'The headline arrives before the coffee.'), l('{t}', '{t}'), l('Os fãs se dividem: uns defendem, outros queimam {o}.', 'The fans split: some defend, others burn {o}.')]],
  death: [[l('As rádios tocam a mesma música o dia inteiro.', 'The radio plays the same song all day.'), l('{p} ({a}) se foi.', '{p} ({a}) has passed.'), l('Velas na porta de {b}.', 'Candles at {b}\'s door.')]],
  era: [[l('Na vitrine, aparelhos que ninguém conhecia.', 'In the shop window, devices nobody knew.'), l('{y}: {m} muda tudo.', '{y}: {m} changes everything.'), l('Seu selo aposta em quê?', 'What does your label bet on?')]],
  magic: [[l('Silêncio na técnica. Ninguém respira.', 'Silence in the control room. Nobody breathes.'), l('{a} grava de primeira. O técnico tira os fones devagar.', '{a} nails it first time. The engineer slowly takes off the headphones.'), l('Fica esse ou mais um?', 'Keep this one or go again?')]],
  coup: [[l('O telefone toca às três da manhã.', 'The phone rings at three in the morning.'), l('{t}', '{t}'), l('Atrás da persiana, alguém de {b} já sabia.', 'Behind the blinds, someone at {b} already knew.')]],
  holo: [[l('O projetor esquenta. A fumaça sobe.', 'The projector warms up. The haze rises.'), l('Feito de luz, {p} canta outra vez.', 'Made of light, {p} sings again.'), l('E você?', 'And you?')]],
  heirs: [[l('O retrato na parede olha para a mesa.', 'The portrait on the wall stares at the table.'), l('{t}', '{t}'), l('O testamento de {a} está no meio.', '{a}\'s will lies in the middle.')]],
};

// ---------------------------------------------------------------- objetos e mídias da época (placeholders)

/** {o}: o objeto físico da música no ano; {m}: o meio que manda nas paradas. */
export function eraWords29(year: number): { o: L; m: L } {
  const o = year < 1948 ? l('o disco de 78', 'the 78') : year < 1965 ? l('o vinil', 'the vinyl') : year < 1985 ? l('o LP', 'the LP') : year < 1992 ? l('a fita cassete', 'the cassette') : year < 2005 ? l('o CD', 'the CD') : year < 2012 ? l('o arquivo MP3', 'the MP3') : l('o single no streaming', 'the streaming single');
  const m = year < 1950 ? l('A rádio', 'Radio') : year < 1981 ? l('A TV', 'TV') : year < 1995 ? l('A rede de clipes', 'The music video network') : year < 2008 ? l('A internet', 'The internet') : l('O streaming', 'Streaming');
  return { o, m };
}

// ---------------------------------------------------------------- detecção (pura)

type Mem = { kind: string; actId?: string; text?: L };
const T = (x: L | undefined): string => x?.pt ?? '';
const isMine = (s: GameState, actId?: string): boolean => { const a = actId ? s.acts[actId] : undefined; return !!a && (a.owner === 'player' || !!a.playerBand); };
/** Tecnologias que viram cena (as grandes viradas de mídia). */
export const TECH29 = ['radio', 'lp', 'tv_music', 'cassette', 'clipnet', 'cd', 'internet', 'streaming', 'short_video'];
const techOf = (e: Mem): string | undefined => TECHS.find((t) => TECH29.includes(t.id) && (T(e.text).includes(t.name.pt) || (e.text?.en ?? '').includes(t.name.en)))?.id;

/** Qual cena nova um evento de memória dispara (antes das antigas: pode refinar um caso delas). */
export function cutOfMemory29(s: GameState, e: Mem, once: Record<string, number>): CutKey29 | null {
  const mine = isMine(s, e.actId);
  switch (e.kind) {
    case 'signed': return mine && once.sign1 === undefined ? 'sign1' : null;
    case 'session': return mine && once.studio1 === undefined && !/melhor sessão|best session/i.test(`${T(e.text)} ${e.text?.en ?? ''}`) ? 'studio1' : null;
    case 'split': return mine ? 'split' : null;
    case 'reunion': return mine ? 'reunion' : null;
    case 'lineup': return mine && /\bentra\b|\bjoins\b|substitu|replaces|chega para|recruta/i.test(`${T(e.text)} ${e.text?.en ?? ''}`) ? 'join' : null;
    case 'sniped': return 'poach';
    case 'poach': return 'steal';
    case 'promise_kept': return mine ? 'vow_kept' : null;
    case 'promise_broken': case 'broken_promise': return mine ? 'vow_broken' : null;
    case 'lawsuit': return !e.actId || mine ? 'court' : null;
    case 'verdict': return (!e.actId || mine) && !(s.cutscenes ?? []).some((c) => c.kind === 'appeal' && !c.data.done && s.week - c.week <= 4) ? 'verdict' : null; // a derrota com recurso já tem a cena do tribunal
    case 'payola': return !e.actId || mine ? 'payola' : null;
    case 'cert': return mine ? (/platin|diamant|diamond/i.test(`${T(e.text)} ${e.text?.en ?? ''}`) ? 'plat' : 'gold') : null;
    case 'festival': return mine && /headline/i.test(`${T(e.text)} ${e.text?.en ?? ''}`) ? 'headline' : null;
    case 'hq': return 'hq';
    case 'retired': return mine ? 'retire' : null;
    case 'label_sold': return 'sale';
    case 'acquisition': return 'acq';
    case 'tech': return techOf(e) ? 'tech' : null;
    default: return null;
  }
}
/** Qual cena nova um fato dispara (pirataria de um ato seu). */
export function cutOfFact29(s: GameState, f: Pick<Fact, 'kind' | 'actors' | 'tags' | 'severity' | 'visibility'>): CutKey29 | null {
  if (f.kind === 'piracy' && isMine(s, f.actors[0])) return 'bootleg';
  return null;
}
/** Texto {t} e pessoa da cena a partir da memória. */
export function dataOfMemory29(s: GameState, key: CutKey29, e: Mem): { t?: string; pid?: string } {
  const txt = T(e.text);
  const a = e.actId ? s.acts[e.actId] : undefined;
  const who = a?.members.find((id) => s.persons[id] && txt.includes(s.persons[id].name));
  switch (key) {
    case 'gold': case 'plat': return { t: /"([^"]+)"/.exec(txt)?.[1] };
    case 'tech': { const id = techOf(e); return { t: id ? TECHS.find((x) => x.id === id)!.name.pt : txt, pid: undefined }; }
    case 'sign1': case 'studio1': return { t: undefined, pid: a?.members[0] };
    default: return { t: txt, pid: who };
  }
}

/** Sondas de estado: a turnê que cruza para outro mercado (uma vez por turnê e mercado). */
export function probes29(s: GameState, add: (d: CutData27) => void): void {
  const home = cityById[s.config.homeCity]?.market;
  for (const t of (s as unknown as { tours?: { id: string; actId: string; name: string; status: string; stops: { cityId: string; status: string }[] }[] }).tours ?? []) {
    if (!isMine(s, t.actId) || t.status !== 'running') continue;
    const st = t.stops.find((x) => x.status === 'played' && cityById[x.cityId] && cityById[x.cityId].market !== home);
    if (!st) continue;
    const c = cityById[st.cityId];
    add({ key: 'leg' as CutData27['key'], ref: `leg:${t.id}:${c.market}`, actId: t.actId, year: s.year, week: s.week, a: s.acts[t.actId]?.name, t: t.name, city: c.id });
  }
}

/** Chave "uma vez" das cenas novas. */
export function onceKey29(key: CutKey29, d: CutData27): string {
  switch (key) {
    case 'sign1': case 'studio1': return key;
    case 'split': case 'reunion': case 'retire': return `${key}:${d.actId ?? d.ref}`;
    case 'join': case 'gold': case 'plat': case 'headline': return `${key}:${d.actId ?? ''}:${d.year}`;
    case 'poach': case 'steal': case 'bootleg': case 'payola': case 'hq': return `${key}:${Math.floor(d.week / 26)}`;
    case 'vow_kept': case 'vow_broken': return `${key}:${Math.floor(d.week / 13)}`;
    case 'court': case 'verdict': return `${key}:${Math.floor(d.week / 8)}`;
    case 'tech': return `tech:${d.t ?? d.ref}`;
    case 'leg': case 'sale': case 'acq': return `${key}:${d.ref}`;
  }
}

/** Primeira chamada de uma partida: marca o que já passou (não conta o passado como novidade). */
export function init29(s: GameState, once: Record<string, number>): void {
  if (s.player.stats.signed > 0 || Object.values(s.acts).some((a) => a.owner === 'player')) once.sign1 = s.week;
  if (s.player.stats.releases > 0 || s.week > 12) once.studio1 = s.week;
}

// ---------------------------------------------------------------- quadro

/** Cenário próprio (pintura completa do cenas29) para estas chaves; as outras pintam o art27 + camada. */
export const FULL29: Partial<Record<CutKey27Like, true>> = { court: true, verdict: true, coup: true, heirs: true, sale: true, acq: true, hq: true, leg: true, tech: true, gold: true, plat: true, retire: true, bootleg: true, payola: true, split: true, poach: true };
type CutKey27Like = string;
/** Qual pintor de cenário completo cada chave usa. */
export const STAGE_OF29: Record<string, string> = { verdict: 'court', acq: 'sale', gold: 'cert', plat: 'cert' };
/** Hora do dia por cena (a "luz" pode variar pelo hash quando faz sentido). */
export function hour29(key: string, ref: string): Hour29 {
  const fixed: Record<string, Hour29> = { coup: 'night', poach: 'night', steal: 'night', bootleg: 'night', raid: 'night', betray: 'night', retire: 'night', split: 'night', holo: 'night', heirs: 'dusk', broke: 'night', scandal: 'day', court: 'day', verdict: 'day', death: 'dusk', sale: 'dusk' };
  if (fixed[key]) return fixed[key];
  return (['day', 'dusk', 'night'] as Hour29[])[hash29(`${key}:${ref}:h`) % 3];
}
/** Retrato na moldura (pessoa da cena) para estas chaves. */
export const PORTRAIT29 = new Set(['death', 'heirs']);

/** Figurantes das cenas novas (bonecos do avatar, com os visuais do looks27; sem pid = gente da época). */
export function figs29(key: CutKey29, m: ArtModel27, mem: string[], d: CutData27): Fig27[] {
  switch (key) {
    case 'sign1': return [{ fx: 0.4, pose: 'stand', dir: 'SE', pid: mem[0], seed: 'c29-s1' }, { fx: 0.62, pose: 'stand', dir: 'SW', seed: 'c29-exec' }];
    case 'studio1': return [{ fx: 0.72, dy: -22, pose: 'play', dir: 'SW', pid: mem[0], seed: 'c29-st1' }, { fx: 0.36, pose: 'sit', dir: 'NE', seed: 'c29-eng' }];
    case 'split': return [{ fx: 0.36, walkTo: 0.06, pose: 'walk', dir: 'SW', pid: mem[0], seed: 'c29-sp1' }, { fx: 0.56, walkTo: 0.94, pose: 'walk', dir: 'SE', pid: mem[1], seed: 'c29-sp2' }];
    case 'reunion': m.n.fill = 1; m.n.hop = 1; return mem.slice(0, 4).map((pid, i) => ({ fx: 0.34 + i * 0.1, dy: -16, pose: 'play', dir: 'SE', pid, seed: `c29-ru${i}` }));
    case 'join': return [{ fx: 0.86, walkTo: 0.64, pose: 'walk', dir: 'SW', pid: d.pid, seed: 'c29-jn' }, ...mem.filter((x) => x !== d.pid).slice(0, 2).map((pid, i) => ({ fx: 0.3 + i * 0.12, pose: 'stand' as const, dir: 'SE' as const, pid, seed: `c29-jm${i}` }))];
    case 'poach': return [{ fx: 0.26, walkTo: 0.66, pose: 'walk', dir: 'SE', pid: mem[0], seed: 'c29-pc' }, { fx: 0.8, pose: 'stand', dir: 'SW', seed: 'c29-rival' }];
    case 'steal': return [{ fx: 0.36, pose: 'sit', dir: 'SE', pid: mem[0], seed: 'c29-sl1' }, { fx: 0.6, pose: 'sit', dir: 'SW', seed: 'c29-sl2' }];
    case 'vow_kept': case 'vow_broken': return [{ fx: 0.44, pose: 'stand', dir: 'SE', pid: d.pid ?? mem[0], seed: 'c29-vw1' }, { fx: 0.6, pose: 'stand', dir: 'SW', seed: 'c29-vw2' }];
    case 'court': case 'verdict': return [{ fx: 0.2, dy: -2, pose: 'stand', dir: 'NE', pid: mem[0], seed: 'c29-ct1' }, { fx: 0.3, dy: -2, pose: 'stand', dir: 'NE', seed: 'c29-law' }, { fx: 0.76, dy: -2, pose: 'stand', dir: 'NW', seed: 'c29-op' }];
    case 'bootleg': return [{ fx: 0.5, pose: 'stand', dir: 'SE', seed: 'c29-vend' }, { fx: 0.3, walkTo: 0.42, pose: 'walk', dir: 'SE', seed: 'c29-buyer' }];
    case 'payola': return [{ fx: 0.34, dy: -2, pose: 'sit', dir: 'SE', seed: 'c29-dj' }, { fx: 0.84, walkTo: 0.68, pose: 'walk', dir: 'SW', seed: 'c29-promo' }];
    case 'gold': case 'plat': return [{ fx: 0.38, pose: 'stand', dir: 'SE', pid: mem[0], seed: 'c29-g1' }, { fx: 0.64, pose: 'stand', dir: 'SW', pid: mem[1], seed: 'c29-g2' }];
    case 'headline': m.n.fill = 1; m.n.hop = 1; return mem.slice(0, 3).map((pid, i) => ({ fx: 0.42 + i * 0.08, dy: -18, pose: 'play', dir: 'SE', pid, seed: `c29-hl${i}` }));
    case 'leg': return [{ fx: 0.6, walkTo: 0.4, pose: 'walk', dir: 'SW', pid: mem[0], seed: 'c29-lg1' }, { fx: 0.68, walkTo: 0.48, pose: 'walk', dir: 'SW', pid: mem[1], seed: 'c29-lg2' }];
    case 'hq': return [{ fx: 0.46, pose: 'stand', dir: 'SE', seed: 'c29-hq1' }, { fx: 0.56, pose: 'stand', dir: 'SW', seed: 'c29-hq2' }, { fx: 0.66, pose: 'stand', dir: 'SW', seed: 'c29-hq3' }];
    case 'retire': return [{ fx: 0.48, dy: -14, pose: 'sitplay', dir: 'SE', pid: d.pid ?? mem[0], seed: 'c29-rt' }];
    case 'sale': case 'acq': return [{ fx: 0.4, pose: 'stand', dir: 'SE', seed: 'c29-sa1' }, { fx: 0.58, pose: 'stand', dir: 'SW', seed: 'c29-sa2' }];
    case 'tech': return [];
  }
}

const up = (x: string | undefined, n: number): string => (x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, n);
/** O que o pintor precisa da cena: letreiros, hora, cenário completo ou camada, e o número da variante. */
export function stageOf29(s: GameState, d: CutData27, m: Pick<ArtModel27, 'sign'>): Stage29 & { stage: string } {
  const full = !!FULL29[d.key];
  const stage = STAGE_OF29[d.key] ?? d.key;
  const city = d.city ? cityById[d.city]?.name : undefined;
  let v = 0;
  const tx = `${d.t ?? ''}`;
  if (d.key === 'verdict') v = /vitória do selo|label wins/i.test(tx) ? 1 : /derrota do selo|label loses/i.test(tx) ? 2 : 1;
  else if (d.key === 'plat') v = /diamant|diamond/i.test(tx) ? 2 : 1;
  else if (d.key === 'hq') v = Math.max(1, Math.min(4, s.player.hq ?? 1));
  else if (d.key === 'acq') v = 1;
  const tech = d.key === 'tech' ? TECHS.find((x) => x.name.pt === d.t || x.name.en === d.t)?.id : undefined;
  return { stage, full, hour: hour29(d.key, d.ref), act: m.sign.act || up(d.a, 12), title: m.sign.hit || up(d.t, 12), brand: up(s.config.companyName, 16), city: up(city ? (typeof city === 'string' ? city : city.en) : undefined, 10), v, tech };
}
