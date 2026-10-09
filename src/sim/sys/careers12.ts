// Rodada 12 — carreiras. O dono pode ser gravadora, empresário, dono de festival, agente/promotor de shows,
// dono de casa de shows, dono de estúdio/produtor, editor, dono de mídia, dono de plataforma ou músico — e
// várias ao mesmo tempo. No Novo Jogo escolhe atividades principais, origem profissional e ambição; no
// meio da partida começa ou larga carreiras (tempo é finito: carreiras demais estressam); um herdeiro pode
// querer outras. Cada carreira tem cartão próprio na mesa (registro na interface). Gerador próprio.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, money, notify, remember } from '../util';
import { ownerOf } from './people/owner';
import { standingOf } from './standing9';
import { ventures } from './ventures9';

export type CareerId = 'label' | 'manager' | 'festival' | 'booking' | 'venue' | 'studio' | 'publisher' | 'media' | 'platform' | 'musician';
export interface CareerDef { id: string; name: L; desc: L; from: number; icon: string; area: string; load: number; status?: (s: GameState) => L | null }
export type Origin = 'musician' | 'roadie' | 'journalist' | 'lawyer' | 'heir' | 'dj' | 'accountant';
export type Ambition = 'money' | 'legacy' | 'power' | 'art' | 'family';

const vcount = (s: GameState, k: string) => ventures(s).list.filter((v) => v.kind === k).length;
const owns = (k: string, pt: string, en: string) => (s: GameState) => { const n = vcount(s, k); return n ? fmtL(l(`{n} ${pt}`, `{n} ${en}`), { n }) : l('Nenhum negócio ainda: abra em Empreendimentos ou use o mercado de serviços.', 'No business yet: found one in Ventures or use the services market.'); };

const DEFS: CareerDef[] = [
  { id: 'label', name: l('Gravadora', 'Record label'), desc: l('Contratar, gravar, lançar. O selo é o coração da partida.', 'Sign, record, release. The label is the heart of the run.'), from: 1900, icon: 'building', area: 'hq', load: 0.45,
    status: (s) => fmtL(l('{n} artistas no elenco', '{n} acts on the roster'), { n: Object.values(s.acts).filter((a) => a.owner === 'player').length }) },
  { id: 'manager', name: l('Empresário', 'Manager'), desc: l('Representa artistas de qualquer selo: confiança, plano de carreira, mandato e equipe.', 'Represents acts from any label: trust, career plan, mandate and team.'), from: 1900, icon: 'handshake', area: 'management', load: 0.35,
    status: (s) => fmtL(l('{n} clientes · reputação {r}', '{n} clients · reputation {r}'), { n: ventures(s).mg.clients.length, r: Math.round(ventures(s).mg.rep) }) },
  { id: 'festival', name: l('Dono de festival', 'Festival owner'), desc: l('Data, line-up, ingresso: lenda ou desastre.', 'Date, line-up, tickets: legend or disaster.'), from: 1950, icon: 'star', area: 'ventures', load: 0.25, status: owns('festival', 'festival(is)', 'festival(s)') },
  { id: 'booking', name: l('Agente/promotor de shows', 'Booking agent/promoter'), desc: l('Roteiros de turnê e comissão sobre cachês.', 'Tour routing and a cut of fees.'), from: 1930, icon: 'tour-bus', area: 'ventures', load: 0.25, status: owns('booking', 'agência(s)', 'agency(ies)') },
  { id: 'venue', name: l('Dono de casa de shows', 'Venue owner'), desc: l('Um palco próprio: agenda, bar, cena local.', 'A stage of your own: calendar, bar, local scene.'), from: 1900, icon: 'mic', area: 'ventures', load: 0.25, status: owns('venue', 'casa(s)', 'venue(s)') },
  { id: 'studio', name: l('Dono de estúdio/produtor', 'Studio owner/producer'), desc: l('Equipamento, som da casa, sessões para todos.', 'Gear, a house sound, sessions for everyone.'), from: 1920, icon: 'cd', area: 'ventures', load: 0.25, status: owns('studio', 'estúdio(s)', 'studio(s)') },
  { id: 'publisher', name: l('Editor musical', 'Music publisher'), desc: l('Compositores, catálogo, sincronização.', 'Songwriters, catalog, sync.'), from: 1900, icon: 'note', area: 'ventures', load: 0.2, status: owns('publisher', 'editora(s)', 'publisher(s)') },
  { id: 'media', name: l('Dono de mídia', 'Media owner'), desc: l('Revista, rádio, TV: poder de execução e cenas.', 'Magazine, radio, TV: airplay power and scenes.'), from: 1900, icon: 'bulb', area: 'ventures', load: 0.25, status: owns('media', 'veículo(s)', 'outlet(s)') },
  { id: 'platform', name: l('Dono de plataforma', 'Platform owner'), desc: l('Streaming: assinantes e briga pelo repasse.', 'Streaming: subscribers and payout fights.'), from: 2005, icon: 'globe', area: 'ventures', load: 0.35, status: owns('platform', 'plataforma(s)', 'platform(s)') },
  { id: 'musician', name: l('Músico', 'Musician'), desc: l('Você mesmo no palco e no estúdio (sua banda).', 'Yourself on stage and in the studio (your band).'), from: 1900, icon: 'guitar', area: 'artists', load: 0.35,
    status: (s) => { const b = Object.values(s.acts).find((a) => a.playerBand); return b ? fmtL(l('{b}: fama {f}', '{b}: fame {f}'), { b: b.name, f: b.fame }) : l('Sem banda própria (papel Híbrido).', 'No band of your own (Hybrid role).'); } },
];
/** Outros sistemas registram/refinam carreiras (ex.: casa de shows com área própria). */
export function registerCareer(d: CareerDef): void {
  const i = DEFS.findIndex((x) => x.id === d.id);
  if (i >= 0) DEFS[i] = d; else DEFS.push(d);
}
export const careerDefs = (s?: GameState) => DEFS.filter((d) => !s || d.from <= s.year);
export const careerDef = (id: string) => DEFS.find((d) => d.id === id);

export const ORIGINS: Record<Origin, { name: L; desc: L }> = {
  musician: { name: l('Ex-músico', 'Former musician'), desc: l('+carisma e ouvido; artistas confiam mais em você de saída.', '+charisma and ear; acts trust you more from the start.') },
  roadie: { name: l('Roadie/produção de estrada', 'Roadie/road crew'), desc: l('+gestão; contatos com agências e festivais.', '+management; contacts with bookers and festivals.') },
  journalist: { name: l('Jornalista musical', 'Music journalist'), desc: l('+ouvido; contatos na mídia.', '+ear; media contacts.') },
  lawyer: { name: l('Advogado do meio', 'Music lawyer'), desc: l('+negociação; mandatos e contratos saem melhores.', '+negotiation; better mandates and contracts.') },
  heir: { name: l('Herdeiro de família rica', 'Rich heir'), desc: l('Patrimônio inicial alto; os artistas desconfiam do "filhinho".', 'Big starting wealth; acts distrust the "rich kid".') },
  dj: { name: l('DJ/radialista', 'DJ/radio host'), desc: l('+carisma e ouvido; contatos em rádio e festivais.', '+charisma and ear; radio and festival contacts.') },
  accountant: { name: l('Contador', 'Accountant'), desc: l('+gestão e negociação; contatos em estúdios e gravadoras.', '+management and negotiation; studio and label contacts.') },
};
export const AMBITIONS: Record<Ambition, { name: L; desc: L }> = {
  money: { name: l('Fortuna', 'Fortune'), desc: l('Satisfeito quando o patrimônio e o caixa crescem no ano.', 'Content when wealth and cash grow over the year.') },
  legacy: { name: l('Legado', 'Legacy'), desc: l('Satisfeito quando o prestígio sobe e carreiras duram.', 'Content when prestige rises and careers last.') },
  power: { name: l('Poder', 'Power'), desc: l('Satisfeito com várias frentes e muitos clientes ao mesmo tempo.', 'Content running several fronts and many clients at once.') },
  art: { name: l('Arte', 'Art'), desc: l('Satisfeito quando sai música nova que você bancou ou produziu.', 'Content when new music you backed or produced comes out.') },
  family: { name: l('Família', 'Family'), desc: l('Satisfeito com pouca sobrecarga: no máximo duas carreiras e estresse baixo.', 'Content with little overload: at most two careers and low stress.') },
};
const ORIGIN_CONTACTS: Record<Origin, Partial<Record<string, number>>> = {
  musician: { studio: 6, producer: 6, festival: 4 }, roadie: { booking: 12, festival: 10 }, journalist: { media: 14, label: 4 }, lawyer: { label: 8 },
  heir: { label: 4, festival: 4 }, dj: { media: 10, festival: 8 }, accountant: { studio: 6, label: 8 },
};

export interface HeirWish { gen: number; name: string; wants: CareerId[]; ambition: Ambition; decided?: 'embrace' | 'tradition' | 'blend' }
export interface CareersState { init: boolean; active: string[]; origin: Origin; ambition: Ambition; started: Record<string, number>; gen: number; heir?: HeirWish; snap?: { y: number; worth: number; std: number; rel: number }; mood: { y: number; ok: boolean; t: L }[]; log: { y: number; t: L }[] }

declare module '../ext4' { interface Ext4 { careers12: CareersState } }
const fresh = (): CareersState => ({ init: false, active: [], origin: 'musician', ambition: 'legacy', started: {}, gen: 1, mood: [], log: [] });
registerExt4('careers12', fresh);

/** Estado; na primeira leitura aplica as escolhas do Novo Jogo (ou deduz pelo papel em saves antigos). */
export function careers(s: GameState): CareersState {
  const x = s.x4 as unknown as { careers12?: CareersState };
  const st = (x.careers12 ??= fresh());
  if (!st.init) {
    st.init = true;
    const cfg = s.config.careers;
    const main = (cfg?.main?.length ? cfg.main : s.config.role === 'hybrid' ? ['label', 'musician'] : ['label']).filter((id) => careerDef(id));
    st.active = main.length ? main : ['label'];
    for (const id of st.active) st.started[id] = s.year;
    st.origin = (cfg?.origin && cfg.origin in ORIGINS ? cfg.origin : 'musician') as Origin;
    st.ambition = (cfg?.ambition && cfg.ambition in AMBITIONS ? cfg.ambition : 'legacy') as Ambition;
    st.gen = ownerOf(s).generation;
    if (cfg) applyOrigin(s, st);
  }
  return st;
}

function applyOrigin(s: GameState, st: CareersState): void {
  const o = ownerOf(s);
  const add = (k: keyof typeof o.attrs, d: number) => (o.attrs[k] = clamp(o.attrs[k] + d, 10, 95));
  const m = st.origin;
  if (m === 'musician') { add('charisma', 6); add('ear', 4); }
  else if (m === 'roadie') add('management', 6);
  else if (m === 'journalist') add('ear', 6);
  else if (m === 'lawyer') add('negotiation', 10);
  else if (m === 'heir') o.wealth += money(s, 60000);
  else if (m === 'dj') { add('charisma', 4); add('ear', 4); }
  else { add('management', 8); add('negotiation', 3); }
  if (st.active.includes('manager')) ventures(s).mg.rep = clamp(ventures(s).mg.rep + 8, 0, 100);
}

/** Contatos (0–40) por tipo de serviço: origem + anos de carreira ativos ligados ao ramo. */
export function contactsFor(s: GameState, kind: string): number {
  const st = careers(s);
  const yrs = (id: string) => (st.active.includes(id) ? Math.min(15, s.year - (st.started[id] ?? s.year)) : 0);
  const near: Record<string, string[]> = { studio: ['studio', 'musician'], producer: ['studio', 'musician'], booking: ['booking', 'venue', 'manager'], festival: ['festival', 'booking', 'manager'], label: ['label', 'manager'], media: ['media'] };
  return Math.min(40, (ORIGIN_CONTACTS[st.origin][kind] ?? 0) + (near[kind] ?? []).reduce((t, id) => t + yrs(id), 0));
}
export const originTrust = (s: GameState) => ({ musician: 8, heir: -6, lawyer: 0, roadie: 3, journalist: 0, dj: 3, accountant: -2 }[careers(s).origin]);

/** Carga de tempo: 1 = um mês cheio. Acima disso o dono se estressa (e quem precisa de você sente). */
export function timeLoad(s: GameState): number {
  const st = careers(s);
  return st.active.reduce((t, id) => t + (careerDef(id)?.load ?? 0.25), 0) + LOAD_EXTRA.reduce((t, f) => t + f.fn(s), 0);
}
const LOAD_EXTRA: { id: string; fn: (s: GameState) => number }[] = [];
export function registerLoad(id: string, fn: (s: GameState) => number): void {
  const i = LOAD_EXTRA.findIndex((x) => x.id === id);
  if (i >= 0) LOAD_EXTRA[i] = { id, fn }; else LOAD_EXTRA.push({ id, fn });
}

const log = (s: GameState, t: L) => { const st = careers(s); st.log.push({ y: s.year, t }); if (st.log.length > 30) st.log.shift(); };

export function startCareer(s: GameState, id: string): { ok: boolean; text: L } {
  const st = careers(s);
  const d = careerDef(id);
  if (!d || d.from > s.year) return { ok: false, text: l('Essa carreira ainda não existe nesta época.', 'That career does not exist yet in this era.') };
  if (st.active.includes(id)) return { ok: false, text: l('Você já segue essa carreira.', 'You already follow that career.') };
  st.active.push(id);
  st.started[id] = s.year;
  const o = ownerOf(s);
  o.stress = clamp(o.stress + 5, 0, 100);
  if (id === 'manager') ventures(s).mg.rep = clamp(ventures(s).mg.rep + (st.origin === 'musician' || st.origin === 'lawyer' ? 4 : 0), 0, 100);
  const t = fmtL(l('{o} começa uma nova carreira: {c}.', '{o} starts a new career: {c}.'), { o: o.name, c: d.name });
  log(s, t);
  remember(s, 'careers12', t);
  const over = timeLoad(s) > 1;
  return { ok: true, text: over ? fmtL(l('{t} Atenção: sua agenda passou do limite (carga {p}%).', '{t} Careful: your schedule is over the limit ({p}% load).'), { t, p: Math.round(timeLoad(s) * 100) }) : t };
}

export function dropCareer(s: GameState, id: string): { ok: boolean; text: L } {
  const st = careers(s);
  if (!st.active.includes(id)) return { ok: false, text: l('Inválido.', 'Invalid.') };
  if (st.active.length === 1) return { ok: false, text: l('Você precisa de pelo menos uma carreira.', 'You need at least one career.') };
  st.active = st.active.filter((x) => x !== id);
  const d = careerDef(id)!;
  // largar o ofício não fecha os negócios, mas quem dependia de você nota
  if (id === 'manager') for (const c of ventures(s).mg.clients) c.sat = clamp(c.sat - 10, 0, 100);
  const t = fmtL(l('Você deixa a carreira de {c} em segundo plano.', 'You put your {c} career on the back burner.'), { c: d.name });
  log(s, t);
  return { ok: true, text: id === 'manager' ? fmtL(l('{t} Seus agenciados se sentem abandonados (−10 de satisfação).', '{t} Your clients feel abandoned (−10 satisfaction).'), { t }) : t };
}
export const isActive = (s: GameState, id: string) => careers(s).active.includes(id);

export function setAmbition(s: GameState, a: Ambition): void {
  const st = careers(s);
  if (st.ambition === a) return;
  st.ambition = a;
  ownerOf(s).stress = clamp(ownerOf(s).stress + 4, 0, 100);
  log(s, fmtL(l('Nova ambição: {a}.', 'New ambition: {a}.'), { a: AMBITIONS[a].name }));
}

// ---------------------------------------------------------------- herdeiro

export function decideHeir(s: GameState, how: 'embrace' | 'tradition' | 'blend'): { ok: boolean; text: L } {
  const st = careers(s);
  const w = st.heir;
  if (!w || w.decided) return { ok: false, text: l('Nada a decidir.', 'Nothing to decide.') };
  w.decided = how;
  const o = ownerOf(s);
  let t: L;
  if (how === 'embrace') {
    st.active = w.wants.slice();
    for (const id of w.wants) st.started[id] ??= s.year;
    st.ambition = w.ambition;
    o.stress = clamp(o.stress - 10, 0, 100);
    t = fmtL(l('{h} segue o próprio caminho: {c}.', '{h} follows their own path: {c}.'), { h: w.name, c: w.wants.map((id) => careerDef(id)!.name.pt).join(', ') });
  } else if (how === 'tradition') {
    o.stress = clamp(o.stress + 15, 0, 100);
    t = fmtL(l('{h} mantém as carreiras da família, a contragosto.', '{h} keeps the family careers, reluctantly.'), { h: w.name });
  } else {
    for (const id of w.wants) if (!st.active.includes(id)) { st.active.push(id); st.started[id] = s.year; }
    t = fmtL(l('{h} soma os próprios sonhos às carreiras herdadas.', '{h} adds their own dreams to the inherited careers.'), { h: w.name });
  }
  log(s, t);
  remember(s, 'careers12', t);
  return { ok: true, text: t };
}

function checkHeir(s: GameState, st: CareersState): void {
  const o = ownerOf(s);
  if (o.generation === st.gen) return;
  st.gen = o.generation;
  const r = Rng.fromSeed(`${s.config.seed}:careers12:heir:${o.generation}`);
  const pool = careerDefs(s).map((d) => d.id as CareerId);
  r.shuffle(pool);
  const wants = pool.slice(0, r.int(1, 2));
  if (r.chance(0.5) && !wants.includes(st.active[0] as CareerId)) wants.push(st.active[0] as CareerId);
  st.heir = { gen: o.generation, name: o.name, wants, ambition: r.pick(Object.keys(AMBITIONS) as Ambition[]) };
  notify(s, fmtL(l('{h} tem outros sonhos: quer ser {c}. Decida em Você → Carreiras.', '{h} has other dreams: wants to be {c}. Decide in You → Careers.'), { h: o.name, c: wants.map((id) => careerDef(id)!.name.pt).join(', ') }), 'event');
}

// ---------------------------------------------------------------- mês e ano

const worth = (s: GameState) => s.player.cash + ownerOf(s).wealth;
function ambitionMet(s: GameState, st: CareersState): { ok: boolean; why: L } {
  const sn = st.snap!;
  const o = ownerOf(s);
  switch (st.ambition) {
    case 'money': { const ok = worth(s) > sn.worth * 1.05; return { ok, why: ok ? l('o patrimônio cresceu', 'your fortune grew') : l('o dinheiro não cresceu', 'the money did not grow') }; }
    case 'legacy': { const ok = standingOf(s, 'player').rec + ventures(s).mg.rep > sn.std + 1; return { ok, why: ok ? l('o prestígio subiu', 'prestige rose') : l('o prestígio parou', 'prestige stalled') }; }
    case 'power': { const ok = st.active.length >= 3 || ventures(s).mg.clients.length + ventures(s).list.length >= 4; return { ok, why: ok ? l('você comanda várias frentes', 'you run several fronts') : l('poucas frentes sob seu comando', 'too few fronts under your command') }; }
    case 'art': { const n = Object.values(s.releases).filter((x) => x.owner === 'player').length; const ok = n > sn.rel; return { ok, why: ok ? l('saiu música nova sua', 'new music of yours came out') : l('nenhum lançamento novo', 'no new release') }; }
    default: { const ok = st.active.length <= 2 && o.stress < 55; return { ok, why: ok ? l('sobrou tempo para casa', 'there was time for home') : l('o trabalho engoliu a família', 'work swallowed the family') }; }
  }
}

function careersMonth(s: GameState): void {
  const st = careers(s);
  checkHeir(s, st);
  const o = ownerOf(s);
  const load = timeLoad(s);
  if (load > 1) o.stress = clamp(o.stress + (load - 1) * 8, 0, 100);
  if (s.month !== 0) return;
  const snap = { y: s.year, worth: worth(s), std: standingOf(s, 'player').rec + ventures(s).mg.rep, rel: Object.values(s.releases).filter((x) => x.owner === 'player').length };
  if (st.snap && st.snap.y < s.year) {
    const m = ambitionMet(s, st);
    o.stress = clamp(o.stress + (m.ok ? -6 : 6), 0, 100);
    const t = fmtL(m.ok ? l('Ambição ({a}) satisfeita: {w}.', 'Ambition ({a}) fulfilled: {w}.') : l('Ambição ({a}) frustrada: {w}.', 'Ambition ({a}) frustrated: {w}.'), { a: AMBITIONS[st.ambition].name, w: m.why });
    st.mood.push({ y: s.year - 1, ok: m.ok, t });
    if (st.mood.length > 12) st.mood.shift();
    notify(s, t, m.ok ? 'good' : 'bad');
  }
  st.snap = snap;
}

registerSimHook('month', 'careers12', (s) => careersMonth(s));
