// r27 (K) — CENAS ANIMADAS (cutscenes curtas, 5–15 s, puláveis) dos grandes momentos, com 1–3 escolhas que mexem no
// jogo pelos sistemas de sempre (caixa pelo livro-razão `post`, empréstimo do banco `takeLoan`, calor da polícia
// `addHeat`, moral/cansaço/confiança/fama/reputação nos campos existentes). Este módulo é PURO (sem DOM):
//   scan27(s, pref)        — lê memória (s.memory), fatos (facts17) e sondas de estado desde o último cursor e
//                            devolve as cenas a tocar (no máximo 2 por avanço, as mais importantes primeiro);
//   CUT27[key]             — catálogo: cena de fundo, falas, efeitos visuais e escolhas;
//   cutModel27(s, d)       — monta o quadro (ArtModel27 256×144) com estado e figurantes;
//   choose27(s, d, id)     — aplica a escolha (uma vez por cena) e devolve o texto do resultado.
// Quem chama o scan é só a interface (gancho depois do avanço): bots, testes e o modo automático nunca veem cenas
// e nada muda na simulação se ninguém escolher (ficar parado = status quo). Sem sorteios: os "cara ou coroa" das
// escolhas arriscadas saem de um hash do id da cena (não mexe em nenhum fluxo do Rng).

import { cityById, l, type L } from '../../data/world';
import { EQUIPMENT } from '../../data/rules';
import { takeLoan } from '../../sim/economy';
import { registerExt4 } from '../../sim/ext4';
import { facts17, type Fact } from '../../sim/facts17';
import { a3Of, addHeat, crime17 } from '../../sim/sys/crime17';
import { mineOf17 } from '../../sim/sys/scene17';
import type { Act, GameState } from '../../sim/types';
import { fmtL, money, post } from '../../sim/util';
import { C, Px, noise, withAlpha } from '../pixel/px';
import { bandOf27, halo, kit27, text } from './art27kit';
import { artModel27, type ArtModel27, type Fig27, type SceneKind27 } from './art27';
import { CUT28, actOfFact28, cutOfFact28, figs28, isKey28, onceKey28, pidOfFact28, type CutKey28 } from './cut28model'; // r28 F8: golpe de NPC, holograma, herdeiros
import { CUT29, VARS29, cutOfFact29, cutOfMemory29, dataOfMemory29, eraWords29, figs29, hash29, init29, isKey29, onceKey29, probes29, type CutKey29 } from './cut29model'; // r29: mais cenas + variantes de fala

export type CutKey27 = 'press1' | 'chart1' | 'no1' | 'star' | 'show1' | 'sold' | 'flop' | 'tour' | 'award' | 'scandal' | 'raid'
  | 'leave' | 'death' | 'broke' | 'era' | 'fest' | 'magic' | 'betray' | CutKey28 | CutKey29;
export type CutPref27 = 'all' | 'major' | 'off';
export type CutFx27 = 'confetti' | 'flash' | 'fireworks' | 'rain' | 'police' | 'spot' | 'gold' | 'candles' | 'stamp';

export interface CutData27 {
  key: CutKey27; actId?: string; pid?: string; ref: string; year: number; week: number;
  /** textos já resolvidos para as falas */
  a?: string; p?: string; t?: string;
  /** r29: cidade da cena (id), para {c} */
  city?: string;
}
export interface Choice27 { id: string; label: L; hint: L; apply: (s: GameState, d: CutData27) => L }
export interface CutDef27 {
  key: CutKey27; tier: 'major' | 'minor'; scene: SceneKind27; title: L;
  /** falas que passam durante a cena (placeholders {a} ato, {p} pessoa, {t} título, {y} ano, {b} selo) */
  beats: L[]; fx: CutFx27[]; ms: number; choices: Choice27[];
  /** prioridade quando várias acontecem no mesmo avanço (maior primeiro) */
  prio: number;
  /** r29: falas alternativas (uma é escolhida pelo hash da cena) */
  vars?: L[][];
}

// ---------------------------------------------------------------- estado

export interface Cut27St { init: number; mem: number; fact: number; once: Record<string, number>; era: number; broke: number; n: number; done: Record<string, string> }
declare module '../../sim/ext4' { interface Ext4 { cut27: Cut27St } }
const fresh = (): Cut27St => ({ init: 0, mem: 0, fact: 0, once: {}, era: -1, broke: -999, n: 0, done: {} });
registerExt4('cut27', fresh);
export function cut27(s: GameState): Cut27St {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.cut27 ??= fresh()) as Cut27St;
  st.once ??= {}; st.done ??= {};
  return st;
}

// ---------------------------------------------------------------- utilidades de efeito

const cl = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const actOf = (s: GameState, d: CutData27): Act | undefined => (d.actId ? s.acts[d.actId] : undefined);
function members(s: GameState, d: CutData27, f: (p: GameState['persons'][string]) => void): void {
  for (const id of actOf(s, d)?.members ?? []) { const p = s.persons[id]; if (p?.alive && !p.isPlayer) f(p); }
}
const rep = (s: GameState, k: keyof GameState['player']['reputation'], d: number) => { s.player.reputation[k] = cl(s.player.reputation[k] + d); };
const pay = (s: GameState, d: CutData27, id: string, dollars: number, cat: string, memo: string): number => { const v = money(s, dollars); post(s, `cut27:${d.ref}:${id}`, -v, cat, memo); return v; };
/** "Cara ou coroa" determinístico pela cena (não usa o Rng do jogo). */
export function coin27(ref: string, p = 0.5): boolean { let h = 2166136261; for (let i = 0; i < ref.length; i++) { h ^= ref.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000 < p; }
const $ = (s: GameState, v: number) => `$${Math.round(v / 100).toLocaleString('en-US')}`;

const Ch = (id: string, label: L, hint: L, apply: Choice27['apply']): Choice27 => ({ id, label, hint, apply });

// ---------------------------------------------------------------- catálogo

export const CUT27: Record<CutKey27, CutDef27> = {
  press1: { key: 'press1', tier: 'major', scene: 'releases', prio: 70, ms: 10000, fx: ['spot', 'gold'],
    title: l('O primeiro disco prensado', 'The first record pressed'),
    beats: [l('A prensa desce. O vinil ainda está quente.', 'The press comes down. The vinyl is still warm.'), l('"{t}", de {a}, sai da máquina.', '"{t}" by {a} comes off the machine.'), l('A primeira cópia é sua. O que fazer com ela?', 'The first copy is yours. What will you do with it?')],
    choices: [
      Ch('vault', l('Guardar no cofre do selo', 'Keep it in the label vault'), l('+1 reputação artística, +3 confiança do ato', '+1 artistic reputation, +3 act trust'), (s, d) => { rep(s, 'artistic', 1); const a = actOf(s, d); if (a) a.trust = cl(a.trust + 3); return l('A cópia nº 1 vai para o cofre. Um dia vai valer uma fortuna.', 'Copy no. 1 goes into the vault. One day it will be worth a fortune.'); }),
      Ch('radio', l('Levar em mãos às rádios', 'Hand-deliver it to the radio stations'), l('custa US$ 300 · +4 momento', 'costs US$ 300 · +4 momentum'), (s, d) => { const v = pay(s, d, 'radio', 300, 'marketing', 'Cópias às rádios'); const a = actOf(s, d); if (a) a.momentum = cl(a.momentum + 4); return fmtL(l('Você roda as rádios da cidade ({v}). Os DJs prometem tocar.', 'You tour the city\'s stations ({v}). The DJs promise to play it.'), { v: $(s, v) }); }),
      Ch('party', l('Festa de lançamento', 'Release party'), l('custa US$ 800 · +6 moral da banda, +2% fãs fiéis', 'costs US$ 800 · +6 band morale, +2% core fans'), (s, d) => { const v = pay(s, d, 'party', 800, 'marketing', 'Festa de lançamento'); members(s, d, (p) => { p.morale = cl(p.morale + 6); }); const a = actOf(s, d); if (a) a.fans.core = Math.round(a.fans.core * 1.02); return fmtL(l('A festa vai até o sol nascer ({v}).', 'The party lasts until sunrise ({v}).'), { v: $(s, v) }); }),
    ] },
  chart1: { key: 'chart1', tier: 'minor', scene: 'charts', prio: 50, ms: 8000, fx: ['gold'],
    title: l('Nas paradas!', 'On the charts!'),
    beats: [l('A lista da semana chega.', 'This week\'s list arrives.'), l('Lá está: "{t}", de {a}.', 'There it is: "{t}" by {a}.')],
    choices: [
      Ch('push', l('Reforçar a divulgação', 'Push the promotion'), l('custa US$ 1.500 · +5 momento', 'costs US$ 1,500 · +5 momentum'), (s, d) => { const v = pay(s, d, 'push', 1500, 'marketing', 'Divulgação extra'); const a = actOf(s, d); if (a) a.momentum = cl(a.momentum + 5); return fmtL(l('Anúncios e pôsteres pela cidade ({v}).', 'Ads and posters all over town ({v}).'), { v: $(s, v) }); }),
      Ch('cheer', l('Brindar com a banda', 'Toast with the band'), l('+4 moral da banda', '+4 band morale'), (s, d) => { members(s, d, (p) => { p.morale = cl(p.morale + 4); }); return l('Brinde no estúdio. Todo mundo sorri.', 'A toast in the studio. Everybody smiles.'); }),
    ] },
  no1: { key: 'no1', tier: 'major', scene: 'charts', prio: 90, ms: 10000, fx: ['confetti', 'gold'],
    title: l('Número 1!', 'Number 1!'),
    beats: [l('O telefone não para de tocar.', 'The phone won\'t stop ringing.'), l('"{t}" chega ao topo. {a} é o nº 1!', '"{t}" hits the top. {a} is No. 1!'), l('Como comemorar?', 'How do you celebrate?')],
    choices: [
      Ch('bonus', l('Bônus para a banda', 'Bonus for the band'), l('custa US$ 2.000 · +8 moral, +5 confiança', 'costs US$ 2,000 · +8 morale, +5 trust'), (s, d) => { const v = pay(s, d, 'bonus', 2000, 'artists', 'Bônus do nº 1'); members(s, d, (p) => { p.morale = cl(p.morale + 8); }); const a = actOf(s, d); if (a) a.trust = cl(a.trust + 5); return fmtL(l('Cheques na mesa ({v}). A banda não esquece.', 'Checks on the table ({v}). The band won\'t forget.'), { v: $(s, v) }); }),
      Ch('cover', l('Capa de revista', 'Magazine cover'), l('+1,5 fama, +3 momento', '+1.5 fame, +3 momentum'), (s, d) => { const a = actOf(s, d); if (a) { a.fame = cl(a.fame + 1.5); a.momentum = cl(a.momentum + 3); } return l('Sessão de fotos para a capa da semana.', 'Photo shoot for this week\'s cover.'); }),
    ] },
  star: { key: 'star', tier: 'major', scene: 'signing', prio: 80, ms: 9000, fx: ['flash'],
    title: l('Uma estrela assina', 'A star signs'),
    beats: [l('A caneta pesa na mão.', 'The pen feels heavy.'), l('{a} assina com {b}.', '{a} signs with {b}.'), l('Como anunciar?', 'How do you announce it?')],
    choices: [
      Ch('presser', l('Coletiva de imprensa', 'Press conference'), l('custa US$ 1.000 · +1 fama, +5 momento', 'costs US$ 1,000 · +1 fame, +5 momentum'), (s, d) => { const v = pay(s, d, 'presser', 1000, 'marketing', 'Coletiva da assinatura'); const a = actOf(s, d); if (a) { a.fame = cl(a.fame + 1); a.momentum = cl(a.momentum + 5); } return fmtL(l('Flashes e manchetes ({v}).', 'Flashes and headlines ({v}).'), { v: $(s, v) }); }),
      Ch('dinner', l('Jantar discreto', 'Quiet dinner'), l('+6 confiança do ato', '+6 act trust'), (s, d) => { const a = actOf(s, d); if (a) a.trust = cl(a.trust + 6); return l('Conversa longa, sem câmeras. Começa bem.', 'A long talk, no cameras. A good start.'); }),
    ] },
  show1: { key: 'show1', tier: 'minor', scene: 'shows', prio: 55, ms: 8000, fx: ['spot'],
    title: l('O primeiro show', 'The first show'),
    beats: [l('Luzes baixas. Alguém tosse na plateia.', 'Lights down. Someone coughs in the crowd.'), l('{a} sobe ao palco pela primeira vez.', '{a} takes the stage for the first time.')],
    choices: [
      Ch('thanks', l('Agradecer ao público no fim', 'Thank the crowd at the end'), l('+3% fãs fiéis', '+3% core fans'), (s, d) => { const a = actOf(s, d); if (a) a.fans.core = Math.round(a.fans.core * 1.03) + 5; return l('Meia dúzia de pessoas vira fã para sempre.', 'A handful of people become fans for life.'); }),
    ] },
  sold: { key: 'sold', tier: 'minor', scene: 'shows', prio: 60, ms: 9000, fx: ['confetti', 'spot'],
    title: l('Ingressos esgotados', 'Sold out'),
    beats: [l('Não cabe mais ninguém.', 'There\'s no room left.'), l('{a} esgota a casa. O público pede bis.', '{a} sells out. The crowd wants an encore.')],
    choices: [
      Ch('encore', l('Mais um bis', 'One more encore'), l('+4 momento, +6 cansaço', '+4 momentum, +6 fatigue'), (s, d) => { const a = actOf(s, d); if (a) a.momentum = cl(a.momentum + 4); members(s, d, (p) => { p.fatigue = cl(p.fatigue + 6); }); return l('Vinte minutos a mais. Ninguém vai embora.', 'Twenty more minutes. Nobody leaves.'); }),
      Ch('rest', l('Poupar a banda', 'Save the band'), l('-8 cansaço', '-8 fatigue'), (s, d) => { members(s, d, (p) => { p.fatigue = cl(p.fatigue - 8); }); return l('Boa noite e cama cedo.', 'Good night and an early bed.'); }),
    ] },
  flop: { key: 'flop', tier: 'minor', scene: 'shows', prio: 45, ms: 8000, fx: ['rain'],
    title: l('Um show desastroso', 'A disastrous show'),
    beats: [l('Algo dá errado.', 'Something goes wrong.'), l('{t}', '{t}'), l('O público vaia. E agora?', 'The crowd boos. Now what?')],
    choices: [
      Ch('refund', l('Devolver os ingressos', 'Refund the tickets'), l('custa US$ 1.200 · +1,5 reputação com artistas', 'costs US$ 1,200 · +1.5 reputation with artists'), (s, d) => { const v = pay(s, d, 'refund', 1200, 'live_costs', 'Reembolso de show'); rep(s, 'artists', 1.5); return fmtL(l('Dinheiro de volta ({v}). Fica a fama de selo correto.', 'Money back ({v}). You earn a reputation for fairness.'), { v: $(s, v) }); }),
      Ch('blame', l('Culpar a casa de shows', 'Blame the venue'), l('-1 reputação institucional', '-1 institutional reputation'), (s) => { rep(s, 'institutional', -1); return l('A casa não gosta. Os promotores comentam.', 'The venue is not pleased. Promoters talk.'); }),
      Ch('move', l('Seguir em frente', 'Move on'), l('nada muda', 'nothing changes'), () => l('Amanhã tem outro show.', 'There\'s another show tomorrow.')),
    ] },
  tour: { key: 'tour', tier: 'minor', scene: 'tour', prio: 50, ms: 9000, fx: [],
    title: l('Pé na estrada', 'Hitting the road'),
    beats: [l('Malas, cases, café requentado.', 'Bags, cases, reheated coffee.'), l('{a} parte em turnê: {t}.', '{a} heads out on tour: {t}.')],
    choices: [
      Ch('speech', l('Discurso no ônibus', 'Pep talk on the bus'), l('+5 moral da banda', '+5 band morale'), (s, d) => { members(s, d, (p) => { p.morale = cl(p.morale + 5); }); return l('"Vamos fazer cada noite valer." Aplausos.', '"Let\'s make every night count." Applause.'); }),
      Ch('crew', l('Levar um técnico extra', 'Bring an extra tech'), l('custa US$ 1.500 · -5 cansaço', 'costs US$ 1,500 · -5 fatigue'), (s, d) => { const v = pay(s, d, 'crew', 1500, 'live_costs', 'Técnico extra na turnê'); members(s, d, (p) => { p.fatigue = cl(p.fatigue - 5); }); return fmtL(l('Mais mãos na carga e descarga ({v}).', 'More hands for load-in and load-out ({v}).'), { v: $(s, v) }); }),
    ] },
  award: { key: 'award', tier: 'major', scene: 'awards', prio: 75, ms: 10000, fx: ['spot', 'confetti'],
    title: l('Noite de premiação', 'Award night'),
    beats: [l('O envelope se abre.', 'The envelope opens.'), l('{t} — {a}!', '{t} — {a}!'), l('Hora do discurso.', 'Speech time.')],
    choices: [
      Ch('thank', l('Agradecer à equipe', 'Thank the team'), l('+4 confiança, +1 reputação com artistas', '+4 trust, +1 reputation with artists'), (s, d) => { const a = actOf(s, d); if (a) a.trust = cl(a.trust + 4); rep(s, 'artists', 1); return l('Nomes, abraços, lágrimas. Bonito.', 'Names, hugs, tears. Lovely.'); }),
      Ch('cause', l('Discurso engajado', 'A speech with a cause'), l('+1,5 reputação artística, -1 institucional', '+1.5 artistic reputation, -1 institutional'), (s) => { rep(s, 'artistic', 1.5); rep(s, 'institutional', -1); return l('Metade aplaude de pé. A outra metade franze a testa.', 'Half give a standing ovation. The other half frown.'); }),
    ] },
  scandal: { key: 'scandal', tier: 'major', scene: 'door', prio: 85, ms: 9000, fx: ['flash'],
    title: l('O escândalo estoura', 'The scandal breaks'),
    beats: [l('Batidas na porta. Flashes.', 'Knocks on the door. Flashes.'), l('{t}', '{t}'), l('Os repórteres querem uma resposta.', 'The reporters want an answer.')],
    choices: [
      Ch('apology', l('Pedir desculpas', 'Apologize'), l('+1,5 reputação institucional, -2 momento', '+1.5 institutional reputation, -2 momentum'), (s, d) => { rep(s, 'institutional', 1.5); const a = actOf(s, d); if (a) a.momentum = cl(a.momentum - 2); return l('Um pedido de desculpas sóbrio. A poeira começa a baixar.', 'A sober apology. The dust begins to settle.'); }),
      Ch('deny', l('Negar tudo', 'Deny everything'), l('arriscado: +3 momento ou -2,5 reputação institucional', 'risky: +3 momentum or -2.5 institutional reputation'), (s, d) => { const a = actOf(s, d); if (coin27(d.ref)) { if (a) a.momentum = cl(a.momentum + 3); return l('A história não se sustenta. Os fãs fecham com vocês.', 'The story falls apart. The fans close ranks.'); } rep(s, 'institutional', -2.5); return l('Aparecem provas. A negação vira a segunda manchete.', 'Evidence surfaces. The denial becomes the second headline.'); }),
      Ch('silence', l('Sem comentários', 'No comment'), l('nada muda', 'nothing changes'), () => l('A porta fecha. Amanhã é outro dia.', 'The door closes. Tomorrow is another day.')),
    ] },
  raid: { key: 'raid', tier: 'major', scene: 'crime', prio: 88, ms: 9000, fx: ['police'],
    title: l('Batida policial', 'Police raid'),
    beats: [l('Sirenes no beco.', 'Sirens in the alley.'), l('{t}', '{t}'), l('Segundos para decidir.', 'Seconds to decide.')],
    choices: [
      Ch('lawyer', l('Chamar o advogado', 'Call the lawyer'), l('custa US$ 3.000 · -10 calor', 'costs US$ 3,000 · -10 heat'), (s, d) => { const v = pay(s, d, 'lawyer', 3000, 'legal', 'Advogado na batida'); addHeat(s, 'player', a3Of(s, s.config.homeCity), -10); return fmtL(l('O advogado chega antes do camburão ({v}).', 'The lawyer arrives before the paddy wagon ({v}).'), { v: $(s, v) }); }),
      Ch('cooperate', l('Cooperar com a polícia', 'Cooperate with the police'), l('-20 calor, confisca o produto do crime, +1 reputação institucional', '-20 heat, crime proceeds seized, +1 institutional reputation'), (s) => { addHeat(s, 'player', a3Of(s, s.config.homeCity), -20); const c = crime17(s); c.loot19 = 0; rep(s, 'institutional', 1); return l('Você abre as portas. Levam o que acharam, mas a investigação esfria.', 'You open the doors. They take what they find, but the investigation cools.'); }),
      Ch('burn', l('Queimar as provas', 'Burn the evidence'), l('+8 calor', '+8 heat'), (s) => { addHeat(s, 'player', a3Of(s, s.config.homeCity), 8); return l('Fumaça pela janela dos fundos. A polícia anota tudo.', 'Smoke out the back window. The police write it all down.'); }),
    ] },
  leave: { key: 'leave', tier: 'minor', scene: 'leave', prio: 65, ms: 9000, fx: [],
    title: l('Alguém deixa a banda', 'Someone leaves the band'),
    beats: [l('O case da guitarra fecha devagar.', 'The guitar case closes slowly.'), l('{t}', '{t}')],
    choices: [
      Ch('farewell', l('Despedida digna', 'A dignified farewell'), l('+4 confiança, +1 reputação com artistas', '+4 trust, +1 reputation with artists'), (s, d) => { const a = actOf(s, d); if (a) a.trust = cl(a.trust + 4); rep(s, 'artists', 1); return l('Abraço na porta. A porta fica aberta.', 'A hug at the door. The door stays open.'); }),
      Ch('replace', l('Procurar substituto já', 'Find a replacement now'), l('+2 momento, -2 moral', '+2 momentum, -2 morale'), (s, d) => { const a = actOf(s, d); if (a) a.momentum = cl(a.momentum + 2); members(s, d, (p) => { p.morale = cl(p.morale - 2); }); return l('Anúncio de audições no mesmo dia. Frio, mas eficiente.', 'Auditions announced the same day. Cold, but efficient.'); }),
    ] },
  death: { key: 'death', tier: 'major', scene: 'memorial', prio: 95, ms: 11000, fx: ['candles'],
    title: l('Em memória', 'In memoriam'),
    beats: [l('Silêncio.', 'Silence.'), l('{p} ({a}) se foi.', '{p} ({a}) has passed.'), l('A música fica.', 'The music remains.')],
    choices: [
      Ch('tribute', l('Organizar um show-tributo', 'Hold a tribute show'), l('custa US$ 2.500 · +5% fãs fiéis, +2 reputação com artistas', 'costs US$ 2,500 · +5% core fans, +2 reputation with artists'), (s, d) => { const v = pay(s, d, 'tribute', 2500, 'live_costs', 'Show-tributo'); const a = actOf(s, d); if (a) a.fans.core = Math.round(a.fans.core * 1.05); rep(s, 'artists', 2); return fmtL(l('Uma noite de canções e velas ({v}).', 'A night of songs and candles ({v}).'), { v: $(s, v) }); }),
      Ch('private', l('Luto em silêncio', 'Grieve in private'), l('+3 confiança', '+3 trust'), (s, d) => { const a = actOf(s, d); if (a) a.trust = cl(a.trust + 3); return l('Sem holofotes. A família agradece.', 'No spotlight. The family is grateful.'); }),
    ] },
  broke: { key: 'broke', tier: 'major', scene: 'finance', prio: 92, ms: 9000, fx: ['rain', 'stamp'],
    title: l('Ameaça de falência', 'Bankruptcy threat'),
    beats: [l('Chove lá fora. As contas vencem.', 'It rains outside. The bills are due.'), l('O caixa de {b} está no vermelho.', '{b}\'s cash is in the red.'), l('O que fazer?', 'What now?')],
    choices: [
      Ch('loan', l('Pedir empréstimo ao banco', 'Ask the bank for a loan'), l('crédito com juros (se o banco aceitar)', 'credit with interest (if the bank agrees)'), (s) => (takeLoan(s) ? l('O gerente assina. O dinheiro entra; os juros também.', 'The manager signs. The money comes in; so does the interest.') : l('O banco recusa. Vai ser preciso cortar na carne.', 'The bank says no. You\'ll have to cut to the bone.'))),
      Ch('sell', l('Vender equipamento usado', 'Sell used equipment'), l('vende o item mais caro por 35% do valor', 'sells the most expensive item for 35% of its value'), (s, d) => {
        const eq = s.player.equipment.map((id) => EQUIPMENT.find((e) => e.id === id)).filter((e): e is (typeof EQUIPMENT)[number] => !!e).sort((a, b) => b.cost - a.cost)[0];
        if (!eq) return l('Não há nada para vender.', 'There is nothing to sell.');
        s.player.equipment.splice(s.player.equipment.indexOf(eq.id), 1);
        const v = money(s, eq.cost * 0.35); post(s, `cut27:${d.ref}:sell`, v, 'equipment', `Venda: ${eq.name.pt}`);
        return fmtL(l('{e} vai embora por {v}.', '{e} goes for {v}.'), { e: eq.name, v: $(s, v) });
      }),
      Ch('hold', l('Aguentar firme', 'Hold on'), l('nada muda', 'nothing changes'), () => l('Você apaga a luz do escritório e respira fundo.', 'You switch off the office light and take a deep breath.')),
    ] },
  era: { key: 'era', tier: 'major', scene: 'era', prio: 40, ms: 9000, fx: ['gold'],
    title: l('Uma nova era', 'A new era'),
    beats: [l('O mundo muda de som.', 'The world changes its sound.'), l('{y}: chega uma nova tecnologia.', '{y}: a new technology arrives.'), l('Seu selo aposta em quê?', 'What does your label bet on?')],
    choices: [
      Ch('embrace', l('Abraçar a novidade', 'Embrace the new'), l('custa US$ 2.000 · +1,5 reputação comercial', 'costs US$ 2,000 · +1.5 commercial reputation'), (s, d) => { const v = pay(s, d, 'embrace', 2000, 'equipment', 'Adoção de tecnologia'); rep(s, 'commercial', 1.5); return fmtL(l('Você é dos primeiros a apostar ({v}).', 'You are among the first to bet on it ({v}).'), { v: $(s, v) }); }),
      Ch('tradition', l('Manter a tradição', 'Keep the tradition'), l('+1,5 reputação artística', '+1.5 artistic reputation'), (s) => { rep(s, 'artistic', 1.5); return l('O som de sempre, com orgulho.', 'The classic sound, with pride.'); }),
    ] },
  fest: { key: 'fest', tier: 'minor', scene: 'festival', prio: 55, ms: 9000, fx: ['fireworks'],
    title: l('O festival abre os portões', 'The festival opens its gates'),
    beats: [l('Os portões se abrem. Uma onda de gente.', 'The gates open. A wave of people.'), l('{t}', '{t}')],
    choices: [
      Ch('fireworks', l('Abrir com fogos', 'Open with fireworks'), l('custa US$ 1.500 · +3% fãs casuais', 'costs US$ 1,500 · +3% casual fans'), (s, d) => { const v = pay(s, d, 'fireworks', 1500, 'live_costs', 'Fogos do festival'); const a = actOf(s, d); if (a) a.fans.casual = Math.round(a.fans.casual * 1.03); return fmtL(l('O céu explode em cores ({v}).', 'The sky explodes in colour ({v}).'), { v: $(s, v) }); }),
    ] },
  magic: { key: 'magic', tier: 'minor', scene: 'studio', prio: 60, ms: 9000, fx: ['spot'],
    title: l('O take mágico', 'The magic take'),
    beats: [l('Luz vermelha acesa. Silêncio na técnica.', 'Red light on. Silence in the control room.'), l('{a} acerta tudo de primeira.', '{a} nails it in one take.'), l('Fica esse ou mais um?', 'Keep this one or go again?')],
    choices: [
      Ch('keep', l('É esse!', 'That\'s the one!'), l('+3 momento, +3 moral', '+3 momentum, +3 morale'), (s, d) => { const a = actOf(s, d); if (a) a.momentum = cl(a.momentum + 3); members(s, d, (p) => { p.morale = cl(p.morale + 3); }); return l('O produtor sorri. Ninguém toca em nada.', 'The producer smiles. Nobody touches a thing.'); }),
      Ch('again', l('Mais um take', 'One more take'), l('arriscado: +6 momento ou +6 cansaço', 'risky: +6 momentum or +6 fatigue'), (s, d) => { const a = actOf(s, d); if (coin27(d.ref, 0.55)) { if (a) a.momentum = cl(a.momentum + 6); return l('O segundo é ainda melhor. Arrepio na sala.', 'The second is even better. Goosebumps in the room.'); } members(s, d, (p) => { p.fatigue = cl(p.fatigue + 6); }); return l('A mágica não volta. Vocês ficam com o primeiro.', 'The magic doesn\'t come back. You keep the first one.'); }),
    ] },
  // r27 INT: traição no Submundo (chamada pela operação jogável via playCutscene27('betrayal'))
  betray: { key: 'betray', tier: 'major', scene: 'crime', prio: 86, ms: 8000, fx: ['flash'],
    title: l('Traição', 'Betrayal'),
    beats: [l('Alguém da equipe falou demais.', 'Someone on the crew talked.'), l('{t}', '{t}'), l('No Submundo, a memória é longa.', 'In the underworld, memories are long.')],
    choices: [] },
  ...CUT28, // r28 F8 (B7/B8): coup / holo / heirs (cut28model.ts)
  ...CUT29, // r29: 22 cenas novas (cut29model.ts)
};
export const CUT_KEYS27 = Object.keys(CUT27) as CutKey27[];

// ---------------------------------------------------------------- detecção (pura; só a interface chama)

const memNo = (id: string): number => { const n = parseInt(id.slice(1), 36); return Number.isFinite(n) ? n : 0; };
const factNo = (id: string): number => { const n = parseInt(id.slice(1), 10); return Number.isFinite(n) ? n : 0; };
const isMine = (s: GameState, actId?: string): boolean => { const a = actId ? s.acts[actId] : undefined; return !!a && (a.owner === 'player' || !!a.playerBand); };
const T = (x: L | undefined): string => x?.pt ?? '';

/** Qual cena um evento de memória (s.memory) dispara, se alguma (puro, sem estado). */
export function cutOfMemory27(s: GameState, kind: string, actId?: string, text?: L): CutKey27 | null {
  if (!isMine(s, actId)) return null;
  switch (kind) {
    case 'release': return 'press1';
    case 'number1': return 'no1';
    case 'signed': return (s.acts[actId!]?.fame ?? 0) >= 45 ? 'star' : null;
    case 'gigs': return 'show1';
    case 'sellout': case 'legendary_show': return 'sold';
    case 'stage_incident': case 'show': return 'flop';
    case 'member_quits': return 'leave';
    case 'festival': case 'festival8': case 'festival9': case 'festival12': return 'fest';
    case 'session': return /melhor sessão|best session/i.test(`${text?.pt ?? ''} ${text?.en ?? ''}`) ? 'magic' : null;
    default: return null;
  }
}
/** Qual cena um fato (facts17) dispara, se alguma. */
export function cutOfFact27(s: GameState, f: Pick<Fact, 'kind' | 'actors' | 'tags' | 'severity' | 'visibility'>): CutKey27 | null {
  const m = mineOf17(s, f.actors);
  switch (f.kind) {
    case 'scandal': return m && f.visibility === 'public' && f.severity >= 25 ? 'scandal' : null;
    case 'arrest': return f.actors.includes('player') && f.tags.includes('crime') ? 'raid' : null;
    case 'crime': return f.actors[0] === 'player' && f.tags.includes('fail') && f.visibility !== 'secret' ? 'raid' : null;
    case 'death': return m?.pid && s.persons[m.pid] && !s.persons[m.pid].isPlayer && f.actors.includes(m.pid) ? 'death' : null;
    case 'award': return m?.act && !f.tags.includes('music_show') ? 'award' : null;
    case 'own_festival': return 'fest';
    default: return cutOfFact28(s, f) ?? cutOfFact29(s, f); // r28 F8, r29
  }
}

/** Chave "uma vez": por partida, por ato, por ato-ano ou por evento. */
export function onceKey27(key: CutKey27, d: CutData27): string { return onceKey(key, d); }
function onceKey(key: CutKey27, d: CutData27): string {
  switch (key) {
    case 'press1': case 'chart1': case 'show1': return key;
    case 'no1': case 'star': case 'leave': return `${key}:${d.actId}:${key === 'leave' ? d.ref : ''}`;
    case 'sold': case 'fest': case 'magic': case 'award': return `${key}:${d.actId ?? ''}:${d.year}`;
    case 'flop': return `${key}:${Math.floor(d.week / 26)}`;
    case 'scandal': return `${key}:${Math.floor(d.week / 8)}`;
    case 'raid': case 'betray': return `${key}:${Math.floor(d.week / 12)}`;
    case 'tour': case 'death': case 'era': case 'broke': return `${key}:${d.ref}`;
    case 'coup': case 'holo': case 'heirs': return onceKey28(key, d);
    default: return onceKey29(key as CutKey29, d); // r29
  }
}

function dataOf(s: GameState, key: CutKey27, ref: string, actId?: string, o: Partial<CutData27> = {}): CutData27 {
  return { key, ref, actId, year: s.year, week: s.week, a: actId ? s.acts[actId]?.name : undefined, ...o };
}
const latestTitle = (s: GameState, actId?: string): string | undefined => { const a = actId ? s.acts[actId] : undefined; const r = a?.releases?.[a.releases.length - 1]; return r ? s.releases[r]?.title : undefined; };

/**
 * Lê o que aconteceu desde a última chamada e devolve as cenas (no máximo `max`, mais importantes primeiro).
 * Na primeira chamada de uma partida só marca o ponto de partida (não conta o passado como novidade).
 */
export function scan27(s: GameState, pref: CutPref27 = 'all', max = 2): CutData27[] {
  const st = cut27(s);
  const memTop = Math.max(0, ...(s.memory ?? []).map((e) => memNo(e.id)));
  const fs = facts17(s);
  const band = bandOf27(s.year);
  if (!st.init) {
    st.init = 1; st.mem = memTop; st.fact = fs.seq; st.era = band;
    if (s.player.stats.releases > 0) st.once.press1 = s.week;
    if (s.player.stats.top10s > 0 || Object.values(s.acts).some((a) => isMine(s, a.id) && a.peakChart > 0 && a.peakChart <= 100)) st.once.chart1 = s.week;
    if (s.week > 12) st.once.show1 = s.week;
    for (const t of s.tours ?? []) if (isMine(s, t.actId) && t.status !== 'planned') st.once[`tour:tour:${t.id}`] = s.week;
    init29(s, st.once); // r29
    return [];
  }
  const out: CutData27[] = [];
  const add = (d: CutData27) => { if (pref === 'off') return; if (pref === 'major' && CUT27[d.key].tier !== 'major') return; const k = onceKey(d.key, d); if (st.once[k] !== undefined || out.some((x) => onceKey(x.key, x) === k)) return; out.push(d); };
  // memória
  for (const e of s.memory ?? []) {
    if (memNo(e.id) <= st.mem) continue;
    const k29 = cutOfMemory29(s, e, st.once); // r29: cenas novas (podem refinar um caso das antigas: headline, 1ª assinatura)
    if (k29) { const o = dataOfMemory29(s, k29, e); add(dataOf(s, k29, e.id, e.actId && s.acts[e.actId] ? e.actId : undefined, { t: o.t, pid: o.pid, p: o.pid ? s.persons[o.pid]?.name : undefined })); continue; }
    const key = cutOfMemory27(s, e.kind, e.actId, e.text);
    if (!key) continue;
    const t = key === 'flop' || key === 'leave' || key === 'fest' ? T(e.text) : (/"([^"]+)"/.exec(T(e.text))?.[1] ?? latestTitle(s, e.actId));
    add(dataOf(s, key, e.id, e.actId, { t }));
  }
  // fatos
  for (const f of fs.f) {
    if (factNo(f.id) <= st.fact) continue;
    const key = cutOfFact27(s, f);
    if (!key) continue;
    const m = mineOf17(s, f.actors);
    if (key === 'award' && (s.cutscenes ?? []).some((c) => c.kind === 'awards' && s.week - c.week <= 4)) continue; // a cerimônia completa já toca
    if (isKey28(key)) { const a28 = actOfFact28(s, key, f), p28 = pidOfFact28(s, key, f, a28); add(dataOf(s, key, f.id, a28, { pid: p28, p: p28 ? s.persons[p28]?.name : undefined, t: T(f.text) })); continue; } // r28 F8
    add(dataOf(s, key, f.id, m?.act, { pid: m?.pid, p: m?.pid ? s.persons[m.pid]?.name : undefined, t: T(f.text) }));
  }
  // sondas de estado
  if (st.once.chart1 === undefined) {
    const e = [...(s.charts?.singles ?? []), ...(s.charts?.albums ?? [])].find((x) => isMine(s, s.releases[x.releaseId]?.actId));
    if (e) { const r = s.releases[e.releaseId]; add(dataOf(s, 'chart1', `c:${r.id}`, r.actId, { t: r.title })); }
  }
  for (const t of s.tours ?? []) {
    if (!isMine(s, t.actId) || t.status !== 'running' || !t.stops.some((x) => x.status === 'played')) continue;
    add(dataOf(s, 'tour', `tour:${t.id}`, t.actId, { t: t.name }));
  }
  probes29(s, add); // r29: a turnê que cruza a fronteira
  if (band !== st.era) { if (band > st.era && st.era >= 0) add(dataOf(s, 'era', `era:${band}`)); st.era = band; }
  if (s.player.cash < 0 && s.player.insolvencyMonths >= 1 && s.week - st.broke >= 52) { st.broke = s.week; add(dataOf(s, 'broke', `broke:${s.week}`)); }
  st.mem = Math.max(st.mem, memTop); st.fact = Math.max(st.fact, fs.seq);
  out.sort((a, b) => CUT27[b.key].prio - CUT27[a.key].prio);
  const pick = out.slice(0, max);
  for (const d of pick) { st.once[onceKey(d.key, d)] = s.week; st.n++; }
  // o que não coube também conta como visto (não reaparece no próximo avanço)
  for (const d of out.slice(max)) st.once[onceKey(d.key, d)] = s.week;
  return pick;
}

// ---------------------------------------------------------------- quadro

const FX_N: Partial<Record<CutKey27, Record<string, number>>> = { raid: { raid: 1, heat: 60, busy: 1 }, star: { big: 1 }, broke: { red: 1 }, magic: { busy: 1 }, flop: { fill: 0.35, hop: 0 }, sold: { fill: 1, hop: 1 } };

/** Quadro 256×112 da cena (ou mais estreito no celular, para caber em escala 2×) (pintado pela mesma pintura das páginas, com estado e figurantes da cena). */
export const CUT_W27 = 256, CUT_H27 = 112;
export function cutModel27(s: GameState, d: CutData27, size: { w: number; h: number } = { w: CUT_W27, h: CUT_H27 }): ArtModel27 {
  const def = CUT27[d.key];
  const m = artModel27('', s, { kind: def.scene, w: size.w, h: size.h, year: d.year })!;
  Object.assign(m.n, FX_N[d.key] ?? {});
  const act = d.actId ? s.acts[d.actId] : undefined;
  const mem = (act?.members ?? []).filter((id) => s.persons[id]);
  if (act) m.sign.act = act.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().slice(0, 12);
  if (d.t) { m.sign.hit = d.t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().slice(0, 12); m.sign.tour = m.sign.hit; }
  const figs: Fig27[] = [];
  switch (d.key) {
    case 'press1': figs.push({ fx: 0.55, pose: 'stand', dir: 'SW', pid: mem[0], seed: 'c-p1' }); m.n.fresh = 1; break;
    case 'chart1': case 'no1': m.n.pos = 0; m.state = 'no1'; figs.push({ fx: 0.3, pose: 'stand', dir: 'NE', pid: mem[0], seed: 'c-n1a' }, { fx: 0.38, pose: 'stand', dir: 'NE', pid: mem[1], seed: 'c-n1b' }); break;
    case 'star': figs.push({ fx: 0.42, pose: 'stand', dir: 'SE', pid: mem[0], seed: 'c-star' }, { fx: 0.6, pose: 'stand', dir: 'SW', seed: 'c-exec' }); break;
    case 'show1': case 'sold': case 'flop': mem.slice(0, 3).forEach((pid, i) => figs.push({ fx: 0.4 + i * 0.1, dy: -16, pose: 'play', dir: 'SE', pid, seed: `c-sh${i}` })); if (!figs.length) figs.push({ fx: 0.5, dy: -16, pose: 'play', dir: 'SE', seed: 'c-sh' }); if (d.key === 'show1') m.n.fill = 0.3; break;
    case 'tour': figs.push({ fx: 0.62, walkTo: 0.32, pose: 'walk', dir: 'SW', pid: mem[0], seed: 'c-t1' }, { fx: 0.7, walkTo: 0.4, pose: 'walk', dir: 'SW', pid: mem[1], seed: 'c-t2' }); break;
    case 'award': figs.push({ fx: 0.5, dy: -10, pose: 'stand', dir: 'SE', pid: d.pid ?? mem[0], seed: 'c-aw' }); m.n.trophies = Math.max(1, m.n.trophies ?? 0); break;
    case 'scandal': figs.push({ fx: 0.5, pose: 'stand', dir: 'SE', pid: d.pid ?? mem[0], seed: 'c-sc' }); break;
    case 'betray': figs.push({ fx: 0.4, pose: 'stand', dir: 'SE', seed: 'c-b1' }, { fx: 0.62, walkTo: 0.92, pose: 'walk', dir: 'SE', seed: 'c-b2' }); break;
    case 'raid': figs.push({ fx: 0.66, dy: -1, pose: 'stand', dir: 'SW', seed: 'c-r1' }, { fx: 0.78, dy: -1, pose: 'stand', dir: 'SW', seed: 'c-r2' }, { fx: 0.2, walkTo: 0.4, pose: 'walk', dir: 'SE', seed: 'c-cop', role: null }); break;
    case 'leave': figs.push({ fx: 0.5, walkTo: 0.9, pose: 'walk', dir: 'SE', pid: d.pid, seed: 'c-lv' }); mem.slice(0, 2).forEach((pid, i) => figs.push({ fx: 0.25 + i * 0.1, pose: 'stand', dir: 'SE', pid, seed: `c-lv${i}` })); m.n.acts = 1; break;
    case 'death': break; // o retrato vai na moldura (camada do DOM)
    case 'broke': figs.push({ fx: 0.42, pose: 'sit', dir: 'SE', seed: 'c-acc' }); break;
    case 'era': break;
    case 'fest': m.n.fill = 0.9; m.n.hop = 1; break;
    case 'coup': case 'holo': case 'heirs': figs.push(...figs28(d.key, m, mem, d)); break; // r28 F8
    case 'magic': figs.push({ fx: 0.72, dy: -22, pose: 'play', dir: 'SW', pid: mem[0], seed: 'c-mg' }, { fx: 0.36, pose: 'sit', dir: 'NE', seed: 'c-prod' }); break;
    default: if (isKey29(d.key)) figs.push(...figs29(d.key, m, mem, d)); // r29
  }
  m.figs = figs;
  m.variant = `cut/${d.key}/${m.band}`;
  m.caption = def.title;
  return m;
}

/** Fala com os nomes no lugar. */
export function beat27(s: GameState, d: CutData27, b: L): L {
  // sem título conhecido: "{t}" vira "o disco" (sem aspas)
  const bb = d.t ? b : { pt: b.pt.replace('"{t}"', '{t}'), en: b.en.replace('"{t}"', '{t}') };
  const ew = eraWords29(d.year); // r29: {o} objeto da época, {m} meio, {c} cidade
  const city = d.city ? cityById[d.city]?.name : undefined;
  return fmtL(bb, { a: d.a ?? s.config.companyName, p: d.p ?? '', t: d.t || l('o disco', 'the record'), y: d.year, b: s.config.companyName, o: ew.o, m: ew.m, c: city ?? l('outro país', 'another country') });
}
/** r29: falas da cena — a lista padrão ou uma variante, escolhida pelo hash da cena (estável entre aberturas). */
export function beatsOf27(d: CutData27): L[] {
  const def = CUT27[d.key];
  const all = [def.beats, ...(def.vars ?? []), ...(VARS29[d.key] ?? [])];
  return all[hash29(`${d.ref}:beats`) % all.length];
}
/** r29: ritmo único (2,6 s por fala + 1,8 s para as escolhas), igual para todas as cenas. */
export const pace27 = (n: number): number => 1800 + n * 2600;

/** Aplica a escolha (uma vez por cena; repetir não faz nada) e devolve o resultado. */
export function choose27(s: GameState, d: CutData27, id: string): L | null {
  const st = cut27(s);
  if (st.done[d.ref]) return null;
  const c = CUT27[d.key].choices.find((x) => x.id === id);
  if (!c) return null;
  st.done[d.ref] = id;
  const keys = Object.keys(st.done);
  if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete st.done[k];
  return c.apply(s, d);
}

// ---------------------------------------------------------------- efeitos visuais da cena (puros, por cima do quadro)

const CONF27 = ['#e05a4e', '#ffd040', '#4ab0e0', '#6cc35a', '#e85ac8', '#ffffff'];
/** Pinta os efeitos da cena no instante t (0 = quadro estático, sem partículas em movimento). */
export function paintFx27(p: Px, m: ArtModel27, fx: CutFx27[], t: number): void {
  const k = kit27(p, m.year, t, m.seed, m.fy);
  const W = p.w, H = p.h;
  for (const f of fx) {
    if (f === 'confetti') for (let i = 0; i < 80; i++) { const x = Math.round((i * 53 + Math.sin(t * 1.5 + i) * 6) % W); const y = t === 0 ? (i * 29) % H : Math.round(((i * 37 + t * (30 + (i % 5) * 8)) % (H + 10)) - 6); p.rect(x, y, i % 3 ? 2 : 1, i % 2 ? 1 : 2, k.c(CONF27[i % CONF27.length])); }
    else if (f === 'flash') { if (t > 0) for (let i = 0; i < 4; i++) if (Math.sin(t * (7 + i) + i * 2) > 0.93) { const x = (i * 67 + 20) % W, y = m.fy - 20 + ((i * 23) % 20); halo(k, x, y, 22, k.c('#ffffff'), 200); p.rect(0, 0, W, H, withAlpha(C('#ffffff'), 30)); } }
    else if (f === 'fireworks') for (let b = 0; b < 3; b++) { const ph = t === 0 ? 0.6 : ((t * 0.5 + b * 0.33) % 1); const cx = 40 + b * 80, cy = 22 + (b % 2) * 10, r = Math.round(ph * 22); const col = k.c(CONF27[b + 1]); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; p.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r + ph * ph * 6), withAlpha(col, Math.round(255 * (1 - ph * 0.7)))); } if (ph < 0.15) halo(k, cx, cy, 10, col, 120); }
    else if (f === 'rain') { for (let i = 0; i < 110; i++) { const x = Math.round((i * 29 + t * 40) % W); const y = Math.round((i * 47 + t * 160) % H); p.rect(x, y, 1, 4, k.c('#aabedc', 140)); } p.rect(0, 0, W, H, k.c('#28324a', 40)); }
    else if (f === 'police') { const ph = t === 0 ? 0 : Math.floor(t * 4) % 2; p.rect(0, 0, W, H, withAlpha(C(ph ? '#ff2020' : '#2040ff'), 26)); halo(k, ph ? 10 : W - 10, 20, 50, k.c(ph ? '#ff3030' : '#3060ff'), 70); }
    else if (f === 'spot') { const fg = m.figs[0]; const cx = Math.round((fg?.fx ?? 0.5) * W), cy = m.fy + (fg?.dy ?? 0) - 14; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x - cx) / 30, dy = (y - cy) / 40; if (dx * dx + dy * dy > 1 && (x + y) % 2 === 0) p.set(x, y, C('#000000', 70)); } }
    else if (f === 'gold') for (let i = 0; i < 18; i++) { const x = Math.floor(noise(i, Math.floor(t * 5), 3) * W), y = Math.floor(noise(i, 9, Math.floor(t * 5)) * m.fy); p.set(x, y, k.pal.gold); p.set(x + 1, y, withAlpha(k.pal.gold, 120)); p.set(x, y + 1, withAlpha(k.pal.gold, 120)); }
    else if (f === 'candles') { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2)); if (e > 0.7 && (x + y) % 2) p.set(x, y, C('#000000', Math.round((e - 0.7) * 400))); } }
    else if (f === 'stamp' && (t === 0 || t > 5)) { const x = Math.round(W * 0.56), y = 22; p.rect(x - 2, y - 2, 64, 13, C('#c02020', 230)); p.rect(x, y, 60, 9, C('#f4e6d0', 230)); text(k, m.year >= 1980 ? 'OVERDUE' : 'VENCIDO', x + 6, y + 2, C('#c02020')); }
  }
}
