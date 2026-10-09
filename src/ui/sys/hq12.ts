// A sede comunica o estado do negócio (rodada 12): o estúdio diz quem grava e o quê; a sala de reunião
// recebe quem está negociando (empresários de artistas, executivos rivais com proposta) e abre a mesa
// de negociação; os discos e prêmios na parede são as conquistas reais (hover = qual); a equipe mostra
// se trabalha ou se está sobrecarregada (balão + dica com o porquê); as salas dizem quanto da sede está
// em uso e o que a próxima ampliação traz. Tudo pelos ganchos da sede (ui/hq.ts), sem desenho novo.

import { HQ_LEVELS, staffRoleById } from '../../data/rules';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { hqCaps } from '../../sim/branches';
import { careerSlotsUsed } from '../../sim/contracts';
import { PRODUCERS } from '../../sim/studio';
import { hq8 } from '../../sim/sys/hq8';
import { overCapacity, teamCapacity } from '../../sim/sys/pacing8';
import { openContests, rivals12, rivalWho } from '../../sim/sys/rivals12';
import { fest8 } from '../../sim/sys/fests8';
import type { GameState, Release } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, modal, pill, releaseLink, rerender, section } from '../common';
import { h } from '../dom';
import { hqHooks, type BubbleKind, type HqVisitor, type RoomTag } from '../hq';
import type { RoomKind } from '../pixel/sprites';
import { store } from '../store';
import { ic } from '../vis';
import { openTimeline } from './hq8';
import { contestCard } from './rivals12';


const fx = (x: L, p: Record<string, string | number> = {}) => t(x, p);
const go = (area: string) => { document.querySelector('.overlay')?.remove(); store.area = area; rerender(); };
const mine = (s: GameState, r: Release) => r.owner === 'player' || !!s.acts[r.actId]?.playerBand;

// ---------------------------------------------------------------- conquistas reais (cache por semana)

interface Wins { gold: Release[]; plat: Release[]; awards: L[] }
let wk = '';
let wins: Wins = { gold: [], plat: [], awards: [] };
function achievements(s: GameState): Wins {
  const k = `${s.config.seed}|${s.week}|${s.memory.length}|${s.player.stats.gold}|${s.player.stats.platinum}`;
  if (k === wk) return wins;
  wk = k;
  const rels = Object.values(s.releases).filter((r) => r.certified && mine(s, r)).sort((a, b) => a.year - b.year || a.week - b.week);
  const acts = new Set(playerActs(s));
  const awards = s.memory.filter((m) => (m.kind === 'award' || m.kind === 'award2' || m.kind === 'nat_award') && m.important && (!m.actId || acts.has(m.actId) || s.acts[m.actId]?.owner === 'player')).map((m) => m.text);
  wins = { gold: rels, plat: rels.filter((r) => r.certified !== 'gold'), awards };
  return wins;
}
const relLine = (s: GameState, r: Release) => `"${r.title}" — ${s.acts[r.actId]?.name ?? '?'} (${r.year})`;

hqHooks.itemTip = (s, kind, n) => {
  if (kind !== 'disc_gold' && kind !== 'disc_platinum' && kind !== 'awards' && kind !== 'trophy_case') return null;
  const w = achievements(s);
  if (kind === 'disc_platinum') { const r = w.plat[n]; return { label: fx(l('Disco de platina', 'Platinum disc')), sub: r ? relLine(s, r) : fx(l('Um milhão de cópias', 'A million copies')) }; }
  if (kind === 'disc_gold') { const r = w.gold[n]; return { label: fx(l('Disco de ouro', 'Gold disc')), sub: r ? relLine(s, r) : fx(l('Meio milhão de cópias', 'Half a million copies')) }; }
  const from = kind === 'trophy_case' ? n * 6 : 0;
  const list = w.awards.slice(from, from + 6);
  return { label: fx(l('Prêmios ({n})', 'Awards ({n})'), { n: s.player.stats.awards }), sub: list.length ? list.map((x) => t(x)).join('\n') : fx(l('Prêmios do selo', 'Label awards')) };
};

function openAchievements(s: GameState): void {
  const w = achievements(s);
  const st = s.player.stats;
  modal(t(l('Arquivo e troféus', 'Archive & trophies')), h('div', null,
    h('p', { class: 'small' }, fx(l('Discos de ouro {g} · platina {p} · prêmios {a} · nº 1 {n} · top 10 {t}', 'Gold discs {g} · platinum {p} · awards {a} · #1s {n} · top 10s {t}'), { g: st.gold, p: st.platinum, a: st.awards, n: st.number1s, t: st.top10s })),
    w.gold.length ? section(t(l('Discos certificados', 'Certified records')), h('ul', { class: 'small' }, [...w.gold].reverse().map((r) => h('li', null, ic(r.certified === 'gold' ? 'gold-disc' : 'platinum-disc'), ' ', releaseLink(s, r.id), ` — ${s.acts[r.actId]?.name ?? ''} (${r.year}) `, pill(r.certified ?? '', r.certified === 'gold' ? 'gold' : 'good'))))) : h('p', { class: 'muted small' }, t(l('Ainda nenhum disco certificado: a parede espera o primeiro ouro (500 mil cópias).', 'No certified records yet: the wall awaits the first gold (500k copies).'))),
    w.awards.length ? section(t(l('Prêmios', 'Awards')), h('ul', { class: 'small' }, [...w.awards].reverse().slice(0, 30).map((x) => h('li', null, ic('trophy'), ' ', t(x))))) : null,
    h('button', { class: 'btn small ghost', onclick: () => { document.querySelector('.overlay')?.remove(); openTimeline(s); } }, ic('building'), ' ', t(l('Como a empresa cresceu', 'How the company grew'))),
  ), { wide: true });
}

// ---------------------------------------------------------------- sala de reunião: quem está negociando

function visitors(s: GameState): HqVisitor[] {
  const out: HqVisitor[] = [];
  const bids = rivals12(s).bids;
  for (const o of s.offers) {
    if (o.status !== 'pending' && o.status !== 'counter') continue;
    const act = s.acts[o.actId];
    if (!act) continue;
    const b = bids[act.id];
    const tip = [
      o.status === 'counter' ? fx(l('Contraproposta: pedem {v} de adiantamento', 'Counter-offer: they ask {v} advance'), { v: $(o.advance) })
        : o.thinkUntil !== undefined && o.thinkUntil >= 0 ? fx(l('Pensando na sua oferta até a semana {w}', 'Thinking over your offer until week {w}'), { w: o.thinkUntil }) : fx(l('Avaliando a sua oferta ({v})', 'Weighing your offer ({v})'), { v: $(o.advance) }),
    ];
    if (b && s.labels[b.lb]) tip.push(`⚠ ${fx(l('{b} ofereceu {v} depois de você', '{b} offered {v} after you'), { b: s.labels[b.lb].name, v: $(b.adv) })}`);
    out.push({ key: `o:${o.id}`, name: fx(l('Empresário de {a}', '{a}\'s manager'), { a: act.name }), seed: `vis:${act.id}`, room: 'meeting', label: b ? l('Negociando — há lance rival', 'Negotiating — rival bid on the table') : l('Negociando contrato', 'Negotiating a contract'), icon: 'contract', tip, onClick: () => openTalks(s) });
  }
  for (const au of s.auctions) {
    if (au.status !== 'open' || !au.bids.some((x) => x.party === 'player')) continue;
    const act = s.acts[au.actId];
    if (act) out.push({ key: `a:${au.id}`, name: fx(l('Advogado de {a}', '{a}\'s lawyer'), { a: act.name }), seed: `vis:${act.id}`, room: 'meeting', label: l('Leilão em andamento', 'Auction under way'), icon: 'gavel', tip: [fx(l('{n} lance(s); termina na semana {w}', '{n} bid(s); ends week {w}'), { n: au.bids.length, w: au.endsWeek })], onClick: () => openTalks(s) });
  }
  for (const d of rivals12(s).deals) {
    if (d.st !== 'offer') continue;
    out.push({ key: `d:${d.id}`, name: t(rivalWho(s, d.lb)), seed: `vis:${d.lb}`, room: 'meeting', label: l('Proposta de distribuição', 'Distribution proposal'), icon: 'handshake', tip: [fx(l('Quer distribuir seus discos ({v}/mês de mínimo)', 'Wants to distribute your records ({v}/mo minimum)'), { v: $(d.fee) })], onClick: () => openTalks(s) });
  }
  return out.slice(0, 4);
}

/** Mesa de negociação: ofertas em curso, lances rivais e propostas, com as respostas ali mesmo. */
function openTalks(s: GameState): void {
  const offers = s.offers.filter((o) => o.status === 'pending' || o.status === 'counter');
  const open = openContests(s).filter((c) => c.k === 'bid' || c.k === 'auction' || c.k === 'deal' || c.k === 'catalog');
  modal(t(l('Sala de reunião — negociações', 'Meeting room — negotiations')), h('div', null,
    offers.length ? h('ul', { class: 'small' }, offers.map((o) => h('li', null, actLink(s, o.actId), ' ', pill(o.status === 'counter' ? t(l('contraproposta', 'counter-offer')) : t(l('aguardando resposta', 'awaiting answer')), o.status === 'counter' ? 'warn' : ''), ` ${$(o.advance)}`))) : h('p', { class: 'muted small' }, t(l('Nenhuma oferta sua na mesa.', 'None of your offers on the table.'))),
    open.length ? h('div', { class: 'riv12-list' }, open.map((c) => contestCard(s, c))) : null,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => go('market') }, ic('fans'), ' ', t(l('Radar e pipeline', 'Radar and pipeline'))),
      h('button', { class: 'btn small ghost', onclick: () => go('desk') }, ic('calendar'), ' ', t(l('Mesa (decisões)', 'Desk (decisions)')))),
  ), { wide: true });
}

// ---------------------------------------------------------------- equipe: trabalhando ou sobrecarregada

const MGMT = new Set(['manager', 'admin']);
function overload(s: GameState): number { return overCapacity(s).size; }
function staffBubble(s: GameState, id: string): BubbleKind | null {
  const st = s.player.staff.find((x) => x.id === id);
  if (!st) return null;
  const over = overload(s);
  if (over && (MGMT.has(st.role) || (!s.player.staff.some((x) => MGMT.has(x.role)) && s.player.staff[0]?.id === id))) return 'attention';
  if ((st.role === 'producer' || st.role === 'engineer') && s.sessions.some((x) => !x.done)) return 'record';
  if (st.role === 'anr' && s.offers.some((o) => o.status === 'pending')) return 'write';
  return null;
}
function staffTip(s: GameState, id: string): string[] {
  const st = s.player.staff.find((x) => x.id === id);
  if (!st) return [];
  const out = [t(staffRoleById[st.role]?.desc)];
  const del = playerActs(s).filter((a) => s.delegated[a] !== false && !s.acts[a]?.playerBand).length;
  const cap = teamCapacity(s);
  const over = overload(s);
  out.push(fx(l('Carreiras delegadas {d} · a equipe dá conta de {c}', 'Delegated careers {d} · the team can handle {c}'), { d: del, c: cap }));
  if (over) out.push(`⚠ ${fx(l('Sobrecarregada: {n} carreira(s) ficam no mínimo. Contrate empresário ou administração, ou amplie a sede.', 'Overloaded: {n} career(s) get minimum care. Hire a manager or admin, or upgrade the HQ.'), { n: over })}`);
  const sess = s.sessions.filter((x) => !x.done);
  if ((st.role === 'producer' || st.role === 'engineer') && sess.length) out.push(`● ${fx(l('Na mesa: {a}', 'At the desk: {a}'), { a: sess.map((x) => s.acts[x.actId]?.name ?? '').join(', ') })}`);
  if (st.role === 'booking') out.push(fx(l('Festivais fechados este ano: {n}', 'Festivals booked this year: {n}'), { n: fest8(s).editions.reduce((n, e) => n + e.lineup.filter((x) => playerActs(s).includes(x.actId)).length, 0) }));
  if (st.role === 'publicist') out.push(fx(l('Lançamentos na agenda: {n}', 'Releases scheduled: {n}'), { n: s.pendingReleases.length }));
  if (st.role === 'anr') out.push(fx(l('Ofertas em negociação: {n}', 'Offers in negotiation: {n}'), { n: s.offers.filter((o) => o.status === 'pending' || o.status === 'counter').length }));
  return out;
}

// ---------------------------------------------------------------- salas: estado real e crescimento

function roomTip(s: GameState, kind: RoomKind): string[] {
  const sess = s.sessions.filter((x) => !x.done);
  switch (kind) {
    case 'booth': case 'control':
      if (!sess.length) return [t(l('Livre agora — clique para marcar uma sessão.', 'Free now — click to book a session.'))];
      return sess.map((x) => {
        const pr = PRODUCERS.find((p) => p.id === x.producerId);
        const songs = x.songIds.map((id) => s.songs[id]?.title).filter(Boolean).slice(0, 3).join(', ');
        return `● ${s.acts[x.actId]?.name ?? ''}: ${songs} — ${fx(l('dia {d}/{n}', 'day {d}/{n}'), { d: x.dayDone, n: x.days })}${pr ? ` · ${pr.name}` : ''}`;
      });
    case 'meeting': {
      const o = s.offers.filter((x) => x.status === 'pending' || x.status === 'counter').length;
      const c = openContests(s).filter((x) => x.k === 'bid' || x.k === 'auction' || x.k === 'deal').length;
      return o || c ? [fx(l('{o} negociação(ões) · {c} disputa(s) com rivais', '{o} negotiation(s) · {c} fight(s) with rivals'), { o, c }), t(l('Clique para abrir a mesa de negociação.', 'Click to open the negotiating table.'))] : [t(l('Ninguém negociando agora.', 'Nobody negotiating right now.'))];
    }
    case 'office': {
      const caps = hqCaps(s);
      return [fx(l('Equipe {n}/{c} · carreiras {u}/{k}', 'Staff {n}/{c} · careers {u}/{k}'), { n: s.player.staff.length, c: caps.staff, u: careerSlotsUsed(s), k: caps.careers }),
        overload(s) ? `⚠ ${fx(l('{n} carreira(s) além do que a equipe acompanha', '{n} career(s) beyond what the team can follow'), { n: overload(s) })}` : t(l('A equipe dá conta do elenco.', 'The team keeps up with the roster.'))];
    }
    case 'hall': case 'trophy': {
      const lv = HQ_LEVELS[s.player.hq];
      const nx = HQ_LEVELS[s.player.hq + 1];
      const since = [...hq8(s).hist].reverse().find((x, i, arr) => arr[i + 1] === undefined || arr[i + 1].hq < x.hq);
      const caps = hqCaps(s);
      const full = careerSlotsUsed(s) >= caps.careers;
      const out = [fx(l('{n} desde {y}: {r}', '{n} since {y}: {r}'), { n: t(lv.name), y: since?.y ?? s.config.startYear, r: t(lv.reach) })];
      if (full) out.push(`⚠ ${t(l('Sede lotada: sem vaga para outra carreira.', 'HQ full: no room for another career.'))}`);
      if (nx) out.push(fx(l('Próximo: {n} — {r}', 'Next: {n} — {r}'), { n: t(nx.name), r: t(nx.reach) }));
      if (kind === 'trophy') out.push(t(l('Clique para ver cada conquista.', 'Click to see each achievement.')));
      return out;
    }
    default: return [];
  }
}

// ---------------------------------------------------------------- etiquetas e cliques (envolvem a rodada 8)

const baseTags = hqHooks.roomTags;
hqHooks.roomTags = (s) => {
  const tags: RoomTag[] = (baseTags?.(s) ?? []).slice();
  const sess = s.sessions.filter((x) => !x.done);
  const i = tags.findIndex((x) => x.room === 'booth');
  if (sess.length === 1 && i >= 0) tags[i] = { room: 'booth', text: `REC ${(s.acts[sess[0].actId]?.name ?? '').slice(0, 12)}`, tone: 'bad' };
  const o = s.offers.filter((x) => x.status === 'pending' || x.status === 'counter').length;
  const fights = openContests(s).filter((x) => x.k === 'bid' || x.k === 'auction').length;
  if (fights) tags.push({ room: 'meeting', text: fx(l('Lances {n}', 'Bids {n}'), { n: fights }), tone: 'bad' });
  else if (o) tags.push({ room: 'meeting', text: fx(l('Negocia {n}', 'Talks {n}'), { n: o }), tone: 'warn' });
  return tags;
};

const baseRoom = hqHooks.onRoom;
hqHooks.onRoom = (kind) => {
  const s = store.game;
  if (!s) return;
  if (kind === 'meeting') return openTalks(s);
  if (kind === 'trophy') return openAchievements(s);
  baseRoom?.(kind);
};

hqHooks.visitors = visitors;
hqHooks.staffBubble = staffBubble;
hqHooks.staffTip = staffTip;
hqHooks.roomTip = roomTip;
