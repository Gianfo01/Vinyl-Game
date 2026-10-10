// Rodada 17 — PONTES e LIGAÇÕES da fundação. (1) remember()/chron9/press9 também publicam Facts, sem mudar
// comportamento nem sorteios; Facts de qualquer sistema que ficam públicos viram boato no press9. (2) Adaptadores
// do livro de obrigações: segredos de intrigue.ts e de people/ (dois tipos antigos), dívidas pessoais e promessas
// (quebrada → mágoa; cumprida → lealdade). (3) Estresse único: desgaste de longo prazo, quebra que dispara as
// mecânicas existentes. (4) Ligações do audit17 §3 (cada uma com rótulo/"porquê" visível na interface).

import { Rng, clamp } from '../../core/rng';
import { l } from '../../data/world';
import { registerMod, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact, onFact, raiseVisibility, recentFacts, facts17, type FactKind } from '../facts17';
import { histLocked } from '../history15';
import { allHolds, grantHold, holds17, holdsOf, leverage, registerHoldSource, setDefaultHoldEffect, type Hold } from '../holds17';
import { lastScandal, scandal, type ScandalKind } from '../scandal17';
import { addStress, relieveLong, setStressVuln, shortOf, stress17, stressMonthStep, breakChance17, vulnOf } from '../stress17';
import type { Act, GameState, MemoryEntry, Person } from '../types';
import { fmtL, money, notify, playerActs, post, rememberListeners } from '../util';
import { juryMemHook } from './awards15';
import { KIND_IMP, chronListeners, type ChronEv } from './chron9';
import { fameIn, homeA3, myA3 } from './fame16';
import { SECRETS, exposeSecret, intrigue, knownSecrets, targetName, useHook } from './intrigue';
import { worldDramaOk } from './pace9';
import { triggerBreakdown } from './people/breakdowns';
import { SECRET_NAME, leakSecret, ownerLabel, pressureCeo } from './people/secrets';
import { P, actOf, healthOf } from './people/state';
import { opine } from './persona13';
import { press } from './press9';
import { soul } from './soul9';
import { LENDERS, vices } from './vices';

// ================================================================ 1. pontes de fatos

/** chron/memória → tipo de Fact */
const KMAP: Record<string, FactKind> = {
  number1: 'chart', no1_country: 'chart', award: 'award', award2: 'award', nat_award: 'award', hall_of_fame: 'award', hall: 'award', ai_award: 'award',
  death: 'death', split: 'split', scandal: 'scandal', era_scandal: 'scandal', voice_scandal: 'scandal', cover_scandal: 'scandal', org12_scandal: 'scandal',
  breakdown: 'breakdown', addiction: 'addiction', rehab: 'rehab', treatment: 'rehab', signed: 'signing', contest_signed: 'signing', scene_sign: 'signing', rival_sign: 'signing',
  release: 'release', member_quits: 'exit', staff_leaves: 'exit', fired: 'exit', poach: 'poach', sniped: 'poach', romance: 'romance', breakup: 'breakup', separation: 'breakup',
  birth: 'birth', lawsuit: 'case_ruling', verdict: 'case_ruling', secret_leak: 'secret_exposed', exposed: 'secret_exposed', blackmail_exposed: 'secret_exposed',
  spy_exposed: 'secret_exposed', scheme_caught: 'secret_exposed', payola: 'scandal', payola9: 'scandal', chart_rig: 'scandal', speech: 'statement', era_stance: 'statement',
  law: 'law', boycott: 'boycott', label_closed: 'label_sold', acquisition: 'label_sold', merger: 'label_sold', masters_sold: 'deal', songsale: 'deal', deal: 'deal',
  tour_accident: 'tour_cancel', cancelled: 'tour_cancel', injury: 'health', voice_nodes: 'health', hearing: 'health', stage_incident: 'show', legendary_show: 'show',
};
const GOODK = new Set(['chart', 'award', 'signing', 'release', 'romance', 'birth', 'marriage', 'masterpiece', 'masterwork', 'record', 'rise', 'reunion', 'comeback', 'supergroup', 'band_formed', 'legend']);
const BADK = new Set(['death', 'split', 'scandal', 'breakdown', 'addiction', 'secret_exposed', 'tour_cancel', 'health', 'breakup', 'exit', 'poach', 'trance_denied', 'label_sold', 'case_ruling']);
const tagsOf = (k: string): string[] => [GOODK.has(k) ? 'good' : BADK.has(k) ? 'bad' : 'neutral'];

const LOWK = new Set(['rise', 'move', 'dream', 'relic', 'rival_contest', 'retired', 'lineup']);
chronListeners().push((s: GameState, e: ChronEv) => {
  if ((e.i < 2 || (e.i < 3 && LOWK.has(e.k))) && !e.a?.some((id) => s.acts[id]?.owner === 'player')) return; // miudezas do mundo ficam só na crônica
  const kind = KMAP[e.k] ?? e.k;
  emitFact(s, { kind, actors: e.a ?? [], place: e.c, severity: e.i * 20, visibility: 'public', tags: [...tagsOf(kind), `chron:${e.k}`], text: e.t, src: 'chron', data: { bridged: 1, i: e.i } });
});
const SKIP_MEM = new Set(['people16', 'leisure14', 'session', 'project', 'year', 'talk', 'pitch', 'gigs', 'decision', 'event']);
rememberListeners().push((s: GameState, e: MemoryEntry) => {
  if (KIND_IMP[e.kind]) return; // já vira fato pela crônica
  const base = e.kind.split(':')[0];
  if (SKIP_MEM.has(base)) return;
  const kind = KMAP[e.kind];
  if (!kind && !e.important) return;
  emitFact(s, { kind: kind ?? 'memory', actors: e.actId ? [e.actId] : [], place: e.actId ? s.acts[e.actId]?.city : undefined, severity: e.important ? 50 : 25, visibility: 'public', tags: [...tagsOf(kind ?? ''), `mem:${e.kind}`], text: e.text, src: 'memory', cause: e.causeIds, data: { bridged: 1 } });
});

// Facts públicos de sistemas novos (crime, sexualidade, NPCs…) também viram boato que viaja (press9).
onFact('*', (s, f) => {
  if (f.src === 'chron' || f.src === 'memory' || f.visibility === 'secret' || f.severity < 45 || !f.place) return;
  const p = press(s);
  if (p.rum.some((r) => r.w === s.week && r.t.pt === f.text.pt)) return;
  const tone = f.tags.includes('good') ? 1 : f.tags.includes('bad') ? -1 : 0;
  const actId = f.actors.find((id) => s.acts[id]);
  p.rum.push({ id: `r${++p.seq}`, t: f.text, a: actId, c0: f.place, cs: [f.place], d: f.visibility === 'rumor' ? 1 : 0, tone, y: s.year, w: s.week, i: Math.max(3, Math.round(f.severity / 20)) });
  if (p.rum.length > 40) { let k = 0; for (let j = 1; j < p.rum.length; j++) if ((p.rum[j].i ?? 3) < (p.rum[k].i ?? 3)) k = j; p.rum.splice(k, 1); }
}, 'bridge17:press');

/** press9 → visibilidade: boato que nasce eleva o fato a "boato"; manchete eleva a "público". */
function pressSync(s: GameState): void {
  const p = press(s);
  const st = facts17(s);
  const recent = st.f.slice(-160);
  const byText = new Map<string, (typeof recent)[number]>();
  for (const f of recent) byText.set(f.text.pt, f);
  for (const r of p.rum) { const f = byText.get(r.t.pt); if (f) { raiseVisibility(f, r.cs.length >= 3 ? 'public' : 'rumor'); f.place ??= r.c0; } }
  for (const h of p.hl) if (h.y === s.year && h.m === s.month) { const f = byText.get(h.t.pt); if (f) raiseVisibility(f, 'public'); }
}

// ================================================================ 2. livro de obrigações: adaptadores

const ADJ: Record<string, ScandalKind> = { addiction: 'drugs', affair: 'sex', plagiarism: 'money', tax: 'money', fake_bio: 'conduct', payola: 'money', fake_sales: 'money', unpaid_royalties: 'money', ceo_affair: 'sex', debts: 'money', side_deal: 'conduct', child: 'sex', debt: 'money' };

registerHoldSource('intrigue', {
  list: (s) => knownSecrets(s).map((sec): Hold => ({
    id: `x:intrigue:${sec.id}`, holder: 'player', target: sec.target.id, kind: 'secret', strength: SECRETS[sec.kind].criminal ? 70 : 40, proof: 1,
    text: fmtL(l('{t}: {k}', '{t}: {k}'), { t: targetName(s, sec.target), k: SECRETS[sec.kind].name }), w: 0, uses: sec.usedWeek !== undefined ? 1 : 0, ...(sec.usedWeek !== undefined ? { lastUse: sec.usedWeek } : {}), status: 'open', ref: sec.id, data: { sk: sec.kind },
  })),
  use: (s, h, verb) => {
    const id = String(h.ref);
    if (verb === 'expose') return exposeSecret(s, id) ?? fmtL(l('Você expôs: {t}.', 'You exposed: {t}.'), { t: h.text });
    if (verb !== 'blackmail') return l('Segredo: só chantagem ou exposição.', 'Secret: blackmail or exposure only.');
    const isAct = !!s.acts[h.target];
    const use = isAct ? (s.acts[h.target].owner === 'player' ? 'loyalty' : 'offer') : 'cash';
    const err = useHook(s, Rng.fromSeed(`${s.config.seed}:hold17i:${id}:${s.week}`), id, use);
    return err ?? fmtL(l('Chantagem com {t}: {u}.', 'Blackmail with {t}: {u}.'), { t: h.text, u: isAct ? (use === 'loyalty' ? l('lealdade exigida', 'loyalty demanded') : l('próxima oferta pesa mais', 'next offer weighs more')) : l('eles pagaram', 'they paid') });
  },
});

registerHoldSource('people', {
  list: (s) => {
    const out: Hold[] = [];
    for (const sec of P(s).secrets) {
      if (sec.leaked) continue;
      const tgt = sec.owner === 'owner' ? 'player' : sec.owner.startsWith('label:') ? sec.owner.slice(6) : sec.owner;
      const text = fmtL(l('{w}: {k}', '{w}: {k}'), { w: ownerLabel(s, sec), k: SECRET_NAME[sec.kind] });
      const base = { kind: 'secret' as const, strength: 25 + sec.severity * 20, proof: 1 as const, text, w: 0, uses: sec.used, status: 'open' as const, ref: sec.id, data: { sk: sec.kind, sev: sec.severity } };
      if (sec.known && sec.owner !== 'owner') out.push({ ...base, id: `x:people:${sec.id}`, holder: 'player', target: tgt });
      for (const k of sec.knownBy) if (k !== 'press' && s.labels[k]) out.push({ ...base, id: `x:people:${sec.id}:${k}`, holder: k, target: tgt });
    }
    return out;
  },
  use: (s, h, verb) => {
    const sec = P(s).secrets.find((x) => x.id === h.ref);
    if (!sec || h.holder !== 'player') return l('Segredo indisponível.', 'Secret unavailable.');
    if (verb === 'expose') { leakSecret(s, sec, l('Uma fonte anônima', 'An anonymous source')); return fmtL(l('Vazou: {t}.', 'Leaked: {t}.'), { t: h.text }); }
    if (verb !== 'blackmail') return l('Segredo: só chantagem ou exposição.', 'Secret: blackmail or exposure only.');
    if (sec.owner.startsWith('label:')) return pressureCeo(s, Rng.fromSeed(`${s.config.seed}:hold17p:${sec.id}:${s.week}`), sec.id, 'cash');
    if (sec.used >= 2) return l('Esse segredo já foi usado demais.', 'That secret is used up.');
    sec.used++;
    return null; // efeito padrão (lealdade/pressão em oferta) + risco de vazar
  },
});

registerHoldSource('loans', {
  list: (s) => (vices(s)?.loans ?? []).map((ln): Hold => ({
    id: `x:loans:${ln.id}`, holder: `lender:${ln.lender}`, target: 'player', kind: 'debt', strength: clamp(30 + ln.missed * 20 + (ln.lender === 'shark' ? 25 : 0), 1, 100),
    text: fmtL(l('{n}: você deve {v}', '{n}: you owe {v}'), { n: LENDERS[ln.lender].name, v: `$${Math.round(ln.balance / 100).toLocaleString('en-US')}` }), w: Math.max(0, ln.since), uses: 0, status: 'open', ref: ln.id,
  })),
});

const isPlayerAct = (s: GameState, id: string): boolean => s.acts[id]?.owner === 'player';
/** Efeito padrão dos verbos para holds nativos (e segredos de pessoas): confiança, opinião, rivalidade, caixa. */
setDefaultHoldEffect((s, h, verb, r) => {
  const a = s.acts[h.target], lb = s.labels[h.target], pp = s.persons[h.target];
  const pAct = pp ? actOf(s, pp.id) : undefined;
  if (verb === 'forgive') {
    if (h.holder === 'player' && a) a.trust = clamp(a.trust + 10, 0, 100);
    if (pp && h.holder === 'player') opine(s, `p:${pp.id}`, 10, l('foi perdoado(a) por você.', 'was forgiven by you.'));
    if (s.persons[h.holder]) addStress(s, h.holder, -6, l('Perdoou e seguiu em frente', 'Forgave and moved on'));
    return fmtL(l('Perdão: {t}. A relação melhora.', 'Forgiven: {t}. The relationship improves.'), { t: h.text });
  }
  if (h.holder !== 'player') return null;
  if (verb === 'call') {
    if (h.kind === 'debt') {
      const v = Number(h.data?.amt ?? money(s, 1500 + h.strength * 60));
      if (lb) lb.cash -= v;
      post(s, `hold17:${h.id}`, v, 'other_income', 'Cobrança de dívida');
      return fmtL(l('Dívida cobrada: entraram {v}.', 'Debt collected: {v} came in.'), { v: `$${Math.round(v / 100).toLocaleString('en-US')}` });
    }
    if (a) { a.trust = clamp(a.trust + 12, 0, 100); if (!isPlayerAct(s, a.id)) intrigue(s).offerHooks[a.id] = s.week + 26; }
    if (lb) s.rivalries[lb.id] = Math.max(0, (s.rivalries[lb.id] ?? 0) - 15);
    if (pp) { opine(s, `p:${pp.id}`, -4, l('pagou um favor que devia.', 'repaid a favor owed.')); if (pAct && !isPlayerAct(s, pAct.id)) intrigue(s).offerHooks[pAct.id] = s.week + 26; }
    return fmtL(l('Favor cobrado: {t}. Eles cumprem (confiança/negociação a seu favor).', 'Favor called in: {t}. They deliver (trust/negotiation in your favor).'), { t: h.text });
  }
  if (verb === 'blackmail') {
    const leak = r.chance(0.2 + (h.uses ?? 0) * 0.1 - (h.proof ?? 0) * 0.04);
    if (lb) { const v = Math.min(Math.max(0, lb.cash) * 0.08, money(s, 5000 + h.strength * 120)); lb.cash -= v; post(s, `hold17b:${h.id}`, Math.round(v), 'other_income', 'Acordo confidencial'); s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 15; }
    const tgtAct = a ?? pAct;
    if (tgtAct) { if (isPlayerAct(s, tgtAct.id)) tgtAct.trust = clamp(tgtAct.trust + 15, 0, 100); else intrigue(s).offerHooks[tgtAct.id] = s.week + 26; if (pp) pp.resentment = clamp(pp.resentment + 12, 0, 100); }
    if (leak) {
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 10, 0, 100);
      emitFact(s, { kind: 'secret_exposed', actors: ['player', h.target], severity: 65, visibility: 'public', tags: ['bad', 'blackmail'], text: fmtL(l('{c} é acusado de chantagem ({t}).', '{c} is accused of blackmail ({t}).'), { c: s.config.companyName, t: h.text }), src: 'holds17', place: s.config.homeCity });
      notify(s, l('A chantagem vazou: reputação institucional −10.', 'The blackmail leaked: institutional reputation −10.'), 'bad');
      return l('Chantagem feita, mas vazou.', 'Blackmail done, but it leaked.');
    }
    return fmtL(l('Chantagem: {t}. Funcionou — por ora.', 'Blackmail: {t}. It worked — for now.'), { t: h.text });
  }
  if (verb === 'expose') {
    const kind = ADJ[String(h.data?.sk ?? '')] ?? 'conduct';
    const tgtAct = a ?? pAct;
    if (tgtAct) scandal(s, tgtAct.id, kind, 30 + h.strength / 2, fmtL(l('Vem à tona: {t}.', 'It comes out: {t}.'), { t: h.text }), { person: pp?.id });
    if (lb) lb.reputation = clamp(lb.reputation - 10, 0, 100);
    return fmtL(l('Exposto: {t}.', 'Exposed: {t}.'), { t: h.text });
  }
  return null;
});

/** Promessas (people/): quebrada → mágoa contra você; cumprida → lealdade. */
function promisesToHolds(s: GameState): void {
  const st = holds17(s);
  for (const pr of P(s).promises ?? []) {
    if (pr.status === 'open' || st.cv[pr.id]) continue;
    st.cv[pr.id] = 1;
    const p = s.persons[pr.personId];
    if (!p) continue;
    if (pr.status === 'broken') grantHold(s, { holder: p.id, target: 'player', kind: 'grievance', strength: 45, months: 36, src: 'promise', ref: pr.id, text: fmtL(l('{p}: promessa quebrada ({k})', '{p}: broken promise ({k})'), { p: p.name, k: pr.kind }) });
    else grantHold(s, { holder: 'player', target: p.id, kind: 'loyalty', strength: 30, months: 36, src: 'promise', ref: pr.id, text: fmtL(l('{p}: você cumpriu a promessa ({k})', '{p}: you kept your promise ({k})'), { p: p.name, k: pr.kind }), quiet: true });
  }
  const keys = Object.keys(st.cv);
  if (keys.length > 400) for (const k of keys.slice(0, keys.length - 300)) delete st.cv[k];
}

// ================================================================ 3. estresse único

setStressVuln((s, p) => {
  const { f } = soul(s, p);
  return clamp(0.5 + (f.ansiedade - 50) / 160 + (f.melancolia - 50) / 220 - (f.coragem - 50) / 220 - (f.confianca - 50) / 220 - ((p.persona?.resilience ?? 50) - 50) / 250, 0.05, 0.95);
});

const singer = (p: Person) => p.role === 'vocal' || p.role === 'mc';
const filtered = (s: GameState, a: Act): boolean => !!a.rs || s.config.contentFilters.some((t) => t === 'drugs' || t === 'health');

/** Quem o estresse único acompanha: seu elenco, você e os atos notáveis do mundo. */
function tracked(s: GameState): [Person, Act | undefined][] {
  const out: [Person, Act | undefined][] = [];
  const seen = new Set<string>();
  const mine = new Set(playerActs(s));
  for (const a of Object.values(s.acts)) {
    if (a.status !== 'active' && a.status !== 'emerging' && a.status !== 'hiatus') continue;
    if (!mine.has(a.id) && a.fame < 35) continue;
    for (const id of a.members) { const p = s.persons[id]; if (p?.alive && !seen.has(id)) { seen.add(id); out.push([p, a]); } }
  }
  const me = Object.values(s.persons).find((p) => p.isPlayer && p.alive);
  if (me && !seen.has(me.id)) out.push([me, undefined]);
  return out;
}

const LBL = {
  fatigue: l('Cansaço acumulado', 'Accumulated fatigue'), ill: l('Saúde abalada', 'Poor health'), voice: l('Voz no limite', 'Voice at its limit'),
  injury: l('Lesão', 'Injury'), grudge: l('Mágoa com o selo', 'Grudge against the label'), grief: l('Luto', 'Grief'),
};

function stressMonth(s: GameState): void {
  const r = Rng.fromSeed(`${s.config.seed}:stress17:${s.week}`);
  const st = stress17(s);
  const grudges = new Set(holdsOf(s, 'player').owes.filter((h) => h.kind === 'grievance' && h.strength >= 30).map((h) => h.holder));
  for (const [p, a] of tracked(s)) {
    const mine = !!a && a.owner === 'player';
    if (mine) {
      const h = P(s).health[p.id];
      if (p.fatigue > 75) addStress(s, p.id, 2, LBL.fatigue);
      if (p.health === 'burnout' || p.health === 'ill') addStress(s, p.id, 3, LBL.ill);
      if (h && singer(p) && h.voice > 70 && !h.nodes) addStress(s, p.id, 1, LBL.voice);
      if (h && h.injuryWeeks > 0) addStress(s, p.id, 2, LBL.injury);
      if (grudges.has(p.id)) addStress(s, p.id, 2, LBL.grudge);
      // estresse alimenta a dependência de quem já teve problema (liga com people/health)
      if (h?.history && shortOf(s, p).v > 75 && !filtered(s, a!)) h.dependency = clamp(h.dependency + 3, 0, 100);
    }
    const breaking = stressMonthStep(s, p);
    if (!breaking || st.lb[p.id] === s.year || !a) continue;
    const c = breakChance17(shortOf(s, p).v, st.l[p.id] ?? 0, vulnOf(s, p));
    if (!r.chance(c)) continue;
    if (!mine && (histLocked(s, a) || !worldDramaOk(s, r, 2))) continue;
    breakdown17(s, r, p, a, mine);
  }
  for (const k of Object.keys(st.why)) { st.why[k] = st.why[k].filter((x) => s.week - x[0] < 26); if (!st.why[k].length) delete st.why[k]; }
  for (const k of Object.keys(st.lb)) if (s.year - st.lb[k] > 3) delete st.lb[k];
  for (const k of Object.keys(st.l)) if (!s.persons[k]?.alive) delete st.l[k];
}

/** Quebra: curto E longo altos. Usa as mecânicas existentes (colapso do elenco; vício, burnout ou surto para NPCs). */
function breakdown17(s: GameState, r: Rng, p: Person, a: Act, mine: boolean): void {
  const st = stress17(s);
  st.lb[p.id] = s.year;
  st.l[p.id] = clamp((st.l[p.id] ?? 0) - 20, 0, 100);
  const why = l('Estresse curto e longo no limite', 'Short- and long-term stress at the limit');
  if (mine) {
    const k = triggerBreakdown(s, r, p, a);
    addStress(s, p.id, -25, why);
    emitFact(s, { kind: 'breakdown', actors: [p.id, a.id], place: a.city, severity: 45, visibility: 'rumor', tags: ['bad', 'stress', k], text: fmtL(l('{p} ({a}) quebrou sob pressão.', '{p} ({a}) cracked under pressure.'), { p: p.name, a: a.name }), src: 'stress17' });
    return;
  }
  const { f, v } = soul(s, p);
  addStress(s, p.id, -25, why);
  if (f.impulsividade > 60 || f.ego > 66) { scandal(s, a.id, 'meltdown', 45, fmtL(l('{p} ({a}) tem um surto em público.', '{p} ({a}) melts down in public.'), { p: p.name, a: a.name }), { person: p.id }); return; }
  if (v.prazer > 60 && p.health === 'ok' && !filtered(s, a)) {
    p.health = 'addiction';
    emitFact(s, { kind: 'addiction', actors: [p.id, a.id], place: a.city, severity: 45, visibility: 'rumor', tags: ['bad', 'stress', 'drugs'], text: fmtL(l('{p} ({a}) foge da pressão nos excessos.', '{p} ({a}) escapes the pressure through excess.'), { p: p.name, a: a.name }), src: 'stress17' });
    return;
  }
  p.health = p.health === 'ok' ? 'burnout' : p.health;
  a.hiatusUntil = Math.max(a.hiatusUntil ?? 0, s.week + 8);
  emitFact(s, { kind: 'health', actors: [p.id, a.id], place: a.city, severity: 35, visibility: 'public', tags: ['bad', 'stress', 'burnout'], text: fmtL(l('Esgotado(a), {p} tira {a} de cena por dois meses.', 'Burnt out, {p} takes {a} off the road for two months.'), { p: p.name, a: a.name }), src: 'stress17' });
}

// luto: morte de colega/parente pesa no estresse de quem fica (liga com kin15/lineup)
onFact('death', (s, f) => {
  const dead = new Set(f.actors.filter((id) => s.persons[id] && !s.persons[id].alive));
  if (!dead.size) return;
  for (const a of Object.values(s.acts)) {
    if (!f.actors.includes(a.id) && !a.members.some((m) => dead.has(m))) continue;
    for (const m of a.members) if (!dead.has(m)) addStress(s, m, 15, fmtL(l('{l}: perdeu {d}', '{l}: lost {d}'), { l: LBL.grief, d: [...dead].map((id) => s.persons[id]?.name).join(', ') }));
  }
}, 'bridge17:grief');

// ================================================================ 4. ligações (audit17 §3)

const membersOf = (s: GameState, a?: Act): Person[] => (a ? a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive) : []);

// §3.1 #2 — estresse da banda → qualidade das faixas
registerMod('songQ', 'stress17', (s, v, { act }) => {
  const ms = membersOf(s, act);
  if (!ms.length) return null;
  const st = ms.reduce((t, p) => t + shortOf(s, p).v, 0) / ms.length;
  const ins = ms.reduce((t, p) => t + p.inspiration, 0) / ms.length;
  if (st > 70) return { value: v * 0.94, label: fmtL(l('Banda estressada (média {x}): −6% na faixa', 'Stressed band (avg {x}): −6% on the track'), { x: Math.round(st) }) };
  if (st < 30 && ins > 70) return { value: v * 1.04, label: l('Banda leve e inspirada: +4%', 'Relaxed, inspired band: +4%') };
  return null;
});
// §3.1 #1 — saúde/estresse → turnê: risco de incidente e cachê (voz cansada antes dos calos; tensão no palco)
registerMod('tourRisk', 'stress17', (s, v, { act }) => {
  const ms = membersOf(s, act);
  if (!ms.length || act?.owner !== 'player') return null;
  let add = 0;
  for (const p of ms) {
    const sh = shortOf(s, p).v;
    if (sh > 75) add += (sh - 75) * 0.0008;
    const h = P(s).health[p.id];
    if (h && singer(p) && h.voice > 70 && !h.nodes) add += (h.voice - 70) * 0.0006;
  }
  return add > 0.001 ? { value: v + add, label: l('Estresse e voz cansada (risco de incidente)', 'Stress and a tired voice (incident risk)') } : null;
});
registerMod('showRevenue', 'stress17', (s, v, { act }) => {
  if (act?.owner !== 'player') return null;
  let k = 1;
  for (const p of membersOf(s, act)) {
    const h = P(s).health[p.id];
    if (h && singer(p) && h.voice > 70 && !h.nodes && !h.treatment) k *= 1 - Math.min(0.1, (h.voice - 70) / 300);
    if (shortOf(s, p).v > 85) k *= 0.97;
  }
  return k < 0.995 ? { value: v * k, label: l('Noite ruim: voz cansada/estresse no palco', 'Rough night: tired voice/stress on stage') } : null;
});

// §3.2 #8 — fama regional → aceitação de oferta (estrela no seu país cobra caro; quem quer entrar no seu mercado cede)
registerOfferMod('fame17', (s, act) => {
  const me = myA3(s);
  if (!me || act.owner === 'player') return null;
  const f = fameIn(s, act, me);
  if (f >= 60) {
    const d = -Math.min(0.06, (f - 55) * 0.002);
    return { delta: d, reason: fmtL(l('Fama {f} no seu país: sabe que todo selo daqui quer assinar.', 'Fame {f} in your country: knows every local label wants them.'), { f: Math.round(f) }) };
  }
  if (f < 20 && act.fame >= 35 && homeA3(act) !== me) return { delta: 0.03, reason: fmtL(l('Pouco conhecido no seu país (fama {f}): quer você para abrir esse mercado.', 'Little known in your country (fame {f}): wants you to open that market.'), { f: Math.round(f) }) };
  return null;
});
// §3.4 #21–23 — obrigações → negociação (favores/segredos/lealdade a favor; mágoas contra)
registerOfferMod('holds17', (s, act) => {
  let v = leverage(s, 'player', act.id).v, why = leverage(s, 'player', act.id).why;
  for (const m of act.members) { const x = leverage(s, 'player', m); v += x.v * 0.5; if (x.why && Math.abs(x.v) > 0.1) why = x.why; }
  v = clamp(v, -1, 1);
  if (Math.abs(v) < 0.05) return null;
  return { delta: v * 0.08, reason: fmtL(v > 0 ? l('Obrigação a seu favor: {w}', 'Obligation in your favor: {w}') : l('Mágoa contra você: {w}', 'Grievance against you: {w}'), { w: why ?? l('—') }) };
});

// §3.2 #12 — fama regional → júri nacional (e §3.3: júri evita quem acabou de causar escândalo no país)
{
  const prev = juryMemHook.f;
  juryMemHook.f = (s, actId, a3) => {
    let k = prev?.(s, actId, a3) ?? 1;
    const a = s.acts[actId];
    if (a) {
      k *= 0.85 + Math.min(100, fameIn(s, a, a3)) / 100 * 0.35;
      const sc = lastScandal(s, actId);
      if (sc && sc.a3 === a3 && s.week - sc.w < 52 && sc.eff >= 50 && !sc.rebel) k *= 0.85;
    }
    return k;
  };
}

// §3.3 #20 — escândalo → paradas (efeito Streisand no gênero rebelde; queda no resto)
registerMod('chartUnits', 'scandal17', (s, v, { release }) => {
  const sc = release ? lastScandal(s, release.actId) : undefined;
  if (!sc) return null;
  const age = s.week - sc.w;
  if (sc.rebel && age < 8 && sc.eff >= 20) return { value: v * 1.06, label: l('Polêmica recente vende (efeito Streisand)', 'Recent controversy sells (Streisand effect)') };
  if (!sc.rebel && age < 6 && sc.eff >= 60) return { value: v * 0.95, label: l('Escândalo recente afasta ouvintes', 'Recent scandal drives listeners away') };
  return null;
});

// ================================================================ ganchos

registerSimHook('month', 'bridge17', (s) => {
  promisesToHolds(s);
  stressMonth(s);
  pressSync(s);
  // obrigações de quem morreu deixam de valer
  for (const h of holds17(s).h) if (h.status === 'open' && ((s.persons[h.holder] && !s.persons[h.holder].alive) || (s.persons[h.target] && !s.persons[h.target].alive))) h.status = 'void';
});

// para testes/depuração
export const _bridge17 = { breakdown17, stressMonth, promisesToHolds, pressSync, allHolds, relieveLong, recentFacts, healthOf };
