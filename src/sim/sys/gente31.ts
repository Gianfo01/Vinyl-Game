// R31 · onda 4 (I) — GENTE DE VERDADE NOS LUGARES DA CIDADE. Cada lugar do Nosso mundo tem um DONO e uma EQUIPE com
// funções próprias (vendedor, técnico, bartender, recepcionista…) — pessoas diferentes, todas da base do jogo:
//   · o funcionário pode ser um músico pouco conhecido fazendo BICO (o vendedor da loja toca na noite, o técnico do
//     estúdio tem banda de garagem); a ficha mostra os dois lados ("Vendedor(a) na loja de discos · guitarra em X");
//   · a VAGA MUDA DE MÃOS: quem assina com uma gravadora (sua ou rival) ou passa a viver de música larga o emprego; quem
//     morre ou é preso sai; a vaga é preenchida na virada do mês — primeiro por gente que já existe (músicos sem
//     contrato, ex-artistas), só sem ninguém adequado nasce uma pessoa nova, que passa a existir de verdade;
//   · a carreira afundou (contrato acabou, fama caiu)? volta a ser candidato.
// Geração só no motor (gancho do mês e da nova partida); a tela e o mapa só leem (`crew31`). O registro de quem
// trabalha onde é este (`x4.gente31`); o papel aparece também em role.ts (uma pessoa, vários papéis).
// Sorte própria (Rng.fromSeed com a chave 'gente31'): não consome o fluxo do jogo.

import { Rng, clamp } from '../../core/rng';
import { FIRST_NAMES, LAST_NAMES } from '../../data/people';
import { countryOfCity } from '../../data/geo';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { addRole, endRole } from '../r31/role';
import { registerEditable, registerRunnable } from '../r31/editor';
import { registerSwitch, sw } from '../r31/switches';
import type { Act, GameState, Person } from '../types';
import { fmtL } from '../util';
import { CREW27, required27, type PlaceK27, type Person27 } from './place27';
import { actOfPid31, inTown31, jailUntil31, where31 } from './where31';
import { meet31, meNode31, met31, node31 } from '../social31';
import { nodeName31 } from './social31sys';
import { addSignal } from '../worldgen';

// ---------------------------------------------------------------- vagas

/** Funções de cada lugar: a primeira é o DONO; as outras, a equipe. A gravadora rival tem o CEO e os artistas dela. */
export const JOBS31: Partial<Record<PlaceK27, L[]>> = {
  venue: [l('Dono(a) da casa', 'Venue owner'), l('Técnico(a) de som', 'Sound engineer'), l('Bilheteiro(a)', 'Box office'), l('Bartender', 'Bartender')],
  records: [l('Dono(a) da loja', 'Shop owner'), l('Vendedor(a)', 'Salesperson'), l('Vendedor(a)', 'Salesperson')],
  radio: [l('Dono(a) da rádio', 'Station owner'), l('Diretor(a) de programação', 'Programme director'), l('Locutor(a)', 'Presenter')],
  studio: [l('Dono(a) do estúdio', 'Studio owner'), l('Produtor(a) da casa', 'House producer'), l('Técnico(a) de gravação', 'Recording engineer')],
  bar: [l('Dono(a) do bar', 'Bar owner'), l('Bartender', 'Bartender'), l('Garçom/garçonete', 'Waiter')],
  press: [l('Editor(a)-chefe', 'Editor-in-chief'), l('Redator(a)', 'Staff writer'), l('Crítico(a) de música', 'Music critic')],
  rehearsal: [l('Dono(a) da sala', 'Owner'), l('Zelador(a)', 'Caretaker')],
  office: [l('Sócio(a)-gerente', 'Managing partner'), l('Advogado(a)', 'Lawyer'), l('Contador(a)', 'Accountant')],
  apartments: [l('Síndico(a)', 'Building manager'), l('Porteiro(a)', 'Doorman')],
  hotel: [l('Gerente do hotel', 'Hotel manager'), l('Recepcionista', 'Receptionist'), l('Mensageiro(a)', 'Bellhop')],
  instruments: [l('Luthier e dono(a)', 'Luthier and owner'), l('Vendedor(a)', 'Salesperson')],
};
/** Quantos lugares do mesmo tipo têm equipe própria (a cidade comum repete escritórios e prédios). */
export const COPIES31: Partial<Record<PlaceK27, number>> = { office: 2, apartments: 2 };
/** Equipe que aceita músico fazendo bico (o dono não: dono de casa é ex-artista ou gente da cidade). */
const BICO_OK = (k: PlaceK27, i: number): boolean => i > 0 && !(k === 'office' && i === 1);
export const GENTE31 = {
  /** fama a partir da qual o músico vive de música e larga o bico */
  quitFame: 40,
  /** chance (por vaga) de a equipe ser um músico fazendo bico quando há candidato */
  bico: 0.65,
  /** pessoas novas no máximo por mês (o resto espera a vaga) */
  newPerMonth: 6,
};

export type Slot31 = string; // `${kind}:${cópia}:${função}`
export interface Job31 { p: string; w: number; bico?: 1 }
export interface Gente31St {
  /** vaga → ocupante */
  j: Record<Slot31, Job31>;
  /** últimas trocas: [semana, vaga, pessoa, motivo (0 saiu · 1 entrou)] */
  log: [number, Slot31, string, number, L?][];
  /** pessoas criadas aqui (contador do id) */
  n: number;
}
declare module '../ext4' { interface Ext4 { gente31: Gente31St } }
const fresh = (): Gente31St => ({ j: {}, log: [], n: 0 });
registerExt4('gente31', fresh);
export function gente31(s: GameState): Gente31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.gente31 ??= fresh()) as Gente31St;
}
/** Leitura sem criar o estado (interface). */
export const peekGente31 = (s: GameState): Gente31St | undefined => (s.x4 as unknown as { gente31?: Gente31St }).gente31;

registerSwitch({
  id: 'gente31', def: true, scope: 'game',
  desc: l('Gente de verdade nos lugares da cidade: donos e funcionários são pessoas da base (músicos fazendo bico largam o emprego quando assinam).',
    'Real people in the city\'s places: owners and staff are people from the database (musicians moonlighting quit when they sign).'),
});

export const slot31 = (k: PlaceK27, copy: number, i: number): Slot31 => `${k}:${copy}:${i}`;
export function parseSlot31(sl: Slot31): { k: PlaceK27; copy: number; i: number } {
  const [k, c, i] = sl.split(':');
  return { k: k as PlaceK27, copy: +c, i: +i };
}
/** Tipos de lugar com equipe neste ano. */
export function staffedKinds31(s: GameState): PlaceK27[] {
  const req = new Set(required27(s));
  return (Object.keys(JOBS31) as PlaceK27[]).filter((k) => k !== 'radio' || req.has('radio'));
}
/** Todas as vagas do ano. */
export function slots31(s: GameState): Slot31[] {
  const out: Slot31[] = [];
  for (const k of staffedKinds31(s)) for (let c = 0; c < (COPIES31[k] ?? 1); c++) JOBS31[k]!.forEach((_, i) => out.push(slot31(k, c, i)));
  return out;
}

// ---------------------------------------------------------------- quem pode ocupar

const hs = (str: string): number => { let x = 2166136261; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619) >>> 0; return x / 4294967296; };
const liveAct = (a: Act | undefined): boolean => !!a && a.status !== 'retired' && a.status !== 'split' && !a.deceased;

/** Músico fazendo bico: integrante de um ato da cidade, sem contrato e pouco conhecido. */
export function bicoOk31(s: GameState, pid: string): boolean {
  const p = s.persons[pid];
  if (!p || !p.alive || p.isPlayer || p.role === 'synthetic') return false;
  const a = actOfPid31(s, pid);
  return !!a && liveAct(a) && a.owner === null && !a.playerBand && a.fame < GENTE31.quitFame && a.city === s.config.homeCity;
}
/** Por que o ocupante largaria a vaga agora (ou null = fica). */
export function quitWhy31(s: GameState, sl: Slot31, j: Job31): L | null {
  const p = s.persons[j.p];
  if (!p || !p.alive) return l('morreu', 'died');
  if (jailUntil31(s, j.p) !== undefined) return l('foi preso(a)', 'was jailed');
  if (!j.bico) return null;
  const a = actOfPid31(s, j.p);
  if (!a || !liveAct(a)) return null; // a banda acabou: continua no emprego (agora sem o outro lado)
  if (a.owner === 'player') return fmtL(l('assinou com você ({a})', 'signed with you ({a})'), { a: a.name });
  if (a.owner) return fmtL(l('{a} assinou com {l}', '{a} signed with {l}'), { a: a.name, l: s.labels[a.owner]?.name ?? a.owner });
  if (a.fame >= GENTE31.quitFame) return fmtL(l('passou a viver de música com {a}', 'now makes a living from music with {a}'), { a: a.name });
  void sl;
  return null;
}

/** Ex-artistas sem banda ativa (donos, equipe sem bico): primeiro os da cidade, depois os do país que vieram para cá. */
function townsfolk(s: GameState, employed: Set<string>): string[] {
  const out: string[] = [], far: string[] = [];
  const a3 = countryOfCity(s.config.homeCity);
  for (const a of Object.values(s.acts)) {
    const home = a.city === s.config.homeCity;
    if ((!home && (!a3 || countryOfCity(a.city) !== a3)) || a.owner === 'player' || a.playerBand) continue;
    if (liveAct(a)) continue;
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p || !p.alive || p.isPlayer || employed.has(pid) || p.role === 'synthetic') continue;
      const age = s.year - p.born;
      if (age < 20 || age > 78 || liveAct(actOfPid31(s, pid))) continue;
      if (jailUntil31(s, pid) !== undefined) continue;
      (home ? out : far).push(pid);
    }
  }
  return [...new Set([...out, ...far])];
}
function bicoPool(s: GameState, employed: Set<string>): string[] {
  const out: string[] = [];
  for (const a of Object.values(s.acts)) {
    if (a.city !== s.config.homeCity || !liveAct(a) || a.owner !== null || a.playerBand || a.fame >= GENTE31.quitFame) continue;
    for (const pid of a.members) if (!employed.has(pid) && bicoOk31(s, pid) && jailUntil31(s, pid) === undefined && s.year - (s.persons[pid]?.born ?? 0) >= 17) out.push(pid);
  }
  return [...new Set(out)];
}

/** Pessoa nova (só quando não há ninguém adequado): passa a existir de verdade, sem consumir o contador de ids do jogo. */
function newcomer(s: GameState, r: Rng, owner: boolean): Person {
  const st = gente31(s);
  const lg = cityById[s.config.homeCity]?.lang ?? 'en';
  const fn = FIRST_NAMES[lg] ?? FIRST_NAMES.en, ln = LAST_NAMES[lg] ?? LAST_NAMES.en;
  const pot = r.int(18, 46);
  const roles: Person['role'][] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings'];
  const sk = () => clamp(Math.round(pot * 0.55 + r.normal(0, 7)), 3, 60);
  const id = `pg31${(++st.n).toString(36)}`;
  const p: Person = {
    id, name: `${r.pick(fn)} ${r.pick(ln)}`, born: s.year - (owner ? r.int(38, 66) : r.int(19, 44)), role: r.pick(roles),
    skills: { comp: sk(), lyr: sk(), voice: sk(), instr: sk(), prod: sk(), stage: sk(), biz: clamp(sk() + (owner ? 20 : 4), 3, 80) },
    potential: pot, traits: [], ambition: 'money', origin: owner ? 'family' : 'self_taught', morale: 65, inspiration: 50, fatigue: 10, stress: 15, resentment: 0,
    health: 'ok', alive: true, rel: {}, lowMoraleMonths: 0,
  } as Person;
  s.persons[id] = p;
  return p;
}

const ORG31 = (k: PlaceK27, copy: number): string => `place31:${k}${copy ? `#${copy + 1}` : ''}`;
function hire(s: GameState, sl: Slot31, pid: string, bico: boolean): void {
  const st = gente31(s);
  const { k, copy, i } = parseSlot31(sl);
  st.j[sl] = { p: pid, w: s.week, ...(bico ? { bico: 1 as const } : {}) };
  st.log.push([s.week, sl, pid, 1]);
  addRole(s, pid, i === 0 ? 'owner' : 'business', { org: ORG31(k, copy), data: { job: `${k}:${i}` } });
}
function fire(s: GameState, sl: Slot31, why: L): void {
  const st = gente31(s);
  const j = st.j[sl];
  if (!j) return;
  const { k, copy } = parseSlot31(sl);
  delete st.j[sl];
  st.log.push([s.week, sl, j.p, 0, why]);
  if (s.persons[j.p]) { endRole(s, j.p, 'owner', s.year, ORG31(k, copy)); endRole(s, j.p, 'business', s.year, ORG31(k, copy)); }
}

/** R33 (GENTE33 B): quem trabalha para o jogador noutro papel (diretor, CEO, equipe pessoal) não volta para uma vaga da
 *  cidade enquanto estiver lá. Cada regra devolve os ids; sem nada registrado, a virada do mês é a de antes. */
export const BUSY31: ((s: GameState) => string[])[] = [];
/** R33 (GENTE33 B): a pessoa larga a vaga agora (foi trabalhar com o jogador); a vaga é preenchida na virada do mês. */
export function leaveJob31(s: GameState, pid: string, why: L): boolean {
  const sl = Object.keys(peekGente31(s)?.j ?? {}).find((x) => gente31(s).j[x].p === pid);
  if (!sl) return false;
  fire(s, sl, why);
  return true;
}

/** Virada do mês: quem saiu larga a vaga e a vaga é preenchida (gente que existe primeiro). Determinístico. */
export function staffMonth31(s: GameState, cap = GENTE31.newPerMonth): { quit: number; hired: number; born: number } {
  const out = { quit: 0, hired: 0, born: 0 };
  if (!sw<boolean>(s, 'gente31')) return out;
  const st = gente31(s);
  const valid = new Set(slots31(s));
  for (const sl of Object.keys(st.j)) {
    if (!valid.has(sl)) { fire(s, sl, l('o lugar fechou', 'the place closed')); out.quit++; continue; }
    const why = quitWhy31(s, sl, st.j[sl]);
    if (why) { fire(s, sl, why); out.quit++; }
  }
  const employed = new Set(Object.values(st.j).map((x) => x.p));
  for (const f of BUSY31) for (const p of f(s)) employed.add(p);
  const ym = `${s.year}-${s.month}`;
  const r = Rng.fromSeed(`${s.config.seed}|gente31|${ym}`);
  // ordem estável dos candidatos (por semente e pessoa), para a mesma vaga não pegar sempre o mesmo perfil
  const order = (xs: string[], key: string) => xs.map((p) => [hs(`${s.config.seed}|${key}|${p}`), p] as [number, string]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  // um músico por banda antes de repetir banda (a loja não contrata a formação inteira)
  const spread = (xs: string[]) => { const seen = new Set<string>(); const a: string[] = [], b: string[] = []; for (const p of xs) { const id = actOfPid31(s, p)?.id ?? p; (seen.has(id) ? b : a).push(p); seen.add(id); } return [...a, ...b]; };
  let bicos = spread(order(bicoPool(s, employed), `b|${ym}`));
  let folk = order(townsfolk(s, employed), `t|${ym}`);
  for (const sl of [...valid]) {
    if (st.j[sl]) continue;
    const { k, i } = parseSlot31(sl);
    let pid: string | undefined;
    let bico = false;
    if (BICO_OK(k, i) && bicos.length && hs(`${s.config.seed}|bico|${sl}|${ym}`) < GENTE31.bico) { pid = bicos.shift(); bico = true; }
    if (!pid && i === 0) pid = folk.find((x) => s.year - (s.persons[x]?.born ?? s.year) >= 32);
    if (!pid) pid = folk[0];
    if (pid) folk = folk.filter((x) => x !== pid);
    if (!pid && BICO_OK(k, i) && bicos.length) { pid = bicos.shift(); bico = true; }
    if (!pid) {
      if (out.born >= cap) continue;
      pid = newcomer(s, r, i === 0).id;
      out.born++;
    }
    bicos = bicos.filter((x) => x !== pid);
    employed.add(pid);
    hire(s, sl, pid, bico);
    out.hired++;
  }
  if (st.log.length > 120) st.log.splice(0, st.log.length - 120);
  return out;
}

registerSimHook('newgame', 'gente31', (s) => { staffMonth31(s, Infinity); }); // a cidade nasce com todos os lugares atendidos
registerSimHook('month', 'gente31', (s) => { staffMonth31(s); });

// ---------------------------------------------------------------- leitura (mapa, interiores, ficha)

/** Nome do tipo de lugar, para a ficha ("na loja de discos"). */
export const KIND_AT31: Record<PlaceK27, L> = {
  venue: l('na casa de shows', 'at the venue'), records: l('na loja de discos', 'at the record shop'), radio: l('na rádio', 'at the radio station'),
  studio: l('no estúdio', 'at the studio'), bar: l('no bar', 'at the bar'), press: l('na redação', 'at the newsroom'), rehearsal: l('na sala de ensaio', 'at the rehearsal rooms'),
  label: l('na gravadora', 'at the label'), office: l('nos escritórios', 'at the offices'), apartments: l('no prédio', 'at the apartment block'),
  hotel: l('no hotel', 'at the hotel'), instruments: l('na loja de instrumentos', 'at the instrument shop'),
  facade: l('na fachada', 'at the front business'), police: l('na delegacia', 'at the police station'), market: l('no beco', 'in the alley'),
  home: l('em casa', 'at home'), vacant: l('no terreno', 'on the plot'),
};

/** O outro lado de quem faz bico: "guitarra em X". */
export function musicSide31(s: GameState, pid: string): L | null {
  const a = actOfPid31(s, pid);
  const p = s.persons[pid];
  if (!a || !liveAct(a) || !p) return null;
  return fmtL(l('toca em {a}', 'plays in {a}'), { a: a.name });
}

/** O emprego da pessoa (se tiver): função, lugar e o outro lado (bico). */
export function jobOf31(s: GameState, pid: string): { slot: Slot31; k: PlaceK27; role: L; at: L; bico: boolean; since: number; line: L } | null {
  const st = peekGente31(s);
  if (!st) return null;
  for (const [sl, j] of Object.entries(st.j)) {
    if (j.p !== pid) continue;
    const { k, i } = parseSlot31(sl);
    const role = JOBS31[k]?.[i] ?? l('Funcionário(a)', 'Staff');
    const side = j.bico ? musicSide31(s, pid) : null;
    const base = fmtL(l('{r} {a}', '{r} {a}'), { r: role, a: KIND_AT31[k] });
    const line = side ? fmtL(l('{b} · {m}', '{b} · {m}'), { b: base, m: side }) : base;
    return { slot: sl, k, role, at: KIND_AT31[k], bico: !!j.bico, since: j.w, line };
  }
  return null;
}

/** Dono e equipe do lugar (cópia `copy` do tipo), com quem está ali agora (agenda). null = sem registro. */
export function crew31(s: GameState, k: PlaceK27, copy = 0): Person27[] | null {
  const st = peekGente31(s);
  const jobs = JOBS31[k];
  if (!st || !jobs || !sw<boolean>(s, 'gente31')) return null;
  const c = Math.min(copy, (COPIES31[k] ?? 1) - 1);
  const out: Person27[] = [];
  jobs.forEach((role, i) => {
    const j = st.j[slot31(k, c, i)];
    const p = j ? s.persons[j.p] : undefined;
    if (!j || !p) return;
    const w = where31(s, p.id);
    const side = j.bico ? musicSide31(s, p.id) : null;
    out.push({ name: p.name, role: side ? fmtL(l('{r} · {m}', '{r} · {m}'), { r: role, m: side }) : role, pid: p.id, job: i, bico: !!j.bico, away: w.k === 'here' || w.k === 'studio' ? undefined : w.why,
      actId: j.bico ? actOfPid31(s, p.id)?.id : undefined, staff: true });
  });
  return out.length ? out : null;
}
CREW27.fn = crew31;

/** Últimas trocas de emprego (para a ficha do lugar e o diário da cidade). */
export function jobLog31(s: GameState, k?: PlaceK27, n = 6): { w: number; name: string; role: L; in: boolean; why?: L }[] {
  const st = peekGente31(s);
  if (!st) return [];
  return st.log.filter((x) => !k || parseSlot31(x[1]).k === k).slice(-n).reverse().map(([w, sl, pid, inn, why]) => {
    const { k: kk, i } = parseSlot31(sl);
    return { w, name: s.persons[pid]?.name ?? '?', role: JOBS31[kk]?.[i] ?? l('Funcionário(a)', 'Staff'), in: inn === 1, why };
  });
}

/** Estão na cidade e podem aparecer: equipe presente agora (quem viajou/foi preso aparece só na lista, como ausente). */
export const presentCrew31 = (s: GameState, xs: Person27[]): Person27[] => xs.filter((p) => !p.away && (!p.pid || inTown31(s, p.pid)));

// ---------------------------------------------------------------- editor (regra 10)

registerEditable({ id: 'gente31.quitFame', area: 'people', label: l('Lugares: fama a partir da qual o músico larga o bico', 'Places: fame at which a musician quits the day job'), kind: 'number', raw: true, min: 5, max: 100,
  get: () => GENTE31.quitFame, set: (_s, v) => { GENTE31.quitFame = clamp(Math.round(Number(v)), 5, 100); } });
registerEditable({ id: 'gente31.bico', area: 'people', label: l('Lugares: chance de a vaga ser de um músico fazendo bico (%)', 'Places: chance a job goes to a moonlighting musician (%)'), kind: 'number', raw: true, min: 0, max: 100,
  get: () => Math.round(GENTE31.bico * 100), set: (_s, v) => { GENTE31.bico = clamp(Number(v) / 100, 0, 1); } });
registerRunnable({ id: 'gente31.month', area: 'people', label: l('Lugares: preencher as vagas agora', 'Places: fill the jobs now'),
  help: l('Roda a troca de empregos da virada do mês (quem assinou sai, a vaga é preenchida).', 'Runs the month-turn job change (whoever signed leaves, the job is filled).'),
  run: (s) => { const r = staffMonth31(s); return fmtL(l('{q} saída(s), {h} contratação(ões), {b} pessoa(s) nova(s).', '{q} departure(s), {h} hire(s), {b} new person(s).'), { q: r.quit, h: r.hired, b: r.born }); } });

// ---------------------------------------------------------------- visitar: conhecer gente e descobrir talento

/** Conhecer alguém no lugar (grafo social: "visita"). Já se conhecem = nada muda. */
export function meetHere31(s: GameState, key: string): { ok: boolean; text: L } {
  const k = key.includes(':') ? key : `p:${key}`;
  const me = meNode31(s), them = node31(s, k);
  if (met31(s, me, them)) return { ok: false, text: l('Vocês já se conhecem.', 'You already know each other.') };
  meet31(s, me, them, 'visit');
  const name = k.startsWith('p:') ? s.persons[k.slice(2)]?.name ?? '?' : nodeName31(s, them);
  return { ok: true, text: fmtL(l('Você conheceu {n}.', 'You met {n}.'), { n: name }) };
}
/** Descobrir talento ao visitar: o ato entra no radar (grau 1), como uma noite de olheiro. */
export function scoutHere31(s: GameState, actId: string): { ok: boolean; text: L } {
  const a = s.acts[actId];
  if (!a) return { ok: false, text: l('Artista desconhecido.', 'Unknown act.') };
  if (a.owner === 'player') return { ok: false, text: l('Esse artista já é seu.', 'That act is already yours.') };
  if (s.knowledge[actId]) return { ok: false, text: l('Esse artista já está no seu radar.', 'That act is already on your radar.') };
  addSignal(s, Rng.fromSeed(`${s.config.seed}|gente31|scout|${actId}|${s.week}`), actId, 'visit31', { city: s.config.homeCity });
  return { ok: true, text: fmtL(l('{a} entrou no seu radar (Talentos).', '{a} is now on your radar (Talent).'), { a: a.name }) };
}
