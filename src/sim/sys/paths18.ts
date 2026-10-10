// Rodada 18 (long18, feedback #15 + U4/U7) — VÁRIAS FORMAS DE VENCER.
// Caminhos de sucesso com indicadores próprios (selo independente sustentável, grande empresa comercial, catálogo
// duradouro, artista com autonomia, festival respeitado, estúdio especializado, empresário de estrelas, selo cult de
// prestígio, rede ao vivo): cada um tem 4 KPIs com meta, 3 marcos narrativos (35/65/90 pontos), final próprio e
// pontuação de legado. O jogador escolhe o caminho (ou o jogo detecta o mais forte) e fixa até 3 metas ativas.
// DOUTRINAS (Frostpunk): leis do selo em pares exclusivos que dão e tiram (perks com retorno decrescente), travam
// ações (menu de pessoa "sujo", pacote de contrato abusivo, venda de catálogo) e destravam DECISÕES DO SELO (menu
// sazonal com requisito, custo, prazo e consequência, junto com as decisões grandes de intrigue.ts).
// Conquistas narrativas ("1967: primeiro disco de ouro do selo — 'X' de Y"). Sem sorteio próprio.

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { fin18, opProfit18, sumP18 } from '../ledger18';
import { bumpPerks, registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import { registerPAGate18 } from '../personact18';
import type { GameState, Release } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { capital } from './capital';
import { DECISIONS, intrigue } from './intrigue';
import { liveOf } from './live/state';
import { ownerOf } from './people/owner';
import { pol18, burn18 } from './policy18';
import { catVal18 } from './rights18';
import { noteLost18 } from './econ18';
import { catFundBid } from './sale17';
import { ventures } from './ventures9';

// ---------------------------------------------------------------- estado

export type PathId = 'indie' | 'major' | 'catalog' | 'artist' | 'festival' | 'studio' | 'manager' | 'prestige' | 'live';
export interface Ach18 { id: string; y: number; t: L }
export interface Paths18State {
  chosen: PathId | null;
  /** caminho detectado (maior pontuação, com histerese) */
  main: PathId | null;
  /** até 3 caminhos fixados como metas ativas */
  pins: PathId[];
  /** marco já atingido por caminho (0–3) e quando */
  tier: Partial<Record<PathId, number>>;
  /** pontos de legado acumulados pelos marcos */
  pts: number;
  /** histórico anual de pontuação por caminho */
  hist: { y: number; v: Partial<Record<PathId, number>> }[];
  ach: Ach18[];
  doc: Record<string, number>;
  docLast: number;
  dec: Record<string, number>;
  /** efeitos temporários de decisões (chave → semana final) */
  tmp: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { paths18: Paths18State } }
const fresh = (): Paths18State => ({ chosen: null, main: null, pins: [], tier: {}, pts: 0, hist: [], ach: [], doc: {}, docLast: -999, dec: {}, tmp: {} });
registerExt4('paths18', fresh);
export const pa18 = (s: GameState): Paths18State => {
  const x = s.x4 as unknown as { paths18?: Paths18State };
  return (x.paths18 ??= fresh());
};

// ---------------------------------------------------------------- dados

const yr = (s: GameState, y: number): Record<string, number> | undefined => fin18(s).y[y];
/** receita operacional real (US$ de hoje) de um ano; cai na receita bruta antiga quando não há DRE */
export const opRevReal18 = (s: GameState, y: number): number => toReal(yr(s, y) ? sumP18(yr(s, y), 'rev:') : s.player.revenueByYear[y] ?? 0, y);
export const opProfReal18 = (s: GameState, y: number): number => toReal(yr(s, y) ? opProfit18(yr(s, y)) : s.player.profitByYear[y] ?? 0, y);
const mineRels = (s: GameState): Release[] => Object.values(s.releases).filter((r) => (r.owner === 'player' || s.acts[r.actId]?.playerBand) && !r.hist);
const vl = (s: GameState, k: string) => ventures(s).list.filter((v) => v.kind === k && v.owner);
const band = (s: GameState) => (s.player.bandActId ? s.acts[s.player.bandActId] : Object.values(s.acts).find((a) => a.playerBand));
const roster = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a) => a && !a.playerBand && a.status !== 'retired');

export interface Kpi18 { label: L; v: number; target: number; fmt: 'num' | 'pct' | 'usd' | 'mo'; why: L }
export interface PathDef18 { id: PathId; name: L; desc: L; icon: string; kpis: (s: GameState) => Kpi18[]; tiers: [L, L, L]; ending: [L, L, L, L]; relevant: (s: GameState) => boolean }

const K = (label: L, v: number, target: number, fmt: Kpi18['fmt'], why: L): Kpi18 => ({ label, v, target, fmt, why });

export const PATHS18: PathDef18[] = [
  { id: 'indie', icon: 'vinyl', name: l('Selo independente sustentável', 'Sustainable independent label'), desc: l('Pequeno, sem dono nem dívida, que paga as contas todo ano e é bom lugar para artista ficar.', 'Small, owned by no one and debt-free, pays its bills every year and is a good home for artists.'),
    relevant: () => true,
    kpis: (s) => {
      const ys = [1, 2, 3].map((d) => s.year - d).filter((y) => y >= s.config.startYear);
      const ok = ys.filter((y) => opProfReal18(s, y) > 0).length;
      const ros = roster(s);
      const trust = ros.length ? ros.reduce((t, a) => t + a.trust, 0) / ros.length : 0;
      const debt = s.player.loans.length + capital(s).investors.length;
      return [
        K(l('Anos com lucro operacional (últimos 3)', 'Years with operating profit (last 3)'), ok, 3, 'num', l('Lucro operacional: receita da música menos custos, sem empréstimos nem aportes.', 'Operating profit: music revenue minus costs, excluding loans and investment.')),
        K(l('Fôlego de caixa', 'Cash runway'), s.player.cash / Math.max(1, burn18(s)), 12, 'mo', l('Caixa ÷ custo fixo mensal.', 'Cash ÷ monthly fixed cost.')),
        K(l('Confiança média do elenco', 'Average roster trust'), trust, 70, 'num', l('Artistas que confiam renovam e indicam outros.', 'Trusting acts renew and refer others.')),
        K(l('Independência (sem dívida/sócio)', 'Independence (no debt/partner)'), clamp(100 - debt * 25, 0, 100), 100, 'pct', l('Cada empréstimo ou investidor tira 25 pontos.', 'Each loan or investor costs 25 points.')),
      ];
    },
    tiers: [l('Pagando as contas', 'Paying the bills'), l('Selo que se sustenta', 'A self-sustaining label'), l('Independente para sempre', 'Independent forever')],
    ending: [l('O selo não conseguiu se sustentar sozinho.', 'The label could not sustain itself.'), l('Um selo pequeno que pagou as contas e manteve a porta aberta.', 'A small label that paid its bills and kept the door open.'), l('Décadas sem dono nem dívida: o selo que os artistas recomendavam aos amigos.', 'Decades with no owner and no debt: the label artists recommended to their friends.'), l('Independente para sempre: lucro todo ano, elenco fiel e nenhum credor na porta — virou modelo de como fazer.', 'Independent forever: profit every year, a loyal roster and no creditor at the door — it became the model of how to do it.')] },
  { id: 'major', icon: 'building', name: l('Grande empresa comercial', 'Big commercial company'), desc: l('Escala: fatia de mercado, receita, territórios e um elenco grande.', 'Scale: market share, revenue, territories and a big roster.'),
    relevant: () => true,
    kpis: (s) => [
      K(l('Fatia de mercado', 'Market share'), s.stats.marketShare * 100, 15, 'pct', l('Suas unidades ÷ unidades do mercado no ano.', 'Your units ÷ market units this year.')),
      K(l('Receita operacional (último ano)', 'Operating revenue (last year)'), opRevReal18(s, s.year - 1), 5_000_000, 'usd', l('Em US$ de hoje.', 'In today\'s US$.')),
      K(l('Territórios', 'Territories'), s.player.territories.length, 6, 'num', l('Mercados com operação própria.', 'Markets with your own operation.')),
      K(l('Artistas no elenco', 'Acts on the roster'), roster(s).length, 12, 'num', l('Atos sob contrato.', 'Acts under contract.')),
    ],
    tiers: [l('Distribuição nacional', 'National distribution'), l('Potência comercial', 'Commercial powerhouse'), l('Major', 'Major')],
    ending: [l('A empresa nunca ganhou escala.', 'The company never scaled.'), l('Uma gravadora grande no seu país.', 'A big label in its home country.'), l('Uma potência comercial que dita as paradas.', 'A commercial powerhouse that sets the charts.'), l('Uma major: territórios, catálogo e o elenco que todos queriam.', 'A major: territories, catalog and the roster everyone wanted.')] },
  { id: 'catalog', icon: 'archive', name: l('Catálogo duradouro (editora/masters)', 'Lasting catalog (publishing/masters)'), desc: l('Músicas e gravações que rendem por décadas: renda recorrente, clássicos e edição.', 'Songs and recordings that earn for decades: recurring income, classics and publishing.'),
    relevant: () => true,
    kpis: (s) => {
      const old = mineRels(s).filter((r) => s.year - r.year >= 3);
      const cv = old.length ? catVal18(s, old, true) : { annual: 0, value: 0 };
      const songs = vl(s, 'publisher').reduce((t, v) => t + (v.cat?.length ?? 0), 0);
      return [
        K(l('Renda anual do catálogo antigo (3+ anos)', 'Annual income of old catalog (3+ yrs)'), toReal(cv.annual, s.year), 400_000, 'usd', l('O que discos com 3 anos ou mais ainda rendem por ano (rights18).', 'What records 3+ years old still earn per year (rights18).')),
        K(l('Clássicos (5+ anos, 100 mil+ unidades)', 'Classics (5+ yrs, 100k+ units)'), old.filter((r) => s.year - r.year >= 5 && r.totalUnits >= 100_000).length, 8, 'num', l('Discos antigos que viraram referência.', 'Old records that became references.')),
        K(l('Obras na sua editora', 'Songs in your publisher'), songs, 80, 'num', l('Catálogo de composições administrado.', 'Administered song catalog.')),
        K(l('Relançamentos', 'Reissues'), s.player.reissues, 8, 'num', l('Reedições e coletâneas lançadas.', 'Reissues and compilations released.')),
      ];
    },
    tiers: [l('Primeiro catálogo', 'First catalog'), l('Catálogo que paga o aluguel', 'A catalog that pays the rent'), l('Cofre de clássicos', 'A vault of classics')],
    ending: [l('O catálogo não sobreviveu à própria época.', 'The catalog did not outlive its era.'), l('Algumas músicas ainda tocam e pagam algumas contas.', 'A few songs still play and pay some bills.'), l('Um catálogo que rende sozinho, ano após ano.', 'A catalog that earns on its own, year after year.'), l('Um cofre de clássicos: cada geração redescobre suas músicas.', 'A vault of classics: every generation rediscovers its songs.')] },
  { id: 'artist', icon: 'guitar', name: l('Artista com autonomia', 'Artist with autonomy'), desc: l('Sua banda, sua obra: fama, fãs fiéis, masters próprios e dinheiro no seu nome.', 'Your band, your work: fame, loyal fans, your own masters and money in your name.'),
    relevant: (s) => !!band(s),
    kpis: (s) => {
      const b = band(s);
      const c = b?.contractId ? s.contracts[b.contractId] : undefined;
      const aut = !b ? 0 : !c || c.party === 'player' ? 100 : c.creativeControl ? 60 : 20;
      return [
        K(l('Fama da sua banda', 'Your band\'s fame'), b?.fame ?? 0, 75, 'num', l('Alcance 0–100.', 'Reach 0–100.')),
        K(l('Fãs fiéis', 'Core fans'), b?.fans.core ?? 0, 30_000, 'num', l('Os que compram ingresso e disco sempre.', 'Those who always buy tickets and records.')),
        K(l('Autonomia', 'Autonomy'), aut, 100, 'pct', l('100 = masters próprios; 60 = selo alheio com controle criativo; 20 = sem controle.', '100 = own masters; 60 = someone else\'s label with creative control; 20 = no control.')),
        K(l('Patrimônio pessoal', 'Personal wealth'), toReal(ownerOf(s).wealth, s.year), 1_000_000, 'usd', l('Seu dinheiro, fora da empresa.', 'Your money, outside the company.')),
      ];
    },
    tiers: [l('Nome na cena', 'A name in the scene'), l('Carreira própria', 'A career of one\'s own'), l('Dono da própria obra', 'Owner of one\'s own work')],
    ending: [l('A banda não passou da garagem.', 'The band never left the garage.'), l('Uma carreira honesta, com público fiel.', 'An honest career with a loyal audience.'), l('Uma carreira própria, longe das vontades dos selos.', 'A career of its own, far from labels\' whims.'), l('Dono da própria obra: fama, fãs e cada master no próprio nome.', 'Owner of its own work: fame, fans and every master in its own name.')] },
  { id: 'festival', icon: 'star', name: l('Festival respeitado', 'Respected festival'), desc: l('Curadoria com reputação: edições que lotam, line-ups lembrados, conta que fecha.', 'Curation with a reputation: sold-out editions, remembered line-ups, books that balance.'),
    relevant: (s) => vl(s, 'festival').length > 0,
    kpis: (s) => {
      const fs = vl(s, 'festival'), eds = fs.flatMap((f) => f.editions ?? []);
      const good = eds.length ? eds.filter((e) => e.verdict === 'legend' || e.verdict === 'ok').length / eds.length : 0;
      const last = eds[eds.length - 1];
      return [
        K(l('Reputação do melhor festival', 'Best festival reputation'), Math.max(0, ...fs.map((f) => f.rep)), 85, 'num', l('Curadoria, público e imprensa.', 'Curation, crowd and press.')),
        K(l('Edições realizadas', 'Editions held'), eds.length, 10, 'num', l('Tradição conta.', 'Tradition counts.')),
        K(l('Edições bem avaliadas', 'Well-reviewed editions'), good * 100, 80, 'pct', l('Veredito "ok" ou "lenda".', '"OK" or "legend" verdict.')),
        K(l('Última edição no azul', 'Last edition in the black'), last && last.profit > 0 ? 100 : 0, 100, 'pct', l('Festival que dá prejuízo não dura.', 'Festivals that lose money do not last.')),
      ];
    },
    tiers: [l('Festival no mapa', 'A festival on the map'), l('Curadoria respeitada', 'Respected curation'), l('Festival lendário', 'Legendary festival')],
    ending: [l('O festival não firmou data no calendário.', 'The festival never found its place on the calendar.'), l('Um festival querido pela cena local.', 'A festival loved by the local scene.'), l('Uma curadoria que lança tendências.', 'A curation that sets trends.'), l('Um festival lendário: estar no line-up virou credencial.', 'A legendary festival: being on the line-up became a credential.')] },
  { id: 'studio', icon: 'mixer', name: l('Estúdio especializado', 'Specialized studio'), desc: l('Um som da casa que artistas de todo selo vêm buscar.', 'A house sound artists from every label come looking for.'),
    relevant: (s) => vl(s, 'studio').length > 0,
    kpis: (s) => {
      const st = vl(s, 'studio');
      return [
        K(l('Reputação do estúdio', 'Studio reputation'), Math.max(0, ...st.map((v) => v.rep)), 85, 'num', l('O que a indústria fala da sala.', 'What the industry says about the room.')),
        K(l('Som da casa', 'House sound'), Math.max(0, ...st.map((v) => v.sound ?? 0)), 80, 'num', l('Identidade sonora reconhecível.', 'A recognizable sonic identity.')),
        K(l('Sessões de terceiros', 'Outside sessions'), st.reduce((t, v) => t + (v.booked ?? []).reduce((a, b) => a + b.n, 0), 0), 40, 'num', l('Selos que reservaram a sala.', 'Labels that booked the room.')),
        K(l('Anos de casa aberta', 'Years open'), Math.max(0, ...st.map((v) => s.year - v.founded)), 10, 'num', l('Estúdio é reputação acumulada.', 'A studio is accumulated reputation.')),
      ];
    },
    tiers: [l('Sala de respeito', 'A respected room'), l('Som da casa', 'A house sound'), l('Estúdio lendário', 'Legendary studio')],
    ending: [l('O estúdio fechou as portas.', 'The studio closed its doors.'), l('Uma sala confiável para quem conhece.', 'A reliable room for those in the know.'), l('Um som da casa que se reconhece no rádio.', 'A house sound you recognize on the radio.'), l('Um estúdio lendário: discos de todas as gerações saíram dali.', 'A legendary studio: records of every generation came out of it.')] },
  { id: 'manager', icon: 'handshake', name: l('Empresário de estrelas', 'Star-maker manager'), desc: l('Representar quem importa, com reputação e comissões.', 'Represent those who matter, with reputation and commissions.'),
    relevant: (s) => ventures(s).mg.clients.length > 0,
    kpis: (s) => {
      const mg = ventures(s).mg, cl = mg.clients.map((c) => s.acts[c.actId]).filter(Boolean);
      return [
        K(l('Reputação de empresário', 'Manager reputation'), mg.rep, 80, 'num', l('Clientes satisfeitos falam bem.', 'Happy clients talk.')),
        K(l('Clientes', 'Clients'), cl.length, 6, 'num', l('Artistas representados.', 'Represented acts.')),
        K(l('Fama média dos clientes', 'Clients\' average fame'), cl.length ? cl.reduce((t, a) => t + a.fame, 0) / cl.length : 0, 60, 'num', l('Estrelas atraem estrelas.', 'Stars attract stars.')),
        K(l('Comissões acumuladas', 'Commissions to date'), toReal(mg.total, s.year), 800_000, 'usd', l('Total recebido.', 'Total received.')),
      ];
    },
    tiers: [l('Primeiros clientes', 'First clients'), l('Empresário requisitado', 'Sought-after manager'), l('Fazedor de estrelas', 'Star-maker')],
    ending: [l('Os clientes foram embora.', 'The clients walked away.'), l('Um empresário de confiança.', 'A trusted manager.'), l('O telefone que todo artista quer ter.', 'The phone number every artist wants.'), l('Fazedor de estrelas: carreiras inteiras passaram pelas suas mãos.', 'Star-maker: whole careers passed through your hands.')] },
  { id: 'prestige', icon: 'trophy', name: l('Selo cult de prestígio', 'Cult prestige label'), desc: l('Crítica, prêmios e lendas: pouco volume, muita influência.', 'Critics, awards and legends: little volume, lots of influence.'),
    relevant: () => true,
    kpis: (s) => {
      const last = mineRels(s).filter((r) => r.critic !== undefined && (r.criticN ?? 0) > 0).slice(-10);
      return [
        K(l('Reputação artística', 'Artistic reputation'), s.player.reputation.artistic, 85, 'num', l('Como a crítica e os pares veem o selo.', 'How critics and peers see the label.')),
        K(l('Prêmios', 'Awards'), s.player.stats.awards, 10, 'num', l('Prêmios do selo.', 'Label awards.')),
        K(l('Nota média da crítica (10 últimos)', 'Average critic score (last 10)'), last.length ? last.reduce((t, r) => t + (r.critic ?? 0), 0) / last.length : 0, 75, 'num', l('Média 0–100.', 'Average 0–100.')),
        K(l('Lendas no elenco', 'Legends on the roster'), Object.values(s.acts).filter((a) => a.legend && (a.owner === 'player' || a.playerBand)).length, 2, 'num', l('Atos que viraram lenda com você.', 'Acts that became legends with you.')),
      ];
    },
    tiers: [l('Selo de nicho', 'Niche label'), l('Selo cult', 'Cult label'), l('Referência artística', 'Artistic reference')],
    ending: [l('Ninguém lembra do selo.', 'Nobody remembers the label.'), l('Colecionadores ainda procuram seus discos.', 'Collectors still hunt for its records.'), l('Um selo cult: o logotipo na capa já era garantia.', 'A cult label: the logo on the sleeve was a guarantee.'), l('Referência artística: a história da música cita o selo em cada capítulo.', 'Artistic reference: music history cites the label in every chapter.')] },
  { id: 'live', icon: 'stage', name: l('Rede ao vivo', 'Live network'), desc: l('Shows como negócio: palcos, turnês, agenciamento.', 'Shows as a business: stages, tours, booking.'),
    relevant: (s) => !!liveOf(s).venue || vl(s, 'booking').length > 0 || s.player.stats.headlines > 0,
    kpis: (s) => {
      const t = s.player.totals, all = Math.max(1, (t.sales ?? 0) + (t.live ?? 0) + (t.publishing ?? 0));
      return [
        K(l('Peso do ao vivo na receita', 'Live share of revenue'), ((t.live ?? 0) / all) * 100, 40, 'pct', l('Shows ÷ (vendas + shows + edição), acumulado.', 'Shows ÷ (sales + shows + publishing), cumulative.')),
        K(l('Casa de shows própria', 'Own venue'), liveOf(s).venue ? 100 : 0, 100, 'pct', l('Um palco para chamar de seu.', 'A stage to call your own.')),
        K(l('Shows como atração principal', 'Headline shows'), s.player.stats.headlines, 25, 'num', l('Headlines de festival e turnê.', 'Festival and tour headlines.')),
        K(l('Clientes de agenciamento', 'Booking clients'), vl(s, 'booking').reduce((n, v) => n + (v.clients?.length ?? 0), 0), 5, 'num', l('Atos que sua agência roteia.', 'Acts your agency routes.')),
      ];
    },
    tiers: [l('Circuito local', 'Local circuit'), l('Rede de palcos', 'A network of stages'), l('Império ao vivo', 'Live empire')],
    ending: [l('Os palcos ficaram vazios.', 'The stages went dark.'), l('Um nome forte no circuito local.', 'A strong name on the local circuit.'), l('Uma rede de palcos e turnês que move a cena.', 'A network of stages and tours that drives the scene.'), l('Império ao vivo: metade dos shows do país passa por você.', 'Live empire: half the country\'s shows go through you.')] },
];
export const pathDef18 = (id: string): PathDef18 | undefined => PATHS18.find((p) => p.id === id);
export const TIER_AT = [35, 65, 90];

/** Pontuação 0–100 do caminho = média do progresso dos KPIs (cada um até a meta). */
export function pathScore18(s: GameState, id: PathId): { score: number; kpis: Kpi18[] } {
  const d = pathDef18(id);
  if (!d) return { score: 0, kpis: [] };
  let kpis: Kpi18[] = [];
  try { kpis = d.kpis(s); } catch { kpis = []; }
  const score = kpis.length ? (kpis.reduce((t, k) => t + clamp(k.v / Math.max(1e-9, k.target), 0, 1), 0) / kpis.length) * 100 : 0;
  return { score: Math.round(score), kpis };
}
export function allScores18(s: GameState): { id: PathId; score: number }[] {
  return PATHS18.filter((p) => p.relevant(s) || pa18(s).chosen === p.id).map((p) => ({ id: p.id, score: pathScore18(s, p.id).score })).sort((a, b) => b.score - a.score);
}
export const mainPath18 = (s: GameState): PathId | null => pa18(s).chosen ?? pa18(s).main;
export const tierOf = (score: number): number => TIER_AT.filter((x) => score >= x).length;

export function choosePath18(s: GameState, id: PathId | null): void {
  const P = pa18(s);
  P.chosen = id;
  if (id && !P.pins.includes(id)) P.pins = [id, ...P.pins].slice(0, 3);
  bumpPerks();
}
export function pinPath18(s: GameState, id: PathId): void {
  const P = pa18(s);
  P.pins = P.pins.includes(id) ? P.pins.filter((x) => x !== id) : [...P.pins, id].slice(-3);
}

/** Legado por caminho: melhor caminho + 30% do segundo + pontos de marcos (chamado na saga). */
export function legacy18(s: GameState): { total: number; best: PathId | null; parts: { id: PathId; score: number }[] } {
  const sc = allScores18(s);
  const m = mainPath18(s);
  const best = m ? sc.find((x) => x.id === m) ?? sc[0] : sc[0];
  const second = sc.find((x) => x !== best);
  return { total: Math.round((best?.score ?? 0) + (second?.score ?? 0) * 0.3 + pa18(s).pts), best: best?.id ?? null, parts: sc };
}
export const pathEnding18 = (s: GameState, id: PathId): L => pathDef18(id)!.ending[tierOf(pathScore18(s, id).score)];

// ---------------------------------------------------------------- doutrinas (leis do selo)

export interface Doctrine18 { id: string; branch: 'artists' | 'money' | 'art' | 'ethics' | 'catalog'; name: L; desc: L; excl: string; cost: number; perks: PerkValues; locks: L; unlocks: string[]; adopt: (s: GameState) => L }
const rosterTrust = (s: GameState, d: number) => { for (const a of roster(s)) a.trust = clamp(a.trust + d, 0, 100); };
export const DOCTRINES18: Doctrine18[] = [
  { id: 'fair_deal', branch: 'artists', excl: 'iron_contract', cost: 3000, name: l('Contrato justo', 'Fair deal'), desc: l('Royalty limpo, contas em dia, nada de "major clássico".', 'Clean royalties, timely statements, no "classic major" deals.'),
    perks: { trust: 5, offer: 0.04, valuation: -0.03 }, locks: l('Trava o pacote "Major clássico" nas suas propostas.', 'Locks the "Classic major" package in your offers.'), unlocks: ['artists_fund'],
    adopt: (s) => { rosterTrust(s, 3); return l('O elenco comemora: confiança +3.', 'The roster celebrates: trust +3.'); } },
  { id: 'iron_contract', branch: 'artists', excl: 'fair_deal', cost: 3000, name: l('Contrato de ferro', 'Iron contract'), desc: l('Tudo recuperável, cruzado, master para sempre. Margem máxima.', 'Everything recoupable, cross-collateralized, masters forever. Maximum margin.'),
    perks: { offer: -0.04, advance: -0.08, valuation: 0.05, morale: -1 }, locks: l('Trava os pacotes "Pró-artista" e "Licença" nas suas propostas.', 'Locks the "Artist-friendly" and "License" packages in your offers.'), unlocks: ['squeeze'],
    adopt: (s) => { rosterTrust(s, -4); return l('Os empresários espalham o aviso: confiança do elenco −4.', 'Managers spread the word: roster trust −4.'); } },
  { id: 'prudence', branch: 'money', excl: 'growth', cost: 2000, name: l('Reserva sagrada', 'Sacred reserve'), desc: l('Nunca abaixo de 4 meses de custo fixo; sócios e bancos confiam.', 'Never below 4 months of fixed costs; partners and banks trust you.'),
    perks: { valuation: 0.06, appeal: -0.02 }, locks: l('A política de reserva fica travada em no mínimo 4 meses.', 'The reserve policy is locked at 4 months minimum.'), unlocks: ['emergency_fund'],
    adopt: (s) => { const P = pol18(s); P.reserve = Math.max(P.reserve, 4); return l('A equipe delegada não gasta abaixo de 4 meses de custo fixo.', 'Delegated staff won\'t spend below 4 months of fixed costs.'); } },
  { id: 'growth', branch: 'money', excl: 'prudence', cost: 2000, name: l('Crescer a qualquer custo', 'Growth at any cost'), desc: l('Dinheiro parado é dinheiro perdido: mais verba, mais gente, mais risco.', 'Idle money is lost money: more budget, more people, more risk.'),
    perks: { appeal: 0.03, staffCost: 0.06, stress: 0.06 }, locks: l('Sem reserva mínima (a política de reserva é zerada).', 'No minimum reserve (the reserve policy is cleared).'), unlocks: ['market_blitz'],
    adopt: (s) => { pol18(s).reserve = 0; return l('Reserva zerada; a equipe acelera.', 'Reserve cleared; staff speeds up.'); } },
  { id: 'craft', branch: 'art', excl: 'hits', cost: 2500, name: l('Arte primeiro', 'Art first'), desc: l('O disco certo, não o disco rápido.', 'The right record, not the quick one.'),
    perks: { critics: 0.3, songQ: 0.6, appeal: -0.03 }, locks: l('Trava a decisão "Acampamento de hits".', 'Locks the "Hit camp" decision.'), unlocks: ['masterclass'],
    adopt: () => l('A crítica nota a mudança.', 'Critics notice the change.') },
  { id: 'hits', branch: 'art', excl: 'craft', cost: 2500, name: l('Fábrica de hits', 'Hit factory'), desc: l('Refrão em 30 segundos, single a cada estação.', 'Chorus in 30 seconds, a single every season.'),
    perks: { appeal: 0.04, chartUnits: 0.03, critics: -0.3 }, locks: l('Trava a decisão "Masterclass".', 'Locks the "Masterclass" decision.'), unlocks: ['hit_camp'],
    adopt: () => l('As rádios agradecem; a crítica torce o nariz.', 'Radio thanks you; critics sneer.') },
  { id: 'clean', branch: 'ethics', excl: 'anything', cost: 1500, name: l('Código de ética', 'Code of ethics'), desc: l('Sem jabá, sem ameaça, sem detetive.', 'No payola, no threats, no private eyes.'),
    perks: { reputation: 1, trust: 3, offer: 0.02 }, locks: l('Trava as ações "sujas" do menu de pessoa (ameaçar, subornar, detetive, crimes).', 'Locks the "dirty" person actions (threaten, bribe, detective, crimes).'), unlocks: ['transparency'],
    adopt: (s) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100); return l('Reputação institucional +3.', 'Institutional reputation +3.'); } },
  { id: 'anything', branch: 'ethics', excl: 'clean', cost: 1500, name: l('Vale-tudo', 'Anything goes'), desc: l('É uma indústria dura. Joga-se como ela é.', 'It\'s a tough industry. Play it as it is.'),
    perks: { scheme: 0.15, reputation: -1 }, locks: l('Trava a decisão "Relatório de transparência".', 'Locks the "Transparency report" decision.'), unlocks: ['dirty_tricks'],
    adopt: (s) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100); return l('Reputação institucional −3.', 'Institutional reputation −3.'); } },
  { id: 'vault', branch: 'catalog', excl: 'churn', cost: 2000, name: l('Guardião do catálogo', 'Catalog keeper'), desc: l('Masters não se vendem; metadados limpos; reedições caprichadas.', 'Masters are not for sale; clean metadata; careful reissues.'),
    perks: { metadata: 0.12, valuation: 0.05 }, locks: l('Trava a decisão "Vender parte do catálogo".', 'Locks the "Sell part of the catalog" decision.'), unlocks: ['anniversary_box'],
    adopt: () => l('Os herdeiros dos artistas aprovam.', 'The artists\' heirs approve.') },
  { id: 'churn', branch: 'catalog', excl: 'vault', cost: 2000, name: l('Lançamento contínuo', 'Constant release'), desc: l('O próximo disco paga o anterior; catálogo é moeda.', 'The next record pays for the last; catalog is currency.'),
    perks: { chartUnits: 0.03, stress: 0.05 }, locks: l('Trava a decisão "Box de aniversário".', 'Locks the "Anniversary box" decision.'), unlocks: ['catalog_sale'],
    adopt: () => l('O elenco sente o ritmo apertar.', 'The roster feels the pace tighten.') },
];
export const docById18 = (id: string) => DOCTRINES18.find((d) => d.id === id);
export const hasDoc18 = (s: GameState, id: string): boolean => pa18(s).doc[id] !== undefined;
export const DOC_GAP = 26;

export function docBlock18(s: GameState, d: Doctrine18): L | null {
  const P = pa18(s);
  if (hasDoc18(s, d.id)) return l('Já em vigor.', 'Already in force.');
  if (hasDoc18(s, d.excl)) return fmtL(l('Incompatível com "{d}" (revogue antes).', 'Incompatible with "{d}" (revoke first).'), { d: docById18(d.excl)!.name });
  if (s.week - P.docLast < DOC_GAP) return fmtL(l('Uma lei por semestre: próxima na semana {w}.', 'One law per semester: next in week {w}.'), { w: P.docLast + DOC_GAP });
  if (s.player.cash < money(s, d.cost)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function adoptDoc18(s: GameState, id: string): L | null {
  const d = docById18(id);
  if (!d) return l('Doutrina desconhecida.', 'Unknown doctrine.');
  const b = docBlock18(s, d);
  if (b) return b;
  const P = pa18(s);
  post(s, `doc18:${id}:${s.week}`, -money(s, d.cost), 'misc', `Doutrina ${d.name.pt}`);
  P.doc[id] = s.week;
  P.docLast = s.week;
  const fx = d.adopt(s);
  bumpPerks();
  const t = fmtL(l('{c} adota a doutrina "{d}". {x}', '{c} adopts the "{d}" doctrine. {x}'), { c: s.config.companyName, d: d.name, x: fx });
  remember(s, 'doctrine', t, { important: true });
  emitFact(s, { kind: 'doctrine', actors: ['player'], severity: 35, visibility: 'public', tags: [d.id === 'iron_contract' || d.id === 'anything' ? 'bad' : 'good'], text: t, src: 'paths18', data: { doc: id } });
  notify(s, t, 'event');
  return null;
}
export function revokeDoc18(s: GameState, id: string): L | null {
  const P = pa18(s), d = docById18(id);
  if (!d || !hasDoc18(s, id)) return l('Não está em vigor.', 'Not in force.');
  if (s.week - P.doc[id] < 52) return l('Uma doutrina precisa de um ano antes de ser revogada.', 'A doctrine needs a year before it can be revoked.');
  delete P.doc[id];
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
  rosterTrust(s, -1);
  bumpPerks();
  remember(s, 'doctrine', fmtL(l('Doutrina "{d}" revogada (credibilidade −2).', '"{d}" doctrine revoked (credibility −2).'), { d: d.name }));
  return null;
}

registerPerkSource('paths18', (s) => {
  const P = pa18(s), out: PerkEntry[] = [];
  for (const id of Object.keys(P.doc)) { const d = docById18(id); if (d) out.push({ label: fmtL(l('Doutrina: {d}', 'Doctrine: {d}'), { d: d.name }), values: d.perks }); }
  for (const [k, until] of Object.entries(P.tmp)) {
    if (until < s.week) continue;
    const x = TMP18[k];
    if (x) out.push({ label: x.label, values: x.v });
  }
  return out;
});
const TMP18: Record<string, { label: L; v: PerkValues }> = {
  masterclass: { label: l('Masterclass (decisão do selo)', 'Masterclass (label decision)'), v: { songQ: 1 } },
  hit_camp: { label: l('Acampamento de hits (decisão do selo)', 'Hit camp (label decision)'), v: { chartUnits: 0.06, appeal: 0.03 } },
  market_blitz: { label: l('Blitz de mercado (decisão do selo)', 'Market blitz (label decision)'), v: { appeal: 0.08 } },
  artists_fund: { label: l('Fundo dos artistas', 'Artists\' fund'), v: { morale: 2, stress: -0.05 } },
};
// contrato: doutrinas travam pacotes (nota impossível com o motivo à vista)
registerOfferMod('paths18', (s, _a, o) => {
  const pkg = (o as { clauses18?: { pkg: string } }).clauses18?.pkg;
  if (!pkg) return null;
  if (hasDoc18(s, 'fair_deal') && pkg === 'major') return { delta: -1, reason: l('Doutrina "Contrato justo": o selo não oferece "Major clássico".', '"Fair deal" doctrine: the label does not offer "Classic major".') };
  if (hasDoc18(s, 'iron_contract') && (pkg === 'artist' || pkg === 'license')) return { delta: -1, reason: l('Doutrina "Contrato de ferro": sem pacotes pró-artista.', '"Iron contract" doctrine: no artist-friendly packages.') };
  return null;
});
registerPAGate18((s, def) => (hasDoc18(s, 'clean') && def.group === 'dark' ? l('Doutrina "Código de ética": o selo não faz isso.', '"Code of ethics" doctrine: the label does not do this.') : null));

// ---------------------------------------------------------------- decisões do selo (U4)

export interface LabelDec18 { id: string; name: L; desc: L; cost: (s: GameState) => number; needs?: string; lockedBy?: string; months?: number[]; cooldown: number; when?: (s: GameState) => L | null; run: (s: GameState) => L }
const deadline = (months: number[]): L => fmtL(l('Só em {m}', 'Only in {m}'), { m: months.map((m) => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m]).join('/') });
export const LABEL_DECS18: LabelDec18[] = [
  { id: 'artists_fund', needs: 'fair_deal', cooldown: 52, name: l('Fundo dos artistas', 'Artists\' fund'), desc: l('Plano de saúde e adiantamento emergencial: moral +2/mês e menos estresse por 1 ano; confiança +5.', 'Health plan and emergency advances: morale +2/mo and less stress for 1 year; trust +5.'),
    cost: (s) => money(s, 4000 + roster(s).length * 1500), run: (s) => { pa18(s).tmp.artists_fund = s.week + 52; rosterTrust(s, 5); return l('Fundo criado: o elenco se sente cuidado.', 'Fund created: the roster feels cared for.'); } },
  { id: 'squeeze', needs: 'iron_contract', cooldown: 52, name: l('Apertar o recuperável', 'Squeeze the recoupable'), desc: l('Cobra no extrato tudo que o contrato permite: entra caixa agora (10% dos saldos a recuperar), confiança −8 e risco de auditoria.', 'Charge everything the deal allows: cash now (10% of unrecouped balances), trust −8 and audit risk.'),
    cost: () => 0, when: (s) => (roster(s).some((a) => (s.contracts[a.contractId ?? '']?.recoupBalance ?? 0) > 0) ? null : l('Ninguém com saldo a recuperar.', 'No one with an unrecouped balance.')),
    run: (s) => {
      let got = 0;
      for (const a of roster(s)) { const c = s.contracts[a.contractId ?? '']; if (c && c.recoupBalance > 0) { const v = Math.round(c.recoupBalance * 0.1); got += v; a.trust = clamp(a.trust - 8, 0, 100); } }
      post(s, `squeeze18:${s.week}`, got, 'other_income', 'Recuperável apertado');
      emitFact(s, { kind: 'statement', actors: ['player'], severity: 40, visibility: 'rumor', tags: ['bad'], text: l('Artistas reclamam de extratos "criativos" no selo.', 'Acts complain about "creative" statements at the label.'), src: 'paths18' });
      return fmtL(l('Entraram {v}; o elenco ficou desconfiado.', '{v} came in; the roster grew suspicious.'), { v: `$${Math.round(toReal(got, s.year))}` });
    } },
  { id: 'emergency_fund', needs: 'prudence', cooldown: 104, name: l('Fundo de emergência', 'Emergency fund'), desc: l('Anuncia a reserva aos sócios e bancos: confiança dos investidores +10 e reputação institucional +3.', 'Announce the reserve to partners and banks: investor confidence +10 and institutional reputation +3.'),
    cost: (s) => money(s, 1000), when: (s) => (s.player.cash >= burn18(s) * 6 ? null : l('Precisa de 6 meses de custo fixo em caixa.', 'Needs 6 months of fixed costs in cash.')),
    run: (s) => { capital(s).confidence = clamp(capital(s).confidence + 10, 0, 100); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100); return l('Bancos e sócios respiram aliviados.', 'Banks and partners breathe easy.'); } },
  { id: 'market_blitz', needs: 'growth', cooldown: 52, name: l('Blitz de mercado', 'Market blitz'), desc: l('Três meses de divulgação pesada em tudo: apelo +8% em todos os lançamentos.', 'Three months of heavy promotion on everything: +8% appeal on all releases.'),
    cost: (s) => money(s, 15000 + roster(s).length * 3000), run: (s) => { pa18(s).tmp.market_blitz = s.week + 13; return l('Outdoors, rádio, TV: o selo está em todo lugar.', 'Billboards, radio, TV: the label is everywhere.'); } },
  { id: 'masterclass', needs: 'craft', lockedBy: 'hits', cooldown: 52, months: [0, 1, 6, 7], name: l('Masterclass', 'Masterclass'), desc: l('Mestres convidados nas férias: +1 de qualidade nas músicas por 6 meses.', 'Guest masters during the break: +1 song quality for 6 months.'),
    cost: (s) => money(s, 6000), run: (s) => { pa18(s).tmp.masterclass = s.week + 26; return l('O elenco volta das aulas afiado.', 'The roster comes back sharp.'); } },
  { id: 'hit_camp', needs: 'hits', lockedBy: 'craft', cooldown: 52, months: [2, 3, 8, 9], name: l('Acampamento de hits', 'Hit camp'), desc: l('Compositores profissionais por 2 semanas: apelo +3% e paradas +6% por 6 meses.', 'Pro songwriters for 2 weeks: +3% appeal and +6% chart units for 6 months.'),
    cost: (s) => money(s, 8000), run: (s) => { pa18(s).tmp.hit_camp = s.week + 26; return l('Saíram refrões para um ano inteiro.', 'Choruses for a whole year came out.'); } },
  { id: 'transparency', needs: 'clean', lockedBy: 'anything', cooldown: 104, months: [11], name: l('Relatório de transparência', 'Transparency report'), desc: l('Publica royalties, cachês e contratos-padrão: reputação institucional +6, artística +2.', 'Publish royalties, fees and standard deals: institutional reputation +6, artistic +2.'),
    cost: (s) => money(s, 2000), run: (s) => { const r = s.player.reputation; r.institutional = clamp(r.institutional + 6, 0, 100); r.artistic = clamp(r.artistic + 2, 0, 100); emitFact(s, { kind: 'statement', actors: ['player'], severity: 30, visibility: 'public', tags: ['good'], text: fmtL(l('{c} publica seus contratos-padrão e royalties.', '{c} publishes its standard deals and royalties.'), { c: s.config.companyName }), src: 'paths18' }); return l('A imprensa elogia; rivais ficam sem graça.', 'Press praises it; rivals look awkward.'); } },
  { id: 'dirty_tricks', needs: 'anything', lockedBy: 'clean', cooldown: 52, name: l('Campanha suja contra o maior rival', 'Smear campaign against the top rival'), desc: l('Plantar notas e "vazamentos": o rival perde força por 1 ano (chance de virar escândalo seu: 30%).', 'Plant stories and "leaks": the rival weakens for a year (30% chance it becomes your scandal).'),
    cost: (s) => money(s, 10000), when: (s) => (Object.values(s.labels).some((x) => x.active && x.id !== 'player') ? null : l('Sem rival ativo.', 'No active rival.')),
    run: (s) => {
      const rv = Object.values(s.labels).filter((x) => x.active && x.id !== 'player').sort((a, b) => b.revenueLastYear - a.revenueLastYear)[0];
      rv.aggression = clamp(rv.aggression * 0.8, 0.05, 1);
      const caught = ((s.week * 7 + s.year) % 10) < 3;
      if (caught) { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 8, 0, 100); emitFact(s, { kind: 'scandal', actors: ['player', rv.id], severity: 60, visibility: 'public', tags: ['bad'], text: fmtL(l('Vaza que {c} pagou por notas contra {r}.', 'It leaks that {c} paid for stories against {r}.'), { c: s.config.companyName, r: rv.name }), src: 'paths18' }); return l('Deu errado: a imprensa descobriu (reputação −8).', 'It backfired: the press found out (reputation −8).'); }
      return fmtL(l('{r} passa o ano se explicando.', '{r} spends the year explaining itself.'), { r: rv.name });
    } },
  { id: 'anniversary_box', needs: 'vault', lockedBy: 'churn', cooldown: 104, months: [9, 10], name: l('Box de aniversário', 'Anniversary box'), desc: l('Caixa de luxo com o melhor do catálogo para o Natal: rende 25% da renda anual do catálogo e conta como relançamento.', 'Deluxe box of the catalog\'s best for Christmas: earns 25% of annual catalog income and counts as a reissue.'),
    cost: (s) => money(s, 5000), when: (s) => (mineRels(s).filter((r) => s.year - r.year >= 5).length >= 3 ? null : l('Precisa de 3 discos com 5+ anos.', 'Needs 3 records 5+ years old.')),
    run: (s) => { const cv = catVal18(s, mineRels(s).filter((r) => s.year - r.year >= 3), true); const v = Math.round(cv.annual * 0.25); post(s, `box18:${s.year}`, v, 'sales', 'Box de aniversário'); s.player.reissues++; return fmtL(l('A caixa vendeu bem: {v}.', 'The box sold well: {v}.'), { v: `$${Math.round(toReal(v, s.year))}` }); } },
  { id: 'catalog_sale', needs: 'churn', lockedBy: 'vault', cooldown: 156, name: l('Vender parte do catálogo', 'Sell part of the catalog'), desc: l('Leiloa os 5 masters antigos mais fracos para fundos (preço de mercado da época): caixa agora, renda futura perdida e artistas magoados.', 'Auction the 5 weakest old masters to funds (era market price): cash now, future income lost and hurt artists.'),
    cost: () => 0, when: (s) => (mineRels(s).filter((r) => s.year - r.year >= 3).length >= 3 ? null : l('Catálogo pequeno demais.', 'Catalog too small.')),
    run: (s) => {
      const old = mineRels(s).filter((r) => r.owner === 'player' && s.year - r.year >= 3).sort((a, b) => a.totalUnits - b.totalUnits).slice(0, 5);
      const buyer = Object.values(s.labels).find((x) => x.active && x.strategy === 'buy_catalog');
      let v = 0;
      for (const r of old) {
        const p = catFundBid(s, r.id);
        v += p;
        post(s, `catsale18:${r.id}`, p, 'asset_sales', `Master vendido: ${r.title}`);
        noteLost18(s, [r.id], p, `"${r.title}"`);
        r.owner = buyer?.id ?? 'indie';
      }
      return fmtL(l('{n} discos vendidos por {v}. A renda deles não volta.', '{n} records sold for {v}. Their income won\'t come back.'), { n: old.length, v: `$${Math.round(toReal(v, s.year))}` });
    } },
];
export function labelDecBlock18(s: GameState, d: LabelDec18): L | null {
  if (d.needs && !hasDoc18(s, d.needs)) return fmtL(l('Requer a doutrina "{d}".', 'Requires the "{d}" doctrine.'), { d: docById18(d.needs)!.name });
  if (d.lockedBy && hasDoc18(s, d.lockedBy)) return fmtL(l('Travada pela doutrina "{d}".', 'Locked by the "{d}" doctrine.'), { d: docById18(d.lockedBy)!.name });
  const last = pa18(s).dec[d.id];
  if (last !== undefined && s.week - last < d.cooldown) return fmtL(l('De novo na semana {w}.', 'Again in week {w}.'), { w: last + d.cooldown });
  if (d.months && !d.months.includes(s.month)) return deadline(d.months);
  if (s.player.cash < d.cost(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  return d.when?.(s) ?? null;
}
export function takeLabelDec18(s: GameState, id: string): L {
  const d = LABEL_DECS18.find((x) => x.id === id);
  if (!d) return l('Decisão desconhecida.', 'Unknown decision.');
  const b = labelDecBlock18(s, d);
  if (b) return b;
  const c = d.cost(s);
  if (c > 0) post(s, `ldec18:${id}:${s.week}`, -c, 'misc', d.name.pt);
  pa18(s).dec[id] = s.week;
  const out = d.run(s);
  bumpPerks();
  remember(s, 'decision', fmtL(l('Decisão do selo: {d}. {o}', 'Label decision: {d}. {o}'), { d: d.name, o: out }));
  return out;
}
/** As decisões grandes de intrigue.ts entram no mesmo menu (reaproveitadas). */
export const bigDecisions18 = () => DECISIONS;
export const bigTaken18 = (s: GameState, id: string): boolean => intrigue(s).decisions[id] !== undefined;

// ---------------------------------------------------------------- conquistas narrativas (U7)

function firstNarr(s: GameState): void {
  const P = pa18(s), st = s.player.stats;
  const has = (id: string) => P.ach.some((a) => a.id === id);
  const add = (id: string, t: L) => { if (has(id)) return; P.ach.push({ id, y: s.year, t }); remember(s, 'achievement', t, { important: true }); emitFact(s, { kind: 'milestone', actors: ['player'], severity: 40, visibility: 'public', tags: ['good'], text: t, src: 'paths18' }); };
  const mineR = mineRels(s);
  if (st.number1s > 0 && !has('n1')) {
    const h = s.charts.number1History.find((x) => s.releases[x.releaseId] && mineR.includes(s.releases[x.releaseId]));
    add('n1', h ? fmtL(l('{y}: primeiro nº 1 do selo — "{t}", de {a}.', '{y}: the label\'s first #1 — "{t}" by {a}.'), { y: s.year, t: h.title, a: h.act }) : fmtL(l('{y}: primeiro nº 1 do selo.', '{y}: the label\'s first #1.'), { y: s.year }));
  }
  for (const [id, cert, pt, en] of [['gold', 'gold', 'disco de ouro', 'gold record'], ['plat', 'platinum', 'disco de platina', 'platinum record'], ['dia', 'diamond', 'disco de diamante', 'diamond record']] as const) {
    if (has(id)) continue;
    const r = mineR.find((x) => x.certified === cert || (cert === 'gold' && (x.certified === 'platinum' || x.certified === 'diamond')) || (cert === 'platinum' && x.certified === 'diamond'));
    if (r) add(id, fmtL(l(`{y}: primeiro ${pt} do selo — "{t}", de {a}{m}.`, `{y}: the label's first ${en} — "{t}" by {a}{m}.`), { y: s.year, t: r.title, a: s.acts[r.actId]?.name ?? '—', m: r.territories.length === 1 ? fmtL(l(' (mercado {k})', ' ({k} market)'), { k: r.territories[0] }) : l('', '') }));
  }
  if (s.player.territories.length >= 2 && !has('abroad')) add('abroad', fmtL(l('{y}: o selo cruza a fronteira — operação em {k}.', '{y}: the label crosses the border — operation in {k}.'), { y: s.year, k: s.player.territories[s.player.territories.length - 1] }));
  const leg = Object.values(s.acts).find((a) => a.legend && (a.owner === 'player' || a.playerBand));
  if (leg) add('legend', fmtL(l('{y}: {a} vira lenda com o selo.', '{y}: {a} becomes a legend with the label.'), { y: s.year, a: leg.name }));
  if (st.awards > 0) add('award', fmtL(l('{y}: o primeiro prêmio na estante.', '{y}: the first award on the shelf.'), { y: s.year }));
  if (s.year - s.config.startYear >= 10) add('decade', fmtL(l('{y}: dez anos de {c}.', '{y}: ten years of {c}.'), { y: s.year, c: s.config.companyName }));
  if (s.year - s.config.startYear >= 25) add('quarter', fmtL(l('{y}: bodas de prata — 25 anos de {c}.', '{y}: silver jubilee — 25 years of {c}.'), { y: s.year, c: s.config.companyName }));
  if (opRevReal18(s, s.year - 1) >= 1_000_000) add('million', fmtL(l('{y}: primeiro ano de um milhão em receita operacional.', '{y}: first year with a million in operating revenue.'), { y: s.year - 1 }));
  const fe = vl(s, 'festival').flatMap((f) => (f.editions ?? []).filter((e) => e.verdict === 'legend').map((e) => ({ f, e })))[0];
  if (fe) add('fest_legend', fmtL(l('{y}: a edição de {n} entra para a história.', '{y}: the {n} edition goes down in history.'), { y: fe.e.y, n: fe.f.name }));
}

// ---------------------------------------------------------------- mês e ano

registerSimHook('month', 'paths18', (s) => {
  const P = pa18(s);
  // a lei da reserva trava o mínimo
  if (hasDoc18(s, 'prudence') && pol18(s).reserve < 4) pol18(s).reserve = 4;
  for (const k of Object.keys(P.tmp)) if (P.tmp[k] < s.week) { delete P.tmp[k]; bumpPerks(); }
  if (s.month % 3 !== 2) return;
  const sc = allScores18(s);
  // detecção com histerese: troca só com 8 pontos de vantagem
  const cur = sc.find((x) => x.id === P.main);
  if (sc[0] && (!cur || sc[0].score > cur.score + 8)) P.main = sc[0].id;
  if (!P.pins.length && P.main) P.pins = [P.main];
  for (const x of sc) {
    const t = tierOf(x.score), had = P.tier[x.id] ?? 0;
    if (t <= had) continue;
    P.tier[x.id] = t;
    const d = pathDef18(x.id)!;
    const pinned = P.pins.includes(x.id) || P.chosen === x.id;
    const pts = t * 10 * (pinned ? 1.5 : 1);
    P.pts += pts;
    const text = fmtL(l('Marco — {p}: "{m}" ({n}/3){x}.', 'Milestone — {p}: "{m}" ({n}/3){x}.'), { p: d.name, m: d.tiers[t - 1], n: t, x: pinned ? l(' — meta ativa cumprida', ' — active goal met') : l('', '') });
    remember(s, 'milestone18', text, { important: true });
    emitFact(s, { kind: 'milestone', actors: ['player'], severity: 30 + t * 10, visibility: 'public', tags: ['good'], text, src: 'paths18', data: { path: x.id, tier: t } });
    notify(s, text, 'good');
  }
  firstNarr(s);
});
registerSimHook('year', 'paths18', (s) => {
  const P = pa18(s);
  P.hist.push({ y: s.year, v: Object.fromEntries(allScores18(s).map((x) => [x.id, x.score])) });
  if (P.hist.length > 60) P.hist.shift();
});
