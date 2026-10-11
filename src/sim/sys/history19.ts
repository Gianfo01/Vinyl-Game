// Rodada 19 (T8, history19) — MARCOS DA HISTÓRIA 1926–2026 COMO JOGO. Os 113 marcos de data/hist19.ts entram em
// world4/milestones (linha do tempo, nada do futuro: só disparam na data/tecnologia) e cada um traz:
//   · efeito mecânico: apelo por família/gênero, mercado de origem e tipo (single/álbum) enquanto vigora (mod 'w4ms:h19'
//     na família "mundo" do teto de appeal), empurrão no genrePop e, às vezes, caixa dos rivais;
//   · decisão real (cartão com 3 opções por tipo: onda, tecnologia, regra, palco, crise, negócio) com ecos escritos;
//   · fato `milestone_turn` (ouvinte: manchete + os atos de NPC do estilo ganham embalo) e `real_history` na escolha;
//   · cartão "A história real" (o fato documentado × o que aconteceu na sua partida, nos modos alternativos).
// Geopolítica nova (data/hist19 GEO19 → content.GEOPOLITICS) e regimes novos para o society18 (censura/exílio).
// Flags de dados: RealArtist.exact === false some do modo exato (dbsize14.realAllowed); T (tributo) marcado aqui.

import { clamp } from '../../core/rng';
import { GENRES, FAMILIES, cityById, genreById, l, marketById, type L } from '../../data/world';
import { H19, TRIB_K19, type H19 as H19Def, type HK19 } from '../../data/hist19';
import { norm19 } from '../../data/more19';
import { registerConseq18, type EchoSpec18, type Fx18 } from '../decide18';
import type { EventDef } from '../events';
import { deferEvents, registerDecisionListener, registerExt4, registerMod } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { altHistory } from '../history15';
import { registerAdvisorTip } from '../inbox18';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { headline19 } from './factlink19';
import { TRIB19_T } from './tribute19';
import { REAL_ALL, realDataOf } from './realworld';
import { REGIMES18 } from './society18';
import { MILESTONES, type Milestone } from './world4/milestones';
import { w4 } from './world4/state';

// ---------------------------------------------------------------- estado: o que aconteceu na SUA partida
export interface H19Run { y: number; opt: string; pick: L; out?: L; tone?: 'good' | 'bad' | 'mixed' }
export interface H19State { run: Record<string, H19Run> }
declare module '../ext4' { interface Ext4 { hist19: H19State } }
registerExt4('hist19', () => ({ run: {} }));
export function hist19(s: GameState): H19State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.hist19 ??= { run: {} }) as H19State;
  st.run ??= {};
  return st;
}
export const H19_BY_ID: Record<string, H19Def> = Object.fromEntries(H19.map((h) => [h.id, h]));

// ---------------------------------------------------------------- alvo do marco (família ou gênero) e janela ativa
const FAM_IDS = new Set<string>(FAMILIES.map((f) => f.id));
const famOf = (g: string) => genreById[g]?.family as string | undefined;
const mktOf = (a: Act) => cityById[a.city]?.market;
/** o ato (gênero e sede) cabe no alvo do marco? */
export function fits19(h: H19Def, a: Act): boolean {
  if (h.mk && !h.mk.includes(mktOf(a) as never)) return false;
  if (!h.g) return true;
  const f = famOf(a.genre);
  return h.g.some((g) => g === a.genre || (FAM_IDS.has(g) && g === f));
}
/** o marco já disparou nesta partida (inclusive antes do início) e ainda vigora */
export const active19 = (s: GameState, h: H19Def): boolean => w4(s).ms[h.id] !== undefined && (h.until === undefined || s.year <= h.until);
const ACT19 = new WeakMap<GameState, { w: number; list: H19Def[] }>();
/** marcos com efeito de apelo vigentes (por semana, por partida) */
export function activeAp19(s: GameState): H19Def[] {
  const c = ACT19.get(s);
  if (c && c.w === s.week) return c.list;
  const list = H19.filter((h) => h.ap !== undefined && h.ap !== 1 && active19(s, h));
  ACT19.set(s, { w: s.week, list });
  return list;
}
const typeOk = (h: H19Def, rel: Release) => !h.ty || (h.ty === 1 ? rel.type === 'single' : rel.type !== 'single');
/** fatores de história vigentes para um lançamento (lista para o porquê) */
export function histParts19(s: GameState, rel: Release | undefined, a: Act): { h: H19Def; k: number }[] {
  return activeAp19(s).filter((h) => fits19(h, a) && (!rel || typeOk(h, rel))).map((h) => ({ h, k: h.ap! }));
}
registerMod('appeal', 'w4ms:h19', (s, value, ctx) => {
  if (!ctx.release || !ctx.act) return null;
  const ps = histParts19(s, ctx.release, ctx.act);
  if (!ps.length) return null;
  let k = 1;
  for (const p of ps) k *= p.k;
  k = clamp(k, 0.75, 1.25);
  if (Math.abs(k - 1) < 0.001) return null;
  const top = ps.slice().sort((a, b) => Math.abs(b.k - 1) - Math.abs(a.k - 1))[0];
  return { value: value * k, label: ps.length > 1 ? fmtL(l('História: {t} e mais {n}', 'History: {t} and {n} more'), { t: top.h.t, n: ps.length - 1 }) : fmtL(l('História: {t}', 'History: {t}'), { t: top.h.t }) };
});

// ---------------------------------------------------------------- texto da mecânica (gerado dos dados)
const tgtName = (g: string): L => (FAM_IDS.has(g) ? FAMILIES.find((f) => f.id === g)!.name : genreById[g]?.name ?? l(g, g));
const joinL = (xs: L[]): L => ({ pt: xs.map((x) => x.pt).join(', '), en: xs.map((x) => x.en).join(', ') });
export const KIND19: Record<HK19, { name: L; dec: L }> = {
  wave: { name: l('Onda', 'Wave'), dec: l('Decisão: surfar a onda, mandar o A&R ou deixar passar.', 'Decision: ride the wave, send A&R or let it pass.') },
  tech: { name: l('Tecnologia', 'Technology'), dec: l('Decisão: adotar cedo ou esperar o mercado decidir.', 'Decision: adopt early or wait for the market to decide.') },
  law: { name: l('Regra', 'Rule'), dec: l('Decisão: cumprir, fazer lobby ou ignorar.', 'Decision: comply, lobby or ignore.') },
  stage: { name: l('Palco', 'Stage'), dec: l('Decisão: levar um ato, patrocinar ou ficar de fora.', 'Decision: bring an act, sponsor or stay out.') },
  crisis: { name: l('Crise', 'Crisis'), dec: l('Decisão: posicionar o selo, ficar calado ou tirar os discos do mercado.', 'Decision: take a stand, keep quiet or pull records from the market.') },
  deal: { name: l('Negócio', 'Deal'), dec: l('Decisão: fechar agora, negociar duro ou recusar.', 'Decision: sign now, negotiate hard or refuse.') },
};
export function mech19(h: H19Def): L {
  const parts: L[] = [];
  if (h.ap !== undefined && h.ap !== 1) {
    const p = Math.round(Math.abs(h.ap - 1) * 100);
    const tg = h.g ? joinL(h.g.map(tgtName)) : h.ty === 1 ? l('singles', 'singles') : h.ty === 2 ? l('álbuns', 'albums') : l('todos os lançamentos', 'all releases');
    const mk = h.mk ? fmtL(l(' (atos de {m})', ' (acts from {m})'), { m: joinL(h.mk.map((m) => marketById[m].name)) }) : '';
    parts.push(fmtL(h.ap > 1 ? l('+{p}% de apelo para {g}{mk}', '+{p}% appeal for {g}{mk}') : l('−{p}% de apelo para {g}{mk}', '−{p}% appeal for {g}{mk}'), { p, g: tg, mk }));
    if (h.until) parts.push(fmtL(l('até {y}', 'until {y}'), { y: h.until }));
  }
  if (h.riv && h.riv < 1) parts.push(fmtL(l('rivais perdem {p}% do caixa', 'rivals lose {p}% of their cash'), { p: Math.round((1 - h.riv) * 100) }));
  const head = parts.length ? fmtL(l('{x}. ', '{x}. '), { x: joinL(parts) }) : l('', '');
  return { pt: head.pt + KIND19[h.k].dec.pt, en: head.en + KIND19[h.k].dec.en };
}

// ---------------------------------------------------------------- ajudantes de decisão
const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split' && a.members.length);
/** ato do jogador mais famoso que cabe no marco (ou o mais famoso de todos) */
export function actFor19(s: GameState, h: H19Def): { act?: string; fit: number } {
  const ms = mine(s).sort((a, b) => b.fame - a.fame);
  const f = ms.find((a) => fits19(h, a));
  return f ? { act: f.id, fit: 1 } : ms[0] ? { act: ms[0].id, fit: 0 } : { fit: 0 };
}
const pay = (s: GameState, h: H19Def, k: string, real: number, cat: string, memo: L) => post(s, `h19:${h.id}:${k}:${s.week}`, -money(s, real), cat, `${memo.pt}`);
const N = (pt: string, en: string): L => l(pt, en);
const outcome = (f: Fx18, h: H19Def, text: L, tone: 'good' | 'bad' | 'mixed'): L => { const r = hist19(f.s).run[h.id]; if (r) { r.out = text; r.tone = tone; } return text; };
const T2 = (f: Fx18, h: H19Def, pt: string, en: string): L => fmtL(l(pt, en), { a: f.act?.name ?? l('o selo', 'the label'), t: h.t });
const rep = (s: GameState) => s.player.reputation;

interface Opt19 { id: string; label: L; hint: L; now?: (s: GameState, h: H19Def) => void; later: (h: H19Def) => EchoSpec18[]; odds?: (s: GameState, c: Record<string, string | number>) => { p: number; why: L[] } }
const fitP = (c: Record<string, string | number>, a: number, b: number) => (Number(c.fit) ? a : b);
const actFame = (s: GameState, c: Record<string, string | number>) => s.acts[String(c.act)]?.fame ?? 20;

export const OPTS19: Record<HK19, Opt19[]> = {
  wave: [
    { id: 'ride', label: N('Surfar a onda', 'Ride the wave'), hint: N('Marketing agora no ato que mais combina; a onda pode render ou passar.', 'Marketing now on the best-fitting act; the wave may pay or pass.'),
      now: (s, h) => pay(s, h, 'ride', 1500, 'marketing', N('Onda: campanha', 'Wave: campaign')),
      odds: (_s, c) => ({ p: fitP(c, 0.65, 0.4), why: [N('Base 40%', 'Base 40%'), N('+25% se o ato for do estilo da onda', '+25% if the act fits the wave')] }),
      later: (h) => [{ in: [2, 6], p: (_s, c) => fitP(c, 0.65, 0.4), tone: 'mixed', hint: N('Ondas sobem rápido — e quebram.', 'Waves rise fast — and break.'),
        fx: (f) => { f.fame(3).fans(8).cash(2000, 'Onda: vendas', 'sales'); return outcome(f, h, T2(f, h, '{a} pegou a onda ("{t}"): fãs novos e vendas.', '{a} caught the wave ("{t}"): new fans and sales.'), 'good'); },
        miss: (f) => { f.momentum(-3); return outcome(f, h, T2(f, h, 'A onda passou antes da campanha de {a} pegar.', 'The wave passed before {a}\'s campaign caught on.'), 'mixed'); } }] },
    { id: 'scout', label: N('Mandar o A&R à cena', 'Send A&R to the scene'), hint: N('Custo baixo; contatos e reputação na cena.', 'Low cost; contacts and standing in the scene.'),
      now: (s, h) => pay(s, h, 'scout', 600, 'artist_dev', N('Onda: viagem do A&R', 'Wave: A&R trip')),
      later: (h) => [{ in: [3, 9], p: 0.6, tone: 'good', hint: N('Quem chega cedo à cena conhece todo mundo.', 'Who reaches the scene early meets everyone.'),
        fx: (f) => { f.rep('artistic', 2).rep('artists', 1).momentum(4); return outcome(f, h, N('O A&R voltou com contatos e a cena passou a respeitar o selo.', 'A&R came back with contacts and the scene began to respect the label.'), 'good'); } }] },
    { id: 'pass', label: N('Deixar passar', 'Let it pass'), hint: N('Nada agora.', 'Nothing now.'),
      later: (h) => [{ in: [4, 12], p: 0.35, tone: 'mixed', hint: N('Os rivais podem surfar no seu lugar.', 'Rivals may ride it instead.'),
        fx: (f) => { f.rep('commercial', -1).momentum(-2); return outcome(f, h, N('Um rival surfou a onda e levou os fãs novos.', 'A rival rode the wave and took the new fans.'), 'mixed'); } }] },
  ],
  tech: [
    { id: 'adopt', label: N('Adotar cedo', 'Adopt early'), hint: N('Custo agora; vantagem de pioneiro se pegar.', 'Cost now; first-mover edge if it catches on.'),
      now: (s, h) => pay(s, h, 'adopt', 1800, 'recording', N('Tecnologia nova: equipamento e testes', 'New technology: gear and tests')),
      odds: (s) => ({ p: clamp(0.45 + rep(s).commercial / 250, 0.45, 0.8), why: [N('Base 45%', 'Base 45%'), N('+ reputação comercial (lojas e parceiros seguem você)', '+ commercial reputation (stores and partners follow you)')] }),
      later: (h) => [{ in: [4, 12], p: (s) => clamp(0.45 + rep(s).commercial / 250, 0.45, 0.8), tone: 'mixed', hint: N('Pioneiro ganha — ou paga o aprendizado.', 'Pioneers win — or pay for the lesson.'),
        fx: (f) => { f.cash(3000, 'Tecnologia nova: vantagem de pioneiro', 'sales').rep('commercial', 2); return outcome(f, h, N('A aposta pegou: o selo saiu na frente com a tecnologia nova.', 'The bet paid: the label got ahead with the new technology.'), 'good'); },
        miss: (f) => { f.cash(-800, 'Tecnologia nova: ajustes caros', 'recording'); return outcome(f, h, N('A tecnologia demorou a pegar; o selo pagou o aprendizado.', 'The technology was slow to catch on; the label paid for the lesson.'), 'mixed'); } }] },
    { id: 'wait', label: N('Esperar o mercado decidir', 'Wait for the market to decide'), hint: N('Sem custo; pode chegar tarde.', 'No cost; you may arrive late.'),
      later: (h) => [{ in: [6, 18], p: 0.4, tone: 'mixed', hint: N('Quem espera economiza — e às vezes perde o bonde.', 'Waiting saves money — and sometimes misses the train.'),
        fx: (f) => { f.momentum(-2).rep('commercial', -1); return outcome(f, h, N('Os concorrentes adotaram antes e o selo ficou com cara de antigo.', 'Competitors adopted first and the label looked old-fashioned.'), 'mixed'); } }] },
  ],
  law: [
    { id: 'comply', label: N('Cumprir à risca', 'Comply to the letter'), hint: N('Custo de adaptação; ficha limpa.', 'Adjustment cost; a clean record.'),
      now: (s, h) => pay(s, h, 'comply', 800, 'legal', N('Nova regra: adaptação', 'New rule: compliance')),
      later: (h) => [{ in: [3, 9], p: 0.6, tone: 'good', hint: N('Ficha limpa abre portas.', 'A clean record opens doors.'),
        fx: (f) => { f.rep('institutional', 2); return outcome(f, h, N('O selo virou referência de quem joga pelas regras.', 'The label became the model of playing by the rules.'), 'good'); } }] },
    { id: 'lobby', label: N('Fazer lobby pela associação', 'Lobby through the association'), hint: N('Custo; a regra pode sair a seu favor.', 'Cost; the rule may come out in your favor.'),
      now: (s, h) => pay(s, h, 'lobby', 1500, 'legal', N('Lobby na associação', 'Association lobbying')),
      odds: (s) => ({ p: clamp(0.3 + rep(s).institutional / 200, 0.3, 0.75), why: [N('Base 30%', 'Base 30%'), N('+ reputação institucional', '+ institutional reputation')] }),
      later: (h) => [{ in: [3, 10], p: (s) => clamp(0.3 + rep(s).institutional / 200, 0.3, 0.75), tone: 'mixed', hint: N('Lobby às vezes funciona.', 'Lobbying sometimes works.'),
        fx: (f) => { f.cash(2500, 'Regra a favor: economia', 'other_income').rep('institutional', 2); return outcome(f, h, N('A associação conseguiu uma exceção que favorece o selo.', 'The association won an exception that favors the label.'), 'good'); },
        miss: (f) => { f.rep('institutional', -2); return outcome(f, h, N('O lobby vazou e pegou mal.', 'The lobbying leaked and looked bad.'), 'bad'); } }] },
    { id: 'ignore', label: N('Ignorar', 'Ignore'), hint: N('Nada agora; fiscais existem.', 'Nothing now; inspectors exist.'),
      later: (h) => [{ in: [4, 12], p: 0.3, tone: 'bad', hint: N('Regra ignorada pode virar multa.', 'An ignored rule may become a fine.'),
        fx: (f) => { f.cash(-1500, 'Multa por descumprir a regra', 'legal').rep('institutional', -2); return outcome(f, h, N('A fiscalização chegou: multa e advogados.', 'Enforcement came: a fine and lawyers.'), 'bad'); } }] },
  ],
  stage: [
    { id: 'book', label: N('Levar o melhor ato do selo', 'Bring the label\'s best act'), hint: N('Viagem e produção agora; uma noite pode fazer uma carreira.', 'Travel and production now; one night can make a career.'),
      now: (s, h) => pay(s, h, 'book', 1000, 'live', N('Palco histórico: viagem e produção', 'Historic stage: travel and production')),
      odds: (s, c) => ({ p: clamp(0.45 + actFame(s, c) / 250, 0.45, 0.85), why: [N('Base 45%', 'Base 45%'), N('+ fama do ato', '+ act fame')] }),
      later: (h) => [{ in: [1, 3], p: (s, c) => clamp(0.45 + actFame(s, c) / 250, 0.45, 0.85), tone: 'mixed', hint: N('Uma noite decide.', 'One night decides.'),
        fx: (f) => { f.fame(4).fans(8); return outcome(f, h, T2(f, h, '{a} brilhou no palco histórico ("{t}").', '{a} shone on the historic stage ("{t}").'), 'good'); },
        miss: (f) => { f.mood('morale', -6).fame(1); return outcome(f, h, T2(f, h, '{a} tocou numa noite fria; ninguém lembra.', '{a} played on a cold night; nobody remembers.'), 'mixed'); } }] },
    { id: 'sponsor', label: N('Patrocinar a noite', 'Sponsor the night'), hint: N('Custo; prestígio institucional.', 'Cost; institutional prestige.'),
      now: (s, h) => pay(s, h, 'sponsor', 1500, 'marketing', N('Patrocínio de palco histórico', 'Historic stage sponsorship')),
      later: (h) => [{ in: [1, 4], p: 0.7, tone: 'good', hint: N('O nome do selo no cartaz.', 'The label\'s name on the poster.'),
        fx: (f) => { f.rep('institutional', 2).rep('artistic', 1); return outcome(f, h, N('O nome do selo ficou no cartaz da noite histórica.', 'The label\'s name stayed on the historic night\'s poster.'), 'good'); } }] },
    { id: 'skip', label: N('Ficar de fora', 'Stay out'), hint: N('Nada agora.', 'Nothing now.'),
      later: (h) => [{ in: [2, 8], p: 0.3, tone: 'mixed', hint: N('Os outros vão estar lá.', 'The others will be there.'),
        fx: (f) => { f.momentum(-2); return outcome(f, h, N('Os rivais estavam lá; o selo, não.', 'Rivals were there; the label was not.'), 'mixed'); } }] },
  ],
  crisis: [
    { id: 'stand', label: N('Posicionar o selo em público', 'Take a public stand'), hint: N('Show beneficente ou nota pública; artistas lembram — o poder também.', 'A benefit show or public statement; artists remember — so does power.'),
      now: (s, h) => pay(s, h, 'stand', 1000, 'marketing', N('Show beneficente / nota pública', 'Benefit show / public statement')),
      later: (h) => [{ in: [2, 8], p: 0.6, tone: 'mixed', hint: N('Coragem tem preço e recompensa.', 'Courage has a price and a reward.'),
        fx: (f) => { f.rep('artists', 3).rep('institutional', 1).fans(3); return outcome(f, h, N('A posição do selo virou orgulho para artistas e fãs.', 'The label\'s stand became a point of pride for artists and fans.'), 'good'); },
        miss: (f) => { f.rep('institutional', -3).note(N('O governo anotou o nome do selo.', 'The government noted the label\'s name.')); return outcome(f, h, N('A posição custou caro: portas oficiais se fecharam.', 'The stand cost dearly: official doors closed.'), 'bad'); } }] },
    { id: 'quiet', label: N('Ficar calado e seguir trabalhando', 'Keep quiet and keep working'), hint: N('Nada agora; o elenco vai perguntar.', 'Nothing now; the roster will ask.'),
      later: (h) => [{ in: [3, 10], p: 0.35, tone: 'bad', hint: N('Silêncio também é resposta.', 'Silence is an answer too.'),
        fx: (f) => { f.rep('artists', -2).trust(-3); return outcome(f, h, N('Os artistas notaram o silêncio do selo.', 'The artists noticed the label\'s silence.'), 'bad'); } }] },
    { id: 'exit', label: N('Tirar os discos do mercado afetado', 'Pull records from the affected market'), hint: N('Perde vendas por um tempo; protege o elenco.', 'Lose sales for a while; protect the roster.'),
      later: (h) => [{ in: [2, 6], p: 0.5, tone: 'mixed', hint: N('Sair custa vendas — e evita problemas.', 'Leaving costs sales — and avoids trouble.'),
        fx: (f) => { f.cash(-1200, 'Mercado em crise: vendas perdidas', 'sales').mood('stress', -5); return outcome(f, h, N('O selo perdeu vendas, mas o elenco atravessou a crise em paz.', 'The label lost sales, but the roster got through the crisis in peace.'), 'mixed'); } }] },
  ],
  deal: [
    { id: 'sign', label: N('Fechar o acordo agora', 'Sign the deal now'), hint: N('Dinheiro agora; termos podem envelhecer mal.', 'Money now; terms may age badly.'),
      now: (s, h) => post(s, `h19:${h.id}:sign:${s.week}`, money(s, 2000), 'other_income', 'Acordo de época: adiantamento'),
      later: (h) => [{ in: [6, 18], p: 0.45, tone: 'mixed', hint: N('O contrato de hoje é a briga de amanhã?', 'Is today\'s contract tomorrow\'s fight?'),
        fx: (f) => { f.rep('artists', -2); return outcome(f, h, N('Os termos envelheceram mal: artistas reclamam do acordo.', 'The terms aged badly: artists complain about the deal.'), 'bad'); },
        miss: (f) => { f.cash(1000, 'Acordo: bônus de desempenho', 'other_income'); return outcome(f, h, N('O acordo rendeu um bônus de desempenho.', 'The deal paid a performance bonus.'), 'good'); } }] },
    { id: 'hold', label: N('Negociar duro', 'Negotiate hard'), hint: N('Sem dinheiro agora; aposta num acordo melhor.', 'No money now; betting on a better deal.'),
      odds: (s) => ({ p: clamp(0.35 + rep(s).commercial / 200, 0.35, 0.75), why: [N('Base 35%', 'Base 35%'), N('+ reputação comercial', '+ commercial reputation')] }),
      later: (h) => [{ in: [3, 9], p: (s) => clamp(0.35 + rep(s).commercial / 200, 0.35, 0.75), tone: 'mixed', hint: N('Quem segura pode ganhar mais — ou ficar sem nada.', 'Holding out may win more — or nothing.'),
        fx: (f) => { f.cash(3500, 'Acordo negociado: termos melhores', 'other_income').rep('commercial', 2); return outcome(f, h, N('A negociação dura rendeu um acordo melhor que o do mercado.', 'Hard bargaining won a better deal than the market\'s.'), 'good'); },
        miss: (f) => { f.momentum(-3); return outcome(f, h, N('O outro lado fechou com um rival.', 'The other side signed with a rival.'), 'mixed'); } }] },
    { id: 'pass', label: N('Recusar', 'Refuse'), hint: N('Nada agora.', 'Nothing now.'),
      later: (h) => [{ in: [4, 12], p: 0.3, tone: 'mixed', hint: N('Recusar também é posição.', 'Refusing is a stance too.'),
        fx: (f) => { f.rep('artistic', 1).momentum(-1); return outcome(f, h, N('O selo recusou; os puristas aplaudiram e o caixa nem tanto.', 'The label refused; purists applauded, the books less so.'), 'mixed'); } }] },
  ],
};
const CAT19: Record<HK19, EventDef['cat']> = { wave: 'culture', tech: 'tech', law: 'business', stage: 'career', crisis: 'world', deal: 'business' };
const ASK19: Record<HK19, L> = {
  wave: l('Uma onda nova sobe. O que o selo faz?', 'A new wave is rising. What does the label do?'),
  tech: l('Uma tecnologia nova chega. O selo entra cedo?', 'A new technology arrives. Does the label get in early?'),
  law: l('A regra do jogo mudou. Como o selo reage?', 'The rules changed. How does the label react?'),
  stage: l('Um palco histórico se abre. O selo vai estar lá?', 'A historic stage opens. Will the label be there?'),
  crisis: l('A crise atinge músicos e mercados. O selo se posiciona?', 'The crisis hits musicians and markets. Does the label take a stand?'),
  deal: l('Um negócio de época bate à porta. O selo assina?', 'A deal of the era knocks on the door. Does the label sign?'),
};

// ---------------------------------------------------------------- marcos + cartões + ecos
const EVS19: EventDef[] = [];
for (const h of H19) {
  const opts = OPTS19[h.k];
  EVS19.push({
    id: h.id, cat: CAT19[h.k], tone: h.k === 'crisis' ? 'bad' : 'neutral', tags: ['history19', h.k], cooldown: 999, forcedOnly: true,
    title: h.t, text: { pt: `${h.x.pt} ${ASK19[h.k].pt}`, en: `${h.x.en} ${ASK19[h.k].en}` },
    options: opts.map((o) => ({ id: o.id, label: o.label, hint: o.hint, apply: (s: GameState) => o.now?.(s, h) })),
  });
  for (const o of opts) registerConseq18(`ev:${h.id}:${o.id}`, { later: o.later(h), ...(o.odds ? { odds: o.odds } : {}) });
  const m: Milestone = {
    id: h.id, year: h.y, ...(h.m !== undefined ? { month: h.m } : {}), ...(h.tech ? { tech: h.tech } : {}), ...(h.until !== undefined ? { until: h.until } : {}),
    ...(h.w ? { world: true } : {}), realRef: h.ref, title: h.t, text: h.x, mech: mech19(h), event: h.id,
    onFire: (s) => fire19(s, h),
    ctx: (s): Record<string, string | number> | null => { const a = actFor19(s, h); return a.act ? { act: a.act, fit: a.fit } : s.config.role !== 'artist' ? { fit: 0 } : null; },
  };
  if (!MILESTONES.some((x) => x.id === m.id)) MILESTONES.push(m);
}
deferEvents<EventDef>(EVS19);

/** efeitos no disparo (só com a partida em andamento; marcos de antes do início são silenciosos) */
function fire19(s: GameState, h: H19Def): void {
  ACT19.delete(s);
  if (h.pop && h.g) for (const g of h.g) {
    const ids = FAM_IDS.has(g) ? GENRES.filter((x) => x.family === g).map((x) => x.id) : [g];
    for (const id of ids) if (s.genrePop[id] !== undefined) s.genrePop[id] = clamp(s.genrePop[id] + (FAM_IDS.has(g) ? h.pop / 2 : h.pop), 0.15, 2.2);
  }
  if (h.riv) for (const lb of Object.values(s.labels)) if (lb.active) lb.cash = Math.round(lb.cash * h.riv);
  emitFact(s, { kind: 'milestone_turn', actors: ['player'], severity: h.w ? 30 : 35, visibility: 'public', tags: ['history19', h.k, h.id], src: 'history19', text: fmtL(l('Marco: {t}.', 'Milestone: {t}.'), { t: h.t }) });
}

// ouvinte do fato: manchete e o mundo reage (os atos de NPC do estilo mais famosos ganham embalo; numa crise, perdem)
onFact('milestone_turn', (s, f) => {
  const h = H19_BY_ID[f.tags.find((t) => t.startsWith('h19_')) ?? ''];
  if (!h) return;
  headline19(s, h.t, h.w ? 2 : 3);
  if (!h.g) return;
  const d = h.k === 'crisis' ? -6 : 6;
  const npc = Object.values(s.acts).filter((a) => a.owner !== 'player' && a.status === 'active' && fits19(h, a)).sort((a, b) => b.fame - a.fame).slice(0, 3);
  for (const a of npc) a.momentum = clamp(a.momentum + d, -100, 100);
}, 'history19:world');

// a escolha vira memória da partida (fato real_history → Diário, ouvinte do realhist19) e fica no cartão
registerDecisionListener('history19', (s, eventId, opt) => {
  const h = H19_BY_ID[eventId];
  if (!h) return;
  const o = OPTS19[h.k].find((x) => x.id === opt);
  const pick = o?.label ?? l(opt, opt);
  hist19(s).run[h.id] = { y: s.year, opt, pick };
  emitFact(s, { kind: 'real_history', actors: ['player'], severity: 22, visibility: 'public', tags: ['history19', h.id, opt], src: 'history19', text: fmtL(l('{t}: o selo escolheu "{o}".', '{t}: the label chose "{o}".'), { t: h.t, o: pick }) });
});

/** cartões "A história real" dos marcos já disparados (mais novos primeiro); `fresh` = disparados nos últimos 12 meses de jogo */
export interface H19Card { h: H19Def; y: number; before: boolean; run?: H19Run; alt: boolean; on: boolean }
export function cards19(s: GameState, o: { fresh?: boolean } = {}): H19Card[] {
  const ms = w4(s).ms;
  const out: H19Card[] = [];
  for (const h of H19) {
    const y = ms[h.id];
    if (y === undefined) continue;
    if (o.fresh && (y < 0 || y < s.year - 1)) continue;
    out.push({ h, y: Math.abs(y), before: y < 0, run: hist19(s).run[h.id], alt: altHistory(s), on: active19(s, h) });
  }
  return out.sort((a, b) => b.h.y - a.h.y || (b.h.m ?? 0) - (a.h.m ?? 0));
}

// ---------------------------------------------------------------- porquê e conselheiro
registerExplain('hist19.ap', (s, c) => {
  const a = s.acts[String(c.act ?? '')] ?? mine(s).sort((x, y) => y.fame - x.fame)[0];
  if (!a) return null;
  const ps = histParts19(s, undefined, a);
  const parts: WhyPart[] = ps.map((p) => ({ label: p.h.t, value: p.k, fmt: 'mult', tone: p.k >= 1 ? 'good' : 'bad', note: p.h.until ? fmtL(l('vigora até {y}', 'until {y}'), { y: p.h.until }) : undefined }));
  const k = clamp(ps.reduce((m, p) => m * p.k, 1), 0.75, 1.25);
  return { title: fmtL(l('A história a favor de {a}', 'History and {a}'), { a: a.name }), value: k, fmt: 'mult', parts,
    note: l('Marcos vigentes que combinam com o gênero e a sede do ato (alguns valem só para singles ou álbuns). Teto ×0,75–×1,25; entra na família "mundo" do teto de apelo.', 'Milestones in force that match the act\'s genre and home market (some apply only to singles or albums). Capped ×0.75–×1.25; counts in the "world" family of the appeal cap.') };
});
registerAdvisorTip('history19', (s) => {
  const wave = H19.filter((h) => h.k === 'wave' && h.g && (h.ap ?? 1) > 1.04 && active19(s, h) && (w4(s).ms[h.id] ?? -1) >= s.year - 1);
  const ms = mine(s);
  const miss = wave.find((h) => !ms.some((a) => fits19(h, a)));
  if (!miss || !ms.length) return [];
  return [{ id: `h19:${miss.id}`, level: 'info', cat: 'opportunity', text: fmtL(l('Onda em alta: {t}. Nenhum ato seu é desse estilo.', 'A wave is rising: {t}. None of your acts fit it.'), { t: miss.t }),
    why: [mech19(miss)] }];
});

// ---------------------------------------------------------------- geopolítica: regimes novos (society18: censura, exílio)
const RG = (id: string, a3: string[], from: number, to: number, name: L, censor: L, exile: string[], hard?: [number, number]) => { if (!REGIMES18.some((r) => r.id === id)) REGIMES18.push({ id, a3, from, to, name, censor, exile, ...(hard ? { hard } : {}) }); };
RG('cn19', ['CHN'], 1966, 1976, l('Revolução Cultural', 'Cultural Revolution'), l('Grupo da Revolução Cultural', 'Cultural Revolution Group'), ['hong_kong', 'taipei'], [1966, 1971]);
RG('cu19', ['CUB'], 1961, 1991, l('Governo revolucionário (Cuba)', 'Revolutionary government (Cuba)'), l('Instituto da Rádio e Televisão', 'Radio and Television Institute'), ['miami', 'new_york', 'madrid']);
RG('id19', ['IDN'], 1959, 1965, l('Democracia guiada (Indonésia)', 'Guided democracy (Indonesia)'), l('Campanha contra o "ngak-ngik-ngok"', 'The anti-"ngak-ngik-ngok" campaign'), ['singapore', 'amsterdam']);
RG('mm19', ['MMR'], 1962, 2011, l('Junta militar (Birmânia)', 'Military junta (Burma)'), l('Comissão de censura', 'Censorship board'), ['bangkok']);
RG('tr19', ['TUR'], 1980, 1983, l('Governo militar (Turquia)', 'Military government (Turkey)'), l('Conselho de Segurança Nacional', 'National Security Council'), ['berlin', 'paris']);
RG('dz19', ['DZA'], 1992, 2002, l('Década negra (Argélia)', 'Black decade (Algeria)'), l('Ameaças de grupos armados', 'Threats from armed groups'), ['paris', 'marseille']);
RG('kh19', ['KHM'], 1975, 1979, l('Khmer Vermelho', 'Khmer Rouge'), l('Angkar', 'Angkar'), ['paris']);
RG('hk19', ['HKG'], 2020, 9999, l('Lei de segurança nacional (Hong Kong)', 'National security law (Hong Kong)'), l('Escritório de segurança nacional', 'National security office'), ['london', 'taipei']);
RG('af19', ['AFG'], 1996, 2001, l('Talibã', 'Taliban'), l('Ministério da Promoção da Virtude', 'Ministry for the Promotion of Virtue'), ['london']);

// ---------------------------------------------------------------- tributo: flag T (db19 §3.1 K) — marcada nos dados e lida pelo tribute19
const K19 = new Set(TRIB_K19.map(norm19));
let marked19 = false;
/** marca `T` nos dados reais (adiado: realworld pode ainda não ter avaliado no ciclo de imports) */
export function markT19(): void {
  if (marked19 || !Array.isArray(REAL_ALL)) return;
  marked19 = true;
  for (const a of REAL_ALL) if (K19.has(norm19(a.n))) a.T = true;
}
try { markT19(); } catch { /* ciclo de imports: fica para o microtask */ }
queueMicrotask(() => { try { markT19(); } catch { /* idem */ } });
/** artista propenso a tributo/cover (flag T do RealArtist ou nome do catálogo clássico na lista K) */
export function tribProne19(a: Act): boolean {
  markT19();
  const d = realDataOf(a);
  return !!d && (('T' in d && d.T === true) || K19.has(norm19(d.n)));
}
TRIB19_T.f = tribProne19;
