// Cerimônia de premiação: lê os prêmios recém-dados (Gramófonos de Ouro em legacy.ts e os
// prêmios de awards2.ts), monta indicados por categoria, e oferece o discurso com escolhas.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { avgReview, activeCensorship } from '../../media';
import { fandomOf } from '../../fandom';
import type { GameState, Release } from '../../types';
import { fmtL, notify, playerActs, remember } from '../../util';
import { clampN, findScene, patchScene, queueScene, sc } from './state';

export interface Nominee {
  name: string;
  mine: boolean;
  actId?: string;
}

export interface AwardCat {
  id: string;
  name: L;
  nominees: Nominee[];
  winner: number;
  mine: boolean;
}

export type SpeechChoice = 'team' | 'rival' | 'political' | 'short';

const GRAMO: Record<string, L> = {
  record: l('Gravação do Ano', 'Record of the Year'),
  album: l('Álbum do Ano', 'Album of the Year'),
  newcomer: l('Artista Revelação', 'Best New Artist'),
  performance: l('Melhor Performance', 'Best Performance'),
  critics: l('Prêmio da Crítica', 'Critics\' Prize'),
  label_year: l('Selo do Ano', 'Label of the Year'),
  producer_year: l('Produtor do Ano', 'Producer of the Year'),
  live_act: l('Ato ao Vivo do Ano', 'Live Act of the Year'),
};

const isMine = (s: GameState, rel: Release | undefined) => !!rel && (rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand);

function relName(s: GameState, rel: Release): string {
  return `${s.acts[rel.actId]?.name ?? '?'} — ${rel.title}`;
}

/** Indicados (sem sorte): os melhores pela mesma régua do prêmio, garantindo o vencedor na lista. */
function nomineesFor(s: GameState, cat: string, year: number, winnerRel?: string): Nominee[] {
  const rels = Object.values(s.releases).filter((x) => x.year === year && x.totalUnits > 0);
  let pool: Release[] = [];
  const score = (x: Release) => x.q + Math.log10(1 + x.totalUnits) * 7;
  if (cat === 'record') pool = rels.filter((x) => x.type === 'single');
  else if (cat === 'album') pool = rels.filter((x) => x.type === 'lp');
  else if (cat === 'newcomer') pool = rels.filter((x) => (s.acts[x.actId]?.debutYear ?? 0) >= year - 1);
  else if (cat === 'performance') pool = rels;
  else if (cat === 'critics') pool = rels.filter((x) => (avgReview(s, x.id) ?? 0) > 0);
  pool = pool.slice().sort((a, b) => (cat === 'critics' ? (avgReview(s, b.id) ?? 0) - (avgReview(s, a.id) ?? 0) : score(b) - score(a)));
  // um indicado por ato
  const seenActs = new Set<string>();
  const list: Release[] = [];
  for (const x of pool) {
    if (seenActs.has(x.actId)) continue;
    seenActs.add(x.actId);
    list.push(x);
    if (list.length >= 4) break;
  }
  if (winnerRel && !list.some((x) => x.id === winnerRel) && s.releases[winnerRel]) {
    if (list.length >= 4) list.pop();
    list.push(s.releases[winnerRel]);
  }
  return list.map((x) => ({ name: relName(s, x), mine: isMine(s, x), actId: x.actId }));
}

/** Chamado no gancho 'year', depois de yearlyAwards e yearlyAwards2. */
export function awardsYear(s: GameState, r: Rng): void {
  const year = s.year;
  const given = s.awards.filter((a) => a.year === year);
  if (!given.length) return;
  const cats: AwardCat[] = [];
  for (const a of given) {
    const name = GRAMO[a.category];
    if (!name) continue; // regionais entram resumidos abaixo
    let nominees = nomineesFor(s, a.category, year, a.releaseId);
    const winnerName = a.name.includes(': ') && !a.releaseId ? a.name.split(': ').pop() ?? a.name : a.releaseId && s.releases[a.releaseId] ? relName(s, s.releases[a.releaseId]) : a.name;
    if (!nominees.length || a.category === 'label_year' || a.category === 'producer_year' || a.category === 'live_act') {
      nominees = [{ name: winnerName, mine: a.byPlayer, actId: a.actId }];
      // concorrentes plausíveis: selos ativos por receita
      if (a.category === 'label_year') {
        const others = Object.values(s.labels).filter((lb) => lb.active && lb.name !== winnerName).sort((x, y) => y.revenueYear - x.revenueYear).slice(0, 3);
        nominees.push(...others.map((lb) => ({ name: lb.name, mine: false })));
        if (winnerName !== s.config.companyName) nominees.push({ name: s.config.companyName, mine: true });
        nominees = nominees.slice(0, 4);
      }
    }
    let wi = nominees.findIndex((n) => n.name === winnerName);
    if (wi < 0) {
      nominees[0] = { name: winnerName, mine: a.byPlayer, actId: a.actId };
      wi = 0;
    }
    const winner = nominees[wi];
    // ordem dos indicados: embaralhada, mas determinística
    const nn = nominees.map((n) => ({ n, k: r.next() })).sort((x, y) => x.k - y.k).map((x) => x.n);
    cats.push({ id: a.category, name, nominees: nn, winner: nn.indexOf(winner), mine: a.byPlayer });
  }
  const regional = given.filter((a) => a.category.startsWith('reg_'));
  const anyNominee = cats.some((c) => c.nominees.some((n) => n.mine));
  if (!anyNominee && !regional.some((a) => a.byPlayer)) return;
  // a cerimônia mostra no máximo 6 categorias: as suas primeiro, depois as principais
  cats.sort((a, b) => Number(b.nominees.some((n) => n.mine)) - Number(a.nominees.some((n) => n.mine)));
  const show = cats.slice(0, 6);
  const won = given.filter((a) => a.byPlayer).length;
  const winAct = given.find((a) => a.byPlayer && a.actId && s.acts[a.actId])?.actId;
  const rival = Object.values(s.labels).filter((lb) => lb.active).sort((a, b) => (s.rivalries[b.id] ?? 0) - (s.rivalries[a.id] ?? 0) || b.revenueYear - a.revenueYear)[0];
  queueScene(s, 'awards', 'awards', {
    title: fmtL(l('Gramófonos de Ouro {y}', 'Golden Gramophones {y}'), { y: year }),
    year,
    cats: show,
    regional: regional.map((a) => ({ name: a.name, mine: a.byPlayer })),
    won,
    actId: winAct ?? null,
    rivalId: rival?.id ?? null,
    rivalName: rival?.name ?? null,
  });
}

/** Discurso de agradecimento: aplica os efeitos uma única vez. */
export function awardSpeech(s: GameState, r: Rng, csId: string, choice: SpeechChoice): L {
  const cs = findScene(s, csId);
  if (!cs || cs.kind !== 'awards') return l('Cerimônia não encontrada.', 'Ceremony not found.');
  if (cs.data.speech) return (cs.data.result as L) ?? l('Discurso já feito.', 'Speech already given.');
  if (!cs.data.won) return l('Só quem ganha discursa.', 'Only winners give speeches.');
  const st = sc(s);
  const rep = s.player.reputation;
  const act = cs.data.actId ? s.acts[String(cs.data.actId)] : undefined;
  let result: L;
  if (choice === 'team') {
    rep.artists = clampN(rep.artists + 3, 0, 100);
    for (const id of playerActs(s)) s.acts[id].trust = clampN(s.acts[id].trust + (id === act?.id ? 5 : 2), 0, 100);
    if (act) for (const id of act.members) { const p = s.persons[id]; if (p) p.morale = clampN(p.morale + 4, 0, 100); }
    result = l('Você agradece nome por nome: músicos, técnicos, a recepção. A equipe sai da festa mais unida.', 'You thank everyone by name: musicians, engineers, the front desk. The team leaves the party closer.');
  } else if (choice === 'rival') {
    const rid = cs.data.rivalId ? String(cs.data.rivalId) : null;
    if (rid) s.rivalries[rid] = clampN((s.rivalries[rid] ?? 0) + 15, 0, 100);
    rep.institutional = clampN(rep.institutional - 3, 0, 100);
    if (act) {
      act.momentum = clampN(act.momentum + 10, 0, 100);
      act.fame = clampN(act.fame + 1, 0, 100);
      if (act.image) {
        act.image.popularity = clampN(act.image.popularity + 3, 0, 100);
        act.image.publicImage = clampN(act.image.publicImage - 2, 0, 100);
      }
      fandomOf(s, act.id).haters += 400 + Math.round(act.fame * 20);
    }
    result = fmtL(l('A alfinetada em {r} vira manchete. A rivalidade esquenta, a imprensa adora, o setor torce o nariz.', 'The jab at {r} makes headlines. The rivalry heats up, the press loves it, the industry frowns.'), { r: String(cs.data.rivalName ?? '—') });
  } else if (choice === 'political') {
    rep.artistic = clampN(rep.artistic + 4, 0, 100);
    rep.institutional = clampN(rep.institutional - 2, 0, 100);
    if (act) {
      if (act.image) act.image.artistic = clampN(act.image.artistic + 4, 0, 100);
      act.fans.core += Math.round(act.fans.core * 0.05) + 200;
      st.heat[act.id] = s.week + 52;
    }
    const censors = activeCensorship(s).length > 0;
    result = censors
      ? l('O discurso é aplaudido de pé — e anotado pelos censores. Os próximos discos do ato correm risco de proibição por um ano.', 'The speech gets a standing ovation — and the censors take notes. The act\'s next records risk bans for a year.')
      : l('O discurso político divide a plateia, mas ganha a crítica e os fãs mais fiéis. Por um ano, o ato fica na mira de censores onde houver censura.', 'The political speech splits the room but wins over critics and core fans. For a year the act is watched by censors wherever censorship exists.');
  } else {
    result = l('Um "obrigado" rápido e você volta à mesa. Discreto e seguro.', 'A quick "thank you" and you are back at the table. Low-key and safe.');
  }
  st.stats.speeches += 1;
  patchScene(s, csId, { speech: choice, result });
  remember(s, 'speech', fmtL(l('Discurso nos Gramófonos de Ouro: {r}', 'Golden Gramophones speech: {r}'), { r: result }), { actId: act?.id });
  void r;
  return result;
}

/** Gancho 'launch': discurso político recente atrai a censura (proibição em mercados com censura ativa). */
export function heatOnLaunch(s: GameState, r: Rng, rel: Release): void {
  const until = sc(s).heat[rel.actId];
  if (!until || until < s.week || rel.owner !== 'player') return;
  for (const rule of activeCensorship(s)) {
    for (const m of rule.markets) {
      if (!rel.territories.includes(m) || !r.chance(0.5)) continue;
      rel.territories = rel.territories.filter((x) => x !== m);
      s.bans.push({ releaseId: rel.id, market: m, reason: rule.name, week: s.week });
      notify(s, fmtL(l('"{t}" foi proibido depois do discurso político: {r}.', '"{t}" was banned after the political speech: {r}.'), { t: rel.title, r: rule.name }), 'bad');
    }
  }
}
