// R31 · onda 1 (A) — MENU "MUNDO PRIMEIRO" (modelo puro, sem DOM; testes em tests/r31-nav.test.ts).
// Plano: docs/r31/plano-telas.md §1, §2, §6, §7 e as ondas O1–O2 do §8.
//
// O menu lateral vira as portas de entrada (≤ 10): Hoje · Sede · Cidade · Mundo · Você · Listas · Buscar · Opções
// e, só quando fazem sentido, ★ Fixados (há páginas fixadas) e ⇄ Suas casas (2+ carreiras ativas).
// Cada entrada abre a área-base que já existe (cockpit / sede25 ou a casa da carreira / campus18 / world no mapa / you)
// e, abaixo da cena, a faixa "Lugares": um cartão por lugar com o contador de pendências e "ver detalhes", que abre a
// página antiga (nenhuma função some: a página antiga É o "ver detalhes"). Listas junta as páginas de texto em ≤ 6 abas
// + "Mais". O "Menu completo" (Opções, desligado por padrão) mostra a árvore clássica inteira.
//
// Regras:
//  - ids de área NÃO mudam (rotas #/área, atalhos KEY17, pins, ALIAS17, REDIRECT29 seguem iguais); este módulo só diz
//    em que entrada/lugar cada página mora (migalha "Entrada › Lugar", faixa de Lugares, contadores);
//  - toda página tem casa: tabela abaixo + páginas de carreira (casa da carreira principal = Sede; as outras são prédios
//    seus na Cidade ou no Mundo) + telas absorvidas (ALIAS17 → a casa da carreira) + "Outras páginas" em Listas;
//  - contadores vêm só de pendências ÚNICAS (src/sim/r31/pending.ts): cada pendência conta uma vez, na entrada e no lugar
//    do seu dono; atalhos não contam de novo.

import { l, type L } from '../../data/world';
import { ALIAS17, CAREER_PAGE17, ORDER17 } from '../nav17';

export type EntryId31 = 'hoje' | 'sede' | 'cidade' | 'mundo' | 'voce' | 'listas' | 'buscar' | 'opcoes' | 'fixados' | 'casas';
/** Entradas que são lugares (têm área-base e faixa de Lugares). */
export type WorldEntry31 = 'hoje' | 'sede' | 'cidade' | 'mundo' | 'voce';

export interface Entry31 {
  id: EntryId31;
  label: L;
  icon: string;
  /** área que a entrada abre (utilidades não têm) */
  home?: string;
  /** aba a abrir junto com a área-base */
  tab?: [string, string];
  /** utilidade: abre painel, não página */
  util?: 'search' | 'options' | 'pins' | 'houses';
  /** tecla (Shift + dígito) */
  key?: string;
  /** só aparece em certas condições */
  cond?: boolean;
}

export interface Place31 {
  id: string;
  entry: EntryId31;
  label: L;
  icon: string;
  /** páginas do lugar; a 1ª é o "ver detalhes" principal */
  areas: string[];
  /** aba a abrir com a página principal */
  tab?: [string, string];
  /** lugar que É a área-base da entrada (não vira cartão) */
  home?: boolean;
  /** casa de carreira (★ quando secundária) */
  career?: string;
}

/** Área virtual de Listas (rota #/lists30; abre a última lista vista). */
export const LISTS31 = 'lists30';
/** Chave de aba das Listas (rota #/lists30/l30=calendar). */
export const LKEY31 = 'l30';
/** Área virtual da Sede em corte (ps/nav25.SEDE25 — repetida aqui para o modelo não puxar a árvore antiga). */
export const SEDE31 = 'sede25';
/** Aba do mapa no Mundo (sys/mundo27model.MAPTAB27). */
export const MAP_TAB31: [string, string] = ['worldHub', 'map27'];
/** Teto do menu (plano §1: 8 fixas + 2 condicionais). */
export const MENU_MAX31 = 10;
export { TABS_MAX31 } from './view27';

const E = (id: EntryId31, label: L, icon: string, o: Partial<Entry31> = {}): Entry31 => ({ id, label, icon, ...o });
/** As 8 entradas fixas, na ordem do menu. */
export const ENTRIES31: Entry31[] = [
  E('hoje', l('Hoje', 'Today'), 'calendar', { home: 'cockpit', key: '1' }),
  E('sede', l('Sede', 'HQ'), 'house', { home: SEDE31, key: '2' }),
  E('cidade', l('Cidade', 'City'), 'skyline', { home: 'campus18', key: '3' }),
  E('mundo', l('Mundo', 'World'), 'globe', { home: 'world', tab: MAP_TAB31, key: '4' }),
  E('voce', l('Você', 'You'), 'star', { home: 'you', key: '5' }),
  E('listas', l('Listas', 'Lists'), 'scroll', { home: LISTS31, key: '6' }),
  E('buscar', l('Buscar', 'Search'), 'compass', { util: 'search' }),
  E('opcoes', l('Opções', 'Options'), 'key', { util: 'options' }),
];
export const PINS31 = E('fixados', l('Fixados', 'Pinned'), 'star', { util: 'pins', cond: true });
export const HOUSES31 = E('casas', l('Suas casas', 'Your houses'), 'building', { util: 'houses', cond: true });
export const entry31 = (id: EntryId31): Entry31 => [...ENTRIES31, PINS31, HOUSES31].find((x) => x.id === id)!;

// ---------------------------------------------------------------- lugares (tabela §2 do plano-telas, onda O1)

const P = (id: string, entry: EntryId31, label: L, icon: string, areas: string[], o: Partial<Place31> = {}): Place31 => ({ id, entry, label, icon, areas, ...o });
/** Lugares fixos. Páginas de carreira entram por `careerPlace31` (dependem da carreira principal). */
export const PLACES31: Place31[] = [
  // Hoje — a Mesa do chefe (cockpit) e o que fica nela
  P('desk', 'hoje', l('Mesa do chefe', 'Boss\'s desk'), 'calendar', ['cockpit'], { home: true }),
  P('tray', 'hoje', l('Bandeja de entrada', 'Inbox tray'), 'newspaper', ['inbox'], { tab: ['ck20', 'inbox'] }),
  P('month', 'hoje', l('Mesa do mês', 'Monthly desk'), 'contract', ['desk'], { tab: ['ck20', 'desk'] }),
  P('plan', 'hoje', l('Compromissos e decisões', 'Commitments and decisions'), 'clock', ['plan']),
  P('goals', 'hoje', l('Quadro de metas', 'Goals board'), 'target', ['goals']),
  P('diary', 'hoje', l('Caderno (diário)', 'Notebook (diary)'), 'book', ['diary']),
  P('dm', 'hoje', l('Fios do Mestre', 'Master\'s threads'), 'dice', ['dm18']),
  // Sede — salas do prédio (corte da sede)
  P('hq', 'sede', l('Sede em corte', 'HQ cutaway'), 'house', [SEDE31], { home: true }),
  P('studio', 'sede', l('Estúdio', 'Studio'), 'mic', ['studio']),
  P('lounge', 'sede', l('Lounge do elenco', 'Artist lounge'), 'guitar', ['artists', 'people', 'dyn18']),
  P('office', 'sede', l('Escritório e equipe', 'Office and staff'), 'people', ['team', 'company', 'firm19', 'agenda17']),
  P('anr', 'sede', l('A&R e talentos', 'A&R and talent'), 'eye', ['market']),
  P('projects', 'sede', l('Rua dos projetos', 'Project street'), 'cassette', ['project', 'creation', 'songmkt27']),
  P('vitrine', 'sede', l('Vitrine de lançamentos', 'Release window'), 'cd', ['releases']),
  P('archive', 'sede', l('Arquivo e catálogo', 'Archive and catalog'), 'gold-disc', ['catalog', 'tribute19', 'media19']),
  P('trophy', 'sede', l('Troféus e Hall da Fama', 'Trophies and Hall of Fame'), 'medal', ['awards', 'rockhall']),
  P('meeting', 'sede', l('Sala de reunião', 'Meeting room'), 'signpost', ['long18']),
  P('board', 'sede', l('Diretoria (delegação)', 'Boardroom (delegation)'), 'handshake', ['deleg31']),
  P('works', 'sede', l('Obras e operação', 'Works and operations'), 'pin', ['hq']),
  // Cidade — prédios do Nosso mundo
  P('city', 'cidade', l('Nosso mundo', 'Our world'), 'skyline', ['campus18'], { home: true }),
  P('venues', 'cidade', l('Casas de show', 'Venues'), 'tour-bus', ['shows', 'live19']),
  P('press', 'cidade', l('Jornal e banca', 'Newspaper and newsstand'), 'megaphone', ['news17', 'known27', 'critics', 'zines19']),
  P('radio', 'cidade', l('Rádio, TV e mídia', 'Radio, TV and media'), 'camera', ['media']),
  P('bar', 'cidade', l('Bar e clube', 'Bar and club'), 'seedling', ['talent18', 'after18']),
  P('agents', 'cidade', l('Escritórios de empresários', 'Managers\' offices'), 'briefcase', ['managers14']),
  P('studios', 'cidade', l('Estúdios e produtores', 'Studios and producers'), 'headphones', ['producers15']),
  P('rivals', 'cidade', l('Gravadoras rivais', 'Rival labels'), 'flag', ['labels']),
  P('under', 'cidade', l('Submundo e delegacia', 'Underworld and police'), 'mask', ['crime', 'fakes19']),
  P('cityhall', 'cidade', l('Prefeitura e sociedade', 'City hall and society'), 'columns', ['society18']),
  P('plant', 'cidade', l('Fábrica e distribuição', 'Plant and distribution'), 'factory', ['supply18']),
  // Mundo — mapa-múndi e camadas
  P('map', 'mundo', l('Mapa-múndi', 'World map'), 'map', ['world'], { home: true, tab: MAP_TAB31 }),
  P('thismonth', 'mundo', l('Este mês no mundo', 'This month in the world'), 'globe', ['mundo27', 'world17']),
  P('regions', 'mundo', l('Mercados e política', 'Markets and politics'), 'passport', ['regions18', 'regions19']),
  P('fests', 'mundo', l('Festivais', 'Festivals'), 'ticket', ['festivals']),
  P('culture', 'mundo', l('Cultura e lendas', 'Culture and legends'), 'hologram', ['movements', 'lendas']),
  // Você — cômodos da sua casa
  P('living', 'voce', l('Sala (perfil)', 'Living room (profile)'), 'fame', ['you'], { home: true }),
  P('family', 'voce', l('Família e contatos', 'Family and contacts'), 'heart', ['personal']),
  P('vault', 'voce', l('Cofre (patrimônio)', 'Safe (wealth)'), 'diamond', ['wealth']),
  P('homeoffice', 'voce', l('Escritório em casa', 'Home office'), 'compass', ['careers', 'ventures', 'shared18']),
  P('shelf', 'voce', l('Estante (álbum de cenas)', 'Shelf (scene album)'), 'shirt', ['scenes17']),
  P('night', 'voce', l('Sair à noite', 'Night out'), 'sleep', ['night14']),
  // Opções
  P('help', 'opcoes', l('Ajuda', 'Help'), 'bulb', ['tut18']),
];

// ---------------------------------------------------------------- Listas (≤ 6 abas + Mais)

export interface ListTab31 { id: string; label: L; icon: string; areas: string[]; /** aba de "Mais" */ more?: boolean; /** só atalho (a página mora em outro lugar) */ ref?: boolean }
export const LIST_TABS31: ListTab31[] = [
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'fans', areas: ['directory', 'knownacts27'] },
  { id: 'contracts', label: l('Contratos e direitos', 'Contracts and rights'), icon: 'quill', areas: ['contracts19', 'rights18', 'artist18'] },
  { id: 'finance', label: l('Finanças', 'Finances'), icon: 'money', areas: ['finance', 'business'] },
  { id: 'charts', label: l('Paradas', 'Charts'), icon: 'chart-up', areas: ['charts'] },
  { id: 'calendar', label: l('Calendário completo', 'Full calendar'), icon: 'datebook', areas: ['calendar19', 'cal17'] },
  { id: 'data', label: l('Dados de mercado', 'Market data'), icon: 'coin', areas: ['industry', 'market19a'] },
  { id: 'awards', label: l('Premiações', 'Awards'), icon: 'medal', areas: ['awards', 'rockhall'], more: true, ref: true },
  { id: 'other', label: l('Outras páginas', 'Other pages'), icon: 'key', areas: [], more: true },
];
/** Aba das Listas que é DONA da página (atalhos de "Mais" não contam). */
export const listTabOf31 = (area: string): ListTab31 | undefined => LIST_TABS31.find((x) => !x.ref && x.areas.includes(area));

// ---------------------------------------------------------------- carreiras

/** Rótulo da entrada Sede pela carreira principal (plano §4). */
export const SEDE_LABEL31: Record<string, L> = {
  label: l('Sede', 'HQ'), musician: l('QG da banda', 'Band HQ'), manager: l('Escritório', 'Office'), booking: l('Agência', 'Agency'),
  festival: l('Terreno do festival', 'Festival grounds'), venue: l('Sua casa de shows', 'Your venue'), studio: l('Seu estúdio', 'Your studio'),
  publisher: l('Sua editora', 'Your publisher'), media: l('Redação', 'Newsroom'), platform: l('Sala de servidores', 'Server room'),
  screen: l('Estúdio de cinema', 'Film studio'), critic: l('Sua mesa no jornal', 'Your desk at the paper'),
};
/** Onde fica a casa de uma carreira SECUNDÁRIA (prédio seu, com ★). */
export const CAREER_ENTRY31: Record<string, EntryId31> = { booking: 'mundo', festival: 'mundo' };

export interface MenuCtx31 {
  /** carreiras ativas (a 1ª é a principal) */
  active: string[];
  /** carreiras com página visível agora (careerPages17) */
  pages?: string[];
  /** há páginas fixadas */
  pins?: number;
  /** a cena da sede (sede25) está registrada */
  sede?: boolean;
  /** página registrada e visível agora (sem função = tudo visível) */
  has?: (area: string) => boolean;
  /** páginas registradas fora da tabela (caem em Listas › Outras páginas) */
  extra?: string[];
}
export const mainCareer31 = (ctx: MenuCtx31): string => ctx.active[0] ?? 'label';
const careerOfArea = (area: string): string | undefined => ORDER17.find((id) => CAREER_PAGE17[id].area === area);

/** Lugar da página de uma carreira: a principal é a Sede; as outras são prédios seus (★) na Cidade ou no Mundo. */
export function careerPlace31(id: string, ctx: MenuCtx31): Place31 {
  const cp = CAREER_PAGE17[id];
  const main = mainCareer31(ctx) === id;
  const areas = [cp.area, ...cp.absorbs];
  if (main) return P(`career:${id}`, 'sede', cp.label, cp.icon, areas, { career: id, home: id !== 'label' || !ctx.sede });
  return P(`career:${id}`, CAREER_ENTRY31[id] ?? 'cidade', cp.label, cp.icon, areas, { career: id });
}

/** Área que a entrada abre (Sede: a casa da carreira principal). */
export function entryHome31(id: EntryId31, ctx: MenuCtx31): string | undefined {
  if (id === 'sede') {
    const m = mainCareer31(ctx);
    return m === 'label' && ctx.sede !== false ? SEDE31 : CAREER_PAGE17[m]?.area ?? SEDE31;
  }
  return entry31(id).home;
}
export function entryLabel31(id: EntryId31, ctx: MenuCtx31): L {
  return id === 'sede' ? SEDE_LABEL31[mainCareer31(ctx)] ?? entry31('sede').label : entry31(id).label;
}

/** As entradas visíveis do menu (≤ 10), na ordem. */
export function menu31(ctx: MenuCtx31): Entry31[] {
  const out: Entry31[] = ENTRIES31.map((e) => ({ ...e, label: entryLabel31(e.id, ctx), home: entryHome31(e.id, ctx) }));
  if ((ctx.pins ?? 0) > 0) out.push(PINS31);
  if (ctx.active.length >= 2) out.push(HOUSES31);
  return out.slice(0, MENU_MAX31);
}

// ---------------------------------------------------------------- área → lugar → entrada

const STATIC_PLACE = new Map<string, Place31>();
for (const p of PLACES31) for (const a of p.areas) if (!STATIC_PLACE.has(a)) STATIC_PLACE.set(a, p);
const OTHER_PLACE = (area: string): Place31 => P('list:other', 'listas', LIST_TABS31.find((x) => x.id === 'other')!.label, 'key', [area]);

/** Lugar dono de uma página (sempre existe: o que não tem casa vai a Listas › Outras páginas). */
export function placeOf31(area: string, ctx: MenuCtx31): Place31 {
  const sp = STATIC_PLACE.get(area);
  if (sp) return sp;
  const c = careerOfArea(area) ?? (ALIAS17[area] ? careerOfArea(ALIAS17[area][0]) : undefined);
  if (c) return careerPlace31(c, ctx);
  const lt = listTabOf31(area);
  if (lt) return P(`list:${lt.id}`, 'listas', lt.label, lt.icon, lt.areas);
  return OTHER_PLACE(area);
}
export const entryOf31 = (area: string, ctx: MenuCtx31): EntryId31 => (area === LISTS31 ? 'listas' : placeOf31(area, ctx).entry);

/** Lugares de uma entrada que viram cartão na faixa "Lugares" (sem a área-base; só os que têm página visível). */
export function placesOf31(entry: EntryId31, ctx: MenuCtx31): Place31[] {
  const has = ctx.has ?? (() => true);
  const home = entryHome31(entry, ctx);
  const careers = ORDER17.filter((id) => ctx.active.includes(id) || (ctx.pages ?? []).includes(id)).map((id) => careerPlace31(id, ctx));
  const all = [...careers.filter((p) => p.entry === entry), ...PLACES31.filter((p) => p.entry === entry)];
  return all
    .map((p) => ({ ...p, areas: p.areas.filter((a) => a !== home && (has(a) || a === 'inbox' || a === 'desk')) }))
    .filter((p) => p.areas.length > 0);
}

/** Caminho de cliques até a página: [entrada, lugar?]. Página-base = 1 clique; página de lugar = 2 (entrada → cartão). */
export function pathTo31(area: string, ctx: MenuCtx31): { entry: EntryId31; place?: Place31; clicks: number } {
  const entry = entryOf31(area, ctx);
  if (entryHome31(entry, ctx) === area) return { entry, clicks: 1 };
  const place = placeOf31(area, ctx);
  return { entry, place, clicks: 2 };
}

// ---------------------------------------------------------------- contadores (pendência única)

/** Pendência como o menu precisa (forma mínima de src/sim/r31/pending.ts). */
export interface PendLike31 { id: string; owner: { area: string } }
/** Entradas e lugares com pendências. Cada pendência conta UMA vez, na entrada e no lugar do seu dono. */
export function badges31(list: readonly PendLike31[], ctx: MenuCtx31): { entry: Partial<Record<EntryId31, number>>; place: Record<string, number>; total: number } {
  const entry: Partial<Record<EntryId31, number>> = {};
  const place: Record<string, number> = {};
  const seen = new Set<string>();
  for (const p of list) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const pl = placeOf31(p.owner.area, ctx);
    entry[pl.entry] = (entry[pl.entry] ?? 0) + 1;
    place[pl.id] = (place[pl.id] ?? 0) + 1;
  }
  return { entry, place, total: seen.size };
}

// ---------------------------------------------------------------- abas com "Mais"
// (a regra mora em view27.ts, sem dependências, porque vis.ts usa)
export { shownTabs31 } from './view27';

// ---------------------------------------------------------------- busca (entradas e lugares)

export interface Find31 { label: L; hint: L; terms: string[]; area?: string; tab?: [string, string]; entry: EntryId31 }
const TERMS31: Record<string, string[]> = {
  hoje: ['hoje', 'today', 'mesa', 'cockpit', 'agora', 'painel'], sede: ['sede', 'hq', 'predio', 'casa da carreira'], cidade: ['cidade', 'city', 'nosso mundo', 'bairro'],
  mundo: ['mundo', 'world', 'mapa', 'map'], voce: ['voce', 'you', 'casa', 'vida'], listas: ['listas', 'lists', 'tabelas', 'indice'],
  tray: ['bandeja', 'caixa de entrada', 'inbox', 'mensagens'], trophy: ['trofeus', 'museu', 'hall da fama', 'premios'], vault: ['cofre', 'patrimonio', 'bens'],
  under: ['submundo', 'delegacia', 'policia', 'crime'], plant: ['fabrica', 'prensagem', 'distribuicao'], venues: ['casa de show', 'shows', 'palco'],
  press: ['jornal', 'banca', 'noticias', 'boatos'], bar: ['bar', 'clube', 'noite', 'talentos'], rivals: ['rivais', 'gravadoras', 'ceo'],
  cityhall: ['prefeitura', 'camara', 'sociedade', 'censura'], night: ['sair a noite', 'noite', 'encontros'], homeoffice: ['carreiras', 'socios', 'empreendimentos'],
};
/** Itens de busca das entradas, lugares e abas das Listas (rótulos antigos continuam achando as páginas pela busca atual). */
export function find31(ctx: MenuCtx31): Find31[] {
  const out: Find31[] = [];
  for (const e of menu31(ctx)) if (e.home) out.push({ label: e.label, hint: l('Entrada do menu', 'Menu entry'), terms: TERMS31[e.id] ?? [], area: e.home, tab: e.tab, entry: e.id });
  for (const e of ['hoje', 'sede', 'cidade', 'mundo', 'voce'] as const) {
    const el = entryLabel31(e, ctx);
    for (const p of placesOf31(e, ctx)) out.push({ label: p.label, hint: el, terms: TERMS31[p.id] ?? [], area: p.areas[0], tab: p.tab, entry: e });
  }
  for (const x of LIST_TABS31) if (x.areas.length) out.push({ label: x.label, hint: l('Listas', 'Lists'), terms: [], area: x.areas[0], entry: 'listas' });
  return out;
}
