// R31 · onda 3 (CAR) — PROGRESSÃO, OBJETIVOS E FIM DE JOGO DAS 12 CARREIRAS (interruptor car31.prog).
//
// Cada carreira tem degraus (da tabela do plano: "selo pequeno → independente forte → major", "uma rádio → rede →
// grupo de mídia"…), medidos pelo estado do jogo (puro: a mesma conta para a tela e para o mês). Cada degrau traz o
// objetivo para o próximo. O DESAFIO DE FIM DE JOGO só aparece quando você chega ao último degrau: um choque mecânico
// (a tensão central da carreira vira conflito de verdade) e uma meta medida em 12 meses; cumprir dá prestígio,
// falhar custa. Sorte só por semente; desafio com data entra no calendário.

import { addClientTrust9, clientTrust9 } from './ventures9';
import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerDeadline, type Deadline19 } from '../calendar19';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { opine } from '../opinion';
import { registerEditable, registerRunnable } from '../r31/editor';
import type { GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { car31On, touch31 } from './car31';
import { mediaVentures31, stRo31 } from './car31media';

export type Car31 = 'label' | 'musician' | 'manager' | 'booking' | 'venue' | 'festival' | 'studio' | 'publisher' | 'media' | 'platform' | 'critic' | 'screen';
export const CARS31: Car31[] = ['label', 'musician', 'manager', 'booking', 'venue', 'festival', 'studio', 'publisher', 'media', 'platform', 'critic', 'screen'];

// ---------------------------------------------------------------- leitura sem criar

type AnyRec = Record<string, unknown>;
const x4 = (s: GameState): AnyRec => ((s as unknown as { x4?: AnyRec }).x4 ?? {});
interface V9 { id: string; kind: string; level: number; rep: number; sound?: number; subs?: number; deals?: string[]; clients?: { actId: string }[]; cat?: unknown[]; editions?: { crowd: number; verdict: string; y: number }[] }
const vl = (s: GameState): V9[] => ((x4(s).ventures9 as { list?: V9[] } | undefined)?.list ?? []);
const vk = (s: GameState, k: string): V9[] => vl(s).filter((v) => v.kind === k);
const mg = (s: GameState): { clients: { actId: string }[] } => ((x4(s).ventures9 as { mg?: { clients: { actId: string }[] } } | undefined)?.mg ?? { clients: [] });
const band = (s: GameState) => (s.player.bandActId ? s.acts[s.player.bandActId] : undefined);
const press = (s: GameState) => x4(s).press18 as { stage: number; cred: number } | undefined;
const screen = (s: GameState) => x4(s).screen18 as { rep: number; list: { st: string }[] } | undefined;
const house = (s: GameState) => (x4(s).venues27 as { v?: Record<string, { built?: { kind: string }; prog?: { neigh: number; branches: unknown[] } }> } | undefined)?.v?.['lv:venue']; // UNI-4: registro único das casas
const venue = (s: GameState) => house(s)?.built ?? null;
const v12 = (s: GameState) => house(s)?.prog ?? null;
const avgShare = (s: GameState): number => { const vs = mediaVentures31(s); return vs.length ? vs.reduce((t, v) => t + stRo31(s, v).share, 0) / vs.length : 0; };

// ---------------------------------------------------------------- definições

export interface Def31 {
  tiers: L[];
  /** pontuação contínua e limites de cada degrau (mesmo tamanho de tiers; o primeiro é 0) */
  score: (s: GameState) => number;
  at: number[];
  /** objetivo para chegar ao degrau i (i ≥ 1) */
  goal: L[];
  /** tensão central (RN-22) */
  tension: L;
  end: { name: L; desc: L; metric: (s: GameState) => number; shock: (s: GameState) => void; ok: (s: GameState, base: number) => boolean; target: (base: number) => L };
}
const n0 = (n: number) => Math.round(n);
export const DEF31: Record<Car31, Def31> = {
  label: {
    tiers: [l('Selo pequeno', 'Small label'), l('Independente forte', 'Strong indie'), l('Major', 'Major')], at: [0, 6, 14],
    score: (s) => playerActs(s).length,
    goal: [l('', ''), l('Ter 6 artistas no elenco', 'Have 6 acts on the roster'), l('Ter 14 artistas no elenco', 'Have 14 acts on the roster')],
    tension: l('Arte × mercado: o disco que você ama ou o que vende.', 'Art × market: the record you love or the one that sells.'),
    end: { name: l('Segurar as estrelas', 'Keep the stars'), desc: l('Rivais atacam o seu elenco e o formato muda: o embalo cai. Termine o ano com tantos artistas fortes quanto tem hoje.', 'Rivals go after your roster and the format shifts: momentum drops. End the year with as many strong acts as you have today.'),
      metric: (s) => playerActs(s).filter((id) => (s.acts[id]?.fame ?? 0) >= 50).length,
      shock: (s) => { for (const id of playerActs(s)) { const a = s.acts[id]; if (a) a.momentum = clamp(a.momentum - 15, 0, 100); } },
      ok: (s, b) => DEF31.label.end.metric(s) >= b, target: (b) => fmtL(l('{n} artista(s) com fama 50 ou mais', '{n} act(s) with fame 50 or more'), { n: b }) },
  },
  musician: {
    tiers: [l('Garagem', 'Garage'), l('Bar', 'Bar'), l('Contrato', 'Signed'), l('Estádio', 'Stadium'), l('Lenda', 'Legend')], at: [0, 15, 30, 60, 85],
    score: (s) => band(s)?.fame ?? 0,
    goal: [l('', ''), l('Fama 15 com a sua banda', 'Fame 15 with your band'), l('Fama 30', 'Fame 30'), l('Fama 60', 'Fame 60'), l('Fama 85', 'Fame 85')],
    tension: l('Criar × fazer turnê × viver: o tempo e o corpo são finitos.', 'Create × tour × live: time and body are finite.'),
    end: { name: l('Envelhecer no palco', 'Growing old on stage'), desc: l('O público novo olha para outros: o embalo cai. Reinvente-se e mantenha a fama em 12 meses.', 'The new crowd looks elsewhere: momentum drops. Reinvent yourself and hold your fame for 12 months.'),
      metric: (s) => band(s)?.fame ?? 0, shock: (s) => { const b = band(s); if (b) b.momentum = clamp(b.momentum - 20, 0, 100); },
      ok: (s, b) => (band(s)?.fame ?? 0) >= b - 3, target: (b) => fmtL(l('Fama da banda de pelo menos {n}', 'Band fame of at least {n}'), { n: n0(b - 3) }) },
  },
  manager: {
    tiers: [l('Um cliente', 'One client'), l('Escritório', 'Office'), l('Agência com vários empresários', 'Agency with several managers')], at: [0, 3, 6],
    score: (s) => mg(s).clients.length,
    goal: [l('', ''), l('Representar 3 clientes', 'Represent 3 clients'), l('Representar 6 clientes', 'Represent 6 clients')],
    tension: l('O interesse do cliente × o seu: comissão, agenda e lealdade.', 'Client\'s interest × yours: commission, schedule and loyalty.'),
    end: { name: l('Clientes disputando a mesma vaga', 'Clients fighting for the same slot'), desc: l('O cliente menos satisfeito recebe proposta de um empresário rival. Não perca ninguém em 12 meses.', 'Your least satisfied client gets an offer from a rival manager. Lose no one in 12 months.'),
      metric: (s) => mg(s).clients.length,
      shock: (s) => { const c = [...mg(s).clients].sort((a, b) => clientTrust9(s, a.actId) - clientTrust9(s, b.actId) || (a.actId < b.actId ? -1 : 1))[0]; if (c) addClientTrust9(s, c.actId, -25); }, // UNI-4: satisfação = confiança
      ok: (s, b) => mg(s).clients.length >= b, target: (b) => fmtL(l('{n} cliente(s)', '{n} client(s)'), { n: b }) },
  },
  booking: {
    tiers: [l('Rotas regionais', 'Regional routes'), l('Rotas nacionais', 'National routes'), l('Rotas mundiais', 'World routes')], at: [0, 3, 6],
    score: (s) => vk(s, 'booking').reduce((t, v) => t + (v.clients?.length ?? 0), 0) + new Set(Object.values(((x4(s).car31x as { tgt?: Record<string, string> } | undefined)?.tgt) ?? {})).size,
    goal: [l('', ''), l('Clientes e mercados-alvo somando 3', 'Clients and target markets adding up to 3'), l('Clientes e mercados-alvo somando 6', 'Clients and target markets adding up to 6')],
    tension: l('Encher a agenda × cansar o artista; casa cheia × cambismo.', 'Fill the schedule × wear out the act; full rooms × scalping.'),
    end: { name: l('A promotora gigante', 'The giant promoter'), desc: l('Uma promotora gigante fecha casas exclusivas: sua agência perde prestígio. Mantenha todos os clientes em 12 meses.', 'A giant promoter locks venues into exclusives: your agency loses standing. Keep every client for 12 months.'),
      metric: (s) => vk(s, 'booking').reduce((t, v) => t + (v.clients?.length ?? 0), 0), shock: (s) => { for (const v of vk(s, 'booking')) v.rep = clamp(v.rep - 10, 0, 100); },
      ok: (s, b) => DEF31.booking.end.metric(s) >= b, target: (b) => fmtL(l('{n} cliente(s) na agência', '{n} agency client(s)'), { n: b }) },
  },
  venue: {
    tiers: [l('Bar', 'Bar'), l('Casa média', 'Mid-size venue'), l('Arena', 'Arena'), l('Rede de casas', 'Venue chain')], at: [0, 2, 3, 4],
    score: (s) => { const v = venue(s); return v ? (v.kind === 'arena' ? 3 : v.kind === 'theater' ? 2 : 1) + Math.min(3, v12(s)?.branches.length ?? 0) : 0; },
    goal: [l('', ''), l('Ter um teatro (casa média)', 'Own a theatre (mid-size)'), l('Ter uma arena', 'Own an arena'), l('Abrir filiais (rede)', 'Open branches (chain)')],
    tension: l('Artista novo esvazia a casa, mas dá prestígio; o bairro reclama do barulho.', 'New acts empty the room but bring prestige; the neighbourhood complains about noise.'),
    end: { name: l('Vizinhança e prefeitura', 'Neighbours and city hall'), desc: l('A prefeitura aperta o alvará e os vizinhos se organizam. Termine o ano com a vizinhança em paz (50 ou mais).', 'City hall tightens the permit and neighbours organise. End the year with the neighbourhood at peace (50 or more).'),
      metric: (s) => v12(s)?.neigh ?? 0, shock: (s) => { const x = v12(s); if (x) x.neigh = clamp(x.neigh - 20, 0, 100); },
      ok: (s) => (v12(s)?.neigh ?? 0) >= 50, target: () => l('Vizinhança 50 ou mais', 'Neighbourhood 50 or more') },
  },
  festival: {
    tiers: [l('Festival de bairro', 'Neighbourhood festival'), l('Festival nacional', 'National festival'), l('Festival lendário', 'Legendary festival')], at: [0, 20000, 60000],
    score: (s) => { let m = 0; for (const v of vk(s, 'festival')) for (const e of v.editions ?? []) m = Math.max(m, e.crowd + (e.verdict === 'legend' ? 60000 : 0)); return m; },
    goal: [l('', ''), l('Uma edição com 20 mil pessoas', 'An edition with 20,000 people'), l('Uma edição lendária (ou 60 mil pessoas)', 'A legendary edition (or 60,000 people)')],
    tension: l('Headliner caro vende ingresso; revelação barata dá prestígio e arrisca a procura.', 'An expensive headliner sells tickets; a cheap breakout brings prestige and risks demand.'),
    end: { name: l('A edição que dá errado', 'The edition that goes wrong'), desc: l('Clima, segurança e um line-up disputado: faça a próxima edição sem desastre e com nota 60 ou mais.', 'Weather, security and a contested line-up: run the next edition with no disaster and a rating of 60 or more.'),
      metric: (s) => s.year, shock: () => {},
      ok: (s, b) => vk(s, 'festival').some((v) => (v.editions ?? []).some((e) => e.y >= b && e.verdict !== 'disaster' && e.verdict !== 'flop')), target: () => l('Edição sem desastre nem fracasso', 'An edition with no disaster or flop') },
  },
  studio: {
    tiers: [l('Estúdio caseiro', 'Home studio'), l('Estúdio de referência', 'Reference studio'), l('Produtor-assinatura', 'Signature producer')], at: [0, 80, 150],
    score: (s) => Math.max(0, ...vk(s, 'studio').map((v) => v.level * 20 + (v.sound ?? 0))),
    goal: [l('', ''), l('Estúdio com nível e som somando 80', 'Studio level and sound adding up to 80'), l('Somando 150', 'Adding up to 150')],
    tension: l('Assinatura que vende × som que envelhece; estúdio cheio × recusar clientes.', 'A signature that sells × a sound that ages; a full studio × turning clients away.'),
    end: { name: l('Som datado', 'A dated sound'), desc: l('A era do estúdio caseiro chega e o seu som envelhece. Recupere a reputação do estúdio em 12 meses.', 'The home-studio era arrives and your sound ages. Win back the studio\'s reputation within 12 months.'),
      metric: (s) => Math.max(0, ...vk(s, 'studio').map((v) => v.rep)), shock: (s) => { for (const v of vk(s, 'studio')) v.sound = clamp((v.sound ?? 0) - 15, 0, 100); },
      ok: (s, b) => DEF31.studio.end.metric(s) >= b, target: (b) => fmtL(l('Reputação do estúdio {n} ou mais', 'Studio reputation {n} or more'), { n: n0(b) }) },
  },
  publisher: {
    tiers: [l('Poucos compositores', 'A few writers'), l('Catálogo grande', 'Big catalog'), l('Comprador de catálogos históricos', 'Buyer of historic catalogs')], at: [0, 15, 40],
    score: (s) => vk(s, 'publisher').reduce((t, v) => t + (v.cat?.length ?? 0), 0),
    goal: [l('', ''), l('15 obras no catálogo', '15 works in the catalog'), l('40 obras no catálogo', '40 works in the catalog')],
    tension: l('Dar a canção a um nome grande (vende, pode estragar) × a um novo (arrisca, cria parceiro).', 'Give the song to a big name (sells, may ruin it) × to a newcomer (risky, builds a partner).'),
    end: { name: l('Disputa de direitos', 'Rights dispute'), desc: l('Um herdeiro contesta autorias e o catálogo envelhece. Cresça o catálogo em 5 obras em 12 meses.', 'An heir contests authorship and the catalog ages. Grow the catalog by 5 works in 12 months.'),
      metric: (s) => DEF31.publisher.score(s), shock: (s) => { for (const v of vk(s, 'publisher')) v.rep = clamp(v.rep - 8, 0, 100); },
      ok: (s, b) => DEF31.publisher.score(s) >= b + 5, target: (b) => fmtL(l('{n} obras no catálogo', '{n} works in the catalog'), { n: b + 5 }) },
  },
  media: {
    tiers: [l('Uma rádio', 'One station'), l('Rede', 'Network'), l('Grupo de mídia', 'Media group')], at: [0, 5, 9],
    score: (s) => vk(s, 'media').length * 2 + Math.max(0, ...vk(s, 'media').map((v) => v.level)),
    goal: [l('', ''), l('Dois veículos ou um em nível alto (rede)', 'Two outlets or one at a high level (network)'), l('Vários veículos grandes (grupo de mídia)', 'Several big outlets (media group)')],
    tension: l('Sucesso segura audiência; aposta dá prestígio; jabá dá dinheiro e cadeia.', 'Hits hold the audience; bets bring prestige; payola brings money and jail.'),
    end: { name: l('A queda do rádio', 'Radio\'s decline'), desc: l('A nova mídia leva ouvintes e uma lei aperta a programação: a audiência cai. Recupere pelo menos 85% dela em 12 meses.', 'New media takes listeners and a law tightens programming: the audience falls. Win back at least 85% of it in 12 months.'),
      metric: avgShare, shock: (s) => { const m = (x4(s).car31m as { st?: Record<string, { share: number }> } | undefined)?.st ?? {}; for (const k of Object.keys(m)) m[k].share = Math.round(m[k].share * 0.8 * 10000) / 10000; touch31(s); },
      ok: (s, b) => avgShare(s) >= b * 0.85, target: (b) => fmtL(l('Audiência média de {p}%', 'Average audience of {p}%'), { p: Math.round(b * 85) / 10 }) },
  },
  platform: {
    tiers: [l('Startup', 'Startup'), l('Plataforma nacional', 'National platform'), l('Plataforma global', 'Global platform')], at: [0, 1_000_000, 20_000_000],
    score: (s) => vk(s, 'platform').reduce((t, v) => t + (v.subs ?? 0), 0),
    goal: [l('', ''), l('1 milhão de assinantes', '1 million subscribers'), l('20 milhões de assinantes', '20 million subscribers')],
    tension: l('Repasse justo × margem; curadoria × gravadoras que exigem vagas.', 'Fair payouts × margin; curation × labels demanding slots.'),
    end: { name: l('Gravadoras e regulação', 'Labels and regulation'), desc: l('Um regulador questiona os repasses e a confiança dos artistas cai. Não perca acordos de catálogo em 12 meses.', 'A regulator questions payouts and artists\' trust drops. Lose no catalog deal in 12 months.'),
      metric: (s) => vk(s, 'platform').reduce((t, v) => t + (v.deals?.length ?? 0), 0),
      shock: (s) => { const p = (x4(s).ventures12 as { plat?: Record<string, { trust: number }> } | undefined)?.plat ?? {}; for (const k of Object.keys(p)) p[k].trust = clamp(p[k].trust - 10, 0, 100); },
      ok: (s, b) => DEF31.platform.end.metric(s) >= b, target: (b) => fmtL(l('{n} acordo(s) de catálogo', '{n} catalog deal(s)'), { n: b }) },
  },
  critic: {
    tiers: [l('Frila', 'Freelancer'), l('Editor', 'Editor'), l('Dono do veículo', 'Outlet owner'), l('Cânone', 'Canon')], at: [0, 2, 3, 4],
    score: (s) => { const p = press(s); return p ? p.stage + (p.stage >= 3 && p.cred >= 80 ? 1 : 0) : 0; },
    goal: [l('', ''), l('Chegar a editor', 'Become an editor'), l('Ter o próprio veículo', 'Own your outlet'), l('Credibilidade 80 com veículo próprio', 'Credibility 80 with your own outlet')],
    tension: l('Credibilidade × acesso: falar mal fecha portas; suborno abre e destrói.', 'Credibility × access: bad reviews close doors; bribes open them and destroy you.'),
    end: { name: l('Credibilidade × acesso', 'Credibility × access'), desc: l('Um selo grande corta o seu acesso depois de uma resenha dura. Recupere a credibilidade em 12 meses.', 'A big label cuts your access after a harsh review. Win back your credibility within 12 months.'),
      metric: (s) => press(s)?.cred ?? 0, shock: (s) => { const p = press(s); if (p) p.cred = clamp(p.cred - 8, 0, 100); },
      ok: (s, b) => (press(s)?.cred ?? 0) >= b, target: (b) => fmtL(l('Credibilidade {n} ou mais', 'Credibility {n} or more'), { n: n0(b) }) },
  },
  screen: {
    tiers: [l('Comerciais', 'Commercials'), l('Filmes', 'Films'), l('Grandes estúdios', 'Big studios')], at: [0, 3, 8],
    score: (s) => (screen(s)?.list ?? []).filter((c) => c.st === 'done').length,
    goal: [l('', ''), l('3 trilhas entregues', '3 scores delivered'), l('8 trilhas entregues', '8 scores delivered')],
    tension: l('O diretor quer a trilha; o selo quer o single; o prazo não espera.', 'The director wants the score; the label wants the single; the deadline won\'t wait.'),
    end: { name: l('Diretor × selo', 'Director × label'), desc: l('Um grande estúdio exige prazo curto e música de catálogo. Entregue mais uma trilha em 12 meses.', 'A big studio demands a tight deadline and catalog music. Deliver one more score within 12 months.'),
      metric: (s) => DEF31.screen.score(s), shock: (s) => { const x = screen(s); if (x) x.rep = clamp(x.rep - 8, 0, 100); },
      ok: (s, b) => DEF31.screen.score(s) >= b + 1, target: (b) => fmtL(l('{n} trilhas entregues', '{n} scores delivered'), { n: b + 1 }) },
  },
};

// ---------------------------------------------------------------- estado

export interface End31 { c: Car31; w0: number; due: number; base: number; res?: 'ok' | 'fail' }
export interface Prog31State { t: Partial<Record<Car31, number>>; end: End31[]; last: Partial<Record<Car31, number>> }
declare module '../ext4' { interface Ext4 { car31g: Prog31State } }
const fresh = (): Prog31State => ({ t: {}, end: [], last: {} });
registerExt4('car31g', fresh);
export const progRo31 = (s: GameState): Prog31State => (x4(s).car31g as Prog31State | undefined) ?? fresh();
function pg(s: GameState): Prog31State {
  const x = ((s as unknown as { x4: AnyRec }).x4 ??= {});
  const st = (x.car31g ??= fresh()) as Prog31State;
  st.t ??= {}; st.end ??= []; st.last ??= {};
  return st;
}
export const activeCars31 = (s: GameState): Car31[] => ((x4(s).careers12 as { active?: string[] } | undefined)?.active ?? []).filter((c): c is Car31 => (CARS31 as string[]).includes(c));

/** degrau atual (0..n−1), pela pontuação. */
export function tierOf31(s: GameState, c: Car31): number {
  const d = DEF31[c], v = d.score(s);
  let t = 0;
  for (let i = 1; i < d.at.length; i++) if (v >= d.at[i]) t = i;
  return t;
}
export interface View31 { c: Car31; tier: number; name: L; next?: L; score: number; top: boolean; end?: End31; tension: L }
export function progView31(s: GameState, c: Car31): View31 {
  const d = DEF31[c], t = tierOf31(s, c);
  const end = progRo31(s).end.find((e) => e.c === c && !e.res);
  return { c, tier: t, name: d.tiers[t], next: d.goal[t + 1], score: d.score(s), top: t === d.tiers.length - 1, end, tension: d.tension };
}

// ---------------------------------------------------------------- mês

function monthProg(s: GameState): void {
  const st = pg(s);
  for (const c of activeCars31(s)) {
    const d = DEF31[c], t = tierOf31(s, c);
    if (t > (st.t[c] ?? 0)) {
      st.t[c] = t;
      emitFact(s, { kind: 'career_step', actors: ['player'], severity: 35, tags: ['car31', 'career', c], src: 'car31',
        text: fmtL(l('Nova etapa na carreira: {n}.', 'New career stage: {n}.'), { n: d.tiers[t] }), notify: { kind: 'good', cat: 'business' }, diary: { important: t === d.tiers.length - 1 } });
    }
    const open = st.end.find((e) => e.c === c && !e.res);
    if (open) {
      if (s.week < open.due) continue;
      open.res = d.end.ok(s, open.base) ? 'ok' : 'fail';
      st.last[c] = s.week;
      const ok = open.res === 'ok';
      s.player.reputation.institutional = clamp(s.player.reputation.institutional + (ok ? 4 : -4), 0, 100);
      opine(s, 'w:artists', ok ? 3 : -2, ok ? fmtL(l('superou "{n}"', 'overcame "{n}"'), { n: d.end.name }) : fmtL(l('não superou "{n}"', 'did not overcome "{n}"'), { n: d.end.name }));
      emitFact(s, { kind: ok ? 'endgame_ok' : 'endgame_fail', actors: ['player'], severity: ok ? 55 : 45, tags: ['car31', 'career', c, ok ? 'good' : 'bad'], src: 'car31',
        text: fmtL(ok ? l('Desafio de fim de jogo vencido: {n}.', 'Endgame challenge won: {n}.') : l('Desafio de fim de jogo perdido: {n}.', 'Endgame challenge lost: {n}.'), { n: d.end.name }),
        notify: { kind: ok ? 'good' : 'bad', cat: 'business', prio: 2 }, diary: { important: true } });
      continue;
    }
    if (t !== d.tiers.length - 1) continue;
    if ((st.last[c] ?? -999) > s.week - 156) continue; // um desafio a cada três anos no máximo
    if (!Rng.fromSeed(`${s.config.seed}|car31|end|${c}|${s.year}|${s.month}`).chance(0.15)) continue;
    const base = d.end.metric(s);
    d.end.shock(s);
    st.end.push({ c, w0: s.week, due: s.week + 52, base });
    if (st.end.length > 24) st.end.splice(0, st.end.length - 24);
    st.last[c] = s.week;
    emitFact(s, { kind: 'endgame_start', actors: ['player'], severity: 55, tags: ['car31', 'career', c], src: 'car31',
      text: fmtL(l('Desafio de fim de jogo: {n}. {d} Meta: {m}.', 'Endgame challenge: {n}. {d} Goal: {m}.'), { n: d.end.name, d: d.end.desc, m: d.end.target(base) }),
      notify: { kind: 'bad', cat: 'business', prio: 2 }, diary: { important: true } });
  }
}
registerSimHook('month', 'car31prog', (s) => { if (car31On(s, 'prog')) monthProg(s); });

registerDeadline('car31prog', (s, from, to) => {
  const out: Deadline19[] = [];
  for (const e of progRo31(s).end) if (!e.res && e.due >= from && e.due <= to)
    out.push({ id: `car31e:${e.c}:${e.w0}`, w: e.due, kind: 'other', tone: 'bad', act: true, t: fmtL(l('Fim do prazo: {n}', 'Deadline: {n}'), { n: DEF31[e.c].end.name }), d: DEF31[e.c].end.target(e.base), goto: { area: 'car31' } });
  return out;
});

registerRunnable({
  id: 'car31.prog.force', area: 'careers', label: l('Começar agora o desafio de fim de jogo de uma carreira', 'Start a career\'s endgame challenge now'),
  arg: { kind: 'select', label: l('Carreira', 'Career'), def: 'media', options: () => CARS31.map((c) => ({ value: c, label: DEF31[c].tiers[DEF31[c].tiers.length - 1] })) },
  run: (s, _t, arg) => {
    const c = String(arg ?? 'media') as Car31;
    const d = DEF31[c];
    if (!d) return l('Carreira inválida.', 'Invalid career.');
    if (progRo31(s).end.some((e) => e.c === c && !e.res)) return l('Já há um desafio aberto.', 'A challenge is already open.');
    const base = d.end.metric(s);
    d.end.shock(s);
    pg(s).end.push({ c, w0: s.week, due: s.week + 52, base });
    return fmtL(l('Desafio "{n}" começou.', 'Challenge "{n}" started.'), { n: d.end.name });
  },
});
registerEditable({
  id: 'car31.prog.media', area: 'careers', label: l('Degrau alcançado na carreira de mídia (0–2)', 'Step reached in the media career (0–2)'), kind: 'number', min: 0, max: 2, step: 1, raw: true,
  get: (s) => progRo31(s).t.media ?? 0, set: (s, v) => { pg(s).t.media = clamp(Math.round(Number(v)), 0, 2); },
});
