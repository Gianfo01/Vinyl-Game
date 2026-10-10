// Intriga (rodada 6, inspirada em Crusader Kings III): segredos de artistas e de selos rivais, ganchos
// (fracos: uso único; fortes: reutilizáveis a cada 5 anos), tramas com agentes, progresso mensal,
// chance de sucesso e risco de descoberta (investigar, aproximar-se, roubar artista, sabotar lançamento,
// difamar), e decisões grandes com requisitos (escola de música, estúdio lendário, premiação própria,
// turnê beneficente, retiro criativo, gala da indústria, manifesto, pacto de não agressão).

import { clamp, hashString, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { expectedAdvance } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import { bumpPerks, perk, registerPerkSource, type PerkEntry } from '../perks';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../util';
import { grantPlayerContract } from '../worldgen';
import { energyLeft, spendEnergy } from './life';
import { ownerOf } from './people/owner';
import { persona } from './persona';
import { allReleases17 } from '../relidx17';

// ---------------------------------------------------------------- segredos

export type TargetKind = 'act' | 'label';
export interface Target { kind: TargetKind; id: string }
export type SecretKind = 'addiction' | 'affair' | 'side_deal' | 'plagiarism' | 'tax' | 'fake_bio' | 'payola' | 'fake_sales' | 'unpaid_royalties' | 'ceo_affair' | 'debts';

export const SECRETS: Record<SecretKind, { name: L; criminal: boolean; on: TargetKind }> = {
  addiction: { name: l('Dependência química escondida', 'Hidden addiction'), criminal: false, on: 'act' },
  affair: { name: l('Caso extraconjugal', 'Extramarital affair'), criminal: false, on: 'act' },
  side_deal: { name: l('Negociação secreta com outro selo', 'Secret talks with another label'), criminal: false, on: 'act' },
  plagiarism: { name: l('Plágio num sucesso', 'Plagiarism in a hit'), criminal: true, on: 'act' },
  tax: { name: l('Sonegação de impostos', 'Tax evasion'), criminal: true, on: 'act' },
  fake_bio: { name: l('Biografia inventada', 'Invented biography'), criminal: false, on: 'act' },
  payola: { name: l('Jabá pago às rádios', 'Radio payola'), criminal: true, on: 'label' },
  fake_sales: { name: l('Vendas infladas nas paradas', 'Inflated chart sales'), criminal: true, on: 'label' },
  unpaid_royalties: { name: l('Royalties retidos de artistas', 'Withheld artist royalties'), criminal: true, on: 'label' },
  ceo_affair: { name: l('Caso do CEO com uma artista', 'CEO affair with an artist'), criminal: false, on: 'label' },
  debts: { name: l('Dívidas escondidas', 'Hidden debts'), criminal: false, on: 'label' },
};

export interface Secret { id: string; target: Target; kind: SecretKind; known: boolean; exposed: boolean; usedWeek?: number }

export type SchemeKind = 'dig' | 'befriend' | 'poach' | 'sabotage' | 'smear';
export const SCHEMES: Record<SchemeKind, { name: L; desc: L; on: TargetKind[]; months: number }> = {
  dig: { name: l('Investigar', 'Dig for dirt'), desc: l('Descobre um segredo do alvo (vira gancho).', 'Uncovers a secret of the target (becomes a hook).'), on: ['act', 'label'], months: 4 },
  befriend: { name: l('Aproximar-se', 'Befriend'), desc: l('Artista: +confiança. Selo: −rivalidade.', 'Artist: +trust. Label: −rivalry.'), on: ['act', 'label'], months: 3 },
  poach: { name: l('Roubar artista', 'Poach an artist'), desc: l('Tira um ato de um rival e traz para o seu selo.', 'Takes an act from a rival onto your label.'), on: ['act'], months: 6 },
  sabotage: { name: l('Sabotar lançamentos', 'Sabotage releases'), desc: l('Os lançamentos recentes do rival perdem força.', 'The rival\'s recent releases lose steam.'), on: ['label'], months: 4 },
  smear: { name: l('Difamar na imprensa', 'Smear in the press'), desc: l('Alvo perde fama/reputação.', 'Target loses fame/reputation.'), on: ['act', 'label'], months: 3 },
};

export interface Scheme { id: string; kind: SchemeKind; target: Target; agents: number; progress: number; start: number }

export interface IntrigueState {
  secrets: Record<string, Secret[]>;
  schemes: Scheme[];
  decisions: Record<string, number>;
  log: { week: number; text: L; tone: 'good' | 'bad' | 'info' }[];
  offerHooks: Record<string, number>;
}

declare module '../ext4' {
  interface Ext4 {
    intrigue: IntrigueState;
  }
}

const fresh = (): IntrigueState => ({ secrets: {}, schemes: [], decisions: {}, log: [], offerHooks: {} });
registerExt4('intrigue', fresh);

export function intrigue(s: GameState): IntrigueState {
  const x = s.x4 as unknown as { intrigue?: IntrigueState };
  x.intrigue ??= fresh();
  return x.intrigue;
}

function logI(s: GameState, text: L, tone: 'good' | 'bad' | 'info' = 'info'): void {
  const st = intrigue(s);
  st.log.unshift({ week: s.week, text, tone });
  if (st.log.length > 30) st.log.length = 30;
}

const key = (t: Target) => `${t.kind}:${t.id}`;

export function targetName(s: GameState, t: Target): string {
  return t.kind === 'act' ? s.acts[t.id]?.name ?? '?' : s.labels[t.id]?.name ?? '?';
}

/** Segredos de um alvo, gerados de forma determinística na primeira consulta. */
export function secretsOf(s: GameState, t: Target): Secret[] {
  const st = intrigue(s);
  const k = key(t);
  if (st.secrets[k]) return st.secrets[k];
  const h = hashString(`${s.config.seed}|${k}`);
  const pool = (Object.keys(SECRETS) as SecretKind[]).filter((x) => SECRETS[x].on === t.kind);
  const out: Secret[] = [];
  const n = h % 100 < 55 ? (h % 100 < 18 ? 2 : 1) : 0;
  for (let i = 0; i < n; i++) {
    const kind = pool[(h >>> (4 + i * 5)) % pool.length];
    if (!out.some((x) => x.kind === kind)) out.push({ id: `${k}:${kind}`, target: t, kind, known: false, exposed: false });
  }
  st.secrets[k] = out;
  return out;
}

export function knownSecrets(s: GameState): Secret[] {
  return Object.values(intrigue(s).secrets).flat().filter((x) => x.known && !x.exposed);
}

/** Gancho disponível? Fracos: uma vez. Fortes (crime): a cada 5 anos. */
export function hookReady(s: GameState, sec: Secret): boolean {
  if (!sec.known || sec.exposed) return false;
  if (sec.usedWeek === undefined) return true;
  return SECRETS[sec.kind].criminal && s.week - sec.usedWeek >= 260;
}

// ---------------------------------------------------------------- tramas

export function maxSchemes(s: GameState): number {
  return 2 + (perk(s, 'scheme') >= 0.2 ? 1 : 0);
}

export function agentCost(s: GameState): number {
  return money(s, 400);
}

function resistance(s: GameState, t: Target): number {
  if (t.kind === 'label') return 4 + (s.labels[t.id]?.aggression ?? 0.5) * 8;
  const a = s.acts[t.id];
  return 2 + (a?.fame ?? 0) / 15;
}

export function schemeSpeed(s: GameState, sc: Pick<Scheme, 'agents' | 'target' | 'kind'>): number {
  const o = ownerOf(s);
  const base = 100 / SCHEMES[sc.kind].months;
  return Math.max(4, base + (o.attrs.negotiation - 50) / 6 + sc.agents * 4 + perk(s, 'scheme') * 30 - resistance(s, sc.target));
}

export function schemeOdds(s: GameState, sc: Pick<Scheme, 'agents' | 'target' | 'kind'>): number {
  const o = ownerOf(s);
  const base = sc.kind === 'befriend' || sc.kind === 'dig' ? 0.55 : sc.kind === 'poach' ? 0.3 : 0.4;
  return clamp(base + sc.agents * 0.1 + perk(s, 'scheme') + (o.attrs.charisma - 50) / 250 - (sc.target.kind === 'label' ? 0.08 : 0), 0.08, 0.92);
}

export function schemeRisk(s: GameState, sc: Pick<Scheme, 'agents' | 'kind'>): number {
  if (sc.kind === 'befriend') return 0;
  return clamp(0.035 + sc.agents * 0.012 - perk(s, 'scheme') * 0.06 + ((s.flags.securityUntil ?? 0) > s.week ? -0.01 : 0), 0.005, 0.15);
}

export function canTarget(s: GameState, kind: SchemeKind, t: Target): L | null {
  if (!SCHEMES[kind].on.includes(t.kind)) return l('Alvo inválido para essa trama.', 'Invalid target for this scheme.');
  if (t.kind === 'act') {
    const a = s.acts[t.id];
    if (!a || a.status === 'retired' || a.status === 'split') return l('Ato indisponível.', 'Act unavailable.');
    if (kind === 'poach' && (!a.owner || a.owner === 'player')) return l('Só dá para roubar artistas de rivais.', 'You can only poach acts from rivals.');
    if ((kind === 'smear' || kind === 'dig') && a.owner === 'player' && kind === 'smear') return l('Difamar o próprio artista?', 'Smear your own artist?');
  } else if (!s.labels[t.id]?.active) return l('Selo indisponível.', 'Label unavailable.');
  if (intrigue(s).schemes.some((x) => x.kind === kind && key(x.target) === key(t))) return l('Já há uma trama igual contra esse alvo.', 'There is already the same scheme against this target.');
  return null;
}

export function startScheme(s: GameState, kind: SchemeKind, t: Target, agents: number): L | null {
  const st = intrigue(s);
  if (st.schemes.length >= maxSchemes(s)) return fmtL(l('Você só consegue tocar {n} tramas ao mesmo tempo.', 'You can only run {n} schemes at once.'), { n: maxSchemes(s) });
  const err = canTarget(s, kind, t);
  if (err) return err;
  if (energyLeft(s) < 1) return l('Sem tempo livre este mês.', 'No free time this month.');
  spendEnergy(s, 1);
  agents = clamp(Math.round(agents), 0, 3);
  st.schemes.push({ id: nextId(s, 'sch'), kind, target: t, agents, progress: 0, start: s.week });
  // honestos sofrem: tramar contra a natureza custa estresse (CK3)
  if (persona(s).traits.includes('honest') && kind !== 'befriend') ownerOf(s).stress = clamp(ownerOf(s).stress + 10, 0, 100);
  logI(s, fmtL(l('Trama iniciada: {k} contra {t}.', 'Scheme started: {k} against {t}.'), { k: SCHEMES[kind].name, t: targetName(s, t) }));
  return null;
}

export function cancelScheme(s: GameState, id: string): void {
  const st = intrigue(s);
  st.schemes = st.schemes.filter((x) => x.id !== id);
}

function succeed(s: GameState, r: Rng, sc: Scheme): void {
  const name = targetName(s, sc.target);
  switch (sc.kind) {
    case 'dig': {
      const hidden = secretsOf(s, sc.target).filter((x) => !x.known);
      if (hidden.length) {
        const sec = r.pick(hidden);
        sec.known = true;
        logI(s, fmtL(l('Segredo descoberto sobre {t}: {s}.', 'Secret uncovered about {t}: {s}.'), { t: name, s: SECRETS[sec.kind].name }), 'good');
        notify(s, fmtL(l('Seus agentes descobriram: {t} — {s}. Agora você tem um gancho.', 'Your agents found out: {t} — {s}. You now hold a hook.'), { t: name, s: SECRETS[sec.kind].name }), 'good');
      } else logI(s, fmtL(l('{t} está limpo(a). Nada encontrado.', '{t} is clean. Nothing found.'), { t: name }), 'info');
      return;
    }
    case 'befriend':
      if (sc.target.kind === 'act') { const a = s.acts[sc.target.id]; if (a) a.trust = clamp(a.trust + 15, 0, 100); }
      else s.rivalries[sc.target.id] = Math.max(0, (s.rivalries[sc.target.id] ?? 0) - 25);
      logI(s, fmtL(l('Aproximação com {t} deu certo.', 'Befriending {t} worked.'), { t: name }), 'good');
      return;
    case 'poach': {
      const a = s.acts[sc.target.id];
      if (!a || !a.owner || a.owner === 'player') return;
      const from = a.owner;
      const fee = money(s, expectedAdvance(s, a) * 0.5);
      post(s, `poach:${a.id}`, -fee, 'advances', `Rescisão paga para trazer ${a.name}`);
      const lb = s.labels[from];
      if (lb) lb.roster = lb.roster.filter((x) => x !== a.id);
      if (a.contractId) delete s.contracts[a.contractId];
      grantPlayerContract(s, a, 36);
      a.trust = 65;
      s.rivalries[from] = (s.rivalries[from] ?? 0) + 30;
      s.knowledge[a.id] = { actId: a.id, degree: 4, stage: 'negotiation', bias: 0, updatedWeek: s.week, source: 'scheme' };
      remember(s, 'poach', fmtL(l('{c} tira {a} de {l} numa manobra de bastidores.', '{c} pries {a} away from {l} in a backroom move.'), { c: s.config.companyName, a: a.name, l: lb?.name ?? '?' }), { actId: a.id, important: true });
      notify(s, fmtL(l('{a} trocou {l} pelo seu selo!', '{a} left {l} for your label!'), { a: a.name, l: lb?.name ?? '?' }), 'good');
      logI(s, fmtL(l('Roubou {a} de {l}.', 'Poached {a} from {l}.'), { a: a.name, l: lb?.name ?? '?' }), 'good');
      return;
    }
    case 'sabotage':
      for (const rel of allReleases17(s)) if (rel.owner === sc.target.id && s.week - rel.week < 10) rel.appeal *= 0.6;
      s.rivalries[sc.target.id] = (s.rivalries[sc.target.id] ?? 0) + 15;
      logI(s, fmtL(l('Lançamentos de {t} sabotados.', '{t}\'s releases sabotaged.'), { t: name }), 'good');
      return;
    case 'smear':
      if (sc.target.kind === 'act') { const a = s.acts[sc.target.id]; if (a) { a.fame *= 0.88; a.momentum = Math.max(0, a.momentum - 20); } }
      else { const lb = s.labels[sc.target.id]; if (lb) lb.reputation = clamp(lb.reputation - 10, 0, 100); }
      logI(s, fmtL(l('A imprensa comprou a história contra {t}.', 'The press bought the story against {t}.'), { t: name }), 'good');
  }
}

function discovered(s: GameState, sc: Scheme): void {
  const name = targetName(s, sc.target);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100);
  ownerOf(s).stress = clamp(ownerOf(s).stress + 8, 0, 100);
  if (sc.target.kind === 'label') s.rivalries[sc.target.id] = (s.rivalries[sc.target.id] ?? 0) + 30;
  else { const a = s.acts[sc.target.id]; if (a) a.trust = clamp(a.trust - 30, 0, 100); s.player.reputation.artists = clamp(s.player.reputation.artists - 4, 0, 100); }
  notify(s, fmtL(l('Sua trama contra {t} foi descoberta! Escândalo nos bastidores.', 'Your scheme against {t} was discovered! A backstage scandal.'), { t: name }), 'bad');
  remember(s, 'scheme_caught', fmtL(l('{c} é pego tramando contra {t}.', '{c} is caught scheming against {t}.'), { c: s.config.companyName, t: name }), { important: true });
  logI(s, fmtL(l('Descoberto: {k} contra {t}.', 'Discovered: {k} against {t}.'), { k: SCHEMES[sc.kind].name, t: name }), 'bad');
}

// ---------------------------------------------------------------- ganchos e exposição

export type HookUse = 'renew' | 'loyalty' | 'offer' | 'truce' | 'concede' | 'cash';
export const HOOK_USES: Record<HookUse, { name: L; desc: L; on: TargetKind }> = {
  renew: { name: l('Renovar contrato', 'Renew contract'), desc: l('Mais 24 meses, sem adiantamento.', '24 more months, no advance.'), on: 'act' },
  loyalty: { name: l('Exigir lealdade', 'Demand loyalty'), desc: l('Confiança +25, sem saída por insatisfação tão cedo.', 'Trust +25, no unhappy exit any time soon.'), on: 'act' },
  offer: { name: l('Pressionar a aceitar', 'Pressure into accepting'), desc: l('Sua próxima oferta a este ato pesa muito mais (por 6 meses).', 'Your next offer to this act weighs much more (6 months).'), on: 'act' },
  truce: { name: l('Trégua forçada', 'Forced truce'), desc: l('Rivalidade zerada.', 'Rivalry reset to zero.'), on: 'label' },
  concede: { name: l('Ceder um artista', 'Hand over an artist'), desc: l('Eles liberam um ato pequeno do elenco para você.', 'They release a small act from their roster to you.'), on: 'label' },
  cash: { name: l('Chantagem', 'Blackmail'), desc: l('Eles pagam para você calar. Arriscado: 30% de virar escândalo.', 'They pay you to stay quiet. Risky: 30% chance of scandal.'), on: 'label' },
};

export function useHook(s: GameState, r: Rng, secretId: string, use: HookUse): L | null {
  const sec = knownSecrets(s).find((x) => x.id === secretId);
  if (!sec) return l('Gancho indisponível.', 'Hook unavailable.');
  if (!hookReady(s, sec)) return l('Esse gancho ainda não pode ser usado de novo.', 'That hook cannot be used again yet.');
  if (HOOK_USES[use].on !== sec.target.kind) return l('Uso inválido para esse alvo.', 'Invalid use for this target.');
  const name = targetName(s, sec.target);
  if (sec.target.kind === 'act') {
    const a = s.acts[sec.target.id];
    if (!a) return l('Ato indisponível.', 'Act unavailable.');
    if ((use === 'renew' || use === 'loyalty') && a.owner !== 'player') return l('Só para artistas do seu selo.', 'Only for acts on your label.');
    if (use === 'renew') { const c = a.contractId ? s.contracts[a.contractId] : undefined; if (!c) return l('Sem contrato.', 'No contract.'); c.endWeek = Math.max(c.endWeek, s.week) + 104; c.termMonths += 24; }
    if (use === 'loyalty') { a.trust = clamp(a.trust + 25, 0, 100); for (const id of a.members) { const p = s.persons[id]; if (p) p.resentment = clamp(p.resentment + 10, 0, 100); } }
    if (use === 'offer') intrigue(s).offerHooks[a.id] = s.week + 26;
  } else {
    const lb = s.labels[sec.target.id];
    if (!lb) return l('Selo indisponível.', 'Label unavailable.');
    if (use === 'truce') s.rivalries[lb.id] = 0;
    if (use === 'concede') {
      const pick = lb.roster.map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired' && a.status !== 'split').sort((a, b) => a.fame - b.fame)[0];
      if (!pick) return l('Eles não têm ninguém para ceder.', 'They have no one to hand over.');
      lb.roster = lb.roster.filter((x) => x !== pick.id);
      if (pick.contractId) delete s.contracts[pick.contractId];
      grantPlayerContract(s, pick, 24);
      notify(s, fmtL(l('{l} cedeu {a} ao seu selo, sem alarde.', '{l} quietly handed {a} to your label.'), { l: lb.name, a: pick.name }), 'good');
    }
    if (use === 'cash') {
      const v = money(s, 15000 + lb.roster.length * 2000);
      post(s, `blackmail:${lb.id}:${s.week}`, v, 'misc', `Pagamento discreto de ${lb.name}`);
      lb.cash -= v;
      if (r.chance(0.3)) {
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 15, 0, 100);
        s.player.stats.scandalsSurvived += 1;
        notify(s, l('A chantagem vazou. Escândalo enorme.', 'The blackmail leaked. A huge scandal.'), 'bad');
        remember(s, 'scandal', fmtL(l('{c} é acusado de chantagear {l}.', '{c} is accused of blackmailing {l}.'), { c: s.config.companyName, l: lb.name }), { important: true });
      }
    }
  }
  sec.usedWeek = s.week;
  logI(s, fmtL(l('Gancho usado em {t}: {u}.', 'Hook used on {t}: {u}.'), { t: name, u: HOOK_USES[use].name }), 'info');
  return null;
}

export function exposeSecret(s: GameState, secretId: string): L | null {
  const sec = knownSecrets(s).find((x) => x.id === secretId);
  if (!sec) return l('Segredo indisponível.', 'Secret unavailable.');
  const name = targetName(s, sec.target);
  sec.exposed = true;
  if (sec.target.kind === 'act') {
    const a = s.acts[sec.target.id];
    if (a) { a.fame *= 0.85; a.trust = clamp(a.trust - 20, 0, 100); a.momentum = Math.max(0, a.momentum - 15); }
    if (a?.owner === 'player') s.player.reputation.commercial = clamp(s.player.reputation.commercial - 4, 0, 100);
  } else {
    const lb = s.labels[sec.target.id];
    if (lb) { lb.reputation = clamp(lb.reputation - 15, 0, 100); lb.cash -= money(s, 20000); }
    if (SECRETS[sec.kind].criminal) s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100);
  }
  remember(s, 'exposed', fmtL(l('Vem à tona: {t} — {s}.', 'It comes out: {t} — {s}.'), { t: name, s: SECRETS[sec.kind].name }), { important: true });
  logI(s, fmtL(l('Você expôs {t}: {s}.', 'You exposed {t}: {s}.'), { t: name, s: SECRETS[sec.kind].name }), 'info');
  return null;
}

// ---------------------------------------------------------------- decisões

export interface DecisionDef {
  id: string;
  name: L;
  desc: L;
  cost: number;
  energy?: number;
  /** semanas até poder repetir (ausente = uma vez só) */
  cooldown?: number;
  exclusive?: string;
  req: (s: GameState) => L | null;
  apply: (s: GameState, r: Rng) => void;
}

const rosterPersons = (s: GameState) => playerActs(s).flatMap((id) => s.acts[id]?.members ?? []).map((id) => s.persons[id]).filter((p) => p && p.alive && !p.isPlayer);

export const DECISIONS: DecisionDef[] = [
  { id: 'music_school', name: l('Fundar uma escola de música', 'Found a music school'), desc: l('+1 sinal de scouting por mês e +1 de reputação institucional por ano, para sempre.', '+1 scouting signal a month and +1 institutional reputation a year, forever.'), cost: 60000,
    req: (s) => s.player.hq < 2 ? l('Precisa de sede Loft ou maior.', 'Needs a Loft HQ or bigger.') : s.player.reputation.institutional < 45 ? l('Reputação institucional 45+.', 'Institutional reputation 45+.') : null, apply: () => bumpPerks() },
  { id: 'legendary_studio', name: l('Comprar um estúdio lendário', 'Buy a legendary studio'), desc: l('+1,5 de qualidade em todas as gravações e respeito da crítica.', '+1.5 quality on every recording and critics\' respect.'), cost: 250000,
    req: (s) => s.year < 1958 ? l('A partir de 1958.', 'From 1958.') : s.player.hq < 3 ? l('Precisa de sede Complexo ou maior.', 'Needs a Complex HQ or bigger.') : null, apply: () => bumpPerks() },
  { id: 'own_awards', name: l('Criar sua própria premiação', 'Create your own awards'), desc: l('Crítica +0,2 e reputação institucional +1 por ano.', 'Critics +0.2 and institutional reputation +1 a year.'), cost: 120000,
    req: (s) => s.player.hq < 3 ? l('Precisa de sede Complexo ou maior.', 'Needs a Complex HQ or bigger.') : s.player.reputation.commercial < 60 ? l('Reputação comercial 60+.', 'Commercial reputation 60+.') : null, apply: () => bumpPerks() },
  { id: 'charity_tour', name: l('Turnê beneficente', 'Charity tour'), desc: l('Reputação institucional +10, com artistas +5 e elenco motivado. Pode repetir a cada 3 anos.', 'Institutional reputation +10, artists +5 and a motivated roster. Repeatable every 3 years.'), cost: 15000, cooldown: 156,
    req: (s) => playerActs(s).length < 3 ? l('Precisa de 3 atos no elenco.', 'Needs 3 acts on the roster.') : null,
    apply: (s) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional + 10, 0, 100); s.player.reputation.artists = clamp(s.player.reputation.artists + 5, 0, 100); for (const p of rosterPersons(s)) p.morale = clamp(p.morale + 10, 0, 100); } },
  { id: 'creative_retreat', name: l('Retiro criativo', 'Creative retreat'), desc: l('Elenco inspirado (+25) e feliz; seu estresse cai. Às vezes alguém conta um segredo ao pé da fogueira. Uma vez por ano.', 'Inspired (+25) and happy roster; your stress drops. Sometimes someone shares a secret by the fire. Once a year.'), cost: 8000, energy: 2, cooldown: 52,
    req: (s) => playerActs(s).length ? null : l('Sem elenco.', 'No roster.'),
    apply: (s, r) => {
      for (const p of rosterPersons(s)) { p.inspiration = clamp(p.inspiration + 25, 0, 100); p.morale = clamp(p.morale + 8, 0, 100); }
      ownerOf(s).stress = clamp(ownerOf(s).stress - 15, 0, 100);
      if (r.chance(0.3)) { const id = r.pick(playerActs(s)); const sec = secretsOf(s, { kind: 'act', id }).find((x) => !x.known); if (sec) { sec.known = true; notify(s, fmtL(l('No retiro, alguém de {a} contou um segredo: {s}.', 'At the retreat, someone from {a} shared a secret: {s}.'), { a: s.acts[id].name, s: SECRETS[sec.kind].name }), 'event'); } }
    } },
  { id: 'industry_gala', name: l('Gala da indústria', 'Industry gala'), desc: l('Rivalidades −10, contatos novos (+2 sinais) e chance de ouvir um segredo de um rival. Uma vez por ano.', 'Rivalries −10, new contacts (+2 signals) and a chance to overhear a rival\'s secret. Once a year.'), cost: 20000, energy: 1, cooldown: 52,
    req: (s) => s.player.reputation.commercial < 35 ? l('Reputação comercial 35+.', 'Commercial reputation 35+.') : null,
    apply: (s, r) => {
      for (const id of Object.keys(s.rivalries)) s.rivalries[id] = Math.max(0, s.rivalries[id] - 10);
      s.flags.scoutBonusOnce = (s.flags.scoutBonusOnce ?? 0) + 2;
      if (r.chance(0.35)) { const lb = r.pick(Object.values(s.labels).filter((x) => x.active)); const sec = lb && secretsOf(s, { kind: 'label', id: lb.id }).find((x) => !x.known); if (lb && sec) { sec.known = true; notify(s, fmtL(l('Na gala, alguém bebeu demais e contou: {l} — {s}.', 'At the gala someone drank too much and told you: {l} — {s}.'), { l: lb.name, s: SECRETS[sec.kind].name }), 'event'); } }
    } },
  { id: 'artistic_manifesto', name: l('Manifesto artístico', 'Artistic manifesto'), desc: l('A arte vem antes: crítica +0,3, confiança +4, apelo −3%. Exclui o pacto comercial.', 'Art comes first: critics +0.3, trust +4, appeal −3%. Excludes the commercial pact.'), cost: 2000, exclusive: 'commercial_pact', req: () => null, apply: () => bumpPerks() },
  { id: 'commercial_pact', name: l('Pacto comercial', 'Commercial pact'), desc: l('Hits primeiro: apelo +5%, vendas +3%, crítica −0,2. Exclui o manifesto artístico.', 'Hits first: appeal +5%, sales +3%, critics −0.2. Excludes the artistic manifesto.'), cost: 2000, exclusive: 'artistic_manifesto', req: () => null, apply: () => bumpPerks() },
  { id: 'nonaggression', name: l('Pacto de não agressão com o maior rival', 'Non-aggression pact with the top rival'), desc: l('Zera a rivalidade com o rival mais hostil. Repetível a cada 5 anos.', 'Resets rivalry with the most hostile rival. Repeatable every 5 years.'), cost: 30000, cooldown: 260,
    req: (s) => { const top = Object.entries(s.rivalries).sort((a, b) => b[1] - a[1])[0]; return !top || top[1] < 20 ? l('Nenhuma rivalidade forte.', 'No strong rivalry.') : top[1] > 70 && !knownSecrets(s).some((x) => x.target.kind === 'label' && x.target.id === top[0]) ? l('Rivalidade alta demais: precisa de um gancho sobre eles.', 'Rivalry too high: you need a hook on them.') : null; },
    apply: (s) => { const top = Object.entries(s.rivalries).sort((a, b) => b[1] - a[1])[0]; if (top) s.rivalries[top[0]] = 0; } },
];

export function decisionBlocker(s: GameState, d: DecisionDef): L | null {
  const st = intrigue(s);
  const taken = st.decisions[d.id];
  if (taken !== undefined && (d.cooldown === undefined || s.week - taken < d.cooldown)) return d.cooldown ? fmtL(l('Disponível de novo na semana {w}.', 'Available again in week {w}.'), { w: taken + d.cooldown }) : l('Já feito.', 'Already done.');
  if (d.exclusive && st.decisions[d.exclusive] !== undefined) return l('Incompatível com uma decisão já tomada.', 'Incompatible with a decision already taken.');
  const e = d.req(s);
  if (e) return e;
  if (s.player.cash < money(s, d.cost)) return l('Caixa insuficiente.', 'Not enough cash.');
  if (d.energy && energyLeft(s) < d.energy) return l('Sem tempo livre suficiente.', 'Not enough free time.');
  return null;
}

export function takeDecision(s: GameState, r: Rng, id: string): L | null {
  const d = DECISIONS.find((x) => x.id === id);
  if (!d) return l('Decisão desconhecida.', 'Unknown decision.');
  const e = decisionBlocker(s, d);
  if (e) return e;
  if (d.energy) spendEnergy(s, d.energy);
  post(s, `dec:${d.id}:${s.week}`, -money(s, d.cost), 'misc', d.name.pt);
  intrigue(s).decisions[d.id] = s.week;
  d.apply(s, r);
  remember(s, 'decision', fmtL(l('Decisão: {d}.', 'Decision: {d}.'), { d: d.name }), { important: !d.cooldown });
  return null;
}

registerPerkSource('intrigue', (s) => {
  const st = intrigue(s);
  const out: PerkEntry[] = [];
  const has = (id: string) => st.decisions[id] !== undefined;
  const D = (id: string) => DECISIONS.find((x) => x.id === id)!.name;
  if (has('music_school')) out.push({ label: D('music_school'), values: { signals: 1, reputation: 1 } });
  if (has('legendary_studio')) out.push({ label: D('legendary_studio'), values: { songQ: 1.5, critics: 0.1 } });
  if (has('own_awards')) out.push({ label: D('own_awards'), values: { critics: 0.2, reputation: 1 } });
  if (has('artistic_manifesto')) out.push({ label: D('artistic_manifesto'), values: { critics: 0.3, trust: 4, appeal: -0.03 } });
  if (has('commercial_pact')) out.push({ label: D('commercial_pact'), values: { appeal: 0.05, chartUnits: 0.03, critics: -0.2 } });
  for (const [actId, until] of Object.entries(st.offerHooks)) if (until > s.week) out.push({ label: l('Gancho de pressão', 'Pressure hook'), values: { offer: 0.35 }, act: (_s, a) => a.id === actId });
  if ((s.flags.scoutBonusOnce ?? 0) > 0) out.push({ label: l('Contatos da gala', 'Gala contacts'), values: { signals: s.flags.scoutBonusOnce } });
  return out;
});

// ---------------------------------------------------------------- mês

registerSimHook('month', 'intrigue', (s, r) => {
  const st = intrigue(s);
  if ((s.flags.scoutBonusOnce ?? 0) > 0) { s.flags.scoutBonusOnce = 0; bumpPerks(); }
  for (const sc of [...st.schemes]) {
    const valid = sc.target.kind === 'act' ? s.acts[sc.target.id] && s.acts[sc.target.id].status !== 'retired' && (sc.kind !== 'poach' || (s.acts[sc.target.id].owner && s.acts[sc.target.id].owner !== 'player')) : s.labels[sc.target.id]?.active;
    if (!valid) { st.schemes = st.schemes.filter((x) => x !== sc); logI(s, fmtL(l('Trama encerrada: o alvo saiu de cena ({t}).', 'Scheme ended: the target left the stage ({t}).'), { t: targetName(s, sc.target) })); continue; }
    if (sc.agents) post(s, `agents:${sc.id}:${s.year}:${s.month}`, -agentCost(s) * sc.agents, 'misc', 'Agentes');
    if (r.chance(schemeRisk(s, sc))) { discovered(s, sc); st.schemes = st.schemes.filter((x) => x !== sc); continue; }
    sc.progress += schemeSpeed(s, sc);
    if (sc.progress >= 100) {
      st.schemes = st.schemes.filter((x) => x !== sc);
      if (r.chance(schemeOdds(s, sc))) succeed(s, r, sc);
      else { logI(s, fmtL(l('A trama contra {t} não deu em nada.', 'The scheme against {t} came to nothing.'), { t: targetName(s, sc.target) }), 'bad'); notify(s, fmtL(l('A trama contra {t} fracassou.', 'The scheme against {t} failed.'), { t: targetName(s, sc.target) }), 'bad'); }
    }
  }
  for (const [id, until] of Object.entries(st.offerHooks)) if (until <= s.week) delete st.offerHooks[id];
});
