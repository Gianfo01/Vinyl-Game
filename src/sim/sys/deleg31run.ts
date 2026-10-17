// R31 · onda 2 (Q) — EXECUTORES NOVOS da delegação única (sim/deleg31.ts):
//   • A&R: com "A&R e contratação" delegado, o executivo de A&R escolhe entre os atos que você já conhece (dentro dos
//     gêneros e do teto da diretriz) e faz a proposta pelas regras da proposta manual (elegibilidade, reunião da equipe,
//     caixa reservado, resposta no fechamento do mês). Ouvido fraco lê pior o potencial; negociação fraca paga mais.
//   • Produtor executivo: com "Produção executiva" delegada, o produtor decide o lançamento automático das agendas
//     delegadas pela nota mínima, formato e teto de marketing; ele lê a nota das faixas com erro que cai com a qualidade.
//   • Modo parcial: acima do limite de consulta, vira pedido de aprovação (tela de delegação e Caixa).
//   • Desfazer: proposta ainda pendente (retira) e lançamento ainda não saído (cancela, como o manual).
//   • Opinião via opinion.ts (delegar a alguém = gesto de confiança; desfazer a decisão dele = desgaste).
// Sorte: fluxo `deleg31` (rng19), consumido só quando o A&R está delegado; a leitura do produtor é sorte pura por
// (semente, faixa, produtor). Registrado no fim da cadeia de sistemas: sem delegação nova, nada muda no mundo.

import { Rng, clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { genreById, l, type L } from '../../data/world';
import { hqCaps } from '../branches';
import { careerSlotsUsed, defaultOffer, expectedAdvance, makeOffer, offerEligible29, withdrawOffer } from '../contracts';
import {
  ASK31, EXEC31, LEARN31X, MODE31, OPINE31, RESP31, respView31, UNDO31, addSpent31, allowOnce31, askFor31, blocked31, d31, dirOf31, exc31, logAuto31, modeOf31, onceOk31, applyPreset31,
  setDir31, setMode31, staffFor31, usd31, PRESET31, type Mode31, type Preset31,
} from '../deleg31';
import { freeCash20 } from '../oblig20';
import { payGate18 } from './policy18';
import { registerSimHook } from '../ext4';
import { opine } from '../opinion';
import { unreleasedRecorded } from '../production';
import { registerEditable, registerRunnable } from '../r31/editor';
import { rng19 } from '../rng19';
import { estimate } from '../scouting';
import type { Act, GameState, Song } from '../types';
import { fmtL, money, playerActs } from '../util';
import { quality } from './deleg16';
import { cap14, meetingCap } from './gate14';

OPINE31.f = (s, key, d, why) => { opine(s, key, d, why); };

const usd = usd31; // dólares de hoje pelo formatador do jogo, nas duas línguas

// ---------------------------------------------------------------- A&R

export interface AnrPick31 { act: Act; read: number; lo: number; hi: number; adv: number }
/** Leitura do A&R (sem efeitos): candidatos dentro do escopo, ordenados pela nota que ELE dá. */
export function anrRead31(s: GameState, r: Rng | null): AnrPick31[] {
  const st = staffFor31(s, 'anr');
  if (!st) return [];
  const D = dirOf31(s, 'anr'), q = quality(s, st).q;
  const out: AnrPick31[] = [];
  for (const k of Object.values(s.knowledge)) {
    const a = s.acts[k.actId];
    if (!a || !offerEligible29(s, a, 'classic').ok) continue;
    if (s.offers.some((o) => o.actId === a.id && (o.status === 'pending' || o.status === 'counter'))) continue;
    if (D.genres?.length && !D.genres.includes(a.genre)) continue;
    if (blocked31(s, 'anr', a.id)) continue; // W2-REV: você desfez a proposta a este ato há pouco — não repete
    const e = estimate(s, a.id, 'potential');
    const mid = e?.mid ?? 50;
    // ouvido: o A&R fraco erra mais na leitura (ruído some com a qualidade)
    const noise = r ? (r.next() - 0.5) * 40 * clamp(1.1 - q, 0.05, 1) : 0;
    // negociação: o bom fecha mais perto do esperado; o fraco paga a mais
    const adv = expectedAdvance(s, a) * (1.15 - 0.3 * clamp(q, 0, 1));
    out.push({ act: a, read: mid + noise + a.fame * 0.15 + (LEARN31X.anr?.(s, a) ?? 0), lo: e?.lo ?? 0, hi: e?.hi ?? 100, adv });
  }
  return out.sort((x, y) => y.read - x.read || (x.act.id < y.act.id ? -1 : 1));
}

function offerFor(s: GameState, a: Act, advReal: number): ReturnType<typeof defaultOffer> {
  const o = defaultOffer(s, a);
  o.advance = money(s, Math.round(advReal / 100) * 100);
  return o;
}

export function anrMonth31(s: GameState): void {
  const m = modeOf31(s, 'anr');
  if (m === 'me') return;
  const st = staffFor31(s, 'anr');
  if (!st) { exc31(s, 'anr', 'nostaff', l('A&R delegado, mas ninguém da equipe tem o cargo: as contratações voltaram para você.', 'A&R is delegated, but nobody on staff holds the role: signing is back with you.')); return; }
  if (careerSlotsUsed(s) >= hqCaps(s).careers) { logAuto31(s, { r: 'anr', who: st.id, t: fmtL(l('{n} não propôs ninguém: a sede está sem vaga de carreira ({u}/{c}).', '{n} offered nobody: the HQ has no career slot ({u}/{c}).'), { n: st.name, u: careerSlotsUsed(s), c: hqCaps(s).careers }), tone: 'info', x: 'full' }); return; }
  const D = dirOf31(s, 'anr');
  const r = rng19(s, 'deleg31');
  const picks = anrRead31(s, r);
  if (!picks.length) { logAuto31(s, { r: 'anr', who: st.id, t: fmtL(l('{n} não achou ninguém para propor: nenhum ato conhecido e livre dentro do escopo{g}.', '{n} found nobody to offer: no known, unsigned act within scope{g}.'), { n: st.name, g: D.genres?.length ? fmtL(l(' ({x})', ' ({x})'), { x: D.genres.map((g) => genreById[g]?.name ?? l(g, g)).reduce((a, b) => l(`${a.pt}, ${b.pt}`, `${a.en}, ${b.en}`)) }) : '' }), tone: 'info', x: 'none' }); return; }
  let made = 0;
  for (const p of picks) {
    if (made >= (D.per ?? 1)) break;
    let adv = p.adv;
    const cap = D.cap ?? 0;
    if (cap > 0 && adv > cap) {
      if (expectedAdvance(s, p.act) * 0.85 > cap) { logAuto31(s, { r: 'anr', who: st.id, act: p.act.id, x: 'cap', tone: 'info', t: fmtL(l('{n} passou {a}: o adiantamento esperado ({v}) está muito acima do seu teto de {c}.', '{n} passed on {a}: the expected advance ({v}) is far above your {c} cap.'), { n: st.name, a: p.act.name, v: usd(expectedAdvance(s, p.act)), c: usd(cap) }) }); continue; }
      adv = cap;
    }
    if (cap14(s).meet >= meetingCap(s)) { logAuto31(s, { r: 'anr', who: st.id, x: 'meet', tone: 'info', t: fmtL(l('{n} parou: a equipe já usou as {c} reuniões de oferta do mês (não gasta o seu tempo).', '{n} stopped: the team already used its {c} offer meetings this month (does not spend your time).'), { n: st.name, c: meetingCap(s) }) }); break; }
    const why = fmtL(l('leitura de {n}: potencial {lo}–{hi}{g}; adiantamento {v}{c}', '{n}\'s read: potential {lo}–{hi}{g}; advance {v}{c}'), { n: st.name, lo: p.lo, hi: p.hi, g: D.genres?.length ? fmtL(l(', gênero {x}', ', genre {x}'), { x: genreById[p.act.genre]?.name ?? l(p.act.genre, p.act.genre) }) : '', v: usd(adv), c: cap ? fmtL(l(' (teto {x})', ' (cap {x})'), { x: usd(cap) }) : '' });
    // W2-REV: "Gastos da equipe" vale para o A&R: teto por gasto e reserva mínima sobre o caixa LIVRE (adiantamentos já
    // reservados por outras propostas descontados) — o que travar vira exceção, como nas ordens dos agentes
    const advC = money(s, Math.round(adv / 100) * 100);
    const gate = payGate18(s, { kind: 'anr', actId: p.act.id }, advC, { cash: freeCash20(s) });
    if (gate) { logAuto31(s, { r: 'anr', who: st.id, act: p.act.id, x: 'gate', tone: 'bad', why, t: fmtL(l('{n} não propôs a {a}: {w}', '{n} did not offer to {a}: {w}'), { n: st.name, a: p.act.name, w: gate }) }); continue; }
    if (m === 'partial' && (D.ask ?? 0) > 0 && adv > (D.ask ?? 0)) {
      askFor31(s, { r: 'anr', who: st.id, until: s.week + 4, amt: money(s, adv), act: p.act.id, k: 'anr', data: { adv: Math.round(adv) },
        t: fmtL(l('{n} quer oferecer {v} de adiantamento a {a} (acima do seu limite de {x}).', '{n} wants to offer a {v} advance to {a} (above your {x} limit).'), { n: st.name, v: usd(adv), a: p.act.name, x: usd(D.ask ?? 0) }) });
      made++;
      continue;
    }
    const off = makeOffer(s, offerFor(s, p.act, adv));
    if (!off) { logAuto31(s, { r: 'anr', who: st.id, act: p.act.id, x: 'fail', tone: 'bad', t: fmtL(l('{n} não conseguiu propor a {a} (caixa livre para o adiantamento ou reunião indisponível).', '{n} could not offer to {a} (free cash for the advance or no meeting available).'), { n: st.name, a: p.act.name }), why }); continue; }
    made++;
    addSpent31(s, 'anr', off.advance);
    logAuto31(s, { r: 'anr', who: st.id, act: p.act.id, x: 'offer', tone: 'good', amt: -off.advance, undo: { k: 'offer', id: off.id }, why,
      t: fmtL(l('{n} propôs contrato a {a}: {v} de adiantamento, {r}% de royalty, {m} meses. Resposta no fechamento do mês.', '{n} offered {a} a deal: {v} advance, {r}% royalty, {m} months. Answer at month close.'), { n: st.name, a: p.act.name, v: usd(toReal(off.advance, s.year)), r: Math.round(off.royalty * 100), m: off.termMonths }) });
  }
}
UNDO31.offer = (s, id, e) => {
  const o = s.offers.find((x) => x.id === id);
  if (!o || o.status !== 'pending') return l('A proposta já foi respondida.', 'The offer was already answered.');
  withdrawOffer(s, id);
  if (e.m === s.year * 12 + s.month) addSpent31(s, 'anr', -o.advance); // estorna o gasto do mês
  return null;
};
ASK31.anr = (s, a) => {
  const act = a.act ? s.acts[a.act] : undefined;
  if (!act || !offerEligible29(s, act, 'classic').ok) return l('O ato não está mais disponível.', 'The act is no longer available.');
  const off = makeOffer(s, offerFor(s, act, Number(a.data.adv) || 0));
  if (!off) return l('Não deu para propor agora (caixa livre ou reuniões do mês).', 'Could not offer now (free cash or this month\'s meetings).');
  addSpent31(s, 'anr', off.advance);
  logAuto31(s, { r: 'anr', who: a.who, act: act.id, x: 'offer', tone: 'good', amt: -off.advance, undo: { k: 'offer', id: off.id }, t: fmtL(l('Proposta aprovada por você: {v} de adiantamento a {a}.', 'Offer approved by you: {v} advance to {a}.'), { v: usd(toReal(off.advance, s.year)), a: act.name }) });
  return null;
};

// ---------------------------------------------------------------- produtor executivo

/** Nota que o produtor dá à faixa: a real com um erro fixo por (faixa, produtor) que cai com a qualidade dele. */
export function execRead31(s: GameState, song: Song, stId: string, q: number): number {
  const r = Rng.fromSeed(`${s.config.seed}|exec31|${song.id}|${stId}`);
  return song.q + (r.next() - 0.5) * 30 * clamp(1.1 - q, 0.05, 1);
}
const held = (s: GameState, actId: string): boolean => d31(s).log.some((e) => e.r === 'exec' && e.act === actId && e.x === 'minq' && s.week - e.w < 8);

EXEC31.release = (s, act, base) => {
  const m = modeOf31(s, 'exec');
  if (m === 'rule') return base;
  const ready = unreleasedRecorded(s, act);
  if (m === 'me') {
    if (base.ok && ready.length && s.week - act.lastRelease >= base.minGap && !onceOk31(s, `exec:${act.id}`))
      exc31(s, 'exec', 'me', fmtL(l('{a} tem {n} gravação(ões) pronta(s): o lançamento espera você ("Eu decido").', '{a} has {n} finished recording(s): the release waits for you ("I decide").'), { a: act.name, n: ready.length }), act.id);
    return onceOk31(s, `exec:${act.id}`) ? base : { ...base, ok: false };
  }
  const st = staffFor31(s, 'exec');
  if (!st) return base;
  const D = dirOf31(s, 'exec'), q = quality(s, st).q;
  const scored = ready.map((x) => ({ x, v: execRead31(s, x, st.id, q) })).sort((a, b) => b.v - a.v || (a.x.id < b.x.id ? -1 : 1));
  const good = (D.minQ ?? 0) > 0 ? scored.filter((y) => y.v >= (D.minQ ?? 0)) : scored;
  const want: 'single' | 'lp' | undefined = D.fmt === 'single' ? 'single' : D.fmt === 'lp' ? 'lp' : undefined;
  const auto: 'single' | 'lp' = good.length >= 8 ? 'lp' : 'single';
  const type: 'single' | 'lp' = want ?? (LEARN31X.fmt?.(s, act, auto, good.length) ?? auto);
  const enough = type === 'lp' ? good.length >= 8 : good.length >= 1;
  if (!enough) {
    if (base.ok && scored.length && s.week - act.lastRelease >= base.minGap && !held(s, act.id))
      logAuto31(s, { r: 'exec', who: st.id, act: act.id, x: 'minq', tone: 'info', t: fmtL(l('{n} segurou o lançamento de {a}: {k} acima da nota mínima {m} (melhor faixa: nota ~{v} pela leitura dele).', '{n} held {a}\'s release: {k} above the minimum grade {m} (best track: ~{v} by their read).'), { n: st.name, a: act.name, k: type === 'lp' ? fmtL(l('{g} de 8 faixas', '{g} of 8 tracks'), { g: good.length }) : l('nenhuma faixa', 'no track'), m: D.minQ ?? 0, v: Math.round(scored[0].v) }) });
    return { ...base, ok: false };
  }
  let maxSpend = base.maxSpend;
  if ((D.cap ?? 0) > 0) maxSpend = Math.min(maxSpend, money(s, D.cap ?? 0) * 2); // o lançamento automático usa até metade disto em marketing
  const songs = (type === 'lp' ? good.slice(0, 10) : good.slice(0, 1)).map((y) => y.x.id);
  if (m === 'partial' && (D.ask ?? 0) > 0 && base.ok && s.week - act.lastRelease >= base.minGap && !onceOk31(s, `exec:${act.id}`)) {
    const mk = Math.min(Math.round(s.player.cash * 0.08), money(s, type === 'lp' ? 6000 : 2500) * (1 + act.fame / 30)) * base.budgetMult;
    const est = Math.min(mk, maxSpend * 0.5);
    if (toReal(est, s.year) > (D.ask ?? 0)) {
      askFor31(s, { r: 'exec', who: st.id, until: s.week + 4, amt: Math.round(est), act: act.id, k: 'exec', data: { type },
        t: fmtL(l('{n} quer lançar {t} de {a} com cerca de {v} de marketing (acima do seu limite de {x}).', '{n} wants to release {a}\'s {t} with about {v} in marketing (above your {x} limit).'), { n: st.name, t: type === 'lp' ? 'LP' : 'single', a: act.name, v: usd(toReal(est, s.year)), x: usd(D.ask ?? 0) }) });
      return { ...base, ok: false };
    }
  }
  return { ...base, type, songs, maxSpend };
};
EXEC31.why = (s, act) => {
  const m = modeOf31(s, 'exec');
  if (m !== 'staff' && m !== 'partial') return [];
  const D = dirOf31(s, 'exec');
  return [(D.minQ ?? 0) > 0 ? `minq:${D.minQ}` : '', (D.cap ?? 0) > 0 ? `mkcap:${D.cap}` : '', D.fmt && D.fmt !== 'auto' ? `fmt:${D.fmt}` : '', `exec:${staffFor31(s, 'exec')?.name ?? ''}`].filter(Boolean).concat(onceOk31(s, `exec:${act.id}`) ? ['ok:you'] : []);
};
ASK31.exec = (s, a) => { if (!a.act || !s.acts[a.act]) return l('O artista já não está no selo.', 'The act is no longer with the label.'); allowOnce31(s, `exec:${a.act}`); return null; };

// ---------------------------------------------------------------- agenda do elenco (todas as carreiras de uma vez)

/** "Agenda do elenco": Eu decido = cada agenda fica fixa (a sua); regra = a equipe monta pela prioridade. */
export function setAgendaMode31(s: GameState, m: Mode31): L | null {
  const why = setMode31(s, 'agenda', m);
  if (why) return why;
  for (const id of playerActs(s)) {
    if (s.acts[id]?.playerBand) continue;
    if (m === 'me') s.delegated[id] = false;
    else delete s.delegated[id];
  }
  return null;
}
/** Quantos artistas têm a agenda montada pela equipe. */
export function agendaCount31(s: GameState): { team: number; all: number } {
  const ids = playerActs(s).filter((id) => !s.acts[id]?.playerBand);
  return { team: ids.filter((id) => s.delegated[id] !== false).length, all: ids.length };
}

registerSimHook('month', 'deleg31', (s) => { anrMonth31(s); });

// ---------------------------------------------------------------- editor (regra 10)

for (const def of RESP31) {
  registerEditable({ id: `deleg.mode.${def.id}`, area: 'tools', kind: 'select', label: fmtL(l('Delegação: {r}', 'Delegation: {r}'), { r: def.name }),
    options: (s) => respView31(s, def.id).modes.map((m) => ({ value: m, label: MODE31[m].name })),
    get: (s) => modeOf31(s, def.id), set: (s, v) => setMode31(s, def.id, String(v) as Mode31, undefined, { force: true }) ?? undefined });
  for (const k of def.dirs) {
    if (k === 'genres' || k === 'fmt' || k === 'sponsor' || k === 'head') continue;
    registerEditable({ id: `deleg.dir.${def.id}.${k}`, area: 'tools', kind: 'number', min: 0, step: k === 'frac' ? 0.05 : 1, label: fmtL(l('Diretriz — {r}: {k}', 'Directive — {r}: {k}'), { r: def.name, k }),
      get: (s) => Number(dirOf31(s, def.id)[k] ?? 0), set: (s, v) => { setDir31(s, def.id, { [k]: Number(v) || 0 }); } });
  }
}
registerRunnable({ id: 'deleg.preset', area: 'tools', label: l('Delegação: aplicar conjunto pronto', 'Delegation: apply a preset'),
  arg: { kind: 'select', label: l('Conjunto', 'Preset'), def: 'mid', options: () => (Object.keys(PRESET31) as Preset31[]).map((p) => ({ value: p, label: PRESET31[p].name })) },
  run: (s, _t, arg) => applyPreset31(s, (String(arg ?? 'mid') as Preset31)) });
registerRunnable({ id: 'deleg.anr.now', area: 'tools', label: l('Delegação: rodar o A&R agora', 'Delegation: run A&R now'), run: (s) => { anrMonth31(s); return l('A&R rodou (veja o registro de automação).', 'A&R ran (see the automation log).'); } });
