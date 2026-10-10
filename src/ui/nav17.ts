// Rodada 17 — reforma de todo o menu (sem DOM: testável).
// Regras: grupos por função (Início, Empresa, Artistas, Música, Mídia, Mundo, Eventos, Submundo, Você);
// cada grupo dividido em seções curtas (≤ 5 páginas); cada página em exatamente UM lugar (atalhos só como
// links marcados ↗ dentro das páginas); toda carreira tem a SUA página exclusiva, dentro de Você › Carreiras,
// juntando as telas que antes ficavam soltas (Gestão, Agente e promotor, Estúdio e produtor, Editora...);
// o que não pertence às suas carreiras desce para "Mais" (recolhido, nada fica inalcançável);
// cada grupo e cada página tem um ícone próprio e cada tecla de atalho abre uma só página.

import { l, type L } from '../data/world';
import type { NavGroup14, NavSection14 } from './careernav14';

export interface Sec17 { id: string; label: L; areas: string[] }
export interface Group17 { id: string; label: L; icon: string; secs: Sec17[] }

const sec = (id: string, label: L, areas: string[]): Sec17 => ({ id, label, areas });

/** Árvore canônica (a seção "Suas carreiras" de Você recebe as páginas das carreiras visíveis). */
export const NAV17: Group17[] = [
  { id: 'home', label: l('Início', 'Home'), icon: 'house', secs: [sec('today', l('Hoje', 'Today'), ['cockpit', 'plan', 'goals', 'diary'])] },
  { id: 'company', label: l('Empresa', 'Company'), icon: 'building', secs: [
    sec('base', l('Sede e equipe', 'HQ and staff'), ['hq', 'company', 'team']),
    sec('money', l('Dinheiro', 'Money'), ['finance', 'business'])] },
  { id: 'artists', label: l('Artistas', 'Artists'), icon: 'guitar', secs: [
    sec('roster', l('Seu elenco', 'Your roster'), ['artists', 'people']),
    sec('find', l('Descobrir', 'Discover'), ['market', 'directory']),
    sec('pros', l('Bastidores', 'Behind the scenes'), ['managers14', 'producers15'])] },
  { id: 'music', label: l('Música', 'Music'), icon: 'disc', secs: [
    sec('make', l('Criar', 'Create'), ['project', 'creation', 'studio']),
    sec('release', l('Lançar', 'Release'), ['releases', 'catalog']),
    sec('live', l('Palco', 'Stage'), ['shows', 'cal17'])] },
  { id: 'press', label: l('Mídia', 'Media'), icon: 'newspaper', secs: [sec('press', l('Imprensa', 'Press'), ['news17', 'media', 'critics'])] },
  { id: 'world', label: l('Mundo', 'World'), icon: 'globe', secs: [
    sec('map', l('Mapa', 'Map'), ['world', 'world17', 'after18']),
    sec('market', l('Mercado', 'Market'), ['charts', 'labels', 'industry']),
    sec('culture', l('Cultura', 'Culture'), ['movements', 'lendas'])] },
  { id: 'events', label: l('Eventos', 'Events'), icon: 'trophy', secs: [sec('events', l('Eventos', 'Events'), ['festivals', 'awards', 'rockhall'])] },
  { id: 'crime', label: l('Submundo', 'Underworld'), icon: 'skull', secs: [sec('crime', l('Submundo', 'Underworld'), ['crime'])] },
  { id: 'you', label: l('Você', 'You'), icon: 'crown', secs: [
    sec('life', l('Vida', 'Life'), ['you', 'personal', 'night14', 'wealth', 'scenes17']),
    sec('careers', l('Carreiras', 'Careers'), ['careers', 'agenda17', 'ventures']),
    sec('cpages', l('Suas carreiras', 'Your careers'), [])] },
];
export const MORE17 = { id: 'more', label: l('Mais', 'More'), icon: 'key' };

/** Ordem das carreiras (igual ao Novo Jogo). */
export const ORDER17 = ['label', 'musician', 'manager', 'booking', 'festival', 'venue', 'studio', 'publisher', 'media', 'platform'];

/** Página exclusiva de cada carreira e as telas antigas que ela absorve (viram abas dela). */
export const CAREER_PAGE17: Record<string, { area: string; label: L; icon: string; absorbs: string[] }> = {
  label: { area: 'cp17-label', label: l('Gravadora', 'Record label'), icon: 'platinum-disc', absorbs: ['identity', 'biz17'] },
  musician: { area: 'cp17-musician', label: l('Músico', 'Musician'), icon: 'sparkle', absorbs: [] },
  manager: { area: 'cp17-manager', label: l('Empresário', 'Manager'), icon: 'tie', absorbs: ['management'] },
  booking: { area: 'cp17-booking', label: l('Agente e promotor', 'Agent & promoter'), icon: 'plane', absorbs: ['tour12'] },
  festival: { area: 'cp17-festival', label: l('Dono de festival', 'Festival owner'), icon: 'star', absorbs: [] },
  venue: { area: 'cp17-venue', label: l('Casa de shows', 'Venue owner'), icon: 'stage', absorbs: [] },
  studio: { area: 'cp17-studio', label: l('Estúdio e produtor', 'Studio & producer'), icon: 'mixer', absorbs: ['studio12'] },
  publisher: { area: 'cp17-publisher', label: l('Editora musical', 'Music publisher'), icon: 'note', absorbs: ['publishing16'] },
  media: { area: 'cp17-media', label: l('Dono de mídia', 'Media owner'), icon: 'tv', absorbs: ['outlets16'] },
  platform: { area: 'cp17-platform', label: l('Plataforma', 'Platform'), icon: 'stream', absorbs: ['platform16'] },
};
export const careerOfPage17 = (area: string): string | undefined => ORDER17.find((id) => CAREER_PAGE17[id].area === area);

/** Tela antiga → [página da carreira, aba]. A aba de uma tela absorvida tem o id da tela. */
export const ALIAS17: Record<string, [string, string]> = Object.fromEntries(ORDER17.flatMap((id) => CAREER_PAGE17[id].absorbs.map((a) => [a, [CAREER_PAGE17[id].area, a]])));
export const tabKey17 = (page: string): string => page;

/** Telas que só fazem sentido com selo (contratar) ou com selo/banda (gravar, lançar). */
export const LABEL_ONLY17 = ['market'];
export const BAND_OR_LABEL17 = ['artists', 'project', 'creation', 'studio', 'releases', 'catalog'];

/** Um ícone por grupo e um por página — sem repetir (teste r17-nav). */
export const ICON17: Record<string, string> = {
  cockpit: 'gamepad', plan: 'clock', goals: 'target', diary: 'book',
  hq: 'pin', company: 'contract', team: 'people', finance: 'money', business: 'bank',
  artists: 'drums', people: 'handshake', market: 'eye', directory: 'fans', managers14: 'briefcase', producers15: 'headphones',
  project: 'cassette', creation: 'pen', studio: 'mic', releases: 'cd', catalog: 'gold-disc', shows: 'tour-bus', cal17: 'calendar',
  news17: 'megaphone', media: 'camera', critics: 'scroll',
  world: 'map', world17: 'chess', after18: 'briefcase', charts: 'chart-up', labels: 'flag', industry: 'coin', movements: 'fire', lendas: 'hologram',
  festivals: 'ticket', awards: 'medal', rockhall: 'vault', crime: 'mask',
  you: 'fame', agenda17: 'hourglass', personal: 'heart', night14: 'sleep', wealth: 'diamond', scenes17: 'shirt', careers: 'compass', ventures: 'rocket',
  identity: 'lock', biz17: 'gavel', management: 'brain', tour12: 'train', studio12: 'radio', publishing16: 'bulb', outlets16: 'film', platform16: 'ship',
  ...Object.fromEntries(ORDER17.map((id) => [CAREER_PAGE17[id].area, CAREER_PAGE17[id].icon])),
};

/** Teclas únicas (uma página por tecla; ';' = Submundo). Páginas absorvidas mantêm a tecla antiga → aba da carreira. */
export const KEY17: Record<string, string> = {
  cockpit: '1', hq: '2', charts: '3', artists: '4', market: '5', media: '6', catalog: '7', creation: '8', shows: '9', company: '0',
  plan: 'c', studio: 's', releases: 'u', world: 'w', business: 'b', finance: 'z', diary: 'd', directory: 'a', rockhall: 'r',
  you: 'v', personal: 'y', wealth: 'x', labels: 'k', festivals: 'j', awards: 'o', critics: 'q', movements: 'm', lendas: 'h',
  industry: 'i', team: 't', people: 'p', ventures: 'n', crime: ';', project: '\\', goals: 'f', careers: 'e', news17: "'",
  'cp17-label': 'l', 'cp17-manager': 'g', 'cp17-booking': '[', 'cp17-studio': ']', 'cp17-media': ',', 'cp17-platform': '.', 'cp17-publisher': '-', 'cp17-venue': '=',
};
export const areaOfKey17 = (key: string): string | undefined => { const k = key.toLowerCase(); return Object.keys(KEY17).find((a) => KEY17[a] === k); };

export interface NavCtx17 {
  /** carreiras ativas */
  active: string[];
  /** carreiras cuja página aparece (ativas ou com negócio próprio, e já existentes no ano) */
  pages: string[];
  /** a página está registrada e visível no ano atual */
  has: (area: string) => boolean;
  /** todas as páginas registradas (as que não estão na árvore entram no grupo sugerido ou em Mais) */
  all?: string[];
  /** grupo sugerido por quem registrou a página (GROUPS de app.ts: ids antigos aceitos) */
  hint?: Record<string, string>;
}
/** Ids de grupo antigos (app.ts GROUPS) → grupos novos. */
const OLD_GROUP17: Record<string, string> = { label: 'company', ventures: 'you', fame: 'events' };
/** Ids antigos que só redirecionam (mesa, caixa de entrada → Cockpit). */
const REDIRECT17 = new Set(['desk', 'inbox']);

/** Menu da partida: grupos fixos por função, carreiras em Você, o resto em "Mais". */
export function navGroups17(ctx: NavCtx17): NavGroup14[] {
  const on = (id: string) => ctx.active.includes(id);
  const label = on('label') || !ctx.active.length, band = label || on('musician');
  const pages = ORDER17.filter((id) => ctx.pages.includes(id));
  // páginas novas (de outras frentes) que ainda não estão na árvore: entram no fim do grupo sugerido
  const known = new Set([...NAV17.flatMap((g) => g.secs.flatMap((x) => x.areas)), ...ORDER17.flatMap((id) => [CAREER_PAGE17[id].area, ...CAREER_PAGE17[id].absorbs])]);
  const extra: Record<string, string[]> = {};
  const loose: string[] = [];
  for (const a of ctx.all ?? []) if (!known.has(a) && !REDIRECT17.has(a)) {
    const g0 = ctx.hint?.[a]; const g = g0 ? OLD_GROUP17[g0] ?? g0 : '';
    if (g && NAV17.some((x) => x.id === g)) (extra[g] ??= []).push(a); else loose.push(a);
  }
  const offCareer = (a: string) => (LABEL_ONLY17.includes(a) && !label) || (BAND_OR_LABEL17.includes(a) && !band);
  const used = new Set<string>();
  // telas absorvidas por uma página de carreira visível não aparecem soltas
  for (const id of pages) for (const a of CAREER_PAGE17[id].absorbs) used.add(a);
  const take = (xs: string[]) => xs.filter((a) => { if (used.has(a) || !ctx.has(a)) return false; used.add(a); return true; });
  const out: NavGroup14[] = [];
  const more: NavSection14[] = [];
  const parked: string[] = [];
  for (const g of NAV17) {
    const secs: NavSection14[] = [];
    for (const s of g.secs) {
      let xs = s.areas.filter((a) => { if (offCareer(a)) { parked.push(a); return false; } return true; });
      if (g.id === 'you' && s.id === 'cpages') xs = pages.map((id) => CAREER_PAGE17[id].area);
      const areas = take(xs);
      if (areas.length) secs.push({ label: s.label, areas });
    }
    const ex = take(extra[g.id] ?? []);
    if (ex.length) { if (secs.length) secs[secs.length - 1] = { ...secs[secs.length - 1], areas: [...secs[secs.length - 1].areas, ...ex] }; else secs.push({ label: g.label, areas: ex }); }
    if (!secs.length) continue;
    const areas = secs.flatMap((x) => x.areas);
    out.push({ id: g.id, label: g.label, icon: g.icon, areas, sections: secs.length > 1 ? secs : undefined });
  }
  const pk = take(parked);
  if (pk.length) more.push({ label: l('Selo e banda (fora das suas carreiras)', 'Label and band (outside your careers)'), areas: pk });
  // telas de carreiras sem página visível: ficam alcançáveis em Mais, com o nome da carreira
  for (const id of ORDER17) if (!pages.includes(id)) {
    const areas = take(CAREER_PAGE17[id].absorbs);
    if (areas.length) more.push({ label: CAREER_PAGE17[id].label, areas });
  }
  const lz = take(loose);
  if (lz.length) more.push({ label: l('Outras páginas', 'Other pages'), areas: lz });
  if (more.length) out.push({ id: MORE17.id, label: MORE17.label, icon: MORE17.icon, areas: more.flatMap((x) => x.areas), sections: more, other: true });
  return out;
}

/** Área canônica: telas absorvidas abrem a página da carreira (se ela está no menu) na aba certa. */
export function resolve17(area: string, gs: NavGroup14[]): { area: string; tab?: [string, string] } {
  const al = ALIAS17[area];
  if (al && gs.some((g) => g.areas.includes(al[0]))) return { area: al[0], tab: [tabKey17(al[0]), al[1]] };
  return { area };
}

export function groupOf17(gs: NavGroup14[], area: string): NavGroup14 {
  return gs.find((g) => g.areas.includes(area)) ?? gs[0];
}

/** Seção (subtítulo) da área dentro do grupo, para as migalhas Grupo › Seção › Página. */
export function sectionOf17(g: NavGroup14, area: string): L | undefined {
  return g.sections?.find((x) => x.areas.includes(area))?.label;
}

// ---------------------------------------------------------------- fixados e recentes (puros)

/** Fixa/desafixa (máx. 8, mais novo primeiro). */
export function togglePin17(pins: string[], area: string, max = 8): string[] {
  return pins.includes(area) ? pins.filter((x) => x !== area) : [area, ...pins].slice(0, max);
}
/** Histórico de recentes: sem repetir, mais novo primeiro. */
export function pushRecent17(rec: string[], area: string, max = 6): string[] {
  return [area, ...rec.filter((x) => x !== area)].slice(0, max);
}
