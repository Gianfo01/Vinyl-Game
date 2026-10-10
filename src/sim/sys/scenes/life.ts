// Cenas da vida do selo: velório e clínica (com cuidado), Hall dos Ecos, mansão, rua (músico de
// rua ligado à descoberta), feira do setor, loja e fábrica (lançamento grande / falta de estoque),
// clube (noites temáticas), palco holográfico, set de clipe e as animações de evento (disco de
// ouro, número 1, ônibus saindo para a turnê).

import type { Rng } from '../../../core/rng';
import { CITIES, cityById, l, type L } from '../../../data/world';
import { pressingCost } from '../../production';
import type { GameState, MemoryEntry, Release } from '../../types';
import { addSignal, spawnProceduralAct } from '../../worldgen';
import { fmtL, hasTech, money, notify, playerActs, post, remember } from '../../util';
import { ipoScene, subLabelScene } from './board';
import { startInterview } from './interview';
import { clampN, cooled, findScene, markSeen, memSeq, patchScene, queueScene, sc, setCool, wasSeen } from './state';
import { allReleases17 } from '../../relidx17';

const mineAct = (s: GameState, actId?: string) => {
  const a = actId ? s.acts[actId] : undefined;
  return !!a && (a.owner === 'player' || !!a.playerBand);
};

/** Examina memórias novas e transforma algumas em cenas. */
export function memoryWatch(s: GameState, r: Rng): void {
  const st = sc(s);
  const fresh: MemoryEntry[] = [];
  for (let i = s.memory.length - 1; i >= 0; i--) {
    const m = s.memory[i];
    if (memSeq(m.id) <= st.memCursor) break;
    fresh.push(m);
  }
  if (!fresh.length) return;
  st.memCursor = Math.max(st.memCursor, ...fresh.map((m) => memSeq(m.id)));
  fresh.reverse();
  // em jogo novo, não transforma o histórico de criação em cenas
  if (s.week < 2) return;
  for (const m of fresh) onMemory(s, r, m);
}

function onMemory(s: GameState, r: Rng, m: MemoryEntry): void {
  switch (m.kind) {
    case 'death': {
      if (!m.important) return;
      const act = m.actId ? s.acts[m.actId] : undefined;
      queueScene(s, 'farewell', 'funeral', {
        title: l('Despedida', 'Farewell'),
        text: m.text,
        actId: m.actId ?? null,
        mine: mineAct(s, m.actId),
        legend: !!act?.legend || (act?.fame ?? 0) > 60,
      });
      return;
    }
    case 'treatment':
    case 'recovery':
      if (!mineAct(s, m.actId)) return;
      queueScene(s, 'clinic', 'clinic', { title: l('Clínica', 'Clinic'), text: m.text, actId: m.actId ?? null }, { minor: true });
      return;
    case 'hall_of_fame':
      queueScene(s, 'hall', 'awards', { title: l('Hall dos Ecos', 'Hall of Echoes'), text: m.text, actId: m.actId ?? null, mine: mineAct(s, m.actId) }, { minor: !mineAct(s, m.actId) });
      return;
    case 'ipo':
      ipoScene(s);
      return;
    case 'sublabel':
      subLabelScene(s, m.text);
      return;
    case 'hologram':
      queueScene(s, 'hologram', 'holo_stage', { title: l('Palco holográfico', 'Hologram stage'), text: m.text, actId: m.actId ?? null }, { minor: true });
      return;
    case 'cert':
      if (!mineAct(s, m.actId)) return;
      queueScene(s, 'goldfx', 'store', { title: l('Disco de ouro!', 'Gold record!'), text: m.text, actId: m.actId ?? null, level: m.text.en.includes('diamond') ? 'diamond' : m.text.en.includes('platinum') ? 'platinum' : 'gold' }, { minor: true });
      return;
    case 'number1': {
      if (!m.important || !mineAct(s, m.actId)) return;
      queueScene(s, 'number1', number1Place(s), { title: l('Número 1!', 'Number 1!'), text: m.text, actId: m.actId ?? null });
      // convite para entrevista na TV (enfileirada depois da festa)
      if (m.actId && cooled(s, `iv:${m.actId}`, 6) && s.acts[m.actId]) startInterview(s, r, m.actId, 'number1');
      return;
    }
    case 'tour_planned':
      if (!mineAct(s, m.actId)) return;
      queueScene(s, 'busfx', 'tour_bus', { title: l('Pé na estrada', 'Hitting the road'), text: m.text, actId: m.actId ?? null }, { minor: true });
      return;
    default:
  }
}

// ---------- velório ----------
export function farewellChoice(s: GameState, csId: string, tribute: boolean): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'farewell') return l('Cena não encontrada.', 'Scene not found.');
  if (cs.data.done) return cs.data.result as L;
  let result: L;
  if (tribute) {
    post(s, `tribute:${csId}`, -money(s, 1500), 'marketing', 'Homenagem e flores');
    s.player.reputation.artists = clampN(s.player.reputation.artists + 2, 0, 100);
    const act = cs.data.actId ? s.acts[String(cs.data.actId)] : undefined;
    if (act) act.fans.core += Math.round(100 + act.fame * 8);
    result = l('O selo organiza uma homenagem simples: flores, uma canção, silêncio. Os músicos agradecem o gesto.', 'The label holds a simple tribute: flowers, a song, silence. The musicians are grateful.');
  } else {
    result = l('Você comparece em silêncio e respeita a família.', 'You attend quietly and respect the family\'s wishes.');
  }
  patchScene(s, csId, { done: true, result, tribute });
  return result;
}

// ---------- mansão ----------
/** Gancho 'year': a casa do dono cresce com o sucesso; visita quando muda de nível. */
export function mansionYear(s: GameState): void {
  const st = sc(s);
  const L = s.player.legacy;
  const lvl = clampN(Math.floor(((L.commercial ?? 0) + (L.cultural ?? 0)) / 30), 0, 5);
  if (lvl <= st.mansion) return;
  st.mansion = lvl;
  queueScene(s, 'mansion', 'mansion', {
    title: l('A casa do dono', 'The owner\'s house'),
    level: lvl,
    text: [
      l('Um apartamento alugado em cima da loja.', 'A rented flat above the shop.'),
      l('Uma casa com quintal e um piano na sala.', 'A house with a yard and a piano in the living room.'),
      l('Um sobrado com estúdio no porão.', 'A townhouse with a basement studio.'),
      l('Uma mansão com piscina e garagem para três carros.', 'A mansion with a pool and a three-car garage.'),
      l('Uma propriedade com jardins, piscina e um salão de festas.', 'An estate with gardens, a pool and a ballroom.'),
      l('Um palacete famoso, cenário de capas de revista.', 'A famous palace, a magazine-cover backdrop.'),
    ][lvl],
  }, { minor: true });
}

export function mansionParty(s: GameState, csId: string, party: boolean): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'mansion') return l('Cena não encontrada.', 'Scene not found.');
  if (cs.data.done) return cs.data.result as L;
  let result: L;
  if (party) {
    post(s, `party:${csId}`, -money(s, 2500 + Number(cs.data.level) * 1500), 'marketing', 'Festa na casa do dono');
    s.player.reputation.artists = clampN(s.player.reputation.artists + 2, 0, 100);
    for (const id of playerActs(s)) for (const pid of s.acts[id].members) { const p = s.persons[pid]; if (p) p.morale = clampN(p.morale + 3, 0, 100); }
    sc(s).stats.parties += 1;
    result = l('A festa vira lenda: o elenco inteiro na piscina e um dueto improvisado no salão.', 'The party becomes legend: the whole roster in the pool and an impromptu duet in the hall.');
  } else result = l('Você aproveita a casa em paz.', 'You enjoy the house in peace.');
  patchScene(s, csId, { done: true, result, party });
  return result;
}

// ---------- rua: músico de rua ----------
/** Gancho 'month': às vezes um músico de rua chama atenção na sua cidade (entra na descoberta). */
export function streetMonth(s: GameState, r: Rng): void {
  if (s.week < 8 || !cooled(s, 'street', 20) || !r.chance(0.12)) return;
  setCool(s, 'street');
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 1 });
  addSignal(s, r, act.id, 'street');
  queueScene(s, 'street', 'street', {
    title: l('Músico de rua', 'Street musician'),
    actId: act.id,
    name: act.name,
    city: cityById[act.city]?.name ?? l(act.city),
    text: fmtL(l('Na calçada da {c}, {a} junta uma roda de gente com um chapéu no chão.', 'On a {c} sidewalk, {a} draws a crowd with a hat on the ground.'), { c: cityById[act.city]?.name ?? l(act.city), a: act.name }),
  }, { minor: true });
}

export function streetChoice(s: GameState, csId: string, approach: boolean): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'street') return l('Cena não encontrada.', 'Scene not found.');
  if (cs.data.done) return cs.data.result as L;
  const k = s.knowledge[String(cs.data.actId)];
  let result: L;
  if (approach && k) {
    k.degree = Math.max(k.degree, 2);
    k.updatedWeek = s.week;
    result = l('Você deixa um cartão no chapéu e conversa depois do número. O nome entra no radar com mais detalhes (veja Mercado).', 'You drop a card in the hat and chat after the set. The name enters your radar with more detail (see Market).');
  } else result = l('Você segue caminho. Talvez outro olheiro pare.', 'You walk on. Maybe another scout will stop.');
  patchScene(s, csId, { done: true, result });
  return result;
}

// ---------- feira do setor ----------
export type BoothSize = 'none' | 'small' | 'medium' | 'large';
export const BOOTH_COST: Record<Exclude<BoothSize, 'none'>, number> = { small: 1500, medium: 5000, large: 15000 };

/** Gancho 'month': feira anual em fevereiro (a partir de 1950). */
export function fairMonth(s: GameState): void {
  if (s.month !== 1 || s.year < 1950 || wasSeen(s, `fair:${s.year}`)) return;
  markSeen(s, `fair:${s.year}`);
  const rivals = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.revenueYear - a.revenueYear).slice(0, 5).map((x) => ({ id: x.id, name: x.name }));
  queueScene(s, 'fair', 'trade_fair', {
    title: fmtL(l('Feira do disco {y}', 'Record trade fair {y}'), { y: s.year }),
    rivals,
    city: cityById[CITIES[(s.year * 7) % CITIES.length].id]?.name ?? l('—'),
  }, { minor: true });
}

export function fairChoice(s: GameState, r: Rng, csId: string, size: BoothSize): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'fair') return l('Feira não encontrada.', 'Fair not found.');
  if (cs.data.done) return cs.data.result as L;
  if (size === 'none') {
    const res = l('Este ano o selo só passeia pela feira.', 'This year the label just walks the floor.');
    patchScene(s, csId, { done: true, result: res, size });
    return res;
  }
  const cost = money(s, BOOTH_COST[size]);
  if (s.player.cash < cost) return l('Caixa insuficiente para o estande.', 'Not enough cash for the booth.');
  post(s, `fair:${s.year}:${size}`, -cost, 'marketing', 'Estande na feira do setor');
  const k = { small: 1, medium: 2, large: 3 }[size];
  s.player.reputation.institutional = clampN(s.player.reputation.institutional + k, 0, 100);
  // licenças vendidas a distribuidores estrangeiros
  const lic = Math.round(cost * (0.4 + r.float(0, 0.5) * k));
  post(s, `fairlic:${s.year}:${size}`, lic, 'licensing', 'Licenças vendidas na feira');
  // boatos: um rival revela seus planos
  const rivals = cs.data.rivals as { id: string; name: string }[];
  const rv = rivals.length ? rivals[r.int(0, rivals.length - 1)] : null;
  const lb = rv ? s.labels[rv.id] : undefined;
  const top = lb ? lb.roster.map((id) => s.acts[id]).filter(Boolean).sort((a, b) => b.fame - a.fame)[0] : undefined;
  const rumor = lb ? fmtL(l('Boato no estande de {l}: estão apostando tudo em {a}, com caixa de {c}k.', 'Rumor at the {l} booth: they are betting it all on {a}, with {c}k in cash.'), { l: lb.name, a: top?.name ?? '—', c: Math.round(lb.cash / 100000) }) : l('Nenhum boato útil.', 'No useful rumors.');
  sc(s).stats.fairs += 1;
  const result = fmtL(l('Estande montado. Licenças vendidas: {v}. {r}', 'Booth set up. Licenses sold: {v}. {r}'), { v: `$${Math.round(lic / 100)}`, r: rumor });
  patchScene(s, csId, { done: true, result, size });
  return result;
}

// ---------- loja e fábrica ----------
/** Gancho 'launch': lançamento grande → fila na porta da loja; clipe → set de filmagem. */
export function launchScenes(s: GameState, rel: Release): void {
  if (rel.owner !== 'player') return;
  const act = s.acts[rel.actId];
  if (!act) return;
  if ((act.fame >= 55 || rel.pressed >= 200000) && cooled(s, 'storeline', 26)) {
    setCool(s, 'storeline');
    queueScene(s, 'store', 'store', {
      title: l('Fila na porta da loja', 'Line outside the record store'),
      text: fmtL(l('Meia-noite: fãs de {a} dão a volta no quarteirão para levar "{t}".', 'Midnight: {a} fans wrap around the block for "{t}".'), { a: act.name, t: rel.title }),
      actId: act.id, releaseId: rel.id,
    }, { minor: true });
  } else if (rel.marketing.some((m) => m.channel === 'music_video') && cooled(s, 'videoset', 26)) {
    setCool(s, 'videoset');
    queueScene(s, 'videoset', 'video_set', {
      title: l('Set de clipe', 'Music video set'),
      text: fmtL(l('Refletores, cenário pintado e fumaça: {a} grava o clipe de "{t}".', 'Lights, painted backdrop and smoke: {a} shoots the video for "{t}".'), { a: act.name, t: rel.title }),
      actId: act.id, releaseId: rel.id,
    }, { minor: true });
  }
}

/** Gancho 'week': falta de estoque num lançamento seu → cena da fábrica com turno extra. */
export function shortageWeek(s: GameState): void {
  for (const rel of allReleases17(s)) {
    if (rel.owner !== 'player' || rel.shortage < 2000 || s.week - rel.week > 12) continue;
    const key = `short:${rel.id}`;
    if (wasSeen(s, key)) continue;
    markSeen(s, key);
    const units = Math.min(Math.max(5000, rel.shortage * 2), 400000);
    queueScene(s, 'factory', 'factory', {
      title: l('Fábrica de discos', 'Pressing plant'),
      text: fmtL(l('As lojas pedem "{t}" e não há discos: {n} vendas perdidas até agora.', 'Stores want "{t}" and there are no records: {n} sales lost so far.'), { t: rel.title, n: rel.shortage }),
      releaseId: rel.id, units, cost: pressingCost(s, rel.formats, units),
    });
    return; // uma por semana
  }
}

export function factoryOvertime(s: GameState, csId: string, go: boolean): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'factory') return l('Cena não encontrada.', 'Scene not found.');
  if (cs.data.done) return cs.data.result as L;
  const rel = s.releases[String(cs.data.releaseId)];
  let result: L;
  if (go && rel) {
    const units = Number(cs.data.units) || 0;
    const cost = Math.round(pressingCost(s, rel.formats, units) * 1.25); // turno extra custa 25% a mais
    if (cost <= 0) result = l('Este lançamento não tem formato físico para prensar.', 'This release has no physical format to press.');
    else if (s.player.cash < cost) return l('Caixa insuficiente para o turno extra.', 'Not enough cash for the extra shift.');
    else {
      post(s, `overtime:${rel.id}`, -cost, 'manufacturing', 'Prensagem em turno extra');
      rel.stock += units;
      rel.pressed += units;
      result = fmtL(l('As prensas trabalham a noite toda: +{n} cópias a caminho das lojas.', 'The presses run all night: +{n} copies on their way to stores.'), { n: units });
    }
  } else result = l('Você espera a próxima remessa normal.', 'You wait for the next regular batch.');
  patchScene(s, csId, { done: true, result, go });
  return result;
}

// ---------- clube ----------
export const CLUB_NIGHTS: { id: string; name: L }[] = [
  { id: 'theme', name: l('Noite temática do gênero da casa', 'House-genre theme night') },
  { id: 'open', name: l('Noite aberta para novos artistas', 'Open night for new artists') },
  { id: 'star', name: l('Noite com DJ estrela', 'Star DJ night') },
];

/** Gancho 'month': clubes seus têm noites com cena (no máximo a cada 4 meses). */
export function clubMonth(s: GameState, r: Rng): void {
  const mine = s.clubs.filter((c) => c.owner === 'player' && !c.closed);
  if (!mine.length || !cooled(s, 'club', 16) || !r.chance(0.35)) return;
  setCool(s, 'club');
  const club = r.pick(mine);
  queueScene(s, 'club', 'dance_club', {
    title: fmtL(l('Noite no {c}', 'A night at {c}'), { c: club.name }),
    clubId: club.id, name: club.name, city: cityById[club.city]?.name ?? l(club.city), genre: club.genre,
  }, { minor: true });
}

export function clubNight(s: GameState, r: Rng, csId: string, night: string): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'club') return l('Cena não encontrada.', 'Scene not found.');
  if (cs.data.done) return cs.data.result as L;
  const club = s.clubs.find((c) => c.id === cs.data.clubId);
  if (!club) return l('O clube fechou.', 'The club closed.');
  const sceneKey = `${club.city}:${club.genre}`;
  let result: L;
  if (night === 'theme') {
    s.scenes[sceneKey] = (s.scenes[sceneKey] ?? 0) + 2;
    club.prestige = clampN(club.prestige + 3, 0, 100);
    result = l('A pista lota de gente do gênero. A cena local ganha força.', 'The floor fills with genre devotees. The local scene grows stronger.');
  } else if (night === 'open') {
    const act = spawnProceduralAct(s, r, { city: club.city, genre: club.genre });
    addSignal(s, r, act.id, 'club');
    s.scenes[sceneKey] = (s.scenes[sceneKey] ?? 0) + 1;
    result = fmtL(l('No palco aberto, {a} chama atenção. Entrou no seu radar.', 'At the open stage, {a} stands out. They are on your radar now.'), { a: act.name });
  } else {
    const fee = money(s, 1200);
    const door = Math.round(club.capacity * money(s, 6) * (0.6 + club.prestige / 200));
    post(s, `clubstar:${csId}`, door - fee, 'live', 'Noite com DJ estrela');
    club.prestige = clampN(club.prestige + 1, 0, 100);
    result = fmtL(l('Fila na porta a noite inteira. Saldo da noite: {v}.', 'A line at the door all night. Night\'s balance: {v}.'), { v: `$${Math.round((door - fee) / 100)}` });
  }
  patchScene(s, csId, { done: true, result, night });
  void notify;
  return result;
}

/** Se não há TV musical, a "parada" do número 1 acontece na rádio. */
export function number1Place(s: GameState): 'tv_chart' | 'radio_am' | 'curators' {
  if (hasTech(s, 'streaming')) return 'curators';
  return hasTech(s, 'tv_music') ? 'tv_chart' : 'radio_am';
}

void remember;
