// Herdeiros (rodada 8): quando o dono morre (idade, saúde, vícios), se afasta por saúde ou se aposenta,
// o jogador continua a run com um herdeiro vivo — filho(a) adulto(a), cônjuge ou parente. O herdeiro tem
// idade, atributos e traços próprios; herda o patrimônio (menos o imposto de herança da época), a
// participação na empresa e parte da reputação. Sem herdeiro, a run termina num final próprio.
// A escolha entra na mesa de decisões (o avanço longo para) e, sem resposta, vale o melhor candidato.

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { personDies } from '../dynasty';
import { deferEvents, queueCutscene, registerExt4, registerSimHook } from '../ext4';
import { bumpPerks } from '../perks';
import type { Decision, GameState } from '../types';
import { fmtL, money, nextId, notify, remember } from '../util';
import { capital } from './capital';
import { ensurePlayerPerson, life, playerPerson } from './life';
import { makeOwner, ownerOf, successionGate, succession, type OwnerAttr } from './people/owner';
import { P, type Owner } from './people/state';
import { persona, PLAYER_TRAITS } from './persona';
import { vices } from './vices';

export interface Relative { name: string; born: number; aptitude: number; rel: 'sibling' | 'parent' | 'cousin'; personId?: string }
export interface HeirCand { key: string; name: string; born: number; aptitude: number; rel: 'kid' | 'spouse' | 'sibling' | 'parent' | 'cousin' | 'staff'; personId?: string }
export interface HeirState {
  relatives: Relative[];
  /** linha do tempo das gerações (para a interface) */
  lineage: { name: string; from: number; to: number; how: 'death' | 'retire' | 'health'; heir: string }[];
  pending?: { reason: 'death' | 'retire' | 'health'; week: number; cause?: string };
}

declare module '../ext4' { interface Ext4 { heirs8: HeirState } }
registerExt4('heirs8', () => ({ relatives: [], lineage: [] }));
export const heirs = (s: GameState): HeirState => {
  const x = s.x4 as unknown as { heirs8?: HeirState };
  x.heirs8 ??= { relatives: [], lineage: [] };
  return x.heirs8;
};

export const REL_NAME: Record<HeirCand['rel'], L> = {
  kid: l('Filho(a)', 'Child'), spouse: l('Cônjuge', 'Spouse'), sibling: l('Irmão(ã)', 'Sibling'), parent: l('Pai/mãe', 'Parent'), cousin: l('Primo(a)', 'Cousin'), staff: l('Funcionário(a)', 'Staff member'),
};

const ADULT = 18;

/** Herdeiros vivos e adultos (família). Funcionários só entram se o jogador já os nomeou sucessores. */
export function heirCandidates(s: GameState): HeirCand[] {
  const o = ownerOf(s);
  const out: HeirCand[] = [];
  const alive = (pid?: string) => !pid || s.persons[pid]?.alive !== false;
  const L0 = life(s);
  o.kids.forEach((k, i) => {
    if (s.year - k.born < ADULT) return;
    const pid = kidPerson(s, i);
    if (!alive(pid)) return;
    out.push({ key: `kid:${i}`, name: pid && s.persons[pid] ? s.persons[pid].name : k.name, born: k.born, aptitude: k.aptitude, rel: 'kid', personId: pid });
  });
  const pt = L0.partner;
  if (pt && pt.stage === 'married' && alive(pt.personId)) out.push({ key: 'spouse', name: pt.name, born: pt.born, aptitude: clamp(35 + pt.affinity / 3, 20, 80), rel: 'spouse', personId: pt.personId });
  else if (!pt && o.spouse) out.push({ key: 'spouse', name: o.spouse, born: o.born + 2, aptitude: 45, rel: 'spouse' });
  heirs(s).relatives.forEach((rv, i) => {
    if (s.year - rv.born < ADULT || s.year - rv.born > 85 || !alive(rv.personId)) return;
    out.push({ key: `rel:${i}`, name: rv.name, born: rv.born, aptitude: rv.aptitude, rel: rv.rel, personId: rv.personId });
  });
  if (o.heir?.startsWith('staff:')) {
    const sf = s.player.staff.find((x) => x.id === o.heir!.slice(6));
    if (sf) out.push({ key: o.heir, name: sf.name, born: s.year - 40, aptitude: sf.skill, rel: 'staff' });
  }
  // melhor candidato primeiro: o designado, depois aptidão com um peso para quem está no auge
  const score = (c: HeirCand) => (c.key === o.heir ? 1000 : 0) + c.aptitude - Math.abs(s.year - c.born - 38) * 0.4 + (c.rel === 'kid' ? 5 : 0);
  return out.sort((a, b) => score(b) - score(a));
}

function kidPerson(s: GameState, idx: number): string | undefined {
  const actId = life(s).kidsX[idx]?.actId;
  const act = actId ? s.acts[actId] : undefined;
  return act?.members[0];
}

/** Imposto de herança da época (cônjuge paga metade). */
export function inheritanceTax(s: GameState, rel: HeirCand['rel']): number {
  const base = s.year < 1940 ? 0.15 : s.year < 1981 ? 0.35 : 0.25;
  const big = ownerOf(s).wealth > money(s, 2_000_000) ? 0.08 : 0;
  return rel === 'spouse' ? (base + big) / 2 : base + big;
}

/** Prévia do que o herdeiro recebe (para a interface). */
export function inheritancePreview(s: GameState, c: HeirCand, reason: 'death' | 'retire' | 'health'): { wealth: number; tax: number; repLoss: number } {
  const o = ownerOf(s);
  const tax = reason === 'death' ? inheritanceTax(s, c.rel) : 0;
  // em vida, o dono doa 60% e guarda o resto para a aposentadoria
  const gross = Math.max(0, o.wealth - personalDebt(s));
  const wealth = Math.round(reason === 'death' ? gross * (1 - tax) : gross * 0.6);
  const repLoss = c.rel === 'staff' ? 4 : c.aptitude >= 65 ? 1 : c.aptitude >= 45 ? 2 : 4;
  return { wealth, tax, repLoss };
}

function personalDebt(s: GameState): number {
  return vices(s).loans.reduce((t, x) => t + x.balance, 0);
}

// ---------------------------------------------------------------- decisão na mesa

const MAX_OPTS = 5;

function heirOption(i: number) {
  return {
    id: `h${i}`,
    label: l(`Herdeiro ${i + 1}`, `Heir ${i + 1}`),
    apply: (s: GameState, r: Rng, ctx: Record<string, string | number>) => {
      const key = String(ctx[`k${i}`] ?? '');
      const reason = (String(ctx.reason) || 'death') as 'death' | 'retire' | 'health';
      if (!applyHeir(s, r, key, reason)) applyHeir(s, r, heirCandidates(s)[0]?.key ?? '', reason) || endDynasty(s, reason);
    },
  };
}

deferEvents([{
  id: 'heir_choice8', cat: 'people', tone: 'neutral', tags: ['family'], cooldown: 0, forcedOnly: true,
  title: l('Sucessão: quem assume?', 'Succession: who takes over?'),
  text: l('Escolha quem continua a história.', 'Choose who carries the story on.'),
  options: Array.from({ length: MAX_OPTS }, (_, i) => heirOption(i)),
}]);

/** Começa a sucessão: com herdeiros, pergunta (decisão); sem, encerra a run. Devolve true se tratou. */
export function beginSuccession(s: GameState, r: Rng, reason: 'death' | 'retire' | 'health', cause?: string): boolean {
  const st = heirs(s);
  if (st.pending) return true;
  const o = ownerOf(s);
  const cands = heirCandidates(s);
  if (!cands.length) {
    endDynasty(s, reason);
    return true;
  }
  // herdeiro já nomeado (e válido): sem pergunta
  if (o.heir && cands[0].key === o.heir) {
    applyHeir(s, r, o.heir, reason, cause);
    return true;
  }
  st.pending = { reason, week: s.week, cause };
  const opts = cands.slice(0, MAX_OPTS);
  const ctx: Record<string, string | number> = { reason };
  const options = opts.map((c, i) => {
    ctx[`k${i}`] = c.key;
    const pv = inheritancePreview(s, c, reason);
    return {
      id: `h${i}`,
      label: fmtL(l('{n} — {r}, {a} anos', '{n} — {r}, age {a}'), { n: c.name, r: REL_NAME[c.rel], a: s.year - c.born }),
      hint: fmtL(l('Aptidão {ap} · herda {w}{t}', 'Aptitude {ap} · inherits {w}{t}'), { ap: Math.round(c.aptitude), w: `$${Math.round(pv.wealth / 100).toLocaleString('en-US')}`, t: pv.tax ? fmtL(l(' (imposto {p}%)', ' ({p}% tax)'), { p: Math.round(pv.tax * 100) }) : '' }),
    };
  });
  const why = reason === 'death' ? l('morreu', 'has died') : reason === 'health' ? l('não tem mais saúde para comandar', 'can no longer lead for health reasons') : l('decidiu se aposentar', 'decided to retire');
  const d: Decision = {
    id: nextId(s, 'd'), eventId: 'heir_choice8', cat: 'people',
    title: l('Sucessão: quem assume?', 'Succession: who takes over?'),
    text: fmtL(l('{o} {w}. A família se reúne: quem continua {c}? O herdeiro leva o patrimônio (menos o imposto), a sua participação na empresa e parte da reputação.', '{o} {w}. The family gathers: who carries on {c}? The heir takes the wealth (minus tax), your stake in the company and part of the reputation.'), { o: o.name, w: why, c: s.config.companyName }),
    options, ctx, week: s.week, defaultOption: 'h0', tags: ['family'],
  };
  s.decisions.push(d);
  notify(s, fmtL(l('{o} {w}. Escolha o herdeiro na mesa de decisões.', '{o} {w}. Choose the heir at the decision desk.'), { o: o.name, w: why }), 'event');
  return true;
}

/** Fim da linhagem: ninguém para continuar. */
export function endDynasty(s: GameState, reason: 'death' | 'retire' | 'health'): void {
  const o = ownerOf(s);
  const p = playerPerson(s);
  if (reason === 'death' && p?.alive) personDies(s, p, l('causas naturais', 'natural causes'));
  heirs(s).pending = undefined;
  heirs(s).lineage.push({ name: o.name, from: o.since ?? s.config.startYear, to: s.year, how: reason, heir: '' });
  const ending = reason === 'retire' ? 'quiet_retirement' : 'end_of_line';
  s.ended = { ending, year: s.year, reason: 'arc' };
  const text = reason === 'retire'
    ? fmtL(l('{o} se aposenta sem herdeiros e vende as chaves de {c}. Fim da run.', '{o} retires without heirs and hands over the keys of {c}. End of the run.'), { o: o.name, c: s.config.companyName })
    : fmtL(l('{o} se foi sem deixar herdeiros. {c} encerra a sua história.', '{o} is gone without heirs. {c} closes its story.'), { o: o.name, c: s.config.companyName });
  remember(s, 'dynasty_end', text, { important: true });
  notify(s, text, 'event');
}

/** Instala o herdeiro escolhido como novo dono. Devolve false se a chave não vale mais. */
export function applyHeir(s: GameState, r: Rng, key: string, reason: 'death' | 'retire' | 'health', cause?: string): boolean {
  const st = heirs(s);
  const cands = heirCandidates(s);
  const c = cands.find((x) => x.key === key);
  if (!c) return false;
  const old = ownerOf(s);
  const oldPerson = playerPerson(s);
  const L0 = life(s);
  const why = st.pending?.cause ?? cause;
  st.pending = undefined;
  const pv = inheritancePreview(s, c, reason);
  // dívidas pessoais saem do espólio
  vices(s).loans = [];
  if (c.rel === 'staff') {
    // sucessor profissional: regra antiga (sem herança de família)
    old.heir = key;
    succession(s, r, reason);
  } else {
    const next: Owner = makeOwner(s, r, old.generation + 1);
    next.name = c.personId && s.persons[c.personId] ? s.persons[c.personId].name : c.name;
    next.born = c.born;
    next.since = s.year;
    const apt = c.aptitude;
    for (const a of Object.keys(next.attrs) as OwnerAttr[]) {
      // filhos aprendem em casa; cônjuge viveu o negócio de perto; parentes trazem só o próprio jeito
      const w = c.rel === 'kid' ? 0.35 : c.rel === 'spouse' ? 0.3 : 0.15;
      next.attrs[a] = Math.round(clamp(old.attrs[a] * w + apt * 0.45 + next.attrs[a] * (0.55 - w), 10, 95));
    }
    next.wealth = pv.wealth;
    next.house = old.house;
    next.retired = [...(old.retired ?? []), { name: old.name, years: `${old.since ?? old.born + 30}–${s.year}` }].slice(-6);
    next.stress = 35;
    next.health = clamp(95 - Math.max(0, s.year - c.born - 40), 50, 95);
    // família: quem vira o quê para o novo dono
    const rels: Relative[] = [];
    if (c.rel === 'spouse') {
      next.kids = old.kids;
      L0.partner = null;
    } else {
      old.kids.forEach((k, i) => { if (`kid:${i}` !== key) rels.push({ name: k.name, born: k.born, aptitude: k.aptitude, rel: c.rel === 'kid' ? 'sibling' : 'cousin', personId: kidPerson(s, i) }); });
      const pt = L0.partner;
      if (pt && pt.stage === 'married') rels.push({ name: pt.name, born: pt.born, aptitude: clamp(35 + pt.affinity / 3, 20, 80), rel: c.rel === 'kid' ? 'parent' : 'cousin', personId: pt.personId });
      else if (!pt && old.spouse) rels.push({ name: old.spouse, born: old.born + 2, aptitude: 45, rel: 'parent' });
      L0.partner = null;
      L0.kidsX = {};
    }
    if (reason !== 'death' && c.rel === 'kid') rels.push({ name: old.name, born: old.born, aptitude: 50, rel: 'parent', personId: oldPerson?.id });
    const keep = st.relatives.filter((rv, i) => `rel:${i}` !== key);
    st.relatives = [...keep, ...rels].filter((rv) => s.year - rv.born < 90).slice(-8);
    L0.exes = [];
    L0.candidates = [];
    L0.fame = Math.round(L0.fame * 0.3);
    if (oldPerson) oldPerson.isPlayer = false;
    if (c.personId && s.persons[c.personId]) {
      next.personId = c.personId;
      s.persons[c.personId].isPlayer = true;
      next.born = s.persons[c.personId].born;
    } else next.personId = undefined;
    // traços próprios: o dom congênito passa de pai para filho; o resto é da pessoa
    const pe = persona(s);
    const congenital = c.rel === 'kid' && pe.traits.includes('perfect_pitch') && apt >= 60 ? ['perfect_pitch'] : [];
    const pool = PLAYER_TRAITS.filter((x) => !x.earned && !x.congenital);
    const traits = [...congenital];
    for (let i = 0; i < 6 && traits.length < 2 + congenital.length; i++) {
      const tr = r.pick(pool);
      if (!traits.includes(tr.id) && !traits.some((x) => PLAYER_TRAITS.find((y) => y.id === x)?.opposite === tr.id)) traits.push(tr.id);
    }
    pe.traits = traits;
    pe.coping = [];
    pe.copingPrompt = false;
    bumpPerks();
    const v = vices(s);
    v.dep = { smoke: 0, drink: 0, drugs: 0 };
    v.clean = { smoke: 0, drink: 0, drugs: 0 };
    v.smoking = false;
    v.rehab = undefined;
    v.heat = 0;
    P(s).owner = next;
    if (reason === 'death' && oldPerson?.alive) personDies(s, oldPerson, why === 'overdose' ? l('overdose', 'overdose') : l('causas naturais', 'natural causes'));
    ensurePlayerPerson(s, r);
    const whyT = reason === 'death' ? l('morreu', 'died') : reason === 'health' ? l('se afastou por saúde', 'stepped down for health reasons') : l('se aposentou', 'retired');
    const text = fmtL(l('{o} {w}. {n} ({r}, {a} anos) assume {c}.', '{o} {w}. {n} ({r}, {a}) takes over {c}.'), { o: old.name, w: whyT, n: next.name, r: REL_NAME[c.rel], a: s.year - next.born, c: s.config.companyName });
    remember(s, 'succession', text, { important: true });
    notify(s, text, 'event');
    queueCutscene(s, 'people_succession', { title: l('Sucessão', 'Succession'), text, old: old.name, next: next.name });
  }
  // continuidade: reputação e sócios sentem a troca
  const rep = s.player.reputation;
  rep.artists = clamp(rep.artists - pv.repLoss, 0, 100);
  rep.institutional = clamp(rep.institutional - pv.repLoss, 0, 100);
  for (const inv of capital(s).investors) inv.mods.push({ label: l('Troca de comando', 'Change of command'), value: c.aptitude >= 60 ? -2 : -6, decay: 0.5 });
  st.lineage.push({ name: old.name, from: old.since ?? s.config.startYear, to: s.year, how: reason, heir: ownerOf(s).name });
  if (st.lineage.length > 12) st.lineage.shift();
  s.player.legacy.industry = (s.player.legacy.industry ?? 0) + 1;
  return true;
}

/** Aposentadoria voluntária: com herdeiro escolhido, passa o selo na hora; sem herdeiros, encerra a run. */
export function retireOwner(s: GameState, r: Rng, heirKey?: string): L | null {
  if (s.ended) return l('A run já terminou.', 'The run has already ended.');
  if (heirs(s).pending) return l('A sucessão já está em andamento (mesa de decisões).', 'Succession is already under way (decision desk).');
  const cands = heirCandidates(s);
  if (!cands.length) {
    if (heirKey !== 'none') return l('Sem herdeiros: aposentar encerra a run. Confirme para continuar.', 'No heirs: retiring ends the run. Confirm to proceed.');
    endDynasty(s, 'retire');
    return null;
  }
  const key = heirKey && heirKey !== 'none' ? heirKey : cands[0].key;
  if (!applyHeir(s, r, key, 'retire')) return l('Herdeiro inválido.', 'Invalid heir.');
  return null;
}

// ---------------------------------------------------------------- ganchos

successionGate.fn = (s, r, reason) => beginSuccession(s, r, reason);

registerSimHook('month', 'heirs8', (s, r) => {
  if (s.ended || heirs(s).pending || !P(s).owner) return;
  const o = ownerOf(s);
  const v = vices(s);
  const age = s.year - o.born;
  // vícios matam: dependência pesada com a saúde no chão
  const dep = Math.max(v.dep.drugs, v.dep.drink * 0.8);
  if (dep >= 70 && o.health < 40 && r.chance(0.02 + (dep - 70) / 600)) {
    beginSuccession(s, r, 'death', 'overdose');
    return;
  }
  // corpo velho e doente
  if (age > 60 && o.health < 20 && r.chance(0.05)) beginSuccession(s, r, 'death');
  // parentes envelhecem e alguns morrem
  const st = heirs(s);
  st.relatives = st.relatives.filter((rv) => !(s.year - rv.born > 75 && r.chance(0.004 * (s.year - rv.born - 74))));
});
