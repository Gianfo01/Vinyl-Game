// Rodada 25 — Pixel Studio: arquitetura de informação em 6 seções (sem DOM: testável).
// r27 (COCK): Cockpit · Sede · Pessoas · Projetos · Ao vivo · Mundo · Gestão · Você (+ Buscar, Arquivo e Opções como utilitários).
// Regras: cada página mora em exatamente UMA seção, agrupada por tema; as até 5 "principais" (a página da sua
// carreira primeiro) abrem a lista. r27: o menu é uma árvore (ps/tree27.ts) — Seção › Página › Aba, tudo visível,
// sem "Mais" escondido; `top`/`more25` ficam como ordem de prioridade (faixa do celular, testes antigos).
// Nada some: páginas novas (de outras frentes) caem na seção sugerida por quem as registrou ou em Gestão.
// Telas absorvidas por páginas de carreira (ALIAS17) continuam abrindo a página da carreira na aba certa.

import { l, type L } from '../../data/world';
import type { NavGroup14, NavSection14 } from '../careernav14';
import { CAREER_PAGE17, ORDER17, LABEL_ONLY17, BAND_OR_LABEL17, type NavCtx17 } from '../nav17';

export interface Theme25 { id: string; label: L; areas: string[] }
export interface Section25 { id: string; label: L; icon: string; blurb: L; main: string[]; themes: Theme25[] }
export interface NavGroup25 extends NavGroup14 { top: string[] }

/** Máximo de páginas visíveis por seção (o resto vai para "Mais"). */
export const TOP25 = 5;
/** Área virtual da tela da Sede (preenchida por ui/ps/slot25.ts). */
export const SEDE25 = 'sede25';

const th = (id: string, label: L, areas: string[]): Theme25 => ({ id, label, areas });

/** Árvore canônica. A ordem das páginas dentro da seção = prioridade (as 5 primeiras ficam visíveis). */
export const SECTIONS25: Section25[] = [
  // r27 (COCK): o Cockpit é uma seção de topo própria, a primeira (e a página inicial padrão); sem subpáginas
  { id: 'cockpit', label: l('Cockpit', 'Cockpit'), icon: 'calendar', blurb: l('O mês num relance: o que fazer agora.', 'The month at a glance: what to do now.'),
    main: ['cockpit'], themes: [th('now', l('Agora', 'Now'), ['cockpit'])] },
  { id: 'sede', label: l('Sede', 'HQ'), icon: 'house', blurb: l('Seu dia, sua casa e o que precisa de você.', 'Your day, your home and what needs you.'),
    // r27 (CITY2): "Nosso mundo" (a cidade em volta da sede) logo abaixo de "Sua sede"; Cockpit virou seção própria (COCK)
    main: [SEDE25, 'campus18', 'hq', 'plan', 'goals', 'diary'], themes: [
    th('today', l('Hoje', 'Today'), [SEDE25, 'campus18', 'hq', 'plan', 'goals', 'diary'])] },
  { id: 'people', label: l('Pessoas', 'People'), icon: 'people', blurb: l('Elenco, talentos e profissionais.', 'Roster, talent and professionals.'),
    main: ['artists', 'market', 'management', 'managers14', 'producers15', 'knownacts27', 'directory'], themes: [
    th('roster', l('Seu elenco', 'Your roster'), ['artists', 'people', 'dyn18', 'contracts19', 'artist18']),
    th('find', l('Descobrir', 'Discover'), ['market', 'knownacts27', 'directory', 'talent18']),
    th('pros', l('Bastidores', 'Behind the scenes'), ['management', 'managers14', 'producers15'])] },
  { id: 'projects', label: l('Projetos', 'Projects'), icon: 'disc', blurb: l('Compor, gravar, lançar e reviver.', 'Write, record, release and revive.'),
    main: ['project', 'creation', 'studio', 'releases', 'catalog'], themes: [
    th('make', l('Criar', 'Create'), ['project', 'creation', 'songmkt27', 'studio', 'studio12', 'publishing16']),
    th('release', l('Lançar e reviver', 'Release and revive'), ['releases', 'catalog', 'tribute19', 'media19'])] },
  { id: 'live', label: l('Ao vivo', 'Live'), icon: 'stage', blurb: l('Shows, turnês, festivais e prêmios.', 'Shows, tours, festivals and awards.'),
    main: ['shows', 'cal17', 'festivals', 'awards', 'live19'], themes: [
    th('stage', l('Palco', 'Stage'), ['shows', 'cal17', 'live19', 'tour12']),
    th('events', l('Festivais e prêmios', 'Festivals and awards'), ['festivals', 'awards', 'rockhall'])] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', blurb: l('Paradas, mercado, mapa, imprensa e cultura.', 'Charts, market, map, press and culture.'),
    main: ['mundo27', 'charts', 'world', 'known27', 'news17', 'labels', 'media'], themes: [
    th('market', l('Paradas e mercado', 'Charts and market'), ['mundo27', 'charts', 'labels', 'industry', 'regions18', 'market19a', 'platform16']),
    th('press', l('Imprensa', 'Press'), ['known27', 'news17', 'media', 'critics', 'zines19', 'fakes19', 'outlets16']),
    th('map', l('Mapa e política', 'Map and politics'), ['world', 'world17', 'after18', 'regions19']),
    th('culture', l('Cultura e histórias', 'Culture and stories'), ['movements', 'lendas', 'society18', 'dm18']),
    th('crime', l('Submundo', 'Underworld'), ['crime'])] },
  { id: 'admin', label: l('Gestão', 'Management'), icon: 'chart-up', blurb: l('Dinheiro, estrutura, rumo e carreiras.', 'Money, structure, course and careers.'),
    main: ['business', 'finance', 'company', 'team', 'agenda17', 'careers'], themes: [
    th('company', l('Empresa', 'Company'), ['business', 'finance', 'company', 'team', 'agenda17', 'firm19', 'identity', 'biz17']),
    th('course', l('Rumo, prazos, direitos e cadeia', 'Course, deadlines, rights and supply'), ['long18', 'calendar19', 'rights18', 'supply18']),
    th('careers', l('Carreiras', 'Careers'), ['careers', 'ventures', 'shared18'])] },
  // r27 (COCK): Você (a sua vida: perfil, família, casa, patrimônio, noite) virou seção de topo — a última, como o
  // "perfil" no canto dos apps; as páginas da empresa ficam juntas antes dela
  { id: 'you', label: l('Você', 'You'), icon: 'star', blurb: l('Sua vida: perfil, amor e família, patrimônio e noite.', 'Your life: profile, love and family, wealth and nights out.'),
    main: ['you', 'personal', 'wealth', 'night14', 'scenes17'], themes: [
    th('life', l('Sua vida', 'Your life'), ['you', 'personal', 'wealth', 'night14', 'scenes17', 'tut18'])] },
];

/** Seção de cada página de carreira (a página aparece primeiro na seção quando a carreira está ativa). */
export const CAREER_SECTION25: Record<string, string> = {
  label: 'admin', musician: 'projects', manager: 'people', booking: 'live', festival: 'live', venue: 'live',
  studio: 'projects', publisher: 'projects', media: 'world', platform: 'world', screen: 'projects', critic: 'world',
};
/** Grupos antigos (app.ts GROUPS e NAV17) → seção nova, para páginas que não estão na árvore. */
export const OLD_GROUP25: Record<string, string> = {
  home: 'sede', label: 'admin', company: 'admin', artists: 'people', music: 'projects', ventures: 'admin', you: 'you',
  world: 'world', press: 'world', crime: 'world', fame: 'live', events: 'live',
};
/** Ids antigos que só redirecionam (mesa, caixa de entrada → Cockpit). */
const REDIRECT25 = new Set(['desk', 'inbox']);

/** Todas as áreas que a árvore conhece (fora as páginas de carreira). */
export const KNOWN25 = new Set(SECTIONS25.flatMap((s) => s.themes.flatMap((x) => x.areas)));
/** Seção canônica de uma área (sem contexto: páginas de carreira pela tabela, desconhecidas em Gestão). */
export function sectionIdOf25(area: string): string {
  const s = SECTIONS25.find((x) => x.themes.some((y) => y.areas.includes(area)));
  if (s) return s.id;
  const c = ORDER17.find((id) => CAREER_PAGE17[id].area === area);
  return c ? CAREER_SECTION25[c] : 'admin';
}

/** Menu da partida em 6 seções; `top` = as até 5 páginas visíveis (o resto vai para "Mais"). */
export function navGroups25(ctx: NavCtx17 & { sede?: boolean }): NavGroup25[] {
  const on = (id: string) => ctx.active.includes(id);
  const label = on('label') || !ctx.active.length, band = label || on('musician');
  const pages = ORDER17.filter((id) => ctx.pages.includes(id));
  const absorbed = new Set(pages.flatMap((id) => CAREER_PAGE17[id].absorbs));
  const has = (a: string) => (a === SEDE25 ? !!ctx.sede : ctx.has(a));
  const careerIds = new Set(ORDER17.map((id) => CAREER_PAGE17[id].area));
  // páginas novas (de outras frentes) que a árvore não conhece: seção sugerida ou Gestão › Outras páginas
  const extra: Record<string, string[]> = {};
  for (const a of ctx.all ?? []) if (!KNOWN25.has(a) && !careerIds.has(a) && !REDIRECT25.has(a)) {
    const g0 = ctx.hint?.[a]; const s = g0 ? OLD_GROUP25[g0] ?? g0 : '';
    (extra[SECTIONS25.some((x) => x.id === s) ? s : 'admin'] ??= []).push(a);
  }
  const offCareer = (a: string) => (LABEL_ONLY17.includes(a) && !label) || (BAND_OR_LABEL17.includes(a) && !band);
  const used = new Set<string>();
  const take = (xs: string[]) => xs.filter((a) => { if (used.has(a) || absorbed.has(a) || !has(a)) return false; used.add(a); return true; });
  const out: NavGroup25[] = [];
  for (const s of SECTIONS25) {
    // páginas das carreiras visíveis desta seção: ativas primeiro (viram principais), as outras no fim
    const mine = pages.filter((id) => CAREER_SECTION25[id] === s.id);
    const actP = take(mine.filter(on).map((id) => CAREER_PAGE17[id].area));
    const secs: NavSection14[] = [];
    const parked: string[] = [];
    for (const x of s.themes) {
      const areas = take(x.areas.filter((a) => { if (offCareer(a)) { parked.push(a); return false; } return true; }));
      if (areas.length) secs.push({ label: x.label, areas });
    }
    const otherP = take(mine.filter((id) => !on(id)).map((id) => CAREER_PAGE17[id].area));
    const careerSec = [...actP, ...otherP];
    if (careerSec.length) secs.unshift({ label: l('Suas carreiras', 'Your careers'), areas: careerSec });
    const ex = take(extra[s.id] ?? []);
    if (ex.length) secs.push({ label: l('Outras páginas', 'Other pages'), areas: ex });
    const pk = take(parked);
    if (pk.length) secs.push({ label: l('Selo e banda (fora das suas carreiras)', 'Label and band (outside your careers)'), areas: pk });
    // telas de carreiras sem página visível: ficam alcançáveis em Gestão, com o nome da carreira
    if (s.id === 'admin') for (const id of ORDER17) if (!pages.includes(id)) {
      const areas = take(CAREER_PAGE17[id].absorbs);
      if (areas.length) secs.push({ label: CAREER_PAGE17[id].label, areas });
    }
    const areas = secs.flatMap((x) => x.areas);
    if (!areas.length) continue;
    // principais: carreira ativa primeiro, depois a ordem da árvore (sem as de carreira inativa)
    const top = [...new Set([...actP, ...s.main.filter((a) => areas.includes(a)), ...areas.filter((a) => !careerSec.includes(a))])].slice(0, TOP25);
    out.push({ id: s.id, label: s.label, icon: s.icon, areas, sections: secs, top });
  }
  return out;
}

/** Itens de "Mais" de uma seção, agrupados por tema (só o que não é principal). */
export function more25(g: NavGroup25): NavSection14[] {
  const top = new Set(g.top);
  return (g.sections ?? [{ label: g.label, areas: g.areas }]).map((x) => ({ label: x.label, areas: x.areas.filter((a) => !top.has(a)) })).filter((x) => x.areas.length);
}

/** r27 (COCK): a partida (nova ou carregada, de qualquer carreira) abre no Cockpit — a 1ª seção do menu.
 *  (Antes: Sede › Sua sede.) O parâmetro fica por compatibilidade. */
export const landing27 = (_hasSede?: boolean): string => 'cockpit';
/** Seção de uma página só (Cockpit): o cabeçalho leva direto à página, sem lista/folha de páginas. */
export const single27 = (g: { areas: string[] }): boolean => g.areas.length === 1;

/** Casa da seção (primeira página principal). */
export const home25 = (g: NavGroup14): string => (g as NavGroup25).top?.[0] ?? g.areas[0];
