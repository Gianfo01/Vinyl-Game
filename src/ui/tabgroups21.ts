// Rodada 21e (UX 2.3.7, 2.3.8, 2.3.17) — agrupamento de abas e índice estático das subabas.
// Módulo puro (sem DOM, sem estado de outros módulos): `tabs()` em vis.ts consulta GROUPS21 pela chave da barra;
// o Ctrl+K e o teste r21e-nav leem GROUPS21 + HUB_TABS21 sem precisar abrir a página.
//
// Regra: nenhuma tela some. Cada id antigo de aba continua sendo o id "interno" (segmento) — `setTab(chave, idAntigo)`,
// a rota `#/area/chave=idAntigo` e a ajuda `tab:chave:idAntigo` seguem valendo. A barra mostra só os grupos (≤ 6);
// um grupo com mais de uma aba mostra os segmentos dentro do conteúdo.

import { l, type L } from '../data/world';

export interface TabRef21 { id: string; label: L }
export interface TabGroup21 { id: string; label: L; icon?: string; tabs: TabRef21[] }
export interface GroupedBar21 { area: string; groups: TabGroup21[] }

const r = (id: string, pt: string, en: string): TabRef21 => ({ id, label: l(pt, en) });
const G = (id: string, pt: string, en: string, icon: string, tabs: TabRef21[]): TabGroup21 => ({ id, label: l(pt, en), icon, tabs });

/** Barras agrupadas, por chave do `tabs()` (data-tabs). Abas registradas depois e fora de qualquer grupo caem em "Mais". */
export const GROUPS21: Record<string, GroupedBar21> = {
  // Gravadora (página da carreira de selo): 6 + 2 fileiras → 1 fileira de 5 com segmentos
  'cp17-label': { area: 'cp17-label', groups: [
    G('identity', 'Identidade', 'Identity', 'flag', [r('identity', 'Identidade do selo', 'Label identity'), r('lead', 'Liderança', 'Leadership')]),
    G('biz17', 'Venda & catálogo', 'Sale & catalog', 'bank', [r('biz17', 'Venda & catálogo', 'Sale & catalog')]),
    G('trade', 'Canais e imagem', 'Channels and image', 'disc', [r('trade', 'Canais, licenças e merch', 'Channels, licensing and merch'), r('image', 'Imagem & voz', 'Image & voice')]),
    G('circuit', 'Circuito', 'Circuit', 'trophy', [r('circuit', 'Circuito, vaquinhas e reencontros', 'Circuit, crowdfunding and reunions')]),
    G('venues', 'Casas de show', 'Venues', 'mic', [r('venues', 'Casas de show', 'Venues')]),
  ] },
  // Finanças: 8 → 4
  'business-finance': { area: 'finance', groups: [
    G('pos20', 'Posição', 'Position', 'money', [r('pos20', 'Posição', 'Position')]),
    G('dre18', 'DRE e caixa', 'P&L and cash', 'chart-up', [r('dre18', 'DRE e caixa', 'P&L and cash')]),
    G('capital', 'Capital', 'Capital', 'bank', [r('capital', 'Sócios', 'Partners'), r('loans7', 'Empréstimos', 'Loans'), r('stakes8', 'Participações', 'Stakes'), r('stock', 'Bolsa', 'Stock market')]),
    G('overview', 'Balanço e dívida', 'Balance and debt', 'bank', [r('overview', 'Balanço', 'Balance'), r('debt19', 'Dívida e catálogo', 'Debt & catalog')]),
  ] },
  // Negócios: 12 → 5
  'business-business': { area: 'business', groups: [
    G('era8', 'Era e estratégia', 'Era and strategy', 'clock', [r('era8', 'Era e estratégia', 'Era and strategy'), r('org12', 'Estrutura x era', 'Structure vs era'), r('eras18', 'Adoção e futuro', 'Adoption and future'), r('why12', 'Por que deu nisso?', 'Why did this happen?')]),
    G('grupo19', 'Grupo', 'Group', 'building', [r('grupo19', 'Consolidado', 'Consolidated'), r('subs', 'Subselos', 'Sub-labels'), r('companies', 'Empresas', 'Companies')]),
    G('catalog', 'Catálogo e direitos', 'Catalog and rights', 'disc', [r('catalog', 'Catálogo', 'Catalog'), r('rights8', 'Direitos', 'Rights')]),
    G('brands', 'Marcas e sync', 'Brands & sync', 'handshake', [r('brands', 'Marcas e sync', 'Brands & sync')]),
    G('legal', 'Jurídico', 'Legal', 'gavel', [r('legal', 'Processos', 'Lawsuits'), r('dispute15', 'Disputas', 'Disputes'), r('ai8', 'IA e autoria', 'AI and authorship')]),
  ] },
  // Mídia: 8 → 5
  mediaHub: { area: 'media', groups: [
    G('press', 'Imprensa e crítica', 'Press and critics', 'newspaper', [r('press', 'Imprensa e crítica', 'Press and critics')]),
    G('channels', 'Canais e reputação', 'Channels and reputation', 'radio', [r('channels', 'Canais e reputação', 'Channels and reputation')]),
    G('radio18', 'Rádio', 'Radio', 'radio', [r('radio18', 'Formatos', 'Formats'), r('w4radio', 'Jabá', 'Payola')]),
    G('mk18', 'Campanhas e clipes', 'Campaigns and videos', 'chart-up', [r('mk18', 'Campanhas', 'Campaigns'), r('clips18', 'Clipes, virais e pistas', 'Videos, virals and clubs')]),
    G('st18', 'Público e paradas', 'Audience and charts', 'stream', [r('st18', 'Público e streaming', 'Audience and streaming'), r('w4method', 'Paradas e metodologia', 'Charts and methodology')]),
  ] },
  // Direitos: 10 → 5
  rights18: { area: 'rights18', groups: [
    G('sum', 'Resumo', 'Overview', 'contract', [r('sum', 'Resumo', 'Overview')]),
    G('works', 'Obras e gravações', 'Works and recordings', 'note', [r('works', 'Obras', 'Works'), r('rec', 'Gravações e versões', 'Recordings & versions'), r('cat', 'Catálogo', 'Catalog')]),
    G('clr', 'Autorizações e disputas', 'Clearances and disputes', 'gavel', [r('clr', 'Autorizações', 'Clearances'), r('disp', 'Disputas', 'Disputes'), r('prec', 'Precedentes', 'Precedents')]),
    G('soc', 'Sociedades e extratos', 'Societies and statements', 'globe', [r('soc', 'Sociedades', 'Societies'), r('stm', 'Extratos', 'Statements')]),
    G('pub', 'Editora', 'Publisher', 'pen', [r('pub', 'Editora', 'Publisher')]),
  ] },
  // Lendas: 11 → 5
  lendas9: { area: 'lendas', groups: [
    G('pan', 'Panteão e biografias', 'Pantheon and biographies', 'vault', [r('pan', 'Panteão', 'Pantheon'), r('bio', 'Biografias', 'Biographies'), r('post18', 'Legado póstumo', 'Posthumous legacy')]),
    G('tl', 'Linha do tempo', 'Timeline', 'clock', [r('tl', 'Linha do tempo', 'Timeline'), r('eras17', 'Épocas', 'Eras')]),
    G('relics', 'Relíquias', 'Relics', 'vault', [r('relics', 'Relíquias', 'Relics'), r('relics18', 'Acervo vivo', 'Living collection'), r('estate19', 'Espólio', 'Estate')]),
    G('city', 'Cidades e cenas', 'Cities and scenes', 'globe', [r('city', 'Cidades e cenas', 'Cities and scenes')]),
    G('press', 'Jornal e livro', 'Newspaper and book', 'newspaper', [r('press', 'Jornal', 'Newspaper'), r('book', 'Livro e mundo', 'Book and world')]),
  ] },
};

/** Subabas dos hubs r20 (e de outras páginas com abas fixas), para o Ctrl+K indexar sem a página aberta. */
export const HUB_TABS21: Record<string, { area: string; tabs: TabRef21[] }> = {
  showsHub: { area: 'shows', tabs: [r('agenda', 'Agenda', 'Agenda'), r('tours', 'Turnês', 'Tours'), r('ops', 'Políticas e operação', 'Policies and operation'), r('biz', 'Negócios ao vivo', 'Live business'), r('all', 'Tudo (especialista)', 'Everything (expert)')] },
  hqHub: { area: 'hq', tabs: [r('ops', 'Operação', 'Operation'), r('structure', 'Estrutura', 'Structure'), r('team', 'Equipe e departamentos', 'Staff and departments'), r('gear', 'Equipamentos e conforto', 'Gear and comfort'), r('expand', 'Expansão', 'Expansion'), r('history', 'História', 'History'), r('all', 'Tudo (especialista)', 'Everything (expert)')] },
  companyTabs: { area: 'company', tabs: [r('finances', 'Resumo financeiro', 'Financial summary'), r('staff', 'Equipe', 'Staff'), r('hq', 'Sede', 'HQ'), r('legacy', 'Legado', 'Legacy')] },
  people: { area: 'people', tabs: [r('roster', 'Elenco', 'Roster'), r('health', 'Saúde', 'Health'), r('relations', 'Relações', 'Relationships'), r('secrets', 'Segredos', 'Secrets'), r('staff', 'Equipe', 'Staff'), r('feed', 'Cartas e recados', 'Letters and notes')] },
  marketHub: { area: 'market', tabs: [r('classic', 'Radar e pipeline', 'Radar and pipeline'), r('discovery', 'Olheiros, concursos e demos', 'Scouts, contests and demos'), r('auctions', 'Leilões', 'Auctions'), r('dossier8', 'Dossiês e faro de A&R', 'Dossiers and A&R instinct'), r('w4fairs', 'Feiras', 'Fairs')] },
  chartsHub: { area: 'charts', tabs: [r('global', 'Parada mundial', 'World chart'), r('more', 'Outras paradas', 'Other charts'), r('countries', 'Por país e formato', 'By country and format'), r('hype12', 'Hype', 'Hype')] },
  worldHub: { area: 'world', tabs: [r('map', 'Mapa e cenas', 'Map and scenes'), r('history', 'História, leis e lugares', 'History, laws and places'), r('countries', 'Países', 'Countries'), r('scene12', 'Cenas locais', 'Local scenes'), r('history19', 'Marcos da história', 'History milestones'), r('era1889', 'Era acústica', 'Acoustic era')] },
  catalogHub: { area: 'catalog', tabs: [r('list', 'Catálogo', 'Catalog'), r('sync15', 'Sync', 'Sync'), r('story12', 'História do selo', 'Label story'), r('retro', 'Retrospectiva', 'Retrospective')] },
  'creation-write': { area: 'creation', tabs: [r('projects', 'Projetos', 'Projects'), r('compose', 'Compor', 'Write'), r('repertoire', 'Repertório', 'Repertoire'), r('cr-themes', 'Temas e tendências', 'Themes and trends'), r('cr-recipe', 'Receita sonora', 'Sound recipe'), r('cr-partners', 'Parcerias', 'Partners'), r('cr-comm', 'Encomendas', 'Commissions'), r('cr-div', 'Divisões', 'Divisions'), r('writers19', 'Créditos e autores', 'Credits & writers'), r('gear19', 'Equipamento', 'Gear')] },
  'creation-studio': { area: 'studio', tabs: [r('session', 'Sessões', 'Sessions'), r('session19', 'Músicos de sessão', 'Session players'), r('studio-gear', 'Equipamento', 'Gear'), r('cr-sound', 'Direção sonora', 'Sound direction'), r('versions', 'Covers e versões', 'Covers & versions'), r('neural', 'Era sintética', 'Synthetic era')] },
  'creation-release': { area: 'releases', tabs: [r('launch', 'Lançar', 'Release'), r('rollout', 'Rollout', 'Rollout'), r('cr-visuals', 'Capa e vídeo', 'Cover and video'), r('cr-cover', 'Capa', 'Cover'), r('cr-catalog', 'Remaster e standards', 'Remasters and standards')] },
};

/** Grupo que contém a aba (id interno) ou cujo id é o próprio id. */
export function groupOfTab21(key: string, id: string): TabGroup21 | undefined {
  const d = GROUPS21[key];
  if (!d) return undefined;
  return d.groups.find((g) => g.id === id) ?? d.groups.find((g) => g.tabs.some((x) => x.id === id));
}

/** Arranja as abas reais de uma barra nos grupos declarados; o que sobra vira um grupo "Mais" (ou uma aba solta, se for só uma). */
export function arrange21<T extends { id: string }>(key: string, items: T[]): { id: string; label: L; icon?: string; items: T[] }[] {
  const d = GROUPS21[key];
  if (!d) return items.map((i) => ({ id: i.id, label: l(i.id, i.id), items: [i] }));
  const byId = new Map(items.map((i) => [i.id, i] as const));
  const out: { id: string; label: L; icon?: string; items: T[] }[] = d.groups.map((g) => ({ id: g.id, label: g.label, icon: g.icon, items: g.tabs.map((x) => byId.get(x.id)).filter((x): x is T => !!x) })).filter((g) => g.items.length);
  const placed = new Set(out.flatMap((g) => g.items.map((i) => i.id)));
  const rest = items.filter((i) => !placed.has(i.id));
  if (rest.length === 1) out.push({ id: rest[0].id, label: l(rest[0].id, rest[0].id), items: rest });
  else if (rest.length > 1) out.push({ id: 'more21', label: l('Mais', 'More'), icon: 'key', items: rest });
  return out;
}

/** Entradas do índice (Ctrl+K): área, chave da barra, aba interna e o rótulo completo "Grupo › Aba". */
export function tabIndex21(): { area: string; key: string; id: string; group?: L; label: L }[] {
  const out: { area: string; key: string; id: string; group?: L; label: L }[] = [];
  for (const [key, d] of Object.entries(GROUPS21)) for (const g of d.groups) for (const x of g.tabs) out.push({ area: d.area, key, id: x.id, group: g.tabs.length > 1 ? g.label : undefined, label: x.label });
  for (const [key, d] of Object.entries(HUB_TABS21)) for (const x of d.tabs) out.push({ area: d.area, key, id: x.id, label: x.label });
  return out;
}
