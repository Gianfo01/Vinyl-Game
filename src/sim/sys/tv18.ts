// Rodada 18 (talent18, M6) — TV DE TALENTOS: franquias por época e mercado (Original Amateur Hour 1948, Opportunity
// Knocks 1956, Show de Calouros 1977, Star Search 1983, Popstars 2000, Pop/American Idol 2001-02, Star Academy 2001,
// X Factor 2004, Got Talent 2006, The Voice 2010, Produce 101 2016; nomes genéricos fora do modo de nomes reais).
// Uma temporada por ano no seu mercado: seleção (fev) → ao vivo com eliminações por voto (abr-jun) → final (jul).
// Decisões: ser o SELO PARCEIRO (paga a cota e leva o vencedor num contrato do formato, 360), pôr alguém seu como
// JURADO (fama e cachê, estresse), fazer CAMPANHA de voto por um participante (barata, mas manipulação pode vazar),
// assinar o 3º lugar "com carisma" (livre, sem cota) ou PRODUZIR o seu próprio programa (empreendimento de mídia).
// Fama de TV sobe rápido e cai rápido: sem hit, a estrela do programa esfria mês a mês.

import { clamp, Rng } from '../../core/rng';
import { cityById, l, type L, type MarketId } from '../../data/world';
import { acceptOffer, defaultOffer, signWithRival } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { addStress } from '../stress17';
import type { Act, GameState, Offer } from '../types';
import { fmtL, money, nextId, playerActs, post } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { addLead18 } from './discover18';
import { actOfPerson17 } from './love17';

export interface Fr18 { id: string; real: string; alt: L; from: number; to: number; mk: MarketId[]; power: number; desc: L }
export const FR18: Fr18[] = [
  { id: 'amateur', real: 'Original Amateur Hour', alt: l('A Hora do Amador', 'The Amateur Hour'), from: 1948, to: 1970, mk: ['na'], power: 0.6, desc: l('Do rádio para a TV: o público vota por carta e telefone.', 'From radio to TV: viewers vote by letter and phone.') },
  { id: 'opportunity', real: 'Opportunity Knocks', alt: l('A Oportunidade Bate à Porta', 'Opportunity Knocks'), from: 1956, to: 1978, mk: ['eu', 'oceania'], power: 0.6, desc: l('O "aplausômetro" no estúdio decide a semana.', 'The studio "clapometer" decides the week.') },
  { id: 'calouros', real: 'Show de Calouros', alt: l('Show de Calouros', 'Rookie Show'), from: 1977, to: 1996, mk: ['br', 'latam'], power: 0.7, desc: l('Jurados que gongam, auditório que grita.', 'Judges who gong, a crowd that screams.') },
  { id: 'starsearch', real: 'Star Search', alt: l('Caça-Estrelas', 'Star Hunt'), from: 1983, to: 1995, mk: ['na'], power: 0.8, desc: l('Campeão defende o título contra desafiantes.', 'The champion defends the title against challengers.') },
  { id: 'popstars', real: 'Popstars', alt: l('Fábrica de Estrelas', 'Star Factory'), from: 2000, to: 2003, mk: ['eu', 'oceania', 'br', 'latam', 'na'], power: 1.2, desc: l('O programa monta um grupo pop com os finalistas.', 'The show builds a pop group from the finalists.') },
  { id: 'idol', real: 'Idol', alt: l('Ídolo Nacional', 'National Idol'), from: 2002, to: 2016, mk: ['na', 'eu', 'br', 'latam', 'oceania', 'africa', 'asia'], power: 1.6, desc: l('Voto por telefone e SMS; o vencedor sai com contrato de 360 graus.', 'Phone and text voting; the winner leaves with a 360 deal.') },
  { id: 'academy', real: 'Star Academy', alt: l('Academia de Estrelas', 'Star Academy'), from: 2001, to: 2008, mk: ['eu', 'africa'], power: 1.1, desc: l('Confinados numa escola, aulas e eliminações ao vivo.', 'Locked in a school, lessons and live eliminations.') },
  { id: 'xfactor', real: 'The X Factor', alt: l('O Fator X', 'The X Factor'), from: 2004, to: 2018, mk: ['eu', 'na', 'oceania'], power: 1.4, desc: l('Jurados viram mentores; o dono do formato tem selo próprio.', 'Judges become mentors; the format owner has its own label.') },
  { id: 'voice', real: 'The Voice', alt: l('A Voz', 'The Voice'), from: 2010, to: 9999, mk: ['na', 'eu', 'br', 'latam', 'asia', 'africa', 'oceania'], power: 1.0, desc: l('Audições às cegas: cadeiras que viram.', 'Blind auditions: chairs that turn.') },
  { id: 'survival', real: 'Produce 101', alt: l('Sobrevivência Idol', 'Idol Survival'), from: 2016, to: 2019, mk: ['asia'], power: 1.2, desc: l('101 trainees, o público escolhe o grupo (e houve fraude nos votos).', '101 trainees, the public picks the group (and the votes were rigged).') },
];
export const frName18 = (s: GameState, f: Fr18): L => (s.config.realNames ? l(f.real, f.real) : f.alt);
const homeMk = (s: GameState): MarketId => (cityById[s.config.homeCity]?.market ?? 'na') as MarketId;
export const frNow18 = (s: GameState): Fr18 | undefined => {
  const own = tv18(s).own;
  if (own) return { id: 'own', real: own.name, alt: l(own.name, own.name), from: own.since, to: 9999, mk: [homeMk(s)], power: 0.9, desc: l('O seu programa: você é o selo parceiro de toda temporada.', 'Your show: you are the partner label every season.') };
  return FR18.filter((f) => s.year >= f.from && s.year <= f.to && f.mk.includes(homeMk(s))).sort((a, b) => b.power - a.power)[0];
};

export interface Cont18 { a: string; v: number; out?: number }
export interface Season18 { id: string; fr: string; y: number; stage: 'casting' | 'live' | 'done'; partner?: string; judge?: string; cont: Cont18[]; push?: string; rig?: number; top?: string[] }
export interface Tv18State { cur?: Season18; past: Season18[]; tvFame: Record<string, { until: number; hits: number }>; own?: { name: string; since: number; inc: number } }
declare module '../ext4' { interface Ext4 { tv18: Tv18State } }
registerExt4('tv18', () => ({ past: [], tvFame: {} }));
export function tv18(s: GameState): Tv18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.tv18 ??= { past: [], tvFame: {} }) as Tv18State;
  st.past ??= []; st.tvFame ??= {};
  return st;
}
const frOf = (s: GameState, id: string) => FR18.find((f) => f.id === id) ?? frNow18(s);
export const partnerFee18 = (s: GameState, f: Fr18) => money(s, 20000 * f.power);
export const pushCost18 = (s: GameState) => money(s, 4000);
export const ownCost18 = (s: GameState) => money(s, 300000);

export function becomePartner18(s: GameState): L | null {
  const se = tv18(s).cur, f = se && frOf(s, se.fr);
  if (!se || !f || se.stage === 'done') return l('Nenhuma temporada aberta.', 'No season open.');
  if (se.partner) return se.partner === 'player' ? l('Você já é o selo parceiro.', 'You are already the partner label.') : l('Outro selo já fechou a parceria.', 'Another label already closed the partnership.');
  if (se.stage !== 'casting') return l('A parceria fecha antes dos programas ao vivo.', 'The partnership closes before the live shows.');
  const c = partnerFee18(s, f);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `tv18partner:${se.id}`, -c, 'marketing', `Parceria: ${frName18(s, f).pt}`);
  se.partner = 'player';
  return null;
}
export function setJudge18(s: GameState, pid: string): L | null {
  const se = tv18(s).cur;
  if (!se || se.stage === 'done') return l('Nenhuma temporada aberta.', 'No season open.');
  if (se.judge) return l('O júri já está fechado.', 'The judging panel is already set.');
  const a = actOfPerson17(s, pid);
  const ok = s.persons[pid]?.isPlayer || (a && a.owner === 'player');
  if (!ok) return l('Só você ou alguém do seu elenco.', 'Only you or someone from your roster.');
  if (a && a.fame < 25) return l('A emissora quer um nome conhecido (fama 25+).', 'The network wants a known name (fame 25+).');
  se.judge = pid;
  if (a) a.fame = clamp(a.fame + 3, 0, 100);
  addStress(s, pid, 6, l('Jurado de TV', 'TV judge'));
  const f = frOf(s, se.fr);
  if (f) post(s, `tv18judge:${se.id}`, money(s, 15000 * f.power), 'services', 'Cachê de jurado');
  emitFact(s, { kind: 'statement', actors: [pid, 'player'], severity: 25, visibility: 'public', tags: ['good', 'tv', 'judge'], src: 'tv18', text: fmtL(l('{p} é o novo jurado de {f}.', '{p} is the new judge on {f}.'), { p: s.persons[pid]?.name ?? '?', f: f ? frName18(s, f) : '?' }) });
  return null;
}
export function pushVotes18(s: GameState, actId: string, hard: boolean): L | null {
  const se = tv18(s).cur;
  if (!se || se.stage !== 'live') return l('Campanha só durante os programas ao vivo.', 'Campaigns only during the live shows.');
  const c = se.cont.find((x) => x.a === actId && x.out === undefined);
  if (!c) return l('Participante fora da disputa.', 'Contestant out of the race.');
  const cost = pushCost18(s) * (hard ? 3 : 1);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `tv18push:${se.id}:${actId}`, -cost, 'marketing', 'Campanha de voto');
  se.push = actId;
  c.v += hard ? 25 : 8;
  if (hard) se.rig = (se.rig ?? 0) + 1;
  return null;
}
export function produceShow18(s: GameState, name: string): L | null {
  const st = tv18(s);
  if (st.own) return l('Você já produz um programa.', 'You already produce a show.');
  if (s.year < 1950) return l('Ainda não há TV.', 'No TV yet.');
  const c = ownCost18(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'venture:tv18own', -c, 'capex', `Programa de TV: ${name}`);
  st.own = { name: name.trim() || 'Talento Total', since: s.year, inc: 0 };
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 40, visibility: 'public', tags: ['good', 'tv', 'venture'], src: 'tv18', text: fmtL(l('{c} lança o programa de calouros "{n}".', '{c} launches the talent show "{n}".'), { c: s.config.companyName, n: st.own.name }) });
  return null;
}

/** Placar de voto (puro, sem sorteio): fama + carisma estimado pelo potencial + campanha + jurado do selo. */
export function voteScore18(s: GameState, se: Season18, c: Cont18): number {
  const a = s.acts[c.a];
  return a ? a.fame * 1.2 + a.potential * 0.5 + c.v : 0;
}

function signFormat(s: GameState, a: Act): void {
  const o = { ...defaultOffer(s, a), model: '360' as Offer['model'], share360: 0.2, royalty: 0.12, termMonths: 36, id: nextId(s, 'of'), week: s.week, status: 'pending' as const } as Offer;
  o.advance = Math.round(o.advance * 0.5);
  acceptOffer(s, a, o);
}

function startSeason(s: GameState, r: Rng, f: Fr18): void {
  const st = tv18(s);
  const se: Season18 = { id: `tv${s.year}`, fr: f.id, y: s.year, stage: 'casting', cont: [] };
  if (f.id === 'own') se.partner = 'player';
  st.cur = se;
  pushInbox18(s, 'tv18_season', { from: frName18(s, f).pt, subject: fmtL(l('{f}: nova temporada em seleção', '{f}: new season casting'), { f: frName18(s, f) }),
    body: fmtL(l('A emissora procura um selo parceiro (cota {c}: leva o vencedor num contrato 360 do formato) e jurados famosos. A final é em julho.', 'The network wants a partner label (fee {c}: takes the winner on a format 360 deal) and famous judges. The final is in July.'), { c: `$${Math.round(partnerFee18(s, f) / 100).toLocaleString('en-US')}` }), weeks: 8 });
}
function goLive(s: GameState, r: Rng, f: Fr18): void {
  const se = tv18(s).cur!;
  se.stage = 'live';
  if (!se.partner) { const lbs = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash); if (lbs[0]) se.partner = lbs[0].id; }
  for (let i = 0; i < 8; i++) {
    const a = spawnProceduralAct(s, r, { city: r.pick(Object.values(cityById).filter((c) => f.mk.includes(c.market as MarketId))).id, formedYear: s.year, fame: r.int(3, 10) });
    a.fame = clamp(a.fame + 6 * f.power, 0, 100);
    se.cont.push({ a: a.id, v: r.normal(0, 8) });
    addLead18(s, r, a, 'tv', 2, 10, fmtL(l('Participante de {f}.', 'Contestant on {f}.'), { f: frName18(s, f) }));
  }
}
function eliminate(s: GameState, r: Rng, n: number): void {
  const se = tv18(s).cur!;
  const live = se.cont.filter((c) => c.out === undefined);
  for (const c of live) { c.v += r.normal(0, 10); const a = s.acts[c.a]; if (a) a.fame = clamp(a.fame + 1.5, 0, 100); }
  live.sort((a, b) => voteScore18(s, se, a) - voteScore18(s, se, b));
  for (const c of live.slice(0, Math.min(n, live.length - 3))) c.out = s.week;
}
function finale(s: GameState, r: Rng, f: Fr18): void {
  const st = tv18(s), se = st.cur!;
  eliminate(s, r, 99);
  const top = se.cont.filter((c) => c.out === undefined).sort((a, b) => voteScore18(s, se, b) - voteScore18(s, se, a)).map((c) => c.a);
  se.top = top;
  se.stage = 'done';
  const boost = [25, 14, 9];
  top.forEach((id, i) => { const a = s.acts[id]; if (!a) return; a.fame = clamp(a.fame + boost[i] * f.power, 0, 100); a.fans.casual += Math.round(40000 * f.power / (i + 1)); a.status = 'active'; st.tvFame[id] = { until: s.week + 104, hits: a.hits }; });
  const w = s.acts[top[0]];
  if (w && !w.owner) {
    if (se.partner === 'player') signFormat(s, w);
    else if (se.partner && s.labels[se.partner]?.active) signWithRival(s, w, se.partner, r, true);
  }
  const fn = frName18(s, f);
  emitFact(s, { kind: 'award', actors: top.slice(0, 1), severity: Math.round(35 + 20 * f.power), visibility: 'public', tags: ['tv', 'talent_show', 'winner'], src: 'tv18',
    text: fmtL(l('{w} vence {f} {y}{p}.', '{w} wins {f} {y}{p}.'), { w: w?.name ?? '?', f: fn, y: s.year, p: se.partner === 'player' ? fmtL(l(' e assina com {c}', ' and signs with {c}'), { c: s.config.companyName }) : se.partner && s.labels[se.partner] ? fmtL(l(' e assina com {c}', ' and signs with {c}'), { c: s.labels[se.partner].name }) : '' }) });
  const third = s.acts[top[2]] ?? s.acts[top[1]];
  if (third && !third.owner) pushInbox18(s, 'tv18_third', { from: third.name, subject: fmtL(l('{a} ficou fora do pódio — mas o público ama', '{a} missed the top spot — but the public loves them'), { a: third.name }),
    body: l('Sem contrato do formato: livre para qualquer selo. Carisma de TV e fama alta agora, mas que esfria rápido sem um hit.', 'No format contract: free for any label. TV charisma and high fame now, but it cools fast without a hit.'), ref: { act: third.id }, actions: [{ id: 'go', label: l('Abrir ficha e propor', 'Open page and offer') }, { id: 'no', label: l('Deixar passar', 'Let it pass') }] });
  // manipulação de voto vaza?
  if (se.rig && r.chance(0.25 * se.rig)) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100);
    emitFact(s, { kind: 'scandal', actors: ['player', ...(se.push ? [se.push] : [])], severity: 55, visibility: 'public', tags: ['bad', 'tv', 'vote_rigging'], src: 'tv18', text: fmtL(l('Escândalo em {f}: {c} pagou centrais de voto em massa.', 'Scandal on {f}: {c} paid for mass-voting call centres.'), { f: fn, c: s.config.companyName }) });
  }
  if (se.judge) { const a = actOfPerson17(s, se.judge); if (a) a.fame = clamp(a.fame + 2 * f.power, 0, 100); }
  st.past.push(se);
  if (st.past.length > 30) st.past.shift();
}

registerInboxKind('tv18_season', { label: l('TV', 'TV'), cat: 'deals', icon: 'star', prio: 1, goto: () => ({ area: 'talent18', tab: ['talent18', 'tv'] }) });
registerInboxKind('tv18_third', { label: l('TV', 'TV'), cat: 'deals', icon: 'star', prio: 1, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (_s, _m, act) => (act === 'go' ? l('Abra a ficha e faça a proposta.', 'Open the page and make an offer.') : l('Ficou para outro selo.', 'Left for another label.')) });

registerSimHook('month', 'tv18', (s) => {
  const st = tv18(s);
  const f = frNow18(s);
  const r = Rng.fromSeed(`${s.config.seed}|tv18|${s.week}`);
  if (f && s.year >= 1948) {
    if (s.month === 1 && (!st.cur || st.cur.y !== s.year)) startSeason(s, r, f);
    const se = st.cur, ff = se && (FR18.find((x) => x.id === se.fr) ?? f);
    if (se && ff && se.y === s.year) {
      if (s.month === 3 && se.stage === 'casting') goLive(s, r, ff);
      else if (s.month >= 4 && s.month <= 5 && se.stage === 'live') eliminate(s, r, 2);
      else if (s.month === 6 && se.stage === 'live') finale(s, r, ff);
    }
  }
  // fama de TV esfria sem hit
  for (const [id, t] of Object.entries(st.tvFame)) {
    const a = s.acts[id];
    if (!a || s.week > t.until) { delete st.tvFame[id]; continue; }
    if (a.hits > t.hits) { delete st.tvFame[id]; continue; }
    a.fame = clamp(a.fame - 0.9, 0, 100);
  }
});
registerSimHook('year', 'tv18', (s) => {
  const st = tv18(s);
  if (!st.own) return;
  const rev = money(s, 60000), cost = money(s, 42000);
  st.own.inc = rev - cost;
  post(s, 'tv18ownrev', rev, 'services', `Programa: publicidade (${st.own.name})`);
  post(s, 'tv18owncost', -cost, 'marketing', `Programa: produção (${st.own.name})`);
  for (const id of playerActs(s)) { const a = s.acts[id]; if (a && a.fame >= 25) { a.fame = clamp(a.fame + 0.5, 0, 100); break; } }
});

registerExplain('tv18.vote', (s, c) => {
  const se = tv18(s).cur, x = se?.cont.find((k) => k.a === c.act), a = x && s.acts[x.a];
  if (!se || !x || !a) return null;
  return { title: l('Força no voto', 'Voting strength'), value: Math.round(voteScore18(s, se, x)), fmt: 'num', parts: [
    { label: l('Fama × 1,2', 'Fame × 1.2'), value: Math.round(a.fame * 1.2), fmt: 'num' }, { label: l('Carisma (potencial ÷ 2)', 'Charisma (potential ÷ 2)'), value: Math.round(a.potential * 0.5), fmt: 'num', note: l('Estimado: o público vê o que o olheiro não vê.', 'Estimated: the public sees what scouts do not.') },
    { label: l('Campanha, histórias e sorte do mês', 'Campaigns, storylines and luck of the month'), value: Math.round(x.v), fmt: 'signed' }], note: l('Os dois piores saem a cada mês ao vivo; 3 chegam à final.', 'The two lowest leave each live month; 3 reach the final.') };
});
registerAdvisorTip('tv18', (s) => {
  const se = tv18(s).cur, f = se && frOf(s, se.fr);
  if (!se || !f || se.stage !== 'casting' || se.partner) return [];
  return [{ id: `tv18-partner-${se.id}`, level: 'info', cat: 'opportunity', score: 35 + f.power * 10, text: fmtL(l('{f} procura selo parceiro.', '{f} is looking for a partner label.'), { f: frName18(s, f) }), effect: l('Leva o vencedor num contrato 360; fama de TV esfria sem hit.', 'Takes the winner on a 360 deal; TV fame cools without a hit.'), goto: { area: 'talent18', tab: ['talent18', 'tv'] } }];
});
