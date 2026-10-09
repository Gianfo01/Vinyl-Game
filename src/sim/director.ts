// Diretor de Histórias (GDD §9, §46.7): gera arcos a partir do estado do save — rivalidades,
// voltas por cima, ascensão e queda, guerra entre selos, traição, dinastia e cena — e faz
// memórias antigas voltarem nos momentos certos. Nunca inventa causa: todo arco cita fatos.

import { clamp, type Rng } from '../core/rng';
import { cityById, l, type L } from '../data/world';
import { emitEvent, registerEvents, type EventDef } from './events';
import type { Act, GameState, MemoryEntry } from './types';
import type { Arc } from './xtypes';
import { fmtL, money, nextId, notify, playerActs, post, remember } from './util';
import { paceMonth } from './sys/pace9';

const act = (s: GameState, id: string | number | undefined) => s.acts[String(id)];
const arcOf = (s: GameState, id: string | number | undefined) => s.arcs.find((a) => a.id === String(id));

function bumpArc(s: GameState, arcId: string | number, outcome?: L): void {
  const a = arcOf(s, arcId);
  if (!a) return;
  if (outcome) a.outcome = outcome;
}

const ARC_EVENTS: EventDef[] = [
  {
    id: 'arc_rivalry_media', cat: 'career', tone: 'neutral', tags: [], cooldown: 2, forcedOnly: true,
    title: l('Rivalidade: {act} × {otherName}', 'Rivalry: {act} × {otherName}'),
    text: l('A imprensa transformou {act} e {otherName} em rivais. Toda entrevista agora pergunta sobre o outro lado.', 'The press turned {act} and {otherName} into rivals. Every interview now asks about the other side.'),
    options: [
      { id: 'provoke', label: l('Provocar em público', 'Provoke publicly'), hint: l('Fama e haters sobem; imagem pública cai.', 'Fame and haters rise; public image drops.'), apply: (s, _r, c) => { const a = act(s, c.act); a.fame = clamp(a.fame + 2, 0, 100); a.momentum = clamp(a.momentum + 10, 0, 100); if (a.image) a.image.publicImage -= 6; const f = s.fandoms[a.id]; if (f) f.haters += 800; bumpArc(s, c.arc, l('Escolheu a guerra de palavras.', 'Chose a war of words.')); } },
      { id: 'classy', label: l('Responder com elegância', 'Respond with class'), hint: l('Reputação artística; menos manchete.', 'Artistic reputation; fewer headlines.'), apply: (s, _r, c) => { const a = act(s, c.act); if (a.image) a.image.artistic += 4; s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100); bumpArc(s, c.arc, l('Manteve a elegância.', 'Kept it classy.')); } },
      { id: 'collab', label: l('Propor um feat surpresa', 'Propose a surprise feature'), hint: l('Os dois públicos se cruzam.', 'Both audiences cross over.'), apply: (s, r, c) => { const a = act(s, c.act); const b = act(s, c.other); if (b && r.chance(0.6)) { a.fans.casual += Math.round(b.fans.casual * 0.04); b.fans.casual += Math.round(a.fans.casual * 0.04); a.feats++; remember(s, 'arc', fmtL(l('{a} e {b} encerram a rivalidade com um dueto.', '{a} and {b} end the rivalry with a duet.'), { a: a.name, b: b.name }), { actId: a.id, important: true }); bumpArc(s, c.arc, l('Virou dueto.', 'Became a duet.')); } else bumpArc(s, c.arc, l('O outro lado recusou o feat.', 'The other side turned down the feature.')); } },
    ],
  },
  {
    id: 'arc_comeback', cat: 'career', tone: 'neutral', tags: [], cooldown: 2, forcedOnly: true,
    title: l('Volta por cima? {act}', 'Comeback? {act}'),
    text: l('{act} já foi maior. Os fãs antigos esperam; a imprensa duvida. Que caminho seguir?', '{act} used to be bigger. Old fans are waiting; the press doubts. Which path?'),
    options: [
      { id: 'reinvent', label: l('Reinventar o som', 'Reinvent the sound'), hint: l('Originalidade sobe; parte dos fãs antigos estranha.', 'Originality rises; some old fans balk.'), apply: (s, _r, c) => { const a = act(s, c.act); for (const id of a.songs) { const so = s.songs[id]; if (so && !so.recorded) so.originality = clamp(so.originality + 12, 0, 100); } a.fans.core = Math.round(a.fans.core * 0.93); a.momentum += 10; bumpArc(s, c.arc, l('Apostou na reinvenção.', 'Bet on reinvention.')); } },
      { id: 'nostalgia', label: l('Turnê de nostalgia', 'Nostalgia tour'), hint: l('Fiéis voltam; pouca novidade.', 'Loyal fans return; little novelty.'), apply: (s, _r, c) => { const a = act(s, c.act); a.fans.core = Math.round(a.fans.core * 1.08); a.fans.active = Math.round(a.fans.active * 1.1); a.momentum = clamp(a.momentum + 15, 0, 100); bumpArc(s, c.arc, l('Abraçou a nostalgia.', 'Embraced nostalgia.')); } },
      { id: 'roots', label: l('Voltar às raízes', 'Back to the roots'), hint: l('Crítica gosta; vendas incertas.', 'Critics like it; sales uncertain.'), apply: (s, _r, c) => { const a = act(s, c.act); if (a.image) a.image.artistic += 6; for (const id of a.members) { const p = s.persons[id]; if (p) p.inspiration = clamp(p.inspiration + 15, 0, 100); } bumpArc(s, c.arc, l('Voltou às raízes.', 'Went back to the roots.')); } },
    ],
  },
  {
    id: 'arc_pressure', cat: 'career', tone: 'neutral', tags: [], cooldown: 2, forcedOnly: true,
    title: l('Subida rápida demais? {act}', 'Rising too fast? {act}'),
    text: l('{act} cresceu muito em pouco tempo. Convites chovem, o cansaço também.', '{act} grew fast. Invitations pour in, and so does exhaustion.'),
    options: [
      { id: 'protect', label: l('Proteger o grupo (um mês livre)', 'Protect the group (a free month)'), hint: l('Perde momento; evita a queda.', 'Loses momentum; avoids the fall.'), apply: (s, _r, c) => { const a = act(s, c.act); a.hiatusUntil = s.week + 4; for (const id of a.members) { const p = s.persons[id]; if (p) { p.stress = clamp(p.stress - 25, 0, 100); p.fatigue = clamp(p.fatigue - 25, 0, 100); } } a.momentum *= 0.85; a.trust += 5; bumpArc(s, c.arc, l('Protegeu as pessoas.', 'Protected the people.')); } },
      { id: 'cashin', label: l('Aproveitar cada convite', 'Take every invitation'), hint: l('Dinheiro agora; estresse alto.', 'Money now; high stress.'), apply: (s, _r, c) => { const a = act(s, c.act); post(s, `cashin:${a.id}`, money(s, 4000 + a.fame * 300), 'live', `Agenda cheia ${a.name}`); for (const id of a.members) { const p = s.persons[id]; if (p) { p.stress = clamp(p.stress + 22, 0, 100); p.fatigue = clamp(p.fatigue + 20, 0, 100); } } bumpArc(s, c.arc, l('Aproveitou cada convite.', 'Took every invitation.')); } },
      { id: 'course', label: l('Seguir o plano', 'Stay the course'), apply: (s, _r, c) => bumpArc(s, c.arc, l('Seguiu o plano.', 'Stayed the course.')) },
    ],
  },
  {
    id: 'arc_feud', cat: 'business', tone: 'neutral', tags: [], cooldown: 2, forcedOnly: true,
    title: l('Guerra com {labelName}', 'War with {labelName}'),
    text: l('{labelName} tirou artistas de você mais de uma vez. O mercado já fala em guerra entre selos.', '{labelName} has taken artists from you more than once. The market talks of a label war.'),
    options: [
      { id: 'retaliate', label: l('Retaliar: disputar o próximo talento deles', 'Retaliate: contest their next signing'), hint: l('Rivalidade sobe; custa caro.', 'Rivalry rises; expensive.'), apply: (s, _r, c) => { s.rivalries[String(c.label)] = (s.rivalries[String(c.label)] ?? 0) + 30; s.flags[`retaliate:${c.label}`] = s.week; bumpArc(s, c.arc, l('Partiu para a retaliação.', 'Went for retaliation.')); } },
      { id: 'peace', label: l('Propor um pacto de não agressão', 'Propose a truce'), hint: l('Reputação institucional; rival pode recusar.', 'Institutional reputation; rival may refuse.'), apply: (s, r, c) => { if (r.chance(0.55)) { s.rivalries[String(c.label)] = 0; s.player.reputation.institutional = clamp(s.player.reputation.institutional + 4, 0, 100); bumpArc(s, c.arc, l('Selou a paz.', 'Made peace.')); } else bumpArc(s, c.arc, l('A trégua foi recusada.', 'The truce was refused.')); } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), apply: (s, _r, c) => bumpArc(s, c.arc, l('Ignorou a provocação.', 'Ignored the provocation.')) },
    ],
  },
  {
    id: 'arc_betrayal', cat: 'contract', tone: 'bad', tags: [], cooldown: 2, forcedOnly: true,
    title: l('{act} não esqueceu', '{act} has not forgotten'),
    text: l('O contrato de {act} está acabando. Eles lembram: "{memText}". Um rival já sonda a banda.', '{act}\'s contract is ending. They remember: "{memText}". A rival is already sniffing around.'),
    options: [
      { id: 'amends', label: l('Fazer as pazes (bônus e pedido de desculpas)', 'Make amends (bonus and apology)'), hint: l('Custa; confiança volta.', 'Costs money; trust returns.'), apply: (s, _r, c) => { const a = act(s, c.act); post(s, `amends:${a.id}`, -money(s, 3000 + a.fame * 200), 'royalties', `Reparação ${a.name}`); a.trust = clamp(a.trust + 18, 0, 100); bumpArc(s, c.arc, l('Fez as pazes.', 'Made amends.')); } },
      { id: 'letgo', label: l('Deixar seguir', 'Let them go'), apply: (s, _r, c) => { s.flags[`leaving:${c.act}`] = 1; bumpArc(s, c.arc, l('Deixou seguir.', 'Let them go.')); } },
    ],
  },
  {
    id: 'arc_scene', cat: 'culture', tone: 'good', tags: [], cooldown: 2, forcedOnly: true,
    title: l('A cena de {cityName} ferve', 'The {cityName} scene is boiling'),
    text: l('Um movimento novo nasce em {cityName}. Quem chegar primeiro pode ser a casa dele.', 'A new movement is born in {cityName}. Whoever arrives first could become its home.'),
    options: [
      { id: 'invest', label: l('Investir na cena (clube, noites, coletânea)', 'Invest in the scene (club, nights, compilation)'), hint: l('Custo; cena e reputação crescem.', 'Cost; scene and reputation grow.'), apply: (s, _r, c) => { post(s, `scene:${c.city}`, -money(s, 6000), 'marketing', 'Investimento em cena'); const mv = s.movements.find((m) => m.id === c.mv); if (mv) mv.strength += 20; s.player.reputation.artistic = clamp(s.player.reputation.artistic + 3, 0, 100); s.player.legacy.cultural = (s.player.legacy.cultural ?? 0) + 2; bumpArc(s, c.arc, l('Virou a casa da cena.', 'Became the scene\'s home.')); } },
      { id: 'watch', label: l('Observar de longe', 'Watch from afar'), apply: (s, _r, c) => bumpArc(s, c.arc, l('Observou de longe.', 'Watched from afar.')) },
    ],
  },
  {
    id: 'memory_return', cat: 'people', tone: 'bad', tags: [], cooldown: 4,
    find: (s, r) => {
      for (const id of playerActs(s)) {
        const a = s.acts[id];
        const stressed = a.members.map((m) => s.persons[m]).find((p) => p?.alive && p.stress > 70);
        if (!stressed) continue;
        const mem = negativeMemory(s, a);
        if (mem && r.chance(0.5)) return { act: a.id, person: stressed.id, mem: mem.id };
      }
      return null;
    },
    title: l('Velhas feridas: {person}', 'Old wounds: {person}'),
    text: l('No meio de um ensaio tenso, {person} ({act}) trouxe de volta: "{memText}".', 'In the middle of a tense rehearsal, {person} ({act}) brought it back: "{memText}".'),
    options: [
      { id: 'talk', label: l('Conversar com calma', 'Talk it through'), hint: l('Estresse cai; confiança sobe um pouco.', 'Stress drops; trust rises a bit.'), apply: (s, _r, c) => { const p = s.persons[String(c.person)]; p.stress = clamp(p.stress - 15, 0, 100); p.resentment = clamp(p.resentment - 10, 0, 100); act(s, c.act).trust += 3; } },
      { id: 'dismiss', label: l('Encerrar o assunto', 'Shut it down'), hint: l('Ressentimento cresce.', 'Resentment grows.'), apply: (s, _r, c) => { const p = s.persons[String(c.person)]; p.resentment = clamp(p.resentment + 12, 0, 100); } },
    ],
  },
];

registerEvents(ARC_EVENTS);

const NEGATIVE_KINDS = ['decision:arc_betrayal', 'promise_broken', 'left', 'stage_incident', 'separation', 'reunion_fail', 'seizure', 'event:coverup_exposed', 'stress_alert'];

function negativeMemory(s: GameState, a: Act): MemoryEntry | undefined {
  const ids = new Set(a.history);
  return s.memory.filter((m) => ids.has(m.id) && s.week - m.week < 104 && s.week - m.week > 8 && (NEGATIVE_KINDS.includes(m.kind) || m.kind.startsWith('decision:'))).sort((x, y) => y.week - x.week)[0];
}

function startArc(s: GameState, kind: Arc['kind'], title: L, actors: string[], stages: number, gapWeeks: number, memoryIds: string[] = []): Arc {
  const arc: Arc = { id: nextId(s, 'arc'), kind, title, actors, stage: 0, stages, startedWeek: s.week, nextWeek: s.week + gapWeeks, memoryIds };
  s.arcs.push(arc);
  remember(s, 'arc_start', fmtL(l('Começa uma história: {t}.', 'A story begins: {t}.'), { t: title }), { actId: s.acts[actors[0]] ? actors[0] : undefined, important: true });
  notify(s, fmtL(l('Nova história: {t}', 'New story: {t}'), { t: title }), 'event');
  return arc;
}

function candidates(s: GameState, r: Rng): (() => void)[] {
  const out: (() => void)[] = [];
  const mine = playerActs(s).map((id) => s.acts[id]);
  const busy = new Set(s.arcs.filter((a) => !a.done).flatMap((a) => a.actors));
  for (const a of mine) {
    if (busy.has(a.id)) continue;
    // rivalidade: outro ato do mesmo gênero e fama parecida, ambos em parada recente
    const other = Object.values(s.acts).find((b) => b.id !== a.id && b.owner !== 'player' && b.genre === a.genre && Math.abs(b.fame - a.fame) < 12 && b.fame > 20 && b.releases.some((rid) => s.releases[rid]?.lastPos));
    if (other && a.fame > 20 && a.releases.some((rid) => s.releases[rid]?.lastPos)) out.push(() => startArc(s, 'rivalry', fmtL(l('{a} × {b}', '{a} × {b}'), { a: a.name, b: other.name }), [a.id, other.id], 3, 4));
    // volta por cima: fama caiu muito do pico registrado
    const peak = s.flags[`peakFame:${a.id}`] ?? a.fame;
    if (peak - a.fame > 18) out.push(() => startArc(s, 'comeback', fmtL(l('A volta de {a}', 'The return of {a}'), { a: a.name }), [a.id], 3, 3));
    // ascensão rápida
    const yearAgo = s.flags[`fameYearAgo:${a.id}`];
    if (yearAgo !== undefined && a.fame - yearAgo > 15) out.push(() => startArc(s, 'rise_fall', fmtL(l('A ascensão de {a}', 'The rise of {a}'), { a: a.name }), [a.id], 3, 2));
    // traição lembrada
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    const mem = negativeMemory(s, a);
    if (c && c.party === 'player' && c.endWeek - s.week < 26 && c.endWeek - s.week > 4 && mem && a.trust < 55) out.push(() => startArc(s, 'betrayal', fmtL(l('{a} e a promessa quebrada', '{a} and the broken promise'), { a: a.name }), [a.id], 2, 1, [mem.id]));
  }
  // guerra com selo que roubou artistas
  for (const [lb, n] of Object.entries(s.rivalries)) if (n >= 40 && s.labels[lb]?.active && !busy.has(lb)) out.push(() => startArc(s, 'feud_label', fmtL(l('Guerra fria com {b}', 'Cold war with {b}'), { b: s.labels[lb].name }), [lb], 3, 2));
  // Davi contra Golias
  if (s.player.hq <= 1 && s.player.stats.top10s > 0 && !s.flags.underdogArc) out.push(() => { s.flags.underdogArc = 1; const arc = startArc(s, 'underdog', l('Davi contra Golias', 'David versus Goliath'), [], 1, 1); arc.done = true; s.player.reputation.artistic = clamp(s.player.reputation.artistic + 4, 0, 100); });
  // cena na cidade-sede
  const mv = s.movements.find((m) => m.city === s.config.homeCity && s.year - m.born <= 1 && !busy.has(m.id));
  if (mv) out.push(() => startArc(s, 'scene', fmtL(l('A cena {m}', 'The {m} scene'), { m: mv.name }), [mv.id], 2, 1));
  void r;
  return out;
}

function runStage(s: GameState, r: Rng, arc: Arc): void {
  const a0 = s.acts[arc.actors[0]];
  const next = (weeks: number) => {
    arc.stage += 1;
    arc.nextWeek = s.week + weeks;
    if (arc.stage >= arc.stages) arc.done = true;
  };
  switch (arc.kind) {
    case 'rivalry':
      if (arc.stage === 0 && a0) emitEvent(s, r, 'arc_rivalry_media', { act: a0.id, other: arc.actors[1], arc: arc.id });
      else if (arc.stage === 1 && a0) {
        const b = s.acts[arc.actors[1]];
        const pa = a0.peakChart;
        const pb = b?.peakChart ?? 999;
        const won = pa <= pb;
        a0.momentum = clamp(a0.momentum + (won ? 12 : -6), 0, 100);
        arc.outcome = won ? fmtL(l('{a} venceu a disputa nas paradas.', '{a} won the chart battle.'), { a: a0.name }) : fmtL(l('{b} levou a melhor nas paradas.', '{b} came out on top in the charts.'), { b: b?.name ?? '' });
        remember(s, 'arc_end', arc.outcome, { actId: a0.id, important: true });
      }
      next(10);
      break;
    case 'comeback':
      if (arc.stage === 0 && a0) emitEvent(s, r, 'arc_comeback', { act: a0.id, arc: arc.id });
      else if (arc.stage >= 1 && a0) {
        const released = a0.lastRelease > arc.startedWeek;
        const ok = released && a0.releases.some((id) => s.releases[id] && s.releases[id].week > arc.startedWeek && s.releases[id].peak <= 30);
        if (!released && arc.stage === 1) {
          notify(s, fmtL(l('A volta de {a} espera um lançamento.', '{a}\'s comeback awaits a release.'), { a: a0.name }), 'info');
          arc.nextWeek = s.week + 8;
          if (s.week - arc.startedWeek > 60) {
            arc.done = true;
            arc.outcome = l('A volta não aconteceu.', 'The comeback never happened.');
          }
          return;
        }
        arc.outcome = ok ? fmtL(l('{a} voltou por cima!', '{a} is back on top!'), { a: a0.name }) : fmtL(l('{a} voltou, mas sem barulho.', '{a} came back quietly.'), { a: a0.name });
        if (ok) a0.trust = clamp(a0.trust + 8, 0, 100);
        remember(s, 'arc_end', arc.outcome, { actId: a0.id, important: true });
      }
      next(8);
      break;
    case 'rise_fall':
      if (arc.stage === 0 && a0) emitEvent(s, r, 'arc_pressure', { act: a0.id, arc: arc.id });
      else if (a0) {
        const stressed = a0.members.some((id) => (s.persons[id]?.stress ?? 0) > 70);
        if (stressed) emitEvent(s, r, 'burnout', { act: a0.id });
        arc.outcome = stressed ? fmtL(l('A pressão cobrou seu preço em {a}.', 'The pressure took its toll on {a}.'), { a: a0.name }) : fmtL(l('{a} se firmou no topo.', '{a} settled at the top.'), { a: a0.name });
        remember(s, 'arc_end', arc.outcome, { actId: a0.id, important: true });
      }
      next(10);
      break;
    case 'feud_label': {
      const lb = s.labels[arc.actors[0]];
      if (arc.stage === 0 && lb) emitEvent(s, r, 'arc_feud', { label: lb.id, arc: arc.id });
      else if (lb) {
        arc.outcome = (s.rivalries[lb.id] ?? 0) > 50 ? fmtL(l('A guerra com {b} continua.', 'The war with {b} goes on.'), { b: lb.name }) : fmtL(l('A guerra com {b} esfriou.', 'The war with {b} cooled down.'), { b: lb.name });
        remember(s, 'arc_end', arc.outcome, { important: true });
      }
      next(12);
      break;
    }
    case 'betrayal':
      if (a0) emitEvent(s, r, 'arc_betrayal', { act: a0.id, mem: arc.memoryIds[0] ?? '', arc: arc.id });
      next(4);
      break;
    case 'scene': {
      const mv = s.movements.find((m) => m.id === arc.actors[0]);
      if (mv && arc.stage === 0) emitEvent(s, r, 'arc_scene', { city: mv.city, mv: mv.id, arc: arc.id });
      next(8);
      break;
    }
    default:
      next(4);
  }
}

/** Recupera uma memória relevante (aniversário de #1, mesma rival, mesma cidade). */
function recall(s: GameState, r: Rng): void {
  if (!r.chance(0.25)) return;
  const n1 = s.memory.filter((m) => m.kind === 'number1' && m.important && (s.year - m.year) % 10 === 0 && s.year > m.year && m.month === s.month);
  const pick = n1[0];
  if (pick) {
    notify(s, fmtL(l('Lembrança: há {n} anos, {t}', 'Memory: {n} years ago, {t}'), { n: s.year - pick.year, t: pick.text }), 'info');
    const a = pick.actId ? s.acts[pick.actId] : undefined;
    if (a) a.momentum = clamp(a.momentum + 4, 0, 100);
  }
}

export function directorMonth(s: GameState, r: Rng): void {
  paceMonth(s); // rodada 9: ritmo dos fatos autônomos do mundo
  // séries para gatilhos (pico de fama, fama de um ano atrás)
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    s.flags[`peakFame:${id}`] = Math.max(s.flags[`peakFame:${id}`] ?? 0, a.fame);
    if (s.month === 0) s.flags[`fameYearAgo:${id}`] = a.fame;
  }
  for (const arc of s.arcs) if (!arc.done && s.week >= arc.nextWeek) runStage(s, r, arc);
  const active = s.arcs.filter((a) => !a.done).length;
  const last = s.flags.lastArc ?? -999;
  if (active < 2 && s.week - last > 20) {
    const c = candidates(s, r);
    if (c.length && r.chance(0.35)) {
      r.pick(c)();
      s.flags.lastArc = s.week;
    }
  }
  recall(s, r);
  if (s.arcs.length > 60) s.arcs = s.arcs.filter((a) => !a.done || s.week - a.startedWeek < 520).slice(-60);
  void cityById;
}
