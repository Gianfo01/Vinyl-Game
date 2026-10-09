// Política e religião em ação (rodada 10): lançamentos provocativos incomodam artistas religiosos, o selo
// devoto ganha afinidade com o repertório sacro, a censura vira publicidade para quem é engajado, e o
// atrito entre visões opostas aparece no humor do elenco. Aleatoriedade própria (semente por lançamento).

import { Rng, clamp } from '../../core/rng';
import { familyOf, l } from '../../data/world';
import { activeCensorship } from '../media';
import { compatOf, isDevout, isPolitical, isStrict, playerViews, viewsOf, relById } from '../beliefs';
import { registerPerkSource, type PerkEntry } from '../perks';
import { registerSimHook } from '../ext4';
import { fmtL, notify, playerActs, remember } from '../util';

// o selo devoto tem afinidade com o repertório sacro; engajamento político vira apelo em época de censura
registerPerkSource('beliefs10', (s) => {
  const v = playerViews(s);
  const out: PerkEntry[] = [];
  if (isDevout(v, 55)) out.push({ label: l(`Fé (${relById[v.rel].name.pt}): afinidade com o sacro`, `Faith (${relById[v.rel].name.en}): affinity with sacred music`), values: { appeal: 0.04, offer: 0.03 }, act: (_s, a) => familyOf(a.genre) === 'sacred' });
  if (isPolitical(v, 60) && activeCensorship(s).length) out.push({ label: l('Engajamento em época de censura', 'Engagement in a censorship era'), values: { appeal: 0.03 }, act: (st, a) => a.members.some((m) => isPolitical(viewsOf(st, m), 65)) });
  return out;
});

// artistas religiosos reagem a letras explícitas e capas provocativas
registerSimHook('launch', 'beliefs10', (s, _r, arg) => {
  const rel = arg.release;
  if (!rel || !playerActs(s).includes(rel.actId)) return;
  const act = s.acts[rel.actId];
  if (!act) return;
  if (!(rel.coverChoice === 'provocative' || rel.expl)) return;
  const r = Rng.fromSeed(`bel10l:${s.config.seed}:${rel.id}`);
  for (const pid of act.members) {
    const p = s.persons[pid];
    if (!p) continue;
    const v = viewsOf(s, pid);
    if (!isStrict(v)) continue;
    const harsh = v.dev >= 75 ? 1 : 0.6;
    p.morale = clamp(p.morale - 5 * harsh, 0, 100);
    p.resentment = clamp(p.resentment + 6 * harsh, 0, 100);
    if (r.chance(0.5)) {
      notify(s, fmtL(l('{p} ({r}) ficou incomodado(a) com "{t}": a fé pesa nas letras e na capa.', '{p} ({r}) was uneasy with "{t}": faith weighs on lyrics and cover.'), { p: p.name, r: relById[v.rel].name, t: rel.title }), 'bad');
      remember(s, 'belief', fmtL(l('{p} se incomodou com o lançamento "{t}" por motivos religiosos.', '{p} was uneasy with the release "{t}" on religious grounds.'), { p: p.name, t: rel.title }), { actId: act.id });
    }
  }
});

// atrito mensal entre visões opostas dentro do elenco do jogador (leve e determinístico)
registerSimHook('month', 'beliefs10', (s) => {
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.members.length < 2) continue;
    for (let i = 0; i < a.members.length; i++) {
      for (let j = i + 1; j < a.members.length; j++) {
        const A = s.persons[a.members[i]];
        const B = s.persons[a.members[j]];
        if (!A?.alive || !B?.alive) continue;
        const c = compatOf(viewsOf(s, A.id), viewsOf(s, B.id));
        if (c < -0.55) { A.resentment = clamp(A.resentment + 0.4, 0, 100); B.resentment = clamp(B.resentment + 0.4, 0, 100); }
        else if (c > 0.6) { A.morale = clamp(A.morale + 0.3, 0, 100); B.morale = clamp(B.morale + 0.3, 0, 100); }
      }
    }
  }
});
