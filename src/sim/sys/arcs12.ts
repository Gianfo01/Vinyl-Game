// Rodada 12 — arcos de personagem: o que você fez por (ou contra) cada artista vira memória com peso.
// Fontes: discos que você bancou (crítica alta, venda baixa), promessas cumpridas/quebradas, como você
// reagiu a aliciamentos, brigas públicas e venda de fitas-mestras, mais os marcos da crônica (#1, prêmio,
// sonho, crise, fim). `arcWeight` transforma o histórico numa inclinação (−1..1) que pesa em renovações,
// propostas, aliciamentos e brigas — sempre com o motivo à vista ("Eles lembram: você bancou X em 1977").
// Sucessão: o novo dono herda as lealdades pela metade e os ressentimentos quase inteiros.

import { clamp, Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerContractHook } from '../contracts';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerDecisionListener, registerExt4, registerSimHook } from '../ext4';
import type { Act, GameState } from '../types';
import { fmtL, notify, playerActs } from '../util';
import { chronListeners, type ChronEv } from './chron9';
import { ownerOf } from './people/owner';
import { social } from './social8';
import { soul } from './soul9';

export interface ArcEv { y: number; m: number; k: string; t: L; w: number; g: number; used?: 1 }
export interface Arcs12 { log: Record<string, ArcEv[]>; seen: Record<string, 1>; gen: number; succ: { y: number; g: number; fam: boolean; from: string; to: string }[]; fam?: string[] }
declare module '../ext4' { interface Ext4 { arcs12: Arcs12 } }
const fresh = (): Arcs12 => ({ log: {}, seen: {}, gen: 0, succ: [] });
registerExt4('arcs12', fresh);
export function arcs(s: GameState): Arcs12 {
  const x = s.x4 as unknown as { arcs12?: Arcs12 };
  x.arcs12 ??= fresh();
  const a = x.arcs12;
  a.log ??= {}; a.seen ??= {}; a.succ ??= []; a.gen ??= 0;
  return a;
}

const gen = (s: GameState): number => { try { return ownerOf(s).generation ?? 1; } catch { return 1; } };

/** Registra um capítulo no arco do artista (w = peso na memória sobre você; 0 = só história). */
export function arcAdd(s: GameState, actId: string, k: string, t: L, w = 0): ArcEv | null {
  if (!s.acts[actId]) return null;
  const list = (arcs(s).log[actId] ??= []);
  const e: ArcEv = { y: s.year, m: s.month, k, t, w: Math.round(w * 100) / 100, g: gen(s) };
  list.push(e);
  if (list.length > 40) {
    // guarda os capítulos de peso; descarta história miúda antiga
    const i = list.findIndex((x) => !x.w);
    list.splice(i >= 0 ? i : 0, 1);
  }
  return e;
}

export interface ArcWeight { v: number; best?: ArcEv; worst?: ArcEv; parts: { e: ArcEv; v: number }[] }

/** Peso do histórico com o selo: o que já se fez, apagando devagar; lealdade e teimosia do líder pesam. */
export function arcWeight(s: GameState, act: Act): ArcWeight {
  const st = arcs(s);
  const list = st.log[act.id] ?? [];
  const lead = s.persons[act.leaderId ?? act.members[0]];
  const so = lead ? soul(s, lead) : undefined;
  const loyal = so ? 0.6 + so.f.lealdade / 125 : 1;
  const grudge = so ? 0.6 + so.f.teimosia / 125 : 1;
  const g0 = gen(s);
  const parts: { e: ArcEv; v: number }[] = [];
  let v = 0;
  for (const e of list) {
    if (!e.w) continue;
    const age = Math.max(0, s.year - e.y);
    let x = e.w * (e.w > 0 ? Math.max(0.35, 1 - age / 25) * loyal : Math.max(0.5, 1 - age / 30) * grudge);
    if (e.g < g0) {
      // outro dono: herdeiro de família herda mais da gratidão; ressentimento quase inteiro para todos
      const fam = st.succ.filter((x2) => x2.g > e.g && x2.g <= g0).every((x2) => x2.fam);
      x *= x > 0 ? (fam ? 0.55 : 0.3) : 0.85;
    }
    if (e.used) x *= 0.5;
    v += x;
    parts.push({ e, v: x });
  }
  parts.sort((a, b) => b.v - a.v);
  const best = parts[0] && parts[0].v > 0.04 ? parts[0].e : undefined;
  const w = parts[parts.length - 1];
  const worst = w && w.v < -0.04 ? w.e : undefined;
  return { v: clamp(v, -1, 1), best, worst, parts };
}

/** Frase com o motivo, para mostrar em propostas, renovações e brigas. */
export function arcReason(s: GameState, act: Act, e: ArcEv): L {
  const who = e.g < gen(s) ? l(' (com o dono anterior)', ' (with the previous owner)') : l('', '');
  return fmtL(e.w > 0 ? l('{a} lembra: {t}{w}', '{a} remembers: {t}{w}') : l('{a} não esquece: {t}{w}', '{a} has not forgotten: {t}{w}'), { a: act.name, t: e.t, w: who });
}

export function arcMain(s: GameState, act: Act): { w: ArcWeight; e?: ArcEv } {
  const w = arcWeight(s, act);
  return { w, e: w.v >= 0 ? w.best ?? w.worst : w.worst ?? w.best };
}

/** Nome reconhecível do arco (para a ficha e a história do selo). */
export function arcTitle(s: GameState, act: Act): L {
  const list = arcs(s).log[act.id] ?? [];
  const has = (k: string) => list.some((e) => e.k === k);
  const w = arcWeight(s, act).v;
  if (has('backed') && w > 0.25) return l('A aposta que virou lealdade', 'The bet that became loyalty');
  if (has('promise_broken') && w < -0.2) return l('A promessa quebrada', 'The broken promise');
  if (has('masters_sold')) return l('As fitas vendidas', 'The sold masters');
  if (has('left') && act.owner === 'player') return l('O retorno', 'The return');
  if (has('loyal')) return l('Fiel contra a maré', 'Loyal against the tide');
  if (list.filter((e) => e.k === 'number1').length && (has('split') || has('breakdown') || has('scandal'))) return l('Ascensão e queda', 'Rise and fall');
  if (has('dream')) return l('O sonho realizado', 'The dream come true');
  if (has('feud_side') || has('feud_peace')) return l('Entre brigas e lealdades', 'Feuds and loyalties');
  if (w < -0.3) return l('Mágoa acumulada', 'Accumulated grudge');
  if (list.length >= 4) return l('Uma carreira ao seu lado', 'A career at your side');
  return l('Começo de história', 'The story begins');
}

// ---------------------------------------------------------------- fontes

const STORY: Record<string, [L, number]> = {
  number1: [l('Chegou ao #1', 'Hit #1'), 0.04], award: [l('Ganhou um prêmio', 'Won an award'), 0.04], rise: [l('Estourou', 'Broke through'), 0.03],
  masterwork: [l('Fez uma obra-prima', 'Made a masterpiece'), 0.03], hall_of_fame: [l('Entrou para o Hall', 'Entered the Hall'), 0], legend: [l('Virou lenda', 'Became a legend'), 0],
  split: [l('A banda acabou', 'The band ended'), 0], breakdown: [l('Teve uma crise', 'Had a breakdown'), 0], scandal: [l('Viveu um escândalo', 'Went through a scandal'), 0],
  death: [l('Perdeu alguém da banda', 'Lost a bandmate'), 0], reunion: [l('Voltou a tocar junto', 'Reunited'), 0], comeback: [l('Voltou aos palcos', 'Came back'), 0],
  dream: [l('Realizou um sonho', 'Fulfilled a dream'), 0], member_quits: [l('Viu alguém sair', 'Saw someone leave'), 0],
};
chronListeners().push((s: GameState, e: ChronEv) => {
  const st = STORY[e.k];
  if (!st || !e.a) return;
  for (const id of e.a) {
    const a = s.acts[id];
    if (!a || !(a.owner === 'player' || arcs(s).log[id])) continue;
    arcAdd(s, id, e.k, e.t ?? st[0], a.owner === 'player' ? st[1] : 0);
  }
});

const PROM: Record<string, L> = { priority: l('prioridade de lançamento', 'release priority'), tour: l('turnê', 'tour'), freedom: l('liberdade criativa', 'creative freedom') };

function scan(s: GameState): void {
  const st = arcs(s);
  // discos: a aposta só é julgada depois de ~3 meses
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.playerBand) continue;
    for (const rid of a.releases.slice(-6)) {
      const r = s.releases[rid];
      if (!r || r.hist || r.owner !== 'player' || st.seen[rid] || s.week - r.week < 13) continue;
      st.seen[rid] = 1;
      const weak = !r.certified && (r.peak <= 0 || r.peak > 25);
      if ((r.critic ?? 0) >= 72 && weak) arcAdd(s, id, 'backed', fmtL(l('você bancou "{t}" em {y} — vendeu pouco, mas a crítica amou.', 'you backed "{t}" in {y} — it sold little, but critics loved it.'), { t: r.title, y: r.year }), 0.35);
      else if (r.peak === 1) arcAdd(s, id, 'hit', fmtL(l('"{t}" chegou ao #1 com você em {y}.', '"{t}" hit #1 with you in {y}.'), { t: r.title, y: r.year }), 0.08);
      else if ((r.critic ?? 50) < 40 && weak) arcAdd(s, id, 'flop', fmtL(l('"{t}" ({y}) fracassou de crítica e de público.', '"{t}" ({y}) flopped with critics and public.'), { t: r.title, y: r.year }), 0);
    }
  }
  // promessas
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player') continue;
    c.promises.forEach((p, i) => {
      const k = `${c.id}:${i}`;
      if (p.kept === undefined || st.seen[k]) return;
      st.seen[k] = 1;
      arcAdd(s, c.actId, p.kept ? 'promise_kept' : 'promise_broken', fmtL(p.kept ? l('você cumpriu a promessa de {k} em {y}.', 'you kept your promise of {k} in {y}.') : l('você quebrou a promessa de {k} em {y}.', 'you broke your promise of {k} in {y}.'), { k: PROM[p.kind], y: s.year }), p.kept ? 0.2 : -0.4);
    });
  }
}

// aliciamento: a resposta do jogador vira memória
registerDecisionListener('arcs12', (s, ev, opt) => {
  if (ev !== 'poach_attempt') return;
  const d = s.decisions.find((x) => x.eventId === 'poach_attempt');
  const id = d ? String(d.ctx.act) : '';
  const lb = d ? s.labels[String(d.ctx.label)]?.name ?? '?' : '?';
  if (!s.acts[id]) return;
  if (opt === 'match') arcAdd(s, id, 'matched', fmtL(l('você cobriu a oferta de {lb} em {y} para nos manter.', 'you matched {lb}\'s offer in {y} to keep us.'), { lb, y: s.year }), 0.22);
  if (opt === 'hold') arcAdd(s, id, 'held', fmtL(l('você nos segurou pelo contrato quando {lb} chamou, em {y}.', 'you held us to the contract when {lb} called, in {y}.'), { lb, y: s.year }), -0.3);
  if (opt === 'sell') arcAdd(s, id, 'sold', fmtL(l('você vendeu nosso contrato para {lb} em {y}.', 'you sold our contract to {lb} in {y}.'), { lb, y: s.year }), -0.35);
});

// ---------------------------------------------------------------- memória → decisão

registerContractHook('arcs12', {
  offer: (s, act) => {
    const { w, e } = arcMain(s, act);
    if (!e || Math.abs(w.v) < 0.05) return null;
    return { score: w.v * 0.25, reason: arcReason(s, act, e) };
  },
  renew: (s, act) => {
    const { w, e } = arcMain(s, act);
    if (!e || Math.abs(w.v) < 0.05) return 0;
    notify(s, fmtL(l('Pesou na renovação ({d}): {r}', 'Weighed on the renewal ({d}): {r}'), { d: w.v > 0 ? l('a favor', 'in favour') : l('contra', 'against'), r: arcReason(s, act, e) }), w.v > 0 ? 'good' : 'bad');
    return w.v * 0.3;
  },
});

const majorOf = (s: GameState) => Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash)[0];

deferEvents<EventDef>([
  {
    id: 'arc12_loyal', cat: 'contract', tone: 'good', tags: [], cooldown: 3, forcedOnly: true,
    title: l('{act} recusa {labelName}', '{act} turns down {labelName}'),
    text: l('{labelName} ofereceu o dobro para {act} sair no fim do contrato. Eles vieram falar com você antes de responder.', '{labelName} offered {act} double to leave when the contract ends. They came to you before answering.'),
    options: [
      { id: 'fair', label: l('Renovar e subir os royalties (+3 pts)', 'Renew and raise royalties (+3 pts)'), hint: l('Margem menor; a lealdade vira laço.', 'Lower margin; loyalty becomes a bond.'), apply: (s, _r, c) => renewLoyal(s, String(c.act), 0.03) },
      { id: 'renew', label: l('Renovar nos termos atuais', 'Renew on current terms'), hint: l('Eles aceitam — mas gastam um pouco da gratidão.', 'They accept — but spend some of their gratitude.'), apply: (s, _r, c) => renewLoyal(s, String(c.act), 0) },
      { id: 'let', label: l('Liberar para a proposta maior', 'Let them take the bigger offer'), hint: l('Saem no fim do contrato, sem mágoa.', 'They leave at term end, no hard feelings.'), apply: (s, _r, c) => { s.flags[`leaving:${c.act}`] = 1; arcAdd(s, String(c.act), 'released', fmtL(l('você nos liberou para a proposta maior em {y}.', 'you let us take the bigger offer in {y}.'), { y: s.year }), 0.12); } },
    ],
  },
  {
    id: 'arc12_feud', cat: 'people', tone: 'bad', tags: [], cooldown: 4, forcedOnly: true,
    title: l('Briga pública: {person} ({act})', 'Public feud: {person} ({act})'),
    text: l('{person}, de {act}, troca farpas na imprensa com {other}. Todos querem saber de que lado o selo está.', '{person} of {act} is trading jabs in the press with {other}. Everyone wants to know whose side the label is on.'),
    options: [
      { id: 'side', label: l('Defender seu artista em público', 'Defend your artist publicly'), hint: l('Ganha lealdade; o mercado acha deselegante.', 'Earns loyalty; the trade finds it unseemly.'), apply: (s, _r, c) => feudSide(s, c) },
      { id: 'mediate', label: l('Chamar os dois para conversar', 'Bring both to the table'), hint: l('Chance maior se eles confiam no seu histórico.', 'Better odds if they trust your track record.'), apply: (s, r, c) => feudMediate(s, r, c) },
      { id: 'quiet', label: l('Ficar calado', 'Stay quiet'), hint: l('Nada muda — e isso também é lembrado.', 'Nothing changes — and that is remembered too.'), apply: (s, _r, c) => { arcAdd(s, String(c.act), 'feud_quiet', fmtL(l('você ficou calado na briga com {o} em {y}.', 'you stayed quiet in the feud with {o} in {y}.'), { o: String(c.other), y: s.year }), -0.05); } },
    ],
  },
]);

function spend(s: GameState, act: Act): void {
  const b = arcWeight(s, act).best;
  if (b) b.used = 1;
}

function renewLoyal(s: GameState, id: string, roy: number): void {
  const a = s.acts[id];
  const c = a?.contractId ? s.contracts[a.contractId] : undefined;
  if (!a || !c) return;
  c.endWeek = Math.max(c.endWeek, s.week) + Math.round(36 * 4.35);
  c.termMonths += 36;
  c.releasesOwed += 3;
  c.royalty = clamp(c.royalty + roy, 0, 0.6);
  c.fameAtSign = Math.round(a.fame * 10) / 10;
  c.lastRenegWeek = s.week;
  a.trust = clamp(a.trust + (roy ? 12 : 3), 0, 100);
  if (!roy) spend(s, a);
  arcAdd(s, id, 'loyal', fmtL(l('recusamos {lb} em {y} para ficar com você.', 'we turned down {lb} in {y} to stay with you.'), { lb: majorOf(s)?.name ?? '?', y: s.year }), roy ? 0.15 : 0.05);
  notify(s, fmtL(l('{a} renovou por 3 anos, recusando uma proposta maior.', '{a} renewed for 3 years, turning down a bigger offer.'), { a: a.name }), 'good');
}

function feudSide(s: GameState, c: Record<string, string | number>): void {
  const a = s.acts[String(c.act)];
  if (!a) return;
  a.trust = clamp(a.trust + 8, 0, 100);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
  arcAdd(s, a.id, 'feud_side', fmtL(l('você ficou do nosso lado na briga com {o} em {y}.', 'you took our side in the feud with {o} in {y}.'), { o: String(c.other), y: s.year }), 0.2);
  const ob = s.acts[String(c.otherAct)];
  if (ob && ob.owner === 'player') {
    ob.trust = clamp(ob.trust - 10, 0, 100);
    arcAdd(s, ob.id, 'feud_against', fmtL(l('o selo tomou o lado de {a} contra nós em {y}.', 'the label sided with {a} against us in {y}.'), { a: a.name, y: s.year }), -0.3);
  }
}

/** Chance de apaziguar: base + histórico (os dois lados, se ambos forem seus). */
export function mediateChance(s: GameState, actId: string, otherAct?: string): number {
  const a = s.acts[actId];
  const ob = otherAct ? s.acts[otherAct] : undefined;
  const w = a ? arcWeight(s, a).v : 0;
  const w2 = ob && ob.owner === 'player' ? arcWeight(s, ob).v : 0;
  return clamp(0.3 + w * 0.6 + w2 * 0.3 + (s.player.reputation.artists - 50) / 250, 0.08, 0.92);
}

function feudMediate(s: GameState, r: Rng, c: Record<string, string | number>): void {
  const a = s.acts[String(c.act)];
  if (!a) return;
  const ok = r.chance(mediateChance(s, a.id, String(c.otherAct)));
  const t = social(s).ties.find((x) => (x.a === c.person && x.b === c.op) || (x.b === c.person && x.a === c.op));
  if (ok) {
    if (t) { t.k = 'rival'; t.v = Math.max(t.v, -20); t.pub = undefined; }
    arcAdd(s, a.id, 'feud_peace', fmtL(l('você apaziguou a briga com {o} em {y}.', 'you settled the feud with {o} in {y}.'), { o: String(c.other), y: s.year }), 0.12);
    notify(s, fmtL(l('A conversa funcionou: {a} e {o} fizeram as pazes em público.', 'The talk worked: {a} and {o} made peace in public.'), { a: a.name, o: String(c.other) }), 'good');
  } else {
    arcAdd(s, a.id, 'feud_muzzle', fmtL(l('você tentou nos calar na briga com {o} em {y}.', 'you tried to muzzle us in the feud with {o} in {y}.'), { o: String(c.other), y: s.year }), -0.12);
    a.trust = clamp(a.trust - 5, 0, 100);
    notify(s, fmtL(l('{a} não quis papo: a briga com {o} continua.', '{a} would not listen: the feud with {o} goes on.'), { a: a.name, o: String(c.other) }), 'bad');
  }
}

function addText(s: GameState, ev: string, extra: L): void {
  const d = s.decisions.filter((x) => x.eventId === ev).pop();
  if (d) d.text = { pt: `${d.text.pt} ${extra.pt}`, en: `${d.text.en} ${extra.en}` };
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'arcs12', (s) => {
  if (s.ended) return;
  const st = arcs(s);
  const r = Rng.fromSeed(`arcs12:${s.config.seed}:${s.year}:${s.month}`);
  scan(s);
  // sucessão: o herdeiro herda lealdades e ressentimentos
  const g = gen(s);
  if (!st.gen) st.gen = g;
  else if (g !== st.gen) {
    const o = ownerOf(s);
    const prev = st.succ.length ? st.succ[st.succ.length - 1].to : l('o fundador', 'the founder').pt;
    const lin = (s.x4 as unknown as { heirs8?: { lineage: { name: string }[] } }).heirs8?.lineage ?? [];
    const from = lin.length ? lin[lin.length - 1].name : prev;
    const fam = (st.fam ?? []).includes(o.name);
    st.succ.push({ y: s.year, g, fam, from, to: o.name });
    st.gen = g;
    let loyal = 0; let grudge = 0;
    for (const id of playerActs(s)) {
      const a = s.acts[id];
      if (!a || a.playerBand) continue;
      const w = arcWeight(s, a).v;
      if (w > 0.1) loyal++;
      if (w < -0.1) { grudge++; a.trust = clamp(a.trust - 6, 0, 100); }
      arcAdd(s, id, 'succession', fmtL(w < -0.1 ? l('{n} assumiu o selo em {y} — e herdou a mágoa que tínhamos de {f}.', '{n} took over in {y} — and inherited the grudge we held against {f}.') : w > 0.1 ? l('{n} assumiu o selo em {y}; ainda lembramos do que {f} fez por nós.', '{n} took over in {y}; we still remember what {f} did for us.') : l('{n} assumiu o selo em {y}.', '{n} took over in {y}.'), { n: o.name, f: from, y: s.year }), 0);
    }
    notify(s, fmtL(l('Herança invisível: {l} artista(s) mantêm a lealdade a {f}; {g} trazem ressentimentos que agora são seus.', 'Invisible inheritance: {l} act(s) keep their loyalty to {f}; {g} bring grudges that are now yours.'), { l: loyal, g: grudge, f: from }), grudge > loyal ? 'bad' : 'event');
  }
  { const o = ownerOf(s); const pt = (s.x4 as unknown as { life?: { partner?: { name: string } | null } }).life?.partner; st.fam = [...o.kids.map((k) => k.name), ...(o.spouse ? [o.spouse] : []), ...(pt ? [pt.name] : [])]; }
  // fim de contrato com proposta maior: o histórico decide se vêm falar com você primeiro
  if (!s.decisions.some((d) => d.eventId === 'arc12_loyal')) {
    for (const id of playerActs(s)) {
      const a = s.acts[id];
      const c = a?.contractId ? s.contracts[a.contractId] : undefined;
      if (!a || !c || a.playerBand || c.party !== 'player' || a.fame < 15 || st.seen[`loyal:${c.id}`]) continue;
      const left = c.endWeek - s.week;
      if (left > 13 || left < 3) continue;
      st.seen[`loyal:${c.id}`] = 1;
      const { w, e } = arcMain(s, a);
      const mj = majorOf(s);
      if (!mj || w.v < 0.25 || !e || !r.chance(0.4 + w.v)) continue;
      emitEvent(s, r, 'arc12_loyal', { act: a.id, label: mj.id });
      addText(s, 'arc12_loyal', fmtL(l('Por quê? {r}', 'Why? {r}'), { r: arcReason(s, a, e) }));
      break;
    }
  }
  // aliciamento em aberto: quem lembra do que você fez recusa sozinho; quem tem mágoa avisa
  const pd = s.decisions.find((d) => d.eventId === 'poach_attempt' && !st.seen[`poach:${d.id}`]);
  if (pd) {
    st.seen[`poach:${pd.id}`] = 1;
    const a = s.acts[String(pd.ctx.act)];
    const lb = s.labels[String(pd.ctx.label)]?.name ?? '?';
    if (a) {
      const { w, e } = arcMain(s, a);
      if (e && w.v >= 0.35 && r.chance(0.35 + w.v * 0.6)) {
        s.decisions = s.decisions.filter((x) => x !== pd);
        a.trust = clamp(a.trust + 5, 0, 100);
        spend(s, a);
        arcAdd(s, a.id, 'loyal', fmtL(l('recusamos {lb} em {y}, mesmo pagando mais.', 'we turned down {lb} in {y}, even for more money.'), { lb, y: s.year }), 0.1);
        notify(s, fmtL(l('{a} recusou a proposta de {lb} sem você pedir. {r}', '{a} turned down {lb}\'s offer without you asking. {r}'), { a: a.name, lb, r: arcReason(s, a, e) }), 'good');
      } else if (e && Math.abs(w.v) >= 0.08) {
        pd.text = fmtL(l('{t} Histórico: {r}', '{t} History: {r}'), { t: pd.text, r: arcReason(s, a, e) });
      }
    }
  }
  // brigas públicas recentes do elenco viram decisão (uma por vez)
  if (!s.decisions.some((d) => d.eventId === 'arc12_feud') && (s.eventCooldowns.arc12_feud ?? 0) <= s.week) {
    const mine = new Map<string, string>();
    for (const id of playerActs(s)) for (const p of s.acts[id]?.members ?? []) mine.set(p, id);
    for (const t of social(s).ties) {
      if (t.k !== 'feud' || !t.pub || s.week - t.w > 6) continue;
      const me = mine.has(t.a) ? t.a : mine.has(t.b) ? t.b : '';
      if (!me) continue;
      const key = `feud:${t.a}:${t.b}:${t.y}`;
      if (st.seen[key]) continue;
      st.seen[key] = 1;
      const op = me === t.a ? t.b : t.a;
      const actId = mine.get(me)!;
      const oAct = mine.get(op) ?? Object.values(s.acts).find((x) => x.members.includes(op))?.id ?? '';
      emitEvent(s, r, 'arc12_feud', { act: actId, person: me, op, other: s.persons[op]?.name ?? '?', otherAct: oAct });
      const a = s.acts[actId];
      const { e } = arcMain(s, a);
      const pc = Math.round(mediateChance(s, actId, oAct) * 10) * 10;
      addText(s, 'arc12_feud', fmtL(l('Conversa: ~{p}% de chance{r}', 'Talk: ~{p}% chance{r}'), { p: pc, r: e ? fmtL(l(' — {x}', ' — {x}'), { x: arcReason(s, a, e) }) : l('.', '.') }));
      break;
    }
  }
});

/** Para a venda de fitas-mestras (life12): artistas lembram. */
export function mastersSold(s: GameState, actIds: string[], buyer: string): void {
  for (const id of new Set(actIds)) arcAdd(s, id, 'masters_sold', fmtL(l('você vendeu nossas fitas-mestras para {b} em {y}.', 'you sold our masters to {b} in {y}.'), { b: buyer, y: s.year }), -0.3);
}
export function mastersKept(s: GameState, actIds: string[]): void {
  for (const id of new Set(actIds)) arcAdd(s, id, 'masters_kept', fmtL(l('mesmo apertado, você não vendeu nossas fitas-mestras ({y}).', 'even when broke, you did not sell our masters ({y}).'), { y: s.year }), 0.12);
}
