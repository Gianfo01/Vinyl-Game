// R31 · onda 5 (CASA) — MODELO da casa como "Você" (EXP-6) e da sede que cresce (EXP-5). PURO: sem DOM, só lê o estado.
// Atrás de `exp5.nav` (desligado): quem desenha é casa5.ts; quem testa é tests/r31-casa5.test.ts.
//
//   dwell5(s)          — a moradia de verdade: aluguel, apartamento, casa ou mansão (HOUSES do dono; sem casa = aluguel);
//   casaObjs5(s)       — os objetos da casa e o que cada um abre (a 1ª ligação abre; as outras são marcadores do papel).
//                        Tudo o que a entrada "Você" do menu alcança hoje (perfil, vida pessoal, contatos, patrimônio,
//                        escritório em casa, estante, noite) tem um objeto aqui; a ficha do personagem é o espelho.
//   houses5(s)         — o chaveiro (Tab): a casa principal, os imóveis em outras cidades, a sede e as casas de carreira;
//   sedeStage5(s)      — garagem → escritório → andar → prédio, pelo nível da sede (HQ_LEVELS) e pela fachada da época;
//   sedeObjs5(s)       — os objetos da sede por sala; cada um só aparece quando a função existe (sala aberta na planta);
//   maquete5(s)        — a maquete (tecla 2): degraus, o próximo passo com custo e motivo do bloqueio, salas e andares.
// As ações são as de hoje (upgradeHq, buyRoom27, buyHouse…): este arquivo não tem nenhuma.

import { HQ_LEVELS } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import { hqBlocker, hqCaps, type HqCaps } from '../../sim/branches';
import { upgradeCost } from '../../sim/economy';
import { homes31 } from '../../sim/r31/city31';
import { careers } from '../../sim/sys/careers12';
import { goodById, type Owned } from '../../sim/sys/goods8';
import { hqRooms27, type Unit27 } from '../../sim/sys/hqrooms27';
import { HOUSES, ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import type { Obj5 as Art5 } from '../pixel/exp5px';
import { plan27, type Kind27 } from '../ps/hqpx27';
import { CAREER_PAGE17 } from '../nav17';
import { SEDE_LABEL31 } from '../ps/menu31';
import { object5, objects5, type Obj5 } from './objects5';

/** Para onde um objeto leva: a página antiga e as abas (de fora para dentro). */
export interface Go5 { area: string; tabs?: [string, string][]; label: L }
const G = (area: string, label: L, ...tabs: [string, string][]): Go5 => ({ area, label, tabs: tabs.length ? tabs : undefined });

// ---------------------------------------------------------------- moradia

export type Dwell5 = 'aluguel' | 'apartamento' | 'casa' | 'mansao';
export const DWELL5: Dwell5[] = ['aluguel', 'apartamento', 'casa', 'mansao'];
export const DWELL5_L: Record<Dwell5, L> = {
  aluguel: l('aluguel', 'rented'), apartamento: l('apartamento', 'apartment'), casa: l('casa', 'house'), mansao: l('mansão', 'mansion'),
};
/** Tipo de moradia de cada casa do catálogo (owner.HOUSES). */
export const HOUSE_DWELL5: Record<string, Dwell5> = {
  tenement: 'aluguel', apartment: 'apartamento', loft: 'apartamento', penthouse: 'apartamento',
  townhouse: 'casa', chalet: 'casa', suburb: 'casa',
  artdeco: 'mansao', palacete: 'mansao', modernist: 'mansao', ranch: 'mansao', smart: 'mansao',
};
export const dwellOfHouse5 = (house: number): Dwell5 => (house < 0 ? 'aluguel' : HOUSE_DWELL5[HOUSES[house]?.id ?? ''] ?? 'casa');

/** A casa que a cena mostra: a principal (cidade-sede) ou um imóvel em outra cidade (chaveiro). */
export interface Home5 { key: string; city: string; house: number; dwell: Dwell5; name: L; main: boolean }
export function mainHome5(s: GameState): Home5 {
  const o = ownerOf(s);
  const hs = o.house >= 0 ? HOUSES[o.house] : undefined;
  return { key: 'home', city: s.config.homeCity, house: o.house, dwell: dwellOfHouse5(o.house), name: hs ? hs.name : l('Moradia alugada', 'Rented place'), main: true };
}
export const dwell5 = (s: GameState): Dwell5 => mainHome5(s).dwell;

// ---------------------------------------------------------------- chaveiro (Tab)

export interface Key5 { key: string; kind: 'home' | 'abroad' | 'sede' | 'career'; label: L; city?: string; home?: Home5; area?: string }
/** Todas as chaves: a casa, os imóveis fora, a sede da carreira principal e os prédios das outras carreiras. */
export function houses5(s: GameState): Key5[] {
  const m = mainHome5(s);
  const out: Key5[] = [{ key: m.key, kind: 'home', label: l(`Casa · ${m.name.pt}`, `Home · ${m.name.en}`), city: m.city, home: m }];
  for (const h of homes31(s)) {
    const c = cityById[h.city]?.name ?? l(h.city, h.city);
    const hs = HOUSES[h.house];
    out.push({ key: `abroad:${h.city}`, kind: 'abroad', label: l(`${hs.name.pt} · ${c.pt}`, `${hs.name.en} · ${c.en}`), city: h.city,
      home: { key: `abroad:${h.city}`, city: h.city, house: h.house, dwell: dwellOfHouse5(h.house), name: hs.name, main: false } });
  }
  const act = careers(s).active;
  const main = act[0] ?? 'label';
  out.push({ key: 'sede', kind: 'sede', label: SEDE_LABEL31[main] ?? l('Sede', 'HQ'), area: main === 'label' ? 'sede25' : CAREER_PAGE17[main]?.area ?? 'sede25' });
  for (const c of act.slice(1)) { const cp = CAREER_PAGE17[c]; if (cp) out.push({ key: `career:${c}`, kind: 'career', label: SEDE_LABEL31[c] ?? cp.label, area: cp.area }); }
  return out;
}
/** O chaveiro aparece com 2+ casas OU 2+ sedes (casa + sede sempre existem; conta o que é "a mais"). */
export const keyRing5 = (s: GameState): boolean => houses5(s).filter((k) => k.kind === 'abroad' || k.kind === 'career').length > 0;
/** Próxima chave (Tab), em volta. */
export function nextKey5(list: readonly Key5[], cur: string): Key5 {
  const i = list.findIndex((k) => k.key === cur);
  return list[(i + 1) % list.length];
}

// ---------------------------------------------------------------- objetos da casa

export type Room5 = 'sala' | 'quarto' | 'escritorio' | 'criancas' | 'garagem';
export const ROOM5_L: Record<Room5, L> = {
  sala: l('Sala', 'Living room'), quarto: l('Quarto', 'Bedroom'), escritorio: l('Escritório', 'Study'), criancas: l('Quarto das crianças', "Kids' room"), garagem: l('Garagem', 'Garage'),
};
/** Painel próprio da casa (o resto abre a página antiga). */
export type CasaPanel5 = 'janela' | 'garagem' | 'chaveiro';
export interface CasaObj5 {
  id: string;
  /** objeto do registro da onda 5 (tecla e "!"), quando existe */
  obj?: string;
  label: L;
  /** frase curta (o que faz), como no mock: "Espelho: sua ficha" */
  tip: L;
  room: Room5;
  /** desenho da galeria ART5 (exp5px) ou peça do cenário */
  art: Art5 | 'couch' | 'window' | 'door' | 'shelf' | 'records' | 'you';
  /** 1ª abre; as outras são marcadores (2º clique) */
  go: Go5[];
  panel?: CasaPanel5;
}

const ME = (tab: string, label: L): Go5 => G('you', label, ['life-you', tab]);
const LIFE = (tab: string, label: L): Go5 => G('personal', label, ['life-personal', tab]);
const WEALTH: Go5 = G('wealth', l('Patrimônio', 'Wealth'), ['life-wealth', 'wealth']);
const GOODS: Go5 = G('wealth', l('Seus bens e veículos', 'Belongings and vehicles'), ['life-wealth', 'goods8'], ['goods8', 'mine']);
const PURSE: Go5 = G('business', l('Seu bolso (extrato pessoal)', 'Your pocket (personal statement)'), ['business-business', 'purse31']);
const OFFICE: Go5[] = [G('careers', l('Outras carreiras', 'Other careers')), G('ventures', l('Negócios', 'Ventures')), G('shared18', l('Sociedades', 'Partnerships'))];

/** Quantos veículos o dono tem (garagem). */
export const vehicles5 = (s: GameState): Owned[] => ((s.x4 as unknown as { goods8?: { owned?: Owned[] } }).goods8?.owned ?? []).filter((o) => goodById[o.id]?.cat === 'vehicle');
export const kids5 = (s: GameState): number => ownerOf(s).kids.length;

/** Os objetos da casa (moradia e época mudam o que existe e onde fica). `home` = outra casa do chaveiro. */
export function casaObjs5(s: GameState, home: Home5 = mainHome5(s)): CasaObj5[] {
  const dw = home.dwell;
  const big = dw === 'casa' || dw === 'mansao';
  const out: CasaObj5[] = [];
  const add = (o: CasaObj5) => out.push(o);
  add({ id: 'porta', label: l('Porta', 'Door'), tip: l('sair para a cidade', 'go out to the city'), room: 'sala', art: 'door',
    go: [G('campus18', l('Cidade', 'City')), G('night14', l('Sair à noite', 'Night out'))] });
  add({ id: 'janela', label: l('Janela', 'Window'), tip: l('casas à venda e imóveis', 'houses for sale and property'), room: 'sala', art: 'window', panel: 'janela',
    go: [G('casa31', l('Casas à venda', 'Houses for sale')), G('wealth', l('Imóveis (investimento)', 'Property (investment)'), ['life-wealth', 'goods8'], ['goods8', 'invest'], ['invest10', 'prop'])] });
  add({ id: 'espelho', obj: 'espelho', label: l('Espelho', 'Mirror'), tip: l('sua ficha e aparência', 'your sheet and looks'), room: big ? 'quarto' : dw === 'aluguel' ? 'sala' : 'quarto', art: 'mirror',
    go: [ME('looks17', l('Aparência', 'Appearance')), ME('me', l('Perfil', 'Profile')), ME('persona', l('Personalidade', 'Personality')), ME('decisions', l('Decisões', 'Decisions')), ME('music', l('Carreira musical', 'Music career'))] });
  add({ id: 'cama', obj: 'cama', label: l('Cama', 'Bed'), tip: l('energia, descanso e saúde', 'energy, rest and health'), room: dw === 'aluguel' ? 'sala' : 'quarto', art: 'bed',
    go: [ME('me', l('Energia e saúde (perfil)', 'Energy and health (profile)')), LIFE('leisure', l('Lazer e saúde', 'Leisure and health'))] });
  if (dw !== 'aluguel') add({ id: 'sofa', label: l('Sofá', 'Sofa'), tip: l('descansar', 'rest'), room: 'sala', art: 'couch',
    go: [LIFE('leisure', l('Lazer e saúde', 'Leisure and health')), LIFE('vices', l('Vida intensa', 'Fast life'))] });
  add({ id: 'escrivaninha', label: l('Escrivaninha', 'Writing desk'), tip: l('dinheiro e agenda pessoal', 'personal money and agenda'), room: dw === 'mansao' ? 'escritorio' : dw === 'aluguel' ? 'sala' : 'quarto', art: 'writedesk',
    go: [WEALTH, LIFE('agenda8', l('Agenda pessoal', 'Personal agenda')), PURSE, ...(dw === 'mansao' ? [] : OFFICE)] });
  if (dw === 'mansao') add({ id: 'escritoriocasa', obj: 'escritoriocasa', label: l('Escritório em casa', 'Home office'), tip: l('outras carreiras e negócios', 'other careers and ventures'), room: 'escritorio', art: 'filing' as Art5, go: OFFICE });
  add({ id: 'calendario', obj: 'calcozinha', label: l('Calendário', 'Calendar'), tip: l('agenda pessoal', 'personal agenda'), room: dw === 'aluguel' ? 'sala' : big ? 'quarto' : 'sala', art: 'calendar',
    go: [LIFE('agenda8', l('Agenda pessoal', 'Personal agenda'))] });
  add({ id: 'retratos', obj: 'retratoscasa', label: l('Porta-retratos', 'Picture frames'), tip: l('família e Coração', 'family and Heart'), room: 'sala', art: 'photo',
    go: [LIFE('love', l('Amor e família', 'Love and family')), LIFE('heart17', l('Coração', 'Heart')), LIFE('kids17', l('Filhos', 'Children')), LIFE('care17', l('Fé e cuidado', 'Faith and care')), LIFE('routines12', l('Rotinas e selo', 'Routines and label'))] });
  add({ id: 'telefone', obj: 'telefonecasa', label: l('Telefone', 'Telephone'), tip: l('contatos e chamar para sair', 'contacts and ask out'), room: 'sala', art: 'phone',
    go: [G('known31', l('Contatos', 'Contacts')), LIFE('heart17', l('Coração (namoro)', 'Heart (dating)'))] });
  add({ id: 'estante', obj: 'estante', label: l('Estante', 'Bookshelf'), tip: l('aprendizados, traços e lembranças', 'learnings, traits and keepsakes'), room: dw === 'mansao' ? 'escritorio' : 'sala', art: 'shelf',
    go: [G('business', l('Aprendizados', 'Learnings'), ['business-business', 'learn31']), ME('persona', l('Traços (personalidade)', 'Traits (personality)')), G('scenes17', l('Lembranças', 'Keepsakes'))] });
  add({ id: 'instrumento', label: l('Instrumento', 'Instrument'), tip: l('praticar', 'practise'), room: 'sala', art: 'instrument',
    go: [ME('music', l('Carreira musical', 'Music career'))] });
  if (big) add({ id: 'cofre', obj: 'cofrecasa', label: l('Cofre', 'Safe'), tip: l('patrimônio pessoal', 'personal wealth'), room: dw === 'mansao' ? 'escritorio' : 'quarto', art: 'safe',
    go: [WEALTH, G('wealth', l('Investimentos', 'Investments'), ['life-wealth', 'goods8'], ['goods8', 'invest'])] });
  if (big) add({ id: 'garagem', obj: 'garagem', label: l('Garagem', 'Garage'), tip: l('veículos', 'vehicles'), room: 'garagem', art: 'garage', panel: 'garagem', go: [GOODS] });
  if (kids5(s) > 0) add({ id: 'criancas', label: l('Quarto das crianças', "Kids' room"), tip: l('filhos', 'children'), room: big ? 'criancas' : 'quarto', art: 'kidsroom',
    go: [LIFE('kids17', l('Filhos', 'Children'))] });
  if (big || s.player.stats.gold > 0) add({ id: 'discos', label: l('Discos na parede', 'Records on the wall'), tip: l('seus discos de ouro', 'your gold records'), room: 'sala', art: 'records', go: [G('awards', l('Prêmios', 'Awards'))] });
  if (keyRing5(s)) add({ id: 'chaveiro', obj: 'chaveiro', label: l('Chaveiro', 'Key rack'), tip: l('suas casas (Tab)', 'your houses (Tab)'), room: 'sala', art: 'keys', panel: 'chaveiro', go: [] });
  add({ id: 'voce', label: l('Você', 'You'), tip: l('seu perfil', 'your profile'), room: 'sala', art: 'you', go: [ME('me', l('Perfil', 'Profile'))] });
  if (!home.main) return out.filter((o) => o.id !== 'chaveiro' || keyRing5(s));
  return out;
}

/** Todas as páginas que um objeto da casa alcança (1º clique e marcadores). */
export const casaAreas5 = (os: readonly CasaObj5[]): Set<string> => new Set(os.flatMap((o) => o.go.map((g) => g.area)));

// ---------------------------------------------------------------- sede que cresce

export type Stage5 = 'garagem' | 'escritorio' | 'andar' | 'predio';
export const STAGE5: Stage5[] = ['garagem', 'escritorio', 'andar', 'predio'];
export const STAGE5_L: Record<Stage5, L> = {
  garagem: l('Garagem', 'Garage'), escritorio: l('Escritório', 'Office'), andar: l('Andar', 'Floor'), predio: l('Prédio', 'Building'),
};
/** Nível da sede (HQ_LEVELS) → degrau: garagem, estúdio pequeno = escritório, loft = andar, complexo/torre/campus = prédio. */
export const stageOfHq5 = (hq: number): Stage5 => (hq <= 0 ? 'garagem' : hq === 1 ? 'escritorio' : hq === 2 ? 'andar' : 'predio');
const hqOf5 = (s: GameState): number => Math.max(0, Math.min(HQ_LEVELS.length - 1, s.player.hq ?? 0));
export const sedeStage5 = (s: GameState): Stage5 => stageOfHq5(hqOf5(s));

/** Salas da sede (planta hqpx27) → lugar dos objetos do registro (objects5.place). */
const ROOM_OF_PLACE5: Record<string, Kind27[]> = {
  'sede.recepcao': ['lobby'], 'sede.sala': ['office'], 'sede.reuniao': ['meeting', 'office'], 'sede.ar': ['anr', 'office'],
  'sede.lounge': ['lounge'], 'sede.estudio': ['studio'], 'sede.ensaio': ['stage', 'rehearsal'], 'sede.arquivo': ['archive', 'office'],
  'sede.financeiro': ['office'], 'sede.rh': ['office'], 'sede.pesquisa': ['office'], 'sede.corredor': ['lobby'],
};
/** Objetos que dependem de uma INSTALAÇÃO: sem a sala aberta, a função não existe (palco sem palco, estúdio sem estúdio). */
const NEEDS_ROOM5 = new Set(['sede.estudio', 'sede.ensaio', 'sede.lounge']);
/** Desenho ART5 de cada objeto da sede (os sem desenho próprio são a própria sala da planta: estúdio, palco, lounge). */
export const SEDE_ART5: Partial<Record<string, Art5>> = {
  porta: 'door', mapaparede: 'worldmap', chaveiro: 'keys', mesames: 'monthdesk', correspondencia: 'mail', quadroplan: 'planning', agenda: 'calendar',
  livrocaixa: 'ledger', cofre: 'safe', arquivoaco: 'filing', fichario: 'rolodex', telefone: 'phone', jornal: 'paper', radiotv: 'radiotv',
  revista: 'paper', quadrometas: 'goals', diario: 'diary', caderno: 'learnbook', portaretrato: 'photo', quadrobranco: 'whiteboard',
  mesareuniao: 'meeting', maquete: 'model', mural: 'cork', olheiro: 'scoutdesk', demos: 'demos', trofeus: 'trophies',
};

export interface SedeRoom5 { kind: Kind27; name: L; floor: number; open: boolean; lock?: 'locked' | 'building'; objs: Obj5[] }
/** Estado das salas compráveis no formato da planta (id → aberta/fechada/em obra). */
export function units5(s: GameState): Record<string, 'open' | 'locked' | 'building'> {
  const out: Record<string, 'open' | 'locked' | 'building'> = {};
  for (const u of hqRooms27(s)) out[u.id] = u.status;
  return out;
}
/** As salas da sede de agora e os objetos de cada uma. `has(area)` = página registrada (sem função = todas). */
export function sedeObjs5(s: GameState, has: (area: string) => boolean = () => true): SedeRoom5[] {
  const pl = plan27({ hq: hqOf5(s), year: s.year, units: units5(s) });
  const rooms: SedeRoom5[] = pl.cells.map((c) => ({ kind: c.kind, name: c.name ?? ROOM_L5[c.kind] ?? l(c.kind, c.kind), floor: c.floor, open: !c.lock, lock: c.lock, objs: [] }));
  const openKinds = new Set(rooms.filter((r) => r.open).map((r) => r.kind));
  const ring = keyRing5(s);
  for (const o of objects5()) {
    if (!o.place.startsWith('sede.') || o.place === 'sede.lugar') continue;
    if (o.id === 'chaveiro' && !ring) continue;
    if (o.era && (s.year < o.era[0] || s.year > o.era[1])) continue;
    const pages = [...o.opens, ...(o.links ?? [])];
    if (pages.length && !pages.some((p) => has(p.area))) continue;
    const want = ROOM_OF_PLACE5[o.place] ?? ['office'];
    const kind = want.find((k) => openKinds.has(k)) ?? (NEEDS_ROOM5.has(o.place) ? undefined : 'office');
    if (!kind || !openKinds.has(kind)) continue;
    rooms.find((r) => r.kind === kind && r.open)!.objs.push(o);
  }
  return rooms;
}
export const ROOM_L5: Partial<Record<Kind27, L>> = {
  lobby: l('Recepção', 'Reception'), office: l('Sua sala', 'Your office'), studio: l('Estúdio', 'Studio'), lounge: l('Lounge', 'Lounge'),
  anr: l('A&R', 'A&R'), stage: l('Palco', 'Stage'),
};

/** Um degrau da maquete (nível de HQ_LEVELS). */
export interface Step5 { lv: number; stage: Stage5; name: L; now: boolean; done: boolean; cost: number; blocked: L | null; caps: HqCaps }
export interface Maquete5 { stage: Stage5; steps: Step5[]; next?: Step5; units: Unit27[]; caps: HqCaps }
/** A maquete do prédio: em que degrau está, o próximo (custo e motivo do bloqueio) e as salas/andares compráveis. */
export function maquete5(s: GameState): Maquete5 {
  const hq = hqOf5(s);
  const steps: Step5[] = HQ_LEVELS.map((lv, i) => ({
    lv: i, stage: stageOfHq5(i), name: lv.name, now: i === hq, done: i < hq,
    cost: i === hq + 1 ? upgradeCost(s) ?? 0 : 0,
    blocked: i === hq + 1 ? hqBlocker(s) : i > hq + 1 ? hqBlocker(s, lv) ?? l('Um degrau de cada vez.', 'One step at a time.') : null,
    caps: { careers: lv.careers, staff: lv.staff, sessions: lv.sessions, equipment: lv.equipment },
  }));
  return { stage: stageOfHq5(hq), steps, next: steps[hq + 1], units: hqRooms27(s), caps: hqCaps(s) };
}

/** Objeto do registro ou undefined (atalho para a interface). */
export const regObj5 = (id?: string): Obj5 | undefined => (id ? object5(id) : undefined);
