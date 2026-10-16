// Rodada 19 (Frente 7, M4) — CULTURA DA EMPRESA (`culture19`). O dono escolhe o jeito da casa: ARTISTA PRIMEIRO,
// LUCRO PRIMEIRO, PRESTÍGIO ou CAOS CRIATIVO. A cultura puxa todo mês a lealdade da equipe (people/staff: abaixo de 25
// a pessoa sai — e rivais caçam quem está insatisfeito), a confiança e o humor do elenco, a aceitação das propostas a
// artistas (registerOfferMod), a reputação e o caixa (bônus cortados no lucro primeiro; mimos no artista primeiro;
// erros de metadados e vazamentos no caos). Trocar de cultura abala a equipe (`culture_shift`) e só pode a cada 12 meses.
// Treinamento pago (A&R, jurídico, metadados) sobe a habilidade e a lealdade da equipe e evita os erros do caos.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerConseq18 } from '../decide18';
import { schedule18 } from './decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { registerAdvisorTip } from '../inbox18';
import { rng19 } from '../rng19';
import { addStress } from '../stress17';
import type { GameState } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { headline19 } from './factlink19';
import { addHype } from './hype12';
import { cnt19, link19, log19, xs19, type Log19 , off19 } from './mkb19';
import { P } from './people/state';

export type Cul19 = 'artist' | 'profit' | 'prestige' | 'chaos';
export const CUL19: Record<Cul19, { name: L; desc: L; loy: number; trust: number; morale: number; offer: number; real: L }> = {
  artist: { name: l('Artista primeiro', 'Artist-first'), desc: l('Tempo de estúdio generoso, prestação de contas em dia, mimos (custo extra de 2% da folha). Elenco confia, equipe fica.', 'Generous studio time, timely statements, perks (extra 2% of payroll). The roster trusts you, staff stay.'), loy: 0.4, trust: 0.3, morale: 0.5, offer: 0.03, real: l('Como a Motown dos primeiros anos ou a Sub Pop: família, para o bem e para o mal.', 'Like early Motown or Sub Pop: family, for better and worse.') },
  profit: { name: l('Lucro primeiro', 'Profit-first'), desc: l('Metas trimestrais, bônus cortados (4% da folha volta ao caixa), horas longas. Equipe e elenco se cansam; propostas pesam menos.', 'Quarterly targets, bonuses cut (4% of payroll back to cash), long hours. Staff and roster wear out; offers carry less weight.'), loy: -0.8, trust: -0.3, morale: -0.4, offer: -0.02, real: l('O modelo dos conglomerados dos anos 1990–2000.', 'The conglomerate model of the 1990s–2000s.') },
  prestige: { name: l('Prestígio', 'Prestige'), desc: l('Só o que a crítica respeita: reputação artística sobe devagar, comercial cai; artistas autorais aceitam mais.', 'Only what critics respect: artistic reputation rises slowly, commercial falls; auteur artists accept more.'), loy: 0.2, trust: 0.1, morale: 0.2, offer: 0.03, real: l('ECM, Blue Note, 4AD: a capa e o som são a marca.', 'ECM, Blue Note, 4AD: the cover and the sound are the brand.') },
  chaos: { name: l('Caos criativo', 'Creative chaos'), desc: l('Portas abertas e festas: inspiração sobe, estresse também; erros de metadados e vazamentos acontecem.', 'Open doors and parties: inspiration rises, so does stress; metadata errors and leaks happen.'), loy: -0.2, trust: 0.1, morale: 0.3, offer: 0.01, real: l('Factory Records e Creation: discos lendários e contas no vermelho.', 'Factory Records and Creation: legendary records and red ink.') },
};
/** r27 AUD2: 12 meses (antes 6) — a cultura de fato nasce das decisões (sys/aud27/culture27); o menu declara e empurra devagar. */
export const CUL_CD19 = 52;
export interface Culture19 extends Log19 { c: Cul19 | null; since: number; prev: Cul19 | null; train: boolean; err: number; leaks: number; trainPaid: number }
declare module '../ext4' { interface Ext4 { culture19: Culture19 } }
const fresh = (): Culture19 => ({ c: null, since: -999, prev: null, train: false, err: 0, leaks: 0, trainPaid: 0, log: [], n: {} });
registerExt4('culture19', fresh);
export const cul19 = (s: GameState): Culture19 => xs19(s, 'culture19', fresh);
const rng = (s: GameState) => rng19(s, 'culture19');
const payroll = (s: GameState) => s.player.staff.reduce((t, m) => t + m.salary, 0);
export const trainCost19 = (s: GameState) => money(s, 150) * s.player.staff.length;
export const avgLoy19 = (s: GameState): number => { const xs = s.player.staff.map((m) => P(s).career[m.id]?.loyalty).filter((x): x is number => x !== undefined); return xs.length ? Math.round(xs.reduce((t, x) => t + x, 0) / xs.length) : 0; };

export function setCulture19(s: GameState, c: Cul19): L | null {
  const st = cul19(s);
  if (st.c === c) return l('Já é a cultura da casa.', 'That is already the house culture.');
  if (st.c && s.week - st.since < CUL_CD19) return fmtL(l('A equipe ainda está digerindo a última mudança ({w} semanas).', 'Staff are still digesting the last change ({w} weeks).'), { w: CUL_CD19 - (s.week - st.since) });
  st.prev = st.c; st.c = c; st.since = s.week;
  cnt19(st, c);
  const tx = fmtL(st.prev ? l('{c} troca a cultura da casa: de "{a}" para "{b}".', '{c} changes the house culture: from "{a}" to "{b}".') : l('{c} define a cultura da casa: "{b}".', '{c} sets the house culture: "{b}".'), { c: s.config.companyName, a: st.prev ? CUL19[st.prev].name : '', b: CUL19[c].name });
  log19(s, st, tx);
  schedule18(s, `cul19:${c}`, {}, l('Cultura da empresa', 'Company culture'), CUL19[c].name);
  emitFact(s, { kind: 'culture_shift', actors: ['player'], severity: st.prev ? 30 : 15, visibility: 'rumor', tags: ['culture19', c, ...(st.prev ? [`from:${st.prev}`] : [])], text: tx, src: 'culture19', data: { c, prev: st.prev ?? '' } });
  return null;
}
export const setTrain19 = (s: GameState, on: boolean): void => { cul19(s).train = on; cnt19(cul19(s), on ? 'train_on' : 'train_off'); };
registerOfferMod('culture19', (s, act) => {
  const c = cul19(s).c;
  if (!c || act.owner === 'player') return null;
  const d = c === 'prestige' && act.positioning >= 50 ? 0 : CUL19[c].offer;
  return d ? { delta: d, reason: fmtL(l('Cultura do selo: {c}.', 'Label culture: {c}.'), { c: CUL19[c].name }) } : null;
});

export function cultureMonth19(s: GameState): void {
  const st = cul19(s), c = st.c;
  if (st.train && s.player.staff.length) {
    const v = trainCost19(s);
    post(s, `cul19t:${s.year}-${s.month}`, -v, 'staff_training', 'Treinamento da equipe');
    st.trainPaid += v;
    for (const m of s.player.staff) { m.skill = clamp(m.skill + 0.15, 0, 100); const cr = P(s).career[m.id]; if (cr) cr.loyalty = clamp(cr.loyalty + 0.4, 0, 100); }
  }
  if (!c) return;
  const C = CUL19[c];
  for (const m of s.player.staff) { const cr = P(s).career[m.id]; if (cr) cr.loyalty = clamp(cr.loyalty + C.loy, 0, 100); }
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.playerBand) continue;
    a.trust = clamp(a.trust + C.trust, 0, 100);
    for (const pid of a.members) {
      const p = s.persons[pid];
      if (!p?.alive) continue;
      p.morale = clamp(p.morale + C.morale, 0, 100);
      if (c === 'chaos') { p.inspiration = clamp(p.inspiration + 2, 0, 100); addStress(s, pid, 1); }
      if (c === 'profit') addStress(s, pid, 0.5);
    }
  }
  const pay = payroll(s), R = s.player.reputation;
  if (c === 'profit' && pay) post(s, `cul19p:${s.year}-${s.month}`, Math.round(pay * 0.04), 'other_income', 'Lucro primeiro: bônus cortados');
  if (c === 'artist' && pay) post(s, `cul19a:${s.year}-${s.month}`, -Math.round(pay * 0.02), 'artist_dev', 'Artista primeiro: mimos e tempo de estúdio');
  if (c === 'prestige') { R.artistic = clamp(R.artistic + 0.1, 0, 100); R.commercial = clamp(R.commercial - 0.05, 0, 100); }
  if (c === 'chaos' && !st.train) {
    const r = rng(s);
    if (r.chance(0.04)) {
      const v = money(s, 800); st.err++;
      post(s, `cul19e:${s.week}`, -v, 'misc', 'Caos: erro de metadados (royalties perdidos)');
      log19(s, st, fmtL(l('Erro de metadados: créditos trocados, {v} em royalties perdidos.', 'Metadata error: swapped credits, {v} in royalties lost.'), { v: `$${Math.round(v / 100)}` }));
    } else if (r.chance(0.03)) {
      const rel = playerActs(s).flatMap((id) => s.acts[id]?.releases ?? []).map((id) => s.releases[id]).filter((x) => x && s.week - x.week < 12).pop();
      if (rel) { st.leaks++; addHype(s, `r:${rel.id}`, 'cul19leak', l('Vazou antes da hora', 'Leaked early'), 6); rel.appeal *= 0.97; log19(s, st, fmtL(l('Alguém do escritório vazou "{t}": burburinho e vendas perdidas.', 'Someone at the office leaked "{t}": buzz and lost sales.'), { t: rel.title })); }
    }
  }
}
registerSimHook('month', 'culture19', (s) => off19('culture19') || cultureMonth19(s));

// mudança de cultura: equipe abalada (lealdade −6), elenco reage; manchete pequena
onFact('culture_shift', (s, f) => {
  if (!f.data?.prev) return;
  for (const m of s.player.staff) { const cr = P(s).career[m.id]; if (cr) cr.loyalty = clamp(cr.loyalty - 6, 0, 100); }
  const c = String(f.data.c) as Cul19, d = c === 'artist' ? 4 : c === 'profit' ? -5 : 0;
  if (d) for (const id of playerActs(s)) { const a = s.acts[id]; if (a && !a.playerBand) a.trust = clamp(a.trust + d, 0, 100); }
  headline19(s, f.text, 1);
  link19(s, 'culture', fmtL(l('Cultura nova ({c}): equipe −6 de lealdade; elenco {d}.', 'New culture ({c}): staff loyalty −6; roster {d}.'), { c: CUL19[c].name, d: d > 0 ? `+${d}` : d < 0 ? `${d}` : '±0' }));
}, 'culture19:staff');

registerConseq18('cul19:artist', { now: CUL19.artist.desc, later: [{ in: [4, 10], p: 0.35, tone: 'mixed', hint: l('Família também briga por dinheiro.', 'Families fight over money too.'),
  fx: (f) => (f.r.chance(0.6) ? (f.rep('artists', 2), l('Artistas falam bem do selo em entrevistas: "aqui somos ouvidos".', 'Artists praise the label in interviews: "here we are heard".')) : (f.cash(-1500, 'Artista primeiro: estouro de orçamento de estúdio', 'recording'), l('O tempo de estúdio generoso estourou o orçamento de um disco.', 'Generous studio time blew one record\'s budget.'))) }] });
registerConseq18('cul19:profit', { now: CUL19.profit.desc, later: [{ in: [3, 9], p: 0.4, tone: 'bad', hint: l('Metas apertadas cansam gente boa.', 'Tight targets wear good people out.'),
  fx: (f) => (f.rep('artists', -1), l('Um executivo esgotado sai falando mal das metas trimestrais do selo.', 'A burnt-out executive leaves, badmouthing the label\'s quarterly targets.')) }] });
registerConseq18('cul19:prestige', { now: CUL19.prestige.desc, later: [{ in: [4, 12], p: 0.3, tone: 'good', hint: l('A crítica repara em quem é coerente.', 'Critics notice consistency.'),
  fx: (f) => (f.rep('artistic', 2), l('Uma revista de prestígio dedica um perfil inteiro à estética do selo.', 'A prestige magazine runs a full profile on the label\'s aesthetic.')) }] });
registerConseq18('cul19:chaos', { now: CUL19.chaos.desc, later: [{ in: [2, 8], p: 0.45, tone: 'mixed', hint: l('Do caos sai um clássico — ou um processo.', 'Chaos births a classic — or a lawsuit.'),
  fx: (f) => (f.r.chance(0.5) ? (f.fame(2), l('Uma jam de madrugada no escritório vira o single do ano.', 'A late-night office jam becomes the single of the year.')) : (f.cash(-2500, 'Caos: festa que acabou em processo', 'legal'), l('A festa no escritório acabou com a polícia e um processo do vizinho.', 'The office party ended with the police and a lawsuit from the neighbour.'))) }] });
registerAdvisorTip('culture19', (s) => {
  if (!s.player.staff.length) return [];
  const v = avgLoy19(s), c = cul19(s).c;
  if (v >= 40 || c === 'artist') return [];
  return [{ id: 'cul19-loy', level: 'warn', cat: 'people', score: 45, text: fmtL(l('Lealdade média da equipe em {v}: abaixo de 25 as pessoas saem.', 'Average staff loyalty at {v}: below 25 people quit.'), { v }),
    why: [c ? fmtL(l('Cultura atual: {c}.', 'Current culture: {c}.'), { c: CUL19[c].name }) : l('Sem cultura definida.', 'No culture set.')], effect: l('"Artista primeiro" sobe a lealdade (+0,4/mês); treinamento também (+0,4/mês).', '"Artist-first" raises loyalty (+0.4/month); so does training (+0.4/month).'),
    run: { label: l('Ligar treinamento', 'Turn on training'), fn: (s2) => (setTrain19(s2, true), l('Treinamento ligado.', 'Training on.')) } }];
});
registerExplain('cul19', (s) => {
  const st = cul19(s), c = st.c;
  const parts: WhyPart[] = c ? [
    { label: l('Lealdade da equipe por mês', 'Staff loyalty per month'), value: CUL19[c].loy, fmt: 'signed' },
    { label: l('Confiança do elenco por mês', 'Roster trust per month'), value: CUL19[c].trust, fmt: 'signed' },
    { label: l('Humor do elenco por mês', 'Roster morale per month'), value: CUL19[c].morale, fmt: 'signed' },
    { label: l('Aceitação das propostas', 'Offer acceptance'), value: CUL19[c].offer, fmt: 'pct' },
  ] : [];
  if (st.train) parts.push({ label: l('Treinamento: lealdade +0,4/mês, habilidade +0,15/mês', 'Training: loyalty +0.4/month, skill +0.15/month'), value: trainCost19(s), fmt: 'money', tone: 'good' });
  parts.push({ label: l('Lealdade média da equipe hoje', 'Average staff loyalty today'), value: avgLoy19(s), fmt: 'num' });
  return { title: l('Cultura da empresa', 'Company culture'), value: c ? CUL19[c].name.pt : '—', fmt: 'text', parts, note: l('Lealdade abaixo de 25 → a pessoa pede demissão (rivais caçam). Trocar de cultura: −6 de lealdade na hora, no máximo a cada 12 meses.', 'Loyalty below 25 → the person quits (rivals poach). Changing culture: −6 loyalty at once, at most every 12 months.') };
});
