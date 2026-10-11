// Rodada 19 (Frente 9.12, onda 3 — T4) — CONCURSOS E PROGRAMAS DE TALENTOS (`contests19`). O tv18 já cobre a TV de
// talentos (Amateur Hour 1948 → Idol/The Voice); aqui entram os concursos de RÁDIO (hora do calouro 1925+, Rainha do Rádio
// no Brasil) e os FESTIVAIS DA CANÇÃO NA TV (Sanremo 1951+, os festivais de MPB da TV brasileira 1965–72, OTI 1972–2000,
// Yamaha Popular Song Contest 1969–86 e um festival nacional genérico 1960+), com nomes reais só no modo de nomes reais.
// Você pode INSCREVER um ato seu, PATROCINAR (leva o direito de contratar o vencedor — contrato pronto do formato),
// emprestar uma estrela como JURADA (fama; jurado que vota no próprio selo pode virar escândalo; rixa com quem perdeu)
// ou PRODUZIR o seu próprio concurso (custo anual, direitos de transmissão, todos os finalistas viram pistas no discover18).
// A final é uma cena (cine18: envelope e vaias); o vencedor vira pista e pessoa (fato `contest_winner`, que o writers19 usa
// para achar ghostwriters — cadeia 3). As finais de Idol/The Voice do tv18 também viram contest_final/contest_winner.

import { freeCash20 } from '../oblig20';
import { mineAct19 } from '../mine19';
import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L, type MarketId } from '../../data/world';
import { acceptOffer, defaultOffer } from '../contracts';
import { registerDeadline } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { exactHist } from '../history15';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import { scandal } from '../scandal17';
import type { Act, GameState, Offer } from '../types';
import { fmtL, money, nextId, playerActs, post } from '../util';
import { spawnProceduralAct } from '../worldgen';
import { logShot18 } from './cine18';
import { schedule18 } from './decide18';
import { addLead18 } from './discover18';
import { headline19 } from './factlink19';
import { startFeud18 } from './feud18';
import { tv18 } from './tv18';

export interface Ct19 { id: string; real: string; alt: L; kind: 'radio' | 'song'; from: number; to: number; mk: MarketId[]; m: number; power: number; desc: L }
const ALL: MarketId[] = ['br', 'na', 'latam', 'eu', 'asia', 'africa', 'oceania'];
export const CT19: Ct19[] = [
  { id: 'radio', real: 'Hora do Calouro', alt: l('Hora do Calouro', 'Amateur Hour'), kind: 'radio', from: 1925, to: 1965, mk: ALL, m: 5, power: 0.5, desc: l('Concurso de calouros ao vivo no rádio: o gongo elimina, o ouvinte vota por carta.', 'Live amateur contest on radio: the gong eliminates, listeners vote by mail.') },
  { id: 'rainha', real: 'Rainha do Rádio', alt: l('Rainha do Rádio', 'Radio Queen'), kind: 'radio', from: 1937, to: 1958, mk: ['br'], m: 8, power: 0.8, desc: l('Votos comprados em revistas e fã-clubes rivais em guerra.', 'Votes bought in magazines and rival fan clubs at war.') },
  { id: 'riviera', real: 'Festival di Sanremo', alt: l('Festival da Canção da Riviera', 'Riviera Song Festival'), kind: 'song', from: 1951, to: 9999, mk: ['eu'], m: 1, power: 1.0, desc: l('Canções inéditas, orquestra e júri; o vencedor costuma ir ao festival europeu.', 'New songs, orchestra and jury; the winner often goes on to the European contest.') },
  { id: 'mpb', real: 'Festival de Música Popular Brasileira', alt: l('Festival da Canção na TV', 'TV Song Festival'), kind: 'song', from: 1965, to: 1972, mk: ['br'], m: 9, power: 1.4, desc: l('Plateia que vaia e aplaude como torcida; canções viram hinos de uma geração.', 'An audience that boos and cheers like a stadium; songs become a generation\'s anthems.') },
  { id: 'oti', real: 'Festival OTI da Canção', alt: l('Festival Ibero-Americano da Canção', 'Ibero-American Song Festival'), kind: 'song', from: 1972, to: 2000, mk: ['latam', 'br'], m: 10, power: 0.9, desc: l('Emissoras de vários países, um representante por país.', 'Broadcasters from many countries, one entry per country.') },
  { id: 'yamaha', real: 'Yamaha Popular Song Contest', alt: l('Concurso de Canção Popular', 'Popular Song Contest'), kind: 'song', from: 1969, to: 1986, mk: ['asia'], m: 9, power: 0.9, desc: l('Concurso de compositores que revelou estrelas do pop japonês.', 'A songwriting contest that launched Japanese pop stars.') },
  { id: 'nacional', real: 'Festival Nacional da Canção', alt: l('Festival Nacional da Canção', 'National Song Festival'), kind: 'song', from: 1960, to: 9999, mk: ALL, m: 9, power: 0.6, desc: l('Festival da TV aberta: canções inéditas e um júri de críticos.', 'A network TV festival: new songs and a critics\' jury.') },
];
export const ctName19 = (s: GameState, c: Ct19): L => (s.config.realNames ? l(c.real, c.real) : c.alt);
const homeMk = (s: GameState): MarketId => (cityById[s.config.homeCity]?.market ?? 'na') as MarketId;
/** Concursos ativos no seu mercado neste ano (no máximo um de rádio e um da canção, o mais forte de cada). */
export function ctNow19(s: GameState): Ct19[] {
  const mk = homeMk(s), xs = CT19.filter((c) => s.year >= c.from && s.year <= c.to && c.mk.includes(mk));
  return (['radio', 'song'] as const).map((k) => xs.filter((c) => c.kind === k).sort((a, b) => b.power - a.power)[0]).filter((c): c is Ct19 => !!c);
}
export const openMonth19 = (c: Ct19) => Math.max(0, c.m - 2);

export interface Ed19 { ct: string; y: number; asked?: 1; entry?: string; spons?: boolean; judge?: string; done?: boolean; top?: string[]; win?: string; booed?: boolean; fe?: string }
export interface St19 { ed: Ed19[]; prod?: { since: number; name: string }; log: [number, number, L][]; n: Record<string, number> }
declare module '../ext4' { interface Ext4 { contests19: St19 } }
const fresh = (): St19 => ({ ed: [], log: [], n: {} });
registerExt4('contests19', fresh);
export function ct19(s: GameState): St19 {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.contests19 ??= fresh()) as St19;
  st.ed ??= []; st.log ??= []; st.n ??= {};
  return st;
}
const cnt = (s: GameState, k: string) => { const n = ct19(s).n; n[k] = (n[k] ?? 0) + 1; };
const logT = (s: GameState, t: L) => { const st = ct19(s); st.log.unshift([s.year, s.month, t]); if (st.log.length > 40) st.log.length = 40; };
const rng = (s: GameState) => rng19(s, 'contests19', () => Rng.fromSeed(`${s.config.seed}|ct19|${s.week}`));
const mine = (s: GameState, a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const npc = (a: Act): boolean => a.owner !== 'player' && !a.playerBand;
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
export const edOf19 = (s: GameState, ct: string, y = s.year): Ed19 => { const st = ct19(s); let e = st.ed.find((x) => x.ct === ct && x.y === y); if (!e) { e = { ct, y }; st.ed.push(e); if (st.ed.length > 40) st.ed.shift(); } return e; };
export const entryFee19 = (s: GameState, c: Ct19) => money(s, 600 * c.power);
export const sponsFee19 = (s: GameState, c: Ct19) => money(s, 9000 * c.power);
export const prodCost19 = (s: GameState) => money(s, 45000);
const topActs = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.status !== 'retired').sort((a, b) => b.fame - a.fame);

// ---------------------------------------------------------------- decisões
export type Pick19 = 'enter' | 'sponsor' | 'judge' | 'skip';
export function ctPick19(s: GameState, ctId: string, p: Pick19, actId?: string): L {
  const c = CT19.find((x) => x.id === ctId), e = c && edOf19(s, ctId);
  if (!c || !e || e.done) return l('Concurso encerrado.', 'Contest closed.');
  if (p === 'skip') return l('Fica para o ano que vem.', 'Maybe next year.');
  if (p === 'enter') {
    const a = actId ? s.acts[actId] : topActs(s).filter((x) => x.fame < 55).sort((x, y) => y.potential - x.potential)[0] ?? topActs(s)[0];
    if (!mine(s, a)) return l('Escolha um ato seu.', 'Pick one of your acts.');
    if (s.player.cash < entryFee19(s, c)) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `ct19e:${c.id}:${s.year}`, -entryFee19(s, c), 'marketing', `Inscrição: ${ctName19(s, c).pt}`);
    e.entry = a.id;
    return fmtL(l('{a} inscrito.', '{a} entered.'), { a: a.name });
  }
  if (p === 'sponsor') {
    if (s.player.cash < sponsFee19(s, c)) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `ct19s:${c.id}:${s.year}`, -sponsFee19(s, c), 'marketing', `Patrocínio: ${ctName19(s, c).pt}`);
    e.spons = true;
    s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1, 0, 100);
    return l('Patrocínio fechado: você tem o direito de contratar o vencedor.', 'Sponsorship signed: you get the right to sign the winner.');
  }
  const j = topActs(s).find((x) => x.fame >= 35 && x.id !== e.entry);
  if (!j) return l('Nenhuma estrela sua com fama 35+ para o júri.', 'No star of yours with fame 35+ for the panel.');
  e.judge = j.id;
  return fmtL(l('{a} vai sentar no júri.', '{a} will sit on the panel.'), { a: j.name });
}
registerInboxKind('ct19_open', { label: l('Concurso', 'Contest'), cat: 'deals', icon: 'star', prio: 1, goto: () => ({ area: 'live19', tab: ['live19', 'contests'] }),
  handle: (s, m, a) => ctPick19(s, String(m.ref?.ct), a as Pick19) });
/** Produzir o seu próprio concurso (liga/desliga). */
export function produce19(s: GameState, on: boolean): L | null {
  const st = ct19(s);
  if (!on) { st.prod = undefined; return null; }
  if (s.year < 1925) return l('Sem rádio, sem concurso.', 'No radio, no contest.');
  if (st.prod) return l('Você já produz um concurso.', 'You already produce a contest.');
  if (s.player.cash < prodCost19(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  st.prod = { since: s.year, name: `${s.config.companyName} — ${s.year >= 1955 ? 'Festival' : 'Calouros'}` };
  schedule18(s, 'ct19:produce', {}, l('Seu concurso', 'Your contest'), l('Produzir', 'Produce'));
  return null;
}
/** Chance do ato inscrito (porquê): fama, potencial, jurado amigo, força do concurso. */
export function entryOdds19(s: GameState, c: Ct19, a: Act, judge: boolean): { p: number; why: WhyPart[] } {
  const why: WhyPart[] = [];
  let p = 0.12; why.push({ label: l('Base: 7 concorrentes', 'Base: 7 contestants'), value: 0.12, fmt: 'pct' });
  const f = clamp((a.fame - 15) / 120, -0.05, 0.3); p += f; why.push({ label: l('Fama do ato', 'Act fame'), value: f, fmt: 'pct', tone: f >= 0 ? 'good' : 'bad' });
  const q = clamp((a.potential - 55) / 150, -0.1, 0.2); p += q; why.push({ label: l('Potencial (voz, canção)', 'Potential (voice, song)'), value: q, fmt: 'pct', tone: q >= 0 ? 'good' : 'bad' });
  if (judge) { p += 0.12; why.push({ label: l('Jurado do seu selo (e o risco de parecer armação)', 'A judge from your label (and the risk of looking rigged)'), value: 0.12, fmt: 'pct', tone: 'good' }); }
  return { p: clamp(p, 0.03, 0.7), why };
}

// ---------------------------------------------------------------- final
function lead(s: GameState, a: Act): string { return a.members.find((p) => s.persons[p]?.alive) ?? a.members[0] ?? a.id; }
/** Final do concurso: novatos + inscrito; júri (com o seu jurado), vaias, envelope. */
export function final19(s: GameState, ctId: string, force?: { win?: 'entry' | 'new'; feud?: boolean }): Ed19 | null {
  const c = CT19.find((x) => x.id === ctId);
  if (!c) return null;
  const e = edOf19(s, c.id), r = rng(s);
  if (e.done) return e;
  e.done = true;
  const mk = c.mk.includes(homeMk(s)) ? homeMk(s) : c.mk[0];
  const cities = Object.values(cityById).filter((x) => x.market === mk);
  const field: { a: Act; v: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = spawnProceduralAct(s, r, { city: (cities.length ? r.pick(cities) : cityById[s.config.homeCity]).id, formedYear: s.year, fame: r.int(2, 8), potential: r.int(55, 90) });
    field.push({ a, v: a.potential * 0.4 + a.fame * 0.5 + r.normal(0, 9) });
  }
  const ent = e.entry ? s.acts[e.entry] : undefined;
  if (mine(s, ent)) field.push({ a: ent, v: ent.potential * 0.4 + ent.fame * 0.5 + r.normal(0, 9) + (e.judge ? 8 : 0) });
  if (force?.win && ent) for (const x of field) x.v = x.a.id === ent.id ? (force.win === 'entry' ? 999 : -999) : x.v;
  field.sort((x, y) => y.v - x.v);
  const [w, sec] = field;
  e.top = field.slice(0, 3).map((x) => x.a.id); e.win = w.a.id;
  w.a.fame = clamp(w.a.fame + 10 * c.power, 0, 100); w.a.fans.casual += Math.round(20000 * c.power); w.a.status = 'active';
  if (sec) { sec.a.fame = clamp(sec.a.fame + 4 * c.power, 0, 100); sec.a.fans.casual += Math.round(8000 * c.power); }
  const name = ctName19(s, c);
  // vaia: o 2º lugar era o favorito do público (os festivais de TV dos anos 60 no Brasil eram assim)
  if (sec && c.kind === 'song' && sec.a.fame > w.a.fame + 3) { e.booed = true; sec.a.momentum = clamp(sec.a.momentum + 6, 0, 100); sec.a.fans.active += Math.round(4000 * c.power); }
  const t = fmtL(l('{f} {y}: o envelope diz {w}{b}.', '{f} {y}: the envelope says {w}{b}.'), { f: name, y: s.year, w: w.a.name, b: e.booed ? fmtL(l(' — e a plateia vaia, gritando por {s}', ' — and the crowd boos, chanting for {s}'), { s: sec.a.name }) : '' });
  emitFact(s, { kind: 'contest_final', actors: [w.a.id, ...(sec ? [sec.a.id] : [])], severity: Math.round(30 + 15 * c.power), visibility: 'public', tags: ['contests19', c.kind, e.booed ? 'booed' : 'clean'], text: t, src: 'contests19', data: { ct: c.id } });
  logT(s, t); cnt(s, 'final');
  // jurado que puxa voto para o próprio selo
  if (e.judge && ent && w.a.id === ent.id && r.chance(0.3)) {
    scandal(s, ent.id, 'conduct', 35, fmtL(l('Júri de {f}: a jurada era do mesmo selo do vencedor', '{f} panel: the judge was from the winner\'s label'), { f: name }), { tags: ['contests19', 'jury'] });
    cnt(s, 'rig');
  }
  const pid = lead(s, w.a);
  const spons = !!e.spons || !!ct19(s).prod;
  if (npc(w.a)) emitFact(s, { kind: 'contest_winner', actors: [pid, w.a.id], severity: Math.round(25 + 10 * c.power), visibility: 'public', tags: ['contests19', c.kind, spons ? 'sponsor' : 'open'], text: fmtL(l('{p} ({a}) sai de {f} com prêmio e convites.', '{p} ({a}) leaves {f} with a prize and invitations.'), { p: s.persons[pid]?.name ?? w.a.name, a: w.a.name, f: name }), src: 'contests19', data: { ct: c.id, sp: spons ? 1 : 0 } });
  // rixa de jurado: a sua estrela no júri × quem caiu (ou, fora do modo exato, um jurado NPC)
  const loser = field.slice(1).find((x) => npc(x.a))?.a;
  if (loser && ((e.judge && (force?.feud ?? r.chance(0.3))) || (!e.judge && !exactHist(s) && r.chance(0.08)))) {
    const jA = e.judge ? s.acts[e.judge] : Object.values(s.acts).filter((x) => x.status === 'active' && x.fame >= 55 && npc(x))[0];
    if (jA) {
      e.fe = jA.id;
      emitFact(s, { kind: 'judge_feud', actors: [jA.id, loser.id], severity: 35, visibility: 'public', tags: ['contests19', 'jury'], text: fmtL(l('{l} acusa o jurado {j} de humilhá-lo na final de {f}.', '{l} accuses judge {j} of humiliating them at the {f} final.'), { l: loser.name, j: jA.name, f: name }), src: 'contests19' });
    }
  }
  if (e.judge) { const j = s.acts[e.judge]; if (j) j.fame = clamp(j.fame + 1.5 * c.power, 0, 100); }
  if (ct19(s).prod) for (const x of field) if (!x.a.owner) addLead18(s, r, x.a, 'tv', 2, 9, fmtL(l('Finalista do seu concurso ({f}).', 'Finalist of your contest ({f}).'), { f: name }));
  return e;
}

// ---------------------------------------------------------------- mês
export function contestMonth19(s: GameState): void {
  const st = ct19(s);
  for (const c of ctNow19(s)) {
    const e = edOf19(s, c.id);
    if (s.month === openMonth19(c) && !e.done && !e.asked && playerActs(s).length) {
      {
        e.asked = 1;
        pushInbox18(s, 'ct19_open', { from: ctName19(s, c).pt, subject: fmtL(l('{f}: inscrições abertas', '{f}: entries open'), { f: ctName19(s, c) }), tone: 'info', ref: { ct: c.id },
          body: fmtL(l('{d} Final em {m}. Inscrição {e}; patrocínio {p} (direito de contratar o vencedor); ou empreste uma estrela ao júri.', '{d} Final in month {m}. Entry {e}; sponsorship {p} (right to sign the winner); or lend a star to the panel.'), { d: c.desc, m: c.m + 1, e: usd(entryFee19(s, c)), p: usd(sponsFee19(s, c)) }),
          actions: [{ id: 'enter', label: l('Inscrever um ato', 'Enter an act') }, { id: 'sponsor', label: l('Patrocinar', 'Sponsor') }, { id: 'judge', label: l('Estrela no júri', 'Star on the panel') }, { id: 'skip', label: l('Passar', 'Pass') }], weeks: 6 });
      }
    }
    if (s.month === c.m && !e.done) final19(s, c.id);
  }
  // seu concurso: custo e direitos de transmissão no mês da final do festival nacional
  if (st.prod && s.month === 9) {
    post(s, `ct19p:${s.year}`, -prodCost19(s), 'marketing', `Produção: ${st.prod.name}`);
    post(s, `ct19pr:${s.year}`, money(s, s.year >= 1955 ? 38000 : 22000), 'licensing', `Direitos de transmissão: ${st.prod.name}`);
  }
}
registerSimHook('month', 'contests19', (s) => contestMonth19(s));

// ---------------------------------------------------------------- ouvintes
// final → cena do envelope (cine18) e fama de TV que esfria (tv18)
onFact('contest_final', (s, f) => {
  const w = s.acts[f.actors[0]];
  if (!w) return;
  // r19: a Cinemateca guarda só finais de quem é seu (ou cliente); as de NPC ficam na manchete
  if (mineAct19(s, w.id)) logShot18(s, { k: 'musicshow', act: w.id, text: f.text, fact: f.id, d: { envelope: 1, booed: f.tags.includes('booed') ? 1 : 0 } });
  tv18(s).tvFame[w.id] = { until: s.week + 52, hits: w.hits };
  headline19(s, f.text, f.tags.includes('booed') ? 3 : 2);
}, 'contests19:final');
// vencedor → pista no discover18; patrocinador/produtor (você) recebe o contrato pronto do formato
onFact('contest_winner', (s, f) => {
  const a = s.acts[f.actors[1] ?? ''];
  if (!a || a.owner) return;
  const r = rng(s);
  addLead18(s, r, a, 'tv', 3, 6, l('Venceu um concurso: voz testada ao vivo.', 'Won a contest: a voice tested live.'));
  if (Number(f.data?.sp ?? 0)) pushInbox18(s, 'ct19_sign', { from: a.name, subject: fmtL(l('Vencedor de concurso: contratar {a}?', 'Contest winner: sign {a}?'), { a: a.name }), tone: 'good', ref: { act: a.id },
    body: l('Como patrocinador, você tem o contrato pronto do formato: 3 anos, 12% de royalty, adiantamento menor. Fama alta agora; sem hit, esfria.', 'As sponsor, you hold the format\'s ready-made deal: 3 years, 12% royalty, a smaller advance. High fame now; without a hit, it cools.'),
    actions: [{ id: 'sign', label: l('Contratar', 'Sign') }, { id: 'pass', label: l('Deixar ir', 'Let go') }], weeks: 5 });
}, 'contests19:winner');
// rixa de jurado → feud18 + imprensa
onFact('judge_feud', (s, f) => {
  const [a, b] = f.actors;
  if (a && b) startFeud18(s, a, b, l('Humilhação na final do concurso', 'Humiliation at the contest final'), 15);
  headline19(s, f.text, 2);
}, 'contests19:feud');
// ponte: final de Idol/The Voice (tv18) também é final de concurso
onFact('award', (s, f) => {
  if (f.src !== 'tv18' || !f.tags.includes('talent_show')) return;
  const a = s.acts[f.actors[0] ?? ''];
  if (!a) return;
  emitFact(s, { kind: 'contest_final', actors: [a.id], severity: f.severity, visibility: 'public', tags: ['contests19', 'tv18'], text: f.text, src: 'contests19', data: { ct: 'tv18' } });
  emitFact(s, { kind: 'contest_winner', actors: [lead(s, a), a.id], severity: 30, visibility: 'public', tags: ['contests19', 'tv18'], text: f.text, src: 'contests19', data: { ct: 'tv18', sp: 0 } });
}, 'contests19:tv18');

export function signWinner19(s: GameState, actId: string): L {
  const a = s.acts[actId];
  if (!a || a.owner) return l('Já tem selo.', 'Already signed.');
  const o = { ...defaultOffer(s, a), royalty: 0.12, termMonths: 36, id: nextId(s, 'of'), week: s.week, status: 'pending' as const } as Offer;
  o.advance = Math.round(o.advance * 0.6);
  if (freeCash20(s) < o.advance) return l('Caixa livre insuficiente para o adiantamento (há caixa reservado ou faltando).', 'Not enough free cash for the advance (cash is reserved or short).'); // r20 (B4)
  acceptOffer(s, a, o);
  return fmtL(l('{a} assina com você.', '{a} signs with you.'), { a: a.name });
}
registerInboxKind('ct19_sign', { label: l('Concurso', 'Contest'), cat: 'deals', icon: 'star', prio: 2, goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : null),
  handle: (s, m, a) => (a === 'sign' ? signWinner19(s, String(m.ref?.act)) : l('Ficou para outro selo.', 'Left for another label.')) });

// ---------------------------------------------------------------- ecos, calendário, porquê
const T = (pt: string, en: string) => l(pt, en);
registerConseq18('ib:ct19_open:enter', { later: [{ in: [3, 8], p: 0.4, tone: 'mixed', hint: T('Concurso expõe — para o bem e para o mal.', 'Contests expose — for better or worse.'), fx: (f) => { f.fame(1).mood('stress', 2); return T('A apresentação na TV ainda rende convites (e críticas).', 'The TV performance still brings invitations (and criticism).'); } }] });
registerConseq18('ib:ct19_open:sponsor', { later: [{ in: [4, 10], p: 0.4, tone: 'good', hint: T('Patrocinador vira sinônimo de descoberta.', 'The sponsor becomes a byword for discovery.'), fx: (f) => { f.rep('artists', 1); return T('Novatos passam a mandar demos citando o seu concurso.', 'Newcomers start sending demos mentioning your contest.'); } }] });
registerConseq18('ib:ct19_open:judge', { later: [{ in: [2, 6], p: 0.45, tone: 'mixed', hint: T('Jurado afiado vira personagem.', 'A sharp judge becomes a character.'), fx: (f) => { f.fame(2).mood('stress', 3); return T('As frases do seu jurado viram bordão — e alguns fãs se ofendem.', 'Your judge\'s lines become catchphrases — and some fans take offence.'); } }] });
registerConseq18('ib:ct19_open:skip', { later: [{ in: [3, 9], p: 0.15, tone: 'bad', hint: T('O vencedor pode ir para um rival.', 'The winner may go to a rival.'), fx: (f) => { f.momentum(-1); return T('O vencedor do concurso estoura num selo rival.', 'The contest winner breaks out on a rival label.'); } }] });
registerConseq18('ib:ct19_sign:sign', { later: [{ in: [4, 12], p: 0.4, tone: 'mixed', hint: T('Fama de TV esfria sem hit.', 'TV fame cools without a hit.'), fx: (f) => { f.momentum(-3); return T('O vencedor do concurso some das manchetes: precisa de um hit logo.', 'The contest winner fades from headlines: needs a hit soon.'); } }] });
registerConseq18('ib:ct19_sign:pass', { later: [{ in: [4, 12], p: 0.25, tone: 'bad', hint: T('Às vezes o que passou volta maior.', 'Sometimes what you passed on comes back bigger.'), fx: (f) => { f.rep('commercial', -1); return T('O vencedor que você recusou entra no top 10 por outro selo.', 'The winner you passed on hits the top 10 for another label.'); } }] });
registerConseq18('ct19:produce', { later: [{ in: [6, 14], p: 0.4, tone: 'good', hint: T('Um formato próprio vira vitrine.', 'An own format becomes a showcase.'), fx: (f) => { f.rep('institutional', 2); return T('O seu concurso entra no calendário nacional da TV.', 'Your contest joins the national TV calendar.'); } }] });
registerDeadline('contests19', (s, from, to) => ctNow19(s).flatMap((c) => {
  const w = s.week + Math.round((c.m - s.month) * 4.35);
  return w >= from && w <= to && !edOf19(s, c.id).done ? [{ id: `contests19-${c.id}-${s.year}`, w, kind: 'award' as const, t: fmtL(l('Final: {f}', 'Final: {f}'), { f: ctName19(s, c) }), tone: 'info' as const, goto: { area: 'live19', tab: ['live19', 'contests'] as [string, string] } }] : [];
}));
registerExplain('ct19.odds', (s, c) => {
  const ct = CT19.find((x) => x.id === String(c.ct ?? '')), a = s.acts[String(c.act ?? '')];
  if (!ct || !a) return null;
  const o = entryOdds19(s, ct, a, !!c.judge);
  return { title: fmtL(l('Chance de {a} vencer', 'Odds of {a} winning'), { a: a.name }), value: o.p, fmt: 'pct', parts: o.why, note: l('Seis novatos de verdade disputam; o vencedor vira pista e pode virar ghostwriter de alguém.', 'Six real newcomers compete; the winner becomes a lead and may become someone\'s ghostwriter.') };
});
