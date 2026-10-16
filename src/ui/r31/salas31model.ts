// R31 · onda 2 · K + L — SALAS DA SEDE EM CENA (modelo puro, sem DOM).
//
// Cada sala da sede vira uma cena interativa: os objetos e as pessoas são os botões, com um selo curto em cima
// (texto + símbolo, nunca só cor) e um painel de ação de 1 clique. Este arquivo só LÊ o estado: não cria pessoas,
// não muda estoque, não sorteia, não paga nada (regra "explorar não muda o mundo"; os testes conferem).
//
//   salaModel31(s, id)  — o modelo da sala: título, arte (época e tamanho), pontos clicáveis, você, lista completa;
//   artOf31(id, ano, hq) — a arte escolhida (equipamento, luz, mídia, casca da sede, largura): determinística;
//   youAt31(s)           — onde está o seu personagem (sala da sede ou fora, com o lugar).
//
// Salas: Estúdio, Elenco, Equipe, Catálogo, Talentos, Troféus e relíquias, e a cena-assinatura de cada uma das 12
// carreiras ('sig:<carreira>'). A pintura fica em salas31px.ts; a tela em salas31.ts.

import { TIER_NAME31, relicTierOf31 } from '../../sim/r31/relic31';
import type { Relic } from '../../sim/sys/relics9';
import { HQ_LEVELS, STAFF_ROLES, STUDIO_TIERS } from '../../data/rules';
import { cityById, l, type L } from '../../data/world';
import { hqCaps } from '../../sim/branches';
import { annualRevenue } from '../../sim/rights';
import { PRODUCERS, soundOf } from '../../sim/studio';
import { roleLoads } from '../../sim/sys/capacity14';
import { careerDef } from '../../sim/sys/careers12';
import { hqRooms27 } from '../../sim/sys/hqrooms27';
import { playerPerson } from '../../sim/sys/life';
import { COLS23, column23, unc23, uncText23 } from '../../sim/sys/scout23';
import type { Act, GameState, Person } from '../../sim/types';
import type { StudioSession } from '../../sim/xtypes';
import { fmtL, playerActs, staffSkill } from '../../sim/util';
import { gearOf27, lightOf27, shellOf27, specFloors27, type Gear27, type Light27, type Shell27 } from '../ps/hqpx27';
import type { Room25 } from '../ps/hq25model';

// ---------------------------------------------------------------- tipos

export type Career31 = 'label' | 'musician' | 'manager' | 'booking' | 'venue' | 'festival' | 'studio' | 'publisher' | 'media' | 'platform' | 'critic' | 'screen';
export const CAREERS31: Career31[] = ['label', 'musician', 'manager', 'booking', 'venue', 'festival', 'studio', 'publisher', 'media', 'platform', 'critic', 'screen'];
export type SalaId31 = 'studio' | 'roster' | 'team' | 'catalog' | 'talent' | 'trophy' | `sig:${Career31}`;
export const ROOMS31: SalaId31[] = ['studio', 'roster', 'team', 'catalog', 'talent', 'trophy'];
export const SALAS31: SalaId31[] = [...ROOMS31, ...CAREERS31.map((c) => `sig:${c}` as SalaId31)];

/** Quatro níveis de alerta que não brigam (só o crítico pulsa) + "bom". Sempre com símbolo e texto. */
export type Tone31 = 'crit' | 'soon' | 'normal' | 'info' | 'good';
export interface Chip31 { sym: string; text: L; tone: Tone31; /** barra 0..100 (carga, qualidade) */ bar?: number }

/** O que um clique faz (a tela traduz para navegação ou para a função do jogo; o modelo só descreve). */
export type Do31 =
  | { k: 'go'; area: string; tab?: [string, string]; market?: string }
  | { k: 'act'; id: string }
  | { k: 'person'; id: string }
  | { k: 'sessions' }
  | { k: 'take'; session: string; choice: 'keep' | 'another' | 'comp' }
  | { k: 'sala'; id: SalaId31 }
  | { k: 'relic'; id: string }
  | { k: 'release'; id: string }
  | { k: 'you' }
  | { k: 'agg' };

export interface Btn31 { id: string; label: L; do: Do31; /** motivo do bloqueio (mostrado antes do clique) */ lock?: L | null; main?: boolean }

/** Peças que a pintura sabe desenhar (vista lateral, como a sede). */
export type Prop31 =
  | 'console' | 'reel' | 'glass' | 'foam' | 'drums' | 'amp' | 'mic' | 'piano' | 'door' | 'onair' | 'monitors'
  | 'couch' | 'poster' | 'gold' | 'window' | 'player' | 'plant' | 'suitcase' | 'cork' | 'ghost' | 'guitarstand'
  | 'desk' | 'chair' | 'clipboard' | 'filing' | 'shelf' | 'vacancy'
  | 'masters' | 'scores' | 'portraits' | 'boxes'
  | 'counter' | 'bottles' | 'stage' | 'crowd' | 'demos' | 'notebook' | 'flyer'
  | 'pedestal' | 'tiers' | 'trophies'
  | 'whiteboard' | 'mirror' | 'clients' | 'routemap' | 'booth' | 'tents' | 'servers' | 'screen' | 'projector' | 'records' | 'phone' | 'schedule' | 'typewriter';

export interface Fig31 { personId?: string; seed: string; pose: 'stand' | 'sit' | 'play' | 'walk'; dir: 'SE' | 'SW'; lift?: number; role?: string | null; bubble?: 'heart' | 'bolt' | 'cloud' }
export interface Hot31 {
  id: string;
  kind: 'person' | 'object' | 'empty' | 'door';
  /** posição (0..1 da largura útil) e largura */
  x: number; w: number;
  prop?: Prop31;
  /** parâmetros da pintura (contagem, brilho, nível…) */
  pp?: { n?: number; glow?: number[]; lvl?: number; on?: boolean; art?: string; seed?: string; name?: string; year?: number; kind?: string };
  fig?: Fig31;
  label: L; tip: L;
  chip?: Chip31;
  /** ação do clique principal */
  do: Do31;
  /** ações do painel (1 clique) */
  acts?: Btn31[];
  actId?: string; personId?: string;
}
export interface Deco31 { prop: Prop31; x: number; w?: number; pp?: Hot31['pp'] }

export interface You31 { personId?: string; here: boolean; room: Room25 | 'away'; where: L; x: number }

export interface Art31 {
  sala: SalaId31; year: number; hq: number;
  shell: Shell27; gear: Gear27; light: Light27;
  media: 'sheets' | 'shellac' | 'lp' | 'tapes' | 'cds' | 'drives';
  size: 'small' | 'mid' | 'big';
  /** largura lógica da sala em pixels */
  W: number;
  /** andares do prédio (Equipe) e andares desenhados esmaecidos acima */
  floors: number; upper: number;
  rented: boolean; boxes: boolean; dim: boolean;
  /** semente local da decoração (cidade + sala) */
  seed: string;
}

export interface Row31 { id: string; t: L; d: L; chip?: Chip31; do: Do31 }

export interface SalaM31 {
  id: SalaId31;
  title: L; sub: L;
  /** primeira visita: o que é cada objeto (depois some) */
  intro: L;
  art: Art31;
  hots: Hot31[];
  deco: Deco31[];
  you: You31;
  /** "ver detalhes": a tela de texto com tudo */
  details: Do31;
  /** exceções em destaque (no alto da cena) */
  alerts: Chip31[];
  /** lista completa (embaixo) ou quadro de quem está fora */
  list: Row31[];
  listTitle?: L;
  away?: Row31[];
}

// ---------------------------------------------------------------- leitura sem efeito

/** Lê um bloco do estado estendido SEM criar (os getters dos sistemas criam o bloco vazio na primeira leitura). */
const x4 = <T>(s: GameState, k: string): T | undefined => (s as unknown as { x4?: Record<string, unknown> }).x4?.[k] as T | undefined;

const live = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split');
const pl = (n: number, one: L, many: L): L => (n === 1 ? one : many);
const wk = (n: number): L => fmtL(pl(n, l('{n} sem', '{n} wk'), l('{n} sem', '{n} wks')), { n });
const L1 = (s: string): L => l(s, s);

// ---------------------------------------------------------------- arte por época e tamanho (L)

/** Arte da sala: só do id, do ano e do nível da sede (mais duas marcas de estado). Mesmo pedido, mesma arte. */
export function artOf31(sala: SalaId31, year: number, hq: number, o: { rented?: boolean; archive?: boolean; city?: string } = {}): Art31 {
  const lv = Math.max(0, Math.min(HQ_LEVELS.length - 1, Math.floor(hq)));
  const shell = shellOf27(lv);
  const size: Art31['size'] = lv <= 1 ? 'small' : lv <= 3 ? 'mid' : 'big';
  const media: Art31['media'] = year < 1920 ? 'sheets' : year < 1950 ? 'shellac' : year < 1975 ? 'lp' : year < 1990 ? 'tapes' : year < 2008 ? 'cds' : 'drives';
  const floors = specFloors27(lv).length;
  const team = sala === 'team';
  const W = (size === 'small' ? 360 : size === 'mid' ? 400 : 440) + (team ? 20 : 0);
  return {
    sala, year, hq: lv, shell, gear: gearOf27(year), light: lightOf27(shell, year), media, size, W,
    floors, upper: team ? Math.max(0, floors - 2) : 0,
    rented: sala === 'studio' && !!o.rented,
    boxes: sala === 'catalog' && !o.archive && lv <= 1,
    dim: sala === 'talent' || sala === 'sig:venue' || sala === 'sig:screen' || sala === 'sig:musician',
    seed: `${o.city ?? ''}|${sala}`,
  };
}

// ---------------------------------------------------------------- você

/** Onde você está agora (o mesmo para a sede e para as cenas): em turnê com a sua banda, gravando, ou na sua sala. */
export function youAt31(s: GameState): You31 {
  const p = playerPerson(s);
  const pid = p?.id;
  const band = pid ? live(s).find((a) => a.members.includes(pid)) ?? (s.player.bandActId ? s.acts[s.player.bandActId] : undefined) : undefined;
  if (band) {
    const tour = (s.tours ?? []).find((x) => x.actId === band.id && x.status === 'running');
    if (tour) {
      const st = [...tour.stops].reverse().find((x) => x.status === 'played') ?? tour.stops.find((x) => x.status === 'scheduled');
      const city = st ? cityById[st.cityId]?.name : undefined;
      return { personId: pid, here: false, room: 'away', where: city ? fmtL(l('Você está em turnê em {c}', 'You are on tour in {c}'), { c: city }) : l('Você está em turnê', 'You are on tour'), x: 0 };
    }
    if ((s.sessions ?? []).some((x) => !x.done && x.actId === band.id && (x.tier ?? 0) > 0)) return { personId: pid, here: false, room: 'away', where: l('Você está gravando num estúdio alugado', 'You are recording at a rented studio'), x: 0 };
    if ((s.sessions ?? []).some((x) => !x.done && x.actId === band.id)) return { personId: pid, here: true, room: 'studio', where: l('Você está no estúdio, gravando', 'You are in the studio, recording'), x: 0.5 };
  }
  return { personId: pid, here: true, room: 'office', where: l('Você está na sua sala', 'You are in your office'), x: 0.5 };
}

/** Você na cena: aparece se estiver nesta sala ou se veio visitar (salas sem lugar fixo); senão o aviso diz onde está. */
function youIn(s: GameState, sala: SalaId31, x: number): You31 {
  const y = youAt31(s);
  if (!y.here) return y;
  // nas salas da sede você entra para olhar; no estúdio, se está gravando, fica junto da banda
  return { ...y, here: true, x, where: y.room === 'studio' && sala === 'studio' ? y.where : fmtL(l('Você veio até {r}', 'You came to {r}'), { r: TITLE31[sala] }) };
}

// ---------------------------------------------------------------- títulos

export const TITLE31: Record<string, L> = {
  studio: l('o estúdio', 'the studio'), roster: l('o lounge do elenco', 'the artist lounge'), team: l('a equipe', 'the team floor'),
  catalog: l('o arquivo', 'the archive'), talent: l('o clube', 'the club'), trophy: l('a sala de troféus', 'the trophy room'),
};
export const SALA_NAME31: Record<SalaId31, L> = {
  studio: l('Estúdio', 'Studio'), roster: l('Elenco', 'Roster'), team: l('Equipe', 'Team'), catalog: l('Catálogo', 'Catalog'), talent: l('Talentos', 'Talent'), trophy: l('Troféus e relíquias', 'Trophies and relics'),
  'sig:label': l('Reunião de lançamento', 'Release meeting'), 'sig:musician': l('Ensaio e camarim', 'Rehearsal and dressing room'), 'sig:manager': l('Quadro de clientes', 'Client board'),
  'sig:booking': l('Mapa de rotas', 'Route map'), 'sig:venue': l('Palco e bilheteria', 'Stage and box office'), 'sig:festival': l('Terreno do festival', 'Festival grounds'),
  'sig:studio': l('Sala de controle', 'Control room'), 'sig:publisher': l('Arquivo de partituras', 'Sheet-music archive'), 'sig:media': l('Rádio no ar', 'Radio on air'),
  'sig:platform': l('Sala de servidores', 'Server room'), 'sig:critic': l('Redação', 'Newsroom'), 'sig:screen': l('Sala de projeção', 'Screening room'),
};
/** Sala da sede (corte) → cena. Palco e recepção ficam com a Turnê e a Mesa do chefe. */
export const ROOM_SALA31: Partial<Record<Room25, SalaId31>> = { studio: 'studio', lounge: 'roster', office: 'team', anr: 'talent' };
/** Página → cena de cabeçalho (a tabela da página continua embaixo). */
export const AREA_SALA31: Record<string, SalaId31> = { studio: 'studio', artists: 'roster', team: 'team', catalog: 'catalog', market: 'talent', lendas: 'trophy', awards: 'trophy' };

// ---------------------------------------------------------------- Estúdio

function moodOf(p: Person): { bubble: Fig31['bubble']; chip: Chip31; say: L } {
  // selo curto (símbolo + número) em cima da cabeça; a frase inteira vai na dica
  if (p.stress >= 70) return { bubble: 'bolt', say: fmtL(l('Estresse {n}', 'Stress {n}'), { n: Math.round(p.stress) }), chip: { sym: '⚡', text: L1(String(Math.round(p.stress))), tone: 'soon' } };
  if (p.morale < 35) return { bubble: 'cloud', say: fmtL(l('Moral baixa {n}', 'Low morale {n}'), { n: Math.round(p.morale) }), chip: { sym: '☁', text: L1(String(Math.round(p.morale))), tone: 'soon' } };
  return { bubble: 'heart', say: fmtL(l('Moral {n}', 'Morale {n}'), { n: Math.round(p.morale) }), chip: { sym: '♥', text: L1(String(Math.round(p.morale))), tone: 'good' } };
}

/** Qualidade da gravação até agora: o melhor take de cada faixa já tentada (o que o próprio estúdio mostra). */
export function sessionQ31(s: GameState, ss: StudioSession): number | null {
  const qs: number[] = [];
  for (const id of ss.songIds) {
    const takes = ss.takes[id] ?? [];
    const song = s.songs[id] as unknown as { recorded?: boolean; q?: number } | undefined;
    if (song?.recorded && typeof song.q === 'number') qs.push(song.q);
    else if (takes.length) qs.push(Math.max(...takes.map((t) => t.quality)));
  }
  return qs.length ? Math.round(qs.reduce((a, b) => a + b, 0) / qs.length) : null;
}

function studioM(s: GameState): SalaM31 {
  const mine = new Set(live(s).map((a) => a.id));
  const sess = (s.sessions ?? []).filter((x) => !x.done && mine.has(x.actId));
  const cur = sess.find((x) => x.decision) ?? sess[0];
  const act = cur ? s.acts[cur.actId] : undefined;
  const caps = hqCaps(s);
  const art = artOf31('studio', s.year, s.player.hq ?? 0, { rented: !!cur && (cur.tier ?? 0) > 0, city: s.config.homeCity });
  const hots: Hot31[] = [];
  const deco: Deco31[] = [{ prop: 'foam', x: 0.03, w: 0.18 }, { prop: 'monitors', x: 0.3, w: 0.06 }];
  if (art.size !== 'small') deco.push({ prop: 'glass', x: 0.46, w: 0.02 });
  // fita: dias feitos / total
  hots.push({
    id: 'reel', kind: 'object', prop: 'reel', x: 0.03, w: 0.1,
    label: l('Fita de rolo', 'Tape machine'),
    tip: cur ? fmtL(l('Sessão de {a}: {d} de {n} dias gravados', '{a} session: {d} of {n} days recorded'), { a: act?.name ?? '?', d: cur.dayDone, n: cur.days }) : l('Nenhuma sessão rodando', 'No session running'),
    chip: cur ? { sym: '▶', text: L1(`${cur.dayDone}/${cur.days}`), tone: 'info', bar: Math.round((cur.dayDone / Math.max(1, cur.days)) * 100) } : { sym: '■', text: l('parada', 'idle'), tone: 'info' },
    do: { k: 'sessions' },
  });
  // mesa + medidor de qualidade
  const q = cur ? sessionQ31(s, cur) : null;
  const takeActs: Btn31[] = cur?.decision ? cur.decision.options.map((o) => ({ id: `take-${o}`, label: o === 'keep' ? l('Manter o melhor take', 'Keep the best take') : o === 'another' ? l('Mais um take (+1 dia, cansa)', 'One more take (+1 day, tiring)') : l('Montar dos melhores (comp)', 'Comp the best takes'), do: { k: 'take', session: cur.id, choice: o }, main: o === 'keep' })) : [];
  hots.push({
    id: 'desk', kind: 'object', prop: 'console', x: 0.15, w: 0.24,
    label: l('Mesa de som e medidor', 'Mixing desk and meter'),
    tip: cur?.decision ? l('Decisão do take esperando você', 'A take decision is waiting for you') : q !== null ? fmtL(l('Qualidade até agora: {q} de 100 (melhor take de cada faixa)', 'Quality so far: {q} of 100 (best take per track)'), { q }) : l('Sem takes ainda', 'No takes yet'),
    chip: cur?.decision ? { sym: '!', text: l('Decidir take', 'Decide take'), tone: 'normal' } : q !== null ? { sym: 'Q', text: L1(String(q)), tone: q >= 70 ? 'good' : q < 40 ? 'soon' : 'info', bar: q } : { sym: 'Q', text: L1('—'), tone: 'info' },
    do: { k: 'sessions' },
    acts: [...takeActs, { id: 'sessions', label: l('Ver todas as sessões', 'See all sessions'), do: { k: 'sessions' } }, { id: 'book', label: l('Marcar uma sessão', 'Book a session'), do: { k: 'go', area: 'studio', tab: ['creation-studio', 'session'] }, lock: sess.length >= caps.sessions ? fmtL(l('Todas as {n} vagas de sessão estão ocupadas', 'All {n} session slots are taken'), { n: caps.sessions }) : null }],
  });
  // luz de gravação
  const paused = !!act && !!act.hiatusUntil && act.hiatusUntil > s.week;
  const rec = !!cur && !paused && !cur.decision;
  hots.push({
    id: 'light', kind: 'object', prop: 'onair', x: 0.56, w: 0.07, pp: { on: rec },
    label: l('Luz de gravação', 'Recording light'),
    tip: rec ? l('Gravando agora', 'Recording now') : paused ? l('Sessão pausada: o artista está afastado', 'Session paused: the act is on leave') : cur?.decision ? l('Parado esperando a sua decisão', 'Stopped, waiting for your decision') : l('Ninguém gravando', 'Nobody recording'),
    chip: rec ? { sym: '●', text: l('gravando', 'recording'), tone: 'good' } : { sym: '○', text: paused ? l('pausa', 'paused') : l('apagada', 'off'), tone: 'info' },
    do: { k: 'sessions' },
  });
  // produtor
  const pr = cur?.producerId ? PRODUCERS.find((x) => x.id === cur.producerId) : undefined;
  const house = (s.player.staff ?? []).find((x) => x.role === 'producer');
  if (pr || house || cur) {
    const bonus = pr ? soundOf(pr).prod : house ? Math.round(staffSkill(s, 'producer') * 0.22) : 0;
    const who = !!(pr || house);
    hots.push({
      id: 'producer', kind: who ? 'person' : 'empty', x: 0.36, w: 0.06, prop: who ? undefined : 'chair',
      fig: who ? { seed: pr ? `prod:${pr.id}` : house!.id, pose: 'stand', dir: 'SE', role: 'producer' } : undefined,
      label: pr ? L1(pr.name) : house ? L1(house.name) : l('Sem produtor', 'No producer'),
      tip: pr ? fmtL(l('Produtor: {n} · som "{k}" · produção {b}', 'Producer: {n} · "{k}" sound · production {b}'), { n: pr.name, k: soundOf(pr).name, b: `${bonus >= 0 ? '+' : ''}${bonus}` })
        : house ? fmtL(l('Produtor da casa: {n} · produção +{b}', 'House producer: {n} · production +{b}'), { n: house.name, b: bonus }) : l('A sessão roda sem produtor', 'The session runs without a producer'),
      chip: pr || house ? { sym: '+', text: L1(`${bonus >= 0 ? '+' : ''}${bonus}`), tone: 'info' } : { sym: '—', text: l('sem', 'none'), tone: 'info' },
      do: pr ? { k: 'go', area: 'producers15' } : { k: 'go', area: 'team' },
      acts: [{ id: 'swap', label: l('Trocar de produtor (na próxima sessão)', 'Change producer (next session)'), do: { k: 'go', area: 'producers15' } }],
    });
  }
  // músicos
  const members = act ? act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive).slice(0, 4) : [];
  members.forEach((p, i) => {
    const m = moodOf(p);
    hots.push({
      id: `m:${p.id}`, kind: 'person', x: 0.6 + i * 0.075, w: 0.06, personId: p.id, actId: act!.id,
      fig: { personId: p.id, seed: p.id, pose: 'play', dir: i % 2 ? 'SW' : 'SE', role: p.role, bubble: m.bubble },
      label: L1(p.name), tip: fmtL(l('{n} ({a}) · {m}', '{n} ({a}) · {m}'), { n: p.name, a: act!.name, m: m.say }), chip: m.chip,
      do: { k: 'act', id: act!.id },
      acts: [{ id: 'sheet', label: l('Ficha da pessoa', 'Person sheet'), do: { k: 'person', id: p.id } }],
    });
  });
  if (!members.length) deco.push({ prop: 'drums', x: 0.74 }, { prop: 'amp', x: 0.62 }, { prop: 'mic', x: 0.68 });
  else deco.push({ prop: 'drums', x: 0.86 }, { prop: 'amp', x: 0.56 });
  // porta: agenda do estúdio
  const left = cur ? Math.ceil(Math.max(0, cur.days - cur.dayDone) / 7) : 0;
  const waiting = live(s).filter((a) => !sess.some((x) => x.actId === a.id) && a.songs.some((id) => { const so = s.songs[id] as unknown as { recorded?: boolean } | undefined; return !!so && !so.recorded; })).length;
  hots.push({
    id: 'door', kind: 'door', prop: 'door', x: 0.93, w: 0.06,
    label: l('Porta (agenda do estúdio)', 'Door (studio schedule)'),
    tip: fmtL(l('{b} de {c} sessões ocupadas · {w} artista(s) com música esperando gravação', '{b} of {c} sessions busy · {w} act(s) with songs waiting'), { b: sess.length, c: caps.sessions, w: waiting }),
    chip: cur ? { sym: '⏱', text: wk(left), tone: 'info' } : { sym: '✓', text: l('livre', 'free'), tone: 'good' },
    do: { k: 'sessions' },
  });
  const list: Row31[] = sess.map((x) => ({ id: x.id, t: L1(s.acts[x.actId]?.name ?? '?'), d: fmtL(l('{d}/{n} dias · {st}', '{d}/{n} days · {st}'), { d: x.dayDone, n: x.days, st: (x.tier ?? 0) > 0 ? STUDIO_TIERS[x.tier]?.name ?? '' : l('estúdio da sede', 'HQ studio') }), do: { k: 'sessions' } }));
  return {
    id: 'studio',
    title: art.rented ? fmtL(l('Estúdio alugado · {t}', 'Rented studio · {t}'), { t: STUDIO_TIERS[cur!.tier]?.name ?? '' }) : l('Estúdio', 'Studio'),
    sub: cur ? fmtL(l('{a} gravando · sessão {d} de {n}', '{a} recording · session {d} of {n}'), { a: act?.name ?? '?', d: cur.dayDone, n: cur.days }) : l('Estúdio livre', 'Studio free'),
    intro: l('A fita mostra os dias gravados, a mesa a qualidade, a luz se está gravando; os músicos mostram o humor; a porta é a agenda.', 'The tape shows the days recorded, the desk the quality, the light whether it is recording; the players show their mood; the door is the schedule.'),
    art, hots, deco, you: youIn(s, 'studio', 0.47), details: { k: 'go', area: 'studio' },
    alerts: cur?.decision ? [{ sym: '!', text: l('Um take espera a sua decisão', 'A take is waiting for your decision'), tone: 'normal' }] : [],
    list, listTitle: l('Sessões em andamento', 'Sessions in progress'),
  };
}

// ---------------------------------------------------------------- Elenco

type Where31 = 'rest' | 'rehearse' | 'pack' | 'stress' | 'tour' | 'studio' | 'hiatus';
function whereAct(s: GameState, a: Act): { w: Where31; at?: L } {
  const tour = (s.tours ?? []).find((x) => x.actId === a.id && x.status === 'running');
  if (tour) {
    const st = [...tour.stops].reverse().find((x) => x.status === 'played') ?? tour.stops.find((x) => x.status === 'scheduled');
    const c = st ? cityById[st.cityId]?.name : undefined;
    return { w: 'tour', at: c ? fmtL(l('em turnê em {c}', 'on tour in {c}'), { c }) : l('em turnê', 'on tour') };
  }
  if ((s.sessions ?? []).some((x) => !x.done && x.actId === a.id)) return { w: 'studio', at: l('no estúdio, gravando', 'in the studio, recording') };
  if (a.status === 'hiatus' || (a.hiatusUntil && a.hiatusUntil > s.week)) return { w: 'hiatus', at: l('afastado', 'on leave') };
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive);
  const stress = ms.length ? ms.reduce((t, p) => t + p.stress, 0) / ms.length : 0;
  if (stress >= 65) return { w: 'stress' };
  const planned = (s.tours ?? []).find((x) => x.actId === a.id && x.status === 'planned');
  if (planned && planned.stops.some((x) => x.status === 'scheduled' && x.day - s.day <= 14)) return { w: 'pack' };
  if ((s.tours ?? []).some((x) => x.actId === a.id && x.stops.some((st) => st.status === 'scheduled' && st.day >= s.day && st.day < s.day + 28))) return { w: 'rehearse' };
  return { w: 'rest' };
}
const yearsLeft = (s: GameState, a: Act): number | null => { const c = a.contractId ? s.contracts[a.contractId] : undefined; return c && c.party === 'player' ? Math.max(0, (c.endWeek - s.week) / 52) : null; };

function rosterM(s: GameState): SalaM31 {
  const acts = live(s);
  const caps = hqCaps(s);
  const art = artOf31('roster', s.year, s.player.hq ?? 0, { city: s.config.homeCity });
  const here = acts.map((a) => ({ a, ...whereAct(s, a) })).filter((x) => !x.at);
  const away = acts.map((a) => ({ a, ...whereAct(s, a) })).filter((x) => !!x.at);
  const hots: Hot31[] = [];
  const shown = here.slice(0, art.size === 'small' ? 4 : 5);
  const slots = shown.length + 1;
  shown.forEach((x, i) => {
    const pid = x.a.leaderId && x.a.members.includes(x.a.leaderId) ? x.a.leaderId : x.a.members[0];
    const yl = yearsLeft(s, x.a);
    const pose: Fig31['pose'] = x.w === 'rest' ? 'sit' : x.w === 'rehearse' ? 'play' : 'stand';
    const sym = x.w === 'rest' ? '☾' : x.w === 'rehearse' ? '♪' : x.w === 'pack' ? '✈' : '☁';
    const what: L = x.w === 'rest' ? l('descansando', 'resting') : x.w === 'rehearse' ? l('ensaiando para show', 'rehearsing for a show') : x.w === 'pack' ? l('arrumando a mala para a turnê', 'packing for the tour') : l('estressado', 'stressed');
    hots.push({
      id: `a:${x.a.id}`, kind: 'person', x: 0.06 + (i * 0.8) / slots, w: 0.12, actId: x.a.id, personId: pid,
      prop: x.w === 'rest' ? 'couch' : x.w === 'rehearse' ? 'guitarstand' : x.w === 'pack' ? 'suitcase' : undefined,
      fig: { personId: pid, seed: pid ?? x.a.id, pose, dir: i % 2 ? 'SW' : 'SE', bubble: x.w === 'stress' ? 'cloud' : undefined, lift: x.w === 'rest' ? -2 : 0 },
      label: L1(x.a.name),
      tip: fmtL(l('{a}: {w} · {c}', '{a}: {w} · {c}'), { a: x.a.name, w: what, c: yl === null ? l('sem contrato com você', 'no contract with you') : fmtL(l('{n} ano(s) de contrato', '{n} year(s) of contract'), { n: Math.round(yl * 10) / 10 }) }),
      chip: yl === null ? { sym, text: what, tone: x.w === 'stress' ? 'soon' : 'info' } : { sym, text: fmtL(l('{n}a', '{n}y'), { n: Math.max(0, Math.round(yl)) }), tone: x.w === 'stress' ? 'soon' : yl < 1 ? 'normal' : 'info' },
      do: { k: 'act', id: x.a.id },
      acts: x.w === 'stress' ? [{ id: 'talk', label: l('Conversar / dar férias', 'Talk / give a break'), do: { k: 'go', area: 'artists', tab: ['artists20', 'overview'] }, main: true }]
        : x.w === 'rehearse' || x.w === 'pack' ? [{ id: 'tour', label: l('Ver a turnê', 'See the tour'), do: { k: 'go', area: 'shows' } }] : [],
    });
  });
  const free = Math.max(0, caps.careers - acts.length);
  hots.push({
    id: 'vacancy', kind: 'empty', prop: free ? 'ghost' : undefined, x: 0.06 + (shown.length * 0.8) / slots, w: 0.1,
    label: free ? l('Vaga livre no elenco', 'Free roster slot') : l('Elenco cheio', 'Roster full'),
    tip: free ? fmtL(pl(free, l('{n} vaga livre: procurar talentos', '{n} free slot: look for talent'), l('{n} vagas livres: procurar talentos', '{n} free slots: look for talent')), { n: free }) : fmtL(l('Todas as {c} vagas ocupadas: amplie a sede para ter mais', 'All {c} slots taken: grow the HQ for more'), { c: caps.careers }),
    chip: free ? { sym: '+', text: fmtL(l('{n} vaga(s)', '{n} slot(s)'), { n: free }), tone: 'good' } : { sym: '■', text: l('cheio', 'full'), tone: 'info' },
    do: free ? { k: 'sala', id: 'talent' } : { k: 'go', area: 'hq' },
  });
  // quadro de fotos: quem está fora (não se mistura com quem está na sala)
  hots.push({
    id: 'board', kind: 'object', prop: 'cork', x: 0.84, w: 0.13, pp: { n: Math.min(6, away.length) },
    label: l('Quadro de fotos: quem está fora', 'Photo board: who is away'),
    tip: away.length ? fmtL(l('{n} fora: {l}', '{n} away: {l}'), { n: away.length, l: away.slice(0, 3).map((x) => x.a.name).join(', ') }) : l('Ninguém fora agora', 'Nobody away now'),
    chip: { sym: '✈', text: fmtL(l('{n} fora', '{n} away'), { n: away.length }), tone: 'info' },
    do: { k: 'go', area: 'artists' },
  });
  const deco: Deco31[] = [{ prop: 'poster', x: 0.04 }, { prop: 'poster', x: 0.3 }, { prop: 'gold', x: 0.44, pp: { n: Math.min(3, Math.max(1, s.player.stats.gold)) } }, { prop: 'window', x: 0.7, w: 0.12 }, { prop: 'player', x: 0.74 }, { prop: 'plant', x: 0.97 }];
  const row = (a: Act, at?: L): Row31 => { const yl = yearsLeft(s, a); return { id: a.id, t: L1(a.name), d: at ?? (yl === null ? l('na sede', 'at HQ') : fmtL(l('na sede · {n} ano(s) de contrato', 'at HQ · {n} year(s) of contract'), { n: Math.round(yl * 10) / 10 })), do: { k: 'act', id: a.id } }; };
  const stressed = here.filter((x) => x.w === 'stress').length;
  return {
    id: 'roster', title: fmtL(l('Elenco {n}/{c}', 'Roster {n}/{c}'), { n: acts.length, c: caps.careers }),
    sub: fmtL(l('{h} na sala · {a} fora', '{h} in the room · {a} away'), { h: here.length, a: away.length }),
    intro: l('Sofá = descansando, violão = ensaiando, mala = vai viajar, nuvem = estressado; o número em cima é o tempo de contrato. O quadro mostra quem está fora; a vaga leva a Talentos.', 'Sofa = resting, guitar = rehearsing, suitcase = about to travel, cloud = stressed; the number above is the contract time. The board shows who is away; the empty slot leads to Talent.'),
    art, hots, deco: [...deco], you: youIn(s, 'roster', 0.81), details: { k: 'go', area: 'artists' },
    alerts: stressed ? [{ sym: '☁', text: fmtL(pl(stressed, l('{n} artista estressado', '{n} stressed act'), l('{n} artistas estressados', '{n} stressed acts')), { n: stressed }), tone: 'soon' }] : [],
    list: here.map((x) => row(x.a)), listTitle: l('Na sala', 'In the room'),
    away: away.map((x) => row(x.a, x.at)),
  };
}

// ---------------------------------------------------------------- Equipe

/** Funções que sempre têm mesa (vazia = contratar), em ordem de prioridade. */
export const KEY_ROLES31 = ['anr', 'producer', 'publicist', 'admin'];

function teamM(s: GameState): SalaM31 {
  const caps = hqCaps(s);
  const art = artOf31('team', s.year, s.player.hq ?? 0, { city: s.config.homeCity });
  let loads: ReturnType<typeof roleLoads> = [];
  // a carga vem do motor (roleLoads); o contador do mês (cap14) zera na primeira leitura do mês — lê numa cópia rasa
  const xs = (s as unknown as { x4: Record<string, unknown> }).x4 ?? {};
  const ro = { ...s, x4: { ...xs, cap14: xs.cap14 ? { ...(xs.cap14 as object) } : undefined } } as unknown as GameState;
  try { loads = roleLoads(ro); } catch { loads = []; }
  const staff = s.player.staff ?? [];
  const byRole = new Map<string, typeof staff>();
  for (const m of staff) byRole.set(m.role, [...(byRole.get(m.role) ?? []), m]);
  const roles = [...new Set([...KEY_ROLES31, ...staff.map((m) => m.role)])];
  const roomFor = art.size === 'small' ? 4 : art.size === 'mid' ? 6 : 8;
  const shown = roles.filter((r) => byRole.has(r) || KEY_ROLES31.includes(r)).slice(0, roomFor);
  const hots: Hot31[] = [];
  const alerts: Chip31[] = [];
  const full = staff.length >= caps.staff;
  shown.forEach((r, i) => {
    const def = STAFF_ROLES.find((x) => x.id === r);
    const name = def?.name ?? L1(r);
    const ms = byRole.get(r) ?? [];
    const ld = loads.find((x) => x.role === r);
    const x = 0.04 + ((i % Math.ceil(shown.length / 2)) * 0.92) / Math.ceil(shown.length / 2);
    const floor = i < Math.ceil(shown.length / 2) ? 0 : 1;
    if (!ms.length) {
      hots.push({
        id: `vaga:${r}`, kind: 'empty', prop: 'vacancy', x, w: 0.18, pp: { n: floor },
        label: fmtL(l('Mesa vazia: {r}', 'Empty desk: {r}'), { r: name }), tip: def ? def.desc : name,
        chip: { sym: '+', text: name, tone: 'good' },
        do: { k: 'go', area: 'market', tab: ['marketHub', 'team'] },
        acts: [{ id: 'hire', label: fmtL(l('Contratar {r}', 'Hire {r}'), { r: name }), do: { k: 'go', area: 'market', tab: ['marketHub', 'team'] }, lock: full ? fmtL(l('Equipe no limite da sede ({n})', 'Team at the HQ limit ({n})'), { n: caps.staff }) : null, main: true }],
      });
      return;
    }
    const load = ld?.load ?? 0;
    const tone: Tone31 = load > 120 ? 'crit' : load > 100 || (ld?.strain ?? 0) > 0 ? 'soon' : 'info';
    if (tone === 'crit' || tone === 'soon') alerts.push({ sym: tone === 'crit' ? '‼' : '!', text: fmtL(l('{r} sobrecarregado: {p}%', '{r} overloaded: {p}%'), { r: name, p: load }), tone });
    const m0 = ms[0];
    hots.push({
      id: `role:${r}`, kind: 'person', prop: 'desk', x, w: 0.18, pp: { n: floor }, personId: undefined,
      fig: { seed: m0.id, pose: 'sit', dir: 'SW', role: r === 'producer' ? 'producer' : null },
      label: ms.length > 1 ? fmtL(l('{r} ({n} pessoas)', '{r} ({n} people)'), { r: name, n: ms.length }) : fmtL(l('{r}: {p}', '{r}: {p}'), { r: name, p: m0.name }),
      tip: ld ? fmtL(l('{r}: carga {p}% ({d} {u} para {n})', '{r}: load {p}% ({d} {u} for {n})'), { r: name, p: load, d: ld.demand, u: ld.unit, n: ms.length }) : fmtL(l('{r}: {p}', '{r}: {p}'), { r: name, p: ms.map((m) => m.name).join(', ') }),
      chip: { sym: load > 100 ? '!' : '▮', text: fmtL(l('{p}%', '{p}%'), { p: load }), tone, bar: Math.min(100, load) },
      do: { k: 'go', area: 'team' },
      acts: [{ id: 'team', label: l('Ficha e tarefas', 'Sheet and tasks'), do: { k: 'go', area: 'team' }, main: true }],
    });
  });
  // prancheta da diretriz e os andares de cima (visão agregada)
  hots.push({
    id: 'directive', kind: 'object', prop: 'clipboard', x: 0.3, w: 0.06, pp: { n: 0 },
    label: l('Prancheta: diretriz de delegação', 'Clipboard: delegation directive'),
    tip: l('Escopo e verba que a equipe decide sozinha', 'Scope and budget the team decides on its own'),
    chip: { sym: '✎', text: l('diretriz', 'directive'), tone: 'info' },
    do: { k: 'go', area: 'team' },
  });
  const missing = KEY_ROLES31.filter((r) => !byRole.has(r)).length;
  if (missing) alerts.push({ sym: '+', text: fmtL(pl(missing, l('{n} função-chave sem ninguém', '{n} key role with nobody'), l('{n} funções-chave sem ninguém', '{n} key roles with nobody')), { n: missing }), tone: 'normal' });
  if (art.upper > 0) hots.push({
    id: 'upper', kind: 'object', prop: 'window', x: 0.3, w: 0.4, pp: { n: art.upper },
    label: fmtL(l('+{n} andares: visão agregada', '+{n} floors: aggregate view'), { n: art.upper }),
    tip: l('Andares de cima: só as exceções (falta de gente, sobrecarga)', 'Upper floors: exceptions only (short-staffed, overloaded)'),
    chip: { sym: '▲', text: fmtL(l('+{n} andares', '+{n} floors'), { n: art.upper }), tone: alerts.length ? 'normal' : 'info' },
    do: { k: 'agg' },
  });
  const list: Row31[] = staff.map((m) => {
    const ld = loads.find((x) => x.role === m.role);
    return { id: m.id, t: L1(m.name), d: fmtL(l('{r} · carga {p}%', '{r} · load {p}%'), { r: STAFF_ROLES.find((x) => x.id === m.role)?.name ?? L1(m.role), p: ld?.load ?? 0 }), do: { k: 'go', area: 'team' } };
  });
  return {
    id: 'team', title: fmtL(l('Equipe {n}/{c} · {y}', 'Team {n}/{c} · {y}'), { n: staff.length, c: caps.staff, y: s.year }),
    sub: fmtL(l('{f} andar(es) na sede', '{f} floor(s) at HQ'), { f: art.floors }),
    intro: l('Uma mesa por função, com a barra de carga; mesa vazia = contratar. A prancheta é a diretriz; os andares de cima mostram só as exceções.', 'One desk per role, with its load bar; an empty desk = hire. The clipboard is the directive; the upper floors show only the exceptions.'),
    art, hots, deco: [{ prop: 'filing', x: 0.96 }, { prop: 'plant', x: 0.01 }, { prop: 'shelf', x: 0.86, w: 0.06 }], you: youIn(s, 'team', 0.5), details: { k: 'go', area: 'team' },
    alerts, list, listTitle: l('Toda a equipe', 'Whole team'),
  };
}

// ---------------------------------------------------------------- Catálogo (três armários, nada somado entre eles)

export interface Cat31 { masters: number; works: number; image: number; top?: string; glow: number[] }
export function catalogNums31(s: GameState): Cat31 {
  const rels = Object.values(s.releases).filter((r) => r.owner === 'player' && !s.acts[r.actId]?.playerBand);
  const rev = rels.map((r) => ({ id: r.id, v: annualRevenue(r) })).sort((a, b) => b.v - a.v);
  const max = rev[0]?.v ?? 0;
  const glow = rev.slice(0, 24).map((x) => (max > 0 ? Math.round((x.v / max) * 100) / 100 : 0));
  const vlist = x4<{ list?: { kind: string; owner?: string; cat?: unknown[] }[] }>(s, 'ventures9')?.list ?? [];
  const pubWorks = vlist.filter((v) => v.kind === 'publisher').reduce((t, v) => t + (v.cat?.length ?? 0), 0);
  let contractWorks = 0;
  for (const a of live(s)) {
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (!c || c.party !== 'player' || !(c.publishing || (c.rights?.pubShare ?? 0) > 0)) continue;
    contractWorks += a.songs.length;
  }
  const image = Object.values(s.imageRights ?? {}).filter((x) => x.holder === 'player').length;
  return { masters: rels.length, works: pubWorks + contractWorks, image, top: max > 0 ? rev[0].id : undefined, glow };
}

function catalogM(s: GameState): SalaM31 {
  const archive = hqRooms27(s).some((u) => u.id === 'archive' && u.status === 'open');
  const art = artOf31('catalog', s.year, s.player.hq ?? 0, { archive, city: s.config.homeCity });
  const n = catalogNums31(s);
  const topRel = n.top ? s.releases[n.top] : undefined;
  const hots: Hot31[] = [
    {
      id: 'masters', kind: 'object', prop: art.boxes ? 'boxes' : 'masters', x: 0.03, w: art.boxes ? 0.28 : 0.36, pp: { glow: n.glow, n: n.masters },
      label: l('Masters (fonogramas)', 'Masters (recordings)'), tip: l('Cada lombada é um master; brilha mais o que mais rendeu no último ano', 'Each spine is a master; the brighter, the more it earned last year'),
      chip: { sym: '◉', text: fmtL(pl(n.masters, l('{n} master', '{n} master'), l('{n} masters', '{n} masters')), { n: n.masters }), tone: 'info' },
      do: { k: 'go', area: 'catalog' },
    },
    {
      id: 'works', kind: 'object', prop: 'scores', x: art.boxes ? 0.35 : 0.42, w: 0.22, pp: { n: n.works },
      label: l('Editora (composições)', 'Publishing (compositions)'), tip: l('Obras com edição sua: direitos autorais, contados à parte dos masters', 'Works you publish: copyrights, counted apart from masters'),
      chip: { sym: '♪', text: fmtL(pl(n.works, l('{n} obra', '{n} work'), l('{n} obras', '{n} works')), { n: n.works }), tone: 'info' },
      do: { k: 'go', area: 'rights18' },
    },
    {
      id: 'image', kind: 'object', prop: 'portraits', x: art.boxes ? 0.62 : 0.68, w: 0.22, pp: { n: Math.min(6, Math.max(n.image, 3)) },
      label: l('Imagem (licenças de nome e fotos)', 'Image (name and photo licences)'), tip: l('Direitos de imagem que você detém, contados à parte', 'Image rights you hold, counted apart'),
      chip: { sym: '◧', text: fmtL(pl(n.image, l('{n} licença', '{n} licence'), l('{n} licenças', '{n} licences')), { n: n.image }), tone: 'info' },
      do: { k: 'go', area: 'rights18' },
    },
  ];
  if (topRel) hots.push({
    id: 'top', kind: 'object', x: art.boxes ? 0.05 : 0.06, w: 0.05,
    label: fmtL(l('Fita que mais brilha: {t}', 'Brightest tape: {t}'), { t: topRel.title }), tip: fmtL(l('{t} ({a}) é o master que mais rendeu no último ano', '{t} ({a}) is the master that earned the most last year'), { t: topRel.title, a: s.acts[topRel.actId]?.name ?? '' }),
    chip: { sym: '★', text: l('maior renda', 'top earner'), tone: 'good' },
    do: { k: 'release', id: topRel.id },
  });
  return {
    id: 'catalog', title: art.boxes ? l('Catálogo · caixas na garagem', 'Catalog · boxes in the garage') : l('Catálogo · arquivo', 'Catalog · archive'),
    sub: l('Três armários com bases diferentes: não se somam', 'Three cabinets with different bases: they do not add up'),
    intro: l('Masters, editora e imagem são direitos diferentes: cada armário tem o próprio número.', 'Masters, publishing and image are different rights: each cabinet has its own number.'),
    art, hots, deco: [{ prop: 'plant', x: 0.97 }], you: youIn(s, 'catalog', 0.92), details: { k: 'go', area: 'catalog' }, alerts: [], list: [],
  };
}

// ---------------------------------------------------------------- Talentos (o clube da cidade)

function talentM(s: GameState): SalaM31 {
  const art = artOf31('talent', s.year, s.player.hq ?? 0, { city: s.config.homeCity });
  const hots: Hot31[] = [];
  const ks = Object.values(s.knowledge ?? {}).filter((k) => { const a = s.acts[k.actId]; return !!a && a.owner !== 'player' && a.status !== 'retired' && a.status !== 'split'; })
    .sort((a, b) => b.updatedWeek - a.updatedWeek || (a.actId < b.actId ? -1 : 1));
  const band = ks[0] ? s.acts[ks[0].actId] : undefined;
  if (band) {
    const pot = uncText23(unc23(s, band.id, 'potential'));
    const col = column23(s, ks[0]);
    const ms = band.members.map((id) => s.persons[id]).filter((p): p is Person => !!p && p.alive).slice(0, 3);
    ms.forEach((p, i) => hots.push({
      id: `b:${p.id}`, kind: 'person', x: 0.6 + i * 0.09, w: 0.07, actId: band.id, personId: p.id,
      fig: { personId: p.id, seed: p.id, pose: 'play', dir: i % 2 ? 'SW' : 'SE', role: p.role, lift: 9 },
      label: fmtL(l('{a} no palco', '{a} on stage'), { a: band.name }),
      tip: fmtL(l('{a}: potencial {p} (o jogo não revela o real) · etapa: {c}', '{a}: potential {p} (the game never reveals the real one) · stage: {c}'), { a: band.name, p: pot, c: COLS23[col].name }),
      chip: i === 0 ? { sym: '★', text: L1(pot === '?' ? '??' : pot), tone: col === 'ready' ? 'good' : 'info' } : undefined,
      do: { k: 'act', id: band.id },
    }));
  }
  const scouts = s.scouts ?? [];
  const trips = (x4<{ trips?: { scoutId?: string; until: number; city?: string; fam: string; by: string }[] }>(s, 'scout23')?.trips ?? []).filter((x) => x.until >= s.week);
  const sc = scouts[0];
  const trip = sc ? trips.find((x) => x.scoutId === sc.id) : trips[0];
  hots.push({
    id: 'scout', kind: sc ? 'person' : 'empty', prop: sc ? undefined : 'chair', x: 0.2, w: 0.08,
    fig: sc ? { seed: sc.id, pose: 'stand', dir: 'SE' } : undefined,
    label: sc ? fmtL(l('Olheiro: {n}', 'Scout: {n}'), { n: sc.name }) : l('Balcão sem olheiro', 'No scout at the bar'),
    tip: trip ? fmtL(l('Missão: {c}, volta em {w}', 'Mission: {c}, back in {w}'), { c: trip.city ? cityById[trip.city]?.name ?? '?' : trip.fam, w: wk(Math.max(0, trip.until - s.week)) }) : sc ? l('Sem missão agora: mande a uma cena', 'No mission now: send to a scene') : l('Contrate um olheiro', 'Hire a scout'),
    chip: trip ? { sym: '⏱', text: wk(Math.max(0, trip.until - s.week)), tone: 'info' } : { sym: sc ? '?' : '+', text: sc ? l('livre', 'free') : l('contratar', 'hire'), tone: sc ? 'normal' : 'good' },
    do: { k: 'go', area: 'market', tab: ['marketHub', sc ? 'search' : 'team'] },
  });
  const demos = (s.demos ?? []).filter((d) => !d.heard && d.expires >= s.week).length;
  hots.push({
    id: 'demos', kind: 'object', prop: 'demos', x: 0.36, w: 0.07, pp: { n: Math.min(8, demos) },
    label: l('Pilha de demos', 'Demo pile'), tip: fmtL(pl(demos, l('{n} demo para ouvir', '{n} demo to hear'), l('{n} demos para ouvir', '{n} demos to hear')), { n: demos }),
    chip: { sym: '▤', text: L1(String(demos)), tone: demos ? 'normal' : 'info' },
    do: { k: 'go', area: 'market', tab: ['marketHub', 'funnel'] },
  });
  const watch = ks.filter((k) => { try { const c = column23(s, k); return c === 'observed' || c === 'followed'; } catch { return false; } }).length;
  hots.push({
    id: 'notebook', kind: 'object', prop: 'notebook', x: 0.45, w: 0.07,
    label: l('Caderno: lista de observação', 'Notebook: watch list'), tip: fmtL(l('{n} nome(s) em observação', '{n} name(s) being watched'), { n: watch }),
    chip: { sym: '✎', text: L1(String(watch)), tone: 'info' },
    do: { k: 'go', area: 'market', tab: ['marketHub', 'list'] },
  });
  hots.push({
    id: 'flyer', kind: 'object', prop: 'flyer', x: 0.3, w: 0.06,
    label: l('Cartaz: shows da cena na cidade', 'Flyer: scene shows in town'), tip: l('A cena musical da cidade e os próximos shows', 'The city\'s music scene and upcoming shows'),
    chip: { sym: '♫', text: l('cena', 'scene'), tone: 'info' },
    do: { k: 'go', area: 'scenes17' },
  });
  const city = cityById[s.config.homeCity]?.name;
  return {
    id: 'talent', title: city ? fmtL(l('Talentos · clube em {c}', 'Talent · club in {c}'), { c: city }) : l('Talentos · clube', 'Talent · club'),
    sub: band ? fmtL(l('No palco: {a}', 'On stage: {a}'), { a: band.name }) : l('Palco vazio hoje', 'Empty stage tonight'),
    intro: l('A banda no palco mostra só o que você sabe ("??" = ainda não sabe). O olheiro no balcão diz a missão; as demos e o caderno levam ao funil.', 'The band on stage shows only what you know ("??" = not yet). The scout at the bar shows the mission; the demos and the notebook lead to the funnel.'),
    art, hots, deco: [{ prop: 'bottles', x: 0.02, w: 0.26 }, { prop: 'counter', x: 0.01, w: 0.3 }, { prop: 'stage', x: 0.55, w: 0.44 }, { prop: 'crowd', x: 0.55, w: 0.42, pp: { n: band ? 10 : 0 } }],
    you: youIn(s, 'talent', 0.08), details: { k: 'go', area: 'market' }, alerts: [], list: [],
  };
}

// ---------------------------------------------------------------- Troféus e relíquias (pedestais por nível)

/** Posição dos 5 pedestais (a placa do nível em cima usa a mesma conta). */
export const TIER_X31 = (i: number): number => 0.19 + i * 0.16;
export const TIER_W31 = 0.13;
export const TIER31: L[] = TIER_NAME31;
/** Nível real da peça (1–5): sai do valor e da história (r31/relic31). */
export function relicTier31(s: GameState, rl: Relic): number { return relicTierOf31(s, rl); }

function trophyM(s: GameState): SalaM31 {
  const art = artOf31('trophy', s.year, s.player.hq ?? 0, { city: s.config.homeCity });
  const list = ((s.x4 as unknown as { relics9?: { list?: Relic[] } }).relics9?.list ?? []).filter((x) => x.st === 'player');
  const tierOf = new Map(list.map((x) => [x.id, relicTier31(s, x)]));
  const hots: Hot31[] = [];
  for (let lvl = 1; lvl <= 5; lvl++) {
    const at = list.filter((x) => tierOf.get(x.id) === lvl).sort((a, b) => b.v - a.v || (a.id < b.id ? -1 : 1));
    const best = at[0];
    hots.push({
      id: `tier:${lvl}`, kind: best ? 'object' : 'empty', prop: 'pedestal', x: TIER_X31(lvl - 1), w: TIER_W31,
      pp: { lvl, art: best?.k, seed: best?.id, name: best ? best.n.pt : '', year: best?.y },
      label: best ? fmtL(l('{t}: {n}', '{t}: {n}'), { t: TIER31[lvl - 1], n: best.n }) : fmtL(l('Pedestal {t} vazio', 'Empty {t} pedestal'), { t: TIER31[lvl - 1] }),
      tip: best ? fmtL(l('{n} · {k} peça(s) neste nível', '{n} · {k} piece(s) at this level'), { n: best.n, k: at.length }) : l('Nenhuma peça sua neste nível', 'None of your pieces at this level'),
      chip: { sym: '★'.repeat(lvl), text: best ? fmtL(l('{n}', '{n}'), { n: at.length }) : L1('0'), tone: best ? (lvl >= 4 ? 'good' : 'info') : 'info' },
      do: best ? { k: 'relic', id: best.id } : { k: 'go', area: 'lendas' },
      acts: best ? [{ id: 'open', label: l('Abrir ficha (emprestar, vender, presentear)', 'Open sheet (lend, sell, gift)'), do: { k: 'relic', id: best.id }, main: true }] : [],
    });
  }
  const won = (s.awards ?? []).filter((a) => a.byPlayer).length;
  const st = s.player.stats;
  hots.push({
    id: 'trophies', kind: 'object', prop: 'trophies', x: 0.01, w: 0.15, pp: { n: Math.min(6, won) },
    label: l('Estante de troféus', 'Trophy shelf'), tip: fmtL(l('{a} prêmio(s) · {g} ouro · {p} platina', '{a} award(s) · {g} gold · {p} platinum'), { a: won, g: st.gold, p: st.platinum }),
    chip: { sym: '🏆', text: L1(String(won)), tone: won ? 'good' : 'info' },
    do: { k: 'go', area: 'awards' },
  });
  return {
    id: 'trophy', title: l('Troféus e relíquias', 'Trophies and relics'),
    sub: fmtL(l('{n} peça(s) no acervo da empresa', '{n} piece(s) in the company collection'), { n: list.length }),
    intro: l('Cada pedestal é um nível (uma a cinco estrelas). Clique na peça para emprestar ao museu, vender ou presentear.', 'Each pedestal is a level (one to five stars). Click a piece to lend it to a museum, sell or gift it.'),
    art, hots, deco: [{ prop: 'tiers', x: 0.02, w: 0.96 }], you: youIn(s, 'trophy', 0.97), details: { k: 'go', area: 'lendas' }, alerts: [],
    list: list.slice(0, 30).map((x) => ({ id: x.id, t: x.n, d: fmtL(l('{t} · {y}', '{t} · {y}'), { t: TIER31[(tierOf.get(x.id) ?? 1) - 1], y: x.y }), do: { k: 'relic', id: x.id } })), listTitle: l('Acervo', 'Collection'),
  };
}

// ---------------------------------------------------------------- cena-assinatura das 12 carreiras

const vlist = (s: GameState): { kind: string; cat?: unknown[]; subs?: number; clients?: unknown[]; name?: string }[] => x4<{ list?: never[] }>(s, 'ventures9')?.list ?? [];
const nOf = (s: GameState, k: string): number => vlist(s).filter((v) => v.kind === k).length;

interface Sig31 { title?: L; props: { id: string; prop: Prop31; x: number; w: number; label: L; tip: L; chip: Chip31; do: Do31; pp?: Hot31['pp'] }[]; deco: Deco31[]; people?: { seed: string; x: number; pose: Fig31['pose']; lift?: number; personId?: string; actId?: string; label: L }[] }

function sigSpec(s: GameState, c: Career31): Sig31 {
  const area = careerDef(c)?.area ?? 'careers';
  const go = (a = area): Do31 => ({ k: 'go', area: a });
  const n = (v: number, one: L, many: L): Chip31 => ({ sym: '#', text: fmtL(pl(v, one, many), { n: v }), tone: 'info' });
  switch (c) {
    case 'label': {
      const pend = (s.pendingReleases ?? []).length;
      return { props: [
        { id: 'board', prop: 'whiteboard', x: 0.08, w: 0.34, label: l('Quadro branco: próximos lançamentos', 'Whiteboard: next releases'), tip: l('A agenda de lançamentos do selo', 'The label\'s release schedule'), chip: n(pend, l('{n} lançamento', '{n} release'), l('{n} lançamentos', '{n} releases')), do: go('releases'), pp: { n: Math.min(5, pend) } },
        { id: 'table', prop: 'desk', x: 0.48, w: 0.3, label: l('Mesa de reunião', 'Meeting table'), tip: l('Projetos em andamento', 'Projects in progress'), chip: { sym: '▶', text: l('projetos', 'projects'), tone: 'info' }, do: go('project') },
        { id: 'cal', prop: 'schedule', x: 0.84, w: 0.12, label: l('Calendário', 'Calendar'), tip: l('Prazos e datas marcadas', 'Deadlines and booked dates'), chip: { sym: '▦', text: l('agenda', 'calendar'), tone: 'info' }, do: go('calendar19') },
      ], deco: [{ prop: 'chair', x: 0.52 }, { prop: 'chair', x: 0.7 }, { prop: 'plant', x: 0.97 }] };
    }
    case 'musician': {
      const band = s.player.bandActId ? s.acts[s.player.bandActId] : undefined;
      const ppl = band ? band.members.slice(0, 3).map((id, i) => ({ seed: id, personId: id, actId: band.id, x: 0.3 + i * 0.12, pose: 'play' as const, label: L1(s.persons[id]?.name ?? '') })) : [];
      return { props: [
        { id: 'setlist', prop: 'cork', x: 0.06, w: 0.12, label: l('Setlist na parede', 'Setlist on the wall'), tip: band ? fmtL(l('{a}: ensaio {r}', '{a}: rehearsal {r}'), { a: band.name, r: Math.round(band.rehearsed) }) : l('Sem banda ainda', 'No band yet'), chip: { sym: '♪', text: band ? L1(String(Math.round(band.rehearsed))) : l('sem banda', 'no band'), tone: 'info' }, do: go('artists') },
        { id: 'mirror', prop: 'mirror', x: 0.8, w: 0.14, label: l('Camarim: espelho', 'Dressing room: mirror'), tip: l('Você: energia, agenda e imagem', 'You: energy, agenda and image'), chip: { sym: '☺', text: l('você', 'you'), tone: 'info' }, do: { k: 'you' } },
      ], deco: [{ prop: 'foam', x: 0.02, w: 0.7 }, { prop: 'drums', x: 0.62 }, { prop: 'amp', x: 0.24 }, { prop: 'couch', x: 0.82, w: 0.14 }], people: ppl };
    }
    case 'manager': {
      const mg = x4<{ mg?: { clients?: unknown[] } }>(s, 'ventures9')?.mg?.clients?.length ?? 0;
      return { props: [
        { id: 'clients', prop: 'clients', x: 0.06, w: 0.4, label: l('Quadro de clientes', 'Client board'), tip: l('Quem você representa e a confiança de cada um', 'Who you represent and their trust'), chip: n(mg, l('{n} cliente', '{n} client'), l('{n} clientes', '{n} clients')), do: go(), pp: { n: Math.min(6, mg) } },
        { id: 'phone', prop: 'phone', x: 0.62, w: 0.1, label: l('Telefone', 'Phone'), tip: l('Propostas e decisões', 'Offers and decisions'), chip: { sym: '☎', text: L1(String((s.decisions ?? []).length)), tone: (s.decisions ?? []).length ? 'normal' : 'info' }, do: { k: 'go', area: 'cockpit', tab: ['ck20', 'inbox'] } },
      ], deco: [{ prop: 'desk', x: 0.56, w: 0.3 }, { prop: 'window', x: 0.84, w: 0.12 }] };
    }
    case 'booking': {
      const tours = (s.tours ?? []).filter((x) => x.status === 'planned' || x.status === 'running').length;
      return { props: [
        { id: 'map', prop: 'routemap', x: 0.06, w: 0.5, label: l('Mapa de rotas', 'Route map'), tip: l('Turnês planejadas e em curso', 'Planned and running tours'), chip: n(tours, l('{n} turnê', '{n} tour'), l('{n} turnês', '{n} tours')), do: go(), pp: { n: Math.min(6, tours) } },
        { id: 'cal', prop: 'schedule', x: 0.66, w: 0.16, label: l('Calendário de datas', 'Date calendar'), tip: l('Datas confirmadas e propostas', 'Confirmed and proposed dates'), chip: { sym: '▦', text: l('datas', 'dates'), tone: 'info' }, do: go('calendar19') },
      ], deco: [{ prop: 'desk', x: 0.64, w: 0.26 }, { prop: 'phone', x: 0.7 }] };
    }
    case 'venue': {
      const lv = x4<{ venue?: unknown }>(s, 'live')?.venue ? 1 : 0;
      return { props: [
        { id: 'stage', prop: 'stage', x: 0.42, w: 0.54, label: l('Palco', 'Stage'), tip: l('A agenda da casa', 'The house calendar'), chip: n(lv, l('{n} casa', '{n} venue'), l('{n} casas', '{n} venues')), do: go() },
        { id: 'booth', prop: 'booth', x: 0.04, w: 0.18, label: l('Bilheteria', 'Box office'), tip: l('Ingressos e público', 'Tickets and crowd'), chip: { sym: '◎', text: l('ingressos', 'tickets'), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'drums', x: 0.66 }, { prop: 'amp', x: 0.5 }, { prop: 'mic', x: 0.58 }, { prop: 'crowd', x: 0.42, w: 0.54, pp: { n: 9 } }, { prop: 'bottles', x: 0.24, w: 0.14 }] };
    }
    case 'festival': {
      const f = nOf(s, 'festival');
      return { props: [
        { id: 'stages', prop: 'stage', x: 0.3, w: 0.5, label: l('Palco principal', 'Main stage'), tip: l('Line-up e edições', 'Line-up and editions'), chip: n(f, l('{n} festival', '{n} festival'), l('{n} festivais', '{n} festivals')), do: go() },
        { id: 'tents', prop: 'tents', x: 0.04, w: 0.22, label: l('Barracas e segurança', 'Tents and security'), tip: l('Terreno, alvará, clima', 'Grounds, permit, weather'), chip: { sym: '⛺', text: l('terreno', 'grounds'), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'crowd', x: 0.3, w: 0.66, pp: { n: 14 } }, { prop: 'amp', x: 0.36 }, { prop: 'drums', x: 0.56 }] };
    }
    case 'studio': {
      const st = nOf(s, 'studio');
      return { props: [
        { id: 'console', prop: 'console', x: 0.08, w: 0.34, label: l('Mesa da sala de controle', 'Control-room desk'), tip: l('Equipamento, som da casa, sessões vendidas', 'Gear, house sound, sessions sold'), chip: n(st, l('{n} estúdio', '{n} studio'), l('{n} estúdios', '{n} studios')), do: go() },
        { id: 'glass', prop: 'glass', x: 0.5, w: 0.03, label: l('Vidro da técnica', 'Control-room glass'), tip: l('A sala de gravação', 'The live room'), chip: { sym: '◫', text: l('sala', 'room'), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'reel', x: 0.03 }, { prop: 'monitors', x: 0.44 }, { prop: 'foam', x: 0.56, w: 0.4 }, { prop: 'drums', x: 0.8 }, { prop: 'mic', x: 0.66 }] };
    }
    case 'publisher': {
      const w = vlist(s).filter((v) => v.kind === 'publisher').reduce((t, v) => t + (v.cat?.length ?? 0), 0);
      return { props: [
        { id: 'scores', prop: 'scores', x: 0.06, w: 0.4, label: l('Arquivo de partituras', 'Sheet-music archive'), tip: l('Compositores e catálogo', 'Writers and catalog'), chip: n(w, l('{n} obra', '{n} work'), l('{n} obras', '{n} works')), do: go(), pp: { n: w } },
        { id: 'piano', prop: 'piano', x: 0.6, w: 0.16, label: l('Piano de prova', 'Demo piano'), tip: l('Pedidos de artistas e trilhas', 'Requests from acts and sync'), chip: { sym: '♪', text: l('pedidos', 'requests'), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'filing', x: 0.52 }, { prop: 'desk', x: 0.8, w: 0.16 }] };
    }
    case 'media': {
      const m = nOf(s, 'media');
      return { props: [
        { id: 'booth', prop: 'booth', x: 0.5, w: 0.36, label: l('Cabine no ar', 'On-air booth'), tip: l('O que toca e quem fala', 'What plays and who talks'), chip: n(m, l('{n} veículo', '{n} outlet'), l('{n} veículos', '{n} outlets')), do: go() },
        { id: 'grid', prop: 'schedule', x: 0.08, w: 0.26, label: l('Grade de programação', 'Programme grid'), tip: l('Horários e programas', 'Slots and shows'), chip: { sym: '▦', text: l('grade', 'grid'), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'onair', x: 0.68, pp: { on: m > 0 } }, { prop: 'records', x: 0.38, w: 0.1 }, { prop: 'mic', x: 0.66 }] };
    }
    case 'platform': {
      const subs = vlist(s).filter((v) => v.kind === 'platform').reduce((t, v) => t + (v.subs ?? 0), 0);
      return { props: [
        { id: 'servers', prop: 'servers', x: 0.04, w: 0.4, label: l('Servidores', 'Servers'), tip: l('Assinantes e repasse', 'Subscribers and payouts'), chip: { sym: '◈', text: fmtL(l('{n} assin.', '{n} subs'), { n: subs }), tone: 'info' }, do: go() },
        { id: 'playlists', prop: 'screen', x: 0.56, w: 0.36, label: l('Telão das playlists', 'Playlist wall'), tip: l('Curadoria e vagas pedidas pelas gravadoras', 'Curation and slots the labels ask for'), chip: { sym: '≡', text: l('playlists', 'playlists'), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'desk', x: 0.6, w: 0.3 }] };
    }
    case 'critic': {
      const pr = x4<{ cred?: number; revs?: unknown[] }>(s, 'press18');
      return { props: [
        { id: 'pile', prop: 'records', x: 0.5, w: 0.14, label: l('Pilha de discos para resenhar', 'Stack of records to review'), tip: l('Lançamentos esperando a sua nota', 'Releases waiting for your score'), chip: { sym: '◉', text: fmtL(l('{n} resenhas', '{n} reviews'), { n: pr?.revs?.length ?? 0 }), tone: 'info' }, do: go() },
        { id: 'desk', prop: 'typewriter', x: 0.1, w: 0.3, label: l('Mesa da redação', 'Newsroom desk'), tip: fmtL(l('Credibilidade {c}', 'Credibility {c}'), { c: Math.round(pr?.cred ?? 40) }), chip: { sym: '✎', text: L1(String(Math.round(pr?.cred ?? 40))), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'cork', x: 0.72, w: 0.14 }, { prop: 'filing', x: 0.92 }] };
    }
    case 'screen': {
      const sc = x4<{ list?: { st: string }[] }>(s, 'screen18')?.list ?? [];
      const work = sc.filter((x) => x.st === 'work' || x.st === 'late').length;
      return { props: [
        { id: 'screen', prop: 'screen', x: 0.3, w: 0.5, label: l('Tela de projeção', 'Projection screen'), tip: l('Encomendas de cinema, TV, musicais e jogos', 'Film, TV, musical and game commissions'), chip: n(work, l('{n} encomenda', '{n} commission'), l('{n} encomendas', '{n} commissions')), do: go() },
        { id: 'projector', prop: 'projector', x: 0.04, w: 0.14, label: l('Projetor', 'Projector'), tip: l('Prazos e entregas', 'Deadlines and deliveries'), chip: { sym: '▶', text: l('prazos', 'deadlines'), tone: 'info' }, do: go() },
      ], deco: [{ prop: 'piano', x: 0.84 }] };
    }
  }
}

function sigM(s: GameState, c: Career31): SalaM31 {
  const id = `sig:${c}` as SalaId31;
  const art = artOf31(id, s.year, s.player.hq ?? 0, { city: s.config.homeCity });
  const sp = sigSpec(s, c);
  const def = careerDef(c);
  const active = (x4<{ active?: string[] }>(s, 'careers12')?.active ?? []).includes(c);
  const hots: Hot31[] = sp.props.map((p) => ({ id: p.id, kind: 'object', prop: p.prop, x: p.x, w: p.w, pp: p.pp, label: p.label, tip: p.tip, chip: p.chip, do: p.do }));
  for (const p of sp.people ?? []) hots.push({ id: `p:${p.seed}`, kind: 'person', x: p.x, w: 0.07, personId: p.personId, actId: p.actId, fig: { personId: p.personId, seed: p.seed, pose: p.pose, dir: 'SE', lift: p.lift }, label: p.label, tip: p.label, do: p.actId ? { k: 'act', id: p.actId } : { k: 'you' } });
  const name = def?.name ?? L1(c);
  return {
    id, title: SALA_NAME31[id], sub: active ? fmtL(l('Carreira ativa: {c}', 'Active career: {c}'), { c: name }) : fmtL(l('{c} · carreira ainda não ativa', '{c} · career not active yet'), { c: name }),
    intro: fmtL(l('A cena da carreira {c}: cada objeto leva à tela dela.', 'The {c} career scene: each object leads to its screen.'), { c: name }),
    art, hots, deco: sp.deco, you: youIn(s, id, 0.95), details: { k: 'go', area: def?.area ?? 'careers' },
    alerts: active ? [] : [{ sym: 'i', text: l('Comece esta carreira em Carreiras para que os números andem', 'Start this career under Careers for the numbers to move'), tone: 'info' }], list: [],
  };
}

// ---------------------------------------------------------------- entrada

export function salaModel31(s: GameState, id: SalaId31): SalaM31 {
  switch (id) {
    case 'studio': return studioM(s);
    case 'roster': return rosterM(s);
    case 'team': return teamM(s);
    case 'catalog': return catalogM(s);
    case 'talent': return talentM(s);
    case 'trophy': return trophyM(s);
    default: return sigM(s, id.slice(4) as Career31);
  }
}

/** Carreiras ativas (para a faixa "Salas" da sede). */
export const activeCareers31 = (s: GameState): Career31[] => (x4<{ active?: string[] }>(s, 'careers12')?.active ?? ['label']).filter((c): c is Career31 => (CAREERS31 as string[]).includes(c));

/** Todo ponto clicável leva a algum lugar (o teste e o editor usam). */
export function auditSala31(m: SalaM31): string[] {
  const bad: string[] = [];
  if (!m.hots.length) bad.push(`${m.id}: sem pontos`);
  for (const h of m.hots) if (!h.do || !h.label?.pt || !h.tip?.pt) bad.push(`${m.id}/${h.id}`);
  return bad;
}
