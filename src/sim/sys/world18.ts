// Rodada 18 (world18) — o mundo depois do palco e o mercado dos estreantes.
//  1. SEGUNDA CARREIRA: quem pendura as chuteiras escolhe pelo próprio jeito (persona13: facetas, atributos, opinião
//     política, habilidades) entre empresário(a), produtor(a), A&R num selo, dono(a) de selo, professor(a), radialista,
//     crítico(a), político(a), empresário(a) de outros ramos ou sair da indústria. Cada destino MEXE no jogo: o
//     produtor entra no estúdio (com cachê e som próprio), o A&R faz o selo dele contratar melhor no gênero, o radialista
//     toca (ou não) seus discos conforme a relação com você, o crítico idem, o professor forma alunos na cidade, o político
//     mexe na sua reputação institucional, o investidor oferece dinheiro (financiamento caro) — e quem saiu pode voltar.
//  2. VOLTAS: bandas e artistas aposentados voltam (aniversário, nostalgia do gênero, dívidas, saudade do palco) — e
//     voltam SEM selo: o mercado decide quem fica com eles.
//  3. ESTREANTES SEM SELO (item 7): atos novos começam livres; um selo rival que se interessa "corteja" por algumas
//     semanas (aparece no radar e na Caixa) e só assina se o artista aceitar e ninguém (você) cobrir antes.
//  4. MAIS PRODUTORES (item 10): produtores gerados por região e era (persona 'pd:', estúdio próprio, cachê por faixa).
// Modo "Vida real exata": pessoas reais intocadas não trocam de carreira nem voltam fora do roteiro.
// Gerador próprio por mês (semente), sem tocar no RNG do jogo.

import { Rng, clamp, hashString } from '../../core/rng';
import { FEE_TIER, prodById, type RealProd } from '../../data/producers15';
import { CITIES, cityById, familyOf, l, type FamilyId, type L } from '../../data/world';
import { signWithRival } from '../contracts';
import { dir17 } from '../director17';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { histLocked } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind, type AdvTip18 } from '../inbox18';
import { langForCity, personName } from '../people';
import { registerPersonAction } from '../personact18';
import { PRODUCERS, prodHooks, type ProducerDef } from '../studio';
import type { Act, GameState, Label, Person } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';
import { becomeManager17, career17, foundLabel17, move17, npc17, okPerson17 } from './npc17';
import { opine, opinionOf, per13, type P13 } from './persona13';
import { rivals8 } from './rivals8';

// ---------------------------------------------------------------- estado

export type Dest18 = 'manager' | 'producer' | 'anr' | 'label' | 'teacher' | 'radio' | 'critic' | 'politics' | 'business' | 'quit';
export const DEST18: Record<Dest18, [L, L]> = {
  manager: [l('empresário(a)', 'manager'), l('Disputa clientes; começa pelos ex-colegas.', 'Competes for clients, starting with old bandmates.')],
  producer: [l('produtor(a)', 'producer'), l('Entra no estúdio com som próprio; cachê sobe com a demanda.', 'Joins the studio list with an own sound; the fee rises with demand.')],
  anr: [l('A&R de selo', 'label A&R'), l('O selo que o(a) contratou passa a achar e assinar talentos do gênero antes dos outros.', 'The label that hired them starts finding and signing talent in the genre before others.')],
  label: [l('dono(a) de selo', 'label owner'), l('Abre um selo que disputa artistas como qualquer rival.', 'Opens a label that competes for acts like any rival.')],
  teacher: [l('professor(a)', 'teacher'), l('Abre uma escola: todo ano saem alunos mais preparados naquela cidade (e seu elenco pode ter aulas).', 'Opens a school: every year better-trained students come out of that city (and your roster can take lessons).')],
  radio: [l('radialista', 'radio host'), l('Programa de rádio no mercado dele(a): toca o gênero — e seus discos, se gostar de você.', 'A radio show in their market: plays the genre — and your records, if they like you.')],
  critic: [l('crítico(a)', 'critic'), l('Escreve sobre o gênero: a opinião sobre você vira apelo (ou falta dele) nos seus lançamentos.', 'Writes about the genre: their opinion of you becomes appeal (or the lack of it) on your releases.')],
  politics: [l('político(a)', 'politician'), l('Mandato: aliado(a) melhora sua reputação institucional; inimigo(a) piora.', 'In office: as an ally improves your institutional reputation; as an enemy, hurts it.')],
  business: [l('empresário(a) de outros ramos', 'businessperson'), l('Investe: compra parte de um selo rival ou oferece dinheiro a você (financiamento caro).', 'Invests: buys into a rival label or offers you money (expensive financing).')],
  quit: [l('largou a indústria', 'left the industry'), l('Vida longe da música — pode voltar um dia.', 'A life away from music — may come back one day.')],
};
export interface Car18 { k: Dest18; y: number; act: string; city: string; fam: FamilyId; lb?: string; until: number; why: L }
export interface W18 {
  /** pessoa (id) → segunda carreira */
  car: Record<string, Car18>;
  /** produtores de carreira nova (ex-artistas) desta partida */
  prods: RealProd[];
  /** ato → selo que corteja e semana da decisão */
  court: Record<string, { lb: string; w: number }>;
  /** ato → ano da volta */
  cb: Record<string, number>;
  /** investimento de ex-artista no seu selo: principal (centavos), parcelas restantes, quem */
  inv?: { pid: string; amt: number; left: number };
  log: [number, number, L][];
}
declare module '../ext4' { interface Ext4 { world18: W18 } }
const fresh = (): W18 => ({ car: {}, prods: [], court: {}, cb: {}, log: [] });
registerExt4('world18', fresh);
const ENS = new WeakSet<object>();
export function w18(s: GameState): W18 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.world18 ??= fresh()) as W18;
  if (!ENS.has(st)) { st.car ??= {}; st.prods ??= []; st.court ??= {}; st.cb ??= {}; st.log ??= []; ENS.add(st); for (const p of st.prods) ensureProd(p); for (const p of genProds18(s)) ensureProd(p); }
  return st;
}
const note = (s: GameState, t: L) => { const st = w18(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 120) st.log.length = 120; };

// ---------------------------------------------------------------- utilidades

const live = (a?: Act): a is Act => !!a && (a.status === 'active' || a.status === 'emerging');
const mkOf = (city: string): string => cityById[city]?.market ?? 'na';
const F = (P: P13 | null, k: string): number => (P?.facets[k as keyof P13['facets']] ?? 50) / 50;
const A = (P: P13 | null, k: string): number => (P?.attrs[k as keyof P13['attrs']] ?? 50) / 50;
const inLiveAct = (s: GameState, pid: string) => Object.values(s.acts).some((x) => live(x) && x.members.includes(pid));
/** Segunda carreira ativa de uma pessoa (id ou chave p:). */
export const career18 = (s: GameState, key: string): Car18 | undefined => { const c = w18(s).car[key.replace(/^p:/, '')]; return c && c.until >= s.year ? c : undefined; };
export const careersOf18 = (s: GameState, k?: Dest18): [string, Car18][] => Object.entries(w18(s).car).filter(([pid, c]) => c.until >= s.year && (!k || c.k === k) && s.persons[pid]?.alive);

// ---------------------------------------------------------------- produtores (ex-artistas e gerados)

const SIG: Partial<Record<FamilyId, RealProd['sig']>> = { hiphop: 'trap808', electronic: 'maximalist', caribbean: 'dub', rock: 'dry', blues_jazz: 'swing', pop: 'glossy', rnb: 'glossy', country_folk: 'organic', brazil: 'organic', latin: 'glossy', africa: 'organic', asia_me: 'glossy', europe: 'maximalist', sacred: 'organic' };
const defOf = (p: RealProd): ProducerDef => ({ id: `rp_${p.id}`, name: p.name, signature: p.sig, from: p.from, to: Math.min(p.to, p.died ?? 9999), families: p.fam, skill: p.skill, fee: FEE_TIER[p.tier], ego: p.ego, real: p.id, sound: { name: p.snd, prod: p.fx[0], perf: p.fx[1], orig: p.fx[2] } });
function ensureProd(p: RealProd): void {
  if (prodById[p.id] !== p) prodById[p.id] = p;
  const i = PRODUCERS.findIndex((x) => x.id === `rp_${p.id}`);
  if (i < 0) PRODUCERS.push(defOf(p)); else PRODUCERS[i] = defOf(p);
}
const GEN = new Map<string, RealProd[]>();
const tagOf = (s: GameState) => hashString(s.config.seed).toString(36);
/** Produtores gerados desta semente: um por mercado a cada ~12 anos, com som da cena local. */
export function genProds18(s: GameState): RealProd[] {
  const tag = tagOf(s);
  let g = GEN.get(tag);
  if (g) return g;
  const r = Rng.fromSeed(`${s.config.seed}|g18prod`);
  g = [];
  let i = 0;
  for (const mk of [...new Set(CITIES.map((c) => c.market))]) {
    const cs = CITIES.filter((c) => c.market === mk);
    for (let era = 1935; era <= 2025; era += 12) {
      const c = cs[r.int(0, Math.min(cs.length - 1, 6))];
      const fams = [...new Set(c.scenes.map((x) => familyOf(x)))] as FamilyId[];
      const fam = fams.length ? fams.slice(0, 2) : (['pop'] as FamilyId[]);
      const from = era + r.int(0, 10);
      const sig = SIG[fam[0]] ?? 'organic';
      const ear = r.int(55, 92);
      const p: RealProd = {
        id: `g18${tag}_${i++}`, name: personName(r, langForCity(c.id, r)), born: from - r.int(22, 36), city: c.id, studio: fmtL(l('Estúdio em {c}', 'Studio in {c}'), { c: c.name }).pt,
        from, to: from + r.int(14, 30), sig, snd: fmtL(l('Som da cena de {c}', 'The {c} scene sound'), { c: c.name }), fx: [r.int(0, 7), r.int(0, 7), r.int(0, 8)], fam,
        tier: (1 + Math.min(3, Math.floor(r.float(0, 3.6)))) as RealProd['tier'], skill: clamp(Math.round(ear * 0.9 + r.int(-5, 8)), 50, 92), ego: r.int(15, 85),
        a: [ear, r.int(35, 85), r.int(35, 85), r.int(35, 85), r.int(25, 80)],
        bio: fmtL(l('Produtor(a) da cena de {c}: entende o público local melhor que as estrelas de fora — e cobra menos.', 'Producer from the {c} scene: understands the local crowd better than outside stars — and charges less.'), { c: c.name }), w: [],
      };
      g.push(p);
    }
  }
  GEN.set(tag, g);
  return g;
}
// só aparecem na partida certa (catálogo PRODUCERS é global)
const okPrev = prodHooks.ok;
prodHooks.ok = (s, d) => {
  if (okPrev && !okPrev(s, d)) return false;
  if (d.id.startsWith('rp_g18')) return d.id.startsWith(`rp_g18${tagOf(s)}_`);
  if (d.id.startsWith('rp_x18_')) return w18(s).prods.some((p) => `rp_${p.id}` === d.id) && !!s.persons[d.id.slice(7)]?.alive;
  return true;
};

function makeProducer(s: GameState, r: Rng, p: Person, a: Act, P: P13 | null): RealProd {
  const fam = familyOf(a.genre) as FamilyId;
  const at = P?.attrs ?? { ear: 50, neg: 50, cha: 50, mgmt: 50, img: 50 };
  const sk = Math.max(p.skills.prod ?? 0, (p.skills.comp ?? 0) * 0.9);
  const pr: RealProd = {
    id: `x18_${p.id}`, name: p.name, born: p.born, city: a.city, studio: `${p.name.split(' ').slice(-1)[0]} Studio`, from: s.year, to: s.year + r.int(10, 25),
    sig: SIG[fam] ?? 'organic', snd: fmtL(l('O som de {a}, agora do outro lado do vidro', 'The {a} sound, now behind the glass'), { a: a.name }), fx: [2, 6, 4], fam: [fam],
    tier: (a.fame >= 60 ? 4 : a.fame >= 35 ? 3 : 2) as RealProd['tier'], skill: clamp(Math.round(sk * 0.7 + at.ear * 0.3 + 8), 45, 95), ego: Math.round(P?.facets.ego ?? 50),
    a: [at.ear, at.neg, at.cha, at.mgmt, at.img], bio: fmtL(l('Ex-integrante de {a}: produz quem lembra o começo dele(a).', 'Former member of {a}: produces acts that remind them of their own start.'), { a: a.name }), w: [],
  };
  w18(s).prods.push(pr);
  ensureProd(pr);
  return pr;
}

// ---------------------------------------------------------------- 1. segunda carreira

/** Pesos de cada destino pelo jeito da pessoa (com o porquê). */
export function destWeights18(s: GameState, p: Person, a: Act): { k: Dest18; w: number; why: L }[] {
  const P = per13(s, `p:${p.id}`);
  const age = s.year - p.born;
  const sk = (k: string) => ((p.skills as unknown as Record<string, number>)[k] ?? 40) / 50;
  const eng = (P?.views.eng ?? 40) / 50;
  const out: { k: Dest18; w: number; why: L }[] = [
    { k: 'manager', w: (F(P, 'sociabilidade') + F(P, 'ambicao')) * 0.6 + A(P, 'neg') * 0.6, why: l('sociável e bom(boa) de negociação', 'sociable and a good negotiator') },
    { k: 'producer', w: sk('prod') * 0.8 + A(P, 'ear') * 0.7 + F(P, 'perfeccionismo') * 0.3, why: l('ouvido e domínio de estúdio', 'a good ear and studio know-how') },
    { k: 'anr', w: A(P, 'ear') * 0.9 + F(P, 'curiosidade') * 0.5, why: l('faro para talento novo', 'a nose for new talent') },
    { k: 'label', w: a.fame >= 35 ? F(P, 'ambicao') * 0.8 + F(P, 'ego') * 0.4 + F(P, 'coragem') * 0.3 + a.fame / 100 : 0, why: l('ambição de mandar no próprio negócio', 'the ambition to run their own business') },
    { k: 'teacher', w: F(P, 'empatia') * 0.6 + F(P, 'paciencia') * 0.6 + (sk('instr') + sk('voice')) * 0.25, why: l('paciência e técnica para ensinar', 'patience and technique to teach') },
    { k: 'radio', w: A(P, 'cha') * 0.8 + F(P, 'humor') * 0.4 + F(P, 'sociabilidade') * 0.3, why: l('voz, carisma e conversa', 'voice, charisma and chat') },
    { k: 'critic', w: F(P, 'curiosidade') * 0.5 + F(P, 'teimosia') * 0.4 + sk('lyr') * 0.5, why: l('opinião forte e boa escrita', 'strong opinions and good writing') },
    { k: 'politics', w: (eng * 0.7 + F(P, 'ambicao') * 0.3 + A(P, 'cha') * 0.3) * (a.fame >= 30 ? 1.2 : 0.6), why: l('engajamento político e fama para virar voto', 'political engagement and fame that turns into votes') },
    { k: 'business', w: A(P, 'mgmt') * 0.6 + A(P, 'neg') * 0.4 + F(P, 'ambicao') * 0.3 + sk('biz') * 0.3, why: l('faro para negócios', 'a head for business') },
    { k: 'quit', w: F(P, 'melancolia') * 0.4 + F(P, 'ansiedade') * 0.4 + (age > 60 ? 0.9 : 0.3), why: l('cansaço da estrada e da indústria', 'tired of the road and the industry') },
  ];
  for (const x of out) x.w = Math.pow(Math.max(0, x.w), 3);
  return out;
}

const mayChange = (s: GameState, a: Act) => okPerson17(s, a) && !histLocked(s, a);

/** Aplica um destino (também usado por testes e pela situação do diretor). */
export function secondCareer18(s: GameState, r: Rng, p: Person, a: Act, k: Dest18, why: L): Car18 {
  const st = w18(s);
  const fam = familyOf(a.genre) as FamilyId;
  const c: Car18 = { k, y: s.year, act: a.id, city: a.city, fam, until: s.year + r.int(8, 25), why };
  const tx = (to: L, extra?: L) => fmtL(l('{p}, ex-{a}, virou {d}: {w}{x}.', '{p}, formerly of {a}, became a {d}: {w}{x}.'), { p: p.name, a: a.name, d: to, w: why, x: extra ?? '' });
  let text = tx(DEST18[k][0]);
  if (k === 'manager') { becomeManager17(s, r, p, a, why); st.car[p.id] = c; note(s, text); return c; }
  if (k === 'label') {
    const lb = foundLabel17(s, r, { by: `p:${p.id}`, name: p.name, born: p.born, city: a.city, genre: a.genre, cash: 40000 + a.fame * 1500, k: 'artist', why });
    c.lb = lb.id; text = tx(DEST18[k][0], fmtL(l(' ({n})', ' ({n})'), { n: lb.name }));
  } else if (k === 'producer') makeProducer(s, r, p, a, per13(s, `p:${p.id}`));
  else if (k === 'anr') {
    const lbs = Object.values(s.labels).filter((x) => x.active && x.territories.includes(mkOf(a.city) as Label['territories'][number]));
    const lb = lbs.sort((x, y) => (y.focus.includes(fam) ? 1 : 0) - (x.focus.includes(fam) ? 1 : 0) || y.reputation - x.reputation)[r.int(0, Math.min(2, lbs.length - 1))];
    if (lb) { c.lb = lb.id; if (!lb.focus.includes(fam)) lb.focus.push(fam); text = tx(DEST18[k][0], fmtL(l(' na {n}', ' at {n}'), { n: lb.name })); }
  } else if (k === 'business') {
    const lb = Object.values(s.labels).filter((x) => x.active && mkOf(x.city) === mkOf(a.city) && x.cash < money(s, 2_000_000))[0];
    if (lb) { lb.cash += money(s, 150000 + a.fame * 4000); c.lb = lb.id; text = tx(DEST18[k][0], fmtL(l(' e comprou parte da {n}', ' and bought into {n}'), { n: lb.name })); }
  }
  st.car[p.id] = c;
  career17(s, `p:${p.id}`, 'artist', k, why);
  move17(s, { k: 'career', a: a.id, p: `p:${p.id}`, lb: c.lb, t: text }, { kind: 'career', actors: [p.id, a.id, ...(c.lb ? [c.lb] : [])], sev: 12 + a.fame / 4, vis: a.fame >= 35 ? 'public' : 'rumor', tags: ['career', `career18:${k}`], place: a.city });
  note(s, text);
  if (k === 'business' && s.config.role !== 'artist' && opinionOf(s, `p:${p.id}`) >= 10 && !st.inv && s.player.cash < money(s, 400000)) {
    const amt = money(s, 60000 + a.fame * 2500);
    pushInbox18(s, 'world18_invest', { from: p.name, tone: 'info', ref: { pid: p.id, amt },
      subject: fmtL(l('{p} quer investir no seu selo', '{p} wants to invest in your label'), { p: p.name }),
      body: fmtL(l('Ex-{a}, agora nos negócios, oferece {v} já. Em troca: 6 parcelas anuais de 20% (120% no total). Dinheiro caro, mas na hora — e um sócio que conhece o meio.', 'Formerly of {a}, now in business, offers {v} now. In return: 6 yearly payments of 20% (120% in total). Expensive money, but immediate — and a partner who knows the scene.'), { a: a.name, v: `$${Math.round(amt / 100).toLocaleString('en-US')}` }),
      actions: [{ id: 'yes', label: l('Aceitar o dinheiro', 'Take the money') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 8 });
  }
  return c;
}

function careers(s: GameState, r: Rng, W: number): void {
  if (!r.chance(0.09 * W)) return;
  const st = w18(s);
  const n17 = npc17(s);
  const cands: [Person, Act][] = [];
  for (const a of Object.values(s.acts)) {
    if ((a.status !== 'retired' && a.status !== 'split') || a.deceased || a.fame < 10 || a.playerBand || a.owner === 'player' || !mayChange(s, a)) continue;
    for (const id of a.members) {
      const p = s.persons[id];
      const age = p ? s.year - p.born : 0;
      if (!p?.alive || p.isPlayer || age < 26 || age > 74 || st.car[id] || n17.car[`p:${id}`] || inLiveAct(s, id)) continue;
      cands.push([p, a]);
    }
  }
  if (!cands.length) return;
  const [p, a] = cands[r.int(0, cands.length - 1)];
  const ws = destWeights18(s, p, a);
  const pick = r.weighted(ws, (x) => x.w);
  if (pick) secondCareer18(s, r, p, a, pick.k, pick.why);
}

// efeitos mensais/anuais das segundas carreiras
function careerEffects(s: GameState, r: Rng): void {
  const st = w18(s);
  for (const [pid, c] of Object.entries(st.car)) {
    const p = s.persons[pid];
    if (!p?.alive || c.until < s.year) continue;
    if (c.k === 'anr' && c.lb && s.labels[c.lb]?.active && r.chance(0.08)) {
      // o A&R ex-artista acha um estreante livre do gênero na praça e o selo corteja
      const lb = s.labels[c.lb];
      const pool = Object.values(s.acts).filter((a) => live(a) && !a.owner && !st.court[a.id] && familyOf(a.genre) === c.fam && mkOf(a.city) === mkOf(c.city) && s.year - a.debutYear <= 2);
      const a = pool.sort((x, y) => y.potential - x.potential)[0];
      if (a) { courtNewcomer18(s, a, lb.id, fmtL(l('o A&R {p} (ex-artista) viu antes de todo mundo', 'A&R {p} (a former artist) spotted them before anyone'), { p: p.name })); }
    }
    if (s.month !== 0) continue;
    if (c.k === 'teacher') {
      const studs = Object.values(s.acts).filter((a) => live(a) && a.city === c.city && s.year - a.formed <= 2 && !a.catalogNo).slice(0, 2);
      for (const a of studs) for (const m of a.members) { const q = s.persons[m]; if (q && !q.isPlayer) for (const k of ['voice', 'instr', 'comp'] as const) q.skills[k] = Math.min(q.potential, (q.skills[k] ?? 30) + 3); }
      if (studs.length) note(s, fmtL(l('Saem da escola de {p} em {c}: {a}.', 'Out of {p}\'s school in {c}: {a}.'), { p: p.name, c: cityById[c.city]?.name ?? c.city, a: studs.map((a) => a.name).join(', ') }));
    }
    if (c.k === 'politics' && s.config.role !== 'artist') {
      const o = opinionOf(s, `p:${pid}`);
      if (o >= 25 || o <= -25) {
        const d = o >= 25 ? 2 : -2;
        s.player.reputation.institutional = clamp(s.player.reputation.institutional + d, 0, 100);
        const t = d > 0 ? fmtL(l('{p}, no mandato, defende o seu selo em público (reputação institucional +2).', '{p}, in office, defends your label in public (institutional reputation +2).'), { p: p.name })
          : fmtL(l('{p}, no mandato, ataca o seu selo em discursos (reputação institucional −2).', '{p}, in office, attacks your label in speeches (institutional reputation −2).'), { p: p.name });
        note(s, t); notify(s, t, d > 0 ? 'good' : 'bad');
      }
    }
  }
  // parcelas do investidor
  if (s.month === 0 && st.inv && st.inv.left > 0) {
    post(s, `w18inv:${s.year}`, -Math.round(st.inv.amt * 0.2), 'investor_share', 'Parcela do investidor (ex-artista)');
    st.inv.left -= 1;
    if (!st.inv.left) st.inv = undefined;
  }
}

// ---------------------------------------------------------------- 2. voltas

function comebacks(s: GameState, r: Rng, W: number): void {
  if (!r.chance(0.05 * W)) return;
  const st = w18(s);
  const cs: { a: Act; w: number; why: L }[] = [];
  for (const a of Object.values(s.acts)) {
    if ((a.status !== 'retired' && a.status !== 'split') || a.deceased || a.fame < 15 || a.playerBand || a.owner === 'player' || !mayChange(s, a) || st.cb[a.id]) continue;
    const gap = s.year - a.careerEnd;
    if (gap < 3 || gap > 30) continue;
    const alive = a.members.filter((id) => s.persons[id]?.alive && !inLiveAct(s, id));
    if (!alive.length || alive.length < Math.ceil(a.members.length / 2) || alive.some((id) => s.year - (s.persons[id]?.born ?? 0) > 78)) continue;
    const anniv = (s.year - a.debutYear) % 10 === 0;
    const pop = s.genrePop[a.genre] ?? 1;
    const broke = alive.some((id) => w18(s).car[id]?.k === 'quit');
    const w = a.fame / 40 * (anniv ? 2.2 : 1) * (pop > 1.1 ? 1.6 : 1) * (broke ? 1.3 : 1);
    const why = anniv ? fmtL(l('{n} anos da estreia', '{n} years since the debut'), { n: s.year - a.debutYear }) : pop > 1.1 ? l('o gênero voltou à moda', 'the genre is back in fashion') : broke ? l('saudade do palco (e das contas)', 'missing the stage (and the paychecks)') : l('negócios inacabados', 'unfinished business');
    cs.push({ a, w, why });
  }
  const c = r.weighted(cs, (x) => x.w);
  if (!c) return;
  const a = c.a;
  st.cb[a.id] = s.year;
  a.status = 'active';
  a.momentum = clamp(Math.max(a.momentum, 50) + 15, 0, 100);
  a.careerEnd = s.year + r.int(2, 8);
  for (const id of a.members) { const k = st.car[id]; if (k && k.until >= s.year) k.until = s.year - 1; }
  const t = fmtL(l('{a} anuncia a volta ({w}) — e volta sem selo: quem fizer a melhor proposta leva.', '{a} announces a comeback ({w}) — and comes back unsigned: the best offer wins.'), { a: a.name, w: c.why });
  emitFact(s, { kind: 'comeback', actors: [a.id], place: a.city, severity: 25 + a.fame / 3, visibility: 'public', tags: ['comeback', 'good'], text: t, src: 'world18' });
  remember(s, 'comeback', t, { actId: a.id, important: a.fame >= 35 });
  note(s, t);
  courtNewcomer18(s, a);
  if (s.config.role !== 'artist' && (a.fame >= 35 || (s.knowledge[a.id]?.degree ?? 0) >= 1)) notify(s, t, 'event');
}

// ---------------------------------------------------------------- 3. estreantes sem selo: o rival corteja

/** Um selo rival passa a cortejar o ato livre (estreia, solo novo ou volta): decide em algumas semanas. */
export function courtNewcomer18(s: GameState, act: Act, lbId?: string, why?: L): void {
  if (act.owner) return;
  const st = w18(s);
  const fam = familyOf(act.genre);
  const lb = lbId && s.labels[lbId]?.active ? s.labels[lbId]
    : Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 60000)).sort((x, y) => (y.focus.includes(fam) ? 1 : 0) - (x.focus.includes(fam) ? 1 : 0) || y.aggression - x.aggression)[0];
  if (!lb) return;
  const r = Rng.fromSeed(`${s.config.seed}|court18|${act.id}|${s.week}`);
  st.court[act.id] = { lb: lb.id, w: s.week + r.int(5, 12) };
  rivals8(s).interest[act.id] = { lb: lb.id, w: s.week };
  if (s.config.role !== 'artist' && (s.knowledge[act.id]?.degree ?? 0) >= 1) {
    notify(s, fmtL(l('{b} está cortejando {a}{w}. Se quiser, faça sua proposta nas próximas semanas.', '{b} is courting {a}{w}. If you want them, make your offer in the coming weeks.'), { b: lb.name, a: act.name, w: why ? fmtL(l(' ({x})', ' ({x})'), { x: why }) : '' }), 'info');
  }
}
export const courtOf18 = (s: GameState, actId: string): { lb: string; w: number } | undefined => w18(s).court[actId];

function courting(s: GameState, r: Rng): void {
  const st = w18(s);
  for (const [aid, c] of Object.entries(st.court)) {
    const a = s.acts[aid];
    const lb = s.labels[c.lb];
    if (!a || a.owner || !live(a) || !lb?.active) { delete st.court[aid]; continue; }
    if (c.w > s.week) continue;
    delete st.court[aid];
    // você fez proposta pendente: o artista ainda está pensando, o rival entra na disputa (rivals12) em vez de fechar
    if (s.offers.some((o) => o.actId === aid && (o.status === 'pending' || o.status === 'counter'))) continue;
    const p = clamp(0.45 + a.fame / 150 + lb.reputation / 400, 0.2, 0.85);
    if (!r.chance(p)) {
      note(s, fmtL(l('{a} recusou a {b} e segue livre.', '{a} turned {b} down and stays free.'), { a: a.name, b: lb.name }));
      continue;
    }
    signWithRival(s, a, lb.id, r);
    if (a.owner !== lb.id) continue;
    note(s, fmtL(l('{a} aceitou a proposta da {b}.', '{a} accepted {b}\'s offer.'), { a: a.name, b: lb.name }));
    if ((s.knowledge[aid]?.degree ?? 0) >= 2 && s.config.role !== 'artist') notify(s, fmtL(l('{b} fechou com {a}, que estava no seu radar.', '{b} signed {a}, who was on your radar.'), { b: lb.name, a: a.name }), 'bad');
  }
}

// ---------------------------------------------------------------- apelo: rádio e crítica de ex-artistas

const IX = new WeakMap<GameState, { w: number; radio: [string, Car18][]; critic: [string, Car18][] }>();
function idx(s: GameState) {
  let x = IX.get(s);
  if (!x || x.w !== s.week) { x = { w: s.week, radio: careersOf18(s, 'radio'), critic: careersOf18(s, 'critic') }; IX.set(s, x); }
  return x;
}
registerMod('appeal', 'world18', (s, value, ctx) => {
  const rel = ctx.release;
  const act = rel ? s.acts[rel.actId] : undefined;
  if (!rel || !act) return null;
  const X = idx(s);
  if (!X.radio.length && !X.critic.length) return null;
  const fam = familyOf(act.genre);
  const mine = rel.owner === 'player' || playerActs(s).includes(act.id);
  let v = 1;
  let who = '';
  for (const [pid, c] of X.radio) {
    if (c.fam !== fam || !rel.territories.includes(mkOf(c.city) as never)) continue;
    const o = mine ? opinionOf(s, `p:${pid}`) : 0;
    const k = o >= 20 ? 1.06 : o <= -20 ? 0.96 : 1.02;
    v *= k; who = s.persons[pid]?.name ?? who;
  }
  if (mine) for (const [pid, c] of X.critic) {
    if (c.fam !== fam) continue;
    const o = opinionOf(s, `p:${pid}`);
    if (o >= 20) { v *= 1.03; who = s.persons[pid]?.name ?? who; } else if (o <= -20) { v *= 0.96; who = s.persons[pid]?.name ?? who; }
  }
  if (v === 1) return null;
  return { value: value * v, label: fmtL(v > 1 ? l('Ex-artista na rádio/crítica a favor: {p}', 'Former artist on radio/in print on your side: {p}') : l('Ex-artista na rádio/crítica contra: {p}', 'Former artist on radio/in print against you: {p}'), { p: who }) };
});

// ---------------------------------------------------------------- ações sobre a pessoa, caixa e conselheiro

registerPersonAction({
  id: 'w18_lessons', label: l('Contratar aulas para o elenco', 'Hire lessons for your roster'), group: 'career', icon: 'book', cooldown: 26,
  desc: l('Ex-artista que virou professor(a): seus artistas mais crus ganham técnica.', 'A former artist turned teacher: your rawest acts gain technique.'),
  visible: (s, key) => career18(s, key)?.k === 'teacher',
  available: (s) => (playerActs(s).length ? null : l('Você não tem artistas.', 'You have no acts.')),
  cost: () => ({ usd: 900, balls: 1 }),
  run: (s, key) => {
    const a = playerActs(s).map((id) => s.acts[id]).filter(Boolean).sort((x, y) => avgSk(s, x) - avgSk(s, y))[0];
    for (const m of a.members) { const q = s.persons[m]; if (q && !q.isPlayer) for (const k of ['voice', 'instr', 'comp', 'stage'] as const) q.skills[k] = Math.min(q.potential, (q.skills[k] ?? 30) + 2); }
    opine(s, key, 4, l('contratou aulas comigo', 'hired lessons from me'));
    return { ok: true, text: fmtL(l('{a} teve aulas: voz, instrumento, composição e palco +2 (até o potencial).', '{a} took lessons: voice, instrument, songwriting and stage +2 (up to potential).'), { a: a.name }) };
  },
});
const avgSk = (s: GameState, a: Act) => a.members.reduce((t, m) => t + (s.persons[m]?.skills.voice ?? 50) + (s.persons[m]?.skills.instr ?? 50), 0) / Math.max(1, a.members.length);
registerPersonAction({
  id: 'w18_comeback', label: l('Propor uma volta', 'Pitch a comeback'), group: 'career', icon: 'star', cooldown: 52,
  desc: l('Convencer o ex-artista a reunir o ato antigo (que volta sem selo — você terá a primeira conversa).', 'Talk the former artist into reuniting their old act (it returns unsigned — you get the first talk).'),
  visible: (s, key) => { const c = w18(s).car[key.replace(/^p:/, '')]; const a = c ? s.acts[c.act] : undefined; return !!a && (a.status === 'retired' || a.status === 'split') && !a.deceased; },
  available: (s, key) => { const c = w18(s).car[key.replace(/^p:/, '')]; const a = c && s.acts[c.act]; return a && !mayChange(s, a) ? l('Vida real exata: só o roteiro real.', 'Exact real life: only the real script.') : null; },
  cost: () => ({ usd: 1500, balls: 1 }),
  chance: (s, key) => { const o = opinionOf(s, key); const p = clamp(0.25 + o / 120, 0.05, 0.8); return { p, why: [fmtL(l('Base 25%; opinião sobre você {o}', 'Base 25%; opinion of you {o}'), { o })] }; },
  run: (s, key, _r, ok) => {
    const c = w18(s).car[key.replace(/^p:/, '')];
    const a = c ? s.acts[c.act] : undefined;
    if (!ok || !a) return { ok: false, text: l('Não quer saber de voltar — por enquanto.', 'Not interested in coming back — for now.') };
    w18(s).cb[a.id] = s.year;
    a.status = 'active'; a.momentum = clamp(a.momentum + 30, 0, 100); a.careerEnd = s.year + 4;
    c.until = s.year - 1;
    const k = s.knowledge[a.id];
    if (k) k.degree = Math.max(k.degree, 3); else s.knowledge[a.id] = { actId: a.id, degree: 3, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'world18' } as unknown as GameState['knowledge'][string];
    emitFact(s, { kind: 'comeback', actors: [a.id, 'player'], place: a.city, severity: 30 + a.fame / 3, visibility: 'public', tags: ['comeback', 'good'], text: fmtL(l('{a} volta, a convite de {c}.', '{a} returns, at {c}\'s invitation.'), { a: a.name, c: s.config.companyName }), src: 'world18' });
    return { ok: true, text: fmtL(l('{a} topou voltar! Está livre: faça a proposta antes dos rivais.', '{a} agreed to return! They are free: make an offer before the rivals.'), { a: a.name }), ui: 'offer', uiArg: a.id };
  },
});

registerInboxKind('world18_invest', {
  label: l('Investidor', 'Investor'), cat: 'money', icon: 'coin', prio: 2,
  handle: (s, m, action) => {
    const st = w18(s);
    const amt = Number(m.ref?.amt ?? 0);
    if (action !== 'yes' || !amt || st.inv) return l('Você recusou o investimento.', 'You declined the investment.');
    post(s, `w18invin:${m.ref?.pid}`, amt, 'investment', 'Aporte de investidor (ex-artista)');
    st.inv = { pid: String(m.ref?.pid ?? ''), amt, left: 6 };
    return l('Dinheiro na conta. Seis parcelas anuais de 20% começam em janeiro.', 'Money in the bank. Six yearly 20% payments start in January.');
  },
});

registerAdvisorTip('world18', (s) => {
  if (s.config.role === 'artist') return [];
  const st = w18(s);
  const out: AdvTip18[] = [];
  const known = Object.entries(st.court).map(([aid, c]) => [s.acts[aid], c] as const).filter(([a]) => a && !a.owner && (s.knowledge[a.id]?.degree ?? 0) >= 1);
  const top = known.sort((x, y) => y[0]!.fame - x[0]!.fame)[0];
  if (top) {
    const [a, c] = top;
    out.push({ id: `w18court:${a!.id}`, level: 'warn', cat: 'rival', score: 55 + a!.fame / 4,
      text: fmtL(l('{b} está cortejando {a} (livre).', '{b} is courting {a} (unsigned).'), { b: s.labels[c.lb]?.name ?? '?', a: a!.name }),
      why: [fmtL(l('Decisão em ~{n} semanas.', 'Decision in ~{n} weeks.'), { n: Math.max(0, c.w - s.week) })], effect: l('Uma proposta sua agora força o rival a disputar em leilão.', 'An offer from you now forces the rival into a bidding war.'), goto: { act: a!.id } });
  }
  return out;
});

// ---------------------------------------------------------------- mês

registerSimHook('newgame', 'world18', (s) => { w18(s); });
registerSimHook('month', 'world18', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:world18:${s.year}:${s.month}`);
  const W = dir17(s).world;
  careers(s, r, W);
  careerEffects(s, r);
  comebacks(s, r, W);
  courting(s, r);
});
