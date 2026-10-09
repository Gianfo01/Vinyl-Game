// Rodada 12 — carreiras. O dono pode ser gravadora, empresário, dono de festival, agente/promotor de shows,
// dono de casa de shows, dono de estúdio/produtor, editor, dono de mídia, dono de plataforma ou músico — e
// várias ao mesmo tempo. No Novo Jogo escolhe atividades principais, origem profissional e ambição; no
// meio da partida começa ou larga carreiras (tempo é finito: carreiras demais estressam); um herdeiro pode
// querer outras. Cada carreira tem cartão próprio na mesa (registro na interface). Gerador próprio.

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { registerPerkSource, type PerkValues } from '../perks';
import type { SkillId } from '../../data/people';
import { playerPerson } from './life';
import { ownerOf } from './people/owner';
import { standingOf } from './standing9';
import { ventures } from './ventures9';
import { liveOf } from './live';

export type CareerId = 'label' | 'manager' | 'festival' | 'booking' | 'venue' | 'studio' | 'publisher' | 'media' | 'platform' | 'musician';
export interface CareerDef { id: string; name: L; desc: L; from: number; icon: string; area: string; load: number; status?: (s: GameState) => L | null }
export type Origin = 'musician' | 'roadie' | 'journalist' | 'lawyer' | 'heir' | 'dj' | 'accountant'
  | 'musicKid' | 'session' | 'anr' | 'teacher' | 'engineer' | 'adman';
export type Ambition = 'money' | 'legacy' | 'power' | 'art' | 'family' | 'fame' | 'discover' | 'world' | 'glory' | 'freedom';

const vcount = (s: GameState, k: string) => ventures(s).list.filter((v) => v.kind === k).length;
const owns = (k: string, pt: string, en: string) => (s: GameState) => { const n = vcount(s, k); return n ? fmtL(l(`{n} ${pt}`, `{n} ${en}`), { n }) : l('Nenhum negócio ainda: abra em Empreendimentos ou use o mercado de serviços.', 'No business yet: found one in Ventures or use the services market.'); };

const DEFS: CareerDef[] = [
  { id: 'label', name: l('Gravadora', 'Record label'), desc: l('Contratar, gravar, lançar. O selo é o coração da partida.', 'Sign, record, release. The label is the heart of the run.'), from: 1900, icon: 'building', area: 'hq', load: 0.45,
    status: (s) => fmtL(l('{n} artistas no elenco', '{n} acts on the roster'), { n: Object.values(s.acts).filter((a) => a.owner === 'player').length }) },
  { id: 'manager', name: l('Empresário', 'Manager'), desc: l('Representa artistas de qualquer selo: confiança, plano de carreira, mandato e equipe.', 'Represents acts from any label: trust, career plan, mandate and team.'), from: 1900, icon: 'handshake', area: 'management', load: 0.35,
    status: (s) => fmtL(l('{n} clientes · reputação {r}', '{n} clients · reputation {r}'), { n: ventures(s).mg.clients.length, r: Math.round(ventures(s).mg.rep) }) },
  { id: 'festival', name: l('Dono de festival', 'Festival owner'), desc: l('Data, line-up, ingresso: lenda ou desastre.', 'Date, line-up, tickets: legend or disaster.'), from: 1950, icon: 'star', area: 'ventures', load: 0.25, status: owns('festival', 'festival(is)', 'festival(s)') },
  { id: 'booking', name: l('Agente/promotor de shows', 'Booking agent/promoter'), desc: l('Roteiros de turnê e comissão sobre cachês.', 'Tour routing and a cut of fees.'), from: 1930, icon: 'tour-bus', area: 'tour12', load: 0.25, status: owns('booking', 'agência(s)', 'agency(ies)') },
  { id: 'venue', name: l('Dono de casa de shows', 'Venue owner'), desc: l('Um palco próprio: agenda, bar, cena local.', 'A stage of your own: calendar, bar, local scene.'), from: 1900, icon: 'mic', area: 'shows', load: 0.25,
    status: (s) => { const v = liveOf(s).venue; return v ? fmtL(l('{n} · {c}', '{n} · {c}'), { n: v.name, c: cityById[v.cityId]?.name ?? v.cityId }) : l('Sem casa ainda: compre uma em Música → Shows.', 'No venue yet: buy one in Music → Shows.'); } },
  { id: 'studio', name: l('Dono de estúdio/produtor', 'Studio owner/producer'), desc: l('Equipamento, som da casa, sessões para todos.', 'Gear, a house sound, sessions for everyone.'), from: 1920, icon: 'cd', area: 'studio12', load: 0.25, status: owns('studio', 'estúdio(s)', 'studio(s)') },
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
  musician: { name: l('Ex-músico(a) de banda', 'Former band musician'), desc: l('Carisma +6, ouvido +4, instrumento +6 e palco +4; artistas confiam +3. Contatos em estúdios e festivais.', 'Charisma +6, ear +4, instrument +6 and stage +4; acts trust +3. Studio and festival contacts.') },
  roadie: { name: l('Ex-roadie/produção de estrada', 'Former roadie/road crew'), desc: l('Gestão +6; bilheteria +4%. Muitos contatos em agências e festivais.', 'Management +6; box office +4%. Lots of booking and festival contacts.') },
  journalist: { name: l('Jornalista musical', 'Music journalist'), desc: l('Ouvido +6; crítica +0,2 e reputação institucional +2. Contatos na mídia.', 'Ear +6; critics +0.2 and institutional reputation +2. Media contacts.') },
  lawyer: { name: l('Advogado(a) do meio', 'Music lawyer'), desc: l('Negociação +10; adiantamentos 4% menores, mas artistas confiam −2.', 'Negotiation +10; 4% smaller advances, but acts trust −2.') },
  heir: { name: l('Herdeiro(a) de família rica', 'Rich heir'), desc: l('+$60 mil de patrimônio e +$20 mil no caixa; reputação com artistas −5 e confiança −3 ("filhinho").', '+$60k wealth and +$20k company cash; reputation with artists −5 and trust −3 ("rich kid").') },
  dj: { name: l('DJ/radialista', 'DJ/radio host'), desc: l('Carisma +4, ouvido +4; +1 sinal de talento por mês. Contatos em rádio e festivais.', 'Charisma +4, ear +4; +1 talent signal a month. Radio and festival contacts.') },
  accountant: { name: l('Contador(a)', 'Accountant'), desc: l('Gestão +8, negociação +3; salários 4% menores. Contatos em estúdios e gravadoras.', 'Management +8, negotiation +3; salaries 4% lower. Studio and label contacts.') },
  musicKid: { name: l('Filho(a) de músicos', 'Child of musicians'), desc: l('Cresceu na coxia: instrumento +10, voz +6, composição +4, ouvido +4; confiança +4 e reputação com artistas +4. Negociação −3.', 'Grew up backstage: instrument +10, voice +6, writing +4, ear +4; trust +4 and reputation with artists +4. Negotiation −3.') },
  session: { name: l('Músico(a) de estúdio', 'Session musician'), desc: l('Instrumento +12, ouvido +5; +0,5 de qualidade nas gravações. Muitos contatos em estúdios e produtores. Carisma −3.', 'Instrument +12, ear +5; +0.5 recording quality. Lots of studio and producer contacts. Charisma −3.') },
  anr: { name: l('Ex-olheiro(a) de A&R', 'Former A&R scout'), desc: l('Ouvido +6; relatórios de olheiro 6% mais precisos e +1 sinal por mês. Contatos em gravadoras. Caixa −$5 mil (multa de saída).', 'Ear +6; scouting reports 6% sharper and +1 signal a month. Label contacts. −$5k cash (exit penalty).') },
  teacher: { name: l('Professor(a) de música', 'Music teacher'), desc: l('Ouvido +4, gestão +3; o elenco aprende rápido (moral +0,5/mês, XP +10%). Patrimônio modesto (−$3 mil).', 'Ear +4, management +3; the roster learns fast (morale +0.5/month, XP +10%). Modest wealth (−$3k).') },
  engineer: { name: l('Técnico(a) de som', 'Sound engineer'), desc: l('Produção +8; +0,8 de qualidade e fabricação 5% mais barata. Contatos em estúdios. Carisma −4.', 'Production +8; +0.8 quality and 5% cheaper manufacturing. Studio contacts. Charisma −4.') },
  adman: { name: l('Publicitário(a)', 'Ad executive'), desc: l('Carisma +5, negociação +4; apelo de lançamentos +5% e +$10 mil no caixa. Crítica desconfia (−0,15). Contatos na mídia.', 'Charisma +5, negotiation +4; release appeal +5% and +$10k cash. Critics wary (−0.15). Media contacts.') },
};
/** Efeitos mecânicos de cada origem (aplicados uma vez no começo; perks valem a partida toda). */
interface OriginFx { attrs?: Partial<Record<'ear' | 'negotiation' | 'charisma' | 'management', number>>; wealth?: number; cash?: number; rep?: number; artists?: number; skills?: Partial<Record<SkillId, number>>; perks?: PerkValues }
export const ORIGIN_FX: Record<Origin, OriginFx> = {
  musician: { attrs: { charisma: 6, ear: 4 }, skills: { instr: 6, stage: 4 }, perks: { trust: 3 } },
  roadie: { attrs: { management: 6 }, perks: { showRevenue: 0.04 } },
  journalist: { attrs: { ear: 6 }, rep: 2, perks: { critics: 0.2 } },
  lawyer: { attrs: { negotiation: 10 }, perks: { advance: -0.04, trust: -2 } },
  heir: { wealth: 60000, cash: 20000, artists: -5, perks: { trust: -3 } },
  dj: { attrs: { charisma: 4, ear: 4 }, perks: { signals: 1 } },
  accountant: { attrs: { management: 8, negotiation: 3 }, perks: { staffCost: -0.04 } },
  musicKid: { attrs: { ear: 4, negotiation: -3 }, skills: { instr: 10, voice: 6, comp: 4 }, artists: 4, perks: { trust: 4 } },
  session: { attrs: { ear: 5, charisma: -3 }, skills: { instr: 12 }, perks: { songQ: 0.5 } },
  anr: { attrs: { ear: 6 }, cash: -5000, perks: { scoutAccuracy: 0.06, signals: 1 } },
  teacher: { attrs: { ear: 4, management: 3 }, wealth: -3000, perks: { morale: 0.5, xp: 0.1 } },
  engineer: { attrs: { charisma: -4 }, skills: { prod: 8 }, perks: { songQ: 0.8, pressingCost: -0.05 } },
  adman: { attrs: { charisma: 5, negotiation: 4 }, cash: 10000, perks: { appeal: 0.05, critics: -0.15 } },
};
export const AMBITIONS: Record<Ambition, { name: L; desc: L }> = {
  money: { name: l('Fortuna', 'Fortune'), desc: l('Satisfeito quando o patrimônio e o caixa crescem no ano.', 'Content when wealth and cash grow over the year.') },
  legacy: { name: l('Legado', 'Legacy'), desc: l('Satisfeito quando o prestígio sobe e carreiras duram.', 'Content when prestige rises and careers last.') },
  power: { name: l('Poder', 'Power'), desc: l('Satisfeito com várias frentes e muitos clientes ao mesmo tempo.', 'Content running several fronts and many clients at once.') },
  art: { name: l('Arte', 'Art'), desc: l('Satisfeito quando sai música nova que você bancou ou produziu.', 'Content when new music you backed or produced comes out.') },
  family: { name: l('Família', 'Family'), desc: l('Satisfeito com pouca sobrecarga: no máximo duas carreiras e estresse baixo.', 'Content with little overload: at most two careers and low stress.') },
  fame: { name: l('Fama', 'Fame'), desc: l('Satisfeito quando um ato seu entra no top 10 no ano.', 'Content when one of your acts reaches the top 10 that year.') },
  discover: { name: l('Descobridor(a)', 'Talent finder'), desc: l('Satisfeito quando contrata pelo menos um artista novo no ano.', 'Content when you sign at least one new act that year.') },
  world: { name: l('Conquistar o mundo', 'Conquer the world'), desc: l('Satisfeito quando abre um território novo no ano.', 'Content when you open a new territory that year.') },
  glory: { name: l('Consagração', 'Acclaim'), desc: l('Satisfeito quando ganha um prêmio no ano.', 'Content when you win an award that year.') },
  freedom: { name: l('Independência', 'Independence'), desc: l('Satisfeito ao fechar o ano sem empréstimos e sem meses no vermelho.', 'Content ending the year with no loans and no months in the red.') },
};
/** Bônus de quem cumpriu a ambição no ano anterior (vale o ano seguinte). */
export const AMBITION_PERK: Record<Ambition, PerkValues> = {
  money: { valuation: 0.05 }, legacy: { critics: 0.1 }, power: { offer: 0.03 }, art: { songQ: 0.5 }, family: { stress: -0.1 },
  fame: { appeal: 0.04 }, discover: { scoutAccuracy: 0.04 }, world: { showRevenue: 0.05 }, glory: { reputation: 1 }, freedom: { staffCost: -0.03 },
};
const ORIGIN_CONTACTS: Record<Origin, Partial<Record<string, number>>> = {
  musician: { studio: 6, producer: 6, festival: 4 }, roadie: { booking: 12, festival: 10 }, journalist: { media: 14, label: 4 }, lawyer: { label: 8 },
  heir: { label: 4, festival: 4 }, dj: { media: 10, festival: 8 }, accountant: { studio: 6, label: 8 },
  musicKid: { studio: 8, producer: 6, festival: 6 }, session: { studio: 14, producer: 12 }, anr: { label: 12, media: 4 }, teacher: { studio: 4, label: 4 },
  engineer: { studio: 14, producer: 8 }, adman: { media: 12, label: 4 },
};

export interface HeirWish { gen: number; name: string; wants: CareerId[]; ambition: Ambition; decided?: 'embrace' | 'tradition' | 'blend' }
export interface CareersState { init: boolean; active: string[]; origin: Origin; ambition: Ambition; started: Record<string, number>; gen: number; heir?: HeirWish; snap?: { y: number; worth: number; std: number; rel: number; hits?: number; signed?: number; mk?: number; aw?: number }; mood: { y: number; ok: boolean; t: L }[]; log: { y: number; t: L }[] }

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
  const fx = ORIGIN_FX[st.origin] ?? {};
  for (const [k, d] of Object.entries(fx.attrs ?? {})) { const key = k as keyof typeof o.attrs; o.attrs[key] = clamp(o.attrs[key] + (d ?? 0), 10, 95); }
  if (fx.wealth) o.wealth = Math.max(0, o.wealth + money(s, fx.wealth));
  if (fx.cash) post(s, 'car12:origin', money(s, fx.cash), fx.cash > 0 ? 'investment' : 'misc', fx.cash > 0 ? 'Aporte da origem' : 'Custo da origem');
  const R = s.player.reputation;
  if (fx.rep) R.institutional = clamp(R.institutional + fx.rep, 0, 100);
  if (fx.artists) R.artists = clamp(R.artists + fx.artists, 0, 100);
  const p = playerPerson(s);
  if (p) for (const [k, v] of Object.entries(fx.skills ?? {})) { const key = k as keyof typeof p.skills; p.skills[key] = clamp(p.skills[key] + (v ?? 0), 3, 99); }
  if (st.active.includes('manager')) ventures(s).mg.rep = clamp(ventures(s).mg.rep + 8, 0, 100);
}

/** Contatos (0–40) por tipo de serviço: origem + anos de carreira ativos ligados ao ramo. */
export function contactsFor(s: GameState, kind: string): number {
  const st = careers(s);
  const yrs = (id: string) => (st.active.includes(id) ? Math.min(15, s.year - (st.started[id] ?? s.year)) : 0);
  const near: Record<string, string[]> = { studio: ['studio', 'musician'], producer: ['studio', 'musician'], booking: ['booking', 'venue', 'manager'], festival: ['festival', 'booking', 'manager'], label: ['label', 'manager'], media: ['media'] };
  return Math.min(40, (ORIGIN_CONTACTS[st.origin][kind] ?? 0) + (near[kind] ?? []).reduce((t, id) => t + yrs(id), 0));
}
export const originTrust = (s: GameState) => ORIGIN_FX[careers(s).origin]?.perks?.trust ?? 0;
// perks permanentes da origem e o bônus da ambição cumprida no ano anterior
registerPerkSource('careers12', (s) => {
  const st = careers(s);
  const out: { label: L; values: PerkValues }[] = [];
  const fx = ORIGIN_FX[st.origin]?.perks;
  if (fx && s.config.careers) out.push({ label: fmtL(l('Origem: {o}', 'Origin: {o}'), { o: ORIGINS[st.origin].name }), values: fx });
  const last = st.mood[st.mood.length - 1];
  if (last?.ok && last.y === s.year - 1 && AMBITION_PERK[st.ambition]) out.push({ label: fmtL(l('Ambição cumprida: {a}', 'Ambition fulfilled: {a}'), { a: AMBITIONS[st.ambition].name }), values: AMBITION_PERK[st.ambition] });
  return out;
});

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
    case 'fame': { const n = s.player.stats.top10s + s.player.stats.number1s; const ok = n > (sn.hits ?? n); return { ok, why: ok ? l('um ato seu chegou ao top 10', 'one of your acts hit the top 10') : l('nenhum top 10 no ano', 'no top 10 this year') }; }
    case 'discover': { const n = s.player.stats.signed; const ok = n > (sn.signed ?? n); return { ok, why: ok ? l('você descobriu talento novo', 'you discovered new talent') : l('ninguém novo no elenco', 'nobody new on the roster') }; }
    case 'world': { const n = s.player.territories.length; const ok = n > (sn.mk ?? n); return { ok, why: ok ? l('um território novo se abriu', 'a new territory opened') : l('o mapa não cresceu', 'the map did not grow') }; }
    case 'glory': { const n = s.player.stats.awards; const ok = n > (sn.aw ?? n); return { ok, why: ok ? l('veio um prêmio', 'an award came in') : l('nenhum prêmio no ano', 'no award this year') }; }
    case 'freedom': { const ok = !s.player.loans.length && s.player.insolvencyMonths === 0 && s.player.cash > 0; return { ok, why: ok ? l('sem dívidas, sem patrão', 'no debts, no masters') : l('as dívidas mandam em você', 'debts call the shots') }; }
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
  const P = s.player;
  const snap = { y: s.year, worth: worth(s), std: standingOf(s, 'player').rec + ventures(s).mg.rep, rel: Object.values(s.releases).filter((x) => x.owner === 'player').length,
    hits: P.stats.top10s + P.stats.number1s, signed: P.stats.signed, mk: P.territories.length, aw: P.stats.awards };
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
// rodada 13: aplica a origem já na criação (depois da ficha do personagem), para o caixa/reputação aparecerem no mês 1
registerSimHook('newgame', 'careers12', (s) => { careers(s); });

/** Meta de ambição do ano em curso, com progresso legível (rodada 13). */
export function ambitionGoal(s: GameState): { ok: boolean; why: L } | null {
  const st = careers(s);
  return st.snap ? ambitionMet(s, st) : null;
}
