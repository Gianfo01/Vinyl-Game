import '../../sim/tick';
// Rodada 29 (WIKI) — catálogos B: regras, mundo e história lidos das tabelas reais do jogo (nada copiado aqui).
// Cada `items()` lê a tabela no momento da chamada: se um número muda no código, a wiki muda junto.
// Dinheiro das tabelas de referência está em dólares de 2020 (o jogo converte com money()/nominal() para o ano).

import { l, type L, cityById, genreById, marketById, FAMILIES, type MarketId } from '../../data/world';
import {
  FORMATS, CHANNELS, STUDIO_TIERS, APPROACHES, VENUE_TIERS, HQ_LEVELS, BRANCH_LEVELS, ENDINGS, LEGACY_DIMS, techById,
} from '../../data/rules';
import { DEPTS, BRANCH_FOCUS } from '../../sim/sys/hq6';
import { ROOM_DEFS27, BUY27, LEVELS27, MARKET_PRICE27 } from '../../sim/sys/hqrooms27';
import { FURNITURE } from '../../sim/sys/furnish';
import { SITS29 } from '../../sim/start29data';
import { RIVS29, type RivProf29 } from '../../sim/rivals29data';
import { STARTS28 } from '../../sim/start28data';
import { DIFF17, PRESETS17, RANKS17, WORLDS17 } from '../../sim/start17';
import { PRESETS29, KEY_L29, PRESET_KEYS29, valL29 } from '../ps/presets29model';
import { DB_SIZES } from '../../sim/dbsize14';
import { RACKET_NAME, KIND_NAME, ORGS17 } from '../../data/orgs17';
import { CRIMES17, SEC17 } from '../../sim/sys/crime17';
import { FESTIVALS } from '../../data/catalog';
import { PLATFORMS, OUTLETS, CRITICS, AWARDS, outletById } from '../../data/content';
import { STUDIOS19, GEAR19 } from '../../data/more19';
import { GRAMO_CATS, CAMPAIGN_COST, NOMS_MONTH, CEREMONY_MONTH, GRAMO_START } from '../../sim/sys/ceremonies8';
import { CAMP18, RULES18 } from '../../sim/sys/awards18';
import { CRAFT28, CRAFT_START28, CRAFT_MONTH28, GRAMO_DIMS28 } from '../../sim/sys/awards28';
import { HALL_CATS, HALL_FOUNDED, HALL_FIRST_CLASS, HALL_NOMS_MONTH, HALL_CEREMONY_MONTH, HALL_WAIT } from '../../sim/sys/rockhall9';
import { COUNTRY_INFO } from '../../data/countries';
import { countryName } from '../../data/geo';
import { ACHIEVEMENTS } from '../../sim/sys/live';
import { SCENARIOS } from '../../sim/sys/live';
import { SCENARIOS17, type Scenario17 } from '../../sim/sys/scenarios17';
import { SCENARIOS23, type Scenario23 } from '../../sim/sys/scenarios23';
import { ERA_SHIFTS, type StanceFx, type StanceDef } from '../../sim/sys/eras8';
import { EGGS27 } from '../../data/eggs27';
import '../../sim/sys/scenedefs17';
import { DEFS17 } from '../../sim/sys/scene17';
import { CUT27 } from '../ps/cut27model';
import { SKUS, type Sku } from '../../sim/sys/merch17';
import { PAYOLA_TIERS, PAYOLA_ERA_INFO } from '../../sim/sys/world4/charts';
import { TICKET, PRODUCTION_COST } from '../../sim/tours';
import { STARTER19, GROUND19 } from '../../sim/sys/careers19';
import type { PerkValues, PerkKey } from '../../sim/perks';
import type { RunConfig } from '../../sim/types';
import type { Cat29, CatItem29 } from './wiki29types';

// ---------------------------------------------------------------- utilitários de formatação

type Row = [L, string | L];

/** Ícones válidos (vis); qualquer outro cai no padrão. */
const ICONS = new Set('money fame fans disc cd cassette stream chart-up mic guitar drums calendar contract warning heart trophy gold-disc house tour-bus plane newspaper tv radio camera film handshake gavel bank brain fire skull sleep sparkle stress clock globe lock key flag star note pen vault bulb building rocket crown compass target book pin people eye briefcase headphones megaphone scroll map chess coin ticket medal mask diamond tie stage mixer hourglass skyline door clapper typewriter copyright factory signpost network seedling passport columns dice datebook quill turntable spotlight ballot zine certificate rolodex songsheet'.split(' '));
const ic = (x: string | undefined, d: string): string => (x && ICONS.has(x) ? x : d);

const nf = (n: number, d = 0): string => n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
/** dólares de referência (2020) */
const usd = (n: number): string => `US$ ${n < 10 && !Number.isInteger(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : nf(n)} (2020)`;
const usdM = (n: number): L => l(`US$ ${nf(n, n < 10 ? 2 : 0)}/mês (2020)`, `US$ ${nf(n, n < 10 ? 2 : 0)}/month (2020)`);
const sgn = (n: number, d = 2): string => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${nf(Math.abs(n), d)}`;
const pc = (f: number): string => `${f > 0 ? '+' : f < 0 ? '−' : '±'}${nf(Math.abs(f) * 100, 1)}%`;
/** multiplicador (1 = neutro) como percentual */
const mul = (m: number): string => pc(m - 1);
const yn = (b: boolean | undefined): L => (b ? l('sim', 'yes') : l('não', 'no'));
const MONTHS: L[] = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((pt, i) => l(pt, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]));
const mon = (m: number | undefined): L => (m === undefined ? l('—', '—') : MONTHS[((m % 12) + 12) % 12]);
const span = (a: number, b?: number): string => (b === undefined || b >= 2100 ? `${a}–` : `${a}–${b}`);
/** junta vários L com um separador */
const joinL = (xs: L[], sep = ', '): L => (xs.length ? l(xs.map((x) => x.pt).join(sep), xs.map((x) => x.en).join(sep)) : l('—', '—'));
const famL = (id: string): L => FAMILIES.find((f) => f.id === id)?.name ?? genreById[id]?.name ?? l(id, id);
const famsL = (ids: readonly string[] | undefined): L => joinL((ids ?? []).map(famL));
const mktL = (id: string): L => (id === 'global' ? l('Global', 'Global') : marketById[id as MarketId]?.name ?? l(id, id));
const cityL = (id: string): L => cityById[id]?.name ?? l(id || '—', id || '—');
const techL = (id: string | undefined): L => (id ? techById[id]?.name ?? l(id, id) : l('—', '—'));
const citySee = (id: string | undefined): string[] => (id && cityById[id] ? [`city:${id}`] : []);
const techSee = (id: string | undefined): string[] => (id && techById[id] ? [`tech:${id}`] : []);
const txt = (x: unknown): L | null => (x && typeof x === 'object' && 'pt' in (x as object) ? (x as L) : null);

// perks: nomes e escala (fração vs pontos) — convenção documentada em sim/perks.ts
const PERK_L: Record<PerkKey, L> = {
  offer: l('Força das propostas', 'Offer strength'), critics: l('Nota da crítica', 'Critics score'), songQ: l('Qualidade das gravações', 'Recording quality'),
  trust: l('Confiança inicial dos artistas', 'Starting artist trust'), morale: l('Moral do elenco/mês', 'Roster morale/month'), scoutActions: l('Ações de scouting', 'Scouting actions'),
  signals: l('Sinais de talento', 'Talent signals'), energy: l('Energia', 'Energy'), demos: l('Demos extras/mês', 'Extra demos/month'), reputation: l('Reputação/ano', 'Reputation/year'),
  appeal: l('Apelo dos lançamentos', 'Release appeal'), showRevenue: l('Bilheteria', 'Box office'), chartUnits: l('Vendas nas paradas', 'Chart sales'),
  pressingCost: l('Custo de prensagem', 'Pressing cost'), scoutAccuracy: l('Precisão do scouting', 'Scouting accuracy'), stress: l('Estresse', 'Stress'), xp: l('Experiência', 'Experience'),
  valuation: l('Valor da empresa', 'Company valuation'), staffCost: l('Salários da equipe', 'Staff salaries'), wealth: l('Renda pessoal/mês', 'Personal income/month'),
  advance: l('Adiantamento esperado', 'Expected advance'), scheme: l('Esquemas', 'Schemes'), metadata: l('Metadados', 'Metadata'),
};
const FRAC = new Set<PerkKey>(['appeal', 'showRevenue', 'chartUnits', 'pressingCost', 'scoutAccuracy', 'stress', 'xp', 'valuation', 'staffCost', 'advance']);
const perkRows = (v: PerkValues | Record<string, number> | undefined, pre?: L): Row[] =>
  Object.entries(v ?? {}).filter(([, x]) => typeof x === 'number' && x !== 0).map(([k, x]) => {
    const n = PERK_L[k as PerkKey] ?? l(k, k);
    const lab = pre ? l(`${pre.pt}: ${n.pt}`, `${pre.en}: ${n.en}`) : n;
    return [lab, FRAC.has(k as PerkKey) ? pc(x as number) : k === 'wealth' ? usd(x as number) : sgn(x as number)] as Row;
  });
const REP_L: Record<string, L> = { artistic: l('Reputação artística', 'Artistic reputation'), commercial: l('Reputação comercial', 'Commercial reputation'), artists: l('Reputação entre artistas', 'Reputation among artists'), institutional: l('Reputação institucional', 'Institutional reputation') };
const repRows = (r: Partial<Record<string, number>>): Row[] => Object.entries(r).filter(([, v]) => v).map(([k, v]) => [REP_L[k] ?? l(k, k), sgn(v as number, 0)] as Row);

// ---------------------------------------------------------------- catálogos

const formatos: Cat29 = {
  id: 'formatos', title: l('Formatos de lançamento', 'Release formats'), icon: 'disc', group: 'regras',
  desc: l('Cada suporte em que um disco sai: receita líquida por unidade, custo de fabricação e a tecnologia que o abre ou o aposenta.', 'Every medium a record comes out on: net revenue per unit, manufacturing cost and the technology that opens or retires it.'),
  items: () => FORMATS.map((f) => ({
    id: f.id, title: f.name, sub: f.physical ? l('Físico', 'Physical') : l('Não físico', 'Non-physical'), icon: f.physical ? 'disc' : 'stream',
    rows: [
      [l('Físico', 'Physical'), yn(f.physical)],
      [l('Receita líquida por single', 'Net revenue per single'), usd(f.net.single)],
      [l('Receita líquida por EP', 'Net revenue per EP'), usd(f.net.ep)],
      [l('Receita líquida por LP', 'Net revenue per LP'), usd(f.net.lp)],
      [l('Custo de fabricação/unidade', 'Manufacturing cost/unit'), usd(f.unitCost)],
      [l('Exige tecnologia', 'Requires technology'), techL(f.tech)],
      [l('Substituído por', 'Replaced by'), techL(f.until)],
    ],
    see: ['mech:music', 'mech:money', ...techSee(f.tech), ...techSee(f.until)],
  })),
};

const canais: Cat29 = {
  id: 'canais-marketing', title: l('Canais de marketing', 'Marketing channels'), icon: 'megaphone', group: 'regras',
  desc: l('Onde a campanha de um lançamento gasta: custo para ~63% de alcance e o peso em vendas, fama e prestígio.', 'Where a release campaign spends: cost for ~63% reach and the weight on sales, fame and prestige.'),
  items: () => CHANNELS.map((c) => ({
    id: c.id, title: c.name, icon: 'megaphone',
    rows: [
      [l('Custo para ~63% de alcance', 'Cost for ~63% reach'), usd(c.reachCost)],
      [l('Peso em vendas', 'Sales weight'), nf(c.sales, 2)],
      [l('Peso em fama', 'Fame weight'), nf(c.fame, 2)],
      [l('Peso em prestígio', 'Prestige weight'), nf(c.prestige, 2)],
      [l('Abre com a tecnologia', 'Opens with technology'), techL(c.from)],
      [l('Abre no ano', 'Opens in year'), c.fromYear ? String(c.fromYear) : '—'],
      [l('Fecha no ano', 'Closes in year'), c.untilYear ? String(c.untilYear) : '—'],
      [l('Fecha com a tecnologia', 'Closes with technology'), techL(c.untilTech)],
    ],
    see: ['mech:music', 'mech:press', ...techSee(c.from)],
  })),
};

const estudios: Cat29 = {
  id: 'estudios-faixas', title: l('Estúdios externos (faixas)', 'Outside studios (tiers)'), icon: 'mixer', group: 'regras',
  desc: l('Níveis de estúdio alugado para gravar: diária e pontos de produção somados à gravação.', 'Rented studio tiers for recording: day cost and production points added to the recording.'),
  items: () => STUDIO_TIERS.map((t) => ({
    id: `t${t.id}`, title: t.name, sub: l(`Nível ${t.id}`, `Tier ${t.id}`), icon: 'mixer',
    rows: [[l('Nível', 'Tier'), String(t.id)], [l('Custo', 'Cost'), usd(t.cost)], [l('Produção', 'Production'), sgn(t.production, 0)]],
    see: ['mech:music'],
  })),
};

const abordagens: Cat29 = {
  id: 'abordagens', title: l('Abordagens de gravação', 'Recording approaches'), icon: 'mic', group: 'regras',
  desc: l('Como a sessão é conduzida: multiplica o custo e mexe em interpretação, produção e originalidade.', 'How the session is run: multiplies the cost and shifts performance, production and originality.'),
  items: () => APPROACHES.map((a) => ({
    id: a.id, title: a.name, icon: 'mic',
    rows: [[l('Custo', 'Cost'), `×${nf(a.costMult, 2)}`], [l('Interpretação', 'Performance'), sgn(a.perf, 0)], [l('Produção', 'Production'), sgn(a.prod, 0)], [l('Originalidade', 'Originality'), sgn(a.originality, 0)]],
    see: ['mech:music'],
  })),
};

const casas: Cat29 = {
  id: 'casas-faixas', title: l('Casas de show (faixas)', 'Venues (tiers)'), icon: 'stage', group: 'regras',
  desc: l('Porte das casas: capacidade, fama mínima do ato, custo por noite e preço base do ingresso.', 'Venue sizes: capacity, the act\'s minimum fame, cost per night and base ticket price.'),
  items: () => VENUE_TIERS.map((v) => ({
    id: `v${v.id}`, title: v.name, sub: l(`${nf(v.cap[0])}–${nf(v.cap[1])} lugares`, `${nf(v.cap[0])}–${nf(v.cap[1])} seats`), icon: 'stage',
    rows: [
      [l('Capacidade', 'Capacity'), `${nf(v.cap[0])}–${nf(v.cap[1])}`],
      [l('Fama mínima', 'Minimum fame'), String(v.fameMin)],
      [l('Custo da casa por show', 'Venue cost per show'), usd(v.cost)],
      [l('Ingresso base', 'Base ticket'), TICKET[v.id] !== undefined ? usd(TICKET[v.id]) : '—'],
    ],
    see: ['mech:live'],
  })),
};

const producao: Cat29 = {
  id: 'producao-shows', title: l('Produção de palco', 'Stage production'), icon: 'spotlight', group: 'regras',
  desc: l('Níveis de produção de uma turnê: custo extra por show (luz, cenário, telão).', 'Tour production levels: extra cost per show (lights, set, screens).'),
  items: () => PRODUCTION_COST.map((c, i) => ({
    id: `p${i}`, title: l(`Produção nível ${i}`, `Production level ${i}`), icon: 'spotlight',
    rows: [[l('Nível', 'Level'), String(i)], [l('Custo extra por show', 'Extra cost per show'), usd(c)]],
    see: ['mech:live'],
  })),
};

const sede: Cat29 = {
  id: 'sede-niveis', title: l('Níveis da sede e filiais', 'HQ and branch levels'), icon: 'building', group: 'regras',
  desc: l('Da garagem ao campus: capacidade de carreiras, equipe, sessões e equipamento, aluguel e exigências. Inclui os níveis de filial.', 'From garage to campus: capacity for careers, staff, sessions and equipment, rent and requirements. Includes branch levels.'),
  items: () => [
    ...HQ_LEVELS.map((h, i): CatItem29 => ({
      id: h.id, title: h.name, sub: l(`Sede · nível ${i}`, `HQ · level ${i}`), icon: 'building',
      rows: [
        [l('Alcance', 'Reach'), h.reach], [l('Carreiras', 'Careers'), String(h.careers)], [l('Equipe', 'Staff'), String(h.staff)],
        [l('Sessões de estúdio simultâneas', 'Simultaneous studio sessions'), String(h.sessions)], [l('Vagas de equipamento', 'Equipment slots'), String(h.equipment)],
        [l('Custo de mudança', 'Upgrade cost'), usd(h.upgradeCost)], [l('Aluguel', 'Rent'), usdM(h.rent)],
        [l('Mercados sem distribuidor', 'Markets without distributor'), String(h.freeMarkets)],
        [l('Ano mínimo', 'Minimum year'), h.minYear ? String(h.minYear) : '—'], [l('Tecnologia exigida', 'Required technology'), techL(h.tech)],
        [l('Reputação comercial mínima', 'Minimum commercial reputation'), h.minReputation ? String(h.minReputation) : '—'],
      ],
      text: h.desc ? [h.desc] : undefined, see: ['mech:hq', ...techSee(h.tech)],
    })),
    ...BRANCH_LEVELS.map((b, i): CatItem29 => ({
      id: `branch${i}`, title: b.name, sub: l(`Filial · nível ${i + 1}`, `Branch · level ${i + 1}`), icon: 'skyline',
      rows: [[l('Carreiras', 'Careers'), String(b.careers)], [l('Equipe', 'Staff'), String(b.staff)], [l('Sessões', 'Sessions'), String(b.sessions)], [l('Custo', 'Cost'), usd(b.cost)], [l('Aluguel', 'Rent'), usdM(b.rent)]],
      see: ['mech:hq'],
    })),
  ],
};

const focoFiliais: Cat29 = {
  id: 'foco-filiais', title: l('Foco das filiais', 'Branch focus'), icon: 'target', group: 'regras',
  desc: l('O que cada filial prioriza (com diretor contratado).', 'What each branch prioritizes (with a hired director).'),
  items: () => Object.entries(BRANCH_FOCUS).map(([id, f]) => ({ id, title: f.name, icon: 'target', rows: [[l('Efeito', 'Effect'), f.desc]] as Row[], see: ['mech:hq'] })),
};

const departamentos: Cat29 = {
  id: 'departamentos', title: l('Departamentos', 'Departments'), icon: 'briefcase', group: 'regras',
  desc: l('Departamentos da sede: três níveis cada, com custo de obra, manutenção mensal e bônus por nível.', 'HQ departments: three levels each, with build cost, monthly upkeep and per-level bonuses.'),
  items: () => DEPTS.map((d) => ({
    id: d.id, title: d.name, icon: ic(d.icon, 'briefcase'),
    rows: [
      [l('Sede mínima (nível)', 'Minimum HQ (level)'), String(d.minHq)], [l('Tecnologia exigida', 'Required technology'), techL(d.tech)],
      [l('Custo nível 1', 'Level 1 cost'), usd(d.cost[0])], [l('Custo nível 2', 'Level 2 cost'), usd(d.cost[1])], [l('Custo nível 3', 'Level 3 cost'), usd(d.cost[2])],
      [l('Manutenção por nível', 'Upkeep per level'), usdM(d.upkeep)],
      ...perkRows(d.perLevel, l('Por nível', 'Per level')),
    ],
    text: [d.desc], see: ['mech:hq', ...techSee(d.tech)],
  })),
};

const salas: Cat29 = {
  id: 'salas', title: l('Salas compráveis da sede', 'Buyable HQ rooms'), icon: 'door', group: 'regras',
  desc: l('Salas extras: obra (preço × cidade e bairro), meses de construção, manutenção e efeito. Mostra em que nível de sede cada uma aparece.', 'Extra rooms: build cost (price × city and neighborhood), months of work, upkeep and effect. Shows which HQ levels offer each.'),
  items: () => BUY27.map((id) => {
    const r = ROOM_DEFS27[id];
    const lv = LEVELS27.map((L27, i) => (L27.rooms.some((x) => x.id === id) ? HQ_LEVELS[i]?.name : null)).filter((x): x is L => !!x);
    return {
      id, title: r.name, icon: ic(r.icon, 'door'),
      rows: [
        [l('Obra', 'Build cost'), usd(r.cost)], [l('Meses de obra', 'Months of work'), String(r.months)], [l('Manutenção', 'Upkeep'), usdM(r.upkeep)],
        [l('Efeito', 'Effect'), r.fxText],
        ...Object.entries(r.fx.caps ?? {}).map(([k, v]) => [l(`Capacidade: ${k}`, `Capacity: ${k}`), sgn(v as number, 0)] as Row),
        ...perkRows(r.fx.perks),
        [l('Disponível nas sedes', 'Available at HQs'), joinL(lv)],
      ],
      text: [r.desc], see: ['mech:hq'],
    };
  }),
};

const andares: Cat29 = {
  id: 'andares', title: l('Andares a montar', 'Floors to fit out'), icon: 'building', group: 'regras',
  desc: l('Andares de cima dos prédios grandes: vêm vazios e são montados (obra, meses, manutenção, vagas de equipe). O preço da obra varia por mercado.', 'Upper floors of big buildings: they come empty and are fitted out (cost, months, upkeep, staff slots). Build prices vary by market.'),
  items: () => {
    const out: CatItem29[] = [];
    LEVELS27.forEach((L27, i) => L27.buyFloors.forEach((f) => out.push({
      id: `l${i}f${f.floor}`, title: f.name, sub: HQ_LEVELS[i]?.name, icon: 'building',
      rows: [[l('Sede', 'HQ'), HQ_LEVELS[i]?.name ?? String(i)], [l('Andar', 'Floor'), String(f.floor)], [l('Obra', 'Build cost'), usd(f.cost)], [l('Meses de obra', 'Months of work'), String(f.months)], [l('Manutenção', 'Upkeep'), usdM(f.upkeep)], [l('Vagas de equipe', 'Staff slots'), sgn(f.staff, 0)]],
      text: [l(`Preço por mercado: ${Object.entries(MARKET_PRICE27).map(([m, v]) => `${mktL(m).pt} ×${nf(v, 2)}`).join(', ')}.`, `Price by market: ${Object.entries(MARKET_PRICE27).map(([m, v]) => `${mktL(m).en} ×${nf(v, 2)}`).join(', ')}.`)],
      see: ['mech:hq'],
    })));
    return out;
  },
};

const mobilia: Cat29 = {
  id: 'mobilia', title: l('Mobília e instrumentos', 'Furniture and instruments'), icon: 'house', group: 'regras',
  desc: l('Itens da sede: preço, quantidade máxima, ano mínimo, cômodos e efeito em composição, gravação, moral, estresse e reputação.', 'HQ items: price, max quantity, earliest year, rooms and effect on writing, recording, morale, stress and reputation.'),
  items: () => FURNITURE.map((f) => ({
    id: f.id, title: f.name, icon: 'house',
    rows: [
      [l('Preço', 'Price'), usd(f.cost)], [l('Máximo', 'Maximum'), String(f.max)], [l('A partir de', 'From'), f.from ? String(f.from) : '—'],
      [l('Cômodos', 'Rooms'), f.rooms.join(', ')],
      ...(f.fx.compose ? [[l('Composição', 'Writing'), sgn(f.fx.compose)] as Row] : []),
      ...(f.fx.record ? [[l('Gravação (interpretação)', 'Recording (performance)'), sgn(f.fx.record)] as Row] : []),
      ...(f.fx.morale ? [[l('Moral/mês', 'Morale/month'), sgn(f.fx.morale)] as Row] : []),
      ...(f.fx.stress ? [[l('Estresse/mês', 'Stress/month'), sgn(-f.fx.stress)] as Row] : []),
      ...(f.fx.rep ? [[l('Reputação', 'Reputation'), sgn(f.fx.rep)] as Row] : []),
    ],
    text: [f.desc], see: ['mech:hq'],
  })),
};

const situacoes: Cat29 = {
  id: 'situacoes-iniciais', title: l('Situações iniciais', 'Starting situations'), icon: 'signpost', group: 'regras',
  desc: l('A escada do Novo Jogo, do zero ao líder do mercado (e o gigante caído): caixa, reputação, sede, elenco, equipe, mercados, rivais e dívida.', 'The New Game ladder, from zero to market leader (and the fallen giant): cash, reputation, HQ, roster, staff, markets, rivals and debt.'),
  items: () => SITS29.map((x) => ({
    id: x.id, title: x.name, icon: 'signpost',
    rows: [
      [l('Cenário-base', 'Base scenario'), x.base], [l('Caixa (× emergente)', 'Cash (× emerging)'), `×${nf(x.cash, 2)}`], ...repRows(x.rep),
      [l('Nível da sede', 'HQ level'), String(x.hq)], [l('Atos no elenco', 'Acts on roster'), String(x.roster)], [l('Fama dos atos', 'Acts\' fame'), String(x.fame)],
      [l('Equipe', 'Staff'), String(x.staff)], [l('Mercados', 'Markets'), String(x.markets)],
      [l('Rivais de olho (mágoa · quantos)', 'Rivals watching (grudge · how many)'), `${x.rivals[0]} · ${x.rivals[1]}`],
      [l('Dívida (× caixa inicial)', 'Debt (× starting cash)'), x.debt ? `×${nf(x.debt, 2)}` : '—'], [l('Potencial extra', 'Extra potential'), x.pot ? sgn(x.pot, 0) : '—'],
    ],
    text: [x.fx], see: ['mech:start'],
  })),
};

const profRows = (pre: L, p: RivProf29): Row[] => {
  const P = (pt: string, en: string): L => l(`${pre.pt} · ${pt}`, `${pre.en} · ${en}`);
  const TERR: Record<string, L> = { home: l('só a casa', 'home only'), region: l('a região', 'the region'), grow: l('os de sempre + a região', 'usual + region'), keep: l('os de sempre', 'the usual'), world: l('o mundo', 'the world') };
  const KEEP: Record<string, L> = { low: l('os menos famosos', 'the least famous'), rand: l('sorteados', 'random'), pot: l('talento sem alcance', 'untapped talent') };
  const rows: Row[] = [
    [P('caixa', 'cash'), `×${nf(p.cash, 2)}`], [P('reputação artística', 'artistic reputation'), `${p.art[0]}–${p.art[1]}`], [P('reputação comercial', 'commercial reputation'), `${p.com[0]}–${p.com[1]}`],
    [P('máximo de atos', 'max acts'), p.cap !== undefined ? String(p.cap) : '—'], [P('quem fica', 'who stays'), p.keep ? KEEP[p.keep] : l('—', '—')],
    [P('atos extras assinados', 'extra acts signed'), String(p.extra)], [P('alcance (fama)', 'reach (fame)'), p.fame !== undefined ? `×${nf(p.fame, 2)}` : '—'],
    [P('porte', 'size'), p.fam === 'down' ? l('major vira médio', 'major becomes mid') : p.fam ?? '—'], [P('mercados', 'markets'), TERR[p.terr] ?? p.terr],
    [P('agressividade', 'aggression'), `×${nf(p.agg, 2)}`],
  ];
  if (p.arch?.length) rows.push([P('arquétipos', 'archetypes'), p.arch.join(', ')]);
  if (p.strat?.length) rows.push([P('estratégias', 'strategies'), p.strat.join(', ')]);
  return rows;
};

const rivais: Cat29 = {
  id: 'niveis-rivais', title: l('Níveis dos rivais', 'Rival levels'), icon: 'chess', group: 'regras',
  desc: l('Como o Novo Jogo molda os selos rivais: caixa, reputação, corte de elenco, porte, mercados e agressividade, e os "grandes".', 'How New Game shapes rival labels: cash, reputation, roster cuts, size, markets and aggression, plus the "big ones".'),
  items: () => RIVS29.map((r) => ({
    id: r.id, title: r.name, sub: r.tag, icon: 'chess',
    rows: [
      ...(r.all ? profRows(l('Todos', 'All'), r.all) : [[l('Perfil', 'Profile'), l('o mundo de sempre (sem ajuste)', 'the usual world (no adjustment)')] as Row]),
      ...(r.big ? [[l('Grandes · quantos', 'Big ones · how many'), String(r.big.n)] as Row, ...profRows(l('Grandes', 'Big ones'), r.big.p)] : []),
      [l('Negócios rivais da carreira', 'Rival businesses of your career'), String(r.ven.n)],
      [l('Reputação desses negócios', 'Those businesses\' reputation'), `${r.ven.rep[0]}–${r.ven.rep[1]}`],
      ...(r.ven.top ? [[l('Negócio dominante (n · rep.)', 'Dominant business (n · rep.)'), `${r.ven.top[0]} · ${r.ven.top[1]}`] as Row] : []),
    ],
    text: [r.fx], see: ['mech:start', 'mech:world'],
  })),
};

const comecos: Cat29 = {
  id: 'comecos-sorteados', title: l('Começos sorteados', 'Rolled starts'), icon: 'dice', group: 'regras',
  desc: l('O toque sorteado pela semente no início: caixa e reputação.', 'The seed-rolled twist at the start: cash and reputation.'),
  items: () => STARTS28.map((x) => ({ id: x.id, title: x.name, icon: 'dice', rows: [[l('Caixa', 'Cash'), `×${nf(x.cash, 2)}`], ...repRows(x.rep)], text: [x.text], see: ['mech:start'] })),
};

/** campos da configuração que uma predefinição mexe (aplicada a uma configuração vazia) */
const PRESET_FIELDS = ['world17', 'difficulty', 'ironman', 'storyteller', 'freedom17', 'dbSize', 'runYears17', 'scenario', 'diff17', 'custom'] as const;
const presetFx = (apply: (c: RunConfig) => void): Row[] => {
  try {
    const c = { custom: {} } as unknown as RunConfig;
    apply(c);
    const rec = c as unknown as Record<string, unknown>;
    return PRESET_FIELDS.filter((k) => rec[k] !== undefined).map((k) => [l(k, k), typeof rec[k] === 'object' ? JSON.stringify(rec[k]) : String(rec[k])] as Row);
  } catch { return []; }
};

const dificuldade: Cat29 = {
  id: 'dificuldade', title: l('Dificuldade, mundos e patentes', 'Difficulty, worlds and ranks'), icon: 'target', group: 'regras',
  desc: l('Os quatro eixos de dificuldade (−2 a +2), as predefinições do Novo Jogo, os modos de mundo e as patentes da pontuação final.', 'The four difficulty axes (−2 to +2), the New Game presets, the world modes and the final-score ranks.'),
  items: () => [
    ...DIFF17.map((d): CatItem29 => ({ id: `eixo-${d.id}`, title: d.name, sub: l('Eixo de dificuldade', 'Difficulty axis'), icon: 'target', rows: [-2, -1, 0, 1, 2].map((v) => [l(`Nível ${sgn(v, 0)}`, `Level ${sgn(v, 0)}`), d.step(v)] as Row), text: [d.help], see: ['mech:start'] })),
    ...PRESETS17.map((p): CatItem29 => ({ id: `pre-${p.id}`, title: p.name, sub: l('Predefinição do Novo Jogo', 'New Game preset'), icon: 'compass', rows: presetFx(p.apply), text: [p.desc], see: ['mech:start', 'mech:modes'] })),
    ...WORLDS17.map((w): CatItem29 => ({ id: `mundo-${w.id}`, title: w.name, sub: w.short ?? l('Modo de mundo', 'World mode'), icon: 'globe', rows: [[l('Efeitos', 'Effects'), w.fx]], text: [w.desc], see: ['mech:modes'] })),
    ...RANKS17.map((r, i): CatItem29 => ({ id: `patente-${i}`, title: r.name, sub: l('Patente final', 'Final rank'), icon: 'medal', rows: [[l('Pontos por ano jogado (mínimo)', 'Points per year played (minimum)'), String(r.min)]], see: ['mech:modes'] })),
  ],
};

const predefinicoes: Cat29 = {
  id: 'predefinicoes', title: l('Predefinições de apresentação', 'Presentation presets'), icon: 'eye', group: 'regras',
  desc: l('Guiado, Livre e Contemplativo: só preferências de tela (densidade, dicas, interrupções, cenas). Nunca mudam regras nem o save.', 'Guided, Free and Contemplative: screen preferences only (density, tips, interruptions, scenes). They never change rules or the save.'),
  items: () => PRESETS29.map((p) => ({
    id: p.id, title: p.name, icon: 'eye',
    rows: PRESET_KEYS29.filter((k) => p.set[k] !== undefined).map((k) => [KEY_L29[k], valL29(String(p.set[k]))] as Row),
    text: [p.desc],
  })),
};

const bases: Cat29 = {
  id: 'bases', title: l('Tamanho da base de dados', 'Database size'), icon: 'book', group: 'regras',
  desc: l('Quantos artistas reais e gerados existem no mundo da partida.', 'How many real and generated acts exist in the run\'s world.'),
  items: () => DB_SIZES.map((d) => ({
    id: d.id, title: l(d.pt, d.en), icon: 'book',
    rows: [[l('Nível', 'Level'), String(d.lvl)], [l('Atos gerados no início', 'Acts generated at start'), `×${nf(d.gen, 2)}`], [l('Atos novos por ano', 'New acts per year'), `×${nf(d.yearly, 2)}`]],
    see: ['mech:start'],
  })),
};

const finais: Cat29 = {
  id: 'finais', title: l('Finais', 'Endings'), icon: 'scroll', group: 'regras',
  desc: l('Todos os finais possíveis do arco neural e da linhagem.', 'Every possible ending of the neural arc and the bloodline.'),
  items: () => ENDINGS.map((e) => ({ id: e.id, title: e.name, icon: 'scroll', rows: [[l('Id', 'Id'), e.id]], text: [e.text], see: ['mech:story'] })),
};

const legado: Cat29 = {
  id: 'legado', title: l('Dimensões do legado', 'Legacy dimensions'), icon: 'crown', group: 'regras',
  desc: l('As dimensões em que o legado da empresa é medido no fim.', 'The dimensions the company\'s legacy is measured on at the end.'),
  items: () => LEGACY_DIMS.map((d) => ({ id: d.id, title: d.name, icon: 'crown', rows: [[l('Id', 'Id'), d.id]], see: ['mech:story'] })),
};

const TK_L: Record<string, L> = { person: l('Pessoa', 'Person'), act: l('Ato', 'Act'), label: l('Selo', 'Label'), relic: l('Relíquia', 'Relic'), own_act: l('Ato seu', 'Your act'), case: l('Processo', 'Case') };
const crimes: Cat29 = {
  id: 'crimes', title: l('Crimes e submundo', 'Crimes and underworld'), icon: 'skull', group: 'regras',
  desc: l('Cada crime: alvo, chance base, exposição, gravidade, custo, calor e métodos. Inclui os tipos de organização, os esquemas e os níveis de segurança.', 'Every crime: target, base odds, exposure, severity, cost, heat and methods. Includes organization kinds, rackets and security levels.'),
  items: () => [
    ...CRIMES17.map((c): CatItem29 => ({
      id: c.id, title: c.name, sub: TK_L[c.tk] ?? l(c.tk, c.tk), icon: c.violent ? 'skull' : 'mask',
      rows: [
        [l('Alvo', 'Target'), TK_L[c.tk] ?? c.tk], [l('Chance base', 'Base odds'), `${nf(c.p * 100)}%`], [l('Exposição base', 'Base exposure'), `${nf(c.q * 100)}%`],
        [l('Gravidade', 'Severity'), String(c.sev)], [l('Custo', 'Cost'), usd(c.cost)], [l('Calor', 'Heat'), sgn(c.heat, 0)], [l('Violento', 'Violent'), yn(!!c.violent)],
        ...(c.methods ?? []).map((m) => [l(`Método: ${m.name.pt}`, `Method: ${m.name.en}`), l(
          [m.desc.pt, m.dp ? `chance ${pc(m.dp)}` : '', m.dq ? `exposição ${pc(m.dq)}` : '', m.sev ? `gravidade ${m.sev}` : '', m.cost ? `+${usd(m.cost)}` : ''].filter(Boolean).join(' · '),
          [m.desc.en, m.dp ? `odds ${pc(m.dp)}` : '', m.dq ? `exposure ${pc(m.dq)}` : '', m.sev ? `severity ${m.sev}` : '', m.cost ? `+${usd(m.cost)}` : ''].filter(Boolean).join(' · '))] as Row),
      ],
      text: [c.desc], see: ['mech:underworld'],
    })),
    ...SEC17.map((x, i): CatItem29 => ({ id: `seguranca-${i}`, title: x.name, sub: l('Segurança', 'Security'), icon: 'lock', rows: [[l('Custo', 'Cost'), usdM(x.cost)], [l('Defesa', 'Defense'), pc(x.def)]], text: [x.desc], see: ['mech:underworld'] })),
    ...Object.entries(KIND_NAME).map(([k, n]): CatItem29 => {
      const orgs = ORGS17.filter((o) => o.kind === k);
      return { id: `tipo-${k}`, title: n, sub: l('Tipo de organização', 'Organization kind'), icon: 'mask', rows: [[l('Organizações no jogo', 'Organizations in game'), String(orgs.length)]], see: ['mech:underworld'] };
    }),
    ...Object.entries(RACKET_NAME).map(([k, n]): CatItem29 => {
      const orgs = ORGS17.filter((o) => (o.rackets as string[]).includes(k));
      return { id: `esquema-${k}`, title: n, sub: l('Esquema', 'Racket'), icon: 'coin', rows: [[l('Organizações que operam', 'Organizations running it'), String(orgs.length)]], see: ['mech:underworld'] };
    }),
  ],
};

const jaba: Cat29 = {
  id: 'jaba', title: l('Jabá (payola)', 'Payola'), icon: 'coin', group: 'regras',
  desc: l('Pacotes de jabá (custo, força e calor) e como cada época trata o pagamento para tocar.', 'Payola packages (cost, strength and heat) and how each era treats pay-for-play.'),
  items: () => [
    ...PAYOLA_TIERS.map((t, i): CatItem29 => ({ id: `nivel-${i}`, title: t.name, sub: l('Pacote', 'Package'), icon: 'coin', rows: [[l('Custo', 'Cost'), usd(t.real)], [l('Força', 'Strength'), pc(t.level)], [l('Calor', 'Heat'), sgn(t.heat, 0)]], see: ['mech:underworld', 'mech:press'] })),
    ...Object.entries(PAYOLA_ERA_INFO).map(([k, e]): CatItem29 => ({ id: `era-${k}`, title: e.name, sub: l('Época', 'Era'), icon: 'radio', rows: [[l('Custo', 'Cost'), `×${nf(e.cost, 2)}`], [l('Calor', 'Heat'), `×${nf(e.heat, 2)}`]], text: [e.desc], see: ['mech:underworld'] })),
  ],
};

const festivais: Cat29 = {
  id: 'festivais', title: l('Festivais', 'Festivals'), icon: 'stage', group: 'mundo',
  desc: l('Festivais e concursos do mundo: cidade, época, foco do line-up, prestígio, público e identidade.', 'The world\'s festivals and contests: city, era, line-up focus, prestige, crowd and identity.'),
  items: () => FESTIVALS.map((f, i) => ({
    id: `f${i}`, title: f.realRef ? `${f.name} (≈ ${f.realRef})` : f.name, sub: f.kind, icon: 'stage',
    rows: [
      [l('Cidade', 'City'), cityL(f.city)], [l('Tipo', 'Kind'), f.kind], [l('Período', 'Period'), span(f.start, f.end)], [l('Mês', 'Month'), mon(f.month)],
      [l('Foco do line-up', 'Line-up focus'), famsL(f.focus)], [l('Gêneros-assinatura', 'Signature genres'), famsL(f.genres)],
      [l('Prestígio', 'Prestige'), String(f.prestige)], [l('Reputação pública', 'Public reputation'), f.reputation !== undefined ? String(f.reputation) : '—'],
      [l('Público por edição', 'Crowd per edition'), f.capacity ? nf(f.capacity) : '—'], [l('Vibe', 'Vibe'), f.vibe ?? '—'], [l('Bom para garimpo', 'Good for scouting'), yn(f.scouting)],
    ],
    text: f.identity ? [f.identity] : undefined, see: ['mech:live', ...citySee(f.city)],
  })),
};

const plataformas: Cat29 = {
  id: 'plataformas', title: l('Plataformas', 'Platforms'), icon: 'network', group: 'mundo',
  desc: l('Redes de rádio, TV, lojas, streaming e feeds: lançamento, mercados, alcance e quanto pagam ao dono dos direitos.', 'Radio networks, TV, stores, streaming and feeds: launch, markets, reach and how much they pay rights holders.'),
  items: () => PLATFORMS.map((p) => ({
    id: p.id, title: p.realRef ? `${p.name} (≈ ${p.realRef})` : p.name, sub: l(p.type, p.type), icon: 'network',
    rows: [[l('Tipo', 'Type'), p.type], [l('Período', 'Period'), span(p.launch, p.close)], [l('Mercados', 'Markets'), joinL(p.markets.map(mktL))], [l('Alcance no auge', 'Peak reach'), String(p.reach)], [l('Pagamento relativo', 'Relative payout'), nf(p.payout, 2)], [l('Tecnologia', 'Technology'), techL(p.tech)]],
    text: [p.desc], see: ['mech:world', ...techSee(p.tech)],
  })),
};

const midia: Cat29 = {
  id: 'midia', title: l('Mídia e críticos', 'Media and critics'), icon: 'newspaper', group: 'mundo',
  desc: l('Veículos (revistas, jornais, TV, rádio, web) com seus vieses, e os críticos com suas manias.', 'Outlets (magazines, papers, TV, radio, web) with their biases, and critics with their quirks.'),
  items: () => [
    ...OUTLETS.map((o): CatItem29 => ({
      id: o.id, title: o.realRef ? `${o.name} (≈ ${o.realRef})` : o.name, sub: l(o.kind, o.kind), icon: 'newspaper',
      rows: [[l('Tipo', 'Kind'), o.kind], [l('Mercado', 'Market'), mktL(o.market)], [l('Período', 'Period'), span(o.start, o.end)], [l('Favorece', 'Favors'), famsL(o.bias.favored)], [l('Desfavorece', 'Disfavors'), famsL(o.bias.disfavored)], [l('Mainstream (−1..1)', 'Mainstream (−1..1)'), nf(o.bias.mainstream, 2)], [l('Rigor', 'Harshness'), nf(o.bias.harshness, 2)], [l('Prestígio', 'Prestige'), String(o.bias.prestige)]],
      text: [o.desc], see: ['mech:press'],
    })),
    ...CRITICS.map((c): CatItem29 => ({
      id: c.id, title: c.name, sub: l(`Crítico · ${outletById[c.outlet]?.name ?? c.outlet}`, `Critic · ${outletById[c.outlet]?.name ?? c.outlet}`), icon: 'pen',
      rows: [[l('Veículo', 'Outlet'), outletById[c.outlet]?.name ?? c.outlet], [l('Atividade', 'Active'), span(c.start, c.end)], [l('Favorece', 'Favors'), famsL(c.favored)], [l('Desfavorece', 'Disfavors'), famsL(c.disfavored)], [l('Mainstream (−1..1)', 'Mainstream (−1..1)'), nf(c.mainstream, 2)], [l('Rigor', 'Harshness'), nf(c.harshness, 2)]],
      text: [c.quirk], see: ['mech:press'],
    })),
  ],
};

const estudiosReais: Cat29 = {
  id: 'estudios-reais', title: l('Estúdios famosos', 'Famous studios'), icon: 'mixer', group: 'mundo',
  desc: l('Estúdios de gravação do mundo: cidade, época, especialidade, prestígio e o som da casa.', 'Recording studios of the world: city, era, specialty, prestige and house sound.'),
  items: () => STUDIOS19.map((s) => ({
    id: s.id, title: s.name, sub: cityL(s.city), icon: 'mixer',
    rows: [[l('Cidade', 'City'), cityL(s.city)], [l('Período', 'Period'), span(s.from, s.to)], [l('Especialidade', 'Specialty'), famsL(s.specialty)], [l('Prestígio', 'Prestige'), String(s.prestige)], [l('Só no modo de nomes reais conferidos', 'Verified real-names mode only'), yn(s.exact === false)]],
    text: s.note ? [s.note] : undefined, see: ['mech:music', ...citySee(s.city)],
  })),
};

const premios: Cat29 = {
  id: 'premios', title: l('Prêmios e cerimônias', 'Awards and ceremonies'), icon: 'trophy', group: 'mundo',
  desc: l('Premiações do mundo (categorias, critérios, mês), as categorias jogáveis dos Gramófonos, os Prêmios do Ofício, o Hall da Fama e os prêmios nacionais por país.', 'The world\'s awards (categories, criteria, month), the playable Gramophone categories, the Craft Awards, the Hall of Fame and national awards by country.'),
  items: () => [
    ...AWARDS.map((a): CatItem29 => ({
      id: a.id, title: a.realRef ? `${a.name} (≈ ${a.realRef})` : a.name, sub: l(a.kind, a.kind), icon: 'trophy',
      rows: [
        [l('Tipo', 'Kind'), a.kind], [l('Mercado', 'Market'), mktL(a.market)], [l('Período', 'Period'), span(a.start, a.end)], [l('Mês da cerimônia', 'Ceremony month'), mon(a.month)],
        [l('Critérios', 'Criteria'), a.criteria.join(', ')], [l('Prestígio', 'Prestige'), String(a.prestige)], [l('Tecnologia', 'Technology'), techL(a.tech)],
        ...a.categories.map((c) => [l(`Categoria: ${c.name.pt}`, `Category: ${c.name.en}`), c.families?.length ? famsL(c.families) : l('todos os gêneros', 'all genres')] as Row),
      ],
      text: [a.desc], see: ['mech:awards', ...techSee(a.tech)],
    })),
    {
      id: 'gramofonos-jogaveis', title: l('Gramófonos: categorias jogáveis', 'Gramophones: playable categories'), icon: 'gold-disc',
      rows: [
        [l('Primeira edição', 'First edition'), String(GRAMO_START)], [l('Mês das indicações', 'Nominations month'), mon(NOMS_MONTH)], [l('Mês da cerimônia (ano seguinte)', 'Ceremony month (next year)'), mon(CEREMONY_MONTH)],
        ...GRAMO_CATS.map((c) => [c.name, l(`${c.rule.pt} Pesos: ${Object.entries(GRAMO_DIMS28[c.id] ?? {}).map(([k, v]) => `${k} ${nf((v as number) * 100)}%`).join(', ')}`, `${c.rule.en} Weights: ${Object.entries(GRAMO_DIMS28[c.id] ?? {}).map(([k, v]) => `${k} ${nf((v as number) * 100)}%`).join(', ')}`)] as Row),
      ],
      see: ['mech:awards'],
    },
    {
      id: 'premios-oficio', title: l('Prêmios do Ofício', 'Craft Awards'), icon: 'medal',
      rows: [[l('Desde', 'Since'), String(CRAFT_START28)], [l('Mês', 'Month'), mon(CRAFT_MONTH28)], ...CRAFT28.map((c) => [c.name, l(`dimensão ${c.dim}${c.lp ? ' · só LPs' : ''}`, `dimension ${c.dim}${c.lp ? ' · LPs only' : ''}`)] as Row)],
      see: ['mech:awards'],
    },
    {
      id: 'hall-da-fama', title: l('Hall da Fama', 'Hall of Fame'), icon: 'columns',
      rows: [
        [l('Fundado', 'Founded'), String(HALL_FOUNDED)], [l('Primeira turma', 'First class'), String(HALL_FIRST_CLASS)], [l('Mês das indicações', 'Nominations month'), mon(HALL_NOMS_MONTH)],
        [l('Mês da cerimônia', 'Ceremony month'), mon(HALL_CEREMONY_MONTH)], [l('Anos desde a estreia para ser elegível', 'Years since debut to be eligible'), String(HALL_WAIT)],
        [l('Categorias', 'Categories'), joinL(Object.values(HALL_CATS))],
      ],
      see: ['mech:awards'],
    },
    ...COUNTRY_INFO.filter((c) => c.award).map((c): CatItem29 => ({
      id: `nacional-${c.a3.toLowerCase()}`, title: `${c.award![0]} (≈ ${c.award![1]})`, sub: countryName(c.a3), icon: 'flag',
      rows: [[l('País', 'Country'), countryName(c.a3)], [l('Criado em', 'Created'), String(c.award![2])], [l('Mercado', 'Market'), mktL(c.market)]],
      see: ['mech:awards'],
    })),
  ],
};

const campanhas: Cat29 = {
  id: 'campanhas-premios', title: l('Campanhas para prêmios', 'Award campaigns'), icon: 'ballot', group: 'regras',
  desc: l('Quanto custa fazer campanha nos Gramófonos (três níveis) e os tipos de campanha junto aos votantes.', 'What a Gramophone campaign costs (three levels) and the kinds of voter campaigns.'),
  items: () => [
    ...CAMPAIGN_COST.map((c, i): CatItem29 => ({ id: `nivel-${i + 1}`, title: l(`Campanha nível ${i + 1}`, `Campaign level ${i + 1}`), icon: 'ballot', rows: [[l('Custo', 'Cost'), usd(c)]], see: ['mech:awards'] })),
    ...Object.entries(CAMP18).map(([k, c]): CatItem29 => ({ id: k, title: c.name, icon: 'ballot', rows: [[l('Custo', 'Cost'), usd(c.cost)], [l('A partir de', 'From'), String(c.from)]], text: [c.desc], see: ['mech:awards'] })),
  ],
};

const regrasParadas: Cat29 = {
  id: 'regras-paradas', title: l('Regras das paradas', 'Chart rules'), icon: 'chart-up', group: 'historia',
  desc: l('Mudanças históricas em como as paradas contam (SoundScan, streams, bundles…), com a data e o efeito por gênero.', 'Historic changes in how charts count (SoundScan, streams, bundles…), with date and per-genre effect.'),
  items: () => RULES18.map((r) => ({
    id: r.id, title: r.name, sub: l(`${mon(r.m).pt} ${r.y}`, `${mon(r.m).en} ${r.y}`), icon: 'chart-up',
    rows: [[l('Data', 'Date'), l(`${mon(r.m).pt} ${r.y}`, `${mon(r.m).en} ${r.y}`)], [l('Mercado', 'Market'), mktL(r.mk)], ...Object.entries(r.fam ?? {}).map(([f, v]) => [famL(f), pc(v as number)] as Row), ...(r.bundle ? [[l('Bundles', 'Bundles'), l('passam a contar', 'start counting')] as Row] : []), ...(r.unbundle ? [[l('Bundles', 'Bundles'), l('deixam de contar', 'stop counting')] as Row] : [])],
    text: [r.desc], see: ['mech:music', 'mech:world'],
  })),
};

const ACH_CAT: Record<string, L> = { sales: l('Vendas', 'Sales'), tours: l('Turnês', 'Tours'), awards: l('Prêmios', 'Awards'), formats: l('Formatos', 'Formats'), legal: l('Tribunais', 'Courts'), stores: l('Lojas e filiais', 'Stores and branches'), digital: l('Digital', 'Digital'), live: l('Palco e festivais', 'Stage and festivals'), company: l('Empresa', 'Company') };
const conquistas: Cat29 = {
  id: 'conquistas', title: l('Conquistas', 'Achievements'), icon: 'medal', group: 'regras',
  desc: l('Todas as conquistas, inclusive as secretas (marcadas).', 'Every achievement, secret ones included (marked).'),
  items: () => ACHIEVEMENTS.map((a) => ({ id: a.id, title: a.name, sub: ACH_CAT[a.cat] ?? l(a.cat, a.cat), icon: ic(a.icon, 'medal'), rows: [[l('Categoria', 'Category'), ACH_CAT[a.cat] ?? a.cat], [l('Secreta', 'Secret'), yn(a.hidden)]], text: [a.desc] })),
};

const cenarios: Cat29 = {
  id: 'cenarios', title: l('Cenários históricos', 'Historical scenarios'), icon: 'hourglass', group: 'historia',
  desc: l('Cenários com prazo, meta e medalhas: cidade, carreira, regras especiais e marcos datados.', 'Scenarios with a deadline, goal and medals: city, career, special rules and dated milestones.'),
  items: () => {
    // garante que os cenários das rodadas 17 e 23 entraram na lista única
    const all = [...SCENARIOS, ...SCENARIOS17, ...SCENARIOS23];
    const seen = new Set<string>();
    return all.filter((x) => !seen.has(x.id) && !!seen.add(x.id)).map((sc) => {
      const s17 = sc as Partial<Scenario17 & Scenario23>;
      return {
        id: sc.id, title: sc.name, sub: l(`${sc.startYear}–${sc.endYear} · ${cityL(sc.homeCity).pt}`, `${sc.startYear}–${sc.endYear} · ${cityL(sc.homeCity).en}`), icon: 'hourglass',
        rows: [
          [l('Período', 'Period'), `${sc.startYear}–${sc.endYear}`], [l('Cidade', 'City'), cityL(sc.homeCity)], [l('Começo', 'Start'), sc.scenario ?? '—'],
          [l('Carreiras', 'Careers'), sc.careers?.join(', ') ?? sc.role ?? 'label'], [l('Meta', 'Goal'), sc.goal],
          [l('Bronze / prata / ouro', 'Bronze / silver / gold'), l(`${sc.tiers.join(' / ')} ${sc.unit.pt}`, `${sc.tiers.join(' / ')} ${sc.unit.en}`)],
          ...(s17.capital23 ? [[l('Capital de fundação', 'Founding capital'), usd(s17.capital23)] as Row] : []),
          ...(s17.events17 ?? []).map((e) => [l(`${mon(e.month).pt} ${e.year}`, `${mon(e.month).en} ${e.year}`), e.title] as Row),
        ],
        text: [sc.desc, ...(s17.rules17 ?? [])], see: ['mech:modes', ...citySee(sc.homeCity)],
      };
    });
  },
};

const FX_L: Record<keyof StanceFx, L> = {
  appeal: l('Apelo', 'Appeal'), single: l('Singles', 'Singles'), ep: l('EPs', 'EPs'), lp: l('LPs', 'LPs'), fresh: l('Lançamentos novos', 'New releases'), reissue: l('Reedições e coletâneas', 'Reissues and compilations'),
  units: l('Vendas semanais', 'Weekly sales'), tail: l('Vendas de 12–52 semanas', 'Sales at 12–52 weeks'), catalog: l('Catálogo (52+ semanas)', 'Catalog (52+ weeks)'), show: l('Shows', 'Shows'), press: l('Imprensa', 'Press'),
  synth: l('Atos sintéticos', 'Synthetic acts'), human: l('Atos humanos', 'Human acts'),
};
const MON_L: Record<string, L> = { costPerAct: l('Custo por ato/mês', 'Cost per act/month'), fixed: l('Custo fixo/mês', 'Fixed cost/month'), casual: l('Fãs casuais/mês', 'Casual fans/month'), core: l('Fãs fiéis/mês', 'Core fans/month'), fame: l('Fama/mês', 'Fame/month'), fatigue: l('Cansaço/mês', 'Fatigue/month'), trust: l('Confiança/mês', 'Trust/month'), scandal: l('Chance de escândalo/mês', 'Scandal chance/month') };
const stanceRows = (st: StanceDef): Row[] => [
  ...Object.entries(st.fx).map(([k, v]) => [FX_L[k as keyof StanceFx] ?? l(k, k), mul(v as number)] as Row),
  ...Object.entries(st.monthly ?? {}).filter(([, v]) => v).map(([k, v]) => [MON_L[k] ?? l(k, k), k === 'costPerAct' || k === 'fixed' ? usd(v as number) : k === 'scandal' ? pc(v as number) : sgn(v as number)] as Row),
  [l('Rivais que preferem', 'Rivals who prefer it'), st.npc.join(', ') || '—'],
];
const posturas: Cat29 = {
  id: 'posturas-de-era', title: l('Posturas de era', 'Era stances'), icon: 'compass', group: 'historia',
  desc: l('A cada virada tecnológica o selo escolhe uma postura com efeitos duradouros. Aqui estão as eras, o modelo de negócio e cada postura com seus efeitos.', 'At each technological turn the label picks a stance with lasting effects. Here are the eras, the business model and each stance with its effects.'),
  items: () => {
    const out: CatItem29[] = [];
    for (const e of ERA_SHIFTS) {
      out.push({
        id: e.id, title: e.name, sub: l('Era', 'Era'), icon: 'hourglass',
        rows: [[l('Tecnologia', 'Technology'), techL(e.tech)], ...(e.after ?? []).map((a) => [l('Começa', 'Starts'), l(`${a.plus} anos depois de ${techL(a.tech).pt}`, `${a.plus} years after ${techL(a.tech).en}`)] as Row), [l('Posturas', 'Stances'), joinL(e.stances.map((s) => s.name))]],
        text: [e.model, ...(e.question.pt ? [e.question] : [])], see: techSee(e.tech),
      });
      for (const st of e.stances) out.push({ id: `${e.id}-${st.id}`, title: st.name, sub: e.name, icon: 'compass', rows: stanceRows(st), text: [st.desc, ...(st.scandalText ? [st.scandalText] : [])] });
    }
    return out;
  },
};

const KIND_EGG: Record<string, L> = { sim: l('Simulação', 'Simulation'), ui: l('Interface', 'Interface'), code: l('Código', 'Code'), feat: l('Conquista', 'Feat') };
const ovos: Cat29 = {
  id: 'ovos', title: l('Ovos de Páscoa', 'Easter eggs'), icon: 'sparkle', group: 'historia',
  desc: l('SPOILER: todos os ovos de Páscoa, com o gatilho, o efeito e a referência histórica real. Não abra se quiser descobrir sozinho.', 'SPOILER: every easter egg, with its trigger, effect and the real historical reference. Don\'t open if you want to find them yourself.'),
  items: () => EGGS27.map((e) => ({
    id: e.id, title: e.title, sub: l(`${e.era} · ${e.place.pt}`, `${e.era} · ${e.place.en}`), icon: 'sparkle',
    rows: [[l('Tipo', 'Kind'), KIND_EGG[e.kind] ?? e.kind], [l('Época', 'Era'), e.era], [l('Lugar', 'Place'), e.place], [l('Gatilho (spoiler)', 'Trigger (spoiler)'), e.how], [l('Efeito', 'Effect'), e.fx], ...(e.feat ? [[l('Conquista secreta', 'Secret feat'), e.feat] as Row] : [])],
    text: e.real ? [e.real] : undefined, see: ['mech:story'],
  })),
};

const cenas: Cat29 = {
  id: 'cenas', title: l('Cenas interativas', 'Interactive scenes'), icon: 'clapper', group: 'historia',
  desc: l('Cenas com escolhas (discurso, encontro, show, entrevista…): etapas, opções e o que cada uma insinua.', 'Scenes with choices (speech, date, show, interview…): stages, options and what each hints at.'),
  items: () => Object.values(DEFS17).map((d) => ({
    id: d.id, title: d.name, sub: d.major ? l('Cena grande', 'Major scene') : l('Cena', 'Scene'), icon: ic(d.icon, 'clapper'),
    rows: [
      [l('Cena grande', 'Major scene'), yn(d.major)], [l('Intervalo (meses)', 'Cooldown (months)'), d.cool !== undefined ? String(d.cool) : '—'], [l('Etapas', 'Stages'), String(d.stages.length)],
      ...d.stages.flatMap((st, i) => st.opts.map((o) => {
        const lab = txt(o.label) ?? l(o.id, o.id), h = txt(o.hint);
        return [l(`Etapa ${i + 1}: ${lab.pt}`, `Stage ${i + 1}: ${lab.en}`), h ?? l('(varia com a situação)', '(depends on the situation)')] as Row;
      })),
    ],
    text: d.stages.map((st) => txt(st.q)).filter((x): x is L => !!x),
    see: ['mech:story'],
  })),
};

const cenasAnimadas: Cat29 = {
  id: 'cenas-animadas', title: l('Cenas animadas', 'Animated cutscenes'), icon: 'film', group: 'historia',
  desc: l('Os grandes momentos que viram cena animada (primeiro disco, nº 1, escândalo, separação…): falas, efeitos e escolhas.', 'The big moments that become animated cutscenes (first record, No. 1, scandal, split…): lines, effects and choices.'),
  items: () => Object.values(CUT27).map((c) => ({
    id: c.key, title: c.title, sub: c.tier === 'major' ? l('Grande', 'Major') : l('Menor', 'Minor'), icon: 'film',
    rows: [
      [l('Porte', 'Tier'), c.tier === 'major' ? l('grande', 'major') : l('menor', 'minor')], [l('Cenário', 'Setting'), c.scene], [l('Prioridade', 'Priority'), String(c.prio)],
      [l('Duração', 'Duration'), `${nf(c.ms / 1000, 1)} s`], [l('Efeitos', 'Effects'), c.fx.join(', ') || '—'],
      ...c.choices.map((ch) => [ch.label, ch.hint] as Row),
    ],
    text: c.beats, see: ['mech:story'],
  })),
};

const FAN_L: Record<string, L> = { core: l('fãs fiéis', 'core fans'), active: l('fãs ativos', 'active fans'), casual: l('fãs casuais', 'casual fans') };
const merch: Cat29 = {
  id: 'merch', title: l('Produtos de merch', 'Merch products'), icon: 'tie', group: 'objetos',
  desc: l('Cada produto de merchandising: época, custo e preço por unidade e o público que compra.', 'Every merch product: era, unit cost and price, and who buys it.'),
  items: () => (Object.keys(SKUS) as Sku[]).map((k) => {
    const x = SKUS[k];
    return {
      id: k, title: x.name, sub: span(x.from, x.to), icon: 'tie',
      rows: [[l('Período', 'Period'), span(x.from, x.to)], [l('Custo por unidade', 'Unit cost'), usd(x.cost)], [l('Preço por unidade', 'Unit price'), usd(x.price)], [l('Margem bruta', 'Gross margin'), `${nf((1 - x.cost / x.price) * 100)}%`], [l('Público', 'Audience'), FAN_L[x.fan] ?? x.fan], [l('Vende mais no inverno', 'Sells more in winter'), yn(!!x.winter)]] as Row[],
      see: ['mech:money', 'mech:fame'],
    };
  }),
};

const equipamento: Cat29 = {
  id: 'equipamento-marcas', title: l('Fabricantes de equipamento', 'Gear makers'), icon: 'guitar', group: 'objetos',
  desc: l('Marcas de instrumentos e equipamento de estúdio reais, com os modelos, tipos, épocas e o bônus de som (produção, interpretação, originalidade).', 'Real instrument and studio gear brands, with models, kinds, eras and sound bonus (production, performance, originality).'),
  items: () => {
    const by = new Map<string, typeof GEAR19>();
    for (const g of GEAR19) { const k = g.maker || '—'; by.set(k, [...(by.get(k) ?? []), g]); }
    return [...by.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([maker, gs]) => ({
      id: maker.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'outros', title: maker, sub: l(`${gs.length} modelo(s)`, `${gs.length} model(s)`), icon: 'guitar',
      rows: [
        [l('Modelos', 'Models'), String(gs.length)], [l('Tipos', 'Kinds'), [...new Set(gs.map((g) => g.kind))].join(', ')],
        [l('Desde', 'Since'), String(Math.min(...gs.map((g) => g.from)))], [l('Gêneros', 'Genres'), famsL([...new Set(gs.flatMap((g) => g.fam))])],
        ...gs.map((g) => [l(g.name, g.name), l(`${g.kind} · ${span(g.from, g.to)}${g.fx ? ` · prod ${sgn(g.fx[0], 1)} / int ${sgn(g.fx[1], 1)} / orig ${sgn(g.fx[2], 1)}` : ''} · ${g.alt.pt}`, `${g.kind} · ${span(g.from, g.to)}${g.fx ? ` · prod ${sgn(g.fx[0], 1)} / perf ${sgn(g.fx[1], 1)} / orig ${sgn(g.fx[2], 1)}` : ''} · ${g.alt.en}`)] as Row),
      ],
      see: ['mech:music'],
    }));
  },
};

const pacotes: Cat29 = {
  id: 'pacotes-iniciais', title: l('Pacotes iniciais das carreiras', 'Career starter packages'), icon: 'briefcase', group: 'regras',
  desc: l('O negócio com que cada carreira começa (custo e manutenção) e os passos de terreno de um festival próprio.', 'The business each career starts with (cost and upkeep) and the ground steps of your own festival.'),
  items: () => [
    ...Object.entries(STARTER19).map(([k, x]): CatItem29 => ({ id: k, title: x.name, sub: l(`Carreira: ${k}`, `Career: ${k}`), icon: 'briefcase', rows: [[l('Carreira', 'Career'), k], [l('Custo', 'Cost'), usd(x.cost)], [l('Manutenção no 1º nível', 'Upkeep at level 1'), `×${nf(x.upkeep, 2)}`]], text: [x.desc], see: ['mech:careers'] })),
    ...GROUND19.map((g, i): CatItem29 => ({ id: `terreno-${i}`, title: g.name, sub: l('Terreno de festival', 'Festival ground'), icon: 'map', rows: [[l('Capacidade', 'Capacity'), Number.isFinite(g.cap) ? nf(g.cap) : l('sem limite', 'unlimited')], [l('Custo', 'Cost'), usd(g.cost)], [l('Exige', 'Requires'), g.need]], see: ['mech:careers', 'mech:live'] })),
  ],
};

export const CATS_B: Cat29[] = [
  formatos, canais, estudios, abordagens, casas, producao, sede, focoFiliais, departamentos, salas, andares, mobilia,
  situacoes, rivais, comecos, dificuldade, predefinicoes, bases, finais, legado, crimes, jaba,
  festivais, plataformas, midia, estudiosReais, premios, campanhas, regrasParadas, conquistas, cenarios, posturas, ovos,
  cenas, cenasAnimadas, merch, equipamento, pacotes,
];
