// Rodada 29 (REORG, M01/M02 da Bíblia de UI/UX — docs/biblia-ui-ux.md, docs/reorg29.md) — o CATÁLOGO ÚNICO de destinos.
// Sem DOM (testável em tests/r29-reorg.test.ts). Não é outra árvore de menu: é DERIVADO das fontes que já existem
// (SECTIONS25 = os 8 grupos, HUBS27 = vista Essencial, NAV17/ALIAS17/CAREER_PAGE17 = ids antigos e páginas de carreira).
// Ele acrescenta só o que faltava, num lugar:
//   - as 17 telas canônicas S01–S17 (Parte VIII da Bíblia: casa nos 8 grupos, nenhum macromenu novo);
//   - aliases de NOME (Submundo/Crime/Fraudes, artista/ato, disco/lançamento…) e ids de tela ("s07", "S07");
//   - intenções ("Quero contratar", "Quero lançar"…) que levam a etapas EXISTENTES (M02);
//   - o motivo de disponibilidade de cada destino (no menu, aba de uma carreira, ainda não existe na era, redireciona).
// Regra de preservação: nenhum id antigo deixa de abrir; o índice mostra TODOS (inclusive os indisponíveis, com o motivo).

import { l, type L } from '../../data/world';
import { ALIAS17, CAREER_PAGE17, NAV17, ORDER17 } from '../nav17';
import { KNOWN25, SEDE25, sectionIdOf25 } from './nav25';
import { HUBS27, hubOf27 } from './hub27model';

/** Os 8 grupos (ids das seções r27). Preferências, ajuda, índice e campanha são utilidades globais, não grupos. */
export const GROUPS29 = ['cockpit', 'sede', 'people', 'projects', 'live', 'world', 'admin', 'you'] as const;
export type Group29 = (typeof GROUPS29)[number];

export type ScreenId29 = 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06' | 'S07' | 'S08' | 'S09' | 'S10' | 'S11' | 'S12' | 'S13' | 'S14' | 'S15' | 'S16' | 'S17';

/** Um alvo de navegação: página (+ aba opcional), ou utilidade global (abre um painel, não uma página). */
export interface Target29 { area?: string; tab?: [string, string]; util?: 'index' | 'campaign' | 'files' | 'options' | 'search'; /** ficha de entidade (S05): abre o inspetor */ ent?: 'act' }

export interface Screen29 {
  id: ScreenId29;
  label: L;
  /** grupo canônico (Parte VIII). */
  group: Group29;
  /** casa: o que abre quando se pede a tela */
  home: Target29;
  /** páginas existentes que formam a tela (a 1ª é a casa quando `home.area` existe) */
  areas: string[];
  /** termos de busca (pt/en, sem acento importa pouco: a busca normaliza) */
  terms: string[];
  /** nota de endereço quando a casa atual difere da proposta da Bíblia (decisão declarada, não omissão) */
  note?: L;
}

const sc = (id: ScreenId29, label: L, group: Group29, home: Target29, areas: string[], terms: string[], note?: L): Screen29 => ({ id, label, group, home, areas, terms, note });
const INBOX: Target29 = { area: 'cockpit', tab: ['ck20', 'inbox'] };

/** As 17 telas canônicas (Parte VIII · "Uma organização canônica"). Elas NÃO viram itens de menu: são endereços. */
export const SCREENS29: Screen29[] = [
  sc('S01', l('Cockpit', 'Cockpit'), 'cockpit', { area: 'cockpit', tab: ['ck20', 'panel'] }, ['cockpit', 'plan', 'goals'], ['cockpit', 'painel', 'agora', 'inicio', 'dashboard', 'home', 'mesa']),
  sc('S02', l('Correspondência', 'Correspondence'), 'cockpit', INBOX, ['cockpit'], ['correspondencia', 'caixa de entrada', 'inbox', 'mensagens', 'cartas', 'email', 'e-mail', 'mail', 'telefonema']),
  sc('S03', l('Agenda e fechamento', 'Schedule and closing'), 'admin', { area: 'calendar19' }, ['calendar19', 'agenda17', 'cal17', 'long18'],
    ['agenda', 'calendario', 'fechamento', 'prazos', 'compromissos', 'schedule', 'calendar', 'deadlines', 'capacidade', 'bolinhas', 'conflitos']),
  sc('S04', l('Elenco e pessoas', 'Roster and people'), 'people', { area: 'artists' }, ['artists', 'people', 'dyn18'], ['elenco', 'artistas', 'atos', 'bandas', 'roster', 'artists', 'acts', 'bands', 'pessoas', 'relacoes']),
  sc('S05', l('Ficha de artista e formação', 'Artist file and lineup'), 'people', { area: 'artists', ent: 'act' }, ['artists'], ['ficha', 'formacao', 'integrantes', 'lineup', 'members', 'dossie', 'ato', 'artista', 'banda']),
  sc('S06', l('Descobrir talentos', 'Scouting'), 'people', { area: 'market' }, ['market', 'knownacts27', 'directory', 'talent18'],
    ['scouting', 'olheiro', 'descobrir', 'talentos', 'mercado', 'radar', 'shortlist', 'contratar', 'recrutar', 'scout', 'hire', 'talent']),
  sc('S07', l('Negociação e contrato', 'Negotiation and contract'), 'admin', { area: 'contracts19' }, ['contracts19', 'artist18'],
    ['contrato', 'contratos', 'negociacao', 'negociar', 'proposta', 'oferta', 'promessas', 'royalties', 'adiantamento', 'contract', 'deal', 'offer', 'promise'],
    l('Endereço mantido em Pessoas › Contratos por compatibilidade (hub "Contratos"); Gestão e a busca abrem o MESMO contrato.', 'Address kept at People › Contracts for compatibility; Management and search open the SAME contract.')),
  sc('S08', l('Projeto e repertório', 'Project and repertoire'), 'projects', { area: 'project' }, ['project', 'creation', 'songmkt27'],
    ['projeto', 'repertorio', 'compor', 'composicao', 'faixas', 'cancoes', 'disco', 'album', 'project', 'repertoire', 'songs', 'write']),
  sc('S09', l('Estúdio e gravação', 'Studio and recording'), 'projects', { area: 'studio' }, ['studio', 'studio12'], ['estudio', 'gravar', 'gravacao', 'sessao', 'studio', 'record', 'session']),
  sc('S10', l('Lançamento e catálogo', 'Release and catalog'), 'projects', { area: 'releases' }, ['releases', 'catalog', 'tribute19', 'media19'],
    ['lancamento', 'lancar', 'lancamentos', 'catalogo', 'disco', 'single', 'capa', 'release', 'catalog', 'launch']),
  sc('S11', l('Ao vivo: show e turnê', 'Live: show and tour'), 'live', { area: 'shows' }, ['shows', 'cal17', 'tour12', 'live19', 'festivals'],
    ['show', 'shows', 'turne', 'turnes', 'palco', 'ingressos', 'festival', 'tour', 'gig', 'stage', 'ao vivo', 'live']),
  sc('S12', l('Sede e operação', 'HQ and operations'), 'sede', { area: 'hq' }, [SEDE25, 'hq', 'campus18'], ['sede', 'predio', 'escritorio', 'operacao', 'equipamento', 'hq', 'building', 'office']),
  sc('S13', l('Finanças e compromissos', 'Finances and commitments'), 'admin', { area: 'finance' }, ['finance', 'business', 'supply18'],
    ['financas', 'caixa', 'dinheiro', 'ledger', 'livro caixa', 'despesas', 'receitas', 'folego', 'emprestimo', 'finance', 'cash', 'money', 'expenses', 'runway']),
  sc('S14', l('Mundo e exploração', 'World and exploration'), 'world', { area: 'mundo27' }, ['mundo27', 'world', 'charts', 'known27', 'news17', 'world17', 'regions19', 'lendas'],
    ['mundo', 'mapa', 'paradas', 'cenas', 'politica', 'cultura', 'rivais', 'noticias', 'world', 'map', 'charts', 'scenes', 'politics', 'rivals']),
  sc('S15', l('Submundo e fraudes', 'Underworld and frauds'), 'world', { area: 'crime' }, ['crime', 'fakes19'],
    ['submundo', 'crime', 'crimes', 'fraude', 'fraudes', 'golpes', 'mafia', 'payola', 'underworld', 'fraud', 'scams']),
  sc('S16', l('Você: trajetória e legado', 'You: trajectory and legacy'), 'you', { area: 'you' }, ['you', 'personal', 'wealth', 'night14', 'scenes17'],
    ['voce', 'trajetoria', 'legado', 'historia', 'vida pessoal', 'familia', 'cenas', 'album de cenas', 'capitulos', 'storyboard', 'you', 'legacy', 'story', 'family']),
  sc('S17', l('Central da campanha', 'Campaign hub'), 'cockpit', { util: 'campaign' }, [],
    ['campanha', 'passaporte', 'save', 'saves', 'salvar', 'carregar', 'versao', 'semente', 'seed', 'regras', 'campaign', 'passport', 'rules', 'nova run']),
];
export const screen29 = (id: string): Screen29 | undefined => SCREENS29.find((x) => x.id === id.toUpperCase());

/** Intenções (M02): atalhos para etapas EXISTENTES, nunca um assistente obrigatório. `pick` escolhe o passo pelo contexto. */
export interface Intent29 { id: string; label: L; terms: string[]; screen: ScreenId29 }
export const INTENTS29: Intent29[] = [
  { id: 'hire', label: l('Quero contratar alguém', 'I want to sign someone'), terms: ['quero contratar', 'contratar artista', 'achar artista', 'sign', 'hire'], screen: 'S06' },
  { id: 'release', label: l('Quero preparar e lançar um disco', 'I want to make and release a record'), terms: ['quero lancar', 'lancar disco', 'fazer disco', 'gravar disco', 'release a record'], screen: 'S08' },
  { id: 'tour', label: l('Quero fazer um show ou turnê', 'I want to play a show or tour'), terms: ['quero turne', 'fazer show', 'marcar show', 'turne', 'tour'], screen: 'S11' },
  { id: 'crisis', label: l('Quero resolver uma crise', 'I want to solve a crisis'), terms: ['crise', 'resolver', 'decisao', 'decisoes', 'crisis'], screen: 'S02' },
  { id: 'hq', label: l('Quero melhorar a sede', 'I want to improve the HQ'), terms: ['melhorar sede', 'reformar', 'equipamento', 'upgrade hq'], screen: 'S12' },
  { id: 'cash', label: l('Quero entender meu caixa', 'I want to understand my cash'), terms: ['entender caixa', 'por que o caixa', 'para onde foi o dinheiro', 'where did the money go', 'cash flow'], screen: 'S13' },
  { id: 'explore', label: l('Quero explorar o mundo e sua história', 'I want to explore the world'), terms: ['explorar', 'historia do mundo', 'explore'], screen: 'S14' },
  { id: 'self', label: l('Quero cuidar da minha trajetória', 'I want to shape my own story'), terms: ['minha vida', 'trajetoria', 'minha historia', 'my story'], screen: 'S16' },
];

/** Contexto mínimo para escolher o passo de uma intenção (lido do estado pela interface). */
export interface IntentCtx29 { roster: number; songsReady: number; openProjects: number; label: boolean }
/** Passo da intenção conforme o contexto (M02: um selo sem elenco começa no recrutamento; com repertório pronto vai ao estúdio). */
export function intentTarget29(id: string, c: IntentCtx29): Target29 {
  const it = INTENTS29.find((x) => x.id === id);
  if (!it) return { area: 'cockpit' };
  if (id === 'release') {
    if (c.label && c.roster === 0) return { area: 'market' };
    if (c.openProjects > 0 && c.songsReady > 0) return { area: 'studio' };
    return { area: 'project' };
  }
  return screen29(it.screen)!.home;
}

// ---------------------------------------------------------------- catálogo de destinos (páginas)

export type Avail29 = 'menu' | 'tab' | 'era' | 'redirect' | 'unknown';
export interface Dest29 {
  /** id estável da página (rota #/id) */
  id: string;
  group: Group29;
  /** telas canônicas que usam a página (uma página pode servir duas: ex. cockpit = S01 e S02) */
  screens: ScreenId29[];
  hub?: string;
  /** página de carreira (cp17-*) ou tela absorvida por uma */
  career?: string;
  /** tela absorvida: abre a página da carreira nesta aba */
  absorbedBy?: [string, string];
}

/** Ids antigos que só redirecionam (mesa/caixa de entrada → Cockpit; continuam abrindo). */
export const REDIRECT29: Record<string, Target29> = { desk: { area: 'cockpit', tab: ['ck20', 'desk'] }, inbox: INBOX };

const CAREER_AREAS = new Map(ORDER17.map((id) => [CAREER_PAGE17[id].area, id] as [string, string]));
const ABSORBED = new Map(ORDER17.flatMap((id) => CAREER_PAGE17[id].absorbs.map((a) => [a, id] as [string, string])));
/** Páginas que já existiram em algum menu e não estão na árvore r27 (registradas por outras frentes). */
const EXTRA_KNOWN29 = ['shared18', 'artist18', 'tut18', 'agenda17', 'sede25', 'deleg31', 'airport31', 'auction31'];

/** Todos os ids de página conhecidos (árvore r27 + r17 + carreiras + absorvidas + extras). */
export const ALL_AREAS29: string[] = [...new Set([
  ...KNOWN25, ...NAV17.flatMap((g) => g.secs.flatMap((s) => s.areas)), ...CAREER_AREAS.keys(), ...ABSORBED.keys(), ...EXTRA_KNOWN29,
])].sort();

/** Destino de uma página (sem contexto de partida: grupo canônico pela árvore r27). */
export function dest29(id: string): Dest29 {
  const g = (id === SEDE25 ? 'sede' : sectionIdOf25(id)) as Group29;
  const screens = SCREENS29.filter((s) => s.areas.includes(id) || s.home.area === id).map((s) => s.id);
  const career = CAREER_AREAS.get(id) ?? ABSORBED.get(id);
  return { id, group: GROUPS29.includes(g) ? g : 'admin', screens, hub: hubOf27(id)?.id, career, absorbedBy: ALIAS17[id] };
}
export const DESTS29: Dest29[] = ALL_AREAS29.map(dest29);

// ---------------------------------------------------------------- resolução de nomes (busca, rotas, links)

/** Normaliza para comparar: minúsculas, sem acento, espaços simples. */
export const norm29 = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Resolve qualquer nome para um alvo: id de página (inclusive antigo), id de hub ("hub:money"), id de tela ("s07"/"S07"),
 * id de intenção ("quero:hire") ou termo (Submundo, Crime, Fraudes…). Desconhecido → undefined (quem chama decide).
 * Não verifica disponibilidade: isso é do menu (o índice explica o motivo).
 */
export function resolve29(name: string, ctx?: IntentCtx29): Target29 | undefined {
  const raw = name.trim();
  if (!raw) return undefined;
  if (REDIRECT29[raw]) return REDIRECT29[raw];
  if (ALL_AREAS29.includes(raw) || /^cp17-/.test(raw)) return { area: raw };
  if (raw.startsWith('hub:') && HUBS27.some((x) => `hub:${x.id}` === raw)) return { area: raw };
  const sid = /^s(\d\d)$/i.exec(raw);
  if (sid) return screen29(`S${sid[1]}`)?.home;
  if (raw.startsWith('quero:')) return ctx ? intentTarget29(raw.slice(6), ctx) : screen29(INTENTS29.find((x) => x.id === raw.slice(6))?.screen ?? 'S01')?.home;
  const q = norm29(raw);
  const it = INTENTS29.find((x) => x.terms.some((t) => norm29(t) === q));
  if (it) return ctx ? intentTarget29(it.id, ctx) : screen29(it.screen)!.home;
  const s = SCREENS29.find((x) => x.terms.some((t) => norm29(t) === q) || norm29(x.label.pt) === q || norm29(x.label.en) === q);
  return s?.home;
}

/** Termos de busca de uma página: os das telas que ela compõe (para a paleta Ctrl+K achar "fraudes" → fakes19). */
export function terms29(area: string): string[] {
  return [...new Set(SCREENS29.filter((s) => s.areas.includes(area)).flatMap((s) => s.terms))];
}

// ---------------------------------------------------------------- disponibilidade (índice completo)

export interface AvailCtx29 {
  /** está no menu desta partida (visível agora) */
  inMenu: (area: string) => boolean;
  /** está registrada (existe no código), mesmo invisível no ano */
  registered: (area: string) => boolean;
}
/** Por que um destino está (ou não) ao alcance agora — o índice mostra todos, com o motivo, sem executar nada. */
export function avail29(area: string, c: AvailCtx29): Avail29 {
  if (REDIRECT29[area]) return 'redirect';
  if (c.inMenu(area)) return 'menu';
  const al = ALIAS17[area];
  if (al && c.inMenu(al[0])) return 'tab';
  if (c.registered(area)) return 'era';
  return 'unknown';
}
export const AVAIL_L29: Record<Avail29, L> = {
  menu: l('no menu', 'in the menu'),
  tab: l('aba da página da sua carreira', 'tab of your career page'),
  era: l('ainda não existe nesta era ou papel', 'not available in this era or role yet'),
  redirect: l('nome antigo: abre o destino novo', 'old name: opens the new home'),
  unknown: l('fora desta partida', 'not part of this run'),
};
