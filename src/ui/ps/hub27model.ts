// Rodada 27 (UX) — páginas unificadas ("hubs") como camada de mapeamento, sem DOM (testável).
// O dono achou páginas demais (79 páginas, ~310 abas). Regra: NADA some — só unificar. Um hub junta páginas que
// tratam do mesmo assunto numa entrada só do menu; dentro dele, uma faixa de "vistas" troca entre as páginas
// originais. Os ids das páginas NÃO mudam (saves, rotas #/área, busca, atalhos, ALIAS17 e testes antigos seguem
// iguais); o hub só decide como o menu as agrupa. Ids de hub ("hub:money") também abrem — viram a 1ª página.
// Vista "Essencial" (padrão): menu por hubs e faixas de abas compactas. Vista "Completa": a árvore r27 inteira.
// Doc: docs/ux27.md · testes: tests/r27-ux.test.ts

import { l, type L } from '../../data/world';
import type { NavGroup25 } from './nav25';
import { CAREER_PAGE17, ORDER17 } from '../nav17';

export interface Hub27 { id: string; section: string; label: L; icon: string; blurb: L; areas: string[] }
/** Entrada do menu numa seção: um hub (com as páginas visíveis dele) ou uma página solta. */
export type Entry27 = { kind: 'hub'; hub: Hub27; areas: string[] } | { kind: 'page'; area: string; career?: boolean };

const hub = (id: string, section: string, label: L, icon: string, blurb: L, areas: string[]): Hub27 => ({ id, section, label, icon, blurb, areas });

/** Os hubs, por seção, na ordem do menu. A 1ª página visível é a casa do hub. */
export const HUBS27: Hub27[] = [
  // Sede (6 páginas → 2 entradas)
  hub('home', 'sede', l('Sua sede', 'Your HQ'), 'house', l('O prédio, a operação e a cidade em volta.', 'The building, operations and the city around it.'), ['sede25', 'hq', 'campus18']),
  hub('plan', 'sede', l('Plano e metas', 'Plan and goals'), 'clock', l('Decisões, metas da partida e o que já aconteceu.', 'Decisions, run goals and what already happened.'), ['plan', 'goals', 'diary']),
  // Pessoas (12 → 4)
  hub('roster', 'people', l('Elenco', 'Roster'), 'guitar', l('Seus artistas, a saúde e as relações deles.', 'Your artists, their health and relationships.'), ['artists', 'people', 'dyn18']),
  hub('deals', 'people', l('Contratos', 'Contracts'), 'contract', l('Mercado de contratos e o lado do artista.', 'Contract market and the artist side.'), ['contracts19', 'artist18']),
  hub('scout', 'people', l('Descobrir talentos', 'Discover talent'), 'fans', l('Procurar, acompanhar e formar artistas.', 'Search, track and train artists.'), ['market', 'knownacts27', 'directory', 'talent18']),
  hub('pros', 'people', l('Bastidores', 'Behind the scenes'), 'handshake', l('Empresários, produtores e gestão de carreira.', 'Managers, producers and career management.'), ['management', 'managers14', 'producers15']),
  // Projetos (10 → 3) — o mercado de canções (SONG) fica entre compor e gravar, como no menu da r25
  hub('record', 'projects', l('Fazer um disco', 'Make a record'), 'disc', l('Projeto → compor → gravar → lançar.', 'Project → write → record → release.'), ['project', 'creation', 'songmkt27', 'studio', 'releases']),
  hub('catalog', 'projects', l('Catálogo e reviver', 'Catalog and revival'), 'cd', l('O que já saiu e como fazer render de novo.', 'What is out and how to make it pay again.'), ['catalog', 'tribute19', 'media19']),
  hub('studiobiz', 'projects', l('Estúdio e editora', 'Studio and publishing'), 'mic', l('Os negócios de estúdio e de edição.', 'The studio and publishing businesses.'), ['studio12', 'publishing16']),
  // Ao vivo (7 → 2)
  hub('stage', 'live', l('Shows e turnês', 'Shows and tours'), 'stage', l('Agenda, turnês, ingressos e temporada.', 'Schedule, tours, tickets and season.'), ['shows', 'cal17', 'tour12', 'live19']),
  hub('events', 'live', l('Festivais e prêmios', 'Festivals and awards'), 'trophy', l('Circuito de festivais, premiações e Hall da Fama.', 'Festival circuit, awards and Hall of Fame.'), ['festivals', 'awards', 'rockhall']),
  // Mundo (23 → 5)
  hub('now', 'world', l('Este mês', 'This month'), 'globe', l('O que mudou no mundo, o que se sabe e os boatos.', 'What changed, what is known and the rumors.'), ['mundo27', 'known27', 'news17']),
  hub('charts', 'world', l('Paradas e mercado', 'Charts and market'), 'chart-up', l('Paradas, gravadoras rivais, indústria e mercados.', 'Charts, rival labels, industry and markets.'), ['charts', 'labels', 'industry', 'regions18', 'market19a', 'platform16']),
  hub('press', 'world', l('Imprensa', 'Press'), 'newspaper', l('Mídia, críticos, fanzines, veículos e fraudes.', 'Media, critics, fanzines, outlets and frauds.'), ['media', 'critics', 'zines19', 'outlets16', 'fakes19']),
  hub('map', 'world', l('Mapa e política', 'Map and politics'), 'globe', l('Países, cenas, leis, regiões e o submundo.', 'Countries, scenes, laws, regions and the underworld.'), ['world', 'world17', 'regions19', 'after18', 'crime']),
  hub('culture', 'world', l('Cultura e lendas', 'Culture and legends'), 'vault', l('Lendas, movimentos, sociedade e o diário do mestre.', 'Legends, movements, society and the DM journal.'), ['lendas', 'movements', 'society18', 'dm18']),
  // Gestão (15 → 4)
  hub('money', 'admin', l('Dinheiro', 'Money'), 'money', l('Caixa, negócios e a cadeia física.', 'Cash, business and the supply chain.'), ['finance', 'business', 'supply18']),
  // contratar é a tarefa mais comum daqui: a agenda/contratações abre primeiro
  hub('org', 'admin', l('Equipe e empresa', 'Staff and company'), 'building', l('Contratações, equipe, estrutura e cultura.', 'Hiring, staff, structure and culture.'), ['agenda17', 'team', 'company', 'firm19', 'identity', 'biz17']),
  hub('course', 'admin', l('Rumo e direitos', 'Course and rights'), 'flag', l('Estratégia de longo prazo, calendário e direitos.', 'Long-term strategy, calendar and rights.'), ['long18', 'calendar19', 'rights18']),
  hub('ventures', 'admin', l('Carreiras e sócios', 'Careers and partners'), 'star', l('Outras carreiras, empreendimentos e sócios.', 'Other careers, ventures and partners.'), ['careers', 'ventures', 'shared18']),
  // Você (6 → 3)
  hub('life', 'you', l('Você e família', 'You and family'), 'star', l('Perfil, vida pessoal e patrimônio.', 'Profile, personal life and wealth.'), ['you', 'personal', 'wealth']),
  hub('nights', 'you', l('Noite e cenas', 'Nights and scenes'), 'sparkle', l('Saídas, encontros e o álbum de cenas.', 'Nights out, encounters and the scene album.'), ['night14', 'scenes17']),
];

/** Rótulo curto da página dentro da faixa do hub (quando o nome do menu repete o do hub ou da seção). */
export const VIEW_LABEL27: Record<string, L> = {
  sede25: l('Cena da sede', 'HQ scene'),
  hq: l('Operação', 'Operations'),
  campus18: l('Nosso mundo', 'Our world'),
  plan: l('Central', 'Hub'),
  people: l('Saúde e relações', 'Health and relationships'),
  project: l('1 · Projeto', '1 · Project'),
  creation: l('2 · Compor', '2 · Write'),
  studio: l('3 · Gravar', '3 · Record'),
  releases: l('4 · Lançar', '4 · Release'),
  world: l('Mapa', 'Map'),
  mundo27: l('Resumo do mês', 'Monthly summary'),
  you: l('Perfil', 'Profile'),
};

const BY_AREA27 = new Map<string, Hub27>(HUBS27.flatMap((x) => x.areas.map((a) => [a, x] as [string, Hub27])));
/** Hub de uma página (ou nada: página solta, página de carreira, página nova de outra frente). */
export const hubOf27 = (area: string): Hub27 | undefined => BY_AREA27.get(area);
export const hubById27 = (id: string): Hub27 | undefined => HUBS27.find((x) => x.id === id.replace(/^hub:/, ''));
/** Páginas de carreira (cp17-*): sempre entradas próprias, no topo da seção. */
const CAREER_AREAS27 = new Set(ORDER17.map((id) => CAREER_PAGE17[id].area));
/** Todas as páginas que algum hub agrupa. */
export const HUBBED27 = new Set(BY_AREA27.keys());

/** Entradas do menu de uma seção na vista Essencial: carreiras primeiro, depois hubs (na ordem), depois páginas
 *  soltas (o que nenhum hub agrupa — páginas novas de outras frentes, telas fora da carreira etc.).
 *  Todas as páginas da seção aparecem em exatamente uma entrada. */
export function entries27(g: Pick<NavGroup25, 'id' | 'areas' | 'sections'>): Entry27[] {
  const careers = CAREER_AREAS27;
  const out: Entry27[] = [];
  const used = new Set<string>();
  for (const a of g.areas) if (careers.has(a)) { out.push({ kind: 'page', area: a, career: true }); used.add(a); }
  // hubs desta seção primeiro, na ordem; depois hubs de outra seção cujas páginas caíram aqui (raro)
  const hubs = [...HUBS27.filter((x) => x.section === g.id), ...HUBS27.filter((x) => x.section !== g.id)];
  for (const x of hubs) {
    const areas = x.areas.filter((a) => g.areas.includes(a) && !used.has(a));
    if (!areas.length) continue;
    areas.forEach((a) => used.add(a));
    out.push(areas.length === 1 ? { kind: 'page', area: areas[0] } : { kind: 'hub', hub: x, areas });
  }
  for (const a of g.areas) if (!used.has(a)) { out.push({ kind: 'page', area: a }); used.add(a); }
  return out;
}

/** Páginas vizinhas na faixa de vistas (as do mesmo hub visíveis no grupo); nada se a página está sozinha. */
export function views27(g: Pick<NavGroup25, 'id' | 'areas' | 'sections'>, area: string): string[] {
  const e = entries27(g).find((x) => x.kind === 'hub' && x.areas.includes(area));
  return e && e.kind === 'hub' ? e.areas : [];
}

/** Id de hub ("hub:money" ou "money") → página que ele abre (a última visitada nele, se ainda visível, ou a 1ª). */
export function resolveHub27(id: string, visible: (a: string) => boolean, last?: string): string | undefined {
  const x = hubById27(id);
  if (!x || (!id.startsWith('hub:') && !HUBS27.some((y) => y.id === id))) return undefined;
  if (last && x.areas.includes(last) && visible(last)) return last;
  return x.areas.find(visible);
}

// vista Essencial × Completa e faixas compactas: em view27.ts (sem dependências — vis.ts também usa)
export { TABS_SHOWN27, setView27, shownTabs27, view27, type View27 } from './view27';
