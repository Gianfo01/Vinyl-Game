import { buildings18 } from '../../sim/sys/campus18';
// r25 (Pixel Studio, fase 3 "Sede viva") — o MODELO da tela inicial da Sede, função pura do estado (sem DOM):
// era e nível da sede (o desenho em pixel art fica em hqpx27.ts), as 6 salas com selos de estado, quem está em cada sala (elenco e equipe
// reais), "Precisa de você" (no máximo 3 tarefas, um botão cada), "Sua agenda" e o "Elenco". A interface
// (ui/ps/hq25.ts) só desenha; os testes (tests/r25-hq.test.ts) conferem a lógica aqui.

import { l, type L } from '../../data/world';
import { HQ_LEVELS } from '../../data/rules';
import { hqCaps } from '../../sim/branches';
import { calendar19 } from '../../sim/calendar19';
import { lastMonthView23 } from '../../sim/close23';
import type { Goto18 } from '../../sim/inbox18';
import { hqRooms27, type Unit27 } from '../../sim/sys/hqrooms27';
import { nextStep23, type Step23 } from '../../sim/sys/journey23';
import { unreadCount } from '../../sim/sys/people/inbox';
import { column23, scout23 } from '../../sim/sys/scout23';
import type { Act, GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';

export type Era25 = 'heritage' | 'garage' | 'modern';
export type Room25 = 'studio' | 'lounge' | 'office' | 'anr' | 'stage' | 'lobby';
export type Tone25 = 'good' | 'bad' | 'warn' | 'info' | 'idle';
/** Destino de navegação: o do inbox18 + aba do Mercado (olheiros). */
export type Goto25 = Goto18 & { market?: string };

export interface Badge25 { tone: Tone25; icon: string; text: L }
export interface Sprite25 { id: string; kind: 'artist' | 'staff' | 'scout'; name: string; room: Room25 | 'away'; personId?: string; actId?: string; role?: string; note: L }
export interface RoomM25 {
  id: Room25; name: L; desc: L; icon: string; go: Goto25;
  badges: Badge25[]; sprites: Sprite25[]; more: number;
  /** sala própria na sede atual (senão: aparece apagada, com a dica de ampliação) */
  open: boolean; lockNote?: L;
}
export interface Need25 { id: string; tone: Tone25; icon: string; title: L; why: L; cta: L; go: Goto25 }
export interface Agenda25 { id: string; weeks: number; kind: string; t: L; d?: L; tone?: 'bad' | 'good' | 'info'; go?: Goto25 }
export interface Cast25 { actId: string; name: string; personId?: string; where: Room25 | 'away'; status: L }
export interface HqModel25 {
  era: Era25; hq: number; hqName: L; year: number;
  /** r27: cidade-sede (horizonte), nome do selo (letreiro) e semente do desenho */
  city: string; brand: string; seedKey: string;
  /** r27: ano da fachada = construção/última reforma da sede (o mesmo que o mapa da cidade usa) */
  facadeYear?: number;
  rooms: RoomM25[]; away: Sprite25[]; needs: Need25[]; agenda: Agenda25[]; cast: Cast25[];
  /** r27 I1: salas e andares compráveis do nível atual (aberta, fechada ou em obra; custo, manutenção, efeito) */
  units: Unit27[];
}

/** Máximo de bonecos desenhados por sala (o resto vira "+N"). */
export const ROOM_CAP25 = 4;

/** Era visual (r25): ≤1959 Heritage, 1960–1989 Garagem, 1990+ Moderna. Sede "Garagem" (nível 0) a partir de 1960
 *  conta sempre como garagem. r27: o desenho fino por ano/nível está em hqpx27.ts (plan27). */
export function era25(year: number, hq = 2): Era25 {
  if (year < 1960) return 'heritage';
  if (year < 1990 || hq <= 0) return 'garage';
  return 'modern';
}

export const ROOMS25: Room25[] = ['studio', 'lounge', 'office', 'anr', 'stage', 'lobby'];
const META: Record<Room25, { name: L; desc: L; icon: string; go: Goto25; minHq: number }> = {
  studio: { name: l('Estúdio', 'Studio'), desc: l('Gravações e projetos', 'Recordings and projects'), icon: 'mic', go: { area: 'studio' }, minHq: 0 },
  lounge: { name: l('Lounge do elenco', 'Artist lounge'), desc: l('Artistas e relações', 'Artists and relations'), icon: 'guitar', go: { area: 'artists' }, minHq: 0 },
  office: { name: l('Escritório', 'Office'), desc: l('Caixa, equipe e gestão', 'Cash, staff and management'), icon: 'money', go: { area: 'finance' }, minHq: 0 },
  anr: { name: l('A&R e talentos', 'A&R and talent'), desc: l('Olheiros e funil de descobertas', 'Scouts and the discovery funnel'), icon: 'fans', go: { area: 'market', market: 'scouting' }, minHq: 2 },
  stage: { name: l('Ensaio e palco', 'Rehearsal and stage'), desc: l('Shows e turnês', 'Shows and tours'), icon: 'tour-bus', go: { area: 'shows' }, minHq: 1 },
  lobby: { name: l('Recepção', 'Reception'), desc: l('Caixa de entrada e decisões', 'Inbox and decisions'), icon: 'newspaper', go: { area: 'cockpit', tab: ['ck20', 'inbox'] }, minHq: 0 },
};

// Onde fica cada cargo da equipe.
const STAFF_ROOM: Record<string, Room25> = {
  producer: 'studio', engineer: 'studio',
  anr: 'anr',
  tour_manager: 'stage', booking: 'stage', booking_agent: 'stage', promoter: 'stage',
};

const live = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split');
const leadId = (a: Act): string | undefined => (a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0]);
const DAY_W = 7;
const pl = (n: number, one: L, many: L): L => (n === 1 ? one : many);

/** Fôlego do caixa em meses no ritmo do último mês fechado (null = caixa não está caindo). */
export function runway25(s: GameState): number | null {
  if (s.player.cash < 0) return 0;
  let delta = 0;
  try { delta = lastMonthView23(s).delta; } catch { delta = 0; }
  return delta < 0 ? s.player.cash / -delta : null;
}

/** O modelo inteiro da Sede. */
export function hqModel25(s: GameState): HqModel25 {
  const hq = Math.min(s.player.hq ?? 0, HQ_LEVELS.length - 1);
  const era = era25(s.year, hq);
  const acts = live(s);
  const mine = new Set(acts.map((a) => a.id));
  const sessions = (s.sessions ?? []).filter((x) => !x.done && mine.has(x.actId));
  const tours = (s.tours ?? []).filter((x) => mine.has(x.actId) && (x.status === 'running' || x.status === 'planned'));
  const running = tours.filter((x) => x.status === 'running');
  const soonShows = tours.flatMap((x) => x.stops.filter((st) => st.status === 'scheduled' && st.day >= s.day && st.day < s.day + 28).map((st) => ({ t: x, st })));

  // ---------------------------------------------------------------- quem está onde
  const sprites: Sprite25[] = [];
  const cast: Cast25[] = [];
  for (const a of acts) {
    const pid = leadId(a);
    const ses = sessions.find((x) => x.actId === a.id);
    const tour = running.find((x) => x.actId === a.id);
    const where: Room25 | 'away' = tour ? 'away' : ses ? 'studio' : soonShows.some((x) => x.t.actId === a.id) ? 'stage' : 'lounge';
    const status: L = tour ? fmtL(l('Em turnê: {t}', 'On tour: {t}'), { t: tour.name })
      : ses ? fmtL(l('Gravando: dia {d} de {n}', 'Recording: day {d} of {n}'), { d: ses.dayDone, n: ses.days })
      : where === 'stage' ? l('Ensaiando para o show', 'Rehearsing for the show')
      : a.status === 'hiatus' ? l('Em pausa', 'On hiatus') : l('No lounge, sem compromisso', 'In the lounge, free');
    cast.push({ actId: a.id, name: a.name, personId: pid, where, status });
    sprites.push({ id: `a:${a.id}`, kind: 'artist', name: a.name, room: where, personId: pid, actId: a.id, note: status });
  }
  const trips = scout23(s).trips.filter((x) => x.until >= s.week);
  const tripScouts = new Set(trips.map((x) => x.scoutId).filter(Boolean) as string[]);
  for (const m of s.player.staff ?? []) {
    const room = STAFF_ROOM[m.role] ?? 'office';
    sprites.push({ id: `st:${m.id}`, kind: 'staff', name: m.name, role: m.role, room, note: l('Equipe', 'Staff') });
  }
  for (const sc of s.scouts ?? []) {
    const away = !!sc.mission || tripScouts.has(sc.id);
    sprites.push({ id: `sc:${sc.id}`, kind: 'scout', name: sc.name, room: away ? 'away' : 'anr', note: away ? l('Olheiro em viagem', 'Scout travelling') : l('Olheiro', 'Scout') });
  }

  // ---------------------------------------------------------------- selos por sala
  const caps = hqCaps(s);
  const badges: Record<Room25, Badge25[]> = { studio: [], lounge: [], office: [], anr: [], stage: [], lobby: [] };
  let step: Step23 = 'artist';
  try { step = nextStep23(s); } catch { step = acts.length ? 'songs' : 'artist'; }
  // Estúdio
  for (const x of sessions.slice(0, 2)) badges.studio.push({ tone: 'good', icon: 'mic', text: fmtL(l('Gravando {a} · dia {d}/{n}', 'Recording {a} · day {d}/{n}'), { a: s.acts[x.actId]?.name ?? '?', d: x.dayDone, n: x.days }) });
  if (!sessions.length) badges.studio.push(step === 'record'
    ? { tone: 'warn', icon: 'note', text: l('Música escrita esperando gravação', 'Written songs waiting to be recorded') }
    : { tone: 'idle', icon: 'mic', text: fmtL(pl(caps.sessions, l('Livre · {n} sessão por vez', 'Free · {n} session at a time'), l('Livre · {n} sessões por vez', 'Free · {n} sessions at a time')), { n: caps.sessions }) });
  // Lounge
  const idle = cast.filter((c) => c.where === 'lounge').length;
  badges.lounge.push(acts.length
    ? { tone: idle ? 'info' : 'idle', icon: 'guitar', text: idle ? fmtL(pl(idle, l('{n} artista sem compromisso', '{n} act free'), l('{n} artistas sem compromisso', '{n} acts free')), { n: idle }) : l('Todo o elenco ocupado', 'Whole roster busy') }
    : { tone: 'warn', icon: 'fans', text: l('Elenco vazio: contrate o primeiro artista', 'Empty roster: sign your first act') });
  // Escritório
  const rw = runway25(s);
  if (s.player.cash < 0) badges.office.push({ tone: 'bad', icon: 'money', text: l('Caixa negativo', 'Cash below zero') });
  else if (rw !== null && rw < 8) badges.office.push({ tone: rw < 3 ? 'bad' : 'warn', icon: 'money', text: fmtL(l('Fôlego: ~{n} meses', 'Runway: ~{n} months'), { n: Math.max(0, Math.floor(rw)) }) });
  else badges.office.push({ tone: 'good', icon: 'money', text: l('Caixa sob controle', 'Cash under control') });
  badges.office.push({ tone: 'idle', icon: 'handshake', text: fmtL(l('Equipe {n}/{c}', 'Staff {n}/{c}'), { n: (s.player.staff ?? []).length, c: caps.staff }) });
  // A&R
  const ready = Object.values(s.knowledge ?? {}).filter((k) => { const a = s.acts[k.actId]; if (!a || a.owner === 'player') return false; try { return column23(s, k) === 'ready'; } catch { return false; } }).length;
  if (trips.length) badges.anr.push({ tone: 'info', icon: 'globe', text: fmtL(pl(trips.length, l('{n} olheiro em viagem', '{n} scout travelling'), l('{n} olheiros em viagem', '{n} scouts travelling')), { n: trips.length }) });
  if (ready) badges.anr.push({ tone: 'good', icon: 'contract', text: fmtL(pl(ready, l('{n} pronto para propor', '{n} ready for an offer'), l('{n} prontos para propor', '{n} ready for an offer')), { n: ready }) });
  if (!badges.anr.length) badges.anr.push({ tone: 'idle', icon: 'fans', text: (s.scouts ?? []).length ? l('Olheiros parados: mande a uma cena', 'Scouts idle: send one to a scene') : l('Sem olheiros: busque talentos', 'No scouts: look for talent') });
  // Palco
  for (const x of running.slice(0, 1)) badges.stage.push({ tone: 'good', icon: 'tour-bus', text: fmtL(l('Na estrada: {a}', 'On the road: {a}'), { a: s.acts[x.actId]?.name ?? '?' }) });
  if (soonShows.length) badges.stage.push({ tone: 'info', icon: 'calendar', text: fmtL(pl(soonShows.length, l('{n} show nas próximas 4 semanas', '{n} show in the next 4 weeks'), l('{n} shows nas próximas 4 semanas', '{n} shows in the next 4 weeks')), { n: soonShows.length }) });
  if (!badges.stage.length) badges.stage.push({ tone: 'idle', icon: 'tour-bus', text: acts.length ? l('Nenhum show marcado: planeje uma turnê', 'No shows booked: plan a tour') : l('Palco vazio até o primeiro artista', 'Empty stage until the first act') });
  // Recepção
  const decs = s.decisions ?? [];
  const urgent = decs.filter((d) => { const dl = Number(d.ctx?.dl18 ?? 0); return dl && dl - s.week <= 1; }).length;
  if (decs.length) badges.lobby.push({ tone: urgent ? 'bad' : 'warn', icon: 'contract', text: urgent ? fmtL(pl(urgent, l('{n} decisão vencendo', '{n} decision due'), l('{n} decisões vencendo', '{n} decisions due')), { n: urgent }) : fmtL(pl(decs.length, l('{n} decisão esperando', '{n} decision waiting'), l('{n} decisões esperando', '{n} decisions waiting')), { n: decs.length }) });
  const offers = (s.offers ?? []).filter((o) => o.status === 'counter').length;
  if (offers) badges.lobby.push({ tone: 'warn', icon: 'handshake', text: fmtL(pl(offers, l('{n} contraproposta', '{n} counter-offer'), l('{n} contrapropostas', '{n} counter-offers')), { n: offers }) });
  let unread = 0;
  try { unread = Math.max(0, unreadCount(s) - decs.length); } catch { unread = 0; }
  if (unread) badges.lobby.push({ tone: 'info', icon: 'newspaper', text: fmtL(pl(unread, l('{n} mensagem nova', '{n} new message'), l('{n} mensagens novas', '{n} new messages')), { n: unread }) });
  if (!badges.lobby.length) badges.lobby.push({ tone: 'good', icon: 'newspaper', text: l('Nada esperando resposta', 'Nothing awaiting a reply') });

  const rooms: RoomM25[] = ROOMS25.map((id) => {
    const m = META[id];
    const here = sprites.filter((x) => x.room === id);
    const open = hq >= m.minHq;
    return {
      id, name: m.name, desc: m.desc, icon: m.icon, go: m.go, badges: badges[id],
      sprites: here.slice(0, ROOM_CAP25), more: Math.max(0, here.length - ROOM_CAP25), open,
      lockNote: open ? undefined : fmtL(l('Sem sala própria: chega com {h}', 'No room of its own yet: comes with {h}'), { h: HQ_LEVELS[m.minHq].name }),
    };
  });

  return {
    era, hq, hqName: HQ_LEVELS[hq].name, year: s.year, city: s.config.homeCity ?? '', facadeYear: buildings18(s).find((b) => b.kind === 'hq')?.sy, brand: s.config.companyName || 'REC', seedKey: `${s.config.seed ?? ''}|${s.config.companyName ?? ''}`, rooms, away: sprites.filter((x) => x.room === 'away'), units: hqRooms27(s),
    needs: needs25(s, { step, acts, rw, ready, soon: soonShows.length + tours.length }), agenda: agenda25(s, sessions), cast,
  };
}

// ---------------------------------------------------------------- Precisa de você

const STEP_NEED: Record<Exclude<Step23, 'busy'>, { title: L; why: L; cta: L; icon: string; go: Goto25 }> = {
  artist: { title: l('Encontrar um artista', 'Find an artist'), why: l('Sem artista no elenco não há disco. Descubra talentos e faça uma oferta.', 'No act, no record. Discover talent and make an offer.'), cta: l('Procurar talentos', 'Look for talent'), icon: 'fans', go: { area: 'market', market: 'scouting' } },
  songs: { title: l('Arranjar repertório', 'Get songs'), why: l('O próximo disco precisa de músicas: compor, encomendar ou escolher um cover.', 'The next record needs songs: write, commission or pick a cover.'), cta: l('Abrir o projeto', 'Open the project'), icon: 'note', go: { area: 'project' } },
  record: { title: l('Preparar gravação', 'Prepare a recording'), why: l('Há música escrita esperando o estúdio.', 'Written songs are waiting for the studio.'), cta: l('Ir ao estúdio', 'Go to the studio'), icon: 'mic', go: { area: 'project' } },
  release: { title: l('Revisar capa, verba e data', 'Review cover, budget and date'), why: l('Tudo gravado: programe o lançamento.', 'Everything recorded: schedule the release.'), cta: l('Programar lançamento', 'Schedule the release'), icon: 'cd', go: { area: 'project' } },
  promo: { title: l('Acompanhar a divulgação', 'Follow the promotion'), why: l('Lançamento marcado: shows e entrevistas na semana somam.', 'Release booked: shows and interviews that week add up.'), cta: l('Ver lançamentos', 'See releases'), icon: 'radio', go: { area: 'releases' } },
  debrief: { title: l('Ler o balanço', 'Read the debrief'), why: l('O disco saiu: veja o que funcionou e escolha a próxima aposta.', 'The record is out: see what worked and pick the next bet.'), cta: l('Ver balanço', 'See the debrief'), icon: 'chart-up', go: { area: 'project' } },
};

function needs25(s: GameState, o: { step: Step23; acts: Act[]; rw: number | null; ready: number; soon: number }): Need25[] {
  const out: (Need25 & { p: number })[] = [];
  const decs = [...(s.decisions ?? [])].map((d) => ({ d, left: Number(d.ctx?.dl18 ?? 0) ? Math.max(0, Number(d.ctx.dl18) - s.week) : null }))
    .sort((a, b) => (a.left ?? 99) - (b.left ?? 99));
  const inbox: Goto25 = { area: 'cockpit', tab: ['ck20', 'inbox'] };
  decs.slice(0, 2).forEach(({ d, left }, i) => out.push({
    id: `dec:${d.id}`, p: left !== null && left <= 1 ? 100 : 70 - i, tone: left !== null && left <= 1 ? 'bad' : 'warn', icon: 'contract', title: d.title,
    why: left === null ? l('Se ignorar, vale a opção padrão ao avançar.', 'If ignored, the default option applies when you advance.')
      : left <= 0 ? l('Vence agora: decida antes de avançar.', 'Due now: decide before advancing.') : fmtL(pl(left, l('Vence em {n} semana.', 'Due in {n} week.'), l('Vence em {n} semanas.', 'Due in {n} weeks.')), { n: left }),
    cta: l('Decidir', 'Decide'), go: inbox,
  }));
  if (decs.length > 2) out.push({ id: 'dec:more', p: 40, tone: 'info', icon: 'newspaper', title: fmtL(l('Mais {n} decisões na recepção', '{n} more decisions at reception'), { n: decs.length - 2 }), why: l('Ignoradas aplicam a opção padrão.', 'Ignored ones apply the default option.'), cta: l('Abrir a caixa', 'Open the inbox'), go: inbox });
  if (s.player.cash < 0 || (o.rw !== null && o.rw < 3)) out.push({ id: 'cash', p: 90, tone: 'bad', icon: 'money', title: l('Caixa no limite', 'Cash at the limit'), why: s.player.cash < 0 ? l('O caixa está negativo: corte custos ou busque receita.', 'Cash is negative: cut costs or find revenue.') : fmtL(l('~{n} meses de fôlego no ritmo atual.', '~{n} months of runway at the current pace.'), { n: Math.floor(o.rw ?? 0) }), cta: l('Ver finanças', 'See finances'), go: { area: 'finance' } });
  if (o.step !== 'busy') { const n = STEP_NEED[o.step]; out.push({ id: `step:${o.step}`, p: o.step === 'artist' ? 95 : 60, tone: 'info', icon: n.icon, title: n.title, why: n.why, cta: n.cta, go: n.go }); }
  if (o.ready) out.push({ id: 'anr', p: 50, tone: 'good', icon: 'contract', title: l('Talento pronto para proposta', 'Talent ready for an offer'), why: fmtL(pl(o.ready, l('{n} artista no fim do funil de A&R.', '{n} act at the end of the A&R funnel.'), l('{n} artistas no fim do funil de A&R.', '{n} acts at the end of the A&R funnel.')), { n: o.ready }), cta: l('Ver o funil', 'See the funnel'), go: { area: 'market', market: 'scouting' } });
  if (o.acts.length && !o.soon) out.push({ id: 'stage', p: 30, tone: 'info', icon: 'tour-bus', title: l('Próximo palco', 'Next stage'), why: l('Nenhum show marcado: planeje shows e turnês do elenco.', 'No shows booked: plan shows and tours for the roster.'), cta: l('Ver ao vivo', 'See live'), go: { area: 'shows' } });
  return out.sort((a, b) => b.p - a.p).slice(0, 3).map(({ p: _p, ...n }) => n);
}

// ---------------------------------------------------------------- Sua agenda

function agenda25(s: GameState, sessions: GameState['sessions']): Agenda25[] {
  const out: Agenda25[] = [];
  for (const x of sessions) {
    const left = Math.max(0, x.days - x.dayDone);
    out.push({ id: `ses:${x.id}`, weeks: Math.floor(left / DAY_W), kind: 'studio', t: fmtL(l('Estúdio: {a}', 'Studio: {a}'), { a: s.acts[x.actId]?.name ?? '?' }), d: fmtL(pl(left, l('Falta {n} dia de gravação', '{n} recording day left'), l('Faltam {n} dias de gravação', '{n} recording days left')), { n: left }), tone: 'good', go: { area: 'studio' } });
  }
  let cal: ReturnType<typeof calendar19> = [];
  try { cal = calendar19(s, { weeks: 8 }); } catch { cal = []; }
  for (const d of cal) {
    if (d.kind === 'msg' || d.w0 !== undefined) continue;
    out.push({ id: `c:${d.id}`, weeks: Math.max(0, d.w - s.week), kind: d.kind, t: d.t, d: d.d, tone: d.tone, go: d.goto });
  }
  return out.sort((a, b) => a.weeks - b.weeks).slice(0, 6);
}
