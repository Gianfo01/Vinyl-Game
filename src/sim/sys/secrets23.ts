// Rodada 23 — SEGREDOS E VÍNCULOS (`secrets23`). Uma camada única por cima dos segredos que já existem espalhados
// pelo jogo: cada sistema continua dono do seu segredo (people/secrets: caso, dívida, plágio, filho, sonegação,
// biografia, jabá, dependência; crimemem23: membro de organização; sex17: armário; fakes19: dublagem; stream18:
// fazenda de streams; crimemem23: selo-fachada; crime17: ficha criminal; beliefs: fé/política declaradas) e entra
// aqui por um ADAPTADOR (registerSecretSource23). A camada guarda só o que cada observador SABE — jogador, imprensa
// e selos rivais — em 5 níveis (0 desconhecido, 1 suspeita, 2 boato, 3 confirmado, 4 público) e o porquê/fonte.
// Segredos novos (nativos): dívida com agiota (puxa a organização criminosa), doença escondida, colaborador do regime
// (censura), ghostwriter e informante da polícia.
// Canais de descoberta: investigação (detetive: custo/tempo, chance pela segurança e pela equipe), imprensa (veículos
// do mercado; o seu veículo de mídia apura junto), vazamentos (mágoas do holds17), informantes (relação com o crime),
// proximidade (elenco, equipe, relação pessoal) e rivais. Cada mudança emite um fato (facts17) com visibilidade.
// Opções do jogador: ignorar, proteger, chantagear, vazar para a imprensa, negociar — cartão na mesa (situations17).
// Exposição: escândalo (scandal17, que já pesa religiosidade/censura/imprensa do país) × peso da ÉPOCA por tipo
// (jabá antes/depois de 1959, drogas nos anos 60/70, dublagem depois de 1990, regime enquanto dura/depois, bots 2015+).
// Regras de história: pessoas/selos reais só têm segredos DOCUMENTADOS (os adaptadores trazem a crônica: Milli Vanilli,
// saídas do armário documentadas); invenções sobre gente real só fora do modo "Vida real exata" e nunca além de boato.

import { clamp, Rng, seedState } from '../../core/rng';
import { censorshipIn } from '../../data/content';
import { countryInfoByA3 } from '../../data/countries';
import { countryOfCity } from '../../data/geo';
import { cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { actsOfPerson17 } from '../actidx17';
import { isDevout, isPolitical, relById, polById, viewsOf } from '../beliefs';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, type Fact } from '../facts17';
import { histMode } from '../history15';
import { grantHold, holds17 } from '../holds17';
import { scandal, type ScandalKind } from '../scandal17';
import { addStress } from '../stress17';
import type { Act, Decision, GameState } from '../types';
import { fmtL, money, nextId, notify, playerActs, post } from '../util';
import { SEC17, a3Of, addHeat, crime17, isReal, orgById, orgs17 } from './crime17';
import { front23, mem23, reveal23 } from './crimemem23';
import { STREET } from './crimenpc17';
import { expose19, fk19 } from './fakes19';
import { leakSecret } from './people/secrets';
import { P as people } from './people/state';
import { comeOut, isQueer, sexOf } from './sex17';
import { st18 } from './stream18';
import { registerSituation } from './situations17';
import { ventures } from './ventures9';

// ================================================================ tipos

export type Lvl23 = 0 | 1 | 2 | 3 | 4;
export type Kind23 =
  // assumidos / públicos
  | 'orient' | 'faith' | 'politics' | 'excon'
  // sujeitos a boato
  | 'payola' | 'affair' | 'drugs' | 'ghostwriter' | 'lipsync' | 'plagiarism' | 'tax' | 'child' | 'crime' | 'debt' | 'fake_bio'
  // escondidos
  | 'closet' | 'informant' | 'regime' | 'front' | 'shark' | 'illness' | 'bots';
export type Chan23 = 'investigation' | 'press' | 'leak' | 'informant' | 'proximity' | 'rival' | 'own' | 'self';
export type Do23 = 'ignore' | 'protect' | 'blackmail' | 'leak' | 'negotiate';
/** Um vínculo/segredo. `subject`: 'p:<pessoa>' | 'a:<ato>' | 'lb:<selo>' | 's:<funcionário>' | 'player'. */
export interface Sec23 {
  id: string; kind: Kind23; subject: string; since: number; sev: number; ev: number;
  /** pessoa/selo real (regras de história) */ real?: boolean;
  /** documentado (crônica real): pode passar de boato */ doc?: boolean;
  /** adaptador de origem */ src: string;
  data?: Record<string, string | number>;
  /** o adaptador já sabe o nível de cada observador (ex.: segredo do próprio elenco) */
  base?: { p?: Lvl23; pr?: Lvl23; r?: Record<string, Lvl23> };
  end?: number;
}
export interface How23 { o: string; lv: Lvl23; ch: Chan23; w: number; t?: L }
export interface Know23 { p: Lvl23; pr: Lvl23; r: Record<string, Lvl23>; how: How23[]; done?: Do23; card?: 1; prot?: number }
export interface Inv23 { subj: string; due: number; cost: number }
export interface Secrets23State { k: Record<string, Know23>; own: Sec23[]; inv: Inv23[]; seq: number; lastCard?: number; n: { found: number; leaked: number; protect: number; blackmail: number } }
declare module '../ext4' { interface Ext4 { secrets23: Secrets23State } }
const fresh = (): Secrets23State => ({ k: {}, own: [], inv: [], seq: 0, n: { found: 0, leaked: 0, protect: 0, blackmail: 0 } });
registerExt4('secrets23', fresh);
export function sec23(s: GameState): Secrets23State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.secrets23 ??= fresh()) as Secrets23State;
  st.k ??= {}; st.own ??= []; st.inv ??= []; st.seq ??= 0; st.n ??= { found: 0, leaked: 0, protect: 0, blackmail: 0 };
  return st;
}

export const KIND23: Record<Kind23, { n: L; vis: 'assumed' | 'rumor' | 'hidden'; sc: ScandalKind }> = {
  orient: { n: l('orientação assumida', 'openly LGBT'), vis: 'assumed', sc: 'sex' },
  faith: { n: l('religião declarada', 'declared faith'), vis: 'assumed', sc: 'blasphemy' },
  politics: { n: l('militância política', 'political activism'), vis: 'assumed', sc: 'politics' },
  excon: { n: l('ex-presidiário(a)', 'ex-convict'), vis: 'assumed', sc: 'crime' },
  payola: { n: l('jabá pago a rádios', 'radio payola'), vis: 'rumor', sc: 'money' },
  affair: { n: l('caso extraconjugal', 'an affair'), vis: 'rumor', sc: 'sex' },
  drugs: { n: l('drogas / dependência', 'drugs / addiction'), vis: 'rumor', sc: 'drugs' },
  ghostwriter: { n: l('ghostwriter (não escreve as próprias músicas)', 'ghostwriter (does not write own songs)'), vis: 'rumor', sc: 'conduct' },
  lipsync: { n: l('dublagem / voz de outro', 'lip-sync / someone else\'s voice'), vis: 'rumor', sc: 'conduct' },
  plagiarism: { n: l('plágio', 'plagiarism'), vis: 'rumor', sc: 'conduct' },
  tax: { n: l('sonegação', 'tax evasion'), vis: 'rumor', sc: 'money' },
  child: { n: l('filho fora do casamento', 'a child out of wedlock'), vis: 'rumor', sc: 'sex' },
  crime: { n: l('ligação com o crime organizado', 'organized-crime ties'), vis: 'rumor', sc: 'crime' },
  debt: { n: l('dívidas escondidas', 'hidden debts'), vis: 'rumor', sc: 'money' },
  fake_bio: { n: l('biografia inventada', 'made-up biography'), vis: 'rumor', sc: 'conduct' },
  closet: { n: l('no armário', 'in the closet'), vis: 'hidden', sc: 'sex' },
  informant: { n: l('informante da polícia', 'police informant'), vis: 'hidden', sc: 'crime' },
  regime: { n: l('colaborou com o regime / a censura', 'collaborated with the regime / censors'), vis: 'hidden', sc: 'politics' },
  front: { n: l('sócio oculto / selo-fachada', 'hidden partner / front label'), vis: 'hidden', sc: 'crime' },
  shark: { n: l('dívida com agiota', 'loan-shark debt'), vis: 'hidden', sc: 'money' },
  illness: { n: l('doença escondida', 'hidden illness'), vis: 'hidden', sc: 'conduct' },
  bots: { n: l('streams falsos (fazenda de bots)', 'fake streams (bot farm)'), vis: 'hidden', sc: 'money' },
};
export const LVL23: L[] = [l('desconhecido', 'unknown'), l('suspeita', 'suspicion'), l('boato', 'rumor'), l('confirmado', 'confirmed'), l('público', 'public')];
export const CHAN23: Record<Chan23, L> = {
  investigation: l('investigação', 'investigation'), press: l('imprensa', 'press'), leak: l('vazamento', 'leak'), informant: l('informante', 'informant'),
  proximity: l('proximidade', 'proximity'), rival: l('rival', 'rival'), own: l('é do seu círculo', 'your own circle'), self: l('assumido', 'declared'),
};

// ================================================================ quem é o sujeito

export function subjName23(s: GameState, subj: string): string {
  if (subj === 'player') return s.config.companyName;
  const id = subj.slice(subj.indexOf(':') + 1);
  if (subj.startsWith('p:')) return s.persons[id]?.name ?? id;
  if (subj.startsWith('a:')) return s.acts[id]?.name ?? id;
  if (subj.startsWith('lb:')) return s.labels[id]?.name ?? id;
  if (subj.startsWith('s:')) return s.player.staff.find((x) => x.id === id)?.name ?? id;
  return id;
}
/** Ato que leva o escândalo (pessoa → o mais famoso dela). */
export function subjAct23(s: GameState, subj: string): Act | undefined {
  if (subj.startsWith('a:')) return s.acts[subj.slice(2)];
  if (!subj.startsWith('p:')) return undefined;
  let best: Act | undefined;
  for (const a of actsOfPerson17(s, subj.slice(2))) if (a.status !== 'retired' && a.status !== 'split' && (!best || a.fame > best.fame)) best = a;
  return best;
}
const subjCity = (s: GameState, subj: string): string => subjAct23(s, subj)?.city ?? (subj.startsWith('lb:') ? s.labels[subj.slice(3)]?.city : undefined) ?? s.config.homeCity;
/** É do círculo do jogador (elenco, equipe, ele mesmo). */
export function mine23(s: GameState, subj: string): boolean {
  if (subj === 'player' || subj.startsWith('s:')) return true;
  if (subj.startsWith('a:')) { const a = s.acts[subj.slice(2)]; return !!a && (a.owner === 'player' || !!a.playerBand); }
  if (subj.startsWith('p:')) return playerActs(s).some((id) => s.acts[id]?.members.includes(subj.slice(2)));
  return false;
}
const factActor = (subj: string): string => (subj.startsWith('a:') || subj.startsWith('lb:') ? subj.slice(subj.indexOf(':') + 1) : subj === 'player' ? 'player' : subj.startsWith('p:') ? subj.slice(2) : subj);

// ================================================================ adaptadores (pontes)

export interface Source23 {
  id: string;
  /** segredos deste sujeito segundo o sistema dono */
  about: (s: GameState, subj: string) => Sec23[];
  /** o jogador/imprensa subiu de nível: avisa o sistema dono (opcional) */
  write?: (s: GameState, sec: Sec23, obs: string, lv: Lvl23) => void;
  /** exposição própria do sistema dono (devolve true se tratou) */
  leak?: (s: GameState, sec: Sec23, by: L, mult: number) => boolean;
}
const SOURCES: Source23[] = [];
export function registerSecretSource23(src: Source23): void { const i = SOURCES.findIndex((x) => x.id === src.id); if (i >= 0) SOURCES[i] = src; else SOURCES.push(src); }
const srcOf = (sec: Sec23): Source23 | undefined => SOURCES.find((x) => x.id === sec.src);

const CACHE = new WeakMap<GameState, { w: number; v: number; m: Map<string, Sec23[]> }>();
let ver = 0;
const bust = (): void => { ver++; };
/** Todos os vínculos de um sujeito (pontes + nativos), já filtrados pelas regras de história. */
export function secretsOf23(s: GameState, subj: string): Sec23[] {
  let c = CACHE.get(s);
  if (!c || c.w !== s.week || c.v !== ver) CACHE.set(s, (c = { w: s.week, v: ver, m: new Map() }));
  const hit = c.m.get(subj);
  if (hit) return hit;
  const strict = histMode(s) === 'strict';
  const out: Sec23[] = [];
  for (const src of SOURCES) for (const x of src.about(s, subj)) {
    if (x.real && !x.doc && strict) continue; // vida real exata: nada inventado sobre gente real
    out.push(x);
  }
  c.m.set(subj, out);
  return out;
}
export const secById23 = (s: GameState, id: string): Sec23 | undefined => {
  const subj = id.slice(id.indexOf('|') + 1);
  return secretsOf23(s, subj).find((x) => x.id === id);
};
/** Teto de conhecimento: gente real sem documentação para no boato. */
export const cap23 = (sec: Sec23): Lvl23 => (sec.real && !sec.doc ? 2 : 4);

export function know23(s: GameState, sec: Sec23): Know23 {
  const st = sec23(s);
  let k = st.k[sec.id];
  const as = KIND23[sec.kind].vis === 'assumed';
  if (!k) k = { p: 0, pr: 0, r: {}, how: [] };
  const b = sec.base ?? {};
  const cp = cap23(sec);
  const mx = (a: Lvl23, x?: Lvl23): Lvl23 => Math.min(cp, Math.max(a, x ?? 0, as ? 4 : 0)) as Lvl23;
  const out: Know23 = { ...k, p: mx(k.p, b.p), pr: mx(k.pr, b.pr), r: { ...k.r } };
  for (const [lb, v] of Object.entries(b.r ?? {})) out.r[lb] = mx(out.r[lb] ?? 0, v);
  return out;
}
const knowW = (s: GameState, sec: Sec23): Know23 => (sec23(s).k[sec.id] ??= { p: 0, pr: 0, r: {}, how: [] });

/** Sobe o que um observador sabe ('player' | 'press' | id de selo). Emite fato. Devolve o novo nível. */
export function raise23(s: GameState, sec: Sec23, obs: string, to: Lvl23, ch: Chan23, t?: L): Lvl23 {
  const cur = know23(s, sec);
  const old = obs === 'player' ? cur.p : obs === 'press' ? cur.pr : cur.r[obs] ?? 0;
  const lv = Math.min(cap23(sec), to) as Lvl23;
  if (lv <= old) return old;
  const k = knowW(s, sec);
  if (obs === 'player') k.p = lv; else if (obs === 'press') k.pr = lv; else k.r[obs] = lv;
  k.how.push({ o: obs, lv, ch, w: s.week, ...(t ? { t } : {}) });
  if (k.how.length > 8) k.how.splice(0, k.how.length - 8);
  if (obs === 'player' && lv >= 2) sec23(s).n.found++;
  srcOf(sec)?.write?.(s, sec, obs, lv);
  const who = obs === 'player' ? l('Você', 'You') : obs === 'press' ? l('A imprensa', 'The press') : l(s.labels[obs]?.name ?? obs);
  emitFact(s, {
    kind: 'secret23', actors: [factActor(sec.subject), ...(obs !== 'player' && obs !== 'press' ? [obs] : [])], place: subjCity(s, sec.subject),
    severity: Math.round(sec.sev / 2 + lv * 5), visibility: obs === 'press' ? (lv >= 4 ? 'public' : 'rumor') : 'secret',
    tags: ['secret23', sec.kind, ch, `lv${lv}`], src: 'secrets23', data: { sec: sec.id, lv, obs },
    text: fmtL(l('{w} — {k} de {s}: {v} ({c}).', '{w} — {k} about {s}: {v} ({c}).'), { w: who, k: KIND23[sec.kind].n, s: subjName23(s, sec.subject), v: LVL23[lv], c: t ?? CHAN23[ch] }),
  });
  if (obs === 'player' && lv >= 2) maybeCard23(s, sec);
  return lv;
}

// ================================================================ época e país

/** Peso da época/país sobre a exposição deste tipo (o scandal17 ainda soma religiosidade, censura e imprensa). */
export const ERA23: ((s: GameState, sec: Sec23) => { k: number; why: L } | null)[] = [];
export function eraK23(s: GameState, sec: Sec23): { k: number; why: L } {
  let x = eraBase(s, sec);
  for (const f of ERA23) { const e = f(s, sec); if (e) x = { k: x.k * e.k, why: fmtL(l('{a}; {b}', '{a}; {b}'), { a: x.why, b: e.why }) }; }
  return x;
}
function eraBase(s: GameState, sec: Sec23): { k: number; why: L } {
  const y = s.year;
  const city = subjCity(s, sec.subject);
  const mk = (countryInfoByA3[countryOfCity(city) ?? '']?.market ?? cityById[city]?.market ?? 'na') as MarketId;
  const R = (k: number, why: L) => ({ k, why });
  switch (sec.kind) {
    case 'payola': return y < 1959 ? R(0.6, l('Antes das audiências de 1959, jabá era "costume do meio"', 'Before the 1959 hearings, payola was "how it worked"')) : y < 1966 ? R(1.4, l('Logo depois das audiências do jabá: tema quente', 'Right after the payola hearings: a hot topic')) : R(1, l('Jabá: escândalo de sempre', 'Payola: the usual scandal'));
    case 'drugs': return y < 1965 ? R(1.4, l('Anos 50/60: droga é caso de polícia e de moral', '1950s/60s: drugs are a police and morals matter')) : y < 1985 ? R(0.8, l('Contracultura: parte do público dá de ombros', 'Counterculture: part of the audience shrugs')) : R(1, l('Drogas: reação padrão', 'Drugs: standard reaction'));
    case 'lipsync': return y >= 1990 ? R(1.3, l('Depois do caso Milli Vanilli (1990), dublagem é fraude', 'After Milli Vanilli (1990), lip-sync is fraud')) : R(0.8, l('Antes de 1990, playback na TV era rotina', 'Before 1990, TV playback was routine'));
    case 'bots': return y < 2015 ? R(0.6, l('Poucos entendem streams falsos ainda', 'Few understand fake streams yet')) : R(clamp(1 + (y - 2015) * 0.04, 1, 1.5), l('Plataformas e imprensa caçam fazendas de streams', 'Platforms and press hunt stream farms'));
    case 'regime': { const cz = censorshipIn(y, mk).level; return cz >= 0.4 ? R(0.5, l('O regime ainda manda: quem colaborou é protegido', 'The regime still rules: collaborators are protected')) : R(1.4, l('Depois do regime: acerto de contas com quem colaborou', 'After the regime: a reckoning for collaborators')); }
    case 'ghostwriter': return familyOf(subjAct23(s, sec.subject)?.genre ?? 'pop') === 'hiphop' ? R(1.3, l('No rap, escrever as próprias letras é questão de honra', 'In rap, writing your own bars is a matter of honor')) : R(0.7, l('No pop, compositores de aluguel são comuns', 'In pop, hired writers are common'));
    case 'informant': return STREET(subjAct23(s, sec.subject)?.genre ?? '') ? R(1.4, l('Na cena de rua, "X9" é imperdoável', 'On the street scene, a snitch is unforgivable')) : R(1, l('Informante: escândalo de crime', 'Informant: crime scandal'));
    case 'illness': return R(0.5, l('Doença rende mais solidariedade que escândalo', 'Illness draws more sympathy than scandal'));
    case 'shark': case 'debt': return R(0.7, l('Dívida: vexame, mas não crime do devedor', 'Debt: embarrassing, not the debtor\'s crime'));
    case 'closet': return R(1, l('O armário pesa conforme a aceitação do país/época', 'The closet weighs as much as the country/era acceptance'));
    default: return R(1, l('Reação padrão', 'Standard reaction'));
  }
}

/** Expõe ao público: escândalo pelo sistema dono (ou genérico) e todos passam a saber. */
export function expose23(s: GameState, sec: Sec23, by: L, mult = 1): { eff: number; why: L[] } {
  const k = knowW(s, sec);
  const cp = cap23(sec);
  if (k.pr >= 4 || KIND23[sec.kind].vis === 'assumed') return { eff: 0, why: [] };
  sec23(s).n.leaked++;
  if (cp < 4) { // gente real sem documento: só boato, sem escândalo inventado
    raise23(s, sec, 'press', 2, 'press', by);
    return { eff: 0, why: [l('Pessoa real: fica no boato', 'Real person: stays a rumor')] };
  }
  k.pr = 4; k.p = 4;
  k.how.push({ o: 'press', lv: 4, ch: 'press', w: s.week, t: by });
  const E = eraK23(s, sec);
  bust();
  const src = srcOf(sec);
  srcOf(sec)?.write?.(s, sec, 'press', 4);
  if (src?.leak?.(s, sec, by, mult * E.k)) {
    emitFact(s, { kind: 'secret23', actors: [factActor(sec.subject)], place: subjCity(s, sec.subject), severity: Math.round(sec.sev * E.k), visibility: 'public', tags: ['secret23', sec.kind, 'exposed', 'lv4'], src: 'secrets23', data: { sec: sec.id, lv: 4, obs: 'press' }, text: fmtL(l('Exposto: {k} de {s} ({b}). {e}', 'Exposed: {k} about {s} ({b}). {e}'), { k: KIND23[sec.kind].n, s: subjName23(s, sec.subject), b: by, e: E.why }) });
    return { eff: Math.round(sec.sev * E.k * mult), why: [E.why] };
  }
  const sev = clamp(sec.sev * E.k * mult, 5, 95);
  const text = fmtL(l('{b} revela: {s} — {k}. {e}', '{b} reveals: {s} — {k}. {e}'), { b: by, s: subjName23(s, sec.subject), k: KIND23[sec.kind].n, e: E.why });
  const a = subjAct23(s, sec.subject);
  let eff = Math.round(sev);
  const why: L[] = [E.why];
  if (sec.subject === 'player') {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - sev / 8, 0, 100);
    emitFact(s, { kind: 'secret_exposed', actors: ['player'], place: s.config.homeCity, severity: sev, visibility: 'public', tags: ['secret23', sec.kind, 'bad'], text, src: 'secrets23' });
  } else if (sec.subject.startsWith('lb:')) {
    const lb = s.labels[sec.subject.slice(3)];
    if (lb) lb.reputation = clamp(lb.reputation - sev / 6, 0, 100);
    emitFact(s, { kind: 'secret_exposed', actors: [sec.subject.slice(3)], place: lb?.city, severity: sev, visibility: 'public', tags: ['secret23', sec.kind, 'bad'], text, src: 'secrets23' });
  } else if (a) {
    const R = scandal(s, a.id, KIND23[sec.kind].sc, sev, text, { person: sec.subject.startsWith('p:') ? sec.subject.slice(2) : undefined, tags: ['secret23', sec.kind] });
    eff = R.eff; why.push(...R.why.slice(0, 3));
  } else emitFact(s, { kind: 'secret_exposed', actors: [factActor(sec.subject)], place: subjCity(s, sec.subject), severity: sev, visibility: 'public', tags: ['secret23', sec.kind, 'bad'], text, src: 'secrets23' });
  if (sec.subject.startsWith('p:')) addStress(s, sec.subject.slice(2), Math.round(sev / 4), fmtL(l('Segredo exposto: {k}', 'Secret exposed: {k}'), { k: KIND23[sec.kind].n }));
  // efeitos de tipo
  if (sec.kind === 'informant' && sec.data?.o) { const o = orgById(s, String(sec.data.o)); if (o) grantHold(s, { holder: o.key, target: factActor(sec.subject), kind: 'grievance', strength: 85, months: 120, src: 'secrets23', text: l('Era X9', 'Was a snitch'), quiet: true }); }
  if (sec.kind === 'regime' && a) a.trust = clamp(a.trust - 4, 0, 100);
  return { eff, why };
}

// ================================================================ ações do jogador

export function actCost23(s: GameState, sec: Sec23, how: Do23): number {
  return how === 'protect' ? money(s, 800 + sec.sev * 40) : how === 'negotiate' ? money(s, 300 + sec.sev * 10) : 0;
}
/** Opções do jogador sobre um segredo que ele conhece (≥ boato). */
export function act23(s: GameState, secId: string, how: Do23): L {
  const sec = secById23(s, secId);
  if (!sec) return l('Esse segredo já não existe.', 'That secret no longer exists.');
  const K = know23(s, sec);
  if (K.p < 2 && how !== 'ignore') return l('Você ainda não sabe o bastante.', 'You do not know enough yet.');
  if (K.pr >= 4 && how !== 'ignore') return l('Já é público.', 'Already public.');
  const k = knowW(s, sec);
  const st = sec23(s);
  const name = subjName23(s, sec.subject);
  const target = factActor(sec.subject);
  const a = subjAct23(s, sec.subject);
  const pid = sec.subject.startsWith('p:') ? sec.subject.slice(2) : undefined;
  k.done = how; bust();
  if (how === 'ignore') return l('Você guarda para si.', 'You keep it to yourself.');
  if (how === 'protect') {
    const c = actCost23(s, sec, how);
    post(s, `sec23p:${sec.id}`, -c, 'marketing', 'Assessoria: proteção de imagem');
    k.prot = s.week + 104; st.n.protect++;
    if (a && mine23(s, sec.subject)) a.trust = clamp(a.trust + 5, 0, 100);
    if (pid) { const p = s.persons[pid]; if (p) p.morale = clamp(p.morale + 5, 0, 100); }
    grantHold(s, { holder: 'player', target, kind: 'favor', strength: 30 + sec.sev / 3, months: 60, src: 'secrets23', text: fmtL(l('Você protegeu {n} ({k})', 'You protected {n} ({k})'), { n: name, k: KIND23[sec.kind].n }), quiet: true });
    return fmtL(l('Protegido por 2 anos: a imprensa apura bem menos; {n} fica lhe devendo (confiança +5).', 'Protected for 2 years: the press digs far less; {n} owes you (trust +5).'), { n: name });
  }
  if (how === 'blackmail') {
    st.n.blackmail++;
    const a3 = a3Of(s, subjCity(s, sec.subject));
    addHeat(s, 'player', a3, 3 + sec.sev / 20);
    grantHold(s, { holder: target, target: 'player', kind: 'grievance', strength: 40 + sec.sev / 2, months: 120, src: 'secrets23', text: fmtL(l('Chantageado(a) por você ({k})', 'Blackmailed by you ({k})'), { k: KIND23[sec.kind].n }), quiet: true });
    let got = 0;
    if (sec.subject.startsWith('lb:')) { const lb = s.labels[sec.subject.slice(3)]; if (lb) { got = Math.max(0, Math.min(lb.cash * 0.08, money(s, 200 * sec.sev))); lb.cash -= got; s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 15; } }
    else if (a && !mine23(s, sec.subject)) { got = Math.max(0, Math.min(a.cash * 0.2, money(s, 120 * sec.sev))); a.cash -= got; }
    if (got > 0) post(s, `sec23b:${sec.id}`, Math.round(got), 'other_income', 'Acordo confidencial');
    else grantHold(s, { holder: 'player', target, kind: 'blackmail', strength: 40 + sec.sev / 2, months: 60, proof: K.p >= 3 ? 2 : 1, src: 'secrets23', text: fmtL(l('Sabemos de {k}', 'We know about {k}'), { k: KIND23[sec.kind].n }), quiet: true });
    if (pid) addStress(s, pid, 8, l('Chantageado(a)', 'Blackmailed'));
    // pode explodir: quem é chantageado às vezes conta tudo antes
    const r = new Rng(seedState(`sec23bm|${s.config.seed}|${sec.id}|${s.week}`));
    if (r.chance(0.12 + (K.p < 3 ? 0.1 : 0))) {
      expose23(s, sec, l('A própria vítima, denunciando a chantagem', 'The victim, exposing the blackmail'), 0.7);
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100);
      return l('Deu errado: a vítima foi à imprensa — e denunciou a chantagem.', 'It backfired: the victim went to the press — and exposed the blackmail.');
    }
    return got > 0 ? fmtL(l('{n} pagou pelo silêncio ({v}). Vai guardar mágoa; calor policial +.', '{n} paid for silence ({v}). They will hold a grudge; police heat +.'), { n: name, v: `$${Math.round(got / 100)}` })
      : fmtL(l('{n} agora lhe deve um favor "por bem". Vai guardar mágoa.', '{n} now owes you a favor "or else". They will hold a grudge.'), { n: name });
  }
  if (how === 'leak') {
    const mineMedia = ventures(s).list.find((v) => v.kind === 'media');
    const R = expose23(s, sec, mineMedia ? fmtL(l('Furo de {v}', 'Scoop by {v}'), { v: mineMedia.name }) : l('Uma fonte anônima', 'An anonymous source'));
    if (mineMedia) { mineMedia.reach = Math.round((mineMedia.reach ?? 0) + 2 + R.eff / 15); mineMedia.rep = clamp(mineMedia.rep + 2, 0, 100); }
    if (mine23(s, sec.subject)) { if (a) a.trust = clamp(a.trust - 15, 0, 100); s.player.reputation.artists = clamp(s.player.reputation.artists - 4, 0, 100); }
    if (!sec.subject.startsWith('lb:')) grantHold(s, { holder: target, target: 'player', kind: 'grievance', strength: 30 + sec.sev / 3, months: 60, src: 'secrets23', text: l('Vazou meu segredo', 'Leaked my secret'), quiet: true });
    else s.rivalries[sec.subject.slice(3)] = (s.rivalries[sec.subject.slice(3)] ?? 0) + 20;
    return fmtL(l('Vazado: escândalo de {e}{m}.', 'Leaked: scandal of {e}{m}.'), { e: R.eff, m: mineMedia ? fmtL(l('; {v} ganha alcance', '; {v} gains reach'), { v: mineMedia.name }) : '' });
  }
  // negociar: com o seu círculo, contar antes nos seus termos (meio estrago); com os outros, um acordo de favor mútuo
  if (mine23(s, sec.subject)) {
    post(s, `sec23n:${sec.id}`, -actCost23(s, sec, how), 'marketing', 'Entrevista exclusiva');
    const R = expose23(s, sec, l('Entrevista exclusiva, nos seus termos', 'Exclusive interview, on your terms'), 0.5);
    if (a) a.trust = clamp(a.trust + 4, 0, 100);
    return fmtL(l('Contado antes que descobrissem: estrago de {e} (metade).', 'Told before anyone found out: damage {e} (half).'), { e: R.eff });
  }
  grantHold(s, { holder: 'player', target, kind: 'favor', strength: 25 + sec.sev / 4, months: 36, src: 'secrets23', text: fmtL(l('Acordo de silêncio sobre {k}', 'Silence deal about {k}'), { k: KIND23[sec.kind].n }), quiet: true });
  if (sec.subject.startsWith('lb:')) s.rivalries[sec.subject.slice(3)] = Math.max(0, (s.rivalries[sec.subject.slice(3)] ?? 0) - 10);
  return fmtL(l('Acordo: você guarda o segredo, {n} lhe deve um favor (sem mágoa).', 'Deal: you keep the secret, {n} owes you a favor (no grudge).'), { n: name });
}

// ---------------------------------------------------------------- investigação (detetive)

export const invCost23 = (s: GameState): number => money(s, 2500);
export function invOdds23(s: GameState): { p: number; why: L[] } {
  const why: L[] = [l('Detetive particular: 35%', 'Private detective: 35%')];
  let p = 0.35;
  const sec = SEC17[crime17(s).sec]?.def ?? 0;
  if (sec) { p += sec; why.push(fmtL(l('Sua segurança (+{x}%)', 'Your security (+{x}%)'), { x: Math.round(sec * 100) })); }
  const st = s.player.staff.filter((x) => x.role === 'legal' || x.role === 'analyst' || x.role === 'publicist');
  if (st.length) { const d = Math.min(0.2, st.reduce((t, x) => t + x.skill, 0) / 500); p += d; why.push(fmtL(l('Equipe (jurídico/analista/assessoria) +{x}%', 'Staff (legal/analyst/publicist) +{x}%'), { x: Math.round(d * 100) })); }
  if (s.year >= 1995) { p += 0.05; why.push(l('Rastros digitais +5%', 'Digital traces +5%')); }
  return { p: clamp(p, 0.1, 0.9), why };
}
export function investigate23(s: GameState, subj: string): L {
  const st = sec23(s);
  if (st.inv.some((x) => x.subj === subj)) return l('Já há um detetive nesse caso.', 'A detective is already on it.');
  const c = invCost23(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `sec23inv:${subj}:${s.week}`, -c, 'admin', 'Detetive particular');
  st.inv.push({ subj, due: s.week + 4, cost: c });
  return fmtL(l('Detetive contratado: resposta em ~4 semanas ({p}% de achar algo).', 'Detective hired: answer in ~4 weeks ({p}% to find something).'), { p: Math.round(invOdds23(s).p * 100) });
}
function resolveInv(s: GameState, r: Rng): void {
  const st = sec23(s);
  for (const iv of st.inv.filter((x) => x.due <= s.week)) {
    st.inv = st.inv.filter((x) => x !== iv);
    const secs = secretsOf23(s, iv.subj).filter((x) => !x.end && KIND23[x.kind].vis !== 'assumed' && know23(s, x).p < 3).sort((a, b) => b.sev - a.sev);
    if (iv.subj.startsWith('lb:') && r.chance(0.15)) { const id = iv.subj.slice(3); s.rivalries[id] = (s.rivalries[id] ?? 0) + 8; }
    if (!secs.length || !r.chance(invOdds23(s).p)) { notify(s, fmtL(l('O detetive não achou nada concreto sobre {n}.', 'The detective found nothing solid on {n}.'), { n: subjName23(s, iv.subj) }), 'info'); continue; }
    const x = secs[0];
    const lv = raise23(s, x, 'player', (know23(s, x).p + 2) as Lvl23, 'investigation', fmtL(l('dossiê do detetive, semana {w}', 'detective\'s dossier, week {w}'), { w: s.week % 52 || 52 }));
    notify(s, fmtL(l('Dossiê: {n} — {k} ({v}).', 'Dossier: {n} — {k} ({v}).'), { n: subjName23(s, iv.subj), k: KIND23[x.kind].n, v: LVL23[lv] }), 'event');
  }
}

// ---------------------------------------------------------------- cartão de decisão

export const DO23: Record<Do23, { n: L; h: L }> = {
  ignore: { n: l('Ignorar', 'Ignore'), h: l('Nada muda.', 'Nothing changes.') },
  protect: { n: l('Proteger', 'Protect'), h: l('Custa assessoria; a imprensa apura bem menos por 2 anos; confiança +5 e um favor.', 'Costs PR; the press digs far less for 2 years; trust +5 and a favor.') },
  blackmail: { n: l('Chantagear', 'Blackmail'), h: l('Dinheiro ou favor; mágoa, calor policial e ~12% de explodir.', 'Cash or a favor; a grudge, police heat and ~12% chance it backfires.') },
  leak: { n: l('Vazar para a imprensa', 'Leak to the press'), h: l('Escândalo (pesado pela época/país); seu veículo de mídia ganha alcance; mágoa.', 'Scandal (weighted by era/country); your media outlet gains reach; a grudge.') },
  negotiate: { n: l('Negociar', 'Negotiate'), h: l('Seu círculo: contar antes, metade do estrago. Outros: silêncio em troca de favor.', 'Your circle: tell it first, half the damage. Others: silence for a favor.') },
};
registerSituation({
  id: 'secret23', pressure: 'power', cost: 1, cooldown: 0, playerOnly: true,
  when: () => false, actorsPick: () => null,
  title: (s, c) => fmtL(l('Você sabe algo sobre {n}', 'You know something about {n}'), { n: subjName23(s, String(c.cast.subj ?? '')) }),
  text: (s, c) => { const x = secById23(s, String(c.cast.sec)); return x ? fmtL(l('{k} ({v}).', '{k} ({v}).'), { k: KIND23[x.kind].n, v: LVL23[know23(s, x).p] }) : l('…', '…'); },
  options: (['ignore', 'protect', 'blackmail', 'leak', 'negotiate'] as Do23[]).map((id) => ({ id, label: DO23[id].n, hint: DO23[id].h, apply: (s: GameState, c: { cast: Record<string, string> }) => act23(s, c.cast.sec, id) })),
});
function maybeCard23(s: GameState, sec: Sec23): void {
  const st = sec23(s);
  const k = knowW(s, sec);
  if (k.card || k.done || sec.subject === 'player' || KIND23[sec.kind].vis === 'assumed' || know23(s, sec).pr >= 4) return;
  if ((st.lastCard ?? -99) > s.week - 4) return; // um cartão por mês no máximo
  k.card = 1; st.lastCard = s.week;
  const d: Decision = {
    id: nextId(s, 'd'), eventId: 'sit17:secret23', cat: 'people',
    title: fmtL(l('Você sabe algo sobre {n}', 'You know something about {n}'), { n: subjName23(s, sec.subject) }),
    text: fmtL(l('{k} ({v}; fonte: {c}). Época: {e}', '{k} ({v}; source: {c}). Era: {e}'), { k: KIND23[sec.kind].n, v: LVL23[know23(s, sec).p], c: k.how.at(-1)?.t ?? CHAN23[k.how.at(-1)?.ch ?? 'proximity'], e: eraK23(s, sec).why }),
    options: (['ignore', 'protect', 'blackmail', 'leak', 'negotiate'] as Do23[]).map((id) => ({ id, label: DO23[id].n, hint: DO23[id].h })),
    ctx: { hero: 'player', c_sec: sec.id, c_subj: sec.subject }, week: s.week, defaultOption: 'ignore', tags: ['secret23'],
  };
  s.decisions.push(d);
  notify(s, d.title, 'event');
}

// ================================================================ descoberta (mês)

/** Sujeitos acompanhados: seu círculo, os atos mais famosos, selos ativos e quem já tem ficha aqui. */
function tracked(s: GameState): string[] {
  const out = new Set<string>(['player']);
  for (const id of playerActs(s)) { const a = s.acts[id]; if (!a) continue; out.add(`a:${a.id}`); for (const m of a.members) out.add(`p:${m}`); }
  for (const x of s.player.staff) out.add(`s:${x.id}`);
  const top = Object.values(s.acts).filter((a) => a.status !== 'retired' && a.status !== 'split' && a.owner !== 'player').sort((a, b) => b.fame - a.fame).slice(0, 12);
  for (const a of top) { out.add(`a:${a.id}`); for (const m of a.members) out.add(`p:${m}`); }
  for (const lb of Object.values(s.labels)) if (lb.active) out.add(`lb:${lb.id}`);
  for (const x of sec23(s).own) if (!x.end) out.add(x.subject);
  return [...out];
}
const fameOf = (s: GameState, subj: string): number => subjAct23(s, subj)?.fame ?? (subj.startsWith('lb:') ? (s.labels[subj.slice(3)]?.reputation ?? 30) : 20);
/** Força da imprensa sobre o sujeito (fama, mágoas abertas contra ele, zines/cenas — ouvintes extras via PRESS23). */
/** Veículos do jogador fora das empresas (ex.: fanzine/revista própria do zines19): apuram junto com a imprensa. */
export const MEDIA23: ((s: GameState) => { name: string } | undefined)[] = [];
export const PRESS23: ((s: GameState, sec: Sec23) => { k: number; why?: L } | null)[] = [];

function discoverMonth(s: GameState, r: Rng): void {
  const st = sec23(s);
  const myMedia = ventures(s).list.find((v) => v.kind === 'media') ?? MEDIA23.map((f) => f(s)).find((x) => !!x);
  const playerPid = Object.values(s.persons).find((p) => p.isPlayer)?.id;
  const grudge = new Map<string, number>();
  for (const h of holds17(s).h) if (h.status === 'open' && (h.kind === 'grievance' || h.kind === 'secret')) grudge.set(h.target, (grudge.get(h.target) ?? 0) + 1);
  const rivals = Object.values(s.labels).filter((lb) => lb.active && (s.rivalries[lb.id] ?? 0) > 20);
  const C = crime17(s);
  for (const subj of tracked(s)) {
    for (const sec of secretsOf23(s, subj)) {
      if (sec.end || KIND23[sec.kind].vis === 'assumed') continue;
      const K = know23(s, sec);
      if (K.pr >= 4) continue;
      const mine = mine23(s, subj);
      const fame = fameOf(s, subj);
      const sv = sec.sev / 50;
      const act = subjAct23(s, subj);
      // proximidade: seu círculo e quem é próximo de você
      if (K.p < 3) {
        let pp = mine ? 0.04 * sv : 0;
        const near = subj.startsWith('p:') && playerPid ? (s.persons[subj.slice(2)]?.rel[playerPid] ?? 0) : 0;
        if (near > 40) pp += 0.02;
        if (pp && r.chance(pp)) raise23(s, sec, 'player', (K.p + 1) as Lvl23, 'proximity', act ? fmtL(l('ouvido no estúdio com {a}, semana {w}', 'overheard in the studio with {a}, week {w}'), { a: act.name, w: s.week % 52 || 52 }) : fmtL(l('conversa de corredor, semana {w}', 'hallway talk, week {w}'), { w: s.week % 52 || 52 }));
      }
      // informantes do crime: quem tem relação com a organização fica sabendo
      if (K.p < 3 && sec.data?.o && (C.org[String(sec.data.o)] ?? 0) > 20 && r.chance(0.05)) raise23(s, sec, 'player', (know23(s, sec).p + 1) as Lvl23, 'informant', fmtL(l('um contato de {o}', 'a contact in {o}'), { o: orgById(s, String(sec.data.o))?.name ?? '?' }));
      // imprensa: fama, mágoas abertas (vazamentos), proteção
      let kp = 0.004 * sv * (1 + fame / 40);
      const g = Math.min(3, grudge.get(factActor(subj)) ?? 0);
      if (g) kp += 0.01 * g;
      for (const f of PRESS23) { const x = f(s, sec); if (x) kp *= x.k; }
      if ((knowW(s, sec).prot ?? 0) > s.week) kp *= 0.3;
      if (r.chance(kp)) {
        const ch: Chan23 = g && r.chance(0.5) ? 'leak' : 'press';
        const lv = raise23(s, sec, 'press', (K.pr + 1) as Lvl23, ch, ch === 'leak' ? l('alguém magoado(a) contou', 'someone holding a grudge talked') : undefined);
        if (myMedia && know23(s, sec).p < lv) raise23(s, sec, 'player', Math.min(lv, 3) as Lvl23, 'press', fmtL(l('apurado por {v}', 'dug up by {v}'), { v: myMedia.name }));
        if (lv >= 3 && !((knowW(s, sec).prot ?? 0) > s.week && r.chance(0.7))) expose23(s, sec, ch === 'leak' ? l('Um ex-associado à imprensa', 'A former associate to the press') : l('Uma reportagem', 'A news report'));
      }
      // rivais: descobrem segredos do seu círculo e vazam quando a rixa é grande
      if (mine && rivals.length && r.chance(0.006 * (1 + sv))) {
        const lb = r.pick(rivals);
        const lv = raise23(s, sec, lb.id, ((K.r[lb.id] ?? 0) + 1) as Lvl23, 'rival');
        if (lv >= 2 && (s.rivalries[lb.id] ?? 0) > 40 && r.chance(0.35)) expose23(s, sec, fmtL(l('{b}, por vingança', '{b}, out of spite'), { b: lb.name }));
      }
    }
  }
  if (Object.keys(st.k).length > 800) { // poda: conhecimento de segredos encerrados e velhos
    for (const [id, k] of Object.entries(st.k)) if ((k.how.at(-1)?.w ?? 0) < s.week - 520) delete st.k[id];
  }
}

// ================================================================ segredos nativos

/** Cria um segredo nativo (também usado pelas ligações r23: filhos do dono etc.). */
export function addSecret23(s: GameState, x: Omit<Sec23, 'id' | 'src' | 'since'>): Sec23 {
  const st = sec23(s);
  const sec: Sec23 = { ...x, id: `n${++st.seq}|${x.subject}`, src: 'native', since: s.week };
  st.own.push(sec); bust();
  return sec;
}
function nativeMonth(s: GameState, r: Rng): void {
  const st = sec23(s);
  const strict = histMode(s) === 'strict';
  const live = st.own.filter((x) => !x.end);
  if (live.length > 220) return;
  const has = (subj: string, kind: Kind23) => st.own.some((x) => x.subject === subj && x.kind === kind && !x.end);
  const add = (x: Omit<Sec23, 'id' | 'src' | 'since'>): Sec23 => addSecret23(s, x);
  // fim natural
  for (const x of live) {
    const p = x.subject.startsWith('p:') ? s.persons[x.subject.slice(2)] : undefined;
    if (x.subject.startsWith('p:') && !p?.alive) { x.end = s.week; continue; }
    if (x.kind === 'shark') {
      if (p) addStress(s, p.id, 2, l('Dívida com agiota', 'Loan-shark debt'));
      const a = subjAct23(s, x.subject);
      if (a && a.cash > money(s, 3000) && r.chance(0.25)) { a.cash -= Number(x.data?.amt ?? 0); x.end = s.week; bust(); }
    }
    if (x.kind === 'illness' && r.chance(0.01)) x.end = s.week;
  }
  for (const subj of tracked(s)) {
    if (!subj.startsWith('p:')) continue;
    const p = s.persons[subj.slice(2)];
    if (!p?.alive || p.isPlayer) continue;
    const real = isReal(s, p.id);
    if (real && strict) continue;
    const a = subjAct23(s, subj);
    const city = a?.city ?? s.config.homeCity;
    const a3 = a3Of(s, city);
    const orgs = orgs17(s).filter((o) => o.a3 === a3 && (crime17(s).down[o.id] ?? 0) < s.week);
    // agiota: sem dinheiro e com organização na praça
    if (a && a.cash < 0 && orgs.length && !has(subj, 'shark') && r.chance(0.03)) {
      const o = r.pick(orgs);
      const amt = money(s, 1500 + r.int(0, 6) * 500);
      a.cash += amt;
      add({ kind: 'shark', subject: subj, sev: 35, ev: 40, real, data: { o: o.id, amt } });
      grantHold(s, { holder: o.key, target: p.id, kind: 'debt', strength: 45, months: 36, src: 'secrets23', text: l('Pegou dinheiro com a organização', 'Borrowed from the organization'), quiet: true });
    }
    // doença escondida
    if (s.year - p.born >= 40 && !has(subj, 'illness') && r.chance(0.0025)) add({ kind: 'illness', subject: subj, sev: 30, ev: 30, real });
    // colaborador do regime (censura forte no mercado)
    const mk = (countryInfoByA3[a3]?.market ?? cityById[city]?.market ?? 'na') as MarketId;
    if (censorshipIn(s.year, mk).level >= 0.5 && !has(subj, 'regime') && r.chance(0.004)) add({ kind: 'regime', subject: subj, sev: 45, ev: 30, real, data: { y: s.year } });
    // informante da polícia (cena de rua com organização ativa)
    if (a && STREET(a.genre) && orgs.length && !has(subj, 'informant') && r.chance(0.002)) add({ kind: 'informant', subject: subj, sev: 60, ev: 35, real, data: { o: r.pick(orgs).id } });
  }
  // ghostwriter: atos famosos de pop/rap
  for (const a of Object.values(s.acts)) {
    if (a.fame < 35 || a.status === 'retired' || a.status === 'split' || !['pop', 'hiphop', 'rnb'].includes(familyOf(a.genre))) continue;
    const real = !!a.catalogNo;
    if ((real && strict) || has(`a:${a.id}`, 'ghostwriter') || !r.chance(0.0015)) continue;
    add({ kind: 'ghostwriter', subject: `a:${a.id}`, sev: 40, ev: 40, real });
  }
}
registerSecretSource23({ id: 'native', about: (s, subj) => sec23(s).own.filter((x) => x.subject === subj && !x.end) });

// ================================================================ pontes com os sistemas existentes

const PS_KIND: Record<string, Kind23> = { affair: 'affair', debt: 'debt', plagiarism: 'plagiarism', child: 'child', tax: 'tax', fake_bio: 'fake_bio', payola: 'payola', addiction: 'drugs' };
const psSubj = (owner: string): string => (owner === 'owner' ? 'player' : owner.startsWith('label:') ? `lb:${owner.slice(6)}` : `p:${owner}`);
// people/secrets (dossiês): conhecimento do dono vira a base; a camada devolve o que descobre
registerSecretSource23({
  id: 'people',
  about: (s, subj) => people(s).secrets.filter((x) => psSubj(x.owner) === subj).map((x) => {
    const r: Record<string, Lvl23> = {};
    for (const k of x.knownBy) if (k !== 'press') r[k] = 3;
    const real = subj.startsWith('p:') ? isReal(s, subj.slice(2)) : subj.startsWith('lb:') ? isReal(s, subj.slice(3)) : false;
    return { id: `ps:${x.id}|${subj}`, kind: PS_KIND[x.kind] ?? 'debt', subject: subj, since: 0, sev: 20 + x.severity * 20, ev: 50, real, src: 'people', data: { ps: x.id },
      base: { p: x.leaked ? 4 : x.known || subj === 'player' ? 3 : 0, pr: x.leaked ? 4 : x.knownBy.includes('press') ? 2 : 0, r } } satisfies Sec23;
  }),
  write: (s, sec, obs, lv) => { const x = people(s).secrets.find((y) => y.id === sec.data?.ps); if (!x) return; if (obs === 'player' && lv >= 3) x.known = true; if (obs === 'press' && lv >= 2 && !x.knownBy.includes('press')) x.knownBy.push('press'); if (obs !== 'player' && obs !== 'press' && lv >= 2 && !x.knownBy.includes(obs)) x.knownBy.push(obs); },
  leak: (s, sec, by, mult) => { const x = people(s).secrets.find((y) => y.id === sec.data?.ps); if (!x || x.leaked) return false; leakSecret(s, x, by, mult); return true; },
});
// crimemem23: membro de organização (segredo → boato → confirmado já existe lá; a camada só traduz)
registerSecretSource23({
  id: 'crime23',
  about: (s, subj) => {
    const m = (subj.startsWith('p:') || subj.startsWith('s:')) ? mem23(s)[subj] : undefined;
    const out: Sec23[] = [];
    if (m) out.push({ id: `cm:${subj}|${subj}`, kind: 'crime', subject: subj, since: m.w, sev: 40 + m.rk * 12, ev: 40, real: subj.startsWith('p:') && isReal(s, subj.slice(2)), src: 'crime23', data: { o: m.o, rk: m.rk },
      base: { p: m.k === 2 ? 3 : m.k === 1 ? 2 : 0, pr: m.k === 2 && !subj.startsWith('s:') ? 4 : m.k === 1 ? 2 : 0 } });
    if (subj.startsWith('lb:')) { const o = front23(s, subj.slice(3)); const L0 = s.labels[subj.slice(3)]?.leaderId; const mm = L0 ? mem23(s)[`l:${L0}`] : undefined;
      if (o && mm) out.push({ id: `cf:${subj}|${subj}`, kind: 'front', subject: subj, since: mm.w, sev: 55, ev: 40, real: isReal(s, subj.slice(3)), src: 'crime23', data: { o: o.id, ld: `l:${L0}` }, base: { p: mm.k === 2 ? 3 : mm.k === 1 ? 2 : 0, pr: mm.k === 2 ? 3 : mm.k === 1 ? 2 : 0 } }); }
    return out;
  },
  write: (s, sec, obs, lv) => { const key = sec.kind === 'front' ? String(sec.data?.ld) : sec.subject; if (lv >= 3 && obs === 'press') reveal23(s, key, 2); else if (lv >= 2) reveal23(s, key, 1); },
});
// sex17: armário (o próprio sex17 decide quem está no armário; o jogo nunca expõe gente real)
registerSecretSource23({
  id: 'sex17',
  about: (s, subj) => {
    if (!subj.startsWith('p:')) return [];
    const pid = subj.slice(2);
    if (!s.persons[pid]?.alive) return [];
    const x = sexOf(s, pid);
    if (!isQueer(x)) return [];
    if (x.c === 'out') return [{ id: `sx:${pid}|${subj}`, kind: 'orient', subject: subj, since: 0, sev: 20, ev: 100, real: !!x.real, doc: !!x.real, src: 'sex17' }];
    if (x.c !== 'closet' || x.real) return [];
    return [{ id: `sx:${pid}|${subj}`, kind: 'closet', subject: subj, since: 0, sev: 50, ev: 30, src: 'sex17', base: { p: mine23(s, subj) ? 3 : 0 } }];
  },
  leak: (s, sec, by) => { comeOut(s, sec.subject.slice(2), 'outed', by.pt); return true; },
});
// fakes19: dublagem/voz-fantasma (inclui a crônica real documentada: Milli Vanilli)
registerSecretSource23({
  id: 'fakes19',
  about: (s, subj) => {
    if (!subj.startsWith('a:')) return [];
    const x = fk19(s).lip.find((y) => y.act === subj.slice(2) && !y.end);
    if (!x) return [];
    const real = !!s.acts[x.act]?.catalogNo;
    return [{ id: `lip:${x.act}|${subj}`, kind: 'lipsync', subject: subj, since: x.since, sev: 55, ev: x.risk, real, doc: real && !!x.exp, src: 'fakes19', base: { p: x.by === 'player' ? 3 : 0, pr: x.exp ? 4 : 0 } }];
  },
  leak: (s, sec) => { const x = fk19(s).lip.find((y) => y.act === sec.subject.slice(2) && !y.exp && !y.end); if (!x) return false; expose19(s, x, 'leak'); return true; },
});
// stream18: fazenda de streams (só lançamentos do jogador)
registerSecretSource23({
  id: 'st18',
  about: (s, subj) => {
    if (!subj.startsWith('a:')) return [];
    const aid = subj.slice(2);
    const f = Object.entries(st18(s).farm).find(([rid, x]) => x.until > s.week - 26 && s.releases[rid]?.actId === aid);
    return f ? [{ id: `farm:${f[0]}|${subj}`, kind: 'bots', subject: subj, since: f[1].w, sev: 50, ev: 50, src: 'st18', base: { p: 3 } }] : [];
  },
});
// vínculos assumidos: ficha criminal, fé e política declaradas
registerSecretSource23({
  id: 'assumed',
  about: (s, subj) => {
    if (!subj.startsWith('p:')) return [];
    const pid = subj.slice(2);
    const out: Sec23[] = [];
    const j = crime17(s).jail[pid];
    if (j) out.push({ id: `jail:${pid}|${subj}`, kind: j.u > s.week ? 'crime' : 'excon', subject: subj, since: 0, sev: 30, ev: 100, src: 'assumed', doc: true, base: { p: 4, pr: 4 }, data: { why: j.why.pt } });
    const p = s.persons[pid];
    if (p && (subjAct23(s, subj)?.fame ?? 0) >= 10) {
      const v = viewsOf(s, pid);
      if (isDevout(v, 75)) out.push({ id: `fa:${pid}|${subj}`, kind: 'faith', subject: subj, since: 0, sev: 10, ev: 100, src: 'assumed', doc: true, data: { v: relById[v.rel]?.name.pt ?? v.rel } });
      if (isPolitical(v, 75)) out.push({ id: `po:${pid}|${subj}`, kind: 'politics', subject: subj, since: 0, sev: 10, ev: 100, src: 'assumed', doc: true, data: { v: polById[v.pol]?.name.pt ?? v.pol } });
    }
    return out;
  },
});

// ================================================================ tick

registerSimHook('month', 'secrets23', (s) => {
  const r = new Rng(seedState(`secrets23|${s.config.seed}|${s.year}|${s.month}`));
  nativeMonth(s, r);
  resolveInv(s, r);
  discoverMonth(s, r);
});

/** O que o jogador sabe de um sujeito (UI: aba "O que sabemos"). */
export function knownAbout23(s: GameState, subj: string): { sec: Sec23; k: Know23 }[] {
  return secretsOf23(s, subj).map((sec) => ({ sec, k: know23(s, sec) })).filter((x) => x.k.p >= 1).sort((a, b) => b.k.p - a.k.p || b.sec.sev - a.sec.sev);
}
export const _secrets23 = { discoverMonth, nativeMonth, resolveInv, tracked, bust };
export type { Fact };
