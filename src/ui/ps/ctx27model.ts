// Rodada 27 (CTX) — modelo puro do menu de contexto das entidades (clique direito / toque longo / Shift+F10 num nome).
// Para cada tipo de entidade (ent27.ts) devolve a lista de ações QUE EXISTEM no jogo, com o motivo quando não dá agora
// (sem caixa, fora da época, não é seu…). Nada aqui executa ou muda o estado: a interface (ctx27.ts) liga cada id ao
// mesmo fluxo da tela de sempre (caminho único, docs/act27.md) — "Fazer proposta" abre a mesa de negociação, "Almoço"
// abre a conversa de favor, "Gravar" abre o preparo da sessão do estúdio etc.

import { cityById, l, type L } from '../../data/world';
import { hqCaps } from '../../sim/branches';
import { cashWhy20, freeCash20 } from '../../sim/oblig20';
import { scoutEligible20 } from '../../sim/scout20';
import { giveBlock27 } from '../../sim/sys/favors27';
import { LUNCH_COST } from '../../sim/sys/managers14';
import { GIFT_COST, per13 } from '../../sim/sys/persona13';
import { DINNER_COST } from '../../sim/sys/producers15';
import { TEMPER27, rivalMemory27 } from '../../sim/sys/rivals27';
import { isWatched } from '../../sim/sys/scout11';
import { nextStep23 } from '../../sim/sys/scout23';
import { VENUES17, venueOpen } from '../../sim/sys/venues17';
import type { Act, GameState } from '../../sim/types';
import { fmtL, money, playerActs } from '../../sim/util';
import { actionRow20 } from '../actions20';
import { personKey27, type Ent27 } from './ent27';

export type Grp27 = 'open' | 'do' | 'info';
export interface CtxItem27 {
  /** id da ação (a interface liga ao fluxo de sempre) */
  id: string;
  label: L;
  icon?: string;
  grp: Grp27;
  /** null = pode; L = por que não agora (o item aparece desabilitado com o motivo) */
  block: L | null;
  /** detalhe curto (custo, prazo, estado) */
  note?: L | null;
  /** custo em centavos (mostrado à direita) */
  cost?: number;
}
export interface CtxMenu27 { ent: Ent27; id: string; name: string | L; kind: L; items: CtxItem27[] }

/** O que existe nesta sessão do navegador (áudio, áreas registradas, mercado de músicas…). */
export interface CtxEnv27 { has?: (feature: string) => boolean }

export const KIND27: Record<Ent27, L> = {
  act: l('artista', 'artist'), person: l('pessoa', 'person'), label: l('gravadora', 'label'), city: l('cidade', 'city'),
  song: l('música', 'song'), release: l('lançamento', 'release'), venue: l('casa de shows', 'venue'), festival: l('festival', 'festival'),
  place: l('lugar', 'place'), org: l('organização', 'organization'),
};

const N = (pt: string, en: string): L => l(pt, en);
const it = (id: string, label: L, icon: string, grp: Grp27, block: L | null = null, extra: Partial<CtxItem27> = {}): CtxItem27 => ({ id, label, icon, grp, block, ...extra });
const COPY = (): CtxItem27 => it('copy', N('Copiar nome', 'Copy name'), 'note', 'info');

const NOT_YOURS = N('Só para o seu elenco.', 'Only for your roster.');
const NO_ACTS = N('Você ainda não tem artistas para escalar.', 'You have no acts to book yet.');
const ARTIST_ROLE = N('Jogando como artista, quem assina e manda olheiro é um selo.', 'Playing as an artist, signing and scouting are a label\'s job.');

/** Motivo de não poder propor contrato a um ato que não é seu (mesmas regras da ficha, do funil e do mercado). */
export function offerBlock27(s: GameState, a: Act): L | null {
  if (s.config.role === 'artist') return ARTIST_ROLE;
  if (a.status === 'retired' || a.status === 'split') return N('O artista encerrou a carreira.', 'The act has ended its career.');
  if (a.owner && a.owner !== 'player') return fmtL(N('Tem contrato com {l}.', 'Signed to {l}.'), { l: s.labels[a.owner]?.name ?? a.owner });
  if (s.offers.some((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'))) return N('Já há uma proposta em andamento: veja na Caixa/Mercado.', 'An offer is already in progress: see Inbox/Market.');
  const el = scoutEligible20(s, a);
  if (!el.ok) return el.why ?? N('Não contratável agora.', 'Not signable right now.');
  return null;
}

const inCharts = (s: GameState, pred: (relId: string) => boolean): boolean =>
  [...(s.charts?.singles ?? []), ...(s.charts?.albums ?? [])].some((e) => pred(e.releaseId));
const noCharts = (s: GameState): boolean => (s.charts?.singles?.length ?? 0) + (s.charts?.albums?.length ?? 0) === 0;
const chartBlock = (s: GameState, hit: boolean): L | null =>
  noCharts(s) ? N('Ainda não há paradas nesta época.', 'There are no charts in this era yet.') : hit ? null : N('Fora das paradas agora.', 'Not on the charts right now.');

const rowBlock = (s: GameState, actionId: string, actId: string): L | null => {
  try { const r = actionRow20(s, actionId, { act: actId }); return r ? r.block : N('Indisponível para este artista.', 'Unavailable for this act.'); } catch { return null; }
};

// ================================================================ por tipo

function actMenu(s: GameState, id: string, env: CtxEnv27): CtxMenu27 | null {
  const a = s.acts[id];
  if (!a) return null;
  const mine = playerActs(s).includes(id);
  const out: CtxItem27[] = [it('act.open', N('Abrir ficha', 'Open page'), 'eye', 'open')];
  if (mine) {
    out.push(it('act.agenda', N('Agenda do mês', 'This month\'s agenda'), 'calendar', 'do', rowBlock(s, 'agenda.edit', id)));
    out.push(it('act.compose', N('Compor (espaço "Compor" na agenda)', 'Write songs ("Write" slot in the agenda)'), 'pen', 'do', rowBlock(s, 'agenda.edit', id)));
    out.push(it('act.record', N('Gravar (preparar a sessão)', 'Record (prepare the session)'), 'mic', 'do', rowBlock(s, 'record.prepare', id)));
    const ready = Object.values(s.songs).some((so) => so.actId === id && so.recorded && !so.releaseId && !so.vault);
    out.push(it('act.release', N('Lançar (programar lançamento)', 'Release (schedule a release)'), 'cd', 'do',
      ready ? null : N('Nada gravado esperando lançamento: grave antes.', 'Nothing recorded awaiting release: record first.')));
    out.push(it('act.tour', N('Shows e turnês', 'Gigs and tours'), 'tour-bus', 'do', rowBlock(s, 'shows.view', id)));
    out.push(it('act.more', N('Todas as ações do artista…', 'All act actions…'), 'people', 'do'));
  } else {
    out.push(it('act.offer', N('Fazer proposta / negociar', 'Make an offer / negotiate'), 'handshake', 'do', offerBlock27(s, a)));
    if (s.config.role !== 'artist') {
      const w = isWatched(s, id);
      out.push(it('act.watch', w ? N('Parar de observar', 'Stop watching') : N('Observar (alertas mensais)', 'Watch (monthly alerts)'), 'star', 'do'));
      const k = s.knowledge[id];
      if (k && !a.owner) {
        const st = nextStep23(s, id);
        if (st) out.push(it('act.scout', fmtL(N('Olheiro: {s}', 'Scout: {s}'), { s: st.label }), 'eye', 'do', st.ok ? null : st.why ?? N('Indisponível agora.', 'Unavailable now.'), { cost: st.cost }));
      }
    }
  }
  const pool = mine || !!s.knowledge[id] || a.owner === 'player';
  out.push(it('act.compare', N('Comparar com outros', 'Compare with others'), 'network', 'info', pool ? null : N('Você ainda não conhece este artista (observe ou mande olheiro).', 'You don\'t know this act yet (watch or scout them).')));
  out.push(it('act.charts', N('Ver nas paradas', 'See on the charts'), 'chart-up', 'info', chartBlock(s, inCharts(s, (r) => s.releases[r]?.actId === id))));
  out.push(it('act.known', N('Notícias e boatos (O que sabemos)', 'News and rumors (What we know)'), 'newspaper', 'info'));
  out.push(COPY());
  void env;
  return { ent: 'act', id, name: a.name, kind: KIND27.act, items: out };
}

function personMenu(s: GameState, raw: string): CtxMenu27 | null {
  const key = personKey27(raw);
  const pid = key.startsWith('p:') ? key.slice(2) : '';
  const person = pid ? s.persons[pid] : undefined;
  const sid = key.startsWith('s:') ? key.slice(2) : '';
  const pro = sid ? s.professionals?.find((x) => x.id === sid) : undefined;
  let P: ReturnType<typeof per13> = null;
  try { P = pro ? null : per13(s, key); } catch { P = null; }
  const name = person?.name ?? P?.name ?? pro?.name;
  if (!name) return null;
  const me = key === 'player' || !!person?.isPlayer;
  const out: CtxItem27[] = [];
  if (!pro || P) out.push(it('person.open', N('Abrir ficha', 'Open page'), 'eye', 'open'));
  if (pro) {
    const signOn = Math.round(pro.salary * 0.5);
    const cap = hqCaps(s).staff;
    const block = s.config.role === 'artist' ? N('Equipe é contratada pelo selo.', 'Staff are hired by the label.')
      : s.player.staff.length >= cap ? N('Sede sem vagas para equipe. Amplie a sede.', 'No staff room in the HQ. Upgrade it.')
        : freeCash20(s) < signOn ? cashWhy20(s, signOn, N('Caixa insuficiente.', 'Not enough cash.')) : null;
    out.push(it('person.hire', N('Contratar para a equipe', 'Hire for the staff'), 'contract', 'do', block, { cost: signOn, note: N('Assinatura: metade do salário mensal.', 'Sign-on: half the monthly salary.') }));
  }
  if (!me && P) {
    if (key.startsWith('e:')) out.push(it('person.lunch', N('Almoço de negócios', 'Business lunch'), 'handshake', 'do', giveBlock27(s, key, 'lunch'), { cost: money(s, LUNCH_COST) }));
    if (key.startsWith('pd:')) out.push(it('person.dinner', N('Jantar no estúdio', 'Dinner at the studio'), 'cd', 'do', giveBlock27(s, key, 'dinner'), { cost: money(s, DINNER_COST) }));
    out.push(it('person.gift', N('Mandar presente', 'Send a gift'), 'heart', 'do', giveBlock27(s, key, 'gift'), { cost: money(s, GIFT_COST) }));
  }
  if (!pro || P) out.push(it('person.rel', N('Relações', 'Relationships'), 'network', 'info'));
  if (person && !me) out.push(it('person.known', N('O que sabemos', 'What we know'), 'newspaper', 'info'));
  out.push(COPY());
  return { ent: 'person', id: key, name, kind: KIND27.person, items: out };
}

function labelMenu(s: GameState, id: string): CtxMenu27 | null {
  const lb = s.labels[id];
  if (!lb) return null;
  const m = (() => { try { return rivalMemory27(s, id); } catch { return null; } })();
  const out: CtxItem27[] = [
    it('label.open', N('Abrir dossiê', 'Open dossier'), 'eye', 'open'),
    it('label.rival', N('Rivalidade e memória (relação com você)', 'Rivalry and memory (relationship with you)'), 'flag', 'info', null,
      { note: m ? fmtL(N('{t} · mágoa {g}/100', '{t} · grudge {g}/100'), { t: TEMPER27[m.temper][0], g: m.g }) : null }),
    it('label.roster', fmtL(N('Elenco ({n})', 'Roster ({n})'), { n: lb.roster.length }), 'fans', 'info', lb.roster.length ? null : N('Sem artistas no elenco.', 'No acts on the roster.')),
    it('label.money', N('Finanças e ações (participação, compra)', 'Finances and stock (stake, buyout)'), 'money', 'do', s.config.role === 'artist' ? N('Só um selo negocia participação.', 'Only a label can deal in stakes.') : null),
    COPY(),
  ];
  return { ent: 'label', id, name: lb.name, kind: KIND27.label, items: out };
}

function cityMenu(s: GameState, id: string, env: CtxEnv27): CtxMenu27 | null {
  const c = cityById[id];
  if (!c) return null;
  const home = s.config.homeCity === id;
  const out: CtxItem27[] = [
    it('city.open', N('Abrir ficha da cidade (no mapa)', 'Open city sheet (on the map)'), 'map', 'open'),
    it('city.scene', N('Cena local, casas e imprensa', 'Local scene, venues and press'), 'fire', 'info'),
  ];
  if (home && (env.has?.('area:campus18') ?? true)) out.push(it('city.home', N('Abrir "Nosso mundo" (sua cidade)', 'Open "Our world" (your city)'), 'house', 'open'));
  out.push(it('city.show', N('Marcar show / turnê aqui', 'Book a gig / tour here'), 'tour-bus', 'do', playerActs(s).length ? null : NO_ACTS));
  out.push(it('city.scout', N('Mandar olheiro a esta cena', 'Send a scout to this scene'), 'eye', 'do', s.config.role === 'artist' ? ARTIST_ROLE : null));
  out.push(COPY());
  return { ent: 'city', id, name: c.name, kind: KIND27.city, items: out };
}

function releaseMenu(s: GameState, id: string, env: CtxEnv27): CtxMenu27 | null {
  const r = s.releases[id];
  if (!r) return null;
  const mine = r.owner === 'player' || playerActs(s).includes(r.actId);
  const song = r.songs.find((x) => s.songs[x]);
  const out: CtxItem27[] = [
    it('release.open', N('Abrir ficha (faixas e créditos)', 'Open page (tracks and credits)'), 'eye', 'open'),
    it('release.act', N('Ver o artista', 'See the artist'), 'guitar', 'open', s.acts[r.actId] ? null : N('Artista desconhecido.', 'Unknown act.')),
    it('release.listen', N('Ouvir prévia', 'Play preview'), 'note', 'do', listenBlock(env, !!song)),
    it('release.charts', N('Ver nas paradas', 'See on the charts'), 'chart-up', 'info', chartBlock(s, inCharts(s, (x) => x === id))),
  ];
  if (mine) out.push(it('release.campaign', N('Lançamentos e campanha', 'Releases and campaign'), 'megaphone', 'do'));
  out.push(COPY());
  return { ent: 'release', id, name: r.title, kind: KIND27.release, items: out };
}

const listenBlock = (env: CtxEnv27, has: boolean): L | null =>
  !has ? N('Sem gravação guardada.', 'No stored recording.') : env.has?.('audio') === false ? N('Áudio indisponível neste navegador.', 'Audio unavailable in this browser.')
    : env.has?.('sound28') === false ? N('Som desligado: ligue em Opções › Som.', 'Sound is off: turn it on in Options › Sound.') : null; // r28 (F4): opt-in

function songMenu(s: GameState, id: string, env: CtxEnv27): CtxMenu27 | null {
  const so = s.songs[id];
  if (!so) return null;
  const mine = playerActs(s).includes(so.actId);
  const rel = so.releaseId && s.releases[so.releaseId] ? so.releaseId : '';
  const out: CtxItem27[] = [
    it('song.open', rel ? N('Abrir o lançamento', 'Open the release') : N('Abrir repertório', 'Open repertoire'), 'eye', 'open', rel || mine ? null : N('Ainda não lançada.', 'Not released yet.')),
    it('song.listen', N('Ouvir prévia', 'Play preview'), 'note', 'do', listenBlock(env, true)),
    it('song.credits', N('Ver créditos (autores e produção)', 'See credits (writers and production)'), 'book', 'info', rel || mine ? null : N('Sem ficha técnica pública.', 'No public credits.')),
  ];
  if (env.has?.('songmarket')) out.push(it('song.market', N('Licenciar / vender a música', 'License / sell the song'), 'coin', 'do', mine ? null : NOT_YOURS));
  else if (mine && rel && env.has?.('area:media19')) out.push(it('song.sync', N('Trilhas, anúncios e remix (licenciar)', 'Soundtracks, ads and remix (license)'), 'coin', 'do'));
  out.push(COPY());
  return { ent: 'song', id, name: so.title, kind: KIND27.song, items: out };
}

function venueMenu(s: GameState, id: string): CtxMenu27 | null {
  const v = VENUES17.find((x) => x.id === id);
  if (!v) return null;
  const open = venueOpen(s, v);
  const why = open ? null : s.year < v.from ? fmtL(N('Ainda não existe (abre em {y}).', 'Doesn\'t exist yet (opens in {y}).'), { y: v.from }) : N('Fechou as portas.', 'It has closed.');
  return {
    ent: 'venue', id, name: v.name, kind: KIND27.venue, items: [
      it('venue.open', N('Abrir ficha da casa', 'Open venue page'), 'eye', 'open', why),
      it('venue.show', N('Marcar show', 'Book a gig'), 'tour-bus', 'do', why ?? (playerActs(s).length ? null : NO_ACTS)),
      it('venue.city', N('Ver a cidade', 'See the city'), 'map', 'info', cityById[v.city] ? null : N('Cidade desconhecida.', 'Unknown city.')),
      COPY(),
    ],
  };
}

const plainMenu = (ent: Ent27, id: string, name: string, open: CtxItem27 | null): CtxMenu27 => ({ ent, id, name, kind: KIND27[ent], items: [...(open ? [open] : []), COPY()] });

/** Menu da entidade (ou null se o id não existe neste mundo). `name` = texto do elemento (para tipos sem registro). */
export function ctxMenu27(s: GameState, ent: Ent27, id: string, env: CtxEnv27 = {}, name = ''): CtxMenu27 | null {
  if (!id) return null;
  switch (ent) {
    case 'act': return actMenu(s, id, env);
    case 'person': return personMenu(s, id);
    case 'label': return labelMenu(s, id);
    case 'city': return cityMenu(s, id, env);
    case 'release': return releaseMenu(s, id, env);
    case 'song': return songMenu(s, id, env);
    case 'venue': return venueMenu(s, id);
    case 'festival': return plainMenu(ent, id, name || id, it('festival.open', N('Abrir festivais', 'Open festivals'), 'star', 'open', env.has?.('area:festivals') === false ? N('Ainda não há festivais nesta época.', 'No festivals in this era yet.') : null));
    case 'place': return plainMenu(ent, id, name || id, it('place.open', N('Abrir "Nosso mundo"', 'Open "Our world"'), 'house', 'open'));
    case 'org': return plainMenu(ent, id, name || id, env.has?.('area:crime') === false ? null : it('org.open', N('Abrir Submundo', 'Open Underworld'), 'skull', 'open'));
    default: return null;
  }
}
