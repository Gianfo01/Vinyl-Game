// Cerimônia de premiação: lê os prêmios recém-dados (Gramófonos de Ouro em legacy.ts e os
// prêmios de awards2.ts), monta indicados por categoria, e oferece o discurso com escolhas.

import type { Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { activeCensorship } from '../../media';
import { fandomOf } from '../../fandom';
import type { GameState, Release } from '../../types';
import { addHeat, fmtL, heatOf, notify, playerActs, remember } from '../../util';
import { clampN, findScene, patchScene, queueScene, sc } from './state';
import type { Cutscene } from '../../ext4';
import { GRAMO_CATS, cer8 } from '../ceremonies8';
import { isRegional19 } from '../../awards2';
import { mineRel19 } from '../../mine19';

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

function relName(s: GameState, rel: Release): string {
  return `${s.acts[rel.actId]?.name ?? '?'} — ${rel.title}`;
}

/** Vencedor de uma categoria dos Gramófonos (decidido na noite; pode ainda não estar no livro). */
export interface CerWin { cat: string; releaseId?: string; actId?: string }

/** r19: a cerimônia mostra os indicados OFICIAIS (anunciados em novembro, `cer8().noms`) das 4 categorias dos
 *  Gramófonos e só existe quando você (selo, banda ou cliente do empresário) tem pelo menos um indicado oficial.
 *  `year` = ano homenageado; `wins` = vencedores decididos na noite (sem eles, lê o livro `s.awards`). */
export function awardsYear(s: GameState, r: Rng, year = s.year, wins?: CerWin[]): Cutscene | null {
  const noms = cer8(s).noms;
  if (!noms || noms.year !== year) return null;
  const win = wins ?? s.awards.filter((a) => a.year === year && GRAMO_CATS.some((c) => c.id === a.category)).map((a) => ({ cat: a.category, releaseId: a.releaseId, actId: a.actId }));
  const cats: AwardCat[] = [];
  for (const c of GRAMO_CATS) {
    const ids = [...(noms.cats[c.id] ?? [])];
    const w = win.find((x) => x.cat === c.id);
    if (!ids.length || !w) continue;
    if (w.releaseId && !ids.includes(w.releaseId)) ids.push(w.releaseId);
    const list = ids.map((id) => s.releases[id]).filter((x): x is Release => !!x);
    const nominees: Nominee[] = list.map((x) => ({ name: relName(s, x), mine: mineRel19(s, x), actId: x.actId }));
    const winner = nominees[list.findIndex((x) => x.id === w.releaseId)];
    if (!winner) continue;
    // ordem dos indicados: embaralhada, mas determinística
    const nn = nominees.map((n) => ({ n, k: r.next() })).sort((x, y) => x.k - y.k).map((x) => x.n);
    cats.push({ id: c.id, name: GRAMO[c.id], nominees: nn, winner: nn.indexOf(winner), mine: winner.mine });
  }
  if (!cats.some((c) => c.nominees.some((n) => n.mine))) return null; // r19: sem indicado oficial seu, sem cerimônia
  // suas categorias primeiro
  cats.sort((a, b) => Number(b.nominees.some((n) => n.mine)) - Number(a.nominees.some((n) => n.mine)));
  const won = cats.filter((c) => c.nominees[c.winner]?.mine).length; // r19: só conta o que a cena mostra
  const winAct = cats.map((c) => c.nominees[c.winner]).find((n) => n?.mine && n.actId && s.acts[n.actId])?.actId;
  const regional = s.awards.filter((a) => a.year === year && a.byPlayer && isRegional19(a.category)); // já anunciados
  const rival = Object.values(s.labels).filter((lb) => lb.active).sort((a, b) => heatOf(s, b.id) - heatOf(s, a.id) || b.revenueYear - a.revenueYear)[0];
  return queueScene(s, 'awards', 'awards', {
    title: fmtL(l('Gramófonos de Ouro {y}', 'Golden Gramophones {y}'), { y: year }),
    year,
    cats,
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
    if (rid) addHeat(s, rid, 15, 100); // r19: rivals19
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
